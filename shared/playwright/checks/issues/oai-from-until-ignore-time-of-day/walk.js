// Issue report docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md (U19 A2): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`, signed out: the OAI-PMH address is public, and
// a browser's address bar sends what a harvester sends.
//
// The kit builds nothing and the walk changes nothing.
//   1. Identify (the granularity it announces)
//   2. ListIdentifiers with no date: NEWEST and OLDEST are its newest and oldest datestamp
//   3. ListIdentifiers with from = NEWEST plus one second
//   4. ListRecords with the same from
//   5. ListIdentifiers with until = OLDEST minus one second (OJS, OMP: a preprint server's
//      lists fail on any until, U19 OPS1)
//   6. the site-wide address with step 3's from
//   7. ListIdentifiers with from = the last second of NEWEST's day
//   8. controls: from = NEWEST itself; from = the day after NEWEST's day
// Neighbour (`neighbour` as the script's argument, with the fix in and out): what the fix
//   must leave alone (no date, the day form of from and until, both ends included, the
//   exact second included, the section's set, GetRecord), then, signed in as `dbarnes`, a
//   published submission's "Unpublish" ("Unpost") and the deleted record's own date filter.
//   The neighbour changes the dataset: reset before the next walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-a2 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-a2 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a2-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a2-3_5 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js
// Facts: .reports/<feature>/a2/time-facts[-<run>]-<app>.json (time-neighbour… for the neighbour)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const {shift, dayOf, ask, line} = require('./lib');
const {unpublish} = require('../oai-own-address-loses-deleted-records/lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const LIST = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
const RECORDS = 'verb=ListRecords&metadataPrefix=oai_dc';
// The published submission the neighbour unpublishes, per app (docs/process/dataset.md).
const SUBS = {ojs: 17, omp: 14, ops: 19};
const stampOf = (header) => (header.match(/ (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ) /) || [])[1];

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    const step = async (name, where, params, view = !NEIGHBOUR) => {
        const r = await ask(view ? page : null, app, name, where, params);
        facts.results.push(r);
        console.log(line(app, r));
        return r;
    };
    try {
        const all = await step(NEIGHBOUR ? 'n1 no date' : '2 no date', ctx, LIST);
        const stamps = all.headers.map(stampOf).filter(Boolean).sort();
        const OLDEST = stamps[0];
        const NEWEST = stamps[stamps.length - 1];
        Object.assign(facts, {OLDEST, NEWEST, stamps});
        console.log(`[fact] ${app.name} oldest ${OLDEST} newest ${NEWEST} of ${stamps.length}`);
        if (NEIGHBOUR) {
            const set = `${ctx}:${{ojs: 'ART', ops: 'PRE'}[app.name] || ''}`;
            await step('n2 from day of newest', ctx, `${LIST}&from=${dayOf(NEWEST)}`);
            await step('n3 until day of oldest', ctx, `${LIST}&until=${dayOf(OLDEST)}`);
            await step('n4 from day after', ctx, `${LIST}&from=${dayOf(NEWEST, 1)}`);
            await step('n5 until day before', ctx, `${LIST}&until=${dayOf(OLDEST, -1)}`);
            await step('n6 from newest exactly', ctx, `${LIST}&from=${NEWEST}`);
            await step('n7 until oldest exactly', ctx, `${LIST}&until=${OLDEST}`);
            await step('n8 from oldest until newest', ctx, `${LIST}&from=${OLDEST}&until=${NEWEST}`);
            await step('n9 from and until one day', ctx, `${LIST}&from=${dayOf(OLDEST)}&until=${dayOf(NEWEST)}`);
            if (app.name !== 'omp') await step('n10 section set, from day', ctx, `${LIST}&set=${encodeURIComponent(set)}&from=${dayOf(OLDEST)}`);
            const first = all.headers[0] && all.headers[0].split(' ')[0];
            if (first) await step('n11 get record', ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(first)}`);
            await step('n12 identify', ctx, 'verb=Identify');
            // A deleted record, made on screen.
            await signIn(page, 'dbarnes');
            facts.unpublish = await unpublish(page, app, ctx, SUBS[app.name]);
            console.log(`[fact] ${app.name} unpublish ${SUBS[app.name]}: ${JSON.stringify(facts.unpublish)}`);
            const after = await step('n13 no date, after unpublish', ctx, LIST);
            const gone = after.headers.find((h) => h.startsWith('DELETED '));
            const GONE = gone && stampOf(gone);
            facts.GONE = GONE;
            console.log(`[fact] ${app.name} deleted record: ${gone}`);
            if (GONE) {
                await step('n14 from deleted exactly', ctx, `${LIST}&from=${GONE}`);
                await step('n15 from deleted plus 1s', ctx, `${LIST}&from=${shift(GONE, 1)}`);
                await step('n16 until deleted minus 1s', ctx, `${LIST}&until=${shift(GONE, -1)}`);
                await step('n17 until deleted exactly', ctx, `${LIST}&until=${GONE}`);
                await step('n18 from day of deleted', ctx, `${LIST}&from=${dayOf(GONE)}`);
            }
        } else {
            await step('1 identify', ctx, 'verb=Identify');
            await step('3 from newest plus 1s', ctx, `${LIST}&from=${shift(NEWEST, 1)}`);
            await step('4 records from newest plus 1s', ctx, `${RECORDS}&from=${shift(NEWEST, 1)}`);
            if (app.name !== 'ops') await step('5 until oldest minus 1s', ctx, `${LIST}&until=${shift(OLDEST, -1)}`);
            await step('6 site from newest plus 1s', 'index', `${LIST}&from=${shift(NEWEST, 1)}`);
            await step('7 from last second of the day', ctx, `${LIST}&from=${dayOf(NEWEST)}T23:59:59Z`);
            await step('8a from newest exactly', ctx, `${LIST}&from=${NEWEST}`);
            await step('8b from day after', ctx, `${LIST}&from=${dayOf(NEWEST, 1)}`);
        }
    } finally {
        record(NEIGHBOUR ? 'time-neighbour' : 'time-facts', facts);
        await close();
    }
});
