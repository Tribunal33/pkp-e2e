// Issue report docs/issues/U52-A4-payment-types-required-note-no-required-field.md (U52 A4) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//
//   1    sign in as dbarnes
//   2    Settings › Distribution › "Payments": "Enable", "US Dollar", "Manual Fee Payment",
//        "Pay by bank transfer u52r1" as the instructions, "Save"
//   3    reload, side menu "Payments", the "Payment Types" tab: the line under "Save", the labels
//   4    every box left empty, "Save"
//   C    control: the "Subscription Policies" tab of the same page (the same line, with marked fields)
//
// The kit builds nothing. Helpers: ../payment-types-promise-fees-on-about/lib.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u52r1 PROBE_AGENT=u52r1 node bin/probe.js ojs shared/playwright/checks/issues/payment-types-required-note-no-required-field/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/payment-types-required-note-no-required-field/fix.diff ojs
//               (reset, walk.js, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r1-3_5 PROBE_AGENT=u52r1 node bin/probe.js ojs shared/playwright/checks/issues/payment-types-required-note-no-required-field/walk.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('../payment-types-promise-fees-on-about/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the "Payment Types" tab is a journal's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {
        app: app.name,
        line: app.line || 'main',
        dataset: app.dataset,
    };
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        fact(
            '2 payments set up',
            await L.setUpPayments(page, app, {
                currency: 'USD',
                instructions: 'Pay by bank transfer u52r1',
            })
        );

        // 3
        const {payments, tab} = await L.openPaymentTypes(page, app);
        const form = await L.readForm(tab.form());
        fact('3 note', form.note);
        fact('3 buttons', form.buttons);
        fact('3 fields', form.fields);
        fact('3 asterisks', {
            onFields: form.asterisksOnFields,
            inFormText: form.asterisksInFormText,
        });
        record('3-payment-types', await screen(page));

        // 4
        fact('4 boxes before Save', await L.boxValues(tab));
        fact('4 Save', await L.saveTypes(page, tab));
        record('4-saved-empty', await screen(page));

        // C
        await payments.showTab('Subscription Policies');
        const policies = await L.readForm(payments.panel('Subscription Policies').locator('form').first());
        fact('C Subscription Policies', {
            note: policies.note,
            asterisksOnFields: policies.asterisksOnFields,
            required: policies.fields.filter((f) => f.required).map((f) => f.label || f.name),
        });
        record('C-subscription-policies', await screen(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
