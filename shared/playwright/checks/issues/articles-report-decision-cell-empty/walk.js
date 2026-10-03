// Issue report docs/issues/U65-OJS3-articles-report-decision-cell-empty.md
// (U65 OJS3): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// context `publicknowledge`, as the dataset's own `dbarnes`. The kit builds
// nothing.
//
// OJS ("Articles Report"):
//   1. sign in as dbarnes
//   2. submission 4: "Accept and Skip Review", Record Decision
//   3. submission 18: "Revert Decline", Record Decision
//   4. submission 13: "Create New Review Round", Record Decision
//   5. submission 3: "Move to Review" (3.5: "Cancel Copyediting"), Record Decision
//   6. submission 5: "Move To Copyediting" (3.5: "Back To Copyediting"), Record Decision
//   7. Statistics › Reports › "Articles Report"
//   8. the rows of 4, 18, 13, 3, 5 (and the dataset's 1 and 17): Daniel
//      Barnes's "Editor Decision n" / "Date decided n" pairs
// OMP ("Monograph Report"; no steps before it): sign in as dbarnes,
//   Statistics › Reports › "Monograph Report", the row of submission 14.
// OPS has no such report.
//
// Argument `neighbour` (runs alone, no steps): each report of the untouched
// dataset, kept as a file, with every decision name it holds and every
// unnamed cell, to compare with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir12 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/articles-report-decision-cell-empty/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir12-3_5 PROBE_AGENT=ir12 node bin/probe.js all <this file>
// Facts: .reports/<feature>/ir12/facts[-<run>]-<app>.json (neighbour: neighbour[-<run>]-<app>.json and its CSV)
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile} = require('../../../probe');
const {downloadReport, openWorkflow, offered, decide, decisionsOf, unnamed, namesCount} = require('./lib');

const EDITOR = 'Daniel Barnes';
const NEIGHBOUR = process.argv.includes('neighbour');
const REPORT = {ojs: 'Articles Report', omp: 'Monograph Report'};
// [submission, the button the step presses] (3.5 names the moves back
// "Cancel Copyediting" and "Back To Copyediting")
const STEPS = [
    [4, 'Accept and Skip Review'],
    [18, 'Revert Decline'],
    [13, 'Create New Review Round'],
    [3, /^(Move to Review|Cancel Copyediting)$/],
    [5, /^(Move To Copyediting|Back To Copyediting)$/],
];
const ROWS = {ojs: [4, 18, 13, 3, 5, 1, 17], omp: [14, 5]};

forEachApp(async (app) => {
    if (!REPORT[app.name]) return;
    const facts = {line: app.line, dataset: app.dataset, mode: NEIGHBOUR ? 'neighbour' : 'steps', steps: {}};
    if (NEIGHBOUR) {
        try {
            const keep = outFile(`neighbour-${app.name}.csv`);
            const r = await downloadReport(app, 'dbarnes', REPORT[app.name], 'nb-reports', keep);
            facts.file = r.file;
            facts.kept = keep;
            facts.lines = r.rows.length;
            facts.names = namesCount(r.rows);
            facts.unnamed = unnamed(r.rows);
        } catch (e) {
            facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        } finally {
            record('neighbour', facts);
            console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        }
        return;
    }

    const {page, close} = await launch(app);
    try {
        // 1-6 (OJS)
        await signIn(page, 'dbarnes');
        if (app.name === 'ojs') {
            for (const [id, button] of STEPS) {
                const step = (facts.steps[id] = {button: String(button)});
                try {
                    await openWorkflow(page, app, id);
                    step.offered = await offered(page);
                    step.result = await decide(page, button);
                    const s = await screen(page);
                    record(`decided-${id}`, s);
                    await shot(page, `decided-${id}`);
                    await openWorkflow(page, app, id);
                    step.offeredAfter = await offered(page);
                } catch (e) {
                    step.error = String(e && e.stack ? e.stack : e).slice(0, 800);
                    await shot(page, `error-${id}`).catch(() => {});
                }
            }
        }
        await signOut(page);

        // 7-8
        const keep = outFile(`report-${app.name}.csv`);
        const r = await downloadReport(app, 'dbarnes', REPORT[app.name], 'stats-reports', keep);
        facts.file = r.file;
        facts.kept = keep;
        facts.decisionHeaders = r.rows[0].filter((h) => /^(Editor Decision|Date decided) 1\s+\(Editor 1\)$/.test(h));
        facts.rows = {};
        for (const id of ROWS[app.name]) facts.rows[id] = decisionsOf(r.rows, id, EDITOR);
        facts.unnamed = unnamed(r.rows);
        facts.names = namesCount(r.rows);
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        await close();
    }
});
