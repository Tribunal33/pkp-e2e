// Issue report docs/issues/U20-OMP5-book-file-page-uri-names-book-page.md (U20 OMP5): a book file's
// view page gives, as "DC.Identifier.URI", an address under catalog/book that opens the book's page,
// not its own catalog/view address. Takes the report's Steps on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"): press `publicknowledge`, published book 14, whose
// "PDF" format holds two whole-book files and one file per chapter. A visitor, signed out; nothing
// is created.
//
//   1. the book's page (catalog/book/14): its DC.Identifier.URI (control)
//   2-3. side column "PDF" › "The Canadian Nutrient File: Nutrient Val.pdf": the file's page and its DC.Identifier.URI
//   4-5. that address in the address bar: the page it opens, and its DC.Title, DC.Type, DC.Identifier.URI
//   6. back; "PDF" under "Chapter 1: Mind Control…": the chapter file's page and its DC.Identifier.URI
//
// WALK=neighbour (fix in and out): what the fix must leave alone and what it must reach: the book's
// and chapter 1's pages keep their own URI; every file page linked from the book's page, read with
// its DC.Identifier, its DC.Identifier.URI and whether that URI names the page itself.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u20i --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u20i PROBE_AGENT=u20i node bin/probe.js omp shared/playwright/checks/issues/book-file-page-uri-names-book-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u20i-3_5 PROBE_AGENT=u20i node bin/probe.js omp shared/playwright/checks/issues/book-file-page-uri-names-book-page/walk.js
// Facts: .reports/<feature>/u20i/omp5-[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, screen, record, serverLog} = require('../../../probe');
const {path, openAndRead, pressAndRead, readTags, namesItself} = require('./lib');

const MODE = process.env.WALK || 'walk';
const BOOK = 14;
const WHOLE_BOOK_FILE = 'The Canadian Nutrient File: Nutrient Val.pdf';
const CHAPTER = 'Chapter 1: Mind Control';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const name = (s) => (MODE === 'walk' ? `omp5-${s}` : `omp5-${MODE}-${s}`);
    const bookUrl = app.url(`/index.php/${app.contextPath}/catalog/book/${BOOK}`);
    const log = serverLog(app);
    const from = log.mark();
    const errors = [];

    const {page, close} = await launch(app);
    page.on('pageerror', (e) => errors.push(`${page.url()}: ${String(e.message).slice(0, 200)}`));
    try {
        if (MODE === 'walk') {
            // 1
            const book = await openAndRead(page, bookUrl);
            fact('1 book page', {...book, namesItself: namesItself(book)});
            record(name('1-book'), await screen(page));
            // 2-3
            const wholeLink = page.locator('.entry_details .item.files').getByRole('link', {name: WHOLE_BOOK_FILE});
            fact('2 whole-book file links', await wholeLink.count());
            const file = await pressAndRead(page, wholeLink.first());
            fact('3 whole-book file page', {...file, namesItself: namesItself(file)});
            record(name('3-whole-book-file'), await screen(page));
            // 4-5
            if (file.uri[0]) {
                const opened = await openAndRead(page, file.uri[0]);
                fact('5 page the URI opens', {...opened, isBookPage: path(opened.url) === path(bookUrl) || /\/catalog\/book\//.test(path(opened.url)), heading: await page.locator('h1').first().textContent().catch(() => null)});
                record(name('5-uri-opens'), await screen(page));
            }
            // 6
            await page.goto(bookUrl);
            const chapterLink = page.locator('.item.chapters li').filter({hasText: CHAPTER}).getByRole('link', {name: 'PDF', exact: true});
            fact('6 chapter file links', await chapterLink.count());
            const chapterFile = await pressAndRead(page, chapterLink.first());
            fact('6 chapter file page', {...chapterFile, namesItself: namesItself(chapterFile)});
            record(name('6-chapter-file'), await screen(page));
        } else {
            const book = await openAndRead(page, bookUrl);
            fact('book page', {uri: book.uri, identifier: book.identifier, type: book.type, namesItself: namesItself(book)});
            const links = await page.locator('a[href*="/catalog/view/"]').evaluateAll((as) =>
                as.map((a) => ({text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.href, chapterFile: !!a.closest('.item.chapters')})));
            const chapterHref = await page.locator('.item.chapters li').filter({hasText: CHAPTER}).locator('a[href*="/chapter/"]').first().getAttribute('href');
            const chapter = await openAndRead(page, chapterHref);
            fact('chapter 1 page', {status: chapter.status, uri: chapter.uri, type: chapter.type, namesItself: namesItself(chapter)});
            const rows = [];
            for (const l of links) {
                await page.goto(l.href);
                await page.waitForLoadState('domcontentloaded');
                const t = await readTags(page);
                rows.push({link: l.text, chapterFile: l.chapterFile, page: path(t.url), uri: t.uri.map(path), identifier: t.identifier, type: t.type, namesItself: namesItself(t)});
            }
            fact('every file page', rows);
            record(name('files'), await screen(page));
        }
        fact('page script errors', errors);
        fact('server log', log.since(from));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
