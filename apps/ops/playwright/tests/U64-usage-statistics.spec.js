// @ts-check
/**
 * @file playwright/tests/U64-usage-statistics.spec.js
 *
 * Statistics — usage — OPS suite, one test per canonical scenario the spec
 * runs on a preprint server in the parallel `ops` project: S1–S6 and S9
 * (common), in the server's own words ("Preprints", "Server", the
 * Moderator as the Section Editor, the Editorial Board Member in the
 * Copyeditor's place). S7, S8 and S10 change the installation's statistics
 * settings, so they run `@solo` in the serial project:
 * `tests/serial/U64-usage-statistics.spec.js`. S11–S13 are {OJS}: a
 * preprint server has no "Issues" page (S1 reads the side menu without
 * it), no COUNTER Release 4 page and no "JATS" column (S1 reads the
 * columns without it). A preprint server has no Reviewer, so S2 has none;
 * the seeded server has its one section, so S1 reads "Filters" absent
 * (OPS1), and S3 and S5 filter by the scratch server's two sections.
 * Spec: docs/specs/U64-usage-statistics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A5: S9 never opens the Moderator's "Counter R5" while the server is
 *   restricted.
 * - A1–A4, A6–A11: not on these scenarios' paths. OJS1–OJS6: the
 *   journal's. OMP1, OMP2, OMP4: the press's.
 *
 * Seeding (footnote sc): S1 and S2 read `publicknowledge` with the OPS
 * roster (never seeded with figures). Every other scenario builds its own
 * scratch server with `POST scenarios/context` (a throwaway Preprint
 * Server Manager, a Moderator with no section in S3 and S9, the authors)
 * and its preprints with `POST scenarios/submission` `published: true`,
 * `galleys[]` of `preprint.pdf` / `preprint.html` (and a `Data Set` file in
 * S5) and a `datePublished` before every visit day; the visits are `usage[]`
 * entries on the preprints and the server (home page). Scratch names
 * ("Axolotl limb memory") live in the test's own server, so a search or a
 * count reads that server alone.
 *
 * Every absence is read settled (the table's own fetch after the action
 * that would change it, the stats requests sent while an action that must
 * send none runs) and paired with a positive control taken the same way
 * (M4, M6). The SUSHI address is read by direct request in S9 alone, the
 * Frame's one exception (footnote n). Waits are web-first or bounded by the
 * screen's own answer (A5); the one page timer waits out the modal store's
 * slot after a Download window closes (patterns.md pitfall 4).
 */
const {test, expect} = require('../support/fixtures.js');
const {EditorialChrome} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {
    StatsPage,
    CounterR5Page,
    JournalStatisticsTab,
    utcDay,
    dayLabel,
    monthLabel,
} = require('../../../../shared/playwright/pages/UsageStatsPages.js');

const T = 30_000;
const SERVER = 'publicknowledge';
const SERVER_NAME = 'Public Knowledge Preprint Server';

// ---- the OPS words (Fields) ------------------------------------------------------------
const W = {
    articles: 'Preprints',
    journal: 'Server',
    counter: 'Counter R5',
    articlesTab: 'Preprint Stats',
    details: 'Preprint Details',
    count: (n, total) => `${n} of ${total} preprints`,
    noArticles: 'No preprints were found with usage statistics matching these parameters.',
    columns: ['Title', 'Abstract Views', 'File Views', 'PDF', 'HTML', 'Other', 'Total'],
    journalTooltip: "Number of visitors viewing the server's index page.",
    articlesWindow: 'Download a CSV/Excel spreadsheet with usage statistics for preprints matching the following parameters.',
    journalWindow: 'Download a CSV/Excel spreadsheet with usage statistics for this server matching the following parameters.',
    downloadArticles: 'Download Preprints',
    downloadJournal: 'Download Server',
    articleColumns: ['ID', 'Title', 'Authors', 'Date Posted', 'Total', 'Abstract Views', 'File Views', 'PDF', 'HTML', 'Other'],
    fileColumns: ['Preprint ID', 'Preprint Title', 'File ID', 'File Name', 'Type', 'File Views'],
};
const COUNTER_REPORTS = ['Platform Master Report (PR)', 'Platform Usage (PR_P1)', 'Item Master Report (IR)'];
const REPORT_IDS = ['PR', 'PR_P1', 'IR'];
const PRESETS = ['Last 30 days', 'Last 90 days', 'Last 12 months', 'All dates'];
const DENIED = 'The current role does not have access to this operation.';

const AXOLOTL = 'Axolotl limb memory';
const QUOKKA = 'Quokka survey';
const OKAPI = 'Okapi field notes';
const WOMBAT = 'Wombat notes';
const PUBLISHED = '2024-01-15';
const PDF = {label: 'PDF', file: 'preprint.pdf'};
const HTML = {label: 'HTML', file: 'preprint.html'};

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u64${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The throwaway accounts of a scratch server. */
function people(tag) {
    return {manager: `${tag}mg`, se: `${tag}se`, au1: `${tag}a1`, au2: `${tag}a2`};
}

/**
 * A scratch server named "Okapi Server {tag}" with a Preprint Server
 * Manager, a Moderator with no section and two authors ("Quill", "Zephyr").
 */
async function seedServer(api, tag, extra = {}) {
    const p = people(tag);
    const res = await api.createContext({
        tag,
        context: {name: {en: `Okapi Server ${tag}`}},
        users: [
            {username: p.manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: p.se, givenName: 'Sid', familyName: 'Sectioned', roles: ['sectionEditor']},
            {username: p.au1, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
            {username: p.au2, givenName: 'Bruno', familyName: 'Zephyr', roles: ['author']},
        ],
        ...extra,
    });
    return {...p, name: `Okapi Server ${tag}`, res};
}

/** The sections of S3 and S5: "Articles" (the renamed default) and "Reviews". */
const TWO_SECTIONS = {
    sections: [
        {abbrev: 'ART', title: 'Articles'},
        {abbrev: 'REV', title: 'Reviews'},
    ],
};

/** A published preprint of the scratch server (`datePublished` before every visit day). */
function seedWork(api, tag, key, title, submitter, extra = {}) {
    return api.createSubmission({
        tag: `${tag}${key}`,
        context: tag,
        submitter,
        title,
        published: true,
        datePublished: PUBLISHED,
        ...extra,
    });
}

/** A page of `username`'s own browser. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The chart of the last 30 days as read: `[[label, value]…]`, `values` by days ago (default 0). */
function lastThirty(values = {}) {
    const out = [];
    for (let n = 31; n >= 1; n--) out.push([dayLabel(utcDay(n)), String(values[n] || 0)]);
    return out;
}

/** The "Last 30 days" range as the page writes it. */
const RANGE_30 = () => `${utcDay(31)} — ${utcDay(1)}`;
/** … and as the Download window and its files write it. */
const RANGE_30_FILE = () => `${utcDay(31)} to ${utcDay(1)}`;

/** A file name of the statistics downloads: "stats_{part}_{UTC date}T{HH-MM_SS}.csv". */
function statsFileName(part) {
    return new RegExp(`^stats_${part}_${utcDay(0)}T\\d{2}-\\d{2}_\\d{2}\\.csv$`);
}

/** Open a Statistics entry from the side menu; resolves once the page's first fetch answered. */
async function openFromSideMenu(page, entry, stats) {
    const chrome = new EditorialChrome(page);
    await expect(chrome.sideNav.locator('[data-pc-section="header"]').first()).toBeVisible({timeout: T});
    const listed = stats.listFetched();
    await chrome.chooseSideEntry('Statistics', entry);
    await listed;
    await expect(stats.heading).toBeVisible({timeout: T});
}

/** The page header's button by name (the header "Filters" would sit in, beside the date range). */
function headerButton(page, name) {
    return page.locator('.pkpStats .pkpHeader').first().getByRole('button', {name, exact: true});
}

test.describe('Statistics — usage', () => {
    test('S1: the Statistics pages before any figures', async ({asUser}) => {
        test.setTimeout(180_000);
        const page = await pageAs(asUser, 'manager.maya');

        // The side menu: the "Statistics" group lists "Preprints", "Server"
        // and "Counter R5", and no "Issues" (Rule 6; Fields).
        await page.goto(`/index.php/${SERVER}/en/dashboard/editorial`);
        const chrome = new EditorialChrome(page);
        await expect(chrome.sideNav.locator('[data-pc-section="header"]').first()).toBeVisible({timeout: T});
        await expect.poll(() => chrome.sideGroupItems('Statistics'), {timeout: T}).toEqual(expect.arrayContaining([W.articles, W.journal, W.counter]));
        expect(await chrome.sideGroupItems('Statistics')).not.toContain('Issues');

        // "Preprints": tab title, heading, range, chart buttons, a flat chart,
        // the empty table (Rules 5, 7, 10, 12; Fields).
        const articles = new StatsPage(page, SERVER, 'articles');
        await openFromSideMenu(page, W.articles, articles);
        await expect(page).toHaveTitle(new RegExp(`^${W.articlesTab}`));
        await expect(articles.heading).toHaveText(W.articles);
        await expect(articles.range).toHaveText(RANGE_30());
        await expect(articles.chartButton('Abstracts')).toHaveAttribute('aria-pressed', 'true');
        await expect(articles.chartButton('Files')).toHaveAttribute('aria-pressed', 'false');
        await expect(articles.chartButton('Daily')).toHaveAttribute('aria-pressed', 'true');
        await expect(articles.chartButton('Monthly')).toBeDisabled();
        await articles.expectTimeline(lastThirty());
        await expect(articles.tableTitle).toHaveText(W.details);
        await articles.expectCount(W.count(0, 0));
        await articles.expectColumns(W.columns);
        await expect(articles.emptyLine(W.noArticles)).toBeVisible();
        await expect(articles.itemRows).toHaveCount(0);

        // "Filters": the server with its one section offers none (Rule 11;
        // OPS1). Control: the same header's date range button.
        await expect(headerButton(page, 'Change date range')).toBeVisible();
        await expect(articles.filtersButton).toHaveCount(0);
        await expect(articles.sidebar).toHaveCount(0);

        // The "Download" window: no filter row; control: no "Geographic"
        // panel (Fields; Rule 18; Settings bullet 1).
        const window = await articles.openDownload();
        await expect(window.description).toHaveText(W.articlesWindow);
        await window.expectParams([['Date Range', RANGE_30_FILE()]]);
        await expect.poll(() => window.headings(), {timeout: T}).toEqual([W.articles, 'Files', 'Timeline']);
        await expect(window.panelButton(W.articles)).toHaveText(W.downloadArticles);
        await expect(window.panelButton('Files')).toHaveText('Download Files');
        await expect(window.panelButton('Timeline')).toHaveText('Download Timeline');
        await expect(window.panel('Geographic')).toHaveCount(0);
        await window.close();

        // "Server": heading, chart buttons, the one row at 0 linking to the
        // home page in a new tab, the information icon's text (Rules 5, 14).
        const journal = new StatsPage(page, SERVER, 'journal');
        await openFromSideMenu(page, W.journal, journal);
        await expect(journal.heading).toHaveText(W.journal);
        await expect(journal.chartButtons).toHaveText(['Daily', 'Monthly']);
        await expect(journal.tableTitle).toContainText('Views');
        await expect(journal.downloadReportButton).toBeVisible();
        await expect(journal.itemRows).toHaveCount(1);
        await expect(journal.cells(SERVER_NAME)).toHaveText([SERVER_NAME, '0']);
        await expect(journal.rowLink(SERVER_NAME)).toHaveAttribute('target', '_blank');
        await expect(journal.rowLink(SERVER_NAME)).toHaveAttribute('href', new RegExp(`/index\\.php/${SERVER}(/en)?/?$`));
        await expect(journal.infoIcon).toContainText('About server statistics');
        expect(await journal.tooltip()).toBe(W.journalTooltip);

        // "Counter R5": heading, line, the server's reports (Rule 19; Fields).
        const counter = new CounterR5Page(page, SERVER);
        await openFromSideMenu(page, W.counter, counter);
        await expect(counter.heading).toHaveText('Counter R5 Reports');
        await expect(counter.docLine).toHaveText('See COUNTER 5.0.3 documentation for more information about each report.');
        await expect(counter.listTitle).toHaveText('Counter R5 Reports');
        await expect(counter.rows).toHaveCount(COUNTER_REPORTS.length);
        for (const [i, report] of COUNTER_REPORTS.entries()) {
            await expect(counter.rows.nth(i)).toContainText(report);
            await expect(counter.rows.nth(i).getByRole('button', {name: 'Edit', exact: true})).toBeVisible();
        }
    });

    test('S2: roles kept off the Statistics pages', async ({asUser, browser, baseURL}) => {
        test.setTimeout(240_000);
        const pages = [
            ['articles', `/index.php/${SERVER}/stats/publications/publications`, W.articles],
            ['journal', `/index.php/${SERVER}/stats/context/context`, W.journal],
            ['counter', `/index.php/${SERVER}/stats/counterR5/counterR5`, 'Counter R5 Reports'],
        ];

        // The Moderator (the Section Editor) and (control) the Preprint Server
        // Manager: each address opens its page (Actors row 1).
        for (const username of ['sectioneditor.ana', 'manager.maya']) {
            const page = await pageAs(asUser, username);
            for (const [kind, url, heading] of pages) {
                await page.goto(url);
                await expect(page.locator('main h1').first(), `${username} on ${kind}`).toHaveText(heading, {timeout: T});
                await expect(page).not.toHaveURL(/authorizationDenied/);
            }
        }

        // Author, Reader and Editorial Board Member (in the Copyeditor's
        // place; a preprint server has no Reviewer): the access-denied page
        // at every address (Actors row 1).
        for (const username of ['author.alex', 'reader.rosa', 'assistant.rita']) {
            const page = await pageAs(asUser, username);
            for (const [kind, url] of pages) {
                await page.goto(url);
                await expect(page, `${username} on ${kind}`).toHaveURL(/\/user\/authorizationDenied/);
                await expect(page.getByText(DENIED, {exact: true})).toBeVisible();
                await expect(page.locator('.pkpStats, .counterReportsListPanel')).toHaveCount(0);
            }
        }

        // Signed out: the "Preprints" address shows the Login page (Actors row 1).
        const visitor = await (await browser.newContext({baseURL, storageState: {cookies: [], origins: []}})).newPage();
        await visitor.goto(pages[0][1]);
        await expect(visitor).toHaveURL(/\/login/);
        await expect(visitor.locator('form#login, form.cmp_form.login').first()).toBeVisible();
        await visitor.context().close();
    });

    test('S3: reading the figures on "Preprints"', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const j = await seedServer(opsApi, tag, TWO_SECTIONS);
        const [axolotl] = await Promise.all([
            seedWork(opsApi, tag, 'ax', AXOLOTL, j.au1, {
                section: 'ART',
                galleys: [PDF, HTML],
                usage: [{daysAgo: 1, abstractViews: 10, fileViews: [4, 2]}],
            }),
            seedWork(opsApi, tag, 'qu', QUOKKA, j.au2, {
                section: 'REV',
                galleys: [PDF],
                usage: [{daysAgo: 10, abstractViews: 3, fileViews: [1]}],
            }),
            seedWork(opsApi, tag, 'ok', OKAPI, j.au1, {section: 'ART', usage: [{daysAgo: 5, abstractViews: 6}]}),
            seedWork(opsApi, tag, 'wo', WOMBAT, j.au2, {section: 'ART', usage: [{daysAgo: 200, abstractViews: 7}]}),
        ]);

        // The table: most-viewed first, the figures, the author list in bold
        // before the title (Rules 1, 12). Control: "Wombat notes" has no row.
        const page = await pageAs(asUser, j.manager);
        const stats = new StatsPage(page, tag, 'articles');
        await stats.goto();
        await stats.expectCount(W.count(3, 3));
        await expect(stats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`, `Zephyr ${QUOKKA}`]);
        await expect(stats.cells(AXOLOTL)).toHaveText([`Quill ${AXOLOTL}`, '10', '6', '4', '2', '0', '16']);
        await expect(stats.cells(OKAPI)).toHaveText([`Quill ${OKAPI}`, '6', '0', '0', '0', '0', '6']);
        await expect(stats.cells(QUOKKA)).toHaveText([`Zephyr ${QUOKKA}`, '3', '1', '1', '0', '0', '4']);
        await expect(stats.row(AXOLOTL).locator('.pkpStats__itemAuthors')).toHaveText('Quill');
        expect(await stats.authorWeight(AXOLOTL), 'the author list is bold').toBeGreaterThanOrEqual(600);
        await expect(stats.row(WOMBAT)).toHaveCount(0);

        // "Total" reverses the order and restores it; "Abstract Views" does
        // not sort (Rule 12).
        await stats.sortByTotal();
        await expect(stats.rowTitles()).toHaveText([`Zephyr ${QUOKKA}`, `Quill ${OKAPI}`, `Quill ${AXOLOTL}`]);
        await stats.sortByTotal();
        await expect(stats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`, `Zephyr ${QUOKKA}`]);
        const abstractHead = stats.table.getByRole('columnheader', {name: 'Abstract Views', exact: true});
        await expect(abstractHead.getByRole('button')).toHaveCount(0);
        const sent = await stats.statsFetchesDuring(async () => {
            await abstractHead.click();
            await expect(stats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`, `Zephyr ${QUOKKA}`]);
        });
        expect(sent, 'pressing "Abstract Views" fetches nothing').toEqual([]);

        // The chart: abstracts by day, then files (Rules 10, 12).
        await stats.expectTimeline(lastThirty({1: 10, 5: 6, 10: 3}));
        await stats.pressChart('Files');
        await stats.expectTimeline(lastThirty({1: 6, 10: 1}));
        await stats.pressChart('Abstracts');

        // The title link opens the posted page in a new tab (Rule 12).
        await expect(stats.rowLink(AXOLOTL)).toHaveAttribute('target', '_blank');
        const popupOpened = page.waitForEvent('popup', {timeout: T});
        await stats.rowLink(AXOLOTL).click();
        const popup = await popupOpened;
        await expect(popup).toHaveURL(new RegExp(`/index\\.php/${tag}/preprint/view/${axolotl.submissionId}`));
        await expect(popup.locator('h1').first()).toContainText(AXOLOTL);
        await popup.close();

        // Search: typing alone changes nothing; Enter narrows; "×" restores;
        // a phrase with no match empties the table and flattens the chart
        // (Rule 13).
        await expect(stats.searchBox).toHaveAttribute('placeholder', 'Search by title, author and ID');
        const typed = await stats.statsFetchesDuring(async () => {
            await stats.searchBox.fill('Quokka');
            await expect(stats.itemRows).toHaveCount(3);
        });
        expect(typed, 'typing without Enter fetches nothing').toEqual([]);
        await stats.expectCount(W.count(3, 3));
        const drawn = stats.timelineFetched();
        await stats.search('Quokka');
        await drawn;
        await expect(stats.rowTitles()).toHaveText([`Zephyr ${QUOKKA}`]);
        await stats.expectCount(W.count(1, 1));
        await stats.expectTimeline(lastThirty({10: 3}));
        await stats.clearSearch();
        await expect(stats.itemRows).toHaveCount(3);
        await stats.search('zzzz');
        await stats.expectCount(W.count(0, 0));
        await expect(stats.emptyLine(W.noArticles)).toBeVisible();
        await expect(stats.itemRows).toHaveCount(0);
        await stats.expectTimeline(lastThirty());
        await stats.clearSearch();
        await expect(stats.itemRows).toHaveCount(3);

        // Filters: names under "Sections" add up; the "×" drops a name;
        // closing the panel drops all (Rule 11; OPS1: two sections).
        await stats.toggleFilters();
        await stats.expectFiltersOpen(true);
        await expect(stats.filterHeadings()).toHaveText(['Sections']);
        await stats.pressFilter('Sections', 'Reviews');
        await expect(stats.rowTitles()).toHaveText([`Zephyr ${QUOKKA}`]);
        await stats.pressFilter('Sections', 'Articles');
        await expect(stats.itemRows).toHaveCount(3);
        await stats.clearFilter('Reviews');
        await expect(stats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`]);
        await stats.toggleFilters({refetch: true});
        await stats.expectFiltersOpen(false);
        await expect(stats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`, `Zephyr ${QUOKKA}`]);

        // The Moderator, assigned to nothing: the same rows and figures
        // (Actors preamble).
        const sePage = await pageAs(asUser, j.se);
        const seStats = new StatsPage(sePage, tag, 'articles');
        await seStats.goto();
        await seStats.expectCount(W.count(3, 3));
        await expect(seStats.rowTitles()).toHaveText([`Quill ${AXOLOTL}`, `Quill ${OKAPI}`, `Zephyr ${QUOKKA}`]);
        await expect(seStats.cells(AXOLOTL)).toHaveText([`Quill ${AXOLOTL}`, '10', '6', '4', '2', '0', '16']);
        await expect(seStats.cells(OKAPI)).toHaveText([`Quill ${OKAPI}`, '6', '0', '0', '0', '0', '6']);
        await expect(seStats.cells(QUOKKA)).toHaveText([`Zephyr ${QUOKKA}`, '3', '1', '1', '0', '0', '4']);
        await expect(seStats.row(WOMBAT)).toHaveCount(0);
    });

    test('S4: choosing the date range', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s4', testInfo);
        const j = await seedServer(opsApi, tag, {
            usage: [
                {daysAgo: 1, views: 2},
                {daysAgo: 10, views: 3},
                {daysAgo: 45, views: 4},
                {daysAgo: 400, views: 1},
            ],
        });
        await seedWork(opsApi, tag, 'ax', AXOLOTL, j.au1, {
            datePublished: '2024-03-05',
            usage: [
                {daysAgo: 1, abstractViews: 2},
                {daysAgo: 45, abstractViews: 4},
                {daysAgo: 200, abstractViews: 8},
            ],
        });
        const page = await pageAs(asUser, j.manager);
        const stats = new StatsPage(page, tag, 'articles');
        const total = () => stats.cells(AXOLOTL).last();

        // On arrival (Rules 7, 10).
        await stats.goto();
        await expect(stats.range).toHaveText(RANGE_30());
        await expect(stats.chartButton('Daily')).toHaveAttribute('aria-pressed', 'true');
        await expect(stats.chartButton('Monthly')).toBeDisabled();
        await expect(total()).toHaveText('2');

        // The presets (Rules 7, 10; Fields).
        await stats.openRangeList();
        await expect(stats.presets).toHaveText(PRESETS);
        await expect(stats.customLegend).toHaveText('Custom Range');
        await expect(stats.startBox).toBeVisible();
        await expect(stats.endBox).toBeVisible();
        await expect(stats.applyButton).toBeVisible();
        await stats.choosePreset('Last 90 days');
        await expect(total()).toHaveText('6');
        await expect(stats.chartButton('Daily')).toBeEnabled();
        await expect(stats.chartButton('Monthly')).toBeEnabled();
        await stats.choosePreset('Last 12 months');
        await expect(total()).toHaveText('14');
        await expect(stats.chartButton('Monthly')).toHaveAttribute('aria-pressed', 'true');
        await expect(stats.chartButton('Daily')).toBeDisabled();

        // "All dates" starts at the first publication, by month (Rules 9, 10).
        await stats.choosePreset('All dates');
        await expect(stats.range).toHaveText('All dates');
        await expect(total()).toHaveText('14');
        await expect(stats.chartButton('Monthly')).toHaveAttribute('aria-pressed', 'true');
        await expect(stats.chartButton('Daily')).toBeDisabled();
        await expect.poll(async () => (await stats.timeline())[0], {timeout: T}).toEqual([monthLabel('2024-03-05'), '0']);

        // A Custom Range (Rules 8, 10).
        await stats.applyCustomRange(utcDay(50), utcDay(40));
        const range5040 = `${utcDay(50)} — ${utcDay(40)}`;
        await expect(stats.range).toHaveText(range5040);
        await expect(total()).toHaveText('4');
        await expect(stats.chartButton('Daily')).toBeEnabled();
        await expect(stats.chartButton('Monthly')).toBeEnabled();

        // Refused ranges: each message under "Apply", nothing fetched, the
        // range and the figure unchanged (Rule 8; Fields).
        const refusals = [
            ['2026-9-1', utcDay(1), 'The date format is not valid. Enter each date in the format YYYY-MM-DD.'],
            ['2026-02-30', utcDay(1), 'One of the dates entered does not exist.'],
            [utcDay(10), utcDay(20), 'The start date must be before the end date.'],
            ['2000-12-31', utcDay(1), 'The start date may not be earlier than 2001-01-01.'],
            [utcDay(40), utcDay(0), `The end date may not be later than ${utcDay(1)}.`],
        ];
        for (const [start, end, message] of refusals) {
            const fetched = await stats.applyRefusedRange(start, end, message);
            expect(fetched, `"${start}" — "${end}" fetches nothing`).toEqual([]);
            await expect(stats.rangeList).toBeVisible();
            await expect(stats.range).toHaveText(range5040);
            await expect(total()).toHaveText('4');
        }

        // Control: Enter in the first box applies nothing (Fields), on the
        // page opened afresh.
        await stats.goto();
        await stats.openRangeList();
        await stats.startBox.fill(utcDay(50));
        const entered = await stats.statsFetchesDuring(async () => {
            await stats.startBox.press('Enter');
            await expect(stats.startBox).toHaveValue(utcDay(50));
        });
        expect(entered, 'Enter in a box fetches nothing').toEqual([]);
        await expect(stats.rangeList).toBeVisible();
        await expect(stats.rangeError).toHaveCount(0);
        await expect(stats.range).toHaveText(RANGE_30());
        await expect(total()).toHaveText('2');

        // "Server": the home-page visits per range; "All dates" from January
        // 2001 (Rules 9, 14).
        const journal = new StatsPage(page, tag, 'journal');
        await journal.goto();
        const row = () => journal.cells(j.name).last();
        await expect(row()).toHaveText('5');
        await journal.choosePreset('Last 90 days');
        await expect(row()).toHaveText('9');
        await journal.choosePreset('Last 12 months');
        await expect(row()).toHaveText('9');
        await journal.choosePreset('All dates');
        await expect(row()).toHaveText('10');
        await expect.poll(async () => (await journal.timeline())[0], {timeout: T}).toEqual(['January 2001', '0']);
    });

    test('S5: downloading the spreadsheets', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const j = await seedServer(opsApi, tag, {...TWO_SECTIONS, usage: [{daysAgo: 1, views: 3}]});
        const DATA = 'not-an-image.txt';
        const [axolotl, quokka] = await Promise.all([
            seedWork(opsApi, tag, 'ax', AXOLOTL, j.au1, {
                section: 'ART',
                galleys: [PDF, HTML, {label: 'Data', file: DATA, genre: 'Data Set'}],
                usage: [{daysAgo: 1, abstractViews: 10, fileViews: [4, 2, 1]}],
            }),
            seedWork(opsApi, tag, 'qu', QUOKKA, j.au2, {
                section: 'REV',
                galleys: [PDF],
                usage: [{daysAgo: 10, abstractViews: 3, fileViews: [1]}],
            }),
            seedWork(opsApi, tag, 'wo', WOMBAT, j.au2, {section: 'ART', usage: [{daysAgo: 200, abstractViews: 7}]}),
        ]);
        const page = await pageAs(asUser, j.manager);
        const stats = new StatsPage(page, tag, 'articles');
        await stats.goto();
        await expect(stats.itemRows).toHaveCount(2);
        const files = [];

        // The window of "Preprints": "Sections" · "All Sections" (Fields).
        let window = await stats.openDownload();
        await window.expectParams([
            ['Date Range', RANGE_30_FILE()],
            ['Sections', 'All Sections'],
        ]);
        await expect(window.panelButton(W.articles)).toHaveText(W.downloadArticles);
        await expect(window.panelButton('Files')).toHaveText('Download Files');
        await expect(window.panelButton('Timeline')).toHaveText('Download Timeline');

        // "Download Preprints": the window closes, the file (Rules 1, 16, 17).
        let file = await window.download(W.downloadArticles);
        files.push(file);
        expect(file.name).toMatch(statsFileName('submissions'));
        expect(file.parts.params).toEqual([
            ['Date Range', RANGE_30_FILE()],
            ['Sections', 'All Sections'],
        ]);
        expect(file.parts.columns).toEqual(W.articleColumns);
        expect(file.parts.rows.map((r) => [r[1], r[4], r[6]])).toEqual([
            [AXOLOTL, '16', '6'],
            [QUOKKA, '4', '1'],
        ]);

        // "Download Files": one line per file, its type; the page's "File
        // Views" unchanged (Rules 1, 16, 17).
        window = await stats.openDownload();
        file = await window.download('Download Files');
        files.push(file);
        expect(file.name).toMatch(statsFileName('files'));
        expect(file.parts.columns).toEqual(W.fileColumns);
        const fileLines = file.parts.rows.map((r) => [r[0], r[1], r[3], r[4], r[5]]).sort();
        expect(fileLines).toEqual(
            [
                [String(axolotl.submissionId), AXOLOTL, PDF.file, 'Primary File', '4'],
                [String(axolotl.submissionId), AXOLOTL, HTML.file, 'Primary File', '2'],
                [String(axolotl.submissionId), AXOLOTL, DATA, 'Supplementary File', '1'],
                [String(quokka.submissionId), QUOKKA, PDF.file, 'Primary File', '1'],
            ].sort()
        );
        await expect(stats.cells(AXOLOTL).nth(2)).toHaveText('6');

        // "Download Timeline" of the files' chart (Rules 16, 17; Fields).
        await stats.pressChart('Files');
        window = await stats.openDownload();
        await expect(window.panelLine('Timeline')).toHaveText('The number of downloads for each day.');
        file = await window.download('Download Timeline');
        files.push(file);
        expect(file.name).toMatch(statsFileName('submissions_timeline'));
        expect(file.parts.params).toEqual([
            ['Date Range', RANGE_30_FILE()],
            ['Sections', 'All Sections'],
            ['Timeline Type', 'Downloads'],
            ['Timeline Interval', 'Day'],
        ]);
        expect(file.parts.columns).toEqual(['Date', 'Label', 'Total']);
        expect(file.parts.rows).toHaveLength(31);
        expect(file.parts.rows[30]).toEqual([utcDay(1), dayLabel(utcDay(1)), '6']);

        // Search and filters in the window and the file (Rule 16; Fields).
        await stats.search('Quokka');
        await expect(stats.rowTitles()).toHaveText([`Zephyr ${QUOKKA}`]);
        window = await stats.openDownload();
        await window.expectParams([
            ['Date Range', RANGE_30_FILE()],
            ['Sections', 'All Sections'],
            ['Search Phrase', 'Quokka'],
        ]);
        file = await window.download(W.downloadArticles);
        files.push(file);
        expect(file.parts.params).toContainEqual(['Search Phrase', 'Quokka']);
        expect(file.parts.rows.map((r) => r[1])).toEqual([QUOKKA]);
        await stats.clearSearch();
        await expect(stats.itemRows).toHaveCount(2);
        await stats.toggleFilters();
        await stats.pressFilter('Sections', 'Reviews');
        await expect(stats.rowTitles()).toHaveText([`Zephyr ${QUOKKA}`]);
        window = await stats.openDownload();
        await window.expectParams([
            ['Date Range', RANGE_30_FILE()],
            ['Sections', 'Reviews'],
        ]);
        file = await window.download(W.downloadArticles);
        files.push(file);
        expect(file.parts.params).toContainEqual(['Sections', 'Reviews']);
        expect(file.parts.rows.map((r) => r[1])).toEqual([QUOKKA]);

        // Control: no file from "Preprints" names "Wombat notes" (Rule 16).
        for (const f of files) expect(f.text, `${f.name} leaves out ${WOMBAT}`).not.toContain(WOMBAT);
        expect(files[0].text, 'control: the first file names Axolotl').toContain(AXOLOTL);

        // The window of "Server" and its two files (Rules 14, 16, 17; Fields).
        const journal = new StatsPage(page, tag, 'journal');
        await journal.goto();
        window = await journal.openDownload();
        await expect(window.description).toHaveText(W.journalWindow);
        await window.expectParams([['Date Range', RANGE_30_FILE()]]);
        await expect.poll(() => window.headings(), {timeout: T}).toEqual([W.journal, 'Timeline']);
        await expect(window.panelLine(W.journal)).toHaveText("The number of server's index page views.");
        await expect(window.panelButton(W.journal)).toHaveText(W.downloadJournal);
        file = await window.download(W.downloadJournal);
        expect(file.name).toMatch(statsFileName('context'));
        expect(file.parts.params).toEqual([['Date Range', RANGE_30_FILE()]]);
        expect(file.parts.columns).toEqual(['ID', 'Title', 'Total']);
        expect(file.parts.rows.map((r) => [r[1], r[2]])).toEqual([[j.name, '3']]);
        window = await journal.openDownload();
        file = await window.download('Download Timeline');
        expect(file.name).toMatch(statsFileName('context_timeline'));
        expect(file.parts.columns).toEqual(['Date', 'Label', 'Total']);
        expect(file.parts.rows.map((r) => r[0])).toEqual(Array.from({length: 31}, (_, i) => utcDay(31 - i)));
    });

    test('S6: more than one page of preprints', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const j = await seedServer(opsApi, tag);
        const others = Array.from({length: 30}, (_, i) => `Filler work ${String(i + 1).padStart(2, '0')}`);
        await Promise.all([
            seedWork(opsApi, tag, 'ax', AXOLOTL, j.au1, {usage: [{daysAgo: 1, abstractViews: 5}]}),
            ...others.map((title, i) => seedWork(opsApi, tag, `f${i}`, title, j.au2, {usage: [{daysAgo: 1, abstractViews: 1}]})),
        ]);
        const page = await pageAs(asUser, j.manager);
        const stats = new StatsPage(page, tag, 'articles');

        // Page 1 (Rule 12; Fields).
        await stats.goto();
        await stats.expectCount(W.count(30, 31));
        await expect(stats.itemRows).toHaveCount(30);
        await expect(stats.rowTitles().first()).toHaveText(`Quill ${AXOLOTL}`);
        await expect(stats.pagination.locator('.pkpPagination__page')).toHaveText(['1', '2']);

        // Page 2 (Rule 12).
        await stats.gotoPage(2);
        await expect(stats.itemRows).toHaveCount(1);
        await stats.expectCount(W.count(1, 31));
        await expect(stats.row(AXOLOTL)).toHaveCount(0);

        // The file holds every row (Rule 16).
        const window = await stats.openDownload();
        const file = await window.download(W.downloadArticles);
        expect(file.parts.rows).toHaveLength(31);
        expect(file.parts.rows.map((r) => r[1]).sort()).toEqual([AXOLOTL, ...others].sort());

        // Control: a preset from page 2 is back on page 1 (Rule 7).
        await stats.choosePreset('Last 90 days');
        await stats.expectCount(W.count(30, 31));
        await expect(stats.rowTitles().first()).toHaveText(`Quill ${AXOLOTL}`);
        await expect(stats.pageNumber(1)).toHaveAttribute('aria-current', 'true');
    });

    test("S9: restricting a server's SUSHI address", async ({asUser, opsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s9', testInfo);
        const j = await seedServer(opsApi, tag);
        const status = `/index.php/${tag}/api/v1/stats/sushi/status`;
        const reports = `/index.php/${tag}/api/v1/stats/sushi/reports`;
        const seededReports = `/index.php/${SERVER}/api/v1/stats/sushi/reports`;
        const JSON_ACCEPT = {headers: {Accept: 'application/json'}};
        const visitorContext = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
        const visitor = visitorContext.request;
        const seContext = await asUser(j.se);
        const managerPage = await pageAs(asUser, j.manager);
        const reportIds = async (response) => (await response.json()).map((r) => r.Report_ID);

        // The server's tab: "Public API" alone, ticked (Rule 27; Fields).
        const tab = new JournalStatisticsTab(managerPage, tag);
        await tab.goto();
        expect(await tab.fieldLabels()).toEqual(['Public API']);
        await expect(tab.publicApiBox).toBeChecked();
        await expect(tab.description('Public API')).toHaveText(
            'Whether or not to restrict access to the API endpoints for COUNTER SUSHI statistics. If unchecked, the API will only be accessible to users with admin or manager roles.'
        );

        // Public: signed out, the service status and the report list are
        // served (Actors row 4; Rule 23).
        const served = await visitor.get(status, JSON_ACCEPT);
        expect(served.status()).toBe(200);
        expect((await served.json()).Service_Active).toBe(true);
        const listed = await visitor.get(reports, JSON_ACCEPT);
        expect(listed.status()).toBe(200);
        expect(await reportIds(listed)).toEqual(REPORT_IDS);

        // Restricting: the box unticked and saved stays unticked (Rule 30).
        await tab.publicApiBox.uncheck();
        const saved = await tab.save();
        expect(saved.status()).toBe(200);
        await tab.goto();
        await expect(tab.publicApiBox).not.toBeChecked();

        // Who may fetch now (Actors row 4; Rule 23).
        const out = await visitor.get(reports, JSON_ACCEPT);
        expect(out.status()).toBe(401);
        expect(await out.text()).toContain('You are not authorized to access the requested resource.');
        const se = await seContext.request.get(reports, JSON_ACCEPT);
        expect(se.status()).toBe(401);
        expect(await se.text()).toContain(DENIED);
        const mgr = await managerPage.request.get(reports, JSON_ACCEPT);
        expect(mgr.status()).toBe(200);
        expect(await reportIds(mgr)).toEqual(REPORT_IDS);

        // Control: the seeded server's report list is still served signed
        // out (Rule 30).
        const other = await visitor.get(seededReports, JSON_ACCEPT);
        expect(other.status()).toBe(200);
        expect(await reportIds(other)).toEqual(REPORT_IDS);

        // Public again (Rule 30).
        await tab.publicApiBox.check();
        expect((await tab.save()).status()).toBe(200);
        const again = await visitor.get(reports, JSON_ACCEPT);
        expect(again.status()).toBe(200);
        expect(await reportIds(again)).toEqual(REPORT_IDS);
        await visitorContext.close();
    });
});
