// Helpers of walk.js (issue report docs/issues/U08-A1-help-icon-raw-key-name.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
// The bell sits in the box right after the help link's box (TopNavActions.vue), in any language.
const BELL = 'div:has(> a[href*="docs.pkp.sfu.ca"]) + div > button';
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** The help ("i") link inside `scope`: its accessible name as a screen reader gets it, its address and target. */
async function readHelp(scope) {
    const link = scope.locator('a[target="_blank"][href*="docs.pkp.sfu.ca"]').first();
    const found = await link.waitFor({state: 'attached', timeout: T}).then(() => true, () => false);
    if (!found) return {found};
    const aria = await link.ariaSnapshot().catch((e) => `ariaSnapshot failed: ${String(e).split('\n')[0]}`);
    return {
        found,
        aria,
        name: (aria.match(/^- link "([^"]*)"/) || [])[1] ?? null,
        screenReaderText: flat(await link.locator('.-screenReader').textContent().catch(() => null)),
        href: await link.getAttribute('href'),
        target: await link.getAttribute('target'),
    };
}

/** The bell ("Tasks") button inside `scope`: its accessible name. */
async function readBell(scope) {
    const bell = scope.locator(BELL).first();
    const aria = await bell.ariaSnapshot().catch(() => null);
    return {aria, name: aria ? (aria.match(/^- button "([^"]*)"/) || [])[1] ?? null : null};
}

/** The editorial header (the dark bar with the "i" icon, the bell and the initials). */
function header(page) {
    return page.locator('header.app__header').first();
}

/** Press the bell; the "Tasks" window from the right; its strip. */
async function openTasksWindow(page) {
    await header(page).locator(BELL).first().click();
    const dialog = page.locator('[role="dialog"]').filter({has: page.locator('a[href*="docs.pkp.sfu.ca"]')}).last();
    await dialog.waitFor({timeout: T});
    await idle(page);
    return dialog;
}

/** Close the side window with its back arrow ("Close"). */
async function closeWindow(page, dialog) {
    await dialog.locator('button.DialogClose').first().click();
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
}

module.exports = {T, flat, readHelp, readBell, header, openTasksWindow, closeWindow, changeLanguage};
