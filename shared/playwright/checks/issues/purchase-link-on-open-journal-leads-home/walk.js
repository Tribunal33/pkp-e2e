// Issue report docs/issues/U51-A23-purchase-link-on-open-journal-leads-home.md (U51 A23):
// on a journal that does not require subscriptions, the "Subscriptions" page offers a signed-in
// reader "Purchase New Subscription", which leads to the journal's home page. OJS only, on PKP's
// default test dataset (a dataset fleet), journal `publicknowledge`, left open access as the
// dataset has it. The kit builds nothing; every step is a screen or a typed address.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 "Payments" › "Subscription Types": "Online Year" (Individual, 10 USD) and
//      "Campus Year" (Institutional, 100 USD)
//   1 ccorino   2 "Subscriptions" (its address)   3 "Purchase New Subscription" (Individual)
//   4 "Subscriptions" again, "Purchase New Subscription" (Institutional)
//   Not online: 5 rvaca: "Access": "OJS will not be used to publish…"   6 ccorino: 2 to 4 again
//   Control: 7 rvaca: "Access": the subscription mode   8 ccorino: 2 and 3: the purchase page opens
//
// Reset first: npm run fleet-prep -- --feature issues-sb6 --dataset 7 --reset
// Run (main):  PROBE_FEATURE=issues-sb6 PROBE_AGENT=sb6 node bin/probe.js ojs shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb6-3_5 PROBE_AGENT=sb6 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb6/a23-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('../individual-purchase-refusal-says-nothing/lib');

const READER = 'ccorino';
const MANAGER = 'rvaca';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {
        app: app.name,
        line: app.line || 'main',
        run: process.env.PROBE_RUN || null,
    };
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: L.flat(e.message, 500)});
        }
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 individual type', () => L.createType(page, app, {name: 'Online Year', cost: '10'}));
        await step('P2 institutional type', () =>
            L.createType(page, app, {
                name: 'Campus Year',
                cost: '100',
                institutional: true,
            })
        );

        await signIn(page, READER);
        await step('2 subscriptions page', async () => {
            const r = await L.openSubscriptionsPage(page, app);
            record('a23-2-subscriptions', await screen(page));
            return r;
        });
        await step('3 purchase individual', async () => {
            const r = await L.pressSubscriptionsPurchase(page, app, 0);
            record('a23-3-after-press', await screen(page));
            return r;
        });
        await step('4 purchase institutional', async () => {
            await L.openSubscriptionsPage(page, app);
            return L.pressSubscriptionsPurchase(page, app, 1);
        });

        await signIn(page, MANAGER);
        await step('5 not online', () => L.chooseMode(page, app, 'none'));
        await signIn(page, READER);
        await step('6 subscriptions page not online', () => L.openSubscriptionsPage(page, app));
        await step('6 purchase individual not online', () => L.pressSubscriptionsPurchase(page, app, 0));
        await step('6 purchase institutional not online', async () => {
            await L.openSubscriptionsPage(page, app);
            return L.pressSubscriptionsPurchase(page, app, 1);
        });

        // Neighbour: on a journal that requires subscriptions the same link opens the purchase page.
        await signIn(page, MANAGER);
        await step('N1 subscription mode', () => L.chooseMode(page, app, 'subscription'));
        await signIn(page, READER);
        await step('N2 subscriptions page', () => L.openSubscriptionsPage(page, app));
        await step('N3 purchase individual', async () => {
            const r = await L.pressSubscriptionsPurchase(page, app, 0);
            return {...r, purchase: await L.readPurchasePage(page, app)};
        });
    } finally {
        record('a23-facts', facts);
        await close();
    }
});
