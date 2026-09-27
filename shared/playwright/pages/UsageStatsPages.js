// @ts-check
/**
 * @file shared/playwright/pages/UsageStatsPages.js
 *
 * Page objects for U64 "Statistics — usage"
 * (docs/specs/U64-usage-statistics.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): every word that differs per app
 * ("Articles" / "Monographs" / "Preprints", "Journal" / "Press" /
 * "Server", a Download window's first button, the side menu's entries)
 * is passed in by the suite; the locators are the markup the three apps
 * share (one lib/pkp template set and one ui-library).
 *
 * Surfaces:
 * - StatsPage — Statistics › "Articles" ("Monographs", "Preprints"),
 *   "Journal" ("Press", "Server") and "Issues" {OJS}: the heading, the date
 *   range with its presets and "Custom Range", the chart's buttons and its
 *   readable twin (the screen-reader table the chart is drawn from), the
 *   table with its count line, columns, rows, "Total" sort, search box,
 *   page numbers, the information icon, "Filters" and its panel, "Download
 *   Report".
 * - DownloadWindow — the "Download" window: its description, parameter
 *   rows, report panels (heading, line, button, information icon), a
 *   report's download (the file's name and its lines, parsed as CSV).
 * - CounterR5Page, ReportSettingsWindow — Statistics › "Counter R5" and a
 *   report's "Report Settings" window: fields by name, their descriptions
 *   and red reasons, "Download" (a file, or a refusal), "Close".
 * - StatsReportsPage, CounterR4Page — Statistics › "Reports" and its
 *   "COUNTER Reports" page {OJS}: the report lines and their year links.
 * - JournalStatisticsTab — Settings › Distribution › "Statistics" of one
 *   context: present or not, its fields, radios, boxes and "Save".
 * - parseCsv(), csvRows() — the downloaded spreadsheets as rows.
 * - utcDay(), dayLabel(), monthLabel() — the dates as the pages write them
 *   (the fleets run PHP in UTC; days count from the server's today).
 *
 * The site's "Statistics" tab lives with Site Settings
 * (`SiteSettingsPages.js`, `SiteSettingsPage.statistics()`).
 *
 * DOM facts the locators rely on (U64 claim check K1–K5, 2026-09-27,
 * three apps; `.reports/U64/screen-notes.md`):
 * - the table's list fetch (`/api/v1/stats/{publications|contexts/{id}|issues}?`)
 *   is debounced, so a read right after a preset, "Apply", a sort, a
 *   search's Enter, a filter press or a page number shows the previous
 *   state: every action here arms the fetch's answer before the press;
 *   the chart's own fetch is `…/timeline?`;
 * - the chart is a canvas; `.pkpStats__graph table` (screen-reader only)
 *   holds one row per point, label and value, and is the chart as read;
 * - the "Filters" panel (`.pkpStats__sidebar`) is in the DOM whenever the
 *   context has filters, 1 px wide while closed and `-isVisible` while
 *   open; a chosen name has class `-isActive` and a "Clear filter: {name}"
 *   button;
 * - the Custom Range boxes exist only while the list is open, and Enter in
 *   a box applies nothing: only "Apply" does;
 * - the information icons are `span.tooltipButton` (floating-vue), shown
 *   on hover as `.v-popper__popper--shown .v-popper__inner`;
 * - a Download window closes itself after a report's button; the modal
 *   store keeps the closed window's slot for 450 ms, so a reopen waits it
 *   out (patterns.md pitfall 4); the file is a blob link, caught by the
 *   page's download event;
 * - "Counter R5" fetches `stats/sushi/reports` itself; its rows are
 *   `.counterReportsListPanel .listPanel__item`, each holding
 *   `span[id=<Report_ID>]`; a "Report Settings" download answers 200 with
 *   the file, or 400 with the field reasons (the window stays open); an
 *   emptied date box is refused in the browser with no request.
 */
const fs = require('fs');
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');

const T = 30_000;

// ---------------------------------------------------------------------------
// Dates as the pages write them
// ---------------------------------------------------------------------------

/** The UTC day `n` days before today, `YYYY-MM-DD` (0 is today). */
function utcDay(n = 0) {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` day as the chart labels it ("September 26, 2026"). */
function dayLabel(iso) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
}

/** A `YYYY-MM[-DD]` month as the chart labels it ("March 2024"). */
function monthLabel(iso) {
    return new Date(`${iso.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'});
}

/** The first day of the month `k` months from this one (negative: back), `YYYY-MM-DD`. */
function monthStart(k = 0) {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1)).toISOString().slice(0, 10);
}

/** The last day of the month `k` months from this one, `YYYY-MM-DD`. */
function monthEnd(k = 0) {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k + 1, 0)).toISOString().slice(0, 10);
}

/** Wait out the modal store's slot of a closed side window (patterns.md pitfall 4). */
async function pastModalSlot(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

// ---------------------------------------------------------------------------
// The spreadsheets
// ---------------------------------------------------------------------------

/** Parse CSV text (quoted fields, doubled quotes) into rows of strings; an empty line is `[]`. */
function parseCsv(text) {
    const rows = [];
    for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
        if (line === '') {
            rows.push([]);
            continue;
        }
        const cells = [];
        let cell = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (quoted) {
                if (c === '"' && line[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else if (c === '"') {
                    quoted = false;
                } else {
                    cell += c;
                }
            } else if (c === '"') {
                quoted = true;
            } else if (c === ',') {
                cells.push(cell);
                cell = '';
            } else {
                cell += c;
            }
        }
        cells.push(cell);
        rows.push(cells);
    }
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return rows;
}

/**
 * A downloaded statistics file split at its first empty line:
 * `{params: [[name, value]…], columns: [...], rows: [[...]…]}`.
 */
function csvParts(text) {
    const all = parseCsv(text);
    const gap = all.findIndex((r) => r.length === 0);
    const params = gap < 0 ? [] : all.slice(0, gap);
    const table = gap < 0 ? all : all.slice(gap + 1);
    return {params, columns: table[0] || [], rows: table.slice(1)};
}

// ---------------------------------------------------------------------------
// The Statistics pages
// ---------------------------------------------------------------------------

const ROUTES = {articles: 'publications', journal: 'context', issues: 'issues'};
/** The table's API address of each page ("Journal" reads `stats/contexts/{id}`). */
const LIST_APIS = {articles: 'publications', journal: 'contexts/\\d+', issues: 'issues'};

/** Is this the table's list fetch of a statistics page (not the chart's, not a file)? */
function isListFetch(kind) {
    const re = new RegExp(`/api/v1/stats/${LIST_APIS[kind]}(\\?|$)`);
    return (r) => re.test(r.url()) && r.request().method() === 'GET' && !/text\/csv/.test(r.request().headers().accept || '');
}

/** Is this the chart's fetch? */
function isTimelineFetch(r) {
    return /\/api\/v1\/stats\/.+\/timeline(\?|$)/.test(r.url()) && r.request().method() === 'GET' && !/text\/csv/.test(r.request().headers().accept || '');
}

class StatsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {'articles'|'journal'|'issues'} kind which page
     */
    constructor(page, contextPath, kind) {
        super(page);
        this.contextPath = contextPath;
        this.kind = kind;
        this.route = ROUTES[kind];
        this.main = page.locator('main');
        this.heading = page.locator('main h1').first();
        this.range = page.locator('.pkpDateRange__current').first();
        this.calendarButton = page.locator('.pkpDateRange__button').first();
        this.rangeList = page.locator('.pkpDateRange__options').first();
        this.presets = page.locator('.pkpDateRange__option');
        this.customLegend = page.locator('.pkpDateRange__form legend').first();
        this.startBox = page.locator('.pkpDateRange__input--start').first();
        this.endBox = page.locator('.pkpDateRange__input--end').first();
        this.applyButton = page.locator('.pkpDateRange__form').getByRole('button', {name: 'Apply', exact: true});
        this.rangeError = page.locator('.pkpDateRange__form .text-base-normal').first();
        this.chartButtons = page.locator('.pkpStats__graphSelectors button');
        this.timelineRows = page.locator('.pkpStats__graph table tbody tr');
        this.panel = page.locator('.pkpStats__panel').first();
        this.tableTitle = this.panel.locator('h2').first();
        this.infoIcon = this.panel.locator('h2 .tooltipButton').first();
        this.itemsOfTotal = this.panel.locator('.pkpStats__itemsOfTotal').first();
        this.downloadReportButton = this.panel.getByRole('button', {name: 'Download Report', exact: true});
        this.table = this.panel.locator('table').first();
        this.columnHeaders = this.table.locator('thead th');
        this.itemRows = this.table.locator('tbody tr').filter({has: page.locator('a.pkpStats__itemLink')});
        this.searchBox = this.panel.getByRole('searchbox');
        this.clearSearchButton = this.panel.getByRole('button', {name: 'Clear search phrase', exact: true});
        this.totalSortButton = this.table.locator('thead th').getByRole('button', {name: /^Total/});
        this.pagination = this.panel.locator('.pkpPagination');
        this.filtersButton = page.locator('.pkpStats .pkpHeader').first().getByRole('button', {name: 'Filters', exact: true});
        this.sidebar = page.locator('.pkpStats__sidebar');
    }

    url() {
        return this.contextUrl(this.contextPath, `/stats/${this.route}/${this.route}`);
    }

    /** Arm the table's list fetch; returns its answer's promise. */
    listFetched() {
        return this.page.waitForResponse(isListFetch(this.kind), {timeout: T});
    }

    /** Arm the chart's fetch; returns its answer's promise. */
    timelineFetched() {
        return this.page.waitForResponse(isTimelineFetch, {timeout: T});
    }

    /** Type the page's address; resolves once the table's first fetch answered and the heading shows. */
    async goto() {
        const listed = this.listFetched();
        await this.page.goto(this.url());
        await listed;
        await expect(this.heading).toBeVisible({timeout: T});
    }

    /** Once the page is open (arrived by a side-menu press): its first fetch has answered. */
    async arrived(listed) {
        if (listed) await listed;
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.range).not.toBeEmpty({timeout: T});
    }

    /** Reload the page (a fresh first fetch). */
    async reload() {
        const listed = this.listFetched();
        await this.page.reload();
        await listed;
        await expect(this.heading).toBeVisible({timeout: T});
    }

    // ---- the date range --------------------------------------------------

    /** Open the date range's list (when closed). */
    async openRangeList() {
        if (!(await this.rangeList.isVisible())) await this.calendarButton.click();
        await expect(this.rangeList).toBeVisible({timeout: T});
    }

    /** Choose a preset ("Last 90 days", "All dates", …); resolves once the table refetched. */
    async choosePreset(label) {
        await this.openRangeList();
        const listed = this.listFetched();
        await this.presets.filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).click();
        await listed;
        await expect(this.rangeList).toBeHidden({timeout: T});
    }

    /** Type both Custom Range boxes (the list open). */
    async typeCustomRange(start, end) {
        await this.openRangeList();
        await this.startBox.fill(start);
        await this.endBox.fill(end);
    }

    /** Type a Custom Range and press "Apply"; resolves once the table refetched and the list closed. */
    async applyCustomRange(start, end) {
        await this.typeCustomRange(start, end);
        const listed = this.listFetched();
        await this.applyButton.click();
        await listed;
        await expect(this.rangeList).toBeHidden({timeout: T});
    }

    /**
     * Type a Custom Range, press "Apply" and wait for the reason under it;
     * returns the stats fetches sent meanwhile (none expected: a refused
     * range is the page's own).
     */
    async applyRefusedRange(start, end, message) {
        await this.typeCustomRange(start, end);
        return this.statsFetchesDuring(async () => {
            await this.applyButton.click();
            await expect(this.rangeError).toHaveText(message, {timeout: T});
        });
    }

    /** The stats fetches (`/api/v1/stats/`) sent while `action` runs. */
    async statsFetchesDuring(action) {
        const sent = [];
        const onRequest = (r) => {
            if (/\/api\/v1\/stats\//.test(r.url())) sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            await action();
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    // ---- the chart -------------------------------------------------------

    /** A chart button by its label ("Abstracts", "Files", "Views", "Downloads", "Daily", "Monthly"). */
    chartButton(label) {
        return this.chartButtons.filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
    }

    /** Press a chart button; resolves once the chart refetched. */
    async pressChart(label) {
        const drawn = this.timelineFetched();
        await this.chartButton(label).click();
        await drawn;
        await expect(this.chartButton(label)).toHaveAttribute('aria-pressed', 'true', {timeout: T});
    }

    /** The chart as read: `[[label, value]…]`, one pair per point. */
    async timeline() {
        return this.timelineRows.evaluateAll((trs) =>
            trs.map((tr) => [tr.querySelector('th').textContent.trim(), tr.querySelector('td').textContent.trim()])
        );
    }

    /** Poll the chart until it reads `expected` (`[[label, value]…]`). */
    async expectTimeline(expected) {
        await expect.poll(() => this.timeline(), {timeout: T}).toEqual(expected);
    }

    // ---- the table -------------------------------------------------------

    /** The count line reads `text` ("3 of 3 articles"; its hidden "View additional pages" link left out). */
    async expectCount(text) {
        await expect(this.itemsOfTotal).toHaveText(new RegExp(`^\\s*${escapeRe(text)}\\s*(View additional pages)?\\s*$`), {timeout: T});
    }

    /** A row by a text it holds (a title). */
    row(text) {
        return this.itemRows.filter({hasText: text});
    }

    /** A row's cells. */
    cells(text) {
        return this.row(text).locator('td');
    }

    /** Each row's link text (authors and title), top to bottom. */
    rowTitles() {
        return this.itemRows.locator('a.pkpStats__itemLink');
    }

    /** A row's link. */
    rowLink(text) {
        return this.row(text).locator('a.pkpStats__itemLink');
    }

    /** A row's author part and its font weight. */
    async authorWeight(text) {
        return this.row(text).locator('.pkpStats__itemAuthors').evaluate((e) => Number(getComputedStyle(e).fontWeight));
    }

    /** The empty table's line (by its words). */
    emptyLine(text) {
        return this.table.locator('tbody').getByText(text, {exact: true});
    }

    /** The column headings' names (their own words; the search box and the hidden "Sort" left out). */
    async columnNames() {
        return this.columnHeaders.evaluateAll((ths) =>
            ths.map((th) => {
                const copy = th.cloneNode(true);
                copy.querySelectorAll('.pkpSearch, .-screenReader, .sr-only, svg').forEach((e) => e.remove());
                return copy.textContent.replace(/\s+/g, ' ').trim();
            })
        );
    }

    /** Poll the column names until they read `expected`. */
    async expectColumns(expected) {
        await expect.poll(() => this.columnNames(), {timeout: T}).toEqual(expected);
    }

    /** Type a phrase in the search box and press Enter; resolves once the table refetched. */
    async search(phrase) {
        await this.searchBox.fill(phrase);
        const listed = this.listFetched();
        await this.searchBox.press('Enter');
        await listed;
    }

    /** The search box's "×"; resolves once the table refetched. */
    async clearSearch() {
        const listed = this.listFetched();
        await this.clearSearchButton.click();
        await listed;
        await expect(this.searchBox).toHaveValue('', {timeout: T});
    }

    /** Press the "Total" heading; resolves once the table refetched. */
    async sortByTotal() {
        const listed = this.listFetched();
        await this.totalSortButton.click();
        await listed;
    }

    /** A page number under the table. */
    pageNumber(n) {
        return this.pagination.locator('.pkpPagination__page').filter({hasText: new RegExp(`^\\s*${n}\\s*$`)});
    }

    /** Press a page number; resolves once the table refetched. */
    async gotoPage(n) {
        const listed = this.listFetched();
        await this.pageNumber(n).click();
        await listed;
    }

    /** Hover an information icon and read its text. */
    async tooltip(icon = this.infoIcon) {
        await icon.hover();
        const tip = this.page.locator('.v-popper__popper--shown .v-popper__inner').last();
        await expect(tip).toBeVisible({timeout: T});
        const text = (await tip.innerText()).replace(/\s+/g, ' ').trim();
        await this.page.mouse.move(0, 0);
        return text;
    }

    // ---- "Filters" -------------------------------------------------------

    /** Press "Filters" (open or close the panel); closing refetches when a name was chosen. */
    async toggleFilters({refetch = false} = {}) {
        const listed = refetch ? this.listFetched() : null;
        await this.filtersButton.click();
        if (listed) await listed;
    }

    /** Is the panel open? */
    async expectFiltersOpen(open = true) {
        if (open) await expect(this.sidebar).toHaveClass(/-isVisible/, {timeout: T});
        else await expect(this.sidebar).not.toHaveClass(/-isVisible/, {timeout: T});
    }

    /** A heading of the panel ("Sections", "Issues", "Series"). */
    filterSet(heading) {
        return this.sidebar.locator('.pkpStats__filterSet').filter({has: this.page.locator('h3', {hasText: new RegExp(`^\\s*${heading}\\s*$`)})});
    }

    /** The panel's headings, top to bottom. */
    filterHeadings() {
        return this.sidebar.locator('.pkpStats__filterSet h3');
    }

    /** The names under a heading. */
    filterNames(heading) {
        return this.filterSet(heading).locator('.pkpFilter__label');
    }

    /** A name under a heading. */
    filterName(heading, name) {
        return this.filterNames(heading).filter({hasText: new RegExp(`^\\s*${escapeRe(name)}\\s*$`)});
    }

    /** Press a name under a heading; resolves once the table refetched. */
    async pressFilter(heading, name) {
        const listed = this.listFetched();
        await this.filterName(heading, name).click();
        await listed;
    }

    /** A chosen name's "×" ("Clear filter: {name}"); resolves once the table refetched. */
    async clearFilter(name) {
        const listed = this.listFetched();
        await this.sidebar.getByRole('button', {name: `Clear filter: ${name}`, exact: true}).click();
        await listed;
    }

    // ---- "Download Report" -----------------------------------------------

    /** Press "Download Report"; returns the window, open. */
    async openDownload() {
        await this.downloadReportButton.click();
        const window = new DownloadWindow(this.page);
        await window.ready();
        return window;
    }
}

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// The "Download" window
// ---------------------------------------------------------------------------

class DownloadWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
        this.description = this.dialog.locator('p').filter({hasText: /^\s*Download a CSV/}).first();
        this.paramRows = this.dialog.locator('table tr');
        this.panels = this.dialog.locator('.pkpStats__reportAction');
        this.panelHeadings = this.panels.locator('h2');
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true}).first();
    }

    async ready() {
        await expect(this.dialog).toBeVisible({timeout: T});
        await expect(this.panels.first()).toBeVisible({timeout: T});
    }

    /** The parameter rows as `[[name, value]…]`. */
    async params() {
        return this.paramRows.evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim())));
    }

    /** Poll the parameter rows until they read `expected`. */
    async expectParams(expected) {
        await expect.poll(() => this.params(), {timeout: T}).toEqual(expected);
    }

    /** A report panel by its heading ("Articles", "Timeline", "Geographic"). */
    panel(heading) {
        return this.panels.filter({has: this.page.locator('h2', {hasText: new RegExp(`^\\s*${heading}`)})});
    }

    /** A panel's line. */
    panelLine(heading) {
        return this.panel(heading).locator('p').first();
    }

    /** A panel's button. */
    panelButton(heading) {
        return this.panel(heading).getByRole('button');
    }

    /** A panel's information icon. */
    panelInfoIcon(heading) {
        return this.panel(heading).locator('.tooltipButton').first();
    }

    /** The panels' headings as read (the icon's hidden words left out). */
    async headings() {
        return this.panelHeadings.evaluateAll((hs) =>
            hs.map((h) => {
                const first = h.querySelector('span.align-middle');
                return (first ? first.textContent : h.childNodes[0].textContent).replace(/\s+/g, ' ').trim();
            })
        );
    }

    /**
     * Press a report's button: the file (`{name, text, parts}`); the window
     * closes itself, and the modal slot is waited out before returning.
     */
    async download(buttonName) {
        const arrived = this.page.waitForEvent('download', {timeout: T});
        await this.dialog.getByRole('button', {name: buttonName, exact: true}).click();
        const file = await arrived;
        const text = fs.readFileSync(await file.path(), 'utf8');
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return {name: file.suggestedFilename(), text, parts: csvParts(text)};
    }

    /** Close the window with its own "Close" and wait out the modal slot. */
    async close() {
        await this.closeButton.click();
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
    }
}

// ---------------------------------------------------------------------------
// "Counter R5" and "Report Settings"
// ---------------------------------------------------------------------------

/** Is this a "Counter R5" report request (list or report)? */
function isSushiReport(r) {
    return /\/api\/v1\/stats\/sushi\/reports\//.test(r.url());
}

class CounterR5Page extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.locator('main h1').first();
        this.docLine = page.locator('main p').filter({hasText: 'See COUNTER 5.0.3 documentation'}).first();
        this.docLink = page.locator('main').getByRole('link', {name: 'COUNTER 5.0.3 documentation'});
        this.listPanel = page.locator('.counterReportsListPanel').first();
        this.listTitle = this.listPanel.locator('h2').first();
        this.rows = this.listPanel.locator('.listPanel__item');
        this.warning = page.locator('main').getByText('There are no COUNTER R5 usage statistics available yet.', {exact: true});
        this.emptyLine = this.listPanel.getByText('No items found.', {exact: true});
        this.errorDialog = page.getByRole('dialog').filter({hasText: 'Error'});
    }

    url() {
        return this.contextUrl(this.contextPath, '/stats/counterR5/counterR5');
    }

    /** Arm the page's own report-list fetch. */
    listFetched() {
        return this.page.waitForResponse((r) => /\/api\/v1\/stats\/sushi\/reports(\?|$)/.test(r.url()), {timeout: T});
    }

    /** Type the address; resolves with the report list's answer once the heading shows. */
    async goto() {
        const listed = this.listFetched();
        await this.page.goto(this.url());
        const response = await listed;
        await expect(this.heading).toBeVisible({timeout: T});
        return response;
    }

    /** A report's row by its ID ("PR", "IR_A1"). */
    row(id) {
        return this.rows.filter({has: this.page.locator(`span[id="${id}"]`)});
    }

    /** "Edit" on a report; returns its window, ready. */
    async edit(id) {
        await this.row(id).getByRole('button', {name: 'Edit', exact: true}).click();
        const window = new ReportSettingsWindow(this.page);
        await window.ready();
        return window;
    }
}

class ReportSettingsWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog').filter({hasText: 'Report Settings'});
        this.title = this.dialog.getByText('Report Settings', {exact: true}).first();
        this.downloadButton = this.dialog.getByRole('button', {name: 'Download', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true}).first();
        this.errorSummary = this.dialog.locator('.pkpFormErrors').filter({hasText: /Please correct (one error|\d+ errors)\./});
        this.customer = this.dialog.locator('select[name="customer_id"]');
        this.metricBoxes = this.dialog.locator('input[name="metric_type"]');
        this.attributeBoxes = this.dialog.locator('input[name="attributes_to_show"]');
        this.excludeMonthly = this.dialog.getByRole('checkbox', {name: 'Exclude Monthly Details', exact: true});
        this.includeParent = this.dialog.getByRole('checkbox', {name: 'Include Parent Details', exact: true});
    }

    async ready() {
        await expect(this.downloadButton).toBeVisible({timeout: T});
        await expect(this.box('begin_date')).not.toHaveValue('', {timeout: T});
    }

    /** A field's input by its name (`begin_date`, `end_date`, `yop`, `item_id`). */
    box(name) {
        return this.dialog.locator(`input[name="${name}"]`);
    }

    /** The field around an input (by name). */
    field(name) {
        return this.dialog.locator('.pkpFormField').filter({has: this.page.locator(`[name="${name}"]`)}).first();
    }

    /** A field's label (legend or label) text. */
    fieldLabel(name) {
        return this.field(name).locator('legend, .pkpFormFieldLabel').first();
    }

    /** A field's description under it. */
    description(name) {
        return this.field(name).locator('.pkpFormField__description').first();
    }

    /** A field's red reasons. */
    fieldError(name) {
        return this.field(name).locator('.pkpFieldError');
    }

    /** Is a field marked required ("*")? */
    requiredMark(name) {
        return this.field(name).locator('.pkpFormFieldLabel__required');
    }

    /** A checkbox of a field by its label. */
    checkbox(label) {
        return this.dialog.getByRole('checkbox', {name: label, exact: true});
    }

    /** The boxes' labels of a checkbox field with their ticks: `[[label, checked]…]`. */
    async boxes(name) {
        return this.dialog.locator(`input[name="${name}"]`).evaluateAll((inputs) =>
            inputs.map((i) => [(i.labels && i.labels[0] ? i.labels[0].textContent : '').replace(/\s+/g, ' ').trim(), i.checked])
        );
    }

    /** "Customer ID"'s list: `[[text, selected]…]`. */
    async customers() {
        return this.customer.locator('option').evaluateAll((os) => os.map((o) => [o.textContent.trim(), o.selected]));
    }

    /** Type in a box (select all, type, leave). */
    async type(name, value) {
        await this.box(name).fill(value);
        await this.box(name).blur();
    }

    /**
     * "Download": the file (`{name, text, lines}`); the window closes and the
     * modal slot is waited out.
     */
    async download() {
        const arrived = this.page.waitForEvent('download', {timeout: T});
        const answered = this.page.waitForResponse(isSushiReport, {timeout: T});
        await this.downloadButton.click();
        const response = await answered;
        expect(response.status(), 'the report request is served').toBe(200);
        const file = await arrived;
        const text = fs.readFileSync(await file.path(), 'utf8');
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return {name: file.suggestedFilename(), text, rows: parseCsv(text)};
    }

    /**
     * "Download" refused by the server: resolves with the answer's status
     * once the reasons show, and the files that arrived meanwhile (none
     * expected; a refusal is drawn from the answer, so a file would have
     * come before it).
     */
    async downloadRefused(name, message) {
        const files = [];
        const onDownload = (d) => files.push(d.suggestedFilename());
        this.page.on('download', onDownload);
        try {
            const answered = this.page.waitForResponse(isSushiReport, {timeout: T});
            await this.downloadButton.click();
            const response = await answered;
            await expect(this.fieldError(name)).toContainText(message, {timeout: T});
            await expect(this.dialog).toBeVisible();
            return {status: response.status(), files};
        } finally {
            this.page.off('download', onDownload);
        }
    }

    /**
     * "Download" refused in the browser: resolves once the reason shows, with
     * the report requests sent and files that arrived meanwhile (none expected).
     */
    async downloadRefusedInBrowser(name, message) {
        const sent = [];
        const files = [];
        const onRequest = (r) => {
            if (isSushiReport(r)) sent.push(r.url());
        };
        const onDownload = (d) => files.push(d.suggestedFilename());
        this.page.on('request', onRequest);
        this.page.on('download', onDownload);
        try {
            await this.downloadButton.click();
            await expect(this.fieldError(name)).toContainText(message, {timeout: T});
            return {sent, files};
        } finally {
            this.page.off('request', onRequest);
            this.page.off('download', onDownload);
        }
    }

    /** "Close": the window closes (no question asked is the caller's read); the modal slot is waited out. */
    async close() {
        await this.closeButton.click();
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
    }
}

/** A COUNTER file's header line value (`Created_By` → the text), from `parseCsv` rows. */
function counterHeader(rows, name) {
    const row = rows.find((r) => r[0] === name);
    return row ? row.slice(1).join(',') : undefined;
}

/** A COUNTER file's table: `{columns, rows}` after the first empty line. */
function counterTable(rows) {
    const gap = rows.findIndex((r) => r.length === 0);
    const table = gap < 0 ? [] : rows.slice(gap + 1);
    return {columns: table[0] || [], rows: table.slice(1)};
}

// ---------------------------------------------------------------------------
// Statistics › "Reports" › "COUNTER Reports" {OJS}
// ---------------------------------------------------------------------------

class StatsReportsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.locator('main h1').first();
    }

    url() {
        return this.contextUrl(this.contextPath, '/stats/reports');
    }

    async goto() {
        await this.page.goto(this.url());
        await expect(this.heading).toBeVisible({timeout: T});
    }

    /** A report's link on the page ("COUNTER Reports"). */
    reportLink(name) {
        return this.page.locator('main').getByRole('link', {name, exact: true});
    }
}

class CounterR4Page extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.content = page.locator('.app__contentPanel').first();
        this.heading = page.locator('main h1').first();
        this.intro = this.content.locator('p').first();
        this.release = this.content.locator('h2').first();
        this.items = this.content.locator('li');
    }

    async ready() {
        await expect(this.heading).toHaveText('COUNTER Reports', {timeout: T});
        await expect(this.release).toBeVisible({timeout: T});
    }

    /** A report's line ("Journal Report 1:"). */
    item(label) {
        return this.items.filter({hasText: label});
    }

    /** A report line's year links. */
    yearLinks(label) {
        return this.item(label).locator('a');
    }

    /** Press a year's link; the file (`{name, text}`). */
    async downloadYear(label, year) {
        const arrived = this.page.waitForEvent('download', {timeout: T});
        await this.yearLinks(label).filter({hasText: new RegExp(`^\\s*${year}\\s*$`)}).click();
        const file = await arrived;
        return {name: file.suggestedFilename(), text: fs.readFileSync(await file.path(), 'utf8')};
    }
}

// ---------------------------------------------------------------------------
// Settings › Distribution › "Statistics"
// ---------------------------------------------------------------------------

class JournalStatisticsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.tabs = page.getByRole('main').getByRole('tab');
        this.tab = page.locator('#statistics-button').first();
        this.panel = page.locator('#statistics').first();
        this.form = this.panel.locator('form').first();
        this.fields = this.form.locator('.pkpFormField');
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.savedStatus = this.form.locator('.pkpFormPage__status', {hasText: 'Saved'});
        this.publicApiBox = this.form.getByRole('checkbox', {name: 'Make the COUNTER SUSHI statistics publicly available', exact: true});
        this.institutionalBox = this.form.getByRole('checkbox', {name: 'Enable institutional statistics', exact: true});
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/distribution');
    }

    /** Settings › Distribution, landed afresh; waits for its tab row. */
    async gotoDistribution() {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await expect(this.tabs.first()).toBeVisible({timeout: T});
    }

    /** Settings › Distribution, then its "Statistics" tab; the form ready. */
    async goto() {
        await this.gotoDistribution();
        await this.tab.click();
        await expect(this.tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.saveButton).toBeVisible({timeout: T});
    }

    /** The fields' labels, top to bottom. */
    async fieldLabels() {
        return this.fields.evaluateAll((fs) =>
            fs.map((f) => {
                const l = f.querySelector('legend, .pkpFormFieldLabel');
                return l ? l.textContent.replace(/\s+/g, ' ').trim() : '';
            })
        );
    }

    /** A field by its label. */
    field(label) {
        return this.fields.filter({has: this.page.locator('legend, .pkpFormFieldLabel', {hasText: new RegExp(`^\\s*${label}\\s*$`)})}).first();
    }

    /** A field's description. */
    description(label) {
        return this.field(label).locator('.pkpFormField__description').first();
    }

    /** A radio by its label. */
    radio(label) {
        return this.form.getByLabel(label, {exact: true});
    }

    /** A radio field's choices: `[[label, checked]…]`. */
    async choices(label) {
        return this.field(label)
            .locator('input[type="radio"]')
            .evaluateAll((inputs) => inputs.map((i) => [(i.labels && i.labels[0] ? i.labels[0].textContent : '').replace(/\s+/g, ' ').trim(), i.checked]));
    }

    /** "Save"; resolves with the save's answer once "Saved" shows. */
    async save() {
        const answered = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await this.saveButton.click();
        const response = await answered;
        await expect(this.savedStatus).toBeVisible({timeout: T});
        return response;
    }
}

module.exports = {
    StatsPage,
    DownloadWindow,
    CounterR5Page,
    ReportSettingsWindow,
    StatsReportsPage,
    CounterR4Page,
    JournalStatisticsTab,
    parseCsv,
    csvParts,
    counterHeader,
    counterTable,
    utcDay,
    dayLabel,
    monthLabel,
    monthStart,
    monthEnd,
    pastModalSlot,
};
