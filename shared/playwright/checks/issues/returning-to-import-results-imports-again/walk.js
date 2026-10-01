// Issue report docs/issues/U63-A7-returning-to-import-results-imports-again.md (U63 A7): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`.
// All three apps.
//
//   1. sign in as dbarnes
//   2. Tools › Import/Export › "Native XML Plugin"
//   3. the export tab: tick OJS 4 / OMP 3 / OPS 1, export, "Download Exported File"
//   4. "Import": upload the file, "Import" (an "Import Results" tab opens; "Results" on OMP)
//   5. choose the "Import" tab
//   6. choose the "Import Results" tab again
//   7. Dashboard › "Active submissions", search the title
// Besides the screens it counts the submissions holding the title in the database after
// steps 4, 6 and 7, and records the requests each tab choice sent.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/returning-to-import-results-imports-again/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir6-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir6-3_5 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/returning-to-import-results-imports-again/walk.js
// Facts: .reports/<feature>/ir6/walk[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const copies = (app, phrase) => Number(sql(app, `SELECT count(DISTINCT p.submission_id) FROM publications p JOIN publication_settings ps ON ps.publication_id = p.publication_id WHERE ps.setting_name = 'title' AND ps.locale = 'en' AND ps.setting_value LIKE '%${phrase}%'`));

forEachApp(async (app) => {
    const S = L.SUBMISSIONS[app.name];
    const results = native.LABELS[app.name].results;
    const f = {app: app.name, line: app.line || 'main', submission: S.id};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        // 1–2
        await signIn(page, 'dbarnes');
        await native.openNative(app, page);
        f.copiesBefore = copies(app, S.search);
        // 3
        const ex = await native.exportOne(app, page, S.title);
        const file = outFile('export.xml');
        fs.writeFileSync(file, ex.xml);
        f.export = {file: ex.file, tabs: ex.res.tabs};
        // 4
        const m4 = w.seen.length;
        const imp = await native.importFile(page, file);
        f.step4 = {tabs: await L.tabNames(page), panel: imp.panel, numbers: L.importedNumbers(imp.panel), requests: w.seen.slice(m4)};
        f.copiesAfterStep4 = copies(app, S.search);
        f.step4Screen = await native.snap(page, 'step4-import-results');
        // 5
        const s5 = await L.chooseTab(page, 'Import', 0, w);
        f.step5 = {tabs: await L.tabNames(page), requests: s5.requests};
        // 6
        const s6 = await L.chooseTab(page, results, 0, w);
        f.step6 = {tabs: await L.tabNames(page), panel: s6.panel, numbers: L.importedNumbers(s6.panel), requests: s6.requests};
        f.copiesAfterStep6 = copies(app, S.search);
        f.step6Screen = await native.snap(page, 'step6-import-results-again');
        // 7
        f.step7 = {rows: await L.dashboardSearch(app, page, S.search)};
        f.copiesAfterStep7 = copies(app, S.search);
        f.step7Screen = await native.snap(page, 'step7-dashboard-search');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 4000));
        await close();
    }
});
