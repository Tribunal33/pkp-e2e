// @ts-check
/**
 * @file playwright/tests/U69-monograph-landing-page.spec.js
 *
 * U69 — Monograph landing page, OMP suite: one test per canonical scenario
 * a press runs, S1–S9 ({OMP}), plus S10's press side: the positive control
 * of the {OJS OPS} absence (the journal's and the preprint server's
 * "404 Not Found" run in their own suites, since CI installs one app per
 * job). In the press's own words: the book's page, a chapter's page, the
 * PDF and HTML view pages, the "Manual Fee Payment" page, "How to Cite".
 * Spec: docs/specs/U69-monograph-landing-page.md
 *
 * Deliberately NOT covered, by register ID (a 🐞 is never asserted as the
 * contract, a ❓ is parked, not a gap; the spec's Coverage section is the
 * record of everything else left out):
 * - A9 🐞: S3 and S9 open the PDF view page and read its bar and frame,
 *   never what the viewer shows nor what either "Download" does; no link
 *   that downloads is followed. The view page's "PDFJS is not defined"
 *   script error is A9's, not asserted.
 * - A10 🐞: S3 reads the HTML view page's return arrow by its place and
 *   where it leads, never by its name.
 * - A7 🐞: S4 reads the priced link's words after the price only.
 * - A18 🐞: S4's signed-out control stops on the Login page.
 * - A5 🐞: S6 never reads an older version's browser tab.
 * - A6 🐞: S2 reads the author line of a chapter whose authors differ from
 *   the book's; no chapter shares the book's authors.
 * - A14 ❓, A22 ❓: S8's book is in no series and has one version.
 * - A1–A4, A8, A11–A13, A15–A17, A19–A21: no scenario reaches those states.
 *
 * Seeding: scenario endpoints only, as footnote s says: every press is a
 * scratch press (`createContext`) with throwaway accounts (the username
 * twice as password): a Press manager where a scenario drives the
 * workflow or needs the principal contact's mailbox, an Author (the
 * books' submitter, "Ada Quill"), and a Reader, an External Reviewer and a
 * second Author where a scenario names them. Every book is a scratch
 * submission sent to Production (`skipExternalReview`,
 * `sendToProduction`) and, unless the scenario says otherwise, published
 * on 2024-03-05; its formats come from `publicationFormats[]` (approved,
 * available, the file on "Open Access" unless `price` is given), its
 * chapters from `chapters[]`. S6 and S7 make their second version on
 * screen as the Press manager ("Create New Version", then "Title &
 * Abstract" or the version's Chapters page, then "Publish"), since no
 * scenario key builds a later version. The visitor is the fixture `page`,
 * which has no user (no default user is set; every signed-in actor opens
 * through `asUser`, patterns.md "Fixture selection"). The remote format's
 * address is answered in the browser by a route, so no test reaches
 * example.org.
 *
 * Mail: the "Manual Payment Notification" is sent at once by the payment
 * plugin (`Mail::send`, no queued job), so S4 reads it in the parallel
 * project; its "no email yet" is bounded by that email itself (exactly
 * one to the principal contact's own address, counted from the seed).
 * S3's "no email" is read on the press's principal contact (the Press
 * manager's address) and the book's Author, bounded by a password reset
 * each requested after the files were opened (a mail sent at once, as
 * U07 reads it) and counted from the seed.
 *
 * Every absence is a settled read of a server-rendered page after its
 * navigation, paired with a positive control read the same way (M4, M6):
 * a part left out beside the page's other parts (the outlines), a notice
 * left out beside the title, a chart left out beside the book page's
 * chart, the press's chrome left out beside the book page's.
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {expectNotFoundPage, todayCandidates, longDate} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {trailText} = require('../pages/CatalogPages.js');
const {createNewVersion, retitleVersion, publishShownVersion} = require('../pages/PublicationPages.js');
const {ChaptersPage} = require('../pages/ChapterPages.js');
const {
    TEXT,
    DEFAULT_COVER,
    bookUrl,
    fileUrl,
    endsWith,
    flat,
    escapeRe,
    MonographLandingPage,
    ViewableFilePage,
    ManualPaymentPage,
} = require('../pages/MonographLandingPages.js');

const PRODUCTION = {submitted: true, decisions: ['skipExternalReview', 'sendToProduction']};
const PUBLISHED = {...PRODUCTION, published: true, datePublished: '2024-03-05'};
const FIRST_VERSION = '2024-03-05 (Version of Record 1.0)';
const LEE_EMAIL = 'lee.marsh@mail.test';
const LEE = {givenName: 'Lee', familyName: 'Marsh', email: LEE_EMAIL};
const REMOTE = 'https://example.org/shorelines';

/** Unique per-run tag: one alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u69${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function account(tag, key, givenName, familyName, roles) {
    const username = `${tag}${key}`;
    return {username, givenName, familyName, email: `${username}@mail.test`, roles, password: `${username}${username}`};
}

/**
 * A scratch press named "Tidewater {tag}", with a throwaway Author "Ada
 * Quill" (the books' submitter) and the `extra` accounts; `keys` are more
 * context keys (`context` merged into the name).
 */
async function seedPress(ompApi, tag, {extra = [], context = {}, ...keys} = {}) {
    const name = `Tidewater ${tag}`;
    const au = account(tag, 'au', 'Ada', 'Quill', ['author']);
    const users = [au, ...extra];
    await ompApi.createContext({
        tag,
        context: {name, ...context},
        users: users.map(({password, ...u}) => u),
        ...keys,
    });
    return {path: tag, name, au, users};
}

/** A book of the press by its Author, published on 2024-03-05 unless `keys` say otherwise. */
async function seedBook(ompApi, press, n, keys = {}) {
    return ompApi.createSubmission({tag: `${press.path}b${n}`, context: press.path, submitter: press.au.username, ...PUBLISHED, ...keys});
}

/** A signed-in actor's page. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Today in the short date format ("2026-09-28"), as a RegExp alternation (the server's zone decides). */
function todayShort() {
    return `(${todayCandidates().join('|')})`;
}

/** Today in the long date format ("September 28, 2026"), as a RegExp alternation. */
function todayLong() {
    return `(${todayCandidates().map(longDate).map(escapeRe).join('|')})`;
}

/**
 * A list the app does not order, read as a set (patterns.md, parallel
 * lesson 14): the count first, then the sorted words, polled.
 */
async function expectSet(locator, texts) {
    await expect(locator).toHaveCount(texts.length, {timeout: 30_000});
    await expect
        .poll(async () => (await locator.allTextContents()).map(flat).sort(), {timeout: 30_000})
        .toEqual([...texts].sort());
}

/**
 * What a screen reader reads for a link: `text` whole, after the icon
 * glyph the theme's CSS puts before it (a private-use character in the
 * computed name, as ArticleLandingPages notes for "More Citation Formats").
 */
function spoken(text) {
    return new RegExp(`^[^A-Za-z0-9]*${escapeRe(text)}[^A-Za-z0-9]*$`);
}

/** A link's own words, the screen-reader text left out. */
async function visibleWords(link) {
    return link.evaluate((a) =>
        Array.from(a.childNodes)
            .filter((n) => !(n.nodeType === 1 && /** @type {Element} */ (n).classList.contains('pkp_screen_reader')))
            .map((n) => n.textContent || '')
            .join('')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

/** The Login page: its address and heading. */
async function expectLoginPage(page) {
    await expect(page).toHaveURL(/\/login(\?|$)/, {timeout: 30_000});
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Login');
}

/**
 * The Login page's "Forgot your password?" as a visitor, for `email`: the
 * reset email is sent at once, the mailbox reads' positive control.
 */
async function requestPasswordReset(page, contextPath, email) {
    await page.goto(`/index.php/${contextPath}/login`);
    await page.getByRole('link', {name: 'Forgot your password?'}).click();
    await page.locator('form#lostPasswordForm input#email').fill(email);
    await page.locator('form#lostPasswordForm').getByRole('button', {name: 'Reset Password'}).click();
}

test.describe('Monograph landing page (U69)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test("S1: A published book's page", async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const press = await seedPress(ompApi, tag, {
            series: [{path: 'monographs', title: 'Monographs'}],
            categories: [{path: 'history', title: 'History'}],
        });
        const shorelines = await seedBook(ompApi, press, 1, {
            title: 'Shorelines',
            subtitle: 'Essays on the Coast',
            abstract: 'Essays on the shore.',
            keywords: ['alpha', 'beta gamma'],
            plainLanguageSummary: 'A book about the coast.',
            series: 'monographs',
            categories: ['history'],
            urlPath: 'shorelines',
            contributors: [LEE],
            publicationFormats: [
                {name: 'PDF', file: 'article.pdf'},
                {name: 'Online', urlRemote: REMOTE},
                {
                    name: 'Paperback',
                    physical: true,
                    identificationCodes: [{type: 'ISBN-13 (15)', value: '978-951-98548-9-2'}],
                    publicationDates: [{role: 'Publication date (01)', date: '20240305'}],
                    metadata: {productComposition: 'Single-component retail product (00)', width: 130, height: 200},
                },
            ],
        });
        const bare = await seedBook(ompApi, press, 2, {title: 'Bare', abstract: 'A bare book.'});
        const pdf = shorelines.publicationFormats.find((f) => f.name === 'PDF');
        const book = new MonographLandingPage(page, tag);

        // The address: the book's URL Path opens its page under the press's
        // header, no trail, the tab "{title}: {subtitle} | {press}" (Rule 2).
        await book.goto('shorelines');
        await expect(page).toHaveURL(endsWith(bookUrl(tag, 'shorelines')));
        await expect(book.pressHeader()).toBeVisible();
        await expect(book.trail()).toHaveCount(0);
        await expect(page).toHaveTitle(`Shorelines: Essays on the Coast | ${press.name}`);

        // The main column, top to bottom, no notice, no "Downloads" chart
        // (Fields, the book's page; Rule 7; Settings bullet 5).
        await expect(book.title()).toHaveText('Shorelines: Essays on the Coast');
        await expect(book.notices()).toHaveCount(0);
        await book.expectMainOutline(['authors', TEXT.keywords, TEXT.synopsis, TEXT.plainLanguageSummary, TEXT.references]);
        await expect(book.contributorNames()).toHaveText(['Ada Quill', 'Lee Marsh']);
        await expect(book.keywordsLabel()).toHaveText(TEXT.keywords);
        await expect(book.keywordsValue()).toHaveText(/^\s*(alpha,\s+beta gamma|beta gamma,\s+alpha)\s*$/);
        await expect(book.partValue(TEXT.synopsis)).toHaveText('Essays on the shore.');
        await expect(book.partValue(TEXT.plainLanguageSummary)).toHaveText('A book about the coast.');
        await expect(book.part(TEXT.references)).toHaveText(TEXT.references);
        await expect(book.downloadsChart()).toHaveCount(0);

        // The side column, top to bottom; no "How to Cite", the plugin off
        // on a new press (Rules 8, 9, 11; Settings bullet 3).
        await book.expectSideOutline(['cover', 'files', 'date_published', 'series', 'categories', 'copyright', 'publication_format']);
        await expect(book.cover()).toHaveAttribute('src', DEFAULT_COVER);
        await expect(book.coverLink()).toHaveCount(0);
        await expectSet(book.sideFileLinks(), ['PDF', 'Online']);
        await expect(book.publishedLabel()).toHaveText(TEXT.published);
        await expect(book.publishedValue()).toHaveText('March 5, 2024');
        await expect(book.versionsHeading()).toHaveText(TEXT.versions);
        await expect(book.versionEntries()).toHaveText([FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveCount(0);
        await expect(book.seriesLabel()).toHaveText(TEXT.series);
        await expect(book.seriesLink()).toHaveText('Monographs');
        await expect(book.seriesLink()).toHaveAttribute('href', endsWith(`/index.php/${tag}/catalog/series/monographs`));
        await expect(book.categoriesLabel()).toHaveText(TEXT.categories);
        await expect(book.categoryLinks()).toHaveText(['History']);
        await expect(book.categoryLinks()).toHaveAttribute('href', endsWith(`/index.php/${tag}/catalog/category/history`));
        await expect(book.copyrightLine()).toHaveText(/^\s*Copyright \(c\) \d{4} /);
        await expect(book.citationBlock()).toHaveCount(0);

        // "Paperback"'s details, headed by its name; "PDF" and "Online"
        // have none (Rule 12).
        await expect(book.formatBlocks()).toHaveCount(1);
        const paperback = book.formatBlock('Paperback');
        await expect(book.formatBlockHeading(paperback)).toHaveText('Paperback');
        const rows = await book.formatRows(paperback);
        expect(rows.map((r) => r.label)).toEqual(['ISBN-13 (15)', 'Publication date (01)', TEXT.physicalDimensions]);
        expect(rows[0]).toEqual({label: 'ISBN-13 (15)', value: '978-951-98548-9-2', note: ''});
        expect(rows[1]).toEqual({label: 'Publication date (01)', value: '2024-03-05', note: TEXT.hijri});
        expect(rows[2].value).toMatch(/^130 ?[a-z]+ x 200 ?[a-z]+$/);

        // "PDF"'s address (Rules 2, 11c).
        await expect(book.sideFileLink('PDF')).toHaveAttribute('href', endsWith(fileUrl(tag, 'shorelines', pdf.id, pdf.submissionFileId)));

        // "Online" opens its remote address in a new tab (Rule 11).
        await page.context().route('https://example.org/**', (route) =>
            route.fulfill({status: 200, contentType: 'text/html', body: '<title>Remote copy</title>'})
        );
        const popupArrives = page.waitForEvent('popup');
        await book.sideFileLink('Online').click();
        const popup = await popupArrives;
        await expect(popup).toHaveURL(REMOTE);
        await popup.close();
        await expect(page).toHaveURL(endsWith(bookUrl(tag, 'shorelines')));

        // The number address: the same page, the address as typed (Rule 2).
        await book.goto(shorelines.submissionId);
        await expect(page).toHaveURL(endsWith(bookUrl(tag, shorelines.submissionId)));
        await expect(book.title()).toHaveText('Shorelines: Essays on the Coast');

        // Control: "Bare" shows only its title, Ada Quill, "Synopsis", the
        // empty "References", the default picture, the date line, "Versions"
        // and the copyright line, and no other heading (Rule 7).
        await book.goto(bare.submissionId);
        await expect(book.title()).toHaveText('Bare');
        await expect(book.notices()).toHaveCount(0);
        await book.expectMainOutline(['authors', TEXT.synopsis, TEXT.references]);
        await expect(book.contributorNames()).toHaveText(['Ada Quill']);
        await expect(book.partValue(TEXT.synopsis)).toHaveText('A bare book.');
        await expect(book.part(TEXT.references)).toHaveText(TEXT.references);
        await book.expectSideOutline(['cover', 'date_published', 'copyright']);
        await expect(book.cover()).toHaveAttribute('src', DEFAULT_COVER);
        await expect(book.copyrightLine()).toHaveText(new RegExp(`^\\s*Copyright \\(c\\) \\d{4} ${escapeRe(press.name)}\\s*$`));
        await expect.poll(() => book.visiblePartHeadings(), {timeout: 30_000}).toEqual([TEXT.synopsis, TEXT.references, TEXT.published, TEXT.versions]);
    });

    test("S2: The table of contents, a chapter's page and the \"Downloads\" chart", async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const press = await seedPress(ompApi, tag, {
            enabledDoiTypes: ['publication', 'chapter'],
            doiPrefix: '10.1234',
            themeOptions: {displayStats: 'bar'},
        });
        const coastlines = await seedBook(ompApi, press, 1, {
            title: 'Coastlines',
            contributors: [LEE],
            publicationFormats: [
                {name: 'PDF', file: 'article.pdf'},
                {name: 'Chapter PDF', file: 'replacement.pdf'},
            ],
            chapters: [
                {
                    title: 'Tides',
                    subtitle: 'Low and high',
                    abstract: 'How the sea rises and falls.',
                    pages: '1-20',
                    page: true,
                    authors: [LEE_EMAIL],
                    files: ['publicationFormats.1'],
                },
                {title: 'Harbours'},
            ],
        });
        const reefNotes = await seedBook(ompApi, press, 2, {
            title: 'Reef Notes',
            contributors: [LEE],
            enableChapterPublicationDates: true,
            chapters: [
                {title: 'Reef', datePublished: '2024-06-01', page: true},
                {title: 'Lagoon', page: true},
            ],
        });
        const [tides, harbours] = coastlines.chapters;
        const book = new MonographLandingPage(page, tag);
        const coastlinesUrl = bookUrl(tag, coastlines.submissionId);

        // The table of contents: the chapters in the order they were added;
        // "Tides" a link with its subtitle, its author, its DOI and its
        // file; "Harbours" plain text (Rule 10).
        await book.goto(coastlines.submissionId);
        await expect(book.title()).toHaveText('Coastlines');
        await expect(book.tocEntries()).toHaveCount(2);
        await expect(book.tocTitles()).toHaveText([/^\s*Tides\s+Low and high\s*$/, /^\s*Harbours\s*$/]);
        await expect(book.tocTitleLink('Tides')).toHaveAttribute('href', endsWith(bookUrl(tag, coastlines.submissionId, {chapter: tides.id})));
        await expect(book.tocSubtitle('Tides')).toHaveText('Low and high');
        await expect(book.tocAuthors('Tides')).toHaveText('Lee Marsh');
        await expect(book.tocDoi('Tides')).toHaveText(/^\s*DOI:\s+https:\/\/doi\.org\/10\.1234\/\S+\s*$/);
        await expect(book.tocDoi('Tides').locator('a')).toHaveAttribute('href', /^https:\/\/doi\.org\/10\.1234\/\S+$/);
        await expect(book.tocFileLinks('Tides')).toHaveText(['Chapter PDF']);
        await expect(book.tocTitleLink('Harbours')).toHaveCount(0);
        await expect(book.tocEntry('Harbours').locator('a')).toHaveCount(0);
        await expect(book.tocEntry('Harbours')).toHaveText(/^\s*Harbours\s*$/);

        // The side column's files: "PDF" and no "Chapter PDF" (Rule 11).
        await expect(book.sideFileLinks()).toHaveText(['PDF']);

        // "Downloads": a bar chart over the last twelve months (Rules 20, 20a).
        await expect(book.part(TEXT.downloads)).toHaveCount(1);
        await expect(book.downloadsChart().locator('h2.label')).toHaveText(TEXT.downloads);
        await expect.poll(() => book.chartShape(), {timeout: 30_000}).not.toBeNull();
        expect(await book.chartShape()).toEqual({type: 'bar', months: 12});

        // "Tides"' page (Fields, the chapter page; Rules 15, 16, 17, 20;
        // Settings bullet 11).
        await book.openChapter('Tides');
        await expect(page).toHaveURL(endsWith(bookUrl(tag, coastlines.submissionId, {chapter: tides.id})));
        await expect(page).toHaveTitle(`Tides: Low and high | ${press.name}`);
        await expect(book.notices()).toHaveCount(0);
        await expect(book.title()).toHaveText('Tides: Low and high');
        await book.expectMainOutline(['authors', TEXT.doi, TEXT.synopsis]);
        await expect(book.contributorNames()).toHaveText(['Lee Marsh']);
        await expect(book.doiLabel()).toHaveText(TEXT.doi);
        await expect(book.doiLink()).toHaveText(/^\s*https:\/\/doi\.org\/10\.1234\/\S+\s*$/);
        await expect(book.partValue(TEXT.synopsis)).toHaveText('How the sea rises and falls.');
        await expect(book.cover()).toHaveAttribute('src', DEFAULT_COVER);
        await expect(book.coverLink()).toHaveAttribute('href', endsWith(coastlinesUrl));
        await expect(book.sideFileLinks()).toHaveText(['Chapter PDF']);
        await expect(book.volumeLabel()).toHaveText(TEXT.volume);
        await expect(book.volumeLink()).toHaveText('Coastlines');
        await expect(book.pagesValue()).toHaveText('1-20');
        await expect(book.publishedLabel()).toHaveText(TEXT.published);
        await expect(book.publishedValue()).toHaveText('March 5, 2024');
        await expect(book.versionsPart()).toHaveCount(0);
        await expect(book.downloadsChart()).toHaveCount(0);

        // "Volume": the book's page (Rule 18).
        await book.pressVolume();
        await expect(page).toHaveURL(endsWith(coastlinesUrl));
        await expect(book.title()).toHaveText('Coastlines');

        // Chapters with their own dates: "Reef" its own, "Lagoon" the
        // version's (Rule 16; Settings bullet 11).
        await book.goto(reefNotes.submissionId);
        await book.openChapter('Reef');
        await expect(book.title()).toHaveText('Reef');
        await expect(book.publishedValue()).toHaveText('June 1, 2024');
        await page.goBack();
        await expect(page).toHaveURL(endsWith(bookUrl(tag, reefNotes.submissionId)));
        await book.openChapter('Lagoon');
        await expect(book.title()).toHaveText('Lagoon');
        await expect(book.publishedValue()).toHaveText('March 5, 2024');

        // Control: "Harbours" has no page (Rule 15).
        await expectNotFoundPage(page, bookUrl(tag, coastlines.submissionId, {chapter: harbours.id}));
    });

    test('S3: Opening a free PDF and a free HTML file', async ({page, ompApi, pkpMail}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const mg = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const press = await seedPress(ompApi, tag, {extra: [mg], context: {contactName: 'Mona Manager', contactEmail: mg.email}});
        const shorelines = await seedBook(ompApi, press, 1, {
            title: 'Shorelines',
            publicationFormats: [
                {name: 'PDF', file: 'article.pdf'},
                {name: 'HTML', file: 'article.html'},
            ],
        });
        const pdf = shorelines.publicationFormats.find((f) => f.name === 'PDF');
        const html = shorelines.publicationFormats.find((f) => f.name === 'HTML');
        const mailBefore = {mg: await pkpMail.count({to: mg.email}), au: await pkpMail.count({to: press.au.email})};
        const book = new MonographLandingPage(page, tag);
        const viewer = new ViewableFilePage(page);
        const shorelinesUrl = bookUrl(tag, shorelines.submissionId);

        // The book's page carries the press's header and footer (the
        // chrome absences below are read against it).
        await book.goto(shorelines.submissionId);
        await expect(book.pressHeader()).toBeVisible();
        await expect(book.pressFooter()).toBeVisible();

        // "PDF": the PDF view page, without the press's chrome; its bar,
        // left to right: the arrow with no visible text, the file name as
        // plain text, "Download" (Rule 13; Fields, the PDF view page). What
        // the viewer shows and what "Download" does is A9, not read.
        await book.fileLink(pdf.id, pdf.submissionFileId).click();
        await expect(page).toHaveURL(endsWith(fileUrl(tag, shorelines.submissionId, pdf.id, pdf.submissionFileId)));
        await viewer.expectLoaded();
        await expect(page).toHaveTitle(TEXT.viewTitle('PDF', 'article.pdf'));
        await expect(viewer.pressChrome()).toHaveCount(0);
        await viewer.expectBarParts(['return', 'title', 'download']);
        await expect(viewer.returnArrow()).toHaveAccessibleName(spoken(TEXT.returnTo('Shorelines')));
        expect(await visibleWords(viewer.returnArrow())).toBe('');
        await expect(viewer.fileName()).toHaveText('article.pdf');
        await expect(viewer.fileName().locator('a')).toHaveCount(0);
        await expect(viewer.downloadLink()).toHaveAccessibleName(spoken(TEXT.downloadName));
        await expect(viewer.pdfFrameElement()).toBeVisible();

        // The return arrow: the book's page (Fields, the PDF view page).
        await viewer.returnArrow().click();
        await expect(page).toHaveURL(endsWith(shorelinesUrl));
        await expect(book.title()).toHaveText('Shorelines');

        // "HTML": the HTML view page, without the press's chrome; its bar
        // holds the return arrow and "Shorelines" as a link, no "Download";
        // the file's text under it (Rule 13; Fields, the HTML view page).
        // The arrow's name is A10, not read.
        await book.fileLink(html.id, html.submissionFileId).click();
        await expect(page).toHaveURL(endsWith(fileUrl(tag, shorelines.submissionId, html.id, html.submissionFileId)));
        await viewer.expectLoaded();
        await expect(page).toHaveTitle(TEXT.viewTitle('HTML', 'article.html'));
        await expect(viewer.pressChrome()).toHaveCount(0);
        await viewer.expectBarParts(['return', 'title']);
        await expect(viewer.downloadLink()).toHaveCount(0);
        await expect(viewer.titleLink()).toHaveText('Shorelines');
        await expect(viewer.htmlBody()).toContainText('A small HTML file');

        // The title: the book's page (Fields, the HTML view page).
        await viewer.titleLink().click();
        await expect(page).toHaveURL(new RegExp(`${escapeRe(shorelinesUrl)}(/|$)`));
        await expect(book.title()).toHaveText('Shorelines');

        // Control: no email to the principal contact or the Author after
        // the two files were opened, bounded by a password reset each
        // (Side effects, "No other email, no notice").
        await requestPasswordReset(page, tag, mg.email);
        await requestPasswordReset(page, tag, press.au.email);
        await pkpMail.find({to: mg.email, subject: 'Password Reset Confirmation'});
        await pkpMail.find({to: press.au.email, subject: 'Password Reset Confirmation'});
        expect(await pkpMail.count({to: mg.email}), 'the principal contact got the reset alone').toBe(mailBefore.mg + 1);
        expect(await pkpMail.count({to: press.au.email}), 'the Author got the reset alone').toBe(mailBefore.au + 1);
    });

    test('S4: A file for sale bought with "Manual Fee Payment"', async ({page, asUser, ompApi, pkpMail}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const rd = account(tag, 'rd', 'Rhea', 'Reader', ['reader']);
        const contactEmail = `${tag}pc@mail.test`;
        const press = await seedPress(ompApi, tag, {
            extra: [rd],
            context: {contactName: 'Pat Contact', contactEmail},
            payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by bank transfer.'},
        });
        const shorelines = await seedBook(ompApi, press, 1, {
            title: 'Shorelines',
            publicationFormats: [{name: 'PDF', file: 'article.pdf', price: '25'}],
        });
        const pdf = shorelines.publicationFormats[0];
        const mailBefore = await pkpMail.count({to: contactEmail});
        const pdfUrl = fileUrl(tag, shorelines.submissionId, pdf.id, pdf.submissionFileId);

        // The link, signed out: "Purchase PDF (25 USD)" after the price
        // (Rule 11a; the bare price before it is A7, not read).
        const visitorBook = new MonographLandingPage(page, tag);
        await visitorBook.goto(shorelines.submissionId);
        await expect(visitorBook.fileLink(pdf.id, pdf.submissionFileId)).toHaveText(/Purchase PDF \(25 USD\)\s*$/);

        // The payment page, as the Reader: the press's header and footer,
        // the trail, "Title" and "Fee" (Rule 14; Fields, the payment page).
        const rp = await pageAs(asUser, rd.username);
        const book = new MonographLandingPage(rp, tag);
        const pay = new ManualPaymentPage(rp);
        await book.goto(shorelines.submissionId);
        await book.fileLink(pdf.id, pdf.submissionFileId).click();
        await expect(rp).toHaveURL(endsWith(pdfUrl));
        await pay.expectLoaded();
        await expect(book.pressHeader()).toBeVisible();
        await expect(book.pressFooter()).toBeVisible();
        await expect(pay.trail()).toHaveText(trailText('Home', TEXT.manualPayment));
        await expect(pay.rowValue('Title')).toHaveText('article.pdf');
        await expect(pay.rowValue('Fee')).toHaveText('25.00 (USD)');
        // "No email yet" is bounded below: the principal contact's mailbox
        // holds exactly one email once the notification has been sent.

        // "Send notification of payment": "Payment Notification" (Rule 14).
        await pay.sendNotification();
        await expect(pay.messageText()).toHaveText(TEXT.notificationSent);
        await expect(pay.continueLink()).toBeVisible();

        // The principal contact's email (Actors row 5; Side effects).
        const mail = await pkpMail.find({to: contactEmail, subject: 'Manual Payment Notification'});
        expect(await pkpMail.count({to: contactEmail}), 'one email to the principal contact, none before it').toBe(mailBefore + 1);
        expect(mail.From.Name).toBe('Rhea Reader');
        expect(mail.From.Address).toBe(rd.email);
        const full = await pkpMail.fullMessage(mail.ID);
        expect(flat(full.Text)).toContain(
            `A manual payment needs to be processed for the press ${press.name} and the user Rhea Reader (username "${rd.username}"). ` +
                'The item being paid for is "article.pdf". The cost is 25 (USD). ' +
                'This email was generated by the Open Monograph Press Manual Payment plugin.'
        );

        // "Continue": the payment page again (Rule 14).
        await pay.continueLink().click();
        await pay.expectLoaded();
        await expect(pay.rowValue('Fee')).toHaveText('25.00 (USD)');

        // Control: signed out, the link leads to the Login page, not the
        // payment page (Actors row 4; Rule 14; where signing in lands is A18).
        await book.goto(shorelines.submissionId);
        const logout = rp.locator('#navigationUser a').filter({hasText: /^\s*Logout\s*$/});
        await expect(logout).toHaveCount(1);
        await rp.goto(/** @type {string} */ (await logout.getAttribute('href')));
        await book.goto(shorelines.submissionId);
        await expect(rp.locator('#navigationUser a').filter({hasText: /^\s*Logout\s*$/})).toHaveCount(0);
        await book.fileLink(pdf.id, pdf.submissionFileId).click();
        await expectLoginPage(rp);
        await expect(pay.root()).toHaveCount(0);
    });

    test('S5: An unpublished book: the preview, and "404 Not Found" for everyone else', async ({page, asUser, ompApi}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const mg = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const rd = account(tag, 'rd', 'Rhea', 'Reader', ['reader']);
        const rv = account(tag, 'rv', 'Remy', 'Reviewer', ['externalReviewer']);
        const a2 = account(tag, 'a2', 'Otto', 'Other', ['author']);
        const press = await seedPress(ompApi, tag, {extra: [mg, rd, rv, a2]});
        const draft = await ompApi.createSubmission({tag: `${tag}b1`, context: tag, submitter: press.au.username, title: 'Draft Tides', ...PRODUCTION});
        const unfinished = await ompApi.createSubmission({tag: `${tag}b2`, context: tag, submitter: press.au.username, title: 'Unfinished', submitted: false});
        const shorelines = await seedBook(ompApi, press, 3, {title: 'Shorelines'});
        const draftUrl = bookUrl(tag, draft.submissionId);
        const unfinishedUrl = bookUrl(tag, unfinished.submissionId);

        // The Press manager's preview: the workflow header's "Preview"
        // opens the page under the preview notice, with no date line and
        // no "Versions" (Actors row 2; Rule 5).
        const mp = await pageAs(asUser, mg.username);
        const workflow = new WorkflowPage(mp, tag);
        const managerBook = new MonographLandingPage(mp, tag);
        await workflow.gotoEditorial(draft.submissionId);
        await workflow.headerButton('Preview').click();
        await expect(mp).toHaveURL(endsWith(draftUrl));
        await managerBook.expectLoaded();
        await expect(managerBook.title()).toHaveText('Draft Tides');
        await expect(managerBook.notices()).toHaveText([TEXT.preview]);
        await expect(managerBook.cover()).toBeVisible();
        await expect(managerBook.publishedLine()).toHaveCount(0);
        await expect(managerBook.versionsPart()).toHaveCount(0);

        // "View submission": the book's workflow (Rule 5a).
        await managerBook.noticeLink('View submission').click();
        await expect(mp).toHaveURL(new RegExp(`workflowSubmissionId=${draft.submissionId}(&|$)`));
        await workflow.expectOpen(draft.submissionId);

        // The Author, typing the address: the same notice (Actors row 2).
        const ap = await pageAs(asUser, press.au.username);
        const authorBook = new MonographLandingPage(ap, tag);
        await authorBook.goto(draft.submissionId);
        await expect(authorBook.title()).toHaveText('Draft Tides');
        await expect(authorBook.notices()).toHaveText([TEXT.preview]);

        // Everyone else: "404 Not Found" (Actors row 2; Rule 3).
        await expectNotFoundPage(page, draftUrl);
        for (const other of [rd, rv, a2]) {
            await expectNotFoundPage(await pageAs(asUser, other.username), draftUrl);
        }

        // The unfinished submission: "404 Not Found" for the Press manager
        // and its Author (Actors row 2).
        await expectNotFoundPage(mp, unfinishedUrl);
        await expectNotFoundPage(ap, unfinishedUrl);

        // Control: "Shorelines" shows no preview notice (Rules 3, 5).
        const visitorBook = new MonographLandingPage(page, tag);
        await visitorBook.goto(shorelines.submissionId);
        await expect(visitorBook.title()).toHaveText('Shorelines');
        await expect(visitorBook.publishedLine()).toBeVisible();
        await expect(visitorBook.notices()).toHaveCount(0);
    });

    test('S6: An older version beside the current one', async ({page, asUser, ompApi}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        const mg = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const press = await seedPress(ompApi, tag, {extra: [mg]});
        const tides = await seedBook(ompApi, press, 1, {title: 'Tides'});
        const v1 = tides.publicationId;
        const tidesUrl = bookUrl(tag, tides.submissionId);

        // Given: a second version retitled "Tides Revised", published today
        // on screen (footnote s).
        const mp = await pageAs(asUser, mg.username);
        await new WorkflowPage(mp, tag).gotoEditorial(tides.submissionId);
        const v2 = await createNewVersion(mp);
        await retitleVersion(mp, tag, tides.submissionId, v2, 'Tides Revised');
        await publishShownVersion(mp);

        // The current page (Rules 4, 8, 9).
        const book = new MonographLandingPage(page, tag);
        await book.goto(tides.submissionId);
        await expect(book.title()).toHaveText('Tides Revised');
        await expect(book.publishedValue()).toHaveText(new RegExp(`^\\s*March 5, 2024 — Updated on ${todayLong()}\\s*$`));
        await expect(book.versionEntries()).toHaveText([new RegExp(`^\\s*${todayShort()} \\(.+\\)\\s*$`), FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveText([FIRST_VERSION]);
        await expect(book.versionLink(FIRST_VERSION)).toHaveAttribute('href', endsWith(bookUrl(tag, tides.submissionId, {version: v1})));
        // Control: the current version carries no outdated-version notice (Rule 6).
        await expect(book.notices()).toHaveCount(0);

        // The older version (Rules 4, 6, 8, 9); its tab title is A5, not read.
        await book.pressVersion(FIRST_VERSION, endsWith(bookUrl(tag, tides.submissionId, {version: v1})));
        await expect(book.notices()).toHaveText([TEXT.outdated('2024-03-05')]);
        await expect(book.title()).toHaveText('Tides');
        await expect(book.publishedValue()).toHaveText('March 5, 2024');
        await expect(book.versionEntries()).toHaveText([new RegExp(`^\\s*${todayShort()} \\(.+\\)\\s*$`), FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveCount(1);
        await expect(book.versionLinks()).toHaveText(new RegExp(`^\\s*${todayShort()} \\(.+\\)\\s*$`));
        await expect(book.versionLinks()).toHaveAttribute('href', endsWith(tidesUrl));

        // "most recent version": the book's address (Rule 6).
        await book.pressMostRecentVersion(endsWith(tidesUrl));
        await expect(book.title()).toHaveText('Tides Revised');
        await expect(book.notices()).toHaveCount(0);
    });

    test('S7: An older version\'s chapter pages, on a press with "DOI Versioning" "Yes"', async ({page, asUser, ompApi}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const mg = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const press = await seedPress(ompApi, tag, {extra: [mg], doiPrefix: '10.1234', doiVersioning: true});
        const coastlines = await seedBook(ompApi, press, 1, {
            title: 'Coastlines',
            chapters: [
                {title: 'Tides', page: true},
                {title: 'Coda', page: true},
            ],
        });
        const [tides, coda] = coastlines.chapters;
        const id = coastlines.submissionId;
        const v1 = coastlines.publicationId;

        // Given: a second version without "Coda" and with "Harbours" (its
        // "Chapter Page" ticked), published today on screen (footnote s).
        const mp = await pageAs(asUser, mg.username);
        await new WorkflowPage(mp, tag).gotoEditorial(id);
        const v2 = await createNewVersion(mp);
        const chapters = new ChaptersPage(mp, tag);
        await chapters.gotoEditorial(id, v2);
        await chapters.list.confirmDelete(await chapters.list.openDelete('Coda'));
        const win = await chapters.list.openAdd();
        await win.fill({title: 'Harbours'});
        await win.chapterPageBox().check();
        await win.save();
        await expect(chapters.list.chapterBlock('Harbours')).toHaveCount(1);
        await expect(chapters.list.chapterBlock('Coda')).toHaveCount(0);
        await publishShownVersion(mp);

        const book = new MonographLandingPage(page, tag);
        const newest = (suffix = '') => new RegExp(`^\\s*${todayShort()} \\(.+\\)${escapeRe(suffix)}\\s*$`);

        // "Tides" now: the second version plain text, the first a link (Rule 17).
        await book.goto(id);
        await book.openChapter('Tides');
        await expect(page).toHaveURL(endsWith(bookUrl(tag, id, {chapter: tides.id})));
        await expect(book.versionEntries()).toHaveText([newest(), FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveText([FIRST_VERSION]);

        // "Tides" in the first version: its address, the outdated notice;
        // "Volume" opens the first version's book page; "most recent
        // version" the chapter's current page (Rules 15, 15a, 18).
        await book.pressVersion(FIRST_VERSION, endsWith(bookUrl(tag, id, {version: v1, chapter: tides.id})));
        await expect(book.chapterRoot()).toBeVisible();
        await expect(book.title()).toHaveText('Tides');
        await expect(book.notices()).toHaveText([TEXT.outdated('2024-03-05')]);
        await book.pressVolume();
        await expect(page).toHaveURL(endsWith(bookUrl(tag, id, {version: v1})));
        await expect(book.title()).toHaveText('Coastlines');
        await expect(book.notices()).toHaveText([TEXT.outdated('2024-03-05')]);
        await page.goBack();
        await expect(page).toHaveURL(endsWith(bookUrl(tag, id, {version: v1, chapter: tides.id})));
        await expect(book.chapterRoot()).toBeVisible();
        await book.pressMostRecentVersion(endsWith(bookUrl(tag, id, {chapter: tides.id})));
        await expect(book.chapterRoot()).toBeVisible();
        await expect(book.notices()).toHaveCount(0);

        // "Harbours": " — Chapter created" on the second version, the first
        // plain text (Rule 17).
        await book.goto(id);
        await book.openChapter('Harbours');
        await expect(book.title()).toHaveText('Harbours');
        await expect(book.versionEntries()).toHaveText([newest(TEXT.chapterCreated), FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveCount(0);

        // "Coda" in the first version: the outdated notice, " — Without
        // this chapter" on the second version, both plain text; "most
        // recent version" the book's current page (Rules 10, 17, 18).
        await book.goto(id);
        await book.pressVersion(FIRST_VERSION, endsWith(bookUrl(tag, id, {version: v1})));
        await book.openChapter('Coda');
        await expect(page).toHaveURL(endsWith(bookUrl(tag, id, {version: v1, chapter: coda.id})));
        await expect(book.title()).toHaveText('Coda');
        await expect(book.notices()).toHaveText([TEXT.outdated('2024-03-05')]);
        await expect(book.versionEntries()).toHaveText([newest(TEXT.withoutChapter), FIRST_VERSION]);
        await expect(book.versionLinks()).toHaveCount(0);
        await book.pressMostRecentVersion(endsWith(bookUrl(tag, id)));
        await expect(book.title()).toHaveText('Coastlines');
        await expect(book.notices()).toHaveCount(0);

        // Control: the current version does not carry "Coda" (Rule 15).
        await expectNotFoundPage(page, bookUrl(tag, id, {chapter: coda.id}));
    });

    test('S8: "How to Cite" on a book and a chapter', async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        const press = await seedPress(ompApi, tag, {enableDois: false, plugins: {citationstylelanguageplugin: {enabled: true}}});
        const shorelines = await seedBook(ompApi, press, 1, {
            title: 'Shorelines',
            contributors: [LEE],
            chapters: [{title: 'Tides', pages: '1-20', page: true, authors: [LEE_EMAIL]}],
        });
        const [tides] = shorelines.chapters;
        const book = new MonographLandingPage(page, tag);
        const shorelinesUrl = bookUrl(tag, shorelines.submissionId);

        // The book's citation, in "APA", at the foot of the side column
        // (Rules 19, 19a; Settings bullet 4).
        await book.goto(shorelines.submissionId);
        await expect.poll(async () => (await book.sideOutline()).at(-1), {timeout: 30_000}).toBe('citation');
        await expect(book.citationHeading()).toHaveText(TEXT.howToCite);
        for (const part of ['Quill', 'Marsh', 'Shorelines', press.name, '2024', shorelinesUrl]) {
            await expect(book.citation()).toContainText(part);
        }

        // Another format: "MLA" changes the words, still naming the book (Actors row 6; Rule 19).
        await book.openFormats();
        const mla = await book.chooseFormat('MLA');
        for (const part of ['Quill', 'Marsh', 'Shorelines']) {
            expect(mla).toContain(part);
        }

        // A download: "BibTeX" saves a file (Actors row 6; Rule 19).
        await book.openFormats();
        const bibtex = await book.downloadCitation('BibTeX');
        expect(bibtex.name).not.toBe('');
        expect(bibtex.text).toContain('Shorelines');

        // The chapter's citation (Rule 19b).
        await book.openChapter('Tides');
        await expect(page).toHaveURL(endsWith(bookUrl(tag, shorelines.submissionId, {chapter: tides.id})));
        await expect.poll(async () => (await book.sideOutline()).at(-1), {timeout: 30_000}).toBe('citation');
        await expect(book.citationHeading()).toHaveText(TEXT.howToCite);
        await expect(book.citation()).toHaveText(
            new RegExp(
                `Marsh.*Tides.*\\bIn\\b.*Quill.*Marsh.*Shorelines.*1[-–]20.*${escapeRe(press.name)}.*${escapeRe(
                    bookUrl(tag, shorelines.submissionId, {chapter: tides.id})
                )}`
            )
        );

        // Control: a new press, where the plugin is off, shows no "How to
        // Cite" on a published book's page (Settings bullet 3).
        const plain = await seedPress(ompApi, `${tag}c`);
        const plainBook = await seedBook(ompApi, plain, 1, {title: 'Shorelines'});
        const control = new MonographLandingPage(page, plain.path);
        await control.goto(plainBook.submissionId);
        await expect.poll(() => control.sideOutline(), {timeout: 30_000}).toEqual(['cover', 'date_published', 'copyright']);
        await expect(control.citationBlock()).toHaveCount(0);
    });

    test('S9: Free files for signed-in users only', async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        const rd = account(tag, 'rd', 'Rhea', 'Reader', ['reader']);
        const press = await seedPress(ompApi, tag, {extra: [rd], restrictMonographAccess: true});
        const shorelines = await seedBook(ompApi, press, 1, {title: 'Shorelines', publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
        const pdf = shorelines.publicationFormats[0];
        const pdfUrl = fileUrl(tag, shorelines.submissionId, pdf.id, pdf.submissionFileId);
        const book = new MonographLandingPage(page, tag);
        const viewer = new ViewableFilePage(page);

        // The page opens signed out, with the link "PDF" (Settings bullet 6).
        await book.goto(shorelines.submissionId);
        await expect(book.title()).toHaveText('Shorelines');
        await expect(book.sideFileLinks()).toHaveText(['PDF']);

        // "PDF": the Login page (Rule 13c).
        await book.sideFileLink('PDF').click();
        await expectLoginPage(page);

        // Signed in there: the PDF view page (Actors row 3; Rule 13c).
        await new LoginPage(page).signIn(rd.username, rd.password);
        await expect(page).toHaveURL(endsWith(pdfUrl));
        await viewer.expectLoaded();
        await expect(viewer.fileName()).toHaveText('article.pdf');

        // Control: back on the book's page, "PDF" opens the view page with
        // no Login page on the way (Actors row 3).
        await book.goto(shorelines.submissionId);
        const visited = [];
        const onNavigated = (frame) => {
            if (frame === page.mainFrame()) visited.push(frame.url());
        };
        page.on('framenavigated', onNavigated);
        await book.sideFileLink('PDF').click();
        await expect(page).toHaveURL(endsWith(pdfUrl));
        await viewer.expectLoaded();
        page.off('framenavigated', onNavigated);
        expect(visited.filter((url) => /\/login(\?|$)/.test(url))).toEqual([]);
    });

    test("S10: No book's page on a journal or a preprint server (absence; the press's control)", async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const press = await seedPress(ompApi, tag);
        const harbour = await seedBook(ompApi, press, 1, {title: 'Harbour Book'});

        // Control: the press's address followed by "catalog/book/" and a
        // published book's number opens the book's page (Rule 2).
        const book = new MonographLandingPage(page, tag);
        const response = await book.goto(harbour.submissionId);
        expect(response && response.status()).toBe(200);
        await expect(page).toHaveURL(endsWith(bookUrl(tag, harbour.submissionId)));
        await expect(book.title()).toHaveText('Harbour Book');
    });
});
