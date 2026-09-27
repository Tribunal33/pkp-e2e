const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U55 claim check, chunk K2: the per-role restriction and what a send produces.
// Spec docs/specs/U55-notify-users.md: Fields for "Restrict Bulk Emails" 58-65,
// Rules 11-13 123-144, Side effects 145-175, Settings 176-190, Cross-feature
// interactions 191-210, the Canonical preamble and Coverage 211-251, the two
// Reference sections 561-600; footnotes h, i, j, k, l, m, s.
//
// Run (all three apps, one process; or one app):
//   PROBE_FEATURE=U55 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U55/K2/k2.js
//   PH=wiz,restrict  runs only those phases; the seed is kept in
//   .reports/U55/ccK2/state-<app>.json (RESEED=1 to reseed).
//
// Contexts per app (tag prefix u55k2), all built by POST scenarios/context:
//   A  bulkEmails on, a principal contact of its own, a custom Author-level role
//      nobody holds ("K2 Custom"); manager m; authors a1 (A), a2 (B, also Reader),
//      a3 (C, disabled), a4 (D, Author role ended), a5 (disabled after the send),
//      a6 (address changed after the send), a7 (removed after the send); reader r1;
//      one account per other level for the typed wizard address (se, as, rv).
//   N  bulkEmails off; manager.
//   R  bulkEmails on with "Author" ticked under "Disable Roles"; manager, author.
//   L  bulkEmails on; manager, 50 authors, 1 reader (groups of 50).
//
// Phases, in order: wiz restrict send copy groups kept access site entry tasks.
// The script drains the shared job queue (runJobs) in "send", "copy" and "groups".
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const T = 20_000;
const ALL = ['wiz', 'restrict', 'send', 'copy', 'groups', 'kept', 'access', 'site', 'entry', 'tasks'];
const PHASES = process.env.PH ? process.env.PH.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const outDir = path.join(__dirname, '../../../../../.reports/U55/ccK2');
const stateFile = (app) => path.join(outDir, `state-${app.name}.json`);
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';

const VOC = {
    ojs: {mgr: 'Journal manager', ctxWord: 'Journal', hosted: 'Hosted Journals', asKey: 'copyeditor', rvKey: 'externalReviewer'},
    omp: {mgr: 'Press manager', ctxWord: 'Press', hosted: 'Hosted Presses', asKey: 'copyeditor', rvKey: 'externalReviewer'},
    ops: {mgr: 'Preprint Server manager', ctxWord: 'Server', hosted: 'Hosted Servers', asKey: 'editorialBoardMember', rvKey: null},
};

function psql(app, q) {
    try { return execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; }
}

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
function watch(page) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message()}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    return page;
}

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: String(e.message).slice(0, 300)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

async function go(page, url) {
    const resp = await page.goto(url).catch(() => null);
    await idle(page).catch(() => {});
    return resp;
}

async function tabStrips(page) {
    return page.evaluate(() => [...document.querySelectorAll('[role="tablist"]')].map((l) => [...l.querySelectorAll('[role="tab"]')]
        .filter((t) => t.closest('[role="tablist"]') === l)
        .map((t) => ({id: t.id, text: t.innerText.trim(), selected: t.getAttribute('aria-selected'), visible: t.offsetParent !== null})))).catch(() => []);
}

async function notices(page) {
    return (await page.locator('.pkpNotification:visible, .pkp_notification:visible, [role="alert"]:visible, [role="status"]:visible, .pkpFieldError:visible, .ui-pnotify:visible')
        .allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);
}

/** A panel's boxes: name, value, label, checked, disabled. */
async function boxes(panel, name) {
    return panel.locator(`input[type=checkbox][name="${name}"]`).evaluateAll((els) => els.map((e) => ({
        value: e.value, checked: e.checked, disabled: e.disabled, visible: e.offsetParent !== null,
        label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').trim(),
    }))).catch(() => []);
}

// -------------------------------------------------------------- the wizard
async function openWizardFromGrid(page, app, name, prefix) {
    const r = {};
    await go(page, app.url('/index.php/index/en/admin/contexts'));
    await sleep(400);
    const row = page.locator('tr.gridRow').filter({hasText: name}).first();
    r.rowFound = await row.count();
    if (r.rowFound) {
        const arrow = row.locator('a.show_extras');
        r.arrow = await arrow.evaluate((e) => ({text: e.innerText.trim(), title: e.getAttribute('title')})).catch(() => null);
        await arrow.click(); await idle(page); await sleep(300);
        const actions = row.locator('xpath=following-sibling::tr[1]');
        r.rowActions = (await actions.locator('a').allInnerTexts().catch(() => [])).map((a) => flat(a, 60)).filter(Boolean);
        await snap(page, `${prefix}-hosted-row`, r);
        await loc(page, 'Hosted contexts: the row\'s "Settings wizard" link (after a.show_extras)', actions.getByRole('link', {name: 'Settings wizard', exact: true}));
        await actions.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await page.waitForURL(/admin\/wizard\//, {timeout: T}).catch(() => {});
        await idle(page);
    }
    r.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    r.strips = await tabStrips(page);
    r.h1 = flat(await page.locator('main h1, h1').first().innerText().catch(() => ''), 200);
    await snap(page, `${prefix}-wizard-landing`, r);
    return r;
}

async function restrictTab(page) {
    // the wizard keeps the last top tab in the address (#users): open the first top tab first
    await page.locator('#setup-button').first().click().catch(() => {});
    await sleep(200);
    const btn = page.getByRole('tab', {name: 'Restrict Bulk Emails', exact: true}).first();
    await btn.click(); await idle(page); await sleep(500);
    const id = await btn.getAttribute('aria-controls').catch(() => null);
    const panel = id ? page.locator(`[id="${id}"]`).first() : page.locator('[role="tabpanel"]:visible').last();
    return panel;
}

async function restrictFacts(panel) {
    return panel.evaluate((root) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            text: txt(root),
            html: root.innerHTML.replace(/\s+/g, ' ').slice(0, 4000),
            legend: [...root.querySelectorAll('legend, .pkpFormFieldLabel')].map(txt),
            description: [...root.querySelectorAll('.pkpFormField__description')].map(txt),
            links: [...root.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href')})),
            boxes: [...root.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, value: i.value, checked: i.checked, label: txt(i.closest('label'))})),
            buttons: [...root.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => ({text: txt(b), disabled: b.disabled})),
            requiredMarks: root.querySelectorAll('.pkpFormFieldLabel__required, [class*="required"]').length,
        };
    }).catch((e) => ({error: String(e.message)}));
}

async function saveVueForm(page, panel) {
    const resp = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\//.test(r.url()), {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await resp;
    const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
    await idle(page);
    return {
        status: r ? r.status() : null,
        url: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null,
        method: r ? r.request().method() : null,
        override: r ? r.request().headers()['x-http-method-override'] || null : null,
        posted: r ? flat(r.request().postData(), 600) : null,
        saved,
        notices: await notices(page),
    };
}

// -------------------------------------------------------------- the Notify tab
async function openNotify(page, app, ctxPath) {
    await go(page, app.url(`/index.php/${ctxPath}/en/management/settings/access`));
    const tab = page.getByRole('tab', {name: 'Notify', exact: true});
    const present = await tab.count();
    if (!present) return {present: 0, tabs: (await tabStrips(page))};
    await tab.first().click(); await idle(page); await sleep(400);
    const id = await tab.first().getAttribute('aria-controls').catch(() => null);
    const panel = id ? page.locator(`[id="${id}"]`).first() : page.locator('[role="tabpanel"]:visible').last();
    return {present, panel, tabs: await tabStrips(page)};
}

async function notifyRoles(panel) {
    return (await boxes(panel, 'userGroupIds')).map((b) => b.label);
}

async function fillNotify(page, panel, {roles = [], subject, body, copy}) {
    for (const r of roles) await panel.locator('label').filter({has: page.locator('input[name="userGroupIds"]')}).filter({hasText: new RegExp(`^\\s*${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)}).locator('input').first().check();
    if (subject != null) await panel.locator('input[name="subject"]').fill(subject);
    if (body != null) {
        await page.waitForFunction(() => ((window.tinymce && window.tinymce.get()) || []).some((e) => /body/.test(e.id) && e.initialized), undefined, {timeout: T}).catch(() => {});
        await panel.frameLocator('iframe').first().locator('body').click();
        await page.keyboard.type(body);
        await sleep(300);
    }
    if (copy) await panel.locator('input[name="copy"]').check();
}

/** Press "Save", read the window, press "Send Email", read the outcome. */
async function sendNotify(page, panel, prefix) {
    const out = {};
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'You are about to send'}).last();
    await dlg.waitFor({timeout: T}).catch(() => {});
    out.window = flat(await dlg.innerText().catch(() => ''), 400);
    await snap(page, `${prefix}-confirm`, {window: out.window});
    const resp = page.waitForResponse((r) => /\/_email/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Send Email', exact: true}).click();
    const r = await resp;
    out.sentAt = Date.now();
    out.response = r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), body: flat(await r.text().catch(() => ''), 400)} : null;
    await sleep(800); await idle(page);
    out.queued = await page.getByText('Emails are successfully queued').count();
    out.notices = await notices(page);
    out.panel = flat(await panel.innerText().catch(() => ''), 800);
    out.fieldErrors = (await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
    await snap(page, `${prefix}-after-send`, out);
    return out;
}

// -------------------------------------------------------------- jobs and mail
function jobsWithMarker(app, marker) {
    return psql(app, `select count(*) from jobs where payload like '%${marker}%'`);
}
function drain(app) {
    const {runJobs} = require('../../../support/jobs');
    const prev = {port: process.env.PLAYWRIGHT_BASE_PORT, key: process.env.TEST_API_KEY, cfg: process.env.PKP_CONFIG_FILE};
    process.env.PLAYWRIGHT_BASE_PORT = String(app.port); // the probe server answers the count
    process.env.TEST_API_KEY = app.testApiKey;
    process.env.PKP_CONFIG_FILE = app.configFile;
    try {
        return flat(runJobs({appRoot: path.resolve(process.cwd(), app.root), timeoutMs: 120_000}), 600);
    } catch (e) {
        return `drain error: ${flat(e.message, 300)}`;
    } finally {
        process.env.PLAYWRIGHT_BASE_PORT = prev.port;
        if (prev.key === undefined) delete process.env.TEST_API_KEY; else process.env.TEST_API_KEY = prev.key;
        if (prev.cfg === undefined) delete process.env.PKP_CONFIG_FILE; else process.env.PKP_CONFIG_FILE = prev.cfg;
    }
}
async function mp(pathname, params = {}) {
    const q = new URLSearchParams(params).toString();
    const r = await fetch(`${MAILPIT}${pathname}${q ? `?${q}` : ''}`);
    return r.json();
}
async function mailTo(to, marker) {
    const res = await mp('/api/v1/search', {query: `to:"${to}" "${marker}"`, limit: '50'});
    return res.messages || [];
}
async function full(id) {
    const m = await mp(`/api/v1/message/${id}`);
    return {
        from: m.From, to: m.To, cc: m.Cc, bcc: m.Bcc, replyTo: m.ReplyTo, subject: m.Subject,
        html: flat(m.HTML, 1500), text: flat(m.Text, 1500),
    };
}
async function headers(id) {
    try { return await mp(`/api/v1/message/${id}/headers`); } catch { return null; }
}

// -------------------------------------------------------------- seed
async function seed(app) {
    const V = VOC[app.name];
    const t = tag('u55k2');
    const S = {t, A: `${t}a`, N: `${t}n`, R: `${t}r`, L: `${t}l`};
    const U = (k, roles, g, f, more = {}) => ({username: `${t}${k}`, roles, givenName: g, familyName: f, ...more});
    const ctx = (p, label) => ({name: `K2 ${label} ${p}`, acronym: 'KTWO', contactName: `K2 Office ${label}`, contactEmail: `${p}office@mail.test`});
    const usersA = [
        U('m', ['manager'], 'Mara', 'Manager'),
        U('a1', ['author'], 'Ada', 'Alpha'),
        U('a2', ['author', 'reader'], 'Ben', 'Beta'),
        U('a3', ['author'], 'Cleo', 'Gamma', {disabled: true}),
        U('a4', [], 'Dan', 'Delta', {pastRoles: [{role: 'author'}]}),
        U('a5', ['author'], 'Eva', 'Epsilon'),
        U('a6', ['author'], 'Finn', 'Zeta'),
        U('a7', ['author'], 'Gia', 'Eta'),
        U('r1', ['reader'], 'Rex', 'Reader'),
        U('se', ['sectionEditor'], 'Sam', 'Section'),
        U('as', [V.asKey], 'Ann', 'Assistant'),
    ];
    if (V.rvKey) usersA.push(U('rv', [V.rvKey], 'Rae', 'Reviewer'));
    const a = await app.api.createContext({tag: S.A, context: ctx(S.A, 'A'), bulkEmails: true,
        customRoles: [{key: 'kcr', level: 'author', name: 'K2 Custom', abbrev: 'K2C'}], users: usersA});
    S.idA = a.contextId; S.seedA = a;
    const n = await app.api.createContext({tag: S.N, context: ctx(S.N, 'N'), users: [U('nm', ['manager'], 'Nia', 'Manager')]});
    S.idN = n.contextId;
    const r = await app.api.createContext({tag: S.R, context: ctx(S.R, 'R'), bulkEmails: true, disableBulkEmailRoles: ['author'],
        users: [U('rm', ['manager'], 'Rho', 'Manager'), U('ra', ['author'], 'Ria', 'Author')]});
    S.idR = r.contextId;
    const lu = [U('lm', ['manager'], 'Lou', 'Manager'), U('lr', ['reader'], 'Lin', 'Reader')];
    for (let i = 1; i <= 50; i++) lu.push(U(`l${String(i).padStart(2, '0')}`, ['author'], `Lee${i}`, 'Author'));
    const l = await app.api.createContext({tag: S.L, context: ctx(S.L, 'L'), bulkEmails: true, users: lu});
    S.idL = l.contextId;
    S.names = {A: `K2 A ${S.A}`, N: `K2 N ${S.N}`, R: `K2 R ${S.R}`, L: `K2 L ${S.L}`};
    return S;
}

// -------------------------------------------------------------- main
forEachApp(async (app) => {
    fs.mkdirSync(outDir, {recursive: true});
    const V = VOC[app.name];
    let S;
    if (!process.env.RESEED && fs.existsSync(stateFile(app))) S = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    else {
        CUR = 'seed';
        S = await seed(app);
        fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
        note(`seeded A ${S.A} (id ${S.idA}), N ${S.N}, R ${S.R}, L ${S.L} (tag prefix u55k2; ccK2 drains the shared job queue in its send, copy and groups phases)`);
    }
    const t = S.t;
    const E = (k) => `${t}${k}@mail.test`;
    const R = {app: app.name, t};
    const res = (k, v) => { R[k] = v; record('k2-results', {[k]: v}, {merge: true}); };

    const {page, close} = await launch(app);
    watch(page);
    const second = await launch(app); // the manager's own window
    watch(second.page);
    const mpage = second.page;
    const asAdmin = async () => signIn(page, 'admin');
    const step = async (name, fn) => {
        if (!on(name)) return;
        CUR = name;
        log(app.name, name, 'start');
        const o = {};
        try { await fn(o); } catch (e) { o.error = flat(e.stack || e.message, 800); log(app.name, name, 'ERROR', o.error); await snap(page, `${name}-error`).catch(() => {}); }
        o.crashes = CRASH[name] || [];
        o.dialogs = DIALOGS.filter((d) => d.phase === name);
        res(name, o);
        log(app.name, name, 'done');
    };

    try {
        // ---- wiz: Rule 11, Fields, the unticked journal's sentence and both links
        await step('wiz', async (o) => {
            await asAdmin();
            o.gridA = await openWizardFromGrid(page, app, S.names.A, 'w01-A');
            let panel = await restrictTab(page);
            o.restrictA = await restrictFacts(panel);
            o.stripsA = await tabStrips(page);
            await snap(page, 'w02-A-restrict', {facts: o.restrictA});
            await loc(page, 'Wizard: "Restrict Bulk Emails" side tab', page.getByRole('tab', {name: 'Restrict Bulk Emails', exact: true}));
            await loc(page, 'Restrict Bulk Emails: "Disable Roles" boxes', panel.locator('input[name="disableBulkEmailUserGroups"]'));
            await loc(page, 'Restrict Bulk Emails: Save', panel.getByRole('button', {name: 'Save', exact: true}));
            // sweep: tick one box, switch side tab and back, reload
            const custom = panel.getByRole('checkbox', {name: 'K2 Custom', exact: true});
            await custom.check().catch(() => {});
            o.unsaved = {tickedCustom: await custom.isChecked().catch(() => null)};
            const first = (o.stripsA.find((s) => s.some((x) => x.text === 'Restrict Bulk Emails')) || [])[0];
            if (first) { await page.getByRole('tab', {name: first.text, exact: true}).first().click(); await idle(page); await sleep(300); }
            panel = await restrictTab(page);
            o.unsaved.afterSideSwitch = await panel.getByRole('checkbox', {name: 'K2 Custom', exact: true}).isChecked().catch(() => null);
            const nd = DIALOGS.length;
            await page.getByRole('tab', {name: 'Users', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(300);
            o.unsaved.topTabDialogs = DIALOGS.slice(nd);
            await page.reload(); await idle(page);
            o.unsaved.reloadDialogs = DIALOGS.slice(nd);
            panel = await restrictTab(page);
            o.unsaved.afterReload = await panel.getByRole('checkbox', {name: 'K2 Custom', exact: true}).isChecked().catch(() => null);
            await snap(page, 'w03-A-restrict-after-reload', o.unsaved);
            // the description's link
            const dlink = panel.locator('.pkpFormField__description a').first();
            o.descLink = {href: await dlink.getAttribute('href').catch(() => null), text: flat(await dlink.innerText().catch(() => ''))};
            await dlink.click().catch(() => {});
            await page.waitForURL(/admin\/settings/, {timeout: T}).catch(() => {});
            await idle(page); await sleep(600);
            o.descLink.landed = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), strips: await tabStrips(page), panel: flat(await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 600)};
            await snap(page, 'w04-A-desc-link-landed', o.descLink);
            // N: not ticked
            o.gridN = await openWizardFromGrid(page, app, S.names.N, 'w05-N');
            panel = await restrictTab(page);
            o.restrictN = await restrictFacts(panel);
            o.stripsN = await tabStrips(page);
            await snap(page, 'w06-N-restrict', {facts: o.restrictN});
            await loc(page, 'Restrict Bulk Emails (journal not ticked): the sentence\'s link', panel.getByRole('link', {name: 'Admin > Site Settings'}));
            const nlink = panel.getByRole('link', {name: 'Admin > Site Settings'}).first();
            o.nLink = {href: await nlink.getAttribute('href').catch(() => null)};
            await nlink.click().catch(() => {});
            await page.waitForURL(/admin\/settings/, {timeout: T}).catch(() => {});
            await idle(page); await sleep(600);
            o.nLink.landed = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), strips: await tabStrips(page), panel: flat(await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 600)};
            await snap(page, 'w07-N-link-landed', o.nLink);
            // the Roles tab of A as its manager, to compare the lists
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            await go(mpage, app.url(`/index.php/${S.A}/en/management/settings/access`));
            await mpage.getByRole('tab', {name: 'Roles', exact: true}).first().click(); await idle(mpage); await sleep(600);
            o.rolesTabA = flat(await mpage.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 2500);
            await snap(mpage, 'w08-A-roles-tab');
        });

        // ---- restrict: Rule 12, Settings bullet 2, a page opened before the restriction
        await step('restrict', async (o) => {
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            let n = await openNotify(mpage, app, S.A);
            o.before = {roles: await notifyRoles(n.panel), tabs: n.tabs};
            await snap(mpage, 'r01-A-notify-before', o.before);
            // the admin ticks Author and saves
            await asAdmin();
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idA}`));
            let panel = await restrictTab(page);
            await panel.getByRole('checkbox', {name: 'Author', exact: true}).check();
            o.save = await saveVueForm(page, panel);
            o.samePage = await boxes(panel, 'disableBulkEmailUserGroups');
            await snap(page, 'r02-A-restrict-author-saved', {save: o.save});
            await page.reload(); await idle(page);
            panel = await restrictTab(page);
            o.afterReload = await boxes(panel, 'disableBulkEmailUserGroups');
            await snap(page, 'r03-A-restrict-after-reload', {boxes: o.afterReload});
            // the manager's page opened before: tick Author, send
            await fillNotify(mpage, n.panel, {roles: ['Author'], subject: `Stale restrict ${t}`, body: 'Stale page text.'});
            o.stale = await sendNotify(mpage, n.panel, 'r04-A-stale');
            o.stale.jobs = jobsWithMarker(app, `Stale restrict ${t}`);
            // reopened: Author gone
            n = await openNotify(mpage, app, S.A);
            o.reopened = {roles: await notifyRoles(n.panel)};
            await snap(mpage, 'r05-A-notify-reopened', o.reopened);
            // nothing else changed: the Roles tab, the Users list, another email to an author
            await mpage.getByRole('tab', {name: 'Roles', exact: true}).first().click(); await idle(mpage); await sleep(600);
            o.rolesTab = flat(await mpage.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 2500);
            await snap(mpage, 'r06-A-roles-tab-restricted');
            await mpage.getByRole('tab', {name: 'Users', exact: true}).first().click(); await idle(mpage); await sleep(800);
            const row = mpage.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').filter({hasText: E('a1')});
            o.a1Row = flat(await row.innerText().catch(() => ''), 300);
            // "Email" from the row menu to a1
            const {UsersListPage, EmailUserWindow} = require('../../../pages/UsersManagementPages.js');
            const ul = new UsersListPage(mpage, S.A);
            await ul.chooseAction(row, 'Email');
            const ew = new EmailUserWindow(mpage);
            await ew.expectOpen();
            await ew.subject.fill(`Other email ${t}`);
            await ew.typeBody('Another email from the journal.');
            const er = await ew.sendAndWait();
            o.otherEmail = {status: er.status()};
            await sleep(1000);
            o.otherEmail.mail = (await mailTo(E('a1'), `Other email ${t}`)).length;
            await snap(mpage, 'r07-A-other-email-sent', o.otherEmail);
            // the admin unticks Author; the manager's reopened tab offers it again
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idA}`));
            panel = await restrictTab(page);
            await panel.getByRole('checkbox', {name: 'Author', exact: true}).uncheck();
            o.unsave = await saveVueForm(page, panel);
            await snap(page, 'r08-A-restrict-untick-saved', {save: o.unsave});
            n = await openNotify(mpage, app, S.A);
            o.again = {roles: await notifyRoles(n.panel)};
            await snap(mpage, 'r09-A-notify-again', o.again);
        });

        // ---- send: Side effects (recipients, the email, queued, preferences)
        await step('send', async (o) => {
            // A turns off every notification email
            await signIn(mpage, `${t}a1`, {contextPath: S.A});
            await go(mpage, app.url(`/index.php/${S.A}/en/user/profile/notificationSettings`));
            const nf = mpage.locator('form#notificationSettingsForm');
            await nf.waitFor({timeout: T});
            const all = nf.locator('input[type=checkbox]');
            o.prefsBefore = await all.evaluateAll((els) => els.map((e) => ({id: e.id, checked: e.checked, disabled: e.disabled})));
            const cnt = await all.count();
            // email boxes first ("Do not send me an email…" ticked), then the "enable" boxes unticked
            for (let i = 0; i < cnt; i++) { const b = all.nth(i); const id = await b.getAttribute('id'); if (/^email/.test(id || '') && !(await b.isDisabled())) await b.check().catch(() => {}); }
            for (let i = 0; i < cnt; i++) { const b = all.nth(i); const id = await b.getAttribute('id'); if (!/^email/.test(id || '')) await b.uncheck().catch(() => {}); }
            const sv = mpage.waitForResponse((r) => r.request().method() === 'POST' && /save/.test(r.url()), {timeout: T}).catch(() => null);
            await nf.getByRole('button', {name: 'Save', exact: true}).click();
            const svr = await sv;
            o.prefsSave = svr ? svr.status() : null;
            await sleep(800);
            await go(mpage, app.url(`/index.php/${S.A}/en/user/profile/notificationSettings`));
            o.prefsAfter = await mpage.locator('form#notificationSettingsForm input[type=checkbox]').evaluateAll((els) => els.map((e) => ({id: e.id, checked: e.checked, label: ((e.closest('li') || e.parentElement).innerText || '').trim().slice(0, 80)})));
            await snap(mpage, 's01-a1-prefs-after');
            // the principal contact as the manager sees it
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            await go(mpage, app.url(`/index.php/${S.A}/en/management/settings/context`));
            const ct = mpage.getByRole('tab', {name: 'Contact', exact: true}).first();
            await ct.click().catch(() => {}); await idle(mpage); await sleep(600);
            o.contact = flat(await mpage.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 1500);
            o.contactValues = await mpage.locator('[role="tabpanel"]:visible input').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value}))).catch(() => []);
            await snap(mpage, 's02-A-contact');
            // the send: Author + Reader, Copy ticked
            const subject = `Office closed ${t}`;
            const n = await openNotify(mpage, app, S.A);
            o.roles = await notifyRoles(n.panel);
            await fillNotify(mpage, n.panel, {roles: ['Author', 'Reader'], subject, body: 'Dear {$recipientName}, the office is closed.', copy: true});
            o.copyLabel = flat(await n.panel.locator('label').filter({has: mpage.locator('input[name="copy"]')}).innerText().catch(() => ''), 200);
            o.typedBody = await mpage.evaluate(() => { const e = ((window.tinymce && window.tinymce.get()) || []).find((x) => /body/.test(x.id)); return e ? e.getContent() : null; });
            o.send = await sendNotify(mpage, n.panel, 's03-A-send');
            // before the jobs run
            o.jobsRightAfter = jobsWithMarker(app, subject);
            o.mailBeforeJobs = {a1: (await mailTo(E('a1'), subject)).length, m: (await mailTo(E('m'), subject)).length};
            // between the send and the jobs: a5 disabled, a7 removed, a6's address changed
            const {UsersListPage, DisableUserWindow, RemoveUserDialog} = require('../../../pages/UsersManagementPages.js');
            const ul = new UsersListPage(mpage, S.A);
            await go(mpage, app.url(`/index.php/${S.A}/en/management/settings/access`)); await sleep(800);
            const tbl = mpage.getByRole('table', {name: /^Current Users \(/});
            await ul.chooseAction(tbl.locator('tbody tr').filter({hasText: E('a5')}), 'Disable User');
            const dw = new DisableUserWindow(mpage, 'Disable Eva Epsilon');
            await dw.expectForm(); await dw.ok();
            o.a5Row = flat(await tbl.locator('tbody tr').filter({hasText: E('a5')}).innerText().catch(() => ''), 300);
            await ul.chooseAction(tbl.locator('tbody tr').filter({hasText: E('a7')}), 'Remove User');
            const rd = new RemoveUserDialog(mpage);
            await rd.expectOpen();
            o.a7Remove = (await rd.ok()).status();
            await sleep(600);
            o.a7Row = flat(await tbl.locator('tbody tr').filter({hasText: E('a7')}).innerText().catch(() => ''), 300);
            await snap(mpage, 's04-A-users-after-disable-remove', {a5: o.a5Row, a7: o.a7Row});
            // a6's address, changed by the Site Administrator (Hosted Journals › Settings wizard › Users › Edit User)
            await asAdmin();
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idA}`));
            await page.getByRole('tab', {name: 'Users', exact: true}).first().click();
            const gp = page.locator('[role="tabpanel"]:visible').filter({has: page.locator('.pkp_controllers_grid')}).last();
            await gp.locator('tr.gridRow').first().waitFor({timeout: T}); await idle(page); await sleep(400);
            const grow = gp.locator('tr.gridRow').filter({hasText: E('a6')}).first();
            await grow.locator('a.show_extras').click();
            await grow.locator('xpath=following-sibling::tr[1]').locator('a').filter({hasText: /^\s*Edit User\s*$/}).first().click();
            const uf = page.locator('form#userDetailsForm').last();
            await uf.waitFor({timeout: T}); await idle(page); await sleep(600);
            await uf.locator('input[name="email"]').fill(`${t}a6new@mail.test`);
            await uf.getByRole('button', {name: 'OK', exact: true}).click();
            o.a6Edited = await page.getByText('User edited.').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            await sleep(800);
            await snap(page, 's05-a6-address-changed', {edited: o.a6Edited});
            o.jobsBeforeDrain = jobsWithMarker(app, subject);
            o.drain = drain(app);
            await sleep(1500);
            const who = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'r1', 'm', 'se', 'as', 'rv'];
            o.counts = {};
            for (const k of who) o.counts[k] = (await mailTo(E(k), subject)).length;
            o.counts.a6new = (await mailTo(`${t}a6new@mail.test`, subject)).length;
            const m1 = (await mailTo(E('a1'), subject))[0];
            if (m1) { o.a1Mail = await full(m1.ID); o.a1Headers = await headers(m1.ID); }
            const m2 = (await mailTo(E('a2'), subject))[0];
            if (m2) o.a2Mail = await full(m2.ID);
            const mm = (await mailTo(E('m'), subject))[0];
            if (mm) o.mMail = await full(mm.ID);
        });

        // ---- copy: the manager already a recipient, "Copy" ticked
        await step('copy', async (o) => {
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            const subject = `Copy check ${t}`;
            const n = await openNotify(mpage, app, S.A);
            await fillNotify(mpage, n.panel, {roles: [V.mgr], subject, body: 'Copy check text.', copy: true});
            o.send = await sendNotify(mpage, n.panel, 'c01-A-copy-send');
            o.drain = drain(app);
            await sleep(1500);
            o.mgr = (await mailTo(E('m'), subject)).length;
            // "Send another email"
            const again = mpage.getByRole('link', {name: 'Send another email'}).or(mpage.getByRole('button', {name: 'Send another email'}));
            o.sendAnother = await again.count();
        });

        // ---- groups: 50 and 51 recipients
        await step('groups', async (o) => {
            await signIn(mpage, `${t}lm`, {contextPath: S.L});
            const s50 = `Groups fifty ${t}`;
            let n = await openNotify(mpage, app, S.L);
            await fillNotify(mpage, n.panel, {roles: ['Author'], subject: s50, body: 'Fifty.'});
            o.send50 = await sendNotify(mpage, n.panel, 'g01-L-send50');
            o.jobs50 = jobsWithMarker(app, s50);
            o.drain50 = drain(app);
            const s51 = `Groups fiftyone ${t}`;
            n = await openNotify(mpage, app, S.L);
            await fillNotify(mpage, n.panel, {roles: ['Author', 'Reader'], subject: s51, body: 'Fifty-one.'});
            o.send51 = await sendNotify(mpage, n.panel, 'g02-L-send51');
            o.jobs51 = jobsWithMarker(app, s51);
            o.drain51 = drain(app);
            await sleep(2000);
            const q = async (s) => (await mp('/api/v1/search', {query: `subject:"${s}"`, limit: '1'})).messages_count;
            o.mail50 = await q(s50);
            o.mail51 = await q(s51);
            o.lrOnly51 = (await mailTo(E('lr'), s51)).length;
        });

        // ---- kept: Rule 13, Settings bullet 1 (the journal unticked, a page opened before)
        await step('kept', async (o) => {
            await signIn(mpage, `${t}rm`, {contextPath: S.R});
            let n = await openNotify(mpage, app, S.R);
            o.before = {present: n.present, roles: n.present ? await notifyRoles(n.panel) : null};
            await snap(mpage, 'k01-R-notify-before', o.before);
            await asAdmin();
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idR}`));
            let panel = await restrictTab(page);
            o.restrictBefore = await boxes(panel, 'disableBulkEmailUserGroups');
            await snap(page, 'k02-R-restrict-before', {boxes: o.restrictBefore});
            const site = async (label, tick) => {
                await go(page, app.url('/index.php/index/en/admin/settings'));
                await page.locator('#setup-button').first().click().catch(() => {});
                await page.locator('#bulkEmails-button').first().click();
                await idle(page); await sleep(500);
                const sp = page.locator('[role="tabpanel"]:visible').filter({has: page.locator('input[name="enableBulkEmails"]')}).last();
                const before = (await boxes(sp, 'enableBulkEmails')).filter((b) => b.checked).map((b) => b.label);
                await sp.getByRole('checkbox', {name: S.names.R, exact: true}).setChecked(tick);
                const sv = await saveVueForm(page, sp);
                const after = (await boxes(sp, 'enableBulkEmails')).filter((b) => b.checked).map((b) => b.label);
                await snap(page, `k03-site-${label}`, {sv});
                await page.reload(); await idle(page);
                await page.locator('#bulkEmails-button').first().click().catch(() => {}); await sleep(500);
                const sp2 = page.locator('[role="tabpanel"]:visible').filter({has: page.locator('input[name="enableBulkEmails"]')}).last();
                const reloaded = (await boxes(sp2, 'enableBulkEmails')).filter((b) => b.checked).map((b) => b.label);
                return {sv, beforeCount: before.length, afterCount: after.length, reloadedCount: reloaded.length,
                    lostOthers: before.filter((x) => x !== S.names.R && !reloaded.includes(x)), rTicked: reloaded.includes(S.names.R)};
            };
            o.untick = await site('untick', false);
            // the wizard now: the sentence only
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idR}`));
            panel = await restrictTab(page);
            o.restrictUnticked = await restrictFacts(panel);
            await snap(page, 'k04-R-restrict-unticked', {facts: o.restrictUnticked});
            // the manager's page opened before: tick the manager role, send
            await fillNotify(mpage, n.panel, {roles: [V.mgr], subject: `Stale unticked ${t}`, body: 'Stale unticked.'});
            o.stale = await sendNotify(mpage, n.panel, 'k05-R-stale-send');
            o.stale.jobs = jobsWithMarker(app, `Stale unticked ${t}`);
            n = await openNotify(mpage, app, S.R);
            o.unticked = {present: n.present, tabs: n.tabs};
            await snap(mpage, 'k06-R-access-unticked', o.unticked);
            // ticked again
            o.retick = await site('retick', true);
            await go(page, app.url(`/index.php/index/en/admin/wizard/${S.idR}`));
            panel = await restrictTab(page);
            o.restrictAfter = await boxes(panel, 'disableBulkEmailUserGroups');
            await snap(page, 'k07-R-restrict-after', {boxes: o.restrictAfter});
            n = await openNotify(mpage, app, S.R);
            o.after = {present: n.present, roles: n.present ? await notifyRoles(n.panel) : null};
            await snap(mpage, 'k08-R-notify-after', o.after);
        });

        // ---- access: the wizard address typed by one account per level; the manager's own Settings pages
        await step('access', async (o) => {
            const accts = [['m', 'manager'], ['se', 'subEditor'], ['as', 'assistant'], ['a1', 'author'], ['r1', 'reader']];
            if (V.rvKey) accts.push(['rv', 'reviewer']);
            o.typed = {};
            for (const [k, lvl] of accts) {
                await signIn(mpage, `${t}${k}`, {contextPath: S.A});
                const out = {};
                for (const [nm, p] of [['wizard', `/index.php/index/en/admin/wizard/${S.idA}`], ['wizardCtx', `/index.php/${S.A}/en/admin/wizard/${S.idA}`], ['siteSettings', '/index.php/index/en/admin/settings']]) {
                    const resp = await go(mpage, app.url(p));
                    const body = flat(await mpage.locator('body').innerText().catch(() => ''), 300);
                    out[nm] = {status: resp ? resp.status() : null, url: mpage.url().replace(/^https?:\/\/[^/]+/, ''), restrictTab: await mpage.getByRole('tab', {name: 'Restrict Bulk Emails'}).count(), body};
                }
                await snap(mpage, `a01-typed-${lvl}`, out);
                o.typed[lvl] = out;
            }
            // the manager's own Settings pages: any "Disable Roles" / "Restrict Bulk Emails"?
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            o.ownPages = {};
            for (const p of ['context', 'website', 'workflow', 'distribution', 'access']) {
                await go(mpage, app.url(`/index.php/${S.A}/en/management/settings/${p}`)); await sleep(500);
                const html = await mpage.content();
                o.ownPages[p] = {disableRoles: /Disable Roles/.test(html), restrict: /Restrict Bulk Emails/.test(html), field: /disableBulkEmailUserGroups/.test(html)};
            }
            await snap(mpage, 'a02-manager-access-page');
        });

        // ---- site: Settings bullet 1 read-only (a box per hosted context, defaults)
        await step('site', async (o) => {
            await asAdmin();
            await go(page, app.url('/index.php/index/en/admin/contexts'));
            o.hostedRows = await page.locator('tr.gridRow').count();
            o.hostedPaging = flat(await page.locator('.gridPaging, [class*="paging"]').first().innerText().catch(() => ''), 200);
            await go(page, app.url('/index.php/index/en/admin/settings'));
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.locator('#bulkEmails-button').first().click();
            await idle(page); await sleep(500);
            const sp = page.locator('[role="tabpanel"]:visible').filter({has: page.locator('input[name="enableBulkEmails"]')}).last();
            const b = await boxes(sp, 'enableBulkEmails');
            o.boxCount = b.length;
            o.ticked = b.filter((x) => x.checked).length;
            o.publicknowledge = b.filter((x) => /Public Knowledge/i.test(x.label));
            o.mine = b.filter((x) => x.label.includes(t));
            o.dbContexts = psql(app, `select count(*) from ${app.name === 'ojs' ? 'journals' : app.name === 'omp' ? 'presses' : 'servers'}`);
            o.panelHead = flat(await sp.innerText().catch(() => ''), 900);
            await snap(page, 'st01-site-bulk-emails', {boxCount: o.boxCount, ticked: o.ticked});
            await loc(page, 'Site Settings › Bulk Emails: a context\'s box', sp.locator('input[name="enableBulkEmails"]'));
        });

        // ---- entry: the Reference addresses typed
        await step('entry', async (o) => {
            await asAdmin();
            await go(page, app.url('/index.php/index/en/admin/settings#setup/bulkEmails'));
            await sleep(600);
            o.siteHash = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), strips: await tabStrips(page)};
            await snap(page, 'e01-site-hash', o.siteHash);
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            await go(mpage, app.url(`/index.php/${S.A}/en/management/settings/access#notify`));
            await sleep(600);
            o.notifyHash = {url: mpage.url().replace(/^https?:\/\/[^/]+/, ''), strips: await tabStrips(mpage)};
            await snap(mpage, 'e02-notify-hash', o.notifyHash);
        });
        // ---- tasks: after the sends, does the manager get anything besides the "queued" line and the copy?
        await step('tasks', async (o) => {
            await signIn(mpage, `${t}m`, {contextPath: S.A});
            await go(mpage, app.url(`/index.php/${S.A}/en/dashboard/editorial`)); await sleep(800);
            o.header = flat((await snap(mpage, 't01-manager-header')).text.header, 400);
            const tasks = mpage.getByRole('button', {name: /Tasks/}).first();
            o.tasksButton = flat(await tasks.innerText().catch(() => ''), 80);
            await tasks.click().catch(() => {}); await idle(mpage); await sleep(800);
            o.tasksWindow = flat(await mpage.getByRole('dialog').last().innerText().catch(() => ''), 800);
            await snap(mpage, 't02-manager-tasks', {tasks: o.tasksWindow});
        });
    } finally {
        record('k2-summary', R);
        await second.close().catch(() => {});
        await close();
    }
});
