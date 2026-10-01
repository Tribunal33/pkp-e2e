// Issue report docs/issues/U51-A13-A26-subscription-block-status-wrong.md (U51 A13, A26):
// the sidebar "Subscription" block reads "Expired: {today}" for a subscription awaiting payment and
// "Expires: {date}" for an inactive one, where "My Subscriptions" reads "Awaiting Manual Payment" and
// "Inactive". OJS only (subscriptions are a journal's), on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit builds nothing.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 "Access": the subscription mode, "Save"
//   P3 Website › "Appearance" › "Setup": "Sidebar" "Subscription Block", "Save"
//   P4 "Subscription Types" › "Create New Subscription Type": "Online Year u51sb3", 10 USD, 12 months
//   1 ckwantes: "My Subscriptions" › "Purchase New Subscription" › the type › "Save"
//   2 the home page and article 1: the block      3 "My Subscriptions": the table and the block
//   4 rvaca: the row's "Edit": "Needs Approval", end a year on, "Save"
//   5 ckwantes: the home page: the block           6 "My Subscriptions": the table and the block
//   (4–6 again for "Needs Information" and "Other, See Notes")
//   control: "Active", end a year on ("Expires: {date}")
//   neighbour of the fix: "Active", started a year ago, ended yesterday ("Expired: {yesterday}")
//
// Reset first: npm run fleet-prep -- --feature issues-sb3 --dataset 5 --reset
// Run (main):  PROBE_FEATURE=issues-sb3 PROBE_AGENT=sb3 node bin/probe.js ojs shared/playwright/checks/issues/subscription-block-status-wrong/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb3-3_5 PROBE_AGENT=sb3 node bin/probe.js ojs <this file>
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const READER = 'ckwantes';
const ROW = 'Kwantes';
const MANAGER = 'rvaca';
const TYPE = 'Online Year u51sb3';
const ARTICLE = 1; // "Signalling Theory Dividends"
const iso = (d) => d.toISOString().slice(0, 10);
const shift = (days) => iso(new Date(Date.now() + days * 864e5));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const tag = process.env.PROBE_TAG || 'walk';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, tag, today: L.today()};
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
    const stored = () => sql(app, "select subscription_id, user_id, status, coalesce(date_start::text,'-'), coalesce(date_end::text,'-') from subscriptions order by 1") || 'no row';
    const log = serverLog(app);
    const readMine = async (name) => {
        const my = await L.readMySubscriptions(page, app);
        const block = await L.readBlock(page);
        record(`${tag}-${name}`, await screen(page));
        return {table: my.individual, block};
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 payments', () => L.setUpPayments(page, app));
        await step('P2 access', () => L.requireSubscriptions(page, app));
        await step('P3 sidebar', () => L.placeBlockInSidebar(page, app, 'Subscription Block'));
        await step('P4 type', () => L.createType(page, app, {name: TYPE, cost: '10'}));

        await signIn(page, READER);
        await step('1 purchase new', async () => {
            const went = await L.pressPurchaseNew(page, app, 'individual');
            await L.fillPurchasePage(page, app, {type: TYPE});
            const saved = await L.submitPurchasePage(page, app);
            record(`${tag}-1-payment-page`, await screen(page));
            return {went, saved, stored: stored()};
        });
        await step('2 home block', async () => {
            const r = await L.blockOn(page, app, '');
            record(`${tag}-2-home`, await screen(page));
            await shot(page, `${tag}-2-home`).catch(() => {});
            return r;
        });
        await step('2 article block', () => L.blockOn(page, app, `article/view/${ARTICLE}`));
        await step('3 my subscriptions', () => readMine('3-my-subscriptions'));

        for (const status of ['Needs Approval', 'Needs Information', 'Other, See Notes']) {
            const k = status.replace(/[^A-Za-z]+/g, '-').toLowerCase();
            await signIn(page, MANAGER);
            await step(`4 ${status}`, () => L.editSubscription(page, app, ROW, {status, end: L.yearOn()}));
            fact(`4 ${status} stored`, stored());
            await signIn(page, READER);
            await step(`5 ${status} home block`, async () => {
                const r = await L.blockOn(page, app, '');
                record(`${tag}-5-${k}-home`, await screen(page));
                if (status === 'Needs Approval') await shot(page, `${tag}-5-home`).catch(() => {});
                return r;
            });
            await step(`5 ${status} article block`, () => L.blockOn(page, app, `article/view/${ARTICLE}`));
            await step(`6 ${status} my subscriptions`, () => readMine(`6-${k}-my-subscriptions`));
        }

        // Control: an active subscription within its dates.
        await signIn(page, MANAGER);
        await step('control active', () => L.editSubscription(page, app, ROW, {status: 'Active', end: L.yearOn()}));
        await signIn(page, READER);
        await step('control home block', () => L.blockOn(page, app, ''));
        await step('control my subscriptions', () => readMine('control-my-subscriptions'));

        // Neighbour of the fix: an active subscription that has ended still reads "Expired: {date}".
        await signIn(page, MANAGER);
        await step('neighbour ended', () => L.editSubscription(page, app, ROW, {status: 'Active', start: shift(-366), end: shift(-1)}));
        fact('neighbour stored', stored());
        await signIn(page, READER);
        await step('neighbour home block', () => L.blockOn(page, app, ''));
        await step('neighbour my subscriptions', () => readMine('neighbour-my-subscriptions'));

        fact('server log', log.since());
        await signOut(page);
    } finally {
        record(`${tag}-facts`, facts);
        await close();
    }
});
