// Issue report docs/issues/U13-A8-ris-download-dates-percent-signs.md (U13 A8):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, as the dataset's own users. The kit builds nothing.
//
//   precondition: `rvaca` ticks "Citation Style Language" (Settings › Website
//      › Plugins), then signs out
//   steps (signed out): open the published item's page (OJS article 17, OPS
//      preprint 2, OMP book 5), "More Citation Formats" ›
//      "Endnote/Zotero/Mendeley (RIS)"; the downloaded file's name and text
//      are recorded, with its date lines (PY, Y2, DA, Y1) apart
//   neighbour (every run, so a run with the fix in and one with it out
//      compare): the citation the page shows first, the "BibTeX" download of
//      the same page, and every line of the RIS file but the date lines; the
//      fix must leave them as they are.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir24 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-ir24 PROBE_AGENT=ir24 node bin/probe.js all shared/playwright/checks/issues/ris-download-dates-percent-signs/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir24-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir24-3_5 PROBE_AGENT=ir24 node bin/probe.js all shared/playwright/checks/issues/ris-download-dates-percent-signs/walk.js
// Facts: .reports/<feature>/ir24/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {captureDownload} = require('../../../pages/SubmissionFilesPages.js');

const T = 20_000;
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
const RIS = 'Endnote/Zotero/Mendeley (RIS)';
const DATE_LINE = /^(PY|Y1|Y2|DA)\s+-/;

// The published item the steps open, per app.
const ITEM = {
    ojs: {path: 'article/view/17', what: 'article 17'},
    ops: {path: 'preprint/view/2', what: 'preprint 2'},
    omp: {path: 'catalog/book/5', what: 'book 5'},
};

forEachApp(async (app) => {
    const item = ITEM[app.name];
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, item: item.what};
    try {
        await signIn(page, 'rvaca');
        facts.plugin = await enablePlugin(page, app, 'citationstylelanguageplugin');
        await signOut(page);

        const response = await page.goto(app.url(`/index.php/${app.contextPath}/${item.path}`));
        await idle(page);
        facts.pageStatus = response ? response.status() : null;
        const output = page.locator('#citationOutput');
        await output.waitFor({state: 'visible', timeout: T});
        facts.primary = flat(await output.innerText());

        const button = page.locator('button[aria-controls="cslCitationFormats"]');
        const list = page.locator('#cslCitationFormats');
        await button.click();
        await list.waitFor({state: 'visible', timeout: T});
        facts.listText = flat(await list.innerText());
        record('formats-screen', await screen(page));
        await shot(page, 'formats').catch(() => {});

        const download = async (name) => {
            if (!(await list.isVisible())) await button.click();
            // The list keeps aria-hidden="true" while open, so its links have no role to find them by.
            const link = list.locator('a').filter({hasText: name});
            const {download: d} = await captureDownload(page, () => link.click());
            const file = await d.path();
            return {name: d.suggestedFilename(), text: file ? fs.readFileSync(file, 'utf8') : ''};
        };
        const ris = await download(RIS);
        const lines = ris.text.split(/\r?\n/);
        facts.ris = {
            name: ris.name,
            dateLines: lines.filter((l) => DATE_LINE.test(l)),
            otherLines: lines.filter((l) => !DATE_LINE.test(l)),
        };
        const bib = await download('BibTeX');
        facts.bibtex = {name: bib.name, text: bib.text};
    } finally {
        record('facts', facts);
        console.log(`${app.name} ${item.what} (${app.line || 'main'}): ${facts.ris ? facts.ris.name : '(no file)'}`);
        console.log(`  RIS date lines: ${facts.ris ? JSON.stringify(facts.ris.dateLines) : '-'}`);
        console.log(`  BibTeX: ${facts.bibtex ? flat(facts.bibtex.text).slice(0, 400) : '-'}`);
        console.log(`  primary: ${facts.primary}`);
        await close();
    }
});
