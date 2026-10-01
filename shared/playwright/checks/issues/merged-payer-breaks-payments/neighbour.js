// Neighbour check for docs/issues/U52-A11-merged-payer-breaks-payments.md (U52 A11),
// walked with the proposed fix in and out. OJS, dataset fleet, freshly reset.
// As rvaca: payments set up as in walk.js; a subscription type "u52w42 Online Year"
// and an individual subscription for Dana Phillips (dphillips) on the "Payments"
// page; "Paid" on submission 9 (author fpaglieri) and "Waived" on submission 5;
// then Dana Phillips (no payment of her own) is merged into Carlo Corino (ccorino).
// Reads, before and after the merge: the "Payments" tab's rows, the two
// submissions' "Payments" menus, the "Individual Subscriptions" rows.
// The fix must leave the other payers' records as they are; the subscription is
// the reach the fix changes (lost without it, moved to the chosen account with it).
// OMP (no list of payments, no fee on the workflow): a reader's bought file, the
// state only PayPal's callback creates, written as OMPPaymentManager::fulfillQueuedPayment()
// writes it (OMPCompletedPaymentDAO::insertCompletedPayment(): payment_type 1 =
// PAYMENT_TYPE_PURCHASE_FILE, the press, the buyer, the file id as assoc_id, amount,
// currency, 'PaypalPayment'); Arthur Clark (aclark) is merged into Alvin Finkel
// (afinkel) through the screens as rvaca; the record's buyer is read before and after.
// Run: PROBE_FEATURE=issues-w42 PROBE_AGENT=w42 PROBE_RUN=<nofix|fix> node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w42 --dataset 2 --reset)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const day = (offsetDays, offsetYears = 0) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    d.setUTCFullYear(d.getUTCFullYear() + offsetYears);
    return d.toISOString().slice(0, 10);
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    if (app.name === 'omp') return ompBuyer(app, {UsersListPage, MergeUserWindow});
    if (app.name !== 'ojs') return;
    const {PaymentSettingsTab, JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const ctxUrl = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const {page, close} = await launch(app);
    const errors = [];
    page.on('response', (r) => { if (r.status() >= 500) errors.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}); });

    const pp = new JournalPaymentsPage(page, ctx);
    const tabRows = async (tab) => {
        await pp.goto();
        if (tab !== 'Individual Subscriptions') await pp.tab(tab).click();
        await page.waitForFunction((t) => {
            const p = [...document.querySelectorAll('[role="tabpanel"]')].find((x) => x.getAttribute('aria-labelledby') && document.getElementById(x.getAttribute('aria-labelledby'))?.innerText.trim() === t);
            return p && !/^\s*Loading\s*$/.test(p.innerText) && p.querySelector('table');
        }, tab, {timeout: 12000}).catch(() => {});
        await idle(page);
        await sleep(1000);
        const panel = pp.panel(tab);
        return {
            text: flat(await panel.innerText().catch(() => null), 400),
            rows: (await panel.locator('tr.gridRow').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
        };
    };
    const payBtn = () => page.locator('.pkpWorkflow__submissionPayments button').filter({hasText: /^\s*Payments\s*$/}).first();
    const payContent = () => page.locator('.pkpWorkflow__submissionPayments .pkpDropdown__content');
    const menu = async (sid, save = null) => {
        await page.goto(ctxUrl(`/dashboard/editorial?workflowSubmissionId=${sid}`));
        await idle(page);
        await sleep(2000);
        const err = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        const errorWindow = (await err.count()) ? flat(await err.innerText(), 120) : null;
        if (errorWindow) {
            await err.getByRole('button', {name: 'OK', exact: true}).click();
            await sleep(800);
        }
        await payBtn().click();
        await payContent().waitFor({timeout: 10000}).catch(() => {});
        await page.locator('.pkpWorkflow__submissionPayments input[type=radio]').first().waitFor({timeout: 8000}).catch(() => {});
        let saved = null;
        if (save) {
            await payContent().getByRole('radio', {name: save, exact: true}).check({force: true});
            const answer = page.waitForResponse((r) => /\/_submissions\/\d+\/payment(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await payContent().getByRole('button', {name: 'Save', exact: true}).click();
            saved = (await answer).status();
            await payContent().locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
        }
        const radios = await payContent().evaluate((el) => [...el.querySelectorAll('input[type=radio]')].map((r) => `${((r.closest('label') || r.parentElement).innerText || '').trim()}${r.checked ? '*' : ''}`)).catch(() => []);
        return {errorWindow, saved, radios};
    };

    try {
        await signIn(page, 'rvaca');
        // Payments on, APC 50 (as walk.js).
        const settings = new PaymentSettingsTab(page, ctx);
        await settings.goto();
        await settings.enableBox().check();
        await settings.currencySelect().selectOption('USD');
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().fill('Pay by bank transfer.');
        await settings.save();
        await pp.goto();
        const types = await pp.showPaymentTypes();
        await types.type('Article Processing Charge', '50');
        await types.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});

        // A subscription type and Dana Phillips's individual subscription.
        await pp.gotoTab('Subscription Types');
        const typeWin = await pp.openCreateType();
        await typeWin.fill({name: 'u52w42 Online Year', currency: 'USD', cost: '40', format: 'Online', duration: '12'});
        await typeWin.saveAccepted();
        await pp.goto();
        const subWin = await pp.openCreateSubscription('Individual Subscriptions');
        await subWin.chooseType('u52w42 Online Year');
        const dphillipsId = sql(app, "select user_id from users where username = 'dphillips'");
        await subWin.chooseUser('Phillips', dphillipsId);
        await subWin.chooseStatus('Active');
        await subWin.typeDate('dateStart', day(-1));
        await subWin.typeDate('dateStart', day(0));
        await subWin.typeDate('dateEnd', day(0, 1));
        const subAnswer = await subWin.save();
        fact('subscription save', subAnswer.status());
        await sleep(1500);

        // The other payers' records.
        fact('9 paid', await menu(9, 'Paid'));
        fact('5 waived', await menu(5, 'Waived'));

        fact('before: payments', await tabRows('Payments'));
        fact('before: individual subscriptions', await tabRows('Individual Subscriptions'));

        // Merge Dana Phillips into Carlo Corino.
        const list = new UsersListPage(page, ctx);
        await list.goto();
        await list.chooseAction(list.row('dphillips@mailinator.com'), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await merge.mergeInto('ccorino@mailinator.com');
        const answer = await merge.confirm();
        await sleep(3000);
        fact('merge', answer.status());

        fact('after: payments', await tabRows('Payments'));
        fact('after: individual subscriptions', await tabRows('Individual Subscriptions'));
        fact('after: 9 menu', await menu(9));
        fact('after: 5 menu', await menu(5));
        fact('db subscriptions', sql(app, "select s.subscription_id, coalesce(u.username, 'NULL'), s.status from subscriptions s left join users u on u.user_id = s.user_id order by 1").split('\n').filter(Boolean));
        fact('db payments', sql(app, "select cp.completed_payment_id, cp.assoc_id, cp.amount, coalesce(u.username, 'NULL') from completed_payments cp left join users u on u.user_id = cp.user_id order by 1").split('\n').filter(Boolean));
        record('after-screen', await screen(page));
    } finally {
        fact('server errors', errors);
        record('neighbour-facts', facts);
        await close();
    }
});

async function ompBuyer(app, {UsersListPage, MergeUserWindow}) {
    const ctx = app.contextPath;
    const out = {app: app.name, run: process.env.PROBE_RUN || null};
    const log = (k, v) => { out[k] = v; console.log(`[fact] omp ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    const buyer = sql(app, "select user_id from users where username = 'aclark'");
    const fileId = sql(app, "select min(submission_file_id) from submission_files where submission_id = 14 and file_stage = 10");
    sql(app, `insert into completed_payments (timestamp, payment_type, context_id, user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name) values (now(), 1, 1, ${buyer}, '${fileId}', 10.00, 'USD', 'PaypalPayment')`);
    const read = () => sql(app, "select cp.completed_payment_id, cp.assoc_id, coalesce(u.username, 'NULL') from completed_payments cp left join users u on u.user_id = cp.user_id order by 1").split('\n').filter(Boolean);
    log('before', read());
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const list = new UsersListPage(page, ctx);
        await list.goto();
        await list.chooseAction(list.row('aclark@mailinator.com'), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await merge.mergeInto('afinkel@mailinator.com');
        const answer = await merge.confirm();
        await sleep(3000);
        log('merge', answer.status());
        log('after', read());
        log('merged account rows', sql(app, "select count(*) from users where username = 'aclark'"));
    } finally {
        record('neighbour-facts', out);
        await close();
    }
}
