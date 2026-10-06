// Helpers for walk.js (issue report U45 A15). Runs nothing when required.
const {expect} = require('@playwright/test');
const {DOIS_TEXT, isListFetch} = require('../../../pages/DoisPages.js');

const T = 30_000;

/**
 * Press "Deposit All" above the DOIs list and confirm its window with
 * "Deposit all DOIs"; waits for the action's request and the list's refetch.
 * Returns {status, body, window} (the window's text as shown).
 *
 * @param {import('@playwright/test').Page} page
 * @param {any} dois a DoisPage
 */
async function depositAll(page, dois) {
    await dois.depositAllButton().click();
    const dialog = dois.dialog(DOIS_TEXT.depositAllTitle);
    await expect(dialog).toBeVisible({timeout: T});
    const windowText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    const acted = page.waitForResponse((r) => /\/api\/v1\/dois\/depositAll/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    const refetched = page.waitForResponse((r) => isListFetch(r), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: DOIS_TEXT.depositAllTitle, exact: true}).click();
    const response = await acted;
    await refetched;
    await expect(dialog).toBeHidden({timeout: T});
    await dois.expectListSettled();
    return {status: response.status(), body: await response.text().catch(() => null), window: windowText};
}
exports.depositAll = depositAll;
