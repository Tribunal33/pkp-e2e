// Helpers of walk.js (issue report docs/issues/U54-A11-own-role-ok-removes-settings-access.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or types an address.
const {idle, sql} = require('../../../probe');

const DENIED = /The current role does not have access to this operation\./;
const BOX = 'Permit changes to Settings';

/**
 * Per app, on PKP's default test dataset: the manager-level role whose window is saved and the
 * user who holds it alone. OPS has no such role in the dataset ("Preprint Server manager" is the
 * first row of the list, which has no "Edit"), so the steps create one and invite the moderator.
 */
const CASES = {
    ojs: {role: 'Journal editor', user: 'dbarnes', neighbour: 'Production editor'},
    omp: {role: 'Press editor', user: 'dbarnes', neighbour: 'Production editor'},
    ops: {role: 'u54c manager', abbrev: 'U54C', level: 'Manager', user: 'dbuskins', email: 'dbuskins@mailinator.com', create: true},
};

/** Settings > Users & Roles, its "Roles" tab opened. */
async function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new RolesTab(page, app.contextPath, {stages: []});
    await tab.goto();
    return tab;
}

/** Settings > Users & Roles typed as an address: opened, or the access-denied page. */
async function usersAndRoles(page, app) {
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page);
    const body = await page.locator('body').innerText();
    return {
        status: response ? response.status() : null,
        denied: DENIED.test(body),
        rolesTab: (await page.getByRole('tab', {name: 'Roles', exact: true}).count()) > 0,
        heading: ((await page.locator('main h1, h1').first().innerText().catch(() => '')) || '').trim(),
    };
}

/** "Permit changes to Settings" in the window: {checked, disabled}. */
async function boxState(win) {
    const box = win.optionBox(BOX);
    return {checked: await box.isChecked(), disabled: await box.isDisabled()};
}

/** Press the window's "OK"; returns the answer's status, whether the post carried the box, and the notices. */
async function saveWindow(page, win) {
    const asked = page.waitForRequest((r) => r.url().includes('update-user-group'), {timeout: 30_000});
    const response = await win.save();
    const post = new URLSearchParams((await asked).postData() || '');
    return {status: response.status(), postedPermitSettings: post.has('permitSettings') ? post.get('permitSettings') : null};
}

/** A role's stored permit_settings, by its English name. */
function stored(app, name) {
    return sql(
        app,
        `select ug.permit_settings from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where s.setting_value = '${name.replace(/'/g, "''")}'`
    ).trim();
}

/** "Create New Role" at a level, name and abbreviation, "Permit changes to Settings" ticked, "OK". */
async function createRole(page, app, {name, abbrev, level}) {
    const tab = await rolesTab(page, app);
    const win = await tab.openCreate();
    await win.chooseLevel(level);
    await win.nameBox().fill(name);
    await win.abbrevBox().fill(abbrev);
    await win.optionBox(BOX).check();
    return saveWindow(page, win);
}

/**
 * From now on, record every browser dialog (accepted, as a person presses its "OK") and every
 * answer of the Roles list's redraw (user-group-grid/fetch-grid*): its status and body.
 * Returns {dialogs, grids, stop()}.
 */
function watch(page) {
    const seen = {dialogs: [], grids: []};
    const onDialog = async (d) => {
        seen.dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    };
    const onResponse = async (r) => {
        if (!/user-group-grid\/fetch-grid/.test(r.url())) return;
        const body = await r.text().catch(() => '');
        seen.grids.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), size: body.length, body: body.length < 400 ? body : null});
    };
    page.on('dialog', onDialog);
    page.on('response', onResponse);
    seen.stop = () => {
        page.off('dialog', onDialog);
        page.off('response', onResponse);
    };
    return seen;
}

module.exports = {DENIED, BOX, CASES, rolesTab, usersAndRoles, boxState, saveWindow, stored, createRole, watch};
