// @ts-check
/**
 * @file playwright/tests/U32-copyediting-stage.spec.js
 *
 * Copyediting stage — OJS suite, one test per canonical scenario the spec
 * runs on OJS (the eight common scenarios; scenario 9 is OMP-only, 10
 * OPS-only).
 * Spec: docs/specs/U32-copyediting-stage.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: S4 opens the "Copyedited Files" window and asserts nothing about
 *   its title (it is anchored by its "Upload File" link).
 * - A7 🐞: S4 deletes the last copyedited file and asserts nothing about the
 *   Editor's notice afterwards.
 * - A6 🐞, A8 ❓, A10 ❓, A1 ❓: no scenario reaches them here.
 * - A3 ❓: S4 seeds the Copyeditor without a message and reads the Editor's
 *   notice only after the upload (its absence), never the flip that the
 *   assignment did not make.
 * - A5 ❓: S1 reads the recommending Section Editor's panels and "Assign"
 *   and the absence of the two decision buttons; nothing touches
 *   recommendation controls.
 * - OMP1 ✅, OPS1 ✅: other apps' territory.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5). S3, S6 and S7 run on a scratch journal with throwaway accounts,
 * because each reads a mailbox and Mailpit is shared (A8); their editor is
 * seeded as a participant (nobody is auto-assigned on a scratch journal).
 * The other tests run on the seeded journal with `editor.diana` assigned
 * through `participants[]` (the notice shows only to an assigned editor).
 * A submission reaches Copyediting through `accept` from a review round; a
 * `skipExternalReview` seed would carry no notice (register A6). Seeded
 * submissions carry no files, so the lists' own "Upload/Select Files" ›
 * "Upload File" window provides them (footnote s). Every absence is read
 * with a settled locator (the exact ordered heading list, the exact button
 * list, a bounded mail read) and paired with a positive control taken the
 * same way (M4, M6). Waits are web-first (A5). Everything runs in the
 * parallel `ojs` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {
    WorkflowPage: ReviewWorkflowPage,
    DecisionPage,
    uploadViaWizard,
    uploadWizardSteps,
    uploadReviewFiles,
    assignParticipant,
    inMemoryFile,
} = require('../pages/ReviewStagePages.js');
const {
    CopyeditingStagePage,
    SelectFilesWindow,
    uploadIntoList,
    continueToSelectFiles,
    stepItems,
    recordDecision,
    leaveCompletion,
    NOTICE_ASSIGN,
    NOTICE_AWAITING,
    DRAFT_FILES,
    COPYEDITED_FILES,
    DISCUSSIONS,
    DRAFT_DESCRIPTION,
    COPYEDITED_DESCRIPTION,
    SEND_TO_PRODUCTION,
    MOVE_TO_REVIEW,
    DELETE_QUESTION,
    NOT_INITIATED,
    IN_PRODUCTION,
} = require('../pages/CopyeditingStagePages.js');

const JOURNAL = 'publicknowledge';
const EDITOR = 'editor.diana';
const PANELS = [DRAFT_FILES, DISCUSSIONS, COPYEDITED_FILES, 'Participants'];
const BOTH_BUTTONS = [SEND_TO_PRODUCTION, MOVE_TO_REVIEW];
const WIZARD_STEPS = ['1. Upload File', '2. Review Details', '3. Confirm'];

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u32${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway or roster account's address (scenarios.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/**
 * Seed a submission accepted from its Round 1 review, now at Copyediting
 * (footnote s). On the seeded journal the round holds a completed review by
 * `reviewer.julia`; a scratch journal has no reviewer enrolled, so its round
 * holds none.
 */
async function seedAtCopyediting(ojsApi, tag, {
    context = JOURNAL,
    submitter = 'author.alex',
    participants = [{username: EDITOR, role: 'editor'}],
    reviewers = context === JOURNAL ? [{username: 'reviewer.julia', status: 'completed'}] : [],
    decisions = ['sendExternalReview', 'accept'],
} = {}) {
    return await ojsApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        decisions,
        reviewRounds: [{reviewers}],
        participants,
    });
}

/**
 * A scratch journal for the mail-reading scenarios: one editor, two
 * copyeditors and one author, all throwaway. Returns their usernames and
 * display names.
 */
async function seedScratchJournal(ojsApi, tag) {
    const users = {
        editor: {username: `ed${tag}`, givenName: 'Erin', familyName: `Editor ${tag}`, roles: ['editor']},
        copyeditorOne: {username: `ca${tag}`, givenName: 'Cleo', familyName: `Copyeditor ${tag}`, roles: ['copyeditor']},
        copyeditorTwo: {username: `cb${tag}`, givenName: 'Cyrus', familyName: `Copyeditor ${tag}`, roles: ['copyeditor']},
        author: {username: `au${tag}`, givenName: 'Ava', familyName: `Author ${tag}`, roles: ['author']},
    };
    await ojsApi.createContext({tag, users: Object.values(users)});
    const named = {};
    for (const [key, user] of Object.entries(users)) {
        named[key] = {...user, displayName: `${user.givenName} ${user.familyName}`};
    }
    return named;
}

// No default `user` at describe level: every actor is opened through
// `asUser` (as U26/U25 do). On OJS, setting `test.use({user})` here mints
// that user's session at test setup, which strands the later `asUser`
// session on the shared php -S worker (both land on login); driving every
// actor through `asUser` avoids it (verified 2026-09-19).
test.describe('copyediting stage', () => {
    test('S1: open a submission at Copyediting', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        // The Editor assigned, a Section Editor whose recommend-only flag the
        // test sets on screen (the roster carries none), and manager.maya
        // left unassigned (footnote s).
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {
            participants: [
                {username: EDITOR, role: 'editor'},
                {username: 'sectioneditor.omar', role: 'sectionEditor'},
            ],
        });

        const page = await (await asUser(EDITOR)).newPage();
        const stage = new CopyeditingStagePage(page, JOURNAL);
        await stage.gotoEditorial(submissionId);

        // The stage: bubble, then top to bottom the notice, the two lists
        // around the discussions panel, Participants on the right; the one
        // exact heading list is the settled read of what shows.
        await stage.frame.expectStage('Copyediting');
        await stage.expectPanelHeadings(['Notification', ...PANELS]);
        await stage.expectNotice(NOTICE_ASSIGN);
        await expect(stage.panelDescription(DRAFT_FILES)).toHaveText(DRAFT_DESCRIPTION);
        await expect(stage.panelDescription(COPYEDITED_FILES)).toHaveText(COPYEDITED_DESCRIPTION);
        await expect(stage.frame.participantsHeading()).toBeVisible();

        // The decision buttons: "Send To Production" highlighted, then "Move
        // to Review"; no "Schedule For Publication" (the exact list says so).
        await stage.expectDecisionButtons(BOTH_BUTTONS);
        await stage.expectHighlighted(SEND_TO_PRODUCTION);
        await stage.expectNotHighlighted(MOVE_TO_REVIEW);

        // Control: no status box above "Draft Files"; the notice takes that
        // slot (read above, the same screen).
        await stage.expectNoStatusBox();

        // The Journal Manager not assigned: the same four panels and both
        // buttons, and no notice (the exact heading list, read the same way
        // as the Editor's).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const managerStage = new CopyeditingStagePage(managerPage, JOURNAL);
        await managerStage.gotoEditorial(submissionId);
        await managerStage.expectPanelHeadings(PANELS);
        await managerStage.expectDecisionButtons(BOTH_BUTTONS);

        // The recommending Section Editor: flagged through the Participants
        // row's "Edit Assignment" by the Editor first.
        await stage.setRecommendOnly('Omar Section Editor');
        const omarPage = await (await asUser('sectioneditor.omar')).newPage();
        const omarStage = new CopyeditingStagePage(omarPage, JOURNAL);
        await omarStage.gotoEditorial(submissionId);
        // The same four panels (an assigned editor, so the notice shows to
        // him too; Actors row 2), "Assign" on Participants, and neither
        // decision button: the exact button list, empty, against the
        // manager's list of two read the same way.
        await omarStage.expectPanelHeadings(['Notification', ...PANELS]);
        await expect(omarStage.frame.participantsAssignButton()).toBeVisible();
        await omarStage.expectDecisionButtons([]);
        await expect(omarStage.decisionButton(SEND_TO_PRODUCTION)).toHaveCount(0);
        await expect(omarStage.decisionButton(MOVE_TO_REVIEW)).toHaveCount(0);
    });

    test('S2: accept a submission with its revision', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const reviewFile = inMemoryFile(`${tag}review.txt`);
        const revision = inMemoryFile(`${tag}revision.txt`);
        // In review, the round holding a completed review; the files come
        // through the round's own panels (footnote s).
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {decisions: ['sendExternalReview']});

        const page = await (await asUser(EDITOR)).newPage();
        const review = new ReviewWorkflowPage(page, JOURNAL);
        await review.gotoEditorial(submissionId);
        await review.expectPageTitle('Review (Round 1)');
        await uploadReviewFiles(page, review, [reviewFile]);
        await review.panel('Revisions Uploaded').getByRole('button', {name: 'Upload', exact: true}).click();
        await uploadViaWizard(page, {file: revision});
        await expect(review.panelRow('Revisions Uploaded', revision.name)).toBeVisible();

        // "Accept Submission": the "Select Files" page offers the revision
        // under "Revisions" and not the file in "Files for Review".
        await review.decisionButton('Accept Submission').click();
        const decision = new DecisionPage(page);
        await decision.expectOpen('Accept Submission');
        // "Notify Authors", then "Notify Reviewers" (a review was completed
        // on the round), then "Select Files".
        await continueToSelectFiles(page, decision);
        await expect(page.getByRole('heading', {name: 'Revisions', exact: true})).toBeVisible();
        await expect(decision.promoteFileCheckbox(revision.name)).toHaveCount(1);
        await expect(decision.promoteFileCheckbox(reviewFile.name)).toHaveCount(0);
        await decision.promoteFileCheckbox(revision.name).check();
        await decision.record();

        // The stage bubble reads "Copyediting" and "Draft Files" lists the
        // revision with its number, name, date and type.
        const stage = new CopyeditingStagePage(page, JOURNAL);
        await stage.frame.expectStage('Copyediting');
        await stage.frame.selectStage('Copyediting');
        const row = await stage.expectFileRow(DRAFT_FILES, revision.name);

        // The notice above "Draft Files".
        await stage.expectNotice(NOTICE_ASSIGN);

        // The file's name downloads the file.
        const downloaded = await stage.downloadFile(row);
        expect(downloaded).toBe(revision.name);

        // Control: the file in "Files for Review" is not listed in "Draft
        // Files" (the revision's row above is the positive read of the list).
        await expect(stage.fileRows(DRAFT_FILES)).toHaveCount(1);
        await expect(stage.fileRow(DRAFT_FILES, reviewFile.name)).toHaveCount(0);
    });

    test('S3: assign a Copyeditor with "Request Copyedit"', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const title = `Submission ${tag}`;
        const users = await seedScratchJournal(ojsApi, tag);
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {
            context: tag,
            submitter: users.author.username,
            participants: [{username: users.editor.username, role: 'editor'}],
        });

        const editorPage = await (await asUser(users.editor.username)).newPage();
        const stage = new CopyeditingStagePage(editorPage, tag);
        await stage.gotoEditorial(submissionId);
        await stage.expectNotice(NOTICE_ASSIGN);

        // The control's assignment first, so that its silence is bounded by
        // the first Copyeditor's email arriving afterwards: the second
        // Copyeditor, no predefined message, the message box left empty.
        await assignParticipant(editorPage, {
            group: 'Copyeditor',
            name: users.copyeditorTwo.displayName,
            searchName: 'Cyrus',
        });
        await stage.reland();
        await expect(stage.participantRow(users.copyeditorTwo.displayName)).toBeVisible();

        // "Assign" with "Request Copyedit": the notice flips to "Awaiting
        // Copyedits." and the discussions panel lists "Request Copyedit".
        await assignParticipant(editorPage, {
            group: 'Copyeditor',
            name: users.copyeditorOne.displayName,
            searchName: 'Cleo',
            template: 'Request Copyedit',
        });
        await stage.reland();
        await stage.expectNotice(NOTICE_AWAITING);
        await expect(stage.discussionRow('Request Copyedit')).toHaveCount(1);

        // The Copyeditor's mailbox: "Request Copyedit" from the assigning
        // editor, the body opening on the submission and ending in the
        // reply link.
        const message = await pkpMail.find({to: mailOf(users.copyeditorOne.username), subject: 'Request Copyedit'});
        expect(message.From.Address).toBe(mailOf(users.editor.username));
        const full = await pkpMail.fullMessage(message.ID);
        // The plain-text body wraps the opening sentence across lines, so its
        // two parts are matched separately.
        expect(full.Text).toContain('A new submission is ready to be copyedited:');
        expect(full.Text).toContain(`${submissionId} — "${title}"`);
        expect(full.Text).toContain('Please follow these steps to complete this task');
        expect(full.Text).toContain('Reply to this comment');

        // The Copyeditor's Tasks panel: the discussion row and the task row;
        // "Delete" on the task removes it and the discussion row stays.
        const copyeditorPage = await (await asUser(users.copyeditorOne.username)).newPage();
        await copyeditorPage.goto(`/index.php/${tag}/dashboard/editorial`);
        const tasks = new TasksPanel(copyeditorPage);
        await tasks.open();
        const discussionRow = tasks
            .row(`${users.editor.displayName} started a discussion: Request Copyedit`)
            .filter({hasText: title});
        const taskRow = tasks.row('You have been asked to review copyedits for').filter({hasText: title});
        await expect(discussionRow).toHaveCount(1);
        await expect(taskRow).toHaveCount(1);
        await tasks.box(taskRow).check();
        await tasks.act('Delete');
        await expect(taskRow).toHaveCount(0);
        await expect(discussionRow).toHaveCount(1);
        await tasks.close();

        // Control: the second Copyeditor, assigned without a message,
        // received nothing, bounded by the first's email taken the same way.
        await pkpMail.expectNone({
            to: mailOf(users.copyeditorTwo.username),
            afterControl: {to: mailOf(users.copyeditorOne.username), subject: 'Request Copyedit'},
        });
    });

    test('S4: the Copyeditor uploads the copyedited file', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const file = inMemoryFile(`${tag}copyedited.txt`);
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {
            participants: [
                {username: EDITOR, role: 'editor'},
                {username: 'copyeditor.carla', role: 'copyeditor'},
            ],
        });

        // The Editor's screen offers both buttons and the notice box (the
        // controls for the Copyeditor's absences and for the box's later
        // absence; the notice's text before the upload is register A3's).
        const editorPage = await (await asUser(EDITOR)).newPage();
        const editorStage = new CopyeditingStagePage(editorPage, JOURNAL);
        await editorStage.gotoEditorial(submissionId);
        await editorStage.expectPanelHeadings(['Notification', ...PANELS]);
        await editorStage.expectDecisionButtons(BOTH_BUTTONS);

        // The Copyeditor's screen: the four panels, "Upload/Select Files"
        // above each list, no notice and no decision button.
        const copyeditorPage = await (await asUser('copyeditor.carla')).newPage();
        const stage = new CopyeditingStagePage(copyeditorPage, JOURNAL);
        await stage.gotoEditorial(submissionId);
        await stage.expectPanelHeadings(PANELS);
        await expect(stage.uploadSelectButton(DRAFT_FILES)).toBeVisible();
        await expect(stage.uploadSelectButton(COPYEDITED_FILES)).toBeVisible();
        await expect(stage.uploadSelectButtons()).toHaveCount(2);
        await stage.expectDecisionButtons([]);

        // "Upload/Select Files" on "Copyedited Files": the window opens (its
        // title is register A2's); "Upload File" opens the wizard "Upload
        // Copyedited File" with its three steps and "Complete".
        const win = await new SelectFilesWindow(copyeditorPage).openFrom(stage, COPYEDITED_FILES);
        const wizard = await win.openUploadWizard();
        await expect(wizard.getByRole('heading', {level: 1})).toHaveText('Upload Copyedited File');
        await expect(uploadWizardSteps(wizard)).toHaveText(WIZARD_STEPS);
        await win.finishUpload(file);
        await win.ok();
        await stage.reland();
        await stage.expectFileRow(COPYEDITED_FILES, file.name);

        // The Editor's screen after the upload: no notice box (the exact
        // heading list, the notice's heading gone from where it stood above).
        await editorStage.gotoEditorial(submissionId);
        await editorStage.expectPanelHeadings(PANELS);
        await editorStage.expectDecisionButtons(BOTH_BUTTONS);

        // "Delete" in the file's row menu: the "Delete" dialog's question,
        // then "OK" removes the row (what the notice does next is A7's).
        const dialog = await stage.openDelete(stage.fileRow(COPYEDITED_FILES, file.name));
        await expect(dialog).toContainText(DELETE_QUESTION);
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await stage.confirmDelete();
        await expect(stage.fileRow(COPYEDITED_FILES, file.name)).toHaveCount(0);
        await expect(stage.noItems(COPYEDITED_FILES)).toBeVisible();

        // Control: the Copyeditor's screen still offers neither decision
        // button after the upload, while the Editor's offered both.
        await stage.reland();
        await stage.expectPanelHeadings(PANELS);
        await stage.expectDecisionButtons([]);
    });

    test('S5: the "Upload/Select Files" window on "Draft Files"', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const copyedited = inMemoryFile(`${tag}copyedited.txt`);
        const submissionFile = inMemoryFile(`${tag}submission.txt`);
        const uploaded = inMemoryFile(`${tag}draft.txt`);
        const {submissionId} = await seedAtCopyediting(ojsApi, tag);

        const page = await (await asUser(EDITOR)).newPage();
        const stage = new CopyeditingStagePage(page, JOURNAL);
        await stage.gotoEditorial(submissionId);
        await uploadIntoList(stage, COPYEDITED_FILES, copyedited);

        // One submission file through the Submission stage's own panel; its
        // number is the source's for the "No" comparison below.
        await stage.frame.selectStage('Submission');
        const review = new ReviewWorkflowPage(page, JOURNAL);
        await review.panel('Submission Files').getByRole('button', {name: 'Upload', exact: true}).click();
        await uploadViaWizard(page, {file: submissionFile});
        const sourceRow = review.panelRow('Submission Files', submissionFile.name);
        await expect(sourceRow).toBeVisible();
        const sourceNumber = await stage.rowNumber(sourceRow);
        expect(sourceNumber).toMatch(/^\d+$/);

        // The window: titled "Upload/Select Files", one group "Copyediting"
        // listing the copyedited file, its box clear; the Submission stage's
        // file is not listed (the copyedited row is the positive read).
        await stage.gotoEditorial(submissionId);
        await expect(stage.noItems(DRAFT_FILES)).toBeVisible();
        const win = await new SelectFilesWindow(page).openFrom(stage, DRAFT_FILES);
        await expect(win.title()).toHaveText('Upload/Select Files');
        await expect(win.groupHeader('Copyediting')).toHaveCount(1);
        await expect(win.groupHeader('Submission')).toHaveCount(0);
        await expect(win.fileRow(copyedited.name)).toBeVisible();
        await expect(win.checkbox(copyedited.name)).not.toBeChecked();
        await expect(win.fileRow(submissionFile.name)).toHaveCount(0);

        // "Show files from all accessible workflow stages.": the groups are
        // the stages and the submission file sits under "Submission".
        await win.showAllStages();
        await expect(win.fileRow(submissionFile.name)).toBeVisible();
        for (const group of ['Submission', 'Review', 'Copyediting', 'Production']) {
            await expect(win.groupHeader(group)).toHaveCount(1);
        }
        const texts = await win.rowTexts();
        const submissionGroup = texts.indexOf('Submission');
        const reviewGroup = texts.indexOf('Review');
        const submissionRow = texts.findIndex((t) => t.includes(submissionFile.name));
        expect(submissionRow).toBeGreaterThan(submissionGroup);
        expect(submissionRow).toBeLessThan(reviewGroup);

        // Tick it and "OK": "Draft Files" lists it as a new row with a
        // different "No"; the Submission stage still lists the source.
        await win.tick(submissionFile.name);
        await win.ok();
        await stage.reland();
        const copyRow = await stage.expectFileRow(DRAFT_FILES, submissionFile.name);
        expect(await stage.rowNumber(copyRow)).not.toBe(sourceNumber);
        await stage.frame.selectStage('Submission');
        await expect(review.panelRow('Submission Files', submissionFile.name)).toBeVisible();
        expect(await stage.rowNumber(review.panelRow('Submission Files', submissionFile.name))).toBe(sourceNumber);

        // "Upload File" from the window: the wizard "Upload File" with its
        // three steps; the new file joins "Draft Files".
        await stage.gotoEditorial(submissionId);
        const again = await new SelectFilesWindow(page).openFrom(stage, DRAFT_FILES);
        const wizard = await again.openUploadWizard();
        await expect(wizard.getByRole('heading', {level: 1})).toHaveText('Upload File');
        await expect(uploadWizardSteps(wizard)).toHaveText(WIZARD_STEPS);
        await again.finishUpload(uploaded);
        await again.ok();
        await stage.reland();
        await stage.expectFileRow(DRAFT_FILES, uploaded.name);
        await expect(stage.fileRows(DRAFT_FILES)).toHaveCount(2);

        // Control: tick the copyedited file and "Cancel": no question (no
        // dialog but the workflow's own), and "Draft Files" unchanged.
        const last = await new SelectFilesWindow(page).openFrom(stage, DRAFT_FILES);
        await last.tick(copyedited.name);
        await last.cancel();
        await expect(
            page.getByRole('dialog').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')})
        ).toHaveCount(0);
        await stage.reland();
        await expect(stage.fileRows(DRAFT_FILES)).toHaveCount(2);
        await expect(stage.fileRow(DRAFT_FILES, submissionFile.name)).toBeVisible();
        await expect(stage.fileRow(DRAFT_FILES, uploaded.name)).toBeVisible();
        await expect(stage.fileRow(DRAFT_FILES, copyedited.name)).toHaveCount(0);
    });

    test('S6: "Send To Production"', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const title = `Submission ${tag}`;
        const draft = inMemoryFile(`${tag}draft.txt`);
        const copyedited = inMemoryFile(`${tag}copyedited.txt`);
        const users = await seedScratchJournal(ojsApi, tag);
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {
            context: tag,
            submitter: users.author.username,
            participants: [{username: users.editor.username, role: 'editor'}],
        });

        const editorPage = await (await asUser(users.editor.username)).newPage();
        const stage = new CopyeditingStagePage(editorPage, tag);
        await stage.gotoEditorial(submissionId);
        await uploadIntoList(stage, DRAFT_FILES, draft);
        await uploadIntoList(stage, COPYEDITED_FILES, copyedited);

        // Control first: both buttons offered and no status box while the
        // submission is active here. A copyedited file is present, so the
        // notice box is gone (Rule 3c): the panels alone, no status box.
        await stage.expectDecisionButtons(BOTH_BUTTONS);
        await stage.expectPanelHeadings(PANELS);
        await stage.expectNoStatusBox();

        // The wizard: "Notify Authors" to the authors, then "Select Files"
        // with the copyedited file ticked and the draft file not.
        const decision = await stage.openDecision(SEND_TO_PRODUCTION);
        await expect(editorPage.getByRole('heading', {name: 'Notify Authors', exact: true, level: 2})).toBeVisible();
        await expect(editorPage.locator('main')).toContainText(`To: ${users.author.displayName}`);
        await decision.continueStep();
        await expect(editorPage.getByRole('heading', {name: 'Select Files', exact: true, level: 2})).toBeVisible();
        await expect(editorPage.getByText('Select files that should be sent to the production stage.')).toBeVisible();
        await expect(decision.promoteFileCheckbox(copyedited.name)).toBeChecked();
        await expect(decision.promoteFileCheckbox(draft.name)).not.toBeChecked();

        const done = await recordDecision(editorPage, 'Sent to Production');
        await expect(done).toContainText(
            `The submission, ${title}, was sent to the production stage. The author has been notified, unless you chose to skip that email.`
        );
        await leaveCompletion(editorPage, done);
        await stage.frame.expectStage('Production');

        // "Production Ready Files" holds the copyedited file and not the
        // draft file.
        await stage.frame.expectStageHeading('Production');
        await expect(stage.fileRow('Production Ready Files', copyedited.name)).toBeVisible();
        await expect(stage.fileRows('Production Ready Files')).toHaveCount(1);
        await expect(stage.fileRow('Production Ready Files', draft.name)).toHaveCount(0);

        // The "Copyediting" entry after the move: the two lists and the
        // discussions panel under the status box, no buttons, no notice
        // (Rule 10). The tasks panel here is titled by the submission's now
        // active stage ("Production Tasks & Discussions"), not "Copyediting
        // …", so its heading is read tolerantly; the spec's Rule 10 names it
        // only "the discussions panel".
        await stage.frame.selectStage('Copyediting');
        await stage.frame.expectStatusAbovePanel(IN_PRODUCTION, DRAFT_FILES);
        await expect(stage.table(DRAFT_FILES)).toBeVisible();
        await expect(stage.table(COPYEDITED_FILES)).toBeVisible();
        await expect(
            stage.frame.dialog().getByRole('heading', {name: /Tasks & Discussions$/, level: 3})
        ).toBeVisible();
        await expect(stage.frame.participantsHeading()).toBeVisible();
        await expect(stage.noticeHeading()).toHaveCount(0);
        await expect(stage.fileRow(DRAFT_FILES, draft.name)).toBeVisible();
        await expect(stage.fileRow(COPYEDITED_FILES, copyedited.name)).toBeVisible();
        await stage.expectDecisionButtons([]);

        // The Author's mailbox.
        const message = await pkpMail.find({
            to: mailOf(users.author.username),
            subject: 'Next steps for publishing your submission',
        });
        expect(message.From.Address).toBe(mailOf(users.editor.username));
    });

    test('S7: "Move to Review" after a review round', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const title = `Submission ${tag}`;
        const draft = inMemoryFile(`${tag}draft.txt`);
        const users = await seedScratchJournal(ojsApi, tag);
        // Accepted from Round 1 with no reviewer on the round (footnote s).
        const {submissionId} = await seedAtCopyediting(ojsApi, tag, {
            context: tag,
            submitter: users.author.username,
            participants: [{username: users.editor.username, role: 'editor'}],
        });

        const editorPage = await (await asUser(users.editor.username)).newPage();
        const stage = new CopyeditingStagePage(editorPage, tag);
        await stage.gotoEditorial(submissionId);
        await uploadIntoList(stage, DRAFT_FILES, draft);

        // Control first: the file listed and both buttons offered.
        await expect(stage.fileRow(DRAFT_FILES, draft.name)).toBeVisible();
        await stage.expectDecisionButtons(BOTH_BUTTONS);

        // The wizard: the "Notify Authors" page alone (one step, no
        // "Continue"; "Record Decision" is the positive read of the footer).
        const decision = await stage.openDecision(MOVE_TO_REVIEW);
        await expect(stepItems(editorPage)).toHaveText([/Notify Authors/]);
        await expect(editorPage.getByRole('heading', {name: 'Notify Authors', exact: true, level: 2})).toBeVisible();
        await expect(decision.recordButton).toBeVisible();
        await expect(decision.continueButton).toHaveCount(0);

        const done = await recordDecision(editorPage, 'Sent Back from Copyediting');
        await expect(done).toContainText(
            `The submission, ${title}, was sent back from the copyediting stage. The author has been notified, unless you chose to skip that email.`
        );
        await leaveCompletion(editorPage, done);

        // Where it lands: the review stage on Round 1, "Waiting for
        // reviewers to be assigned."
        await stage.frame.expectStage('Review (Round 1)');
        await stage.frame.expectHeading('Workflow: Review (Round 1)');
        await stage.frame.expectStatus('Waiting for reviewers to be assigned.', 'Round 1 Status');

        // The "Copyediting" entry: the status box above Participants and no
        // file list (the exact heading list).
        await stage.frame.selectStage('Copyediting');
        await stage.frame.expectStatus(NOT_INITIATED);
        await stage.expectPanelHeadings(['Status', 'Participants']);
        await expect(stage.frame.panelTables()).toHaveCount(0);
        await stage.expectDecisionButtons([]);

        // The Author's mailbox.
        const message = await pkpMail.find({
            to: mailOf(users.author.username),
            subject: 'Your submission has been moved to review',
        });
        expect(message.From.Address).toBe(mailOf(users.editor.username));
    });

    test("S8: the author's view", async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const file = inMemoryFile(`${tag}copyedited.txt`);
        const {submissionId} = await seedAtCopyediting(ojsApi, tag);

        // The Editor uploads one copyedited file (footnote s), and their
        // screen is the control: "Draft Files", Participants, the list's
        // "Upload/Select Files", the row menu and both buttons.
        const editorPage = await (await asUser(EDITOR)).newPage();
        const editorStage = new CopyeditingStagePage(editorPage, JOURNAL);
        await editorStage.gotoEditorial(submissionId);
        await uploadIntoList(editorStage, COPYEDITED_FILES, file);
        // A copyedited file is present, so the notice box is gone (Rule 3c).
        await editorStage.expectPanelHeadings(PANELS);
        await expect(editorStage.uploadSelectButton(COPYEDITED_FILES)).toBeVisible();
        await expect(editorStage.rowMenuButton(editorStage.fileRow(COPYEDITED_FILES, file.name))).toBeVisible();
        await editorStage.expectDecisionButtons(BOTH_BUTTONS);

        // The Author: the discussions panel, then "Copyedited Files" with its
        // line and the file, and nothing to press.
        const authorPage = await (await asUser('author.alex')).newPage();
        const stage = new CopyeditingStagePage(authorPage, JOURNAL);
        await stage.gotoAuthor(submissionId);
        await stage.expectPanelHeadings([DISCUSSIONS, COPYEDITED_FILES]);
        await expect(stage.panelDescription(COPYEDITED_FILES)).toHaveText(COPYEDITED_DESCRIPTION);
        const row = await stage.expectFileRow(COPYEDITED_FILES, file.name);
        await expect(stage.uploadSelectButtons()).toHaveCount(0);
        await expect(stage.rowMenuButton(row)).toHaveCount(0);

        // What the view leaves out: no "Draft Files", "Participants" or
        // notice (the exact heading list above), and no decision button.
        await expect(stage.frame.panel(DRAFT_FILES)).toHaveCount(0);
        await expect(stage.frame.participantsHeading()).toHaveCount(0);
        await expect(stage.noticeHeading()).toHaveCount(0);
        await stage.expectDecisionButtons([]);
        await expect(stage.decisionButton(SEND_TO_PRODUCTION)).toHaveCount(0);
        await expect(stage.decisionButton(MOVE_TO_REVIEW)).toHaveCount(0);
    });
});
