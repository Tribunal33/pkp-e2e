// PR review check — pkp/pkp-lib#13440, pkp-lib#13441 + submodule-only ojs#5892, omp#2493, ops#1433
// (stable-3_5_0 only): the manager's Edit user page (Settings › Users & Roles › Edit, the
// userRoleAssignment page) still changes a role's masthead entry and removes a role. Drives the 3.5
// line's dataset fleet (it changes the data; reset the fleet before a rerun):
//
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=pr13440 PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13441/edit-user-roles.js
//
// As `rvaca`, on the page of a user with two active roles (Author and Reader): the Reader row's
// masthead select set to the other value and confirmed, then the Author row's
// "Remove Role" pressed and confirmed. Facts (what the page shows after a reload, the rows in
// user_user_groups, failed API answers) go to result-<app>.json; no assertions.
const {forEachApp, launch, signIn, idle, shot, outFile} = require('../../../probe');
const {execFileSync} = require('child_process');
const fs = require('fs');

const fold = (s) => (s || '').replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    const db = execFileSync('node', ['-e', 'process.stdout.write(require("./.reports/" + process.env.PROBE_FEATURE + "/fleet.json").apps[process.argv[1]].db || "")', app.name]).toString() || `${app.name}_test_3_5_ds1`;
    const sql = (q) => execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', '-d', db, '-At', '-F', '|', '-c', q], {env: {...process.env, PGPASSWORD: 'e2e'}}).toString().trim();
    // a user with an active Author (65536) and Reader (1048576) role in the first context
    const [uid, username] = sql(`select u.user_id, u.username from users u join user_user_groups uug on uug.user_id=u.user_id join user_groups ug on ug.user_group_id=uug.user_group_id where ug.context_id=1 and uug.date_end is null group by u.user_id, u.username having bool_or(ug.role_id=65536) and bool_or(ug.role_id=1048576) order by u.user_id limit 1`).split('|');
    const rows = () => sql(`select ug.role_id, coalesce(to_char(uug.date_end,'YYYY-MM-DD'),'active'), coalesce(uug.masthead::text,'null') from user_user_groups uug join user_groups ug on ug.user_group_id=uug.user_group_id where uug.user_id=${uid} and ug.context_id=1 order by ug.role_id`).split('\n');
    const R = {app: app.name, line: app.line || 'main', user: username, before: rows(), api: []};
    const {page, close} = await launch(app);
    page.on('response', async (r) => {
        if (/\/api\/v1\/users\/\d+\/(endRole|masthead)\//.test(r.url())) R.api.push({url: r.url().replace(/^.*\/api\/v1/, ''), status: r.status(), body: r.status() === 200 ? 'ok' : fold(await r.text()).slice(0, 120)});
    });
    await signIn(page, 'rvaca', {contextPath: app.contextPath});
    const editUrl = app.url(`/index.php/${app.contextPath}/en/management/settings/user/${uid}`);
    await page.goto(editUrl);
    await idle(page);
    const row = (re) => page.locator('tr').filter({hasText: re});
    // 1. masthead off on the Reader row
    const reader = row(/Reader/);
    const shown = await reader.locator('select').evaluate((el) => el.options[el.selectedIndex]?.text);
    R.mastheadChoice = /Does not/.test(shown) ? 'Appear on the masthead' : 'Does not appear on the masthead';
    await reader.locator('select').selectOption({label: R.mastheadChoice});
    await idle(page);
    await shot(page, `masthead-select-${app.name}`);
    await page.getByRole('button', {name: 'Confirm', exact: true}).click();
    await idle(page);
    // 2. Remove Role on the Author row
    await row(/Author/).getByRole('button', {name: 'Remove Role'}).click();
    await idle(page);
    await page.getByRole('button', {name: 'Remove Role', exact: true}).last().click();
    await idle(page);
    await page.reload();
    await idle(page);
    R.page = await page.locator('table tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    R.readerMasthead = await row(/Reader/).locator('select').evaluate((s) => s.options[s.selectedIndex]?.text).catch(() => null);
    R.after = rows();
    await shot(page, `edit-user-${app.name}`);
    fs.writeFileSync(outFile(`result-${app.name}.json`), JSON.stringify(R, null, 2));
    console.log(JSON.stringify(R));
    await close();
});
