// Issue report docs/issues/U65-OJS2-articles-report-title-html-codes.md (U65 OJS2): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`, as the
// dataset's own `dbarnes`. OJS only (OMP's "Monograph Report" writes its own titles; OPS
// has no such report). The kit builds nothing.
//
//   A title from the dataset:
//   1. sign in as dbarnes
//   2-3. Statistics › Reports › "Articles Report"
//   4. the file's "Title" of submission 9 "Hansen & Pinto: Reason Reclaimed"
//   A title formatted on screen:
//   5-6. submission 8, Publication › "Title & Abstract": "Title" retyped as
//        "Traditions & Trends in the Study of the Commons", "Commons" selected and Ctrl+I; Save
//   7. "Articles Report" again: the "Title" of submission 8
//
// Argument `neighbour` (runs alone, no steps): the "Articles Report" of the untouched
// dataset, kept as a file, to compare with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir11 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir11 PROBE_AGENT=ir11 node bin/probe.js ojs shared/playwright/checks/issues/articles-report-title-html-codes/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir11-3_5 PROBE_AGENT=ir11 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/ir11/facts[-<run>]-ojs.json (neighbour: neighbour[-<run>]-ojs.json and its CSV)
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile} = require('../../../probe');
const {downloadReport, rowById} = require('../articles-report-supporting-agencies-empty/lib');
const {retypeTitle} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const pick = (row) => row && {id: row['Submission ID'], Title: row.Title, Abstract: (row.Abstract || '').slice(0, 80)};
// Every line whose title holds a character HTML would code, or a code.
const marked = (rows) => {
    const t = rows[0].indexOf('Title');
    return rows.slice(1).filter((x) => /[&<>"']/.test(x[t] || '')).map((x) => ({id: x[0], Title: x[t]}));
};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (NEIGHBOUR) {
        const facts = {line: app.line, dataset: app.dataset, mode: 'neighbour'};
        try {
            const keep = outFile('neighbour-articles.csv');
            const r = await downloadReport(app, 'dbarnes', 'Articles Report', 'nb-reports', keep);
            facts.file = r.file;
            facts.kept = keep;
            facts.bytes = r.bytes;
            facts.lines = r.rows.length;
            facts.header = r.rows[0].length;
            facts.titles = r.rows.slice(1).map((x) => ({id: x[0], Title: x[1]}));
            facts.marked = marked(r.rows);
        } catch (e) {
            facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        } finally {
            record('neighbour', facts);
            console.log(JSON.stringify({app: app.name, ...facts, titles: undefined}, null, 1));
        }
        return;
    }

    const facts = {line: app.line, dataset: app.dataset, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-4: the dataset's own title
        const keep1 = outFile('articles-1.csv');
        const r1 = await downloadReport(app, 'dbarnes', 'Articles Report', 'stats-reports', keep1);
        facts.steps.file = r1.file;
        facts.steps.kept1 = keep1;
        facts.steps.row9 = pick(rowById(r1.rows, 9));
        facts.steps.row8before = pick(rowById(r1.rows, 8));
        facts.steps.marked1 = marked(r1.rows);

        // 5-6: retitle submission 8 on screen
        await signIn(page, 'dbarnes');
        facts.steps.retitle = await retypeTitle(page, app, 8, 'Traditions & Trends in the Study of the Commons');
        record('title-abstract-8', await screen(page));
        await shot(page, 'title-abstract-8');
        await signOut(page);

        // 7: the report again
        const keep2 = outFile('articles-2.csv');
        const r2 = await downloadReport(app, 'dbarnes', 'Articles Report', 'stats-reports-2', keep2);
        facts.steps.kept2 = keep2;
        facts.steps.row8after = pick(rowById(r2.rows, 8));
        facts.steps.row9again = pick(rowById(r2.rows, 9));
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        await close();
    }
});
