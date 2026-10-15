// The report's fallback Steps (U50 A19), for a dataset whose 2015 issue carries no Date Published
// later on the 2014 issue's day: two issues published on the walk's own day, below a third.
//   1. sign in as dbarnes
//   2. "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Data": "Date Published" emptied, "Save"
//   3. "Vol. 2 No. 1 (2015)" › "Publish Issue", box unticked, "OK"
//   4. "Create Issue": Volume 3, Number 1, Year 2016, Title "hkk21", "Save"; publish it the same way
//   5. "Create Issue": Volume 4, Number 1, Year 2017, Title "hkk21b", "Save"; publish it the same way
//   6. "Back Issues": the list and its "Published" column
//   7. "Vol. 3 No. 1 (2016): hkk21" › "Edit" › "Issue Data": "Save" with nothing changed
//   8. "Back Issues": the list again
// Expected: step 8 lists the issues as step 6 does (hkk21b, hkk21, 2015, 2014).
//
// Run: PROBE_RUN=fallback PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-data-save-drops-publish-time/fallback.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const SAVED = 'Vol. 3 No. 1 (2016): hkk21';
const EXPECTED = ['hkk21b', SAVED, 'Vol. 2 No. 1 (2015)', 'Vol. 1 No. 2 (2014)'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('fallback.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, expected: EXPECTED};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        f.step2 = await L.saveIssueData(page, app.contextPath, 'Vol. 2 No. 1 (2015)', 'fb-step2', '', 'Future Issues');
        await L.publishIssue(page, app.contextPath, 'Vol. 2 No. 1 (2015)');
        f.step4 = await L.createIssue(page, app.contextPath, {volume: 3, number: 1, year: 2016, title: 'hkk21'});
        await L.publishIssue(page, app.contextPath, SAVED);
        f.step5 = await L.createIssue(page, app.contextPath, {volume: 4, number: 1, year: 2017, title: 'hkk21b'});
        await L.publishIssue(page, app.contextPath, 'Vol. 4 No. 1 (2017): hkk21b');
        f.step6 = await L.backIssues(page, app.contextPath);
        f.stored6 = L.storedDates(app);
        f.step7 = await L.saveIssueData(page, app.contextPath, SAVED, 'fb-step7');
        f.step8 = await L.backIssues(page, app.contextPath);
        f.stored8 = L.storedDates(app);
        await L.snap(page, 'fb-step8-back-issues');
        const order = (list) => list.map((r) => EXPECTED.findIndex((e) => r.includes(e))).join();
        f.result = {step6Expected: order(f.step6) === '0,1,2,3', step8Expected: order(f.step8) === '0,1,2,3'};
        for (const k of ['step6', 'step8', 'stored6', 'stored8']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] step2 ${JSON.stringify(f.step2)} step7 ${JSON.stringify(f.step7)} result ${JSON.stringify(f.result)}`);
    } finally {
        record('fallback-facts', f);
        await close();
    }
});
