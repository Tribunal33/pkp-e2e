// Neighbour check for the fix of docs/issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md:
// names the fix must leave as they are. Walked with the fix in and out, each on a fleet
// freshly reset to the default dataset; everything through the screens.
//   `rvaca` ticks "Custom Block Manager", adds "Our Partners" and "Événements à venir"
//   (English boxes, English interface), presses "Edit" on each (and "Cancel"), ticks
//   both under "Sidebar" and saves; reads the home page signed out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 PROBE_RUN=<fixin|fixout> node bin/probe.js all shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('a4a13-neighbour', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 500)); };
    const {page} = await launch(app);
    const visitor = (await launch(app)).page;
    const errs = L.scriptErrors(page);

    await signIn(page, 'rvaca');
    await L.openPlugins(app, page);
    await L.enablePlugin(page);
    await L.openManager(page);
    await L.addBlock(page, 'Our Partners', 'Partner list');
    const {rows} = await L.addBlock(page, 'Événements à venir', 'Agenda');
    fact('names', rows.map((r) => r.name));
    for (const r of rows) fact(`edit-${r.name}`, await L.pressRowAction(page, r.name, 'Edit', errs));
    await L.openSidebarList(app, page, ctx);
    fact('sidebar-save', await L.placeAndRead(page, rows.map((r) => r.name)));
    fact('public', await L.publicSidebar(app, visitor, ctx));
    fact('scriptErrors', errs.filter((e) => !/Failed to load resource/.test(e)));
});
