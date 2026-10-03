// Helpers of walk.js (U73 A20: "Direct Sales" at a price of 0). Requiring this file runs nothing.
// Every helper presses what a person presses. The terms window's set/read/reopen helpers come from
// the U73 A9 walk's lib; the payments tab, the formats page and the book page from U69 A7/A8's.
const {idle} = require('../../../probe');
const {sleep, flat} = require('../older-version-pdf-reader-empty/lib');

/** A file's terms link, "Open Access", "Save"; the window's answer and whether it closed. */
async function saveOpenAccess(page, formats, format, fileName) {
    const {readTermsWindow} = require('../priced-file-no-payment-method-turns-readers-away/lib');
    const win = await formats.openTerms(format, fileName);
    const before = await readTermsWindow(win);
    await win.choose('openAccess');
    const response = await win.pressSave();
    const status = response.status();
    await idle(page);
    await sleep(600);
    if (await win.form().isVisible().catch(() => false)) {
        const refused = await readTermsWindow(win);
        refused.errors = flat(await win.errorBlock().first().locator('xpath=..').innerText().catch(() => null), 300);
        await win.closeArrow().click();
        await win.dialog().waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
        await idle(page);
        return {before, saveStatus: status, saved: false, refused};
    }
    return {before, saveStatus: status, saved: true};
}

/** One file row's terms link as the list shows it, after a fresh load of the list. */
async function termsLinkOf(formats, format, fileName) {
    const {fileTerms} = require('../priced-file-link-price-twice-or-missing/lib');
    const rows = await fileTerms(formats, format);
    return rows.find((r) => r.name === fileName) || {name: fileName, terms: null, rows};
}

/** On the "Manual Fee Payment" page: its fee line, "Send notification of payment", then "Continue". */
async function notifyAndContinue(page) {
    const {rel} = require('../older-version-pdf-reader-empty/lib');
    const main = () => page.locator('.pkp_structure_main, body').first();
    const out = {
        payment: flat(await main().innerText().catch(() => ''), 400),
        feeLine: await page.locator('td.label', {hasText: 'Fee'}).count(),
    };
    await Promise.all([page.waitForLoadState('load'), page.getByRole('link', {name: 'Send notification of payment'}).click()]);
    await idle(page).catch(() => {});
    out.notified = {url: flat(rel(page.url()), 200), title: await page.title(), body: flat(await main().innerText().catch(() => ''), 400)};
    const cont = page.getByRole('link', {name: 'Continue'}).first();
    if (await cont.isVisible().catch(() => false)) {
        await Promise.all([page.waitForLoadState('load'), cont.click()]);
        await idle(page).catch(() => {});
        await sleep(500);
        out.continued = {url: flat(rel(page.url()), 200), title: await page.title(), body: flat(await main().innerText().catch(() => ''), 300)};
    }
    return out;
}

module.exports = {saveOpenAccess, termsLinkOf, notifyAndContinue};
