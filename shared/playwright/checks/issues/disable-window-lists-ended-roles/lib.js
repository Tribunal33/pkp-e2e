// Helpers for the U53 A6 and A7 issue walks (Settings > Users & Roles, the
// "Disable"/"Enable" windows, the user's roles page, the Login page), on PKP's
// default test dataset. Requiring this file runs nothing.
//   docs/issues/U53-A6-disable-window-lists-ended-roles.md
//   docs/issues/U53-A7-enabling-reason-kept-as-disabling-reason.md
const {expect} = require('@playwright/test');
const {idle, screen} = require('../../../probe');

const T = 30_000;

// The dataset's users each walk uses (docs/process/dataset.md): one with the
// roles Author and Reader on every app, and a control with the same roles.
const CASES = {
    ojs: {user: {username: 'ccorino', name: 'Carlo Corino'}, control: {username: 'cmontgomerie', name: 'Craig Montgomerie'}},
    omp: {user: {username: 'aclark', name: 'Arthur Clark'}, control: {username: 'afinkel', name: 'Alvin Finkel'}},
    ops: {user: {username: 'ccorino', name: 'Carlo Corino'}, control: {username: 'cmontgomerie', name: 'Craig Montgomerie'}},
};
exports.CASES = CASES;

function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}
exports.flat = flat;

/**
 * Open Settings > Users & Roles and search for one user by family name, so
 * the row is on the list's first page. Returns the list page object and the
 * row.
 */
async function findUser(page, app, who) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await list.search(who.name.split(' ').pop());
    const row = list.row(`${who.username}@mailinator.com`);
    await expect(row).toHaveCount(1, {timeout: T});
    await idle(page);
    return {list, row};
}
exports.findUser = findUser;

/** The lines of a row's "Roles" cell. */
async function rolesColumn(list, row) {
    return list.cellLines(list.rolesCell(row));
}
exports.rolesColumn = rolesColumn;

/**
 * Press a row's "..." then "Disable User" or "Enable User" and wait for the
 * window's form. Returns {win, title, rolesLine, reason, text}.
 */
async function openStatusWindow(page, list, row, who, action) {
    const {DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    const title = `${action === 'Disable User' ? 'Disable' : 'Enable'} ${who.name}`;
    await list.chooseAction(row, action);
    const win = new DisableUserWindow(page, title);
    await win.expectOpen();
    await expect(win.okButton).toBeVisible({timeout: T});
    await idle(page);
    const text = flat(await win.dialog.innerText());
    const m = text.match(/Current Roles\s*:\s*[^]*?(?=\s*(Reason for|Please note|Once the user)|$)/);
    // a window without a reason box (the A7 fix's "Enable") reads null
    const reason = (await win.reason.count()) ? await win.reason.inputValue() : null;
    return {win, title, rolesLine: m ? flat(m[0]) : null, reason, text};
}
exports.openStatusWindow = openStatusWindow;

/**
 * Type a reason into an open window's box (replacing what it holds), press
 * "OK" and wait for the save. Returns the save's status and the row's
 * disabled icon afterwards.
 */
async function saveStatusWindow(page, win, reason) {
    const typed = reason !== undefined && (await win.reason.count()) > 0;
    if (typed) await win.reason.fill(reason);
    const answer = page.waitForResponse((r) => /disable-user/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.ok();
    const res = await answer;
    await idle(page);
    return {status: res.status(), typed: reason === undefined ? null : typed};
}
exports.saveStatusWindow = saveStatusWindow;

/**
 * From a row, "..." > "Edit" opens the user's roles page; there "Remove Role"
 * on one role and confirm. Returns the endRole answer's status and the role
 * row's text afterwards.
 */
async function removeRole(page, list, row, role) {
    await list.chooseAction(row, 'Edit');
    const newRole = page.getByLabel(/^Select a new role/);
    const roleRow = page.getByRole('row').filter({hasText: role}).filter({hasNot: newRole}).filter({has: page.getByRole('button', {name: 'Remove Role'})});
    await expect(roleRow).toHaveCount(1, {timeout: T});
    await idle(page);
    const rolesPage = await screen(page);
    await roleRow.getByRole('button', {name: 'Remove Role'}).click();
    const dialog = page.getByRole('dialog', {name: 'Remove Role'});
    await expect(dialog).toBeVisible({timeout: T});
    const dialogText = flat(await dialog.innerText());
    const ended = page.waitForResponse((r) => r.url().includes('/endRole/'), {timeout: T});
    await dialog.getByRole('button', {name: 'Remove Role'}).click();
    const res = await ended;
    await expect(dialog).toBeHidden({timeout: T});
    await idle(page);
    const after = page.getByRole('row').filter({hasText: role}).filter({hasNot: newRole}).first();
    return {status: res.status(), dialogText, rowAfter: flat(await after.innerText()), rolesPage};
}
exports.removeRole = removeRole;

/** From a row, "..." > "Remove User", confirmed: every role of the user here ends. */
async function removeUser(page, list, row) {
    const {RemoveUserDialog} = require('../../../pages/UsersManagementPages.js');
    await list.chooseAction(row, 'Remove User');
    const dialog = new RemoveUserDialog(page);
    await dialog.expectOpen();
    const res = await dialog.ok();
    await idle(page);
    return {status: res.status()};
}
exports.removeUser = removeUser;

/**
 * Try to sign in on the journal's Login page in a page of its own; returns
 * where it landed and the page's error line (null when it signed in).
 */
async function tryLogin(page, app, username) {
    const locale = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(`/index.php/${app.contextPath}${locale}/login`);
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(username + username);
    await Promise.all([
        page.waitForLoadState('load').catch(() => null),
        page.locator('form#login button[type="submit"]').click(),
    ]);
    await page.waitForLoadState('domcontentloaded');
    await idle(page);
    const error = page.locator('.pkp_form_error');
    const errorText = (await error.count()) ? flat(await error.first().innerText()) : null;
    return {url: page.url(), signedIn: !/\/login/.test(new URL(page.url()).pathname), error: errorText};
}
exports.tryLogin = tryLogin;
