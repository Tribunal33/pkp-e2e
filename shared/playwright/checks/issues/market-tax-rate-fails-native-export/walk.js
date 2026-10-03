// U74 A17 {OMP}: a market with a "Taxation Rate" other than "Zero-rated (Z)", or a "Taxation Type"
// with no rate, makes the book's Native XML export fail. The issue report's Steps, on PKP's default
// test dataset (submission 4, "How Canadians Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A17 (and Rule 19).
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/market-tax-rate-fails-native-export/walk.js
// MODE=batch ticks this book (taxed at "Standard rate (S)") with submission 14 (no market) in one export,
// then submission 14 alone.
// MODE=neighbour runs the neighbour check alone (a zero-rated market keeps its Tax with the percent;
// a price type that includes tax still writes no Tax). Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v && v.screen ? {...v, screen: undefined} : v).slice(0, 1500));
    };
    try {
        await signIn(page, 'dbarnes');
        fact('identity', await L.step(page, 'identity', () => L.publisherIdentity(app, page)));
        let meta = await L.step(page, 'open-metadata', () => L.openMetadata(app, page));

        if (MODE === 'walk') {
            // Steps 1-3: a market at "Standard rate (S)", then the export.
            fact('s2-add-standard-rate', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25', taxRate: 'Standard rate (S)'})));
            fact('s2-stored', L.storedMarket(app));
            fact('s3-export-standard-rate', await L.step(page, 'export-s', () => L.nativeExport(app, page)));
            // Steps 4-5: a tax type with no rate, then the export.
            meta = await L.step(page, 'reopen-1', () => L.openMetadata(app, page));
            fact('s4-edit-vat-no-rate', await L.step(page, 'edit-vat', () =>
                L.editMarket(page, meta, {taxRate: '', taxType: 'VAT (Value-added tax) (01)'})));
            fact('s4-stored', L.storedMarket(app));
            fact('s5-export-vat-no-rate', await L.step(page, 'export-vat', () => L.nativeExport(app, page)));
            // Control, steps 6-7: VAT at "Zero-rated (Z)".
            meta = await L.step(page, 'reopen-2', () => L.openMetadata(app, page));
            fact('s6-edit-zero-rated', await L.step(page, 'edit-z', () => L.editMarket(page, meta, {taxRate: 'Zero-rated (Z)'})));
            fact('s6-stored', L.storedMarket(app));
            fact('s7-export-zero-rated', await L.step(page, 'export-z', () => L.nativeExport(app, page)));
        } else if (MODE === 'batch') {
            // Two books ticked together, one with a market at "Standard rate (S)": is any file offered?
            fact('b1-add-standard-rate', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25', taxRate: 'Standard rate (S)'})));
            fact('b2-export-two-books', await L.step(page, 'export-two', () => L.nativeExport(app, page, [L.BOOK.title, L.OTHER_BOOK.title])));
            fact('b3-export-other-book-alone', await L.step(page, 'export-other', () => L.nativeExport(app, page, [L.OTHER_BOOK.title])));
        } else {
            // Neighbour: what the fix must leave alone.
            fact('n1-add-vat-zero-rated', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25',
                    taxRate: 'Zero-rated (Z)', taxType: 'VAT (Value-added tax) (01)'})));
            fact('n1-stored', L.storedMarket(app));
            fact('n2-export-vat-zero-rated', await L.step(page, 'export-z', () => L.nativeExport(app, page)));
            meta = await L.step(page, 'reopen-1', () => L.openMetadata(app, page));
            fact('n3-edit-incl-tax-standard', await L.step(page, 'edit-incl', () =>
                L.editMarket(page, meta, {priceType: 'RRP including tax (02)', taxRate: 'Standard rate (S)'})));
            fact('n3-stored', L.storedMarket(app));
            fact('n4-export-incl-tax-standard', await L.step(page, 'export-incl', () => L.nativeExport(app, page)));
        }
    } finally {
        record(`a17-${MODE}`, facts);
        await close();
    }
});
