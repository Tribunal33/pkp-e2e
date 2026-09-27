// @ts-check
/**
 * @file playwright/tests/U68-catalog-browse.spec.js
 *
 * Catalog browse — OPS suite. A preprint server does not install the
 * catalog (the spec's title badge is {OMP}), so the server runs the one
 * scenario written for it, S7 "No catalog on a journal or a preprint
 * server" {OJS OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the server's own words: the
 * catalog's three addresses typed on the server, and the Navigation tab's
 * "Add item" window. S1–S6 are the press's, in its tree.
 * Spec: docs/specs/U68-catalog-browse.md
 *
 * The spec's control is taken on the seeded press, which the OPS fleet does
 * not serve (a CI job installs one app); that half (the press's catalog,
 * "Monographs" series and "New Releases" pages, and its "Catalog", "New
 * Releases" and "Series" item types) is left to the press's tree. Here each
 * absence is paired with what the server offers in the same place, read
 * the same way: the server's "Archives" page (preprints) typed the same
 * way, signed out and as the Preprint Server Manager (the absence
 * paragraph: a preprint server lists its posted preprints in its
 * "Archives" list), and the same "Navigation Menu Type" list offering
 * "Archives".
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - every register entry (A1–A12): all on the press's catalog pages, its
 *   "Browse" block or its Navigation tab's press-only item types, which a
 *   preprint server does not have.
 *
 * Seeding: none. The seeded server publicknowledge and the seeded
 * Preprint Server Manager are read-only here (footnote s); the "Add item"
 * window is closed with nothing saved. The visitor is a browser context
 * with no session.
 *
 * Each typed address is read from its response status and its heading,
 * paired with the "Archives" address typed the same way. The type list is
 * read once the item window's form has loaded (ItemWindow.waitOpen), as
 * data and by locator, the missing types paired with the server's own in
 * the same list (M4, M6). Waits are web-first (A5). Runs in the parallel
 * `ops` project: nothing here changes the server.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {NavigationTab, whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {ArchivePage} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');

const SERVER = 'publicknowledge';
/** publicknowledge is bilingual, so its settings addresses carry the /en prefix. */
const LOCALE = 'en';
const T = 30_000;

/** The catalog's three addresses, as the scenario types them. */
const CATALOG_PATHS = ['catalog', 'catalog/newReleases', 'catalog/series/monographs'];
/** The press-only item types the scenario names. */
const PRESS_TYPES = ['Catalog', 'New Releases', 'Series'];

/** A visitor's page: a second browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({
            baseURL,
            storageState: {cookies: [], origins: []},
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/**
 * The catalog's three addresses answer the bare not-found page; the
 * server's "Archives" address, typed the same way, opens its page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} who
 */
async function expectNoCatalogAddresses(page, who) {
    for (const path of CATALOG_PATHS) {
        const response = await page.goto(`/index.php/${SERVER}/${path}`);
        expect(response && response.status(), `${path} answered ${who}`).toBe(404);
        await expect(page.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});
        // A bare page: no server header, no Login page.
        await expect(page.locator('.pkp_structure_head')).toHaveCount(0);
        await expect(new LoginPage(page).form).toHaveCount(0);
    }

    // Control: the server's own list of its posted preprints, typed the
    // same way, opens with its header and heading.
    const archive = new ArchivePage(page, SERVER);
    const response = await archive.goto();
    expect(response && response.status(), `preprints answered ${who}`).toBe(200);
    await expect(archive.heading()).toHaveText(whole('Archives'), {timeout: T});
    await expect(page.locator('.pkp_structure_head')).toHaveCount(1);
    await expect(archive.menuLink()).toBeVisible();
}

test.describe('Catalog browse', () => {
    test('S7: no catalog on a preprint server', async ({asUser, visitor}) => {
        // The catalog's addresses, signed out (Purpose, the absence
        // paragraph; footnote td1).
        await expectNoCatalogAddresses(visitor, 'the visitor');

        // The Preprint Server Manager, signed in, gets the same.
        const page = await (await asUser('manager.maya')).newPage();
        await expectNoCatalogAddresses(page, 'the Preprint Server Manager');

        // The Navigation tab: "Add item" offers no "Catalog", "New
        // Releases" or "Series" (Purpose, the absence paragraph). Read once
        // the window's form has loaded, as data and by locator.
        const nav = new NavigationTab(page, SERVER, {locale: LOCALE});
        await nav.goto();
        const item = await nav.addItem();
        const options = item.typeSelect.locator('option');
        const types = (await options.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
        for (const type of PRESS_TYPES) {
            expect(types, `the type list offers "${type}"`).not.toContain(type);
            await expect(options.filter({hasText: whole(type)})).toHaveCount(0);
        }

        // Control: the same list, read the same way, offers the server's
        // own "Archives", and it can be chosen.
        expect(types, 'the type list offers "Archives"').toContain('Archives');
        await expect(options.filter({hasText: whole('Archives')})).toHaveCount(1);
        await item.chooseType('Archives');
        await expect(item.typeSelect.locator('option:checked')).toHaveText(whole('Archives'));

        // Close with nothing saved.
        await item.close();
    });
});
