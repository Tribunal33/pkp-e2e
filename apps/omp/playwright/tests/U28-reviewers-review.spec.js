// @ts-check
/**
 * @file playwright/tests/U28-reviewers-review.spec.js
 *
 * U28 — Reviewer's review, OMP suite (spec: docs/specs/U28-reviewers-review.md).
 * One test per canonical scenario a press runs, in OMP vocabulary (press,
 * monograph, "Book Title", the private box "For editor only"; the roster
 * splits julia/paul → External Reviewers, amara/adam → Internal Reviewers):
 * the common scenarios 1–14 and 18 on External Review, plus the {OMP}
 * scenario 15 (two stages, no recommendation — OMP1 ✅). Scenario 16 is
 * OJS's and 17 is OPS's. The reviewer's screens are driven through the
 * shared `ReviewerPages.js` (the list and the wizard); the editor's side
 * through the OMP `ReviewStagePages.js` / `ReviewerAssignmentPages.js`.
 *
 * Not covered, by register ID (the spec's Coverage section is the record of
 * everything else left out; 🐞 findings are never asserted as contract,
 * PRINCIPLES M3, and a claim parked on an open ❓ is not a coverage gap):
 * A1, A2, A3, A4, A5, A6 (the refusal's shape only; that the file is refused
 * is asserted), A7 (the empty submit is driven as scenario 7 prescribes,
 * nothing about it beyond the mail's arrival), A9, A10, A11 (scenario 14's
 * archived wizard is driven as written), A12, A13, OMP2, OMP3.
 *
 * Seeding: scenario endpoints only. Scenarios 1–4, 6, 7, 11, 12, 14 and 18
 * run on the seeded press with the roster reviewers and scratch monographs;
 * scenarios 5, 8, 9, 10, 13 and 15 on scratch presses configured through
 * the `review` and `reviewForms` passthrough keys with throwaway accounts
 * (5 for its server-fed toast, screen notes tomp). Mailpit is shared: every
 * read is scoped by recipient plus the seeded title (it carries the tag),
 * silence claims are paired with a positive control. A "sign in again" is a
 * fresh browser context at the press's Login page, never a sign-out (a
 * sign-out ends the cached session other workers reuse). All tests run in
 * the parallel `omp` project — nothing here mutates shared singletons.
 */
const {test, expect} = require('../support/fixtures.js');
const {getEmail, getPassword} = require('../../../../shared/playwright/data/users.js');
const {disableMotion} = require('../../../../shared/playwright/support/motion.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {
    ReviewerAssignmentsPage,
    ReviewWizardPage,
    REVIEWER_VIEWS,
    REVIEWER_VIEW_NAMES,
    signInAtContext,
} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {
    decisionButton,
    openEditorial,
    walkDecisionWizard,
    openTasksPanel,
    closeTopModal,
    uploadRoundReviewFile,
} = require('../pages/ReviewStagePages.js');
const {
    reviewerRow,
    addReviewerFromList,
    grantFileToReviewer,
    completeReview,
    openHistory,
    closeLegacyWindow,
    openActivityLog,
    activityLogRow,
    openReadReview,
    moveDueDate,
    sendReminder,
    cancelReviewer,
    resendReviewRequest,
    daysFromNow,
} = require('../pages/ReviewerAssignmentPages.js');

const PK = 'publicknowledge';
const ANA = 'sectioneditor.ana';
const JULIA = 'reviewer.julia';
const PAUL = 'reviewer.paul';
const PRIVATE_BOX = 'For editor only';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const NOT_ASSIGNED = 'The current user is not assigned as a reviewer for the requested document.';
const RESPONSE_OVERDUE =
    'Deadline for responding to this request has passed. Please accept or decline this request at the earliest.';
const REVIEW_OVERDUE =
    'Deadline for completing this review has passed. Please complete the review at the earliest.';
const THANK_YOU =
    'Thank you for completing the review of this submission. Your review has been submitted successfully. ' +
    'We appreciate your contribution to the quality of the work that we publish; the editor may contact you ' +
    'again for more information if needed.';

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/** The seeded title carries the tag, so list rows and mails are found by it. */
function titleFor(tag) {
    return `Monograph ${tag}`;
}

/**
 * Seed a monograph on the seeded press straight into External Review round
 * 1 with the given reviewers; ana is on the stage so the reviewer's
 * response and review-complete emails have a roster recipient (fn s).
 */
async function seedExternal(ompApi, tag, reviewers = [], extra = {}) {
    return ompApi.createSubmission({
        tag,
        context: PK,
        submitter: 'author.alex',
        series: 'monographs',
        title: titleFor(tag),
        decisions: ['skipInternalReview'],
        reviewRounds: [{stage: 'external', reviewers}],
        participants: [{username: ANA, role: 'sectionEditor'}],
        ...extra,
    });
}

/**
 * Seed a scratch press (its own review setup, its own mailboxes) with a
 * manager, an author, a series editor with a unique mailbox, and the given
 * extra users. Returns the usernames and the editor's address.
 */
async function seedScratchPress(ompApi, tag, {users = [], review, reviewForms, context} = {}) {
    const manager = `mgr${tag}`;
    const author = `au${tag}`;
    const editor = `se${tag}`;
    const editorEmail = `${tag}se@mail.test`;
    const spec = {
        tag,
        users: [
            {username: manager, roles: ['manager'], givenName: `Mgr${tag}`, familyName: 'Manager'},
            {username: author, roles: ['author'], givenName: `Au${tag}`, familyName: 'Author'},
            {username: editor, roles: ['sectionEditor'], givenName: `Se${tag}`, familyName: 'Editor', email: editorEmail},
            ...users,
        ],
    };
    if (review) {
        spec.review = review;
    }
    if (reviewForms) {
        spec.reviewForms = reviewForms;
    }
    if (context) {
        spec.context = context;
    }
    await ompApi.createContext(spec);
    return {manager, author, editor, editorEmail};
}

/** Seed a monograph on a scratch press into one review round. */
async function seedScratchMonograph(ompApi, tag, press, {reviewers = [], stage = 'external', participants = null} = {}) {
    return ompApi.createSubmission({
        tag,
        context: press.path,
        submitter: press.author,
        title: titleFor(tag),
        decisions: [stage === 'internal' ? 'sendInternalReview' : 'skipInternalReview'],
        reviewRounds: [{stage, reviewers}],
        participants: participants || [{username: press.editor, role: 'sectionEditor'}],
    });
}

/** A signed-out browser context (never inherits a storage state). */
async function anonymousPage(browser, baseURL) {
    const ctx = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    await disableMotion(ctx);
    return ctx.newPage();
}

/** The wizard and list page objects for a page on a context. */
function reviewerScreens(page, contextPath) {
    return {
        list: new ReviewerAssignmentsPage(page, contextPath),
        wizard: new ReviewWizardPage(page, contextPath, {privateBoxLabel: PRIVATE_BOX}),
    };
}

/** From an accepted (seeded) request to step 3: "Save and continue", "Continue to Step #3". */
async function walkToStep3(wizard, submissionId) {
    await wizard.goto(submissionId);
    await wizard.expectStep(1);
    await wizard.saveAndContinueButton.click();
    await wizard.expectStep(2);
    await wizard.continueToStep3();
}

/**
 * The one-click link of a request or reminder email: the first href on
 * `invitation/accept` (the link text is the address itself in a reminder,
 * so the text-keyed `extractLink` is not used), entities decoded.
 */
function oneClickLink(html) {
    const match = html.match(/href="([^"]*invitation\/accept[^"]*)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
}

/**
 * The list's "Filters" window (a side modal; its wrapper reports
 * visibility hidden, so it is anchored on its "Apply Filters" button).
 * Proposed for the shared `ReviewerAssignmentsPage`: `openFilters()`.
 */
async function openFilters(page, list) {
    await list.filtersButton.click();
    const modal = page
        .locator('[data-cy="active-modal"]')
        .filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})});
    await expect(modal.getByRole('button', {name: 'Apply Filters', exact: true})).toBeVisible({timeout: 30_000});
    return modal;
}

/** Close the "Filters" window through its header "Close" (patterns.md pitfall 7). */
async function closeFilters(page, modal) {
    await modal.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/**
 * The header "Tasks" panel's row about a submission (each task row carries
 * the message and the submission's title, `controllers/grid/tasks/task.tpl`).
 */
function taskRow(panel, title) {
    return panel.locator('.task').filter({hasText: title});
}

/** The step's "Review Tasks & Discussions" panel (its own fetch renders it a beat after the tab). */
function discussionsPanel(page, step) {
    return page
        .getByRole('tabpanel', {name: new RegExp(`^${step}\\.`)})
        .locator(step === 4 ? '[id^="discussionManagerComplete-"]' : '[id^="discussionManager-"]');
}

/**
 * The four review-form answer controls (`reviewFormResponse.tpl`): a text
 * box is `input[type=text]`, a checkbox group a `fieldset[role=group]`, a
 * radio group a `fieldset[role=radiogroup]`, a drop-down a `select`, each
 * named `reviewFormResponses[…]`. Proposed for the shared
 * `ReviewWizardPage`: `formTextBox()`, `formCheckbox(label)`, `formSelect()`.
 */
function reviewFormControls(page) {
    return {
        textBox: page.locator('input[type="text"][name^="reviewFormResponses"]'),
        checkboxGroup: page.locator('fieldset[role="group"][id^="reviewFormResponses"]'),
        radioGroup: page.locator('fieldset[role="radiogroup"][id^="reviewFormResponses"]'),
        select: page.locator('select[name^="reviewFormResponses"]'),
        checkbox: (label) => page.getByRole('checkbox', {name: label, exact: true}),
    };
}

/**
 * The position of each phrase in a text, each searched after the one
 * before it (a phrase that also occurs earlier, "No Files" in the step's
 * review-files list, is found where the order needs it); -1 when absent.
 */
function positions(text, phrases) {
    let from = 0;
    return phrases.map((phrase) => {
        const at = text.indexOf(phrase, from);
        if (at >= 0) {
            from = at + phrase.length;
        }
        return at;
    });
}

test.describe("Reviewer's review (U28)", () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: the request appears in the reviewer\'s list', async ({ompApi, browser, baseURL}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s1');
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'invited'}]);

        // Landing: signing in on the press's Login page lands on "Action
        // Required by me"; the browser tab reads "Submissions".
        const page = await anonymousPage(browser, baseURL);
        await signInAtContext(page, PK, JULIA, getPassword(JULIA));
        await page.waitForURL(
            (url) =>
                url.pathname.includes('/dashboard/reviewAssignments') &&
                url.searchParams.get('currentViewId') === 'reviewer-action-required',
            {waitUntil: 'commit'}
        );
        const {list} = reviewerScreens(page, PK);
        await list.expectSettled();
        await expect(list.heading()).toHaveText(/^\s*Action Required by me \(\d+\)\s*$/);
        await expect(page).toHaveTitle(/Submissions/);

        // The sidebar: the group lists its six views, each as its count then
        // its name (the count includes this request; never asserted equal to
        // the heading's, a roster reviewer gains requests from parallel
        // workers between the two reads), and holds nothing else but "Start
        // A New Submission".
        const headingCount = Number((await list.heading().innerText()).match(/\((\d+)\)/)[1]);
        expect(headingCount).toBeGreaterThanOrEqual(1);
        expect(await list.viewCount('actionRequired')).toBeGreaterThanOrEqual(1);
        for (const view of Object.keys(REVIEWER_VIEWS)) {
            await expect(list.viewLink(view)).toHaveText(
                new RegExp(`^\\s*\\d+\\s+${REVIEWER_VIEW_NAMES[view]}\\s*$`)
            );
        }
        await expect(list.reviewerGroup.getByRole('treeitem')).toHaveCount(6);
        await expect(list.sidebar.getByRole('region')).toHaveCount(1);
        await expect(list.sidebar.getByRole('link', {name: 'Start A New Submission'})).toBeVisible();

        // The row: ID, title, the unanswered sentence with a year-month-day
        // date and "Respond to request" as its only button; no row menu, no
        // bulk controls on the table.
        const row = list.row(tag);
        await expect(row).toBeVisible();
        await expect(row).toContainText(String(seeded.submissionId));
        await expect(row).toContainText(titleFor(tag));
        await expect(row).toContainText(/Please accept or decline this request by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(row, 'Respond to request')).toBeVisible();
        await expect(row.getByRole('button')).toHaveCount(1);
        await expect(row.getByRole('button', {name: /More Actions/})).toHaveCount(0);
        await expect(list.table.getByRole('checkbox')).toHaveCount(0);

        // "Filters": the press's window offers "Categories" and "Days since
        // last activity" (no "Section", no "Issues"), with "Clear Filters"
        // and "Apply Filters"; with nothing applied, nothing about filters
        // shows above the table.
        const filters = await openFilters(page, list);
        await expect(filters.getByText('Categories', {exact: true})).toBeVisible();
        await expect(filters.getByText('Days since last activity')).toBeVisible();
        await expect(filters.getByText('Section', {exact: true})).toHaveCount(0);
        await expect(filters.getByText('Issues', {exact: true})).toHaveCount(0);
        await expect(filters.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
        await closeFilters(page, filters);
        await expect(list.filtersButton).toBeVisible();
        await expect(page.locator('main').getByRole('button', {name: 'Clear Filters', exact: true})).toHaveCount(0);
        await expect(page.locator('main').getByText(/^Search:/)).toHaveCount(0);

        // Control: a reviewer-only account has no "Editor Dashboard" group.
        await expect(list.reviewerGroup).toBeVisible();
        await expect(list.editorGroup).toHaveCount(0);

        // The same row is under "All assignments" and in no other view.
        await list.expectInViews(tag, ['actionRequired', 'all']);
    });

    test('S2: accept a review request', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s2');
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'invited'}]);

        const page = await (await asUser(JULIA)).newPage();
        const {list, wizard} = reviewerScreens(page, PK);
        await list.goto('actionRequired');
        await list.openWizard(list.row(tag), 'Respond to request');
        await wizard.expectOpen(titleFor(tag));
        await wizard.expectStep(1);
        await wizard.expectTabDisabled(2);
        await wizard.expectTabDisabled(3);
        await wizard.expectTabDisabled(4);

        // A step typed beyond the reached one falls back to step 1.
        await wizard.goto(seeded.submissionId, {step: 3});
        await wizard.expectStep(1);

        // Review Type and the Review Schedule dates.
        await expect(page.getByText('Anonymous Reviewer/Anonymous Author')).toBeVisible();
        // The "Review Schedule" block: three read-only dates.
        await expect(page.getByText('Review Schedule')).toBeVisible();
        for (const label of ["Editor's Request", 'Response Due Date', 'Review Due Date']) {
            await expect(page.getByRole('textbox', {name: label})).toHaveValue(/\d{4}-\d{2}-\d{2}/);
        }

        // "View All Submission Details": title and abstract, no authors on an
        // anonymous review.
        const details = await wizard.openSubmissionDetails();
        await expect(details).toContainText(titleFor(tag));
        await expect(details).toContainText(`Seeded abstract for ${tag}.`);
        await expect(details.getByText('Authors', {exact: true})).toHaveCount(0);
        await wizard.closeDialog(details);

        // "About Due Dates".
        const about = await wizard.openAboutDueDates();
        await expect(about).toContainText(
            'The editor asks that you either accept or decline the review before the Response Due Date ' +
                'and complete the review by the Review Due Date.'
        );
        await wizard.closeDialog(about);

        // The privacy box's words "privacy statement" link to the press's
        // privacy page. (Proposed for the shared ReviewWizardPage:
        // `privacyStatementLink`.)
        const privacyLink = page.getByRole('link', {name: 'privacy statement', exact: true});
        await expect(privacyLink).toHaveAttribute('href', /\/about\/privacy/);

        // Accepting without the privacy box is refused; the step stays.
        await wizard.acceptButton.click();
        await expect(page.getByText('This field is required.').first()).toBeVisible();
        await wizard.expectStep(1);
        await expect(wizard.acceptButton).toBeVisible();

        // Ticked, the accept lands on step 2 with the empty-guidelines text.
        await wizard.accept();
        await expect(page.getByText('This publisher has not set any reviewer guidelines.')).toBeVisible();

        // Reloaded, the wizard opens on step 2 and step 1 offers "Save and continue".
        await page.reload();
        await wizard.expectOpen();
        await wizard.expectStep(2);
        await wizard.selectStep(1);
        await expect(wizard.saveAndContinueButton).toBeVisible();
        await expect(wizard.acceptButton).toHaveCount(0);

        // Control: with step 2 reached, `?step=2` opens step 2 and `?step=3`
        // falls back to it.
        await wizard.goto(seeded.submissionId, {step: 2});
        await wizard.expectStep(2);
        await wizard.goto(seeded.submissionId, {step: 3});
        await wizard.expectStep(2);

        // The list row moved to the accepted wording with "Finish review"
        // (the clock time after the date is register finding A5, unasserted).
        await list.goto('actionRequired');
        const row = list.row(tag);
        await expect(row).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(row, 'Finish review')).toBeVisible();

        // The assigned editor's mailbox holds "Review accepted: …", sent
        // under the reviewer's name with the reviewer's address as reply-to.
        const accepted = await pkpMail.find({to: getEmail(ANA), subject: 'Review accepted', contains: tag});
        const acceptedMail = await pkpMail.fullMessage(accepted.ID);
        expect(acceptedMail.From.Name).toBe('Julia Reviewer');
        expect((acceptedMail.ReplyTo || []).map((r) => r.Address)).toContain(getEmail(JULIA));

        // The Section Editor's side: the row reads "Request Accepted", its
        // History holds a "Confirm" date, and the activity log records the
        // acceptance.
        const anaPage = await (await asUser(ANA)).newPage();
        const modal = await openEditorial(anaPage, PK, seeded.submissionId);
        const editorRow = reviewerRow(modal, 'Julia Reviewer');
        await expect(editorRow).toContainText('Request Accepted');
        const history = await openHistory(anaPage, editorRow);
        await expect(history).toContainText(/Request Accepted:\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2} [AP]M/);
        await closeLegacyWindow(anaPage, history);
        const log = await openActivityLog(anaPage);
        await expect(activityLogRow(log, 'has been accepted')).toBeVisible();
    });

    test('S3: decline a review request', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s3');
        const reason = `Reason${tag}`;
        const fileName = `${tag}A.txt`;
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'invited'}]);

        // The editor puts one file on the round and ticks it for Julia.
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const mayaModal = await openEditorial(mayaPage, PK, seeded.submissionId);
        await uploadRoundReviewFile(mayaPage, mayaModal, fileName);
        await grantFileToReviewer(mayaPage, reviewerRow(mayaModal, 'Julia Reviewer'), fileName);

        const page = await (await asUser(JULIA)).newPage();
        const {list, wizard} = reviewerScreens(page, PK);
        await wizard.goto(seeded.submissionId);
        await wizard.expectStep(1);
        await wizard.expectReviewFilesSettled(1);
        const fileHref = await wizard.reviewFileLink(1, fileName).getAttribute('href');
        expect(fileHref).toContain('download-file');

        // A reviewer with no assignment: Paul's typed wizard address reads
        // the not-assigned message; the file's download link, opened by
        // him, answers the refusal text and no file (the page's shape, a
        // bare line rather than the access-denied page, is register finding
        // A6, unasserted): a download would have thrown on the navigation.
        const paulPage = await (await asUser(PAUL)).newPage();
        const {list: paulList} = reviewerScreens(paulPage, PK);
        await paulPage.goto(wizard.url(seeded.submissionId));
        await expect(paulPage.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});
        const refusal = await paulPage.goto(fileHref);
        expect(refusal.headers()['content-disposition']).toBeUndefined();
        expect(await refusal.text()).toContain(ACCESS_DENIED);

        // The window opens prefilled with the press's "Unable to Review"
        // text and the reviewer's name; a line is added and the decline
        // sent. (Where the browser lands is register question A3,
        // unasserted.)
        const dialog = await wizard.openDecline();
        const body = wizard.declineMessageBody();
        await expect(body).toContainText('Editor(s):');
        await expect(body).toContainText('I am afraid that at this time I am unable to review the submission');
        await expect(body).toContainText('Julia Reviewer');
        await expect(dialog).toContainText('You may provide the editor with any reasons why you are declining');
        await wizard.confirmDecline({appendText: reason});

        // The row reads "Request declined on {date}" with no button, under
        // "Declined" only.
        await list.goto('declined');
        const row = list.row(tag);
        await expect(row).toContainText(/Request declined on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowActions(row)).toHaveCount(0);
        await list.expectInViews(tag, ['declined']);

        // The wizard is closed to the reviewer from now on.
        await page.goto(wizard.url(seeded.submissionId));
        await expect(page.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});

        // The assigned editor's mailbox holds "Unable to Review" with the
        // edited message; the Section Editor's row reads "Request Declined"
        // and the activity log records the decline.
        await pkpMail.find({to: getEmail(ANA), subject: 'Unable to Review', contains: reason});
        const anaPage = await (await asUser(ANA)).newPage();
        const modal = await openEditorial(anaPage, PK, seeded.submissionId);
        const editorRow = reviewerRow(modal, 'Julia Reviewer');
        await expect(editorRow).toContainText('Request Declined');
        const log = await openActivityLog(anaPage);
        await expect(activityLogRow(log, 'has been declined')).toBeVisible();
        await log.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(log).toBeHidden({timeout: 20_000});

        // "Resend Review Request": the Section Editor asks again; the row
        // leaves "Declined" and reads as unanswered under "Action Required
        // by me", and step 1 offers the two response controls again.
        const resendModal = await openEditorial(anaPage, PK, seeded.submissionId);
        await resendReviewRequest(anaPage, reviewerRow(resendModal, 'Julia Reviewer'));
        await list.goto('actionRequired');
        const resentRow = list.row(tag);
        await expect(resentRow).toContainText(/Please accept or decline this request by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(resentRow, 'Respond to request')).toBeVisible();
        await list.goto('declined');
        await expect(list.row(tag)).toHaveCount(0);
        await wizard.goto(seeded.submissionId);
        await wizard.expectStep(1);
        await expect(wizard.declineLink).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();

        // Control: the submission is in none of Paul's six views (bounded by
        // each view's own settled table).
        await paulList.expectInViews(tag, []);
    });

    test('S4: download the files for review', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s4');
        const ticked = `${tag}A.txt`;
        const unticked = `${tag}B.txt`;
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}]);

        // The editor puts two files on the round and ticks one for Julia.
        const editorPage = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(editorPage, PK, seeded.submissionId);
        await uploadRoundReviewFile(editorPage, modal, ticked);
        await uploadRoundReviewFile(editorPage, modal, unticked);
        await grantFileToReviewer(editorPage, reviewerRow(modal, 'Julia Reviewer'), ticked);

        // Step 1 lists the ticked file only: one row with its name as a
        // download link, its date and its component; the name downloads.
        const page = await (await asUser(JULIA)).newPage();
        const {wizard} = reviewerScreens(page, PK);
        await wizard.goto(seeded.submissionId);
        await wizard.expectReviewFilesSettled(1);
        await expect(wizard.reviewFileLink(1, ticked)).toBeVisible();
        await expect(wizard.reviewFileLink(1, unticked)).toHaveCount(0);
        const fileRow = wizard.reviewFilesGrid(1).getByRole('row').filter({hasText: ticked});
        await expect(fileRow).toHaveCount(1);
        await expect(fileRow).toContainText(/(\d{4}-\d{2}-\d{2}|[A-Z][a-z]+ \d{1,2}, \d{4})/);
        await expect(fileRow).toContainText('Book Manuscript');
        const fileHref = await wizard.reviewFileLink(1, ticked).getAttribute('href');
        const download = await wizard.downloadReviewFile(1, ticked);
        expect(download.suggestedFilename()).toBeTruthy();

        // The same list heads step 3, and its name downloads there too.
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await wizard.continueToStep3();
        await wizard.expectReviewFilesSettled(3);
        await expect(wizard.reviewFileLink(3, ticked)).toBeVisible();
        await expect(wizard.reviewFileLink(3, unticked)).toHaveCount(0);
        const stepThreeDownload = await wizard.downloadReviewFile(3, ticked);
        expect(stepThreeDownload.suggestedFilename()).toBeTruthy();

        // The editor's download: the Section Editor assigned to the
        // monograph opens the same link and the file downloads (the
        // navigation itself ends in the download, screen notes ccK2).
        const anaPage = await (await asUser(ANA)).newPage();
        const [anaDownload] = await Promise.all([
            anaPage.waitForEvent('download', {timeout: 30_000}),
            anaPage.goto(fileHref).catch(() => null),
        ]);
        expect(anaDownload.suggestedFilename()).toBeTruthy();
    });

    test('S5: save a review for later', async ({ompApi, asUser, pkpMail, browser, baseURL}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s5');
        const controlTag = makeTag(testInfo, 'u28s5c');
        const shared = `Shared draft ${tag}`;
        const priv = `Private draft ${tag}`;
        // A scratch press: the "Your changes have been saved." toast is
        // server-fed per user, and a roster reviewer's queue is shared with
        // every parallel test signed in as them (patterns.md, parallel
        // lesson 2); the throwaway reviewer's queue is this test's alone.
        const reviewer = `rv${tag}`;
        const controlReviewer = `rc${tag}`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [
                    {username: reviewer, roles: ['externalReviewer'], givenName: `Rv${tag}`, familyName: 'Reviewer'},
                    {username: controlReviewer, roles: ['externalReviewer'], givenName: `Rc${tag}`, familyName: 'Reviewer'},
                ],
            })),
        };
        const seeded = await seedScratchMonograph(ompApi, tag, press, {
            reviewers: [{username: reviewer, status: 'accepted'}],
        });
        const control = await seedScratchMonograph(ompApi, controlTag, press, {
            reviewers: [{username: controlReviewer, status: 'accepted'}],
        });

        const page = await (await asUser(reviewer)).newPage();
        const {wizard} = reviewerScreens(page, tag);
        await walkToStep3(wizard, seeded.submissionId);
        await expect(page.getByText(PRIVATE_BOX).first()).toBeVisible();
        await wizard.typeComments(shared);
        await wizard.typePrivateComments(priv);

        // "Cancel" on the confirmation leaves step 3 as it was, both texts
        // still in their boxes.
        const confirm = await wizard.pressSubmitReview();
        await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(confirm).toBeHidden({timeout: 30_000});
        await wizard.expectStep(3);
        await expect(wizard.commentsBody).toContainText(shared);
        await expect(wizard.privateCommentsBody).toContainText(priv);

        // "Save for Later": the toast, and the step stays.
        await wizard.saveForLater();
        await wizard.expectStep(3);
        await expect(wizard.submitReviewButton).toBeVisible();

        // Signed in again (a fresh context at the press's Login page): the
        // row still reads the accepted wording with "Finish review" and the
        // wizard opens on step 3 with both texts restored.
        const fresh = await anonymousPage(browser, baseURL);
        await signInAtContext(fresh, tag, reviewer, getPassword(reviewer));
        const {list: freshList, wizard: freshWizard} = reviewerScreens(fresh, tag);
        await freshList.goto('actionRequired');
        const row = freshList.row(tag);
        await expect(row).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
        await expect(freshList.rowAction(row, 'Finish review')).toBeVisible();
        await freshList.openWizard(row, 'Finish review');
        await freshWizard.expectOpen(titleFor(tag));
        await freshWizard.expectStep(3);
        await expect(freshWizard.commentsBody).toContainText(shared);
        await expect(freshWizard.privateCommentsBody).toContainText(priv);

        // Control: the editor's row still reads "Request Accepted"…
        const editorPage = await (await asUser(press.manager)).newPage();
        const modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await expect(reviewerRow(modal, `Rv${tag} Reviewer`)).toContainText('Request Accepted');

        // …and no review-complete email went out (bounded by a positive
        // control: the other reviewer's submitted review on another
        // monograph of the same press).
        const controlPage = await (await asUser(controlReviewer)).newPage();
        await completeReview(controlPage, tag, control.submissionId, {comment: `Control ${controlTag}`});
        // (The scope is the title phrase: the press's name and the editor's
        // own address carry the tag, so the bare tag would match every mail.)
        await pkpMail.expectNone({
            to: press.editorEmail,
            subject: 'Review complete',
            contains: titleFor(tag),
            afterControl: {to: press.editorEmail, subject: 'Review complete', contains: titleFor(controlTag)},
        });
    });

    test('S6: submit a free-form review', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s6');
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}]);

        // Before the submit, the reviewer's header "Tasks" panel holds
        // "Review pending." for the monograph (the control for its clearing).
        const page = await (await asUser(JULIA)).newPage();
        const {list, wizard} = reviewerScreens(page, PK);
        await list.goto('actionRequired');
        let tasks = await openTasksPanel(page);
        await expect(taskRow(tasks, titleFor(tag))).toContainText('Review pending.');
        await closeTopModal(page);

        // Step 3 shows, in order: the "Review Files" list, "Review" with its
        // two boxes, "Upload" with "Reviewer Files" reading "No Files", the
        // "Review Tasks & Discussions" panel with its "Add", and last the
        // "Go Back" link and the two buttons.
        await walkToStep3(wizard, seeded.submissionId);
        await wizard.expectReviewFilesSettled(3);
        await wizard.expectReviewerFilesSettled();
        await expect(discussionsPanel(page, 3).getByText('Review Tasks & Discussions')).toBeVisible({timeout: 30_000});
        await expect(discussionsPanel(page, 3).getByRole('button', {name: 'Add', exact: true})).toBeVisible();
        await expect(wizard.goBackLink).toBeVisible();
        const stepText = await page.locator('main').innerText();
        const order = positions(stepText, [
            'Review Files',
            'Enter (or paste) your review of this submission into the form below.',
            'For author and editor',
            PRIVATE_BOX,
            'Upload files you would like the editor and/or author to consult',
            'Reviewer Files',
            'No Files',
            'Review Tasks & Discussions',
            'Go Back',
            'Save for Later',
            'Submit Review',
        ]);
        expect(order.every((i) => i >= 0)).toBe(true);

        // The submit: "4. Completion" with "Review Submitted", the thank-you
        // text and the discussions panel under them.
        await wizard.typeComments(`Review text ${tag}`);
        await wizard.typePrivateComments(`Private ${tag}`);
        await wizard.submitReview();
        await wizard.expectCompleted();
        const stepFour = page.getByRole('tabpanel', {name: '4. Completion'});
        await expect(stepFour).toContainText(THANK_YOU);
        await expect(discussionsPanel(page, 4).getByText('Review Tasks & Discussions')).toBeVisible({timeout: 30_000});
        await expect(discussionsPanel(page, 4).getByRole('button', {name: 'Add', exact: true})).toBeVisible();

        // All four tabs open; step 3's buttons are disabled.
        for (const step of [1, 2, 3, 4]) {
            await wizard.expectTabEnabled(step);
        }
        await wizard.goto(seeded.submissionId, {step: 3});
        await expect(wizard.submitReviewButton).toBeDisabled();
        await expect(wizard.saveForLaterButton).toBeDisabled();

        // The row reads "Review submitted on {date}" with "View", under
        // "Completed"; "View" opens the wizard on "4. Completion".
        await list.goto('completed');
        const row = list.row(tag);
        await expect(row).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(row, 'View')).toBeVisible();
        await list.openWizard(row, 'View');
        await wizard.expectOpen(titleFor(tag));
        await wizard.expectStep(4);

        // The reviewer's "Review pending." task is gone (bounded by the
        // panel's own table).
        await list.goto('completed');
        tasks = await openTasksPanel(page);
        await expect(taskRow(tasks, titleFor(tag))).toHaveCount(0);

        // The assigned editor's mailbox holds "Review complete: …" (its
        // "recommends None" subject is register finding OMP2, unasserted).
        await pkpMail.find({to: getEmail(ANA), subject: 'Review complete', contains: tag});

        // The Section Editor's header "Tasks" panel gains no entry for it
        // (bounded by the panel's own table); the Reviewers panel row reads
        // "Review Submitted", and the activity log records the completion.
        const anaPage = await (await asUser(ANA)).newPage();
        await anaPage.goto(`/index.php/${PK}/dashboard/editorial`);
        const anaTasks = await openTasksPanel(anaPage);
        await expect(anaTasks.getByText(tag)).toHaveCount(0);
        await closeTopModal(anaPage);
        const modal = await openEditorial(anaPage, PK, seeded.submissionId);
        await expect(reviewerRow(modal, 'Julia Reviewer')).toContainText('Review Submitted');
        const log = await openActivityLog(anaPage);
        await expect(
            activityLogRow(
                log,
                `The round 1 review assigned to Julia Reviewer for submission ${seeded.submissionId} has been completed.`
            )
        ).toBeVisible();
    });

    test('S7: nothing stops an empty review', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s7');
        const controlTag = makeTag(testInfo, 'u28s7c');
        const fileName = `${controlTag}.txt`;
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}]);
        const control = await seedExternal(ompApi, controlTag, [{username: PAUL, status: 'accepted'}]);

        // Nothing typed, no file: the confirmation appears at once with no
        // field marked, and "OK" submits (Rule 13, as scenario 7
        // prescribes).
        const page = await (await asUser(JULIA)).newPage();
        const {wizard} = reviewerScreens(page, PK);
        await walkToStep3(wizard, seeded.submissionId);
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.reviewerFilesGrid).toContainText('No Files');
        const confirm = await wizard.pressSubmitReview();
        await expect(page.locator('label.error')).toHaveCount(0);
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await wizard.expectCompleted();
        await pkpMail.find({to: getEmail(ANA), subject: 'Review complete', contains: tag});

        // "Upload File" on the second request: the wizard opens with its
        // three tabs and asks no file-type question (control: no component
        // list, unlike the submission's own upload); the file then lists
        // under "Reviewer Files" with "Edit" and "Delete" in place of "No
        // Files".
        const paulPage = await (await asUser(PAUL)).newPage();
        const {wizard: paulWizard} = reviewerScreens(paulPage, PK);
        await walkToStep3(paulWizard, control.submissionId);
        await paulWizard.expectReviewerFilesSettled();
        await expect(paulWizard.reviewerFilesGrid).toContainText('No Files');
        await paulWizard.uploadFileLink.click();
        const upload = paulPage
            .getByRole('dialog')
            .filter({has: paulPage.getByRole('tab', {name: '1. Upload File'})});
        await expect(upload.getByRole('tab', {name: '1. Upload File'})).toBeVisible({timeout: 30_000});
        await expect(upload.getByRole('tab', {name: '2. Review Details'})).toBeVisible();
        await expect(upload.getByRole('tab', {name: '3. Confirm'})).toBeVisible();
        await expect(paulPage.locator('input[type="file"]').last()).toBeAttached();
        await expect(upload.locator('select[id^="genreId"]')).toHaveCount(0);
        await paulPage.locator('input[type="file"]').last().setInputFiles({
            name: fileName,
            mimeType: 'text/plain',
            buffer: Buffer.from(`Reviewer file ${fileName}`),
        });
        await expect(upload.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 30_000});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(upload.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(upload.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await upload.getByRole('button', {name: 'Complete', exact: true}).click();
        await expect(upload).toBeHidden({timeout: 30_000});
        const fileRow = paulWizard.reviewerFileRow(fileName);
        await expect(fileRow).toBeVisible({timeout: 30_000});
        // (The legacy grid keeps a hidden empty-state row, so "No Files" is
        // read as hidden, not absent.)
        await expect(paulWizard.reviewerFilesGrid.getByText('No Files')).toBeHidden();
        await fileRow.locator('a.show_extras').click();
        await expect(paulWizard.reviewerFilesGrid.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(paulWizard.reviewerFilesGrid.getByRole('link', {name: 'Delete', exact: true})).toBeVisible();

        // A file alone, the boxes still empty, submits the same way.
        await paulWizard.submitReview();
        await paulWizard.expectCompleted();

        // The editor's "Review Details" window for the second monograph
        // lists the uploaded file under "Reviewer Files" (a late render,
        // screen notes ccK3: the file name is the bound).
        const anaPage = await (await asUser(ANA)).newPage();
        const modal = await openEditorial(anaPage, PK, control.submissionId);
        const details = await openReadReview(anaPage, modal, 'Paul Reviewer');
        await expect(details).toContainText('Reviewer Files');
        await expect(details).toContainText(fileName, {timeout: 30_000});
    });

    test('S8: a review form instead of free text', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s8');
        const formTitle = `Form ${tag}`;
        const formDescription = `Form description ${tag}`;
        const radioQuestion = `Is the work sound ${tag}`;
        const textQuestion = `Which figures need work ${tag}`;
        const checkboxQuestion = `Which parts need work ${tag}`;
        const dropdownQuestion = `Which field is this ${tag}`;
        const textAnswer = 'Two figures are unlabeled.';
        const reviewer = `rv${tag}`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [{username: reviewer, roles: ['externalReviewer'], givenName: `Rv${tag}`, familyName: 'Reviewer'}],
                reviewForms: [
                    {
                        title: formTitle,
                        description: formDescription,
                        elements: [
                            {question: radioQuestion, type: 'radiobuttons', required: true, options: ['Yes', 'No']},
                            {question: textQuestion, type: 'textfield'},
                            {question: checkboxQuestion, type: 'checkboxes', options: ['Figures', 'Tables']},
                            {question: dropdownQuestion, type: 'dropdownbox', options: ['Biology', 'Physics']},
                        ],
                    },
                ],
            })),
        };
        const seeded = await seedScratchMonograph(ompApi, tag, press, {
            reviewers: [{username: reviewer, status: 'accepted', reviewForm: formTitle}],
        });

        const page = await (await asUser(reviewer)).newPage();
        const {wizard} = reviewerScreens(page, tag);
        const form = reviewFormControls(page);
        await walkToStep3(wizard, seeded.submissionId);

        // The form's title, description and its four questions replace the
        // two text boxes: the radio group marked "*", the text box, the
        // checkbox group and the drop-down, each as the form defines it.
        await expect(page.getByText(formTitle).first()).toBeVisible();
        await expect(page.getByText(formDescription).first()).toBeVisible();
        // (Sections nest: the form's own section wraps every question, so the
        // LAST match is the question's own.)
        const radioSection = page.locator('#reviewStep3Form .section').filter({hasText: radioQuestion}).last();
        await expect(radioSection).toContainText('*');
        await expect(radioSection.locator('fieldset[role="radiogroup"]')).toBeVisible();
        await expect(wizard.formRadio('Yes')).toBeVisible();
        await expect(wizard.formRadio('No')).toBeVisible();
        for (const question of [textQuestion, checkboxQuestion, dropdownQuestion]) {
            const section = page.locator('#reviewStep3Form .section').filter({hasText: question}).last();
            await expect(section).toBeVisible();
            await expect(section).not.toContainText('*');
        }
        await expect(form.textBox).toHaveCount(1);
        await expect(form.checkbox('Figures')).toBeVisible();
        await expect(form.checkbox('Tables')).toBeVisible();
        await expect(form.select).toHaveCount(1);
        await expect(form.select.locator('option')).toContainText(['Biology', 'Physics']);

        // Control: neither free-text box is on the step.
        await expect(page.locator('iframe[id^="comments"]')).toHaveCount(0);
        await expect(page.getByText('For author and editor')).toHaveCount(0);
        await expect(page.getByText(PRIVATE_BOX)).toHaveCount(0);

        // Unanswered: the confirmation first, then the refusal box under the
        // buttons (its first line is register finding OMP3, unasserted), the
        // step stays (whether the question is marked is not judged: A16).
        await wizard.submitReview();
        await expect(wizard.messageBox).toContainText(
            'Some required fields are not filled in. Please complete them before submitting your review.'
        );
        await wizard.expectStep(3);
        await expect(wizard.submitReviewButton).toBeVisible();
        await expect(wizard.formRadio('Yes')).not.toBeChecked();
        await expect(wizard.formRadio('No')).not.toBeChecked();

        // "Save for Later" with the three other questions answered and the
        // radio group open: the toast; after a reload the three answers are
        // restored and the radio group is still unanswered.
        await form.textBox.fill(textAnswer);
        await form.checkbox('Figures').check();
        await form.select.selectOption({label: 'Biology'});
        await wizard.saveForLater();
        await wizard.goto(seeded.submissionId, {step: 3});
        await wizard.expectStep(3);
        await expect(form.textBox).toHaveValue(textAnswer);
        await expect(form.checkbox('Figures')).toBeChecked();
        await expect(form.checkbox('Tables')).not.toBeChecked();
        await expect(form.select.locator('option:checked')).toHaveText('Biology');
        await expect(wizard.formRadio('Yes')).not.toBeChecked();
        await expect(wizard.formRadio('No')).not.toBeChecked();

        // Leaving with a change: another step's tab asks the browser's
        // question; "Cancel" keeps step 3 with the text as typed.
        const changed = 'Three figures are unlabeled.';
        await form.textBox.fill(changed);
        let question = null;
        page.once('dialog', async (d) => {
            question = d.message();
            await d.dismiss();
        });
        await wizard.tab(2).click();
        await expect.poll(() => question).toBe('The data on this form has changed. Do you wish to continue without saving?');
        await wizard.expectStep(3);
        await expect(form.textBox).toHaveValue(changed);

        // Answered, the submit goes through to step 4.
        await wizard.formRadio('Yes').check();
        await wizard.submitReview();
        await wizard.expectCompleted();
    });

    test('S9: restricted file access', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s9');
        const fileName = `${tag}A.txt`;
        const reviewer = `rv${tag}`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [{username: reviewer, roles: ['externalReviewer'], givenName: `Rv${tag}`, familyName: 'Reviewer'}],
                review: {restrictReviewerFileAccess: true, defaultReviewMode: 'open'},
            })),
        };
        const seeded = await seedScratchMonograph(ompApi, tag, press, {
            reviewers: [{username: reviewer, status: 'invited'}],
        });

        // The editor puts one file on the round and ticks it for the reviewer.
        const editorPage = await (await asUser(press.manager)).newPage();
        const modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await uploadRoundReviewFile(editorPage, modal, fileName);
        await grantFileToReviewer(editorPage, reviewerRow(modal, `Rv${tag} Reviewer`), fileName);

        // Step 1 shows no "Review Files" list at all (bounded by the step's
        // other content); "Review Type" reads "Open", and the details
        // window names the authors with the title and the abstract.
        // Controls: scenario 4 (the setting off) and scenario 2 (the
        // anonymous window naming no authors) on the seeded press.
        const page = await (await asUser(reviewer)).newPage();
        const {list, wizard} = reviewerScreens(page, tag);
        await wizard.goto(seeded.submissionId);
        await expect(page.getByText('Review Type', {exact: true})).toBeVisible();
        await expect(page.locator('main')).not.toContainText('Loading');
        await expect(page.getByRole('heading', {name: 'Review Files'})).toHaveCount(0);
        await expect(wizard.reviewFilesGrid(1)).toHaveCount(0);
        // (The type is a bare text node after the "Review Type" label.)
        expect(await wizard.step1Value('Review Type')).toBe('Open');
        const details = await wizard.openSubmissionDetails();
        await expect(details).toContainText(titleFor(tag));
        await expect(details).toContainText(`Seeded abstract for ${tag}.`);
        await expect(details.getByText('Authors', {exact: true})).toBeVisible();
        await expect(details).toContainText(`Au${tag} Author`);
        await wizard.closeDialog(details);

        // After accepting, step 3 lists the file and it downloads.
        await wizard.accept();
        await wizard.continueToStep3();
        await wizard.expectReviewFilesSettled(3);
        await expect(wizard.reviewFileLink(3, fileName)).toBeVisible();
        const download = await wizard.downloadReviewFile(3, fileName);
        expect(download.suggestedFilename()).toBeTruthy();

        // "Filters" on a bare press (no categories): the window offers "Days
        // since last activity" alone, with "Clear Filters" and "Apply
        // Filters".
        await list.goto('actionRequired');
        const filters = await openFilters(page, list);
        await expect(filters.getByText('Days since last activity')).toBeVisible();
        await expect(filters.getByText('Categories', {exact: true})).toHaveCount(0);
        await expect(filters.getByText('Section', {exact: true})).toHaveCount(0);
        await expect(filters.getByText('Issues', {exact: true})).toHaveCount(0);
        await expect(filters.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
        await closeFilters(page, filters);
    });

    test('S10: one-click access', async ({ompApi, asUser, pkpMail, browser, baseURL}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s10');
        const controlTag = makeTag(testInfo, 'u28s10c');
        const reviewer = `rv${tag}`;
        const reviewerEmail = `${tag}rv@mail.test`;
        const contactEmail = `${tag}pc@mail.test`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [{username: reviewer, roles: ['externalReviewer'], givenName: `Rv${tag}`, familyName: 'Reviewer', email: reviewerEmail}],
                review: {reviewerAccessKeysEnabled: true},
                context: {contactName: `Contact ${tag}`, contactEmail},
            })),
        };
        // Nobody is assigned to the monograph: the acceptance goes to the
        // press's principal contact.
        const seeded = await seedScratchMonograph(ompApi, tag, press, {participants: []});

        // Only the editor's "Add Reviewer" window sends the request email
        // (seed-facts), so the reviewer is added through it.
        const editorPage = await (await asUser(press.manager)).newPage();
        let modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await addReviewerFromList(editorPage, modal, {search: `Rv${tag}`, name: `Rv${tag} Reviewer`});
        const mail = await pkpMail.find({to: reviewerEmail, subject: 'Manuscript Review Request'});
        const link = oneClickLink((await pkpMail.fullMessage(mail.ID)).HTML);
        expect(link).toContain('/invitation/accept');

        // A signed-out browser lands on the wizard with the reviewer signed
        // in; a second signed-out browser lands there again; the first
        // browser, still signed in as the reviewer, lands there once more.
        const first = await anonymousPage(browser, baseURL);
        await first.goto(link);
        const {list: firstList, wizard: firstWizard} = reviewerScreens(first, tag);
        await firstWizard.expectOpen(titleFor(tag));
        await firstWizard.expectStep(1);
        await expect(firstWizard.acceptButton).toBeVisible();
        await expect(first.getByRole('button', {name: new RegExp(reviewer)})).toBeVisible();

        const second = await anonymousPage(browser, baseURL);
        await second.goto(link);
        const {wizard: secondWizard} = reviewerScreens(second, tag);
        await secondWizard.expectOpen(titleFor(tag));
        await expect(secondWizard.acceptButton).toBeVisible();

        await first.goto(link);
        await firstWizard.expectOpen(titleFor(tag));
        await expect(firstWizard.acceptButton).toBeVisible();

        // Response overdue: the manager moves "Response Due Date" into the
        // past through the row's "Edit" window (on a fresh load of the
        // workflow: the calendar the Add Reviewer window initialised sits
        // under a later window); the reviewer's row reads the overdue
        // wording with "Respond to request".
        modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await moveDueDate(editorPage, reviewerRow(modal, `Rv${tag} Reviewer`), 'responseDueDate', daysFromNow(-1));
        await firstList.goto('actionRequired');
        const overdueRow = firstList.row(tag);
        await expect(overdueRow).toContainText(RESPONSE_OVERDUE);
        await expect(firstList.rowAction(overdueRow, 'Respond to request')).toBeVisible();

        // A reminder's link: the manager sends the row's "Send Reminder";
        // the reminder email carries its own link, which lands a signed-out
        // browser on the wizard. (The request link's death is register
        // finding A9, unasserted; every later open uses the reminder's.)
        modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await sendReminder(editorPage, reviewerRow(modal, `Rv${tag} Reviewer`));
        const reminder = await pkpMail.find({to: reviewerEmail, subject: 'A reminder to please complete your review'});
        const reminderLink = oneClickLink((await pkpMail.fullMessage(reminder.ID)).HTML);
        expect(reminderLink).toContain('/invitation/accept');
        expect(reminderLink).not.toBe(link);
        const third = await anonymousPage(browser, baseURL);
        await third.goto(reminderLink);
        const {list: thirdList, wizard: thirdWizard} = reviewerScreens(third, tag);
        await thirdWizard.expectOpen(titleFor(tag));
        await thirdWizard.expectStep(1);
        await expect(thirdWizard.acceptButton).toBeVisible();

        // The acceptance: the press's principal contact's mailbox holds
        // "Review accepted: …", nobody being assigned to the monograph.
        await thirdWizard.accept();
        await pkpMail.find({to: contactEmail, subject: 'Review accepted', contains: titleFor(tag)});

        // Review overdue: the manager moves "Review Due Date" into the past
        // the same way (to the response date's day: the window refuses an
        // earlier one); the row reads the overdue wording with "Finish
        // review".
        modal = await openEditorial(editorPage, tag, seeded.submissionId);
        await moveDueDate(editorPage, reviewerRow(modal, `Rv${tag} Reviewer`), 'reviewDueDate', daysFromNow(-1));
        await thirdList.goto('actionRequired');
        const lateRow = thirdList.row(tag);
        await expect(lateRow).toContainText(REVIEW_OVERDUE);
        await expect(thirdList.rowAction(lateRow, 'Finish review')).toBeVisible();

        // The link after the submit: the review is submitted; the reminder's
        // link then shows "Invitation Unavailable".
        await thirdWizard.goto(seeded.submissionId);
        await thirdWizard.expectStep(2);
        await thirdWizard.continueToStep3();
        await thirdWizard.typeComments(`Review ${tag}`);
        await thirdWizard.submitReview();
        await thirdWizard.expectCompleted();
        const fourth = await anonymousPage(browser, baseURL);
        await fourth.goto(reminderLink);
        await expect(fourth.getByText('Invitation Unavailable').first()).toBeVisible({timeout: 30_000});

        // Control: with the setting off (the seeded press), the request
        // email's link is the plain wizard address: the Login page first,
        // then the wizard.
        const control = await seedExternal(ompApi, controlTag);
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const controlModal = await openEditorial(mayaPage, PK, control.submissionId);
        await addReviewerFromList(mayaPage, controlModal, {search: 'Julia', name: 'Julia Reviewer'});
        const controlMail = await pkpMail.find({
            to: getEmail(JULIA),
            subject: 'Manuscript Review Request',
            contains: controlTag,
        });
        const plainLink = pkpMail.extractLink((await pkpMail.fullMessage(controlMail.ID)).HTML, titleFor(controlTag));
        expect(plainLink).toContain('/reviewer/submission');
        expect(plainLink).not.toContain('/invitation/');
        const fifth = await anonymousPage(browser, baseURL);
        await fifth.goto(plainLink);
        const login = new LoginPage(fifth);
        await expect(login.usernameInput).toBeVisible({timeout: 30_000});
        await login.signIn(JULIA, getPassword(JULIA));
        await fifth.waitForURL(/\/reviewer\/submission/, {waitUntil: 'commit'});
        const {wizard: fifthWizard} = reviewerScreens(fifth, PK);
        await fifthWizard.expectOpen(titleFor(controlTag));
    });

    test("S11: read an earlier round's review", async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s11');
        const unfinishedTag = makeTag(testInfo, 'u28s11u');
        const declinedTag = makeTag(testInfo, 'u28s11d');
        const roundOneText = `Roundone ${tag}`;
        const reason = `Reason${tag}`;
        // First: Julia's round-1 review submitted, Julia asked again on round
        // 2. Second: Julia accepted round 1 and never finished, asked again
        // on round 2. Third: Paul invited on round 1 (declining on screen:
        // an API-seeded decline stores the template unresolved, seed-facts)
        // with an empty round 2.
        const seeded = await seedExternal(ompApi, tag, [], {
            reviewRounds: [
                {stage: 'external', reviewers: [{username: JULIA, status: 'completed', comments: roundOneText}]},
                {stage: 'external', reviewers: [{username: JULIA, status: 'invited'}]},
            ],
        });
        const unfinished = await seedExternal(ompApi, unfinishedTag, [], {
            reviewRounds: [
                {stage: 'external', reviewers: [{username: JULIA, status: 'accepted'}]},
                {stage: 'external', reviewers: [{username: JULIA, status: 'invited'}]},
            ],
        });
        const declined = await seedExternal(ompApi, declinedTag, [], {
            reviewRounds: [
                {stage: 'external', reviewers: [{username: PAUL, status: 'invited'}]},
                {stage: 'external', reviewers: []},
            ],
        });

        // Paul declines round 1 with a reason; the editor asks him again on
        // round 2.
        const paulPage = await (await asUser(PAUL)).newPage();
        const {wizard: paulWizard} = reviewerScreens(paulPage, PK);
        await paulWizard.goto(declined.submissionId);
        await paulWizard.decline({appendText: reason});
        const editorPage = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(editorPage, PK, declined.submissionId);
        await expect(modal.getByRole('heading', {name: 'Workflow: External Review (Round 2)'})).toBeVisible();
        await addReviewerFromList(editorPage, modal, {search: 'Paul', name: 'Paul Reviewer'});

        // Julia's round-2 wizard on the first monograph: "Previous Reviews"
        // with the dated round-1 line and no line for round 2.
        const juliaPage = await (await asUser(JULIA)).newPage();
        const {wizard} = reviewerScreens(juliaPage, PK);
        await wizard.goto(seeded.submissionId);
        await expect(wizard.previousReviewLine(1)).toHaveText(/Round 1 Review Submitted on \d{4}-\d{2}-\d{2}/);
        await expect(wizard.previousReviewLine(2)).toHaveCount(0);
        await expect(wizard.previousReviewsBox.getByRole('button', {name: /Read Round \d+ Review/})).toHaveCount(1);

        // "Read Round 1 Review": the title; the left column with the
        // comments as "Comment 1: " under "For editors and authors"; the
        // right column with "Article Metadata" ("Abstract", no "Type": the
        // monograph is in no series) and "General Information" with its
        // five dates.
        const history = await wizard.openRoundHistory(1);
        await expect(history).toContainText('Round 1 Review submitted by you for');
        await expect(history).toContainText(titleFor(tag));
        await expect(history).toContainText('Reviewer Comments');
        await expect(history).toContainText('For editors and authors');
        await expect(history).toContainText('Comment 1:');
        await expect(history).toContainText(roundOneText);
        await expect(history).toContainText('Article Metadata');
        await expect(history).toContainText('Abstract');
        await expect(history).toContainText(`Seeded abstract for ${tag}.`);
        await expect(history.getByText('Type', {exact: true})).toHaveCount(0);
        await expect(history).toContainText('General Information');
        for (const label of ["Editor's Request", 'Response Due Date', 'Review Accepted On', 'Review Due Date', 'Review Submitted On']) {
            await expect(history).toContainText(label);
        }
        await expect(history.getByText('Recommendation', {exact: true})).toHaveCount(0);
        await wizard.closeRoundHistory(history);

        // An unfinished round: the second monograph's window reads "The
        // review was not completed." alone (no comments), with "General
        // Information" lacking "Review Submitted On". (The line's missing
        // date is register finding A2, unasserted.)
        await wizard.goto(unfinished.submissionId);
        await expect(wizard.previousReviewLine(1)).toBeVisible();
        await expect(wizard.previousReviewLine(2)).toHaveCount(0);
        const unfinishedHistory = await wizard.openRoundHistory(1);
        await expect(unfinishedHistory).toContainText('The review was not completed.');
        await expect(unfinishedHistory.getByText('Reviewer Comments')).toHaveCount(0);
        await expect(unfinishedHistory).toContainText('General Information');
        await expect(unfinishedHistory).toContainText('Review Accepted On');
        await expect(unfinishedHistory.getByText('Review Submitted On')).toHaveCount(0);
        await wizard.closeRoundHistory(unfinishedHistory);

        // A declined round: Paul's line carries the decline's date; the
        // window shows "Declined Date" and the reason under "Unable to
        // Review", and "General Information" with "Editor's Request" and
        // "Response Due Date" only.
        await paulWizard.goto(declined.submissionId);
        await expect(paulWizard.previousReviewLine(1)).toHaveText(/Round 1 Review Submitted on \d{4}-\d{2}-\d{2}/);
        await expect(paulWizard.previousReviewLine(2)).toHaveCount(0);
        const declinedHistory = await paulWizard.openRoundHistory(1);
        await expect(declinedHistory).toContainText('Declined Date');
        await expect(declinedHistory).toContainText('Decline reason sent by email');
        await expect(declinedHistory).toContainText('Unable to Review');
        await expect(declinedHistory).toContainText(reason);
        await expect(declinedHistory.getByText('Reviewer Comments')).toHaveCount(0);
        await expect(declinedHistory).toContainText('General Information');
        await expect(declinedHistory).toContainText("Editor's Request");
        await expect(declinedHistory).toContainText('Response Due Date');
        for (const label of ['Review Accepted On', 'Review Due Date', 'Review Submitted On']) {
            await expect(declinedHistory.getByText(label)).toHaveCount(0);
        }
    });

    test('S12: nothing can be saved after submission', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s12');
        const openTag = makeTag(testInfo, 'u28s12o');
        const fileName = `${tag}.txt`;
        const reviewText = `Review ${tag}`;
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}]);
        const open = await seedExternal(ompApi, openTag, [{username: JULIA, status: 'accepted'}]);

        // A submitted review carrying one reviewer file.
        const page = await (await asUser(JULIA)).newPage();
        const {list, wizard} = reviewerScreens(page, PK);
        await walkToStep3(wizard, seeded.submissionId);
        await wizard.expectReviewerFilesSettled();
        await wizard.uploadReviewerFile(fileName);
        await wizard.typeComments(reviewText);
        await wizard.submitReview();
        await wizard.expectCompleted();

        // From "View": every tab opens, nothing can be saved.
        await list.goto('completed');
        await list.openWizard(list.row(tag), 'View');
        await wizard.expectOpen(titleFor(tag));
        await wizard.expectStep(4);
        for (const step of [1, 2, 3]) {
            await wizard.expectTabEnabled(step);
        }
        await wizard.selectStep(1);
        await expect(wizard.saveAndContinueButton).toBeDisabled();
        await wizard.selectStep(2);
        await expect(wizard.continueToStep3Button).toBeDisabled();
        await wizard.goto(seeded.submissionId, {step: 3});
        await expect(wizard.submitReviewButton).toBeDisabled();
        await expect(wizard.saveForLaterButton).toBeDisabled();

        // The box still takes typing, which nothing on the step can keep:
        // after a reload the submitted text is back without it.
        await expect(wizard.commentsBody).toContainText(reviewText);
        await wizard.typeComments(' Late addition');
        await expect(wizard.commentsBody).toContainText('Late addition');
        await wizard.goto(seeded.submissionId, {step: 3});
        await expect(wizard.commentsBody).toContainText(reviewText);
        await expect(wizard.commentsBody).not.toContainText('Late addition');

        // "Reviewer Files" offers no "Upload File"; the file's row offers
        // "Edit" but no "Delete".
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.uploadFileLink).toHaveCount(0);
        const fileRow = wizard.reviewerFileRow(fileName);
        await expect(fileRow).toBeVisible();
        await fileRow.locator('a.show_extras').click();
        await expect(wizard.reviewerFilesGrid.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(wizard.reviewerFilesGrid.getByRole('link', {name: 'Delete', exact: true})).toHaveCount(0);

        // Control: the same reviewer's other, still-open assignment offers
        // all of them.
        await wizard.goto(open.submissionId);
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await expect(wizard.continueToStep3Button).toBeEnabled();
        await wizard.continueToStep3();
        await wizard.expectReviewerFilesSettled();
        await expect(wizard.uploadFileLink).toBeVisible();
        await expect(wizard.submitReviewButton).toBeEnabled();
        await expect(wizard.saveForLaterButton).toBeEnabled();
    });

    test('S13: declare competing interests', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s13');
        const controlTag = makeTag(testInfo, 'u28s13c');
        const policy = `Policy ${tag} on disclosure.`;
        const guidance = `Guidelines ${tag} for reviewers.`;
        const statement = `Statement ${tag}`;
        const reviewer = `rv${tag}`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [{username: reviewer, roles: ['externalReviewer'], givenName: `Rv${tag}`, familyName: 'Reviewer'}],
                review: {competingInterests: policy, reviewGuidelines: guidance},
            })),
        };
        const seeded = await seedScratchMonograph(ompApi, tag, press, {
            reviewers: [{username: reviewer, status: 'invited'}],
        });

        const page = await (await asUser(reviewer)).newPage();
        const {wizard} = reviewerScreens(page, tag);
        await wizard.goto(seeded.submissionId);
        await expect(page.getByText('Competing Interests').first()).toBeVisible();
        await expect(
            page.getByText(
                'This publisher has a policy for disclosure of potential competing interests from its reviewers. ' +
                    'Please take a moment to review this policy.'
            )
        ).toBeVisible();

        // The policy link opens the policy text.
        await wizard.competingInterestsLink.click();
        const policyDialog = page.getByRole('dialog').filter({hasText: policy});
        await expect(policyDialog).toBeVisible({timeout: 30_000});
        await wizard.closeDialog(policyDialog);

        // "I do not have any competing interests" is preselected; choosing
        // the other reveals the statement box.
        await expect(wizard.noCompetingInterestsRadio).toBeChecked();
        await expect(wizard.hasCompetingInterestsRadio).not.toBeChecked();
        await expect(page.locator('iframe[id^="reviewerCompetingInterests"]')).toBeHidden();
        await wizard.hasCompetingInterestsRadio.check();
        await expect(wizard.competingInterestsBody).toBeVisible({timeout: 30_000});
        await wizard.typeInto(wizard.competingInterestsBody, statement);
        await wizard.accept();

        // The editor's row carries the "Competing Interests" badge.
        const editorPage = await (await asUser(press.manager)).newPage();
        let modal = await openEditorial(editorPage, tag, seeded.submissionId);
        let row = reviewerRow(modal, `Rv${tag} Reviewer`);
        await expect(row).toContainText('Request Accepted');
        await expect(row).toContainText('Competing Interests');

        // The guidelines: step 2 shows the press's "Review Guidelines" text;
        // step 3 shows "Reviewer Guidelines" with the link "Review
        // Guidelines", which opens the same text in a dialog of that name.
        await wizard.expectStep(2);
        await expect(page.getByText(guidance)).toBeVisible();
        await expect(page.getByText('This publisher has not set any reviewer guidelines.')).toHaveCount(0);
        await wizard.continueToStep3();
        await expect(page.locator('#reviewStep3').getByText('Reviewer Guidelines', {exact: true})).toBeVisible();
        await expect(wizard.guidelinesLink).toHaveText('Review Guidelines');
        await wizard.guidelinesLink.click();
        const guidelinesDialog = page.getByRole('dialog').filter({hasText: guidance});
        await expect(guidelinesDialog).toBeVisible({timeout: 30_000});
        await expect(guidelinesDialog.getByRole('heading', {name: 'Review Guidelines'})).toBeVisible();
        await wizard.closeDialog(guidelinesDialog);

        // The statement discarded: step 1 revisited (a typed `?step=1`: the
        // tab's own click swaps its panel a beat after the click, and a
        // radio ticked before the swap is lost) keeps the choice and the
        // statement; "I do not have any competing interests" saved with
        // "Save and continue" drops the badge (bounded by the row's status).
        await wizard.goto(seeded.submissionId, {step: 1});
        await wizard.expectStep(1);
        await expect(wizard.hasCompetingInterestsRadio).toBeChecked();
        await expect(wizard.competingInterestsBody).toContainText(statement);
        await wizard.noCompetingInterestsRadio.check();
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        modal = await openEditorial(editorPage, tag, seeded.submissionId);
        row = reviewerRow(modal, `Rv${tag} Reviewer`);
        await expect(row).toContainText('Request Accepted');
        await expect(row.getByText('Competing Interests')).toHaveCount(0);

        // Control: on the seeded press (no policy, no guidelines) step 1 has
        // no "Competing Interests" section (bounded by the step's "Review
        // Type" line) and step 3 no "Review Guidelines" link (bounded by the
        // review boxes).
        const control = await seedExternal(ompApi, controlTag, [{username: JULIA, status: 'accepted'}]);
        const juliaPage = await (await asUser(JULIA)).newPage();
        const {wizard: juliaWizard} = reviewerScreens(juliaPage, PK);
        await juliaWizard.goto(control.submissionId);
        await expect(juliaPage.getByText('Review Type', {exact: true})).toBeVisible();
        await expect(juliaPage.getByText('Competing Interests')).toHaveCount(0);
        await expect(juliaWizard.noCompetingInterestsRadio).toHaveCount(0);
        await juliaWizard.saveAndContinueButton.click();
        await juliaWizard.expectStep(2);
        await expect(juliaPage.getByText('This publisher has not set any reviewer guidelines.')).toBeVisible();
        await juliaWizard.continueToStep3();
        await expect(juliaWizard.commentsBody).toBeVisible();
        await expect(juliaWizard.guidelinesLink).toHaveCount(0);
        await expect(juliaPage.locator('#reviewStep3').getByText('Reviewer Guidelines', {exact: true})).toHaveCount(0);
    });

    test('S14: left behind when the submission moves on', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s14');
        const controlTag = makeTag(testInfo, 'u28s14c');
        const publishedTag = makeTag(testInfo, 'u28s14p');
        // A seeded acceptance on a monograph the editor has since sent on to
        // Copyediting (the API's promote-from-review decision is `accept`).
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}], {
            decisions: ['skipInternalReview', 'accept'],
        });
        // A submitted review on a third, published monograph.
        await seedExternal(ompApi, publishedTag, [{username: JULIA, status: 'completed'}], {published: true});
        // Control: a submitted review on another monograph in Copyediting.
        const control = await seedExternal(ompApi, controlTag, [{username: JULIA, status: 'accepted'}]);
        const page = await (await asUser(JULIA)).newPage();
        await completeReview(page, PK, control.submissionId, {comment: `Control ${controlTag}`});
        const editorPage = await (await asUser('manager.maya')).newPage();
        const controlModal = await openEditorial(editorPage, PK, control.submissionId);
        await decisionButton(controlModal, 'Accept Submission').click();
        await expect(editorPage.getByRole('heading', {level: 1, name: /Accept Submission/})).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(editorPage);

        // The unfinished one reads "Incomplete" with no button, under
        // "Archived" only.
        const {list, wizard} = reviewerScreens(page, PK);
        await list.goto('archived');
        const row = list.row(tag);
        await expect(row).toContainText('Incomplete');
        await expect(list.rowActions(row)).toHaveCount(0);
        await list.expectInViews(tag, ['archived']);

        // The wizard address still opens on "1. Request" with "Save and
        // continue" enabled and nothing saying the round is over (register
        // question A11; scenario 14 drives it through as written).
        await wizard.goto(seeded.submissionId);
        await wizard.expectStep(1);
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await wizard.continueToStep3();
        await wizard.typeComments(`Late review ${tag}`);
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The row now sits under "Completed" with "View", no longer under
        // "Archived".
        await list.goto('completed');
        const completedRow = list.row(tag);
        await expect(completedRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(completedRow, 'View')).toBeVisible();
        await list.goto('archived');
        await expect(list.row(tag)).toHaveCount(0);

        // "Published": the published monograph's row reads "Review submitted
        // on {date}" with "View", under "Published" and under neither
        // "Completed" nor "All assignments".
        await list.goto('published');
        const publishedRow = list.row(publishedTag);
        await expect(publishedRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(publishedRow, 'View')).toBeVisible();
        await list.expectInViews(publishedTag, ['published']);

        // Control: the submitted review on the other monograph in Copyediting
        // keeps its "View" under "Completed".
        await list.goto('completed');
        const controlRow = list.row(controlTag);
        await expect(controlRow).toContainText(/Review submitted on \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(controlRow, 'View')).toBeVisible();
    });

    test('S15: two stages, no recommendation ({OMP})', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s15');
        const externalTag = makeTag(testInfo, 'u28s15x');
        const internalGuidance = `Internal guidance ${tag}`;
        const externalGuidance = `External guidance ${tag}`;
        const internalReviewer = `ir${tag}`;
        const externalReviewer = `er${tag}`;
        const press = {
            path: tag,
            ...(await seedScratchPress(ompApi, tag, {
                users: [
                    {username: internalReviewer, roles: ['internalReviewer'], givenName: `Ir${tag}`, familyName: 'Reviewer'},
                    {username: externalReviewer, roles: ['externalReviewer'], givenName: `Er${tag}`, familyName: 'Reviewer'},
                ],
                review: {internalReviewGuidelines: internalGuidance, reviewGuidelines: externalGuidance},
            })),
        };
        const internal = await seedScratchMonograph(ompApi, tag, press, {
            stage: 'internal',
            reviewers: [{username: internalReviewer, status: 'accepted'}],
        });
        const external = await seedScratchMonograph(ompApi, externalTag, press, {
            stage: 'external',
            reviewers: [{username: externalReviewer, status: 'accepted'}],
        });

        // Internal Review: step 2 shows the press's "Internal Review
        // Guidelines"; step 3 has no "Recommendation" list (OMP1) and its
        // "Review Guidelines" link opens the internal text in a dialog.
        const page = await (await asUser(internalReviewer)).newPage();
        const {wizard} = reviewerScreens(page, tag);
        await wizard.goto(internal.submissionId);
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await expect(page.getByText(internalGuidance)).toBeVisible();
        await expect(page.getByText(externalGuidance)).toHaveCount(0);
        await wizard.continueToStep3();
        await expect(page.getByText(PRIVATE_BOX).first()).toBeVisible();
        await expect(wizard.commentsBody).toBeVisible();
        await expect(page.getByText(/Recommendation/)).toHaveCount(0);
        await expect(wizard.recommendationSelect).toHaveCount(0);
        await wizard.guidelinesLink.click();
        const guidelinesDialog = page.getByRole('dialog').filter({hasText: internalGuidance});
        await expect(guidelinesDialog).toBeVisible({timeout: 30_000});
        await expect(guidelinesDialog).not.toContainText(externalGuidance);
        await wizard.closeDialog(guidelinesDialog);
        await wizard.typeComments(`Internal review ${tag}`);
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The "Review complete" email reaches the stage's editor (its
        // "recommends None" subject is register finding OMP2, unasserted).
        await pkpMail.find({to: press.editorEmail, subject: 'Review complete', contains: titleFor(tag)});

        // External Review: step 2 shows the "External Review Guidelines".
        const externalPage = await (await asUser(externalReviewer)).newPage();
        const {wizard: externalWizard} = reviewerScreens(externalPage, tag);
        await externalWizard.goto(external.submissionId);
        await externalWizard.saveAndContinueButton.click();
        await externalWizard.expectStep(2);
        await expect(externalPage.getByText(externalGuidance)).toBeVisible();
        await expect(externalPage.getByText(internalGuidance)).toHaveCount(0);
    });

    test('S18: who is refused', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u28s18');
        const controlTag = makeTag(testInfo, 'u28s18c');
        const seeded = await seedExternal(ompApi, tag, [{username: JULIA, status: 'accepted'}]);
        const control = await seedExternal(ompApi, controlTag, [{username: JULIA, status: 'accepted'}]);
        const page = await (await asUser(JULIA)).newPage();
        const {list, wizard} = reviewerScreens(page, PK);
        const listUrl = list.url('actionRequired');

        // The Author: no "My Assignments as Reviewer" group (the sidebar's
        // own author group bounds the read); the list's typed address shows
        // the access-denied page; the wizard address reads the same message.
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${PK}/dashboard/mySubmissions`);
        const authorSidebar = authorPage.getByRole('navigation', {name: 'Site Navigation'});
        await expect(authorSidebar.getByRole('region', {name: 'My Submissions as Author'})).toBeVisible({timeout: 30_000});
        await expect(authorSidebar.getByRole('region', {name: 'My Assignments as Reviewer'})).toHaveCount(0);
        await authorPage.goto(listUrl);
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await expect(authorPage.getByRole('heading', {name: /^Action Required by me/})).toHaveCount(0);
        await authorPage.goto(wizard.url(seeded.submissionId));
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await expect(authorPage.getByRole('heading', {name: /^Review: /, level: 1})).toHaveCount(0);

        // The Section Editor: the same wizard address reads the same message.
        const anaPage = await (await asUser(ANA)).newPage();
        await anaPage.goto(wizard.url(seeded.submissionId));
        await expect(anaPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await expect(anaPage.getByRole('heading', {name: /^Review: /, level: 1})).toHaveCount(0);

        // The editor cancels the accepted assignment.
        const modal = await openEditorial(anaPage, PK, seeded.submissionId);
        await cancelReviewer(anaPage, reviewerRow(modal, 'Julia Reviewer'));

        // The cancelled reviewer: the monograph sits in none of the six
        // views; its wizard address reads the not-assigned message.
        const juliaWizard = wizard;
        await list.expectInViews(tag, []);
        await page.goto(juliaWizard.url(seeded.submissionId));
        await expect(page.getByText(NOT_ASSIGNED)).toBeVisible({timeout: 30_000});
        await expect(page.getByRole('heading', {name: /^Review: /, level: 1})).toHaveCount(0);

        // Control: the second monograph's row still reads the accepted
        // wording with "Finish review", and its wizard address opens the
        // wizard.
        await list.goto('actionRequired');
        const controlRow = list.row(controlTag);
        await expect(controlRow).toContainText(/Please complete this review by \d{4}-\d{2}-\d{2}/);
        await expect(list.rowAction(controlRow, 'Finish review')).toBeVisible();
        await juliaWizard.goto(control.submissionId);
        await juliaWizard.expectOpen(titleFor(controlTag));
        await juliaWizard.expectStep(1);
    });
});
