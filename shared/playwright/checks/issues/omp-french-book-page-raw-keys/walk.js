// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (U69 A15):
// a press shown in French (Canada) shows raw codes in place of labels on a
// book's and a chapter's page, and a priced file's link drops the format's
// name. Takes the report's Steps on PKP's default test dataset (OMP), then
// the same pages in English (the control, and the neighbour check with the
// fix in and out):
//   1-4.   a visitor opens the French catalogue, "From Bricks to Brains: …"
//          (book 14), its "Chapter 1: Mind Control—Internal or External?"
//          page, and the first file link of the book's page
//   5-8.   dbarnes opens submission 14's workflow, "Create New Version" ›
//          "Confirm", "Chapters" › "Add Chapter" ("Afterword u69r6", pages
//          "201-210", its own page ticked), "Publish" › "Publish"
//   9.     the visitor opens "Afterword u69r6" from the French book page
//   10-11. dbarnes turns on Payments (US Dollar, Manual Fee Payment) and sets
//          book 5's one PDF file to "Direct Sales", 25.00
//   12.    the visitor opens "Bomb Canada …" (book 5) in French
//   13.    dbarnes opens the preview of the dataset's edited volume, "The
//          West and Beyond: New Perspectives on an Imagined Region"
//          (submission 2, in review, two volume editors), in French
// Reset the dataset fleet first; the walk changes books 14 and 5 and the
// press's payment settings. FIX=1 only tags the records of a run with the
// fix in. STEP=13 takes step 13 alone (it changes nothing).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, note} = require('../../../probe');
const {workflowFrame, createNewVersion, publishShownVersion} = require('../older-version-tab-current-title/lib');
const {setUpPayments, openFormats, fileTerms, setDirectSales} = require('../priced-file-link-price-twice-or-missing/lib');
const {flat, readPage, readViewPage} = require('./lib');

const T = 30_000;
const BOOK = {id: 14, title: /From Bricks to Brains/};
const CHAPTER = /Chapter 1: Mind Control/;
const NEW_CHAPTER = {title: 'Afterword u69r6', pages: '201-210'};
const PRICED = {id: 5, title: /Bomb Canada and Other Unkind Remarks/};
const PRICE = '25.00';
const VOLUME = 2;
const LANGS = ['fr_CA', 'en'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`A15 walk: ${app.name} skipped, book and chapter pages are a press's`);
        return;
    }
    const {expect} = require('@playwright/test');
    const fix = process.env.FIX ? 'fix-' : '';
    const name = (s) => `${fix}${s}`;
    const facts = {app: app.name, line: app.line || 'main', fix: !!process.env.FIX};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
    };
    const catalog = (lang) => app.url(`/index.php/${app.contextPath}/${lang}/catalog`);

    const editor = await launch(app);
    const reader = await launch(app);
    const e = editor.page;
    const r = reader.page;
    const openBook = async (lang, book) => {
        await r.goto(catalog(lang));
        await idle(r);
        await Promise.all([r.waitForLoadState('load'), r.getByRole('link', {name: book.title}).first().click()]);
    };
    const all = process.env.STEP !== '13';
    try {
        // 1-4: the dataset as loaded
        for (const lang of all ? LANGS : []) {
            await r.goto(catalog(lang));
            await idle(r);
            record(name(`${lang}-1-catalog`), await screen(r));
            await Promise.all([r.waitForLoadState('load'), r.getByRole('link', {name: BOOK.title}).first().click()]);
            fact(`${lang} 2 book`, await readPage(r, name(`${lang}-2-book`)));
            await Promise.all([r.waitForLoadState('load'), r.locator('.item.chapters').getByRole('link', {name: CHAPTER}).first().click()]);
            fact(`${lang} 3 chapter`, await readPage(r, name(`${lang}-3-chapter`)));
            await r.goBack();
            await idle(r);
            const file = r.locator('.entry_details .item.files a.cmp_download_link').first();
            fact(`${lang} 4 link`, {text: flat(await file.innerText()), href: await file.getAttribute('href')});
            await Promise.all([r.waitForLoadState('load'), file.click()]);
            fact(`${lang} 4 file view`, await readViewPage(r, name(`${lang}-4-file-view`)));
        }

        // 5-8: a chapter added in a second version
        await signIn(e, 'dbarnes');
        if (all) {
        const frame = workflowFrame(e, app);
        await frame.gotoEditorial(BOOK.id);
        await idle(e);
        const created = await createNewVersion(e, app);
        fact('6 new version', created);
        const {ChaptersPage} = require(path.join(app.suiteDir, 'pages', 'ChapterPages.js'));
        const chapters = new ChaptersPage(e, app.contextPath, {labels: {publicationGroup: 'Publication'}});
        if (app.line === 'stable-3_5_0') {
            await frame.menuLink('Chapters').last().click();
            await chapters.list.expectLoaded();
        } else {
            await chapters.gotoEditorial(BOOK.id, created.id);
        }
        const win = await chapters.list.openAdd();
        await win.fill(NEW_CHAPTER);
        await win.chapterPageBox().check();
        record(name('7-add-chapter'), await screen(e));
        await win.save();
        await expect(chapters.list.chapterBlock(NEW_CHAPTER.title)).toHaveCount(1, {timeout: T});
        fact('7 chapter added', true);
        fact('8 publish', await publishShownVersion(e));

        // 9
        for (const lang of LANGS) {
            await openBook(lang, BOOK);
            fact(`${lang} 9 book, two versions`, await readPage(r, name(`${lang}-9-book`)));
            await Promise.all([r.waitForLoadState('load'), r.locator('.item.chapters').getByRole('link', {name: NEW_CHAPTER.title}).first().click()]);
            fact(`${lang} 9 new chapter`, await readPage(r, name(`${lang}-9-new-chapter`)));
        }

        // 10-11: a file for sale
        fact('10 payments', await setUpPayments(e, app, {currency: 'USD', instructions: 'Pay by cheque u69r6'}));
        const formats = await openFormats(e, app, PRICED.id);
        const files = await fileTerms(formats, 'PDF');
        fact('11 files before', files);
        fact('11 direct sales', await setDirectSales(e, formats, 'PDF', files[0].name, PRICE));
        fact('11 files after', await fileTerms(formats, 'PDF'));
        record(name('11-formats'), await screen(e));

        // 12
        for (const lang of LANGS) {
            await openBook(lang, PRICED);
            fact(`${lang} 12 priced book`, await readPage(r, name(`${lang}-12-priced-book`)));
        }
        }

        // 13: an edited volume's preview, as the editor
        for (const lang of LANGS) {
            await e.goto(app.url(`/index.php/${app.contextPath}/${lang}/catalog/book/${VOLUME}`));
            fact(`${lang} 13 edited volume`, await readPage(e, name(`${lang}-13-edited-volume`)));
        }
        await signOut(e).catch(() => {});
    } finally {
        record(name('facts'), facts);
        await editor.close();
        await reader.close();
    }
});
