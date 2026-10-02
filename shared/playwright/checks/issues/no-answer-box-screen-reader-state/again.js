// U37 A26, pressing the box again after "No" (issue report docs/issues/U37-A26-no-answer-box-screen-reader-opposite-state.md).
// On PKP's default test dataset, as dbarnes, at the Production stage of OJS 5, OMP 4, OPS 1:
//   a task "u37r13 again task" (owner dbarnes, "Create Task (Do Not Start)"): "Started" › "No", then the box pressed
//   again: which question, "No" again, then pressed a third time and "Yes";
//   a discussion "u37r13 again discussion" closed with "Yes": "Closed" › "Reopen this Discussion" › "No", pressed again:
//   which question, "No";
//   the template's "Auto-add at stage" box: "No", pressed again: which question, "No".
//   Each read: the question's title and sentence, the box as it looks and as the accessibility tree reads it, the
//   requests sent, the row's group.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/no-answer-box-screen-reader-state/again.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

const TASK = 'u37r13 again task';
const DISCUSSION = 'u37r13 again discussion';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        let panel;
        await step('add', async () => {
            panel = await L.openPanel(page, app);
            await L.addItem(page, panel, {name: TASK, message: 'Please check.', task: {dateDue: L.dayFromToday(7), start: 'Create Task (Do Not Start)'}});
            await L.addItem(page, panel, {name: DISCUSSION, message: 'Please look.'});
            await panel.reland();
            return {task: await L.rowGroup(panel, TASK), discussion: await L.rowGroup(panel, DISCUSSION)};
        });
        // The task's "Started" box: No, again No, then Yes.
        await step('start1No', () => L.rowBoxAnswer(page, panel, TASK, 'Started', 'Start this task', 'No', 'again-start1-no'));
        await step('start2No', () => L.rowBoxAnswer(page, panel, TASK, 'Started', 'Start this task', 'No', 'again-start2-no'));
        await step('start3Yes', () => L.rowBoxAnswer(page, panel, TASK, 'Started', 'Start this task', 'Yes', 'again-start3-yes'));
        // The discussion: closed with Yes, then Reopen › No, then pressed again.
        await step('closeYes', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Close this Discussion', 'Yes', 'again-close-yes'));
        await step('reopen1No', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Reopen this Discussion', 'No', 'again-reopen1-no'));
        await step('reopen2No', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Reopen this Discussion', 'No', 'again-reopen2-no'));
        // The template's box: No, then pressed again.
        let tab;
        await step('autoAdd1No', async () => {
            tab = await L.openTemplates(page, app);
            return L.autoAddAnswer(page, tab, app, 'No', 'again-auto-add1-no');
        });
        await step('autoAdd2No', () => L.autoAddAnswer(page, tab, app, 'No', 'again-auto-add2-no'));
        record('again', facts);
    } finally {
        await close();
    }
});
