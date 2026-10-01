// Neighbour check for docs/issues/U13-OJS1-citation-formats-fail-outside-published-issue.md:
// what the fix must leave alone. An article that is scheduled, not
// published, keeps its citation formats for the editor's preview only.
// OJS, PKP's default test dataset:
//   1. dbarnes ticks "Citation Style Language" (when off) and schedules
//      submission 15, "Yam diseases and its management in Nigeria", with
//      "Assign To Future Issue and Schedule Only" into "Vol. 2 No. 1 (2015)".
//   2. dbarnes opens its preview (article 15's page): "MLA", "BibTeX".
//   3. rbaiyewu, its author, opens the same preview: "MLA", "BibTeX".
//   4. Signed out, the same address.
// Expected with and without the fix: step 2 gets the format and the file;
// step 3 keeps the citation and gets "404 Not Found" (the plugin's preview
// rule, not this report's subject); step 4 is the "404 Not Found" page.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run: PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs1 [PROBE_RUN=fixin|fixout] node bin/probe.js ojs shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/neighbour.js
const path = require('path');
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const {tryFormats, enableCsl} = require('./cite');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                facts.plugin = await enableCsl(app, page);
                const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                const pub = new PublicationScreen(page, app.contextPath);
                await pub.gotoWorkflow(15);
                await idle(page);
                await pub.scheduleToFutureIssue(/Vol\. 2 No\. 1 \(2015\)/);
                facts.statusLine = (await pub.leftControls().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
            } finally {
                await close();
            }
        }
        for (const [who, key] of [['dbarnes', 'dbarnes-article15'], ['rbaiyewu', 'rbaiyewu-article15'], [null, 'visitor-article15']]) {
            const {page, close} = await launch(app);
            try {
                if (who) await signIn(page, who);
                facts[key] = await tryFormats(app, page, 15, key);
            } finally {
                await close();
            }
        }
        facts.summary = {statusLine: facts.statusLine};
        for (const k of ['dbarnes-article15', 'rbaiyewu-article15', 'visitor-article15']) {
            const v = facts[k];
            facts.summary[k] = v.format
                ? {format: `${v.format.status} changed=${v.format.changed}`, download: v.download.file || `${v.download.status} ${v.download.pageText}`}
                : {page: `${v.pageStatus} ${v.title}`};
        }
        console.log(app.name, JSON.stringify(facts.summary, null, 1));
    } finally {
        record('neighbour', facts);
    }
});
