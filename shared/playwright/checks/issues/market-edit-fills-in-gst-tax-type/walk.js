// U74 A6 {OMP}: a market saved with "Taxation Type" empty reopens in "Edit" on "GST (Sales tax) (02)",
// so "OK" stores it; with no "Taxation Rate" the book's Native XML export then fails (through A17,
// ../market-tax-rate-fails-native-export). The issue report's Steps, on PKP's default test dataset
// (submission 4, "How Canadians Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A6 (Fields, "Taxation Type").
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/market-edit-fills-in-gst-tax-type/walk.js
// MODE=neighbour runs the neighbour check alone (a market saved with "VAT (Value-added tax) (01)"
// reopens on VAT; "Add Market" arrives with "Taxation Type" empty). Records, asserts nothing.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../market-tax-rate-fails-native-export/lib');

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
            // Step 2: a market with the three tax lists left empty.
            fact('s2-add-no-tax', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25'})));
            fact('s2-stored', L.storedMarket(app));
            // Step 3: the export completes.
            fact('s3-export-before-edit', await L.step(page, 'export-1', () => L.nativeExport(app, page)));
            // Steps 4-5: "Edit", what "Taxation Type" shows; the price to 30, "OK".
            meta = await L.step(page, 'reopen-1', () => L.openMetadata(app, page));
            fact('s4-s5-edit-price', await L.step(page, 'edit', () => L.editMarket(page, meta, {price: '30'})));
            fact('s5-stored', L.storedMarket(app));
            // Step 6: the export again.
            fact('s6-export-after-edit', await L.step(page, 'export-2', () => L.nativeExport(app, page)));
        } else {
            // Neighbour: a saved tax type reopens as saved; a new market arrives empty.
            fact('n1-add-vat', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25',
                    taxRate: 'Zero-rated (Z)', taxType: 'VAT (Value-added tax) (01)'})));
            fact('n1-stored', L.storedMarket(app));
            meta = await L.step(page, 'reopen-1', () => L.openMetadata(app, page));
            fact('n2-edit-reopens', await L.step(page, 'edit', () => L.editMarket(page, meta, {}, {cancel: true})));
            fact('n3-add-arrival', await L.step(page, 'arrival', () => L.addMarketArrival(page, meta)));
        }
    } finally {
        record(`a6-${MODE}`, facts);
        await close();
    }
});
