// Issue report docs/issues/U61-A4-requeue-all-failed-jobs-database-error.md (U61 A4):
// "Requeue All Failed Jobs" fails on the server, with the database's error
// text in an "Error" window, when no failed job on the list has stored data.
// Latent: no application code stores a failed job without data, so the
// precondition is made here with the application's own jobs tool (two
// TestJobFailure jobs run and failed) and one SQL statement that empties
// their stored data (`failed_jobs.payload`).
// Steps, on PKP's default test dataset:
//   1. Sign in as admin.
//   2. Administration > "View Failed Jobs" (two rows).
//   3. "Requeue All Failed Jobs".
// Expected: a refusal with a message, the two rows kept, no server error.
// Run on a freshly reset dataset fleet (PROBE_RUN tells runs apart):
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js
const probe = require('../../../probe');
const {forEachApp, launch, signIn, record, sql} = probe;
const {makeFailedJobs, jobCounts, requeueAllFromAdministration} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    // Precondition: two failed jobs, their stored data emptied.
    const ids = makeFailedJobs(app, 2);
    sql(app, `update failed_jobs set payload = '' where id in (${ids.join(',')})`);
    fact('precondition', {failedIds: ids, counts: jobCounts(app)});
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const result = await requeueAllFromAdministration(page, app, probe, 'walk');
        fact('requeue all', result);
        fact('after', jobCounts(app));
    } finally {
        record('facts', facts);
        await close();
    }
});
