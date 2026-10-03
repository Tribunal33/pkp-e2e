// Issue report docs/issues/U15-A12-search-sort-by-date-error-page.md (U15 A12): a Search
// results address that asks for the sort by published date answers an error page.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS, OMP and OPS:
//   1. the home page, "Search" in the header
//   2. a word in the box (OJS "Antimicrobial", OMP "Bricks", OPS "efficacy"); "Search"
//   3. that results address with &orderBy=datePublished&orderDir=desc typed in
//   4. the same with orderDir=asc
//   control: the same with orderBy=title&orderDir=asc
// NB=1 is the neighbour check for a fix trial, alone: on the bare Search page (OJS, OPS: every
// published item; OMP: the word) no sort, the title sort both ways, the date sort both ways
// (the order and each item's publication date read back), and orderBy=publicationDate (3.5's
// name for the date sort), which the fix leaves alone.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-sort-by-date-error-page/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, screen, record, idle, serverLog, sql} = require('../../../probe');
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
        const body = L.flat(await page.locator('body').innerText().catch(() => ''), 300);
        const out = {
            address,
            status: res ? res.status() : null,
            title: await page.title().catch(() => null),
            heading: L.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
            body: body,
            ...(await L.readResults(page).catch((e) => ({readError: L.flat(e.message, 200)}))),
        };
        delete out.dateFrom;
        delete out.dateTo;
        await new Promise((r) => setTimeout(r, 300)); // the server log is written after the response
        out.serverLog = log.since(from).map((l) => L.flat(l, 600)).slice(0, 4);
        return out;
    };

    try {
        const base = `/index.php/${app.contextPath}/search/search`;
        if (nb) {
            const q = app.name === 'omp' ? WORD.omp : '';
            const addr = (extra) => `${base}?query=${encodeURIComponent(q)}${extra}`;
            await step('nb no sort', () => typed(addr('')));
            for (const [by, dir] of [['title', 'asc'], ['title', 'desc'], ['datePublished', 'desc'], ['datePublished', 'asc'], ['publicationDate', 'desc']]) {
                await step(`nb ${by} ${dir}`, () => typed(addr(`&orderBy=${by}&orderDir=${dir}`)));
                record(`nb-${by}-${dir}`, await screen(page));
            }
            // Each listed item's current publication date, to judge the date sort's order.
            await step('nb published items by date', () => sql(app, `SELECT s.submission_id, p.date_published, left(ps.setting_value, 50) FROM submissions s JOIN publications p ON p.publication_id = s.current_publication_id JOIN publication_settings ps ON ps.publication_id = p.publication_id AND ps.setting_name = 'title' AND ps.locale = 'en' WHERE p.status = 3 ORDER BY p.date_published`).split('\n'));
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
            const sep = results.includes('?') ? '&' : '?';
            // 3
            await step('3 orderBy=datePublished desc', () => typed(`${results}${sep}orderBy=datePublished&orderDir=desc`));
            record('3-date-desc', await screen(page));
            // 4
            await step('4 orderBy=datePublished asc', () => typed(`${results}${sep}orderBy=datePublished&orderDir=asc`));
            record('4-date-asc', await screen(page));
            // control
            await step('control orderBy=title asc', () => typed(`${results}${sep}orderBy=title&orderDir=asc`));
            record('5-title-asc', await screen(page));
        }
    } finally {
        fact('page errors', errs);
        record('facts', facts);
        await close();
    }
});
