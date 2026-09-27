// @ts-check
/**
 * @file playwright/tests/U36-submission-files.spec.js
 *
 * Submission files — OMP suite, one test per canonical scenario the spec
 * runs on a press (S1–S10; scenario 11 is OPS-only), in the press's own
 * words: "Submission Component" / "Select component" in the upload wizard,
 * "Book Manuscript" as the main-work component (the default of a seeded
 * file), "Prospectus" as the supplementary one, "Image" and "HTML
 * Stylesheet" as the dependent ones, "Glossary" as the removed default,
 * the "External Review" round and the reviewer's "PKP" download prefix.
 * Spec: docs/specs/U36-submission-files.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: S7 reads the Author's menu on the file they uploaded; nothing
 *   reads it on the file an editor uploaded.
 * - A3 🐞: S6 reads that the Copyeditor's window opens on "History"; nothing
 *   waits for that tab to load.
 * - A7 🐞: S7 reads that no "Upload revisions" button shows on a round that
 *   asks for none and that "Revisions Uploaded" reads "No Items"; nothing
 *   reads or presses the "Upload" above it.
 * - A11 🐞: S9 chooses the component before "Save" in "Edit notes.md".
 * - A12 🐞: S4 and S7 read the zip's name as the submission's number, then
 *   hyphens, then "submission-files.zip", without fixing their count.
 * - A4–A6, A8–A10, A13–A24, OPS1: not on these scenarios' paths.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5), on the seeded press in series `monographs` (its submit-time
 * auto-assignment enrols the Series editor `sectioneditor.ana`, footnote
 * s0); the starting files come from `files[]` and
 * `reviewRounds[].files[]` (footnote s0), every other file is uploaded on
 * screen. S5 and S6 run on a scratch press with throwaway accounts: each
 * reads the notices "Removed file.", "Note posted." and "Note deleted.",
 * which the app queues per user and the next page fetch of ANY session of
 * that user takes (patterns.md parallel lesson 2), so a roster persona used
 * by other workers could lose them. S8's "Open" review and S10 run on
 * scratch presses as the spec's Givens say (`review` and `components`
 * passthrough keys). Every absence is read settled (an exact list, a class,
 * a count after the window's own answer) and paired with a positive control
 * taken the same way (M4, M6). Downloads are read through Playwright's
 * download event (the suggested name), never by fetching a file address.
 * Two reads differ from the letter of a bullet: S6 reads "newest first" on
 * the test's own note, since the seeded note and the upload share one
 * second and tie (`.reports/U36/test-ojs-findings.md` T-ojs-1); S9 does not
 * read the spinner a component link shows for the length of one request.
 * Waits are web-first (A5). Everything runs in the parallel `omp` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ReviewWizardPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {
    STEPS,
    wizardUrl,
    expectWizardOpen,
    expectStep,
    gotoStep,
    continueTo,
    openReview,
    submitButton,
    confirmSubmit,
} = require('../pages/SubmissionWizardPages.js');
const {
    MENU_KEYS,
    WIZARD_STEPS,
    NOT_A_REVISION,
    SUPPLEMENTARY_FIELDS,
    FORM_CHANGED_QUESTION,
    DELETE_QUESTION,
    FileList,
    UploadWizard,
    EditFileWindow,
    InformationCenter,
    DeleteFileDialog,
    SelectFilesWindow,
    ReviewerFileList,
    WizardFilesPanel,
    recordBrowserDialogs,
    zipEntryNames,
    downloadHead,
} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');

const PRESS = 'publicknowledge';
const SERIES = 'monographs';
const MANAGER = 'manager.maya';
const SECTION_EDITOR = 'sectioneditor.ana';
const AUTHOR = 'author.alex';
const REVIEWER = 'reviewer.julia';

const SUBMISSION_FILES = 'Submission Files';
const DRAFT_FILES = 'Draft Files';
const FILES_FOR_REVIEW = 'Files for Review';
const REVISIONS_UPLOADED = 'Revisions Uploaded';
const PRODUCTION_READY_FILES = 'Production Ready Files';

const UPLOAD_SUBMISSION_FILE = 'Upload Submission File';
const UPLOAD_REVIEW_FILE = 'Upload Review File';
const UPLOAD_PRODUCTION_READY_FILE = 'Upload a Production Ready File';
const UPLOAD_DEPENDENT_FILE = 'Upload a Dependent File';
const COMPONENT_LABEL = 'Submission Component';
const SELECT_COMPONENT = 'Select component';

const MAIN = 'Book Manuscript';
const SUPPLEMENTARY = 'Prospectus';
const MAIN_WORK_LINKS = ['Book Manuscript', 'Chapter Manuscript', 'Other'];
const DEPENDENT_COMPONENTS = ['Image', 'HTML Stylesheet'];
const REMOVED_DEFAULT = 'Glossary';

const EDITOR_MENU = ['Update File Details', 'More Information', 'Delete'];
const MANAGER_MENU_IMPORTABLE = ['Send to Text Editor', ...EDITOR_MENU];

const REVISE_QUESTION = 'If you are uploading a revision of an existing file, please indicate which file.';
const SUMMARY_LABEL = 'Summary of Changes (Amendment Notice)';
const SUMMARY_HINT =
    'Describe the key changes made in this version - for example, corrected figures, updated data, or revised methodology. The editor will review this before it appears publicly.';

/** An upload fixture's path. */
const fx = (name) => path.join(__dirname, '..', 'fixtures', 'files', name);

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u36${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Seed a monograph (footnote s0): on the seeded press in series
 * `monographs`, whose Series editor is assigned at the submit; on a scratch
 * press (no series) as it comes.
 */
async function seed(ompApi, tag, {context = PRESS, submitter = AUTHOR, ...extra} = {}) {
    return await ompApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        ...(context === PRESS ? {series: SERIES} : {}),
        ...extra,
    });
}

/**
 * A scratch press with throwaway accounts, one per role key given.
 * Returns the usernames by role key.
 */
async function seedScratchPress(ompApi, tag, roles, extra = {}) {
    const users = {};
    for (const role of roles) {
        users[role] = `${role.slice(0, 2)}${tag}`;
    }
    await ompApi.createContext({
        tag,
        users: roles.map((role) => ({username: users[role], roles: [role]})),
        ...extra,
    });
    return users;
}

/** The workflow frame, with the press's "External Review" stage label. */
function workflowFrame(page, contextPath, appContext) {
    return new WorkflowPage(page, contextPath, {appContext});
}

/** A page as `username`, on the submission's workflow at a stage (editorial view). */
async function openWorkflow(asUser, appContext, username, submissionId, {contextPath = PRESS, stage = null} = {}) {
    const page = await (await asUser(username)).newPage();
    const frame = workflowFrame(page, contextPath, appContext);
    await frame.gotoEditorial(submissionId, stage ? {menuKey: MENU_KEYS[stage]} : {});
    return {page, frame};
}

/**
 * Land the same address again: a closed legacy window can leave a hidden
 * shell over the workflow that hides its tables from role reads until the
 * next navigation (patterns.md locator pitfall 4).
 */
async function reland(page, frame, submissionId) {
    await page.goto(page.url());
    await frame.expectOpen(submissionId);
}

/** A notice the app shows after a legacy save ("Removed file.", "Note posted."). */
function notice(page, text) {
    return page.getByText(text).first();
}

test.describe('submission files', () => {
    test('S1: upload a new file', {tag: '@smoke'}, async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {submissionId} = await seed(ompApi, tag, {files: [{file: 'article.pdf'}]});

        const {page, frame} = await openWorkflow(asUser, appContext, MANAGER, submissionId, {stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf']);

        // The window: title, the three steps, "Continue" and the "Cancel" link.
        await list.uploadButton().click();
        const wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await expect(wizard.steps()).toHaveText(WIZARD_STEPS);
        await expect(wizard.continueButton()).toBeVisible();
        await expect(wizard.cancelLink()).toBeVisible();

        // Step 1 before a choice: the revise list on "not a revision" listing
        // article.pdf; the component list on its prompt, with no dependent
        // component (a supplementary one is the positive control); no upload
        // box; "Continue" greyed out.
        await expect(wizard.dialog()).toContainText(REVISE_QUESTION);
        await expect(wizard.dialog()).toContainText(COMPONENT_LABEL);
        await expect.poll(() => wizard.optionTexts(wizard.reviseSelect())).toEqual([NOT_A_REVISION, 'article.pdf']);
        expect(await wizard.selectedText(wizard.reviseSelect())).toBe(NOT_A_REVISION);
        const components = await wizard.optionTexts(wizard.componentSelect());
        expect(components[0]).toBe(SELECT_COMPONENT);
        expect(await wizard.selectedText(wizard.componentSelect())).toBe(SELECT_COMPONENT);
        expect(components).toContain(SUPPLEMENTARY);
        expect(components).not.toContain('Image');
        expect(components).not.toContain('HTML Stylesheet');
        await wizard.expectUploadBoxHidden();
        await expect(wizard.continueButton()).toBeDisabled();

        // The upload box once a component is chosen, then the uploaded file.
        await wizard.chooseComponent(SUPPLEMENTARY);
        await wizard.expectUploadBoxShown();
        await expect(wizard.uploadFileButton()).toBeVisible();
        await expect(wizard.uploadBox()).toContainText('Drag and drop a file here to begin upload');
        await wizard.attach(fx('notes.md'), 'notes.md');
        await expect(wizard.changeFileButton()).toBeVisible();

        // "2. Review Details" for a supplementary component.
        await wizard.continueTo(WIZARD_STEPS[1]);
        await expect(wizard.nameBox()).toHaveValue('notes.md');
        for (const label of SUPPLEMENTARY_FIELDS) {
            await expect(wizard.field(label), `step 2 shows "${label}"`).toBeVisible();
        }

        // "3. Confirm".
        await wizard.continueTo(WIZARD_STEPS[2]);
        await expect(wizard.fileAddedHeading()).toBeVisible();
        await expect(wizard.addAnotherButton()).toBeVisible();
        await expect(wizard.completeButton()).toBeVisible();

        // "Add Another File": step 1 again; a main-work file's step 2 holds the
        // name box alone.
        await wizard.addAnotherButton().click();
        await wizard.expectStep(WIZARD_STEPS[0]);
        await expect(wizard.componentSelect()).toBeVisible({timeout: 30_000});
        await wizard.chooseComponent(MAIN);
        await wizard.attach(fx('article.pdf'), 'article.pdf');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await expect(wizard.nameBox()).toHaveValue('article.pdf');
        await expect(wizard.reviewDetailsPanel().getByRole('textbox')).toHaveCount(1);
        await wizard.nameBox().fill('Final manuscript');
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.complete();

        // The list: both new files, each with a number of its own and a date.
        await list.expectNames(['article.pdf', 'notes.md', 'Final manuscript']);
        const notesRow = await list.expectRow('notes.md', {type: SUPPLEMENTARY});
        const finalRow = await list.expectRow('Final manuscript', {type: MAIN});
        const firstRow = await list.expectRow('article.pdf', {type: MAIN});
        const numbers = [await list.rowNumber(notesRow), await list.rowNumber(finalRow), await list.rowNumber(firstRow)];
        expect(new Set(numbers).size).toBe(3);
        const revisable = ['article.pdf', 'notes.md', 'Final manuscript'];

        // The control's other side: the Press Manager's menu on notes.md
        // offers "Send to Text Editor".
        expect(await list.menuEntries(notesRow)).toEqual(MANAGER_MENU_IMPORTABLE);

        // The assigned Section Editor: the same "Upload" and window, the same
        // components and files to revise, and the three entries on each row.
        const {page: sePage, frame: seFrame} = await openWorkflow(asUser, appContext, SECTION_EDITOR, submissionId, {stage: 'submission'});
        const seList = new FileList(sePage, seFrame, SUBMISSION_FILES);
        await seList.expectNames(revisable);
        await expect(seList.uploadButton()).toBeVisible();
        await seList.uploadButton().click();
        const seWizard = new UploadWizard(sePage, UPLOAD_SUBMISSION_FILE);
        await seWizard.expectOpen();
        await expect.poll(() => seWizard.optionTexts(seWizard.componentSelect())).toEqual(components);
        await expect
            .poll(async () => (await seWizard.optionTexts(seWizard.reviseSelect())).sort())
            .toEqual([NOT_A_REVISION, ...revisable].sort());
        await seWizard.cancel({uploaded: false});
        for (const name of revisable) {
            // Control: no "Send to Text Editor" on notes.md for the Section Editor.
            expect(await seList.menuEntries(seList.row(name)), `the Section Editor's menu on ${name}`).toEqual(EDITOR_MENU);
        }
    });

    test('S2: leave the wizard before "Complete"', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await seed(ompApi, tag, {files: [{file: 'article.pdf'}]});

        const {page, frame} = await openWorkflow(asUser, appContext, MANAGER, submissionId, {stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf']);
        const asked = recordBrowserDialogs(page, {fallback: 'dismiss'});

        // "Close" on step 1: the browser asks; "Cancel" keeps the window, "OK"
        // closes it with the file kept.
        await list.uploadButton().click();
        let wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseComponent(SUPPLEMENTARY);
        await wizard.attach(fx('notes.md'), 'notes.md');
        asked.answerNext('dismiss');
        await wizard.closeButton().click();
        await expect.poll(() => asked.messages.length).toBe(1);
        expect(asked.messages[0]).toBe(FORM_CHANGED_QUESTION);
        await expect(wizard.dialog()).toBeVisible();
        await wizard.expectStep(WIZARD_STEPS[0]);
        asked.answerNext('accept');
        await wizard.closeButton().click();
        await wizard.expectClosed();
        expect(asked.messages).toEqual([FORM_CHANGED_QUESTION, FORM_CHANGED_QUESTION]);
        await list.expectRow('notes.md', {type: SUPPLEMENTARY});

        // "Close" on step 2: nothing asks; the typed name is not kept.
        await list.uploadButton().click();
        wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseComponent(SUPPLEMENTARY);
        await wizard.attach(fx('profile-image-400.png'), 'profile-image-400.png');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await wizard.nameBox().fill('Instrument photo');
        await wizard.closeButton().click();
        await wizard.expectClosed();
        expect(asked.messages, 'nothing asks on step 2').toHaveLength(2);
        await list.expectRow('profile-image-400.png', {type: SUPPLEMENTARY});
        await expect(list.row('Instrument photo')).toHaveCount(0);

        // "Close" on step 3: nothing asks; the name saved on step 2 stands.
        await list.uploadButton().click();
        wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseComponent(SUPPLEMENTARY);
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await wizard.nameBox().fill('Closed at step three');
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.closeButton().click();
        await wizard.expectClosed();
        expect(asked.messages, 'nothing asks on step 3').toHaveLength(2);
        await list.expectRow('Closed at step three', {type: SUPPLEMENTARY});

        // "Cancel" after a new upload: nothing asks, and the file is gone.
        await list.uploadButton().click();
        wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseComponent('Other');
        await wizard.attach(fx('article.html'), 'article.html');
        await wizard.cancel();
        expect(asked.messages, 'nothing asks on "Cancel"').toHaveLength(2);

        // Control: the four kept files, and no article.html.
        await list.expectNames(['article.pdf', 'notes.md', 'profile-image-400.png', 'Closed at step three']);
        await expect(list.row('article.html')).toHaveCount(0);
        asked.stop();
    });

    test('S3: revise a file', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await seed(ompApi, tag, {files: [{file: 'article.pdf'}]});

        const {page, frame} = await openWorkflow(asUser, appContext, MANAGER, submissionId, {stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        const original = await list.expectRow('article.pdf', {type: MAIN});
        const number = await list.rowNumber(original);

        // The file to revise: the component follows it, greyed out, and the
        // upload box shows.
        await list.uploadButton().click();
        let wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.expectUploadBoxHidden();
        await wizard.chooseRevision('article.pdf');
        await expect.poll(() => wizard.selectedText(wizard.componentSelect())).toBe(MAIN);
        await expect(wizard.componentSelect()).toBeDisabled();
        await wizard.expectUploadBoxShown();

        // "Cancel" after a revision: nothing asks; article.pdf is back under its number.
        const asked = recordBrowserDialogs(page);
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.cancel();
        expect(asked.messages, 'nothing asks on "Cancel"').toEqual([]);
        await list.expectNames(['article.pdf']);
        await expect(list.numberCell(list.row('article.pdf'))).toHaveText(number);

        // The revision: one row, the same number, the new name, the old component.
        await list.uploadButton().click();
        wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseRevision('article.pdf');
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await expect(wizard.nameBox()).toHaveValue('notes.md');
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.complete();
        await list.expectNames(['notes.md']);
        const revised = await list.expectRow('notes.md', {type: MAIN});
        await expect(list.numberCell(revised)).toHaveText(number);

        // "History": the revision and its metadata row above the first upload.
        await list.choose(revised, 'More Information');
        const info = new InformationCenter(page, 'notes.md');
        await info.expectOpen();
        await info.expectTab('History');
        await info.expectHistoryLoaded();
        const revisionEvent = `A file revision "notes.md" was uploaded for submission ${submissionId} by ${MANAGER}.`;
        const metadataEvent = `The metadata for file "notes.md" was edited by ${MANAGER}.`;
        const firstEvent = `A file "article.pdf" was uploaded for submission ${submissionId} by ${AUTHOR}.`;
        await expect.poll(() => info.historyEvents()).toContain(firstEvent);
        const events = await info.historyEvents();
        const at = (event) => events.indexOf(event);
        expect(at(revisionEvent), 'the revision row').toBeGreaterThanOrEqual(0);
        expect(at(metadataEvent), 'the metadata row').toBeGreaterThanOrEqual(0);
        expect(at(firstEvent), 'the first upload below the revision').toBeGreaterThan(Math.max(at(revisionEvent), at(metadataEvent)));

        // The earlier version: the first upload's "Download" fetches the PDF.
        const {download} = await info.downloadFromHistory(firstEvent);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
        expect(await downloadHead(download, 4)).toBe('%PDF');
        await info.close();

        // Control: one row for the file, not two.
        await expect(list.rows()).toHaveCount(1);
        asked.stop();
    });

    test('S4: rename a file and download the list', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {submissionId} = await seed(ompApi, tag, {
            files: [{file: 'article.pdf'}, {file: 'notes.md', genre: SUPPLEMENTARY}],
        });
        const {submissionId: emptyId} = await seed(ompApi, `${tag}e`);

        const {page, frame} = await openWorkflow(asUser, appContext, MANAGER, submissionId, {stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf', 'notes.md']);

        // The row menu, in order; "Send to Text Editor" only on notes.md.
        expect(await list.menuEntries(list.row('notes.md'))).toEqual(MANAGER_MENU_IMPORTABLE);
        expect(await list.menuEntries(list.row('article.pdf'))).toEqual(EDITOR_MENU);

        // "Update File Details": "Edit a file" with the name box, "Save" and "Cancel".
        await list.choose(list.row('article.pdf'), 'Update File Details');
        const edit = new EditFileWindow(page);
        await edit.expectOpen();
        await expect(edit.nameBox()).toHaveValue('article.pdf');
        await expect(edit.saveButton()).toBeVisible();
        await expect(edit.cancelButton()).toBeVisible();

        // The emptied name is refused; the window stays.
        await edit.nameBox().fill('');
        await edit.saveButton().click();
        await expect(edit.fieldError('This field is required.')).toBeVisible();
        await expect(edit.dialog()).toBeVisible();

        // The rename shows at once.
        await edit.nameBox().fill('Manuscript');
        await edit.save();
        await list.expectRow('Manuscript', {type: MAIN});
        await expect(list.row('article.pdf')).toHaveCount(0);

        // Supplementary fields in "Edit a file".
        await list.choose(list.row('notes.md'), 'Update File Details');
        await edit.expectOpen();
        await expect(edit.nameBox()).toHaveValue('notes.md');
        for (const label of SUPPLEMENTARY_FIELDS) {
            await expect(edit.field(label), `"Edit a file" shows "${label}"`).toBeVisible();
        }
        await edit.save();

        // Download by name: a new tab, the extension added to "Manuscript".
        await expect(list.nameLink(list.row('Manuscript'))).toHaveAttribute('target', '_blank');
        const manuscript = await list.download(list.row('Manuscript'));
        expect(manuscript.newTab, 'the download opens a new tab').toBe(true);
        expect(manuscript.download.suggestedFilename()).toBe('Manuscript.pdf');
        const notes = await list.download(list.row('notes.md'));
        expect(notes.download.suggestedFilename()).toBe('notes.md');

        // "Download All Files": one zip named after the number and the list,
        // holding the list's two files.
        await expect(list.downloadAllButton()).toBeVisible();
        const all = await list.downloadAll();
        expect(all.download.suggestedFilename()).toMatch(new RegExp(`^${submissionId}-+submission-files\\.zip$`));
        expect((await zipEntryNames(all.download)).sort()).toEqual(['Manuscript.pdf', 'notes.md']);

        // Control: the empty submission's list reads "No Items" and offers no
        // "Download All Files" (the button read the same way above).
        const empty = workflowFrame(page, PRESS, appContext);
        await empty.gotoEditorial(emptyId, {menuKey: MENU_KEYS.submission});
        const emptyList = new FileList(page, empty, SUBMISSION_FILES);
        await expect(emptyList.noItems()).toBeVisible({timeout: 30_000});
        await expect(emptyList.uploadButton()).toBeVisible();
        await expect(emptyList.downloadAllButton()).toHaveCount(0);
    });

    test('S5: dependent files, and deleting a file', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const users = await seedScratchPress(ompApi, tag, ['manager', 'author']);
        const {submissionId} = await seed(ompApi, `${tag}s`, {
            context: tag,
            submitter: users.author,
            files: [{file: 'article.html'}, {file: 'article.pdf'}],
        });

        const {page, frame} = await openWorkflow(asUser, appContext, users.manager, submissionId, {contextPath: tag, stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.html', 'article.pdf']);

        // The "Dependent Files" list in "Edit a file".
        await list.choose(list.row('article.html'), 'Update File Details');
        const edit = new EditFileWindow(page);
        await edit.expectOpen();
        await expect(edit.dependentHeading()).toBeVisible({timeout: 30_000});
        await expect(edit.dependentUploadLink()).toBeVisible({timeout: 30_000});

        // "Upload a Dependent File": only the dependent components.
        await edit.dependentUploadLink().click();
        const dependent = new UploadWizard(page, UPLOAD_DEPENDENT_FILE);
        await dependent.expectOpen();
        await expect
            .poll(() => dependent.optionTexts(dependent.componentSelect()))
            .toEqual([SELECT_COMPONENT, ...DEPENDENT_COMPONENTS]);
        await dependent.chooseComponent('Image');
        await dependent.attach(fx('profile-image-400.png'), 'profile-image-400.png');
        await dependent.continueTo(WIZARD_STEPS[1]);
        await dependent.continueTo(WIZARD_STEPS[2]);
        await dependent.complete();
        await expect(edit.dependentNameLink('profile-image-400.png')).toBeVisible({timeout: 30_000});
        await edit.save();

        // Not a row of the stage's list.
        await list.expectNames(['article.html', 'article.pdf']);

        // "Delete", then "Cancel": nothing changes.
        await list.choose(list.row('article.pdf'), 'Delete');
        const del = new DeleteFileDialog(page);
        await expect(del.dialog()).toContainText(DELETE_QUESTION);
        await expect(del.okButton()).toBeVisible();
        await del.dismiss();
        await list.expectNames(['article.html', 'article.pdf']);

        // "Delete", then "OK": "Removed file." and the row is gone.
        await list.choose(list.row('article.html'), 'Delete');
        await expect(del.dialog()).toContainText(DELETE_QUESTION);
        const answer = await del.confirm();
        expect(answer.status()).toBe(200);
        await expect(notice(page, 'Removed file.')).toBeVisible();
        await list.expectNames(['article.pdf']);

        // The dependent file went with it (the Activity Log).
        await frame.openActivityLog();
        await expect(
            frame.activityLogRow(`A file "profile-image-400.png" was deleted for submission ${submissionId} by ${users.manager}.`)
        ).toBeVisible();
        await expect(
            frame.activityLogRow(`A file "article.html" was deleted for submission ${submissionId} by ${users.manager}.`)
        ).toBeVisible();
        await frame.closeActivityLog();

        // Control: article.pdf is still listed.
        await list.expectRow('article.pdf', {type: MAIN});
    });

    test('S6: "More Information": history and notes', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const users = await seedScratchPress(ompApi, tag, ['manager', 'author', 'copyeditor']);
        const {submissionId} = await seed(ompApi, `${tag}s`, {
            context: tag,
            submitter: users.author,
            decisions: ['skipExternalReview'],
            files: [{file: 'article.pdf', note: 'Check figure 2.'}],
            participants: [{username: users.copyeditor, role: 'copyeditor'}],
        });

        const {page, frame} = await openWorkflow(asUser, appContext, users.manager, submissionId, {contextPath: tag});
        await frame.expectStageHeading('Copyediting');
        await frame.selectStage('Submission');
        const list = new FileList(page, frame, SUBMISSION_FILES);
        const original = await list.expectRow('article.pdf', {type: MAIN});
        const originalNumber = await list.rowNumber(original);

        // The window opens on "History", the first of two tabs.
        await list.choose(original, 'More Information');
        let info = new InformationCenter(page, 'article.pdf');
        await info.expectOpen();
        await expect(info.tabs()).toHaveText(['History', 'Notes']);
        await info.expectTab('History');

        // "History": Date, User, Event; the note above the upload.
        await info.expectHistoryLoaded();
        await expect(info.historyHeaders()).toHaveText(['Date', 'User', 'Event']);
        // The seeded note and upload share one second (the seed writes both at
        // once), so their order is a tie here; "newest first" is read after
        // the test's own note below.
        const uploadEvent = `A file "article.pdf" was uploaded for submission ${submissionId} by ${users.author}.`;
        await expect.poll(() => info.historyEvents()).toContain(uploadEvent);
        let events = await info.historyEvents();
        expect(events, 'the note row').toContain('Posted new note.');

        // "Notes": the seeded note with its writer and date; a new note.
        await info.selectTab('Notes');
        const seeded = info.note('Check figure 2.');
        await expect(seeded).toBeVisible();
        await expect(seeded).toContainText('admin admin');
        await expect(seeded).toContainText(/\d{4}-\d{2}-\d{2}/);
        await info.addNote('Figures checked.');
        await expect(notice(page, 'Note posted.')).toBeVisible();
        await expect(info.note('Figures checked.')).toBeVisible();

        // Deleting a note: the question, "Note deleted.", the note gone; the
        // history keeps both "Posted new note." rows.
        await info.noteDeleteButton(info.note('Figures checked.')).click();
        const confirm = info.confirmWindow();
        await expect(confirm).toBeVisible();
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(notice(page, 'Note deleted.')).toBeVisible();
        await expect(info.note('Figures checked.')).toHaveCount(0);
        await expect(info.note('Check figure 2.')).toBeVisible();
        await info.selectTab('History');
        await info.expectHistoryLoaded();
        await expect
            .poll(async () => (await info.historyEvents()).filter((e) => e === 'Posted new note.').length)
            .toBe(2);
        // Newest first: the test's own note, seconds after the seed, heads the table.
        events = await info.historyEvents();
        expect(events[0]).toBe('Posted new note.');
        expect(events.indexOf(uploadEvent)).toBeGreaterThan(0);
        await info.close();

        // A copy on "Draft Files": a new row with a number of its own.
        await frame.selectStage('Copyediting');
        const drafts = new FileList(page, frame, DRAFT_FILES);
        await expect(drafts.noItems()).toBeVisible({timeout: 30_000});
        const select = await new SelectFilesWindow(page).openFrom(drafts);
        await select.showAllStages();
        await select.tick('article.pdf', 'Submission');
        await select.ok();
        await reland(page, frame, submissionId);
        await frame.expectStageHeading('Copyediting');
        const copy = await drafts.expectRow('article.pdf', {type: MAIN});
        expect(await drafts.rowNumber(copy)).not.toBe(originalNumber);

        // "Earlier Revision Notes" on the copy: one upload row naming the
        // Press Manager; no notes of its own; the source's note, no "Delete".
        await drafts.choose(copy, 'More Information');
        info = new InformationCenter(page, 'article.pdf');
        await info.expectOpen();
        await info.expectHistoryLoaded();
        const copyEvent = `A file "article.pdf" was uploaded for submission ${submissionId} by ${users.manager}.`;
        await expect.poll(() => info.historyEvents()).toContain(copyEvent);
        events = await info.historyEvents();
        expect(events[0]).toBe(copyEvent);
        expect(events.filter((e) => /^A file "article\.pdf" was uploaded/.test(e))).toHaveLength(1);
        await info.selectTab('Notes');
        await expect(info.noNotes()).toHaveText('There are no notes to display.');
        await info.openEarlierNotes();
        await expect(info.earlierNotesContent()).toContainText('Check figure 2.');
        await expect(info.earlierNotesContent().getByRole('button', {name: 'Delete', exact: true})).toHaveCount(0);
        await info.close();

        // The Copyeditor's note: the window opens on "History" (A3 aside); the
        // note is added and listed with no "Delete".
        const {page: cePage, frame: ceFrame} = await openWorkflow(asUser, appContext, users.copyeditor, submissionId, {
            contextPath: tag,
            stage: 'copyediting',
        });
        await ceFrame.expectStageHeading('Copyediting');
        const ceDrafts = new FileList(cePage, ceFrame, DRAFT_FILES);
        await ceDrafts.choose(ceDrafts.row('article.pdf'), 'More Information');
        const ceInfo = new InformationCenter(cePage, 'article.pdf');
        await ceInfo.expectOpen();
        await ceInfo.expectTab('History');
        await ceInfo.selectTab('Notes');
        await ceInfo.addNote('Copyedit started.');
        await expect(notice(cePage, 'Note posted.')).toBeVisible();
        const ceNote = ceInfo.note('Copyedit started.');
        await expect(ceNote).toBeVisible();
        await expect(ceInfo.noteDeleteButton(ceNote)).toHaveCount(0);

        // The Press Manager on that note: "Delete" is offered (the positive
        // control of the two absences above).
        await reland(page, frame, submissionId);
        await frame.expectStageHeading('Copyediting');
        await drafts.choose(drafts.row('article.pdf'), 'More Information');
        info = new InformationCenter(page, 'article.pdf');
        await info.expectOpen();
        await info.selectTab('Notes');
        await expect(info.noteDeleteButton(info.note('Copyedit started.'))).toBeVisible();
        await info.close();

        // Control: the original's "Earlier Revision Notes" has none.
        await frame.selectStage('Submission');
        await list.choose(list.row('article.pdf'), 'More Information');
        info = new InformationCenter(page, 'article.pdf');
        await info.expectOpen();
        await info.selectTab('Notes');
        await expect(info.note('Check figure 2.')).toBeVisible();
        await info.openEarlierNotes();
        await expect(info.earlierNotesContent()).toHaveText('There are no notes to display.');
        await info.close();
    });

    test('S7: the author\'s lists', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const {submissionId} = await seed(ompApi, tag, {
            decisions: ['sendExternalReview'],
            participants: [{username: 'sectioneditor.ravi', role: 'sectionEditor'}],
            files: [{file: 'article.pdf'}, {file: 'notes.md', uploader: 'sectioneditor.ravi'}],
        });

        // "Submission Files" in the author view: both files, no "Upload".
        const page = await (await asUser(AUTHOR)).newPage();
        const frame = workflowFrame(page, PRESS, appContext);
        await frame.gotoAuthor(submissionId, {menuKey: MENU_KEYS.submission});
        await frame.expectStageHeading('Submission');
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf', 'notes.md']);
        await expect(list.downloadAllButton()).toBeVisible();
        await expect(list.uploadButton()).toHaveCount(0);

        // The row menu on their own file: "Update File Details" alone.
        expect(await list.menuEntries(list.row('article.pdf'))).toEqual(['Update File Details']);

        // Renaming their own file.
        await list.choose(list.row('article.pdf'), 'Update File Details');
        const edit = new EditFileWindow(page);
        await edit.expectOpen();
        await edit.nameBox().fill('Manuscript');
        await edit.save();
        await list.expectNames(['Manuscript', 'notes.md']);

        // "Download All Files": both files.
        const all = await list.downloadAll();
        expect(all.download.suggestedFilename()).toMatch(new RegExp(`^${submissionId}-+submission-files\\.zip$`));
        expect((await zipEntryNames(all.download)).sort()).toEqual(['Manuscript.pdf', 'notes.md']);

        // "Revisions Uploaded" before revisions are requested: no "Upload
        // revisions" under the round, and the list reads "No Items".
        await frame.selectRound(1);
        const revisions = new FileList(page, frame, REVISIONS_UPLOADED);
        await expect(revisions.noItems()).toBeVisible({timeout: 30_000});
        await expect(frame.dialog().getByRole('button', {name: 'Upload revisions', exact: true})).toHaveCount(0);

        // Control: the Press Manager's "Upload" and "More Information" / "Delete".
        const {page: mPage, frame: mFrame} = await openWorkflow(asUser, appContext, MANAGER, submissionId, {stage: 'submission'});
        const mList = new FileList(mPage, mFrame, SUBMISSION_FILES);
        await mList.expectNames(['Manuscript', 'notes.md']);
        await expect(mList.uploadButton()).toBeVisible();
        for (const name of ['Manuscript', 'notes.md']) {
            const entries = await mList.menuEntries(mList.row(name));
            expect(entries, `the Press Manager's menu on ${name}`).toEqual(expect.arrayContaining(['More Information', 'Delete']));
        }
    });

    test('S8: files on a review round', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const seeded = await seed(ompApi, tag, {
            decisions: ['sendExternalReview'],
            reviewRounds: [{files: [{file: 'article.pdf'}], reviewers: [{username: REVIEWER, status: 'accepted'}]}],
        });
        const {submissionId} = seeded;
        const roundFile = seeded.files.find((f) => f.reviewRoundId !== null);
        expect(roundFile, 'the round file in the seed answer').toBeTruthy();

        // The "Open" review on a scratch press.
        const openTag = `${tag}o`;
        const openUsers = await seedScratchPress(ompApi, openTag, ['author', 'externalReviewer'], {
            review: {defaultReviewMode: 'open'},
        });
        const {submissionId: openId} = await seed(ompApi, `${openTag}s`, {
            context: openTag,
            submitter: openUsers.author,
            decisions: ['sendExternalReview'],
            reviewRounds: [{files: [{file: 'article.pdf'}], reviewers: [{username: openUsers.externalReviewer, status: 'accepted'}]}],
        });

        // "Files for Review": the file, and no "Download All Files" (the
        // list's own "Upload/Select Files" is the positive control of the scope).
        const {page, frame} = await openWorkflow(asUser, appContext, SECTION_EDITOR, submissionId);
        await frame.selectRound(1);
        const review = new FileList(page, frame, FILES_FOR_REVIEW);
        await review.expectNames(['article.pdf']);
        await expect(review.uploadSelectButton()).toBeVisible();
        await expect(review.downloadAllButton()).toHaveCount(0);

        // The Reviewer's download: a neutral name (the press's acronym "PKP",
        // the component "Book Manuscript", the file's number).
        const reviewerPage = await (await asUser(REVIEWER)).newPage();
        const reviewerWizard = new ReviewWizardPage(reviewerPage, PRESS, {privateBoxLabel: 'For editor only'});
        await reviewerWizard.goto(submissionId);
        const reviewerFiles = new ReviewerFileList(reviewerPage, reviewerWizard, 1);
        await reviewerFiles.expectLoaded();
        const neutral = await reviewerFiles.download('article.pdf');
        expect(neutral.download.suggestedFilename()).toMatch(
            new RegExp(`^pkp-review-assignment-${submissionId}-book-manuscript-${roundFile.submissionFileId}\\.pdf$`, 'i')
        );

        // The "Open" review: the file's own name.
        const openPage = await (await asUser(openUsers.externalReviewer)).newPage();
        const openWizard = new ReviewWizardPage(openPage, openTag, {privateBoxLabel: 'For editor only'});
        await openWizard.goto(openId);
        const openFiles = new ReviewerFileList(openPage, openWizard, 1);
        await openFiles.expectLoaded();
        const named = await openFiles.download('article.pdf');
        expect(named.download.suggestedFilename()).toBe('article.pdf');

        // "Summary of Changes (Amendment Notice)" on "Revisions Uploaded".
        const revisions = new FileList(page, frame, REVISIONS_UPLOADED);
        await revisions.uploadButton().click();
        const wizard = new UploadWizard(page, UPLOAD_REVIEW_FILE);
        await wizard.expectOpen();
        await wizard.chooseComponent(MAIN);
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await expect(wizard.reviewDetailsPanel()).toContainText(SUMMARY_LABEL);
        await expect(wizard.reviewDetailsPanel()).toContainText(SUMMARY_HINT);
        await wizard.typeSummary('Corrected figure 2.');
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.complete();
        const revised = revisions.row('notes.md');
        await expect(revised).toBeVisible({timeout: 30_000});
        await expect(revisions.typeCell(revised)).toContainText(MAIN);
        await expect(revisions.typeCell(revised)).toContainText('Amendment Notice');

        // Control: the Section Editor downloads the review file under its own name.
        const own = await review.download(review.row('article.pdf'));
        expect(own.download.suggestedFilename()).toBe('article.pdf');
    });

    test('S9: the submission wizard\'s "Files" panel', async ({asUser, ompApi, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const {submissionId} = await seed(ompApi, tag, {submitted: false});

        const page = await (await asUser(AUTHOR)).newPage();
        await page.goto(wizardUrl(PRESS, submissionId));
        await expectWizardOpen(page);
        await expectStep(page, STEPS.files);
        const panel = new WizardFilesPanel(page);

        // The empty panel, and the guidance to its left.
        await expect(panel.heading()).toHaveText('Files', {timeout: 30_000});
        await expect(panel.addFileButton()).toBeVisible();
        await expect(panel.emptyState()).toContainText(
            'Upload any files the editorial team will need to evaluate your submission.'
        );
        await expect(panel.emptyUploadButton()).toBeVisible();
        const guidance = page.locator('main').getByText(
            'Provide any files our editorial team may need to evaluate your submission.',
            {exact: false}
        ).first();
        await expect(guidance).toBeVisible();
        await expect(page.locator('main').getByRole('heading', {name: 'Upload Files', exact: true})).toBeVisible();
        const guidanceBox = await guidance.boundingBox();
        const panelBox = await panel.panel().boundingBox();
        expect(guidanceBox && panelBox && guidanceBox.x < panelBox.x, 'the guidance stands left of the panel').toBe(true);

        // "Cancel upload" on a throttled upload: the row goes at once, nothing
        // asks, and a reload finds the panel empty.
        const asked = recordBrowserDialogs(page);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 20,
            downloadThroughput: -1,
            uploadThroughput: 4 * 1024,
        });
        await panel.pick(panel.addFileButton(), fx('article.pdf'));
        const uploading = panel.row('article.pdf');
        await expect(uploading).toBeVisible({timeout: 30_000});
        await expect(panel.progressBar(uploading)).toBeVisible();
        await expect(panel.cancelUploadButton(uploading)).toBeVisible();
        await panel.cancelUploadButton(uploading).click();
        await expect(panel.rows()).toHaveCount(0);
        await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1,
        });
        await cdp.detach();
        expect(asked.messages, 'nothing asks on "Cancel upload"').toEqual([]);
        await page.reload();
        await expectWizardOpen(page);
        await expect(panel.emptyUploadButton()).toBeVisible({timeout: 30_000});
        await expect(panel.rows()).toHaveCount(0);

        // A finished file: the name link, "Edit", "Remove", and the question
        // with "Book Manuscript", "Chapter Manuscript" and "Other".
        const pdf = await panel.add(panel.emptyUploadButton(), fx('article.pdf'), 'article.pdf');
        expect(await panel.rowActionNames(pdf)).toEqual(['Edit', 'Remove']);
        await expect(panel.genrePrompt(pdf)).toHaveText('What kind of file is this?');
        expect(await panel.genreButtonNames(pdf)).toEqual(MAIN_WORK_LINKS);

        // "Review" before a component is chosen.
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);
        await expect(page.locator('main')).toContainText('You must upload at least one Book Manuscript file.');
        await expect(submitButton(page)).toBeDisabled();
        await gotoStep(page, STEPS.files);

        // A component link: the badge.
        await panel.chooseGenre(panel.row('article.pdf'), MAIN);

        // "Other": "Edit notes.md" with the components, no dependent one.
        const notes = await panel.add(panel.addFileButton(), fx('notes.md'), 'notes.md');
        await panel.genreButtons(notes).filter({hasText: /^\s*Other\s*$/}).click();
        const editPanel = panel.editPanel('notes.md');
        await expect(editPanel).toBeVisible({timeout: 30_000});
        await expect(editPanel).toContainText('Choose the option that best describes this file.');
        const radios = await panel.editRadioLabels('notes.md');
        expect(radios).toContain(SUPPLEMENTARY);
        expect(radios).not.toContain('Image');
        expect(radios).not.toContain('HTML Stylesheet');
        await panel.saveEdit('notes.md', SUPPLEMENTARY);
        await expect(panel.badge(notes)).toHaveText(SUPPLEMENTARY);

        // "Remove": the question, "Yes", the row gone.
        const image = await panel.add(panel.addFileButton(), fx('profile-image-400.png'), 'profile-image-400.png');
        await panel.rowAction(image, 'Remove').click();
        const remove = panel.removeDialog();
        await expect(remove).toContainText('Are you sure you want to remove this file?');
        await expect(remove.getByRole('button', {name: 'No', exact: true})).toBeVisible();
        await remove.getByRole('button', {name: 'Yes', exact: true}).click();
        await expect(panel.row('profile-image-400.png')).toHaveCount(0, {timeout: 30_000});
        await expect(panel.row('notes.md')).toHaveCount(1);

        // A file left without a component does not stop the submit.
        const html = await panel.add(panel.addFileButton(), fx('article.html'), 'article.html');
        await expect(panel.genrePrompt(html)).toBeVisible();
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);
        await expect(submitButton(page)).toBeEnabled();
        await confirmSubmit(page);

        // "Submission Files" from My Submissions: the three files, the HTML
        // one with an empty "Type"; control: no removed image.
        const frame = workflowFrame(page, PRESS, appContext);
        await frame.gotoAuthor(submissionId, {menuKey: MENU_KEYS.submission});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf', 'notes.md', 'article.html']);
        await list.expectRow('article.pdf', {type: MAIN});
        await list.expectRow('notes.md', {type: SUPPLEMENTARY});
        await expect(list.typeCell(list.row('article.html'))).toHaveText(/^\s*$/);
        await expect(list.row('profile-image-400.png')).toHaveCount(0);
        asked.stop();
    });

    test('S10: a press\'s own components and the anonymizing link', async ({asUser, ompApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const users = await seedScratchPress(ompApi, tag, ['manager', 'author'], {
            review: {showEnsuringLink: true},
            components: {'Survey Data': {metadata: 'supplementary'}, [REMOVED_DEFAULT]: false},
        });
        const {submissionId} = await seed(ompApi, `${tag}s`, {context: tag, submitter: users.author});
        const {submissionId: productionId} = await seed(ompApi, `${tag}p`, {
            context: tag,
            submitter: users.author,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        // Step 1 on the Submission stage: the link, "Survey Data", no "Glossary".
        const {page, frame} = await openWorkflow(asUser, appContext, users.manager, submissionId, {contextPath: tag, stage: 'submission'});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await expect(list.noItems()).toBeVisible({timeout: 30_000});
        await list.uploadButton().click();
        const wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await expect(wizard.ensuringLink()).toBeVisible();
        const components = await wizard.optionTexts(wizard.componentSelect());
        expect(components).toContain('Survey Data');
        expect(components).not.toContain(REMOVED_DEFAULT);

        // The added component: the supplementary fields on step 2.
        await wizard.chooseComponent('Survey Data');
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.continueTo(WIZARD_STEPS[1]);
        for (const label of SUPPLEMENTARY_FIELDS) {
            await expect(wizard.field(label), `step 2 shows "${label}"`).toBeVisible();
        }
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.complete();
        await list.expectRow('notes.md', {type: 'Survey Data'});

        // Control: Production's wizard shows no link and no "Glossary".
        const production = workflowFrame(page, tag, appContext);
        await production.gotoEditorial(productionId, {menuKey: MENU_KEYS.production});
        const ready = new FileList(page, production, PRODUCTION_READY_FILES);
        await ready.uploadButton().click();
        const readyWizard = new UploadWizard(page, UPLOAD_PRODUCTION_READY_FILE);
        await readyWizard.expectOpen();
        const readyComponents = await readyWizard.optionTexts(readyWizard.componentSelect());
        expect(readyComponents).toContain('Survey Data');
        expect(readyComponents).not.toContain(REMOVED_DEFAULT);
        await expect(readyWizard.componentSelect()).toBeVisible();
        await expect(readyWizard.ensuringLink()).toHaveCount(0);
    });
});
