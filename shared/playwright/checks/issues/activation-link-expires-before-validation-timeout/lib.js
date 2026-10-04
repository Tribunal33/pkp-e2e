// Helpers of walk.js (issue report docs/issues/U02-A1-activation-link-expires-before-validation-timeout.md).
// Requiring this file runs nothing.

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Settings › Users & Roles › "Users" of `contextPath`: search `phrase`, the row holding `email`,
 * its "…" menu, "Enable User", "OK" in the "Enable {name}" window (the dataset's list runs to
 * several pages, so the row is searched for). The page must be signed in as a manager.
 */
async function enableUserSearched(page, contextPath, {phrase, email, fullName}) {
    const {UsersListPage, DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, contextPath);
    await list.goto();
    await list.search(phrase);
    const row = list.row(email).first();
    await row.waitFor({state: 'visible', timeout: T});
    const rowText = flat(await row.innerText());
    const labels = await list.menuLabels(row);
    await list.chooseAction(row, 'Enable User');
    const win = new DisableUserWindow(page, `Enable ${fullName}`);
    await win.expectOpen();
    const text = flat(await win.dialog.innerText());
    await win.ok();
    return {row: rowText, labels, window: text};
}

module.exports = {enableUserSearched};
