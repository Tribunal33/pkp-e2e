// Helpers of the U28 A7 walk (issue report docs/issues/U28-A7-empty-review-can-be-submitted.md).
// Requiring this file runs nothing. The reviewer's step-3 helpers shared with the A4 walk (open the
// review on step 3, type into a box, "Save for Later", the editor's "Read Review") come from
// ../emptied-review-text-kept-after-save/lib.js; this file adds what A7 needs: a "Submit Review" that
// may be refused (in the page or by the server) and is read either way, and the step's own state.
const {idle} = require('../../../probe');
const A4 = require('../emptied-review-text-kept-after-save/lib.js');

const {T, flat} = A4;

function wizard(page, app) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    return new ReviewWizardPage(page, app.contextPath);
}

/** What step 3 holds before a submit: both boxes, the "Reviewer Files" list, the recommendation (journal). */
async function stepState(page, app) {
    const w = wizard(page, app);
    await w.expectReviewerFilesSettled();
    const boxes = await A4.readBoxes(page);
    const select = page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]');
    return {
        author: boxes.author,
        editor: boxes.editor,
        content: boxes.content,
        reviewerFiles: flat(await w.reviewerFilesGrid.innerText(), 200),
        noFilesShown: await w.noReviewerFiles.isVisible(),
        recommendation: (await select.count()) ? flat(await select.locator('option:checked').innerText(), 60) : null,
        // the journal's "Recommendation" section: its label and the sentence under it
        recommendationHelp: (await select.count()) ? flat(await select.locator('xpath=ancestor::div[contains(@class, "section")][1]').innerText().catch(() => null), 400) : null,
    };
}

/** Which of the step's fields carry the browser's `required` and whether each is shown (evidence only). */
function requiredMarks(page) {
    return page.locator('#reviewStep3Form').evaluate((f) =>
        [...f.querySelectorAll('textarea[name="comments"], textarea[name="commentsPrivate"], select[name="reviewerRecommendationId"], select[name="recommendation"]')].map((e) =>
            ({name: e.name, required: e.hasAttribute('required'), shown: !!(e.offsetWidth || e.offsetHeight)})));
}

/** The messages a refused submit leaves on the step: field marks, the form's own notice, the message box. */
async function refusalTexts(page) {
    const texts = async (sel) => (await page.locator(sel).allInnerTexts()).map((t) => flat(t, 300)).filter(Boolean);
    return {
        fieldErrors: await texts('#reviewStep3Form label.error:visible'),
        formNotice: await texts('#reviewStep3Form .pkp_notification:visible'),
    };
}

/**
 * (Journal, optional) choose a recommendation; press "Submit Review", then "OK". The submit may go
 * through ("Review Submitted"), be stopped in the page (no request) or be refused by the server
 * (the step redrawn with its messages): each outcome is read and returned, none throws.
 */
async function submitAndRead(page, app, {recommendation = null} = {}) {
    const w = wizard(page, app);
    const out = {};
    if (recommendation) {
        await page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]').selectOption({label: recommendation});
        out.chose = recommendation;
    }
    const dialog = await w.pressSubmitReview();
    out.confirm = flat(await dialog.innerText(), 200);
    out.requiredMarks = await requiredMarks(page); // set by the page's script on the press
    const sent = page.waitForRequest((r) => r.method() === 'POST' && /save-step|saveStep/i.test(r.url()), {timeout: 5000}).catch(() => null);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const request = await sent;
    out.requestSent = !!request;
    if (request) {
        const p = new URLSearchParams(request.postData() || '');
        out.posted = {isSave: p.get('isSave'), comments: p.get('comments'), commentsPrivate: p.get('commentsPrivate'),
            recommendation: p.get('reviewerRecommendationId') ?? p.get('recommendation')};
        const response = await request.response();
        out.http = response.status();
        try {
            const body = JSON.parse(await response.text());
            out.answer = {status: body.status, event: body.event ? body.event.name || body.event : null, contentLength: (body.content || '').length};
        } catch (e) { /* not JSON */ }
    }
    await idle(page);
    out.completed = await w.completedHeading.waitFor({timeout: request ? 10_000 : 2000}).then(() => true, () => false);
    await idle(page);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    Object.assign(out, await refusalTexts(page));
    return out;
}

/** The reviewer attaches one small text file through "Upload File" (the three-step upload window). */
async function uploadFile(page, app, fileName) {
    const w = wizard(page, app);
    await w.expectReviewerFilesSettled();
    await w.uploadReviewerFile(fileName);
    await idle(page);
    return {row: flat(await w.reviewerFileRow(fileName).first().innerText(), 200)};
}

module.exports = {...A4, T, flat, stepState, requiredMarks, refusalTexts, submitAndRead, uploadFile};
