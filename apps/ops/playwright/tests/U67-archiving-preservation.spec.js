// @ts-check
/**
 * @file playwright/tests/U67-archiving-preservation.spec.js
 *
 * Archiving & preservation — OPS suite. A preprint server does not install
 * archiving (the spec's title badge is {OJS}), so the server runs the one
 * scenario written for it, S4 "No archiving on a press or a preprint
 * server" {OMP OPS}, its preprint-server half: the absence test with a
 * positive control per assertion (RUNBOOK multi-app rule 3), in the
 * server's own words: the Preprint Server Manager's Settings ›
 * Distribution tab row, and the server's and the site's gateway
 * addresses. S1–S3 are the journal's, in its tree; S4's press half is the
 * OMP suite's.
 * Spec: docs/specs/U67-archiving-preservation.md
 *
 * The spec's control (a journal's Settings › Distribution holding
 * "Archiving", its LOCKSS address landing on its home page, the OJS site's
 * list headed "Archive of Published Issues") is taken on a scratch journal,
 * which the OPS fleet does not serve (a CI job installs one app); it runs
 * in the OJS suite. Here each absence is paired with what the server
 * offers in the same place, read the same way: the missing "Archiving" tab
 * beside the server's own five tabs of the same row, each pressed open;
 * the journal's address for the tab (Distribution followed by "#archive",
 * typed) beside the server's first tab it falls back to; the "404 Not
 * Found" at the server's and the site's LOCKSS and CLOCKSS addresses
 * beside the same gateway answering the server's Atom feed, and the site's
 * gateway alone landing on the site's home page, opened the same way.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A4: all on a journal's manifest pages and "Archiving" tab, which a
 *   preprint server does not have.
 *
 * Seeding: none. The seeded server publicknowledge and the seeded
 * Preprint Server Manager (`manager.maya`) are only read, as footnote s
 * says; the `enableLockss` / `enableClockss` keys are OJS-only (a 400 on
 * OPS) and are not sent.
 *
 * The visitor is the fixture's own page, which carries no session in a
 * test that sets no `user`; the manager has its own `asUser` context. The
 * "404 Not Found" page is read by its status and heading
 * (expectNotFoundPage); the Distribution tab row web-first as a whole,
 * each missing tab or panel counted beside a present one read the same way
 * (M4, M6). Waits are web-first (A5). Runs in the parallel `ops` project:
 * nothing here changes the server or the site.
 */
const {test, expect} = require('../support/fixtures.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {expectNotFoundPage} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');

const SERVER = 'publicknowledge';
/** publicknowledge is bilingual, so its addresses carry the /en prefix. */
const LOCALE = 'en';
const T = 30_000;

/** The server's Distribution tabs, in page order (spec footnote a). */
const SERVER_TABS = ['License', 'DOIs', 'Search Indexing', 'Access', 'Statistics'];
/** The journal's "Archiving" tab and its two side tabs (spec, Fields). */
const ARCHIVING_TAB = 'Archiving';
const ARCHIVING_PANELS = ['PKP Preservation Network (PN)', 'LOCKSS and CLOCKSS'];
/** Words the journal's manifest pages and site list carry (spec, Fields; Rule 13). */
const MANIFEST_WORDS = ['Archive of Published Issues', 'Publisher Manifest', 'LOCKSS system has permission'];

const serverPath = (rest) => `/index.php/${SERVER}${rest}`;
const sitePath = (rest) => `/index.php/index${rest}`;

/**
 * The visitor opens an archiving address and meets the "404 Not Found"
 * page, with none of a manifest's words on it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
async function expectNoManifest(page, url) {
    await expectNotFoundPage(page, url);
    for (const words of MANIFEST_WORDS) {
        await expect(page.getByText(words), `${url}: "${words}"`).toHaveCount(0);
    }
}

test.describe('Archiving & preservation', () => {
    test('S4: no archiving on a preprint server', async ({page, asUser}) => {
        // --- Settings › Distribution (the Preprint Server Manager) ---------
        const managerPage = await (await asUser('manager.maya')).newPage();
        const settings = new SettingsPages(managerPage, SERVER, {locale: LOCALE});

        // None of its top tabs is "Archiving" (the absence paragraph). The
        // whole tab row is read web-first, so the read is settled before
        // any single tab is counted.
        await settings.goto('distribution');
        await expect(settings.topTabs).toHaveText(SERVER_TABS.map(whole), {timeout: T});
        await expect(settings.tab(ARCHIVING_TAB)).toHaveCount(0);
        await expect(settings.mainRegion.getByRole('tab', {name: /archiv|lockss|preservation/i})).toHaveCount(0);

        // Control: the server's own tabs in that row, read the same way,
        // each there once.
        for (const name of SERVER_TABS) {
            await expect(settings.mainRegion.getByRole('tab', {name, exact: true})).toHaveCount(1);
        }

        // No archiving panel either: pressing through the row opens each
        // tab's own panel, and none of them is the "Archiving" tab's, its
        // side tabs', or holds the "LOCKSS" and "CLOCKSS" boxes.
        for (const name of SERVER_TABS) {
            await settings.tab(name).click();
            await expect(settings.tab(name)).toHaveAttribute('aria-selected', 'true');
            await expect(settings.mainRegion.getByRole('tabpanel', {name, exact: true})).toBeVisible({timeout: T});
        }
        for (const name of [ARCHIVING_TAB, ...ARCHIVING_PANELS]) {
            await expect(settings.mainRegion.getByRole('tabpanel', {name, exact: true}), name).toHaveCount(0);
            await expect(settings.mainRegion.getByRole('tab', {name, exact: true}), name).toHaveCount(0);
        }
        await expect(managerPage.locator('input[name="enableLockss"], input[name="enableClockss"]')).toHaveCount(0);
        await expect(managerPage.getByText(/Publisher Manifest|PKP Preservation Network/)).toHaveCount(0);

        // Control: each panel's own first field, read by name the same way.
        for (const field of ['copyrightHolderType', 'enableDois', 'searchDescription-en', 'publishingMode', 'isSushiApiPublic']) {
            await expect(managerPage.locator(`input[name="${field}"], textarea[name="${field}"]`), field).not.toHaveCount(0);
        }

        // The journal's address for the tab, typed on the server
        // (Distribution followed by "#archive"), loaded fresh from another
        // page: the same five tabs, no "Archiving" among them and no panel
        // of it; the row opens on its first tab, "License" (the control,
        // read the same way; spec footnote a).
        await settings.goto('usersRoles');
        await settings.goto('distribution', '#archive');
        await expect(settings.topTabs).toHaveText(SERVER_TABS.map(whole), {timeout: T});
        await expect(settings.tab('License')).toHaveAttribute('aria-selected', 'true');
        await expect(settings.mainRegion.getByRole('tabpanel', {name: 'License', exact: true})).toBeVisible({timeout: T});
        await expect(settings.tab(ARCHIVING_TAB)).toHaveCount(0);
        for (const name of [ARCHIVING_TAB, ...ARCHIVING_PANELS]) {
            await expect(settings.mainRegion.getByRole('tabpanel', {name, exact: true}), name).toHaveCount(0);
        }
        await expect(managerPage.locator('input[name="enableLockss"], input[name="enableClockss"]')).toHaveCount(0);
        await expect(managerPage.locator('input[name="copyrightHolderType"]')).not.toHaveCount(0);

        // --- The server's addresses (the visitor, signed out) --------------
        // {server address}/gateway/lockss and /gateway/clockss answer
        // "404 Not Found" (the absence paragraph).
        await expectNoManifest(page, serverPath('/gateway/lockss'));
        await expectNoManifest(page, serverPath('/gateway/clockss'));

        // Control: the same gateway of the same server, opened the same
        // way, answers: its Atom feed with the server's name, and the
        // gateway alone lands on the server's home page.
        const feed = await page.goto(serverPath('/gateway/plugin/WebFeedGatewayPlugin/atom'));
        expect(feed && feed.status(), 'the server\'s Atom feed answers').toBe(200);
        expect(await feed.text()).toContain('<feed');
        const home = await page.goto(serverPath('/gateway'));
        expect(home && home.status(), 'the server\'s gateway answers').toBe(200);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${SERVER}/${LOCALE}/index$`));
        await expect(page.getByRole('heading', {name: '404 Not Found', exact: true})).toHaveCount(0);
        await expect(page.locator('.pkp_structure_page')).toBeVisible({timeout: T});

        // --- The site's addresses (the visitor, signed out) ----------------
        // {site address}/gateway/lockss and /gateway/clockss answer
        // "404 Not Found": no site list of archived servers (the absence
        // paragraph).
        await expectNoManifest(page, sitePath('/gateway/lockss'));
        await expectNoManifest(page, sitePath('/gateway/clockss'));

        // Control: the site's gateway alone, opened the same way, answers
        // and lands on the site's home page.
        const siteHome = await page.goto(sitePath('/gateway'));
        expect(siteHome && siteHome.status(), 'the site\'s gateway answers').toBe(200);
        await expect(page).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/index$/);
        await expect(page.getByRole('heading', {name: '404 Not Found', exact: true})).toHaveCount(0);
        await expect(page.locator('.pkp_structure_page')).toBeVisible({timeout: T});
    });
});
