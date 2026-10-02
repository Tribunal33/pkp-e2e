// U37 A7 issue walk (docs/issues/U37-A7-press-server-edit-refusal-raw-key.md):
// a press and a preprint server refuse an edit of a discussion's or task's
// first message with a raw key where a journal says "You can only edit your
// own discussion message." or "This discussion message can only be edited
// within 1 hour of creation.".
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md):
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/edit-refusal-raw-key/walk.js
// Reset the fleet first (the walk adds a task and a discussion). No
// assertions: each step is recorded with screen(); facts-<app>.json holds
// the reads.
//
// Steps:
//  1-2. dbarnes adds the task "Copyedit the manuscript u37r8" owned by the
//       other person (the Copyeditor mfritz; on a preprint server the Author
//       ccorino), first message his own.
//  3-4. The other person edits that task's message and presses "Save":
//       refused, the own-message text.
//  5-7. The other person adds the discussion "Own notes u37r8"; its first
//       message is moved two hours back (in place of waiting an hour, the
//       one step not taken on screen); they edit it and press "Save":
//       refused, the one-hour text.
//  Neighbour (the fix must not reach this): dbarnes (manager-level) edits the
//       task's message and saves.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, rawKeys, sql} = require('../../../probe');

const TASK = 'Copyedit the manuscript u37r8';
const OWN = 'Own notes u37r8';
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

/** Per-app dataset facts (docs/process/dataset.md, `main`). */
const W = {
    ojs: {id: 3, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz', author: false, colleague: 'dbarnes'},
    omp: {id: 7, menuKey: 'workflow_4', title: 'Copyediting Tasks & Discussions', other: 'mfritz', author: false, colleague: 'dbarnes'},
    ops: {id: 1, menuKey: 'workflow_5', title: 'Production Tasks & Discussions', other: 'ccorino', author: true, colleague: 'dbuskins'},
};

async function refusal(page, win, answer) {
    return {
        status: answer.status(),
        body: await answer.json().catch(() => null),
        descriptionError: flat(await win.fieldError('description').innerText().catch(() => null)),
        summary: await win.errorSummaryLine().catch(() => null),
        windowOpen: (await win.root.count()) > 0,
        rawKeys: await rawKeys(page).catch((e) => String(e.message)),
    };
}

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = W[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, other: w.other};
    const {page, close} = await launch(app);
    try {
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.title});
        const openAsOther = async () => (w.author ? panel.gotoAuthorByMenu(w.id) : panel.gotoEditorial(w.id, w.menuKey));

        // 1-2. The editor adds the task.
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(w.id, w.menuKey);
        let win = await panel.openAdd();
        await win.nameField().fill(TASK);
        await win.tick(w.other);
        await win.taskBox().check();
        await win.dueDate().fill(day(14));
        await win.ownerRadio(w.other).check();
        await win.typeMessage('Please copyedit the manuscript.');
        let answer = await win.saveAndAnswer();
        facts.addTask = {status: answer.status()};
        await idle(page);
        await signOut(page);

        // 3-4. The other person rewrites the editor's first message.
        await signIn(page, w.other);
        await openAsOther();
        record('01-other-panel', await screen(page));
        win = await panel.openEdit(TASK);
        await win.typeMessage('Rewritten by the owner u37r8.');
        answer = await win.saveAndAnswer();
        await idle(page);
        facts.ownMessageRefusal = await refusal(page, win, answer);
        record('02-own-message-refusal', await screen(page));
        await shot(page, '02-own-message-refusal');

        // 5. The other person adds a discussion of their own.
        await panel.reland();
        win = await panel.openAdd();
        await win.nameField().fill(OWN);
        await win.tick(w.colleague);
        await win.typeMessage('My own notes.');
        answer = await win.saveAndAnswer();
        facts.addOwn = {status: answer.status(), body: answer.status() >= 400 ? await answer.json().catch(() => null) : undefined};
        await idle(page);

        // 6. An hour passes: the first message's creation time moved back two hours.
        facts.aged = sql(app, `UPDATE notes SET date_created = date_created - interval '2 hours' WHERE is_headnote AND contents LIKE '%My own notes.%' RETURNING note_id, date_created`);

        // 7. The other person edits their own first message.
        await panel.reland();
        win = await panel.openEdit(OWN);
        await win.typeMessage('My own notes, edited u37r8.');
        answer = await win.saveAndAnswer();
        await idle(page);
        facts.editExpiredRefusal = await refusal(page, win, answer);
        record('03-edit-expired-refusal', await screen(page));
        await shot(page, '03-edit-expired-refusal');
        await signOut(page);

        // Neighbour: the editor's own edit of the task's message saves.
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(w.id, w.menuKey);
        win = await panel.openEdit(TASK);
        await win.typeMessage('Please copyedit the manuscript, edited u37r8.');
        answer = await win.saveAndAnswer();
        await idle(page);
        facts.neighbourEditorEdit = {status: answer.status(), windowOpen: (await win.root.count()) > 0};
        record('04-neighbour-editor-edit', await screen(page));
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
