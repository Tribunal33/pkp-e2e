// Neighbour check for docs/issues/U44-A9-urn-assign-offered-without-edit-permission.md: what the fix must leave alone.
// A participant who is not a manager but whose assignment carries "Permissions" (`dbuskins`, Section Editor on OJS
// submission 1, Series Editor on OMP submission 1) still gets "Assign" live on the version's "Identifiers" page,
// and "Assign", "Save" store the URN; "Clear", "Save" then remove it. Walked with the fix in and out.
// Run on a freshly loaded dataset, after the walk's preconditions (the script sets them up itself):
//   PROBE_FEATURE=issues PROBE_AGENT=neighbour node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/neighbour.js
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const cfg = L.SETUP[app.name];
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    const {user, submission: sid, version} = cfg.withPerm;
    const pid = L.pubIdOf(app, sid, version);
    fact('submission', {sid, version, pid, assignments: L.assignments(app, sid)});
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `n-${String(++n).padStart(2, '0')}-${x}`;
    try {
        await L.signIn(page, 'rvaca');
        const pre = await L.configureUrn(page, app, nm('pre-urn-settings'), {kinds: cfg.kinds, suffix: 'default', checkNo: false});
        fact('pre: URN plugin set up', {saveStatus: pre.saveStatus, windowClosed: pre.windowClosed});
        await signOut(page);

        await L.signIn(page, user);
        fact(`${user} Identifiers`, await L.openIdentifiers(page, app, sid, pid, nm('identifiers')));
        fact(`${user} Assign`, await L.pressFieldButton(page, 'Assign', nm('assign')));
        fact(`${user} Save and reload`, await L.saveAndReload(page, app, sid, pid, nm('assign-save')));
        fact(`${user} Clear`, await L.pressFieldButton(page, 'Clear', nm('clear')));
        fact(`${user} Save and reload (cleared)`, await L.saveAndReload(page, app, sid, pid, nm('clear-save')));
        await signOut(page);
    } finally {
        record('n-facts', facts);
        await close();
    }
});
