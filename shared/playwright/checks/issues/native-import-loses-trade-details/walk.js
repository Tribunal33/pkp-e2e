// U74 A11, A18, A19 {OMP}: a book's Native XML export imported again loses or rewrites its trade
// details. A "Rest of World?" sales-rights entry comes back unticked (A11); a never-saved
// "Metadata" tab shows a returns choice the product does not carry, and an import brings back
// neither "Returnable Indicator" nor "Product Availability" (A18); a market without a supplier
// comes back naming the press as a new supplier, and suppliers' websites change (A19).
// The issue reports' Steps, on PKP's default test dataset (submission 4, "How Canadians
// Communicate"), as `dbarnes`; the format "Paperback u74ir8", two suppliers and three markets are
// made on screen. Spec: docs/specs/U74-onix-metadata-export.md, register A11, A18, A19 (Rule 25).
// Issue reports (one cause each; fix-<entry>.diff here, all five together in fix-trial.diff):
//   docs/issues/U74-A11-native-import-unticks-rest-of-world.md
//   docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md
//   docs/issues/U74-A18-native-import-resets-returns-and-availability.md
//   docs/issues/U74-A19-native-import-adds-press-as-supplier.md
//   docs/issues/U74-A19-native-import-changes-supplier-websites.md
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/native-import-loses-trade-details/walk.js
// MODE=neighbour runs the control cases the fixes must leave alone (see the end of this file);
// MODE=reach imports the book into a second press made on screen, as `admin`; MODE=overlap adds a
// Canada entry beside the "Rest of World?" one (A11); MODE=pressname chooses a role-09 supplier
// named as the press (A19 press); MODE=digital takes A18's two halves on a digital format
// "E-book u74hk9" (its tab offers "Returnable Indicator" too, U73 A6). Records the screens and
// the files' parts, asserts nothing.
const fs = require('fs');
const {forEachApp, launch, signIn, record, outFile, screen} = require('../../../probe');
const NX = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const RIGHTS_01 = 'For sale with exclusive rights in the specified countries or territories (01)';
const RIGHTS_02 = 'For sale with non-exclusive rights in the specified countries or territories (02)';
const ROLE_04 = 'Wholesaler to retailers (04)';
const COMPOSITION = 'Single-component retail product (00)';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const errs = NX.scriptErrors(page);
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        const brief = v && typeof v === 'object' ? {...v, screen: undefined, xml: undefined} : v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(brief).slice(0, 2500));
    };
    const S = (name, fn) => L.step(page, name, fn);
    const saveFile = (name, out) => {
        if (out && out.xml) {
            const f = outFile(name);
            fs.writeFileSync(f, out.xml);
            out.saved = f;
        }
        return out;
    };
    try {
        // Steps 1-3.
        await signIn(page, 'dbarnes');
        fact('s2-identity', await S('s2', () => L.publisherIdentity(app, page)));
        if (MODE !== 'digital') fact('s3-add-format', await S('s3', () => L.addFormat(app, page, {name: L.PAPERBACK})));

        if (MODE === 'digital') {
            // A18 on a digital format held by the press: the never-saved tab against the product,
            // then a saved tab through the import.
            const EBOOK = 'E-book u74hk9';
            fact('d2-add-ebook', await S('d2', () => L.addFormat(app, page, {name: EBOOK, kind: /\(DA\)/, physical: false})));
            let meta = await L.openMeta(app, page, L.BOOK.id, EBOOK, L.BOOK.publicationId);
            fact('d3-tab', await S('d3', () => L.tabChoices(meta)));
            fact('d4-market', await S('d4', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25'})));
            await L.cancelMeta(page, meta);
            fact('d5-export-unsaved', saveFile('digital-export-1.xml', await S('d5', () => L.exportBook(app, page, L.BOOK.title))));
            meta = await L.openMeta(app, page, L.BOOK.id, EBOOK, L.BOOK.publicationId);
            fact('d6-save-tab', await S('d6', () => L.saveChoices(meta, {composition: COMPOSITION, availability: 'In stock (21)', returnable: 'No, not returnable (N)'})));
            const e = saveFile('digital-export-2.xml', await S('d7', () => L.exportBook(app, page, L.BOOK.title)));
            fact('d7-export-saved', e);
            const imp = await S('d8', () => L.importBook(app, page, e.saved));
            fact('d8-import', imp);
            if (imp.copy) {
                meta = await L.openMeta(app, page, imp.copy, EBOOK, null);
                fact('d8-copy-tab', await S('d8b', () => L.tabChoices(meta)));
                await L.cancelMeta(page, meta).catch(() => {});
                fact('d9-copy-export', saveFile('digital-export-copy.xml', await S('d9', () => L.exportBook(app, page, L.BOOK.title, imp.copy))));
            }
        } else if (MODE === 'walk') {
            // Part A, steps 4-7.
            let meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('s4-tab', await S('s4', () => L.tabChoices(meta)));
            fact('s5-row-rights', await S('s5', () => L.addRowRights(page, meta, RIGHTS_01)));
            fact('s6-market-no-supplier', await S('s6', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25'})));
            fact('s6-cancel', await S('s6c', () => L.cancelMeta(page, meta)));
            const e1 = saveFile('export-1.xml', await S('s7', () => L.exportBook(app, page, L.BOOK.title)));
            fact('s7-export-1', e1);

            // Part B, steps 8-16.
            meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('s8-save-tab', await S('s8', () => L.saveChoices(meta, {composition: COMPOSITION, availability: 'In stock (21)', returnable: 'No, not returnable (N)'})));
            meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('s8-tab-after', await S('s8r', () => L.tabChoices(meta)));
            await L.cancelMeta(page, meta);
            fact('s9-supplier', await S('s9', () => L.addSupplier(app, page, {name: 'u74ir8 Supply', role: ROLE_04, website: 'https://supply.example.org/'})));
            fact('s10-supplier', await S('s10', () => L.addSupplier(app, page, {name: 'u74ir8 Depot', role: ROLE_04})));
            meta = await L.openMeta(app, page, L.BOOK.id, 'PDF', L.BOOK.publicationId);
            fact('s11-market-supply', await S('s11a', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25', supplier: 'u74ir8 Supply'})));
            fact('s11-market-depot', await S('s11b', () => L.addMarket(page, meta, {country: 'United States (US)', date: '20261001', price: '30', supplier: 'u74ir8 Depot'})));
            await L.cancelMeta(page, meta);
            fact('s11-original-representatives', await S('s11r', () => L.readRepresentatives(app, page, L.BOOK.id)));
            const e2 = saveFile('export-2.xml', await S('s12', () => L.exportBook(app, page, L.BOOK.title)));
            fact('s12-export-2', e2);
            const imp = await S('s13', () => L.importBook(app, page, e2.saved));
            fact('s13-import', imp);
            record('s13-import-screen', await screen(page));
            if (imp.copy) {
                meta = await L.openMeta(app, page, imp.copy, L.PAPERBACK, null);
                fact('s14-rights', await S('s14a', () => L.readRights(page, meta)));
                fact('s14-tab', await S('s14b', () => L.tabChoices(meta)));
                await L.cancelMeta(page, meta).catch(() => {});
                fact('s15-representatives', await S('s15', () => L.readRepresentatives(app, page, imp.copy)));
                const e3 = saveFile('export-3.xml', await S('s16', () => L.exportBook(app, page, L.BOOK.title, imp.copy)));
                fact('s16-export-copy', e3);
            }
        } else if (MODE === 'overlap') {
            // A11 with a second entry: "(01)" for Canada beside the "Rest of World?" entry "(02)";
            // the original's list, the file, the copy's list and the copy's export.
            const A7 = require('../sales-rights-market-values-fail-native-export/lib');
            let meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('o1-canada-rights', await S('o1', async () => ({...(await A7.addRights(page, meta, {type: RIGHTS_01, row: false, countriesIncluded: ['Canada (CA)']})), screen: undefined, afterCancel: undefined})));
            fact('o2-row-rights', await S('o2', () => L.addRowRights(page, meta, RIGHTS_02)));
            fact('o3-market', await S('o3', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25'})));
            fact('o3-original-rights', await S('o3r', () => L.readRights(page, meta)));
            await L.cancelMeta(page, meta).catch(() => {});
            const e = saveFile('overlap-export.xml', await S('o4', () => L.exportBook(app, page, L.BOOK.title)));
            fact('o4-export', e);
            const imp = await S('o5', () => L.importBook(app, page, e.saved));
            fact('o5-import', imp);
            if (imp.copy) {
                meta = await L.openMeta(app, page, imp.copy, L.PAPERBACK, null);
                fact('o6-copy-rights', await S('o6', () => L.readRights(page, meta)));
                await L.cancelMeta(page, meta).catch(() => {});
                fact('o7-copy-export', saveFile('overlap-export-copy.xml', await S('o7', () => L.exportBook(app, page, L.BOOK.title, imp.copy))));
            }
        } else if (MODE === 'pressname') {
            // A19 press, the fix's role-29 condition: a supplier the press chooses itself, role
            // "Publisher to end-customers (09)" and named exactly as the press's "Press Publisher Name".
            fact('p1-supplier', await S('p1', () => L.addSupplier(app, page, {name: 'Public Knowledge Press', role: 'Publisher to end-customers (09)', website: 'https://shop.example.org/'})));
            let meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('p2-market', await S('p2', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25', supplier: 'Public Knowledge Press'})));
            await L.cancelMeta(page, meta).catch(() => {});
            const e = saveFile('pressname-export.xml', await S('p3', () => L.exportBook(app, page, L.BOOK.title)));
            fact('p3-export', e);
            const imp = await S('p4', () => L.importBook(app, page, e.saved));
            fact('p4-import', imp);
            if (imp.copy) {
                fact('p5-representatives', await S('p5', () => L.readRepresentatives(app, page, imp.copy)));
                meta = await L.openMeta(app, page, imp.copy, L.PAPERBACK, null);
                fact('p6-market-rows', await S('p6', () => require('../sales-rights-market-values-fail-native-export/lib').listCells(meta, 'marketsGridContainer')));
                await L.cancelMeta(page, meta).catch(() => {});
            }
        } else if (MODE === 'reach') {
            // A19's reach when a book moves to another press: the book exported with a market that
            // names no supplier, imported by `admin` into a second press made on screen (the dataset
            // has one press); the copy's "Representatives" and its market row there.
            let meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('r1-market-no-supplier', await S('r1', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25'})));
            await L.cancelMeta(page, meta);
            const e = saveFile('reach-export.xml', await S('r2', () => L.exportBook(app, page, L.BOOK.title)));
            fact('r2-export', e);
            const {signOut} = require('../../../probe');
            await signOut(page).catch(() => {});
            await signIn(page, 'admin');
            const second = {...app, contextPath: 'u74ir8'};
            fact('r3-create-press', await S('r3', () => require('../native-import-other-context-resets-contributor-roles/lib').createContext(page, app, {name: 'u74ir8 Second Press', initials: 'U74IR8', path: 'u74ir8', email: 'u74ir8@mailinator.com'})));
            const imp = await S('r4', () => L.importBook(second, page, e.saved));
            fact('r4-import', imp);
            if (imp.copy) {
                fact('r5-representatives', await S('r5', () => L.readRepresentatives(second, page, imp.copy)));
                meta = await L.openMeta(second, page, imp.copy, L.PAPERBACK, null);
                fact('r6-market-rows', await S('r6', () => require('../sales-rights-market-values-fail-native-export/lib').listCells(meta, 'marketsGridContainer')));
                await L.cancelMeta(page, meta).catch(() => {});
            }
        } else if (MODE === 'neighbour') {
            // What the fix must leave alone: an ordinary entry whose included region is "World (WORLD)"
            // comes back unticked beside a "Rest of World?" entry; a supplier the press chose itself, role "Publisher to end-customers
            // (09)" under another name, with a website, comes back as it was; a format's saved
            // availability and returns still reach the file; a second "Rest of World?" entry on the
            // copy is refused as on the original.
            let meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('n1-world-rights', await S('n1', async () => {
                const {openAddSalesRights} = require(require('path').join(__dirname, '../../../../../apps/omp/playwright/pages/OnixPages.js'));
                const win = await openAddSalesRights(meta);
                await win.typeList().selectOption({label: RIGHTS_02});
                await win.territoryList('regions', 'Included').selectOption([{label: 'World (WORLD)'}]);
                await win.territoryList('countries', 'Excluded').selectOption([{label: 'Germany (DE)'}]);
                const A7 = require('../sales-rights-market-values-fail-native-export/lib');
                const out = await A7.pressOk(page, win);
                return {...out, screen: undefined};
            }));
            // ...and a "Rest of World?" entry after it (another type: the window offers each type once
            // per format), which must come back ticked.
            fact('n1b-row-rights', await S('n1b', () => L.addRowRights(page, meta, RIGHTS_01)));
            fact('n2-save-tab', await S('n2', () => L.saveChoices(meta, {composition: COMPOSITION, availability: 'In stock (21)', returnable: 'No, not returnable (N)'})));
            fact('n3-supplier-09', await S('n3', () => L.addSupplier(app, page, {name: 'u74ir8 Press Shop', role: 'Publisher to end-customers (09)', website: 'https://shop.example.org/'})));
            meta = await L.openMeta(app, page, L.BOOK.id, L.PAPERBACK, L.BOOK.publicationId);
            fact('n4-market-09', await S('n4', () => L.addMarket(page, meta, {country: 'Canada (CA)', date: '20261001', price: '25', supplier: 'u74ir8 Press Shop'})));
            await L.cancelMeta(page, meta);
            const e = saveFile('neighbour-export.xml', await S('n5', () => L.exportBook(app, page, L.BOOK.title)));
            fact('n5-export', e);
            const imp = await S('n6', () => L.importBook(app, page, e.saved));
            fact('n6-import', imp);
            if (imp.copy) {
                meta = await L.openMeta(app, page, imp.copy, L.PAPERBACK, null);
                fact('n7-rights', await S('n7', () => L.readRights(page, meta)));
                fact('n7-tab', await S('n7b', () => L.tabChoices(meta)));
                await L.cancelMeta(page, meta).catch(() => {});
                fact('n8-representatives', await S('n8', () => L.readRepresentatives(app, page, imp.copy)));
            }
        }
    } catch (e) {
        fact('error', L.flat(e && e.message, 1200));
    } finally {
        fact('scriptErrors', errs);
        record(MODE === 'walk' ? 'walk' : MODE, facts);
        await close();
    }
});
