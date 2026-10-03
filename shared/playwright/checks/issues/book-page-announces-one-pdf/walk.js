// Issue report docs/issues/U20-OMP2-book-page-announces-one-pdf.md (U20 OMP2): a book whose
// format holds two PDF files of the whole book tells Google Scholar about one of them. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), on
// its press `publicknowledge` and its published book 14, whose "PDF" format holds two whole-book
// files. The kit builds nothing, and nothing is created.
//
//   1. sign in as dbarnes; book 14's workflow, "Publication" › "Publication Formats": the files
//   2. sign out; the book's page (catalog/book/14): the side column's file links
//   3. the page's citation_* tags
//
// WALK=neighbour (fix in and out): chapter 1's page (catalog/book/14/chapter/54) announces its
// own chapter file alone; chapter 2 has no page of its own in the dataset (its page is off) and
// answers 404 either way.
//
// Reset first:  npm run fleet-prep -- --feature issues-u20b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u20b PROBE_AGENT=u20b node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u20b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u20b-3_5 PROBE_AGENT=u20b node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js
// Facts: .reports/<feature>/u20b/omp2-[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const BOOK = 14;

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {openFormats, readScholarTags} = require('../book-epub-announced-as-html/lib');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const name = (s) => (MODE === 'walk' ? `omp2-${s}` : `omp2-${MODE}-${s}`);
    const log = serverLog(app);
    const from = log.mark();

    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            // 1
            await signIn(page, 'dbarnes');
            const formats = await openFormats(page, app, BOOK);
            fact('1 PDF format files', (await formats.fileRows('PDF').evaluateAll((rows) => rows.map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)))));
            record(name('1-formats'), await screen(page));
            fact('stored book files (id | chapterId | mimetype)', sql(app, `select sf.submission_file_id, coalesce((select setting_value from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'chapterId'), '-'), f.mimetype from submission_files sf join files f on f.file_id = sf.file_id where sf.submission_id = ${BOOK} and sf.file_stage = 10 order by 1`));
            // 2, 3
            await signOut(page);
            fact('2-3 book page, signed out', await readScholarTags(page, app, `catalog/book/${BOOK}`));
            record(name('3-book'), await screen(page));
            await shot(page, name('3-book')).catch(() => {});
        } else {
            fact('chapter 1 page', await readScholarTags(page, app, `catalog/book/${BOOK}/chapter/54`));
            fact('chapter 2 page', await readScholarTags(page, app, `catalog/book/${BOOK}/chapter/55`));
            record(name('chapter'), await screen(page));
        }
        fact('server log', log.since(from));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
