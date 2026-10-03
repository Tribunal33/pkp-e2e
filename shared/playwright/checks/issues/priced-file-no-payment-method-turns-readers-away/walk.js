// U73 A9 {OMP}: a press that cannot take payments (no currency, or "Manual Fee Payment" without
// instructions) can set a file to "Direct Sales"; a visitor who opens it is sent to Login and a
// signed-in reader to the Catalog, with no message. The issue report's Steps, on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), its press `publicknowledge` and its
// published book 14. The kit builds nothing.
// Spec: docs/specs/U73-publication-formats-proof-terms.md, register A9.
// Issue report: docs/issues/U73-A9-priced-file-no-payment-method-turns-readers-away.md
//
// Default mode, the report's steps 1 to 6 (script facts numbered on their own):
//   dbarnes; book 14 › "Publication Formats"; "chapter1.pdf" › "Direct Sales", 25.00, "Save"
//   (the window read before and after; read again; the "PDF" format's "Metadata" tab read);
//   visitor and aclark press chapter 1's link; aclark presses chapter 2's (the control)
// MODE=emptied takes the report's second group of Steps alone: a press that sells (payments set
// up, chapter 1 at 25.00, aclark reaches the payment page) empties "Manual Payment Instructions",
// then a visitor and aclark press chapter 1's link again.
// MODE=neighbour runs alone the case a fix must leave alone: the press first sets up "US Dollar"
// and "Manual Fee Payment" (Settings › Distribution › "Payments"), then steps 2 to 8: no notice
// in the window, the link "Purchase", a visitor to Login, aclark to the payment page.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/priced-file-no-payment-method-turns-readers-away/walk.js
//               (PKP_E2E_LINE=stable-3_5_0 in front for 3.5)
// Records the screens and what each shows; asserts nothing.
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');

const MODE = process.env.MODE || 'walk';
const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FORMAT = 'PDF';
const PRICED = 'chapter1.pdf';
const PRICE = '25.00';
const CH1 = 'Chapter 1:';
const CH2 = 'Chapter 2:';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // files for sale exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const P = require('../priced-file-link-price-twice-or-missing/lib');
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
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'emptied') {
            await step('e1 payments set up', () => P.setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u73c'}));
            const fm = await P.openFormats(page, app, BOOK);
            await step('e2 Direct Sales saved', () => L.setDirectSales(page, fm, FORMAT, PRICED, PRICE));
            await signIn(page, 'aclark');
            await step('e3 book page (aclark)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
            await step('e3 chapter 1 links', () => L.chapterLinks(page, CH1));
            await step('e3 aclark presses chapter 1 (payments set up)', () => L.pressChapterLink(page, CH1));
            record('a9-emptied-3-payment', await screen(page));
            await signIn(page, 'dbarnes');
            await step('e4 instructions emptied', () => L.emptyInstructions(page, app));
            record('a9-emptied-4-payments-tab', await screen(page));
            await step('e4 payments tab after', () => L.readPayments(page, app));
            await signIn(page, 'aclark');
            await step('e5 book page (aclark)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
            await step('e5 chapter 1 links', () => L.chapterLinks(page, CH1));
            await step('e5 aclark presses chapter 1 (instructions emptied)', () => L.pressChapterLink(page, CH1));
            record('a9-emptied-5-reader', await screen(page));
            await signOut(page);
            await step('e6 book page (visitor)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
            await step('e6 visitor presses chapter 1 (instructions emptied)', () => L.pressChapterLink(page, CH1));
            record('a9-emptied-6-visitor', await screen(page));
            fact('server log', log.since(from));
            return;
        }
        if (MODE === 'neighbour') {
            await step('n0 payments set up', () => P.setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque u73c'}));
        }
        await step('1 payments tab', () => L.readPayments(page, app));
        record(`a9-${MODE}-1-payments`, await screen(page));

        const formats = await P.openFormats(page, app, BOOK);
        await step('2 files', () => P.fileTerms(formats, FORMAT));
        await step('3 terms window, Direct Sales saved', () => L.setDirectSales(page, formats, FORMAT, PRICED, PRICE));
        await step('3 files after', () => P.fileTerms(formats, FORMAT));
        await step('4 terms window again', () => L.reopenTerms(page, formats, FORMAT, PRICED));
        await step('4 metadata tab', () => L.readMetadataTab(page, formats, FORMAT));
        record(`a9-${MODE}-4-formats`, await screen(page));

        await signOut(page);
        await step('5 book page (visitor)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
        await step('5 chapter 1 links', () => L.chapterLinks(page, CH1));
        await step('5 chapter 2 links', () => L.chapterLinks(page, CH2));
        record(`a9-${MODE}-5-book`, await screen(page));
        await step('6 visitor presses chapter 1', () => L.pressChapterLink(page, CH1));
        record(`a9-${MODE}-6-visitor`, await screen(page));
        await shot(page, `a9-${MODE}-6-visitor`).catch(() => {});

        await signIn(page, 'aclark');
        await step('7 book page (aclark)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
        await step('7 aclark presses chapter 1', () => L.pressChapterLink(page, CH1));
        record(`a9-${MODE}-7-reader`, await screen(page));
        await shot(page, `a9-${MODE}-7-reader`).catch(() => {});

        await step('8 book page again (aclark)', () => P.openBook(page, app, TITLE).then((b) => ({url: b.url, status: b.status})));
        await step('8 aclark presses chapter 2 (free)', () => L.pressChapterLink(page, CH2));
        record(`a9-${MODE}-8-free`, await screen(page));
        await signOut(page).catch(() => {});
        fact('server log', log.since(from));
    } finally {
        record(`a9-facts-${MODE}`, facts);
        await close();
    }
});
