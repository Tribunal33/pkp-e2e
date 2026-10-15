// @ts-check
/**
 * @file playwright/pages/SearchPages.js
 *
 * The press's Search page (U15, OMP2): heading "Search", the results block
 * (count line "{N} Titles", the found / not-found sentence with its "Search
 * again" link, book summaries two to a row, "{from} - {to} of {total}
 * items" and the page links) and, at the FOOT of the page, one search box
 * (read out as "Search Query") and a "Search" button. No Advanced filters.
 * Spec: docs/specs/U15-search.md (Rules 1, 5–8; fn-b, fn-f, fn-g).
 *
 * Also the two publication controls scenario 5 drives on the workflow's
 * Title & Abstract page ("Unpublish" and "Publish" at the top right, each
 * with its confirm window), and scenario 12's "Decline Submission" on the
 * stage a published book is returned to (`declineFromStage`); the frame
 * around them is the shared WorkflowPage, whose `returnToWorkflow()` and
 * `deleteSubmission()` drive scenario 12's other two steps.
 *
 * DOM facts (confirmed live 2026-09-02, probes A/B/E and this suite):
 * - the form is `form.pkp_search[role=search]` labelled "Book Search",
 *   `input#query` is `type=search` labelled "Search Query" (a visible
 *   label since pkp/omp#2464; no placeholder), the button reads "Search"; the form follows the results
 *   in DOM order and carries the named anchor `search-form`;
 * - count line `.monograph_count`; the sentence sits in
 *   `.search_results[role=status]` together with the "Search again" link
 *   (`href="#search-form"`);
 * - each hit is `.obj_monograph_summary` (cover link `a.cover > img`, `h2`
 *   title link to `catalog/book/{id}`, `.author`, `.date`);
 * - paging is `.cmp_pagination`: `{page_info}` text plus links, the current
 *   page as `<strong>`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {walkDecisionWizard} = require('./ReviewStagePages.js');

/** The press's three result sentences, verbatim (locale.po catalog.*). */
const SENTENCES = {
    one: (words) => `One title was found which matched your search for "${words}".`,
    many: (n, words) => `${n} titles were found which matched your search for "${words}".`,
    none: (words) => `No titles were found which matched your search for "${words}".`,
};

exports.SENTENCES = SENTENCES;

exports.PressSearchPage = class PressSearchPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {level: 1, name: 'Search', exact: true});
        this.form = page.getByRole('search', {name: 'Book Search'});
        this.box = this.form.getByRole('searchbox', {name: 'Search Query'});
        this.searchButton = this.form.getByRole('button', {name: 'Search', exact: true});
        this.countLine = page.locator('.page_search .monograph_count');
        this.statusLine = page.locator('.page_search .search_results[role="status"]');
        this.searchAgainLink = this.statusLine.getByRole('link', {name: 'Search again', exact: true});
        this.results = page.locator('.page_search .obj_monograph_summary');
        this.pagination = page.locator('.page_search .cmp_pagination');
        // The journal/server page's filter furniture, absent on a press (S7).
        this.advancedFilters = page.locator('.page_search').getByText('Advanced filters');
        this.dateSelects = page.locator('.page_search select');
        this.dateLegends = page.locator('.page_search').getByText(/^(Published After|Published Before)$/);
    }

    /** The press's home page. */
    homeUrl() {
        return this.contextUrl(this.contextPath, '');
    }

    /** The bare Search page address. */
    url() {
        return this.contextUrl(this.contextPath, '/search');
    }

    /** The header's "Search" link (site chrome, Rule 1). */
    headerSearchLink() {
        return this.page.locator('header').getByRole('link', {name: 'Search', exact: true});
    }

    /** Open the press's home page and press "Search" in the header. */
    async openFromHome() {
        await this.page.goto(this.homeUrl());
        await this.headerSearchLink().click();
        await expect(this.heading).toBeVisible();
    }

    /** Open the bare Search page by address. */
    async goto() {
        await this.page.goto(this.url());
        await expect(this.heading).toBeVisible();
    }

    /**
     * Type into the page's own box and press its "Search" button; the form
     * is a GET to `search/search`, so the results page is the next document.
     *
     * @param {string} words
     */
    async submit(words) {
        await this.box.fill(words);
        const arrived = this.page.waitForResponse(
            (response) =>
                response.request().resourceType() === 'document' &&
                response.url().includes('/search/search')
        );
        await this.searchButton.click();
        await arrived;
        await expect(this.heading).toBeVisible();
        await expect(this.box).toHaveValue(words);
    }

    /** A fresh visit: open the bare page, then search. */
    async search(words) {
        await this.goto();
        await this.submit(words);
    }

    /** A hit by its title. */
    result(title) {
        return this.results.filter({has: this.page.getByRole('heading', {level: 2, name: title, exact: true})});
    }

    /** A hit's parts. */
    static parts(result) {
        return {
            cover: result.locator('a.cover img'),
            titleLink: result.getByRole('heading', {level: 2}).getByRole('link'),
            author: result.locator('.author'),
            date: result.locator('.date'),
            galleyLinks: result.locator('.galleys_links, .obj_galley_link'),
        };
    }

    /** Exactly the one book with this title is listed. */
    async expectOnly(title) {
        await expect(this.results).toHaveCount(1);
        await expect(this.result(title)).toHaveCount(1);
    }

    /** The empty result: the not-found sentence, "Search again", no list, no count. */
    async expectNone(words) {
        await expect(this.statusLine).toContainText(SENTENCES.none(words));
        await expect(this.searchAgainLink).toBeVisible();
        await expect(this.results).toHaveCount(0);
        await expect(this.countLine).toHaveCount(0);
    }

    /** A book by its title is absent from the list (the results block settled). */
    async expectAbsent(title) {
        await expect(this.result(title)).toHaveCount(0);
    }

    /** A page link ("2", ">", ">>", "<<", "<", "1"). */
    pageLink(name) {
        return this.pagination.getByRole('link', {name, exact: true});
    }

    /** Every page link under the list (none on a single page). */
    pageLinks() {
        return this.pagination.getByRole('link');
    }

    /** The current page's number, plain text among the links. */
    currentPageNumber() {
        return this.pagination.locator('strong');
    }

    /** Press a page link and wait for the next page of results. */
    async gotoPage(name) {
        const arrived = this.page.waitForResponse(
            (response) =>
                response.request().resourceType() === 'document' &&
                response.url().includes('/search/search')
        );
        await this.pageLink(name).click();
        await arrived;
        await expect(this.heading).toBeVisible();
    }

    /** True when the form sits after the results block in the document. */
    async formIsBelowResults() {
        return this.form.evaluate((form) => {
            const list = document.querySelector('.page_search .cmp_monographs_list');
            return !!list && !!(form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_PRECEDING);
        });
    }

    /** True when the form sits after the heading in the document. */
    async formIsBelowHeading() {
        return this.form.evaluate((form) => {
            const h1 = document.querySelector('.page_search h1');
            return !!h1 && !!(form.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_PRECEDING);
        });
    }

    /** Press "Search again": the address gains the anchor and the box is in view. */
    async searchAgain() {
        await this.searchAgainLink.click();
        await expect(this.page).toHaveURL(/#search-form$/);
        await expect(this.box).toBeInViewport();
    }
};

/**
 * The publication controls at the top right of a version's pages on the
 * workflow (Publish, schedule & versions owns them; scenario 5 drives two).
 * `workflow` is a shared WorkflowPage already showing a version's page.
 */
exports.CatalogEntryControls = class CatalogEntryControls {
    /**
     * @param {import('../../../../shared/playwright/pages/WorkflowPage.js').WorkflowPage} workflow
     */
    constructor(workflow) {
        this.workflow = workflow;
        this.page = workflow.page;
        this.unpublishButton = workflow.controlsRight().getByRole('button', {name: 'Unpublish', exact: true});
        this.publishButton = workflow.controlsRight().getByRole('button', {name: 'Publish', exact: true});
    }

    /**
     * A confirm window by its title, verified against its body (the idiom
     * of WorkflowPage.confirmDialog). The publish window is a side modal of
     * its own, so it cannot be told from the workflow dialog by structure.
     */
    confirmDialog(title, message) {
        return this.page.getByRole('dialog', {name: title, exact: true}).filter({hasText: message});
    }

    /** "Unpublish" → "Are you sure you don't want this to be published?" → Unpublish. */
    async unpublish() {
        await this.unpublishButton.click();
        const dialog = this.confirmDialog('Unpublish', "Are you sure you don't want this to be published?");
        await expect(dialog).toBeVisible({timeout: 30_000});
        const done = this.page.waitForResponse(
            (response) => /\/publications\/\d+\/unpublish/.test(response.url()) && response.ok()
        );
        await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
        await done;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(this.publishButton).toBeVisible({timeout: 30_000});
        await expect(this.workflow.controlsLeft()).toContainText('Unscheduled');
    }

    /** "Publish" → window "Schedule For Publication" ("…make this catalog entry public?") → Publish. */
    async publish() {
        await this.publishButton.click();
        const dialog = this.confirmDialog(
            'Schedule For Publication',
            'Are you sure you want to make this catalog entry public?'
        );
        await expect(dialog).toBeVisible({timeout: 30_000});
        const done = this.page.waitForResponse(
            (response) => /\/publications\/\d+\/publish/.test(response.url()) && response.ok()
        );
        await dialog.getByRole('button', {name: 'Publish', exact: true}).click();
        await done;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(this.unpublishButton).toBeVisible({timeout: 30_000});
        await expect(this.workflow.controlsLeft()).toContainText('Published');
    }
};

/**
 * Scenario 12's decline: press "Decline Submission" among the stage's
 * action buttons of an open workflow panel (the stage the book was
 * published from, once "Return to Workflow" has brought it back), walk the
 * full-page wizard to "Record Decision" and its completion panel. The
 * caller reopens the workflow afterwards.
 *
 * @param {import('../../../../shared/playwright/pages/WorkflowPage.js').WorkflowPage} workflow
 */
exports.declineFromStage = async function declineFromStage(workflow) {
    const page = workflow.page;
    await workflow.actionButton('Decline Submission').click();
    await expect(page.getByRole('heading', {level: 1, name: /Decline Submission/})).toBeVisible({timeout: 15_000});
    await walkDecisionWizard(page);
    await expect(page.getByText('View Submission Summary')).toBeVisible();
};
