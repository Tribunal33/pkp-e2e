// Issue report docs/issues/U63-A11-export-list-selection-stops-at-page.md (U63 A11): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. All three apps.
//
// Precondition (on screen): Tools › Import/Export › "Native XML Plugin" › "Export Articles"
// ("Export", "Export Preprints"), "Select All", "Export Articles" ("Export Submissions",
// "Export Preprints"), "Download Exported File"; then "Import" of that file, five times, each
// from a freshly opened tool page.
//   1. open the tool's "Export Articles" tab: 100 lines and page links
//   2. press "Select All"
//   3. press it again
//   4. reload, "Export Articles", tick the first line on page 1
//   5. press "2", tick the first line on page 2
//   6. press "Export Articles" ("Export Submissions", "Export Preprints"), "Download Exported File"
// It records the list's state after each step and the submission ids the file holds.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir12 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/export-list-selection-stops-at-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir12-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir12-3_5 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/export-list-selection-stops-at-page/walk.js
// Facts: .reports/<feature>/ir12/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        // Precondition: every submission exported once, the file imported five times.
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        f.pre = {list: await L.listState(page)};
        f.pre.selectAll = await L.pressSelect(page);
        const all = await L.exportAndDownload(app, page, 'all-submissions');
        f.pre.exported = {panel: all.panel, count: all.ids.length};
        f.pre.imports = [];
        for (let i = 0; i < 5; i++) {
            await native.openNative(app, page);
            f.pre.imports.push(await L.importOnce(page, all.file));
        }
        // 1
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        f.step1 = await L.listState(page);
        await native.snap(page, 'step1-export-list');
        // 2
        f.step2 = await L.pressSelect(page);
        await native.snap(page, 'step2-select-all');
        // 3
        f.step3 = await L.pressSelect(page);
        await native.snap(page, 'step3-select-all-again');
        // 4
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        f.step4 = {ticked: await L.tickFirst(page), list: await L.listState(page)};
        // 5
        await L.goToPage(page, 2);
        f.step5 = {ticked: await L.tickFirst(page), list: await L.listState(page)};
        await native.snap(page, 'step5-page-2-ticked');
        // 6
        const out = await L.exportAndDownload(app, page, 'two-pages');
        f.step6 = {panel: out.panel, fileIds: out.ids};
        await native.snap(page, 'step6-exported');
        f.result = {
            page1InFile: out.ids.includes(f.step4.ticked.id),
            page2InFile: out.ids.includes(f.step5.ticked.id),
        };
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        f.serverErrors = w.seen.filter((x) => x.status >= 500);
        f.scriptErrors = errs;
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify({...f, pre: {...f.pre, imports: f.pre && f.pre.imports}}, null, 1).slice(0, 3500));
        await close();
    }
});
