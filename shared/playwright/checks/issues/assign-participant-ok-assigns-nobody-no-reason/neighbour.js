// U35 A4 neighbour check (issue report docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md):
// what the fix to the "Assign Participant" form's validation must leave alone, read with the fix
// in and out. As rvaca (a manager) on the walk's submission:
//   1. "Edit" on the Author's row, the "Permissions" box changed, "OK": the same form class saves an
//      existing assignment, the window closes with "The stage assignment has been changed.";
//   2. "Notify" on the Author's row with no message, "Notify": the parent form's own refusal and
//      its own notice.
// (The walk's control is the third neighbour: a person chosen under the role shown is assigned.)
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/neighbour.js
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');
// "Edit Assignment" is driven by the helper the U35 A1 walk keeps.
const A1 = require('../section-editor-edit-assignment-saves-nothing/lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.id};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const edit = await A1.editBox(page, app, {submissionId: c.id, name: c.author, box: 'canChangeMetadata', label: 'n1-edit'});
        facts.edit = {before: edit.before, posted: edit.posted, save: edit.save, notices: edit.notices, windowStillOpen: edit.windowStillOpen, reopened: edit.reopened, saved: edit.saved};

        const panel = await H.openWorkflow(page, app, c.id);
        const win = await panel.openNotify(c.author);
        const answered = await win.pressNotify();
        const body = await answered.text().catch(() => '');
        await page.waitForTimeout(2_000);
        await idle(page);
        const shown = await screen(page);
        record('n2-notify-after', shown);
        facts.notify = {
            status: answered.status(),
            answer: H.flat(body, 200),
            notices: (shown.notices || []).map((n) => H.flat(n.text || n)),
            windowStillOpen: await win.notifyButton().isVisible().catch(() => false),
        };
        await signOut(page);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
