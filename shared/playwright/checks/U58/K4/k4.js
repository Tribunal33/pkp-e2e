// U58 claim check, chunk K4: About › "Submissions" page (the notice line, the
// parts, the "Edit" links, ways in, a closed journal, the privacy statement),
// the archiving pages' copyright row {OJS}, and the Canonical-scenarios
// recipe. Spec: docs/specs/U58-submission-intake-configuration.md — Fields
// 142–154, Rules 22–27 (314–363), Settings 3–5 and 7 (395–413),
// Cross-feature 439–440 and 451–453, Canonical scenarios preamble 456–459,
// register A5, A6, OMP2; footnotes j, k, s, td9, td10, f-a5, f-a6, f-omp2.
//
// Scratch contexts per app (tag prefix u58k4):
//   D  default: every level (manager, (OJS/OMP) Editor, Section editor,
//      assistant, (OJS/OMP) Reviewer, Author, Reader, (OJS/OMP) Author+Reviewer);
//      a section policy on the first section {OJS OPS}; (OJS/OMP) the
//      "Make a Submission" block in the sidebar. Later phase "texts" edits its
//      Author Guidance and Privacy Statement on screen.
//   C  "Copyright Notice" seeded (context key copyrightNotice); (OJS/OMP) an
//      Editor with "Permit changes to Settings" off; Section editor, Author.
//   X  "Disable Submissions" ticked and unticked again on screen.
//   N  {OJS OPS} the only section made editor-only on screen; {OMP} a series
//      made editor-only on screen (control).
//   R  "Users must be registered and log in to view the … site." ticked.
//   L  {OJS} LOCKSS/CLOCKSS enabled on screen, then License Terms and the
//      Copyright Notice set on screen.
// `publicknowledge` and the roster are only read. On OPS, "Make a new
// submission" is pressed on publicknowledge only by author.alex and
// manager.maya (the start page enrols other roles as Author: screen-notes).
//
// Phases (PHASES=a,b; default all; later phases reuse k4-state-<app>.json):
//   seed pk out ways make edit texts disable sections restrict lockss recipe recipe2
//
//   PROBE_FEATURE=U58 PROBE_AGENT=ccK4 node bin/probe.js <app|all> shared/playwright/checks/U58/K4/k4.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL_PHASES = ['seed', 'pk', 'out', 'ways', 'make', 'edit', 'texts', 'disable', 'sections', 'restrict', 'lockss', 'recipe', 'recipe2'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k4]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const DENIED_ROLE = /does not have access to this operation/i;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// ---------------------------------------------------------------------------
// Reading helpers

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), title: await page.title().catch(() => null), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

async function go(page, app, p) {
    const resp = await page.goto(app.url(p)).catch((e) => ({err: e.message}));
    await idle(page);
    return resp && resp.status ? resp.status() : (resp && resp.err) || null;
}

async function dismissErrorDialog(page) {
    const dlg = page.getByRole('dialog', {name: 'Error'});
    if (!(await dlg.count().catch(() => 0))) return null;
    const text = (await dlg.innerText().catch(() => '')).replace(/\n+/g, ' | ');
    await dlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
    return text;
}

async function topTabs(page) {
    return page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
}

async function sideTabs(page) {
    return page.locator('[role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected'),
    }))).catch(() => []);
}

/** Where a press landed: address, heading, refusal, and (a settings page) the selected tabs. */
async function classify(page) {
    const text = (await page.locator('body').innerText().catch(() => '')) || '';
    const sel = (tabs) => tabs.filter((t) => t.selected === 'true').map((t) => t.text);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title().catch(() => null),
        h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
        loginForm: (await page.locator('input[name="username"], #username').count()) > 0,
        deniedRole: DENIED_ROLE.test(text),
        topSelected: sel(await topTabs(page)),
        sideSelected: sel(await sideTabs(page)),
        begin: await page.getByRole('button', {name: /Begin Submission/}).count().catch(() => 0),
        notAccepting: /not accepting submissions/i.test(text),
        checkedRadios: await page.locator('input[type=radio]:checked').evaluateAll((els) => els.map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText.trim() : e.value))).catch(() => []),
        snippet: flat((text.match(/[^\n]*(access|denied|not found|not accepting|error|Assigned to me|Action Required|Active submissions|My Submissions)[^\n]*/gi) || []).slice(0, 5).join(' | '), 400),
    };
}

/** The "Submissions" page as data. */
async function subPage(page, app, ctx, name, extra = {}) {
    const status = await go(page, app, `/index.php/${ctx}/about/submissions`);
    const info = await page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const main = document.querySelector('.page_submissions');
        if (!main) return {noPage: true, h1: [...document.querySelectorAll('h1')].map((h) => t(h.innerText))};
        const note = main.querySelector('.cmp_notification');
        const crumbs = document.querySelector('.cmp_breadcrumbs');
        return {
            h1: [...main.querySelectorAll('h1')].map((h) => t(h.innerText)),
            breadcrumbs: crumbs ? {text: t(crumbs.innerText), links: [...crumbs.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href')}))} : null,
            notice: note ? t(note.innerText) : null,
            noticeLinks: note ? [...note.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href')})) : [],
            parts: [...main.querySelectorAll(':scope > div')].filter((d) => d !== note && !d.classList.contains('cmp_breadcrumbs')).map((d) => {
                const h2 = d.querySelector('h2');
                const sr = h2 ? [...h2.querySelectorAll('.pkp_screen_reader, .sr-only')].map((x) => t(x.innerText)) : [];
                const edit = h2 ? [...h2.querySelectorAll('a')].map((a) => ({text: t(a.innerText), aria: a.getAttribute('aria-label'), href: a.getAttribute('href'), cls: a.className})) : [];
                const heading = h2 ? t([...h2.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')) : null;
                const body = t(d.innerText.replace(h2 ? h2.innerText : '', ''));
                return {cls: d.className, heading, sr, edit, body: body.slice(0, 300), bodyLength: body.length,
                    links: [...d.querySelectorAll('a')].filter((a) => !h2 || !h2.contains(a)).map((a) => ({text: t(a.innerText), href: a.getAttribute('href')}))};
            }),
            allLinks: [...main.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href')})),
            sidebar: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((b) => ({cls: b.className, text: t(b.innerText).slice(0, 80)})),
        };
    }).catch((e) => ({error: e.message}));
    const out = {status, url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...info, ...extra};
    await snap(page, name, {facts: out});
    return out;
}

/** Press a link and read where it lands. */
async function pressAndRead(page, locator, name) {
    const out = {present: await locator.count().catch(() => 0)};
    if (!out.present) { record(name, out); return out; }
    out.href = await locator.first().getAttribute('href').catch(() => null);
    out.text = flat(await locator.first().innerText().catch(() => ''), 80);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), locator.first().click().catch((e) => { out.clickError = e.message.slice(0, 100); })]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    await sleep(1200);
    out.errorDialog = await dismissErrorDialog(page);
    Object.assign(out, await classify(page));
    await snap(page, name, {press: out});
    return out;
}

async function openWorkflow(page, app, ctx, sideId) {
    const status = await go(page, app, `/index.php/${ctx}/management/settings/workflow`);
    await page.locator('[id="submission-button"]').first().click().catch(() => {});
    await idle(page);
    await sleep(600);
    if (sideId) {
        await page.locator(`[id="${sideId}-button"]`).first().click().catch(() => {});
        await idle(page);
        await sleep(1500);
    }
    return status;
}

async function openPrivacy(page, app, ctx) {
    await go(page, app, `/index.php/${ctx}/management/settings/website`);
    await page.locator('#setup-button').first().click().catch(() => {});
    await idle(page); await sleep(500);
    await page.getByRole('tab', {name: 'Privacy Statement', exact: true}).filter({visible: true}).first().click().catch(() => {});
    await idle(page); await sleep(1200);
}

async function tinyIds(page) {
    return page.evaluate(() => (window.tinymce ? window.tinymce.get().map((e) => e.id) : [])).catch(() => []);
}
async function tinyGet(page, id) {
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
}
async function mceSet(page, id, text) {
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
    const body = page.frameLocator(`[id="${id}_ifr"]`).locator('body');
    await body.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text);
    await sleep(300);
    // blur the editor so the form notices the change
    await page.locator('h1').first().click().catch(() => {});
    await sleep(300);
    return tinyGet(page, id);
}

/** Press "Save" in the form holding `field`; statuses, notices and the request. */
async function saveForm(page, field, name) {
    const form = page.locator('form').filter({has: field}).first();
    const save = form.getByRole('button', {name: 'Save', exact: true});
    const out = {statuses: []};
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    out.saveEnabled = await save.isEnabled({timeout: 10_000}).catch(() => 'err');
    await save.click({timeout: 10_000}).catch((e) => { out.clickError = e.message.slice(0, 120); });
    const start = Date.now();
    while (Date.now() - start < 7_000) {
        for (const t of (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)) if (!out.statuses.includes(t)) out.statuses.push(t);
        if (out.statuses.includes('Saved')) break;
        await sleep(150);
    }
    const r = await w;
    out.responseStatus = r ? r.status() : null;
    out.notices = await page.locator('[role="alert"], .pkpNotification').allInnerTexts().catch(() => []);
    out.fieldErrors = await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
    await snap(page, name, {save: out});
    return out;
}

function dialogWatch(page) {
    const seen = [];
    page.on('dialog', (d) => {
        seen.push({type: d.type(), message: d.message().slice(0, 200), at: Date.now()});
        (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
    });
    return (t0) => seen.filter((d) => d.at >= t0);
}

async function lockssRead(page, app, ctx, name, which = 'lockss') {
    const status = await go(page, app, `/index.php/${ctx}/gateway/${which}`);
    const rows = await page.locator('tr').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
    const out = {status, url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: await page.locator('h1, h2').first().innerText().catch(() => null), rows: rows.filter((r) => r.length), copyrightRow: rows.find((r) => r[0] === 'Copyright') || null};
    await snap(page, name, {facts: out});
    return out;
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    const PK = app.contextPath;
    await app.api.bootstrapProbe(PK);
    let st;
    const u = (p, k, roles, g, f, extra = {}) => ({username: `${p}${k}`, roles, givenName: g, familyName: f, ...extra});
    if (on('seed')) {
        st = {};
        const secSpec = isOjs ? [{abbrev: 'ART', title: 'Articles', policy: 'K4 Articles policy'}, {abbrev: 'KNP', title: 'K4 No Policy'}]
            : isOps ? [{abbrev: 'PRE', path: 'preprints', title: 'Preprints', policy: 'K4 Preprints policy'}] : undefined;
        const secKey = isOjs ? ['ART'] : isOps ? ['PRE'] : undefined;
        // D
        const d = tag('u58k4d');
        const dUsers = [u(d, 'mgr', ['manager'], 'Mona', 'Manager'), u(d, 'se', ['sectionEditor'], 'Sam', 'Subeditor', secKey ? {sections: secKey} : {}),
            u(d, 'as', [isOps ? 'editorialBoardMember' : 'copyeditor'], 'Asa', 'Assistant'), u(d, 'au', ['author'], 'Ada', 'Author'), u(d, 'rd', ['reader'], 'Rita', 'Reader')];
        if (!isOps) dUsers.push(u(d, 'ed', ['editor'], 'Eve', 'Editor'), u(d, 'rv', ['externalReviewer'], 'Rex', 'Reviewer'), u(d, 'ar', ['author', 'externalReviewer'], 'Ari', 'Authrev'));
        await app.api.createContext({tag: d, users: dUsers, ...(secSpec ? {sections: secSpec} : {}),
            ...(isOps ? {} : {plugins: {makesubmissionblockplugin: {enabled: true}}, sidebar: ['makesubmissionblockplugin']})});
        st.D = d;
        // C
        const c = tag('u58k4c');
        const cUsers = [u(c, 'mgr', ['manager'], 'Cleo', 'Manager'), u(c, 'se', ['sectionEditor'], 'Cy', 'Subeditor'), u(c, 'au', ['author'], 'Cal', 'Author')];
        if (!isOps) cUsers.push(u(c, 'ed', ['editor'], 'Ed', 'Nopermit'));
        await app.api.createContext({tag: c, copyrightNotice: {en: 'K4 seeded copyright notice'}, users: cUsers,
            ...(isOps ? {} : {roles: {editor: {permitSettings: false}}})});
        st.C = c;
        // X
        const x = tag('u58k4x');
        await app.api.createContext({tag: x, users: [u(x, 'mgr', ['manager'], 'Xia', 'Manager'), u(x, 'se', ['sectionEditor'], 'Xe', 'Subeditor', secKey ? {sections: secKey} : {}),
            u(x, 'au', ['author'], 'Xan', 'Author'), u(x, 'rd', ['reader'], 'Xiu', 'Reader')]});
        st.X = x;
        // N
        const n = tag('u58k4n');
        await app.api.createContext({tag: n, users: [u(n, 'mgr', ['manager'], 'Nia', 'Manager'), u(n, 'se', ['sectionEditor'], 'Ned', 'Subeditor', secKey ? {sections: secKey} : {}),
            u(n, 'au', ['author'], 'Nan', 'Author'), u(n, 'rd', ['reader'], 'Noa', 'Reader')]});
        st.N = n;
        // R
        const r = tag('u58k4r');
        await app.api.createContext({tag: r, restrictSiteAccess: true, users: [u(r, 'mgr', ['manager'], 'Rae', 'Manager'), u(r, 'rd', ['reader'], 'Ros', 'Reader')]});
        st.R = r;
        // L (OJS)
        if (isOjs) {
            const l = tag('u58k4l');
            await app.api.createContext({tag: l, issues: [{volume: 1, number: 1, year: 2026, published: true}], users: [u(l, 'mgr', ['manager'], 'Lu', 'Manager')]});
            st.L = l;
        }
        fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
        record('seed', st);
        log('seeded', JSON.stringify(st));
    } else {
        st = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    }
    const {D, C, X, N, R, L} = st;

    const {page, close} = await launch(app);
    const dialogsSince = dialogWatch(page);
    try {
        // ── pk: every roster level on publicknowledge, read only (Fields 142–153; Rules 23b, 24, 25; td9; A5) ──
        if (on('pk')) {
            const res = {};
            const who = isOps
                ? ['admin', 'manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa']
                : ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'assistant.rita', 'reviewer.julia', 'author.alex', 'reader.rosa'];
            for (const usr of who) {
                const k = usr.replace(/\W+/g, '');
                const rr = {};
                await signIn(page, usr);
                rr.subs = await subPage(page, app, PK, `pk-${k}-01-submissions`);
                rr.view = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `pk-${k}-02-view-pending`);
                if (['author.alex', 'manager.maya'].includes(usr)) {
                    await go(page, app, `/index.php/${PK}/about/submissions`);
                    rr.make = await pressAndRead(page, page.getByRole('link', {name: 'Make a new submission', exact: true}), `pk-${k}-03-make-new`);
                }
                res[usr] = rr;
                log('pk', usr, JSON.stringify({notice: rr.subs.notice, parts: (rr.subs.parts || []).map((p) => [p.heading, p.edit.length]), view: [rr.view.url, rr.view.h1, rr.view.deniedRole, rr.view.errorDialog, rr.view.snippet], make: rr.make && [rr.make.url, rr.make.h1, rr.make.begin]}));
                await signOut(page);
            }
            record('pk', res);
        }

        // ── out: signed out on publicknowledge (Fields; Rules 22, 23a, 24) ──
        if (on('out')) {
            const res = {};
            res.subs = await subPage(page, app, PK, 'out-01-submissions');
            await loc(page, 'Submissions page: notice line', page.locator('.page_submissions .cmp_notification'));
            await loc(page, 'Submissions page: part headings', page.locator('.page_submissions h2'));
            res.login = await pressAndRead(page, page.locator('.page_submissions .cmp_notification a').filter({hasText: 'Login'}), 'out-02-login-link');
            await go(page, app, `/index.php/${PK}/about/submissions`);
            res.register = await pressAndRead(page, page.locator('.page_submissions .cmp_notification a').filter({hasText: 'Register'}), 'out-03-register-link');
            await go(page, app, `/index.php/${PK}/about/submissions`);
            res.home = await pressAndRead(page, page.locator('.cmp_breadcrumbs a').first(), 'out-04-breadcrumb-home');
            // header About › Submissions on publicknowledge
            await go(page, app, `/index.php/${PK}`);
            res.headerNav = await page.locator('#navigationPrimary, .pkp_navigation_primary').first().evaluate((n) => [...n.querySelectorAll('a')].map((a) => a.innerText.trim() + ' → ' + (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''))).catch(() => []);
            await snap(page, 'out-05-home');
            // gateway/lockss control on every app (Cross-feature 451–452)
            res.lockssPk = await lockssRead(page, app, PK, 'out-06-gateway-lockss-pk');
            record('out', res);
            log('out', JSON.stringify({notice: res.subs.notice, links: res.subs.noticeLinks, crumbs: res.subs.breadcrumbs, parts: (res.subs.parts || []).map((p) => [p.cls, p.heading, p.edit.length, p.links]), login: [res.login.url, res.login.h1], register: [res.register.url, res.register.h1], home: [res.home.url], header: res.headerNav, lockss: [res.lockssPk.status, res.lockssPk.url, res.lockssPk.h1]}));
        }

        // ── ways: header "About" › "Submissions", the sidebar block, the typed address, on D signed out (Rule 22) ──
        if (on('ways')) {
            const res = {};
            await go(page, app, `/index.php/${D}`);
            await snap(page, 'w-01-d-home');
            const menu = page.locator('.pkp_site_nav_menu, #navigationPrimary').first();
            const about = menu.getByRole('link', {name: 'About', exact: true}).first();
            await loc(page, 'Header: "About" menu', about);
            await about.hover().catch(() => {});
            await sleep(500);
            const subLink = menu.getByRole('link', {name: 'Submissions', exact: true}).first();
            await loc(page, 'Header: About › "Submissions"', subLink);
            res.subLinkVisible = await subLink.isVisible().catch(() => false);
            res.header = await pressAndRead(page, subLink, 'w-02-header-about-submissions');
            await go(page, app, `/index.php/${D}`);
            const blk = page.locator('.block_make_submission a');
            await loc(page, 'Sidebar: "Make a Submission" block link', blk);
            res.block = await pressAndRead(page, blk, 'w-03-block-make-submission');
            res.typed = await subPage(page, app, D, 'w-04-typed');
            if (isOps) {
                // control: the server's Plugins list offers no "Make a Submission" block
                await signIn(page, `${D}mgr`, {contextPath: D});
                await go(page, app, `/index.php/${D}/management/settings/website`);
                await page.locator('#plugins-button').first().click().catch(() => {});
                await idle(page); await sleep(1500);
                const txt = await page.locator('#pluginGridContainer, [id^="component-grid-settings-plugins"]').first().innerText().catch(() => '');
                res.opsPlugins = {makeSubmission: /Make a Submission/i.test(txt), blocks: (txt.match(/[^\n]*Block[^\n]*/g) || []).map((x) => flat(x, 80)).slice(0, 12)};
                await snap(page, 'w-05-ops-plugins', {facts: res.opsPlugins});
                await signOut(page);
            }
            record('ways', res);
            log('ways', JSON.stringify({subLinkVisible: res.subLinkVisible, header: [res.header.present, res.header.href, res.header.url, res.header.h1], block: [res.block.present, res.block.href, res.block.url, res.block.h1], typed: [res.typed.url, res.typed.h1], ops: res.opsPlugins}));
        }

        // ── make: every level on D presses both links, plus the section link (Rule 23b; td9; A5) ──
        if (on('make')) {
            const res = {};
            const who = isOps ? ['rd', 'se', 'as', 'au', 'mgr'] : ['rd', 'se', 'as', 'rv', 'ar', 'au', 'ed', 'mgr'];
            for (const w of who) {
                const usr = `${D}${w}`;
                const rr = {};
                await signIn(page, usr, {contextPath: D});
                rr.subs = await subPage(page, app, D, `mk-${w}-01-submissions`);
                rr.view = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `mk-${w}-02-view-pending`);
                await go(page, app, `/index.php/${D}/about/submissions`);
                rr.make = await pressAndRead(page, page.getByRole('link', {name: 'Make a new submission', exact: true}), `mk-${w}-03-make-new`);
                if (!isOmp && ['au', 'rd'].includes(w)) {
                    await go(page, app, `/index.php/${D}/about/submissions`);
                    rr.sectionLink = await pressAndRead(page, page.locator('.page_submissions .section_policy a').first(), `mk-${w}-04-section-link`);
                }
                if (w === 'rd') {
                    // the same Reader after the start page (OPS enrols on load)
                    await go(page, app, `/index.php/${D}/about/submissions`);
                    rr.viewAfter = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `mk-${w}-05-view-pending-after-start`);
                }
                res[w] = rr;
                log('make', w, JSON.stringify({notice: rr.subs.notice, edits: (rr.subs.parts || []).map((p) => p.edit.length), view: [rr.view.url, rr.view.h1, rr.view.deniedRole, rr.view.errorDialog, rr.view.snippet], make: [rr.make.url, rr.make.h1, rr.make.begin, rr.make.deniedRole], section: rr.sectionLink && [rr.sectionLink.text, rr.sectionLink.href, rr.sectionLink.url, rr.sectionLink.h1, rr.sectionLink.begin, rr.sectionLink.checkedRadios], viewAfter: rr.viewAfter && [rr.viewAfter.url, rr.viewAfter.deniedRole]}));
                await signOut(page);
            }
            // signed out: the section block has no link
            res.out = await subPage(page, app, D, 'mk-out-01-submissions');
            record('make', res);
        }

        // ── edit: "Edit" beside each part on C (copyright seeded), per level (Rule 25; td10; OMP2) ──
        if (on('edit')) {
            const res = {};
            await signIn(page, `${C}mgr`, {contextPath: C});
            res.mgr = {subs: await subPage(page, app, C, 'e-mgr-01-submissions')};
            await loc(page, 'Submissions page: "Edit" links (h2 a)', page.locator('.page_submissions h2 a'));
            res.mgr.presses = [];
            const n = (res.mgr.subs.parts || []).length;
            for (let i = 0; i < n; i++) {
                const part = res.mgr.subs.parts[i];
                if (!part.edit.length) continue;
                await go(page, app, `/index.php/${C}/about/submissions`);
                const link = page.locator('.page_submissions > div').filter({has: page.locator('h2')}).nth(i).locator('h2 a').first();
                const p = await pressAndRead(page, link, `e-mgr-02-edit-${i}-${(part.cls || 'x').replace(/\W+/g, '')}`);
                p.part = part.heading;
                // the side tab again after 2 s (the hash tab may settle late)
                await sleep(2000);
                p.sideSelectedLate = (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text);
                p.urlLate = page.url().replace(/^https?:\/\/[^/]+/, '');
                res.mgr.presses.push(p);
            }
            await signOut(page);
            const others = isOps ? ['se', 'au'] : ['ed', 'se', 'au'];
            for (const w of others) {
                await signIn(page, `${C}${w}`, {contextPath: C});
                const rr = {subs: await subPage(page, app, C, `e-${w}-01-submissions`)};
                if (w === 'ed') {
                    rr.presses = [];
                    for (let i = 0; i < (rr.subs.parts || []).length; i++) {
                        if (!rr.subs.parts[i].edit.length) continue;
                        await go(page, app, `/index.php/${C}/about/submissions`);
                        rr.presses.push(await pressAndRead(page, page.locator('.page_submissions > div').filter({has: page.locator('h2')}).nth(i).locator('h2 a').first(), `e-ed-02-edit-${i}`));
                    }
                }
                res[w] = rr;
                await signOut(page);
            }
            res.out = await subPage(page, app, C, 'e-out-01-submissions');
            record('edit', res);
            log('edit', JSON.stringify({parts: (res.mgr.subs.parts || []).map((p) => [p.heading, p.edit.map((e) => e.href)]), presses: res.mgr.presses.map((p) => [p.part, p.url, p.topSelected, p.sideSelected, p.sideSelectedLate, p.h1]),
                ed: res.ed && [(res.ed.subs.parts || []).map((p) => p.edit.length), (res.ed.presses || []).map((p) => [p.url, p.deniedRole, p.errorDialog])], se: (res.se.subs.parts || []).map((p) => p.edit.length), au: (res.au.subs.parts || []).map((p) => p.edit.length), out: (res.out.parts || []).map((p) => [p.heading, p.edit.length])}));
        }

        // ── texts: Author Guidance and Privacy Statement changed on D, read on the page (Rules 24, 25; Settings 3; Coverage) ──
        if (on('texts')) {
            const res = {};
            await signIn(page, `${D}mgr`, {contextPath: D});
            // Settings 3: the privacy statement a new journal arrives with
            await openPrivacy(page, app, D);
            const pIds = (await tinyIds(page)).filter((i) => /privacyStatement/.test(i));
            res.privacyIds = pIds;
            const pid = pIds.find((i) => /-en$/.test(i)) || pIds[0];
            res.privacyDefault = flat(await tinyGet(page, pid), 300);
            await snap(page, 't-01-privacy-default', {facts: {ids: pIds, text: res.privacyDefault}});
            // Author Guidance: the editors
            await openWorkflow(page, app, D, 'instructions');
            const ids = await tinyIds(page);
            res.guidanceIds = ids;
            const idOf = (f) => ids.find((i) => i.includes(`-${f}-`) && /-en$/.test(i)) || ids.find((i) => i.includes(f));
            const G = idOf('authorGuidelines'), K = idOf('submissionChecklist'), CR = idOf('copyrightNotice');
            res.editors = {G, K, CR};
            res.before = await subPage(page, app, D, 't-02-submissions-before');
            // (a) Copyright Notice set on the tab
            await openWorkflow(page, app, D, 'instructions');
            res.crTyped = await mceSet(page, CR, 'K4 copyright typed on the tab');
            res.crSave = await saveForm(page, page.locator(`[id="${CR}"]`), 't-03-copyright-saved');
            res.crSamePage = flat(await tinyGet(page, CR), 200);
            await page.reload(); await idle(page); await sleep(1500);
            await page.locator('[id="instructions-button"]').first().click().catch(() => {}); await idle(page); await sleep(1500);
            res.crAfterReload = flat(await tinyGet(page, CR), 200);
            res.afterCopyright = await subPage(page, app, D, 't-04-submissions-copyright-set');
            // (b) Author Guidelines edited
            await openWorkflow(page, app, D, 'instructions');
            res.gTyped = await mceSet(page, G, 'K4 guidelines edited');
            res.gSave = await saveForm(page, page.locator(`[id="${G}"]`), 't-05-guidelines-edited-saved');
            res.afterGuidelinesEdit = await subPage(page, app, D, 't-06-submissions-guidelines-edited');
            // (c) Checklist: a single space (the other end of "empty"), then emptied
            await openWorkflow(page, app, D, 'instructions');
            res.kSpace = await mceSet(page, K, ' ');
            res.kSpaceSave = await saveForm(page, page.locator(`[id="${K}"]`), 't-07-checklist-space-saved');
            res.afterChecklistSpace = await subPage(page, app, D, 't-08-submissions-checklist-space');
            await openWorkflow(page, app, D, 'instructions');
            res.kEmpty = await mceSet(page, K, '');
            res.kEmptySave = await saveForm(page, page.locator(`[id="${K}"]`), 't-09-checklist-empty-saved');
            res.afterChecklistEmpty = await subPage(page, app, D, 't-10-submissions-checklist-empty');
            // (d) Author Guidelines emptied; read the tab right after and after a reload
            await openWorkflow(page, app, D, 'instructions');
            res.gEmpty = await mceSet(page, G, '');
            res.gEmptySave = await saveForm(page, page.locator(`[id="${G}"]`), 't-11-guidelines-empty-saved');
            res.gSamePage = await tinyGet(page, G);
            await page.reload(); await idle(page); await sleep(1500);
            await page.locator('[id="instructions-button"]').first().click().catch(() => {}); await idle(page); await sleep(1500);
            res.gAfterReload = await tinyGet(page, G);
            await snap(page, 't-12-guidance-after-reload', {facts: {g: res.gAfterReload}});
            res.afterGuidelinesEmpty = await subPage(page, app, D, 't-13-submissions-guidelines-empty');
            // (e) leaving the Author Guidance tab with a change unsaved, by the header's "Submissions" route (typed address)
            await openWorkflow(page, app, D, 'instructions');
            await mceSet(page, G, 'K4 unsaved guidelines');
            let t0 = Date.now();
            await go(page, app, `/index.php/${D}/about/submissions`);
            res.leaveGuidance = {dialogs: dialogsSince(t0), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
            res.afterLeaveGuidance = await subPage(page, app, D, 't-14-submissions-after-leaving-unsaved');
            // (f) Privacy Statement: leave with a change unsaved, then empty it and save
            await openPrivacy(page, app, D);
            await mceSet(page, pid, 'K4 unsaved privacy');
            t0 = Date.now();
            await go(page, app, `/index.php/${D}/about/submissions`);
            res.leavePrivacy = {dialogs: dialogsSince(t0), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
            await openPrivacy(page, app, D);
            res.privacyAfterLeave = flat(await tinyGet(page, pid), 120);
            res.pEmpty = await mceSet(page, pid, '');
            res.pEmptySave = await saveForm(page, page.locator(`[id="${pid}"]`), 't-15-privacy-empty-saved');
            res.pSamePage = await tinyGet(page, pid);
            await page.reload(); await idle(page); await sleep(800);
            await openPrivacy(page, app, D);
            res.pAfterReload = await tinyGet(page, pid);
            res.afterPrivacyEmpty = await subPage(page, app, D, 't-16-submissions-privacy-empty');
            // the journal's own "Privacy Statement" page with the statement emptied (sweep)
            const ps = await go(page, app, `/index.php/${D}/about/privacy`);
            res.privacyPage = {status: ps, ...(await classify(page)), main: flat(await page.locator('.page, .pkp_structure_main').first().innerText().catch(() => ''), 400)};
            await snap(page, 't-17-privacy-page-empty', {facts: res.privacyPage});
            await signOut(page);
            res.outFinal = await subPage(page, app, D, 't-18-submissions-signed-out-final');
            record('texts', res);
            const hs = (s) => (s.parts || []).map((p) => `${p.heading}(${p.bodyLength})`);
            log('texts', JSON.stringify({privacyDefault: res.privacyDefault, editors: res.editors, before: hs(res.before), cr: [res.crSave.statuses, res.crSave.responseStatus, res.crSamePage, res.crAfterReload], afterCr: hs(res.afterCopyright), afterG: hs(res.afterGuidelinesEdit), kSpace: [res.kSpace, res.kSpaceSave.statuses], afterKSpace: hs(res.afterChecklistSpace), afterKEmpty: hs(res.afterChecklistEmpty), gEmpty: [res.gEmptySave.statuses, res.gSamePage, res.gAfterReload], afterGEmpty: hs(res.afterGuidelinesEmpty), leaveG: res.leaveGuidance, afterLeaveG: hs(res.afterLeaveGuidance), leaveP: res.leavePrivacy, pAfterLeave: res.privacyAfterLeave, pEmpty: [res.pEmptySave.statuses, res.pSamePage, res.pAfterReload], afterP: hs(res.afterPrivacyEmpty), privacyPage: [res.privacyPage.url, res.privacyPage.h1, res.privacyPage.main], outFinal: hs(res.outFinal)}));
        }

        // ── disable: "Disable Submissions" ticked, then unticked again, on X (Rules 23c, 4, 5) ──
        if (on('disable')) {
            const res = {};
            await signIn(page, `${X}mgr`, {contextPath: X});
            res.before = await subPage(page, app, X, 'x-01-submissions-before-mgr');
            await openWorkflow(page, app, X, 'disableSubmissions');
            const box = page.locator('input[name="disableSubmissions"]').first();
            // leave with the box ticked and unsaved
            await box.check().catch(() => {});
            let t0 = Date.now();
            await go(page, app, `/index.php/${X}/about/submissions`);
            res.leaveUnsaved = {dialogs: dialogsSince(t0), notice: flat(await page.locator('.page_submissions .cmp_notification').innerText().catch(() => null))};
            await openWorkflow(page, app, X, 'disableSubmissions');
            res.boxAfterLeave = await box.isChecked().catch(() => null);
            await box.check();
            res.save = await saveForm(page, box, 'x-02-disable-saved');
            res.boxSamePage = await box.isChecked().catch(() => null);
            await page.reload(); await idle(page); await sleep(1200);
            await page.locator('[id="submission-button"]').first().click().catch(() => {}); await sleep(500);
            await page.locator('[id="disableSubmissions-button"]').first().click().catch(() => {}); await sleep(1000);
            res.boxAfterReload = await box.isChecked().catch(() => null);
            res.mgr = await subPage(page, app, X, 'x-03-submissions-disabled-mgr');
            await signOut(page);
            for (const w of ['se', 'au', 'rd']) {
                await signIn(page, `${X}${w}`, {contextPath: X});
                res[w] = await subPage(page, app, X, `x-04-submissions-disabled-${w}`);
                await signOut(page);
            }
            res.out = await subPage(page, app, X, 'x-05-submissions-disabled-out');
            // untick again
            await signIn(page, `${X}mgr`, {contextPath: X});
            await openWorkflow(page, app, X, 'disableSubmissions');
            await box.uncheck();
            res.save2 = await saveForm(page, box, 'x-06-enable-saved');
            await signOut(page);
            await signIn(page, `${X}au`, {contextPath: X});
            res.auAgain = await subPage(page, app, X, 'x-07-submissions-enabled-au');
            await signOut(page);
            res.outAgain = await subPage(page, app, X, 'x-08-submissions-enabled-out');
            record('disable', res);
            log('disable', JSON.stringify({before: res.before.notice, leave: res.leaveUnsaved, boxAfterLeave: res.boxAfterLeave, save: [res.save.statuses, res.save.responseStatus], same: res.boxSamePage, reload: res.boxAfterReload,
                mgr: [res.mgr.notice, res.mgr.noticeLinks], se: res.se.notice, au: res.au.notice, rd: res.rd.notice, out: [res.out.notice, res.out.noticeLinks], parts: (res.out.parts || []).map((p) => p.heading), save2: res.save2.statuses, auAgain: res.auAgain.notice, outAgain: res.outAgain.notice}));
        }

        // ── sections: no section open to authors (Rule 23c; Settings 4; {OMP} control) ──
        if (on('sections')) {
            const res = {};
            const GRID = isOmp ? '#seriesGridContainer' : '#sectionsGridContainer';
            const FORM = isOmp ? 'form#seriesForm' : 'form#sectionForm';
            const RESTRICT = isOps ? 'editorRestriction' : 'editorRestricted';
            const form = () => page.locator(FORM).first();
            await signIn(page, `${N}au`, {contextPath: N});
            res.auBefore = await subPage(page, app, N, 'n-01-submissions-before-au');
            await signOut(page);
            await signIn(page, `${N}mgr`, {contextPath: N});
            await go(page, app, `/index.php/${N}/management/settings/context`);
            await page.getByRole('tab', {name: isOmp ? 'Series' : 'Sections', exact: true}).first().click(); await idle(page);
            await page.locator(GRID).waitFor({timeout: T}).catch(() => {});
            await sleep(800);
            if (isOmp) {
                await page.locator(GRID).getByRole('link', {name: /Add Series/}).first().click();
            } else {
                const row = page.locator(GRID).locator('tr.gridRow').first();
                await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(400);
                const id = await row.getAttribute('id');
                await page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
            }
            await form().locator('input[name^="title"]').first().waitFor({timeout: T});
            await idle(page); await sleep(800);
            if (isOmp) {
                await form().locator('input[name="title[en]"]').fill('K4 Closed Series');
                await form().locator('input[name="path"]').fill('k4closed');
            }
            const rbox = form().locator(`input[name="${RESTRICT}"]`).first();
            await loc(page, `Section window: editor-only box input[name="${RESTRICT}"]`, rbox);
            res.restrictLabel = await rbox.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            await rbox.check();
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /(update|save)-?(section|series)/i.test(r.url()), {timeout: T}).catch(() => null);
            await form().getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            res.save = r ? r.status() : null;
            await sleep(1500); await idle(page);
            res.grid = flat(await page.locator(GRID).innerText().catch(() => ''), 300);
            await snap(page, 'n-02-section-restricted-saved', {facts: {label: res.restrictLabel, save: res.save, grid: res.grid}});
            res.mgr = await subPage(page, app, N, 'n-03-submissions-restricted-mgr');
            await signOut(page);
            for (const w2 of ['se', 'au', 'rd']) {
                await signIn(page, `${N}${w2}`, {contextPath: N});
                res[w2] = await subPage(page, app, N, `n-04-submissions-restricted-${w2}`);
                if (w2 === 'au' && !res[w2].notAccepting) {
                    res.auMake = await pressAndRead(page, page.getByRole('link', {name: 'Make a new submission', exact: true}), 'n-05-make-new-au');
                }
                await signOut(page);
            }
            res.out = await subPage(page, app, N, 'n-06-submissions-restricted-out');
            record('sections', res);
            log('sections', JSON.stringify({auBefore: res.auBefore.notice, label: res.restrictLabel, save: res.save, grid: res.grid, mgr: res.mgr.notice, se: res.se.notice, au: res.au.notice, rd: res.rd.notice, out: res.out.notice, auMake: res.auMake && [res.auMake.url, res.auMake.h1, res.auMake.begin, res.auMake.snippet], blocks: (res.out.parts || []).map((p) => p.heading)}));
        }

        // ── restrict: a journal closed to visitors (Rule 26; Settings 7) ──
        if (on('restrict')) {
            const res = {};
            await signIn(page, `${R}mgr`, {contextPath: R});
            await go(page, app, `/index.php/${R}/management/settings/access`);
            await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click().catch((e) => { res.tabError = e.message.slice(0, 100); });
            await idle(page); await sleep(800);
            res.tabs = (await topTabs(page)).map((t) => t.text);
            res.boxes = await page.locator('input[type=checkbox]:visible').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, label: (e.labels && e.labels[0] ? e.labels[0].innerText : (e.closest('label') || e.parentElement).innerText).replace(/\s+/g, ' ').trim()}))).catch(() => []);
            await snap(page, 'r-01-site-access-options', {facts: {tabs: res.tabs, boxes: res.boxes}});
            await signOut(page);
            const status = await go(page, app, `/index.php/${R}/about/submissions`);
            res.out = {status, ...(await classify(page))};
            await snap(page, 'r-02-signed-out-typed', {facts: res.out});
            // sign in on the page it sent us to, and see where it lands
            const uname = `${R}rd`;
            await page.evaluate(() => document.querySelectorAll('input[maxlength]').forEach((e) => e.removeAttribute('maxlength'))).catch(() => {});
            await page.locator('input[name="username"]').fill(uname).catch(() => {});
            await page.locator('input[name="password"]').fill(uname + uname).catch(() => {});
            await Promise.all([page.waitForLoadState('load').catch(() => {}), page.locator('form').filter({has: page.locator('input[name="password"]')}).getByRole('button', {name: /Login|Log In/}).first().click().catch((e) => { res.loginErr = e.message.slice(0, 100); })]);
            await idle(page); await sleep(1200);
            res.afterLogin = await classify(page);
            await snap(page, 'r-03-after-login', {facts: res.afterLogin});
            res.rd = await subPage(page, app, R, 'r-04-submissions-reader');
            await signOut(page);
            record('restrict', res);
            log('restrict', JSON.stringify({tabs: res.tabs, boxes: res.boxes, out: [res.out.status, res.out.url, res.out.h1, res.out.loginForm], afterLogin: [res.afterLogin.url, res.afterLogin.h1], rd: [res.rd.notice, (res.rd.parts || []).map((p) => p.heading)]}));
        }

        // ── lockss {OJS}: the archiving pages' "Copyright" row (Cross-feature 451–452) ──
        if (on('lockss') && isOjs) {
            const res = {};
            if (process.env.L_FRESH) {
                // a second pass on a fresh journal (L_FRESH=1)
                const l2 = tag('u58k4l');
                await app.api.createContext({tag: l2, issues: [{volume: 1, number: 1, year: 2026, published: true}], users: [u(l2, 'mgr', ['manager'], 'Lu', 'Manager')]});
                res.fresh = l2;
            }
            const L = res.fresh || st.L;
            const openArch = async () => {
                await go(page, app, `/index.php/${L}/management/settings/distribution`);
                await page.getByRole('tab', {name: 'Archiving', exact: true}).first().click(); await idle(page); await sleep(500);
                await page.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
            };
            await signIn(page, `${L}mgr`, {contextPath: L});
            await openArch();
            await page.locator('input[name="enableLockss"]').first().setChecked(true);
            await page.locator('input[name="enableClockss"]').first().setChecked(true);
            res.archSave = await saveForm(page, page.locator('input[name="enableLockss"]').first(), 'l-01-archiving-saved');
            await signOut(page);
            res.a = {lockss: await lockssRead(page, app, L, 'l-02-lockss-no-copyright'), clockss: await lockssRead(page, app, L, 'l-03-clockss-no-copyright', 'clockss')};
            // copyright notice set on the tab, no license terms
            await signIn(page, `${L}mgr`, {contextPath: L});
            await openWorkflow(page, app, L, 'instructions');
            const cr = (await tinyIds(page)).find((i) => /copyrightNotice.*-en$/.test(i));
            await mceSet(page, cr, 'K4 L copyright notice');
            res.crSave = await saveForm(page, page.locator(`[id="${cr}"]`), 'l-04-copyright-saved');
            await signOut(page);
            res.b = {lockss: await lockssRead(page, app, L, 'l-05-lockss-copyright'), clockss: await lockssRead(page, app, L, 'l-06-clockss-copyright', 'clockss')};
            // license terms set on Distribution › License
            await signIn(page, `${L}mgr`, {contextPath: L});
            await go(page, app, `/index.php/${L}/management/settings/distribution`);
            await page.getByRole('tab', {name: 'License', exact: true}).first().click(); await idle(page); await sleep(1000);
            res.licTyped = await mceSet(page, 'license-licenseTerms-control-en', 'K4 license terms');
            res.licSave = await saveForm(page, page.locator('[id="license-licenseTerms-control-en"]'), 'l-07-license-saved');
            await signOut(page);
            res.c = {lockss: await lockssRead(page, app, L, 'l-08-lockss-copyright-license'), clockss: await lockssRead(page, app, L, 'l-09-clockss-copyright-license', 'clockss')};
            record('lockss', res);
            log('lockss', JSON.stringify({arch: res.archSave.statuses, a: [res.a.lockss.status, res.a.lockss.url, res.a.lockss.copyrightRow], cr: res.crSave.statuses, b: [res.b.lockss.copyrightRow, res.b.clockss.copyrightRow], lic: res.licSave.statuses, c: [res.c.lockss.copyrightRow, res.c.clockss.copyrightRow]}));
        }

        // ── recipe: the footnote's accounts sign in with the stated passwords; the context key copyrightNotice (Canonical scenarios, note s) ──
        if (on('recipe')) {
            const res = {};
            for (const usr of isOps ? ['manager.maya', 'author.alex', 'reader.rosa', 'sectioneditor.ana', 'assistant.rita', 'admin'] : ['manager.maya', 'author.alex', 'reader.rosa', 'reviewer.julia', 'sectioneditor.ana', 'assistant.rita', 'admin']) {
                await signIn(page, usr).catch((e) => { res[usr] = {error: e.message.slice(0, 100)}; });
                if (!res[usr]) res[usr] = {landed: page.url().replace(/^https?:\/\/[^/]+/, ''), signedIn: !(await page.locator('input[name="password"]').count())};
                await signOut(page).catch(() => {});
            }
            // the seeded copyright notice (C) shows on the page for a visitor
            res.cOut = await subPage(page, app, C, 'rc-01-c-signed-out');
            record('recipe', res);
            log('recipe', JSON.stringify({signIns: Object.fromEntries(Object.entries(res).filter(([k]) => k !== 'cOut').map(([k, v]) => [k, v.signedIn])), c: (res.cOut.parts || []).map((p) => [p.heading, p.body.slice(0, 40)])}));
        }
        // ── recipe2: a file carrying a component (note s), and whose privacy statement the page shows at the default configuration (Rule 27) ──
        if (on('recipe2')) {
            const res = {};
            try {
                const r = await app.api.createSubmission({tag: tag('u58k4g'), context: C, submitter: `${C}au`, title: 'K4 component file',
                    ...(isOps ? {galleys: [{label: 'PDF', file: 'preprint.pdf', genre: 'Other'}]} : {files: [{file: 'article.pdf', genre: 'Other'}]})});
                res.seed = {id: r.submissionId, files: r.files, galleys: r.galleys};
            } catch (e) { res.seedError = String(e.message).slice(0, 400); }
            if (res.seed) {
                await signIn(page, `${C}mgr`, {contextPath: C});
                await go(page, app, `/index.php/${C}/dashboard/editorial?workflowSubmissionId=${res.seed.id}`);
                await sleep(2500); await idle(page);
                if (isOps) {
                    await page.getByRole('dialog').getByRole('button', {name: /^Galleys$/}).or(page.getByRole('dialog').getByRole('link', {name: /^Galleys$/})).first().click().catch(() => {});
                    await sleep(2000); await idle(page);
                }
                const s = await snap(page, 'rc2-01-workflow-file', {facts: res.seed});
                res.dialogHasOther = /\bOther\b/.test((s.text && s.text.dialog) || '');
                await signOut(page);
            }
            // the default configuration: the page's part and the journal's own Privacy Statement page carry the same text
            const sp = await subPage(page, app, C, 'rc2-02-c-submissions');
            const part = (sp.parts || []).find((p) => /privacy_statement/.test(p.cls));
            await go(page, app, `/index.php/${C}/about/privacy`);
            const privPage = flat(await page.locator('.page_privacy, .page').first().innerText().catch(() => ''), 400);
            await snap(page, 'rc2-03-c-privacy-page', {facts: {privPage}});
            res.privacy = {part: part && part.body.slice(0, 200), page: privPage, same: !!(part && privPage.includes(part.body.slice(0, 60)))};
            record('recipe2', res);
            log('recipe2', JSON.stringify(res).slice(0, 1500));
        }
    } finally {
        await close();
    }
});
