// Issue report walk: docs/issues/U19-A16-oai-repeated-argument-server-error.md
// (spec U19 register A16). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"): the context
// `publicknowledge`'s OAI address, typed in the browser as a harvester asks,
// no sign-in. The kit builds nothing and the walk changes nothing.
//   1. ListRecords (control)   2. metadataPrefix twice   3. set twice
//   4. verb twice              5. Identify (the next request)
// Each answer: status, content type, the OAI error, records counted, what
// the browser shows, the server log lines it wrote.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w03 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w03 PROBE_AGENT=w03 node bin/probe.js all shared/playwright/checks/issues/oai-repeated-argument-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w03-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w03-3_5 PROBE_AGENT=w03 node bin/probe.js all shared/playwright/checks/issues/oai-repeated-argument-server-error/walk.js
// Fix trial:    trial.sh beside this file.
const {forEachApp, launch} = require('../../../probe');
const {reader} = require('./oai');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const ctx = app.contextPath;
    try {
        await open('1-listrecords', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc`);
        await open('2-metadataprefix-twice', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`);
        await open('3-set-twice', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc&set=${ctx}&set=${ctx}`);
        await open('4-verb-twice', `${ctx}/oai?verb=Identify&verb=Identify`);
        await open('5-identify', `${ctx}/oai?verb=Identify`);
    } finally {
        save();
        await close();
    }
});
