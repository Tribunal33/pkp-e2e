// Issue report docs/issues/U50-A1-create-issue-ticked-title-passing-notice.md (U50 A1): "Create
// Issue" arrives with "Title" ticked, and "Save" with no title is refused with only a passing notice.
// Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS have no issues):
//   dbarnes, Issues › "Create Issue": Volume 3, Number 1, Year 2026, "Title" empty and ticked as it
//   arrives, "Save"; the window and "Future Issues" read at once and after the notice has gone.
// Reset the dataset fleet first; with a fix applied the walk adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/walk.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {createIssue} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a1 walk: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        facts.title = await createIssue(page, app.contextPath, {volume: '3', number: '1', year: '2026'}, 'a1');
    } finally {
        record('walk', facts);
        await close();
    }
});
