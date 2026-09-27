// @ts-check
/**
 * @file playwright/tests/U71-internal-review-stage.spec.js
 *
 * Internal Review stage — OPS suite. A preprint server does not install
 * this feature (the spec's title badge is {OMP}), so the server runs the
 * one scenario written for it, S10 "No Internal Review on a journal or a
 * preprint server" {OJS OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the preprint server's own words:
 * the Preprint Server Manager, a newly submitted preprint, the server's
 * "Roles" tab. S1–S9 are the press's, in its tree; S10's journal bullet is
 * the OJS suite's, and its "Control" bullet reads the seeded press, which
 * this app's config does not reach: the OMP suite asserts it on the press.
 * Here every absence is paired instead with the server's own counterpart,
 * read the same way ("Production", "Post the preprint", "Moderator").
 * Spec: docs/specs/U71-internal-review-stage.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OMP1–OMP10: all on the press's Internal Review stage, which a preprint
 *   server does not have.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. The preprint is a scratch submission of the seeded server,
 * submitted by the seeded Author with a unique tag (M5) and no decision, so
 * it stays queued, on Production from its submission (footnote s).
 *
 * The workflow menu is read once it has drawn its first entry (the menu is
 * built in one pass from the submission the panel fetches), the missing
 * entry paired with the "Production" entry of the same menu, read the same
 * way. The Production stage's buttons are read once "Post the preprint" is
 * shown in the same button region. The "Roles" tab is read once its rows
 * are drawn and jQuery is idle, the paging line bounding the read to every
 * row the server has, and the missing row paired with the "Moderator" row
 * read the same way (M4, M6). Waits are web-first (A5). Runs in the
 * parallel `ops` project: nothing here changes the server.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {RolesTab} = require('../../../../shared/playwright/pages/RolesConfigurationPages.js');

const SERVER = 'publicknowledge';

/** A preprint server's one stage entry (Purpose, the absence paragraph). */
const OPS_STAGES = ['Production'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u71${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Internal Review stage', () => {
    test('S10: no Internal Review on a preprint server', async ({asUser, opsApi, appContext}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
        });

        const page = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(page, SERVER, {appContext, labels: {publicationGroup: 'Preprint'}});
        await workflow.gotoEditorial(submissionId);

        // The server's workflow: the menu lists "Production" alone, and no
        // "Internal Review" (Purpose, the absence paragraph). The list is
        // read once the menu has drawn, so the read is settled. Control:
        // the "Production" entry of the same menu, read the same two ways.
        await expect(workflow.workflowGroup()).toBeVisible({timeout: 30_000});
        const stages = await workflow.stageLabels();
        expect(stages).toEqual(OPS_STAGES);
        expect(stages).not.toContain('Internal Review');
        const entries = (await workflow.menuEntries()).map((e) => e.label);
        expect(entries).not.toContain('Internal Review');
        expect(entries).toContain('Production');
        await expect(workflow.stageLink('Production')).toBeVisible();
        await expect(workflow.menuLink('Internal Review')).toHaveCount(0);

        // Nor does its one stage offer "Send to Internal Review" (Purpose,
        // the absence paragraph: neither app offers it). Control: the
        // queued preprint's "Post the preprint" in the same button region,
        // shown first.
        await workflow.expectStage('Production');
        await workflow.expectStageHeading('Production');
        await expect(workflow.actionButton('Post the preprint')).toBeVisible({timeout: 30_000});
        const buttons = await workflow.actionButtonLabels();
        expect(buttons).toContain('Post the preprint');
        expect(buttons).not.toContain('Send to Internal Review');
        await expect(workflow.actionButton('Send to Internal Review')).toHaveCount(0);

        // No Internal Reviewer: Settings › Users & Roles, its "Roles" tab,
        // lists no "Internal Reviewer" (Purpose, the absence paragraph). The
        // paging line shows every role on this one page. Control: the
        // "Moderator" row, read the same two ways.
        const roles = new RolesTab(page, SERVER, {stages: OPS_STAGES});
        await roles.goto();
        const names = await roles.rowNames();
        const line = await roles.pagingLine();
        expect(line).toBe(`1 - ${names.length} of ${names.length} items`);
        expect(names).toContain('Moderator');
        expect(names).not.toContain('Internal Reviewer');
        await expect(roles.row('Moderator')).toBeVisible();
        await expect(roles.row('Internal Reviewer')).toHaveCount(0);
    });
});
