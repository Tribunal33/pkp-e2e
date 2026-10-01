// Neighbour check of docs/issues/U52-A1-payment-types-promise-fees-on-about.md {OJS}: what the
// fix (fix.diff: the "Reader Fees" sentence reworded, the "General Fees" one dropped) must leave alone on the "Payment Types"
// tab. Run with the fix in and out; both runs must read the same.
//
//   N1   (as dbarnes, payments set up as in walk.js steps 1-2) the tab's headings, the "Author
//        Fees" sentence, the boxes' labels and the button
//   N2   "5" in "Purchase Article", "Save", reload: the box still holds 5
//   N3   "abc" in "Purchase Issue", "Save": refused with the form's own message
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r1 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-u52r1 PROBE_AGENT=u52r1 PROBE_RUN=<fix-in | fix-out> node bin/probe.js ojs shared/playwright/checks/issues/payment-types-promise-fees-on-about/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await L.setUpPayments(page, app, {
            currency: 'USD',
            instructions: 'Pay by bank transfer u52r1',
        });
        let {tab} = await L.openPaymentTypes(page, app);
        const form = await L.readForm(tab.form());
        fact('N1 headings', form.sections.map((s) => s.heading).filter(Boolean));
        fact('N1 Author Fees sentence', form.sections.find((s) => s.heading === 'Author Fees')?.sentence);
        fact(
            'N1 labels',
            form.fields.map((f) => f.label || f.name)
        );
        fact('N1 buttons', form.buttons);

        await L.typeFees(tab, {'Purchase Article': 5});
        fact('N2 Save', await L.saveTypes(page, tab));
        ({tab} = await L.openPaymentTypes(page, app));
        fact('N2 boxes after reload', await L.boxValues(tab));

        await L.typeFees(tab, {'Purchase Issue': 'abc'});
        fact('N3 Save', await L.saveTypes(page, tab));
    } finally {
        record('facts', facts);
        await close();
    }
});
