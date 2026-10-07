// Issue report docs/issues/U15-A17-search-unknown-sort-error-page.md (U15 A17): a Search
// results address carrying a sort the page does not know answers an empty error page.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS, OMP and OPS:
//   1. the home page, "Search" in the header
//   2. a word in the box (OJS "Antimicrobial", OMP "Bricks", OPS "efficacy"); "Search"
//   3. that results address with &orderBy=publicationDate&orderDir=desc typed in
//   4. the same with &orderBy=titel&orderDir=asc
//   5. the same with &orderBy=featured (a journal and a server; a press knows that sort)
//   control: the same with &orderBy=title&orderDir=asc
// NB=1 is the neighbour check for a fix trial, alone: on the Search page for the same word,
// no sort, the title sort both ways, the date sort (datePublished, U15 A12's own fault on
// PostgreSQL, which the fix leaves alone) and, on a press, orderBy=featured.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-unknown-sort-error-page/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, screen, record, idle, serverLog} = require('../../../probe');
const L = require('../partial-date-filter-ignored/lib');

const WORD = {ojs: 'Antimicrobial', omp: 'Bricks', ops: 'efficacy'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
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

    // Opens a typed address; returns the status, the page title and heading, what is listed,
    // and the server log's error lines the request wrote.
    const typed = async (address) => {
        const from = log.mark();
        const res = await page.goto(app.url(address));
        await idle(page).catch(() => {});
        const out = {
            address,
            status: res ? res.status() : null,
            title: await page.title().catch(() => null),
            heading: L.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
            body: L.flat(await page.locator('body').innerText().catch(() => ''), 300),
            ...(await L.readResults(page).catch((e) => ({readError: L.flat(e.message, 200)}))),
        };
        delete out.dateFrom;
        delete out.dateTo;
        await new Promise((r) => setTimeout(r, 300)); // the server log is written after the response
        out.serverLog = log.since(from).map((l) => L.flat(l, 600)).slice(0, 4);
        return out;
    };

    try {
        // 1
        await step('1 reached by', () => L.openSearch(app, page));
        if (!nb) record('1-search-page', await screen(page));
        // 2
        await step(`2 search "${WORD[app.name]}"`, async () => {
            const r = await L.searchWith(page, {}, WORD[app.name]);
            delete r.dateFrom; delete r.dateTo; delete r.beforeSearch;
            return r;
        });
        if (!nb) record('2-results', await screen(page));
        const results = page.url().replace(/^https?:\/\/[^/]+/, '');
        fact('2 results address', results);
        const sep = results.includes('?') ? '&' : '?';
        const at = (extra) => `${results}${sep}${extra}`;
        if (nb) {
            const sorts = [['title', 'asc'], ['title', 'desc'], ['datePublished', 'desc']];
            if (app.name === 'omp') sorts.push(['featured', 'desc']);
            for (const [by, dir] of sorts) {
                await step(`nb ${by} ${dir}`, () => typed(at(`orderBy=${by}&orderDir=${dir}`)));
                record(`nb-${by}-${dir}`, await screen(page));
            }
        } else {
            // 3
            await step('3 orderBy=publicationDate desc', () => typed(at('orderBy=publicationDate&orderDir=desc')));
            record('3-publicationDate', await screen(page));
            // 4
            await step('4 orderBy=titel asc', () => typed(at('orderBy=titel&orderDir=asc')));
            record('4-titel', await screen(page));
            // 5
            await step('5 orderBy=featured', () => typed(at('orderBy=featured')));
            record('5-featured', await screen(page));
            // control
            await step('control orderBy=title asc', () => typed(at('orderBy=title&orderDir=asc')));
            record('6-title-asc', await screen(page));
        }
    } finally {
        fact('page errors', errs);
        record('facts', facts);
        await close();
    }
});
