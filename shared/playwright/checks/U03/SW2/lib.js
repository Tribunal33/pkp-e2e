// Helpers of sw2.js (U03 drift sweep SW2: Roles tab, Public tab, a role not yet started, the
// privacy link, the settings that change them). Requiring this file runs nothing. Page objects are
// required inside each function, after forEachApp has set the app's environment (patterns.md
// "Probe kit").
const fs = require('fs');
const path = require('path');
const {idle, screen, shot, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const pages = (f) => require(path.join(__dirname, '../../../pages', f));
const REPO = path.resolve(__dirname, '../../../../..');

/** Per-app screen words. */
const WORDS = {
    ojs: {
        noun: 'journal', fold: 'Register with other journals', hide: 'Hide other journals',
        boxes: ['Reader', 'Author', 'Reviewer'], reviewer: 'Reviewer', manager: 'Journal manager',
        open: 'Visitors can register a user account with the journal.',
        closed: 'The Journal Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.',
        notAccepting: 'This journal is currently not accepting user registrations.',
        sectionEditor: 'Section editor',
    },
    omp: {
        noun: 'press', fold: 'Register with other presses', hide: 'Hide other presses',
        boxes: ['Reader', 'Author', 'Chapter Author', 'External Reviewer'], reviewer: 'External Reviewer', manager: 'Press manager',
        open: 'Visitors can register a user account with the press.',
        closed: 'The Press Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.',
        notAccepting: null,
        sectionEditor: 'Series editor',
    },
    ops: {
        noun: 'server', fold: 'Register with other servers', hide: 'Hide other servers',
        boxes: ['Reader', 'Author'], reviewer: null, manager: 'Preprint Server manager',
        open: 'Visitors can register a user account with the server.',
        closed: 'The Server Manager will register all user accounts.',
        notAccepting: null,
        sectionEditor: 'Moderator',
    },
};

/**
 * Record every browser dialog and answer it as `state.answer` says ('dismiss' = Cancel,
 * 'accept' = OK); a page-leave question is accepted. While this listener is on the page the kit
 * leaves the answer to it.
 */
function dialogRecorder(page) {
    const state = {answer: 'dismiss', seen: []};
    page.on('dialog', async (d) => {
        const entry = {type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : state.answer, at: Date.now()};
        state.seen.push(entry);
        if (entry.answered === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/** Every request the page sends while `fn` runs (legacy calls, API, profile, login), with statuses. */
async function traffic(page, fn, {filter = /\$\$\$call\$\$\$|\/api\/v1\/|profile|login|upload|privacy/} = {}) {
    const seen = [];
    const onReq = (r) => {
        if (filter.test(r.url()) && !/\.(js|css|svg|woff2?)(\?|$)/.test(r.url())) seen.push(r);
    };
    page.on('request', onReq);
    let value;
    try {
        value = await fn();
    } finally {
        page.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        out.push({method: r.method(), url: rel(r.url()).slice(0, 200), status: res ? res.status() : null,
            body: r.method() === 'POST' ? flat((r.postData() || '').replace(/csrfToken=[^&]+/, 'csrfToken=…'), 400) : undefined});
    }
    return {value, requests: out};
}

/** The top-right page notices' text right now. */
async function toastNow(page) {
    return flat(await page.locator('.app__notifications').first().innerText().catch(() => ''), 400) || '';
}

/** Poll the top-right notices for `ms`, collecting each distinct text seen. */
async function watchToasts(page, ms = 3000) {
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        const t = await toastNow(page);
        if (t) seen.add(t);
        await sleep(200);
    }
    return [...seen];
}

/** Snapshot: the kit's screen() into `<name>`, plus a PNG. */
async function snap(page, name, {png = true} = {}) {
    const s = await screen(page);
    record(name, s);
    if (png) await shot(page, name).catch(() => {});
    return {file: name, notices: s.notices, url: rel(s.url)};
}

/** The Profile page by its address, on the named tab (null contextPath = site level). */
async function openProfile(page, contextPath, tab = 'identity') {
    const {ProfilePage} = pages('ProfilePage.js');
    const profile = new ProfilePage(page, contextPath);
    await profile.goto(tab);
    await idle(page).catch(() => {});
    return profile;
}

/** Press a tab in the tab bar, answering any question as `answer` says; the dialogs it raised. */
async function pressTab(page, profile, dialogs, tab, {answer = 'dismiss', wait = true} = {}) {
    const before = dialogs.seen.length;
    dialogs.answer = answer;
    await profile.tabLink(tab).click();
    await sleep(1200);
    if (wait) {
        await idle(page).catch(() => {});
        await profile.form(tab).waitFor({state: 'visible', timeout: 8000}).catch(() => {});
    }
    dialogs.answer = 'dismiss';
    return {pressed: tab, dialogs: dialogs.seen.slice(before).map((d) => ({type: d.type, message: d.message, answered: d.answered})),
        selected: await profile.tabEntry(tab).getAttribute('aria-selected').catch(() => null)};
}

/**
 * What the Roles tab shows: the area's legend and text, every section (label, boxes with their
 * ticks, size, whether inside the fold), the fold link's visible text, and the interests box.
 */
async function readRoles(page) {
    return page.evaluate(() => {
        const area = document.querySelector('#userGroups');
        if (!area) return {area: null};
        const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
        const sections = [...area.querySelectorAll('.section')].map((s) => {
            const ul = s.querySelector(':scope > ul');
            const ulLabel = ul ? [...ul.children].find((c) => c.matches('label, span.label')) : null;
            const ownLabel = [...s.children].find((c) => c.matches('label, legend, span.label'));
            const boxes = [...s.querySelectorAll(':scope > ul > li input[type=checkbox]')].map((i) => ({
                label: ((i.closest('li') || i.parentElement).innerText || '').trim(),
                checked: i.checked,
                name: i.name,
            }));
            const r = s.getBoundingClientRect();
            return {
                inFold: !!s.closest('#userGroupExtraFormFields'),
                label: ownLabel ? ownLabel.innerText.trim() : null,
                ulLabel: ulLabel ? ulLabel.innerText.trim() : null,
                boxes,
                height: Math.round(r.height),
                visible: visible(s),
                text: (s.innerText || '').trim().slice(0, 300),
            };
        });
        const link = area.querySelector('#userGroupExtras a.toggleExtras');
        const linkText = link ? [...link.querySelectorAll('span')].filter(visible).map((x) => x.innerText.trim()).filter(Boolean).join(' / ') : null;
        const extras = area.querySelector('#userGroupExtras .extrasContainer');
        const interests = area.querySelector('#interests');
        const chips = [...area.querySelectorAll('#interests .tagit-label')].map((c) => c.innerText.trim());
        const legend = area.querySelector('legend');
        const form = area.closest('form');
        return {
            legend: legend ? legend.innerText.trim() : null,
            text: (area.innerText || '').trim().slice(0, 4000),
            sections,
            foldLink: linkText,
            foldOpen: link ? visible(link.querySelector('.toggleExtras-active')) : null,
            foldContainerHeight: extras ? Math.round(extras.getBoundingClientRect().height) : null,
            interests: interests ? {present: true, visible: visible(interests), chips, label: flat((interests.closest('.section') || interests).innerText, 200)} : {present: false},
            formTail: form ? (form.innerText || '').trim().split('\n').slice(-6).join(' | ') : null,
            registerIn: /Register in/.test(area.innerText || '') || /Register in/.test(area.outerHTML),
        };
        function flat(s, n) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n); }
    });
}

/** The controls a form offers (visible inputs, buttons, links), as a person reads them. */
async function controls(page, formSel) {
    return page.locator(formSel).first().evaluate((f) => {
        const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        return [...f.querySelectorAll('input, button, a, select, textarea, iframe')].filter(vis).map((el) => ({
            tag: el.tagName.toLowerCase(), type: el.type || null, name: el.name || el.id || null,
            text: t(el.innerText || el.value || el.getAttribute('aria-label') || el.title),
            href: el.tagName === 'A' ? el.getAttribute('href') : undefined,
            target: el.tagName === 'A' ? el.getAttribute('target') : undefined,
            checked: el.type === 'checkbox' ? el.checked : undefined,
        }));
    }).catch((e) => ({error: flat(e.message, 200)}));
}

/** Press the visible tab's "Save"; the requests, the notices seen for 3 s, the dialogs raised. */
async function pressSave(page, profile, dialogs) {
    const before = dialogs.seen.length;
    const t = await traffic(page, async () => {
        await profile.saveButton().click();
        const seen = await watchToasts(page, 3000);
        await idle(page).catch(() => {});
        return seen;
    }, {filter: /profile-tab\/save-/});
    return {requests: t.requests, toasts: t.value, dialogs: dialogs.seen.slice(before).map((d) => ({type: d.type, message: d.message}))};
}

/** Press the privacy link on the visible tab; the new page's address, title and heading. */
async function pressPrivacy(page, profile) {
    const link = profile.privacyLink();
    const href = await link.getAttribute('href').catch(() => null);
    const target = await link.getAttribute('target').catch(() => null);
    const popupP = page.waitForEvent('popup', {timeout: 15000}).catch(() => null);
    await link.click();
    const pop = await popupP;
    const r = {href: href && href.trim(), target, popup: !!pop, opener: rel(page.url())};
    if (pop) {
        await pop.waitForLoadState('domcontentloaded').catch(() => {});
        await idle(pop).catch(() => {});
        r.url = rel(pop.url());
        r.title = await pop.title().catch(() => null);
        r.h1 = flat(await pop.locator('h1').first().innerText().catch(() => null), 120);
        await pop.close().catch(() => {});
    }
    return r;
}

/**
 * Settings › Users & Roles › Users of a context, read by a manager: search the username and read
 * its row. Empty `rows` means the account is not listed.
 */
async function usersRow(page, contextPath, username) {
    await page.goto(`/index.php/${contextPath}/en/management/settings/access`);
    await idle(page).catch(() => {});
    const box = page.getByRole('searchbox').first();
    await box.waitFor({state: 'visible', timeout: 30_000});
    await box.fill(username);
    const answer = page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()) && r.url().includes('searchPhrase='), {timeout: 30_000}).catch(() => null);
    await box.press('Enter');
    await answer;
    await idle(page).catch(() => {});
    await sleep(600);
    const rows = await page.getByRole('row').filter({hasText: username}).allInnerTexts().catch(() => []);
    return {rows: rows.map((r) => flat(r, 400))};
}

/** The public "Editorial Masthead" page, signed out or not: status, text, every picture's address. */
async function masthead(page, contextPath) {
    const res = await page.goto(`/index.php/${contextPath}/en/about/editorialMasthead`);
    await idle(page).catch(() => {});
    const imgs = await page.locator('main img, .pkp_structure_main img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    const links = await page.locator('.pkp_structure_main a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    return {status: res ? res.status() : null, text: flat(await page.locator('.pkp_structure_main, main, body').first().innerText().catch(() => null), 3000), imgs, links};
}

/** Width and height of a PNG, JPEG or GIF file on disk (header read). */
function imageSize(file) {
    const b = fs.readFileSync(file);
    if (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return {type: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
    if (b.slice(0, 3).toString('ascii') === 'GIF') return {type: 'gif', w: b.readUInt16LE(6), h: b.readUInt16LE(8)};
    if (b[0] === 0xff && b[1] === 0xd8) {
        let i = 2;
        while (i < b.length) {
            if (b[i] !== 0xff) { i++; continue; }
            const m = b[i + 1];
            const len = b.readUInt16BE(i + 2);
            if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return {type: 'jpeg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7)};
            i += 2 + len;
        }
        return {type: 'jpeg'};
    }
    return {type: 'unknown', bytes: b.length};
}

/** The profile image files the fleet keeps for a user, with their sizes (read on disk, for Evidence). */
function profileFiles(app, userId) {
    const dir = path.resolve(REPO, app.root, 'public', 'site');
    if (!fs.existsSync(dir)) return {dir, missing: true};
    return fs.readdirSync(dir).filter((f) => f.startsWith(`profileImage-${userId}.`))
        .map((f) => ({file: f, bytes: fs.statSync(path.join(dir, f)).size, ...imageSize(path.join(dir, f))}));
}

/** What "Profile Image" shows: the picture (address, rendered size) and "Delete". */
async function readImage(page) {
    const img = page.locator('form#publicProfileForm img');
    const n = await img.count();
    const src = n ? await img.first().getAttribute('src') : null;
    const rendered = n ? await img.first().evaluate((el) => ({w: el.naturalWidth, h: el.naturalHeight, complete: el.complete})).catch(() => null) : null;
    const del = await page.locator('form#publicProfileForm').getByRole('button', {name: 'Delete', exact: true}).count();
    const area = flat(await page.locator('#plupload .pkpUploaderError').innerText().catch(() => ''), 200);
    return {picture: n > 0, src: rel(src), rendered, deleteButton: del > 0, uploadAreaError: area};
}

/**
 * Choose a file in "Profile Image": wait for the page's reload (accepted) or a sentence in the
 * upload area (refused); every upload request and the alerts are returned.
 */
async function upload(page, file, dialogs) {
    const start = dialogs.seen.length;
    const before = page.url();
    const reqs = [];
    const onReq = (r) => { if (/upload-profile-image/.test(r.url())) reqs.push(r); };
    page.on('request', onReq);
    let loaded = false;
    const onLoad = () => { loaded = true; };
    page.on('load', onLoad);
    await page.locator('#plupload input[type=file]').setInputFiles(file);
    const deadline = Date.now() + 30000;
    let outcome = 'timeout', error = '';
    try {
        while (Date.now() < deadline) {
            await sleep(250);
            if (loaded || (page.url() !== before && /uniq=/.test(page.url()))) { outcome = 'reloaded'; break; }
            error = (await page.locator('#plupload .pkpUploaderError').innerText().catch(() => '')).trim();
            if (error) { outcome = 'refused'; break; }
        }
        if (outcome === 'reloaded') {
            await page.waitForLoadState('load').catch(() => {});
            await page.locator('form#publicProfileForm').waitFor({timeout: 20000}).catch(() => {});
            await idle(page).catch(() => {});
        } else {
            await sleep(1500);
            loaded = loaded || false;
        }
    } finally {
        page.off('request', onReq);
        page.off('load', onLoad);
    }
    const sent = [];
    for (const r of reqs) { const res = await r.response().catch(() => null); sent.push({url: rel(r.url()).slice(0, 160), status: res ? res.status() : null}); }
    return {file: path.basename(file), outcome, uploadArea: error, url: rel(page.url()), pageLoaded: loaded, sent,
        alerts: dialogs.seen.slice(start).map((d) => ({type: d.type, message: d.message}))};
}

/** The Public tab's homepage box and its refusal sentence. */
async function homepageState(page) {
    const box = page.locator('form#publicProfileForm input[name="userUrl"]');
    const labels = await page.locator('form#publicProfileForm label.error').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), visible: e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'})));
    return {value: await box.inputValue().catch(() => null), maxlength: await box.getAttribute('maxlength').catch(() => null), errors: labels.filter((l) => l.text)};
}

/** The bio statement's saved text in the editor. */
async function bioText(page) {
    // The editor bound to the textarea of the form on the page now: a tab pressed again builds a new
    // editor, and the earlier one can stay registered with the text it held.
    return page.evaluate(() => {
        const ta = document.querySelector('form#publicProfileForm textarea[name^="biography"]');
        const e = ta && window.tinymce ? window.tinymce.get(ta.id) : null;
        return e ? e.getContent({format: 'text'}).trim() : null;
    }).catch(() => null);
}

/** Type into the bio editor once it is initialized (all text replaced). */
async function typeBio(page, profile, text) {
    await profile.expectBioEditorReady();
    const body = profile.bioEditorBody();
    await body.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(text);
}

/** Retype a plain box as a person does (select all, type). */
async function retype(locator, text) {
    await locator.click();
    await locator.press('ControlOrMeta+a');
    await locator.pressSequentially(text, {delay: 5});
}

/** A picture drawn by the browser's own encoder ('image/jpeg' or 'image/png'). */
async function canvasImage(page, type, w, h) {
    const b64 = await page.evaluate(({type, w, h}) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#1e6292'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f0c040'; g.fillRect(w / 4, h / 4, w / 2, h / 2);
        return c.toDataURL(type, 0.9).split(',')[1];
    }, {type, w, h});
    return Buffer.from(b64, 'base64');
}

/** The image fixtures under `dir`. */
async function makeFiles(page, dir) {
    const {gif} = require('../../issues/refused-gif-wipes-profile-image/lib.js');
    fs.mkdirSync(dir, {recursive: true});
    const w = (name, buf) => { const f = path.join(dir, name); fs.writeFileSync(f, buf); return f; };
    return {
        bigPng: w('u03sw2-big.png', await canvasImage(page, 'image/png', 400, 400)),
        wideJpg: w('u03sw2-wide.jpg', await canvasImage(page, 'image/jpeg', 300, 200)),
        smallJpg: w('u03sw2-small.jpg', await canvasImage(page, 'image/jpeg', 100, 100)),
        smallJpeg: w('u03sw2-small.jpeg', await canvasImage(page, 'image/jpeg', 120, 120)),
        smallGif: w('u03sw2-small.gif', gif(100, 100, [0x20, 0x90, 0x40])),
        exactGif: w('u03sw2-exact.gif', gif(150, 150, [0x20, 0x40, 0x90])),
        bigGif: w('u03sw2-big.gif', gif(300, 300)),
        txt: w('u03sw2-notes.txt', Buffer.from('u03sw2 notes: a plain text file\n')),
        txtPng: w('u03sw2-notes.png', Buffer.from('u03sw2 notes: a plain text file\n')),
        upperPng: w('u03sw2-upper.PNG', await canvasImage(page, 'image/png', 200, 200)),
    };
}

module.exports = {
    sleep, flat, rel, pages, WORDS, dialogRecorder, traffic, toastNow, watchToasts, snap, openProfile, pressTab,
    readRoles, controls, pressSave, pressPrivacy, usersRow, masthead, imageSize, profileFiles, readImage, upload,
    homepageState, bioText, typeBio, retype, makeFiles, REPO,
};
