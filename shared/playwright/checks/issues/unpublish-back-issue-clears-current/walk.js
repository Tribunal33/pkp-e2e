// Issue report docs/issues/U50-A2-unpublish-back-issue-clears-current-issue.md (U50 A2): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OJS only
// (OMP and OPS have no issues).
//   1-4. sign in as dbarnes; Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue",
//        the email box unticked, "OK"
//   5.   home page › "Current" (control: "Vol. 2 No. 1 (2015)")
//   6-7. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Unpublish Issue" › "OK"
//   8.   "Back Issues": the links each row's arrow offers
//   9.   home page › "Current"
//   10.  "Archives"
// Expected: step 8 offers no "Current Issue" on "Vol. 2 No. 1 (2015)"; step 9 opens "Vol. 2 No. 1 (2015)".
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u50a2 PROBE_AGENT=u50a2 node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u50a2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u50a2-3_5 PROBE_AGENT=u50a2 node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js
// Facts: .reports/<feature>/u50a2/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const OLD = 'Vol. 1 No. 2 (2014)';
const NEW = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes'); // 1
        await L.publishIssue(page, app.contextPath, NEW); // 2-4
        f.step4rows = await L.backIssueRows(page, app.contextPath);
        await L.snap(page, 'step4-back-issues');
        f.step5 = await L.readerCurrent(page, app.contextPath, 'step5'); // 5
        f.step7status = await L.unpublishIssue(page, app.contextPath, OLD); // 6-7
        f.step8rows = await L.backIssueRows(page, app.contextPath); // 8
        await L.snap(page, 'step8-back-issues');
        f.step9 = await L.readerCurrent(page, app.contextPath, 'step9'); // 9
        f.step10 = await L.readerArchives(page, app.contextPath, 'step10'); // 10
        f.result = {
            controlCurrentIsNew: f.step5.current.heading.includes(NEW),
            step8NewOffersCurrentIssue: (f.step8rows[NEW] || []).includes('Current Issue'),
            step9Heading: f.step9.current.heading,
            expected: f.step9.current.heading.includes(NEW) && !(f.step8rows[NEW] || []).includes('Current Issue'),
        };
        for (const k of ['step4rows', 'step5', 'step7status', 'step8rows', 'step9', 'step10', 'result']) {
            console.log(`[fact] ${f.line} ${k}: ${JSON.stringify(f[k])}`);
        }
    } finally {
        record('walk-facts', f);
        await close();
    }
});
