// Fix check for docs/issues/U63-A11-export-list-selection-stops-at-page.md (U63 A11): a selection
// of three full pages (300 submissions) reaches the export file whole, and the results tab's
// address stays short. PKP's default test dataset as `dbarnes`, on `publicknowledge`, all three apps.
// Run it with the fix applied (on the unfixed code the file holds the last page only).
//
// Precondition (on screen), from a freshly loaded dataset: "Select All", export and download the
// dataset's submissions, then import that file, from a freshly opened tool page, until the list
// has four pages.
//   M1. "Export Articles" ("Export", "Export Preprints"): "Select All" on page 1, then on page 2,
//       then on page 3
//   M2. press the export button, "Download Exported File"
// Records the button's label after each press, how many ids the selection held, the results
// tab's address length and status, and how many submissions the file holds.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/export-list-selection-stops-at-page/many.js
// Facts: .reports/<feature>/ir12/many[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const pageCount = (s) => Math.max(1, ...String(s.pagination || '').split(/\s+/).map(Number).filter((n) => n > 0));

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main', grow: []};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        // Precondition: every submission of the dataset exported once (one page), then that file
        // imported until the list has four pages. (A file of 100 imported copies did not import
        // on OMP, so the dataset's own file is imported each time.)
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        await L.pressSelect(page);
        const base = await L.exportAndDownload(app, page, 'dataset-submissions');
        f.baseCount = base.ids.length;
        for (let i = 0; i < 20; i++) {
            await native.openNative(app, page);
            await native.openExportTab(app, page);
            const s = await L.listState(page);
            if (pageCount(s) >= 4) { f.pagesBefore = s.pagination; break; }
            await native.openNative(app, page);
            const imp = await L.importOnce(page, base.file);
            f.grow.push(imp.status);
        }
        // M1
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        f.m1 = [];
        const ticked = new Set();
        for (const n of [1, 2, 3]) {
            if (n > 1) await L.goToPage(page, n);
            const s = await L.pressSelect(page);
            f.m1.push({page: s.currentPage, lines: s.lines, ticked: s.ticked, button: s.button});
            s.tickedIds.forEach((id) => ticked.add(id));
        }
        // The list's order has no tie-break, so pages can repeat a submission: count distinct ids.
        f.distinctTicked = ticked.size;
        // M2
        const bounce = page.waitForResponse((r) => /exportSubmissionsBounce/.test(r.url()), {timeout: 60_000});
        const tabLoad = page.waitForResponse((r) => /NativeImportExportPlugin\/exportSubmissions\?/.test(r.url()), {timeout: 300_000});
        const outP = L.exportAndDownload(app, page, 'three-pages');
        const b = await bounce;
        const t = await tabLoad;
        f.bouncePostIds = ((b.request().postData() || '').match(/selectedSubmissions(%5B%5D|\[\])=/g) || []).length;
        f.tab = {status: t.status(), urlLength: t.url().length};
        const out = await outP;
        f.m2 = {panel: native.flat(out.panel, 200), fileCount: out.ids.length, distinct: new Set(out.ids).size};
        f.result = {allInFile: [...ticked].every((id) => out.ids.includes(id)) && out.ids.length === ticked.size};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'many-error').catch(() => {});
    } finally {
        w.stop();
        f.serverErrors = w.seen.filter((x) => x.status >= 400);
        f.scriptErrors = errs;
        record('many', f);
        console.log(`[many] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 2500));
        await close();
    }
});
