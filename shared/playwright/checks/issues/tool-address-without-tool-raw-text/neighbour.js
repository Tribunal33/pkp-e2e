// Neighbour check for the fix of docs/issues/U63-A1-A19-tool-address-without-tool-raw-text.md:
// what the fix must leave alone, and how far it reaches, walked with the fix in and out on PKP's
// default test dataset.
//
//   A. As dbarnes: "Tools" still loads its "Import/Export" tab (the list, 200) and its "Permissions"
//      tab; "Native XML Plugin" still opens its page; "Users XML Plugin" still opens its page.
//   B. As dbarnes, the reach: `…/management/importexport/anything`, a tool's name in lower case
//      (`…/plugin/nativeimportexportplugin`) and `…/management/tools/anything`.
//   C. As dbuskins (section editor / series editor / moderator): the step 4 address stays refused.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<nofix|fix> node bin/probe.js all shared/playwright/checks/issues/tool-address-without-tool-raw-text/neighbour.js
// Facts: .reports/<feature>/<agent>/neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const tabGets = [];
    page.on('response', (r) => {
        if (r.request().method() === 'GET' && /\/management\/(permissions|importexport)(\?|$)/.test(r.url())) {
            tabGets.push(`${native.rel(r.url()).replace(/[?&]_=\d+/, '')} ${r.status()}`);
        }
    });
    try {
        await signIn(page, 'dbarnes');
        // A
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
        await page.locator('#managementTabs').waitFor();
        await idle(page).catch(() => {});
        const list = page.locator('#managementTabs [role="tabpanel"]:visible');
        await list.getByRole('link', {name: 'Native XML Plugin', exact: true}).waitFor();
        f.A = {importexportTab: native.flat(await list.first().innerText(), 200)};
        await page.locator('#managementTabs > ul a.ui-tabs-anchor', {hasText: 'Permissions'}).click();
        await idle(page).catch(() => {});
        await native.sleep(800);
        f.A.permissionsTab = native.flat(await page.locator('#managementTabs [role="tabpanel"]:visible').first().innerText(), 120);
        f.A.tabGets = tabGets.slice();
        for (const tool of ['NativeImportExportPlugin', 'UserImportExportPlugin']) {
            const o = await L.open(app, page, `/management/importexport/plugin/${tool}`);
            f.A[tool] = {status: o.status, type: o.type, heading: o.heading};
        }
        // B
        f.B = {};
        for (const a of ['/management/importexport/anything', '/management/importexport/plugin/nativeimportexportplugin', '/management/tools/anything']) {
            const mark = L.logSince(app, 0).size;
            const o = await L.open(app, page, a);
            f.B[a] = {status: o.status, type: o.type, heading: o.heading, rawJson: o.rawJson, log: L.logSince(app, mark).lines.slice(0, 1)};
        }
        await signOut(page);
        // C
        await signIn(page, 'dbuskins');
        const c = await L.open(app, page, `/management/importexport/plugin/${L.ABSENT[app.name]}`);
        f.C = {status: c.status, type: c.type, heading: c.heading, body: native.flat(c.body, 160)};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
