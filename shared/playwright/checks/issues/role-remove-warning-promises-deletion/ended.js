// Issue report docs/issues/U54-A4-role-remove-warning-promises-deletion.md (U54 A4), the Steps'
// "A role whose only member has left it": walked through the screens on PKP's default test
// dataset (a dataset fleet), OJS. The kit builds nothing; the role is made with "Create New Role",
// given to `svogt` and taken from her again in the site administrator's "Edit User" window.
//   8.  As `rvaca`: "Create New Role" "u54i Data desk".
//   9.  As `admin`: Administration › Hosted Journals › the journal's "Settings wizard" › "Users",
//       `svogt` › "Edit User", tick "u54i Data desk", "OK".
//   10. The same window again, untick it, "OK".
//   11. As `rvaca`: "Remove" › "OK" on "u54i Data desk"; a reload.
// Besides the screens it reads the role's rows in `user_user_groups` (read only), for Evidence.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54i --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-u54i PROBE_AGENT=u54i node bin/probe.js ojs shared/playwright/checks/issues/role-remove-warning-promises-deletion/ended.js
// Facts: .reports/<feature>/u54i/ended[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const {rolesTab} = require('../roles-list-first-row-no-edit-stale-rows/lib.js');
const {setRoleAsAdmin, removeRole} = require('./lib.js');

const ROLE = {name: 'u54i Data desk', abbrev: 'U54J', level: 'Assistant'};
const PERSON = 'svogt';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        // 8. The role.
        await signIn(page, 'rvaca');
        let tab = rolesTab(page, app);
        await tab.goto();
        const win = await tab.openCreate();
        await win.chooseLevel(ROLE.level);
        await win.nameBox().fill(ROLE.name);
        await win.abbrevBox().fill(ROLE.abbrev);
        facts.create = {status: (await win.save()).status()};
        await signOut(page);

        // 9-10. Given to svogt, then taken from her.
        await signIn(page, 'admin');
        facts.rolesCellGiven = await setRoleAsAdmin(page, app, {username: PERSON, role: ROLE.name, on: true});
        facts.rolesCellTaken = await setRoleAsAdmin(page, app, {username: PERSON, role: ROLE.name, on: false});
        record('01-svogt-after-untick', await screen(page));
        facts.storedRows = sql(app, `select uug.user_id, uug.date_start, uug.date_end from user_user_groups uug join user_group_settings s on s.user_group_id = uug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where s.setting_value = '${ROLE.name}'`);
        await signOut(page);

        // 11. "Remove" › "OK", and a reload.
        await signIn(page, 'rvaca');
        tab = rolesTab(page, app);
        await tab.goto();
        await screen(page);
        facts.remove = await removeRole(page, tab, ROLE.name, '02-ended');
        await tab.reload();
        facts.listedAfterReload = await tab.row(ROLE.name).count();
        await idle(page);
        record('ended', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('ended', facts);
        throw error;
    } finally {
        await close();
    }
});
