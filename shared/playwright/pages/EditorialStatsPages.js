// @ts-check
/**
 * @file shared/playwright/pages/EditorialStatsPages.js
 *
 * Page objects for U65 "Statistics — editorial activity & reports"
 * (docs/specs/U65-editorial-statistics.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): every word that differs per app (the
 * stage names, the "Trends" rows, the role names, the report links) is
 * passed in by the suite; the locators are the markup the three apps share
 * (one lib/pkp template set and one ui-library).
 *
 * Surfaces:
 * - EditorialActivityPage — Statistics › "Editorial Activity": the chart
 *   {OJS OMP} (total, stages, whether a ring is drawn), the "Trends" table
 *   (columns, rows, figures, the sub-rows' indent, the information icons),
 *   and the date range and "Filters" it shares with U64's StatsPage (this
 *   class extends it; the refetch it waits on is this page's three GETs).
 * - UserStatsPage, UserExportWindow — Statistics › "Users": the heading,
 *   "Export", the "Registered users" table; the "Export to Excel/CSV"
 *   window, its boxes and its download.
 * - EditorialReportsPage — Statistics › "Reports": the heading, the line,
 *   the report links in order and a link's download.
 * - statsAddresses() — the "Statistics" group's addresses as the side menu
 *   holds them.
 * - accessDenied() — the access-denied page's sentence.
 * - readDownload(), csvFile() — a downloaded or attached spreadsheet as
 *   `{name, bom, text, rows}`.
 * - statisticsEmails() — the monthly email(s) one address received, each
 *   with its links and its attachments read as spreadsheets.
 *
 * DOM facts the locators rely on (U65 claim check K1–K5, 2026-09-28, three
 * apps; `.reports/U65/screen-notes.md`):
 * - the page opens with its figures already in it (no fetch on landing); a
 *   range or filter change sends three GETs (`stats/editorial` with the
 *   dates, `stats/editorial` without them for "Total", and
 *   `stats/editorial/averages`) and the table is redrawn once all three
 *   answered; `main .pkpSpinner` sits in the "Trends" heading meanwhile;
 * - the chart is a Chart.js `<canvas>` in `.pkpStats--editorial__stageChartWrapper`;
 *   the total is the level-2 heading "{n} Active Submissions"
 *   (`.pkpStats--editorial__stage--total`), the stages the sibling
 *   `.pkpStats--editorial__stage` blocks ("{count}" over "{name}");
 * - "Trends" is `getByRole('table', {name: 'Trends'})`; a sub-row's name
 *   starts with U+2003 (em space), and a row with an information icon
 *   carries "Description for {row}" (the icon's screen-reader label) in its
 *   first cell; the icon is `span.tooltipButton`, its text shown on hover
 *   in `.v-popper__popper--shown .v-popper__inner`;
 * - the "Filters" panel's headings are `h2` (U64's pages use `h3`), its
 *   names `.pkpFilter__label`; the closed panel keeps them in the DOM, so
 *   "Filters" is pressed before a name;
 * - "Users" is server-rendered: `getByRole('table', {name: 'Registered
 *   users'})`; its "Export" opens the dialog "Export to Excel/CSV", whose
 *   boxes are named by role; its "Export" POSTs `{ctx}/stats/users` and the
 *   browser then goes to `api/v1/users/report?…`, a download;
 * - "Reports" links are `main .app__contentPanel a`, each a download; a
 *   failing report answers 500 on `stats/reports/report` with no download.
 */
const fs = require('fs');
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {StatsPage, parseCsv, pastModalSlot} = require('./UsageStatsPages.js');

const T = 30_000;

/** The access-denied page's sentence (`user.authorization.roleBasedAccessDenied`). */
const DENIED = 'The current role does not have access to this operation.';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Spreadsheets
// ---------------------------------------------------------------------------

/** A spreadsheet's bytes as `{bom, text, rows}` (the byte-order mark cut off `text`). */
function csvFile(buffer) {
    const bom = buffer.subarray(0, 3).toString('hex') === 'efbbbf';
    const text = buffer.toString('utf8').replace(/^﻿/, '');
    return {bom, text, rows: parseCsv(text)};
}

/** A Playwright download as `{name, bom, text, rows}`. */
async function readDownload(download) {
    const file = await download.path();
    return {name: download.suggestedFilename(), ...csvFile(fs.readFileSync(file))};
}

/** A row of a parsed spreadsheet as `{column: value}`, by the column line `columns`. */
function asRecord(columns, row) {
    return Object.fromEntries(columns.map((c, i) => [c, row[i] === undefined ? '' : row[i]]));
}

// ---------------------------------------------------------------------------
// Side menu and access
// ---------------------------------------------------------------------------

/**
 * The "Statistics" group's addresses as the side menu holds them, by entry
 * label (`{"Editorial Activity": "/index.php/{ctx}/stats/editorial/editorial", …}`).
 * The group's entries are in the DOM whether it is open or not
 * (patterns.md locator pitfall 2), so nothing is pressed.
 */
async function statsAddresses(page, group = 'Statistics') {
    const nav = page.locator('nav#app-nav');
    const header = nav.locator(`[data-pc-section="header"][aria-label="${group}"]`);
    await expect(header).toBeAttached({timeout: T});
    const read = () =>
        nav.evaluate((n, label) => {
            const panel = [...n.querySelectorAll('[data-pc-section="panel"]')].find((p) => {
                const h = p.querySelector('[data-pc-section="header"]');
                return h && h.getAttribute('aria-label') === label;
            });
            if (!panel) return {};
            return Object.fromEntries(
                [...panel.querySelectorAll('[role="treeitem"]')].map((li) => {
                    const a = li.querySelector('a');
                    const href = a ? a.getAttribute('href') || '' : '';
                    return [li.getAttribute('aria-label'), href.replace(/^https?:\/\/[^/]+/, '')];
                })
            );
        }, group);
    await expect.poll(async () => Object.keys(await read()).length, {timeout: T}).toBeGreaterThan(0);
    return read();
}

/** The access-denied page (its sentence) as `page` shows it. */
function accessDenied(page) {
    return page.getByText(DENIED, {exact: true});
}

/**
 * `page` is on the access-denied page: the address and the sentence, and
 * no statistics page drawn (`.pkpStats`, the reports' content panel).
 */
async function expectAccessDenied(page, what = '') {
    await expect(page, `${what} lands on the access-denied page`).toHaveURL(/\/user\/authorizationDenied/, {timeout: T});
    await expect(accessDenied(page), `${what}: the sentence`).toBeVisible({timeout: T});
    await expect(page.locator('.pkpStats, main .app__contentPanel'), `${what}: no statistics page`).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Statistics › "Editorial Activity"
// ---------------------------------------------------------------------------

/** Is this one of the page's own GETs: `dated` with dateStart, `total` without, or `averages`? */
function isEditorialFetch(which) {
    return (r) => {
        if (r.request().method() !== 'GET') return false;
        const url = r.url();
        if (which === 'averages') return /\/api\/v1\/stats\/editorial\/averages(\?|$)/.test(url);
        if (!/\/api\/v1\/stats\/editorial(\?|$)/.test(url)) return false;
        const dated = /[?&]dateStart=/.test(url);
        return which === 'dated' ? dated : !dated;
    };
}

class EditorialActivityPage extends StatsPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page, contextPath, 'articles');
        this.route = 'editorial';
        this.screenReaderHeading = page.locator('main h1.-screenReader');
        this.trendsHeading = page.locator('main #editorialActivityTableLabel');
        this.spinner = page.locator('main .pkpSpinner');
        this.chart = page.locator('main .pkpStats__graph');
        this.canvas = this.chart.locator('canvas');
        this.totalHeading = this.chart.locator('h2.pkpStats--editorial__stage--total');
        this.totalCount = this.totalHeading.locator('.pkpStats--editorial__stageCount');
        this.stageBlocks = this.chart.locator('.pkpStats--editorial__stageList > div.pkpStats--editorial__stage');
        this.trends = page.getByRole('table', {name: 'Trends'});
        this.trendRows = this.trends.locator('tbody tr');
        this.trendHeaders = this.trends.locator('thead th');
        // The Trends panel's own header (`pkp-header` around "Trends").
        this.filtersButton = page.locator('.pkpStats__panel .pkpHeader').first().getByRole('button', {name: 'Filters', exact: true});
    }

    url() {
        return this.contextUrl(this.contextPath, '/stats/editorial');
    }

    /**
     * Arm the three GETs a range or filter change sends; resolves once all
     * three answered and the spinner is gone.
     */
    listFetched() {
        const all = Promise.all([
            this.page.waitForResponse(isEditorialFetch('dated'), {timeout: T}),
            this.page.waitForResponse(isEditorialFetch('total'), {timeout: T}),
            this.page.waitForResponse(isEditorialFetch('averages'), {timeout: T}),
        ]);
        // A GET the server drops without an answer (its `php -S` process
        // died: OMP's exit-139 segfault, app-changes row 18) never fires
        // "response": fail at once, naming the drop, instead of waiting out
        // the 30 s.
        let onFailed = null;
        const dropped = new Promise((resolve, reject) => {
            onFailed = (request) => {
                if (request.method() === 'GET' && /\/api\/v1\/stats\/editorial(\/averages)?(\?|$)/.test(request.url())) {
                    reject(new Error(`server dropped ${request.url()}: ${(request.failure() || {}).errorText || 'no answer'}`));
                }
            };
            this.page.on('requestfailed', onFailed);
        });
        const done = Promise.race([all, dropped]).finally(() => this.page.off('requestfailed', onFailed));
        const out = done.then(async (responses) => {
            await expect(this.spinner).toHaveCount(0, {timeout: T});
            return responses;
        });
        out.catch(() => {}); // the caller awaits it after its click
        return out;
    }

    /** Type the page's address (or `address`, a side-menu one); resolves once "Trends" is drawn. */
    async goto(address = this.url()) {
        await this.page.goto(address);
        await this.arrived();
    }

    /** The page is up: "Trends" drawn with its rows. */
    async arrived() {
        await expect(this.trends).toBeVisible({timeout: T});
        await expect(this.trendRows.first()).toBeVisible({timeout: T});
        await expect(this.range).not.toBeEmpty({timeout: T});
    }

    async reload() {
        await this.page.reload();
        await this.arrived();
    }

    // ---- the chart {OJS OMP} ---------------------------------------------

    /** The stages under the total as `[[name, count]…]`, left to right. */
    async stages() {
        return this.stageBlocks.evaluateAll((blocks) =>
            blocks.map((b) => [
                (b.querySelector('.pkpStats--editorial__stageLabel') || {textContent: ''}).textContent.trim(),
                (b.querySelector('.pkpStats--editorial__stageCount') || {textContent: ''}).textContent.trim(),
            ])
        );
    }

    /**
     * The chart reads `total` over "Active Submissions" and the stages
     * `[[name, count]…]` in order (both polled).
     */
    async expectChart(total, stages) {
        await expect(this.totalHeading).toHaveText(new RegExp(`^\\s*${total}\\s*Active Submissions\\s*$`), {timeout: T});
        await expect.poll(() => this.stages(), {timeout: T}).toEqual(stages.map(([n, c]) => [n, String(c)]));
    }

    /**
     * How many of the canvas's pixels are painted, once Chart.js has sized
     * it (it sets the canvas's inline size when it draws the first time).
     */
    async paintedPixels() {
        await expect(this.canvas).toBeVisible({timeout: T});
        await expect.poll(() => this.canvas.evaluate((c) => !!c.style.width && c.width > 0), {timeout: T}).toBe(true);
        return this.canvas.evaluate((c) => {
            const ctx = /** @type {HTMLCanvasElement} */ (c).getContext('2d');
            const {data} = ctx.getImageData(0, 0, c.width, c.height);
            let n = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
            return n;
        });
    }

    /** A ring is drawn (`true`) or the canvas is left empty (`false`). */
    async expectRing(drawn) {
        if (drawn) await expect.poll(() => this.paintedPixels(), {timeout: T}).toBeGreaterThan(0);
        else await expect.poll(() => this.paintedPixels(), {timeout: T}).toBe(0);
    }

    // ---- "Trends" --------------------------------------------------------

    /** The "Trends" column headings, as a screen reader names them. */
    trendsColumns() {
        return this.trends.getByRole('columnheader');
    }

    /** The table as read: `[[name, middle, total]…]`, each name without its icon label or indent. */
    async readTrends() {
        return this.trendRows.evaluateAll((trs) =>
            trs.map((tr) => {
                const cells = [...tr.querySelectorAll('td, th')];
                const first = cells[0];
                const copy = first.cloneNode(true);
                copy.querySelectorAll('.tooltipButton, .-screenReader, .sr-only, [class*="tooltip"]').forEach((e) => e.remove());
                const name = copy.textContent.replace(/ /g, ' ').replace(/Description for .*$/s, '').replace(/\s+/g, ' ').trim();
                return [name, ...cells.slice(1).map((c) => c.textContent.replace(/\s+/g, ' ').trim())];
            })
        );
    }

    /** The row names, top to bottom. */
    async rowNames() {
        return (await this.readTrends()).map((r) => r[0]);
    }

    /** Poll until the rows' names read `names` in order. */
    async expectRowNames(names) {
        await expect.poll(() => this.rowNames(), {timeout: T}).toEqual(names);
    }

    /**
     * Poll until the named rows read `figures` (`{row: value}`) in one
     * column: `'middle'` (the date range) or `'total'`.
     */
    async expectColumn(column, figures) {
        const at = column === 'middle' ? 1 : 2;
        const pick = async () => {
            const rows = await this.readTrends();
            return Object.fromEntries(Object.keys(figures).map((k) => [k, (rows.find((r) => r[0] === k) || [])[at]]));
        };
        await expect.poll(pick, {timeout: T}).toEqual(Object.fromEntries(Object.entries(figures).map(([k, v]) => [k, String(v)])));
    }

    /** One column's figures, top to bottom (`'middle'` or `'total'`); read it through `expect.poll`. */
    async columnValues(column) {
        const at = column === 'middle' ? 1 : 2;
        return (await this.readTrends()).map((r) => r[at]);
    }

    /** A row by its name (the whole name; the indent and icon label allowed). */
    row(name) {
        return this.trendRows.filter({has: this.page.locator('td, th').first().filter({hasText: new RegExp(`^[\\s\\u2003]*${escapeRe(name)}(\\s|$)`)})});
    }

    /**
     * Where each row's name starts, in pixels from the page's left edge: the
     * left of its first letter (the indent's em space is not a letter).
     * `{name: x}`.
     */
    async nameStarts() {
        return this.trendRows.evaluateAll((trs) =>
            Object.fromEntries(
                trs.map((tr) => {
                    const cell = tr.querySelector('td, th');
                    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
                    let node;
                    let x = null;
                    let name = '';
                    while ((node = walker.nextNode())) {
                        const t = node.textContent || '';
                        const i = t.search(/[^\s ]/);
                        if (i < 0) continue;
                        const range = document.createRange();
                        range.setStart(node, i);
                        range.setEnd(node, i + 1);
                        x = range.getBoundingClientRect().left;
                        name = t.replace(/ /g, ' ').trim();
                        break;
                    }
                    return [name, x];
                })
            )
        );
    }

    /** A row's information icon. */
    infoIconFor(name) {
        return this.row(name).locator('.tooltipButton').first();
    }

    /**
     * Rest the pointer on a row's icon and read the text it shows. The row
     * may sit below the fold, and a hover right after the page settles can
     * land before the tooltip listens: the pointer is moved off and back
     * until the text shows.
     */
    async iconText(name) {
        const icon = this.infoIconFor(name);
        const tip = this.page.locator('.v-popper__popper--shown .v-popper__inner');
        await expect(icon).toBeVisible({timeout: T});
        await expect(async () => {
            await this.page.mouse.move(0, 0);
            await icon.scrollIntoViewIfNeeded();
            await icon.hover();
            await expect(tip.last()).toBeVisible({timeout: 2_000});
        }).toPass({intervals: [250, 500, 1_000], timeout: T});
        const text = (await tip.last().innerText()).replace(/\s+/g, ' ').trim();
        await this.page.mouse.move(0, 0);
        await expect(tip).toHaveCount(0, {timeout: T});
        return text;
    }

    // ---- the date range (U64's control) ----------------------------------

    /** The presets' labels, top to bottom (the list opened, then closed again). */
    async presetLabels() {
        await this.openRangeList();
        const labels = (await this.presets.allInnerTexts()).map((s) => s.trim());
        await this.calendarButton.click();
        await expect(this.rangeList).toBeHidden({timeout: T});
        return labels;
    }

    /** The Custom Range legend shown in the open list. */
    customRangeLegend() {
        return this.customLegend;
    }

    // ---- "Filters" (h2 headings here) ------------------------------------

    filterSet(heading) {
        return this.sidebar.locator('.pkpStats__filterSet').filter({has: this.page.locator('h2', {hasText: new RegExp(`^\\s*${escapeRe(heading)}\\s*$`)})});
    }

    filterHeadings() {
        return this.sidebar.locator('.pkpStats__filterSet h2');
    }

    /** Press "Filters" while the panel is open: it closes and the table is recounted. */
    async closeFilters() {
        await this.toggleFilters({refetch: true});
        await this.expectFiltersOpen(false);
    }
}

// ---------------------------------------------------------------------------
// Statistics › "Users"
// ---------------------------------------------------------------------------

class UserStatsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {name: 'Registered users', exact: true});
        this.exportButton = page.locator('main').getByRole('button', {name: 'Export', exact: true}).first();
        this.table = page.getByRole('table', {name: 'Registered users'});
        this.rows = this.table.locator('tbody tr');
    }

    url() {
        return this.contextUrl(this.contextPath, '/stats/users');
    }

    /** Type the address (or `address`, a side-menu one); resolves once the table is drawn. */
    async goto(address = this.url()) {
        await this.page.goto(address);
        await this.arrived();
    }

    async arrived() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.rows.first()).toBeVisible({timeout: T});
    }

    async reload() {
        await this.page.reload();
        await this.arrived();
    }

    /** The table's rows as `[[name, total]…]`. */
    async readRows() {
        return this.rows.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.textContent.replace(/\s+/g, ' ').trim())));
    }

    /** The columns as a screen reader names them. */
    columnHeaders() {
        return this.table.getByRole('columnheader');
    }

    /** Press "Export"; returns the window, open. */
    async openExport() {
        await this.exportButton.click();
        const win = new UserExportWindow(this.page);
        await win.ready();
        return win;
    }
}

class UserExportWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Export to Excel/CSV'});
        this.title = this.dialog.getByRole('heading', {name: 'Export to Excel/CSV', exact: true});
        this.group = this.dialog.getByRole('group', {name: 'User Group'});
        this.description = this.group.getByText('Select the users to be exported to an Excel/CSV file.', {exact: true});
        this.boxes = this.dialog.getByRole('checkbox');
        this.exportButton = this.dialog.getByRole('button', {name: 'Export', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true});
    }

    async ready() {
        await expect(this.title).toBeVisible({timeout: T});
        await expect(this.boxes.first()).toBeVisible({timeout: T});
    }

    /** The boxes as `[[label, ticked]…]`, top to bottom. */
    async boxStates() {
        return this.boxes.evaluateAll((inputs) =>
            inputs.map((i) => [((i.labels && i.labels[0]) || i.closest('label') || {textContent: ''}).textContent.replace(/\s+/g, ' ').trim(), /** @type {HTMLInputElement} */ (i).checked])
        );
    }

    /** A box by its role name. */
    box(label) {
        return this.dialog.getByRole('checkbox', {name: label, exact: true});
    }

    /** Leave exactly `labels` ticked (every other box unticked). */
    async tickOnly(labels) {
        const states = await this.boxStates();
        for (const [label, ticked] of states) {
            const want = labels.includes(label);
            if (want !== ticked) await this.box(label).setChecked(want);
        }
        await expect.poll(async () => (await this.boxStates()).filter(([, t]) => t).map(([l]) => l), {timeout: T}).toEqual(states.map(([l]) => l).filter((l) => labels.includes(l)));
    }

    /** The dialog's buttons, as a screen reader names them. */
    async buttonNames() {
        return this.dialog.getByRole('button').evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()));
    }

    /** Where the window sits on the screen (`{x, y, width, height}`). */
    async position() {
        await expect(this.title).toBeVisible({timeout: T});
        return this.dialog.boundingBox();
    }

    /**
     * Press the window's "Export": the file (`{name, bom, text, rows}`); the
     * window closes and the modal slot is waited out.
     */
    async export() {
        const arrived = this.page.waitForEvent('download', {timeout: T});
        await this.exportButton.click();
        const file = await readDownload(await arrived);
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return file;
    }

    /** Press the arrow ("Close"); the modal slot is waited out. */
    async close() {
        await this.closeButton.click();
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
    }
}

// ---------------------------------------------------------------------------
// Statistics › "Reports"
// ---------------------------------------------------------------------------

class EditorialReportsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.locator('main h1').first();
        this.panel = page.locator('main .app__contentPanel');
        this.line = this.panel.locator('p').first();
        this.links = this.panel.locator('a');
    }

    url() {
        return this.contextUrl(this.contextPath, '/stats/reports');
    }

    /** Type the address (or `address`, a side-menu one); resolves once the heading and line show. */
    async goto(address = this.url()) {
        await this.page.goto(address);
        await this.arrived();
    }

    async arrived() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.line).toBeVisible({timeout: T});
    }

    /** A report's link by its name. */
    link(name) {
        return this.panel.getByRole('link', {name, exact: true});
    }

    /**
     * Press a report's link: its file (`{name, bom, text, rows}`). A report
     * that fails answers `stats/reports/report` with 500 and no download;
     * that is raised here with the status, never waited out.
     */
    async download(name) {
        return downloadFromLink(this.page, this.link(name));
    }
}

/**
 * Press a report link (the Reports page's or a plugin row's "Reports"): its
 * file, or a failure naming the answer's status when the report fails.
 */
async function downloadFromLink(page, link) {
    const arrived = page.waitForEvent('download', {timeout: T}).then((d) => ({download: d}));
    const failed = page
        .waitForResponse((r) => /\/stats\/reports\/report(\?|$)/.test(r.url()) && r.status() >= 400, {timeout: T})
        .then((r) => ({failed: r.status()}));
    arrived.catch(() => {});
    failed.catch(() => {});
    await link.click();
    const outcome = await Promise.race([arrived, failed]);
    if ('failed' in outcome) throw new Error(`the report answered ${outcome.failed} and no file arrived`);
    return readDownload(outcome.download);
}

// ---------------------------------------------------------------------------
// The monthly statistics email
// ---------------------------------------------------------------------------

/** The `<a>` links of an email's HTML as `[{text, href}]`. */
function emailLinks(html) {
    const out = [];
    const re = /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html || '')) !== null) {
        out.push({text: m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), href: m[2].replace(/&amp;/g, '&')});
    }
    return out;
}

/**
 * Every statistics email `to` received, newest first, each as `{id,
 * subject, from, text, html, links, attachments: [{name, bom, text,
 * rows}]}`. Waits for at least `atLeast` of them (the bound of any "no
 * further email" read the caller makes). The subject marker is
 * "activity for" (a preprint server's reads "Preprint Server activity for").
 */
async function statisticsEmails(pkpMail, to, {atLeast = 1, timeoutMs = 30_000} = {}) {
    const deadline = Date.now() + timeoutMs;
    let found = [];
    for (;;) {
        const result = await pkpMail._search({to, subject: 'activity for'});
        found = result.messages || [];
        if (found.length >= atLeast || Date.now() > deadline) break;
        await new Promise((r) => setTimeout(r, 500));
    }
    if (found.length < atLeast) throw new Error(`statisticsEmails: ${found.length} of ${atLeast} email(s) to ${to} within ${timeoutMs} ms`);
    const out = [];
    for (const m of found) {
        const full = await pkpMail.fullMessage(m.ID);
        const attachments = [];
        for (const a of full.Attachments || []) {
            const response = await fetch(`${pkpMail.url}/api/v1/message/${m.ID}/part/${a.PartID}`);
            attachments.push({name: a.FileName, ...csvFile(Buffer.from(await response.arrayBuffer()))});
        }
        out.push({id: m.ID, subject: full.Subject, from: full.From, text: full.Text || '', html: full.HTML || '', links: emailLinks(full.HTML), attachments});
    }
    return out;
}

/** The count of statistics emails `to` holds now (after a bounding read). */
async function statisticsEmailCount(pkpMail, to) {
    return pkpMail.count({to, subject: 'activity for'});
}

/**
 * An attachment's blocks, split at its empty lines: `[[row…]…]`, each block
 * a list of rows (its first row the block's heading line).
 */
function csvBlocks(rows) {
    const blocks = [[]];
    for (const r of rows) {
        if (r.length === 0) blocks.push([]);
        else blocks[blocks.length - 1].push(r);
    }
    return blocks.filter((b) => b.length);
}

module.exports = {
    DENIED,
    EditorialActivityPage,
    UserStatsPage,
    UserExportWindow,
    EditorialReportsPage,
    downloadFromLink,
    statsAddresses,
    accessDenied,
    expectAccessDenied,
    readDownload,
    csvFile,
    csvBlocks,
    asRecord,
    statisticsEmails,
    statisticsEmailCount,
    emailLinks,
};
