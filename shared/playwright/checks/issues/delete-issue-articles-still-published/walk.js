// Issue report docs/issues/U50-A12-delete-issue-articles-still-published.md (U50 A12): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OJS only
// (OMP and OPS have no issues).
//   1-2. sign in as dbarnes; open submission 17 (control: "Published", "View", "Status: Published")
//   3-5. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Delete" › "OK"
//   6.   submission 17: the header, the page it lands on, the version node's status
//   7.   "Activity Log": History (the lines the delete added, newest first)
//   8.   signed out: the article's page /article/view/17 (control before the delete: 200)
// Also read (not a step): submission 1, whose published 1.0 and unpublished 1.1 sat in the issue.
// Expected: 6 the header no longer reads "Published", no "Return to Workflow"; 7 History gains
// "The submission was unpublished."; 8 answers 404.
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a12 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u50a12 PROBE_AGENT=u50a12 node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-still-published/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u50a12-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u50a12-3_5 PROBE_AGENT=u50a12 node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-still-published/walk.js
// Facts: .reports/<feature>/u50a12/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const reader = await launch(app); // a second browser, never signed in: the reader
    page.setDefaultTimeout(L.T);
    try {
        f.before17page = await L.readArticlePage(reader.page, app, 17);
        f.before1page = await L.readArticlePage(reader.page, app, 1);
        await signIn(page, 'dbarnes'); // 1
        f.before17 = await L.readWorkflow(page, app, 17, 'step2-workflow-17'); // 2
        f.before17history = await L.history(page, app, 'step2-history-17');
        f.before1 = await L.readWorkflow(page, app, 1, 'before-workflow-1');
        f.before1history = await L.history(page, app, 'before-history-1');
        f.delete = await L.deleteIssue(page, app, 'Back Issues', L.ISSUE); // 3-5
        f.step6 = await L.readWorkflow(page, app, 17, 'step6-workflow-17'); // 6
        const h17 = await L.history(page, app, 'step7-history-17'); // 7
        f.step7added = h17.slice(0, h17.length - f.before17history.length);
        f.step8 = await L.readArticlePage(reader.page, app, 17); // 8
        f.after1 = await L.readWorkflow(page, app, 1, 'after-workflow-1');
        const h1 = await L.history(page, app, 'after-history-1');
        f.after1added = h1.slice(0, h1.length - f.before1history.length);
        f.after1page = await L.readArticlePage(reader.page, app, 1);
        const unpub = (lines) => (lines || []).filter((l) => /unpublished|removed from publication/i.test(l));
        f.result = {
            headerStage: f.step6.stage,
            headerButtons: f.step6.buttons,
            status: f.step6.status,
            added17: f.step7added,
            articlePage: f.step8.status,
            expected: f.step8.status === 404 && f.step6.stage !== 'Published' && unpub(f.step7added).length > 0,
        };
        for (const k of ['before17page', 'before17', 'before1', 'delete', 'step6', 'step7added', 'step8', 'after1', 'after1added', 'after1page', 'result']) {
            console.log(`[fact] ${f.line} ${k}: ${JSON.stringify(f[k])}`);
        }
    } finally {
        record('walk-facts', f);
        await reader.close();
        await close();
    }
});
