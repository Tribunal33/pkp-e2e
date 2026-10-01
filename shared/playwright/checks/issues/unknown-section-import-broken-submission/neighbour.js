// Neighbour check for the fix of docs/issues/U63-A9-unknown-section-import-broken-submission.md:
// the imports the fix must leave alone, walked through the same screens as walk.js
// as the dataset's `rvaca` on `publicknowledge`.
//
//   OJS, OPS: the file exported in walk.js's step 3, imported unchanged: it must
//     still read "The import completed successfully." with the new submission,
//     whose workflow opens (by the address a Dashboard "View" leads to; the row
//     is not on the list's first page), and the export list must stay whole.
//   OMP: a monograph's file with its series path changed to "zzz" (a series the
//     press lacks): it must still import with "Warnings encountered:" and
//     "Unknown series zzz" (U63 OMP3), since that import is written to add the series.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 PROBE_RUN=<fixin|fixout> node bin/probe.js all shared/playwright/checks/issues/unknown-section-import-broken-submission/neighbour.js
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile} = require('../../../probe');
const L = require('./lib');

const SUBMISSION = {
    ojs: {title: 'Computer Skill Requirements for New and Existing Teachers'},
    omp: {title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

forEachApp(async (app) => {
    const S = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = L.scriptErrors(page);
    const w = L.watch(page);
    try {
        await signIn(page, 'rvaca');
        await L.openNative(app, page);
        facts.lastIdBefore = sql(app, 'SELECT max(submission_id) FROM submissions');
        const ex = await L.exportOne(app, page, S.title);
        let xml = ex.xml;
        if (app.name === 'omp') {
            xml = /<series[\s>]/.test(xml)
                ? xml.replace(/<series([\s\S]*?)<path>[^<]*<\/path>/, '<series$1<path>zzz</path>')
                : xml.replace(/(\s*)(<chapters[\s>]|<\/publication>)/, '$1<series><title locale="en">Zed Series</title><path>zzz</path></series>$1$2');
        }
        const f = outFile('neighbour.xml');
        fs.writeFileSync(f, xml);
        const mark = w.seen.length;
        facts.import = await L.importFile(page, f);
        facts.importResponses = w.seen.slice(mark).filter((r) => /\/import\?/.test(r.url)).map((r) => r.status);
        await L.snap(page, 'neighbour-import-results');
        const newId = sql(app, 'SELECT max(submission_id) FROM submissions');
        facts.newId = newId;
        facts.publications = newId !== facts.lastIdBefore ? sql(app, `SELECT count(*) FROM publications WHERE submission_id = ${newId}`) : null;
        if (newId !== facts.lastIdBefore) {
            const e0 = errs.length;
            facts.workflow = await L.openWorkflow(app, page, newId);
            facts.workflowErrors = errs.slice(e0);
        }
        await L.openNative(app, page);
        await L.openExportTab(app, page);
        const list = await L.readExportList(page);
        facts.exportList = {count: (list.items || []).length, first: (list.items || []).slice(0, 2)};
    } catch (e) {
        facts.error = L.flat(e.stack, 900);
        await L.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        facts.scriptErrors = errs;
        record('neighbour', facts);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(facts, null, 1).slice(0, 3000));
        await close();
    }
});
