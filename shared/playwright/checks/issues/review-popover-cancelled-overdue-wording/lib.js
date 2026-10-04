// Helpers of walk.js (U23 A4 and A6: the editorial dashboard's reviewer popovers say the reviewer
// cancelled a request the editor cancelled, and call an overdue review a missed response;
// docs/issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md). Requiring this file runs
// nothing. Every helper drives the screens a person uses: the workflow's "Reviewers" panel, its
// row menu ("More Actions") and the windows it opens, and the dashboard's activity indicators.
const {idle, screen} = require('../../../probe');
const W = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');
const U = require('../unassign-notice-cancel-subject/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const R = () => require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in Review round 1
 * with two reviewers who have not answered. `a` runs overdue, `b` is cancelled by the editor.
 */
const CASES = {
    ojs: {id: 12, a: {user: 'jjanssen', name: 'Julie Janssen'}, b: {user: 'phudson', name: 'Paul Hudson'}},
    omp: {id: 2, a: {user: 'alzacharia', name: 'Al Zacharia'}, b: {user: 'gfavio', name: 'Gonzalo Favio'}},
};

/** Today plus n days, local time, noon. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

/** Open the submission's workflow as the signed-in editor (it opens on Review, Round 1). */
async function openWorkflow(page, app, id) {
    const modal = await W.openWorkflow(page, app, id);
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The reviewer's row in the Reviewers panel as it reads. */
async function panelRow(modal, name) {
    const row = R().reviewerRow(modal, name).first();
    await row.waitFor({timeout: T});
    return flat(await row.innerText(), 300);
}

/** "More Actions" > "Log Response" on the row, the response chosen by its label, "Log Response". */
async function logResponse(page, modal, name, option) {
    const menu = await U.rowAction(page, name, 'Log Response');
    const box = page.getByRole('dialog').filter({hasText: 'Record the response on behalf of the reviewer'});
    await box.waitFor({timeout: T});
    await box.getByRole('radio', {name: option}).check();
    await box.getByRole('button', {name: 'Log Response', exact: true}).click();
    await box.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
    return {menu: menu.entries, row: await panelRow(modal, name)};
}

/** "More Actions" > "Edit": pick both due dates from the calendars, "OK". */
async function editDates(page, modal, name, response, review) {
    const P = R();
    const win = await P.openEditReview(page, P.reviewerRow(modal, name).first());
    await P.pickDate(page, win, 'responseDueDate', response);
    await P.pickDate(page, win, 'reviewDueDate', review);
    await P.saveEditReview(win);
    await idle(page);
    await sleep(600);
    return {responseDueDate: P.isoDate(response), reviewDueDate: P.isoDate(review), row: await panelRow(modal, name)};
}

/** "More Actions" > "Cancel Reviewer", the window sent as it comes. */
async function cancelReviewer(page, modal, name) {
    const menu = await U.rowAction(page, name, 'Cancel Reviewer');
    // main opens form#cancelReviewForm; 3.5 its form#unassignReviewerForm labelled "Cancel Reviewer"
    await page.locator('form#cancelReviewForm, form#unassignReviewerForm').first().waitFor({timeout: T});
    const formId = (await page.locator('form#cancelReviewForm').count()) ? 'cancelReviewForm' : 'unassignReviewerForm';
    const win = await U.readWindow(page, formId);
    const notices = await U.submitWindow(page, formId, 'Cancel Reviewer');
    return {menu: menu.entries, formId, window: {text: flat(win.text, 300), buttons: win.buttons}, notices, row: await panelRow(modal, name)};
}

/** The status cell's tooltip text of the row, when it has one (the panel's own explanation). */
async function rowTooltip(page, modal, name) {
    const row = R().reviewerRow(modal, name).first();
    const tip = row.locator('button[aria-describedby], [data-cy="tooltip"], .tooltipButton').first();
    if (!(await tip.count())) return null;
    await tip.hover().catch(() => {});
    await sleep(400);
    return flat(await page.locator('[role="tooltip"]:visible').first().innerText().catch(() => null), 200);
}

/**
 * The dashboard's "Active submissions" view: the submission's row, and every reviewer indicator in
 * its "Editorial Activity" cell opened in turn, each popover read whole, then closed.
 */
async function readPopovers(page, app, id) {
    const {EditorialDashboardPage} = require('../../../pages/EditorialDashboardPage.js');
    const dash = new EditorialDashboardPage(page, app.contextPath);
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=active`));
    await dash.heading().waitFor({timeout: T});
    await idle(page);
    await page.locator('table tbody tr').first().waitFor({timeout: T});
    const index = await page.evaluate((wanted) =>
        [...document.querySelectorAll('table tbody tr')].findIndex((tr) => {
            const c = tr.querySelector('th, td');
            return c && Number(c.innerText.replace(/\D+/g, '')) === wanted;
        }), id);
    if (index < 0) return {listed: false};
    const row = page.locator('table tbody tr').nth(index);
    const cell = dash.activityCell(row);
    const buttons = cell.getByRole('button');
    const n = await buttons.count();
    const out = {listed: true, activity: flat(await cell.innerText(), 300), indicators: []};
    for (let i = 0; i < n; i++) {
        const b = buttons.nth(i);
        const label = flat(await b.getAttribute('aria-label').catch(() => null) || await b.innerText().catch(() => ''), 160);
        if (!/review|reviewer|request|overdue|declined|cancel|awaiting|ongoing/i.test(label || '')) continue;
        await b.click();
        const panel = dash.activityPopover(row);
        await panel.waitFor({timeout: T});
        await sleep(300);
        const text = await panel.innerText();
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        out.indicators.push({label, lines, popover: flat(text, 600)});
        await dash.closeActivityPopover(row).catch(() => {});
        await sleep(300);
    }
    return out;
}

/** The indicator whose popover names `name`. */
function popoverOf(read, name) {
    return ((read && read.indicators) || []).find((p) => (p.popover || '').includes(name)) || null;
}

module.exports = {T, sleep, flat, CASES, day, openWorkflow, panelRow, logResponse, editDates, cancelReviewer, rowTooltip, readPopovers, popoverOf, screen};
