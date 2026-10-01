// Neighbour check for docs/issues/U13-A4-listing-offers-galley-without-file.md
// (U13 A4), run on the state walk.js leaves, with the fix in and out: a
// signed-out reader reads every page that lists the item walk.js posted or
// published, the item's own page and another item's entry. Nothing is
// pressed or changed.
//   OPS: the home page ("Latest preprints"), "Archives", the "Preprints"
//        section page (/preprints/section/preprints), preprint 1's own page,
//        preprint 2's entry on "Archives".
//   OJS: the home page ("Latest Publications"; no current issue beside it
//        as walk.js leaves the theme), the current issue's page (article 17),
//        article 5's own page.
// The fix must take "Data u13ir19" and "Draft u13ir19" out of the lists and
// leave "PDF", "Remote u13ir19" (a galley at a separate website, no file),
// the other entries and the item's own page as they are.
// Run: PROBE_FEATURE=issues-ir19 PROBE_AGENT=ir19 PROBE_RUN=<in|out> node bin/probe.js <ojs|ops> shared/playwright/checks/issues/listing-offers-galley-without-file/reach.js
const {forEachApp, launch, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name === 'omp') return;
    if (!app.dataset) throw new Error('reach.js runs on a dataset fleet, after walk.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const labels = (entry) => (entry.listed ? entry.galleys.map((g) => g.label) : 'not listed');
    const open = async (path) => {
        const r = await page.goto(app.url(`/index.php/${ctx}${path}`));
        await idle(page);
        return r.status();
    };
    const {page, close} = await launch(app);
    try {
        if (app.name === 'ops') {
            fact('home status', await open(''));
            fact('home preprint 1', labels(await L.readEntry(page, 'preprint', 1)));
            fact('archives status', await open('/preprints'));
            fact('archives preprint 1', labels(await L.readEntry(page, 'preprint', 1)));
            fact('archives preprint 2', labels(await L.readEntry(page, 'preprint', 2)));
            fact('section status', await open('/preprints/section/preprints'));
            record('section', await screen(page));
            fact('section preprint 1', labels(await L.readEntry(page, 'preprint', 1)));
            fact('section preprint 2', labels(await L.readEntry(page, 'preprint', 2)));
            fact('preprint 1 page status', await open('/preprint/view/1'));
            fact('preprint 1 page', await L.readLanding(page));
        } else {
            fact('home status', await open(''));
            fact('home has current issue', await page.locator('.current_issue').count());
            fact('home latest publications article 5', labels(await L.readEntry(page, 'article', 5, '.latest_articles')));
            fact('issue status', await open('/issue/current'));
            fact('issue article 17', labels(await L.readEntry(page, 'article', 17)));
            fact('article 5 page status', await open('/article/view/5'));
            fact('article 5 page', await L.readLanding(page));
        }
    } finally {
        record('reach', facts);
        await close();
    }
});
