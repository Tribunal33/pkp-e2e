// Helpers for the U74 A4 walk {OMP}: a format's "Market Territories" window filled with several
// territories and a currency, the list row's cells, and what the "Edit" window shows chosen.
// Requiring this file runs nothing; the suite page objects are required inside the calls (they
// read PKP_APP_ROOT, which forEachApp sets). Opening the "Metadata" tab is the A17 walk's helper.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');
const {BOOK, flat, step, openMetadata} = require('../market-tax-rate-fails-native-export/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));

const LISTS = [
    ['countries', 'Included'],
    ['countries', 'Excluded'],
    ['regions', 'Included'],
    ['regions', 'Excluded'],
];

/** What the market window shows chosen: the four territory lists, the price and its currency. */
async function marketChoices(win) {
    const out = {};
    for (const [which, side] of LISTS) {
        out[`${which}${side}`] = (await win.territoryList(which, side).locator('option:checked').allTextContents()).map((t) => flat(t));
    }
    out.price = await win.priceBox().inputValue().catch(() => null);
    out.currency = flat(await win.currencyList().locator('option:checked').first().textContent().catch(() => null));
    return out;
}

/**
 * Fill the market window: `date`, `price`, `currency` (a label), and per territory list
 * (`countriesIncluded`, `regionsExcluded`, ...) the labels to choose; keys left out stay as they arrive.
 */
async function fillMarket(win, spec) {
    if (spec.date !== undefined) await win.dateBox().fill(spec.date);
    for (const [which, side] of LISTS) {
        const labels = spec[`${which}${side}`];
        if (labels) await win.territoryList(which, side).selectOption(labels.map((label) => ({label})));
    }
    if (spec.price !== undefined) await win.priceBox().fill(spec.price);
    if (spec.currency !== undefined) await win.currencyList().selectOption({label: spec.currency});
}

/** "Market Territories" › "Add Market": filled, what the window shows chosen, "OK". */
async function addMarket(page, meta, spec) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    await fillMarket(win, spec);
    const chosen = await marketChoices(win);
    await win.ok();
    await idle(page).catch(() => {});
    return {chosen};
}

/** The "Market Territories" list: its column heads and each row's cells. */
async function marketRows(meta) {
    const {ListRows} = omp('OnixPages.js');
    const heads = (await meta.listColumns('marketsGridContainer').allTextContents()).map((t) => flat(t));
    const rows = [];
    const all = meta.listRows('marketsGridContainer');
    for (let i = 0; i < (await all.count()); i++) rows.push(await ListRows.cells(all.nth(i)));
    return {heads, rows};
}

/** The "Sales Rights" list's rows' cells (the neighbour: a list the fix must leave alone). */
async function salesRightsRows(meta) {
    const {ListRows} = omp('OnixPages.js');
    const all = meta.listRows('salesRightsGridContainer');
    const rows = [];
    for (let i = 0; i < (await all.count()); i++) rows.push(await ListRows.cells(all.nth(i)));
    return rows;
}

/** Row `n`'s arrow › "Edit": what the window shows chosen, then "Cancel". */
async function editChoices(page, meta, n = 0) {
    const {ListRows, MarketWindow} = omp('OnixPages.js');
    const win = await ListRows.openEdit(page, meta.listRows('marketsGridContainer').nth(n), MarketWindow);
    const chosen = await marketChoices(win);
    await shot(page, `market-edit-${n}`).catch(() => {});
    await win.cancel();
    return {chosen};
}

/** The book's markets as stored (Evidence only). */
function storedMarkets(app) {
    return sql(
        app,
        `select m.market_id, m.countries_included, m.countries_excluded, m.regions_included, m.regions_excluded, m.price, m.currency_code
           from markets m join publication_formats pf on pf.publication_format_id = m.publication_format_id
          where pf.publication_id = ${BOOK.publicationId} order by m.market_id`
    );
}

module.exports = {BOOK, flat, step, openMetadata, marketChoices, fillMarket, addMarket, marketRows, salesRightsRows, editChoices, storedMarkets, screen};
