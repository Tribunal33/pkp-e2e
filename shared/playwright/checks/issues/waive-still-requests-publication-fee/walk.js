// Issue report docs/issues/U34-OJS1-waive-still-requests-publication-fee.md (U34 OJS1): on a journal
// charging a publication fee, "Waive" on the "Request Payment" page of "Accept and Skip Review" or
// "Accept Submission" still requests the fee: the Author gets the task "The publication fee is due for
// payment." and the "Payment Request Notification" email. Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit builds nothing.
//
//   setup  dbarnes: Settings › Distribution › "Payments": "Enable", "US Dollar", "Manual Fee Payment",
//          instructions, "Save"; "Payments" › "Payment Types": "Article Processing Charge" 50, "Save"
//   1-2    submission 4: "Accept and Skip Review", "Waive", "Continue" ×2, "Record Decision"
//   3-4    submission 7: "Accept Submission", "Waive", "Continue" to the end, "Record Decision"
//   5-6    cmontgomerie (4) and dsokoloff (7): "Tasks"; their mailboxes
//   7      dbarnes: submission 4's "Payments" menu
//   8-9    the control (argument `neighbour`, runs alone; the fix's neighbour): submission 8, "Accept and
//          Skip Review" with "Request publication fee (50 USD)" kept: eostrom's task and email, "Unpaid"
//   existing (argument `existing`, runs alone; the fix's guard): a fee recorded before acceptance.
//          dbarnes records "Paid" on submission 11; dbuskins (Section Editor) records "Waived" on
//          submission 14; dbarnes then takes "Accept and Skip Review" with "Waive" on both; the
//          "Payments" menus and the journal's "Payments" list, and the stored fee records (read only)
//
// Reset first:  npm run fleet-prep -- --feature issues-u34c --dataset 3 --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u34c PROBE_AGENT=u34c node bin/probe.js ojs shared/playwright/checks/issues/waive-still-requests-publication-fee/walk.js [neighbour|existing]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u34c-3_5 --dataset 3 --apps ojs --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u34c-3_5 PROBE_AGENT=u34c node bin/probe.js ojs shared/playwright/checks/issues/waive-still-requests-publication-fee/walk.js
// Facts: .reports/<feature>/u34c/ojs1-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record, serverLog} = require('../../../probe');

const NEIGHBOUR = process.argv.slice(2).includes('neighbour');
const EXISTING = process.argv.slice(2).includes('existing');
const PAID_FIRST = {id: 11, author: 'kalkhafaji'};
const WAIVED_FIRST = {id: 14, author: 'pdaniel'};
const SKIP = {id: 4, author: 'cmontgomerie', title: 'Computer Skill Requirements for New and Existing Teachers'};
const ACCEPT = {id: 7, author: 'dsokoloff', title: 'Developing efficacy beliefs in the classroom'};
const REQUEST = {id: 8, author: 'eostrom', title: 'Traditions and Trends in the Study of the Commons'};
const SKIP_DECISION = {button: 'Accept and Skip Review', title: 'Skipped Review'};
const ACCEPT_DECISION = {button: 'Accept Submission', title: 'Submission Accepted'};
const SKIP_SUBJECT = 'Your submission has been sent for copyediting';
const ACCEPT_SUBJECT = 'Your submission has been accepted to';
const mailOf = (u) => `${u}@mailinator.com`;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the publication fee exists only on a journal
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const L = require('./lib');
    const facts = {app: app.name, line: app.line || 'main', mode: EXISTING ? 'existing' : NEIGHBOUR ? 'neighbour' : 'walk'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[fact] ${name}: ${JSON.stringify(facts[name]).slice(0, 2500)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const since = new Date(Date.now() - 2000);
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');
        await step('setup payments', () => L.setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by bank transfer.'}));
        await step('setup apc', () => L.setApc(page, app, 50));
        await step('setup plugin choices', () => L.pluginChoices(page, app));
        if (EXISTING) {
            await step('ex paid first (11)', () => L.recordFee(page, app, PAID_FIRST.id, 'Paid'));
            await signIn(page, 'dbuskins');
            await step('ex waived first by section editor (14)', () => L.recordFee(page, app, WAIVED_FIRST.id, 'Waived'));
            await signIn(page, 'dbarnes');
            await step('ex stored before', () => L.stored(app));
            await step('ex waive on Accept and Skip Review (11)', () => L.decideWithPayment(page, app, PAID_FIRST.id, {...SKIP_DECISION, choice: 'Waive'}));
            await step('ex waive on Accept and Skip Review (14)', () => L.decideWithPayment(page, app, WAIVED_FIRST.id, {...SKIP_DECISION, choice: 'Waive'}));
            await step('ex payments menu (11)', () => L.paymentsMenu(page, app, PAID_FIRST.id));
            await step('ex payments menu (14)', () => L.paymentsMenu(page, app, WAIVED_FIRST.id));
            await step('ex payments list', () => L.paymentsList(page, app));
            await step('ex stored after', () => L.stored(app));
        } else if (!NEIGHBOUR) {
            await step('1-2 waive on Accept and Skip Review (4)', () => L.decideWithPayment(page, app, SKIP.id, {...SKIP_DECISION, choice: 'Waive'}));
            await step('3-4 waive on Accept Submission (7)', () => L.decideWithPayment(page, app, ACCEPT.id, {...ACCEPT_DECISION, choice: 'Waive'}));
            await step('7 payments menu (4)', () => L.paymentsMenu(page, app, SKIP.id));
            await step('7 payments menu (7)', () => L.paymentsMenu(page, app, ACCEPT.id));
            await step('6 mail cmontgomerie', () => L.authorMail(app, mailOf(SKIP.author), since, SKIP_SUBJECT));
            await step('6 mail dsokoloff', () => L.authorMail(app, mailOf(ACCEPT.author), since, ACCEPT_SUBJECT));
            await signIn(page, SKIP.author);
            await step('5 tasks cmontgomerie (4)', () => L.authorTask(page, app, SKIP.title, 'skip-author'));
            await signIn(page, ACCEPT.author);
            await step('5 tasks dsokoloff (7)', () => L.authorTask(page, app, ACCEPT.title, 'accept-author'));
        } else {
            await step('nb request on Accept and Skip Review (8)', () => L.decideWithPayment(page, app, REQUEST.id, {...SKIP_DECISION, choice: 'Request publication fee'}));
            await step('nb payments menu (8)', () => L.paymentsMenu(page, app, REQUEST.id));
            await step('nb mail eostrom', () => L.authorMail(app, mailOf(REQUEST.author), since, SKIP_SUBJECT));
            await signIn(page, REQUEST.author);
            await step('nb tasks eostrom (8)', () => L.authorTask(page, app, REQUEST.title, 'request-author'));
        }
        facts.serverErrors = log.since(from);
    } finally {
        record(EXISTING ? 'ojs1-ex-facts' : NEIGHBOUR ? 'ojs1-nb-facts' : 'ojs1-facts', facts);
        await close();
    }
});
