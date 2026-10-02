// Helpers of walk.js here (U50 A16, joined to docs/issues/U09-A19-static-page-content-change-lost-on-close.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows. Page objects are required inside the functions (probe kit rule).
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const ISSUE = 'Vol. 2 No. 1 (2015)';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Issues › "Future Issues" › the issue's arrow › "Edit": the "Issue Management" window. */
async function openIssueWindow(page, name = ISSUE) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Future Issues');
    return issues.openManagement('Future Issues', name);
}

/** Press "Issue Data": its form, the "Description" editor ready. */
async function openIssueData(win) {
    const form = await win.openData();
    await form.descriptionText(); // waits for the editor
    return form;
}

/**
 * Click into the first form language's "Description" (English on the dataset, which has French
 * too: the page object's locator assumes one language) and type `text` at the end.
 */
async function typeDescription(page, form, text) {
    const body = form.form.getByRole('group', {name: 'Description'}).locator('iframe').first().contentFrame().locator('body');
    await body.click();
    await page.keyboard.press('ControlOrMeta+End');
    await body.pressSequentially(text);
    await sleep(300);
}

/**
 * Press a tab of the window. Returns whether the browser asked its question and its words, and
 * which tab is selected afterwards. `answer` 'cancel' keeps the current tab, 'ok' leaves it.
 */
async function pressTab(page, win, name, {answer = 'ok'} = {}) {
    let asked = null;
    const handler = async (d) => { asked = d.message(); if (answer === 'ok') await d.accept(); else await d.dismiss(); };
    page.on('dialog', handler);
    await win.tab(name).click();
    await sleep(800); // the question is synchronous in the click; the tab's load follows, bounded
    await idle(page).catch(() => {});
    page.off('dialog', handler);
    return {asked, selected: flat(await win.selectedTab().innerText().catch(() => null), 60)};
}

/**
 * Press the window's "Close". Returns whether the browser asked its question and whether the
 * window closed. `answer` as for pressTab().
 */
async function closeIssueWindow(page, win, {answer = 'ok'} = {}) {
    let asked = null;
    const handler = async (d) => { asked = d.message(); if (answer === 'ok') await d.accept(); else await d.dismiss(); };
    page.on('dialog', handler);
    await win.dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
    await Promise.race([
        win.dialog.waitFor({state: 'hidden', timeout: 5000}).catch(() => {}),
        (async () => { for (let i = 0; i < 50 && asked === null; i++) await sleep(100); })(),
    ]);
    await sleep(500);
    page.off('dialog', handler);
    return {asked, closed: !(await win.dialog.isVisible().catch(() => false))};
}

module.exports = {T, CTX, ISSUE, flat, sleep, snap, openIssueWindow, openIssueData, typeDescription, pressTab, closeIssueWindow};
