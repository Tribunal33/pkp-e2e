// U74 A5 and U73 A7 {OMP}: a new market's and a new publication date's "Date Format" arrive on
// "YYYYMMDD (H)", the Hijri calendar, so a date typed without changing the list is recorded,
// shown on the book page and exported as a Hijri date. The issue report's Steps, on PKP's default
// test dataset (submission 14, "From Bricks to Brains", its format "PDF"), as `dbarnes`.
// Specs: docs/specs/U74-onix-metadata-export.md A5; docs/specs/U73-publication-formats-proof-terms.md A7.
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/new-market-date-preselects-hijri/walk.js
// MODE=neighbour runs the neighbour check alone: a market and a date the press deliberately sets to
// "YYYYMMDD (H)" reopen on it, show "Hijri Calendar" and export 20; a date refused by the server
// redraws on the format the press chose ("YYYY"). Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record, shot} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    });
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v && v.screen ? {...v, screen: undefined} : v).slice(0, 1500));
    };
    try {
        // Steps 1-2: sign in; the press's "Publisher Identity", so the export carries ONIX.
        await signIn(page, 'dbarnes');
        fact('s2-identity', await L.step(page, 'identity', () => A17identity(app, page)));
        // Step 3: the format's "Metadata" tab.
        let meta = await L.step(page, 'open-metadata', () => L.openMetadata(app, page));

        if (MODE === 'walk') {
            // Steps 4-5: "Add Market", as it arrives; a date typed, the list left alone.
            fact('s4-5-add-market', await L.step(page, 'add-market', () =>
                L.addMarket(page, meta, {date: '20261001', countriesIncluded: ['Canada (CA)'], price: '25'})));
            await shot(page, 'after-market').catch(() => {});
            // Steps 6-7: "Add publication date", as it arrives; a date typed, "Publication date (01)".
            fact('s6-7-add-date', await L.step(page, 'add-date', () =>
                L.addDate(page, meta, {date: '20261001', role: 'Publication date (01)'})));
            await shot(page, 'after-date').catch(() => {});
            fact('stored', L.stored(app));
            // Step 8: the book page.
            fact('s8-book-page', await L.step(page, 'book-page', () => L.bookPageDates(app, page)));
            await shot(page, 'book-page').catch(() => {});
            // Step 9: the Native XML export's ONIX dates.
            fact('s9-export', await L.step(page, 'export', () => L.exportDates(app, page)));
        } else {
            // Neighbour: a deliberate "YYYYMMDD (H)" stays what the press chose.
            fact('n1-add-market-hijri', await L.step(page, 'add-market', () =>
                L.addMarket(page, meta, {dateFormat: 'YYYYMMDD (H)', date: '14480401', countriesIncluded: ['Canada (CA)'], price: '25'})));
            fact('n2-add-date-hijri', await L.step(page, 'add-date', () =>
                L.addDate(page, meta, {dateFormat: 'YYYYMMDD (H)', date: '14480401', role: 'Publication date (01)'})));
            // A date refused by the server: the window is redrawn on the press's choice.
            fact('n3-add-date-refused-yyyy', await L.step(page, 'add-date-refused', () =>
                L.addDate(page, meta, {dateFormat: 'YYYY', date: '20261', role: 'Sales embargo date (02)'})));
            fact('stored', L.stored(app));
            meta = await L.step(page, 'reopen', () => L.openMetadata(app, page));
            fact('n4-reopen-market', await L.step(page, 'reopen-market', () => L.reopenFirst(page, meta, 'market')));
            fact('n5-reopen-date', await L.step(page, 'reopen-date', () => L.reopenFirst(page, meta, 'date')));
            fact('n6-book-page', await L.step(page, 'book-page', () => L.bookPageDates(app, page)));
            fact('n7-export', await L.step(page, 'export', () => L.exportDates(app, page)));
        }
    } finally {
        facts.dialogs = dialogs;
        record(`a5-${MODE}`, facts);
        await close();
    }
});

/** Settings › Press › "Masthead" › "Publisher Identity": the four details, "Save" (the A17 walk's helper). */
function A17identity(app, page) {
    return require('../market-tax-rate-fails-native-export/lib').publisherIdentity(app, page);
}
