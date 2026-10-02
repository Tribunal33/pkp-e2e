// Walk of docs/issues/U16-A2-category-order-of-articles-ignored.md (U16 A2) on PKP's default
// test dataset: three published items placed in "Social Sciences" through the workflow, then the
// category's "Order of articles" set to "Title (A-Z)" and to "Title (Z-A)", the category's page
// read after each save.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/category-order-of-articles-ignored/walk.js
//
// MODE=nb runs the neighbour check alone (for a fix trial): the same three items placed, then the
// category's page at the order it arrives with ("Publication date (newest first)"), the search
// page for "Reason", and on a press a book featured in the catalog ahead of the title order.
// Records are named `a2walk-*` (steps) and `a2nb-*` (neighbour); PROBE_RUN keeps runs apart.
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE === 'nb' ? 'nb' : 'steps';
// A wait a failed step leaves behind must not end the process before the other apps.
process.on('unhandledRejection', (e) => console.log(`[warn] unhandled: ${String((e && e.message) || e).split('\n')[0]}`));
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    const P = MODE === 'nb' ? 'a2nb' : 'a2walk';
    const items = L.ITEMS[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, items: []};
    const fact = (k, v) => {
        facts[k] = v;
        record(`${P}-facts`, facts);
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        await signIn(page, 'dbarnes');

        // Step 1: the three items placed in the category.
        for (const item of items) {
            const label = `${P}-s${item.id}`;
            const one = {id: item.id, from: item.from};
            try {
                await L.openWorkflow(page, app, item.id);
                if (item.from === 'published') one.unpublish = await L.unpublish(page, app);
                await L.openEntryPage(page, app);
                one.place = await L.placeInCategory(page, app, ISSUE, label);
                one.publish = await L.publish(page, app, ISSUE, label);
            } catch (e) {
                one.error = L.flat(e.message, 400);
                await L.snap(page, `${label}-error`);
            }
            facts.items.push(one);
            fact('items', facts.items);
        }

        // The listing follows the search index, which the job runner fills on later requests.
        let arrival = null;
        for (let i = 0; i < 6; i++) {
            arrival = await L.readCategoryPage(page, app, `${P}-arrival`);
            if (arrival.titles.length >= items.length) break;
            await L.sleep(3000);
        }
        fact('arrival', arrival);

        const expectedAZ = items.map((i) => i.title).sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));
        if (MODE === 'steps') {
            // Steps 2-4: "Title (A-Z)", the page.
            fact('orderAZ', await L.setOrder(page, app, 'Title (A-Z)', `${P}-az`));
            const az = await L.readCategoryPage(page, app, `${P}-page-az`);
            fact('pageAZ', {...az, expected: expectedAZ, asExpected: L.inOrder(az.titles, expectedAZ)});
            // Steps 5-6: "Title (Z-A)", the page.
            fact('orderZA', await L.setOrder(page, app, 'Title (Z-A)', `${P}-za`));
            const za = await L.readCategoryPage(page, app, `${P}-page-za`);
            const expectedZA = [...expectedAZ].reverse();
            fact('pageZA', {...za, expected: expectedZA, asExpected: L.inOrder(za.titles, expectedZA)});
            fact('sameOrderBothWays', JSON.stringify(az.titles) === JSON.stringify(za.titles));
        } else {
            // Neighbour 1: the order the category arrives with ("Publication date (newest first)").
            fact('nbDefault', {status: arrival && arrival.status, titles: arrival && arrival.titles, listed: arrival ? arrival.titles.length : 0});
            // Neighbour 2: the search page, typed into the header's search ("Reason").
            const res = await page.goto(app.url(`/index.php/${app.contextPath}/search/search?query=Reason`));
            await idle(page).catch(() => {});
            await L.snap(page, `${P}-search`);
            const found = await page.locator('.obj_article_summary .title, .obj_preprint_summary .title, .obj_monograph_summary .title').allInnerTexts().catch(() => []);
            fact('nbSearch', {status: res ? res.status() : null, titles: found.map((t) => L.flat(t, 120))});
            // Neighbour 3 (press): a book featured in the catalog stays first under "Title (A-Z)".
            if (app.name === 'omp') {
                const path = require('path');
                const {CatalogPage} = require(path.join(app.suiteDir, 'pages', 'CatalogPages.js'));
                const catalog = new CatalogPage(page, app.contextPath);
                const out = {};
                try {
                    // Catalog: the book found by its title, its "Featured" box pressed.
                    await catalog.goto();
                    const featured = items[0].title; // "How Canadians Communicate…", last by title
                    const fullTitle = 'How Canadians Communicate: Contexts of Canadian Popular Culture';
                    await catalog.search(featured);
                    const box = catalog.featuredBox(fullTitle);
                    await box.waitFor({timeout: L.T});
                    out.boxBefore = await box.getAttribute('aria-label').catch(() => null);
                    out.featureSave = (await catalog.pressFeatured(fullTitle)).status();
                    out.boxAfter = await box.getAttribute('aria-label').catch(() => null);
                    await L.snap(page, `${P}-featured`);
                    out.order = await L.setOrder(page, app, 'Title (A-Z)', `${P}-feat-az`);
                    const pg = await L.readCategoryPage(page, app, `${P}-page-feat-az`);
                    const expected = [featured, ...expectedAZ.filter((t) => t !== featured)];
                    out.page = {...pg, expected, asExpected: L.inOrder(pg.titles, expected), featuredFirst: (pg.titles[0] || '').startsWith(featured)};
                } catch (e) {
                    out.error = L.flat(e.message, 400);
                    await L.snap(page, `${P}-featured-error`);
                }
                fact('nbFeatured', out);
            }
        }
    } finally {
        await close();
    }
});
