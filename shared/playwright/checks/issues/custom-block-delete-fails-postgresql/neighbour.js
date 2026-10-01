// Neighbour check for docs/issues/U09-A14-custom-block-delete-fails-postgresql.md
// (U09 A14), walked with the fix in and out: deleting one custom block must
// take that block alone. As `rvaca` on the default dataset: tick "Custom Block
// Manager", add "Our Partners" and "Our Events", place both under "Sidebar",
// delete "our-partners"; then read the list, the public sidebar, the "Sidebar"
// list and the plugin's own box. With the fix "our-events" stays everywhere
// and the plugin stays ticked; without it the delete answers 500 and both stay.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/neighbour.js
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('neighbour', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 500)); };
    const {page} = await launch(app);
    const visitor = (await launch(app)).page;
    await signIn(page, 'rvaca');
    await L.openTab(app, page, ctx, 'plugins');
    await L.enablePlugin(page);
    await L.openManager(page);
    await L.addBlock(page, 'Our Partners', 'Partner list');
    fact('added', (await L.addBlock(page, 'Our Events', 'Events list')).rows);
    await L.openSidebarList(app, page, ctx);
    fact('placed', await L.placeInSidebar(page, ['our-partners', 'our-events']));
    fact('public-before', await L.publicSidebar(app, visitor, ctx));
    await L.openTab(app, page, ctx, 'plugins');
    await L.openManager(page);
    fact('delete', await L.deleteBlock(page, 'our-partners'));
    record('nb-after-ok', await screen(page)); await shot(page, 'nb-after-ok').catch(() => {});
    await L.openTab(app, page, ctx, 'plugins');
    fact('plugin-still-ticked', await L.pluginRow(page).getByRole('checkbox').first().isChecked());
    fact('list-after', await L.openManager(page));
    fact('public-after', await L.publicSidebar(app, visitor, ctx));
    fact('sidebar-list-after', (await L.openSidebarList(app, page, ctx)).filter((o) => /^our-/.test(o.value)).map((o) => `${o.value}:${o.checked}`));
});
