// Issue report docs/issues/U69-A18-sign-in-to-buy-file-skips-payment-page.md (U69 A18): a visitor
// who presses a priced file's link gets the Login page, and after signing in there lands on the
// press's home page (a Reader) or the Dashboard (a Press manager), not on the payment page. Takes
// the report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its press `publicknowledge` and its published book 14. The kit builds nothing.
//
//   1. sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar",
//      "Manual Fee Payment", instructions "Pay by cheque u69r10", "Save"
//   2. book 14's workflow, "Publication" › "Publication Formats"
//   3. "PDF" › "Segmentation of Vascular Ultrasound Imag.pdf" › "Open Access": "Direct Sales", 25.00, "Save"
//   4. sign out; "Catalog", the book
//   5. press the priced file's link in the side column: the Login page
//   6. sign in there as aclark (Reader)
//   7. sign out; 4 to 6 again as rvaca (Press manager)
//   8. sign out; 4 and 5 again; on the Login page press "Register", fill the form as "Reader u69r10"
//      (username u69r10reader), "Register"
//   9. sign out; 4 to 6 again as u69r10reader (a Reader and nothing else)
//   control:    aclark, signed in, opens the book and presses the link: the payment page at once
//   neighbours: that control, and a visitor pressing the free file "The Canadian Nutrient File:
//               Nutrient Val.pdf": its view page, no Login (walked with the fix in and out)
//
// Reset first:  npm run fleet-prep -- --feature issues-r10 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-r10 PROBE_AGENT=r10 node bin/probe.js omp shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r10-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r10-3_5 PROBE_AGENT=r10 node bin/probe.js omp shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/walk.js
// Facts: .reports/<feature>/r10/a18-facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');

const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FORMAT = 'PDF';
const PRICED = 'Segmentation of Vascular Ultrasound Imag.pdf';
const FREE = 'The Canadian Nutrient File: Nutrient Val.pdf';
const PRICE = '25.00';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {setUpPayments, openFormats, fileTerms, setDirectSales, openBook, pressFileLink} = require('../priced-file-link-price-twice-or-missing/lib');
    const {readLogin, signInHere, registerHere} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        // 1 to 3
        await signIn(page, 'dbarnes');
        fact('1 payments', await setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u69r10'}));
        const formats = await openFormats(page, app, BOOK);
        fact('3 file terms', await setDirectSales(page, formats, FORMAT, PRICED, PRICE));
        fact('3 files after', await fileTerms(formats, FORMAT));
        await signOut(page);

        // 4 to 7
        for (const [n, username] of [['6', 'aclark'], ['7', 'rvaca']]) {
            const book = await openBook(page, app, TITLE);
            fact(`${n} book page side column, signed out`, book.side);
            fact(`${n} priced link pressed, signed out`, await pressFileLink(page, PRICED));
            fact(`${n} the Login page`, await readLogin(page));
            record(`a18-${n}-login`, await screen(page));
            fact(`${n} signed in there as ${username}`, await signInHere(page, username));
            record(`a18-${n}-landed-${username}`, await screen(page));
            await shot(page, `a18-${n}-landed-${username}`).catch(() => {});
            await signOut(page);
        }

        // 8: a newcomer registers from the Login page
        await openBook(page, app, TITLE);
        fact('8 priced link pressed, signed out', await pressFileLink(page, PRICED));
        fact('8 registered from there as u69r10reader', await registerHere(page, app, {givenName: 'Reader', familyName: 'u69r10', username: 'u69r10reader'}));
        record('a18-8-landed-registered', await screen(page));
        await signOut(page);

        // 9: the same newcomer, a Reader only, signs in to buy
        await openBook(page, app, TITLE);
        fact('9 priced link pressed, signed out', await pressFileLink(page, PRICED));
        fact('9 signed in there as u69r10reader', await signInHere(page, 'u69r10reader'));
        record('a18-9-landed-u69r10reader', await screen(page));
        await shot(page, 'a18-9-landed-u69r10reader').catch(() => {});
        await signOut(page);

        // neighbour: a visitor and a free file
        await openBook(page, app, TITLE);
        fact('neighbour: free link pressed, signed out', await pressFileLink(page, FREE));

        // control and neighbour: the signed-in Reader
        await signIn(page, 'aclark');
        await openBook(page, app, TITLE);
        fact('control: priced link pressed, aclark signed in', await pressFileLink(page, PRICED));
        record('a18-control-reader', await screen(page));
        fact('server log', log.since());
    } finally {
        record('a18-facts', facts);
        await close();
    }
});
