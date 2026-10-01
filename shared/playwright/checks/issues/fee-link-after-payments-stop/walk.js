// Issue report docs/issues/U52-A3-fee-link-after-payments-stop.md (U52 A3):
// after a journal requests an author's publication fee and then stops taking
// payments, the author's fee task still opens the payment page (payments
// switched off) or fails on the server with an empty page (the manual method's
// instructions emptied). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, freshly reset), OJS only (the one
// app with the surface):
//   preconditions, as rvaca: Settings › Distribution › "Payments" ("Enable",
//   USD, "Manual Fee Payment", instructions, "Save"); "Payments" ›
//   "Payment Types" › "Article Processing Charge" 50, "Save"; as dbarnes:
//   submission 4 › "Accept and Skip Review" with "Request publication fee
//   (50 USD)", "Continue", "Continue", "Record Decision".
//   1. as cmontgomerie, the tasks bell › "The publication fee is due for
//      payment." (control: the manual page);
//   2. as rvaca, untick "Enable", "Save"; 3. as cmontgomerie, the task again;
//   4. "Send notification of payment" (rvaca's mailbox before and after);
//   5. as rvaca, tick "Enable", empty "Manual Payment Instructions", "Save";
//   6. as cmontgomerie, the task again (the answer's status, the server log).
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the steps are the same.
// Run: PROBE_FEATURE=issues-w43 PROBE_AGENT=w43 node bin/probe.js ojs shared/playwright/checks/issues/fee-link-after-payments-stop/walk.js
//      (reset first: npm run fleet-prep -- --feature issues-w43 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w43-3_5 and PROBE_RUN=r35)
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

        // 1 (control)
        fact('1 task, payments set up', await pressTask('1-task-control'));

        // 2–4: payments switched off
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.enableBox().uncheck();
        await settings.save();
        fact('2 enable saved unticked', true);
        fact('3 task, enable off', await pressTask('3-task-enable-off'));
        const before = await mailCount();
        const notify = page.getByRole('link', {name: TEXT.sendNotification, exact: true});
        if (await notify.count()) {
            await notify.click();
            await idle(page);
            const s = await screen(page);
            record('4-notification', s);
            await shot(page, '4-notification');
            let after = before;
            for (let i = 0; i < 20 && after === before; i++) {
                await sleep(500);
                after = await mailCount();
            }
            fact('4 notification, enable off', {heading: flat(await page.locator('main h1').first().innerText().catch(() => null)), text: flat(s.text && s.text.main, 300), contactMailBefore: before, contactMailAfter: after});
        } else {
            fact('4 notification, enable off', 'no "Send notification of payment" on the page');
        }

        // 5–6: instructions emptied
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.enableBox().check();
        await settings.instructionsBox().waitFor({timeout: T});
        const shown = await settings.instructionsBox().inputValue();
        await settings.instructionsBox().fill('');
        await settings.save();
        fact('5 enable ticked, instructions emptied', {instructionsShownOnTick: shown});
        fact('6 task, instructions empty', await pressTask('6-task-instructions-empty'));
    } finally {
        fact('server errors', responses);
        record('facts', facts);
        await close();
    }
});
