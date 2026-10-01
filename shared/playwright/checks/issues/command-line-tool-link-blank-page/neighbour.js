// Neighbour check for the fix of docs/issues/U63-OMP1-command-line-tool-link-blank-page.md (OMP, default dataset):
// what the fix must leave alone, walked with the fix in and out.
//  - Settings › Website › "Plugins": the "Tab Delimited Content Import Plugin" row still offers no
//    "Import/Export Data" (the web import stays off); "Native XML Plugin" still offers it.
//  - A Series editor (dbuskins) opening the tool's address is still refused.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/command-line-tool-link-blank-page/neighbour.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const G = require('../../U62/K1/grid');

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');
        f.plugins = await G.openWebsitePlugins(page, app, `${app.contextPath}/en`);
        const g = await G.readGrid(page);
        const ids = g.found ? g.cats.flatMap((c) => c.rows.map((r) => r.id)) : [];
        const pick = (re) => ids.find((i) => re.test(i));
        f.csvRow = await G.rowLinks(page, pick(/^csvimportexportplugin$/i));
        f.nativeRow = await G.rowLinks(page, pick(/^nativeimportexportplugin$/i));
        await signOut(page);
        await signIn(page, 'dbuskins');
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/CSVImportExportPlugin`));
        await idle(page).catch(() => {});
        const body = await page.locator('body').innerText().catch(() => '');
        f.seriesEditor = {status: r && r.status(), denied: G.DENIED.test(body), body: native.flat(body, 200)};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
