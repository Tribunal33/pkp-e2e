// Neighbour check for fix.diff (U20 A2): the fix rewrites two English texts only. As rvaca, in the
// French interface (fr_CA, the dataset's second language), read "Google Analytics Plugin"'s description
// and its "Settings" window: they must stay as they were; and in English the row's name and the window's
// "Account number" label stay. Run it with the fix in and out (PROBE_RUN=nb-in / nb-out) and compare.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_RUN=nb-in PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'rvaca');
        await L.openPlugins(app, page);
        f.enable = await L.enable(app, page);
        await L.openPlugins(app, page);
        const en = await L.openSettings(app, page);
        f.en = {row: (await L.row(app, page)).text, label: en.label, title: en.title};
        await L.openPlugins(app, page, 'fr_CA');
        f.fr = {row: await L.row(app, page)};
        f.fr.window = await L.openSettings(app, page, 'Paramètres');
        f.fr.screen = await L.snap(page, 'nb-fr-settings-window');
    } catch (e) {
        f.error = L.flat(e.stack, 900);
        await L.snap(page, 'nb-error').catch(() => {});
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
