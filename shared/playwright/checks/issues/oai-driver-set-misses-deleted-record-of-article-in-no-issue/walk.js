// Issue report docs/issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md
// (U19 A11) {OJS}: the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit
// builds nothing.
//
//   1. sign in as admin
//   2. Settings › Website › "Plugins" › "Generic Plugins": tick "DRIVER"
//   3. submission 17 (published in "Vol. 1 No. 2 (2014)", one galley): "Unpublish", confirmed
//   4. …/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver (the control: an article in an issue)
//   5. submission 17: the publish button, "Don't Assign To An Issue", "Confirm", "Publish"
//   6. the address of step 4
//   7. submission 17: "Unpublish", confirmed
//   8. the address of step 4; the same without set=driver
// On 3.5 an article is published only in an issue: steps 1 to 4 are walked (the control) and the
// "Issue" page's choices are recorded.
// Neighbour reads, for the fix (taken on every run, after the steps): submission 17 published in
// the issue again and unpublished (its deleted record names "driver", as in step 4), and the
// server log's lines since the walk began.
//
// Reset first:  npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-a23 PROBE_AGENT=a11 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a23-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a23-3_5 PROBE_AGENT=a11 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/walk.js
const {forEachApp, launch, signIn, record, idle, screen} = require('../../../probe');
const L = require('../oai-driver-set-lists-article-without-galley/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "DRIVER" plugin; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const old = app.line === 'stable-3_5_0';
    const f = {app: app.name, line: app.line || 'main', reads: []};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const read = async (name, params) => {
        const parts = await L.askAll(app, name, params);
        for (const r of parts) {
            f.reads.push(r);
            console.log(L.line(app, r));
        }
        return parts;
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = L.serverLog(app);
    try {
        await signIn(page, 'admin');
        fact('2 DRIVER ticked', await L.setDriver(page, true));
        fact('3 unpublish 17 (in the issue)', await L.unpublish(page, app, L.CTX, 17));
        await read('4 set=driver', `${L.LIST}&set=driver`);
        fact('4 browser view', await L.view(page, app, '4 set=driver', `${L.LIST}&set=driver`));
        await read('4 no set', L.LIST);
        fact('4 server log', log.since());
        if (old) {
            await page.goto(app.url(`/index.php/${L.CTX}/en/dashboard/editorial?workflowSubmissionId=17&workflowMenuKey=publication_issue`));
            await idle(page).catch(() => {});
            await L.sleep(2000);
            const s = await screen(page).catch(() => null);
            fact('5 (3.5) the "Issue" page', L.flat(s && (s.text.dialog || s.text.main), 900));
            record('05-issue-page-35', s);
            return;
        }
        fact('5 publish 17 in no issue', await L.publish(page, app, 17, {issue: false}));
        await read('6 set=driver', `${L.LIST}&set=driver`);
        fact('7 unpublish 17 (in no issue)', await L.unpublish(page, app, L.CTX, 17));
        fact('7 server log', log.since());
        await read('8 set=driver', `${L.LIST}&set=driver`);
        fact('8 browser view', await L.view(page, app, '8 set=driver', `${L.LIST}&set=driver`));
        await read('8 no set', L.LIST);
        // after the steps: back in the issue, unpublished again
        fact('9 publish 17 in the issue', await L.publish(page, app, 17, {issue: true}));
        await read('9 set=driver', `${L.LIST}&set=driver`);
        fact('9 unpublish 17 (in the issue)', await L.unpublish(page, app, L.CTX, 17));
        await read('9 neighbour: set=driver', `${L.LIST}&set=driver`);
        await read('9 neighbour: no set', L.LIST);
        fact('server log', {file: log.file, lines: log.since()});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
