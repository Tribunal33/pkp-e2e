// Issue report docs/issues/U19-A3-oai-impossible-date-accepted.md (U19 A3): the report's Steps
// to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), context `publicknowledge`, signed out: the OAI-PMH address is public, and a
// browser's address bar sends what a harvester sends.
//
// The kit builds nothing and the walk changes nothing.
//   1. ListIdentifiers with no date (N records, all older than 2030)
//   2. from = 2030-13-01 (month 13)
//   3. from = 2030-01-01T25:00:00Z (hour 25)
//   4. from = 2030-02-30 (30 February)
//   5. until = 2030-13-01            (OJS, OMP: a preprint server's lists fail on any until,
//   6. until = 2030-02-30             U19 OPS1)
//   7. ListRecords with from = 2030-13-01
//   8. the site-wide address with from = 2030-13-01
//   9. controls: from = 30-02-2030 (the wrong shape); from = 2030-01-01
// Neighbour (`neighbour` as the script's argument, with the fix in and out): the dates the
//   fix must keep reading (the day form and the long form of from and until, a leap day, the
//   last second of a day, Identify's earliest datestamp) and the refusals it must keep (the
//   wrong shape, until before from, the two forms mixed).
//
// Reset first:  npm run fleet-prep -- --feature issues-a2 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-a2 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a2-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a2-3_5 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js
// Facts: .reports/<feature>/a2/date-facts[-<run>]-<app>.json (date-neighbour… for the neighbour)
const {forEachApp, launch, record} = require('../../../probe');
const {ask, line} = require('../oai-from-until-ignore-time-of-day/lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const LIST = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
const RECORDS = 'verb=ListRecords&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const until = app.name !== 'ops';
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    const step = async (name, where, params, view = !NEIGHBOUR) => {
        const r = await ask(view ? page : null, app, name, where, params);
        facts.results.push(r);
        console.log(line(app, r));
        return r;
    };
    try {
        if (NEIGHBOUR) {
            await step('n1 no date', ctx, LIST);
            await step('n2 from 2000-01-01', ctx, `${LIST}&from=2000-01-01`);
            await step('n3 from 2030-01-01', ctx, `${LIST}&from=2030-01-01`);
            await step('n4 from long form 2000', ctx, `${LIST}&from=2000-01-01T00:00:00Z`);
            await step('n5 from long form 2030', ctx, `${LIST}&from=2030-12-31T23:59:59Z`);
            await step('n6 from leap day 2028', ctx, `${LIST}&from=2028-02-29`);
            await step('n7 from 29 Feb 2030', ctx, `${LIST}&from=2030-02-29`);
            await step('n8 from wrong shape', ctx, `${LIST}&from=30-02-2030`);
            await step('n9 from slashes', ctx, `${LIST}&from=2030/01/01`);
            await step('n10 identify', ctx, 'verb=Identify');
            if (until) {
                await step('n11 until 2030-01-01', ctx, `${LIST}&until=2030-01-01`);
                await step('n12 until 2000-01-01', ctx, `${LIST}&until=2000-01-01`);
                await step('n13 until long form 2030', ctx, `${LIST}&until=2030-12-31T23:59:59Z`);
                await step('n14 until before from', ctx, `${LIST}&from=2030-01-02&until=2030-01-01`);
                await step('n15 forms mixed', ctx, `${LIST}&from=2000-01-01&until=2030-01-01T00:00:00Z`);
                await step('n16 from and until', ctx, `${LIST}&from=2000-01-01&until=2030-01-01`);
            }
        } else {
            await step('1 no date', ctx, LIST);
            await step('2 from month 13', ctx, `${LIST}&from=2030-13-01`);
            await step('3 from hour 25', ctx, `${LIST}&from=2030-01-01T25:00:00Z`);
            await step('4 from 30 February', ctx, `${LIST}&from=2030-02-30`);
            if (until) {
                await step('5 until month 13', ctx, `${LIST}&until=2030-13-01`);
                await step('6 until 30 February', ctx, `${LIST}&until=2030-02-30`);
            }
            await step('7 records from month 13', ctx, `${RECORDS}&from=2030-13-01`);
            await step('8 site from month 13', 'index', `${LIST}&from=2030-13-01`);
            await step('9a from wrong shape', ctx, `${LIST}&from=30-02-2030`);
            await step('9b from 2030-01-01', ctx, `${LIST}&from=2030-01-01`);
        }
    } finally {
        record(NEIGHBOUR ? 'date-neighbour' : 'date-facts', facts);
        await close();
    }
});
