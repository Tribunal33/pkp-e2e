// Helpers of walk.js and ended.js here (issue report
// docs/issues/U54-A4-role-remove-warning-promises-deletion.md). Requiring this file runs nothing.
const {idle, screen, shot, record} = require('../../../probe');

const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};

/**
 * As the site administrator: Administration > Hosted Journals (Presses, Servers), the context's
 * "Settings wizard", tab "Users", search the username, "Edit User", tick or untick a role under
 * "User Roles", "OK". Returns the user's "Roles" cell in that list afterwards.
 */
async function setRoleAsAdmin(page, app, {username, role, on}) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: HOSTED[app.name]});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    let grid = await hosted.openWizardTab('Users');
    await grid.search({text: username});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    if (on) {
        await win.roleBox(role).check();
    } else {
        await win.roleBox(role).uncheck();
    }
    await win.pressOk();
    await win.expectClosed();
    await idle(page);
    grid = await hosted.reloadWizardTab('Users');
    await grid.search({text: username});
    return (await grid.rowCells(username))[3];
}

/**
 * On the Roles tab: the row's "Settings" labels; when it offers "Remove", "Remove" > the
 * "Confirm" window's text and buttons > "OK", with the answer and the notices that showed.
 */
async function removeRole(page, tab, name, step) {
    const out = {role: name, actions: await tab.rowActionLabels(name)};
    if (!out.actions.includes('Remove')) {
        out.removeOffered = false;
        return out;
    }
    const dialog = await tab.openRemove(name);
    out.confirmText = await dialog.text();
    out.buttons = await dialog.buttonLabels();
    record(`${step}-confirm`, await screen(page));
    await shot(page, `${step}-confirm`);
    const response = await dialog.ok();
    await idle(page);
    out.status = response.status();
    out.notices = (await screen(page)).notices;
    return out;
}

module.exports = {setRoleAsAdmin, removeRole};
