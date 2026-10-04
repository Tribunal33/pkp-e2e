// U05 A10 walk (issue report docs/issues/U05-A10-needs-editor-email-ignores-notification-off.md).
// On PKP's default test dataset: rvaca (Journal manager) takes the editors off the section the
// author submits to (OMP: nothing, the author leaves "Series" at "None"), then on Profile ›
// "Notifications" unticks "Enable these types of notifications." under the "needs an editor" row
// and saves. The author submits; the mailboxes of rvaca and dbarnes (who changed nothing) are
// read, then each one's "Tasks" window.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/needs-editor-email-ignores-notification-off/walk.js
// The neighbour check (for the fix trial) runs alone with `neighbour` after the script: rvaca
// leaves "Enable…" ticked and ticks "Do not send me an email…" instead (expected: the task, no
// email). Prefix PKP_E2E_LINE=stable-3_5_0 for 3.5.
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u05a');
    const title = `u05a needs editor ${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run, title, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-2. rvaca takes the editors off the section
        await signIn(page, 'rvaca');
        facts.steps.section = await H.unassignSectionEditors(page, app);
        record('01-section', await screen(page));
        // 3-4. the "needs an editor" row on the Notifications tab
        facts.steps.row = MODE === 'steps'
            ? await H.setNeedsEditorRow(page, app, {allow: false}, '02-row')
            : await H.setNeedsEditorRow(page, app, {noEmail: true}, '02-row');
        await signOut(page);

        // 5. the author submits
        await signIn(page, w.author);
        facts.steps.submission = await H.submit(page, app, title);
        record('03-submitted', await screen(page));
        await signOut(page);

        // 6. mailboxes (the control's first, waited for)
        facts.mail = {
            dbarnes: await H.mailFor(app, 'dbarnes@mailinator.com', run, 25_000),
            rvaca: await H.mailFor(app, 'rvaca@mailinator.com', run, 5_000),
            admin: await H.mailFor(app, 'pkpadmin@mailinator.com', run),
        };
        // 7-8. Tasks
        await signIn(page, 'rvaca');
        facts.tasks = {rvaca: await H.tasksFor(page, app, run, '04-tasks-rvaca')};
        await signIn(page, 'dbarnes');
        facts.tasks.dbarnes = await H.tasksFor(page, app, run, '05-tasks-dbarnes');
        await signOut(page);

        const needs = (list) => list.filter((m) => /needs an? (editor|moderator)/i.test(m.subject)).map((m) => m.subject);
        facts.observed = {
            rvacaTask: facts.tasks.rvaca.rowsForTitle.length,
            rvacaNeedsEditorMail: needs(facts.mail.rvaca),
            dbarnesTask: facts.tasks.dbarnes.rowsForTitle.length,
            dbarnesNeedsEditorMail: needs(facts.mail.dbarnes),
            emailBoxGreyedBeforeSave: facts.steps.row.beforeSave.noEmailDisabled,
            rowAfterReload: facts.steps.row.afterReload,
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
