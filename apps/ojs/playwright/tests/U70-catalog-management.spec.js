// @ts-check
/**
 * @file playwright/tests/U70-catalog-management.spec.js
 *
 * Catalog management — OJS suite. A journal does not install catalog
 * management (the spec's title badge is {OMP}), so the journal runs the one
 * scenario written for it, S7 "No catalog on a journal or a preprint
 * server" {OJS OPS}: the absence test with a positive control per assertion
 * (RUNBOOK multi-app rule 3), in the journal's own words: the Journal
 * Manager's side menu, the Catalog page's address typed on the journal, a
 * published article's workflow. S1–S6 are the press's, in its tree.
 * Spec: docs/specs/U70-catalog-management.md
 *
 * The spec's control is taken on the seeded press, which the OJS fleet does
 * not serve (a CI job installs one app); that half ("Content" › "Catalog",
 * the press's "manageCatalog" opening "Catalog", "Catalog Entry" and the
 * "Catalog Management" notice on a published book) is left to the press's
 * tree. Here each absence is paired with what the journal offers in the
 * same place, read the same way: "Issues" in the "Content" group, the
 * Issues page's own address ("manageIssues") typed the same way, the
 * version's "Publication Settings" page and the Production stage's
 * "Submission published." status (the absence paragraph: a journal places
 * an article through its issue and its "Publication Settings" page).
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - every register entry: all on the press's Catalog page, its "Catalog
 *   Entry" page or its "Catalog Management" notice, which a journal does
 *   not have.
 *
 * Seeding: one published article of `author.alex` on the seeded journal
 * (scenario endpoint, `published: true`, the seeded issue Vol. 1 No. 2
 * (2014)), footnote s. The seeded journal publicknowledge and the seeded
 * Journal Manager are otherwise read-only; the visitor is a browser context
 * with no session.
 *
 * The side menu is read once it has rendered its first group (a settled
 * read), as data and by locator, the missing "Catalog" paired with "Issues"
 * in the "Content" group read the same ways, whose page then opens. The
 * typed address is read from its response and its heading, paired with the
 * Issues page's address typed the same way. The version's pages are read
 * once the menu has drawn (WorkflowPage.menuEntries waits for it), the
 * missing "Catalog Entry" paired with "Publication Settings" in the same
 * list; the missing notice is read once the Production stage's status box
 * has rendered (M4, M6). Waits are web-first (A5). Runs in the parallel
 * `ojs` project: nothing here changes the journal.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {EditorialChrome, whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {IssuesAdmin} = require('../../../../shared/playwright/pages/IssuesPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const JOURNAL = 'publicknowledge';
/** publicknowledge is bilingual, so its addresses carry the /en prefix. */
const LOCALE = 'en';
const T = 30_000;

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u70${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A side-menu line by its label, whether its group is open or closed. */
const sideLine = (ed, label) => ed.sideNav.locator(`[role="treeitem"][aria-label="${label}"]`);

/** A line inside one side-menu group (another group of the journal's menu holds an "Issues" line too). */
const groupLine = (ed, group, label) =>
    ed.sideNav
        .locator('[data-pc-section="panel"]')
        .filter({has: ed.page.locator(`[data-pc-section="header"][aria-label="${group}"]`)})
        .locator(`[role="treeitem"][aria-label="${label}"]`);

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
    test('S7: no catalog on a journal', async ({asUser, visitor, ojsApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Article ${tag}`,
            published: true,
            issue: {volume: 1, number: 2, year: 2014},
        });

        // The side menu: the Journal Manager's "Content" group holds
        // "Issues" and no "Catalog" (Purpose, the absence paragraph). Read
        // once the menu has rendered its first group, as data (every
        // group's lines are in the DOM whether open or closed) and by
        // locator on the lines, hidden ones included.
        const page = await (await asUser('manager.maya')).newPage();
        const ed = new EditorialChrome(page);
        await page.goto(`/index.php/${JOURNAL}/${LOCALE}/submissions`);
        await ed.waitSideMenu();
        const side = await ed.sideMenu();
        const labels = side.map((e) => e.label);
        const lines = side.flatMap((e) => e.items.map((i) => i.label));
        expect(labels).not.toContain('Catalog');
        expect(lines).not.toContain('Catalog');
        await expect(ed.sideEntry('Catalog')).toHaveCount(0);
        await expect(sideLine(ed, 'Catalog')).toHaveCount(0);

        // Control: the same "Content" group holds "Issues" and only it,
        // read the same ways, and its page opens.
        expect(labels).toContain('Content');
        expect(side.find((e) => e.label === 'Content')?.items.map((i) => i.label)).toEqual(['Issues']);
        await expect(ed.sideEntry('Content')).toHaveCount(1);
        await expect(groupLine(ed, 'Content', 'Issues')).toHaveCount(1);
        await expect(groupLine(ed, 'Content', 'Catalog')).toHaveCount(0);
        await ed.chooseSideEntry('Content', 'Issues');
        await expect(page).toHaveURL(/\/manageIssues/, {timeout: T});
        const issues = new IssuesAdmin(page, JOURNAL);
        await expect(issues.tab('Future Issues')).toBeVisible({timeout: T});

        // The Catalog page's address: the journal's address followed by
        // "manageCatalog" answers with a not-found page for the Journal
        // Manager (Purpose, the absence paragraph).
        const signedIn = await page.goto(`/index.php/${JOURNAL}/manageCatalog`);
        expect(signedIn && signedIn.status(), 'manageCatalog answered the Journal Manager').toBe(404);
        await expect(page.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});

        // Control: the Issues page's address, typed the same way, opens
        // the page for the Journal Manager.
        const issuesPage = await page.goto(`/index.php/${JOURNAL}/manageIssues`);
        expect(issuesPage && issuesPage.status(), 'manageIssues answered the Journal Manager').toBe(200);
        await expect(page).toHaveURL(/\/manageIssues/);
        await expect(issues.tab('Future Issues')).toBeVisible({timeout: T});

        // The same address for the visitor: a not-found page too, not the
        // Login page a management page sends a visitor to.
        const signedOut = await visitor.goto(`/index.php/${JOURNAL}/manageCatalog`);
        expect(signedOut && signedOut.status(), 'manageCatalog answered the visitor').toBe(404);
        await expect(visitor.locator('h1')).toHaveText(whole('404 Not Found'), {timeout: T});
        await expect(new LoginPage(visitor).form).toHaveCount(0);

        // Control: the Issues page's address, typed the same way by the
        // visitor, is answered by the Login page.
        await visitor.goto(`/index.php/${JOURNAL}/manageIssues`);
        await expect(visitor).toHaveURL(/\/login\?source=/, {timeout: T});
        await new LoginPage(visitor).expectForm();
        await expect(visitor.locator('h1')).not.toHaveText(whole('404 Not Found'));

        // The published article's workflow: the version's pages include
        // "Publication Settings" and no "Catalog Entry" (Purpose, the
        // absence paragraph). Read once the menu has drawn, the list and
        // the entry locator both.
        const workflow = new WorkflowPage(page, JOURNAL, {appContext});
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Published');
        const pages = await workflow.pagesUnderLatestVersion();
        expect(pages).not.toContain('Catalog Entry');
        await expect(workflow.pageLink('Catalog Entry')).toHaveCount(0);

        // Control: the same list, read the same way, holds "Publication
        // Settings", whose page opens.
        expect(pages).toContain('Publication Settings');
        await expect(workflow.pageLink('Publication Settings')).toHaveCount(1);
        await workflow.selectPage('Publication Settings');
        await workflow.expectPageHeading('Publication Settings');

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
