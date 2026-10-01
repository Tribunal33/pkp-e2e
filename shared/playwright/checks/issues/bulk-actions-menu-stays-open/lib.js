// Helpers for the U45 A22 issue walk (the DOIs page's "Bulk Actions" menu).
// Requiring this file runs nothing.

/**
 * The state of the page's ui-library `Dropdown` menus: how many are open,
 * the open one's items, and where the keyboard focus is.
 *
 * @param {import('@playwright/test').Page} page
 */
async function menuState(page) {
    return page.evaluate(() => {
        const words = (el) => (el ? (/** @type {HTMLElement} */ (el).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) : null);
        const open = [...document.querySelectorAll('.pkpDropdown__content')].filter((el) => /** @type {HTMLElement} */ (el).offsetParent !== null);
        const active = document.activeElement;
        return {
            open: open.length,
            items: open.length ? [...open[0].querySelectorAll('.pkpDropdown__action')].map(words) : [],
            focus: active ? `${active.tagName.toLowerCase()} "${words(active)}"` : null,
            focusInMenu: !!(active && active.closest('.pkpDropdown__content')),
        };
    });
}

/**
 * What a mouse press at the centre of `locator` would hit: the element
 * itself (`own: true`) or whatever lies over it.
 *
 * @param {import('@playwright/test').Locator} locator
 */
async function pointOwner(locator) {
    return locator.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        const words = (e) => (/** @type {HTMLElement} */ (e).innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        return {
            target: el.getAttribute('aria-label') || words(el),
            own: !!hit && (hit === el || el.contains(hit)),
            hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).trim().split(/\s+/).join('.')} "${words(hit)}"` : null,
            inMenu: !!(hit && hit.closest('.pkpDropdown__content')),
        };
    });
}

/**
 * The rows' own controls (tick box, title link, expand button) whose centre
 * lies under an open `Dropdown` menu, each with the menu item a mouse press
 * there would hit (null when it hits the menu's padding).
 *
 * @param {import('@playwright/test').Page} page
 */
async function coveredControls(page) {
    return page.evaluate(() => {
        const words = (e) => (/** @type {HTMLElement} */ (e).innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const out = [];
        document.querySelectorAll('.listPanel__item--doi').forEach((row) => {
            row.querySelectorAll('.doiListItem__selector input[type="checkbox"], .listPanel__itemTitle a, .listPanel__itemSummary button').forEach((el) => {
                const r = el.getBoundingClientRect();
                if (!r.width || !r.height) return;
                const x = r.x + r.width / 2;
                const y = r.y + r.height / 2;
                const hit = document.elementFromPoint(x, y);
                if (!hit || !hit.closest('.pkpDropdown__content')) return;
                const item = hit.closest('.pkpDropdown__action');
                out.push({row: row.id, control: el.tagName.toLowerCase() === 'input' ? 'tick box' : words(el), item: item ? words(item) : null, x, y});
            });
        });
        return out;
    });
}

module.exports = {menuState, pointOwner, coveredControls};
