// @ts-check
/**
 * @file playwright/tests/U52-payments-and-apcs.spec.js
 *
 * Payments & APCs — OPS suite. A preprint server does not install payments
 * (the spec's title badge is {OJS}), so the server runs the one scenario
 * written for it, S7 "No payments on a preprint server" {OPS}: the absence
 * test with a positive control per assertion (RUNBOOK multi-app rule 3), in
 * the server's own words: the Preprint Server Manager's Settings ›
 * Distribution tab row. S1–S5 are the journal's and S6 the press's, in
 * their trees.
 * Spec: docs/specs/U52-payments-and-apcs.md
 *
 * The spec's control is taken on a journal (scenario 1), which the OPS
 * fleet does not serve; the journal half (Distribution offering
 * "Payments") is the OJS suite's. Here the missing tab is paired with the
 * tabs the server offers in the same row, read the same way, and the
 * journal's own address for the tab (Distribution followed by "#payments",
 * typed) is paired with the server's first tab it falls back to.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A11, OMP1: all on a journal's or a press's payment screens, which a
 *   preprint server does not have.
 *
 * Seeding: none. The seeded server publicknowledge and the seeded Preprint
 * Server Manager are read-only.
 *
 * The Distribution tab row is read web-first as a whole, each missing tab
 * or panel paired with a present one read the same way (M4, M6). Waits are
 * web-first (A5). Runs in the parallel `ops` project: nothing here changes
 * the server.
 */
const {test, expect} = require('../support/fixtures.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');

const SERVER = 'publicknowledge';
/** publicknowledge is bilingual, so its addresses carry the /en prefix. */
const LOCALE = 'en';
const T = 30_000;

/** The server's Distribution tabs, in page order (spec footnote td1). */
const SERVER_TABS = ['License', 'DOIs', 'Search Indexing', 'Access', 'Statistics'];

test.describe('Payments & APCs', () => {
    test('S7: no payments on a preprint server', async ({asUser}) => {
        const page = await (await asUser('manager.maya')).newPage();
        const settings = new SettingsPages(page, SERVER, {locale: LOCALE});

        // Settings › Distribution: its tabs include no "Payments" (Purpose,
        // the absence paragraph). The whole tab row is read web-first, so
        // the read is settled before any single tab is counted.
        await settings.goto('distribution');
        await expect(settings.topTabs).toHaveText(SERVER_TABS.map(whole), {timeout: T});
        await expect(settings.tab('Payments')).toHaveCount(0);
        await expect(settings.mainRegion.getByRole('tab', {name: /payment/i})).toHaveCount(0);

        // Control: the server's own tabs in that row, read the same way,
        // each there once.
        for (const name of SERVER_TABS) {
            await expect(settings.mainRegion.getByRole('tab', {name, exact: true})).toHaveCount(1);
        }

        // No "Payments" panel either: pressing through the row opens each
        // tab's own panel, and none of them is "Payments" or holds its
        // "Enable" box.
        for (const name of SERVER_TABS) {
            await settings.tab(name).click();
            await expect(settings.tab(name)).toHaveAttribute('aria-selected', 'true');
            await expect(settings.mainRegion.getByRole('tabpanel', {name, exact: true})).toBeVisible({timeout: T});
        }
        await expect(settings.mainRegion.getByRole('tabpanel', {name: 'Payments', exact: true})).toHaveCount(0);
        await expect(page.locator('input[name="paymentsEnabled"]')).toHaveCount(0);
        await expect(page.getByText(/Payments will be enabled for this/)).toHaveCount(0);

        // Control: each panel's own first field, read by name the same way,
        // and the "Access" panel's sentence, read as text the same way.
        for (const field of ['copyrightHolderType', 'enableDois', 'searchDescription-en', 'publishingMode', 'isSushiApiPublic']) {
            await expect(page.locator(`input[name="${field}"], textarea[name="${field}"]`), field).not.toHaveCount(0);
        }
        await expect(page.getByText(/The server will provide open access to its contents/)).toHaveCount(1);

        // The journal's address for the tab, typed on the server
        // (Distribution followed by "#payments"), loaded fresh from another
        // page: the same five tabs, no "Payments" among them and no panel
        // of that name; the row opens on its first tab, "License" (the
        // control, read the same way).
        await settings.goto('usersRoles');
        await settings.goto('distribution', '#payments');
        await expect(settings.topTabs).toHaveText(SERVER_TABS.map(whole), {timeout: T});
        await expect(settings.tab('License')).toHaveAttribute('aria-selected', 'true');
        await expect(settings.mainRegion.getByRole('tabpanel', {name: 'License', exact: true})).toBeVisible({timeout: T});
        await expect(settings.mainRegion.getByRole('tabpanel', {name: 'Payments', exact: true})).toHaveCount(0);
        await expect(page.locator('input[name="paymentsEnabled"]')).toHaveCount(0);
        await expect(page.locator('input[name="copyrightHolderType"]')).not.toHaveCount(0);
    });
});
