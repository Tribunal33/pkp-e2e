// Neighbour check of the A29 fix (issue report U51 A29): the same steps as walk.js, but
// "Open access date" is tomorrow; the task run today must send nothing for the issue, with
// the fix in and out (the fix takes out the extra runs only, never today's).
// Run: PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/open-access-email-sent-twice/neighbour.js
const {forEachApp, launch, signIn, record, drainJobs, note} = require('../../../probe');
const L = require('./lib.js');

const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUBJECT = `Free to read: ${ISSUE} of Journal of Public Knowledge is now open access`;
const READERS = ['rvaca@mailinator.com', 'dbarnes@mailinator.com'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const facts = {today: L.today(), tomorrow, line: app.line};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.step2 = await L.requireSubscriptions(page);
        facts.step3 = await L.setPolicies(page, {name: 'Ramiro Vaca', email: 'rvaca@mailinator.com', address: '1 Harbour Road', ticks: ['enableOpenAccessNotification']});
        facts.step4 = await L.issueOpensToday(page, ISSUE, tomorrow);
    } finally {
        await close();
    }
    const before = {};
    for (const to of READERS) before[to] = (await L.mails(app, to, SUBJECT)).length;
    const task = L.runTask(app, 'APP\\tasks\\OpenAccessNotification');
    facts.task = {status: task.status, out: L.flat(task.out, 800)};
    facts.jobs = (await drainJobs(app)).counts;
    await new Promise((r) => setTimeout(r, 3000));
    facts.sent = {};
    for (const to of READERS) facts.sent[to] = (await L.mails(app, to, SUBJECT)).length - before[to];
    record('neighbour', facts);
    note(`A29 neighbour ${app.line}: ${JSON.stringify(facts.sent)}`);
    console.log(JSON.stringify(facts, null, 1));
});
