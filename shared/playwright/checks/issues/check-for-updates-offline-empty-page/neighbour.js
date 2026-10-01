// Neighbour check for the fix of docs/issues/U61-A1-check-for-updates-offline-empty-page.md:
// what the fix must leave alone. As admin: System Information opened without the check still
// shows "Check for updates" and no message; Administration, Hosted Journals and Site Settings
// open as before (their own quiet newer-release check). Walk with the fix in and out.
//
// Run:  PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/check-for-updates-offline-empty-page/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'admin');
        f.admin = await L.openAdmin(app, page);
        f.systemInfo = await L.press(page, 'View System Information');
        await page.goto(app.url(L.ADMIN));
        f.hosted = await L.press(page, {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'}[app.name]);
        await page.goto(app.url(L.ADMIN));
        f.siteSettings = await L.press(page, 'Site Settings');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
