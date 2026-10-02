// Issue report docs/issues/U08-A4-site-menu-window-opens-nothing.md (U08 A4):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps      (default) 1–3: as `admin`, a second journal (press, server) created on
//              Administration › Hosted Journals › "Create Journal"; 4: Site Settings ›
//              "Site Setup" › "Navigation"; 5: "Add Menu"; 6–7: reload, the title of
//              "User Navigation Menu". Each press read: did the window open, what covers the
//              page, does "Add item" still take a press, the script errors. Where the window
//              opens (3.5, or main with the fix), its areas are read, a menu "Site menu u08a"
//              is saved, and the existing menu's window is read and cancelled.
//   neighbour  (argument `neighbour`, runs alone): the journal's own Navigation tab
//              (publicknowledge › Settings › Website › "Setup" › "Navigation"): "Add Menu"
//              opens the window with the theme's areas; cancelled unsaved.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u08a PROBE_AGENT=u08a node bin/probe.js all shared/playwright/checks/issues/site-menu-window-opens-nothing/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08a-3_5 PROBE_AGENT=u08a node bin/probe.js all shared/playwright/checks/issues/site-menu-window-opens-nothing/walk.js
// Facts: .reports/<feature>/u08a/a4-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');
const {createContext, WORDS} = require('../all-dates-error-nothing-published/lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    const fact = (k, v) => { record('a4-facts', {[k]: v}, {merge: true}); console.log('[a4]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    await signIn(page, 'admin');

    if (MODE === 'neighbour') {
        // The journal's own tab: "Add Menu" opens the window with the theme's areas.
        const tab = await L.openNavigationTab(page, app, app.contextPath);
        const add = await L.pressAndRead(page, tab.addMenuLink, errs, {probe: tab.addItemLink});
        fact('nb-journal-add-menu', add);
        if (add.opened) {
            fact('nb-journal-add-window', await L.readWindow(page));
            await snap(page, 'a4-nb-journal-add');
            await L.cancelWindow(page);
        }
        const edit = await L.pressAndRead(page, tab.menuTitleLink('Primary Navigation Menu'), errs, {probe: tab.addItemLink});
        fact('nb-journal-edit-menu', edit);
        if (edit.opened) {
            fact('nb-journal-edit-window', await L.readWindow(page));
            await L.cancelWindow(page);
        }
        return;
    }

    // 2–3. A second journal (press, server), so the site's "Navigation" tab is offered.
    const W = WORDS[app.name];
    fact('step3-create', {status: await createContext(page, app, {name: `Second ${W.noun} u08a`, initials: 'u08a', path: 'u08a', email: 'u08a@mailinator.com'}), landed: page.url().replace(app.baseURL, '')});

    // 4. Site Settings › "Site Setup" › "Navigation".
    let tab = await L.openNavigationTab(page, app, 'index');
    fact('step4-menus', await tab.menus());
    await snap(page, 'a4-step4');

    // 5. "Add Menu".
    const add = await L.pressAndRead(page, tab.addMenuLink, errs, {probe: tab.addItemLink});
    fact('step5-add-menu', add);
    await snap(page, 'a4-step5');
    if (add.opened) {
        fact('step5-window', await L.readWindow(page));
        fact('step5-save', await L.saveWindow(page, 'Site menu u08a'));
        await L.sleep(600);
        fact('step5-menus-after', await tab.menus());
    }

    // 6. Reload, back to "Site Setup" › "Navigation".  7. The title of "User Navigation Menu".
    tab = await L.openNavigationTab(page, app, 'index');
    const edit = await L.pressAndRead(page, tab.menuTitleLink('User Navigation Menu'), errs, {probe: tab.addItemLink});
    fact('step7-edit-menu', edit);
    await snap(page, 'a4-step7');
    if (edit.opened) {
        fact('step7-window', await L.readWindow(page));
        await L.cancelWindow(page);
    }
});
