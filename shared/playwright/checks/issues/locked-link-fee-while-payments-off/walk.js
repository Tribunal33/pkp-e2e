// Issue report docs/issues/U51-A19-locked-link-fee-while-payments-off.md (U51 A19) {OJS}: the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing. Helpers:
// ../issue-contents-lock-galleys-reader-can-open/lib.js.
//
// Preconditions, as dbarnes:
//   C1 Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   C2 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   C3 the same issue › "Issue Galleys" › "Create Issue Galley": "PDF", u51sb5-issue.pdf, "Save"
//   P1 Settings › Distribution › "Payments": "Enable", USD, "Manual Fee Payment", instructions, "Save"
//   P2 "Payments" › "Payment Types": "Purchase Article" 5, "Purchase Issue" 20, "Save"
//   P3 Settings › Distribution › "Payments": untick "Enable", "Save"
// Steps:
//   1 signed out, "Archives" › the issue: the links   2 "Signalling Theory Dividends": its link
//   3 still signed out, press the article's "PDF" (Login)
//   4 as ccorino: press the article's "PDF", then the "Full Issue" "PDF"
// Control (the fix must leave it): "Enable" ticked again: the price on the links, and ccorino's
//   press opens "Manual Fee Payment".
// Way round: payments off again, the "Payments" page opened by its address (no menu entry),
//   "Payment Types": both fees emptied, "Save"; the links read "PDF" without a price.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb5 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-sb5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/locked-link-fee-while-payments-off/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb5-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb5-3_5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/locked-link-fee-while-payments-off/walk.js
// Facts: .reports/<feature>/sb5/a19-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const L = require('../issue-contents-lock-galleys-reader-can-open/lib');

const ARTICLE = 'Signalling Theory Dividends';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const brief = (links) => L.named(links).map((l) => `${l.where} | ${l.text} | ${l.iconName}${l.screenReader ? ` | sr "${l.screenReader}"` : ''}`);
    const landing = (r) => ({url: r.url, title: r.title, heading: r.heading, notice: r.notice, message: r.message, paymentTable: r.paymentTable, viewer: r.viewer, navigations: r.navigations});
    const readAll = async (who) => {
        await L.openIssue(page, app);
        fact(`${who} 1 issue links`, brief(await L.readLinks(page)));
        record(`a19-issue-${who}`, await screen(page));
        await L.snap(page, `a19-issue-${who}`);
        await L.openArticle(page, app, ARTICLE);
        fact(`${who} 2 article page links`, brief(await L.readLinks(page)));
        await L.snap(page, `a19-article-${who}`);
    };
    const pressBoth = async (who) => {
        await L.openIssue(page, app);
        fact(`${who} 3 article PDF`, landing(await L.press(page, ARTICLE, 'PDF')));
        await L.snap(page, `a19-${who}-article-pdf`);
        await L.openIssue(page, app);
        fact(`${who} 3 Full Issue PDF`, landing(await L.press(page, 'Full Issue', 'PDF')));
    };
    try {
        await signIn(page, 'dbarnes');
        fact('C1 access', await L.requireSubscriptions(page));
        fact('C2 issue access', await L.restrictIssue(page));
        fact('C3 issue galley', await L.createIssueGalley(page, {label: 'PDF', file: L.PDF('u51sb5-issue.pdf')}));
        fact('P1 payments', await L.setUpPayments(page, app));
        fact('P2 payment types', await L.setPaymentTypes(page, app, {fees: {'Purchase Article': 5, 'Purchase Issue': 20}}));
        fact('P3 payments off', await L.setPaymentsEnabled(page, app, false));
        await signOut(page);
        await readAll('visitor');
        await L.openIssue(page, app);
        fact('visitor 7b article PDF', landing(await L.press(page, ARTICLE, 'PDF')));
        await signIn(page, 'ccorino');
        await pressBoth('ccorino');

        // Neighbour: payments on again, the fee shows and the press leads to the payment page.
        await signIn(page, 'dbarnes');
        fact('neighbour payments on', await L.setPaymentsEnabled(page, app, true));
        await signOut(page);
        await readAll('neighbour visitor');
        await signIn(page, 'ccorino');
        await pressBoth('neighbour ccorino');

        // Way round: payments off again; the "Payments" page opened by its address, the fees emptied.
        await signIn(page, 'dbarnes');
        fact('way round payments off', await L.setPaymentsEnabled(page, app, false));
        await page.goto(app.url(`/index.php/${app.contextPath}/en/payments`));
        await page.waitForLoadState('load').catch(() => {});
        fact('way round payments page by address', {url: L.rel(page.url()), title: L.flat(await page.title(), 120)});
        await L.snap(page, 'a19-payments-by-address');
        fact('way round fees emptied', await L.setPaymentTypes(page, app, {fees: {'Purchase Article': '', 'Purchase Issue': ''}}));
        await signOut(page);
        await readAll('way round visitor');
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
        await L.snap(page, 'a19-failed');
    } finally {
        record(process.env.PROBE_NAME || 'a19-facts', f);
        await close();
    }
});
