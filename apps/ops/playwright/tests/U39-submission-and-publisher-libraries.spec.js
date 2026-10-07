// @ts-check
/**
 * @file playwright/tests/U39-submission-and-publisher-libraries.spec.js
 *
 * Submission & Publisher Libraries — OPS suite, one test per canonical
 * scenario the spec runs on a preprint server (S1–S4, the common ones), in
 * the preprint server's own words: the "Preprint Server Library" (the
 * Settings tab and the list heading), the Preprint Server Manager in the
 * Editor's part (a preprint server enrols no editor), a Moderator in the
 * Section Editor's part (S3), Production as the stage S4 decides on, and
 * `preprint.pdf` in place of `article.pdf` ("preprint-OTH.pdf",
 * "preprint-PER.pdf"). S5 is {OJS OMP}: a preprint server's assistant roles
 * never reach the workflow, which *Workflow screen & stage access* owns
 * (spec S5's closing line; Coverage "Owned by another feature").
 * Spec: docs/specs/U39-submission-and-publisher-libraries.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: on a preprint server the Author's press on a Submission Library
 *   file is refused, so S1 runs without "The Author's download"; the
 *   Moderator (S3) presses Publisher Library files only.
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
 * are read-only (A1, A7). S1 runs on publicknowledge on its own preprint
 * (a unique tag, M5), with no downloaded name read and nothing deleted;
 * S2–S4 run on scratch preprint servers with throwaway accounts, as
 * footnote s says (stored names collide across workers on
 * publicknowledge). A file a Given names is seeded with `libraryFiles[]`
 * on the context or the submission. Every window close, page leave and
 * sign-in change runs with a browser-dialog recorder on the page; the
 * question is asserted where S1 quotes it. Downloads are read through
 * Playwright's download event; the public address through its response
 * headers in a signed-out context (headless Chromium turns an inline PDF
 * into a download), a refusal through the page's text. Every absence is
 * read settled and paired with a positive control taken the same way
 * (M4, M6). Waits are web-first (A5). Everything runs in the parallel
 * `ops` project.
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
    DROP_PROMPT,
    FORBIDDEN,
    SubmissionLibraryWindow,
    PublisherLibraryTab,
    publicAddress,
    readAddress,
    pastCloseWindow,
} = require('../../../../shared/playwright/pages/LibraryPages.js');
const {DecisionPage} = require('../pages/DecisionPage.js');
const {ComposerPage, LIBRARY_FILES_WINDOW} = require('../pages/DecisionWizardPages.js');

const SERVER = 'publicknowledge';
/** A preprint server enrols no editor: the Preprint Server Manager takes the Editor's part (footnote s). */
const EDITOR = 'manager.maya';
const AUTHOR = 'author.alex';

/** The preprint server's library name: the Settings tab and the list heading (Rules 6, 9). */
const PUBLISHER_LIBRARY = 'Preprint Server Library';

/** The "Type" list's groups, in order (Fields "Type"). */
const TYPES = ['Marketing', 'Permissions', 'Reports', 'Other'];

/** The "Add a file" window's fields (Fields). */
const ADD_FIELDS = ['Name', 'Type', 'Description', 'File'];

/** An upload fixture's path. */
const fx = (name) => path.join(__dirname, '..', 'fixtures', 'files', name);
const PREPRINT_PDF = fx('preprint.pdf');
const REPLACEMENT_PDF = fx('replacement.pdf');

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u39${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
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

test.describe('submission and publisher libraries (U39) — OPS', () => {
    test('S1: a file shared through the Submission Library', {tag: '@smoke'}, async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        // Given: the Preprint Server Manager (the Editor's part), on a
        // preprint its Author submitted, whose Submission Library is empty
        // (footnote s, recipe 1).
        const {submissionId} = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, title: `Preprint ${tag}`});

        const ed = await pageAs(asUser, EDITOR, SERVER);
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
        // "Author agreement", "Permissions", preprint.pdf: the button reads
        // "Change File"; "OK": the row under "Permissions", a link with its
        // kind's icon, the row starting with an arrow; the other groups
        // still "No Items" (Rules 2, 3).
        add = await list.openAdd();
        await add.nameBox().fill('Author agreement');
        await add.chooseType('Permissions');
        await add.upload(PREPRINT_PDF);
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
        // "Permissions" (Actors row 1; Rule 1). "The Author's download" is
        // {OJS OMP}: a preprint server refuses it (A1).
        const au = await pageAs(asUser, AUTHOR, SERVER);
        await au.frame.gotoAuthor(submissionId);
        await au.library.open();
        const auList = au.library.list();
        await auList.expectFiles('Permissions', ['Author agreement']);

        // ── The Author adds a file ───────────────────────────────────────
        // "Signed permission" joins "Author agreement" under "Permissions",
        // in no set order (Actors row 2; Rules 1, 3).
        add = await auList.openAdd();
        await add.add({name: 'Signed permission', type: 'Permissions', file: PREPRINT_PDF});
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

    test('S2: the Publisher Library on the Settings tab', async ({asUser, opsApi, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const manager = `${tag}mg`;
        // Given: the Preprint Server Manager of a scratch preprint server
        // whose Publisher Library (the Preprint Server Library) is empty
        // (footnote s, recipe 2).
        await opsApi.createContext({tag, context: {name: `Server ${tag}`}, users: [user(manager, 'Mona', 'Manager', ['manager'])]});

        const mg = await pageAs(asUser, manager, tag);
        const tab = new PublisherLibraryTab(mg.page, tag, PUBLISHER_LIBRARY);

        // ── The tab ──────────────────────────────────────────────────────
        // "Workflow Settings" › "Preprint Server Library": the list headed
        // so, "Add a file" above it and no "View Document Library", every
        // group "No Items" (Rules 1, 9).
        await tab.goto();
        const list = tab.list();
        await expect(list.heading()).toHaveText(PUBLISHER_LIBRARY);
        await expect(list.actionLinks()).toHaveText(['Add a file']);
        await expect(list.viewDocumentLibraryLink()).toHaveCount(0);
        await list.expectGroups(TYPES);
        await list.expectAllEmpty(TYPES);

        // ── "Public Access" in "Add a file" ──────────────────────────────
        // Unticked, the sentence and an address ending "/downloadPublic/id";
        // "Journal guide", "Other", preprint.pdf, ticked, "OK": listed
        // under "Other" (Fields "Public Access"; Rule 3).
        let add = await list.openAdd();
        await expect(add.publicAccessBox()).not.toBeChecked();
        await expect(add.publicAccessSentence()).toBeVisible();
        await expect(add.publicAddress()).toHaveText(/\/downloadPublic\/id$/);
        await add.add({name: 'Journal guide', type: 'Other', file: PREPRINT_PDF, publicAccess: true});
        await list.expectFiles('Other', ['Journal guide']);

        // ── A second file from the same upload ───────────────────────────
        add = await list.openAdd();
        await add.add({name: 'Internal report', type: 'Other', file: PREPRINT_PDF, publicAccess: false});
        await list.expectFiles('Other', ['Journal guide', 'Internal report']);

        // ── The downloaded names ─────────────────────────────────────────
        // "Journal guide" downloads as "preprint-OTH.pdf", the page
        // staying; "Internal report" as "preprint-OTH-1.pdf" (Rule 8a).
        const guideDownload = await list.download('Journal guide');
        expect(guideDownload.download.suggestedFilename()).toBe('preprint-OTH.pdf');
        expect(guideDownload.after).toBe(guideDownload.before);
        const reportDownload = await list.download('Internal report');
        expect(reportDownload.download.suggestedFilename()).toBe('preprint-OTH-1.pdf');

        // ── The "Edit" window ────────────────────────────────────────────
        // "Journal guide"'s "Edit": the saved "Name" and "Type", the "File"
        // lines, "Replace file", "Public Access" ticked over the server's
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
        await expect(edit.fileLine('File Name')).toHaveText('preprint.pdf');
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
        // named "preprint-OTH.pdf" (Rule 10a).
        const out = await signedOutPage(browser, baseURL);
        try {
            const guide = await readAddress(out.page, guideAddress);
            expect(guide.contentType).toBe('application/pdf');
            expect(guide.disposition).toMatch(/^inline\b/);
            expect(guide.fileName).toBe('preprint-OTH.pdf');
            expect(guide.contentLength).toBe(fs.statSync(PREPRINT_PDF).size);

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

    test('S3: the Publisher Library read from the workflow', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const moderator = `${tag}md`;
        const author = `${tag}au`;
        // Given: a scratch preprint server whose Preprint Server Library
        // holds "Journal guide" under "Other"; a Moderator (the Section
        // Editor's part) assigned to a preprint with an empty Submission
        // Library (footnote s, recipe 3; no `editor` on a preprint server,
        // the Preprint Server Manager takes the Editor's part).
        await opsApi.createContext({
            tag,
            context: {name: `Server ${tag}`},
            users: [
                user(manager, 'Mona', 'Manager', ['manager']),
                user(moderator, 'Milo', 'Moderator', ['sectionEditor']),
                user(author, 'Ava', 'Author', ['author']),
            ],
            libraryFiles: [{name: 'Journal guide', type: 'Other'}],
        });
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Preprint ${tag}`,
            participants: [{username: moderator, role: 'sectionEditor'}],
        });

        // ── The Moderator's read-only list ───────────────────────────────
        // "Library", "View Document Library": a second window over the
        // first, headed "Preprint Server Library", "Journal guide" under
        // "Other"; no "Add a file", no arrow (Actors row 4; Rules 2, 6).
        const md = await pageAs(asUser, moderator, tag);
        await md.frame.gotoEditorial(submissionId);
        await md.library.open();
        await expect(md.library.list().addFileLink()).toBeVisible();
        let vdl = await md.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        await expect(md.library.dialog()).toHaveCount(1);
        let vdlList = vdl.list();
        await vdlList.expectGroups(TYPES);
        await vdlList.expectFiles('Other', ['Journal guide']);
        await vdlList.expectNoArrow('Journal guide');
        await expect(vdlList.addFileLink()).toHaveCount(0);
        await expect(vdlList.actionLinks()).toHaveCount(0);

        // ── Its download ─────────────────────────────────────────────────
        // (Actors row 6; Rules 8a, 8c)
        const mdDownload = await vdlList.download('Journal guide');
        expect(mdDownload.download.suggestedFilename()).toBe('preprint-OTH.pdf');
        expect(mdDownload.after).toBe(mdDownload.before);
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
        expect(auDownload.download.suggestedFilename()).toBe('preprint-OTH.pdf');
        expect(auDownload.after).toBe(auDownload.before);

        // ── The Editor adds from the workflow ────────────────────────────
        // The Preprint Server Manager: the list carries "Add a file" and
        // the row an arrow (the positive control of the two reads above);
        // "Style sheet", "Marketing", preprint.pdf, "OK": listed under
        // "Marketing" (Actors row 5; Rules 3, 6).
        const ed = await pageAs(asUser, manager, tag);
        await ed.frame.gotoEditorial(submissionId);
        await ed.library.open();
        const edVdl = await ed.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        const edVdlList = edVdl.list();
        await expect(edVdlList.addFileLink()).toBeVisible();
        await edVdlList.expectArrowFirst('Journal guide');
        const add = await edVdlList.openAdd();
        await add.add({name: 'Style sheet', type: 'Marketing', file: PREPRINT_PDF});
        await edVdlList.expectFiles('Marketing', ['Style sheet']);
        await edVdlList.expectFiles('Other', ['Journal guide']);

        // ── The tab ──────────────────────────────────────────────────────
        // The same manager, Settings › Workflow › "Preprint Server
        // Library", in a second tab of the same session (Rule 9).
        const mgPage = await ed.page.context().newPage();
        recordBrowserDialogs(mgPage);
        const tab = new PublisherLibraryTab(mgPage, tag, PUBLISHER_LIBRARY);
        await tab.goto();
        await tab.list().expectFiles('Marketing', ['Style sheet']);
        await tab.list().expectFiles('Other', ['Journal guide']);

        // ── The Moderator's list again ───────────────────────────────────
        // (Rule 9)
        await vdl.close();
        await md.library.close();
        await md.library.open();
        vdl = await md.library.openDocumentLibrary(PUBLISHER_LIBRARY);
        vdlList = vdl.list();
        await vdlList.expectFiles('Marketing', ['Style sheet']);
        await vdlList.expectFiles('Other', ['Journal guide']);

        // ── Control ──────────────────────────────────────────────────────
        // "View Document Library" closed: the "Submission Library" under it
        // lists neither file, every group "No Items" (Rules 1a, 9).
        await vdl.close();
        const subList = md.library.list();
        await expect(md.library.heading()).toBeVisible();
        await subList.expectGroups(TYPES);
        await subList.expectAllEmpty(TYPES);
        await subList.expectNotListed('Journal guide');
        await subList.expectNotListed('Style sheet');
    });

    test('S4: library files attached to a decision email', async ({asUser, opsApi, pkpMail, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        // Given: a scratch preprint server whose Preprint Server Library
        // holds "Journal guide"; a preprint on Production whose Library
        // holds "Author contract" (Permissions, preprint.pdf) and "Old
        // contract" (Reports); another preprint's Library "Other submission
        // file"; the Preprint Server Manager decides (footnote s, recipe 4).
        const context = await opsApi.createContext({
            tag,
            context: {name: `Server ${tag}`},
            users: [
                user(manager, 'Mona', 'Manager', ['manager']),
                user(author, 'Ava', 'Author', ['author']),
            ],
            libraryFiles: [{name: 'Journal guide', type: 'Other'}],
        });
        const title = `Decided ${tag}`;
        const decided = await opsApi.createSubmission({
            tag: `${tag}d`,
            context: tag,
            submitter: author,
            title,
            libraryFiles: [
                {name: 'Author contract', type: 'Permissions'},
                {name: 'Old contract', type: 'Reports'},
            ],
        });
        const other = await opsApi.createSubmission({
            tag: `${tag}o`,
            context: tag,
            submitter: author,
            title: `Other ${tag}`,
            libraryFiles: [{name: 'Other submission file', type: 'Other'}],
        });
        const guideId = context.libraryFiles[0].id;
        const contractId = decided.libraryFiles[0].id;
        expect(decided.libraryFiles[0].fileName).toBe('preprint-PER.pdf');

        const ed = await pageAs(asUser, manager, tag);
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
        // Production's "Decline Submission" › "Attach Files" › "Attach
        // Library Files": "Author contract" first, then "Journal guide",
        // each "{number} {Name} {type} Download"; neither "Old contract"
        // nor "Other submission file" (Rules 5, 11a).
        await ed.library.close();
        const decision = new DecisionPage(ed.page);
        const composer = new ComposerPage(ed.page);
        await ed.frame.actionButton('Decline Submission').click();
        await decision.expectOpen('Decline Submission');
        await decision.awaitComposerLoaded();
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
        expect(download.suggestedFilename()).toBe('preprint-PER.pdf');

        // ── Attaching ────────────────────────────────────────────────────
        // The chip reads "preprint-PER.pdf"; "Record Decision" (Rule 8a;
        // Side effects bullet 1).
        await composer.attachSelected(libraryFiles, 'Author contract', 'preprint-PER.pdf');
        await expect(composer.attachmentChips()).toHaveText([/preprint-PER\.pdf/]);
        await decision.recordDecision('Submission Declined');

        // ── The Author's email ───────────────────────────────────────────
        // The decision's email carries "preprint-PER.pdf", not "Author
        // contract" (Side effects bullet 1).
        const mail = await pkpMail.find({to: mailOf(author), subject: 'Your submission has been declined', contains: title});
        const full = await pkpMail.fullMessage(mail.ID);
        const attached = (full.Attachments || []).map((a) => a.FileName);
        expect(attached).toEqual(['preprint-PER.pdf']);

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
        // The other preprint's "Library": "Other submission file" under
        // "Other", "Author contract" not listed (Rule 1a).
        await ed.frame.gotoEditorial(other.submissionId);
        await ed.library.open();
        await list.expectFiles('Other', ['Other submission file']);
        await list.expectEmpty('Permissions');
        await list.expectNotListed('Author contract');
    });
});
