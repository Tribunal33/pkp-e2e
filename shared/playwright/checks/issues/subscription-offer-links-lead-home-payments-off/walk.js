// Issue report docs/issues/U51-A24-subscription-offer-links-lead-home-payments-off.md (U51 A24):
// while payments are not set up, the "Subscription" block's "Learn More" and "My Subscriptions"'
// "View Available Subscription Types" lead to the journal's home page, since the "Subscriptions"
// page they point to is closed then. OJS only, on PKP's default test dataset (a dataset fleet),
// journal `publicknowledge`, payments left as the dataset has them (not enabled). The kit builds
// nothing; every step is a screen or a typed address.
//
//   P1 rvaca: Settings › Distribution › "Access": the subscription mode, "Save"
//   P2 "Payments" (its address) › "Subscription Types": "Online Year" (Individual, 10 USD)
//   P3 Settings › Website › "Appearance" › "Setup": "Sidebar": "Subscription Block", "Save"
//   (signed out: the block on the home page, read)
//   1 ccorino   2 home page: the block, "Learn More"
//   3 "My Subscriptions" (its address)   4 "View Available Subscription Types"
//   Control: 5 rvaca: "Payments" tab set up ("Manual Payment Instructions" filled); ccorino: the block's "Learn More" opens
//   "Subscriptions", and "My Subscriptions" offers "Purchase New Subscription"
//
// Reset first: npm run fleet-prep -- --feature issues-sb6 --dataset 7 --reset
// Run (main):  PROBE_FEATURE=issues-sb6 PROBE_AGENT=sb6 node bin/probe.js ojs shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb6-3_5 PROBE_AGENT=sb6 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb6/a24-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
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
    const home = async () => {
        await page.goto(L.journalUrl(app, ''));
        await idle(page).catch(() => {});
        return L.readBlock(page);
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 access', () => L.chooseMode(page, app, 'subscription'));
        await step('P2 type', () => L.createType(page, app, {name: 'Online Year', cost: '10'}));
        await step('P3 sidebar', () => L.placeSubscriptionBlock(page, app));

        await signOut(page);
        await step('signed-out block', () => home());

        await signIn(page, READER);
        await step('2 block', async () => {
            const block = await home();
            record('a24-2-home', await screen(page));
            return block;
        });
        await step('2 learn more', async () => {
            const r = await L.follow(page, L.blockLink(page, 'Learn More'));
            record('a24-2-after-learn-more', await screen(page));
            return r;
        });
        await step('3 my subscriptions', async () => {
            const r = await L.openMySubscriptions(page, app);
            record('a24-3-my-subscriptions', await screen(page));
            return r;
        });
        await step('4 view types', () => L.follow(page, L.myPartLink(page, app, 'individual', 'View Available Subscription Types')));
        await step('4b subscriptions address', () => L.openSubscriptionsPage(page, app));

        // Neighbour: with payments set up the block's "Learn More" opens "Subscriptions".
        await signIn(page, MANAGER);
        await step('N1 payments', () => L.setUpPayments(page, app));
        await signIn(page, READER);
        await step('N2 block', () => home());
        await step('N2 learn more', () => L.follow(page, L.blockLink(page, 'Learn More')));
        await step('N3 my subscriptions', () => L.openMySubscriptions(page, app));
    } finally {
        record('a24-facts', facts);
        await close();
    }
});
