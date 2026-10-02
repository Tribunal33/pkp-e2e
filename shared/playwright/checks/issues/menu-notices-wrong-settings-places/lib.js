// Helpers of walk.js (issue report docs/issues/U08-A6-A13-menu-notices-wrong-settings-places.md).
// Requiring this file runs nothing. Every helper drives or reads the screens a person uses,
// on `main` (the Vue menu window) and on 3.5 (the legacy menu window) alike.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 900) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The open menu window: the Vue editor (main) or the legacy form (3.5). */
function menuWindow(page) {
    return page.locator('[role="dialog"]:visible').filter({has: page.locator('[data-cy="navigation-menu-editor"], form#navigationMenuForm')}).last()
        .or(page.locator('.pkp_modal_panel:visible').filter({has: page.locator('form#navigationMenuForm')}).last()).first();
}

/** An item of the window's "Assigned Menu Items" (`assigned`) or "Unassigned Menu Items" panel, by its title. */
function menuItem(page, panel, title) {
    const vue = page.locator(`[data-cy="panel-content-${panel}"] [data-menu-item-title="${title}"]`).first();
    const legacy = page.locator(`#${panel === 'assigned' ? 'pkpNavAssigned' : 'pkpNavUnassigned'} li`)
        .filter({has: page.locator(':scope > .item .item_title', {hasText: new RegExp(`^\\s*${esc(title)}\\s*$`)})}).first();
    return vue.or(legacy).first();
}

/** An item's own icon button: 'eye' (the condition) or 'warning' (the submenu), never a sub-item's. */
function icon(page, panel, title, kind) {
    const item = menuItem(page, panel, title);
    const vue = kind === 'eye' ? 'button[title]:not(.text-negative)' : 'button.text-negative';
    const legacy = kind === 'eye' ? ':scope > .item .btnConditionalDisplay' : ':scope > .item .btnSubmenuWarning';
    return item.locator(`${vue}, ${legacy}`).first();
}

/** The "Notice" window an icon opens. */
function noticeWindow(page) {
    return page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, .pkp_modal_panel:visible')
        .filter({has: page.getByRole('button', {name: 'OK', exact: true})})
        .filter({hasText: /Notice/}).last();
}

/** Open a menu's window by pressing its title in the "Navigation" table. */
async function openMenu(page, tab, title) {
    const link = tab.menuTitleLink(title);
    const win = page.locator('[data-cy="navigation-menu-editor"]:visible, form#navigationMenuForm:visible').first();
    for (let i = 0; i < 4 && !(await win.isVisible()); i++) {
        await link.click({timeout: 5_000}).catch(() => {});
        await win.waitFor({state: 'visible', timeout: 6_000}).catch(() => {});
    }
    await win.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(500);
}

/** Press an item's icon and read the "Notice" it opens, then press "OK". Records rather than throws. */
async function readNotice(page, panel, title, kind) {
    const btn = icon(page, panel, title, kind);
    if (!(await btn.count())) return {title, kind, icon: false};
    const tooltip = await btn.getAttribute('title').catch(() => null);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({timeout: 10_000});
    const win = noticeWindow(page);
    const shown = await win.waitFor({state: 'visible', timeout: 10_000}).then(() => true, () => false);
    const text = shown ? flat(await win.innerText()) : null;
    if (shown) {
        await win.getByRole('button', {name: 'OK', exact: true}).click();
        await win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(600); // a closed window keeps its slot ~450 ms (patterns.md pitfall 4)
    }
    return {title, kind, icon: true, notice: text, tooltip};
}

/** Every item of a panel with each icon's text as its tooltip reads it (Vue: the button's title). */
async function panelTooltips(page, panel) {
    return page.locator(`[data-cy="panel-content-${panel}"] [data-menu-item-title]`).evaluateAll((els) => els.map((el) => {
        const own = [...el.querySelectorAll('button[title]')].filter((b) => b.closest('[data-menu-item-title]') === el);
        return {title: el.getAttribute('data-menu-item-title'), icons: own.map((b) => ({kind: b.className.includes('text-negative') ? 'warning' : 'eye', text: b.getAttribute('title')}))};
    }));
}

/** Close the open menu window unsaved: its "Cancel" (a button on main, a link or button on 3.5). */
async function cancelMenu(page) {
    const win = menuWindow(page);
    const cancel = win.getByRole('button', {name: 'Cancel', exact: true}).or(win.getByRole('link', {name: 'Cancel', exact: true})).first();
    await cancel.click({timeout: 5_000}).catch(() => {});
    await page.locator('[data-cy="navigation-menu-editor"]:visible, form#navigationMenuForm:visible').first().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600);
}

/** "Add item", choose a type, read the line under "Navigation Menu Type", then "Cancel". */
async function typeDescription(page, tab, typeLabel) {
    const win = await tab.addItem();
    await win.chooseType(typeLabel);
    await sleep(400);
    const line = flat(await win.form.locator('#menuItemTypeSection [for="menuItemType"]').first().innerText().catch(() => null));
    await win.cancelButton.first().click({timeout: 5_000}).catch(() => {});
    await win.form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600);
    return {type: typeLabel, line};
}

/** The side menu's text (the "Settings" group is open on a settings page). */
async function sideMenu(page) {
    const nav = page.locator('nav#app-nav, nav.app__nav, .app__nav').first();
    return flat(await nav.innerText().catch(() => null), 1500);
}

/** Open a settings page by its address (the side menu's own link target) and read its visible tabs. */
async function settingsTabs(page, app, path) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/${path}`));
    await idle(page);
    await sleep(800);
    const tabs = await page.locator('[role="tab"]:visible').evaluateAll((bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    return {path, tabs: [...new Set(tabs)]};
}

/** The visible field labels of the page that start with `prefix` (the "About the …" box). */
async function labelsStarting(page, prefix) {
    return page.locator('label:visible, legend:visible').evaluateAll((ls, p) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.startsWith(p)), prefix);
}

module.exports = {T, sleep, flat, menuWindow, menuItem, icon, noticeWindow, openMenu, readNotice, panelTooltips, cancelMenu, typeDescription, sideMenu, settingsTabs, labelsStarting};
