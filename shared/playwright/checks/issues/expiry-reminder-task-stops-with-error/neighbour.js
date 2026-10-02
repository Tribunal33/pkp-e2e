// Neighbour check of the A27 fix (issue report U51 A27): the fix changes the institutional
// subscriptions' end-date query, so an institutional subscription ending on the day the
// reminder looks for must get its reminder too, and one ending on another day must not.
// Steps 1-5 of walk.js, then as rvaca:
//   N1  Settings › "Institutions" › "Add Institution": "u51sb1 Harbour Library", "Save"
//   N2  Payments › "Subscription Types" › "Create New Subscription Type": "u51sb1 Campus Year",
//       "Institutional", US Dollar, cost 400, duration 12, "Save"
//   N3  Payments › "Institutional Subscriptions" › "Create New Subscription": sberardo,
//       "u51sb1 Campus Year", "Active", start today, end the same day next month,
//       "u51sb1 Harbour Library", a mailing address, domain "harbour.ac.uk", "Save"
//   N4  the same for minoue, ending 14 days later
//   N5  the task run as in walk.js step 6; the mailboxes of sberardo and minoue
// Run: PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/neighbour.js
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const L = require('./lib.js');

const SUBJECT = 'Notice of Subscription Expiry';
const IDS = {dbarnes: 3, sberardo: 5, minoue: 6};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = L.oneMonthAfter(today);
    const later = new Date(end.getTime() + 14 * 86_400_000);
    const facts = {line: app.line, today: L.ymd(today), end: L.ymd(end), later: L.ymd(later)};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.step2 = await L.requireSubscriptions(page);
        facts.step3 = await L.createType(page, {name: 'u51sb1 Online Year', cost: 40, duration: 12});
        facts.step4 = await L.setPolicies(page, {name: 'Ramiro Vaca', email: 'rvaca@mailinator.com', address: '1 Harbour Road', selects: {numMonthsBeforeSubscriptionExpiryReminder: '1 Months'}});
        facts.step5 = await L.createSubscription(page, {username: 'dbarnes', userId: IDS.dbarnes, type: 'u51sb1 Online Year', start: L.ymd(today), end: L.ymd(end)});
        facts.N1 = await L.createInstitution(page, 'u51sb1 Harbour Library');
        facts.N2 = await L.createType(page, {name: 'u51sb1 Campus Year', cost: 400, duration: 12, institutional: true});
        facts.N3 = await L.createSubscription(page, {username: 'sberardo', userId: IDS.sberardo, type: 'u51sb1 Campus Year', start: L.ymd(today), end: L.ymd(end), institution: 'u51sb1 Harbour Library'});
        facts.N4 = await L.createSubscription(page, {username: 'minoue', userId: IDS.minoue, type: 'u51sb1 Campus Year', start: L.ymd(today), end: L.ymd(later), institution: 'u51sb1 Harbour Library'});
    } finally {
        await close();
    }
    const who = ['dbarnes', 'sberardo', 'minoue'];
    const before = {};
    for (const u of who) before[u] = (await L.mails(app, `${u}@mailinator.com`, SUBJECT)).length;
    const task = L.runTask(app, 'APP\\tasks\\SubscriptionExpiryReminder');
    facts.N5 = {status: task.status, out: L.flat(task.out, 1500)};
    facts.taskLog = L.lastTaskLog(app, 'SubscriptionExpiryReminder');
    await new Promise((r) => setTimeout(r, 4000));
    facts.sent = {};
    for (const u of who) facts.sent[u] = (await L.mails(app, `${u}@mailinator.com`, SUBJECT)).length - before[u];
    record('neighbour', facts);
    note(`A27 neighbour ${app.line}: task exit ${task.status}; sent ${JSON.stringify(facts.sent)}`);
    console.log(JSON.stringify(facts, null, 1));
});
