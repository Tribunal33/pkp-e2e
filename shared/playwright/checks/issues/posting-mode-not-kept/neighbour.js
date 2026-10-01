// Neighbour check of docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md (U51 OPS1, U08 OPS2) {OPS}:
// the "Access" tab's other setting, "Enable OAI", must still save and be kept once "Posting Mode" leaves the
// form, and the server must go on posting. Walked with the fix in and out, on PKP's default test dataset.
//
//   N1   dbarnes: Settings › Distribution › "Access": the fields and "Enable OAI" as the tab opens
//   N2   "Enable OAI": "Disable", "Save"; the page loaded again: "Disable" selected
//   N3   "Enable OAI": "Enable", "Save"; the page loaded again: "Enable" selected
//   N4   signed out: the home page's header, "Archives", preprint 9 and its "PDF" (the server posts)
//
// Reset first:  npm run fleet-prep -- --feature issues-sb11 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-sb11 PROBE_AGENT=sb11 node bin/probe.js ops shared/playwright/checks/issues/posting-mode-not-kept/neighbour.js
const {forEachApp, launch, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    try {
        await L.signIn(page, 'dbarnes');
        await L.openAccessTab(page, app);
        fact('N1 fields', await L.tabFields(page));
        fact('N1 Enable OAI', await L.oai(page));
        record('N1-access', await screen(page));
        fact('N2 Disable, Save', await L.saveOai(page, 'Disable'));
        await L.openAccessTab(page, app);
        fact('N2 after a reload', await L.oai(page));
        fact('N3 Enable, Save', await L.saveOai(page, 'Enable'));
        await L.openAccessTab(page, app);
        fact('N3 after a reload', await L.oai(page));
        await L.signOut(page);
        fact('N4 visitor', await L.readerTour(page, app));
    } finally {
        facts.failures = failures;
        console.log(`[fact] failures: ${JSON.stringify(failures)}`);
        record('neighbour-facts', facts);
        await close();
    }
});
