// Helpers of walk.js (issue report docs/issues/U65-OJS2-articles-report-title-html-codes.md).
// Requiring this file runs nothing. The report download and CSV reading are U65 OJS1's
// (../articles-report-supporting-agencies-empty/lib.js); this adds the title edit.
const {idle} = require('../../../probe');
const {workflowFrame} = require('../older-version-tab-current-title/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TITLE = 'titleAbstract-title-control-en';

/**
 * Open a submission's workflow on Publication › "Title & Abstract" and retype its "Title"
 * as a person does with the keyboard: select all, type `text`, then select its last word
 * (Ctrl+Shift+Left from the end) and press Ctrl+I to put it in italics; then "Save".
 * Returns the box's HTML before and after, the save's status and the title it stored.
 */
async function retypeTitle(page, app, submissionId, text) {
    const frame = workflowFrame(page, app);
    await frame.gotoEditorial(submissionId);
    await idle(page);
    const entry = app.line === 'stable-3_5_0'
        ? frame.menuLink('Title & Abstract').last()
        : await frame.revealPublicationEntry('Title & Abstract');
    await entry.click();
    await idle(page);
    await page.waitForFunction((id) => !!window.tinymce?.get(id)?.initialized, TITLE, {timeout: T});
    const read = () => page.evaluate((id) => window.tinymce.get(id).getContent(), TITLE);
    const before = await read();
    await page.evaluate((id) => window.tinymce.get(id).focus(), TITLE);
    await page.keyboard.press('Control+A');
    // Typed at a person's pace: a faster burst lost the caret mid-word (first walk).
    await page.keyboard.type(text, {delay: 80});
    await sleep(1000);
    await page.keyboard.press('End');
    await page.keyboard.press('Control+Shift+ArrowLeft');
    await page.keyboard.press('Control+I');
    await sleep(500);
    const after = await read();
    const saved = page
        .waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const shown = await page.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}).then(() => 'Saved').catch(() => null);
    await idle(page);
    let stored = null;
    if (r) {
        const body = await r.json().catch(() => null);
        stored = body && body.title ? body.title.en : null;
    }
    return {before, after, save: r ? r.status() : null, shown, stored};
}

module.exports = {retypeTitle};
