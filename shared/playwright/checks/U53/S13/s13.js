// U53 claim check, chunk S13: the upstream sync of 2026-10-13 for pkp/pkp-lib#13494
// (`acf22372dd`, "Ensure merge target has appropriate administration level"): the
// "Merge user" window offers "Merge into this User" only on the rows of accounts the
// signed-in account may fully administer. All three apps.
// Spec: docs/specs/U53-users-management.md — Rule 16 (273–277), Scenario 6's first
// bullet (630–637), footnote i (1473–1500).
//
// Seeds per app and run (tag prefix u53s13):
//   A  another journal: Xena (Author, also an Author in B), Max (Journal manager of A
//      only: no role in B, listed only with "Include users with no roles…"), Mia
//      (manager of A and of B).
//   B  the journal under test: Mona (manager of B only), Mia, Eve (Journal/Press
//      editor; OJS, OMP), Pete (Production editor; OJS, OMP), Odin (Author: the
//      account merged in every window), Nell (Author: the account merged into),
//      Edna (Author role here ended: nothing under "Roles"), Xena, Sid (Author here,
//      and a second Site Administrator for the run: a site-admin user_user_groups
//      row written by SQL, deleted at the end, users.md "Traps").
//   C  Scenario 6's journal: Mara (Journal manager), Quinn Ash (Author, Reader; submitter
//      of "Tidal Patterns", signed in in a second browser), Quinn Ashdown (Author).
// Steps:
//   s6      Scenario 6's first bullet as Mara on C: the window, its columns, which rows
//           offer "Merge into this User"
//   win     the window on B for Odin, signed in as every level: admin, Mona, Mia, Eve,
//           Pete (OPS: admin, Mona, Mia); the default list, then the tag searched with
//           "Include users with no roles…" ticked; each row's action links read by its
//           arrow; Mona's and admin's main-list menus on the same rows (control)
//   press   Mona presses "Merge into this User" on Nell's row, "OK": the answer, the
//           window, the list on the page and after a reload
//   sid     footnote v: the Site Administrator's menu on Sid's row, then "Merge user" there,
//           "Merge into this User" on Nell's row, "OK": the answer and what the screen shows
// STEPS=s6,win,press,sid narrows (each run seeds afresh).
// Run: PROBE_FEATURE=U53 PROBE_AGENT=ccS13 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U53/S13/s13.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql} =
    require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log('[s13]', new Date().toISOString().slice(11, 19), ...a);
const mail = (u) => `${u}@mail.test`;
const STEPS = process.env.STEPS ? process.env.STEPS.split(',') : ['s6', 'win', 'press', 'sid'];
const on = (s) => STEPS.includes(s);

let CUR = 'init';
const CRASH = {};
function watch(page) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${r.url().slice(0, 200)}`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { (CRASH[`${CUR}:dialogs`] = CRASH[`${CUR}:dialogs`] || []).push(`${d.type()} ${d.message()}`); d.dismiss().catch(() => {}); });
    return page;
}
async function snap(page, name) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// The Vue list -----------------------------------------------------------------
const table = (page) => page.getByRole('table', {name: /Current Users/});
async function gotoAccess(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/en/management/settings/access`));
    await table(page).waitFor({timeout: T});
    await idle(page);
    await table(page).getByRole('row').nth(1).waitFor({timeout: T}).catch(() => {});
}
let MENU_BTN = null;
async function openRowMenu(page, email) {
    const row = table(page).getByRole('row').filter({hasText: email}).first();
    if (!(await row.count())) return null;
    MENU_BTN = row.getByRole('button', {name: /options/i});
    await MENU_BTN.click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    return (await page.getByRole('menuitem').allInnerTexts()).map((t) => flat(t));
}
async function closeMenu(page) {
    if (MENU_BTN && (await page.getByRole('menuitem').count())) await MENU_BTN.click().catch(() => {});
    await page.getByRole('menuitem').first().waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
}
async function menuOf(page, email) {
    const items = await openRowMenu(page, email);
    if (items) await closeMenu(page);
    return items;
}

// The legacy grid in the "Merge user" window -------------------------------------
const mergeDialog = (page) => page.getByRole('dialog', {name: 'Merge user', exact: true});
async function openMergeWindow(page, email) {
    await openRowMenu(page, email);
    await page.getByRole('menuitem', {name: 'Merge user', exact: true}).click();
    const dlg = mergeDialog(page);
    await dlg.locator('tr.gridRow').first().waitFor({timeout: T});
    await idle(page); await sleep(500);
    return dlg;
}
async function closeMergeWindow(page) {
    const dlg = mergeDialog(page);
    if (await dlg.count()) {
        await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
        await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(700); // the modal store's slot (patterns.md pitfall 4)
    }
}
async function headers(dlg) {
    return dlg.locator('th').evaluateAll((ths) => ths.filter((t) => t.offsetParent !== null).map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
}
/** Every visible row: its cells, whether it has an arrow, and the links its arrow shows. */
async function rowsWithActions(dlg) {
    const rows = dlg.locator('tr.gridRow');
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = rows.nth(i);
        if (!(await r.isVisible())) continue;
        const cells = (await r.locator('td').allInnerTexts()).map((c) => flat(c, 200).replace(/^Settings\s*/, ''));
        const arrow = r.locator('a.show_extras, a.hide_extras');
        const hasArrow = (await arrow.count()) > 0;
        let links = [];
        if (hasArrow) {
            if (await r.locator('a.show_extras').count()) await r.locator('a.show_extras').click();
            const next = r.locator('xpath=following-sibling::tr[1]');
            await next.getByRole('link').first().waitFor({timeout: 5000}).catch(() => {});
            links = (await next.getByRole('link').allInnerTexts()).map((t) => flat(t)).filter(Boolean);
        }
        out.push({email: cells[4] || '', username: cells[2] || '', roles: cells[3] || '', arrow: hasArrow, links});
    }
    return out;
}
async function headerLinks(dlg) {
    return (await dlg.locator('.pkp_controllers_grid .header a, .gridHeader a, .header .actions a').allInnerTexts().catch(() => [])).map((t) => flat(t)).filter(Boolean);
}
async function paging(dlg) {
    return flat(await dlg.locator('.gridPaging').first().innerText().catch(() => ''), 200);
}
async function filterSearch(page, dlg, {text = '', noRole = false}) {
    const f = dlg.locator('form.filter').first();
    if (!(await f.locator('input[name="search"]').isVisible())) {
        await dlg.locator('a.pkp_linkaction_search').first().click();
        await f.locator('input[name="search"]').waitFor({state: 'visible', timeout: T});
    }
    await f.locator('input[name="search"]').fill(text);
    await f.locator('select[name="userGroup"]').selectOption({index: 0});
    await f.locator('input[name="includeNoRole"]').setChecked(noRole);
    const answer = page.waitForResponse((r) => /fetch-grid/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Search', exact: true}).click();
    await answer;
    await idle(page); await sleep(600);
}
/** Name a row for the report: the key of the seeded account it shows. */
function keyOf(email, keys) {
    if (email === 'admin@mail.test') return 'admin';
    for (const [k, u] of Object.entries(keys)) if (email === mail(u)) return k;
    return email;
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    await app.api.bootstrapProbe(app.contextPath);
    const run = process.env.PROBE_RUN || 'r0';
    const F = {app: app.name, run, errors: []};
    const t = tag('u53s13');
    const A = `${t}a`, B = `${t}b`, C = `${t}c`;
    const U = (k) => `${t}${k}`;
    const u = (k, g, f, roles, extra = {}) => ({username: U(k), givenName: g, familyName: f, roles, ...extra});
    const OPEN = [];
    const browser = async () => { const x = await launch(app); watch(x.page); OPEN.push(x); return x; };
    const step = async (name, fn) => {
        CUR = `${app.name}:${name}`;
        log(app.name, run, 'step', name);
        F[name] = {};
        try { await fn(F[name]); } catch (e) { F.errors.push({step: name, error: String(e.message || e).slice(0, 500)}); log(app.name, 'ERROR', name, String(e.message || e).slice(0, 300)); }
        F[name].crashes = CRASH[CUR] || [];
        F[name].dialogs = CRASH[`${CUR}:dialogs`] || [];
        record('s13-facts', F);
    };

    // ── seed ────────────────────────────────────────────────────────────────
    const sec = app.name === 'ojs' ? {sections: [{abbrev: 'ART', title: 'Articles'}]} : isOps ? {sections: [{abbrev: 'PRE', title: 'Preprints'}]} : {};
    const ctxA = await app.api.createContext({tag: A, context: {name: `S13 Other ${t}`, acronym: 'S13A'}, ...sec, users: [
        u('x', 'Xena', 'Outside', ['author']),
        u('ma', 'Max', 'Amanager', ['manager']),
        u('mia', 'Mia', 'Bothmanager', ['manager']),
    ]});
    const usersB = [
        u('mgr', 'Mona', 'Manager', ['manager']),
        {username: U('mia'), roles: ['manager']},
        ...(isOps ? [] : [u('ed', 'Eve', 'Editor', ['editor']), u('pe', 'Pete', 'Production', ['productionEditor'])]),
        u('old', 'Odin', 'Merged', ['author']),
        u('nell', 'Nell', 'Chosen', ['author']),
        u('e', 'Edna', 'Ended', [], {pastRoles: [{role: 'author'}]}),
        {username: U('x'), roles: ['author']},
        u('sa', 'Sid', 'Secondadmin', ['author']),
    ];
    const ctxB = await app.api.createContext({tag: B, context: {name: `S13 Journal ${t}`, acronym: 'S13B'}, ...sec, users: usersB});
    const ids = {};
    for (const x of [...ctxA.users, ...ctxB.users]) ids[x.username.replace(t, '')] = x.id;
    const keys = {};
    for (const k of Object.keys(ids)) keys[k] = U(k);
    // Sid: a second Site Administrator for this run
    const gAdmin = sql(app, `select user_group_id from user_groups where context_id is null and role_id = 1 order by user_group_id limit 1`);
    sql(app, `INSERT INTO user_user_groups (user_group_id, user_id, date_start, masthead) VALUES (${gAdmin}, ${ids.sa}, now() - interval '1 day', 0)`);
    F.seed = {t, A, B, C, idA: ctxA.contextId, idB: ctxB.contextId, ids,
        sidRows: sql(app, `select coalesce(ug.context_id::text, 'site'), ug.role_id, uug.date_start from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = ${ids.sa} order by 1`).split('\n'),
    };
    record('s13-facts', F);
    log(app.name, run, 'seeded', t);

    try {
        // ── s6: Scenario 6's first bullet ─────────────────────────────────────
        if (on('s6')) await step('s6', async (R) => {
            const ctxC = await app.api.createContext({tag: C, context: {name: `S13 Scenario6 ${t}`, acronym: 'S13C'}, ...sec, users: [
                u('mara', 'Mara', 'Scratchmanager', ['manager']),
                u('qa', 'Quinn', 'Ash', ['author', 'reader']),
                u('qd', 'Quinn', 'Ashdown', ['author']),
            ]});
            for (const x of ctxC.users) keys[x.username.replace(t, '')] = x.username;
            const sub = await app.api.createSubmission({tag: `${t}s6`, context: C, submitter: U('qa'), title: 'Tidal Patterns'});
            R.submissionId = sub.submissionId;
            const q = await browser();
            await signIn(q.page, U('qa'), {contextPath: C});
            await q.page.goto(app.url(`/index.php/${C}/en/user/profile`));
            await idle(q.page);
            const m = await browser();
            const page = m.page;
            await signIn(page, U('mara'), {contextPath: C});
            await gotoAccess(page, app, C);
            await snap(page, 's6-01-list');
            R.menuAsh = await openRowMenu(page, mail(U('qa')));
            await page.getByRole('menuitem', {name: 'Merge user', exact: true}).click();
            const dlg = mergeDialog(page);
            await dlg.locator('tr.gridRow').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            const s = await snap(page, 's6-02-merge-window');
            R.dialogText = flat(s.text && s.text.dialog, 1500);
            R.title = (await dlg.locator('.header h4, h4').allInnerTexts()).map((x) => flat(x));
            R.headers = await headers(dlg);
            R.headerLinks = await headerLinks(dlg);
            R.paging = await paging(dlg);
            R.rows = (await rowsWithActions(dlg)).map((r) => ({...r, who: keyOf(r.email, keys)}));
            await snap(page, 's6-03-merge-window-rows-open');
            await loc(page, 'Merge window (S6): rows', dlg.locator('tr.gridRow'));
            await loc(page, 'Merge window (S6): "Merge into this User" links', dlg.getByRole('link', {name: 'Merge into this User'}));
            await closeMergeWindow(page);
            await snap(page, 's6-04-after-close');
        });

        // ── win: the window on B at every level ──────────────────────────────
        const signers = ['admin', 'mgr', 'mia', ...(isOps ? [] : ['ed', 'pe'])];
        if (on('win')) await step('win', async (R) => {
            const b = await browser();
            const page = b.page;
            for (const who of signers) {
                const username = who === 'admin' ? 'admin' : U(who);
                const W = R[who] = {};
                try {
                    await signIn(page, username, {contextPath: B});
                    await gotoAccess(page, app, B);
                    await snap(page, `w-${who}-01-list`);
                    // the main list's menus on the rows the window is read on (control)
                    W.menus = {};
                    for (const k of ['admin', 'mgr', 'mia', 'old', 'nell', 'e', 'x', 'sa']) {
                        const em = k === 'admin' ? 'admin@mail.test' : mail(U(k));
                        W.menus[k] = await menuOf(page, em).catch((e) => `ERR ${flat(e.message, 100)}`);
                    }
                    const dlg = await openMergeWindow(page, mail(U('old')));
                    const s = await snap(page, `w-${who}-02-merge-window`);
                    W.dialogText = flat(s.text && s.text.dialog, 1500);
                    W.headers = await headers(dlg);
                    W.headerLinks = await headerLinks(dlg);
                    W.paging = await paging(dlg);
                    W.rows = (await rowsWithActions(dlg)).map((r) => ({who: keyOf(r.email, keys), roles: r.roles, arrow: r.arrow, links: r.links}));
                    await snap(page, `w-${who}-03-rows-open`);
                    // the other end of the list: the tag, "Include users with no roles…" ticked
                    await filterSearch(page, dlg, {text: t, noRole: true});
                    await snap(page, `w-${who}-04-norole`);
                    W.noRolePaging = await paging(dlg);
                    W.noRoleRows = (await rowsWithActions(dlg)).map((r) => ({who: keyOf(r.email, keys), roles: r.roles, arrow: r.arrow, links: r.links}));
                    // and unticked with the same text
                    await filterSearch(page, dlg, {text: t, noRole: false});
                    W.tagRows = (await rowsWithActions(dlg)).map((r) => ({who: keyOf(r.email, keys), arrow: r.arrow, links: r.links}));
                    await snap(page, `w-${who}-05-tag`);
                    if (who === 'mgr') {
                        await loc(page, 'Merge window: header links', dlg.locator('.header a'));
                        await loc(page, 'Merge window: a row\'s arrow', dlg.locator('tr.gridRow a.show_extras, tr.gridRow a.hide_extras'));
                    }
                    await closeMergeWindow(page);
                } catch (e) {
                    W.error = flat(e.message, 400);
                    await snap(page, `w-${who}-99-error`);
                    await closeMergeWindow(page).catch(() => {});
                }
            }
        });

        // ── press: Mona merges Odin into Nell from the window ─────────────────
        if (on('press')) await step('press', async (R) => {
            const b = await browser();
            const page = b.page;
            await signIn(page, U('mgr'), {contextPath: B});
            await gotoAccess(page, app, B);
            R.nellMenuBefore = await menuOf(page, mail(U('nell')));
            const dlg = await openMergeWindow(page, mail(U('old')));
            const row = dlg.locator('tr.gridRow').filter({hasText: mail(U('nell'))}).first();
            if (!(await row.locator('a.show_extras').count())) { R.offered = false; await closeMergeWindow(page); return; }
            R.offered = true;
            await row.locator('a.show_extras').click();
            const link = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Merge into this User'});
            await link.click();
            const conf = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await conf.waitFor({timeout: T});
            await snap(page, 'p-01-confirm');
            R.confirm = flat(await conf.innerText(), 600);
            const w = page.waitForResponse((r) => r.url().includes('merge-users') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            const resp = await w;
            R.okStatus = resp ? resp.status() : null;
            R.okBody = resp ? flat(await resp.text().catch(() => ''), 300) : null;
            await sleep(1500); await idle(page);
            const s = await snap(page, 'p-02-after-ok');
            R.windowOpenAfter = await mergeDialog(page).count();
            R.dialogAfter = flat(s.text && s.text.dialog, 300);
            R.notices = s.notices || [];
            const rowRead = async () => ({
                old: await table(page).getByRole('row').filter({hasText: mail(U('old'))}).count(),
                nell: flat(await table(page).getByRole('row').filter({hasText: mail(U('nell'))}).first().innerText().catch(() => ''), 300),
            });
            R.listSame = await rowRead();
            await gotoAccess(page, app, B);
            await snap(page, 'p-03-list-reload');
            R.listReload = await rowRead();
            R.nellDb = sql(app, `select coalesce(ug.context_id::text,'site'), ug.role_id, uug.date_start, uug.date_end from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = ${ids.nell} order by 1`).split('\n');
            R.odinExists = sql(app, `select count(*) from users where user_id = ${ids.old}`);
        });
        // ── sid: the Site Administrator merges the second Site Administrator (footnote v) ──
        if (on('sid')) await step('sid', async (R) => {
            const b = await browser();
            const page = b.page;
            await signIn(page, 'admin', {contextPath: B});
            await gotoAccess(page, app, B);
            R.sidMenu = await menuOf(page, mail(U('sa')));
            const dlg = await openMergeWindow(page, mail(U('sa')));
            await snap(page, 'v-01-merge-window-sid');
            R.rows = (await rowsWithActions(dlg)).map((r) => ({who: keyOf(r.email, keys), arrow: r.arrow, links: r.links}));
            const row = dlg.locator('tr.gridRow').filter({hasText: mail(U('nell'))}).first();
            const link = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Merge into this User'});
            await link.click();
            const conf = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await conf.waitFor({timeout: T});
            R.confirm = flat(await conf.innerText(), 600);
            const w = page.waitForResponse((r) => r.url().includes('merge-users') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            const resp = await w;
            R.okStatus = resp ? resp.status() : null;
            R.okBody = resp ? flat(await resp.text().catch(() => ''), 300) : null;
            await sleep(2500); await idle(page);
            const s = await snap(page, 'v-02-after-ok');
            R.confirmStillOpen = await conf.count();
            R.confirmButtons = await conf.getByRole('button').evaluateAll((bs) => bs.map((x) => `${x.innerText.trim()}${x.disabled ? ' (disabled)' : ''}`)).catch(() => []);
            R.windowOpen = await mergeDialog(page).count();
            R.dialogText = flat(s.text && s.text.dialog, 400);
            R.notices = s.notices || [];
            R.sidExists = sql(app, `select count(*) from users where user_id = ${ids.sa}`);
            await gotoAccess(page, app, B);
            await snap(page, 'v-03-list-reload');
            R.sidRowAfterReload = await table(page).getByRole('row').filter({hasText: mail(U('sa'))}).count();
        });
    } finally {
        for (const x of OPEN) await x.close().catch(() => {});
        try { sql(app, `DELETE FROM user_user_groups WHERE user_id = ${ids.sa} AND user_group_id = ${gAdmin}`); F.sidCleaned = sql(app, `select count(*) from user_user_groups where user_id = ${ids.sa} and user_group_id = ${gAdmin}`); } catch (e) { F.sidCleaned = `ERR ${flat(e.message, 200)}`; }
        record('s13-facts', F);
        log(app.name, run, 'done', JSON.stringify(F.errors));
    }
});
