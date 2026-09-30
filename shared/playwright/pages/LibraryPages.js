// @ts-check
/**
 * @file shared/playwright/pages/LibraryPages.js
 *
 * Page objects for the Submission & Publisher Libraries feature (spec:
 * docs/specs/U39-submission-and-publisher-libraries.md), shared by the
 * OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): every per-app
 * string is passed in by the suite — the Publisher Library's name ("Publisher
 * Library", "Press Library", "Preprint Server Library"), which is both the
 * Settings tab's label and the list's heading, and the type groups
 * (OMP1 adds "Contracts").
 *
 * Surfaces:
 * - LibraryList — one legacy library grid (both libraries render the same
 *   grid shape): the heading, "Add a file" / "View Document Library" above
 *   it, the "Files" column, one group per type with its "No Items" line,
 *   a file row's name link (a download on the same page), its arrow and the
 *   strip under it with "Edit" and "Delete".
 * - SubmissionLibraryWindow — the workflow header's "Library" and the
 *   "Submission Library" window it opens (the header is the shared
 *   `WorkflowPage.js` frame's).
 * - DocumentLibraryWindow — "View Document Library", the second window
 *   over the first, holding the Publisher Library list.
 * - PublisherLibraryTab — Settings › Workflow ("Workflow Settings") and its
 *   library tab.
 * - LibraryFileWindow — "Add a file" and "Edit": the fields, the upload
 *   area ("Upload File" / "Change File", "Replace file" in "Edit"), the
 *   "File" lines, "Public Access" with its address, "OK" / "Cancel" and the
 *   window's close button.
 * - DeleteDialog — a row's "Delete" dialog.
 * - readAddress — a typed address read the way headless Chromium lets a test
 *   read it: an inline PDF turns into a download there, so the response's
 *   headers are the record of "opens in the browser tab" and its name.
 *
 * DOM facts (lib/pkp grid templates, `LibraryFileForm`, `FormHandler.js`,
 * `PostAndRedirectRequest.js`; confirmed live 2026-09-24, tojs probe and
 * `.reports/U39/screen-notes.md` ccK1–ccK3):
 * - a grid root is `div.pkp_controllers_grid`; its `.header` carries the
 *   list's `h4` (none on the Submission Library) and the `ul.actions`
 *   links; each type is a `tbody.category_grid_body` whose first row holds
 *   the type's `span.label`, followed by its placeholder
 *   `tbody.category_placeholder` ("No Items", hidden while the group has
 *   rows); a file row is `tr.gridRow` with the name link
 *   `a.pkp_linkaction_downloadFile` (class `pkp_linkaction_icon_<kind>`)
 *   and, where the reader may change it, `a.show_extras` (screen-reader
 *   text "Settings") first; the strip is the next `tr.row_controls`;
 * - pressing a name posts, then points the page at the download and
 *   disables the link (`disabled`, `href="#"`) until a two-second timer
 *   re-enables it; a list redrawn before that makes the timer's callback
 *   throw (register A9); the timer's callback then asks for the whole list
 *   again, and its answer replaces the list (strips closed, name links
 *   `href="#"` until their scripts run), so `download()` returns only once
 *   that redraw is done;
 * - the "Add a file" / "Edit" form: `input[name^=libraryFileName]` per
 *   form language, `select[name=fileType]`, `textarea[name^=description]`,
 *   the plupload area (`.pkp_controller_fileUpload`, its button named
 *   "Upload File" or "Change File"), `input[name=temporaryFileId]` filled
 *   once the upload is done, `input[name=publicAccess]` and the address in
 *   a `blockquote`; jQuery-validate refusals are `label.error` inside the
 *   field's `fieldset`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {captureDownload, FORM_CHANGED_QUESTION, DELETE_QUESTION} = require('./SubmissionFilesPages.js');

/** The question the browser asks when a changed window is closed (Rule 3b). */
exports.FORM_CHANGED_QUESTION = FORM_CHANGED_QUESTION;

/** The "Delete" dialog's question (Rule 5). */
exports.DELETE_QUESTION = DELETE_QUESTION;

/** A field's refusal (Fields). */
const REQUIRED = 'This field is required.';
exports.REQUIRED = REQUIRED;

/** The sentence over the public address (Fields "Public Access"). */
const PUBLIC_ACCESS_SENTENCE = 'This library file can be accessible for download, if "Public Access" is enabled, at:';
exports.PUBLIC_ACCESS_SENTENCE = PUBLIC_ACCESS_SENTENCE;

/** The upload area's prompt (Fields "File"). */
const DROP_PROMPT = 'Drag and drop a file here to begin upload';
exports.DROP_PROMPT = DROP_PROMPT;

/** The refusal page's whole text (Rules 8b, 10b). */
const FORBIDDEN = '403 Forbidden';
exports.FORBIDDEN = FORBIDDEN;

/** The window titles. */
const SUBMISSION_LIBRARY = 'Submission Library';
const DOCUMENT_LIBRARY = 'View Document Library';
exports.SUBMISSION_LIBRARY = SUBMISSION_LIBRARY;
exports.DOCUMENT_LIBRARY = DOCUMENT_LIBRARY;

const GRID = 'div.pkp_controllers_grid';

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exact(text) {
    return new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);
}

function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * The modal store's close window (patterns.md locator pitfall 4): for
 * 450 ms after any window of the page closes (a side window, "Add a file",
 * the "Delete" dialog), a press that opens another window is swallowed
 * without a trace (tojs probe 2026-09-24: "Add a file" and a row's
 * "Delete" pressed again at 0 and 200 ms opened nothing, at 600 ms they
 * opened). Nothing in the page shows the window, so every close arms a
 * page timer longer than the app's (due after it whatever the load) and
 * every opener awaits what is left of it; no hand is this fast.
 *
 * @param {import('@playwright/test').Page} page
 */
async function markClosed(page) {
    await page.evaluate(() => {
        /** @type {any} */ (window).__pkpE2eCloseWindow = new Promise((resolve) => setTimeout(resolve, 500));
    });
}
exports.markClosed = markClosed;

/**
 * Await the rest of the close window a `markClosed()` armed (at once when
 * none is pending, a new page included).
 *
 * @param {import('@playwright/test').Page} page
 */
async function pastCloseWindow(page) {
    await page.evaluate(() => /** @type {any} */ (window).__pkpE2eCloseWindow);
}
exports.pastCloseWindow = pastCloseWindow;

/** The public address of a Publisher Library file (Rule 10a). */
exports.publicAddress = function publicAddress(baseURL, contextPath, fileId) {
    return `${baseURL}/index.php/${contextPath}/libraryFiles/downloadPublic/${fileId}`;
};

/** The file name a `Content-Disposition` header carries. */
function dispositionFileName(disposition) {
    const match = (disposition || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    return match ? decodeURIComponent(match[1]) : null;
}
exports.dispositionFileName = dispositionFileName;

/**
 * Type `url` into `page` and read the answer: its status, type and
 * `Content-Disposition` (with the file name it names), and whether the
 * browser turned it into a download. Headless Chromium turns an inline PDF
 * into a download (`page.goto` then throws "Download is starting"), so a
 * file that "opens in the browser tab" is read from its response headers,
 * and a page (a "403 Forbidden") from the page itself, which the caller
 * reads through `page.locator('body')`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url an absolute address
 */
exports.readAddress = async function readAddress(page, url) {
    const responded = page.waitForResponse((r) => r.url() === url && r.request().isNavigationRequest(), {timeout: 30_000});
    let downloaded = false;
    try {
        await page.goto(url);
    } catch (error) {
        if (!/Download is starting/.test(String(error && /** @type {Error} */ (error).message))) {
            throw error;
        }
        downloaded = true;
    }
    const response = await responded;
    const headers = await response.allHeaders();
    return {
        status: response.status(),
        contentType: headers['content-type'] || '',
        contentLength: headers['content-length'] ? Number(headers['content-length']) : null,
        disposition: headers['content-disposition'] || '',
        fileName: dispositionFileName(headers['content-disposition']),
        downloaded,
    };
};

// ---------------------------------------------------------------------------
// A library list (Rules 1, 2, 6, 9)
// ---------------------------------------------------------------------------

exports.LibraryList = class LibraryList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} scope the window or tab panel holding the list
     */
    constructor(page, scope) {
        super(page);
        this.scope = scope;
    }

    /** The grid. */
    root() {
        return this.scope.locator(GRID).first();
    }

    /** The list's heading ("Publisher Library", …; the Submission Library has none). */
    heading() {
        return this.root().locator(':scope > .header h4');
    }

    /** The links above the list. */
    actionLinks() {
        return this.root().locator(':scope > .header ul.actions a');
    }

    /** "Add a file" above the list. */
    addFileLink() {
        return this.root().locator(':scope > .header').getByRole('link', {name: 'Add a file', exact: true});
    }

    /** "View Document Library" above the list. */
    viewDocumentLibraryLink() {
        return this.root().locator(':scope > .header').getByRole('link', {name: DOCUMENT_LIBRARY, exact: true});
    }

    /** The column headers ("Files"). */
    columnHeaders() {
        return this.root().getByRole('columnheader');
    }

    /** The list has loaded: its column header shows. */
    async expectLoaded() {
        await expect(this.columnHeaders().first()).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The type groups' labels, in order. */
    groupLabels() {
        return this.root().locator('tbody.category_grid_body span.label');
    }

    /** The list's groups are exactly these types, in this order. */
    async expectGroups(types) {
        await expect(this.groupLabels()).toHaveText(types.map(exact), {timeout: 30_000});
    }

    /** A type's group (its label row and its file rows). */
    group(type) {
        return this.root()
            .locator('tbody.category_grid_body')
            .filter({has: this.page.locator('span.label', {hasText: exact(type)})});
    }

    /** A type's "No Items" line (hidden while the group lists files). */
    noItems(type) {
        return this.group(type).locator('xpath=following-sibling::tbody[1][contains(@class, "category_placeholder")]');
    }

    /** The group reads "No Items". */
    async expectEmpty(type) {
        await expect(this.noItems(type)).toBeVisible({timeout: 30_000});
        await expect(this.noItems(type)).toHaveText('No Items');
    }

    /** Every listed group reads "No Items". */
    async expectAllEmpty(types) {
        for (const type of types) {
            await this.expectEmpty(type);
        }
    }

    /** The group lists files: its "No Items" line is gone. */
    async expectNotEmpty(type) {
        await expect(this.noItems(type)).toBeHidden({timeout: 30_000});
    }

    /** Every file name link in the list. */
    nameLinks() {
        return this.root().locator('a.pkp_linkaction_downloadFile');
    }

    /** A type's file name links. */
    groupNameLinks(type) {
        return this.group(type).locator('a.pkp_linkaction_downloadFile');
    }

    /**
     * The group lists exactly these names, in any order (Rule 1: no set
     * order). Auto-waited, so a list still redrawing settles first.
     */
    async expectFiles(type, names) {
        await expect
            .poll(async () => (await this.groupNameLinks(type).allInnerTexts()).map(flat).sort(), {timeout: 30_000})
            .toEqual([...names].sort());
    }

    /** A file's name link, by its exact "Name". */
    nameLink(name) {
        return this.nameLinks().filter({hasText: exact(name)});
    }

    /** The file is listed (anywhere in the list). */
    async expectListed(name) {
        await expect(this.nameLink(name)).toBeVisible({timeout: 30_000});
    }

    /** No file of that name is listed: read after the list shows `listed` (the positive control). */
    async expectNotListed(name) {
        await expect(this.nameLink(name)).toHaveCount(0);
    }

    /** A file's row. */
    row(name) {
        return this.root()
            .locator('tr.gridRow')
            .filter({has: this.page.locator('a.pkp_linkaction_downloadFile', {hasText: exact(name)})});
    }

    /** The arrow at the start of a file's row (screen-reader text "Settings"). */
    arrow(name) {
        return this.row(name).locator('a.show_extras, a.hide_extras');
    }

    /** The row starts with an arrow: it is the row cell's first element, before the name. */
    async expectArrowFirst(name) {
        await expect(this.arrow(name)).toBeVisible({timeout: 30_000});
        const first = await this.row(name).locator('td').first().evaluate((td) => {
            const el = td.firstElementChild;
            return el ? `${el.tagName.toLowerCase()}.${el.className}` : '';
        });
        expect(first).toMatch(/^a\.(show|hide)_extras\b/);
    }

    /** The row has no arrow (read after the name link shows). */
    async expectNoArrow(name) {
        await expect(this.nameLink(name)).toBeVisible({timeout: 30_000});
        await expect(this.arrow(name)).toHaveCount(0);
    }

    /** The strip under a row ("Edit", "Delete"). */
    strip(name) {
        return this.row(name).locator('xpath=following-sibling::tr[1][contains(@class, "row_controls")]');
    }

    /**
     * Open a row's strip (the arrow toggles it: a second press closes it,
     * so an open strip is left as it is).
     */
    async openStrip(name) {
        const row = this.row(name);
        await expect(this.arrow(name)).toBeVisible({timeout: 30_000});
        if ((await row.locator('a.hide_extras').count()) === 0) {
            await row.locator('a.show_extras').click();
        }
        await expect(this.strip(name).getByRole('link', {name: 'Edit', exact: true})).toBeVisible({timeout: 30_000});
        return this.strip(name);
    }

    /** The arrow, then "Edit": the "Edit" window, loaded. */
    async openEdit(name) {
        const strip = await this.openStrip(name);
        await pastCloseWindow(this.page);
        await strip.getByRole('link', {name: 'Edit', exact: true}).click();
        const win = new exports.LibraryFileWindow(this.page, 'Edit');
        await win.expectOpen();
        return win;
    }

    /** The arrow, then "Delete": the "Delete" dialog. */
    async openDelete(name) {
        const strip = await this.openStrip(name);
        await pastCloseWindow(this.page);
        await strip.getByRole('link', {name: 'Delete', exact: true}).click();
        const dialog = new exports.DeleteDialog(this.page);
        await dialog.expectOpen();
        return dialog;
    }

    /** "Add a file": the "Add a file" window, loaded. */
    async openAdd() {
        // The link stays disabled while a window it opened is still closing.
        await expect(this.addFileLink()).not.toHaveAttribute('disabled', {timeout: 30_000});
        await pastCloseWindow(this.page);
        await this.addFileLink().click();
        const win = new exports.LibraryFileWindow(this.page, 'Add a file');
        await win.expectOpen();
        return win;
    }

    /** The file's number (the `libraryFileId` its name link carries). */
    async fileId(name) {
        await expect(this.nameLink(name)).not.toHaveAttribute('href', '#', {timeout: 30_000});
        const href = (await this.nameLink(name).getAttribute('href')) || '';
        const match = href.match(/libraryFileId=(\d+)/);
        if (!match) {
            throw new Error(`fileId: no libraryFileId in ${href}`);
        }
        return Number(match[1]);
    }

    /**
     * The name link is ready again after a download: the app's two-second
     * timer has re-enabled it (register A9: an "OK" that redraws the list
     * before then makes the timer's callback throw).
     */
    async expectLinkReady(name) {
        await expect(this.nameLink(name)).not.toHaveAttribute('disabled', {timeout: 30_000});
        await expect(this.nameLink(name)).not.toHaveAttribute('href', '#', {timeout: 30_000});
    }

    /**
     * Press a file's name and return the download it starts, with the
     * page's address before and after (Rule 8a: the page stays). Returns
     * once the list is settled again: the app's two-second timer re-enables
     * the link (A9) and, in the same callback, asks for the whole list
     * again (`enable-link-action` answers a "data changed" event, lib/pkp
     * `PostAndRedirectRequest.finishCallback_`), whose answer replaces the
     * list: every strip closed, every name link a new `href="#"` until its
     * own script runs. A read or press on the list before that answer lands
     * loses it to the redraw (an opened strip closes, an "Edit" click hangs
     * on the detached link, a link's address reads "#"; u39s2-library-edit,
     * `.reports/flake-0930/u39s2/diagnosis.md`), so this waits until the
     * list it pressed in has been replaced, the redraw's request is done and
     * the new name link carries its address.
     */
    async download(name) {
        const before = this.page.url();
        const list = await this.root().elementHandle({timeout: 30_000});
        try {
            const {download, newTab} = await captureDownload(this.page, () => this.nameLink(name).click());
            await this.page.waitForFunction((el) => !(/** @type {Element} */ (el).isConnected), list, {timeout: 30_000});
            await waitForJQueryIdle(this.page);
            await this.expectLinkReady(name);
            return {download, newTab, before, after: this.page.url()};
        } finally {
            await list?.dispose();
        }
    }
};

// ---------------------------------------------------------------------------
// The "Submission Library" window (Rule 1) and "View Document Library" (Rule 6)
// ---------------------------------------------------------------------------

class LibraryWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title
     */
    constructor(page, title) {
        super(page);
        this.title = title;
    }

    /** The window, by its title. */
    dialog() {
        return this.page.getByRole('dialog', {name: this.title, exact: true});
    }

    /** Its level-1 heading. */
    heading() {
        return this.dialog().getByRole('heading', {name: this.title, exact: true, level: 1});
    }

    /** The list it holds. */
    list() {
        return new exports.LibraryList(this.page, this.dialog());
    }

    /** The window's close button. */
    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).first();
    }

    /** The window is open and its list loaded. */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
        await this.list().expectLoaded();
    }

    /** Close the window with its close button; it goes. */
    async close() {
        await this.closeButton().click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
        await markClosed(this.page);
    }
}

exports.SubmissionLibraryWindow = class SubmissionLibraryWindow extends LibraryWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('./WorkflowPage.js').WorkflowPage} frame the open workflow panel
     */
    constructor(page, frame) {
        super(page, SUBMISSION_LIBRARY);
        this.frame = frame;
    }

    /** The header's "Library". */
    libraryButton() {
        return this.frame.headerButton('Library');
    }

    /** Press "Library": the window opens with its list. */
    async open() {
        await pastCloseWindow(this.page);
        await this.libraryButton().click();
        await this.expectOpen();
        return this;
    }

    /** "View Document Library": the second window opens over this one. */
    async openDocumentLibrary(listName) {
        await pastCloseWindow(this.page);
        await this.list().viewDocumentLibraryLink().click();
        const win = new exports.DocumentLibraryWindow(this.page, listName);
        await win.expectOpen();
        return win;
    }
};

exports.DocumentLibraryWindow = class DocumentLibraryWindow extends LibraryWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} listName the Publisher Library's name in this app ("Publisher Library", …)
     */
    constructor(page, listName) {
        super(page, DOCUMENT_LIBRARY);
        this.listName = listName;
    }

    /** The window is open, its list headed with the library's name. */
    async expectOpen() {
        await super.expectOpen();
        await expect(this.list().heading()).toHaveText(this.listName, {timeout: 30_000});
    }
};

// ---------------------------------------------------------------------------
// Settings › Workflow › the library tab (Rule 9)
// ---------------------------------------------------------------------------

exports.PublisherLibraryTab = class PublisherLibraryTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {string} label the tab's label and the list's heading ("Publisher Library", …)
     */
    constructor(page, contextPath, label) {
        super(page);
        this.contextPath = contextPath;
        this.label = label;
    }

    /** Open Settings › Workflow: the page "Workflow Settings". */
    async gotoSettings() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/workflow'));
        await expect(this.page.getByRole('heading', {name: 'Workflow Settings', exact: true, level: 1})).toBeVisible({timeout: 30_000});
    }

    /** The tab. */
    tab() {
        return this.page.getByRole('tab', {name: this.label, exact: true});
    }

    /** The tab's panel. */
    panel() {
        return this.page.getByRole('tabpanel', {name: this.label});
    }

    /** The list on the tab. */
    list() {
        return new exports.LibraryList(this.page, this.panel());
    }

    /** Select the tab: its list loads, headed with the tab's label. */
    async select() {
        await this.tab().click();
        await expect(this.tab()).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await this.list().expectLoaded();
        await expect(this.list().heading()).toHaveText(this.label, {timeout: 30_000});
    }

    /** Settings › Workflow, then the tab. */
    async goto() {
        await this.gotoSettings();
        await this.select();
    }
};

// ---------------------------------------------------------------------------
// "Add a file" and "Edit" (Fields; Rules 3, 3b, 4, 10)
// ---------------------------------------------------------------------------

exports.LibraryFileWindow = class LibraryFileWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {'Add a file' | 'Edit'} title
     */
    constructor(page, title) {
        super(page);
        this.title = title;
    }

    /** The window (the last of its title: a stacked window's). */
    dialog() {
        return this.page.getByRole('dialog', {name: this.title, exact: true}).last();
    }

    heading() {
        return this.dialog().getByRole('heading', {name: this.title, exact: true, level: 1});
    }

    /** The library file form. */
    form() {
        return this.dialog().locator('form').filter({has: this.page.locator('input[name^="libraryFileName"]')});
    }

    /**
     * The window is open and its form loaded (it arrives by AJAX; the type
     * list's options are "hidden" to Playwright, so they are waited on as
     * attached).
     */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
        await expect(this.typeSelect().locator('option').first()).toBeAttached({timeout: 30_000});
        await expect(this.nameBox()).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The fields' labels, in order, stars dropped ("Name", "Type", "Description", "File"). */
    async fieldLabels() {
        const labels = await this.form().locator('fieldset > .section > label').allInnerTexts();
        return labels.map((s) => flat(s).replace(/\s*\*$/, ''));
    }

    /** A field's section by its fieldset id: `name`, `type`, `description`, `file`. */
    field(id) {
        return this.form().locator(`fieldset#${id}`);
    }

    /** A field's refusal under it ("This field is required."). */
    fieldError(id) {
        return this.field(id).locator('label.error');
    }

    /** "Name" in the primary language. */
    nameBox() {
        return this.form().locator('input[name^="libraryFileName"]').first();
    }

    /** "Type". */
    typeSelect() {
        return this.form().locator('select[name="fileType"]');
    }

    /** The "Type" list's options, in order. */
    async typeOptions() {
        return (await this.typeSelect().locator('option').allInnerTexts()).map(flat);
    }

    /** The "Type" list's selected option's text. */
    async selectedType() {
        return flat(await this.typeSelect().evaluate((/** @type {HTMLSelectElement} */ s) => s.options[s.selectedIndex]?.text || ''));
    }

    async expectSelectedType(label) {
        await expect.poll(() => this.selectedType(), {timeout: 30_000}).toBe(label);
    }

    async chooseType(label) {
        await this.typeSelect().selectOption({label});
    }

    /** "Description" in the primary language. */
    descriptionBox() {
        return this.form().locator('textarea[name^="description"]').first();
    }

    /** The upload area ("File" in "Add a file", "Replace file" in "Edit"). */
    uploadArea() {
        return this.form().locator('.pkp_controller_fileUpload').first();
    }

    uploadFileButton() {
        return this.uploadArea().getByRole('button', {name: 'Upload File', exact: true});
    }

    changeFileButton() {
        return this.uploadArea().getByRole('button', {name: 'Change File', exact: true});
    }

    /**
     * Choose a file in the upload area and wait until it has uploaded (the
     * form holds its temporary file and the button reads "Change File").
     *
     * @param {string} file the file's path
     */
    async upload(file) {
        await this.uploadArea().locator('input[type="file"]').setInputFiles(file);
        await expect(this.form().locator('input[name="temporaryFileId"]')).not.toHaveValue('', {timeout: 30_000});
        await expect(this.changeFileButton()).toBeVisible({timeout: 30_000});
    }

    /** "Edit"'s "File" line value ("File Name", "File Size", "Date uploaded"). */
    fileLine(label) {
        return this.form()
            .getByRole('row')
            .filter({has: this.page.getByRole('cell', {name: label, exact: true})})
            .getByRole('cell')
            .nth(1);
    }

    /** "Edit"'s "Replace file" row (its upload area is `uploadArea()`). */
    replaceFileRow() {
        return this.form().getByRole('row').filter({has: this.page.getByRole('cell', {name: 'Replace file', exact: true})});
    }

    /** "Public Access" (Publisher Library only). */
    publicAccessBox() {
        return this.dialog().getByRole('checkbox', {name: 'Public Access', exact: true});
    }

    /** The sentence over the address. */
    publicAccessSentence() {
        return this.form().getByText(PUBLIC_ACCESS_SENTENCE, {exact: true});
    }

    /** The address under the sentence. */
    publicAddress() {
        return this.form().locator('blockquote');
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    /** The "Cancel" at the foot (a link). */
    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's close button. */
    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).first();
    }

    /** No window of this title is open. */
    async expectClosed() {
        await expect(this.page.getByRole('dialog', {name: this.title, exact: true})).toHaveCount(0, {timeout: 30_000});
        await markClosed(this.page);
        await waitForJQueryIdle(this.page);
    }

    /** Press "OK" and wait for the window to close. */
    async ok() {
        await this.okButton().click();
        await this.expectClosed();
    }

    /** Press "Cancel" at the foot and wait for the window to close. */
    async cancel() {
        await this.cancelLink().click();
        await this.expectClosed();
    }

    /**
     * Fill "Name", choose "Type", upload a file, optionally tick "Public
     * Access", then "OK".
     *
     * @param {{name: string, type: string, file: string, publicAccess?: boolean}} values
     */
    async add({name, type, file, publicAccess}) {
        await this.nameBox().fill(name);
        await this.chooseType(type);
        await this.upload(file);
        if (publicAccess) {
            await this.publicAccessBox().check();
        }
        await this.ok();
    }
};

// ---------------------------------------------------------------------------
// The "Delete" dialog (Rule 5)
// ---------------------------------------------------------------------------

exports.DeleteDialog = class DeleteDialog extends BasePage {
    dialog() {
        return this.page.getByRole('dialog', {name: 'Delete', exact: true});
    }

    heading() {
        return this.dialog().getByRole('heading', {name: 'Delete', exact: true});
    }

    okButton() {
        return this.dialog().getByRole('button', {name: 'OK', exact: true});
    }

    cancelButton() {
        return this.dialog().getByRole('button', {name: 'Cancel', exact: true});
    }

    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
        await markClosed(this.page);
        await waitForJQueryIdle(this.page);
    }

    /** "OK": the dialog closes (the caller reads the list). */
    async confirm() {
        await this.okButton().click();
        await this.expectClosed();
    }

    /** "Cancel": the dialog closes. */
    async cancel() {
        await this.cancelButton().click();
        await this.expectClosed();
    }
};
