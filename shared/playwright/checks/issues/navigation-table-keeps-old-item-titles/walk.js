// Issue report docs/issues/U08-A15-navigation-table-keeps-old-item-titles.md (U08 A15):
// the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing in `steps`.
//   steps      (default) the report's numbering: 1-3: `rvaca`, Settings › Website › "Setup" ›
//              "Navigation", the "Primary Navigation Menu" cell; 4-6: "Contact" renamed
//              "Reach us", the cell; 7-8: "About" removed, the cell; 9: a reload, the cell.
//   neighbour  (argument `neighbour`, runs alone; main, for the fix trial `nb-in`/`nb-out`):
//              a refused item save ("Privacy Statement" with its "Title" emptied) reloads
//              nothing; a saved one ("Submissions" renamed "Submit u08j") and then the
//              reloaded table's own controls: the menu's title opens its window, which lists
//              the new title; then the site's own Navigation tab (`admin`, Administration ›
//              Site Settings › "Setup" › "Navigation", which shows only once a second
//              context exists, so the kit adds one through the `_test` API, tag u08j): its
//              first menu's first item renamed, its cell read before a reload.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08j --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u08j PROBE_AGENT=u08j node bin/probe.js all shared/playwright/checks/issues/navigation-table-keeps-old-item-titles/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08j-3_5 PROBE_AGENT=u08j node bin/probe.js all shared/playwright/checks/issues/navigation-table-keeps-old-item-titles/walk.js
// Facts: .reports/<feature>/u08j/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, tag} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';
const MENU = 'Primary Navigation Menu';

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log('[u08j]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    fact('line', app.line || 'main');

    // 1-2.
    await signIn(page, 'rvaca');
    const tab = new NavigationTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();

    if (MODE === 'neighbour') {
        // A refused save: the window stays, nothing reloads.
        let fetches = L.menusGridFetches(page);
        const refused = await L.renameItem(page, tab, 'Privacy Statement', '', {close: true});
        fetches.stop();
        fact('nb-refused', {...refused, menusGridFetches: fetches.list(), cell: await L.cell(tab, MENU)});
        await page.goto('about:blank');
        await tab.goto();
        // A saved one, then the redrawn table's own controls.
        fetches = L.menusGridFetches(page);
        const saved = await L.renameItem(page, tab, 'Submissions', 'Submit u08j');
        fetches.stop();
        fact('nb-saved', {...saved, menusGridFetches: fetches.list(), cell: await L.cell(tab, MENU)});
        fact('nb-menu-window', await L.menuWindowAssigned(page, tab, MENU));
        await snap(page, 'nb-journal-tab');
        await signOut(page).catch(() => {});

        // The site's own tab (needs a second context to show).
        const scratch = tag('u08j');
        await app.api.createContext({tag: scratch, users: [{username: `${scratch}mgr`, roles: ['manager']}]}).catch((e) => fact('nb-site-context', {error: L.flat(e.message, 200)}));
        fact('nb-site-context', {tag: scratch});
        await signIn(page, 'admin');
        const site = new NavigationTab(page, 'index', {locale: 'en'});
        try {
            await site.goto();
        } catch (e) {
            fact('nb-site', {error: L.flat(e.message, 200)});
            return;
        }
        const menus = await site.menus();
        const first = menus.find((m) => m.items);
        fact('nb-site-before', {menus});
        if (!first) return;
        const item = first.items.split(', ')[0];
        fetches = L.menusGridFetches(page);
        const siteSaved = await L.renameItem(page, site, item, `${item} u08j`);
        fetches.stop();
        fact('nb-site-saved', {menu: first.title, ...siteSaved, menusGridFetches: fetches.list(), cell: await L.cell(site, first.title)});
        await snap(page, 'nb-site-tab');
        return;
    }

    // 3.
    fact('step3-cell', await L.cell(tab, MENU));
    await snap(page, 'step3');

    // 4-6: "Contact" renamed "Reach us".
    let fetches = L.menusGridFetches(page);
    fact('step4-5-rename', await L.renameItem(page, tab, 'Contact', 'Reach us'));
    fetches.stop();
    fact('step5-items-table', await tab.rowTitles('items').catch(() => null));
    fact('step6-cell', {...(await L.cell(tab, MENU)), menusGridFetches: fetches.list()});
    await snap(page, 'step6');

    // 7-8: "About" removed.
    fetches = L.menusGridFetches(page);
    fact('step7-remove', await L.removeItem(page, tab, 'About'));
    fetches.stop();
    fact('step8-cell', {...(await L.cell(tab, MENU)), menusGridFetches: fetches.list()});
    await snap(page, 'step8');

    // 9: a reload (a fresh load: `goto` to the same address with a hash would not reload).
    await page.goto('about:blank');
    await tab.goto();
    fact('step9-cell', await L.cell(tab, MENU));
    await snap(page, 'step9');
});
