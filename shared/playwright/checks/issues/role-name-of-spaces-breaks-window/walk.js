// Issue report docs/issues/U54-A10-role-name-of-spaces-breaks-window.md (U54 A10): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), on its own context `publicknowledge`, as its manager `rvaca`.
// The kit builds nothing.
//   Creating (steps 1-6): "Create New Role", "Permission level" "Assistant", "Copyediting" (OPS:
//      "Production") ticked, "Role Name" of three spaces, "Abbreviation" "U54G", "OK"; then "Role
//      Name" "u54g role", "OK" again; then the new role's row on the "Roles" tab.
//   Editing (steps 7-10): "Copyeditor" (OPS: "Author") › "Edit", "Abbreviation" of three spaces,
//      "OK"; then the abbreviation typed back, "OK" again.
// Afterwards (not a step) the list is read after a reload and the stored roles counted.
// WALK_PART=create or WALK_PART=edit in front takes one group only.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54g --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u54g PROBE_AGENT=u54g node bin/probe.js all shared/playwright/checks/issues/role-name-of-spaces-breaks-window/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54g-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54g-3_5 PROBE_AGENT=u54g node bin/probe.js all shared/playwright/checks/issues/role-name-of-spaces-breaks-window/walk.js
// Facts: .reports/<feature>/u54g/walk[-<run>]-<app>.json (the Assistant-level creating group: PROBE_RUN=lower, WALK_PART=create)
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const groups = () => sql(app, `select count(*) from user_groups`).trim();
    facts.groupsAtStart = groups();
    const {page, close} = await launch(app);
    try {
        // 1-2. rvaca, Settings > Users & Roles > "Roles".
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);
        await tab.goto();
        const part = process.env.WALK_PART || 'all';
        let win;

        if (part !== 'edit') {
            // 3. "Create New Role", level "Assistant", one stage ticked, name of spaces, abbreviation "U54G".
            win = await tab.openCreate();
            await win.chooseLevel(H.LEVEL);
            await win.stageBox(c.ticked).check();
            facts.step3 = {before: await H.windowState(win)};
            await win.nameBox().fill(H.SPACES);
            await win.abbrevBox().fill('U54G');

            // 4. "OK".
            facts.step4 = {ok: await H.pressOk(page, win)};
            facts.step4.window = await H.windowState(win);
            record('04-create-refused', await screen(page));
            await shot(page, '04-create-refused');

            // 5. A real name, "OK" again.
            if (facts.step4.window.open) {
                await win.nameBox().fill('u54g role');
                facts.step5 = {ok: await H.pressOk(page, win)};
                facts.step5.window = await H.windowState(win);
                record('05-create-second-ok', await screen(page));
                await shot(page, '05-create-second-ok');
            }
            facts.afterCreate = {groups: groups()};

            // 6. The Roles tab again: the new role's row.
            await tab.goto();
            facts.step6 = {level: (await tab.level('u54g role').innerText().catch(() => '')).trim(), stages: await tab.boxStates('u54g role')};
            facts.step6.stored = sql(app, `select stage_id from user_group_stage where user_group_id = (select max(user_group_id) from user_groups)`).trim().split('\n').filter(Boolean);
            record('06-new-row', await screen(page));
            await shot(page, '06-new-row');
        }

        if (part !== 'create') {
            // 7-8. The Roles tab again; "Edit" on the role, abbreviation of spaces.
            await tab.goto();
            win = await tab.openEdit(c.edited);
            facts.step8 = {before: await H.windowState(win)};
            await win.abbrevBox().fill(H.SPACES);

            // 9. "OK".
            facts.step9 = {ok: await H.pressOk(page, win)};
            facts.step9.window = await H.windowState(win);
            record('09-edit-refused', await screen(page));
            await shot(page, '09-edit-refused');

            // 10. The abbreviation typed back, "OK" again.
            if (facts.step9.window.open) {
                await win.abbrevBox().fill(c.abbrev);
                facts.step10 = {ok: await H.pressOk(page, win)};
                facts.step10.window = await H.windowState(win);
                record('10-edit-second-ok', await screen(page));
                await shot(page, '10-edit-second-ok');
            }
        }

        // Not a step: the list after a reload, and the roles stored.
        await tab.goto();
        facts.end = {list: await H.listed(tab, c.edited, 'u54g role'), groups: groups()};
        facts.end.stored = sql(
            app,
            `select ug.user_group_id, ug.role_id, s.setting_name, s.setting_value from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.locale = 'en' and s.setting_name in ('name','abbrev') where ug.user_group_id in (select user_group_id from user_group_settings where setting_name = 'name' and setting_value in ('${c.edited}', 'u54g role')) or ug.user_group_id > (select max(user_group_id) - 2 from user_groups) order by 1, 3`
        ).trim().split('\n');
    } finally {
        record('walk', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
