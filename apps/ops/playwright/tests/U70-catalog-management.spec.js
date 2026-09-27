// @ts-check
/**
 * @file playwright/tests/U70-catalog-management.spec.js
 *
 * Catalog management — OPS suite. A preprint server does not install
 * catalog management (the spec's title badge is {OMP}), so the server runs
 * the one scenario written for it, S7 "No catalog on a journal or a
 * preprint server" {OJS OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the server's own words: the
 * Preprint Server Manager's side menu, the Catalog page's address typed on
 * the server, a posted preprint's workflow. S1–S6 are the press's, in its
 * tree.
 * Spec: docs/specs/U70-catalog-management.md
 *
 * The spec's control is taken on the seeded press, which the OPS fleet does
 * not serve (a CI job installs one app); that half ("Content" › "Catalog",
 * the press's "manageCatalog" opening "Catalog", "Catalog Entry" and the
 * "Catalog Management" notice on a published book) is left to the press's
 * tree. Here each absence is paired with what the server offers in the
 * same place, read the same way: the side menu has no "Content" group at
 * all, so the control is the menu's whole group list and the "Published"
 * line of "Editor Dashboard" (the posted preprints), whose page opens; the
 * DOIs page's own address ("dois", a side-menu page of the manager) typed
 * the same way; the version's "Preprint entry" page and the Production
 * stage's "Submission published." status (the absence paragraph: a
 * preprint server places a preprint on its "Preprint entry" page).
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - every register entry: all on the press's Catalog page, its "Catalog
 *   Entry" page or its "Catalog Management" notice, which a preprint
 *   server does not have.
 *
 * Seeding: one posted preprint of `author.alex` on the seeded server
 * (scenario endpoint, `published: true`), footnote s. The seeded server
 * publicknowledge and the seeded Preprint Server Manager are otherwise
 * read-only; the visitor is a browser context with no session.
 *
 * The side menu is read once it has rendered its first group (a settled
 * read), as data and by locator, the missing "Content" group and "Catalog"
 * line paired with the whole group list and "Published" in the "Editor
 * Dashboard" group read the same ways, whose page then opens. The typed
 * address is read from its response and its heading, paired with the DOIs
 * page's address typed the same way. The version's pages are read once
 * the menu has drawn (WorkflowPage.menuEntries waits for it), the missing
 * "Catalog Entry" paired with "Preprint entry" in the same list; the
 * missing notice is read once the Production stage's status box has
 * rendered (M4, M6). Waits are web-first (A5). Runs in the parallel `ops`
 * project: nothing here changes the server.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {EditorialChrome, whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {DoisPage} = require('../../../../shared/playwright/pages/DoisPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const SERVER = 'publicknowledge';
/** publicknowledge is bilingual, so its addresses carry the /en prefix. */
const LOCALE = 'en';
const T = 30_000;

/** The Preprint Server Manager's side-menu groups (footnote td1). */
const MANAGER_GROUPS = ['Editor Dashboard', 'Start A New Submission', 'DOIs', 'Settings', 'Statistics', 'Tools'];

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u70${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A side-menu line by its label, whether its group is open or closed. */
const sideLine = (ed, label) => ed.sideNav.locator(`[role="treeitem"][aria-label="${label}"]`);

/** A side-menu group's header by its label, whether open or closed. */
const sideHeader = (ed, label) => ed.sideNav.locator(`[data-pc-section="header"][aria-label="${label}"]`);

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

test.describe('Catalog management', () => {
    test('S7: no catalog on a preprint server', async ({asUser, visitor, opsApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            published: true,
        });

        // The side menu: the Preprint Server Manager's side menu has no
        // "Content" group, and no "Catalog" anywhere (Purpose, the absence
        // paragraph). Read once the menu has rendered its first group, as
        // data (every group's lines are in the DOM whether open or closed)
        // and by locator on the groups and lines, hidden ones included.
        const page = await (await asUser('manager.maya')).newPage();
        const ed = new EditorialChrome(page);
        await page.goto(`/index.php/${SERVER}/${LOCALE}/submissions`);
        await ed.waitSideMenu();
        const side = await ed.sideMenu();
        const labels = side.map((e) => e.label);
        const lines = side.flatMap((e) => e.items.map((i) => i.label));
        expect(labels).not.toContain('Content');
        expect(labels).not.toContain('Catalog');
        expect(lines).not.toContain('Catalog');
        await expect(ed.sideEntry('Content')).toHaveCount(0);
        await expect(sideHeader(ed, 'Content')).toHaveCount(0);
        await expect(ed.sideEntry('Catalog')).toHaveCount(0);
        await expect(sideLine(ed, 'Catalog')).toHaveCount(0);

        // Control: the same menu, read the same ways, holds the server's
        // own groups, "Editor Dashboard" among them with its "Published"
        // line (the posted preprints), whose page opens.
        expect(labels).toEqual(MANAGER_GROUPS);
        expect(side.find((e) => e.label === 'Editor Dashboard')?.items.map((i) => i.label)).toContain('Published');
        await expect(ed.sideEntry('Editor Dashboard')).toHaveCount(1);
        await expect(sideHeader(ed, 'Editor Dashboard')).toHaveCount(1);
        await expect(sideLine(ed, 'Published')).toHaveCount(1);
        await ed.chooseSideEntry('Editor Dashboard', 'Published');
        await expect(page).toHaveURL(/currentViewId=published/, {timeout: T});
        await expect(page.getByRole('heading', {level: 1})).toHaveText(/^Published \(\d+\)/, {timeout: T});

        // The Catalog page's address: the server's address followed by
        // "manageCatalog" answers with a not-found page for the Preprint
        // Server Manager (Purpose, the absence paragraph).
        const signedIn = await page.goto(`/index.php/${SERVER}/manageCatalog`);
        expect(signedIn && signedIn.status(), 'manageCatalog answered the Preprint Server Manager').toBe(404);
        await expect(page.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});

        // Control: the DOIs page's address, typed the same way, opens the
        // page for the Preprint Server Manager.
        const dois = new DoisPage(page, SERVER);
        const doisPage = await page.goto(dois.url());
        expect(doisPage && doisPage.status(), 'dois answered the Preprint Server Manager').toBe(200);
        await expect(dois.heading()).toBeVisible({timeout: T});

        // The same address for the visitor: a not-found page too, not the
        // Login page a management page sends a visitor to.
        const signedOut = await visitor.goto(`/index.php/${SERVER}/manageCatalog`);
        expect(signedOut && signedOut.status(), 'manageCatalog answered the visitor').toBe(404);
        await expect(visitor.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});
        await expect(new LoginPage(visitor).form).toHaveCount(0);

        // Control: the DOIs page's address, typed the same way by the
        // visitor, is answered by the Login page.
        await visitor.goto(new DoisPage(visitor, SERVER).url());
        await expect(visitor).toHaveURL(/\/login\?source=/, {timeout: T});
        await new LoginPage(visitor).expectForm();
        await expect(visitor.locator('h1')).not.toHaveText(whole('404 Not Found'));

        // The posted preprint's workflow: the version's pages include
        // "Preprint entry" and no "Catalog Entry" (Purpose, the absence
        // paragraph). Read once the menu has drawn, the list and the entry
        // locator both.
        const workflow = new WorkflowPage(page, SERVER, {appContext, labels: {publicationGroup: 'Preprint'}});
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Published');
        const pages = await workflow.pagesUnderLatestVersion();
        expect(pages).not.toContain('Catalog Entry');
        await expect(workflow.pageLink('Catalog Entry')).toHaveCount(0);

        // Control: the same list, read the same way, holds "Preprint
        // entry", whose page opens.
        expect(pages).toContain('Preprint entry');
        await expect(workflow.pageLink('Preprint entry')).toHaveCount(1);
        await workflow.selectPage('Preprint entry');
        await workflow.expectPageHeading('Preprint entry');

        // Its Production stage shows no "Catalog Management" notice
        // (Purpose, the absence paragraph), read once the stage's status
        // box has rendered; control: that box reads "Submission published."
        await workflow.selectStage('Production');
        await workflow.expectStatus('Submission published.');
        await expect(workflow.primaryColumn().getByRole('heading', {name: 'Catalog Management'})).toHaveCount(0);
        await expect(workflow.primaryColumn().getByText('Catalog Management')).toHaveCount(0);
        await expect(workflow.primaryColumn().getByText('Awaiting approval.')).toHaveCount(0);
    });
});
