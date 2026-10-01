// Helpers for walk.js (U13 A11). Requiring this file runs nothing.
const {idle, loc, shot} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow of a submission, on Publication › "Metadata" (OPS: Preprint › "Metadata"). */
async function openMetadata(page, app, submissionId) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await idle(page);
    const entry = page.getByRole('link', {name: 'Metadata', exact: true});
    await entry.first().waitFor({state: 'attached', timeout: T}).catch(() => {});
    if (!(await entry.first().isVisible().catch(() => false))) {
        await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
    }
    await entry.first().click();
    const input = page.locator('input[id$="-keywords-control-en"]').first();
    await input.waitFor({state: 'visible', timeout: T});
    await idle(page);
    return input;
}

/** The "Keywords" chips of the open Metadata form, in the order shown. */
async function keywordChips(page, locale = 'en') {
    const input = page.locator(`input[id$="-keywords-control-${locale}"]`).first();
    // The chips sit in the field's own block; every chip has a "Remove {term}" button.
    const field = input.locator('xpath=ancestor::*[.//button[starts-with(@aria-label,"Remove ") or starts-with(normalize-space(.),"Remove ")]][1]');
    const scope = (await field.count()) ? field : page;
    const names = await scope.getByRole('button', {name: /^Remove /}).evaluateAll((bs) =>
        bs.map((b) => (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim().replace(/^Remove /, ''))
    );
    return names;
}

/** Type each keyword into "Keywords" (Enter makes the chip). */
async function typeKeywords(page, keywords, locale = 'en') {
    const input = page.locator(`input[id$="-keywords-control-${locale}"]`).first();
    await input.waitFor({state: 'visible', timeout: T});
    await loc(page, `Publication › Metadata: the Keywords box (${locale})`, input);
    for (const k of keywords) {
        await input.click();
        await input.pressSequentially(k, {delay: 15});
        await input.press('Enter');
        await page.getByRole('button', {name: `Remove ${k}`}).first().waitFor({state: 'visible', timeout: T});
    }
}

/** Press the form's "French (Canada)" button, which shows the French boxes beside the English ones. */
async function showFrench(page) {
    const box = page.locator('input[id$="-keywords-control-fr_CA"]').first();
    if (!(await box.isVisible().catch(() => false))) {
        await page.getByRole('button', {name: 'French (Canada)', exact: true}).first().click();
        await box.waitFor({state: 'visible', timeout: T});
    }
}

/** Press the form's "Save" and wait for the publication write's answer. */
async function saveForm(page) {
    const saved = page
        .waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await page.getByRole('button', {name: 'Save', exact: true}).first().click();
    const response = await saved;
    await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return response ? response.status() : null;
}

/** A public page's "Keywords:" line (the label and the terms). */
async function keywordsLine(page, app, path, name, locale = 'en') {
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/${path}`));
    await idle(page);
    const item = page.locator('.item.keywords, section.keywords, .keywords').first();
    let line = null;
    if (await item.count()) line = flat(await item.innerText());
    if (name) await shot(page, name).catch(() => {});
    return {path, status: response ? response.status() : null, line};
}

module.exports = {T, flat, openMetadata, keywordChips, typeKeywords, showFrench, saveForm, keywordsLine};
