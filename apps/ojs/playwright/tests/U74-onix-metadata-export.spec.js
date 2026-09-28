// @ts-check
/**
 * @file playwright/tests/U74-onix-metadata-export.spec.js
 *
 * ONIX metadata & export — OJS suite. A journal does not install ONIX
 * (the spec's title badge is {OMP}), so the journal runs the one scenario
 * written for it, S9 "No ONIX on a journal or a preprint server"
 * {OJS OPS}, its journal half: the absence test with a positive control
 * per assertion (RUNBOOK multi-app rule 3), in the journal's own words:
 * the Journal Manager's article in Production, its side menu, its galley
 * "PDF"'s "Edit" window and Tools › "Import/Export". S1–S8 are the
 * press's, in its tree; S9's preprint-server half is the OPS suite's.
 * Spec: docs/specs/U74-onix-metadata-export.md
 *
 * The spec's control (the press's "Marketing" group, "Paperback"'s
 * "Metadata" tab and the ONIX tool) is taken on the seeded press, which
 * the OJS fleet does not serve (a CI job installs one app); it runs in the
 * OMP suite. Here each absence is paired with what the journal offers in
 * the same place, read the same way: the side menu's "Workflow" and
 * "Publication" groups beside the missing "Marketing" group and its
 * pages; the galley window's one tab "Edit Metadata" and its "Galley
 * Label" box beside the missing "Metadata" tab, "Sales Rights" and
 * "Market Territories"; and the Tools list's "Native XML Plugin" line
 * beside the missing "ONIX 3.0 Monograph Export Plugin".
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A19: all on the press's "Marketing" pages, its formats' "Metadata"
 *   tab, its ONIX tool and its Native XML files, which a journal does not
 *   have.
 *
 * Seeding: one scratch submission of `author.alex` on the seeded journal,
 * tagged (M5), sent to Production (`skipExternalReview`,
 * `sendToProduction`) with the galley "PDF" (`galleys[]`, article.pdf), as
 * footnote s says. The seeded journal publicknowledge and the seeded
 * roster are read-only.
 *
 * The side menu is read once it has drawn (WorkflowPage.menuEntries), as
 * data and by locator. The galley window is read once its form has loaded
 * (GalleyWindow.expectLoaded: the label box there, the AJAX quiet), its
 * tabs as the list it offers and the absent words from the window's own
 * text and by locator. The Tools list loads its lines in one AJAX answer,
 * read once the "Native XML Plugin" line is there (M4, M6). Waits are
 * web-first (A5). Runs in the parallel `ojs` project: nothing here changes
 * the journal.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {GalleyManager} = require('../../../../shared/playwright/pages/GalleysPages.js');
const {ToolsPage} = require('../../../../shared/playwright/pages/ImportExportPages.js');

const JOURNAL = 'publicknowledge';
const MARKETING_ENTRIES = ['Marketing', 'Audience', 'Representatives', 'Publication Dates'];
const TRADE_WORDS = ['Sales Rights', 'Market Territories'];
const NATIVE = 'Native XML Plugin';
const ONIX = 'ONIX 3.0 Monograph Export Plugin';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u74${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('ONIX metadata & export', () => {
    test('S9: no ONIX on a journal', async ({asUser, ojsApi, appContext}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Article ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            galleys: [{label: 'PDF', locale: 'en', file: 'article.pdf'}],
        });

        const page = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(page, JOURNAL, {appContext});
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Production');

        // The side menu lists "Publication" and no "Marketing" group
        // (Purpose, the absence paragraph). Read once the menu has drawn,
        // as data and by locator; control: the groups "Workflow" and
        // "Publication", read the same ways.
        const entries = await workflow.menuEntries();
        const groups = entries.filter((e) => e.level === 1).map((e) => e.label);
        expect(groups).toEqual(['Workflow', 'Publication']);
        const labels = entries.map((e) => e.label);
        for (const label of MARKETING_ENTRIES) {
            expect(labels).not.toContain(label);
        }
        await expect(workflow.workflowGroup()).toHaveCount(1);
        await expect(workflow.publicationGroup()).toHaveCount(1);
        for (const label of MARKETING_ENTRIES) {
            await expect(workflow.menuLink(label)).toHaveCount(0);
        }

        // "Publication" › the version › "Galleys", "…" at the end of
        // "PDF"'s row, then "Edit": the galley's window has one tab, "Edit
        // Metadata", and no "Sales Rights" or "Market Territories" list
        // (Purpose, the absence paragraph). Read once the form has loaded,
        // the tabs as the list the window offers, the absent words from
        // the window's own text and by locator; control: the tab "Edit
        // Metadata" and the "Galley Label" box, read the same ways.
        await workflow.selectPage('Galleys');
        const galleys = new GalleyManager(page, workflow);
        await galleys.expectLoaded();
        await galleys.expectLabels(['PDF']);
        const win = await galleys.openEdit('PDF');
        const tabs = win.dialog().getByRole('tab');
        await expect(tabs).toHaveCount(1);
        expect((await tabs.allInnerTexts()).map((t) => t.trim())).toEqual(['Edit Metadata']);
        await expect(win.tab('Edit Metadata')).toBeVisible();
        await expect(win.tab('Metadata')).toHaveCount(0);
        await expect(win.labelBox()).toBeVisible();
        await expect(win.labelBox()).toHaveValue('PDF');
        const text = await win.dialog().innerText();
        expect(text).toContain('Galley Label');
        for (const word of TRADE_WORDS) {
            expect(text).not.toContain(word);
            await expect(win.dialog().getByText(word)).toHaveCount(0);
        }
        await win.cancel();
        await win.expectClosed();

        // Tools › "Import/Export" lists "Native XML Plugin" and no "ONIX
        // 3.0 Monograph Export Plugin" (Purpose, the absence paragraph).
        // Read once the list's lines are there (one AJAX answer), as data
        // and by locator; control: the "Native XML Plugin" line and link,
        // read the same ways.
        const tools = new ToolsPage(page, JOURNAL);
        await tools.goto();
        await expect(tools.tab('Import/Export')).toHaveAttribute('aria-selected', 'true');
        await expect(tools.line(NATIVE)).toBeVisible();
        const lines = await tools.lineTexts();
        expect(lines.some((l) => l.startsWith(`${NATIVE}:`))).toBe(true);
        expect(lines.filter((l) => /ONIX/.test(l))).toEqual([]);
        await expect(tools.toolLink(NATIVE)).toHaveCount(1);
        await expect(tools.toolLink(ONIX)).toHaveCount(0);
        await expect(tools.lines().filter({hasText: 'ONIX'})).toHaveCount(0);
    });
});
