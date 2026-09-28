// @ts-check
/**
 * @file playwright/tests/U73-publication-formats-proof-terms.spec.js
 *
 * Publication formats & proof terms — OPS suite. A preprint server does
 * not install publication formats (the spec's title badge is {OMP}), so
 * the server runs the one scenario written for it, S11 "No publication
 * formats on a journal or a preprint server" {OJS OPS}: the absence test
 * with a positive control per assertion (RUNBOOK multi-app rule 3), in the
 * preprint server's own words: the Preprint Server Manager's preprint in
 * Production, its "Preprint" › version pages (the server's name for the
 * group the spec calls "Publication") and its "Galleys" page. S1–S10 are
 * the press's, in its tree; S11's journal half is the OJS suite's.
 * Spec: docs/specs/U73-publication-formats-proof-terms.md
 *
 * The spec's control is taken on the seeded press, which the OPS fleet does
 * not serve (a CI job installs one app); that half ("Publication Formats"
 * under the press's version) is left to the press's tree. Here each
 * absence is paired with what the server offers in the same place, read
 * the same way: the version's "Galleys" page entry beside the missing
 * "Publication Formats", and on the Galleys page the galley "PDF", its
 * row menu ("Edit", "Change File", "More Information", "Delete") and the
 * page's own "Order" and "Add galley" beside the missing approval,
 * availability and terms controls.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A23: all on the press's "Publication Formats" page, its windows
 *   and its readers' offers, which a preprint server does not have.
 *
 * Seeding: one scratch submission of `author.alex` on the seeded server,
 * tagged (M5), with the galley "PDF" (`galleys[]`, preprint.pdf); a
 * submitted preprint sits in Production with no decision, as footnote s
 * says. The seeded server publicknowledge and the seeded roster are
 * read-only.
 *
 * The version's pages are read once the menu has drawn and the version
 * node is unfolded (WorkflowPage.pagesUnderLatestVersion), as data and by
 * locator. The Galleys page is read once its list has settled on the one
 * row "PDF" (GalleyManager.expectLabels); the absent words are read from
 * the settled manager's own text and by locator inside it, beside the
 * row's label and the page's controls read the same ways; the row menu is
 * read as the list of items it offers (M4, M6). Waits are web-first (A5).
 * Runs in the parallel `ops` project: nothing here changes the server.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {GalleyManager} = require('../../../../shared/playwright/pages/GalleysPages.js');

const SERVER = 'publicknowledge';
const MENU_FULL = ['Edit', 'Change File', 'More Information', 'Delete'];
const FORMAT_WORDS = ['Awaiting Approval', 'Approved', 'Not Available', 'Available', 'Set Terms'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u73${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Publication formats & proof terms', () => {
    test('S11: no publication formats on a preprint server', async ({asUser, opsApi, appContext}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            galleys: [{label: 'PDF', locale: 'en', file: 'preprint.pdf'}],
        });

        const page = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(page, SERVER, {appContext, labels: {publicationGroup: 'Preprint'}});
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Production');

        // "Preprint" › the version lists "Galleys" and no "Publication
        // Formats" (Purpose, the absence paragraph). Read once the menu has
        // drawn and the version is unfolded, as data and by locator;
        // control: "Galleys", read the same ways.
        const pages = await workflow.pagesUnderLatestVersion();
        expect(pages).toContain('Galleys');
        expect(pages).not.toContain('Publication Formats');
        await expect(workflow.pageLink('Galleys')).toHaveCount(1);
        await expect(workflow.pageLink('Publication Formats')).toHaveCount(0);
        await expect(workflow.menu().getByText('Galleys', {exact: true})).toHaveCount(1);
        await expect(workflow.menu().getByText('Publication Formats', {exact: true})).toHaveCount(0);

        // "Galleys": the galley "PDF" is listed with no "Awaiting
        // Approval", "Approved", "Not Available", "Available" or "Set
        // Terms" (Purpose, the absence paragraph). Read once the list has
        // settled on its one row, from the manager's own text and by
        // locator inside it; control: the row's "PDF" and the page's
        // "Order" and "Add galley", read the same ways.
        await workflow.selectPage('Galleys');
        const galleys = new GalleyManager(page, workflow);
        await galleys.expectLoaded();
        await galleys.expectLabels(['PDF']);
        const text = await galleys.root().innerText();
        expect(text).toContain('PDF');
        expect(text).toContain('Add galley');
        for (const word of FORMAT_WORDS) {
            expect(text).not.toContain(word);
        }
        await expect(galleys.root().getByText('PDF', {exact: true})).toHaveCount(1);
        await expect(galleys.addButton()).toBeVisible();
        await expect(galleys.orderButton()).toBeVisible();
        for (const word of FORMAT_WORDS) {
            await expect(galleys.root().getByText(word)).toHaveCount(0);
            await expect(galleys.root().locator('a, button').filter({hasText: word})).toHaveCount(0);
        }

        // The row's menu offers the galley's own actions and none of a
        // format file's ("Approve Proof", "Set Terms"): control, the four
        // items it offers, read as the list.
        const items = await galleys.menuOffers('PDF');
        expect(items).toEqual(MENU_FULL);
        for (const word of [...FORMAT_WORDS, 'Approve Proof', 'Select Files']) {
            expect(items).not.toContain(word);
        }
    });
});
