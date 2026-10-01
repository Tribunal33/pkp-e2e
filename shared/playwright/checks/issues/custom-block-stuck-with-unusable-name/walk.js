// Issue report docs/issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md (U09 A4, A13):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing; everything goes through the screens:
//   1–5. `rvaca` ticks "Custom Block Manager", adds "News 2026 & Events",
//        presses the row's "Edit" and "Delete", ticks it under "Sidebar"
//   6–9. in French, adds "Our Partners" in the English "Block Name" only;
//        back in English: the list's row, then ticking it under "Sidebar"
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/walk.js
// Facts: .reports/<feature>/ir2/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('a4a13-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    // A name with "&"
    await signIn(page, 'rvaca');                                                    // 1
    await L.openPlugins(app, page);
    fact('1-enable', await L.enablePlugin(page));
    await L.openManager(page);
    let mark = errs.length;
    const added = await L.addBlock(page, 'News 2026 & Events', 'Dates');            // 2
    fact('2-add', {...added, scriptErrorsOnListLoad: errs.slice(mark)});
    await snap(page, 'a13-2-added');
    const amp = added.rows[0].name;                                                 // the one block
    fact('3-edit', await L.pressRowAction(page, amp, 'Edit', errs));                 // 3
    await snap(page, 'a13-3-edit');
    fact('4-delete', await L.pressRowAction(page, amp, 'Delete', errs));             // 4
    const list = await L.openSidebarList(app, page, ctx);                            // 5
    fact('5-sidebar-entry', list.filter((o) => o.value === amp));
    fact('5-save', await L.placeAndRead(page, [amp]));
    await snap(page, 'a13-5-sidebar');

    // A name typed in English only by a manager working in French
    await L.openPlugins(app, page);
    await L.changeLanguage(page, /^\s*français\s*$/i, 'fr_CA');                               // 6
    await L.openPlugins(app, page, 'fr_CA');                                         // 7
    await L.openManager(page);
    const before = (await L.managerRowsFull(page)).map((r) => r.name);
    const fr = await L.addBlock(page, 'Our Partners', 'Partner list');
    fact('7-add-in-french', fr);
    await snap(page, 'a4-7-added-fr');
    await L.openPlugins(app, page, 'fr_CA');                                         // (window closed)
    await L.changeLanguage(page, /^\s*English\s*$/, 'en');                                   // 8
    await L.openPlugins(app, page);
    mark = errs.length;
    const rows = await L.openManager(page);
    const fresh = rows.filter((r) => !before.includes(r.name));
    fact('8-list-en', {rows, newRows: fresh, scriptErrors: errs.slice(mark)});
    await snap(page, 'a4-8-list');
    const blank = fresh[0] ? fresh[0].name : '';
    const list2 = await L.openSidebarList(app, page, ctx);                           // 9
    fact('9-sidebar-entry', list2.filter((o) => o.value === blank));
    fact('9-save', await L.placeAndRead(page, [blank]));
    await snap(page, 'a4-9-sidebar');
    fact('scriptErrors-all', errs);
});
