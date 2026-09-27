// @ts-check
/**
 * @file playwright/pages/CatalogPages.js
 *
 * Page objects for U70 "Catalog management" (docs/specs/U70-catalog-management.md),
 * OMP only: a journal and a preprint server do not install the surface.
 *
 * Surfaces:
 * - CatalogPage — the press's Catalog page (`{press}/manageCatalog`,
 *   Content › "Catalog"): its heading, the "All Monographs" tab, the list
 *   "Monographs" with its rows (number, authors, title, "View Submission",
 *   "View Entry", the "Featured" and "New release" boxes), the column
 *   headings, "Search", "Filters" with its column and "Clear filter" crosses,
 *   "Order Features" with the arrows, "Save Order" and "Cancel", the ordering
 *   notice, and "Add Entry".
 * - AddEntryPanel — the "Add Entry" panel: the "Find monographs to add to the
 *   catalog" box, its suggestions, the chosen books' tags, "Save", "Close".
 * - CatalogEntryPage — a version's "Catalog Entry" page in the workflow:
 *   the groups, "Series", "Series Position", the "Cover Image" box, "URL
 *   Path", "Save" with its "Saving"/"Saved" line, the form's refusals.
 * - PublicCatalog — what a visitor reads: the press's public catalog, "New
 *   Releases", a series' page and a book's page (titles in order, the
 *   series position above a title, the cover picture and its size).
 * - publishFromWorkflow — the workflow's own "Publish" on an open
 *   publication page, confirmed in its "Schedule For Publication" window.
 *
 * The side menu is `EditorialSideMenu` (ReaderCommentsPages.js), the
 * workflow frame `WorkflowPage`, the Production notice
 * `ProductionStagePages.js` and "Unpublish" `PublicationPages.js`, reused as
 * they are.
 *
 * DOM facts from the U70 claim check (.reports/U70/screen-notes.md, the kept
 * scripts under shared/playwright/checks/U70/), 2026-09-27:
 * - rows are `.listPanel__item--catalog`; the title is `.listPanel__itemSubtitle`,
 *   the authors `.listPanel__itemTitle`, the number `.listPanel__item--catalog__id`;
 *   the boxes are buttons named by their screen-reader sentence;
 * - the column headings `.listPanel--catalog__heading` are aria-hidden (read
 *   by CSS) and absent while the list is empty;
 * - every list change (search, filter, "Cancel") is one GET `_submissions?…`;
 *   a box press is a POST `saveDisplayFlags`, "Save Order" a POST
 *   `saveFeaturedOrder`, "Add Entry" › "Save" a POST `_submissions/addToCatalog`;
 * - while ordering, the rows not featured in the current list are hidden,
 *   and each featured row carries `.orderer__up` / `.orderer__down` (their
 *   accessible names read "… of undefined", spec A14, so they are located by
 *   class, never by name);
 * - Search commits on Enter only; its cross is "Clear search phrase";
 * - the Catalog Entry page's groups are `.pkpFormGroup[role=group]`, its
 *   footer `.pkpFormPage__footer` with the "Saving"/"Saved" status.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialSideMenu} = require('./ReaderCommentsPages.js');

const T = 30_000;

/** The boxes' screen-reader sentences (Fields, the Catalog page). */
const BOX = {
    featuredOn: 'This monograph is featured. Make this monograph not featured.',
    featuredOff: 'This monograph is not featured. Make this monograph featured.',
    newOn: 'This monograph is a new release. Make this monograph not a new release.',
    newOff: 'This monograph is not a new release. Make this monograph a new release.',
};

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-text matcher (trimmed). */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}

/** The catalog list's own fetch (search, filter, "Cancel", a reload after "Add Entry"). */
function isListGet(response) {
    return /\/_submissions\?/.test(response.url()) && response.request().method() === 'GET';
}

// ---------------------------------------------------------------------------
// The Catalog page
// ---------------------------------------------------------------------------

class CatalogPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The page's address (`{press}/manageCatalog`). */
    url() {
        return this.contextUrl(this.contextPath, '/manageCatalog');
    }

    /** Open the page by its address and wait for the list (rows or the empty line). */
    async goto() {
        await this.page.goto(this.url());
        await this.expectLoaded();
    }

    /** Open the editorial dashboard, then the side menu's "Content" › "Catalog". */
    async openFromSideMenu() {
        await this.page.goto(this.contextUrl(this.contextPath, '/dashboard/editorial'));
        const menu = new EditorialSideMenu(this.page);
        await menu.openContentGroup();
        const entry = menu.nav.getByRole('link', {name: 'Catalog', exact: true});
        await expect(entry).toBeVisible({timeout: T});
        await entry.click();
        await expect(this.page).toHaveURL(/\/manageCatalog/, {timeout: T});
        await this.expectLoaded();
    }

    /** The heading is up and the list shows rows or its empty line. */
    async expectLoaded() {
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.rows().or(this.emptyLine()).first()).toBeVisible({timeout: T});
    }

    /** Reload by address (a reload is what moves a newly ticked book, Rule 6). */
    async reload() {
        await this.goto();
    }

    heading() {
        return this.page.locator('h1.app__pageHeading');
    }

    tab(name) {
        return this.page.getByRole('tab', {name, exact: true});
    }

    /** The list's heading ("Monographs"). */
    listHeading() {
        return this.panel().locator('.pkpHeader h2').first();
    }

    panel() {
        return this.page.locator('.listPanel--catalog');
    }

    /** "No items found." */
    emptyLine() {
        return this.panel().locator('.listPanel__empty');
    }

    /** The two column headings over the boxes (aria-hidden, so read by CSS). */
    columnHeadings() {
        return this.panel().locator('.listPanel--catalog__heading');
    }

    rows() {
        return this.panel().locator('.listPanel__item--catalog');
    }

    /** The rows on screen (while ordering, the books not featured are hidden). */
    shownRows() {
        return this.rows().filter({visible: true});
    }

    /** The titles of the rows on screen, top to bottom (for `toHaveText([...])`). */
    shownTitles() {
        return this.shownRows().locator('.listPanel__itemSubtitle');
    }

    /** A row by its book's title. */
    row(title) {
        return this.rows().filter({has: this.page.locator('.listPanel__itemSubtitle', {hasText: whole(title)})});
    }

    rowNumber(title) {
        return this.row(title).locator('.listPanel__item--catalog__id');
    }

    rowAuthors(title) {
        return this.row(title).locator('.listPanel__itemTitle');
    }

    rowTitle(title) {
        return this.row(title).locator('.listPanel__itemSubtitle');
    }

    viewSubmission(title) {
        return this.row(title).getByRole('link', {name: 'View Submission', exact: true});
    }

    viewEntry(title) {
        return this.row(title).getByRole('link', {name: 'View Entry', exact: true});
    }

    /** The row's "Featured" box in either state. */
    featuredBox(title) {
        return this.row(title).getByRole('button', {name: /monograph is (not )?featured/});
    }

    newReleaseBox(title) {
        return this.row(title).getByRole('button', {name: /monograph is (not )?a new release/});
    }

    /** The box is ticked (`on`) or empty, read by its screen-reader sentence. */
    async expectFeatured(title, on) {
        await expect(this.featuredBox(title)).toHaveAccessibleName(on ? BOX.featuredOn : BOX.featuredOff, {timeout: T});
    }

    async expectNewRelease(title, on) {
        await expect(this.newReleaseBox(title)).toHaveAccessibleName(on ? BOX.newOn : BOX.newOff, {timeout: T});
    }

    /** Press a box and wait for its save (`saveDisplayFlags`); returns the answer. */
    async pressBox(box) {
        const saved = this.page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T});
        await box.click();
        const response = await saved;
        expect(response.status(), 'the box press is saved').toBe(200);
        return response;
    }

    async pressFeatured(title) {
        return this.pressBox(this.featuredBox(title));
    }

    async pressNewRelease(title) {
        return this.pressBox(this.newReleaseBox(title));
    }

    /** The top-right notices (`.app__notifications`), where a message would show. */
    notices() {
        return this.page.locator('.app__notifications');
    }

    /** Any notice with words in it (none: `toHaveCount(0)`, whether or not the area is drawn). */
    noticeTexts() {
        return this.notices().locator('*').filter({hasText: /\S/});
    }

    // --- the header's controls ---------------------------------------------

    searchBox() {
        return this.panel().locator('input.pkpSearch__input');
    }

    clearSearchButton() {
        return this.panel().getByRole('button', {name: 'Clear search phrase'});
    }

    /** Type words in "Search" and press Enter; waits for the list's fetch. */
    async search(text) {
        await this.searchBox().fill(text);
        const got = this.page.waitForResponse(isListGet, {timeout: T});
        await this.searchBox().press('Enter');
        await got;
    }

    /** Press the search box's cross; waits for the list's fetch. */
    async clearSearch() {
        const got = this.page.waitForResponse(isListGet, {timeout: T});
        await this.clearSearchButton().click();
        await got;
    }

    filtersButton() {
        return this.panel().getByRole('button', {name: 'Filters', exact: true});
    }

    orderFeaturesButton() {
        return this.panel().getByRole('button', {name: 'Order Features', exact: true});
    }

    saveOrderButton() {
        return this.panel().getByRole('button', {name: 'Save Order', exact: true});
    }

    cancelOrderButton() {
        return this.panel().getByRole('button', {name: 'Cancel', exact: true});
    }

    addEntryButton() {
        return this.panel().getByRole('button', {name: 'Add Entry', exact: true});
    }

    // --- "Filters" ------------------------------------------------------------

    /** The column's heading ("Filters"). */
    filtersColumnHeading() {
        return this.panel().locator('.listPanel__sidebar h3');
    }

    /** A group of the column by its heading ("Categories", "Series"). */
    filterGroup(name) {
        return this.panel().locator('.listPanel__block').filter({has: this.page.locator('h4', {hasText: whole(name)})});
    }

    /** The entries of a group, in order (for `toHaveText([...])`). */
    filterEntries(name) {
        return this.filterGroup(name).locator('button.pkpFilter__label');
    }

    filterEntry(name) {
        return this.panel().locator('button.pkpFilter__label').filter({hasText: whole(name)});
    }

    /** The cross of the chosen filter. */
    clearFilterButton(name) {
        return this.panel().getByRole('button', {name: `Clear filter: ${name}`, exact: true});
    }

    /** Open the column (when closed). */
    async openFilters() {
        if (!(await this.filtersColumnHeading().isVisible())) {
            await this.filtersButton().click();
        }
        await expect(this.filtersColumnHeading()).toBeVisible({timeout: T});
    }

    /** Press "Filters" to close the open column. */
    async closeFilters() {
        await this.filtersButton().click();
        await expect(this.filtersColumnHeading()).toBeHidden({timeout: T});
    }

    /** Press a category or series in the column; waits for the list's fetch. */
    async chooseFilter(name) {
        await this.openFilters();
        const got = this.page.waitForResponse(isListGet, {timeout: T});
        await this.filterEntry(name).click();
        await got;
    }

    /** Press the chosen filter's cross; waits for the list's fetch. */
    async clearFilter(name) {
        const got = this.page.waitForResponse(isListGet, {timeout: T});
        await this.clearFilterButton(name).click();
        await got;
    }

    // --- ordering (Rule 10) ---------------------------------------------------

    /** The notice shown while ordering. */
    orderingNotice() {
        return this.panel().locator('.pkpNotification');
    }

    async startOrdering() {
        await this.orderFeaturesButton().click();
        await expect(this.saveOrderButton()).toBeVisible({timeout: T});
    }

    upArrow(title) {
        return this.row(title).locator('button.orderer__up');
    }

    downArrow(title) {
        return this.row(title).locator('button.orderer__down');
    }

    /** "Save Order": waits for `saveFeaturedOrder` and the end of ordering. */
    async saveOrder() {
        const saved = this.page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T});
        await this.saveOrderButton().click();
        const response = await saved;
        expect(response.status(), 'the order is saved').toBe(200);
        await expect(this.orderFeaturesButton()).toBeVisible({timeout: T});
        return response;
    }

    /** "Cancel": the list is fetched again and ordering ends. */
    async cancelOrdering() {
        const got = this.page.waitForResponse(isListGet, {timeout: T});
        await this.cancelOrderButton().click();
        await got;
        await expect(this.orderFeaturesButton()).toBeVisible({timeout: T});
    }

    /** Open the "Add Entry" panel. */
    async openAddEntry() {
        await this.addEntryButton().click();
        const panel = new AddEntryPanel(this.page);
        await expect(panel.findBox()).toBeVisible({timeout: T});
        return panel;
    }
}

// ---------------------------------------------------------------------------
// The "Add Entry" panel
// ---------------------------------------------------------------------------

class AddEntryPanel extends BasePage {
    root() {
        return this.page.getByRole('dialog', {name: 'Add Entry'});
    }

    heading() {
        return this.root().getByRole('heading', {name: 'Add Entry', exact: true});
    }

    closeButton() {
        return this.root().getByRole('button', {name: 'Close', exact: true});
    }

    findBox() {
        return this.root().getByRole('combobox', {name: 'Find monographs to add to the catalog'});
    }

    /** The suggestions. */
    options() {
        return this.root().getByRole('option');
    }

    option(title) {
        return this.root().getByRole('option', {name: title, exact: true});
    }

    /** A chosen book's cross ("Remove {title}"). */
    removeButton(title) {
        return this.root().getByRole('button', {name: `Remove ${title}`, exact: true});
    }

    saveButton() {
        return this.root().getByRole('button', {name: 'Save', exact: true});
    }

    /**
     * Type in the box (it suggests only after typing); waits for the
     * suggestions' fetch and returns its answer.
     */
    async type(text) {
        const box = this.findBox();
        await box.click();
        await box.fill('');
        // Each keystroke may fetch; wait for the answer to the whole phrase.
        const got = this.page.waitForResponse(
            (r) =>
                /\/api\/v1\/submissions\?/.test(r.url()) &&
                r.request().method() === 'GET' &&
                new URL(r.url()).searchParams.get('searchPhrase') === text,
            {timeout: T}
        );
        await box.pressSequentially(text);
        return got;
    }

    /** Type, then click the book's suggestion; waits for its tag. */
    async choose(text, title) {
        await this.type(text);
        await this.option(title).click();
        await expect(this.removeButton(title)).toBeVisible({timeout: T});
    }

    /**
     * Press "Save": waits for `addToCatalog` and the list's reload; returns
     * the answer. Only after a chosen book's tag shows (a "Save" with
     * suggestions open would choose the first one, spec A8).
     */
    async save() {
        const added = this.page.waitForResponse((r) => /addToCatalog/.test(r.url()), {timeout: T});
        const reloaded = this.page.waitForResponse(isListGet, {timeout: T});
        await this.saveButton().click();
        const response = await added;
        expect(response.status(), 'the books are added').toBe(200);
        await reloaded;
        return response;
    }

    async close() {
        await this.closeButton().click();
        await expect(this.root()).toHaveCount(0, {timeout: T});
    }
}

// ---------------------------------------------------------------------------
// A version's "Catalog Entry" page
// ---------------------------------------------------------------------------

class CatalogEntryPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.workflow = new WorkflowPage(page, contextPath);
    }

    /** From an open workflow: "Publication" › the version › "Catalog Entry". */
    async openFromWorkflow() {
        const entry = await this.workflow.revealPublicationEntry('Catalog Entry');
        await entry.click();
        await this.expectOpen();
    }

    /** The page's heading and its form are up. */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.urlPathBox()).toBeVisible({timeout: T});
    }

    /** Reload the page (the address keeps the workflow's page key). */
    async reload() {
        await this.page.reload();
        await this.expectOpen();
    }

    heading() {
        return this.page.getByRole('heading', {name: 'Publication: Catalog Entry'});
    }

    form() {
        return this.page.locator('form').filter({has: this.page.locator('input[name="urlPath"]')}).first();
    }

    /** A group by its name ("Placement", "Display", …). */
    group(name) {
        return this.form().getByRole('group', {name, exact: true});
    }

    /** The groups' names, top to bottom. */
    async groupNames() {
        return this.form()
            .locator('.pkpFormGroup[role="group"]')
            .evaluateAll((groups) =>
                groups.map((g) => {
                    const label = document.getElementById(g.getAttribute('aria-labelledby') || '');
                    return (label ? label.textContent : '').replace(/\s+/g, ' ').trim();
                })
            );
    }

    seriesSelect() {
        return this.form().locator('select[name="seriesId"]');
    }

    seriesOptions() {
        return this.seriesSelect().locator('option');
    }

    seriesPositionBox() {
        return this.form().locator('input[name="seriesPosition"]');
    }

    urlPathBox() {
        return this.form().locator('input[name="urlPath"]');
    }

    // --- "Cover Image" ---------------------------------------------------------

    coverGroup() {
        return this.group('Display');
    }

    /** The box's preview ("Preview of the currently selected image."; the drop zone keeps its own thumbnail beside it). */
    coverPreview() {
        return this.coverGroup().locator('img.pkpFormField--uploadImage__thumbnail');
    }

    altTextBox() {
        return this.coverGroup().getByRole('textbox', {name: /Alternate text/i}).first();
    }

    uploadFileButton() {
        return this.coverGroup().getByRole('button', {name: 'Upload File', exact: true});
    }

    removeCoverButton() {
        return this.coverGroup().getByRole('button', {name: /^Remove/}).first();
    }

    restoreOriginalButton() {
        return this.coverGroup().getByRole('button', {name: 'Restore Original', exact: true});
    }

    /** Upload an image into the box (its file input); waits for the temporary file. */
    async uploadCover(filePath) {
        const uploaded = this.page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: T});
        await this.form().locator('input[type="file"]').first().setInputFiles(filePath);
        const response = await uploaded;
        expect(response.ok(), 'the image is uploaded').toBe(true);
        await expect(this.coverPreview()).toBeVisible({timeout: T});
    }

    // --- "Save" -----------------------------------------------------------------

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    footer() {
        return this.form().locator('.pkpFormPage__footer');
    }

    /** The footer's "Saving" / "Saved" line. */
    status(text) {
        return this.form().locator('.pkpFormPage__status', {hasText: text});
    }

    /**
     * Press "Save" and wait for the publication's write; resolves with the
     * answer and whether "Saving" was seen. On a 200 it also waits for
     * "Saved".
     */
    async save() {
        const written = this.page.waitForResponse(
            (r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        const saving = this.status('Saving')
            .first()
            .waitFor({state: 'visible', timeout: 10_000})
            .then(() => true)
            .catch(() => false);
        await this.saveButton().click();
        const response = await written;
        const sawSaving = await saving;
        if (response.status() === 200) {
            await expect(this.status('Saved').first()).toBeVisible({timeout: T});
        }
        return {response, sawSaving};
    }

    /** The top-right notice area a refused save writes into. */
    notices() {
        return this.page.locator('.app__notifications');
    }
}

// ---------------------------------------------------------------------------
// What a visitor reads
// ---------------------------------------------------------------------------

class PublicCatalog extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page a visitor's page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    async gotoCatalog() {
        await this.page.goto(this.contextUrl(this.contextPath, '/catalog'));
        await expect(this.page.locator('.page_catalog')).toBeVisible({timeout: T});
    }

    async gotoNewReleases() {
        await this.page.goto(this.contextUrl(this.contextPath, '/catalog/newReleases'));
        await expect(this.page.locator('.page_catalog_new_releases')).toBeVisible({timeout: T});
    }

    async gotoSeries(path) {
        await this.page.goto(this.contextUrl(this.contextPath, `/catalog/series/${path}`));
        await expect(this.page.locator('.page_catalog_series')).toBeVisible({timeout: T});
    }

    /** A book's page by an address (the row's "View Entry" href). */
    async gotoBook(address) {
        await this.page.goto(address);
        await expect(this.bookTitle()).toBeVisible({timeout: T});
    }

    /** The count line under the heading ("3 Titles"). */
    count() {
        return this.page.locator('.monograph_count').first();
    }

    summaries() {
        return this.page.locator('.obj_monograph_summary');
    }

    /** Every listed title, top to bottom (the catalog and "New Releases" hold one list). */
    titles() {
        return this.summaries().locator('.title');
    }

    summary(title) {
        return this.summaries().filter({has: this.page.locator('.title', {hasText: whole(title)})});
    }

    /** A series page's "All Books" list's titles, top to bottom. */
    allBooksTitles() {
        return this.page
            .locator('.cmp_monographs_list')
            .filter({has: this.page.locator('.title', {hasText: whole('All Books')})})
            .locator('.obj_monograph_summary .title');
    }

    /** The series position printed above a listed book's title. */
    seriesPosition(title) {
        return this.summary(title).locator('.seriesPosition');
    }

    summaryCover(title) {
        return this.summary(title).locator('.cover img');
    }

    bookRoot() {
        return this.page.locator('.obj_monograph_full');
    }

    bookTitle() {
        return this.bookRoot().locator('h1.title');
    }

    bookCover() {
        return this.bookRoot().locator('.item.cover img');
    }

    /** A loaded picture's address and natural size (polls until it has loaded). */
    async picture(locator) {
        let info = null;
        await expect
            .poll(
                async () => {
                    info = await locator.evaluate((el) => {
                        const img = /** @type {HTMLImageElement} */ (el);
                        return {src: img.getAttribute('src') || '', complete: img.complete, width: img.naturalWidth, height: img.naturalHeight};
                    });
                    return info.complete && info.width > 0;
                },
                {timeout: T}
            )
            .toBe(true);
        return info;
    }
}

// ---------------------------------------------------------------------------
// The workflow's "Publish"
// ---------------------------------------------------------------------------

/**
 * On an open publication page, press the workflow's "Publish" and confirm it
 * in the "Schedule For Publication" window; waits for the publish and for
 * "Unpublish" in its place.
 *
 * @param {import('@playwright/test').Page} page
 */
async function publishFromWorkflow(page) {
    const controls = page.locator('[data-cy="workflow-controls-right"]');
    await controls.getByRole('button', {name: 'Publish', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(dialog).toBeVisible({timeout: T});
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T});
    await dialog.getByRole('button', {name: 'Publish', exact: true}).click();
    const response = await published;
    expect(response.status(), 'the book is published').toBe(200);
    await expect(controls.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: T});
}

module.exports = {
    BOX,
    CatalogPage,
    AddEntryPanel,
    CatalogEntryPage,
    PublicCatalog,
    publishFromWorkflow,
};
