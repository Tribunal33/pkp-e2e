// U37 A16 + A17 neighbour check (issue report docs/issues/U37-A16-A17-task-due-today-or-closed-reads-overdue.md).
// A task past its due date must still read overdue while it is open, with or without the fix; closed, it must not.
// A person gets such a task by creating one due today and waiting a day. The check creates "u37r5 past due" on screen
// (as walk.js does, due today) and then moves its stored due date back one day in edit_tasks.date_due, the value the
// screen would have saved the day before; everything else goes through the screens.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=n1 node bin/probe.js all shared/playwright/checks/issues/task-due-today-reads-overdue/neighbour.js
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const L = require('./lib.js');

const NAME = 'u37r5 past due';

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
        let panel;
        await step('add', async () => {
            panel = await L.openPanel(page, app);
            return L.addTask(page, panel, {name: NAME, dateDue: server.today, message: 'Please finish this.'});
        });
        await step('backdate', async () => {
            const title = NAME.replace(/'/g, "''");
            sql(app, `UPDATE edit_tasks SET date_due = date_due - INTERVAL '1 day' WHERE title = '${title}'`);
            return sql(app, `SELECT edit_task_id, date_due, date_closed FROM edit_tasks WHERE title = '${title}'`);
        });
        await step('open', () => L.readAll(page, panel, NAME, 'past-open'));
        await step('close', async () => {
            await L.closeTask(page, panel, NAME);
            return 'closed';
        });
        await step('closed', () => L.readAll(page, panel, NAME, 'past-closed'));
        record('facts', facts);
    } finally {
        await close();
    }
});
