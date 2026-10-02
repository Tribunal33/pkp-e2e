// U54 A2 neighbour check for the fix (issue report docs/issues/U54-A2-manager-role-row-shows-no-stage.md):
// a journal (press) created now installs its roles from registry/userGroups.xml. A scratch context
// is built through the _test API with a manager of its own (the dataset is not changed otherwise);
// its manager opens Settings > Users & Roles > "Roles" and every row's ticked stages are read.
// With the fix only the manager role's row changes (every stage ticked); without it that row is empty.
//   ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-role-row-shows-no-stage/neighbour.js
const {forEachApp, launch, signIn, signOut, record, screen, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const path = tag('u54h');
    await app.api.createContext({tag: path, users: [{username: `${path}mgr`, roles: ['manager']}]});
    const facts = {app: app.name, line: app.line || 'main', scratchContext: path};
    const {page, close} = await launch(app);
    try {
        await signIn(page, `${path}mgr`, {password: `${path}mgr${path}mgr`, contextPath: path});
        const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
        const tab = new RolesTab(page, path, {stages: c.stages});
        await tab.goto();
        facts.rows = await H.rowsState(tab);
        record('n1-new-context-roles', await screen(page));
        await signOut(page);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
