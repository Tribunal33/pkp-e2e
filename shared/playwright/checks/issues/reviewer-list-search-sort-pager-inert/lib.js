// Helpers of walk.js (U28 A1: the reviewer list's search box, "Sort", "Filters" and pager leave
// the rows as they were; docs/issues/U28-A1-reviewer-list-search-sort-pager-inert.md).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app: the reviewer, the IDs their "All assignments" view lists on the default dataset, a
 * word one listed title alone holds and that submission's ID, the family name of that
 * submission's author (the neighbour check), and on a journal a section none of the rows is in.
 */
const CASES = {
    ojs: {reviewer: 'amccrae', ids: [7, 10, 13, 20], phrase: 'Hydrologic', hit: 13, author: 'Kumiega', section: 'Reviews'},
    omp: {reviewer: 'agallego', ids: [11, 13, 16, 18], phrase: 'Dreamwork', hit: 11, author: 'Locke Hart', section: null},
};

/** The reviewer list's six views: address id and on-screen name. */
const VIEWS = [
    ['reviewer-action-required', 'Action Required by me'],
    ['reviewer-assignments-all', 'All assignments'],
    ['reviewer-assignments-completed', 'Completed'],
    ['reviewer-assignments-declined', 'Declined'],
    ['reviewer-assignments-published', 'Published'],
    ['reviewer-assignments-archived', 'Archived'],
];

const dashboardUrl = (app, page, query = '') => app.url(`/index.php/${app.contextPath}/en/dashboard/${page}${query}`);

/** The list's own request: the reviewer's endpoint or the editor's (`_submissions`, `/assigned`, `/reviews`), never the counts. */
const isList = (r) => /\/api\/v1\/_submissions(\/(reviewerAssignments|assigned|reviews))?(\?|$)/.test(r.url()) && r.request().method() === 'GET';

/**
 * Do `action` and wait for the list request it starts. Returns what the screen sent and what
 * came back: the address's query, the status, `itemsMax` and the IDs in the answer's order.
 */
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
        query: decodeURIComponent(u.search),
        http: r.status(),
        itemsMax: body ? body.itemsMax : null,
        ids: body && Array.isArray(body.items) ? body.items.map((i) => i.submissionId ?? i.id) : null,
    };
}

/** The list as shown: heading, the rows' IDs and titles in order, the empty line, what stands above the table, the pager line, the address. */
async function readList(page) {
    const shown = await page.evaluate(() => {
        const clean = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        const table = main.querySelector('table');
        const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map(clean)) : [];
        const data = rows.filter((c) => c.length > 1);
        const above = [...main.querySelectorAll('.bg-selection-light')].map(clean);
        const pager = [...main.querySelectorAll('div, span')].map(clean).filter((t) => t && /^Showing \d+ to \d+ of \d+$/.test(t))[0] || null;
        const id = main.querySelector('th[aria-sort], [role="columnheader"][aria-sort]');
        return {
            heading: clean(main.querySelector('h1')),
            ids: data.map((c) => Number((c[0] || '').replace(/\D+/g, ''))),
            titles: data.map((c) => (c[1] || '').slice(0, 60)),
            empty: rows.filter((c) => c.length === 1).map((c) => c[0]).join(' ') || null,
            above,
            pager,
            pagerNav: !!main.querySelector('nav[aria-label*="additional pages" i], .pkpPagination'),
            idSort: id ? id.getAttribute('aria-sort') : null,
        };
    });
    return {...shown, address: page.url().replace(/^.*\/dashboard\//, '…/dashboard/')};
}

/** Open a dashboard page at an address and wait for its list. */
async function open(page, url) {
    await page.goto('about:blank');
    const sent = await withList(page, () => page.goto(url));
    await page.locator('main table').first().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    await idle(page);
    return {sent, ...(await readList(page))};
}

/** The list's own search box (the editor's sidebar has another, "Search submissions"). */
const searchBox = (page) => page.locator('main').getByRole('searchbox', {name: /Search submissions, ID/}).first();

/** Type a phrase into the list's search box and press Enter. */
async function search(page, phrase) {
    const box = searchBox(page);
    const sent = await withList(page, async () => { await box.fill(phrase); await box.press('Enter'); });
    return {phrase, sent, ...(await readList(page))};
}

/**
 * Press "Clear search phrase": on the "Search: …" label above the table (main), or, where the
 * page shows no such label (3.5), the button of that name inside the search box.
 */
async function clearSearch(page) {
    const onLabel = page.locator('main .bg-selection-light').getByRole('button', {name: /Clear search phrase/}).first();
    const inBox = page.locator('main .pkpSearch').getByRole('button', {name: /Clear search phrase/}).first();
    const x = (await onLabel.isVisible().catch(() => false)) ? onLabel : inBox;
    const sent = await withList(page, () => x.click());
    return {sent, ...(await readList(page))};
}

/** Press "Sort" in a column's header ("ID"). */
async function sort(page, column = 'ID') {
    const button = page.locator('main').getByRole('columnheader', {name: new RegExp(`^${column}\\b`, 'i')}).getByRole('button').first();
    const label = flat(await button.innerText().catch(() => null), 40);
    const sent = await withList(page, () => button.click());
    return {button: label, sent, ...(await readList(page))};
}

/** "Filters": tick one box by its label, press "Apply Filters". Returns the window's groups too. */
async function filter(page, label) {
    await page.locator('main').getByRole('button', {name: 'Filters', exact: true}).first().click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Apply Filters'}).last();
    await dialog.getByRole('button', {name: 'Apply Filters', exact: true}).waitFor({timeout: 30_000});
    const offered = flat(await dialog.innerText().catch(() => null), 400);
    await dialog.getByRole('checkbox', {name: label, exact: true}).first().check();
    const sent = await withList(page, () => dialog.getByRole('button', {name: 'Apply Filters', exact: true}).click());
    return {label, offered, sent, ...(await readList(page))};
}

module.exports = {flat, sleep, CASES, VIEWS, dashboardUrl, withList, readList, open, search, clearSearch, sort, filter};
