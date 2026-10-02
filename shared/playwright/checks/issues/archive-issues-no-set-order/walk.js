// Issue report docs/issues/U50-A13-archive-issues-no-set-order.md (U50 A13): the report's Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OJS only (OMP and OPS have
// no issues).
//   1. sign in as dbarnes
//   2. Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue", box unticked, "OK"
//   3. "Create Issue": Volume 3, Number 1, Year 2016, Title "u50a13", "Save"
//   4. "Vol. 3 No. 1 (2016): u50a13" › "Publish Issue", box unticked, "OK"
//   5. "Back Issues": the list
//   6. header "Archives": the list
//   7. "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Issue Data" › "Save"
//   8. "Back Issues": the list again (unchanged)
//   9. "Archives": the list again
// Expected: steps 6 and 9 list the issues as steps 5 and 8 do (2016 current, 2015, 2014).
// (The save of step 7 keeps the issue's date and drops its time of day; the 2014 issue stays the
// oldest, so "Back Issues" does not change. Saving the 2015 issue instead would put it below the
// 2014 one on "Back Issues", both dated the same day in the dataset.)
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/archive-issues-no-set-order/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, and PROBE_RUN=r35 in front of the run
// Facts: .reports/<feature>/<id>/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const NEW = 'Vol. 3 No. 1 (2016): u50a13';
const EXPECTED = ['u50a13', 'Vol. 2 No. 1 (2015)', 'Vol. 1 No. 2 (2014)'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', expected: EXPECTED};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        await L.publishIssue(page, app.contextPath, 'Vol. 2 No. 1 (2015)');
        // 3
        f.step3 = await L.createIssue(L.issuesAdmin(page, app.contextPath), {volume: 3, number: 1, year: 2016, title: 'u50a13'});
        // 4
        await L.publishIssue(page, app.contextPath, NEW);
        // 5
        f.step5 = await L.backIssues(page, app.contextPath);
        await L.snap(page, 'step5-back-issues');
        // 6
        f.step6 = await L.archives(page, app.contextPath, 'step6');
        // 7
        f.step7 = await L.saveIssueData(page, app.contextPath, 'Vol. 1 No. 2 (2014)');
        // 8
        f.step8 = await L.backIssues(page, app.contextPath);
        // 9
        f.step9 = await L.archives(page, app.contextPath, 'step9');
        const same = (list) => list.length === EXPECTED.length && EXPECTED.every((e, i) => list[i].includes(e));
        f.result = {step5Expected: same(f.step5), step6Expected: same(f.step6), step8Expected: same(f.step8), step9Expected: same(f.step9)};
        for (const k of ['step5', 'step6', 'step8', 'step9']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] result ${JSON.stringify(f.result)} step3 ${f.step3} step7 ${f.step7}`);
    } finally {
        record('walk-facts', f);
        await close();
    }
});
