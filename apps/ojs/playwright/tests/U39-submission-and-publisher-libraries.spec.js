// @ts-check
/**
 * @file playwright/tests/U39-submission-and-publisher-libraries.spec.js
 *
 * Submission & Publisher Libraries — OJS suite, one test per canonical
 * scenario the spec runs on OJS (S1–S5).
 * Spec: docs/specs/U39-submission-and-publisher-libraries.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S5 presses "Editor contract" only as the Copyeditor of the
 *   journal whose Copyeditor role has the Submission stage.
 * - A6 ❓: no test reads the Author's arrow on a file someone else added.
 * - A9 🐞: every download waits until the name link is enabled again (the
 *   app's two-second timer ends there) before anything redraws a list.
 * - A10 ❓: the "403 Forbidden" pages are read by their text, never by the
 *   status they are sent with.
 * - A11 🐞: S1 closes "Add a file" only after an "OK" the browser's own
 *   checks refused, never after an "OK" with no file.
 * - A3–A5, A7, OMP1: not on these scenarios' paths. A8 retired 2026-10-07 (pkp/pkp-lib#13432).
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). S1 runs on publicknowledge on its own submission
 * (a unique tag, M5), with no downloaded name read and nothing deleted;
 * S2–S5 run on scratch journals with throwaway accounts, as footnote s
 * says (stored names collide across workers on publicknowledge). A file a
 * Given names is seeded with `libraryFiles[]` on the context or the
 * submission; S5's second journal ticks the Copyeditor's Submission stage
 * with `roles.copyeditor.stages`. Every window close, page leave and
 * sign-in change runs with a browser-dialog recorder on the page; the
 * question is asserted where S1 quotes it. Downloads are read through
 * Playwright's download event; the public address through its response
 * headers in a signed-out context (headless Chromium turns an inline PDF
 * into a download), a refusal through the page's text. Every absence is
 * read settled and paired with a positive control taken the same way
 * (M4, M6). Waits are web-first (A5). Everything runs in the parallel
 * `ojs` project.
 */
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {recordBrowserDialogs, captureDownload} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    FORM_CHANGED_QUESTION,
    DELETE_QUESTION,
    REQUIRED,
    PUBLIC_ACCESS_SENTENCE,
    DROP_PROMPT,
    FORBIDDEN,
    SubmissionLibraryWindow,
    PublisherLibraryTab,
    LibraryFileWindow,
    publicAddress,
    readAddress,
    pastCloseWindow,
} = require('../../../../shared/playwright/pages/LibraryPages.js');
const {DecisionWizardPage, ComposerPage, LIBRARY_FILES_WINDOW} = require('../pages/DecisionWizardPages.js');

const JOURNAL = 'publicknowledge';
const EDITOR = 'editor.diana';
const AUTHOR = 'author.alex';

/** The journal's library name: the Settings tab and the list heading (Rules 6, 9). */
const PUBLISHER_LIBRARY = 'Publisher Library';

/** The "Type" list's groups, in order (Fields "Type"). */
const TYPES = ['Marketing', 'Permissions', 'Reports', 'Other'];

/** The "Add a file" window's fields (Fields). */
const ADD_FIELDS = ['Name', 'Type', 'Description', 'File'];

/** An upload fixture's path. */
const fx = (name) => path.join(__dirname, '..', 'fixtures', 'files', name);
const ARTICLE_PDF = fx('article.pdf');
const REPLACEMENT_PDF = fx('replacement.pdf');

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u39${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/** A roster or throwaway account's address. */
const mailOf = (username) => `${username}@mail.test`;

/**
 * A page as `username`, with a browser-dialog recorder (every window close,
 * page leave and navigation below may ask), the workflow frame and the
 * Submission Library window.
 */
async function pageAs(asUser, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    const dialogs = recordBrowserDialogs(page);
    const frame = new WorkflowPage(page, contextPath);
    const library = new SubmissionLibraryWindow(page, frame);
    return {page, dialogs, frame, library};
}

/** A signed-out page (a fresh context without cookies), with its own dialog recorder. */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    const page = await context.newPage();
    recordBrowserDialogs(page);
    return {context, page};
}

test.describe('submission and publisher libraries', () => {
    test('S1: a file shared through the Submission Library', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        // Given: the Editor, on a submission its Author submitted, whose
        // Submission Library is empty (footnote s, recipe 1).
        const {submissionId} = await ojsApi.createSubmission({tag, context: JOURNAL, submitter: AUTHOR, title: `Submission ${tag}`});

        const ed = await pageAs(asUser, EDITOR, JOURNAL);
        await ed.frame.gotoEditorial(submissionId);

        // ── The empty window ─────────────────────────────────────────────
        // "Library": "Submission Library" with "Add a file" and "View
        // Document Library" above a list headed "Files", the four type
        // groups, each "No Items" (Rule 1; Fields "Type").
        await ed.library.open();
        const list = ed.library.list();
        await expect(list.actionLinks()).toHaveText(['Add a file', 'View Document Library']);
        await expect(list.columnHeaders()).toHaveText(['Files']);
        await list.expectGroups(TYPES);
        await list.expectAllEmpty(TYPES);

        // ── "Add a file" refused ─────────────────────────────────────────
        // The window: "Name", "Type" on "Choose One", "Description", and
        // under "File" the drop area with "Upload File"; "OK" with nothing
        // filled: "This field is required." under "Name" and for "Type".
        let add = await list.openAdd();
        expect(await add.fieldLabels()).toEqual(ADD_FIELDS);
        await add.expectSelectedType('Choose One');
        await expect(add.nameBox()).toHaveValue('');
        await expect(add.descriptionBox()).toHaveValue('');
        await expect(add.uploadArea()).toContainText(DROP_PROMPT);
        await expect(add.uploadFileButton()).toBeVisible();
        await add.okButton().click();
        await expect(add.fieldError('name')).toHaveText(REQUIRED, {timeout: 30_000});
        await expect(add.fieldError('type')).toHaveText(REQUIRED);
        await expect(add.heading()).toBeVisible();

        // ── Closing a changed window ─────────────────────────────────────
        // "Draft name" typed, the close button: the browser asks; "Cancel"
        // keeps the window with the name; the close button again, "OK":
        // the window closes and nothing is added. Then "Add a file",
        // "Draft name", the foot's "Cancel": closed without asking, nothing
        // added (Rules 3, 3b).
        await add.nameBox().fill('Draft name');
        await add.nameBox().press('Tab');
        ed.dialogs.answerNext('dismiss');
        await add.closeButton().click();
        await expect.poll(() => ed.dialogs.messages.length, {timeout: 30_000}).toBe(1);
        expect(ed.dialogs.messages[0]).toBe(FORM_CHANGED_QUESTION);
        await expect(add.heading()).toBeVisible();
        await expect(add.nameBox()).toHaveValue('Draft name');
        ed.dialogs.answerNext('accept');
        await add.closeButton().click();
        await add.expectClosed();
        expect(ed.dialogs.messages).toEqual([FORM_CHANGED_QUESTION, FORM_CHANGED_QUESTION]);
        await list.expectAllEmpty(TYPES);

        add = await list.openAdd();
        await add.nameBox().fill('Draft name');
        await add.nameBox().press('Tab');
        await add.cancel();
        expect(ed.dialogs.messages).toHaveLength(2);
        await list.expectAllEmpty(TYPES);

        // ── "Add a file" ─────────────────────────────────────────────────
        // "Author agreement", "Permissions", article.pdf: the button reads
        // "Change File"; "OK": the row under "Permissions", a link with its
        // kind's icon, the row starting with an arrow; the other groups
        // still "No Items" (Rules 2, 3).
        add = await list.openAdd();
        await add.nameBox().fill('Author agreement');
        await add.chooseType('Permissions');
        await add.upload(ARTICLE_PDF);
        await expect(add.changeFileButton()).toBeVisible();
        await expect(add.uploadFileButton()).toHaveCount(0);
        await add.ok();
        await list.expectFiles('Permissions', ['Author agreement']);
        await expect(list.nameLink('Author agreement')).toHaveClass(/\bpkp_linkaction_icon_pdf\b/);
        await list.expectArrowFirst('Author agreement');
        await list.expectNotEmpty('Permissions');
        await list.expectAllEmpty(['Marketing', 'Reports', 'Other']);

        // ── The Author's list ────────────────────────────────────────────
        // From "My Submissions": "Library" lists "Author agreement" under
        // "Permissions" (Actors row 1; Rule 1).
        const au = await pageAs(asUser, AUTHOR, JOURNAL);
        await au.frame.gotoAuthor(submissionId);
        await au.library.open();
        const auList = au.library.list();
        await auList.expectFiles('Permissions', ['Author agreement']);

        // ── The Author's download {OJS OMP} ──────────────────────────────
        // The file downloads and the page stays (Actors row 3; Rule 8a).
        const auDownload = await auList.download('Author agreement');
        expect(auDownload.download.suggestedFilename()).toMatch(/\.pdf$/);
        expect(auDownload.after).toBe(auDownload.before);
        await expect(au.library.heading()).toBeVisible();

        // ── The Author adds a file ───────────────────────────────────────
        // "Signed permission" joins "Author agreement" under "Permissions",
        // in no set order (Actors row 2; Rules 1, 3).
        add = await auList.openAdd();
        await add.add({name: 'Signed permission', type: 'Permissions', file: ARTICLE_PDF});
        await auList.expectFiles('Permissions', ['Author agreement', 'Signed permission']);

        // ── The Editor reads it ──────────────────────────────────────────
        // "Library" again: both under "Permissions"; "Signed permission"
        // downloads and the page stays (Actors row 3; Rule 8a).
        await ed.library.close();
        await ed.library.open();
        await list.expectFiles('Permissions', ['Author agreement', 'Signed permission']);
        const edDownload = await list.download('Signed permission');
        expect(edDownload.download.suggestedFilename()).toMatch(/\.pdf$/);
        expect(edDownload.after).toBe(edDownload.before);
        await expect(ed.library.heading()).toBeVisible();

        // ── Control ──────────────────────────────────────────────────────
        // "Activity Log": "History" holds lines, none naming either file
        // (Rule 12).
        await ed.library.close();
        const log = new ActivityLogWindow(ed.page, ed.frame);
        await pastCloseWindow(ed.page);
        await log.open();
        const lines = await log.historyLines();
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
            expect(line.event).not.toContain('Author agreement');
            expect(line.event).not.toContain('Signed permission');
        }
    });

    test('S2: the Publisher Library on the Settings tab', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const manager = `${tag}mg`;
        // Given: the Journal Manager of a scratch journal whose Publisher
        // Library is empty (footnote s, recipe 2).
        await ojsApi.createContext({tag, context: {name: `Journal ${tag}`}, users: [user(manager, 'Mona', 'Manager', ['manager'])]});

        const mg = await pageAs(asUser, manager, tag);
        const tab = new PublisherLibraryTab(mg.page, tag, PUBLISHER_LIBRARY);

        // ── The tab ──────────────────────────────────────────────────────
        // "Workflow Settings" › "Publisher Library": the list headed so,
        // "Add a file" above it and no "View Document Library", every group
        // "No Items" (Rules 1, 9).
        await tab.goto();
        const list = tab.list();
        await expect(list.heading()).toHaveText(PUBLISHER_LIBRARY);
        await expect(list.actionLinks()).toHaveText(['Add a file']);
        await expect(list.viewDocumentLibraryLink()).toHaveCount(0);
        await list.expectGroups(TYPES);
        await list.expectAllEmpty(TYPES);

        // ── "Public Access" in "Add a file" ──────────────────────────────
        // Unticked, the sentence and an address ending "/downloadPublic/id";
        // "Journal guide", "Other", article.pdf, ticked, "OK": listed under
        // "Other" (Fields "Public Access"; Rule 3).
        let add = await list.openAdd();
        await expect(add.publicAccessBox()).not.toBeChecked();
        await expect(add.publicAccessSentence()).toBeVisible();
        await expect(add.publicAddress()).toHaveText(/\/downloadPublic\/id$/);
        await add.add({name: 'Journal guide', type: 'Other', file: ARTICLE_PDF, publicAccess: true});
        await list.expectFiles('Other', ['Journal guide']);

        // ── A second file from the same upload ───────────────────────────
        add = await list.openAdd();
        await add.add({name: 'Internal report', type: 'Other', file: ARTICLE_PDF, publicAccess: false});
        await list.expectFiles('Other', ['Journal guide', 'Internal report']);

        // ── The downloaded names ─────────────────────────────────────────
        // "Journal guide" downloads as "article-OTH.pdf", the page staying;
        // "Internal report" as "article-OTH-1.pdf" (Rule 8a).
        const guideDownload = await list.download('Journal guide');
        expect(guideDownload.download.suggestedFilename()).toBe('article-OTH.pdf');
        expect(guideDownload.after).toBe(guideDownload.before);
        const reportDownload = await list.download('Internal report');
        expect(reportDownload.download.suggestedFilename()).toBe('article-OTH-1.pdf');

        // ── The "Edit" window ────────────────────────────────────────────
        // "Journal guide"'s "Edit": the saved "Name" and "Type", the "File"
        // lines, "Replace file", "Public Access" ticked over the journal's
        // address + "/libraryFiles/downloadPublic/" + the file's number;
        // "Unsaved name" typed, the foot's "Cancel": closed without asking,
        // the row unchanged; "Internal report"'s address the same way
        // (Fields; Rules 3b, 4, 10a).
        const guideId = await list.fileId('Journal guide');
        const reportId = await list.fileId('Internal report');
        const guideAddress = publicAddress(baseURL, tag, guideId);
        const reportAddress = publicAddress(baseURL, tag, reportId);
        let edit = await list.openEdit('Journal guide');
        await expect(edit.nameBox()).toHaveValue('Journal guide');
        await edit.expectSelectedType('Other');
        await expect(edit.fileLine('File Name')).toHaveText('article.pdf');
        await expect(edit.fileLine('File Size')).toHaveText(/\S/);
        await expect(edit.fileLine('Date uploaded')).toHaveText(/\S/);
        await expect(edit.replaceFileRow()).toBeVisible();
        await expect(edit.uploadArea()).toContainText(DROP_PROMPT);
        await expect(edit.publicAccessBox()).toBeChecked();
        await expect(edit.publicAccessSentence()).toBeVisible();
        await expect(edit.publicAddress()).toHaveText(guideAddress);
        await edit.nameBox().fill('Unsaved name');
        await edit.nameBox().press('Tab');
        await edit.cancel();
        expect(mg.dialogs.messages).toEqual([]);
        await list.expectFiles('Other', ['Journal guide', 'Internal report']);

        edit = await list.openEdit('Internal report');
        await expect(edit.publicAccessBox()).not.toBeChecked();
        await expect(edit.publicAddress()).toHaveText(reportAddress);
        await edit.cancel();

        // ── Signed out, the public address ───────────────────────────────
        // The file opens in the browser tab (inline, a PDF); saved, it is
        // named "article-OTH.pdf" (Rule 10a).
        const out = await signedOutPage(browser, baseURL);
        try {
            const guide = await readAddress(out.page, guideAddress);
            expect(guide.contentType).toBe('application/pdf');
            expect(guide.disposition).toMatch(/^inline\b/);
            expect(guide.fileName).toBe('article-OTH.pdf');
            expect(guide.contentLength).toBe(fs.statSync(ARTICLE_PDF).size);

            // ── "Edit" with "Replace file" ───────────────────────────────
            // "Author guide", "Permissions", replacement.pdf, "OK": listed
            // under "Permissions", "Other" keeps "Internal report" alone;
            // "Edit" again: "File Name" reads "replacement.pdf", the same
            // address (Rules 4, 10c).
            edit = await list.openEdit('Journal guide');
            await edit.nameBox().fill('Author guide');
            await edit.chooseType('Permissions');
            await edit.upload(REPLACEMENT_PDF);
            await edit.ok();
            await list.expectFiles('Permissions', ['Author guide']);
            await list.expectFiles('Other', ['Internal report']);
            edit = await list.openEdit('Author guide');
            await expect(edit.fileLine('File Name')).toHaveText('replacement.pdf');
            await expect(edit.publicAddress()).toHaveText(guideAddress);
            await edit.cancel();

            // ── The same address, the new file ───────────────────────────
            // The replacement's size, named "replacement-PER.pdf" (Rules
            // 8a, 10c).
            const replaced = await readAddress(out.page, guideAddress);
            expect(replaced.contentType).toBe('application/pdf');
            expect(replaced.disposition).toMatch(/^inline\b/);
            expect(replaced.fileName).toBe('replacement-PER.pdf');
            expect(replaced.contentLength).toBe(fs.statSync(REPLACEMENT_PDF).size);

            // ── "Delete" on the tab ──────────────────────────────────────
            // The row goes and "Permissions" reads "No Items"; signed out,
            // the noted address: "403 Forbidden" (Rules 5, 10b).
            const del = await list.openDelete('Author guide');
            await expect(del.dialog()).toContainText(DELETE_QUESTION);
            await del.confirm();
            await list.expectEmpty('Permissions');
            await list.expectFiles('Other', ['Internal report']);
            await list.expectNotListed('Author guide');

            await readAddress(out.page, guideAddress);
            await expect(out.page.locator('body')).toHaveText(FORBIDDEN);

            // ── Control ──────────────────────────────────────────────────
            // "Internal report"'s address (not public) and a number no file
            // has: "403 Forbidden" too (Rule 10b).
            await readAddress(out.page, reportAddress);
            await expect(out.page.locator('body')).toHaveText(FORBIDDEN);
            await readAddress(out.page, publicAddress(baseURL, tag, 999999));
            await expect(out.page.locator('body')).toHaveText(FORBIDDEN);
        } finally {
            await out.context.close();
        }
    });

    test('S3: the Publisher Library read from the workflow', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const editor = `${tag}ed`;
        const sectionEditor = `${tag}se`;
        const author = `${tag}au`;
        // Given: a scratch journal whose Publisher Library holds "Journal
        // guide" under "Other"; the Section Editor assigned to a submission
        // with an empty Submission Library (footnote s, recipe 3).
        await ojsApi.createContext({
            tag,
            context: {name: `Journal ${tag}`},
            users: [
                user(manager, 'Mona', 'Manager', ['manager']),
                user(editor, 'Erin', 'Editor', ['editor']),
                user(sectionEditor, 'Sean', 'Section', ['sectionEditor']),
                user(author, 'Ava', 'Author', ['author']),
            ],
            libraryFiles: [{name: 'Journal guide', type: 'Other'}],
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}`,
            participants: [{username: sectionEditor, role: 'sectionEditor'}],
        });

        // ── The Section Editor's read-only list ──────────────────────────
        // "Library", "View Document Library": a second window over the
        // first, headed "Publisher Library", "Journal guide" under "Other";
        // no "Add a file", no arrow (Actors row 4; Rules 2, 6).
        const se = await pageAs(asUser, sectionEditor, tag);
        await se.frame.gotoEditorial(submissionId);
        await se.library.open();
        await expect(se.library.list().addFileLink()).toBeVisible();
        let vdl = await se.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        await expect(se.library.dialog()).toHaveCount(1);
        let vdlList = vdl.list();
        await vdlList.expectGroups(TYPES);
        await vdlList.expectFiles('Other', ['Journal guide']);
        await vdlList.expectNoArrow('Journal guide');
        await expect(vdlList.addFileLink()).toHaveCount(0);
        await expect(vdlList.actionLinks()).toHaveCount(0);

        // ── Its download ─────────────────────────────────────────────────
        // (Actors row 6; Rules 8a, 8c)
        const seDownload = await vdlList.download('Journal guide');
        expect(seDownload.download.suggestedFilename()).toBe('article-OTH.pdf');
        expect(seDownload.after).toBe(seDownload.before);
        await expect(vdl.heading()).toBeVisible();

        // ── The Author's read-only list ──────────────────────────────────
        // (Actors rows 4, 6; Rules 6, 8c)
        const au = await pageAs(asUser, author, tag);
        await au.frame.gotoAuthor(submissionId);
        await au.library.open();
        const auVdl = await au.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        const auVdlList = auVdl.list();
        await auVdlList.expectFiles('Other', ['Journal guide']);
        await auVdlList.expectNoArrow('Journal guide');
        await expect(auVdlList.addFileLink()).toHaveCount(0);
        const auDownload = await auVdlList.download('Journal guide');
        expect(auDownload.download.suggestedFilename()).toBe('article-OTH.pdf');
        expect(auDownload.after).toBe(auDownload.before);

        // ── The Editor adds from the workflow ────────────────────────────
        // The list carries "Add a file" and the row an arrow (the positive
        // control of the two reads above); "Style sheet", "Marketing",
        // article.pdf, "OK": listed under "Marketing" (Actors row 5;
        // Rules 3, 6).
        const ed = await pageAs(asUser, editor, tag);
        await ed.frame.gotoEditorial(submissionId);
        await ed.library.open();
        const edVdl = await ed.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        const edVdlList = edVdl.list();
        await expect(edVdlList.addFileLink()).toBeVisible();
        await edVdlList.expectArrowFirst('Journal guide');
        const add = await edVdlList.openAdd();
        await add.add({name: 'Style sheet', type: 'Marketing', file: ARTICLE_PDF});
        await edVdlList.expectFiles('Marketing', ['Style sheet']);
        await edVdlList.expectFiles('Other', ['Journal guide']);

        // ── The tab ──────────────────────────────────────────────────────
        // (Rule 9)
        const mg = await pageAs(asUser, manager, tag);
        const tab = new PublisherLibraryTab(mg.page, tag, PUBLISHER_LIBRARY);
        await tab.goto();
        await tab.list().expectFiles('Marketing', ['Style sheet']);
        await tab.list().expectFiles('Other', ['Journal guide']);

        // ── The Section Editor's list again ──────────────────────────────
        // (Rule 9)
        await vdl.close();
        await se.library.close();
        await se.library.open();
        vdl = await se.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        vdlList = vdl.list();
        await vdlList.expectFiles('Marketing', ['Style sheet']);
        await vdlList.expectFiles('Other', ['Journal guide']);

        // ── Control ──────────────────────────────────────────────────────
        // "View Document Library" closed: the "Submission Library" under it
        // lists neither file, every group "No Items" (Rules 1a, 9).
        await vdl.close();
        const subList = se.library.list();
        await expect(se.library.heading()).toBeVisible();
        await subList.expectGroups(TYPES);
        await subList.expectAllEmpty(TYPES);
        await subList.expectNotListed('Journal guide');
        await subList.expectNotListed('Style sheet');
    });

    test('S4: library files attached to a decision email', async ({asUser, ojsApi, pkpMail, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const manager = `${tag}mg`;
        const editor = `${tag}ed`;
        const author = `${tag}au`;
        // Given: a scratch journal whose Publisher Library holds "Journal
        // guide"; a submission on the Submission stage whose Library holds
        // "Author contract" (Permissions, article.pdf) and "Old contract"
        // (Reports); another submission's Library "Other submission file"
        // (footnote s, recipe 4).
        const context = await ojsApi.createContext({
            tag,
            context: {name: `Journal ${tag}`},
            users: [
                user(manager, 'Mona', 'Manager', ['manager']),
                user(editor, 'Erin', 'Editor', ['editor']),
                user(author, 'Ava', 'Author', ['author']),
            ],
            libraryFiles: [{name: 'Journal guide', type: 'Other'}],
        });
        const title = `Decided ${tag}`;
        const decided = await ojsApi.createSubmission({
            tag: `${tag}d`,
            context: tag,
            submitter: author,
            title,
            libraryFiles: [
                {name: 'Author contract', type: 'Permissions'},
                {name: 'Old contract', type: 'Reports'},
            ],
        });
        const other = await ojsApi.createSubmission({
            tag: `${tag}o`,
            context: tag,
            submitter: author,
            title: `Other ${tag}`,
            libraryFiles: [{name: 'Other submission file', type: 'Other'}],
        });
        const guideId = context.libraryFiles[0].id;
        const contractId = decided.libraryFiles[0].id;

        const ed = await pageAs(asUser, editor, tag);
        await ed.frame.gotoEditorial(decided.submissionId);

        // ── The window, this submission's files only ─────────────────────
        // (Rule 1a)
        await ed.library.open();
        const list = ed.library.list();
        await list.expectFiles('Permissions', ['Author contract']);
        await list.expectFiles('Reports', ['Old contract']);
        await list.expectEmpty('Other');
        await list.expectNotListed('Other submission file');
        await list.expectNotListed('Journal guide');

        // ── The "Delete" dialog ──────────────────────────────────────────
        // Titled "Delete", its question, "OK" and "Cancel"; "Cancel": the
        // row stays; "Delete" again, "OK": gone, "Reports" "No Items"
        // (Rule 5).
        let del = await list.openDelete('Old contract');
        await expect(del.dialog()).toContainText(DELETE_QUESTION);
        await expect(del.okButton()).toBeVisible();
        await expect(del.cancelButton()).toBeVisible();
        await del.cancel();
        await list.expectFiles('Reports', ['Old contract']);
        del = await list.openDelete('Old contract');
        await del.confirm();
        await list.expectEmpty('Reports');
        await list.expectNotListed('Old contract');
        await list.expectFiles('Permissions', ['Author contract']);

        // ── "Library Files" ──────────────────────────────────────────────
        // "Decline Submission" › "Attach Files" › "Attach Library Files":
        // "Author contract" first, then "Journal guide", each "{number}
        // {Name} {type} Download"; neither "Old contract" nor "Other
        // submission file" (Rules 5, 11a).
        await ed.library.close();
        const wizard = new DecisionWizardPage(ed.page);
        const composer = new ComposerPage(ed.page);
        await ed.frame.actionButton('Decline Submission').click();
        await wizard.expectTitle('Decline Submission');
        await wizard.awaitComposerLoaded();
        await composer.openAttachWindow();
        const libraryFiles = await composer.openAttachSource('Attach Library Files', LIBRARY_FILES_WINDOW);
        const items = libraryFiles.locator('.selectSubmissionFileListItem');
        await expect(items).toHaveText([
            new RegExp(`^\\s*${contractId}\\s+Author contract\\s+Permissions\\s+Download\\s*$`),
            new RegExp(`^\\s*${guideId}\\s+Journal guide\\s+Other\\s+Download\\s*$`),
        ], {timeout: 30_000});
        await expect(libraryFiles).not.toContainText('Old contract');
        await expect(libraryFiles).not.toContainText('Other submission file');

        // ── "Download" ───────────────────────────────────────────────────
        // (Rules 8, 11)
        const contractItem = items.filter({hasText: 'Author contract'});
        const {download} = await captureDownload(ed.page, () => contractItem.getByRole('link', {name: 'Download'}).click());
        expect(download.suggestedFilename()).toBe('article-PER.pdf');

        // ── Attaching ────────────────────────────────────────────────────
        // The chip reads "article-PER.pdf"; "Record Decision" (Rule 8a;
        // Side effects bullet 1).
        await composer.attachSelected(libraryFiles, 'Author contract', 'article-PER.pdf');
        await expect(composer.attachmentChips()).toHaveText([/article-PER\.pdf/]);
        await wizard.recordDecision('Submission Declined');

        // ── The Author's email ───────────────────────────────────────────
        // The decision's email carries "article-PER.pdf", not "Author
        // contract" (Side effects bullet 1).
        const mail = await pkpMail.find({to: mailOf(author), subject: 'Your submission has been declined', contains: title});
        const full = await pkpMail.fullMessage(mail.ID);
        const attached = (full.Attachments || []).map((a) => a.FileName);
        expect(attached).toEqual(['article-PER.pdf']);

        // ── The public address ───────────────────────────────────────────
        // Signed out, "Author contract"'s number: "403 Forbidden" (Rule 10b).
        const out = await signedOutPage(browser, baseURL);
        try {
            await readAddress(out.page, publicAddress(baseURL, tag, contractId));
            await expect(out.page.locator('body')).toHaveText(FORBIDDEN);
        } finally {
            await out.context.close();
        }

        // ── Control ──────────────────────────────────────────────────────
        // The other submission's "Library": "Other submission file" under
        // "Other", "Author contract" not listed (Rule 1a).
        await ed.frame.gotoEditorial(other.submissionId);
        await ed.library.open();
        await list.expectFiles('Other', ['Other submission file']);
        await list.expectEmpty('Permissions');
        await list.expectNotListed('Author contract');
    });

    test('S5: an assistant on a stage it may not open', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const tagB = `${tag}b`;
        // Given: on each of two scratch journals, a Copyeditor assigned to a
        // submission on the Production stage whose Library holds "Editor
        // contract" under "Permissions", the Publisher Library "Journal
        // guide" under "Other"; the second journal's Copyeditor role with
        // "Submission" ticked under "Stage Assignment" (footnote s, recipe 5).
        const seed = async (journal, extra = {}) => {
            await ojsApi.createContext({
                tag: journal,
                context: {name: `Journal ${journal}`},
                users: [
                    user(`${journal}mg`, 'Mona', 'Manager', ['manager']),
                    user(`${journal}ed`, 'Erin', 'Editor', ['editor']),
                    user(`${journal}ce`, 'Cora', 'Copyeditor', ['copyeditor']),
                    user(`${journal}au`, 'Ava', 'Author', ['author']),
                ],
                libraryFiles: [{name: 'Journal guide', type: 'Other'}],
                ...extra,
            });
            return await ojsApi.createSubmission({
                tag: `${journal}s`,
                context: journal,
                submitter: `${journal}au`,
                title: `Submission ${journal}`,
                decisions: ['sendExternalReview', 'accept', 'sendToProduction'],
                participants: [{username: `${journal}ce`, role: 'copyeditor'}],
                libraryFiles: [{name: 'Editor contract', type: 'Permissions'}],
            });
        };
        const first = await seed(tag);
        const second = await seed(tagB, {roles: {copyeditor: {stages: {submission: true}}}});

        // ── The stage without its panels ─────────────────────────────────
        // "Production": the no-access box in place of the panels, "Library"
        // still in the header (Rule 1b).
        const ce = await pageAs(asUser, `${tag}ce`, tag);
        await ce.frame.gotoEditorial(first.submissionId);
        await ce.frame.menuLink('Production').click();
        await ce.frame.expectNoAccessOnly();
        await expect(ce.library.libraryButton()).toBeVisible();

        // ── The window ───────────────────────────────────────────────────
        // "Add a file" and "View Document Library"; "Editor contract" under
        // "Permissions" (Actors rows 1, 2; Rule 1b).
        await ce.library.open();
        const list = ce.library.list();
        await expect(list.actionLinks()).toHaveText(['Add a file', 'View Document Library']);
        await list.expectFiles('Permissions', ['Editor contract']);

        // ── "Add a file" ─────────────────────────────────────────────────
        // (Actors row 2; Rule 3)
        const add = await list.openAdd();
        await add.add({name: 'Copyedit note', type: 'Other', file: ARTICLE_PDF});
        await list.expectFiles('Other', ['Copyedit note']);

        // ── The Editor reads it ──────────────────────────────────────────
        // (Actors row 3; Rule 8a)
        const ed = await pageAs(asUser, `${tag}ed`, tag);
        await ed.frame.gotoEditorial(first.submissionId);
        await ed.library.open();
        const edList = ed.library.list();
        await edList.expectFiles('Other', ['Copyedit note']);
        const edDownload = await edList.download('Copyedit note');
        expect(edDownload.download.suggestedFilename()).toBe('article-OTH-1.pdf');
        expect(edDownload.after).toBe(edDownload.before);
        await expect(ed.library.heading()).toBeVisible();

        // ── A Copyeditor given the Submission stage ──────────────────────
        // On the second journal: "Editor contract" downloads, the page
        // staying on the workflow screen (Actors row 3; Settings bullet 1).
        const ceB = await pageAs(asUser, `${tagB}ce`, tagB);
        await ceB.frame.gotoEditorial(second.submissionId);
        await ceB.library.open();
        const bDownload = await ceB.library.list().download('Editor contract');
        expect(bDownload.download.suggestedFilename()).toBe('article-PER.pdf');
        expect(bDownload.after).toBe(bDownload.before);
        await expect(ceB.page).toHaveURL(new RegExp(`workflowSubmissionId=${second.submissionId}\\b`));
        await expect(ceB.library.heading()).toBeVisible();

        // ── Control ──────────────────────────────────────────────────────
        // First journal, Copyeditor: "View Document Library" lists "Journal
        // guide" under "Other" with no "Add a file" and no arrow (the
        // Copyeditor's own "Copyedit note" row, with its arrow, and the
        // window's "Add a file" are the positive controls) (Rule 6).
        await list.expectArrowFirst('Copyedit note');
        const vdl = await ce.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        const vdlList = vdl.list();
        await vdlList.expectFiles('Other', ['Journal guide']);
        await vdlList.expectNoArrow('Journal guide');
        await expect(vdlList.addFileLink()).toHaveCount(0);
    });
});
