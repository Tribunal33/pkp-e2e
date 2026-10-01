// Issue report docs/issues/U13-OPS5-preprint-pdf-reader-return-arrow-raw-key.md (U13 OPS5):
// on a preprint server, the PDF reader's return arrow is announced as a raw
// code, "##article.return##".
// Steps, on PKP's default test dataset, signed out:
//   1. Open the server's home page.
//   2. Open "The Facets Of Job Satisfaction: …" (preprint 2) in the list.
//   3. Press "PDF".
//   4. Read the return arrow's name (its hidden text).
//   5. Press the arrow.
// The same steps are then taken on the French pages (/fr_CA), and, as the
// control, on the journal (OJS, article 17). The record of every raw code on
// each reader page is the neighbour check for the fix (out and in).
// Run on a freshly reset dataset fleet:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/walk.js
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');
const {readArrowAndPress, rel, flat} = require('../pdf-reader-return-arrow-names-issue/lib');

const TARGET = {
    ops: /The Facets Of Job Satisfaction/,
    ojs: /Antimicrobial, heavy metal resistance/,
};

forEachApp(async (app) => {
    const title = TARGET[app.name];
    if (!title) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        for (const lang of ['en', 'fr_CA']) {
            // 1. The home page
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}`));
            await idle(page);
            record(`${lang}-1-home`, await screen(page));
            // 2. The preprint (article), from the home page's list
            await page.getByRole('link', {name: title}).first().click();
            await idle(page);
            record(`${lang}-2-landing`, await screen(page));
            const landing = rel(page.url());
            // 3. "PDF"
            await page.locator('a.obj_galley_link').filter({hasText: 'PDF'}).first().click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            const keys = await rawKeys(page);
            const download = flat(await page.locator('header a.download').textContent().catch(() => null));
            // 4-5. The arrow's name, then press it
            facts[lang] = {landing, ...(await readArrowAndPress(page, `${lang}-4`)), download, rawKeys: keys};
            console.log(`[fact] ${app.name} ${lang}: ${JSON.stringify(facts[lang])}`);
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
