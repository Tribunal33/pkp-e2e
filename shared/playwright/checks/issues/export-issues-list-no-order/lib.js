// Helpers for the "Export Issues" list of OJS's Native XML and PubMed XML tools (U63 OJS10),
// shared by walk.js and neighbour.js. Requiring this file runs nothing.
const {idle, screen, record, shot} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOOLS = {native: 'NativeImportExportPlugin', pubmed: 'PubMedExportPlugin'};
const TABS = {native: '#importExportTabs', pubmed: '#exportTabs'};

/** Record the screen and a full-page picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Open a tool's page and its "Export Issues" tab, the list loaded. */
async function openExportIssues(app, page, tool) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/${TOOLS[tool]}`));
    await page.locator(TABS[tool]).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'Export Issues', exact: true}).first().click();
    await page.locator('#exportIssues-tab .pkp_controllers_grid table').first().waitFor({timeout: T});
    await idle(page).catch(() => {});
}

/** The "Export Issues" list as shown: each row's issue name and items, the pager's line. */
async function readIssueList(page) {
    return page.locator('#exportIssues-tab').evaluate((el) => {
        const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
        const rows = [...el.querySelectorAll('tr.gridRow')].filter((r) => r.offsetParent !== null);
        const pager = el.querySelector('.gridPaging');
        return {
            issues: rows.map((r) => flat((r.querySelector('[id$="-issue"], [id$="-identification"]') || r.cells[1] || r).innerText)),
            items: rows.map((r) => flat((r.querySelector('[id$="-numArticles"]') || r.cells[2] || {}).innerText)),
            ids: rows.map((r) => (r.querySelector('input[type=checkbox]') || {}).value || null),
            pager: pager ? flat(pager.innerText) : null,
        };
    });
}

/**
 * Issues › "Future Issues" › "Create Issue": volume, number, year, title, "Save". Returns the
 * save's status and the notices it raised (a refused save also answers 200).
 */
async function createIssue(issues, {volume, number, year, title}) {
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

/** The issue names of the Issues page's two tabs, in order. */
async function issuesPageOrder(issues) {
    await issues.goto('Future Issues');
    const future = (await issues.names('Future Issues').allInnerTexts()).map((s) => s.trim());
    await issues.showTab('Back Issues');
    const back = (await issues.names('Back Issues').allInnerTexts()).map((s) => s.trim());
    return {future, back};
}

module.exports = {T, sleep, snap, openExportIssues, readIssueList, createIssue, issuesPageOrder};
