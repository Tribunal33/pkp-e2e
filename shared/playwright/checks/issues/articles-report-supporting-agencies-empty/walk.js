// Issue report docs/issues/U65-OJS1-articles-report-supporting-agencies-empty.md
// (U65 OJS1): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// context `publicknowledge`, as the dataset's own `dbarnes`. OJS only (the
// "Articles Report" is OJS's; OMP's "Monograph Report" and OPS have no such
// report). The kit builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Workflow › Submission › Metadata: tick "Enable supporting
//      agencies metadata", Save
//   3. submission 7 "Developing efficacy beliefs in the classroom",
//      Publication › Metadata
//   4. "Supporting Agencies": "u65ir10 Agency One", "u65ir10 Agency Two"; Save
//   5. Statistics › Reports › "Articles Report"
//   6. the file's row for submission 7: "Keywords", "Supporting Agencies"
//
// Argument `neighbour` (runs alone, no steps): the "Articles Report" of the
// untouched dataset, kept as a file, to compare with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir10 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/articles-report-supporting-agencies-empty/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir10-3_5 PROBE_AGENT=ir10 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/ir10/facts[-<run>]-ojs.json (neighbour: neighbour[-<run>]-ojs.json and its CSV)
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile} = require('../../../probe');
const {flat, enableMetadataItem, openPublicationMetadata, vocabChips, typeVocab, saveMetadata, downloadReport, rowById} = require('./lib');

const SUBMISSION = 7;
const AGENCIES = ['u65ir10 Agency One', 'u65ir10 Agency Two'];
const NEIGHBOUR = process.argv.includes('neighbour');

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
            // "Last modified" and the URL's host differ by install, never by the fix.
            facts.agenciesNonEmpty = r.rows.slice(1).filter((x) => x[r.rows[0].indexOf('Supporting Agencies')]).map((x) => x[0]);
            facts.row7 = rowById(r.rows, SUBMISSION);
        } catch (e) {
            facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        } finally {
            record('neighbour', facts);
            console.log(JSON.stringify({app: app.name, ...facts, row7: undefined}, null, 1));
        }
        return;
    }

    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, submission: SUBMISSION, steps: {}};
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        facts.steps.enable = await enableMetadataItem(page, app, 'Enable supporting agencies metadata');
        record('settings-metadata', await screen(page));
        await shot(page, 'settings-metadata');

        // 3-4
        await openPublicationMetadata(page, app, SUBMISSION);
        facts.steps.agenciesBefore = await vocabChips(page, 'supportingAgencies');
        facts.steps.keywordsShown = await vocabChips(page, 'keywords');
        await typeVocab(page, 'supportingAgencies', AGENCIES);
        facts.steps.saved = await saveMetadata(page);
        facts.steps.agenciesTyped = await vocabChips(page, 'supportingAgencies');
        const s = await screen(page);
        record('publication-metadata', s);
        await shot(page, 'publication-metadata');
        const d = s.text.dialog || '';
        const at = d.indexOf('Supporting Agencies');
        facts.steps.metadataExcerpt = at >= 0 ? flat(d.slice(at, at + 160), 200) : null;

        // reload the form: the agencies are stored
        await openPublicationMetadata(page, app, SUBMISSION);
        facts.steps.agenciesReloaded = await vocabChips(page, 'supportingAgencies');
        await signOut(page);

        // 5-6
        const keep = outFile('articles.csv');
        const r = await downloadReport(app, 'dbarnes', 'Articles Report', 'stats-reports', keep);
        facts.steps.file = r.file;
        facts.steps.kept = keep;
        facts.steps.bom = r.bom;
        facts.steps.header = r.rows[0];
        const row = rowById(r.rows, SUBMISSION);
        facts.steps.row = row && {
            'Submission ID': row['Submission ID'],
            Title: row.Title,
            Keywords: row.Keywords,
            'Supporting Agencies': row['Supporting Agencies'],
        };
        facts.steps.agenciesNonEmpty = r.rows.slice(1).filter((x) => x[r.rows[0].indexOf('Supporting Agencies')]).map((x) => x[0]);
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        await close();
    }
});
