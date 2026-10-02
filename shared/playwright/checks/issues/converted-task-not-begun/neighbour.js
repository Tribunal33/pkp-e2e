// Neighbour checks for the three fixes of U37 A25 + A28 (walk.js beside it holds the steps), run with each fix in and out.
// On PKP's default test dataset, as dbarnes, at the Production stage of OJS 5, OMP 4, OPS 1:
//   - "Add" a task "u37r11 begun" with "Begin Task Upon Saving" (In progress) and one "u37r11 not begun" with
//     "Create Task (Do Not Start)" (Yet to begin): the History of each, and the drop-down "Edit" shows on each;
//   - "Add" the discussion "u37r11 waiting" and turn it into a task by "Add Task Details" choosing
//     "Create Task (Do Not Start)" where the drop-down can be chosen (it stays under "Yet to begin");
//   - "Edit" on "u37r11 begun": make the second participant its owner; the History's reassignment line and
//     the PHP server log lines of that save.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<tag> node bin/probe.js all shared/playwright/checks/issues/converted-task-not-begun/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const dates = L.serverDates(app);
    const log = L.serverLog(app);
    const second = L.SECOND[app.name];
    const facts = {app: app.name, line: app.line || 'main', dates};
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
        await step('addBegun', async () => {
            panel = await L.openPanel(page, app);
            log.mark();
            const r = await L.addItem(page, panel, {name: 'u37r11 begun', message: 'Begin at once.', second, task: {dateDue: dates.inAWeek, start: 'Begin Task Upon Saving'}});
            return {second: r.second, serverLog: log.since()};
        });
        await step('addNotBegun', () => L.addItem(page, panel, {name: 'u37r11 not begun', message: 'Wait for now.', second, task: {dateDue: dates.inAWeek, start: 'Create Task (Do Not Start)'}}).then((r) => ({second: r.second})));
        await step('rowBegun', () => L.readRow(page, panel, 'u37r11 begun'));
        await step('rowNotBegun', () => L.readRow(page, panel, 'u37r11 not begun'));
        await step('historyBegun', () => L.readHistory(page, panel, 'u37r11 begun', 'n-begun'));
        await step('editSelectBegun', () => L.readEditSelect(page, panel, 'u37r11 begun', 'n-begun'));
        await step('editSelectNotBegun', () => L.readEditSelect(page, panel, 'u37r11 not begun', 'n-notbegun'));

        await step('addWaiting', () => L.addItem(page, panel, {name: 'u37r11 waiting', message: 'A discussion first.', second}).then((r) => ({second: r.second})));
        await step('convertDoNotStart', async () => {
            log.mark();
            const r = await L.convert(page, panel, 'u37r11 waiting', {entry: 'Add Task Details', dateDue: dates.inAWeek, start: 'Create Task (Do Not Start)', label: 'n-waiting'});
            r.serverLog = log.since();
            return r;
        });
        await step('rowWaiting', () => L.readRow(page, panel, 'u37r11 waiting'));
        await step('historyWaiting', () => L.readHistory(page, panel, 'u37r11 waiting', 'n-waiting'));

        await step('reassign', async () => {
            log.mark();
            const status = await L.reassign(page, panel, 'u37r11 begun', second);
            return {status, serverLog: log.since()};
        });
        await step('rowReassigned', () => L.readRow(page, panel, 'u37r11 begun'));
        await step('historyReassigned', () => L.readHistory(page, panel, 'u37r11 begun', 'n-reassigned'));
        record('neighbour', facts);
        record('neighbour-panel', await screen(page));
    } finally {
        await close();
    }
});
