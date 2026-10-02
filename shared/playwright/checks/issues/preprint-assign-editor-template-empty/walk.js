// U37 OPS1 (joined to docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md):
// a preprint server's discussion template "Assign Editor" has no text. The report's steps through the
// screens, on PKP's default dataset, as dbarnes (ccorino submits the preprint of the auto-add steps):
//   add       OPS submission 1, Production, "Production Tasks & Discussions" › "Add":
//             "DISCUSSION - Assign Editor", tick David Buskins, "Save"; "DISCUSSION - Discussion (Production)",
//             "DISCUSSION - Assign Editor" again, "Save"; "Cancel" when refused.
//             Control on OJS submission 5 (David Buskins) and OMP submission 4 (Graham Cox): the letter fills and saves.
//   settings  Settings › Workflow › "Tasks and Discussions", "Assign Editor" › "Edit": its "Discussion" box; "Save".
//   autoadd   "Auto-add at stage" on "Assign Editor", "Yes"; ccorino submits "u37r6 auto-add"; dbarnes opens the
//             new preprint's "Assign Editor" discussion.
//   wayround  "Assign Editor" › "Edit", "u37r6 letter" typed, "Save"; "Add" on submission 1, "DISCUSSION - Assign Editor".
//   neighbour (only when named in STEPS) "Add" on submission 1: "DISCUSSION - Discussion (Production)", then
//             "DISCUSSION - Assign Editor", "Cancel": the stage's other template keeps "Please enter your message.".
//   notifyempty (only when named in STEPS) OPS submission 1, "Participants", David Buskins › "More Actions" › "Notify",
//             "Assign Editor" chosen, "Notify" pressed with "Message" left as the choice left it; "Cancel" if still open.
//   add35     (3.5 only) "Production Discussions" › "Add discussion", "Editor Assigned" chosen in the predefined-message list.
// The neighbour of the fix is the neighbour step, walked with the fix in and out, and the OJS and OMP controls.
//
//   PROBE_FEATURE=issues-u37r6 PROBE_AGENT=u37r6 node bin/probe.js all shared/playwright/checks/issues/preprint-assign-editor-template-empty/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u37r6-3_5 in front, ONLY=ops.)
//   STEPS=add,settings narrows a walk to the named steps.
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

const WORDS = {
    ojs: {id: 5, person: 'dbuskins'},
    omp: {id: 4, person: 'gcox'},
    ops: {id: 1, person: 'dbuskins'},
};
const ENTRY = 'Assign Editor';
const DISCUSSION = 'Discussion (Production)';

forEachApp(async (app) => {
    const w = WORDS[app.name];
    const is35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main', submission: w.id};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const only = (process.env.STEPS || '').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (only.length ? !only.includes(name) : ['neighbour', 'notifyempty'].includes(name)) return;
        if (is35 !== (name === 'add35')) return;
        if (app.name !== 'ops' && name !== 'add') return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        log(name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');

        await step('add35', async () => H.addDiscussion35(page, app, w.id, /assign/i));

        await step('add', async () => {
            const panel = await H.openPanel(page, app, w.id);
            const win = await panel.openAdd();
            const first = await H.pressTemplate(page, win, ENTRY);
            await win.tick(w.person);
            const saved = await H.save(page, win, 'add-save');
            const out = {first, saved};
            if (saved.windowOpen) {
                out.discussion = await H.pressTemplate(page, win, DISCUSSION);
                out.again = await H.pressTemplate(page, win, ENTRY);
                out.savedAgain = await H.save(page, win, 'add-save-again');
                if (out.savedAgain.windowOpen) {
                    await win.cancelButton().click();
                    await H.sleep(800);
                }
            } else {
                out.item = await H.readItem(page, panel, ENTRY, 'add-item');
            }
            return out;
        });

        await step('neighbour', async () => {
            const panel = await H.openPanel(page, app, w.id);
            const win = await panel.openAdd();
            const discussion = await H.pressTemplate(page, win, DISCUSSION);
            const assign = await H.pressTemplate(page, win, ENTRY);
            await win.cancelButton().click();
            await H.sleep(800);
            return {discussion, assign};
        });

        await step('notifyempty', async () => {
            const N = require('../typed-participant-message-not-sent/lib.js');
            await N.openWorkflow(page, app, w.id, 'workflow_5');
            const win = await N.openNotify(page, 'David Buskins');
            const chosen = await N.chooseTemplate(page, win, ENTRY);
            const message = H.flat(await N.readMessage(page, win), 200);
            const pressed = await N.press(page, win, 'Notify', /stage-participant-grid\/send-notification|sendNotification/i, 'notify-empty');
            if (pressed.windowOpen) await win.locator('form').getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {});
            return {chosen: chosen.status, message, pressed};
        });

        await step('settings', async () => H.editTemplate(page, app, ENTRY, 'settings-save'));

        await step('autoadd', async () => {
            const box = await H.autoAdd(page, app, ENTRY);
            const {submitAs} = require('../editorial-submitter-no-acknowledgement/lib.js');
            const sub = await submitAs(page, app, 'ccorino', 'u37r6 auto-add');
            await signIn(page, 'dbarnes');
            const panel = await H.openPanel(page, app, sub.id);
            const item = await H.readItem(page, panel, ENTRY, 'autoadd-item');
            return {box, submission: {id: sub.id, problems: sub.problems}, item};
        });

        await step('wayround', async () => {
            const saved = await H.editTemplate(page, app, ENTRY, 'wayround-save', {text: 'u37r6 letter'});
            const panel = await H.openPanel(page, app, w.id);
            const win = await panel.openAdd();
            const filled = await H.pressTemplate(page, win, ENTRY);
            await win.cancelButton().click();
            await H.sleep(800);
            return {saved, filled};
        });

        await signOut(page).catch(() => {});
    } finally {
        record('walk', facts);
        await close();
    }
});
