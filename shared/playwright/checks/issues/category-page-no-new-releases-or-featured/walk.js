// Issue report docs/issues/U70-A10-U68-A7-category-page-no-new-releases-or-featured.md (spec U70 A10,
// the "New Releases" half, and spec U68 A7): a press's category page never lists the books ticked "New
// release in category" and draws the books featured there like the rest. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), OMP only (featured books and new releases are a press's):
//   pre  sign in as dbarnes; books 5 "Bomb Canada…" and 14 "From Bricks to Brains…": Unpublish,
//        "Catalog Entry" › "Categories" "Social Sciences", "Save", Publish
//   2    Catalog, filter "Social Sciences": "Featured in category" on Bomb, "New release in
//        category" on Bricks
//   3    the category's page
//   control  Catalog, filter "Psychology" (Bricks' series): "Featured in series" and "New release
//        in series" on Bricks; the series' page
// WALK=neighbour runs alone (fix in and out): the preconditions, then the whole catalog's "Featured"
// and "New release" on Bomb and the category's "New release in category" on Bricks; the category's
// page (only the category's own flags may show), the "Applied Science" category's page (no book),
// the catalog page and the "New Releases" page (the whole catalog's lists, left as they are).
// Records the screens; asserts nothing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/category-page-no-new-releases-or-featured/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 feature> PROBE_AGENT=<id> node bin/probe.js omp …/walk.js
const {forEachApp, launch, signIn, screen, record, note, serverLog} = require('../../../probe');
const L = require('../category-page-books-featured-elsewhere-first/lib.js');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u70i A10/U68 A7: ${app.name} skipped, featured books and new releases are a press's`);
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
    const pub = async (address, label) => {
        const r = await L.readPublic(page, app, address, label);
        record(label, await screen(page));
        return {status: r.status, dropped: r.dropped, count: r.count, lists: r.lists.map((l) => ({heading: l.heading, books: L.shortTitles(l), pairRows: l.books.filter((b) => b.inPairRow).length}))};
    };
    try {
        await step('1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
        await step(`pre book ${L.BOMB.sid} in Social Sciences`, () => L.placeInCategory(page, app, L.BOMB));
        await step(`pre book ${L.BRICKS.sid} in Social Sciences`, () => L.placeInCategory(page, app, L.BRICKS));

        if (MODE === 'walk') {
            await step('2 Social Sciences: Featured in category on Bomb, New release in category on Bricks', async () => {
                const c = await L.openCatalog(page, app, L.CATEGORY.name);
                return [await L.press(page, c, L.BOMB, 'featured'), await L.press(page, c, L.BRICKS, 'newRelease')];
            });
            record('a10n-s2-catalog-social', await screen(page));
            fact('2 rows', L.flagRows(app));
            await step('3 the category page', () => pub(`/catalog/category/${L.CATEGORY.path}`, 'a10n-s3-category'));
            await step('control a: Psychology: Featured and New release in series on Bricks', async () => {
                const c = await L.openCatalog(page, app, L.SERIES.name);
                return [await L.press(page, c, L.BRICKS, 'featured'), await L.press(page, c, L.BRICKS, 'newRelease')];
            });
            await step('control b: the series page', () => pub(`/catalog/series/${L.SERIES.path}`, 'a10n-control-series'));
        } else if (MODE === 'neighbour') {
            await step('n1 whole catalog: Featured and New release on Bomb', async () => {
                const c = await L.openCatalog(page, app, null);
                return [await L.press(page, c, L.BOMB, 'featured'), await L.press(page, c, L.BOMB, 'newRelease')];
            });
            await step('n2 Social Sciences: New release in category on Bricks', async () => {
                const c = await L.openCatalog(page, app, L.CATEGORY.name);
                return L.press(page, c, L.BRICKS, 'newRelease');
            });
            fact('n2 rows', L.flagRows(app));
            await step('n3 the category page', () => pub(`/catalog/category/${L.CATEGORY.path}`, 'a10n-n3-category'));
            await step('n4 Applied Science (no book)', () => pub('/catalog/category/applied-science', 'a10n-n4-applied'));
            await step('n5 the catalog page', () => pub('/catalog', 'a10n-n5-catalog'));
            await step('n6 the New Releases page', () => pub('/catalog/newReleases', 'a10n-n6-new-releases'));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`a10n-facts-${MODE}`, facts);
        await close();
    }
});
