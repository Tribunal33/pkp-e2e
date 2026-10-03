// Issue report docs/issues/U74-A1-onix-export-fails-every-book.md (U74 A1): the report's Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. OMP only.
//
//   1. sign in as dbarnes
//   2. Settings › Press › "Masthead": "Press Publisher Name" Public Knowledge Press, "Geographical
//      Location" Vancouver, "Publisher Code Type" "Proprietary (01)", "Publisher Code" u74ir1; "Save"
//   3. Tools › Import/Export › "ONIX 3.0 Monograph Export Plugin"
//   4. "Export" tab: tick "From Bricks to Brains: …" (submission 14); validation box left ticked
//   5. press "Export Submissions"
//   6. "Close" the results tab, untick the validation box, press "Export Submissions" again
// It records the results panel's text, the export requests with their statuses and the
// downloaded file (name, root element, product count) after steps 5 and 6.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps omp
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js omp shared/playwright/checks/issues/onix-export-fails-every-book/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset --apps omp
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js omp shared/playwright/checks/issues/onix-export-fails-every-book/walk.js
// Facts: .reports/<feature>/ir1/walk[-<run>]-omp.json
const {forEachApp, launch, signIn, record, serverLog, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const nx = require('../native-export-nothing-ticked-empty-tab/lib');
const L = require('./lib');

const BOOK = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const f = {app: app.name, line: app.line || 'main'};
    try { f.storedType = sql(app, "SELECT input_type FROM filter_groups WHERE symbolic = 'monographs=>onix30-xml'"); } catch (e) { f.storedType = String(e).slice(0, 200); }
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const alerts = nx.dialogs(page);
    const w = L.watchExports(page);
    const log = serverLog(app);
    const from = log.mark();
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        f.step2Saved = await nx.fillPublisherIdentity(app, page, {publisher: 'Public Knowledge Press', location: 'Vancouver', codeType: 'Proprietary (01)', codeValue: 'u74ir1'});
        // 3
        await nx.openOnix(app, page);
        f.tabsBefore = await nx.tabs(page);
        // 4
        f.ticked = await L.tickOnixBook(page, BOOK);
        f.validation4 = await L.setValidation(page, true);
        // 5
        f.step5 = await L.exportOnix(app, page, w, alerts);
        f.step5Screen = await native.snap(page, 'step5-onix-export-validation-on');
        // 6
        f.tabsAfterClose = await L.closeLastTab(page);
        f.tickedAfterClose = await page.locator('#export-tab .listPanel__item input[type=checkbox]:checked').count();
        f.validation6 = await L.setValidation(page, false);
        f.step6 = await L.exportOnix(app, page, w, alerts);
        f.step6Screen = await native.snap(page, 'step6-onix-export-validation-off');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        f.alerts = alerts;
        f.serverLog = log.since(from).map((l) => native.flat(l, 300)).slice(0, 10);
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 5000));
        await close();
    }
});
