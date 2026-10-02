// U37 A9 email check (issue report docs/issues/U37-A9-participant-message-edit-adds-message.md):
// what a participant added in the first "Edit" of a "Notify" discussion receives. OJS submission 5,
// "Production", as dbarnes: "Notify" Diaga Diouf with "Discussion (Production)" and a tagged
// "u37r4 mail …" message; "Edit" › Name "u37r4 mailed" and Graham Cox (`gcox`) ticked › "Save";
// the window read and gcox's mailbox read. `main` only.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/participant-message-edit-adds-message/email.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

const ADD = {ojs: 'gcox', omp: 'gcox', ops: 'dbuskins'};

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = L.WORDS[app.name];
    const stamp = Date.now().toString(36);
    const text = `u37r4 mail ${stamp}`;
    const facts = {app: app.name, line: app.line || 'main', text};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        facts.notify = await L.notify(page, app, w, text, 'mail-notify');
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: L.PANEL});
        await panel.gotoEditorial(w.id, w.stage);
        facts.edit = await L.editAndSave(page, panel, w.template, {name: 'u37r4 mailed', tick: ADD[app.name]}, 'mail-edit');
        facts.edit.messages = await L.readMessages(page, panel, 'u37r4 mailed', 'mail-window');
        facts.mail = await L.mailsTo(page, app, `${ADD[app.name]}@mailinator.com`, stamp, 20000);
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('email', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
