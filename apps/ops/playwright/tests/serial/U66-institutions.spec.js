// @ts-check
/**
 * @file playwright/tests/serial/U66-institutions.spec.js
 *
 * Institutions — OPS suite, the scenario that changes the installation:
 * S4 (common), in the preprint server's own roster (the Moderator as the
 * Section Editor, the Editorial Board Member in the Copyeditor's place, no
 * Reviewer: footnote s). The rest of the feature is
 * `tests/U66-institutions.spec.js`.
 * Spec: docs/specs/U66-institutions.md
 *
 * Serial project, alone (PRINCIPLES A7, A9): S4 ticks the site's own
 * "Enable institutional statistics", one record every context of the
 * install reads (scenarios.md "`POST site`"), so the test carries `@solo`
 * and runs by itself in the `ops-solo` project after the serial one
 * (harness.md "Project chain"). It puts the site's box back to unticked in
 * a `finally`, even when it fails midway, through `pkpApi.setSite`.
 *
 * Deliberately NOT covered (register IDs; the spec's Coverage section is
 * the record of everything else left out):
 * - A1–A11: not on this scenario's path (A1 needs a manager-level role
 *   without "Permit changes to Settings", which a preprint server does not
 *   have).
 *
 * Seeding (footnote s): the site's box by `POST site`
 * `{enableInstitutionUsageStats: true}`; a scratch server from `POST
 * scenarios/context` with the context key `enableInstitutionUsageStats:
 * true`, `institutions[]` "Campus Library" and throwaway accounts (the
 * username twice as password): the manager, a Moderator, an Editorial
 * Board Member and an Author. The Site Administrator is `admin`.
 *
 * Every absence of the side-menu entry is read once the side menu has
 * drawn its entries (the positive control on the same page); "at once,
 * without a reload" is read on a mark the test leaves on the page before
 * "Save" and finds after it. Waits are web-first or bounded by the screen's
 * own answer (A5).
 */
const {test, expect} = require('../../support/fixtures.js');
const {SiteSettingsPage} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');
const {JournalStatisticsTab} = require('../../../../../shared/playwright/pages/UsageStatsPages.js');
const {InstitutionsPage, serverFailures} = require('../../../../../shared/playwright/pages/InstitutionsPages.js');

const T = 30_000;

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u66${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/** An actor's page (an `asUser` context). */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Leave a mark on the page; a reload would take it away. */
async function markPage(page) {
    await page.evaluate(() => {
        // @ts-ignore
        window.__u66NoReload = true;
    });
}

/** Is the page's mark still there (no reload since `markPage`)? */
async function stillMarked(page) {
    // @ts-ignore
    return page.evaluate(() => window.__u66NoReload === true);
}

test.describe('Institutions (installation settings)', () => {
    test('S4: the side-menu entry while the server collects institutional statistics @solo', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const roles = {
            manager: `${tag}mg`,
            sectionEditor: `${tag}se`,
            editorialBoardMember: `${tag}eb`,
            author: `${tag}au`,
        };
        const dashboard = `/index.php/${tag}/submissions`;
        try {
            await opsApi.setSite({enableInstitutionUsageStats: true});
            await opsApi.createContext({
                tag,
                users: Object.entries(roles).map(([role, username]) => user(username, 'Una', role, [role])),
                enableInstitutionUsageStats: true,
                institutions: [{name: 'Campus Library', ipRanges: ['10.0.0.0/8']}],
            });
            const mg = await pageAs(asUser, roles.manager);
            const failures = serverFailures(mg);
            const inst = new InstitutionsPage(mg, tag);

            // The manager: the side menu shows "Institutions"; pressing it
            // opens the page (Actors row 1; Rule 1; Settings bullet 1).
            await mg.goto(dashboard);
            await inst.waitSideMenu();
            await expect(inst.sideEntry).toBeVisible();
            await inst.openFromSideMenu();
            await inst.expectNames(['Campus Library']);

            // The Moderator, the Editorial Board Member and the Author: no
            // "Institutions" in a side menu that has drawn its entries
            // (Actors row 1).
            for (const role of ['sectionEditor', 'editorialBoardMember', 'author']) {
                const page = await pageAs(asUser, roles[role]);
                const theirs = new InstitutionsPage(page, tag);
                await page.goto(dashboard);
                await theirs.waitSideMenu();
                await expect(theirs.sideEntries.first(), role).toBeVisible();
                await expect(theirs.sideEntry, role).toHaveCount(0);
            }

            // The server's box unticked: "Institutions" leaves at once,
            // without a reload (Settings bullet 1).
            const stats = new JournalStatisticsTab(mg, tag);
            await stats.goto();
            await expect(inst.sideEntry).toBeVisible();
            await expect(stats.institutionalBox).toBeChecked();
            await stats.institutionalBox.uncheck();
            await markPage(mg);
            await stats.save();
            await expect(inst.sideEntry).toHaveCount(0, {timeout: T});
            await expect(inst.sideEntries.first()).toBeVisible();
            expect(await stillMarked(mg), 'no reload after "Save"').toBe(true);

            // By its address: the page opens and lists "Campus Library"
            // (Rule 1; Settings bullet 1).
            await inst.goto();
            await inst.expectNames(['Campus Library']);

            // Ticked again: "Institutions" is back at once (Settings bullet 1).
            await stats.goto();
            await expect(stats.institutionalBox).not.toBeChecked();
            await expect(inst.sideEntry).toHaveCount(0);
            await stats.institutionalBox.check();
            await markPage(mg);
            await stats.save();
            await expect(inst.sideEntry).toBeVisible({timeout: T});
            expect(await stillMarked(mg), 'no reload after "Save"').toBe(true);

            // Control: the Site Administrator unticks the site's box; the
            // manager's Dashboard has no "Institutions" (Settings bullet 1).
            const admin = await pageAs(asUser, 'admin');
            const site = new SiteSettingsPage(admin);
            await site.goto();
            const form = await site.statistics();
            await expect(form.institutionalBox).toBeChecked();
            await form.institutionalBox.uncheck();
            const saved = await form.pressSave();
            expect(saved.status(), 'the site save').toBe(200);
            await site.reload();
            const again = await site.statistics();
            await expect(again.institutionalBox).not.toBeChecked();
            await mg.goto(dashboard);
            await inst.waitSideMenu();
            await expect(inst.sideEntries.first()).toBeVisible();
            await expect(inst.sideEntry).toHaveCount(0);
            expect(failures).toEqual([]);
        } finally {
            await opsApi.setSite({enableInstitutionUsageStats: false});
        }
    });
});
