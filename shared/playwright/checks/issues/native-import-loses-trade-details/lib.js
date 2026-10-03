// Helpers for the U74 A11, A18, A19 walk {OMP}: a physical format added on screen, its "Metadata"
// tab's "Product Availability" and "Returnable Indicator", a "Rest of World?" sales-rights entry,
// markets with and without a supplier, suppliers on "Representatives", and a book's Native XML
// export read per format. Requiring this file runs nothing; the suite page objects are required
// inside the calls (they read PKP_APP_ROOT, which forEachApp sets). The press's "Publisher
// Identity" and `step()` come from the U74 A17 walk's lib, the export and import from the U63 A9
// walk's lib, `pressOk()` from the U74 A7/A8 walk's lib.
const path = require('path');
const {idle, screen, shot} = require('../../../probe');
const A17 = require('../market-tax-rate-fails-native-export/lib');
const A7 = require('../sales-rights-market-values-fail-native-export/lib');
const NX = require('../unknown-section-import-broken-submission/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));

const {flat, step, publisherIdentity} = A17;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The default dataset's book: submission 4, in Production, one digital format "PDF". */
const BOOK = {id: 4, publicationId: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const PAPERBACK = 'Paperback u74ir8';

/** The book's "Publication Formats" page (`publicationId` null: through the side menu, the latest version). */
async function openFormats(app, page, subId, publicationId) {
    const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
    const pf = new PublicationFormatsPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await pf.frame.gotoEditorial(subId, {menuKey: 'publication_publicationFormats'});
        await pf.expectLoaded();
    } else if (publicationId) {
        await pf.gotoEditorial(subId, publicationId);
    } else {
        await pf.frame.gotoEditorial(subId);
        await pf.openFromMenu();
    }
    return pf;
}

/** "Add publication format": name, a kind matching `kind`, physical ticked; "OK". */
async function addFormat(app, page, {name, kind = /Paperback/, physical = true}) {
    const pf = await openFormats(app, page, BOOK.id, BOOK.publicationId);
    const win = await pf.openAdd();
    await win.typeName(name);
    const label = await win.kindList().locator('option').evaluateAll((os, src) => {
        const re = new RegExp(src);
        const o = os.find((x) => re.test(x.textContent || ''));
        return o ? o.textContent.trim() : null;
    }, kind.source);
    if (label) await win.kindList().selectOption({label});
    if (physical) await win.physicalBox().check();
    await win.ok();
    await idle(page).catch(() => {});
    return {kind: label, physical, formats: await pf.formatLabels().allInnerTexts().catch(() => null), screen: await screen(page)};
}

/** A format's arrow › "Edit" › "Metadata": the tab, loaded. */
async function openMeta(app, page, subId, format, publicationId) {
    const pf = await openFormats(app, page, subId, publicationId);
    const win = await pf.openEdit(format);
    return win.openMetadata();
}

/** What the tab shows chosen in "Product Availability" and "Returnable Indicator" (null: not offered). */
async function tabChoices(meta) {
    const chosen = async (sel) => ((await sel.count()) ? flat(await sel.locator('option:checked').first().textContent().catch(() => null)) : null);
    return {
        availability: await chosen(meta.availabilityList()),
        returnable: await chosen(meta.form().locator('select[name="returnableIndicatorCode"]')),
    };
}

/** Choose "Product Composition" (required, no default) and the two lists by label; press "Save". */
async function saveChoices(meta, {composition, availability, returnable}) {
    if (composition) await meta.compositionList().selectOption({label: composition});
    if (availability) await meta.availabilityList().selectOption({label: availability});
    if (returnable) await meta.form().locator('select[name="returnableIndicatorCode"]').selectOption({label: returnable});
    await meta.save();
    return {saved: true};
}

/** The tab's "Cancel" (the tab's own fields unsaved). */
async function cancelMeta(page, meta) {
    await meta.cancelLink().click();
    await sleep(500);
    await idle(page).catch(() => {});
    return {dialogs: await page.locator('[role="dialog"]').count()};
}

/** "Add Sales Rights": a type and "Rest of World?" ticked; "OK". */
async function addRowRights(page, meta, type) {
    const {openAddSalesRights} = omp('OnixPages.js');
    const win = await openAddSalesRights(meta);
    await win.typeList().selectOption({label: type});
    await win.rowBox().setChecked(true);
    const out = await A7.pressOk(page, win);
    return {...out, screen: undefined, rows: await A7.listCells(meta, 'salesRightsGridContainer')};
}

/** The sales-rights rows: cells, and per row the "Rest of World?" tick and its "Edit" window's state. */
async function readRights(page, meta) {
    const {ListRows, SalesRightsWindow} = omp('OnixPages.js');
    const rows = meta.listRows('salesRightsGridContainer');
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) {
        const row = rows.nth(i);
        const r = {cells: await ListRows.cells(row).catch(() => null), tick: await ListRows.rowTick(row).count()};
        const win = await ListRows.openEdit(page, row, SalesRightsWindow);
        const chosen = (list) => list.locator('option:checked').evaluateAll((os) => os.map((o) => (o.textContent || '').trim()));
        r.edit = {
            type: flat(await win.chosenType().textContent().catch(() => null)),
            rowBox: await win.rowBox().isChecked().catch(() => null),
            countriesIncluded: await chosen(win.territoryList('countries', 'Included')).catch(() => null),
            regionsIncluded: await chosen(win.territoryList('regions', 'Included')).catch(() => null),
            countriesExcluded: await chosen(win.territoryList('countries', 'Excluded')).catch(() => null),
            regionsExcluded: await chosen(win.territoryList('regions', 'Excluded')).catch(() => null),
        };
        await shot(page, `rights-edit-${i}-${Date.now() % 100000}`).catch(() => {});
        await win.cancel();
        await sleep(600);
        out.push(r);
    }
    return out;
}

/** "Add Market": countries included, date, price, and a supplier by name (none: left empty); "OK". */
async function addMarket(page, meta, {country, date, price, supplier}) {
    const {openAddMarket} = omp('OnixPages.js');
    const win = await openAddMarket(meta);
    await win.territoryList('countries', 'Included').selectOption([{label: country}]);
    await win.dateBox().fill(date);
    await win.priceBox().fill(price);
    if (supplier) await win.supplierList().selectOption({label: supplier});
    const chosenSupplier = flat(await win.supplierList().locator('option:checked').first().textContent().catch(() => null));
    const out = await A7.pressOk(page, win);
    return {...out, screen: undefined, supplier: chosenSupplier, rows: await A7.listCells(meta, 'marketsGridContainer')};
}

/** The book's "Representatives" page (3.5 keys the page the same way). */
async function openRepresentatives(app, page, subId) {
    const {RepresentativesPage} = omp('OnixPages.js');
    const reps = new RepresentativesPage(page, app.contextPath);
    await reps.gotoEditorial(subId);
    return reps;
}

/** "Add Representative": "Supplier", a role, name and website; "OK". */
async function addSupplier(app, page, {name, role, website}) {
    const reps = await openRepresentatives(app, page, BOOK.id);
    const win = await reps.openAdd();
    // The window opens on "Supplier" with both "Role" lists and refuses the save until the type is
    // clicked (U74 A12, its own report): "Agent", then "Supplier".
    await win.chooseType('agent');
    await win.chooseType('supplier');
    await win.roleList('supplier').selectOption({label: role});
    await win.nameBox().fill(name);
    if (website) await win.websiteBox().fill(website);
    await win.ok();
    await idle(page).catch(() => {});
    return {names: await reps.names('Suppliers').allInnerTexts()};
}

/** Each group's rows (name, role) and, per supplier, its "Edit" window's role, email and website. */
async function readRepresentatives(app, page, subId) {
    const {rowCells} = omp('OnixPages.js');
    const reps = await openRepresentatives(app, page, subId);
    const out = {screen: await screen(page)};
    for (const group of ['Agents', 'Suppliers']) {
        const rows = reps.rows(group);
        out[group] = [];
        for (let i = 0; i < (await rows.count()); i++) out[group].push(await rowCells(rows.nth(i)).catch(() => null));
    }
    out.supplierEdits = [];
    for (const [name] of out.Suppliers) {
        const win = await reps.openEdit('Suppliers', name);
        out.supplierEdits.push({
            name: await win.nameBox().inputValue().catch(() => null),
            role: flat(await win.roleList('supplier').locator('option:checked').first().textContent().catch(() => null)),
            email: await win.emailBox().inputValue().catch(() => null),
            phone: await win.phoneBox().inputValue().catch(() => null),
            website: await win.websiteBox().inputValue().catch(() => null),
        });
        await shot(page, `supplier-edit-${flat(name, 30).replace(/\W+/g, '-')}`).catch(() => {});
        await win.cancel();
        await sleep(600);
    }
    return out;
}

/** Every element `name` in an XML text, whitespace between tags dropped. */
const elements = (xml, name) =>
    (xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${name}>`, 'g')) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 900));

/** A Native XML file's formats: per `publication_format`, its name and the trade parts of its ONIX product. */
function formatParts(xml) {
    const blocks = xml.match(/<publication_format\b[\s\S]*?<\/publication_format>/g) || [];
    return blocks.map((b) => ({
        name: flat((/<name\b[^>]*>([\s\S]*?)<\/name>/.exec(b) || [])[1]),
        salesRights: elements(b, 'SalesRights'),
        rowSalesRightsType: elements(b, 'ROWSalesRightsType'),
        supplier: elements(b, 'Supplier'),
        returnsConditions: elements(b, 'ReturnsConditions'),
        productAvailability: elements(b, 'ProductAvailability'),
    }));
}

/**
 * Tools › "Native XML Plugin" › export tab: tick the book, export, download; the file and its formats.
 * With `id`, the row whose box carries that submission ID is ticked (an imported copy shares the title).
 */
async function exportBook(app, page, title, id = null) {
    await NX.openNative(app, page);
    if (!id) {
        const out = await NX.exportOne(app, page, title);
        return {results: flat(out.res && out.res.panel, 400), file: out.file, xml: out.xml, formats: formatParts(out.xml)};
    }
    const fs = require('fs');
    await NX.openExportTab(app, page);
    const tab = page.locator('#exportSubmissions-tab');
    const box = tab.locator(`input[type=checkbox][value="${id}"]`);
    if (!(await box.count())) {
        await tab.locator('input[type=search]').first().fill(title.slice(0, 40));
        await sleep(1500);
        await idle(page).catch(() => {});
    }
    const ticked = {boxes: await tab.locator('.listPanel__item input[type=checkbox]').evaluateAll((bs) => bs.map((b) => b.value))};
    await box.first().check();
    const res = await (async () => {
        const before = await page.locator('#importExportTabs > ul [role="tab"]').count();
        await tab.getByRole('button', {name: NX.LABELS[app.name].exportBtn, exact: true}).click();
        for (let i = 0; i < 60; i++) {
            await sleep(500);
            if ((await page.locator('#importExportTabs > ul [role="tab"]').count()) > before) break;
        }
        await page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
        return flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 400);
    })();
    const dl = page.waitForEvent('download', {timeout: 20_000});
    await page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'}).click();
    const d = await dl;
    const xml = fs.readFileSync(await d.path(), 'utf8');
    return {...ticked, results: res, file: d.suggestedFilename(), xml, formats: formatParts(xml)};
}

/** Tools › "Native XML Plugin" › "Import": upload the file, "Import"; the results and the new book's ID. */
async function importBook(app, page, file) {
    await NX.openNative(app, page);
    const res = await NX.importFile(page, file);
    const m = /"(\d+)" - "/.exec(res.panel || '');
    return {uploaded: res.uploaded, tabs: res.tabs, results: flat(res.panel, 600), copy: m ? Number(m[1]) : null};
}

module.exports = {BOOK, PAPERBACK, flat, step, sleep, publisherIdentity, openFormats, addFormat, openMeta, tabChoices, saveChoices, cancelMeta, addRowRights, readRights, addMarket, openRepresentatives, addSupplier, readRepresentatives, elements, formatParts, exportBook, importBook};
