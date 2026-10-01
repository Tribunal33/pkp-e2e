// U35 A3 + OMP1 (issue report docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md):
// a message typed in "Notify" or "Assign Participant" with the predefined-message list left on its
// blank entry. The steps of the report, through the screens, on PKP's default dataset:
//   as dbarnes, the submission and stage of lib.js WORDS (OJS 4 Submission, OMP 9 Submission, OPS 1 Production)
//   notify   row "David Buskins" › "More Actions" › "Notify", "Message" typed, the list untouched, "Notify"
//   assign   "Assign", the role, "Search", "Minoti Inoue", "Message" typed, the list untouched, "OK";
//            the page reloaded, "Participants", the discussions and the "Activity Log" read
//   internal (OMP) the same two on submission 9's "Internal Review", whose list holds only the blank entry
//   blank    "Notify" again, the control's predefined message chosen, then the blank entry chosen again
//   control  the predefined message chosen and a message typed, "Notify"
//   mail     the control's email first, then the mailboxes for each typed message
//
//   PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js all shared/playwright/checks/issues/typed-participant-message-not-sent/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r1-3_5 in front.)
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const stamp = Date.now().toString(36);
    const M = {
        notify: `Hello David u35r1 notify ${stamp}`,
        assign: `Hello Minoti u35r1 assign ${stamp}`,
        inNotify: `Hello David u35r1 internal notify ${stamp}`,
        inAssign: `Hello Stephanie u35r1 internal assign ${stamp}`,
        control: `Hello David u35r1 control ${stamp}`,
    };
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, markers: M};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    // STEPS=internalNotify,internalAssign narrows a walk to the named steps (on a freshly reset dataset).
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

    // "Notify" with a typed message and the list untouched, on the stage `key`.
    async function notifyTyped(key, text, name) {
        await L.openWorkflow(page, app, w.id, key);
        const before = await L.discussions(page);
        const win = await L.openNotify(page, w.notify);
        const options = await L.templateOptions(win);
        await L.typeMessage(page, win, text);
        const filled = await screen(page);
        record(`${name}-filled`, filled);
        const pressed = await L.press(page, win, 'Notify', /send-?notification/i, `${name}-pressed`);
        await L.openWorkflow(page, app, w.id, key);
        const after = await L.discussions(page);
        const stageShown = L.flat(await page.locator('[role="dialog"]:visible h2').first().innerText().catch(() => ''), 80);
        return {stageShown, options, pressed, discussionsBefore: before && before.rows, discussionsAfter: after && after.rows, heading: after && after.heading};
    }

    // "Assign" with a typed message and the list untouched, on the stage `key`.
    async function assignTyped(key, person, text, name) {
        await L.openWorkflow(page, app, w.id, key);
        const rowsBefore = await L.participants(page);
        const win = await L.openAssign(page);
        const listed = await L.chooseRoleAndPerson(page, win, w.role, person);
        const options = await L.templateOptions(win);
        await L.typeMessage(page, win, text);
        record(`${name}-filled`, await screen(page));
        const pressed = await L.press(page, win, 'OK', /save-?participant/i, `${name}-pressed`);
        await L.openWorkflow(page, app, w.id, key);
        const rowsAfter = await L.participants(page);
        const after = await L.discussions(page);
        record(`${name}-reloaded`, await screen(page));
        await shot(page, `${name}-reloaded`).catch(() => {});
        const activity = await L.activityLog(page);
        return {listed, options, pressed, rowsBefore, rowsAfter, discussionsAfter: after && after.rows, activity};
    }

    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app, w.id, w.stage);
        record('workflow', await screen(page));
        await shot(page, 'workflow').catch(() => {});

        await step('notify', () => notifyTyped(w.stage, M.notify, 'notify'));
        await step('assign', () => assignTyped(w.stage, w.assign, M.assign, 'assign'));

        if (w.internal) {
            await step('internalNotify', () => notifyTyped(w.internal.stage, M.inNotify, 'internal-notify'));
            await step('internalAssign', () => assignTyped(w.internal.stage, w.internal.assign, M.inAssign, 'internal-assign'));
        }

        await step('blank', async () => {
            await L.openWorkflow(page, app, w.id, w.stage);
            const win = await L.openNotify(page, w.notify);
            const chosen = await L.chooseTemplate(page, win, w.control);
            const messageChosen = L.flat(await L.readMessage(page, win), 200);
            const blank = await L.chooseTemplate(page, win, '');
            const s = await screen(page);
            record('blank-again', s);
            return {chosen, messageChosen, blank, messageAfter: L.flat(await L.readMessage(page, win), 200), notices: s.notices};
        });

        await step('control', async () => {
            await L.openWorkflow(page, app, w.id, w.stage);
            const win = await L.openNotify(page, w.notify);
            const chosen = await L.chooseTemplate(page, win, w.control);
            await L.typeMessage(page, win, M.control);
            const pressed = await L.press(page, win, 'Notify', /send-?notification/i, 'control-pressed');
            await L.openWorkflow(page, app, w.id, w.stage);
            const after = await L.discussions(page);
            const activity = await L.activityLog(page, 6);
            return {chosen, pressed, discussionsAfter: after && after.rows, activity};
        });

        await step('mail', async () => {
            const out = {control: await L.waitMail(page, app, w.notifyMail, M.control, 40000)};
            out.notify = await L.waitMail(page, app, w.notifyMail, M.notify, 0);
            out.assign = await L.waitMail(page, app, w.assignMail, M.assign, 0);
            if (w.internal) {
                out.internalNotify = await L.waitMail(page, app, w.notifyMail, M.inNotify, 0);
                out.internalAssign = await L.waitMail(page, app, w.internal.assignMail, M.inAssign, 0);
            }
            return out;
        });
        await signOut(page).catch(() => {});
    } finally {
        record(only.length ? `facts-${only.join('-')}` : 'facts', facts);
        await close();
    }
});
