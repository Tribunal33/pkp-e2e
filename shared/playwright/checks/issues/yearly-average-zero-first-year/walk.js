// Issue report docs/issues/U65-A2-yearly-average-zero-first-year.md (U65 A2): the report's Steps to
// reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The steps create nothing: every submission, decision and publication of the dataset is dated the
// day pkp's CI built it, so all of the context's activity falls in this calendar year.
//
// Default mode, as `dbarnes`: Statistics › "Editorial Activity" opened and the "Trends" table's
//   count rows read ([date range, total] each).
// `neighbour` as the argument (the fix in and out; runs alone; changes the data, so reset after):
//   not a step. The fleet's database back-dates ten submissions' date_submitted (2, 3, 4, 6 by two
//   years; 7 to 12 by one year), which no screen can do; the decisions and publications stay in
//   this year. Then the page is read as `dbarnes`. "Submissions Received" must read "20 (6/year)"
//   (OJS; the dataset's received count per app) with the fix in and out: a span of one full year
//   (last year) keeps its average. The decision and publication rows read "(0/year)" without the
//   fix and no average with it.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir5 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/yearly-average-zero-first-year/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir5-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir5-3_5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/yearly-average-zero-first-year/walk.js
// Facts: .reports/<feature>/ir5/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {readTrends, pick} = require('../internal-review-decline-not-counted-declined/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

/** The count rows that carry a yearly average (Rule 8), and two that never do. */
const ROWS = [
    'Submissions Received',
    'Submissions Accepted',
    'Submissions Declined',
    'Submissions Declined (Desk Reject)',
    'Submissions Declined (After Review)',
    'Submissions Published',
    'Submissions In Progress',
    'Acceptance Rate',
];

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset, today: new Date().toISOString().slice(0, 10)};
    const years = () => ({
        submitted: sql(app, "select to_char(date_submitted, 'YYYY'), count(*) from submissions where submission_progress = '' group by 1 order by 1"),
        decided: sql(app, "select to_char(date_decided, 'YYYY'), count(*) from edit_decisions group by 1 order by 1"),
        published: sql(app, "select to_char(date_published, 'YYYY'), count(*) from publications where date_published is not null group by 1 order by 1"),
    });
    try {
        if (MODE === 'neighbour') {
            sql(app, "update submissions set date_submitted = date_submitted - interval '2 years' where submission_id in (2, 3, 4, 6)");
            sql(app, "update submissions set date_submitted = date_submitted - interval '1 year' where submission_id in (7, 8, 9, 10, 11, 12)");
        }
        facts.years = years();
        await signIn(page, 'dbarnes');
        const t = await readTrends(page, app);
        record(`${MODE}-trends`, await screen(page));
        await shot(page, `${MODE}-trends`);
        facts.trends = {columns: t.columns, error: t.error, rows: pick(t.rows, ROWS)};
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
