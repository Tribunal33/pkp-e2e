// Helpers of walk.js (issue report docs/issues/U08-A15-navigation-table-keeps-old-item-titles.md).
// Requiring this file runs nothing. Every helper drives or reads the screens a person uses;
// each records what it saw rather than throwing, so a fix trial reads the state the fix brings.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Every reload of the "Navigation" (menus) table the page asks for while armed. */
function menusGridFetches(page) {
    const seen = [];
    const on = (r) => {
        if (/navigation-menus-grid\/fetch-(grid|row)/.test(r.url())) seen.push(r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''));
    };
    page.on('request', on);
    return {list: () => [...seen], stop: () => page.off('request', on)};
}

/** The "Navigation" table's cell of a menu, split into its items (sorted: the cell has no fixed order). */
async function cell(tab, menu) {
    const text = await tab.menuItemsCell(menu).catch((e) => `read failed: ${flat(e.message, 120)}`);
    return {text, items: /^read failed/.test(text) ? null : text.split(', ').sort()};
}

/** Wait for what a press started, then a short settle: a table redraw lands after its request. */
async function settle(page) {
    await idle(page).catch(() => {});
    await sleep(800);
}

/**
 * An item's "Edit", a new "Title" (form language English), "Save". Returns the save's answer,
 * whether the success notice showed and whether the window closed; a refused save leaves the
 * window open, and `close` then shuts it.
 */
async function renameItem(page, tab, from, to, {close = false} = {}) {
    const out = {from, to};
    try {
        const win = await tab.editItem(from);
        out.titleBefore = await win.titleInput('en').inputValue().catch(() => null);
        await win.titleInput('en').fill(to);
        const notice = page.locator('[class*="otification"]:visible').filter({hasText: 'Navigation menu item was successfully updated'}).first();
        const seen = notice.waitFor({state: 'visible', timeout: 10_000}).then(() => true, () => false);
        // The save's answer, when the form sends one (a box the browser refuses sends nothing).
        const answer = page.waitForResponse((r) => /update-navigation-menu-item/.test(r.url()) && r.request().method() === 'POST', {timeout: 10_000}).catch(() => null);
        await win.saveButton.click();
        const r = await answer;
        const body = r ? await r.json().catch(() => null) : null;
        out.save = r ? {status: r.status(), body: body ? {status: body.status, events: (body.events || []).map((e) => e.name)} : null} : 'no request sent';
        out.notice = await seen;
        out.windowClosed = await win.form.waitFor({state: 'hidden', timeout: 5_000}).then(() => true, () => false);
        if (!out.windowClosed) {
            out.fieldErrors = flat(await win.form.locator('.error, .pkp_form_error, label.error').allInnerTexts().then((a) => a.join(' | ')).catch(() => null));
            if (close) {
                // The back arrow; the page's own dialog listener answers the browser's question.
                await win.closeButton.click({timeout: 5_000}).catch(() => {});
                out.closedAfter = await win.form.waitFor({state: 'hidden', timeout: 10_000}).then(() => true, () => false);
            }
        }
    } catch (e) {
        out.error = flat(e.message, 200);
    }
    await settle(page);
    return out;
}

/** An item's "Remove", then "OK". Returns whether the success notice showed. */
async function removeItem(page, tab, title) {
    const out = {title};
    try {
        await tab.openRemove('items', title);
        const notice = page.locator('[class*="otification"]:visible').filter({hasText: 'Navigation menu item was successfully removed'}).first();
        const seen = notice.waitFor({state: 'visible', timeout: 10_000}).then(() => true, () => false);
        await tab.removeDialogButton('OK').click();
        out.notice = await seen;
    } catch (e) {
        out.error = flat(e.message, 200);
    }
    await settle(page);
    out.itemsTable = await tab.rowTitles('items').catch(() => null);
    return out;
}

/** Open a menu's window by its title in the "Navigation" table, read "Assigned Menu Items", "Cancel". */
async function menuWindowAssigned(page, tab, menu) {
    try {
        const win = await tab.openMenu(menu);
        await sleep(500);
        const assigned = await win.outline('assigned');
        await win.cancelButton.click({timeout: 5_000}).catch(() => {});
        await win.editor.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(600); // a closed window keeps its slot ~450 ms (patterns.md pitfall 4)
        return {opened: true, assigned};
    } catch (e) {
        return {opened: false, error: flat(e.message, 200)};
    }
}

module.exports = {T, sleep, flat, menusGridFetches, cell, settle, renameItem, removeItem, menuWindowAssigned};
