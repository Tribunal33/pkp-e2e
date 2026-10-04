// Kept walk for docs/issues/U63-A24-export-list-repeats-submissions-across-pages.md (U63 A24):
// past one page, the Native XML export list (and the submissions dashboard, served by the same
// query) repeats some submissions and leaves others off every page when submissions share a
// submission date. PKP's default test dataset as `dbarnes`, on `publicknowledge`, all three apps.
//
// Mode `steps` (default): the precondition and Steps 1–5.
//   P. "Select All" on the export tab, export, download; import that file, from a freshly
//      opened tool page each time, until the export list has four pages
//   1–3. export each of pages 1–4 on its own ("Select All", export, download), reloading between
//   4–5. dashboard view "Active submissions", "Next" to the last page
// Mode `reader` (OMP, OPS): the same precondition, then Steps 6–7 as a visitor: the press's
//   "Catalog" / the server's "Preprints" list, "Next" to the last page (OJS has no such paged list).
// Mode `neighbour`: on the dataset as loaded (no shared submission dates), the order of the export
//   list's page and of the step-4 dashboard view, for comparing with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/walk.js [neighbour]
// Facts: .reports/<feature>/<id>/walk[-<run>]-<app>.json (neighbour-[<run>]-<app>.json)
const {forEachApp, launch, signIn, signOut, record, screen, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const A11 = require('../export-list-selection-stops-at-page/lib');
const L = require('./lib');

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('neighbour') ? 'neighbour' : ARGS.includes('reader') ? 'reader' : 'steps';
const READER = {omp: {path: 'catalog', link: '/catalog/book/'}, ops: {path: 'preprints', link: '/preprint/view/'}};
const VIEW = {ojs: 'Active submissions', omp: 'Active submissions', ops: 'Active submissions'};
const pageCount = (s) => Math.max(1, ...String(s.pagination || '').split(/\s+/).map(Number).filter((n) => n > 0));

async function exportPage(app, page, n) {
    await native.openNative(app, page);
    await native.openExportTab(app, page);
    // Page 1 shows "1 2 ··· 4": a page's link appears once its neighbour is open, so go one page at a time.
    for (let k = 2; k <= n; k++) await A11.goToPage(page, k);
    const s = await A11.pressSelect(page);
    const out = await A11.exportAndDownload(app, page, `file${n}`);
    return {page: s.currentPage, pagination: s.pagination, lines: s.lines, ticked: s.ticked, shown: s.tickedIds, file: out.ids, panel: native.flat(out.panel, 160)};
}

// Precondition: every submission exported once, that file imported until the export list has four pages.
async function precondition(app, page, f) {
    await native.openNative(app, page);
    await native.openExportTab(app, page);
    await A11.pressSelect(page);
    const base = await A11.exportAndDownload(app, page, 'dataset-submissions');
    f.baseCount = base.ids.length;
    f.imports = [];
    for (let i = 0; i < 25; i++) {
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        const s = await A11.listState(page);
        if (pageCount(s) >= 4) { f.pagesBefore = s.pagination; break; }
        await native.openNative(app, page);
        const imp = await A11.importOnce(page, base.file);
        f.imports.push({status: imp.status, listed: imp.imported, head: native.flat(imp.head, 120)});
    }
}

// Steps 6–7: the reader's paged list, "Next" until the last page; the ids of the items' links per page.
async function walkReader(app, page) {
    const R = READER[app.name];
    const pages = [];
    await page.goto(app.url(`/index.php/${app.contextPath}/${R.path}`));
    record('step6-reader-list', await screen(page));
    for (let i = 0; i < 40; i++) {
        const st = await page.evaluate((link) => {
            const ids = [...new Set([...document.querySelectorAll(`a[href*="${link}"]`)].map((a) => Number((a.getAttribute('href').split(link)[1] || '').split(/[/?#]/)[0])).filter((n) => n > 0))];
            const cur = document.querySelector('.cmp_pagination .current');
            return {ids, showing: cur ? cur.innerText.replace(/\s+/g, ' ').trim() : null};
        }, R.link);
        pages.push(st);
        const next = page.locator('.cmp_pagination a.next');
        if (!(await next.count())) break;
        await next.click();
        await page.waitForLoadState('load');
    }
    return {path: R.path, pages};
}

async function walkDashboard(app, page) {
    const pages = [];
    let s = await L.openDashboardView(app, page, VIEW[app.name]);
    record('step4-dashboard', await screen(page));
    for (let i = 0; s && i < 40; i++) {
        pages.push({page: s.currentPage, showing: s.showing, ids: s.ids});
        s = await L.dashboardNext(page);
    }
    const total = Number(((pages[0] || {}).showing || '').split(' of ')[1]) || null;
    return {view: VIEW[app.name], heading: pages[0] && (await L.dashboardState(page)).heading, total, pages};
}

forEachApp(async (app) => {
    if (MODE === 'reader' && !READER[app.name]) return;
    const f = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(A11.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    const apiCalls = [];
    page.on('response', (r) => {
        if (/\/api\/v1\/(_)?submissions\?/.test(r.url())) apiCalls.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220)});
    });
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'neighbour') {
            await native.openNative(app, page);
            await native.openExportTab(app, page);
            const s = await A11.listState(page);
            const order = await page.locator('#exportSubmissions-tab .listPanel__item input[type=checkbox]').evaluateAll((bs) => bs.map((b) => Number(b.value)));
            f.exportList = {pagination: s.pagination, order};
            f.dashboard = await walkDashboard(app, page);
            return;
        }
        await precondition(app, page, f);
        if (MODE === 'reader') {
            await signOut(page);
            f.reader = await walkReader(app, page);
            f.readerTally = L.tally(f.reader.pages.flatMap((p) => p.ids));
            f.reader.pages = f.reader.pages.map((p) => ({showing: p.showing, n: p.ids.length, first: p.ids.slice(0, 3)}));
            return;
        }
        const all = (await sql(app, `select submission_id from submissions where context_id = (select min(context_id) from submissions) order by 1`)).trim().split('\n').map(Number).filter((n) => n > 0);
        f.inContext = all.length;
        f.dateGroups = (await sql(app, `select date_submitted, count(*) from submissions group by 1 having count(*) > 1 order by 2 desc limit 5`)).trim();
        // Steps 1–3
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        record('step1-export-list', await screen(page));
        f.files = [];
        for (const n of [1, 2, 3, 4]) {
            const r = await exportPage(app, page, n);
            f.files.push(r);
            if (n === 2) record('step3-page-2', await screen(page));
        }
        const shownAll = f.files.flatMap((x) => x.shown);
        const fileAll = f.files.flatMap((x) => x.file);
        f.shownTally = L.tally(shownAll, all);
        f.fileTally = L.tally(fileAll, all);
        f.files = f.files.map((x) => ({...x, shown: x.shown.length, fileCount: x.file.length, file: undefined, firstShown: x.shown.slice(0, 5)}));
        // Steps 4–5
        f.dashboard = await walkDashboard(app, page);
        const dashIds = f.dashboard.pages.flatMap((p) => p.ids);
        f.dashboardTally = L.tally(dashIds);
        f.dashboard.pages = f.dashboard.pages.map((p) => ({page: p.page, showing: p.showing, n: p.ids.length, first: p.ids.slice(0, 3)}));
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, `${MODE}-error`).catch(() => {});
    } finally {
        w.stop();
        f.apiCalls = apiCalls.filter((c, i) => i < 60);
        f.serverErrors = w.seen.filter((x) => x.status >= 400);
        f.scriptErrors = errs;
        record(MODE === 'steps' ? 'walk' : MODE, f);
        console.log(`[walk] ${app.name}`, JSON.stringify({...f, apiCalls: f.apiCalls.length, dashboard: f.dashboard && {total: f.dashboard.total, pages: (f.dashboard.pages || []).length}}, null, 1).slice(0, 3000));
        await close();
    }
});
