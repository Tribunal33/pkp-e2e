// Issue report docs/issues/U70-A13-catalog-last-featured-down-arrow-extra-press.md (U70 A13): on a press's
// Catalog page, while ordering the featured books, the last featured book's down arrow moves it below the
// hidden rows of the books not featured, so the next press that should move that book changes nothing.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's Press editor `dbarnes` on `publicknowledge` (OMP only: a journal and a
// preprint server have no Catalog page). Adds book 13 to the catalog with "Add Entry" and features the
// dataset's two published books (5 and 14) with their "Featured" boxes. The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps: "Add Entry" 13, feature 5 and 14, a reload, "Order Features", B's down arrow,
//                    B's up arrow twice, A's down arrow, B's down arrow twice, "Save Order", a reload.
//                    Each press records the rows on screen and every row in page order (the hidden ones
//                    included); a step the page does not offer is recorded, not thrown.
//   nb               what a fix must leave alone (run alone, after a reset): the same set-up, then the
//                    first row's up arrow (nothing), its down arrow (moves at once), "Cancel" (the saved
//                    order back); then 13 featured too (nothing hidden), the last row's down arrow
//                    (nothing), its up arrow (moves at once), "Save Order", a reload.
//   between          a hidden row between featured ones (main only is enough): the same set-up and reload,
//                    then 14's box unticked and 13's ticked without a reload, "Order Features", 13's up
//                    arrow twice.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u70l --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u70l PROBE_AGENT=u70l node bin/probe.js omp shared/playwright/checks/issues/catalog-last-featured-down-arrow-extra-press/walk.js [steps|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u70l-3_5, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/u70l/arrow-facts[-<run>]-omp.json
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, shot, sql} = require('../../../probe');

const mode = process.argv[2] || 'steps';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const short = (t) => flat(t, 24);
const BOMB = 'Bomb Canada and Other Unkind Remarks in the American Media';
const BRICKS = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const MOBILE = 'Mobile Learning: Transforming the Delivery of Education and Training';

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
    const errors = [];

    const {page, close} = await launch(app);
    page.on('pageerror', (e) => errors.push(flat(e.message, 200)));
    page.on('response', (r) => {
        if (r.status() >= 500) errors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    const c = new CatalogPage(page, app.contextPath);
    /** The rows on screen, and every row in page order with the hidden ones marked. */
    const rows = async () => ({
        shown: (await c.shownTitles().allInnerTexts()).map(short),
        all: await c.rows().evaluateAll((rs) =>
            rs.map((r) => {
                const t = (r.querySelector('.listPanel__itemSubtitle')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 24);
                return r.offsetParent === null ? `(${t})` : t;
            })
        ),
    });
    const settle = async () => {
        await idle(page);
        await sleep(400);
    };
    /** The shown row's title at a position (0-based) while ordering. */
    const shownTitle = async (i) => flat(await c.shownTitles().nth(i).innerText(), 200);
    /** Press an arrow of the book titled `title`; record the rows before and after. */
    const press = async (label, title, dir) => {
        const before = await rows();
        await (dir === 'up' ? c.upArrow(title) : c.downArrow(title)).first().click();
        await sleep(400);
        const after = await rows();
        fact(label, {book: short(title), arrow: dir, before: before.shown, after: after.shown, moved: before.shown.join('|') !== after.shown.join('|'), allAfter: after.all});
    };
    const featured = async (title) => {
        if (await c.row(title).getByRole('button', {name: 'This monograph is featured. Make this monograph not featured.'}).count()) return 'ticked';
        if (await c.row(title).getByRole('button', {name: 'This monograph is not featured. Make this monograph featured.'}).count()) return 'empty';
        return null;
    };
    const features = () => sql(app, 'select submission_id, assoc_type, assoc_id, seq from features order by 2, 3, 4');

    try {
        // steps 1-2
        await signIn(page, 'dbarnes');
        await c.goto();
        await settle();
        fact('2 list', await rows());

        // step 3: "Add Entry", type "Mobile", choose book 13, "Save"
        await step('3', async () => {
            const panel = await c.openAddEntry();
            await panel.choose('Mobile', MOBILE);
            const r = await panel.save();
            await settle();
            fact('3 addToCatalog', {status: r.status(), body: flat(r.request().postData(), 200)});
            fact('3 list', await rows());
        });

        // step 4: feature 5 and 14, leave 13 alone
        await step('4', async () => {
            for (const title of [BOMB, BRICKS]) {
                if ((await featured(title)) === 'empty') await c.pressFeatured(title);
            }
            await settle();
            fact('4 boxes', {bomb: await featured(BOMB), bricks: await featured(BRICKS), mobile: await featured(MOBILE)});
            fact('4 list', await rows());
            fact('4 stored features', features());
            // the reload: the list is fetched again with the featured books first
            await c.reload();
            await settle();
            fact('4 list after reload', await rows());
        });

        if (mode === 'between') {
            await step('b1', async () => {
                if ((await featured(BRICKS)) === 'ticked') await c.pressFeatured(BRICKS);
                if ((await featured(MOBILE)) === 'empty') await c.pressFeatured(MOBILE);
                await settle();
                fact('b1 boxes', {bomb: await featured(BOMB), bricks: await featured(BRICKS), mobile: await featured(MOBILE)});
                fact('b1 list', await rows());
                await c.startOrdering();
                await settle();
                fact('b1 ordering', await rows());
                await press('b2 Mobile up', MOBILE, 'up');
                await press('b3 Mobile up again', MOBILE, 'up');
                await press('b4 Mobile up again', MOBILE, 'up');
            });
        }

        // step 5: "Order Features"
        let A = null;
        let B = null;
        if (mode !== 'between') await step('5', async () => {
            await c.startOrdering();
            await settle();
            A = await shownTitle(0);
            B = await shownTitle(1);
            fact('5 ordering', {...(await rows()), A: short(A), B: short(B)});
            record(`arrows-5${run}`, await screen(page));
            await shot(page, `arrows-5${run}`);
        });

        if (mode === 'steps') {
            await step('6', () => press('6 B down (last row)', B, 'down'));
            await step('7', () => press('7 B up', B, 'up'));
            await step('8', () => press('8 B up again', B, 'up'));
            await step('9', () => press('9 A down (last row)', A, 'down'));
            await step('10', () => press('10 B down (the book above)', B, 'down'));
            await step('11', () => press('11 B down again', B, 'down'));
            await step('12', async () => {
                const shown = (await rows()).shown;
                const r = await c.saveOrder();
                await settle();
                fact('12 saveFeaturedOrder', {status: r.status(), body: flat(decodeURIComponent(r.request().postData() || ''), 300)});
                await c.reload();
                await settle();
                fact('12 shown before save, list after reload', {beforeSave: shown, afterReload: await rows()});
                fact('12 stored features', features());
            });
        } else if (mode === 'nb') {
            await step('nb1', async () => {
                await press('nb1 first row up', A, 'up');
                await press('nb1 first row down', A, 'down');
                await c.cancelOrdering();
                await settle();
                fact('nb1 after Cancel', await rows());
            });
            await step('nb2', async () => {
                if ((await featured(MOBILE)) === 'empty') await c.pressFeatured(MOBILE);
                await settle();
                fact('nb2 boxes', {bomb: await featured(BOMB), bricks: await featured(BRICKS), mobile: await featured(MOBILE)});
                await c.startOrdering();
                await settle();
                const shown = (await rows()).shown;
                fact('nb2 ordering, all three featured', await rows());
                const last = await shownTitle(shown.length - 1);
                await press('nb2 last row down', last, 'down');
                await press('nb2 last row up', last, 'up');
                const before = (await rows()).shown;
                await c.saveOrder();
                await settle();
                await c.reload();
                await settle();
                fact('nb2 shown before save, list after reload', {beforeSave: before, afterReload: await rows()});
                fact('nb2 stored features', features());
            });
        }
    } finally {
        fact('errors (5xx, page scripts)', errors);
        record(`arrow-facts${run}`, facts);
        await close();
    }
});
