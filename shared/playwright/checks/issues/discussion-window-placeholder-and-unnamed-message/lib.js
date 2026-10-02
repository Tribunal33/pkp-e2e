// Helpers for the U37 A2 and A21 walks: the "Add"/"Edit" window of a stage's "Tasks & Discussions"
// panel and Settings › Workflow's task template window. Requiring this file runs nothing.
const {idle} = require('../../../probe');

/** Per app: the default dataset's submission in Production that `dbarnes` opens. */
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
/** Per app: a second participant of that submission's Production stage (a discussion needs two). */
const SECOND = {ojs: 'dbuskins', omp: 'gcox', ops: 'dbuskins'};
const PANEL = 'Production Tasks & Discussions';

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** As the signed-in user: the submission's Production stage; returns the panel. */
async function openPanel(app, page) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(SUBMISSION[app.name], 'workflow_5');
    await idle(page);
    return panel;
}

/** A side window's header as shown: its title, the lines under it, the badge (innerText lines). */
async function header(root) {
    const box = root.locator('[data-cy="sidemodal-header"]');
    const lines = (await box.innerText()).split('\n').map(flat).filter(Boolean);
    return lines;
}

/**
 * The error box beside "Cancel"/"Save" (`.pkpFormErrors`): its shown line, the screen-reader
 * list's buttons by accessible name, and the box's aria snapshot.
 */
async function errorList(root) {
    const box = root.locator('.pkpFormErrors');
    await box.waitFor({state: 'attached', timeout: 15_000}).catch(() => null);
    if (!(await box.count())) return {shown: false};
    const buttons = await box.locator('ul button').evaluateAll((bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
    const line = await box.evaluate((el) =>
        [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim()
    );
    const aria = await box.ariaSnapshot().catch(() => null);
    return {shown: true, line, buttons, aria};
}

/** The message box's own label (`<label for>` of the description control), or null. */
async function messageLabel(root) {
    const id = await root.locator('textarea[id$="-description-control"]').getAttribute('id');
    const label = root.locator(`label[for="${id}"]`);
    return (await label.count()) ? flat(await label.innerText()) : null;
}

/** Empty the TinyMCE message box of a window. */
async function emptyMessage(page, root) {
    const id = await root.locator('textarea[id$="-description-control"]').getAttribute('id');
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
}

module.exports = {SUBMISSION, SECOND, PANEL, flat, openPanel, header, errorList, messageLabel, emptyMessage};
