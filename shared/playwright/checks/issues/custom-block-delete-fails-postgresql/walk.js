// Issue report docs/issues/U09-A14-custom-block-delete-fails-postgresql.md (U09 A14):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing; everything goes through the screens:
//   1–5. `rvaca` ticks "Custom Block Manager", adds "Our Partners" /
//        "Partner list", places it under "Appearance" › "Setup" › "Sidebar"
//   6–7. the row's "Delete" › "OK"; then reload: the list, the public sidebar,
//        the "Sidebar" list
// The site's own blocks (Administration › "Site Settings" › "Plugins") are not
// walked: that tab shows only on a site with more than one context, and the
// dataset holds one.
// Besides the screens it reads the fleet's server log for the lines the
// delete requests wrote.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js
// Facts: .reports/<feature>/ir1/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const log = L.serverLog(app);
    const {page} = await launch(app);
    const visitor = (await launch(app)).page;

    // A journal's block
    await signIn(page, 'rvaca');
    await L.openTab(app, page, ctx, 'plugins');                               // 2
    fact('2-enable', await L.enablePlugin(page));
    fact('3-manager', await L.openManager(page));                              // 3
    fact('4-add', await L.addBlock(page, 'Our Partners', 'Partner list'));     // 4
    await snap(page, '4-added');
    fact('5-sidebar-saved', await (async () => {                               // 5
        await L.openSidebarList(app, page, ctx);
        return L.placeInSidebar(page, ['our-partners']);
    })());
    fact('5-public', await L.publicSidebar(app, visitor, ctx));
    await L.openTab(app, page, ctx, 'plugins');                               // 6
    await L.openManager(page);
    const mark = log.size();
    const del = await L.deleteBlock(page, 'our-partners');                     // 6–7
    await snap(page, '7-after-ok');
    fact('7-delete', del);
    fact('7-log', log.since(mark, /SQLSTATE|plugin_Name|PHP (Fatal|Warning)|Uncaught/));
    await L.openTab(app, page, ctx, 'plugins');                               // reload
    fact('7-list-after-reload', await L.openManager(page));
    await snap(page, '7-list-after-reload');
    fact('7-public-after', await L.publicSidebar(app, visitor, ctx));
    fact('7-sidebar-list-after', (await L.openSidebarList(app, page, ctx)).filter((o) => /our-partners/.test(o.value)));
});
