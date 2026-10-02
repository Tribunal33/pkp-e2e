// Issue walk U51 A29: readers get the open-access email twice when an issue opens on the
// 1st of October (and of March, May, July, December). Run on the 1st of one of those months.
//
// Steps (PKP's default test dataset, OJS):
//   1  sign in as rvaca (Journal manager)
//   2  Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   3  Payments › "Subscription Policies": contact name, email and mailing address; tick
//      "Registered readers will have the option of receiving the table of contents by email
//      when an issue becomes open access."; "Save"
//   4  Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Access Status"
//      "Subscription", "Open access date" today (picked in the calendar), "Save"
//   5  in the OJS root: php lib/pkp/tools/scheduler.php test --name='APP\tasks\OpenAccessNotification'
//   6  in the OJS root: php lib/pkp/tools/jobs.php work --stop-when-empty (or load any page:
//      the dataset runs jobs on web requests)
//   7  the mailbox of amwandenga@mailinator.com (a reader) and rvaca@mailinator.com
//
// Run: PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/open-access-email-sent-twice/walk.js
const {forEachApp, launch, signIn, record, screen, drainJobs, note} = require('../../../probe');
const L = require('./lib.js');

const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUBJECT = `Free to read: ${ISSUE} of Journal of Public Knowledge is now open access`;
const READERS = ['amwandenga@mailinator.com', 'rvaca@mailinator.com', 'dbarnes@mailinator.com'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const facts = {today: L.today(), line: app.line};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.step2 = await L.requireSubscriptions(page);
        facts.step3 = await L.setPolicies(page, {
            name: 'Ramiro Vaca',
            email: 'rvaca@mailinator.com',
            address: '1 Harbour Road',
            ticks: ['enableOpenAccessNotification'],
        });
        facts.step4 = await L.issueOpensToday(page, ISSUE);
        record('issue-access', await screen(page));
    } finally {
        await close();
    }
    const before = {};
    for (const to of READERS) before[to] = (await L.mails(app, to, SUBJECT)).length;
    facts.before = before;
    const task = L.runTask(app, 'APP\\tasks\\OpenAccessNotification');
    facts.step5 = {status: task.status, out: L.flat(task.out, 1500)};
    facts.taskLog = L.lastTaskLog(app, 'OpenAccessNotification');
    const jobs = await drainJobs(app);
    facts.step6 = {passes: jobs.passes, counts: jobs.counts};
    await new Promise((r) => setTimeout(r, 3000));
    const after = {};
    for (const to of READERS) {
        const all = await L.mails(app, to, SUBJECT);
        after[to] = {count: all.length - (before[to] || 0), messages: all.slice(0, 4)};
    }
    facts.step7 = after;
    record('walk', facts);
    note(`A29 walk ${app.line} ${facts.today}: ${READERS.map((r) => `${r}=${after[r].count}`).join(' ')}`);
    console.log(JSON.stringify(facts, null, 1));
});
