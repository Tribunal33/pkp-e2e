// Issue walk U51 A27: the scheduled task that sends "Subscription Expiry Reminders" stops
// with an error when the site's scheduler runs it, and sends nothing.
//
// Steps (PKP's default test dataset, OJS):
//   1  sign in as rvaca (Journal manager)
//   2  Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   3  Payments › "Subscription Types" › "Create New Subscription Type": "u51sb1 Online Year",
//      US Dollar, cost 40, duration 12, "Save"
//   4  Payments › "Subscription Policies": contact name, email, mailing address;
//      "Notice of Subscription Expiry" months before: "1 Months"; "Save"
//   5  Payments › "Individual Subscriptions" › "Create New Subscription": dbarnes,
//      "u51sb1 Online Year", "Active", start today, end the same day next month, "Save"
//   6  in the OJS root: php lib/pkp/tools/scheduler.php test --name='APP\tasks\SubscriptionExpiryReminder'
//   7  the mailbox of dbarnes@mailinator.com; the task's log in files_dir/scheduledTaskLogs
//
// `extra` as the script's argument also adds the A8 subscription (dbuskins, ending 14 days
// after dbarnes's) and the schedule list (`scheduler.php list`); see the A8 walk.
//
// Run: PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/walk.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const L = require('./lib.js');

const TYPE = 'u51sb1 Online Year';
const SUBJECT = 'Notice of Subscription Expiry';
const IDS = {dbarnes: 3, dbuskins: 4};
const EXTRA = process.argv.includes('extra');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = L.oneMonthAfter(today);
    const later = new Date(end.getTime() + 14 * 86_400_000);
    const facts = {line: app.line, today: L.ymd(today), ends: {dbarnes: L.ymd(end), dbuskins: EXTRA ? L.ymd(later) : null}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.step2 = await L.requireSubscriptions(page);
        facts.step3 = await L.createType(page, {name: TYPE, cost: 40, duration: 12});
        facts.step4 = await L.setPolicies(page, {
            name: 'Ramiro Vaca', email: 'rvaca@mailinator.com', address: '1 Harbour Road',
            selects: {numMonthsBeforeSubscriptionExpiryReminder: '1 Months'},
        });
        facts.step5 = await L.createSubscription(page, {username: 'dbarnes', userId: IDS.dbarnes, type: TYPE, start: L.ymd(today), end: L.ymd(end)});
        if (EXTRA) facts.step5b = await L.createSubscription(page, {username: 'dbuskins', userId: IDS.dbuskins, type: TYPE, start: L.ymd(today), end: L.ymd(later)});
    } finally {
        await close();
    }
    const before = {dbarnes: (await L.mails(app, 'dbarnes@mailinator.com', SUBJECT)).length, dbuskins: (await L.mails(app, 'dbuskins@mailinator.com', SUBJECT)).length};
    if (EXTRA) {
        // the schedule as `scheduler.php list` prints it; the two monthly neighbours are the
        // A8 fix's neighbour check (they must stay monthly)
        facts.schedule = L.scheduleLine(app, 'APP\\tasks\\SubscriptionExpiryReminder');
        facts.neighbours = [...L.scheduleLine(app, 'PKP\\task\\EditorialReminders'), ...L.scheduleLine(app, 'PKP\\task\\StatisticsReport')];
    }
    const task = L.runTask(app, 'APP\\tasks\\SubscriptionExpiryReminder');
    facts.step6 = {status: task.status, out: L.flat(task.out, 2500)};
    facts.taskLog = L.lastTaskLog(app, 'SubscriptionExpiryReminder');
    await new Promise((r) => setTimeout(r, 4000));
    facts.step7 = {};
    for (const u of ['dbarnes', 'dbuskins']) {
        const all = await L.mails(app, `${u}@mailinator.com`, SUBJECT);
        facts.step7[u] = {count: all.length - before[u], latest: all[0] || null};
    }
    record(EXTRA ? 'walk-extra' : 'walk', facts);
    note(`A27 walk${EXTRA ? ' extra' : ''} ${app.line} ${facts.today}: task exit ${task.status}; sent ${JSON.stringify(facts.step7)}`);
    console.log(JSON.stringify(facts, null, 1));
});
