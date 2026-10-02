// Issue walk U65 A9: the monthly email's "editorial-report.csv" counts the active submissions of
// every journal (press, server) of the installation in its "Active Submissions" block, not the
// journal's own.
//
// Steps (PKP's default test dataset; OJS words, OMP "Create Press", OPS "Create Server"):
//   1  sign in as admin
//   2  Statistics › "Editorial Activity" of publicknowledge: the chart (OPS: no chart)
//   3  Administration › Hosted Journals › "Create Journal": "u65ir3 Journal", path u65ir3,
//      contact u65ir3@mailinator.com, English, enabled, "Save"
//   4  the new journal's "Editorial Activity": 0 everywhere
//   5  php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'
//   6  php lib/pkp/tools/jobs.php run
//   7  pkpadmin@mailinator.com: the new journal's email and its editorial-report.csv, beside
//      publicknowledge's
//
// `neighbour` as the script's argument leaves out steps 3 and 4 (one journal only) and checks
// that publicknowledge's own attachment gives its chart's counts (the fix trial's neighbour).
//
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all \
//        shared/playwright/checks/issues/monthly-report-counts-other-journals/walk.js [neighbour]
const {forEachApp, launch, signIn, screen, shot, record, note} = require('../../../probe');
const L = require('./lib.js');

const NEIGHBOUR = process.argv.includes('neighbour');
const ADMIN_MAIL = 'pkpadmin@mailinator.com';
const NEW = {name: 'u65ir3 Journal', initials: 'U65IR3', path: 'u65ir3', email: 'u65ir3@mailinator.com'};

forEachApp(async (app) => {
    const facts = {line: app.line, app: app.name, mode: NEIGHBOUR ? 'neighbour' : 'walk'};
    const {page, close} = await launch(app);
    try {
        // 1, 2
        await signIn(page, 'admin');
        facts.step2 = await L.readEditorialActivity(page, app, 'publicknowledge');
        record(`${facts.mode}-step2`, await screen(page));
        await shot(page, `${facts.mode}-step2`).catch(() => {});
        if (!NEIGHBOUR) {
            // 3
            const words = L.WORDS[app.name];
            facts.step3 = {save: await L.createContext(page, app, {...NEW, name: NEW.name.replace('Journal', words.noun)})};
            record('walk-step3', await screen(page));
            // 4
            facts.step4 = await L.readEditorialActivity(page, app, NEW.path);
            record('walk-step4', await screen(page));
            await shot(page, 'walk-step4').catch(() => {});
        }
    } finally {
        await close();
    }
    // 5, 6
    const since = new Date(Date.now() - 1000);
    facts.step5 = L.runTask(app);
    facts.step6 = L.runJobs(app);
    // 7
    const all = await L.mailbox(app, ADMIN_MAIL, since);
    const pkMails = all.filter((m) => m.from !== NEW.email);
    const pk = pkMails[0] || null;
    const mine = NEIGHBOUR ? [] : await L.waitFor(app, ADMIN_MAIL, since, NEW.email, 1);
    const csv = (m) => m && (m.attachments.find((a) => a.name === 'editorial-report.csv') || {}).text;
    facts.step7 = {
        received: all.map((m) => ({subject: m.subject, from: m.from})),
        own: pk && {subject: pk.subject, from: pk.from, attachments: pk.attachments.map((a) => a.name), active: L.activeBlock(csv(pk)), csv: csv(pk)},
        newContext: mine[0] ? {subject: mine[0].subject, from: mine[0].from, text: mine[0].text, attachments: mine[0].attachments.map((a) => a.name), active: L.activeBlock(csv(mine[0])), csv: csv(mine[0])} : null,
    };
    // the verdicts the steps' Expected names
    const chartCounts = (ea) => (ea && ea.chart ? ea.stages.map(([, c]) => Number(c)) : null);
    const csvCounts = (blk) => (blk ? blk.slice(1).map(([, c]) => Number(c)) : null);
    facts.verdict = {
        ownAttachmentMatchesOwnChart: facts.step2.chart ? JSON.stringify(csvCounts(facts.step7.own && facts.step7.own.active)) === JSON.stringify(chartCounts(facts.step2)) : 'no chart',
    };
    if (!NEIGHBOUR) {
        const newCounts = csvCounts(facts.step7.newContext && facts.step7.newContext.active);
        facts.verdict.newAttachmentAllZero = !!newCounts && newCounts.every((c) => c === 0);
        facts.verdict.newAttachmentEqualsOwn = JSON.stringify(newCounts) === JSON.stringify(csvCounts(facts.step7.own && facts.step7.own.active));
    }
    record(facts.mode, facts);
    note(`U65 A9 ${facts.mode} ${app.line} ${app.name}: ${JSON.stringify(facts.verdict)}; new ${JSON.stringify(facts.step7.newContext && facts.step7.newContext.active)}; own ${JSON.stringify(facts.step7.own && facts.step7.own.active)}`);
    console.log(JSON.stringify({app: app.name, line: app.line, step2: facts.step2, step4: facts.step4, task: facts.step5.status, jobs: facts.step6.status, received: facts.step7.received.length, newActive: facts.step7.newContext && facts.step7.newContext.active, ownActive: facts.step7.own && facts.step7.own.active, verdict: facts.verdict}, null, 1));
});
