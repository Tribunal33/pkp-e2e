// Helpers of walk.js and neighbour.js (issue report
// docs/issues/U63-OJS6-doaj-search-matches-letter-case.md, U63 OJS6). Requiring this file runs
// nothing. The DOAJ tool page itself is opened with the helpers of
// ../doaj-deposit-takes-other-journals-articles/lib.js.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LIST = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';

/**
 * The list's filter: open it with "Search" above the list when it is closed, choose the search
 * field by its label ("Article Title", "Authors"), type the text, press the form's "Search".
 * Returns the visible rows' text, the empty line when there is none, and the fetch's status.
 */
async function searchList(page, field, text) {
    const grid = page.locator(LIST).first();
    let form = grid.locator('form.filter').first();
    if (!(await form.isVisible().catch(() => false))) {
        await grid.locator('a.pkp_linkaction_search').first().click();
        form = grid.locator('form.filter').first();
    }
    const column = form.locator('select[name="column"]');
    await column.waitFor({state: 'visible', timeout: T});
    const fields = (await column.locator('option').allInnerTexts()).map((t) => flat(t, 80));
    await column.selectOption({label: field});
    await form.locator('input[name="search"]').fill(text);
    const w = page.waitForResponse((r) => /fetch-?grid/i.test(r.url()), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Search', exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(500);
    const rows = await grid.locator('tbody tr.gridRow').evaluateAll((trs) => trs.filter((tr) => tr.offsetParent !== null).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
    const empty = await grid.locator('tbody.empty:visible, tr.empty:visible').first().innerText().catch(() => null);
    return {field, text, fields, status: r ? r.status() : null, rows, empty: flat(empty, 200)};
}

module.exports = {T, sleep, flat, LIST, searchList};
