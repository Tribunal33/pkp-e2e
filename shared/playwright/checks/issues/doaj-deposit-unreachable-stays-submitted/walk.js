// Issue report docs/issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md (U63 OJS9): a DOAJ
// deposit that cannot connect to DOAJ leaves the article "Submitted" for good. Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset (whose config points `[proxy]` at a dead port, the report's precondition; `job_runner`
// On as the dataset ships it):
//   1.  sign in as dbarnes
//   2.  Tools › "DOAJ Export Plugin" › "Settings": "DOAJ API Key" u63ir15-key, "Save"
//   3.  "Articles": tick submission 17, "Register"
//   4.  reload the tool page until the queued deposit has run (the queue is read from the database
//       to know when to stop; read only), then "Articles"
//   5.  the list's filter: status "Error", "Search"
//   6.  sign in as admin: Administration › "View Failed Jobs" (and the job's "Details")
// Control (the neighbour the fix must leave alone): submission 1 "Signalling Theory Dividends", not
// ticked, still reads "Not Deposited" after step 4, with the fix (fix.diff) in and out.
// On 3.5 "Register" deposits while the manager waits and the status list has no "Error": step 5
// records the list's options instead.
// OMP and OPS have no DOAJ tool: no surface, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir15 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir15 PROBE_AGENT=ir15 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir15-3_5, and PROBE_RUN=r35 in
// front of the run.
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const doajLib = require('../doaj-deposit-takes-other-journals-articles/lib.js');
const {sleep, flat, doajRow, tickAndPress, filterByStatus, readStatus} = require('./lib.js');

const WALK = 17;
// The exception's first line up to Guzzle's "(see …)" pointer: the cURL error is what the steps need.
const cut = (l) => flat(String(l).split(' (see ')[0], 400);
const CONTROL = 1;

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[doaj] ${app.name}: no DOAJ tool, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');

        // 2
        fact('2 open', await doajLib.openDoaj(page, app, ctx));
        fact('2 save', {status: await doajLib.saveSettings(page, {key: 'u63ir15-key', auto: false}), after: await doajLib.readSettings(page)});
        record('doaj-2-settings', await screen(page));

        // 3
        await doajLib.openDoaj(page, app, ctx, 'Articles');
        fact('3 list before', await doajLib.readList(page));
        const failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
        const status3 = await tickAndPress(page, WALK, 'deposit');
        const s3 = await screen(page);
        record('doaj-3-after-register', s3);
        await doajLib.openDoaj(page, app, ctx, 'Articles');
        fact('3 register', {status: status3, notices: s3.notices, row: flat(await doajRow(page, WALK).innerText()), control: flat(await doajRow(page, CONTROL).innerText()),
            queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean)});

        // 4: reload until nothing DOAJ is queued (each web request runs the queue, job_runner On)
        const started = Date.now();
        let loads = 0;
        for (; loads < 20; loads++) {
            await sleep(5000);
            await page.reload();
            await sleep(300);
            if (Number(sql(app, "select count(*) from jobs where payload like '%DOAJ%'") || 0) === 0) break;
        }
        await sleep(2000);
        await doajLib.openDoaj(page, app, ctx, 'Articles');
        const s4 = await screen(page);
        record('doaj-4-articles-after', s4);
        await shot(page, 'doaj-4-articles-after').catch(() => {});
        fact('4 after the background deposit', {
            seconds: Math.round((Date.now() - started) / 1000), reloads: loads + 1,
            list: await doajLib.readList(page),
            walkStatus: await readStatus(page, WALK),
            controlStatus: await readStatus(page, CONTROL),
            jobsLeft: sql(app, 'select count(*) from jobs'),
            failedJobs: sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id offset ${failedBefore}`).split('\n').filter(Boolean).map(cut),
            stored: sql(app, `select submission_id, setting_name, left(setting_value, 200) from submission_settings where setting_name like 'doaj::%' order by submission_id, setting_name`).split('\n').filter(Boolean),
        });

        // 5
        fact('5 filter Error', await filterByStatus(page, 'Error'));
        record('doaj-5-filter-error', await screen(page));

        // 6
        await signIn(page, 'admin');
        const jobs = await doajLib.readJobsPage(page, app, 'failedJobs');
        const s6 = await screen(page);
        record('doaj-6-failed-jobs', s6);
        await shot(page, 'doaj-6-failed-jobs').catch(() => {});
        const details = jobs.details.length ? await doajLib.readJobDetails(page, jobs.details[jobs.details.length - 1]) : null;
        const exception = details && details.find((r) => r[0] === 'Exception');
        fact('6 failed jobs', {main: flat(s6.text && s6.text.main, 700), rows: jobs.rows, job: details && (details.find((r) => r[0] === 'Job') || [])[1], exception: exception && cut(exception[1])});
    } finally {
        record('doaj-facts', facts);
        await close();
    }
});
