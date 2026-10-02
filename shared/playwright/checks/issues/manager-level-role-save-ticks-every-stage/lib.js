// Helpers of walk.js here (issue report docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md).
// Requiring this file runs nothing. Every helper drives Settings > Users & Roles > "Roles" and the
// workflow's "Assign Participant" window as a person does.
const {idle, sql} = require('../../../probe');

/** Per app, on PKP's default test dataset: a submission in the Submission stage and the stage columns. */
const CASES = {
    ojs: {id: 4, stages: ['Submission', 'Review', 'Copyediting', 'Production'], managerLevel: 'Journal Manager'},
    omp: {id: 3, stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], managerLevel: 'Press Manager'},
};

/** The "Roles" tab of Settings > Users & Roles, opened. */
async function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages});
    await tab.goto();
    return tab;
}

/** The stages a row has ticked, in column order. */
async function ticked(tab, name) {
    const states = await tab.boxStates(name);
    return Object.entries(states).filter(([, s]) => s.checked).map(([stage]) => stage);
}

/** Every stage box of a row greyed out? */
async function allGreyed(tab, name) {
    return Object.values(await tab.boxStates(name)).every((s) => s.disabled);
}

/**
 * Press the window's "OK"; returns the update-user-group post's stage fields, the answer's status
 * and the notices shown.
 */
async function saveWindow(page, win) {
    const asked = page.waitForRequest((r) => r.url().includes('update-user-group'), {timeout: 30_000});
    const response = await win.save();
    const post = new URLSearchParams((await asked).postData() || '');
    return {status: response.status(), postedStages: post.getAll('assignedStages[]'), postedRoleId: post.get('roleId')};
}

/** The submission's workflow, "Assign": the role list's labels; then "Cancel". */
async function assignRoles(page, app, id) {
    const {openWorkflow} = require('../permissions-tick-carries-to-other-role/lib.js');
    const panel = await openWorkflow(page, app, id);
    const win = await panel.openAssign();
    await idle(page);
    const roles = await win.roleOptions();
    await win.cancel();
    return roles;
}

/** A role's stages as stored: stage ids, by its English name. */
function storedStages(app, name) {
    return sql(
        app,
        `select string_agg(us.stage_id::text, ',' order by us.stage_id) from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' left join user_group_stage us on us.user_group_id = ug.user_group_id where s.setting_value = '${name.replace(/'/g, "''")}' group by ug.user_group_id`
    ).trim();
}

/** Per app, for access.js: a submission past review with a double-anonymous round, and the person given the role. */
const ACCESS = {
    ojs: {id: 5, hosted: 'Hosted Journals', person: 'svogt', personName: 'Sarah Vogt'},
    omp: {id: 13, hosted: 'Hosted Presses', person: 'svogt', personName: 'Sarah Vogt'},
};

/**
 * As the site administrator: Administration > Hosted Journals (Presses), the context's
 * "Settings wizard", tab "Users", search the username, "Edit User", tick the role, "OK".
 */
async function giveRoleAsAdmin(page, app, {username, role}) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: ACCESS[app.name].hosted});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: username});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    await win.roleBox(role).check();
    await win.pressOk();
    await win.expectClosed();
    await idle(page);
}

/** The submission's workflow, "Assign": the role, "Search", the person, "OK"; returns the post's answer. */
async function assignAs(page, app, id, {role, personName}) {
    const {openWorkflow, pressOk} = require('../permissions-tick-carries-to-other-role/lib.js');
    const panel = await openWorkflow(page, app, id);
    const win = await panel.openAssign();
    await idle(page);
    await win.chooseRole(role);
    await win.search();
    await win.choosePerson(personName);
    return pressOk(page, win);
}

/**
 * The signed-in user opens the submission's workflow and each workflow menu entry named
 * (`nth` picks among entries of the same label, e.g. OMP's two "Review Round 1"); returns
 * what the workflow window reads after each.
 */
async function stageTexts(page, app, id, entries) {
    const out = {};
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const dialog = page.getByRole('dialog').first();
    await dialog.waitFor({timeout: 60_000});
    await idle(page);
    out.opened = (await dialog.innerText()).replace(/\n\s*\n+/g, '\n').trim();
    for (const {label, nth = 0, key} of entries) {
        const link = dialog.getByRole('navigation').getByRole('link', {name: label, exact: true});
        if ((await link.count()) <= nth) {
            out[key] = '(no such menu entry)';
            continue;
        }
        await link.nth(nth).click();
        await idle(page);
        await page.waitForFunction(() => !document.body.innerText.includes('Refreshing data'), null, {timeout: 30_000}).catch(() => {});
        out[key] = (await dialog.innerText()).replace(/\n\s*\n+/g, '\n').trim();
    }
    return out;
}

module.exports = {CASES, ACCESS, rolesTab, ticked, allGreyed, saveWindow, assignRoles, storedStages, giveRoleAsAdmin, assignAs, stageTexts};
