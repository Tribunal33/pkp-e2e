// Helpers of walk.js here (docs/issues/U27-A47-resent-request-never-overdue.md, spec U27, register A47).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the reviewer's review
// page ("Decline Review Request", "Accept Review"), and the workflow's "Reviewers" panel (a row's
// "More Actions" › "Resend Review Request" and "Edit", its "Send Reminder") and "Round 1 Status" box.
// The panel's page objects are the journal's (the panel is the same on a press), required inside the
// calls, since they read the app the kit has exported.
const {idle, screen, record, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** The journal's review page objects (the Reviewers panel and its legacy windows are the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review with two unanswered requests. */
const CASES = {
    ojs: {id: 12, declines: {user: 'phudson', name: 'Paul Hudson'}, control: {user: 'jjanssen', name: 'Julie Janssen'}},
    omp: {id: 17, declines: {user: 'phudson', name: 'Paul Hudson'}, control: {user: 'jjanssen', name: 'Julie Janssen'}},
};

/** Today plus n days, at noon local time. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

function isoDate(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The reviewer's review page of the submission. */
async function openReviewPage(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
}

/** The reviewer's review page: "Decline Review Request", then the window's "Decline Review Request". */
async function reviewerDecline(page, app, id) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    await openReviewPage(page, app, id);
    await new ReviewWizardPage(page, app.contextPath).decline();
    await idle(page);
    return {declined: true, landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** The reviewer's review page: "Accept Review, Continue to Step #2" (the privacy box ticked when shown). */
async function reviewerAccept(page, app, id) {
    await openReviewPage(page, app, id);
    const accept = page.getByRole('button', {name: /Accept Review, Continue to Step #2/});
    await accept.waitFor({timeout: T});
    const consent = page.locator('input[type="checkbox"][name="privacyConsent"]');
    if (await consent.count()) await consent.check();
    await accept.click();
    await page.getByRole('button', {name: 'Continue to Step #3'}).waitFor({timeout: T});
    await idle(page);
    return {accepted: true};
}

/** The editor's workflow of the submission (a fresh page load), its "Reviewers" panel on screen. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return modal;
}

/** The reviewer's row of the open workflow's "Reviewers" panel. */
const row = (modal, name) => modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();

/** The row as the editor sees it: its text, the status title and whether it is red, its buttons. */
async function rowState(modal, name) {
    const r = row(modal, name);
    const title = R().statusTitle(r);
    return {
        text: flat(await r.innerText().catch(() => null), 300),
        status: flat(await title.innerText().catch(() => null), 80),
        red: /text-negative/.test((await title.getAttribute('class').catch(() => '')) || ''),
        buttons: (await r.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).filter(Boolean),
    };
}

/** The "Round 1 Status" box's lines under its heading. */
async function roundStatus(modal) {
    const h = modal.getByRole('heading', {name: /^Round 1 Status$/}).first();
    if (!(await h.isVisible().catch(() => false))) return null;
    const text = await h.locator('..').innerText().catch(() => '');
    return text.split(/\n+/).map((l) => l.trim()).filter((l) => l && l !== 'Round 1 Status');
}

/** "More Actions" on the row: the menu's entries, then the menu closed by its own button. */
async function menuEntries(page, modal, name) {
    const r = row(modal, name);
    const menu = await R().openRowMenu(page, r);
    const entries = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 60));
    await R().closeRowMenu(page, r).catch(() => {});
    await sleep(500);
    return entries;
}

/** "More Actions" › "Resend Review Request", the window's own "Resend Review Request" with the dates it offers. */
async function resendAsOffered(page, modal, name, label) {
    await R().clickRowAction(page, row(modal, name), 'Resend Review Request');
    const win = R().legacyModal(page, 'resendRequestReviewerForm');
    await win.locator('form#resendRequestReviewerForm').waitFor({timeout: T});
    await idle(page);
    const body = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !flat(await body.innerText().catch(() => '')); i++) await sleep(500);
    const offered = {
        responseDueDate: await win.locator('input[type="hidden"][name="responseDueDate"]').first().inputValue().catch(() => null),
        reviewDueDate: await win.locator('input[type="hidden"][name="reviewDueDate"]').first().inputValue().catch(() => null),
    };
    if (label) record(label, await screen(page));
    const saved = page.waitForResponse((r) => /update-resend-request-reviewer|updateResendRequestReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
    const r = await saved;
    await win.locator('form#resendRequestReviewerForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
    return {offered, status: r ? r.status() : null};
}

/** "More Actions" › "Edit": "Response Due Date" picked from the calendar, "OK". */
async function editResponseDate(page, modal, name, date, label) {
    await R().clickRowAction(page, row(modal, name), 'Edit');
    const win = R().legacyModal(page, 'editReviewForm');
    await win.locator('input.datepicker[id^="responseDueDate"]').first().waitFor({timeout: T});
    await idle(page);
    await R().pickDate(page, win, 'responseDueDate', date);
    const picked = await win.locator('input[type="hidden"][name="responseDueDate"]').first().inputValue().catch(() => null);
    if (label) record(label, await screen(page));
    const saved = page.waitForResponse((r) => /update-review\b|updateReview\b/i.test(r.url()), {timeout: T}).catch(() => null);
    await R().saveEditReview(page, win);
    const r = await saved;
    await sleep(600);
    return {picked, status: r ? r.status() : null};
}

/**
 * The row's "Send Reminder" when the row has one: the window's "Review Schedule" text, then its own "Send
 * Reminder". Returns {button: false} when the row has none (the state the steps observe).
 */
async function sendReminderIfOffered(page, modal, name, label) {
    const b = row(modal, name).getByRole('button', {name: 'Send Reminder', exact: true});
    if (!(await b.isVisible().catch(() => false))) return {button: false};
    const win = await R().openSendReminder(page, row(modal, name));
    await idle(page);
    const text = flat(await win.innerText().catch(() => null), 800);
    if (label) record(label, await screen(page));
    const saved = page.waitForResponse((r) => /send-reminder|sendReminder/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Send Reminder', exact: true}).last().click();
    const r = await saved;
    await idle(page);
    await sleep(600);
    return {button: true, window: text, status: r ? r.status() : null};
}

/** The reviewer's stored assignment on the submission (for the record). */
function stored(app, id, username) {
    return sql(app, `select r.date_response_due, r.date_due, r.date_confirmed, r.declined, r.request_resent, r.date_reminded from review_assignments r join users u on u.user_id = r.reviewer_id where r.submission_id = ${Number(id)} and u.username = '${username}'`);
}

module.exports = {T, sleep, flat, R, CASES, day, isoDate, reviewerDecline, reviewerAccept, openWorkflow, row, rowState,
    roundStatus, menuEntries, resendAsOffered, editResponseDate, sendReminderIfOffered, stored};
