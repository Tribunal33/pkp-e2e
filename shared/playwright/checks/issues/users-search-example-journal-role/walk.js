// Issue report U53 A4: on Settings › Users & Roles, the "Current Users"
// search box reads "Enter a user's name, role (e.g Journal editor), or
// affiliation" on a press and a preprint server too, where no role of that
// name exists, so following the example finds nobody.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-2  rvaca › Settings › Users & Roles ("Users" tab, "Current Users")
//   3    the search box's placeholder and its name to a screen reader
//   4    "Journal editor" + Enter: the list's heading and rows
//   5    × ("Clear search phrase"), "Press editor" (OPS "Moderator") + Enter
// OJS is the control: its editor role is named "Journal editor".
// Neighbour check (fix in and out): the editorial dashboard's own search
// box keeps its text, and step 5's role search finds the same users.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-search-example-journal-role/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const OWN_EDITOR_ROLE = {ojs: 'Journal editor', omp: 'Press editor', ops: 'Moderator'};
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const ct = app.contextTables;
    // The context's own role names, for the report's Evidence (a read only).
    facts.contextRoles = sql(app, `SELECT ugs.setting_value FROM user_groups ug JOIN ${ct.table} c ON c.${ct.id} = ug.context_id
        JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE c.path = '${app.contextPath}' ORDER BY ug.user_group_id`).split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const users = page.getByRole('table', {name: /^Current Users \(/});
    const box = page.getByRole('searchbox').first();
    const readList = async (key) => {
        await idle(page);
        await sleep(500);
        const s = await screen(page);
        record(key, s);
        return {
            heading: flat(await page.getByText(/^Current Users \(\d+\)/).first().innerText().catch(() => null), 80),
            names: (await users.locator('tbody tr').evaluateAll((rows) => rows.map((r) => (r.querySelector('td') || r).innerText.replace(/\s+/g, ' ').trim()))),
            pager: flat(await page.getByText(/^Showing \d+ to \d+ of \d+/).first().innerText().catch(() => null), 80),
        };
    };
    const search = async (phrase, key) => {
        await box.fill(phrase);
        await box.press('Enter');
        return readList(key);
    };
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. Settings › Users & Roles, "Users" tab.
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: T});
        facts.step2 = await readList('02-users-list');
        // 3. The search box before anything is typed.
        facts.step3 = {
            placeholder: await box.getAttribute('placeholder'),
            accessibleName: await box.evaluate((el) => (el.labels && el.labels[0] ? el.labels[0].innerText : null)).catch(() => null),
            ariaSnapshot: await box.ariaSnapshot(),
            value: await box.inputValue(),
        };
        // 4. "Journal editor" + Enter.
        facts.step4 = await search('Journal editor', '04-search-journal-editor');
        // 5. ×, the app's own editor role + Enter.
        const clear = page.getByRole('button', {name: 'Clear search phrase'});
        facts.step5 = {clearOffered: await clear.count()};
        await clear.first().click();
        await idle(page);
        facts.step5.afterClear = (await readList('05-cleared')).heading;
        facts.step5.phrase = OWN_EDITOR_ROLE[app.name];
        Object.assign(facts.step5, await search(OWN_EDITOR_ROLE[app.name], '05-search-own-role'));

        // Neighbour: the editorial dashboard's search box.
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        const dbox = page.getByRole('searchbox').first();
        await dbox.waitFor({timeout: T});
        await idle(page);
        facts.neighbourDashboardSearch = {placeholder: await dbox.getAttribute('placeholder'), ariaSnapshot: await dbox.ariaSnapshot()};
        record('06-dashboard', await screen(page));
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 1500);
        record('error-screen', await screen(page).catch(() => ({})));
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
