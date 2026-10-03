// U08 A17 (not reproduced, 2026-10-03; no issue report): the entry's steps, walked through
// the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// With 3 s between "Yes" and the move off the page, no path raises the leave question and
// the window's `beforeunload` listener is gone; with `quick` (the register probe's timing)
// every path raises it, the drag too: the closed window keeps its listener ~450 ms
// (patterns.md "Probe kit"). The kit builds nothing; nothing is saved.
// Each path starts on Settings › Website › "Setup" › "Navigation" as `rvaca`:
//   area   (steps 3-7) "Add Menu", "Active Theme Navigation Areas" set to "user",
//          "Cancel", "Yes"; then the side menu's Settings › "Workflow"
//   title  the same with "Title" typed ("u08l menu") instead of the area
//   drag   the same with "About" dragged to "Assigned Menu Items" (the Vue window only)
//   none   "Add Menu", "Cancel" with nothing changed, then Settings › "Workflow"
// At each path it records what "Cancel" asked, whether the window closed, the menus
// table, the page's `beforeunload` listeners (read through the DevTools protocol, a
// diagnostic), and whether leaving raised the browser's leave question.
//   open   (a control) "Add Menu", the area set, then Settings › "Workflow" with the window open
// The first argument picks the paths (comma-separated); default `area,title,drag,none`.
// A second argument `quick` leaves at once after "Yes" instead of 3 s later: the timing of
// the register's own probe, whose next move followed the close within half a second.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08l --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u08l PROBE_AGENT=u08l node bin/probe.js all shared/playwright/checks/issues/discarded-menu-change-holds-page/walk.js [paths]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08l-3_5 PROBE_AGENT=u08l node bin/probe.js all shared/playwright/checks/issues/discarded-menu-change-holds-page/walk.js
// Facts:        .reports/<feature>/u08l/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const PATHS = (process.argv[2] || 'area,title,drag,none').split(',');
const QUICK = process.argv[3] === 'quick';

forEachApp(async (app) => {
    const {NavigationTab, MenuWindow} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log('[u08l]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    fact('line', app.line || 'main');
    fact('paths', PATHS);
    fact('quick', QUICK);

    // 1.
    await signIn(page, 'rvaca');
    const tab = new NavigationTab(page, app.contextPath, {locale: 'en'});

    for (const path of PATHS) {
        const f = {};
        // 2.
        await tab.goto();
        f.menusBefore = await L.menuTitles(tab);
        f.listenersOnTab = await L.unloadListeners(page);
        // 3.
        f.window = await L.openAddMenu(page, tab.addMenuLink);
        f.listenersWindowOpen = await L.unloadListeners(page);
        // 4: the change this path makes.
        try {
            if (path === 'area' || path === 'open') f.change = {area: await L.chooseArea(page, 'user')};
            else if (path === 'title') f.change = {title: await L.typeTitle(page, 'u08l menu')};
            else if (path === 'drag') {
                if (f.window !== 'vue') f.change = {skipped: 'the older window is not dragged here'};
                else {
                    const win = new MenuWindow(page);
                    await win.drag('unassigned', 'About', {panel: 'assigned'});
                    await L.sleep(500);
                    f.change = {assigned: await win.titles('assigned')};
                }
            } else f.change = null;
        } catch (e) {
            f.change = {error: L.flat(e.message, 200)};
        }
        await snap(page, `${path}-changed`);
        // 5-6 (the `open` control leaves with the window open).
        if (path !== 'open') {
            f.cancel = await L.cancelAndDiscard(page, dialogs, {wait: QUICK ? 0 : 3_000});
            if (!QUICK) {
                f.listenersAfterClose = await L.unloadListeners(page);
                f.menusAfter = await L.menuTitles(tab);
                await snap(page, `${path}-closed`);
            }
        }
        // 7.
        f.leave = await L.leaveToWorkflow(page, dialogs);
        fact(QUICK ? `${path}-quick` : path, f);
    }
    record(`screen-end`, await screen(page));
});
