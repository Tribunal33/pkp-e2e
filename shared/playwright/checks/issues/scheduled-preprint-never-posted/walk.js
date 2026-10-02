// Issue walk U49 OPS1: a preprint posted with a future "Date Posted" becomes
// "Status: Scheduled", and nothing posts it once the date has passed.
//
// Steps (PKP's default test dataset, OPS; submission 1 "The influence of
// lactation on the quantity and quality of cashmere production", in Production):
//   1  sign in as dbarnes
//   2  open submission 1
//   3  side menu › "Preprint" › "Preprint entry"
//   4  "Date Posted": tomorrow's date (server clock, UTC), "Save"
//   5  "Post"; read the "Post the preprint" window; its "Post"
//   6  the head: "Status: …", the controls
//   7  signed out: /index.php/publicknowledge/en/preprint/view/1
//   8  the clock on the posted date: `scheduler.php list`, then
//      `scheduler.php test --name='PKP\task\PublishSubmissions'`
//   9  the head and the page again
// The walk moves the clock for the scheduler commands only, through a copy of the
// fleet's config whose time_zone is Pacific/Kiritimati (UTC+14, on tomorrow's date
// once UTC passes 10:00); it also runs `scheduler.php run` there (what cron calls).
//
// Modes (the script's argument):
//   (none)  the steps above, on OPS; on OMP only the control read of the press's
//           schedule (`scheduler.php list`), nothing driven
//   nb      neighbour check: the same post with a date 30 days out, then the publish
//           task under the shifted clock; the preprint must stay "Scheduled"
// Reset the dataset fleet before each run; the walk changes submission 1.
// Run: PROBE_FEATURE=issues-v7 PROBE_AGENT=v7 node bin/probe.js ops \
//        shared/playwright/checks/issues/scheduled-preprint-never-posted/walk.js [nb]
const {forEachApp, launch, signIn, signOut, screen, record, note, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv.includes('nb') ? 'nb' : 'main';
const SID = 1;
const ZONE = 'Pacific/Kiritimati';
const NAME = MODE === 'nb' ? 'v7-nb' : 'v7-walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, at: new Date().toISOString()};

    if (app.name === 'ojs') return;
    if (app.name === 'omp') {
        // Control: the press's schedule names the daily publish task.
        facts.schedule = L.scheduleList(app);
        record(`${NAME}-omp-control`, facts);
        console.log(JSON.stringify(facts, null, 1));
        return;
    }

    const date = MODE === 'nb' ? L.daysAhead(30) : L.daysAhead(1);
    facts.datePosted = date;
    facts.todayUTC = L.ymd(new Date());
    facts.todayShifted = L.ymd(new Date(), ZONE);
    facts.clockPastDate = facts.todayShifted >= date;

    // 1-7
    let b = await launch(app);
    try {
        await signIn(b.page, 'dbarnes');
        const frame = await L.openWorkflow(b.page, app, SID);
        facts.before = await L.readHead(b.page);
        facts.step4 = await L.saveDatePosted(b.page, frame, date);
        record(`${NAME}-step4-preprint-entry`, await screen(b.page));
        facts.step56 = await L.postAndConfirm(b.page);
        facts.step7 = await L.readHead(b.page);
        record(`${NAME}-step7-head`, await screen(b.page));
        await signOut(b.page);
    } finally {
        await b.close();
    }
    facts.stored7 = L.stored(sql, app, SID);

    // 8
    b = await launch(app);
    try {
        facts.step8 = await L.readerPage(b, app, SID);
    } finally {
        await b.close();
    }

    // 9: the scheduled tasks after the date (the shifted clock), then the screens again
    const shifted = L.shiftedConfig(app, ZONE);
    if (MODE === 'main') {
        facts.schedule = L.scheduleList(app);
        facts.run = L.scheduler(app, ['run'], shifted);
    }
    facts.publishTask = L.scheduler(app, ['test', `--name=${L.PUBLISH_TASK}`], shifted);
    facts.stored9 = L.stored(sql, app, SID);
    b = await launch(app);
    try {
        await signIn(b.page, 'dbarnes');
        await L.openWorkflow(b.page, app, SID);
        facts.step9 = await L.readHead(b.page);
        record(`${NAME}-step9-head`, await screen(b.page));
        await signOut(b.page);
    } finally {
        await b.close();
    }
    b = await launch(app);
    try {
        facts.step9page = await L.readerPage(b, app, SID);
    } finally {
        await b.close();
    }

    record(NAME, facts);
    note(`v7 ${MODE} ${facts.line} ${app.name}: date ${date}, after post "${facts.step7.status}", after task "${facts.step9.status}", page ${facts.step8.status} -> ${facts.step9page.status}`);
    console.log(JSON.stringify(facts, null, 1));
});
