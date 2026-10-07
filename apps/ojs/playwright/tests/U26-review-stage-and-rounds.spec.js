// @ts-check
/**
 * @file playwright/tests/U26-review-stage-and-rounds.spec.js
 *
 * Review stage & rounds — OJS suite, one test per canonical scenario the spec
 * runs on OJS (common scenarios 1–12 and the journal-and-press scenario 15;
 * scenario 13 is OMP-only, 14 OPS-only).
 * Spec: docs/specs/U26-review-stage-and-rounds.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as contract, a ❓ is parked, not a gap; the spec's
 * Coverage section is the record of everything else left out):
 * - A1 🐞, A9 🐞, A10 🐞, A14 🐞; OJS1 ✅ retired 2026-10-07 (the window
 *   shows the shared remark; S12 asserting it is a Planned item).
 * - A2 ❓, A3 ❓ (spec instruction: no assertion touches the read-review
 *   window's attachments section), A4 ❓, A5 ❓, A6 ❓, A7 ❓, A8 ❓.
 * - U27-register A21 🐞 / A22 🐞 / A23 ❓ / A24 ❓ (the Vue "Review Details"
 *   window): S2 drives only Read Review → "Mark as Complete", waiting for
 *   the window's load-settled signal instead of racing A21's rating click.
 *
 * Seeding: scenario endpoints only. publicknowledge and the seeded roster are
 * read-only (scratch submissions are the isolation unit; journal-level or
 * mail-recipient needs use scratch journals with throwaway users). Mail
 * assertions (S4) are scoped by throwaway recipients carrying app + test in
 * the address, every silence claim bounded by a notice that did arrive the
 * same way. Absence assertions carry same-shape positive controls. Waits are
 * event-based (auto-wait, aria states, jQuery idle) — no hard-coded sleeps.
 */
const {test, expect} = require('../support/fixtures.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {
    WorkflowPage,
    DecisionPage,
    uploadViaWizard,
    uploadFirstStepOnly,
    uploadWizardDialog,
    inMemoryFile,
    openReviewFilesDialog,
    showFilesFromAllStages,
    reviewFilesCheckbox,
    uploadInReviewFilesDialog,
    confirmReviewFilesDialog,
    addReviewer,
    acceptReviewRequest,
    performReview,
    assignParticipant,
    signInAgain,
    openReviewDetails,
    markReviewComplete,
    closeReviewDetails,
    waitForJQueryIdle,
    FIXTURE_PDF_NAME,
} = require('../pages/ReviewStagePages.js');

const JOURNAL = 'publicknowledge';
const REVISED_SUBJECT = 'Revised Version Uploaded';
const REVISION_TASK = 'Revision required.';
const SOLE_RECOMMENDER_TEXT =
    'You can not make a recommendation until an editor is assigned with permission to record a decision.';
const AWAITING_RESPONSES = 'Awaiting responses from reviewers.';
const NEW_REVIEWS = 'New reviews have been submitted.';
const ALL_CONFIRMED = 'All reviews are confirmed and a decision is needed.';
/** The status box's first line on a journal whose minimum of confirmed reviews is 2 (S15). */
const MINIMUM_LINE = 'Minimum number of confirmed reviews required: 2.';
const MINIMUM_LINE_PREFIX = 'Minimum number of confirmed reviews required';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u26${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Seed a submission in external review on the given journal. Rounds are
 * created by the promoting decisions (footnote b); reviewers per round via
 * the round plans.
 */
async function seedInReview(ojsApi, tag, {
    context = JOURNAL,
    submitter = 'author.alex',
    decisions = ['sendExternalReview'],
    reviewRounds = [{reviewers: []}],
    participants = undefined,
} = {}) {
    const result = await ojsApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        decisions,
        reviewRounds,
        ...(participants ? {participants} : {}),
    });
    return result;
}

/**
 * The submissions-table search box (the dashboard also carries a side-nav
 * searchbox that owns the query in the search view — scope by accessible
 * name to dodge the two-searchbox collision).
 */
function tableSearch(page) {
    return page.getByRole('searchbox', {name: /Search submissions, ID/});
}

/**
 * Find the submission's row on a dashboard list by its unique tag. The search
 * commits on Enter (Search.vue submits on keydown.enter) and flips the
 * dashboard to its cross-status search view; the wait is bounded by the
 * resulting row, not a timer.
 */
async function findRowByTag(page, tag) {
    const search = tableSearch(page);
    await expect(search).toBeVisible({timeout: 30_000});
    await search.click();
    await search.pressSequentially(tag, {delay: 25});
    await search.press('Enter');
    const row = page.getByRole('row').filter({hasText: tag});
    await expect(row).toBeVisible({timeout: 30_000});
    return row;
}

/**
 * The header's Tasks window rows carrying `sentence` for the submission
 * titled `title`, read after the window's grid answered (the bound for
 * presence and absence alike). The caller closes the window.
 */
async function openTaskRows(page, sentence, title) {
    const tasks = new TasksPanel(page);
    await tasks.open();
    return {tasks, rows: tasks.row(sentence).filter({hasText: title})};
}

/** The workflow's "Recommendation" box (the bordered div holding the heading). */
function recommendationBox(page) {
    return page
        .locator('div.border')
        .filter({has: page.getByRole('heading', {name: 'Recommendation', exact: true})});
}

/** The five decision buttons of Rule 11 plus the three recommendation buttons of Rule 13. */
const DECISION_BUTTONS = [
    'Request Revisions',
    'Accept Submission',
    'Create New Review Round',
    'Cancel Review Round',
    'Decline Submission',
];
const RECOMMENDATION_BUTTONS = ['Recommend Revisions', 'Recommend Accept', 'Recommend Decline'];

test.describe('review stage & rounds', () => {
    test('S1: round 1 opens with the submission', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        // A throwaway Section Editor on a scratch journal of the test's own:
        // "Review files updated." is a notice the server keeps for the
        // account until a page of it fetches it, and any other page of the
        // same account (a parallel test signed in as a roster editor) takes
        // it first (patterns.md parallel lesson 2). A scratch journal's
        // submit assigns no editor (footnote s): `participants[]` does.
        const editor = `se${tag}`;
        const author = `au${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: editor, roles: ['sectionEditor']},
                {username: author, roles: ['author']},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            decisions: [],
            reviewRounds: [],
            participants: [{username: editor, role: 'sectionEditor'}],
        });
        const fileOne = inMemoryFile(`${tag}-one.txt`);
        const fileTwo = inMemoryFile(`${tag}-two.txt`);
        const fileThree = inMemoryFile(`${tag}-three.txt`);

        const editorPage = await (await asUser(editor)).newPage();
        const workflow = new WorkflowPage(editorPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectPageTitle('Submission');

        // Two submission files to choose from when sending to review (the
        // seed carries no files, so the screen's own upload path provides them).
        for (const file of [fileOne, fileTwo]) {
            await workflow.panel('Submission Files').getByRole('button', {name: 'Upload', exact: true}).click();
            await uploadViaWizard(editorPage, {file});
            await expect(workflow.panelRow('Submission Files', file.name)).toBeVisible();
        }

        // Record the decision that sends it to review, choosing the first file.
        await workflow.decisionButton('Send for Review').click();
        const decision = new DecisionPage(editorPage);
        await decision.expectOpen('Send for Review');
        await decision.continueStep();
        // The wizard offers both files ticked; choose the first one only.
        await decision.promoteFileCheckbox(fileOne.name).check();
        await decision.promoteFileCheckbox(fileTwo.name).uncheck();
        await decision.record();

        // The workflow lands on Review Round 1 with the chosen file under
        // review, and only that one.
        await workflow.expectPageTitle('Review (Round 1)');
        await expect(workflow.roundLink(1)).toBeVisible();
        await workflow.expectStatus('Round 1 Status', 'Waiting for reviewers to be assigned.');
        await expect(workflow.panelRow('Files for Review', fileOne.name)).toBeVisible();
        await expect(workflow.panelRow('Files for Review', fileTwo.name)).toHaveCount(0);

        // "Current Review Files For Round 1": the workflow files with
        // checkboxes; ticking the second file adds it to the round. The
        // window opens on the review stage's own files; the second file,
        // still on the Submission stage, is listed once "Show files from all
        // accessible workflow stages." is ticked (finding T-ojs-1).
        const notice = editorPage.getByText('Review files updated.').first();
        let dialog = await openReviewFilesDialog(editorPage);
        await expect(reviewFilesCheckbox(dialog, fileOne.name)).toBeVisible();
        await showFilesFromAllStages(editorPage, dialog);
        await expect(reviewFilesCheckbox(dialog, fileTwo.name)).toBeVisible();
        await reviewFilesCheckbox(dialog, fileTwo.name).check();
        await confirmReviewFilesDialog(editorPage, dialog);
        await expect(notice).toBeVisible({timeout: 30_000});
        await expect(workflow.panelRow('Files for Review', fileOne.name)).toBeVisible();
        await expect(workflow.panelRow('Files for Review', fileTwo.name)).toBeVisible();

        // Uploading from the dialog adds a third file; nothing here deletes
        // one, so the two listed before are still listed. The first notice
        // must be gone before the second confirm, so the second read is its
        // own notice, not the lingering first one.
        await expect(notice).toBeHidden({timeout: 30_000});
        dialog = await openReviewFilesDialog(editorPage);
        await uploadInReviewFilesDialog(editorPage, dialog, {file: fileThree});
        await reviewFilesCheckbox(dialog, fileThree.name).check();
        await confirmReviewFilesDialog(editorPage, dialog);
        await expect(notice).toBeVisible({timeout: 30_000});
        await expect(workflow.panelRow('Files for Review', fileThree.name)).toBeVisible();
        await expect(workflow.panelRow('Files for Review', fileOne.name)).toBeVisible();
        await expect(workflow.panelRow('Files for Review', fileTwo.name)).toBeVisible();

        // Control: the "Review" entry holds "Review Round 1" alone.
        await expect(workflow.roundLink(1)).toBeVisible();
        await expect(workflow.roundLink(2)).toHaveCount(0);
    });

    test('S2: the status line follows the reviewers', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag);

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStatus('Round 1 Status', 'Waiting for reviewers to be assigned.');

        // Add a reviewer through the Reviewers panel.
        await addReviewer(editorPage, 'Julia Reviewer');
        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus('Round 1 Status', 'Awaiting responses from reviewers.');

        // Control: with the request accepted and the review not yet
        // submitted, the box still reads the same.
        const reviewerPage = await (await asUser('reviewer.julia')).newPage();
        await acceptReviewRequest(reviewerPage, JOURNAL, submissionId);
        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus('Round 1 Status', 'Awaiting responses from reviewers.');

        // The reviewer submits their review.
        await performReview(reviewerPage, JOURNAL, submissionId);

        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus('Round 1 Status', 'New reviews have been submitted.');

        // The editor confirms the review from the Reviewers panel: "Read
        // Review" opens the "Review Details" window; "Mark as Complete"
        // confirms it through its dialog.
        const reviewerRow = workflow.panelRow('Reviewers', 'Julia Reviewer');
        const readModal = await openReviewDetails(editorPage, reviewerRow);
        await markReviewComplete(editorPage, readModal);
        await closeReviewDetails(editorPage, readModal);

        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus('Round 1 Status', 'All reviews are confirmed and a decision is needed.');
    });

    test('S3: request revisions within the round', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const title = `Submission ${tag}`;
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'accepted'}]}],
        });

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.clickRequestRevisions({newRound: false});
        const decision = new DecisionPage(editorPage);
        await decision.expectOpen('Request Revisions');
        await decision.completeAll();
        await workflow.expectStatus('Round 1 Status', 'Revisions have been requested.');

        // The author finds a revisions task naming the submission in the
        // header's Tasks panel, and the upload button on the review stage.
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${JOURNAL}/dashboard/mySubmissions`);
        const {tasks, rows: taskRows} = await openTaskRows(authorPage, REVISION_TASK, title);
        await expect(taskRows).toHaveCount(1);
        await tasks.close();
        const row = await findRowByTag(authorPage, tag);
        await expect(row).toContainText('Revision requested');
        await expect(row.getByRole('button', {name: 'Submit revisions'})).toBeVisible();

        const authorWorkflow = new WorkflowPage(authorPage, JOURNAL);
        await authorWorkflow.gotoAuthor(submissionId);
        await expect(
            authorPage.getByRole('button', {name: 'Upload revisions', exact: true})
        ).toBeVisible();

        // Control: the "Revisions Uploaded" panel is still empty (the panel
        // renders its "No Items" row).
        await expect(authorWorkflow.panel('Revisions Uploaded').getByRole('cell', {name: 'No Items'})).toBeVisible();
    });

    test('S4: author uploads a revision', async ({asUser, ojsApi, pkpMail, browser, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const editor = `edi${tag}`;
        const otherEditor = `edo${tag}`;
        const author = `au${tag}`;
        const title = `Submission ${tag}`;
        const fileOne = inMemoryFile(`${tag}-rev1.txt`);
        const fileTwo = inMemoryFile(`${tag}-rev2.txt`);
        const fileThree = inMemoryFile(`${tag}-rev3.txt`);
        // Scratch journal: the revised-version notices must land in throwaway
        // mailboxes (Mailpit is shared), and scratch submissions auto-assign no
        // editor (footnote s) — the editor assigns themselves on screen. The
        // assignment dialog offers no "Journal manager" group; "Journal
        // editor" is the manager-level stage-assignable group. The second
        // editor is never assigned (the control mailbox).
        await ojsApi.createContext({
            tag,
            users: [
                {username: editor, roles: ['editor']},
                {username: otherEditor, roles: ['editor']},
                {username: author, roles: ['author']},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            decisions: ['sendExternalReview', 'requestRevisions'],
        });

        const editorPage = await (await asUser(editor)).newPage();
        const workflow = new WorkflowPage(editorPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStatus('Round 1 Status', 'Revisions have been requested.');
        await assignParticipant(editorPage, {
            group: 'Journal editor',
            name: editor,
            searchName: editor,
        });

        // The author's task stands before the upload (control for its clearing).
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const before = await openTaskRows(authorPage, REVISION_TASK, title);
        await expect(before.rows).toHaveCount(1);
        await before.tasks.close();

        // "Upload revisions", first step only: attach a file, close the
        // window without finishing — the panel lists the file all the same.
        const authorWorkflow = new WorkflowPage(authorPage, tag);
        await authorWorkflow.gotoAuthor(submissionId);
        await authorPage.getByRole('button', {name: 'Upload revisions', exact: true}).click();
        await uploadFirstStepOnly(authorPage, {file: fileOne});
        await authorPage.reload();
        await authorWorkflow.expectOpen();
        await expect(authorWorkflow.panelRow('Revisions Uploaded', fileOne.name)).toBeVisible();

        // Editor view: status flipped.
        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus('Round 1 Status', 'Revisions have been submitted and a decision is needed.');

        // The author's task is gone from the header's Tasks panel (bounded by
        // the window's grid, the same read as the control above).
        const after = await openTaskRows(authorPage, REVISION_TASK, title);
        await expect(after.rows).toHaveCount(0);
        await after.tasks.close();

        // The assigned editor's mailbox holds the revised-version notice, sent
        // under the author's own name and address.
        const notice = await pkpMail.find({to: `${editor}@mail.test`, subject: REVISED_SUBJECT});
        expect(notice.From.Address).toBe(`${author}@mail.test`);

        // A second upload the same day: the panel lists both files, and no
        // second notice reaches the same editor. The notice is sent at the
        // first step's transfer, so a completed wizard plus the editor's
        // fresh sign-in below are well past any send; the count is then
        // re-read after the third upload's notice arrives, which bounds it.
        await authorWorkflow.gotoAuthor(submissionId);
        await authorPage.getByRole('button', {name: 'Upload revisions', exact: true}).click();
        await uploadViaWizard(authorPage, {file: fileTwo});
        await expect(authorWorkflow.panelRow('Revisions Uploaded', fileOne.name)).toBeVisible();
        await expect(authorWorkflow.panelRow('Revisions Uploaded', fileTwo.name)).toBeVisible();

        // After the Editor signs in, a further upload sends a fresh notice.
        const fresh = await signInAgain(browser, baseURL, editor);
        await fresh.close();
        expect(await pkpMail.count({to: `${editor}@mail.test`, subject: REVISED_SUBJECT})).toBe(1);
        await authorPage.getByRole('button', {name: 'Upload revisions', exact: true}).click();
        await uploadViaWizard(authorPage, {file: fileThree});
        await expect(authorWorkflow.panelRow('Revisions Uploaded', fileThree.name)).toBeVisible();
        await expect
            .poll(() => pkpMail.count({to: `${editor}@mail.test`, subject: REVISED_SUBJECT}), {timeout: 30_000})
            .toBe(2);

        // Control: the Editor not assigned to the stage has no notice, bounded
        // by the assigned editor's notice taken the same way.
        await pkpMail.expectNone({
            to: `${otherEditor}@mail.test`,
            subject: REVISED_SUBJECT,
            afterControl: {to: `${editor}@mail.test`, subject: REVISED_SUBJECT},
        });
    });

    test('S5: request revisions toward a new round', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag);

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.clickRequestRevisions({newRound: true});
        const decision = new DecisionPage(editorPage);
        // The new-round choice continues under the wizard name "Resubmit for
        // Review" (Rule 11).
        await decision.expectOpen('Resubmit for Review');
        await decision.completeAll();
        await workflow.expectStatus(
            'Round 1 Status',
            'Revisions requested from the author to be taken to a new review round.'
        );

        // The author finds the "Resubmit for review." task and uploads one
        // revised file.
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${JOURNAL}/dashboard/mySubmissions`);
        const {tasks, rows: taskRows} = await openTaskRows(authorPage, 'Resubmit for review.', `Submission ${tag}`);
        await expect(taskRows).toHaveCount(1);
        await tasks.close();
        const authorWorkflow = new WorkflowPage(authorPage, JOURNAL);
        await authorWorkflow.gotoAuthor(submissionId);
        await authorPage.getByRole('button', {name: 'Upload revisions', exact: true}).click();
        await uploadViaWizard(authorPage);
        await expect(authorWorkflow.panelRow('Revisions Uploaded', FIXTURE_PDF_NAME)).toBeVisible();

        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.expectStatus(
            'Round 1 Status',
            'Revisions submitted. A new review round needs to be created.'
        );

        // The documented working path after the first upload: the Revisions
        // Uploaded panel's own Upload control still opens the same wizard
        // (the bottom button's fate is register A1, asserted neither way).
        await authorPage.reload();
        await authorWorkflow.expectOpen();
        await authorWorkflow
            .panel('Revisions Uploaded')
            .getByRole('button', {name: 'Upload', exact: true})
            .click();
        await expect(uploadWizardDialog(authorPage)).toBeVisible({timeout: 30_000});
        await uploadWizardDialog(authorPage).getByRole('link', {name: 'Cancel'}).click();
        await expect(uploadWizardDialog(authorPage)).toHaveCount(0, {timeout: 30_000});
    });

    test('S6: a new round', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        // Round 1 with one reviewer and the new-round revision request (the
        // end of scenario 5).
        const {submissionId} = await seedInReview(ojsApi, tag, {
            decisions: ['sendExternalReview', 'resubmit'],
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'accepted'}]}],
        });

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);

        // File revisions on the author's behalf through the panel's own
        // control (Rule 9's editorial path) so the new-round wizard has a
        // revised file to carry over.
        await workflow
            .panel('Revisions Uploaded')
            .getByRole('button', {name: 'Upload', exact: true})
            .click();
        await uploadViaWizard(editorPage);
        await expect(workflow.panelRow('Revisions Uploaded', FIXTURE_PDF_NAME)).toBeVisible();

        await workflow.decisionButton('Create New Review Round').click();
        const decision = new DecisionPage(editorPage);
        // The wizard page titles itself "New Review Round" (the button label
        // stays "Create New Review Round").
        await decision.expectOpen('New Review Round');
        await decision.continueStep();
        // The wizard's file step offers the revised file already ticked.
        await expect(decision.promoteFileCheckbox(FIXTURE_PDF_NAME)).toBeChecked();
        await decision.record();

        // Round 2 is current, waiting for reviewers, with the carried file
        // and no reviewer.
        await workflow.expectPageTitle('Review (Round 2)');
        await expect(workflow.roundLink(2)).toBeVisible();
        await workflow.expectStatus('Round 2 Status', 'Waiting for reviewers to be assigned.');
        await expect(workflow.panelRow('Files for Review', FIXTURE_PDF_NAME)).toBeVisible();
        await expect(workflow.panel('Reviewers')).toBeVisible();
        await expect(workflow.panel('Reviewers').getByRole('cell', {name: 'No Items'})).toBeVisible();
        await expect(workflow.panelRow('Reviewers', 'Paul Reviewer')).toHaveCount(0);

        // Round 1 is a past round: its reviewer and files show, no decision
        // buttons, the advanced-to-next-round note under a plain "Status"
        // heading.
        await workflow.selectRound(1);
        await expect(workflow.panelRow('Reviewers', 'Paul Reviewer')).toBeVisible();
        await expect(workflow.panel('Files for Review')).toBeVisible();
        await workflow.expectStatus('Status', 'The submission has been advanced to the next round of review');
        for (const label of DECISION_BUTTONS) {
            await expect(workflow.decisionButton(label)).toHaveCount(0);
        }

        // Control: Round 2 selected again brings the buttons back under the
        // "Round 2 Status" heading.
        await workflow.selectRound(2);
        await expect(workflow.statusBox('Round 2 Status')).toBeVisible();
        await expect(workflow.decisionButton('Accept Submission')).toBeVisible();
        await expect(workflow.decisionButton('Request Revisions')).toBeVisible();
    });

    test('S7: cancel a round', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const manager = `mgr${tag}`;
        const author = `au${tag}`;
        const reviewer = `rev${tag}`;
        // Scratch journal: the reviewer-side absence claim needs a bounded
        // assignment list, which the shared roster's reviewers cannot give.
        await ojsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer']},
            ],
        });
        // Round 1 via the promoting decision, round 2 as an explicitly
        // declared extra round (declaring newExternalReviewRound as a seeded
        // decision double-creates rounds — the decision does not report a new
        // stage id, so the builder also builds every declared round).
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            decisions: ['sendExternalReview'],
            reviewRounds: [
                {reviewers: []},
                {reviewers: [{username: reviewer, status: 'invited'}]},
            ],
        });
        // The second submission, on its Round 1.
        const {submissionId: secondId} = await seedInReview(ojsApi, `${tag}b`, {
            context: tag,
            submitter: author,
        });

        // The invited reviewer sees the assignment (control for its vanishing).
        const reviewerPage = await (await asUser(reviewer)).newPage();
        await reviewerPage.goto(`/index.php/${tag}/dashboard/reviewAssignments`);
        const assignmentRow = reviewerPage.getByRole('row').filter({hasText: tag});
        await expect(assignmentRow).toBeVisible({timeout: 30_000});

        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectPageTitle('Review (Round 2)');
        await workflow.decisionButton('Cancel Review Round').click();
        const decision = new DecisionPage(managerPage);
        await decision.expectOpen('Cancel Review Round');
        await decision.completeAll();

        // Round 2 is gone; the submission stands on Round 1.
        await workflow.expectPageTitle('Review (Round 1)');
        await expect(workflow.roundLink(1)).toBeVisible();
        await expect(workflow.roundLink(2)).toHaveCount(0);
        await workflow.expectStatus('Round 1 Status', 'Waiting for reviewers to be assigned.');

        // The withdrawn invitation is gone from the reviewer's list (bounded
        // by the same row locator that was visible above).
        await reviewerPage.goto(`/index.php/${tag}/dashboard/reviewAssignments`);
        await expect(reviewerPage.getByRole('table')).toBeVisible({timeout: 30_000});
        await expect(assignmentRow).toHaveCount(0);

        // Cancelling Round 1 on the second submission returns it to the
        // Submission stage.
        await workflow.gotoEditorial(secondId);
        await workflow.expectPageTitle('Review (Round 1)');
        await workflow.decisionButton('Cancel Review Round').click();
        await decision.expectOpen('Cancel Review Round');
        await decision.completeAll();
        await workflow.expectPageTitle('Submission');
        await expect(workflow.roundLink(1)).toHaveCount(0);
    });

    test('S8: cancelling is blocked once a review is in', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewRounds: [{reviewers: [{username: 'reviewer.amara', status: 'completed'}]}],
        });
        // The second submission: its round's only reviewer declined.
        const {submissionId: declinedId} = await seedInReview(ojsApi, `${tag}b`, {
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'declined'}]}],
        });
        // Control: a round whose only reviewer has not yet responded.
        const {submissionId: invitedId} = await seedInReview(ojsApi, `${tag}c`, {
            reviewRounds: [{reviewers: [{username: 'reviewer.adam', status: 'invited'}]}],
        });
        // The third submission: one reviewer declined, one accepted.
        const {submissionId: mixedId} = await seedInReview(ojsApi, `${tag}d`, {
            reviewRounds: [
                {
                    reviewers: [
                        {username: 'reviewer.paul', status: 'declined'},
                        {username: 'reviewer.julia', status: 'accepted'},
                    ],
                },
            ],
        });

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);

        // With a review in: the button is simply absent, nothing in its
        // place, while the other four decisions remain.
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStatus('Round 1 Status', 'New reviews have been submitted.');
        await expect(workflow.decisionButton('Request Revisions')).toBeVisible();
        await expect(workflow.decisionButton('Accept Submission')).toBeVisible();
        await expect(workflow.decisionButton('Create New Review Round')).toBeVisible();
        await expect(workflow.decisionButton('Decline Submission')).toBeVisible();
        await expect(workflow.decisionButton('Cancel Review Round')).toHaveCount(0);
        await expect(editorPage.getByText(/Cancel Review Round/)).toHaveCount(0);

        // A declined reviewer: absent equally.
        await workflow.gotoEditorial(declinedId);
        await expect(workflow.decisionButton('Accept Submission')).toBeVisible();
        await expect(workflow.decisionButton('Decline Submission')).toBeVisible();
        await expect(workflow.decisionButton('Cancel Review Round')).toHaveCount(0);

        // A declined reviewer beside an accepted one: the declined reviewer
        // is not counted in the status, which reads the accepted reviewer's
        // sentence; the button is absent here too (the other decisions stand,
        // so the action area has rendered).
        await workflow.gotoEditorial(mixedId);
        await workflow.expectStatus('Round 1 Status', AWAITING_RESPONSES);
        await expect(workflow.statusBox('Round 1 Status')).not.toContainText(NEW_REVIEWS);
        await expect(workflow.decisionButton('Accept Submission')).toBeVisible();
        await expect(workflow.decisionButton('Request Revisions')).toBeVisible();
        await expect(workflow.decisionButton('Cancel Review Round')).toHaveCount(0);

        // Control: while the invitation is unanswered the button is offered.
        await workflow.gotoEditorial(invitedId);
        await expect(workflow.decisionButton('Cancel Review Round')).toBeVisible();
    });

    test('S9: accept out of review', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const {submissionId} = await seedInReview(ojsApi, tag);
        // The second submission went through two rounds and was accepted
        // from Round 2 (the promoting decision consumes the one round plan;
        // the new-round decision adds Round 2 with no reviewer, footnote s).
        const {submissionId: acceptedId} = await seedInReview(ojsApi, `${tag}b`, {
            decisions: ['sendExternalReview', 'newExternalReviewRound', 'accept'],
        });

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.decisionButton('Accept Submission').click();
        const decision = new DecisionPage(editorPage);
        await decision.expectOpen('Accept Submission');
        await decision.completeAll();

        // The submission moved to Copyediting; the review rounds remain, the
        // status box reporting the current stage under a plain "Status"
        // heading (control: no "Round 1 Status" heading any more).
        await workflow.expectPageTitle('Copyediting');
        await workflow.selectRound(1);
        await workflow.expectStatus('Status', 'The submission is currently in the Copyediting stage.');
        await expect(workflow.statusBox('Round 1 Status')).toHaveCount(0);

        // A past round after acceptance: on the second submission, Round 1
        // (the round before the accepting one) reads the advanced-and-accepted
        // sentence under the plain "Status" heading.
        await workflow.gotoEditorial(acceptedId);
        await workflow.expectPageTitle('Copyediting');
        await expect(workflow.roundLink(2)).toBeVisible();
        await workflow.selectRound(1);
        await workflow.expectStatus(
            'Status',
            'The submission advanced to the next review round, was accepted, and is currently in the Copyediting stage.'
        );
        await expect(workflow.statusBox('Round 1 Status')).toHaveCount(0);
    });

    test('S10: decline, revert, delete', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        // The seeded journal auto-assigns sectioneditor.ana (Articles) on
        // submit; manager.maya opens any submission unassigned.
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'accepted'}]}],
        });

        // Control: before the decline, no "Delete" among the Journal
        // Manager's buttons.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const managerWorkflow = new WorkflowPage(managerPage, JOURNAL);
        await managerWorkflow.gotoEditorial(submissionId);
        await managerWorkflow.expectStatus('Round 1 Status', 'Awaiting responses from reviewers.');
        await expect(managerWorkflow.decisionButton('Decline Submission')).toBeVisible();
        await expect(managerWorkflow.decisionButton('Delete')).toHaveCount(0);

        // The Journal Manager declines: the box reads "Submission declined."
        // and the buttons are "Revert Decline" and "Delete".
        await managerWorkflow.decisionButton('Decline Submission').click();
        const decision = new DecisionPage(managerPage);
        await decision.expectOpen('Decline Submission');
        await decision.completeAll();
        await managerWorkflow.expectStatus('Round 1 Status', 'Submission declined.');
        await expect(managerWorkflow.decisionButton('Revert Decline')).toBeVisible();
        await expect(managerWorkflow.decisionButton('Delete')).toBeVisible();
        for (const label of DECISION_BUTTONS) {
            await expect(managerWorkflow.decisionButton(label)).toHaveCount(0);
        }

        // The Section Editor's screen: "Revert Decline" alone, no "Delete".
        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStatus('Round 1 Status', 'Submission declined.');
        await expect(workflow.decisionButton('Revert Decline')).toBeVisible();
        await expect(workflow.decisionButton('Delete')).toHaveCount(0);
        for (const label of DECISION_BUTTONS) {
            await expect(workflow.decisionButton(label)).toHaveCount(0);
        }

        // Revert Decline restores the round's reviewer-derived status.
        await managerWorkflow.decisionButton('Revert Decline').click();
        await decision.expectOpen('Revert Decline');
        await decision.completeAll();
        await managerWorkflow.expectStatus('Round 1 Status', 'Awaiting responses from reviewers.');
        await expect(managerWorkflow.decisionButton('Accept Submission')).toBeVisible();
        await expect(managerWorkflow.decisionButton('Revert Decline')).toHaveCount(0);
    });

    test('S11: recommend-only round', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        // A declined reviewer is reviewer record enough for the recommendation
        // sentences to engage (Rule 6).
        const {submissionId} = await seedInReview(ojsApi, tag, {
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'declined'}]}],
        });
        // The second submission: a scratch journal whose one throwaway Section
        // Editor is the only editorial participant (a scratch journal's
        // submit assigns no editor, footnote s), limited on screen the same
        // way through the Participants panel's Assign window.
        const scratch = `${tag}j`;
        const soleEditor = `se${scratch}`;
        const scratchManager = `mg${scratch}`;
        const scratchAuthor = `au${scratch}`;
        await ojsApi.createContext({
            tag: scratch,
            users: [
                {username: scratchManager, roles: ['manager']},
                {username: soleEditor, roles: ['sectionEditor']},
                {username: scratchAuthor, roles: ['author']},
            ],
        });
        const {submissionId: soleId} = await seedInReview(ojsApi, scratch, {
            context: scratch,
            submitter: scratchAuthor,
            reviewRounds: [{reviewers: []}],
        });

        // A Journal Manager limits omar's participation to recommendations
        // (stage-participants surface, per the spec's recipe; a fellow section
        // editor's save of this form is silently discarded — see report note).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const managerWorkflow = new WorkflowPage(managerPage, JOURNAL);
        await managerWorkflow.gotoEditorial(submissionId);
        await managerWorkflow.participantMoreActions('Omar Section Editor').click();
        await managerPage.getByRole('menuitem', {name: 'Edit'}).click();
        const editModal = managerPage
            .getByRole('dialog')
            .filter({has: managerPage.locator('input[name="recommendOnly"]')});
        await expect(editModal.locator('input[name="recommendOnly"]')).toBeVisible({timeout: 30_000});
        await editModal.locator('input[name="recommendOnly"]').check();
        await editModal.getByRole('button', {name: 'OK', exact: true}).click();
        // The legacy form's success closes the modal; the wrapper can linger
        // hidden in the DOM, so wait on visibility, not on count.
        await expect(editModal.locator('input[name="recommendOnly"]')).toBeHidden({
            timeout: 30_000,
        });
        await waitForJQueryIdle(managerPage);

        // Control: before the recommendation is recorded, the deciding
        // editor's screen shows no "Recommendation" box (the status box of
        // the same screen renders).
        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStatus('Round 1 Status', 'Awaiting recommendations from editors.');
        await expect(recommendationBox(editorPage)).toHaveCount(0);

        // The recommending editor sees recommendation controls, not decisions.
        const omarPage = await (await asUser('sectioneditor.omar')).newPage();
        const omarWorkflow = new WorkflowPage(omarPage, JOURNAL);
        await omarWorkflow.gotoEditorial(submissionId);
        for (const label of RECOMMENDATION_BUTTONS) {
            await expect(omarWorkflow.decisionButton(label)).toBeVisible();
        }
        for (const label of DECISION_BUTTONS) {
            await expect(omarWorkflow.decisionButton(label)).toHaveCount(0);
        }
        await omarWorkflow.expectStatus('Round 1 Status', 'Awaiting recommendations from editors.');

        // They record "Accept Submission" as a recommendation.
        await omarWorkflow.decisionButton('Recommend Accept').click();
        const decision = new DecisionPage(omarPage);
        await decision.expectOpen('Recommend Accept');
        await decision.completeAll();

        // The deciding editor's screen shows the Recommendation box and the
        // all-recommendations-in status.
        await editorPage.reload();
        await workflow.expectOpen();
        await expect(recommendationBox(editorPage)).toContainText('Accept Submission');
        await workflow.expectStatus('Round 1 Status', 'All recommendations are in and a decision is needed.');

        // Sole recommending editor: assigned as the only editorial
        // participant, limited to recommendations, they get no buttons of
        // either kind and the "Recommendation" box carries the guard text.
        const scratchManagerPage = await (await asUser(scratchManager)).newPage();
        const scratchManagerWorkflow = new WorkflowPage(scratchManagerPage, scratch);
        await scratchManagerWorkflow.gotoEditorial(soleId);
        await assignParticipant(scratchManagerPage, {
            group: 'Section editor',
            name: soleEditor,
            searchName: soleEditor,
            recommendOnly: true,
        });
        const solePage = await (await asUser(soleEditor)).newPage();
        const soleWorkflow = new WorkflowPage(solePage, scratch);
        await soleWorkflow.gotoEditorial(soleId);
        await expect(recommendationBox(solePage)).toContainText(SOLE_RECOMMENDER_TEXT);
        await expect(soleWorkflow.statusBox('Round 1 Status')).toBeVisible();
        for (const label of [...RECOMMENDATION_BUTTONS, ...DECISION_BUTTONS]) {
            await expect(soleWorkflow.decisionButton(label)).toHaveCount(0);
        }

        // No reviewer record: the round seeds no reviewer, so the box reads
        // the waiting sentence, not the recommendation one (the positive
        // control is the first submission's box above, read the same way,
        // which carried the recommendation sentence on its declined reviewer).
        await soleWorkflow.expectStatus('Round 1 Status', 'Waiting for reviewers to be assigned.');
        await expect(soleWorkflow.statusBox('Round 1 Status')).not.toContainText(
            'Awaiting recommendations from editors.'
        );
    });

    test('S12: author reads an open review', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s12', testInfo);
        const controlTag = `${tag}b`;
        // The open-review submission; the reviewer is added on screen so the
        // review type can be set to Open (the seed's addReviewer path uses the
        // journal default, double-anonymous).
        const {submissionId} = await seedInReview(ojsApi, tag, {submitter: 'author.bea'});
        // The anonymous control on another submission: a completed anonymous
        // review, no letter.
        const {submissionId: controlId} = await seedInReview(ojsApi, controlTag, {
            submitter: 'author.bea',
            reviewRounds: [{reviewers: [{username: 'reviewer.paul', status: 'completed'}]}],
        });

        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        const workflow = new WorkflowPage(editorPage, JOURNAL);
        await workflow.gotoEditorial(submissionId);
        await addReviewer(editorPage, 'Julia Reviewer', {method: 'Open'});

        // The open reviewer accepts and stops there: the review is under way.
        const juliaPage = await (await asUser('reviewer.julia')).newPage();
        await acceptReviewRequest(juliaPage, JOURNAL, submissionId);

        // A decision letter for the Notifications list (Rule 16): the editor
        // requests revisions, notifying the author by email.
        await editorPage.reload();
        await workflow.expectOpen();
        await workflow.clickRequestRevisions({newRound: false});
        const decision = new DecisionPage(editorPage);
        await decision.expectOpen('Request Revisions');
        await decision.completeAll();

        // Fresh in review: the second submission's review stage shows the two
        // ever-present panels and nothing else — no "Notifications" list, no
        // reviewers list (not even an empty one), no "Upload revisions".
        const authorPage = await (await asUser('author.bea')).newPage();
        const authorWorkflow = new WorkflowPage(authorPage, JOURNAL);
        const reviewersTable = authorPage.getByRole('table', {name: 'Reviewers', exact: true});
        const readReview = authorPage.getByRole('button', {name: 'Read Review', exact: true});
        const notificationsHeading = authorPage.getByRole('heading', {name: 'Notifications', exact: true});
        const uploadRevisions = authorPage.getByRole('button', {name: 'Upload revisions', exact: true});
        await authorWorkflow.gotoAuthor(controlId);
        await authorWorkflow.expectPageTitle('Review (Round 1)');
        await expect(authorPage.getByRole('heading', {name: 'Revisions Uploaded'})).toBeVisible();
        await expect(authorPage.getByRole('heading', {name: /Tasks & Discussions$/})).toBeVisible();
        await expect(notificationsHeading).toHaveCount(0);
        await expect(reviewersTable).toHaveCount(0);
        await expect(readReview).toHaveCount(0);
        await expect(uploadRevisions).toHaveCount(0);

        // An open review under way: the first submission lists no reviewer
        // yet (its letter and its revision request render on the same screen).
        await authorWorkflow.gotoAuthor(submissionId);
        await authorWorkflow.expectPageTitle('Review (Round 1)');
        await expect(notificationsHeading).toBeVisible();
        await expect(uploadRevisions).toBeVisible();
        await expect(reviewersTable).toHaveCount(0);
        await expect(readReview).toHaveCount(0);

        // The open reviewer shares a remark with the author and submits (the
        // journal's window shows it since OJS1 retired; asserting it is a
        // Planned item).
        await performReview(juliaPage, JOURNAL, submissionId, {
            recommendation: 'Accept Submission',
            comments: 'Shared remarks for the author.',
        });

        // The author reads the open review: reviewer's name, completion date
        // and recommendation. (Review text: a Planned assertion since OJS1
        // retired; attachments section: register A3, not asserted.)
        await authorWorkflow.gotoAuthor(submissionId);
        const reviewerRow = authorWorkflow.panelRow('Reviewers', 'Julia Reviewer');
        await expect(reviewerRow).toBeVisible();
        await reviewerRow.getByRole('button', {name: 'Read Review', exact: true}).click();
        const readModal = authorPage
            .getByRole('dialog')
            .filter({has: authorPage.locator('form#readReviewForm')});
        await expect(readModal.getByRole('heading', {name: 'Julia Reviewer'})).toBeVisible({
            timeout: 30_000,
        });
        await expect(readModal).toContainText('Completed:');
        await expect(readModal).toContainText('Recommendation:');
        await expect(readModal).toContainText('Accept Submission');
        await readModal.getByRole('button', {name: 'Close'}).click();
        await expect(readModal).toHaveCount(0, {timeout: 30_000});

        // The decision letter sits under "Notifications" as a subject line
        // and a date, and opens read-only. (The subject anchors carry no
        // href, so they expose no link role.)
        await expect(notificationsHeading).toBeVisible();
        const notificationsList = authorPage
            .locator('div')
            .filter({has: notificationsHeading})
            .last();
        const letterItem = notificationsList.getByRole('listitem').first();
        await expect(letterItem).toContainText(/\d{4}-\d{2}-\d{2}/);
        const letterLink = letterItem.locator('a').first();
        const letterSubject = (await letterLink.textContent())?.trim();
        expect(letterSubject).toBeTruthy();
        await letterLink.click();
        const letterModal = authorPage.getByRole('dialog').filter({hasText: letterSubject || ''});
        await expect(letterModal.first()).toBeVisible({timeout: 30_000});
        await expect(letterModal.first().getByRole('textbox')).toHaveCount(0);
        await letterModal.first().getByRole('button', {name: 'Close'}).click();

        // Old addresses: the author-dashboard form lands on My Submissions
        // with the submission's workflow open; the per-round form answers a
        // bare "404 Not Found" page, with and without an id.
        await authorPage.goto(`/index.php/${JOURNAL}/authorDashboard/submission/${submissionId}`);
        await authorPage.waitForURL((url) => url.pathname.includes('/dashboard/mySubmissions'), {
            waitUntil: 'commit',
        });
        await expect
            .poll(() => new URL(authorPage.url()).searchParams.get('workflowSubmissionId'), {timeout: 30_000})
            .toBe(String(submissionId));
        await authorWorkflow.expectOpen();
        await expect(authorPage.getByText(`Submission ${tag}`).first()).toBeVisible();
        for (const suffix of [`/${submissionId}`, '']) {
            const response = await authorPage.goto(`/index.php/${JOURNAL}/authorDashboard/reviewRoundInfo${suffix}`);
            expect(response?.status()).toBe(404);
            await expect(authorPage.locator('body')).toHaveText(/404 Not Found/);
        }

        // Control: the anonymous control's review stage still shows no
        // reviewers list at all — not an empty one (positive control: the
        // Revisions Uploaded panel of the same view renders).
        await authorWorkflow.gotoAuthor(controlId);
        await expect(authorPage.getByRole('heading', {name: 'Revisions Uploaded'})).toBeVisible();
        await expect(reviewersTable).toHaveCount(0);
        await expect(readReview).toHaveCount(0);
    });

    test('S15: a minimum of confirmed reviews', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s15', testInfo);
        const editor = `edi${tag}`;
        const author = `au${tag}`;
        const reviewer = `rev${tag}`;
        const reviewerName = 'Rita Reviewer';
        // A scratch journal whose "Minimum Confirmed Reviews Required" is 2
        // (the context's `review` passthrough key), with throwaway accounts;
        // a scratch journal's submit assigns no editor (footnote s), so the
        // editor is assigned through `participants[]`. The seeded `accepted`
        // reviewer's wizard opens on step 1.
        await ojsApi.createContext({
            tag,
            review: {numReviewsPerSubmission: 2},
            users: [
                {username: editor, roles: ['editor']},
                {username: author, roles: ['author']},
                {username: reviewer, givenName: 'Rita', familyName: 'Reviewer', roles: ['externalReviewer']},
            ],
        });
        const {submissionId} = await seedInReview(ojsApi, tag, {
            context: tag,
            submitter: author,
            reviewRounds: [{reviewers: [{username: reviewer, status: 'accepted'}]}],
            participants: [{username: editor, role: 'editor'}],
        });
        // The control: the seeded journal (minimum 0) with a submitted review
        // the editor confirms on screen, the state scenario 2 ends in.
        const {submissionId: controlId} = await seedInReview(ojsApi, `${tag}b`, {
            reviewRounds: [{reviewers: [{username: 'reviewer.amara', status: 'completed'}]}],
        });

        // The review underway: the minimum line, then the reviewer sentence.
        const editorPage = await (await asUser(editor)).newPage();
        const workflow = new WorkflowPage(editorPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectPageTitle('Review (Round 1)');
        await expect(workflow.statusLines('Round 1 Status')).toHaveText([MINIMUM_LINE, AWAITING_RESPONSES]);

        // The review submitted: the reviewer submits on their own page; the
        // editor's box reads the minimum line with the submitted sentence
        // beneath it.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        await performReview(reviewerPage, tag, submissionId);
        await editorPage.reload();
        await workflow.expectOpen();
        await expect(workflow.statusLines('Round 1 Status')).toHaveText([MINIMUM_LINE, NEW_REVIEWS]);

        // "Read Review" → "Mark as Complete": the box reads the minimum line
        // alone; the all-confirmed sentence does not appear.
        const reviewerRow = workflow.panelRow('Reviewers', reviewerName);
        const readModal = await openReviewDetails(editorPage, reviewerRow);
        await markReviewComplete(editorPage, readModal);
        await closeReviewDetails(editorPage, readModal);
        await editorPage.reload();
        await workflow.expectOpen();
        await expect(workflow.statusLines('Round 1 Status')).toHaveText([MINIMUM_LINE]);
        await expect(workflow.statusBox('Round 1 Status')).not.toContainText(ALL_CONFIRMED);

        // Control: on the seeded journal, whose minimum is 0, the submitted
        // review reads its sentence with no minimum line, and once confirmed
        // the box reads the all-confirmed sentence alone.
        const anaPage = await (await asUser('sectioneditor.ana')).newPage();
        const control = new WorkflowPage(anaPage, JOURNAL);
        await control.gotoEditorial(controlId);
        await expect(control.statusLines('Round 1 Status')).toHaveText([NEW_REVIEWS]);
        await expect(control.statusBox('Round 1 Status')).not.toContainText(MINIMUM_LINE_PREFIX);
        const controlRow = control.panelRow('Reviewers', 'Amara Reviewer');
        const controlModal = await openReviewDetails(anaPage, controlRow);
        await markReviewComplete(anaPage, controlModal);
        await closeReviewDetails(anaPage, controlModal);
        await anaPage.reload();
        await control.expectOpen();
        await expect(control.statusLines('Round 1 Status')).toHaveText([ALL_CONFIRMED]);
        await expect(control.statusBox('Round 1 Status')).not.toContainText(MINIMUM_LINE_PREFIX);
    });
});
