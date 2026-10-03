// U73 A24 {OMP}: a "URL Path" refused in a book format's "Edit" window shows its message under the
// box, and comes back as a notice at the top right with the next good save, once per refusal.
// Steps 18-22 of docs/issues/U09-A11-static-page-refusal-repeated-after-save.md (which this unit
// joined), on PKP's default test dataset (submission 5, "Bomb Canada and Other Unkind Remarks in
// the American Media", its format "PDF"), as `dbarnes`. Spec: docs/specs/U73-publication-formats-proof-terms.md, register A24 (Rule 6).
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/format-url-path-refusal-repeated-after-save/walk.js
// MODE=neighbour runs the neighbour check alone: a good "URL Path" saved with no refusal before it
// (no notice), and "Add publication format" with an empty "Name" (refused by the browser, no request).
// Records the screens; asserts nothing.
const path = require('path');
const {forEachApp, launch, signIn, record, shot, screen, idle, sql} = require('../../../probe');
const {watchFetches} = require('../static-page-refusal-repeated-after-save/lib');
const {step} = require('../market-tax-rate-fails-native-export/lib');

/** The dataset's book with a format kept on the press's own site (submission 4's "PDF" is remote,
 * and a remote format's window hides "URL Path"): submission 5, published, one format "PDF". */
const BOOK = {id: 5, publicationId: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media', format: 'PDF'};

const MODE = process.env.MODE || 'walk';
const ROOT = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SAVE = /publication-format-grid\/update-format(?:\?|$)/;

/** Submission 4 › Publication › "Publication Formats", loaded. */
async function openFormats(app, page) {
    const {PublicationFormatsPage} = require(path.join(ROOT, 'apps/omp/playwright/pages/PublicationFormatPages.js'));
    const pf = new PublicationFormatsPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await pf.frame.gotoEditorial(BOOK.id, {menuKey: 'publication_publicationFormats'});
        await pf.expectLoaded();
    } else {
        await pf.gotoEditorial(BOOK.id, BOOK.publicationId);
    }
    return pf;
}

/** The window as it stands: open or not, the messages in it, the "URL Path" box. */
async function windowState(win) {
    const open = (await win.dialog().count()) > 0;
    if (!open) return {open};
    return {
        open,
        fieldErrors: await win.dialog().locator('label.error, .sub_label.error, .error')
            .evaluateAll((els) => [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]).catch(() => null),
        urlPath: await win.urlPathBox().inputValue().catch(() => null),
        requiredNotes: await win.requiredNote().count().catch(() => null),
    };
}

/** Press "OK": the answer, the window at once and 3 s on, the notices and fetches meanwhile. */
async function pressOk(page, win, fetches) {
    await screen(page); // drops the notices shown before
    const from = fetches.length;
    const answered = page.waitForResponse((r) => SAVE.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
    await win.okButton().click();
    const res = await answered;
    let body = null;
    try {
        const j = await res.json();
        body = {status: j.status, content: typeof j.content === 'string' ? `html ${j.content.length} chars` : j.content, event: j.event ? j.event.name || true : null};
    } catch { body = 'unreadable'; }
    await idle(page).catch(() => {});
    await sleep(300);
    const atOnce = await windowState(win);
    await sleep(3000);
    const later = await windowState(win);
    const s = await screen(page);
    return {answer: {status: res.status(), body}, atOnce, later, notices: s.notices, fetches: fetches.slice(from)};
}

function storedPath(app) {
    return sql(app, `select pf.publication_format_id, pf.url_path from publication_formats pf where pf.publication_id = ${BOOK.publicationId} order by 1`);
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const fetches = watchFetches(page);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1800));
    };
    try {
        await signIn(page, 'dbarnes');
        const pf = await step(page, 'open-formats', () => openFormats(app, page));
        fact('stored-before', storedPath(app));

        if (MODE === 'walk') {
            let win;
            fact('s3-edit', await step(page, 's3', async () => {
                win = await pf.openEdit(BOOK.format);
                return windowState(win);
            }));
            for (const [k, value] of [['s4-my-pdf', 'my pdf'], ['s5-a-slash-b', 'a/b'], ['s6-print-edition', 'print-edition']]) {
                fact(k, await step(page, k, async () => {
                    await win.type(win.urlPathBox(), value);
                    const out = await pressOk(page, win, fetches);
                    await shot(page, `${k}-after-ok`);
                    return out;
                }));
            }
            fact('s6-list', await step(page, 's6-list', async () => ({
                labels: await pf.formatLabels().allInnerTexts().catch(() => null),
                stored: storedPath(app),
            })));
        } else {
            fact('n1-good-path-no-refusal', await step(page, 'n1', async () => {
                const win = await pf.openEdit(BOOK.format);
                await win.type(win.urlPathBox(), 'u73m-good');
                const out = await pressOk(page, win, fetches);
                return {...out, stored: storedPath(app)};
            }));
            fact('n2-add-empty-name-browser', await step(page, 'n2', async () => {
                const win = await pf.openAdd();
                let posted = false;
                const listener = (req) => { if (SAVE.test(req.url())) posted = true; };
                page.on('request', listener);
                await screen(page);
                const from = fetches.length;
                await win.okButton().click();
                await sleep(2000);
                page.off('request', listener);
                const out = {posted, state: await windowState(win), notices: (await screen(page)).notices, fetches: fetches.slice(from)};
                await win.cancel().catch(() => {});
                return out;
            }));
        }
    } finally {
        record(`a24-${MODE}`, facts);
        await close();
    }
});
