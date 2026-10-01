// Walk of docs/issues/U63-A1-A19-tool-address-without-tool-raw-text.md on PKP's default test dataset:
// sign in as dbarnes, open Tools, press "Native XML Plugin", then change the address to a tool the
// application lacks (step 4) and to no tool at all (step 5). Control: an unknown Settings tab.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/tool-address-without-tool-raw-text/walk.js
// Facts: .reports/<feature>/<agent>/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');                                                     // 1
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));     // 2
        await page.locator('#managementTabs').waitFor();
        await idle(page).catch(() => {});
        const link = page.locator('#managementTabs').getByRole('link', {name: 'Native XML Plugin', exact: true});
        await link.waitFor();
        f.s2 = {heading: native.flat(await page.locator('h1').first().innerText(), 80)};
        await link.click();                                                                // 3
        await page.locator('#importExportTabs').waitFor();
        await idle(page).catch(() => {});
        f.s3 = {url: native.rel(page.url()), heading: native.flat(await page.locator('h1').first().innerText(), 80)};
        f.s3.screen = await native.snap(page, 'step3-native');
        const base = native.rel(page.url()).replace(/^.*\/en(\/management\/importexport\/plugin\/)NativeImportExportPlugin.*$/, '$1');
        f.s4 = await L.open(app, page, `${base}${L.ABSENT[app.name]}`);                    // 4
        f.s4.screen = await native.snap(page, 'step4-absent-tool');
        const mark = L.logSince(app, 0).size;
        f.s5 = await L.open(app, page, base.replace(/\/$/, ''));                           // 5
        f.s5.log = L.logSince(app, mark).lines;
        f.s5.screen = await native.snap(page, 'step5-no-tool-name');
        f.control = await L.open(app, page, '/management/settings/nosuchtab');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'walk-error').catch(() => {});
    } finally {
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
