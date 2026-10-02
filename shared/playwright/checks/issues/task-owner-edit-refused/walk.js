// U37 A6 issue walk (docs/issues/U37-A6-task-owner-cannot-save-edit.md):
// a task's owner who did not write its first message is offered "Edit" and
// refused on "Save", even when only the due date changed.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md):
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/task-owner-edit-refused/walk.js
// Reset the fleet first (the walk adds a task). No assertions: each step is
// recorded with screen(); facts-<app>.json holds the reads.
//
// Steps:
//  1-3. dbarnes adds the task "Copyedit the manuscript u37r2" on the stage's
//       "Tasks & Discussions" panel, owner mfritz (Copyeditor; on a preprint
//       server the Author ccorino), due today + 14, first message his own.
//  4-7. The owner opens the same panel, the row's "More Actions" › "Edit",
//       changes only "Due Date" to today + 21 and presses "Save".
//  Neighbour (the fix must not reach this): the owner, in a fresh "Edit",
//       rewrites the editor's message and presses "Save"; the own-message
//       rule must still refuse it.
//  Way round: an assigned section editor (moderator) who neither opened nor
//       owns the task (dbuskins; the press's submission has none) opens the
//       panel: does the row offer "More Actions" › "Edit"?
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const NAME = 'Copyedit the manuscript u37r2';
const MESSAGE = 'Please copyedit the manuscript.';
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

/** Per-app dataset facts (docs/process/dataset.md, `main`). */
const W = {
    ojs: {id: 3, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', owner: 'mfritz', author: false, sectionEditor: 'dbuskins'},
    omp: {id: 7, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', owner: 'mfritz', author: false, sectionEditor: null},
    ops: {id: 1, menuKey: 'workflow_5', title: 'Production Tasks & Discussions', owner: 'ccorino', author: true, sectionEditor: 'dbuskins'},
};

async function refusal(win) {
    return {
        descriptionError: flat(await win.fieldError('description').innerText().catch(() => null)),
        summary: await win.errorSummaryLine().catch(() => null),
        windowOpen: (await win.root.count()) > 0,
    };
}

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = W[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, owner: w.owner};
    const {page, close} = await launch(app);
    try {
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.title});

        // 1-3. The editor adds the task.
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(w.id, w.menuKey);
        const add = await panel.openAdd();
        await add.nameField().fill(NAME);
        await add.tick(w.owner);
        await add.taskBox().check();
        await add.dueDate().fill(day(14));
        await add.ownerRadio(w.owner).check();
        await add.typeMessage(MESSAGE);
        record('01-add-window', await screen(page));
        const added = await add.saveAndAnswer();
        facts.add = {status: added.status()};
        await idle(page);
        await panel.reland();
        facts.rowAfterAdd = {owner: flat(await panel.ownerLine(NAME).innerText()), due: flat(await panel.dueDateCell(NAME).innerText())};
        record('02-editor-panel', await screen(page));
        await signOut(page);

        // 4-6. The owner opens the panel; the row's menu offers "Edit".
        await signIn(page, w.owner);
        if (w.author) {
            await panel.gotoAuthorByMenu(w.id);
        } else {
            await panel.gotoEditorial(w.id, w.menuKey);
        }
        facts.ownerRow = {owner: flat(await panel.ownerLine(NAME).innerText()), due: flat(await panel.dueDateCell(NAME).innerText())};
        await panel.openMenu(NAME);
        facts.ownerMenu = await panel.menuLabels();
        record('03-owner-menu', await screen(page));
        await panel.menuItem('Edit').click();
        const {ItemWindow} = require('../../../pages/TasksDiscussionsPages.js');
        let win = new ItemWindow(page);
        await win.expectReady();

        // 7. Change only the due date and save.
        facts.editBefore = {due: await win.dueDate().inputValue(), message: await win.messageText()};
        await win.dueDate().fill(day(21));
        const answer = await win.saveAndAnswer();
        await idle(page);
        facts.dueOnly = {status: answer.status(), body: await answer.json().catch(() => null), ...(await refusal(win))};
        record('04-owner-due-date-save', await screen(page));
        await shot(page, '04-owner-due-date-save');
        await panel.reland();
        facts.rowAfterDueOnly = {due: flat(await panel.dueDateCell(NAME).innerText())};
        record('05-owner-panel-after', await screen(page));

        // Neighbour: the owner rewrites the editor's first message.
        win = await panel.openEdit(NAME);
        await win.typeMessage('Rewritten by the task owner u37r2.');
        const answer2 = await win.saveAndAnswer();
        await idle(page);
        facts.messageChange = {status: answer2.status(), body: await answer2.json().catch(() => null), ...(await refusal(win))};
        record('06-owner-message-save', await screen(page));
        await shot(page, '06-owner-message-save');
        await panel.reland();
        const item = await panel.openItem(NAME);
        facts.firstMessageAfter = flat(await item.root.innerText().catch(() => null))?.slice(0, 600);
        record('07-owner-item-after', await screen(page));

        // Way round: can an assigned section editor make the change?
        if (w.sectionEditor) {
            await signIn(page, w.sectionEditor);
            await panel.gotoEditorial(w.id, w.menuKey);
            facts.sectionEditor = {
                user: w.sectionEditor,
                row: (await panel.row(NAME).count()) > 0,
                moreActions: await panel.menuButton(NAME).count(),
            };
            record('08-section-editor-panel', await screen(page));
        }
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
