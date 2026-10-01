// Walk of docs/issues/U63-OJS2-doaj-tool-stays-on-plugins-list-when-off.md on PKP's default test
// dataset (OJS; a press and a preprint server have no DOAJ plugin): as dbarnes, untick "DOAJ Plugin"
// on Settings › Website › "Plugins", then read "Import/Export Plugins", the Tools list, and press
// "DOAJ Export Plugin"'s "Import/Export Data". Control: "Native XML Plugin" in both lists.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');                                                     // 1
        await L.openPlugins(app, page);                                                    // 2
        f.s2 = {
            doajPlugin: await L.rowState(app, page, 'doajplugin'),
            doajExport: await L.rowState(app, page, 'DOAJExportPlugin'),
            importExport: await L.importExportRows(page),
        };
        f.s2.screen = await native.snap(page, 'step2-plugins');
        if (!f.s2.doajPlugin.listed) {
            f.noSurface = 'no "DOAJ Plugin" row on the Plugins list';
            f.tools = await L.toolsList(app, page);
            return;
        }
        f.s3 = await L.setEnabled(app, page, 'doajplugin', false);                         // 3
        await L.openPlugins(app, page);                                                    // 4
        f.s4 = {
            doajPlugin: await L.rowState(app, page, 'doajplugin'),
            doajExport: await L.rowState(app, page, 'DOAJExportPlugin'),
            importExport: await L.importExportRows(page),
        };
        f.s4.screen = await native.snap(page, 'step4-plugins-after-off');
        f.s5 = {tools: await L.toolsList(app, page)};                                      // 5
        f.s5.screen = await native.snap(page, 'step5-tools');
        await L.openPlugins(app, page);                                                    // 6
        f.s6 = await L.pressRowLink(app, page, 'DOAJExportPlugin', 'Import/Export Data');
        f.s6.screen = await native.snap(page, 'step6-import-export-data');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
