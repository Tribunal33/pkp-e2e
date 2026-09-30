// U53 claim check, chunk I30 (housekeeping 2026-09-30): the "Roles" and "Start Date" cells of Settings › Users & Roles
// › "Users" for dated roles, against "Editorial Masthead" (and "Editorial History").
// Chunk: .reports/hk30/chunks/U53.md, incidental row R8 (U63 K3-8: a 2020–2030 role printed nothing, a role starting
// 2027-06-01 printed with that date).
// Spec: docs/specs/U53-users-management.md — Fields "Roles" and "Start Date" (lines 63-64, note b), note c's
// "the list keeps the user … the cells print only groups with no dateEnd" (lines 1278-1280).
//
//   PROBE_FEATURE=U53 PROBE_AGENT=ccI30u53 PROBE_RUN=r1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U53/I30/i30.js
//   PHASES=seed,import,invite,newinv,read,other,menu,remove,leave (the default, in order). The state lives in
//   i30-state-<PROBE_RUN>-<app>.json in the output folder (RESEED=1 starts over); every run seeds its own scratch
//   context (tag prefix u53i30), so r1 and r2 may run at once.
//
// Scratch context J per app and run (every username carries the tag):
//   m    manager (imports, invites, reads the list); admin is the context's manager by the factory and reads too.
//   o    Section editor (OMP Series editor, OPS Moderator) from today, no end: the open control.
//   pr   the same role 2020-01-01 – 2021-06-30 only (seed `pastRoles`): an ended role.
//   inv  Reader, then invited on screen (the row's "Edit") to the section-editor role starting 2027-06-01 and
//        accepted from the emailed link: the one screen route to a dated role on all three apps.
//   nf   a new account made by accepting an invitation to the section-editor role starting 2027-06-01 (its only
//        role; the one screen route to a role not begun as the only role on a preprint server)
//   Users XML import {OJS OMP}, one file, the section-editor role unless named:
//   fen  2020-01-01 – 2030-12-31 (current, future end; the incidental's user)
//   fut  from 2027-06-01, no end (future start; the incidental's second user)
//   ffe  2027-06-01 – 2030-12-31 (future start and future end)
//   two  Reader from 2020-01-01, no end, plus the role 2020-01-01 – 2030-12-31 (the per-line read)
//   ipe  2020-01-01 – 2021-06-30 (ended, by the file)
//   pst  from 2020-01-01, no end (past start, the import's control)
//   fu2  from 2027-06-01, no end: the "Remove User" › "OK" target
// Phases:
//   seed    the scratch context
//   import  {OJS OMP} m imports the file (Tools › Users XML Plugin); the plugin's "Export Users" grid read after
//   invite  m: inv's row "Edit" › "Add Another Role", start 2027-06-01, sent; inv accepts from the link signed out
//   read    the list as m and as admin (cells per line, the list's own GET), each tagged user's roles page,
//           "Editorial Masthead" and "Editorial History" signed out; the list again after a reload
//   other   a second context J2 gives o an Author role (the scenario names the existing account); J's list read as m
//           (o's row, a role in another context), and admin's roles page on J (the manager role with no start date)
//   menu    m: each tagged row's "…" menu; "Disable User" on fen read and cancelled
//   newinv  m: "Invite to a role" for a new email (nf), start 2027-06-01; accepted from the link, account created
//   remove  m: "Remove User" › "OK" on fu2 {OJS OMP} and nf (a role not begun, the only one): the list on the page
//           after the answer's "OK", after a reload, the roles page
//   leave   m: a search phrase typed and not entered, then the "Roles" tab and back (the Users tab left unsaved)
// publicknowledge and the roster are not touched. No assertions: the script records, the reader judges.
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, sql} = require('../../../probe');

const T = 30_000;
const RUN = process.env.PROBE_RUN || 'r0';
const ALL = ['seed', 'import', 'invite', 'newinv', 'read', 'other', 'menu', 'remove', 'leave'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[u53i30 ${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const FUTURE = '2027-06-01';
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};

// ---- Users XML file (the U63 K3 builder, trimmed) ------------------------------------------------------------------
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const GROUPS = '\t<user_groups>\n\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n\t</user_groups>\n';
function userXml({given, family, email, username, password, roles}) {
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start ? `\t\t\t\t<date_start>${x.start} 00:00:00</date_start>\n` : ''}${x.end ? `\t\t\t\t<date_end>${x.end} 00:00:00</date_end>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">${given}</givenname>\n\t\t\t<familyname locale="en">${family}</familyname>\n\t\t\t<email>${email}</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${password}</value>\n\t\t\t</password>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n${GROUPS}\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

// ---- the list ------------------------------------------------------------------------------------------------------
const usersTable = (page) => page.getByRole('table', {name: /Current Users \(/});
const userRow = (page, text) => usersTable(page).locator('tbody tr').filter({hasText: text});

async function snap(page, name, extra = {}) {
    const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 300)}));
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

/** The list as data: heading, columns, and per row the cells and each role/date line. */
async function readList(page) {
    const heading = flat(await page.getByRole('heading', {name: /Current Users/}).first().innerText().catch(() => null), 200);
    if (!(await usersTable(page).count())) return {heading, table: null};
    const table = await usersTable(page).evaluate((tb) => {
        const lines = (td) => (td ? [...td.children].map((d) => d.textContent.replace(/\s+/g, ' ').trim()) : []);
        return {
            heads: [...tb.querySelectorAll('thead th')].map((th) => th.textContent.replace(/\s+/g, ' ').trim()),
            rows: [...tb.querySelectorAll('tbody tr')].map((tr) => {
                const tds = [...tr.querySelectorAll('td')];
                return {cells: tds.map((td) => td.innerText.replace(/[ \t]+/g, ' ').trim()), roleLines: lines(tds[2]), dateLines: lines(tds[3]), roleHtml: tds[2] ? tds[2].innerHTML.replace(/\s+/g, ' ').slice(0, 400) : null, dateHtml: tds[3] ? tds[3].innerHTML.replace(/\s+/g, ' ').slice(0, 400) : null};
            }),
        };
    });
    return {heading, table};
}

async function closeMenus(page) {
    const items = page.getByRole('menuitem');
    for (let i = 0; i < 3 && (await items.count()) > 0; i++) {
        await page.keyboard.press('Escape');
        await sleep(300);
        if ((await items.count()) > 0) await page.locator('h1').first().click({force: true}).catch(() => {});
        await sleep(300);
    }
}

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const SE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'}[app.name];
    const statePath = outFile('i30-state.json');
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('i30-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 1800)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const ctxTable = isOMP ? 'presses' : isOPS ? 'servers' : 'journals';
    const ctxId = isOMP ? 'press_id' : isOPS ? 'server_id' : 'journal_id';
    const uug = (u) => { try { return sql(app, `select (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id join users u on u.user_id = uug.user_id where u.username = '${u}' and ug.context_id = (select ${ctxId} from ${ctxTable} where path = '${S.J}') order by uug.date_start`).split('\n').filter(Boolean); } catch (e) { return [`ERR ${flat(e.message, 150)}`]; } };
    const uid = (u) => { try { return sql(app, `select user_id from users where username = '${u}'`); } catch (e) { return null; } };
    const em = (k) => `${S.t}${k}@mail.test`;

    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 300), url: rel(page.url())}); d.accept().catch(() => {}); });
    // the list's own GET api/v1/users answers, kept per read (the browser's own traffic)
    let usersApi = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/users(\?|$)/.test(r.url()) || r.request().method() !== 'GET') return;
        try {
            const j = await r.json();
            usersApi.push({url: rel(r.url()).slice(0, 300), status: r.status(), items: (j.items || []).filter((u) => S.t && (u.userName || '').startsWith(S.t)).map((u) => ({userName: u.userName, groups: (u.groups || []).map((g) => ({name: g.name, dateStart: g.dateStart, dateEnd: g.dateEnd, masthead: g.masthead}))}))});
        } catch (e) { usersApi.push({url: rel(r.url()).slice(0, 300), status: r.status(), err: flat(e.message, 100)}); }
    });
    const as = async (user) => { await signIn(page, user, {contextPath: S.J}); await idle(page).catch(() => {}); };
    const gotoList = async () => {
        const r = await page.goto(cu(S.J, '/en/management/settings/access'));
        await usersTable(page).waitFor({timeout: T}).catch(() => {});
        await usersTable(page).locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        return r ? r.status() : null;
    };
    const step = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); } save(); };
    const KEYS = isOPS ? ['o', 'pr', 'inv', 'nf'] : ['o', 'pr', 'inv', 'nf', 'fen', 'fut', 'ffe', 'two', 'ipe', 'pst', 'fu2'];
    const mine = (L) => (L.table ? L.table.rows.filter((r) => (r.cells[1] || '').startsWith(S.t) || (r.cells[1] || '') === 'admin@mail.test') : []).map((r) => ({email: r.cells[1], name: r.cells[0], roles: r.roleLines, starts: r.dateLines, cells: r.cells}));

    try {
        // ── seed ─────────────────────────────────────────────────────────────────
        await step('seed', async () => {
            if (S.J) return;
            await app.api.bootstrapProbe(app.contextPath).catch(() => {});
            const t = tag('u53i30');
            S.t = t;
            const U = (k, roles, extra = {}) => ({username: `${t}${k}`, roles, givenName: `I30${k}`, familyName: `Fam${k}`, ...extra});
            const r = await app.api.createContext({tag: t, context: {name: `U53 I30 ${t}`, acronym: 'I30', contactName: 'I30 Contact', contactEmail: `${t}contact@mail.test`},
                users: [U('m', ['manager']), U('o', ['sectionEditor']), U('pr', [], {pastRoles: [{role: 'sectionEditor', dateStart: '2020-01-01', dateEnd: '2021-06-30'}]}), U('inv', ['reader'])]});
            S.J = t;
            S.seed = flat(JSON.stringify(r), 300);
            save();
            fact('seed', {J: S.J, db: {o: uug(`${t}o`), pr: uug(`${t}pr`), inv: uug(`${t}inv`)}});
        });

        // ── import {OJS OMP} ────────────────────────────────────────────────────
        await step('import', async () => {
            if (isOPS || S.imported) return;
            const t = S.t;
            const one = (k, roles) => userXml({given: `I30${k}`, family: `Fam${k}`, email: em(k), username: `${t}${k}`, password: `${k}pass1234`, roles});
            const xml = usersFile([
                one('fen', [{ref: SE, start: '2020-01-01', end: '2030-12-31'}]),
                one('fut', [{ref: SE, start: FUTURE}]),
                one('ffe', [{ref: SE, start: FUTURE, end: '2030-12-31'}]),
                one('two', [{ref: 'Reader', start: '2020-01-01'}, {ref: SE, start: '2020-01-01', end: '2030-12-31'}]),
                one('ipe', [{ref: SE, start: '2020-01-01', end: '2021-06-30'}]),
                one('pst', [{ref: SE, start: '2020-01-01'}]),
                one('fu2', [{ref: SE, start: FUTURE}]),
            ]);
            const file = outFile('i30-users.xml');
            fs.writeFileSync(file, xml);
            await as(`${t}m`);
            await page.goto(cu(S.J, '/management/importexport/plugin/UserImportExportPlugin'));
            await page.locator('#importXmlForm').waitFor({timeout: T});
            await idle(page).catch(() => {});
            await snap(page, 'i30-01-plugin');
            const oldId = await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => '');
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, oldId, {timeout: 20_000}).catch(() => {});
            const respP = page.waitForResponse((x) => /UserImportExportPlugin\/import\?/.test(x.url()), {timeout: 90_000}).catch(() => null);
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
            const resp = await respP;
            await sleep(1500);
            await idle(page).catch(() => {});
            const s = await snap(page, 'i30-02-import-results');
            const results = flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText().catch(() => null), 3000);
            S.imported = true;
            const db = {};
            for (const k of ['fen', 'fut', 'ffe', 'two', 'ipe', 'pst', 'fu2']) db[k] = uug(`${t}${k}`);
            fact('import', {status: resp ? resp.status() : null, results, db});
            // the plugin's "Export Users" grid (legacy, note i's "active and future roles" column) as an incidental read
            await page.goto(cu(S.J, '/management/importexport/plugin/UserImportExportPlugin'));
            await page.locator('#importExportTabs [role="tab"]').first().waitFor({timeout: 15_000}).catch(() => {});
            await page.getByRole('tab', {name: 'Export Users'}).first().click().catch(() => {});
            await page.locator('#usersGridContainer tr.gridRow').first().waitFor({timeout: 20_000}).catch(() => {});
            await idle(page).catch(() => {});
            await snap(page, 'i30-03-export-grid');
            const grid = await page.locator('#usersGridContainer tr.gridRow').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
            fact('exportGrid', grid.filter((r) => r.join(' ').includes(S.t)));
            await signOut(page).catch(() => {});
        });

        // ── invite: a future start through the screens (all three apps) ───────────
        await step('invite', async () => {
            if (S.invited) return;
            const o = {};
            await as(`${S.t}m`);
            await gotoList();
            await closeMenus(page);
            await userRow(page, em('inv')).first().locator('button').last().click();
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
            await idle(page).catch(() => {}); await sleep(800);
            await snap(page, 'i30-10-inv-edit');
            await page.getByRole('button', {name: 'Add Another Role'}).click();
            const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
            await newRow.waitFor({timeout: 10_000});
            await newRow.getByLabel(/^Select a new role/).selectOption({label: SE});
            const box = newRow.getByRole('textbox');
            o.dateBox = await box.evaluate((el) => ({type: el.type, min: el.min || null, max: el.max || null})).catch(() => null);
            await box.fill(FUTURE);
            o.dateValue = await box.inputValue().catch(() => null);
            await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
            await snap(page, 'i30-11-inv-new-role-row');
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            await page.getByLabel(/^Subject/).waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(800);
            const s12 = await snap(page, 'i30-12-inv-compose');
            o.composeErrors = flat((s12.text && s12.text.main || '').match(/[^\n]*(required|invalid|must|date)[^\n]*/gi), 400);
            const send = page.getByRole('button', {name: 'Invite user to the role'});
            if (await send.count()) {
                await send.click();
                await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T}).catch(() => {});
                o.sent = flat((await snap(page, 'i30-13-inv-sent')).text.dialog, 400);
            }
            await signOut(page).catch(() => {});
            try {
                const m = await app.mail.find({to: em('inv'), timeoutMs: 30_000});
                const full = await app.mail.fullMessage(m.ID);
                const link = ((full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1];
                o.mail = {subject: full.Subject, startLine: flat(((full.Text || '').match(/[^\n]*(2027|June|Start)[^\n]*/gi) || []).join(' | '), 400)};
                S.acceptLink = link ? link.replace(/&amp;/g, '&') : null;
            } catch (e) { o.mail = {none: flat(e.message, 150)}; }
            if (S.acceptLink) {
                await page.goto(S.acceptLink);
                const accept = page.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
                await accept.waitFor({timeout: T}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(1200);
                o.review = flat((await snap(page, 'i30-14-inv-accept-review')).text.main, 1200);
                if (await accept.count()) {
                    await accept.click();
                    await page.getByRole('dialog').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                    await idle(page).catch(() => {});
                    o.accepted = flat((await snap(page, 'i30-15-inv-accepted')).text.dialog, 400);
                }
            }
            o.db = uug(`${S.t}inv`);
            S.invited = true;
            fact('invite', o);
        });

        // ── newinv: a new account whose only role starts in the future (all three apps) ──
        await step('newinv', async () => {
            if (S.newInvited) return;
            const o = {};
            const to = em('nf');
            // an invitation sent by an earlier attempt of this run is accepted rather than sent again
            const earlier = await app.mail.find({to, timeoutMs: 3000}).catch(() => null);
            if (!earlier) {
            await as(`${S.t}m`);
            await gotoList();
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByRole('heading', {name: /Search User/}).waitFor({timeout: T});
            await page.getByLabel(/Search for a user by email address/).fill(to);
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
            await idle(page).catch(() => {});
            await page.getByLabel(/^Given Name/).first().fill('I30nf');
            await page.getByLabel(/^Family Name/).first().fill('Famnf').catch(() => {});
            const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
            await row.getByLabel(/^Select a new role/).selectOption({label: SE});
            await row.getByRole('textbox').fill(FUTURE);
            await row.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
            await snap(page, 'i30-16-nf-details');
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            await page.getByLabel(/^Subject/).waitFor({timeout: T});
            await idle(page).catch(() => {}); await sleep(800);
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T}).catch(() => {});
            o.sent = flat((await snap(page, 'i30-17-nf-sent')).text.dialog, 300);
            await signOut(page).catch(() => {});
            }
            const m = earlier || await app.mail.find({to, timeoutMs: 30_000});
            const full = await app.mail.fullMessage(m.ID);
            const link = (((full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1] || '').replace(/&amp;/g, '&');
            await page.goto(link);
            await page.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)}).waitFor({timeout: T});
            // the step's form attaches after its heading: a fill before that is dropped ("The username field cannot be null.")
            await idle(page).catch(() => {}); await sleep(1500);
            for (let i = 0; i < 3; i++) {
                await page.getByLabel(/^Username/).fill(`${S.t}nf`);
                await page.getByLabel(/^Password/).fill(`${S.t}nf${S.t}nf`);
                if ((await page.getByLabel(/^Username/).inputValue()) === `${S.t}nf`) break;
                await sleep(1000);
            }
            await page.getByRole('checkbox').check();
            await page.getByRole('button', {name: 'Save and continue'}).click();
            await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
            await idle(page).catch(() => {});
            if (!(await page.getByLabel(/^Given Name/).first().inputValue().catch(() => ''))) await page.getByLabel(/^Given Name/).first().fill('I30nf');
            await page.getByLabel(/^Country/).selectOption('CA');
            await page.getByRole('button', {name: 'Save and continue'}).click();
            await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
            await idle(page).catch(() => {});
            o.review = flat((await snap(page, 'i30-18-nf-review')).text.main, 900);
            await page.getByRole('button', {name: new RegExp(`Accept And Continue to ${ACR[app.name]}`)}).click();
            await page.getByRole('dialog').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            o.accepted = flat((await snap(page, 'i30-19-nf-accepted')).text.dialog, 300);
            await signOut(page).catch(() => {});
            o.db = uug(`${S.t}nf`);
            S.newInvited = true;
            fact('newinv', o);
        });

        // ── read: the list (m, admin, reload), roles pages, masthead, history ─────
        await step('read', async () => {
            const o = {when: new Date().toISOString()};
            for (const who of [`${S.t}m`, 'admin']) {
                await as(who);
                usersApi = [];
                const st = await gotoList();
                const key = who === 'admin' ? 'admin' : 'm';
                await snap(page, `i30-20-list-${key}`);
                const L = await readList(page);
                o[key] = {status: st, heading: L.heading, heads: L.table && L.table.heads, rows: mine(L), api: usersApi.slice(0, 3)};
                if (key === 'm') {
                    await loc(page, 'Users list: the Current Users table', usersTable(page));
                    await loc(page, 'Users list: a row by its email', userRow(page, em('o')));
                    await page.reload(); await usersTable(page).locator('tbody tr').first().waitFor({timeout: T}).catch(() => {}); await idle(page).catch(() => {});
                    await snap(page, 'i30-21-list-m-reload');
                    o.mReload = mine(await readList(page));
                }
            }
            // the roles pages, as admin (read only)
            o.rolesPages = {};
            for (const k of KEYS) {
                const id = uid(`${S.t}${k}`);
                if (!id) { o.rolesPages[k] = 'no account'; continue; }
                await page.goto(cu(S.J, `/en/management/settings/user/${id}`));
                await page.locator('main table tbody tr').first().waitFor({timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(600);
                const s = await snap(page, `i30-22-roles-page-${k}`);
                const rows = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
                o.rolesPages[k] = {rows, heads: await page.locator('main table thead th').allInnerTexts().catch(() => [])};
                if (!rows.length) o.rolesPages[k].main = flat(s.text && s.text.main, 600);
            }
            await signOut(page).catch(() => {});
            for (const [k, p] of [['masthead', 'editorialMasthead'], ['history', 'editorialHistory']]) {
                await page.goto(cu(S.J, `/en/about/${p}`));
                await idle(page).catch(() => {});
                const s = await snap(page, `i30-23-${k}`);
                const body = (s.text && (s.text.main || s.text.body)) || (await page.locator('body').innerText().catch(() => ''));
                o[k] = flat(body, 2500);
                o[`${k}Tagged`] = KEYS.filter((x) => body.includes(`I30${x} Fam${x}`));
            }
            o.db = Object.fromEntries(KEYS.map((k) => [k, uug(`${S.t}${k}`)]));
            fact('read', o);
        });

        // ── other: a role in another context; the Site Administrator's undated manager role ──
        await step('other', async () => {
            const o = {};
            if (!S.J2) {
                const r = await app.api.createContext({tag: `${S.t}x`, context: {name: `U53 I30 X ${S.t}`, acronym: 'I30X', contactName: 'I30 X Contact', contactEmail: `${S.t}xcontact@mail.test`}, users: [{username: `${S.t}o`, roles: ['author']}]});
                S.J2 = `${S.t}x`; save();
                o.seed = flat(JSON.stringify(r), 200);
            }
            o.dbOther = (() => { try { return sql(app, `select c.path, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id join users u on u.user_id = uug.user_id join ${ctxTable} c on c.${ctxId} = ug.context_id where u.username = '${S.t}o' order by 1`).split('\n'); } catch (e) { return flat(e.message, 100); } })();
            await as(`${S.t}m`);
            await gotoList();
            await snap(page, 'i30-25-list-other-context');
            o.oRow = mine(await readList(page)).find((r) => r.email === em('o')) || null;
            o.adminRow = mine(await readList(page)).find((r) => r.email === 'admin@mail.test') || null;
            await signOut(page).catch(() => {});
            await as('admin');
            await page.goto(cu(S.J, '/en/management/settings/user/1'));
            await page.locator('main table tbody tr').first().waitFor({timeout: 15_000}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(600);
            await snap(page, 'i30-26-roles-page-admin');
            o.adminRolesPage = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
            o.adminDb = (() => { try { return sql(app, `select (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = 1 and ug.context_id = (select ${ctxId} from ${ctxTable} where path = '${S.J}')`).split('\n'); } catch (e) { return flat(e.message, 100); } })();
            await signOut(page).catch(() => {});
            fact('other', o);
        });

        // ── menu: each tagged row's "…" menu; "Disable User" on fen ───────────────
        await step('menu', async () => {
            const o = {};
            await as(`${S.t}m`);
            await gotoList();
            for (const k of KEYS) {
                await closeMenus(page);
                const row = userRow(page, em(k)).first();
                if (!(await row.count())) { o[k] = 'no row'; continue; }
                await row.locator('button').last().click();
                await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {});
                o[k] = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                if (k === 'fen' || (isOPS && k === 'inv')) await snap(page, `i30-30-menu-${k}`);
                await closeMenus(page);
            }
            const target = isOPS ? 'inv' : 'fen';
            await userRow(page, em(target)).first().locator('button').last().click();
            const dis = page.getByRole('menuitem', {name: 'Disable User', exact: true});
            if (await dis.count()) {
                await dis.click();
                await page.getByRole('dialog').last().waitFor({timeout: T}).catch(() => {});
                await idle(page).catch(() => {});
                o.disable = {target, text: flat((await snap(page, `i30-31-disable-${target}`)).text.dialog, 600)};
                await page.getByRole('dialog').last().getByRole('button', {name: 'Cancel'}).click().catch(() => {});
                await sleep(800);
            }
            await closeMenus(page);
            fact('menu', o);
            await signOut(page).catch(() => {});
        });

        // ── remove {OJS OMP}: "Remove User" › "OK" on a role not begun ─────────────
        await step('remove', async () => {
          S.removed = S.removed === true ? {fu2: true} : (S.removed || {});
          const R = {};
          for (const who of isOPS ? ['nf'] : ['fu2', 'nf']) {
            if (S.removed[who]) continue;
            const o = R[who] = {dbBefore: uug(`${S.t}${who}`)};
            await as(`${S.t}m`);
            await gotoList();
            await closeMenus(page);
            await userRow(page, em(who)).first().locator('button').last().click();
            const rm = page.getByRole('menuitem', {name: 'Remove User', exact: true});
            await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {});
            o.offered = await rm.count();
            if (o.offered) {
                await rm.click();
                const dlg = page.getByRole('dialog').last();
                await dlg.waitFor({timeout: T});
                o.dialog = flat((await snap(page, `i30-40-remove-dialog-${who}`)).text.dialog, 500);
                const respP = page.waitForResponse((r) => /remove-user|removeUser/.test(r.url()), {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'OK', exact: true}).click();
                const resp = await respP;
                o.post = resp ? {status: resp.status(), body: flat(await resp.text().catch(() => ''), 300)} : null;
                await sleep(1000); await idle(page).catch(() => {});
                const s = await snap(page, `i30-41-remove-after-${who}`);
                o.notices = s.notices;
                o.answerDialog = flat(s.text && s.text.dialog, 300);
                // the answer's own "OK", then the list on the same page
                const answer = page.getByRole('dialog').last();
                if (await answer.count()) { await answer.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(800); await idle(page).catch(() => {}); }
                await snap(page, `i30-41b-remove-after-ok-${who}`);
                o.samePage = mine(await readList(page)).find((r) => r.email === em(who)) || null;
                await gotoList();
                await snap(page, `i30-42-remove-after-reload-${who}`);
                o.afterReload = mine(await readList(page)).find((r) => r.email === em(who)) || null;
                await closeMenus(page);
                await userRow(page, em(who)).first().locator('button').last().click().catch(() => {});
                await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {});
                o.menuAfter = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                await closeMenus(page);
                const id = uid(`${S.t}${who}`);
                await page.goto(cu(S.J, `/en/management/settings/user/${id}`));
                await page.locator('main table tbody tr').first().waitFor({timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(600);
                await snap(page, `i30-43-remove-roles-page-${who}`);
                o.rolesPage = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
            }
            o.dbAfter = uug(`${S.t}${who}`);
            S.removed[who] = true;
            await signOut(page).catch(() => {});
          }
          fact('remove', R);
        });

        // ── leave: the Users tab left with a phrase typed, not entered ─────────────
        await step('leave', async () => {
            const o = {};
            await as(`${S.t}m`);
            await gotoList();
            const d0 = dialogs.length;
            const search = page.getByRole('searchbox').or(page.getByLabel(/Enter a user's name/)).first();
            await search.fill(`I30fen`);
            o.typed = await search.inputValue().catch(() => null);
            o.rowsTyped = (mine(await readList(page))).length;
            const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true}).first();
            o.rolesTab = await rolesTab.count();
            if (o.rolesTab) {
                await rolesTab.click(); await idle(page).catch(() => {}); await sleep(600);
                await snap(page, 'i30-50-roles-tab');
                const usersTab = page.getByRole('tab', {name: 'Users', exact: true}).first();
                await usersTab.click(); await idle(page).catch(() => {}); await sleep(600);
                await snap(page, 'i30-51-users-tab-back');
                o.back = {search: await search.inputValue().catch(() => null), rows: (mine(await readList(page))).length};
            }
            await page.goto(cu(S.J, '/en/submissions')).catch((e) => { o.leaveErr = flat(e.message, 100); });
            await idle(page).catch(() => {});
            o.dialogs = dialogs.slice(d0);
            fact('leave', o);
            await signOut(page).catch(() => {});
        });
        if (RUN === 'r1' && on('seed')) note(`Users list rows by email: getByRole('table', {name: /Current Users \\(/}).locator('tbody tr').filter({hasText: email}); the "Roles" and "Start Date" cells are td[2]/td[3], one child div per printed role. Future start dates come from the invitation (row "Edit" › "Add Another Role", the row's textbox takes YYYY-MM-DD) on all three apps; end dates only from the Users XML import {OJS OMP}.`);
    } finally {
        save();
        fact('dialogs', dialogs);
        await close();
    }
});
