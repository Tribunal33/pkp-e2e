// Helpers of walk.js (U28 A18: on its due date a review already reads as overdue;
// docs/issues/U28-A18-review-due-today-reads-overdue.md). Requiring this file runs nothing.
// Self-contained: the helpers below were copied from the walks of U28 A5, U27 A7, U28 A1 and
// U28 A12 (checks/issues/accepted-review-row-due-date-clock-time, unanswered-reviewer-row-
// response-due-line, reviewer-list-search-sort-pager-inert, reviewer-own-round-listed-under-
// previous-reviews), which may be deleted with their reports. The workflow's Reviewers table and
// its "Edit" window come from the OMP U27 page objects (the screens are the same on a journal),
// required inside the calls, since they read the app the kit has exported.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');

/** Per app, on PKP's default test dataset: a submission in review with two unanswered requests. */
const CASES = {
    ojs: {id: 12, accepts: {user: 'jjanssen', name: 'Julie Janssen'}, unanswered: {user: 'phudson', name: 'Paul Hudson'}},
    omp: {id: 17, accepts: {user: 'jjanssen', name: 'Julie Janssen'}, unanswered: {user: 'phudson', name: 'Paul Hudson'}},
};

/** Today plus n days, at noon local time. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

/** A dashboard page's address ("reviewAssignments", "editorial"). */
const dashboardUrl = (app, page, query = '') => app.url(`/index.php/${app.contextPath}/en/dashboard/${page}${query}`);

/** The list's own request: the reviewer's endpoint or the editor's (`_submissions`, `/assigned`, `/reviews`), never the counts. */
const isList = (r) => /\/api\/v1\/_submissions(\/(reviewerAssignments|assigned|reviews))?(\?|$)/.test(r.url()) && r.request().method() === 'GET';

/** Do `action` and wait for the list request it starts: endpoint, status and the IDs answered. */
async function withList(page, action) {
    const wait = page.waitForResponse(isList, {timeout: 20_000}).catch(() => null);
    await action();
    const r = await wait;
    await idle(page);
    await sleep(400);
    if (!r) return null;
    const body = await r.json().catch(() => null);
    const u = new URL(r.url());
    return {
        endpoint: u.pathname.replace(/^.*\/api\/v1\//, ''),
        http: r.status(),
        ids: body && Array.isArray(body.items) ? body.items.map((i) => i.submissionId ?? i.id) : null,
    };
}

/** The list as shown: heading, the rows' IDs, the empty line, the address. */
async function readList(page) {
    const shown = await page.evaluate(() => {
        const clean = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        const table = main.querySelector('table');
        const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map(clean)) : [];
        return {
            heading: clean(main.querySelector('h1')),
            ids: rows.filter((c) => c.length > 1).map((c) => Number((c[0] || '').replace(/\D+/g, ''))),
            empty: rows.filter((c) => c.length === 1).map((c) => c[0]).join(' ') || null,
        };
    });
    return {...shown, address: page.url().replace(/^.*\/dashboard\//, '…/dashboard/')};
}

/** Open a dashboard page at an address and wait for its list. */
async function openList(page, url) {
    await page.goto('about:blank');
    const sent = await withList(page, () => page.goto(url));
    await page.locator('main table').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return {sent, ...(await readList(page))};
}

/** The list's row of a submission as shown: its "ID", "Editorial Activity" and "Actions" cells. */
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

/** The signed-in reviewer's "Action Required by me" row of the submission. */
async function reviewerRow(page, app, id) {
    const list = await openList(page, dashboardUrl(app, 'reviewAssignments', '?currentViewId=reviewer-action-required'));
    return {heading: list.heading, address: list.address, sent: list.sent && {endpoint: list.sent.endpoint, http: list.sent.http}, row: await rowOf(page, id)};
}

/**
 * Press the row's button: the review page opens on "1. Request". Returns the address, the heading,
 * the step's dates as shown and whether it shows the privacy-consent box.
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
        decline: (await page.getByRole('link', {name: /Decline Review Request/}).count()) + (await page.getByRole('button', {name: /Decline Review Request/}).count()) > 0,
        privacyBox: (await page.locator('input[type="checkbox"][name="privacyConsent"]').count()) > 0,
    };
}

/** On the review page: tick the privacy-consent box when shown, "Accept Review, Continue to Step #2". */
async function acceptReview(page) {
    const accept = page.getByRole('button', {name: /Accept Review, Continue to Step #2/});
    await accept.waitFor({timeout: T});
    const consent = page.locator('input[type="checkbox"][name="privacyConsent"]');
    const ticked = (await consent.count()) > 0;
    if (ticked) await consent.check();
    await accept.click();
    await page.getByRole('button', {name: 'Continue to Step #3'}).waitFor({timeout: T});
    await idle(page);
    return {accepted: true, consentTicked: ticked, tab: flat(await page.locator('li.ui-tabs-active, li.ui-state-active').first().innerText().catch(() => null), 80)};
}

/** The reviewer accepts from the review page, opened by its address. */
async function accept(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    return acceptReview(page);
}

/** The editor's workflow of the submission, opened by its address (a fresh page load). */
async function workflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="workflow-action-items"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The reviewer's row in the Reviewers table, as its cells read (status cell lines kept apart). */
async function readRow(modal, name) {
    const row = P().reviewerRow(modal, name).first();
    await row.waitFor({timeout: T});
    const cells = await row.evaluate((tr) =>
        [...tr.querySelectorAll('td, th')].map((c) => ({
            text: c.innerText.replace(/[ \t]+/g, ' ').trim(),
            lines: [...c.querySelectorAll('span')].filter((s) => !s.querySelector('span')).map((s) => s.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        }))
    );
    const status = cells[1] || {};
    return {reviewer: flat(cells[0] && cells[0].text, 80), status: status.lines && status.lines.length ? status.lines : [flat(status.text, 120)], row: cells.map((c) => flat(c.text, 120))};
}

/** "More Actions" › "Edit" on the row: both due dates picked from the calendars, "OK". */
async function setEditDates(page, modal, name, response, review) {
    const R = P();
    const win = await R.openEditReview(page, R.reviewerRow(modal, name).first());
    await R.pickDate(page, win, 'responseDueDate', response);
    await R.pickDate(page, win, 'reviewDueDate', review);
    await R.saveEditReview(win);
    await idle(page);
    await sleep(600);
    return {responseDueDate: R.isoDate(response), reviewDueDate: R.isoDate(review), saved: true};
}

/** As the signed-in editor: the two reviewers' rows in the workflow's Reviewers table. */
async function editorRows(page, app, c) {
    const modal = await workflow(page, app, c.id);
    return {
        [c.accepts.user]: await readRow(modal, c.accepts.name).catch((e) => ({threw: flat(e.message, 200)})),
        [c.unanswered.user]: await readRow(modal, c.unanswered.name).catch((e) => ({threw: flat(e.message, 200)})),
    };
}

/** As the signed-in editor: the editorial dashboard's "Reviews overdue" view, and whether it lists the submission. */
async function reviewsOverdue(page, app, id) {
    const list = await openList(page, dashboardUrl(app, 'editorial', '?currentViewId=reviews-overdue'));
    return {heading: list.heading, ids: list.ids, empty: list.empty, lists: list.ids.includes(id), sent: list.sent && {endpoint: list.sent.endpoint, http: list.sent.http}};
}

/**
 * As the signed-in editor: "More Actions" › "Edit" on both rows, both due dates set to `date`, "OK".
 * The workflow is opened afresh for each row: the page's one jQuery UI calendar, opened from a
 * second legacy window, sits under it and the day click hangs (patterns.md pitfall 4).
 */
async function setBothRows(page, app, c, date) {
    const out = {};
    for (const who of [c.accepts, c.unanswered]) {
        try {
            const modal = await workflow(page, app, c.id);
            out[who.user] = await setEditDates(page, modal, who.name, date, date);
        } catch (e) {
            out[who.user] = {threw: flat(e.message, 300)};
        }
    }
    return out;
}

module.exports = {CASES, day, flat, reviewerRow, respond, acceptReview, accept, editorRows, reviewsOverdue, setBothRows};
