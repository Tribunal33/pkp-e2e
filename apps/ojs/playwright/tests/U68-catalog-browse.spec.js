// @ts-check
/**
 * @file playwright/tests/U68-catalog-browse.spec.js
 *
 * Catalog browse — OJS suite. A journal does not install the catalog (the
 * spec's title badge is {OMP}), so the journal runs the one scenario
 * written for it, S7 "No catalog on a journal or a preprint server"
 * {OJS OPS}: the absence test with a positive control per assertion
 * (RUNBOOK multi-app rule 3), in the journal's own words: the catalog's
 * three addresses typed on the journal, and the Navigation tab's "Add
 * item" window. S1–S6 are the press's, in its tree.
 * Spec: docs/specs/U68-catalog-browse.md
 *
 * The spec's control is taken on the seeded press, which the OJS fleet does
 * not serve (a CI job installs one app); that half (the press's catalog,
 * "Monographs" series and "New Releases" pages, and its "Catalog", "New
 * Releases" and "Series" item types) is left to the press's tree. Here each
 * absence is paired with what the journal offers in the same place, read
 * the same way: the journal's "Archives" page (issue/archive) typed the
 * same way, signed out and as the Journal Manager (the absence paragraph:
 * a journal lists its published work by issue in its archive), and the
 * same "Navigation Menu Type" list offering "Archives" and "Current Issue".
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - every register entry (A1–A12): all on the press's catalog pages, its
 *   "Browse" block or its Navigation tab's press-only item types, which a
 *   journal does not have.
 *
 * Seeding: none. The seeded journal publicknowledge and the seeded Journal
 * Manager are read-only here (footnote s); the "Add item" window is closed
 * with nothing saved. The visitor is a browser context with no session.
 *
 * Each typed address is read from its response status and its heading,
 * paired with the archive's address typed the same way. The type list is
 * read once the item window's form has loaded (ItemWindow.waitOpen), as
 * data and by locator, the missing types paired with the journal's own in
 * the same list (M4, M6). Waits are web-first (A5). Runs in the parallel
 * `ojs` project: nothing here changes the journal.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {NavigationTab, whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {IssueReader} = require('../../../../shared/playwright/pages/IssuesPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');

const JOURNAL = 'publicknowledge';
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
 * journal's "Archives" address, typed the same way, opens its page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} who
 */
async function expectNoCatalogAddresses(page, who) {
    const reader = new IssueReader(page, JOURNAL);
    for (const path of CATALOG_PATHS) {
        const response = await reader.goto(path);
        expect(response && response.status(), `${path} answered ${who}`).toBe(404);
        await expect(page.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});
        // A bare page: no journal header, no Login page.
        await expect(page.locator('.pkp_structure_head')).toHaveCount(0);
        await expect(new LoginPage(page).form).toHaveCount(0);
    }

    // Control: the journal's own list of its published work, typed the
    // same way, opens with its header and heading.
    const archive = await reader.goto('issue/archive');
    expect(archive && archive.status(), `issue/archive answered ${who}`).toBe(200);
    await expect(reader.heading()).toHaveText(whole('Archives'), {timeout: T});
    await expect(page.locator('.pkp_structure_head')).toHaveCount(1);
    await expect(reader.headerLink('Archives')).toBeVisible();
}

test.describe('Catalog browse', () => {
    test('S7: no catalog on a journal', async ({asUser, visitor}) => {
        // The catalog's addresses, signed out (Purpose, the absence
        // paragraph; footnote td1).
        await expectNoCatalogAddresses(visitor, 'the visitor');

        // The Journal Manager, signed in, gets the same.
        const page = await (await asUser('manager.maya')).newPage();
        await expectNoCatalogAddresses(page, 'the Journal Manager');

        // The Navigation tab: "Add item" offers no "Catalog", "New
        // Releases" or "Series" (Purpose, the absence paragraph). Read once
        // the window's form has loaded, as data and by locator.
        const nav = new NavigationTab(page, JOURNAL, {locale: LOCALE});
        await nav.goto();
        const item = await nav.addItem();
        const options = item.typeSelect.locator('option');
        const types = (await options.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
        for (const type of PRESS_TYPES) {
            expect(types, `the type list offers "${type}"`).not.toContain(type);
            await expect(options.filter({hasText: whole(type)})).toHaveCount(0);
        }

        // Control: the same list, read the same way, offers the journal's
        // own "Archives" and "Current Issue", and "Archives" can be chosen.
        for (const type of ['Archives', 'Current Issue']) {
            expect(types, `the type list offers "${type}"`).toContain(type);
            await expect(options.filter({hasText: whole(type)})).toHaveCount(1);
        }
        await item.chooseType('Archives');
        await expect(item.typeSelect.locator('option:checked')).toHaveText(whole('Archives'));

        // Close with nothing saved.
        await item.close();
    });
});
