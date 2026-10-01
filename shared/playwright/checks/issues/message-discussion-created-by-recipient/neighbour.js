// U35 A5 + U32 A9 neighbour check (issue report docs/issues/U35-A5-message-discussion-created-by-recipient.md):
// the fix must leave a discussion added by hand as it is. As dbarnes on the Production stage of the
// app's submission (OJS 5, OMP 4, OPS 1): "Production Tasks & Discussions" › "Add", the Name
// "u35r8 own discussion", the author ticked, a message typed, "Save"; the row's "Created by" line
// and the discussion's window are read. `main` only (3.5 has no "Created by" line).
//   PROBE_FEATURE=issues-r8 PROBE_AGENT=r8 node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const n = L.WORDS[app.name].notify;
    const NAME = 'u35r8 own discussion';
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: 'Production Tasks & Discussions'});
        await panel.gotoEditorial(n.id, n.stage);
        const win = await panel.openAdd();
        await win.nameField().fill(NAME);
        await win.tick(n.username);
        await win.typeMessage(`u35r8 own message ${Date.now().toString(36)}`);
        record('own-filled', await screen(page));
        await win.saveExpectClosed();
        await idle(page);
        await panel.reland();
        record('own-reloaded', await screen(page));
        facts.own = {rows: (await L.rowsNamed(page, NAME)).rows, window: await L.readDiscussion(page, NAME, 'own-discussion')};
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('neighbour', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
