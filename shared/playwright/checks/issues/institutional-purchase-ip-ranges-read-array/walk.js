// Issue report docs/issues/U51-A25-institutional-purchase-ip-ranges-read-array.md (U51 A25):
// "Purchase" beside an active institutional subscription opens "Purchase Institutional
// Subscription" with "IP ranges" reading "Array", which "Continue" refuses. OJS only, on PKP's
// default test dataset (a dataset fleet), journal `publicknowledge`. Every step is a screen.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 "Access": the subscription mode, "Save"
//   P3 "Payments" › "Subscription Types" › "Create New Subscription Type": "Campus Year u51sb2",
//      100 USD, Online, 12 months, Institutional
//   P4 dsokoloff: "My Subscriptions" › "Institutional Subscriptions" › "Purchase New Subscription":
//      "Tide University u51sb2", IP ranges "192.0.2.0/24", "Continue"
//   P5 rvaca: "Payments" › "Institutional Subscriptions" › the row › "Edit": "Active", end a year on
//   1 dsokoloff: "My Subscriptions"     2 "Purchase"     3 the page as it arrives
//   4 "Continue" as it arrived           5 "192.0.2.0/24" typed again, "Continue"
//   6 rvaca: "Institutions" (what step 5 left) and "Payments" › "Institutional Subscriptions"
//   neighbour: "Purchase New Subscription" (no subscription in the address) arrives empty
//
// Reset first: npm run fleet-prep -- --feature issues-sb2 --dataset 2 --reset
// Run (main):  PROBE_FEATURE=issues-sb2 PROBE_AGENT=sb2 node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb2-3_5 PROBE_AGENT=sb2 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb2/a25-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('../purchase-on-active-subscription-removes-access/lib');

const READER = 'dsokoloff';
const MANAGER = 'rvaca';
const TYPE = 'Campus Year u51sb2';
const INSTITUTION = 'Tide University u51sb2';
const RANGES = '192.0.2.0/24';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
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
    const stored = () => ({
        subscriptions:
            sql(app, "select subscription_id, status, coalesce(date_start::text,'-'), coalesce(date_end::text,'-') from subscriptions order by 1") || 'no row',
        institutional: sql(app, "select subscription_id, institution_id, coalesce(domain,'') from institutional_subscriptions order by 1") || 'no row',
        ranges: sql(app, 'select institution_id, ip_string from institution_ip order by 1, 2') || 'no row',
    });
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 access', () => L.requireSubscriptions(page, app));
        await step('P3 type', () => L.createType(page, app, {name: TYPE, cost: '100', institutional: true}));

        await signIn(page, READER);
        await step('P4 purchase new', async () => {
            const went = await L.pressPurchaseNew(page, app, 'institutional');
            const form = await L.readPurchasePage(page, app);
            await L.fillPurchasePage(page, app, {type: TYPE, institutionName: INSTITUTION, ipRanges: RANGES});
            return {went, form, saved: await L.submitPurchasePage(page, app)};
        });

        await signIn(page, MANAGER);
        await step('P5 activate', () => L.activate(page, app, 'Institutional Subscriptions', INSTITUTION));
        fact('P5 stored', stored());

        await signIn(page, READER);
        await step('1 my subscriptions', () => L.readMySubscriptions(page, app));
        await step('2 purchase', () => L.pressRowButton(page, app, 'institutional', 'Purchase'));
        await step('3 as it arrives', async () => {
            const r = await L.readPurchasePage(page, app);
            record('a25-3-purchase-page', await screen(page));
            await shot(page, 'a25-3-purchase-page').catch(() => {});
            return r;
        });
        await step('4 continue as it arrived', async () => {
            if ((await page.locator('form#subscriptionForm').count()) === 0) return 'no purchase page';
            const r = await L.submitPurchasePage(page, app);
            record('a25-4-after-continue', await screen(page));
            await shot(page, 'a25-4-after-continue').catch(() => {});
            return {...r, form: await L.readPurchasePage(page, app).catch(() => null)};
        });
        await step('5 ranges typed again, continue', async () => {
            if ((await page.locator('form#subscriptionForm').count()) === 0) return 'no purchase page (step 4 went on)';
            await L.fillPurchasePage(page, app, {ipRanges: RANGES});
            return L.submitPurchasePage(page, app);
        });
        fact('5 stored', stored());
        await step('5 my subscriptions', () => L.readMySubscriptions(page, app));
        await step('neighbour purchase new', async () => {
            await page.goto(L.journalUrl(app, 'user/purchaseSubscription/institutional'));
            return L.readPurchasePage(page, app);
        });

        await signIn(page, MANAGER);
        await step('6 institutions', () => L.institutionNames(page, app));
        await step('6 manager row', () => L.managerRow(page, app, 'Institutional Subscriptions', INSTITUTION));
        fact('server log', log.since());
        await signOut(page);
    } finally {
        record('a25-facts', facts);
        await close();
    }
});
