// Issue report docs/issues/U13-OJS10-similar-articles-list-never-shown.md
// (U13 OJS10): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1. rvaca ticks "Recommend Similar Articles" (Settings › Website › Plugins)
//   2-4. dbarnes gives submission 5 "Genetic transformation of forest trees"
//      (Production) the keywords of published article 1 "Signalling Theory
//      Dividends" ("Professional Development", "Social Transformation") and
//      publishes it in "Vol. 1 No. 2 (2014)"
//   5-6. signed out: article 1's page, article 5's page
//   control: article 17's page (no keywords)
// Neighbour (`neighbour` as the script's argument, walked with the fix in
// and out): the same, plus
//   n1 submission 6 (Production): the same two keywords, published with
//      "Don't Assign To An Issue" (must be listed under article 1)
//   n2 submission 9 (Production): the same two keywords, scheduled into the
//      unpublished "Vol. 2 No. 1 (2015)" (must never be listed)
//   submission 2 (Review, unpublished) holds both keywords in the dataset
//      (must never be listed)
//   n3 submission 15 (Production): only "Social Transformation", published
//      in "Vol. 1 No. 2 (2014)" (a partial match: recorded, see the report)
//
// Reset first:  npm run fleet-prep -- --feature issues-ir8 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir8 PROBE_AGENT=ir8 node bin/probe.js ojs shared/playwright/checks/issues/recommend-similar-list-never-shown/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir8-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir8-3_5 PROBE_AGENT=ir8 node bin/probe.js ojs shared/playwright/checks/issues/recommend-similar-list-never-shown/walk.js
// Facts: .reports/<feature>/ir8/facts[-<run>]-ojs.json (neighbour[-<run>]-ojs.json)
const {forEachApp, launch, signIn, signOut, shot, record} = require('../../../probe');
const {enablePlugin, publish} = require('../recommend-by-author-list-never-shown/lib');
const {flat, addKeywords, scheduleOnly, readArticle, logMark, logSince} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const KEYWORDS = ['Professional Development', 'Social Transformation'];
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const FUTURE = /Vol\. 2 No\. 1 \(2015\)/;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships with OJS alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, steps: [], articles: []};
    const mark = logMark(app);
    try {
        // Step 1.
        await signIn(page, 'rvaca');
        facts.steps.push({step: 1, ...(await enablePlugin(page, app, 'recommendbysimilarityplugin'))});
        await signOut(page);
        // Steps 2-4.
        await signIn(page, 'dbarnes');
        facts.steps.push({step: 3, ...(await addKeywords(page, app, 5, KEYWORDS))});
        facts.steps.push({step: 4, ...(await publish(page, app, 5, ISSUE))});
        if (NEIGHBOUR) {
            facts.steps.push({step: 'n1a', ...(await addKeywords(page, app, 6, KEYWORDS))});
            facts.steps.push({step: 'n1b', ...(await publish(page, app, 6, null))});
            facts.steps.push({step: 'n2a', ...(await addKeywords(page, app, 9, KEYWORDS))});
            facts.steps.push({step: 'n2b', ...(await scheduleOnly(page, app, 9, FUTURE))});
            facts.steps.push({step: 'n3a', ...(await addKeywords(page, app, 15, [KEYWORDS[1]]))});
            facts.steps.push({step: 'n3b', ...(await publish(page, app, 15, ISSUE))});
        }
        await signOut(page);
        // Steps 5-6 and the control.
        for (const id of NEIGHBOUR ? [1, 5, 6, 15, 17] : [1, 5, 17]) {
            const r = await readArticle(page, app, id);
            facts.articles.push(r);
            await shot(page, `article-${id}${NEIGHBOUR ? '-neighbour' : ''}`).catch(() => {});
        }
    } finally {
        facts.serverLog = logSince(app, mark);
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 300));
        for (const a of facts.articles) {
            console.log(`article ${a.articleId} ${a.status} section ${a.sectionCount} heading ${a.headingOnPage}`, flat(JSON.stringify(a.items || []), 600), a.search || '', a.searchHref || '');
        }
        console.log(`server log (${facts.serverLog.path}): ${facts.serverLog.lines.length} lines`);
        for (const l of facts.serverLog.lines.slice(0, 12)) console.log('  ', l.slice(0, 400));
        await close();
    }
});
