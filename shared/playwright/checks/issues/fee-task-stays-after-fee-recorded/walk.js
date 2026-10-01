// Issue report docs/issues/U52-A2-fee-task-stays-after-fee-recorded.md (U52 A2): after an editor records
// the article processing charge as "Paid" or "Waived", the Author's task "The publication fee is due for
// payment." stays and still opens the payment page. Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit builds nothing.
//
//   setup  sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar", "Manual Fee
//          Payment", instructions "Pay by bank transfer (u52r2).", "Save"; "Payments" › "Payment Types":
//          "Article Processing Charge" 50, "Save"
//   1-2    submissions 4, 8 and 11: "Accept and Skip Review" with "Request publication fee (50 USD)"
//   3-4    submission 4: "Payments" › "Paid" › "Save"; submission 8: "Waived" › "Save"; 11 stays "Unpaid"
//   5-7    as cmontgomerie (4): "Tasks", the fee task, "Send notification of payment"
//   8      as eostrom (8): "Tasks", the fee task
//   control / the fix's neighbour: as kalkhafaji (11, still "Unpaid"): "Tasks" keeps the fee task, which
//          opens the payment page, with fix.diff in and out
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u52r2 PROBE_AGENT=u52r2 node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r2-3_5 PROBE_AGENT=u52r2 node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js
// Facts: .reports/<feature>/u52r2/a2-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');

const PAID = {id: 4, author: 'cmontgomerie', title: 'Computer Skill Requirements for New and Existing Teachers'};
const WAIVED = {id: 8, author: 'eostrom', title: 'Traditions and Trends in the Study of the Commons'};
const UNPAID = {id: 11, author: 'kalkhafaji', title: 'Learning Sustainable Design through Service'};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the article processing charge exists only on a journal
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const L = require('./lib');
    const facts = {app: app.name, line: app.line || 'main'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[fact] ${name}: ${JSON.stringify(facts[name]).slice(0, 2500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');
        await step('setup payments', () => L.setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by bank transfer (u52r2).'}));
        await step('setup apc', () => L.setApc(page, app, 50));
        for (const s of [PAID, WAIVED, UNPAID]) await step(`1 request ${s.id}`, () => L.acceptRequestingFee(page, app, s.id));
        await step('2 stored after the requests', () => L.stored(app));
        await step('3 paid 4', () => L.recordFee(page, app, PAID.id, 'Paid'));
        await step('4 waived 8', () => L.recordFee(page, app, WAIVED.id, 'Waived'));
        await step('4 payments list', () => L.paymentsList(page, app));
        await step('4 stored after the records', () => L.stored(app));

        await signIn(page, PAID.author);
        await step('5-7 author of 4 (Paid)', () => L.authorTask(page, app, PAID.title, 'paid-author', {notify: true}));
        await signIn(page, WAIVED.author);
        await step('8 author of 8 (Waived)', () => L.authorTask(page, app, WAIVED.title, 'waived-author'));
        await signIn(page, UNPAID.author);
        await step('control author of 11 (Unpaid)', () => L.authorTask(page, app, UNPAID.title, 'unpaid-author'));
        await step('end stored', () => L.stored(app));
    } finally {
        record('a2-facts', facts);
        await close();
    }
});
