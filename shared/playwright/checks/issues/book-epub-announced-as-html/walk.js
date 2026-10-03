// Issue report docs/issues/U20-OMP1-book-epub-announced-as-html.md (U20 OMP1): a book page tells
// Google Scholar that every file that is not a PDF (an EPUB, say) is the book's full text in HTML,
// and a real HTML file can lose its tag to it. Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), on its press `publicknowledge` and its
// published book 14. The kit builds nothing; the two uploaded files are written to the temp dir.
//
//   1. sign in as dbarnes; book 14's workflow, "Publication" › "Publication Formats"
//   2-5. "Add publication format" "EPUB"; "Change File": u20b-book.epub; "Open Access"; "Available"
//   6. the same for a format "HTML" with u20b-book.html
//   7. sign out; the book's page (catalog/book/14): its citation_* tags
//
// WALK=neighbour (fix in and out): nothing created; the book page and chapter 1's page as the
// dataset holds them: the PDF files keep "citation_pdf_url", no file is announced as HTML.
//
// Reset first:  npm run fleet-prep -- --feature issues-u20b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u20b PROBE_AGENT=u20b node bin/probe.js omp shared/playwright/checks/issues/book-epub-announced-as-html/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u20b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u20b-3_5 PROBE_AGENT=u20b node bin/probe.js omp shared/playwright/checks/issues/book-epub-announced-as-html/walk.js
// Facts: .reports/<feature>/u20b/omp1-[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const BOOK = 14;

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {bookFiles, openFormats, addFormatWithFile, readScholarTags} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const name = (s) => (MODE === 'walk' ? `omp1-${s}` : `omp1-${MODE}-${s}`);
    const log = serverLog(app);
    const from = log.mark();
    const mimetypes = () =>
        sql(app, `select sf.submission_file_id, f.mimetype, sf.assoc_id from submission_files sf join files f on f.file_id = sf.file_id where sf.submission_id = ${BOOK} and sf.file_stage = 10 order by sf.submission_file_id`);

    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            const files = bookFiles();
            // 1
            await signIn(page, 'dbarnes');
            const formats = await openFormats(page, app, BOOK);
            // 2-5
            try {
                fact('2-5 EPUB', await addFormatWithFile(page, app, formats, 'EPUB', files.epub));
            } catch (e) {
                fact('2-5 EPUB failed', String(e.message).slice(0, 400));
            }
            // 6
            try {
                fact('6 HTML', await addFormatWithFile(page, app, formats, 'HTML', files.html));
            } catch (e) {
                fact('6 HTML failed', String(e.message).slice(0, 400));
            }
            record(name('6-formats'), await screen(page));
            await shot(page, name('6-formats')).catch(() => {});
            fact('stored files (id | mimetype | format)', mimetypes());
            // 7
            await signOut(page);
            fact('7 book page, signed out', await readScholarTags(page, app, `catalog/book/${BOOK}`));
            record(name('7-book'), await screen(page));
        } else {
            fact('stored files (id | mimetype | format)', mimetypes());
            fact('book page, signed out', await readScholarTags(page, app, `catalog/book/${BOOK}`));
            fact('chapter 1 page, signed out', await readScholarTags(page, app, `catalog/book/${BOOK}/chapter/54`));
            record(name('chapter'), await screen(page));
        }
        fact('server log', log.since(from));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
