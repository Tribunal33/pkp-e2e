// Issue report docs/issues/U52-A10-paypal-error-page-no-heading.md (U52 A10):
// when the PayPal payment page cannot reach PayPal, the payer gets a page with
// only "A transaction error occurred. Please contact the journal manager for
// details.": no heading, a breadcrumb ending "Home /", and a browser tab with
// only the journal's or press's name. Takes the report's Steps through the
// screens on a dataset fleet (PKP's default test dataset, freshly reset), on
// the two apps with payments (OPS has none):
//   OJS: as rvaca, payments on (USD, "Paypal Fee Payment", Account Name test),
//        APC 50; as dbarnes, submission 4 › "Accept and Skip Review" with
//        "Request publication fee (50 USD)"; as cmontgomerie, the Tasks
//        panel's fee task pressed.
//   OMP: as rvaca, payments on (USD, PayPal, Account Name test); as dbarnes,
//        submission 5 › "Publication Formats" › PDF's epilogue.pdf on
//        "Direct Sales" at 10; as aclark, the book page's "Purchase …" pressed.
// The test installs reach no PayPal account, so PayPal refuses the call and
// the plugin shows its error page; this is the page a payer meets whenever
// the call fails.
// Run: PROBE_FEATURE=issues-w48 PROBE_AGENT=w48 node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js
//      (reset first: npm run fleet-prep -- --feature issues-w48 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w48-3_5 and PROBE_RUN=r35)
// The neighbour check (neighbour.js) runs after it on the same install.
const {forEachApp, launch, record} = require('../../../probe');
const L = require('./lib.js');

const OJS = {sid: 4, title: 'Computer Skill Requirements for New and Existing Teachers', author: 'cmontgomerie'};
const OMP = {sid: 5, publicationId: 5, format: 'PDF', fileName: 'epilogue.pdf', price: '10', buyer: 'aclark'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (app.name === 'ops') return; // no payments
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    const responses = [];
    page.on('response', (r) => {
        if (r.status() >= 500) responses.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)});
    });
    try {
        fact('1 PayPal set up', await L.setPaymentMethod(page, app, 'paypal', '1-paypal-saved'));
        if (app.name === 'ojs') {
            await L.setApc(page, app);
            const A2 = require('../fee-task-stays-after-fee-recorded/lib.js');
            fact('3 fee requested', await A2.acceptRequestingFee(page, app, OJS.sid, '3-request-payment'));
            fact('4 task pressed', await L.pressFeeTask(page, app, OJS.author, OJS.title, '4-paypal-page'));
        } else {
            fact('2 file for sale', await L.sellFile(page, app, OMP));
            fact('3 purchase pressed', await L.purchase(page, app, OMP.buyer, OMP.sid, '3-paypal-page'));
        }
    } finally {
        fact('server errors', responses);
        record('facts', facts);
        await close();
    }
});
