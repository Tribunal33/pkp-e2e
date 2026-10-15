// Issue report docs/issues/U15-A18-search-date-filter-day-early-east-of-utc.md (U15 A18): on a site
// whose time zone is east of UTC, a full date under "Published After" or "Published Before" on the
// Search page is applied as the day before.
// Takes the report's Steps on PKP's default test dataset, as a visitor, on OJS and OPS (OMP's Search
// page has no date filters), with the site's time zone (`time_zone` in the fleet's config) set to
// each zone in ZONES in turn (default Europe/Prague, then UTC as the control), put back at the end:
//   1. the home page, "Search" in the header
//   2. empty box; Published After: the day after the dataset's publication date D; "Search"
//   3. a fresh form; Published Before: the same day; "Search"
// D is the date the dataset's published items carry (main: OJS 2026-10-12, OPS 2026-10-13; 3.5:
// both 2026-10-12, in the datasets of 2026-10-14), read from the database as a measurement, not a
// step; DAY=YYYY-MM-DD overrides the day used in steps 2 and 3 (default D+1). QUERY=<word> types it into the box (3.5 lists
// nothing for an empty box: QUERY=Antimicrobial there).
// NB=1 is the neighbour check for a fix trial, alone: Published After / Before on D and on D+1 under
// UTC and America/Vancouver (zones the fault does not reach): the same results with the fix in and out.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,ops shared/playwright/checks/issues/search-date-filter-day-early-east-of-utc/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 QUERY=Antimicrobial in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the trial)
const {forEachApp, launch, screen, record, sql} = require('../../../probe');
const L = require('../partial-date-filter-ignored/lib');

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUERY = process.env.QUERY || '';
const plusDay = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const full = (pre, iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return {[`${pre}Year`]: String(y), [`${pre}Month`]: MON[m - 1], [`${pre}Day`]: String(d)};
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'omp') {
        console.log('[fact] omp: no date filters on the press Search page (U15 OMP2); skipped');
        return;
    }
    const nb = !!process.env.NB;
    const zones = (process.env.ZONES || (nb ? 'UTC,America/Vancouver' : 'Europe/Prague,UTC')).split(',').filter(Boolean);
    const ctxId = sql(app, `select ${app.contextTables.id} from ${app.contextTables.table} where path='${app.contextPath}'`);
    const dates = sql(app, `select distinct to_char(p.date_published, 'YYYY-MM-DD') from publications p join submissions s on s.submission_id=p.submission_id where s.context_id=${ctxId} and p.status=3 and p.date_published is not null order by 1`).split('\n').filter(Boolean);
    if (dates.length !== 1) throw new Error(`expected one publication date in ${app.contextPath}, got ${dates.join(', ')}`);
    const D = dates[0];
    const day = process.env.DAY || plusDay(D, 1);
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', datasetDay: D, day, zones};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const short = (r) => ({listed: r.listed, titles: r.titles, notice: r.notice, url: r.url, dateFrom: r.dateFrom && {Year: r.dateFrom.Year, Month: r.dateFrom.Month, Day: r.dateFrom.Day}, dateTo: r.dateTo && {Year: r.dateTo.Year, Month: r.dateTo.Month, Day: r.dateTo.Day}});
    const zoneAtStart = L.readZone(app);
    fact('time_zone at start', zoneAtStart);
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url()}`); });
    try {
        for (const zone of zones) {
            L.writeZone(app, zone);
            const z = zone.replace(/\W+/g, '');
            const cases = nb
                ? [[`After ${D}`, full('dateFrom', D)], [`After ${plusDay(D, 1)}`, full('dateFrom', plusDay(D, 1))],
                    [`Before ${D}`, full('dateTo', D)], [`Before ${plusDay(D, 1)}`, full('dateTo', plusDay(D, 1))]]
                : [[`2 Published After ${day}`, full('dateFrom', day)], [`3 Published Before ${day}`, full('dateTo', day)]];
            if (!nb) {
                await step(`${zone} 1 reached by`, () => L.openSearch(app, page));
                record(`${z}-1-search-page`, await screen(page));
            }
            for (const [name, choose] of cases) {
                await L.openSearch(app, page);
                await step(`${zone} ${name}`, async () => short(await L.searchWith(page, choose, QUERY)));
                record(`${z}-${name.replace(/\W+/g, '-')}`, await screen(page));
            }
        }
    } finally {
        L.writeZone(app, zoneAtStart);
        fact('time_zone restored', L.readZone(app));
        fact('page errors', errs);
        fact('5xx', fails);
        record('facts', facts);
        await close();
    }
});
