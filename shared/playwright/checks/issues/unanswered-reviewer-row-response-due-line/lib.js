// Helpers of walk.js (U27 A2 and A7: the Reviewers table's second status line on an unanswered
// request; docs/issues/U27-A7-request-sent-row-no-response-due.md,
// docs/issues/U27-A2-request-resent-row-shows-review-deadline.md). Requiring this
// file runs nothing. The workflow is opened with ../reviewer-own-round-listed-under-previous-reviews
// /lib.js; the row windows with the OMP U27 page objects (the screens are the same on a journal),
// which are required inside the calls, since they read the app the kit has exported.
const {idle} = require('../../../probe');
const L = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');

/** Per app: the submission of the walk, its unanswered reviewers by username and on-screen name. */
const CASES = {
    ojs: {id: 12, declines: {user: 'jjanssen', name: 'Julie Janssen'}, nb: {user: 'phudson', name: 'Paul Hudson'}},
    omp: {id: 17, declines: {user: 'jjanssen', name: 'Julie Janssen'}, nb: {user: 'phudson', name: 'Paul Hudson'}},
};

/** Today plus n days as a local Date, and as yyyy-mm-dd. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

/** Open the submission's workflow as the signed-in editor and return the workflow window. */
async function workflow(page, app, id) {
    return L.openWorkflow(page, app, id);
}

/** The reviewer's row in the Reviewers table, as its cells read (status cell lines kept apart). */
async function readRow(modal, name) {
    const row = P().reviewerRow(modal, name).first();
    await row.waitFor({timeout: T});
    const cells = await row.evaluate((tr) =>
        [...tr.querySelectorAll('td, th')].map((c) => ({
            text: c.innerText.replace(/[ \t]+/g, ' ').trim(),
            lines: [...c.querySelectorAll('span')].filter((s) => !s.querySelector('span')).map((s) => s.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        }))
    );
    const status = cells[1] || {};
    return {reviewer: flat(cells[0] && cells[0].text, 80), status: status.lines && status.lines.length ? status.lines : [flat(status.text, 120)], row: cells.map((c) => flat(c.text, 120))};
}

/** "More Actions" > "Edit": read the two due dates as the window shows them, then "Cancel". */
async function readEditDates(page, modal, name) {
    const R = P();
    const win = await R.openEditReview(page, R.reviewerRow(modal, name).first());
    const read = async (f) => ({
        shown: await win.locator(`input[name="${f}-removed"]`).first().inputValue().catch(() => null),
        posted: await R.dateAltField(win, f).inputValue().catch(() => null),
    });
    const out = {responseDueDate: await read('responseDueDate'), reviewDueDate: await read('reviewDueDate')};
    await R.cancelEditReview(page, win);
    await sleep(600);
    return out;
}

/** "More Actions" > "Edit": pick both due dates from the calendars, "OK". */
async function setEditDates(page, modal, name, response, review) {
    const R = P();
    const win = await R.openEditReview(page, R.reviewerRow(modal, name).first());
    await R.pickDate(page, win, 'responseDueDate', response);
    await R.pickDate(page, win, 'reviewDueDate', review);
    await R.saveEditReview(win);
    await idle(page);
    await sleep(600);
    return {responseDueDate: R.isoDate(response), reviewDueDate: R.isoDate(review), saved: true};
}

/** The reviewer declines from the review page ("Decline Review Request", twice). */
async function decline(page, app, id) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    const w = new ReviewWizardPage(page, app.contextPath);
    await w.decline();
    await idle(page);
    return {declined: true, landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** The reviewer accepts from the review page. */
async function accept(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    return L.acceptReview(page);
}

/**
 * "More Actions" > "Resend Review Request" on the row: pick both dates, press the window's
 * "Resend Review Request". Returns what the window preset and the notices it raised.
 */
async function resend(page, modal, name, response, review) {
    const R = P();
    const menu = await R.openRowMenu(page, R.reviewerRow(modal, name).first());
    const entries = (await R.menuEntries(menu).allInnerTexts()).map((t) => flat(t, 60));
    await R.menuEntry(menu, 'Resend Review Request').click();
    const win = page.locator('[data-cy="active-modal"]').filter({has: page.locator('form#resendRequestReviewerForm')}).last();
    await win.locator('form#resendRequestReviewerForm').waitFor({timeout: T});
    await R.awaitTinyMce(page, 'personalMessage');
    const preset = {
        responseDueDate: await R.dateAltField(win, 'responseDueDate').inputValue().catch(() => null),
        reviewDueDate: await R.dateAltField(win, 'reviewDueDate').inputValue().catch(() => null),
    };
    await R.pickDate(page, win, 'responseDueDate', response);
    await R.pickDate(page, win, 'reviewDueDate', review);
    const saved = page.waitForResponse((r) => /resend/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.locator('form#resendRequestReviewerForm').getByRole('button', {name: 'Resend Review Request', exact: true}).click();
    const s = await saved;
    await win.locator('form#resendRequestReviewerForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    const notice = flat(await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300);
    await sleep(600);
    return {menu: entries, preset, picked: {responseDueDate: R.isoDate(response), reviewDueDate: R.isoDate(review)}, http: s ? s.status() : null, notice};
}

module.exports = {T, sleep, flat, CASES, day, workflow, readRow, readEditDates, setEditDates, decline, accept, resend};
