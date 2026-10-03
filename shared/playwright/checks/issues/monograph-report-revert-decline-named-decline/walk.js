// Issue report docs/issues/U65-OMP4-monograph-report-revert-decline-named-decline.md
// (U65 OMP4): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// press `publicknowledge`, as the dataset's own `dbarnes`. The kit builds
// nothing. OMP only (OJS and OPS have no Internal Review).
//
//   1. sign in as dbarnes
//   2. open submission 6 (Internal Review)
//   3. "Decline Submission", through its pages, "Record Decision"
//   4. open submission 6 again: "Revert Decline", "Record Decision"
//   5. Statistics › Reports › "Monograph Report"
//   6. submission 6's line: Daniel Barnes's "Editor Decision n" / "Date decided n"
// Beside the screen: the `label` the app's own Record Decision response gives
// each decision (the control).
//
// Argument `neighbour` (runs alone, no steps): the report of the untouched
// dataset, kept as a file, with every decision name it holds, to compare
// with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir15 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir15 PROBE_AGENT=ir15 node bin/probe.js omp shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir15-3_5 PROBE_AGENT=ir15 node bin/probe.js omp <this file>
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile} = require('../../../probe');
const {downloadReport, openWorkflow, offered, decide, blocksOf, namesCount} = require('./lib');

const ID = 6;
const NEIGHBOUR = process.argv.includes('neighbour');
const STEPS = [['decline', 'Decline Submission'], ['revert', 'Revert Decline']];

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {line: app.line, dataset: app.dataset, mode: NEIGHBOUR ? 'neighbour' : 'steps', steps: {}};
    if (NEIGHBOUR) {
        try {
            const keep = outFile('neighbour-omp.csv');
            const r = await downloadReport(app, 'dbarnes', 'Monograph Report', 'nb-reports', keep);
            Object.assign(facts, {file: r.file, kept: keep, lines: r.rows.length, bytes: r.bytes, names: namesCount(r.rows), row6: blocksOf(r.rows, ID)});
        } catch (e) {
            facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        } finally {
            record('neighbour', facts);
            console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        }
        return;
    }

    const {page, close} = await launch(app);
    // The app's own answer to "Record Decision": the decision's stored type and label.
    const labels = [];
    page.on('response', async (r) => {
        if (/\/api\/v1\/submissions\/\d+\/decisions$/.test(r.url()) && r.request().method() === 'POST') {
            const j = await r.json().catch(() => null);
            labels.push({status: r.status(), decision: j && j.decision, label: j && j.label, stageId: j && j.stageId});
        }
    });
    try {
        await signIn(page, 'dbarnes');
        for (const [key, button] of STEPS) {
            const step = (facts.steps[key] = {button});
            try {
                await openWorkflow(page, app, ID);
                step.offered = await offered(page);
                record(`before-${key}`, await screen(page));
                step.result = await decide(page, button);
                record(`decided-${key}`, await screen(page));
                await shot(page, `decided-${key}`);
            } catch (e) {
                step.error = String(e && e.stack ? e.stack : e).slice(0, 800);
                await shot(page, `error-${key}`).catch(() => {});
            }
        }
        await openWorkflow(page, app, ID);
        facts.offeredAfter = await offered(page);
        facts.recorded = labels;
        await signOut(page);

        const keep = outFile('report-omp.csv');
        const r = await downloadReport(app, 'dbarnes', 'Monograph Report', 'stats-reports', keep);
        Object.assign(facts, {file: r.file, kept: keep, row6: blocksOf(r.rows, ID), names: namesCount(r.rows)});
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        await close();
    }
});
