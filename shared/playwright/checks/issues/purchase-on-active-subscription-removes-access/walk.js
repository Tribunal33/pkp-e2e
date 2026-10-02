// Issue report docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md (U51 A10):
// a reader who presses "Purchase" beside an active subscription and saves the page loses the
// subscription at once, before paying. OJS only (subscriptions are a journal's), on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit
// builds nothing; every step is a screen.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 "Access": the subscription mode, "Save"
//   P3 "Payments" › "Subscription Types" › "Create New Subscription Type": "Online Year u51sb2",
//      10 USD, Online, 12 months, Individual
//   P4 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   P5 dsokoloff: "My Subscriptions" › "Purchase New Subscription" › the type › "Save"
//   P6 rvaca: "Payments" › "Individual Subscriptions" › the row › "Edit": "Active", end a year on
//   1 dsokoloff: "Signalling Theory Dividends" › "PDF"
//   2 "My Subscriptions"
//   neighbour: "Renew" (the payment page; the subscription stays as it was)
//   3 "Purchase"           4 "Save"           5 "My Subscriptions"
//   6 "Signalling Theory Dividends" › "PDF"   7 rvaca: the manager's row
//   neighbour of the fix: the purchase address of the subscription typed (step 3's address)
//
// Reset first: npm run fleet-prep -- --feature issues-sb2 --dataset 2 --reset
// Run (main):  PROBE_FEATURE=issues-sb2 PROBE_AGENT=sb2 node bin/probe.js ojs shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb2-3_5 PROBE_AGENT=sb2 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb2/a10-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const READER = 'dsokoloff';
const MANAGER = 'rvaca';
const TYPE = 'Online Year u51sb2';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLE = 1; // "Signalling Theory Dividends"

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, today: L.today()};
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
    const stored = () =>
        sql(app, "select subscription_id, user_id, status, coalesce(date_start::text,'-'), coalesce(date_end::text,'-') from subscriptions order by 1") ||
        'no row';
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 access', () => L.requireSubscriptions(page, app));
        await step('P3 type', () => L.createType(page, app, {name: TYPE, cost: '10'}));
        await step('P4 issue access', () => L.restrictIssue(page, ISSUE));

        await signIn(page, READER);
        await step('P5 purchase new', async () => {
            const went = await L.pressPurchaseNew(page, app, 'individual');
            const form = await L.readPurchasePage(page, app);
            await L.fillPurchasePage(page, app, {type: TYPE});
            return {went, form, saved: await L.submitPurchasePage(page, app)};
        });

        await signIn(page, MANAGER);
        await step('P6 activate', () => L.activate(page, app, 'Individual Subscriptions', 'Sokoloff'));
        fact('P6 stored', stored());

        await signIn(page, READER);
        await step('1 pdf before', () => L.pressGalley(page, app, ARTICLE));
        await step('2 my subscriptions', async () => {
            const r = await L.readMySubscriptions(page, app);
            record('a10-2-my-subscriptions', await screen(page));
            return r;
        });
        await step('neighbour renew', async () => {
            const pressed = await L.pressRowButton(page, app, 'individual', 'Renew');
            const landed = await L.readLanding(page);
            return {pressed, landed, after: await L.readMySubscriptions(page, app), stored: stored()};
        });
        let purchaseHref = null;
        await step('3 purchase', async () => {
            const pressed = await L.pressRowButton(page, app, 'individual', 'Purchase');
            purchaseHref = pressed.href || null;
            const form = pressed.pressed ? await L.readPurchasePage(page, app) : null;
            record('a10-3-purchase-page', await screen(page));
            await shot(page, 'a10-3-purchase-page').catch(() => {});
            return {pressed, form};
        });
        if (purchaseHref) {
            await step('4 save', async () => {
                const r = await L.submitPurchasePage(page, app);
                record('a10-4-after-save', await screen(page));
                return r;
            });
        } else {
            fact('4 save', 'no "Purchase" button, so nothing to save');
        }
        await step('5 my subscriptions', async () => {
            const r = await L.readMySubscriptions(page, app);
            record('a10-5-my-subscriptions', await screen(page));
            await shot(page, 'a10-5-my-subscriptions').catch(() => {});
            return r;
        });
        await step('6 pdf after', () => L.pressGalley(page, app, ARTICLE));
        await step('neighbour typed purchase address', async () => {
            const id = sql(app, `select s.subscription_id from subscriptions s join users u on u.user_id=s.user_id where u.username='${READER}'`);
            await page.goto(L.journalUrl(app, `user/purchaseSubscription/individual/${id}`));
            return {
                typed: `user/purchaseSubscription/individual/${id}`,
                ...(await L.readLanding(page)),
                form: (await page.locator('form#subscriptionForm').count()) > 0,
            };
        });

        await signIn(page, MANAGER);
        await step('7 manager row', () => L.managerRow(page, app, 'Individual Subscriptions', 'Sokoloff'));
        record('a10-7-manager-list', await screen(page));
        fact('7 stored', stored());
        fact('server log', log.since());
        await signOut(page);
    } finally {
        record('a10-facts', facts);
        await close();
    }
});
