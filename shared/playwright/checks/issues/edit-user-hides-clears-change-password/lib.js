// Helpers of walk.js here (issue report docs/issues/U01-A10-edit-user-hides-clears-change-password.md).
// Requiring this file runs nothing. Every helper drives the Site Administrator's screens as a person
// does: Administration › "Hosted …" › the context's arrow › "Settings wizard", tab "Users", and the
// grid's "Add User" and "Edit User" windows with their "Change Password" box.
const {idle, sql} = require('../../../probe');
const H = require('../refused-password-form-tab-loses-name/lib.js');

/** Per app, on PKP's default test dataset: the two accounts the steps flag, and an unflagged neighbour. */
const ACCOUNTS = {
    ojs: {shown: 'ccorino', cleared: 'ckwantes', neighbour: 'cmontgomerie'},
    omp: {shown: 'aclark', cleared: 'afinkel', neighbour: 'bbarnetson'},
    ops: {shown: 'ccorino', cleared: 'ckwantes', neighbour: 'cmontgomerie'},
};

/** Administration › "Hosted …" › arrow on the context › "Settings wizard" › tab "Users": the grid. */
async function openWizardUsers(page, app) {
    const {HostedContextsPage} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: H.HOSTED[app.name]});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    return hosted.openWizardTab('Users');
}

/** "Search" for the username, the row's arrow, "Edit User": the window, open. */
async function openEditUser(page, grid, username) {
    const {UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    await grid.search({text: username});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    return win;
}

/** "Add User" above the grid: the window, open. */
async function openAddUser(page, grid) {
    const {UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    await grid.addUserLink().click();
    const win = new UserDetailsWindow(page, 'Add User');
    await win.expectOpen();
    return win;
}

/** The "Change Password" box of an open window: its label and whether it is ticked. */
async function changeBox(win) {
    const box = win.mustChangePassword;
    return box.evaluate((e) => ({
        checked: e.checked,
        label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        section: ((e.closest('.section') || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    }));
}

/** "OK" on an open "Edit User" window, and the window gone. */
async function pressOk(page, win) {
    await win.pressOk();
    await win.expectClosed();
    await idle(page);
}

/** The account's stored flag (users.must_change_password): what the saves wrote. */
function storedFlag(app, username) {
    return sql(app, `select must_change_password from users where username = '${username}'`).trim();
}

module.exports = {ACCOUNTS, H, openWizardUsers, openEditUser, openAddUser, changeBox, pressOk, storedFlag};
