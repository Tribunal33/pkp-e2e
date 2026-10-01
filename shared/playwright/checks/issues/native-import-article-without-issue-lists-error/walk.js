// Issue report docs/issues/U63-A8-native-import-article-without-issue-lists-error.md (U63 A8, the
// issue-identification line): the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `rvaca`,
// on `publicknowledge`. OJS only (a press and a preprint server have no issues).
//
//   1. sign in as rvaca
//   2. Tools › "Native XML Plugin"
//   3–4. "Export Articles": tick submission 8 (in no issue), "Export Articles", "Download Exported File"
//   5–6. "Import": upload the file, "Import"; the "Import Results" tab is read
//   Control and neighbour check for the fix: the same with submission 17 (published in Vol. 1 No. 2
//   (2014)): no line, and the copy is placed in that issue.
// Besides the screens it reads, from the database, the issue each copy is placed in.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir11 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir11 PROBE_AGENT=ir11 node bin/probe.js ojs shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir11-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir11-3_5 PROBE_AGENT=ir11 node bin/probe.js ojs shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js
// Facts: .reports/<feature>/ir11/issue-walk[-<run>]-ojs.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const CASES = [
    {id: 8, title: 'Traditions and Trends in the Study of the Commons', role: 'steps'},
    {id: 17, title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms', role: 'control'},
];
const placed = (app, id) => sql(app, `SELECT p.submission_id || ' issue=' || COALESCE(p.issue_id::text, 'none') || ' status=' || p.status FROM publications p WHERE p.submission_id = ${id} ORDER BY p.publication_id`);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main', cases: []};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'rvaca');
        for (const c of CASES) {
            const r = {id: c.id, role: c.role, source: placed(app, c.id)};
            await native.openNative(app, page);
            const out = await native.exportOne(app, page, c.title);
            const file = outFile(`sub${c.id}.xml`);
            fs.writeFileSync(file, out.xml);
            r.fileIssueIdentification = (out.xml.match(/<issue_identification>[\s\S]*?<\/issue_identification>/) || [null])[0];
            r.fileIssueIdentification = r.fileIssueIdentification && native.flat(r.fileIssueIdentification, 200);
            await native.openNative(app, page);
            const res = await native.importFile(page, file);
            r.tabs = res.tabs;
            r.results = res.panel;
            r.screen = await native.snap(page, `import-results-sub${c.id}`);
            const m = /"(\d+)" - "/.exec(res.panel || '');
            r.copy = m ? Number(m[1]) : null;
            if (r.copy) r.copyPlaced = placed(app, r.copy);
            r.errorsListed = /Errors occured/.test(res.panel || '');
            f.cases.push(r);
            console.log(`[walk] ${app.name} ${f.line} sub ${c.id}: copy ${r.copy} (${r.copyPlaced}); errors listed ${r.errorsListed}`);
        }
    } catch (e) {
        f.error = String(e.message).slice(0, 400);
        console.log(`[walk] ERROR ${f.error}`);
    } finally {
        f.responses = w.seen.filter((r) => r.status >= 400 || r.method !== 'GET');
        f.scriptErrors = errs;
        record('issue-walk', f);
        await close();
    }
});
