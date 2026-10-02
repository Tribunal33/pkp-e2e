// Issue report docs/issues/U64-OJS5-ir-a1-lists-investigation-rows.md (U64 OJS5): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). OJS only: the press and the preprint server have no "Journal Article Requests
// (IR_A1)" report. The kit builds nothing: the visits are a reader's, through the screens.
//
// Precondition no screen can set (the Steps' SQL): an install old enough to have COUNTER months.
// The install's date and the publications' dates are moved back (AGE_SQL of the A11 walk).
//
// Default mode, the Steps:
//   1. Signed out: "Current" › "The Signalling Theory Dividends" › "PDF".
//   2. "Current" › "Antimicrobial, …" (the article page only).
//   3. The visits made to count for 2026-09 (lib.js `monthLater()`: the usage logs staged as the
//      log of 2026-09-15, then the app's loader task and job queue).
//   4. `dbarnes` › Statistics › "Counter R5".
//   5. "Edit" on "Journal Article Requests (IR_A1)".
//   6. "Download": the file's "Metric_Types" line and its rows.
//   Reach: the report's address typed in the browser (the JSON form).
// `neighbour` as the argument (the fix in and out; changes nothing; run it after the Steps,
//   without a reset, on the figures they left):
//   N1 "Item Master Report (IR)": still lists investigations and requests.
//   N2 "Journal Usage by Access Type (TR_J3)": still lists investigations and requests.
//   N3 "Platform Usage (PR_P1)": still requests only.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64k --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u64k PROBE_AGENT=u64k node bin/probe.js ojs shared/playwright/checks/issues/ir-a1-lists-investigation-rows/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64k-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64k-3_5 PROBE_AGENT=u64k node bin/probe.js ojs shared/playwright/checks/issues/ir-a1-lists-investigation-rows/walk.js
// Facts: .reports/<feature>/u64k/facts[-neighbour][-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');
const {AGE_SQL, attempt, editReport, closeWindow, readList} = require('../counter-report-tsv-comma-separated/lib');
const {openCounterR5} = require('../section-editor-counter-r5-error-while-restricted/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const INSTALLED = '2026-06-15';
const VISIT_DAY = '2026-09-15';
const RANGE = 'begin_date=2026-07-01&end_date=2026-09-30&customer_id=0';
const REQUESTED = 'Signalling Theory Dividends';
const LOOKED_AT = 'Antimicrobial, heavy metal resistance';
const IR_A1 = 'Journal Article Requests (IR_A1)';
// The reader's browser on a stable line: an ordinary Chrome's name. stable-3_5_0's list of
// robots holds "HeadlessChrome", the name the kit's browser gives, and a robot's visits are
// dropped (main's list no longer holds it).
const READER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const {page, close} = await launch(app);
    // One report: "Edit", then "Download".
    const report = async (name) =>
        attempt(async () => {
            const win = await editReport(page, name);
            if (name === IR_A1) record(`window-${MODE}`, await screen(page));
            const got = await L.pressDownload(page, win.dialog);
            await closeWindow(page, win.dialog);
            return {title: win.title, start: win.start, end: win.end, ...got};
        });
    try {
        if (MODE === 'steps') {
            for (const q of AGE_SQL(INSTALLED)) sql(app, q);
            facts.aged = {
                installed: sql(app, "select date_installed from versions where product_type = 'core' order by date_installed"),
                firstPublished: sql(app, 'select min(date_published) from publications'),
            };
            // 1, 2: the reader, signed out
            const context = await page.context().browser().newContext(app.line && app.line !== 'main' ? {userAgent: READER} : {});
            const reader = await context.newPage();
            facts.requested = await attempt(() => L.readArticle(reader, app, REQUESTED, {pdf: true}));
            record('reader-pdf', await screen(reader).catch(() => null));
            facts.lookedAt = await attempt(() => L.readArticle(reader, app, LOOKED_AT));
            record('reader-article', await screen(reader).catch(() => null));
            await context.close();
            // 3
            facts.monthLater = await attempt(() => L.monthLater(app, VISIT_DAY));
            // 4
            await signIn(page, 'dbarnes');
            facts.opened = await attempt(() => openCounterR5(page, app, ctx));
            facts.list = await readList(page);
            record('counter-r5', await screen(page));
            await shot(page, 'counter-r5').catch(() => {});
            // 5, 6
            facts.irA1 = await report(IR_A1);
            // reach: the JSON form
            facts.json = await attempt(() => L.typeReportAddress(page, app.url(`/index.php/${ctx}/api/v1/stats/sushi/reports/ir_a1?${RANGE}`)));
        } else {
            await signIn(page, 'dbarnes');
            facts.opened = await attempt(() => openCounterR5(page, app, ctx));
            facts.n1 = await report('Item Master Report (IR)');
            facts.n2 = await report('Journal Usage by Access Type (TR_J3)');
            facts.n3 = await report('Platform Usage (PR_P1)');
            facts.n1json = await attempt(() => L.typeReportAddress(page, app.url(`/index.php/${ctx}/api/v1/stats/sushi/reports/ir?${RANGE}`)));
        }
    } catch (e) {
        facts.error = L.flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        console.log(JSON.stringify(facts, null, 1));
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
