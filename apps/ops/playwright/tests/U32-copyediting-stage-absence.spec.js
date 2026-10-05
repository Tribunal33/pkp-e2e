// @ts-check
/**
 * @file playwright/tests/U32-copyediting-stage-absence.spec.js
 *
 * Copyediting stage — OPS suite: the preprint server's ABSENCE test only,
 * spec scenario 10. A preprint server installs a single-stage workflow
 * (Production), no Copyeditor role and no editing decisions (spec Purpose,
 * register OPS1, footnote k), so none of the stage's panels, notices or
 * decision buttons render here. Scenarios 1–9 are badged {OJS OMP}; per
 * RUNBOOK multi-app rule 3 the feature costs OPS one absence test with a
 * positive control per assertion (PRINCIPLES M4, M6).
 * Spec: docs/specs/U32-copyediting-stage.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A2 🐞,
 * A6 🐞, A7 🐞, A1 ❓, A3 ❓, A4 ❓, A5 ❓, A8 ❓, A10 ❓ (journal and press
 * surfaces of a stage a preprint server never shows), OMP1 ✅ (press
 * routing). OPS1 ✅ is what S10 asserts, as the spec's stated absence, never
 * the Production stage's own behaviour, which belongs to *Production stage*
 * and *Publish, schedule & versions*. The spec's Coverage section records
 * everything else left out.
 *
 * Seeding: a scratch preprint server + one submitted preprint via the
 * scenario endpoints (throwaway manager, Moderator and author; unique tag,
 * M5). The scenario API refuses the `copyeditor` role key on OPS
 * (users.md section 2), so nothing here seeds one. `publicknowledge` and
 * the seeded roster are not touched. No hard-coded waits; runs in the
 * parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialDashboardPage} = require('../pages/EditorialDashboardPage.js');
const {UsersRolesPage} = require('../pages/UserInvitationPages.js');

/** Single hyphenless alphanumeric token — tag conventions in patterns.md. */
function makeTag(prefix) {
    return prefix + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 7);
}

/** The preprint server's single stage entry (OPS1). */
const OPS_STAGES = ['Production'];

/** The Production stage's decision buttons, left to right (OPS1). */
const OPS_DECISIONS = ['Post the preprint', 'Decline Submission'];

/** The "Assign" form's roles and predefined messages on a preprint (OPS1). */
const OPS_ASSIGN_GROUPS = ['Preprint Server manager', 'Moderator', 'Author'];
const OPS_ASSIGN_TEMPLATES = ['Discussion (Production)', 'Assign Editor'];

/** Settings › Users & Roles › Roles on a fresh preprint server (OPS1). */
const OPS_ROLES = ['Preprint Server manager', 'Moderator', 'Author', 'Reader', 'Editorial Board Member'];

test.describe('copyediting stage (U32) — OPS absence', () => {
    test('S10 {OPS}: no Copyediting stage on a preprint server', async ({
        asUser,
        pkpApi,
        appContext,
    }) => {
        const tag = makeTag('u32s10');
        const manager = `m${tag}`;
        const moderator = `e${tag}`;
        const author = `a${tag}`;

        // Given: a scratch preprint server with a throwaway Preprint Server
        // Manager, a Moderator and an author; one submitted (unposted)
        // preprint, which on OPS sits on the Production stage from the start.
        await pkpApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: moderator, roles: ['sectionEditor']},
                {username: author, roles: ['author']},
            ],
        });
        const seeded = await pkpApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            participants: [{username: moderator, role: 'sectionEditor'}],
        });

        const page = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(page, tag, {
            appContext,
            labels: {publicationGroup: 'Preprint'},
        });
        const dashboard = new EditorialDashboardPage(page, tag);

        // ── The workflow menu ────────────────────────────────────────────
        // Type the Copyediting stage's own address (`workflowMenuKey=
        // workflow_4`): the preprint server rewrites it to Production
        // (`workflow_5`) and the panel opens on "Workflow: Production".
        await workflow.gotoEditorial(seeded.submissionId, {menuKey: 'workflow_4'});
        await expect(page).toHaveURL(/workflowMenuKey=workflow_5(&|$)/, {timeout: 30_000});
        await workflow.expectStageHeading('Production');
        await workflow.expectStage('Production');

        // Control: the menu's "Production" entry is on screen…
        await expect(workflow.stageLink('Production')).toBeVisible();
        // …and the "Workflow" group lists exactly ["Production"]: no
        // "Copyediting" entry (a settled read of the whole group, bounded by
        // the entry it must hold).
        await expect.poll(() => workflow.stageLabels(), {timeout: 30_000}).toEqual(OPS_STAGES);
        await expect(workflow.stageLink('Copyediting')).toHaveCount(0);
        await expect(workflow.menu().getByText(/Copyedit/i)).toHaveCount(0);

        // ── The decision buttons ─────────────────────────────────────────
        // The Production stage offers "Post the preprint" and "Decline
        // Submission" (control), and exactly those…
        await expect(workflow.actionButton('Post the preprint')).toBeVisible();
        await expect(workflow.actionButton('Decline Submission')).toBeVisible();
        await expect
            .poll(() => workflow.actionButtonLabels(), {timeout: 30_000})
            .toEqual(OPS_DECISIONS);
        // …so neither "Send To Production" nor "Move to Review" appears
        // anywhere on the screen, the whole page included (bounded by the
        // dialog having just rendered its two buttons).
        await expect(page.getByRole('button', {name: 'Send To Production', exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Move to Review', exact: true})).toHaveCount(0);
        await expect(page.getByText('Send To Production')).toHaveCount(0);
        await expect(page.getByText('Move to Review')).toHaveCount(0);

        // The stage's panels and notice render nowhere either (Purpose's
        // absence paragraph, OPS1). Control: the Production stage's own
        // discussions panel and the Participants list are on screen.
        await expect(workflow.panel('Production Tasks & Discussions')).toBeVisible();
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(workflow.dialog().getByText('Draft Files', {exact: true})).toHaveCount(0);
        await expect(workflow.dialog().getByText('Copyedited Files', {exact: true})).toHaveCount(0);
        await expect(workflow.dialog().getByText('Copyediting Tasks & Discussions')).toHaveCount(0);
        await expect(
            workflow.dialog().getByRole('heading', {name: 'Notification', exact: true})
        ).toHaveCount(0);
        await expect(workflow.dialog().getByText(/Assign a copyeditor/)).toHaveCount(0);
        await expect(workflow.dialog().getByText('Awaiting Copyedits.')).toHaveCount(0);

        // ── The "Assign" form ────────────────────────────────────────────
        // On the "Participants" panel press "Assign": the window's "Locate
        // a User" select offers the server's three roles and no Copyeditor;
        // "Choose a predefined message" lists "Discussion (Production)" and
        // "Assign Editor" (control) and neither "Request Copyedit" nor
        // "Discussion (Copyediting)".
        const assignForm = await dashboard.openAssignParticipantForm();
        await expect(assignForm).toContainText('Assign Participant');
        await expect
            .poll(() => dashboard.assignParticipantGroupOptions(), {timeout: 30_000})
            .toEqual(OPS_ASSIGN_GROUPS);
        await expect
            .poll(() => dashboard.assignParticipantTemplateOptions(), {timeout: 30_000})
            .toEqual(OPS_ASSIGN_TEMPLATES);
        await expect(assignForm.locator('option', {hasText: /Copyedit/i})).toHaveCount(0);
        await dashboard.cancelAssignParticipantForm();

        // ── The Roles screen ─────────────────────────────────────────────
        // Settings › Users & Roles › Roles lists the five installed roles
        // (Moderator among them, the control) and no Copyeditor.
        const users = new UsersRolesPage(page, tag);
        await users.goto();
        await users.openRolesTab();
        await expect(users.roleRows().filter({hasText: 'Moderator'})).toBeVisible();
        await expect.poll(() => users.roleNames(), {timeout: 30_000}).toEqual(OPS_ROLES);
        await expect(users.roleRows().filter({hasText: /Copyedit/i})).toHaveCount(0);
    });
});
