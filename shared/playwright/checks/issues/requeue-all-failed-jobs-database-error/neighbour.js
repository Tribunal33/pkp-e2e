// Neighbour check for the fix of U61 A4 (fix.diff): run with the fix out
// and in. The fix may change only what happens to failed jobs without
// stored data; a failed job with data must still be requeued.
//   A. Screens: one failed job with data and one without; as admin,
//      Administration > "View Failed Jobs" > "Requeue All Failed Jobs".
//      Both runs: the success notice, the job with data on the queue, the
//      one without kept on the list.
//   B. The jobs tool's `failed --redispatch` (the repository method's other
//      caller), with the job without data from A still on the list and one
//      or two more with data: out, it fails on the database; in, it requeues the
//      one with data and keeps the other.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<out|in> node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/neighbour.js
const probe = require('../../../probe');
const {forEachApp, launch, signIn, record, sql} = probe;
const {jobsTool, makeFailedJobs, jobCounts, requeueAllFromAdministration} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const [withData, without] = makeFailedJobs(app, 2);
    sql(app, `update failed_jobs set payload = '' where id = ${without}`);
    fact('A precondition', {withData, without, counts: jobCounts(app)});
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        fact('A requeue all', await requeueAllFromAdministration(page, app, probe, 'neighbour'));
        fact('A after', {...jobCounts(app), withoutKept: Number(sql(app, `select count(*) from failed_jobs where id = ${without}`))});
    } finally {
        await close();
    }
    // One more failed job with data; the run also fails the job A requeued
    // (a TestJobFailure), so it is back on the list with its data.
    jobsTool(app, ['test', '--only=failed']);
    jobsTool(app, ['run', '--test']);
    fact('B precondition', jobCounts(app));
    const cli = jobsTool(app, ['failed', '--redispatch']);
    fact('B cli', {output: cli.replace(/\(Connection:.*$/, '(…)').slice(0, 200), after: jobCounts(app)});
    record('facts', facts);
});
