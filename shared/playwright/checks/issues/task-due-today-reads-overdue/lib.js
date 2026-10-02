// Helpers of walk.js and neighbour.js here (issue report docs/issues/U37-A16-A17-task-due-today-or-closed-reads-overdue.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, on PKP's default test dataset.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {idle, screen, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: the dataset's submission in Production, opened by dbarnes. */
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const PANEL = 'Production Tasks & Discussions';
const MENU_KEY = 'workflow_5';

/** The server's time zone (the fleet's config `time_zone`) and its date today, read with the app's PHP. */
function serverToday(app) {
    const config = fs.readFileSync(path.resolve(__dirname, '../../../../..', app.configFile), 'utf8');
    const tz = ((config.match(/^\s*time_zone\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1] || 'UTC').trim();
    const today = execFileSync('php', ['-r', `date_default_timezone_set(${JSON.stringify(tz)}); echo date('Y-m-d H:i:s');`], {encoding: 'utf8'}).trim();
    return {tz, now: today, today: today.slice(0, 10)};
}

/** The browser's time zone and clock. */
async function browserClock(page) {
    return page.evaluate(() => ({tz: Intl.DateTimeFormat().resolvedOptions().timeZone, now: new Date().toString()}));
}

/** Open the submission's workflow at Production; returns the panel. */
async function openPanel(page, app) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(SUBMISSION[app.name], MENU_KEY);
    await idle(page);
    return panel;
}

/** "Add": a task named `name`, due `dateDue`, owned by dbarnes, begun on saving; "Save". */
async function addTask(page, panel, {name, dateDue, message}) {
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    await win.taskBox().check();
    await win.dueDate().fill(dateDue);
    await win.ownerRadio('dbarnes').check();
    await win.typeMessage(message);
    const filled = await screen(page);
    await win.saveExpectClosed();
    await idle(page);
    return {filled: flat(filled.text.dialog, 900)};
}

/** Land afresh and read the task's row: its group, "Activity" and "Due Date". */
async function readRow(page, panel, name) {
    await panel.reland();
    await idle(page);
    const row = panel.row(name);
    await row.first().waitFor({timeout: 30_000});
    const group = await row.first().evaluate((tr) => {
        let el = tr.previousElementSibling;
        while (el && !el.querySelector('th[scope="rowgroup"]')) el = el.previousElementSibling;
        return el ? el.innerText.trim() : null;
    });
    return {group, activity: flat(await panel.activityCell(name).innerText()), dueDate: flat(await panel.dueDateCell(name).innerText())};
}

/** Press the task's name and read the window's header (title and badge); close it. */
async function readWindow(page, panel, name, label) {
    const win = await panel.openItem(name);
    await idle(page);
    const header = flat(await win.header().innerText());
    record(`${label}-window`, await screen(page));
    await win.close();
    return {header, overdueBadge: await headerHas(header, 'Overdue')};
}
const headerHas = async (header, word) => new RegExp(`\\b${word}\\b`).test(header);

/** Row menu › "History": every line, newest first; close it. */
async function readHistory(page, panel, name, label) {
    await panel.reland();
    const history = await panel.openHistory(name);
    const entries = await history.entries();
    record(`${label}-history`, await screen(page));
    await history.close();
    return entries;
}

/** Press the row's "Closed" box and answer "Yes" to "Close this Task". */
async function closeTask(page, panel, name) {
    const {QuestionDialog} = require('../../../pages/TasksDiscussionsPages.js');
    await panel.reland();
    await panel.pressBox(name, 'Closed');
    const question = new QuestionDialog(page, 'Close this Task');
    await question.expectOpen();
    await panel.answerRowQuestion('Close this Task', 'Yes');
    await idle(page);
}

/** Read the row, the window and the History of a task in one go. */
async function readAll(page, panel, name, label) {
    const row = await readRow(page, panel, name);
    record(`${label}-panel`, await screen(page));
    const window_ = await readWindow(page, panel, name, label);
    const history = await readHistory(page, panel, name, label);
    return {row, window: window_, historyFirst: history[0] || null, history};
}

module.exports = {sleep, flat, SUBMISSION, PANEL, MENU_KEY, serverToday, browserClock, openPanel, addTask, readRow, readWindow, readHistory, closeTask, readAll};
