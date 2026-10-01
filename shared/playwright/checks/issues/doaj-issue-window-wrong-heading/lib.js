// Helpers of walk.js and neighbour.js (issue report
// docs/issues/U63-OJS1-doaj-issue-window-wrong-heading.md, U63 OJS1). Requiring this file runs
// nothing. The DOAJ tool page itself is opened with the helpers of
// ../doaj-deposit-takes-other-journals-articles/lib.js.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LIST = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';

/**
 * The window open on top: its accessible name, the heading text it shows and its tabs, read once
 * its first tab is there (the window's content loads by AJAX after it opens).
 */
async function readWindow(page) {
    const dlg = page.getByRole('dialog').last();
    await dlg.waitFor({timeout: T});
    await dlg.getByRole('tab').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(500);
    return dlg.evaluate((d) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const ids = (d.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
        return {
            name: ids.map((id) => txt(document.getElementById(id))).filter(Boolean).join(' ') || d.getAttribute('aria-label'),
            heading: txt(d.querySelector('h1, h2')),
            tabs: [...d.querySelectorAll('[role=tab]')].map(txt),
        };
    });
}

/** Close the window on top with its own "Close". */
async function closeWindow(page) {
    const dlg = page.getByRole('dialog').last();
    if (!(await dlg.isVisible().catch(() => false))) return;
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await idle(page).catch(() => {});
    await sleep(700);
}

/** On the DOAJ "Articles" list: press the issue's name in the row whose "Author; Title" holds `title`. */
async function pressIssueInDoajList(page, title, issue) {
    const row = page.locator(LIST).first().locator('tbody tr.gridRow').filter({hasText: title}).first();
    await row.getByRole('link', {name: issue, exact: true}).click();
    return readWindow(page);
}

/** Issues › the tab ("Back Issues", "Future Issues") › press the issue's name. */
async function pressIssueOnIssuesPage(page, app, ctx, tab, issue) {
    await page.goto(app.url(`/index.php/${ctx}/en/manageIssues`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: tab, exact: true}).click();
    await idle(page).catch(() => {});
    const panel = page.getByRole('tabpanel', {name: tab});
    await panel.locator('table').first().waitFor({timeout: T});
    await sleep(300);
    await panel.getByRole('link', {name: issue, exact: true}).first().click();
    return readWindow(page);
}

module.exports = {T, sleep, flat, LIST, readWindow, closeWindow, pressIssueInDoajList, pressIssueOnIssuesPage};
