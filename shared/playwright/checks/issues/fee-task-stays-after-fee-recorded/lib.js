// Helpers for the U52 A2 walks (fee-task-stays-after-fee-recorded): each one is a
// sequence of screen actions a person takes on PKP's default test dataset, OJS.
// Requiring this file runs nothing.
const {signIn, screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** As rvaca: payments on (USD, manual, instructions) and an APC of 50, through the screens. */
async function setUpPayments(page, app) {
    const {PaymentSettingsTab, JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const ctx = app.contextPath;
    await signIn(page, 'rvaca');
    const settings = new PaymentSettingsTab(page, ctx);
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
}

/** Open a submission's workflow as the signed-in editor. */
async function openWorkflow(page, app, sid) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page);
}

/** As dbarnes: "Accept and Skip Review" on `sid`, keeping "Request publication fee (50 USD)". */
async function acceptRequestingFee(page, app, sid, label) {
    const {PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {DecisionWizardPage} = require('../../../../../apps/ojs/playwright/pages/DecisionWizardPages.js');
    await signIn(page, 'dbarnes');
    await openWorkflow(page, app, sid);
    await new WorkflowPage(page, app.contextPath).actionButton('Accept and Skip Review').click();
    const wizard = new DecisionWizardPage(page);
    await wizard.expectTitle('Accept and Skip Review: Request Payment');
    const feeRadio = wizard.paymentRadio(TEXT.requestFee(50, 'USD'));
    const out = {feeOption: await feeRadio.count(), feeChosen: await feeRadio.isChecked().catch(() => null)};
    if (label) await shot(page, label);
    await wizard.continueStep();
    await wizard.expectTitle('Accept and Skip Review: Notify Authors');
    await wizard.continueStep();
    await wizard.expectTitle('Accept and Skip Review: Select Files');
    await wizard.recordDecision('Skipped Review');
    return out;
}

/** As dbarnes: the workflow header's "Payments" › `option` › "Save" on `sid`. */
async function recordFee(page, app, sid, option, label) {
    const {WorkflowPaymentsMenu} = require('../../../pages/PaymentsPages.js');
    await signIn(page, 'dbarnes');
    await openWorkflow(page, app, sid);
    const menu = new WorkflowPaymentsMenu(page);
    await menu.open();
    const before = await menu.choice().locator('input[type=radio]:checked').evaluateAll((els) => els.map((e) => (e.closest('label') || e.parentElement).innerText.trim()));
    const r = await menu.saveOption(option);
    if (label) {
        record(label, await screen(page));
        await shot(page, label);
    }
    return {chosenBefore: before, saveStatus: r.status(), saved: await menu.savedStatus().isVisible().catch(() => false)};
}

/**
 * As `user`: the Tasks bell's rows; with `press`, press the fee task for `title`
 * and return the page it opens (the address's answer, heading, text, the button).
 */
async function feeTask(page, app, user, title, label, {press = true} = {}) {
    const {PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    await signIn(page, user);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const tasks = new TasksPanel(page);
    const bell = flat(await tasks.bell().innerText().catch(() => null));
    await tasks.open();
    const rows = await tasks.rowTexts();
    const row = tasks.row(TEXT.feeDue).filter({hasText: title});
    const out = {bell, taskRows: rows, feeTaskRows: await row.count()};
    record(`${label}-tasks`, await screen(page));
    await shot(page, `${label}-tasks`);
    if (!press || !out.feeTaskRows) return out;
    const answer = page.waitForResponse((r) => /\/payment\/pay\/\d+/.test(r.url()) && r.request().resourceType() === 'document', {timeout: T});
    await tasks.openTask(row.first());
    const r = await answer;
    await page.waitForLoadState('load').catch(() => {});
    return {...out, opened: await readPayPage(page, r, label)};
}

/** What a payment address shows. */
async function readPayPage(page, response, label) {
    const {PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    await idle(page);
    const s = await screen(page);
    record(label, s);
    await shot(page, label);
    return {
        address: response.url().replace(/^https?:\/\/[^/]+/, ''),
        status: response.status(),
        heading: flat(await page.locator('main h1, h1.page_title').first().innerText({timeout: 3000}).catch(() => null)),
        text: flat(s.text && s.text.main, 500),
        notifyButton: await page.getByRole('link', {name: TEXT.sendNotification, exact: true}).count(),
    };
}

/** The link in the "Payment Request Notification" to `user` sent after `since` (a Date), as the mailbox shows it. */
async function feeLinkFromMail(app, user, since) {
    const {PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    for (let i = 0; i < 40; i++) {
        const res = await app.mail._search({to: `${user}@mailinator.com`, subject: TEXT.paymentRequestSubject});
        const msg = (res.messages || []).find((m) => new Date(m.Created) >= since);
        if (msg) {
            const full = await app.mail.fullMessage(msg.ID);
            const m = String(full.HTML || full.Text || '').match(/https?:\/\/[^"'<>\s]*\/payment\/pay\/\d+/);
            return m ? m[0] : null;
        }
        await sleep(500);
    }
    return null;
}

/** As `user` (signed in by the caller): open `link` and read the page. */
async function openFeeLink(page, link, label) {
    const r = await page.goto(link);
    return readPayPage(page, r, label);
}

/** Press "Send notification of payment"; count the principal contact's notifications before and after. */
async function sendNotification(page, app, label) {
    const {PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const count = () => app.mail.count({to: 'rvaca@mailinator.com', subject: TEXT.manualNotificationSubject});
    const before = await count();
    await page.getByRole('link', {name: TEXT.sendNotification, exact: true}).click();
    await idle(page);
    const s = await screen(page);
    record(label, s);
    await shot(page, label);
    let after = before;
    for (let i = 0; i < 20 && after === before; i++) {
        await sleep(500);
        after = await count();
    }
    return {heading: flat(await page.locator('main h1').first().innerText().catch(() => null)), text: flat(s.text && s.text.main, 300), contactMailBefore: before, contactMailAfter: after};
}

module.exports = {T, sleep, flat, setUpPayments, openWorkflow, acceptRequestingFee, recordFee, feeTask, feeLinkFromMail, openFeeLink, sendNotification};
