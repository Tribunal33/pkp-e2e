// Issue report docs/issues/U09-A1-custom-block-listed-by-made-up-name.md (U09 A1):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing; everything goes through the screens:
//   1–5. `rvaca` ticks "Custom Block Manager", adds "Our Partners" / "Partner list"
//        and reads the list
//   6.   "Appearance" › "Setup" › "Sidebar": reads the entry, ticks it, "Save"
//   7–8. renames the block "Friends"; reads the list, "Sidebar" and the home page
// Helpers: ../custom-block-stuck-with-unusable-name/lib.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-made-up-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-made-up-name/walk.js
// Facts: .reports/<feature>/ir2/a1-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('../custom-block-stuck-with-unusable-name/lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('a1-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const visitor = (await launch(app)).page;
    const ours = (o) => !/^(?:[a-z]+blockplugin|.*Block Plugin.*)$/i.test(o.value) && /\(Custom Block\)/.test(o.label);
    const label = (o) => ({value: o.value, checked: o.checked, label: o.label.split('\n')[0]});

    await signIn(page, 'rvaca');                                                     // 1
    await L.openPlugins(app, page);                                                  // 2
    fact('2-enable', await L.enablePlugin(page));
    await L.openManager(page);                                                       // 3
    const added = await L.addBlock(page, 'Our Partners', 'Partner list');            // 4
    fact('5-list', added);                                                           // 5
    await snap(page, 'a1-5-list');
    const name = added.rows[0].name;
    const list = await L.openSidebarList(app, page, ctx);                            // 6
    fact('6-sidebar-entry', list.filter(ours).map(label));
    fact('6-save', await L.placeAndRead(page, [name]));
    await snap(page, 'a1-6-sidebar');
    await L.openPlugins(app, page);                                                  // 7
    await L.openManager(page);
    fact('7-rename', await L.renameBlock(page, name, 'Friends'));
    await snap(page, 'a1-7-renamed');
    await L.openPlugins(app, page);                                                  // 8
    fact('8-list', await L.openManager(page));
    fact('8-sidebar-entry', (await L.openSidebarList(app, page, ctx)).filter(ours).map(label));
    await snap(page, 'a1-8-sidebar');
    fact('8-public', await L.publicSidebar(app, visitor, ctx));
});
