// Issue report docs/issues/U68-A9-catalog-old-search-address-not-found.md (U68 A9): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). A reader's steps: no sign-in, nothing created or changed. OMP only (the catalog is a
// press's page).
//
// Default mode: the press's home page, "Search" in the top menu and "Bomb" searched there (the
//   control: today's Search page), then the old catalog search address typed as an old link holds it (no locale,
//   with `?query=Bomb`) and with the locale and no words; each read where it lands.
// `neighbour` as the argument (the fix in and out; runs alone): the catalog page, an address the
//   catalog never had (`catalog/nosuch`, which must stay a 404), and the Search page typed with
//   `?query=Bomb`.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u68c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u68c PROBE_AGENT=u68c node bin/probe.js omp shared/playwright/checks/issues/catalog-old-search-address-not-found/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u68c-3_5 PROBE_AGENT=u68c node bin/probe.js omp shared/playwright/checks/issues/catalog-old-search-address-not-found/walk.js
// Facts: .reports/<feature>/u68c/facts[-neighbour][-<run>]-omp.json
const {forEachApp, launch, idle, record, shot, serverLog} = require('../../../probe');
const {flat, rel, prefix, readLanded, typeAddress} = require('../report-address-unknown-name-404/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const QUERY = 'Bomb';

/** The page's list of book titles (catalog and Search pages), at most ten. */
async function titles(page) {
    return page.locator('.pkp_structure_main h2 a, .pkp_structure_main h3 a, .pkp_structure_main .title a').evaluateAll((as) => as.map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10)).catch(() => []);
}

/** The value in the Search page's own search box, when the page has one. */
async function searchBoxValue(page) {
    const box = page.locator('form.pkp_search input[name="query"]').first();
    return (await box.count()) ? box.inputValue().catch(() => null) : null;
}

async function land(page, app, path) {
    const r = await typeAddress(page, app, path);
    r.titles = await titles(page);
    r.searchBox = await searchBoxValue(page);
    return r;
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const ctx = `/index.php/${app.contextPath}`;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        if (MODE === 'steps') {
            // 1. The press's home page.
            await page.goto(app.url(ctx));
            await idle(page).catch(() => {});
            facts.home = await readLanded(page, null);
            // 2. "Search" in the top menu, then "Bomb" in the Search page's box and "Search" (control).
            await page.getByRole('navigation').getByRole('link', {name: 'Search', exact: true}).first().click();
            await idle(page).catch(() => {});
            facts.searchPage = await readLanded(page, null);
            await page.locator('form.pkp_search input[name="query"]').first().fill(QUERY);
            await Promise.all([page.waitForLoadState('load').catch(() => {}), page.locator('form.pkp_search').first().getByRole('button', {name: 'Search', exact: true}).click()]);
            await page.waitForURL(/query=/, {timeout: 15_000}).catch(() => {});
            await idle(page).catch(() => {});
            facts.search = {...(await readLanded(page, null)), titles: await titles(page), searchBox: await searchBoxValue(page)};
            await shot(page, 'steps-2-search');
            // 3. The old address, as an old link holds it (no locale), with the search words.
            facts.oldLink = await land(page, app, `${ctx}/catalog/results?query=${QUERY}`);
            await shot(page, 'steps-3-old-link');
            // 4. With the locale and no words.
            facts.oldLinkNoWords = await land(page, app, `${prefix(app)}/catalog/results`);
            // The address the catalog never had, for comparison.
            facts.neverHad = await land(page, app, `${prefix(app)}/catalog/nosuch`);
        } else {
            facts.catalog = await land(page, app, `${prefix(app)}/catalog`);
            facts.neverHad = await land(page, app, `${prefix(app)}/catalog/nosuch`);
            facts.search = await land(page, app, `${prefix(app)}/search/search?query=${QUERY}`);
        }
    } catch (e) {
        facts.error = flat(e.message, 400);
        facts.at = rel(page.url());
    } finally {
        facts.serverLog = log.since(from).map((l) => flat(l, 300)).slice(0, 20);
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
