// Issue report docs/issues/U64-A8-statistics-download-quotes-break-parameter-lines.md (U64 A8): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing: the issue of step 5 is made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS; the press and the server with their own words):
//   1. `dbarnes` › Statistics › "Articles" ("Monographs", "Preprints").
//   2. The search box: `"Signalling Theory"` with its double quotes (press: `"Bomb Canada"`), Enter.
//   3. "Download Report": the window's "Search Phrase" row.
//   4. "Download Articles" ("Download Monographs", "Download Preprints"), "Download Files",
//      "Download Timeline": each file's lines.
//   Then, the cell left open: the phrase `Theory"` (one double quote, at the end), "Download Articles".
//   OJS only, the filter line:
//   5. Issues › "Future Issues" › "Create Issue": Volume 3, Number 1, Year 2026, Title
//      `u64f "Open" issue`; its row › "Publish Issue", the email box unticked, "OK".
//   6. Statistics › "Articles" › "Filters" › "Issues" › that issue.
//   7. "Download Report" › "Download Articles" (the "Filters" panel left open).
// `neighbour` as the argument (the fix in and out; creates nothing):
//   N1 no phrase, no filter: "Download Articles" and "Download Timeline".
//   N2 a plain phrase (`Signalling`; press: `Bomb`): the table and "Download Articles".
//   N3 the quoted phrase: the table's rows and the window's "Search Phrase" row (as typed).
//   N4 OJS: the filter "Vol. 1 No. 2 (2014)" under "Issues": "Download Articles".
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u64f PROBE_AGENT=u64f node bin/probe.js all shared/playwright/checks/issues/statistics-download-quotes-break-parameter-lines/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64f-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64f-3_5 PROBE_AGENT=u64f node bin/probe.js all shared/playwright/checks/issues/statistics-download-quotes-break-parameter-lines/walk.js
// Facts: .reports/<feature>/u64f/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {WORDS, flat, attempt, statsRequests, createAndPublishIssue, readTable, downloads} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const MARK = 'u64f';
const ISSUE = {volume: 3, number: 1, year: 2026, title: `${MARK} "Open" issue`};

forEachApp(async (app) => {
    const {StatsPage} = require('../../../pages/UsageStatsPages.js');
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const w = WORDS[app.name];
    const quoted = `"${w.phrase}"`;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const requests = statsRequests(page);
    const stats = new StatsPage(page, ctx, 'articles');
    const all = [w.first, 'Download Files', 'Download Timeline'];
    try {
        await signIn(page, 'dbarnes');
        facts.opened = await attempt(() => stats.goto());
        facts.heading = flat(await stats.heading.innerText().catch(() => null), 80);
        if (MODE === 'steps') {
            // 1–4
            facts.before = await readTable(stats);
            facts.search = await attempt(() => stats.search(quoted));
            facts.quoted = {phrase: quoted, table: await readTable(stats)};
            record('search-quoted', await screen(page));
            Object.assign(facts.quoted, await downloads(stats, requests, all));
            const win = await attempt(() => stats.openDownload());
            if (win && !win.error) {
                record('window-quoted', await screen(page));
                await shot(page, 'window-quoted');
                await win.close();
            }
            // the cell left open
            const open = `${w.phrase.split(' ').pop()}"`;
            facts.searchOpen = await attempt(() => stats.search(open));
            facts.open = {phrase: open, table: await readTable(stats), ...(await downloads(stats, requests, [w.first]))};
            // 5–7
            if (app.name === 'ojs') {
                facts.issue = await attempt(() => createAndPublishIssue(page, ctx, ISSUE, MARK));
                record('issue-published', await screen(page));
                facts.reopened = await attempt(() => stats.goto());
                facts.filter = await attempt(async () => {
                    await stats.toggleFilters();
                    const offered = (await stats.filterNames('Issues').allInnerTexts()).map((s) => flat(s, 120));
                    const name = offered.find((n) => n.includes(MARK));
                    await stats.pressFilter('Issues', name);
                    record('filter-pressed', await screen(page));
                    return {offered, pressed: name};
                });
                facts.filtered = {table: await readTable(stats), ...(await downloads(stats, requests, [w.first]))};
            }
        } else {
            // N1
            facts.plainPage = {table: await readTable(stats), ...(await downloads(stats, requests, [w.first, 'Download Timeline']))};
            // N2
            facts.searchPlain = await attempt(() => stats.search(w.plain));
            facts.plainPhrase = {phrase: w.plain, table: await readTable(stats), ...(await downloads(stats, requests, [w.first]))};
            // N3
            requests.clear();
            facts.searchQuoted = await attempt(() => stats.search(quoted));
            facts.quotedOnScreen = {phrase: quoted, request: requests.list(), table: await readTable(stats)};
            facts.quotedOnScreen.window = await attempt(async () => {
                const win = await stats.openDownload();
                const params = await win.params();
                record('nb-window-quoted', await screen(page));
                await win.close();
                return params;
            });
            // N4
            if (app.name === 'ojs') {
                facts.cleared = await attempt(() => stats.clearSearch());
                facts.filter = await attempt(async () => {
                    await stats.toggleFilters();
                    await stats.pressFilter('Issues', 'Vol. 1 No. 2 (2014)');
                    return 'pressed';
                });
                facts.filtered = {table: await readTable(stats), ...(await downloads(stats, requests, [w.first]))};
            }
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        requests.stop();
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
