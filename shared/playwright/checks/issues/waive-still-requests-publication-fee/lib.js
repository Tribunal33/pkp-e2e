// Helpers of walk.js (issue report docs/issues/U34-OJS1-waive-still-requests-publication-fee.md).
// Requiring this file runs nothing. Every helper presses what a person presses; the payments set-up,
// the author's Tasks read and the page objects are the U52 A2 walk's (../fee-task-stays-after-fee-recorded/lib.js).
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');
const U52 = require('../fee-task-stays-after-fee-recorded/lib');

const {T, FEE_DUE, sleep, flat, rel, setUpPayments, setApc, authorTask, recordFee, paymentsList, stored} = U52;
const PAYMENT_MAIL = 'Payment Request Notification';

/**
 * Open the submission, press the decision `button`, choose `choice` on the "Request Payment" page,
 * "Continue" to the last page, "Record Decision" (completion window `title`). Returns what the
 * payment page offered, the decisions POST's own form body (the browser's traffic, read not built)
 * and the completion window's text. Never throws past a step: what a step could not do is recorded.
 */
async function decideWithPayment(page, app, submissionId, {button, choice, title}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {DecisionWizardPage} = require(path.join(app.suiteDir, 'pages', 'DecisionWizardPages.js'));
    const workflow = new WorkflowPage(page, app.contextPath);
    await workflow.gotoEditorial(submissionId);
    await idle(page);
    await workflow.actionButton(button).click();
    const wizard = new DecisionWizardPage(page);
    await wizard.heading().waitFor({state: 'visible', timeout: T});
    await wizard.currentStep().getByRole('radio').first().waitFor({state: 'visible', timeout: T});
    const out = {heading: flat(await wizard.heading().innerText(), 120)};
    out.steps = await wizard.stepItems().allInnerTexts().then((a) => a.map((t) => flat(t, 60))).catch(() => null);
    const radios = () =>
        wizard
            .currentStep()
            .getByRole('radio')
            .evaluateAll((els) => els.map((e) => `${e.checked ? '(x)' : '( )'} ${(e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()}`));
    out.offered = await radios();
    await wizard.currentStep().getByRole('radio', {name: choice}).check();
    out.chosen = await radios();
    record(`request-payment-${submissionId}`, await screen(page));
    await shot(page, `request-payment-${submissionId}`).catch(() => {});
    for (let i = 0; i < 5 && !(await wizard.recordButton.isVisible()); i++) {
        await wizard.continueStep();
        await sleep(500);
    }
    const posted = page.waitForRequest((r) => r.url().includes('/decisions') && r.method() === 'POST', {timeout: 60_000}).catch(() => null);
    const answered = page.waitForResponse((r) => r.url().includes('/decisions') && r.request().method() === 'POST', {timeout: 60_000}).catch(() => null);
    const dialog = await wizard.recordDecision(title);
    const req = await posted;
    const res = await answered;
    if (req) {
        const body = new URLSearchParams(req.postData() || '');
        out.posted = {contentType: req.headers()['content-type'], payment: [...body.entries()].filter(([k]) => /^actions\[\d+\]\[(id|requestPayment)\]$/.test(k)).map(([k, v]) => `${k}=${v}`)};
    }
    out.decision = res ? res.status() : null;
    out.completion = flat(await dialog.innerText(), 220);
    return out;
}

/** Settings › Distribution › "Payments": the choices "Payment Plugins" offers, read only. */
async function pluginChoices(page, app) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    await tab.goto();
    return tab.pluginSelect().locator('option').allInnerTexts();
}

/** The workflow header's "Payments" menu, read only: which choice it arrives on. */
async function paymentsMenu(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {WorkflowPaymentsMenu} = require('../../../pages/PaymentsPages.js');
    const workflow = new WorkflowPage(page, app.contextPath);
    await workflow.gotoEditorial(submissionId);
    await idle(page);
    const menu = new WorkflowPaymentsMenu(page);
    await menu.open();
    for (const o of ['Waived', 'Paid', 'Unpaid']) if (await menu.radio(o).isChecked()) return o;
    return null;
}

/**
 * The emails `to` got since `since`: the decision's own letter (`decisionSubject`, the bound that the
 * decision's mail went out) and every "Payment Request Notification", with sender. The payment mail
 * is polled for 15 s after the bound, so "none" means none arrived in that time.
 */
async function authorMail(app, to, since, decisionSubject) {
    const out = {};
    const d = await app.mail.find({to, subject: decisionSubject, since, timeoutMs: 30_000}).catch(() => null);
    out.decisionMail = d ? d.Subject : null;
    const end = Date.now() + 15_000;
    let msgs = [];
    for (;;) {
        const r = await app.mail._search({to, subject: PAYMENT_MAIL, since}).catch(() => ({messages: []}));
        msgs = r.messages || [];
        if (msgs.length || Date.now() > end) break;
        await sleep(1500);
    }
    out.paymentMail = msgs.map((m) => ({from: m.From && `${m.From.Name} <${m.From.Address}>`, subject: m.Subject}));
    return out;
}

module.exports = {T, FEE_DUE, PAYMENT_MAIL, flat, rel, setUpPayments, setApc, authorTask, recordFee, paymentsList, stored, pluginChoices, decideWithPayment, paymentsMenu, authorMail};
