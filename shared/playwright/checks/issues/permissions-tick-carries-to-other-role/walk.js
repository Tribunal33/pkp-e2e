// U35 A9 walk (issue report docs/issues/U35-A9-permissions-tick-carries-to-other-role.md).
// On PKP's default test dataset, as dbarnes, on a submission (OJS 4, OMP 3, OPS 1). On the
// preprint server the Author role's "Permit submission metadata edit." is first switched off under
// Settings > Users & Roles > "Roles" (a journal and a press install it off).
//   A. the steps: "Assign", the section-editor role, "Search", Minoti Inoue ("Permissions" shown
//      ticked, the role's default); "Author", "Search", an author: the box is read; "OK"; the
//      row's "Edit" is read.
//   B. the control: a window opened afresh, "Author", "Search", another author: the box is read;
//      "Cancel".
//   C. the neighbour check (the same with and without the fix): "Author", "Search", a person
//      (unticked); the box ticked by hand; another person of the same role (the tick stays); the
//      section-editor role, "Search", Minoti Inoue (ticked, the role's default); "OK".
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/permissions-tick-carries-to-other-role/walk.js
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.id, storedBefore: H.stored(app, c.id)};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (c.roleOff) {
            facts.authorPermitWasOn = await H.setRolePermit(page, app, 'Author', false);
            record('00-roles', await screen(page));
        }

        // A. the steps
        let panel = await H.openWorkflow(page, app, c.id);
        let win = await panel.openAssign();
        await idle(page);
        facts.roles = await win.roleOptions();
        facts.opened = await H.boxes(win);
        await H.roleAndSearch(win, c.onRole);
        await win.choosePerson(c.editor);
        facts.afterEditorChosen = await H.boxes(win);
        record('01-editor-chosen', await screen(page));
        await win.chooseRole('Author');
        facts.afterRoleChanged = await H.boxes(win);
        await win.search();
        await win.choosePerson(c.author);
        facts.afterAuthorChosen = await H.boxes(win);
        record('02-author-chosen', await screen(page));
        facts.posted = await H.pressOk(page, win);
        facts.storedAfter = H.stored(app, c.id);
        const edit = await H.editShows(page, panel, c.author, 'Author');
        facts.edit = edit.out;
        record('03-edit', await screen(page));
        await edit.win.cancel();

        // B. the control
        panel = await H.openWorkflow(page, app, c.id);
        win = await panel.openAssign();
        await idle(page);
        await H.roleAndSearch(win, 'Author');
        await win.choosePerson(c.control);
        facts.control = await H.boxes(win);
        record('04-control', await screen(page));
        await win.cancel();

        // C. the neighbour check
        panel = await H.openWorkflow(page, app, c.id);
        win = await panel.openAssign();
        await idle(page);
        const n = {};
        await H.roleAndSearch(win, 'Author');
        await win.choosePerson(c.n1);
        n.authorChosen = await H.boxes(win);
        await win.metadataBox().check();
        await win.choosePerson(c.n2);
        n.sameRoleOtherPersonAfterHandTick = await H.boxes(win);
        await H.roleAndSearch(win, c.onRole);
        await win.choosePerson(c.editor);
        n.editorChosen = await H.boxes(win);
        record('05-neighbour', await screen(page));
        n.posted = await H.pressOk(page, win);
        n.stored = H.stored(app, c.id);
        facts.neighbour = n;
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
