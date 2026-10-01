// Issue report docs/issues/U63-OJS3-pubmed-empty-nlm-title-empties-journal-title.md (U63 OJS3) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//
//   1-2 (as dbarnes) Tools › Import/Export › "PubMed XML Export Plugin" (opens on "Settings")
//   3   "Export Articles": tick "Signalling Theory Dividends", "Export Articles" (the journal's name)
//   4-5 "Settings": "NLM Title Abbreviation" = "J Pub Knowl", "Save"; export again (the abbreviation;
//       the neighbour a fix must leave alone)
//   6-7 "Settings": clear the box, "Save"; export again (the journal's name expected)
//
// `as-opened` as the argument walks the other way in instead: "Save" on "Settings" with the box as it
// opens (never saved, empty), then the export.
// The fleet's server cannot reach NLM's website (the dead-port [proxy]), so every export leaves for the
// "Validation errors:" page; the file text under "Invalid XML:" is saved beside the run record and its
// <JournalTitle> read from there. The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir18 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir18 PROBE_AGENT=ir18 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/walk.js [as-opened]
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/fix.diff ojs
//               (reset, walk), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir18-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir18-3_5 PROBE_AGENT=ir18 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/walk.js
const {forEachApp, launch, signIn, screen, record, outFile} = require('../../../probe');
const L = require('./lib');

const asOpened = process.argv.slice(2).includes('as-opened');
const TITLE = 'Signalling Theory Dividends';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the PubMed tool is OJS's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, asOpened};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        fact('2 box as opened', await L.openPubMedSettings(page, app));
        record('2-settings', await screen(page));

        // 3. Export with the tool's Settings never saved
        fact('3 export (never saved)', await L.exportArticle(page, app, TITLE, outFile('3-never-saved.xml')));
        record('3-export', await screen(page));

        if (asOpened) {
            // A. "Save" with the box as it opens, then export
            fact('A box as opened', await L.openPubMedSettings(page, app));
            fact('A save as opened', await L.saveNlmTitle(page, null));
            record('A-saved', await screen(page));
            fact('A box after reload', await L.openPubMedSettings(page, app));
            fact('A export', await L.exportArticle(page, app, TITLE, outFile('A-saved-as-opened.xml')));
            record('A-export', await screen(page));
            return;
        }

        // 4-5. An abbreviation saved, then export (the neighbour)
        await L.openPubMedSettings(page, app);
        fact('4 save abbreviation', await L.saveNlmTitle(page, 'J Pub Knowl'));
        record('4-saved', await screen(page));
        fact('5 export (abbreviation)', await L.exportArticle(page, app, TITLE, outFile('5-abbreviation.xml')));
        record('5-export', await screen(page));

        // 6-7. The box cleared and saved, then export
        fact('6 box before clearing', await L.openPubMedSettings(page, app));
        fact('6 save cleared', await L.saveNlmTitle(page, ''));
        record('6-saved', await screen(page));
        fact('6 box after reload', await L.openPubMedSettings(page, app));
        fact('7 export (cleared)', await L.exportArticle(page, app, TITLE, outFile('7-cleared.xml')));
        record('7-export', await screen(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
