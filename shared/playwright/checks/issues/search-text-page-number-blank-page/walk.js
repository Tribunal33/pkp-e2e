// Issue report docs/issues/U15-A13-search-text-page-number-blank-page.md (U15 A13): a Search
// results address whose page number is not a number answers a completely blank page.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS, OMP and OPS:
//   1. the home page, "Search" in the header
//   2. a word in the box (OJS "Antimicrobial", OMP "Bricks", OPS "efficacy"); "Search"
//   3. that results address with &searchPage=abc typed in
//   4. control: the same with &searchPage=9 (beyond the last page)
// NB=1 is the neighbour check for a fix trial, alone: the word's results with searchPage=1, 0,
// -1 and 9 typed in; then (OJS, OPS) rvaca sets "Items per page" to 1, and a visitor's bare
// search follows the page link "2" and ">>", which the fix must leave working.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-text-page-number-blank-page/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog} = require('../../../probe');
const L = require('../partial-date-filter-ignored/lib');
const {setItemsPerPage} = require('../archives-page-past-last-not-404/lib.js');

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

    // What the open page shows: status, title, heading, the page's text, what is listed, and
    // the server log's error lines written since `from`.
    const read = async (res, from) => {
        const out = {
            status: res ? res.status() : null,
            title: await page.title().catch(() => null),
            heading: L.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
            bodyLength: (await page.locator('body').innerText().catch(() => '')).length,
            body: L.flat(await page.locator('body').innerText().catch(() => ''), 200),
            box: await page.locator('.page_search input[name="query"]').first().inputValue({timeout: 2000}).catch(() => null),
            ...(await L.readResults(page).catch((e) => ({readError: L.flat(e.message, 200)}))),
        };
        delete out.dateFrom;
        delete out.dateTo;
        await new Promise((r) => setTimeout(r, 300)); // the server log is written after the response
        out.serverLog = log.since(from).map((l) => L.flat(l, 400)).slice(0, 3);
        return out;
    };
    const typed = async (address) => {
        const from = log.mark();
        const res = await page.goto(app.url(address));
        await idle(page).catch(() => {});
        return {address, ...(await read(res, from))};
    };
    const follow = async (locator) => {
        const from = log.mark();
        const [res] = await Promise.all([page.waitForNavigation({timeout: L.T}), locator.click({timeout: L.T})]);
        await idle(page).catch(() => {});
        return read(res, from);
    };
    const searchFor = async (word) => {
        await L.openSearch(app, page);
        const r = await L.searchWith(page, {}, word);
        delete r.dateFrom; delete r.dateTo; delete r.beforeSearch;
        return r;
    };

    try {
        if (nb) {
            await step(`n1 search "${WORD[app.name]}"`, () => searchFor(WORD[app.name]));
            const results = page.url().replace(/^https?:\/\/[^/]+/, '');
            for (const n of ['1', '0', '-1', '9']) {
                await step(`n1 searchPage=${n}`, () => typed(`${results}&searchPage=${n}`));
                record(`n1-page-${n}`, await screen(page));
            }
            if (app.name !== 'omp') { // a press's bare Search page lists nothing (U15 A6)
                await step('n2 rvaca sets "Items per page" to 1', async () => {
                    await signIn(page, 'rvaca');
                    const out = await setItemsPerPage(page, app, 1);
                    await signOut(page);
                    return out;
                });
                await step('n2 bare search', () => searchFor(''));
                record('n2-bare-page1', await screen(page));
                await step('n2 page link "2"', () => follow(page.locator('.page_search .cmp_pagination a').filter({hasText: /^\s*2\s*$/}).first()));
                record('n2-bare-page2', await screen(page));
                await step('n2 page link ">>"', () => follow(page.locator('.page_search .cmp_pagination a').filter({hasText: '>>'}).first()));
                record('n2-bare-last', await screen(page));
            }
        } else {
            // 1
            await step('1 reached by', () => L.openSearch(app, page));
            record('1-search-page', await screen(page));
            // 2
            await step(`2 search "${WORD[app.name]}"`, async () => {
                const r = await L.searchWith(page, {}, WORD[app.name]);
                delete r.dateFrom; delete r.dateTo; delete r.beforeSearch;
                return r;
            });
            record('2-results', await screen(page));
            const results = page.url().replace(/^https?:\/\/[^/]+/, '');
            fact('2 results address', results);
            // 3
            await step('3 searchPage=abc', () => typed(`${results}&searchPage=abc`));
            record('3-page-abc', await screen(page));
            // 4 control
            await step('4 control searchPage=9', () => typed(`${results}&searchPage=9`));
            record('4-page-9', await screen(page));
        }
    } finally {
        fact('page errors', errs);
        record('facts', facts);
        await close();
    }
});
