// Helpers of walk.js here (docs/issues/U27-A44-resend-email-names-old-response-date.md, spec U27,
// register A44). Requiring this file runs nothing. Every helper drives the screens a person uses: a
// row's "More Actions" › "Resend Review Request", "Edit" and "Unassign Reviewer" windows on the
// workflow's "Reviewers" panel, and the reviewer's mailbox (the mail catcher). The workflow, the
// reviewer's decline and the submissions per app come from ../reviewer-response-erases-reminder-history/lib.js.
const {idle, screen, record, sql} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');

const {T, sleep, flat} = K;
/** The journal's review page objects (the Reviewers panel and its legacy windows are the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** The visible and the submitted (hidden) value of a date field of a legacy window. */
async function dateField(win, name) {
    return {
        shown: await win.locator(`input.datepicker[id^="${name}"]`).first().inputValue().catch(() => null),
        submitted: await win.locator(`input[type="hidden"][name="${name}"]`).first().inputValue().catch(() => null),
    };
}

/** The text of a legacy window's rich message box (TinyMCE), once it has loaded. */
async function messageText(win, idPrefix) {
    const body = win.frameLocator(`iframe[id^="${idPrefix}"]`).last().locator('body');
    for (let i = 0; i < 60 && !flat(await body.innerText().catch(() => '')); i++) await sleep(500);
    return flat(await body.innerText().catch(() => null), 1500);
}

/**
 * The words of a message that carry the response date: "accept or decline the request by <date>" (the
 * plain-text email puts the link's address in brackets after "request"; the window shows the tag's label).
 */
function responseSentence(text) {
    const m = String(text || '').replace(/\s+/g, ' ').match(/accept or decline the request(?: \([^)]*\))? by ([^,]+),/i);
    return m ? `accept or decline the request by ${m[1].trim()}` : null;
}

/** "More Actions" › "Resend Review Request" on the row: the window, its message and its two dates as it opens. */
async function openResend(page, modal, name, label) {
    await R().clickRowAction(page, K.row(modal, name), 'Resend Review Request');
    const win = R().legacyModal(page, 'resendRequestReviewerForm');
    await win.locator('input.datepicker[id^="responseDueDate"]').first().waitFor({timeout: T});
    await idle(page);
    const message = await messageText(win, 'personalMessage');
    const state = {
        message,
        sentence: responseSentence(message),
        responseDueDate: await dateField(win, 'responseDueDate'),
        reviewDueDate: await dateField(win, 'reviewDueDate'),
    };
    if (label) record(label, await screen(page));
    return {win, state};
}

/** "Response Due Date" and "Review Due Date" picked from the window's calendars; the window's state after. */
async function pickDates(page, win, {response, review}, label) {
    await R().pickDate(page, win, 'responseDueDate', response);
    await R().pickDate(page, win, 'reviewDueDate', review);
    await idle(page);
    const message = await messageText(win, 'personalMessage');
    const state = {
        picked: {response: isoDate(response), review: isoDate(review)},
        responseDueDate: await dateField(win, 'responseDueDate'),
        reviewDueDate: await dateField(win, 'reviewDueDate'),
        sentence: responseSentence(message),
    };
    if (label) record(label, await screen(page));
    return state;
}

/** The window's own "Resend Review Request"; waits for the window to close. Returns the save's answer and the notices. */
async function pressResend(page, win) {
    const saved = page.waitForResponse((r) => /update-resend-request-reviewer|updateResendRequestReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
    const r = await saved;
    await win.locator('form#resendRequestReviewerForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
    await sleep(600);
    return {status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => ''), 300) : null, notices};
}

/** The user's address in the install (the dataset's users are mailed at their own addresses). */
const emailOf = (app, username) => sql(app, `select email from users where username = '${username}'`).trim();

/**
 * The newest email to `to` since `since` whose subject holds `subject`: its subject and text. `fleet`
 * false reads every message of the mail catcher, for an email whose text names no address of the install
 * (the unassign notice), which the fleet's own reads leave out.
 */
async function mail(app, to, since, subject, {fleet = true} = {}) {
    const m = await (fleet ? app.fleetMail : app.mail).find({to, subject, since, timeoutMs: T});
    const full = await app.mail.fullMessage(m.ID);
    return {subject: full.Subject, to: (full.To || []).map((x) => x.Address), text: flat(full.Text, 2000)};
}

/** "More Actions" › "Edit" on the row: its two dates as the window shows them, then "Cancel". */
async function editWindowDates(page, modal, name, label) {
    await R().clickRowAction(page, K.row(modal, name), 'Edit');
    const win = R().legacyModal(page, 'editReviewForm');
    await win.locator('input.datepicker[id^="responseDueDate"]').first().waitFor({timeout: T});
    await idle(page);
    const out = {responseDueDate: await dateField(win, 'responseDueDate'), reviewDueDate: await dateField(win, 'reviewDueDate')};
    if (label) record(label, await screen(page));
    await win.locator('form#editReviewForm').locator('a, button').filter({hasText: /^\s*Cancel\s*$/}).first().click();
    await win.locator('form#editReviewForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return out;
}

/** "More Actions" › "Unassign Reviewer" on the row: the message as it opens, then the window's "Unassign Reviewer". */
async function unassign(page, modal, name, label) {
    await R().clickRowAction(page, K.row(modal, name), 'Unassign Reviewer');
    const win = R().legacyModal(page, 'unassignReviewerForm');
    await win.locator('form#unassignReviewerForm').waitFor({timeout: T});
    await idle(page);
    const message = await messageText(win, 'personalMessage');
    if (label) record(label, await screen(page));
    const saved = page.waitForResponse((r) => /update-unassign-reviewer|updateUnassignReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Unassign Reviewer', exact: true}).click();
    const r = await saved;
    await win.locator('form#unassignReviewerForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return {message, status: r ? r.status() : null};
}

/** The reviewer's stored dates on the submission (for the record). */
function storedDates(app, id, username) {
    return sql(app, `select r.date_response_due, r.date_due, r.declined, r.request_resent from review_assignments r join users u on u.user_id = r.reviewer_id where r.submission_id = ${Number(id)} and u.username = '${username}'`);
}

function isoDate(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

module.exports = {R, dateField, messageText, responseSentence, openResend, pickDates, pressResend, emailOf, mail,
    editWindowDates, unassign, storedDates, isoDate};
