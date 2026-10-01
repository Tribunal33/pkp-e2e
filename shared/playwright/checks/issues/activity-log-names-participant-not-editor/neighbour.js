// U35 A14 neighbour check (issue report docs/issues/U35-A14-activity-log-names-participant-not-editor.md):
// what the fix must leave as it is. As dbarnes, the whole "Activity Log" of a submission whose log
// the dataset already fills (OJS 3, OMP 1, OPS 1): the lines that are not about participants keep
// their "User" and "Event" with the fix in or out, and the assignment lines the dataset stored
// still name the participant in "Event". With `repair` as the argument the script first runs the
// statement of the fix's upgrade migration on the install's database (lib.js
// `repairStoredEntries()`), which a fix run needs: without it the stored lines lose the name.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/neighbour.js [repair]
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

const repair = process.argv.includes('repair');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.stored, repair};
    if (repair) {
        facts.repaired = H.repairStoredEntries(app);
    }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await H.openWorkflow(page, app, c.stored);
        const log = await H.history(page, repair ? 'n-activity-log-repaired' : 'n-activity-log');
        facts.lines = log.lines.map((l) => ({user: l.user, event: l.event}));
        facts.stored = H.storedEntries(app, c.stored);
        await signOut(page);
    } finally {
        record(repair ? 'neighbour-repaired' : 'neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
