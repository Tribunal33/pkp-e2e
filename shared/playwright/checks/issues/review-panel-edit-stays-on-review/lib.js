// Helpers of walk.js (issue report docs/issues/U75-A11-review-panel-edit-stays-on-review.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {currentStep, current, flat, sleep} = require('../wizard-refused-save-hangs-saving/lib.js');
const {reviewChecked} = require('../double-submit-empty-problems-banner/lib.js');

/** The Review step's panels, by heading, in page order. */
async function panelHeadings(page) {
    return (await page.locator('.submissionWizard__reviewPanel__header h3:visible').allInnerTexts()).map((t) => flat(t, 120));
}

/** A Review panel's "Edit", found by the panel's heading (exact). */
function panelEdit(page, heading) {
    return page.locator('.submissionWizard__reviewPanel__header:visible')
        .filter({has: page.locator('h3', {hasText: new RegExp(`^\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})})
        .first().getByRole('button', {name: 'Edit', exact: true});
}

/**
 * Press "Edit" on the Review panel headed `heading` and read where the wizard is afterwards.
 * Never throws: a missing panel is recorded as such.
 */
async function pressPanelEdit(page, heading) {
    const before = await currentStep(page);
    const btn = panelEdit(page, heading);
    if (!(await btn.count())) return {panel: heading, before, found: false};
    await btn.click({timeout: 10_000});
    await sleep(1500);
    await idle(page);
    return {panel: heading, found: true, before, after: await currentStep(page), hash: new URL(page.url()).hash};
}

/** Back to "Review" through the step rail, its check finished. */
async function railToReview(page) {
    if (/Review$/.test(await currentStep(page))) return;
    await page.locator('.pkpSteps__buttons .pkpSteps__step__label').filter({hasText: /Review\s*$/}).first().click({timeout: 10_000});
    await current(page).filter({hasText: /Review\s*$/}).waitFor({timeout: 15_000}).catch(() => {});
    await reviewChecked(page);
}

/**
 * The page as the server sent it (a reload of the address the browser shows): each Review
 * panel's heading id and the step its "Edit" is bound to.
 */
async function servedBindings(page) {
    const html = await (await page.request.get(page.url())).text();
    const out = {};
    const re = /<h3 id="(review-[\w-]+)">[\s\S]*?@click="openStep\('([^']*)'\)"/g;
    let m;
    while ((m = re.exec(html))) out[m[1]] = m[2];
    return out;
}

module.exports = {panelHeadings, panelEdit, pressPanelEdit, railToReview, servedBindings};
