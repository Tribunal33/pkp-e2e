// Neighbour check for docs/issues/U13-OJS10-similar-articles-never-listed.md:
// the fix adds an any-word mode to the submissions collector's search for the
// "Similar Articles" list only; the editorial dashboard's search must keep
// requiring every word. As `dbarnes`, the sidebar's "Search submissions" box
// with "Transformation pigs" (submission 2 carries both words; 1, 5, 14 only
// "transformation", 12 and 16 only "pigs"). Records the result IDs the screen
// fetched and the rows shown. Walk it with the fix in and out (trial.sh).
// Run: PROBE_FEATURE=issues-ir2 PROBE_AGENT=u13ojs10 node bin/probe.js ojs shared/playwright/checks/issues/similar-articles-never-listed/neighbour.js
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const PHRASE = 'Transformation pigs';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const {page, close} = await launch(app);
    const facts = {};
    try {
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`)); await idle(page);
        const box = page.getByRole('searchbox', {name: /^Search submissions/}).first();
        await box.waitFor({state: 'visible', timeout: T});
        const resp = page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && /searchPhrase=/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        await box.pressSequentially(PHRASE, {delay: 25});
        await box.press('Enter');
        const r = await resp;
        let ids = null; let itemsMax = null;
        if (r) { try { const b = await r.json(); ids = (b.items || []).map((i) => i.id).sort((x, y) => x - y); itemsMax = b.itemsMax; } catch { /* body unreadable */ } }
        await idle(page);
        await page.getByRole('heading', {name: 'Search Results'}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        const s = await screen(page); record(`nb-search-${process.env.PROBE_RUN || 'main'}`, s); await shot(page, `nb-search-${process.env.PROBE_RUN || 'main'}`);
        facts.search = {phrase: PHRASE, status: r ? r.status() : null, ids, itemsMax,
            rows: (await page.locator('#app-main table tbody tr').allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 120))};
        console.log(`[ojs] nb-search: ${JSON.stringify(facts.search)}`);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
