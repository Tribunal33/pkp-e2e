// Helpers of walk.js here (issue report docs/issues/U53-A13-A17-users-grid-roles-admin-empty-ended-listed.md),
// also used by ../add-user-notify-stays-greyed/walk.js. Requiring this file runs nothing. Every helper
// drives the Site Administrator's screens as a person does: Administration > "Hosted Journals" >
// "Settings wizard" > "Users" (the older users grid), Settings > Users & Roles and its "Merge user" window.
const {idle, sql} = require('../../../probe');

/** Per app, on PKP's default test dataset for main and stable-3_5_0. */
const CASES = {
    ojs: {hosted: 'Hosted Journals', manager: 'Journal manager', edited: {username: 'ccorino', name: 'Carlo Corino'}, author: 'ckwantes', reviewer: 'jjanssen', moved: {username: 'jjanssen', from: 'Reviewer', to: 'Reader'}},
    omp: {hosted: 'Hosted Presses', manager: 'Press manager', edited: {username: 'aclark', name: 'Arthur Clark'}, author: 'afinkel', reviewer: 'jjanssen', moved: {username: 'jjanssen', from: 'Internal Reviewer', to: 'Reader'}},
    ops: {hosted: 'Hosted Servers', manager: 'Preprint Server manager', edited: {username: 'ccorino', name: 'Carlo Corino'}, author: 'ckwantes', reviewer: null, moved: {username: 'minoue', from: 'Moderator', to: 'Reader'}},
};

function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/** Administration > "Hosted …" > arrow on "publicknowledge" > "Settings wizard" > tab "Users": the grid. */
async function openWizardUsers(page, app) {
    const {HostedContextsPage} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: CASES[app.name].hosted});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    return {hosted, grid};
}

/** The grid row whose "Username" cell is exactly `username`. */
function gridRow(grid, username) {
    return grid.scope
        .locator('tr.gridRow')
        .filter({has: grid.page.locator('td').filter({hasText: new RegExp(`^\\s*${username}\\s*$`)})})
        .first();
}

/** A grid row's cells {given, family, username, roles, email}, or null when the row is not listed. */
async function gridRowCells(grid, username) {
    const row = gridRow(grid, username);
    if (!(await row.count())) {
        return null;
    }
    const cells = (await row.locator('td').allInnerTexts()).map(flat).map((c) => c.replace(/^Settings\s*/, ''));
    const [given, family, user, roles, email] = cells;
    return {given, family, username: user, roles, email};
}

/** "Search" above the grid, the username typed, the form's "Search"; the row's cells. */
async function searchGrid(grid, username) {
    await grid.search({text: username});
    return gridRowCells(grid, username);
}

/** Settings > Users & Roles: a row's "Name", "Roles" (lines) and "Start Date" (lines). */
async function usersListRow(page, app, email) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await idle(page);
    const row = list.row(email).first();
    return {
        list,
        row,
        cells: {
            name: flat(await list.nameCell(row).innerText()),
            roles: await list.cellLines(list.rolesCell(row)),
            startDate: await list.cellLines(list.startDateCell(row)),
        },
    };
}

/** On the Users & Roles list: "…" on a row, "Merge user"; the "Merge user" window, open. */
async function openMergeWindow(page, list, row) {
    const {MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    await list.chooseAction(row, 'Merge user');
    const merge = new MergeUserWindow(page);
    await merge.expectOpen();
    return merge;
}

/** The "Merge user" window's own "Close" (the × at its top). */
async function closeMergeWindow(page, merge) {
    await merge.dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
    await merge.expectClosed();
}

/** A row's arrow, then "Edit User": the window, open. */
async function openEditUser(page, grid, username) {
    const {UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const row = gridRow(grid, username);
    const arrow = row.locator('a.show_extras');
    if (await arrow.count()) {
        await arrow.click();
    }
    const links = row.locator('xpath=following-sibling::tr[1]').locator('a');
    await links.filter({hasText: /^\s*Edit User\s*$/}).first().click();
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    return win;
}

/** The ticked "User Roles" boxes of an open "Edit User" window, by label. */
async function tickedRoles(win) {
    return win.rolesForm()
        .locator('input[name="userGroupIds[]"]')
        .evaluateAll((els) => els.filter((e) => e.checked).map((e) =>
            ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim()));
}

/** The user's role rows in the database: group name, start, end (what the screens saved). */
function storedRoles(app, username) {
    return sql(app, `select coalesce((select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en'), ug.user_group_id::text), uug.date_start, uug.date_end
        from user_user_groups uug join users u on u.user_id = uug.user_id join user_groups ug on ug.user_group_id = uug.user_group_id
        where u.username = '${username}' order by uug.user_group_id`).split('\n').filter(Boolean);
}

module.exports = {CASES, flat, openWizardUsers, gridRow, gridRowCells, searchGrid, usersListRow, openMergeWindow, closeMergeWindow, openEditUser, tickedRoles, storedRoles};
