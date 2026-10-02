// Helpers for the U37 A5 walk (docs/issues/U37-A5-template-says-it-fills-participants.md):
// the "Add" window of a stage's "Tasks & Discussions" panel, a template pressed there, and a
// template limited to a role added under Settings › Workflow › "Tasks and Discussions".
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

/** Per app: the dataset submission and stage the walk opens, and the role the added template is limited to. */
const CASES = {
    ojs: {id: 3, menuKey: 'workflow_4', panel: 'Copyediting Tasks & Discussions', stage: 'Copyediting Stage', installed: 'Discussion (Copyediting)', role: 'Copyeditor'},
    omp: {id: 7, menuKey: 'workflow_4', panel: 'Copyediting Tasks & Discussions', stage: 'Copyediting Stage', installed: 'Discussion (Copyediting)', role: 'Copyeditor'},
    ops: {id: 1, menuKey: 'workflow_5', panel: 'Production Tasks & Discussions', stage: 'Production Stage', installed: 'Discussion (Production)', role: 'Moderator'},
};

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** As the signed-in user: open the submission's stage and press "Add"; returns the ItemWindow. */
async function openAddWindow(app, page) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const c = CASES[app.name];
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: c.panel});
    await panel.gotoEditorial(c.id, c.menuKey);
    const win = await panel.openAdd();
    await idle(page);
    return {panel, win};
}

/** The whole state of the "Add" window's form: Name, Participants (label, ticked), the message. */
async function formState(win) {
    return {
        name: await win.nameField().inputValue(),
        participants: await win.participants(),
        message: await win.messageText(),
        taskBox: await win.taskBox().isChecked().catch(() => null),
    };
}

/** The text of a template button (its name and the line under it, as the screen renders it). */
async function templateButtonText(win, name) {
    return flat(await win.templateButton('Discussion', name).innerText());
}

/**
 * Press a template and read the screen's own `…/tasks/fromTemplate/{id}` answer: its status and
 * the participants it names (userId, full name), then the form as it stands.
 */
async function pressTemplate(page, win, name) {
    const answered = page.waitForResponse((r) => r.url().includes('/tasks/fromTemplate/'), {timeout: 30_000});
    await win.templateButton('Discussion', name).click();
    const res = await answered;
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    await idle(page);
    await page.waitForTimeout(500);
    const named = (body?.participants || []).map((p) => ({userId: p.userId, name: p.fullName || p.name || null}));
    return {status: res.status(), answerParticipants: named, answerTitle: body?.title ?? null, form: await formState(win)};
}

/** Settings › Workflow › "Tasks and Discussions": the line above the table (read whole, so a changed text is read too). */
async function settingsLine(app, page) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    const text = await tab.panel().innerText();
    const line = text.split('\n').map(flat).find((l) => /^Use this space to create templates/.test(l)) || null;
    return {tab, line};
}

/**
 * On the Settings tab: the stage's "Add template", `name`, "Limit access to specific roles" with
 * `role` ticked, the message, "Save"; returns the stage's template names after the save.
 */
async function addLimitedTemplate(page, tab, stage, name, role, message) {
    const win = await tab.openAdd(stage);
    await win.nameField().fill(name);
    await win.radio('Limit access to specific roles').check();
    await win.roleBox(role).check();
    await win.typeMessage(message);
    await win.saveExpectClosed();
    await idle(page);
    return tab.templateNames(stage);
}

module.exports = {CASES, flat, openAddWindow, formState, templateButtonText, pressTemplate, settingsLine, addLimitedTemplate};
