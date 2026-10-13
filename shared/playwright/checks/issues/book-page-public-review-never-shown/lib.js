// Helpers of walk.js (U69 A26: a review made public never shows on the published book's page;
// docs/issues/U69-A26-book-page-public-review-never-shown.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses; the OMP suite's page objects are required
// inside each helper (patterns.md "Probe kit"), never at the top.
const path = require('path');
const {idle, screen, shot, loc} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pages = (app, name) => require(path.join(app.suiteDir, 'pages', `${name}.js`));

/** The editorial workflow of a submission, optionally on a menu entry; resolves on the workflow's heading. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.getByRole('heading', {name: /^Workflow:/}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(500);
    return modal;
}

/** On a book past review: the side menu's "External Review" › "Review Round 1". */
async function openExternalRound(page, modal) {
    const nav = modal.getByRole('navigation').first();
    // Internal Review's "Review Round 1" comes first in the menu when the book had one;
    // "External Review" opens its group only when the round is not already shown.
    const rounds = nav.getByText('Review Round 1', {exact: true});
    const last = async () => rounds.nth(Math.max(0, (await rounds.count()) - 1));
    if (!(await (await last()).isVisible().catch(() => false))) {
        await nav.getByText('External Review', {exact: true}).first().click().catch(() => {});
        await sleep(600);
    }
    await (await last()).click();
    await modal.getByRole('heading', {name: /^Workflow: External Review \(Round 1\)/}).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(500);
    return flat(await modal.getByRole('heading', {name: /^Workflow:/}).first().innerText(), 120);
}

/**
 * A reviewer row's "More Actions" › "Edit": the review type and "Publicly Show Reviewer
 * Comments", then "OK". Where the window has no such box (3.5) it records the window and
 * leaves with "Cancel". `pastRound`: the book has left review, so its round is opened first.
 */
async function editReview(page, app, id, reviewerName, {reviewType, makePublic, pastRound = false}) {
    const RA = pages(app, 'ReviewerAssignmentPages');
    const modal = await openWorkflow(page, app, id);
    const out = {reviewerName};
    if (pastRound) out.round = await openExternalRound(page, modal);
    const row = RA.reviewerRow(modal, reviewerName);
    await row.waitFor({state: 'visible', timeout: T});
    out.rowBefore = flat(await row.innerText(), 200);
    const menu = await RA.openRowMenu(page, row);
    out.menu = flat(await menu.innerText(), 300);
    await menu.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const edit = page.locator('[data-cy="active-modal"]').last();
    await edit.getByText('Review Type').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(800);
    const box = RA.publicVisibilityBox(edit);
    out.boxCount = await box.count();
    out.windowText = flat(await edit.innerText(), 1500);
    await shot(page, `edit-review-${reviewerName.split(' ')[1]}`).catch(() => {});
    if (!out.boxCount) {
        await edit.getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
        await idle(page);
        return out;
    }
    out.boxBefore = await box.isChecked();
    if (reviewType) await RA.reviewTypeRadio(edit, reviewType).check();
    if (makePublic) await box.check();
    out.typeChecked = reviewType ? await RA.reviewTypeRadio(edit, reviewType).isChecked() : null;
    out.boxChecked = await box.isChecked();
    await loc(page, 'Edit window: "Publicly Show Reviewer Comments" box', box);
    await RA.saveEditReview(edit);
    out.saved = true;
    return out;
}

/** A reviewer row's "Read Review", then "Mark as Complete": the dialog's words, the confirmation, the notice. */
async function markComplete(page, app, id, reviewerName) {
    const RA = pages(app, 'ReviewerAssignmentPages');
    const modal = await openWorkflow(page, app, id);
    const row = RA.reviewerRow(modal, reviewerName);
    await row.waitFor({state: 'visible', timeout: T});
    const out = {reviewerName, rowBefore: flat(await row.innerText(), 200)};
    const read = await RA.openReadReview(page, modal, reviewerName);
    out.reviewWindow = flat(await read.innerText(), 800);
    await read.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    const dialog = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
    await dialog.waitFor({state: 'visible', timeout: T});
    out.dialog = flat(await dialog.innerText(), 800);
    await shot(page, `mark-complete-${reviewerName.split(' ')[1]}`).catch(() => {});
    const consider = page.waitForResponse((r) => /reviewAssignments\/\d+\/consider/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    const c = await consider;
    out.consider = c ? c.status() : null;
    const notice = page.getByText('The review has been marked as complete.').first();
    await notice.waitFor({state: 'visible', timeout: T}).catch(() => {});
    out.notice = (await page.getByText('The review has been marked as complete.').count()) > 0;
    await read.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    await idle(page);
    return out;
}

/** The decision `label` from the workflow's actions, through its pages to "Record Decision". */
async function decide(page, app, id, label) {
    const RS = pages(app, 'ReviewStagePages');
    const modal = await openWorkflow(page, app, id);
    const out = {label, offered: await modal.locator('[data-cy="workflow-action-items"]').getByRole('button').allInnerTexts().then((a) => a.map((s) => flat(s, 60))).catch(() => [])};
    await modal.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: label, exact: true}).first().click();
    await page.getByRole('heading', {level: 1}).filter({hasText: label}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    out.wizard = flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => null), 200);
    await RS.walkDecisionWizard(page);
    out.done = flat(await page.locator('main').innerText().catch(() => null), 300);
    return out;
}

/**
 * "Publication" › "Title & Abstract", the header's "Publish", then each window until the
 * publish request answers, keeping "Version of Record" where the window asks.
 */
async function publish(page, app, id) {
    const modal = await openWorkflow(page, app, id);
    const nav = modal.getByRole('navigation').first();
    const entry = nav.getByRole('link', {name: 'Title & Abstract', exact: true}).last();
    if (!(await entry.isVisible().catch(() => false))) {
        await nav.getByRole('link', {name: 'Publication', exact: true}).first().click().catch(() => {});
        await sleep(500);
    }
    await entry.click();
    await idle(page);
    await sleep(1000);
    const controls = page.locator('[data-cy="workflow-controls-right"]');
    const header = controls.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText(), 60), windows: []};
    let done = false;
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    published.then(() => { done = true; }, () => { done = true; });
    await header.click();
    for (let i = 0; i < 6 && !done; i++) {
        const dlg = page.getByRole('dialog').last();
        const btn = dlg.getByRole('button', {name: /^(Confirm|Publish|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(1200);
        const stage = dlg.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) {
            await stage.selectOption('VoR').catch(() => {});
            const minor = dlg.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) await minor.selectOption('false').catch(() => {});
        }
        out.windows.push(flat(await dlg.innerText().catch(() => null), 500));
        await shot(page, `publish-${id}-${i}`).catch(() => {});
        await btn.click();
        await sleep(1500);
    }
    const r = await published;
    out.publish = r.status();
    await idle(page).catch(() => {});
    await sleep(800);
    out.header = flat(await controls.innerText().catch(() => null), 200);
    return out;
}

/**
 * A book's public page: its status and title, the section headings, whether any review shows
 * (each reviewer name, each comment in the text and in the source, a "Peer Review" heading,
 * the review display's root, opened card by card) and the page's requests for reviews.
 */
async function readBook(page, app, id, {names = [], comments = []} = {}) {
    const reqs = [];
    const onReq = (r) => { if (/peerReview/i.test(r.url())) reqs.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); };
    page.on('request', onReq);
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/${id}`));
    await idle(page);
    await sleep(1000);
    const root = page.locator('.PkpOpenReview');
    const out = {
        bookId: id,
        status: response ? response.status() : null,
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        displayCount: await root.count(),
        vueRuntime: await page.evaluate(() => !!(window.pkp && window.pkp.registry)).catch(() => null),
    };
    if (out.displayCount) {
        const buttons = root.getByRole('button').filter({hasText: 'Read Review'});
        out.cards = await buttons.count();
        for (let i = 0; i < out.cards; i++) await buttons.nth(0).click().catch(() => {});
        await sleep(500);
        out.display = flat(await root.innerText(), 1500);
        await loc(page, `book ${id}: open review display`, root);
    }
    const s = await screen(page);
    const text = s.text.main || s.text.body || '';
    const html = await page.content();
    out.names = Object.fromEntries(names.map((n) => [n, text.includes(n)]));
    out.comments = Object.fromEntries(comments.map((c) => [c, {shown: text.includes(c), inSource: html.includes(c)}]));
    out.reviewHeading = (await page.getByRole('heading', {name: /^Peer Review$/}).count()) > 0;
    out.sections = await page.locator('.obj_monograph_full h2').evaluateAll((hs) => hs.map((h) => h.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    out.peerReviewRequests = reqs;
    page.off('request', onReq);
    return out;
}

module.exports = {T, sleep, flat, openWorkflow, openExternalRound, editReview, markComplete, decide, publish, readBook};
