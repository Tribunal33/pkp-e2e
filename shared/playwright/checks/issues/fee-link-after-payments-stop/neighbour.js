// Neighbour check for docs/issues/U52-A3-fee-link-after-payments-stop.md's fix
// (fix.diff): what the fix must leave alone. Same preconditions as walk.js
// (payments set up, APC 50, submission 4 accepted with the fee requested), then:
//   N1. as rvaca, untick "Enable", "Save"; as cmontgomerie, the fee task;
//   N2. as rvaca, tick "Enable" again, "Save"; as cmontgomerie, the fee task
//       (the request must still open the manual page) and "Send notification
//       of payment" (the principal contact's mailbox before and after);
//   N3. the address of a request that does not exist (payment/pay/999): the
//       "Payment" page's expired-request sentence, as before the fix.
// Walked with the fix in and out (node bin/try-fix.js apply|revert …).
// Run: PROBE_FEATURE=issues-w43 PROBE_AGENT=w43 PROBE_RUN=<fix|nofix> node bin/probe.js ojs shared/playwright/checks/issues/fee-link-after-payments-stop/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w43 --dataset 1 --reset)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const SID = 4;
const TITLE = 'Computer Skill Requirements for New and Existing Teachers';
const AUTHOR = 'cmontgomerie';
const CONTACT = 'rvaca@mailinator.com';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (app.name !== 'ojs') return;
    const {PaymentSettingsTab, JournalPaymentsPage, PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {DecisionWizardPage} = require('../../../../../apps/ojs/playwright/pages/DecisionWizardPages.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const logDir = path.resolve(__dirname, '../../../../../apps/ojs/playwright/.server-logs');
    const logFile = fs.readdirSync(logDir).map((f) => path.join(logDir, f)).find((f) => path.basename(f).startsWith(`server-${app.port}-`));
    const logSize = () => (logFile ? fs.statSync(logFile).size : 0);
    const logSince = (offset) => {
        if (!logFile) return 'no log file';
        const buf = fs.readFileSync(logFile);
        return buf.subarray(offset).toString('utf8').split('\n').filter((l) => /Error|Fatal|Exception|PaymentHandler/.test(l)).map((l) => l.slice(0, 400)).slice(0, 10);
    };
    const mailCount = () => app.mail.count({to: CONTACT, subject: TEXT.manualNotificationSubject});

    const {page, close} = await launch(app);
    const responses = [];
    page.on('response', (r) => {
        if (r.status() >= 500) responses.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)});
    });
    const settings = new PaymentSettingsTab(page, ctx);

    // The author's task, pressed: the payment address's answer and what the page shows.
    const pressTask = async (label) => {
        await signIn(page, AUTHOR);
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/mySubmissions`));
        await idle(page);
        const tasks = new TasksPanel(page);
        await tasks.open();
        const row = tasks.row(TEXT.feeDue).filter({hasText: TITLE});
        const rows = await tasks.rowTexts();
        const answer = page.waitForResponse((r) => /\/payment\/pay\/\d+/.test(r.url()) && r.request().resourceType() === 'document', {timeout: T});
        const offset = logSize();
        await tasks.openTask(row);
        const r = await answer;
        await page.waitForLoadState('load').catch(() => {});
        await sleep(1500);
        const s = await screen(page);
        record(label, s);
        await shot(page, label);
        const body = flat(await page.locator('body').innerText().catch(() => ''), 600);
        return {
            taskRows: rows,
            address: r.url().replace(/^https?:\/\/[^/]+/, ''),
            status: r.status(),
            heading: flat(await page.locator('main h1, h1.page_title').first().innerText({timeout: 3000}).catch(() => null)),
            bodyText: body,
            notifyButton: await page.getByRole('link', {name: TEXT.sendNotification, exact: true}).count(),
            serverLog: r.status() >= 500 ? (await sleep(500), logSince(offset)) : [],
        };
    };

    try {
        // Preconditions: payments on, APC 50.
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.enableBox().check();
        await settings.currencySelect().selectOption('USD');
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.instructionsBox().fill('Pay by bank transfer.');
        await settings.save();
        const pp = new JournalPaymentsPage(page, ctx);
        await pp.goto();
        const types = await pp.showPaymentTypes();
        await types.type('Article Processing Charge', '50');
        await types.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});
        await idle(page);

        // Preconditions: dbarnes accepts submission 4 requesting the fee.
        await signIn(page, 'dbarnes');
        const workflow = new WorkflowPage(page, ctx);
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${SID}`));
        await idle(page);
        await workflow.actionButton('Accept and Skip Review').click();
        const wizard = new DecisionWizardPage(page);
        await wizard.expectTitle('Accept and Skip Review: Request Payment');
        const feeRadio = wizard.paymentRadio(TEXT.requestFee(50, 'USD'));
        fact('request payment page', {feeOption: await feeRadio.count(), feeChosen: await feeRadio.isChecked().catch(() => null)});
        await shot(page, '0-request-payment');
        await wizard.continueStep();
        await wizard.expectTitle('Accept and Skip Review: Notify Authors');
        await wizard.continueStep();
        await wizard.expectTitle('Accept and Skip Review: Select Files');
        await wizard.recordDecision('Skipped Review');
        fact('decision recorded', true);

        // N1
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.enableBox().uncheck();
        await settings.save();
        fact('N1 task, enable off', await pressTask('N1-task-enable-off'));

        // N2
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.enableBox().check();
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.save();
        fact('N2 task, enable on again', await pressTask('N2-task-enable-on'));
        const before = await mailCount();
        const notify = page.getByRole('link', {name: TEXT.sendNotification, exact: true});
        if (await notify.count()) {
            await notify.click();
            await idle(page);
            let after = before;
            for (let i = 0; i < 20 && after === before; i++) {
                await sleep(500);
                after = await mailCount();
            }
            fact('N2 notification', {text: flat((await screen(page)).text.main, 300), contactMailBefore: before, contactMailAfter: after});
        } else {
            fact('N2 notification', 'no "Send notification of payment" on the page');
        }

        // N3
        const r = await page.goto(app.url(`/index.php/${ctx}/en/payment/pay/999`));
        await idle(page);
        const s3 = await screen(page);
        record('N3-no-such-request', s3);
        fact('N3 no such request', {status: r.status(), text: flat(s3.text && s3.text.main, 300)});
    } finally {
        fact('server errors', responses);
        record('neighbour-facts', facts);
        await close();
    }
});
