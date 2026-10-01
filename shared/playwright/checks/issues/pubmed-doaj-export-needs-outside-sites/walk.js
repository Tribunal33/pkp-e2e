// Issue report docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-needs-outside-sites.md (U63 OJS4, OJS7) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), whose config points [proxy] at a dead port, so the
// server reaches no other website.
//
//   1-3 (as dbarnes) Tools › Import/Export › "PubMed XML Export Plugin" › "Export Articles":
//       tick "Signalling Theory Dividends", "Export Articles"
//   4   "Export Issues": tick "Vol. 1 No. 2 (2014)", "Export Issues"
//   5-6 "DOAJ Export Plugin" › "Articles": tick submission 1, "Validate XML before the export and
//       registration." as the page opens it (ticked), "Export"
//   7   the control: the same with the box unticked
//
// `neighbour` as the argument adds (`neighbour-only` walks alone) the path a fix must leave alone: "Export Articles" with nothing
// ticked, whose empty file breaks PubMed's format ("expecting (Article)+") and must stay refused.
// Each press records the request's answer, the download or the page it left for, and the server log's
// error lines; the file text of a refused export is saved beside the run record (for online-check.php).
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir10 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/walk.js [neighbour|neighbour-only]
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/fix.diff ojs
//               (reset, walk with `neighbour`), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir10-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir10-3_5 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/walk.js
const {forEachApp, launch, signIn, screen, record, outFile} = require('../../../probe');
const L = require('./lib');

const args = process.argv.slice(2);
// `neighbour-only`: the neighbour alone, for its walk with the fix out.
const neighbourOnly = args.includes('neighbour-only');
const neighbour = neighbourOnly || args.includes('neighbour');
const TITLE = 'Signalling Theory Dividends';
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the PubMed and DOAJ tools are OJS's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, neighbour};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (!neighbourOnly) await steps(page);
        if (neighbour) {
            // N. PubMed › Export Articles with nothing ticked: the empty file must stay refused
            await L.openPubMed(page, app, 'Export Articles');
            fact('N export nothing ticked', await L.pressExport(page, app, L.pubMedButton(page, 'Export Articles'), 'PubMedExportPlugin/exportSubmissions', outFile('N-pubmed-nothing.xml')));
            record('N-pubmed-nothing', await screen(page));
        }
    } finally {
        record('facts', facts);
        await close();
    }

    async function steps(page) {
        // 2-3. PubMed › Export Articles: the article ticked
        fact('2 pubmed page', await L.openPubMed(page, app, 'Export Articles'));
        fact('3 ticked article', await L.tickPubMedArticle(page, TITLE));
        fact('3 export articles', await L.pressExport(page, app, L.pubMedButton(page, 'Export Articles'), 'PubMedExportPlugin/exportSubmissions', outFile('3-pubmed-articles.xml')));
        record('3-pubmed-articles', await screen(page));

        // 4. PubMed › Export Issues: the issue ticked
        await L.openPubMed(page, app, 'Export Issues');
        fact('4 ticked issue', await L.tickPubMedIssue(page, ISSUE));
        fact('4 export issues', await L.pressExport(page, app, L.pubMedButton(page, 'Export Issues'), 'PubMedExportPlugin/exportIssues', outFile('4-pubmed-issues.xml')));
        record('4-pubmed-issues', await screen(page));

        // 5-6. DOAJ › Articles: submission 1 ticked, the validation box as the page opens it
        fact('5 doaj page', await L.openDoaj(page, app, app.contextPath, 'Articles'));
        fact('6 ticked row', await L.tickDoajArticle(page, 1));
        fact('6 validation box as opened', await L.doajValidationBox(page).isChecked());
        fact('6 export validated', await L.pressExport(page, app, L.doajExportButton(page), 'DOAJExportPlugin/export', outFile('6-doaj-validated.xml')));
        record('6-doaj-validated', await screen(page));

        // 7. Control: the box unticked
        await L.openDoaj(page, app, app.contextPath, 'Articles');
        await L.tickDoajArticle(page, 1);
        await L.doajValidationBox(page).uncheck();
        fact('7 export unvalidated', await L.pressExport(page, app, L.doajExportButton(page), 'DOAJExportPlugin/export', outFile('7-doaj-unvalidated.xml')));
        record('7-doaj-unvalidated', await screen(page));
    }
});
