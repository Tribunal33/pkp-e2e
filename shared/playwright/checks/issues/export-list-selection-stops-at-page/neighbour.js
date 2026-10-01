// Neighbour check for docs/issues/U63-A11-export-list-selection-stops-at-page.md (U63 A11): what the
// fix must leave alone, and the search case it also reaches, on PKP's default test dataset as it
// loads (one page of submissions), as `dbarnes`, on `publicknowledge`. All three apps.
//   N1. "Export Articles" ("Export", "Export Preprints"): press "Select All", then the button again
//       (on one page: every line ticked and "Select None", then none ticked and "Select All")
//   N2. tick the first line (A); search the last line's first words, Enter (A no longer shown);
//       tick that line (B); press the export button, "Download Exported File"
//   N3. clear the search, Enter; untick A; export and download again (the file must hold B only)
// Run with the fix in and out (reset first, as walk.js says):
//   PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 PROBE_RUN=<nofix|fix> node bin/probe.js all shared/playwright/checks/issues/export-list-selection-stops-at-page/neighbour.js
// Facts: .reports/<feature>/ir12/neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

async function search(page, phrase) {
    const box = L.listTab(page).locator('input[type=search]').first();
    await box.fill(phrase);
    await box.press('Enter');
    await native.sleep(1500);
    await idle(page).catch(() => {});
}

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        // N1
        f.n1 = {before: await L.listState(page)};
        f.n1.selectAll = await L.pressSelect(page);
        f.n1.again = await L.pressSelect(page);
        for (const k of ['before', 'selectAll', 'again']) delete f.n1[k].tickedIds;
        // N2
        const a = await L.tickFirst(page);
        const items = L.listTab(page).locator('.listPanel__item');
        const lastTitle = native.flat(await items.last().locator('.listPanel__itemSubTitle').innerText(), 200);
        const phrase = lastTitle.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/^\s*The\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
        await search(page, phrase);
        const shown = await L.listState(page);
        const b = await L.tickFirst(page);
        f.n2 = {a, phrase, shownLines: shown.lines, aShown: shown.tickedIds.includes(a.id), b};
        const out2 = await L.exportAndDownload(app, page, 'neighbour-search');
        f.n2.fileIds = out2.ids;
        // N3
        await native.openExportTab(app, page);
        await search(page, '');
        await L.listTab(page).locator(`.listPanel__item input[type=checkbox][value="${a.id}"]`).uncheck();
        f.n3 = {list: await L.listState(page)};
        const out3 = await L.exportAndDownload(app, page, 'neighbour-unticked');
        f.n3.fileIds = out3.ids;
        f.result = {
            n1SelectNone: f.n1.selectAll.button === 'Select None' && f.n1.selectAll.ticked === f.n1.selectAll.lines,
            n1Cleared: f.n1.again.ticked === 0 && f.n1.again.button === 'Select All',
            n2Both: out2.ids.includes(a.id) && out2.ids.includes(b.id),
            n3OnlyB: out3.ids.length === 1 && out3.ids[0] === b.id,
        };
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        f.serverErrors = w.seen.filter((x) => x.status >= 500);
        f.scriptErrors = errs;
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 2500));
        await close();
    }
});
