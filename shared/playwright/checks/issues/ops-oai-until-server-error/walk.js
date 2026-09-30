// Issue report walk: docs/issues/U19-OPS1-ops-oai-until-server-error.md
// (spec U19 register OPS1). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"): the context
// `publicknowledge`'s OAI address and the site-wide one, typed in the
// browser as a person (or a harvester) asks, no sign-in. The kit builds
// nothing and the walk changes nothing in the data.
//   steps (OPS): ListRecords with no dates (control); ListRecords with
//      `until` today; ListIdentifiers with `until` today; ListRecords with
//      `from=2000-01-01&until` today; the site-wide address with `until`
//   control (OJS, OMP): the same five requests
// Each answer: status, content type, records or headers counted, the OAI
// error, what the browser shows, the server log lines it wrote.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w01 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w01 PROBE_AGENT=w01 node bin/probe.js all shared/playwright/checks/issues/ops-oai-until-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w01-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w01-3_5 PROBE_AGENT=w01 node bin/probe.js all shared/playwright/checks/issues/ops-oai-until-server-error/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/w01/facts[-<run>]-<app>.json
const {forEachApp, launch} = require('../../../probe');
const {reader, today} = require('./oai');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, today});
    const ctx = app.contextPath;
    try {
        // 1. No dates.
        await open('1-listrecords-no-dates', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc`);
        // 2. until today.
        await open('2-listrecords-until-today', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc&until=${today}`);
        // 3. ListIdentifiers, until today.
        await open('3-listidentifiers-until-today', `${ctx}/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=${today}`);
        // 4. A harvest slice.
        await open('4-listrecords-from-until', `${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2000-01-01&until=${today}`);
        // 5. The site-wide address.
        await open('5-site-listrecords-until-today', `index/oai?verb=ListRecords&metadataPrefix=oai_dc&until=${today}`);
    } finally {
        save();
        await close();
    }
});
