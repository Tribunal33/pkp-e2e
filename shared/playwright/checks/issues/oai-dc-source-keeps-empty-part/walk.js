// Issue report docs/issues/U19-A8-oai-dc-source-keeps-empty-part.md (U19 A8) {OJS, OMP}: the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// OMP (nobody signs in):
//   1. …/oai?verb=ListRecords&metadataPrefix=oai_dc: each record's "Source"
// OJS, as the dataset's `dbarnes`:
//   0. the control: article 1 (in "Vol. 1 No. 2 (2014)", pages 71-98) and article 17 (same issue, no pages)
//   1-2. submission 17: "Unpublish", confirmed
//   3. the publish button › "Don't Assign To An Issue" › "Confirm" › "Publish"
//   4. …/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17
//   5. "Unpublish"; "Publication Settings": "Pages" "15-20", "Save"; published as in step 3
//   6. the address of step 4
//   Neighbour (for the fix): submission 17 unpublished and published in the issue again, pages kept.
// On 3.5 an article is published only in an issue: OJS takes step 0 alone there.
// OPS writes no "Source"; its list is read to say so.
//
// Reset first:  npm run fleet-prep -- --feature issues-a7 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-a7 PROBE_AGENT=a7 node bin/probe.js all shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a7-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a7-3_5 PROBE_AGENT=a7 node bin/probe.js all shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../oai-dc-peer-reviewed-type-gone-after-section-save/lib');
const D = require('../oai-driver-set-lists-article-without-galley/lib');

const CTX = 'publicknowledge';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const ONE = 'verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1800)}`);
    };
    const sources = async (params) => {
        const a = await L.readDc(app, CTX, params);
        return {status: a.status, error: a.error, records: a.records.map((r) => ({identifier: r.identifier, source: r.source}))};
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = D.serverLog(app);
    try {
        if (app.name !== 'ojs') {
            fact('1 list', await sources(LIST));
            fact('1 browser view', await L.viewDc(page, app, CTX, LIST, '01-list'));
            return;
        }
        fact('0 control: the list', await sources(LIST));
        fact('0 browser view', await L.viewDc(page, app, CTX, LIST, '00-list'));
        if (L.old(app)) return;
        await signIn(page, 'dbarnes');
        fact('2 unpublish 17', await D.unpublish(page, app, CTX, 17));
        fact('3 publish 17 in no issue', await L.publish(page, app, CTX, 17));
        fact('4 article 17', await sources(ONE));
        fact('4 browser view', await L.viewDc(page, app, CTX, ONE, '04-record'));
        fact('5 unpublish 17', await D.unpublish(page, app, CTX, 17));
        fact('5 pages', await L.setPages(page, app, CTX, 17, '15-20'));
        fact('5 publish 17 in no issue', await L.publish(page, app, CTX, 17));
        fact('6 article 17', await sources(ONE));
        fact('6 browser view', await L.viewDc(page, app, CTX, ONE, '06-record'));
        // the neighbour: back in the issue, with the pages
        fact('7 unpublish 17', await D.unpublish(page, app, CTX, 17));
        fact('7 publish 17 in the issue', await L.publish(page, app, CTX, 17, {issue: /Vol\. 1 No\. 2 \(2014\)/}));
        fact('7 neighbour: the list', await sources(LIST));
        fact('server log', {file: log.file, lines: log.since()});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
