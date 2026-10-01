// Helpers for the Native XML Plugin's added results tabs and the Dashboard search,
// shared by walk.js and neighbour.js. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const SUBMISSIONS = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice', search: 'Computer Skill Requirements'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada', search: 'Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', search: 'influence of lactation'},
};

const tabItems = (page) => page.locator('#importExportTabs > ul [role="tab"]');

/** Choose a tab by its name (the n-th of that name, 0-based); returns the GET requests the choice sent and what the panel then shows. */
async function chooseTab(page, name, n = 0, w = null) {
    const mark = w ? w.seen.length : 0;
    const tab = tabItems(page).filter({has: page.locator('a.ui-tabs-anchor', {hasText: new RegExp(`^${name}$`)})}).nth(n);
    await tab.locator('a.ui-tabs-anchor').click();
    await idle(page).catch(() => {});
    // An added tab's panel loads by its own request; wait for it to settle.
    for (let i = 0; i < 40; i++) {
        const busy = await page.locator('#importExportTabs [role="tabpanel"][aria-busy="true"]').count();
        if (!busy) break;
        await native.sleep(500);
    }
    await idle(page).catch(() => {});
    await native.sleep(800);
    return {
        requests: w ? w.seen.slice(mark) : [],
        panel: native.flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 1200),
    };
}

/** The tab names in order, the selected one starred. */
const tabNames = (page) => tabItems(page).evaluateAll((ts) => ts.map((t) => {
    const a = t.querySelector('a.ui-tabs-anchor');
    return `${a ? a.innerText.trim() : t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`;
})).catch(() => []);

/** The first quoted number of an "Import Results" panel (""21" - "Title""). */
const importedNumbers = (text) => [...String(text || '').matchAll(/"(\d+)"\s*-\s*"/g)].map((m) => Number(m[1]));

/** Dashboard › "Active submissions", the sidebar's "Search submissions" box; returns the listed rows. */
async function dashboardSearch(app, page, phrase) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=active`));
    await idle(page).catch(() => {});
    const box = page.getByRole('searchbox', {name: /^Search submissions/}).first();
    await box.waitFor({timeout: 20_000});
    await box.fill(phrase);
    await box.press('Enter');
    await native.sleep(1500);
    await idle(page).catch(() => {});
    await page.locator('main table tbody tr').first().waitFor({timeout: 20_000}).catch(() => {});
    await native.sleep(500);
    return (await page.locator('main table tbody tr').allInnerTexts()).map((t) => native.flat(t, 200));
}

/** On the "Import" tab, press "Import" again (the file is still in the box); returns the new results panel. */
async function pressImport(page) {
    const before = await tabItems(page).count();
    await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
    let panel = null;
    for (let i = 0; i < 60; i++) {
        await native.sleep(500);
        if ((await tabItems(page).count()) > before) {
            panel = native.flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 1200);
            if (panel && /completed|failed/i.test(panel)) break;
        }
    }
    await idle(page).catch(() => {});
    return panel;
}

module.exports = {SUBMISSIONS, chooseTab, tabNames, importedNumbers, dashboardSearch, pressImport};
