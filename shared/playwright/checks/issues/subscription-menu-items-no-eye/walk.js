// Issue report docs/issues/U08-OJS1-subscription-menu-items-no-eye.md (U08 OJS1): the menu
// window marks neither "Subscriptions" nor "My Subscriptions" with the crossed-out eye.
// The report's Steps, on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"); the kit builds nothing.
//   steps      (default; OJS, the only app with the two types) 1-2: `rvaca`, Settings ›
//              Website › "Setup" › "Navigation"; 3-4: "Add item" "Subscriptions u08q"
//              (type "Subscriptions") and "My Subscriptions u08q" (type "My
//              Subscriptions"); 5: "Primary Navigation Menu"; 6: the two items' icons in
//              "Unassigned Menu Items" (and their eye's "Notice" where there is one);
//              7: the eye of "Announcements" (control); 8: "Cancel".
//   neighbour  (argument `neighbour`, runs alone; all three apps; changes nothing): every
//              item's icons in both panels of the "Primary Navigation Menu" and "User
//              Navigation Menu" windows, for the fix trial (`nb-in`, `nb-out`).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-menu-items-no-eye/walk.js
//               PROBE_FEATURE=<feature> PROBE_AGENT=<id> PROBE_RUN=nb-out node bin/probe.js all shared/playwright/checks/issues/subscription-menu-items-no-eye/walk.js neighbour
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-menu-items-no-eye/walk.js
// Facts: .reports/<feature>/<id>/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';
const SUBS = 'Subscriptions u08q';
const MYSUBS = 'My Subscriptions u08q';

forEachApp(async (app) => {
    if (MODE === 'steps' && app.name !== 'ojs') return;
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log('[u08q]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        // 1-2.
        await signIn(page, 'rvaca');
        const tab = new NavigationTab(page, app.contextPath, {locale: 'en'});
        await tab.goto();
        fact('line', app.line || 'main');
        fact('mode', MODE);

        if (MODE === 'neighbour') {
            for (const menu of ['Primary Navigation Menu', 'User Navigation Menu']) {
                await L.openMenu(page, tab, menu);
                fact(`nb-${menu}`, {assigned: await L.panelIcons(page, 'assigned'), unassigned: await L.panelIcons(page, 'unassigned')});
                await L.cancelMenu(page);
            }
            return;
        }

        // 3-4.
        fact('step3-add-subscriptions', await L.addItem(page, tab, 'Subscriptions', SUBS));
        fact('step4-add-my-subscriptions', await L.addItem(page, tab, 'My Subscriptions', MYSUBS));
        fact('items-table', await tab.rowTitles('items').catch((e) => `unread: ${e.message}`));

        // 5.
        await L.openMenu(page, tab, 'Primary Navigation Menu');
        await snap(page, 'step5-menu-window');

        // 6.
        const unassigned = await L.panelIcons(page, 'unassigned');
        fact('step6-unassigned', unassigned);
        fact('step6-new-items', unassigned.filter((i) => i.title === SUBS || i.title === MYSUBS));
        fact('step6-subscriptions-notice', await L.readNotice(page, 'unassigned', SUBS, 'eye'));
        fact('step6-my-subscriptions-notice', await L.readNotice(page, 'unassigned', MYSUBS, 'eye'));

        // 7. Control.
        fact('step7-assigned', await L.panelIcons(page, 'assigned'));
        fact('step7-announcements-notice', await L.readNotice(page, 'assigned', 'Announcements', 'eye'));

        // 8.
        await L.cancelMenu(page);
    } finally {
        await close();
    }
});
