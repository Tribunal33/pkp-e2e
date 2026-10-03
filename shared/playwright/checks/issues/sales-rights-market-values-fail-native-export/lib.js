// Helpers for the U74 A7 + A8 walk {OMP}: a format's "Sales Rights" and "Market Territories"
// windows, saved or refused, and the Native XML export of one book with the parts of its ONIX
// products the steps read. Requiring this file runs nothing; the suite page objects are required
// inside the calls (they read PKP_APP_ROOT, which forEachApp sets). The press's "Publisher
// Identity", the format's "Metadata" tab and `step()` come from the U74 A17 walk's lib.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');
const A17 = require('../market-tax-rate-fails-native-export/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const shared = (file) => require(path.join(ROOT, 'shared/playwright/pages', file));

const {BOOK, flat, step, publisherIdentity, openMetadata} = A17;
const SALES = 'salesRightsGridContainer';
const MARKETS = 'marketsGridContainer';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A window's state after "OK": closed (saved) or still open (refused), with what it shows. */
async function pressOk(page, win) {
    const answered = page.waitForResponse((r) => win.saveUrl.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
    await win.okButton().click();
    const response = await answered;
    const out = {status: response.status()};
    for (let i = 0; i < 20; i++) {
        if (!(await win.dialog().count())) break;
        await sleep(250);
    }
    await idle(page).catch(() => {});
    out.closed = (await win.dialog().count()) === 0;
    if (!out.closed) {
        out.refused = true;
        out.requiredNotes = await win.requiredNotes().count();
        out.errorTexts = await win.form().locator('.error, label.error').evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()}.${e.className}: ${(e.textContent || '').replace(/\s+/g, ' ').trim()}`.slice(0, 200)));
        out.dialogText = flat(await win.dialog().innerText().catch(() => null), 1200);
        await shot(page, `refused-${Date.now() % 100000}`).catch(() => {});
    }
    out.screen = await screen(page);
    if (!out.closed) {
        await win.cancel().catch(() => {});
        out.afterCancel = await screen(page);
    }
    return out;
}

/** Choose options by label in a multiple list (none given: leave as is). */
async function choose(list, labels) {
    if (labels) await list.selectOption(labels.map((label) => ({label})));
}

/** The sales-rights window: type kept unless given, "Rest of World?", the four territory lists. */
async function fillRights(win, spec) {
    if (spec.type) await win.typeList().selectOption({label: spec.type});
    if (spec.row !== undefined) await win.rowBox().setChecked(spec.row);
    await choose(win.territoryList('countries', 'Included'), spec.countriesIncluded);
    await choose(win.territoryList('countries', 'Excluded'), spec.countriesExcluded);
    await choose(win.territoryList('regions', 'Included'), spec.regionsIncluded);
    await choose(win.territoryList('regions', 'Excluded'), spec.regionsExcluded);
}

/** "Sales Rights" › "Add Sales Rights": the window as it arrives, filled, "OK". */
async function addRights(page, meta, spec) {
    const {openAddSalesRights} = omp('OnixPages.js');
    const win = await openAddSalesRights(meta);
    const arrived = {
        title: flat(await win.title().textContent().catch(() => null)),
        type: flat(await win.chosenType().textContent().catch(() => null)),
        row: await win.rowBox().isChecked().catch(() => null),
    };
    await fillRights(win, spec);
    const saved = await pressOk(page, win);
    return {arrived, ...saved, rows: await listCells(meta, SALES)};
}

/** The one sales-rights row's arrow › "Delete" › "OK". */
async function deleteRights(page, meta) {
    const {ListRows} = omp('OnixPages.js');
    const dialog = await ListRows.openDelete(page, meta.listRows(SALES).first());
    await dialog.ok();
    await idle(page).catch(() => {});
    return {screen: await screen(page), rows: await listCells(meta, SALES)};
}

/** What the market window shows: date, format, price, discount and the included/excluded lists. */
async function marketState(win) {
    const chosen = async (list) => list.locator('option:checked').evaluateAll((os) => os.map((o) => (o.textContent || '').trim()).filter(Boolean)).catch(() => null);
    return {
        title: flat(await win.title().textContent().catch(() => null)),
        date: await win.dateBox().inputValue().catch(() => null),
        dateFormat: await chosen(win.dateFormatList()),
        price: await win.priceBox().inputValue().catch(() => null),
        discount: await win.discountBox().inputValue().catch(() => null),
        countriesIncluded: await chosen(win.territoryList('countries', 'Included')),
        countriesExcluded: await chosen(win.territoryList('countries', 'Excluded')),
        regionsIncluded: await chosen(win.territoryList('regions', 'Included')),
        taxType: await chosen(win.taxTypeList()),
    };
}

/** Fill the market window: only the keys given; `taxType: ''` chooses that list's empty choice. */
async function fillMarket(win, spec) {
    if (spec.date !== undefined) await win.dateBox().fill(spec.date);
    if (spec.dateFormat) await win.dateFormatList().selectOption({label: spec.dateFormat});
    await choose(win.territoryList('countries', 'Included'), spec.countriesIncluded);
    await choose(win.territoryList('countries', 'Excluded'), spec.countriesExcluded);
    await choose(win.territoryList('regions', 'Included'), spec.regionsIncluded);
    if (spec.price !== undefined) await win.priceBox().fill(spec.price);
    if (spec.discount !== undefined) await win.discountBox().fill(spec.discount);
    if (spec.taxType !== undefined) await win.taxTypeList().selectOption(spec.taxType === '' ? '' : {label: spec.taxType});
}

/** "Market Territories" › "Add Market": the window as it arrives, filled, "OK". */
async function addMarket(page, meta, spec) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    const arrived = await marketState(win);
    await fillMarket(win, spec);
    const filled = await marketState(win);
    const saved = await pressOk(page, win);
    return {via: 'Add Market', arrived, filled, ...saved, rows: await listCells(meta, MARKETS)};
}

/**
 * The market row's arrow › "Edit", filled with `spec`, "OK". With no market listed (a fix
 * refused the earlier add), "Add Market" with `whole` instead, so the step's values are still
 * tried; `via` says which.
 */
async function editMarket(page, meta, spec, whole) {
    const {ListRows, MarketWindow} = omp('OnixPages.js');
    const rows = meta.listRows(MARKETS);
    if (!(await rows.count())) return addMarket(page, meta, whole);
    const win = await ListRows.openEdit(page, rows.first(), MarketWindow);
    const reopened = await marketState(win);
    await fillMarket(win, spec);
    const filled = await marketState(win);
    const saved = await pressOk(page, win);
    return {via: 'Edit', reopened, filled, ...saved, rows: await listCells(meta, MARKETS)};
}

/** A list's rows as their cells. */
async function listCells(meta, which) {
    const {rowCells} = omp('OnixPages.js');
    const rows = meta.listRows(which);
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) out.push(await rowCells(rows.nth(i)).catch(() => null));
    return out;
}

/** The book's sales rights and markets as stored (Evidence only). */
function stored(app) {
    const q = (t, cols) =>
        sql(app, `select ${cols} from ${t} x join publication_formats pf on pf.publication_format_id = x.publication_format_id where pf.publication_id = ${BOOK.publicationId} order by 1`);
    return {
        salesRights: q('sales_rights', `x.sales_rights_id, x.type, x.row_setting, x.countries_included, x.countries_excluded, x.regions_included, x.regions_excluded`),
        markets: q('markets', `x.market_id, x.market_date, x.market_date_format, x.price, x.discount, x.countries_included, x.countries_excluded, x.regions_included`),
    };
}

/** Every element named `name` in an XML text, whitespace between tags dropped. */
const elements = (xml, name) =>
    (xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${name}>`, 'g')) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 600));

/**
 * Tools › "Import/Export" › "Native XML Plugin" › "Export": tick the book (or the books titled), "Export Submissions";
 * the results tab's first line and its errors, and with "Download Exported File" the file's
 * SalesRights, Market, MarketDate and Price elements.
 */
async function nativeExport(app, page, titles = [BOOK.title]) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openExportTab();
    for (const title of titles) await native.list.box(title).check();
    const panel = await native.list.pressExport(native);
    await panel.getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
    const text = (await panel.innerText().catch(() => '')) || '';
    const at = text.indexOf('Errors occured');
    const out = {
        completed: /completed successfully/.test(text),
        first: flat(text.split('\n')[0]),
        errors: at >= 0 ? flat(text.slice(at), 2500) : null,
    };
    if (await native.downloadButton(panel).isVisible().catch(() => false)) {
        const file = await native.download(panel);
        out.file = file.name;
        out.salesRights = elements(file.text, 'SalesRights');
        out.market = elements(file.text, 'Market');
        out.marketDate = elements(file.text, 'MarketDate');
        out.price = elements(file.text, 'Price');
    }
    out.screen = await screen(page);
    return out;
}

/** A second book of the default dataset with a format: submission 14, published. */
const BOOK14 = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';

module.exports = {BOOK, BOOK14, flat, step, publisherIdentity, openMetadata, pressOk, addRights, deleteRights, marketState, fillMarket, addMarket, editMarket, listCells, stored, nativeExport};
