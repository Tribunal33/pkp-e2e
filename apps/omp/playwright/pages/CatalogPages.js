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
 *   series position above a title, the cover picture and its size); for
 *   U68 "Catalog browse" also the home page's lists, the header's
 *   "Catalog", the page heading, trail, count and empty-list lines, a
 *   summary's parts and where its links lead, the rows the summaries stand
 *   in, the page links, the catalog's "Series:" line, the sidebar's
 *   "Browse" block and the Login page a closed press answers (DOM facts
 *   from .reports/U68/screen-notes.md, 2026-09-27: the frontend has no main
 *   landmark and a series' heading is empty, spec A3, so these read by CSS).
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

/** A trail's words as a whole-text matcher: `trailText('Home', 'Catalog')` reads "Home / Catalog". */
function trailText(...steps) {
    return new RegExp(`^\\s*${steps.map(esc).join('\\s*/\\s*')}\\s*$`);
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

    /** A page of the catalog past the first (`catalog/page/{n}`). */
    async gotoCatalogPage(n) {
        await this.page.goto(this.contextUrl(this.contextPath, `/catalog/page/${n}`));
        await expect(this.page.locator('.page_catalog')).toBeVisible({timeout: T});
    }

    /** A series' page, or its page `n` (`catalog/series/{path}/{n}`). */
    async gotoSeries(path, n = null) {
        await this.page.goto(this.contextUrl(this.contextPath, `/catalog/series/${path}${n ? `/${n}` : ''}`));
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

    // --- U68 "Catalog browse": the reader pages ---------------------------------

    /**
     * Open an address of the press (`/catalog/page/2`, `/catalog/series/x`)
     * without assuming which page answers (a closed press answers its Login
     * page, an unknown series the catalog); waits for the public header.
     */
    async open(pathname = '') {
        const response = await this.page.goto(this.contextUrl(this.contextPath, pathname));
        await expect(this.page.locator('header.pkp_structure_head')).toBeVisible({timeout: T});
        return response;
    }

    /** The press's home page. */
    async gotoHome() {
        await this.open('');
    }

    /** The header's "Catalog" (the primary menu's top-level link). */
    headerCatalogLink() {
        return this.page.locator('#navigationPrimary > li > a').filter({hasText: whole('Catalog')});
    }

    /**
     * Press the header's "Catalog" and wait for the catalog page. Below 992
     * pixels the theme folds the menu behind "Open Menu" (its CSS, settled
     * at load), which is pressed first.
     */
    async pressHeaderCatalog() {
        const toggle = this.page.locator('button.pkp_site_nav_toggle');
        if (await toggle.isVisible()) {
            await toggle.click();
        }
        await expect(this.headerCatalogLink()).toBeVisible({timeout: T});
        await this.headerCatalogLink().click();
        await expect(this.page.locator('.page_catalog')).toBeVisible({timeout: T});
    }

    /** Which reader page is up: the catalog, a series' page, "New Releases". */
    catalogPageRoot() {
        return this.page.locator('.page_catalog');
    }

    seriesPageRoot() {
        return this.page.locator('.page_catalog_series');
    }

    newReleasesPageRoot() {
        return this.page.locator('.page_catalog_new_releases');
    }

    /** The page's heading (`h1` of the page body; a series' page's is empty, spec A3). */
    pageHeading() {
        return this.page.locator('.pkp_structure_main .page > h1').first();
    }

    /** The trail (`nav.cmp_breadcrumbs`); read with `toHaveText(trailText(...))`. */
    trail() {
        return this.page.locator('.pkp_structure_main nav.cmp_breadcrumbs');
    }

    /** The heading and message standing in for an empty list ("All Books", "No titles…"). */
    emptyHeading() {
        return this.page.locator('.pkp_structure_main .page > h2');
    }

    emptyMessage() {
        return this.page.locator('.pkp_structure_main .page > p');
    }

    /** Any message or notice drawn on the page (none on a redirect, spec Rule 2). */
    messages() {
        return this.page.locator('.pkp_notification:visible, .cmp_notification:visible, [role="alert"]:visible');
    }

    /** A list of summaries by its heading ("New Releases", "All Books", "Featured"). */
    list(heading) {
        return this.page.locator('.cmp_monographs_list').filter({has: this.page.locator('h2.title, h3.title').filter({hasText: whole(heading)})});
    }

    /** The one list of the catalog and "New Releases" pages (no heading). */
    mainList() {
        return this.page.locator('.pkp_structure_main .page > .cmp_monographs_list').first();
    }

    /** The titles of a list's summaries, top to bottom. */
    listTitles(list) {
        return list.locator('.obj_monograph_summary .title');
    }

    /** A summary's cover link, title link, author line and date. */
    summaryCoverLink(title) {
        return this.summary(title).locator('a.cover');
    }

    summaryTitleLink(title) {
        return this.summary(title).locator('.title a');
    }

    summaryAuthor(title) {
        return this.summary(title).locator('.author');
    }

    summaryDate(title) {
        return this.summary(title).locator('.date');
    }

    /**
     * A summary's parts in the order they stand on screen, top to bottom
     * (`cover`, `seriesPosition`, `title`, `author`, `date`), read once its
     * pictures have loaded.
     */
    async summaryPartsTopToBottom(title) {
        const summary = this.summary(title).first();
        let parts = null;
        await expect
            .poll(
                async () => {
                    parts = await summary.evaluate((s) => {
                        if ([...s.querySelectorAll('img')].some((i) => !i.complete)) return null;
                        const names = {cover: 'a.cover', seriesPosition: '.seriesPosition', title: '.title', author: '.author', date: '.date'};
                        return Object.entries(names)
                            .map(([name, sel]) => {
                                const el = s.querySelector(sel);
                                return el ? {name, y: el.getBoundingClientRect().top} : null;
                            })
                            .filter(Boolean)
                            .sort((a, b) => a.y - b.y)
                            .map((p) => p.name);
                    });
                    return parts !== null;
                },
                {timeout: T}
            )
            .toBe(true);
        return parts;
    }

    /**
     * A list's summaries grouped into the rows they stand in, top to bottom:
     * each row a list of `{title, whole}`, `whole` when the summary is at
     * least nine tenths of the list's width. Read once every picture in the
     * list has loaded (a late picture moves the rows).
     */
    async layoutRows(list) {
        let rows = null;
        await expect
            .poll(
                async () => {
                    rows = await list.evaluate((l) => {
                        if ([...l.querySelectorAll('img')].some((i) => !i.complete)) return null;
                        const width = l.getBoundingClientRect().width;
                        const grouped = [];
                        for (const s of l.querySelectorAll('.obj_monograph_summary')) {
                            const box = s.getBoundingClientRect();
                            const t = s.querySelector('.title');
                            const item = {title: (t ? t.textContent : '').replace(/\s+/g, ' ').trim(), whole: box.width >= width * 0.9, y: Math.round(box.top)};
                            const row = grouped.find((r) => Math.abs(r.y - item.y) <= 2);
                            if (row) row.items.push(item);
                            else grouped.push({y: item.y, items: [item]});
                        }
                        grouped.sort((a, b) => a.y - b.y);
                        return grouped.map((r) => r.items.map(({title, whole}) => ({title, whole})));
                    });
                    return rows !== null;
                },
                {timeout: T}
            )
            .toBe(true);
        return rows;
    }

    // --- page links ------------------------------------------------------------

    pageLinks() {
        return this.page.locator('.cmp_pagination');
    }

    previousLink() {
        return this.pageLinks().locator('a.prev');
    }

    nextLink() {
        return this.pageLinks().locator('a.next');
    }

    /** "{start}-{end} of {total}". */
    pageSpan() {
        return this.pageLinks().locator('.current');
    }

    // --- the catalog's "Series:" line -------------------------------------------

    seriesNav() {
        return this.page.locator('nav.pkp_series_nav_menu');
    }

    seriesNavLinks() {
        return this.seriesNav().locator('li a');
    }

    seriesNavLink(name) {
        return this.seriesNav().getByRole('link', {name, exact: true});
    }

    // --- the sidebar's "Browse" block -------------------------------------------

    browseBlock() {
        return this.page.locator('.pkp_structure_sidebar .block_browse');
    }

    /** The block's heading ("Browse"). */
    browseBlockHeading() {
        return this.browseBlock().locator(':scope > .title');
    }

    /**
     * The block's lines, top to bottom, as read: a link's words ("New
     * Releases") or a line's own words ("Categories", "Series"), without
     * the links under it.
     */
    async browseBlockLines() {
        const lines = this.browseBlock().locator('nav > ul > li');
        await expect(this.browseBlock()).toBeVisible({timeout: T});
        return lines.evaluateAll((lis) =>
            lis.map((li) => {
                const clone = li.cloneNode(true);
                clone.querySelectorAll('ul').forEach((u) => u.remove());
                return clone.textContent.replace(/\s+/g, ' ').trim();
            })
        );
    }

    browseNewReleasesLink() {
        return this.browseBlock().locator('nav > ul > li > a').filter({hasText: whole('New Releases')});
    }

    /** The series links under the block's "Series" line. */
    browseSeriesLinks() {
        return this.browseBlock().locator('li[class^="series_"] > a');
    }

    browseSeriesLink(name) {
        return this.browseSeriesLinks().filter({hasText: whole(name)});
    }

    // --- a closed press ------------------------------------------------------

    /** The Login page's form (what a closed press answers a signed-out visitor). */
    loginForm() {
        return this.page.locator('form#login');
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
    trailText,
};
