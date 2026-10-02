// U53 A6 walk (issue report docs/issues/U53-A6-disable-window-lists-ended-roles.md).
// On PKP's default test dataset (a freshly reset install):
//   steps (no argument): rvaca opens Settings > Users & Roles, finds Carlo Corino
//     (OMP Arthur Clark), reads the "Roles" column; "..." > "Edit" opens the roles page,
//     "Remove Role" on Reader, confirmed; back on the list the "Roles" column again;
//     "..." > "Disable User" and the window's "Current Roles" line; "Cancel".
//   neighbour (argument `neighbour`): the control user with no ended role
//     (Craig Montgomerie, OMP Alvin Finkel): "Disable User" lists both roles; then
//     the steps' user is disabled and "Enable User" read, where the line must still
//     name the roles the user holds; then "Remove User" on the control user ends all
//     their roles here, and their "Disable User" window is read again.
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv.slice(2).find((a) => a === 'neighbour') || 'steps';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode, user: c.user.username};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        if (mode === 'steps') {
            let {list, row} = await H.findUser(page, app, c.user);
            facts.rolesBefore = await H.rolesColumn(list, row);
            record('a6-01-list-before', await screen(page));
            try {
                facts.removeRole = await H.removeRole(page, list, row, 'Reader');
                record('a6-02-roles-page', facts.removeRole.rolesPage);
                delete facts.removeRole.rolesPage;
                record('a6-03-roles-page-after', await screen(page));
            } catch (e) {
                facts.removeRoleError = String(e.message || e).slice(0, 400);
            }
            ({list, row} = await H.findUser(page, app, c.user));
            facts.rolesAfter = await H.rolesColumn(list, row);
            record('a6-04-list-after', await screen(page));
            const w = await H.openStatusWindow(page, list, row, c.user, 'Disable User');
            facts.disableWindow = {title: w.title, rolesLine: w.rolesLine, text: w.text};
            record('a6-05-disable-window', await screen(page));
            await w.win.cancel();
        } else {
            // N1: a user with no ended role keeps both roles in the line
            let {list, row} = await H.findUser(page, app, c.control);
            facts.controlRoles = await H.rolesColumn(list, row);
            let w = await H.openStatusWindow(page, list, row, c.control, 'Disable User');
            facts.controlDisableWindow = {rolesLine: w.rolesLine};
            record('a6-n1-control-disable-window', await screen(page));
            await w.win.cancel();
            // N2: the Enable window of a disabled user with current roles only
            ({list, row} = await H.findUser(page, app, c.user));
            w = await H.openStatusWindow(page, list, row, c.user, 'Disable User');
            facts.n2Disable = await H.saveStatusWindow(page, w.win, '');
            ({list, row} = await H.findUser(page, app, c.user));
            w = await H.openStatusWindow(page, list, row, c.user, 'Enable User');
            facts.n2EnableWindow = {rolesLine: w.rolesLine};
            record('a6-n2-enable-window', await screen(page));
            await w.win.cancel();
            // N3: a user whose roles here have all ended ("Remove User")
            try {
                ({list, row} = await H.findUser(page, app, c.control));
                facts.n3RemoveUser = await H.removeUser(page, list, row);
                ({list, row} = await H.findUser(page, app, c.control));
                facts.n3Roles = await H.rolesColumn(list, row);
                w = await H.openStatusWindow(page, list, row, c.control, 'Disable User');
                facts.n3DisableWindow = {rolesLine: w.rolesLine};
                record('a6-n3-all-ended-disable-window', await screen(page));
                await w.win.cancel();
            } catch (e) {
                facts.n3Error = String(e.message || e).slice(0, 400);
            }
        }
        await signOut(page);
    } finally {
        record('a6-facts', facts);
        console.log(JSON.stringify(facts, null, 1).slice(0, 3000));
        await close();
    }
});
