// Helpers of walk.js here (issue report
// docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md). Requiring this file runs nothing.
// The Manage Emails page through its page object (shared/playwright/pages/EmailsPages.js); sending
// an invitation and reading its email through the U06 A5 walk's lib.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
/** The locale segment of a context address: none on 3.4 and 3.3. */
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** The email searched by name in step 3. */
const INVITATION = 'User Invited to Role Notification';

/** The shared emails a preprint server sends whose row step 4 looks for (names as a journal lists them). */
const SENT = [
    'User Invited to Role Notification',
    'User Role Ended Notification',
    'Change Email Address Invitation',
    'Publication Published',
    'Submission Saved for Later',
    'Submission Needs Editor',
    'orcidRequestAuthorAuthorization',
    'orcidCollectAuthorId',
    'orcidRequestUpdateScope',
    // listed on journals and presses; on a preprint server its template is missing on main (U53 A14)
    'User Role Masthead Visibility Update Notification',
];

/** Review and decision emails a preprint server never sends: the neighbour wants them kept off its list. */
const NEVER = [
    'Review Request', 'Review Request Subsequent', 'Review Reminder', 'Review Confirm', 'Review Decline',
    'Review Acknowledgement', 'Reviewer Register', 'Reviewer Unassign', 'Reviewer Reinstate',
    'Resend Review Request to Reviewer', 'Review Cancel', 'Edit Review Notification', 'Recommendation Made',
    'Sent to Review', 'Sent to Production', 'Submission Accepted (Without Review)',
    'Revisions Requested', 'Resubmit for Review', 'New Review Round Initiated', 'Review Round Cancelled',
    'Reinstate Declined Submission', 'Submission Sent Back from Copyediting', 'Submission Moved to Copyediting',
    'Notify Reviewers of Decision', 'Revised Version Notification', 'Editorial Reminder',
    'Request Author Review Response', 'Reviewer Commented Notify Editors',
    'Review Reminder (Automated)', 'Review Response Overdue (Automated)',
];

/** The Manage Emails page object (required inside forEachApp's fn). */
function manageEmails(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    return new ManageEmailsPage(page, `${app.contextPath}${L(app)}`);
}

/**
 * Settings › Workflow › "Emails" › "Add and edit templates": lands on the Manage Emails page through
 * the tab's link (as a person would), falling back to the page's address when the link is not found.
 */
async function openManageEmails(page, app) {
    const m = manageEmails(page, app);
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow#emails`));
    await idle(page).catch(() => {});
    const tab = page.locator('#emails-button');
    if (await tab.count()) await tab.first().click().catch(() => {});
    const link = page.getByRole('link', {name: /Add and edit templates/});
    let via = 'link';
    if (await link.first().isVisible({timeout: 5000}).catch(() => false)) {
        await link.first().click();
        await m.waitForList();
    } else {
        via = 'address';
        await m.goto();
    }
    return {m, via};
}

/**
 * Step 3: search `name`; returns what the list answers and, when a row is there, what its "Edit"
 * opens (the template's subject). Records the screen before anything is pressed.
 */
async function searchEmail(page, m, name) {
    await m.search(name);
    await idle(page).catch(() => {});
    await page.waitForTimeout(500);
    const rows = await m.rowsRead();
    const noItems = await m.noItems().isVisible().catch(() => false);
    const shown = await screen(page);
    const out = {name, rows: rows.map((r) => ({name: r.name, description: flat(r.description, 200), buttons: r.buttons})), noItems, screen: shown};
    if (rows.some((r) => r.name === name)) {
        try {
            const {kind, window} = await m.openEmail(name, {search: false});
            out.opens = kind;
            out.subject = kind === 'one' ? await m.subjectBox('en').inputValue().catch(() => null) : null;
            out.window = flat(await window.innerText().catch(() => ''), 300);
            out.editScreen = await screen(page);
        } catch (e) {
            out.editError = flat(e.message, 300);
        }
    }
    return out;
}

/** Step 4: the full list, cleared of any search: its names. */
async function fullList(page, m) {
    await m.goto();
    await idle(page).catch(() => {});
    const names = await m.rowNames();
    return {count: names.length, names, screen: await screen(page)};
}

module.exports = {T, flat, L, INVITATION, SENT, NEVER, manageEmails, openManageEmails, searchEmail, fullList};
