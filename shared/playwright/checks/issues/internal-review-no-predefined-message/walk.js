// U35 OMP1 (issue report docs/issues/U35-OMP1-internal-review-no-predefined-message.md): on a press's
// Internal Review the predefined-message list of "Notify" and "Assign Participant" holds only its blank
// entry. The steps of the report, through the screens, on PKP's default dataset (OMP only), as dbarnes:
//   notify   submission 9 (it opens on Internal Review), row "David Buskins" › "More Actions" › "Notify":
//            the entries of "Choose a predefined message to use, or fill out the form below."
//   assign   the same page, "Assign": the entries of the same list
//   control  submission 2 (External Review), row "Alvin Finkel" › "Notify" and "Assign": the same lists
//   send     (SEND=1, the fix's check) on submission 9 "Notify" with "Discussion (Review)" chosen and a
//            message typed: sent, the discussion listed, the email received
//   letter   (SEND=1) "Notify" again with "Assign Editor" chosen: the letter fills "Message"
//
//   PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js omp shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r1-3_5 in front.)
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('../typed-participant-message-not-sent/lib.js');

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const stamp = Date.now().toString(36);
    const marker = `Hello David u35r1 internal review ${stamp}`;
    const facts = {app: app.name, line: app.line || 'main', marker};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const stageShown = async () => L.flat(await page.locator('[role="dialog"]:visible h2').first().innerText().catch(() => ''), 80);
    // Both windows' lists on a submission's page, the stage it opens on named.
    async function lists(id, stageKey, person, name) {
        await L.openWorkflow(page, app, id, stageKey);
        const stage = await stageShown();
        const nw = await L.openNotify(page, person);
        const notify = await L.templateOptions(nw);
        record(`${name}-notify`, await screen(page));
        await shot(page, `${name}-notify`).catch(() => {});
        await L.openWorkflow(page, app, id, stageKey);
        const aw = await L.openAssign(page);
        const assign = await L.templateOptions(aw);
        record(`${name}-assign`, await screen(page));
        return {stage, notify, assign};
    }
    try {
        await signIn(page, 'dbarnes');
        await step('internal', () => lists(9, null, 'David Buskins', 'internal'));
        await step('control', () => lists(2, 'workflow_3', 'Alvin Finkel', 'external'));
        if (process.env.SEND) {
            await step('send', async () => {
                await L.openWorkflow(page, app, 9, null);
                const win = await L.openNotify(page, 'David Buskins');
                const chosen = await L.chooseTemplate(page, win, 'Discussion (Review)');
                await L.typeMessage(page, win, marker);
                const pressed = await L.press(page, win, 'Notify', /send-?notification/i, 'send-pressed');
                await L.openWorkflow(page, app, 9, null);
                const d = await L.discussions(page);
                const mail = await L.waitMail(page, app, 'dbuskins@mailinator.com', marker, 40000);
                return {chosen, pressed: {status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices}, discussions: d && d.rows, mail};
            });
            await step('letter', async () => {
                await L.openWorkflow(page, app, 9, null);
                const win = await L.openNotify(page, 'David Buskins');
                const chosen = await L.chooseTemplate(page, win, 'Assign Editor');
                return {status: chosen.status, message: L.flat(await L.readMessage(page, win), 300)};
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        record('omp1-facts', facts);
        await close();
    }
});
