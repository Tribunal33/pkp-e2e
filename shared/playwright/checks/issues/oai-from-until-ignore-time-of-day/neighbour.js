// Neighbour check for docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md,
// walked with the fix in and out: the fix must make `from` and `until`
// honour the time, and leave the bounds inclusive and the day-only dates
// covering their whole day. Records read from ListIdentifiers with no dates.
//   n1 `from` = the latest datestamp exactly            -> the records at that second
//   n2 `until` = the earliest datestamp exactly          -> the records at that second
//   n3 `from` = the earliest datestamp + 1 s             -> every record after it
//   n4 `from` = the day, day granularity                 -> every record of the day
//   n5 `until` = the day, day granularity                -> every record of the day
//   n6 `from` and `until` = the day                      -> every record of the day
//   n7 `until` = the day before                          -> noRecordsMatch
// Run: PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w06 PROBE_AGENT=w06 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/neighbour.js
const {forEachApp, launch} = require('../../../probe');
const {reader, shift, day} = require('./oai');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const list = `${app.contextPath}/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`;
    try {
        const all = await open('n0-no-dates', list);
        const stamps = all.headers.map((h) => h.datestamp).sort();
        const earliest = stamps[0], latest = stamps[stamps.length - 1];
        const expect = {
            n1: stamps.filter((s) => s >= latest).length,
            n2: stamps.filter((s) => s <= earliest).length,
            n3: stamps.filter((s) => s >= shift(earliest, 1)).length,
            n4: stamps.length, n5: stamps.length, n6: stamps.length, n7: 0,
        };
        fact('expected-counts', {earliest, latest, ...expect});
        await open('n1-from-latest', `${list}&from=${latest}`);
        await open('n2-until-earliest', `${list}&until=${earliest}`);
        await open('n3-from-earliest-plus-1s', `${list}&from=${shift(earliest, 1)}`);
        await open('n4-from-day', `${list}&from=${day(latest)}`);
        await open('n5-until-day', `${list}&until=${day(latest)}`);
        await open('n6-from-until-day', `${list}&from=${day(earliest)}&until=${day(latest)}`);
        await open('n7-until-day-before', `${list}&until=${day(earliest, -1)}`);
    } finally {
        save();
        await close();
    }
});
