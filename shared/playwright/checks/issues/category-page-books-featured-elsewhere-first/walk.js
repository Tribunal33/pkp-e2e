// Issue report docs/issues/U70-A10-category-page-books-featured-elsewhere-first.md (spec U70 A10, the
// order half): a press's category page lists first a book featured only in the whole catalog, ahead
// of the book featured in that category. Takes the report's Steps on PKP's default test dataset (a
// dataset fleet), OMP only (featured books are a press's):
//   pre  sign in as dbarnes; books 5 "Bomb Canada…" and 14 "From Bricks to Brains…": Unpublish,
//        "Catalog Entry" › "Categories" "Social Sciences", "Save", Publish
//   2    Catalog, no filter: "Featured" on Bricks, then on Bomb
//   3    Catalog afresh: "Order Features", Bricks first, "Save Order"
//   4    Catalog, filter "Social Sciences": "Featured in category" on Bomb
//   5    the category's page (and, as the control, the catalog page)
// WALK=neighbour runs alone (fix in and out): the preconditions, then "Featured" on Bricks in the
// whole catalog only; the category's page, the catalog page and the search page for "Canada": what
// the fix must leave as it is (every book still listed, the catalog's own order, the search).
// Records the screens; asserts nothing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 feature> PROBE_AGENT=<id> node bin/probe.js omp …/walk.js
const {forEachApp, launch, signIn, screen, record, idle, note, serverLog} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u70i A10 order: ${app.name} skipped, featured books are a press's`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        }
    };
    const categoryPage = async (label) => {
        const r = await L.readPublic(page, app, `/catalog/category/${L.CATEGORY.path}`, label);
        record(label, await screen(page));
        return {status: r.status, dropped: r.dropped, count: r.count, lists: r.lists.map((l) => ({heading: l.heading, books: L.shortTitles(l)}))};
    };
    try {
        await step('1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
        await step(`pre book ${L.BOMB.sid} in Social Sciences`, () => L.placeInCategory(page, app, L.BOMB));
        await step(`pre book ${L.BRICKS.sid} in Social Sciences`, () => L.placeInCategory(page, app, L.BRICKS));
        await step('pre category page, no flags', () => categoryPage('a10o-pre-category'));

        if (MODE === 'walk') {
            await step('2 whole catalog: Featured on Bricks, then Bomb', async () => {
                const c = await L.openCatalog(page, app, null);
                return [await L.press(page, c, L.BRICKS, 'featured'), await L.press(page, c, L.BOMB, 'featured')];
            });
            await step('3 whole catalog afresh: Order Features, Bricks first, Save Order', async () => {
                const c = await L.openCatalog(page, app, null);
                const rows = await L.catalogRows(c);
                return {rows, ...(await L.orderFirst(page, c, L.BRICKS)), after: await L.catalogRows(await L.openCatalog(page, app, null))};
            });
            await step('4 Social Sciences: Featured in category on Bomb', async () => {
                const c = await L.openCatalog(page, app, L.CATEGORY.name);
                const out = await L.press(page, c, L.BOMB, 'featured');
                const again = await L.openCatalog(page, app, L.CATEGORY.name);
                return {...out, rowsAfterReload: await L.catalogRows(again), bricks: await L.boxes(again, L.BRICKS.title)};
            });
            record('a10o-s4-catalog-social', await screen(page));
            fact('4 rows', L.flagRows(app));
            await step('5 the category page', () => categoryPage('a10o-s5-category'));
            await step('control: the catalog page', async () => {
                const r = await L.readPublic(page, app, '/catalog', 'a10o-control-catalog');
                return {status: r.status, lists: r.lists.map((l) => ({heading: l.heading, books: L.shortTitles(l)}))};
            });
        } else if (MODE === 'neighbour') {
            await step('n1 whole catalog: Featured on Bricks only', async () => {
                const c = await L.openCatalog(page, app, null);
                return L.press(page, c, L.BRICKS, 'featured');
            });
            fact('n1 rows', L.flagRows(app));
            await step('n2 the category page', () => categoryPage('a10o-n2-category'));
            await step('n3 the catalog page', async () => {
                const r = await L.readPublic(page, app, '/catalog', 'a10o-n3-catalog');
                return {status: r.status, lists: r.lists.map((l) => ({heading: l.heading, books: L.shortTitles(l)}))};
            });
            await step('n4 the search page for "Canada"', async () => {
                const r = await L.readPublic(page, app, '/search/search?query=Canada', 'a10o-n4-search');
                const titles = await page.locator('.obj_monograph_summary .title').allInnerTexts().catch(() => []);
                return {status: r.status, titles: titles.map((t) => L.flat(t, 60))};
            });
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`a10o-facts-${MODE}`, facts);
        await close();
    }
});
