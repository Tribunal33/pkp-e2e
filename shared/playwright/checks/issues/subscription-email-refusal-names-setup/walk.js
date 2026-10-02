// Issue report docs/issues/U51-A4-subscription-email-refusal-names-setup.md (U51 A4): saving a
// subscription with the email box ticked while the "Subscription Manager" contact is empty is
// refused with a message sending the manager to "the journal Setup". OJS only (subscriptions
// are a journal's), on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`. The kit builds nothing; every step is a screen.
//
//   1 rvaca   2 "Payments" › "Subscription Types": "u51sb7 Online Year" (10 USD, Online, 12 months)
//   3 "Individual Subscriptions" › "Create New Subscription"   4 ccorino   5 the type, "Active"
//   6 today's date, the same day next year (typed)   7 the email box, "Save"
//   8 (control) "Subscription Policies": "Subscription Manager" Name, Email, Mailing Address, "Save"
//   9 (control) steps 3-7 again: saved
// The fix's neighbour is the control: the refusal stays while the contact is empty, and the
// save goes through once it is set.
//
// Reset first: npm run fleet-prep -- --feature issues-sb7 --dataset 8 --reset
// Run (main):  PROBE_FEATURE=issues-sb7 PROBE_AGENT=sb7 node bin/probe.js ojs shared/playwright/checks/issues/subscription-email-refusal-names-setup/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb7-3_5 PROBE_AGENT=sb7 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/sb7/a4-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('../refused-form-date-box-shows-today/lib');

const MANAGER = 'rvaca';
const READER = 'ccorino';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, today: L.dayFrom()};
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
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    fact('contact in the dataset', sql(app, "select setting_name, setting_value from journal_settings where setting_name in ('subscriptionName','subscriptionEmail') order by 1") || 'none');

    /** Steps 3-7: the window filled, the email box ticked, "Save". */
    const createWithEmail = async (label) => {
        const win = await L.openCreate(page, app);
        await win.chooseUser(READER, L.userId(app, READER));
        await win.chooseType(L.TYPE);
        await win.chooseStatus('Active');
        const start = await L.typeDate(page, win, 'dateStart', L.dayFrom());
        const end = await L.typeDate(page, win, 'dateEnd', L.dayFrom({years: 1}));
        await win.emailBox().check();
        const out = {start, end, ...(await L.save(page, win))};
        record(`a4-${label}`, await screen(page));
        await shot(page, `a4-${label}`).catch(() => {});
        return out;
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('menu', async () => (await page.locator('#app-nav').innerText().catch(() => '')).split('\n').map((t) => t.trim()).filter(Boolean));
        await step('2 type', () => L.createType(page, app));
        await step('3-7 save with the email box', () => createWithEmail('7-refused'));
        await step('page and tabs', async () => {
            const pay = new PaymentsPage(page, app.contextPath);
            await pay.goto();
            return {heading: L.flat(await pay.heading().innerText().catch(() => null)), tabs: (await pay.tabs().allInnerTexts()).map((t) => L.flat(t))};
        });
        await step('8 policies', async () => {
            const pay = new PaymentsPage(page, app.contextPath);
            await pay.gotoTab('Subscription Policies');
            const panel = pay.panel('Subscription Policies');
            const labels = L.flat(await panel.innerText(), 900);
            const form = pay.policies();
            await form.nameBox().fill('Subscriptions Desk u51sb7');
            await form.emailBox().fill('desk.u51sb7@mailinator.com');
            await form.addressBox().fill('1 Harbour Road');
            const r = await form.save();
            await shot(page, 'a4-8-policies').catch(() => {});
            return {labels, save: r.status()};
        });
        await step('9 save with the email box again', () => createWithEmail('9-saved'));
        await step('9 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Corino'));
        fact('stored', sql(app, "select subscription_id, user_id, status, date_start::text, date_end::text from subscriptions order by 1") || 'no row');
    } finally {
        record('a4-facts', facts);
        await close();
    }
});
