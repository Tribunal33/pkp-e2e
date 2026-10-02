// Issue report docs/issues/U50-A4-refused-save-date-published-today.md (U50 A4): after "Save" is
// refused on "Create Issue" or "Issue Data", an empty "Date Published" shows today's date.
// Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS have no issues):
//   Creating: dbarnes, Issues › "Create Issue": "Date Published" empty, Volume abc, Number 1,
//   Year 2026, "Title" unticked, "Save" (refused); read the date; Volume 3, "Save"; reopen the
//   issue's "Issue Data" and read the date.
//   Editing: "Back Issues" › "Vol. 1 No. 2 (2014)" › "Issue Data": empty the date, "Save"
//   (refused); read the date; "Save" again.
// Records the visible box, the hidden field "Save" posts, the messages and the stored date.
// Reset the dataset fleet first; the walk adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/refused-save-date-published-today/walk.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {issuesAdmin, snap, readDate, save, storedDate, openIssueData} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a4 walk: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {today: new Date().toISOString().slice(0, 10)};
    try {
        // Creating an issue (steps 1-7).
        await signIn(page, 'dbarnes');
        const issues = issuesAdmin(page, app.contextPath);
        await issues.goto('Future Issues');
        const {dialog, form} = await issues.openCreate();
        facts.createOpen = await readDate(page, form);
        await form.volumeBox().fill('abc');
        await form.numberBox().fill('1');
        await form.yearBox().fill('2026');
        await form.setShowBoxes({Title: false});
        facts.createRefused = await save(page, form, 's4-create-refused');
        await form.volumeBox().fill('3');
        facts.createSaved = await save(page, form, 's6-create-saved');
        facts.createWindowOpenAfter = await dialog.isVisible();
        const data = await openIssueData(page, app.contextPath, 'Future Issues', 'Vol. 3 No. 1 (2026)');
        facts.createdIssueData = await readDate(page, data);
        await snap(page, 's7-created-issue-data');
        facts.createdStored = storedDate(app, 3, '1');

        // Editing a published issue (steps 8-11).
        await page.reload();
        const pub = await openIssueData(page, app.contextPath, 'Back Issues', 'Vol. 1 No. 2 (2014)');
        facts.publishedOpen = await readDate(page, pub);
        facts.publishedStoredBefore = storedDate(app, 1, '2');
        await pub.typeDate('');
        facts.publishedEmptied = await readDate(page, pub);
        facts.publishedRefused = await save(page, pub, 's9-published-refused');
        facts.publishedSavedAgain = await save(page, pub, 's11-published-save-again');
        facts.publishedStoredAfter = storedDate(app, 1, '2');
    } finally {
        record('walk', facts);
        await close();
    }
});
