// Neighbour checks for docs/issues/U50-A4-refused-save-date-published-today.md (U50 A4), run with
// the fix in and out, on PKP's default test dataset, OJS:
//   (1) a typed date survives a refused "Save": "Create Issue" with "Date Published" 2025-04-01,
//       Volume abc, Number 1, Year 2026, "Title" unticked, "Save" (refused); the box still reads
//       2025-04-01; Volume 4, "Save"; the issue is stored with 2025-04-01;
//   (2) a date that is set still prints: the reader's current issue page, "Published:" line, and
//       the "Published" column of "Back Issues".
// Reset the dataset fleet first; (1) adds an issue.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/refused-save-date-published-today/neighbour.js
const {forEachApp, launch, signIn, signOut, record, note, idle} = require('../../../probe');
const {flat, issuesAdmin, snap, readDate, save, storedDate} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        note(`u50a4 neighbour: ${app.name} skipped, no issues`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        const issues = issuesAdmin(page, app.contextPath);
        await issues.goto('Future Issues');
        const {form} = await issues.openCreate();
        await form.typeDate('2025-04-01');
        await form.volumeBox().fill('abc');
        await form.numberBox().fill('1');
        await form.yearBox().fill('2026');
        await form.setShowBoxes({Title: false});
        facts.typedRefused = await save(page, form, 'n1-typed-refused');
        await form.volumeBox().fill('4');
        facts.typedSaved = await save(page, form, 'n1-typed-saved');
        facts.typedStored = storedDate(app, 4, '1');

        await issues.goto('Back Issues');
        await issues.showTab('Back Issues');
        facts.backIssuesPublished = flat(await issues.published('Vol. 1 No. 2 (2014)').innerText().catch((e) => `unread: ${e.message.split('\n')[0]}`));
        await signOut(page).catch(() => {});
        await page.goto(app.url(`/index.php/${app.contextPath}/issue/current`));
        await idle(page).catch(() => {});
        facts.readerPublishedLine = flat(await page.locator('.obj_issue_toc .published').first().innerText().catch(() => '(none)'));
        await snap(page, 'n2-reader-current-issue');
    } finally {
        record('neighbour', facts);
        await close();
    }
});
