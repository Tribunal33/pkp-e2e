// Helpers of walk.js (issue report docs/issues/U08-A16-menu-window-without-items-says-all-assigned.md).
// Requiring this file runs nothing. Every helper drives or reads the screens a person uses and
// records what it saw rather than throwing, so a fix trial reads the state the fix brings.
// The menu window is the Vue window on `main` and the legacy form on 3.5; both are read here.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The window's two panels: the Vue editor on `main`, the legacy form's lists on 3.5.
const VUE_EDITOR = '[data-cy="navigation-menu-editor"]';
const LEGACY_FORM = '#navigationMenuForm';

/** An item's "Remove", then "OK" (steps 3-4). Returns whether its row left the table. */
async function removeItem(page, tab, title) {
    const out = {title};
    try {
        await tab.openRemove('items', title);
        await tab.removeDialogButton('OK').click();
        await tab.row('items', title).first().waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
    } catch (e) {
        out.error = flat(e.message, 200);
    }
    await idle(page).catch(() => {});
    await sleep(400);
    const left = await tab.rowTitles('items').catch(() => null);
    out.gone = Array.isArray(left) ? !left.includes(title) : null;
    return {out, left};
}

/**
 * Remove the "Navigation Menu Items" rows top to bottom until only `keep` (titles) are left.
 * Stops when a removal does not take, so a refused one is recorded, not looped on.
 */
async function removeItemsExcept(page, tab, keep = []) {
    const removed = [];
    const failed = [];
    let rows = await tab.rowTitles('items').catch(() => []);
    for (let guard = 0; guard < 40; guard++) {
        const next = rows.find((t) => !keep.includes(t) && !failed.includes(t));
        if (!next) break;
        const {out, left} = await removeItem(page, tab, next);
        (out.gone ? removed : failed).push(out.gone ? next : out);
        rows = left || [];
    }
    return {removed, failed, left: rows};
}

/** Press "Add Menu" (or a menu's title link) until the window shows; returns which window it is. */
async function openMenuWindow(page, link) {
    const either = page.locator(`${VUE_EDITOR}:visible, ${LEGACY_FORM}:visible`).first();
    for (let i = 0; i < 6; i++) {
        if (!(await either.isVisible())) await link.click({timeout: 5_000}).catch(() => {});
        if (await either.waitFor({state: 'visible', timeout: 5_000}).then(() => true, () => false)) break;
    }
    await idle(page).catch(() => {});
    await sleep(500);
    if (await page.locator(`${VUE_EDITOR}:visible`).count()) return 'vue';
    if (await page.locator(`${LEGACY_FORM}:visible`).count()) return 'legacy';
    return null;
}

/** Both panels as read: each one's heading, item titles and the words it shows (its empty text). */
async function readPanels(page) {
    return page.evaluate(([vueSel, legacySel]) => {
        const text = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vue = [...document.querySelectorAll(vueSel)].find((el) => el.offsetParent !== null);
        if (vue) {
            const panel = (id) => {
                const content = vue.querySelector(`[data-cy="panel-content-${id}"]`);
                const items = content ? [...content.querySelectorAll('[data-menu-item-title]')].map((e) => e.getAttribute('data-menu-item-title')) : [];
                return {heading: text(content && content.parentElement.querySelector('label')), items, text: items.length ? null : text(content)};
            };
            return {window: 'vue', assigned: panel('assigned'), unassigned: panel('unassigned')};
        }
        const form = [...document.querySelectorAll(legacySel)].find((el) => el.offsetParent !== null);
        if (form) {
            const panel = (cls, listId) => {
                const box = form.querySelector(`.${cls}`);
                const list = form.querySelector(`#${listId}`);
                const items = list ? [...list.querySelectorAll('.item_title')].map((e) => text(e)) : [];
                const header = text(box && box.querySelector('.pkp_nav_management_header'));
                const all = text(box);
                // The words the panel shows besides its heading and its items.
                const rest = all == null ? null : items.reduce((s, t) => s.replace(t, ''), all.replace(header || '', '')).trim();
                return {heading: header, items, text: rest || null};
            };
            return {window: 'legacy', assigned: panel('pkp_nav_assigned', 'pkpNavAssigned'), unassigned: panel('pkp_nav_unassigned', 'pkpNavUnassigned')};
        }
        return {window: null};
    }, [VUE_EDITOR, LEGACY_FORM]);
}

/** Close the menu window unsaved: "Cancel", and "Yes" when it asks about a change. */
async function closeMenuWindow(page) {
    const root = page.locator('[role="dialog"]:visible').filter({has: page.locator(`${VUE_EDITOR}, ${LEGACY_FORM}`)}).last();
    await root.getByRole('button', {name: 'Cancel', exact: true}).or(root.getByRole('link', {name: 'Cancel', exact: true})).first().click({timeout: 5_000}).catch(() => {});
    const yes = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').getByRole('button', {name: 'Yes', exact: true}).first();
    if (await yes.waitFor({state: 'visible', timeout: 2_000}).then(() => true, () => false)) await yes.click().catch(() => {});
    await page.locator(`${VUE_EDITOR}:visible, ${LEGACY_FORM}:visible`).first().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600); // a closed window keeps its slot ~450 ms (patterns.md pitfall 4)
}

module.exports = {sleep, flat, removeItem, removeItemsExcept, openMenuWindow, readPanels, closeMenuWindow};
