// Issue report walk: docs/issues/U19-A4-oai-last-part-offers-resume.md
// (spec U19 register A4). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), in the browser,
// no sign-in: the context's OAI address as a page ("OAI 2.0 Request
// Results"), pressing "Resume" until the list's last part, then "Resume"
// there. The kit builds nothing and the walk changes nothing.
//
// Precondition `oai_max_records = 1` ([oai] in config.inc.php): serve.js
// beside this file restarts the fleet's server with that one key changed.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w08 --dataset 1 --reset
//               PKP_E2E_DATASET=1 node shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js on
// Run (main):   PROBE_FEATURE=issues-w08 PROBE_AGENT=w08 node bin/probe.js all shared/playwright/checks/issues/oai-last-part-offers-resume/walk.js
// Afterwards:   PKP_E2E_DATASET=1 node shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js off
// 3.5:          the same three commands with PKP_E2E_LINE=stable-3_5_0 in front
//               (feature issues-w08-3_5; PROBE_RUN=r35 on the walk).
// Facts: .reports/<feature>/w08/walk[-<run>]-<app>.json
const {forEachApp, launch, screen, record, idle} = require('../../../probe');
const {readPart} = require('./part');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}, parts: []};
    try {
        // Step 1: the list's first part.
        await page.goto(app.url(`/index.php/${app.contextPath}/oai?verb=ListRecords&metadataPrefix=oai_dc`));
        await idle(page);
        let part = await readPart(page);
        facts.parts.push(part);
        // Step 2: "Resume" until the part holding the last record.
        for (let i = 0; i < 40 && part.token; i++) {
            await page.getByRole('link', {name: 'Resume', exact: true}).click();
            await page.waitForLoadState('load');
            await idle(page);
            part = await readPart(page);
            facts.parts.push(part);
        }
        facts.last = part;
        facts.lastScreen = await screen(page);
        // Step 3: "Resume" on the last part, when it is offered.
        if (part.resume) {
            await page.getByRole('link', {name: 'Resume', exact: true}).click();
            await page.waitForLoadState('load');
            await idle(page);
            facts.afterLastResume = {url: page.url(), ...(await readPart(page)), screen: await screen(page)};
        } else {
            facts.afterLastResume = null;
        }
        facts.summary = {
            parts: facts.parts.length,
            completeListSize: facts.parts[0].completeListSize,
            earlierPartsAllOfferResume: facts.parts.slice(0, -1).every((p) => p.moreResults && p.resume && p.token),
            lastPart: {moreResults: part.moreResults, resume: part.resume, token: part.token, cursor: part.cursor},
            lastResumeAnswer: facts.afterLastResume && facts.afterLastResume.error,
        };
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('walk', facts);
        await close();
    }
});
