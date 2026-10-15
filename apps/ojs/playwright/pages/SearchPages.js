// @ts-check
/**
 * @file playwright/pages/SearchPages.js
 *
 * OJS-local Page Object for the Search feature (spec:
 * docs/specs/U15-search.md): the reader-facing Search page inside a
 * journal and the same page opened at the site level, plus the one
 * journal setting a Search scenario drives (Settings › Distribution ›
 * Access › "Publishing Mode", scenario 9).
 *
 * DOM facts the locators rely on (ojs/templates/frontend/pages/search.tpl,
 * frontend/objects/article_summary.tpl, PKPTemplateManager::smartyPageLinks,
 * confirmed live 2026-09-02):
 * - the page is `.page_search` with an `h1` "Search" and one
 *   `form.cmp_form` (GET to the page's own address): box `input#query`
 *   (label "Search articles for", shown above it since pkp/ojs#5832; no placeholder), fieldset
 *   `.search_advanced` (legend "Advanced filters") holding the two date
 *   legends "Published After" / "Published Before" with selects
 *   `#dateFromYear/#dateFromMonth/#dateFromDay` and `#dateTo…` (each with a
 *   leading blank option; Month labels "Jan"…"Dec"), the site-level-only
 *   `select#searchContext` ("By Journal"), and `button.submit` "Search";
 * - results are `ul.search_results > li`, each an `.obj_article_summary`
 *   with `.title a` (the landing-page link; outside a journal the link
 *   carries the journal's name in `span.subtitle`), `.meta .authors`,
 *   `.meta .published` and never a `.galleys_links` list (hideGalleys);
 * - one or more hits: a screen-reader-only `div.pkp_screen_reader[role=status]`
 *   above the list ("Found one item." with one hit; the plural is OJS1's
 *   raw code, never asserted), read from the element's text, not on screen;
 * - nothing found: a `span[role=status]` wrapping `.cmp_notification`
 *   "No Results" and no `.cmp_pagination`;
 * - paging: `.cmp_pagination` with the "{from} - {to} of {total} items"
 *   text, page-number links as `a`, the current page as `strong`, and the
 *   "<<", "<", ">", ">>" links.
 * - the journal's header carries one "Search" link (`header a`), absent on
 *   the Search page itself and on the site's own pages.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {waitForContextSettingsSave} = require('./PublicationMetadataPages.js');

/** The Publishing Mode radio labels, verbatim (Settings › Distribution › Access). */
const PUBLISHING_MODE_LABELS = {
    open: 'The journal will provide open access to its contents.',
    subscription: 'The journal will require subscriptions to access some or all of its contents.',
    none: "OJS will not be used to publish the journal's contents online.",
};

/** The sentence a signed-in non-staff user gets on a journal that does not publish online (Rule 13). */
const DOES_NOT_PUBLISH_TEXT = 'This journal does not publish its content online.';

exports.SearchPage = class SearchPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string|null} contextPath the journal's path, or null for the
     *   site-wide page (Rule 10)
     */
    constructor(page, contextPath = null) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The page's address (`{journal}/search`, or `index/search` site-wide). */
    url() {
        return this.contextPath
            ? this.contextUrl(this.contextPath, '/search')
            : this.siteUrl('/search');
    }

    /** Open the page by address and wait for its heading. */
    async goto() {
        await this.page.goto(this.url());
        await this.expectOpen();
    }

    /** Open the journal's home page (the header link's usual starting point). */
    async gotoJournalHome() {
        if (!this.contextPath) {
            throw new Error('gotoJournalHome needs a journal path');
        }
        await this.page.goto(this.contextUrl(this.contextPath, ''));
    }

    /** The header's "Search" link (Rule 1). */
    headerSearchLink() {
        return this.page.locator('header').getByRole('link', {name: 'Search', exact: true});
    }

    /** Press the header's "Search" link and wait for the page. */
    async openFromHeader() {
        await this.headerSearchLink().click();
        await this.expectOpen();
    }

    heading() {
        return this.page.getByRole('heading', {name: 'Search', exact: true, level: 1});
    }

    /** The Search page is showing: its heading and its box. */
    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
        await expect(this.queryBox()).toBeVisible();
    }

    form() {
        return this.page.locator('.page_search form.cmp_form');
    }

    queryBox() {
        return this.page.locator('input#query');
    }

    /**
     * The form's "Search" button. Anchored on the template's own
     * `button.submit` because its accessible name carries a trailing
     * non-breaking space ("Search "), which an exact role match misses.
     */
    searchButton() {
        return this.form().locator('button.submit[type="submit"]');
    }

    advancedFilters() {
        return this.page.locator('fieldset.search_advanced');
    }

    /**
     * Press "Search" with the form as it stands and wait for the new page
     * (the form GETs the same address, so the wait is on the next load
     * event, armed before the press, never on the URL).
     */
    async submit() {
        const loaded = this.page.waitForEvent('load');
        await this.searchButton().click();
        await loaded;
        await this.expectOpen();
    }

    /** Type words into the box and press "Search". */
    async search(words) {
        await this.queryBox().fill(words);
        await this.submit();
    }

    // ---------------------------------------------------------------------
    // Date filters (Rule 9)
    // ---------------------------------------------------------------------

    /**
     * One of the six date selects.
     *
     * @param {'dateFrom'|'dateTo'} prefix "Published After" / "Published Before"
     * @param {'Year'|'Month'|'Day'} part
     */
    dateSelect(prefix, part) {
        return this.page.locator(`select#${prefix}${part}`);
    }

    /**
     * Choose the given parts of a date filter; a part left out is not
     * touched (scenario 7's Month-and-Day-without-a-Year step leaves Year
     * blank). Labels as shown: year "2024", month "Jun", day "10" (Day is
     * not zero-padded).
     *
     * @param {'dateFrom'|'dateTo'} prefix
     * @param {{year?: string, month?: string, day?: string}} date
     */
    async setDate(prefix, {year, month, day}) {
        if (year !== undefined) {
            await this.dateSelect(prefix, 'Year').selectOption({label: year});
        }
        if (month !== undefined) {
            await this.dateSelect(prefix, 'Month').selectOption({label: month});
        }
        if (day !== undefined) {
            await this.dateSelect(prefix, 'Day').selectOption({label: day});
        }
    }

    /** Put a date filter's three selects back to their blank entries. */
    async clearDate(prefix) {
        for (const part of ['Year', 'Month', 'Day']) {
            await this.dateSelect(prefix, part).selectOption('');
        }
    }

    /** Assert what a date filter's three selects show. */
    async expectDate(prefix, {year, month, day}) {
        await expect(this.dateSelect(prefix, 'Year').locator('option:checked')).toHaveText(year);
        await expect(this.dateSelect(prefix, 'Month').locator('option:checked')).toHaveText(month);
        await expect(this.dateSelect(prefix, 'Day').locator('option:checked')).toHaveText(day);
    }

    /** Assert a date filter's three selects all show their blank entry. */
    async expectDateBlank(prefix) {
        for (const part of ['Year', 'Month', 'Day']) {
            await expect(this.dateSelect(prefix, part)).toHaveValue('');
        }
    }

    /** A date filter's Year list entries (the leading blank one included). */
    yearOptions(prefix) {
        return this.dateSelect(prefix, 'Year').locator('option');
    }

    /**
     * The Year list offers only blank entries (a journal on which no
     * publication date has ever been entered, Rule 9): every option's value
     * is empty, and there is at least one.
     */
    async expectYearListBlank(prefix) {
        const values = await this.yearOptions(prefix).evaluateAll((options) =>
            options.map((option) => option.value)
        );
        expect(values.length).toBeGreaterThan(0);
        expect(values.every((value) => value === '')).toBe(true);
    }

    /** The site-wide page's "By Journal" select (Rule 10). */
    byJournalSelect() {
        return this.page.locator('select#searchContext');
    }

    // ---------------------------------------------------------------------
    // Results (Rules 6–8)
    // ---------------------------------------------------------------------

    results() {
        return this.page.locator('ul.search_results > li');
    }

    /** The result whose title link carries the given text. */
    resultByTitle(title) {
        return this.results().filter({has: this.page.locator('.title a', {hasText: title})});
    }

    /** A result's title link (opens the landing page). */
    titleLink(result) {
        return result.locator('.title a');
    }

    /**
     * The status line above the results that only a screen reader shows
     * (Rule 7): "Found one item." with one hit. Read its text; it is never
     * visible.
     */
    statusLine() {
        return this.page.locator('.page_search div[role="status"].pkp_screen_reader');
    }

    /** The "No Results" notice (nothing found). */
    noResultsNotice() {
        return this.page.locator('.page_search .cmp_notification').filter({hasText: 'No Results'});
    }

    /** Nothing was found: empty list and the notice. */
    async expectNoResults() {
        await expect(this.noResultsNotice()).toBeVisible();
        await expect(this.results()).toHaveCount(0);
    }

    /** Exactly one result, carrying the given title. */
    async expectOnlyResult(title) {
        await expect(this.results()).toHaveCount(1);
        await expect(this.titleLink(this.results().first())).toContainText(title);
        return this.results().first();
    }

    /** The paging block under the list ("{from} - {to} of {total} items" plus links). */
    pagination() {
        return this.page.locator('.page_search .cmp_pagination');
    }

    /** Every page link under the list (none on a single page). */
    pageLinks() {
        return this.pagination().getByRole('link');
    }

    /** A page link by its text ("2", ">", ">>", "<<", "<", "1"). */
    pageLink(label) {
        return this.pagination().getByRole('link', {name: label, exact: true});
    }

    /** The current page's number (plain text among the links). */
    currentPageNumber() {
        return this.pagination().locator('strong');
    }

    /** Follow a page link and wait for the new page. */
    async goToPage(label) {
        const loaded = this.page.waitForEvent('load');
        await this.pageLink(label).click();
        await loaded;
        await this.expectOpen();
    }

    /** Follow a result's title to the landing page and wait for its heading. */
    async openResult(result, expectedTitle) {
        await this.titleLink(result).click();
        await expect(this.page.getByRole('heading', {level: 1})).toContainText(expectedTitle, {
            timeout: 30_000,
        });
    }
};

/**
 * Set the journal's Publishing Mode through Settings › Distribution ›
 * Access and wait for the save (Rule 13, scenario 9). Signed in as the
 * journal's manager.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {'open'|'subscription'|'none'} mode
 */
exports.setPublishingMode = async function setPublishingMode(page, contextPath, mode) {
    await page.goto(`/index.php/${contextPath}/management/settings/distribution`);
    await page.getByRole('tab', {name: 'Access', exact: true}).click();
    const radio = page.getByRole('radio', {name: PUBLISHING_MODE_LABELS[mode], exact: true});
    await expect(radio).toBeVisible({timeout: 30_000});
    await radio.check();
    const form = page.locator('form').filter({has: page.locator('input[name="publishingMode"]')});
    const saved = waitForContextSettingsSave(page);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await expect(form.locator('[role="status"]:has-text("Saved")')).toBeVisible({timeout: 30_000});
};

exports.PUBLISHING_MODE_LABELS = PUBLISHING_MODE_LABELS;
exports.DOES_NOT_PUBLISH_TEXT = DOES_NOT_PUBLISH_TEXT;
