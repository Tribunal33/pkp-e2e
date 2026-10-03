// U70 A3 {OMP}: on the Catalog page a series or category filter set to an ascending "Order of
// monographs" lists its books the other way round (docs/issues/U70-A3-catalog-filter-order-reversed.md,
// fix-filter-order.diff), and once the filter is removed the whole catalog comes back newest first,
// whatever the press's own "Order of monographs" says
// (docs/issues/U70-A3-catalog-press-order-lost-after-filter.md, fix-press-order.diff).
// The Steps of both reports in one walk (the second's Steps are steps 1-8; the first's "Series" steps
// are 1-4, 6, 7 and its "Category" steps 9-10),
// on PKP's default test dataset, as `dbarnes`. Spec: docs/specs/U70-catalog-management.md,
// register A3 (Rule 4).
// Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/catalog-page-order-with-filter/walk.js
// MODE=neighbour runs the neighbour check alone (what a fix must leave alone): "Psychology" on
// "Title (Z-A)" still lists Z-A; the category "Social Sciences" on its default "Publication date
// (newest first)" still asks for newest first; with the press on no choice (newest first) a removed
// filter still brings the catalog back newest first.
// Records the screens and the list's order requests; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle, loc} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {submissionId: 4, series: 'Psychology', date: '2020-01-01'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {CatalogPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
    const {page, close} = await launch(app);
    const gets = L.watchListGets(page);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: L.flat(e.message, 600)};
        }
    };
    // Read the list and the order request the last press sent.
    const read = async (catalog, name) => {
        await idle(page);
        const out = {titles: await L.titles(catalog), request: gets[gets.length - 1] || null};
        record(`${name}-screen`, await screen(page));
        await shot(page, name);
        return out;
    };
    try {
        fact('state-before', L.state(app));
        // Step 1.
        await signIn(page, 'dbarnes');
        // Steps 2-4.
        fact('s4-publish', await step('s4', () => L.publishIntoSeries(page, app, BOOK)));
        const catalog = new CatalogPage(page, app.contextPath);

        if (MODE === 'walk') {
            // Step 5.
            fact('s5-press-order', await step('s5', () => L.setPressOrder(page, app, 'Title (Z-A)')));
            fact('state-after-setup', L.state(app));
            // Step 6.
            fact('s6-open', await step('s6', async () => {
                await catalog.goto();
                await loc(page, 'Catalog: the rows\' titles', catalog.shownTitles());
                return read(catalog, 's6-catalog');
            }));
            // Step 7.
            fact('s7-series', await step('s7', async () => {
                await catalog.chooseFilter('Psychology');
                await loc(page, 'Catalog: "Filters" › Psychology', catalog.filterEntry('Psychology'));
                return read(catalog, 's7-psychology');
            }));
            // Step 8.
            fact('s8-removed', await step('s8', async () => {
                await catalog.chooseFilter('Psychology');
                return read(catalog, 's8-filter-removed');
            }));
            fact('s8-reload', await step('s8r', async () => {
                await catalog.goto();
                return read(catalog, 's8-reloaded');
            }));
            // The category half (the first report's "Category" steps): "Social Sciences" on
            // "Title (A-Z)"; the dataset places no published book in it, so the request carries it.
            // On 3.5 the dataset's categories already hold "Title (A-Z)", so step 9 is skipped there.
            fact('s9-category-order', L.categoryOrder(app, 'social-sciences') === 'title-ASC'
                ? 'already title-ASC'
                : await step('s9', () => L.setCategoryOrder(page, app, 'Social Sciences', 'Title (A-Z)')));
            fact('s10-category', await step('s10', async () => {
                await catalog.goto();
                await catalog.chooseFilter('Social Sciences');
                return read(catalog, 's10-social-sciences');
            }));
            fact('state-after-category', L.state(app));
        } else {
            fact('n1-series-za', await step('n1', async () => {
                await L.setSeriesOrder(page, app, 'Psychology', 'Title (Z-A)');
                await catalog.goto();
                await catalog.chooseFilter('Psychology');
                return read(catalog, 'n1-psychology-za');
            }));
            fact('n2-category-default', await step('n2', async () => {
                await catalog.chooseFilter('Social Sciences');
                return read(catalog, 'n2-social-sciences');
            }));
            fact('n3-press-default', await step('n3', async () => {
                await catalog.goto();
                const first = await read(catalog, 'n3-open');
                await catalog.chooseFilter('Psychology');
                await catalog.chooseFilter('Psychology');
                return {first, removed: await read(catalog, 'n3-filter-removed')};
            }));
            fact('state-neighbour', L.state(app));
        }
    } finally {
        fact('gets', gets);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
