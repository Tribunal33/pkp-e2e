// Helpers of the kept walks of three U27 issue reports (register A15, A37, A1):
//   walk.js here (docs/issues/U27-A15-reviewer-response-erases-reminder-history.md),
//   ../resend-request-log-raw-submission-placeholder/walk.js (U27 A37),
//   ../send-review-to-orcid-offered-before-complete/walk.js (U27 A1).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the workflow's
// "Reviewers" panel (a row's "More Actions", "Edit", "Send Reminder", "History", "Resend Review
// Request"), the workflow's "Activity Log", the reviewer's review page, Statistics › Reports, and
// Settings › Users & Roles › "ORCID". The row windows come from the OMP U27 page objects (the panel
// is the same on a journal), required inside the calls, since they read the app the kit has exported.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, screen, record, sql} = require('../../../probe');
const U28 = require('../reviewer-link-dead-after-second-request/lib.js');
const OWN = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');

/** Per app, on PKP's default test dataset (docs/process/dataset.md): submissions and reviewers the steps use. */
const CASES = {
    ojs: {
        pending: 12, // in Review round 1; both reviewers below have not responded
        reminded: {user: 'jjanssen', name: 'Julie Janssen'},
        declines: {user: 'phudson', name: 'Paul Hudson'},
        // A1: the reviewer given an iD has a pending request on `pending` and a completed review on `completed`
        orcid: {user: 'jjanssen', name: 'Julie Janssen', other: 'Paul Hudson', completed: 13},
    },
    omp: {
        pending: 17, // Internal Review round 1; both reviewers have not responded
        reminded: {user: 'jjanssen', name: 'Julie Janssen'},
        declines: {user: 'phudson', name: 'Paul Hudson'},
        orcid: {user: 'phudson', name: 'Paul Hudson', other: 'Julie Janssen', completed: 12},
    },
};

/** Today plus n days, at noon local time. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

/** The editor's workflow of the submission (its Reviewers panel on screen). */
const openWorkflow = (page, app, id) => U28.openWorkflow(page, app, id);

/** The reviewer's row of the open workflow's Reviewers panel. */
const row = (modal, name) => P().reviewerRow(modal, name).first();

/** The row's two cells as text. */
async function rowText(modal, name) {
    return flat(await row(modal, name).innerText().catch(() => null), 240);
}

/** "More Actions" on the row: the menu's entries, then the menu closed by its own button. */
async function menuEntries(page, modal, name) {
    const R = P();
    const r = row(modal, name);
    const menu = await R.openRowMenu(page, r);
    await menu.getByRole('menuitem').first().waitFor({timeout: T});
    const entries = (await R.menuEntries(menu).allInnerTexts()).map((t) => flat(t, 60));
    await R.closeRowMenu(page, r, menu).catch(() => {});
    await sleep(500);
    return entries;
}

/** "More Actions" › "Edit": "Response Due Date" (and "Review Due Date" when given) picked from the calendar, "OK". */
async function editDueDates(page, modal, name, {response, review}) {
    const R = P();
    const win = await R.openEditReview(page, row(modal, name));
    if (response) await R.pickDate(page, win, 'responseDueDate', response);
    if (review) await R.pickDate(page, win, 'reviewDueDate', review);
    await R.saveEditReview(win);
    await idle(page);
    await sleep(600);
    return {responseDueDate: response ? R.isoDate(response) : null, reviewDueDate: review ? R.isoDate(review) : null};
}

/** The row's own "Send Reminder", then the window's "Send Reminder". */
async function sendReminder(page, modal, name) {
    await P().sendReminder(page, row(modal, name));
    await idle(page);
    await sleep(600);
    return {sent: true};
}

/**
 * "More Actions" › "History": the window's dated lines (`.pkp_review_history`, one per milestone:
 * "Reviewer Reminded: <date>" on main, "<date> Reminder" on 3.5), then the window's "Close".
 */
async function history(page, modal, name, label) {
    const R = P();
    const menu = await R.openRowMenu(page, row(modal, name));
    await R.menuEntry(menu, 'History').click();
    const box = page.locator('.pkp_review_history').last();
    await box.locator('div').first().waitFor({timeout: T});
    await idle(page);
    const lines = (await box.locator(':scope > div').allInnerTexts()).map((l) => flat(l, 120));
    if (label) record(label, await screen(page));
    const win = page.locator('[data-cy="active-modal"]').filter({has: page.locator('.pkp_review_history')}).last();
    await win.getByRole('button', {name: 'Close', exact: true}).first().click();
    await box.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(800);
    return {lines};
}

/** The reviewer's review page of the submission, then step 1's "Accept Review, Continue to Step #2". */
async function reviewerAccept(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    return OWN.acceptReview(page);
}

/** The reviewer's review page, "Decline Review Request", then the window's "Decline Review Request". */
async function reviewerDecline(page, app, id) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    await new ReviewWizardPage(page, app.contextPath).decline();
    await idle(page);
    return {declined: true, landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** "More Actions" › "Resend Review Request", the window sent as it comes. Returns the row and the notices. */
async function resend(page, modal, name) {
    await P().resendReviewRequest(page, row(modal, name));
    await idle(page);
    const notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
    await sleep(600);
    return {row: await rowText(modal, name), notices};
}

/** The workflow's "Activity Log": every row's text (newest first), then "Close". */
async function activityLog(page, label) {
    const R = P();
    const log = await R.openActivityLog(page);
    await idle(page);
    const rows = (await log.getByRole('row').allInnerTexts()).map((r) => flat(r, 300)).filter(Boolean);
    if (label) record(label, await screen(page));
    await log.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await sleep(800);
    return rows;
}

/** A CSV text as rows of fields (quoted fields with commas and line breaks kept whole). */
function parseCsv(text) {
    const rows = [];
    let rowNow = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') quoted = false;
            else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { rowNow.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            rowNow.push(field); rows.push(rowNow); rowNow = []; field = '';
        } else field += c;
    }
    if (field || rowNow.length) { rowNow.push(field); rows.push(rowNow); }
    return rows;
}

/**
 * Statistics › Reports, "Review Report": the downloaded file's header and the rows of the reviewer
 * on the submission, each as {column: value}.
 */
async function reviewReport(page, app, {id, reviewerName}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/stats/reports`));
    await idle(page);
    const link = page.getByRole('link', {name: 'Review Report', exact: true}).first();
    await link.waitFor({timeout: T});
    const [download] = await Promise.all([page.waitForEvent('download', {timeout: T}), link.click()]);
    const text = fs.readFileSync(await download.path(), 'utf8').replace(/^﻿/, '');
    const rows = parseCsv(text).filter((r) => r.some((f) => f.trim()));
    const header = rows[0] || [];
    const idCol = header.findIndex((h) => /submission id/i.test(h) || /^id$/i.test(h.trim()));
    const family = reviewerName.split(' ').slice(-1)[0];
    const hits = rows.slice(1)
        .filter((r) => r.some((f) => f.includes(family)) && (idCol < 0 || String(r[idCol]).trim() === String(id)))
        .map((r) => Object.fromEntries(header.map((h, i) => [h, flat(r[i], 120)])));
    return {file: download.suggestedFilename(), header, rows: hits};
}

/** Settings › Users & Roles › "ORCID": tick "Enable ORCID functionality", "Member Sandbox", the two credentials, "Save". */
async function enableOrcid(page, app) {
    const {OrcidSettingsTab} = require(path.join(__dirname, '../../../../../apps', app.name, 'playwright/pages/OrcidPages.js'));
    const tab = new OrcidSettingsTab(page, app.contextPath);
    await tab.goto();
    if (!(await tab.enableCheckbox.isChecked())) await tab.enableCheckbox.check();
    await tab.apiSelect.waitFor({timeout: T});
    await tab.apiSelect.selectOption({label: 'Member Sandbox'});
    await tab.clientIdInput.fill('APP-TEST');
    await tab.clientSecretInput.fill('test-secret');
    await tab.save();
    await idle(page);
    return {enabled: await tab.enableCheckbox.isChecked(), api: await tab.apiSelect.inputValue()};
}

/**
 * The precondition only ORCID's own sign-in creates: the reviewer's authorized iD, written as
 * AuthorizeUserData::getOrcidOAuthAccessData() builds it and HasOrcid::setVerifiedOrcidOAuthData()
 * stores it (user_settings, no locale; the member API scope, since the journal uses the member API).
 * Returns the SQL it ran and the rows it left.
 */
const ORCID_SQL = (username) => `insert into user_settings (user_id, locale, setting_name, setting_value)
select u.user_id, '', s.name, s.value from users u, (values
  ('orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097'),
  ('orcidIsVerified', '1'),
  ('orcidAccessToken', 'an-access-token-from-orcid'),
  ('orcidAccessScope', '/activities/update'),
  ('orcidRefreshToken', 'a-refresh-token-from-orcid'),
  ('orcidAccessExpiresOn', '2046-10-03 12:00:00')
) as s(name, value) where u.username = '${username}'`;

function authorizeOrcid(app, username) {
    const query = ORCID_SQL(username);
    sql(app, query);
    return {sql: query, stored: sql(app, `select s.setting_name, s.setting_value from user_settings s join users u using (user_id) where u.username = '${username}' and s.setting_name like 'orcid%' order by 1`).split('\n')};
}

/**
 * The confirm "Send this review to the reviewer's ORCID?" from the row's menu, answered "OK".
 * Returns the dialog's text, the request's status and the notices after it.
 */
async function sendToOrcid(page, modal, name) {
    const R = P();
    const menu = await R.openRowMenu(page, row(modal, name));
    await R.menuEntry(menu, 'Send Review To ORCID').click();
    const dialog = page.getByRole('dialog').filter({hasText: "Send this review to the reviewer's ORCID?"}).last();
    await dialog.waitFor({timeout: T});
    const text = flat(await dialog.innerText(), 300);
    const answered = page.waitForResponse((r) => /sendToOrcid/i.test(r.url()), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: /^(OK|Yes)$/}).click();
    const r = await answered;
    await idle(page);
    const notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
    await sleep(800);
    return {dialog: text, request: r ? {url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(await r.text().catch(() => ''), 200)} : null, dialogOpen: await dialog.isVisible().catch(() => false), notices};
}

/** The app's scheduled-task runner, "test" for the one task (what cron's `scheduler.php run` would start daily). */
function runScheduledTask(app, name) {
    try {
        return flat(execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', `--name=${name}`], {
            cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 120_000,
        }), 400);
    } catch (e) {
        return {error: flat(`${e.stdout || ''}${e.stderr || ''}${e.message}`, 600)};
    }
}

/** Settings › Workflow › Review › "Setup": the "Review Submission - Before Due Date" reminder set to `days`, "Save". */
async function setSubmitReminderDays(page, app, days) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    await settings.goto('Setup');
    await idle(page);
    const label = 'Review Submission - Before Due Date';
    await settings.setup.slider(label).waitFor({timeout: T});
    await settings.setup.setSliderByKeyboard(label, days);
    await settings.setup.save();
    await idle(page);
    return {label, days, readout: flat(await settings.setup.sliderReadout(label).innerText().catch(() => null), 80)};
}

/** The stored reminder fields of the reviewer's assignment on the submission (for the record). */
function assignmentDates(app, id, username) {
    return sql(app, `select r.date_notified, r.date_reminded, r.reminder_was_automatic, r.date_confirmed, r.declined from review_assignments r join users u on u.user_id = r.reviewer_id where r.submission_id = ${Number(id)} and u.username = '${username}'`);
}

module.exports = {T, sleep, flat, CASES, day, openWorkflow, row, rowText, menuEntries, editDueDates, sendReminder, history,
    reviewerAccept, reviewerDecline, resend, activityLog, parseCsv, reviewReport, enableOrcid, ORCID_SQL, authorizeOrcid,
    sendToOrcid, runScheduledTask, setSubmitReminderDays, assignmentDates, mailsTo: U28.mailsTo};
