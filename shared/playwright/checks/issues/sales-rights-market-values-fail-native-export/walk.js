// U74 A7 + A8 {OMP}: the "Sales Rights" and "Market Territories" windows save entries the book's
// ONIX product cannot carry (no territory, a price that is not a number, a date that does not
// match its format), and the book's Native XML export then fails (or, for the date, carries it).
// The issue report's Steps, on PKP's default test dataset (submission 4, "How Canadians
// Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A7 and A8 (Rules 12, 13, 19).
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/walk.js
// MODE=reach runs the reach checks alone (a market with only an excluded country; a discount that
// is not a number). MODE=triage runs a price "12,50", a price 0 in a two-book export (with
// submission 14) and a date "abcdefgh" under "YYYYMMDD". MODE=neighbour runs the neighbour check alone (entries the fix must still
// save, and their export). Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        const brief = v && typeof v === 'object' ? {...v, screen: undefined, afterCancel: undefined} : v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(brief).slice(0, 1800));
    };
    const meta = () => L.step(page, 'open-metadata', () => L.openMetadata(app, page));
    try {
        await signIn(page, 'dbarnes');
        fact('pre-identity', await L.step(page, 'identity', () => L.publisherIdentity(app, page)));
        fact('pre-stored', L.stored(app));

        if (MODE === 'walk') {
            // Steps 1-3: a sales-rights entry with no territory.
            let m = await meta();
            fact('s3-add-rights-no-territory', await L.step(page, 's3', () => L.addRights(page, m, {row: false})));
            fact('s3-stored', L.stored(app));
            fact('s4-export', await L.step(page, 's4', () => L.nativeExport(app, page)));
            // Step 5: delete it again.
            m = await meta();
            fact('s5-delete-rights', await L.step(page, 's5', () => L.deleteRights(page, m)));
            // Steps 6-7: a market with no territory.
            fact('s6-add-market-no-territory', await L.step(page, 's6', () => L.addMarket(page, m, {date: '20261001', price: '25'})));
            fact('s6-stored', L.stored(app));
            fact('s7-export', await L.step(page, 's7', () => L.nativeExport(app, page)));
            // Steps 8-9: Canada, and a price that is not a number. Each "Edit" also chooses the empty
            // "Taxation Type", which the window fills in with "GST (Sales tax) (02)" (U74 A6, its own
            // report) and which would fail the export on its own (U74 A17).
            m = await meta();
            fact('s8-edit-price-ten', await L.step(page, 's8', () =>
                L.editMarket(page, m, {countriesIncluded: ['Canada (CA)'], price: 'ten', taxType: ''},
                    {date: '20261001', countriesIncluded: ['Canada (CA)'], price: 'ten'})));
            fact('s8-stored', L.stored(app));
            fact('s9-export', await L.step(page, 's9', () => L.nativeExport(app, page)));
            // Steps 10-11: a date that does not match its format.
            m = await meta();
            fact('s10-edit-date-abc', await L.step(page, 's10', () =>
                L.editMarket(page, m, {price: '25', date: 'abc', dateFormat: 'YYYYMMDD', taxType: ''},
                    {date: 'abc', dateFormat: 'YYYYMMDD', countriesIncluded: ['Canada (CA)'], price: '25'})));
            fact('s10-stored', L.stored(app));
            fact('s11-export', await L.step(page, 's11', () => L.nativeExport(app, page)));
        } else if (MODE === 'reach') {
            // A market whose only territory is an excluded country.
            let m = await meta();
            fact('r1-add-market-excluded-only', await L.step(page, 'r1', () =>
                L.addMarket(page, m, {date: '20261001', countriesExcluded: ['United States (US)'], price: '25'})));
            fact('r1-stored', L.stored(app));
            fact('r2-export', await L.step(page, 'r2', () => L.nativeExport(app, page)));
            // Canada included, and a discount that is not a number.
            m = await meta();
            fact('r3-edit-discount-ten', await L.step(page, 'r3', () =>
                L.editMarket(page, m, {countriesIncluded: ['Canada (CA)'], discount: 'ten', taxType: ''},
                    {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25', discount: 'ten'})));
            fact('r3-stored', L.stored(app));
            fact('r4-export', await L.step(page, 'r4', () => L.nativeExport(app, page)));
        } else if (MODE === 'triage') {
            // A comma decimal, a price of 0 in a two-book export, and a date of the format's
            // length that is not digits.
            let m = await meta();
            fact('t1-add-market-price-comma', await L.step(page, 't1', () =>
                L.addMarket(page, m, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '12,50'})));
            fact('t1-stored', L.stored(app));
            fact('t1-export', await L.step(page, 't1x', () => L.nativeExport(app, page)));
            m = await meta();
            fact('t2-edit-price-zero', await L.step(page, 't2', () =>
                L.editMarket(page, m, {price: '0', taxType: ''}, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '0'})));
            fact('t2-stored', L.stored(app));
            fact('t2-export-two-books', await L.step(page, 't2x', () => L.nativeExport(app, page, [L.BOOK.title, L.BOOK14])));
            m = await meta();
            fact('t3-edit-date-abcdefgh', await L.step(page, 't3', () =>
                L.editMarket(page, m, {price: '25', date: 'abcdefgh', dateFormat: 'YYYYMMDD', taxType: ''},
                    {date: 'abcdefgh', dateFormat: 'YYYYMMDD', countriesIncluded: ['Canada (CA)'], price: '25'})));
            fact('t3-stored', L.stored(app));
            fact('t3-export', await L.step(page, 't3x', () => L.nativeExport(app, page)));
        } else {
            // Neighbour: entries the fix must still save, and the export.
            const m = await meta();
            fact('n1-add-rights-row-no-territory', await L.step(page, 'n1', () => L.addRights(page, m, {row: true})));
            fact('n2-add-rights-region-only', await L.step(page, 'n2', () =>
                L.addRights(page, m, {row: false, regionsIncluded: ['England (GB-ENG)']})));
            fact('n3-add-market-default-format', await L.step(page, 'n3', () =>
                L.addMarket(page, m, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25'})));
            fact('n4-add-market-region-year-decimal', await L.step(page, 'n4', () =>
                L.addMarket(page, m, {date: '2026', dateFormat: 'YYYY', regionsIncluded: ['England (GB-ENG)'], price: '12.50', discount: '10'})));
            fact('n4b-add-market-time-utc', await L.step(page, 'n4b', () =>
                L.addMarket(page, m, {date: '20261001T1230Z', dateFormat: 'YYYYMMDDThhmm', countriesIncluded: ['United States (US)'], price: '30'})));
            fact('n4-stored', L.stored(app));
            fact('n5-export', await L.step(page, 'n5', () => L.nativeExport(app, page)));
        }
    } finally {
        record(`a7-a8-${MODE}`, facts);
        await close();
    }
});
