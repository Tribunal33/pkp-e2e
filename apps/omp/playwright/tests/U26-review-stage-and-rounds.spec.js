// @ts-check
/**
 * @file playwright/tests/U26-review-stage-and-rounds.spec.js
 *
 * U26 — Review stage & rounds, OMP suite (spec:
 * lib/pkp/docs/e2e/specs/U26-review-stage-and-rounds.md). One test per
 * canonical scenario the spec runs on a press: common scenarios 1–12 in OMP
 * vocabulary (press, monograph, External Review — glossary substitution),
 * OMP-specific scenario 13 (skip-internal entry) and scenario 15 (the
 * review minimum, OJS and OMP). Scenario 14 is
 * OPS-only. On a press the entry into External Review used throughout is the
 * Submission-stage "Send to External Review" decision (skip-internal,
 * OMP1); the Internal Review STAGE itself belongs to the Internal Review
 * stage feature (U71) and no test here touches its machinery.
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A1, A2, A3, A4, A5, A6, A7, A8, A9, A10,
 * A14, OMP2, OMP3 (the press's read-review window shows the shared remark,
 * which S12 asserts as the working path); U27's A21/A22
 * (the "Review Details" window's rating race and guidance paragraph).
 *
 * Seeding: scenario endpoints only; scratch submissions ride the read-only
 * `publicknowledge` press (series `monographs` auto-assigns the seeded
 * deciding editors on submit); scenario 4 uses a scratch press with
 * throwaway users because its mail assertion needs a unique throwaway
 * recipient (Mailpit is shared across fleets — never cleared, every mail
 * claim scoped by recipient address naming app + test); S11's second
 * submission sits on a scratch press too (a Series Editor who is the only
 * editorial participant, which the seeded press's auto-assignment forbids);
 * S15 runs on a scratch press created with the review minimum through the
 * context's `review` passthrough key (the seeded press keeps the default 0).
 */
const {test, expect} = require('../support/fixtures.js');
const {
    STATUS,
    DECISIONS,
    workflowModal,
    topModal,
    primaryRegion,
    actionsRegion,
    secondaryRegion,
    decisionButton,
    openEditorial,
    openAuthorView,
    minimumLine,
    expectRoundStatus,
    roundStatusBox,
    expectPlainStatus,
    awaitComposerReady,
    walkDecisionWizard,
    requestRevisions,
    completeReviewAsReviewer,
    confirmReviewAsEditor,
    completeUploadWizard,
    assignParticipant,
    openTasksPanel,
    closeTopModal,
    openReviewFilesDialog,
    showAllStageFiles,
    reviewFileCheckbox,
    confirmReviewFilesDialog,
    uploadReviewFileInDialog,
    startUploadWizard,
    closeUploadWizard,
    oldAuthorDashboardUrl,
    oldReviewRoundInfoUrl,
} = require('../pages/ReviewStagePages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const PK = 'publicknowledge';

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/**
 * Seed a monograph on publicknowledge in series `monographs` (submit-time
 * auto-assignment enrols the seeded deciding editors — spec footnote s
 * caveat holds only on scratch presses).
 */
async function seedMonograph(ompApi, tag, {decisions = [], rounds = null, submitter = 'author.alex'} = {}) {
    const spec = {
        tag,
        context: PK,
        submitter,
        series: 'monographs',
    };
    if (decisions.length) {
        spec.decisions = decisions;
    }
    if (rounds) {
        spec.reviewRounds = rounds;
    }
    return ompApi.createSubmission(spec);
}

/**
 * A real sign-in through the login form in a fresh, state-less context (the
 * `asUser` fixture reuses a cached session, which is not a login). Closes
 * the context again: the login itself is the point.
 */
async function signInFresh(browser, baseURL, username) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    const login = new LoginPage(await context.newPage());
    await login.goto();
    await login.signIn(username, getPassword(username));
    await context.close();
}

/** Seed straight into External Review round 1 (skip-internal entry). */
async function seedInExternalReview(ompApi, tag, {reviewers = [], extraRounds = [], extraDecisions = []} = {}) {
    return seedMonograph(ompApi, tag, {
        decisions: ['skipInternalReview', ...extraDecisions],
        rounds: [{stage: 'external', reviewers}, ...extraRounds],
    });
}

test.describe('Review stage & rounds (U26)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: Round 1 opens with the submission', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s1');
        const fileA = `msa-${tag}.txt`;
        const fileB = `msb-${tag}.txt`;
        const fileC = `msc-${tag}.txt`;
        // A throwaway Series Editor on a scratch press of the test's own:
        // "Review files updated." is a notice the server keeps for the
        // account until a page of it fetches it, and any other page of the
        // same account (a parallel test signed in as a roster persona) takes
        // it first (patterns.md parallel lesson 2). A scratch press's
        // submit assigns no editor (footnote s): `participants[]` does.
        const editor = `se${tag}`;
        const author = `au${tag}`;
        await ompApi.createContext({
            tag,
            users: [
                {username: editor, roles: ['sectionEditor']},
                {username: author, roles: ['author']},
            ],
        });
        const seeded = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            participants: [{username: editor, role: 'sectionEditor'}],
        });

        const page = await (await asUser(editor)).newPage();
        const modal = await openEditorial(page, tag, seeded.submissionId);

        // Two submission files for the wizard to choose from (the seed
        // carries none).
        for (const fileName of [fileA, fileB]) {
            await primaryRegion(modal)
                .getByRole('button', {name: 'Upload', exact: true})
                .first()
                .click();
            await completeUploadWizard(page, fileName);
            await expect(primaryRegion(modal).getByText(fileName).first()).toBeVisible({
                timeout: 15_000,
            });
        }

        // "Send to External Review", choosing the first file alone.
        await decisionButton(modal, 'Send to External Review').click();
        await expect(
            page.getByRole('heading', {name: /Send to External Review: Notify Authors/})
        ).toBeVisible({timeout: 15_000});
        await awaitComposerReady(page);
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(
            page.getByRole('heading', {name: 'Select Files', exact: true})
        ).toBeVisible({timeout: 15_000});
        const boxA = page.getByRole('checkbox', {name: new RegExp(fileA)});
        const boxB = page.getByRole('checkbox', {name: new RegExp(fileB)});
        await expect(boxB).toBeVisible();
        if (!(await boxA.isChecked())) {
            await boxA.check();
        }
        if (await boxB.isChecked()) {
            await boxB.uncheck();
        }
        await page.getByRole('button', {name: /Record (Editorial )?Decision/}).click();
        await expect(page.getByText('View Submission Summary')).toBeVisible({
            timeout: 30_000,
        });

        // The stage opens on Review Round 1 with the round furniture.
        const modal2 = await openEditorial(page, tag, seeded.submissionId);
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expect(modal2.getByText('Review Round 1', {exact: true}).first()).toBeVisible();
        await expectRoundStatus(modal2, 1, STATUS.waiting);
        // The Files for Review panel lists the chosen file, not the other.
        const reviewFileRow = (name) =>
            primaryRegion(modal2).getByRole('row').filter({hasText: name});
        await expect(reviewFileRow(fileA).first()).toBeVisible();
        await expect(reviewFileRow(fileB)).toHaveCount(0);

        // "Current Review Files For Round 1": the files with checkboxes;
        // the second (Submission-stage) file is listed only once "Show files
        // from all accessible workflow stages." is ticked (finding T-omp-1).
        // Tick it and confirm. (Whether the first file's box mirrors the
        // panel is A7, asserted neither way.)
        let dialog = await openReviewFilesDialog(page, modal2);
        await expect(page.getByText('Current Review Files For Round 1')).toBeVisible();
        await expect(reviewFileCheckbox(dialog, fileA)).toBeVisible();
        await expect(reviewFileCheckbox(dialog, fileB)).toHaveCount(0);
        await showAllStageFiles(dialog, fileB);
        await reviewFileCheckbox(dialog, fileB).check();
        const notice = page.getByText('Review files updated.').first();
        await confirmReviewFilesDialog(page, modal2, dialog, [fileA, fileB]);
        await expect(notice).toBeVisible({timeout: 30_000});

        // Uploading from the dialog: the new file is listed too, and the
        // files listed before are still there (nothing here deletes). The
        // first notice is gone before the second confirm, so the second
        // read is its own notice, not the lingering first one.
        await expect(notice).toBeHidden({timeout: 30_000});
        dialog = await openReviewFilesDialog(page, modal2);
        await uploadReviewFileInDialog(page, dialog, fileC);
        await confirmReviewFilesDialog(page, modal2, dialog, [fileA, fileB, fileC]);
        await expect(notice).toBeVisible({timeout: 30_000});
        await expect(reviewFileRow(fileA).first()).toBeVisible();
        await expect(reviewFileRow(fileB).first()).toBeVisible();

        // Control: the "Review" entry holds "Review Round 1" alone (the
        // Round 1 entry above is the positive read).
        await expect(modal2.getByText('Review Round 2', {exact: true})).toHaveCount(0);
    });

    test('S2: the status line follows the reviewers', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s2');
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [{username: 'reviewer.julia', status: 'invited'}],
        });

        // With a reviewer on the round, the box awaits their responses.
        const page = await (await asUser('manager.maya')).newPage();
        let modal = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal, 1, STATUS.awaitingResponses);

        // The reviewer accepts and submits their review.
        const juliaPage = await (await asUser('reviewer.julia')).newPage();
        await completeReviewAsReviewer(
            juliaPage,
            PK,
            seeded.submissionId,
            `Review remarks ${tag}.`
        );

        modal = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal, 1, STATUS.newReviews);

        // The editor confirms the review from the Reviewers panel.
        await confirmReviewAsEditor(page, modal, 'Julia Reviewer');
        modal = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal, 1, STATUS.reviewsConfirmed);
    });

    test('S3: request revisions within the round', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s3');
        const seeded = await seedInExternalReview(ompApi, tag);

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await requestRevisions(page, modal, {newRound: false});

        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal2, 1, STATUS.revisionsRequested);

        // The author's task list holds a revisions task for this submission…
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${PK}/en/dashboard/mySubmissions`);
        const tasks = await openTasksPanel(authorPage);
        await expect(tasks.getByText(`Submission ${tag}`)).toBeVisible();
        await closeTopModal(authorPage);

        // …and their review stage offers the bottom "Upload revisions" button.
        const authorModal = await openAuthorView(authorPage, PK, seeded.submissionId);
        await expect(
            authorModal.getByRole('button', {name: 'Upload revisions'})
        ).toBeVisible();
    });

    test('S4: author uploads a revision', async ({browser, baseURL, ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s4');
        const file1 = `rev1-${tag}.txt`;
        const file2 = `rev2-${tag}.txt`;
        const file3 = `rev3-${tag}.txt`;
        const manager = `mgr${tag}`;
        const editor = `ed${tag}`;
        const otherEditor = `ed2${tag}`;
        const author = `au${tag}`;
        const editorEmail = `${tag}ed@mail.test`;
        const otherEditorEmail = `${tag}ed2@mail.test`;
        const authorEmail = `${tag}au@mail.test`;
        const NOTICE = 'Revised Version Uploaded';

        // Scratch press: the revised-version notice must land in a unique
        // throwaway mailbox (the roster's addresses are shared). A second
        // Series Editor of the press is never assigned to the stage.
        await ompApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager'], givenName: `Mgr${tag}`, familyName: 'Manager'},
                {username: editor, roles: ['sectionEditor'], givenName: `Ed${tag}`, familyName: 'Editor', email: editorEmail},
                {username: otherEditor, roles: ['sectionEditor'], givenName: `Other${tag}`, familyName: 'Editor', email: otherEditorEmail},
                {username: author, roles: ['author'], givenName: `Au${tag}`, familyName: 'Author', email: authorEmail},
            ],
        });
        const seeded = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: ['skipInternalReview', 'requestRevisions'],
            reviewRounds: [{stage: 'external'}],
        });

        // Scratch presses auto-assign no editor on submit (spec footnote s):
        // assign the throwaway editor to the stage through the screens.
        const mgrPage = await (await asUser(manager)).newPage();
        const mgrModal = await openEditorial(mgrPage, tag, seeded.submissionId);
        await assignParticipant(mgrPage, mgrModal, {
            group: 'Series editor',
            query: `Ed${tag}`,
            resultName: `Ed${tag} Editor`,
        });

        // The author holds a revisions task (control for its later removal).
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/en/dashboard/mySubmissions`);
        const tasksBefore = await openTasksPanel(authorPage);
        await expect(tasksBefore.getByText(`Submission ${tag}`)).toBeVisible();
        await closeTopModal(authorPage);

        // "Upload revisions", first step only: attach the file, then close
        // the window without finishing.
        const authorModal = await openAuthorView(authorPage, tag, seeded.submissionId);
        await authorModal.getByRole('button', {name: 'Upload revisions'}).click();
        const wizard = await startUploadWizard(authorPage, file1);
        await closeUploadWizard(authorPage, wizard);
        // The Revisions Uploaded panel lists the file all the same.
        await expect(
            primaryRegion(authorModal).getByText(file1).first()
        ).toBeVisible({timeout: 15_000});

        // Editor view: the round status flipped to its submitted partner.
        const mgrModal2 = await openEditorial(mgrPage, tag, seeded.submissionId);
        await expectRoundStatus(mgrModal2, 1, STATUS.revisionsSubmitted);

        // The author's task is gone (the panel's own answer bounds the read).
        await authorPage.goto(`/index.php/${tag}/en/dashboard/mySubmissions`);
        const tasksAfter = await openTasksPanel(authorPage);
        await expect(tasksAfter.getByText(`Submission ${tag}`)).toHaveCount(0);

        // Mailbox: the assigned editor's notice, sent under the author's
        // own name and address (the abandoned wizard recalled nothing).
        const notice = await pkpMail.find({to: editorEmail, subject: NOTICE});
        expect(notice.From.Address).toBe(authorEmail);
        expect(notice.From.Name).toContain(`Au${tag}`);

        // A second upload the same day: both files listed, and no second
        // notice. The notice goes out inside the upload's own request
        // (spec footnote l), so the listed file bounds the count.
        const authorModal2 = await openAuthorView(authorPage, tag, seeded.submissionId);
        await authorModal2.getByRole('button', {name: 'Upload revisions'}).click();
        await completeUploadWizard(authorPage, file2);
        await expect(
            primaryRegion(authorModal2).getByText(file2).first()
        ).toBeVisible({timeout: 15_000});
        await expect(primaryRegion(authorModal2).getByText(file1).first()).toBeVisible();
        expect(await pkpMail.count({to: editorEmail, subject: NOTICE})).toBe(1);

        // After the Editor signs in: a third upload sends a fresh notice
        // (the sign-in re-arms the same-day throttle; a cached session is
        // not a sign-in).
        await signInFresh(browser, baseURL, editor);
        const authorModal3 = await openAuthorView(authorPage, tag, seeded.submissionId);
        await authorModal3.getByRole('button', {name: 'Upload revisions'}).click();
        await completeUploadWizard(authorPage, file3);
        await expect(
            primaryRegion(authorModal3).getByText(file3).first()
        ).toBeVisible({timeout: 15_000});
        await expect
            .poll(() => pkpMail.count({to: editorEmail, subject: NOTICE}), {timeout: 20_000})
            .toBe(2);

        // Control: the Series Editor not assigned to the stage has no notice
        // (bounded by the assigned editor's, read the same way).
        await pkpMail.expectNone({
            to: otherEditorEmail,
            subject: NOTICE,
            afterControl: {to: editorEmail, subject: NOTICE},
        });
    });

    test('S5: request revisions toward a new round', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s5');
        const fileName = `rev-${tag}.txt`;
        const seeded = await seedInExternalReview(ompApi, tag);

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await requestRevisions(page, modal, {newRound: true});

        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal2, 1, STATUS.resubmitRequested);

        // The author uploads one revised file.
        const authorPage = await (await asUser('author.alex')).newPage();
        const authorModal = await openAuthorView(authorPage, PK, seeded.submissionId);
        await authorModal.getByRole('button', {name: 'Upload revisions'}).click();
        await completeUploadWizard(authorPage, fileName);
        await expect(
            primaryRegion(authorModal).getByText(fileName).first()
        ).toBeVisible({timeout: 15_000});

        // Editor view: a new round is now needed.
        const modal3 = await openEditorial(page, PK, seeded.submissionId);
        await expectRoundStatus(modal3, 1, STATUS.resubmitSubmitted);

        // Working path after the first upload (A1's register entry owns the
        // vanished bottom button): the Revisions Uploaded panel's own
        // "Upload" control still opens the upload wizard.
        await primaryRegion(authorModal)
            .getByRole('button', {name: 'Upload', exact: true})
            .first()
            .click();
        const wizard = topModal(authorPage);
        await expect(wizard.getByText(/^Upload .* File$/).first()).toBeVisible({
            timeout: 15_000,
        });
        await wizard.getByRole('link', {name: 'Cancel', exact: true}).click();
    });

    test('S6: a new round', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s6');
        const fileName = `rev-${tag}.txt`;
        const seeded = await seedInExternalReview(ompApi, tag, {
            extraDecisions: ['resubmit'],
        });

        // The author's revised file is what the new-round wizard will offer.
        const authorPage = await (await asUser('author.alex')).newPage();
        const authorModal = await openAuthorView(authorPage, PK, seeded.submissionId);
        await authorModal.getByRole('button', {name: 'Upload revisions'}).click();
        await completeUploadWizard(authorPage, fileName);

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await decisionButton(modal, DECISIONS.newRound).click();
        await expect(
            page.getByRole('heading', {level: 1, name: /New Review Round/})
        ).toBeVisible({timeout: 15_000});
        // Walk to the file step: the revised file arrives already ticked.
        for (let i = 0; i < 4; i++) {
            if (
                await page
                    .getByRole('heading', {name: 'Select Files', exact: true})
                    .count()
            ) {
                break;
            }
            await awaitComposerReady(page);
            await page.getByRole('button', {name: 'Continue', exact: true}).click();
            await page.waitForTimeout(400);
        }
        const fileCheckbox = page.getByRole('checkbox', {name: new RegExp(fileName)});
        await expect(fileCheckbox).toBeChecked();
        await page.getByRole('button', {name: /Record (Editorial )?Decision/}).click();
        await expect(page.getByText('View Submission Summary')).toBeVisible({
            timeout: 30_000,
        });

        // Round 2 opens selected, waiting, with the carried file.
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 2)'})
        ).toBeVisible();
        await expect(modal2.getByText('Review Round 2', {exact: true}).first()).toBeVisible();
        await expectRoundStatus(modal2, 2, STATUS.waiting);
        await expect(
            primaryRegion(modal2).getByText(fileName).first()
        ).toBeVisible();
        // Round 2 (current) offers the decision buttons — the control for
        // their absence on the past round below.
        await expect(decisionButton(modal2, DECISIONS.requestRevisions)).toBeVisible();

        // The past round shows its panels, no decision buttons, and the note.
        await modal2.getByText('Review Round 1', {exact: true}).first().click();
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expect(modal2.getByText(STATUS.advancedToNextRound)).toBeVisible();
        await expect(
            primaryRegion(modal2).getByRole('heading', {name: 'Reviewers'})
        ).toBeVisible();
        await expect(decisionButton(modal2, DECISIONS.requestRevisions)).toHaveCount(0);
        await expect(decisionButton(modal2, DECISIONS.accept)).toHaveCount(0);
    });

    test('S7: cancel a round', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s7');
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [],
            extraRounds: [
                {stage: 'external', reviewers: [{username: 'reviewer.paul', status: 'invited'}]},
            ],
        });

        // Control: the invited reviewer sees the assignment in their lists.
        const paulPage = await (await asUser('reviewer.paul')).newPage();
        await paulPage.goto(`/index.php/${PK}/en/dashboard/reviewAssignments`);
        await paulPage.getByText('All assignments', {exact: true}).first().click();
        await expect(paulPage.getByText(/Showing|No Items/).first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(paulPage.getByText(`Submission ${tag}`).first()).toBeVisible();

        // Cancel Round 2 (its only reviewer has not accepted).
        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await expect(
            modal.getByRole('heading', {name: 'Workflow: External Review (Round 2)'})
        ).toBeVisible();
        await decisionButton(modal, DECISIONS.cancelRound).click();
        await expect(
            page.getByRole('heading', {level: 1, name: /Cancel Review Round/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(page);

        // Round 2 is gone; the submission stands on Round 1.
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expect(modal2.getByText('Review Round 2', {exact: true})).toHaveCount(0);

        // The withdrawn invitation left the reviewer's lists entirely.
        await paulPage.goto(`/index.php/${PK}/en/dashboard/reviewAssignments`);
        await paulPage.getByText('All assignments', {exact: true}).first().click();
        await expect(paulPage.getByText(/Showing|No Items/).first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(paulPage.getByText(`Submission ${tag}`)).toHaveCount(0);

        // Cancelling Round 1 returns the submission to the Submission stage.
        const tagB = `${tag}b`;
        const seededB = await seedInExternalReview(ompApi, tagB);
        const modalB = await openEditorial(page, PK, seededB.submissionId);
        await decisionButton(modalB, DECISIONS.cancelRound).click();
        await expect(
            page.getByRole('heading', {level: 1, name: /Cancel Review Round/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(page);
        const modalB2 = await openEditorial(page, PK, seededB.submissionId);
        await expect(
            modalB2.getByRole('heading', {name: 'Workflow: Submission'})
        ).toBeVisible();
    });

    test('S8: cancelling is blocked once a review is in', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s8');
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [{username: 'reviewer.julia', status: 'accepted'}],
        });
        // A second submission whose only reviewer declined the request.
        const tagB = `${tag}b`;
        const seededB = await seedInExternalReview(ompApi, tagB, {
            reviewers: [{username: 'reviewer.paul', status: 'declined'}],
        });
        // A third whose round holds a declined reviewer beside an accepted one.
        const tagC = `${tag}c`;
        const seededC = await seedInExternalReview(ompApi, tagC, {
            reviewers: [
                {username: 'reviewer.paul', status: 'declined'},
                {username: 'reviewer.julia', status: 'accepted'},
            ],
        });

        const juliaPage = await (await asUser('reviewer.julia')).newPage();
        await completeReviewAsReviewer(
            juliaPage,
            PK,
            seeded.submissionId,
            `Review remarks ${tag}.`
        );

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        // Positive control: the other decision buttons render…
        await expect(decisionButton(modal, DECISIONS.requestRevisions)).toBeVisible();
        await expect(decisionButton(modal, DECISIONS.accept)).toBeVisible();
        await expect(decisionButton(modal, DECISIONS.newRound)).toBeVisible();
        await expect(decisionButton(modal, DECISIONS.decline)).toBeVisible();
        // …while Cancel Review Round is simply absent, and nothing stands in
        // its place: the actions region holds exactly those four.
        await expect(decisionButton(modal, DECISIONS.cancelRound)).toHaveCount(0);
        await expect(actionsRegion(modal).getByRole('button')).toHaveCount(4);

        // A declined reviewer: "Cancel Review Round" is absent equally.
        const modalB = await openEditorial(page, PK, seededB.submissionId);
        await expect(decisionButton(modalB, DECISIONS.requestRevisions)).toBeVisible();
        await expect(decisionButton(modalB, DECISIONS.accept)).toBeVisible();
        await expect(decisionButton(modalB, DECISIONS.newRound)).toBeVisible();
        await expect(decisionButton(modalB, DECISIONS.decline)).toBeVisible();
        await expect(decisionButton(modalB, DECISIONS.cancelRound)).toHaveCount(0);

        // A declined reviewer beside an accepted one: the box reads the
        // accepted reviewer's sentence (the declined one is not counted),
        // and "Cancel Review Round" is absent here too, the other four
        // buttons being the positive read of the same region.
        const modalC = await openEditorial(page, PK, seededC.submissionId);
        await expectRoundStatus(modalC, 1, STATUS.awaitingResponses);
        await expect(decisionButton(modalC, DECISIONS.requestRevisions)).toBeVisible();
        await expect(decisionButton(modalC, DECISIONS.accept)).toBeVisible();
        await expect(decisionButton(modalC, DECISIONS.newRound)).toBeVisible();
        await expect(decisionButton(modalC, DECISIONS.decline)).toBeVisible();
        await expect(decisionButton(modalC, DECISIONS.cancelRound)).toHaveCount(0);
        await expect(actionsRegion(modalC).getByRole('button')).toHaveCount(4);
    });

    test('S9: accept out of review', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s9');
        const seeded = await seedInExternalReview(ompApi, tag);
        // A second submission that went through two rounds and was accepted
        // from Round 2 (the new round gets no reviewer).
        const tagB = `${tag}b`;
        const seededB = await seedInExternalReview(ompApi, tagB, {
            extraDecisions: ['newExternalReviewRound', 'accept'],
        });

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await decisionButton(modal, DECISIONS.accept).click();
        await expect(
            page.getByRole('heading', {level: 1, name: /Accept Submission/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(page);

        // The submission moved to Copyediting.
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: Copyediting'})
        ).toBeVisible();

        // Selecting the review stage still shows the round, its box now
        // reporting the submission's onward stage.
        await modal2.getByText('Review Round 1', {exact: true}).first().click();
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expectPlainStatus(modal2, STATUS.inCopyediting);
        // Control: the box is headed plain "Status", no longer "Round 1 Status".
        await expect(
            primaryRegion(modal2).getByRole('heading', {name: 'Round 1 Status', exact: true})
        ).toHaveCount(0);

        // A past round after acceptance: the second submission's Round 1
        // reads the advanced-and-accepted sentence with the press's
        // Copyediting stage name, headed plain "Status".
        const modalB = await openEditorial(page, PK, seededB.submissionId);
        await expect(
            modalB.getByRole('heading', {name: 'Workflow: Copyediting'})
        ).toBeVisible();
        await modalB.getByText('Review Round 1', {exact: true}).first().click();
        await expect(
            modalB.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expectPlainStatus(modalB, STATUS.advancedAndAccepted);
        await expect(primaryRegion(modalB).getByText(STATUS.inCopyediting, {exact: true})).toHaveCount(0);
    });

    test('S10: decline, revert, delete', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s10');
        // One reviewer accepted the request and has not submitted a review;
        // the seeded press assigns sectioneditor.ana (Series editor of
        // `monographs`) and the deciding editors on submit.
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [{username: 'reviewer.julia', status: 'accepted'}],
        });

        // Control: before the decline, no "Delete" stands among the Press
        // Manager's buttons (the decision buttons being the positive read).
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const mayaModal = await openEditorial(mayaPage, PK, seeded.submissionId);
        await expectRoundStatus(mayaModal, 1, STATUS.awaitingResponses);
        await expect(decisionButton(mayaModal, DECISIONS.requestRevisions)).toBeVisible();
        await expect(decisionButton(mayaModal, DECISIONS.decline)).toBeVisible();
        await expect(decisionButton(mayaModal, DECISIONS.delete)).toHaveCount(0);
        await expect(decisionButton(mayaModal, DECISIONS.revertDecline)).toHaveCount(0);

        // "Decline Submission": the Press Manager records it.
        await decisionButton(mayaModal, DECISIONS.decline).click();
        await expect(
            mayaPage.getByRole('heading', {level: 1, name: /Decline Submission/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(mayaPage);

        // The box reads "Submission declined."; the decision buttons are
        // replaced by "Revert Decline" and "Delete".
        const mayaModal2 = await openEditorial(mayaPage, PK, seeded.submissionId);
        await expectRoundStatus(mayaModal2, 1, STATUS.declined);
        await expect(decisionButton(mayaModal2, DECISIONS.revertDecline)).toBeVisible();
        await expect(decisionButton(mayaModal2, DECISIONS.delete)).toBeVisible();
        await expect(decisionButton(mayaModal2, DECISIONS.requestRevisions)).toHaveCount(0);
        await expect(decisionButton(mayaModal2, DECISIONS.decline)).toHaveCount(0);

        // The Series Editor's screen: "Revert Decline" alone, no "Delete".
        const anaPage = await (await asUser('sectioneditor.ana')).newPage();
        const anaModal = await openEditorial(anaPage, PK, seeded.submissionId);
        await expectRoundStatus(anaModal, 1, STATUS.declined);
        await expect(decisionButton(anaModal, DECISIONS.revertDecline)).toBeVisible();
        await expect(decisionButton(anaModal, DECISIONS.delete)).toHaveCount(0);
        await expect(decisionButton(anaModal, DECISIONS.requestRevisions)).toHaveCount(0);

        // "Revert Decline" puts the submission back in review, the box
        // again reading the round's reviewer sentence.
        await decisionButton(mayaModal2, DECISIONS.revertDecline).click();
        await expect(
            mayaPage.getByRole('heading', {level: 1, name: /Revert Decline/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(mayaPage);
        const mayaModal3 = await openEditorial(mayaPage, PK, seeded.submissionId);
        await expectRoundStatus(mayaModal3, 1, STATUS.awaitingResponses);
        await expect(decisionButton(mayaModal3, DECISIONS.requestRevisions)).toBeVisible();
        await expect(decisionButton(mayaModal3, DECISIONS.revertDecline)).toHaveCount(0);
    });

    test('S11: recommend-only round', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s11');
        // A declined reviewer is record enough for the recommendation
        // sentences (Rule 6).
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [{username: 'reviewer.julia', status: 'declined'}],
        });

        // Assign a Series Editor limited to recommendations.
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const mayaModal = await openEditorial(mayaPage, PK, seeded.submissionId);
        await assignParticipant(mayaPage, mayaModal, {
            group: 'Series editor',
            query: 'ravi',
            resultName: 'Ravi Section Editor',
            recommendOnly: true,
        });
        // Control: before the recommendation, the deciding editor's screen
        // shows no "Recommendation" box (the status box is the positive read).
        await expectRoundStatus(mayaModal, 1, STATUS.awaitingRecommendations);
        await expect(
            secondaryRegion(mayaModal).getByRole('heading', {name: 'Recommendation'})
        ).toHaveCount(0);

        // The recommending editor sees recommendation controls, no decisions.
        const raviPage = await (await asUser('sectioneditor.ravi')).newPage();
        const raviModal = await openEditorial(raviPage, PK, seeded.submissionId);
        await expectRoundStatus(raviModal, 1, STATUS.awaitingRecommendations);
        await expect(
            actionsRegion(raviModal).getByRole('button', {name: 'Recommend Revisions'})
        ).toBeVisible();
        await expect(
            actionsRegion(raviModal).getByRole('button', {name: 'Recommend Accept'})
        ).toBeVisible();
        await expect(
            actionsRegion(raviModal).getByRole('button', {name: 'Recommend Decline'})
        ).toBeVisible();
        await expect(decisionButton(raviModal, DECISIONS.requestRevisions)).toHaveCount(0);
        await expect(decisionButton(raviModal, DECISIONS.accept)).toHaveCount(0);
        await expect(decisionButton(raviModal, DECISIONS.decline)).toHaveCount(0);

        // They record "Accept Submission" as a recommendation.
        await actionsRegion(raviModal).getByRole('button', {name: 'Recommend Accept'}).click();
        await expect(
            raviPage.getByRole('heading', {level: 1, name: /Recommend Accept/})
        ).toBeVisible({timeout: 15_000});
        await walkDecisionWizard(raviPage);

        // The deciding editor sees the Recommendation box and the closing
        // recommendation sentence.
        const mayaModal2 = await openEditorial(mayaPage, PK, seeded.submissionId);
        await expectRoundStatus(mayaModal2, 1, STATUS.recommendationsIn);
        const recommendationBox = secondaryRegion(mayaModal2).filter({
            hasText: 'Recommendation',
        });
        await expect(
            secondaryRegion(mayaModal2).getByRole('heading', {name: 'Recommendation'})
        ).toBeVisible();
        await expect(recommendationBox.getByText('Accept Submission')).toBeVisible();

        // Sole recommending editor: on a scratch press a throwaway Series
        // Editor, limited the same way, is the only editorial participant
        // (a scratch press assigns no editor on submit, footnote s).
        const tagB = `${tag}b`;
        const manager = `mgr${tagB}`;
        const soleEditor = `se${tagB}`;
        await ompApi.createContext({
            tag: tagB,
            users: [
                {username: manager, roles: ['manager'], givenName: `Mgr${tagB}`, familyName: 'Manager'},
                {username: soleEditor, roles: ['sectionEditor'], givenName: `Se${tagB}`, familyName: 'Editor'},
                {username: `au${tagB}`, roles: ['author'], givenName: `Au${tagB}`, familyName: 'Author'},
            ],
        });
        const seededB = await ompApi.createSubmission({
            tag: tagB,
            context: tagB,
            submitter: `au${tagB}`,
            decisions: ['skipInternalReview'],
            reviewRounds: [{stage: 'external', reviewers: []}],
        });
        const mgrPage = await (await asUser(manager)).newPage();
        const mgrModal = await openEditorial(mgrPage, tagB, seededB.submissionId);
        await assignParticipant(mgrPage, mgrModal, {
            group: 'Series editor',
            query: `Se${tagB}`,
            resultName: `Se${tagB} Editor`,
            recommendOnly: true,
        });
        // No reviewer record: the round without a reviewer reads the
        // waiting sentence, not the recommendation one (Ravi's round above,
        // with its declined reviewer, is the positive read of that sentence).
        await expectRoundStatus(mgrModal, 1, STATUS.waiting);
        await expect(
            primaryRegion(mgrModal).getByText(STATUS.awaitingRecommendations, {exact: true})
        ).toHaveCount(0);
        const solePage = await (await asUser(soleEditor)).newPage();
        const soleModal = await openEditorial(solePage, tagB, seededB.submissionId);
        // No buttons of either kind (Ravi's recommendation buttons above are
        // the positive read of the same region)…
        await expect(soleModal.getByRole('heading', {name: 'Recommendation'})).toBeVisible();
        await expectRoundStatus(soleModal, 1, STATUS.waiting);
        await expect(
            primaryRegion(soleModal).getByText(STATUS.awaitingRecommendations, {exact: true})
        ).toHaveCount(0);
        await expect(
            actionsRegion(soleModal).getByRole('button', {name: /^Recommend /})
        ).toHaveCount(0);
        await expect(decisionButton(soleModal, DECISIONS.requestRevisions)).toHaveCount(0);
        await expect(decisionButton(soleModal, DECISIONS.accept)).toHaveCount(0);
        await expect(decisionButton(soleModal, DECISIONS.decline)).toHaveCount(0);
        await expect(actionsRegion(soleModal).getByRole('button')).toHaveCount(0);
        // …and the "Recommendation" box explains why.
        await expect(
            soleModal.getByText(
                'You can not make a recommendation until an editor is assigned with permission to record a decision.'
            )
        ).toBeVisible();
    });

    test('S12: author reads an open review', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s12');
        const remark = `Shared remarks ${tag} for the author.`;
        // Two submissions of author.alex: the first with an open review
        // accepted and not yet submitted (made open on screen below) and a
        // decision letter; the second with a completed anonymous review.
        const seeded = await seedInExternalReview(ompApi, tag, {
            reviewers: [{username: 'reviewer.julia', status: 'accepted'}],
        });
        const tagB = `${tag}b`;
        const seededB = await seedInExternalReview(ompApi, tagB, {
            reviewers: [{username: 'reviewer.paul', status: 'completed'}],
        });
        const reviewersList = (modal) => modal.locator('[data-cy="reviewer-manager"]');

        // Make the review OPEN (per-assignment review type — the seeded
        // default is anonymous).
        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        const row = reviewersList(modal)
            .getByRole('row')
            .filter({hasText: 'Julia Reviewer'});
        await row.getByRole('button', {name: 'More Actions'}).click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const editModal = topModal(page);
        await expect(editModal.getByText('Review Type')).toBeVisible({timeout: 20_000});
        await editModal.getByLabel('Open', {exact: true}).check();
        await editModal.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(row.getByText('Open', {exact: true})).toBeVisible({timeout: 20_000});

        // The decision letter for the "Notifications" list (Rule 16).
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await requestRevisions(page, modal2, {newRound: false});

        // Fresh in review: the second submission shows only the two
        // ever-present panels; no letters, no reviewers list (not even an
        // empty one), no "Upload revisions" (no revision request there).
        const authorPage = await (await asUser('author.alex')).newPage();
        const authorModalB = await openAuthorView(authorPage, PK, seededB.submissionId);
        await expect(
            primaryRegion(authorModalB).getByRole('heading', {name: 'Round 1 Status'})
        ).toBeVisible();
        await expect(
            primaryRegion(authorModalB).getByRole('heading', {name: 'Revisions Uploaded'})
        ).toBeVisible();
        await expect(
            authorModalB.getByRole('heading', {name: 'Review Tasks & Discussions'})
        ).toBeVisible();
        await expect(authorModalB.getByRole('heading', {name: 'Notifications'})).toHaveCount(0);
        await expect(reviewersList(authorModalB)).toHaveCount(0);
        await expect(authorModalB.getByRole('button', {name: 'Read Review'})).toHaveCount(0);
        await expect(authorModalB.getByText('Paul Reviewer')).toHaveCount(0);
        await expect(authorModalB.getByRole('button', {name: 'Upload revisions'})).toHaveCount(0);

        // An open review under way: the first submission lists no reviewer
        // yet, while its letter and its "Upload revisions" button (the
        // positive reads for the absences above) are there.
        const authorModalA = await openAuthorView(authorPage, PK, seeded.submissionId);
        await expect(authorModalA.getByRole('heading', {name: 'Notifications'})).toBeVisible();
        await expect(authorModalA.getByRole('button', {name: 'Upload revisions'})).toBeVisible();
        await expect(reviewersList(authorModalA)).toHaveCount(0);
        await expect(authorModalA.getByRole('button', {name: 'Read Review'})).toHaveCount(0);
        await expect(authorModalA.getByText('Julia Reviewer')).toHaveCount(0);

        // Reviewer: the open reviewer types the shared remark in "For author
        // and editor" and submits.
        const juliaPage = await (await asUser('reviewer.julia')).newPage();
        await completeReviewAsReviewer(juliaPage, PK, seeded.submissionId, remark);

        // "Read Review": the author's view now lists the reviewer.
        const authorModal = await openAuthorView(authorPage, PK, seeded.submissionId);
        await expect(reviewersList(authorModal)).toBeVisible({timeout: 15_000});
        await expect(authorModal.getByText('Julia Reviewer')).toBeVisible({timeout: 15_000});
        await authorModal.getByRole('button', {name: 'Read Review'}).click();
        const readModal = topModal(authorPage);
        // Reviewer name, completion date, and the shared remarks (the press
        // shows the text). No recommendation-line
        // claim (OMP2 ❓) and nothing about attachments (A3 ❓).
        await expect(readModal.getByText('Julia Reviewer').first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(readModal.getByText(/Completed/).first()).toBeVisible();
        await expect(readModal.getByText(remark)).toBeVisible();
        await closeTopModal(authorPage);

        // "Notifications": the decision letter as a subject line; it opens
        // read-only in a side panel.
        await expect(
            authorModal.getByRole('heading', {name: 'Notifications'})
        ).toBeVisible();
        await authorModal
            .getByText('Your submission has been reviewed and we encourage you to submit revisions')
            .first()
            .click();
        const letterModal = topModal(authorPage);
        await expect(letterModal.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(letterModal.getByRole('textbox')).toHaveCount(0);
        await closeTopModal(authorPage);

        // Old addresses: the author-dashboard address lands on My
        // Submissions with the workflow open…
        await authorPage.goto(oldAuthorDashboardUrl(PK, seeded.submissionId));
        await expect(authorPage).toHaveURL(
            new RegExp(`/dashboard/mySubmissions\\?.*workflowSubmissionId=${seeded.submissionId}`)
        );
        await expect(
            workflowModal(authorPage).getByRole('heading', {name: /^Workflow:/}).first()
        ).toBeVisible({timeout: 20_000});
        // …and the old per-round address answers a bare "404 Not Found"
        // page, with and without an id.
        for (const url of [
            oldReviewRoundInfoUrl(PK, seeded.submissionId),
            oldReviewRoundInfoUrl(PK),
        ]) {
            const response = await authorPage.goto(url);
            expect(response?.status()).toBe(404);
            await expect(authorPage.getByText('404 Not Found')).toBeVisible();
            await expect(authorPage.getByRole('heading', {name: /^Workflow:/})).toHaveCount(0);
        }

        // Control: the second submission, its anonymous review completed,
        // still shows no reviewers list at all (the first's list above is
        // the positive read).
        const authorModalB2 = await openAuthorView(authorPage, PK, seededB.submissionId);
        await expect(
            primaryRegion(authorModalB2).getByRole('heading', {name: 'Revisions Uploaded'})
        ).toBeVisible();
        await expect(reviewersList(authorModalB2)).toHaveCount(0);
        await expect(authorModalB2.getByRole('button', {name: 'Read Review'})).toHaveCount(0);
        await expect(authorModalB2.getByText('Paul Reviewer')).toHaveCount(0);
    });

    test('S13: straight to External Review (skip-internal entry)', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s13');
        const seeded = await seedMonograph(ompApi, tag);

        const page = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        // The Submission stage offers both review entries; External skips
        // the internal stage.
        await expect(decisionButton(modal, 'Send to Internal Review')).toBeVisible();
        await decisionButton(modal, 'Send to External Review').click();
        await expect(
            page.getByRole('heading', {name: /Send to External Review: Notify Authors/})
        ).toBeVisible({timeout: 15_000});
        await awaitComposerReady(page);
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(
            page.getByRole('heading', {name: 'Select Files', exact: true})
        ).toBeVisible({timeout: 15_000});
        await page.getByRole('button', {name: /Record (Editorial )?Decision/}).click();
        await expect(page.getByText('View Submission Summary')).toBeVisible({
            timeout: 30_000,
        });

        // External Review Round 1 opens exactly as in scenario 1, and the
        // menu still carries the separate Internal Review stage entry.
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expect(
            modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})
        ).toBeVisible();
        await expect(modal2.getByText('Review Round 1', {exact: true}).first()).toBeVisible();
        await expectRoundStatus(modal2, 1, STATUS.waiting);
        await expect(
            modal2.getByText('Internal Review', {exact: true}).first()
        ).toBeVisible();
    });

    test('S15: a minimum of confirmed reviews', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u26s15');
        const editor = `ed${tag}`;
        const author = `au${tag}`;
        const reviewer = `rv${tag}`;
        const reviewerName = `Rev${tag} Reviewer`;
        const MINIMUM = minimumLine(2);

        // Scratch press with "Minimum Confirmed Reviews Required" at 2
        // through the context's `review` passthrough key; a throwaway
        // Press Editor, Author and External Reviewer. The editor is assigned
        // to the stage in the seed (a scratch press assigns no editor on
        // submit, footnote s); the reviewer accepted and has not submitted.
        await ompApi.createContext({
            tag,
            review: {numReviewsPerSubmission: 2},
            users: [
                {username: editor, roles: ['editor'], givenName: `Ed${tag}`, familyName: 'Editor'},
                {username: author, roles: ['author'], givenName: `Au${tag}`, familyName: 'Author'},
                {username: reviewer, roles: ['externalReviewer'], givenName: `Rev${tag}`, familyName: 'Reviewer'},
            ],
        });
        const seeded = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: ['skipInternalReview'],
            reviewRounds: [{stage: 'external', reviewers: [{username: reviewer, status: 'accepted'}]}],
            participants: [{username: editor, role: 'editor'}],
        });

        // The review underway: the minimum line, with the reviewer sentence
        // beneath it.
        const page = await (await asUser(editor)).newPage();
        let modal = await openEditorial(page, tag, seeded.submissionId);
        await expectRoundStatus(modal, 1, STATUS.awaitingResponses);
        await expect(roundStatusBox(modal, 1)).toHaveText(
            `Round 1 Status ${MINIMUM} ${STATUS.awaitingResponses}`
        );

        // The review submitted: the minimum line, with "New reviews have
        // been submitted." beneath it.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        await completeReviewAsReviewer(reviewerPage, tag, seeded.submissionId, `Review remarks ${tag}.`);
        modal = await openEditorial(page, tag, seeded.submissionId);
        await expectRoundStatus(modal, 1, STATUS.newReviews);
        await expect(roundStatusBox(modal, 1)).toHaveText(
            `Round 1 Status ${MINIMUM} ${STATUS.newReviews}`
        );

        // "Read Review" → "Mark as Complete": the box reads the minimum line
        // alone; "All reviews are confirmed and a decision is needed." does
        // not appear (nor the minimum's own "confirmed" sentence: one of two).
        await confirmReviewAsEditor(page, modal, reviewerName);
        modal = await openEditorial(page, tag, seeded.submissionId);
        await expect(roundStatusBox(modal, 1).getByText(MINIMUM, {exact: true})).toBeVisible();
        await expect(roundStatusBox(modal, 1).getByText(STATUS.reviewsConfirmed, {exact: true})).toHaveCount(0);
        await expect(roundStatusBox(modal, 1).getByText(STATUS.minimumConfirmed, {exact: true})).toHaveCount(0);
        await expect(roundStatusBox(modal, 1)).toHaveText(`Round 1 Status ${MINIMUM}`);

        // Control: on the seeded press (minimum 0) a confirmed review reads
        // "All reviews are confirmed and a decision is needed." with no
        // minimum line (S2's end state, reached the same way).
        const tagB = `${tag}b`;
        const seededB = await seedInExternalReview(ompApi, tagB, {
            reviewers: [{username: 'reviewer.paul', status: 'completed'}],
        });
        const mayaPage = await (await asUser('manager.maya')).newPage();
        let mayaModal = await openEditorial(mayaPage, PK, seededB.submissionId);
        await expectRoundStatus(mayaModal, 1, STATUS.newReviews);
        await confirmReviewAsEditor(mayaPage, mayaModal, 'Paul Reviewer');
        mayaModal = await openEditorial(mayaPage, PK, seededB.submissionId);
        await expectRoundStatus(mayaModal, 1, STATUS.reviewsConfirmed);
        await expect(
            roundStatusBox(mayaModal, 1).getByText(/Minimum number of confirmed reviews required/)
        ).toHaveCount(0);
        await expect(roundStatusBox(mayaModal, 1)).toHaveText(
            `Round 1 Status ${STATUS.reviewsConfirmed}`
        );
    });
});
