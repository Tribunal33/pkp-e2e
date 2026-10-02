// Neighbour check for the U50 A12 fix (fix.diff): deleting an issue whose articles are only
// scheduled, not published. On PKP's default test dataset, as `dbarnes`, OJS only:
//   1. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Unpublish Issue" › "OK" (its articles
//      become scheduled, and leave the Done stage through unpublish())
//   2. submission 17: header, status, History (control)
//   3. Issues › "Future Issues" › "Vol. 1 No. 2 (2014)" › "Delete" › "OK"
//   4. submission 17: header, status, the History lines the delete added; the same for submission 1
// Without the fix the delete adds only "Submission metadata updated"; with it, the scheduled
// publication leaves through unpublish() as "Unschedule" does ("The submission was unpublished."),
// and submission 1's never-published 1.1 gets no such line. Walked with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a12 --dataset 3 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-u50a12 PROBE_AGENT=u50a12 node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-still-published/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        const {IssuesAdmin, ISSUES_TEXT, ISSUES_REQUEST} = require('../../../pages/IssuesPages.js');
        const issues = new IssuesAdmin(page, app.contextPath);
        await issues.goto('Back Issues');
        const q = await issues.openQuestion('Back Issues', L.ISSUE, 'Unpublish Issue', ISSUES_TEXT.unpublishQuestion);
        const r = await issues.answer(q, 'OK', ISSUES_REQUEST.unpublish);
        f.unpublishStatus = r ? r.status() : null;
        f.before17 = await L.readWorkflow(page, app, 17, 'n-before-workflow-17');
        const b17 = await L.history(page, app, 'n-before-history-17');
        f.before1 = await L.readWorkflow(page, app, 1, 'n-before-workflow-1');
        const b1h = await L.history(page, app, 'n-before-history-1');
        f.delete = await L.deleteIssue(page, app, 'Future Issues', L.ISSUE);
        f.after17 = await L.readWorkflow(page, app, 17, 'n-after-workflow-17');
        const a17 = await L.history(page, app, 'n-after-history-17');
        f.added17 = a17.slice(0, a17.length - b17.length);
        f.after1 = await L.readWorkflow(page, app, 1, 'n-after-workflow-1');
        const a1 = await L.history(page, app, 'n-after-history-1');
        f.added1 = a1.slice(0, a1.length - b1h.length);
        for (const k of ['unpublishStatus', 'before17', 'delete', 'after17', 'added17', 'after1', 'added1']) {
            console.log(`[fact] ${f.line} ${f.run} ${k}: ${JSON.stringify(f[k])}`);
        }
    } finally {
        record('neighbour-facts', f);
        await close();
    }
});
