// Issue report docs/issues/U70-A14-catalog-ordering-arrows-name-undefined.md (U70 A14): while
// "Order Features" is on, a screen reader hears every row's arrows on the Catalog page as
// "Increase position of undefined" and "Decrease position of undefined".
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: features the two published
// books (5 and 14), presses "Order Features" and reads each row's arrows' names, "Cancel", then
// "Filters" › "Psychology", features book 14 in the series, "Order Features" and reads its arrows;
// the control is submission 4's Contributors list in ordering mode (the same arrows component).
// The kit builds nothing. Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader is given).
//
// Modes (MODE=):
//   walk (default)  the Steps above.
//   nb              what the fix must leave alone, alone on a fresh reset: features both books,
//                   "Order Features", the second row's up arrow moves it, "Save Order", a reload
//                   (the order holds), and the Contributors arrows keep their names.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-ordering-arrows-name-undefined/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix.diff applied or not.
// Records each screen and the facts (facts-<mode>[-<run>]-omp.json); asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const MODE = process.env.MODE || 'walk';
const BOMB = 'Bomb Canada and Other Unkind Remarks in the American Media';
const BRICKS = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const CONTROL_SUBMISSION = 4; // "How Canadians Communicate: Contexts of Canadian Popular Culture"
const T = 30_000;
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {CatalogPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
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
    /** Each shown row's title and its two arrows' accessible names (and the hidden texts' markup). */
    const arrowNames = async () => {
        const out = [];
        for (const title of await titles()) {
            const up = catalog.row(title).locator('button.orderer__up');
            const down = catalog.row(title).locator('button.orderer__down');
            out.push({
                row: title,
                up: await axOf(page, up),
                down: await axOf(page, down),
                upHtml: flat(await up.locator('.-screenReader').evaluate((el) => el.outerHTML), 300),
            });
        }
        return out;
    };
    const openCatalog = async () => {
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
    };
    /** The Contributors list of submission 4 in ordering mode: the first row's arrows' names. */
    const contributors = async () => {
        const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
        await wf.gotoEditorial(CONTROL_SUBMISSION);
        await wf.expectOpen(CONTROL_SUBMISSION);
        await idle(page);
        await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
        await wf.select('Contributors', 'Publication: Contributors');
        await idle(page);
        const dlg = wf.dialog();
        await dlg.getByRole('button', {name: 'Order', exact: true}).first().click();
        const first = dlg.locator('.listPanel__item').first();
        await first.locator('.orderer__up').waitFor({timeout: T});
        await snap('control-contributors-ordering');
        return {
            row: flat(await first.innerText(), 120),
            up: await axOf(page, first.locator('.orderer__up')),
            down: await axOf(page, first.locator('.orderer__down')),
        };
    };
    try {
        // Step 1.
        await signIn(page, 'dbarnes');
        // Step 2.
        fact('s2-open', await step('s2', async () => {
            await openCatalog();
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
        fact('s5-arrows', await step('s5', async () => {
            await catalog.startOrdering();
            await snap('s5-ordering');
            return await arrowNames();
        }));

        if (MODE === 'walk') {
            // Steps 6-7: a series.
            fact('s6-cancel', await step('s6', async () => {
                await catalog.cancelOrdering();
                await idle(page);
                return {rows: await titles()};
            }));
            fact('s7-series-arrows', await step('s7', async () => {
                await catalog.chooseFilter('Psychology');
                await idle(page);
                const saved = (await catalog.pressFeatured(BRICKS)).status();
                await idle(page);
                await catalog.startOrdering();
                await snap('s7-series-ordering');
                return {saved, arrows: await arrowNames()};
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

        // Step 8 (the control; in nb, the neighbour that must keep its names).
        fact('s8-control-contributors', await step('s8', contributors));
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
