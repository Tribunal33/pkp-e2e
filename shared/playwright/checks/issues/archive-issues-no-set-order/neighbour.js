// Neighbour check for the fix of docs/issues/U50-A13-archive-issues-no-set-order.md (U50 A13): an
// order saved with "Order" on "Back Issues" must still lead the reader's "Archives", which is what
// the archive's ordering was introduced for (pkp/pkp-lib#3705). Walked with the fix in and out.
//   1-4. as walk.js: sign in as dbarnes, publish "Vol. 2 No. 1 (2015)", create and publish
//        "Vol. 3 No. 1 (2016): u50a13"
//   5. "Back Issues" › "Order": drag "Vol. 1 No. 2 (2014)" above "Vol. 3 No. 1 (2016): u50a13", "Done"
//   6. "Back Issues": the list
//   7. header "Archives": the list
// Expected with and without the fix: steps 6 and 7 both read 2014, 2016, 2015.
//
// Reset first, run as walk.js with neighbour.js. Facts: .reports/<feature>/<id>/neighbour-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const NEW = 'Vol. 3 No. 1 (2016): u50a13';
const EXPECTED = ['Vol. 1 No. 2 (2014)', 'u50a13', 'Vol. 2 No. 1 (2015)'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', expected: EXPECTED};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        await L.publishIssue(page, app.contextPath, 'Vol. 2 No. 1 (2015)');
        f.create = await L.createIssue(L.issuesAdmin(page, app.contextPath), {volume: 3, number: 1, year: 2016, title: 'u50a13'});
        await L.publishIssue(page, app.contextPath, NEW);
        f.before = await L.backIssues(page, app.contextPath);
        f.order = await L.orderBackIssue(page, app.contextPath, 'Vol. 1 No. 2 (2014)', NEW);
        f.backIssues = await L.backIssues(page, app.contextPath);
        await L.snap(page, 'neighbour-back-issues');
        f.archives = await L.archives(page, app.contextPath, 'neighbour');
        const same = (list) => list.length === EXPECTED.length && EXPECTED.every((e, i) => list[i].includes(e));
        f.result = {backIssuesExpected: same(f.backIssues), archivesExpected: same(f.archives)};
        for (const k of ['before', 'backIssues', 'archives']) console.log(`[fact] ${f.line} ${k}: ${f[k].join(' | ')}`);
        console.log(`[fact] result ${JSON.stringify(f.result)} order ${f.order}`);
    } finally {
        record('neighbour-facts', f);
        await close();
    }
});
