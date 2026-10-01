// U35 A1 walk (issue report docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md).
// On PKP's default test dataset: dbuskins (Section editor; Series editor; Moderator) opens a
// submission he is assigned to (OJS 4, OMP 1, OPS 1), presses "Edit" on the Author's row of the
// "Participants" panel, changes the "Permissions" box and presses "OK"; on OJS and OPS he then
// ticks "Assignment privileges" on Stephanie Berardo's row. The control: rvaca (a manager) changes
// the Author's "Permissions" box the same way.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.submissionId, storedBefore: H.stored(app, c.submissionId)};
    const {page, close} = await launch(app);
    try {
        // 1-4. the Section Editor on the Author's row, "Permissions"
        await signIn(page, 'dbuskins');
        facts.author = await H.editBox(page, app, {submissionId: c.submissionId, name: c.author, box: 'canChangeMetadata', label: '01-author'});
        // 5. the Section Editor on another Section Editor's row, "Assignment privileges"
        if (c.editor) {
            facts.editor = await H.editBox(page, app, {submissionId: c.submissionId, name: c.editor, box: 'recommendOnly', label: '02-editor'});
        }
        facts.storedAfterSectionEditor = H.stored(app, c.submissionId);
        await signOut(page);

        // Control: a manager on the Author's row
        await signIn(page, 'rvaca');
        facts.control = await H.editBox(page, app, {submissionId: c.submissionId, name: c.author, box: 'canChangeMetadata', label: '03-manager'});
        facts.storedAfterManager = H.stored(app, c.submissionId);
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
