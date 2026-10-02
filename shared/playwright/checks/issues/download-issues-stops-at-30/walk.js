// Issue report docs/issues/U64-OJS4-download-issues-stops-at-30.md (U64 OJS4): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). OJS only: the press and the preprint server have no "Issues" statistics
// page. The kit builds nothing: the issues and the visits are made through the screens.
//
// Default mode, the Steps:
//   1. `dbarnes` › Issues › "Future Issues" › "Create Issue" × 30: Volume 3, Number 1 … 30,
//      Year 2026, Title "u64c 01" … "u64c 30".
//   2. Each new row › "Publish Issue", the email box unticked, "OK".
//   3. Signed out: "Archives", each of the 31 issues opened once.
//   4. The next day (lib.js `nextDay()`: the day's own log lines moved one day back, then the
//      app's own loader task and job queue): `dbarnes` › Statistics › "Issues".
//   5. "Download Report" › "Download Issues".
// `neighbour` as the argument (the fix in and out; changes nothing; run it after the Steps,
//   without a reset, on the 31 issues they left):
//   N1 the table pages: page 1 and page 2, their count lines and rows.
//   N2 a search ("No. 3"), then "Download Issues": the file holds the table's issues.
//   N3 "Download Timeline" downloads.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u64c PROBE_AGENT=u64c node bin/probe.js ojs shared/playwright/checks/issues/download-issues-stops-at-30/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64c-3_5 PROBE_AGENT=u64c node bin/probe.js ojs shared/playwright/checks/issues/download-issues-stops-at-30/walk.js
// Facts: .reports/<feature>/u64c/facts[-neighbour][-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const {flat, createAndPublishIssues, archiveIssues, visitIssues, nextDay, readIssuesTable, readFile, statsRequests} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const MARK = 'u64c';
// The reader's browser on a stable line (lib.js `visitIssues()`): an ordinary Chrome's name.
const READER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const NEW_ISSUES = Array.from({length: 30}, (_, i) => ({volume: 3, number: i + 1, year: 2026, title: `${MARK} ${String(i + 1).padStart(2, '0')}`}));

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

/** "Download Report" › a report's button: the request it sent and the file it gave. */
async function download(stats, requests, button) {
    return attempt(async () => {
        const win = await stats.openDownload();
        const out = {windowParams: await win.params(), headings: await win.headings()};
        requests.clear();
        const file = await win.download(button);
        out.request = requests.list().filter((r) => /csv/.test(r.accept || ''));
        out.file = readFile(file);
        return out;
    });
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {StatsPage} = require('../../../pages/UsageStatsPages.js');
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const requests = statsRequests(page);
    const stats = new StatsPage(page, ctx, 'issues');
    try {
        if (MODE === 'steps') {
            // 1, 2
            await signIn(page, 'dbarnes');
            facts.issues = await attempt(() => createAndPublishIssues(page, ctx, NEW_ISSUES, MARK));
            record('issues-published', await screen(page));
            // 3
            await signOut(page);
            const list = await archiveIssues(page, app);
            facts.archives = {count: list.length, first: list[0] && list[0].title, last: list.length && list[list.length - 1].title};
            record('archives', await screen(page));
            facts.visits = await visitIssues(page, list, app.line === 'main' ? {} : {userAgent: READER});
            // 4
            facts.nextDay = await attempt(() => nextDay(app));
            await signIn(page, 'dbarnes');
            facts.opened = await attempt(() => stats.goto());
            facts.page1 = await readIssuesTable(stats);
            record('stats-issues-page-1', await screen(page));
            await shot(page, 'stats-issues-page-1');
            facts.toPage2 = await attempt(() => stats.gotoPage(2));
            facts.page2 = await readIssuesTable(stats);
            record('stats-issues-page-2', await screen(page));
            facts.toPage1 = await attempt(() => stats.gotoPage(1));
            // 5
            facts.downloadIssues = await download(stats, requests, 'Download Issues');
            const d = facts.downloadIssues.file;
            if (d) {
                const title = (row) => row.replace(/(\s+\d+){3}$/, '');
                const missing = (rows) => rows.map(title).filter((t) => !d.lines.some((l) => l.includes(t)));
                facts.missingFromFile = {page1: missing(facts.page1.rows), page2: missing(facts.page2.rows)};
            }
        } else {
            await signIn(page, 'dbarnes');
            facts.opened = await attempt(() => stats.goto());
            facts.requestsOnOpen = requests.list();
            facts.page1 = await readIssuesTable(stats);
            requests.clear();
            facts.toPage2 = await attempt(() => stats.gotoPage(2));
            facts.page2 = await readIssuesTable(stats);
            facts.page2Request = requests.list();
            record('nb-page-2', await screen(page));
            facts.toPage1 = await attempt(() => stats.gotoPage(1));
            facts.search = await attempt(() => stats.search('No. 3'));
            facts.searched = await readIssuesTable(stats);
            record('nb-search', await screen(page));
            facts.downloadSearched = await download(stats, requests, 'Download Issues');
            facts.downloadTimeline = await download(stats, requests, 'Download Timeline');
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
