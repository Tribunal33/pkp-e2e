// Helpers for "Issue Data" and the time of day of an issue's Date Published (U50 A19), shared by
// walk.js and neighbour.js. Requiring this file runs nothing. Page objects are required inside the
// functions (probe kit: a suite page object is required inside forEachApp's callback).
const {screen, record, shot, sql} = require('../../../probe');

const T = 20_000;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Record the screen and a full-page picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

function issuesAdmin(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/** Issues › "Future Issues" › the row's arrow › "Publish Issue", the email box unticked, "OK". */
async function publishIssue(page, contextPath, name) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Future Issues');
    const win = await issues.openPublish(name);
    await win.mailBox().uncheck();
    await win.ok();
    await sleep(500);
}

/** Issues › "Future Issues" › "Create Issue": volume, number, year, title, "Save"; the save's status. */
async function createIssue(page, contextPath, {volume, number, year, title}) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Future Issues');
    const {form} = await issues.openCreate();
    await form.volumeBox().fill(String(volume));
    await form.numberBox().fill(String(number));
    await form.yearBox().fill(String(year));
    await form.titleBox().fill(title);
    const res = await form.save();
    await sleep(500);
    return res.status();
}

/** Issues › "Back Issues": each row as "{name} · {Published}", in order. */
async function backIssues(page, contextPath) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Back Issues');
    const names = (await issues.names('Back Issues').allInnerTexts()).map(flat);
    const out = [];
    for (const name of names) {
        out.push(`${name} · ${flat(await issues.published(name).innerText().catch(() => '?'))}`);
    }
    return out;
}

/**
 * Issues › `tab` ("Back Issues" by default) › the row's arrow › "Edit" › "Issue Data": the "Date
 * Published" box as shown; when `date` is given, typed in its place ('' empties it); then "Save". Returns the box, the save's
 * status and the notices the save raised.
 */
async function saveIssueData(page, contextPath, name, label, date, tab = 'Back Issues') {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto(tab);
    const win = await issues.openManagement(tab, name);
    const form = await win.openData();
    const box = await form.dateBox().inputValue();
    if (date !== undefined) await form.typeDate(date);
    await snap(page, `${label}-issue-data`);
    const status = (await form.save()).status();
    await sleep(500);
    await snap(page, `${label}-saved`);
    return {box, typed: date === undefined ? null : date, status};
}

/** The stored Date Published of the journal's issues (evidence beside the screens). */
function storedDates(app) {
    return sql(app, 'SELECT volume, number, year, published, date_published FROM issues ORDER BY issue_id')
        .split('\n').filter(Boolean);
}

/** The day before a `YYYY-MM-DD` day. */
function dayBefore(day) {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

module.exports = {T, flat, sleep, snap, issuesAdmin, publishIssue, createIssue, backIssues, saveIssueData, storedDates, dayBefore};
