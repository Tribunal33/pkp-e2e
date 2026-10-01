// Issue report docs/issues/U52-A2-fee-task-stays-after-fee-recorded.md (U52 A2):
// after an editor records an author's publication fee as "Paid" or "Waived",
// the author's task "The publication fee is due for payment." stays and still
// opens the payment page, whose "Send notification of payment" still emails
// the journal. Takes the report's Steps through the screens on a dataset fleet
// (PKP's default test dataset, freshly reset), OJS only (the one app with the
// surface):
//   preconditions, as rvaca: payments on (USD, "Manual Fee Payment",
//   instructions), APC 50; as dbarnes: submission 4 › "Accept and Skip Review"
//   with "Request publication fee (50 USD)".
//   1. as cmontgomerie, the Tasks bell (control);
//   2. as dbarnes, submission 4 › "Payments" › "Paid" › "Save";
//   3–4. as cmontgomerie, the Tasks bell, the task pressed;
//   5. "Send notification of payment" (rvaca's mailbox before and after);
//   6. the "Payment Request Notification" email's link;
//   7. as dbarnes, "Payments" › "Waived" › "Save";
//   8. as cmontgomerie, the Tasks bell, the task pressed.
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the steps are the same.
// Run: PROBE_FEATURE=issues-w45 PROBE_AGENT=w45 node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js
//      (reset first: npm run fleet-prep -- --feature issues-w45 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w45-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, record} = require('../../../probe');
const L = require('./lib.js');

const SID = 4;
const TITLE = 'Computer Skill Requirements for New and Existing Teachers';
const AUTHOR = 'cmontgomerie';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (app.name !== 'ojs') return;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    const responses = [];
    page.on('response', (r) => {
        if (r.status() >= 500) responses.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)});
    });
    try {
        const since = new Date(Date.now() - 2000);
        await L.setUpPayments(page, app);
        fact('precondition: fee requested', await L.acceptRequestingFee(page, app, SID, '0-request-payment'));
        fact('1 tasks, fee requested (control)', await L.feeTask(page, app, AUTHOR, TITLE, '1-control', {press: false}));
        fact('2 Paid saved', await L.recordFee(page, app, SID, 'Paid', '2-paid-saved'));
        fact('3-4 task after Paid', await L.feeTask(page, app, AUTHOR, TITLE, '4-task-after-paid'));
        if (facts['3-4 task after Paid'].opened && facts['3-4 task after Paid'].opened.notifyButton) {
            fact('5 notification after Paid', await L.sendNotification(page, app, '5-notification'));
        } else {
            fact('5 notification after Paid', 'no "Send notification of payment" to press');
        }
        const link = await L.feeLinkFromMail(app, AUTHOR, since);
        fact('6 email link', link ? await L.openFeeLink(page, link, '6-email-link') : 'no link in the email');
        fact('7 Waived saved', await L.recordFee(page, app, SID, 'Waived', '7-waived-saved'));
        fact('8 task after Waived', await L.feeTask(page, app, AUTHOR, TITLE, '8-task-after-waived'));
    } finally {
        fact('server errors', responses);
        record('facts', facts);
        await close();
    }
});
