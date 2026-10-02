// Neighbour of the fix in docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md:
// "Purchase" beside an active subscription whose end date has passed ("Expired: …") must stay, since
// it is an individual reader's only way to buy another type, and saving it loses nothing. OJS only,
// on PKP's default test dataset (a dataset fleet), journal `publicknowledge`. Every step is a screen.
//
//   P1–P3, P5 as walk.js (payments, subscriptions, the "Online Year" type, the reader's purchase)
//   P6 rvaca: "Payments" › "Individual Subscriptions" › the row › "Edit": "Active", start a year
//      ago, end yesterday, "Save"
//   1 dsokoloff: "My Subscriptions" (the row reads "Expired: {yesterday}")
//   2 "Purchase"     3 "Save"     4 "My Subscriptions"     5 rvaca: the manager's row
//
// Reset first, then: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs <this file>
const {forEachApp, launch, signIn, signOut, screen, record, sql} = require('../../../probe');
const L = require('./lib');

const READER = 'dsokoloff';
const MANAGER = 'rvaca';
const TYPE = 'Online Year u51sb2';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour-expired.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, today: L.today()};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: L.flat(e.message, 500)});
        }
    };
    const stored = () =>
        sql(app, "select subscription_id, status, coalesce(date_start::text,'-'), coalesce(date_end::text,'-') from subscriptions order by 1") || 'no row';
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 access', () => L.requireSubscriptions(page, app));
        await step('P3 type', () => L.createType(page, app, {name: TYPE, cost: '10'}));
        await signIn(page, READER);
        await step('P5 purchase new', async () => {
            await L.pressPurchaseNew(page, app, 'individual');
            await L.fillPurchasePage(page, app, {type: TYPE});
            return L.submitPurchasePage(page, app);
        });
        await signIn(page, MANAGER);
        await step('P6 active, ended yesterday', () =>
            L.activate(page, app, 'Individual Subscriptions', 'Sokoloff', {start: L.daysOn(-365), end: L.daysOn(-1)}),
        );
        fact('P6 stored', stored());

        await signIn(page, READER);
        await step('1 my subscriptions', () => L.readMySubscriptions(page, app));
        await step('2 purchase', async () => {
            const pressed = await L.pressRowButton(page, app, 'individual', 'Purchase');
            return {pressed, form: pressed.pressed ? await L.readPurchasePage(page, app) : null};
        });
        await step('3 save', async () => {
            if ((await page.locator('form#subscriptionForm').count()) === 0) return 'no purchase page';
            const r = await L.submitPurchasePage(page, app);
            record('a10-expired-3-after-save', await screen(page));
            return r;
        });
        await step('4 my subscriptions', () => L.readMySubscriptions(page, app));
        fact('4 stored', stored());
        await signIn(page, MANAGER);
        await step('5 manager row', () => L.managerRow(page, app, 'Individual Subscriptions', 'Sokoloff'));
        fact('server log', log.since());
        await signOut(page);
    } finally {
        record('a10-expired-facts', facts);
        await close();
    }
});
