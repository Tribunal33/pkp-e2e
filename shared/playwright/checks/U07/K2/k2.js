// U07 claim check, chunk K2: Settings › Journal (Press / Server) › "Masthead" and "Contact",
// and the reader pages that show what these tabs hold, on all three apps.
// Spec: docs/specs/U07-journal-identity-and-about-pages.md — Fields intro and the two tabs (56–101),
// Rules 7–11 (193–225), Side effects "Principal contact changed" / "Technical support contact"
// (359–369) and "Saving any tab" (375–377), Settings bullet 12 "Forms" (436–440), register A3 and
// OPS2; footnotes f, g, h, n, o, x, td4, td8, td9, f-a3, f-ops2.
//
// Seeds per app (tag prefix u07k2), kept in k2-state-<app>.json (RESEED=1 to seed again):
//   M  main context "U07 K2 M <t>", initials K2M: managers mm (also a manager of L, so two
//      journals) and m2 (this journal only), an Editor [OJS/OMP], an author; a submitted
//      submission (raises the managers' task); [OMP/OPS] a published one; [OJS] an issue made
//      on screen and a published article in it (phase ojsissue)
//   F  a fresh context, no initials given, manager fm (td4, A3)
//   L  English and French for UI and forms, manager lm (and mm) (td9, Rule 11)
//   H  a journal the Site Administrator creates on Administration › Hosted Journals (A3)
// Phases (PHASES=a,b to narrow):
//   fresh     F: Masthead and Contact on arrival; client-side and server-side refusals (td4, A3)
//   create    H: the Hosted Journals create form, then H's Contact tab
//   levels    M: both tabs as manager, Editor [OJS/OMP], Site Administrator (the sweep)
//   ojsissue  [OJS] M: an issue created and published on screen with an article in it
//   rename    M: title, initials, summary; header, browser titles, site list, theme option,
//             Tasks panel (td8, Rules 7–8); the save's silence (375–377)
//   hidden    M: every field readers never see, filled with markers; the public pages searched
//             (Rule 10, OPS2)
//   contact   M: the Contact tab filled; the Contact page; the sender of a password reset
//             before and after; the account-validation email's sender (Rule 9, Side effects)
//   mail2     [OJS] M: a second issue published on screen after the contact change; the sender of
//             the authors' "Publication Published" email
//   lang      L and M: boxes per language; the French page's fallback (td9, Rule 11, bullet 12)
//   forms     F: French ticked under "Forms" on the Languages grid, the boxes counted (bullet 12)
//   leave     M: a Masthead change left unsaved across the tab switch and the page exit
//   toast     F: how long the server refusal's notice stays on screen
//   history   M: "Editorial History" filled (its page), then a header logo uploaded (Rule 7's other end)
// Run: PROBE_FEATURE=U07 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U07/K2/k2.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');
const {runJobs} = require('../../../support/jobs.js');

const ALL = ['fresh', 'create', 'levels', 'ojsissue', 'rename', 'hidden', 'contact', 'mail2', 'lang', 'forms', 'leave', 'toast', 'history'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const stateFile = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const cUrl = (app, ctx, p = '') => app.url(`/index.php/${ctx}${p}`);

// ---------------------------------------------------------------------------
// Settings › Journal helpers

const TAB = {masthead: 'Masthead', contact: 'Contact'};
const FORM_ANCHOR = {masthead: '[id^="masthead-name-control"]', contact: '#contact-contactName-control'};

async function openTab(page, app, ctx, which, {locale} = {}) {
    await page.goto(cUrl(app, ctx, `${locale ? `/${locale}` : ''}/management/settings/context`));
    await idle(page);
    const tab = page.getByRole('tab', {name: TAB[which], exact: true}).first();
    await tab.waitFor({timeout: T});
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
    await page.locator(FORM_ANCHOR[which]).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    await waitAllMce(page);
    return form(page, which);
}
const form = (page, which) => page.locator('form').filter({has: page.locator(FORM_ANCHOR[which])}).first();

async function waitAllMce(page) {
    await page.waitForFunction(() => {
        if (!window.tinymce) return true;
        const eds = window.tinymce.get ? window.tinymce.get() : window.tinymce.editors;
        return [...(eds || [])].every((e) => e.initialized);
    }, undefined, {timeout: T}).catch(() => {});
    await sleep(300);
}
async function mceGet(page, id) {
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
}
async function mceSet(page, id, text) {
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
    const body = page.frameLocator(`#${id}_ifr`).locator('body');
    await body.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text);
    await sleep(300);
    return mceGet(page, id);
}

/** The form as data: groups, their headings and descriptions, each field's label, controls and values. */
async function formShape(page, f) {
    const shape = await f.evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const fieldOf = (ff) => ({
            label: t(ff.querySelector('.pkpFormFieldLabel, label, legend')),
            description: t(ff.querySelector('.pkpFormField__description')),
            error: t(ff.querySelector('.pkpFieldError')),
            controls: [...ff.querySelectorAll('input:not([type=hidden]), textarea, select')].map((c) => ({
                id: c.id, tag: c.tagName, type: c.type, cls: c.className,
                value: c.tagName === 'SELECT' ? c.value : (c.value || '').slice(0, 300),
                selectedLabel: c.tagName === 'SELECT' ? (c.selectedOptions[0] || {}).label : undefined,
                options: c.tagName === 'SELECT' ? c.options.length : undefined,
                firstOptions: c.tagName === 'SELECT' ? [...c.options].slice(0, 3).map((o) => o.label) : undefined,
                rows: c.rows || undefined, invalid: c.getAttribute('aria-invalid'),
            })),
            toolbar: [...ff.querySelectorAll('.tox-tbtn, .tox-split-button')].map((b) => b.getAttribute('aria-label') || b.title),
            text: (t(ff) || '').slice(0, 400),
        });
        const groups = [...el.querySelectorAll('.pkpFormGroup')].map((g) => ({
            heading: t(g.querySelector('.pkpFormGroup__heading, legend')),
            description: t(g.querySelector('.pkpFormGroup__description')),
            fields: [...g.querySelectorAll('.pkpFormField')].map(fieldOf),
        }));
        const buttons = [...el.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => ({text: t(b), disabled: b.disabled}));
        const footer = t(el.querySelector('.pkpFormPage__footer, .pkpFormFooter'));
        return {groups, buttons, footer};
    });
    // rich-text values
    const areas = await f.locator('textarea').evaluateAll((els) => els.map((e) => e.id).filter(Boolean));
    shape.rich = {};
    for (const id of areas) {
        const v = await mceGet(page, id);
        if (v !== null) shape.rich[id] = v;
    }
    return shape;
}

/** The refusal state of a form: flagged fields, footer, Save grayed out, the page notice. */
async function refusalState(page, f) {
    const flagged = await f.locator('.pkpFormField').filter({has: page.locator('.pkpFieldError')}).evaluateAll((els) => els.map((e) => ({
        label: ((e.querySelector('.pkpFormFieldLabel, label, legend') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        error: ((e.querySelector('.pkpFieldError') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        ids: [...e.querySelectorAll('input,textarea,select')].map((c) => c.id),
    }))).catch(() => []);
    const save = f.getByRole('button', {name: 'Save', exact: true});
    const saveDisabled = await save.isDisabled().catch(() => null);
    const jump = f.getByRole('button', {name: 'Jump to next error'});
    const footer = flat(await f.locator('.pkpFormPage__footer').innerText().catch(() => ''), 400);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const notice = (bodyText.match(/The form was not saved[^\n]*/g) || []).map((s) => s.trim());
    const status = await page.locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => []);
    return {flagged, saveDisabled, jumpCount: await jump.count(), footer, notice, status: status.map((s) => flat(s, 200)).filter(Boolean)};
}

/** Press a tab form's Save and record whether a request left, what came back and what the screen says. */
async function pressSave(page, f) {
    const reqs = [];
    const onReq = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.method() !== 'GET') {
            reqs.push({method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), override: r.headers()['x-http-method-override'] || null, body: (r.postData() || '').slice(0, 1500)});
        }
    };
    page.on('request', onReq);
    const save = f.getByRole('button', {name: 'Save', exact: true});
    const disabledBefore = await save.isDisabled().catch(() => null);
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    if (!disabledBefore) await save.click();
    const resp = await w;
    let body = null;
    if (resp) { try { body = await resp.json(); } catch { body = null; } }
    let saved = false;
    if (resp && resp.ok()) saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
    await sleep(600);
    page.off('request', onReq);
    const st = await refusalState(page, f);
    return {disabledBefore, requests: reqs, status: resp ? resp.status() : null, saved, body: resp && resp.status() >= 400 ? body : undefined, ...st};
}

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message || e).slice(0, 200)}; }
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

/** A public page as data: status, title, header text, h1, main text, and where each marker shows. */
async function pub(page, url, name, {markers = [], shotIt = false} = {}) {
    let resp = null;
    try { resp = await page.goto(url); } catch (e) { return {error: String(e.message || e)}; }
    await idle(page).catch(() => {});
    let s;
    try { s = await screen(page); } catch (e) { s = {error: String(e.message || e)}; }
    const data = await page.evaluate((marks) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('.pkp_structure_main') || document.body;
        const html = document.documentElement.outerHTML;
        const head = document.head.innerHTML;
        const vis = document.body.innerText;
        const hits = {};
        for (const m of marks) {
            const low = m.toLowerCase();
            hits[m] = {visible: vis.toLowerCase().includes(low), head: head.toLowerCase().includes(low), html: html.toLowerCase().includes(low),
                headLines: head.split('\n').filter((l) => l.toLowerCase().includes(low)).map((l) => l.trim()).slice(0, 5)};
        }
        return {
            siteName: txt(document.querySelector('.pkp_site_name')),
            siteNameHtml: (document.querySelector('.pkp_site_name') || {}).innerHTML?.replace(/\s+/g, ' ').slice(0, 400),
            h1: [...document.querySelectorAll('h1')].map(txt),
            mainText: (txt(main) || '').slice(0, 3000),
            hits,
        };
    }, markers).catch((e) => ({error: String(e.message || e)}));
    const out = {status: resp ? resp.status() : null, url: page.url(), title: await page.title().catch(() => null), ...data};
    record(name, {...s, extracted: out});
    if (shotIt) await shot(page, name).catch(() => {});
    return out;
}

/** Tasks panel rows as data (the bell in the header). */
async function tasksPanel(page, app, ctx, name) {
    await page.goto(cUrl(app, ctx, '/submissions'));
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    const bellName = await bell.getAttribute('aria-label').catch(() => null) || flat(await bell.innerText().catch(() => ''), 60);
    await bell.click();
    const dlg = page.locator('[role="dialog"]:visible').last();
    await dlg.waitFor({timeout: T});
    await dlg.locator('div.task, td').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const rows = await dlg.locator('div.task').evaluateAll((els) => els.map((e) => ({
        text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
        acronym: (e.querySelector('.acronym') || {}).innerText || null,
        title: (e.querySelector('.title, .submission_title') || {}).innerText || null,
    }))).catch(() => []);
    await snap(page, name, {bellName, rows: rows.slice(0, 30)});
    await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
    return {bellName, rows};
}

async function bellName(page, app, ctx) {
    await page.goto(cUrl(app, ctx, '/submissions'));
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    return flat(await bell.innerText().catch(() => ''), 60) + ' | ' + (await bell.getAttribute('aria-label').catch(() => ''));
}

/** Newest Mailpit messages to an address created after `since`. */
async function mailsSince(app, to, since) {
    const r = await app.mail._search({to});
    return (r.messages || []).filter((m) => new Date(m.Created) >= since).map((m) => ({id: m.ID, created: m.Created, from: m.From, subject: m.Subject, snippet: m.Snippet}));
}
async function waitMail(app, to, since, {ms = 20_000} = {}) {
    const end = Date.now() + ms;
    let jobsRun = false;
    for (;;) {
        const list = await mailsSince(app, to, since);
        if (list.length) return list;
        if (!jobsRun && Date.now() > end - ms / 2) {
            try {
                process.env.PKP_CONFIG_FILE = app.configFile;
                process.env.TEST_API_KEY = app.testApiKey || process.env.TEST_API_KEY;
                process.env.PLAYWRIGHT_BASE_PORT = String(app.basePort);
                runJobs({appRoot: path.resolve(process.cwd(), app.root), timeoutMs: 60_000});
            } catch (e) { /* jobs tool unavailable: keep polling */ }
            jobsRun = true;
        }
        if (Date.now() > end) return [];
        await sleep(700);
    }
}

async function lostPassword(page, app, ctx, email, name) {
    await signOut(page).catch(() => {});
    await page.goto(cUrl(app, ctx, '/login/lostPassword'));
    await idle(page);
    await page.locator('input#email').fill(email);
    await page.locator('form#lostPasswordForm button[type="submit"]').click();
    await idle(page).catch(() => {});
    await snap(page, name);
}

async function selectCountry(f, label = 'Iceland') {
    const sel = f.locator('select[id^="masthead-country-control"]').first();
    await sel.selectOption({label});
}

// ---------------------------------------------------------------------------
forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const steps = [];
    const step = (s, data = {}) => { steps.push({at: new Date().toISOString(), s, ...data}); console.log(`[k2 ${app.name}]`, s, JSON.stringify(data).slice(0, 300)); };
    const summary = {};
    let st = fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    const save = () => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));

    // ---- seed ------------------------------------------------------------------
    if (!st || process.env.RESEED === '1') {
        const t = tag('u07k2');
        const P = (s) => `${t}${s}`;
        const usersM = [
            {username: P('mm'), roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: P('m2'), roles: ['manager'], givenName: 'Solo', familyName: 'Manager'},
            ...(isOPS ? [] : [{username: P('me'), roles: ['editor'], givenName: 'Edda', familyName: 'Editor'}]),
            {username: P('au'), roles: ['author'], givenName: 'Aria', familyName: 'Author'},
        ];
        const M = await app.api.createContext({tag: P('m'), context: {name: `U07 K2 M ${t}`, acronym: 'K2M'}, users: usersM});
        const F = await app.api.createContext({tag: P('f'), context: {name: `U07 K2 F ${t}`}, users: [{username: P('fm'), roles: ['manager'], givenName: 'Fern', familyName: 'Fresh'}]});
        const L = await app.api.createContext({tag: P('l'), context: {name: `U07 K2 L ${t}`, acronym: 'K2L', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            users: [{username: P('lm'), roles: ['manager'], givenName: 'Lea', familyName: 'Lang'}, {username: P('mm'), roles: ['manager']}]});
        const sub = await app.api.createSubmission({tag: P('s'), context: P('m'), submitter: P('au'), title: `Initials check ${t}`, submitted: true});
        let pubSub = null;
        if (!isOJS) pubSub = await app.api.createSubmission({tag: P('p'), context: P('m'), submitter: P('au'), title: `Published probe ${t}`, submitted: true, published: true});
        st = {t, M: P('m'), F: P('f'), L: P('l'), H: P('h'), ids: {M: M.contextId, F: F.contextId, L: L.contextId},
            sub: sub.submissionId, pub: pubSub ? pubSub.submissionId : null,
            u: {mm: P('mm'), m2: P('m2'), me: isOPS ? null : P('me'), au: P('au'), fm: P('fm'), lm: P('lm')}};
        save();
        step('seeded', st);
    }
    const U = st.u;
    const t = st.t;

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message(), url: page.url()}); await d.accept().catch(() => {}); });
    const as = async (user) => { if (user) await signIn(page, user); else await signOut(page).catch(() => {}); };
    const phase = async (name, fn) => {
        if (!on(name)) return;
        step(`phase ${name} start`);
        try { await fn(); } catch (e) { summary[`${name}Error`] = String(e.stack || e).slice(0, 1500); step(`phase ${name} FAILED`, {e: String(e.message || e).slice(0, 400)}); await shot(page, `err-${name}`).catch(() => {}); }
        step(`phase ${name} end`);
    };

    try {
        // ---- fresh: F on arrival, the refusals (td4, A3) -----------------------------
        await phase('fresh', async () => {
            const o = {};
            await as(U.fm);
            let f = await openTab(page, app, st.F, 'masthead');
            o.tabs = await page.getByRole('tab').allInnerTexts();
            o.arrival = await formShape(page, f);
            await snap(page, 'f01-f-masthead-arrival', {shape: o.arrival, tabs: o.tabs});
            await loc(page, 'Settings › Journal › Masthead: the form\'s "Save"', f.getByRole('button', {name: 'Save', exact: true}));
            await loc(page, 'Masthead: "Journal Title" box (primary language)', page.locator('[id^="masthead-name-control"]').first());
            // 1. as it stands (initials and country empty)
            o.save0 = await pressSave(page, f);
            await snap(page, 'f02-f-masthead-save-as-is', {save: o.save0});
            await loc(page, 'Masthead: "Jump to next error" button', f.getByRole('button', {name: 'Jump to next error'}));
            // 2. title emptied as well
            const nameBox = page.locator('[id^="masthead-name-control"]').first();
            o.nameBoxId = await nameBox.getAttribute('id');
            const oldName = await nameBox.inputValue();
            await nameBox.fill('');
            await sleep(300);
            o.afterEmptyTitle = await refusalState(page, f);
            o.save1 = await pressSave(page, f);
            await snap(page, 'f03-f-masthead-three-empty', {save: o.save1});
            // Jump to next error: which box gets the focus
            const jump = f.getByRole('button', {name: 'Jump to next error'});
            if (await jump.count()) {
                await jump.click(); await sleep(400);
                o.jump1 = await page.evaluate(() => (document.activeElement ? {id: document.activeElement.id, tag: document.activeElement.tagName} : null));
                await jump.click().catch(() => {}); await sleep(400);
                o.jump2 = await page.evaluate(() => (document.activeElement ? {id: document.activeElement.id, tag: document.activeElement.tagName} : null));
            }
            // 3. initials and country given, title still empty: one error
            await page.locator('[id^="masthead-acronym-control"]').first().fill('K2F');
            o.afterInitials = await refusalState(page, f);
            await selectCountry(f, 'Iceland');
            o.afterCountry = await refusalState(page, f);
            o.save2 = await pressSave(page, f);
            await snap(page, 'f04-f-masthead-one-empty', {save: o.save2});
            // 4. the flagged box changed: Save un-grayed?
            await nameBox.fill(oldName);
            await sleep(300);
            o.afterTitleTyped = await refusalState(page, f);
            // 5. [OJS] values the server refuses
            if (isOJS) {
                await page.locator('[id^="masthead-onlineIssn-control"]').first().fill('1234-5678');
                await page.locator('[id^="masthead-printIssn-control"]').first().fill('10501234');
                await page.locator('[id^="masthead-publisherUrl-control"]').first().fill('example.org');
                o.save3 = await pressSave(page, f);
                await snap(page, 'f05-f-masthead-server-refusal', {save: o.save3});
                o.afterRefusalDisabled = o.save3.saveDisabled;
                // the other end: a check digit X, lowercase x
                await page.locator('[id^="masthead-onlineIssn-control"]').first().fill('0378-5955');
                await page.locator('[id^="masthead-printIssn-control"]').first().fill('1050-124x');
                await page.locator('[id^="masthead-publisherUrl-control"]').first().fill('https://example.org');
                o.save4 = await pressSave(page, f);
                await snap(page, 'f06-f-masthead-lower-x', {save: o.save4});
                await page.locator('[id^="masthead-printIssn-control"]').first().fill('1050-124X');
                o.save5 = await pressSave(page, f);
                await snap(page, 'f07-f-masthead-valid', {save: o.save5});
            } else {
                o.save5 = await pressSave(page, f);
                await snap(page, 'f07-f-masthead-valid', {save: o.save5});
            }
            // reload: shown again
            f = await openTab(page, app, st.F, 'masthead');
            o.reloaded = await formShape(page, f);
            await snap(page, 'f08-f-masthead-reloaded', {shape: o.reloaded});

            // ---- Contact on arrival, A3
            f = await openTab(page, app, st.F, 'contact');
            o.contactArrival = await formShape(page, f);
            await snap(page, 'f10-f-contact-arrival', {shape: o.contactArrival});
            // A3: the principal phone alone
            await page.locator('#contact-contactPhone-control').fill('+1 555 0142');
            o.cSave1 = await pressSave(page, f);
            await snap(page, 'f11-f-contact-phone-only', {save: o.cSave1});
            // td4: an invalid principal email while the support contact is empty
            await page.locator('#contact-contactEmail-control').fill('not-an-email');
            o.cSave2 = await pressSave(page, f);
            await snap(page, 'f12-f-contact-bad-email-no-support', {save: o.cSave2});
            // support filled: the server's answer to the invalid email
            await page.locator('#contact-supportName-control').fill('Fay Support');
            await page.locator('#contact-supportEmail-control').fill('also-not-an-email');
            o.cSave3 = await pressSave(page, f);
            await snap(page, 'f13-f-contact-server-refusal', {save: o.cSave3});
            await page.locator('#contact-contactEmail-control').fill(`${t}fprincipal@mail.test`);
            await page.locator('#contact-supportEmail-control').fill(`${t}fsupport@mail.test`);
            o.cSave4 = await pressSave(page, f);
            await snap(page, 'f14-f-contact-saved', {save: o.cSave4});
            // the other end of "required": the principal name emptied
            await page.locator('#contact-contactName-control').fill('');
            await page.locator('#contact-supportPhone-control').fill('+1 555 0143');
            o.cSave5 = await pressSave(page, f);
            await snap(page, 'f15-f-contact-principal-name-empty', {save: o.cSave5});
            summary.fresh = o;
        });

        // ---- create: the Site Administrator creates a journal (A3) --------------------
        await phase('create', async () => {
            const o = {};
            await as('admin');
            await page.goto(app.url('/index.php/index/admin/contexts'));
            await idle(page);
            await snap(page, 'h01-admin-hosted');
            const create = page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first();
            o.createLabel = flat(await create.innerText().catch(() => ''), 80);
            await create.click();
            await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(500);
            const cf = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first();
            const dlg = cf;
            o.shape = await formShape(page, cf);
            await snap(page, 'h02-admin-create-form', {shape: o.shape});
            await dlg.locator('[id^="context-name-control"]').first().fill(`U07 K2 H ${t}`);
            const acr = dlg.locator('[id^="context-acronym-control"]').first();
            if (await acr.count()) await acr.fill('K2H');
            const cn = dlg.locator('[id^="context-contactName-control"]').first();
            if (await cn.count()) await cn.fill('Hal Principal');
            const ce = dlg.locator('[id^="context-contactEmail-control"]').first();
            if (await ce.count()) await ce.fill(`${t}hal@mail.test`);
            const cc = dlg.locator('select[id^="context-country-control"]').first();
            if (await cc.count()) await cc.selectOption({label: 'Iceland'});
            await dlg.locator('[id^="context-urlPath-control"]').first().fill(st.H);
            // a supported language if the form asks (the first offered)
            await cf.locator('input[type="checkbox"][value="en"]').first().check().catch((e) => { o.langError = String(e.message || e).slice(0, 200); });
            await cf.locator('input[type="radio"][value="en"]').first().check().catch((e) => { o.primError = String(e.message || e).slice(0, 200); });
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await cf.getByRole('button', {name: 'Save', exact: true}).click();
            const resp = await w;
            o.createStatus = resp ? resp.status() : null;
            if (resp && resp.status() >= 400) { try { o.createBody = await resp.json(); } catch { /* */ } }
            await sleep(2000); await idle(page).catch(() => {});
            o.afterCreateUrl = page.url();
            await snap(page, 'h03-admin-created', {status: o.createStatus});
            if (o.createStatus && o.createStatus < 400) {
                st.Hcreated = true; save();
                let f = await openTab(page, app, st.H, 'contact');
                o.contact = await formShape(page, f);
                await snap(page, 'h04-h-contact-arrival', {shape: o.contact});
                await page.locator('#contact-contactPhone-control').fill('+1 555 0144');
                o.phoneSave = await pressSave(page, f);
                await snap(page, 'h05-h-contact-phone-only', {save: o.phoneSave});
                f = await openTab(page, app, st.H, 'masthead');
                o.masthead = await formShape(page, f);
                await snap(page, 'h06-h-masthead-arrival', {shape: o.masthead});
            }
            summary.create = o;
        });

        // ---- levels: both tabs as each level that opens them (sweep) ------------------
        await phase('levels', async () => {
            const o = {};
            const levels = [['manager', U.mm], ['editor', U.me], ['admin', 'admin']].filter(([, u]) => u);
            for (const [lv, user] of levels) {
                await as(user);
                o[lv] = {};
                for (const which of ['masthead', 'contact']) {
                    try {
                        const f = await openTab(page, app, st.M, which);
                        o[lv][which] = await formShape(page, f);
                        o[lv][which].pageTabs = await page.getByRole('tab').allInnerTexts();
                        o[lv][which].h1 = await page.locator('main h1').allInnerTexts().catch(() => []);
                        await snap(page, `l-${lv}-${which}`, {shape: o[lv][which]});
                    } catch (e) {
                        o[lv][which] = {error: String(e.message || e).slice(0, 300), url: page.url()};
                        await snap(page, `l-${lv}-${which}-error`);
                    }
                }
            }
            summary.levels = o;
        });

        // ---- ojsissue: an issue and an article on M (OJS) ----------------------------
        await phase('ojsissue', async () => {
            if (!isOJS || st.ojsPub) return;
            const o = {};
            await as(U.mm);
            await page.goto(cUrl(app, st.M, '/manageIssues'));
            await idle(page);
            await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
            const fm = page.locator('form#issueForm');
            await fm.waitFor({state: 'visible', timeout: T});
            await fm.locator('input[name="volume"]').fill('1');
            await fm.locator('input[name="number"]').fill('1');
            await fm.locator('input[name="year"]').fill('2026');
            await fm.locator('input[name="title[en]"]').fill(`Issue ${t}`);
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /\/update-issue/.test(r.url()), {timeout: T});
            await fm.getByRole('button', {name: 'Save', exact: true}).click();
            o.issueCreate = (await w).status();
            await idle(page);
            const sub = await app.api.createSubmission({tag: `${t}p`, context: st.M, submitter: U.au, title: `Published probe ${t}`, submitted: true, published: true, issue: {volume: 1, number: 1, year: 2026}});
            st.pub = sub.submissionId; save();
            await page.goto(cUrl(app, st.M, '/manageIssues'));
            await idle(page);
            const row = page.locator('tr.gridRow').filter({hasText: `Issue ${t}`});
            await row.first().waitFor({state: 'visible', timeout: T});
            await row.first().locator('a.show_extras').click();
            await page.getByRole('link', {name: 'Publish Issue', exact: true}).click();
            const dlg = page.locator('[role="dialog"]:visible').last();
            await dlg.locator('#sendIssueNotification').waitFor({state: 'visible', timeout: T});
            await dlg.locator('#sendIssueNotification').uncheck().catch(() => {});
            const w2 = page.waitForResponse((r) => r.request().method() === 'POST' && /\/publish-issue/.test(r.url()), {timeout: T});
            await dlg.getByRole('button', {name: 'OK', exact: true}).click();
            o.publish = (await w2).status();
            await idle(page);
            await snap(page, 'i01-m-issue-published', o);
            st.ojsPub = true; save();
            summary.ojsissue = o;
        });

        // ---- rename: title, initials, summary (td8, Rules 7–8, 375–377) ---------------
        await phase('rename', async () => {
            const o = {};
            const home = cUrl(app, st.M, '/index');
            const pages = [['home', ''], ['about', '/about'], ['contact', '/about/contact'], ['masthead', '/about/editorialMasthead'], ['history', '/about/editorialHistory'], ['privacy', '/about/privacy'], ['submissions', '/about/submissions'], ['software', '/about/aboutThisPublishingSystem'], ['search', '/search/search'], ...(isOJS ? [['archive', '/issue/archive']] : []), ...(isOMP ? [['catalog', '/catalog']] : [])];
            const pubPath = st.pub ? (isOJS ? `/article/view/${st.pub}` : isOMP ? `/catalog/book/${st.pub}` : `/preprint/view/${st.pub}`) : null;
            if (pubPath) pages.push(['item', pubPath]);
            await as(null);
            o.before = {};
            for (const [k, p] of pages) {
                const r = await pub(page, cUrl(app, st.M, p), `r01-before-${k}`);
                o.before[k] = {status: r.status, title: r.title, siteName: r.siteName, h1: r.h1};
            }
            // Tasks panel before: mm (two journals), m2 (one journal), admin
            await as(U.mm);
            o.tasksBefore = {mm: await tasksPanel(page, app, st.M, 'r02-tasks-mm-before')};
            await as(U.m2);
            o.tasksBefore.m2 = await tasksPanel(page, app, st.M, 'r03-tasks-m2-before');
            // silence baseline: mail to the journal's accounts, the managers' bells
            const since = new Date(Date.now() - 1000);
            o.bellBefore = {m2: await bellName(page, app, st.M)};
            await as(U.mm);
            o.bellBefore.mm = await bellName(page, app, st.M);
            // the change
            const f = await openTab(page, app, st.M, 'masthead');
            o.beforeShape = await formShape(page, f);
            await page.locator('[id^="masthead-name-control"]').first().fill(`Renamed Probe Journal ${t}`);
            await page.locator('[id^="masthead-acronym-control"]').first().fill('RPJ');
            await selectCountry(f, 'Iceland');
            o.summaryTyped = await mceSet(page, 'masthead-description-control-en', `Probe summary ${t}.`);
            o.save = await pressSave(page, f);
            await snap(page, 'r04-m-masthead-renamed', {save: o.save});
            o.bellAfter = {mm: await bellName(page, app, st.M)};
            await as(U.m2);
            o.bellAfter.m2 = await bellName(page, app, st.M);
            // after: every public page on its next load
            await as(null);
            o.after = {};
            for (const [k, p] of pages) {
                const r = await pub(page, cUrl(app, st.M, p), `r05-after-${k}`, {markers: [`Probe summary ${t}`], shotIt: ['home', 'about'].includes(k)});
                o.after[k] = {status: r.status, title: r.title, siteName: r.siteName, h1: r.h1, summaryHit: r.hits && r.hits[`Probe summary ${t}`]};
            }
            await loc(page, 'Public header: the journal name text', page.locator('.pkp_site_name'));
            // the site's list of journals
            const site = await pub(page, app.url('/index.php/index'), 'r06-site-index', {markers: [`Renamed Probe Journal ${t}`, `Probe summary ${t}`, `U07 K2 M ${t}`]});
            o.siteIndex = {status: site.status, title: site.title, hits: site.hits};
            o.siteEntry = await page.evaluate((name) => {
                const all = [...document.querySelectorAll('.journals li, .presses li, .servers li, ul li, .body li')];
                const li = all.find((e) => e.innerText.includes(name));
                return li ? li.innerText.replace(/\s+/g, ' ').trim().slice(0, 500) : null;
            }, `Renamed Probe Journal ${t}`);
            // Tasks panel after
            await as(U.mm);
            o.tasksAfter = {mm: await tasksPanel(page, app, st.M, 'r07-tasks-mm-after')};
            await as(U.m2);
            o.tasksAfter.m2 = await tasksPanel(page, app, st.M, 'r08-tasks-m2-after');
            // silence: a positive control (a password reset to the author), then the managers' mail
            await lostPassword(page, app, st.M, `${U.au}@mail.test`, 'r09-lostpassword-control');
            o.control = await waitMail(app, `${U.au}@mail.test`, since);
            o.mailAfterSave = {};
            for (const u of [U.mm, U.m2, U.me, U.au].filter(Boolean)) o.mailAfterSave[u] = (await mailsSince(app, `${u}@mail.test`, since)).map((m) => m.subject);
            // the theme option: the summary on the home page, both ends
            await as(U.mm);
            await page.goto(cUrl(app, st.M, '/management/settings/website'));
            await idle(page);
            await page.locator('#appearance-button').first().click();
            await idle(page);
            const panel = page.locator('[role="tabpanel"]#appearance').first();
            const themeTab = panel.getByRole('tab', {name: 'Theme', exact: true});
            if (await themeTab.count()) { await themeTab.first().click(); await idle(page); }
            const box = page.getByRole('checkbox', {name: /Show the (journal|press|server) summary on the homepage\./});
            o.themeBoxCount = await box.count();
            if (o.themeBoxCount) {
                o.themeBoxChecked = await box.first().isChecked();
                await snap(page, 'r10-appearance-theme', {checked: o.themeBoxChecked});
                await box.first().check();
                const tf = page.locator('form').filter({has: box.first()}).first();
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await tf.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                o.themeSave = r ? r.status() : null;
                await sleep(800);
                await as(null);
                const h = await pub(page, cUrl(app, st.M, ''), 'r11-home-summary-on', {markers: [`Probe summary ${t}`], shotIt: true});
                o.homeSummaryOn = h.hits;
            }
            summary.rename = o;
        });

        // ---- hidden: fields readers never see (Rule 10, OPS2) --------------------------
        await phase('hidden', async () => {
            const o = {};
            const marks = {
                abbr: `AbbrMark${t}`, publisher: `PublisherMark${t}`, url: `https://publisher${t}.example.org`, location: `LocationMark${t}`,
                code: `CodeMark${t}`, sponsor: `SponsorMark${t}`, onlineIssn: '0378-5955', printIssn: '1050-124X', country: 'Iceland',
            };
            await as(U.mm);
            let f = await openTab(page, app, st.M, 'masthead');
            const fillIf = async (sel, v) => { const l = page.locator(sel).first(); if (await l.count()) { await l.fill(v); return true; } return false; };
            o.filled = {};
            if (isOJS) {
                o.filled.abbr = await fillIf('[id^="masthead-abbreviation-control"]', marks.abbr);
                o.filled.publisher = await fillIf('[id^="masthead-publisherInstitution-control"]', marks.publisher);
                o.filled.url = await fillIf('[id^="masthead-publisherUrl-control"]', marks.url);
                o.filled.onlineIssn = await fillIf('[id^="masthead-onlineIssn-control"]', marks.onlineIssn);
                o.filled.printIssn = await fillIf('[id^="masthead-printIssn-control"]', marks.printIssn);
            }
            if (isOMP) {
                o.filled.publisher = await fillIf('[id^="masthead-publisher-control"]', marks.publisher);
                o.filled.location = await fillIf('[id^="masthead-location-control"]', marks.location);
                const ct = page.locator('select[id^="masthead-codeType-control"]').first();
                if (await ct.count()) { await ct.selectOption({label: 'ISNI (16)'}); o.filled.codeType = true; }
                o.filled.code = await fillIf('[id^="masthead-codeValue-control"]', marks.code);
            }
            if (isOPS) {
                o.filled.abbr = await fillIf('[id^="masthead-abbreviation-control"]', marks.abbr);
                o.filled.sponsor = await fillIf('[id^="masthead-sponsoringOrganization-control"]', marks.sponsor);
            }
            await selectCountry(f, marks.country);
            o.save = await pressSave(page, f);
            await snap(page, 'x01-m-masthead-hidden-saved', {save: o.save});
            f = await openTab(page, app, st.M, 'masthead');
            o.reloaded = await formShape(page, f);
            await snap(page, 'x02-m-masthead-hidden-reloaded', {shape: o.reloaded});
            // every public page, signed out
            const mk = Object.values(marks);
            const pages = [['home', ''], ['about', '/about'], ['contact', '/about/contact'], ['masthead', '/about/editorialMasthead'], ['history', '/about/editorialHistory'], ['privacy', '/about/privacy'], ['submissions', '/about/submissions'], ['software', '/about/aboutThisPublishingSystem'], ['search', '/search/search'],
                ...(isOPS ? [] : [['readers', '/information/readers'], ['authors', '/information/authors'], ['librarians', '/information/librarians']]),
                ...(isOJS ? [['archive', '/issue/archive'], ['current', '/issue/current']] : []), ...(isOMP ? [['catalog', '/catalog'], ['newReleases', '/catalog/newReleases']] : []),
                ...(isOPS ? [['preprints', '/preprints']] : [])];
            if (st.pub) pages.push(['item', isOJS ? `/article/view/${st.pub}` : isOMP ? `/catalog/book/${st.pub}` : `/preprint/view/${st.pub}`]);
            await as(null);
            o.pages = {};
            for (const [k, p] of pages) {
                const r = await pub(page, cUrl(app, st.M, p), `x03-pub-${k}`, {markers: mk, shotIt: k === 'item'});
                const hits = Object.fromEntries(Object.entries(r.hits || {}).filter(([, v]) => v.visible || v.html));
                o.pages[k] = {status: r.status, url: r.url, title: r.title, hits};
            }
            // the item page's "How to Cite" formats, each pressed
            if (st.pub) {
                await page.goto(cUrl(app, st.M, isOJS ? `/article/view/${st.pub}` : isOMP ? `/catalog/book/${st.pub}` : `/preprint/view/${st.pub}`));
                await idle(page);
                let btn = page.locator('button.citation_formats_button');
                o.citeButton = await btn.count();
                if (!o.citeButton) {
                    await as(U.mm);
                    await page.goto(cUrl(app, st.M, '/management/settings/website'));
                    await idle(page);
                    await page.locator('#plugins-button').first().click();
                    await idle(page); await sleep(800);
                    const row = page.locator('tr.gridRow').filter({hasText: 'Citation Style Language'}).first();
                    await row.waitFor({timeout: T});
                    const box = row.locator('input[type="checkbox"]').first();
                    o.cslEnabledBefore = await box.isChecked();
                    if (!o.cslEnabledBefore) { await box.click(); await sleep(1500); await idle(page); }
                    o.cslEnabledAfter = await box.isChecked();
                    await snap(page, 'x03b-plugins-csl', {before: o.cslEnabledBefore, after: o.cslEnabledAfter});
                    await as(null);
                    const it = await pub(page, cUrl(app, st.M, isOJS ? `/article/view/${st.pub}` : isOMP ? `/catalog/book/${st.pub}` : `/preprint/view/${st.pub}`), 'x03c-pub-item-csl', {markers: mk, shotIt: true});
                    o.itemWithCsl = {status: it.status, hits: Object.fromEntries(Object.entries(it.hits || {}).filter(([, v]) => v.visible || v.html))};
                    btn = page.locator('button.citation_formats_button');
                    o.citeButton = await btn.count();
                }
                o.cite = {};
                if (o.citeButton) {
                    o.cite.default = flat(await page.locator('#citationOutput').innerText().catch(() => ''), 600);
                    const links = page.locator('#cslCitationFormats ul.citation_formats_styles').first().locator('a');
                    const n = await links.count();
                    for (let i = 0; i < n; i++) {
                        await btn.click().catch(() => {});
                        await sleep(200);
                        const l = links.nth(i);
                        const name = flat(await l.innerText(), 80);
                        const w = page.waitForResponse((r) => /citationstylelanguage\/get/.test(r.url()), {timeout: 10_000}).catch(() => null);
                        await l.click().catch(() => {});
                        await w; await sleep(400);
                        const out = flat(await page.locator('#citationOutput').innerText().catch(() => ''), 600);
                        o.cite[name] = {out, hits: mk.filter((m) => out.toLowerCase().includes(m.toLowerCase()))};
                    }
                    await snap(page, 'x04-item-citations', {cite: o.cite});
                }
            }
            // the site's list of journals
            const s = await pub(page, app.url('/index.php/index'), 'x05-site-index', {markers: mk});
            o.siteHits = Object.fromEntries(Object.entries(s.hits || {}).filter(([, v]) => v.visible || v.html));
            summary.hidden = o;
        });

        // ---- contact: the Contact tab, the Contact page, the senders (Rule 9, 359–369) ----
        await phase('contact', async () => {
            const o = {};
            const auMail = `${U.au}@mail.test`;
            // sender before the change
            const since0 = new Date(Date.now() - 1000);
            await lostPassword(page, app, st.M, auMail, 'c01-lostpassword-before');
            o.before = await waitMail(app, auMail, since0);
            await as(U.mm);
            let f = await openTab(page, app, st.M, 'contact');
            o.arrival = await formShape(page, f);
            await snap(page, 'c02-m-contact-arrival', {shape: o.arrival});
            const P = {name: 'Pat Principal', email: `${t}pat@mail.test`, phone: '+1 555 0100', aff: 'Principal University', addr: '1 Probe Street\nProbe City\nPC 12345',
                sname: 'Sam Support', semail: `${t}sam@mail.test`, sphone: '+1 555 0199'};
            await page.locator('#contact-contactName-control').fill(P.name);
            await page.locator('#contact-contactEmail-control').fill(P.email);
            await page.locator('#contact-contactPhone-control').fill(P.phone);
            await page.locator('[id^="contact-contactAffiliation-control"]').first().fill(P.aff);
            await page.locator('#contact-mailingAddress-control').fill(P.addr);
            await page.locator('#contact-supportName-control').fill(P.sname);
            await page.locator('#contact-supportEmail-control').fill(P.semail);
            await page.locator('#contact-supportPhone-control').fill(P.sphone);
            const since1 = new Date(Date.now() - 1000);
            o.save = await pressSave(page, f);
            await snap(page, 'c03-m-contact-saved', {save: o.save});
            for (const [k, sel] of [['principal name', '#contact-contactName-control'], ['principal email', '#contact-contactEmail-control'], ['mailing address', '#contact-mailingAddress-control'], ['support name', '#contact-supportName-control']]) {
                await loc(page, `Contact tab: ${k}`, page.locator(sel));
            }
            // the public Contact page
            await as(null);
            const cp = await pub(page, cUrl(app, st.M, '/about/contact'), 'c04-m-contact-page', {shotIt: true});
            o.page = {status: cp.status, title: cp.title, mainText: cp.mainText};
            o.structure = await page.evaluate(() => {
                const p = document.querySelector('.page_contact') || document.querySelector('.pkp_structure_main');
                const order = [...p.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim()).map((e) => `${e.tagName}.${e.className}: ${e.innerText.trim()}`).slice(0, 60);
                return {
                    headings: [...p.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ':' + h.innerText.trim()),
                    addressHtml: (p.querySelector('.address') || {}).innerHTML || null,
                    primaryHtml: (p.querySelector('.contact.primary') || {}).innerHTML?.replace(/\s+/g, ' ') || null,
                    supportHtml: (p.querySelector('.contact.support') || {}).innerHTML?.replace(/\s+/g, ' ') || null,
                    order,
                };
            });
            record('c05-m-contact-structure', o.structure);
            // the save's silence: no mail to the new contacts or the managers
            // sender after the change (also the positive control for the silence read)
            const since2 = new Date(Date.now() - 1000);
            await lostPassword(page, app, st.M, auMail, 'c06-lostpassword-after');
            o.after = await waitMail(app, auMail, since2);
            if (o.after[0]) {
                const full = await app.mail.fullMessage(o.after[0].id);
                o.afterText = (full.Text || '').slice(0, 2000);
                o.afterFromHeader = full.From;
                o.afterReplyTo = full.ReplyTo;
            }
            if (o.before[0]) {
                const full0 = await app.mail.fullMessage(o.before[0].id);
                o.beforeText = (full0.Text || '').slice(0, 2000);
            }
            // a journal email after the change: a second publication (the seed publishes through the app's own service)
            try {
                const since4 = new Date(Date.now() - 1000);
                const spec = {tag: `${t}q`, context: st.M, submitter: U.au, title: `After contact change ${t}`, submitted: true, published: true, ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {})};
                await app.api.createSubmission(spec);
                o.publishedMail = await waitMail(app, auMail, since4);
            } catch (e) { o.publishedMailError = String(e.message || e).slice(0, 400); }
            o.silence = {};
            for (const a of [P.email, P.semail, `${U.mm}@mail.test`, `${U.m2}@mail.test`]) o.silence[a] = (await mailsSince(app, a, since1)).map((m) => m.subject);
            // the technical support contact as the account-validation sender (the +90 server)
            const v = app.variant('validation');
            const regUser = `${t}reg`;
            const regMail = `${t}reg@mail.test`;
            try {
                await page.goto(`${v}/index.php/${st.M}/user/register`);
                await idle(page).catch(() => {});
                const fr = page.locator('form#register');
                await fr.locator('input[name="givenName"]').fill('Reggie');
                await fr.locator('input[name="familyName"]').fill('Register');
                const aff = fr.locator('input[name="affiliation"]'); if (await aff.count()) await aff.fill('Probe U');
                const ctry = fr.locator('select[name="country"]'); if (await ctry.count()) await ctry.selectOption({label: 'Canada'});
                await fr.locator('input[name="email"]').fill(regMail);
                await fr.locator('input[name="username"]').fill(regUser);
                await fr.locator('input[name="password"]').fill(`${regUser}${regUser}`);
                await fr.locator('input[name="password2"]').fill(`${regUser}${regUser}`);
                const pc = fr.locator('input[name="privacyConsent"]'); if (await pc.count()) await pc.check();
                await page.waitForFunction(() => !customElements || !document.querySelector('altcha-widget') || !!customElements.get('altcha-widget'), undefined, {timeout: 30_000}).catch(() => {});
                const since3 = new Date(Date.now() - 1000);
                await fr.locator('button.submit').click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {});
                await snap(page, 'c07-register-validation');
                o.validation = await waitMail(app, regMail, since3, {ms: 30_000});
            } catch (e) { o.validationError = String(e.message || e).slice(0, 400); }
            await signOut(page, {origin: v}).catch(() => {});
            summary.contact = o;
        });

        // ---- mail2: a journal email after the contact change (OJS: Publish Issue) ----------------
        await phase('mail2', async () => {
            if (!isOJS) return;
            const o = {};
            const auMail = `${U.au}@mail.test`;
            await as(U.mm);
            await page.goto(cUrl(app, st.M, '/manageIssues'));
            await idle(page);
            await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
            const fm = page.locator('form#issueForm');
            await fm.waitFor({state: 'visible', timeout: T});
            await fm.locator('input[name="volume"]').fill('1');
            await fm.locator('input[name="number"]').fill('2');
            await fm.locator('input[name="year"]').fill('2026');
            await fm.locator('input[name="title[en]"]').fill(`Second issue ${t}`);
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /\/update-issue/.test(r.url()), {timeout: T});
            await fm.getByRole('button', {name: 'Save', exact: true}).click();
            o.issueCreate = (await w).status();
            await idle(page);
            await app.api.createSubmission({tag: `${t}r`, context: st.M, submitter: U.au, title: `After contact change ${t}`, submitted: true, published: true, issue: {volume: 1, number: 2, year: 2026}});
            await page.goto(cUrl(app, st.M, '/manageIssues'));
            await idle(page);
            const row = page.locator('tr.gridRow').filter({hasText: `Second issue ${t}`});
            await row.first().waitFor({state: 'visible', timeout: T});
            await row.first().locator('a.show_extras').click();
            await page.getByRole('link', {name: 'Publish Issue', exact: true}).click();
            const dlg = page.locator('[role="dialog"]:visible').last();
            await dlg.locator('#sendIssueNotification').waitFor({state: 'visible', timeout: T});
            await dlg.locator('#sendIssueNotification').uncheck().catch(() => {});
            const since = new Date();
            const w2 = page.waitForResponse((r) => r.request().method() === 'POST' && /\/publish-issue/.test(r.url()), {timeout: T});
            await dlg.getByRole('button', {name: 'OK', exact: true}).click();
            o.publish = (await w2).status();
            await idle(page);
            await snap(page, 'm01-m-second-issue-published', o);
            o.mail = (await waitMail(app, auMail, since, {ms: 30_000})).filter((m) => m.subject !== 'Password Reset Confirmation');
            await as(U.mm);
            const f = await openTab(page, app, st.M, 'contact');
            o.contactNow = {name: await page.locator('#contact-contactName-control').inputValue(), email: await page.locator('#contact-contactEmail-control').inputValue()};
            summary.mail2 = o;
        });

        // ---- toast: how long the server refusal's notice stays -------------------------------
        await phase('toast', async () => {
            const o = {};
            await as(U.fm);
            const f = await openTab(page, app, st.F, 'contact');
            await page.locator('#contact-supportEmail-control').fill('still-not-an-email');
            o.save = await pressSave(page, f);
            const toast = page.getByText(/^The form was not saved because/);
            o.at0 = await toast.count();
            await sleep(10_000);
            o.at10 = await toast.count();
            await sleep(20_000);
            o.at30 = await toast.count();
            await snap(page, 't01-f-contact-refusal-after-30s', o);
            await page.locator('#contact-supportEmail-control').fill(`${t}fsupport@mail.test`);
            o.save2 = await pressSave(page, f);
            o.afterSaved = await toast.count();
            await snap(page, 't02-f-contact-saved-after-refusal', {afterSaved: o.afterSaved});
            summary.toast = o;
        });

        // ---- history: the Editorial History text; the header logo (Rule 7's other end) ---------
        await phase('history', async () => {
            const o = {};
            await as(U.mm);
            let f = await openTab(page, app, st.M, 'masthead');
            o.typed = await mceSet(page, 'masthead-editorialHistory-control-en', `History text ${t}`);
            o.save = await pressSave(page, f);
            await as(null);
            const h = await pub(page, cUrl(app, st.M, '/about/editorialHistory'), 'y01-m-history-page', {markers: [`History text ${t}`], shotIt: true});
            o.page = {status: h.status, h1: h.h1, main: h.mainText.slice(-600), hit: h.hits[`History text ${t}`]};
            o.lastBlock = await page.evaluate(() => {
                const p = document.querySelector('.page') || document.querySelector('.pkp_structure_main');
                const kids = [...p.children].filter((e) => e.innerText && e.innerText.trim());
                return kids.slice(-2).map((e) => `${e.tagName}.${e.className}: ${e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)}`);
            });
            // the header logo
            await as(U.mm);
            await page.goto(cUrl(app, st.M, '/management/settings/website'));
            await idle(page);
            await page.locator('#appearance-button').first().click();
            await idle(page); await sleep(500);
            await page.locator('[role="tabpanel"]#appearance').first().getByRole('tab', {name: 'Setup', exact: true}).first().click();
            await idle(page); await sleep(500);
            const input = page.locator('input[type=file][id*="pageHeaderLogoImage"]').first();
            o.logoInput = await input.count();
            if (o.logoInput) {
                const png = path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/profile-image-400.png`);
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await input.setInputFiles(png);
                const r = await up; o.upload = r ? r.status() : null;
                await idle(page); await sleep(800);
                const lf = page.locator('[role="tabpanel"]#appearance').getByRole('tabpanel', {name: 'Setup'});
                const w = page.waitForResponse((x) => /\/api\/v1\/contexts/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await lf.getByRole('button', {name: 'Save', exact: true}).click();
                const r2 = await w; o.logoSave = r2 ? r2.status() : null;
                await sleep(800);
                await as(null);
                const home = await pub(page, cUrl(app, st.M, ''), 'y02-m-home-with-logo', {shotIt: true});
                o.home = {title: home.title, siteName: home.siteName, siteNameHtml: home.siteNameHtml};
                const ab = await pub(page, cUrl(app, st.M, '/about'), 'y03-m-about-with-logo');
                o.about = {title: ab.title, siteName: ab.siteName, siteNameHtml: ab.siteNameHtml};
            }
            summary.history = o;
        });

        // ---- lang: per-language boxes and the French page (td9, Rule 11, bullet 12) -----
        await phase('lang', async () => {
            const o = {};
            await as(U.lm);
            let f = await openTab(page, app, st.L, 'masthead');
            o.mastheadShape = await formShape(page, f);
            await snap(page, 'g01-l-masthead-two-languages', {shape: o.mastheadShape});
            o.aboutAreas = await f.locator('textarea[id^="masthead-about-control"]').evaluateAll((els) => els.map((e) => e.id));
            // the French boxes: shown on arrival, or behind the "French" button?
            const frToggle = f.getByRole('button', {name: 'French', exact: true});
            o.frToggleCount = await frToggle.count();
            o.frVisibleBefore = await page.locator('[id="masthead-name-control-fr_CA"]').isVisible().catch(() => null);
            if (o.frToggleCount) {
                await loc(page, 'Masthead (two form languages): the "French" button', frToggle.first());
                o.frTogglePressed0 = await frToggle.first().getAttribute('aria-pressed').catch(() => null);
                await frToggle.first().click(); await sleep(500);
                o.frTogglePressed1 = await frToggle.first().getAttribute('aria-pressed').catch(() => null);
            }
            o.frVisibleAfter = await page.locator('[id="masthead-name-control-fr_CA"]').isVisible().catch(() => null);
            await snap(page, 'g01b-l-masthead-french-shown', {frVisibleBefore: o.frVisibleBefore, frVisibleAfter: o.frVisibleAfter});
            // English only; the French title box empty (required in the primary language only?)
            const frName = page.locator('[id="masthead-name-control-fr_CA"]');
            o.frNameBefore = (await frName.count()) ? await frName.inputValue() : null;
            if (await frName.count()) await frName.fill('');
            const frAcr = page.locator('[id="masthead-acronym-control-fr_CA"]');
            o.frAcrBefore = (await frAcr.count()) ? await frAcr.inputValue() : null;
            if (await frAcr.count()) await frAcr.fill('');
            await mceSet(page, 'masthead-about-control-en', 'English about text');
            await selectCountry(f, 'Iceland');
            o.save1 = await pressSave(page, f);
            await snap(page, 'g02-l-masthead-english-only', {save: o.save1});
            await as(null);
            const fr1 = await pub(page, cUrl(app, st.L, '/fr_CA/about'), 'g03-l-about-french-empty', {markers: ['English about text', 'Texte français'], shotIt: true});
            o.frPage1 = {status: fr1.status, url: fr1.url, h1: fr1.h1, main: fr1.mainText, hits: fr1.hits, title: fr1.title};
            await as(U.lm);
            f = await openTab(page, app, st.L, 'masthead');
            o.frVisibleOnReturn = await page.locator('[id="masthead-name-control-fr_CA"]').isVisible().catch(() => null);
            if (!o.frVisibleOnReturn) await f.getByRole('button', {name: 'French', exact: true}).first().click().catch(() => {});
            await sleep(400);
            await mceSet(page, 'masthead-about-control-fr_CA', 'Texte français');
            o.save2 = await pressSave(page, f);
            await snap(page, 'g04-l-masthead-french-filled', {save: o.save2});
            await as(null);
            const fr2 = await pub(page, cUrl(app, st.L, '/fr_CA/about'), 'g05-l-about-french-filled', {markers: ['English about text', 'Texte français']});
            o.frPage2 = {status: fr2.status, h1: fr2.h1, main: fr2.mainText, hits: fr2.hits};
            const en2 = await pub(page, cUrl(app, st.L, '/en/about'), 'g06-l-about-english', {markers: ['English about text', 'Texte français']});
            o.enPage2 = {status: en2.status, h1: en2.h1, main: en2.mainText, hits: en2.hits};
            // the title in French: the header of the French page falls back?
            o.frHeader = fr2.siteName; o.frTitle = fr2.title;
            // the other end: the primary language's title emptied, French filled
            await as(U.lm);
            f = await openTab(page, app, st.L, 'masthead');
            if (!(await frName.isVisible().catch(() => false))) await f.getByRole('button', {name: 'French', exact: true}).first().click().catch(() => {});
            await sleep(400);
            const enName = page.locator('[id="masthead-name-control-en"]');
            const enOld = await enName.inputValue();
            if (await frName.count()) await frName.fill('Revue L');
            await enName.fill('');
            o.save3 = await pressSave(page, f);
            await snap(page, 'g07-l-masthead-primary-title-empty', {save: o.save3});
            await enName.fill(enOld);
            // the Contact tab's per-language boxes
            f = await openTab(page, app, st.L, 'contact');
            o.contactShape = await formShape(page, f);
            await snap(page, 'g08-l-contact-two-languages', {shape: o.contactShape});
            // M: the default "Forms" (primary alone)
            await as(U.mm);
            f = await openTab(page, app, st.M, 'masthead');
            o.mMasthead = (await f.locator('input, textarea, select').evaluateAll((els) => els.map((e) => e.id).filter(Boolean)));
            f = await openTab(page, app, st.M, 'contact');
            o.mContact = (await f.locator('input, textarea, select').evaluateAll((els) => els.map((e) => e.id).filter(Boolean)));
            record('g09-m-controls', {masthead: o.mMasthead, contact: o.mContact});
            summary.lang = o;
        });

        // ---- forms: French ticked under "Forms" on screen (bullet 12) -------------------
        await phase('forms', async () => {
            const o = {};
            await as(U.fm);
            let f = await openTab(page, app, st.F, 'masthead');
            o.before = await f.locator('input, textarea, select').evaluateAll((els) => els.map((e) => e.id).filter(Boolean));
            await page.goto(cUrl(app, st.F, '/management/settings/website'));
            await idle(page);
            await page.locator('#setup-button').first().click();
            await idle(page);
            await page.getByRole('tab', {name: 'Languages', exact: true}).filter({visible: true}).first().click();
            await idle(page); await sleep(500);
            const row = page.locator('tr.gridRow').filter({hasText: 'fr_CA'}).first();
            await row.waitFor({timeout: T});
            const formsBox = row.locator('input[type="checkbox"][id*="formLocale"]').first();
            o.checkedBefore = await formsBox.isChecked();
            const w = page.waitForResponse((r) => /manage-language-grid/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await formsBox.click({noWaitAfter: true});
            const r = await w;
            o.gridSave = r ? r.status() : null;
            await sleep(1500); await idle(page);
            await snap(page, 'k01-f-languages-forms-french', o);
            f = await openTab(page, app, st.F, 'masthead');
            o.masthead = await f.locator('input, textarea, select').evaluateAll((els) => els.map((e) => e.id).filter(Boolean));
            o.mastheadShape = await formShape(page, f);
            await snap(page, 'k02-f-masthead-after-forms', {shape: o.mastheadShape});
            f = await openTab(page, app, st.F, 'contact');
            o.contact = await f.locator('input, textarea, select').evaluateAll((els) => els.map((e) => e.id).filter(Boolean));
            await snap(page, 'k03-f-contact-after-forms', {ids: o.contact});
            summary.forms = o;
        });

        // ---- leave: an unsaved Masthead change across the tab switch and the exit --------
        await phase('leave', async () => {
            const o = {};
            await as(U.mm);
            let f = await openTab(page, app, st.M, 'masthead');
            const nameBox = page.locator('[id^="masthead-name-control"]').first();
            o.saved = await nameBox.inputValue();
            await nameBox.fill(`Unsaved title ${t}`);
            await mceSet(page, 'masthead-about-control-en', 'Unsaved about words.');
            const n0 = dialogs.length;
            await page.getByRole('tab', {name: 'Contact', exact: true}).first().click();
            await idle(page); await sleep(500);
            o.afterTab = {dialogs: dialogs.slice(n0), selected: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts()};
            await snap(page, 'z01-m-contact-after-unsaved-masthead');
            // Save the Contact tab now: does it carry the Masthead change?
            const cf = form(page, 'contact');
            o.contactSave = await pressSave(page, cf);
            await page.getByRole('tab', {name: 'Masthead', exact: true}).first().click();
            await idle(page); await sleep(500);
            o.backValue = await nameBox.inputValue();
            o.backAbout = await mceGet(page, 'masthead-about-control-en');
            await page.goto(cUrl(app, st.M, '/about')).catch((e) => { o.gotoError = String(e.message || e); });
            await sleep(800);
            o.afterLeave = {dialogs: dialogs.slice(n0), url: page.url()};
            f = await openTab(page, app, st.M, 'masthead');
            o.reopened = await page.locator('[id^="masthead-name-control"]').first().inputValue();
            o.reopenedAbout = await mceGet(page, 'masthead-about-control-en');
            await snap(page, 'z02-m-masthead-reopened', o);
            summary.leave = o;
        });
    } finally {
        summary.dialogs = dialogs;
        summary.steps = steps;
        const sumFile = path.join(outDir(), `k2-summary-${app.name}.json`);
        const prev = fs.existsSync(sumFile) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(sumFile, 'utf8')) : {};
        record('k2-summary', {...prev, ...summary, steps: [...(prev.steps || []), ...steps], dialogs: [...(prev.dialogs || []), ...dialogs]});
        await close();
    }
});
