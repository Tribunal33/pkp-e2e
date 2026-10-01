// Issue report docs/issues/U63-OJS1-doaj-issue-window-wrong-heading.md (U63 OJS1): the DOAJ
// list's issue link opens the issue's window headed "DOI Plugin Settings". Takes the report's
// Steps through the screens on a dataset fleet freshly reset to PKP's default test dataset:
//   1. sign in as dbarnes
//   2. Tools › "DOAJ Export Plugin"
//   3. "Articles"
//   4. in the row of "Signalling Theory Dividends", press "Vol. 1 No. 2 (2014)"
// then the control: Issues › "Back Issues" › "Vol. 1 No. 2 (2014)".
// OMP and OPS have no DOAJ tool: no surface, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir21 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir21 PROBE_AGENT=ir21 node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-wrong-heading/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir21-3_5, and PROBE_RUN=r35
// in front of the run.
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const doajLib = require('../doaj-deposit-takes-other-journals-articles/lib.js');
const {flat, closeWindow, pressIssueInDoajList, pressIssueOnIssuesPage} = require('./lib.js');

const TITLE = 'Signalling Theory Dividends';
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[doaj] ${app.name}: no DOAJ tool, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2, 3
        fact('2 open', await doajLib.openDoaj(page, app, ctx, 'Articles'));
        fact('3 list', await doajLib.readList(page));
        record('doaj-3-articles', await screen(page));
        // 4
        fact('4 window', await pressIssueInDoajList(page, TITLE, ISSUE));
        record('doaj-4-window', await screen(page));
        await shot(page, 'doaj-4-window').catch(() => {});
        await closeWindow(page);
        // Control: the Issues page's own link to the same window.
        fact('control window', await pressIssueOnIssuesPage(page, app, ctx, 'Back Issues', ISSUE));
        record('doaj-control-window', await screen(page));
        await shot(page, 'doaj-control-window').catch(() => {});
        await closeWindow(page);
    } finally {
        record('doaj-facts', facts);
        await close();
    }
});
