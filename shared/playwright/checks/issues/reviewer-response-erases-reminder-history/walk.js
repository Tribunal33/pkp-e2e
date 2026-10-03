// Kept walk for docs/issues/U27-A15-reviewer-response-erases-reminder-history.md (spec U27, register A15).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes makes a reviewer's
// response overdue, sends a reminder and reads the row's "History"; the reviewer accepts; dbarnes
// reads "History" again, the "Review Report" download and the "Activity Log". Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=k5 node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/reviewer-response-erases-reminder-history/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: the "Review Submission - Before
// Due Date" reminder set to 7 days, a reviewer reminded before responding, then accepting with the
// review due in 5 days; the app's daily ReviewReminder task, run once, still sends the automatic
// reminder ("An automatic reminder email was sent to …" in the Activity Log, a second "A reminder to
// please complete your review" email).
const {forEachApp, launch, signIn, signOut, record, note, drainJobs} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const REMINDER = /^A reminder to please complete your review/;

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const id = c.pending;
    const who = c.reminded;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: id, reviewer: who.user};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U27 A15 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    const since = new Date();
    await signIn(page, 'dbarnes');

    if (MODE === 'neighbour') {
        await step('n0-setting', () => K.setSubmitReminderDays(page, app, 7));
        await step('n1-overdue', async () => K.editDueDates(page, await K.openWorkflow(page, app, id), who.name, {response: K.day(-1), review: K.day(5)}));
        await step('n2-reminder', async () => K.sendReminder(page, await K.openWorkflow(page, app, id), who.name));
        await signIn(page, who.user);
        await step('n3-accept', () => K.reviewerAccept(page, app, id));
        facts['n3-stored'] = K.assignmentDates(app, id, who.user);
        facts['n4-task'] = K.runScheduledTask(app, 'PKP\\task\\ReviewReminder');
        await step('n4-jobs', async () => K.flat((await drainJobs(app)).output, 300));
        facts['n4-stored'] = K.assignmentDates(app, id, who.user);
        await K.sleep(1500);
        await step('n5-mails', async () => (await K.mailsTo(app, `${who.user}@mailinator.com`, since)).map((m) => m.subject));
        facts['n5-reminder-mails'] = Array.isArray(facts['n5-mails']) ? facts['n5-mails'].filter((s) => REMINDER.test(s)).length : null;
        await signIn(page, 'dbarnes');
        await step('n6-activity', async () => {
            await K.openWorkflow(page, app, id);
            return (await K.activityLog(page, 'nb-activity-log')).filter((r) => /reminder/i.test(r));
        });
        record('a15-neighbour', facts);
        return;
    }

    await step('s1-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    await step('s2-edit', async () => K.editDueDates(page, await K.openWorkflow(page, app, id), who.name, {response: K.day(-1)}));
    await step('s2-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    await step('s3-reminder', async () => K.sendReminder(page, await K.openWorkflow(page, app, id), who.name));
    await step('s4-history-before', async () => K.history(page, await K.openWorkflow(page, app, id), who.name, 's4-history-before'));
    facts['s4-stored'] = K.assignmentDates(app, id, who.user);
    await signOut(page);
    await signIn(page, who.user);
    await step('s5-accept', () => K.reviewerAccept(page, app, id));
    facts['s5-stored'] = K.assignmentDates(app, id, who.user);
    await signIn(page, 'dbarnes');
    await step('s6-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    await step('s6-history-after', async () => K.history(page, await K.openWorkflow(page, app, id), who.name, 's6-history-after'));
    await step('s7-review-report', () => K.reviewReport(page, app, {id, reviewerName: who.name}));
    await step('s8-activity', async () => {
        await K.openWorkflow(page, app, id);
        return (await K.activityLog(page, 's8-activity-log')).slice(0, 8);
    });
    record('a15-summary', facts);
});
