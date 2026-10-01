// Neighbour check for the fix of docs/issues/U63-OJS2-doaj-tool-stays-on-plugins-list-when-off.md,
// walked with the fix in and out on PKP's default test dataset (OJS), as dbarnes:
//
//   A. "DOAJ Plugin" on (the dataset's state): the Plugins list and the Tools list both offer
//      "DOAJ Export Plugin", and its "Import/Export Data" opens the tool's page.
//   B. "DOAJ Plugin" unticked: both lists without it ("Native XML Plugin", "Crossref XML Export Plugin"
//      and "DataCite Export/Registration Plugin" kept: those two load whether their managers are on or off).
//   C. "DOAJ Plugin" ticked again: both lists offer it again, and its "Import/Export Data" opens the page.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<nofix|fix> node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/neighbour.js
// Facts: .reports/<feature>/<agent>/neighbour[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

async function state(app, page, pressLink) {
    await L.openPlugins(app, page);
    const out = {
        doajPlugin: (await L.rowState(app, page, 'doajplugin')).ticked,
        pluginsList: await L.importExportRows(page),
    };
    if (pressLink) {
        const o = await L.pressRowLink(app, page, 'DOAJExportPlugin', 'Import/Export Data');
        out.importExportData = {url: o.url, status: o.status, type: o.type, heading: o.heading, rawJson: o.rawJson, arrow: o.arrow, link: o.link};
    }
    out.tools = await L.toolsList(app, page);
    return out;
}

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');
        f.A = await state(app, page, true);
        await L.openPlugins(app, page);
        f.off = await L.setEnabled(app, page, 'doajplugin', false);
        f.B = await state(app, page, false);
        await L.openPlugins(app, page);
        f.on = await L.setEnabled(app, page, 'doajplugin', true);
        f.C = await state(app, page, true);
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
