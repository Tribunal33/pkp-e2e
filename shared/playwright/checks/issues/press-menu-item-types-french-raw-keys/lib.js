// Helpers of walk.js (issue report docs/issues/U08-A24-press-menu-item-types-french-raw-keys.md).
// Requiring this file runs nothing. Every helper drives or reads the screens a person uses and
// records what it saw rather than throwing, so a fix trial reads the state the fix brings.
// Locators are language-free (ids, names, data-cy), since the steps read the French screens.
// On `main` the menu window is the Vue editor; on 3.5 it is the legacy form (#navigationMenuForm),
// which has no handle hint and no empty-panel text of its own: those reads come back null there.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const MENUS_GRID = 'table[id^="component-grid-navigationmenus-navigationmenusgrid-"]';
const ITEMS_GRID = 'table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]';
const VUE_EDITOR = '[data-cy="navigation-menu-editor"]';
const LEGACY_MENU_FORM = '#navigationMenuForm';
const ITEM_FORM = 'form#navigationMenuItemsForm';

/** The Navigation tab of Settings › Website, in a language (step 3). */
async function openNavigationTab(app, page, lang) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/website#setup/navigationMenus`));
    await page.locator(`${MENUS_GRID}:visible`).first().waitFor({timeout: T});
    await page.locator(`${ITEMS_GRID}:visible`).first().waitFor({timeout: T});
    await idle(page);
}

/** A grid's header action link ("Add item" / "Add Menu"), by the grid's table. */
function gridAddLink(page, gridSel) {
    return page
        .locator('div.pkp_controllers_grid')
        .filter({has: page.locator(`${gridSel}:visible`)})
        .first()
        .locator('.header .actions a, .header a.pkp_linkaction_icon_add_item, .header a[id*="add"]')
        .first();
}

/** "Add item" until the item window's type list shows (step 4). Returns the link's words. */
async function openItemWindow(page) {
    const link = gridAddLink(page, ITEMS_GRID);
    const label = flat(await link.innerText().catch(() => null));
    const select = page.locator(`${ITEM_FORM} select[name="menuItemType"]:visible`);
    for (let i = 0; i < 6 && !(await select.isVisible()); i++) {
        await link.click({timeout: 5_000}).catch(() => {});
        await select.waitFor({state: 'visible', timeout: 5_000}).catch(() => {});
    }
    await idle(page).catch(() => {});
    return {link: label, open: await select.isVisible()};
}

/** The type list's options, as shown (step 5). */
async function typeOptions(page) {
    return page
        .locator(`${ITEM_FORM} select[name="menuItemType"] option`)
        .evaluateAll((os) => os.map((o) => ({value: o.value, text: o.textContent.replace(/\s+/g, ' ').trim()})))
        .catch((e) => `read failed: ${e.message}`);
}

/** Choose a type by its value and read the line under the list (its description). */
async function chooseType(page, value) {
    const select = page.locator(`${ITEM_FORM} select[name="menuItemType"]`);
    const ok = await select.selectOption({value}).then(() => true, () => false);
    await sleep(300);
    const line = await page.locator(`${ITEM_FORM} #menuItemTypeSection label[for="menuItemType"], ${ITEM_FORM} #menuItemTypeSection [for="menuItemType"]`).last().innerText().catch(() => null);
    return {value, chosen: ok, line: flat(line)};
}

/** The "Query Parameters" section: its heading and the line under the boxes (step 6). */
async function queryParamsSection(page) {
    const sec = page.locator(`${ITEM_FORM} #queryParamsSection`);
    if (!(await sec.count())) return {present: false};
    return {
        present: true,
        visible: await sec.isVisible(),
        heading: flat(await sec.locator('.label, legend, label').first().innerText().catch(() => null)),
        description: flat(await sec.locator('p.description').first().innerText().catch(() => null)),
        text: flat(await sec.innerText().catch(() => null)),
    };
}

/**
 * Close the open window as a person does (steps 8 and 10): the item window's back arrow
 * ("Fermer" / "Close"), the menu window's "Annuler" / "Cancel", then "Oui" / "Yes" when it asks.
 * The browser's own question is accepted by the script's dialog listener.
 */
async function closeWindow(page) {
    const dlg = page.locator('[role="dialog"]:visible').last();
    const cancel = dlg.getByRole('button', {name: /^(Annuler|Cancel)$/}).first();
    const close = dlg.getByRole('button', {name: /^(Fermer|Close)$/}).first();
    const how = (await page.locator(`${VUE_EDITOR}:visible`).count()) && (await cancel.count()) ? 'cancel' : 'close';
    await (how === 'cancel' ? cancel : close).click({timeout: 5_000}).catch(() => {});
    const yes = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').getByRole('button', {name: /^(Oui|Yes)$/}).first();
    if (await yes.waitFor({state: 'visible', timeout: 2_000}).then(() => true, () => false)) await yes.click().catch(() => {});
    await page.locator(`${ITEM_FORM}:visible, ${VUE_EDITOR}:visible, ${LEGACY_MENU_FORM}:visible`).first().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(700); // a closed window keeps its slot about 450 ms (patterns.md pitfall 4)
    await idle(page).catch(() => {});
    return {how, closed: !(await page.locator(`${ITEM_FORM}:visible, ${VUE_EDITOR}:visible, ${LEGACY_MENU_FORM}:visible`).count())};
}

/** "Primary Navigation Menu" by its title link in the "Navigation" table (step 9). */
async function openMenuByTitle(page, title) {
    const link = page.locator(`${MENUS_GRID}:visible`).first().locator('tr.gridRow a').filter({hasText: title}).first();
    return openMenuWindow(page, link);
}

/** "Add Menu" (step 10). */
async function openAddMenu(page) {
    const link = gridAddLink(page, MENUS_GRID);
    const label = flat(await link.innerText().catch(() => null));
    return {link: label, window: await openMenuWindow(page, link)};
}

/** Press a link until the menu window shows; returns 'vue' | 'legacy' | null. */
async function openMenuWindow(page, link) {
    const either = page.locator(`${VUE_EDITOR}:visible, ${LEGACY_MENU_FORM}:visible`).first();
    for (let i = 0; i < 6 && !(await either.isVisible()); i++) {
        await link.click({timeout: 5_000}).catch(() => {});
        await either.waitFor({state: 'visible', timeout: 5_000}).catch(() => {});
    }
    await idle(page).catch(() => {});
    await sleep(500);
    if (await page.locator(`${VUE_EDITOR}:visible`).count()) return 'vue';
    if (await page.locator(`${LEGACY_MENU_FORM}:visible`).count()) return 'legacy';
    return null;
}

/**
 * The first assigned item's handle: rest the pointer on it, then read its hint (the `title`
 * a browser shows as a tooltip) and its name for a screen reader.
 */
async function handleHint(page) {
    const item = page.locator(`${VUE_EDITOR}:visible [data-cy="panel-content-assigned"] [data-menu-item-title]`).first();
    if (!(await item.count())) return {handle: null};
    const handle = item.locator('[title]').first();
    await handle.hover({timeout: 5_000}).catch(() => {});
    await sleep(300);
    return {
        item: await item.getAttribute('data-menu-item-title').catch(() => null),
        title: await handle.getAttribute('title').catch(() => null),
        ariaLabel: await handle.getAttribute('aria-label').catch(() => null),
    };
}

/** Both panels: heading and the words an empty panel shows (step 10). */
async function readPanels(page) {
    return page.evaluate(([vueSel, legacySel]) => {
        const text = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vue = [...document.querySelectorAll(vueSel)].find((el) => el.offsetParent !== null);
        if (vue) {
            const panel = (id) => {
                const content = vue.querySelector(`[data-cy="panel-content-${id}"]`);
                const items = content ? [...content.querySelectorAll('[data-menu-item-title]')].map((e) => e.getAttribute('data-menu-item-title')) : [];
                return {heading: text(content && content.parentElement.querySelector('label')), items: items.length, text: items.length ? null : text(content)};
            };
            return {window: 'vue', assigned: panel('assigned'), unassigned: panel('unassigned')};
        }
        const form = [...document.querySelectorAll(legacySel)].find((el) => el.offsetParent !== null);
        if (form) {
            const box = (cls) => text(form.querySelector(`.${cls}`));
            return {window: 'legacy', assigned: box('pkp_nav_assigned'), unassigned: box('pkp_nav_unassigned')};
        }
        return {window: null};
    }, [VUE_EDITOR, LEGACY_MENU_FORM]);
}

module.exports = {
    T, sleep, flat, ITEM_FORM, VUE_EDITOR, LEGACY_MENU_FORM,
    openNavigationTab, openItemWindow, typeOptions, chooseType, queryParamsSection,
    openMenuByTitle, openAddMenu, handleHint, readPanels, closeWindow,
};
