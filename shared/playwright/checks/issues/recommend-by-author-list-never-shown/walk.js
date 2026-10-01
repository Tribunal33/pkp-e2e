// Issue report docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md
// (U13 OJS4): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1. rvaca ticks "Recommend Articles by Author" (Settings › Website ›
//      Plugins)
//   2-4. dbarnes adds the contributor "Vajiheh Karbasizaed" (the
//      contributor of published article 17) to submission 5 "Genetic
//      transformation of forest trees" (Production) and publishes it in
//      "Vol. 1 No. 2 (2014)"
//   5-6. signed out: article 17's page, article 5's page
//   control: article 1's page (no other article by its contributors)
// Neighbour (`neighbour` as the script's argument, walked with the fix in
// and out): the same, plus the same contributor added to submission 6
// (Production) published with "Don't Assign To An Issue", and to
// submission 9 (Production) left unpublished. Article 17 must list 5 and 6
// (6 without an issue link) and never 9; article 1 still lists nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir4 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir4 PROBE_AGENT=ir4 node bin/probe.js ojs shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir4-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir4-3_5 PROBE_AGENT=ir4 node bin/probe.js ojs shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js
// Facts: .reports/<feature>/ir4/facts[-<run>]-ojs.json (neighbour[-<run>]-ojs.json)
const {forEachApp, launch, signIn, signOut, shot, record} = require('../../../probe');
const {flat, enablePlugin, addContributor, publish, readArticle, logMark, logSince} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const PERSON = {given: 'Vajiheh', family: 'Karbasizaed', email: 'u13ir4@mailinator.com', country: 'Canada'};
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, steps: [], articles: []};
    const mark = logMark(app);
    try {
        // Step 1.
        await signIn(page, 'rvaca');
        facts.steps.push({step: 1, ...(await enablePlugin(page, app, 'recommendbyauthorplugin'))});
        await signOut(page);
        // Steps 2-4.
        await signIn(page, 'dbarnes');
        facts.steps.push({step: 3, ...(await addContributor(page, app, 5, PERSON))});
        facts.steps.push({step: 4, ...(await publish(page, app, 5, ISSUE))});
        if (NEIGHBOUR) {
            facts.steps.push({step: 'n1', ...(await addContributor(page, app, 6, PERSON))});
            facts.steps.push({step: 'n2', ...(await publish(page, app, 6, null))});
            facts.steps.push({step: 'n3', ...(await addContributor(page, app, 9, PERSON))});
        }
        await signOut(page);
        // Steps 5-6 and the control.
        for (const id of NEIGHBOUR ? [17, 5, 6, 1] : [17, 5, 1]) {
            const r = await readArticle(page, app, id);
            facts.articles.push(r);
            await shot(page, `article-${id}${NEIGHBOUR ? '-neighbour' : ''}`).catch(() => {});
        }
    } finally {
        facts.serverLog = logSince(app, mark);
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 300));
        for (const a of facts.articles) {
            console.log(`article ${a.articleId} ${a.status} section ${a.sectionCount} heading ${a.headingOnPage}`, flat(JSON.stringify(a.items || []), 500));
        }
        console.log(`server log (${facts.serverLog.path}): ${facts.serverLog.lines.length} lines`);
        for (const l of facts.serverLog.lines.slice(0, 12)) console.log('  ', l.slice(0, 400));
        await close();
    }
});
