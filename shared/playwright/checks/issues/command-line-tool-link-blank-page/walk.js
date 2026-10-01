// Walk of docs/issues/U63-OMP1-command-line-tool-link-blank-page.md on PKP's default test dataset (OMP):
// sign in as dbarnes, open Tools, press "Tab Delimited Content Import Plugin". Control: "Native XML Plugin".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/command-line-tool-link-blank-page/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-omp.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const tools = require('../tool-address-without-tool-raw-text/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');                                // 1
        f.s2 = await L.openTools(app, page);                          // 2
        f.s2.screen = await native.snap(page, 'step2-tools');
        if (!f.s2.tools.includes('Tab Delimited Content Import Plugin')) return;   // OJS, OPS: no such tool
        const mark = tools.logSince(app, 0).size;
        f.s3 = await L.pressTool(page, 'Tab Delimited Content Import Plugin');   // 3
        f.s3.log = tools.logSince(app, mark).lines;
        f.s3.screen = await native.snap(page, 'step3-tab-delimited');
        await L.openTools(app, page);                                 // control
        f.control = await L.pressTool(page, 'Native XML Plugin');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
