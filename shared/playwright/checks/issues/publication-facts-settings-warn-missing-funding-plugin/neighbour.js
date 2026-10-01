// Neighbour check for docs/issues/U13-OJS2-publication-facts-settings-warn-missing-funding-plugin.md:
// with the journal's funder metadata off, the label has no funding data, so
// the settings window must still warn (with the fix: about the "Funders"
// setting). Through the screens, on the default dataset: `dbarnes` unticks
// "Enable funder metadata" (Settings › Workflow › Submission › Metadata) and
// saves, ticks "Publication Facts Label plugin", opens its "Settings".
// Walked with the fix in and out (trial.sh). OJS main only (3.5 has no "Funders" setting).
// Run: PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs2 node bin/probe.js ojs <this file>
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openFundersSetting, turnFundersOff, openPflRow, enablePfl, readPflSettings} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] nb-${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    const failures = [];
    page.on('response', (r) => { if (r.status() >= 500) failures.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e.message).slice(0, 200)}`));
    try {
        await signIn(page, 'dbarnes');
        let box = await openFundersSetting(page, app);
        if (!box) throw new Error('no "Enable funder metadata" on this line');
        const status = await turnFundersOff(page, box);
        record('nb-01-funders-off', await screen(page)); await shot(page, 'nb-01-funders-off');
        box = await openFundersSetting(page, app);
        fact('funders-off', {saveStatus: status, tickedAfterReload: await box.isChecked()});
        const row = await openPflRow(page, app);
        fact('enable', await enablePfl(page, row));
        fact('settings-window', await readPflSettings(page, row, 'nb-02-settings-window'));
    } finally {
        fact('failures', failures);
        record('nb-facts', facts);
        await close();
    }
});
