// Walk of docs/issues/U20-A2-analytics-plugin-texts-name-ojs-and-check-status.md on PKP's default test
// dataset (OJS, OMP, OPS): as rvaca, read "Google Analytics Plugin"'s description on Settings › Website
// › "Plugins", tick it, open its "Settings" window and read the window's paragraphs.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'rvaca');                                                       // 1
        await L.openPlugins(app, page);                                                    // 2
        f.s3 = await L.row(app, page);                                                     // 3
        f.s3.screen = await L.snap(page, 'step3-plugins');
        if (!f.s3.listed) {
            f.noSurface = 'no "Google Analytics Plugin" row on the Plugins list';
            return;
        }
        f.s4 = await L.enable(app, page);                                                  // 4
        f.s5 = await L.openSettings(app, page);                                            // 5, 6
        f.s5.screen = await L.snap(page, 'step5-settings-window');
        f.summary = {
            namesOJS: /Integrate OJS/.test(f.s3.text || ''),
            checkStatus: /Check Status/.test(f.s5.description || ''),
            checkStatusControls: (f.s5.checkStatusControls || []).length,
        };
    } catch (e) {
        f.error = L.flat(e.stack, 900);
        await L.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
