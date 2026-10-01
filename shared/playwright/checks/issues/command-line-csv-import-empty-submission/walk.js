// Walk of docs/issues/U63-OMP4-command-line-csv-import-empty-submission.md on PKP's default test dataset (OMP):
// run the press's "Tab Delimited Content Import Plugin" from the command line with the Steps' CSV file, then read
// the result on the Dashboard as dbarnes. OJS and OPS ship no such plugin; the script records that and stops.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/command-line-csv-import-empty-submission/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-omp.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, record, outFile} = require('../../../probe');
const L = require('./lib');

const TITLE = 'Monograph u63ir22';

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    if (!fs.existsSync(path.join(app.root, 'plugins/importexport/csv/CSVImportExportPlugin.php'))) {
        f.noPlugin = true;
        record('walk', f);
        return;
    }
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');                                   // 1
        await L.openDashboard(app, page);
        f.s1 = {views: await L.views(page), rows: await L.rows(page), screen: await L.snap(page, 'step1-dashboard')};
        f.dbBefore = L.dbFacts(app);

        const csv = outFile('u63ir22.csv');                              // 2
        fs.writeFileSync(csv, L.csvText(TITLE));
        f.s2 = L.runImport(app, csv, 'admin');
        f.dbAfter = L.dbFacts(app);

        const newest = Number(String(f.dbAfter.newest).split('|')[0]);
        await L.openDashboard(app, page);                                // 3
        f.s3 = {published: await L.openView(page, 'Published'), views: await L.views(page)};
        f.s3.found = await L.search(page, TITLE);                        // 4
        f.s3.screen = await L.snap(page, 'step4-search');
        if (f.s3.found.some((r) => r.includes(TITLE))) {                 // the Expected path: open what the search found
            f.s3.opened = await L.openRow(app, page, newest);
            f.s3.contributors = await L.workflowEntry(page, 'Contributors').catch((e) => `ERR ${L.flat(e.message, 200)}`);
            await L.snap(page, 'step4-contributors');
        }

        await L.openDashboard(app, page);                                // 5
        f.s4 = {views: await L.views(page), rows: await L.openView(page, 'Active submissions'), newestId: newest};
        if (f.s4.rows.some((r) => r.startsWith(`${newest} `))) {
            f.s4.opened = await L.openRow(app, page, newest);
            f.s4.screen = await L.snap(page, 'step5-opened');
        }
    } catch (e) {
        f.error = L.flat(e.stack, 900);
        await L.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f, null, 1));
        await close();
    }
});
