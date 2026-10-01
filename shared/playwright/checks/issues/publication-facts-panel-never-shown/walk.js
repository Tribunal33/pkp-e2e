// Issue report docs/issues/U13-OJS5-publication-facts-panel-never-shown.md
// (U13 OJS5): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1-2. rvaca ticks "Publication Facts Label plugin" (Settings › Website ›
//        Plugins)
//   3.   log out
//   4-5. article 1's page, article 17's page
//   control (the fix's neighbour): the journal's home page, which the
//        plugin must leave alone, read in every run (fix in and out)
// `stats` as the script's argument adds a second reading of the same
// pages through a stand-in for the plugin's outside service (lib.js
// startStatsStandIn): the test installs cannot reach pkp.sfu.ca, where the
// panel's "other journals" figures come from, so without it the side-column
// hook stops at that fetch on every version. The stand-in serves pkp.sfu.ca's
// own answer of 2026-10-01 (STATS below) from the plugin's cache entry.
// Each page records the panel (`section.pflPlugin`), the plugin's script
// and label preload in the page, the plugin files the browser fetched,
// and the plugin's failures the server logged during the walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir6-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir6-3_5 PROBE_AGENT=ir6 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js
//               (append `stats` to a run for the stand-in reading after the
//               steps, or `stats-only` with its own PROBE_RUN for that reading
//               alone on a fleet the steps already ran on)
// Facts: .reports/<feature>/ir6/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, shot, record, outDir} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {flat, readPublicPage, logMark, logSince, startStatsStandIn, standInLog} = require('./lib');

const STATS_ONLY = process.argv.includes('stats-only');
const STATS_MODE = STATS_ONLY || process.argv.includes('stats');
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
    ['article 1', '/article/view/1'],
    ['article 17', '/article/view/17'],
    ['home page (control)', ''],
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: [], pages: [], standIn: null};
    const mark = logMark(app);
    let standIn = null;
    try {
        // Steps 1-3.
        if (!STATS_ONLY) {
            await signIn(page, 'rvaca');
            facts.steps.push({step: 2, ...(await enablePlugin(page, app, 'pflplugin'))});
            await signOut(page);
        }
        // Steps 4-5, then the control.
        for (const [label, p] of STATS_ONLY ? [] : PAGES) {
            facts.pages.push(await readPublicPage(page, app, p, label));
            await shot(page, label.replace(/\W+/g, '-')).catch(() => {});
        }
        if (STATS_MODE) {
            standIn = await startStatsStandIn(app, outDir(), STATS);
            facts.standIn = {origin: standIn.origin, entry: standIn.entry, configFile: standIn.configFile, logFile: standIn.logFile};
            for (const [label, p] of PAGES) {
                facts.pages.push(await readPublicPage(page, app, p, `${label} [stats stand-in]`, standIn.origin));
                await shot(page, `stats-${label.replace(/\W+/g, '-')}`).catch(() => {});
            }
        }
    } finally {
        if (standIn) {
            standIn.stop();
            facts.standIn.log = standInLog(standIn.logFile);
        }
        facts.serverLog = logSince(app, mark);
        record('facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 300));
        for (const p of facts.pages) {
            console.log(
                `${p.label} ${p.status} section ${p.pflSection} element ${p.pflElement} script ${p.pflScriptTag} preload ${p.pflLocalePreload} "Publication Facts" ${p.publicationFactsTextOnPage}`,
                flat(JSON.stringify(p.pflFetched), 300),
                p.panelText ? `panel: ${flat(p.panelText, 300)}` : '',
                p.panelTextExpanded ? `expanded (${p.expanded}): ${flat(p.panelTextExpanded, 900)}` : '',
            );
        }
        console.log(`server log (${facts.serverLog.path}): ${facts.serverLog.failures.length} plugin failures`);
        for (const f of facts.serverLog.failures.slice(0, 8)) console.log('  ', f.line.slice(0, 200), '|', f.error.slice(0, 250));
        for (const l of (facts.serverLog.other || []).slice(0, 5)) console.log('  other:', l.slice(0, 300));
        if (facts.standIn && facts.standIn.log) {
            console.log(`stand-in log (${facts.standIn.logFile}): ${facts.standIn.log.failures.length} plugin failures`);
            for (const f of facts.standIn.log.failures.slice(0, 6)) console.log('  ', f.line.slice(0, 200), '|', f.error.slice(0, 250));
            for (const l of (facts.standIn.log.other || []).slice(0, 5)) console.log('  other:', l.slice(0, 300));
        }
        await close();
    }
});
