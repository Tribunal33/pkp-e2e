// Issue report docs/issues/U45-A22-bulk-actions-menu-stays-open.md (U45 A22):
// on the DOIs page the "Bulk Actions" menu stays open over the list when the
// window one of its items opened is answered within a second. Takes the
// report's Steps through the screens on a dataset fleet freshly reset to
// PKP's default test dataset, as the dataset's `dbarnes` on
// `publicknowledge`. The kit builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › DOIs › "Setup": "DOI Prefix" 10.1234, "Save"
//   3. "DOIs": tick the first published work (OJS 17, OMP 5, OPS 2)
//   4. "Bulk Actions"
//   5. "Assign DOIs" in the menu, the mouse button held 200 ms
//   6. the window's "Assign DOIs" at once
//   7. the first row's "Show more details about …" button (a mouse press at
//      its centre)
//   7b. while the menu is still open: which row controls it covers, and a
//      press on the first one that lies under a menu action; "Cancel" in
//      the window that opens
//   8. a press on the page's heading
// Control: steps 3–6 on the second published work (OJS 1, OMP 14, OPS 5),
//   the window answered after 1.5 s.
// Neighbours (what a fix must leave alone):
//   a. "Bulk Actions" › "Select All": the menu stays open and counts the
//      ticks; "Select None"; a press on the heading closes it
//   b. "Bulk Actions", then "Bulk Actions" again: the menu closes
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=ir16 node bin/probe.js all shared/playwright/checks/issues/bulk-actions-menu-stays-open/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's
//               feature, and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir16/menu-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {menuState, pointOwner, coveredControls} = require('./lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const FIRST = {ojs: 17, omp: 5, ops: 2};
const SECOND = {ojs: 1, omp: 14, ops: 5};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        const settings = new DoiSettings(page, ctx);
        const dois = new DoisPage(page, ctx);
        const takeNotices = () =>
            page.evaluate(() => {
                const w = /** @type {any} */ (window);
                const seen = w.__doiNotices || [];
                w.__doiNotices = [];
                return seen;
            });
        const firstExpander = () => dois.rows().first().getByRole('button', {name: /details about \d+$/});

        /**
         * Steps 3–6: tick, "Bulk Actions", "Assign DOIs" held `hold` ms, the
         * window's button after `wait` ms; then what the page shows 2.5 s on.
         */
        const assign = async (step, id, {hold, wait}) => {
            await dois.tick([id]);
            await dois.openBulkActions();
            const t0 = Date.now();
            await dois.bulkItem('Assign DOIs').click({delay: hold});
            const dialog = dois.dialog('Assign DOIs');
            await expect(dialog).toBeVisible({timeout: T});
            const question = flat(await dialog.innerText());
            const focusInWindow = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()} "${(/** @type {HTMLElement} */ (a).innerText || '').trim().slice(0, 40)}"` : null; });
            if (wait) await sleep(wait);
            const acted = page.waitForResponse((r) => /\/api\/v1\/dois\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: 'Assign DOIs', exact: true}).click();
            const response = await acted;
            await expect(dialog).toBeHidden({timeout: T});
            const windowGoneMs = Date.now() - t0;
            await sleep(2500);
            await idle(page);
            const s = await screen(page);
            record(`menu-${step}${run}`, s);
            await shot(page, `menu-${step}${run}`).catch(() => {});
            return {
                ticked: id, holdMs: hold, answeredAfterMs: wait, question, focusInWindow, status: response.status(), windowGoneMs,
                notices: await takeNotices(),
                after2500ms: await menuState(page),
                firstRowExpanderPoint: await pointOwner(firstExpander()),
            };
        };

        // 1–2
        await signIn(page, 'dbarnes');
        await settings.goto('Setup');
        await settings.prefixBox().fill('10.1234');
        const saved = await settings.save(settings.setup);
        fact('prefix saved', saved.status());

        // 3–6
        await dois.goto();
        fact('first row', flat(await dois.rows().first().locator('.listPanel__itemSummary').innerText(), 200));
        fact('steps 3-6: held press, answered at once', await assign('held-at-once', FIRST[app.name], {hold: 200, wait: 0}));

        // 7: a mouse press at the centre of the first row's expander
        const exp = firstExpander();
        const box = await exp.boundingBox();
        const nameBefore = await exp.getAttribute('aria-label').catch(() => null);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(700);
        const openWindow = page.getByRole('dialog');
        const step7 = {
            expandedRows: await dois.rows().locator('.listPanel__itemExpanded').count(),
            expanderBefore: nameBefore,
            windowOpened: (await openWindow.count()) ? flat(await openWindow.last().innerText(), 200) : null,
            menu: await menuState(page),
        };
        record(`menu-step7${run}`, await screen(page));
        await shot(page, `menu-step7${run}`).catch(() => {});
        if (await openWindow.count()) {
            await openWindow.last().getByRole('button', {name: 'Cancel', exact: true}).click();
            await expect(openWindow).toHaveCount(0, {timeout: T});
            await sleep(1500);
            step7.menuAfterCancel = await menuState(page);
        }
        fact('step 7: press on the first row\'s expander', step7);

        // 7b: the rows' controls the open menu covers, and a press on the first
        // one that lies under a menu action
        const covered = await coveredControls(page);
        const under = covered.find((c) => c.item && !/^(Select|Expand|Collapse)/.test(c.item)) || covered.find((c) => c.item);
        const step7b = {covered: covered.map((c) => `${c.row} ${c.control} -> ${c.item || '(menu padding)'}`), pressed: under ? `${under.row} ${under.control}` : null};
        if (under) {
            await page.mouse.click(under.x, under.y);
            await sleep(700);
            const w = page.getByRole('dialog');
            step7b.windowOpened = (await w.count()) ? flat(await w.last().innerText(), 300) : null;
            step7b.expandedRows = await dois.rows().locator('.listPanel__itemExpanded').count();
            record(`menu-step7b${run}`, await screen(page));
            await shot(page, `menu-step7b${run}`).catch(() => {});
            if (await w.count()) {
                await sleep(1500);
                await w.last().getByRole('button', {name: 'Cancel', exact: true}).click();
                await expect(w).toHaveCount(0, {timeout: T});
                await sleep(1500);
                step7b.afterCancel = {menu: await menuState(page), ticks: await dois.rows().locator('.doiListItem__selector input[type="checkbox"]:checked').count()};
            }
        }
        fact('step 7b: a press on a row control under a menu action', step7b);

        // 8: a press on the page heading
        if ((await dois.bulkItems().count()) > 0) {
            await page.locator('h1').first().click();
            await sleep(1300);
        }
        fact('step 8: after a press on the heading', {menu: await menuState(page), firstRowExpanderPoint: await pointOwner(firstExpander())});
        await dois.rows().first().locator('.listPanel__itemExpanded').count().then(async (n) => {
            if (n) await firstExpander().click();
        });

        // Control: answered after 1.5 s
        fact('control: held press, answered after 1.5 s', await assign('held-late', SECOND[app.name], {hold: 200, wait: 1500}));
        if ((await dois.bulkItems().count()) > 0) await dois.closeBulkActions();

        // Neighbour a: "Select All" keeps the menu open
        await dois.openBulkActions();
        await dois.bulkItem('Select All').click({delay: 200});
        await sleep(1500);
        const nbA = {afterSelectAll: await menuState(page), line: flat(await dois.bulkDescription().innerText().catch(() => null))};
        nbA.ticks = await dois.rows().locator('.doiListItem__selector input[type="checkbox"]:checked').count();
        await dois.bulkItem('Select None').click();
        await sleep(300);
        nbA.afterSelectNone = {line: flat(await dois.bulkDescription().innerText().catch(() => null)), ticks: await dois.rows().locator('.doiListItem__selector input[type="checkbox"]:checked').count()};
        await page.locator('h1').first().click();
        await sleep(1300);
        nbA.afterPressElsewhere = await menuState(page);
        fact('neighbour a: Select All, Select None, a press elsewhere', nbA);

        // Neighbour b: the button toggles
        await dois.openBulkActions();
        const nbB = {opened: await menuState(page)};
        await dois.bulkActionsButton().click();
        await sleep(300);
        nbB.pressedAgain = await menuState(page);
        fact('neighbour b: Bulk Actions pressed twice', nbB);
    } finally {
        record(`menu-facts${run}`, facts);
        await close();
    }
});
