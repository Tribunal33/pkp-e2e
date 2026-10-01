// Issue report docs/issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md (U19 A20) {OJS OPS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
//
//   1. sign in as admin
//   2. submission 17 (OPS 19): workflow › "Unpublish" ("Unpost"), confirmed
//   3. ListRecords with set=publicknowledge:ART (OPS :PRE) and from=2030-01-01, at the journal's
//      address and the site-wide one
//   4. the same with until=2020-01-01, and ListIdentifiers with each
//   5. the same with until=yesterday: the section's earlier records, and the deleted record beside them
// Control and neighbour reads, for the fix (taken on every run): the same dates with the journal's
// set and with no set; the section's set with no date, with from today and with until today.
// On OPS every list with `until` fails on its own (U19 OPS1), so only `from` tells there.
//
// Reset first:  npm run fleet-prep -- --feature issues-a19 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-a19 PROBE_AGENT=a20 node bin/probe.js ojs,ops shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a19-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a19-3_5 PROBE_AGENT=a20 node bin/probe.js ojs,ops shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const {unpublish} = require('../oai-own-address-loses-deleted-records/lib');
const L = require('../oai-deleted-section-set-lists-nothing/lib');

const APPS = {ojs: {id: 17, abbrev: 'ART'}, ops: {id: 19, abbrev: 'PRE'}};
const CTX = 'publicknowledge';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const IDS = 'verb=ListIdentifiers&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const A = APPS[app.name];
    if (!A) return console.log(`[walk] ${app.name}: a press's query has no such filter; not walked`);
    const f = {app: app.name, line: app.line || 'main', submission: A.id, reads: []};
    const SET = `set=${CTX}:${A.abbrev}`;
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const read = async (name, ctx, params, show = false) => {
        const r = await L.ask(show ? page : null, app, name, ctx, params);
        f.reads.push(r);
        console.log(L.line(app, r));
        return r;
    };
    try {
        await signIn(page, 'admin');
        await read('0 before: section set, from 2030', CTX, `${LIST}&${SET}&from=2030-01-01`);
        f.unpublish = await unpublish(page, app, CTX, A.id);
        console.log(`[fact] ${app.name} 2 unpublish: ${JSON.stringify(f.unpublish)}`);
        const today = new Date().toISOString().slice(0, 10);
        // 3
        await read('3 section set, from 2030', CTX, `${LIST}&${SET}&from=2030-01-01`, true);
        await read('3 site-wide section set, from 2030', 'index', `${LIST}&${SET}&from=2030-01-01`, true);
        // 4
        await read('4 section set, until 2020', CTX, `${LIST}&${SET}&until=2020-01-01`, true);
        await read('4 site-wide section set, until 2020', 'index', `${LIST}&${SET}&until=2020-01-01`);
        await read('4 ListIdentifiers section set, from 2030', CTX, `${IDS}&${SET}&from=2030-01-01`);
        await read('4 ListIdentifiers section set, until 2020', CTX, `${IDS}&${SET}&until=2020-01-01`);
        // 5
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        await read('5 section set, until yesterday', CTX, `${LIST}&${SET}&until=${yesterday}`, true);
        await read('5 journal set, until yesterday', CTX, `${LIST}&set=${CTX}&until=${yesterday}`);
        // control
        await read('control: journal set, from 2030', CTX, `${LIST}&set=${CTX}&from=2030-01-01`, true);
        await read('control: journal set, until 2020', CTX, `${LIST}&set=${CTX}&until=2020-01-01`);
        await read('control: no set, from 2030', CTX, `${LIST}&from=2030-01-01`);
        await read('control: no set, until 2020', CTX, `${LIST}&until=2020-01-01`);
        // neighbours
        await read('neighbour: section set, no date', CTX, `${LIST}&${SET}`);
        await read('neighbour: section set, from today', CTX, `${LIST}&${SET}&from=${today}`);
        await read('neighbour: section set, until today', CTX, `${LIST}&${SET}&until=${today}`);
        await read('neighbour: journal set, from today', CTX, `${LIST}&set=${CTX}&from=${today}`);
        await read('neighbour: journal set, no date', CTX, `${LIST}&set=${CTX}`);
        await read('neighbour: no set, no date', CTX, LIST);
        await read('neighbour: site-wide section set, no date', 'index', `${LIST}&${SET}`);
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
