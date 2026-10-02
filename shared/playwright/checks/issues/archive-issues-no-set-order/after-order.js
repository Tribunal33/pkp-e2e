// The way round's cost in docs/issues/U50-A13-archive-issues-no-set-order.md (U50 A13): once an
// order is saved on "Back Issues", where does an issue published afterwards land in "Back Issues"
// and in "Archives"? On PKP's default test dataset, as `dbarnes`, on `publicknowledge`. OJS only.
//   1. sign in as dbarnes
//   2. Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue", box unticked, "OK"
//   3. "Back Issues" › "Order": drag "Vol. 1 No. 2 (2014)" above "Vol. 2 No. 1 (2015)", "Done"
//   4. "Create Issue": Volume 3, Number 1, Year 2016, Title "u50a13", "Save"
//   5. "Vol. 3 No. 1 (2016): u50a13" › "Publish Issue", box unticked, "OK" (it becomes current)
//   6. "Back Issues": the list
//   7. header "Archives": the list
// Reset first, run as walk.js with after-order.js. Facts: .reports/<feature>/<id>/after-order-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const NEW = 'Vol. 3 No. 1 (2016): u50a13';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('after-order.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        await L.publishIssue(page, app.contextPath, 'Vol. 2 No. 1 (2015)');
        f.order = await L.orderBackIssue(page, app.contextPath, 'Vol. 1 No. 2 (2014)', 'Vol. 2 No. 1 (2015)');
        f.ordered = await L.backIssues(page, app.contextPath);
        f.create = await L.createIssue(L.issuesAdmin(page, app.contextPath), {volume: 3, number: 1, year: 2016, title: 'u50a13'});
        await L.publishIssue(page, app.contextPath, NEW);
        f.backIssues = await L.backIssues(page, app.contextPath);
        await L.snap(page, 'after-order-back-issues');
        f.archives = await L.archives(page, app.contextPath, 'after-order');
        for (const k of ['ordered', 'backIssues', 'archives']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] order ${f.order} create ${f.create}`);
    } finally {
        record('after-order-facts', f);
        await close();
    }
});
