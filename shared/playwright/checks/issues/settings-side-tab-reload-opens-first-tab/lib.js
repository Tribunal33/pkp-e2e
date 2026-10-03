// Helpers for walk.js (U07 A7). Requiring this file runs nothing.
const {idle} = require('../../../probe');

/**
 * The tabs a person sees open: the selected top tab and, inside its panel,
 * the selected side tab (null when the open top tab has no nested tabs).
 */
async function openTabs(page) {
    return page.evaluate(() => {
        const label = (b) => (b ? b.innerText.trim().replace(/\s+/g, ' ') : null);
        const root = document.querySelector('.pkpTabs');
        if (!root) return {top: null, side: null};
        const top = root.querySelector(':scope > .pkpTabs__buttons > [aria-selected="true"]');
        const panel = root.querySelector(':scope > .pkpTab:not([hidden])');
        const nested = panel && panel.querySelector('.pkpTabs');
        const side = nested && nested.querySelector(':scope > .pkpTabs__buttons > [aria-selected="true"]');
        return {top: label(top), side: label(side), hash: location.hash};
    });
}

/** The address's hash once the tab's debounced history write has had its turn. */
async function settledHash(page, before) {
    await page.waitForFunction((b) => location.hash !== b, before, {timeout: 3000}).catch(() => {});
    await page.waitForTimeout(0);
    return page.evaluate(() => location.hash);
}

/** Press a tab button by its tab id (labels repeat: Website has two "Setup" tabs). */
async function pressTab(page, id) {
    const before = await page.evaluate(() => location.hash);
    const b = page.locator(`#${id}-button`);
    if (!(await b.isVisible().catch(() => false))) return {pressed: false, id};
    await b.click();
    await idle(page);
    return {pressed: true, id, hash: await settledHash(page, before)};
}

module.exports = {openTabs, settledHash, pressTab};
