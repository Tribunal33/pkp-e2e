// U35 A14 walk (issue report docs/issues/U35-A14-activity-log-names-participant-not-editor.md).
// On PKP's default test dataset: dbarnes (Daniel Barnes) opens a submission (OJS 4, OMP 1, OPS 1),
// assigns Minoti Inoue as a Section editor (Series editor; Moderator) with "Assign", ticks
// "Assignment privileges" on her row with "Edit", removes her with "Remove", then reads the
// "Activity Log": the "User" column of the three lines he caused.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.submissionId};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await H.openWorkflow(page, app, c.submissionId);
        facts.logBefore = (await H.history(page)).lines.length;
        // 3. "Assign"
        facts.assign = await H.assign(page, {role: c.role, person: c.person, label: '01-assign'});
        // 4. "Edit" > "Assignment privileges"
        facts.edit = await H.editBox(page, app, {submissionId: c.submissionId, name: c.person, box: 'recommendOnly', label: '02-edit'});
        // 5. "Remove"
        await H.openWorkflow(page, app, c.submissionId);
        facts.remove = await H.remove(page, c.person, '03-remove');
        // 6. "Activity Log"
        await H.openWorkflow(page, app, c.submissionId);
        const log = await H.history(page, '04-activity-log');
        facts.headers = log.headers;
        facts.newLines = log.lines.slice(0, log.lines.length - facts.logBefore);
        facts.olderLines = log.lines.slice(log.lines.length - facts.logBefore, log.lines.length - facts.logBefore + 3);
        facts.userNamesActor = facts.newLines.map((l) => l.user === c.actor);
        facts.stored = H.storedEntries(app, c.submissionId);
        await signOut(page);
    } finally {
        record('facts-a14', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
