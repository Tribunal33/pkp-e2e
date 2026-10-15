// Helpers of the kept walk for docs/issues/U30-A10-public-review-data-unpublic-author-response.md (spec U30,
// register A10). Requiring this file runs nothing. Every helper drives the screens a person uses: the editor's
// review round ("Reviewers" row "Edit" and "Read Review", the "Author Response" table, "Request Response" and the
// "Request Author Response" page), the reviewer's review wizard, and the author's "Author Response" card and
// window; the one exception is signedOutGet(), the open peer review record, which no screen requests.
// The OJS page objects are required inside the calls, since they read the app the kit has exported.
const path = require('path');
const {request: pwRequest} = require('@playwright/test');
const {screen, shot, idle, loc, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const plain = (t) => String(t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const R = (app) => require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
const AR = (app) => require(path.join(app.suiteDir, 'pages', 'AuthorResponsePages.js'));

/** The review round's id (the workflow menu's key for "Review" › "Round n"); a read, not a step. */
function roundId(app, submissionId, round) {
    return Number(sql(app, `SELECT review_round_id FROM review_rounds WHERE submission_id = ${submissionId} AND stage_id = 3 AND round = ${round}`));
}

/** The editor's workflow on "Review" › "Round n" (the dashboard's address with the menu key). */
async function openRound(page, app, submissionId, rid) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}&workflowMenuKey=workflow_3_${rid}`));
    await idle(page);
    const table = page.getByRole('table', {name: 'Reviewers', exact: true});
    await table.waitFor({timeout: T});
    return table;
}

async function reviewerRow(page, app, submissionId, rid, name) {
    const table = await openRound(page, app, submissionId, rid);
    const row = table.getByRole('row').filter({hasText: name}).first();
    await row.waitFor({timeout: T});
    return row;
}

/** A reviewer row's "Edit": tick "Publicly Show Reviewer Comments" when the window has it, then "OK". The box's absence is recorded. */
async function makePublic(page, app, submissionId, rid, name) {
    const S = R(app);
    const row = await reviewerRow(page, app, submissionId, rid, name);
    await S.clickRowAction(page, row, 'Edit');
    const modal = S.legacyModal(page, 'editReviewForm');
    await modal.locator('form#editReviewForm').waitFor({state: 'visible', timeout: T});
    await S.waitForLegacyFormSettled(page, modal);
    const box = S.publicVisibilityCheckbox(modal);
    const out = {name, publicBoxCount: await box.count()};
    if (out.publicBoxCount) await box.check();
    out.publicBoxChecked = out.publicBoxCount ? await box.isChecked() : null;
    out.window = await screen(page);
    await loc(page, 'Edit window: "Publicly Show Reviewer Comments" box', box);
    await S.saveEditReview(page, modal);
    out.saved = true;
    return out;
}

/** The reviewer: open the request, accept (privacy box ticked), step 3, a "For author and editor" comment, "Accept Submission", "Submit Review" › "OK". */
async function submitReview(page, app, submissionId, comment) {
    const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
    const w = new ReviewWizardPage(page, app.contextPath, {privateBoxLabel: 'For editor'});
    await w.goto(submissionId);
    await idle(page);
    await w.accept();
    await w.continueToStep3();
    await w.step3Form.waitFor({timeout: T});
    await idle(page);
    await w.typeComments(comment);
    await w.chooseRecommendation('Accept Submission');
    await w.submitReview();
    await w.expectCompleted().catch(() => {});
    return {completed: await screen(page)};
}

/** The editor: a row's "Read Review", then "Mark as Complete" › "Mark as Complete". */
async function readAndComplete(page, app, submissionId, rid, name) {
    const S = R(app);
    const row = await reviewerRow(page, app, submissionId, rid, name);
    const modal = await S.openReviewDetails(page, row);
    await S.awaitReviewDetailsSettled(modal);
    await S.markReviewComplete(page, modal);
    await idle(page);
    const out = {afterComplete: await screen(page)};
    await S.closeReviewDetails(page, modal).catch(() => {});
    return out;
}

/** The round's "Author Response" table as data (its absence recorded, not thrown). */
async function readTable(page, app) {
    const table = new (AR(app).AuthorResponseTable)(page);
    if (!(await table.table().count())) {
        await sleep(3000);
        if (!(await table.table().count())) return {table: 'absent', screen: await screen(page)};
    }
    for (let i = 0; i < 40; i++) {
        const t = flat(await table.table().locator('tbody').innerText().catch(() => ''));
        if (t && !/No Items/i.test(t)) break;
        await sleep(500);
    }
    const button = table.requestResponseButton();
    return {
        rows: (await table.rows().allInnerTexts().catch(() => [])).map((x) => flat(x, 300)),
        button: (await button.count()) ? ((await button.isDisabled()) ? 'disabled' : 'enabled') : 'absent',
    };
}

/** "Request Response" › the "Request Author Response" page › "Submit Request" › "View Submission Summary". */
async function sendRequest(page, app) {
    const P = AR(app);
    const table = new P.AuthorResponseTable(page);
    const req = new P.RequestAuthorResponsePage(page, app.contextPath);
    await table.requestResponseButton().click();
    await req.heading().waitFor({timeout: T});
    for (let i = 0; i < 60; i++) {
        const body = flat(await req.messageBody().innerText().catch(() => ''));
        const loading = await page.getByText('Loading', {exact: true}).count();
        if (body && body.length > 40 && !loading) break;
        await sleep(500);
    }
    await idle(page);
    const out = {heading: flat(await req.heading().innerText().catch(() => null)),
        to: (await req.recipientChips().allInnerTexts().catch(() => [])).map((x) => flat(x, 80))};
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: T}).catch(() => null);
    await req.submitRequestButton().click();
    const resp = await posted;
    out.post = resp ? resp.status() : null;
    const dialog = req.sentDialog();
    await dialog.waitFor({timeout: T}).catch(() => {});
    out.dialog = flat(await dialog.innerText().catch(() => null), 400);
    const link = req.viewSubmissionSummaryLink();
    if (await link.count()) { await link.click(); await idle(page); }
    return out;
}

/** The author on "Review" › "Round n": the "Author Response" card's "Submit Response", the text, the contributor ticked, "Submit Response". */
async function respond(page, app, submissionId, rid, authorName, text) {
    const P = AR(app);
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=${submissionId}&workflowMenuKey=workflow_3_${rid}`));
    const card = new P.AuthorResponseCard(page);
    await card.heading().waitFor({timeout: 60_000});
    await idle(page);
    const out = {card: flat(await card.heading().locator('xpath=ancestor::div[1]').innerText().catch(() => null), 300)};
    await card.submitButton().click();
    const win = new P.AuthorResponseWindow(page);
    await win.modal().waitFor({timeout: T});
    await idle(page);
    await win.body().waitFor({timeout: T});
    await win.fillBody(text);
    await win.authorCheckbox(authorName).check();
    out.window = await screen(page);
    const posted = page.waitForResponse((r) => /\/authorResponse\/?$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.submitButton().click();
    const resp = await posted;
    out.post = resp ? resp.status() : null;
    await win.modal().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    out.after = await screen(page);
    await shot(page, 'author-after-response').catch(() => {});
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

module.exports = {T, flat, plain, roundId, openRound, makePublic, submitReview, readAndComplete, readTable, sendRequest, respond, signedOutGet};
