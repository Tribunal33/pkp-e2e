// Issue report docs/issues/U65-A8-report-address-unknown-name-404.md (U65 A8): the report's Steps
// to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The steps create nothing and change nothing.
//
// Default mode, as `dbarnes`: Statistics › "Reports" from the side menu, then four report
//   addresses typed in the address bar (an unknown name, an empty one, none, the right name in
//   lower case), each read where it lands; the control (the right name) typed last.
// `neighbour` as the argument (the fix in and out; runs alone): as `dbarnes`, "Review Report"
//   pressed on "Reports" (OJS, OMP) and `…/stats/reports/nosuch` typed (an unknown path after
//   "reports", which the fix leaves alone); as an Author (`ccorino`; OMP `aclark`), the unknown
//   name's address typed, which must stay refused.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir7 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir7 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/report-address-unknown-name-404/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir7-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir7-3_5 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/report-address-unknown-name-404/walk.js
// Facts: .reports/<feature>/ir7/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, record, shot, serverLog} = require('../../../probe');
const {flat, prefix, openReportsFromMenu, typeAddress, pressReport} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const HAS_REPORTS = (app) => app.name !== 'ops';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const base = `${prefix(app)}/stats/reports/report`;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'steps') {
            facts.reportsPage = await openReportsFromMenu(page, app);
            await shot(page, 'steps-reports');
            facts.typed = [];
            for (const [label, q] of [['unknown name', '?pluginName=NoSuchReport'], ['empty name', '?pluginName='], ['no name', ''], ['lower case', '?pluginName=reviewreportplugin']]) {
                const r = await typeAddress(page, app, base + q);
                facts.typed.push({label, ...r});
                if (label === 'unknown name') await shot(page, 'steps-unknown-name');
            }
            if (HAS_REPORTS(app)) facts.control = await typeAddress(page, app, `${base}?pluginName=ReviewReportPlugin`);
        } else {
            facts.reportsPage = await openReportsFromMenu(page, app);
            if (HAS_REPORTS(app)) facts.pressReviewReport = await pressReport(page, 'Review Report');
            facts.unknownPath = await typeAddress(page, app, `${prefix(app)}/stats/reports/nosuch`);
            await signIn(page, AUTHOR[app.name]);
            facts.author = {user: AUTHOR[app.name], ...(await typeAddress(page, app, `${base}?pluginName=NoSuchReport`))};
            await shot(page, 'neighbour-author');
        }
    } catch (e) {
        facts.error = flat(e.message, 400);
    } finally {
        facts.serverLog = log.since(from).map((l) => flat(l, 300)).slice(0, 20);
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
