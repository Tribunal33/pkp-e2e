// Issue report docs/issues/U63-OJS10-export-issues-list-no-order.md (U63 OJS10): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OJS only (OMP
// and OPS have no issues).
//   1. sign in as dbarnes
//   2. Tools › Import/Export › "Native XML Plugin" › "Export Issues": the list as the dataset loads
//   3. Issues › "Future Issues" › "Create Issue": Volume 3, Number 1, Year 2016, Title "u63ir16", "Save"
//   4. "Create Issue": Volume 1, Number 1, Year 2013, Title "u63ir16", "Save" (control: both tabs' order)
//   5. "Native XML Plugin" › "Export Issues": the list
//   6. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Issue Data" › "Save"
//   7. "Native XML Plugin" › "Export Issues": the list again
//   8. "PubMed XML Export Plugin" › "Export Issues": the list
// Expected: "Vol. 1 No. 2 (2014)", "Vol. 2 No. 1 (2015)" at step 2; "Vol. 1 No. 2 (2014)",
// "Vol. 1 No. 1 (2013)…", "Vol. 2 No. 1 (2015)", "Vol. 3 No. 1 (2016)…" at steps 5, 7 and 8 (the
// created issues' names carry their title).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir16 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir16 PROBE_AGENT=ir16 node bin/probe.js ojs shared/playwright/checks/issues/export-issues-list-no-order/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir16-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir16-3_5 PROBE_AGENT=ir16 node bin/probe.js ojs shared/playwright/checks/issues/export-issues-list-no-order/walk.js
// Facts: .reports/<feature>/ir16/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const EXPECTED2 = ['Vol. 1 No. 2 (2014)', 'Vol. 2 No. 1 (2015)'];
const EXPECTED = ['Vol. 1 No. 2 (2014)', 'Vol. 1 No. 1 (2013)', 'Vol. 2 No. 1 (2015)', 'Vol. 3 No. 1 (2016)'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const f = {app: app.name, line: app.line || 'main', expected: {step2: EXPECTED2, later: EXPECTED}};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        // 1
        await signIn(page, 'dbarnes');
        const issues = new IssuesAdmin(page, app.contextPath);
        // 2
        await L.openExportIssues(app, page, 'native');
        f.step2 = await L.readIssueList(page);
        await L.snap(page, 'step2-native-export-issues');
        // 3, 4
        f.step3 = await L.createIssue(issues, {volume: 3, number: 1, year: 2016, title: 'u63ir16'});
        f.step4 = await L.createIssue(issues, {volume: 1, number: 1, year: 2013, title: 'u63ir16'});
        f.issuesPage = await L.issuesPageOrder(issues);
        await L.snap(page, 'step4-back-issues');
        // 5
        await L.openExportIssues(app, page, 'native');
        f.step5 = await L.readIssueList(page);
        await L.snap(page, 'step5-native-export-issues');
        // 6
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', 'Vol. 1 No. 2 (2014)');
        const form = await win.openData();
        f.step6 = (await form.save()).status();
        await L.sleep(500);
        // 7
        await L.openExportIssues(app, page, 'native');
        f.step7 = await L.readIssueList(page);
        await L.snap(page, 'step7-native-export-issues');
        // 8
        await L.openExportIssues(app, page, 'pubmed');
        f.step8 = await L.readIssueList(page);
        await L.snap(page, 'step8-pubmed-export-issues');
        const same = (a, exp) => a.issues.length === exp.length && exp.every((e, i) => a.issues[i].startsWith(e));
        f.result = {step2Expected: same(f.step2, EXPECTED2), step5Expected: same(f.step5, EXPECTED), step7Expected: same(f.step7, EXPECTED), step8Expected: same(f.step8, EXPECTED)};
        for (const k of ['step2', 'step5', 'step7', 'step8']) console.log(`[fact] ${f.line} ${k}: ${f[k].issues.join(' | ')}`);
        console.log(`[fact] issues page ${JSON.stringify(f.issuesPage)}`);
        console.log(`[fact] result ${JSON.stringify(f.result)}`);
    } finally {
        record('walk-facts', f);
        await close();
    }
});
