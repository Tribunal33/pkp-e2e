// Kept walk for docs/issues/U29-A1-after-due-reminders-never-sent.md (spec U29, register A1).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes sets only the two
// "After Due Date" reminder sliders to 1 day; Paul Hudson accepts his request; dbarnes moves Julie
// Janssen's response due date and Paul Hudson's review due date into the past; the app's daily
// ReviewReminder task is run once; the two reviewers' mail and the workflow's Activity Log are read.
// Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/after-due-reminders-never-sent/walk.js
// (a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: the same setup, then the editor's
// own "Send Reminder" to Julie Janssen after her due date, then the task run twice. With or without
// the fix she gets no automatic reminder; with the fix Paul Hudson gets exactly one, not one per run.
// The task runs as cron starts it: `php lib/pkp/tools/scheduler.php test --name='PKP\task\ReviewReminder'`,
// then the jobs it queued.
const {forEachApp, launch, signIn, signOut, record, note, drainJobs} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const TASK = 'PKP\\task\\ReviewReminder';

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const id = c.pending;
    const request = c.reminded; // Julie Janssen: has not responded
    const review = c.declines; // Paul Hudson: accepts in step 3
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: id, request: request.user, review: review.user};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U29 A1 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const runTask = async (key) => {
        facts[`${key}-task`] = K.runScheduledTask(app, TASK);
        await step(`${key}-jobs`, async () => K.flat((await drainJobs(app)).output, 300));
    };
    const {page} = await launch(app);
    const since = new Date();
    facts.since = since.toISOString();

    await signIn(page, 'dbarnes');
    await step('s2-settings', () => L.setReminderSliders(page, app, {responseAfter: 1, submitAfter: 1}));
    await signOut(page);
    await signIn(page, review.user);
    await step('s3-accept', () => K.reviewerAccept(page, app, id));
    await signOut(page);
    await signIn(page, 'dbarnes');
    await step('s4-edit-request', async () => K.editDueDates(page, await K.openWorkflow(page, app, id), request.name, {response: K.day(-3)}));
    await step('s5-edit-review', async () => K.editDueDates(page, await K.openWorkflow(page, app, id), review.name, {response: K.day(-5), review: K.day(-3)}));
    await step('s5-rows', async () => {
        const modal = await K.openWorkflow(page, app, id);
        return {[request.name]: await K.rowText(modal, request.name), [review.name]: await K.rowText(modal, review.name)};
    });
    if (MODE === 'neighbour') {
        await step('n1-editor-reminder', async () => K.sendReminder(page, await K.openWorkflow(page, app, id), request.name));
    }
    facts['stored-before'] = {[request.user]: K.assignmentDates(app, id, request.user), [review.user]: K.assignmentDates(app, id, review.user)};

    await runTask('s6');
    if (MODE === 'neighbour') await runTask('n2');
    facts['stored-after'] = {[request.user]: K.assignmentDates(app, id, request.user), [review.user]: K.assignmentDates(app, id, review.user)};
    await K.sleep(2000);

    await step('s7-mail-request', () => L.subjects(app, request.user, since));
    await step('s7-mail-review', () => L.subjects(app, review.user, since));
    const count = (list, re) => (Array.isArray(list) ? list.filter((s) => re.test(s)).length : null);
    facts.counts = {
        requestReminders: count(facts['s7-mail-request'], L.REQUEST_REMINDER),
        reviewReminders: count(facts['s7-mail-review'], L.REVIEW_REMINDER),
    };
    await step('s7-activity', async () => {
        await K.openWorkflow(page, app, id);
        return (await K.activityLog(page, MODE === 'neighbour' ? 'a1-nb-activity-log' : 'a1-activity-log')).filter((r) => /remind/i.test(r));
    });
    record(MODE === 'neighbour' ? 'a1-neighbour' : 'a1-walk', facts);
});
