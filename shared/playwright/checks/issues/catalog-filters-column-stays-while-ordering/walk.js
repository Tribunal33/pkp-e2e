// Issue report docs/issues/U70-A12-catalog-filters-column-stays-while-ordering.md (U70 A12): on a
// press's Catalog page, "Order Features" hides the "Filters" button but not a "Filters" column
// already open; a series or category chosen there switches the list while ordering goes on, and
// where nothing is featured the page keeps only the ordering notice, with no "Save Order" or "Cancel".
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's Press editor `dbarnes` on `publicknowledge` (OMP only: a journal and a
// preprint server have no Catalog page). Features the dataset's two published books (5 and 14) with
// their "Featured" boxes. The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps: feature both books, "Filters", "Order Features", the first book's
//                    down arrow, "Psychology" in the column, its "Clear filter" cross. Each step
//                    records what the page shows; a step the page does not offer is recorded, not thrown.
//   nonempty         the Steps' second group (run alone, after a reset): steps 1-4, then "Psychology"
//                    with its book featured in the series, the filter cleared, "Order Features", the
//                    down arrow of "Bomb Canada…", "Psychology" in the column, "Save Order" (its
//                    request body and the stored features), a reload and "Order Features".
//   nb               what a fix must leave alone (run alone, after a reset): with the column open,
//                    "Order Features" then "Cancel" (the column after); "Psychology" chosen outside
//                    ordering, its book featured in the series, "Order Features" (notice), "Save Order"
//                    (saved, the filter still chosen, the column after); the column closed, "Order
//                    Features" and "Save Order" (the column stays closed); "Filters" opens it again.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u70k --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u70k PROBE_AGENT=u70k node bin/probe.js omp shared/playwright/checks/issues/catalog-filters-column-stays-while-ordering/walk.js [steps|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u70k-3_5, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/u70k/order-facts[-<run>]-omp.json
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, shot, sql} = require('../../../probe');

const mode = process.argv[2] || 'steps';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const BOMB = 'Bomb Canada and Other Unkind Remarks in the American Media';
const BRICKS = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const SERIES = 'Psychology';

forEachApp(async (app) => {
    if (app.name !== 'omp') return console.log(`[fact] ${app.name}: no Catalog page (OMP only)`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {CatalogPage} = require(path.join(app.suiteDir, 'pages', 'CatalogPages.js'));
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };
    /** Run one step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, flat(e.message, 400));
        }
    };

    const {page, close} = await launch(app);
    const c = new CatalogPage(page, app.contextPath);
    const vis = (l) => l.first().isVisible().catch(() => false);
    /** What the Catalog page offers right now. */
    const state = async () => ({
        notice: (await vis(c.orderingNotice())) ? flat(await c.orderingNotice().first().innerText()) : null,
        rowsShown: (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 40)),
        emptyLine: (await vis(c.emptyLine())) ? flat(await c.emptyLine().innerText()) : null,
        filtersButton: await vis(c.filtersButton()),
        filtersColumn: await vis(c.filtersColumnHeading()),
        clearFilter: await vis(page.getByRole('button', {name: /^Clear filter: /})),
        search: await vis(c.searchBox()),
        orderFeatures: await vis(c.orderFeaturesButton()),
        saveOrder: await vis(c.saveOrderButton()),
        cancel: await vis(c.cancelOrderButton()),
        addEntry: await vis(c.addEntryButton()),
    });
    const settle = async () => {
        await idle(page);
        await sleep(500);
    };
    /** Press a filter entry in the column when the page shows it; the list's fetch status, or why not. */
    const pressEntry = async (name) => {
        const e = c.filterEntry(name);
        if (!(await vis(e))) return {pressed: false, why: 'the column does not show it'};
        const got = page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
        await e.first().click();
        const r = await got;
        await settle();
        return {pressed: true, status: r ? r.status() : null};
    };
    /** The row's "Featured" box as a screen reader names it: 'ticked', 'empty' or null. */
    const featured = async (title) => {
        if (await c.row(title).getByRole('button', {name: 'This monograph is featured. Make this monograph not featured.'}).count()) return 'ticked';
        if (await c.row(title).getByRole('button', {name: 'This monograph is not featured. Make this monograph featured.'}).count()) return 'empty';
        return null;
    };

    try {
        await signIn(page, 'dbarnes');
        // steps 1-2
        await c.goto();
        await settle();
        fact('2 Catalog page', await state());

        // step 3: feature both books (the boxes of the whole catalog)
        await step('3', async () => {
            for (const title of [BOMB, BRICKS]) {
                if ((await featured(title)) === 'empty') await c.pressFeatured(title);
            }
            await settle();
            fact('3 boxes after', {bomb: await featured(BOMB), bricks: await featured(BRICKS)});
            fact('3 page', await state());
        });

        // step 4: "Filters"
        await step('4', async () => {
            await c.openFilters();
            await settle();
            fact('4 page', await state());
        });

        if (mode === 'steps') {
            // step 5: "Order Features"
            await step('5', async () => {
                await c.orderFeaturesButton().click();
                await settle();
                const s = await state();
                fact('5 page', s);
                record(`order-5${run}`, await screen(page));
                await shot(page, `order-5${run}`);
            });
            // step 6: the first book's down arrow
            await step('6', async () => {
                const before = (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 200));
                const first = c.shownRows().first().locator('button.orderer__down');
                await first.click();
                await sleep(500);
                fact('6 rows before, after the first down arrow', [before.map((t) => flat(t, 40)), (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 40))]);
            });
            // step 7: "Psychology" in the column
            await step('7', async () => {
                fact('7 press', await pressEntry(SERIES));
                fact('7 page', await state());
                record(`order-7${run}`, await screen(page));
                await shot(page, `order-7${run}`);
            });
            // step 8: "Clear filter: Psychology"
            await step('8', async () => {
                const x = c.clearFilterButton(SERIES);
                if (!(await vis(x))) return fact('8 press', {pressed: false, why: 'no "Clear filter: Psychology" on the page'});
                const got = page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
                await x.click();
                const r = await got;
                await settle();
                fact('8 press', {pressed: true, status: r ? r.status() : null});
                fact('8 page', await state());
                record(`order-8${run}`, await screen(page));
            });
            fact('stored features', sql(app, 'select submission_id, assoc_type, assoc_id, seq from features order by 2, 3, 4'));
        } else if (mode === 'nonempty') {
            const rows = async () => (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 40));
            // step 9: "Psychology", its book featured in the series
            await step('9', async () => {
                fact('9 press Psychology', await pressEntry(SERIES));
                if ((await featured(BRICKS)) === 'empty') await c.pressFeatured(BRICKS);
                await settle();
                fact('9 Bricks in Psychology', await featured(BRICKS));
            });
            // step 10: "Clear filter: Psychology"
            await step('10', async () => {
                await c.clearFilter(SERIES);
                await settle();
                fact('10 page', await state());
            });
            // step 11: "Order Features"
            await step('11', async () => {
                await c.orderFeaturesButton().click();
                await settle();
                fact('11 page', await state());
            });
            // step 12: the down arrow of "Bomb Canada…"
            await step('12', async () => {
                await c.downArrow(BOMB).click();
                await sleep(500);
                fact('12 rows', await rows());
            });
            // step 13: "Psychology" in the column, while ordering
            await step('13', async () => {
                fact('13 press', await pressEntry(SERIES));
                fact('13 page', await state());
                record(`order-13${run}`, await screen(page));
                await shot(page, `order-13${run}`);
            });
            // step 14: "Save Order" (the request the page sends, read from the browser's own traffic)
            await step('14', async () => {
                if (!(await vis(c.saveOrderButton()))) return fact('14 press', {pressed: false, why: 'no "Save Order" on the page'});
                const req = page.waitForRequest((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                const res = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await c.saveOrderButton().click();
                const q = await req;
                const r = await res;
                await settle();
                fact('14 save', {status: r ? r.status() : null, body: q ? decodeURIComponent(q.postData() || '') : null});
                fact('14 page', await state());
                fact('14 stored features', sql(app, 'select submission_id, assoc_type, assoc_id, seq from features order by 2, 3, 4'));
            });
            // step 15: reload, "Order Features"
            await step('15', async () => {
                await c.goto();
                await settle();
                fact('15 page after reload', await state());
                await c.orderFeaturesButton().click();
                await settle();
                fact('15 ordering rows', await rows());
            });
        } else if (mode === 'nb') {
            // nb1: column open, "Order Features", "Cancel"
            await step('nb1', async () => {
                await c.orderFeaturesButton().click();
                await settle();
                fact('nb1 ordering, column open before', await state());
                await c.cancelOrdering();
                await settle();
                fact('nb1 after Cancel', await state());
            });
            // nb2: "Psychology" outside ordering, its book featured in the series, ordering, "Save Order"
            await step('nb2', async () => {
                fact('nb2 press Psychology', await pressEntry(SERIES));
                if ((await featured(BRICKS)) === 'empty') await c.pressFeatured(BRICKS);
                await settle();
                fact('nb2 Psychology list', await state());
                await c.orderFeaturesButton().click();
                await settle();
                fact('nb2 ordering in Psychology', await state());
                const saved = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await c.saveOrderButton().click();
                const r = await saved;
                await settle();
                fact('nb2 Save Order status', r ? r.status() : null);
                fact('nb2 after Save Order', await state());
                fact('nb2 focus after Save Order', flat(await page.evaluate(() => document.activeElement && (document.activeElement.innerText || document.activeElement.tagName)), 80));
                const x = c.clearFilterButton(SERIES);
                if (await vis(x)) {
                    await c.clearFilter(SERIES);
                    await settle();
                }
                fact('nb2 after Clear filter', await state());
            });
            // nb3: column closed, ordering, "Save Order": the column stays closed; "Filters" opens it
            await step('nb3', async () => {
                if (await vis(c.filtersColumnHeading())) await c.closeFilters();
                await settle();
                await c.orderFeaturesButton().click();
                await settle();
                fact('nb3 ordering, column closed before', await state());
                await c.saveOrder();
                await settle();
                fact('nb3 after Save Order', await state());
                await c.openFilters();
                await settle();
                fact('nb3 after Filters', await state());
            });
            fact('stored features', sql(app, 'select submission_id, assoc_type, assoc_id, seq from features order by 2, 3, 4'));
        }
    } finally {
        record(`order-facts${run}`, facts);
        await close();
    }
});
