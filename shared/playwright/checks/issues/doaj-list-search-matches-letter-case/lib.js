// Shared screen steps for walk.js and neighbour.js (U63 OJS6): open the DOAJ
// tool's "Articles" list, and run one search through its filter.
const {idle} = require('../../../probe');

const T = 30_000;

/** Side menu "Tools" › "DOAJ Export Plugin" › "Articles"; returns the list's grid. */
async function openArticles(page, fact) {
    const tools = page.getByRole('link', {name: 'Tools', exact: true}).first();
    await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.click()]);
    await idle(page);
    const link = page.getByRole('link', {name: 'DOAJ Export Plugin', exact: true}).first();
    await link.waitFor({timeout: T});
    await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
    await idle(page);
    await page.locator('#importExportTabs .ui-tabs-nav li').filter({hasText: /^\s*Articles\s*$/}).first().click();
    const grid = page.locator('#submissionsListGridContainer .pkp_controllers_grid').first();
    await grid.locator('tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    fact('3 rows', await rowTexts(grid));
    return grid;
}

async function rowTexts(grid) {
    return (await grid.locator('tr.gridRow:visible').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

/**
 * Press "Search" above the list (the filter folds away after each search),
 * choose the column, type the text and press the form's "Search". Returns
 * the rows listed, or the empty line's text when none.
 */
async function search(page, grid, column, text, fact, n) {
    const form = grid.locator('form.filter');
    if (!(await form.isVisible())) {
        await grid.locator('a.pkp_linkaction_search').first().click();
        await form.waitFor({state: 'visible', timeout: T});
    }
    if (n === '4' || !fact.filterRead) {
        fact('4 filter controls', {
            column: await form.locator('select[name="column"] option').allInnerTexts(),
            issue: (await form.locator('select[name="issueId"] option:checked').innerText()).trim(),
            status: (await form.locator('select[name="statusId"] option:checked').innerText()).trim(),
            button: (await form.getByRole('button').allInnerTexts()).map((t) => t.trim()),
        });
        fact.filterRead = true;
    }
    await form.locator('select[name="column"]').selectOption({label: column});
    await form.locator('input[name="search"]').fill(text);
    const fetched = page.waitForResponse((r) => /fetch-?grid/i.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Search', exact: true}).click();
    const res = await fetched;
    await idle(page);
    fact(`${n} fetchGrid`, res.status());
    const rows = await rowTexts(grid);
    if (rows.length) return rows;
    const empty = grid.locator('tbody.empty:visible');
    return (await empty.count()) ? [`(empty) ${(await empty.first().innerText()).trim()}`] : [];
}

module.exports = {openArticles, search, rowTexts};
