// U37 A10 issue walk (docs/issues/U37-A10-past-due-date-speaks-of-start-date.md):
// a task's "Due Date" before today is refused with "Start date should be
// greater than or equal to today"; the form has no start date.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md):
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/past-due-date-start-date-text/walk.js
// Reset the fleet first (the neighbour adds a task). No assertions: each
// step is recorded with screen(); facts-<app>.json holds the reads.
//
// Steps:
//  1-2. dbarnes opens the submission's Tasks & Discussions panel, "Add", a
//       task owned by the other person (the Copyeditor mfritz; on a preprint
//       server the Author ccorino) with a "Due Date" two days before today
//       typed into the box, "Save": refused under "Due Date".
//  Neighbour (the fix must not reach this): the same window with today's
//       date saves.
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const NAME = 'Past due date u37r8';
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

/** Per-app dataset facts (docs/process/dataset.md, `main`). */
const W = {
    ojs: {id: 3, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz'},
    omp: {id: 7, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz'},
    ops: {id: 1, menuKey: 'workflow_5', title: 'Production Tasks & Discussions', other: 'ccorino'},
};

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = W[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, past: day(-2), today: day(0)};
    const {page, close} = await launch(app);
    try {
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.title});
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(w.id, w.menuKey);
        const win = await panel.openAdd();
        await win.nameField().fill(NAME);
        await win.tick(w.other);
        await win.taskBox().check();
        await win.dueDate().fill(facts.past);
        await win.ownerRadio(w.other).check();
        await win.typeMessage('Due date check.');
        record('01-add-window-filled', await screen(page));
        let answer = await win.saveAndAnswer();
        await idle(page);
        facts.pastSave = {
            status: answer.status(),
            body: await answer.json().catch(() => null),
            dueDateError: flat(await win.fieldError('dateDue').innerText().catch(() => null)),
            summary: await win.errorSummaryLine().catch(() => null),
            windowOpen: (await win.root.count()) > 0,
        };
        record('02-past-due-date-refused', await screen(page));
        await shot(page, '02-past-due-date-refused');

        // Neighbour: today's date in the same window saves.
        await win.dueDate().fill(facts.today);
        answer = await win.saveAndAnswer();
        await idle(page);
        facts.todaySave = {status: answer.status(), windowOpen: (await win.root.count()) > 0};
        await panel.reland();
        facts.todayRow = {due: flat(await panel.dueDateCell(NAME).innerText().catch(() => null))};
        record('03-neighbour-today-saved', await screen(page));
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
