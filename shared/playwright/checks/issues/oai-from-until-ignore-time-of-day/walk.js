// Issue report walk: docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md
// (spec U19 register A2). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"): the context
// `publicknowledge`'s OAI address typed in the browser as a harvester asks,
// no sign-in. The kit builds nothing and the walk changes nothing.
//   1. Identify: the granularity announced
//   2. ListIdentifiers, no dates: every record's datestamp
//   3. `from` one second after the latest datestamp   (expected: noRecordsMatch)
//   4. `until` one second before the earliest datestamp (expected: noRecordsMatch)
//   control: `from` the next day (day granularity)     (noRecordsMatch)
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w06 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w06 PROBE_AGENT=w06 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w06-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w06-3_5 PROBE_AGENT=w06 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/w06/facts[-<run>]-<app>.json
const {forEachApp, launch} = require('../../../probe');
const {reader, shift, day} = require('./oai');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const oai = `${app.contextPath}/oai`;
    const list = `${oai}?verb=ListIdentifiers&metadataPrefix=oai_dc`;
    try {
        await open('1-identify', `${oai}?verb=Identify`);
        const all = await open('2-list-no-dates', list);
        const stamps = all.headers.map((h) => h.datestamp).sort();
        if (!stamps.length) throw new Error('no records listed in step 2');
        const earliest = stamps[0], latest = stamps[stamps.length - 1];
        fact('window', {earliest, latest});
        await open('3-from-latest-plus-1s', `${list}&from=${shift(latest, 1)}`);
        await open('4-until-earliest-minus-1s', `${list}&until=${shift(earliest, -1)}`);
        await open('c-from-next-day', `${list}&from=${day(latest, 1)}`);
    } finally {
        save();
        await close();
    }
});
