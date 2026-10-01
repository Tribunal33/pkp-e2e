// Issue report docs/issues/U52-A3-A9-payment-link-blank-page-when-payments-off.md (U52 A3, A9):
// a payment page asked for while the journal takes no payments gives a blank error page (no method
// set up) or opens as before ("Enable" unticked). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`, submission 7.
// The kit builds nothing.
//
//   1. sign in as dsokoloff; type {journal}/user/payMembership (payments never set up)
//   2. sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar",
//      "Manual Fee Payment", instructions "Pay by cheque u52r3", "Save"
//   3. "Payments" › "Payment Types": "Article Processing Charge" 50, "Save"
//   4. submission 7: "Accept Submission", "Request publication fee (50 USD)", "Record Decision"
//   5. sign in as dsokoloff; "Tasks": the publication-fee task (the control, and the fix's
//      neighbour: a journal that takes payments still shows the payment page); then the address
//      of a request that does not exist, payment/pay/999999 (the fix's second neighbour)
//   6. sign in as dbarnes; "Payments": the instructions emptied, "Save"
//   7. sign in as dsokoloff; the task again
//   8. sign in as dbarnes; "Payments": the instructions typed again, "Save"; "Enable" unticked, "Save"
//   9. sign in as dsokoloff; the task again; "Send notification of payment"
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u52r3 PROBE_AGENT=u52r3 node bin/probe.js ojs shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r3-3_5 PROBE_AGENT=u52r3 node bin/probe.js ojs shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/walk.js
// Facts: .reports/<feature>/u52r3/pay-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');

const SUBMISSION = 7;
const AUTHOR = 'dsokoloff';
const INSTRUCTIONS = 'Pay by cheque u52r3';
const FEE = 50;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // only a journal has these pages (OMP and OPS answer 404)
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');
    const {typeAddress, setApc, acceptRequestingFee, pressFeeTask, mailFacts, mailCount, changePayments, navigate, sleep} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const log = serverLog(app);
    const stored = () => ({
        journal: sql(app, "SELECT setting_name, setting_value FROM journal_settings WHERE setting_name IN ('paymentsEnabled','currency','paymentPluginName','publicationFee','membershipFee','contactEmail') ORDER BY 1"),
        plugin: sql(app, "SELECT setting_name, setting_value FROM plugin_settings WHERE plugin_name ILIKE 'manualpayment%' ORDER BY 1"),
        queued: sql(app, 'SELECT count(*) FROM queued_payments'),
    });
    const contact = sql(app, "SELECT setting_value FROM journal_settings WHERE setting_name = 'contactEmail' LIMIT 1");
    const authorMail = `${AUTHOR}@mailinator.com`;

    const {page, close} = await launch(app);
    try {
        // 1
        fact('0 stored', stored());
        await signIn(page, AUTHOR);
        fact('1 membership address, payments never set up', await typeAddress(page, app, 'user/payMembership'));
        record('pay-1-membership', await screen(page));
        await shot(page, 'pay-1-membership').catch(() => {});
        fact('1 server log', log.since());
        fact('1 stored', stored());

        // 2 to 4
        await signIn(page, 'dbarnes');
        fact('2 payments', await setUpPayments(page, app, {currency: 'USD', instructions: INSTRUCTIONS}));
        fact('3 payment types', await setApc(page, app, FEE));
        fact('4 accept', await acceptRequestingFee(page, app, SUBMISSION, `Request publication fee (${FEE} USD)`));
        await sleep(3000);
        const request = await mailFacts(app, authorMail, 'Payment Request Notification');
        const emailLink = request && request.links.find((l) => /payment\/pay\/\d+/.test(l));
        fact('4 email to the author', request && {subject: request.subject, to: request.to, text: request.text, payLink: emailLink});
        fact('4 stored', stored());

        // 5
        await signIn(page, AUTHOR);
        fact('5 task, payments set up', await pressFeeTask(page, app, {emailLink}));
        record('pay-5-control', await screen(page));
        fact('5 a request that does not exist', await typeAddress(page, app, 'payment/pay/999999'));

        // 6, 7
        await signIn(page, 'dbarnes');
        fact('6 instructions emptied', await changePayments(page, app, {instructions: ''}));
        fact('6 stored', stored());
        await signIn(page, AUTHOR);
        const before7 = log.since().length;
        fact('7 task, instructions emptied', await pressFeeTask(page, app, {emailLink}));
        record('pay-7-instructions-emptied', await screen(page));
        await shot(page, 'pay-7-instructions-emptied').catch(() => {});
        fact('7 server log', log.since().slice(before7));

        // 8, 9
        await signIn(page, 'dbarnes');
        fact('8 instructions back, "Enable" unticked', await changePayments(page, app, {instructions: INSTRUCTIONS, enable: false}));
        fact('8 stored', stored());
        await signIn(page, AUTHOR);
        fact('9 task, "Enable" unticked', await pressFeeTask(page, app, {emailLink}));
        record('pay-9-enable-unticked', await screen(page));
        await shot(page, 'pay-9-enable-unticked').catch(() => {});
        const notify = page.getByRole('link', {name: 'Send notification of payment', exact: true});
        const mailBefore = await mailCount(app, contact, 'Manual Payment Notification');
        if (await notify.isVisible().catch(() => false)) {
            fact('9 "Send notification of payment"', await navigate(page, () => notify.click()));
            record('pay-9-notified', await screen(page));
            await sleep(5000);
        } else fact('9 "Send notification of payment"', 'not offered');
        fact('9 "Manual Payment Notification" emails to the principal contact', {contact, before: mailBefore, after: await mailCount(app, contact, 'Manual Payment Notification')});
        await signOut(page);
        fact('server log', log.since());
    } finally {
        record('pay-facts', facts);
        await close();
    }
});
