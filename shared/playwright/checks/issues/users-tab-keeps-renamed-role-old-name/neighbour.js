// Neighbour check of issue report docs/issues/U54-A14-users-tab-keeps-renamed-role-old-name.md
// (U54 A14), walked with the fix in and out: the Users tab's own state survives the refresh the
// fix adds. As `rvaca` on PKP's default test dataset: the "Users" tab, search "Buskins" (Enter);
// "Roles", the section-editor role (OMP series editor, OPS moderator) renamed
// "Handling editor"; "Users" again, no reload: the list is still the search's one row (the
// search box still reads "Buskins"), and the row's "Roles" cell (old name without the fix, new
// with it). Then on "Roles" the renamed role's last stage box is pressed (its answer carries no
// role-updated event): "Users" sends no request.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54f --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54f PROBE_AGENT=u54f node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/neighbour.js
// Facts: .reports/<feature>/u54f/neighbour[-<run>]-<app>.json
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', role: c.role, newName: H.NEW_NAME};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const {users, roles} = H.tabs(page, app);
        await users.goto();
        await users.search('Buskins');
        await expect(users.rows()).toHaveCount(1, {timeout: 30_000});
        facts.searched = await H.personRow(users);

        await roles.openTab();
        await screen(page);
        facts.rename = await H.rename(page, roles, c.role, H.NEW_NAME);

        facts.usersFetchesOnTab = await H.pressUsersTab(page, users);
        facts.afterRename = {...(await H.personRow(users)), searchBox: await users.searchBox.inputValue()};
        record('01-users-search-kept', await screen(page));
        await shot(page, '01-users-search-kept');

        // A stage box of the same role (its answer carries no role-updated event): the Users tab
        // sends no request.
        await roles.openTab();
        const stage = c.stages[c.stages.length - 1];
        const box = roles.stageBox(H.NEW_NAME, stage);
        facts.stageBox = {role: H.NEW_NAME, stage, disabled: await box.isDisabled()};
        if (!facts.stageBox.disabled) {
            facts.stageBox.status = (await roles.pressStageBox(H.NEW_NAME, stage)).status();
        }
        facts.usersFetchesAfterStageBox = await H.pressUsersTab(page, users);
        record('neighbour', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('neighbour', facts);
        throw error;
    } finally {
        await close();
    }
});
