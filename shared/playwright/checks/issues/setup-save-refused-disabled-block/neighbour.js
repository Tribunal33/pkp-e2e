// Neighbour check for the fix in fix.diff (U09 A15, U10 A4): with every block's
// plugin enabled, a "Page Footer" save on "Appearance" › "Setup" keeps the
// placed blocks ticked and in their order. Walk it with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir5 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-ir5 PROBE_AGENT=ir5 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const CBM = 'customblockmanagerplugin';
const LTB = 'languagetoggleblockplugin';

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    await L.openPlugins(app, page);
    await L.setPluginEnabled(page, CBM, true);
    await L.openManager(page);
    const added = await L.addBlock(page, 'u09ir5 Our Partners', 'Partner list');
    const block = added.rows.find((r) => /our-partners/.test(r.name || '')).name;
    await L.openSidebarList(app, page, ctx);
    await page.locator(`input[name="sidebar"][value="${LTB}"]`).first().check();
    await page.locator(`input[name="sidebar"][value="${block}"]`).first().check();
    fact('place', await L.saveSetup(page));
    const ticked = (list) => list.filter((o) => o.checked).map((o) => o.value);
    fact('before', ticked(await L.openSidebarList(app, page, ctx)));
    await L.typeFooter(page, 'u09ir5 footer');
    fact('footer-save', await L.saveSetup(page));
    fact('after', ticked(await L.openSidebarList(app, page, ctx)));
    fact('footer-after-reload', await L.footerText(page));
});
