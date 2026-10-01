// Walk of docs/issues/U61-A1-check-for-updates-offline-empty-page.md on PKP's default test dataset
// (OJS, OMP, OPS): as admin, Administration › "View System Information" › "Check for updates",
// on an install whose [proxy] points at a dead port (the fleet's config does).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/check-for-updates-offline-empty-page/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'admin');                                      // 1
        f.s2 = await L.openAdmin(app, page);                              // 2
        f.s3 = await L.press(page, 'View System Information');            // 3
        await native.snap(page, 'step3-system-information');
        const mark = L.logMark(app);
        f.s4 = await L.press(page, 'Check for updates');                  // 4
        f.s4.log = L.logSince(app, mark);
        await native.snap(page, 'step4-check-for-updates');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
