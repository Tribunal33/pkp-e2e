// Issue report docs/issues/U19-OMP6-oai-series-set-name-leading-space.md (U19 OMP6) {OMP}: the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), press `publicknowledge`. The kit builds nothing.
//
//   1. signed out: …/oai?verb=ListSets, in the browser (what the page shows)
//   2. the same address as sent (the page's source): each <setName> between quotes
//   neighbour and control: the same list at …/fr_CA/oai; then `dbarnes` adds a series with a
//      prefix on Settings › Press › "Series" › "Add Series" (Prefix "The", Title "Annals u19a13",
//      Path "annals-u19a13") and the list is read again: "The Annals u19a13" with the fix in and
//      out; the Series table, and the series' name on the page of a book in a series (book 14).
//
// Reset first:  npm run fleet-prep -- --feature issues-a13 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-a13 PROBE_AGENT=a13 node bin/probe.js omp shared/playwright/checks/issues/oai-series-set-name-leading-space/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a13-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a13-3_5 PROBE_AGENT=a13 node bin/probe.js omp shared/playwright/checks/issues/oai-series-set-name-leading-space/walk.js
// Facts: .reports/<feature>/a13/sets-facts[-<run>]-omp.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {SectionsTab} = require('../../../pages/SectionsPages.js');

const CTX = 'publicknowledge';
const SERIES = {prefix: 'The', title: 'Annals u19a13', path: 'annals-u19a13'};

/** ListSets as sent: each set's spec and its name exactly as it stands between the tags. */
async function setsAsSent(app, ctx) {
    const a = await readOai(app.baseURL, ctx, 'verb=ListSets');
    const sets = [...a.body.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((m) => ({spec: m[1], name: m[2]}));
    return {status: a.status, address: a.url.replace(app.baseURL, ''), sets};
}

/** ListSets in the browser view: the "setName" rows as the page shows them, and as the page holds them. */
async function setsShown(page, app, ctx, name) {
    const r = await page.goto(app.url(`/index.php/${ctx}/oai?verb=ListSets`), {waitUntil: 'load'});
    await page.waitForTimeout(500);
    const rows = await page.locator('tr').filter({has: page.locator('td.key', {hasText: /^\s*setName\s*$/})}).locator('td.value')
        .evaluateAll((tds) => tds.map((td) => ({shown: td.innerText, held: td.textContent})));
    await shot(page, name).catch(() => {});
    return {status: r ? r.status() : null, rows};
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return console.log(`[walk] ${app.name}: no series; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main'};
    const say = (name, value) => console.log(`[fact] omp ${String(name).padEnd(30)} ${typeof value === 'string' ? value : JSON.stringify(value)}`);
    const quote = (r) => `${r.status} ${r.address}: ${r.sets.map((s) => `${s.spec} "${s.name}"`).join(', ')}`;
    const {page, close} = await launch(app);
    try {
        facts.step1 = await setsShown(page, app, CTX, 'listsets-view');
        say('step 1 the page', `${facts.step1.status} shown ${JSON.stringify(facts.step1.rows.map((x) => x.shown))} held ${JSON.stringify(facts.step1.rows.map((x) => x.held))}`);
        facts.step2 = await setsAsSent(app, CTX);
        say('step 2 as sent', quote(facts.step2));
        facts.french = await setsAsSent(app, `${CTX}/fr_CA`);
        say('neighbour fr_CA as sent', quote(facts.french));

        // control: a series with a prefix, made on screen
        try {
            await signIn(page, 'dbarnes');
            const tab = new SectionsTab(page, CTX, {tab: 'Series', addLabel: 'Add Series', locale: 'en'});
            await tab.goto();
            const win = await tab.openAdd();
            await win.type('title[en]', SERIES.title);
            await win.type('prefix[en]', SERIES.prefix);
            await win.type('path', SERIES.path);
            const saved = await win.saveAndClose();
            await idle(page).catch(() => {});
            facts.added = {status: saved.status(), table: (await tab.grid().locator('tr.gridRow').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())};
            say('control: series added', facts.added);
            await shot(page, 'series-table').catch(() => {});
            await signOut(page);
            facts.control = await setsAsSent(app, CTX);
            say('control as sent', quote(facts.control));
            // a book in a series: its page names the series through the same method
            await page.goto(app.url(`/index.php/${CTX}/en/catalog/book/14`), {waitUntil: 'load'});
            facts.bookPage = await page.locator('.item.series .value').first().evaluate((e) => ({shown: e.innerText, held: e.textContent.replace(/\s+/g, ' ')})).catch(() => null);
            say('neighbour book 14 "Series"', facts.bookPage);
        } catch (e) {
            facts.controlError = String(e.stack || e.message).slice(0, 600);
            say('control FAILED', facts.controlError);
        }
    } finally {
        record(process.env.PROBE_NAME || 'sets-facts', facts);
        await close();
    }
});
