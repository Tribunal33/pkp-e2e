// Neighbour check for fix.diff (docs/issues/U63-OMP4-command-line-csv-import-empty-submission.md): a row naming a
// press the site lacks is still skipped with "Unknown Press", and nothing is added to the press; run with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/command-line-csv-import-empty-submission/neighbour.js
const fs = require('fs');
const path = require('path');
const {forEachApp, record, outFile} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (!fs.existsSync(path.join(app.root, 'plugins/importexport/csv/CSVImportExportPlugin.php'))) return;
    const f = {app: app.name, line: app.line || 'main', before: L.dbFacts(app)};
    const csv = outFile('u63ir22-unknown-press.csv');
    fs.writeFileSync(csv, L.csvText('Monograph u63ir22 elsewhere').replace(/^publicknowledge,/m, 'nosuchpress,'));
    f.run = L.runImport(app, csv, 'admin');
    f.after = L.dbFacts(app);
    record('neighbour', f);
    console.log(`[neighbour] ${app.name}`, JSON.stringify(f, null, 1));
});
