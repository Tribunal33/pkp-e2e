// Helpers of walk.js (issue report docs/issues/U53-A1-A2-user-menu-offers-refused-actions.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or types into the
// list's search box.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Settings > Users & Roles > "Users", opened, with the list's page object. */
async function openList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await idle(page);
    return list;
}

/** Type `phrase` in the list's search box, press Enter, and return the row holding `email`. */
async function findRow(page, list, phrase, email) {
    await list.search(phrase);
    await idle(page);
    const row = list.row(email).first();
    await row.waitFor({timeout: T});
    return row;
}

/** A row's Roles lines and its menu's labels (the menu opened and closed again). */
async function rowFacts(list, row) {
    return {
        roles: await list.cellLines(list.rolesCell(row)),
        startDate: await list.cellLines(list.startDateCell(row)),
        menu: await list.menuLabels(row),
    };
}

/**
 * Press "Disable User" (or "Enable User") on a row and read the window that opens:
 * its text, whether it holds the reason box, and its buttons. Leaves it with "Close" or
 * "Cancel" unless `submit` is given, which types the reason and presses "OK".
 */
async function disableWindow(page, list, row, {label, title, submit}) {
    const {DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    await list.chooseAction(row, label);
    const win = new DisableUserWindow(page, title);
    await win.expectOpen();
    await page.waitForTimeout(500);
    await idle(page);
    const out = {
        title,
        text: flat(await win.dialog.innerText()),
        reasonBox: (await win.reason.count()) > 0,
        buttons: (await win.dialog.locator('button, a.cancelButton, a[role="button"]').allInnerTexts()).map(flat).filter(Boolean),
    };
    if (submit != null && out.reasonBox) {
        await win.reason.fill(submit);
        await win.ok();
        await idle(page);
        out.submitted = true;
    } else if (out.reasonBox) {
        await win.cancel();
    } else {
        await win.closeButton.click();
        await win.heading.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await page.waitForTimeout(600);
    }
    return out;
}

/**
 * Press "Remove User" on a row and "OK" in the "Remove" dialog. Returns the dialog's text,
 * the remove request's status and JSON answer, and the dialog that follows (if any), which
 * is closed with its "OK".
 */
async function removeUser(page, list, row) {
    const {RemoveUserDialog} = require('../../../pages/UsersManagementPages.js');
    await list.chooseAction(row, 'Remove User');
    const dlg = new RemoveUserDialog(page);
    await dlg.expectOpen();
    const out = {dialog: flat(await dlg.dialog.innerText())};
    const response = await dlg.ok();
    out.status = response.status();
    out.answer = await response.json().catch(() => null);
    const after = page.getByRole('dialog').filter({hasText: /\S/}).last();
    const shown = await after.waitFor({timeout: 5000}).then(() => true).catch(() => false);
    if (shown) {
        out.after = flat(await after.innerText());
        const ok = after.getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) await ok.click();
        await page.waitForTimeout(600);
    } else {
        out.after = null;
    }
    await idle(page);
    return out;
}

module.exports = {T, flat, openList, findRow, rowFacts, disableWindow, removeUser};
