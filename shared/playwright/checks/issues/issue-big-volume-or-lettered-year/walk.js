// Issue report docs/issues/U50-A5-A6-issue-big-volume-or-lettered-year.md (U50 A5, A6): the
// "Create Issue" form checks "Volume" and "Year" less strictly than the integer columns that store
// them. Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS have no issues):
//   dbarnes, Issues › "Create Issue": Volume 99999, Number 1, Year 2026, "Title" unticked, "Save";
//   "Cancel"; "Create Issue": Volume 3, Number 1, Year "20a6", "Title" unticked, "Save";
//   the new row's "Edit" › "Issue Data".
// Reset the dataset fleet first; the walk adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-big-volume-or-lettered-year/walk.js
const {forEachApp, launch, signIn, record, sql, note} = require('../../../probe');
const {serverLog, serverErrorsSince, createIssue, issueData} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a5 walk: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');

        // Volume (A5)
        const mark = serverLog(app);
        facts.volume = await createIssue(page, app.contextPath, {volume: '99999', number: '1', year: '2026'}, 'a5');
        facts.volume.serverLog = serverErrorsSince(mark);

        // Year (A6)
        facts.year = await createIssue(page, app.contextPath, {volume: '3', number: '1', year: '20a6'}, 'a6');
        const name = facts.year.futureIssues.find((n) => /^Vol\. 3 No\. 1/.test(n));
        facts.year.issueData = name ? await issueData(page, app.contextPath, name, 'a6') : null;

        facts.stored = await sql(app, 'SELECT issue_id, volume, number, year FROM issues ORDER BY issue_id');
    } finally {
        record('walk', facts);
        await close();
    }
});
