// U37 A16 + A17 walk (issue report docs/issues/U37-A16-A17-task-due-today-or-closed-reads-overdue.md).
// On PKP's default test dataset, as dbarnes, at the Production stage of OJS 5, OMP 4, OPS 1:
//   "Add" a task "u37r5 due today" with today's date as its "Due Date", Daniel Barnes as its owner, begun on saving;
//   read its row's "Activity", the window's badge and the History's first line; close it from the row's "Closed" box
//   and read the same three again.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/task-due-today-reads-overdue/walk.js
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front) the stage has no tasks: the script records the
// stage's discussions and the "Add discussion" window, and stops.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NAME = 'u37r5 due today';

forEachApp(async (app) => {
    const server = L.serverToday(app);
    const facts = {app: app.name, line: app.line || 'main', server};
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
        facts.browser = await L.browserClock(page);

        if (facts.line !== 'main') {
            await step('stage', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${L.SUBMISSION[app.name]}&workflowMenuKey=${L.MENU_KEY}`));
                await idle(page);
                await L.sleep(1500);
                const s = await screen(page);
                record('stage', s);
                const add = page.getByRole('dialog').last().getByText(/Add discussion/i).first();
                let window_ = null;
                if (await add.isVisible().catch(() => false)) {
                    await add.click();
                    await idle(page);
                    await L.sleep(1500);
                    const w = await screen(page);
                    record('add-discussion', w);
                    window_ = L.flat(w.text.dialog, 1500);
                }
                return {dialog: L.flat(s.text.dialog, 1500), addDiscussion: window_, mentionsDueDate: /Due Date/.test(window_ || '')};
            });
            record('facts', facts);
            return;
        }

        let panel;
        await step('add', async () => {
            panel = await L.openPanel(page, app);
            return L.addTask(page, panel, {name: NAME, dateDue: server.today, message: 'Please finish this today.'});
        });
        await step('open', () => L.readAll(page, panel, NAME, 'open'));
        await step('close', async () => {
            await L.closeTask(page, panel, NAME);
            return 'closed';
        });
        await step('closed', () => L.readAll(page, panel, NAME, 'closed'));
        facts.serverAfter = L.serverToday(app);
        record('facts', facts);
    } finally {
        await close();
    }
});
