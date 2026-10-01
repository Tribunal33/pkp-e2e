// Neighbour check of the fix for docs/issues/U51-A20-full-issue-asks-fee-of-no-amount.md {OJS}:
// the fix must leave an issue that does have a fee as it is. Same preconditions as walk.js, with
// "Purchase Issue" 20 saved beside "Association Membership" 7; ccorino presses the "Full Issue"
// "PDF" (the payment page for "Purchase Issue Fee", "20.00 (USD)"), and a signed-out visitor
// presses it (the Login page with the issue-purchase message).
//
// Reset first:  npm run fleet-prep -- --feature issues-sb4 --dataset 4 --reset
// Run:          PROBE_FEATURE=issues-sb4 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('../non-pdf-galley-shown-open-refused/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[neighbour] ${app.name}: no subscriptions; not walked`);
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        fact('a access', await L.requireSubscriptions(page));
        fact('b payments', await L.setUpPayments(page, app));
        fact('c payment types', await L.setPaymentTypes(page, app, {fees: {'Association Membership': 7, 'Purchase Issue': 20}}));
        fact('d issue access', await L.restrictIssue(page));
        fact('e issue galley', await L.createIssueGalley(page, {label: 'PDF', file: L.PDF('u51sb4-issue.pdf')}));
        await signIn(page, 'ccorino');
        await L.openIssue(page, app);
        fact('ccorino Full Issue PDF', await L.pressLink(page, 'Full Issue', 'PDF'));
        await signOut(page);
        await L.openIssue(page, app);
        fact('visitor Full Issue PDF', await L.pressLink(page, 'Full Issue', 'PDF'));
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
    } finally {
        record(process.env.PROBE_NAME || 'a20-neighbour', f);
        await close();
    }
});
