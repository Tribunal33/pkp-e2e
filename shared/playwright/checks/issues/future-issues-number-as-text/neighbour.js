// Neighbour check for the fix of U50 A8 (docs/issues/U50-A8-future-issues-number-as-text.md): year and
// volume still lead the "Future Issues" order, a number that is not digits still lists, and
// "Back Issues" keeps its order. Same reading with the fix in and out.
// Reset the dataset fleet first; the check adds three issues.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/future-issues-number-as-text/neighbour.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {issueList, createIssues} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a8 neighbour: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        facts.created = await createIssues(page, app.contextPath, [
            {volume: '3', number: '1', year: '2015'},
            {volume: '1', number: '1', year: '2016'},
            {volume: '2', number: 'Suppl', year: '2015'},
        ], 'a8n-create');
        facts.futureIssues = await issueList(page, app.contextPath, 'Future Issues', 'a8n-future');
        facts.backIssues = await issueList(page, app.contextPath, 'Back Issues', 'a8n-back');
    } finally {
        record('neighbour', facts);
        await close();
    }
});
