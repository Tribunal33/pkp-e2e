// U35 A4 walk (issue report docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md).
// On PKP's default test dataset: dbarnes opens a submission (OJS 4, OMP 3, OPS 1), presses "Assign"
// in the "Participants" panel and, in the "Assign Participant" window,
//   A. presses "OK" with nobody chosen;
//   B. chooses the section-editor role, "Search", Minoti Inoue, then "Author" in the role list
//      without "Search", and presses "OK";
//   C. (the control) chooses the section-editor role, "Search", Minoti Inoue, and presses "OK".
// Each "OK" is read: what the form posted, the save's answer, the notices, the window and the
// stored assignments.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/walk.js
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.id, storedBefore: H.stored(app, c.id)};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = await H.openWorkflow(page, app, c.id);
        facts.rowsBefore = await panel.rowLines();
        const win = await panel.openAssign();
        await idle(page);
        facts.roleIds = await H.roleIds(win);
        facts.opened = await H.windowState(page, win);
        record('00-window', await screen(page));

        // A. nobody chosen
        facts.nobody = await H.pressOk(page, win, '01-nobody');
        facts.storedAfterNobody = H.stored(app, c.id);

        // B. a person from the previous role's list
        if (facts.nobody.window.open) {
            await win.chooseRole(c.role);
            await win.search();
            await win.choosePerson(c.person);
            await win.chooseRole(c.otherRole);
            facts.beforeOtherRoleOk = await H.windowState(page, win);
            record('02-other-role-chosen', await screen(page));
            facts.otherRole = await H.pressOk(page, win, '02-other-role');
            facts.storedAfterOtherRole = H.stored(app, c.id);
        }

        // C. control: the role, "Search", the person, "OK"
        if (!(await win.roleSelect().isVisible().catch(() => false))) {
            await panel.reland();
            await panel.openAssign();
        }
        await win.chooseRole(c.role);
        await win.search();
        await win.choosePerson(c.person);
        facts.control = await H.pressOk(page, win, '03-control');
        facts.storedAfterControl = H.stored(app, c.id);
        await panel.reland();
        await idle(page);
        facts.rowsAfter = await panel.rowLines();
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
