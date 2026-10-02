// Neighbour checks for the fix of U50 A5, A6 (fix.diff), walked with the fix in and out: what the
// fix must leave as it is. OJS, PKP's default test dataset:
//   dbarnes, Issues › "Create Issue": Volume 32767 (the largest the column holds), Number 1,
//   Year 2026, "Title" unticked, "Save": the issue is created;
//   "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Data" › "Save" unchanged: saved.
// Reset the dataset fleet first; the check adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-big-volume-or-lettered-year/neighbour.js
const {forEachApp, launch, signIn, record, sql, note} = require('../../../probe');
const {createIssue, resaveIssueData} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a5 neighbour: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        facts.largestVolume = await createIssue(page, app.contextPath, {volume: '32767', number: '1', year: '2026'}, 'n-max');
        facts.resave = await resaveIssueData(page, app.contextPath, 'Vol. 2 No. 1 (2015)', 'n-resave');
        facts.stored = await sql(app, 'SELECT issue_id, volume, number, year FROM issues ORDER BY issue_id');
    } finally {
        record('neighbour', facts);
        await close();
    }
});
