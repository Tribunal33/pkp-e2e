// Fix check of issue report U51 A8, beside walk.js: with the fix (and A27's) applied, the
// reminder task run as if it were other days reaches each end date on its own day, December
// and the 31st included. The day is moved with seam.php (Carbon::setTestNow()), which only
// the fixed code follows.
//   As rvaca: subscriptions required; type "u51sb1 Online Year"; "Subscription Policies" with
//   "1 Months" and "1 Weeks" before; Active individual subscriptions from today for
//   dbuskins (ending one month and 14 days from today), sberardo (ending 1 December) and
//   minoue (ending 31 October). Then the task as if on: dbuskins's end minus one month,
//   24 October, 1 November.
//   Expected: one "Notice of Subscription Expiry" each for dbuskins, minoue (the weeks
//   notice) and sberardo.
// Run: node bin/try-fix.js apply shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/trial-with-a27.diff ojs
//      PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/seam.js
const {execFileSync} = require('child_process');
const path = require('path');
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const L = require('../expiry-reminder-task-stops-with-error/lib.js');

const TYPE = 'u51sb1 Online Year';
const SUBJECT = 'Notice of Subscription Expiry';
const IDS = {dbuskins: 4, sberardo: 5, minoue: 6};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const year = today.getUTCFullYear();
    const buskinsEnd = new Date(L.oneMonthAfter(today).getTime() + 14 * 86_400_000);
    const buskinsDue = new Date(Date.UTC(year, buskinsEnd.getUTCMonth() - 1, buskinsEnd.getUTCDate()));
    const ends = {dbuskins: L.ymd(buskinsEnd), sberardo: `${year}-12-01`, minoue: `${year}-10-31`};
    const days = [L.ymd(buskinsDue), `${year}-10-24`, `${year}-11-01`];
    const facts = {line: app.line, today: L.ymd(today), ends, days};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.access = await L.requireSubscriptions(page);
        facts.type = await L.createType(page, {name: TYPE, cost: 40, duration: 12});
        facts.policies = await L.setPolicies(page, {
            name: 'Ramiro Vaca', email: 'rvaca@mailinator.com', address: '1 Harbour Road',
            selects: {numMonthsBeforeSubscriptionExpiryReminder: '1 Months', numWeeksBeforeSubscriptionExpiryReminder: '1 Weeks'},
        });
        for (const [u, end] of Object.entries(ends)) {
            facts[`sub-${u}`] = await L.createSubscription(page, {username: u, userId: IDS[u], type: TYPE, start: L.ymd(today), end});
        }
    } finally {
        await close();
    }
    const before = {};
    for (const u of Object.keys(ends)) before[u] = (await L.mails(app, `${u}@mailinator.com`, SUBJECT)).length;
    let out;
    try {
        out = execFileSync('php', [path.join(__dirname, 'seam.php'), ...days], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 300_000});
    } catch (e) {
        out = `${e.stdout || ''}${e.stderr || ''}`;
    }
    facts.runs = L.flat(out, 1500);
    await new Promise((r) => setTimeout(r, 4000));
    facts.sent = {};
    for (const u of Object.keys(ends)) facts.sent[u] = (await L.mails(app, `${u}@mailinator.com`, SUBJECT)).length - before[u];
    record('seam', facts);
    note(`A8 seam ${app.line}: ${JSON.stringify(facts.sent)}`);
    console.log(JSON.stringify(facts, null, 1));
});
