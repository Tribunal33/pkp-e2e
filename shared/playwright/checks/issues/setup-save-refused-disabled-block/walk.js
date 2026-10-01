// Issue report docs/issues/U09-A15-setup-save-refused-disabled-block.md (U09 A15, U10 A4):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing; everything goes through the screens. The fact keys
// below are numbered one behind the report's steps (fact 6 is report step 7):
//   1–4.  `dbarnes` ticks "Custom Block Manager", adds "u09ir5 Our Partners", places it
//   5–7.  unticks "Custom Block Manager"; "Page Footer" + "Save" on "Appearance" › "Setup"
//   8.    ticks "Language Toggle Block" under "Sidebar" + "Save" (the way round)
//   9–10. unticks "Language Toggle Block"; "Page Footer" + "Save"
//   11.   ticks "Custom Block Manager" again: is the block still placed?
//
// Reset first:  npm run fleet-prep -- --feature issues-ir5 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir5-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir5-3_5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js
// Facts: .reports/<feature>/ir5/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const CBM = 'customblockmanagerplugin';
const LTB = 'languagetoggleblockplugin';

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    // A custom block
    await signIn(page, 'dbarnes');                                                   // 1
    await L.openPlugins(app, page);
    fact('1-enable-cbm', await L.setPluginEnabled(page, CBM, true));
    await L.openManager(page);                                                       // 2
    const added = await L.addBlock(page, 'u09ir5 Our Partners', 'Partner list');
    fact('2-add', added);
    const block = added.rows.find((r) => /our-partners/.test(r.name || '')).name;
    fact('3-sidebar-before', await L.openSidebarList(app, page, ctx));               // 3
    await page.locator(`input[name="sidebar"][value="${block}"]`).first().check();
    fact('3-save', await L.saveSetup(page));
    await L.openPlugins(app, page);                                                  // 4
    fact('4-disable-cbm', await L.setPluginEnabled(page, CBM, false));
    fact('5-sidebar', await L.openSidebarList(app, page, ctx));                      // 5
    await L.typeFooter(page, 'u09ir5 footer');                                       // 6
    fact('6-save', await L.saveSetup(page));
    await snap(page, 'a15-6-refused');
    await L.openSidebarList(app, page, ctx);
    fact('6-footer-after-reload', await L.footerText(page));

    // The way round, and a block plugin
    await page.locator(`input[name="sidebar"][value="${LTB}"]`).first().check();    // 7
    fact('7-save-changed-list', await L.saveSetup(page));
    await L.openPlugins(app, page);                                                  // 8
    fact('8-disable-ltb', await L.setPluginEnabled(page, LTB, false));
    fact('9-sidebar', await L.openSidebarList(app, page, ctx));                      // 9
    await L.typeFooter(page, ' again');
    fact('9-save', await L.saveSetup(page));
    await snap(page, 'a4-9-refused');

    await L.openPlugins(app, page);                                                  // 10
    fact('10-enable-cbm', await L.setPluginEnabled(page, CBM, true));
    fact('10-sidebar', (await L.openSidebarList(app, page, ctx)).filter((o) => o.value === block));
    fact('scriptErrors-all', errs);
});
