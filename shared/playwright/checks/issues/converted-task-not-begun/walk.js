// U37 A25 + A28 walk (issue reports docs/issues/U37-A25-converted-task-not-begun.md,
// docs/issues/U37-A28-converted-task-history-says-task-created.md, docs/issues/U37-A28-task-first-owner-server-warning.md).
// On PKP's default test dataset, as dbarnes, at the Production stage of OJS 5, OMP 4, OPS 1:
//   "Add" the discussion "u37r11 galley check" (dbarnes and gcox on OJS and OMP, dbuskins on OPS); read its History; "Add Task Details": read the drop-down, due in
//   seven days, owner Daniel Barnes, "Save"; read the row (group, "Started") and the History; then "Edit" on the
//   task and read the drop-down again. The same through "Edit" and its "Enter task information" box with the
//   discussion "u37r11 proof check". The PHP server log lines each save adds are read too.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/converted-task-not-begun/walk.js
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front) the stage has no tasks: the script records the
// stage's discussions and the "Add discussion" window, and stops.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

const VIA_DETAILS = 'u37r11 galley check';
const VIA_EDIT = 'u37r11 proof check';

forEachApp(async (app) => {
    const dates = L.serverDates(app);
    const log = L.serverLog(app);
    const facts = {app: app.name, line: app.line || 'main', dates, log: log.file};
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
                return {dialog: L.flat(s.text.dialog, 1500), addDiscussion: window_, offersTasks: /Task Information|Enter task information|Add Task Details/.test((window_ || '') + (s.text.dialog || ''))};
            });
            record('facts', facts);
            return;
        }

        let panel;
        // "Add Task Details" path
        await step('addDiscussion', async () => {
            panel = await L.openPanel(page, app);
            return L.addItem(page, panel, {name: VIA_DETAILS, message: 'Please check the galley.', second: L.SECOND[app.name]});
        });
        await step('discussionRow', () => L.readRow(page, panel, VIA_DETAILS));
        await step('discussionHistory', () => L.readHistory(page, panel, VIA_DETAILS, 'details-before'));
        await step('convertByDetails', async () => {
            log.mark();
            const r = await L.convert(page, panel, VIA_DETAILS, {entry: 'Add Task Details', dateDue: dates.inAWeek, label: 'details'});
            r.serverLog = log.since();
            return r;
        });
        await step('taskRowByDetails', async () => {
            const r = await L.readRow(page, panel, VIA_DETAILS);
            record('details-panel', await screen(page));
            return r;
        });
        await step('taskHistoryByDetails', () => L.readHistory(page, panel, VIA_DETAILS, 'details-after'));
        await step('taskEditSelect', () => L.readEditSelect(page, panel, VIA_DETAILS, 'details-task'));

        // "Edit" path
        await step('addDiscussion2', () => L.addItem(page, panel, {name: VIA_EDIT, message: 'Please check the proofs.', second: L.SECOND[app.name]}));
        await step('convertByEdit', async () => {
            log.mark();
            const r = await L.convert(page, panel, VIA_EDIT, {entry: 'Edit', dateDue: dates.inAWeek, label: 'edit'});
            r.serverLog = log.since();
            return r;
        });
        await step('taskRowByEdit', () => L.readRow(page, panel, VIA_EDIT));
        await step('taskHistoryByEdit', () => L.readHistory(page, panel, VIA_EDIT, 'edit-after'));
        record('facts', facts);
    } finally {
        await close();
    }
});
