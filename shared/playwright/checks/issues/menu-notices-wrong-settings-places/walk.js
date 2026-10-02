// Issue report docs/issues/U08-A6-A13-menu-notices-wrong-settings-places.md (U08 A6, A13):
// the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps      (default) 1-2: `rvaca`, Settings › Website › "Setup" › "Navigation";
//              3-8: "Primary Navigation Menu", the eye of "Privacy Statement", "Contact",
//              "About", the warning of "About", "Cancel"; 9: "Add item", type "About",
//              the line under the list; 10-11: Settings › Workflow › "Submission"'s
//              tabs and the side menu's "Settings" group; 12-13: where the settings are
//              (Website › "Setup" › "Privacy Statement", Journal/Press/Server › "Contact"
//              and "Masthead"'s "About the …" box).
//   neighbour  (argument `neighbour`, runs alone; main): every item's icon text in the
//              "Primary Navigation Menu" and "User Navigation Menu" windows, both panels,
//              as the icon's tooltip reads it, for the fix trial (`nb-in`, `nb-out`).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08f --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u08f PROBE_AGENT=u08f node bin/probe.js all shared/playwright/checks/issues/menu-notices-wrong-settings-places/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08f-3_5 PROBE_AGENT=u08f node bin/probe.js all shared/playwright/checks/issues/menu-notices-wrong-settings-places/walk.js
// Facts: .reports/<feature>/u08f/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';
const ABOUT = {ojs: 'About the Journal', omp: 'About the Press', ops: 'About the Server'};

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log('[u08f]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));

    // 1-2.
    await signIn(page, 'rvaca');
    const tab = new NavigationTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    fact('line', app.line || 'main');

    if (MODE === 'neighbour') {
        for (const menu of ['Primary Navigation Menu', 'User Navigation Menu']) {
            await L.openMenu(page, tab, menu);
            fact(`nb-${menu}`, {assigned: await L.panelTooltips(page, 'assigned'), unassigned: await L.panelTooltips(page, 'unassigned')});
            await L.cancelMenu(page);
        }
        fact('nb-type-descriptions', [await L.typeDescription(page, tab, 'Contact'), await L.typeDescription(page, tab, 'Announcements')]);
        return;
    }

    // 3-7.
    await L.openMenu(page, tab, 'Primary Navigation Menu');
    await snap(page, 'step3-menu-window');
    fact('step4-privacy', await L.readNotice(page, 'assigned', 'Privacy Statement', 'eye'));
    fact('step5-contact', await L.readNotice(page, 'assigned', 'Contact', 'eye'));
    fact('step6-about', await L.readNotice(page, 'assigned', 'About', 'eye'));
    fact('step7-about-warning', await L.readNotice(page, 'assigned', 'About', 'warning'));
    // 8.
    await L.cancelMenu(page);

    // 9.
    fact('step9-about-type', await L.typeDescription(page, tab, 'About'));

    // 10-11. Following the notices.
    fact('step10-workflow', await L.settingsTabs(page, app, 'workflow#submission'));
    await snap(page, 'step10-workflow-submission');
    fact('step11-side-menu', await L.sideMenu(page));

    // 12-13. Where the settings are.
    fact('step12-website-setup', await L.settingsTabs(page, app, 'website#setup/privacy'));
    await snap(page, 'step12-privacy');
    fact('step13-context', await L.settingsTabs(page, app, 'context#contact'));
    await snap(page, 'step13-contact');
    await L.settingsTabs(page, app, 'context#masthead');
    fact('step13-about-box', await L.labelsStarting(page, 'About the'));
    fact('expected-about-box', ABOUT[app.name]);
});
