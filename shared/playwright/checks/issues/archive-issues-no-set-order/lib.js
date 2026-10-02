// Helpers for the reader's "Archives" order (U50 A13), shared by walk.js and neighbour.js.
// Requiring this file runs nothing. It reuses the helpers of two neighbouring issue walks.
const {idle, screen, record, shot} = require('../../../probe');
const {publishIssue} = require('../unpublish-back-issue-clears-current/lib');
const {createIssue} = require('../export-issues-list-no-order/lib');

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

/** Issues › "Back Issues": the issue names, in order. */
async function backIssues(page, contextPath) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Back Issues');
    await issues.showTab('Back Issues');
    return (await issues.names('Back Issues').allInnerTexts()).map(flat);
}

/**
 * The journal's header, "Archives": each issue summary as "{title link}" plus " — {series}" when
 * the summary carries a series line under a title, in order.
 */
async function archives(page, contextPath, label) {
    const {IssueReader} = require('../../../pages/IssuesPages.js');
    const reader = new IssueReader(page, contextPath);
    await reader.gotoHome();
    await reader.pressHeader('Archives');
    await idle(page).catch(() => {});
    const list = await reader.summaries().evaluateAll((els) => els.map((el) => {
        const f = (s) => String(s || '').replace(/\s+/g, ' ').trim();
        const title = f((el.querySelector('a.title') || {}).innerText);
        const series = f((el.querySelector('.series') || {}).innerText);
        return series ? `${title} — ${series}` : title;
    }));
    await snap(page, `${label}-archives`);
    return list;
}

/** Issues › "Back Issues" › the row's arrow › "Edit" › "Issue Data" › "Save"; the save's status. */
async function saveIssueData(page, contextPath, name) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Back Issues');
    await issues.showTab('Back Issues');
    const win = await issues.openManagement('Back Issues', name);
    const form = await win.openData();
    const status = (await form.save()).status();
    await sleep(500);
    return status;
}

/** Issues › "Back Issues" › "Order": drag `name` above `target`, "Done"; the save's status. */
async function orderBackIssue(page, contextPath, name, target) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto('Back Issues');
    await issues.showTab('Back Issues');
    const ordering = issues.backOrdering();
    await ordering.start();
    await issues.dragBackIssueAbove(name, target);
    const r = await ordering.done();
    return r ? r.status() : null;
}

module.exports = {T, flat, sleep, snap, issuesAdmin, publishIssue, createIssue, backIssues, archives, saveIssueData, orderBackIssue};
