// U37 A3 issue walk (docs/issues/U37-A3-writer-told-of-own-message.md): the writer of a
// discussion's first message, and of a reply, is emailed a copy and gets a Tasks row.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md), main or 3.5:
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/writer-told-of-own-message/walk.js
// Reset the fleet first (the walk adds a discussion). No assertions: each step is recorded
// with screen(); facts-<app>.json holds the reads (mailboxes, Tasks rows).
//
// Steps (per app: lib.js WORDS):
//  1-3. dbarnes opens the stage's "Tasks & Discussions" ("Discussions" grid on 3.5), "Add",
//       name "Reference check u37r7", ticks the other participant, a message, "Save".
//  4-5. dbarnes's "Tasks" window and mailbox; the other participant's mailbox (control).
//  6-7. The other participant opens the discussion, "Add New Message" ("Add Message" on 3.5),
//       a reply, "Save".
//  8-9. The participant's "Tasks" window and mailbox; dbarnes's mailbox (control).
//  Neighbour (the fix must leave it alone): dbarnes "Edit"s the discussion and ticks a third
//       person: that person is emailed the first message; dbarnes and the participant are not.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NAME = 'Reference check u37r7';
const OPENING = 'Please check the references.';
const REPLY = 'References checked.';

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const is35 = app.line === 'stable-3_5_0';
    const t0 = Date.now() - 2000;
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, writer: w.writer, other: w.other};
    const {page, close} = await launch(app);
    const T = require('../../../pages/TasksDiscussionsPages.js');
    const panel = is35 ? null : new T.TasksDiscussionsPanel(page, app.contextPath, {title: `${w.stage} Tasks & Discussions`});
    const open = async () => (is35 ? L.openWorkflow35(page, app, w) : panel.gotoEditorial(w.id, w.menuKey));
    try {
        // 1-3. The writer opens the discussion.
        await signIn(page, w.writer);
        await open();
        if (is35) {
            facts.add = await L.addQuery35(page, {participantName: w.otherName, subject: NAME, message: OPENING});
        } else {
            const add = await panel.openAdd();
            await add.nameField().fill(NAME);
            facts.addBoxesBefore = await add.participants().catch(() => null);
            await add.tick(w.other);
            await add.typeMessage(OPENING);
            record('01-add-window', await screen(page));
            const answer = await add.saveAndAnswer();
            facts.add = {status: answer.status()};
            await idle(page);
            await panel.reland();
        }
        record('02-panel-after-add', await screen(page));

        // 4-5. The writer's Tasks and mailbox; the participant's mailbox as the control.
        facts.otherMailAfterOpening = await L.waitForMail(page, app, w.other, NAME, 1, t0);
        facts.writerMailAfterOpening = await L.mailbox(app, w.writer, NAME, t0);
        facts.writerTasksAfterOpening = await L.readTasks(page, NAME, '03-writer-tasks');
        await shot(page, '03-writer-tasks').catch(() => {});
        await signOut(page);

        // 6-7. The participant replies.
        await signIn(page, w.other);
        await open();
        if (is35) {
            facts.reply = await L.reply35(page, {subject: NAME, message: REPLY});
        } else {
            const win = await panel.openItem(NAME);
            await win.addNewMessage();
            await win.typeReply(REPLY);
            record('04-reply-typed', await screen(page));
            const answered = page.waitForResponse((r) => /\/tasks\/\d+\/notes?$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 30000});
            await win.pressSave();
            facts.reply = {status: (await answered).status()};
            await L.sleep(1000);
            facts.replyMessages = await win.messages().allInnerTexts().then((a) => a.map((t) => L.flat(t, 160))).catch(() => null);
            await win.close().catch(() => {});
            await panel.reland();
        }

        // 8-9. The participant's Tasks and mailbox; the writer's mailbox as the control.
        facts.writerMailAfterReply = await L.waitForMail(page, app, w.writer, NAME, facts.writerMailAfterOpening.length + 1, t0);
        facts.otherMailAfterReply = await L.mailbox(app, w.other, NAME, t0);
        facts.otherTasksAfterReply = await L.readTasks(page, NAME, '05-other-tasks');
        await shot(page, '05-other-tasks').catch(() => {});
        await signOut(page);

        // Neighbour: an edit that adds a third person mails that person alone.
        if (!is35) {
            await signIn(page, w.writer);
            await panel.gotoEditorial(w.id, w.menuKey);
            const win = await panel.openEdit(NAME);
            await win.tick(w.third);
            const answer = await win.saveAndAnswer();
            facts.neighbourEdit = {status: answer.status()};
            await idle(page);
            await panel.reland();
            record('06-neighbour-after-edit', await screen(page));
            facts.neighbourThirdMail = await L.waitForMail(page, app, w.third, NAME, 1, t0);
            facts.neighbourWriterMail = await L.mailbox(app, w.writer, NAME, t0);
            facts.neighbourOtherMail = await L.mailbox(app, w.other, NAME, t0);
            await signOut(page);
        }
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
        await shot(page, 'error-screen').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
