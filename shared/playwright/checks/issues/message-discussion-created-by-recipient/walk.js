// U35 A5 + U32 A9 walk (issue report docs/issues/U35-A5-message-discussion-created-by-recipient.md).
// On PKP's default test dataset, as dbarnes:
//   notify  the Production stage of the app's submission (OJS 5, OMP 4, OPS 1): the author's row ›
//           "More Actions" › "Notify", "Discussion (Production)" chosen, a message typed, "Notify";
//           the page opened again, the discussion's row and its window read; the author's mailbox
//   assign  (OJS 3, OMP 7; no Copyediting stage on OPS) the Copyediting stage: "Assign", "Copyeditor",
//           "Search", Sarah Vogt, "Request Copyedit" chosen, "OK"; the row and its window read;
//           then svogt signs in and opens "Tasks"
//   PROBE_FEATURE=issues-r8 PROBE_AGENT=r8 node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r8-3_5 in front. READ=1 in front
//   sends nothing: it only opens the two stages again and reads their discussions.)
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib.js');

const {P} = L;

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const stamp = Date.now().toString(36);
    const text = `u35r8 hello ${stamp}`;
    const facts = {app: app.name, line: app.line || 'main', text};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const old = facts.line !== 'main'; // 3.5 names the discussion after the email's subject: every row is read
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        if (process.env.READ) {
            for (const [name, x] of Object.entries(w)) {
                if (!x) continue;
                await step(`read-${name}`, async () => {
                    await P.openWorkflow(page, app, x.id, x.stage);
                    record(`read-${name}`, await screen(page));
                    const rows = await L.rowsNamed(page, old ? null : x.template);
                    return {heading: rows.heading, rows: rows.rows, window: await L.readDiscussion(page, x.template, `read-${name}-discussion`)};
                });
            }
            return;
        }

        await step('notify', async () => {
            const n = w.notify;
            await P.openWorkflow(page, app, n.id, n.stage);
            const before = await L.rowsNamed(page, old ? null : n.template);
            const win = await P.openNotify(page, n.person);
            const chosen = await P.chooseTemplate(page, win, n.template);
            await P.typeMessage(page, win, text);
            record('notify-filled', await screen(page));
            const pressed = await P.press(page, win, 'Notify', /send-?notification/i, 'notify-pressed');
            await P.openWorkflow(page, app, n.id, n.stage);
            record('notify-reloaded', await screen(page));
            const after = await L.rowsNamed(page, old ? null : n.template);
            const window_ = await L.readDiscussion(page, n.template, 'notify-discussion');
            const mail = await P.waitMail(page, app, `${n.username}@mailinator.com`, stamp, 12000);
            return {chosen: chosen.status, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices, heading: after.heading, rowsBefore: before.rows, rowsAfter: after.rows, window: window_, mail};
        });

        if (w.assign) {
            await step('assign', async () => {
                const a = w.assign;
                await P.openWorkflow(page, app, a.id, a.stage);
                const before = await L.rowsNamed(page, old ? null : a.template);
                const win = await P.openAssign(page);
                const listed = await P.chooseRoleAndPerson(page, win, a.role, a.person);
                const chosen = await P.chooseTemplate(page, win, a.template);
                const message = L.flat(await P.readMessage(page, win), 160);
                record('assign-filled', await screen(page));
                const pressed = await P.press(page, win, 'OK', /save-?participant/i, 'assign-pressed');
                await P.openWorkflow(page, app, a.id, a.stage);
                record('assign-reloaded', await screen(page));
                const after = await L.rowsNamed(page, old ? null : a.template);
                const window_ = await L.readDiscussion(page, a.template, 'assign-discussion');
                return {listed, chosen: chosen.status, message, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices, heading: after.heading, rowsBefore: before.rows, rowsAfter: after.rows, window: window_};
            });
            await signOut(page);
            await step('tasks', async () => {
                await signIn(page, w.assign.username);
                const t = await L.tasks(page, app, 'assign-tasks');
                return {rows: t.rows.filter((r) => /discussion/i.test(r))};
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        record('walk', facts);
        await close();
    }
});
