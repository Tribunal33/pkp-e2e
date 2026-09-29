// @ts-check
/**
 * @file playwright/tests/U67-archiving-preservation.spec.js
 *
 * Archiving & preservation — OMP suite. A press does not install this
 * feature (the spec's title badge is {OJS}), so the press runs the one
 * scenario written for it, S4 "No archiving on a press or a preprint
 * server" {OMP OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the press's own words: the
 * Press Manager on the seeded press, Settings › Distribution, the press's
 * and the site's gateway addresses read by a visitor, signed out. S1–S3
 * are the journal's, and S4's journal-side control (the "Archiving" tab,
 * the journal's LOCKSS address, the OJS site's "Archive of Published
 * Issues" list) is the OJS suite's; the controls below are taken on the
 * press's own screens, the same way as each absence.
 * Spec: docs/specs/U67-archiving-preservation.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞, A2 🐞, A3 🐞, A4 ❓: all on the journal's "Archiving" tab or its
 *   manifest pages, which a press does not have.
 *
 * Seeding: none. The seeded press `publicknowledge` and the seeded Press
 * Manager `manager.maya` are only read; the visitor is the fixture `page`,
 * which carries no session (no `test.use({user})` in this file).
 *
 * Each absence is read on a settled screen and paired with a control read
 * the same way (M4, M6): the top tabs of Settings › Distribution once the
 * "Search Indexing" tab has opened its form (SearchEngineMetadataPages'
 * navigation), its missing "Archiving" tab beside the tabs that are there,
 * all through the same tab list; the press's two addresses, whose bare
 * "404 Not Found" answer is paired with the press's home page and its web
 * feed address on the same gateway, each opened by the same visitor; the
 * site's two addresses, paired with the site's home page listing the
 * press. The pages read are server-rendered, complete once the navigation
 * has answered. Waits are web-first (A5). Runs in the parallel `omp`
 * project: nothing here changes the press or the site.
 */
const {test, expect} = require('../support/fixtures.js');
const {DistributionSettings} = require('../../../../shared/playwright/pages/SearchEngineMetadataPages.js');

const T = 30_000;
const PRESS = 'publicknowledge';
/** The seeded press's name, as its home page and the site's list print it. */
const PRESS_NAME = 'Public Knowledge Press';
const SITE = 'index';
/** The press's tabs on Settings › Distribution that are there (the control). */
const PRESS_TABS = ['License', 'DOIs', 'Search Indexing', 'Payments', 'Statistics'];
const NETWORKS = ['lockss', 'clockss'];

/** Whole-text match, whitespace-tolerant. */
function whole(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** A context's gateway address as a visitor types it (no language segment). */
function gatewayAddress(contextPath, which) {
    return `/index.php/${contextPath}/gateway/${which}`;
}

/** Open an address and read the bare "404 Not Found" page: the status, the words, nothing else. */
async function expectBare404(page, url) {
    const response = await page.goto(url);
    expect(response && response.status(), url).toBe(404);
    await expect(page.locator('h1')).toHaveText(whole('404 Not Found'));
    await expect(page.locator('body')).toHaveText(whole('404 Not Found'));
}

/** The top tab list of Settings › Distribution (the first tab list on the page). */
function topTabs(page) {
    return page.getByRole('tablist').first().getByRole('tab');
}

test.describe('archiving & preservation', () => {
    test('S4: no archiving on a press', async ({page, asUser}) => {
        test.setTimeout(120_000);

        // Settings › Distribution: the Press Manager opens it; none of its
        // top tabs is "Archiving" (the absence paragraph). Control: the
        // same tab list, read once "Search Indexing" has opened its form,
        // holds the press's tabs, "Search Indexing" selected.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const distribution = new DistributionSettings(managerPage, PRESS);
        await distribution.openSearchIndexing();
        await expect(managerPage.getByRole('heading', {name: 'Distribution Settings', level: 1})).toBeVisible();
        const tabs = topTabs(managerPage);
        await expect(tabs.filter({hasText: 'Search Indexing'})).toHaveAttribute('aria-selected', 'true');
        await expect(tabs).toHaveCount(PRESS_TABS.length);
        expect((await tabs.allInnerTexts()).map((t) => t.trim()).sort()).toEqual([...PRESS_TABS].sort());
        await expect(tabs.filter({hasText: 'Archiving'})).toHaveCount(0);
        await expect(managerPage.getByRole('tab', {name: 'Archiving', exact: true})).toHaveCount(0);
        await expect(managerPage.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true})).toHaveCount(0);
        await expect(managerPage.getByRole('tabpanel', {name: 'LOCKSS and CLOCKSS'})).toHaveCount(0);

        // The press's addresses: the visitor, signed out, opens
        // {press address}/gateway/lockss and …/clockss: each answers "404
        // Not Found" (the absence paragraph). Control: the same visitor
        // opens the press's home page, which shows the press, and the
        // press's web feed address on the same gateway, which answers.
        for (const which of NETWORKS) {
            await expectBare404(page, gatewayAddress(PRESS, which));
        }
        const home = await page.goto(`/index.php/${PRESS}`);
        expect(home && home.status()).toBe(200);
        await expect(page).toHaveTitle(whole(PRESS_NAME));
        await expect(page.locator('.pkp_site_name').getByRole('link', {name: PRESS_NAME, exact: true})).toBeVisible();
        const feed = await page.goto(`/index.php/${PRESS}/gateway/plugin/WebFeedGatewayPlugin/atom`);
        expect(feed && feed.status()).toBe(200);
        expect(await feed?.text()).toContain(`<title>${PRESS_NAME}</title>`);

        // The site's addresses: the visitor opens {site address}/gateway/lockss
        // and …/clockss: each answers "404 Not Found" (the absence
        // paragraph). Control: the same visitor opens the site's home page,
        // which answers and lists the press.
        for (const which of NETWORKS) {
            await expectBare404(page, gatewayAddress(SITE, which));
        }
        const site = await page.goto(`/index.php/${SITE}`);
        expect(site && site.status()).toBe(200);
        await expect(page.getByRole('heading', {name: PRESS_NAME, exact: true, level: 3}).first()).toBeVisible({timeout: T});
    });
});
