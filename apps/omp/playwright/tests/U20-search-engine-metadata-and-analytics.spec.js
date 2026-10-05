// @ts-check
/**
 * @file playwright/tests/U20-search-engine-metadata-and-analytics.spec.js
 *
 * Search-engine metadata & analytics — OMP suite, one test per canonical
 * scenario: S1–S8, all common to the three apps, in the press's own words
 * (Press Manager, a book's page at `catalog/book/{id}`, the wizard's first
 * tab "Setup", "…of the press…"), with the {OMP} and {OMP OPS} bullets
 * inline ("Catalog", "New Releases" and the category pages in the
 * sitemap, the book's "PDF" file entry, the unpublish and publish-again
 * reads of S2, "citation_publisher" and "citation_publication_date", the
 * book's file page in S6 and the earlier version's file page in S7). The
 * {OJS} bullets (issues, "Search", "Current", "Archive", the journal's
 * issue, section and keyword tags) and the {OPS} one (no Dublin Core
 * plugin) have no press end and are not run here.
 * Spec: docs/specs/U20-search-engine-metadata-and-analytics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OMP3 🐞, OMP5 🐞: the file page's "DC.Type" and "DC.Identifier.URI"
 *   are never read.
 * - OMP4 🐞: S7 never reads the sitemap after "Create New Version".
 * - OMP1 🐞, OMP2 🐞: every book has one format, "PDF", with one PDF file.
 * - A1 🐞, A5 🐞, A6 🐞, A7 🐞: no description with a quote mark or
 *   markup, no expired announcement, no contributor without names in the
 *   submission's language, no "&" in an abstract.
 * - A2 🐞: S8 never reads the plugin's description on a press nor the
 *   "Check Status" paragraph; the window's first sentence only.
 * - A3 ❓: the site's own Plugins list is never opened. A4 ❓ is read where
 *   S1 and S2 state it (a press lists "Catalog", "New Releases" and its
 *   category pages).
 * - OJS1 🐞, OJS2 🐞, OPS1 🐞: a journal's and a preprint server's, in
 *   those suites.
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read (S4, signed out). Every other scenario
 * runs on its own scratch presses, their paths the test's unique tag,
 * with throwaway accounts (the username twice as password): an Author
 * (Ada Author) who submits every book, a Press Manager in S1, S2 and
 * S5–S8, a Reader and a Press Manager in S3. The Site Administrator of S5
 * is the installer's `admin`, whom every scratch press enrols as a
 * manager. The "PDF" format (approved, available, its file open access)
 * comes from the submission scenario's `publicationFormats[]`, the
 * category "Cat One" from the context's `categories[]`. No test passes
 * `plugins`: the plugins are as a new press has them and S6 and S8 change
 * them on screen; "Description", "Custom Tags" and the Google Analytics
 * number are typed on their own screens. The unpublish, the second
 * publish and the second version (S2, S7) are the screens' (U49's). Every
 * signed-in actor gets its own `asUser` context; the visitor is a browser
 * context with an empty storage state (patterns.md, parallel lesson 8).
 * A page's source is the navigation's raw answer (what "view source"
 * shows), and the sitemap is read the same way and taken apart; the
 * addresses both carry are built from the install's base URL, not the
 * worker's port, so every address is compared by its path. Every Settings
 * › Website › "Plugins" load fires the Plugin Gallery grid's server 500
 * (U62's finding), and a file page's viewer logs "PDFJS is not defined"
 * (U69 A23): neither is asserted here. S6 follows the book page's
 * "citation_pdf_url"; no file entry of the sitemap is followed, and S6 and
 * S7 read the file page's source only, never its viewer. Every absence is read settled and paired with a
 * positive control taken the same way (M4, M6): a sitemap's missing
 * entries beside the entries it lists, a missing tag beside the tags the
 * same source carries or carried one step earlier, a missing arrow beside
 * the arrow the same row shows once ticked. Everything here runs in the
 * parallel `omp` project: each test's settings and plugins are its own
 * scratch press's.
 * S8 keeps the visitor's browser on the machine (stubGoogle: Google's
 * loader answered with an empty script, google-analytics.com aborted), so
 * it asserts the app's part, the source's loader and number and the
 * browser's request for the loader, and never the report to
 * google-analytics.com, which Rule 19 ties to Google's script loading.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {
    SEM_TEXT: X,
    PLUGIN_IDS,
    stubGoogle,
    flat,
    sitemapPath,
    siteIndexPath,
    pathOf,
    readSitemap,
    readSitemapPair,
    readSource,
    sourceOf,
    metaContents,
    metasMatching,
    linksOf,
    headAsBuilt,
    DistributionSettings,
    PluginRow,
    HostedContexts,
} = require('../../../../shared/playwright/pages/SearchEngineMetadataPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {captureDownload} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');

const DESCRIPTION_HELP =
    'Provide a brief description (50-300 characters) of the press which search engines can display when listing the press in search results.';
const WIZARD_FIRST_TAB = 'Setup';
const GENERATOR = /^Open Monograph Press \d+\.\d+\.\d+\.\d+$/;
const CUSTOM_TAG = '<meta name="u20-check" content="custom">';
const PDF_FORMAT = [{name: 'PDF', file: 'article.pdf'}];

/** A visitor's page: a second browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u20${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch press with the throwaway Author (`${tag}au`, Ada Author) and,
 * with `manager`, a Press Manager (`${tag}mg`), plus `extra` accounts and
 * context keys. Returns the createContext answer.
 */
async function seedPress(ompApi, tag, {manager = true, extra = [], ...keys} = {}) {
    return ompApi.createContext({
        tag,
        users: [
            ...(manager ? [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])] : []),
            user(`${tag}au`, 'Ada', 'Author', ['author']),
            ...extra,
        ],
        ...keys,
    });
}

/** A book submitted by the press's Author; returns the createSubmission answer ({submissionId, publicationFormats, …}). */
async function seedBook(ompApi, tag, title, extra = {}) {
    return ompApi.createSubmission({
        tag: `${tag}${title.replace(/[^A-Za-z]/g, '').slice(0, 6).toLowerCase()}`,
        context: tag,
        submitter: `${tag}au`,
        title,
        ...extra,
    });
}

/** A signed-in actor's page (its own `asUser` context). */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** A press's address (path) with an optional rest. */
function at(contextPath, rest = '') {
    return `/index.php/${contextPath}${rest}`;
}

/** A book's page (path). */
function bookPath(contextPath, submissionId) {
    return at(contextPath, `/catalog/book/${submissionId}`);
}

/** A book file's view page (path): the book's, the format's and the file's numbers. */
function filePath(contextPath, submissionId, format) {
    return at(contextPath, `/catalog/view/${submissionId}/${format.id}/${format.submissionFileId}`);
}

/**
 * On a book page open in `page`, press the "PDF" format's link and read
 * the page it opens as "view source" shows it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} submissionId
 */
async function openPdfFormat(page, submissionId) {
    const link = page.locator(`a[href*="/catalog/view/${submissionId}/"]`).filter({hasText: 'PDF'});
    await expect(link).toHaveCount(1, {timeout: 30_000});
    const navigated = page.waitForResponse(
        (r) => r.request().isNavigationRequest() && r.request().frame() === page.mainFrame() && /\/catalog\/view\//.test(r.url()),
        {timeout: 30_000}
    );
    await link.click();
    return sourceOf(page, await navigated);
}

// ---------------------------------------------------------------------------
// The press's workflow: publish, unpublish, a new version (U49's screens)
// ---------------------------------------------------------------------------

/** Open a book's workflow (editorial dashboard) on its Publication group, optionally deep-linked to a page. */
async function openWorkflow(page, contextPath, submissionId, {menuKey = null} = {}) {
    const keyParam = menuKey ? `&workflowMenuKey=${menuKey}` : '';
    await page.goto(`/index.php/${contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}${keyParam}`);
    await expect(page.getByRole('link', {name: 'Publication', exact: true})).toBeVisible({timeout: 30_000});
}

/** Open a Publication page ("Title & Abstract") and wait for its heading. */
async function openPublicationPage(page, entry) {
    const link = await new WorkflowPage(page, null).revealPublicationEntry(entry);
    await link.click();
    await expect(page.getByRole('heading', {name: `Publication: ${entry}`})).toBeVisible({timeout: 30_000});
}

/** The Publication head's status readout. */
async function expectStatus(page, label) {
    await expect(page.locator('div:has(> span:text-is("Status:"))')).toContainText(label, {timeout: 30_000});
}

/** "Publish", its "Schedule For Publication" window, and that window's "Publish". */
async function publishShown(page) {
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(modal).toBeVisible({timeout: 30_000});
    const published = page.waitForResponse((r) => r.url().includes('/publish') && r.ok(), {timeout: 30_000});
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    await published;
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
    await expectStatus(page, 'Published');
}

/** "Unpublish" and its confirmation. */
async function unpublishShown(page) {
    await page.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Unpublish'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const unpublished = page.waitForResponse((r) => r.url().includes('/unpublish') && r.ok(), {timeout: 30_000});
    await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
    await unpublished;
    await expect(page.getByRole('button', {name: 'Publish', exact: true})).toBeVisible({timeout: 30_000});
}

/** "Create New Version" and its "Confirm"; returns the new publication's id. */
async function createVersion(page, contextPath) {
    const item = await new WorkflowPage(page, contextPath).revealPublicationEntry('Create New Version');
    await new WorkflowPage(page, contextPath).expectVersionLoaded();
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByLabel('Publication Stage')).toBeVisible({timeout: 30_000});
    const created = page.waitForResponse(
        (r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const body = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return body.id;
}

/** Replace a TinyMCE box's content (the editor initialized first) and let the form see the change. */
async function setRichText(page, editorId, html) {
    await page.waitForFunction((id) => !!window.tinymce?.get(id)?.initialized, editorId, {timeout: 30_000});
    await page.evaluate(
        ([id, value]) => {
            const editor = window.tinymce.get(id);
            editor.setContent(value);
            editor.fire('change');
        },
        [editorId, html]
    );
}

/** A Publication page's "Save", bounded by the publication's write and the footer's "Saved". */
async function savePublicationForm(page) {
    const saved = page.waitForResponse(
        (r) => /\/submissions\/\d+\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await expect(page.locator('.pkpFormPage__status', {hasText: 'Saved'})).toBeVisible({timeout: 30_000});
}

test.describe('Search-engine metadata & analytics', () => {
    test("S1: A new press's sitemap", async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        await seedPress(ompApi, tag);
        const page = await actorPage(asUser, `${tag}mg`);

        // The "sitemap" link: the tab's intro under "Search Indexing"; the
        // word "sitemap" opens the press's sitemap in a new tab (Rule 1;
        // Fields, the "Search Indexing" tab).
        const form = await new DistributionSettings(page, tag).openSearchIndexing();
        await expect(form.heading).toHaveText(X.indexingTab);
        await expect(form.intro).toHaveText(X.indexingIntro);
        const popupOpened = page.waitForEvent('popup');
        await form.sitemapLink.click();
        const popup = await popupOpened;
        await popup.waitForLoadState('domcontentloaded');
        expect(pathOf(popup.url())).toBe(sitemapPath(tag));
        await expect(popup.locator('body')).toContainText('<urlset');
        await expect(page).toHaveURL(/\/management\/settings\/distribution/);

        // The sitemap: marked-up text, a list of entries, each holding one
        // address and nothing else (Rule 1).
        const sitemap = await readSitemap(visitor, sitemapPath(tag));
        expect(sitemap.status).toBe(200);
        expect(sitemap.contentType).toMatch(/xml/);
        expect(sitemap.root).toBe('urlset');
        expect(flat(sitemap.shown)).toContain(X.xmlViewer);
        expect(sitemap.entries.length).toBeGreaterThan(0);
        for (const entry of sitemap.entries) {
            expect(entry.children, `the entry ${entry.loc}`).toEqual(['loc']);
        }
        expect(sitemap.body).not.toMatch(/<lastmod|<priority|<changefreq/);

        // Its entries, in order: home, "Register", "Login", "Submissions",
        // "Contact", then a press's "Catalog" and "New Releases" (Rules 2,
        // 3; Fields, "What the sitemap lists"; A4).
        expect(sitemap.paths).toEqual([
            at(tag),
            at(tag, '/user/register'),
            at(tag, '/login'),
            at(tag, '/about/submissions'),
            at(tag, '/about/contact'),
            at(tag, '/catalog'),
            at(tag, '/catalog/newReleases'),
        ]);

        // Control: no "About the Press" entry, beside the About pages it
        // lists (Rule 3; Settings bullet 11).
        expect(sitemap.paths).toContain(at(tag, '/about/submissions'));
        expect(sitemap.paths).not.toContain(at(tag, '/about'));
    });

    test('S2: Published work and announcements in the sitemap', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const other = `${tag}b`;
        const context = await seedPress(ompApi, tag, {
            enableAnnouncements: true,
            announcements: [{title: 'Call for Papers'}],
            categories: [{path: 'cat-one', title: 'Cat One'}],
        });
        const announcementId = context.announcements[0].id;
        const tidal = await seedBook(ompApi, tag, 'Tidal Patterns', {published: true, publicationFormats: PDF_FORMAT});
        const tidalId = tidal.submissionId;
        const [pdf] = tidal.publicationFormats;
        const draft = await seedBook(ompApi, tag, 'Draft Study', {submitted: true});
        await seedPress(ompApi, other, {manager: false});
        const elsewhere = await seedBook(ompApi, other, 'Elsewhere', {published: true});
        const page = await actorPage(asUser, `${tag}mg`);

        // Announcements: after "Login", "Announcements", then the page of
        // "Call for Papers"; that entry opens the announcement (Rule 3;
        // Settings bullet 9).
        const sitemap = await readSitemap(visitor, sitemapPath(tag));
        expect(sitemap.status).toBe(200);
        const login = sitemap.paths.indexOf(at(tag, '/login'));
        expect(login).toBeGreaterThan(0);
        expect(sitemap.paths.slice(login + 1, login + 3)).toEqual([
            at(tag, '/announcement'),
            at(tag, `/announcement/view/${announcementId}`),
        ]);
        await visitor.goto(sitemap.paths[login + 2]);
        await expect(visitor.getByRole('heading', {name: 'Call for Papers', level: 1})).toBeVisible({timeout: 30_000});

        // Published work: the book's page follows "Catalog", then the page
        // of its "PDF" file; the page of "Cat One" follows "New Releases"
        // (Rules 2, 4; Fields, "What the sitemap lists"). The file entry is
        // read, never followed.
        const catalog = sitemap.paths.indexOf(at(tag, '/catalog'));
        expect(catalog).toBeGreaterThan(0);
        expect(sitemap.paths.slice(catalog + 1, catalog + 3)).toEqual([bookPath(tag, tidalId), filePath(tag, tidalId, pdf)]);
        const releases = sitemap.paths.indexOf(at(tag, '/catalog/newReleases'));
        expect(releases).toBeGreaterThan(catalog);
        expect(sitemap.paths[releases + 1]).toBe(at(tag, '/catalog/category/cat-one'));

        // Not in the sitemap: no entry opens "Draft Study", and none lies
        // under the second press's address (Rule 2), beside the book it lists.
        for (const path of sitemap.paths) {
            expect(path, 'no entry of the draft').not.toMatch(new RegExp(`/catalog/(book|view)/${draft.submissionId}(/|$)`));
            expect(path, 'no entry under the second press').not.toMatch(new RegExp(`^/index\\.php/${other}(/|$)`));
        }
        expect(sitemap.paths).toContain(bookPath(tag, tidalId));

        // Unpublished: the Press Manager unpublishes "Tidal Patterns" on its
        // workflow; the reloaded sitemap holds none of its entries, beside
        // the entries it still lists (Rule 2).
        await openWorkflow(page, tag, tidalId);
        await openPublicationPage(page, 'Title & Abstract');
        await expectStatus(page, 'Published');
        await unpublishShown(page);
        const unpublished = await readSitemap(visitor, sitemapPath(tag));
        expect(unpublished.status).toBe(200);
        expect(unpublished.paths).toContain(at(tag, '/catalog'));
        expect(unpublished.paths).toContain(at(tag, '/catalog/category/cat-one'));
        for (const path of unpublished.paths) {
            expect(path, 'no entry of the unpublished book').not.toMatch(new RegExp(`/catalog/(book|view)/${tidalId}(/|$)`));
        }

        // Published again: the entry of its page is back (Rule 2).
        await publishShown(page);
        const again = await readSitemap(visitor, sitemapPath(tag));
        expect(again.status).toBe(200);
        expect(again.paths).toContain(bookPath(tag, tidalId));

        // Control: the second press's own sitemap lists the page of
        // "Elsewhere", its home page first (Rule 2).
        const second = await readSitemap(visitor, sitemapPath(other));
        expect(second.status).toBe(200);
        expect(second.paths[0]).toBe(at(other));
        expect(second.paths).toContain(bookPath(other, elsewhere.submissionId));
    });

    test("S3: The site's index, and presses closed to visitors", async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const open = `${tag}ow`;
        const members = `${tag}mo`;
        const hidden = `${tag}hb`;
        await seedPress(ompApi, open, {manager: false, context: {name: 'Open Waters'}});
        await seedPress(ompApi, members, {
            manager: false,
            context: {name: 'Members Only'},
            restrictSiteAccess: true,
            extra: [user(`${members}rd`, 'Rita', 'Reader', ['reader'])],
        });
        await seedPress(ompApi, hidden, {context: {name: 'Hidden Bay', enabled: false}});

        // The site's index: one sitemap address per press enabled
        // publicly, "Open Waters" and "Members Only" among them, none for
        // "Hidden Bay" (Rule 5; Settings bullets 7, 8).
        const index = await readSitemap(visitor, siteIndexPath());
        expect(index.status).toBe(200);
        expect(index.contentType).toMatch(/xml/);
        expect(index.root).toBe('sitemapindex');
        expect(flat(index.shown)).toContain(X.xmlViewer);
        expect(index.paths.filter((p) => p === sitemapPath(open))).toHaveLength(1);
        expect(index.paths.filter((p) => p === sitemapPath(members))).toHaveLength(1);
        expect(index.paths.filter((p) => p.startsWith(at(hidden)))).toEqual([]);

        // A press that requires sign-in: its sitemap lands on Login (Rule 6).
        const login = new LoginPage(visitor);
        await visitor.goto(sitemapPath(members));
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${members}/login`));
        await expect(login.form).toBeVisible({timeout: 30_000});

        // Its Reader: signed in there, the sitemap shows, home first (Rule 6).
        await login.signIn(`${members}rd`, getPassword(`${members}rd`));
        const asReader = await readSitemap(visitor, sitemapPath(members));
        expect(asReader.status).toBe(200);
        expect(asReader.root).toBe('urlset');
        expect(asReader.paths[0]).toBe(at(members));

        // A press not enabled publicly: signed out, its sitemap lands on
        // Login, whose source carries "robots" "noindex,nofollow" (Rules 6, 11).
        await visitor.goto(at(members, '/login/signOut'));
        const hiddenOut = await readSource(visitor, sitemapPath(hidden));
        expect(pathOf(hiddenOut.url)).toMatch(new RegExp(`^/index\\.php/${hidden}/login`));
        await expect(login.form).toBeVisible({timeout: 30_000});
        expect(metaContents(hiddenOut, 'robots')).toEqual(['noindex,nofollow']);

        // Its Press Manager: the sitemap shows, home first; the home page's
        // and the Dashboard's sources carry the "robots" tag (Rules 6, 11).
        const manager = await actorPage(asUser, `${hidden}mg`);
        const asManager = await readSitemap(manager, sitemapPath(hidden));
        expect(asManager.status).toBe(200);
        expect(asManager.root).toBe('urlset');
        expect(asManager.paths[0]).toBe(at(hidden));
        const hiddenHome = await readSource(manager, at(hidden));
        expect(pathOf(hiddenHome.url)).toMatch(new RegExp(`^/index\\.php/${hidden}(/index)?$`));
        expect(metaContents(hiddenHome, 'robots')).toEqual(['noindex,nofollow']);
        const dashboard = await readSource(manager, at(hidden, '/dashboard'));
        expect(pathOf(dashboard.url)).toMatch(/\/dashboard/);
        expect(metaContents(dashboard, 'robots')).toEqual(['noindex,nofollow']);

        // Control: signed out, "Open Waters"'s sitemap opens, home first,
        // and its home page carries no "robots" tag beside its generator
        // (Rules 1, 6, 11).
        const openSitemap = await readSitemap(visitor, sitemapPath(open));
        expect(openSitemap.status).toBe(200);
        expect(openSitemap.paths[0]).toBe(at(open));
        const openHome = await readSource(visitor, at(open));
        expect(metaContents(openHome, 'generator')).toHaveLength(1);
        expect(metaContents(openHome, 'robots')).toEqual([]);
    });

    test("S4: Two interface languages, and the software's name", async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        await seedPress(ompApi, tag, {manager: false});
        const pk = 'publicknowledge';

        // The English sitemap: every address carries "/en/" after the
        // press's address, none "/fr_CA/" (Rule 4; Settings bullet 14).
        // Both languages are read as one snapshot, the French list the
        // English one's addresses in French: parallel tests publish on the
        // seeded press between two single reads (readSitemapPair).
        const [english, french] = await readSitemapPair(visitor, pk);
        expect(english.status).toBe(200);
        expect(english.paths.length).toBeGreaterThan(3);
        for (const path of english.paths) {
            expect(path).toMatch(new RegExp(`^/index\\.php/${pk}/en(/|$)`));
            expect(path).not.toContain('/fr_CA');
        }

        // The French sitemap: every address carries "/fr_CA/", none "/en/" (Rule 4).
        expect(french.status).toBe(200);
        expect(french.paths.length).toBe(english.paths.length);
        for (const path of french.paths) {
            expect(path).toMatch(new RegExp(`^/index\\.php/${pk}/fr_CA(/|$)`));
            expect(path).not.toMatch(/\/en(\/|$)/);
        }

        // The alternate links: the home page in English carries one per
        // language and an "x-default" to the address with no language;
        // "About the Press" carries the same three, to itself (Rule 8).
        const home = await readSource(visitor, at(pk, '/en'));
        expect(home.status).toBe(200);
        const homeLinks = linksOf(home, 'alternate').filter((l) => l.hreflang);
        expect(homeLinks.map((l) => [l.hreflang, pathOf(l.href)]).sort()).toEqual(
            [
                ['en', at(pk, '/en')],
                ['fr-CA', at(pk, '/fr_CA')],
                ['x-default', at(pk)],
            ].sort()
        );
        const about = await readSource(visitor, at(pk, '/en/about'));
        expect(about.status).toBe(200);
        const aboutLinks = linksOf(about, 'alternate').filter((l) => l.hreflang);
        expect(aboutLinks).toHaveLength(3);
        const aboutTargets = Object.fromEntries(aboutLinks.map((l) => [l.hreflang, pathOf(l.href).replace(/\/index$/, '')]));
        expect(aboutTargets).toEqual({
            en: at(pk, '/en/about'),
            'fr-CA': at(pk, '/fr_CA/about'),
            'x-default': at(pk, '/about'),
        });

        // The software's name: a "generator" tag on the home page, the
        // press's Login page and the site's home page (Rule 7).
        expect(metaContents(home, 'generator')).toHaveLength(1);
        expect(metaContents(home, 'generator')[0]).toMatch(GENERATOR);
        const loginPage = await readSource(visitor, at(pk, '/en/login'));
        expect(loginPage.status).toBe(200);
        expect(metaContents(loginPage, 'generator')[0]).toMatch(GENERATOR);
        const siteHome = await readSource(visitor, '/index.php/index');
        expect(siteHome.status).toBe(200);
        expect(pathOf(siteHome.url)).toMatch(/^\/index\.php\/index(\/en)?$/);
        expect(metaContents(siteHome, 'generator')[0]).toMatch(GENERATOR);

        // Control: the one-language scratch press's home page carries no
        // "alternate" language link, beside its generator tag (Rule 8).
        const scratch = await readSource(visitor, at(tag));
        expect(scratch.status).toBe(200);
        expect(metaContents(scratch, 'generator')[0]).toMatch(GENERATOR);
        expect(linksOf(scratch, 'alternate').filter((l) => l.hreflang)).toEqual([]);
    });

    test('S5: "Description" and "Custom Tags" on the press\'s pages', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const name = `Still Water ${tag}`;
        await seedPress(ompApi, tag, {context: {name}});
        const {submissionId: bookId} = await seedBook(ompApi, tag, 'Tidal Patterns', {published: true});
        const page = await actorPage(asUser, `${tag}mg`);
        const settings = new DistributionSettings(page, tag);

        // Control: before the first "Save", the home page carries no
        // "description" tag, beside its generator tag; the style sheets
        // sit in its hidden header (Rule 9).
        const before = await readSource(visitor, at(tag));
        expect(metaContents(before, 'generator')).toHaveLength(1);
        expect(metaContents(before, 'description')).toEqual([]);
        const builtBefore = await headAsBuilt(visitor);
        expect(builtBefore.stylesheetsInHead).toBeGreaterThan(0);
        expect(builtBefore.stylesheetsInBody).toBe(0);

        // The tab: both boxes empty; the help icon of "Description" (Fields).
        const form = await settings.openSearchIndexing();
        await expect(form.description).toHaveValue('');
        await expect(form.customTags).toHaveValue('');
        expect(await form.helpShown(form.descriptionHelpButton)).toBe(DESCRIPTION_HELP);

        // Saved: "Description", then "Custom Tags" with a tag and a line of
        // plain words; "Saved" (Rule 24; Fields).
        await form.description.fill('Letters about still water.');
        await form.customTags.fill(`${CUSTOM_TAG}\nPlain words`);
        expect(await form.save()).toBe(200);

        // The home page: the "description" tag and the custom tag as typed;
        // "Plain words" shows at the top, above the header, and the style
        // sheets that follow it belong to the page's body (Rules 9, 10).
        const home = await readSource(visitor, at(tag));
        expect(metaContents(home, 'description')).toEqual(['Letters about still water.']);
        expect(home.head).toContain(CUSTOM_TAG);
        const built = await headAsBuilt(visitor, 'Plain words');
        expect(built.firstLines[0]).toBe('Plain words');
        expect(built.textAboveHeader).toBe(true);
        expect(built.stylesheetsInHead).toBe(0);
        expect(built.stylesheetsInBody).toBeGreaterThan(0);

        // Other public pages: the book's page and "About the Press" carry
        // the custom tag and show "Plain words" at the top, and carry no
        // "description" tag (Rules 9, 10).
        for (const path of [bookPath(tag, bookId), at(tag, '/about')]) {
            const source = await readSource(visitor, path);
            expect(source.status, path).toBe(200);
            expect(source.body, path).toContain(CUSTOM_TAG);
            expect(metaContents(source, 'u20-check'), path).toEqual(['custom']);
            expect(metaContents(source, 'description'), path).toEqual([]);
            expect((await headAsBuilt(visitor, 'Plain words')).firstLines[0], path).toBe('Plain words');
        }

        // Pages without them: the Dashboard's source and the site's home
        // page's carry neither, beside their generator tags (Rule 10).
        const dashboard = await readSource(page, at(tag, '/dashboard'));
        expect(metaContents(dashboard, 'generator')).toHaveLength(1);
        expect(dashboard.body).not.toContain('u20-check');
        expect(dashboard.body).not.toContain('Plain words');
        const siteHome = await readSource(visitor, '/index.php/index');
        expect(metaContents(siteHome, 'generator')).toHaveLength(1);
        expect(siteHome.body).not.toContain('u20-check');
        expect(siteHome.body).not.toContain('Plain words');

        // The Settings Wizard: the Site Administrator's "Search Indexing"
        // side tab (under "Setup") reads the description; replaced and
        // saved, the manager's tab and the home page's tag follow (Rule 24;
        // Actors row 4).
        const admin = await actorPage(asUser, 'admin');
        const hosted = new HostedContexts(admin);
        await hosted.goto();
        await hosted.openWizard(name);
        const wizardForm = await hosted.openSearchIndexing(WIZARD_FIRST_TAB);
        await expect(wizardForm.description).toHaveValue('Letters about still water.');
        await wizardForm.description.fill('Notes on moving water.');
        expect(await wizardForm.save()).toBe(200);
        const reloaded = await settings.openSearchIndexing();
        await expect(reloaded.description).toHaveValue('Notes on moving water.');
        const afterWizard = await readSource(visitor, at(tag));
        expect(metaContents(afterWizard, 'description')).toEqual(['Notes on moving water.']);

        // Emptied: both boxes emptied and saved; the home page carries no
        // "description" and no custom tag and shows no "Plain words"
        // (Settings bullets 1, 2).
        await reloaded.description.fill('');
        await reloaded.customTags.fill('');
        expect(await reloaded.save()).toBe(200);
        const emptied = await readSource(visitor, at(tag));
        expect(metaContents(emptied, 'generator')).toHaveLength(1);
        expect(metaContents(emptied, 'description')).toEqual([]);
        expect(emptied.body).not.toContain('u20-check');
        expect(emptied.body).not.toContain('Plain words');
        await expect(visitor.locator('.pkp_structure_main')).toBeVisible();
        await expect(visitor.locator('body')).not.toContainText('Plain words');
    });

    test("S6: The indexing plugins' tags on a published book", async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        await seedPress(ompApi, tag, {context: {name: 'Sea Letters', acronym: 'SL'}});
        const book = await seedBook(ompApi, tag, 'Tidal Patterns', {
            abstract: 'Tides follow the moon.',
            citationsRaw: ['Moon, A. (2001). Tides.', 'Shore, B. (2010). Waves.'],
            datePublished: '2024-03-05',
            publicationFormats: PDF_FORMAT,
            published: true,
        });
        const bookId = book.submissionId;
        const [pdf] = book.publicationFormats;
        const bookPage = bookPath(tag, bookId);
        const page = await actorPage(asUser, `${tag}mg`);
        const dublinCore = new PluginRow(page, tag, PLUGIN_IDS.dublinCore);
        const scholar = new PluginRow(page, tag, PLUGIN_IDS.googleScholar);
        const analytics = new PluginRow(page, tag, PLUGIN_IDS.googleAnalytics);

        // Control: before the first change, "Generic Plugins" lists "Google
        // Scholar Indexing Plugin" and "Dublin Core Indexing Plugin" ticked
        // and "Google Analytics Plugin" unticked (Fields, the three plugins).
        await scholar.goto();
        for (const row of [scholar, dublinCore, analytics]) {
            await expect(row.categoryHeading()).toHaveText('Generic Plugins');
        }
        await expect(scholar.name).toHaveText(X.plugins.googleScholar);
        await expect(dublinCore.name).toHaveText(X.plugins.dublinCore);
        await expect(analytics.name).toHaveText(X.plugins.googleAnalytics);
        await expect(scholar.enabledBox).toBeChecked();
        await expect(dublinCore.enabledBox).toBeChecked();
        await expect(analytics.enabledBox).not.toBeChecked();

        // Google Scholar's tags, with a press's publisher, publication date
        // and one "citation_pdf_url" (Rule 12; Fields, "What "Google Scholar
        // Indexing Plugin" writes").
        const source = await readSource(visitor, bookPage);
        expect(source.status).toBe(200);
        expect(metaContents(source, 'gs_meta_revision')).toEqual(['1.1']);
        expect(metaContents(source, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(source, 'citation_author')).toEqual(['Ada Author']);
        expect(metaContents(source, 'citation_language')).toEqual(['en']);
        expect(metaContents(source, 'citation_abstract')).toEqual(['Tides follow the moon.']);
        expect(metaContents(source, 'citation_reference')).toHaveLength(2);
        expect(metaContents(source, 'citation_publisher')).toEqual(['Sea Letters']);
        expect(metaContents(source, 'citation_publication_date')).toEqual(['2024-03-05']);
        expect(metaContents(source, 'citation_pdf_url')).toHaveLength(1);

        // Dublin Core's tags, after the link naming its schema; "DC.Type"
        // "Text.Book" (Rule 12; Fields, "What "Dublin Core Indexing Plugin"
        // writes").
        expect(linksOf(source, 'schema.DC')).toHaveLength(1);
        const schemaAt = source.body.indexOf('rel="schema.DC"');
        const firstDc = source.body.indexOf('name="DC.');
        expect(schemaAt).toBeGreaterThan(0);
        expect(firstDc).toBeGreaterThan(schemaAt);
        expect(metaContents(source, 'DC.Title')).toEqual(['Tidal Patterns']);
        expect(metaContents(source, 'DC.Creator.PersonalName')).toEqual(['Ada Author']);
        expect(metaContents(source, 'DC.Date.created')).toEqual(['2024-03-05']);
        expect(metaContents(source, 'DC.Description')).toEqual(['Tides follow the moon.']);
        expect(metaContents(source, 'DC.Source')).toEqual(['Sea Letters']);
        expect(metaContents(source, 'DC.Type')).toEqual(['Text.Book']);

        // The PDF address: the visitor opens the address "citation_pdf_url"
        // gives (by its path, the tags carry the install's base URL) and
        // the browser saves the "PDF" format's file, article.pdf (Rule 12).
        const [pdfUrl] = metaContents(source, 'citation_pdf_url');
        const {download: saved} = await captureDownload(visitor, () => visitor.goto(pathOf(pdfUrl)).catch(() => {}));
        expect(saved.suggestedFilename()).toBe('article.pdf');

        // The book's file page: the "PDF" format's link on the book's page
        // opens it; its source carries "DC." tags and no "citation_" tag, and
        // "DC.Identifier" reads the book's, the format's and the file's
        // numbers at the end of its address, joined by "/" (Rule 17).
        const file = await openPdfFormat(visitor, bookId);
        expect(file.status).toBe(200);
        expect(pathOf(file.url)).toBe(filePath(tag, bookId, pdf));
        expect(metasMatching(file, /^DC\./).length).toBeGreaterThan(0);
        expect(metasMatching(file, /^citation_/)).toEqual([]);
        expect(metaContents(file, 'gs_meta_revision')).toEqual([]);
        const numbers = pathOf(file.url).split('/').slice(-3).join('/');
        expect(numbers).toBe(`${bookId}/${pdf.id}/${pdf.submissionFileId}`);
        expect(metaContents(file, 'DC.Identifier')).toEqual([numbers]);

        // Dublin Core off: the "Disable" window asks; "OK" and the notice.
        // The book's page carries no "DC." tag, the "citation_" tags stay;
        // the file's page carries no "DC." tag either (Rule 15; Settings
        // bullet 3).
        await dublinCore.goto();
        const asked = await dublinCore.setEnabled(false);
        expect(asked).toEqual({title: X.disableTitle, question: X.disableQuestion});
        await expect(dublinCore.notice(X.disabledNotice(X.plugins.dublinCore))).toBeVisible();
        const noDc = await readSource(visitor, bookPage);
        expect(metasMatching(noDc, /^DC\./)).toEqual([]);
        expect(linksOf(noDc, 'schema.DC')).toEqual([]);
        expect(metaContents(noDc, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(noDc, 'gs_meta_revision')).toEqual(['1.1']);
        const noDcFile = await readSource(visitor, filePath(tag, bookId, pdf));
        expect(noDcFile.status).toBe(200);
        expect(metaContents(noDcFile, 'generator')).toHaveLength(1);
        expect(metasMatching(noDcFile, /^DC\./)).toEqual([]);

        // Dublin Core on again: nothing asked, the notice; the "DC." tags
        // are back (Rule 15).
        expect(await dublinCore.setEnabled(true)).toBeNull();
        await expect(dublinCore.notice(X.enabledNotice(X.plugins.dublinCore))).toBeVisible();
        const dcBack = await readSource(visitor, bookPage);
        expect(metaContents(dcBack, 'DC.Title')).toEqual(['Tidal Patterns']);
        expect(metaContents(dcBack, 'DC.Type')).toEqual(['Text.Book']);

        // Google Scholar off: no "gs_meta_revision" and no "citation_" tag;
        // the "DC." tags stay (Rule 15; Settings bullet 4).
        await scholar.goto();
        expect(await scholar.setEnabled(false)).toEqual({title: X.disableTitle, question: X.disableQuestion});
        await expect(scholar.notice(X.disabledNotice(X.plugins.googleScholar))).toBeVisible();
        const noGs = await readSource(visitor, bookPage);
        expect(metaContents(noGs, 'gs_meta_revision')).toEqual([]);
        expect(metasMatching(noGs, /^citation_/)).toEqual([]);
        expect(metaContents(noGs, 'DC.Title')).toEqual(['Tidal Patterns']);

        // Google Scholar on again: the notice; its tags are back (Rule 15).
        expect(await scholar.setEnabled(true)).toBeNull();
        await expect(scholar.notice(X.enabledNotice(X.plugins.googleScholar))).toBeVisible();
        const gsBack = await readSource(visitor, bookPage);
        expect(metaContents(gsBack, 'gs_meta_revision')).toEqual(['1.1']);
        expect(metaContents(gsBack, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(gsBack, 'citation_reference')).toHaveLength(2);
    });

    test("S7: An earlier version's page", async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        await seedPress(ompApi, tag);
        const {submissionId: bookId} = await seedBook(ompApi, tag, 'Tidal Patterns', {published: true, publicationFormats: PDF_FORMAT});
        const bookPage = bookPath(tag, bookId);
        const page = await actorPage(asUser, `${tag}mg`);

        // Control: before the new version is published, "citation_title"
        // and "DC.Title" read "Tidal Patterns" (Rule 12).
        const first = await readSource(visitor, bookPage);
        expect(metaContents(first, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(first, 'DC.Title')).toEqual(['Tidal Patterns']);

        // A new version: created, retitled "Tidal Patterns Revisited",
        // saved, published (U49 scenarios 4, 5).
        await openWorkflow(page, tag, bookId);
        await openPublicationPage(page, 'Title & Abstract');
        await expectStatus(page, 'Published');
        const newPubId = await createVersion(page, tag);
        await openWorkflow(page, tag, bookId, {menuKey: `publication_${newPubId}_titleAbstract`});
        await expect(page.getByRole('heading', {name: 'Publication: Title & Abstract'})).toBeVisible({timeout: 30_000});
        await expectStatus(page, 'Unpublished');
        await setRichText(page, 'titleAbstract-title-control-en', 'Tidal Patterns Revisited');
        await savePublicationForm(page);
        await publishShown(page);

        // The current page: "citation_title" and "DC.Title" read "Tidal
        // Patterns Revisited" (Rule 12).
        const current = await readSource(visitor, bookPage);
        expect(metaContents(current, 'citation_title')).toEqual(['Tidal Patterns Revisited']);
        expect(metaContents(current, 'DC.Title')).toEqual(['Tidal Patterns Revisited']);
        expect(metaContents(current, 'robots')).toEqual([]);

        // The earlier version's page, by its link under "Versions": no
        // "citation_" and no "DC." tag, "robots" "noindex", and a
        // "canonical" link to the current page (Rule 13).
        const versionLink = visitor.locator('.versions li').filter({hasText: 'Version of Record 1.0'}).getByRole('link');
        await expect(versionLink).toHaveCount(1);
        const navigated = visitor.waitForResponse((r) => r.request().isNavigationRequest() && r.request().frame() === visitor.mainFrame());
        await versionLink.click();
        const earlier = await sourceOf(visitor, await navigated);
        expect(earlier.status).toBe(200);
        expect(pathOf(earlier.url)).toMatch(new RegExp(`/catalog/book/${bookId}/version/\\d+$`));
        expect(metasMatching(earlier, /^citation_/)).toEqual([]);
        expect(metasMatching(earlier, /^DC\./)).toEqual([]);
        expect(metaContents(earlier, 'robots')).toEqual(['noindex']);
        expect(linksOf(earlier, 'canonical').map((l) => pathOf(l.href))).toEqual([bookPage]);
        expect(metaContents(earlier, 'generator')).toHaveLength(1);

        // The earlier version's file page: the "PDF" format's link on that
        // page; its source carries no "DC." tag and no "robots" tag, beside
        // its generator tag (Rule 13).
        const oldFile = await openPdfFormat(visitor, bookId);
        expect(oldFile.status).toBe(200);
        expect(pathOf(oldFile.url)).toMatch(new RegExp(`/catalog/view/${bookId}/`));
        expect(metaContents(oldFile, 'generator')).toHaveLength(1);
        expect(metasMatching(oldFile, /^DC\./)).toEqual([]);
        expect(metaContents(oldFile, 'robots')).toEqual([]);
    });

    test('S8: "Google Analytics Plugin": the number and the script', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        await seedPress(ompApi, tag, {context: {name: `Tide Watch ${tag}`}});
        const {submissionId: bookId} = await seedBook(ompApi, tag, 'Tidal Patterns', {published: true});
        const page = await actorPage(asUser, `${tag}mg`);
        const analytics = new PluginRow(page, tag, PLUGIN_IDS.googleAnalytics);
        const google = await stubGoogle(visitor);
        const dialogs = [];
        page.on('dialog', (d) => {
            dialogs.push(d.message());
            d.dismiss().catch(() => {});
        });

        // Off on a new press: unticked under "Generic Plugins", no arrow for
        // "Settings" (a press's description is A2's, not read); the home
        // page holds no "googletagmanager" (Rules 18, 20).
        await analytics.goto();
        await expect(analytics.categoryHeading()).toHaveText('Generic Plugins');
        await expect(analytics.name).toHaveText(X.plugins.googleAnalytics);
        await expect(analytics.enabledBox).not.toBeChecked();
        await expect(analytics.arrow).toHaveCount(0);
        const off = await readSource(visitor, at(tag));
        expect(metaContents(off, 'generator')).toHaveLength(1);
        expect(off.body).not.toContain('googletagmanager');

        // Enabled: the notice; the row now has its arrow (Rule 15).
        expect(await analytics.setEnabled(true)).toBeNull();
        await expect(analytics.notice(X.enabledNotice(X.plugins.googleAnalytics))).toBeVisible();
        await expect(analytics.arrow).toHaveCount(1);

        // Control: ticked with no number saved, the home page still holds
        // no "googletagmanager" (Rule 19).
        const noNumber = await readSource(visitor, at(tag));
        expect(metaContents(noNumber, 'generator')).toHaveLength(1);
        expect(noNumber.body).not.toContain('googletagmanager');
        await expect(visitor.locator('.pkp_structure_main')).toBeVisible();
        expect(google.gtag, 'no request for the loader').toEqual([]);

        // The window: titled, its first paragraph, the box "Account
        // number" empty with no asterisk, then "Cancel" and "OK", above the
        // note on asterisks (Fields).
        let window = await analytics.openAnalyticsSettings();
        await expect(window.title).toHaveText(X.plugins.googleAnalytics);
        const paragraphs = await window.paragraphs();
        expect(paragraphs[0].startsWith(X.gaFirstParagraph), paragraphs[0]).toBe(true);
        await expect(window.numberBox).toHaveValue('');
        expect(flat(await window.numberLabel.innerText())).toBe(X.gaNumberLabel);
        await expect(window.requiredNote).toBeVisible();
        const order = await window.fieldOrder();
        const box = order.indexOf('[box]');
        expect(order.indexOf(paragraphs[0])).toBeLessThan(box);
        expect(box).toBeLessThan(order.indexOf('Cancel'));
        expect(order.indexOf('Cancel')).toBeLessThan(order.indexOf('OK'));
        expect(order.indexOf('OK')).toBeLessThan(order.indexOf(X.requiredNote));

        // An empty number: "This field is required." under the box, nothing
        // sent, the window stays (Fields; Rule 20).
        expect(await window.okStoppedInBrowser()).toBe(0);
        await expect(window.fieldError).toHaveText(X.required);
        await expect(window.numberBox).toBeVisible();

        // "Cancel": closes with no question; reopened, the box is empty (Rule 20).
        await window.numberBox.fill('G-CANCELLED1');
        await window.cancel();
        expect(dialogs).toEqual([]);
        window = await analytics.openAnalyticsSettings();
        await expect(window.numberBox).toHaveValue('');

        // A number saved as Google's snippet writes it: the window closes
        // with no message; reopened, the box reads the number alone
        // (Fields; Rule 20).
        await window.numberBox.fill("'G-TEST12345';");
        expect(await window.okAccepted()).toBe(200);
        await expect(page.locator('.pkpNotification').filter({hasText: /saved/i})).toHaveCount(0);
        await expect(analytics.notice(X.enabledNotice(X.plugins.googleAnalytics))).toBeAttached();
        window = await analytics.openAnalyticsSettings();
        await expect(window.numberBox).toHaveValue('G-TEST12345');
        await window.cancel();
        expect(dialogs).toEqual([]);

        // The script: the home page and the book's page each hold the
        // loader's address and the number, and the browser asks Google for
        // the script with the number (answered on the machine by the stub);
        // the page shows neither (Rule 19; Side effects).
        for (const path of [at(tag), bookPath(tag, bookId)]) {
            google.gtag.length = 0;
            const source = await readSource(visitor, path);
            expect(source.status, path).toBe(200);
            expect(source.body, path).toContain(X.gtagScript);
            expect(source.body, path).toContain("'G-TEST12345'");
            await expect.poll(() => google.gtag, {timeout: 30_000}).toContain(`${X.gtagScript}G-TEST12345`);
            await expect(visitor.locator('.pkp_structure_main')).toBeVisible();
            await expect(visitor.locator('body')).not.toContainText('G-TEST12345');
        }

        // Pages without it: the Dashboard, Settings › Website and the
        // site's home page hold no "googletagmanager", beside their
        // generator tags (Rule 19).
        for (const [reader, path] of [
            [page, at(tag, '/dashboard')],
            [page, at(tag, '/management/settings/website')],
            [visitor, '/index.php/index'],
        ]) {
            const source = await readSource(reader, path);
            expect(metaContents(source, 'generator'), path).toHaveLength(1);
            expect(source.body, path).not.toContain('googletagmanager');
        }

        // Disabled again: the "Disable" window, "OK", the notice, no arrow;
        // the home page holds no "googletagmanager" (Rules 15, 21).
        await analytics.goto();
        expect(await analytics.setEnabled(false)).toEqual({title: X.disableTitle, question: X.disableQuestion});
        await expect(analytics.notice(X.disabledNotice(X.plugins.googleAnalytics))).toBeVisible();
        await expect(analytics.arrow).toHaveCount(0);
        const disabled = await readSource(visitor, at(tag));
        expect(metaContents(disabled, 'generator')).toHaveLength(1);
        expect(disabled.body).not.toContain('googletagmanager');

        // Enabled again: the window reads the kept number; the home page
        // holds the script with it again (Rules 19, 21).
        expect(await analytics.setEnabled(true)).toBeNull();
        window = await analytics.openAnalyticsSettings();
        await expect(window.numberBox).toHaveValue('G-TEST12345');
        await window.cancel();
        const again = await readSource(visitor, at(tag));
        expect(again.body).toContain(X.gtagScript);
        expect(again.body).toContain("'G-TEST12345'");
    });
});
