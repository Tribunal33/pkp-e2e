// Issue report docs/issues/U50-A8-future-issues-number-as-text.md (U50 A8): "Future Issues" compares
// the issue number as text. Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS
// have no issues): dbarnes, Issues; "Create Issue" Vol. 2 No. 2 (2015) and Vol. 2 No. 10 (2015),
// "Title" unticked; read "Future Issues".
// Reset the dataset fleet first; the walk adds two issues.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/future-issues-number-as-text/walk.js
const {forEachApp, launch, signIn, record, sql, note} = require('../../../probe');
const {issueList, createIssues} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a8 walk: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        facts.before = await issueList(page, app.contextPath, 'Future Issues', 'a8-before');
        facts.created = await createIssues(page, app.contextPath, [
            {volume: '2', number: '2', year: '2015'},
            {volume: '2', number: '10', year: '2015'},
        ], 'a8-create');
        facts.futureIssues = await issueList(page, app.contextPath, 'Future Issues', 'a8-future');
        facts.stored = await sql(app, 'SELECT issue_id, volume, number, year, published FROM issues ORDER BY issue_id');
    } finally {
        record('walk', facts);
        await close();
    }
});
