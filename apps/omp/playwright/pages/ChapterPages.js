// @ts-check
/**
 * @file playwright/pages/ChapterPages.js
 *
 * OMP page objects for Chapters & work type (spec:
 * docs/specs/U72-chapters-work-type.md). OMP-only: a journal and a
 * preprint server install neither surface.
 *
 * Surfaces:
 * - ChapterList — the chapter list: the legacy category grid
 *   (`[id^="component-grid-users-chapter-chaptergrid"]`) that both the
 *   workflow's "Publication" › the version › "Chapters" page and the
 *   wizard's Details step "Chapters" section draw. A chapter is a
 *   `tbody.category_grid_body`; its first `tr` is the chapter row (the
 *   title, a link `a.pkp_linkaction_editChapter` for whoever may change the
 *   list, a plain label otherwise), then one `tr` per chapter author (Name,
 *   Email, Role). A chapter without authors draws its own "No Items" line
 *   (`#<chapter tbody id>-emptyPlaceholder`); the empty list draws the
 *   grid's `tbody.empty`. The header links "Order" and "Add Chapter" are
 *   links; "Order" stays in the DOM, hidden, while the page loads a list
 *   of fewer than two chapters, so they are read `:visible`. The row arrow
 *   (`a.show_extras`, screen-reader text "Settings") reveals the row's
 *   control line (the NEXT `tr`, `<row id>-control-row`) holding "Delete".
 *   "Order" shows a move handle (`a.pkp_linkaction_moveItem`) on every
 *   chapter and author row and the grid's "Done" / "Cancel ordering" links.
 *   Every read goes through CSS, never roles: the workflow dialog that
 *   holds the grid is aria-hidden while a chapter window or a confirmation
 *   is open over it (patterns.md, pitfalls 4 and 6).
 * - ChapterWindow — the "Add Chapter" / "Edit Chapter" window: a Vue side
 *   dialog named by its heading, holding the legacy `form#editChapterForm`
 *   ("Edit Chapter" wraps it in the tab "Edit Metadata"). Its "Save"
 *   posts `$$$call$$$/…/chapter-grid/update-chapter` (kebab-cased, patterns
 *   lesson 11), its "Cancel" is a link (pitfall 7), its close arrow is the
 *   dialog's "Close" button; with a change typed the arrow raises the
 *   browser's own confirm, which the caller answers through
 *   `page.once('dialog')`.
 * - WorkTypeControl — the editorial view's header button reading the
 *   book's work type ("Monograph" / "Edited Volume") and its headlessui
 *   menu (items `role=menuitem`, portalled to the page). A choice PUTs the
 *   submission's `workType` (POST with the override header).
 * - PublicationDatesPage — the side menu's "Marketing" › "Publication
 *   Dates" page: its radio group "Publication Dates" and "Save" (the
 *   submission PUT).
 *
 * The workflow frame (opening the panel, the side menu, the header, the
 * no-access box) is the shared `WorkflowPage`. Screen shapes confirmed
 * against the running OMP fleet on 2026-09-28 (the U72 claim checks and the
 * test author's probes, `.reports/U72/screen-notes.md`).
 */
const {expect} = require('@playwright/test');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const T = 30_000;

/** The two work types, as the header button and its menu read them. */
const WORK_TYPES = {monograph: 'Monograph', editedVolume: 'Edited Volume'};

/** The two "Publication Dates" options (Fields, the "Publication Dates" page). */
const PUBLICATION_DATES = {
    book: 'All chapters will use the publication date of the monograph.',
    chapter: 'Each chapter may have its own publication date.',
};

/** Verbatim screen strings the suite reads. */
const TEXT = {
    saved: 'Your changes have been saved.',
    required: 'This field is required.',
    requiredNote: 'Required fields are marked with an asterisk: *',
    chapterPage: "Show this chapter on its own page and link to that page from the book's table of contents.",
    doiNote: '(This chapter will always be shown on its own page because it has a DOI.)',
    formChanged: 'The data on this form has changed. Do you wish to continue without saving?',
    deleteQuestion: 'Are you sure you wish to delete this item? This action cannot be undone.',
    publishedWarning: 'Warning: This version has been published. Editing it may impact the published content.',
    publishedAuthor: 'This version has been published and can not be edited.',
    wizardDescription:
        'Please provide all of the chapters of this submission. If you are submitting an edited volume, please make sure that each chapter indicates the contributors for that chapter.',
    licenseSentence: (license) => `The license will be set automatically to ${license} when this is published.`,
};

/** A regex matching `text` exactly, whitespace around it allowed. */
function exactly(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/**
 * Wait out the slot a closed side window keeps for 450 ms on the app's
 * timer: an opener pressed within it opens nothing (patterns.md, pitfall
 * 4). A page timer longer than the app's fires after it whatever the load.
 *
 * @param {import('@playwright/test').Page} page
 */
async function pastCloseWindow(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

/** A grid redraw the list makes after a chapter's save or delete. */
function isGridFetch(response) {
    return /chapter-grid\/fetch-(grid|category)/i.test(response.url());
}

/** The `workflowMenuKey` of a version's Chapters page. */
function chaptersMenuKey(publicationId) {
    return `publication_${publicationId}_chapters`;
}

// ---------------------------------------------------------------------------
// The chapter list
// ---------------------------------------------------------------------------

class ChapterList {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /** The chapter grid (the Chapters page's, or the wizard's Details step's). */
    grid() {
        return this.page.locator('[id^="component-grid-users-chapter-chaptergrid"]').first();
    }

    /** The grid's heading ("Chapters"). */
    heading() {
        return this.grid().locator('.header h4');
    }

    /** Wait until the grid has drawn (its heading is on screen). */
    async expectLoaded() {
        await expect(this.heading()).toHaveText(exactly('Chapters'), {timeout: T});
    }

    /** The header links on screen, left to right ("Order", "Add Chapter"). */
    headerLinks() {
        return this.grid().locator('.header ul.actions a:visible');
    }

    addChapterLink() {
        return this.grid().locator('.header a.pkp_linkaction_addChapter:visible');
    }

    orderLink() {
        return this.grid().locator('.header a.pkp_linkaction_orderItems:visible');
    }

    /** The empty list's "No Items" line (the grid's own, not a chapter's). */
    emptyListLine() {
        return this.grid().locator('tbody.empty:not(.category_placeholder):visible');
    }

    /** Every chapter block, in list order. */
    chapterBlocks() {
        return this.grid().locator('tbody.category_grid_body');
    }

    /** The chapter rows' title cells, in list order (links or plain labels). */
    titleCells() {
        return this.chapterBlocks().locator(':scope > tr.gridRow:first-child td.first_column .gridCellContainer');
    }

    /** One chapter's block, by its exact title. */
    chapterBlock(title) {
        return this.chapterBlocks().filter({
            has: this.page.locator('tr.gridRow:first-child td.first_column .gridCellContainer', {
                hasText: exactly(title),
            }),
        });
    }

    /** The chapter row of `title`. */
    chapterRow(title) {
        return this.chapterBlock(title).locator(':scope > tr.gridRow:first-child');
    }

    /** The title as a link (whoever may change the list). */
    titleLink(title) {
        return this.grid().locator('a.pkp_linkaction_editChapter').filter({hasText: exactly(title)});
    }

    /** Every title link in the grid. */
    titleLinks() {
        return this.grid().locator('a.pkp_linkaction_editChapter');
    }

    /** The arrow before a chapter's title ("Settings"), revealing "Delete". */
    rowArrow(title) {
        return this.chapterRow(title).locator('a.show_extras, a.hide_extras');
    }

    /** Every row arrow in the grid. */
    rowArrows() {
        return this.grid().locator('a.show_extras, a.hide_extras');
    }

    /** The author rows under a chapter. */
    authorRows(title) {
        return this.chapterBlock(title).locator(':scope > tr.gridRow:not(:first-child)');
    }

    /** The "Name" cells of a chapter's author rows, in order. */
    authorNames(title) {
        return this.authorRows(title).locator('td:nth-of-type(1) .gridCellContainer');
    }

    /**
     * Assert a chapter's author rows exactly: `[[name, email, role], …]`
     * under "Name", "Email" and "Role".
     */
    async expectAuthorRows(title, rows) {
        const cells = this.authorRows(title).locator('td .gridCellContainer');
        await expect(cells).toHaveText(rows.flat().map(exactly), {timeout: T});
    }

    /** The column heads of the grid ("Name", "Email", "Role"). */
    columnHeads() {
        return this.grid().locator('thead th');
    }

    /**
     * The "No Items" line under a chapter that has no authors. Resolves
     * the chapter's block id first.
     */
    async noAuthorsLine(title) {
        await expect(this.chapterBlock(title)).toHaveCount(1, {timeout: T});
        const id = await this.chapterBlock(title).getAttribute('id');
        return this.grid().locator(`[id="${id}-emptyPlaceholder"]:visible`);
    }

    /** Press "Add Chapter" and return the window. */
    async openAdd() {
        await this.addChapterLink().click();
        const win = new ChapterWindow(this.page, 'Add Chapter');
        await win.expectOpen();
        return win;
    }

    /** Press a chapter's title and return the "Edit Chapter" window. */
    async openEdit(title) {
        await this.titleLink(title).click();
        const win = new ChapterWindow(this.page, 'Edit Chapter');
        await win.expectOpen();
        return win;
    }

    /**
     * Add a chapter through "Add Chapter": the title typed, the given
     * contributor and file boxes ticked, "Save". Resolves once the window
     * has closed and the chapter is listed.
     */
    async addChapter({title, subtitle, pages, authors = [], files = []}) {
        const win = await this.openAdd();
        await win.fill({title, subtitle, pages});
        for (const name of authors) {
            await win.contributorBox(name).check();
        }
        for (const name of files) {
            await win.fileBox(name).check();
        }
        await win.save();
        await expect(this.chapterBlock(title)).toHaveCount(1, {timeout: T});
    }

    /** The "Delete" confirmation dialog. */
    deleteDialog() {
        return this.page.getByRole('dialog', {name: 'Delete', exact: true});
    }

    /** Press a chapter's arrow, then its "Delete"; returns the confirmation. */
    async openDelete(title) {
        const row = this.chapterRow(title);
        await this.rowArrow(title).click();
        const rowId = await row.getAttribute('id');
        const deleteLink = this.grid().locator(`[id="${rowId}-control-row"] a.pkp_linkaction_deleteChapter`);
        await expect(deleteLink).toBeVisible({timeout: T});
        await deleteLink.click();
        const dialog = this.deleteDialog();
        await expect(dialog).toBeVisible({timeout: T});
        return dialog;
    }

    /** Confirm the open "Delete" dialog with "OK", bounded by the delete call. */
    async confirmDelete(dialog) {
        const deleted = this.page.waitForResponse(
            (r) => /delete-chapter/i.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        const redrawn = this.page.waitForResponse(isGridFetch, {timeout: T});
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        const response = await deleted;
        expect(response.ok(), `delete-chapter answered ${response.status()}`).toBe(true);
        await redrawn;
        await expect(dialog).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }

    // --- "Order" (Rule 8) -------------------------------------------------

    /** The move handles on screen while ordering. */
    orderHandles() {
        return this.grid().locator('a.pkp_linkaction_moveItem:visible');
    }

    doneLink() {
        return this.grid().locator('.order_finish_controls a.saveButton:visible');
    }

    cancelOrderingLink() {
        return this.grid().locator('.order_finish_controls a.cancelFormButton:visible');
    }

    /** Press "Order" and wait for the handles. */
    async startOrdering() {
        await this.orderLink().click();
        await expect(this.doneLink()).toBeVisible({timeout: T});
    }

    /**
     * Drag an author row above another author row of the same chapter
     * (mouse down on the row, a small move to start the sortable, then the
     * target row's top edge). Resolves once the rows under the chapter read
     * the dragged name first of the two.
     */
    async dragAuthorAbove(title, name, aboveName) {
        const row = (n) => this.authorRows(title).filter({hasText: n});
        const from = row(name).locator('td').first();
        const to = row(aboveName);
        await from.scrollIntoViewIfNeeded();
        const a = await from.boundingBox();
        const b = await to.boundingBox();
        if (!a || !b) {
            throw new Error(`no box for the author rows ${name} / ${aboveName}`);
        }
        await this.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 - 5, {steps: 5});
        await this.page.mouse.move(b.x + b.width / 2, b.y + 2, {steps: 25});
        await this.page.mouse.up();
    }

    /** Press "Done", bounded by the save-sequence call. */
    async finishOrdering() {
        const saved = this.page.waitForResponse(
            (r) => /save-sequence/i.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.doneLink().click();
        const response = await saved;
        expect(response.ok(), `save-sequence answered ${response.status()}`).toBe(true);
        await expect(this.doneLink()).toHaveCount(0, {timeout: T});
    }

    /** Press "Cancel ordering" (no call is made). */
    async cancelOrdering() {
        await this.cancelOrderingLink().click();
        await expect(this.cancelOrderingLink()).toHaveCount(0, {timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The chapter window
// ---------------------------------------------------------------------------

class ChapterWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {'Add Chapter'|'Edit Chapter'} heading
     */
    constructor(page, heading) {
        this.page = page;
        this.heading = heading;
    }

    dialog() {
        return this.page.getByRole('dialog', {name: this.heading, exact: true});
    }

    form() {
        return this.dialog().locator('form#editChapterForm');
    }

    /** The window has loaded its form (the server-rendered boxes and "Save"). */
    async expectOpen() {
        await expect(this.form().locator('input[name^="title["]').first()).toBeVisible({timeout: T});
        await expect(this.saveButton()).toBeVisible({timeout: T});
    }

    /** The window's heading. */
    headingEl() {
        return this.dialog().getByRole('heading', {level: 1});
    }

    /** The tabs of "Edit Chapter" ("Edit Metadata", "Identifiers"). */
    tabs() {
        return this.dialog().getByRole('tab');
    }

    titleBox(locale = 'en') {
        return this.form().locator(`input[name="title[${locale}]"]`);
    }

    subtitleBox(locale = 'en') {
        return this.form().locator(`input[name="subtitle[${locale}]"]`);
    }

    /** The abstract's rich-text editor (its presence; the body is a TinyMCE iframe). */
    abstractEditor() {
        return this.form().locator('.tox-tinymce').first();
    }

    pagesBox() {
        return this.form().locator('input[name="pages"]');
    }

    /** The visible "Date Published" box (the posted value is its hidden alt field). */
    datePublishedBox() {
        return this.form().locator('input[id^="datePublished"]:not([type=hidden])');
    }

    licenseUrlBox() {
        return this.form().locator('input[name="licenseUrl"]');
    }

    /** The sentence above "License URL" (Rule 12a). */
    licenseSentence() {
        return this.form().getByText(/^The license will be set automatically to /);
    }

    /** A section's label ("Title", "Chapter Page", "Add Contributor", "Files", "License URL", "Date Published"). */
    sectionLabel(label) {
        return this.form().getByText(exactly(label));
    }

    chapterPageBox() {
        return this.form().getByRole('checkbox', {name: TEXT.chapterPage, exact: true});
    }

    doiNote() {
        return this.form().getByText(TEXT.doiNote, {exact: true});
    }

    /** The "Add Contributor" list's boxes. */
    contributorList() {
        return this.form().getByRole('list').filter({hasText: 'Add Contributor'});
    }

    contributorBox(name) {
        return this.contributorList().getByRole('checkbox', {name, exact: true});
    }

    /** The "Files" list's boxes. */
    fileList() {
        return this.form().getByRole('list').filter({hasText: /^\s*Files/});
    }

    fileBox(name) {
        return this.fileList().getByRole('checkbox', {name, exact: true});
    }

    /**
     * A box list as `["[x] label", "[ ] label", …]` in screen order, read
     * once the window is open (a server-rendered form: settled on arrival).
     *
     * @param {'contributors'|'files'} which
     */
    async boxStates(which) {
        await this.expectOpen();
        const list = which === 'contributors' ? this.contributorList() : this.fileList();
        return list.getByRole('checkbox').evaluateAll((boxes) =>
            boxes.map((b) => `${b.checked ? '[x]' : '[ ]'} ${(b.closest('label') || b.parentElement).innerText.trim()}`)
        );
    }

    /** The "This field is required." line under the Title box. */
    titleError() {
        return this.form().locator('label.error').filter({hasText: TEXT.required});
    }

    requiredNote() {
        return this.form().getByText(TEXT.requiredNote, {exact: true});
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's close arrow. */
    closeArrow() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).first();
    }

    /** Type the given text boxes (each replaces the box's content). */
    async fill({title, subtitle, pages, licenseUrl} = {}) {
        if (title !== undefined) await this.titleBox().fill(title);
        if (subtitle !== undefined) await this.subtitleBox().fill(subtitle);
        if (pages !== undefined) await this.pagesBox().fill(pages);
        if (licenseUrl !== undefined) await this.licenseUrlBox().fill(licenseUrl);
    }

    /**
     * Type a date in "Date Published" from the keyboard (select all, Delete,
     * the date, Tab): `fill()` on a jQuery UI date box changes only the
     * visible text, never the posted alt field (patterns.md pitfall 4).
     */
    async typeDatePublished(date) {
        const box = this.datePublishedBox();
        await box.click();
        await box.press('ControlOrMeta+a');
        await box.press('Delete');
        await box.pressSequentially(date);
        await box.press('Tab');
    }

    /**
     * Press "Save", bounded by the update call and the list's redraw of
     * that chapter (`fetch-category`, which replaces the rows: a press on
     * the list before it lands on a row about to go), and wait for the
     * window to close.
     */
    async save() {
        const saved = this.page.waitForResponse(
            (r) => /update-chapter/i.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        const redrawn = this.page.waitForResponse(isGridFetch, {timeout: T});
        await this.saveButton().click();
        const response = await saved;
        expect(response.ok(), `update-chapter answered ${response.status()}`).toBe(true);
        await redrawn;
        await this.expectClosed();
    }

    /** Press "Cancel" (it asks nothing) and wait for the window to close. */
    async cancel() {
        await this.cancelLink().click();
        await this.expectClosed();
    }

    /** The window has closed, and its close slot has passed (the next opener works). */
    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

// ---------------------------------------------------------------------------
// The Chapters page, the work-type control, "Publication Dates"
// ---------------------------------------------------------------------------

class ChaptersPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any}} [options]
     */
    constructor(page, contextPath, options = {}) {
        this.page = page;
        this.contextPath = contextPath;
        this.frame = new WorkflowPage(page, contextPath, options);
        this.list = new ChapterList(page);
    }

    /** Open a version's Chapters page by address, in the editorial view. */
    async gotoEditorial(submissionId, publicationId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: chaptersMenuKey(publicationId)});
        await this.frame.expectPageHeading('Chapters');
        await this.list.expectLoaded();
    }

    /** Open a version's Chapters page by address, in the author's view (My Submissions). */
    async gotoAuthor(submissionId, publicationId) {
        await this.frame.gotoAuthor(submissionId, {menuKey: chaptersMenuKey(publicationId)});
        await this.frame.expectPageHeading('Chapters');
        await this.list.expectLoaded();
    }

    /** From an open workflow, choose "Publication" › the newest version › "Chapters". */
    async openFromMenu() {
        await this.frame.selectPage('Chapters');
        await this.list.expectLoaded();
    }

    /** Reload the page and wait for the list again. */
    async reload() {
        await this.page.reload();
        await this.frame.expectOpen();
        await this.list.expectLoaded();
    }

    /** A notice line in the page's main column (the published-version warnings). */
    mainText(text) {
        return this.frame.dialog().getByText(text, {exact: true});
    }

    // --- the work-type control (Rule 13) -----------------------------------

    /** The header's work-type button, whichever type it reads. */
    workTypeButton() {
        return this.frame.header().getByRole('button', {name: /^(Monograph|Edited Volume)$/});
    }

    workTypeMenuItem(label) {
        return this.page.getByRole('menuitem', {name: label, exact: true});
    }

    /** Open the work-type menu and return its items' labels. */
    async openWorkTypeMenu() {
        await this.workTypeButton().click();
        await expect(this.workTypeMenuItem(WORK_TYPES.monograph)).toBeVisible({timeout: T});
        return this.page.getByRole('menuitem').allInnerTexts().then((l) => l.map((s) => s.trim()));
    }

    /**
     * Choose a work type from the header's menu. When it differs from the
     * one the button reads, bounded by the submission PUT (POST with the
     * override header).
     */
    async chooseWorkType(label) {
        const current = (await this.workTypeButton().innerText()).trim();
        await this.workTypeButton().click();
        const item = this.workTypeMenuItem(label);
        await expect(item).toBeVisible({timeout: T});
        if (current === label) {
            await item.click();
            return;
        }
        const saved = this.page.waitForResponse(
            (r) => /\/api\/v1\/submissions\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
            {timeout: T}
        );
        await item.click();
        const response = await saved;
        expect(response.ok(), `the work-type save answered ${response.status()}`).toBe(true);
    }

    // --- "Marketing" › "Publication Dates" (Rule 11) ------------------------

    publicationDatesGroup() {
        return this.frame.dialog().getByRole('group', {name: 'Publication Dates'});
    }

    publicationDatesRadio(label) {
        return this.publicationDatesGroup().getByRole('radio', {name: label, exact: true});
    }

    publicationDatesSave() {
        return this.frame.primaryColumn().getByRole('button', {name: 'Save', exact: true});
    }

    /** From an open workflow, choose "Marketing" › "Publication Dates". */
    async openPublicationDates() {
        await this.frame.select('Publication Dates', 'Marketing: Publication Dates');
        await expect(this.publicationDatesGroup()).toBeVisible({timeout: T});
    }

    /** Select an option and "Save", bounded by the submission PUT. */
    async savePublicationDates(label) {
        await this.publicationDatesRadio(label).check();
        const saved = this.page.waitForResponse(
            (r) => /\/api\/v1\/submissions\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.publicationDatesSave().click();
        const response = await saved;
        expect(response.ok(), `the Publication Dates save answered ${response.status()}`).toBe(true);
    }
}

module.exports = {
    WORK_TYPES,
    PUBLICATION_DATES,
    TEXT,
    exactly,
    chaptersMenuKey,
    ChapterList,
    ChapterWindow,
    ChaptersPage,
};
