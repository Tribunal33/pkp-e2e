// @ts-check
/**
 * @file playwright/tests/U32-copyediting-stage.spec.js
 *
 * U32 — Copyediting stage, OMP suite (spec:
 * docs/specs/U32-copyediting-stage.md). One test per canonical scenario the
 * spec runs on a press, in the press's own words (Press Manager, Press
 * Editor, Series editor, monograph, External and Internal Review): the
 * common scenarios 1–8 and the press-only scenario 9 ("Move to Review"
 * after an internal round only, OMP1). Scenario 10 is OPS's.
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A1, A6, A8, A10 (no scenario reaches them);
 * A7 (S4 deletes the copyedited file and reads the row gone, not the
 * notice after), A4 (S3 deletes the task through the panel's own "Delete",
 * the working path; nothing is asserted about copyedits clearing it), A5
 * (S1 reads the recommending Series editor's screen without the decision
 * buttons, and nothing about recommendation controls). A3: S4 reads the
 * "Assign a copyeditor…" notice before the upload as Rule 3a's working
 * path (no discussion exists); the ❓ about the assignment is parked.
 * OMP1 ✅ is asserted in S7 and S9.
 *
 * Seeding: scenario endpoints only; scratch monographs ride the read-only
 * `publicknowledge` press in series `monographs` (its submit-time
 * auto-assignment enrols `editor.diana`, the assigned Press Editor of every
 * seeded-press scenario, and the Series editor `sectioneditor.ana`); a
 * submission at Copyediting after review is `['skipInternalReview',
 * 'accept']` (footnote s; the direct route into External Review on a
 * press). Seeded submissions carry no files, so every file is uploaded
 * through the screen its scenario names. S3, S6 and S7 read a mailbox and
 * run each on its own scratch press with throwaway Press Editor, Copyeditor
 * and Author accounts (Mailpit is shared across fleets: every mail claim is
 * scoped by a recipient address naming app and test, A8), the throwaway
 * editor assigned in the seed since a scratch press auto-assigns nobody.
 * Every absence is a settled read paired with a positive control on the
 * same screen (M4, M6). Everything runs in the parallel `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    STATUS,
    primaryRegion,
    actionsRegion,
    decisionButton,
    openEditorial,
    expectRoundStatus,
    expectPlainStatus,
    awaitComposerReady,
    walkDecisionWizard,
    completeUploadWizard,
    uploadRoundReviewFile,
    assignParticipant,
    expectStageLabel,
} = require('../pages/ReviewStagePages.js');
const {
    COPYEDITING_DECISIONS,
    NOTICES,
    STAGE_STATUS,
    LISTS,
    DISCUSSIONS_PANEL,
    PRODUCTION_READY,
    SELECT_WINDOW_TITLES,
    UPLOAD_WIZARD_TITLES,
    COMPLETIONS,
    AUTHOR_MAILS,
    REQUEST_COPYEDIT,
    FILE_COLUMNS,
    openCopyediting,
    openAuthorCopyediting,
    selectStage,
    noticeHeading,
    expectNotice,
    expectNoNotice,
    mainHeadings,
    statusHeading,
    fileList,
    listHeading,
    listDescription,
    uploadSelectButton,
    fileRow,
    fileRows,
    rowNumber,
    columnHeaders,
    rowMenuButton,
    discussionRow,
    participantsPanel,
    participantsHeading,
    deleteFileRow,
    openSelectWindow,
    selectWindowTitled,
    allStagesBox,
    windowGroup,
    windowFileBox,
    windowCancel,
    saveSelectWindow,
    uploadInSelectWindow,
    uploadIntoList,
    wizardSteps,
    viewSubmissionSummary,
    startSendToProduction,
    wizardFileBox,
    recordAndExpectCompletion,
    startMoveToReview,
    expectDecisionButtons,
    expectNoDecisionButtons,
} = require('../pages/CopyeditingStagePages.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');

const PK = 'publicknowledge';

/** The press's route into Copyediting through an external round (footnote s). */
const VIA_REVIEW = ['skipInternalReview', 'accept'];

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/**
 * Seed a monograph on publicknowledge in series `monographs` (submit-time
 * auto-assignment enrols the seeded deciding editors and the Series editor).
 */
async function seedMonograph(ompApi, tag, {decisions = [], participants = null, submitter = 'author.alex'} = {}) {
    const spec = {tag, context: PK, submitter, series: 'monographs'};
    if (decisions.length) {
        spec.decisions = decisions;
    }
    if (participants) {
        spec.participants = participants;
    }
    return ompApi.createSubmission(spec);
}

/**
 * A scratch press with a throwaway Press Editor and Author (and, when asked,
 * two Copyeditors), and one monograph accepted from its external round with
 * the editor assigned (a scratch press assigns nobody on submit).
 */
async function seedScratchPress(ompApi, tag, {copyeditors = false} = {}) {
    const editor = `${tag}ed`;
    const author = `${tag}au`;
    const users = [
        {username: editor, roles: ['editor'], givenName: `Ed${tag}`, familyName: 'Editor', email: `${tag}ed@mail.test`},
        {username: author, roles: ['author'], givenName: `Au${tag}`, familyName: 'Author', email: `${tag}au@mail.test`},
    ];
    const press = {tag, editor, author, editorEmail: `${tag}ed@mail.test`, authorEmail: `${tag}au@mail.test`};
    if (copyeditors) {
        press.copyeditorA = `${tag}cea`;
        press.copyeditorB = `${tag}ceb`;
        press.copyeditorAEmail = `${tag}cea@mail.test`;
        press.copyeditorBEmail = `${tag}ceb@mail.test`;
        users.push(
            {username: press.copyeditorA, roles: ['copyeditor'], givenName: `Cea${tag}`, familyName: 'Copyeditor', email: press.copyeditorAEmail},
            {username: press.copyeditorB, roles: ['copyeditor'], givenName: `Ceb${tag}`, familyName: 'Copyeditor', email: press.copyeditorBEmail}
        );
    }
    await ompApi.createContext({tag, users});
    const seeded = await ompApi.createSubmission({
        tag,
        context: tag,
        submitter: author,
        decisions: VIA_REVIEW,
        participants: [{username: editor, role: 'editor'}],
    });
    return {...press, submissionId: seeded.submissionId, title: `Submission ${tag}`};
}

test.describe('Copyediting stage (U32)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: open a monograph at Copyediting', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s1');
        const seeded = await seedMonograph(ompApi, tag, {decisions: VIA_REVIEW});

        // The assigned Press Editor: the stage bubble, the notice, the four
        // panels in order with their descriptions, Participants on the right.
        const page = await (await asUser('editor.diana')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await expectStageLabel(modal, 'Copyediting');
        await expect(mainHeadings(modal)).toHaveText([
            'Notification',
            LISTS.draft,
            DISCUSSIONS_PANEL,
            LISTS.copyedited,
        ]);
        await expectNotice(modal, NOTICES.assign);
        await expect(listDescription(modal, LISTS.draft)).toBeVisible();
        await expect(listDescription(modal, LISTS.copyedited)).toBeVisible();
        await expect(participantsHeading(modal)).toBeVisible();

        // The decision buttons: "Send To Production" highlighted, then "Move
        // to Review"; no "Schedule For Publication" shortcut (the two
        // buttons are the positive read of the same region).
        await expectDecisionButtons(modal);
        await expect(decisionButton(modal, COPYEDITING_DECISIONS.sendToProduction)).toHaveClass(/\bbg-primary\b/);
        await expect(decisionButton(modal, COPYEDITING_DECISIONS.moveToReview)).not.toHaveClass(/\bbg-primary\b/);
        await expect(modal.getByRole('button', {name: 'Schedule For Publication'})).toHaveCount(0);

        // Control: no status box above "Draft Files"; the notice takes that
        // slot (the notice and list headings above are the positive read).
        await expect(statusHeading(modal)).toHaveCount(0);

        // The recommending Series editor: assigned with "Assignment
        // privileges" limited to recommendations through the "Assign" form.
        // `sectioneditor.ravi` (Series editor of `textbooks`): the
        // `monographs` Series editors, `sectioneditor.omar` among them, are
        // auto-assigned on submit and so not offered by the form.
        await assignParticipant(page, modal, {
            group: 'Series editor',
            query: 'ravi',
            resultName: 'Ravi Section Editor',
            recommendOnly: true,
        });

        // The Press Manager not assigned: the same four panels and both
        // buttons, and no notice box.
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const mayaModal = await openEditorial(mayaPage, PK, seeded.submissionId);
        await expect(mainHeadings(mayaModal)).toHaveText([LISTS.draft, DISCUSSIONS_PANEL, LISTS.copyedited]);
        await expect(participantsHeading(mayaModal)).toBeVisible();
        await expectDecisionButtons(mayaModal);
        await expectNoNotice(mayaModal);

        // The recommending Series editor: the four panels with "Assign" on
        // "Participants"; neither decision button. (The scenario claims the
        // panels alone; this screen showed no notice box, returned as
        // finding T-omp-1 and not asserted either way.)
        const raviPage = await (await asUser('sectioneditor.ravi')).newPage();
        const raviModal = await openEditorial(raviPage, PK, seeded.submissionId);
        await expect(mainHeadings(raviModal)).toHaveText([LISTS.draft, DISCUSSIONS_PANEL, LISTS.copyedited]);
        await expect(participantsHeading(raviModal)).toBeVisible();
        await expect(participantsPanel(raviModal).getByRole('button', {name: 'Assign'})).toBeVisible();
        await expectNoDecisionButtons(raviModal);
    });

    test('S2: accept a monograph with its revision', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s2');
        const reviewFile = `forreview-${tag}.txt`;
        const revision = `revision-${tag}.txt`;
        const seeded = await seedMonograph(ompApi, tag, {decisions: ['skipInternalReview']});

        // The round holds one file in "Files for Review" and one revision
        // uploaded on the round (the seed carries none).
        const page = await (await asUser('editor.diana')).newPage();
        const modal = await openEditorial(page, PK, seeded.submissionId);
        await expect(modal.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})).toBeVisible();
        await uploadRoundReviewFile(page, modal, reviewFile);
        await primaryRegion(modal).getByRole('button', {name: 'Upload', exact: true}).first().click();
        await completeUploadWizard(page, revision);
        await expect(primaryRegion(modal).getByText(revision).first()).toBeVisible({timeout: 15_000});

        // "Accept Submission": the "Select Files" page offers the revision
        // under "Revisions" and not the file in "Files for Review".
        await decisionButton(modal, 'Accept Submission').click();
        await expect(page.getByRole('heading', {level: 1, name: /Accept Submission/})).toBeVisible({timeout: 15_000});
        await awaitComposerReady(page);
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(page.getByRole('heading', {name: 'Select Files', exact: true})).toBeVisible({timeout: 15_000});
        await expect(page.getByText('Revisions', {exact: true}).first()).toBeVisible();
        await expect(wizardFileBox(page, revision)).toBeVisible();
        await expect(wizardFileBox(page, reviewFile)).toHaveCount(0);
        if (!(await wizardFileBox(page, revision).isChecked())) {
            await wizardFileBox(page, revision).check();
        }
        await walkDecisionWizard(page);

        // The stage bubble reads "Copyediting" and "Draft Files" lists the
        // revision with the four columns; the notice above reads 3a.
        const modal2 = await openEditorial(page, PK, seeded.submissionId);
        await expectStageLabel(modal2, 'Copyediting');
        await expect(fileRow(modal2, LISTS.draft, revision).first()).toBeVisible({timeout: 15_000});
        await expect(columnHeaders(modal2, LISTS.draft)).toContainText(FILE_COLUMNS);
        await expectNotice(modal2, NOTICES.assign);

        // The file's name downloads the file.
        const downloadPromise = page.waitForEvent('download', {timeout: 20_000});
        await fileRow(modal2, LISTS.draft, revision).first().getByRole('link', {name: revision}).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBeTruthy();

        // Control: the file in "Files for Review" is not in "Draft Files".
        await expect(fileRow(modal2, LISTS.draft, reviewFile)).toHaveCount(0);
    });

    test('S3: assign a Copyeditor with "Request Copyedit"', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s3');
        const press = await seedScratchPress(ompApi, tag, {copyeditors: true});

        // "Assign" the first Copyeditor with "Request Copyedit": the notice
        // flips to "Awaiting Copyedits." and the discussions panel lists
        // the discussion.
        const page = await (await asUser(press.editor)).newPage();
        const modal = await openEditorial(page, tag, press.submissionId);
        await expectNotice(modal, NOTICES.assign);
        await assignParticipant(page, modal, {
            group: 'Copyeditor',
            query: `Cea${tag}`,
            resultName: `Cea${tag} Copyeditor`,
            template: REQUEST_COPYEDIT.template,
        });
        await expectNotice(modal, NOTICES.awaiting);
        await expect(discussionRow(modal, REQUEST_COPYEDIT.template).first()).toBeVisible({timeout: 20_000});

        // The Copyeditor's mailbox: "Request Copyedit" from the assigning
        // editor, opening with the number and title, the steps, the reply
        // link into the discussion.
        const mail = await pkpMail.find({to: press.copyeditorAEmail, subject: REQUEST_COPYEDIT.subject});
        expect(mail.From.Address).toBe(press.editorEmail);
        const full = await pkpMail.fullMessage(mail.ID);
        // The plain-text body wraps after the colon.
        expect(full.Text).toMatch(
            new RegExp(`${REQUEST_COPYEDIT.bodyOpening}\\s+${press.submissionId} — "${press.title}"`)
        );
        expect(full.Text).toContain('Please follow these steps to complete this task');
        expect(full.Text).toContain('Reply to this comment');
        expect(full.Text).toContain(`workflowSubmissionId=${press.submissionId}`);

        // The Copyeditor's Tasks panel: the discussion row and the task;
        // "Delete" on the task leaves the discussion row.
        const cePage = await (await asUser(press.copyeditorA)).newPage();
        await cePage.goto(`/index.php/${tag}/en/dashboard/editorial`);
        const tasks = new TasksPanel(cePage);
        await tasks.open();
        const taskRow = tasks.row(REQUEST_COPYEDIT.task(press.title));
        const discussionTaskRow = tasks.rowsOpening(REQUEST_COPYEDIT.discussionRow);
        await expect(taskRow).toHaveCount(1);
        await expect(discussionTaskRow).toHaveCount(1);
        await tasks.box(taskRow).check();
        await tasks.act('Delete');
        await expect(taskRow).toHaveCount(0);
        await expect(discussionTaskRow).toHaveCount(1);

        // Control: the second Copyeditor, assigned with no predefined
        // message and the box left empty, receives no email (bounded by the
        // first Copyeditor's, read the same way).
        const modal2 = await openEditorial(page, tag, press.submissionId);
        await assignParticipant(page, modal2, {
            group: 'Copyeditor',
            query: `Ceb${tag}`,
            resultName: `Ceb${tag} Copyeditor`,
        });
        await pkpMail.expectNone({
            to: press.copyeditorBEmail,
            afterControl: {to: press.copyeditorAEmail, subject: REQUEST_COPYEDIT.subject},
        });
    });

    test('S4: the Copyeditor uploads the copyedited file', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s4');
        const fileName = `copyedited-${tag}.txt`;
        const seeded = await seedMonograph(ompApi, tag, {
            decisions: VIA_REVIEW,
            participants: [{username: 'copyeditor.carla', role: 'copyeditor'}],
        });

        // The Press Editor before the upload: the notice reads 3a (the
        // assignment opened no discussion), both decision buttons offered.
        const edPage = await (await asUser('editor.diana')).newPage();
        const edModal = await openEditorial(edPage, PK, seeded.submissionId);
        await expectNotice(edModal, NOTICES.assign);
        await expectDecisionButtons(edModal);

        // The Copyeditor's screen: the four panels with "Upload/Select
        // Files" above each list; no notice, no decision buttons.
        const cePage = await (await asUser('copyeditor.carla')).newPage();
        const ceModal = await openEditorial(cePage, PK, seeded.submissionId);
        await expect(mainHeadings(ceModal)).toHaveText([LISTS.draft, DISCUSSIONS_PANEL, LISTS.copyedited]);
        await expect(participantsHeading(ceModal)).toBeVisible();
        await expect(uploadSelectButton(ceModal, LISTS.draft)).toBeVisible();
        await expect(uploadSelectButton(ceModal, LISTS.copyedited)).toBeVisible();
        await expectNoNotice(ceModal);
        await expectNoDecisionButtons(ceModal);

        // "Upload/Select Files" on "Copyedited Files" › "Upload File": the
        // wizard "Upload Copyedited File" with its three steps; the file is
        // listed with the four columns after the window's "OK". The window
        // itself is titled "Upload/Select Files" (Rule 5).
        const window = await openSelectWindow(cePage, ceModal, LISTS.copyedited);
        await expect(selectWindowTitled(cePage, SELECT_WINDOW_TITLES[LISTS.copyedited])).toBeVisible();
        await uploadInSelectWindow(cePage, window, fileName, {expectTitle: UPLOAD_WIZARD_TITLES[LISTS.copyedited]});
        await saveSelectWindow(window);
        await expect(fileRow(ceModal, LISTS.copyedited, fileName).first()).toBeVisible({timeout: 20_000});
        await expect(columnHeaders(ceModal, LISTS.copyedited)).toContainText(FILE_COLUMNS);

        // The Press Editor after the upload: no notice (the list heading
        // and the buttons are the positive read of the same screen).
        const edModal2 = await openEditorial(edPage, PK, seeded.submissionId);
        await expect(fileRow(edModal2, LISTS.copyedited, fileName).first()).toBeVisible({timeout: 20_000});
        await expectDecisionButtons(edModal2);
        await expectNoNotice(edModal2);

        // "Delete" on the copyedited file: the dialog, "OK", the row gone
        // (the list's table stays as the positive read). A7 (the notice
        // afterwards) is not read.
        const ceModal2 = await openEditorial(cePage, PK, seeded.submissionId);
        await deleteFileRow(cePage, ceModal2, LISTS.copyedited, fileName);
        await expect(fileList(ceModal2, LISTS.copyedited)).toBeVisible();

        // Control: the Copyeditor's screen never offers the decisions.
        await expectNoDecisionButtons(ceModal2);
        await expect(uploadSelectButton(ceModal2, LISTS.copyedited)).toBeVisible();
    });

    test('S5: the "Upload/Select Files" window on "Draft Files"', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s5');
        const copyedited = `copyedited-${tag}.txt`;
        const submissionFile = `manuscript-${tag}.txt`;
        const uploaded = `draft-${tag}.txt`;
        const seeded = await seedMonograph(ompApi, tag, {decisions: VIA_REVIEW});

        // The given: one copyedited file, one submission file, "Draft
        // Files" empty.
        const page = await (await asUser('editor.diana')).newPage();
        let modal = await openEditorial(page, PK, seeded.submissionId);
        await uploadIntoList(page, modal, LISTS.copyedited, copyedited);
        await selectStage(modal, 'Submission');
        await primaryRegion(modal).getByRole('button', {name: 'Upload', exact: true}).first().click();
        await completeUploadWizard(page, submissionFile);
        const submissionRow = fileRow(modal, 'Submission Files', submissionFile).first();
        await expect(submissionRow).toBeVisible({timeout: 15_000});
        const submissionNumber = await rowNumber(submissionRow);
        modal = await openCopyediting(page, PK, seeded.submissionId);
        await expect(fileRows(modal, LISTS.draft)).toHaveCount(0);

        // The window: titled "Upload/Select Files", one group "Copyediting"
        // listing the copyedited file with its box clear; no "Submission"
        // group yet.
        let window = await openSelectWindow(page, modal, LISTS.draft);
        await expect(selectWindowTitled(page, SELECT_WINDOW_TITLES[LISTS.draft])).toBeVisible();
        await expect(windowGroup(window, 'Copyediting')).toBeVisible();
        await expect(windowFileBox(window, copyedited)).toBeVisible();
        await expect(windowFileBox(window, copyedited)).not.toBeChecked();
        await expect(windowGroup(window, 'Submission')).toHaveCount(0);

        // "Show files from all accessible workflow stages.": the files
        // regroup under the stages; the submission file under its own.
        await allStagesBox(window).check();
        await expect(windowGroup(window, 'Submission')).toBeVisible({timeout: 20_000});
        await expect(windowFileBox(window, submissionFile)).toBeVisible();
        await expect(windowGroup(window, 'Copyediting')).toBeVisible();

        // A file from another stage: ticked and saved, it is a new row in
        // "Draft Files" with a different "No"; the Submission stage keeps
        // its own.
        await windowFileBox(window, submissionFile).check();
        await saveSelectWindow(window);
        const draftRow = fileRow(modal, LISTS.draft, submissionFile).first();
        await expect(draftRow).toBeVisible({timeout: 20_000});
        expect(await rowNumber(draftRow)).not.toBe(submissionNumber);
        await selectStage(modal, 'Submission');
        await expect(fileRow(modal, 'Submission Files', submissionFile).first()).toBeVisible();
        expect(await rowNumber(fileRow(modal, 'Submission Files', submissionFile).first())).toBe(submissionNumber);

        // "Upload File" from the window: the wizard "Upload File" with its
        // steps; the new file joins "Draft Files".
        modal = await openCopyediting(page, PK, seeded.submissionId);
        window = await openSelectWindow(page, modal, LISTS.draft);
        await uploadInSelectWindow(page, window, uploaded, {expectTitle: UPLOAD_WIZARD_TITLES[LISTS.draft]});
        await saveSelectWindow(window);
        await expect(fileRow(modal, LISTS.draft, uploaded).first()).toBeVisible({timeout: 20_000});
        await expect(fileRow(modal, LISTS.draft, submissionFile).first()).toBeVisible();
        const rowsBefore = await fileRows(modal, LISTS.draft).allInnerTexts();
        expect(rowsBefore).toHaveLength(2);

        // Control: a tick dropped by the window's "Cancel" — no question,
        // and "Draft Files" lists the same rows as before.
        window = await openSelectWindow(page, modal, LISTS.draft);
        await windowFileBox(window, copyedited).check();
        await windowCancel(window).click();
        await expect(windowCancel(window)).toBeHidden({timeout: 20_000});
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(fileRows(modal, LISTS.draft)).toHaveCount(rowsBefore.length);
        // Compared sorted: the files list by upload time to the second, so
        // two uploaded in one second come back either way (fix list B).
        await expect.poll(async () => (await fileRows(modal, LISTS.draft).allInnerTexts()).sort()).toEqual([...rowsBefore].sort());
        await expect(fileRow(modal, LISTS.draft, copyedited)).toHaveCount(0);
    });

    test('S6: "Send To Production"', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s6');
        const draft = `draft-${tag}.txt`;
        const copyedited = `copyedited-${tag}.txt`;
        const press = await seedScratchPress(ompApi, tag);

        // The given: one file in each list.
        const page = await (await asUser(press.editor)).newPage();
        const modal = await openEditorial(page, tag, press.submissionId);
        await uploadIntoList(page, modal, LISTS.draft, draft);
        await uploadIntoList(page, modal, LISTS.copyedited, copyedited);

        // Control: before the decision the entry offers both buttons and
        // shows no status box (the list headings are the positive read).
        await expectDecisionButtons(modal);
        await expect(listHeading(modal, LISTS.draft)).toBeVisible();
        await expect(statusHeading(modal)).toHaveCount(0);

        // The wizard: "Notify Authors", then "Select Files" with the
        // copyedited file ticked and the draft file not; the completion
        // dialog; the bubble reads "Production".
        await startSendToProduction(page, modal);
        await expect(wizardFileBox(page, copyedited)).toBeChecked();
        await expect(wizardFileBox(page, draft)).not.toBeChecked();
        await recordAndExpectCompletion(page, {
            title: COMPLETIONS.sentToProduction.title,
            message: COMPLETIONS.sentToProduction.message(press.title),
        });
        const modal2 = await viewSubmissionSummary(page);
        await expectStageLabel(modal2, 'Production');

        // "Production Ready Files" holds the copyedited file, not the draft.
        await expect(modal2.getByRole('heading', {name: 'Workflow: Production'})).toBeVisible();
        await expect(fileRow(modal2, PRODUCTION_READY, copyedited).first()).toBeVisible({timeout: 20_000});
        await expect(fileRow(modal2, PRODUCTION_READY, draft)).toHaveCount(0);

        // The "Copyediting" entry after the move: the lists and the
        // discussions panel under the status box, no buttons, no notice.
        await selectStage(modal2, 'Copyediting');
        await expectPlainStatus(modal2, STAGE_STATUS.inProduction);
        // The discussions panel is read by its "Tasks & Discussions" suffix:
        // the scenario names no heading, and the entry showed it headed
        // "Production Tasks & Discussions" after the move (finding T-omp-2).
        await expect(
            primaryRegion(modal2).getByRole('heading', {name: /^(Draft Files|.* Tasks & Discussions|Copyedited Files)$/})
        ).toHaveText([LISTS.draft, /Tasks & Discussions$/, LISTS.copyedited]);
        await expect(fileRow(modal2, LISTS.draft, draft).first()).toBeVisible();
        await expect(fileRow(modal2, LISTS.copyedited, copyedited).first()).toBeVisible();
        await expectNoDecisionButtons(modal2);
        await expect(actionsRegion(modal2).getByRole('button')).toHaveCount(0);
        await expectNoNotice(modal2);

        // The Author's mailbox.
        await pkpMail.find({to: press.authorEmail, subject: AUTHOR_MAILS.sentToProduction});
    });

    test('S7: "Move to Review" after a review round', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s7');
        const draft = `draft-${tag}.txt`;
        const press = await seedScratchPress(ompApi, tag);

        // The given: one file in "Draft Files". Control: the entry lists it
        // and offers both buttons.
        const page = await (await asUser(press.editor)).newPage();
        const modal = await openEditorial(page, tag, press.submissionId);
        await uploadIntoList(page, modal, LISTS.draft, draft);
        await expectDecisionButtons(modal);

        // The wizard: "Notify Authors" alone; the completion dialog.
        await startMoveToReview(page, modal);
        await expect(wizardSteps(page)).toHaveText([/Notify Authors/]);
        await expect(wizardSteps(page).filter({hasText: 'Select Files'})).toHaveCount(0);
        await recordAndExpectCompletion(page, {
            title: COMPLETIONS.sentBack.title,
            message: COMPLETIONS.sentBack.message(press.title),
        });

        // Where it lands: External Review, Round 1, waiting for reviewers.
        const modal2 = await viewSubmissionSummary(page);
        await expect(modal2.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})).toBeVisible();
        await expectStageLabel(modal2, 'External Review (Round 1)');
        await expectRoundStatus(modal2, 1, STATUS.waiting);

        // The "Copyediting" entry: the not-initiated box above
        // "Participants", and no file list.
        await selectStage(modal2, 'Copyediting');
        await expectPlainStatus(modal2, STAGE_STATUS.notInitiated);
        await expect(participantsHeading(modal2)).toBeVisible();
        await expect(listHeading(modal2, LISTS.draft)).toHaveCount(0);
        await expect(listHeading(modal2, LISTS.copyedited)).toHaveCount(0);
        await expect(fileList(modal2, LISTS.draft)).toHaveCount(0);

        // The Author's mailbox.
        await pkpMail.find({to: press.authorEmail, subject: AUTHOR_MAILS.movedToReview});
    });

    test("S8: the author's view", async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s8');
        const copyedited = `copyedited-${tag}.txt`;
        const seeded = await seedMonograph(ompApi, tag, {decisions: VIA_REVIEW});

        // The given: one copyedited file, uploaded by the Press Editor.
        const edPage = await (await asUser('editor.diana')).newPage();
        const edModal = await openEditorial(edPage, PK, seeded.submissionId);
        await uploadIntoList(edPage, edModal, LISTS.copyedited, copyedited);

        // The Author: the discussions panel and, under it, "Copyedited
        // Files" with its description, the file and nothing to press.
        const auPage = await (await asUser('author.alex')).newPage();
        const auModal = await openAuthorCopyediting(auPage, PK, seeded.submissionId);
        await expect(mainHeadings(auModal)).toHaveText([DISCUSSIONS_PANEL, LISTS.copyedited]);
        await expect(listDescription(auModal, LISTS.copyedited)).toBeVisible();
        const row = fileRow(auModal, LISTS.copyedited, copyedited).first();
        await expect(row).toBeVisible();
        await expect(row.getByRole('link', {name: copyedited})).toBeVisible();
        await expect(rowMenuButton(row)).toHaveCount(0);
        await expect(auModal.getByRole('button', {name: 'Upload/Select Files'})).toHaveCount(0);

        // What the view leaves out.
        await expect(listHeading(auModal, LISTS.draft)).toHaveCount(0);
        await expect(participantsHeading(auModal)).toHaveCount(0);
        await expectNoNotice(auModal);
        await expectNoDecisionButtons(auModal);

        // Control: the Press Editor's screen of the same submission.
        const edModal2 = await openEditorial(edPage, PK, seeded.submissionId);
        await expect(listHeading(edModal2, LISTS.draft)).toBeVisible();
        await expect(participantsHeading(edModal2)).toBeVisible();
        await expect(uploadSelectButton(edModal2, LISTS.copyedited)).toBeVisible();
        await expect(rowMenuButton(fileRow(edModal2, LISTS.copyedited, copyedited).first())).toBeVisible();
        await expectDecisionButtons(edModal2);
        await expect(noticeHeading(edModal2)).toHaveCount(0);
    });

    test('S9: "Move to Review" after an internal round only (OMP1)', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u32s9');
        // The first monograph was accepted from its Internal Review round;
        // the second had an internal and then an external round.
        const internalOnly = await seedMonograph(ompApi, tag, {
            decisions: ['sendInternalReview', 'acceptFromInternal'],
        });
        const both = await seedMonograph(ompApi, `${tag}b`, {
            decisions: ['sendInternalReview', 'sendExternalReview', 'accept'],
        });

        // "Move to Review" on the first: Internal Review, Round 1, waiting.
        const page = await (await asUser('editor.diana')).newPage();
        const modal = await openEditorial(page, PK, internalOnly.submissionId);
        await expectStageLabel(modal, 'Copyediting');
        await startMoveToReview(page, modal);
        await recordAndExpectCompletion(page, {
            title: COMPLETIONS.sentBack.title,
            message: COMPLETIONS.sentBack.message(`Submission ${tag}`),
        });
        const landed = await viewSubmissionSummary(page);
        await expect(landed.getByRole('heading', {name: 'Workflow: Internal Review (Round 1)'})).toBeVisible();
        await expectStageLabel(landed, 'Internal Review (Round 1)');
        await expectRoundStatus(landed, 1, STATUS.waiting);

        // Control: the second, moved the same way, lands on External Review.
        const modalB = await openEditorial(page, PK, both.submissionId);
        await expectStageLabel(modalB, 'Copyediting');
        await startMoveToReview(page, modalB);
        await recordAndExpectCompletion(page, {
            title: COMPLETIONS.sentBack.title,
            message: COMPLETIONS.sentBack.message(`Submission ${tag}b`),
        });
        const landedB = await viewSubmissionSummary(page);
        await expect(landedB.getByRole('heading', {name: 'Workflow: External Review (Round 1)'})).toBeVisible();
        await expectStageLabel(landedB, 'External Review (Round 1)');
        await expect(landedB.getByRole('heading', {name: 'Workflow: Internal Review (Round 1)'})).toHaveCount(0);
    });
});
