// Issue report docs/issues/U15-OJS1-OPS1-search-result-count-screen-reader.md (U15 OJS1, OPS1):
// the status line a screen reader announces above the Search page's results reads the raw code
// "##search.searchResults.foundPlural##" (OJS) or always "Found one item." (OPS) when more than
// one item was found.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS and OPS (OMP's
// Search page has no such line):
//   1. the home page; 2. "Search" in the header; 3. "however" in the box ("potential" on 3.5,
//      whose search drops "however" as a stop word), "Search";
//   4. the status line above the results and the line under them.
//   control: the same with one hit (OJS "dividends", OPS "Antimicrobial").
// NB=1 is the neighbour check for a fix trial, alone: one hit, no hit ("nowhereqix"), and the
// several-hit results on the French page (/fr_CA/ in the address).
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-result-count-screen-reader/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, screen, record, idle, serverLog} = require('../../../probe');
const L = require('../partial-date-filter-ignored/lib');

const manyWord = (app) => ((app.line || 'main') === 'main' ? 'however' : 'potential');
const ONE = {ojs: 'dividends', ops: 'Antimicrobial'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'omp') {
        console.log('[fact] omp: no screen-reader count on a press\'s Search page; skipped');
        return;
    }
    const nb = !!process.env.NB;
    const MANY = manyWord(app);
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));

    // What the results page says: the screen-reader status line(s) above the results, what the
    // accessibility tree exposes for them, the line under the results, the notice, the titles.
    const read = async () => {
        const status = page.locator('.page_search [role="status"]');
        const n = await status.count();
        const statusText = [];
        const statusAria = [];
        for (let i = 0; i < n; i++) {
            statusText.push(L.flat(await status.nth(i).textContent(), 200));
            statusAria.push(L.flat(await status.nth(i).ariaSnapshot().catch((e) => `aria error: ${e.message}`), 200));
        }
        const r = await L.readResults(page);
        return {url: r.url, statusText, statusAria, paging: r.paging, notice: r.notice, listed: r.listed, titles: r.titles};
    };

    const searchFor = async (word) => {
        const from = log.mark();
        await L.openSearch(app, page);
        await L.searchWith(page, {}, word);
        const out = {word, ...(await read())};
        await new Promise((r) => setTimeout(r, 300)); // the server log is written after the response
        out.serverLog = log.since(from).map((l) => L.flat(l, 400)).slice(0, 4);
        return out;
    };

    try {
        if (nb) {
            await step(`nb one hit "${ONE[app.name]}"`, () => searchFor(ONE[app.name]));
            record('nb-one', await screen(page));
            await step('nb no hit "nowhereqix"', () => searchFor('nowhereqix'));
            record('nb-none', await screen(page));
            await step(`nb French page "${MANY}"`, async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/search/search?query=${MANY}`));
                await idle(page).catch(() => {});
                return read();
            });
            record('nb-french', await screen(page));
        } else {
            // 1-2
            await step('1-2 reached by', () => L.openSearch(app, page));
            record('2-search-page', await screen(page));
            // 3-4
            await step(`3-4 search "${MANY}"`, async () => {
                const from = log.mark();
                await L.searchWith(page, {}, MANY);
                const out = await read();
                await new Promise((r) => setTimeout(r, 300));
                out.serverLog = log.since(from).map((l) => L.flat(l, 400)).slice(0, 4);
                return out;
            });
            record('4-results-many', await screen(page));
            // control
            await step(`control search "${ONE[app.name]}"`, () => searchFor(ONE[app.name]));
            record('5-results-one', await screen(page));
        }
    } finally {
        fact('page errors', errs);
        record('facts', facts);
        await close();
    }
});
