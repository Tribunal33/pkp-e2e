// U35 OMP1 (issue report docs/issues/U35-OMP1-internal-review-no-predefined-message.md): on a press's
// Internal Review the predefined-message list of "Notify" and "Assign Participant" offers "Discussion
// (Review)" and no "Assign Editor" (since pkp/omp#2487; before it, only the blank entry). The steps of
// the report, through the screens, on PKP's default dataset (OMP only), as dbarnes:
//   internal  submission 9 (it opens on Internal Review), row "David Buskins" > "More Actions" > "Notify",
//             then "Assign": the entries of "Choose a predefined message to use, or fill out the form below."
//   control   submission 2 (External Review), row "Alvin Finkel": the same two lists
//   letter    (SEND=1, the fix's check) submission 9 "Notify" with "Assign Editor" chosen: the letter in
//             "Message"; sent with a marker line: the notice, the discussion listed, the email received,
//             the discussion's text (the recipient's name in place of NAME)
//   NEIGHBOUR=1 alone: the lists of External Review (submission 2) and Submission (submission 9), which
//             the fix must leave as they are
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 in front.)
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('../typed-participant-message-not-sent/lib.js');

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const stamp = Date.now().toString(36);
    const marker = `Hello David u35hk2 internal review ${stamp}`;
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
    // The discussion just sent, opened from the stage's discussions panel: the window's text.
    async function openDiscussion(title) {
        const link = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: title}).or(page.locator('[role="dialog"]:visible').first().getByRole('link', {name: title}));
        await link.last().click();
        await page.waitForTimeout(2500);
        const dlg = page.locator('[role="dialog"]:visible').last();
        record('discussion-open', await screen(page));
        await shot(page, 'discussion-open').catch(() => {});
        return L.flat(await dlg.innerText().catch(() => ''), 700);
    }
    try {
        await signIn(page, 'dbarnes');
        if (process.env.NEIGHBOUR) {
            // The fix's neighbour: the stages it must leave alone list as before, each entry once.
            await step('nb-external', () => lists(2, 'workflow_3', 'Alvin Finkel', 'nb-external'));
            await step('nb-submission', () => lists(9, 'workflow_1', 'David Buskins', 'nb-submission'));
        } else {
            await step('internal', () => lists(9, null, 'David Buskins', 'internal'));
            await step('control', () => lists(2, 'workflow_3', 'Alvin Finkel', 'external'));
        }
        if (process.env.SEND && !process.env.NEIGHBOUR) {
            await step('letter', async () => {
                await L.openWorkflow(page, app, 9, null);
                const win = await L.openNotify(page, 'David Buskins');
                const chosen = await L.chooseTemplate(page, win, 'Assign Editor');
                const letter = L.flat(await L.readMessage(page, win), 300);
                if (chosen.status == null) return {chosen, letter};
                // Send the letter with a marker line added at its end.
                const id = await win.locator('textarea[name="message"]').getAttribute('id');
                await page.frameLocator(`#${id}_ifr`).locator('body').click();
                await page.keyboard.press('ControlOrMeta+End');
                await page.keyboard.press('Enter');
                await page.keyboard.type(marker);
                const pressed = await L.press(page, win, 'Notify', /send-?notification/i, 'letter-pressed');
                await L.openWorkflow(page, app, 9, null);
                const d = await L.discussions(page);
                const mail = await L.waitMail(page, app, 'dbuskins@mailinator.com', marker, 40000);
                let discussion = null;
                try {
                    await L.openWorkflow(page, app, 9, null);
                    discussion = await openDiscussion('Assign Editor');
                } catch (e) {
                    discussion = {failed: String(e.message).slice(0, 200)};
                }
                return {chosen: chosen.status, letter, pressed: {status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices}, discussions: d && d.rows, mail, discussion};
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        record('omp1-facts', facts);
        await close();
    }
});
