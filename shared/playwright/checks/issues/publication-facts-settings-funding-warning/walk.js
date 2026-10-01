// Issue report docs/issues/U13-OJS2-publication-facts-settings-funding-warning.md
// (U13 OJS2): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: Settings › Workflow › Submission › "Metadata", "Funders" read
//   1.   sign in as rvaca
//   2.   Settings › Website › "Plugins": tick "Publication Facts Label plugin"
//   3.   the row's arrow, "Settings": the window's text read
// `ok` as an argument presses the window's "OK" after step 3 (the save
// still works with the warning shown).
// `funders-off` as an argument adds steps 4-5 of the report: untick
//   "Enable funder metadata", "Save", and open the plugin's "Settings"
//   again (a warning that funding data will not show belongs there; with
//   the fix it is "Funder Metadata Not Enabled"), then tick it back and
//   "Save". It also checks that the fix reaches no further than it should.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir14 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-ir14 PROBE_AGENT=ir14 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-funding-warning/walk.js [ok] [funders-off]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir14-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir14-3_5 PROBE_AGENT=ir14 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-funding-warning/walk.js
// Facts: .reports/<feature>/ir14/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {flat, readFunders, setFunders, openPflSettings, okPflSettings} = require('./lib');

const FUNDERS_OFF = process.argv.includes('funders-off');
const OK = process.argv.includes('ok');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: []};
    try {
        await signIn(page, 'rvaca'); // step 1 (the precondition is read as rvaca)
        facts.steps.push({step: 'precondition', ...(await readFunders(page, app))});
        facts.steps.push({step: 2, ...(await enablePlugin(page, app, 'pflplugin'))});
        facts.steps.push({step: 3, ...(await openPflSettings(page, app))});
        if (OK) facts.steps.push({step: '3 OK', ...(await okPflSettings(page))});
        if (FUNDERS_OFF) {
            facts.steps.push({step: '4 untick funder metadata, Save', ...(await setFunders(page, app, false))});
            facts.steps.push({step: '4 funders after save', ...(await readFunders(page, app))});
            facts.steps.push({step: '5 settings window, funder metadata off', ...(await openPflSettings(page, app, 'pfl-settings-funders-off'))});
            facts.steps.push({step: 'after: tick funder metadata back', ...(await setFunders(page, app, true))});
        }
        await signOut(page);
    } finally {
        record('facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 900));
        await close();
    }
});
