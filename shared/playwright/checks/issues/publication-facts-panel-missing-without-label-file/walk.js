// Issue report docs/issues/U13-OJS3-publication-facts-panel-missing-without-label-file.md
// (U13 OJS3): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1-2. rvaca ticks "Publication Facts Label plugin" (Settings › Website ›
//        Plugins)
//   3.   log out
//   4-5. article 1's page in English   (/en/article/view/1), the box expanded
//   6.   article 1's page in French    (/fr_CA/article/view/1)
//   neighbour of the fix: the English page again after the French one, and
//        the journal's French home page, which the plugin leaves alone
// The pages are read through the stand-in for the plugin's outside service
// (../publication-facts-panel-never-shown/lib.js startStatsStandIn): the
// test installs cannot reach pkp.sfu.ca, where the panel's "other journals"
// figures come from, so without it the panel's hook stops at that fetch.
// The stand-in is a second PHP server on the same code and database whose
// cache holds pkp.sfu.ca's own answer of 2026-10-01 (STATS below).
// On `main` the panel shows only with pkp-e2e#211's fix applied
// (../publication-facts-panel-never-shown/fix.diff; fix.diff beside this script is
// this report's fix, and fix-both-for-walk-only.diff the two together, since
// bin/try-fix.js applies one diff at a time).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir20 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-ir20 PROBE_AGENT=ir20 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir20-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir20-3_5 PROBE_AGENT=ir20 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/walk.js
// Facts: .reports/<feature>/ir20/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, record, outDir} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {flat, startStatsStandIn, standInLog} = require('../publication-facts-panel-never-shown/lib');
const {readPanel} = require('./lib');

// https://pkp.sfu.ca/ojs/pflStatistics.json?version=1.2.1.4&platform=ojs, 2026-10-01.
const STATS = {
    pflNumAcceptedClass: 33,
    pflReviewerCountClass: 2.4,
    pflCompetingInterestsPercentClass: 11,
    pflDataAvailabilityPercentClass: 16,
    pflNumHaveFundersClass: 32,
    pflDaysToPublicationClass: 145,
};
const PAGES = [
    ['steps 4-5 article 1 English', '/en/article/view/1'],
    ['step 6 article 1 French', '/fr_CA/article/view/1'],
    ['neighbour article 1 English again', '/en/article/view/1'],
    ['neighbour French home page', '/fr_CA'],
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: [], pages: [], standIn: null};
    let standIn = null;
    try {
        await signIn(page, 'rvaca');
        facts.steps.push({step: 2, ...(await enablePlugin(page, app, 'pflplugin'))});
        await signOut(page);
        standIn = await startStatsStandIn(app, outDir(), STATS);
        facts.standIn = {origin: standIn.origin, entry: standIn.entry, logFile: standIn.logFile};
        for (const [label, p] of PAGES) facts.pages.push(await readPanel(page, app, p, label, standIn.origin));
    } finally {
        if (standIn) {
            standIn.stop();
            facts.standIn.log = standInLog(standIn.logFile);
        }
        record('facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 300));
        for (const p of facts.pages) {
            console.log(
                `${p.label}: ${p.status} lang ${p.htmlLang} section ${p.pflSection} element ${p.pflElement} preload ${p.preload}`,
                p.panel ? `| box ${p.panel.width}x${p.panel.height}, shadow children ${p.panel.shadowChildren}, button "${p.panel.button}"` : '',
                p.expanded ? `| expanded: ${flat(p.expanded, 700)}` : '',
                `| files ${JSON.stringify(p.files)}`,
                `| console ${JSON.stringify(p.console)}`,
            );
        }
        if (facts.standIn && facts.standIn.log) {
            console.log(`stand-in log: ${facts.standIn.log.failures.length} plugin failures`);
            for (const f of facts.standIn.log.failures.slice(0, 6)) console.log('  ', f.line.slice(0, 200), '|', f.error.slice(0, 250));
            for (const l of (facts.standIn.log.other || []).slice(0, 5)) console.log('  other:', l.slice(0, 300));
        }
        await close();
    }
});
