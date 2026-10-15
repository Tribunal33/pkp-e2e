// Issue report docs/issues/U50-A19-issue-data-save-drops-publish-time.md (U50 A19): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OJS only (OMP
// and OPS have no issues).
//   1. sign in as dbarnes
//   2. Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue", box unticked, "OK"
//   3. "Create Issue": Volume 3, Number 1, Year 2016, Title "hkk21", "Save"
//   4. "Vol. 3 No. 1 (2016): hkk21" › "Publish Issue", box unticked, "OK"
//   5. "Back Issues": the list and its "Published" column
//   6. "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Data": "Date Published" as shown; "Save"
//   7. "Back Issues": the list again
// Expected: step 7 lists the issues as step 5 does (hkk21, 2015, 2014).
// The stored Date Published of each issue is read beside steps 5 and 7 (evidence for the Cause).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-data-save-drops-publish-time/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, and PROBE_RUN=r35 in front of the run
// Facts: .reports/<feature>/<id>/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const TITLE = 'hkk21';
const NEW = `Vol. 3 No. 1 (2016): ${TITLE}`;
const SAVED = 'Vol. 2 No. 1 (2015)';
const EXPECTED = [TITLE, SAVED, 'Vol. 1 No. 2 (2014)'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, expected: EXPECTED};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        await L.publishIssue(page, app.contextPath, SAVED);
        // 3
        f.step3 = await L.createIssue(page, app.contextPath, {volume: 3, number: 1, year: 2016, title: TITLE});
        // 4
        await L.publishIssue(page, app.contextPath, NEW);
        // 5
        f.step5 = await L.backIssues(page, app.contextPath);
        f.stored5 = L.storedDates(app);
        await L.snap(page, 'step5-back-issues');
        // 6
        f.step6 = await L.saveIssueData(page, app.contextPath, SAVED, 'step6');
        // 7
        f.step7 = await L.backIssues(page, app.contextPath);
        f.stored7 = L.storedDates(app);
        await L.snap(page, 'step7-back-issues');
        const order = (list) => list.map((r) => EXPECTED.findIndex((e) => r.includes(e)));
        f.result = {
            step5Expected: order(f.step5).join() === '0,1,2',
            step7Expected: order(f.step7).join() === '0,1,2',
        };
        for (const k of ['step5', 'step7', 'stored5', 'stored7']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] step3 ${f.step3} step6 ${JSON.stringify(f.step6)} result ${JSON.stringify(f.result)}`);
    } finally {
        record('walk-facts', f);
        await close();
    }
});
