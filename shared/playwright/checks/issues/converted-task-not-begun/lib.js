// Helpers of walk.js and neighbour.js here (issue reports docs/issues/U37-A25-converted-task-not-begun.md,
// docs/issues/U37-A28-converted-task-history-says-task-created.md, docs/issues/U37-A28-task-first-owner-server-warning.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, on PKP's default test dataset.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, screen, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: the dataset's submission in Production, opened by dbarnes. */
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const PANEL = 'Production Tasks & Discussions';
const MENU_KEY = 'workflow_5';
/** Per app: the second participant a discussion needs ("At least two participants are required for a discussion."). */
const SECOND = {ojs: 'gcox', omp: 'gcox', ops: 'dbuskins'};

/** The server's date today, seven days on, in the fleet's time zone. */
function serverDates(app) {
    const config = fs.readFileSync(path.resolve(__dirname, '../../../../..', app.configFile), 'utf8');
    const tz = ((config.match(/^\s*time_zone\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1] || 'UTC').trim();
    const out = execFileSync('php', ['-r', `date_default_timezone_set(${JSON.stringify(tz)}); echo date('Y-m-d'), ' ', date('Y-m-d', strtotime('+7 days'));`], {encoding: 'utf8'}).trim();
    const [today, inAWeek] = out.split(' ');
    return {tz, today, inAWeek};
}

/** The fleet's PHP server log, and a reader of what it gained since `mark()`. */
function serverLog(app) {
    const file = path.resolve(__dirname, '../../../../..', 'apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    let offset = 0;
    const size = () => (fs.existsSync(file) ? fs.statSync(file).size : 0);
    return {
        file,
        mark() {
            offset = size();
        },
        /** PHP warnings, notices and errors logged since the mark. */
        since() {
            if (!fs.existsSync(file)) return [];
            const fd = fs.openSync(file, 'r');
            const len = size() - offset;
            const buf = Buffer.alloc(Math.max(0, len));
            fs.readSync(fd, buf, 0, buf.length, offset);
            fs.closeSync(fd);
            return buf.toString('utf8').split('\n').filter((l) => /PHP (Warning|Notice|Deprecated|Fatal|Parse)|Stack trace/.test(l)).map((l) => l.replace(/^\[[^\]]*\]\s*/, '').trim());
        },
    };
}

/** Open the submission's workflow at Production; returns the panel. */
async function openPanel(page, app) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(SUBMISSION[app.name], MENU_KEY);
    await idle(page);
    return panel;
}

/** "Add": name, dbarnes and `second` ticked as participants, the message; "Enter task information" left as `task` says. */
async function addItem(page, panel, {name, message, second, task = null}) {
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    const participants = await win.participants();
    await win.tick('dbarnes');
    const offered = (await win.participantUsernames()).filter((u) => u && u !== 'dbarnes');
    const other = offered.includes(second) ? second : offered[0];
    await win.tick(other);
    if (task) {
        await win.taskBox().check();
        await win.dueDate().fill(task.dateDue);
        await win.ownerRadio(task.owner || 'dbarnes').check();
        if (task.start) await win.startSelect().selectOption({label: task.start});
    }
    await win.typeMessage(message);
    await win.saveExpectClosed();
    await idle(page);
    return {participants, second: other};
}

/** The start drop-down as shown: its chosen label, whether it is greyed, and its options. */
async function readStartSelect(win) {
    const select = win.startSelect();
    if (!(await select.count()) || !(await select.isVisible())) return {shown: false};
    return {
        shown: true,
        label: await win.startSelectLabel(),
        disabled: await select.isDisabled(),
        options: (await select.locator('option').allInnerTexts()).map((o) => flat(o)),
    };
}

/**
 * Turn the discussion `name` into a task: row menu › `entry` ("Add Task Details" or "Edit"); for "Edit",
 * tick "Enter task information". Read the drop-down, set the due date and the owner, choose `start` in the
 * drop-down when given (only possible where it is not greyed), "Save".
 */
async function convert(page, panel, name, {entry, dateDue, owner = 'dbarnes', start = null, label}) {
    await panel.reland();
    const win = await panel.openEdit(name, entry);
    const before = {taskBoxChecked: await win.taskBox().isChecked(), taskBoxDisabled: await win.taskBox().isDisabled()};
    if (!before.taskBoxChecked) await win.taskBox().check();
    await win.dueDate().fill(dateDue);
    await win.ownerRadio(owner).check();
    const select = await readStartSelect(win);
    let chose = null;
    if (start) {
        if (select.shown && !select.disabled) {
            await win.startSelect().selectOption({label: start});
            chose = start;
        } else chose = 'greyed: not chosen';
    }
    record(`${label}-window`, await screen(page));
    const answer = await win.saveAndAnswer();
    const status = answer.status();
    // the start request, when the window sends one, follows the save
    await idle(page);
    await sleep(1000);
    return {before, select, chose, saveStatus: status};
}

/** Land afresh and read the row: its group, type word, owner line, "Activity", and the "Started" box. */
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
    const started = panel.startedBox(name);
    return {
        group,
        type: flat(await panel.typeWord(name).innerText()),
        ownerLine: flat(await panel.ownerLine(name).innerText()),
        activity: flat(await panel.activityCell(name).innerText()),
        started: (await started.count()) ? {checked: await started.isChecked(), disabled: await started.isDisabled()} : null,
    };
}

/** Row menu › "History": every line, newest first; close it. */
async function readHistory(page, panel, name, label) {
    await panel.reland();
    const history = await panel.openHistory(name);
    const entries = await history.entries();
    record(`${label}-history`, await screen(page));
    await history.close();
    return entries.map((e) => e.event);
}

/** Row menu › "Edit" on an item that is already a task: the drop-down as shown; "Cancel". */
async function readEditSelect(page, panel, name, label) {
    await panel.reland();
    const win = await panel.openEdit(name, 'Edit');
    const select = await readStartSelect(win);
    record(`${label}-edit-window`, await screen(page));
    await win.cancelUntouched();
    return select;
}

/**
 * Row menu › "Edit" on a task: tick `username` as a participant, make them the owner, "Save".
 * Returns the save's status.
 */
async function reassign(page, panel, name, username) {
    await panel.reland();
    const win = await panel.openEdit(name, 'Edit');
    await win.tick(username, true);
    await win.ownerRadio(username).check();
    const answer = await win.saveAndAnswer();
    await idle(page);
    return answer.status();
}

/** The first participant offered in "Add" other than dbarnes (a second owner for a reassignment). */
async function otherParticipant(page, panel) {
    const win = await panel.openAdd();
    const names = (await win.participantUsernames()).filter((u) => u && u !== 'dbarnes');
    await win.cancelUntouched();
    return names[0] || null;
}

module.exports = {sleep, flat, SUBMISSION, PANEL, MENU_KEY, SECOND, serverDates, serverLog, openPanel, addItem, readStartSelect, convert, readRow, readHistory, readEditSelect, reassign, otherParticipant};
