// U18 A3: the web feed's "Include identifiers (ISBN, keywords, categories, etc.) in the feed summary?" never adds an ISBN.
// Report: docs/issues/U18-A3-web-feed-identifiers-label-names-isbn.md. Steps, as `dbarnes` on the default dataset:
// {OMP} give the published book 14 an ISBN-13 on its "PDF" format (Publication Formats › "Edit" › "Metadata" › "Add
// Code") and read the book's page; then on each app Settings › Website › "Plugins" › "Web Feed Plugin" › "Settings",
// tick the box, "OK", and read the three feeds signed in and their items' summaries.
//
//   npm run fleet-prep -- --feature issues-u18a3 --dataset 2 --reset
//   PROBE_FEATURE=issues-u18a3 PROBE_AGENT=u18a3 node bin/probe.js all shared/playwright/checks/issues/web-feed-identifiers-label-names-isbn/walk.js
//
// MODE=nb (the neighbour check, run alone): the window's other labels, the Atom summaries with the box ticked, and
// with it unticked again; they must read the same with the fix in and out. Run the trial's walks under
// PROBE_RUN=fix, nb-in, nb-out; a 3.5 walk under PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 with its line fleet's feature.
// No assertions: the script records, the reader judges.
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE === 'nb' ? 'nb' : 'steps';
const BOOK = 14;
const ISBN = '9781897425789';

forEachApp(async (app) => {
    const R = `a3-${MODE}`;
    const fact = (k, v) => { record(R, {[k]: v}, {merge: true}); console.log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            const w = await L.openFeedWindow(page, app);
            fact('window', w);
            fact('tick', await L.saveIdentifiers(page, true));
            fact('atom-ticked', await L.readFeed(page, app, 'atom'));
            await L.openFeedWindow(page, app);
            fact('untick', await L.saveIdentifiers(page, false));
            fact('atom-unticked', await L.readFeed(page, app, 'atom'));
            await signOut(page).catch(() => {});
            return;
        }
        // P1–P2 {OMP}: an ISBN-13 on the published book's format, and the book's page.
        if (app.name === 'omp') {
            try { fact('isbn', await L.addIsbn(page, app, BOOK, ISBN)); } catch (e) { fact('isbn-error', L.flat(e.stack, 600)); }
            record(`${R}-format`, await screen(page));
            await shot(page, `${R}-format`);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${BOOK}`));
            const s = await screen(page);
            record(`${R}-book-page`, s);
            fact('bookPage', {title: s.title, isbnLines: String(s.text.main || s.text.body || JSON.stringify(s.text)).split('\n').filter((l) => /isbn|97818974/i.test(l)).map((l) => L.flat(l, 120))});
        }
        // 2. The plugin's "Settings" window.
        const w = await L.openFeedWindow(page, app);
        fact('window', w);
        record(`${R}-window`, await screen(page));
        await shot(page, `${R}-window`);
        // 3. Tick the box, "OK".
        fact('tick', await L.saveIdentifiers(page, true));
        // 4. The three feeds.
        for (const t of L.FEEDS) {
            const f = await L.readFeed(page, app, t, {isbn: app.name === 'omp' ? ISBN : null});
            fact(`feed-${t}`, {...f, list: app.name === 'omp' ? f.list.filter((i) => /Bricks/.test(i.title || '')) : f.list.slice(0, 2)});
            record(`${R}-feed-${t}`, f);
        }
        await page.goto(app.url(`/index.php/${app.contextPath}/en/gateway/plugin/WebFeedGatewayPlugin/atom`)).catch((e) => fact('atom-goto', L.flat(e.message, 120)));
        record(`${R}-atom-screen`, await screen(page).catch((e) => ({error: L.flat(e.message, 120)})));
        await signOut(page).catch(() => {});
    } finally {
        await close();
    }
});
