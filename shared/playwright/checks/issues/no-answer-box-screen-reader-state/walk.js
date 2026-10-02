// U37 A26 walk (issue report docs/issues/U37-A26-no-answer-box-screen-reader-opposite-state.md).
// On PKP's default test dataset, as dbarnes, at the Production stage of OJS 5, OMP 4, OPS 1:
//   "Add" a task "u37r13 task" (owner dbarnes, "Create Task (Do Not Start)") and a discussion "u37r13 discussion";
//   answer "No" to "Start this task", "Close this Discussion", "Reopen this Discussion" (after a "Yes" closed it) and
//   "Close this Task"; then on Settings › Workflow › "Tasks and Discussions" answer "No" to "Confirm Automatic Addition";
//   after each "No" read the box as it looks (its icon) and as a screen reader hears it (the accessibility tree);
//   reload both pages and read the boxes again.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/no-answer-box-screen-reader-state/walk.js
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front) the stage has the legacy discussions grid and
// Settings › Workflow no "Tasks and Discussions" tab: the script records both and stops.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

const TASK = 'u37r13 task';
const DISCUSSION = 'u37r13 discussion';

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

        if (facts.line !== 'main') {
            await step('stage', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${L.SUBMISSION[app.name]}&workflowMenuKey=${L.MENU_KEY}`));
                await idle(page);
                await L.sleep(1500);
                const s = await screen(page);
                record('stage', s);
                return {
                    vuePanel: await page.locator('[data-cy="discussion-manager"]').count(),
                    legacyGrid: await page.locator('[id^="component-grid-queries"]').count(),
                    dialog: L.flat(s.text.dialog, 1200),
                };
            });
            await step('settingsWorkflow', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
                await idle(page);
                const tabs = (await page.getByRole('tab').allInnerTexts()).map((t) => L.flat(t));
                record('settings-workflow', await screen(page));
                return {tabs, tasksTab: tabs.includes('Tasks and Discussions')};
            });
            record('facts', facts);
            return;
        }

        let panel;
        await step('add', async () => {
            panel = await L.openPanel(page, app);
            const t = await L.addItem(page, panel, {name: TASK, message: 'Please check.', task: {dateDue: L.dayFromToday(7), start: 'Create Task (Do Not Start)'}});
            const d = await L.addItem(page, panel, {name: DISCUSSION, message: 'Please look.'});
            await panel.reland();
            return {task: {group: await L.rowGroup(panel, TASK), ...t}, discussion: {group: await L.rowGroup(panel, DISCUSSION), ...d}};
        });
        // Steps 3-4
        await step('startNo', () => L.rowBoxAnswer(page, panel, TASK, 'Started', 'Start this task', 'No', 'start-no'));
        // Step 6
        await step('closeDiscussionNo', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Close this Discussion', 'No', 'close-discussion-no'));
        // Step 7
        await step('closeDiscussionYes', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Close this Discussion', 'Yes', 'close-discussion-yes'));
        // Step 8
        await step('reopenDiscussionNo', () => L.rowBoxAnswer(page, panel, DISCUSSION, 'Closed', 'Reopen this Discussion', 'No', 'reopen-discussion-no'));
        // Step 9
        await step('closeTaskNo', () => L.rowBoxAnswer(page, panel, TASK, 'Closed', 'Close this Task', 'No', 'close-task-no'));
        // Step 11, the panel
        await step('panelReloaded', async () => {
            await panel.reland();
            return {
                task: {group: await L.rowGroup(panel, TASK), started: await L.readBox(L.rowCell(panel, TASK, 'Started')), closed: await L.readBox(L.rowCell(panel, TASK, 'Closed'))},
                discussion: {group: await L.rowGroup(panel, DISCUSSION), closed: await L.readBox(L.rowCell(panel, DISCUSSION, 'Closed'))},
            };
        });
        // Step 10
        let tab;
        await step('autoAddNo', async () => {
            tab = await L.openTemplates(page, app);
            return L.autoAddAnswer(page, tab, app, 'No', 'auto-add-no');
        });
        // Step 11, the template screen
        await step('templatesReloaded', async () => {
            tab = await L.openTemplates(page, app);
            return L.readBox(L.autoAddCell(tab, app));
        });
        record('facts', facts);
    } finally {
        await close();
    }
});
