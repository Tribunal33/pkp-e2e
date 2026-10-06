// U37 A9 walk (issue report docs/issues/U37-A9-participant-message-edit-adds-message.md).
// On PKP's default test dataset, the Production stage of the app's submission (OJS 5, OMP 4, OPS 1):
//   editor  dbarnes "Notify"s the author with "Discussion (Production)" and "u37r4 first message";
//           "Edit" › Name "u37r4 renamed" › "Save"; the window read; "Edit" › message
//           "u37r4 edited text" › "Save"; the window read
//   author  dbarnes "Notify"s the author again ("u37r4 second message"); the author signs in, opens
//           the discussion's "Edit", types "u37r4 author text", "Save"; the window read
//           (where the row offers no menu, as on OMP since pkp/pkp-lib#13385, the window is read instead)
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, PROBE_FEATURE the line fleet's feature; there the
//   stage's "Production Discussions" grid takes the panel's place, and its "Edit" the window's.)
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const old = facts.line !== 'main';
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (!old) {
            const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
            const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: L.PANEL});
            await step('notify1', () => L.notify(page, app, w, 'u37r4 first message', 'notify1'));
            await step('rename', async () => {
                await panel.gotoEditorial(w.id, w.stage);
                const saved = await L.editAndSave(page, panel, w.template, {name: 'u37r4 renamed'}, 'rename');
                return {...saved, messages: await L.readMessages(page, panel, 'u37r4 renamed', 'rename-window')};
            });
            await step('retext', async () => {
                const saved = await L.editAndSave(page, panel, 'u37r4 renamed', {message: 'u37r4 edited text'}, 'retext');
                return {...saved, messages: await L.readMessages(page, panel, 'u37r4 renamed', 'retext-window')};
            });
            await step('notify2', () => L.notify(page, app, w, 'u37r4 second message', 'notify2'));
            await signOut(page);
            await step('author', async () => {
                await signIn(page, w.username);
                const ap = new TasksDiscussionsPanel(page, app.contextPath, {title: L.PANEL});
                if (w.byMenu) await ap.gotoAuthorByMenu(w.id);
                else await ap.gotoAuthor(w.id, w.stage);
                record('author-panel', await screen(page));
                // Where the recipient is not the discussion's creator (pkp/pkp-lib#13385) the row offers no menu.
                await ap.row(w.template).first().waitFor({timeout: 30000});
                if (!(await ap.menuButton(w.template).count())) {
                    return {offered: false, row: L.flat(await ap.row(w.template).first().innerText(), 200),
                        messages: await L.readMessages(page, ap, w.template, 'author-window')};
                }
                const saved = await L.editAndSave(page, ap, w.template, {message: 'u37r4 author text'}, 'author');
                return {...saved, messages: await L.readMessages(page, ap, w.template, 'author-window')};
            });
        } else {
            // 3.5: the same steps on the stage's "Production Discussions" grid.
            await step('notify1', () => L.notify(page, app, w, 'u37r4 first message', 'notify1'));
            await step('rename', async () => {
                await L.P.openWorkflow(page, app, w.id, w.stage);
                const rows = await L.gridRows(page);
                const subject = await L.subject35(page);
                const saved = await L.editQuery35(page, subject, {name: 'u37r4 renamed'}, 'rename');
                return {rows, subject, ...saved, notes: await L.readQuery35(page, 'u37r4 renamed', 'rename-window')};
            });
            await step('retext', async () => {
                const saved = await L.editQuery35(page, 'u37r4 renamed', {message: 'u37r4 edited text'}, 'retext');
                return {...saved, notes: await L.readQuery35(page, 'u37r4 renamed', 'retext-window')};
            });
            await step('notify2', () => L.notify(page, app, w, 'u37r4 second message', 'notify2'));
            await signOut(page);
            await step('author', async () => {
                await signIn(page, w.username);
                await L.authorWorkflow35(page, app, w);
                record('author-grid', await screen(page));
                const rows = await L.gridRows(page);
                const subject = await L.subject35(page);
                const offered = await L.editQuery35(page, subject, null, 'author');
                return {rows, subject, ...offered, notes: await L.readQuery35(page, subject, 'author-window')};
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        record('walk', facts);
        await close();
    }
});
