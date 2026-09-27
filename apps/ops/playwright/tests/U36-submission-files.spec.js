// @ts-check
/**
 * @file playwright/tests/U36-submission-files.spec.js
 *
 * Submission files — OPS suite: the preprint server's absence scenario only.
 * Scenarios 1–10 are badged {OJS OMP} and name S11 as their OPS absence: a
 * preprint server's workflow is the single Production stage, which lists no
 * files (register OPS1), and this feature's machinery shows only through a
 * galley's row menu on the publication's "Galleys" page (spec Purpose;
 * Actors row "A galley's file"). Per RUNBOOK multi-app rule 3 the feature
 * costs OPS one absence test with a positive control per assertion
 * (PRINCIPLES M4, M6); the {OPS} galley window it reads as its positive
 * half is Rule 13's "Information Center: {galley label}".
 * Spec: docs/specs/U36-submission-files.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A5 🐞,
 * A16 ❓, A23 🐞 (a galley's "Change File"; S11 never opens it), A4 🐞, A17 ❓ (the
 * "History" tab's prior-versions box and downloads; S11 reads the tab's
 * opening only), A3 🐞 (the assistant roles' "History"; S11 reads as the
 * manager), A2, A6–A15, A18–A22, A24 (journal and press lists and windows
 * a preprint server never shows). OPS1 ✅ is what S11 asserts. The spec's
 * Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only; `publicknowledge` and the seeded roster
 * are read-only (A1, A7). S11 runs on the seeded preprint server with
 * `manager.maya`, the Preprint Server Manager, and one submitted preprint
 * seeded with `galleys: [{label: 'PDF', file: 'preprint.pdf'}]` (fn-s0).
 * Tags are unique per run (M5); waits are web-first (A5). Everything runs in
 * the parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {ProductionStagePage, DISCUSSIONS_PANEL} = require('../pages/ProductionStagePages.js');
const {GalleyFilesPage, INFO_CENTER_TABS, HISTORY_COLUMNS} = require('../pages/SubmissionFilesPages.js');

const SERVER = 'publicknowledge';

/** The preprint server's single stage entry (OPS1). */
const OPS_STAGES = ['Production'];

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u36${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('submission files (U36) — OPS', () => {
    test('S11 {OPS}: no file lists on a preprint server', async ({asUser, opsApi, appContext}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        const galley = 'PDF';

        // Given: a submitted preprint whose galley "PDF" holds "preprint.pdf".
        const seeded = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            galleys: [{label: galley, file: 'preprint.pdf'}],
        });

        const page = await (await asUser('manager.maya')).newPage();
        const stage = new ProductionStagePage(page, SERVER, {appContext});
        const workflow = stage.frame;
        const files = new GalleyFilesPage(page, workflow);

        // ── The workflow ─────────────────────────────────────────────────
        // Open the preprint's workflow at "Production": the "Workflow" group
        // holds "Production" alone (a settled read bounded by the entry it
        // must hold).
        await workflow.gotoEditorial(seeded.submissionId);
        await workflow.expectStageHeading('Production');
        await workflow.expectStage('Production');
        await expect(workflow.stageLink('Production')).toBeVisible();
        await expect.poll(() => workflow.stageLabels(), {timeout: 30_000}).toEqual(OPS_STAGES);

        // ── Control ──────────────────────────────────────────────────────
        // The Production stage's discussions and participants panels are on
        // screen, with the discussions panel's "Add", so the missing file
        // list is not a page that failed to load (OPS1; Purpose).
        await expect(stage.discussionsPanel()).toBeVisible({timeout: 30_000});
        await expect(stage.discussionsAddButton()).toBeVisible();
        await expect(workflow.participantsHeading()).toBeVisible();

        // The stage shows its discussions and participants panels and
        // nothing else (the settled read of every panel heading), no file
        // list under any list title, no "Upload" and no "Upload/Select
        // Files" (OPS1; Purpose). The discussions table and its "Add"
        // above are the controls taken the same way.
        await workflow.expectPanelHeadings([DISCUSSIONS_PANEL, 'Participants']);
        await expect(workflow.panelTables()).toHaveCount(1);
        await files.expectNoFileLists();

        // ── The galley's "More Information" ──────────────────────────────
        // Open the publication's "Galleys" page in the side menu and choose
        // "More Information" in the "PDF" galley's menu: a window titled
        // "Information Center: PDF" opens on "History", the first of its
        // tabs "History" and "Notes" (Rule 13; Actors row 10).
        await workflow.selectPage('Galleys');
        await expect(files.galleyRow(galley)).toBeVisible({timeout: 30_000});
        const win = await files.openGalleyInformation(galley);
        await expect(win.getByRole('heading', {name: `Information Center: ${galley}`, exact: true})).toBeVisible();
        await expect.poll(() => files.infoCenterTabLabels(galley), {timeout: 30_000}).toEqual(INFO_CENTER_TABS);
        await expect(files.infoCenterTab(galley, 'History')).toHaveAttribute('aria-selected', 'true');
        await expect(files.infoCenterTab(galley, 'Notes')).toHaveAttribute('aria-selected', 'false');
        await expect(files.infoCenterPanel(galley, 'History')).toBeVisible();
        await expect.poll(() => files.historyColumns(galley), {timeout: 30_000}).toEqual(HISTORY_COLUMNS);
    });
});
