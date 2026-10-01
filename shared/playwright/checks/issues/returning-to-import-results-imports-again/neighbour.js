// Neighbour check for the fix of docs/issues/U63-A7-returning-to-import-results-imports-again.md:
// what the fix must leave alone, walked with the fix in and out on PKP's default test dataset.
//
//   A. Tools: choose "Permissions", "Import/Export", "Permissions" again. These tabs are not
//      added by an action; each choice must still load the tab afresh (one request each).
//   B. Native XML Plugin: export OJS 4 / OMP 3 / OPS 1, import the file, then on the "Import"
//      tab press "Import" again. The second press is a new action: it must add a second
//      results tab and import another copy.
//   C. Then choose the "Export Submissions Results" tab again: with the fix it keeps its
//      content and sends nothing (the fix's reach: the export is not run again).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 PROBE_RUN=<nofix|fix> node bin/probe.js all shared/playwright/checks/issues/returning-to-import-results-imports-again/neighbour.js
// Facts: .reports/<feature>/ir6/neighbour[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const copies = (app, phrase) => Number(sql(app, `SELECT count(DISTINCT p.submission_id) FROM publications p JOIN publication_settings ps ON ps.publication_id = p.publication_id WHERE ps.setting_name = 'title' AND ps.locale = 'en' AND ps.setting_value LIKE '%${phrase}%'`));

forEachApp(async (app) => {
    const S = L.SUBMISSIONS[app.name];
    const results = native.LABELS[app.name].results;
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const toolsGets = [];
    page.on('response', (r) => { if (r.request().method() === 'GET' && /\/management\/(permissions|importexport)(\?|$)/.test(r.url())) toolsGets.push(native.rel(r.url()).replace(/[?&]_=\d+/, '')); });
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        // A
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
        await page.locator('#managementTabs').waitFor();
        await idle(page).catch(() => {});
        const tools = {};
        for (const name of ['Permissions', 'Import/Export', 'Permissions']) {
            const n0 = toolsGets.length;
            await page.locator('#managementTabs > ul a.ui-tabs-anchor', {hasText: name}).first().click();
            await idle(page).catch(() => {});
            await native.sleep(800);
            tools[`${Object.keys(tools).length + 1} ${name}`] = toolsGets.slice(n0);
        }
        f.A = tools;
        // B
        await native.openNative(app, page);
        const ex = await native.exportOne(app, page, S.title);
        const file = outFile('export.xml');
        fs.writeFileSync(file, ex.xml);
        f.copies0 = copies(app, S.search);
        const imp = await native.importFile(page, file);
        f.B1 = {numbers: L.importedNumbers(imp.panel), copies: copies(app, S.search)};
        await L.chooseTab(page, 'Import', 0, w);
        const m = w.seen.length;
        const again = await L.pressImport(page);
        f.B2 = {tabs: await L.tabNames(page), numbers: L.importedNumbers(again), copies: copies(app, S.search), requests: w.seen.slice(m)};
        // C
        const c = await L.chooseTab(page, 'Export Submissions Results', 0, w);
        f.C = {tabs: await L.tabNames(page), requests: c.requests, panel: native.flat(c.panel, 200)};
        f.C.screen = await native.snap(page, 'neighbour-export-results-again');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
