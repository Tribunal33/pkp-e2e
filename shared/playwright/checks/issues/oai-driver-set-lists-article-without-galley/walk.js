// Issue report docs/issues/U19-A23-oai-driver-set-lists-article-without-galley.md (U19 A23) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
//
//   1. sign in as admin
//   2. Settings › Website › "Plugins" › "Generic Plugins": tick "DRIVER"
//   3. submission 5 "Genetic transformation of forest trees" (Production, no galley):
//      "Schedule For Publication", "Assign To Current/Back Issue" "Vol. 1 No. 2 (2014)", "Confirm",
//      "Publish" (3.5: Publication › "Issue" › "Assign to Issue", "Save"; then the publish button)
//   4. …/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver
// Neighbour reads, for the fix (taken on every run): the set right after step 2 (articles 1 and
// 17, each with a galley: the control); after step 3 the list without a set, ListSets and
// ListIdentifiers with the set; then, after the steps, "Unpublish" on 5 and on 17 and the list
// without a set: with the fix the deleted record of 17 names "driver" and that of 5 does not
// (the plugin's second copy of the galley test, taken when an article is unpublished).
//
// Reset first:  npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-a23 PROBE_AGENT=a23 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a23-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a23-3_5 PROBE_AGENT=a23 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "DRIVER" plugin; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main', reads: []};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    const read = async (name, params) => {
        const r = await L.ask(app, name, params);
        f.reads.push(r);
        console.log(L.line(app, r));
        return r;
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = L.serverLog(app);
    try {
        await signIn(page, 'admin');
        await read('0 before: set=driver (plugin off)', `${L.LIST}&set=driver`);
        fact('2 DRIVER ticked', await L.setDriver(page, true));
        await read('2 control: set=driver', `${L.LIST}&set=driver`);
        await read('2 ListSets', 'verb=ListSets');
        fact('3 publish 5', await L.publish(page, app, 5, {issue: true}));
        const set = await read('4 set=driver', `${L.LIST}&set=driver`);
        fact('4 browser view', await L.view(page, app, '4 set=driver', `${L.LIST}&set=driver`));
        fact('4 article/5 in the set', set.headers.some((h) => /article\/5 /.test(h)));
        await read('4 neighbour: no set', L.LIST);
        await read('4 neighbour: ListIdentifiers set=driver', 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver');
        // after the steps: the deleted records' marks
        fact('5 unpublish 5', await L.unpublish(page, app, L.CTX, 5));
        fact('5 unpublish 17', await L.unpublish(page, app, L.CTX, 17));
        await read('5 neighbour: no set, 5 and 17 deleted', L.LIST);
        await read('5 neighbour: set=driver, 5 and 17 deleted', `${L.LIST}&set=driver`);
        fact('server log', {file: log.file, lines: log.since()});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
