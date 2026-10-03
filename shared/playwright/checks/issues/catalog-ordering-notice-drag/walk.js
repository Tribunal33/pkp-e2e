// Issue report docs/issues/U70-A11-catalog-ordering-notice-offers-drag.md (U70 A11): while
// "Order Features" is on, the Catalog page's notice reads "Drag-and-drop or tap the up and down
// buttons…", but no row can be dragged; only the arrows move a book.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: features the two published
// books (5 and 14), presses "Order Features", reads the notice, drags the second row above the
// first with the mouse, presses its up arrow (the control), "Cancel", then "Filters" ›
// "Psychology", features book 14 in the series and reads the notice there. The kit builds nothing.
// Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// Modes (MODE=):
//   walk (default)  the Steps above.
//   nb              what the fix must leave alone, alone on a fresh reset: features both books,
//                   "Order Features", the second row's up arrow, "Save Order", a reload (the order
//                   holds), then the "Psychology" notice still names the series. Never drags.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-ordering-notice-drag/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix.diff applied or not.
// Records each screen and the facts (facts-<mode>[-<run>]-omp.json); asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle, loc} = require('../../../probe');

const MODE = process.env.MODE || 'walk';
const BOMB = 'Bomb Canada and Other Unkind Remarks in the American Media';
const BRICKS = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {CatalogPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    /** One step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: flat(e.message, 600)};
        }
    };
    const catalog = new CatalogPage(page, app.contextPath);
    const titles = async () => (await catalog.shownTitles().allInnerTexts()).map((t) => flat(t, 80));
    const snap = async (name) => {
        await idle(page);
        record(`${name}-screen`, await screen(page));
        await shot(page, name);
    };
    /** What ordering shows: the notice, the drag handles, the rows' drag attributes. */
    const orderingView = async () => ({
        notice: flat(await catalog.orderingNotice().innerText()),
        handles: await page.locator('.orderer__dragDrop').count(),
        handlesVisible: await page.locator('.orderer__dragDrop').filter({visible: true}).count(),
        draggableRows: await page.locator('.listPanel__item--catalog[draggable="true"], .listPanel__item--catalog [draggable="true"]').count(),
        sortable: await page.locator('.listPanel__items [class*="sortable"], .listPanel__items [data-draggable]').count(),
        rows: await titles(),
    });
    try {
        // Step 1.
        await signIn(page, 'dbarnes');
        // Step 2.
        fact('s2-open', await step('s2', async () => {
            if (app.line === 'stable-3_5_0') {
                // 3.5: "Catalog" is a top-level entry of the side menu, not under "Content".
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
                await idle(page);
                await page.getByRole('link', {name: 'Catalog', exact: true}).click();
                await page.waitForURL(/\/manageCatalog/);
            } else {
                await catalog.openFromSideMenu();
            }
            await catalog.expectLoaded();
            await snap('s2-catalog');
            return {rows: await titles()};
        }));
        // Step 3.
        fact('s3-feature', await step('s3', async () => {
            const a = (await catalog.pressFeatured(BOMB)).status();
            const b = (await catalog.pressFeatured(BRICKS)).status();
            await idle(page);
            return {saved: [a, b], rows: await titles()};
        }));
        // Steps 4-5.
        fact('s5-ordering', await step('s5', async () => {
            await catalog.startOrdering();
            await loc(page, 'Catalog: the ordering notice', catalog.orderingNotice());
            await loc(page, 'Catalog: drag handles while ordering', page.locator('.orderer__dragDrop'));
            const view = await orderingView();
            await snap('s5-ordering');
            return view;
        }));

        if (MODE === 'walk') {
            // Step 6: press on the second row's title, drag it above the first, let go.
            fact('s6-drag', await step('s6', async () => {
                const before = await titles();
                const second = catalog.rowTitle(before[1]);
                const first = catalog.row(before[0]);
                const from = await second.boundingBox();
                const to = await first.boundingBox();
                const x = from.x + from.width / 2;
                const y = from.y + from.height / 2;
                await page.mouse.move(x, y);
                await page.mouse.down();
                for (let i = 1; i <= 15; i++) {
                    await page.mouse.move(x, y + ((to.y + 5 - y) * i) / 15);
                }
                const during = await titles();
                await page.mouse.up();
                await idle(page);
                await snap('s6-after-drag');
                return {before, during, after: await titles(), cursor: await second.evaluate((el) => getComputedStyle(el).cursor)};
            }));
            // Step 7 (control): the second row's up arrow.
            fact('s7-up-arrow', await step('s7', async () => {
                const before = await titles();
                await catalog.upArrow(before[1]).click();
                await idle(page);
                await snap('s7-after-arrow');
                return {before, after: await titles()};
            }));
            // Step 8.
            fact('s8-cancel', await step('s8', async () => {
                await catalog.cancelOrdering();
                await idle(page);
                return {rows: await titles()};
            }));
        } else {
            // Neighbour: the arrows still move the book and "Save Order" saves it.
            fact('n1-arrow-save', await step('n1', async () => {
                const before = await titles();
                await catalog.upArrow(before[1]).click();
                await idle(page);
                const moved = await titles();
                const status = (await catalog.saveOrder()).status();
                await catalog.goto();
                await snap('n1-reloaded');
                return {before, moved, saved: status, reloaded: await titles()};
            }));
        }

        // Steps 9-11: a series.
        fact('s9-series', await step('s9', async () => {
            await catalog.chooseFilter('Psychology');
            await idle(page);
            const heads = flat(await catalog.columnHeadings().innerText().catch(() => ''));
            const saved = (await catalog.pressFeatured(BRICKS)).status();
            await idle(page);
            await catalog.startOrdering();
            const view = await orderingView();
            await snap('s11-series-ordering');
            return {columnHeadings: heads, saved, ...view};
        }));
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
