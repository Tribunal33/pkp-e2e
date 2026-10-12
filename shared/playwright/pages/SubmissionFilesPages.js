// @ts-check
/**
 * @file shared/playwright/pages/SubmissionFilesPages.js
 *
 * Page objects for the Submission files feature (spec:
 * docs/specs/U36-submission-files.md), shared by the OJS and OMP suites
 * (a preprint server lists no workflow files; its galleys reach the same
 * windows). App-neutral: every per-app string (a list title, a component
 * name, a wizard title) is passed in by the suite.
 *
 * Surfaces:
 * - FileList — a workflow file list on a stage of the workflow panel (the
 *   shared frame, `WorkflowPage.js`): its table, "Upload" /
 *   "Upload/Select Files" above it, "Download All Files" under it, a row's
 *   cells, its name link (a download in a new tab) and its "More Actions"
 *   menu. The author's lists are the same component in the author view.
 * - UploadWizard — the legacy three-step upload wizard ("1. Upload File",
 *   "2. Review Details", "3. Confirm"), found by its window title; step 1's
 *   two drop-downs and upload box, step 2's fields, step 3's "Add Another
 *   File" and "Complete", the "Cancel" link and the header "Close".
 * - EditFileWindow — "Update File Details" ("Edit a file"): the fields,
 *   "Save" / "Cancel", and an HTML file's "Dependent Files" list with its
 *   "Upload File" link.
 * - InformationCenter — "More Information" ("Information Center: {name}"):
 *   the "History" and "Notes" tabs, a history row's "Download", the notes
 *   with "Add Note" / "Delete", and "Earlier Revision Notes".
 * - DeleteFileDialog — the row menu's "Delete" dialog.
 * - ReviewerFileList — the reviewer's "Review Files" list (a thin reader
 *   over `ReviewerPages.js`' ReviewWizardPage, which owns the wizard).
 * - WizardFilesPanel — the submission wizard's "Files" panel on its
 *   "Upload Files" step (the step itself is the app's SubmissionWizardPage):
 *   "Add File", the empty panel, a row's upload progress and "Cancel
 *   upload", the component links, "Edit {name}", "Remove".
 * - captureDownload / zipEntryNames — a download read through Playwright's
 *   download event (a list's name link opens a new tab, so the tab's
 *   download counts too), and the entry names of a downloaded zip.
 *
 * DOM shapes: the U36 claim check (.reports/U36/screen-notes.md, ccK1–ccK5)
 * and the templates they cite; verified by the OJS suite 2026-09-23.
 */
const fs = require('fs');
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {motionEnded} = require('../support/motion.js');

/** The stage menu keys (WORKFLOW_STAGE_ID_*), for `WorkflowPage.gotoEditorial(id, {menuKey})`. */
const MENU_KEYS = {
    submission: 'workflow_1',
    review: 'workflow_3',
    copyediting: 'workflow_4',
    production: 'workflow_5',
};
exports.MENU_KEYS = MENU_KEYS;

/** The wizard's step names, in order. */
const WIZARD_STEPS = ['1. Upload File', '2. Review Details', '3. Confirm'];
exports.WIZARD_STEPS = WIZARD_STEPS;

/** Step 1's revise list opens on this entry. */
const NOT_A_REVISION = 'This is not a revision of an existing file';
exports.NOT_A_REVISION = NOT_A_REVISION;

/** The name box's label in step 2 and in "Edit a file". */
const NAME_LABEL = 'Name the file (e.g., Manuscript; Table 1)';
exports.NAME_LABEL = NAME_LABEL;

/** The fields a "Supplementary Content" component adds under the name box (Fields). */
const SUPPLEMENTARY_FIELDS = [
    'Description',
    'Creator (or owner) of file',
    'Publisher',
    'Source',
    'Subject',
    'Contributor or sponsoring agency',
    'Date',
    'Language',
];
exports.SUPPLEMENTARY_FIELDS = SUPPLEMENTARY_FIELDS;

/** The browser's own question on step 1's header "Close" (Rule 6) and on a Notes → History switch (Rule 14a). */
const FORM_CHANGED_QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
exports.FORM_CHANGED_QUESTION = FORM_CHANGED_QUESTION;

/** The "Delete" dialog's question (Rule 4). */
const DELETE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
exports.DELETE_QUESTION = DELETE_QUESTION;

/** Escape a string for a RegExp. */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Collapse whitespace. */
function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

/**
 * Run `action` and return the download it starts, whether the page itself
 * downloads ("Download All Files", a history "Download") or a tab it opens
 * does (a list's name link, `target="_blank"`). Tabs opened by the action
 * are closed afterwards. Rejects when nothing downloads within `timeout`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<unknown>} action
 * @param {{timeout?: number}} [options]
 * @returns {Promise<{download: import('@playwright/test').Download, newTab: boolean}>}
 */
async function captureDownload(page, action, {timeout = 30_000} = {}) {
    /** @type {import('@playwright/test').Download[]} */
    const got = [];
    /** @type {import('@playwright/test').Page[]} */
    const tabs = [];
    const onDownload = (/** @type {import('@playwright/test').Download} */ d) => got.push(d);
    const onPage = (/** @type {import('@playwright/test').Page} */ p) => {
        tabs.push(p);
        p.on('download', onDownload);
    };
    page.on('download', onDownload);
    page.context().on('page', onPage);
    try {
        await action();
        await expect.poll(() => got.length, {timeout, message: 'a download starts'}).toBeGreaterThan(0);
        return {download: got[0], newTab: tabs.length > 0};
    } finally {
        page.off('download', onDownload);
        page.context().off('page', onPage);
        for (const tab of tabs) {
            await tab.close().catch(() => {});
        }
    }
}
exports.captureDownload = captureDownload;

/**
 * The entry names of a downloaded zip, read from its central directory.
 *
 * @param {import('@playwright/test').Download} download
 * @returns {Promise<string[]>}
 */
async function zipEntryNames(download) {
    const file = await download.path();
    const buffer = fs.readFileSync(file);
    // End of central directory record: signature 0x06054b50, within the last 64 KiB.
    let end = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) {
            end = i;
            break;
        }
    }
    if (end < 0) {
        throw new Error('zipEntryNames: not a zip file');
    }
    const count = buffer.readUInt16LE(end + 10);
    let at = buffer.readUInt32LE(end + 16);
    const names = [];
    for (let n = 0; n < count; n++) {
        if (buffer.readUInt32LE(at) !== 0x02014b50) {
            throw new Error('zipEntryNames: broken central directory');
        }
        const nameLength = buffer.readUInt16LE(at + 28);
        const extraLength = buffer.readUInt16LE(at + 30);
        const commentLength = buffer.readUInt16LE(at + 32);
        names.push(buffer.toString('utf8', at + 46, at + 46 + nameLength));
        at += 46 + nameLength + extraLength + commentLength;
    }
    return names;
}
exports.zipEntryNames = zipEntryNames;

/**
 * The first bytes of a downloaded file, as text (a PDF starts "%PDF").
 *
 * @param {import('@playwright/test').Download} download
 * @param {number} [length]
 */
async function downloadHead(download, length = 8) {
    const file = await download.path();
    return fs.readFileSync(file).subarray(0, length).toString('latin1');
}
exports.downloadHead = downloadHead;

// ---------------------------------------------------------------------------
// Browser dialogs (confirm/alert)
// ---------------------------------------------------------------------------

/**
 * Record every browser dialog (confirm, alert, beforeunload) the page
 * raises and answer each with the answer at the head of `answers` (then
 * `fallback`). The returned recorder's `messages` lists what was asked.
 * Register it before the step that may ask (Playwright otherwise dismisses
 * a dialog silently).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{fallback?: 'accept' | 'dismiss'}} [options]
 */
function recordBrowserDialogs(page, {fallback = 'accept'} = {}) {
    /** @type {string[]} */
    const messages = [];
    /** @type {Array<'accept' | 'dismiss'>} */
    const answers = [];
    const handler = async (/** @type {import('@playwright/test').Dialog} */ dialog) => {
        messages.push(dialog.message());
        const answer = answers.shift() || fallback;
        if (answer === 'accept') {
            await dialog.accept().catch(() => {});
        } else {
            await dialog.dismiss().catch(() => {});
        }
    };
    page.on('dialog', handler);
    return {
        messages,
        /** Queue the answer to the next dialog. */
        answerNext(/** @type {'accept' | 'dismiss'} */ answer) {
            answers.push(answer);
        },
        stop() {
            page.off('dialog', handler);
        },
    };
}
exports.recordBrowserDialogs = recordBrowserDialogs;

// ---------------------------------------------------------------------------
// A workflow file list (Rules 1–3)
// ---------------------------------------------------------------------------

exports.FileList = class FileList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('./WorkflowPage.js').WorkflowPage} frame the open workflow panel
     * @param {string} title the list's title ("Submission Files", "Draft Files", …)
     */
    constructor(page, frame, title) {
        super(page);
        this.frame = frame;
        this.title = title;
    }

    /** The list's table (named after the list). */
    table() {
        return this.frame.dialog().getByRole('table', {name: this.title, exact: true});
    }

    /** The list's level-3 heading. */
    heading() {
        return this.frame.dialog().getByRole('heading', {name: this.title, exact: true, level: 3});
    }

    /**
     * The list's whole panel: the innermost element holding both its heading
     * and its table, so the buttons above and under the table are in scope.
     */
    wrapper() {
        return this.frame
            .dialog()
            .locator('div')
            .filter({has: this.page.getByRole('heading', {name: this.title, exact: true, level: 3})})
            .filter({has: this.page.getByRole('table', {name: this.title, exact: true})})
            .last();
    }

    /** "Upload" above the list. */
    uploadButton() {
        return this.wrapper().getByRole('button', {name: 'Upload', exact: true});
    }

    /** "Upload/Select Files" above the list. */
    uploadSelectButton() {
        return this.wrapper().getByRole('button', {name: 'Upload/Select Files', exact: true});
    }

    /** "Download All Files" under the list. */
    downloadAllButton() {
        return this.wrapper().getByRole('button', {name: 'Download All Files', exact: true});
    }

    /** The file rows (rows with a file-name row header; the "No Items" row has none). */
    rows() {
        return this.table().locator('tbody tr').filter({has: this.page.getByRole('rowheader')});
    }

    /** The row listing the named file (its name cell matched exactly). */
    row(name) {
        return this.table().getByRole('row').filter({has: this.page.getByRole('rowheader', {name, exact: true})});
    }

    /** The empty list's "No Items" cell. */
    noItems() {
        return this.table().getByRole('cell', {name: 'No Items', exact: true});
    }

    /** Every file name on the list, top to bottom (read through a poll by the caller). */
    async names() {
        const names = await this.rows().getByRole('rowheader').allInnerTexts();
        return names.map(flat);
    }

    /** The list's file names are exactly these, in any order (an auto-waited read). */
    async expectNames(names) {
        await expect
            .poll(async () => (await this.names()).sort(), {timeout: 30_000})
            .toEqual([...names].sort());
    }

    /** A row's "No" cell (the file's number). */
    numberCell(row) {
        return row.getByRole('cell').nth(0);
    }

    /** A row's "Date uploaded" cell. */
    dateCell(row) {
        return row.getByRole('cell').nth(1);
    }

    /** A row's "Type" cell (the component, and "Amendment Notice" on a revision with a summary). */
    typeCell(row) {
        return row.getByRole('cell').nth(2);
    }

    /** A row's file number, as text. */
    async rowNumber(row) {
        return flat(await this.numberCell(row).innerText());
    }

    /**
     * The row shows a number under "No", the name, a date under "Date
     * uploaded" and `type` under "Type" (Rule 1). Returns the row.
     */
    async expectRow(name, {type}) {
        const row = this.row(name);
        await expect(row).toBeVisible({timeout: 30_000});
        await expect(this.numberCell(row)).toHaveText(/^\s*\d+\s*$/);
        await expect(row.getByRole('rowheader')).toHaveText(name);
        await expect(this.dateCell(row)).toHaveText(/^\s*\d{4}-\d{2}-\d{2}\s*$/);
        await expect(this.typeCell(row)).toHaveText(type);
        return row;
    }

    /** The file-name link of a row. */
    nameLink(row) {
        return row.getByRole('rowheader').getByRole('link');
    }

    /** Press a row's name: the file downloads (from a new tab). */
    async download(row) {
        return await captureDownload(this.page, () => this.nameLink(row).click());
    }

    /** Press "Download All Files": the list downloads as one archive. */
    async downloadAll() {
        return await captureDownload(this.page, () => this.downloadAllButton().click());
    }

    /** A row's "More Actions" button. */
    menuButton(row) {
        return row.getByRole('button', {name: 'More Actions'});
    }

    /** The open row menu (it portals to the page root). */
    menu() {
        return this.page.getByRole('menu');
    }

    /** Open a row's menu and wait for its entries. */
    async openMenu(row) {
        await this.menuButton(row).click();
        await expect(this.menu().getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
        return this.menu();
    }

    /** Close the open menu by pressing its button again (Escape would close the workflow too). */
    async closeMenu(row) {
        await this.menuButton(row).click();
        await expect(this.menu()).toHaveCount(0, {timeout: 30_000});
    }

    /** Open a row's menu, read its entries in order, and close it again. */
    async menuEntries(row) {
        const menu = await this.openMenu(row);
        const entries = (await menu.getByRole('menuitem').allInnerTexts()).map(flat);
        await this.closeMenu(row);
        return entries;
    }

    /** Open a row's menu and choose an entry by its exact name. */
    async choose(row, entry) {
        const menu = await this.openMenu(row);
        await menu.getByRole('menuitem', {name: entry, exact: true}).click();
    }
};

// ---------------------------------------------------------------------------
// The upload wizard (Rules 5–9)
// ---------------------------------------------------------------------------

exports.UploadWizard = class UploadWizard extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title the window's title ("Upload Submission File", "Upload a Dependent File", …)
     */
    constructor(page, title) {
        super(page);
        this.title = title;
    }

    /** The wizard window, found by its title. */
    dialog() {
        return this.page.getByRole('dialog', {name: this.title, exact: true});
    }

    /** The window's level-1 heading. */
    heading() {
        return this.dialog().getByRole('heading', {name: this.title, exact: true, level: 1});
    }

    /** The step tabs. */
    steps() {
        return this.dialog().getByRole('tab');
    }

    /** A step tab by its name ("1. Upload File", …). */
    step(name) {
        return this.dialog().getByRole('tab', {name, exact: true});
    }

    /** The named step is the current one. */
    async expectStep(name) {
        await expect(this.step(name)).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    }

    /** The window has opened on step 1 (its title and step 1's tab panel). */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
        await this.expectStep(WIZARD_STEPS[0]);
        await expect(this.dialog().locator('.pkp_controller_fileUpload').first()).toBeAttached({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** "Continue" (reads "Complete" on step 3, a separate button). */
    continueButton() {
        return this.dialog().getByRole('button', {name: 'Continue', exact: true});
    }

    /** The bottom "Cancel" (a link). */
    cancelLink() {
        return this.dialog().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's header "Close". */
    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true});
    }

    // --- Step 1 ---------------------------------------------------------

    /** "If you are uploading a revision of an existing file, please indicate which file." */
    reviseSelect() {
        return this.dialog().locator('select[id^="revisedFileId"]');
    }

    /** The component drop-down ("Article Component", "Submission Component", …). */
    componentSelect() {
        return this.dialog().locator('select[id^="genreId"]');
    }

    /** The upload box. */
    uploadBox() {
        return this.dialog().locator('.pkp_controller_fileUpload').first();
    }

    /** The file input under the upload box. */
    fileInput() {
        return this.dialog().locator('input[type="file"]').first();
    }

    /** A drop-down's option texts, in order. */
    async optionTexts(select) {
        return (await select.locator('option').allInnerTexts()).map(flat);
    }

    /** A drop-down's selected option's text. */
    async selectedText(select) {
        return flat(await select.evaluate((/** @type {HTMLSelectElement} */ s) => s.options[s.selectedIndex]?.text || ''));
    }

    /**
     * The upload box is hidden: it carries `pkp_screen_reader`, which moves it
     * off screen (a screen reader still reads it, A9), so visibility checks
     * report it shown. The class is the settled read of "no upload box".
     */
    async expectUploadBoxHidden() {
        await expect(this.uploadBox()).toHaveClass(/\bpkp_screen_reader\b/, {timeout: 30_000});
    }

    /** The upload box shows (the class is gone). */
    async expectUploadBoxShown() {
        await expect(this.uploadBox()).not.toHaveClass(/\bpkp_screen_reader\b/, {timeout: 30_000});
        await expect(this.uploadBox()).toBeVisible();
    }

    /** Choose a file to revise by its listed name. */
    async chooseRevision(name) {
        await this.reviseSelect().selectOption({label: name});
    }

    /** Choose a component. */
    async chooseComponent(label) {
        await this.componentSelect().selectOption({label});
    }

    /**
     * Attach a file in the upload box and wait until it has uploaded (the
     * box names it and "Continue" can be pressed).
     *
     * @param {string | {name: string, mimeType: string, buffer: Buffer}} file a path or payload
     * @param {string} name the file's name as the box shows it
     */
    async attach(file, name) {
        await this.fileInput().setInputFiles(file);
        await expect(this.uploadBox()).toContainText(name, {timeout: 30_000});
        await expect(this.continueButton()).toBeEnabled({timeout: 30_000});
    }

    /** "Change File" in the upload box, once a file is up. */
    changeFileButton() {
        return this.uploadBox().getByRole('button', {name: 'Change File', exact: true});
    }

    /** "Upload File" in the upload box, before a file is up. */
    uploadFileButton() {
        return this.uploadBox().getByRole('button', {name: 'Upload File', exact: true});
    }

    /** "How to ensure all files are anonymized". */
    ensuringLink() {
        return this.dialog().getByRole('link', {name: 'How to ensure all files are anonymized', exact: true});
    }

    // --- Step 2 ---------------------------------------------------------

    /** A step-2 text box by its exact label. */
    field(label) {
        return this.reviewDetailsPanel().getByRole('textbox', {name: label, exact: true});
    }

    /** Step 2's name box (its accessible name carries "* Required" after the label). */
    nameBox() {
        return this.reviewDetailsPanel().getByRole('textbox', {name: NAME_LABEL});
    }

    /** Step 2's text boxes, by accessible name, in order. */
    async fieldLabels() {
        const panel = this.dialog().getByRole('tabpanel', {name: WIZARD_STEPS[1]});
        const boxes = panel.getByRole('textbox');
        const count = await boxes.count();
        const labels = [];
        for (let i = 0; i < count; i++) {
            labels.push(flat(await boxes.nth(i).evaluate((e) => e.getAttribute('aria-label') || (e.labels && e.labels[0] ? e.labels[0].innerText : '') || '')));
        }
        return labels;
    }

    /** The "Summary of Changes (Amendment Notice)" rich-text box's editor frame. */
    summaryFrame() {
        return this.dialog().locator('iframe[id*="summaryOfChanges"]').first();
    }

    /** The step 2 panel (for the summary's label and hint). */
    reviewDetailsPanel() {
        return this.dialog().getByRole('tabpanel', {name: WIZARD_STEPS[1]});
    }

    /**
     * Type into the "Summary of Changes" box once TinyMCE has initialised
     * (text typed earlier is lost).
     */
    async typeSummary(text) {
        const frame = this.summaryFrame();
        await expect(frame).toBeVisible({timeout: 30_000});
        const id = await this.dialog().locator('textarea[id*="summaryOfChanges"]').first().getAttribute('id');
        await expect
            .poll(() => this.page.evaluate((tid) => Boolean(/** @type {any} */ (window).tinymce?.get(tid)?.initialized), id), {timeout: 30_000})
            .toBe(true);
        await frame.contentFrame().locator('body').click();
        await this.page.keyboard.type(text);
        await expect(frame.contentFrame().locator('body')).toContainText(text);
    }

    // --- Moving on --------------------------------------------------------

    /** Press "Continue" and wait for the next step to be current. */
    async continueTo(stepName) {
        await this.continueButton().click();
        await this.expectStep(stepName);
        await waitForJQueryIdle(this.page);
    }

    /** Step 3's "File Added" heading. */
    fileAddedHeading() {
        return this.dialog().getByRole('heading', {name: 'File Added', exact: true});
    }

    /** Step 3's "Add Another File". */
    addAnotherButton() {
        return this.dialog().getByRole('button', {name: 'Add Another File', exact: true});
    }

    /** Step 3's "Complete". */
    completeButton() {
        return this.dialog().getByRole('button', {name: 'Complete', exact: true});
    }

    /** Press "Complete" and wait for the window to close. */
    async complete() {
        await this.completeButton().click();
        await this.expectClosed();
    }

    /** The window is gone. */
    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /**
     * Press "Cancel" and wait for the server's answer to the cancel
     * (`cancel-file-upload`) when a file had been uploaded, then for the
     * window to close.
     */
    async cancel({uploaded = true} = {}) {
        const answered = uploaded
            ? this.page.waitForResponse((r) => r.url().includes('cancel-file-upload'), {timeout: 30_000})
            : null;
        await this.cancelLink().click();
        if (answered) {
            await answered;
        }
        await this.expectClosed();
    }

    /**
     * The whole path for one file: component (or file to revise), attach,
     * "Continue", an optional new name, "Continue", "Complete".
     *
     * @param {{component?: string, revise?: string, file: any, name: string, rename?: string}} options
     */
    async uploadOne({component, revise, file, name, rename}) {
        if (revise) {
            await this.chooseRevision(revise);
        } else if (component) {
            await this.chooseComponent(component);
        }
        await this.attach(file, name);
        await this.continueTo(WIZARD_STEPS[1]);
        if (rename) {
            await this.nameBox().fill(rename);
        }
        await this.continueTo(WIZARD_STEPS[2]);
        await this.complete();
    }
};

// ---------------------------------------------------------------------------
// "Update File Details" — "Edit a file" (Rules 10–11)
// ---------------------------------------------------------------------------

exports.EditFileWindow = class EditFileWindow extends BasePage {
    /** The window. */
    dialog() {
        return this.page.getByRole('dialog', {name: 'Edit a file', exact: true});
    }

    /** The window is open with its form loaded (the name box holds a value). */
    async expectOpen() {
        await expect(this.dialog().getByRole('heading', {name: 'Edit a file', level: 1})).toBeVisible({timeout: 30_000});
        await expect(this.nameBox()).toBeVisible({timeout: 30_000});
    }

    /** The name box. */
    nameBox() {
        return this.dialog().getByRole('textbox', {name: NAME_LABEL});
    }

    /** A text box by its label. */
    field(label) {
        return this.dialog().getByRole('textbox', {name: label, exact: true});
    }

    saveButton() {
        return this.dialog().getByRole('button', {name: 'Save', exact: true});
    }

    cancelButton() {
        return this.dialog().getByRole('button', {name: 'Cancel', exact: true});
    }

    /** A field error under a box ("This field is required."). */
    fieldError(text) {
        return this.dialog().getByText(text, {exact: true}).first();
    }

    /** Press "Save" and wait for the window to close. */
    async save() {
        await this.saveButton().click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }

    /** The "Dependent Files" heading. */
    dependentHeading() {
        return this.dialog().getByRole('heading', {name: 'Dependent Files', exact: true});
    }

    /** The "Dependent Files" grid. */
    dependentGrid() {
        return this.dialog().locator('[id^="component-grid-files-dependent"]').first();
    }

    /** The grid's "Upload File" link. */
    dependentUploadLink() {
        return this.dependentGrid().getByRole('link', {name: 'Upload File', exact: true});
    }

    /** The grid's file-name links. */
    dependentNameLink(name) {
        return this.dependentGrid().getByRole('link', {name, exact: true});
    }
};

// ---------------------------------------------------------------------------
// "More Information" — "Information Center: {name}" (Rules 13–14)
// ---------------------------------------------------------------------------

exports.InformationCenter = class InformationCenter extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} name the file name (or galley label) in the title
     */
    constructor(page, name) {
        super(page);
        this.name = name;
    }

    dialog() {
        return this.page.getByRole('dialog', {name: `Information Center: ${this.name}`, exact: true});
    }

    tabs() {
        return this.dialog().getByRole('tab');
    }

    tab(name) {
        return this.dialog().getByRole('tab', {name, exact: true});
    }

    /** The window is open (title shown). */
    async expectOpen() {
        await expect(
            this.dialog().getByRole('heading', {name: `Information Center: ${this.name}`, level: 1})
        ).toBeVisible({timeout: 30_000});
    }

    /** The named tab is the selected one. */
    async expectTab(name) {
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    }

    /** Select a tab and wait for its panel. */
    async selectTab(name) {
        await this.tab(name).click();
        await this.expectTab(name);
        await expect(this.panel(name)).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** A tab's panel. */
    panel(name) {
        return this.dialog().getByRole('tabpanel', {name});
    }

    // --- History --------------------------------------------------------

    /** The History table's column headers. */
    historyHeaders() {
        return this.panel('History').getByRole('columnheader');
    }

    /** The History table's data rows (legacy grid rows), newest first. */
    historyRows() {
        return this.panel('History').locator('tr.gridRow');
    }

    /** Wait until the History grid has rows. */
    async expectHistoryLoaded() {
        await expect(this.historyRows().first()).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The History rows' "Event" texts, top to bottom. */
    async historyEvents() {
        const rows = this.historyRows();
        const count = await rows.count();
        const events = [];
        for (let i = 0; i < count; i++) {
            events.push(flat(await rows.nth(i).locator('td').last().innerText()));
        }
        return events;
    }

    /**
     * Press the arrow at the start of the row whose event is `event`, then
     * its "Download" (in the row after it): returns the download.
     */
    async downloadFromHistory(event) {
        const row = this.historyRows().filter({hasText: event}).first();
        await row.locator('a.show_extras').click();
        const download = this.page.locator('tr.gridRow').filter({hasText: event}).first()
            .locator('xpath=following-sibling::tr[1]')
            .getByRole('link', {name: /Download/});
        await expect(download).toBeVisible({timeout: 30_000});
        return await captureDownload(this.page, () => download.click());
    }

    // --- Notes ----------------------------------------------------------

    /** The note box (labelled "Add Note"). */
    noteBox() {
        return this.panel('Notes').getByRole('textbox', {name: 'Add Note'});
    }

    addNoteButton() {
        return this.panel('Notes').getByRole('button', {name: 'Add Note', exact: true});
    }

    /** The file's own notes list (not the earlier revision notes). */
    notesList() {
        return this.panel('Notes').locator('#informationCenterNotes > .pkp_notes_list');
    }

    /** One of the file's own notes, by its text. */
    note(text) {
        return this.notesList().locator('.note').filter({hasText: text});
    }

    /** "There are no notes to display." in the file's own list. */
    noNotes() {
        return this.notesList().locator('.no_notes');
    }

    /** A note's "Delete". */
    noteDeleteButton(note) {
        return note.getByRole('button', {name: 'Delete', exact: true});
    }

    /** Type a note and press "Add Note"; waits for the save's answer. */
    async addNote(text) {
        await this.noteBox().fill(text);
        const saved = this.page.waitForResponse((r) => r.url().includes('save-note'), {timeout: 30_000});
        await this.addNoteButton().click();
        await saved;
        await waitForJQueryIdle(this.page);
    }

    /** The "Confirm" window a note's "Delete" opens. */
    confirmWindow() {
        return this.page.getByRole('dialog').filter({hasText: 'Are you sure you wish to delete this note?'}).last();
    }

    /** "Earlier Revision Notes" (a toggle whose content is in the DOM while closed). */
    earlierNotes() {
        return this.panel('Notes').locator('#showPastNotesLink').first();
    }

    earlierNotesToggle() {
        return this.earlierNotes().locator('a.toggleExtras');
    }

    /** The earlier notes' container. */
    earlierNotesContent() {
        return this.earlierNotes().locator('.extrasContainer');
    }

    /** Open "Earlier Revision Notes": the toggle turns active and its container takes height. */
    async openEarlierNotes() {
        await this.earlierNotesToggle().click();
        await expect(this.earlierNotes()).toHaveClass(/\bactive\b/, {timeout: 30_000});
        await expect
            .poll(() => this.earlierNotesContent().evaluate((e) => e.getBoundingClientRect().height), {timeout: 30_000})
            .toBeGreaterThan(0);
    }

    /** Close the window with its header "Close". */
    async close() {
        await this.dialog().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }
};

// ---------------------------------------------------------------------------
// The row menu's "Delete" (Rule 4)
// ---------------------------------------------------------------------------

exports.DeleteFileDialog = class DeleteFileDialog extends BasePage {
    dialog() {
        return this.page.getByRole('dialog', {name: 'Delete', exact: true});
    }

    okButton() {
        return this.dialog().getByRole('button', {name: 'OK', exact: true});
    }

    cancelButton() {
        return this.dialog().getByRole('button', {name: 'Cancel', exact: true});
    }

    /** Press "OK": resolves with the delete request's answer once the dialog has gone. */
    async confirm() {
        const answered = this.page.waitForResponse((r) => r.url().includes('delete-file'), {timeout: 30_000});
        await this.okButton().click();
        const response = await answered;
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
        return response;
    }

    async dismiss() {
        await this.cancelButton().click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }
};

// ---------------------------------------------------------------------------
// "Upload/Select Files" (Rule 15)
// ---------------------------------------------------------------------------

exports.SelectFilesWindow = class SelectFilesWindow extends BasePage {
    /**
     * The window: the legacy side window carrying the "Show files from all
     * accessible workflow stages." box (`.last()`: the workflow panel is a
     * dialog holding it too).
     */
    dialog() {
        return this.page.getByRole('dialog').filter({has: this.page.locator('input[name="allStages"]')}).last();
    }

    /** Open the window from a list's "Upload/Select Files" and wait for its grid to fill. */
    async openFrom(list) {
        await list.uploadSelectButton().click();
        await expect(this.allStagesBox()).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await expect(this.dialog().locator('table tr').nth(1)).toBeAttached({timeout: 30_000});
        return this;
    }

    /** "Show files from all accessible workflow stages." */
    allStagesBox() {
        return this.dialog().getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'});
    }

    /** Tick the box and wait for the grid's refetch. */
    async showAllStages() {
        const fetched = this.page.waitForResponse((r) => r.url().includes('fetch-grid'), {timeout: 30_000});
        await this.allStagesBox().check();
        await fetched;
        await waitForJQueryIdle(this.page);
    }

    /** The grid rows (group headers and files). */
    rows() {
        return this.dialog().locator('tr.gridRow');
    }

    /**
     * The tick box of the named file listed under the stage group `group`
     * (the first file row after that group's header row).
     */
    fileCheckbox(name, group) {
        const header = this.rows()
            .filter({hasNot: this.page.locator('input[type="checkbox"]')})
            .filter({hasText: new RegExp(`^\\s*${escapeRegExp(group)}\\s*$`)});
        return header
            .locator('xpath=following-sibling::tr[contains(concat(" ", normalize-space(@class), " "), " gridRow ")][.//input[@type="checkbox"]]')
            .filter({hasText: name})
            .first()
            .locator('input[type="checkbox"]');
    }

    /**
     * Tick a file (the box sits under a styled label, so the click is
     * forced; a forced click does not wait for the window's slide-in, so
     * that is waited out first: motion.js).
     */
    async tick(name, group) {
        const box = this.fileCheckbox(name, group);
        await motionEnded(box);
        await box.check({force: true});
        await expect(box).toBeChecked();
    }

    /** Save with "OK" and wait for the window to close. */
    async ok() {
        const dialog = this.dialog();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }
};

// ---------------------------------------------------------------------------
// The reviewer's "Review Files" list (Rule 3)
// ---------------------------------------------------------------------------

exports.ReviewerFileList = class ReviewerFileList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {any} wizard the shared ReviewWizardPage (`ReviewerPages.js`) on the review
     * @param {number} [step] the step whose list is read (1 or 3)
     */
    constructor(page, wizard, step = 1) {
        super(page);
        this.wizard = wizard;
        this.step = step;
    }

    /** Wait for the list to finish loading. */
    async expectLoaded() {
        await this.wizard.expectReviewFilesSettled(this.step);
    }

    /** A file's link by the name the list shows. */
    link(name) {
        return this.wizard.reviewFileLink(this.step, name);
    }

    /** Press a file's link: returns its download. */
    async download(name) {
        return await captureDownload(this.page, () => this.link(name).click());
    }
};

// ---------------------------------------------------------------------------
// The submission wizard's "Files" panel (Rules 17–18)
// ---------------------------------------------------------------------------

exports.WizardFilesPanel = class WizardFilesPanel extends BasePage {
    /** The panel. */
    panel() {
        return this.page.locator('.submissionFilesListPanel').first();
    }

    /** The panel's heading ("Files"). */
    heading() {
        return this.panel().locator('.pkpHeader h2').first();
    }

    /** "Add File" in the panel's header. */
    addFileButton() {
        return this.panel().getByRole('button', {name: 'Add File', exact: true});
    }

    /** The empty panel's text. */
    emptyState() {
        return this.panel().locator('.listPanel__empty');
    }

    /** The empty panel's "Upload File" (a button styled as a link). */
    emptyUploadButton() {
        return this.emptyState().getByRole('button', {name: 'Upload File', exact: true});
    }

    /** The file rows. */
    rows() {
        return this.panel().locator('.listPanel__item--submissionFile');
    }

    /** The row of the named file. */
    row(name) {
        return this.rows().filter({hasText: name});
    }

    /** A row's name link (a finished file). */
    nameLink(row) {
        return row.locator('a.listPanel__item--submissionFile__link');
    }

    /** A row's "Edit" / "Remove" and other action buttons, by name. */
    rowAction(row, name) {
        return row.locator('.listPanel__itemActions').getByRole('button', {name, exact: true});
    }

    /** The action buttons' names on a row, in order. */
    async rowActionNames(row) {
        return (await row.locator('.listPanel__itemActions').getByRole('button').allInnerTexts()).map(flat);
    }

    /** "What kind of file is this?" on a row. */
    genrePrompt(row) {
        return row.locator('.listPanel--submissionFiles__setGenreLabel');
    }

    /** The component links under the prompt. */
    genreButtons(row) {
        return row.locator('.listPanel--submissionFiles__setGenreButton');
    }

    /** The component links' names, in order. */
    async genreButtonNames(row) {
        return (await this.genreButtons(row).allInnerTexts()).map(flat);
    }

    /** The row's component badge. */
    badge(row) {
        return row.locator('.listPanel--submissionFiles__itemGenre');
    }

    /** "Cancel upload" on an uploading row. */
    cancelUploadButton(row) {
        return row.getByRole('button', {name: 'Cancel upload', exact: true});
    }

    /** An uploading row's progress bar. */
    progressBar(row) {
        return row.locator('[class*="rogress"]').first();
    }

    /**
     * Press `trigger` ("Add File" or the empty panel's "Upload File") and
     * pick `file` in the file picker; does not wait for the upload.
     */
    async pick(trigger, file) {
        const [chooser] = await Promise.all([
            this.page.waitForEvent('filechooser', {timeout: 30_000}),
            trigger.click(),
        ]);
        await chooser.setFiles(file);
    }

    /** Pick a file and wait until its row is stored (its name a link). */
    async add(trigger, file, name) {
        await this.pick(trigger, file);
        const row = this.row(name);
        await expect(this.nameLink(row)).toBeVisible({timeout: 60_000});
        return row;
    }

    /** Press a component link on a row: waits for the save and the badge. */
    async chooseGenre(row, label) {
        const saved = this.page.waitForResponse(
            (r) => /\/files\/\d+/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await this.genreButtons(row).filter({hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`)}).click();
        await saved;
        await expect(this.badge(row)).toHaveText(label, {timeout: 30_000});
    }

    /** The "Edit {name}" side panel. */
    editPanel(name) {
        return this.page.getByRole('dialog', {name: `Edit ${name}`, exact: true});
    }

    /** The side panel's component radios. */
    editRadios(name) {
        return this.editPanel(name).getByRole('radio');
    }

    /** The radio labels, in order. */
    async editRadioLabels(name) {
        return await this.editRadios(name).evaluateAll((els) =>
            els.map((e) => {
                const input = /** @type {HTMLInputElement} */ (e);
                const label = input.closest('label') || (input.labels && input.labels[0]);
                return (label ? label.textContent || '' : '').replace(/\s+/g, ' ').trim();
            })
        );
    }

    /** Choose a radio and press "Save": waits for the save and the panel to close. */
    async saveEdit(name, label) {
        const panel = this.editPanel(name);
        await panel.getByRole('radio', {name: label, exact: true}).check();
        const saved = this.page.waitForResponse(
            (r) => /\/files\/\d+/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        await saved;
        await expect(panel).toHaveCount(0, {timeout: 30_000});
    }

    /** The "Remove" confirmation. */
    removeDialog() {
        return this.page.getByRole('dialog', {name: 'Remove', exact: true});
    }
};
