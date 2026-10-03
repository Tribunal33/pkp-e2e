// U73 A20 {OMP}: "Direct Sales" with a price of 0 is saved; the file's link keeps reading
// "Direct Sales", the terms window reopens on "Open Access", and a visitor gets the file free.
// The issue report's Steps, on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), its press `publicknowledge` and its published book 14. The kit builds nothing.
// Spec: docs/specs/U73-publication-formats-proof-terms.md, register A20.
// Issue report: docs/issues/U73-A20-direct-sales-price-zero-gives-file-free.md
//
// Default mode, the report's steps 1 to 6:
//   dbarnes sets up "US Dollar" and "Manual Fee Payment"; book 14 › "Publication Formats";
//   "chapter1.pdf" › "Direct Sales", 0, "Save"; the link read, the window reopened and read;
//   a visitor reads chapter 1's link on the book page and presses it.
// MODE=decimal takes the report's second group of steps alone, after the same step 1:
//   "chapter4.pdf" › "Direct Sales" at "0.00"; a visitor presses chapter 4's link; aclark presses it,
//   "Send notification of payment", "Continue"; dbarnes saves it as "Open Access" (the way round);
//   aclark presses it again.
// MODE=neighbour runs alone the cases a fix must leave alone, after the same step 1:
//   "chapter2.pdf" › "Direct Sales" at 25.00 and "chapter3.pdf" › "Open Access" saved again, each
//   link and reopened window read, a visitor presses both chapters' links; and the reach,
//   "chapter4.pdf" › "Direct Sales" at "0.00", read the same way, with aclark pressing its link.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/direct-sales-price-zero-gives-file-free/walk.js
//               (PKP_E2E_LINE=stable-3_5_0 in front for 3.5)
// Records the screens and what each shows; asserts nothing.
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');

const MODE = process.env.MODE || 'walk';
const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FORMAT = 'PDF';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // file terms and files for sale exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const P = require('../priced-file-link-price-twice-or-missing/lib');
    const A9 = require('../priced-file-no-payment-method-turns-readers-away/lib');
    const L = require('./lib');

    const facts = {mode: MODE, app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            fact(k, v);
            return v;
        } catch (e) {
            fact(k, {error: String(e && e.message).split('\n')[0]});
            return null;
        }
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);

    // Set one file's terms, read its link and the reopened window.
    const terms = async (n, fileName, choice, price) => {
        let formats = await P.openFormats(page, app, BOOK);
        await step(`${n} ${fileName} link before`, () => L.termsLinkOf(formats, FORMAT, fileName));
        if (choice === 'directSales') await step(`${n} ${fileName} Direct Sales ${price} saved`, () => A9.setDirectSales(page, formats, FORMAT, fileName, price));
        else await step(`${n} ${fileName} Open Access saved`, () => L.saveOpenAccess(page, formats, FORMAT, fileName));
        record(`a20-${MODE}-${n}-${fileName}-saved`, await screen(page));
        formats = await P.openFormats(page, app, BOOK); // a fresh load of the list, as after a reload
        await step(`${n} ${fileName} link after`, () => L.termsLinkOf(formats, FORMAT, fileName));
        await step(`${n} ${fileName} window reopened`, () => A9.reopenTerms(page, formats, FORMAT, fileName));
    };
    try {
        await signIn(page, 'dbarnes');
        await step('1 payments set up', () => P.setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u73l'}));
        record(`a20-${MODE}-1-payments`, await screen(page));

        if (MODE === 'decimal') {
            // The report's second group: "chapter4.pdf" at "0.00", a visitor, aclark and the payment
            // page, then the way round ("Open Access") and aclark again.
            await terms('d2', 'chapter4.pdf', 'directSales', '0.00');
            await signOut(page);
            await step('d4 book page (visitor)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
            await step('d4 Chapter 4: links', () => A9.chapterLinks(page, 'Chapter 4:'));
            await step('d4 visitor presses Chapter 4:', () => A9.pressChapterLink(page, 'Chapter 4:'));
            await signIn(page, 'aclark');
            await P.openBook(page, app, TITLE).catch(() => {});
            await step('d5 aclark presses Chapter 4:', () => A9.pressChapterLink(page, 'Chapter 4:'));
            record(`a20-${MODE}-5-payment`, await screen(page));
            await shot(page, `a20-${MODE}-5-payment`).catch(() => {});
            await step('d6 notification sent, Continue', () => L.notifyAndContinue(page));
            record(`a20-${MODE}-6-after`, await screen(page));
            await signIn(page, 'dbarnes');
            await terms('d7', 'chapter4.pdf', 'openAccess');
            await signIn(page, 'aclark');
            await P.openBook(page, app, TITLE).catch(() => {});
            await step('d8 Chapter 4: links', () => A9.chapterLinks(page, 'Chapter 4:'));
            await step('d8 aclark presses Chapter 4:', () => A9.pressChapterLink(page, 'Chapter 4:'));
            record(`a20-${MODE}-8-reader`, await screen(page));
            await signOut(page).catch(() => {});
            fact('server log', log.since(from));
            return;
        }
        if (MODE === 'neighbour') {
            await terms('n2', 'chapter2.pdf', 'directSales', '25.00');
            await terms('n3', 'chapter3.pdf', 'openAccess');
            await terms('n4', 'chapter4.pdf', 'directSales', '0.00');
            await signOut(page);
            const book = await step('n5 book page (visitor)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
            for (const ch of ['Chapter 2:', 'Chapter 3:', 'Chapter 4:']) {
                await step(`n5 ${ch} links`, () => A9.chapterLinks(page, ch));
            }
            record(`a20-${MODE}-5-book`, await screen(page));
            for (const ch of ['Chapter 2:', 'Chapter 3:', 'Chapter 4:']) {
                await step(`n6 visitor presses ${ch}`, () => A9.pressChapterLink(page, ch));
                if (book) await P.openBook(page, app, TITLE).catch(() => {});
            }
            await signIn(page, 'aclark');
            await P.openBook(page, app, TITLE).catch(() => {});
            await step('n7 aclark presses Chapter 4:', () => A9.pressChapterLink(page, 'Chapter 4:'));
            record(`a20-${MODE}-7-reader`, await screen(page));
            await signOut(page).catch(() => {});
            fact('server log', log.since(from));
            return;
        }

        await terms('3', 'chapter1.pdf', 'directSales', '0');
        record(`a20-${MODE}-4-formats`, await screen(page));
        await shot(page, `a20-${MODE}-4-formats`).catch(() => {});

        await signOut(page);
        await step('5 book page (visitor)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
        await step('5 chapter 1 links', () => A9.chapterLinks(page, 'Chapter 1:'));
        record(`a20-${MODE}-5-book`, await screen(page));
        await step('6 visitor presses chapter 1', () => A9.pressChapterLink(page, 'Chapter 1:'));
        record(`a20-${MODE}-6-visitor`, await screen(page));
        await shot(page, `a20-${MODE}-6-visitor`).catch(() => {});
        fact('server log', log.since(from));
    } finally {
        record(`a20-facts-${MODE}`, facts);
        await close();
    }
});
