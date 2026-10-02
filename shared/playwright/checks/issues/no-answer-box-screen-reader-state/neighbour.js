// U37 A26 neighbour check (issue report docs/issues/U37-A26-no-answer-box-screen-reader-opposite-state.md): what the fix
// must leave alone, and one more way to leave the question. On PKP's default test dataset, as dbarnes:
//   1. a box with no question: "Add" › "Attach Files" › "Attach Workflow Files", a file's box pressed twice in the
//      first stage that lists files (ticked, then empty, to the eye and the screen reader alike);
//   2. "Yes" still saves: "u37r13 yes task" (owner dbarnes, "Create Task (Do Not Start)"): its "Started" box › "Yes"
//      (moves to "In progress", ticked and greyed); then its "Closed" box › "Yes" (moves to "Closed");
//   3. the template's "Auto-add at stage" box: the question left with Escape (nothing saved; the box as it was),
//      then "Yes" (ticked, "Your changes have been saved."), then "Yes" again to switch it off (empty).
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/no-answer-box-screen-reader-state/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

const TASK = 'u37r13 yes task';

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
        // 1. A box with no question (the workflow files' select column).
        await step('fileBox', async () => {
            panel = await L.openPanel(page, app);
            const win = await panel.openAdd();
            const attach = await win.openAttachFiles();
            await attach.openWorkflowFiles();
            const stages = (await attach.stageSelect().locator('option').allInnerTexts()).map((s) => L.flat(s));
            for (const stage of stages) {
                await attach.chooseStage(stage);
                await idle(page);
                await L.sleep(800);
                const box = attach.workflowRoot.locator('tbody input[type="checkbox"]').first();
                if (!(await box.count())) continue;
                const cell = attach.workflowRoot.locator('tbody td').filter({has: page.locator('input[type="checkbox"]')}).first();
                const before = await L.readBox(cell);
                await cell.locator('label').click();
                await L.sleep(400);
                const once = await L.readBox(cell);
                await cell.locator('label').click();
                await L.sleep(400);
                const twice = await L.readBox(cell);
                record('file-box', await screen(page));
                return {stage, before, once, twice};
            }
            return {stages, files: 'none listed'};
        });
        // 2. "Yes" still saves.
        await step('yes', async () => {
            await page.goto(page.url());
            panel = await L.openPanel(page, app);
            await L.addItem(page, panel, {name: TASK, message: 'Please check.', task: {dateDue: L.dayFromToday(7), start: 'Create Task (Do Not Start)'}});
            await panel.reland();
            const start = await L.rowBoxAnswer(page, panel, TASK, 'Started', 'Start this task', 'Yes', 'start-yes');
            await panel.reland();
            const close_ = await L.rowBoxAnswer(page, panel, TASK, 'Closed', 'Close this Task', 'Yes', 'close-task-yes');
            await panel.reland();
            return {start, close: close_, reloaded: {group: await L.rowGroup(panel, TASK), started: await L.readBox(L.rowCell(panel, TASK, 'Started')), closed: await L.readBox(L.rowCell(panel, TASK, 'Closed'))}};
        });
        // 3. The template's box: Escape, "Yes" on, "Yes" off.
        let tab;
        await step('autoAddEscape', async () => {
            tab = await L.openTemplates(page, app);
            return L.autoAddAnswer(page, tab, app, 'Escape', 'auto-add-escape');
        });
        await step('autoAddYesOn', async () => {
            tab = await L.openTemplates(page, app);
            const r = await L.autoAddAnswer(page, tab, app, 'Yes', 'auto-add-yes-on');
            tab = await L.openTemplates(page, app);
            return {...r, reloaded: await L.readBox(L.autoAddCell(tab, app))};
        });
        await step('autoAddYesOff', async () => {
            const r = await L.autoAddAnswer(page, tab, app, 'Yes', 'auto-add-yes-off');
            tab = await L.openTemplates(page, app);
            return {...r, reloaded: await L.readBox(L.autoAddCell(tab, app))};
        });
        record('neighbour', facts);
    } finally {
        await close();
    }
});
