// Issue report docs/issues/U69-A9-book-file-open-download-fails.md (U69 A9, with U20 OMP6,
// U64 OMP3 and U47 OMP1): on a press no free book file opens or downloads. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), on its press `publicknowledge`, with its published book 5 and that book's
// free "PDF" file. The kit builds nothing.
//
//   1. signed out: Catalog, "Bomb Canada and Other Unkind Remarks in the American Media"
//   2. press "PDF"
//   3. read the viewer
//   4. press "Download" in the bar
//   5. press the viewer's own "Download"
//   6. sign in as dbarnes; Settings › Website › "Plugins": untick "PDF.js PDF Viewer", "OK"
//   7. sign out, open the book's page, press "PDF"
//   The usage log's new lines are read after steps 1, 3 and 7.
//
// WALK=neighbour (fix in and out): signed out, the book's page opens and writes its
// usage line; a file address naming another book's file (catalog/view/5/2/1) and one
// naming no file (catalog/download/5/2/999999) stay "404 Not Found".
//
// Reset first:  npm run fleet-prep -- --feature issues-r1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js omp shared/playwright/checks/issues/book-file-open-download-fails/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r1-3_5 PROBE_AGENT=r1 node bin/probe.js omp shared/playwright/checks/issues/book-file-open-download-fails/walk.js
// Facts: .reports/<feature>/r1/[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const BOOK = 5;
const TITLE = 'Bomb Canada and Other Unkind Remarks in the American Media';
const VIEWER = 'pdfjsviewerplugin';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {flat, rel, watch} = require('../older-version-pdf-reader-empty/lib');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const plugins = require('../doaj-tool-stays-on-plugins-list-when-off/lib');
    const {usageLog, readViewPage, pressForDownload} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const log = serverLog(app);
    const usage = usageLog(app);
    const ctx = `/index.php/${app.contextPath}/en`;

    const {page, close} = await launch(app);
    const watched = watch(page);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(flat(e.message, 200)));
    // every catalog address that answers an error (the view page with the viewer off, step 7)
    const refused = [];
    page.on('response', (r) => {
        if (r.status() >= 400 && /\/catalog\//.test(r.url())) refused.push({url: rel(r.url()), status: r.status()});
    });

    /** Steps 1 and 7: the catalog, then the book's title. */
    const openBook = async (label) => {
        await page.goto(app.url(`${ctx}/catalog`));
        const answered = page.waitForResponse((r) => r.request().resourceType() === 'document' && /\/catalog\/book\//.test(r.url()));
        await page.getByRole('link', {name: TITLE}).first().click();
        const r = await answered;
        await idle(page).catch(() => {});
        const files = await page.locator('.obj_monograph_full a.cmp_download_link').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
        fact(`${label} book page`, {url: rel(page.url()), status: r.status(), title: await page.title(), files: files.map((f) => ({...f, href: rel(f.href)}))});
        record(name(`${label}-book`), await screen(page));
    };
    /** An address typed into the browser: status, tab title, what the page shows. */
    const typed = async (address) => {
        const r = await page.goto(app.url(address)).catch((e) => ({error: flat(e.message, 160)}));
        return {address, status: r && r.status ? r.status() : r, title: await page.title().catch(() => null), body: flat(await page.locator('body').innerText().catch(() => ''), 200)};
    };

    try {
        if (MODE === 'neighbour') {
            await openBook('n1');
            await page.waitForTimeout(1500);
            fact('n1 usage lines', usage.since());
            fact('n2 another book\'s file', await typed(`${ctx}/catalog/view/${BOOK}/2/1`));
            fact('n3 no such file', await typed(`${ctx}/catalog/download/${BOOK}/2/999999`));
            fact('n usage lines', usage.since());
            fact('n server log', log.since());
            return;
        }

        // 1
        await openBook('1');
        await page.waitForTimeout(1500);
        fact('1 usage lines', usage.since());
        // 2-3
        watched.splice(0);
        const opened = page.waitForResponse((r) => r.request().resourceType() === 'document' && /\/catalog\/view\//.test(r.url()));
        await page.locator('.obj_monograph_full a.cmp_download_link', {hasText: /^\s*PDF\s*$/}).first().click();
        fact('2 view page answer', {url: rel((await opened).url()), status: (await opened).status()});
        fact('3 view page', await readViewPage(page));
        fact('3 file requests', watched.splice(0));
        fact('3 script errors', scriptErrors.splice(0));
        record(name('3-view'), await screen(page));
        await shot(page, name('3-view')).catch(() => {});
        // 4
        fact('4 bar Download', await pressForDownload(page, page.locator('header.header_viewable_file a.download'), watched));
        // 5
        fact('5 viewer Download', await pressForDownload(page, page.frameLocator('#pdfCanvasContainer > iframe').locator('#download'), watched));
        fact('1-5 usage lines', usage.since());
        fact('1-5 server log', log.since());

        // 6
        await signIn(page, 'dbarnes');
        await plugins.openPlugins(app, page);
        fact('6 before', await plugins.rowState(app, page, VIEWER));
        fact('6 untick', await plugins.setEnabled(app, page, VIEWER, false));
        fact('6 after', await plugins.rowState(app, page, VIEWER));
        await signOut(page);
        // 7
        await openBook('7');
        await page.waitForTimeout(1500);
        usage.since();
        watched.splice(0);
        fact('7 press PDF', await pressForDownload(page, page.locator('.obj_monograph_full a.cmp_download_link', {hasText: /^\s*PDF\s*$/}).first(), watched));
        record(name('7-after'), await screen(page).catch(() => null));
        await shot(page, name('7-after')).catch(() => {});
        fact('1-7 catalog addresses answering an error', refused);
        fact('7 usage lines', usage.since());
        fact('7 server log', log.since());
        fact('7 script errors', scriptErrors.splice(0));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
