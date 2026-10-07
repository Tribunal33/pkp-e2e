// Issue report docs/issues/U20-OMP2-book-page-announces-one-pdf.md (U20 OMP2): a book whose
// format holds two PDF files of the whole book tells Google Scholar about one of them, and when
// that one is for sale the free one is not announced at all. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), on its press
// `publicknowledge` and its published book 14, whose "PDF" format holds two whole-book files.
// The kit builds nothing; the only change is step 5, made on screen.
//
//   1. sign in as dbarnes; book 14's workflow, "Publication" › "Publication Formats": the files
//   2. sign out; the book's page (catalog/book/14): the side column's file links
//   3. the page's citation_* tags
//   4. open each citation_pdf_url address signed out, as a search engine would
//   5. sign in as dbarnes; "PDF" › the file the one tag named (with more than one tag, "The
//      Canadian Nutrient File: Nutrient Val.pdf") › "Open Access": "Direct Sales", 25.00, "Save"
//   6. sign out; the book's page: the citation_* tags again
//   7. open each citation_pdf_url address signed out, and the free file's side-column address
//
// Each step records what it finds rather than throwing, so the same walk serves the fix trial
// (PROBE_RUN=fix), where the page carries two tags.
//
// WALK=neighbour (fix in and out): chapter 1's page (catalog/book/14/chapter/54) announces its
// own chapter file alone; chapter 2 has no page of its own in the dataset (its page is off) and
// answers 404 either way.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature-3_5> --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature-3_5> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js
// Facts: .reports/<feature>/<id>/omp2-[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const BOOK = 14;
const FORMAT = 'PDF';
const STEPS_FILE = 'The Canadian Nutrient File: Nutrient Val.pdf';
const PRICE = '25.00';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {openFormats, readScholarTags} = require('../book-epub-announced-as-html/lib');
    const {fileTerms, setDirectSales} = require('../priced-file-link-price-twice-or-missing/lib');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const name = (s) => (MODE === 'walk' ? `omp2-${s}` : `omp2-${MODE}-${s}`);
    const log = serverLog(app);
    const from = log.mark();
    const fileId = (address) => Number(String(address).split('?')[0].split('/').pop());
    const fileName = (id) => sql(app, `select setting_value from submission_file_settings where submission_file_id = ${Number(id)} and setting_name = 'name' and locale = 'en'`);

    const {page, close} = await launch(app);
    // What a search engine gets at an address it read from the page, signed out: each answer,
    // following redirects (the locale one included) until a file, a page or the Login page.
    const follow = async (address) => {
        const out = {address, file: fileName(fileId(address)), hops: []};
        let at = address;
        try {
            for (let n = 0; n < 5; n++) {
                const r = await page.request.get(app.url(at), {maxRedirects: 0});
                const h = r.headers();
                const location = h.location ? h.location.replace(/^https?:\/\/[^/]+/, '') : null;
                out.hops.push({at, status: r.status(), type: h['content-type'] || null, disposition: h['content-disposition'] || null, location});
                if (!location || /\/login(\?|$)/.test(location.split('#')[0])) break;
                at = location;
            }
        } catch (e) {
            out.error = String(e.message || e).slice(0, 300);
        }
        return out;
    };
    const step = async (label, fn) => {
        try {
            return await fn();
        } catch (e) {
            fact(`${label} error`, String(e.message || e).slice(0, 400));
            return null;
        }
    };
    try {
        if (MODE === 'walk') {
            // 1
            await signIn(page, 'dbarnes');
            await step('1', async () => {
                const formats = await openFormats(page, app, BOOK);
                fact('1 PDF format files', await fileTerms(formats, FORMAT));
                record(name('1-formats'), await screen(page));
            });
            fact('stored book files (id | chapterId | mimetype | created_at | price)', sql(app, `select sf.submission_file_id, coalesce((select setting_value from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'chapterId'), '-'), f.mimetype, sf.created_at, coalesce(sf.direct_sales_price, '-') from submission_files sf join files f on f.file_id = sf.file_id where sf.submission_id = ${BOOK} and sf.file_stage = 10 order by 1`));
            // 2, 3
            await signOut(page);
            const before = await step('2-3', () => readScholarTags(page, app, `catalog/book/${BOOK}`));
            fact('2-3 book page, signed out', before);
            record(name('3-book'), await screen(page));
            await shot(page, name('3-book')).catch(() => {});
            // 4
            const pdf0 = (before && before.pdf) || [];
            const tagged0 = [];
            for (const a of pdf0) tagged0.push(await follow(a));
            fact('4 tag addresses followed, signed out', tagged0);
            // 5
            const target = pdf0.length === 1 ? fileName(fileId(pdf0[0])) : STEPS_FILE;
            fact('5 file put on sale', target);
            await signIn(page, 'dbarnes');
            await step('5', async () => {
                const formats = await openFormats(page, app, BOOK);
                fact('5 terms window', await setDirectSales(page, formats, FORMAT, target, PRICE));
                fact('5 PDF format files after', await fileTerms(formats, FORMAT));
                record(name('5-formats'), await screen(page));
            });
            fact('5 stored prices (id | price)', sql(app, `select submission_file_id, coalesce(direct_sales_price, '-') from submission_files where submission_id = ${BOOK} and file_stage = 10 and submission_file_id in (108, 109) order by 1`));
            // 6
            await signOut(page);
            const after = await step('6', () => readScholarTags(page, app, `catalog/book/${BOOK}`));
            fact('6 book page, signed out', after);
            record(name('6-book'), await screen(page));
            await shot(page, name('6-book')).catch(() => {});
            // 7
            const pdf1 = (after && after.pdf) || [];
            const tagged1 = [];
            for (const a of pdf1) tagged1.push(await follow(a));
            fact('7 tag addresses followed, signed out', tagged1);
            const taggedIds = pdf1.map(fileId);
            const untagged = ((after && after.files) || []).filter((f) => /\/catalog\/(view|download)\/\d+\/\d+\/\d+$/.test(f.href || '') && [108, 109].includes(fileId(f.href)) && !taggedIds.includes(fileId(f.href)));
            const others = [];
            // the side column links the viewer page (catalog/view); its download address is the one a tag would name
            for (const f of untagged) others.push({link: f.text, side: f.href, ...(await follow(f.href.replace(/\/en\/catalog\/view\//, '/catalog/download/')))});
            fact('7 whole-book files with no tag, their side-column addresses followed', others);
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
