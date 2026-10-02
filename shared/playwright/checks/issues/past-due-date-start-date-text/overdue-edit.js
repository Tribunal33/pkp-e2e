// U37 A10 follow-up (triage question): does "Edit" on a task already past its
// due date, changing only "Name", get refused by the same `after_or_equal:today`
// rule, since the form sends "Due Date" back with every save?
//
// Runs on a dataset fleet (PKP's default test dataset), reset first:
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/past-due-date-start-date-text/overdue-edit.js
// Steps: dbarnes adds a task due in two weeks; its stored due date is moved
// three weeks back (in place of waiting for it to pass); he opens "Edit",
// changes only "Name" and presses "Save".
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const NAME = 'Overdue task u37r8';
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());
const W = {
    ojs: {id: 3, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz'},
    omp: {id: 7, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz'},
    ops: {id: 1, menuKey: 'workflow_5', title: 'Production Tasks & Discussions', other: 'ccorino'},
};

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = W[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.id};
    const {page, close} = await launch(app);
    try {
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.title});
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(w.id, w.menuKey);
        let win = await panel.openAdd();
        await win.nameField().fill(NAME);
        await win.tick(w.other);
        await win.taskBox().check();
        await win.dueDate().fill(day(14));
        await win.ownerRadio(w.other).check();
        await win.typeMessage('Overdue check.');
        await win.saveExpectClosed();
        await idle(page);

        // The due date passes: moved three weeks back.
        facts.aged = sql(app, `UPDATE edit_tasks SET date_due = date_due - interval '21 days' WHERE title = '${NAME}' RETURNING edit_task_id, date_due`);
        await panel.reland();
        facts.rowBefore = {due: flat(await panel.dueDateCell(NAME).innerText())};

        win = await panel.openEdit(NAME);
        facts.editWindowDueDate = await win.dueDate().inputValue();
        await win.nameField().fill(`${NAME} renamed`);
        const answer = await win.saveAndAnswer();
        await idle(page);
        facts.renameSave = {
            status: answer.status(),
            body: await answer.json().catch(() => null),
            dueDateError: flat(await win.fieldError('dateDue').innerText().catch(() => null)),
            summary: await win.errorSummaryLine().catch(() => null),
            windowOpen: (await win.root.count()) > 0,
        };
        record('01-overdue-rename-save', await screen(page));
        await shot(page, '01-overdue-rename-save');
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
