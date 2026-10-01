// Neighbour check for U50 A2's fix: unpublishing the CURRENT issue, with another published issue
// left, still leaves the journal with no current issue (spec U50 Rule 18; the fix must leave this
// path alone). PKP's default test dataset, as `dbarnes`, OJS only.
//   1-4. as walk.js: publish "Vol. 2 No. 1 (2015)" (it becomes current)
//   5-6. Issues › "Back Issues" › "Vol. 2 No. 1 (2015)" › "Unpublish Issue" › "OK"
//   7.   "Back Issues": the links each row's arrow offers
//   8.   home page › "Current"
// Expected, fix in or out: "Vol. 1 No. 2 (2014)" offers "Current Issue"; "Current" opens "No Current Issue".
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a2 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-u50a2 PROBE_AGENT=u50a2 node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const OLD = 'Vol. 1 No. 2 (2014)';
const NEW = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        await L.publishIssue(page, app.contextPath, NEW);
        f.status = await L.unpublishIssue(page, app.contextPath, NEW);
        f.rows = await L.backIssueRows(page, app.contextPath);
        await L.snap(page, 'neighbour-back-issues');
        f.reader = await L.readerCurrent(page, app.contextPath, 'neighbour');
        f.result = {
            oldOffersCurrentIssue: (f.rows[OLD] || []).includes('Current Issue'),
            noCurrentIssue: /No Current Issue/.test(f.reader.current.heading),
        };
        for (const k of ['status', 'rows', 'reader', 'result']) console.log(`[fact] ${f.line} ${k}: ${JSON.stringify(f[k])}`);
    } finally {
        record('neighbour-facts', f);
        await close();
    }
});
