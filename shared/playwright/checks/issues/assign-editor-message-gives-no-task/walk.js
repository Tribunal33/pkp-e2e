// U35 A6 (issue report docs/issues/U35-A6-assign-editor-message-gives-no-task.md): the predefined message
// "Assign Editor" gives the person it is sent to no "You have been assigned as an editor to the submission
// …" task; "Request Copyedit" gives its "You have been asked to review copyedits for …". The steps of the
// report, through the screens, on PKP's default dataset (lib.js WORDS):
//   assign     as dbarnes: "Participants" › "Assign", the role, "Search", "Minoti Inoue", the predefined
//              message "Assign Editor", "OK" (OJS 4, OMP 3 on Submission; OPS 1 on Production, where on
//              main "Message" stays empty, a separate fault, and one line is typed)
//   tasks      as minoue: the header's "Tasks", the rows that name the submission
//   control    a journal and a press: "Assign" › "Copyeditor" › "Sarah Vogt" › "Request Copyedit" › "OK" on a
//              submission in Copyediting (OJS 3, OMP 7), then svogt's "Tasks"
//   neighbour  the check of fix.diff beside this file: "Notify" on David Buskins's row with the stage's
//              plain discussion message and a typed line (OJS 8, OMP 9, OPS 1), then dbuskins's "Tasks":
//              the discussion row and no "assigned as an editor" task, with the fix in and out
//
//   PROBE_FEATURE=issues-r9 PROBE_AGENT=r9 node bin/probe.js all shared/playwright/checks/issues/assign-editor-message-gives-no-task/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r9-3_5 in front.)
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const stamp = Date.now().toString(36);
    const typed = (k) => `Hello u35r9 ${k} ${app.name} ${stamp}`;
    const facts = {app: app.name, line: app.line || 'main', main: w.main.id, control: w.control && w.control.id, neighbour: w.neighbour.id};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const mailOf = (s) => `${s.user}@mailinator.com`;
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');
        let since = Date.now() - 2000;
        await step('assign', () => L.send(page, app, w.main, typed('assign'), 'assign'));
        await step('assignMail', () => L.mails(page, app, mailOf(w.main), facts.assign.typed || w.main.words, since));
        if (w.control) {
            since = Date.now() - 2000;
            await step('control', () => L.send(page, app, w.control, typed('control'), 'control'));
            await step('controlMail', () => L.mails(page, app, mailOf(w.control), facts.control.typed || w.control.words, since));
        }
        since = Date.now() - 2000;
        await step('neighbour', () => L.send(page, app, w.neighbour, typed('neighbour'), 'neighbour'));
        await step('neighbourMail', () => L.mails(page, app, mailOf(w.neighbour), facts.neighbour.typed || w.neighbour.mailWords, since));
        await signOut(page);

        await signIn(page, w.main.user);
        await step('tasks', () => L.tasksFor(page, app, w.main, 'tasks'));
        await signOut(page);
        if (w.control) {
            await signIn(page, w.control.user);
            await step('controlTasks', () => L.tasksFor(page, app, w.control, 'control-tasks'));
            await signOut(page);
        }
        await signIn(page, w.neighbour.user);
        await step('neighbourTasks', () => L.tasksFor(page, app, w.neighbour, 'neighbour-tasks'));
        await signOut(page).catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
