// Helpers of the U27 OMP4 and A40 issue walks (walk.js here, and ../press-competing-interests-save-submits-review/walk.js).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the workflow's
// "Reviewers" panel, its "Review Details" window ("Mark as Complete", "Modify Review") and the
// "Modify Review" window over it, the row's "History", the reviewer's "My Assignments as Reviewer"
// lists and review page. None throws on a control a fix disables or removes: it records the state.
// On 3.5 the row's "Review Details" opens the older window, whose footer button is "Confirm".
const {idle, sql} = require('../../../probe');
const G = require('../review-details-guidance-promises-upload/lib.js');
const RH = require('../reviewer-response-erases-reminder-history/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    omp: {
        // OMP4: two unanswered requests, no review form
        open: {id: 17, title: 'Open Development', unanswered: {user: 'phudson', name: 'Paul Hudson'}, accepted: {user: 'jjanssen', name: 'Julie Janssen'}},
        // A40: an unanswered request
        ci: {id: 2, title: 'The West and Beyond', reviewer: {user: 'alzacharia', name: 'Al Zacharia'}, other: {user: 'gfavio', name: 'Gonzalo Favio'}},
        // neighbours: a submitted review
        done: {id: 12, title: 'Connecting ICTs', reviewer: {user: 'phudson', name: 'Paul Hudson'}},
        recommendation: null,
    },
    ojs: {
        open: {id: 12, title: 'Sodium butyrate', unanswered: {user: 'phudson', name: 'Paul Hudson'}, accepted: {user: 'jjanssen', name: 'Julie Janssen'}},
        ci: {id: 12, title: 'Sodium butyrate', reviewer: {user: 'jjanssen', name: 'Julie Janssen'}, other: {user: 'phudson', name: 'Paul Hudson'}},
        done: {id: 7, title: 'Developing efficacy', reviewer: {user: 'phudson', name: 'Paul Hudson'}},
        recommendation: 'Accept Submission',
    },
};

const details = (page) => page.getByRole('dialog', {name: /^Review Details/}).last();

/** The workflow of the submission, its Reviewers panel loaded; returns the workflow window. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').getByRole('row').nth(1).waitFor({timeout: T});
    await idle(page);
    return modal;
}

/**
 * "More Actions" > "Review Details" on the row; waits for the window to have loaded.
 * Main: the reworked window. 3.5: the older one (its form, "Confirm"). Returns {opened, legacy}.
 */
async function openDetails(page, name) {
    const r = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
    await r.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const entry = menu.getByRole('menuitem', {name: 'Review Details', exact: true});
    if (!(await entry.count())) {
        await r.getByRole('button', {name: 'More Actions'}).click();
        return {opened: false};
    }
    await entry.click();
    const d = details(page);
    await d.waitFor({timeout: T});
    // main: the footer's "Cancel" button; 3.5: the legacy form's "Confirm"
    await d.getByRole('button', {name: /^(Cancel|Confirm)$/}).first().waitFor({timeout: T});
    await idle(page);
    await page.waitForFunction(() => !document.querySelector('[role="dialog"] .pkpSpinner'), null, {timeout: 20_000}).catch(() => {});
    await sleep(800);
    const legacy = (await d.locator('form#readReviewForm, form[id^="readReview"]').count()) > 0 ||
        (await d.getByRole('button', {name: 'Confirm', exact: true}).count()) > 0;
    return {opened: true, legacy};
}

/** The window's footer: "Cancel", "Modify Review", "Mark as Complete" (main) or "Confirm" (3.5), each absent/enabled/disabled, and the text around them. */
async function footer(page) {
    const d = details(page);
    const states = {};
    for (const b of ['Cancel', 'Modify Review', 'Mark as Complete', 'Confirm']) {
        const l = d.getByRole('button', {name: b, exact: true});
        states[b] = (await l.count()) ? ((await l.last().isEnabled()) ? 'enabled' : 'disabled') : 'absent';
    }
    const text = flat(await d.innerText(), 5000);
    const at = text.lastIndexOf('stars');
    return {states, tail: at >= 0 ? text.slice(at, at + 400) : text.slice(-400), text};
}

/**
 * The completion button ("Mark as Complete" on main, "Confirm" on 3.5) pressed and, on main, its
 * dialog read and confirmed. Records the request behind it and the notices; never throws on a
 * disabled or missing button.
 */
async function markComplete(page) {
    const d = details(page);
    const out = {};
    const main = d.getByRole('button', {name: 'Mark as Complete', exact: true});
    const legacy = d.getByRole('button', {name: 'Confirm', exact: true});
    const button = (await main.count()) ? main.last() : (await legacy.count()) ? legacy.last() : null;
    if (!button) return {button: 'absent'};
    out.button = (await button.innerText()).trim();
    if (!(await button.isEnabled())) return {...out, disabled: true};
    const sent = page.waitForResponse((r) => /reviewAssignments\/\d+\/consider|reviewRead/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000})
        .then(async (r) => ({url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(await r.text().catch(() => ''), 300)}))
        .catch(() => null);
    await button.click();
    if (out.button === 'Mark as Complete') {
        const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
        if (await dlg.waitFor({timeout: 10_000}).then(() => true).catch(() => false)) {
            out.dialog = flat(await dlg.innerText(), 500);
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
        }
    }
    out.request = await sent;
    await idle(page);
    await sleep(1500);
    out.notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
    out.after = (await details(page).isVisible().catch(() => false)) ? (await footer(page)) : {closed: true};
    return out;
}

/** Close the Review Details window by its own "Cancel" (main: button; 3.5: a link), never Escape. */
async function closeDetails(page) {
    const d = details(page);
    if (!(await d.isVisible().catch(() => false))) return;
    const b = d.getByRole('button', {name: 'Cancel', exact: true});
    await ((await b.count()) ? b.last() : d.getByRole('link', {name: 'Cancel', exact: true}).last()).click();
    await d.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(800);
    await idle(page);
}

/** A reviewer row: its text, its buttons and its "More Actions" entries (the menu closed again by its button, never Escape). */
async function readRow(page, name) {
    const r = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
    if (!(await r.first().waitFor({timeout: 10_000}).then(() => true).catch(() => false))) return {absent: true};
    const text = flat(await r.first().innerText(), 300);
    const buttons = (await r.first().getByRole('button').allInnerTexts()).map((t) => flat(t, 60)).filter(Boolean);
    await r.first().getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const menuEntries = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 60));
    await r.first().getByRole('button', {name: 'More Actions'}).click();
    await menu.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    return {text, buttons, menuEntries};
}

/** The row's "Read Review"; returns false when the row has no such button. Waits for the window to load. */
async function openDetailsFromReadReview(page, name) {
    const b = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first().getByRole('button', {name: 'Read Review'});
    if (!(await b.count())) return false;
    await b.click();
    const d = details(page);
    await d.getByRole('button', {name: 'Cancel', exact: true}).waitFor({timeout: T});
    await idle(page);
    await page.waitForFunction(() => !document.querySelector('[role="dialog"] .pkpSpinner'), null, {timeout: 20_000}).catch(() => {});
    await sleep(800);
    return true;
}

/**
 * Press "Save Changes" in the open "Modify Review" window: the body the save sent, its answer, and
 * whether the window closed (with its field errors when it stayed open).
 */
async function pressSave(page) {
    const w = page.getByRole('dialog', {name: /^Modify Review/}).last();
    const button = w.getByRole('button', {name: 'Save Changes', exact: true});
    if (!(await button.isEnabled())) return {saveChangesDisabled: true};
    const sent = page.waitForRequest((r) => /\/reviewAssignments\/\d+\/review(\?|$)/.test(r.url()) && r.method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await button.click();
    const req = await sent;
    const res = req ? await req.response() : null;
    await idle(page);
    await sleep(1200);
    const open = await w.isVisible().catch(() => false);
    return {
        body: req ? flat(req.postData(), 600) : null,
        status: res ? res.status() : null,
        editWindowOpen: open,
        errors: open ? (await w.locator('.pkpFieldError, .pkpFormErrors, [role="alert"]').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)).filter(Boolean) : [],
    };
}

/** The row's "History" lines (RH.history; the workflow window as its modal). */
async function history(page, name) {
    const modal = page.locator('[data-cy="active-modal"]').first();
    return RH.history(page, modal, name).catch((e) => ({threw: flat(e.message, 300)}));
}

/** The reviewer accepts on the review page (privacy box, "Accept Review, Continue to Step #2"). */
const reviewerAccept = (page, app, id) => RH.reviewerAccept(page, app, id);

/**
 * The reviewer's side: "My Assignments as Reviewer", each of three views, the row carrying `title`
 * (its text and buttons); then the row's own button pressed from "All assignments" and the review
 * page read: the active step, each step's tab enabled or disabled, the buttons and links shown.
 */
async function reviewerSide(page, app, title) {
    const {ReviewerAssignmentsPage} = require('../../../pages/ReviewerPages.js');
    const list = new ReviewerAssignmentsPage(page, app.contextPath);
    const out = {views: {}};
    for (const view of ['actionRequired', 'all', 'completed']) {
        try {
            await list.goto(view);
            const r = list.row(title);
            out.views[view] = (await r.count())
                ? {text: flat(await r.first().innerText(), 300), buttons: (await list.rowActions(r.first()).allInnerTexts()).map((t) => flat(t, 40))}
                : {listed: false};
        } catch (e) {
            out.views[view] = {threw: flat(e.message, 200)};
        }
    }
    try {
        await list.goto('all');
        const r = list.row(title).first();
        const b = list.rowActions(r).first();
        out.pressed = flat(await b.innerText(), 40);
        await b.click();
        await page.waitForURL(/\/reviewer\/submission\//, {timeout: T});
        await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
        await idle(page);
        await sleep(1500);
        out.page = await reviewPage(page);
    } catch (e) {
        out.pageError = flat(e.message, 300);
    }
    return out;
}

/** The review page as shown: the steps' tabs (selected, disabled), the visible buttons and links of the open step. */
async function reviewPage(page) {
    const tabs = await page.getByRole('tab').evaluateAll((els) => els.map((e) => ({
        name: (e.innerText || '').replace(/\s+/g, ' ').trim(),
        selected: e.getAttribute('aria-selected') === 'true',
        disabled: e.getAttribute('aria-disabled') === 'true' || e.classList.contains('ui-state-disabled'),
    })));
    const panel = page.getByRole('tabpanel').filter({visible: true}).first();
    const visible = async (role) => (await panel.getByRole(role).evaluateAll((els) => els
        .filter((e) => e.offsetWidth || e.offsetHeight)
        .map((e) => ({name: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true'}))))
        .filter((x) => x.name);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        heading: flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => null), 200),
        tabs,
        buttons: await visible('button').catch(() => []),
        links: (await visible('link').catch(() => [])).slice(0, 15),
        panelText: flat(await panel.innerText().catch(() => null), 1500),
    };
}

/**
 * In the open "Modify Review" window: "Upload" under "Reviewer Files", one small PDF through the
 * three-step upload window ("Continue", "Continue", "Complete"), then the window's "Cancel" (a file
 * is kept without a save). Returns the upload's steps and the Reviewer Files list after it.
 */
async function uploadReviewerFile(page, modifyDialog) {
    const C = require('../change-file-keeps-first-upload/lib.js');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const file = {path: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'u27k10-')), 'u27k10-review.pdf'), name: 'u27k10-review.pdf'};
    fs.copyFileSync(src, file.path);
    await modifyDialog.getByRole('button', {name: /^Upload( File)?$/}).first().click();
    await page.getByRole('dialog').filter({has: page.locator('.pkp_controller_fileUpload')}).last().waitFor({timeout: T});
    await idle(page);
    const uploaded = await C.pick(page, file);
    const done = await C.finish(page);
    const list = flat(await modifyDialog.innerText().catch(() => null), 3000);
    const at = list ? list.indexOf('Reviewer Files') : -1;
    await modifyDialog.getByRole('button', {name: 'Cancel', exact: true}).last().click();
    const warn = page.locator('[data-cy="dialog"]').filter({hasText: 'Do you wish to continue without saving?'});
    const warned = await warn.waitFor({timeout: 4_000}).then(() => true).catch(() => false);
    if (warned) await warn.getByRole('button', {name: 'Yes', exact: true}).click();
    await modifyDialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(1500);
    await idle(page);
    return {uploaded: uploaded ? flat(JSON.stringify(uploaded), 200) : null, done, reviewerFiles: at >= 0 ? list.slice(at, at + 300) : null, warned};
}

/**
 * The way round on the row of `who`: "Cancel Reviewer" (its window sent as it comes), then "Add
 * Reviewer" searched for the reviewer's family name (their entry's text and whether it offers a
 * select button), the window closed, then "Reinstate Reviewer" and the row.
 */
async function wayRound(page, app, id, who) {
    const U = require('../unassign-notice-cancel-subject/lib.js');
    const R = require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');
    const out = {};
    await openWorkflow(page, app, id);
    out.cancelMenu = await U.rowAction(page, who.name, 'Cancel Reviewer');
    out.cancelWindow = await U.readWindow(page, 'cancelReviewForm').catch((e) => ({threw: flat(e.message, 200)}));
    out.cancelNotices = await U.submitWindow(page, 'cancelReviewForm', 'Cancel Reviewer').catch((e) => ({threw: flat(e.message, 200)}));
    const modal = await openWorkflow(page, app, id);
    out.rowCancelled = await readRow(page, who.name);
    try {
        const add = await R.openAddReviewer(page, modal);
        const family = who.name.split(' ').slice(-1)[0];
        await R.searchReviewerList(page, add, family);
        await idle(page);
        const entry = R.reviewerListEntry(add, who.name).first();
        out.addEntry = (await entry.count())
            ? {text: flat(await entry.innerText(), 400), select: await entry.getByRole('button', {name: /^Select /}).count(), selectEnabled: await entry.getByRole('button', {name: /^Select /}).first().isEnabled().catch(() => null)}
            : {listed: false};
        const closeBtn = add.getByRole('button', {name: /^(Cancel|Close)$/}).first();
        await closeBtn.click().catch(() => {});
        await sleep(1000);
    } catch (e) {
        out.addError = flat(e.message, 300);
    }
    await openWorkflow(page, app, id);
    out.reinstateMenu = await U.rowAction(page, who.name, 'Reinstate Reviewer').catch((e) => ({threw: flat(e.message, 200)}));
    out.reinstateNotices = await U.submitWindow(page, 'reinstateReviewerForm', 'Reinstate Reviewer').catch((e) => ({threw: flat(e.message, 200)}));
    await openWorkflow(page, app, id);
    out.rowReinstated = await readRow(page, who.name);
    return out;
}

/**
 * The reviewer's draft on a journal: from step 2, "Continue to Step #3", a "Recommendation" picked,
 * "Save for Later". Returns what the page then shows.
 */
async function reviewerDraftRecommendation(page, app, id, recommendation) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    const cont = page.getByRole('button', {name: 'Continue to Step #3'});
    if (await cont.waitFor({timeout: 15_000}).then(() => true).catch(() => false)) {
        await cont.click();
        await idle(page);
    }
    const select = page.locator('select[name="reviewerRecommendationId"], select[name="recommendation"]').first(); // main; 3.5
    await select.waitFor({state: 'attached', timeout: T});
    await select.selectOption({label: recommendation}, {force: true});
    await page.getByRole('button', {name: 'Save for Later', exact: true}).click();
    await idle(page);
    await sleep(1500);
    return {saved: true, page: await reviewPage(page)};
}

/** The assignment as stored: the dates the screens show and the step the reviewer's page opens on. */
function stored(app, id, username) {
    return sql(app, `select ra.date_confirmed, ra.date_completed, ra.date_considered, ra.step, ra.considered, ra.declined, ra.competing_interests is not null from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${id} and u.username = '${username}' order by ra.review_id desc limit 1`);
}

module.exports = {
    T, sleep, flat, CASES, details, openWorkflow, openDetails, footer, markComplete, closeDetails, readRow, history,
    reviewerAccept, reviewerSide, reviewPage, uploadReviewerFile, wayRound, reviewerDraftRecommendation, openDetailsFromReadReview, pressSave, stored, G,
};
