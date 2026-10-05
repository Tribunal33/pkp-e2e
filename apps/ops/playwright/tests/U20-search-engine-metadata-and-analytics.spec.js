// @ts-check
/**
 * @file playwright/tests/U20-search-engine-metadata-and-analytics.spec.js
 *
 * Search-engine metadata & analytics — OPS suite, one test per canonical
 * scenario as a preprint server runs it: S1–S8, all common to the three
 * apps. The server's vocabulary throughout: a posted preprint is the
 * item, its page `preprint/view/{id}`, the Preprint Server Manager the
 * "Journal Manager", "Unpost"/"Post" the workflow's unpublish and
 * publish, "Server Settings" the Settings Wizard's first tab, "…of the
 * server…" the "Description" help. The {OPS} bullets run inline ("Search"
 * and the posted preprint's page in the sitemap, "citation_publisher" and
 * "citation_online_date", the Plugins list with no "Dublin Core Indexing
 * Plugin" and the preprint's page with no "DC." tag, "Unpost" and "Post"
 * again in S2); the {OJS} and {OMP} bullets (issues, "Future Tides",
 * books, formats, file pages, Dublin Core off and on) cost the server
 * nothing: it has no issues, no books and no Dublin Core plugin.
 * Spec: docs/specs/U20-search-engine-metadata-and-analytics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OPS1 🐞: no preprint carries a "URL Path", so no HTML full-text tag of
 *   one is read.
 * - A1 🐞, A5 🐞, A6 🐞, A7 🐞: no description with a quote mark or
 *   markup, no expired announcement, no contributor without names in the
 *   submission's language, no "&" in an abstract.
 * - A2 🐞: S8 reads the window's first sentence only, never the
 *   description's "OJS" on a preprint server nor the "Check Status"
 *   paragraph.
 * - A3 ❓, A4 ❓: the site's own Plugins list is never opened; S1 reads the
 *   server's listing pages as the spec lists them.
 * - OJS1, OJS2 🐞, OMP1–OMP5 🐞: a journal's and a press's, in those suites.
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read (S4, signed out). Every other scenario
 * runs on its own scratch preprint servers, their paths the test's unique
 * tag, with throwaway accounts (the username twice as password): an
 * Author (Ada Author) who submits every preprint, a Preprint Server
 * Manager in S1, S2 and S5–S8, a Reader and a Preprint Server Manager in
 * S3. The Site Administrator of S5 is the installer's `admin`, whom every
 * scratch server enrols as a manager. No test passes `plugins`: the
 * plugins are as a new server has them and S6 and S8 change them on
 * screen; "Description", "Custom Tags" and the Google Analytics number are
 * typed on their own screens. S2's "Unpost" and "Post" again and S7's
 * second version are the workflow's own screens (no key makes them).
 * Every signed-in actor gets its own `asUser` context; the visitor is a
 * browser context with an empty storage state (patterns.md, parallel
 * lesson 8). A page's source is the navigation's raw answer (what "view
 * source" shows), and the sitemap is read the same way and taken apart;
 * the addresses both carry are built from the install's base URL, not the
 * worker's port, so every address is compared by its path. Every Settings
 * › Website › "Plugins" load fires the Plugin Gallery grid's server 500
 * (U62's finding): not asserted here. Every absence is read settled and
 * paired with a positive control taken the same way (M4, M6): a sitemap's
 * missing entries beside the entries it lists, a missing tag beside the
 * tags the same source carries or carried one step earlier, a missing row
 * beside the rows of the same category, a missing arrow beside the arrow
 * the same row shows once ticked. Everything here runs in the parallel
 * `ops` project: each test's settings and plugins are its own scratch
 * server's.
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
const {
    PublicationScreen,
    openWorkflow,
    openPublicationPage,
    createNewVersion,
    postPreprint,
    unpostPreprint,
    statusReadout,
} = require('../pages/PublicationPages.js');

const DESCRIPTION_HELP =
    'Provide a brief description (50-300 characters) of the server which search engines can display when listing the server in search results.';
const WIZARD_FIRST_TAB = 'Server Settings';
const GENERATOR = /^Open Preprint Systems \d+\.\d+\.\d+\.\d+$/;
const CUSTOM_TAG = '<meta name="u20-check" content="custom">';

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
    return `u20${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch preprint server with the throwaway Author (`${tag}au`, Ada
 * Author) and, with `manager`, a Preprint Server Manager (`${tag}mg`),
 * plus `extra` accounts and context keys. Returns the createContext answer.
 */
async function seedServer(opsApi, tag, {manager = true, extra = [], ...keys} = {}) {
    return opsApi.createContext({
        tag,
        users: [
            ...(manager ? [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])] : []),
            user(`${tag}au`, 'Ada', 'Author', ['author']),
            ...extra,
        ],
        ...keys,
    });
}

/** A preprint submitted by the server's Author; returns the submission answer ({submissionId, publicationId}). */
async function seedPreprint(opsApi, tag, title, extra = {}) {
    return opsApi.createSubmission({
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

/** A context's address (path) with an optional rest. */
function at(contextPath, rest = '') {
    return `/index.php/${contextPath}${rest}`;
}

/** A preprint's page (path). */
function preprintPath(contextPath, submissionId) {
    return at(contextPath, `/preprint/view/${submissionId}`);
}

test.describe('Search-engine metadata & analytics', () => {
    test("S1: A new journal's sitemap", async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        await seedServer(opsApi, tag);
        const page = await actorPage(asUser, `${tag}mg`);

        // The "sitemap" link: the tab's intro under "Search Indexing"; the
        // word "sitemap" opens the server's sitemap in a new tab (Rule 1;
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
        // "Contact", then a preprint server's "Search" (Rules 2, 3; Fields,
        // "What the sitemap lists").
        expect(sitemap.paths).toEqual([
            at(tag),
            at(tag, '/user/register'),
            at(tag, '/login'),
            at(tag, '/about/submissions'),
            at(tag, '/about/contact'),
            at(tag, '/search'),
        ]);

        // Control: no "About the Journal" entry, beside the About pages
        // it lists (Rule 3; Settings bullet 11).
        expect(sitemap.paths).toContain(at(tag, '/about/submissions'));
        expect(sitemap.paths).not.toContain(at(tag, '/about'));
    });

    test('S2: Published work and announcements in the sitemap', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const other = `${tag}b`;
        const context = await seedServer(opsApi, tag, {
            enableAnnouncements: true,
            announcements: [{title: 'Call for Papers'}],
        });
        const announcementId = context.announcements[0].id;
        const tidal = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        const {submissionId: draftId} = await seedPreprint(opsApi, tag, 'Draft Study');
        await seedServer(opsApi, other, {manager: false});
        const {submissionId: elsewhereId} = await seedPreprint(opsApi, other, 'Elsewhere', {published: true});
        const tidalPage = preprintPath(tag, tidal.submissionId);

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

        // Published work: the last entry opens the preprint's page of
        // "Tidal Patterns" (Rules 2, 4; Fields, "What the sitemap lists").
        expect(sitemap.paths[sitemap.paths.length - 1]).toBe(tidalPage);
        await visitor.goto(sitemap.paths[sitemap.paths.length - 1]);
        await expect(visitor.getByRole('heading', {name: 'Tidal Patterns', level: 1})).toBeVisible({timeout: 30_000});

        // Not in the sitemap: no entry opens "Draft Study", and none lies
        // under the second server's address (Rule 2), beside the preprint
        // it lists.
        for (const path of sitemap.paths) {
            expect(path, 'no entry of the draft').not.toMatch(new RegExp(`/preprint/view/${draftId}(/|$)`));
            expect(path, 'no entry under the second server').not.toMatch(new RegExp(`^/index\\.php/${other}(/|$)`));
        }
        expect(sitemap.paths.filter((p) => /\/preprint\/view\//.test(p))).toEqual([tidalPage]);

        // Unpublished: "Unpost" on the workflow; the reloaded sitemap lists
        // no entry of "Tidal Patterns", beside the entries it keeps (Rule 2).
        const page = await actorPage(asUser, `${tag}mg`);
        await openWorkflow(page, tag, tidal.submissionId);
        await expect(statusReadout(page)).toContainText('Posted', {timeout: 30_000});
        await unpostPreprint(page);
        await expect(statusReadout(page)).toContainText('Unposted', {timeout: 30_000});
        const unposted = await readSitemap(visitor, sitemapPath(tag));
        expect(unposted.status).toBe(200);
        expect(unposted.paths).toContain(at(tag, '/search'));
        expect(unposted.paths).toContain(at(tag, `/announcement/view/${announcementId}`));
        expect(unposted.paths.filter((p) => p.startsWith(tidalPage))).toEqual([]);
        expect(unposted.paths.filter((p) => /\/preprint\/view\//.test(p))).toEqual([]);

        // Published again: "Post" again; the entry of its page is back (Rule 2).
        await postPreprint(page);
        const reposted = await readSitemap(visitor, sitemapPath(tag));
        expect(reposted.status).toBe(200);
        expect(reposted.paths.filter((p) => /\/preprint\/view\//.test(p))).toEqual([tidalPage]);

        // Control: the second server's own sitemap lists the page of
        // "Elsewhere" (Rule 2).
        const second = await readSitemap(visitor, sitemapPath(other));
        expect(second.status).toBe(200);
        expect(second.paths[0]).toBe(at(other));
        expect(second.paths).toContain(preprintPath(other, elsewhereId));
    });

    test('S3: The site\'s index, and journals closed to visitors', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const open = `${tag}ow`;
        const members = `${tag}mo`;
        const hidden = `${tag}hb`;
        await seedServer(opsApi, open, {manager: false, context: {name: 'Open Waters'}});
        await seedServer(opsApi, members, {
            manager: false,
            context: {name: 'Members Only'},
            restrictSiteAccess: true,
            extra: [user(`${members}rd`, 'Rita', 'Reader', ['reader'])],
        });
        await seedServer(opsApi, hidden, {context: {name: 'Hidden Bay', enabled: false}});

        // The site's index: one sitemap address per server enabled
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

        // A server that requires sign-in: its sitemap lands on Login (Rule 6).
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

        // A server not enabled publicly: signed out, its sitemap lands on
        // Login, whose source carries "robots" "noindex,nofollow" (Rules 6, 11).
        await visitor.goto(at(members, '/login/signOut'));
        const hiddenOut = await readSource(visitor, sitemapPath(hidden));
        expect(pathOf(hiddenOut.url)).toMatch(new RegExp(`^/index\\.php/${hidden}/login`));
        await expect(login.form).toBeVisible({timeout: 30_000});
        expect(metaContents(hiddenOut, 'robots')).toEqual(['noindex,nofollow']);

        // Its Preprint Server Manager: the sitemap shows, home first; the
        // home page's and the Dashboard's sources carry the "robots" tag
        // (Rules 6, 11).
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

    test('S4: Two interface languages, and the software\'s name', async ({opsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        await seedServer(opsApi, tag, {manager: false});
        const pk = 'publicknowledge';

        // The English sitemap: every address carries "/en/" after the
        // server's address, none "/fr_CA/" (Rule 4; Settings bullet 14).
        const english = await readSitemap(visitor, at(pk, '/en/sitemap'));
        expect(english.status).toBe(200);
        expect(english.paths.length).toBeGreaterThan(3);
        for (const path of english.paths) {
            expect(path).toMatch(new RegExp(`^/index\\.php/${pk}/en(/|$)`));
            expect(path).not.toContain('/fr_CA');
        }

        // The French sitemap: every address carries "/fr_CA/", none "/en/" (Rule 4).
        const french = await readSitemap(visitor, at(pk, '/fr_CA/sitemap'));
        expect(french.status).toBe(200);
        expect(french.paths.length).toBeGreaterThan(3);
        for (const path of french.paths) {
            expect(path).toMatch(new RegExp(`^/index\\.php/${pk}/fr_CA(/|$)`));
            expect(path).not.toMatch(/\/en(\/|$)/);
        }

        // The alternate links: the home page in English carries one per
        // language and an "x-default" to the address with no language;
        // "About the Server" carries the same three, to itself (Rule 8).
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

        // The software's name: a "generator" tag naming Open Preprint
        // Systems on the home page, the server's Login page and the site's
        // home page (Rule 7).
        expect(metaContents(home, 'generator')).toHaveLength(1);
        expect(metaContents(home, 'generator')[0]).toMatch(GENERATOR);
        const loginPage = await readSource(visitor, at(pk, '/en/login'));
        expect(loginPage.status).toBe(200);
        expect(metaContents(loginPage, 'generator')[0]).toMatch(GENERATOR);
        const siteHome = await readSource(visitor, '/index.php/index');
        expect(siteHome.status).toBe(200);
        expect(pathOf(siteHome.url)).toMatch(/^\/index\.php\/index(\/en)?$/);
        expect(metaContents(siteHome, 'generator')[0]).toMatch(GENERATOR);

        // Control: the one-language scratch server's home page carries no
        // "alternate" language link, beside its generator tag (Rule 8).
        const scratch = await readSource(visitor, at(tag));
        expect(scratch.status).toBe(200);
        expect(metaContents(scratch, 'generator')[0]).toMatch(GENERATOR);
        expect(linksOf(scratch, 'alternate').filter((l) => l.hreflang)).toEqual([]);
    });

    test('S5: "Description" and "Custom Tags" on the journal\'s pages', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const name = `Still Water ${tag}`;
        await seedServer(opsApi, tag, {context: {name}});
        const {submissionId: preprintId} = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
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

        // The tab: both boxes empty; the help icon of "Description", which
        // speaks of the server (Fields).
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

        // Other public pages: the preprint's page and "About the Server"
        // carry the custom tag and show "Plain words" at the top, and carry
        // no "description" tag (Rules 9, 10).
        for (const path of [preprintPath(tag, preprintId), at(tag, '/about')]) {
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
        // side tab under "Server Settings" reads the description; replaced
        // and saved, the manager's tab and the home page's tag follow
        // (Rule 24; Actors row 4).
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

    test('S6: The indexing plugins\' tags on a published article', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        await seedServer(opsApi, tag, {context: {name: 'Sea Letters', acronym: 'SL'}});
        const {submissionId: preprintId} = await seedPreprint(opsApi, tag, 'Tidal Patterns', {
            abstract: 'Tides follow the moon.',
            citationsRaw: ['Moon, A. (2001). Tides.', 'Shore, B. (2010). Waves.'],
            datePublished: '2024-03-05',
            keywords: ['tides'],
            galleys: [{label: 'PDF', file: 'preprint.pdf'}],
            published: true,
        });
        const page = await actorPage(asUser, `${tag}mg`);
        const preprint = preprintPath(tag, preprintId);
        const scholar = new PluginRow(page, tag, PLUGIN_IDS.googleScholar);
        const analytics = new PluginRow(page, tag, PLUGIN_IDS.googleAnalytics);

        // Control: before the first change, "Generic Plugins" lists "Google
        // Scholar Indexing Plugin" ticked and "Google Analytics Plugin"
        // unticked (Fields, the three plugins).
        await scholar.goto();
        for (const row of [scholar, analytics]) {
            await expect(row.categoryHeading()).toHaveText('Generic Plugins');
        }
        await expect(scholar.name).toHaveText(X.plugins.googleScholar);
        await expect(analytics.name).toHaveText(X.plugins.googleAnalytics);
        await expect(scholar.enabledBox).toBeChecked();
        await expect(analytics.enabledBox).not.toBeChecked();

        // No Dublin Core: "Generic Plugins" lists no "Dublin Core Indexing
        // Plugin", beside the two rows it lists (Purpose, the absence
        // paragraph).
        const generic = scholar.sameCategoryRows();
        await expect(generic.filter({hasText: X.plugins.googleScholar})).toHaveCount(1);
        await expect(generic.filter({hasText: X.plugins.googleAnalytics})).toHaveCount(1);
        await expect(generic.filter({hasText: X.plugins.dublinCore})).toHaveCount(0);
        await expect(new PluginRow(page, tag, PLUGIN_IDS.dublinCore).row).toHaveCount(0);

        // Google Scholar's tags on the preprint's page, a preprint server's
        // "citation_publisher" and "citation_online_date" among them (Rule
        // 12; Fields, "What "Google Scholar Indexing Plugin" writes").
        const source = await readSource(visitor, preprint);
        expect(source.status).toBe(200);
        expect(metaContents(source, 'gs_meta_revision')).toEqual(['1.1']);
        expect(metaContents(source, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(source, 'citation_author')).toEqual(['Ada Author']);
        expect(metaContents(source, 'citation_language')).toEqual(['en']);
        expect(metaContents(source, 'citation_abstract')).toEqual(['Tides follow the moon.']);
        expect(metaContents(source, 'citation_reference')).toHaveLength(2);
        expect(metaContents(source, 'citation_publisher')).toEqual(['Sea Letters']);
        expect(metaContents(source, 'citation_online_date')).toEqual(['2024/03/05']);
        expect(metaContents(source, 'citation_keywords')).toEqual(['tides']);
        expect(metaContents(source, 'citation_abstract_html_url').map(pathOf)).toEqual([preprint]);
        expect(metaContents(source, 'citation_pdf_url')).toHaveLength(1);

        // No Dublin Core on the page: no "DC." tag and no Dublin Core
        // schema link, beside the "citation_" tags above (Purpose).
        expect(metasMatching(source, /^DC\./)).toEqual([]);
        expect(linksOf(source, 'schema.DC')).toEqual([]);

        // Google Scholar off: the "Disable" window, "OK", the notice; no
        // "gs_meta_revision" and no "citation_" tag, beside the page's
        // generator tag (Rule 15; Settings bullet 4).
        await scholar.goto();
        expect(await scholar.setEnabled(false)).toEqual({title: X.disableTitle, question: X.disableQuestion});
        await expect(scholar.notice(X.disabledNotice(X.plugins.googleScholar))).toBeVisible();
        const noGs = await readSource(visitor, preprint);
        expect(noGs.status).toBe(200);
        expect(metaContents(noGs, 'generator')).toHaveLength(1);
        expect(metaContents(noGs, 'gs_meta_revision')).toEqual([]);
        expect(metasMatching(noGs, /^citation_/)).toEqual([]);
        await expect(visitor.getByRole('heading', {name: 'Tidal Patterns', level: 1})).toBeVisible();

        // Google Scholar on again: the notice; its tags are back (Rule 15).
        expect(await scholar.setEnabled(true)).toBeNull();
        await expect(scholar.notice(X.enabledNotice(X.plugins.googleScholar))).toBeVisible();
        const gsBack = await readSource(visitor, preprint);
        expect(metaContents(gsBack, 'gs_meta_revision')).toEqual(['1.1']);
        expect(metaContents(gsBack, 'citation_title')).toEqual(['Tidal Patterns']);
        expect(metaContents(gsBack, 'citation_reference')).toHaveLength(2);
    });

    test("S7: An earlier version's page", async ({asUser, opsApi, visitor, appContext}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        await seedServer(opsApi, tag);
        const tidal = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        const preprint = preprintPath(tag, tidal.submissionId);
        const page = await actorPage(asUser, `${tag}mg`);

        // Control: before the new version is posted, "citation_title"
        // reads "Tidal Patterns" (Rule 12).
        const first = await readSource(visitor, preprint);
        expect(metaContents(first, 'citation_title')).toEqual(['Tidal Patterns']);

        // A new version: created, retitled "Tidal Patterns Revisited",
        // saved, posted (U49 scenarios 4, 5).
        const frame = new WorkflowPage(page, tag, {appContext, labels: {publicationGroup: 'Preprint'}});
        await openPublicationPage(page, tag, tidal.submissionId, tidal.publicationId);
        await frame.expectVersionLoaded();
        const created = await createNewVersion(page);
        await openPublicationPage(page, tag, tidal.submissionId, created.id);
        await frame.expectVersionLoaded();
        const screen = new PublicationScreen(page);
        await screen.fillRichText('titleAbstract', 'title', 'en', 'Tidal Patterns Revisited');
        await screen.save();
        await postPreprint(page);

        // The current page: "citation_title" reads "Tidal Patterns
        // Revisited"; no "robots" tag (Rule 12).
        const current = await readSource(visitor, preprint);
        expect(metaContents(current, 'citation_title')).toEqual(['Tidal Patterns Revisited']);
        expect(metaContents(current, 'robots')).toEqual([]);

        // The earlier version's page, by its link under "Versions": no
        // "citation_" and no "DC." tag, "robots" "noindex", and a
        // "canonical" link to the current page (Rule 13).
        const versionLink = visitor.locator('.item.published .sub_item.versions').getByRole('link');
        await expect(versionLink).toHaveCount(1);
        const navigated = visitor.waitForResponse((r) => r.request().isNavigationRequest() && r.request().frame() === visitor.mainFrame());
        await versionLink.click();
        const earlier = await sourceOf(visitor, await navigated);
        expect(earlier.status).toBe(200);
        expect(pathOf(earlier.url)).toMatch(new RegExp(`/preprint/view/${tidal.submissionId}/version/\\d+$`));
        expect(metasMatching(earlier, /^citation_/)).toEqual([]);
        expect(metasMatching(earlier, /^DC\./)).toEqual([]);
        expect(metaContents(earlier, 'robots')).toEqual(['noindex']);
        expect(linksOf(earlier, 'canonical').map((l) => pathOf(l.href))).toEqual([preprint]);
        expect(metaContents(earlier, 'generator')).toHaveLength(1);
    });

    test('S8: "Google Analytics Plugin": the number and the script', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        await seedServer(opsApi, tag, {context: {name: `Tide Watch ${tag}`}});
        const {submissionId: preprintId} = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        const page = await actorPage(asUser, `${tag}mg`);
        const analytics = new PluginRow(page, tag, PLUGIN_IDS.googleAnalytics);
        const google = await stubGoogle(visitor);
        const dialogs = [];
        page.on('dialog', (d) => {
            dialogs.push(d.message());
            d.dismiss().catch(() => {});
        });

        // Off on a new server: unticked under "Generic Plugins", no arrow
        // for "Settings"; the home page holds no "googletagmanager" (Rules
        // 18, 20). The description's "OJS" is A2's, not read here.
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

        // The script: the home page and the preprint's page each hold the
        // loader's address and the number, and the browser asks Google for
        // the script with the number (answered on the machine by the stub);
        // the page shows neither (Rule 19; Side effects).
        for (const path of [at(tag), preprintPath(tag, preprintId)]) {
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
