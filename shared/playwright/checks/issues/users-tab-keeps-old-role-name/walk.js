// Issue report walk: docs/issues/U54-A14-users-tab-keeps-old-role-name.md
// (spec U54 register A14). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `rvaca` (the context's manager):
//   1-2 Settings › Users & Roles (the "Users" tab: David Buskins's "Roles"
//   cell); 3 the "Roles" tab; 4 "Section editor" (OMP "Series editor", OPS
//   "Moderator") › "Edit"; 5 "Role Name" "u54w48 Desk editor", "OK";
//   6 the "Users" tab (the cell read at once and again 10 s later);
//   7 reload, the "Users" tab.
// Every GET of the users list (`/api/v1/users`) is counted, so a read says
// whether the list was fetched again after the save.
// Neighbour (the paths a fix must leave alone), after step 7: "Buskins" in
// the Users tab's search; on the "Roles" tab a row's "Edit" › "Cancel" and
// a stage-box press (neither may fetch the users list); then a second
// rename ("u54w48 Desk editor 2", "OK") and the "Users" tab again (with the
// fix: one fetch, the search kept, the new name). The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w48 --dataset 4 --reset
//   PROBE_FEATURE=issues-w48 PROBE_AGENT=w48 node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-old-role-name/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w48-3_5 --dataset 4 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w48-3_5 PROBE_AGENT=w48 node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-old-role-name/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w48/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const NEW_NAME = 'u54w48 Desk editor';
const NEW_NAME_2 = 'u54w48 Desk editor 2';
const MEMBER = 'dbuskins@mailinator.com';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const ROLE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'}[app.name];
    const facts = {line: app.line || 'main', baseURL: app.baseURL, role: ROLE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const {page, close} = await launch(app);
    const usersFetches = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/users(\?|$)/.test(r.url())) {
            usersFetches.push(decodeURIComponent(r.url().replace(/^.*\/api\/v1\/users/, '')));
        }
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    const users = new UsersListPage(page, app.contextPath);
    const roles = new RolesTab(page, app.contextPath, {stages: []});
    const openUsersTab = async () => {
        await roles.usersTab.click();
        await idle(page).catch(() => {});
        await users.table.locator('tbody tr').first().waitFor({timeout: 30_000});
    };
    const memberCell = async () => {
        const row = users.row(MEMBER);
        if (!(await row.count())) return {row: 'not on this page of the list', rows: await users.rows().count(), paging: await users.pagingLine()};
        return {roles: await users.cellLines(users.rolesCell(row.first())), rows: await users.rows().count()};
    };
    try {
        // 1-2
        await signIn(page, 'rvaca');
        await users.goto();
        await idle(page).catch(() => {});
        fact('02-users tab on landing', {url: page.url(), cell: await memberCell(), fetches: usersFetches.slice()});
        await snap('users-landing');

        // 3
        await roles.openTab();
        fact('03-roles listed', await roles.rowNames());

        // 4-5
        const win = await roles.openEdit(ROLE);
        fact('04-edit window', {name: await win.nameBox('en').inputValue(), level: await win.levelLabel()});
        await win.nameBox('en').fill(NEW_NAME);
        const before5 = usersFetches.length;
        const saved = await win.save();
        await pause(800);
        fact('05-saved', {status: saved.status(), notice: await notices(), roles: await roles.rowNames(),
            usersFetchesAfterSave: usersFetches.slice(before5)});
        await snap('roles-renamed');

        // 6
        const before6 = usersFetches.length;
        await openUsersTab();
        fact('06-users tab, at once', {cell: await memberCell(), usersFetches: usersFetches.slice(before6)});
        await snap('users-tab-after-rename');
        await pause(10_000);
        fact('06-users tab, 10 s later', {cell: await memberCell(), usersFetches: usersFetches.slice(before6)});

        // 7
        await page.reload();
        await idle(page).catch(() => {});
        fact('07-after reload, tab shown', {url: page.url(),
            usersTabSelected: await roles.usersTab.getAttribute('aria-selected'),
            rolesTabSelected: await roles.tab.getAttribute('aria-selected')});
        await openUsersTab();
        fact('07-users tab after reload', {cell: await memberCell()});
        await snap('users-tab-after-reload');

        // Neighbour: the search kept, no fetch for a cancelled window or a stage press.
        const s = await users.search('Buskins');
        await idle(page).catch(() => {});
        fact('N1-search Buskins', {status: s.status(), cell: await memberCell()});
        await roles.openTab();
        const beforeN2 = usersFetches.length;
        const w2 = await roles.openEdit(NEW_NAME);
        await w2.cancel();
        const box = roles.stageBoxes(NEW_NAME).first();
        const pressed = page.waitForResponse((r) => /(un)?assign-stage/.test(r.url()), {timeout: 20_000});
        await box.click();
        const pr = await pressed.catch(() => null);
        await idle(page).catch(() => {});
        await pause(1500);
        fact('N2-cancel and stage press', {stageStatus: pr ? pr.status() : 'no answer', notice: await notices(),
            usersFetches: usersFetches.slice(beforeN2)});
        const w3 = await roles.openEdit(NEW_NAME);
        await w3.nameBox('en').fill(NEW_NAME_2);
        const beforeN3 = usersFetches.length;
        const saved2 = await w3.save();
        await pause(800);
        fact('N3-second rename saved', {status: saved2.status(), usersFetchesAfterSave: usersFetches.slice(beforeN3)});
        await openUsersTab();
        await pause(1000);
        fact('N3-users tab', {search: await users.searchBox.inputValue(), cell: await memberCell(),
            usersFetches: usersFetches.slice(beforeN3)});
        await snap('N3-users-tab');
    } finally {
        record('facts', facts);
        await close();
    }
});
