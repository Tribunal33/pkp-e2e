// U74 A15 {OMP}: the "Metadata" tab's sales-rights and market windows refuse a second "Rest of
// World?" entry, or a market "Date" or "Price" of spaces, with nothing in the window saying why;
// the reason arrives as a notice with the next save. Steps 9-16 of
// docs/issues/U09-A11-static-page-refusal-repeated-after-save.md (which this unit joined), on PKP's
// default test dataset (submission 4, "How Canadians Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A15 (Rules 11, 13a).
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/catalog-windows-refuse-without-message/walk.js
// MODE=reach takes the format's other two windows the same way (alone): step 17, "Add publication
// date" with a date of the wrong length (U73 A23), then a good one; "Add Code" with a "Value" of one
// space, then a good one.
// MODE=neighbour runs the neighbour check alone: good saves in both windows (they close with their
// one notice and nothing else), an edit, and an empty "Date" refused by the browser.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const fetches = L.watchFetches(page);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1800));
    };
    try {
        await signIn(page, 'dbarnes');
        const meta = await L.step(page, 'open-metadata', () => L.openMetadata(app, page));

        if (MODE === 'walk') {
            // Step 4: the first "Rest of World?" entry.
            fact('s4-first-row', await L.step(page, 's4', async () => {
                const win = await L.openAddRights(meta);
                await win.rowBox().check();
                return L.pressOk(page, win, fetches);
            }));
            // Step 5: a second one.
            let rights;
            fact('s5-second-row', await L.step(page, 's5', async () => {
                rights = await L.openAddRights(meta);
                await rights.rowBox().check();
                const out = await L.pressOk(page, rights, fetches);
                await shot(page, 's5-after-ok');
                out.rows = await L.listRows(meta, 'salesRightsGridContainer');
                return out;
            }));
            // Step 6: "Cancel".
            fact('s6-cancel', await L.step(page, 's6', async () => {
                const out = await L.cancel(page, rights, fetches);
                out.rows = await L.listRows(meta, 'salesRightsGridContainer');
                out.stored = L.stored(app);
                return out;
            }));
            // Step 7: "Add Market", a date of one space, price 25.
            let market;
            fact('s7-date-space', await L.step(page, 's7', async () => {
                market = await L.openAddMarket(meta);
                await market.dateBox().fill(' ');
                await market.priceBox().fill('25');
                const out = await L.pressOk(page, market, fetches);
                await shot(page, 's7-after-ok');
                return out;
            }));
            // Step 8: a real date, a price of one space.
            fact('s8-price-space', await L.step(page, 's8', async () => {
                await market.dateBox().fill('20261001');
                await market.priceBox().fill(' ');
                const out = await L.pressOk(page, market, fetches);
                await shot(page, 's8-after-ok');
                return out;
            }));
            // Step 9: price 25.
            fact('s9-good-save', await L.step(page, 's9', async () => {
                await market.priceBox().fill('25');
                const out = await L.pressOk(page, market, fetches);
                await shot(page, 's9-after-ok');
                out.rows = await L.listRows(meta, 'marketsGridContainer');
                out.stored = L.stored(app);
                return out;
            }));
        } else if (MODE === 'reach') {
            let date;
            fact('r1-date-wrong-length', await L.step(page, 'r1', async () => {
                date = await L.openOther(page, meta, 'date');
                const format = await date.formatList().locator('option:checked').textContent().catch(() => null);
                await date.dateBox().fill('2026');
                return {format, ...(await L.pressOk(page, date, fetches))};
            }));
            fact('r2-date-good', await L.step(page, 'r2', async () => {
                await date.dateBox().fill('20261001');
                return L.pressOk(page, date, fetches);
            }));
            let code;
            fact('r3-code-value-space', await L.step(page, 'r3', async () => {
                code = await L.openOther(page, meta, 'code');
                await code.valueBox().fill(' ');
                return L.pressOk(page, code, fetches);
            }));
            fact('r4-code-good', await L.step(page, 'r4', async () => {
                await code.valueBox().fill('u74ir4');
                return L.pressOk(page, code, fetches);
            }));
        } else {
            // Neighbour: what the fix must leave alone.
            fact('n1-rights-good-save', await L.step(page, 'n1', async () => {
                const win = await L.openAddRights(meta);
                const opened = await L.windowState(win);
                const out = await L.pressOk(page, win, fetches);
                return {opened, ...out, rows: await L.listRows(meta, 'salesRightsGridContainer')};
            }));
            fact('n2-market-empty-date-browser', await L.step(page, 'n2', async () => {
                const win = await L.openAddMarket(meta);
                await win.priceBox().fill('25');
                let posted = false;
                const listener = (req) => { if (win.saveUrl.test(req.url())) posted = true; };
                page.on('request', listener);
                await win.okButton().click();
                await L.sleep(1500);
                page.off('request', listener);
                const out = {posted, state: await L.windowState(win)};
                await win.cancelLink().click();
                await L.sleep(1000);
                return out;
            }));
            fact('n3-market-good-save', await L.step(page, 'n3', async () => {
                const win = await L.openAddMarket(meta);
                const opened = await L.windowState(win);
                await win.dateBox().fill('20261001');
                await win.priceBox().fill('25');
                const out = await L.pressOk(page, win, fetches);
                return {opened, ...out, rows: await L.listRows(meta, 'marketsGridContainer')};
            }));
            fact('n4-market-edit', await L.step(page, 'n4', async () => {
                const {ListRows, MarketWindow} = require(require('path').resolve(__dirname, '../../../../../apps/omp/playwright/pages/OnixPages.js'));
                const win = await ListRows.openEdit(page, meta.listRows('marketsGridContainer').first(), MarketWindow);
                const out = await L.pressOk(page, win, fetches);
                return {...out, stored: L.stored(app)};
            }));
        }
    } finally {
        record(`a15-${MODE}`, facts);
        await close();
    }
});
