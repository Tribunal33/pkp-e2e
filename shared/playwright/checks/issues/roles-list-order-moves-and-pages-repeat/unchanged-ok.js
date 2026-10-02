// Issue report docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md (U54 A13): the
// check that an "OK" with nothing changed leaves a role in its place, on PKP's default test
// dataset as `rvaca`: the "Roles" list read; "Copyeditor"'s (OPS: "Author"'s) "Settings" > "Edit",
// "OK" with nothing changed; the list read at once and after a reload.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54d --dataset 3 --reset
// Run:          PROBE_FEATURE=issues-u54d PROBE_AGENT=u54d node bin/probe.js all shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/unchanged-ok.js
// Facts: .reports/<feature>/u54d/unchanged-ok-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const role = H.CASES[app.name].saved;
    const facts = {app: app.name, line: app.line || 'main', role};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);
        await tab.goto();
        facts.before = await H.listed(tab);
        facts.before.at = H.place(facts.before.names, role);
        const win = await tab.openEdit(role);
        facts.status = (await win.save()).status();
        facts.afterOk = await H.listed(tab);
        facts.afterOk.at = H.place(facts.afterOk.names, role);
        await tab.reload();
        facts.afterReload = await H.listed(tab);
        facts.afterReload.at = H.place(facts.afterReload.names, role);
    } finally {
        record('unchanged-ok', facts);
        console.log(JSON.stringify({app: app.name, role, before: facts.before && facts.before.at, afterOk: facts.afterOk && facts.afterOk.at, afterReload: facts.afterReload && facts.afterReload.at, sameOrder: facts.afterReload && JSON.stringify(facts.before.names) === JSON.stringify(facts.afterReload.names)}));
        await close();
    }
});
