// Helpers of walk.js here (issue report
// docs/issues/U35-A9-permissions-tick-carries-to-other-role.md). Requiring this file runs nothing.
// Every helper drives the workflow's "Participants" panel, its "Assign Participant" and "Edit
// Assignment" windows and Settings > Users & Roles > "Roles" as a person does.
const {idle, sql} = require('../../../probe');

const T = 30_000;

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): a submission Minoti Inoue is
 * not assigned to, the role whose "Permit submission metadata edit." is on, and authors the
 * submission does not hold. `roleOff` is true where the Author role's default must first be
 * switched off on screen (a preprint server installs it on).
 */
const CASES = {
    ojs: {id: 4, onRole: 'Section editor', editor: 'Minoti Inoue', author: 'Alan Mwandenga', control: 'Carlo Corino', n1: 'Catherine Kwantes', n2: 'Diaga Diouf', roleOff: false},
    omp: {id: 3, onRole: 'Series editor', editor: 'Minoti Inoue', author: 'Arthur Clark', control: 'Alvin Finkel', n1: 'Bart Beaty', n2: 'Chantal Allan', roleOff: false},
    ops: {id: 1, onRole: 'Moderator', editor: 'Minoti Inoue', author: 'Catherine Kwantes', control: 'Craig Montgomerie', n1: 'Diaga Diouf', n2: 'Dana Phillips', roleOff: true},
};

/** Open the submission's workflow from the editorial dashboard's address; returns the Participants panel. */
async function openWorkflow(page, app, id) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath);
    // Leave the page first: a goto that changes only the query of the page already open reloads nothing.
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await panel.heading().waitFor({timeout: 60_000});
    await idle(page);
    return panel;
}

/** One box of the "Assign Participant" window: whether it is shown and whether it is ticked. */
async function box(locator) {
    return {shown: await locator.isVisible(), ticked: await locator.isChecked(), disabled: await locator.isDisabled()};
}

/** Both boxes of the "Assign Participant" window. */
async function boxes(win) {
    return {permissions: await box(win.metadataBox()), assignmentPrivileges: await box(win.recommendOnlyBox())};
}

/** Choose a role in the role list and press "Search". */
async function roleAndSearch(win, role) {
    await win.chooseRole(role);
    await win.search();
}

/** Press the window's "OK"; returns what the form posted for the person, the role and the two boxes. */
async function pressOk(page, win) {
    const asked = page.waitForRequest((r) => r.url().includes('save-participant'), {timeout: T});
    const answered = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
    await win.root.getByRole('button', {name: 'OK', exact: true}).click();
    const post = new URLSearchParams((await asked).postData() || '');
    const response = await answered;
    await win.expectClosed();
    await idle(page);
    return {
        status: response.status(),
        userGroupId: post.get('userGroupId'),
        userId: post.get('userId'),
        canChangeMetadata: post.get('canChangeMetadata'),
        recommendOnly: post.get('recommendOnly'),
    };
}

/** A row's "More Actions" > "Edit": the "Edit Assignment" window's text and its "Permissions" box; then "Cancel". */
async function editShows(page, panel, name, role) {
    await panel.reland();
    await idle(page);
    const win = await panel.openEdit(name, role);
    const out = {text: (await win.form().innerText()).replace(/\n\s*\n+/g, '\n').trim()};
    const metadata = win.metadataBox();
    out.permissions = (await metadata.count()) ? {shown: await metadata.isVisible(), ticked: await metadata.isChecked()} : {shown: false};
    return {out, win};
}

/**
 * Settings > Users & Roles > "Roles": the role's "Settings" > "Edit", set "Permit submission
 * metadata edit." and press "OK". Returns the box's state before.
 */
async function setRolePermit(page, app, roleName, on) {
    const {RoleOptionsForm} = require('../../../pages/StageParticipantsPages.js');
    const form = new RoleOptionsForm(page, app.contextPath);
    await form.gotoRoles();
    await form.openRole(roleName);
    const permit = form.root.locator('input[name="permitMetadataEdit"]');
    const before = await permit.isChecked();
    await permit.setChecked(on);
    await form.save();
    return before;
}

/** The submission's assignments as stored: username|role id|recommend_only|can_change_metadata. */
function stored(app, id) {
    return sql(
        app,
        `select u.username, ug.role_id, sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id = sa.user_id join user_groups ug on ug.user_group_id = sa.user_group_id where sa.submission_id = ${Number(id)} order by sa.stage_assignment_id`
    )
        .split('\n')
        .filter(Boolean);
}

module.exports = {T, CASES, openWorkflow, boxes, roleAndSearch, pressOk, editShows, setRolePermit, stored};
