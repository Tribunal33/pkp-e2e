// @ts-check
/**
 * @file playwright/tests/U68-catalog-browse.spec.js
 *
 * Catalog browse — OMP suite: one test per canonical scenario a press runs,
 * S1–S6 ({OMP}), plus S7's press side: the control of the {OJS OPS}
 * absence (the journal's and the preprint server's side run in their own
 * suites; CI installs one app per job, so the seeded press's control rides
 * here, as U70's does). In the press's own words: the catalog page, a
 * series' page, the "New Releases" page, the book summary, the "Series:"
 * line, the sidebar's "Browse" block, the Press Manager's Navigation tab.
 * Spec: docs/specs/U68-catalog-browse.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: no count of one book is read ("1 Titles"); S5's one-book series
 *   pages and second press are read by their books, never their count.
 * - A2 🐞: the cover link is located by class and read by its address,
 *   never by its accessible name.
 * - A3 🐞: a series' page is never read by its heading, trail or tab title,
 *   and no series' description, ISSN or "Order of monographs" is seeded.
 * - A5 ❓: every seeded series is active; the "Series:" line and the block
 *   are read as sets of names, never in an order (every seeded series is
 *   stored at order 0).
 * - A4, A6, A7, A8, A9, A10, A11 🐞/❓ and A12 ❓: no test reaches those
 *   states (no series picture, no "Series position" order, no category
 *   page, no French, no "catalog/results", no page past the last, no
 *   inactive series, no menu item of the press's own).
 *
 * Seeding: scenario endpoints only, as footnote s says. S1–S6 each build a
 * scratch press (two in S5) through `createContext` with throwaway
 * accounts (the username twice as password): an Author, the books'
 * submitter, in S1–S5 (S1's "Nova Reed") and a Reader in S6. S6's control
 * and S7's control only read `publicknowledge` of OMP, signed out and as
 * `manager.maya` (the Add item window is closed unsaved), whose settings
 * and roster stay untouched. The visitor is a browser context with an
 * empty storage state (patterns.md, parallel lesson 8) at 1280 × 900
 * pixels, the window a scenario calls 1200 or wider; S6's Reader signs in
 * on the press's Login page in a second empty context. Every absence is a
 * settled read of a server-rendered page, after its navigation, paired
 * with a positive control read the same way (M4, M6): a book left out
 * beside the books listed, a list or line left out beside the page's
 * other list, count or block, a Login page beside the page it stands in
 * for.
 *
 * Why no serial half: the catalog, a series' page and "New Releases" read
 * the database directly (CatalogHandler's `page`, `series`, `newReleases`;
 * seed-facts: no queued job stands between a seeded book and them); only a
 * category's page waits on the search index, and no scenario reads one.
 *
 * Page objects: apps/omp/playwright/pages/CatalogPages.js (PublicCatalog),
 * shared/playwright/pages/NavigationChromePages.js (NavigationTab, the item
 * window), shared/playwright/pages/LoginPage.js.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {NavigationTab} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {PublicCatalog, trailText} = require('../pages/CatalogPages.js');

const T = 30_000;
const WIDE = {width: 1280, height: 900};
const NARROW = {width: 800, height: 900};
const NO_TITLES = 'No titles have been published yet.';
const NO_NEW_RELEASES = 'No new releases are available at this time.';

/** A visitor's page: a browser context with no session at all (parallel lesson 8), 1280 pixels wide. */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce', viewport: WIDE});
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u68${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch press with a throwaway Author (`${tag}au`, the books'
 * submitter), named `given family`, plus the press keys.
 */
async function seedPress(ompApi, tag, keys = {}, {given = 'Ada', family = 'Author'} = {}) {
    await ompApi.createContext({tag, users: [user(`${tag}au`, given, family, ['author'])], ...keys});
}

/** A book of the press by its Author. */
async function seedBook(ompApi, tag, n, title, keys = {}) {
    return ompApi.createSubmission({tag: `${tag}b${n}`, context: tag, submitter: `${tag}au`, title, ...keys});
}

/** A published book, with a publication date when one is given. */
async function seedPublished(ompApi, tag, n, title, datePublished = null, keys = {}) {
    return seedBook(ompApi, tag, n, title, {published: true, ...(datePublished ? {datePublished} : {}), ...keys});
}

/** Titles of a list of rows (`layoutRows`), row by row. */
const rowTitles = (rows) => rows.map((row) => row.map((i) => i.title));

/** An address's path ends in `suffix` (a bare scratch-press address, no query). */
const endsWith = (suffix) => new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

test.describe('Catalog browse', () => {
    test('S1: The catalog page, the featured book first', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        await seedPress(ompApi, tag, {context: {name: 'Harbour Press'}, displayFeaturedBooks: true, displayNewReleases: true}, {given: 'Nova', family: 'Reed'});
        await seedPublished(ompApi, tag, 1, 'Alpha', '2024-01-10');
        await seedPublished(ompApi, tag, 2, 'Beta', '2024-02-10', {urlPath: 'beta-book', newRelease: [{in: 'catalog'}]});
        const gamma = await seedPublished(ompApi, tag, 3, 'Gamma', '2024-03-10', {newRelease: [{in: 'catalog'}]});
        await seedPublished(ompApi, tag, 4, 'Delta', '2023-12-10', {featured: [{in: 'catalog'}]});
        await seedPublished(ompApi, tag, 5, 'Epsilon', '2031-01-10');
        await seedBook(ompApi, tag, 6, 'Zeta');

        const reader = new PublicCatalog(visitor, tag);

        // The header's "Catalog": tab, trail, heading, count (Rules 1, 3; Fields).
        await reader.gotoHome();
        await reader.pressHeaderCatalog();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog`));
        await expect(visitor).toHaveTitle('Catalog | Harbour Press');
        await expect(reader.trail()).toHaveText(trailText('Home', 'Catalog'));
        await expect(reader.pageHeading()).toHaveText('Catalog');
        await expect(reader.count()).toHaveText('4 Titles');

        // The featured book first, on a row of its own; the rest newest
        // first, two to a row (Rule 4).
        await expect(reader.listTitles(reader.mainList())).toHaveText(['Delta', 'Gamma', 'Beta', 'Alpha']);
        const wideRows = await reader.layoutRows(reader.mainList());
        expect(rowTitles(wideRows)).toEqual([['Delta'], ['Gamma', 'Beta'], ['Alpha']]);
        expect(wideRows[0][0].whole, '"Delta" takes the whole row').toBe(true);
        expect(wideRows[1].map((i) => i.whole), '"Gamma" and "Beta" share a row').toEqual([false, false]);
        expect(wideRows[2][0].whole, '"Alpha" takes half a row').toBe(false);

        // A book summary, top to bottom: the default picture, the title,
        // the author line, the date (Fields, the book summary).
        expect(await reader.summaryPartsTopToBottom('Gamma')).toEqual(['cover', 'title', 'author', 'date']);
        await expect(reader.summaryCoverLink('Gamma').locator('img')).toHaveAttribute('src', /\/templates\/images\/book-default(_t)?\.png$/);
        await expect(reader.summaryTitleLink('Gamma')).toHaveText('Gamma');
        await expect(reader.summaryAuthor('Gamma')).toHaveText('Nova Reed (Author)');
        await expect(reader.summaryDate('Gamma')).toHaveText('March 10, 2024');

        // Where a summary leads: the cover to the book's number, the title
        // to its URL Path (Rule 11).
        await reader.summaryCoverLink('Gamma').click();
        await expect(visitor).toHaveURL(endsWith(`/catalog/book/${gamma.submissionId}`));
        await expect(reader.bookTitle()).toHaveText('Gamma');
        await visitor.goBack();
        await expect(reader.catalogPageRoot()).toBeVisible({timeout: T});
        await reader.summaryTitleLink('Beta').click();
        await expect(visitor).toHaveURL(endsWith('/catalog/book/beta-book'));
        await expect(reader.bookTitle()).toHaveText('Beta');

        // The home page's lists: "Featured" holds "Delta", "New Releases"
        // "Gamma" and "Beta" side by side, each the same summary (Rule 11;
        // Settings bullet 5).
        await reader.gotoHome();
        const featured = reader.list('Featured');
        const newReleases = reader.list('New Releases');
        await expect(reader.listTitles(featured)).toHaveText(['Delta']);
        await expect(reader.listTitles(newReleases)).toHaveCount(2);
        const homeNew = await reader.layoutRows(newReleases);
        expect(homeNew, 'one row of two').toHaveLength(1);
        expect(homeNew[0].map((i) => i.title).sort()).toEqual(['Beta', 'Gamma']);
        expect(homeNew[0].map((i) => i.whole)).toEqual([false, false]);
        for (const title of ['Delta', 'Gamma', 'Beta']) {
            expect(await reader.summaryPartsTopToBottom(title), `"${title}" is a book summary`).toEqual(['cover', 'title', 'author', 'date']);
            await expect(reader.summaryAuthor(title)).toHaveText('Nova Reed (Author)');
        }

        // A window 800 pixels wide: every book of both home lists, then of
        // the catalog, takes a whole row (Rule 11).
        await visitor.setViewportSize(NARROW);
        for (const list of [featured, newReleases]) {
            const rows = await reader.layoutRows(list);
            expect(rows.every((row) => row.length === 1 && row[0].whole), `each book on a row of its own: ${JSON.stringify(rows)}`).toBe(true);
        }
        expect(rowTitles(await reader.layoutRows(newReleases)).flat().sort()).toEqual(['Beta', 'Gamma']);
        await reader.pressHeaderCatalog();
        const narrowRows = await reader.layoutRows(reader.mainList());
        expect(rowTitles(narrowRows)).toEqual([['Delta'], ['Gamma'], ['Beta'], ['Alpha']]);
        expect(narrowRows.every((row) => row[0].whole), 'every catalog book takes a whole row').toBe(true);

        // Control: neither the scheduled "Epsilon" nor the unpublished
        // "Zeta" is listed, and the count leaves both out (Rule 3).
        await expect(reader.count()).toHaveText('4 Titles');
        await expect(reader.listTitles(reader.mainList())).toHaveText(['Delta', 'Gamma', 'Beta', 'Alpha']);
        await expect(reader.summary('Epsilon')).toHaveCount(0);
        await expect(reader.summary('Zeta')).toHaveCount(0);
    });

    test('S2: The "New Releases" page', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        await seedPress(ompApi, tag, {context: {name: 'Lantern Press'}, itemsPerPage: 2});
        await seedPublished(ompApi, tag, 1, 'Alpha', '2024-01-10', {featured: [{in: 'catalog'}], newRelease: [{in: 'catalog'}]});
        await seedPublished(ompApi, tag, 2, 'Beta', '2024-02-10', {newRelease: [{in: 'catalog'}]});
        await seedPublished(ompApi, tag, 3, 'Gamma', '2024-03-10', {newRelease: [{in: 'catalog'}]});
        await seedPublished(ompApi, tag, 4, 'Delta', '2024-04-10');

        const reader = new PublicCatalog(visitor, tag);

        // The page: tab, trail, heading, count (Rule 1; Fields).
        await reader.gotoNewReleases();
        await expect(visitor).toHaveTitle('New Releases | Lantern Press');
        await expect(reader.trail()).toHaveText(trailText('Home', 'New Releases'));
        await expect(reader.pageHeading()).toHaveText('New Releases');
        await expect(reader.count()).toHaveText('3 Titles');

        // The list: newest first, all three on this one page although
        // "Items per page" is 2; the featured "Alpha" keeps its place by
        // date, last (Rule 10; Settings bullet 4).
        await expect(reader.listTitles(reader.mainList())).toHaveText(['Gamma', 'Beta', 'Alpha']);
        await expect(reader.pageLinks()).toHaveCount(0);

        // Control: "Delta", not a new release, is not on the page (Rule 10).
        await expect(reader.summary('Delta')).toHaveCount(0);

        // The catalog page: "4 Titles", "Alpha" (featured) then "Delta" (Rules 3, 4).
        await reader.pressHeaderCatalog();
        await expect(reader.count()).toHaveText('4 Titles');
        await expect(reader.listTitles(reader.mainList())).toHaveText(['Alpha', 'Delta']);
    });

    test('S3: A series\' page, over two pages', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        await seedPress(ompApi, tag, {itemsPerPage: 2, series: [{path: 'history', title: 'History'}]});
        const inSeries = {series: 'history'};
        const newInSeries = [{in: 'series', path: 'history'}];
        await seedPublished(ompApi, tag, 1, 'Coastal Towns', '2024-01-10', {
            ...inSeries,
            seriesPosition: 'Book 1',
            featured: [{in: 'series', path: 'history', position: 1}],
            newRelease: newInSeries,
        });
        await seedPublished(ompApi, tag, 2, 'River Histories', '2024-02-10', {...inSeries, featured: [{in: 'series', path: 'history', position: 2}]});
        await seedPublished(ompApi, tag, 3, 'Old Mills', '2024-03-10', {...inSeries, newRelease: newInSeries});
        await seedPublished(ompApi, tag, 4, 'Harbour Walls', '2024-04-10', {...inSeries, newRelease: newInSeries});

        const reader = new PublicCatalog(visitor, tag);
        const allBooks = reader.list('All Books');
        const seriesNew = reader.list('New Releases');

        // The first page: "4 Titles" (Rule 7).
        await reader.gotoSeries('history');
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/series/history`));
        await expect(reader.count()).toHaveText('4 Titles');

        // The series' "New Releases": three books, newest first, although
        // "Items per page" is 2 (Rule 8; Settings bullet 4).
        await expect(reader.listTitles(seriesNew)).toHaveText(['Harbour Walls', 'Old Mills', 'Coastal Towns']);

        // "All Books": the featured books in their saved order, each on a
        // row of its own; "Book 1" above "Coastal Towns"; "1-2 of 4" and
        // "Next" (Rule 7; Fields, the book summary).
        await expect(reader.listTitles(allBooks)).toHaveText(['Coastal Towns', 'River Histories']);
        const rows = await reader.layoutRows(allBooks);
        expect(rowTitles(rows)).toEqual([['Coastal Towns'], ['River Histories']]);
        expect(rows.every((row) => row[0].whole), 'each featured book takes a whole row').toBe(true);
        const coastal = allBooks.locator('.obj_monograph_summary').filter({has: visitor.locator('.title', {hasText: 'Coastal Towns'})});
        await expect(coastal.locator('.seriesPosition')).toHaveText('Book 1');
        const parts = await coastal.evaluate((s) => [s.querySelector('.seriesPosition').getBoundingClientRect().top, s.querySelector('.title').getBoundingClientRect().top]);
        expect(parts[0], '"Book 1" stands above the title').toBeLessThan(parts[1]);
        await expect(reader.pageSpan()).toHaveText('1-2 of 4');
        await expect(reader.nextLink()).toHaveText('Next');
        await expect(reader.previousLink()).toHaveCount(0);

        // The second page: ".../history/2", the same count, no "New
        // Releases", "Harbour Walls" then "Old Mills" (Rules 7, 8).
        await reader.nextLink().click();
        await expect(visitor).toHaveURL(endsWith('/catalog/series/history/2'));
        await expect(reader.count()).toHaveText('4 Titles');
        await expect(reader.listTitles(allBooks)).toHaveText(['Harbour Walls', 'Old Mills']);
        await expect(seriesNew).toHaveCount(0);
        await expect(reader.previousLink()).toHaveText('Previous');
        await expect(reader.pageSpan()).toHaveText('3-4 of 4');
        await expect(reader.nextLink()).toHaveCount(0);

        // "Previous": the first page, at the series' own address (Rule 7).
        await reader.previousLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/series/history`));
        await expect(reader.listTitles(seriesNew)).toHaveText(['Harbour Walls', 'Old Mills', 'Coastal Towns']);

        // An unknown series, and none: the catalog page, with no message (Rule 2).
        for (const pathname of ['/catalog/series/histories', '/catalog/series']) {
            await reader.open(pathname);
            await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog`));
            await expect(reader.catalogPageRoot()).toBeVisible();
            await expect(reader.pageHeading()).toHaveText('Catalog');
            await expect(reader.count()).toHaveText('4 Titles');
            await expect(reader.messages()).toHaveCount(0);
        }

        // Control: the press's "New Releases" page lists none, the books
        // being new releases in the series only (Rule 10).
        await reader.gotoNewReleases();
        await expect(reader.pageHeading()).toHaveText('New Releases');
        await expect(reader.count()).toHaveText('0 Titles');
        await expect(reader.emptyMessage()).toHaveText(NO_NEW_RELEASES);
        await expect(reader.summaries()).toHaveCount(0);
    });

    test('S4: The catalog in the press\'s order, over three pages', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        await seedPress(ompApi, tag, {catalogSortOption: 'title-ASC', itemsPerPage: 2});
        await seedPublished(ompApi, tag, 1, 'Oak', null, {featured: [{in: 'catalog', position: 1}]});
        await seedPublished(ompApi, tag, 2, 'Elm', null, {featured: [{in: 'catalog', position: 2}]});
        await seedPublished(ompApi, tag, 3, 'Ash', '2024-05-10');
        await seedPublished(ompApi, tag, 4, 'Birch', '2024-01-10');
        await seedPublished(ompApi, tag, 5, 'Maple', '2024-03-10');

        const reader = new PublicCatalog(visitor, tag);
        const titles = reader.listTitles(reader.mainList());

        // The first page: the featured books fill it (Rules 4, 5; Fields).
        await reader.gotoHome();
        await reader.pressHeaderCatalog();
        await expect(reader.count()).toHaveText('5 Titles');
        await expect(titles).toHaveText(['Oak', 'Elm']);
        await expect(reader.pageSpan()).toHaveText('1-2 of 5');
        await expect(reader.nextLink()).toHaveText('Next');
        await expect(reader.previousLink()).toHaveCount(0);

        // The second page: "catalog/page/2", "Ash" then "Birch" (Rule 5).
        await reader.nextLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/page/2`));
        await expect(reader.count()).toHaveText('5 Titles');
        await expect(titles).toHaveText(['Ash', 'Birch']);
        await expect(reader.previousLink()).toHaveText('Previous');
        await expect(reader.pageSpan()).toHaveText('3-4 of 5');
        await expect(reader.nextLink()).toHaveText('Next');

        // The third page: "Maple" alone, "Previous" and "5-5 of 5" (Rule 5).
        await reader.nextLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/page/3`));
        await expect(titles).toHaveText(['Maple']);
        await expect(reader.previousLink()).toHaveText('Previous');
        await expect(reader.pageSpan()).toHaveText('5-5 of 5');
        await expect(reader.nextLink()).toHaveCount(0);

        // "Previous" twice: the second page, then the catalog page at
        // the press's address followed by "catalog" (Rule 5).
        await reader.previousLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/page/2`));
        await expect(titles).toHaveText(['Ash', 'Birch']);
        await reader.previousLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog`));
        await expect(titles).toHaveText(['Oak', 'Elm']);

        // Control: "Birch" before "Maple", although "Maple" is the newer:
        // the press's order by title, not the date (Rule 4; Settings bullet 1).
        await reader.gotoCatalogPage(2);
        await expect(titles).toHaveText(['Ash', 'Birch']);
        await reader.gotoCatalogPage(3);
        await expect(titles).toHaveText(['Maple']);
    });

    test('S5: Series links on the catalog page and in the "Browse" block', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const second = `${tag}x`;
        const shown = {themeOptions: {showCatalogSeriesListing: true}, sidebar: ['browseblockplugin']};
        await seedPress(ompApi, tag, {
            ...shown,
            series: [
                {path: 'history', title: 'History'},
                {path: 'poetry', title: 'Poetry'},
                {path: 'drama', title: 'Drama'},
            ],
        });
        await seedPublished(ompApi, tag, 1, 'Harbour Chronicle', null, {series: 'history'});
        await seedPublished(ompApi, tag, 2, 'Tide Verses', null, {series: 'poetry'});
        await seedPress(ompApi, second, {
            ...shown,
            series: [{path: 'essays', title: 'Essays'}],
            plugins: {browseblockplugin: {enabled: true, settings: {browseNewReleases: false, browseSeries: false}}},
        });
        await seedPublished(ompApi, second, 1, 'Quiet Essays', null, {series: 'essays'});

        const reader = new PublicCatalog(visitor, tag);

        // The "Series:" links: "History" and "Poetry", comma-separated, no
        // "Drama" (Rule 6; Settings bullet 3). Read as a set (order 0).
        await reader.gotoHome();
        await reader.pressHeaderCatalog();
        await expect(reader.seriesNav()).toHaveText(/^\s*Series:\s*(History\s*,\s*Poetry|Poetry\s*,\s*History)\s*$/);
        await expect(reader.seriesNavLinks()).toHaveCount(2);
        await expect(reader.seriesNavLink('History')).toBeVisible();
        await expect(reader.seriesNavLink('Poetry')).toBeVisible();
        await expect(reader.seriesNavLink('Drama')).toHaveCount(0);

        // A "Series:" link: the series' page with its book (Rules 1, 7).
        await reader.seriesNavLink('History').click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/series/history`));
        await expect(reader.seriesPageRoot()).toBeVisible();
        await expect(reader.listTitles(reader.list('All Books'))).toHaveText(['Harbour Chronicle']);

        // The "Browse" block: "New Releases", then the line "Series" with
        // "Drama", "History" and "Poetry" (Rule 12; Settings bullet 6).
        const lines = await reader.browseBlockLines();
        expect(lines[0], 'the first line').toBe('New Releases');
        expect(lines[lines.length - 1], 'the last line').toBe('Series');
        await expect(reader.browseNewReleasesLink()).toBeVisible();
        await expect(reader.browseSeriesLinks()).toHaveCount(3);
        expect((await reader.browseSeriesLinks().allTextContents()).map((t) => t.trim()).sort()).toEqual(['Drama', 'History', 'Poetry']);

        // The current series: "History" grayed with a grey bar at its
        // left; "Drama" and "Poetry" not (Rule 12).
        const history = reader.browseSeriesLink('History');
        await expect(history).toHaveCSS('border-left-style', 'solid');
        await expect(history).toHaveCSS('border-left-width', '4px');
        await expect(history).toHaveCSS('border-left-color', 'rgb(221, 221, 221)');
        await expect(history).toHaveCSS('color', 'rgba(0, 0, 0, 0.54)');
        for (const name of ['Drama', 'Poetry']) {
            const link = reader.browseSeriesLink(name);
            await expect(link).toHaveCSS('border-left-width', '0px');
            await expect(link).not.toHaveCSS('color', 'rgba(0, 0, 0, 0.54)');
        }

        // A series with no book: "0 Titles", "All Books", the message, no
        // "New Releases" (Rule 7).
        await reader.browseSeriesLink('Drama').click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/series/drama`));
        await expect(reader.count()).toHaveText('0 Titles');
        await expect(reader.emptyHeading()).toHaveText('All Books');
        await expect(reader.emptyMessage()).toHaveText(NO_TITLES);
        await expect(reader.summaries()).toHaveCount(0);
        await expect(reader.list('New Releases')).toHaveCount(0);

        // The block's "New Releases": the page headed "New Releases" (Rules 1, 12).
        await reader.browseNewReleasesLink().click();
        await expect(visitor).toHaveURL(endsWith(`/${tag}/catalog/newReleases`));
        await expect(reader.pageHeading()).toHaveText('New Releases');

        // One series with a book: no "Series:" line on the second press (Rule 6).
        const other = new PublicCatalog(visitor, second);
        await other.gotoHome();
        await other.pressHeaderCatalog();
        await expect(other.listTitles(other.mainList())).toHaveText(['Quiet Essays']);
        await expect(other.seriesNav()).toHaveCount(0);

        // Control: the second press's block shows neither the "New
        // Releases" link nor the "Series" line (Rule 12; Settings bullet 7).
        await expect(other.browseBlockHeading()).toHaveText('Browse');
        const otherLines = await other.browseBlockLines();
        expect(otherLines).not.toContain('New Releases');
        expect(otherLines).not.toContain('Series');
        await expect(other.browseNewReleasesLink()).toHaveCount(0);
        await expect(other.browseSeriesLinks()).toHaveCount(0);
    });

    test('S6: A press closed to signed-out visitors, with nothing published yet', async ({ompApi, visitor, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const readerName = `${tag}rd`;
        await ompApi.createContext({
            tag,
            restrictSiteAccess: true,
            series: [{path: 'history', title: 'History'}],
            users: [user(readerName, 'Rae', 'Reader', ['reader'])],
        });
        const pages = ['/catalog', '/catalog/series/history', '/catalog/newReleases'];

        // Signed out: each address opens the Login page (Actors row 1;
        // Settings bullet 8); the pages' own parts stay away.
        const outside = new PublicCatalog(visitor, tag);
        for (const pathname of pages) {
            await outside.open(pathname);
            await expect(visitor).toHaveURL(new RegExp(`/${tag}/login`));
            await expect(outside.loginForm()).toBeVisible();
            await expect(outside.count()).toHaveCount(0);
        }

        // The Reader signs in on the press's Login page and opens the
        // catalog: "0 Titles", "All Books" and the message (Actors row 1; Rule 3).
        const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce', viewport: WIDE});
        const page = await context.newPage();
        const login = new LoginPage(page);
        await login.gotoContext(tag);
        await login.expectForm();
        await login.signIn(readerName, `${readerName}${readerName}`);
        const reader = new PublicCatalog(page, tag);
        await reader.gotoCatalog();
        await expect(reader.trail()).toHaveText(trailText('Home', 'Catalog'));
        await expect(reader.pageHeading()).toHaveText('Catalog');
        await expect(reader.count()).toHaveText('0 Titles');
        await expect(reader.emptyHeading()).toHaveText('All Books');
        await expect(reader.emptyMessage()).toHaveText(NO_TITLES);
        await expect(reader.summaries()).toHaveCount(0);
        await expect(reader.loginForm()).toHaveCount(0);

        // The series' and "New Releases" addresses open their pages too.
        await reader.gotoSeries('history');
        await expect(page).toHaveURL(endsWith(`/${tag}/catalog/series/history`));
        await expect(reader.count()).toHaveText('0 Titles');
        await expect(reader.loginForm()).toHaveCount(0);
        await reader.gotoNewReleases();
        await expect(page).toHaveURL(endsWith(`/${tag}/catalog/newReleases`));
        await expect(reader.pageHeading()).toHaveText('New Releases');
        await expect(reader.loginForm()).toHaveCount(0);
        await context.close();

        // Control: the visitor, still signed out, opens the seeded press's
        // catalog: its page, no Login page (Settings bullet 8).
        const seeded = new PublicCatalog(visitor, 'publicknowledge');
        await seeded.gotoCatalog();
        await expect(visitor).toHaveURL(/\/publicknowledge\/(en\/)?catalog$/);
        await expect(seeded.pageHeading()).toHaveText('Catalog');
        await expect(seeded.loginForm()).toHaveCount(0);
    });

    test('S7: the press side of the journal and preprint-server absence: the seeded press offers the catalog', async ({asUser, visitor}) => {
        test.slow();
        const reader = new PublicCatalog(visitor, 'publicknowledge');

        // The three addresses, signed out: the catalog page, the
        // "Monographs" series' page with "All Books", "New Releases" (Rules 1, 13).
        await reader.gotoCatalog();
        await expect(reader.pageHeading()).toHaveText('Catalog');
        await reader.gotoSeries('monographs');
        await expect(visitor).toHaveURL(/\/publicknowledge\/(en\/)?catalog\/series\/monographs$/);
        await expect(reader.list('All Books').or(reader.emptyHeading()).first()).toContainText('All Books');
        await reader.gotoNewReleases();
        await expect(reader.pageHeading()).toHaveText('New Releases');

        // The Press Manager's Navigation tab: "Add item" offers "Catalog",
        // "New Releases" and "Series" (Rule 13).
        const page = await (await asUser('manager.maya')).newPage();
        const nav = new NavigationTab(page, 'publicknowledge', {locale: 'en'});
        await nav.goto();
        const win = await nav.addItem();
        await expect(win.typeSelect.locator('option', {hasText: /^\s*Catalog\s*$/})).toHaveCount(1);
        await expect(win.typeSelect.locator('option', {hasText: /^\s*New Releases\s*$/})).toHaveCount(1);
        await expect(win.typeSelect.locator('option', {hasText: /^\s*Series\s*$/})).toHaveCount(1);
        await win.close();
    });
});
