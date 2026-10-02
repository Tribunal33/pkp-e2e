// U54 A3 walk (issue report docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md).
// On PKP's default test dataset, as dbarnes (OJS submission 4, OMP submission 3, both in the
// Submission stage):
//   A. the steps: "Assign" on the submission (the role list read); Settings > Users & Roles >
//      "Roles", the "Production editor" row read; its "Edit", nothing changed, "OK"; the row read
//      on the page and after a reload; "Assign" again.
//   N. the neighbour checks (the same with and without the fix): N1 "Copyeditor" > "Edit", tick
//      "Production", "OK" (the row reads Copyediting and Production); N2 "Create New Role" at the
//      manager level, "u54b manager" / "U54B", "OK" (the row reads every stage).
//   ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/walk.js
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

const ROLE = 'Production editor';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) {
        console.log(`${app.name}: no case (a preprint server has one stage)`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', storedBefore: H.storedStages(app, ROLE)};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // A. the steps
        facts.assignBefore = await H.assignRoles(page, app, c.id);
        let tab = await H.rolesTab(page, app);
        facts.rowBefore = await H.ticked(tab, ROLE);
        facts.rowBeforeAllGreyed = await H.allGreyed(tab, ROLE);
        record('01-roles-before', await screen(page));
        const win = await tab.openEdit(ROLE);
        facts.windowStageSectionVisible = await win.stageSection.isVisible();
        record('02-edit-window', await screen(page));
        facts.save = await H.saveWindow(page, win);
        facts.notices = (await screen(page)).notices;
        facts.rowAfter = await H.ticked(tab, ROLE);
        await tab.reload();
        facts.rowAfterReload = await H.ticked(tab, ROLE);
        record('03-roles-after', await screen(page));
        facts.storedAfter = H.storedStages(app, ROLE);
        facts.assignAfter = await H.assignRoles(page, app, c.id);
        record('04-assign-after', await screen(page));

        // N1. a role below the manager level keeps saving its window's stage boxes
        const n = {};
        tab = await H.rolesTab(page, app);
        n.copyeditorBefore = await H.ticked(tab, 'Copyeditor');
        let w = await tab.openEdit('Copyeditor');
        await w.stageBox('Production').check();
        n.copyeditorSave = await H.saveWindow(page, w);
        await tab.reload();
        n.copyeditorAfter = await H.ticked(tab, 'Copyeditor');

        // N2. a role created at the manager level gets every stage
        w = await tab.openCreate();
        await w.chooseLevel(c.managerLevel);
        n.createStageSectionVisible = await w.stageSection.isVisible();
        await w.nameBox().fill('u54b manager');
        await w.abbrevBox().fill('U54B');
        n.createSave = await H.saveWindow(page, w);
        await tab.reload();
        n.createdRow = await H.ticked(tab, 'u54b manager');
        record('05-neighbour', await screen(page));
        facts.neighbour = n;
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
