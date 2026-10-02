// Helpers of walk.js and neighbour.js here (issue report docs/issues/U37-A26-no-answer-box-screen-reader-opposite-state.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, on PKP's default test dataset.
const {idle, screen, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: the dataset's submission in Production, opened by dbarnes. */
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const PANEL = 'Production Tasks & Discussions';
const MENU_KEY = 'workflow_5';
/** Per app: the template and stage group of the "Auto-add at stage" box. */
const TEMPLATE = {
    ojs: {name: 'Discussion (Submission)', stage: 'Submission Stage'},
    omp: {name: 'Discussion (Submission)', stage: 'Submission Stage'},
    ops: {name: 'Discussion (Production)', stage: 'Production Stage'},
};

/** A date `days` from today, year-month-day. */
function dayFromToday(days) {
    const d = new Date(Date.now() + days * 86400_000);
    return d.toISOString().slice(0, 10);
}

/**
 * A row box as the eye and the screen reader get it: `looks` from the icon drawn beside the box
 * (ui-library CheckboxTicked starts its path "M18.75", Checkbox "M19.5"), `hears` from the accessibility
 * tree (the input's checked state, as Playwright and a screen reader read it), and the cell's aria snapshot.
 */
async function readBox(cell) {
    const input = cell.locator('input[type="checkbox"]');
    const d = await cell.locator('svg path').first().getAttribute('d').catch(() => null);
    const looks = d == null ? null : d.startsWith('M18.75') ? 'ticked' : d.startsWith('M19.5') ? 'empty' : `other:${d.slice(0, 12)}`;
    const hears = (await input.isChecked()) ? 'checked' : 'not checked';
    const aria = flat(await cell.ariaSnapshot().catch(() => null), 300);
    return {looks, hears, disabled: await input.isDisabled(), aria};
}

/** Open the submission's workflow at Production; returns the panel. */
async function openPanel(page, app) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(SUBMISSION[app.name], MENU_KEY);
    await idle(page);
    return panel;
}

/**
 * "Add": name; the participants as offered, dbarnes ticked when he is not, and for a discussion (which needs two)
 * the first other participant listed; message; a task as `task` says; "Save". Returns the ticked usernames.
 */
async function addItem(page, panel, {name, message, task = null}) {
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    const offered = await win.participantUsernames();
    if (!(await win.participantBox('dbarnes').isChecked())) await win.tick('dbarnes');
    if (!task && (await win.checkedParticipantBoxes().count()) < 2) await win.tick(offered.find((u) => u !== 'dbarnes'));
    if (task) {
        await win.taskBox().check();
        await win.dueDate().fill(task.dateDue);
        await win.ownerRadio(task.owner || 'dbarnes').check();
        if (task.start) await win.startSelect().selectOption({label: task.start});
    }
    await win.typeMessage(message);
    const ticked = [];
    for (const u of offered) if (await win.participantBox(u).isChecked()) ticked.push(u);
    await win.saveExpectClosed();
    await idle(page);
    return {offered, ticked};
}

/** The row's group ("Yet to begin", "In progress", "Closed"). */
async function rowGroup(panel, name) {
    const row = panel.row(name).first();
    await row.waitFor({timeout: 30_000});
    return row.evaluate((tr) => {
        let el = tr.previousElementSibling;
        while (el && !el.querySelector('th[scope="rowgroup"]')) el = el.previousElementSibling;
        return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
}

/** The row's "Started" (td 3) or "Closed" (td 4) cell. */
function rowCell(panel, name, column) {
    return panel.row(name).locator('td').nth(column === 'Started' ? 3 : 4);
}

/**
 * Count the requests a press and its answer send to the tasks and templates API (a "No" must send none).
 * Returns a stop() that gives the list.
 */
function watchSaves(page) {
    const seen = [];
    const on = (req) => {
        const u = new URL(req.url());
        if (req.method() !== 'GET' && /\/(tasks|editTaskTemplates|taskTemplates)\b/.test(u.pathname + u.search)) seen.push(`${req.method()} ${u.pathname}`);
    };
    page.on('request', on);
    return () => {
        page.off('request', on);
        return seen;
    };
}

/** Press a row box, read the question, answer it, and read the box. */
async function rowBoxAnswer(page, panel, name, column, title, answer, label) {
    const {QuestionDialog} = require('../../../pages/TasksDiscussionsPages.js');
    const cell = rowCell(panel, name, column);
    const before = await readBox(cell);
    const stop = watchSaves(page);
    await panel.pressBox(name, column);
    const q = new QuestionDialog(page, title);
    await q.expectOpen();
    const sentence = flat(await q.root.innerText(), 300);
    if (answer === 'Yes') await panel.answerRowQuestion(title, 'Yes');
    else await q.answer(answer);
    await idle(page);
    await sleep(800);
    const after = await readBox(rowCell(panel, name, column));
    const group = await rowGroup(panel, name);
    record(`${label}`, await screen(page));
    return {before, question: sentence, answer, after, group, saves: stop()};
}

/** Settings › Workflow › "Tasks and Discussions": the tab, landed. */
async function openTemplates(page, app) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    return tab;
}

/** The template row's "Auto-add at stage" cell (the td holding the box). */
function autoAddCell(tab, app) {
    const {name, stage} = TEMPLATE[app.name];
    return tab.row(name, stage).locator('td').filter({has: tab.page.locator('input[type="checkbox"]')}).first();
}

/** Press the template's "Auto-add at stage" box, read the question, answer it (or `Escape`), read the box. */
async function autoAddAnswer(page, tab, app, answer, label) {
    const {name, stage} = TEMPLATE[app.name];
    const before = await readBox(autoAddCell(tab, app));
    const stop = watchSaves(page);
    const q = await tab.pressAutoAdd(name, stage);
    const sentence = flat(await q.root.innerText(), 300);
    if (answer === 'Escape') {
        await page.keyboard.press('Escape');
        await q.root.waitFor({state: 'detached', timeout: 30_000});
    } else {
        await q.answer(answer);
    }
    await idle(page);
    await sleep(800);
    const after = await readBox(autoAddCell(tab, app));
    const shot = await screen(page);
    record(label, shot);
    return {before, question: sentence, answer, after, notices: shot.notices || null, saves: stop()};
}

module.exports = {sleep, flat, SUBMISSION, PANEL, MENU_KEY, TEMPLATE, dayFromToday, readBox, openPanel, addItem, rowGroup, rowCell, watchSaves, rowBoxAnswer, openTemplates, autoAddCell, autoAddAnswer};
