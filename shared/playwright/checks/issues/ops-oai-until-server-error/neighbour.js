// Neighbour check for docs/issues/U19-OPS1-ops-oai-until-server-error.md,
// walked with fix.diff in and out: the fix must make `until` limit the
// list, not merely stop the error, and leave `from` and the set as they are.
//   `until` yesterday (before every record)      -> noRecordsMatch
//   `from` tomorrow (after every record)          -> noRecordsMatch
//   `from=2000-01-01`, no `until`                 -> every record
//   the server's set `publicknowledge:PRE` with `until` today -> every record
//   `until` today at full granularity (`T23:59:59Z`) -> every record
// OPS only (the fix touches OPS alone).
// Run: PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w01 PROBE_AGENT=w01 node bin/probe.js ops shared/playwright/checks/issues/ops-oai-until-server-error/neighbour.js
const {forEachApp, launch} = require('../../../probe');
const {reader, today, yesterday, tomorrow} = require('./oai');

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, today});
    const base = `${app.contextPath}/oai?verb=ListRecords&metadataPrefix=oai_dc`;
    try {
        await open('n1-until-yesterday', `${base}&until=${yesterday}`);
        await open('n2-from-tomorrow', `${base}&from=${tomorrow}`);
        await open('n3-from-2000', `${base}&from=2000-01-01`);
        await open('n4-set-until-today', `${base}&set=${app.contextPath}:PRE&until=${today}`);
        await open('n5-until-today-seconds', `${base}&until=${today}T23:59:59Z`);
    } finally {
        save();
        await close();
    }
});
