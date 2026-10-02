// Helpers of walk.js (issue report docs/issues/U54-A10-role-name-of-spaces-breaks-window.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads the screen.
const {idle} = require('../../../probe');

/** Per app, on PKP's default test dataset: the stage ticked for the new role, the role whose window is edited and its abbreviation. */
const CASES = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], ticked: 'Copyediting', edited: 'Copyeditor', abbrev: 'CE'},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], ticked: 'Copyediting', edited: 'Copyeditor', abbrev: 'CE'},
    ops: {stages: ['Production'], ticked: 'Production', edited: 'Author', abbrev: 'AU'},
};

const SPACES = '   ';

/** The Roles tab page object for this app (required inside forEachApp's fn). */
function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    return new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages});
}

/** What the open role window shows: its top notice, the messages under its boxes, its stage boxes, its level, the role id it carries. */
async function windowState(win) {
    const form = win.form;
    const flat = (t) => (t || '').replace(/\s+/g, ' ').trim();
    if ((await form.count()) === 0) {
        return {open: false};
    }
    return {
        open: true,
        topNotice: flat(await form.locator('#userGroupFormNotification, .pkp_notification').first().innerText().catch(() => '')),
        fieldMessages: (await form.locator('label.error:visible').allInnerTexts()).map(flat),
        stageBoxes: await win.stageBoxes().count(),
        stageLabels: (await form.locator('#userGroupStageContainer label').allInnerTexts()).map(flat).filter(Boolean),
        level: flat(await win.level.locator('option:checked').innerText().catch(() => '')),
        levelDisabled: await win.level.isDisabled().catch(() => null),
        hiddenRoleId: await form.locator('input[name="userGroupId"]').getAttribute('value').catch(() => null),
        name: await win.nameBox().inputValue().catch(() => null),
        abbrev: await win.abbrevBox().inputValue().catch(() => null),
    };
}

/**
 * Press the window's "OK" and see what follows: the update-user-group request (its post: whether it
 * carries the role id, the name and abbreviation), its answer (status, and the JSON's status/event or
 * whether it holds the form again), whether the browser left the page, and the page's script errors.
 */
async function pressOk(page, win) {
    const errors = [];
    const onError = (e) => errors.push(String(e.message || e).split('\n')[0]);
    page.on('pageerror', onError);
    const urlBefore = page.url();
    const request = page.waitForRequest((r) => r.url().includes('update-user-group'), {timeout: 15_000}).catch(() => null);
    const response = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 15_000}).catch(() => null);
    await win.okButton.click();
    const [req, res] = await Promise.all([request, response]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    page.off('pageerror', onError);
    const out = {sent: !!req, errors, urlBefore, urlAfter: page.url(), leftPage: page.url() !== urlBefore};
    if (req) {
        const post = new URLSearchParams(req.postData() || '');
        out.request = {
            xhr: req.resourceType() === 'xhr' || req.resourceType() === 'fetch',
            type: req.resourceType(),
            userGroupId: post.has('userGroupId') ? post.get('userGroupId') : null,
            roleId: post.has('roleId') ? post.get('roleId') : null,
            name: post.get('name[en]'),
            abbrev: post.get('abbrev[en]'),
            stages: post.getAll('assignedStages[]'),
        };
    }
    if (res) {
        out.status = res.status();
        const body = await res.text().catch(() => '');
        try {
            const json = JSON.parse(body);
            out.answer = {status: json.status, event: json.event || null, formAgain: typeof json.content === 'string' && json.content.includes('userGroupForm')};
        } catch {
            out.answer = {raw: body.slice(0, 300)};
        }
    }
    if (out.leftPage) {
        out.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
    }
    return out;
}

/** The list's visible names, the role a step names among them, and how many rows carry a name. */
async function listed(tab, ...names) {
    const all = await tab.rowNames();
    return {count: all.length, found: Object.fromEntries(names.map((n) => [n, all.filter((x) => x === n).length]))};
}

const LEVEL = 'Assistant';

module.exports = {CASES, SPACES, LEVEL, rolesTab, windowState, pressOk, listed};
