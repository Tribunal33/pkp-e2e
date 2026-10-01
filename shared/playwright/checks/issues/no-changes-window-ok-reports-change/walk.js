// U35 A12 walk (issue report docs/issues/U35-A12-no-changes-window-ok-reports-change.md).
// On PKP's default test dataset: dbarnes (Journal editor; Press editor; Preprint Server manager)
// opens a submission (OJS 4, OMP 4, OPS 1; on OPS he first assigns himself, the dataset assigns no
// manager there), presses "Edit" on his own row, ticks "Assignment privileges" and presses "OK".
// He presses "Edit" on the row again: the window now reads "No changes can be made to this
// participant"; its buttons are read and "OK" is pressed when it can be.
// The neighbour check, the same with and without the fix: the first "OK" above (a window with a
// box saves and says so), and rvaca (a manager who is not recommending) unticking the box on the
// same row and pressing "OK".
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/no-changes-window-ok-reports-change/walk.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const id = c.submissionId;
    const state = () => ({stored: H.stored(app, id), logEntries: H.logEntries(app, id)});
    const facts = {app: app.name, line: app.line || 'main', submissionId: id, before: state()};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (c.assign) {
            facts.assignNotices = await H.assign(page, app, c);
            facts.afterAssign = state();
        }
        // 3-4. his own row: the box, ticked, "OK"
        let edit = await H.openEdit(page, app, {submissionId: id, name: c.name, label: '01-first'});
        facts.first = edit.out;
        await edit.win.locator('input[name="recommendOnly"]').check();
        facts.firstOk = await H.pressOk(page, edit.win, '01-first');
        facts.afterFirst = state();
        // 5-6. the row again: "No changes can be made to this participant", "OK"
        edit = await H.openEdit(page, app, {submissionId: id, name: c.name, label: '02-no-changes'});
        facts.second = edit.out;
        facts.secondOk = await H.pressOk(page, edit.win, '02-no-changes');
        facts.afterSecond = state();
        await H.openWorkflow(page, app, id);
        facts.rowAfterSecond = await H.rowLines(page, c.name);
        await signOut(page);

        // Control and neighbour: a manager who is not recommending, on the same row
        await signIn(page, 'rvaca');
        edit = await H.openEdit(page, app, {submissionId: id, name: c.name, label: '03-manager'});
        facts.manager = edit.out;
        await edit.win.locator('input[name="recommendOnly"]').uncheck();
        facts.managerOk = await H.pressOk(page, edit.win, '03-manager');
        facts.afterManager = state();
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
