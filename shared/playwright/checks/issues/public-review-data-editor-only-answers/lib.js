// Helpers for walk.js (U29 OJS1). Requiring this file runs nothing.
const path = require('path');
const {request: pwRequest} = require('@playwright/test');
const {screen, shot, idle, loc} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const plain = (t) => String(t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function review(app) {
    return require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
}

/** Settings › Workflow › Review › "Review Forms": a form with the given items, then "Activate" › "OK". */
async function buildReviewForm(page, app, title, items) {
    const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
    const settings = new ReviewSettingsPage(page, app.contextPath);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    await forms.createForm(title);
    const controls = await forms.rowControls(forms.row(title).first());
    await forms.control(controls, 'Edit').click();
    await forms.windowHeading().waitFor({timeout: T});
    await forms.openWindowTab('Form Items');
    for (const it of items) {
        await forms.openCreateItem();
        await forms.saveItem(it);
    }
    const out = {items: (await forms.itemRows().allInnerTexts()).map((t) => flat(t, 100))};
    out.itemsScreen = await screen(page);
    await forms.closeWindow();
    await idle(page);
    await forms.activeBox(forms.row(title).first()).click();
    await forms.answerConfirm(/activate this review form/i, 'OK');
    await idle(page);
    out.active = await forms.activeBox(forms.row(title).first()).isChecked();
    out.listScreen = await screen(page);
    return out;
}

/** The round's "Reviewers" row of one reviewer, on the workflow's review round page. */
async function reviewerRow(page, app, submissionId, round, name) {
    await page.goto(`${app.baseURL}/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}&workflowMenuKey=workflow_3_${round}`);
    await idle(page);
    const table = page.getByRole('table', {name: 'Reviewers', exact: true});
    await table.waitFor({timeout: T});
    const row = table.getByRole('row').filter({hasText: name}).first();
    await row.waitFor({timeout: T});
    return row;
}

/**
 * A reviewer row's "Edit": pick the review form (when given) and tick "Publicly Show Reviewer Comments"
 * when the window has it, then "OK". Records the window; the box's absence (3.5) is recorded, not thrown.
 */
async function editReview(page, app, submissionId, round, name, {formTitle = null, makePublic = true} = {}) {
    const R = review(app);
    const row = await reviewerRow(page, app, submissionId, round, name);
    await R.clickRowAction(page, row, 'Edit');
    const modal = R.legacyModal(page, 'editReviewForm');
    await modal.locator('form#editReviewForm').waitFor({state: 'visible', timeout: T});
    await R.waitForLegacyFormSettled(page, modal);
    const box = R.publicVisibilityCheckbox(modal);
    const sel = R.reviewFormSelect(modal);
    const out = {name, publicBoxCount: await box.count(), formSelectCount: await sel.count(),
        formOptions: (await sel.first().locator('option').allInnerTexts().catch(() => [])).map((t) => flat(t, 80))};
    if (formTitle && out.formSelectCount) await sel.first().selectOption({label: formTitle});
    if (makePublic && out.publicBoxCount) await box.check();
    out.publicBoxChecked = out.publicBoxCount ? await box.isChecked() : null;
    out.window = await screen(page);
    await loc(page, 'Edit window: "Publicly Show Reviewer Comments" box', box);
    await shot(page, `edit-${name.split(' ')[1]}`).catch(() => {});
    await R.saveEditReview(page, modal);
    out.saved = true;
    return out;
}

/** The reviewer: open the request, accept, step 3; fill(w) answers; "Accept Submission"; "Submit Review" › "OK". */
async function submitReview(page, app, submissionId, fill) {
    const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
    const w = new ReviewWizardPage(page, app.contextPath, {privateBoxLabel: 'For editor'});
    await w.goto(submissionId);
    await idle(page);
    await w.accept();
    await w.continueToStep3();
    await w.step3Form.waitFor({timeout: T});
    await idle(page);
    await fill(w);
    await w.chooseRecommendation('Accept Submission');
    const out = {step3: await screen(page)};
    await shot(page, 'step3').catch(() => {});
    await w.submitReview();
    await w.expectCompleted().catch(() => {});
    out.completed = await screen(page);
    return out;
}

/** The editor: "Read Review" (recorded), then "Mark as Complete" › "Mark as Complete". */
async function readAndComplete(page, app, submissionId, round, name) {
    const R = review(app);
    const row = await reviewerRow(page, app, submissionId, round, name);
    const modal = await R.openReviewDetails(page, row);
    await R.awaitReviewDetailsSettled(modal);
    const out = {readReview: await screen(page), windowText: flat(await modal.innerText(), 3000)};
    await shot(page, `read-review-${name.split(' ')[1]}`).catch(() => {});
    await R.markReviewComplete(page, modal);
    await idle(page);
    out.afterComplete = await screen(page);
    await R.closeReviewDetails(page, modal).catch(() => {});
    return out;
}

/** A request with no session at all (a fresh request context holding no cookies). */
async function signedOutGet(app, p) {
    const anon = await pwRequest.newContext({baseURL: app.baseURL});
    try {
        const r = await anon.get(`/index.php/${app.contextPath}/${p}`);
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch (_) { /* not json */ }
        return {status: r.status(), json, text: text.slice(0, 800)};
    } finally {
        await anon.dispose().catch(() => {});
    }
}

module.exports = {T, flat, plain, buildReviewForm, reviewerRow, editReview, submitReview, readAndComplete, signedOutGet};
