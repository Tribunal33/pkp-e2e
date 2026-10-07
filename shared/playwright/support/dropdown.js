// @ts-check
/**
 * @file shared/playwright/support/dropdown.js
 *
 * The open/closed state of a ui-library `Dropdown` (lib/ui-library
 * src/components/Dropdown/Dropdown.vue: a button and a
 * `.pkpDropdown__content` panel mounted only while open), read so that a
 * page object never decides on a panel that is about to close by itself.
 *
 * The Dropdown closes only through its button's blur (`closeOnBlur`): 100 ms
 * after the blur it closes at once if the focus is outside the dropdown,
 * and if the focus had moved into the panel (a radio, a box) it starts a
 * 1 s interval that closes the panel at the first tick finding the focus
 * outside. A press elsewhere (a side-menu entry, a row's tick box) therefore
 * leaves the panel on screen for up to a second, with nothing in the DOM
 * marking it as closing. A page object that reads "visible, so already
 * open, no press" in that second has the panel closed under its next reads;
 * one that presses the button to close it has the press land after the
 * timer and open the panel again (OPS U75 S2 on CI and on the Mac,
 * `.reports/flake-2026-10-07/u75s2-relations-panel/diagnosis.md`).
 *
 * The states: `closed` (no panel), `open` (panel shown and the focus inside
 * the dropdown: nothing closes it until the focus leaves, which only the
 * test's next action does) and `closing` (panel shown, focus outside: the
 * close is already due). `settleDropdown` waits a `closing` panel out, so
 * the caller decides on `closed` or `open` only, both stable.
 */
const {expect} = require('@playwright/test');

/**
 * The dropdown's state, one read.
 *
 * @param {import('@playwright/test').Locator} root the `.pkpDropdown` element
 * @returns {Promise<'closed'|'open'|'closing'>}
 */
async function dropdownState(root) {
    return root.evaluate((el) => {
        if (!el.querySelector(':scope > .pkpDropdown__content')) return 'closed';
        return el.contains(document.activeElement) ? 'open' : 'closing';
    });
}

/**
 * Wait out a panel whose close is already due; returns whether the panel
 * is open (and stays open until the focus leaves the dropdown).
 *
 * @param {import('@playwright/test').Locator} root the `.pkpDropdown` element
 * @param {{timeout?: number}} [options]
 * @returns {Promise<boolean>}
 */
async function settleDropdown(root, {timeout = 30_000} = {}) {
    const state = await dropdownState(root);
    if (state === 'closing') {
        await expect(root.locator(':scope > .pkpDropdown__content')).toHaveCount(0, {timeout});
        return false;
    }
    return state === 'open';
}

module.exports = {dropdownState, settleDropdown};
