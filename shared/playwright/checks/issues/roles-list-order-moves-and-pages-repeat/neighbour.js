// Issue report docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md (U54 A13): the
// neighbour check of the proposed fix (fix.diff beside this file), walked with the fix in and out
// on PKP's default test dataset as `rvaca`. The fix gives the "Roles" list an order and must change
// nothing else: the same roles under each filter, the same count lines, and a role made with
// "Create New Role" listed last.
//   The whole list; "Search" > "With permission level set to" "Assistant"; a reload and "List roles
//   assigned to" "Production"; a reload, "Create New Role" ("Assistant", "u54d Data editor",
//   "U54D"), "OK"; a reload.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54d --dataset 3 --reset
// Run:          PROBE_RUN=<nofix|fix> PROBE_FEATURE=issues-u54d PROBE_AGENT=u54d node bin/probe.js all shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/neighbour.js
// Facts: .reports/<feature>/u54d/neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const H = require('./lib.js');

const NEW_ROLE = {name: 'u54d Data editor', abbrev: 'U54D', level: 'Assistant'};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);
        await tab.goto();
        facts.all = await H.listed(tab);
        await tab.chooseFilter('level', 'Assistant');
        facts.levelAssistant = await H.listed(tab);
        await tab.reload();
        await tab.chooseFilter('stage', 'Production');
        facts.stageProduction = await H.listed(tab);
        await tab.reload();
        facts.created = await H.createRole(tab, NEW_ROLE);
        facts.created.at = H.place(facts.created.listAfter.names, NEW_ROLE.name);
        await tab.reload();
        facts.afterReload = await H.listed(tab);
        facts.afterReload.createdAt = H.place(facts.afterReload.names, NEW_ROLE.name);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
