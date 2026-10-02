// Issue report docs/issues/U54-A14-users-tab-keeps-renamed-role-old-name.md (U54 A14): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), as the dataset's manager `rvaca`, on its own context
// `publicknowledge`. The kit builds nothing. Steps: Settings > Users & Roles, the "Users" tab
// (David Buskins' "Roles" cell); "Roles" tab, the section-editor role's (OMP series editor's,
// OPS moderator's) "Edit", "Role Name" "Handling editor", "OK"; the "Users" tab pressed
// without a reload; then the control, a reload.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54f --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54f PROBE_AGENT=u54f node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54f-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54f-3_5 PROBE_AGENT=u54f node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/walk.js
// Facts: .reports/<feature>/u54f/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', role: c.role, newName: H.NEW_NAME};
    const {page, close} = await launch(app);
    try {
        // 1-2. Sign in; Settings > Users & Roles, "Users".
        await signIn(page, 'rvaca');
        const {users, roles} = H.tabs(page, app);
        await users.goto();
        facts.before = await H.personRow(users);
        record('01-users-before', await screen(page));
        await shot(page, '01-users-before');

        // 3-4. "Roles", the role's "Edit", "Role Name", "OK".
        await roles.openTab();
        await screen(page); // drop earlier notices
        facts.rename = await H.rename(page, roles, c.role, H.NEW_NAME);
        record('02-roles-renamed', await screen(page));
        await shot(page, '02-roles-renamed');

        // 5. "Users", no reload.
        facts.usersFetchesOnTab = await H.pressUsersTab(page, users);
        facts.after = await H.personRow(users);
        record('03-users-after-rename', await screen(page));
        await shot(page, '03-users-after-rename');

        // Control: reload.
        await page.reload();
        await users.table.locator('tbody tr').first().waitFor({timeout: 30_000});
        facts.afterReload = await H.personRow(users);
        record('04-users-after-reload', await screen(page));
        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('walk', facts);
        throw error;
    } finally {
        await close();
    }
});
