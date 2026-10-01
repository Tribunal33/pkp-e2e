// Issue report docs/issues/U69-A7-A8-priced-file-link-price-twice-or-missing.md (U69 A7, A8): on a
// press's book page a file for sale shows its price twice, or, where its format lists several
// files, no price at all. Takes the report's Steps on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), on its press `publicknowledge` and its published book 14. The kit
// builds nothing.
//
//   1. sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar",
//      "Manual Fee Payment", instructions "Pay by cheque u69r5", "Save"
//   2. book 14's workflow, "Publication" › "Publication Formats"
//   3. "PDF" › "chapter1.pdf" › "Open Access": "Direct Sales", 25.00, "Save"
//   4. the same for "Segmentation of Vascular Ultrasound Imag.pdf"
//   5. sign out; "Catalog", the book
//   6. read chapter 1's link and the side column's links under "PDF"
//   7. press the priced file's link signed out, then as aclark (Reader)
//
// WALK=neighbour (fix in and out): the same without step 1, so the press has no currency: every
// link reads the format's name or the file's name alone. The main walk's free files (chapters 2-4,
// "The Canadian Nutrient File: Nutrient Val.pdf") are the other neighbour.
//
// Reset first:  npm run fleet-prep -- --feature issues-r5 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js omp shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r5-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r5-3_5 PROBE_AGENT=r5 node bin/probe.js omp shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/walk.js
// Facts: .reports/<feature>/r5/[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FORMAT = 'PDF';
const CHAPTER_FILE = 'chapter1.pdf';
const BOOK_FILE = 'Segmentation of Vascular Ultrasound Imag.pdf';
const PRICE = '25.00';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {setUpPayments, openFormats, fileTerms, setDirectSales, openBook, pressFileLink} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        // 1
        if (MODE === 'walk') {
            fact('1 payments', await setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u69r5'}));
            record(name('1-payments'), await screen(page));
        }
        // 2
        const formats = await openFormats(page, app, BOOK);
        fact('2 files before', await fileTerms(formats, FORMAT));
        // 3, 4
        fact('3 chapter file terms', await setDirectSales(page, formats, FORMAT, CHAPTER_FILE, PRICE));
        fact('4 book file terms', await setDirectSales(page, formats, FORMAT, BOOK_FILE, PRICE));
        fact('4 files after', await fileTerms(formats, FORMAT));
        record(name('4-formats'), await screen(page));
        // 5, 6
        await signOut(page);
        fact('6 book page, signed out', await openBook(page, app, TITLE));
        record(name('6-book'), await screen(page));
        await shot(page, name('6-book')).catch(() => {});
        // 7
        fact('7 priced link pressed, signed out', await pressFileLink(page, BOOK_FILE));
        await signIn(page, 'aclark');
        fact('7 book page, aclark', await openBook(page, app, TITLE));
        fact('7 priced link pressed, aclark', await pressFileLink(page, BOOK_FILE));
        record(name('7-reader'), await screen(page));
        fact('server log', log.since());
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
