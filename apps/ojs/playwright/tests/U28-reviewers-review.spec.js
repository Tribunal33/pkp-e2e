// @ts-check
/**
 * @file playwright/tests/U28-reviewers-review.spec.js
 *
 * Reviewer's review — OJS suite, one test per canonical scenario the spec
 * runs on OJS (common scenarios 1–14 and 18, and OJS-specific 16; scenario
 * 15 is OMP's and 17 OPS's, in those trees).
 * Spec: docs/specs/U28-reviewers-review.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as contract, a ❓ is parked, not a gap; the spec's
 * Coverage section is the record of everything else left out):
 * - A1 🐞, A2 🐞, A4 🐞, A5 🐞, A6 🐞, A7 🐞, A9 🐞, A10 🐞, A12 🐞 (walked
 *   where a scenario passes through them — S3's file refusal, S7's empty
 *   submit, S10's reminder link, S11's dateless line, S14's archived
 *   wizard — and asserted neither way).
 * - A3 ❓, A11 ❓, A13 ❓ (parked).
 * - Retired: A8, OMP4. OMP1–OMP3 and OPS1 are the other apps'.
 *
 * Seeding: scenario endpoints only. publicknowledge and the 18 seeded users
 * are read-only; scenarios 1–7, 11, 12, 14, 16 and 18 use scratch
 * submissions on the seeded journal with reviewer.julia / reviewer.paul,
 * author.alex and sectioneditor.ana; scenarios 8, 9, 10 and 13 seed a
 * scratch journal through the `review` / `reviewForms[]` passthrough keys
 * with throwaway users whose addresses carry app + test
 * (u28s10ojsw0…@mail.test). Mail is read by recipient plus the tag-bearing
 * submission title (PRINCIPLES A8); silence claims are bounded by the
 * response, row or mail that would carry the effect. A "sign in again" is
 * a NEW session at the journal's Login page in a fresh context — never a
 * sign-out, which would kill the cached session every parallel test of
 * that user shares. No hard-coded waits.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');
const {
    WorkflowPage,
    DecisionPage,
    uploadViaWizard,
    uploadWizardDialog,
    legacyModal,
    openAddReviewerModal,
    selectReviewer,
    addReviewer,
    clickRowAction,
    statusTitle,
    openEditReview,
    saveEditReview,
    pickDate,
    openActivityLog,
    closeSideWindow,
    openReviewDetails,
    awaitReviewDetailsSettled,
    closeReviewDetails,
    createNewReviewRound,
    waitForJQueryIdle,
    FIXTURE_PDF,
    FIXTURE_PDF_NAME,
} = require('../pages/ReviewStagePages.js');
const {
    ReviewerAssignmentsPage,
    ReviewWizardPage,
    signInAtContext,
} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const JOURNAL = 'publicknowledge';
const EDITOR = 'sectioneditor.ana';
const EDITOR_MAIL = `${EDITOR}@mail.test`;
const REVIEWER = 'reviewer.julia';
const REVIEWER_NAME = 'Julia Reviewer';
const REVIEWER_MAIL = `${REVIEWER}@mail.test`;
const SECOND_REVIEWER = 'reviewer.paul';
const SECOND_REVIEWER_NAME = 'Paul Reviewer';
const AUTHOR = 'author.alex';
const SECOND_FIXTURE = path.join(__dirname, '..', 'fixtures', 'files', 'profile-image-400.png');
const SECOND_FIXTURE_NAME = 'profile-image-400.png';
const NO_GUIDELINES = 'This publisher has not set any reviewer guidelines.';
const NOT_ASSIGNED = 'The current user is not assigned as a reviewer for the requested document.';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const THANK_YOU =
    'Thank you for completing the review of this submission. Your review has been submitted successfully. ' +
    'We appreciate your contribution to the quality of the work that we publish; the editor may contact you again for more information if needed.';
const DISCUSSIONS = 'Review Tasks & Discussions';
const RESPONSE_OVERDUE = 'Deadline for responding to this request has passed. Please accept or decline this request at the earliest.';
const REVIEW_OVERDUE = 'Deadline for completing this review has passed. Please complete the review at the earliest.';
const RECOMMENDATIONS = ['Accept Submission', 'Revisions Required', 'Resubmit for Review', 'Resubmit Elsewhere', 'Decline Submission', 'See Comments'];
const DATE = /\d{4}-\d{2}-\d{2}/;
/** A legacy grid's date cell ("September 12, 2026"). */
const GRID_DATE = /[A-Z][a-z]+ \d{1,2}, \d{4}/;

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u28${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * A submission standing in external review with the given reviewers on
 * round 1 (`reviewers`) or on several rounds (`rounds`, one entry per
 * round in the scenario API's shape).
 */
async function seedInReview(ojsApi, tag, {
    context = JOURNAL,
    submitter = AUTHOR,
    reviewers = [],
    rounds = null,
    decisions = ['sendExternalReview'],
    participants = context === JOURNAL ? [{username: EDITOR, role: 'sectionEditor'}] : [],
    published = false,
    title = `Submission ${tag}`,
} = {}) {
    const result = await ojsApi.createSubmission({
        tag,
        context,
        submitter,
        title,
        decisions,
        reviewRounds: rounds || [{reviewers}],
        participants,
        ...(published ? {published: true} : {}),
    });
    return {submissionId: result.submissionId, title};
}

/** A brand-new signed-out context (never inherits the file's storage state). */
async function anonymousContext(browser, baseURL) {
    return browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
}

/**
 * Editor's side: put a file into the round through "Upload/Select Files"
 * beside "Files for Review" (window "Current Review Files For Round N" ›
 * "Upload Review File" › the legacy wizard › "OK").
 */
async function uploadRoundFiles(page, files) {
    await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
    const window = page.getByRole('dialog').filter({hasText: /Current Review Files For Round/});
    await expect(window.getByRole('link', {name: 'Upload Review File'})).toBeVisible({timeout: 30_000});
    for (const file of files) {
        await window.getByRole('link', {name: 'Upload Review File'}).click();
        await uploadViaWizard(page, {file});
        await expect(window.getByRole('row').filter({hasText: path.basename(file)})).toBeVisible({timeout: 30_000});
    }
    await window.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(window).toBeHidden({timeout: 30_000});
    await waitForJQueryIdle(page);
}

/**
 * Editor's side: grant round files to a reviewer through the row's "Edit"
 * window ("Files To Be Reviewed": a box per file; files added after the
 * assignment arrive unticked).
 */
async function grantFilesToReviewer(page, workflow, reviewerText, fileNames) {
    const row = workflow.panelRow('Reviewers', reviewerText);
    await expect(row).toBeVisible({timeout: 30_000});
    const editModal = await openEditReview(page, row);
    for (const name of fileNames) {
        await editModal.getByRole('row').filter({hasText: name}).getByRole('checkbox').check();
    }
    await saveEditReview(page, editModal);
}

/** Walk a seeded acceptance to step 3 ("Save and continue", "Continue to Step #3"). */
async function walkToStep3(wizard) {
    await wizard.expectStep(1);
    await wizard.saveAndContinueButton.click();
    await wizard.expectStep(2);
    await wizard.continueToStep3();
}

/** The first href in an email's HTML whose address matches. */
function linkMatching(html, pattern) {
    const anchorRe = /<a\b[^>]*href=(["'])([^"']+)\1/gi;
    let match;
    while ((match = anchorRe.exec(html)) !== null) {
        const href = match[2].replace(/&amp;/g, '&');
        if (pattern.test(href)) {
            return href;
        }
    }
    return null;
}

/** A reviewer row's "History" window, opened from its "More Actions" menu. */
async function openHistory(page, row) {
    await clickRowAction(page, row, 'History');
    const modal = page.getByRole('dialog').filter({has: page.locator('.pkp_review_history')});
    await expect(modal.getByRole('heading', {name: 'History'})).toBeVisible({timeout: 30_000});
    return modal;
}

/** A review-history line ("{label}: {date}", the label in bold) of the row's History window. */
function historyLine(historyModal, label) {
    return historyModal
        .locator('.pkp_review_history > div')
        .filter({has: historyModal.page().locator('strong', {hasText: new RegExp(`^${label}:\\s*$`)})});
}

/** The submission's activity log holds a row with this text. */
async function expectLogged(page, text) {
    const log = await openActivityLog(page);
    await expect(log.getByRole('row').filter({hasText: text})).toBeVisible();
    await closeSideWindow(log);
}

/** Open a page address that answers a file: the download it starts. */
async function downloadByAddress(page, href) {
    const [download] = await Promise.all([
        page.waitForEvent('download', {timeout: 30_000}),
        page.goto(href).catch(() => null),
    ]);
    return download;
}

/** The reviewer's header "Tasks" rows reading "Review pending." for the title (the caller closes). */
async function openReviewPendingRows(page, title) {
    const tasks = new TasksPanel(page);
    await tasks.open();
    return {tasks, rows: tasks.row('Review pending.').filter({hasText: title})};
}

// Traces are kept for this file's failures (docs/tracking/ci-triage.md flake
// watch, 2026-09-15): it holds the hottest single flake on CI, and the option
// is worker-scoped, so it cannot sit on the one test.
test.use({trace: 'retain-on-failure'});

test.describe('reviewer\'s review', () => {
    test('S1: the request appears in the reviewer\'s list', {tag: '@smoke'}, async ({browser, baseURL, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {submissionId, title} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'invited'}],
        });

        // A fresh session at the journal's Login page lands on the list.
        const context = await anonymousContext(browser, baseURL);
        const page = await context.newPage();
        try {
            await signInAtContext(page, JOURNAL, REVIEWER, getPassword(REVIEWER));
            await page.waitForURL(/dashboard\/reviewAssignments\?currentViewId=reviewer-action-required/, {
                waitUntil: 'commit',
            });
            const list = new ReviewerAssignmentsPage(page, JOURNAL);
            await list.expectSettled();
            await expect(list.heading()).toHaveText(/^Action Required by me \(\d+\)\s*$/);
            await expect(page).toHaveTitle(/^Submissions/);

            // The sidebar: the six views as count then name, in order, and
            // nothing else but "Start A New Submission".
            await expect(list.viewLinks()).toHaveText([
                /^\s*\d+\s+Action Required by me\s*$/,
                /^\s*\d+\s+All assignments\s*$/,
                /^\s*\d+\s+Completed\s*$/,
                /^\s*\d+\s+Declined\s*$/,
                /^\s*\d+\s+Published\s*$/,
                /^\s*\d+\s+Archived\s*$/,
            ]);
            expect(await list.viewCount('actionRequired')).toBeGreaterThanOrEqual(1);
            expect(await list.viewCount('all')).toBeGreaterThanOrEqual(1);
            await expect(list.startNewSubmissionLink).toBeVisible();
            await expect(list.sidebar.getByRole('region')).toHaveCount(1);
            await expect(list.sidebarLinks()).toHaveCount(8);

            // The row: ID, title, the sentence with its date, one button, no
            // menu; the table has no bulk controls.
            const row = list.row(tag);
            await expect(row).toContainText(String(submissionId));
            await expect(row).toContainText(title);
            await expect(row).toContainText(/Please accept or decline this request by \d{4}-\d{2}-\d{2}/);
            await expect(list.rowAction(row, 'Respond to request')).toBeVisible();
            await expect(row.getByRole('button')).toHaveCount(1);
            await expect(list.bulkBoxes()).toHaveCount(0);

            // The same row under "All assignments" only; not in the other four.
            await list.expectInViews(tag, ['actionRequired', 'all']);

            // "Filters": the seeded journal's groups; nothing applied shows
            // nothing above the table.
            await list.goto('actionRequired');
            const filters = await list.openFilters();
            for (const text of ['Section', 'Articles', 'Reviews', 'Issues', 'Categories', 'Days since last activity']) {
                await expect(filters).toContainText(text);
            }
            await expect(filters.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
            await expect(filters.getByRole('button', {name: 'Apply Filters', exact: true})).toBeVisible();
            await list.closeFilters(filters);
            await expect(list.heading()).toBeVisible();
            await expect(list.appliedFiltersText()).toHaveCount(0);

            // Control: a reviewer-only account has no "Editor Dashboard" group.
            await expect(list.reviewerGroup).toBeVisible();
            await expect(list.editorGroup).toHaveCount(0);
        } finally {
            await context.close();
        }
    });

    test('S2: accept a review request', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId, title} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'invited'}],
        });

        const page = await (await asUser(REVIEWER)).newPage();
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await list.goto('actionRequired');
        await list.openWizard(list.row(tag), 'Respond to request');
        await wizard.expectOpen(title);
        await wizard.expectStep(1);
        for (const step of [2, 3, 4]) {
            await wizard.expectTabDisabled(step);
        }

        // A step typed beyond the reached one falls back to step 1.
        await wizard.goto(submissionId, {step: 3});
        await wizard.expectStep(1);

        // Review Type and the three Review Schedule dates.
        expect(await wizard.step1Value('Review Type')).toBe('Anonymous Reviewer/Anonymous Author');
        await expect(page.locator('#reviewStep1Form')).toContainText('Review Schedule');
        for (const field of ['dateNotified', 'responseDue', 'dateDue']) {
            await expect(page.locator(`input[id^="${field}"]`)).toHaveValue(DATE);
        }

        // "View All Submission Details": title and abstract, no authors on an
        // anonymous review.
        const details = await wizard.openSubmissionDetails();
        await expect(details).toContainText(title);
        await expect(details).toContainText(`Seeded abstract for ${tag}.`);
        await expect(details).not.toContainText('Authors');
        await details.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(details).toBeHidden({timeout: 30_000});

        // "About Due Dates".
        const dueDates = await wizard.openAboutDueDates();
        await wizard.closeDialog(dueDates);

        // The privacy box's words link to the journal's privacy page;
        // accepting without the box is refused and the step stays.
        await expect(wizard.privacyStatementLink).toHaveAttribute('href', /\/about\/privacy/);
        await wizard.acceptButton.click();
        await expect(page.locator('label.error').filter({hasText: 'This field is required.'})).toBeVisible({
            timeout: 30_000,
        });
        await wizard.expectStep(1);
        await expect(wizard.acceptButton).toBeVisible();

        // Ticked, the acceptance moves to step 2 with no guidelines configured.
        await wizard.accept();
        await expect(page.getByText(NO_GUIDELINES)).toBeVisible();

        // The wizard remembers step 2; step 1 now offers "Save and continue".
        await page.reload();
        await wizard.expectOpen(title);
        await wizard.expectStep(2);
        await wizard.selectStep(1);
        await expect(wizard.saveAndContinueButton).toBeVisible();
        await expect(wizard.acceptButton).toHaveCount(0);

        // Control: with step 2 reached, ?step=2 opens it and ?step=3 falls back to it.
        await wizard.goto(submissionId, {step: 2});
        await wizard.expectStep(2);
        await wizard.goto(submissionId, {step: 3});
        await wizard.expectStep(2);

        // The list row.
        await list.goto('actionRequired');
        const row = list.row(tag);
        await expect(row).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(row, 'Finish review')).toBeVisible();

        // The editor's mailbox: sent under the reviewer's name, reply-to the
        // reviewer.
        const mail = await pkpMail.find({to: EDITOR_MAIL, subject: 'Review accepted', contains: tag});
        expect(mail.From?.Name).toBe(REVIEWER_NAME);
        expect(mail.ReplyTo?.[0]?.Address).toBe(REVIEWER_MAIL);

        // The editor's row, its History and the activity log.
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        const editorRow = workflow.panelRow('Reviewers', REVIEWER_NAME);
        await expect(editorRow).toContainText('Request Accepted');
        const history = await openHistory(editorPage, editorRow);
        await expect(historyLine(history, 'Request Accepted')).toHaveText(DATE);
        await closeSideWindow(history);
        await expectLogged(
            editorPage,
            `The round 1 review assigned to ${REVIEWER_NAME} for submission ${submissionId} has been accepted.`
        );
    });

    test('S3: decline a review request', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'invited'}],
        });
        const reason = `Declining for ${tag}`;

        // Editor: one file into the round, ticked for Julia.
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await uploadRoundFiles(editorPage, [FIXTURE_PDF]);
        await grantFilesToReviewer(editorPage, workflow, REVIEWER_NAME, [FIXTURE_PDF_NAME]);

        // Julia: the file's link on step 1 downloads for her (the control of
        // the refusal below).
        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await wizard.expectReviewFilesSettled(1);
        const fileHref = await wizard.reviewFileLink(1, FIXTURE_PDF_NAME).getAttribute('href');
        expect(fileHref).not.toBeNull();
        const own = await wizard.downloadReviewFile(1, FIXTURE_PDF_NAME);
        expect(own.suggestedFilename()).toMatch(/\.pdf$/);

        // A reviewer with no assignment: the wizard address is refused, and
        // the file's address answers the text and no file (its shape is A6,
        // asserted neither way).
        const paulPage = await (await asUser(SECOND_REVIEWER)).newPage();
        await paulPage.goto(wizard.url(submissionId));
        await expect(paulPage.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});
        let paulDownload = null;
        paulPage.on('download', (download) => {
            paulDownload = download;
        });
        await paulPage.goto(fileHref);
        await expect(paulPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        expect(paulDownload).toBeNull();

        // "Decline Review Request": the window opens prefilled; a line is
        // added; declining leaves the wizard (where it lands is A3).
        const dialog = await wizard.openDecline();
        const body = wizard.declineMessageBody();
        await expect(body).toContainText('Editors:');
        await expect(body).toContainText('I am afraid that at this time I am unable to review');
        await expect(body).toContainText(REVIEWER_NAME);
        await expect(dialog).toBeVisible();
        await wizard.confirmDecline({appendText: reason});
        await expect(page).not.toHaveURL(/\/reviewer\//);

        // The list: declined wording, no button, under "Declined" only.
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        await list.goto('declined');
        const row = list.row(tag);
        await expect(row).toContainText(/Request declined on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowActions(row)).toHaveCount(0);
        await list.expectInViews(tag, ['declined']);

        // The wizard is closed to the reviewer from now on.
        await page.goto(wizard.url(submissionId));
        await expect(page.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});

        // The editor's side: the mail with the edited message, the row, the log.
        await pkpMail.find({to: EDITOR_MAIL, subject: 'Unable to Review', contains: reason});
        await workflow.gotoEditorial(submissionId);
        const editorRow = workflow.panelRow('Reviewers', REVIEWER_NAME);
        await expect(statusTitle(editorRow)).toHaveText('Request Declined');
        await expectLogged(
            editorPage,
            `The round 1 review assigned to ${REVIEWER_NAME} for submission ${submissionId} has been declined.`
        );

        // "Resend Review Request" reopens the request as unanswered.
        await clickRowAction(editorPage, editorRow, 'Resend Review Request');
        const resendModal = legacyModal(editorPage, 'resendRequestReviewerForm');
        await expect(resendModal.locator('.tox-tinymce')).toHaveCount(1, {timeout: 30_000});
        await resendModal
            .locator('form#resendRequestReviewerForm')
            .getByRole('button', {name: 'Resend Review Request', exact: true})
            .click();
        await expect(resendModal.locator('form#resendRequestReviewerForm')).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(editorPage);
        await list.goto('actionRequired');
        const resentRow = list.row(tag);
        await expect(resentRow).toContainText(/Please accept or decline this request by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(resentRow, 'Respond to request')).toBeVisible();
        await list.expectInViews(tag, ['actionRequired', 'all']);
        await wizard.goto(submissionId);
        await expect(wizard.declineLink).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();

        // Control: the submission is in none of the second reviewer's views.
        const paulList = new ReviewerAssignmentsPage(paulPage, JOURNAL);
        await paulList.expectInViews(tag, []);
    });

    test('S4: download the files for review', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });

        // Editor: two files into the round, one of them ticked for Julia.
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await uploadRoundFiles(editorPage, [FIXTURE_PDF, SECOND_FIXTURE]);
        await expect(workflow.panelRow('Files for Review', FIXTURE_PDF_NAME)).toBeVisible();
        await expect(workflow.panelRow('Files for Review', SECOND_FIXTURE_NAME)).toBeVisible();
        await grantFilesToReviewer(editorPage, workflow, REVIEWER_NAME, [FIXTURE_PDF_NAME]);

        // Reviewer: the ticked file is on step 1 (name, date, component) and downloads.
        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await wizard.expectReviewFilesSettled(1);
        await expect(wizard.reviewFileLink(1, FIXTURE_PDF_NAME)).toBeVisible();
        const fileRow = wizard.reviewFilesGrid(1).getByRole('row').filter({hasText: FIXTURE_PDF_NAME});
        await expect(fileRow).toContainText(GRID_DATE);
        await expect(fileRow).toContainText('Article Text');
        await expect(wizard.reviewFilesGrid(1)).not.toContainText(SECOND_FIXTURE_NAME);
        const fileHref = await wizard.reviewFileLink(1, FIXTURE_PDF_NAME).getAttribute('href');
        const download = await wizard.downloadReviewFile(1, FIXTURE_PDF_NAME);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);

        // The same list heads step 3, and its name downloads the file there too.
        await walkToStep3(wizard);
        await wizard.expectReviewFilesSettled(3);
        await expect(wizard.reviewFileLink(3, FIXTURE_PDF_NAME)).toBeVisible();
        await expect(wizard.reviewFilesGrid(3)).not.toContainText(SECOND_FIXTURE_NAME);
        const download3 = await wizard.downloadReviewFile(3, FIXTURE_PDF_NAME);
        expect(download3.suggestedFilename()).toMatch(/\.pdf$/);

        // The editor's download: the same link downloads for the assigned
        // Section Editor.
        const editorDownload = await downloadByAddress(editorPage, fileHref);
        expect(editorDownload.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('S5: save a review for later', async ({asUser, browser, baseURL, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        // A scratch journal: the save's "Your changes have been saved." is a
        // server-fed toast, which a parallel test signed in as the same
        // roster reviewer can drain (patterns.md parallel lesson 2).
        const tag = makeTag('s5', testInfo);
        const reviewer = `rev${tag}`;
        const reviewerName = `Saver Reviewer${tag}`;
        const editor = `se${tag}`;
        const author = `au${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: editor, roles: ['sectionEditor']},
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer'], givenName: 'Saver', familyName: `Reviewer${tag}`},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            participants: [{username: editor, role: 'sectionEditor'}],
            reviewers: [{username: reviewer, status: 'accepted'}],
        });
        const publicText = `Public review text ${tag}`;
        const privateText = `Private review text ${tag}`;

        const page = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(page, tag);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await wizard.typeComments(publicText);
        await wizard.typePrivateComments(privateText);
        await wizard.chooseRecommendation('Revisions Required');

        // "Cancel" on the confirmation leaves step 3 as it was.
        const confirm = await wizard.pressSubmitReview();
        await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(confirm).toBeHidden({timeout: 30_000});
        await wizard.expectStep(3);
        await expect(wizard.commentsBody).toContainText(publicText);
        await expect(wizard.privateCommentsBody).toContainText(privateText);
        await expect(wizard.recommendationSelect.locator('option:checked')).toHaveText('Revisions Required');

        // "Save for Later": the confirmation text, and the step stays.
        const saved = page.waitForResponse((r) => r.url().includes('/reviewer/saveStep/') && r.request().method() === 'POST');
        await wizard.saveForLater();
        await saved;
        await wizard.expectStep(3);

        // A new session: the row still says "Finish review" and the wizard
        // opens on step 3 with both texts and the choice restored.
        const context = await anonymousContext(browser, baseURL);
        const page2 = await context.newPage();
        try {
            await signInAtContext(page2, tag, reviewer, getPassword(reviewer));
            const list = new ReviewerAssignmentsPage(page2, tag);
            await list.goto('actionRequired');
            const row = list.row(tag);
            await expect(row).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
            await expect(list.rowAction(row, 'Finish review')).toBeVisible();
            const wizard2 = new ReviewWizardPage(page2, tag);
            await wizard2.goto(submissionId);
            await wizard2.expectStep(3);
            await expect(wizard2.commentsBody).toContainText(publicText);
            await expect(wizard2.privateCommentsBody).toContainText(privateText);
            await expect(wizard2.recommendationSelect.locator('option:checked')).toHaveText('Revisions Required');
        } finally {
            await context.close();
        }

        // Control: nothing reached the editor. The save's own response bounds
        // the mail read (any mail would have left during that request), and
        // the editor's row still reads "Request Accepted".
        expect(await pkpMail.count({to: `${editor}@mail.test`, subject: 'Review complete'})).toBe(0);
        const editorPage = await (await asUser(editor)).newPage();
        const workflow = new WorkflowPage(editorPage, tag);
        await workflow.gotoEditorial(submissionId);
        await expect(workflow.panelRow('Reviewers', reviewerName)).toContainText('Request Accepted');
    });

    test('S6: submit a free-form review', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const {submissionId, title} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });

        // Before the submit the reviewer's "Tasks" panel holds "Review pending."
        // for the submission.
        const page = await (await asUser(REVIEWER)).newPage();
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        await list.goto('actionRequired');
        const before = await openReviewPendingRows(page, title);
        await expect(before.rows).toHaveCount(1);
        await before.tasks.close();

        // Step 3 shows its blocks in order.
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await wizard.expectReviewFilesSettled(3);
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.discussionsAddButton).toBeVisible();
        await wizard.expectOrder(3, [
            'Review Files',
            'Enter (or paste) your review of this submission into the form below.',
            'For author and editor',
            'For editor',
            'Upload',
            'Reviewer Files',
            'No Files',
            DISCUSSIONS,
            'Add',
            'Recommendation',
            'Go Back',
            'Save for Later',
            'Submit Review',
        ]);
        await expect(wizard.goBackLink).toBeVisible();

        // The submit.
        await wizard.typeComments(`Sound method, thin data. ${tag}`);
        await wizard.typePrivateComments(`Check the second table. ${tag}`);
        await wizard.chooseRecommendation('Revisions Required');
        await wizard.submitReview();
        await wizard.expectCompleted();

        // Step 4: the heading, the thank-you text and the discussions panel
        // under them.
        const panel = wizard.tabPanel(4);
        await expect(panel.getByRole('heading', {name: 'Review Submitted'})).toBeVisible();
        await expect(panel.getByRole('paragraph').first()).toHaveText(THANK_YOU);
        await expect(panel.getByText(DISCUSSIONS)).toBeVisible({timeout: 30_000});
        await expect(panel.getByRole('button', {name: 'Add', exact: true})).toBeVisible();

        // All four tabs open; step 3's buttons are disabled (read on a typed
        // ?step=3 load, screen notes pC).
        for (const step of [1, 2, 3, 4]) {
            await wizard.expectTabEnabled(step);
        }
        await wizard.goto(submissionId, {step: 3});
        await wizard.expectStep(3);
        await expect(wizard.submitReviewButton).toBeDisabled();
        await expect(wizard.saveForLaterButton).toBeDisabled();

        // The list: "Review submitted on {date}" with "View", under "Completed".
        await list.goto('completed');
        const row = list.row(tag);
        await expect(row).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(row, 'View')).toBeVisible();
        await list.expectInViews(tag, ['all', 'completed']);

        // The reviewer's task is gone (read on a fresh load, bounded by the
        // panel's grid).
        await list.goto('completed');
        const after = await openReviewPendingRows(page, title);
        await expect(after.rows).toHaveCount(0);
        await after.tasks.close();

        // Every editor assigned to the stage gets "Review complete: …" with
        // the recommendation in the subject.
        for (const editor of ['sectioneditor.ana', 'editor.diana', 'sectioneditor.omar']) {
            const mail = await pkpMail.find({to: `${editor}@mail.test`, subject: 'Review complete', contains: tag});
            expect(mail.Subject).toContain('recommends Revisions Required');
        }

        // The editor's "Tasks" panel gains no entry for it (bounded by the
        // mail that the same submit sent).
        const editorPage = await (await asUser(EDITOR)).newPage();
        await editorPage.goto(`/index.php/${JOURNAL}/dashboard/editorial`);
        const editorTasks = new TasksPanel(editorPage);
        await editorTasks.open();
        await expect(editorTasks.rows().or(editorTasks.noItems()).first()).toBeVisible({timeout: 30_000});
        await expect(editorTasks.dialog()).not.toContainText(tag);
        await editorTasks.close();

        // The editor's row and the activity log.
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await expect(workflow.panelRow('Reviewers', REVIEWER_NAME)).toContainText('Review Submitted');
        await expectLogged(
            editorPage,
            `The round 1 review assigned to ${REVIEWER_NAME} for submission ${submissionId} has been completed.`
        );

        // Control: "View" opens the wizard on "4. Completion".
        await list.goto('completed');
        await list.openWizard(list.row(tag), 'View');
        await wizard.expectCompleted();
    });

    test('S7: nothing stops an empty review', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const secondTag = makeTag('s7b', testInfo);
        const {submissionId: secondId} = await seedInReview(ojsApi, secondTag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const fileName = `reviewer-${secondTag}.txt`;

        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);

        // The confirmation comes at once, with no field marked; after "OK"
        // the only check is the recommendation.
        const confirm = await wizard.pressSubmitReview();
        await expect(wizard.recommendationError).toHaveCount(0);
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(wizard.recommendationError).toHaveText('This field is required.', {timeout: 30_000});
        await wizard.expectStep(3);

        // On the same page, a recommendation, and the empty review goes
        // through (A7's record).
        await wizard.chooseRecommendation('Decline Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();
        await pkpMail.find({to: EDITOR_MAIL, subject: 'Review complete', contains: tag});

        // "Upload File" on the second request: the three-step wizard with no
        // file-type question; the file lists with "Edit" and "Delete" in place
        // of "No Files".
        await wizard.goto(secondId);
        await walkToStep3(wizard);
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.noReviewerFiles).toBeVisible();
        const upload = await wizard.openReviewerUploadWizard();
        for (const name of ['1. Upload File', '2. Review Details', '3. Confirm']) {
            await expect(upload.getByRole('tab', {name})).toBeVisible();
        }
        await expect(upload.locator('input[type="file"]')).toBeAttached();
        await expect(wizard.uploadGenreSelect(upload)).toHaveCount(0);
        await wizard.finishReviewerUpload(upload, fileName);
        await expect(wizard.noReviewerFiles).toBeHidden();
        const fileRow = wizard.reviewerFileRow(fileName);
        const actions = await wizard.reviewerFileActions(fileRow);
        await expect(actions.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(actions.getByRole('link', {name: 'Delete', exact: true})).toBeVisible();

        // A file alone: the submit goes through the same way.
        await wizard.chooseRecommendation('Decline Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();
        await pkpMail.find({to: EDITOR_MAIL, subject: 'Review complete', contains: secondTag});

        // The editor's "Review Details" lists the uploaded file under
        // "Reviewer Files".
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(secondId);
        const editorRow = workflow.panelRow('Reviewers', REVIEWER_NAME);
        await expect(editorRow).toContainText('Review Submitted');
        const details = await openReviewDetails(editorPage, editorRow);
        await awaitReviewDetailsSettled(details);
        await expect(details).toContainText('Reviewer Files');
        await expect(details).toContainText(fileName, {timeout: 30_000});
        await closeReviewDetails(editorPage, details);

        // Control: the editor's own "Upload Review File" wizard asks for the
        // file type, unlike the reviewer's.
        await editorPage.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
        const filesWindow = editorPage.getByRole('dialog').filter({hasText: /Current Review Files For Round/});
        await filesWindow.getByRole('link', {name: 'Upload Review File'}).click();
        const editorUpload = uploadWizardDialog(editorPage);
        await expect(editorUpload.getByRole('tab', {name: '1. Upload File'})).toBeVisible({timeout: 30_000});
        await expect(wizard.uploadGenreSelect(editorUpload)).toBeVisible({timeout: 30_000});
    });

    test('S8: a review form instead of free text', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const reviewer = `rev${tag}`;
        const author = `au${tag}`;
        const formTitle = `Form ${tag}`;
        const formDescription = `Answer the four questions for ${tag}.`;
        const radioQuestion = `Is the method sound for ${tag}?`;
        const textQuestion = `What is unclear for ${tag}?`;
        const checkQuestion = `Which parts need work for ${tag}?`;
        const dropQuestion = `Which field for ${tag}?`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer']},
            ],
            reviewForms: [{
                title: formTitle,
                description: formDescription,
                elements: [
                    {question: radioQuestion, type: 'radiobuttons', required: true, options: ['Yes', 'No']},
                    {question: textQuestion, type: 'textfield'},
                    {question: checkQuestion, type: 'checkboxes', options: ['Figures', 'Tables']},
                    {question: dropQuestion, type: 'dropdownbox', options: ['Biology', 'Physics']},
                ],
            }],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            reviewers: [{username: reviewer, status: 'accepted', reviewForm: formTitle}],
        });

        const page = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(page, tag);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);

        // The form's title, description and four questions replace the boxes.
        const form = wizard.step3Form;
        await expect(form.getByRole('heading', {name: formTitle})).toBeVisible();
        await expect(form).toContainText(formDescription);
        await expect(form).toContainText(`${radioQuestion}*`);
        await expect(wizard.formRadio('Yes')).toBeVisible();
        await expect(wizard.formRadio('No')).toBeVisible();
        await expect(form).toContainText(textQuestion);
        await expect(wizard.formTextField).toBeVisible();
        await expect(form).toContainText(checkQuestion);
        await expect(wizard.formCheckbox('Figures')).toBeVisible();
        await expect(wizard.formCheckbox('Tables')).toBeVisible();
        await expect(form).toContainText(dropQuestion);
        await expect(wizard.formDropdown).toBeVisible();
        expect(await wizard.formDropdown.locator('option').allInnerTexts()).toEqual(
            expect.arrayContaining(['Biology', 'Physics'])
        );
        await expect(form).not.toContainText(`${textQuestion}*`);

        // Control: neither free-text box is on the step.
        await expect(page.locator('iframe[id^="comments"]')).toHaveCount(0);
        await expect(form).not.toContainText('For author and editor');
        await expect(form).not.toContainText('For editor');

        // Unanswered: the confirmation, then the message box (whether the
        // question is marked is not judged: A16).
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await expect(wizard.messageBox).toBeVisible({timeout: 30_000});
        await expect(wizard.messageBox).toContainText('Please fill in required fields.');
        await expect(wizard.messageBox).toContainText(
            'Some required fields are not filled in. Please complete them before submitting your review.'
        );
        await wizard.expectStep(3);
        await expect(wizard.formRadio('Yes')).not.toBeChecked();
        await expect(wizard.formRadio('No')).not.toBeChecked();

        // "Save for Later" keeps the three answers whether or not the
        // required question is answered.
        const answer = `Two figures are unlabeled. ${tag}`;
        await wizard.formTextField.fill(answer);
        await wizard.formCheckbox('Figures').check();
        await wizard.formDropdown.selectOption({label: 'Biology'});
        await wizard.saveForLater();
        await wizard.goto(submissionId, {step: 3});
        await expect(wizard.formTextField).toHaveValue(answer);
        await expect(wizard.formCheckbox('Figures')).toBeChecked();
        await expect(wizard.formCheckbox('Tables')).not.toBeChecked();
        await expect(wizard.formDropdown.locator('option:checked')).toHaveText('Biology');
        await expect(wizard.formRadio('Yes')).not.toBeChecked();
        await expect(wizard.formRadio('No')).not.toBeChecked();

        // Leaving with a change: another step's tab asks the browser's
        // question; "Cancel" keeps step 3 with the text as typed.
        const changed = 'Three figures are unlabeled.';
        await wizard.formTextField.fill(changed);
        let question = null;
        page.once('dialog', async (d) => {
            question = d.message();
            await d.dismiss();
        });
        await wizard.tab(2).click();
        await expect.poll(() => question).toBe('The data on this form has changed. Do you wish to continue without saving?');
        await wizard.expectStep(3);
        await expect(wizard.formTextField).toHaveValue(changed);

        // Answered, the submit goes through.
        await wizard.formRadio('Yes').check();
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();
    });

    test('S9: restricted file access', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const manager = `mgr${tag}`;
        const reviewer = `rev${tag}`;
        const author = `au${tag}`;
        await ojsApi.createContext({
            tag,
            review: {restrictReviewerFileAccess: true, defaultReviewMode: 'open'},
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author'], givenName: 'Open', familyName: `Author${tag}`},
                {username: reviewer, roles: ['externalReviewer'], givenName: 'Restricted', familyName: `Reviewer${tag}`},
            ],
        });
        const {submissionId, title} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            reviewers: [{username: reviewer, status: 'invited'}],
        });

        // Manager: one file into the round, ticked for the reviewer.
        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        await uploadRoundFiles(managerPage, [FIXTURE_PDF]);
        await grantFilesToReviewer(managerPage, workflow, 'Restricted', [FIXTURE_PDF_NAME]);

        // Reviewer: no "Review Files" list on step 1 (control: the rest of
        // the step is there); "Open", and the details window names the authors.
        const page = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(page, tag);
        await wizard.goto(submissionId);
        await expect(page.locator('#reviewStep1Form')).toContainText('Review Schedule');
        await expect(wizard.reviewFilesGrid(1)).toHaveCount(0);
        await expect(page.locator('#reviewStep1Form')).not.toContainText('Review Files');
        expect(await wizard.step1Value('Review Type')).toBe('Open');
        const details = await wizard.openSubmissionDetails();
        await expect(details).toContainText(title);
        await expect(details).toContainText(`Seeded abstract for ${tag}.`);
        await expect(details).toContainText('Authors');
        await details.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(details).toBeHidden({timeout: 30_000});

        // After accepting, step 3 lists the file and it downloads.
        await wizard.accept();
        await wizard.continueToStep3();
        await wizard.expectReviewFilesSettled(3);
        await expect(wizard.reviewFileLink(3, FIXTURE_PDF_NAME)).toBeVisible();
        const download = await wizard.downloadReviewFile(3, FIXTURE_PDF_NAME);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);

        // "Filters" on a bare journal offers "Days since last activity" alone.
        const list = new ReviewerAssignmentsPage(page, tag);
        await list.goto('actionRequired');
        const filters = await list.openFilters();
        await expect(filters).toContainText('Days since last activity');
        await expect(filters.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
        await expect(filters.getByRole('button', {name: 'Apply Filters', exact: true})).toBeVisible();
        for (const text of ['Section', 'Issues', 'Categories']) {
            await expect(filters).not.toContainText(text);
        }
        await list.closeFilters(filters);
        // Control for the setting's "off" end: S4 (the list is on step 1) and
        // S2 (an anonymous request's window names no authors).
    });

    test('S10: one-click access', async ({asUser, browser, baseURL, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const manager = `mgr${tag}`;
        const reviewer = `rev${tag}`;
        const reviewerName = `Oneclick Reviewer${tag}`;
        const author = `au${tag}`;
        const contactEmail = `${tag}contact@mail.test`;
        await ojsApi.createContext({
            tag,
            context: {contactName: `Contact ${tag}`, contactEmail},
            review: {reviewerAccessKeysEnabled: true},
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer'], givenName: 'Oneclick', familyName: `Reviewer${tag}`},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {context: tag, submitter: author});

        // The request email comes only from the editor's "Add Reviewer" window.
        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        const modal = await openAddReviewerModal(managerPage);
        await selectReviewer(managerPage, modal, reviewerName);
        await modal.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
        await expect(modal).toHaveCount(0, {timeout: 30_000});
        const request = await pkpMail.find({to: `${reviewer}@mail.test`, subject: 'Invitation to review'});
        const html = (await pkpMail.fullMessage(request.ID)).HTML;
        const link = linkMatching(html, /invitation\/accept/);
        expect(link).not.toBeNull();

        // The request link is opened before anything else reaches this
        // reviewer (a later one-click email kills it: A9, asserted neither way).
        const first = await anonymousContext(browser, baseURL);
        const second = await anonymousContext(browser, baseURL);
        const third = await anonymousContext(browser, baseURL);
        const fourth = await anonymousContext(browser, baseURL);
        try {
            // Signed out, the link signs the reviewer in and lands on step 1.
            const page1 = await first.newPage();
            await page1.goto(link);
            await page1.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
            const wizard1 = new ReviewWizardPage(page1, tag);
            await wizard1.expectOpen();
            await wizard1.expectStep(1);
            await expect(page1.locator('header, [role="banner"]').getByRole('button', {name: new RegExp(reviewer)})).toBeVisible();

            // A second signed-out open lands on the wizard again; so does a
            // third open in the first browser, still signed in as the reviewer.
            const page2 = await second.newPage();
            await page2.goto(link);
            await page2.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
            const wizard2 = new ReviewWizardPage(page2, tag);
            await wizard2.expectOpen();
            await wizard2.expectStep(1);
            await page1.goto(link);
            await page1.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
            await wizard1.expectOpen();
            await wizard1.expectStep(1);

            // Response overdue: the manager moves the response date into the
            // past through the row's "Edit" window; the list row reads so.
            const row = workflow.panelRow('Reviewers', 'Oneclick');
            const editModal = await openEditReview(managerPage, row);
            await pickDate(managerPage, editModal, 'responseDueDate', daysFromNow(-1));
            await saveEditReview(managerPage, editModal);
            const list = new ReviewerAssignmentsPage(page1, tag);
            await list.goto('actionRequired');
            await expect(list.row(tag)).toContainText(RESPONSE_OVERDUE);
            await expect(list.rowAction(list.row(tag), 'Respond to request')).toBeVisible();

            // A reminder's link: the row's "Send Reminder"; the reminder
            // carries a link of its own, which lands on the wizard signed out.
            await managerPage.reload();
            await workflow.expectOpen();
            await row.getByRole('button', {name: 'Send Reminder', exact: true}).click();
            const reminderModal = legacyModal(managerPage, 'sendReminderForm');
            await expect(reminderModal.locator('.tox-tinymce')).toHaveCount(1, {timeout: 30_000});
            await reminderModal
                .locator('form#sendReminderForm')
                .getByRole('button', {name: 'Send Reminder', exact: true})
                .click();
            await expect(reminderModal.locator('form#sendReminderForm')).toBeHidden({timeout: 30_000});
            await waitForJQueryIdle(managerPage);
            const reminder = await pkpMail.find({
                to: `${reviewer}@mail.test`,
                subject: 'A reminder to please complete your review',
            });
            const reminderLink = linkMatching((await pkpMail.fullMessage(reminder.ID)).HTML, /invitation\/accept/);
            expect(reminderLink).not.toBeNull();
            expect(reminderLink).not.toBe(link);
            const page3 = await third.newPage();
            await page3.goto(reminderLink);
            await page3.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
            const wizard3 = new ReviewWizardPage(page3, tag);
            await wizard3.expectOpen();
            await wizard3.expectStep(1);

            // The acceptance goes to the principal contact, nobody being
            // assigned to the submission.
            await wizard3.accept();
            await pkpMail.find({to: contactEmail, subject: 'Review accepted'});

            // Review overdue: the review date moved into the past the same way.
            await managerPage.reload();
            await workflow.expectOpen();
            const editModal2 = await openEditReview(managerPage, row);
            await pickDate(managerPage, editModal2, 'reviewDueDate', daysFromNow(-1));
            await saveEditReview(managerPage, editModal2);
            await list.goto('actionRequired');
            await expect(list.row(tag)).toContainText(REVIEW_OVERDUE);
            await expect(list.rowAction(list.row(tag), 'Finish review')).toBeVisible();

            // The submit, then the reminder's link once more: "Invitation
            // Unavailable".
            await wizard3.goto(submissionId);
            await wizard3.selectStep(1);
            await wizard3.saveAndContinueButton.click();
            await wizard3.expectStep(2);
            await wizard3.continueToStep3();
            await wizard3.typeComments(`Sound method, thin data. ${tag}`);
            await wizard3.chooseRecommendation('Accept Submission');
            await wizard3.submitReview();
            await wizard3.expectCompleted();
            const page4 = await fourth.newPage();
            await page4.goto(reminderLink);
            await expect(page4.getByText('Invitation Unavailable')).toBeVisible({timeout: 30_000});
        } finally {
            await Promise.all([first.close(), second.close(), third.close(), fourth.close()]);
        }

        // Control: on the seeded journal (the setting off) the request's link
        // is the plain wizard address, which asks for sign-in first.
        const controlTag = makeTag('s10b', testInfo);
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag);
        const editorPage = await (await asUser(EDITOR)).newPage();
        const controlWorkflow = new WorkflowPage(editorPage, JOURNAL);
        await controlWorkflow.gotoEditorial(controlId);
        await addReviewer(editorPage, REVIEWER_NAME);
        const controlMail = await pkpMail.find({to: REVIEWER_MAIL, subject: 'Invitation to review', contains: controlTag});
        const controlHtml = (await pkpMail.fullMessage(controlMail.ID)).HTML;
        const plainLink = linkMatching(controlHtml, /reviewer\/submission/);
        expect(plainLink).not.toBeNull();
        expect(plainLink).not.toMatch(/invitation\/accept/);
        const control = await anonymousContext(browser, baseURL);
        try {
            const page = await control.newPage();
            await page.goto(plainLink);
            const login = new LoginPage(page);
            await expect(login.usernameInput).toBeVisible({timeout: 30_000});
            await login.signIn(REVIEWER, getPassword(REVIEWER));
            await page.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
            await new ReviewWizardPage(page, JOURNAL).expectOpen();
        } finally {
            await control.close();
        }
    });

    test('S11: read an earlier round\'s review', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s11', testInfo);
        const roundOneText = `Round one text ${tag}`;
        // Round 1 submitted with "Revisions Required"; round 2 asks Julia again.
        const {submissionId, title} = await seedInReview(ojsApi, tag, {
            rounds: [
                {reviewers: [{username: REVIEWER, status: 'completed', recommendation: 'pendingRevisions', comments: roundOneText}]},
                {reviewers: [{username: REVIEWER, status: 'invited'}]},
            ],
        });
        // Round 1 accepted but never finished; round 2 asks Julia again.
        const unfinishedTag = makeTag('s11b', testInfo);
        const {submissionId: unfinishedId} = await seedInReview(ojsApi, unfinishedTag, {
            rounds: [
                {reviewers: [{username: REVIEWER, status: 'accepted'}]},
                {reviewers: [{username: REVIEWER, status: 'invited'}]},
            ],
        });
        // Paul's round-1 request, declined on screen, and an empty round 2.
        const declinedTag = makeTag('s11c', testInfo);
        const reason = `No time this month ${declinedTag}`;
        const {submissionId: declinedId} = await seedInReview(ojsApi, declinedTag, {
            rounds: [{reviewers: [{username: SECOND_REVIEWER, status: 'invited'}]}, {reviewers: []}],
        });

        // "Previous Reviews" and the submitted round's window.
        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await expect(wizard.previousReviewLine(1)).toHaveText(/Round 1 Review Submitted on \d{4}-\d{2}-\d{2}/);
        const history = await wizard.openRoundHistory(1);
        await expect(history).toContainText('Round 1 Review submitted by you for');
        await expect(history).toContainText(title);
        for (const text of [
            'Recommendation',
            'Revisions Required',
            'Reviewer Comments',
            'For editors and authors',
            'Comment 1:',
            roundOneText,
            'Article Metadata',
            'Abstract',
            `Seeded abstract for ${tag}.`,
            'Type',
            'Articles',
            'General Information',
            "Editor's Request",
            'Response Due Date',
            'Review Accepted On',
            'Review Due Date',
            'Review Submitted On',
        ]) {
            await expect(history).toContainText(text);
        }
        await wizard.closeRoundHistory(history);

        // Control: no line names round 2, the round the wizard is open on.
        await expect(wizard.previousReviewLines()).toHaveCount(1);
        await expect(wizard.previousReviewLine(2)).toHaveCount(0);

        // An unfinished round: its line (the missing date is A2), and its
        // window reads "The review was not completed." alone.
        await wizard.goto(unfinishedId);
        await expect(wizard.previousReviewLine(1)).toContainText('Round 1 Review Submitted on');
        const unfinished = await wizard.openRoundHistory(1);
        await expect(unfinished).toContainText('The review was not completed.');
        await expect(unfinished).not.toContainText('Reviewer Comments');
        await expect(unfinished).not.toContainText('Recommendation');
        await expect(unfinished).toContainText('General Information');
        await expect(unfinished).toContainText('Review Accepted On');
        await expect(unfinished).not.toContainText('Review Submitted On');
        await wizard.closeRoundHistory(unfinished);
        await expect(wizard.previousReviewLine(2)).toHaveCount(0);

        // A declined round: Paul declines round 1 on screen with a typed
        // reason, the editor asks him again on round 2.
        const paulPage = await (await asUser(SECOND_REVIEWER)).newPage();
        const paulWizard = new ReviewWizardPage(paulPage, JOURNAL);
        await paulWizard.goto(declinedId);
        await paulWizard.decline({appendText: reason});
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(declinedId);
        await workflow.selectRound(2);
        await addReviewer(editorPage, SECOND_REVIEWER_NAME);
        await paulWizard.goto(declinedId);
        await expect(paulWizard.previousReviewLine(1)).toHaveText(/Round 1 Review Submitted on \d{4}-\d{2}-\d{2}/);
        const declined = await paulWizard.openRoundHistory(1);
        await expect(declined).toContainText('Declined Date');
        await expect(declined).toContainText('Decline reason sent by email');
        await expect(declined).toContainText('Unable to Review');
        await expect(declined).toContainText(reason);
        await expect(declined).toContainText('General Information');
        await expect(declined).toContainText("Editor's Request");
        await expect(declined).toContainText('Response Due Date');
        for (const text of ['Review Accepted On', 'Review Due Date', 'Review Submitted On']) {
            await expect(declined).not.toContainText(text);
        }
        await paulWizard.closeRoundHistory(declined);
        await expect(paulWizard.previousReviewLine(2)).toHaveCount(0);
    });

    test('S12: nothing can be saved after submission', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s12', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const controlTag = makeTag('s12b', testInfo);
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const fileName = `reviewer-${tag}.txt`;
        const submittedText = `Submitted text ${tag}`;
        const lateText = `Late addition ${tag}`;

        // A submitted review carrying one reviewer file.
        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await wizard.typeComments(submittedText);
        await wizard.expectReviewerFilesSettled();
        await wizard.uploadReviewerFile(fileName);
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();

        // From "View": every tab opens; steps 1 and 2 are disabled.
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        await list.goto('completed');
        await list.openWizard(list.row(tag), 'View');
        await wizard.expectCompleted();
        for (const step of [1, 2, 3, 4]) {
            await wizard.expectTabEnabled(step);
        }
        await wizard.goto(submissionId, {step: 1});
        await wizard.expectStep(1);
        await expect(wizard.saveAndContinueButton).toBeDisabled();
        await wizard.goto(submissionId, {step: 2});
        await wizard.expectStep(2);
        await expect(wizard.continueToStep3Button).toBeDisabled();

        // Step 3: both buttons disabled; the box takes typing that nothing
        // keeps; no "Upload File", the file's row offers "Edit" but no "Delete".
        await wizard.goto(submissionId, {step: 3});
        await wizard.expectStep(3);
        await expect(wizard.submitReviewButton).toBeDisabled();
        await expect(wizard.saveForLaterButton).toBeDisabled();
        await expect(wizard.commentsBody).toContainText(submittedText);
        await wizard.typeComments(lateText);
        await expect(wizard.commentsBody).toContainText(lateText);
        await wizard.goto(submissionId, {step: 3});
        await wizard.expectStep(3);
        await expect(wizard.commentsBody).toContainText(submittedText);
        await expect(wizard.commentsBody).not.toContainText(lateText);
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.uploadFileLink).toHaveCount(0);
        const actions = await wizard.reviewerFileActions(wizard.reviewerFileRow(fileName));
        await expect(actions.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(actions.getByRole('link', {name: 'Delete', exact: true})).toHaveCount(0);

        // Control: the same reviewer's other, still-open assignment offers all of them.
        await wizard.goto(controlId);
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await expect(wizard.continueToStep3Button).toBeEnabled();
        await wizard.continueToStep3();
        await expect(wizard.submitReviewButton).toBeEnabled();
        await expect(wizard.saveForLaterButton).toBeEnabled();
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.uploadFileLink).toBeVisible();
        await wizard.uploadReviewerFile(`reviewer-${controlTag}.txt`);
        const openActions = await wizard.reviewerFileActions(wizard.reviewerFileRow(`reviewer-${controlTag}.txt`));
        await expect(openActions.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(openActions.getByRole('link', {name: 'Delete', exact: true})).toBeVisible();
    });

    test('S13: declare competing interests', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s13', testInfo);
        const manager = `mgr${tag}`;
        const reviewer = `rev${tag}`;
        const author = `au${tag}`;
        const policy = `Reviewers disclose every competing interest for ${tag}.`;
        const guidelines = `Review guidelines text for ${tag}.`;
        const statement = `I once co-authored with the author ${tag}`;
        await ojsApi.createContext({
            tag,
            review: {competingInterests: policy, reviewGuidelines: guidelines},
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer'], givenName: 'Candid', familyName: `Reviewer${tag}`},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            reviewers: [{username: reviewer, status: 'invited'}],
        });

        const page = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(page, tag);
        await wizard.goto(submissionId);
        const form = page.locator('#reviewStep1Form');
        await expect(form).toContainText('Competing Interests');
        await expect(form).toContainText('This publisher has a policy for disclosure of potential competing interests');
        await expect(wizard.noCompetingInterestsRadio).toBeChecked();
        await expect(wizard.hasCompetingInterestsRadio).not.toBeChecked();

        // The policy dialog.
        await wizard.competingInterestsLink.click();
        const policyDialog = page.getByRole('dialog').filter({hasText: policy});
        await expect(policyDialog).toBeVisible({timeout: 30_000});
        await wizard.closeDialog(policyDialog);

        // Declare (the box appears with the second radio), and accept.
        await expect(wizard.competingInterestsFrame).toBeHidden();
        await wizard.hasCompetingInterestsRadio.check();
        await expect(wizard.competingInterestsFrame).toBeVisible({timeout: 30_000});
        await wizard.typeInto(wizard.competingInterestsBody, statement);
        await wizard.accept();

        // The editor's row carries the "Competing Interests" badge.
        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        const row = workflow.panelRow('Reviewers', 'Candid');
        await expect(row).toContainText('Request Accepted');
        await expect(row).toContainText('Competing Interests');

        // The guidelines: step 2 shows the text; step 3 offers the "Review
        // Guidelines" link, which opens the same text in a dialog of that name.
        await wizard.expectStep(2);
        await expect(wizard.tabPanel(2)).toContainText(guidelines);
        await wizard.continueToStep3();
        await expect(wizard.tabPanel(3)).toContainText('Reviewer Guidelines');
        const guidelinesDialog = await wizard.openGuidelines();
        await expect(guidelinesDialog).toContainText(guidelines);
        await wizard.closeDialog(guidelinesDialog);

        // The statement discarded: "I do not have any competing interests"
        // and "Save and continue" drop the badge. Step 1 is re-fetched when
        // its tab is selected: read the stored choice first, so the radio
        // press lands on the reloaded form, not the stale one (tojs note).
        await wizard.goto(submissionId);
        await wizard.selectStep(1);
        await expect(wizard.hasCompetingInterestsRadio).toBeChecked();
        await expect(wizard.competingInterestsBody).toContainText(statement);
        await wizard.noCompetingInterestsRadio.check();
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await managerPage.reload();
        await workflow.expectOpen();
        await expect(row).toContainText('Request Accepted');
        await expect(row).not.toContainText('Competing Interests');

        // Control: on the seeded journal (no policy, no guidelines) step 1
        // has no such section and step 3 no "Review Guidelines" link.
        const controlTag = makeTag('s13b', testInfo);
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const juliaPage = await (await asUser(REVIEWER)).newPage();
        const controlWizard = new ReviewWizardPage(juliaPage, JOURNAL);
        await controlWizard.goto(controlId);
        const controlForm = juliaPage.locator('#reviewStep1Form');
        await expect(controlForm).toContainText('Review Schedule');
        await expect(controlForm).not.toContainText('Competing Interests');
        await expect(controlWizard.noCompetingInterestsRadio).toHaveCount(0);
        await walkToStep3(controlWizard);
        await expect(controlWizard.tabPanel(3)).toContainText('Review Files');
        await expect(controlWizard.tabPanel(3)).not.toContainText('Reviewer Guidelines');
        await expect(controlWizard.guidelinesLink).toHaveCount(0);
    });

    test('S14: left behind when the submission moves on', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s14', testInfo);
        // A seeded acceptance on a submission the editor has since accepted
        // (the API's promote-from-review decision is `accept`, footnote s).
        const {submissionId} = await seedInReview(ojsApi, tag, {
            decisions: ['sendExternalReview', 'accept'],
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        // A submitted review on a published submission.
        const publishedTag = makeTag('s14c', testInfo);
        const {submissionId: publishedId} = await seedInReview(ojsApi, publishedTag, {
            reviewers: [{username: REVIEWER, status: 'completed'}],
            published: true,
        });

        const page = await (await asUser(REVIEWER)).newPage();
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        await list.goto('archived');
        const row = list.row(tag);
        await expect(row).toContainText('Incomplete');
        await expect(list.rowActions(row)).toHaveCount(0);
        await list.expectInViews(tag, ['archived']);

        // The wizard still opens at step 1 and takes a full review (A11's
        // record; the scenario's own walk).
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await wizard.expectStep(1);
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await walkToStep3(wizard);
        await wizard.typeComments(`Late review ${tag}`);
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The row moved from "Archived" to "Completed".
        await list.goto('completed');
        const doneRow = list.row(tag);
        await expect(doneRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(doneRow, 'View')).toBeVisible();
        await list.expectInViews(tag, ['all', 'completed']);

        // "Published": the submitted review on the published submission sits
        // there alone, with "View".
        await list.goto('published');
        const publishedRow = list.row(publishedTag);
        await expect(publishedRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(publishedRow, 'View')).toBeVisible();
        await list.expectInViews(publishedTag, ['published']);
        expect(publishedId).toBeGreaterThan(0);

        // Control: a review submitted BEFORE the submission moved on sits
        // under "Completed" with "View" once the editor accepts.
        const controlTag = makeTag('s14b', testInfo);
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        await wizard.goto(controlId);
        await walkToStep3(wizard);
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(controlId);
        await workflow.decisionButton('Accept Submission').click();
        const decision = new DecisionPage(editorPage);
        await decision.expectOpen('Accept Submission');
        await decision.completeAll();
        await workflow.expectPageTitle('Copyediting');
        await list.goto('completed');
        const controlRow = list.row(controlTag);
        await expect(controlRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(controlRow, 'View')).toBeVisible();
    });

    test('S16: the recommendation reaches the editor', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s16', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });

        // "Recommendation": preset to "Choose One"; after it the six
        // defaults, in no fixed order (the options' query has none).
        const page = await (await asUser(REVIEWER)).newPage();
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await expect(wizard.recommendationSelect.locator('option:checked')).toHaveText('Choose One');
        const options = await wizard.recommendationOptions();
        expect(options[0]).toBe('Choose One');
        expect(unordered(options.slice(1))).toEqual(unordered(RECOMMENDATIONS));
        await wizard.typeComments(`Please add a control group. ${tag}`);
        await wizard.chooseRecommendation('Revisions Required');
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The editor's row: "Review Submitted" with the recommendation under it.
        const editorPage = await (await asUser(EDITOR)).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        const row = workflow.panelRow('Reviewers', REVIEWER_NAME);
        await expect(row).toContainText('Review Submitted');
        await expect(row).toContainText('Revisions Required');

        // Control: the "Review complete: …" email names the choice.
        const mail = await pkpMail.find({to: EDITOR_MAIL, subject: 'Review complete', contains: tag});
        expect(mail.Subject).toContain('recommends Revisions Required');

        // A later round: the editor opens round 2 and asks Julia again; her
        // "Read Round 1 Review" window shows the choice under "Recommendation".
        await createNewReviewRound(editorPage, workflow, 2);
        await addReviewer(editorPage, REVIEWER_NAME);
        await wizard.goto(submissionId);
        const history = await wizard.openRoundHistory(1);
        await expect(history).toContainText('Recommendation');
        await expect(history).toContainText('Revisions Required');
        await wizard.closeRoundHistory(history);
    });

    test('S18: who is refused', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s18', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });
        const controlTag = makeTag('s18b', testInfo);
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag, {
            reviewers: [{username: REVIEWER, status: 'accepted'}],
        });

        // The Author: no reviewer group in the sidebar (control: the author's
        // own group), the list's address and the wizard's address refused.
        const authorPage = await (await asUser(AUTHOR)).newPage();
        const authorList = new ReviewerAssignmentsPage(authorPage, JOURNAL);
        const wizardUrl = new ReviewWizardPage(authorPage, JOURNAL).url(submissionId);
        await authorPage.goto(`/index.php/${JOURNAL}/dashboard/mySubmissions`);
        await expect(authorList.sidebar.getByRole('button', {name: /My Submissions/})).toBeVisible({timeout: 30_000});
        await expect(authorList.sidebar.getByRole('button', {name: 'My Assignments as Reviewer'})).toHaveCount(0);
        await expect(authorList.reviewerGroup).toHaveCount(0);
        await authorPage.goto(authorList.url('actionRequired'));
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await authorPage.goto(wizardUrl);
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});

        // The Section Editor: the same wizard address is refused the same way.
        const editorPage = await (await asUser(EDITOR)).newPage();
        await editorPage.goto(wizardUrl);
        await expect(editorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});

        // The editor cancels the accepted assignment.
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        const row = workflow.panelRow('Reviewers', REVIEWER_NAME);
        await expect(row).toContainText('Request Accepted');
        await clickRowAction(editorPage, row, 'Cancel Reviewer');
        const cancelModal = legacyModal(editorPage, 'cancelReviewForm');
        await expect(cancelModal.locator('.tox-tinymce')).toHaveCount(1, {timeout: 30_000});
        await cancelModal
            .locator('form#cancelReviewForm')
            .getByRole('button', {name: 'Cancel Reviewer', exact: true})
            .click();
        await expect(cancelModal.locator('form#cancelReviewForm')).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(editorPage);
        await editorPage.reload();
        await workflow.expectOpen();
        await expect(statusTitle(row)).toHaveText('Request Cancelled');

        // The cancelled reviewer: the submission in none of the six views,
        // and the wizard address refused.
        const page = await (await asUser(REVIEWER)).newPage();
        const list = new ReviewerAssignmentsPage(page, JOURNAL);
        const wizard = new ReviewWizardPage(page, JOURNAL);
        await list.expectInViews(tag, []);
        await page.goto(wizard.url(submissionId));
        await expect(page.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});

        // Control: the second assignment still reads "Please complete this
        // review by {date}" with "Finish review", and its wizard opens.
        await list.goto('actionRequired');
        const controlRow = list.row(controlTag);
        await expect(controlRow).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(controlRow, 'Finish review')).toBeVisible();
        await wizard.goto(controlId);
        await wizard.expectStep(1);
    });
});
