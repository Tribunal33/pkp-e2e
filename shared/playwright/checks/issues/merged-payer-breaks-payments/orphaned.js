// Fix check for docs/issues/U52-A11-merged-payer-breaks-payments.md (U52 A11): a
// payment record an earlier, unfixed merge already left without a user (user_id
// NULL, what the foreign key's ON DELETE SET NULL writes) must read again with the
// fix in. OJS, run right after neighbour.js on the same fleet (payments set up,
// "Paid" on submission 9): the record of submission 9 is set to NULL, then as rvaca
// the "Payments" tab, submission 9's "Payments" menu and its "Schedule For
// Publication" window are read.
// Run: PROBE_FEATURE=issues-w42 PROBE_AGENT=w42 PROBE_RUN=fix node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments/orphaned.js
const {forEachApp, launch, signIn, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const ctx = app.contextPath;
    sql(app, "update completed_payments set user_id = null where assoc_id = 9 and payment_type = 7");
    console.log('[fact] db', sql(app, "select completed_payment_id, assoc_id, coalesce(user_id::text, 'NULL') from completed_payments order by 1").replace(/\n/g, ' ; '));
    const {page, close} = await launch(app);
    const errors = [];
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 120)}`); });
    try {
        await signIn(page, 'rvaca');
        const pp = new JournalPaymentsPage(page, ctx);
        await pp.goto();
        await pp.tab('Payments').click();
        await sleep(4000);
        await idle(page);
        console.log('[fact] list', JSON.stringify((await pp.panel('Payments').locator('tr.gridRow').allInnerTexts()).map((x) => flat(x))));
        const pubId = sql(app, 'select current_publication_id from submissions where submission_id = 9');
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=9&workflowMenuKey=publication_${pubId}_titleAbstract`));
        await idle(page);
        await sleep(2000);
        const err = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        console.log('[fact] error window', await err.count());
        await page.locator('.pkpWorkflow__submissionPayments button').filter({hasText: /^\s*Payments\s*$/}).first().click();
        await page.locator('.pkpWorkflow__submissionPayments input[type=radio]').first().waitFor({timeout: 8000}).catch(() => {});
        console.log('[fact] menu', JSON.stringify(await page.locator('.pkpWorkflow__submissionPayments .pkpDropdown__content').evaluate((el) => [...el.querySelectorAll('input[type=radio]')].map((r) => `${((r.closest('label') || r.parentElement).innerText || '').trim()}${r.checked ? '*' : ''}`)).catch(() => [])));
        console.log('[fact] server errors', JSON.stringify(errors));
    } finally {
        await close();
    }
});
