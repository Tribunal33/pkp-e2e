// Helpers of walk.js here (issue report docs/issues/U54-A2-manager-role-row-shows-no-stage.md).
// Requiring this file runs nothing. Every helper drives Settings > Users & Roles > "Roles", the
// workflow's "Assign Participant" window and the workflow menu as a person does.
const {idle, sql} = require('../../../probe');

/**
 * Per app, on PKP's default test dataset: the stage columns, the manager role and the editor role
 * (both at the manager level), a submission in the Submission stage and one in Production.
 */
const CASES = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], manager: 'Journal manager', editor: 'Journal editor', inSubmission: 4, inProduction: 5},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], manager: 'Press manager', editor: 'Press editor', inSubmission: 3, inProduction: 4},
    ops: {stages: ['Production'], manager: 'Preprint Server manager', editor: null, inSubmission: null, inProduction: 1},
};

/** The "Roles" tab of Settings > Users & Roles, opened. */
async function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages});
    await tab.goto();
    return tab;
}

/** Every visible row: {name: {ticked: [stages], greyed: bool}}. */
async function rowsState(tab) {
    const out = {};
    for (const name of await tab.rowNames()) {
        const states = await tab.boxStates(name);
        out[name] = {
            ticked: Object.entries(states).filter(([, s]) => s && s.checked).map(([stage]) => stage),
            greyed: Object.values(states).every((s) => s && s.disabled),
        };
    }
    return out;
}

/** "Search", then each stage under "List roles assigned to": the rows listed. */
async function stageFilterLists(tab) {
    const out = {};
    for (const stage of tab.stages) {
        await tab.chooseFilter('stage', stage);
        out[stage] = await tab.rowNames();
    }
    return out;
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

/**
 * The signed-in user opens the submission's workflow and each stage entry of its menu
 * ("Submission", "Review Round 1", "Copyediting", "Production"); returns per entry whether the
 * window refused it ("You don't currently have access to that stage of the workflow.").
 */
async function stageAccess(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const dialog = page.getByRole('dialog').first();
    await dialog.waitFor({timeout: 60_000});
    await idle(page);
    const links = dialog.getByRole('navigation').getByRole('link');
    const labels = (await links.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const out = [];
    for (let i = 0; i < labels.length; i++) {
        if (!/^(Submission|Review Round \d+|Copyediting|Production)$/.test(labels[i])) {
            continue;
        }
        await links.nth(i).click();
        await idle(page);
        await page.waitForFunction(() => !document.body.innerText.includes('Refreshing data'), null, {timeout: 30_000}).catch(() => {});
        const text = await dialog.innerText();
        out.push({entry: labels[i], refused: text.includes("You don't currently have access to that stage of the workflow.")});
    }
    return out;
}

/** A role's stages as stored: stage ids, by its English name. */
function storedStages(app, name) {
    return sql(
        app,
        `select string_agg(us.stage_id::text, ',' order by us.stage_id) from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' left join user_group_stage us on us.user_group_id = ug.user_group_id where s.setting_value = '${name.replace(/'/g, "''")}' group by ug.user_group_id`
    ).trim();
}

module.exports = {CASES, rolesTab, rowsState, stageFilterLists, assignRoles, stageAccess, storedStages};
