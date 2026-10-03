// Helpers for the U74 A5 / U73 A7 walk {OMP}: a format's "Metadata" tab on any book, its
// "Add Market" and "Add publication date" windows as they arrive, the book page's format details
// and the ONIX dates inside the Native XML export. Requiring this file runs nothing; the suite
// page objects are required inside the calls (they read PKP_APP_ROOT, which forEachApp sets).
const path = require('path');
const {idle, screen, sql} = require('../../../probe');
const A17 = require('../market-tax-rate-fails-native-export/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const shared = (file) => require(path.join(ROOT, 'shared/playwright/pages', file));

/** The default dataset's published book the steps use: submission 14, one format "PDF". */
const BOOK = {id: 14, publicationId: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots', format: 'PDF'};

const {flat, step} = A17;
const chosen = async (list) => flat(await list.locator('option:checked').first().textContent().catch(() => null));

/** Submission `book` › "Publication Formats" › the format's arrow › "Edit" › "Metadata": the tab, loaded. */
async function openMetadata(app, page, book = BOOK) {
    const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
    const pf = new PublicationFormatsPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        // 3.5's side menu keys the page without the version: `publication_publicationFormats`.
        await pf.frame.gotoEditorial(book.id, {menuKey: 'publication_publicationFormats'});
        await pf.expectLoaded();
    } else {
        await pf.gotoEditorial(book.id, book.publicationId);
    }
    const win = await pf.openEdit(book.format);
    return win.openMetadata();
}

/** "Add Market": the window as it arrives, then filled (only the keys given) and "OK". */
async function addMarket(page, meta, spec) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    const arrived = {dateFormat: await chosen(win.dateFormatList()), dateRole: await chosen(win.dateRoleList())};
    if (spec.dateFormat) await win.dateFormatList().selectOption({label: spec.dateFormat});
    await A17.fillMarket(win, spec);
    const sent = {dateFormat: await chosen(win.dateFormatList()), date: await win.dateBox().inputValue()};
    await win.ok();
    await idle(page).catch(() => {});
    return {arrived, sent};
}

/**
 * "Add publication date": the window as it arrives, then filled and "OK". Returns whether the
 * window closed (a refused date leaves it open, the server's redraw in it) and what it shows then.
 */
async function addDate(page, meta, spec) {
    const win = await meta.openAddDate();
    const arrived = {dateFormat: await chosen(win.formatList()), role: await chosen(win.roleList())};
    if (spec.dateFormat) await win.formatList().selectOption({label: spec.dateFormat});
    if (spec.role) await win.roleList().selectOption({label: spec.role});
    await win.dateBox().fill(spec.date);
    const sent = {dateFormat: await chosen(win.formatList()), role: await chosen(win.roleList()), date: await win.dateBox().inputValue()};
    const response = await win.pressOk();
    await idle(page).catch(() => {});
    const closed = await win.form().waitFor({state: 'detached', timeout: 8_000}).then(() => true).catch(() => false);
    const out = {arrived, sent, status: response.status(), closed};
    if (!closed) {
        out.redrawn = {dateFormat: await chosen(win.formatList()), date: await win.dateBox().inputValue().catch(() => null)};
        await win.cancelLink().click().catch(() => {});
        await win.form().waitFor({state: 'detached', timeout: 8_000}).catch(() => {});
        await idle(page).catch(() => {});
    }
    return out;
}

/** A list's first row › arrow › "Edit": the "Date Format" the window reopens on, then "Cancel". */
async function reopenFirst(page, meta, which) {
    const {ListRows, MarketWindow} = omp('OnixPages.js');
    const {DateWindow} = omp('PublicationFormatPages.js');
    const container = which === 'market' ? 'marketsGridContainer' : 'publicationDateGridContainer';
    const Win = which === 'market' ? MarketWindow : DateWindow;
    const win = await ListRows.openEdit(page, meta.listRows(container).first(), Win);
    const list = which === 'market' ? win.dateFormatList() : win.formatList();
    const reopened = {dateFormat: await chosen(list), date: await win.dateBox().inputValue()};
    await win.cancelLink().click();
    await win.form().waitFor({state: 'detached', timeout: 8_000}).catch(() => {});
    await idle(page).catch(() => {});
    return reopened;
}

/** The book's page (Catalog › the book): the format details' date entries, as the reader sees them. */
async function bookPageDates(app, page, book = BOOK) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${book.id}`));
    await idle(page).catch(() => {});
    const dates = await page.locator('.publication_format .sub_item.date').evaluateAll((els) =>
        els.map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
    );
    return {url: page.url(), dates, screen: await screen(page)};
}

/**
 * Tools › "Native XML Plugin" › "Export": tick the book, "Export Submissions", "Download Exported
 * File"; the ONIX `PublishingDate` and `MarketDate` elements of the file.
 */
async function exportDates(app, page, book = BOOK) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openExportTab();
    await native.list.box(book.title).check();
    const panel = await native.list.pressExport(native);
    await panel.getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
    const text = flat(await panel.innerText().catch(() => null));
    const out = {completed: /completed successfully/.test(text || ''), text};
    if (await native.downloadButton(panel).isVisible().catch(() => false)) {
        const file = await native.download(panel);
        const grab = (tag) => (file.text.match(new RegExp(`<(?:\\w+:)?${tag}>[\\s\\S]*?</(?:\\w+:)?${tag}>`, 'g')) || [])
            .map((p) => flat(p.replace(/>\s+</g, '><'), 600));
        out.file = file.name;
        out.publishingDates = grab('PublishingDate');
        out.marketDates = grab('MarketDate');
    }
    return out;
}

/** What is stored (Evidence only; the steps read it through the screens and the export). */
function stored(app, book = BOOK) {
    const pf = `(select publication_format_id from publication_formats where publication_id = ${book.publicationId})`;
    return {
        markets: sql(app, `select market_date, market_date_format, market_date_role from markets where publication_format_id in ${pf} order by market_id`),
        dates: sql(app, `select date, date_format, role from publication_dates where publication_format_id in ${pf} order by publication_date_id`),
    };
}

module.exports = {BOOK, flat, step, openMetadata, addMarket, addDate, reopenFirst, bookPageDates, exportDates, stored};
