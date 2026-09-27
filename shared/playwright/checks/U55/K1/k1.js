const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U55 claim check, chunk K1: the "Notify" tab of Settings › Users & Roles as a
// manager meets it, on all three apps.
// Spec: docs/specs/U55-notify-users.md — Purpose and Actors (10–42), the "Notify"
// tab's fields (43–57), Rules 1–10 (66–122), register A1–A4 (252–303); footnotes
// a, b, c, d, e, f, g, h (Actors row 3), m (Actors row 4), f-a1..f-a4.
//
// Seeds per app (tag prefix u55k1; kept in k1-state-<app>.json, RESEED=1 re-seeds):
//   A  bulk email on; custom roles "Nobody role" (author level, nobody holds it) and
//      "Custom manager" (manager level, "Permit changes to Settings" unticked, one
//      member). Members: mgr (Journal manager), ed (Journal editor) [OJS/OMP],
//      aa (Author), ab (Author, disabled), ac (Author role ended), ad (Author +
//      Reader), rd (Reader), se (Section editor), as (Copyeditor; OPS Editorial
//      Board Member), rv (Reviewer) [OJS/OMP], cm (Custom manager). admin is a
//      manager of every scratch context.
//   B  bulk email on, "Reader" and "Nobody role" ticked under "Disable Roles".
//   U  bulk email off.
//   S  bulk email on (Rule 10: restricted and unticked under an open page).
// Phases (PHASES=a,b narrows):
//   gate     A: every permission level opens Users & Roles (tabs, Notify); U: no tab;
//            a manager types the Site Administrator's addresses; the journal's own
//            Settings pages carry no "Disable Roles"
//   fields   A as mgr: the form (labels, boxes, toolbar, Copy, marks, button); Roles
//            tab names; B's offered roles; the link window; a tab left with changes
//   confirm  A as mgr: the window, its totals (empty, Author, +Reader, +Copy, Journal
//            manager, Nobody role, Custom manager), Cancel keeps the form
//   refuse   A as mgr: Rule 7 (empty send, Save greyed, which change re-enables it)
//   nobody   A as mgr: Rule 9 (Nobody role, Copy off / on)
//   sent     A as mgr: Rule 8 (Author + Reader; the line across tabs; Send another)
//   levels   A as ed [OJS/OMP] and admin: a send; the line after a reload
//   stale    S: Rule 10 (a role restricted, then the journal unticked, under an open page)
//   toast    a fresh ticked journal T: every text the page adds after a refused send
//            (Rule 7's notice, Rule 10's), caught as it appears; "Jump to next error"
//   mail     the queue and Mailpit for this chunk's subjects
//
// The journal is unticked under "Bulk Emails" (stale) by a locked write to the
// site's list, as the harness's bulkEmails key writes it, because the Site
// Settings "Save" posts the list as its page loaded it and would write a parallel
// seed's id out (scenarios.md `bulkEmails`).
//
//   PROBE_FEATURE=U55 PROBE_AGENT=ccK1 node bin/probe.js <app|all> shared/playwright/checks/U55/K1/k1.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['gate', 'fields', 'confirm', 'refuse', 'nobody', 'sent', 'levels', 'stale', 'toast', 'mail'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[u55k1]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const DB = (app) => `${dbName(app.name)}`;
const sql = (app, q) => execFileSync('psql', ['-d', DB(app), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();

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

const notifyPanel = (page) => page.locator('#notify');

async function tabsOf(page) {
    return (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
}

/** Users & Roles of ctx; returns {status, tabs, h1, denied}. */
async function gotoAccess(page, app, ctx, {hash = ''} = {}) {
    const r = await page.goto(app.url(`/index.php/${ctx}/en/management/settings/access${hash}`)).catch((e) => ({err: String(e.message).slice(0, 200)}));
    await idle(page).catch(() => {});
    await sleep(500);
    return {
        status: r && typeof r.status === 'function' ? r.status() : r,
        url: page.url(),
        tabs: await tabsOf(page),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        selected: flat(await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 60),
        body: flat(await page.locator('body').innerText().catch(() => ''), 600),
    };
}

async function waitEditor(page) {
    await page.waitForFunction(() => ((window.tinymce && window.tinymce.get()) || []).some((e) => /notifyUsers-body/.test(e.id) && e.initialized), undefined, {timeout: T}).catch(() => {});
}

/** Open Users & Roles on ctx and press the "Notify" tab; the form ready to type in. */
async function gotoNotify(page, app, ctx) {
    const a = await gotoAccess(page, app, ctx);
    const tab = page.getByRole('tab', {name: 'Notify', exact: true});
    if (!(await tab.count())) return {...a, notify: false};
    await tab.click();
    await notifyPanel(page).getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await waitEditor(page);
    await idle(page).catch(() => {});
    return {...a, notify: true, urlAfterTab: page.url()};
}

async function readForm(page) {
    const p = notifyPanel(page);
    if (!(await p.count())) return {present: false};
    const boxes = await p.locator('input[name="userGroupIds"]').evaluateAll((els) => els.map((e) => ({label: (e.closest('label') ? e.closest('label').innerText : '').trim(), checked: e.checked, value: e.value})));
    const copy = await p.locator('input[name="copy"]').evaluateAll((els) => els.map((e) => ({label: (e.closest('label') ? e.closest('label').innerText : '').trim(), checked: e.checked})));
    const subject = await p.locator('input[name="subject"]').inputValue().catch(() => null);
    const body = await page.evaluate(() => {
        const ed = ((window.tinymce && window.tinymce.get()) || []).find((e) => /notifyUsers-body/.test(e.id));
        return ed ? ed.getContent() : null;
    }).catch(() => null);
    const save = p.getByRole('button', {name: 'Save', exact: true});
    const fieldErrors = await p.locator('.pkpFieldError').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => {
        const f = e.closest('.pkpFormField, fieldset');
        const lab = f ? (f.querySelector('legend, label') || {}).innerText : null;
        return {field: (lab || '').trim().slice(0, 40), text: e.innerText.trim()};
    })).catch(() => []);
    const required = await p.locator('.pkpFormFieldLabel__required, [aria-required="true"], [required]').count().catch(() => null);
    const labels = await p.locator('legend, label.pkpFormFieldLabel').allInnerTexts().catch(() => []);
    return {
        present: true,
        visibleText: flat(await p.innerText().catch(() => ''), 3000),
        boxes, copy, subject, body,
        saveCount: await save.count(),
        saveEnabled: (await save.count()) ? await save.isEnabled().catch(() => null) : null,
        fieldErrors, required, labels: labels.map((x) => flat(x, 120)),
        status: flat(await p.locator('[role="status"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 300),
        queued: flat(await p.getByText(/successfully queued/).first().innerText().catch(() => null), 300),
    };
}

async function tick(page, label, value = true) {
    const box = notifyPanel(page).getByRole('checkbox', {name: label, exact: true});
    if (value) await box.check(); else await box.uncheck();
}

async function typeSubject(page, text) {
    const box = notifyPanel(page).getByRole('textbox', {name: 'Subject', exact: true});
    await box.fill(text);
}

async function typeBody(page, text) {
    await waitEditor(page);
    const body = notifyPanel(page).frameLocator('iframe').first().locator('body');
    await body.click();
    await page.keyboard.type(text);
    await sleep(300);
}

async function clearBody(page) {
    const body = notifyPanel(page).frameLocator('iframe').first().locator('body');
    await body.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await sleep(300);
}

/** "Save" → the window; returns its title, text and buttons (open). */
async function openConfirm(page) {
    await notifyPanel(page).getByRole('button', {name: 'Save', exact: true}).click();
    const dlg = page.getByRole('dialog').last();
    await dlg.waitFor({timeout: T});
    await sleep(300);
    return {
        name: await dlg.getAttribute('aria-label').catch(() => null),
        heading: flat(await dlg.locator('h1, h2, h3, [class*="title"], [class*="Title"]').first().innerText().catch(() => null), 200),
        text: flat(await dlg.innerText().catch(() => null), 600),
        buttons: (await dlg.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
    };
}

async function pressDialog(page, label) {
    const dlg = page.getByRole('dialog').last();
    await dlg.getByRole('button', {name: label, exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(700); // the modal store's 450 ms slot
}

/** "Send Email" in the open window; returns the _email answer (status, body). */
async function sendFromDialog(page) {
    const w = page.waitForResponse((r) => /\/api\/v1\/_email/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.getByRole('dialog').last().getByRole('button', {name: 'Send Email', exact: true}).click();
    const r = await w;
    let body = null;
    if (r) body = await r.text().catch(() => null);
    await sleep(400);
    return {status: r ? r.status() : null, body: body ? body.slice(0, 600) : null};
}

function jobsWith(app, needle) {
    const rows = sql(app, `select id, attempts, coalesce(reserved_at::text,'') from jobs where payload like '%${needle}%' order by id`);
    const failed = sql(app, `select count(*) from failed_jobs where payload like '%${needle}%'`);
    return {pending: rows ? rows.split('\n').length : 0, rows: rows ? rows.split('\n') : [], failed: parseInt(failed, 10)};
}

/** The user ids a queued BulkEmailSender job carries (serialized command). */
function jobUserIds(app, needle) {
    const out = sql(app, `select payload from jobs where payload like '%${needle}%' order by id`);
    if (!out) return [];
    return out.split('\n').map((p) => {
        const m = p.match(/userIds\\";a:\d+:\{([^}]*)\}/) || p.match(/userIds";a:\d+:\{([^}]*)\}/);
        return m ? (m[1].match(/i:\d+;i:(\d+);/g) || []).map((x) => parseInt(x.match(/i:\d+;i:(\d+);/)[1], 10)) : p.slice(0, 200);
    });
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const hasEditor = !isOPS;
    const assistantKey = isOPS ? 'editorialBoardMember' : 'copyeditor';
    let S = {};
    if (!process.env.RESEED && fs.existsSync(stateFile(app))) S = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    const save = () => fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
    const F = {app: app.name};
    const factsName = `k1-facts${process.env.PHASES ? '-' + process.env.PHASES.replace(/,/g, '_') : ''}`;
    const custom = [
        {key: 'nobody', level: 'author', name: 'Nobody role', abbrev: 'NOB'},
        {key: 'cmgr', level: 'manager', name: 'Custom manager', abbrev: 'CMG'},
    ];

    if (!S.A) {
        const t = tag('u55k1a');
        const U = (u, roles, g, f, extra = {}) => ({username: `${t}${u}`, roles, givenName: g, familyName: f, ...extra});
        const users = [
            U('mgr', ['manager'], 'Mira', 'Manager'),
            U('aa', ['author'], 'Alma', 'Active'),
            U('ab', ['author'], 'Bert', 'Disabled', {disabled: true}),
            U('ac', [], 'Cleo', 'Ended', {pastRoles: [{role: 'author'}]}),
            U('ad', ['author', 'reader'], 'Dora', 'Both'),
            U('rd', ['reader'], 'Rene', 'Reader'),
            U('se', ['sectionEditor'], 'Sami', 'Section'),
            U('as', [assistantKey], 'Asta', 'Assistant'),
            U('cm', ['cmgr'], 'Carl', 'Custommgr'),
        ];
        if (hasEditor) users.push(U('ed', ['editor'], 'Edda', 'Editor'), U('rv', ['externalReviewer'], 'Rolf', 'Reviewer'));
        const r = await app.api.createContext({tag: t, bulkEmails: true, customRoles: custom, users});
        S.A = t; S.Aid = r.contextId; S.Aroles = r.customRoles;
        const b = tag('u55k1b');
        const rb = await app.api.createContext({tag: b, bulkEmails: true, customRoles: [custom[0]], disableBulkEmailRoles: ['reader', 'nobody'], users: [{username: `${b}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'}]});
        S.B = b; S.Bid = rb.contextId;
        const u = tag('u55k1u');
        const ru = await app.api.createContext({tag: u, users: [{username: `${u}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'}]});
        S.U = u; S.Uid = ru.contextId;
        const s = tag('u55k1s');
        const rs = await app.api.createContext({tag: s, bulkEmails: true, users: [
            {username: `${s}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: `${s}aa`, roles: ['author'], givenName: 'Alma', familyName: 'Active'},
            {username: `${s}rd`, roles: ['reader'], givenName: 'Rene', familyName: 'Reader'},
        ]});
        S.S = s; S.Sid = rs.contextId;
        S.userIds = {};
        for (const [ctx, list] of [[S.A, ['mgr', 'aa', 'ab', 'ac', 'ad', 'rd', 'ed']], [S.S, ['mgr', 'aa', 'rd']]]) {
            for (const x of list) {
                const id = sql(app, `select user_id from users where username = '${ctx}${x}'`);
                if (id) S.userIds[`${ctx}${x}`] = parseInt(id, 10);
            }
        }
        S.userIds.admin = parseInt(sql(app, `select user_id from users where username = 'admin'`), 10);
        save();
        log('seeded', JSON.stringify(S));
    }
    const A = S.A;
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const step = async (name, fn) => {
        log(app.name, name);
        try {
            await fn();
        } catch (e) {
            F[`${name}Error`] = String(e.stack || e).slice(0, 1500);
            log(app.name, name, 'FAILED', String(e.message).slice(0, 300));
            await shot(page, `err-${name}`).catch(() => {});
        }
        record(factsName, F);
    };
    const as = async (user, ctx) => {
        await signIn(page, user, ctx ? {contextPath: ctx} : {});
        await idle(page).catch(() => {});
    };
    const subj = (w) => `${A} ${w}`;

    try {
        // ── gate: who opens Users & Roles and meets "Notify" ─────────────────
        if (on('gate')) await step('gate', async () => {
            const o = F.gate = {levels: {}};
            const levels = [['mgr', `${A}mgr`], ...(hasEditor ? [['ed', `${A}ed`]] : []), ['admin', 'admin'], ['cm', `${A}cm`], ['se', `${A}se`], ['as', `${A}as`], ...(hasEditor ? [['rv', `${A}rv`]] : []), ['aa', `${A}aa`], ['rd', `${A}rd`]];
            for (const [k, user] of levels) {
                await as(user, A);
                const a = await gotoAccess(page, app, A);
                const b = await gotoAccess(page, app, A, {hash: '#notify'});
                o.levels[k] = {user, plain: {status: a.status, tabs: a.tabs, h1: a.h1, body: a.tabs.length ? null : a.body.slice(0, 300)}, hash: {status: b.status, tabs: b.tabs, selected: b.selected, url: b.url}};
                await snap(page, `gate-${k}`);
                await signOut(page);
            }
            // U: bulk email off.
            await as(`${S.U}mgr`, S.U);
            const u = await gotoAccess(page, app, S.U);
            const uh = await gotoAccess(page, app, S.U, {hash: '#notify'});
            o.unticked = {tabs: u.tabs, hashSelected: uh.selected, hashUrl: uh.url, panelNotify: await notifyPanel(page).count()};
            await snap(page, 'gate-unticked-mgr');
            // A manager types the Site Administrator's addresses.
            await signOut(page);
            await as(`${A}mgr`, A);
            o.typed = {};
            for (const [k, p] of [['siteSettings', '/index.php/index/en/admin/settings'], ['wizard', `/index.php/index/en/admin/wizard/${S.Aid}`], ['wizardInCtx', `/index.php/${A}/en/admin/wizard/${S.Aid}`], ['contexts', '/index.php/index/en/admin/contexts']]) {
                const r = await page.goto(app.url(p)).catch((e) => ({err: String(e.message).slice(0, 200)}));
                await idle(page).catch(() => {});
                const html = await page.content().catch(() => '');
                o.typed[k] = {status: r && typeof r.status === 'function' ? r.status() : r, url: page.url(), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 200), body: flat(await page.locator('body').innerText().catch(() => ''), 300), hasDisableRoles: /Disable Roles|disableBulkEmailUserGroups/.test(html), hasBulkEmails: /enableBulkEmails/.test(html)};
                await snap(page, `gate-typed-${k}`);
            }
            // The journal's own Settings pages as its manager: no "Disable Roles".
            o.settingsPages = {};
            for (const p of ['context', 'website', 'workflow', 'distribution', 'access']) {
                const r = await page.goto(app.url(`/index.php/${A}/en/management/settings/${p}`)).catch(() => null);
                await idle(page).catch(() => {});
                const html = await page.content().catch(() => '');
                o.settingsPages[p] = {status: r ? r.status() : null, tabs: await tabsOf(page), disableRoles: /Disable Roles/.test(html), restrict: /Restrict Bulk Emails/.test(html), field: /disableBulkEmailUserGroups/.test(html)};
            }
            await signOut(page);
        });

        // ── fields: the form as it opens ─────────────────────────────────────
        if (on('fields')) await step('fields', async () => {
            const o = F.fields = {};
            await as(`${A}mgr`, A);
            const g = await gotoNotify(page, app, A);
            o.nav = {tabs: g.tabs, selected: await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), urlAfterTab: g.urlAfterTab};
            o.form = await readForm(page);
            const p = notifyPanel(page);
            o.toolbar = await p.locator('.tox-toolbar__group button, .tox-tbtn').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
            o.subjectTag = await p.locator('input[name="subject"]').evaluate((e) => ({type: e.type, tag: e.tagName, required: e.required, ariaRequired: e.getAttribute('aria-required')}));
            o.bodyHeight = await p.locator('.tox-tinymce').evaluate((e) => e.getBoundingClientRect().height).catch(() => null);
            o.buttons = (await p.getByRole('button').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean);
            o.legendHtml = await p.locator('legend').evaluateAll((els) => els.map((e) => e.innerHTML.replace(/\s+/g, ' ').slice(0, 300)));
            o.labelHtml = await p.locator('label.pkpFormFieldLabel').evaluateAll((els) => els.map((e) => e.innerHTML.replace(/\s+/g, ' ').slice(0, 300)));
            await snap(page, 'fields-notify-open');
            await loc(page, 'Notify tab', page.getByRole('tab', {name: 'Notify', exact: true}));
            await loc(page, 'Notify panel', notifyPanel(page));
            await loc(page, 'role box Author', p.getByRole('checkbox', {name: 'Author', exact: true}));
            await loc(page, 'Subject box', p.getByRole('textbox', {name: 'Subject', exact: true}));
            await loc(page, 'Email editor body', p.frameLocator('iframe').first().locator('body'));
            await loc(page, 'Copy box', p.getByRole('checkbox', {name: /^Send a copy of this email to me at /}));
            await loc(page, 'Save', p.getByRole('button', {name: 'Save', exact: true}));
            // The link button's window.
            await p.getByRole('button', {name: 'Insert/edit link'}).click().catch(() => {});
            await sleep(800);
            o.linkWindow = {dialogs: (await page.getByRole('dialog').allInnerTexts().catch(() => [])).map((x) => flat(x, 300))};
            await snap(page, 'fields-link-window');
            const tc = page.locator('.tox-dialog').getByRole('button', {name: 'Cancel'});
            if (await tc.count()) { await tc.first().click(); await sleep(400); }
            // Roles tab: the names the journal gives its roles.
            await page.getByRole('tab', {name: 'Roles', exact: true}).click();
            await idle(page).catch(() => {});
            await sleep(800);
            o.rolesTab = flat(await page.locator('#roles').innerText().catch(() => null), 3000);
            await snap(page, 'fields-roles-tab');
            // B: roles withheld.
            await signOut(page);
            await as(`${S.B}mgr`, S.B);
            await gotoNotify(page, app, S.B);
            o.B = await readForm(page);
            await snap(page, 'fields-B-restricted');
            // A tab left with changes, then the page left.
            await signOut(page);
            await as(`${A}mgr`, A);
            await gotoNotify(page, app, A);
            await tick(page, 'Author');
            await typeSubject(page, subj('left unsaved'));
            await typeBody(page, 'Typed then left.');
            const d0 = dialogs.length;
            await page.getByRole('tab', {name: 'Users', exact: true}).click();
            await idle(page).catch(() => {});
            await sleep(500);
            o.leftTab = {dialogs: dialogs.slice(d0), vueDialogs: (await page.getByRole('dialog').allInnerTexts().catch(() => [])).map((x) => flat(x, 200))};
            await page.getByRole('tab', {name: 'Notify', exact: true}).click();
            await sleep(600);
            o.afterReturn = await readForm(page);
            await snap(page, 'fields-left-tab-returned');
            const d1 = dialogs.length;
            await page.goto(app.url(`/index.php/${A}/en/submissions`)).catch((e) => { o.leaveErr = String(e.message).slice(0, 200); });
            await idle(page).catch(() => {});
            o.leftPage = {dialogs: dialogs.slice(d1), url: page.url()};
            await gotoNotify(page, app, A);
            o.afterComeBack = await readForm(page);
            await signOut(page);
        });

        // ── confirm: the window and its totals, Cancel ───────────────────────
        if (on('confirm')) await step('confirm', async () => {
            const o = F.confirm = {};
            await as(`${A}mgr`, A);
            await gotoNotify(page, app, A);
            o.empty = await openConfirm(page);
            await snap(page, 'confirm-empty');
            await loc(page, 'confirm window', page.getByRole('dialog').last());
            await loc(page, 'Send Email (window)', page.getByRole('dialog').last().getByRole('button', {name: 'Send Email', exact: true}));
            await loc(page, 'Cancel (window)', page.getByRole('dialog').last().getByRole('button', {name: 'Cancel', exact: true}));
            await pressDialog(page, 'Cancel');
            o.afterEmptyCancel = await readForm(page);
            const totals = {};
            const total = async (k, fn) => {
                await fn();
                const c = await openConfirm(page);
                totals[k] = c.text;
                await snap(page, `confirm-${k}`);
                await pressDialog(page, 'Cancel');
            };
            await total('author', async () => { await tick(page, 'Author'); });
            await typeSubject(page, subj('cancelled'));
            await typeBody(page, 'Cancel keeps this text.');
            await total('authorTyped', async () => {});
            await total('authorReader', async () => { await tick(page, 'Reader'); });
            await total('authorReaderCopy', async () => { await notifyPanel(page).getByRole('checkbox', {name: /^Send a copy of this email to me at /}).check(); });
            o.afterCancel = await readForm(page);
            await snap(page, 'confirm-after-cancel');
            await notifyPanel(page).getByRole('checkbox', {name: /^Send a copy of this email to me at /}).uncheck();
            await tick(page, 'Author', false);
            await tick(page, 'Reader', false);
            const mgrLabel = (await readForm(page)).boxes[0].label;
            o.firstBox = mgrLabel;
            await total('manager', async () => { await tick(page, mgrLabel); });
            await tick(page, mgrLabel, false);
            await total('nobody', async () => { await tick(page, 'Nobody role'); });
            await tick(page, 'Nobody role', false);
            await total('custommgr', async () => { await tick(page, 'Custom manager'); });
            await tick(page, 'Custom manager', false);
            if (hasEditor) {
                const edBox = (await readForm(page)).boxes.find((b) => /^(Journal|Press) editor$/.test(b.label));
                if (edBox) await total('editorTick', async () => { await tick(page, edBox.label); });
            }
            o.totals = totals;
            o.jobs = jobsWith(app, subj('cancelled'));
            await signOut(page);
        });

        // ── refuse: Rule 7 ───────────────────────────────────────────────────
        if (on('refuse')) await step('refuse', async () => {
            const o = F.refuse = {};
            await as(`${A}mgr`, A);
            await gotoNotify(page, app, A);
            o.dialog = await openConfirm(page);
            o.send = await sendFromDialog(page);
            await idle(page).catch(() => {});
            await sleep(500);
            o.after = await readForm(page);
            o.pageNotice = flat(await page.locator('body').innerText().then((t) => (t.match(/The form was not saved[^\n]*/) || [null])[0]).catch(() => null), 300);
            o.noticeWhere = await page.getByText(/The form was not saved/).first().evaluate((e) => {
                const out = [];
                let n = e;
                for (let i = 0; i < 5 && n; i++) { out.push(`${n.tagName}.${(n.className || '').toString().slice(0, 60)}#${n.id}|role=${n.getAttribute && n.getAttribute('role')}`); n = n.parentElement; }
                return out;
            }).catch(() => null);
            await snap(page, 'refuse-empty-sent');
            // Subject only.
            await typeSubject(page, subj('refused'));
            await sleep(400);
            o.afterSubject = await readForm(page);
            await snap(page, 'refuse-after-subject');
            await typeBody(page, 'Body typed after a refusal.');
            o.afterBody = await readForm(page);
            await tick(page, 'Author');
            await sleep(300);
            o.afterRole = await readForm(page);
            await snap(page, 'refuse-after-role');
            // One field left empty (Email cleared): the notice's count.
            await clearBody(page);
            o.dialog2 = await openConfirm(page);
            o.send2 = await sendFromDialog(page);
            await idle(page).catch(() => {});
            await sleep(500);
            o.after2 = await readForm(page);
            o.pageNotice2 = flat(await page.locator('body').innerText().then((t) => (t.match(/The form was not saved[^\n]*/) || [null])[0]).catch(() => null), 300);
            await snap(page, 'refuse-body-only-missing');
            // The other end: Save greyed; a field changed then changed back.
            await typeBody(page, 'x');
            o.afterBodyRetyped = await readForm(page);
            o.jobs = jobsWith(app, subj('refused'));
            // Reload: what the page shows after the refusal.
            await page.reload();
            await idle(page).catch(() => {});
            await sleep(500);
            o.reload = {selected: await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), url: page.url(), form: await readForm(page)};
            await snap(page, 'refuse-reloaded');
            await signOut(page);
        });

        // ── nobody: Rule 9 / A4 ──────────────────────────────────────────────
        if (on('nobody')) await step('nobody', async () => {
            const o = F.nobody = {};
            await as(`${A}mgr`, A);
            await gotoNotify(page, app, A);
            await tick(page, 'Nobody role');
            await typeSubject(page, subj('nobody'));
            await typeBody(page, 'To a role nobody holds.');
            o.dialog = await openConfirm(page);
            o.send = await sendFromDialog(page);
            o.at0 = await readForm(page);
            await snap(page, 'nobody-sent-at-once');
            await sleep(6500);
            o.at6 = await readForm(page);
            await snap(page, 'nobody-sent-6s');
            o.jobs = jobsWith(app, subj('nobody'));
            o.batches = sql(app, `select count(*) from job_batches where created_at > extract(epoch from now())::int - 120`);
            await page.reload();
            await idle(page).catch(() => {});
            o.reload = {selected: await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), url: page.url()};
            // The other end: "Copy" ticked.
            await gotoNotify(page, app, A);
            await tick(page, 'Nobody role');
            await typeSubject(page, subj('nobodycopy'));
            await typeBody(page, 'To a role nobody holds, with a copy.');
            await notifyPanel(page).getByRole('checkbox', {name: /^Send a copy of this email to me at /}).check();
            o.dialogCopy = await openConfirm(page);
            o.sendCopy = await sendFromDialog(page);
            await sleep(500);
            o.copyAfter = await readForm(page);
            await snap(page, 'nobody-copy-sent');
            o.jobsCopy = jobsWith(app, subj('nobodycopy'));
            o.jobsCopyUsers = jobUserIds(app, subj('nobodycopy'));
            await signOut(page);
        });

        // ── sent: Rule 8 ─────────────────────────────────────────────────────
        if (on('sent')) await step('sent', async () => {
            const o = F.sent = {};
            await as(`${A}mgr`, A);
            await gotoNotify(page, app, A);
            await tick(page, 'Author');
            await tick(page, 'Reader');
            await typeSubject(page, subj('sent'));
            await typeBody(page, 'Office closed next week.');
            o.dialog = await openConfirm(page);
            o.send = await sendFromDialog(page);
            await idle(page).catch(() => {});
            o.after = await readForm(page);
            o.lineHtml = await notifyPanel(page).evaluate((e) => e.innerHTML.replace(/\s+/g, ' ').slice(0, 1500)).catch(() => null);
            o.lineControls = await notifyPanel(page).locator('a, button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({tag: e.tagName, role: e.getAttribute('role'), text: e.innerText.trim(), href: e.getAttribute('href')})));
            await snap(page, 'sent-line');
            await loc(page, 'queued line', notifyPanel(page).getByText(/successfully queued/));
            await loc(page, 'Send another email', notifyPanel(page).getByRole('button', {name: 'Send another email'}));
            for (const tname of ['Roles', 'Users', 'Site Access Options']) {
                await page.getByRole('tab', {name: tname, exact: true}).click();
                await sleep(500);
            }
            await page.getByRole('tab', {name: 'Notify', exact: true}).click();
            await sleep(500);
            o.afterTabs = await readForm(page);
            await snap(page, 'sent-line-after-tabs');
            o.jobs = jobsWith(app, subj('sent'));
            o.jobUsers = jobUserIds(app, subj('sent'));
            // "Send another email".
            const nav = page.waitForEvent('load', {timeout: T}).catch(() => null);
            const another = notifyPanel(page).getByRole('button', {name: 'Send another email'});
            const anotherLink = notifyPanel(page).getByRole('link', {name: 'Send another email'});
            if (await another.count()) await another.click(); else await anotherLink.click();
            o.reloaded = !!(await nav);
            await idle(page).catch(() => {});
            await waitEditor(page);
            await sleep(500);
            o.afterAnother = {url: page.url(), selected: await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), form: await readForm(page)};
            await snap(page, 'sent-another');
            await signOut(page);
        });

        // ── levels: every manager, the Site Administrator included ───────────
        if (on('levels')) await step('levels', async () => {
            const o = F.levels = {};
            for (const [k, user] of [...(hasEditor ? [['ed', `${A}ed`]] : []), ['admin', 'admin']]) {
                await as(user, A);
                const g = await gotoNotify(page, app, A);
                if (!g.notify) { o[k] = {notify: false, tabs: g.tabs}; await signOut(page); continue; }
                const f = await readForm(page);
                await tick(page, 'Nobody role');
                await typeSubject(page, subj(`level ${k}`));
                await typeBody(page, `Sent as ${k}.`);
                await notifyPanel(page).getByRole('checkbox', {name: /^Send a copy of this email to me at /}).check();
                const c = await openConfirm(page);
                const s = await sendFromDialog(page);
                await idle(page).catch(() => {});
                const after = await readForm(page);
                await snap(page, `levels-${k}-sent`);
                await page.reload();
                await idle(page).catch(() => {});
                await waitEditor(page);
                await sleep(500);
                const reload = {url: page.url(), selected: await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), form: await readForm(page)};
                await snap(page, `levels-${k}-reloaded`);
                o[k] = {copyLabel: f.copy, confirm: c.text, send: s, queued: after.queued, reload, jobs: jobsWith(app, subj(`level ${k}`)), jobUsers: jobUserIds(app, subj(`level ${k}`))};
                await signOut(page);
            }
        });

        // ── stale: Rule 10 ───────────────────────────────────────────────────
        if (on('stale')) await step('stale', async () => {
            const o = F.stale = {};
            const C = S.S;
            await as(`${C}mgr`, C);
            await gotoNotify(page, app, C);
            o.before = (await readForm(page)).boxes.map((b) => b.label);
            // The Site Administrator restricts "Author" in a second browser.
            const adm = await launch(app);
            try {
                await signIn(adm.page, 'admin');
                await adm.page.goto(app.url(`/index.php/index/en/admin/wizard/${S.Sid}`));
                await idle(adm.page).catch(() => {});
                await adm.page.getByRole('tab', {name: 'Restrict Bulk Emails'}).click();
                const wp = adm.page.locator('[role="tabpanel"]:visible').last();
                await wp.getByRole('checkbox', {name: 'Author', exact: true}).check();
                const w = adm.page.waitForResponse((r) => /\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await wp.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                o.restrictSave = r ? r.status() : null;
                await sleep(800);
                await snap(adm.page, 'stale-admin-restricted');
            } finally {
                await adm.close();
            }
            o.stillOffered = (await readForm(page)).boxes.map((b) => b.label);
            await tick(page, 'Author');
            await typeSubject(page, subj('stale restricted'));
            await typeBody(page, 'Sent to a role restricted after the page opened.');
            o.dialog = await openConfirm(page);
            o.send = await sendFromDialog(page);
            await idle(page).catch(() => {});
            await sleep(500);
            o.after = await readForm(page);
            o.pageNotice = flat(await page.locator('body').innerText().then((t) => (t.match(/The form was not saved[^\n]*/) || [null])[0]).catch(() => null), 300);
            await snap(page, 'stale-restricted-refused');
            o.jobs = jobsWith(app, subj('stale restricted'));
            // A page opened now, then the journal unticked under "Bulk Emails".
            await gotoNotify(page, app, C);
            o.reopened = (await readForm(page)).boxes.map((b) => b.label);
            await snap(page, 'stale-reopened');
            const id = S.Sid;
            sql(app, `begin; select 1 from site for update; update site_settings set setting_value = coalesce((select json_agg(x::int)::text from json_array_elements_text(setting_value::json) x where x::int <> ${id}), '[]') where setting_name = 'enableBulkEmails'; commit;`);
            o.listHasId = JSON.parse(sql(app, `select setting_value from site_settings where setting_name='enableBulkEmails'`)).includes(id);
            await tick(page, 'Reader');
            await typeSubject(page, subj('stale unticked'));
            await typeBody(page, 'Sent after the journal was unticked.');
            o.dialog2 = await openConfirm(page);
            o.send2 = await sendFromDialog(page);
            await idle(page).catch(() => {});
            await sleep(500);
            o.after2 = await readForm(page);
            o.pageNotice2 = flat(await page.locator('body').innerText().then((t) => (t.match(/(The form was not saved|The email notification)[^\n]*/g) || []).join(' || ')).catch(() => null), 400);
            await snap(page, 'stale-unticked-refused');
            o.jobs2 = jobsWith(app, subj('stale unticked'));
            const g = await gotoAccess(page, app, C);
            o.afterReload = {tabs: g.tabs};
            await snap(page, 'stale-unticked-reloaded');
            await signOut(page);
        });

        // ── toast: what the page adds after a refusal, caught as it appears ──
        if (on('toast')) await step('toast', async () => {
            const o = F.toast = {};
            const t = tag('u55k1t');
            const rt = await app.api.createContext({tag: t, bulkEmails: true, users: [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
                {username: `${t}rd`, roles: ['reader'], givenName: 'Rene', familyName: 'Reader'},
            ]});
            S.T = t; S.Tid = rt.contextId; save();
            const watch = async () => page.evaluate(() => {
                window.__added = [];
                const start = Date.now();
                window.__obs && window.__obs.disconnect();
                window.__obs = new MutationObserver((ms) => {
                    for (const m of ms) {
                        for (const n of m.addedNodes) {
                            const txt = (n.innerText || n.textContent || '').trim();
                            if (txt) window.__added.push({ms: Date.now() - start, tag: n.nodeName, cls: (n.className || '').toString().slice(0, 80), text: txt.slice(0, 300)});
                        }
                    }
                });
                window.__obs.observe(document.body, {childList: true, subtree: true});
            });
            const added = async () => page.evaluate(() => (window.__added || []).filter((x) => !/^\s*$/.test(x.text)).slice(0, 60)).catch(() => null);
            await as(`${t}mgr`, t);
            await gotoNotify(page, app, t);
            // Rule 7: an empty send.
            await openConfirm(page);
            await watch();
            o.empty = await sendFromDialog(page);
            await sleep(150);
            await shot(page, 'toast-empty-150ms');
            await sleep(3000);
            o.emptyAdded = await added();
            await snap(page, 'toast-empty-3s');
            // "Jump to next error" and a "Go to" entry.
            const jump = notifyPanel(page).getByRole('button', {name: 'Jump to next error'});
            o.jump = [];
            for (let i = 0; i < 4 && (await jump.count()); i++) {
                await jump.click();
                await sleep(400);
                o.jump.push(await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}#${e.id}|${e.getAttribute('name')}|${e.getAttribute('aria-label')}` : null; }));
            }
            const goRoles = notifyPanel(page).getByRole('button', {name: /^Go to Roles:/});
            if (await goRoles.count()) {
                o.goRolesVisible = await goRoles.isVisible();
                await goRoles.focus().catch(() => {});
                await page.keyboard.press('Enter');
                await sleep(400);
                o.goRoles = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}#${e.id}|${e.getAttribute('name')}|${(e.value || '')}` : null; });
            }
            // Rule 10: unticked under the open page.
            await page.reload();
            await idle(page).catch(() => {});
            await waitEditor(page);
            await tick(page, 'Reader');
            await typeSubject(page, subj('toast unticked'));
            await typeBody(page, 'Sent after the journal was unticked.');
            sql(app, `begin; select 1 from site for update; update site_settings set setting_value = coalesce((select json_agg(x::int)::text from json_array_elements_text(setting_value::json) x where x::int <> ${S.Tid}), '[]') where setting_name = 'enableBulkEmails'; commit;`);
            await openConfirm(page);
            await watch();
            o.unticked = await sendFromDialog(page);
            await sleep(150);
            await shot(page, 'toast-unticked-150ms');
            await sleep(3000);
            o.untickedAdded = await added();
            o.untickedForm = await readForm(page);
            await snap(page, 'toast-unticked-3s');
            o.jobs = jobsWith(app, subj('toast unticked'));
            await signOut(page);
        });

        // ── mail: the queue and Mailpit for this chunk's subjects ────────────
        if (on('mail')) await step('mail', async () => {
            const o = F.mail = {};
            const pending = sql(app, `select id, left(payload, 0) from jobs where payload like '%u55k2%'`);
            o.k2Pending = pending ? pending.split('\n').length : 0;
            o.mine = jobsWith(app, A);
            if (!o.k2Pending && o.mine.pending) {
                const root = path.resolve(process.cwd(), app.root);
                try {
                    o.run = flat(execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: root, env: {...process.env, PKP_CONFIG_FILE: app.configFile.startsWith('/') ? app.configFile : path.resolve(process.cwd(), app.configFile)}, encoding: 'utf8', timeout: 300000}), 400);
                } catch (e) { o.run = `ERR ${flat(String(e.stdout || e.message), 400)}`; }
            }
            o.mineAfter = jobsWith(app, A);
            await sleep(3000);
            o.inboxes = {};
            for (const x of ['aa', 'ab', 'ac', 'ad', 'rd', 'mgr', 'ed', 'se']) {
                const r = await app.mail._search({to: `${A}${x}@mail.test`});
                o.inboxes[x] = (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, to: (m.To || []).map((t) => t.Address), cc: (m.Cc || []).map((t) => t.Address), bcc: (m.Bcc || []).length}));
            }
            const ra = await app.mail._search({to: 'admin@mail.test', subject: subj('level admin')});
            o.inboxes.admin = (ra.messages || []).map((m) => ({subject: m.Subject, to: (m.To || []).map((t) => t.Address)}));
            const rs = await app.mail._search({to: `${S.S}aa@mail.test`});
            const rs2 = await app.mail._search({to: `${S.S}rd@mail.test`});
            o.inboxes.staleAa = (rs.messages || []).map((m) => m.Subject);
            o.inboxes.staleRd = (rs2.messages || []).map((m) => m.Subject);
        });
    } finally {
        F.dialogs = dialogs;
        record(factsName, F);
        await close();
    }
});
