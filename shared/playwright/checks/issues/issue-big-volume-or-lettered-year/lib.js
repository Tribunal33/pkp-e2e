// Helpers for the "Create Issue" form's "Volume" and "Year" (U50 A5, A6), shared by walk.js and
// neighbour.js. Requiring this file runs nothing. Page objects are required inside the functions
// (probe kit: a suite page object is required inside forEachApp's callback).
const fs = require('fs');
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Record the screen and a full-page picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

function issuesPage(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/** The fleet server's log file (apps/<app>/playwright/.server-logs/server-<port>-*.log) and its size now. */
function serverLog(app) {
    const dir = path.resolve(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs');
    const name = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => f.startsWith(`server-${app.port}-`)) : null;
    const file = name ? path.join(dir, name) : null;
    return {file, size: file ? fs.statSync(file).size : 0};
}

/** The log lines written since `mark` (from serverLog()) that name an error. */
function serverErrorsSince(mark) {
    if (!mark.file) return [];
    const fd = fs.openSync(mark.file, 'r');
    const size = fs.statSync(mark.file).size;
    const buf = Buffer.alloc(Math.max(0, size - mark.size));
    fs.readSync(fd, buf, 0, buf.length, mark.size);
    fs.closeSync(fd);
    return buf.toString('utf8').split('\n').filter((l) => /error|exception|SQLSTATE/i.test(l)).map((l) => l.slice(0, 600));
}

/**
 * Issues › "Future Issues" › "Create Issue": type `volume`, `number`, `year`, untick "Title", press
 * "Save". Returns the save's status, whether the window is still open, the messages under the boxes,
 * the notices shown, and "Future Issues"' names after it.
 */
async function createIssue(page, contextPath, {volume, number, year}, label) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Future Issues');
    const {dialog, form} = await issues.openCreate();
    await form.volumeBox().fill(volume);
    await form.numberBox().fill(number);
    await form.yearBox().fill(year);
    await form.showBox('Title').uncheck();
    const typed = {volume: await form.volumeBox().inputValue(), number: await form.numberBox().inputValue(), year: await form.yearBox().inputValue()};
    const response = await form.save();
    await idle(page).catch(() => {});
    await page.waitForTimeout(500); // a refused legacy form's re-render; bounded, read once
    const open = await dialog.isVisible();
    const fieldErrors = open ? (await form.fieldErrors().allInnerTexts()).map(flat).filter(Boolean) : [];
    const s = await screen(page);
    record(`${label}-after-save`, s);
    await shot(page, `${label}-after-save`).catch(() => {});
    if (open) await form.cancelLink().click();
    await issues.goto('Future Issues');
    const names = (await issues.names('Future Issues').allInnerTexts()).map(flat);
    await snap(page, `${label}-future`);
    return {typed, status: response.status(), windowOpen: open, fieldErrors, notices: s.notices, futureIssues: names};
}

/** The row's "Edit" › "Issue Data": what "Volume", "Number", "Year" show. */
async function issueData(page, contextPath, name, label) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Future Issues');
    const win = await issues.openManagement('Future Issues', name);
    const form = await win.openData();
    const out = {volume: await form.volumeBox().inputValue(), number: await form.numberBox().inputValue(), year: await form.yearBox().inputValue()};
    await snap(page, `${label}-issue-data`);
    return out;
}

/** The row's "Edit" › "Issue Data" › "Save" with nothing changed: the save's status and the list after it. */
async function resaveIssueData(page, contextPath, name, label) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Future Issues');
    const win = await issues.openManagement('Future Issues', name);
    const form = await win.openData();
    const response = await form.save();
    await idle(page).catch(() => {});
    const s = await screen(page);
    record(`${label}-after-save`, s);
    const fieldErrors = (await form.fieldErrors().allInnerTexts().catch(() => [])).map(flat).filter(Boolean);
    await issues.goto('Future Issues');
    const names = (await issues.names('Future Issues').allInnerTexts()).map(flat);
    return {status: response.status(), fieldErrors, notices: s.notices, futureIssues: names};
}

module.exports = {flat, snap, serverLog, serverErrorsSince, createIssue, issueData, resaveIssueData};
