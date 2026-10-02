// Issue report docs/issues/U64-OJS6-counter-release-4-report-name-code-path.md (U64 OJS6): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). OJS only: the press and the preprint server ship no
// "COUNTER Reports" plugin. The kit builds nothing: the file view is made through the screens.
//
// Default mode, the Steps:
//   1. Signed out: "Current" › "The Signalling Theory Dividends" › "PDF".
//   2. The next day (../download-issues-stops-at-30/lib.js `nextDay()`: the day's own log lines
//      moved one day back, then the app's own loader task and job queue): `dbarnes` ›
//      Statistics › "Reports" › "COUNTER Reports".
//   3. "Journal Report 1:" › the year link: the file and its <Report> element.
//   4. "Article Report 1:" › the year link.
// `neighbour` as the argument (the fix in and out; changes nothing; run it after the Steps,
//   without a reset, on the figures they left):
//   N1 the "COUNTER Reports" page: both report lines and their year links.
//   N2 the "Journal Report 1" address typed with the year 2001 (no figures): no file, back on the page.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64l --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u64l PROBE_AGENT=u64l node bin/probe.js ojs shared/playwright/checks/issues/counter-release-4-report-name-code-path/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64l-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64l-3_5 PROBE_AGENT=u64l node bin/probe.js ojs shared/playwright/checks/issues/counter-release-4-report-name-code-path/walk.js
// Facts: .reports/<feature>/u64l/facts[-neighbour][-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {flat, nextDay} = require('../download-issues-stops-at-30/lib');
const {attempt, readPdf, readReport, readCounterPage, typeReportAddress} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const ARTICLE = 'The Signalling Theory Dividends';
// The reader's browser on a stable line (lib.js `readPdf()`): an ordinary Chrome's name.
const READER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const REPORTS = [['JR1', 'Journal Report 1'], ['AR1', 'Article Report 1']];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {StatsReportsPage, CounterR4Page} = require('../../../pages/UsageStatsPages.js');
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const reports = new StatsReportsPage(page, ctx);
    const r4 = new CounterR4Page(page);
    const openCounterPage = () => attempt(async () => {
        await reports.goto();
        const listed = (await page.locator('main a').allInnerTexts()).map((s) => flat(s, 60)).filter(Boolean);
        await reports.reportLink('COUNTER Reports').click();
        await r4.ready();
        return {reportsListed: listed};
    });
    try {
        if (MODE === 'steps') {
            // 1
            facts.reader = await attempt(() => readPdf(page, app, ARTICLE, app.line === 'main' ? {} : {userAgent: READER}));
            record('reader-pdf', await screen(page));
            // 2
            facts.nextDay = await attempt(() => nextDay(app));
            facts.fileMetrics = sql(app, "select count(*), min(date), max(date), sum(metric) from metrics_submission where submission_file_id is not null");
            await signIn(page, 'dbarnes');
            facts.opened = await openCounterPage();
            facts.page = await readCounterPage(r4);
            record('counter-reports', await screen(page));
            await shot(page, 'counter-reports');
            // 3, 4
            facts.files = {};
            for (const [code, label] of REPORTS) {
                facts.files[code] = await attempt(async () => {
                    const years = (await r4.yearLinks(label).allInnerTexts()).map((s) => s.trim());
                    const year = years[years.length - 1];
                    return {years, pressed: year, ...readReport(await r4.downloadYear(label, year))};
                });
            }
        } else {
            await signIn(page, 'dbarnes');
            facts.opened = await openCounterPage();
            facts.page = await readCounterPage(r4);
            record('nb-counter-reports', await screen(page));
            const link = ((facts.page.lines.find((l) => l.text.startsWith('Journal Report 1')) || {}).links || [])[0];
            facts.typed2001 = link ? await attempt(() => typeReportAddress(page, app.url(link.href.replace(/year=\d{4}/, 'year=2001')))) : {error: 'no year link'};
            facts.pageAfter2001 = await readCounterPage(r4);
            record('nb-typed-2001', await screen(page));
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
