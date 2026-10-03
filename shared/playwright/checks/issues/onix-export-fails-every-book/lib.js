// Helpers for the ONIX 3.0 export walk (walk.js) and its neighbour check (neighbour.js).
// The Masthead and ONIX page helpers come from the sibling issue walk's lib.js. Requiring this
// file runs nothing.
const fs = require('fs');
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const nx = require('../native-export-nothing-ticked-empty-tab/lib');

/** Record every export, bounce and download request of the ONIX or Native XML tool, with its status. */
function watchExports(page) {
    const seen = [];
    const on = (r) => {
        if (!/(Onix30ExportPlugin|NativeImportExportPlugin)\/(export|download)/.test(r.url())) return;
        seen.push({method: r.request().method(), url: native.rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200), status: r.status()});
    };
    page.on('response', on);
    return {seen, stop: () => page.off('response', on)};
}

/** Tick a book in the ONIX tool's "Export" list by its title; returns how many boxes are ticked. */
async function tickOnixBook(page, title) {
    await page.locator('#export-tab .listPanel__item').filter({hasText: title}).first().locator('input[type=checkbox]').check();
    return page.locator('#export-tab .listPanel__item input[type=checkbox]:checked').count();
}

/** Set the "Validate XML before the export and registration." box; returns its state. */
async function setValidation(page, on) {
    const box = page.locator('#export-tab input[name="validation"]').first();
    if (on) await box.check(); else await box.uncheck();
    return box.isChecked();
}

/** Press "Close" on the last added results tab; returns the tabs left. */
async function closeLastTab(page) {
    await page.locator('#importExportTabs > ul li').last().locator('a.close').click();
    await idle(page).catch(() => {});
    await native.sleep(500);
    return nx.tabs(page);
}

/** Press "Download Exported File" in the open results panel, if shown; returns the file's name, root and product count. */
async function download(page) {
    const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
    if (!(await btn.count())) return {button: false};
    const dl = page.waitForEvent('download', {timeout: 20_000});
    await btn.click();
    const d = await dl;
    const xml = fs.readFileSync(await d.path(), 'utf8');
    const root = (xml.match(/<(?!\?)([A-Za-z:]+)[\s>]/) || [])[1];
    return {button: true, file: d.suggestedFilename(), root, bytes: xml.length, products: (xml.match(/<Product[\s>]/g) || []).length, onixProduct: /<([a-z]+:)?ProductForm>/.test(xml)};
}

/** Press the ONIX tool's "Export Submissions"; returns the tabs, the results panel, its requests and the download. */
async function exportOnix(app, page, w, alerts) {
    const m = w.seen.length;
    const a = alerts.length;
    const res = await nx.pressExport(app, page, 'onix', {seen: []}, alerts);
    return {tabs: res.tabs, panel: res.panel, requests: w.seen.slice(m), alerts: alerts.slice(a), download: await download(page)};
}

module.exports = {watchExports, tickOnixBook, setValidation, closeLastTab, download, exportOnix};
