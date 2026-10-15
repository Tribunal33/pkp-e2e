// Neighbour check for the U50 A19 fix (fix.diff): a changed "Date Published" is still stored.
// Runs alone, on a freshly reset dataset fleet, with the fix in and out:
//   1–4 as walk.js (publish 2015, create and publish "hkk21", which becomes the current issue)
//   5. "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Data": "Date Published" changed to the day before
//      the one it shows, "Save"
//   6. "Back Issues": the list and its "Published" column
// Expected with and without the fix: the 2015 issue shows the new day in "Published" and sits
// below the 2014 issue; its stored date is that day at midnight.
//
// Run: PROBE_RUN=nb-in|nb-out PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-data-save-drops-publish-time/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const TITLE = 'hkk21';
const NEW = `Vol. 3 No. 1 (2016): ${TITLE}`;
const SAVED = 'Vol. 2 No. 1 (2015)';
const OLDER = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        await L.publishIssue(page, app.contextPath, SAVED);
        f.create = await L.createIssue(page, app.contextPath, {volume: 3, number: 1, year: 2016, title: TITLE});
        await L.publishIssue(page, app.contextPath, NEW);
        f.before = await L.backIssues(page, app.contextPath);
        f.storedBefore = L.storedDates(app);
        // 5: the box's day, minus one
        const issues = L.issuesAdmin(page, app.contextPath);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', SAVED);
        const form = await win.openData();
        const shown = await form.dateBox().inputValue();
        const day = (shown.match(/\d{4}-\d{2}-\d{2}/) || [null])[0];
        f.target = day ? L.dayBefore(day) : null;
        f.step5 = await L.saveIssueData(page, app.contextPath, SAVED, 'nb-step5', f.target);
        // 6
        f.after = await L.backIssues(page, app.contextPath);
        f.storedAfter = L.storedDates(app);
        await L.snap(page, 'nb-step6-back-issues');
        const row = f.after.find((r) => r.startsWith(SAVED)) || '';
        f.result = {
            newDayShown: !!f.target && row.includes(f.target),
            belowOlder: f.after.findIndex((r) => r.startsWith(SAVED)) > f.after.findIndex((r) => r.startsWith(OLDER)),
            storedMidnight: f.storedAfter.some((r) => r.startsWith('2|1|2015|1|') && r.endsWith(`${f.target} 00:00:00`)),
        };
        for (const k of ['before', 'after', 'storedBefore', 'storedAfter']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] shown ${shown} target ${f.target} step5 ${JSON.stringify(f.step5)} result ${JSON.stringify(f.result)}`);
    } finally {
        record('neighbour-facts', f);
        await close();
    }
});
