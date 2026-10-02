// U62 A9 walk, on PKP's default test dataset (a freshly reset install).
//   steps (no argument): admin, in the context's Settings Wizard › "Users", gives
//     itself "Reader" and takes away the manager role; signs in again; in the wizard's
//     "Plugins" ticks "Google Analytics Plugin" and unticks "Web Feed Plugin" ("OK" in
//     "Disable"; "Cancel" when the window stays open); reloads and reads both boxes.
//   neighbour (argument `neighbour`): admin keeps the manager role; the same tick and
//     untick in the wizard switch both plugins, with the enabled and disabled notices.
//     Then rvaca (the manager) deletes a component the dataset's files carry (Settings ›
//     Workflow › Submission › Components, "Delete", "OK"): another refused confirmation
//     window (spec U58 A12), read with the fix in and out.
//   dismiss (argument `dismiss`): rvaca's refused component delete, then Escape and a click
//     outside the stuck window; then admin takes away its manager role (steps 6-10) and
//     reads the journal dashboard's side menu (is there a link to Settings › Website?).
//   PROBE_FEATURE=issues-g6 PROBE_AGENT=g6 node bin/probe.js all shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, record, screen, serverLog} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv.slice(2).find((a) => a === 'neighbour' || a === 'dismiss') || 'steps';
const R = (n) => `g6-${mode}-${n}`;

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode};
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await (d.type() === 'beforeunload' ? d.accept() : d.accept()).catch(() => {});
    });
    const log = serverLog(app);
    const from = log.mark();
    try {
        if (mode === 'dismiss') {
            await signIn(page, 'rvaca');
            try { facts.dismiss = await H.componentDismiss(page, app, {dialogs}); } catch (e) { facts.dismissError = H.flat(e.message, 500); }
            record(R('01-after-dismiss'), await screen(page));
            await signOut(page);
            await signIn(page, 'admin');
            const hosted = await H.openWizard(page, app);
            try { facts.swap = await H.swapAdminRole(page, hosted, {add: 'Reader', remove: c.manager}); } catch (e) { facts.swapError = H.flat(e.message, 500); }
            await signOut(page);
            await signIn(page, 'admin');
            try { facts.sideMenu = await H.sideMenu(page, app); } catch (e) { facts.sideMenuError = H.flat(e.message, 500); }
            record(R('02-dashboard-menu'), await screen(page));
            return;
        }
        await signIn(page, 'admin');
        if (mode === 'steps') {
            const hosted = await H.openWizard(page, app);
            try {
                facts.swap = await H.swapAdminRole(page, hosted, {add: 'Reader', remove: c.manager});
            } catch (e) {
                facts.swapError = H.flat(e.message, 500);
            }
            record(R('01-users-after-swap'), await screen(page));
            await signOut(page);
            await signIn(page, 'admin');
        }
        await H.openWizard(page, app);
        await H.openPluginsTab(page);
        record(R('02-plugins'), await screen(page));
        try {
            facts.tick = await H.pressBox(page, 'googleanalyticsplugin', {dialogs});
        } catch (e) {
            facts.tickError = H.flat(e.message, 500);
        }
        record(R('03-after-tick'), await screen(page));
        try {
            facts.untick = await H.pressBox(page, 'webfeedplugin', {answer: 'OK', dialogs});
        } catch (e) {
            facts.untickError = H.flat(e.message, 500);
        }
        record(R('04-after-untick'), await screen(page));
        await page.reload();
        await page.getByRole('tab').first().waitFor({timeout: H.T});
        await H.openPluginsTab(page);
        facts.afterReload = {
            googleanalyticsplugin: await H.rowLoc(page, 'googleanalyticsplugin').locator('input[type=checkbox]').first().isChecked().catch(() => null),
            webfeedplugin: await H.rowLoc(page, 'webfeedplugin').locator('input[type=checkbox]').first().isChecked().catch(() => null),
        };
        record(R('05-after-reload'), await screen(page));
        if (mode === 'neighbour') {
            await signOut(page);
            await signIn(page, 'rvaca');
            try {
                facts.component = await H.componentRefusal(page, app, {dialogs});
            } catch (e) {
                facts.componentError = H.flat(e.message, 500);
            }
            record(R('06-component-after'), await screen(page));
        }
    } finally {
        facts.dialogs = dialogs;
        facts.serverLog = log.since(from).filter((l) => !/pkp\.sfu\.ca|PluginGalleryDAO|plugin-gallery-grid/.test(l));
        record(R('facts'), facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
