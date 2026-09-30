// Neighbour check for docs/issues/U19-A8-oai-source-empty-part.md: what the
// fix must leave alone. OJS, signed out, GetRecord in oai_dc of article 1
// "Signalling Theory Dividends" (Vol. 1 No. 2 (2014), "Pages" 71-98) and
// article 17 "Antimicrobial, heavy metal resistance…" (same issue, no
// pages): "{journal}; {issue}; {pages}" and "{journal}; {issue}", then the
// ISSN rows, in both languages. Changes nothing; runs on a dataset fleet.
//
// Run: PROBE_FEATURE=issues-w11 PROBE_AGENT=w11 [PROBE_RUN=fixin] node bin/probe.js ojs shared/playwright/checks/issues/oai-source-empty-part/neighbour.js
const {forEachApp, launch, record, idle} = require('../../../probe');
const {readSources} = require('./source');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        for (const id of [1, 17]) {
            await page.goto(app.url(`/index.php/${app.contextPath}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/${id}`));
            await idle(page);
            facts[`article${id}`] = await readSources(page);
        }
        facts.summary = {article1: facts.article1.records.map((r) => r.source), article17: facts.article17.records.map((r) => r.source)};
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
