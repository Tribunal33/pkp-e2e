// Walk of docs/issues/U45-A20-doi-agency-tool-page-empty-heading.md on PKP's default test dataset (OJS, OPS;
// OMP's Tools list has neither tool, so the walk stops there after step 2):
// sign in as dbarnes, open Tools, press "Crossref XML Export Plugin", then (journal) "DataCite Export/Registration
// Plugin". Control: "Native XML Plugin".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const tools = require('../command-line-tool-link-blank-page/lib');
const L = require('./lib');

const TOOLS = ['Crossref XML Export Plugin', 'DataCite Export/Registration Plugin'];

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main', pages: {}};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');                                // 1
        f.s2 = await tools.openTools(app, page);                      // 2
        f.s2.screen = await native.snap(page, 'step2-tools');
        for (const name of TOOLS) {                                   // 3, 4
            if (!f.s2.tools.includes(name)) continue;
            await tools.openTools(app, page);
            const pressed = await tools.pressTool(page, name);
            f.pages[name] = {status: pressed.status, ...(await L.readToolPage(page))};
            f.pages[name].screen = await native.snap(page, `tool-${name.split(' ')[0].toLowerCase()}`);
        }
        await tools.openTools(app, page);                             // control
        const c = await tools.pressTool(page, 'Native XML Plugin');
        f.control = {status: c.status, ...(await L.readToolPage(page))};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
