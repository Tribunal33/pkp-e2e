// Issue report docs/issues/U52-A9-membership-address-signed-out-blank-page.md (U52 A9): a signed-out
// visitor who types the journal's address followed by user/payMembership gets a blank error page.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`. The kit builds nothing.
//
//   1. signed out, type {journal}/user/payMembership
//      control: signed out, type {journal}/payment/pay/1 (the Login page)
//   2. sign in as dbarnes; Settings › Distribution › "Payments": "Enable", "US Dollar",
//      "Manual Fee Payment", instructions "Pay by cheque u52r3", "Save"
//   3. Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   4. signed out, type {journal}/user/purchaseSubscription/individual, …/institutional and
//      {journal}/user/payMembership
//   neighbour of the fix: sign in as dsokoloff and type the same three addresses (what a
//   signed-in user gets must not change)
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u52r3 PROBE_AGENT=u52r3 node bin/probe.js ojs shared/playwright/checks/issues/membership-address-signed-out-blank-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r3-3_5 PROBE_AGENT=u52r3 node bin/probe.js ojs shared/playwright/checks/issues/membership-address-signed-out-blank-page/walk.js
// Facts: .reports/<feature>/u52r3/member-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // only a journal has the address (OMP and OPS answer 404)
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {typeAddress} = require('../payment-link-blank-page-when-payments-off/lib');
    const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');
    const {requireSubscriptions} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signOut(page);
        fact('1 membership address, signed out', await typeAddress(page, app, 'user/payMembership'));
        record('member-1-signed-out', await screen(page));
        await shot(page, 'member-1-signed-out').catch(() => {});
        fact('1 server log', log.since());
        fact('control: a payment address, signed out', await typeAddress(page, app, 'payment/pay/1'));
        // 2, 3
        await signIn(page, 'dbarnes');
        fact('2 payments', await setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u52r3'}));
        fact('3 access', await requireSubscriptions(page, app));

        // 4
        await signOut(page);
        const ADDRESSES = ['user/purchaseSubscription/individual', 'user/purchaseSubscription/institutional', 'user/payMembership'];
        let n = log.since().length;
        for (const a of ADDRESSES) {
            fact(`4 signed out: ${a}`, await typeAddress(page, app, a));
            record(`member-4-${a.split('/').pop()}`, await screen(page));
        }
        fact('4 server log', log.since().slice(n));

        // the fix's neighbour
        await signIn(page, 'dsokoloff');
        n = log.since().length;
        for (const a of ADDRESSES) fact(`neighbour, signed in: ${a}`, await typeAddress(page, app, a));
        fact('neighbour server log', log.since().slice(n));
        await signOut(page);
    } finally {
        record('member-facts', facts);
        await close();
    }
});
