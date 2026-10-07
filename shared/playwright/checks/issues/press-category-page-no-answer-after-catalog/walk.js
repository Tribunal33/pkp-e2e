// Spec U16 OMP5: a press's first category page opened after its catalog page or its search results
// got no answer from the server (PHP 8.3 with OPcache, php-src GH-20469; the server process died with
// "Segmentation fault"). Re-check on PKP's default test dataset (a dataset fleet), signed out:
//   1  open the catalog, then the category "Applied Science"
//   2  open search results ("science"), then the category "Social Sciences"
//   3  open the catalog, then the category "Computer Vision"
// Each category answer's status, its heading, and every server-process death or error line the
// fleet's server log took meanwhile ("php -S died … (exit 139)").
//
// Reset first:  npm run fleet-prep -- --feature issues-r5 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js all shared/playwright/checks/issues/press-category-page-no-answer-after-catalog/walk.js
const {forEachApp, launch, screen, record, serverLog} = require('../../../probe');

const SEQUENCES = [
    {before: 'catalog', category: 'applied-science'},
    {before: 'search/search?query=science', category: 'social-sciences'},
    {before: 'catalog', category: 'applied-science/comp-sci/computer-vision'},
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const log = serverLog(app, {match: /died|segmentation|fatal|\[5\d\d\]/i});
    const from = log.mark();
    const {page, close} = await launch(app);
    const base = `${app.baseURL}/index.php/${app.contextPath || 'publicknowledge'}`;
    const out = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, steps: []};
    try {
        for (const [i, s] of SEQUENCES.entries()) {
            const step = {n: i + 1, ...s};
            const first = await page.goto(`${base}/${s.before}`).catch((e) => ({error: String(e.message || e)}));
            step.beforeStatus = first && first.status ? first.status() : first;
            const resp = await page.goto(`${base}/catalog/category/${s.category}`).catch((e) => ({error: String(e.message || e)}));
            step.categoryStatus = resp && resp.status ? resp.status() : resp;
            step.heading = await page.locator('h1').first().innerText().catch(() => null);
            step.screen = await screen(page).catch((e) => `screen failed: ${e.message}`);
            out.steps.push(step);
            console.log(`[fact] ${app.name} step ${i + 1}: before ${JSON.stringify(step.beforeStatus)}, category ${JSON.stringify(step.categoryStatus)}, h1 ${JSON.stringify(step.heading)}`);
        }
    } finally {
        out.serverLines = log.since(from);
        console.log(`[fact] ${app.name} server lines: ${JSON.stringify(out.serverLines).slice(0, 1500)}`);
        record('walk', out);
        await close();
    }
});
