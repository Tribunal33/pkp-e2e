// @ts-check
/**
 * @file shared/playwright/pages/JatsBodyTextPages.js
 *
 * Page objects for the JATS & Body Text feature (spec:
 * docs/specs/U48-jats-and-body-text.md). The feature is a journal's only
 * ({OJS}); the OMP and OPS suites read its absence through the shared
 * `WorkflowPage` and never import this file. Strings are lib/pkp's and the
 * ui-library's, verbatim.
 *
 * Surfaces:
 * - JatsPage — the workflow's Publication › version › "JATS XML" page
 *   (`WorkflowPublicationJats.vue`): the box headed "JATS XML" with
 *   "Upload", "More Information", "Delete", "Download" and the "Make
 *   available with publication" tick box on the heading's right, the XML
 *   below and the line under it; the "Confirm deleting JATS XML" window
 *   and the "Enable / Disable JATS XML Download" windows; the "Error"
 *   window a refused call leaves.
 * - BodyTextPage — the version's "Body Text" page
 *   (`WorkflowPublicationBodyText.vue`): the SciFlow editor
 *   (`sciflow-editor`, an open shadow root that Playwright's CSS pierces)
 *   with its toolbar (`sciflow-formatbar`, buttons by aria-label), the
 *   "Document Edit" panel ("Save", the "Unsaved Changes" badge,
 *   "Fullscreen"), the three fold-out sections (`details[data-sidebar-
 *   section]`), the references list (`sciflow-reference-list
 *   li.reference-item`, "Cite" is `.reference-cite-btn`) and the import
 *   box (`[role=status]` above the editor).
 * - SendToTextEditorWindow — the "Send File to Text Editor" window a file
 *   row's "Send to Text Editor" opens (`select[name=sendToVersion]`, the
 *   options' values are publication ids, "create" for "Create New
 *   Version").
 * - The reader side: the article page's "JATS XML" link
 *   (`a.obj_galley_link.xml` in `.item.jats`, after the galley block), its
 *   download, a typed address that downloads, and the raw refusal page.
 * - Statistics › "Articles" (`/stats/publications/publications`), its
 *   table's column headers.
 *
 * DOM facts (U48 claim check ccK1–ccK3, `.reports/U48/screen-notes.md`,
 * 2026-09-25): the JATS page's settled anchor is `.jatsPanel
 * .filePanel__ready`; the tick box's input is screen-reader-only, so it is
 * pressed through its label text; a refused call leaves a modal "Error"
 * window that must be closed by its "OK" before the next click; the JATS
 * API is `submissions/{n}/publications/{m}/jats[/visibility]` (PUT and
 * DELETE tunnelled as POST), the Body Text's `…/bodyText` (GET, and the
 * save's POST tunnelling PUT). NEVER press Escape to close a toolbar menu
 * or a window here: it closes the workflow dialog (the fullscreen editor
 * is the exception: its own Escape handler restores the page).
 */
const fs = require('fs');
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {captureDownload, InformationCenter} = require('./SubmissionFilesPages.js');
const {pastCloseWindow} = require('./IdentifiersPages.js');

/** The strings of both pages, verbatim. */
const TEXT = {
    jatsPage: 'JATS XML',
    bodyTextPage: 'Body Text',
    boxHeading: 'JATS XML',
    makePublic: 'Make available with publication',
    generatedLine: 'This JATS file is generated automatically by the submission metadata',
    uploaded: 'Your file has been uploaded.',
    deleteTitle: 'Confirm deleting JATS XML',
    deleteMessage: 'You are about to remove the existing JATS XML File from this publication. Are you sure?',
    deleteButton: 'Delete JATS File',
    enableTitle: 'Enable JATS XML Download',
    enableMessage:
        'This will make the JATS XML file available for public download when the publication is published. Are you sure you want to enable this?',
    disableTitle: 'Disable JATS XML Download',
    disableMessage:
        'This will remove the JATS XML download option from the public article page. Are you sure you want to disable this?',
    notAllowed: 'You are not allowed to edit this publication.',
    noStageAccess: "You don't currently have access to that stage of the workflow.",
    documentPanel: 'Document Edit',
    unsaved: 'Unsaved Changes',
    save: 'Save',
    saved: 'Saved',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    references: 'References',
    dragHint: 'Drag references into the editor to place an in-text citation.',
    noReferences: 'No references yet.',
    cite: 'Cite',
    importing: 'Importing document',
    importSteps: ['Downloading document…', 'Loading converter…', 'Converting…'],
    sendTitle: 'Send File to Text Editor',
    sendQuestion: 'To which version would you like to send this file?',
    createNewVersion: 'Create New Version',
    refusal: '{"error":"You are not authorized to access the requested resource."}',
    notFound: '404 Not Found',
    jatsLink: 'JATS XML',
};
exports.JATS_TEXT = TEXT;

/** Whitespace folded, ends trimmed. */
function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * A moment as the JATS page's line prints it (`YYYY-MM-DD HH:MM:SS`, the
 * server's clock; the fleet and the runner both run on UTC).
 *
 * @param {Date} date
 */
function serverStamp(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}
exports.serverStamp = serverStamp;

/**
 * The browser's local clock as the generated XML's download name prints
 * it (`YYYYMMDD-HHMMSS`), read in the page.
 *
 * @param {import('@playwright/test').Page} page
 */
async function browserStamp(page) {
    return page.evaluate(() => {
        const now = new Date();
        const two = (/** @type {number} */ n) => String(n).padStart(2, '0');
        return `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
    });
}
exports.browserStamp = browserStamp;

/**
 * A download's name and its content as text.
 *
 * @param {import('@playwright/test').Download} download
 */
async function readDownload(download) {
    const file = await download.path();
    return {name: download.suggestedFilename(), text: file ? fs.readFileSync(file, 'utf8') : ''};
}
exports.readDownload = readDownload;

// -------------------------------------------------------------------------
// The "JATS XML" page
// -------------------------------------------------------------------------

exports.JatsPage = class JatsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('./WorkflowPage.js').WorkflowPage} frame the workflow panel
     */
    constructor(page, frame) {
        super(page);
        this.frame = frame;
    }

    /** Open a version's "JATS XML" page by address (editorial view). */
    async open(submissionId, publicationId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_jats`});
        await this.expectLoaded();
    }

    /** Side menu › the newest version › "JATS XML" (the panel already open). */
    async openFromMenu() {
        await this.frame.selectPage(TEXT.jatsPage);
        await this.expectLoaded();
    }

    /** The heading and the box have arrived, the XML fetched. */
    async expectLoaded() {
        await this.frame.expectPageHeading(TEXT.jatsPage);
        await expect(this.ready()).toBeVisible({timeout: 30_000});
        await expect(this.xml()).not.toHaveText('', {timeout: 30_000});
    }

    /** The page's panel. */
    panel() {
        return this.page.locator('.jatsPanel').first();
    }

    /** The loaded box (absent while the XML is fetched). */
    ready() {
        return this.panel().locator('.filePanel__ready');
    }

    /** The box's heading ("JATS XML"). */
    boxHeading() {
        return this.panel().locator('.filePanel__header h2');
    }

    /** The heading row's buttons. */
    headerButtons() {
        return this.panel().locator('.filePanel__header button');
    }

    /** The visible buttons' labels, left to right (read through a poll by the caller). */
    async buttonLabels() {
        const labels = await this.headerButtons().evaluateAll((buttons) =>
            buttons
                .filter((b) => b.getClientRects().length > 0)
                .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
        );
        return labels.filter(Boolean);
    }

    /** The heading row offers exactly these buttons, left to right (an auto-waited read). */
    async expectButtons(labels) {
        await expect.poll(() => this.buttonLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** A heading-row button by its exact label. */
    button(label) {
        return this.panel().locator('.filePanel__header').getByRole('button', {name: label, exact: true});
    }

    /** The "Make available with publication" tick box. */
    makePublicBox() {
        return this.panel().getByRole('checkbox', {name: TEXT.makePublic});
    }

    /** The tick box's label text (the box's input is screen-reader-only). */
    makePublicLabel() {
        return this.panel().getByText(TEXT.makePublic, {exact: true});
    }

    /** The XML as shown (coloured markup, read as text). */
    xml() {
        return this.panel().locator('.filePanel__fileContent');
    }

    /** The XML's text. */
    async xmlText() {
        return (await this.xml().innerText()).trim();
    }

    /** The line under the XML. */
    line() {
        return this.panel().locator('.filePanel__defaultContentFooter, .filePanel__fileContentFooter');
    }

    /**
     * Press "Upload" and choose `file`: waits for the upload's answer and
     * the page showing the file. Returns the upload's response.
     *
     * @param {string} file an absolute path
     */
    async upload(file) {
        const chooser = this.page.waitForEvent('filechooser', {timeout: 30_000});
        await this.button('Upload').click();
        const uploaded = this.page.waitForResponse(
            (r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await (await chooser).setFiles(file);
        const response = await uploaded;
        await expect(this.ready()).toBeVisible({timeout: 30_000});
        return response;
    }

    /** Press "Download": the file the browser saves, `{name, text}`. */
    async download() {
        const {download} = await captureDownload(this.page, () => this.button('Download').click());
        return readDownload(download);
    }

    /** Press "More Information": the "Information Center: {name}" window, open. */
    async openMoreInformation(name) {
        await this.button('More Information').click();
        const center = new InformationCenter(this.page, name);
        await expect(center.dialog()).toBeVisible({timeout: 30_000});
        return center;
    }

    /**
     * Close the "Information Center" window: the page fetches the XML
     * again, so this waits for the box to settle.
     */
    async closeMoreInformation(center) {
        const refetched = this.page.waitForResponse(
            (r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'GET',
            {timeout: 30_000}
        );
        await center.close();
        await refetched;
        await expect(this.ready()).toBeVisible({timeout: 30_000});
        await pastCloseWindow(this.page);
    }

    /** The "Confirm deleting JATS XML" window. */
    deleteDialog() {
        return this.page.getByRole('dialog').filter({hasText: TEXT.deleteTitle}).last();
    }

    /** Press "Delete": the window, open. */
    async openDelete() {
        await this.button('Delete').click();
        await expect(this.deleteDialog()).toBeVisible({timeout: 30_000});
        return this.deleteDialog();
    }

    /** The window's "Cancel": it closes, nothing is sent. */
    async cancelDelete() {
        await this.deleteDialog().getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(this.deleteDialog()).toHaveCount(0, {timeout: 30_000});
        await pastCloseWindow(this.page);
    }

    /**
     * The window's "Delete JATS File": waits for the delete's answer (a
     * real DELETE: the page's jQuery call sends the method itself) and the
     * page settling.
     */
    async confirmDelete() {
        const deleted = this.page.waitForResponse(
            (r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'DELETE',
            {timeout: 30_000}
        );
        await this.deleteDialog().getByRole('button', {name: TEXT.deleteButton, exact: true}).click();
        const response = await deleted;
        await expect(this.deleteDialog()).toHaveCount(0, {timeout: 30_000});
        await expect(this.ready()).toBeVisible({timeout: 30_000});
        await pastCloseWindow(this.page);
        return response;
    }

    /** The "Enable JATS XML Download" or "Disable JATS XML Download" window. */
    visibilityDialog(enable) {
        return this.page
            .getByRole('dialog')
            .filter({hasText: enable ? TEXT.enableTitle : TEXT.disableTitle})
            .last();
    }

    /**
     * Press the tick box (through its label): the window that asks,
     * open. `enable` is the state the press asks for.
     */
    async pressMakePublic(enable) {
        await this.makePublicLabel().click();
        const dialog = this.visibilityDialog(enable);
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** The window's "Cancel": it closes, nothing is sent. */
    async cancelVisibility(dialog) {
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await pastCloseWindow(this.page);
    }

    /** The window's "Confirm": waits for the save's answer and the box ungreying. */
    async confirmVisibility(dialog) {
        const saved = this.page.waitForResponse(
            (r) => /\/jats\/visibility/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const response = await saved;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(this.makePublicBox()).toBeEnabled({timeout: 30_000});
        await pastCloseWindow(this.page);
        return response;
    }

    /** Tick or untick the box and "Confirm" (a no-op when it already reads so). */
    async setMakePublic(enable) {
        if ((await this.makePublicBox().isChecked()) === enable) {
            return null;
        }
        return this.confirmVisibility(await this.pressMakePublic(enable));
    }
};

// -------------------------------------------------------------------------
// The "Body Text" page
// -------------------------------------------------------------------------

exports.BodyTextPage = class BodyTextPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('./WorkflowPage.js').WorkflowPage} frame the workflow panel
     */
    constructor(page, frame) {
        super(page);
        this.frame = frame;
    }

    /** A wait for the page's own fetch of the saved text (arm it before the page opens). */
    loaded() {
        return this.page.waitForResponse(
            (r) => /\/bodyText(\?|$)/.test(r.url()) && r.request().method() === 'GET',
            {timeout: 30_000}
        );
    }

    /** Open a version's "Body Text" page by address (editorial view). */
    async open(submissionId, publicationId) {
        const fetched = this.loaded();
        await this.frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_bodyText`});
        await fetched;
        await this.expectLoaded();
    }

    /** Side menu › the newest version › "Body Text" (the panel already open). */
    async openFromMenu() {
        const fetched = this.loaded();
        await this.frame.selectPage(TEXT.bodyTextPage);
        await fetched;
        await this.expectLoaded();
    }

    /** Reload the browser page and wait for the Body Text to arrive again. */
    async reload() {
        const fetched = this.loaded();
        await this.page.reload();
        await fetched;
        await this.expectLoaded();
    }

    /** The heading, the editor and the panel have arrived. */
    async expectLoaded() {
        await this.frame.expectPageHeading(TEXT.bodyTextPage);
        await expect(this.editor()).toBeVisible({timeout: 30_000});
        await expect(this.saveButton()).toBeVisible({timeout: 30_000});
        await expect(this.panelTitle()).toHaveText(TEXT.documentPanel);
    }

    /** The page's root. */
    root() {
        return this.page.locator('.sciflow-body-text').first();
    }

    /** The editor's editable area (inside the web component's shadow root). */
    editor() {
        return this.page.locator('sciflow-editor [contenteditable]').first();
    }

    /** The editor's text. */
    async editorText() {
        return flat(await this.editor().innerText());
    }

    /** The in-text citations in the editor. */
    citations() {
        return this.editor().locator('cite');
    }

    /** The figures' images in the editor. */
    figures() {
        return this.editor().locator('img');
    }

    /** The editor's paragraphs. */
    paragraphs() {
        return this.editor().locator('p');
    }

    /** The toolbar. */
    toolbar() {
        return this.page.locator('sciflow-formatbar');
    }

    /** A toolbar button by its accessible name ("Bold", "Undo", "Insert", …). */
    toolbarButton(name) {
        return this.toolbar().getByRole('button', {name, exact: true});
    }

    /** The panel's title ("Document Edit"). */
    panelTitle() {
        return this.root().locator('.sciflow-body-text__panel-title');
    }

    /** The panel's "Save" ("Saved" for a moment after a save). */
    saveButton() {
        return this.root().locator('.sciflow-body-text__save-row button').first();
    }

    /** The "Unsaved Changes" badge. */
    unsavedBadge() {
        return this.root().locator('.sciflow-body-text__unsaved');
    }

    /** "Fullscreen" / "Exit fullscreen". */
    fullscreenButton() {
        return this.root().locator('.sciflow-body-text__document-bar > button').last();
    }

    /** A fold-out section by its key: `references`, `selected-element` or `outline`. */
    section(key) {
        return this.root().locator(`details[data-sidebar-section="${key}"]`);
    }

    /** A section's heading. */
    sectionHeading(key) {
        return this.section(key).locator('summary');
    }

    /** "References"'s hint line. */
    referencesHint() {
        return this.section('references').locator('.sciflow-body-text__sidebar-description');
    }

    /** The references list's text (the list's own empty line included). */
    referenceList() {
        return this.section('references').locator('sciflow-reference-list');
    }

    /** The listed references, top to bottom. */
    referenceItems() {
        return this.section('references').locator('sciflow-reference-list li.reference-item');
    }

    /** A reference's "Cite". */
    citeButton(item) {
        return item.locator('.reference-cite-btn');
    }

    /** The import box above the editor. */
    importStatus() {
        return this.page.locator('.sciflow-body-text__main [role="status"]');
    }

    /** Click into the editor and put the cursor at the end of its text. */
    async focusEnd() {
        await this.editor().click();
        await this.page.keyboard.press('ControlOrMeta+End');
    }

    /** Type `text` at the end of the editor's text. */
    async typeAtEnd(text) {
        await this.focusEnd();
        await this.page.keyboard.type(text);
    }

    /**
     * Press "Save": waits for the save's answer and returns it with the
     * button's label as read right after (polled every 50 ms, since
     * "Saved" shows for about a second and a half).
     */
    async save() {
        const sent = this.page.waitForResponse(
            (r) => /\/bodyText(\?|$)/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await this.saveButton().click();
        const response = await sent;
        return response;
    }

    /** Press "Save" and read "Saved" on the button, then "Save" again. */
    async saveExpectingSaved() {
        await this.saveButton().click();
        await expect
            .poll(async () => flat(await this.saveButton().innerText()), {intervals: [50], timeout: 30_000})
            .toBe(TEXT.saved);
        await expect(this.saveButton()).toHaveText(TEXT.save, {timeout: 30_000});
    }

    /**
     * Drag a listed reference into the text and drop it at the end of a
     * paragraph: a slow hand-made mouse drag (the HTML5 drag of
     * `locator.dragTo()` inserted a citation once in three runs, ccK3).
     */
    async dragReference(item, paragraph) {
        await item.scrollIntoViewIfNeeded();
        const from = await item.boundingBox();
        const to = await paragraph.boundingBox();
        if (!from || !to) {
            throw new Error('dragReference: the reference or the paragraph is not on screen');
        }
        await this.page.mouse.move(from.x + 20, from.y + from.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(from.x + 30, from.y + from.height / 2, {steps: 3});
        await this.page.mouse.move(to.x + to.width - 10, to.y + to.height / 2, {steps: 15});
        await this.page.mouse.up();
    }

    /**
     * "Insert" › "Insert figure", then choose `file`: waits for the image's
     * upload. Returns the upload's response.
     *
     * @param {string} file an absolute path
     */
    async insertFigure(file) {
        await this.focusEnd();
        await this.toolbarButton('Insert').click();
        // Named "Insert figure"; sciflow 0.1.1 shows only "Figure" on it.
        const item = this.toolbar().getByRole('menuitem', {name: 'Insert figure', exact: true});
        await expect(item).toBeVisible({timeout: 30_000});
        const chooser = this.page.waitForEvent('filechooser', {timeout: 30_000});
        await item.click();
        const uploaded = this.page.waitForResponse(
            (r) => /\/submissions\/\d+\/files/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await (await chooser).setFiles(file);
        return uploaded;
    }

    /**
     * Start recording the import box's text every 25 ms (the markdown
     * import is over in about a second, ccK3); read with `importSteps()`.
     */
    async watchImport() {
        await this.page.evaluate(() => {
            const w = /** @type {any} */ (window);
            w.__u48Import = [];
            clearInterval(w.__u48ImportTimer);
            w.__u48ImportTimer = setInterval(() => {
                const el = document.querySelector('.sciflow-body-text__main [role=status]');
                const text = el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
                const seen = w.__u48Import;
                if (!seen.length || seen[seen.length - 1] !== text) {
                    seen.push(text);
                }
            }, 25);
        });
    }

    /** The import box's texts in the order seen (an empty string while no box shows). */
    async importSteps() {
        return this.page.evaluate(() => /** @type {string[]} */ (/** @type {any} */ (window).__u48Import || []));
    }

    /** Stop the recording. */
    async stopWatchingImport() {
        await this.page.evaluate(() => clearInterval(/** @type {any} */ (window).__u48ImportTimer));
    }
};

// -------------------------------------------------------------------------
// The "Send File to Text Editor" window
// -------------------------------------------------------------------------

exports.SendToTextEditorWindow = class SendToTextEditorWindow extends BasePage {
    dialog() {
        return this.page.getByRole('dialog', {name: TEXT.sendTitle});
    }

    /** The version picker. */
    picker() {
        return this.dialog().locator('select[name="sendToVersion"]');
    }

    /** The window is open, its picker filled. */
    async expectOpen() {
        await expect(this.picker()).toBeVisible({timeout: 30_000});
        await expect(this.picker().locator('option').first()).toBeAttached({timeout: 30_000});
    }

    /** The options as `{label, value}`, in order. */
    async options() {
        return this.picker()
            .locator('option')
            .evaluateAll((options) =>
                options.map((o) => ({
                    label: (o.textContent || '').replace(/\s+/g, ' ').trim(),
                    value: /** @type {HTMLOptionElement} */ (o).value,
                }))
            );
    }

    /** Choose a version by its publication id (every unpublished version shares one name). */
    async chooseVersion(publicationId) {
        await this.picker().selectOption(String(publicationId));
    }

    /** "Confirm": the window closes. */
    async confirm() {
        await this.dialog().getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }
};

// -------------------------------------------------------------------------
// The reader side
// -------------------------------------------------------------------------

/** Every galley-style link on the article page (galleys, then "JATS XML"). */
function articleLinks(page) {
    return page.locator('a.obj_galley_link');
}
exports.articleLinks = articleLinks;

/** The article page's "JATS XML" link. */
function jatsLink(page) {
    return page.locator('a.obj_galley_link.xml');
}
exports.jatsLink = jatsLink;

/**
 * The numbers in a "JATS XML" address
 * (`…/submissions/{n}/publications/{m}/jats/download`).
 *
 * @param {string} href
 */
function jatsLinkNumbers(href) {
    const match = href.match(/submissions\/(\d+)\/publications\/(\d+)\/jats\/download/);
    if (!match) {
        throw new Error(`not a JATS download address: ${href}`);
    }
    return {submissionId: Number(match[1]), publicationId: Number(match[2])};
}
exports.jatsLinkNumbers = jatsLinkNumbers;

/**
 * Open the article's page (`/article/view/{id}`, or `/version/{m}`) and
 * wait for it to have rendered its title.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {number} submissionId
 */
async function openArticle(page, contextPath, submissionId) {
    await page.goto(`/index.php/${contextPath}/article/view/${submissionId}`);
    await expect(page.locator('h1.page_title')).toBeVisible({timeout: 30_000});
}
exports.openArticle = openArticle;

/**
 * Press the article page's "JATS XML": the file the browser saves.
 *
 * @param {import('@playwright/test').Page} page
 */
async function pressJatsLink(page) {
    const {download} = await captureDownload(page, () => jatsLink(page).click());
    return readDownload(download);
}
exports.pressJatsLink = pressJatsLink;

/**
 * Type an address that downloads: `page.goto()` throws "Download is
 * starting" (ccK2), so the download event is what answers. Returns the
 * file the browser saves.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
async function gotoDownload(page, url) {
    const {download} = await captureDownload(page, () =>
        page.goto(url).then(
            () => null,
            (error) => {
                if (!/Download is starting/.test(String(error.message))) {
                    throw error;
                }
            }
        )
    );
    return readDownload(download);
}
exports.gotoDownload = gotoDownload;

/**
 * Type an address and return the page's whole text once it has loaded
 * (the raw refusal page, a "404 Not Found").
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
async function gotoText(page, url) {
    const response = await page.goto(url);
    await expect(page.locator('body')).not.toHaveText('', {timeout: 30_000});
    return {status: response ? response.status() : null, text: flat(await page.locator('body').innerText())};
}
exports.gotoText = gotoText;

/**
 * Statistics › "Articles": the table's column headers, once the table has
 * arrived (its first header is "Title").
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 */
async function statsArticleColumns(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/stats/publications/publications`);
    const headers = page.locator('table th');
    await expect(headers.first()).toBeVisible({timeout: 30_000});
    return (await headers.allInnerTexts()).map(flat).filter(Boolean);
}
exports.statsArticleColumns = statsArticleColumns;
