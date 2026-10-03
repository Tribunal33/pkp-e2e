// Issue report docs/issues/U08-A16-menu-window-without-items-says-all-assigned.md (U08 A16):
// the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps      (default) 1-2: `rvaca`, Settings › Website › "Setup" › "Navigation";
//              3-4: every row of "Navigation Menu Items" removed ("Remove", "OK");
//              5-6: "Add Menu", both panels read; then "Cancel".
//   neighbour  (argument `neighbour`, runs alone; for the fix trial `nb-in`/`nb-out`):
//              every item removed but "Contact"; "Add Menu", both panels read (the item on
//              the right, the left's "No items assigned…"); "Contact" dragged to the left,
//              both panels read again (the right's "All items have been assigned."). The
//              drag is the Vue window's, so this mode is for `main`.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08k --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u08k PROBE_AGENT=u08k node bin/probe.js all shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08k-3_5 PROBE_AGENT=u08k node bin/probe.js all shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/walk.js
// Facts: .reports/<feature>/u08k/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    const {NavigationTab, MenuWindow} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log('[u08k]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    fact('line', app.line || 'main');
    fact('mode', MODE);

    // 1-2.
    await signIn(page, 'rvaca');
    const tab = new NavigationTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    fact('items-before', await tab.rowTitles('items').catch((e) => `read failed: ${L.flat(e.message, 120)}`));

    // 3-4 (the neighbour keeps "Contact").
    const keep = MODE === 'neighbour' ? ['Contact'] : [];
    fact('step3-4-removal', await L.removeItemsExcept(page, tab, keep));
    await snap(page, `${MODE}-items-removed`);

    // 5-6.
    fact('step5-window', await L.openMenuWindow(page, tab.addMenuLink));
    fact('step6-panels', await L.readPanels(page));
    await snap(page, `${MODE}-add-menu`);

    if (MODE === 'neighbour') {
        // "Contact" dragged to "Assigned Menu Items".
        try {
            await new MenuWindow(page).drag('unassigned', 'Contact', {panel: 'assigned'});
            await L.sleep(500);
        } catch (e) {
            fact('nb-drag', {error: L.flat(e.message, 200)});
        }
        fact('nb-panels-after-drag', await L.readPanels(page));
        await snap(page, 'neighbour-after-drag');
    }
    await L.closeMenuWindow(page);
});
