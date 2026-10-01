// Issue report docs/issues/U52-A11-merged-payer-breaks-payments-list-and-publishing.md: the walk.
// OJS only (the one app with fee records and subscriptions), on a dataset
// fleet freshly reset. Through the screens, as the dataset's `admin`:
//   1. Settings › Distribution › "Payments": "Enable", US Dollar, "Manual
//      Fee Payment", instructions, "Save"
//   2. "Payments" › "Payment Types": "Article Processing Charge" 50, "Save"
//   3. "Subscription Types" › "Create New Subscription Type": "Reader Year
//      u52r5", USD 30, Online, 12 months
//   4. "Individual Subscriptions" › "Create New Subscription": `ddiouf`,
//      "Reader Year u52r5", Active, today to a year on
//   5. submission 5 (Author `ddiouf`): header "Payments" › "Paid" › "Save"
//   6. submission 6 (Author `dphillips`): "Payments" › "Waived" › "Save"
//      (the neighbour: a record in `admin`'s name the merge must not touch)
//   7. "Payments" › "Payments" and "Individual Subscriptions": the lists before
//   8. Settings › Users & Roles: Diaga Diouf's "…" › "Merge user" › Dana
//      Phillips's "Merge into this User" › "OK"
//   9. "Payments" › "Payments"            10. "Individual Subscriptions"
//  11. submission 5: the workflow, its "Payments" menu
//  12. submission 5: "Schedule For Publication" (nothing is confirmed)
//  13. the neighbour: submission 6's "Payments" menu
// Reads `completed_payments` and `subscriptions` beside each list.
// Run: PROBE_FEATURE=<fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/walk.js
//      (PROBE_RUN=fixin with fix-ojs.diff applied; PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 on 3.5;
//      WALK_FROM=9 PROBE_RUN=stored, with the fix applied after an unfixed walk and no reset between,
//      reads what the fix shows for a record the merge already left without its payer)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const {T, sleep, flat, url, windows, readTab, openWorkflow, readFeeMenu, saveFee, pressPublish, serverLog} = require('./lib');

const PAYER = {username: 'ddiouf', name: 'Diaga Diouf', submission: 5};
const TARGET = {username: 'dphillips', name: 'Dana Phillips', submission: 6};
const TYPE = 'Reader Year u52r5';
const iso = (d) => d.toISOString().slice(0, 10);
// WALK_FROM=9 reads the screens of steps 9 to 13 on the install as an earlier walk left it (a record already stored without its payer).
const FROM = Number(process.env.WALK_FROM || 1);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {PaymentSettingsTab, JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1400)}`);
    };
    const step = async (k, fn) => {
        if (parseInt(k, 10) < FROM) return;
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: flat(e.message, 400)});
        }
    };
    const uid = (u) => sql(app, `select user_id from users where username='${u}'`);
    const stored = () => ({
        completed_payments: sql(app, "select completed_payment_id, coalesce(user_id::text,'NULL'), assoc_id, amount, coalesce(payment_method_plugin_name,'') from completed_payments order by 1"),
        subscriptions: sql(app, 'select subscription_id, user_id, status from subscriptions order by 1') || 'no row',
    });
    const log = serverLog(app);
    const ids = {payer: uid(PAYER.username), target: uid(TARGET.username), admin: uid('admin')};
    fact('0 accounts', ids);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');

        await step('1 payments on', async () => {
            const tab = new PaymentSettingsTab(page, app.contextPath);
            await tab.goto();
            await tab.enableBox().check();
            await tab.currencySelect().waitFor({timeout: T});
            await tab.currencySelect().selectOption('USD');
            await tab.pluginSelect().selectOption({label: 'Manual Fee Payment'});
            await tab.instructionsBox().fill('Pay by bank transfer.');
            const r = await tab.save();
            return {save: r.status(), currency: await tab.chosenOption(tab.currencySelect()), method: await tab.chosenOption(tab.pluginSelect())};
        });

        const pay = new JournalPaymentsPage(page, app.contextPath);
        await step('2 apc', async () => {
            await pay.goto();
            const types = await pay.showPaymentTypes();
            await types.type('Article Processing Charge', '50');
            await types.save();
            await idle(page);
            return {stored: sql(app, "select setting_value from journal_settings where setting_name='publicationFee'")};
        });

        await step('3 subscription type', async () => {
            await pay.gotoTab('Subscription Types');
            const win = await pay.openCreateType();
            await win.fill({name: TYPE, currency: 'USD', cost: '30', format: 'Online', duration: '12'});
            const r = await win.saveAccepted();
            return {save: r.status(), rows: await pay.firstCells('Subscription Types')};
        });

        await step('4 subscription', async () => {
            await pay.gotoTab('Individual Subscriptions');
            const win = await pay.openCreateSubscription('Individual Subscriptions');
            await win.chooseUser(PAYER.username, ids.payer);
            await win.chooseType(TYPE);
            await win.chooseStatus('Active');
            const now = new Date();
            const later = new Date(now);
            later.setUTCFullYear(later.getUTCFullYear() + 1);
            await win.typeDate('dateStart', iso(now));
            await win.typeDate('dateEnd', iso(later));
            const r = await win.saveAccepted();
            return {save: r.status()};
        });

        await step('5 paid', async () => {
            const wf = await openWorkflow(page, app, PAYER.submission);
            const saved = await saveFee(page, 'Paid');
            record('s5-paid', await screen(page));
            return {...wf, ...saved};
        });

        await step('6 waived (neighbour)', async () => {
            const wf = await openWorkflow(page, app, TARGET.submission);
            return {...wf, ...(await saveFee(page, 'Waived'))};
        });

        await step('7 before', async () => {
            const list = await readTab(page, app, 'Payments');
            record('s7-list-before', await screen(page));
            const subs = await readTab(page, app, 'Individual Subscriptions');
            return {payments: list, subscriptions: subs, db: stored()};
        });

        await step('8 merge', async () => {
            const list = new UsersListPage(page, app.contextPath);
            await list.goto();
            await list.search('Diouf');
            await idle(page);
            const row = list.row(`${PAYER.username}@mailinator.com`);
            const menu = await list.menuLabels(row);
            await list.chooseAction(row, 'Merge user');
            const win = new MergeUserWindow(page);
            await win.expectOpen();
            await win.grid.search({text: 'Phillips'});
            await win.mergeInto(TARGET.username);
            // 3.5's "Confirm" holds its sentence without a paragraph: read the dialog's text
            const question = flat(await win.confirmDialog.innerText(), 400);
            const r = await win.confirm();
            await sleep(1500);
            await idle(page).catch(() => {});
            record('s8-after-merge', await screen(page));
            return {menu, question, merge: r.status(), windowsAfter: (await windows(page)).map((w) => w.text.slice(0, 80)), payerLeft: uid(PAYER.username) || 'deleted', db: stored()};
        });

        await step('9 payments list', async () => {
            const list = await readTab(page, app, 'Payments');
            record('s9-list-after', await screen(page));
            return list;
        });

        await step('10 subscriptions', async () => {
            const subs = await readTab(page, app, 'Individual Subscriptions');
            record('s10-subscriptions-after', await screen(page));
            return subs;
        });

        await step('11 workflow and menu', async () => {
            const wf = await openWorkflow(page, app, PAYER.submission);
            record('s11-workflow', await screen(page));
            const fee = await readFeeMenu(page);
            record('s11-menu', await screen(page));
            return {...wf, menu: fee};
        });

        await step('12 publish', async () => {
            await openWorkflow(page, app, PAYER.submission);
            const out = await pressPublish(page, app);
            record('s12-publish', await screen(page));
            return out;
        });

        await step('13 neighbour', async () => {
            const wf = await openWorkflow(page, app, TARGET.submission);
            return {...wf, menu: await readFeeMenu(page), db: stored()};
        });

        fact('server log', log.since());
    } finally {
        record('facts', facts);
        await close();
    }
});
