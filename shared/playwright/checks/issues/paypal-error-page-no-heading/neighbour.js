// Neighbour check for docs/issues/U52-A10-paypal-error-page-no-heading.md:
// the payment pages the fix must leave alone. Runs after walk.js on the same
// install (no reset between): rvaca switches to "Manual Fee Payment" with
// instructions, and the payer opens the same payment again (OJS: the Tasks
// panel's fee task; OMP: the book's "Purchase …" link): the manual page,
// headed "Manual Fee Payment". Then, as the same payer, the address of a
// payment that does not exist (payment/pay/999999, typed): the page "Payment"
// with "A payment has been requested, but the request has expired.".
// Run: PROBE_FEATURE=issues-w48 PROBE_AGENT=w48 node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/neighbour.js
const {forEachApp, launch, record, signIn} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    if (app.name === 'ops') return;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        fact('n1 manual set up', await L.setPaymentMethod(page, app, 'manual', 'n1-manual-saved'));
        const payer = app.name === 'ojs' ? 'cmontgomerie' : 'aclark';
        if (app.name === 'ojs') {
            fact('n2 task pressed (manual)', await L.pressFeeTask(page, app, payer, 'Computer Skill Requirements for New and Existing Teachers', 'n2-manual-page'));
        } else {
            fact('n2 purchase pressed (manual)', await L.purchase(page, app, payer, 5, 'n2-manual-page'));
        }
        await signIn(page, payer);
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/payment/pay/999999`));
        fact('n3 unknown payment', await L.readMessagePage(page, r, 'n3-unknown-payment'));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
