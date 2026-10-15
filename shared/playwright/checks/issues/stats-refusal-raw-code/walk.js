// Issue report docs/issues/U64-A14-stats-refusal-raw-code.md (U64 A14): the report's Steps to
// reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing: the one context is made through the screens. Helpers in lib.js beside
// it (copied from the U64 A1 walk, docs/issues/U64-A1-all-dates-error-nothing-published.md).
//
// Default mode (OJS, OMP, OPS):
//   Through the page: `admin` › Administration › Hosted Journals › "Create Journal" ("hkk10
//     Journal", path `hkk10`), Statistics › Articles of `hkk10` › "All dates": the "Error" window.
//   In the address bar: `dbarnes`, then the statistics API addresses of `publicknowledge` below,
//     each answer's status and body; the last one is the control (a refusal the code translates).
// `neighbour` as the argument (changes nothing; the fix in and out): `dbarnes` › Statistics ›
//   Articles of `publicknowledge` with its arrival range, then "Last 90 days", and the same API
//   addresses with dates the server accepts.
// Each step records what it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-k8 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-k8 PROBE_AGENT=k10 node bin/probe.js all shared/playwright/checks/issues/stats-refusal-raw-code/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k8-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k8-3_5 PROBE_AGENT=k10 node bin/probe.js all shared/playwright/checks/issues/stats-refusal-raw-code/walk.js
// Facts: .reports/<feature>/k10/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {flat, createContext, statsAnswers, openStats, choosePreset, readStats, dismissError} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

/** The addresses typed in the address bar: [name, path after /index.php/<ctx>/, apps or null for all]. */
const REFUSED = [
    ['a-publications-early', 'api/v1/stats/publications?dateStart=2000-01-01'],
    ['b-publications-order', 'api/v1/stats/publications?orderDirection=up'],
    ['c-editorial-early', 'api/v1/stats/editorial?dateStart=2000-01-01'],
    ['d-users-early', 'api/v1/stats/users?registeredAfter=2000-01-01'],
    ['e-issues-early', 'api/v1/stats/issues?dateStart=2000-01-01', ['ojs']],
    ['f-control-interval', 'api/v1/stats/publications/1/timeline?timelineInterval=year'],
];
const ACCEPTED = [
    ['a-publications-ok', 'api/v1/stats/publications?dateStart=2001-01-01'],
    ['b-publications-order-ok', 'api/v1/stats/publications?orderDirection=ASC'],
    ['c-editorial-ok', 'api/v1/stats/editorial?dateStart=2001-01-01'],
    ['d-users-ok', 'api/v1/stats/users?registeredAfter=2001-01-01'],
    ['e-issues-ok', 'api/v1/stats/issues?dateStart=2001-01-01', ['ojs']],
    ['f-control-interval-ok', 'api/v1/stats/publications/1/timeline?timelineInterval=month'],
];

/** Type each address in the address bar; keep the status and the body as the browser shows it. */
async function addressBar(page, app, ctx, list) {
    const out = {};
    for (const [name, path, apps] of list) {
        if (apps && !apps.includes(app.name)) continue;
        try {
            const r = await page.goto(app.url(`/index.php/${ctx}/${path}`));
            const body = r ? await r.text() : null;
            out[name] = {path: `/index.php/${ctx}/${path}`, status: r ? r.status() : null, body: flat(body, 400)};
        } catch (e) {
            out[name] = {path, error: flat(e.message, 200)};
        }
    }
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        if (MODE === 'steps') {
            await signIn(page, 'admin');
            facts.created = await createContext(page, app, {name: 'hkk10 Journal', initials: 'HKK10', path: 'hkk10', email: 'hkk10@mailinator.com'})
                .catch((e) => ({error: flat(e.message, 300)}));
            const answers = statsAnswers(page);
            facts.opened = await openStats(page, app, 'hkk10', 'publications');
            facts.before = await readStats(page);
            answers.clear();
            facts.offered = await choosePreset(page, 'All dates').catch((e) => ({error: flat(e.message, 200)}));
            facts.after = await readStats(page);
            facts.answers = await answers.list();
            answers.stop();
            record('page-all-dates', await screen(page));
            await shot(page, 'page-all-dates');
            facts.errorWindow = await dismissError(page);
            await page.context().clearCookies();
            await signIn(page, 'dbarnes');
            facts.addressBar = await addressBar(page, app, app.contextPath, REFUSED);
            record('address-bar-last', await screen(page));
        } else {
            await signIn(page, 'dbarnes');
            const answers = statsAnswers(page);
            facts.opened = await openStats(page, app, app.contextPath, 'publications');
            facts.arrival = await readStats(page);
            answers.clear();
            facts.offered = await choosePreset(page, 'Last 90 days').catch((e) => ({error: flat(e.message, 200)}));
            facts.last90 = await readStats(page);
            facts.answers = await answers.list();
            answers.stop();
            record('nb-last-90', await screen(page));
            facts.addressBar = await addressBar(page, app, app.contextPath, ACCEPTED);
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
