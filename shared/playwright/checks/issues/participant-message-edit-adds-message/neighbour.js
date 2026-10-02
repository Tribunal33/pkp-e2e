// U37 A9 neighbour check (issue report docs/issues/U37-A9-participant-message-edit-adds-message.md):
// the fix must leave a discussion added by hand as it is. As dbarnes on the Production stage of the
// app's submission (OJS 5, OMP 4, OPS 1): "Production Tasks & Discussions" › "Add", the Name
// "u37r4 own discussion", the author ticked, "u37r4 own message", "Save"; then "Edit" › Name
// "u37r4 own renamed" › "Save" and "Edit" › message "u37r4 own edited" › "Save", the window read
// after each: one message, replaced in place. `main` only.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-message-edit-adds-message/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = L.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: L.PANEL});
        await panel.gotoEditorial(w.id, w.stage);
        const win = await panel.openAdd();
        await win.nameField().fill('u37r4 own discussion');
        await win.tick(w.username);
        await win.typeMessage('u37r4 own message');
        await win.saveExpectClosed();
        await idle(page);
        await panel.reland();
        facts.added = await L.readMessages(page, panel, 'u37r4 own discussion', 'own-added');
        facts.rename = await L.editAndSave(page, panel, 'u37r4 own discussion', {name: 'u37r4 own renamed'}, 'own-rename');
        facts.rename.messages = await L.readMessages(page, panel, 'u37r4 own renamed', 'own-rename-window');
        facts.retext = await L.editAndSave(page, panel, 'u37r4 own renamed', {message: 'u37r4 own edited'}, 'own-retext');
        facts.retext.messages = await L.readMessages(page, panel, 'u37r4 own renamed', 'own-retext-window');
        record('own-final', await screen(page));
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('neighbour', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
