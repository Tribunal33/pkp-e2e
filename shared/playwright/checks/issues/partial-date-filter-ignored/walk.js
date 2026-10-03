// Issue report docs/issues/U15-A1-partial-date-filter-ignored.md (U15 A1): on the Search page a
// "Published After" or "Published Before" filter with a Year but not both Month and Day is
// ignored, and its selects then show a date the reader never chose.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS and OPS (OMP's
// Search page has no date filters):
//   1. the home page, "Search" in the header
//   2. empty box; Published Before: Year 2026, Month Jan, Day blank; "Search"
//   3. a fresh form; Published After: Year 2026 alone; "Search"
//   4. (control) a fresh form; Published Before: 2026, Jan, 31; "Search"
// The year is the one the dataset's published items carry (YEAR below; the dataset of
// 2 October 2026 offers 2026 alone). QUERY=<word> types that word into the box at steps 2-4:
// 3.5's Search page lists nothing for an empty box, so its walk runs with QUERY=Antimicrobial.
// NB=1 is the neighbour check for a fix trial, alone (OJS, OPS and OMP): Month "Jan" and Day "1"
// without a Year stay ignored with blank selects; a full Published Before date keeps its
// rule; OMP's own Search page still finds a word.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/partial-date-filter-ignored/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, screen, record, idle} = require('../../../probe');
const L = require('./lib');

const YEAR = process.env.YEAR || '2026';
const QUERY = process.env.QUERY || '';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    if (app.name === 'omp' && !nb) {
        console.log('[fact] omp: no date filters on the press Search page (U15 OMP2); steps skipped');
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url()}`); });
    try {
        if (nb && app.name === 'omp') {
            await step('nb omp reached by', () => L.openSearch(app, page));
            await step('nb omp search "Bricks"', () => L.searchWith(page, {}, 'Bricks'));
            record('nb-omp-search', await screen(page));
        } else if (nb) {
            await step('nb reached by', () => L.openSearch(app, page));
            await step('nb Published After Jan 1, no Year', () => L.searchWith(page, {dateFromMonth: 'Jan', dateFromDay: '1'}));
            record('nb-no-year', await screen(page));
            await L.openSearch(app, page);
            await step(`nb Published Before ${YEAR} Oct 2 (full date)`, () => L.searchWith(page, {dateToYear: YEAR, dateToMonth: 'Oct', dateToDay: '2'}));
            record('nb-full-date', await screen(page));
            await L.openSearch(app, page);
            await step(`nb Published After ${YEAR} Oct 2 (full date)`, () => L.searchWith(page, {dateFromYear: YEAR, dateFromMonth: 'Oct', dateFromDay: '2'}));
        } else {
            // 1
            await step('1 reached by', () => L.openSearch(app, page));
            await step('1 search page before', () => L.readResults(page));
            if (QUERY) await step(`1 "${QUERY}" without filters`, () => L.searchWith(page, {}, QUERY));
            if (QUERY) await L.openSearch(app, page);
            record('1-search-page', await screen(page));
            // 2
            await step(`2 Published Before ${YEAR} Jan, no Day`, () => L.searchWith(page, {dateToYear: YEAR, dateToMonth: 'Jan'}, QUERY));
            record('2-before-year-month', await screen(page));
            // 3
            await L.openSearch(app, page);
            await step(`3 Published After ${YEAR} alone`, () => L.searchWith(page, {dateFromYear: YEAR}, QUERY));
            record('3-after-year', await screen(page));
            // 4 control
            await L.openSearch(app, page);
            await step(`4 Published Before ${YEAR} Jan 31 (control)`, () => L.searchWith(page, {dateToYear: YEAR, dateToMonth: 'Jan', dateToDay: '31'}, QUERY));
            record('4-before-full-date', await screen(page));
        }
    } finally {
        fact('page errors', errs);
        fact('5xx', fails);
        record('facts', facts);
        await close();
    }
});
