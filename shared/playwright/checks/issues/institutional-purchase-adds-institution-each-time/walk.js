// Issue report docs/issues/U51-A11-institutional-purchase-adds-institution-each-time.md (U51 A11):
// every "Continue" on "Purchase Institutional Subscription" adds a new institution, even when the
// journal already has one of that name with those IP ranges. OJS only, on PKP's default test
// dataset (a dataset fleet), journal `publicknowledge`. Every step is a screen.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 "Access": the subscription mode, "Save"
//   P3 "Payments" › "Subscription Types" › "Create New Subscription Type": "Campus Year u51sb2",
//      100 USD, Online, 12 months, Institutional
//   1 dsokoloff: "My Subscriptions" › "Institutional Subscriptions" › "Purchase New Subscription":
//     "Tide University u51sb2", "192.0.2.0/24", "Continue"
//   2 again: the same name and range, "Continue"
//   3 rvaca: Settings › "Institutions"
//   neighbour: dsokoloff buys for "Harbour College u51sb2", "198.51.100.0/24" (a new
//   institution must still be added), then rvaca's Institutions again
//
// Reset first: npm run fleet-prep -- --feature issues-sb2 --dataset 2 --reset
// Run (main):  PROBE_FEATURE=issues-sb2 PROBE_AGENT=sb2 node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-adds-institution-each-time/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb2-3_5 PROBE_AGENT=sb2 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb2/a11-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('../purchase-on-active-subscription-removes-access/lib');

const READER = 'dsokoloff';
const MANAGER = 'rvaca';
const TYPE = 'Campus Year u51sb2';
const FIRST = {institutionName: 'Tide University u51sb2', ipRanges: '192.0.2.0/24'};
const OTHER = {institutionName: 'Harbour College u51sb2', ipRanges: '198.51.100.0/24'};

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
        institutional: sql(app, 'select subscription_id, institution_id from institutional_subscriptions order by 1') || 'no row',
        institutions:
            sql(
                app,
                "select i.institution_id, coalesce(s.setting_value,''), coalesce(i.deleted_at::text,'') from institutions i left join institution_settings s on s.institution_id=i.institution_id and s.setting_name='name' order by 1",
            ) || 'no row',
        ranges: sql(app, 'select institution_id, ip_string from institution_ip order by 1, 2') || 'no row',
    });
    const buy = async (data) => {
        const went = await L.pressPurchaseNew(page, app, 'institutional');
        await L.fillPurchasePage(page, app, {type: TYPE, ...data});
        return {went, saved: await L.submitPurchasePage(page, app)};
    };
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 access', () => L.requireSubscriptions(page, app));
        await step('P3 type', () => L.createType(page, app, {name: TYPE, cost: '100', institutional: true}));
        fact('P stored', stored());

        await signIn(page, READER);
        await step('1 first purchase', () => buy(FIRST));
        await step('2 second purchase, same name and range', () => buy(FIRST));
        await step('2 my subscriptions', async () => {
            const r = await L.readMySubscriptions(page, app);
            record('a11-2-my-subscriptions', await screen(page));
            return r;
        });

        await signIn(page, MANAGER);
        await step('3 institutions', async () => {
            const r = await L.institutionNames(page, app);
            record('a11-3-institutions', await screen(page));
            await shot(page, 'a11-3-institutions').catch(() => {});
            return r;
        });
        fact('3 stored', stored());

        await signIn(page, READER);
        await step('neighbour purchase, another name', () => buy(OTHER));
        await signIn(page, MANAGER);
        await step('neighbour institutions', () => L.institutionNames(page, app));
        fact('neighbour stored', stored());
        fact('server log', log.since());
        await signOut(page);
    } finally {
        record('a11-facts', facts);
        await close();
    }
});
