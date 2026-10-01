// Neighbour check for the fix in fix.diff (docs/issues/U63-A20-native-import-doubles-title-prefix.md):
// the same submission left as the dataset holds it, with no "Prefix" (its title starting "The"),
// goes through the same Native XML round trip as dbarnes and must come back unchanged, with the fix
// in and with it out. Steps 1, 2, 4 to 7 of walk.js; step 3 left out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 2 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-ir3 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/native-import-doubles-title-prefix/neighbour.js
// Facts: .reports/<feature>/ir3/neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const stored = (app, id) => sql(app, `SELECT ps.setting_name || '=' || ps.setting_value FROM publication_settings ps JOIN publications p ON p.publication_id = ps.publication_id WHERE p.submission_id = ${id} AND ps.locale = 'en' AND ps.setting_name IN ('title', 'prefix') ORDER BY 1`);

forEachApp(async (app) => {
    const S = L.SUBMISSIONS[app.name];
    const f = {app: app.name, line: app.line || 'main', submission: S.id};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openTitleAbstract(app, page, S.id);
        f.original = await L.readTitleAbstract(page);
        f.storedOriginal = stored(app, S.id);
        f.export = await L.exportToFile(app, page, S.title, 'neighbour-export');
        f.import = await L.importAndRead(app, page, f.export.file);
        const copy = f.import.imported[0];
        if (copy) {
            await L.openTitleAbstract(app, page, copy.id);
            f.copy = await L.readTitleAbstract(page);
            f.storedCopy = stored(app, copy.id);
        }
        f.unchanged = !!copy && f.copy.prefix === f.original.prefix && f.copy.title === f.original.title && copy.listed === S.title;
    } catch (e) {
        f.error = String(e.message).slice(0, 400);
    } finally {
        f.scriptErrors = errs;
        record('neighbour', f);
        console.log(`[neighbour] ${app.name} ${f.line}: unchanged=${f.unchanged}; listed ${JSON.stringify(f.import && f.import.imported)}; copy ${JSON.stringify(f.copy)}${f.error ? ` ERROR ${f.error}` : ''}`);
        await close();
    }
});
