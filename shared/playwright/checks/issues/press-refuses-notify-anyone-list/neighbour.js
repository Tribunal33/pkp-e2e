// Neighbour check of the U21 OMP2 fix (issue report
// docs/issues/U21-OMP2-press-refuses-notify-anyone-list.md): as rvaca, Settings › Workflow ›
// "Emails", "Notify Anyone" given a list with one malformed address. It must stay refused on every
// app, with the fix in and out (the fix removes the press's own one-address rule, so the shared
// per-address check is what refuses it).
//   PROBE_FEATURE=issues-ir32 PROBE_AGENT=ir32 PROBE_RUN=fixout node bin/probe.js all shared/playwright/checks/issues/press-refuses-notify-anyone-list/neighbour.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const H = require('../emails-confirmation-off-shows-unselected/lib.js');

const BAD = 'one@example.com,not-an-address';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const p = H.emailsPage(page, app);
        await p.goto();
        await p.notifyAnyoneBox().fill(BAD);
        facts.status = await p.pressSave();
        await idle(page);
        facts.error = (await p.fieldError('copySubmissionAckAddress').allInnerTexts()).map((t) => H.flat(t)).join(' | ');
        facts.stored = await H.storedSetting(app, 'copySubmissionAckAddress');
        facts.refused = facts.status === 400 && facts.stored.length === 0;
        await signOut(page);
    } finally {
        record('omp2-neighbour', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
