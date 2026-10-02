// @ts-check
/**
 * @file playwright/tests/U13-article-landing-page-and-reading.spec.js
 *
 * Article landing page & reading — OPS suite, one test per canonical
 * scenario a preprint server runs (S1–S8 common; S10 {OPS} lives in
 * `serial/U13-article-landing-page-and-reading.spec.js`, because the
 * category page reads the search index, which a queued job fills; S9 is
 * the journal's, in the OJS tree), in the preprint server's own words: the
 * preprint's page `preprint/view/{number}`, "Posted" for "Published", the
 * label line "Preprint / {date} ({version})", the version names "Author
 * Original 1.0" / "1.1", the Preprint Server Manager, the fixtures
 * "preprint.pdf", "preprint.html" and "not-an-image.txt", the server named
 * "Coastal Preprints", "Latest preprints" on the home page.
 * Spec: docs/specs/U13-article-landing-page-and-reading.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S8 never reads the "Versions" list or the label line in French.
 * - A2 🐞: S3's older PDF reader is read for its bar and notice only; its
 *   viewer and its "Download" are never used.
 * - A3 ❓: S7 reads the "Downloads" heading and the chart only, never the
 *   sentence.
 * - A5 🐞: the Author never presses "View submission" (S4).
 * - A6 🐞: an older version's browser tab is never read (S3).
 * - A7 🐞, A8 🐞: "ABNT" is never chosen; the RIS file is read for its name
 *   only (S6).
 * - A9 🐞: S6 leaves "MLA" ticked, so the list always opens.
 * - A10 🐞: no reference carries an address in parentheses (S1).
 * - OPS1 🐞: no new version is previewed.
 * - OPS2 🐞, OPS3 🐞: S2 types the URL-Path preprint's number address
 *   alone (no galley or version part) and never a galley's number address
 *   once it has a URL Path.
 * - OPS5 🐞: the PDF reader's return arrow is pressed, never named.
 * - OPS6 🐞: no preprint here has a DOI.
 * - OPS7 🐞, OPS8 🐞: S8 reads the French keyword's value, never its label,
 *   and never opens the French PDF reader.
 * - OPS9 🐞: summaries are opened by their title (S3, and S10's file).
 * - U42 A20 🐞 (the preprint page's empty "References" heading, which Rule
 *   6 names): S1's heading read on "Harbour Notes" leaves "References" out.
 * - U46 A7 🐞 (seeded galleys share one position): S2 reads the main list's
 *   links as a set, never in an order.
 * - A4, A13, A14, OJS1–OJS13: not on a preprint server's paths here (no file-less
 *   galley is seeded; the OJS entries are the journal's).
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. S1, S4 and S7's control publish their own preprints on
 * publicknowledge (submitter `author.alex`; S4 with the ready accounts
 * `manager.maya`, `author.alex`, `reader.rosa`); S2, S3, S5, S6, S7 and S8
 * run on scratch preprint servers with throwaway accounts (the username
 * twice as password), as footnote s says: the version display keys
 * (`subtitle`, `plainLanguageSummary`, `keywords`, `categories`,
 * `coverImage`, `urlPath`), `citationsRaw`, `galleys[]` with `urlPath`,
 * `genre` and `locale`, `published`, and on the context `categories`,
 * `plugins` (CSL on in S3 and S6, "PDF.JS PDF Viewer" off in S7),
 * `themeOptions.displayStats` (S7), `context.enabled: false` and
 * `restrictSiteAccess` (S5), `context.name` (S6) and the two languages
 * (S8). A seeded category is named by its own path (`eng`, not
 * `applied-science/eng`: the key refuses the parent's prefix). S3's second
 * version is made on screen as the server's Manager ("Create New Version"
 * once the version has loaded, the title changed on "Title & Abstract",
 * then "Post").
 *
 * Page objects: shared/playwright/pages/ArticleLandingPages.js (the
 * landing page, the reader page, the summaries, the "Citation Style
 * Language" row and window), the label line's parts included
 * (`ArticleLandingPage.labelLineParts()`).
 *
 * The visitor is the fixture `page` (no user is set anywhere in this file,
 * so it carries no session); every other actor comes from `asUser`. Every
 * absence is read settled and paired with a positive control taken the
 * same way (M4, M6); S6's mailbox silence is bounded by a discussion the
 * Manager opens with a spare account of the same server (A8). Browser
 * dialogs are recorded and answered on the Manager's page. Waits are
 * web-first or bounded by the screen's own answer (A5). Everything here
 * runs in the parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {recordBrowserDialogs} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    LANDING_TEXT: TEXT,
    CITATION_STYLES,
    ArticleLandingPage,
    GalleyReaderPage,
    CitationStyleSettings,
    ArticleSummaries,
    expectNotFoundPage,
    expectLoginPage,
    addressPattern,
    escapeRe,
    flat,
} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {
    PublicationScreen,
    openWorkflow,
    openPublicationPage,
    createNewVersion,
    postPreprint,
    addDiscussion,
} = require('../pages/PublicationPages.js');

const SERVER = 'publicknowledge';
const AUTHOR = 'author.alex';
const REMOTE_URL = 'https://example.org/paper';
const FORMATS = Object.keys(CITATION_STYLES);
const DOWNLOADS = ['Endnote/Zotero/Mendeley (RIS)', 'BibTeX'];
const CSL = 'Citation Style Language';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u13${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6)}`;
}

/** Today as the pages write it (the servers' clock is UTC, `Y-m-d`). */
function today() {
    return new Date().toISOString().slice(0, 10);
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch preprint server with a throwaway Preprint Server Manager
 * and Author (and `extra` accounts); returns the usernames.
 */
async function seedServer(opsApi, tag, {extra = [], ...keys} = {}) {
    const users = [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra];
    await opsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/** The preprint page of a server (`preprint/view/…`); `locale` "en" on the bilingual seeded server. */
function landingOf(page, contextPath, locale = '') {
    return new ArticleLandingPage(page, contextPath, {op: 'preprint', locale});
}

/** An element's words, spaces collapsed. */
async function textOf(locator) {
    return flat(await locator.innerText());
}


test.describe('article landing page and reading', () => {
    test('S1: a published preprint\'s page', {tag: '@smoke'}, async ({page, opsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s1', testInfo);
        const refs = ['Smith, J. (2020). Ridge data. https://example.org/ridge.', 'Jones, K. (2021). Coastal survey.'];
        const tidal = await opsApi.createSubmission({
            tag: `${tag}a`,
            context: SERVER,
            submitter: AUTHOR,
            title: 'Tidal Patterns in Coastal Waters',
            subtitle: 'A field study',
            keywords: ['tide', 'current'],
            plainLanguageSummary: 'How tides move along a coast.',
            coverImage: {file: 'profile-image-400.png'},
            categories: ['eng'],
            citationsRaw: refs,
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const harbour = await opsApi.createSubmission({
            tag: `${tag}b`,
            context: SERVER,
            submitter: AUTHOR,
            title: 'Harbour Notes',
            published: true,
        });
        const landing = landingOf(page, SERVER, 'en');

        // The main column: breadcrumb "Home / Preprints" with "Home" the one
        // link; the label line names the "Versions" entry; the title, the
        // subtitle, "Keywords:" with "tide" and "current" in either order
        // (A11) as plain text, "Abstract" and "Plain Language Summary"
        // (Fields; Rules 6, 9).
        await landing.goto(tidal.submissionId);
        await expect(landing.breadcrumb()).toHaveText('Home / Preprints');
        await expect(landing.breadcrumbLinks()).toHaveText(['Home']);
        await expect(landing.versionEntries()).toHaveCount(1);
        const entry = await textOf(landing.versionEntries().first());
        expect(entry).toMatch(/^\d{4}-\d{2}-\d{2} \(Author Original 1\.0\)$/);
        await expect(landing.labelLineParts()).toHaveText(['Preprint', '/', entry]);
        await expect(landing.title()).toHaveText('Tidal Patterns in Coastal Waters');
        await expect(landing.subtitle()).toHaveText('A field study');
        await expect(landing.contributors().locator('.name')).toHaveText(['Alex Author']);
        // The keywords in either order: the page lists them as the database
        // returns them, with no ORDER BY (fix list B, flake-s26).
        await expect(landing.keywords()).toHaveText(/^\s*Keywords:\s*(tide,\s*current|current,\s*tide)\s*$/);
        await expect(landing.keywords().locator('a')).toHaveCount(0);
        await expect(landing.mainSection('Abstract')).toContainText(`Seeded abstract for ${tag}a.`);
        await expect(landing.mainSection('Plain Language Summary')).toContainText('How tides move along a coast.');
        await expect
            .poll(() => landing.mainOutline())
            .toEqual(['authors', 'Keywords:', 'Abstract', 'Plain Language Summary', 'References']);

        // "References": two paragraphs in order; the address is a link that
        // opens in a new tab, its final "." left out (Rule 18).
        const references = landing.references();
        await expect(references.heading).toBeVisible();
        await expect(references.paragraphs).toHaveText(refs);
        const ridge = references.block.getByRole('link', {name: 'https://example.org/ridge', exact: true});
        await expect(ridge).toHaveAttribute('href', 'https://example.org/ridge');
        await expect(ridge).toHaveAttribute('target', '_blank');
        await expect(references.block.getByRole('link')).toHaveCount(1);

        // The side column, top to bottom: the cover, "PDF", "Posted" over a
        // date, "Versions" with its one plain-text entry, "Categories" with
        // "Applied Science > Engineering" as a link (Fields; Rule 8).
        await expect
            .poll(() => landing.sideOutline())
            .toEqual(['cover image', 'PDF', 'Posted', 'Versions', 'Categories']);
        await expect(landing.coverImage().locator('img')).toBeVisible();
        await expect(landing.galleyLinks()).toHaveText(['PDF']);
        await expect(landing.publishedValue()).toHaveText(entry.slice(0, 10));
        await expect(landing.versionEntries().locator('a')).toHaveCount(0);
        await expect(landing.sideValue('Categories').getByRole('link')).toHaveText(['Applied Science > Engineering']);

        // The links in the side column: the category opens its page (Fields).
        await landing.sideValue('Categories').getByRole('link').click();
        await expect(page).toHaveURL(addressPattern(`/index.php/${SERVER}/en/preprints/category/eng`));
        await expect(page.getByRole('heading', {level: 1})).toContainText('Engineering');

        // An article with little in it: the breadcrumb, the title, the
        // contributor, "Abstract", "Posted" and "Versions", and no other
        // heading (Rule 6; Fields, "Breadcrumb").
        await landing.goto(harbour.submissionId);
        await expect(landing.breadcrumb()).toHaveText('Home / Preprints');
        await expect(landing.contributors().locator('.name')).toHaveText(['Alex Author']);
        await expect(landing.mainSection('Abstract')).toContainText(`Seeded abstract for ${tag}b.`);
        await expect(landing.publishedLine().locator('.label')).toHaveText('Posted');
        await expect(landing.versionEntries()).toHaveCount(1);
        await expect
            .poll(async () => (await landing.visibleHeadings()).filter((h) => h !== 'References'))
            .toEqual(['Harbour Notes', 'Abstract', 'Posted', 'Versions']);

        // Control: "Harbour Notes" has no "Keywords:", no "Plain Language
        // Summary", no "Categories" and no cover, all of which the first
        // preprint showed through the same locators (Rule 6).
        await expect(landing.keywords()).toHaveCount(0);
        await expect(landing.mainSection('Plain Language Summary')).toHaveCount(0);
        await expect(landing.sideItem('Categories')).toHaveCount(0);
        await expect(landing.coverImage()).toHaveCount(0);
        await expect(landing.galleyLinks()).toHaveCount(0);
    });

    test('S2: opening each galley', async ({page, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {author} = await seedServer(opsApi, tag);
        const tidal = await opsApi.createSubmission({
            tag: `${tag}a`,
            context: tag,
            submitter: author,
            title: 'Tidal Patterns',
            galleys: [
                {label: 'PDF', file: 'preprint.pdf', urlPath: 'pdf'},
                {label: 'HTML', file: 'preprint.html'},
                {label: 'Remote', urlRemote: REMOTE_URL},
                {label: 'Data', file: 'not-an-image.txt', genre: 'Data Set'},
            ],
            published: true,
        });
        const harbour = await opsApi.createSubmission({
            tag: `${tag}b`,
            context: tag,
            submitter: author,
            title: 'Harbour Currents',
            urlPath: 'harbour-currents',
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const landing = landingOf(page, tag);
        const reader = new GalleyReaderPage(page);
        const id = tidal.submissionId;
        const articleUrl = landing.urlPattern(id);

        // The two lists: "PDF", "HTML", "Remote" in the first, "Data" alone
        // in the second; no visible heading, a screen reader reads
        // "Downloads" and "Additional Files"; "PDF" ends in "/pdf", "HTML"
        // in "/" and a number (Rules 10, 10b).
        await landing.goto(id);
        await expect.poll(async () => (await landing.galleyLinks().allTextContents()).map(flat).sort()).toEqual(['HTML', 'PDF', 'Remote']);
        await expect(landing.additionalFileLinks()).toHaveText(['Data']);
        await expect(landing.galleyListHeading()).toHaveText(TEXT.downloadsHeading);
        await expect(landing.additionalFilesHeading()).toHaveText(TEXT.additionalFilesHeading);
        await expect(landing.sideColumn().locator('.item.galleys').locator('h2, h3')).toHaveCount(2);
        await expect(landing.sideColumn().locator('.item.galleys').locator('h2:not(.pkp_screen_reader), h3:not(.pkp_screen_reader)')).toHaveCount(0);
        await expect(landing.galleyLink('PDF')).toHaveAttribute('href', addressPattern(landing.url(id), '/pdf'));
        await expect(landing.galleyLink('HTML')).toHaveAttribute('href', addressPattern(landing.url(id), '/\\d+'));

        // The PDF reader: the bar's arrow, title and "Download" ("Download
        // PDF" to a screen reader), the viewer's page, zoom, search and
        // print controls, the tab "View of Tidal Patterns"; "Download" gets
        // "preprint.pdf"; the title and the arrow open the preprint's page
        // (Fields, the PDF reader page; Rules 11, 12).
        await landing.openGalley('PDF');
        await reader.expectLoaded();
        await expect(page).toHaveURL(addressPattern(landing.url(id), '/pdf'));
        await expect(reader.returnLink()).toBeVisible();
        await expect(reader.returnLink().locator(':scope > :not(.pkp_screen_reader)')).toHaveCount(0);
        await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        await expect(reader.downloadLink().locator('.label')).toHaveText(TEXT.download);
        await expect(reader.downloadLinkName()).toHaveText(TEXT.downloadPdf);
        await expect.poll(() => reader.pdfPageCount(), {timeout: 30_000}).toBeGreaterThan(0);
        for (const control of ['pageNumber', 'scaleSelect', 'viewFindButton', 'printButton']) {
            await expect(reader.pdfControl(control)).toBeVisible();
        }
        await expect(page).toHaveTitle(TEXT.pdfTitle('Tidal Patterns'));
        expect(await reader.download()).toBe('preprint.pdf');
        await reader.titleLink().click();
        await expect(page).toHaveURL(articleUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await page.goBack();
        await reader.expectLoaded();
        await reader.returnLink().click();
        await expect(page).toHaveURL(articleUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns');

        // The HTML galley: on a preprint server it downloads
        // "preprint.html" and the browser stays on the page (OPS4; Rule 11).
        const html = await landing.downloadGalley('HTML');
        expect(html.name).toBe('preprint.html');
        expect(html.stayed).toBe(true);
        await expect(page).toHaveURL(articleUrl);

        // A file with no reader: "Data" downloads "not-an-image.txt", and the
        // browser stays on the page (Rule 11).
        const data = await landing.downloadGalley('Data');
        expect(data.name).toBe('not-an-image.txt');
        expect(data.stayed).toBe(true);
        await expect(page).toHaveURL(articleUrl);

        // The remote galley: the browser goes to its address (Rule 11).
        await page.context().route('https://example.org/**', (route) =>
            route.fulfill({status: 200, contentType: 'text/html', body: '<html><body>remote copy</body></html>'})
        );
        await landing.openGalley('Remote');
        await expect(page).toHaveURL(REMOTE_URL);

        // No such galley: the "404 Not Found" page (Rule 13).
        await expectNotFoundPage(page, landing.url(id, {galley: 'nosuchgalley'}));

        // An article's URL Path: the number address lands on the URL Path
        // one, that preprint's page (Rule 1).
        await landing.goto(harbour.submissionId);
        await expect(page).toHaveURL(landing.urlPattern('harbour-currents'));
        await expect(landing.title()).toHaveText('Harbour Currents');

        // Control: "Tidal Patterns", which has no URL Path, stays at its
        // number address (Rule 1).
        await landing.goto(id);
        await expect(page).toHaveURL(articleUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns');
    });

    test('S3: an older version beside the current one', async ({page, asUser, opsApi, appContext, baseURL}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const {manager, author} = await seedServer(opsApi, tag, {
            plugins: {citationstylelanguageplugin: {enabled: true}},
        });
        const submission = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: 'Tidal Patterns',
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const id = submission.submissionId;
        const day = today();

        // Setup (the scenario's given): the Manager makes the second
        // version on screen, retitles it and posts it (footnote s).
        const managerPage = await (await asUser(manager)).newPage();
        const frame = new WorkflowPage(managerPage, tag, {appContext, labels: {publicationGroup: 'Preprint'}});
        await openPublicationPage(managerPage, tag, id, submission.publicationId);
        await frame.expectVersionLoaded();
        const created = await createNewVersion(managerPage);
        await openPublicationPage(managerPage, tag, id, created.id);
        await frame.expectVersionLoaded();
        const screen = new PublicationScreen(managerPage);
        await screen.fillRichText('titleAbstract', 'title', 'en', 'Tidal Patterns Revised');
        await screen.save();
        await postPreprint(managerPage);

        // The current version's page: headed "Tidal Patterns Revised", the
        // date line "{today} — Updated on {today}", two "Versions" entries
        // (the current one plain text, then "{today} (Author Original 1.0)"
        // as a link), the label line naming the current entry, and the APA
        // citation of the revised title (Rules 7, 8, 9, 15). Its "(Original
        // work published {year})" is not asserted: the app adds it only when
        // the two versions were posted on different days (T-ops-1 in
        // .reports/U13/test-ops-findings.md, for the fold).
        const landing = landingOf(page, tag);
        const articleUrl = landing.urlPattern(id);
        await landing.goto(id);
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');
        await expect(landing.publishedValue()).toHaveText(`${day} — Updated on ${day}`);
        await expect(landing.versionEntries()).toHaveCount(2);
        const olderName = `${day} (Author Original 1.0)`;
        await expect(landing.versionEntries().nth(1)).toHaveText(olderName);
        const currentName = await textOf(landing.versionEntries().first());
        expect(currentName).toMatch(new RegExp(`^${day} \\(Author Original 1\\.\\d+\\)$`));
        expect(currentName).not.toBe(olderName);
        await expect(landing.versionEntries().first().locator('a')).toHaveCount(0);
        await expect(landing.versionLink(olderName)).toHaveCount(1);
        await expect(landing.labelLineParts()).toHaveText(['Preprint', '/', currentName]);
        await expect(landing.citationHeading()).toHaveText(TEXT.howToCite);
        await expect(landing.citation()).toContainText('Tidal Patterns Revised');

        // Control: the article's address carries no outdated notice (Rule 5).
        await expect(landing.notices()).toHaveCount(0);

        // The older version's page: "/version/{n}", the notice, headed
        // "Tidal Patterns"; its entry now plain text and the current one a
        // link; "PDF" begins with this address; "How to Cite" cites
        // "Tidal Patterns" with the article's own address (Rules 2, 5, 8,
        // 10b, 15).
        await landing.versionLink(olderName).click();
        await expect(page).toHaveURL(addressPattern(landing.url(id), '/version/\\d+'));
        const olderPath = new URL(page.url()).pathname;
        await expect(landing.notices()).toHaveText([TEXT.outdated(day)]);
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await expect(landing.versionEntries().nth(1).locator('a')).toHaveCount(0);
        await expect(landing.versionLink(currentName)).toHaveAttribute('href', articleUrl);
        await expect(landing.galleyLink('PDF')).toHaveAttribute('href', new RegExp(`^${escapeRe(`${baseURL}${olderPath}`)}/\\d+$`));
        await expect(landing.citation()).toContainText('Tidal Patterns');
        await expect(landing.citation()).not.toContainText('Revised');
        await expect(landing.citation()).toContainText(`${baseURL}${landing.url(id)}`);
        await expect(landing.citation()).not.toContainText('/version/');

        // "most recent version": the article's address, headed "Tidal
        // Patterns Revised" (Rule 5).
        await landing.noticeLink('most recent version').click();
        await expect(page).toHaveURL(articleUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');

        // The older version's PDF reader: the title "Tidal Patterns" and the
        // notice between the bar and the viewer; the arrow opens the
        // article's address (A2; Rule 12; Fields, the PDF reader page).
        await page.goBack();
        await expect(page).toHaveURL(addressPattern(olderPath));
        await landing.openGalley('PDF');
        const reader = new GalleyReaderPage(page);
        await reader.expectLoaded();
        await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        await expect(reader.notice()).toHaveText(TEXT.outdated(day));
        await expect
            .poll(() => page.evaluate(() => {
                // The notice's band sits under the bar, and the viewer's
                // content starts under the band (the frame is padded down
                // past both).
                const bar = document.querySelector('header.header_view');
                const band = document.querySelector('.galley_view_notice');
                const frame = document.querySelector('#pdfCanvasContainer iframe');
                if (!bar || !band || !frame) return null;
                const a = bar.getBoundingClientRect();
                const b = band.getBoundingClientRect();
                const contentTop = frame.getBoundingClientRect().top + parseFloat(getComputedStyle(frame).paddingTop);
                return a.bottom <= b.top + 1 && b.bottom <= contentTop + 1;
            }))
            .toBe(true);
        await reader.returnLink().click();
        await expect(page).toHaveURL(articleUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');

        // A version that does not exist: "404 Not Found" (Rule 2).
        await expectNotFoundPage(page, landing.url(id, {version: 999999}));

        // The home page's summary: its details line ends " - Versions: 2"
        // (Fields, the article summary).
        await page.goto(`/index.php/${tag}/index`);
        await expect(page.getByRole('heading', {name: 'Latest preprints', exact: true})).toBeVisible();
        const summaries = new ArticleSummaries(page);
        await expect(summaries.details('Tidal Patterns Revised')).toBeVisible();
        await expect.poll(() => textOf(summaries.details('Tidal Patterns Revised'))).toMatch(/ - Versions: 2$/);
    });

    test('S4: an unpublished preprint: the preview, and "404 Not Found" for everyone else', async ({page, asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const draft = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, title: 'Tidal Draft'});
        const id = draft.submissionId;
        const visitorView = landingOf(page, SERVER, 'en');

        // The visitor: "404 Not Found" at the preprint's address and at an
        // address that names no preprint (Rule 3; Actors row 2).
        await expectNotFoundPage(page, visitorView.url(id));
        await expectNotFoundPage(page, visitorView.url('no-such-article'));

        // The Reader, signed in: the same answers (Rule 3; Actors row 2).
        const readerPage = await (await asUser('reader.rosa')).newPage();
        await expectNotFoundPage(readerPage, visitorView.url(id));
        await expectNotFoundPage(readerPage, visitorView.url('no-such-article'));

        // The Manager's "Preview": the preprint's page under the preview
        // notice, headed "Tidal Draft", with no "Posted" and no "Versions"
        // (Rule 4; Actors row 2).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const frame = new WorkflowPage(managerPage, SERVER, {appContext, labels: {publicationGroup: 'Preprint'}});
        await frame.gotoEditorial(id);
        await frame.headerButton('Preview').click();
        await managerPage.waitForURL((url) => /\/preprint\/view\/\d+/.test(url.pathname), {waitUntil: 'commit', timeout: 30_000});
        const preview = landingOf(managerPage, SERVER, 'en');
        await preview.expectLoaded();
        await expect(preview.title()).toHaveText('Tidal Draft');
        await expect(preview.notices()).toHaveText([TEXT.preview]);
        await expect(preview.mainSection('Abstract')).toContainText(`Seeded abstract for ${tag}.`);
        await expect(preview.publishedLine()).toHaveCount(0);
        await expect(preview.versionsPart()).toHaveCount(0);

        // Control: the address the preview opened is the one that answered
        // "404 Not Found" to the visitor and the Reader (Rules 3, 4).
        expect(new URL(managerPage.url()).pathname).toMatch(new RegExp(`^/index\\.php/${SERVER}(/en)?/preprint/view/${id}$`));

        // "View submission": the workflow opens on its current stage,
        // Production (Rule 4).
        await preview.noticeLink('View submission').click();
        await frame.expectOpen(id);
        await frame.expectStage('Production');
        await expect(frame.headerButton('Preview')).toBeVisible();

        // The Author: the workflow offers no "Preview" (the Manager's did,
        // read the same way); the typed address opens the same preview
        // under the same notice (A5; Actors row 2; Rule 4).
        const authorPage = await (await asUser(AUTHOR)).newPage();
        const authorFrame = new WorkflowPage(authorPage, SERVER, {appContext, labels: {publicationGroup: 'Preprint'}});
        await authorFrame.gotoAuthor(id);
        await authorFrame.expectVersionLoaded();
        await expect(authorFrame.headerButton('Library')).toBeVisible({timeout: 30_000});
        await expect(authorFrame.headerButton('Preview')).toHaveCount(0);
        const authorView = landingOf(authorPage, SERVER, 'en');
        await authorView.goto(id);
        await expect(authorView.title()).toHaveText('Tidal Draft');
        await expect(authorView.notices()).toHaveText([TEXT.preview]);
    });

    test('S5: a server closed to visitors', async ({page, asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const servers = [];
        for (const [suffix, keys] of [
            ['d', {context: {enabled: false}}],
            ['r', {restrictSiteAccess: true}],
        ]) {
            const tag = makeTag(`s5${suffix}`, testInfo);
            const reader = `${tag}rd`;
            const {author} = await seedServer(opsApi, tag, {...keys, extra: [user(reader, 'Rhea', 'Reader', ['reader'])]});
            const submission = await opsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: 'Tidal Patterns',
                galleys: [{label: 'PDF', file: 'preprint.pdf', urlPath: 'pdf'}],
                published: true,
            });
            servers.push({tag, reader, id: submission.submissionId});
        }

        for (const server of servers) {
            // The visitor: the preprint's address and its galley's address
            // "/pdf" each end on the Login page (Actors, opening paragraph;
            // Rule 10b).
            const visitorView = landingOf(page, server.tag);
            await expectLoginPage(page, visitorView.url(server.id));
            await expectLoginPage(page, visitorView.url(server.id, {galley: 'pdf'}));

            // Its Reader, signed in: the page headed "Tidal Patterns"; "PDF"
            // opens the PDF reader page (Actors, opening paragraph; Rule 11).
            // Control: at the address that sent the visitor to Login.
            const readerPage = await (await asUser(server.reader)).newPage();
            const landing = landingOf(readerPage, server.tag);
            await landing.goto(server.id);
            await expect(readerPage).toHaveURL(landing.urlPattern(server.id));
            await expect(landing.title()).toHaveText('Tidal Patterns');
            await landing.openGalley('PDF');
            const reader = new GalleyReaderPage(readerPage);
            await reader.expectLoaded();
            await expect(readerPage).toHaveURL(landing.urlPattern(server.id, {galley: 'pdf'}));
            await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        }
    });

    test('S6: "How to Cite": another format, a download and the settings window', async ({page, asUser, opsApi, pkpMail, baseURL}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const spare = `${tag}x`;
        const {manager, author} = await seedServer(opsApi, tag, {
            context: {name: 'Coastal Preprints'},
            plugins: {citationstylelanguageplugin: {enabled: true}},
            extra: [user(spare, 'Xena', 'Spare', ['author'])],
        });
        const submission = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: 'Tidal Patterns in Coastal Waters',
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const control = await opsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare, title: `Control ${tag}`});
        const id = submission.submissionId;
        const landing = landingOf(page, tag);

        // The citation: "How to Cite" over an APA citation naming the title,
        // "In Coastal Preprints" and the preprint's address (Fields; Rule 15).
        await landing.goto(id);
        await expect(landing.citationHeading()).toHaveText(TEXT.howToCite);
        const apa = await textOf(landing.citation());
        expect(apa).toContain('Tidal Patterns in Coastal Waters');
        expect(apa).toContain('In Coastal Preprints');
        expect(apa).toContain(`${baseURL}${landing.url(id)}`);

        // "More Citation Formats": the eleven formats, then "Download
        // Citation" with the two downloads; pressed again, the list closes
        // (Rule 15a).
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(FORMATS);
        await expect(landing.downloadCitationLabel()).toHaveText(TEXT.downloadCitation);
        await expect(landing.downloadFormatLinks()).toHaveText(DOWNLOADS);
        await landing.closeFormats();

        // Another format: IEEE replaces the citation in place, the list
        // closes and the address stays; a reload shows APA again (Rule 15a).
        const addressBefore = page.url();
        await landing.openFormats();
        const ieee = await landing.chooseFormat('IEEE');
        expect(ieee).not.toBe(apa);
        expect(ieee).toContain('Tidal Patterns in Coastal Waters');
        await expect(landing.formatsList()).toBeHidden();
        await expect(landing.formatsButton()).toHaveAttribute('aria-expanded', 'false');
        expect(page.url()).toBe(addressBefore);
        await landing.reload();
        await expect.poll(() => textOf(landing.citation())).toBe(apa);

        // A download: "BibTeX" and "Endnote/Zotero/Mendeley (RIS)" download
        // files named after the title (A8; Rule 15b).
        await landing.openFormats();
        expect((await landing.downloadCitation('BibTeX')).name).toBe('Tidal+Patterns+in+Coastal+Waters.bib');
        if ((await landing.formatsButton().getAttribute('aria-expanded')) !== 'true') {
            await landing.openFormats();
        }
        expect((await landing.downloadCitation('Endnote/Zotero/Mendeley (RIS)')).name).toBe('Tidal+Patterns+in+Coastal+Waters.ris');

        // No email: nothing reached the server's Author from the visitor's
        // steps, bounded by a discussion the Manager opens with the spare
        // on the spare's own preprint; the Manager's one mail is that
        // control (Side effects; A8).
        const managerPage = await (await asUser(manager)).newPage();
        const dialogs = recordBrowserDialogs(managerPage);
        const discussion = `Control ${tag}`;
        await openWorkflow(managerPage, tag, control.submissionId);
        await new PublicationScreen(managerPage).openProductionStage();
        await addDiscussion(managerPage, {name: discussion, message: `Control message ${tag}.`, participants: [spare]});
        await pkpMail.expectNone({to: mailOf(author), afterControl: {to: mailOf(spare), subject: discussion}});
        await expect.poll(() => pkpMail.count({to: mailOf(manager), subject: discussion}), {timeout: 20_000}).toBe(1);
        expect(await pkpMail.count({to: mailOf(manager), contains: tag})).toBe(1);

        // The settings window: no primary format, every additional format
        // and both downloads ticked, no publisher location (Fields; Settings
        // bullet 5).
        const csl = new CitationStyleSettings(managerPage, tag);
        await csl.openPlugins();
        await csl.openSettings();
        await expect(csl.primaryRadios()).toHaveCount(FORMATS.length);
        await expect(csl.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);
        await expect(csl.additionalBoxes()).toHaveCount(FORMATS.length);
        await expect(csl.form().locator('input[name="enabledCitationStyles[]"]:checked')).toHaveCount(FORMATS.length);
        await expect(csl.downloadBoxes()).toHaveCount(2);
        await expect(csl.form().locator('input[name="enabledCitationDownloads[]"]:checked')).toHaveCount(2);
        await expect(csl.publisherLocationBox()).toHaveValue('');

        // "Cancel": closes without a question; reopened, no format chosen.
        await csl.primaryRadio('IEEE').check();
        const askedBeforeCancel = dialogs.messages.length;
        await csl.cancelControl().click();
        await csl.expectClosed();
        expect(dialogs.messages.slice(askedBeforeCancel)).toEqual([]);
        await csl.openSettings();
        await expect(csl.primaryRadios()).toHaveCount(FORMATS.length);
        await expect(csl.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);

        // "Close" after a change: it asks; confirmed, nothing is stored.
        await csl.primaryRadio('IEEE').check();
        const askedBeforeClose = dialogs.messages.length;
        await csl.closeButton().click();
        await expect.poll(() => dialogs.messages.slice(askedBeforeClose)).toEqual([TEXT.formChanged]);
        await csl.expectClosed();
        await csl.openSettings();
        await expect(csl.primaryRadios()).toHaveCount(FORMATS.length);
        await expect(csl.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);

        // "OK": IEEE, MLA alone, BibTeX alone, "London, U.K."; the window
        // closes and "Your changes have been saved." shows.
        await csl.primaryRadio('IEEE').check();
        for (const name of FORMATS) {
            await csl.additionalBox(name).setChecked(name === 'MLA');
        }
        await csl.downloadBox('Endnote/Zotero/Mendeley (RIS)').uncheck();
        await csl.publisherLocationBox().fill('London, U.K.');
        const saved = await csl.noticeDuring(TEXT.saved, () => csl.save());
        expect(saved.ok(), `settings save answered ${saved.status()}`).toBe(true);

        // The visitor's page after "OK": the IEEE citation noted earlier,
        // still without a place, since the place is recorded on the preprint
        // when it is posted (pkp-lib#7527) and this one was posted with the
        // box empty; "MLA" alone; "BibTeX" alone, whose file carries no
        // place either (Rule 16).
        await landing.reload();
        await expect.poll(() => textOf(landing.citation())).toBe(ieee);
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(['MLA']);
        await expect(landing.downloadFormatLinks()).toHaveText(['BibTeX']);
        expect((await landing.downloadCitation('BibTeX')).text).not.toContain('London, U.K.');

        // Switching the plugin off: it asks, then "…has been disabled." and
        // the row offers no "Settings"; the visitor's page has no "How to
        // Cite" (Settings bullet 4).
        await csl.openPlugins();
        await expect(csl.enabledBox()).toBeChecked();
        await expect(csl.arrow().or(csl.row().locator('a.hide_extras'))).toHaveCount(1);
        const question = await csl.noticeDuring(TEXT.pluginDisabled(CSL), () => csl.setEnabled(false));
        expect(question).toContain(TEXT.disableQuestion);
        await expect(csl.enabledBox()).not.toBeChecked();
        await expect(csl.row().locator('a.show_extras, a.hide_extras')).toHaveCount(0);
        await expect(csl.settingsLink()).toHaveCount(0);
        await landing.reload();
        await expect(landing.galleyLinks()).toHaveText(['PDF']);
        await expect(landing.citationBlock()).toHaveCount(0);

        // Switching it on again: "…has been enabled."; the visitor's page
        // shows the IEEE citation again (Settings bullet 4).
        await csl.noticeDuring(TEXT.pluginEnabled(CSL), () => csl.setEnabled(true));
        await expect(csl.enabledBox()).toBeChecked();
        await landing.reload();
        await expect.poll(() => textOf(landing.citation())).toBe(ieee);

        // Control: "MLA" alone still: the settings were kept (Settings bullet 4).
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(['MLA']);
    });

    test('S7: the PDF viewer switched off, and the downloads chart', async ({page, opsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s7', testInfo);
        const {author} = await seedServer(opsApi, tag, {
            plugins: {pdfjsviewerplugin: {enabled: false}},
            themeOptions: {displayStats: 'bar'},
        });
        const submission = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: 'Tidal Patterns',
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const seeded = await opsApi.createSubmission({
            tag: `${tag}p`,
            context: SERVER,
            submitter: AUTHOR,
            title: 'Tidal Patterns in Coastal Waters',
            published: true,
        });
        const landing = landingOf(page, tag);

        // "PDF" with the viewer off: "preprint.pdf" downloads and the
        // browser stays on the page (Settings bullet 1; Rule 11).
        await landing.goto(submission.submissionId);
        const pdf = await landing.downloadGalley('PDF');
        expect(pdf.name).toBe('preprint.pdf');
        expect(pdf.stayed).toBe(true);
        await expect(page).toHaveURL(landing.urlPattern(submission.submissionId));

        // The "Downloads" chart: a main-column section headed "Downloads"
        // with a bar chart and nothing counted (A3; Rule 17; Side effects).
        await expect(landing.mainSection('Downloads')).toHaveCount(1);
        await expect(landing.downloadsChart().locator('h2.label')).toHaveText('Downloads');
        await expect(landing.downloadsChart().locator('canvas')).toBeVisible();
        await expect.poll(() => landing.chartReading(), {timeout: 30_000}).not.toBeNull();
        const chart = await landing.chartReading();
        expect(chart && chart.type).toBe('bar');
        expect(chart && chart.values.every((v) => v === 0)).toBe(true);

        // Control: the seeded server, at "Do not display…", shows no
        // "Downloads" section on a preprint's page (Settings bullet 6).
        const seededLanding = landingOf(page, SERVER, 'en');
        await seededLanding.goto(seeded.submissionId);
        await expect(seededLanding.mainSection('Abstract')).toBeVisible();
        await expect(seededLanding.mainSection('Downloads')).toHaveCount(0);
        await expect(seededLanding.downloadsChart()).toHaveCount(0);
    });

    test('S8: the page in French', async ({page, opsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s8', testInfo);
        const {author} = await seedServer(opsApi, tag, {
            context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        });
        const submission = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            locale: 'en',
            title: {en: 'Tidal Patterns', fr_CA: 'Motifs des marées'},
            abstract: {en: 'How tides move.', fr_CA: 'Comment bougent les marées.'},
            keywords: {en: ['tide'], fr_CA: ['marée']},
            galleys: [
                {label: 'PDF', locale: 'en', file: 'preprint.pdf'},
                {label: 'HTML', locale: 'fr_CA', file: 'preprint.html'},
            ],
            published: true,
        });
        const id = submission.submissionId;
        const english = landingOf(page, tag, 'en');
        const french = landingOf(page, tag, 'fr_CA');

        // The English page: "Tidal Patterns", "Keywords: tide", "PDF" and
        // "HTML (French (Canada))" (Rules 10a, 21).
        await english.goto(id);
        await expect(english.title()).toHaveText('Tidal Patterns');
        await expect(english.keywords()).toHaveText('Keywords: tide');
        await expect(english.mainSection('Abstract')).toContainText('How tides move.');
        await expect(english.galleyLinks()).toHaveText(['PDF', 'HTML (French (Canada))']);

        // The French page: "Motifs des marées", the French abstract under
        // "Résumé", the French keyword (its label is OPS7), "PDF (anglais)"
        // and "HTML" (Rules 10a, 21).
        await french.goto(id);
        await expect(french.title()).toHaveText('Motifs des marées');
        await expect(french.mainSection('Résumé')).toContainText('Comment bougent les marées.');
        await expect(french.mainSection('Résumé')).not.toContainText('How tides move.');
        await expect(french.keywords().locator('.value')).toHaveText('marée');
        await expect(french.galleyLinks()).toHaveText(['PDF (anglais)', 'HTML']);

        // Control: the English address again (Rule 21).
        await english.goto(id);
        await expect(english.title()).toHaveText('Tidal Patterns');
        await expect(english.galleyLinks()).toHaveText(['PDF', 'HTML (French (Canada))']);
    });
});
