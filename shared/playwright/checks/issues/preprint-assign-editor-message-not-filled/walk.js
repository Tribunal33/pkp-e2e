// U35 OPS2 (issue report docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md):
// on a preprint server the predefined message "Assign Editor" fills nothing. The steps of the report,
// through the screens, on PKP's default dataset, as dbarnes, on the Production stage of
// OPS 1 (the finding), OJS 5 and OMP 4 (the controls):
//   notify   row › "More Actions" › "Notify"; "Assign Editor" chosen in the predefined-message list;
//            then "Discussion (Production)", then "Assign Editor" again; "Cancel"
//   assign   "Assign", the role, "Search", "Minoti Inoue", "Assign Editor" chosen, "OK";
//            the page reloaded, "Participants" and the discussions read
//   mail     Minoti Inoue's mailbox, for a message naming this install's address
// The neighbour of the fix (the stage's other predefined message, "Discussion (Production)", still
// filling "Please enter your message.") is the notify step's second choice.
//
//   PROBE_FEATURE=issues-r7 PROBE_AGENT=r7 node bin/probe.js all shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r7-3_5 in front.)
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('../typed-participant-message-not-sent/lib.js');

const WORDS = {
    ojs: {id: 5, notify: 'David Buskins', role: 'Section editor'},
    omp: {id: 4, notify: 'Graham Cox', role: 'Series editor'},
    ops: {id: 1, notify: 'David Buskins', role: 'Moderator'},
};
const STAGE = 'workflow_5';
const DISCUSSION = 'Discussion (Production)';

forEachApp(async (app) => {
    const w = WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.id};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    // STEPS=notify narrows a walk to the named steps (the fix's first check, before the install step is replayed).
    const only = (process.env.STEPS || '').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (only.length && !only.includes(name)) return;
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
    // The list's entry for the letter to a newly assigned editor: "Assign Editor" on main, the line's own name on 3.5.
    const assignEntry = (options) => options.find((o) => o === 'Assign Editor') || options.find((o) => /assign/i.test(o));

    try {
        await signIn(page, 'dbarnes');
        await step('notify', async () => {
            await L.openWorkflow(page, app, w.id, STAGE);
            const win = await L.openNotify(page, w.notify);
            const options = await L.templateOptions(win);
            const entry = assignEntry(options);
            const first = await L.chooseTemplate(page, win, entry);
            const messageFirst = L.flat(await L.readMessage(page, win), 300);
            const s = await screen(page);
            record('notify-assign-editor', s);
            await shot(page, 'notify-assign-editor').catch(() => {});
            const discussion = await L.chooseTemplate(page, win, DISCUSSION);
            const messageDiscussion = L.flat(await L.readMessage(page, win), 300);
            const again = await L.chooseTemplate(page, win, entry);
            const messageAgain = L.flat(await L.readMessage(page, win), 300);
            const s2 = await screen(page);
            record('notify-assign-editor-again', s2);
            await win.locator('form').getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {});
            await L.sleep(800);
            return {options, entry, first, messageFirst, noticesFirst: s.notices, discussion, messageDiscussion, again, messageAgain, noticesAgain: s2.notices};
        });

        await step('assign', async () => {
            await L.openWorkflow(page, app, w.id, STAGE);
            const rowsBefore = await L.participants(page);
            const before = await L.discussions(page);
            const win = await L.openAssign(page);
            const listed = await L.chooseRoleAndPerson(page, win, w.role, 'Minoti Inoue');
            const options = await L.templateOptions(win);
            const entry = assignEntry(options);
            const chosen = await L.chooseTemplate(page, win, entry);
            const message = L.flat(await L.readMessage(page, win), 300);
            record('assign-chosen', await screen(page));
            await shot(page, 'assign-chosen').catch(() => {});
            const pressed = await L.press(page, win, 'OK', /save-?participant/i, 'assign-pressed');
            await L.openWorkflow(page, app, w.id, STAGE);
            const rowsAfter = await L.participants(page);
            const after = await L.discussions(page);
            record('assign-reloaded', await screen(page));
            return {listed, options, entry, chosen, message, pressed, rowsBefore, rowsAfter, discussionsBefore: before && before.rows, discussionsAfter: after && after.rows};
        });

        await step('mail', async () => {
            const here = new URL(app.baseURL).host;
            return {install: here, minoue: await L.waitMail(page, app, 'minoue@mailinator.com', here, 25000)};
        });
        await signOut(page).catch(() => {});
    } finally {
        record(only.length ? `facts-${only.join('-')}` : 'facts', facts);
        await close();
    }
});
