// Issue report docs/issues/U65-OMP1-internal-review-decline-not-counted-declined.md (U65 OMP1): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing; the decisions are recorded through the screens.
//
// Default mode (OMP; the other apps have no Internal Review and record that), as `dbarnes`:
//   Statistics › "Editorial Activity" read; submission 6 "The Information Literacy User's Guide"
//   (Internal Review) "Decline Submission" recorded; the page read again; then the control:
//   submission 16 "A Designer's Log…" (Review) "Decline Submission" recorded; the page read again.
// `neighbour` as the argument (the fix in and out; runs alone), as `dbarnes`:
//   OMP: submission 3 (Submission stage) "Decline Submission" (a desk decline) recorded: it must stay
//     under "Submissions Declined (Desk Reject)" alone, never under "(After Review)".
//   OJS: submission 4 (Submission) desk-declined and submission 7 (Review) declined after review:
//     one under each sub-row, two in all, as before.
//   OPS: the page read only (its own rows; the dataset's declined preprint 4).
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js omp shared/playwright/checks/issues/internal-review-decline-not-counted-declined/walk.js
//               (... node bin/probe.js all ... neighbour)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir2 node bin/probe.js omp shared/playwright/checks/issues/internal-review-decline-not-counted-declined/walk.js
// Facts: .reports/<feature>/ir2/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {readTrends, decide, pick} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

/** The rows the steps read, from the "Total" column (and the date range's). */
const ROWS = [
    'Submissions Received',
    'Submissions Accepted',
    'Submissions Declined',
    'Submissions Declined (Desk Reject)',
    'Submissions Declined (After Review)',
    'Days to Reject',
    'Acceptance Rate',
    'Rejection Rate',
    'Desk Reject Rate',
    'After Review Reject Rate',
];

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const stats = async (name) => {
        const t = await readTrends(page, app);
        record(`${MODE}-${name}`, await screen(page));
        await shot(page, `${MODE}-${name}`);
        facts[name] = {columns: t.columns, error: t.error, rows: pick(t.rows, ROWS)};
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'steps') {
            if (app.name !== 'omp') {
                facts.skipped = 'no Internal Review stage';
            } else {
                await stats('before');
                facts.decline6 = await decide(page, app, 6, 'Decline Submission');
                await stats('afterInternal');
                facts.decline16 = await decide(page, app, 16, 'Decline Submission');
                await stats('afterControl');
            }
        } else {
            await stats('before');
            if (app.name === 'omp') {
                facts.decline3 = await decide(page, app, 3, 'Decline Submission');
                await stats('afterDesk');
            } else if (app.name === 'ojs') {
                facts.decline4 = await decide(page, app, 4, 'Decline Submission');
                facts.decline7 = await decide(page, app, 7, 'Decline Submission');
                await stats('afterDeclines');
            }
        }
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
