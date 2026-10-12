// @ts-check
/**
 * @file playwright/pages/DecisionWizardPages.js
 *
 * The decision wizard's email page on a preprint server (feature U34, spec
 * docs/specs/U34-editorial-decision-recording.md), OPS-only by design
 * (PRINCIPLES M1): what the "Notify Authors" page's composer offers on top
 * of the wizard frame `DecisionPage` owns (the heading, the rail, the
 * footer, the closing window). The OJS and OMP suites keep their own
 * counterparts.
 *
 * Surfaces:
 * - the "Email Templates" list above the letter (Rule 7): the decision's
 *   template as a button with its name and a snippet;
 * - the letter itself: the visible TinyMCE editor read and driven directly
 *   (patterns.md "Server-rendered TinyMCE values never reach the backing
 *   textarea"; the page keeps a hidden sibling composer per email step, so
 *   the editor is the one whose container has client rects,
 *   .reports/U34/screen-notes.md ccK2);
 * - the toolbar's "Attach Files" and its side window with one panel per
 *   source (a level-2 heading, a sentence, a button; on a preprint server
 *   "Upload File" and "Library Files" alone, register OPS1), the "Upload
 *   File" window with its file input and its own "Attach Files" button,
 *   and the chips under the message (Rule 6); U39 (2026-09-24) added the
 *   "Library Files" source window its "Attach Library Files" opens, with
 *   its tick boxes and "Attach Selected";
 * - the toolbar's "Insert Content" and its side window listing the
 *   letter's values, each a row with the value, a description and an
 *   "Insert" button (Rule 5).
 *
 * DOM facts (lib/ui-library Composer.vue, FileAttacher*.vue,
 * InsertContent; confirmed live 2026-09-20, screen-notes ccK2/ccK3): the
 * templates heading is `.composer__templates__heading`, each entry a
 * `button.composer__template` whose name is `.composer__template__name`;
 * the toolbar buttons are TinyMCE `.tox-tbtn`s named by their text; the
 * side windows are dialogs named by their title ("Attach Files", "Upload
 * File", "Insert Content"); each attach source is a `.fileAttacher` with
 * an `h2`; the upload window's own "Attach Files" button shares the
 * toolbar button's accessible name, so it is scoped to its dialog; a chip
 * is `.composer__attachment` with a "Remove {file}" button; an insert row
 * is `li.insertContent__item` with `.insertContent__item__value` and
 * `.insertContent__item__description`.
 */
const {expect} = require('@playwright/test');
const {motionEnded} = require('../../../../shared/playwright/support/motion.js');

/** The window titles (lib/pkp `common.attachFiles`, `common.insertContent`, the upload source's label). */
const ATTACH_WINDOW = 'Attach Files';
const UPLOAD_WINDOW = 'Upload File';
const INSERT_WINDOW = 'Insert Content';
/** The "Library Files" source's own window (U39 Rule 11; its button reads "Attach Library Files"). */
const LIBRARY_FILES_WINDOW = 'Library Files';

exports.ATTACH_WINDOW = ATTACH_WINDOW;
exports.UPLOAD_WINDOW = UPLOAD_WINDOW;
exports.INSERT_WINDOW = INSERT_WINDOW;
exports.LIBRARY_FILES_WINDOW = LIBRARY_FILES_WINDOW;

exports.ComposerPage = class ComposerPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    // ---------------------------------------------------------------------
    // "Email Templates" (Rule 7)
    // ---------------------------------------------------------------------

    /** The "Email Templates" heading over the list. */
    templatesHeading() {
        return this.page.locator('.composer__templates__heading:visible');
    }

    /** The listed templates' names, in order (the visible composer's list). */
    async templateNames() {
        const names = await this.page.locator('.composer__template__name:visible').allInnerTexts();
        return names.map((s) => s.trim()).filter(Boolean);
    }

    /** The list holds exactly these templates, in order (auto-waited). */
    async expectTemplates(names) {
        await expect(this.templatesHeading()).toHaveText('Email Templates', {timeout: 30_000});
        await expect.poll(() => this.templateNames(), {timeout: 30_000}).toEqual(names);
    }

    // ---------------------------------------------------------------------
    // The letter (Rule 5)
    // ---------------------------------------------------------------------

    /**
     * The id of the letter's TinyMCE editor: the initialized editor whose
     * container is on screen (hidden sibling composers keep theirs too).
     * Waits for it, since the editor initializes after the page renders.
     */
    async editorId() {
        await this.page.waitForFunction(
            () => {
                const t = /** @type {any} */ (window).tinymce;
                const list = t ? t.get() || [] : [];
                return list.some((e) => {
                    try {
                        const c = e.getContainer();
                        return !!(c && c.getClientRects().length) && e.initialized;
                    } catch {
                        return false;
                    }
                });
            },
            null,
            {timeout: 30_000}
        );
        return this.page.evaluate(() => {
            const t = /** @type {any} */ (window).tinymce;
            const editor = (t.get() || []).find((e) => {
                try {
                    const c = e.getContainer();
                    return !!(c && c.getClientRects().length);
                } catch {
                    return false;
                }
            });
            return editor ? editor.id : null;
        });
    }

    /** The visible composer's "Subject:" box (the one email page's). */
    subjectInput() {
        return this.page.locator('input[name="subject"]:visible');
    }

    /** The letter's text (placeholders shown as their values). */
    async letterText() {
        const id = await this.editorId();
        return this.settledLetterRead(() =>
            this.page.evaluate((i) => /** @type {any} */ (window).tinymce.get(i).getContent({format: 'text'}), id)
        );
    }

    /**
     * A letter read taken once it has settled: non-empty and the same across
     * two reads a beat apart. The letter reaches the editor after the editor
     * starts (the template's body is fetched, then set into it), so a single
     * read can land on an empty or half-set letter
     * (.reports/flake-s26/fixC/diagnosis.md).
     *
     * @param {() => Promise<string>} read
     */
    async settledLetterRead(read) {
        let last = null;
        let value = '';
        await expect
            .poll(
                async () => {
                    value = await read();
                    const settled = value !== '' && value === last;
                    last = value;
                    return settled;
                },
                {timeout: 30_000, intervals: [250]}
            )
            .toBe(true);
        return value;
    }

    /** The letter's first paragraph's text ("Dear Ada Author,"). */
    async firstParagraphText() {
        const id = await this.editorId();
        return this.settledLetterRead(() =>
            this.page.evaluate((i) => {
                const body = /** @type {any} */ (window).tinymce.get(i).getBody();
                const p = body.firstElementChild || body;
                return (p.innerText || p.textContent || '').trim();
            }, id)
        );
    }

    /**
     * Focus the letter and put the cursor at the end of its first
     * paragraph, where "Insert Content" will drop a value (Rule 5). The
     * letter's editor is driven directly: a click through the toolbar's
     * iframe is what a TinyMCE frame refuses under automation
     * (screen-notes ccK2).
     */
    async placeCursorAtEndOfFirstParagraph() {
        const id = await this.editorId();
        await this.page.evaluate((i) => {
            const editor = /** @type {any} */ (window).tinymce.get(i);
            editor.focus();
            const body = editor.getBody();
            const p = body.firstElementChild || body;
            editor.selection.select(p, true);
            editor.selection.collapse(false);
        }, id);
    }

    /** A TinyMCE toolbar button by its visible text ("Attach Files", "Insert Content"). */
    toolbarButton(label) {
        return this.page
            .locator('.tox-tbtn:visible')
            .filter({hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)});
    }

    // ---------------------------------------------------------------------
    // "Attach Files" (Rule 6)
    // ---------------------------------------------------------------------

    /** The toolbar's "Attach Files" button. */
    attachFilesButton() {
        return this.toolbarButton(ATTACH_WINDOW);
    }

    /** The "Attach Files" side window. */
    attachWindow() {
        return this.page.getByRole('dialog', {name: ATTACH_WINDOW, exact: true});
    }

    /** The "Upload File" window the upload source opens. */
    uploadWindow() {
        return this.page.getByRole('dialog', {name: UPLOAD_WINDOW, exact: true});
    }

    /** Press "Attach Files" and wait for its window's first source heading. */
    async openAttachWindow() {
        await this.attachFilesButton().click();
        await expect(this.attachWindow()).toBeVisible({timeout: 30_000});
        await expect(this.attachSourceHeadings().first()).toBeVisible({timeout: 30_000});
        return this.attachWindow();
    }

    /** The window's source headings ("Upload File", "Library Files"), one per panel. */
    attachSourceHeadings() {
        return this.attachWindow().locator('.fileAttacher h2');
    }

    /** The source headings' texts, in order. */
    async attachSourceLabels() {
        const labels = await this.attachSourceHeadings().allInnerTexts();
        return labels.map((s) => s.trim()).filter(Boolean);
    }

    /** The window offers exactly these sources, in order (auto-waited). */
    async expectAttachSources(labels) {
        await expect.poll(() => this.attachSourceLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** A source's button in the window ("Upload File", "Attach Library Files", …). */
    attachSourceButton(label) {
        return this.attachWindow().getByRole('button', {name: label, exact: true});
    }

    /** A source window by its title ("Library Files", "Upload File"). */
    sourceWindow(title) {
        return this.page.getByRole('dialog', {name: title, exact: true});
    }

    /**
     * Press a source's button ("Attach Library Files") and wait for its
     * window, bounded by the window's "Back" (U39 Rule 11).
     */
    async openAttachSource(buttonLabel, windowTitle) {
        await this.attachSourceButton(buttonLabel).click();
        const win = this.sourceWindow(windowTitle);
        await expect(win).toBeVisible({timeout: 30_000});
        await expect(win.getByRole('button', {name: 'Back', exact: true}).last()).toBeVisible({timeout: 30_000});
        // In place before it is handed on: the window slides in from beyond
        // the viewport's right edge and is "visible" there, and the forced
        // tick of a row's box does not wait for it (U34 S3 on CI:
        // "Element is outside of the viewport"; motion.js).
        await motionEnded(win);
        return win;
    }

    /** A source window's "Attach Selected". */
    attachSelectedButton(win) {
        return win.getByRole('button', {name: 'Attach Selected', exact: true});
    }

    /** The tick box of the source window's row carrying `text`. */
    sourceCheckbox(win, text) {
        return win.locator('label').filter({hasText: text}).locator('input[type="checkbox"]');
    }

    /**
     * Tick a source window's row and press "Attach Selected": both windows
     * close and the chip named `fileName` shows under the message.
     */
    async attachSelected(win, rowText, fileName) {
        await this.sourceCheckbox(win, rowText).check({force: true});
        await expect(this.attachSelectedButton(win)).toBeEnabled({timeout: 30_000});
        await this.attachSelectedButton(win).click();
        await expect(win).toBeHidden({timeout: 30_000});
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
        await expect(this.attachmentChip(fileName)).toBeVisible({timeout: 30_000});
    }

    /** Close the "Attach Files" window with its own "Close". */
    async closeAttachWindow() {
        await this.attachWindow().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
    }

    /**
     * "Upload File" › add `filePath` › the window's "Attach Files": both
     * windows close and the file's chip stands under the message (Rule 6).
     * Bounded by the uploaded file's "Remove" control before the attach
     * press, and by the chip after it.
     */
    async uploadAndAttach(filePath, fileName) {
        await this.attachSourceButton(UPLOAD_WINDOW).click();
        const upload = this.uploadWindow();
        await expect(upload).toBeVisible({timeout: 30_000});
        const attach = upload.getByRole('button', {name: ATTACH_WINDOW, exact: true});
        await expect(attach).toBeDisabled();
        await upload.locator('input[type="file"]').setInputFiles(filePath);
        await expect(upload.getByRole('button', {name: `Remove ${fileName}`})).toBeVisible({timeout: 30_000});
        await expect(attach).toBeEnabled({timeout: 30_000});
        await attach.click();
        await expect(upload).toBeHidden({timeout: 30_000});
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
        await expect(this.attachmentChip(fileName)).toBeVisible({timeout: 30_000});
    }

    /** The chips under the message. */
    attachmentChips() {
        return this.page.locator('.composer__attachment:visible');
    }

    /** One chip by the file name it shows. */
    attachmentChip(fileName) {
        return this.attachmentChips().filter({hasText: fileName});
    }

    /** The chip's remove cross ("Remove {file}"). */
    attachmentRemoveButton(fileName) {
        return this.attachmentChip(fileName).getByRole('button', {name: `Remove ${fileName}`});
    }

    // ---------------------------------------------------------------------
    // "Insert Content" (Rule 5)
    // ---------------------------------------------------------------------

    /** The toolbar's "Insert Content" button. */
    insertContentButton() {
        return this.toolbarButton(INSERT_WINDOW);
    }

    /** The "Insert Content" side window. */
    insertWindow() {
        return this.page.getByRole('dialog', {name: INSERT_WINDOW, exact: true});
    }

    /** Press "Insert Content" and wait for the window's first row. */
    async openInsertWindow() {
        await this.insertContentButton().click();
        await expect(this.insertWindow()).toBeVisible({timeout: 30_000});
        await expect(this.insertRows().first()).toBeVisible({timeout: 30_000});
        return this.insertWindow();
    }

    /** The window's rows, one per value. */
    insertRows() {
        return this.insertWindow().locator('li.insertContent__item');
    }

    /** A row by its description ("The server's name"). */
    insertRow(description) {
        return this.insertRows().filter({
            has: this.page.locator('.insertContent__item__description', {hasText: description}),
        });
    }

    /** A row's value text. */
    insertRowValue(description) {
        return this.insertRow(description).locator('.insertContent__item__value');
    }

    /** The window's "Search" box. */
    insertSearchBox() {
        return this.insertWindow().getByRole('searchbox').or(this.insertWindow().getByLabel('Search'));
    }

    /**
     * Press a row's "Insert": the window closes and the value stands at
     * the cursor (Rule 5). Bounded by the window going.
     */
    async insertValue(description) {
        await this.insertRow(description).getByRole('button', {name: 'Insert', exact: true}).click();
        await expect(this.insertWindow()).toBeHidden({timeout: 30_000});
    }
};
