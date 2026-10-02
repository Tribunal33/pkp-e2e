// Helpers for the U37 A4 walk (docs/issues/U37-A4-find-template-discussion-task-error.md):
// the "Add" window of a stage's "Tasks & Discussions" panel and its "Find Template" search.
// Requiring this file runs nothing.
const {idle, screen} = require('../../../probe');

/** Per app: the dataset submission whose Production stage the walk opens, and a control word. */
const WORDS = {
    ojs: {id: 5, stage: 'workflow_5', control: 'Galleys'},
    omp: {id: 4, stage: 'workflow_5', control: 'Galleys'},
    ops: {id: 1, stage: 'workflow_5', control: 'Assign'},
};
const PANEL = 'Production Tasks & Discussions';

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** As the signed-in user: open the submission's Production stage and press "Add"; returns the ItemWindow. */
async function openAddWindow(app, page) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = WORDS[app.name];
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(w.id, w.stage);
    const win = await panel.openAdd();
    await idle(page);
    return win;
}

/**
 * Type `phrase` into "Find Template", press Enter, and read what follows: the
 * editTaskTemplates requests with their status, the list (buttons or "No items
 * found."), and an "Error" window (its text), which is then answered "OK".
 */
async function search(page, win, phrase) {
    const calls = [];
    const onResponse = (r) => {
        if (/\/api\/v1\/editTaskTemplates\?/.test(r.url())) {
            calls.push({status: r.status(), query: new URL(r.url()).search});
        }
    };
    page.on('response', onResponse);
    const box = win.findTemplate();
    await box.fill(phrase);
    await box.press('Enter');
    await page.waitForResponse((r) => /\/api\/v1\/editTaskTemplates\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
    await idle(page);
    await page.waitForTimeout(800);
    const errorDialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    let error = null;
    if (await errorDialog.isVisible().catch(() => false)) {
        error = flat(await errorDialog.innerText());
    }
    const shot = await screen(page);
    const list = (await win.templateList().isVisible().catch(() => false)) ? await win.templateNames() : [];
    const noItems = await win.noTemplatesLine().isVisible().catch(() => false);
    if (error) {
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
        await idle(page);
    }
    page.off('response', onResponse);
    return {phrase, calls, error, list, noItems, screen: shot};
}

module.exports = {WORDS, PANEL, flat, openAddWindow, search};

/**
 * As the signed-in manager: Settings › Workflow › "Tasks and Discussions" › the Production group's
 * "Add template", a task template named `name` ("Enter task information" ticked, the first due
 * interval offered), saved.
 */
async function addTaskTemplate(app, page, name) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    const win = await tab.openAdd('Production Stage');
    await win.nameField().fill(name);
    await win.taskBox().check();
    const options = await win.dueSelect().locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (options.length) await win.dueSelect().selectOption(options[0]);
    await win.typeMessage(`${name} text`);
    await win.saveExpectClosed();
    await idle(page);
    return tab.templateNames('Production Stage');
}

module.exports.addTaskTemplate = addTaskTemplate;
