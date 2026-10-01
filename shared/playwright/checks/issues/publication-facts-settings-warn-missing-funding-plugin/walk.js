// Issue report walk: docs/issues/U13-OJS2-publication-facts-settings-warn-missing-funding-plugin.md
// (spec U13 register OJS2). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens:
//   1. `dbarnes` signs in;
//   2. reads "Funders" under Settings › Workflow › Submission › Metadata (absent on 3.5);
//   3. ticks "Publication Facts Label plugin" (Settings › Website › Plugins);
//   4. opens the plugin's "Settings" and reads the window's warning.
// The kit builds nothing. OJS only (the plugin is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs2 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-warn-missing-funding-plugin/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset --apps ojs
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13ojs2 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file. Neighbour: neighbour.js.
// Facts: .reports/<feature>/u13ojs2/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openFundersSetting, openPflRow, enablePfl, readPflSettings} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const {page, close} = await launch(app);
    const failures = [];
    page.on('response', (r) => { if (r.status() >= 500) failures.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e.message).slice(0, 200)}`));
    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Settings › Workflow › Submission › Metadata: "Funders".
        const box = await openFundersSetting(page, app);
        record('02-metadata', await screen(page)); await shot(page, '02-metadata');
        fact('2-funders', box ? {present: true, enableFunderMetadataTicked: await box.isChecked()} : {present: false});

        // 3. Settings › Website › Plugins: tick "Publication Facts Label plugin".
        const row = await openPflRow(page, app);
        const en = await enablePfl(page, row);
        record('03-plugin-enabled', await screen(page)); await shot(page, '03-plugin-enabled');
        fact('3-enable', en);

        // 4. The plugin's "Settings".
        fact('4-settings-window', await readPflSettings(page, row, '04-settings-window'));
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
