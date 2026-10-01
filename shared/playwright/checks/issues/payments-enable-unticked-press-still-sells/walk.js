// Issue report docs/issues/U69-A12-payments-enable-unticked-press-still-sells.md (U69 A12): a press
// that unticks "Enable" on its "Payments" tab still sells its priced files. Takes the report's Steps
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), on its press
// `publicknowledge` and its published book 14. The kit builds nothing.
//
//   1. sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar",
//      "Manual Fee Payment", instructions "Pay by cheque u69r10", "Save"
//   2. book 14's workflow, "Publication" › "Publication Formats"
//   3. "PDF" › "Segmentation of Vascular Ultrasound Imag.pdf" › "Open Access": "Direct Sales", 25.00, "Save"
//   4. sign in as aclark (Reader); "Catalog", the book; press the priced file's link: the payment
//      page (the control, and the fix's neighbour: a press with "Enable" ticked still sells)
//   5. sign in as dbarnes; "Payments": untick "Enable", "Save"; reload
//   6. sign in as aclark; "Catalog", the book; press the priced file's link
//
// Reset first:  npm run fleet-prep -- --feature issues-r10 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-r10 PROBE_AGENT=r10 node bin/probe.js omp shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r10-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r10-3_5 PROBE_AGENT=r10 node bin/probe.js omp shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/walk.js
// Facts: .reports/<feature>/r10/a12-facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');

const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FORMAT = 'PDF';
const PRICED = 'Segmentation of Vascular Ultrasound Imag.pdf';
const PRICE = '25.00';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {setUpPayments, openFormats, fileTerms, setDirectSales, openBook, pressFileLink} = require('../priced-file-link-price-twice-or-missing/lib');
    const {untickEnable} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const log = serverLog(app);
    const stored = () => sql(app, "SELECT setting_name, setting_value FROM press_settings WHERE setting_name IN ('paymentsEnabled','currency','paymentPluginName') ORDER BY 1");

    const {page, close} = await launch(app);
    try {
        // 1 to 3
        await signIn(page, 'dbarnes');
        fact('1 payments', await setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u69r10'}));
        const formats = await openFormats(page, app, BOOK);
        fact('3 file terms', await setDirectSales(page, formats, FORMAT, PRICED, PRICE));
        fact('3 files after', await fileTerms(formats, FORMAT));
        fact('3 stored', await stored());

        // 4
        await signIn(page, 'aclark');
        fact('4 book page side column, "Enable" ticked', (await openBook(page, app, TITLE)).side);
        fact('4 priced link pressed, "Enable" ticked', await pressFileLink(page, PRICED));
        record('a12-4-ticked', await screen(page));

        // 5
        await signIn(page, 'dbarnes');
        fact('5 "Enable" unticked', await untickEnable(page, app));
        record('a12-5-payments', await screen(page));
        fact('5 stored', await stored());

        // 6
        await signIn(page, 'aclark');
        fact('6 book page side column, "Enable" unticked', (await openBook(page, app, TITLE)).side);
        fact('6 priced link pressed, "Enable" unticked', await pressFileLink(page, PRICED));
        record('a12-6-unticked', await screen(page));
        await shot(page, 'a12-6-unticked').catch(() => {});
        await signOut(page);
        fact('server log', log.since());
    } finally {
        record('a12-facts', facts);
        await close();
    }
});
