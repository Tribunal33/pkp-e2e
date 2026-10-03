// U74 A4 {OMP}: a format's "Market Territories" list shows the territories as bare codes
// ("Included: CA, US, Excluded: GB, CA-QC") while its window names them ("Canada (CA)"), and runs
// the price into the currency code ("25CAD"). The issue report's Steps, on PKP's default test
// dataset (submission 4, "How Canadians Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A4.
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/market-list-shows-codes-price-run-together/walk.js
// MODE=neighbour runs the neighbour check alone: a market with nothing chosen in the four
// territory lists and 12.50 in US dollars, its row, its "Edit" window and the "Sales Rights" list
// (what the fix must leave alone). Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record, screen} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || process.argv[2] || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v && v.screen ? {...v, screen: undefined} : v).slice(0, 1500));
    };
    try {
        // Steps 1-3: sign in, submission 4 › "Publication Formats" › "PDF" › "Edit" › "Metadata".
        await signIn(page, 'dbarnes');
        let meta = await L.step(page, 'open-metadata', () => L.openMetadata(app, page));
        fact('s3-markets-before', await L.step(page, 'rows-before', () => L.marketRows(meta)));

        if (MODE === 'walk') {
            // Steps 4-5: "Add Market", the territories, the price, "OK".
            fact('s5-add-market', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {
                    date: '20261001',
                    countriesIncluded: ['Canada (CA)', 'United States (US)'],
                    countriesExcluded: ['United Kingdom (GB)'],
                    regionsExcluded: ['Quebec (CA-QC)'],
                    price: '25',
                })));
            // Step 6: the list's row.
            fact('s6-list', await L.step(page, 'rows', () => L.marketRows(meta)));
            fact('s6-screen', await screen(page).catch(() => null));
            // Step 7: the row's "Edit" window.
            fact('s7-edit-window', await L.step(page, 'edit', () => L.editChoices(page, meta, 0)));
            // After a reload of the tab: the list again (the row is drawn by the server either way).
            meta = await L.step(page, 'reopen', () => L.openMetadata(app, page));
            fact('s6b-list-reopened', await L.step(page, 'rows-reopened', () => L.marketRows(meta)));
            fact('stored', L.storedMarkets(app));
        } else {
            // Neighbour: nothing chosen in the territory lists, 12.50 in US dollars.
            fact('n1-add-empty-territories-usd', await L.step(page, 'add', () =>
                L.addMarket(page, meta, {date: '20261001', price: '12.50', currency: 'US Dollar (USD)'})));
            fact('n2-list', await L.step(page, 'rows', () => L.marketRows(meta)));
            fact('n3-edit-window', await L.step(page, 'edit', () => L.editChoices(page, meta, 0)));
            fact('n4-sales-rights', await L.step(page, 'rights', () => L.salesRightsRows(meta)));
            fact('stored', L.storedMarkets(app));
        }
    } finally {
        record(`a4-${MODE}`, facts);
        await close();
    }
});
