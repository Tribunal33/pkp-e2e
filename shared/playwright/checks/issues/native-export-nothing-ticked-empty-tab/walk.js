// Issue report docs/issues/U63-A12-native-export-nothing-ticked-empty-tab.md (U63 A12): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`.
// All three apps; steps 5–6 on OJS only.
//
//   1. sign in as dbarnes
//   2. Tools › Import/Export › "Native XML Plugin"
//   3. open "Export Articles" ("Export", "Export Preprints"), tick nothing
//   4. press "Export Articles" ("Export Submissions", "Export Preprints")
//   5. {OJS} open "Export Issues", tick nothing
//   6. {OJS} press "Export Issues"
//   7. {OMP} Settings › Press › "Masthead": "Press Publisher Name" Public Knowledge Press,
//      "Geographical Location" Vancouver, "Publisher Code Type" "Proprietary (01)",
//      "Publisher Code" u63ir7; "Save" (the ONIX tool opens only with these four filled)
//   8. {OMP} Tools › Import/Export › "ONIX 3.0 Monograph Export Plugin", "Export", tick nothing
//   9. {OMP} press "Export Submissions"
// It records the tabs, the opened panel's text, the export requests with their statuses and
// any browser alert after steps 4, 6 and 9.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir7 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir7 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir7-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir7-3_5 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/walk.js
// Facts: .reports/<feature>/ir7/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const alerts = L.dialogs(page);
    const w = native.watch(page);
    try {
        // 1–2
        await signIn(page, 'dbarnes');
        await native.openNative(app, page);
        f.tabsBefore = await L.tabs(page);
        // 3
        await native.openExportTab(app, page);
        f.ticked = await page.locator('#exportSubmissions-tab input[type=checkbox]:checked').count();
        // 4
        f.step4 = await L.pressExport(app, page, 'submissions', w, alerts);
        f.step4Screen = await native.snap(page, 'step4-export-nothing-ticked');
        if (app.name === 'ojs') {
            // 5
            await L.openIssuesTab(page);
            f.issuesTicked = await page.locator('#exportIssues-tab input[type=checkbox]:checked').count();
            // 6
            f.step6 = await L.pressExport(app, page, 'issues', w, alerts);
            f.step6Screen = await native.snap(page, 'step6-export-issues-nothing-ticked');
        }
        if (app.name === 'omp') {
            // 7
            f.step7Saved = await L.fillPublisherIdentity(app, page, {publisher: 'Public Knowledge Press', location: 'Vancouver', codeType: 'Proprietary (01)', codeValue: 'u63ir7'});
            // 8
            await L.openOnix(app, page);
            f.onixTabsBefore = await L.tabs(page);
            f.onixTicked = await page.locator('#export-tab input[name="selectedSubmissions[]"]:checked').count();
            // 9
            f.step9 = await L.pressExport(app, page, 'onix', w, alerts);
            f.step9Screen = await native.snap(page, 'step9-onix-export-nothing-ticked');
        }
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        f.alerts = alerts;
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 4000));
        await close();
    }
});
