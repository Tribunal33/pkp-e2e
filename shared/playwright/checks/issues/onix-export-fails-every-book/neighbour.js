// Neighbour check for docs/issues/U74-A1-onix-export-fails-every-book.md: the paths the fix must
// leave alone, walked with the fix in and out. Runs alone, on an install UPGRADED from PKP's
// 3.5 default test dataset (the 3.5 dump loaded into the `main` dataset fleet, which runs the
// app's upgrade; the 3.6.0.0 migration I11583_ClassNamespaceFromDotNotationClassPath has
// rewritten the stored filter types there). As `dbarnes` on `publicknowledge`:
//   a. the walk's steps 2–5: the four "Publisher Identity" details, the ONIX tool, tick
//      "From Bricks to Brains: …", "Export Submissions" with validation ticked, download;
//   b. Tools › Import/Export › "Native XML Plugin", "Export": tick the same book, "Export
//      Submissions", download (each format carries its ONIX product while the details are filled).
// Records each results panel, the export requests, and the downloaded file's name, root and
// product count; with the stored ONIX filter type read from the database.
//
// Reset first:  PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps omp
// Run:          PROBE_RUN=<nb-in|nb-out> PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js omp shared/playwright/checks/issues/onix-export-fails-every-book/neighbour.js
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const nx = require('../native-export-nothing-ticked-empty-tab/lib');
const L = require('./lib');

const BOOK = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const f = {app: app.name, line: app.line || 'main'};
    const read = (q) => { try { return sql(app, q); } catch (e) { return String(e).slice(0, 200); } };
    f.storedTypes = read("SELECT symbolic || ' ' || input_type FROM filter_groups WHERE symbolic LIKE '%onix30%' ORDER BY symbolic");
    f.version = read("SELECT major||'.'||minor||'.'||revision||'.'||build FROM versions WHERE product_type='core' AND current=1");
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const alerts = nx.dialogs(page);
    const w = L.watchExports(page);
    try {
        await signIn(page, 'dbarnes');
        f.identitySaved = await nx.fillPublisherIdentity(app, page, {publisher: 'Public Knowledge Press', location: 'Vancouver', codeType: 'Proprietary (01)', codeValue: 'u74ir1'});
        // a. the ONIX tool
        await nx.openOnix(app, page);
        f.onixTicked = await L.tickOnixBook(page, BOOK);
        f.onixValidation = await L.setValidation(page, true);
        f.onix = await L.exportOnix(app, page, w, alerts);
        // b. the Native XML Plugin
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        await page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: BOOK}).first().locator('input[type=checkbox]').check();
        const m = w.seen.length;
        const res = await nx.pressExport(app, page, 'submissions', {seen: []}, alerts);
        f.native = {tabs: res.tabs, panel: res.panel, requests: w.seen.slice(m), download: await L.download(page)};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        f.alerts = alerts;
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 5000));
        await close();
    }
});
