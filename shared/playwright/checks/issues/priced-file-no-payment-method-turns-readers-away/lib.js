// Helpers of walk.js (U73 A9: a priced file on a press with no payment method). Requiring this
// file runs nothing. Every helper presses what a person presses. The payments tab, the formats
// page, the terms window and the book page come from the U69 A7/A8 walk's lib.
const {idle} = require('../../../probe');
const {sleep, flat, rel} = require('../older-version-pdf-reader-empty/lib');

const T = 30_000;
const NOTICE = /payment method|e-commerce/i;

/** Settings › Distribution › "Payments" as it stands: its text and which fields it shows. */
async function readPayments(page, app) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    return {
        enabled: await tab.enableBox().isChecked(),
        currencyShown: await tab.currencySelect().isVisible().catch(() => false),
        methodShown: await tab.pluginSelect().isVisible().catch(() => false),
    };
}

/** The terms window's words: its text, choices, price label, which choice is ticked, any notice. */
async function readTermsWindow(win) {
    const text = flat(await win.form().innerText(), 1200);
    const notices = await win.dialog().locator('.pkp_notification, [class*="notify"]').evaluateAll((els) =>
        els.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    return {
        text,
        choices: await win.choiceLabels(),
        chosen: await win.form().locator('input[name="salesType"]:checked').getAttribute('value').catch(() => null),
        priceLabel: flat(await win.priceLabel().innerText().catch(() => null), 80),
        price: await win.priceBox().inputValue().catch(() => null),
        notices,
        noticeShown: NOTICE.test(text) || notices.some((n) => NOTICE.test(n)),
    };
}

/** Step 3: the terms link of `fileName`, the window read, "Direct Sales", the price, "Save". */
async function setDirectSales(page, formats, format, fileName, price) {
    const win = await formats.openTerms(format, fileName);
    const before = await readTermsWindow(win);
    await win.choose('directSales');
    await win.typePrice(price);
    const response = await win.pressSave();
    const status = response.status();
    const body = await response.text().catch(() => '');
    await idle(page);
    await sleep(600);
    // A refused save leaves the window open with its errors: record them, then close it by its arrow.
    if (await win.form().isVisible().catch(() => false)) {
        const refused = await readTermsWindow(win);
        refused.errors = flat(await win.errorBlock().first().locator('xpath=..').innerText().catch(() => null), 300);
        await win.closeArrow().click();
        await win.dialog().waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        return {before, saveStatus: status, saved: false, refused};
    }
    return {before, saveStatus: status, saved: true, saveAnswer: flat(body, 200)};
}

/** Settings › Distribution › "Payments": empty "Manual Payment Instructions", "Save". */
async function emptyInstructions(page, app) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    await tab.goto();
    await tab.instructionsBox().waitFor({state: 'visible', timeout: T});
    const before = await tab.instructionsBox().inputValue();
    await tab.instructionsBox().fill('');
    const response = await tab.save();
    return {before, saveStatus: response.status(), saved: flat(await tab.savedStatus().innerText().catch(() => null), 60)};
}

/** Step 4, first half: the terms window opened again on the saved file, read, closed by its arrow. */
async function reopenTerms(page, formats, format, fileName) {
    const win = await formats.openTerms(format, fileName);
    const read = await readTermsWindow(win);
    await win.closeArrow().click();
    await win.dialog().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return read;
}

/** Step 4, second half: the format's "Edit" › "Metadata" tab, read for a notice, closed by its arrow. */
async function readMetadataTab(page, formats, format) {
    const win = await formats.openEdit(format);
    const meta = await win.openMetadata();
    await sleep(800); // the in-place notification area fetches its list after the tab loads
    await idle(page);
    const text = flat(await meta.form().innerText(), 4000);
    const notices = await win.dialog().locator('.pkp_notification, [class*="notify"]').evaluateAll((els) =>
        els.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    const out = {head: text.slice(0, 300), notices, noticeShown: NOTICE.test(text) || notices.some((n) => NOTICE.test(n))};
    await win.closeArrow().click();
    await win.dialog().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return out;
}

/** The table of contents' chapter row whose title starts with `prefix` ("Chapter 1:"). */
function chapterRow(page, prefix) {
    return page
        .locator('.obj_monograph_full .item.chapters > ul > li, .obj_monograph_full .item.chapters li')
        .filter({has: page.locator('.title', {hasText: prefix})})
        .first();
}

/** A chapter's file links as the book page shows them. */
async function chapterLinks(page, prefix) {
    const row = chapterRow(page, prefix);
    return {
        title: flat(await row.locator('.title').first().innerText().catch(() => null), 120),
        links: await row.locator('a.cmp_download_link').evaluateAll((as) =>
            as.map((a) => ({text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))
        ),
    };
}

/** Press a chapter's first file link: where it leads and what that page says. */
async function pressChapterLink(page, prefix) {
    const link = chapterRow(page, prefix).locator('a.cmp_download_link').first();
    const href = await link.getAttribute('href');
    const statuses = [];
    const onResponse = (r) => {
        if (r.request().resourceType() === 'document') statuses.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    await Promise.all([page.waitForLoadState('load'), link.click()]);
    await idle(page).catch(() => {});
    await sleep(800);
    page.off('response', onResponse);
    return {
        pressed: rel(href),
        documents: statuses,
        url: flat(rel(page.url()), 200),
        title: await page.title(),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        body: flat(await page.locator('.pkp_structure_main, body').first().innerText().catch(() => ''), 400),
        notification: flat(await page.locator('.pkp_notification, .cmp_notification, [role="alert"]').first().innerText({timeout: 1000}).catch(() => null), 200),
    };
}

module.exports = {emptyInstructions, readPayments, readTermsWindow, setDirectSales, reopenTerms, readMetadataTab, chapterLinks, pressChapterLink};
