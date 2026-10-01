// Issue report docs/issues/U63-A9-unknown-section-import-broken-submission.md
// (U63 A9): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// as the dataset's `rvaca`, on its own context `publicknowledge`. OJS and OPS
// (OMP has series, which an import creates: U63 OMP3).
//
//   1. sign in as rvaca
//   2. Tools › Import/Export › "Native XML Plugin"
//   3. "Export Articles" ("Export Preprints"): tick OJS submission 4 (OPS 1),
//      export, "Download Exported File"
//   4. the file's section_ref changed to "ZZZ" (the text editor's step)
//   5. "Import": upload the edited file, "Import"
//   6. Dashboard: the new submission's row
//   7. "View" on that row
//   8. the Native XML Plugin's export tab again
// Besides the screens it reads the new submission's rows in the database
// (its publications and current_publication_id) after step 5.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/unknown-section-import-broken-submission/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/unknown-section-import-broken-submission/walk.js
// Facts: .reports/<feature>/ir2/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile} = require('../../../probe');
const L = require('./lib');

const SUBMISSION = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers', section: 'ART'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', section: 'PRE'},
};

forEachApp(async (app) => {
    const S = SUBMISSION[app.name];
    if (!S) { console.log(`[walk] ${app.name}: no such surface (OMP imports an unknown series instead)`); return; }
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = L.scriptErrors(page);
    const w = L.watch(page);
    try {
        // 1–2
        await signIn(page, 'rvaca');
        await L.openNative(app, page);
        facts.lastIdBefore = sql(app, 'SELECT max(submission_id) FROM submissions');
        // 3
        const ex = await L.exportOne(app, page, S.title);
        facts.export = {file: ex.file, results: ex.res, sectionRefs: [...ex.xml.matchAll(/section_ref="([^"]*)"/g)].map((m) => m[1])};
        // 4
        const edited = ex.xml.split(`section_ref="${S.section}"`).join('section_ref="ZZZ"');
        const f = outFile('edited.xml');
        fs.writeFileSync(f, edited);
        facts.editedSectionRefs = [...edited.matchAll(/section_ref="([^"]*)"/g)].map((m) => m[1]);
        // 5
        const mark = w.seen.length;
        facts.import = await L.importFile(page, f);
        facts.importResponses = w.seen.slice(mark);
        facts.importScreen = await L.snap(page, 'step5-import-results');
        const newId = sql(app, 'SELECT max(submission_id) FROM submissions');
        facts.newId = newId;
        if (newId !== facts.lastIdBefore) {
            facts.db = {
                submission: sql(app, `SELECT submission_id, status, stage_id, current_publication_id, submission_progress FROM submissions WHERE submission_id = ${newId}`),
                publications: sql(app, `SELECT count(*) FROM publications WHERE submission_id = ${newId}`),
                files: sql(app, `SELECT count(*) FROM submission_files WHERE submission_id = ${newId}`),
            };
        }
        // 6
        const d = await L.dashboardRow(app, page, newId);
        facts.dashboard = {found: d.found, text: d.text, cells: d.cells, buttons: d.buttons, links: d.links};
        facts.dashboardScreen = await L.snap(page, 'step6-dashboard');
        // 7
        if (d.found) {
            const e0 = errs.length;
            facts.view = await L.pressView(page, d.row);
            facts.viewErrors = errs.slice(e0);
            facts.viewScreen = await L.snap(page, 'step7-view');
        }
        // 8
        const e1 = errs.length;
        await L.openNative(app, page);
        await L.openExportTab(app, page);
        facts.exportListAfter = await L.readExportList(page);
        facts.exportListErrors = errs.slice(e1);
        facts.exportScreen = await L.snap(page, 'step8-export-tab');
    } catch (e) {
        facts.error = L.flat(e.stack, 900);
        await L.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        facts.scriptErrors = errs;
        facts.responses = w.seen;
        record('facts', facts);
        console.log(`[walk] ${app.name}`, JSON.stringify(facts, null, 1).slice(0, 5000));
        await close();
    }
});
