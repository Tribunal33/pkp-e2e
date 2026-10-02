// Helpers of walk.js (U28 A5: the reviewer list's accepted row prints its due date with a clock
// time; docs/issues/U28-A5-accepted-review-row-due-date-clock-time.md). Requiring this file runs
// nothing. The list is opened with the helpers of ../reviewer-list-search-sort-pager-inert/lib.js.
const {idle} = require('../../../probe');
const A1 = require('../reviewer-list-search-sort-pager-inert/lib.js');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: the submission of the walk, and a reviewer with a submitted review for the neighbour. */
const CASES = {
    ojs: {id: 12, submitted: {reviewer: 'amccrae', id: 10}},
    omp: {id: 17, submitted: {reviewer: 'agallego', id: 16}},
};

/** The reviewer list's address for a view ("reviewer-action-required", "reviewer-assignments-all"). */
const listUrl = (app, view) => A1.dashboardUrl(app, 'reviewAssignments', view ? `?currentViewId=${view}` : '');

/** The list's row of a submission as shown: its cells' text ("ID", "Submissions", "Editorial Activity", "Actions"). */
async function rowOf(page, id) {
    const cells = await page.evaluate((wanted) => {
        const clean = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const table = (document.querySelector('main') || document.body).querySelector('table');
        const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map(clean)) : [];
        return rows.find((c) => c.length > 1 && Number((c[0] || '').replace(/\D+/g, '')) === wanted) || null;
    }, id);
    if (!cells) return {listed: false};
    return {listed: true, id: cells[0], title: (cells[1] || '').slice(0, 60), activity: cells[cells.length - 2], action: cells[cells.length - 1]};
}

/** Open a view of the signed-in reviewer's list and read the submission's row and the heading. */
async function openRow(page, app, view, id) {
    const list = await A1.open(page, listUrl(app, view));
    return {heading: list.heading, address: list.address, sent: list.sent && {endpoint: list.sent.endpoint, http: list.sent.http}, row: await rowOf(page, id)};
}

/**
 * Press the row's button ("Respond to request"): the review page opens on "1. Request". Returns
 * the heading, the step's "Review Due Date" as shown and whether the step shows a privacy box.
 */
async function respond(page, id, button) {
    const index = await page.evaluate((wanted) => {
        const table = (document.querySelector('main') || document.body).querySelector('table');
        return [...table.querySelectorAll('tbody tr')].findIndex((tr) => {
            const cells = tr.querySelectorAll('td, th');
            return cells.length > 1 && Number(cells[0].innerText.replace(/\D+/g, '')) === wanted;
        });
    }, id);
    await page.locator('main table tbody tr').nth(index).getByRole('button', {name: button, exact: true}).click();
    await page.waitForURL(/\/reviewer\/submission\//, {timeout: T});
    await page.getByRole('button', {name: /Accept Review, Continue to Step #2/}).waitFor({timeout: T});
    await idle(page);
    const dates = await page.locator('#reviewStep1Form').evaluate((form) => {
        const out = {};
        for (const input of form.querySelectorAll('input[type="text"]')) {
            const section = input.closest('.section, .inline, div');
            const label = form.querySelector(`label[for="${input.id}"]`) || (section && section.querySelector('label'));
            if (label) out[label.textContent.replace(/\s+/g, ' ').trim()] = input.value;
        }
        return out;
    }).catch(() => ({}));
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        heading: flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => null), 160),
        dates,
        privacyBox: (await page.locator('input[type="checkbox"][name="privacyConsent"]').count()) > 0,
    };
}

module.exports = {T, flat, CASES, listUrl, rowOf, openRow, respond};
