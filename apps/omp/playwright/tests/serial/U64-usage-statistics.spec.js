// @ts-check
/**
 * @file playwright/tests/serial/U64-usage-statistics.spec.js
 *
 * Statistics — usage — OMP suite, the scenarios that change the
 * installation: S7, S8 and S10 (common), in the press's own words (the
 * Press Manager, "Monographs", "Press", the six "Metric Type" boxes of a
 * press, "Use the site as the platform for all presses."). The rest of the
 * feature is `tests/U64-usage-statistics.spec.js`. The journal-only legs
 * of S8 ("Item Master Report (IR)"'s fields and "Submission ID", the
 * institution under "Customer ID") have no press leg here.
 * Spec: docs/specs/U64-usage-statistics.md
 *
 * Serial project, alone (PRINCIPLES A7, A9): each scenario sets the site's
 * own statistics settings, one record every context of the install reads
 * (the geographical level, the SUSHI address's openness, the COUNTER start
 * date, the platform and the Site Name; scenarios.md "`POST site`"), so each
 * test carries `@solo` and runs by itself in the `omp-solo` project after
 * the serial one (harness.md "Project chain"). Each test puts back every
 * site value it touched in a `finally`, even when it fails midway, through
 * `pkpApi.setSite`, never through the tab: a malformed Platform ID left on
 * the tab refuses every later "Save" there (register A10).
 *
 * Deliberately NOT covered (register IDs; the spec's Coverage section is
 * the record of everything else left out):
 * - A3: S8's refusals keep the dates inside the offered months, and S8's
 *   malformed date is read by its format message alone.
 * - A4: S7 never saves the press's "Do not collect any geographical data".
 * - A10: S10 empties the Platform ID before unticking "Platform".
 * - A11: S8 reads "counterReport.tsv" as the comma-separated file it is.
 * - A1, A2, A5–A9, OMP1–OMP3: not on these scenarios' paths. OJS1–OJS6
 *   and OPS1: the journal's and the server's.
 *
 * Seeding (footnote sc): scratch presses from `POST scenarios/context`
 * with a throwaway Press Manager (and a Series editor with no series in
 * S8), books from `POST scenarios/submission` `published: true` with a
 * `datePublished` before every visit day, a `publicationFormats[]` PDF of
 * `genre: 'Book Manuscript'` where a file is read, and `usage[]` visits;
 * S7 sets `enableGeoUsageStats: 'country+region+city'` before seeding the
 * places; S8 sets `counterR5StartDate` to the first day of the fourth month
 * back and `title` "Okapi Site", and its press B holds one book published
 * today. A press has no institution (the context scenario's `institutions[]`
 * is the journal's), so S8's "Customer ID" lists "The World" alone. The
 * Site Administrator is `admin`. The SUSHI report list is read by direct
 * request (the Frame's one exception, footnote n).
 */
const {test, expect} = require('../../support/fixtures.js');
const {SiteSettingsPage} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');
const {markNotices, notices} = require('../../../../../shared/playwright/pages/PluginsPages.js');
const {
    StatsPage,
    CounterR5Page,
    JournalStatisticsTab,
    counterHeader,
    counterTable,
    utcDay,
    monthStart,
    monthEnd,
} = require('../../../../../shared/playwright/pages/UsageStatsPages.js');

const T = 30_000;

// ---- the OMP words and the install values -----------------------------------------------
const GEO = {
    none: 'Do not collect any geographical data',
    country: "Collect the visitor's country",
    region: "Collect the visitor's country and region",
    city: "Collect the visitor's country, region and city",
};
const STATS_INSTALL = {enableGeoUsageStats: 'disabled', enableInstitutionUsageStats: false, isSushiApiPublic: true};
const PLATFORM_INSTALL = {isSiteSushiPlatform: false, sushiPlatformID: null};
const COUNTER_REPORTS = ['Platform Master Report (PR)', 'Platform Usage (PR_P1)', 'Title Master Report (TR)', 'Book Usage by Access Type (TR_B3)'];
const HEADER_LINES = [
    'Report_Name',
    'Report_ID',
    'Release',
    'Institution_Name',
    'Institution_ID',
    'Metric_Types',
    'Report_Filters',
    'Report_Attributes',
    'Exceptions',
    'Reporting_Period',
    'Created',
    'Created_By',
];
/** A press's "Metric Type" boxes: the journal's four and "Unique_Title_Investigations", "Unique_Title_Requests". */
const METRICS = [
    'Total_Item_Investigations',
    'Unique_Item_Investigations',
    'Total_Item_Requests',
    'Unique_Item_Requests',
    'Unique_Title_Investigations',
    'Unique_Title_Requests',
];
const NO_FIGURES = 'There are no COUNTER R5 usage statistics available yet.';
const BEFORE_END = 'The start date must be before the end date.';
const NOT_SAVED = /^\s*The form was not saved because \d+ error\(s\) were encountered\. Please correct these errors and try again\./;

const AXOLOTL = 'Axolotl limb memory';
const PDF = {name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'};

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u64${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A file name of the statistics downloads: "stats_{part}_{UTC date}T{HH-MM_SS}.csv". */
function statsFileName(part) {
    return new RegExp(`^stats_${part}_${utcDay(0)}T\\d{2}-\\d{2}_\\d{2}\\.csv$`);
}

/** A page of `username`'s own browser. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The "Download Geographic" file of a press's "Monographs". */
async function geographicFile(page, contextPath) {
    const stats = new StatsPage(page, contextPath, 'articles');
    await stats.goto();
    const window = await stats.openDownload();
    return window.download('Download Geographic');
}

test.describe('Statistics — usage (installation settings)', () => {
    test('S7: where the visits came from @solo', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}a1`;
        try {
            await ompApi.setSite({enableGeoUsageStats: 'country+region+city'});
            await ompApi.createContext({
                tag,
                context: {name: {en: `Okapi Press ${tag}`}},
                users: [
                    {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
                    {username: author, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
                ],
            });
            await ompApi.createSubmission({
                tag: `${tag}ax`,
                context: tag,
                submitter: author,
                title: AXOLOTL,
                published: true,
                datePublished: '2024-01-15',
                usage: [
                    {daysAgo: 1, abstractViews: 3, country: 'CA', region: 'BC', city: 'Vancouver'},
                    {daysAgo: 1, abstractViews: 2, country: 'CA', region: 'ON'},
                ],
            });
            const page = await pageAs(asUser, manager);

            // The press's tab: four levels, the site's chosen, above "Public
            // API" (Rules 27, 28; Fields).
            const tab = new JournalStatisticsTab(page, tag);
            await tab.goto();
            expect(await tab.fieldLabels()).toEqual(['Geographical Statistics', 'Public API']);
            expect(await tab.choices('Geographical Statistics')).toEqual([
                [GEO.none, false],
                [GEO.country, false],
                [GEO.region, false],
                [GEO.city, true],
            ]);

            // "Geographic": the panel and the cities file (Rules 17, 18;
            // Fields; Settings bullet 1).
            const stats = new StatsPage(page, tag, 'articles');
            await stats.goto();
            const window = await stats.openDownload();
            await expect.poll(() => window.headings(), {timeout: T}).toEqual(['Monographs', 'Files', 'Timeline', 'Geographic']);
            await expect(window.panelInfoIcon('Geographic')).toContainText('About Geolocation');
            await expect(window.panelLine('Geographic')).toHaveText('The number of views and downloads for each city, region or country.');
            await expect(window.panelButton('Geographic')).toHaveText('Download Geographic');
            let file = await window.download('Download Geographic');
            expect(file.name).toMatch(statsFileName('cities'));
            expect(file.parts.columns).toEqual(['City', 'Region', 'Country', 'Total', 'Unique']);
            expect(file.parts.rows.map((r) => r.slice(0, 4)).sort()).toEqual(
                [
                    ['Vancouver', 'British Columbia', 'Canada', '3'],
                    ['unknown', 'Ontario', 'Canada', '2'],
                ].sort()
            );

            // The region level (Rules 17, 18, 28; Settings bullet 7).
            await tab.goto();
            await tab.radio(GEO.region).check();
            expect((await tab.save()).status()).toBe(200);
            await tab.goto();
            await expect(tab.radio(GEO.region)).toBeChecked();
            file = await geographicFile(page, tag);
            expect(file.name).toMatch(statsFileName('regions'));
            expect(file.parts.columns).toEqual(['Region', 'Country', 'Total', 'Unique']);
            expect(file.parts.rows.map((r) => r.slice(0, 3)).sort()).toEqual(
                [
                    ['British Columbia', 'Canada', '3'],
                    ['Ontario', 'Canada', '2'],
                ].sort()
            );

            // The country level (Rules 17, 18, 28; Settings bullet 7).
            await tab.goto();
            await tab.radio(GEO.country).check();
            expect((await tab.save()).status()).toBe(200);
            file = await geographicFile(page, tag);
            expect(file.name).toMatch(statsFileName('countries'));
            expect(file.parts.columns).toEqual(['Country', 'Total', 'Unique']);
            expect(file.parts.rows.map((r) => r.slice(0, 2))).toEqual([['Canada', '5']]);

            // Control: the "Press" window has no "Geographic" (Fields).
            const journal = new StatsPage(page, tag, 'journal');
            await journal.goto();
            const journalWindow = await journal.openDownload();
            await expect.poll(() => journalWindow.headings(), {timeout: T}).toEqual(['Press', 'Timeline']);
            await expect(journalWindow.panel('Geographic')).toHaveCount(0);
            await journalWindow.close();
        } finally {
            await ompApi.setSite(STATS_INSTALL);
        }
    });

    test('S8: COUNTER reports on "Counter R5" @solo', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        const tagB = `${tag}b`;
        const manager = `${tag}mg`;
        const se = `${tag}se`;
        const author = `${tag}a1`;
        const nameA = `Okapi Press ${tag}`;
        const firstOffered = monthStart(-3);
        const lastOffered = monthEnd(-1);
        try {
            await ompApi.setSite({counterR5StartDate: monthStart(-4), title: 'Okapi Site'});
            await ompApi.createContext({
                tag,
                context: {name: {en: nameA}},
                users: [
                    {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
                    {username: se, givenName: 'Sid', familyName: 'Sectioned', roles: ['sectionEditor']},
                    {username: author, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
                ],
            });
            await ompApi.createSubmission({
                tag: `${tag}ax`,
                context: tag,
                submitter: author,
                title: AXOLOTL,
                published: true,
                datePublished: '2025-01-15',
                publicationFormats: [PDF],
                usage: [
                    {date: `${monthStart(-2).slice(0, 8)}10`, abstractViews: 4, fileViews: [2]},
                    {date: `${monthStart(-1).slice(0, 8)}10`, abstractViews: 4, fileViews: [2]},
                ],
            });
            await ompApi.createContext({
                tag: tagB,
                context: {name: {en: `Okapi Press ${tagB}`}},
                users: [
                    {username: manager, roles: ['manager']},
                    {username: `${tagB}a1`, givenName: 'Bea', familyName: 'Zephyr', roles: ['author']},
                ],
            });
            await ompApi.createSubmission({tag: `${tagB}w`, context: tagB, submitter: `${tagB}a1`, title: 'Kea notes', published: true});
            const page = await pageAs(asUser, manager);
            const dialogs = [];
            page.on('dialog', (d) => dialogs.push(d.message()));
            const counter = new CounterR5Page(page, tag);

            // Control: A's "Counter R5" shows no warning (Rule 21); its list.
            await counter.goto();
            await expect(counter.rows).toHaveCount(COUNTER_REPORTS.length);
            for (const [i, report] of COUNTER_REPORTS.entries()) await expect(counter.rows.nth(i)).toContainText(report);
            await expect(counter.warning).toHaveCount(0);

            // The report settings: a press's six "Metric Type" boxes, "The
            // World" alone on a press with no institution (Rules 19, 21, 22;
            // Fields).
            let window = await counter.edit('PR');
            await expect(window.title).toBeVisible();
            await expect(window.box('begin_date')).toHaveValue(firstOffered);
            await expect(window.description('begin_date')).toHaveText(
                `Date should be in format YYYY-MM-DD or YYYY-MM. Earliest possible date is ${firstOffered}.`
            );
            await expect(window.box('end_date')).toHaveValue(lastOffered);
            await expect(window.description('end_date')).toHaveText(
                `Date should be in format YYYY-MM-DD or YYYY-MM. Last possible date is ${lastOffered}.`
            );
            expect(await window.customers()).toEqual([['The World', true]]);
            expect(await window.boxes('metric_type')).toEqual(METRICS.map((m) => [m, true]));
            expect(await window.boxes('attributes_to_show')).toEqual([
                ['Data_Type', false],
                ['Access_Method', false],
            ]);
            await expect(window.excludeMonthly).not.toBeChecked();
            await expect(window.downloadButton).toBeVisible();

            // Downloading (Rules 20, 24).
            const first = await window.download();
            expect(first.name).toBe('counterReport.tsv');
            expect(first.rows.slice(0, HEADER_LINES.length).map((r) => r[0])).toEqual(HEADER_LINES);
            expect(first.rows[HEADER_LINES.length]).toEqual([]);
            expect(counterHeader(first.rows, 'Report_ID')).toBe('PR');
            expect(counterHeader(first.rows, 'Created_By')).toBe(nameA);
            const firstTable = counterTable(first.rows);
            expect(firstTable.columns.slice(0, 3)).toEqual(['Platform', 'Metric_Type', 'Reporting_Period_Total']);
            expect(firstTable.rows.length).toBeGreaterThan(0);
            for (const row of firstTable.rows) expect(row[0]).toBe(nameA);

            // A date inside a month (Rule 20).
            window = await counter.edit('PR');
            await window.type('begin_date', `${firstOffered.slice(0, 8)}14`);
            const mid = await window.download();
            expect(counterHeader(mid.rows, 'Reporting_Period')).toMatch(new RegExp(`^Begin_Date=${firstOffered};`));
            expect(counterHeader(mid.rows, 'Exceptions')).toContain(`${firstOffered.slice(0, 8)}14`);
            expect(counterHeader(mid.rows, 'Exceptions')).toContain('middle of the month');
            expect(counterHeader(first.rows, 'Exceptions'), 'control: the offered dates widen nothing').toBe('');

            // "Exclude Monthly Details" (Fields).
            window = await counter.edit('PR');
            await window.excludeMonthly.check();
            const totals = await window.download();
            expect(counterTable(totals.rows).columns).toEqual(['Platform', 'Metric_Type', 'Reporting_Period_Total']);
            expect(firstTable.columns.length, 'control: the default file has a column per month').toBeGreaterThan(3);

            // Refusals: each under its field, "Please correct …" in the window,
            // the page's notice but for the emptied date, no file (Fields).
            const refusals = [
                ['PR', 'begin_date', 'The date format is not valid.', (w) => w.type('begin_date', firstOffered.replace(/-/g, '/'))],
                ['PR', 'begin_date', BEFORE_END, async (w) => {
                    await w.type('begin_date', lastOffered);
                    await w.type('end_date', firstOffered);
                }],
                ['PR', 'metric_type', 'This field is required.', async (w) => {
                    for (const m of METRICS) await w.checkbox(m).uncheck();
                }],
                ['TR', 'yop', 'YOP format is not valid.', (w) => w.type('yop', '1999-')],
            ];
            for (const [report, field, message, change] of refusals) {
                window = await counter.edit(report);
                await change(window);
                await markNotices(page);
                const refused = await window.downloadRefused(field, message);
                expect(refused.status, `${report} ${field}`).toBe(400);
                expect(refused.files, `${report} ${field}: no file`).toEqual([]);
                await expect(window.errorSummary).toBeVisible();
                await expect(notices(page, NOT_SAVED, {fresh: true})).toHaveCount(1, {timeout: T});
                if (message === BEFORE_END) await expect(window.fieldError('end_date')).toContainText(BEFORE_END);
                await window.close();
            }
            window = await counter.edit('PR');
            await window.box('end_date').fill('');
            await markNotices(page);
            const emptied = await window.downloadRefusedInBrowser('end_date', 'This field is required.');
            expect(emptied.sent, 'an emptied date sends nothing').toEqual([]);
            expect(emptied.files).toEqual([]);
            await expect(window.errorSummary).toBeVisible();
            await expect(notices(page, NOT_SAVED, {fresh: true})).toHaveCount(0);
            await window.close();

            // "Close" drops the changes without a question (Fields).
            window = await counter.edit('PR');
            await window.type('begin_date', monthStart(-2));
            await window.checkbox(METRICS[0]).uncheck();
            await window.close();
            window = await counter.edit('PR');
            await expect(window.box('begin_date')).toHaveValue(firstOffered);
            await expect(window.checkbox(METRICS[0])).toBeChecked();
            expect(dialogs, 'no browser question').toEqual([]);
            await window.close();

            // The Series editor: the same list and file (Actors row 3).
            const sePage = await pageAs(asUser, se);
            const seCounter = new CounterR5Page(sePage, tag);
            await seCounter.goto();
            await expect(seCounter.rows).toHaveCount(COUNTER_REPORTS.length);
            for (const [i, report] of COUNTER_REPORTS.entries()) await expect(seCounter.rows.nth(i)).toContainText(report);
            const seFile = await (await seCounter.edit('PR')).download();
            expect(counterHeader(seFile.rows, 'Report_ID')).toBe('PR');
            expect(counterHeader(seFile.rows, 'Created_By')).toBe(nameA);
            expect(counterTable(seFile.rows)).toEqual(firstTable);

            // No COUNTER figures yet: press B (Rule 21).
            const counterB = new CounterR5Page(page, tagB);
            await counterB.goto();
            await expect(counterB.warning).toBeVisible();
            await expect(counterB.warning).toHaveText(NO_FIGURES);
            window = await counterB.edit('PR');
            await expect(window.box('begin_date')).toHaveValue(monthStart(1));
            await expect(window.box('end_date')).toHaveValue(lastOffered);
            const refusedB = await window.downloadRefused('begin_date', BEFORE_END);
            expect(refusedB.status).toBe(400);
            expect(refusedB.files).toEqual([]);
            await expect(window.fieldError('end_date')).toContainText(BEFORE_END);
            await window.close();

            // The site as the platform: "Platform" ticked with an ID, the
            // report names "Okapi Site" (Rule 24; Settings bullet 6).
            const adminPage = await pageAs(asUser, 'admin');
            const site = new SiteSettingsPage(adminPage);
            await site.goto();
            const form = await site.statistics();
            await expect(form.platformBox).toHaveAccessibleName('Use the site as the platform for all presses.');
            await form.platformBox.check();
            await form.platformId.fill('OKAPIPLAT');
            expect((await form.pressSave()).status()).toBe(200);
            await counter.goto();
            const platform = await (await counter.edit('PR')).download();
            expect(counterHeader(platform.rows, 'Created_By')).toBe('Okapi Site');
            const platformTable = counterTable(platform.rows);
            expect(platformTable.rows.length).toBeGreaterThan(0);
            for (const row of platformTable.rows) expect(row[0]).toBe('Okapi Site');
        } finally {
            await ompApi.setSite({counterR5StartDate: null, title: '', ...PLATFORM_INSTALL});
        }
    });

    test("S10: the installation's statistics settings @solo", async ({asUser, ompApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s10', testInfo);
        const manager = `${tag}mg`;
        try {
            await ompApi.createContext({
                tag,
                context: {name: {en: `Okapi Press ${tag}`}},
                users: [{username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']}],
            });
            const adminPage = await pageAs(asUser, 'admin');
            const site = new SiteSettingsPage(adminPage);

            // The tab at install (Fields).
            await site.goto();
            let form = await site.statistics();
            await expect(form.groupHeadings).toHaveText(['Data Collection', 'Data Storage', 'Sushi Protocol']);
            await expect(form.choice(GEO.none)).toBeChecked();
            await expect(form.institutionalBox).not.toBeChecked();
            await expect(form.choice('Only track monthly statistics')).toBeChecked();
            await expect(form.choice('Leave the log files in place')).toBeChecked();
            await expect(form.choice('Make the COUNTER SUSHI statistics publicly available')).toBeChecked();
            await expect(form.platformBox).not.toBeChecked();
            await expect(form.platformId).toHaveCount(0);
            await expect(form.saveButton).toBeVisible();

            // "Platform ID": shown once "Platform" is ticked, unmarked, then
            // required and shaped (Rule 26; Fields; Settings bullet 6).
            await form.platformBox.check();
            await expect(form.platformId).toBeVisible();
            await expect(form.platformIdRequired).toHaveCount(0);
            let answer = await form.saveRefused('A platform ID must be required when the site will be identified as the SUSHI platform.');
            expect(answer.status()).toBe(400);
            await expect(form.errorSummary).toContainText('Please correct one error.');
            await expect(form.goToField('Platform ID')).toHaveCount(1);
            for (const bad of ['has space', 'K5_plat.id/1234567']) {
                await form.platformId.fill(bad);
                answer = await form.saveRefused('This is not formatted correctly.');
                expect(answer.status(), bad).toBe(400);
            }
            await form.platformId.fill('K5_plat.id/123456');
            expect((await form.pressSave()).status()).toBe(200);
            await expect(form.platformIdError).toHaveCount(0);
            await form.platformBox.uncheck();
            expect((await form.pressSave()).status()).toBe(200);
            await form.platformBox.check();
            await expect(form.platformId).toHaveValue('K5_plat.id/123456');
            await form.platformId.fill('');
            await form.platformBox.uncheck();
            expect((await form.pressSave()).status()).toBe(200);

            // Collecting more, restricting the API (Rule 26).
            await form.choice(GEO.country).check();
            await form.institutionalBox.check();
            await form.choice('Restrict access to the COUNTER SUSHI statistics API to managers and admins').check();
            expect((await form.pressSave()).status()).toBe(200);
            await site.reload();
            form = await site.statistics();
            await expect(form.choice(GEO.country)).toBeChecked();
            await expect(form.institutionalBox).toBeChecked();

            // The press's tab (Rules 27–30; Settings bullets 1, 2, 5).
            const page = await pageAs(asUser, manager);
            const tab = new JournalStatisticsTab(page, tag);
            await tab.goto();
            expect(await tab.fieldLabels()).toEqual(['Geographical Statistics', 'Institutional Statistics']);
            expect(await tab.choices('Geographical Statistics')).toEqual([
                [GEO.none, false],
                [GEO.country, true],
            ]);
            await expect(tab.institutionalBox).not.toBeChecked();
            await expect(tab.publicApiBox).toHaveCount(0);

            // The press's pages (Rules 18, 23; Settings bullets 1, 5).
            const stats = new StatsPage(page, tag, 'articles');
            await stats.goto();
            const window = await stats.openDownload();
            await expect.poll(() => window.headings(), {timeout: T}).toEqual(['Monographs', 'Files', 'Timeline', 'Geographic']);
            await window.close();
            const visitorContext = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
            const refused = await visitorContext.request.get(`/index.php/${tag}/api/v1/stats/sushi/reports`, {headers: {Accept: 'application/json'}});
            expect(refused.status()).toBe(401);
            expect(await refused.text()).toContain('You are not authorized to access the requested resource.');
            const managerFetch = await page.request.get(`/index.php/${tag}/api/v1/stats/sushi/reports`, {headers: {Accept: 'application/json'}});
            expect(managerFetch.status(), 'control: the manager is served').toBe(200);
            await visitorContext.close();

            // Nothing collected: no "Statistics" tab (Rule 27).
            await site.goto();
            form = await site.statistics();
            await form.choice(GEO.none).check();
            await form.institutionalBox.uncheck();
            await form.choice('Restrict access to the COUNTER SUSHI statistics API to managers and admins').check();
            expect((await form.pressSave()).status()).toBe(200);
            await tab.gotoDistribution();
            await expect(tab.tabs.filter({hasText: 'Payments'})).toBeVisible();
            await expect(tab.tab).toHaveCount(0);

            // Control: public again, the tab returns with "Public API" alone,
            // ticked (Rule 27).
            await form.choice('Make the COUNTER SUSHI statistics publicly available').check();
            expect((await form.pressSave()).status()).toBe(200);
            await tab.goto();
            expect(await tab.fieldLabels()).toEqual(['Public API']);
            await expect(tab.publicApiBox).toBeChecked();
        } finally {
            await ompApi.setSite({...STATS_INSTALL, ...PLATFORM_INSTALL});
        }
    });
});
