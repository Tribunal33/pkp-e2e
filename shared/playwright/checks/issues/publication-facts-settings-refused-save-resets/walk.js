// Issue report docs/issues/U13-OJS7-publication-facts-settings-refused-save-resets.md
// (U13 OJS7): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1.   sign in as rvaca
//   2.   Settings › Website › "Plugins": tick "Publication Facts Label plugin"
//   3.   the row's arrow, "Settings": the fields read
//   4–7. "Society name or acronym", "URL", "Start Date", "Google Scholar",
//        a Scopus "URL" in the wrong form
//   8.   "OK": the message and the fields read
// `neighbour` as the script's argument adds the fix's neighbour check:
//   9.   every field filled again as in steps 4–6, with a Scopus address
//        of the right form, "OK" (saved, the window closes)
//   10.  "Settings" again: a fresh opening shows the stored values
//
// Reset first:  npm run fleet-prep -- --feature issues-ir16 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-ir16 PROBE_AGENT=ir16 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir16-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir16-3_5 PROBE_AGENT=ir16 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/walk.js
// Facts: .reports/<feature>/ir16/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {flat, openPflSettings} = require('../publication-facts-settings-funding-warning/lib');
const {readPflFields, fillPflFields, pressOk} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const TYPED = {
    society: 'u13ir16 Society',
    societyUrl: 'https://example.org/u13ir16',
    startDate: '2020-01-01',
    scholar: true,
};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: []};
    try {
        await signIn(page, 'rvaca'); // step 1
        facts.steps.push({step: 2, ...(await enablePlugin(page, app, 'pflplugin'))});
        const opened = await openPflSettings(page, app, 'pfl-settings-opened');
        facts.steps.push({step: 3, title: opened.title, fields: await readPflFields(page)});
        facts.steps.push({step: '4-7 typed', fields: await fillPflFields(page, {...TYPED, scopusUrl: 'https://example.org/u13ir16-scopus'})});
        facts.steps.push({step: 8, ...(await pressOk(page, 'pfl-settings-after-refused-ok'))});
        if (NEIGHBOUR) {
            // Step 9: whatever the window now shows, fill it as in steps 4–6 with a valid Scopus address.
            facts.steps.push({step: '9 typed', fields: await fillPflFields(page, {...TYPED, scopusUrl: 'https://www.scopus.com/sourceid/12345'})});
            facts.steps.push({step: '9 ok', ...(await pressOk(page, 'pfl-settings-after-valid-ok'))});
            await openPflSettings(page, app, 'pfl-settings-reopened');
            facts.steps.push({step: '10 reopened', fields: await readPflFields(page)});
        }
        await signOut(page);
    } finally {
        record('facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 1200));
        await close();
    }
});
