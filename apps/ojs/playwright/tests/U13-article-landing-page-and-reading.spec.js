// @ts-check
/**
 * @file playwright/tests/U13-article-landing-page-and-reading.spec.js
 *
 * Article landing page & reading — OJS suite, one test per canonical
 * scenario the spec runs on OJS (S1–S8 common here; S9 {OJS} in
 * serial/U13-article-landing-page-and-reading.spec.js, since its category
 * page needs the queue drained; S10 is the preprint server's, in the OPS
 * tree).
 * Spec: docs/specs/U13-article-landing-page-and-reading.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: S3's older PDF reader is read for its title, notice and arrow
 *   only; its viewer and its "Download" are not.
 * - A3 🐞: S7 reads the drawn chart; the sentence it removes is not read.
 * - A5 🐞: S4's Author reads the preview's notice; its "View submission"
 *   is not pressed.
 * - A6 🐞: the older version's browser tab is never read.
 * - A8 🐞: S6's RIS file is read for its name only.
 * - A1, A4, A7, A9, A10, A13, A14, OJS1–OJS13: not on these scenarios' paths (S8
 *   reads no "Versions" entry in French; S3 and S6 publish into a
 *   published issue; no "ABNT", no "Additional Citation Formats" all
 *   unticked, no bracketed address; the Publication Facts, the
 *   recommendation lists and the Lens page's script error are left alone;
 *   the PDF reader's arrow is read on an article in no issue only).
 *   OPS1–OPS9: the preprint server's, in that tree.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. S1 and S4 run on publicknowledge (S1 signed out,
 * submitter `author.alex`; S4 with `manager.maya`, `author.alex` and
 * `reader.rosa`); the others on scratch journals with throwaway accounts
 * (the username twice as password), as footnote s says: the version's
 * display values, `galleys[]` with `urlPath` and `genre`, `citationsRaw`,
 * `issues[]`, `plugins`,
 * `themeOptions`, `context.enabled`, `restrictSiteAccess` (S5) and the
 * locale maps. No key makes a second version: S3 uses "Create New
 * Version" (U49's opener, which waits for the version to load), changes
 * the title on "Title & Abstract" and publishes.
 *
 * The visitor is the fixture `page`: no default user is set, so its
 * context is signed out (patterns.md "Fixture selection"); every signed-in
 * actor is opened through `asUser`. Every absence is read settled and
 * paired with a positive control taken the same way (M4, M6); S6's
 * mailbox silence is bounded by a "Notify" the test sends to a spare
 * account of its own journal (A8). Browser dialogs are recorded and
 * answered on the Journal Manager's page. Waits are web-first or bounded
 * by the screen's own answer (A5). Everything runs in the parallel `ojs`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {recordBrowserDialogs} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    LANDING_TEXT: TEXT,
    ArticleLandingPage,
    CitationStyleSettings,
    GalleyReaderPage,
    CITATION_STYLES,
    addressPattern,
    escapeRe,
    expectLoginPage,
    expectNotFoundPage,
    flat,
    longDate,
    todayCandidates,
} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const JOURNAL = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const READER = 'reader.rosa';
const REMOTE_URL = 'https://example.org/paper';
const COVER = {file: 'profile-image-400.png'};
const NOTIFY_SUBJECT = 'Discussion (Submission)';
const REFERENCES = ['Smith, J. (2020). Ridge data. https://example.org/ridge.', 'Jones, K. (2021). Coastal survey.'];
const ALL_FORMATS = Object.keys(CITATION_STYLES);
const ALL_DOWNLOADS = ['Endnote/Zotero/Mendeley (RIS)', 'BibTeX'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u13${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch journal with a throwaway Journal Manager and Author, and
 * `extra` accounts; returns the usernames and the context's answer.
 */
async function seedJournal(ojsApi, tag, {extra = [], ...keys} = {}) {
    const users = [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra];
    const context = await ojsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, author: `${tag}au`, context};
}

/** The published issue the scenarios name. */
const ISSUE_2026 = {volume: 1, number: 1, year: 2026};

/** The server's today, read from a date the page wrote: one of the runner's two candidates. */
function expectToday(date) {
    expect(date).toMatch(DATE);
    expect(todayCandidates()).toContain(date);
}

/**
 * Publish the version shown on the workflow's Publication page. A version
 * not yet through "Review Publishing Details" opens it (a new version is
 * one: it starts queued): its version details filled, its "Issue
 * Assignment" left at the preselection the panel fetches (the version's
 * issue), which the page object waits for before "Confirm"; a version
 * whose panel was confirmed before goes straight to the confirmation. The
 * page object repeats a swallowed first press.
 */
async function publishShownVersion(page, pub) {
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    const panel = await pub.pressPublish({or: confirm});
    if (panel) {
        await pub.fillVersionDetails(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(confirm).toBeVisible({timeout: 30_000});
    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.ok(), {timeout: 30_000});
    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
    await published;
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
}

test.describe('article landing page and reading', () => {
    test('S1: a published article\'s page', {tag: '@smoke'}, async ({page, ojsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s1', testInfo);
        const [tidal, harbour] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: AUTHOR,
                title: 'Tidal Patterns in Coastal Waters',
                subtitle: 'A field study',
                keywords: ['tide', 'current'],
                plainLanguageSummary: 'How tides move along a coast.',
                coverImage: COVER,
                categories: ['eng'],
                articleNumber: 'e42',
                citationsRaw: REFERENCES,
                section: 'ART',
                galleys: [{label: 'PDF', file: 'article.pdf'}],
                published: true,
                issue: {volume: 1, number: 2, year: 2014},
            }),
            ojsApi.createSubmission({
                tag: `${tag}h`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: 'Harbour Notes',
                published: true,
            }),
        ]);
        const landing = new ArticleLandingPage(page, JOURNAL, {locale: 'en'});

        // The main column: the address, the breadcrumb and its links, the
        // title and subtitle, then keywords (plain text), "Abstract" and
        // "Plain Language Summary" below the contributors (Fields; Rule 6).
        await landing.goto(tidal.submissionId);
        await expect(page).toHaveURL(landing.urlPattern(tidal.submissionId));
        await expect(landing.breadcrumb()).toHaveText('Home / Archives / Vol. 1 No. 2 (2014) / Articles');
        await expect(landing.breadcrumbLinks()).toHaveText(['Home', 'Archives', 'Vol. 1 No. 2 (2014)']);
        await expect(landing.title()).toHaveText('Tidal Patterns in Coastal Waters');
        await expect(landing.subtitle()).toHaveText('A field study');
        await expect(landing.contributors()).toHaveCount(1);
        await expect(landing.contributors()).toContainText('Alex Author');
        // The keywords in either order: the page lists them as the database
        // returns them, with no ORDER BY (fix list B, flake-s26).
        await expect(landing.keywords()).toHaveText(/^\s*Keywords:\s*(tide,\s*current|current,\s*tide)\s*$/);
        await expect(landing.keywords().getByRole('link')).toHaveCount(0);
        await expect(landing.mainSection('Abstract')).toContainText(`Seeded abstract for ${tag}.`);
        await expect(landing.mainSection('Plain Language Summary')).toContainText('How tides move along a coast.');
        expect(await landing.mainOutline()).toEqual(['authors', 'Keywords:', 'Abstract', 'Plain Language Summary', 'References']);

        // "References": two paragraphs in order; the address a link that
        // opens in a new tab, the final "." outside it (Rule 18).
        const references = landing.references();
        await expect(references.heading).toBeVisible();
        await expect(references.paragraphs).toHaveText(REFERENCES);
        const ridge = references.paragraphs.nth(0).getByRole('link');
        await expect(ridge).toHaveText('https://example.org/ridge');
        await expect(ridge).toHaveAttribute('href', 'https://example.org/ridge');
        await expect(ridge).toHaveAttribute('target', '_blank');
        await expect(references.paragraphs.nth(1).getByRole('link')).toHaveCount(0);

        // The side column top to bottom; the date, the one "Versions"
        // entry as plain text, the issue a link, the section plain text,
        // the category a link, the article number (Fields; Rule 8).
        expect(await landing.sideOutline()).toEqual([
            'cover image',
            'PDF',
            'Published',
            'Versions',
            'Issue',
            'Section',
            'Categories',
            'Article Number',
        ]);
        await expect(landing.coverImage().locator('img')).toBeVisible();
        const date = flat(await landing.publishedValue().innerText());
        expectToday(date);
        await expect(landing.versionEntries()).toHaveText([`${date} (Version of Record 1.0)`]);
        await expect(landing.versionsPart().getByRole('link')).toHaveCount(0);
        await expect(landing.sideValue('Issue').getByRole('link')).toHaveText('Vol. 1 No. 2 (2014)');
        await expect(landing.sideValue('Section')).toHaveText('Articles');
        await expect(landing.sideValue('Section').getByRole('link')).toHaveCount(0);
        await expect(landing.sideValue('Categories').getByRole('link')).toHaveText(['Engineering']);
        await expect(landing.sideValue('Article Number')).toHaveText('e42');
        await expect(landing.sideValue('Article Number').getByRole('link')).toHaveCount(0);

        // The links in the side column: the issue's page, then the
        // category's page (Fields, the side column).
        await landing.sideValue('Issue').getByRole('link').click();
        await expect(page).toHaveURL(/\/issue\/view\/\d+$/);
        await expect(page.getByRole('heading', {level: 1})).toContainText('Vol. 1 No. 2 (2014)');
        await landing.goto(tidal.submissionId);
        await landing.sideValue('Categories').getByRole('link', {name: 'Engineering', exact: true}).click();
        await expect(page).toHaveURL(/\/catalog\/category\/[\w./-]+$/);
        await expect(page.getByRole('heading', {level: 1})).toHaveText('Engineering');

        // An article with little in it: the breadcrumb without an issue,
        // the title, the contributor and no other heading than "Abstract",
        // "Published", "Versions" and "Section" (Rule 6; Fields,
        // "Breadcrumb").
        await landing.goto(harbour.submissionId);
        await expect(landing.breadcrumb()).toHaveText('Home / Archives / Articles');
        await expect(landing.contributors()).toHaveCount(1);
        expect(await landing.visibleHeadings()).toEqual(['Harbour Notes', 'Abstract', 'Published', 'Versions', 'Section']);

        // Control: none of what "Harbour Notes" lacks is on its page, all
        // of it on the other article's, read the same way (Rule 6).
        await expect(landing.keywords()).toHaveCount(0);
        await expect(landing.mainSection('Plain Language Summary')).toHaveCount(0);
        await expect(landing.sideItem('Categories')).toHaveCount(0);
        await expect(landing.coverImage()).toHaveCount(0);
        await landing.goto(tidal.submissionId);
        await expect(landing.keywords()).toHaveCount(1);
        await expect(landing.mainSection('Plain Language Summary')).toHaveCount(1);
        await expect(landing.sideItem('Categories')).toHaveCount(1);
        await expect(landing.coverImage()).toHaveCount(1);
    });

    test('S2: opening each galley', async ({page, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {author} = await seedJournal(ojsApi, tag);
        const [tidal, harbour] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: 'Tidal Patterns',
                galleys: [
                    {label: 'PDF', file: 'article.pdf', urlPath: 'pdf'},
                    {label: 'HTML', file: 'article.html'},
                    {label: 'XML', file: 'article.xml'},
                    {label: 'Remote', urlRemote: REMOTE_URL},
                    {label: 'Data', file: 'notes.md', genre: 'Data Set'},
                ],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}h`,
                context: tag,
                submitter: author,
                title: 'Harbour Currents',
                urlPath: 'harbour-currents',
                galleys: [{label: 'PDF', file: 'article.pdf'}],
                published: true,
            }),
        ]);
        const landing = new ArticleLandingPage(page, tag);
        const reader = new GalleyReaderPage(page);
        const article = landing.url(tidal.submissionId);

        // The two lists: the main galleys, then "Data" alone below; the
        // screen reader's headings; the "PDF" link ends in its URL Path,
        // "HTML" in a number (Rules 10, 10b). The page's order among
        // seeded galleys is loose (U46 A7), so the lists are read as sets.
        await landing.goto(tidal.submissionId);
        expect([...(await landing.galleyLinks().allInnerTexts())].map(flat).sort()).toEqual(['HTML', 'PDF', 'Remote', 'XML']);
        await expect(landing.additionalFileLinks()).toHaveText(['Data']);
        const outline = await landing.sideOutline();
        expect(outline.indexOf('Data')).toBeGreaterThan(Math.max(...['PDF', 'HTML', 'XML', 'Remote'].map((l) => outline.indexOf(l))));
        await expect(landing.galleyListHeading()).toHaveText(TEXT.downloadsHeading);
        await expect(landing.additionalFilesHeading()).toHaveText(TEXT.additionalFilesHeading);
        await expect(landing.galleyLink('PDF')).toHaveAttribute('href', addressPattern(article, '/pdf'));
        await expect(landing.galleyLink('HTML')).toHaveAttribute('href', addressPattern(article, '/\\d+'));

        // The PDF reader: the bar, "Download" read "Download PDF", the
        // viewer's controls and document, the tab; "Download" gets
        // "article.pdf"; the title and the arrow open the article's page
        // (Fields, the PDF reader page; Rules 11, 12).
        await landing.openGalley('PDF');
        await expect(page).toHaveURL(addressPattern(article, '/pdf'));
        await reader.expectLoaded();
        await expect(reader.returnLink()).toBeVisible();
        await expect(reader.returnLinkName()).toHaveText(TEXT.returnToArticle);
        await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        await expect(reader.downloadLink()).toContainText(TEXT.download);
        await expect(reader.downloadLinkName()).toHaveText(TEXT.downloadPdf);
        for (const control of ['pageNumber', 'zoomInButton', 'scaleSelect', 'viewFindButton', 'printButton']) {
            await expect(reader.pdfControl(control)).toBeVisible({timeout: 30_000});
        }
        await expect.poll(() => reader.pdfPageCount(), {timeout: 30_000}).toBeGreaterThan(0);
        await expect(page).toHaveTitle(TEXT.pdfTitle('Tidal Patterns'));
        expect(await reader.download()).toBe('article.pdf');
        await reader.titleLink().click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await page.goBack();
        await reader.expectLoaded();
        await reader.returnLink().click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns');

        // The HTML reader: the arrow read "Return to Article Details", the
        // title, no "Download", the full text; the arrow opens the page
        // (Fields, the HTML reader page; Rule 11).
        await landing.openGalley('HTML');
        await reader.expectLoaded();
        await expect(reader.returnLinkName()).toHaveText(TEXT.returnToArticle);
        await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        await expect(reader.downloadLink()).toHaveCount(0);
        await expect(reader.htmlFrame().locator('body')).toContainText('A small HTML file', {timeout: 30_000});
        await reader.returnLink().click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns');

        // The XML galley: a page of the journal with "article.xml" laid out
        // by the Lens reader, its text showing (Rule 11).
        await landing.openGalley('XML');
        await expect(page).toHaveURL(addressPattern(article, '/\\d+'));
        await expect(page.getByText('The body text of the JATS fixture, one paragraph.').first()).toBeVisible({timeout: 30_000});
        await expect(page).toHaveTitle(/^Tidal Patterns \| /);

        // A file with no reader downloads, the browser staying (Rule 11).
        await landing.goto(tidal.submissionId);
        const data = await landing.downloadGalley('Data');
        expect(data.name).toBe('notes.md');
        expect(data.stayed).toBe(true);
        await expect(page).toHaveURL(addressPattern(article));

        // The remote galley takes the browser to its address (Rule 11).
        await page.context().route('https://example.org/**', (route) =>
            route.fulfill({status: 200, contentType: 'text/html', body: '<html><body>remote copy</body></html>'})
        );
        await landing.openGalley('Remote');
        await expect(page).toHaveURL(REMOTE_URL);

        // No such galley (Rule 13).
        await expectNotFoundPage(page, `${article}/nosuchgalley`);

        // An article's URL Path: the number address forwards, and so does a
        // galley part after it; the PDF reader opens (Rule 1).
        const harbourPath = landing.url('harbour-currents');
        await page.goto(landing.url(harbour.submissionId));
        await expect(page).toHaveURL(addressPattern(harbourPath));
        await expect(landing.title()).toHaveText('Harbour Currents');
        const pdfHref = await landing.galleyLink('PDF').getAttribute('href');
        const galleyNumber = (pdfHref || '').match(addressPattern(harbourPath, '/(\\d+)'));
        expect(galleyNumber, `the PDF link ${pdfHref} is ${harbourPath}/{number}`).not.toBeNull();
        await page.goto(landing.url(harbour.submissionId, {galley: galleyNumber[1]}));
        await expect(page).toHaveURL(addressPattern(harbourPath, `/${galleyNumber[1]}`));
        await reader.expectLoaded();
        await expect(reader.titleLink()).toHaveText('Harbour Currents');

        // Control: "Tidal Patterns", with no URL Path, stays at its number
        // address (Rule 1).
        await landing.goto(tidal.submissionId);
        await expect(page).toHaveURL(addressPattern(article));
    });

    test('S3: an older version beside the current one', async ({page, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {
            plugins: {citationstylelanguageplugin: {enabled: true}},
            issues: [{...ISSUE_2026, published: true}],
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: 'Tidal Patterns',
            galleys: [
                {label: 'PDF', file: 'article.pdf'},
                {label: 'HTML', file: 'article.html'},
            ],
            published: true,
            issue: ISSUE_2026,
        });

        // The second version, made on screen as the Journal Manager: "Create
        // New Version", the new title on "Title & Abstract", "Publish".
        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        const dialog = await pub.openCreateVersionDialog();
        await pub.confirmVersionDialog(dialog);
        await new WorkflowPage(managerPage, tag).expectVersionLoaded();
        await pub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        await pub.setRichText('titleAbstract-title-control-en', 'Tidal Patterns Revised');
        await pub.save();
        await publishShownVersion(managerPage, pub);

        const landing = new ArticleLandingPage(page, tag);
        const reader = new GalleyReaderPage(page);
        const article = landing.url(submissionId);

        // The current version's page: its title, the date line, the two
        // "Versions" entries newest first (the current one plain text), and
        // the APA citation naming the new title (Rules 7, 8, 15). Its
        // "(Original work published {year})" is not read: with both
        // versions published the same day the citation carries none
        // (T-ojs-1, `.reports/U13/test-ojs-findings.md`).
        await landing.goto(submissionId);
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');
        const dateLine = flat(await landing.publishedValue().innerText());
        const dates = dateLine.match(/^(\S+) — Updated on (\S+)$/);
        expect(dates, `the date line "${dateLine}"`).not.toBeNull();
        expectToday(dates[1]);
        expect(dates[2]).toBe(dates[1]);
        const today = dates[1];
        const older = `${today} (Version of Record 1.0)`;
        await expect(landing.versionEntries()).toHaveCount(2);
        await expect(landing.versionEntries().nth(0)).toHaveText(`${today} (Version of Record 1.1)`);
        await expect(landing.versionEntries().nth(0).getByRole('link')).toHaveCount(0);
        await expect(landing.versionEntries().nth(1)).toHaveText(older);
        await expect(landing.versionLink(older)).toBeVisible();
        await expect(landing.citationHeading()).toHaveText(TEXT.howToCite);
        await expect(landing.citation()).toContainText('Tidal Patterns Revised');

        // The older version's page: its own address, the notice, its title;
        // its "Versions" entry plain, the current one a link; the "PDF"
        // link under this address; "How to Cite" on the older title with
        // the article's own address (Rules 2, 5, 8, 10b, 15).
        await landing.versionLink(older).click();
        await expect(page).toHaveURL(addressPattern(article, '/version/\\d+'));
        const olderUrl = page.url();
        await expect(landing.notices()).toHaveText([TEXT.outdated(today)]);
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await expect(landing.versionEntries().nth(1)).toHaveText(older);
        await expect(landing.versionEntries().nth(1).getByRole('link')).toHaveCount(0);
        await expect(landing.versionEntries().nth(0).getByRole('link')).toHaveCount(1);
        expect(await landing.galleyLink('PDF').getAttribute('href')).toMatch(new RegExp(`^${escapeRe(olderUrl)}/`));
        await expect(landing.citation()).toContainText('Tidal Patterns');
        await expect(landing.citation()).not.toContainText('Tidal Patterns Revised');
        await expect(landing.citation()).toContainText(`/index.php/${tag}/article/view/${submissionId}`);
        await expect(landing.citation()).not.toContainText('/version/');

        // "most recent version" opens the article's address (Rule 5).
        await landing.noticeLink('most recent version').click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');

        // The older version's PDF reader: its title and the notice with the
        // date as "2026-09-25"; the arrow opens the article's address
        // (Rule 12; Fields, the PDF reader page).
        await page.goBack();
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await landing.openGalley('PDF');
        await reader.expectLoaded();
        await expect(reader.titleLink()).toHaveText('Tidal Patterns');
        await expect(reader.notice()).toHaveText(TEXT.outdated(today));
        await reader.returnLink().click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');

        // The older version's HTML reader: the notice with the date written
        // out, the bar reading the current title; the title opens the
        // article's address (Rule 12; Fields, the HTML reader page).
        await page.goto(olderUrl);
        await expect(landing.title()).toHaveText('Tidal Patterns');
        await landing.openGalley('HTML');
        await reader.expectLoaded();
        await expect(reader.notice()).toHaveText(TEXT.outdated(longDate(today)));
        await expect(reader.titleLink()).toHaveText('Tidal Patterns Revised');
        await reader.titleLink().click();
        await expect(page).toHaveURL(addressPattern(article));
        await expect(landing.title()).toHaveText('Tidal Patterns Revised');

        // Control: the article's address carries no notice; the older
        // page's, read the same way, carried one (Rule 5).
        await expect(landing.notices()).toHaveCount(0);
        await page.goto(olderUrl);
        await expect(landing.notices()).toHaveCount(1);
    });

    test('S4: an unpublished article: the preview, and "404 Not Found" for everyone else', async ({page, asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const [draft, scheduled] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: AUTHOR,
                title: 'Tidal Draft',
                decisions: ['sendExternalReview', 'accept', 'sendToProduction'],
            }),
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: 'Tidal Scheduled',
                published: true,
                issue: {volume: 2, number: 1, year: 2015},
            }),
        ]);
        const landing = new ArticleLandingPage(page, JOURNAL);
        const addresses = [landing.url(draft.submissionId), landing.url(scheduled.submissionId), landing.url('no-such-article')];

        // The visitor: "404 Not Found" for the unpublished, the scheduled
        // and an unknown article (Rule 3; Actors row 2).
        for (const url of addresses) {
            await expectNotFoundPage(page, url);
        }
        await page.goto(addresses[0]);
        const visitorPath = new URL(page.url()).pathname;

        // The Reader, signed in: the same (Rule 3; Actors row 2).
        const readerPage = await (await asUser(READER)).newPage();
        for (const url of addresses) {
            await expectNotFoundPage(readerPage, url);
        }

        // The Journal Manager's "Preview" in the workflow's header: the
        // page under the preview notice, headed "Tidal Draft", with no
        // "Published" line and no "Versions" (Rule 4; Actors row 2).
        const managerPage = await (await asUser(MANAGER)).newPage();
        const managerFrame = new WorkflowPage(managerPage, JOURNAL);
        await managerFrame.gotoEditorial(draft.submissionId);
        await expect(managerFrame.headerButton('Preview')).toBeVisible({timeout: 30_000});
        await managerFrame.headerButton('Preview').click();
        await managerPage.waitForURL(new RegExp(`/article/view/${draft.submissionId}$`), {waitUntil: 'commit', timeout: 30_000});
        const preview = new ArticleLandingPage(managerPage, JOURNAL);
        await preview.expectLoaded();
        const previewPath = new URL(managerPage.url()).pathname;
        await expect(preview.notices()).toHaveText([TEXT.preview]);
        await expect(preview.title()).toHaveText('Tidal Draft');
        await expect(preview.publishedLine()).toHaveCount(0);
        await expect(preview.versionsPart()).toHaveCount(0);
        await expect(preview.sideValue('Section')).toHaveText('Articles');

        // "View submission": the workflow on its current stage, Production
        // (Rule 4).
        await preview.noticeLink('View submission').click();
        await managerFrame.expectOpen(draft.submissionId);
        await expect(managerPage.getByRole('heading', {name: 'Workflow: Production'})).toBeVisible({timeout: 30_000});

        // The Author: "View" on My Submissions opens a workflow with no
        // "Preview" (its header's "Library" there, the manager's "Preview"
        // the control); the typed address opens the same preview under the
        // same notice (Actors row 2; Rule 4; A5).
        const authorPage = await (await asUser(AUTHOR)).newPage();
        const mySubmissions = new MySubmissionsPage(authorPage, JOURNAL);
        await mySubmissions.goto();
        await mySubmissions.searchFor(String(draft.submissionId));
        const row = authorPage
            .getByRole('row')
            .filter({hasText: 'Tidal Draft'})
            .filter({has: authorPage.getByRole('cell', {name: String(draft.submissionId), exact: true})});
        await expect(row).toHaveCount(1, {timeout: 30_000});
        const authorFrame = new WorkflowPage(authorPage, JOURNAL);
        await authorFrame.openFromRow(row, draft.submissionId);
        await expect(authorFrame.headerButton('Library')).toBeVisible({timeout: 30_000});
        await expect(authorFrame.headerButton('Preview')).toHaveCount(0);
        const authorPreview = new ArticleLandingPage(authorPage, JOURNAL);
        await authorPreview.goto(draft.submissionId);
        await expect(authorPreview.notices()).toHaveText([TEXT.preview]);
        await expect(authorPreview.title()).toHaveText('Tidal Draft');

        // Control: the address "Preview" opened is the one that answered
        // "404 Not Found" to the visitor (Rules 3, 4).
        expect(previewPath).toBe(visitorPath);
        expect(previewPath).toMatch(new RegExp(`^/index\\.php/${JOURNAL}(/en)?/article/view/${draft.submissionId}$`));
    });

    test('S5: a journal closed to visitors', async ({page, asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const closedTag = `${tag}c`;
        const lockedTag = `${tag}l`;
        const readerOf = (t) => user(`${t}rd`, 'Rita', 'Reader', ['reader']);
        const [closed, locked] = await Promise.all([
            seedJournal(ojsApi, closedTag, {context: {enabled: false}, extra: [readerOf(closedTag)]}),
            seedJournal(ojsApi, lockedTag, {restrictSiteAccess: true, extra: [readerOf(lockedTag)]}),
        ]);
        const [closedArticle, lockedArticle] = await Promise.all([
            ojsApi.createSubmission({
                tag: closedTag,
                context: closedTag,
                submitter: closed.author,
                title: 'Tidal Patterns',
                galleys: [{label: 'PDF', file: 'article.pdf', urlPath: 'pdf'}],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: lockedTag,
                context: lockedTag,
                submitter: locked.author,
                title: 'Tidal Patterns',
                galleys: [{label: 'PDF', file: 'article.pdf', urlPath: 'pdf'}],
                published: true,
            }),
        ]);

        for (const [contextPath, {submissionId}] of [
            [closedTag, closedArticle],
            [lockedTag, lockedArticle],
        ]) {
            // The visitor: the article's address and the galley's, the
            // Login page each time (Actors, opening paragraph; Rule 10b).
            const visitorLanding = new ArticleLandingPage(page, contextPath);
            await expectLoginPage(page, visitorLanding.url(submissionId));
            await expectLoginPage(page, visitorLanding.url(submissionId, {galley: 'pdf'}));

            // The journal's Reader, signed in: the page, and "PDF" opens the
            // PDF reader. Control: the same address that sent the visitor
            // to Login (Actors, opening paragraph; Rule 11).
            const readerPage = await (await asUser(`${contextPath}rd`)).newPage();
            const landing = new ArticleLandingPage(readerPage, contextPath);
            await landing.goto(submissionId);
            await expect(readerPage).toHaveURL(landing.urlPattern(submissionId));
            await expect(landing.title()).toHaveText('Tidal Patterns');
            await landing.openGalley('PDF');
            await expect(readerPage).toHaveURL(landing.urlPattern(submissionId, {galley: 'pdf'}));
            const reader = new GalleyReaderPage(readerPage);
            await reader.expectLoaded();
            await expect(reader.titleLink()).toHaveText('Tidal Patterns');
            await expect.poll(() => reader.pdfPageCount(), {timeout: 30_000}).toBeGreaterThan(0);
        }
    });

    test('S6: "How to Cite": another format, a download and the settings window', async ({page, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const spare = `${tag}x`;
        const {manager, author} = await seedJournal(ojsApi, tag, {
            context: {name: 'Coastal Review'},
            plugins: {citationstylelanguageplugin: {enabled: true}},
            issues: [{...ISSUE_2026, published: true}],
            extra: [user(spare, 'Xena', 'Spare', ['author'])],
        });
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: 'Tidal Patterns in Coastal Waters',
                published: true,
                issue: ISSUE_2026,
            }),
            ojsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare}),
        ]);
        const landing = new ArticleLandingPage(page, tag);
        const articlePath = `/index.php/${tag}/article/view/${submissionId}`;

        // The citation: "How to Cite" at the foot of the side column, over
        // an APA citation naming the title, the journal and the address
        // (Fields, "How to Cite"; Rule 15).
        await landing.goto(submissionId);
        const outline = await landing.sideOutline();
        expect(outline[outline.length - 1]).toBe(TEXT.howToCite);
        await expect(landing.citationHeading()).toHaveText(TEXT.howToCite);
        const apa = flat(await landing.citation().innerText());
        expect(apa).toContain('Tidal Patterns in Coastal Waters');
        expect(apa).toContain('Coastal Review');
        expect(apa).toContain(articlePath);

        // "More Citation Formats": the eleven formats and the two
        // downloads under "Download Citation"; pressed again, the list
        // closes (Rule 15a).
        await landing.expectFormatsButton();
        await expect(landing.formatsButton()).toHaveAttribute('aria-expanded', 'false');
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(ALL_FORMATS);
        await expect(landing.downloadCitationLabel()).toHaveText(TEXT.downloadCitation);
        await expect(landing.downloadFormatLinks()).toHaveText(ALL_DOWNLOADS);
        await landing.closeFormats();

        // Another format: "IEEE" replaces the citation in place, the list
        // closes, the address stays; a reload shows APA again (Rule 15a).
        const address = page.url();
        await landing.openFormats();
        const ieee = await landing.chooseFormat('IEEE');
        expect(ieee).not.toBe(apa);
        await expect(landing.formatsButton()).toHaveAttribute('aria-expanded', 'false');
        await expect(landing.formatsList()).toBeHidden();
        expect(page.url()).toBe(address);
        await landing.reload();
        await expect.poll(async () => flat(await landing.citation().innerText())).toBe(apa);

        // A download: "BibTeX", then "Endnote/Zotero/Mendeley (RIS)", each
        // named after the title (Rule 15b; A8).
        await landing.openFormats();
        const bib = await landing.downloadCitation('BibTeX');
        expect(bib.name).toBe('Tidal+Patterns+in+Coastal+Waters.bib');
        await landing.openFormats();
        const ris = await landing.downloadCitation('Endnote/Zotero/Mendeley (RIS)');
        expect(ris.name).toBe('Tidal+Patterns+in+Coastal+Waters.ris');

        // No email to the journal's accounts from the visitor's steps,
        // bounded by a "Notify" the test sends to its spare (Side effects;
        // A8).
        const managerPage = await (await asUser(manager)).newPage();
        const dialogs = recordBrowserDialogs(managerPage);
        const notify = new PublishScreen(managerPage, tag);
        await notify.gotoWorkflow(control.submissionId);
        await notify.openStage('Submission');
        await notify.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
        const afterControl = {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`};
        await pkpMail.expectNone({to: mailOf(manager), afterControl});
        await pkpMail.expectNone({to: mailOf(author), afterControl});

        // The settings window as a new journal has it: no primary format,
        // every additional format and both downloads ticked, no publisher
        // location (Fields, the settings window; Settings bullet 5).
        const settings = new CitationStyleSettings(managerPage, tag);
        await settings.openPlugins();
        await settings.openSettings();
        await expect(settings.primaryRadios()).toHaveCount(ALL_FORMATS.length);
        await expect(settings.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);
        await expect(settings.additionalBoxes()).toHaveCount(ALL_FORMATS.length);
        for (const name of ALL_FORMATS) {
            await expect(settings.additionalBox(name)).toBeChecked();
        }
        await expect(settings.downloadBoxes()).toHaveCount(ALL_DOWNLOADS.length);
        for (const name of ALL_DOWNLOADS) {
            await expect(settings.downloadBox(name)).toBeChecked();
        }
        await expect(settings.publisherLocationBox()).toHaveValue('');

        // "Cancel": the window closes without a question; nothing stored
        // (Fields, "OK / Cancel").
        await settings.primaryRadio('IEEE').check();
        const asked = dialogs.messages.length;
        await settings.cancelControl().click();
        await settings.expectClosed();
        expect(dialogs.messages.slice(asked)).toEqual([]);
        await settings.openSettings();
        await expect(settings.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);

        // "Close" after a change asks, and "OK" to it stores nothing
        // (Fields, "OK / Cancel").
        await settings.primaryRadio('IEEE').check();
        await settings.closeButton().click();
        await settings.expectClosed();
        expect(dialogs.messages.slice(asked)).toEqual([TEXT.formChanged]);
        await settings.openSettings();
        await expect(settings.form().locator('input[name="primaryCitationStyle"]:checked')).toHaveCount(0);

        // "OK": IEEE primary, "MLA" the only additional format, "BibTeX"
        // the only download, "London, U.K."; the window closes and the
        // notice shows (Fields, "OK / Cancel"; Side effects).
        await settings.primaryRadio('IEEE').check();
        for (const name of ALL_FORMATS.filter((n) => n !== 'MLA')) {
            await settings.additionalBox(name).uncheck();
        }
        await settings.downloadBox('Endnote/Zotero/Mendeley (RIS)').uncheck();
        await settings.publisherLocationBox().fill('London, U.K.');
        const saved = await settings.noticeDuring(TEXT.saved, () => settings.save());
        expect(saved.ok()).toBe(true);

        // The visitor's page after "OK": the IEEE citation first, "MLA"
        // alone, "BibTeX" alone; no on-screen format prints the place, the
        // BibTeX file does (Rule 16). The primary IEEE citation carries a
        // number "[1]" the chosen one lacked, so it is read as containing
        // the noted text (T-ojs-3, `.reports/U13/test-ojs-findings.md`).
        await landing.reload();
        await expect.poll(async () => flat(await landing.citation().innerText())).toContain(ieee);
        expect(ieee).not.toContain('London, U.K.');
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(['MLA']);
        await expect(landing.downloadFormatLinks()).toHaveText(['BibTeX']);
        const mla = await landing.chooseFormat('MLA');
        expect(mla).not.toContain('London, U.K.');
        await landing.openFormats();
        const bibAfter = await landing.downloadCitation('BibTeX');
        expect(bibAfter.text).toContain('London, U.K.');

        // Switching the plugin off: the question, the notice, no
        // "Settings" on the row; the visitor's page has no "How to Cite"
        // (Settings bullet 4; Fields, the settings window).
        await expect(settings.arrow()).toHaveCount(1);
        const question = await settings.noticeDuring(TEXT.pluginDisabled('Citation Style Language'), () => settings.setEnabled(false));
        expect(question).toContain(TEXT.disableQuestion);
        await expect(settings.arrow()).toHaveCount(0);
        await expect(settings.settingsLink()).toHaveCount(0);
        await landing.reload();
        await expect(landing.citationBlock()).toHaveCount(0);

        // Switching it on again: the notice; the IEEE citation is back
        // (Settings bullet 4).
        await settings.noticeDuring(TEXT.pluginEnabled('Citation Style Language'), () => settings.setEnabled(true));
        await landing.reload();
        await expect(landing.citationBlock()).toHaveCount(1);
        await expect.poll(async () => flat(await landing.citation().innerText())).toContain(ieee);

        // Control: "MLA" is still the only other format (Settings bullet 4).
        await landing.openFormats();
        await expect(landing.formatLinks()).toHaveText(['MLA']);
    });

    test('S7: the PDF viewer switched off, and the downloads chart', async ({page, ojsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s7', testInfo);
        const {author} = await seedJournal(ojsApi, tag, {
            plugins: {pdfjsviewerplugin: {enabled: false}},
            themeOptions: {displayStats: 'bar'},
        });
        const [{submissionId}, seeded] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: 'Tidal Patterns',
                galleys: [{label: 'PDF', file: 'article.pdf'}],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: 'Tidal Patterns in Coastal Waters',
                published: true,
                issue: {volume: 1, number: 2, year: 2014},
            }),
        ]);
        const landing = new ArticleLandingPage(page, tag);

        // "PDF" with the viewer off downloads "article.pdf" and the browser
        // stays on the page (Settings bullet 1; Rule 11).
        await landing.goto(submissionId);
        const pdf = await landing.downloadGalley('PDF');
        expect(pdf.name).toBe('article.pdf');
        expect(pdf.stayed).toBe(true);
        await expect(page).toHaveURL(landing.urlPattern(submissionId));

        // The "Downloads" section: a bar chart with nothing counted
        // (Rule 17; Side effects).
        await expect(landing.downloadsChart()).toHaveCount(1);
        await expect(landing.mainSection(TEXT.downloadsHeading)).toBeVisible();
        await expect(landing.downloadsChart().locator('canvas')).toBeVisible();
        await expect.poll(() => landing.chartReading(), {timeout: 30_000}).not.toBeNull();
        const chart = await landing.chartReading();
        expect(chart.type).toBe('bar');
        expect(chart.values.every((v) => v === 0)).toBe(true);

        // Control: the seeded journal, at the install default, shows no
        // "Downloads" section on an article's page, read the same way
        // (Settings bullet 6).
        const seededLanding = new ArticleLandingPage(page, JOURNAL, {locale: 'en'});
        await seededLanding.goto(seeded.submissionId);
        await expect(seededLanding.mainSection('Abstract')).toBeVisible();
        await expect(seededLanding.downloadsChart()).toHaveCount(0);
        await expect(seededLanding.mainSection(TEXT.downloadsHeading)).toHaveCount(0);
    });

    test('S8: the page in French', async ({page, ojsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s8', testInfo);
        const {author} = await seedJournal(ojsApi, tag, {
            context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: {en: 'Tidal Patterns', fr_CA: 'Motifs des marées'},
            abstract: {en: '<p>How tides move.</p>', fr_CA: '<p>Comment bougent les marées.</p>'},
            keywords: {en: ['tide'], fr_CA: ['marée']},
            galleys: [
                {label: 'PDF', locale: 'en', file: 'article.pdf'},
                {label: 'HTML', locale: 'fr_CA', file: 'article.html'},
            ],
            published: true,
        });
        const landing = new ArticleLandingPage(page, tag);

        // The English page (Rules 10a, 21).
        const readEnglish = async () => {
            await landing.goto(submissionId, {locale: 'en'});
            await expect(page).toHaveURL(landing.urlPattern(submissionId, {locale: 'en'}));
            await expect(landing.title()).toHaveText('Tidal Patterns');
            await expect(landing.keywords()).toHaveText('Keywords: tide');
            await expect(landing.mainSection('Abstract')).toContainText('How tides move.');
            await expect(landing.galleyLinks()).toHaveCount(2);
            expect([...(await landing.galleyLinks().allInnerTexts())].map(flat).sort()).toEqual(['HTML (French (Canada))', 'PDF']);
        };
        await readEnglish();

        // The French page: the French title, abstract and keywords, the
        // galley languages the other way round (Rules 10a, 21).
        await landing.goto(submissionId, {locale: 'fr_CA'});
        await expect(landing.title()).toHaveText('Motifs des marées');
        await expect(landing.mainSection('Résumé')).toContainText('Comment bougent les marées.');
        await expect(landing.keywords()).toHaveText('Mots-clés : marée');
        expect([...(await landing.galleyLinks().allInnerTexts())].map(flat).sort()).toEqual(['HTML', 'PDF (anglais)']);

        // The French PDF reader's tab (Fields, the PDF reader page).
        await landing.openGalley('PDF (anglais)');
        const reader = new GalleyReaderPage(page);
        await reader.expectLoaded();
        await expect(page).toHaveTitle('Vue de Motifs des marées');

        // Control: the English address again reads English (Rule 21).
        await readEnglish();
    });
});
