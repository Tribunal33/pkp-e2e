// U35 A7 walk (issue report docs/issues/U35-A7-edit-assignment-logged-as-assignment.md).
// On PKP's default test dataset: dbarnes (Daniel Barnes) opens a submission (OJS 4, OMP 1, OPS 1),
// presses "Edit" on the Author's row of "Participants", changes the "Permissions" box and presses
// "OK", then reads the "Activity Log": the line the edit added, in English and, at the log grid's
// own address, in French. Then the checks beside it, in the same walk: "Edit" > "OK" with no box
// touched (a line today, none with the fix), and an "Assign" and a "Remove" of Minoti Inoue, whose
// two lines a fix must leave as they are.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edit-assignment-logged-as-assignment/walk.js
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
        // 3-4. "Edit" > "Permissions" > "OK"
        facts.edit = await H.editBox(page, app, {submissionId: c.submissionId, name: c.author, box: 'canChangeMetadata', label: '01-edit'});
        // 5. "Activity Log"
        await H.openWorkflow(page, app, c.submissionId);
        let log = await H.history(page, '02-activity-log');
        facts.editLines = log.lines.slice(0, log.lines.length - facts.logBefore);
        // The same line as the server draws it in French (the dataset's second language).
        facts.editLinesFrench = (await H.historyIn(page, app, c.submissionId, 'fr_CA')).slice(0, facts.editLines.length || 1);
        // "Edit" > "OK" with no box touched: what the log gains.
        facts.noChange = await H.editNoChange(page, app, {submissionId: c.submissionId, name: c.author, label: '02b-edit-no-change'});
        await H.openWorkflow(page, app, c.submissionId);
        log = await H.history(page, '02c-activity-log');
        facts.noChangeLines = log.lines.slice(0, log.lines.length - facts.logBefore - facts.editLines.length);
        // Neighbour: a real assignment and a removal keep their own lines.
        const before = log.lines.length;
        facts.assign = await H.assign(page, {role: c.role, person: c.person, label: '03-assign'});
        await H.openWorkflow(page, app, c.submissionId);
        facts.remove = await H.remove(page, c.person, '04-remove');
        await H.openWorkflow(page, app, c.submissionId);
        log = await H.history(page, '05-activity-log');
        facts.neighbourLines = log.lines.slice(0, log.lines.length - before);
        facts.stored = H.storedEntries(app, c.submissionId);
        await signOut(page);
    } finally {
        record('facts-a7', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
