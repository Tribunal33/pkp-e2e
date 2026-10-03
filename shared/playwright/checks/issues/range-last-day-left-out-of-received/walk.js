// Issue report docs/issues/U65-A1-range-last-day-left-out-of-received.md (U65 A1): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The kit builds nothing and changes nothing; the walk only reads the page.
//
// Every submission of the dataset was submitted on the day pkp's CI built it (D); the script reads
// D from the dataset (the earliest submission date) only to know what to type, and must run on a
// later day (the page's ranges end yesterday at the latest).
//
// Default mode, as `dbarnes`: Statistics › "Editorial Activity" read under the default "Last 90
//   days"; then "Custom Range" D to D applied and the table read again.
// `neighbour` as the argument (the fix in and out; runs alone): "Custom Range" D-1 to D-1 applied
//   and read; nothing happened that day, so every row of the date-range column must read 0.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir4 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir4 PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/range-last-day-left-out-of-received/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir4-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir4-3_5 PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/range-last-day-left-out-of-received/walk.js
// Facts: .reports/<feature>/ir4/facts[-neighbour][-<run>]-<app>.json
// OMP `main` on PHP 8.3's built-in server: every `api/v1/stats/editorial` call the range change sends
// crashes the server (php-src GH-20469, docs/reports/2026-09-30-php-gh20469-segfaults.md), so the
// table keeps the previous range's rows; only the "Last 90 days" read (server-rendered) holds there.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const {readTrends, customRange} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

/** The rows the report reads ([date range, total] each). */
const ROWS = [
    'Submissions Received',
    'Submissions Accepted',
    'Submissions Declined',
    'Submissions Declined (Desk Reject)',
    'Submissions Published',
    'Other Submissions',
    'Submissions In Progress',
    'Imported Submissions',
    'Acceptance Rate',
    'Rejection Rate',
    'Desk Reject Rate',
];

const dayBefore = (d) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const D = sql(app, "select to_char(min(date_submitted), 'YYYY-MM-DD') from submissions");
    const facts = {mode: MODE, line: app.line, dataset: app.dataset, D, today: new Date().toISOString().slice(0, 10)};
    const read = async (name) => {
        const t = await readTrends(page);
        record(`${MODE}-${name}`, await screen(page));
        await shot(page, `${MODE}-${name}`);
        facts[name] = {
            range: t.range,
            columns: t.columns,
            error: t.error,
            rows: Object.fromEntries(ROWS.filter((n) => n in t.rows).map((n) => [n, t.rows[n]])),
        };
    };
    try {
        await signIn(page, 'dbarnes');
        const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
        await page.goto(app.url(`/index.php/${app.contextPath}${locale}/stats/editorial`));
        await idle(page);
        if (MODE === 'steps') {
            await read('last90');
            facts.applyError = await customRange(page, D, D);
            await read('customD');
        } else {
            const before = dayBefore(D);
            facts.neighbourDay = before;
            facts.applyError = await customRange(page, before, before);
            await read('customDminus1');
        }
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
