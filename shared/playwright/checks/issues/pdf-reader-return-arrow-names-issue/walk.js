// Issue report docs/issues/U13-OJS6-pdf-reader-return-arrow-names-issue.md (U13 OJS6):
// on a journal article's PDF reader, the return arrow is announced
// "Return to Issue Details" but opens the article's page.
// Steps, on PKP's default test dataset, signed out:
//   1. Open the journal's home page.
//   2. Under "Current Issue", open "Antimicrobial, heavy metal resistance …" (article 17).
//   3. Press "PDF".
//   4. Read the return arrow's name (its hidden text).
//   5. Press the arrow.
// The same steps are then taken on the French pages (/fr_CA).
// Run on a freshly reset dataset fleet:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/walk.js
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');
const {readArrowAndPress, rel} = require('./lib');

const TITLE = /Antimicrobial, heavy metal resistance/;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        for (const lang of ['en', 'fr_CA']) {
            // 1. The home page
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}`));
            await idle(page);
            record(`${lang}-1-home`, await screen(page));
            // 2. The article, from the current issue's list
            await page.getByRole('link', {name: TITLE}).first().click();
            await idle(page);
            record(`${lang}-2-article`, await screen(page));
            const article = rel(page.url());
            // 3. "PDF"
            await page.locator('a.obj_galley_link').filter({hasText: 'PDF'}).first().click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            const keys = await rawKeys(page);
            // 4-5. The arrow's name, then press it
            facts[lang] = {article, ...(await readArrowAndPress(page, `${lang}-4`)), rawKeys: keys};
            console.log(`[fact] ${app.name} ${lang}: ${JSON.stringify(facts[lang])}`);
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
