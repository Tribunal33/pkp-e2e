// Neighbour checks for docs/issues/U50-A1-create-issue-ticked-title-passing-notice.md (U50 A1), run
// with the fix in and out: on "Create Issue",
//   (1) "Title" unticked and empty: "Save" creates "Vol. 3 No. 1 (2026)" (the fix must not refuse it);
//   (2) "Year" ticked and empty, "Title" unticked: refused with "Year is required …", and where the
//       message shows (the same check as the Title's, on the next part).
// Reset the dataset fleet first; (1) adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/neighbour.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {createIssue} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a1 neighbour: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        facts.titleUnticked = await createIssue(page, app.contextPath, {volume: '3', number: '1', year: '2026', show: {Title: false}}, 'n1');
        facts.yearEmpty = await createIssue(page, app.contextPath, {volume: '4', number: '1', year: '', show: {Title: false}}, 'n2');
    } finally {
        record('neighbour', facts);
        await close();
    }
});
