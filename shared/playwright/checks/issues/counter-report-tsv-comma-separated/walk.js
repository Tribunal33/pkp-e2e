// Issue report docs/issues/U64-A11-counter-report-tsv-comma-separated.md (U64 A11): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), as the dataset's `dbarnes`. The kit builds nothing.
//
// Precondition no screen can set (both modes): an install old enough to have COUNTER months. A
// freshly loaded dataset is installed on its dump's day, so the walk first moves the install's
// date and the publications' dates back (lib.js AGE_SQL), the two dates the app itself writes.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1. `dbarnes` › Statistics › "Counter R5".
//   2. "Edit" on "Platform Master Report (PR)": "Report Settings".
//   3. "Download": the request, its answer's headers, the file's name.
//   4. The file's lines as written (a tab shown as <TAB>).
//   Reach: the same two presses on every other report of the list.
// `neighbour` as the argument (the fix in and out; runs alone):
//   N1 Statistics › "Articles" ("Monographs", "Preprints") › "Download Report" › the first button:
//      the file stays comma-separated.
//   N2 the PR report's address typed in the browser: still JSON.
//   N3 "Report Settings" of PR with "Start Date" 2001-01, "Download": still refused, no file.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64h --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u64h PROBE_AGENT=u64h node bin/probe.js all shared/playwright/checks/issues/counter-report-tsv-comma-separated/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64h-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64h-3_5 PROBE_AGENT=u64h node bin/probe.js all shared/playwright/checks/issues/counter-report-tsv-comma-separated/walk.js
// Facts: .reports/<feature>/u64h/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');
const {openCounterR5} = require('../section-editor-counter-r5-error-while-restricted/lib');
const {WORDS, downloads, statsRequests} = require('../statistics-download-quotes-break-parameter-lines/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const DAY = '2026-06-15';
const PR = 'Platform Master Report (PR)';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const facts = {app: app.name, mode: MODE, line: app.line || 'main', dataset: app.dataset};
    for (const q of L.AGE_SQL(DAY)) sql(app, q);
    facts.aged = {
        installed: sql(app, "select date_installed from versions where product_type = 'core' order by date_installed"),
        firstPublished: sql(app, 'select min(date_published) from publications'),
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        // One report: "Edit", then "Download" (optionally a start date typed first).
        const report = async (name, {start} = {}) =>
            L.attempt(async () => {
                const win = await L.editReport(page, name);
                if (start) {
                    await win.dialog.locator('input[name="begin_date"]').fill(start);
                    await win.dialog.locator('input[name="begin_date"]').blur();
                }
                if (name === PR) record(`window-${MODE}`, await screen(page));
                const got = await L.pressDownload(page, win.dialog);
                if (got.windowOpen) {
                    record(`window-after-${MODE}`, await screen(page));
                    await L.closeWindow(page, win.dialog);
                }
                return {title: win.title, start: start || win.start, end: win.end, ...got};
            });
        if (MODE === 'steps') {
            // 1
            facts.opened = await L.attempt(() => openCounterR5(page, app, ctx));
            facts.list = await L.readList(page);
            record('counter-r5', await screen(page));
            await shot(page, 'counter-r5').catch(() => {});
            // 2–4
            facts.pr = await report(PR);
            // reach
            facts.others = {};
            for (const name of facts.list.rows.filter((n) => n !== PR)) facts.others[name] = await report(name);
        } else {
            // N1
            const {StatsPage} = require('../../../pages/UsageStatsPages.js');
            const stats = new StatsPage(page, ctx, 'articles');
            const requests = statsRequests(page);
            const types = [];
            const onResponse = (r) => /\/api\/v1\/stats\/publications/.test(r.url()) && /csv/.test(r.request().headers().accept || '') && types.push(r.headers()['content-type']);
            page.on('response', onResponse);
            facts.n1 = await L.attempt(async () => {
                await stats.goto();
                const got = await downloads(stats, requests, [WORDS[app.name].first]);
                const file = got.files[WORDS[app.name].first];
                return {button: WORDS[app.name].first, contentTypes: types.slice(), ...file};
            });
            page.off('response', onResponse);
            requests.stop();
            // N2
            facts.n2 = await L.attempt(() => L.typeAddress(page, app.url(`/index.php/${ctx}/api/v1/stats/sushi/reports/pr`)));
            // N3
            facts.opened = await L.attempt(() => openCounterR5(page, app, ctx));
            facts.n3 = await report(PR, {start: '2001-01'});
        }
    } catch (e) {
        facts.error = L.flat(e.message, 400);
    } finally {
        console.log(JSON.stringify(facts, null, 1));
        record('facts', facts);
        await close();
    }
});
