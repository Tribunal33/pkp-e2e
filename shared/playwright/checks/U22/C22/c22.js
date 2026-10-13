// U22 claim check, chunk C22 (housekeeping 2026-10-13): incidentals row 11, the sign-in landing of
// an account whose only roles in the journal are two Reader-level groups.
// Spec: docs/specs/U22-my-submissions.md — Rule 3 "Landing" and fn-c (getHomeUrl(): "none, or Reader
// alone → the journal's index"). Code: PKPPageRouter::getHomeUrl() tests count() == 1 && READER, so
// two Reader-level groups fall through to the last branch, `{journal}/submissions`, whose
// DashboardHandler refuses the Reader level.
//
//   PROBE_FEATURE=U22 PROBE_AGENT=ccC22 PROBE_RUN=r1 bin/app-lock.sh shared <app> -- \
//       node bin/probe.js <app> shared/playwright/checks/U22/C22/c22.js
//
// Per app and run, a fresh scratch journal (tag prefix u22c22) with:
//   mg  Journal Manager: signs in (control landing), Settings › Users & Roles › "Roles" ›
//       "Create New Role" at the "Reader" permission level ("Second Reader <tag>", "RD2"), "OK";
//       the list read right after and after a reload.
//   r2  Reader, plus the created Reader-level role (a user_user_groups row with a back-dated
//       start, users.md "Traps": no scenario key grants a created role).  THE CASE.
//   r1  Reader alone (control: Rule 3's "with only Reader, on the journal's home page").
//   au  Author alone (control: My Submissions).
//   r3  the created Reader-level role alone (its default Reader row deleted): one Reader-level
//       group that is not the default Reader (the other end of r1).
//   nr  no role in the journal at all (its Reader row deleted): fn-c's "none" end. (`admin` is not
//       that end: a scratch context enrols the installer's admin as its Journal Manager.)
//   sm  {OJS} Subscription Manager alone (sweep: another role none of getHomeUrl()'s named
//       branches matches).
// Each signs in on the journal's own login page (fresh browser): the document chain, the final
// address, the screen, the shot; then types `{journal}/submissions` and
// `{journal}/dashboard/mySubmissions`. r2 also signs in on the site-wide login page (the other end of
// "the journal's own login page") and reads what the landing page offers (its links pressed);
// r2 and r1 open the frontend user menu and press each entry but "Logout".
// Run 2026-10-13 as r1…r5 (r1 without r3/nr, with an invalid admin "none" case; r4, r5 with the user menu).
// No assertions: the script records, the reader judges. Facts: c22-facts[-<run>]-<app>.json.
'use strict';

const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const facts = {app: app.name, line: app.line || 'main', errors: {}};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
        record('c22-facts', facts);
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            facts.errors[key] = String(e.stack || e).slice(0, 900);
            console.error(`[${app.name}] ${key} FAILED: ${e.message}`);
            record('c22-facts', facts);
        }
    };

    await app.api.bootstrapProbe(app.contextPath);
    const t = tag('u22c22');
    const users = [
        {username: `${t}mg`, roles: ['manager'], givenName: 'Mara', familyName: 'Manager'},
        {username: `${t}r2`, roles: ['reader'], givenName: 'Rita', familyName: 'Tworeader'},
        {username: `${t}r1`, roles: ['reader'], givenName: 'Ron', familyName: 'Onereader'},
        {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
        {username: `${t}r3`, roles: ['reader'], givenName: 'Rae', familyName: 'Createdreader'},
        {username: `${t}nr`, roles: ['reader'], givenName: 'Nell', familyName: 'Norole'},
    ];
    if (isOJS) users.push({username: `${t}sm`, roles: ['subscriptionManager'], givenName: 'Sam', familyName: 'Subs'});
    const c = await app.api.createContext({tag: t, context: {name: `U22 C22 ${t}`, acronym: 'U22C22', contactName: 'C22 Contact', contactEmail: `${t}c@mail.test`}, users});
    const C = (c && c.path) || t;
    fact('context', {tag: t, path: C, id: c && (c.id || c.contextId)});
    const cu = (p = '') => app.url(`/index.php/${C}${p}`);
    const ROLE = {name: `Second Reader ${t.slice(-6)}`, abbrev: 'RD2'};

    let n = 0;
    /** One browser = one person, with its document chain, bad answers and page errors. */
    async function person(label) {
        const b = await launch(app);
        const P = {label, page: b.page, close: b.close, docs: [], bad: [], errors: [], dialogs: []};
        P.page.on('dialog', (d) => { P.dialogs.push({type: d.type(), message: flat(d.message(), 300)}); });
        P.page.context().on('response', (r) => {
            const req = r.request();
            if (req.resourceType() === 'document') P.docs.push(`${req.method()} ${r.status()} ${strip(r.url()).slice(0, 200)}`);
            if (r.status() >= 400) P.bad.push(`${req.method()} ${r.status()} ${strip(r.url()).slice(0, 200)}`);
        });
        P.page.on('pageerror', (e) => P.errors.push(flat(e.message, 300)));
        P.take = () => {
            const o = {docs: P.docs.splice(0), bad: P.bad.splice(0), pageErrors: P.errors.splice(0), dialogs: P.dialogs.splice(0)};
            return o;
        };
        P.read = async (name, {png = false} = {}) => {
            await idle(P.page).catch(() => {});
            let s;
            try { s = await screen(P.page); } catch (e) { s = {url: P.page.url(), error: String(e.message).slice(0, 200)}; }
            record(`${String(++n).padStart(2, '0')}-${name}`, s);
            if (png) await shot(P.page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
            const h1 = await P.page.locator('h1').first().innerText({timeout: 3000}).catch(() => null);
            const title = await P.page.title().catch(() => null);
            const mainText = flat(s && s.text && (s.text.main || s.text.body || s.text.header), 600);
            return {url: strip(P.page.url()), title, h1: flat(h1, 200), text: mainText, notices: s && s.notices, dialog: flat(s && s.text && s.text.dialog, 300)};
        };
        return P;
    }

    async function land(P, username, label, {siteLogin = false} = {}) {
        P.take();
        await signIn(P.page, username, siteLogin ? {} : {contextPath: C});
        await P.page.waitForLoadState('load').catch(() => {});
        await sleep(1200);
        const r = await P.read(`${label}-landing${siteLogin ? '-site' : ''}`, {png: true});
        return Object.assign(r, P.take());
    }
    async function typed(P, label, p) {
        P.take();
        const resp = await P.page.goto(cu(p)).catch((e) => ({err: String(e.message).slice(0, 200)}));
        await sleep(800);
        const r = await P.read(`${label}-typed-${p.replace(/\W+/g, '-')}`);
        return Object.assign({status: resp && typeof resp.status === 'function' ? resp.status() : resp && resp.err}, r, P.take());
    }

    // ---- the manager creates the second Reader-level role, through the screen ----
    await step('createRole', async () => {
        const P = await person('mg');
        try {
            fact('mg landing (control)', await land(P, `${t}mg`, 'mg'));
            const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
            const stages = {ojs: ['Submission', 'Review', 'Copyediting', 'Production'],
                omp: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], ops: ['Production']}[app.name];
            const tab = new RolesTab(P.page, C, {stages});
            await tab.goto();
            const before = await tab.rowNames();
            await P.read('roles-tab');
            const win = await tab.openCreate();
            const levels = await win.levelOptions();
            await win.chooseLevel('Reader');
            await sleep(1200);
            const stageShown = await win.stageSection.isVisible().catch(() => null);
            await win.nameBox().fill(ROLE.name);
            await win.abbrevBox().fill(ROLE.abbrev);
            const w = await P.read('role-window', {png: true});
            await loc(P.page, 'Create New Role window: Permission level select', win.level);
            const resp = await win.save();
            const afterSave = await tab.rowNames();
            await P.read('roles-after-save');
            await tab.reload();
            const afterReload = await tab.rowNames();
            fact('role created', {levels, stageShown, windowDialog: w.dialog, status: resp.status(), before, afterSave, afterReload,
                listedAfterSave: afterSave.includes(ROLE.name), listedAfterReload: afterReload.includes(ROLE.name), traffic: P.take()});
        } finally {
            await P.close();
        }
    });

    // ---- the second Reader-level group given to r2 (no screen grants a created role to an existing account without an emailed invitation) ----
    await step('assign', async () => {
        const ctxId = sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path='${C}'`);
        const gid = sql(app, `SELECT ug.user_group_id FROM user_groups ug JOIN user_group_settings s ON s.user_group_id=ug.user_group_id
            WHERE ug.context_id=${ctxId} AND s.setting_name='name' AND s.setting_value='${ROLE.name}' LIMIT 1`);
        const uid = sql(app, `SELECT user_id FROM users WHERE username='${t}r2'`);
        if (!gid || !uid) throw new Error(`no group (${gid}) or user (${uid})`);
        sql(app, `INSERT INTO user_user_groups (user_group_id, user_id, date_start, masthead) VALUES (${gid}, ${uid}, now() - interval '1 day', 0)`);
        const groups = (id) => sql(app, `SELECT ug.role_id, ug.user_group_id, uug.date_start, uug.date_end FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id=uug.user_group_id
            WHERE uug.user_id=${id} AND ug.context_id=${ctxId} ORDER BY ug.user_group_id`).split('\n').filter(Boolean);
        fact('r2 groups in the journal', {ctxId, gid, uid, rows: groups(uid)});
        // r3: the created Reader-level role in place of the default Reader
        const uid3 = sql(app, `SELECT user_id FROM users WHERE username='${t}r3'`);
        sql(app, `DELETE FROM user_user_groups WHERE user_id=${uid3} AND user_group_id IN (SELECT user_group_id FROM user_groups WHERE context_id=${ctxId})`);
        sql(app, `INSERT INTO user_user_groups (user_group_id, user_id, date_start, masthead) VALUES (${gid}, ${uid3}, now() - interval '1 day', 0)`);
        fact('r3 groups in the journal', {uid: uid3, rows: groups(uid3)});
        // nr: no role in this journal
        const uidn = sql(app, `SELECT user_id FROM users WHERE username='${t}nr'`);
        sql(app, `DELETE FROM user_user_groups WHERE user_id=${uidn} AND user_group_id IN (SELECT user_group_id FROM user_groups WHERE context_id=${ctxId})`);
        fact('nr groups in the journal', {uid: uidn, rows: groups(uidn),
            anywhere: sql(app, `SELECT ug.context_id, ug.role_id FROM user_user_groups uug JOIN user_groups ug USING (user_group_id) WHERE uug.user_id=${uidn}`).split('\n').filter(Boolean)});
    });

    // ---- each account signs in on the journal's own login page ----
    const cases = [[`${t}r2`, 'r2'], [`${t}r1`, 'r1'], [`${t}r3`, 'r3'], [`${t}nr`, 'nr'], [`${t}au`, 'au']];
    if (isOJS) cases.push([`${t}sm`, 'sm']);
    for (const [username, label] of cases) {
        await step(label, async () => {
            const P = await person(label);
            try {
                const l = await land(P, username, label);
                fact(`${label} signs in (journal login)`, l);
                if (label === 'r2') {
                    await loc(P.page, 'landing page h1 (two Reader-level groups)', P.page.locator('h1').first());
                    // what the landing page offers: its links (main), pressed one by one
                    const links = await P.page.locator('main a, .pkp_structure_main a').evaluateAll((els) =>
                        els.filter((e) => e.getClientRects().length).map((e) => ({text: (e.innerText || '').replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')}))).catch(() => []);
                    const header = await P.page.locator('header a, nav a').evaluateAll((els) =>
                        els.filter((e) => e.getClientRects().length).map((e) => ({text: (e.innerText || '').replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')}))).catch(() => []);
                    fact('r2 landing offers', {mainLinks: links, headerLinks: header.slice(0, 40)});
                    const pressed = [];
                    const landed = P.page.url();
                    for (const lk of links.slice(0, 6)) {
                        if (!lk.href || lk.href.startsWith('#') || /signOut/.test(lk.href)) continue;
                        P.take();
                        await P.page.goto(landed).catch(() => {});
                        await idle(P.page).catch(() => {});
                        const a = P.page.locator('main a, .pkp_structure_main a').filter({hasText: lk.text}).first();
                        if (!(await a.count())) { pressed.push({link: lk, gone: true}); continue; }
                        await a.click({timeout: 8000}).catch(() => {});
                        await P.page.waitForLoadState('load').catch(() => {});
                        await sleep(800);
                        const r = await P.read(`r2-pressed-${pressed.length}`);
                        pressed.push(Object.assign({link: lk}, {url: r.url, h1: r.h1, text: flat(r.text, 200)}, P.take()));
                    }
                    fact('r2 landing links pressed', pressed);
                }
                if (label === 'r2' || label === 'r1') {
                    // the user menu of the landing page (top right): its entries, each pressed from the landing page
                    const landed = P.page.url();
                    const toggle = P.page.locator('#navigationUser a.dropdown-toggle, #navigationUser > li > a').first();
                    const items = [];
                    if (await toggle.count()) {
                        await toggle.click().catch(() => {});
                        await sleep(500);
                        const entries = await P.page.locator('#navigationUser ul.dropdown-menu a').evaluateAll((els) =>
                            els.map((e) => ({text: (e.innerText || '').replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')}))).catch(() => []);
                        await P.read(`${label}-usermenu-open`);
                        for (const e of entries) {
                            if (!e.href || /signOut|logout/i.test(e.href)) { items.push({entry: e, pressed: false}); continue; }
                            await P.page.goto(landed).catch(() => {});
                            await idle(P.page).catch(() => {});
                            P.take();
                            await P.page.locator('#navigationUser a.dropdown-toggle, #navigationUser > li > a').first().click().catch(() => {});
                            await sleep(400);
                            await P.page.locator('#navigationUser ul.dropdown-menu a').filter({hasText: e.text}).first().click({timeout: 8000}).catch(() => {});
                            await P.page.waitForLoadState('load').catch(() => {});
                            await sleep(800);
                            const r = await P.read(`${label}-usermenu-${items.length}`);
                            items.push(Object.assign({entry: e}, {url: r.url, h1: r.h1, text: flat(r.text, 160)}, P.take()));
                        }
                        await loc(P.page, 'frontend user menu toggle (#navigationUser)', toggle);
                    }
                    fact(`${label} user menu`, items.length ? items : 'no user menu toggle found');
                    await P.page.goto(landed).catch(() => {});
                    await idle(P.page).catch(() => {});
                }
                fact(`${label} types submissions`, await typed(P, label, '/en/submissions'));
                fact(`${label} types dashboard/mySubmissions`, await typed(P, label, '/en/dashboard/mySubmissions'));
                if (label === 'r2') {
                    fact('r2 types index (the journal home)', await typed(P, label, '/en/index'));
                    await signOut(P.page).catch(() => {});
                    fact('r2 signs in (site-wide login)', await land(P, username, label, {siteLogin: true}));
                    // a second sign-in on the journal's login page: every sign-in, not the first only
                    await signOut(P.page).catch(() => {});
                    fact('r2 signs in again (journal login)', await land(P, username, `${label}-again`));
                }
                await signOut(P.page).catch(() => {});
            } finally {
                await P.close();
            }
        });
    }
    record('c22-facts', facts);
});
