// @ts-check
/**
 * @file playwright/tests/U29-review-setup-and-review-forms.spec.js
 *
 * U29 — Review setup & review forms
 * (docs/specs/U29-review-setup-and-review-forms.md): the OPS ABSENCE test,
 * spec scenario 11 (S11). OPS installs no review stage (spec footnote b,
 * install facts), so its Settings › Workflow screen has no "Review" tab and
 * nothing in the spec has a screen on a preprint server. Per RUNBOOK multi-app
 * rule 3 the whole feature costs OPS this ONE absence test, with a positive
 * control per assertion (PRINCIPLES M4): the same Workflow Settings screen,
 * reached the same way (the sidebar's Settings group, then a typed
 * address), renders its four remaining tabs.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): none
 * on OPS; every register entry names an OJS or OMP surface. The spec's
 * Coverage section records everything else left out, and scenarios 1–10,
 * 12 and 13 (badged {OJS OMP}) belong to the OJS and OMP suites.
 *
 * Seeding: a scratch preprint server with a throwaway Preprint Server
 * Manager via the scenario endpoint. The seeded `publicknowledge` server
 * and roster are not touched (PRINCIPLES A1).
 */
const {test, expect} = require('../support/fixtures.js');

/** Single hyphenless alphanumeric token — tag conventions in patterns.md. */
function makeTag(prefix) {
    return prefix + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 7);
}

/** The Workflow Settings tabs a preprint server installs, in order (spec footnote b). */
const OPS_WORKFLOW_TABS = ['Submission', 'Preprint Server Library', 'Emails', 'Tasks and Discussions'];

/**
 * The Workflow Settings page's top tab strip (screen-notes pF/P34-35):
 * the first tablist in the main region.
 */
function workflowTabs(page) {
    return page.locator('main').getByRole('tablist').first().getByRole('tab');
}

/**
 * The absence assertion, bounded by its positive control taken the same
 * way: the tab strip that has just rendered exactly the four installed
 * tabs is the one with no "Review" tab, and no review side tab's panel or
 * heading is anywhere on the page.
 */
async function expectNoReviewTab(page) {
    const tabs = workflowTabs(page);
    await expect(tabs).toHaveText(OPS_WORKFLOW_TABS);
    await expect(tabs.filter({hasText: /^Review$/})).toHaveCount(0);
    await expect(page.locator('#reviewSetup, #reviewerGuidance')).toHaveCount(0);
    await expect(
        page.locator('main').getByText(/Review Forms|Reviewer Guidance|Reviewer Recommendations/)
    ).toHaveCount(0);
}

test.describe('review setup & review forms (U29) — OPS absence', () => {
    test('S11 {OPS}: no review settings on a preprint server', async ({asUser, pkpApi}) => {
        const tag = makeTag('u29s11');
        const manager = `m${tag}`;

        // Scratch preprint server with a throwaway Preprint Server Manager.
        await pkpApi.createContext({
            tag,
            users: [{username: manager, roles: ['manager']}],
        });

        const page = await (await asUser(manager)).newPage();

        // ── Via the sidebar (Actors row 1) ──────────────────────────────────
        // Positive control: the manager's typed Editor Dashboard address
        // renders the backend sidebar, whose collapsed "Settings" group,
        // opened, lists "Workflow" and leads to Workflow Settings.
        const editorial = await page.goto(`/index.php/${tag}/dashboard/editorial?currentViewId=active`);
        expect(editorial && editorial.status()).toBe(200);
        const sidebar = page.getByRole('navigation', {name: 'Site Navigation'});
        await expect(sidebar.getByText('Editor Dashboard')).toBeVisible();
        await sidebar.getByRole('button', {name: 'Settings', exact: true}).click();
        await sidebar.getByRole('link', {name: 'Workflow', exact: true}).click();
        await page.waitForURL(/\/management\/settings\/workflow/);
        await expect(workflowTabs(page).first()).toHaveAttribute('aria-selected', 'true');

        // Absence: the four installed tabs and no "Review" among them.
        await expectNoReviewTab(page);

        // ── The typed review address ────────────────────────────────────────
        // A typed two-part review address (`#review/reviewSetup`; the side
        // tabs themselves write `#reviewSetup`) opens the same screen on a preprint
        // server: the hash is kept, "Submission" stays selected, and no
        // review side tab or its panel appears. Positive control, taken the
        // same way: the typed address answers 200 with the four tabs. (Leave
        // the page first: a hash-only address on the open page is a
        // same-document change with no response — screen-notes ccK5.)
        await page.goto(`/index.php/${tag}/index`);
        const typed = await page.goto(`/index.php/${tag}/management/settings/workflow#review/reviewSetup`);
        expect(typed && typed.status()).toBe(200);
        expect(page.url()).toContain('/management/settings/workflow#review/reviewSetup');
        const tabs = workflowTabs(page);
        await expect(tabs.filter({hasText: 'Submission'})).toHaveAttribute('aria-selected', 'true');
        await expectNoReviewTab(page);
    });
});
