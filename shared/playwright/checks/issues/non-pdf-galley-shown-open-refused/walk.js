// Issue report docs/issues/U51-A14-non-pdf-galley-shown-open-refused.md (U51 A14) {OJS}: the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// Preconditions, as dbarnes:
//   a. Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   b. Settings › Distribution › "Payments": "Enable", USD, "Manual Fee Payment", instructions, "Save"
//   c. "Payments" › "Payment Types": tick "Only Restrict Access to PDF version of issues and
//      articles", every fee empty, "Save"
//   d. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   e. the same issue › "Issue Galleys" › "Create Issue Galley": "HTML", u51sb4-issue.html, "Save"
//   f. submission 5 "Genetic transformation of forest trees": Publication › "Galleys" › "Add
//      galley" "HTML", "Article Text", u51sb4-article.html; published into the issue
//      [3.5: Publication › "Issue" › "Assign to Issue", then "Publish"]
// Steps:
//   1-2. signed out, the issue's page from "Archives": the links as shown
//   3. press "Genetic transformation…"'s "HTML"     4. press the "Full Issue" "HTML"
//   5. as ccorino (Reader, no subscription): 3 and 4 again
// Neighbour reads (every run; the fix must leave them as they are): "Antimicrobial…"'s "PDF"
//   pressed signed out and as ccorino (locked, refused); the box unticked: "HTML" locked and
//   refused for the visitor.
// Control: "Purchase Article" 5 and "Purchase Issue" 20 with the box ticked: the visitor opens both HTML.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-sb4 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb4-3_5 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/walk.js
// Facts: .reports/<feature>/sb4/a14-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, screen, shot} = require('../../../probe');
const L = require('./lib');

const ARTICLE = 'Genetic transformation';
const PDF_ARTICLE = 'Antimicrobial';

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
    const pressBoth = async (who) => {
        await L.openIssue(page, app);
        fact(`${who} links`, await L.readLinks(page));
        record(`a14-issue-${who}`, await screen(page));
        fact(`${who} 3 article HTML`, await L.pressLink(page, ARTICLE, 'HTML'));
        await shot(page, `a14-${who}-article-html`).catch(() => {});
        await L.openIssue(page, app);
        fact(`${who} 4 Full Issue HTML`, await L.pressLink(page, 'Full Issue', 'HTML'));
        await shot(page, `a14-${who}-issue-html`).catch(() => {});
        await L.openIssue(page, app);
        fact(`${who} neighbour article PDF`, await L.pressLink(page, PDF_ARTICLE, 'PDF'));
    };
    try {
        await signIn(page, 'dbarnes');
        fact('a access', await L.requireSubscriptions(page));
        fact('b payments', await L.setUpPayments(page, app));
        fact('c payment types', await L.setPaymentTypes(page, app, {onlyPdf: true}));
        fact('d issue access', await L.restrictIssue(page));
        fact('e issue galley', await L.createIssueGalley(page, {label: 'HTML', file: L.HTML('u51sb4-issue.html', 'u51sb4 Full Issue')}));
        fact('f article galley', await L.addArticleGalley(page, app, 5, {label: 'HTML', file: L.HTML('u51sb4-article.html', 'u51sb4 Article')}));
        fact('f publish 5', await L.publishIntoIssue(page, app, 5));
        await signOut(page);
        await pressBoth('visitor');
        await signIn(page, 'ccorino');
        await pressBoth('ccorino');

        // Neighbour: the box unticked, the HTML is locked and refused (before and after the fix).
        await signIn(page, 'dbarnes');
        fact('neighbour box unticked', await L.setPaymentTypes(page, app, {onlyPdf: false}));
        await signOut(page);
        await L.openIssue(page, app);
        fact('neighbour unticked links', await L.readLinks(page));
        fact('neighbour unticked article HTML', await L.pressLink(page, ARTICLE, 'HTML'));

        // Control: the box ticked with both purchase fees set.
        await signIn(page, 'dbarnes');
        fact('control fees', await L.setPaymentTypes(page, app, {onlyPdf: true, fees: {'Purchase Article': 5, 'Purchase Issue': 20}}));
        await signOut(page);
        await L.openIssue(page, app);
        fact('control links', await L.readLinks(page));
        fact('control article HTML', await L.pressLink(page, ARTICLE, 'HTML'));
        await L.openIssue(page, app);
        fact('control Full Issue HTML', await L.pressLink(page, 'Full Issue', 'HTML'));
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
        await shot(page, 'a14-failed').catch(() => {});
    } finally {
        record(process.env.PROBE_NAME || 'a14-facts', f);
        await close();
    }
});
