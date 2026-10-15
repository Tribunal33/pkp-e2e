// @ts-check
/**
 * @file playwright/pages/SearchPages.js
 *
 * OPS-local page objects for the Search feature (spec:
 * docs/specs/U15-search.md). App-local by design (PRINCIPLES M1): the
 * OJS/OPS Search page templates are copies, but the server's vocabulary
 * (hidden label "Search preprints for", the "Downloads: … - Submitted … -
 * Posted …" date line, the archive header's "Preprint Search" form) is its
 * own.
 *
 * Surfaces:
 * - SearchPage — the page headed "Search" inside a server
 *   (`ops/templates/frontend/pages/search.tpl`): the header's "Search" link
 *   (`lib/pkp/templates/frontend/components/header.tpl`,
 *   `.pkp_navigation_search_wrapper`), the box `input#query` with its
 *   sr-only label, the "Advanced filters" date selects
 *   (`PKPTemplateManager::smartyHtmlSelectDateA11y()`: `#dateFromYear`,
 *   `#dateFromMonth`, `#dateFromDay`, `#dateTo…`, each with a leading blank
 *   option), the "Search" button, the results `ul.search_results > li`
 *   (each a `frontend/objects/preprint_summary.tpl` block: `.title a`,
 *   `.authors`, `.details`, no `.galleys_links` when hidden), the
 *   "No Results" notice (`.cmp_notification.notice`), the pagination
 *   (`.cmp_pagination`: `{page_info}` "{from} - {to} of {total} items" and
 *   `smartyPageLinks()` links "<<", "<", numbers, ">", ">>", the current
 *   page as a plain `<strong>`; no link at all on a single page) and the
 *   screen-reader-only status line above the results
 *   (`div.pkp_screen_reader[role=status]`, "Found one item." with one hit;
 *   with more, OPS1's wrong text, never asserted), read from the element's
 *   text, never on screen.
 * - ArchiveHeaderSearch — the archive header's search form on the server's
 *   home page and its Preprints page
 *   (`ops/templates/frontend/components/searchForm_archive.tpl`:
 *   `form.pkp_search[role=search][aria-label="Preprint Search"]`, a box read
 *   out as "Search Query", a "Search" button; it submits to the Search
 *   page).
 *
 * Labels are the live locale strings (ops + lib/pkp locale/en at the pinned
 * commits), confirmed against the running OPS fleet while this suite was
 * built (2026-09-02).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');

/**
 * Press a control that submits a plain HTML form (a GET to the Search page)
 * and wait for the resulting document to arrive. The page re-renders at the
 * same address, so the arrival is bounded by the navigation response itself
 * rather than a URL change.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} control
 */
async function submitAndArrive(page, control) {
    await Promise.all([
        page.waitForResponse(
            (r) => r.request().isNavigationRequest() && r.url().includes('/search'),
            {timeout: 30_000}
        ),
        control.click(),
    ]);
    await page.waitForLoadState('domcontentloaded');
}

exports.SearchPage = class SearchPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The Search page's address inside the server. */
    url() {
        return this.contextUrl(this.contextPath, '/search');
    }

    /** Open the Search page by address (a visitor typing the URL). */
    async goto() {
        await this.page.goto(this.url());
        await this.expectOpen();
    }

    /** The page is the Search page: its "Search" heading is shown. */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
    }

    /** The page's h1 "Search". */
    heading() {
        return this.page.locator('.page_search').getByRole('heading', {level: 1, name: 'Search', exact: true});
    }

    /** The header's "Search" link (site chrome; absent on the Search page itself). */
    headerSearchLink() {
        return this.page
            .locator('.pkp_navigation_search_wrapper')
            .getByRole('link', {name: 'Search', exact: true});
    }

    /** Press the header's "Search" link and land on the Search page. */
    async openFromHeader() {
        await this.headerSearchLink().click();
        await this.expectOpen();
    }

    /** The Search page's own form (box, Advanced filters, button). */
    form() {
        return this.page.locator('.page_search form.cmp_form');
    }

    /** The search box, by its label "Search preprints for" (shown since pkp/ops#1422; no placeholder). */
    queryBox() {
        return this.form().getByRole('textbox', {name: 'Search preprints for', exact: true});
    }

    /**
     * The "Search" button. The default theme appends a FontAwesome glyph to
     * it through CSS `content` (`search.less`, `cmp_button_icon`), and the
     * glyph joins the accessible name ("Search" + glyph), so the name is
     * matched on its leading word, not exactly; it is the form's only button.
     */
    searchButton() {
        return this.form().getByRole('button', {name: /^Search/});
    }

    /** Press "Search" with the box and filters as they stand. */
    async submit() {
        await submitAndArrive(this.page, this.searchButton());
        await this.expectOpen();
    }

    /** Type words into the box and press "Search". */
    async search(words) {
        await this.queryBox().fill(words);
        await this.submit();
    }

    // ---------------------------------------------------------------------
    // Results
    // ---------------------------------------------------------------------

    /** Every result on the page (one `li` per preprint summary). */
    results() {
        return this.page.locator('.page_search ul.search_results > li');
    }

    /** The result whose title reads exactly `title`. */
    result(title) {
        return this.results().filter({
            has: this.page.getByRole('heading', {name: title, exact: true}),
        });
    }

    /** The result's title link (opens the preprint's landing page). */
    resultTitleLink(title) {
        return this.result(title).getByRole('link', {name: title, exact: true});
    }

    /** The result's contributors line ("Given Family (Author)"). */
    resultAuthors(title) {
        return this.result(title).locator('.authors');
    }

    /** The result's date line ("Downloads: {n} - Submitted {date} - Posted {date}"). */
    resultDetails(title) {
        return this.result(title).locator('.details');
    }

    /** The result's galley links (none on the Search page). */
    resultGalleyLinks(title) {
        return this.result(title).locator('.galleys_links li');
    }

    /** The "No Results" notice shown when nothing matches. */
    noResultsNotice() {
        return this.page.locator('.page_search .cmp_notification.notice', {hasText: 'No Results'});
    }

    /**
     * The status line above the results that only a screen reader (or the
     * accessibility inspector) shows: "Found one item." with one hit
     * (Rule 7). Read its text; it is never visible.
     */
    statusLine() {
        return this.page.locator('.page_search div[role="status"].pkp_screen_reader');
    }

    /** Exactly one result, the one titled `title`; returns it. */
    async expectOnlyResult(title) {
        await expect(this.result(title)).toHaveCount(1, {timeout: 30_000});
        await expect(this.results()).toHaveCount(1);
        await expect(this.noResultsNotice()).toHaveCount(0);
        return this.result(title);
    }

    /** Nothing matched: the "No Results" notice, an empty list, no pagination. */
    async expectNoResults() {
        await expect(this.noResultsNotice()).toBeVisible({timeout: 30_000});
        await expect(this.results()).toHaveCount(0);
        await expect(this.pagination()).toHaveCount(0);
    }

    // ---------------------------------------------------------------------
    // Paging
    // ---------------------------------------------------------------------

    /** The block under the results: "{from} - {to} of {total} items" and the page links. */
    pagination() {
        return this.page.locator('.page_search .cmp_pagination');
    }

    /** Every page link under the list (none on a single page, Rule 8). */
    pageLinks() {
        return this.pagination().getByRole('link');
    }

    /** A page link by its exact text ("2", ">", ">>", "<<", "<", "1"). */
    pageLink(text) {
        return this.pagination().getByRole('link', {name: text, exact: true});
    }

    /** The current page's number, plain text among the links. */
    currentPageNumber(n) {
        return this.pagination().locator('strong', {hasText: new RegExp(`^\\s*${n}\\s*$`)});
    }

    /** Press a page link and wait for that page of results. */
    async gotoPage(text) {
        await submitAndArrive(this.page, this.pageLink(text));
        await this.expectOpen();
    }

    // ---------------------------------------------------------------------
    // Advanced filters: Published After ("dateFrom") / Published Before ("dateTo")
    // ---------------------------------------------------------------------

    /**
     * One of the three selects of a date filter.
     *
     * @param {'dateFrom'|'dateTo'} prefix "dateFrom" = Published After, "dateTo" = Published Before
     * @param {'Year'|'Month'|'Day'} part
     */
    dateSelect(prefix, part) {
        return this.form().locator(`#${prefix}${part}`);
    }

    /** The fieldset of a date filter, by its legend. */
    dateFieldset(legend) {
        return this.form().locator('fieldset').filter({
            has: this.page.locator('legend', {hasText: legend}),
        });
    }

    /**
     * Choose the given parts of a date filter, by their visible labels
     * ("2024", "Jun", "10"; Day is not zero-padded). A part left out is not
     * touched (scenario 7's Month-and-Day-without-a-Year step leaves Year
     * blank).
     *
     * @param {'dateFrom'|'dateTo'} prefix
     * @param {{year?: string|number, month?: string, day?: string|number}} date
     */
    async setDate(prefix, {year, month, day}) {
        if (year !== undefined) {
            await this.dateSelect(prefix, 'Year').selectOption({label: String(year)});
        }
        if (month !== undefined) {
            await this.dateSelect(prefix, 'Month').selectOption({label: month});
        }
        if (day !== undefined) {
            await this.dateSelect(prefix, 'Day').selectOption({label: String(day)});
        }
    }

    /** A date filter's Year list entries (the leading blank one included). */
    yearOptions(prefix) {
        return this.dateSelect(prefix, 'Year').locator('option');
    }

    /**
     * The Year list offers only blank entries (a server on which no
     * publication date has ever been entered, Rule 9): every entry's value
     * is empty, and there is at least one.
     */
    async expectYearListBlank(prefix) {
        const values = await this.yearOptions(prefix).evaluateAll((options) =>
            options.map((option) => /** @type {HTMLOptionElement} */ (option).value)
        );
        expect(values.length).toBeGreaterThan(0);
        expect(values.every((value) => value === '')).toBe(true);
    }

    /** Put the three selects of a date filter back on their blank entries. */
    async clearDate(prefix) {
        for (const part of /** @type {const} */ (['Year', 'Month', 'Day'])) {
            await this.dateSelect(prefix, part).selectOption({index: 0});
        }
    }

    /** The visible label of the chosen option of one select ("" when blank). */
    selectedLabel(prefix, part) {
        return this.dateSelect(prefix, part).locator('option:checked');
    }

    /** The three selects show the given labels. */
    async expectDate(prefix, {year, month, day}) {
        await expect(this.selectedLabel(prefix, 'Year')).toHaveText(String(year));
        await expect(this.selectedLabel(prefix, 'Month')).toHaveText(month);
        await expect(this.selectedLabel(prefix, 'Day')).toHaveText(String(day));
    }

    /** The three selects show their blank entries. */
    async expectDateBlank(prefix) {
        for (const part of /** @type {const} */ (['Year', 'Month', 'Day'])) {
            await expect(this.selectedLabel(prefix, part)).toHaveText(/^\s*$/);
        }
    }
};

exports.ArchiveHeaderSearch = class ArchiveHeaderSearch extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    homeUrl() {
        return this.contextUrl(this.contextPath, '');
    }

    preprintsUrl() {
        return this.contextUrl(this.contextPath, '/preprints');
    }

    /** Open the server's home page (its archive header on top). */
    async gotoHome() {
        await this.page.goto(this.homeUrl());
        await expect(this.form()).toBeVisible({timeout: 30_000});
    }

    /** Open the server's Preprints page (heading "Archives", the same header). */
    async gotoPreprints() {
        await this.page.goto(this.preprintsUrl());
        await expect(this.form()).toBeVisible({timeout: 30_000});
    }

    /** The archive header's search form, read out as "Preprint Search". */
    form() {
        return this.page
            .locator('.archiveHeader_search')
            .getByRole('search', {name: 'Preprint Search', exact: true});
    }

    /** The form's box, labelled "Search Query" (shown since pkp/ops#1422; no placeholder). */
    queryBox() {
        return this.form().getByRole('textbox', {name: 'Search Query', exact: true});
    }

    searchButton() {
        return this.form().getByRole('button', {name: 'Search', exact: true});
    }

    /** Type words into the archive box and press "Search"; lands on the Search page. */
    async search(words) {
        await this.queryBox().fill(words);
        await submitAndArrive(this.page, this.searchButton());
    }
};
