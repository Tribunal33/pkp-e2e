// Neighbour check of docs/issues/U52-A4-payment-types-required-note-no-required-field.md {OJS}:
// what the fix (fix.diff, one line of templates/payments/paymentTypesForm.tpl) must leave alone.
// Run with the fix in and out; both runs must read the same.
//
//   N1   (as dbarnes, payments set up as in walk.js steps 1-2) the "Subscription Policies" tab of
//        the same page: its required-fields line and its three marked fields stay
//   N2   "Subscription Types" › "Create New Subscription Type": the window's line and marked fields stay
//   N3   "Payment Types": "abc" in "Article Processing Charge", "Save": refused with the form's own
//        message; then "50", "Save": saved
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r1 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-u52r1 PROBE_AGENT=u52r1 PROBE_RUN=<fix-in | fix-out> node bin/probe.js ojs shared/playwright/checks/issues/payment-types-required-note-no-required-field/neighbour.js
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('../payment-types-promise-fees-on-about/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const marked = (f) => ({
        note: f.note,
        asterisksOnFields: f.asterisksOnFields,
    });
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await L.setUpPayments(page, app, {
            currency: 'USD',
            instructions: 'Pay by bank transfer u52r1',
        });
        const {payments} = await L.openPaymentTypes(page, app);

        await payments.showTab('Subscription Policies');
        fact('N1 Subscription Policies', marked(await L.readForm(payments.panel('Subscription Policies').locator('form').first())));

        await payments.showTab('Subscription Types');
        await payments.panel('Subscription Types').getByRole('link', {name: 'Create New Subscription Type', exact: true}).click();
        const dialog = page.getByRole('dialog');
        await dialog.locator('form input[name^="name"]').first().waitFor({timeout: L.T});
        await idle(page).catch(() => {});
        fact('N2 Create New Subscription Type', marked(await L.readForm(dialog.locator('form').first())));
        await page.keyboard.press('Escape');
        await dialog.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});

        const tab = await payments.showPaymentTypes();
        await L.typeFees(tab, {'Article Processing Charge': 'abc'});
        fact('N3 Save abc', await L.saveTypes(page, tab));
        await L.typeFees(tab, {'Article Processing Charge': 50});
        fact('N3 Save 50', await L.saveTypes(page, tab));
        fact('N3 form after', {
            note: (await L.readForm(tab.form())).note,
            boxes: await L.boxValues(tab),
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
