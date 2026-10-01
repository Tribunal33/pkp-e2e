// Helpers for walk.js (U13 OJS12). Requiring this file runs nothing.
const path = require('path');
const {screen, shot, idle, loc} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

function stagePages(app) {
    return {
        review: require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js')),
        copyediting: require(path.join(app.suiteDir, 'pages', 'CopyeditingStagePages.js')),
    };
}

/**
 * A reviewer row's "More Actions" › "Edit": choose the review type and
 * tick (or leave) "Publicly Show Reviewer Comments", then "OK". Where the
 * window has no such box (3.5), records the window and cancels it.
 */
async function editReview(page, app, submissionId, reviewerName, {reviewType, makePublic}) {
    const {review} = stagePages(app);
    const wf = new review.WorkflowPage(page, app.contextPath);
    await wf.gotoEditorial(submissionId);
    const row = wf.reviewerRow(reviewerName);
    await row.waitFor({state: 'visible', timeout: T});
    await review.clickRowAction(page, row, 'Edit');
    const modal = review.legacyModal(page, 'editReviewForm');
    await modal.locator('form#editReviewForm').waitFor({state: 'visible', timeout: T});
    await review.waitForLegacyFormSettled(page, modal);
    const box = review.publicVisibilityCheckbox(modal);
    const out = {reviewerName, boxCount: await box.count()};
    out.windowText = flat(await modal.innerText(), 1500);
    await shot(page, `edit-review-${reviewerName.split(' ')[1]}`).catch(() => {});
    if (!out.boxCount) {
        await modal.getByRole('link', {name: 'Cancel'}).first().click().catch(() => {});
        await idle(page);
        return out;
    }
    if (reviewType) await review.reviewTypeRadio(modal, reviewType).check();
    if (makePublic) await box.check();
    out.typeChecked = reviewType ? await review.reviewTypeRadio(modal, reviewType).isChecked() : null;
    out.boxChecked = await box.isChecked();
    await loc(page, 'Edit Review window: "Publicly Show Reviewer Comments" box', box);
    await review.saveEditReview(page, modal);
    out.saved = true;
    return out;
}

/**
 * A reviewer row's "Read Review", then "Mark as Complete": records the
 * confirmation dialog's words, confirms, and waits for the notice.
 */
async function markComplete(page, app, submissionId, reviewerName) {
    const {review} = stagePages(app);
    const wf = new review.WorkflowPage(page, app.contextPath);
    await wf.gotoEditorial(submissionId);
    const row = wf.reviewerRow(reviewerName);
    await row.waitFor({state: 'visible', timeout: T});
    const out = {reviewerName, rowBefore: flat(await row.innerText(), 200)};
    const modal = await review.openReviewDetails(page, row);
    await review.awaitReviewDetailsSettled(modal);
    await modal.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    const dialog = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
    await dialog.waitFor({state: 'visible', timeout: T});
    out.dialog = flat(await dialog.innerText(), 800);
    await shot(page, `mark-complete-${reviewerName.split(' ')[1]}`).catch(() => {});
    const consider = page.waitForResponse((r) => /reviewAssignments\/\d+\/consider/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    const c = await consider;
    out.consider = c ? c.status() : null;
    await page.getByText('The review has been marked as complete.').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    out.notice = (await page.getByText('The review has been marked as complete.').count()) > 0;
    await idle(page);
    return out;
}

/**
 * "Accept Submission" in review, through its steps to "Record Decision";
 * then "Send To Production" in copyediting the same way.
 */
async function acceptAndSendToProduction(page, app, submissionId, {skipReviewerEmail = false} = {}) {
    const {review, copyediting} = stagePages(app);
    const out = {};
    const wf = new review.WorkflowPage(page, app.contextPath);
    await wf.gotoEditorial(submissionId);
    await wf.decisionButton('Accept Submission').click();
    const accept = new review.DecisionPage(page);
    await accept.expectOpen('Accept Submission');
    if (skipReviewerEmail) {
        // "Notify Reviewers": "Skip this email", so the review stays
        // unconfirmed (sending it marks the review confirmed, NotifyReviewers).
        const notify = page.getByRole('heading', {name: 'Notify Reviewers', exact: true, level: 2});
        for (let i = 0; i < 4 && !(await notify.isVisible()); i++) await accept.continueStep();
        await notify.waitFor({state: 'visible', timeout: T});
        await accept.awaitComposerLoaded();
        await page.getByRole('button', {name: 'Skip this email', exact: true}).click();
        await sleep(800);
        out.skipped = (await page.getByText('This step has been skipped and no email will be sent.').count()) > 0;
        if (await notify.isVisible()) await accept.continueStep();
    }
    await accept.completeAll();
    out.accepted = true;
    await wf.gotoEditorial(submissionId);
    await wf.decisionButton(copyediting.SEND_TO_PRODUCTION).click();
    const send = new review.DecisionPage(page);
    await send.expectOpen(copyediting.SEND_TO_PRODUCTION);
    for (let i = 0; i < 4 && !(await send.recordButton.isVisible()); i++) await send.continueStep();
    const done = await copyediting.recordDecision(page, 'Sent to Production');
    out.sentToProduction = flat(await done.innerText(), 300);
    await copyediting.leaveCompletion(page, done);
    return out;
}

/**
 * An article's public page: status, title, whether any review shows (the
 * reviewer names, the comment text, a "Peer Review" heading, the review
 * display's root), and the page's requests for reviews. Opens every
 * review card ("Read Review") before reading.
 */
async function readArticle(page, app, articleId, {names = [], comment = ''} = {}) {
    const reqs = [];
    const onReq = (r) => { if (/peerReview/i.test(r.url())) reqs.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); };
    page.on('request', onReq);
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${articleId}`));
    await idle(page);
    await sleep(800);
    const root = page.locator('.PkpOpenReview');
    const out = {
        articleId,
        status: response ? response.status() : null,
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        displayCount: await root.count(),
    };
    if (out.displayCount) {
        const buttons = root.getByRole('button').filter({hasText: 'Read Review'});
        out.cards = await buttons.count();
        for (let i = 0; i < out.cards; i++) await buttons.nth(0).click().catch(() => {});
        await sleep(500);
        out.display = flat(await root.innerText(), 1500);
        await loc(page, `article ${articleId}: open review display`, root);
    }
    const s = await screen(page);
    const text = s.text.main || s.text.body || '';
    const html = await page.content();
    out.names = Object.fromEntries(names.map((n) => [n, text.includes(n)]));
    out.commentShown = comment ? text.split(comment).length - 1 : null;
    out.commentInSource = comment ? html.includes(comment) : null;
    out.reviewHeading = (await page.getByRole('heading', {name: /^Peer Review$/}).count()) > 0;
    out.sections = await page.locator('.main_entry h2, .entry_details h2').evaluateAll((hs) => hs.map((h) => h.innerText.replace(/\s+/g, ' ').trim()));
    out.peerReviewRequests = reqs;
    page.off('request', onReq);
    return out;
}

/**
 * The landing address a peer-review DOI is deposited with
 * (PeerReviewCrossrefXmlFilter): the article page with
 * `?tab=peer-review-record&reviewId=<id>`. Reads whether that review's
 * card is on the page, open, and scrolled into view.
 */
async function readReviewLanding(page, app, articleId, reviewId) {
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${articleId}?tab=peer-review-record&reviewId=${reviewId}`));
    await idle(page);
    await sleep(1500);
    // Both sort tabs render the card; the "Review Round" one is shown.
    const card = page.locator(`[data-review-id="${reviewId}"]`).filter({visible: true}).first();
    const out = {articleId, reviewId, status: response ? response.status() : null, url: page.url().replace(/^https?:\/\/[^/]+/, ''), cardCount: await page.locator(`[data-review-id="${reviewId}"]`).count()};
    if (out.cardCount) {
        out.cardText = flat(await card.innerText(), 400);
        out.open = (await card.getAttribute('data-state')) || null;
        out.inViewport = await card.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
    }
    return out;
}

module.exports = {T, sleep, flat, editReview, markComplete, acceptAndSendToProduction, readArticle, readReviewLanding};
