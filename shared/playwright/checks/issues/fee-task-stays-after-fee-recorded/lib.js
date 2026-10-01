// Helpers of walk.js (issue report docs/issues/U52-A2-fee-task-stays-after-fee-recorded.md).
// Requiring this file runs nothing. Every helper presses what a person presses; the page objects are the
// suite's (shared/playwright/pages/PaymentsPages.js, NotificationsPages.js, WorkflowPage.js and the OJS
// DecisionWizardPages.js), the settings save the U69 A7 walk's (../priced-file-link-price-twice-or-missing/lib.js).
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');
const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');
const {sleep, flat, rel} = require('../older-version-pdf-reader-empty/lib');

const T = 30_000;
const FEE_DUE = 'The publication fee is due for payment.';

/** The "Payments" page › "Payment Types": "Article Processing Charge" `amount`, "Save". */
async function setApc(page, app, amount) {
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const payments = new JournalPaymentsPage(page, app.contextPath);
    await payments.goto();
    const sideMenu = await page.locator('nav#app-nav [aria-label="Payments"]').count();
    const tab = await payments.showPaymentTypes();
    await tab.type('Article Processing Charge', String(amount));
    const response = await tab.save();
    await idle(page);
    const s = await screen(page);
    return {sideMenuPayments: sideMenu, saveStatus: response.status(), notices: s.notices, box: await tab.box('Article Processing Charge').inputValue()};
}

/**
 * A submission in the Submission stage: "Accept and Skip Review", the "Request Payment" page as it
 * arrives, "Continue" to the last page, "Record Decision".
 */
async function acceptRequestingFee(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {DecisionWizardPage} = require(path.join(app.suiteDir, 'pages', 'DecisionWizardPages.js'));
    const workflow = new WorkflowPage(page, app.contextPath);
    await workflow.gotoEditorial(submissionId);
    await idle(page);
    await workflow.actionButton('Accept and Skip Review').click();
    const wizard = new DecisionWizardPage(page);
    await wizard.heading().waitFor({state: 'visible', timeout: T});
    await wizard.currentStep().getByRole('radio').first().waitFor({state: 'visible', timeout: T});
    const out = {heading: flat(await wizard.heading().innerText(), 120)};
    out.radios = await wizard.currentStep().getByRole('radio').evaluateAll((els) =>
        els.map((e) => `${e.checked ? '(x)' : '( )'} ${(e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()}`)
    );
    record(`request-payment-${submissionId}`, await screen(page));
    for (let i = 0; i < 4 && !(await wizard.recordButton.isVisible()); i++) {
        await wizard.continueStep();
        await sleep(500);
    }
    const posted = page.waitForResponse((r) => r.url().includes('/decisions') && r.request().method() === 'POST', {timeout: 60_000}).catch(() => null);
    const dialog = await wizard.recordDecision('Skipped Review');
    const r = await posted;
    out.decision = r ? r.status() : null;
    out.completion = flat(await dialog.innerText(), 200);
    return out;
}

/** The workflow header's "Payments" menu: what it arrives on, then `option` and "Save". */
async function recordFee(page, app, submissionId, option) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {WorkflowPaymentsMenu} = require('../../../pages/PaymentsPages.js');
    const workflow = new WorkflowPage(page, app.contextPath);
    await workflow.gotoEditorial(submissionId);
    await idle(page);
    const menu = new WorkflowPaymentsMenu(page);
    await menu.open();
    const chosen = async () => {
        for (const o of ['Waived', 'Paid', 'Unpaid']) if (await menu.radio(o).isChecked()) return o;
        return null;
    };
    const out = {arrivedOn: await chosen()};
    const response = await menu.saveOption(option);
    out.save = `${response.request().method()} ${rel(response.url())} ${response.status()}`;
    out.saved = flat(await menu.savedStatus().innerText().catch(() => null), 40);
    await shot(page, `fee-${option.toLowerCase()}-${submissionId}`).catch(() => {});
    // What the menu arrives on after a reload: the record.
    await workflow.gotoEditorial(submissionId);
    await idle(page);
    await menu.open();
    out.afterReload = await chosen();
    return out;
}

/** The "Payments" page › "Payments": the list's rows as cells. */
async function paymentsList(page, app) {
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const payments = new JournalPaymentsPage(page, app.contextPath);
    await payments.gotoTab('Payments');
    await idle(page);
    record('payments-list', await screen(page));
    return payments.listRows().evaluateAll((rows) => rows.map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
}

/**
 * As the signed-in Author: My Submissions, "Tasks", the rows; then, when the fee task for `title` is
 * there, press it and read the page it opens; with `notify`, press "Send notification of payment" too.
 */
async function authorTask(page, app, title, name, {notify = false} = {}) {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/mySubmissions`));
    await idle(page);
    const tasks = new TasksPanel(page);
    await tasks.bell().first().waitFor({state: 'visible', timeout: T});
    const out = {bell: flat(await tasks.bell().first().innerText(), 40)};
    await tasks.open();
    out.rows = await tasks.rowTexts();
    record(`${name}-tasks`, {...(await screen(page)), rows: out.rows});
    await shot(page, `${name}-tasks`).catch(() => {});
    const row = tasks.row(FEE_DUE).filter({hasText: title});
    out.feeTask = await row.count();
    if (!out.feeTask) return out;
    await tasks.link(row.first()).click();
    await page.waitForURL((u) => /\/payment\/pay\/\d+/.test(u.pathname), {waitUntil: 'commit', timeout: T}).catch(() => {});
    await idle(page);
    const s = await screen(page);
    record(`${name}-payment-page`, s);
    await shot(page, `${name}-payment-page`).catch(() => {});
    out.opened = {url: rel(page.url()), heading: flat(await page.locator('h1').first().innerText().catch(() => null), 80), page: flat(await page.locator('.page').first().innerText().catch(() => null), 400)};
    const link = page.getByRole('link', {name: 'Send notification of payment', exact: true});
    out.opened.sendNotification = await link.count();
    if (notify && out.opened.sendNotification) {
        const since = Date.now() - 2000;
        await link.click();
        await idle(page);
        record(`${name}-notified`, await screen(page));
        out.notified = {url: rel(page.url()), page: flat(await page.locator('.page').first().innerText().catch(() => null), 200)};
        out.notified.mail = await notificationMail(page, app, since);
    }
    return out;
}

/**
 * "Manual Payment Notification" emails the journal's principal contact got since `since` (polls up to
 * 20 s): recipient, sender and subject. Every fleet of a slot mails one mailbox, so the read is scoped
 * by the contact's address and the time.
 */
async function notificationMail(page, app, since) {
    const to = await sql(app, "SELECT setting_value FROM journal_settings WHERE setting_name = 'contactEmail' LIMIT 1");
    const end = Date.now() + 20_000;
    for (;;) {
        const r = await app.mail._search({to, subject: 'Manual Payment Notification'}).catch(() => ({messages: []}));
        const fresh = (r.messages || []).filter((m) => new Date(m.Created).getTime() >= since);
        if (fresh.length || Date.now() > end) return fresh.map((m) => ({to, from: m.From && m.From.Address, subject: m.Subject}));
        await sleep(2000);
    }
}

/** What is stored, read only: fee requests waiting, the fee tasks, the fee records. */
async function stored(app) {
    return {
        queuedPayments: await sql(app, 'SELECT count(*) FROM queued_payments'),
        feeTasks: await sql(app, 'SELECT user_id, assoc_id FROM notifications WHERE type = 16777256 ORDER BY assoc_id, user_id'),
        completed: await sql(app, 'SELECT user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name FROM completed_payments ORDER BY completed_payment_id'),
    };
}

module.exports = {T, FEE_DUE, sleep, flat, rel, setUpPayments, setApc, acceptRequestingFee, recordFee, paymentsList, authorTask, stored};
