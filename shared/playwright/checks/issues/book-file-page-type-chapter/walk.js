// Issue report docs/issues/U20-OMP3-book-file-page-type-chapter.md (U20 OMP3): "DC.Type" does not
// follow whether a page describes the book or a chapter: a chapter's page reads "Text.Book", and the
// view page of a file for the whole book reads "Text.Chapter". Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"): press `publicknowledge`, published book 14, whose "PDF" format holds two
// whole-book files and one file per chapter. A visitor, signed out; nothing is created.
//
//   1. the book's page (catalog/book/14): its DC.Type
//   2. the chapter title "Chapter 1: Mind Control…": the chapter's page and its DC.Type
//   3-4. back; side column "PDF" › "The Canadian Nutrient File: Nutrient Val.pdf": the file's view page and its DC.Type
//   5-6. back; "PDF" under "Chapter 1: Mind Control…": the chapter file's view page and its DC.Type
//
// WALK=neighbour (fix in and out): what the fix must leave alone: every chapter file's view page
// keeps "Text.Chapter", and chapter 2, whose page is off, answers 404; the second whole-book file's
// view page is read too.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u20g --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u20g PROBE_AGENT=u20g node bin/probe.js omp shared/playwright/checks/issues/book-file-page-type-chapter/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u20g-3_5 PROBE_AGENT=u20g node bin/probe.js omp shared/playwright/checks/issues/book-file-page-type-chapter/walk.js
// Facts: .reports/<feature>/u20g/omp3-[neighbour-]facts[-<run>]-omp.json
const {forEachApp, launch, screen, shot, record, serverLog, idle} = require('../../../probe');
const {openAndRead, pressAndRead, readDcTags} = require('./lib');

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
    const name = (s) => (MODE === 'walk' ? `omp3-${s}` : `omp3-${MODE}-${s}`);
    const log = serverLog(app);
    const from = log.mark();

    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            // 1
            fact('1 book page', await openAndRead(page, app, `catalog/book/${BOOK}`));
            record(name('1-book'), await screen(page));
            const bookUrl = page.url();
            // 2
            const chapterTitle = page.locator('.item.chapters li').filter({hasText: CHAPTER}).locator('a[href*="/chapter/"]');
            fact('2 chapter title links', await chapterTitle.count());
            await Promise.all([page.waitForURL(/\/chapter\//), chapterTitle.first().click()]);
            await idle(page).catch(() => {});
            fact('2 chapter page', await readDcTags(page));
            record(name('2-chapter'), await screen(page));
            await page.goto(bookUrl);
            // 3-4
            const side = page.locator('.entry_details .item.files');
            const wholeLink = side.getByRole('link', {name: WHOLE_BOOK_FILE});
            fact('3 whole-book file links', await wholeLink.count());
            fact('4 whole-book file page', await pressAndRead(page, wholeLink.first()));
            record(name('4-whole-book-file'), await screen(page));
            await shot(page, name('4-whole-book-file')).catch(() => {});
            // 5-6
            await page.goto(bookUrl);
            const chapterItem = page.locator('.item.chapters li').filter({hasText: CHAPTER});
            const chapterLink = chapterItem.getByRole('link', {name: 'PDF', exact: true});
            fact('5 chapter file links', await chapterLink.count());
            fact('6 chapter file page', await pressAndRead(page, chapterLink.first()));
            record(name('6-chapter-file'), await screen(page));
        } else {
            const off = await openAndRead(page, app, `catalog/book/${BOOK}/chapter/55`);
            fact('chapter 2 page (off)', {status: off.status, type: off.type});
            const book = await openAndRead(page, app, `catalog/book/${BOOK}`);
            fact('book page', {type: book.type});
            const links = await page.locator('a.cmp_download_link[href*="/catalog/view/"]').evaluateAll((as) =>
                as.map((a) => ({text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.href, chapter: !!a.closest('.item.chapters')})));
            const rows = [];
            for (const l of links) {
                await page.goto(l.href);
                await page.waitForLoadState('domcontentloaded');
                const t = await readDcTags(page);
                rows.push({link: l.text, chapterFile: l.chapter, url: t.url, type: t.type, dcTitle: t.dcTitle[0]});
            }
            fact('every file page', rows);
            record(name('files'), await screen(page));
        }
        fact('server log', log.since(from));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
