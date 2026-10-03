// Helpers for the U74 A17 and A6 walks {OMP}: the press's "Publisher Identity", a format's
// "Metadata" tab and its "Market Territories" window, and the Native XML export of one book.
// Shared by walk.js here and ../market-edit-fills-in-gst-tax-type/walk.js. Requiring this file
// runs nothing; the suite page objects are required inside the calls (they read PKP_APP_ROOT,
// which forEachApp sets).
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');
const {fillPublisherIdentity} = require('../native-export-nothing-ticked-empty-tab/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const shared = (file) => require(path.join(ROOT, 'shared/playwright/pages', file));

/** The default dataset's book the steps use: submission 4, in Production, one format "PDF". */
const BOOK = {id: 4, publicationId: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', format: 'PDF'};

/** The four "Publisher Identity" details the dataset leaves blank (Settings › Press › "Masthead"). */
/** A second book of the dataset, with no market: submission 14, published, one format "PDF". */
const OTHER_BOOK = {id: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots'};

const IDENTITY = {publisher: 'Public Knowledge Press', location: 'Vancouver', codeType: 'Proprietary (01)', codeValue: 'PKP-01'};

const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Run one step: its result, or `{error}` recorded with a screenshot when it throws, so a walk
 * goes on through the state a fix brings rather than stopping at the first surprise.
 */
async function step(page, name, fn) {
    try {
        const out = await fn();
        return out === undefined ? {ok: true} : out;
    } catch (e) {
        const error = flat(e && e.message, 1500);
        console.log(`[step ${name}] ${error}`);
        await shot(page, `error-${name}`).catch(() => {});
        record(`error-${name}`, {error, screen: await screen(page).catch(() => null)});
        return {error};
    }
}

/** Settings › Press › "Masthead" › "Publisher Identity": the four details, "Save". */
async function publisherIdentity(app, page) {
    const saved = await fillPublisherIdentity(app, page, IDENTITY);
    return {saved, screen: await screen(page)};
}

/** Submission 4 › "Publication Formats" › "PDF" › arrow › "Edit" › "Metadata": the tab, loaded. */
async function openMetadata(app, page) {
    const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
    const pf = new PublicationFormatsPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        // 3.5's side menu keys the page without the version: `publication_publicationFormats`.
        await pf.frame.gotoEditorial(BOOK.id, {menuKey: 'publication_publicationFormats'});
        await pf.expectLoaded();
    } else {
        await pf.gotoEditorial(BOOK.id, BOOK.publicationId);
    }
    const win = await pf.openEdit(BOOK.format);
    const meta = await win.openMetadata();
    return meta;
}

/** What each of the market window's lists shows chosen, and the date and price boxes. */
async function marketWindowState(win) {
    const chosen = async (list) => flat(await list.locator('option:checked').first().textContent().catch(() => null));
    return {
        title: flat(await win.title().textContent().catch(() => null)),
        date: await win.dateBox().inputValue().catch(() => null),
        price: await win.priceBox().inputValue().catch(() => null),
        currency: await chosen(win.currencyList()),
        priceType: await chosen(win.priceTypeList()),
        taxRate: await chosen(win.taxRateList()),
        taxType: await chosen(win.taxTypeList()),
    };
}

/** Fill the market window: only the keys given; '' chooses a list's empty choice. */
async function fillMarket(win, spec) {
    const pick = (list, label) => (label === '' ? list.selectOption('') : list.selectOption({label}));
    if (spec.date !== undefined) await win.dateBox().fill(spec.date);
    if (spec.countriesIncluded) await win.territoryList('countries', 'Included').selectOption(spec.countriesIncluded.map((label) => ({label})));
    if (spec.price !== undefined) await win.priceBox().fill(spec.price);
    if (spec.priceType !== undefined) await pick(win.priceTypeList(), spec.priceType);
    if (spec.taxRate !== undefined) await pick(win.taxRateList(), spec.taxRate);
    if (spec.taxType !== undefined) await pick(win.taxTypeList(), spec.taxType);
}

/** "Market Territories" › "Add Market": `arrived` (the window as it opens), filled, "OK". */
async function addMarket(page, meta, spec) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    const arrived = await marketWindowState(win);
    await fillMarket(win, spec);
    const filled = await marketWindowState(win);
    await win.ok();
    await idle(page).catch(() => {});
    return {arrived, filled, screen: await screen(page)};
}

/** The one market's row arrow › "Edit": `reopened` (the window as it opens); filled and "OK", or "Cancel" with `cancel`. */
async function editMarket(page, meta, spec, {cancel = false} = {}) {
    const {ListRows, MarketWindow} = omp('OnixPages.js');
    const row = meta.listRows('marketsGridContainer').first();
    const win = await ListRows.openEdit(page, row, MarketWindow);
    const reopened = await marketWindowState(win);
    await shot(page, `market-edit-window-${Date.now() % 100000}`).catch(() => {});
    if (cancel) {
        await win.cancel();
        return {reopened};
    }
    await fillMarket(win, spec);
    const filled = await marketWindowState(win);
    await win.ok();
    await idle(page).catch(() => {});
    return {reopened, filled, screen: await screen(page)};
}

/** "Add Market" opened and cancelled: the window as it arrives. */
async function addMarketArrival(page, meta) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    const arrived = await marketWindowState(win);
    await win.cancel();
    return {arrived};
}

/** The market as stored (Evidence only; the steps read it through the export). */
function storedMarket(app) {
    return sql(
        app,
        `select m.price, coalesce(m.price_type_code,'∅'), coalesce(m.tax_rate_code,'∅'), coalesce(m.tax_type_code,'∅')
           from markets m join publication_formats pf on pf.publication_format_id = m.publication_format_id
          where pf.publication_id = ${BOOK.publicationId}`
    );
}

/**
 * Tools › "Import/Export" › "Native XML Plugin" › "Export": tick the book (or `titles`), "Export Submissions";
 * the results tab's text, and with "Download Exported File" the file's `Price` elements.
 */
async function nativeExport(app, page, titles = [BOOK.title]) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openExportTab();
    for (const title of titles) await native.list.box(title).check();
    const panel = await native.list.pressExport(native);
    await panel.getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
    const text = flat(await panel.innerText().catch(() => null));
    const out = {completed: /completed successfully/.test(text || ''), text};
    if (await native.downloadButton(panel).isVisible().catch(() => false)) {
        const file = await native.download(panel);
        out.file = file.name;
        out.prices = (file.text.match(/<(?:\w+:)?Price>[\s\S]*?<\/(?:\w+:)?Price>/g) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 800));
        out.taxes = (file.text.match(/<(?:\w+:)?Tax>[\s\S]*?<\/(?:\w+:)?Tax>/g) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 800));
    }
    out.screen = await screen(page);
    return out;
}

module.exports = {BOOK, OTHER_BOOK, IDENTITY, flat, step, publisherIdentity, openMetadata, marketWindowState, fillMarket, addMarket, editMarket, addMarketArrival, storedMarket, nativeExport};
