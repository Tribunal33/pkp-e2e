// Issue report docs/issues/U51-A20-full-issue-asks-fee-of-no-amount.md (U51 A20) {OJS}: the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// Preconditions, as dbarnes:
//   a. Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   b. Settings › Distribution › "Payments": "Enable", USD, "Manual Fee Payment", instructions, "Save"
//   c. "Payments" › "Payment Types": "Association Membership" 7, the other fees empty, "Save"
//   d. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   e. the same issue › "Issue Galleys" › "Create Issue Galley": "PDF", u51sb4-issue.pdf, "Save"
// Steps:
//   1. sign in as ccorino (Reader, no subscription)
//   2. the issue's page from "Archives": press the "Full Issue" "PDF"
//   3. press "Send notification of payment" (the journal's contact gets the notification)
//   4. control: back on the issue, press "Antimicrobial…"'s "PDF"
// Neighbour: neighbour.js beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-sb4 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb4-3_5 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/walk.js
// Facts: .reports/<feature>/sb4/a20-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, screen, shot, sql} = require('../../../probe');
const L = require('../non-pdf-galley-shown-open-refused/lib');

const PDF_ARTICLE = 'Antimicrobial';
const CONTACT = 'rvaca@mailinator.com';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const queued = () => sql(app, 'select queued_payment_id, payment_data from queued_payments order by queued_payment_id').split('\n').filter(Boolean).map((l) => L.flat(l, 400));
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        fact('a access', await L.requireSubscriptions(page));
        fact('b payments', await L.setUpPayments(page, app));
        fact('c payment types', await L.setPaymentTypes(page, app, {fees: {'Association Membership': 7}}));
        fact('d issue access', await L.restrictIssue(page));
        fact('e issue galley', await L.createIssueGalley(page, {label: 'PDF', file: L.PDF('u51sb4-issue.pdf')}));
        fact('queued payments before', queued());
        await signIn(page, 'ccorino');
        await L.openIssue(page, app);
        fact('2 links', await L.readLinks(page));
        fact('2 Full Issue PDF', await L.pressLink(page, 'Full Issue', 'PDF'));
        record('a20-payment-page', await screen(page));
        await shot(page, 'a20-payment-page').catch(() => {});
        fact('queued payments after', queued());
        const notify = page.getByRole('link', {name: 'Send notification of payment', exact: true});
        if (await notify.count()) {
            const since = Date.now();
            await notify.click();
            await page.waitForLoadState('load').catch(() => {});
            fact('3 notification sent', await L.landed(page));
            const m = await app.mail.find({to: CONTACT, timeoutMs: 20_000}).catch((e) => ({error: e.message}));
            if (m && m.ID) {
                const full = await app.mail.fullMessage(m.ID);
                fact('3 mail to the contact', {subject: m.Subject, from: (m.From || {}).Address, created: m.Created, fresh: Date.parse(m.Created) >= since - 5000, text: L.flat(full.Text, 700)});
            } else fact('3 mail to the contact', m);
        }
        await L.openIssue(page, app);
        fact('4 control article PDF', await L.pressLink(page, PDF_ARTICLE, 'PDF'));

        await signOut(page);
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
        await shot(page, 'a20-failed').catch(() => {});
    } finally {
        record(process.env.PROBE_NAME || 'a20-facts', f);
        await close();
    }
});
