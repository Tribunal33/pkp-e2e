// U54 A2 walk (issue report docs/issues/U54-A2-manager-role-row-shows-no-stage.md).
// On PKP's default test dataset (OJS, OMP; OPS the control):
//   A. as dbarnes, Settings > Users & Roles > "Roles": every row's ticked stages read (the manager
//      role's and the editor role's among them, the neighbours unchanged by a fix); "Search", each
//      stage under "List roles assigned to", the rows listed.
//   B. as dbarnes, "Assign" on a submission in the Submission stage and one in Production: the role list.
//   C. as rvaca (the manager role only), the submission in Production: each stage of the workflow menu.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-role-row-shows-no-stage/walk.js
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', storedManager: H.storedStages(app, c.manager)};
    if (c.editor) {
        facts.storedEditor = H.storedStages(app, c.editor);
    }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // A. the Roles list
        const tab = await H.rolesTab(page, app);
        facts.columns = await tab.columns();
        facts.rows = await H.rowsState(tab);
        record('01-roles', await screen(page));
        facts.stageFilter = await H.stageFilterLists(tab);
        record('02-filtered-last', await screen(page));

        // B. Assign Participant
        facts.assign = {};
        for (const id of [c.inSubmission, c.inProduction].filter(Boolean)) {
            facts.assign[id] = await H.assignRoles(page, app, id);
        }
        record('03-assign', await screen(page));
        await signOut(page);

        // C. what the manager role's member opens
        await signIn(page, 'rvaca');
        facts.rvacaStages = await H.stageAccess(page, app, c.inProduction);
        record('04-rvaca-workflow', await screen(page));
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
