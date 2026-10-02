// Issue report docs/issues/U51-A9-individual-purchase-refusal-says-nothing.md (U51 A9):
// "Purchase Individual Subscription" refuses a missing membership by showing the page again with
// nothing said. OJS only (subscriptions are a journal's), on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit builds nothing; every
// step is a screen or a typed address.
//
//   P1 rvaca: Settings › Distribution › "Access": the subscription mode, "Save"
//   P2 "Payments" tab: Enable, US Dollar, Manual Fee Payment, instructions, "Save"
//   P3 "Payments" › "Subscription Types" › "Create New Subscription Type": "Member Year",
//      7 USD, Online, 12, Individual, "Subscriptions require membership information…" ticked
//   P4 the same window: "Campus Year", 100 USD, Online, 12, Institutional
//   1 ccorino   2 "My Subscriptions" (its address)   3 "Purchase New Subscription"
//   4 the type, "Membership" empty, "Save"           5 "ACME", "Save"
//   6 (control) "My Subscriptions" › "Purchase New Subscription" under "Institutional Subscriptions",
//     "Continue" with every box empty: the refusal shows at the top
//
// Reset first: npm run fleet-prep -- --feature issues-sb6 --dataset 7 --reset
// Run (main):  PROBE_FEATURE=issues-sb6 PROBE_AGENT=sb6 node bin/probe.js ojs shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb6-3_5 PROBE_AGENT=sb6 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb6/a9-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const L = require('./lib');

const READER = 'ccorino';
const MANAGER = 'rvaca';
const TYPE = 'Member Year';

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
    const stored = () => sql(app, "select subscription_id, user_id, type_id, status, coalesce(membership,'-') from subscriptions order by 1") || 'no row';

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 access', () => L.chooseMode(page, app, 'subscription'));
        await step('P2 payments', () => L.setUpPayments(page, app));
        await step('P3 type', () => L.createType(page, app, {name: TYPE, cost: '7', membership: true}));
        await step('P4 institutional type', () => L.createType(page, app, {name: 'Campus Year', cost: '100', institutional: true}));

        await signIn(page, READER);
        await step('2 my subscriptions', () => L.openMySubscriptions(page, app));
        await step('3 purchase new', async () => {
            const went = await L.follow(page, L.myPartLink(page, app, 'individual', 'Purchase New Subscription'));
            record('a9-3-purchase-page', await screen(page));
            return {went, page: await L.readPurchasePage(page, app)};
        });
        await step('4 save without membership', async () => {
            const r = await L.submitIndividualPurchase(page, app, {
                type: TYPE,
                membership: '',
            });
            record('a9-4-after-save', await screen(page));
            return r;
        });
        fact('4 stored', stored());
        await step('5 control with membership', async () => {
            const r = await L.submitIndividualPurchase(page, app, {
                type: TYPE,
                membership: 'ACME',
            });
            record('a9-5-after-save', await screen(page));
            return r;
        });
        fact('5 stored', stored());
        await step('6 control institutional', async () => {
            await L.openMySubscriptions(page, app);
            const went = await L.follow(page, L.myPartLink(page, app, 'institutional', 'Purchase New Subscription'));
            const r = await L.submitInstitutionalAsIs(page, app);
            record('a9-6-institutional-refusal', await screen(page));
            return {went: went.url, ...r};
        });
    } finally {
        record('a9-facts', facts);
        await close();
    }
});
