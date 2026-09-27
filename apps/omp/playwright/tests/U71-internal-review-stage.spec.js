// @ts-check
/**
 * @file playwright/tests/U71-internal-review-stage.spec.js
 *
 * U71 — Internal Review stage, OMP suite. One test per canonical scenario
 * the spec runs on a press: scenarios 1–9 (the feature is {OMP}, so every
 * common scenario runs here); scenario 10 is {OJS OPS}, run by those
 * suites. Its "Control" bullet, on the seeded press, is read here in part:
 * S1 reads the queued monograph's "Internal Review" menu entry and its
 * "Send to Internal Review" button; no test here reads the press's Roles
 * tab.
 * Spec: docs/specs/U71-internal-review-stage.md
 *
 * Deliberately NOT covered, by register ID (the spec's Coverage section is
 * the record of everything else left out; a 🐞 is never asserted as the
 * contract, a ❓ is not a gap):
 * - OMP1 🐞 (no author task after "Request Revisions"): S2 does not read the
 *   author's Tasks panel.
 * - OMP2 🐞 (the empty "Revisions" list of "Accept Submission" and "Create
 *   New Review Round"): S4 and S5 record those decisions without reading
 *   their "Select Files" page, nor the files that reach the next stage.
 * - OMP3 ❓, OMP5 ❓, OMP8 🐞: nothing opens those states.
 * - OMP4 ❓: S3 reads the "Select Files" page as the scenario states it.
 * - OMP6 ❓: S2 and S7 read the wizard opening at once; no typed address.
 * - OMP7 🐞 (the author pressing the stage entry): S1–S5 open the author's
 *   rounds only.
 * - OMP9 🐞 (the stage address without a number): no test types it.
 * - OMP10 🐞 (no Copyediting notice): S4 reads nothing of Copyediting's
 *   notice box.
 *
 * Seeding: scenario endpoints only; the seeded press and roster are
 * read-only (PRINCIPLES A1, A7). S1 and S3–S6 seed scratch monographs on
 * `publicknowledge` in series `monographs`, whose submit-time
 * auto-assignment enrols `editor.diana` (footnote s). S2 and S7–S9 each
 * create a scratch press with throwaway accounts: S2 reads a mailbox
 * (every mail read scoped by a throwaway address, every silence bounded by
 * a message that did arrive, A8), S7 needs a recommend-only Series Editor
 * beside a deciding one, S8 and S9 a review setting at its non-default end
 * (the `review` passthrough keys). The author's revised file has no seed
 * key (scenarios.md "Field shapes not built yet"): S3 and S4 upload it
 * through the author's "Upload revisions" before the scenario's first
 * step, as footnote s says; the decisions under test are recorded on
 * screen. Tags are unique per run (M5); waits are web-first (A5).
 * Everything runs in the parallel `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    InternalReviewStage,
    ROUND_STATUS,
    DECISIONS,
    ROUND_DECISIONS,
    ROUND_DECISIONS_NO_CANCEL,
    RECOMMEND_BUTTONS,
    minimumLine,
    currentlyInStage,
    advancedAndInStage,
    notInitiated,
} = require('../../../../shared/playwright/pages/InternalReviewPages.js');
const {ReviewerAssignmentsPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {workflowModal, completeUploadWizard, confirmReviewAsEditor} = require('../pages/ReviewStagePages.js');
const {addReviewerFromList} = require('../pages/ReviewerAssignmentPages.js');

const PRESS = 'publicknowledge';
const EDITOR = 'editor.diana';
const MANAGER = 'manager.maya';
const SERIES_EDITOR = 'sectioneditor.ana';
const AUTHOR = 'author.alex';
const COPYEDITOR = 'copyeditor.carla';
const INTERNAL = 'Internal Review';
const EXTERNAL = 'External Review';
const REVISED_NOTICE = 'Revised Version Uploaded';

/** The editorial view's h3s on an active internal round (Rules 4, 5). */
const EDITORIAL_HEADINGS = (round) => [
    `Round ${round} Status`,
    'Revisions Uploaded',
    'Files for Review',
    'Reviewers',
    'Review Tasks & Discussions',
    'Participants',
];

/** The author's view of a round without a "Reviewers" list (Rule 15). */
const AUTHOR_HEADINGS = (round) => [`Round ${round} Status`, 'Revisions Uploaded', 'Review Tasks & Discussions'];

/** The Assign window's role list on Internal Review (Actors row 1; Settings bullet 6). */
const ASSIGN_ROLES = ['Press editor', 'Series editor', 'Funding coordinator', 'Author', 'Volume editor', 'Translator'];

/** Unique per-run tag: one alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u71${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

const mailOf = (username) => `${username}@mail.test`;

/** A monograph on the seeded press rides series `monographs` (its editors auto-assigned); a scratch press has none. */
async function seedMonograph(ompApi, tag, {context = PRESS, submitter = AUTHOR, title = `Monograph ${tag}`, ...rest} = {}) {
    const spec = {tag, context, submitter, title, ...rest};
    if (context === PRESS) {
        spec.series = 'monographs';
    }
    return await ompApi.createSubmission(spec);
}

/**
 * A page as a user, with the stage page object. A page-leave question
 * (`beforeunload`) is accepted so an address typed next is not cancelled;
 * every other browser box is left to the test.
 */
async function stageAs(asUser, appContext, username, contextPath = PRESS) {
    const context = await asUser(username);
    const page = await context.newPage();
    page.on('dialog', (dialog) => {
        if (dialog.type() === 'beforeunload') {
            dialog.accept().catch(() => {});
        }
    });
    return {page, stage: new InternalReviewStage(page, contextPath, {appContext})};
}

/** The author uploads one revised file through "Upload revisions" (footnote s's given for S3 and S4). */
async function uploadRevision(author, submissionId, fileName) {
    await author.stage.gotoAuthor(submissionId);
    await author.stage.uploadRevisionsButton().click();
    await completeUploadWizard(author.page, fileName);
    await expect(author.stage.panelRow('Revisions Uploaded', fileName)).toHaveCount(1, {timeout: 30_000});
}

test.describe('Internal Review stage (U71)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: Round 1 of Internal Review opens', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        // Given: a queued monograph with one submission file and a
        // Copyeditor assigned (footnote s).
        const seeded = await seedMonograph(ompApi, tag, {
            files: [{file: 'article.pdf'}],
            participants: [{username: COPYEDITOR, role: 'copyeditor'}],
        });
        const id = seeded.submissionId;
        const ed = await stageAs(asUser, appContext, EDITOR);
        await ed.stage.gotoEditorial(id);
        await ed.stage.frame.expectHeading('Workflow: Submission');
        // S10's control on the press: the queued monograph's menu lists
        // "Internal Review" and its Submission stage offers "Send to
        // Internal Review" (Rule 1; Actors row 2).
        await expect(ed.stage.stageEntryLink(INTERNAL)).toBeVisible();
        await expect(ed.stage.actionButton(DECISIONS.sendInternal)).toBeVisible();

        // ── "Send to Internal Review" (Rules 1–3) ─────────────────────────
        await ed.stage.pressDecision(DECISIONS.sendInternal);
        await ed.stage.recordDecision();
        await ed.stage.expectRounds(['Review Round 1']);
        await ed.stage.expectRoundSelected(1);
        await ed.stage.expectOnRound(1);
        await ed.stage.expectRoundStatus(1, ROUND_STATUS.waiting);

        // ── The panels (Rules 4, 5) ───────────────────────────────────────
        await expect(ed.stage.frame.languageLine()).toBeVisible();
        await ed.stage.frame.expectStatusAbovePanel(ROUND_STATUS.waiting, 'Revisions Uploaded', 'Round 1 Status');
        await ed.stage.expectHeadings(EDITORIAL_HEADINGS(1));
        await expect(ed.stage.panelWrapper('Reviewers').getByRole('button', {name: 'Add Reviewer', exact: true})).toBeVisible();
        await expect(ed.stage.frame.participantsHeading()).toBeVisible();
        // No "Reviewers Suggested by Author" and no "Author Response" (the
        // exact heading list above is the settled positive read).
        await expect(ed.stage.frame.dialog().getByText(/Reviewers Suggested by Author/i)).toHaveCount(0);
        await expect(ed.stage.frame.dialog().getByRole('table', {name: /Author Response/i})).toHaveCount(0);

        // ── The decision buttons (Rules 8, 9) ─────────────────────────────
        await ed.stage.expectActionButtons(ROUND_DECISIONS);

        // ── "Assign" (Actors row 1; Settings bullet 6) ────────────────────
        const assign = await ed.stage.participants.openAssign();
        await expect.poll(() => assign.roleOptions(), {timeout: 30_000}).toEqual(ASSIGN_ROLES);
        await assign.cancel();

        // ── "Add Reviewer" (Rules 3, 4) ───────────────────────────────────
        await addReviewerFromList(ed.page, workflowModal(ed.page), {search: 'Amara', name: 'Amara Reviewer'});
        await expect(ed.stage.reviewerRow('Amara Reviewer')).toHaveCount(1);
        await ed.stage.expectRoundStatus(1, ROUND_STATUS.awaitingResponses);

        // ── The stage entry (Rule 7a) ─────────────────────────────────────
        await ed.stage.selectStageEntry();
        await ed.stage.expectPlainStatus(ROUND_STATUS.advancedToNextRound);
        await expect(ed.stage.panel('Files for Review')).toBeVisible();
        await ed.stage.expectNoDecisionButtons();
        await expect(ed.stage.frame.actionItems()).toHaveCount(0);
        await expect(ed.stage.frame.secondaryColumn()).toHaveCount(0);

        // ── The Copyeditor (Actors row 1) ─────────────────────────────────
        const ce = await stageAs(asUser, appContext, COPYEDITOR);
        await ce.stage.gotoEditorial(id);
        await ce.stage.stageEntryLink(INTERNAL).click();
        await ce.stage.frame.expectNoAccessOnly();
        await expect(ce.stage.frame.panelTables()).toHaveCount(0);

        // ── The author's view (Rules 2, 15, 15a, 16; Settings bullet 2) ───
        const au = await stageAs(asUser, appContext, AUTHOR);
        await au.stage.gotoAuthor(id);
        await au.stage.expectRoundHeading(1);
        await au.stage.expectRoundSelected(1);
        await au.stage.expectHeadings(AUTHOR_HEADINGS(1));
        await expect(au.stage.panel('Reviewers')).toHaveCount(0);
        await expect(au.stage.uploadRevisionsButton()).toHaveCount(0);

        // ── Control (Rule 9) ──────────────────────────────────────────────
        await ed.stage.selectRound(1);
        await ed.stage.expectActionButtons(ROUND_DECISIONS);
    });

    test('S2: Revisions asked for and uploaded on the same round', async ({asUser, ompApi, appContext, pkpMail}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const mgr = `${tag}mg`;
        const ed = `${tag}ed`;
        const se = `${tag}se`;
        const rec = `${tag}rc`;
        const fc = `${tag}fc`;
        const rv = `${tag}rv`;
        const au = `${tag}au`;
        const revFile = `rev${tag}.txt`;
        await ompApi.createContext({
            tag,
            context: {name: `Press ${tag}`},
            users: [
                user(mgr, 'Mona', 'Manager', ['manager']),
                user(ed, 'Erin', 'Editor', ['editor']),
                user(se, 'Sela', 'Series', ['sectionEditor']),
                user(rec, 'Remy', 'Recommender', ['sectionEditor']),
                user(fc, 'Fay', 'Funding', ['funding']),
                user(rv, 'Iris', 'Internal', ['internalReviewer']),
                user(au, 'Ava', 'Author', ['author']),
            ],
        });
        const seeded = await seedMonograph(ompApi, tag, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: rv, status: 'completed'}]}],
            participants: [
                {username: ed, role: 'editor'},
                {username: se, role: 'sectionEditor'},
                {username: rec, role: 'sectionEditor', recommendOnly: true},
                {username: fc, role: 'funding'},
            ],
        });
        const id = seeded.submissionId;

        // ── The round (Rules 3, 8, 9) ─────────────────────────────────────
        const pe = await stageAs(asUser, appContext, ed, tag);
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.newReviews);
        await pe.stage.expectActionButtons(ROUND_DECISIONS_NO_CANCEL);

        // ── Control: before "Request Revisions" (Rule 15a) ────────────────
        const author = await stageAs(asUser, appContext, au, tag);
        await author.stage.gotoAuthor(id);
        await author.stage.expectRoundHeading(1);
        await author.stage.expectHeadings(AUTHOR_HEADINGS(1));
        await expect(author.stage.uploadRevisionsButton()).toHaveCount(0);

        // ── "Request Revisions" (Rules 11, 12) ────────────────────────────
        await pe.stage.pressDecision(DECISIONS.requestRevisions);
        expect(new URL(pe.page.url()).pathname).toContain('/decision/record/');
        await expect(pe.page.getByRole('dialog', {name: 'Request Revisions', exact: true})).toHaveCount(0);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.revisionsRequested);

        // ── The author's view (Rules 15a, 16; Settings bullet 2) ──────────
        await author.stage.gotoAuthor(id);
        await author.stage.expectRoundHeading(1);
        await author.stage.expectRoundStatus(1, ROUND_STATUS.revisionsRequested);
        await expect(
            author.stage.frame.actionItems().getByRole('button', {name: 'Upload revisions', exact: true})
        ).toBeVisible();
        await author.stage.expectHeadings(AUTHOR_HEADINGS(1));
        await expect(author.stage.panel('Reviewers')).toHaveCount(0);

        // ── "Upload revisions" (Rules 12, 15a) ────────────────────────────
        await author.stage.uploadRevisionsButton().click();
        await completeUploadWizard(author.page, revFile);
        await expect(author.stage.panelRow('Revisions Uploaded', revFile)).toHaveCount(1, {timeout: 30_000});
        await author.stage.expectRoundStatus(1, ROUND_STATUS.revisionsSubmitted);
        await expect(author.stage.uploadRevisionsButton()).toBeVisible();

        // ── The editors' side (Rule 12) ───────────────────────────────────
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.revisionsSubmitted);
        await expect(pe.stage.panelRow('Revisions Uploaded', revFile)).toHaveCount(1);

        // ── The email (Side effects, the first bullet) ────────────────────
        const notice = await pkpMail.find({to: mailOf(ed), subject: REVISED_NOTICE});
        expect(notice.From.Name).toContain('Ava Author');
        expect(notice.From.Address).toBe(mailOf(au));
        expect(notice.To.map((r) => r.Address).sort()).toEqual([mailOf(ed), mailOf(se), mailOf(rec)].sort());
        expect(await pkpMail.count({to: mailOf(ed), subject: REVISED_NOTICE})).toBe(1);
        for (const silent of [fc, mgr]) {
            await pkpMail.expectNone({
                to: mailOf(silent),
                subject: REVISED_NOTICE,
                afterControl: {to: mailOf(ed), subject: REVISED_NOTICE},
            });
        }

        // ── The Funding Coordinator (Actors rows 1, 3) ────────────────────
        const funding = await stageAs(asUser, appContext, fc, tag);
        await funding.stage.gotoEditorial(id);
        await funding.stage.expectRoundHeading(1);
        await expect(funding.stage.panel('Files for Review')).toBeVisible();
        await expect(funding.stage.panel('Revisions Uploaded')).toBeVisible();
        await expect(funding.stage.panelRow('Revisions Uploaded', revFile)).toHaveCount(1);
        await funding.stage.expectNoDecisionButtons();
    });

    test('S3: On to External Review, and back by "Cancel Review Round"', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const revFile = `rev${tag}.txt`;
        const reviewFile = 'article.pdf';
        const titleA = `First ${tag}`;
        const first = await seedMonograph(ompApi, tag, {
            title: titleA,
            decisions: ['sendInternalReview', 'requestRevisionsInternal'],
            reviewRounds: [
                {stage: 'internal', files: [{file: reviewFile}], reviewers: [{username: 'reviewer.amara', status: 'completed'}]},
            ],
        });
        const second = await seedMonograph(ompApi, `${tag}b`, {
            title: `Second ${tag}`,
            decisions: ['sendInternalReview', 'sendExternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: 'reviewer.amara', status: 'completed'}]}],
        });
        // Given: the Author's revised file on the first monograph's round.
        const author = await stageAs(asUser, appContext, AUTHOR);
        await uploadRevision(author, first.submissionId, revFile);

        const pe = await stageAs(asUser, appContext, EDITOR);
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1);
        const internalRevNo = await pe.stage.fileNumber('Revisions Uploaded', revFile);
        const internalReviewNo = await pe.stage.fileNumber('Files for Review', reviewFile);

        // ── "Send to External Review" (Rules 12, 13a) ─────────────────────
        await pe.stage.pressDecision(DECISIONS.sendExternal);
        expect(await pe.stage.continueToSelectFiles()).toBe(true);
        await pe.stage.expectSelectFilesLists(['Revisions']);
        await expect(pe.stage.selectFileRows()).toHaveCount(1);
        await expect(pe.stage.selectFileCheckbox(revFile)).toBeChecked();
        await expect(pe.stage.selectFileRows().filter({hasText: reviewFile})).toHaveCount(0);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1, EXTERNAL);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.waiting);
        const externalNos = await pe.stage.fileNumbers('Files for Review', revFile);
        expect(externalNos).toHaveLength(1);
        expect(externalNos[0]).not.toBe(internalRevNo);
        await pe.stage.expectPanelEmpty('Revisions Uploaded');

        // ── The internal round, left behind (Rules 3, 8, 13a, 18) ─────────
        await pe.stage.selectRound(1, INTERNAL);
        await pe.stage.expectPlainStatus(currentlyInStage(EXTERNAL));
        await expect(pe.stage.panelRow('Files for Review', reviewFile)).toHaveCount(1);
        await expect(pe.stage.panelRow('Revisions Uploaded', revFile)).toHaveCount(1);
        expect(await pe.stage.fileNumber('Revisions Uploaded', revFile)).toBe(internalRevNo);
        await pe.stage.expectNoDecisionButtons();

        // ── A reviewer added there (Rule 18) ──────────────────────────────
        await addReviewerFromList(pe.page, workflowModal(pe.page), {search: 'Adam', name: 'Adam Reviewer'});
        await expect(pe.stage.reviewerRow('Adam Reviewer')).toHaveCount(1);
        await pe.stage.frame.expectStage(`${EXTERNAL} (Round 1)`);
        await pe.stage.selectRound(1, EXTERNAL);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.waiting);

        // ── The stage entry (Rule 7a) ─────────────────────────────────────
        await pe.stage.selectStageEntry(INTERNAL);
        await pe.stage.expectPlainStatus(advancedAndInStage(EXTERNAL));
        await pe.stage.expectNoDecisionButtons();

        // ── The author's view (Rules 3, 15a) ──────────────────────────────
        await author.stage.gotoAuthor(first.submissionId);
        await author.stage.selectRound(1, INTERNAL);
        await author.stage.expectPlainStatus(currentlyInStage(EXTERNAL));
        await expect(author.stage.uploadRevisionsButton()).toHaveCount(0);

        // ── The second monograph, before (Rules 3, 8) ─────────────────────
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectOnRound(1, EXTERNAL);
        await pe.stage.selectRound(1, INTERNAL);
        await pe.stage.expectPlainStatus(currentlyInStage(EXTERNAL));
        await pe.stage.expectNoDecisionButtons();

        // ── "Cancel Review Round" on External Review (Rules 9, 17b) ───────
        await pe.stage.selectRound(1, EXTERNAL);
        await pe.stage.pressDecision(DECISIONS.cancelRound);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectOnRound(1, INTERNAL);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.accepted);
        await pe.stage.expectActionButtons(ROUND_DECISIONS_NO_CANCEL);
        await pe.stage.expectRounds([], EXTERNAL);

        // ── Control (Rule 6) ──────────────────────────────────────────────
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1, EXTERNAL);
        await expect(pe.stage.panelRows('Files for Review')).toHaveCount(1, {timeout: 30_000});
        expect(await pe.stage.fileNumber('Files for Review', revFile)).toBe(externalNos[0]);
        await expect(pe.stage.panelRow('Files for Review', reviewFile)).toHaveCount(0);
        await expect(pe.stage.panelRow('Files for Review', internalReviewNo)).toHaveCount(0);
        await pe.stage.expectPanelEmpty('Revisions Uploaded');
    });

    test('S4: Accepted straight for Copyediting, and back by "Move to Review"', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const revFile = `rev${tag}.txt`;
        const seeded = await seedMonograph(ompApi, tag, {
            decisions: ['sendInternalReview', 'requestRevisionsInternal'],
            reviewRounds: [
                {stage: 'internal', files: [{file: 'article.pdf'}], reviewers: [{username: 'reviewer.amara', status: 'completed'}]},
            ],
        });
        const id = seeded.submissionId;
        const author = await stageAs(asUser, appContext, AUTHOR);
        await uploadRevision(author, id, revFile);

        const pe = await stageAs(asUser, appContext, EDITOR);
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.revisionsSubmitted);

        // ── "Accept Submission" (Rule 12) ─────────────────────────────────
        await pe.stage.pressDecision(DECISIONS.accept);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(id);
        await pe.stage.frame.expectStage('Copyediting');
        await pe.stage.frame.expectHeading('Workflow: Copyediting');
        await pe.stage.selectStageEntry(EXTERNAL);
        await pe.stage.expectPlainStatus(notInitiated(EXTERNAL));

        // ── The internal round, left behind (Rules 3, 8, 12, 18) ──────────
        await pe.stage.selectRound(1, INTERNAL);
        await pe.stage.expectPlainStatus(currentlyInStage('Copyediting'));
        await expect(pe.stage.panelWrapper('Reviewers').getByRole('button', {name: 'Add Reviewer', exact: true})).toBeVisible();
        await pe.stage.expectNoDecisionButtons();

        // ── The author's view (Rules 3, 15a) ──────────────────────────────
        await author.stage.gotoAuthor(id);
        await author.stage.selectRound(1, INTERNAL);
        await author.stage.expectPlainStatus(currentlyInStage('Copyediting'));
        await expect(author.stage.uploadRevisionsButton()).toHaveCount(0);

        // ── "Move to Review" (Rules 8, 9, 17a) ────────────────────────────
        await pe.stage.gotoEditorial(id);
        await pe.stage.frame.expectHeading('Workflow: Copyediting');
        await pe.stage.pressDecision('Move to Review', /Move to (Review|Submission)/);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.returnedToReview);
        await pe.stage.expectActionButtons(ROUND_DECISIONS_NO_CANCEL);

        // ── Control (Rule 17a) ────────────────────────────────────────────
        await pe.stage.selectStageEntry(EXTERNAL);
        await pe.stage.expectPlainStatus(notInitiated(EXTERNAL));
    });

    test('S5: A second internal round, and cancelled rounds', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const title = `First ${tag}`;
        const first = await seedMonograph(ompApi, tag, {
            title,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: 'reviewer.amara', status: 'completed'}]}],
        });
        const second = await seedMonograph(ompApi, `${tag}b`, {decisions: ['sendInternalReview']});

        // ── Control: Round 1 with a completed review (Rule 9) ─────────────
        const pe = await stageAs(asUser, appContext, EDITOR);
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1);
        await pe.stage.expectActionButtons(ROUND_DECISIONS_NO_CANCEL);

        // ── "Create New Review Round" (Rules 2, 12) ───────────────────────
        await pe.stage.pressDecision(DECISIONS.newRound, /New Review Round/);
        await pe.stage.recordDecision();
        await pe.stage.expectRounds(['Review Round 1', 'Review Round 2']);
        await pe.stage.expectRoundSelected(2);
        await pe.stage.expectOnRound(2);
        await pe.stage.expectRoundStatus(2, ROUND_STATUS.waiting);
        await pe.stage.expectPanelEmpty('Reviewers');

        // ── Round 1, past (Rules 8, 12) ───────────────────────────────────
        await pe.stage.selectRound(1);
        await pe.stage.expectPlainStatus(ROUND_STATUS.advancedToNextRound);
        await pe.stage.expectNoDecisionButtons();

        // ── The author's view (Rule 2) ────────────────────────────────────
        const author = await stageAs(asUser, appContext, AUTHOR);
        await author.stage.gotoAuthor(first.submissionId);
        await author.stage.expectRoundHeading(2);

        // ── A request on Round 2 (Side effects) ───────────────────────────
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(2);
        await addReviewerFromList(pe.page, workflowModal(pe.page), {search: 'Adam', name: 'Adam Reviewer'});
        await expect(pe.stage.reviewerRow('Adam Reviewer')).toHaveCount(1);
        const adamPage = await (await asUser('reviewer.adam')).newPage();
        const adamList = new ReviewerAssignmentsPage(adamPage, PRESS);
        await adamList.goto('actionRequired');
        await expect(adamList.row(title)).toHaveCount(1);

        // ── "Cancel Review Round" on Round 2 (Rules 2, 9, 12) ─────────────
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(2);
        await pe.stage.expectActionButtons(ROUND_DECISIONS);
        await pe.stage.pressDecision(DECISIONS.cancelRound);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectRounds(['Review Round 1']);
        await pe.stage.expectRoundHeading(1);
        await adamList.expectInViews(title, []);

        // ── "Cancel Review Round" on the only round (Rule 12; Actors row 2) ─
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectOnRound(1);
        await pe.stage.pressDecision(DECISIONS.cancelRound);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.frame.expectStage('Submission');
        await pe.stage.frame.expectHeading('Workflow: Submission');
        await expect(pe.stage.actionButton(DECISIONS.sendInternal)).toBeVisible();
        await pe.stage.expectRounds([], INTERNAL);
    });

    test('S6: Declined on Internal Review, and reverted', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        const seeded = await seedMonograph(ompApi, tag, {
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: 'reviewer.amara'}]}],
            participants: [{username: SERIES_EDITOR, role: 'sectionEditor'}],
        });
        const id = seeded.submissionId;

        // ── Control: the Press Manager before the decline (Rule 10) ───────
        const mgr = await stageAs(asUser, appContext, MANAGER);
        await mgr.stage.gotoEditorial(id);
        await mgr.stage.expectOnRound(1);
        await mgr.stage.expectActionButtons(ROUND_DECISIONS);

        // ── "Decline Submission" (Rules 10, 12; Actors row 10) ────────────
        const se = await stageAs(asUser, appContext, SERIES_EDITOR);
        await se.stage.gotoEditorial(id);
        await se.stage.expectOnRound(1);
        await se.stage.pressDecision(DECISIONS.decline);
        await se.stage.recordDecision();
        await se.stage.gotoEditorial(id);
        await se.stage.frame.expectStage('Declined');
        await se.stage.expectRoundStatus(1, ROUND_STATUS.declined);
        await se.stage.expectActionButtons([DECISIONS.revertDecline]);

        // ── The Press Manager (Rule 10) ───────────────────────────────────
        await mgr.stage.gotoEditorial(id);
        await mgr.stage.expectRoundStatus(1, ROUND_STATUS.declined);
        await expect
            .poll(async () => (await mgr.stage.frame.actionButtonLabels()).sort(), {timeout: 30_000})
            .toEqual([DECISIONS.delete, DECISIONS.revertDecline].sort());

        // ── "Revert Decline" (Rules 2, 8, 12) ─────────────────────────────
        await se.stage.gotoEditorial(id);
        await se.stage.pressDecision(DECISIONS.revertDecline);
        await se.stage.recordDecision();
        await se.stage.gotoEditorial(id);
        await se.stage.expectOnRound(1);
        await se.stage.expectRoundStatus(1, ROUND_STATUS.awaitingResponses);
        await se.stage.expectActionButtons(ROUND_DECISIONS);

        // ── Control: the Press Manager after the revert (Rule 10) ─────────
        await mgr.stage.gotoEditorial(id);
        await mgr.stage.expectOnRound(1);
        await mgr.stage.expectActionButtons(ROUND_DECISIONS);
    });

    test('S7: A recommending editor on an internal round', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const ed = `${tag}ed`;
        const se = `${tag}se`;
        const au = `${tag}au`;
        const rv = `${tag}rv`;
        await ompApi.createContext({
            tag,
            context: {name: `Press ${tag}`},
            users: [
                user(ed, 'Erin', 'Editor', ['editor']),
                user(se, 'Remy', 'Recommender', ['sectionEditor']),
                user(au, 'Ava', 'Author', ['author']),
                user(rv, 'Iris', 'Internal', ['internalReviewer']),
            ],
        });
        const seeded = await seedMonograph(ompApi, tag, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: rv}]}],
            participants: [
                {username: ed, role: 'editor'},
                {username: se, role: 'sectionEditor', recommendOnly: true},
            ],
        });
        const id = seeded.submissionId;

        // ── Control: no "Recommendation" box yet (Actors row 8) ───────────
        const pe = await stageAs(asUser, appContext, ed, tag);
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await expect(pe.stage.frame.participantsHeading()).toBeVisible();
        await pe.stage.expectActionButtons(ROUND_DECISIONS);
        await expect(pe.stage.recommendationBox()).toHaveCount(0);

        // ── The recommending editor's round (Rules 3, 14a) ────────────────
        const rec = await stageAs(asUser, appContext, se, tag);
        await rec.stage.gotoEditorial(id);
        await rec.stage.expectOnRound(1);
        await rec.stage.expectRoundStatus(1, ROUND_STATUS.awaitingResponses);
        await rec.stage.expectActionButtons(RECOMMEND_BUTTONS);
        await expect(rec.stage.actionButton(DECISIONS.recommendResubmit)).toHaveCount(0);

        // ── "Recommend Send to External Review" (Rules 14b, 14c) ──────────
        await rec.stage.pressDecision(DECISIONS.recommendSendExternal);
        await rec.stage.recordDecision();
        await rec.stage.gotoEditorial(id);
        await expect(rec.stage.recommendationBox()).toContainText(DECISIONS.sendExternal, {timeout: 30_000});
        await expect(rec.stage.changeDecisionButton()).toBeVisible();
        await rec.stage.expectRoundStatus(1, ROUND_STATUS.recommendationsIn);

        // ── The deciding editor's side (Rules 4, 8, 14b, 14c) ─────────────
        await pe.stage.gotoEditorial(id);
        await pe.stage.expectOnRound(1);
        await expect(
            pe.stage.frame
                .secondaryColumn()
                .locator('div.border')
                .filter({has: pe.page.getByRole('heading', {name: /^recommendation$/i})})
        ).toContainText(DECISIONS.sendExternal, {timeout: 30_000});
        await expect
            .poll(
                async () =>
                    (await pe.stage.frame.secondaryColumn().locator('h2, h3').allTextContents()).map((t) => t.trim()),
                {timeout: 30_000}
            )
            .toEqual(['Recommendation', 'Participants']);
        await pe.stage.expectRoundStatus(1, ROUND_STATUS.recommendationsIn);
        await pe.stage.expectActionButtons(ROUND_DECISIONS);
        await expect(pe.stage.reviewerRow('Iris Internal')).toHaveCount(1);

        // ── The author's view (Rule 14c) ──────────────────────────────────
        const author = await stageAs(asUser, appContext, au, tag);
        await author.stage.gotoAuthor(id);
        await author.stage.expectRoundStatus(1, ROUND_STATUS.recommendationsIn);

        // ── "Change decision" (Rules 11, 14a, 14b) ────────────────────────
        await rec.stage.gotoEditorial(id);
        const before = rec.page.url();
        await rec.stage.changeDecisionButton().click();
        await rec.stage.expectActionButtons(RECOMMEND_BUTTONS);
        await expect(rec.page.getByRole('dialog')).toHaveCount(1);
        expect(rec.page.url()).toBe(before);
        await expect(rec.stage.recommendationBox()).toContainText(DECISIONS.sendExternal);
        await rec.stage.pressDecision(DECISIONS.recommendRevisions);
        expect(new URL(rec.page.url()).pathname).toContain('/decision/record/');
        await expect(rec.page.getByRole('dialog', {name: 'Request Revisions', exact: true})).toHaveCount(0);
        await rec.stage.recordDecision();
        await rec.stage.gotoEditorial(id);
        await expect(rec.stage.recommendationBox()).toContainText(DECISIONS.requestRevisions, {timeout: 30_000});
        await expect(rec.stage.recommendationBox()).not.toContainText(DECISIONS.sendExternal);
        await pe.stage.gotoEditorial(id);
        await expect(pe.stage.recommendationBox()).toContainText(DECISIONS.requestRevisions, {timeout: 30_000});
        await expect(pe.stage.recommendationBox()).not.toContainText(DECISIONS.sendExternal);
    });

    test('S8: The Author reads an open internal review', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        const ed = `${tag}ed`;
        const au = `${tag}au`;
        const rv1 = `${tag}r1`;
        const rv2 = `${tag}r2`;
        const rv3 = `${tag}r3`;
        await ompApi.createContext({
            tag,
            context: {name: `Press ${tag}`},
            review: {defaultReviewMode: 'open'},
            users: [
                user(ed, 'Erin', 'Editor', ['editor']),
                user(au, 'Ava', 'Author', ['author']),
                user(rv1, 'Olga', 'Done', ['internalReviewer']),
                user(rv2, 'Pia', 'Pending', ['internalReviewer']),
                user(rv3, 'Dan', 'Declined', ['internalReviewer']),
            ],
        });
        const first = await seedMonograph(ompApi, tag, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: rv1, status: 'completed'}, {username: rv2}]}],
            participants: [{username: ed, role: 'editor'}],
        });
        const second = await seedMonograph(ompApi, `${tag}b`, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: rv3, status: 'declined'}]}],
            participants: [{username: ed, role: 'editor'}],
        });

        // ── A completed open review (Rules 15, 16; Settings bullet 2) ─────
        const author = await stageAs(asUser, appContext, au, tag);
        await author.stage.gotoAuthor(first.submissionId);
        await author.stage.expectRoundHeading(1);
        await author.stage.expectHeadings(['Round 1 Status', 'Reviewers', 'Revisions Uploaded', 'Review Tasks & Discussions']);
        const rows = author.stage.panelRows('Reviewers');
        await expect(rows).toHaveCount(1, {timeout: 30_000});
        await expect(rows.first()).toContainText('Olga Done');
        await expect(rows.first().getByRole('button', {name: 'Read Review', exact: true})).toBeVisible();
        await expect(author.stage.panel('Reviewers')).not.toContainText('Pia Pending');

        // ── The editor's side (Rule 4) ────────────────────────────────────
        const pe = await stageAs(asUser, appContext, ed, tag);
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1);
        await expect(pe.stage.reviewerRow('Olga Done')).toHaveCount(1, {timeout: 30_000});
        await expect(pe.stage.reviewerRow('Pia Pending')).toHaveCount(1);

        // ── A declined open request (Rule 16) ─────────────────────────────
        await author.stage.gotoAuthor(second.submissionId);
        await author.stage.expectRoundHeading(1);
        await author.stage.expectHeadings(AUTHOR_HEADINGS(1));
        await expect(author.stage.panel('Reviewers')).toHaveCount(0);
        // Control: the install's "Default Review Mode" gave S2's Author no
        // "Reviewers" list on a round holding a completed review (S2).
    });

    test('S9: A minimum of confirmed reviews on an internal round', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        const ed = `${tag}ed`;
        const au = `${tag}au`;
        const rv1 = `${tag}r1`;
        const rv2 = `${tag}r2`;
        const rv3 = `${tag}r3`;
        await ompApi.createContext({
            tag,
            context: {name: `Press ${tag}`},
            review: {numReviewsPerSubmission: 2},
            users: [
                user(ed, 'Erin', 'Editor', ['editor']),
                user(au, 'Ava', 'Author', ['author']),
                user(rv1, 'Ivy', 'Invited', ['internalReviewer']),
                user(rv2, 'Cai', 'Complete', ['internalReviewer']),
                user(rv3, 'Coe', 'Complete', ['internalReviewer']),
            ],
        });
        const first = await seedMonograph(ompApi, tag, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: [{username: rv1}]}],
            participants: [{username: ed, role: 'editor'}],
        });
        const second = await seedMonograph(ompApi, `${tag}b`, {
            context: tag,
            submitter: au,
            decisions: ['sendInternalReview'],
            reviewRounds: [
                {stage: 'internal', reviewers: [{username: rv2, status: 'completed'}, {username: rv3, status: 'completed'}]},
            ],
            participants: [{username: ed, role: 'editor'}],
        });

        // ── The line (Settings bullet 1) ──────────────────────────────────
        const pe = await stageAs(asUser, appContext, ed, tag);
        await pe.stage.gotoEditorial(first.submissionId);
        await pe.stage.expectOnRound(1);
        const firstLines = [minimumLine(2), ROUND_STATUS.awaitingResponses];
        await pe.stage.expectRoundStatusLines(1, firstLines);

        // ── Three decisions that ask ──────────────────────────────────────
        for (const label of [DECISIONS.accept, DECISIONS.requestRevisions, DECISIONS.newRound]) {
            await pe.stage.pressExpectingMinimumDialog(label);
            await pe.stage.answerMinimumDialog('Cancel');
            await expect(pe.stage.wizardHeading()).toHaveCount(0);
            expect(new URL(pe.page.url()).pathname).not.toContain('/decision/record/');
            await pe.stage.expectRoundStatusLines(1, firstLines);
            await pe.stage.expectActionButtons(ROUND_DECISIONS);
        }

        // ── Three that do not ─────────────────────────────────────────────
        for (const label of [DECISIONS.sendExternal, DECISIONS.decline, DECISIONS.cancelRound]) {
            await pe.stage.pressDecision(label);
            await expect(pe.stage.minimumDialog()).toHaveCount(0);
            await pe.stage.leaveWizard();
            await pe.stage.expectOnRound(1);
            await pe.stage.expectRoundStatusLines(1, firstLines);
        }

        // ── Control: a completed review counts only once confirmed ────────
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectOnRound(1);
        await pe.stage.pressExpectingMinimumDialog(DECISIONS.accept);
        await pe.stage.answerMinimumDialog('Cancel');

        // ── The minimum met ───────────────────────────────────────────────
        await confirmReviewAsEditor(pe.page, workflowModal(pe.page), 'Cai Complete');
        await confirmReviewAsEditor(pe.page, workflowModal(pe.page), 'Coe Complete');
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectRoundStatusLines(1, [minimumLine(2), ROUND_STATUS.minimumConfirmed]);
        await pe.stage.pressDecision(DECISIONS.accept);
        await expect(pe.stage.minimumDialog()).toHaveCount(0);
        await pe.stage.leaveWizard();

        // ── External Review counts its own ────────────────────────────────
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.pressDecision(DECISIONS.sendExternal);
        await pe.stage.recordDecision();
        await pe.stage.gotoEditorial(second.submissionId);
        await pe.stage.expectOnRound(1, EXTERNAL);
        await pe.stage.expectRoundStatusLines(1, [minimumLine(2), ROUND_STATUS.waiting]);
    });
});
