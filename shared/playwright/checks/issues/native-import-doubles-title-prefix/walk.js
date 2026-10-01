// Issue report docs/issues/U63-A20-native-import-doubles-title-prefix.md (U63 A20): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. All three apps.
//
//   1. sign in as dbarnes
//   2. the submission's workflow › "Title & Abstract" (OJS 3, OMP 3, OPS 1)
//   3. "The" in "Prefix", "The " off the start of "Title", "Save"
//   4. Tools › Import/Export › "Native XML Plugin"
//   5. the export tab: tick it, export, "Download Exported File"
//   6. "Import": upload the file, "Import"
//   7. the imported copy's workflow › "Title & Abstract"
// Besides the screens it reads the file's <title>/<prefix> and the publications' stored title and
// prefix (publication_settings).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/native-import-doubles-title-prefix/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir3-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir3-3_5 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/native-import-doubles-title-prefix/walk.js
// Facts: .reports/<feature>/ir3/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const stored = (app, where) => sql(app, `SELECT p.submission_id || ' ' || ps.setting_name || '=' || ps.setting_value FROM publication_settings ps JOIN publications p ON p.publication_id = ps.publication_id WHERE ${where} AND ps.locale = 'en' AND ps.setting_name IN ('title', 'prefix') ORDER BY 1`);

forEachApp(async (app) => {
    const S = L.SUBMISSIONS[app.name];
    const f = {app: app.name, line: app.line || 'main', submission: S.id};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        // 1–2
        await signIn(page, 'dbarnes');
        await L.openTitleAbstract(app, page, S.id);
        f.before = await L.readTitleAbstract(page);
        // 3
        f.saveStatus = await L.moveTheToPrefix(page, S.title);
        await L.openTitleAbstract(app, page, S.id);
        f.afterSave = await L.readTitleAbstract(page);
        f.afterSaveScreen = await native.snap(page, 'step3-original-title-abstract');
        f.storedOriginal = stored(app, `p.submission_id = ${S.id}`);
        // 4–5
        f.export = await L.exportToFile(app, page, S.title, 'export');
        // 6
        f.import = await L.importAndRead(app, page, f.export.file);
        f.importScreen = await native.snap(page, 'step6-import-results');
        // 7
        const copy = f.import.imported[0];
        if (copy) {
            await L.openTitleAbstract(app, page, copy.id);
            f.copy = await L.readTitleAbstract(page);
            f.copyScreen = await native.snap(page, 'step7-copy-title-abstract');
            f.storedCopy = stored(app, `p.submission_id = ${copy.id}`);
        }
    } catch (e) {
        f.error = String(e.message).slice(0, 400);
    } finally {
        f.responses = w.seen.filter((r) => r.status >= 400 || r.method !== 'GET');
        f.scriptErrors = errs;
        record('walk', f);
        console.log(`[walk] ${app.name} ${f.line}: listed ${JSON.stringify(f.import && f.import.imported)}; copy ${JSON.stringify(f.copy)}${f.error ? ` ERROR ${f.error}` : ''}`);
        await close();
    }
});
