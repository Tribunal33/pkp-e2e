// Helpers for the Native XML Plugin page (Tools › Import/Export › "Native XML
// Plugin"), shared by walk.js and neighbour.js. Requiring this file runs
// nothing.
const fs = require('fs');
const {screen, shot, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const NATIVE = '/management/importexport/plugin/NativeImportExportPlugin';
const LABELS = {
    ojs: {exportTab: 'Export Articles', exportBtn: 'Export Articles', results: 'Import Results'},
    omp: {exportTab: 'Export', exportBtn: 'Export Submissions', results: 'Results'},
    ops: {exportTab: 'Export Preprints', exportBtn: 'Export Preprints', results: 'Import Results'},
};

// A server error's own text is never kept in a file here; only whether one was shown.
const INTERNALS = /SQLSTATE|Stack trace|\.php(:| on line )\d+/;
async function snap(page, name) {
    const s = await screen(page);
    if (INTERNALS.test(JSON.stringify(s))) {
        record(name, {url: s.url, title: s.title, withheld: 'server error text; not kept'});
        return {name, serverText: true};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return {name, serverText: false};
}

/** Collect every non-asset response of 400 or more and every non-GET request. */
function watch(page) {
    const seen = [];
    const on = (r) => {
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(r.url())) return;
        if (r.request().method() === 'GET' && r.status() < 400 && !/NativeImportExportPlugin\/(import|export)/.test(r.url())) return;
        seen.push({method: r.request().method(), url: rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').replace(/temporaryFileId=\d+/, 'temporaryFileId=…').slice(0, 160), status: r.status()});
    };
    page.on('response', on);
    return {seen, stop: () => page.off('response', on)};
}

/** Script errors the page raised, caught or not. */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(flat(e.message, 200)));
    page.on('console', (m) => { if (m.type() === 'error' && /^\w*Error\b/.test(m.text())) errs.push(flat(m.text(), 200)); });
    return errs;
}

const tabs = (page) => page.locator('#importExportTabs > ul [role="tab"]').evaluateAll((ts) => ts.map((t) => ({text: t.innerText.trim(), selected: t.getAttribute('aria-selected') === 'true'}))).catch(() => []);
const panelText = async (page) => flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 2000);

async function openNative(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en${NATIVE}`));
    await page.locator('#importExportTabs').waitFor({timeout: 20_000});
    await idle(page).catch(() => {});
}

/** Press a tab button and wait for a results tab to be added and filled; returns what it shows. */
async function pressForResults(page, button) {
    const before = (await tabs(page)).length;
    await button.click();
    let added = false;
    for (let i = 0; i < 60; i++) {
        await sleep(500);
        if ((await tabs(page)).length > before) {
            added = true;
            const t = await panelText(page);
            if (t && /completed|failed|error|warning|Download/i.test(t)) break;
        }
        if (i === 20 && !added) break;
    }
    await idle(page).catch(() => {});
    await sleep(800);
    return {tabs: (await tabs(page)).map((t) => `${t.text}${t.selected ? '*' : ''}`), panel: await panelText(page)};
}

/** The export tab's list, as data. */
async function readExportList(page) {
    return page.locator('#exportSubmissions-tab').evaluate((el) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.offsetParent !== null);
        return {
            items: [...el.querySelectorAll('.listPanel__item')].map(txt).slice(0, 30),
            buttons: [...el.querySelectorAll('button, a.pkpButton')].filter(vis).map(txt),
            text: txt(el).slice(0, 800),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
}

async function openExportTab(app, page) {
    await page.getByRole('tab', {name: LABELS[app.name].exportTab, exact: true}).first().click();
    await idle(page).catch(() => {});
    await page.locator('#exportSubmissions-tab .listPanel__item, #exportSubmissions-tab .listPanel__empty').first().waitFor({timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
}

/** Steps 3: tick the submission by title (searching the list), export, download; returns the file's text. */
async function exportOne(app, page, title) {
    await openExportTab(app, page);
    const tab = page.locator('#exportSubmissions-tab');
    let item = tab.locator('.listPanel__item').filter({hasText: title});
    if (!(await item.count())) {
        const search = tab.locator('input[type=search]').first();
        await search.fill(title.slice(0, 40));
        await sleep(1200); await idle(page).catch(() => {});
        item = tab.locator('.listPanel__item').filter({hasText: title});
    }
    await item.first().locator('input[type=checkbox]').check();
    const res = await pressForResults(page, tab.getByRole('button', {name: LABELS[app.name].exportBtn, exact: true}));
    const dlP = page.waitForEvent('download', {timeout: 20_000});
    await page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'}).click();
    const d = await dlP;
    const xml = fs.readFileSync(await d.path(), 'utf8');
    return {res, file: d.suggestedFilename(), xml};
}

/** Step 5: upload the file on the "Import" tab and press "Import". */
async function importFile(page, file) {
    await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
    await idle(page).catch(() => {});
    const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 30_000});
    await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
    const u = await up;
    await idle(page).catch(() => {});
    await sleep(500);
    const uploaded = {status: u.status(), box: flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300)};
    const res = await pressForResults(page, page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}));
    return {uploaded, ...res};
}

/** Step 6: the Dashboard's "Active submissions" view (its address), the row of a submission id on its first page. */
async function dashboardRow(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=active`));
    await idle(page).catch(() => {});
    await page.locator('main table tbody tr').first().waitFor({timeout: 20_000}).catch(() => {});
    await sleep(800);
    const row = page.locator('main table tbody tr').filter({hasText: new RegExp(`^\\s*${id}\\b`)});
    const n = await row.count();
    return {
        row,
        found: n,
        text: n ? flat(await row.first().innerText(), 300) : null,
        cells: n ? (await row.first().locator('td').allInnerTexts()).map((x) => flat(x, 120)) : [],
        buttons: n ? (await row.first().getByRole('button').allInnerTexts()).map((x) => flat(x, 60)) : [],
        links: n ? (await row.first().getByRole('link').allInnerTexts()).map((x) => flat(x, 60)) : [],
    };
}

/** Step 7: press "View" on the row; returns the address and any window it opened. */
async function pressView(page, row) {
    const urlBefore = rel(page.url());
    await row.first().getByRole('button', {name: 'View', exact: true}).or(row.first().getByRole('link', {name: 'View', exact: true})).first().click();
    await sleep(2500); await idle(page).catch(() => {});
    const dialogs = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')]
        .filter((e) => e.offsetWidth || e.offsetHeight)
        .map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
    return {urlBefore, urlAfter: rel(page.url()), dialogs};
}

/** The workflow of a submission by the address its Dashboard "View" leads to; returns the open window's text. */
async function openWorkflow(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page).catch(() => {});
    await page.getByRole('dialog').first().waitFor({timeout: 15_000}).catch(() => {});
    await sleep(1500); await idle(page).catch(() => {});
    return page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')]
        .filter((e) => e.offsetWidth || e.offsetHeight)
        .map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
}

module.exports = {openWorkflow, sleep, flat, rel, LABELS, snap, watch, scriptErrors, openNative, openExportTab, readExportList, exportOne, importFile, dashboardRow, pressView};
