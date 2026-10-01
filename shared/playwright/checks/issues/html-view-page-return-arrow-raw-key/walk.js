// Issue report docs/issues/U69-A10-html-view-page-return-arrow-raw-key.md (U69 A10): on a
// press, the return arrow of a book's HTML view page is announced as a raw code,
// "##monograph.return##". Takes the report's Steps on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), on its press `publicknowledge` and its published
// book 5. The dataset has no HTML book file, so the walk adds one on screen (u69r7.html
// beside this file). The kit builds nothing.
//
//   1. dbarnes: the book's workflow by its address, "Publication Formats"
//   2. "Add publication format", the name "HTML u69r7", "OK"
//   3. the format's "Change File": the component "Appendix", u69r7.html, "Continue",
//      "Continue", "Complete"
//   4. the file's "Set Terms": "Open Access", "Save"
//   5. the format's own "Awaiting Approval" (not the file's): "OK"
//   6. the format's "Not Available": "OK"; sign out
//   7. Catalog, "Bomb Canada and Other Unkind Remarks in the American Media"
//   8. press "HTML u69r7"
//   9. read the return arrow's name (its hidden text)
//  10. press the arrow
//   The same steps 7-10 on the French pages (/fr_CA).
//   Control and the fix's neighbour check (fix out and in): steps 7-10 with "PDF" pressed
//   instead, in both languages, and every raw code on each view page.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/walk.js
// Facts: .reports/<feature>/<agent>/facts[-<run>]-omp.json
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');

const BOOK = 5;
const TITLE = 'Bomb Canada and Other Unkind Remarks in the American Media';
const FORMAT = 'HTML u69r7';
const FILE = 'u69r7.html';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {readArrowAndPress, flat, rel} = require('../pdf-reader-return-arrow-names-issue/lib');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {addFreeFormatFile} = require('./lib');

    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(flat(e.message, 200)));

    /** Steps 7-10 for one file link of the book's page, in one language. */
    const readFile = async (lang, linkName, label) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/catalog`));
        await idle(page);
        await page.getByRole('link', {name: TITLE}).first().click();
        await idle(page);
        const files = await page.locator('.obj_monograph_full a.cmp_download_link').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
        record(`${label}-7-book`, await screen(page));
        const link = page.locator('.obj_monograph_full a.cmp_download_link', {hasText: linkName}).first();
        const opened = page.waitForResponse((r) => r.request().resourceType() === 'document' && /\/catalog\/view\//.test(r.url()), {timeout: 30_000}).catch(() => null);
        await link.click();
        const answer = await opened;
        await page.waitForLoadState('domcontentloaded');
        await idle(page).catch(() => {});
        const keys = await rawKeys(page);
        const bar = flat(await page.locator('header.header_viewable_file').innerText().catch(() => null), 200);
        const frameText = await page
            .frameLocator('#htmlContainer > iframe, #htmlContainer iframe')
            .locator('body')
            .innerText({timeout: 5000})
            .then((t) => flat(t, 120))
            .catch(() => null);
        const out = {
            files: files.map((f) => ({...f, href: rel(f.href)})),
            viewStatus: answer ? answer.status() : null,
            ...(await readArrowAndPress(page, `${label}-9`)),
            bar,
            htmlFrameText: frameText,
            rawKeys: keys,
            scriptErrors: scriptErrors.splice(0),
        };
        fact(label, out);
    };

    try {
        // 1-6
        await signIn(page, 'dbarnes');
        fact('1-6 adding', await addFreeFormatFile(page, app, {submissionId: BOOK, formatName: FORMAT, file: path.join(__dirname, FILE), fileName: FILE}));
        fact('1-6 server log', log.since());
        await signOut(page);
        // 7-10, English then French
        await readFile('en', FORMAT, 'en-html');
        await readFile('fr_CA', FORMAT, 'fr-html');
        // control and neighbour: the PDF view page's arrow
        await readFile('en', /^\s*PDF\s*$/, 'en-pdf');
        await readFile('fr_CA', /^\s*PDF\s*$/, 'fr-pdf');
        fact('7-10 server log', log.since());
    } finally {
        record('facts', facts);
        await close();
    }
});
