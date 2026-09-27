// @ts-check
/**
 * @file playwright/tests/U71-internal-review-stage.spec.js
 *
 * Internal Review stage — OJS suite. A journal does not install this
 * feature (the spec's title badge is {OMP}), so the journal runs the one
 * scenario written for it, S10 "No Internal Review on a journal or a
 * preprint server" {OJS OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the journal's own words: the
 * Journal Manager, a queued article, the journal's "Roles" tab. S1–S9 are
 * the press's, in its tree; S10's preprint-server bullet is the OPS
 * suite's, and its "Control" bullet reads the seeded press, which this
 * app's config does not reach: the OMP suite asserts it on the press. Here
 * every absence is paired instead with the journal's own counterpart, read
 * the same way ("Review", "Send for Review", "Reviewer").
 * Spec: docs/specs/U71-internal-review-stage.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OMP1–OMP10: all on the press's Internal Review stage, which a journal
 *   does not have.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. The article is a scratch submission of the seeded journal
 * in section `ART`, submitted by the seeded Author with a unique tag (M5)
 * and no decision, so it stays queued on the Submission stage (footnote s).
 *
 * The workflow menu is read once it has drawn its first entry (the menu is
 * built in one pass from the submission the panel fetches), each missing
 * entry paired with the "Review" entry of the same menu, read the same way.
 * The Submission stage's buttons are read once "Send for Review" is shown
 * in the same button region. The "Roles" tab is read once its rows are
 * drawn and jQuery is idle, the paging line bounding the read to every row
 * the journal has, and the missing row paired with the "Reviewer" row read
 * the same way (M4, M6). Waits are web-first (A5). Runs in the parallel
 * `ojs` project: nothing here changes the journal.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {RolesTab} = require('../../../../shared/playwright/pages/RolesConfigurationPages.js');

const JOURNAL = 'publicknowledge';

/** A journal's stage entries, in workflow order (Purpose, the absence paragraph). */
const OJS_STAGES = ['Submission', 'Review', 'Copyediting', 'Production'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u71${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Internal Review stage', () => {
    test('S10: no Internal Review on a journal', async ({asUser, ojsApi, appContext}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            section: 'ART',
            submitter: 'author.alex',
            title: `Submission ${tag}`,
        });

        const page = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(page, JOURNAL, {appContext});
        await workflow.gotoEditorial(submissionId);

        // The journal's workflow: the menu lists "Submission", "Review",
        // "Copyediting" and "Production", and no "Internal Review" (Purpose,
        // the absence paragraph). The list is read once the menu has drawn,
        // so the read is settled. Control: the "Review" entry of the same
        // menu, read the same two ways.
        await expect(workflow.workflowGroup()).toBeVisible({timeout: 30_000});
        const stages = await workflow.stageLabels();
        expect(stages).toEqual(OJS_STAGES);
        expect(stages).not.toContain('Internal Review');
        const entries = (await workflow.menuEntries()).map((e) => e.label);
        expect(entries).not.toContain('Internal Review');
        expect(entries).toContain('Review');
        await expect(workflow.menuLink('Review')).toBeVisible();
        await expect(workflow.menuLink('Internal Review')).toHaveCount(0);

        // Its Submission stage offers no "Send to Internal Review" (Purpose,
        // the absence paragraph). Control: the queued article's "Send for
        // Review" in the same button region, shown first.
        await workflow.expectStage('Submission');
        await workflow.expectStageHeading('Submission');
        await expect(workflow.actionButton('Send for Review')).toBeVisible({timeout: 30_000});
        const buttons = await workflow.actionButtonLabels();
        expect(buttons).toContain('Send for Review');
        expect(buttons).not.toContain('Send to Internal Review');
        await expect(workflow.actionButton('Send to Internal Review')).toHaveCount(0);

        // No Internal Reviewer: Settings › Users & Roles, its "Roles" tab,
        // lists no "Internal Reviewer" (Purpose, the absence paragraph). The
        // paging line shows every role on this one page. Control: the
        // "Reviewer" row, read the same two ways.
        const roles = new RolesTab(page, JOURNAL, {stages: OJS_STAGES});
        await roles.goto();
        const names = await roles.rowNames();
        const line = await roles.pagingLine();
        expect(line).toBe(`1 - ${names.length} of ${names.length} items`);
        expect(names).toContain('Reviewer');
        expect(names).not.toContain('Internal Reviewer');
        await expect(roles.row('Reviewer')).toBeVisible();
        await expect(roles.row('Internal Reviewer')).toHaveCount(0);
    });
});
