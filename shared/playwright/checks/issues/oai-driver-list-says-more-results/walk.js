// Issue report docs/issues/U19-A24-oai-driver-list-says-more-results.md (U19 A24) {OJS}:
// the report's steps 7 to 12 (numbered 1 to 8 below), walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
//
//   1. sign in as admin
//   2. submission 5 "Genetic transformation of forest trees": "Schedule For Publication", "Assign
//      To Current/Back Issue" "Vol. 1 No. 2 (2014)", "Confirm", "Publish" (3.5: Publication ›
//      "Issue" › "Assign to Issue", "Save"; then the publish button)
//   3. "Unpublish", confirmed ("DRIVER" is off: the deleted record is no member of the set)
//   4. Settings › Website › "Plugins" › "Generic Plugins": tick "DRIVER"
//   5. …/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver
//   6. "Resume"
// When the rest of the list holds no member:
//   7. untick "DRIVER" ("OK"); submission 17: "Unpublish", confirmed; tick "DRIVER"
//   8. the address of step 5; "Resume"
// Neighbour reads, for the fix (taken on every run): the list without a set and with
// set=publicknowledge (their records and their tokens), ListIdentifiers with set=driver, the set
// with from= a day after today (nothing) and until= today (the same members).
//
// Reset first:  npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-a23 PROBE_AGENT=a24 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-list-says-more-results/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a23-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a23-3_5 PROBE_AGENT=a24 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-list-says-more-results/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../oai-driver-set-lists-article-without-galley/lib');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "DRIVER" plugin; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main', reads: []};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const readAll = async (name, params) => {
        const parts = await L.askAll(app, name, params);
        for (const r of parts) {
            f.reads.push(r);
            console.log(L.line(app, r));
        }
        return parts;
    };
    const neighbours = async (n) => {
        await readAll(`${n} neighbour: no set`, L.LIST);
        await readAll(`${n} neighbour: set=publicknowledge`, `${L.LIST}&set=${L.CTX}`);
        await readAll(`${n} neighbour: ListIdentifiers set=driver`, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver');
        await readAll(`${n} neighbour: set=driver from tomorrow`, `${L.LIST}&set=driver&from=${day(2)}`);
        await readAll(`${n} neighbour: set=driver until tomorrow`, `${L.LIST}&set=driver&until=${day(1)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = L.serverLog(app);
    try {
        await signIn(page, 'admin');
        fact('2 publish 5', await L.publish(page, app, 5, {issue: true}));
        fact('3 unpublish 5', await L.unpublish(page, app, L.CTX, 5));
        fact('4 DRIVER ticked', await L.setDriver(page, true));
        await readAll('5-6 set=driver', `${L.LIST}&set=driver`);
        fact('5-6 browser view', await L.view(page, app, '5 set=driver', `${L.LIST}&set=driver`));
        await neighbours('6');
        fact('7 DRIVER unticked', await L.setDriver(page, false));
        fact('7 unpublish 17', await L.unpublish(page, app, L.CTX, 17));
        fact('7 DRIVER ticked', await L.setDriver(page, true));
        await readAll('8 set=driver', `${L.LIST}&set=driver`);
        fact('8 browser view', await L.view(page, app, '8 set=driver', `${L.LIST}&set=driver`));
        await neighbours('8');
        fact('server log', {file: log.file, lines: log.since()});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
