// Neighbour check for the fix of U61 A7 (fix-omp.diff, fix-ops.diff): run with
// the fix out and in; only the French "Gestion du site" line may change.
// Reads, as admin: every Administration panel in English and in French,
// then the French "Hosted …" page (its own French texts and codes).
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<out|in> ONLY=omp,ops node bin/probe.js all shared/playwright/checks/issues/admin-page-french-site-management-raw-key/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');

async function readPanels(page) {
    return page.locator('.actionPanel').evaluateAll((els) => els.map((el) => [
        (el.querySelector('h2')?.innerText || '').trim(),
        (el.querySelector('.actionPanel__text p')?.innerText || '').replace(/\s+/g, ' ').trim(),
        ...[...el.querySelectorAll('.actionPanel__actions a, .actionPanel__actions button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
    ].join(' | ')));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const out = {app: app.name};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        for (const lang of ['en', 'fr_CA']) {
            await page.goto(app.url(`/index.php/index/${lang}/admin`));
            await idle(page);
            await page.locator('.actionPanel').first().waitFor({timeout: 20_000});
            out[`${lang} panels`] = await readPanels(page);
        }
        // the French "Hosted …" page, from the panel's first button
        await page.locator('.actionPanel__actions a').first().click();
        await idle(page);
        record('fr-hosted', await screen(page));
        out['fr hosted'] = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), rawKeys: await rawKeys(page)};
        for (const [k, v] of Object.entries(out)) console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    } finally {
        record('neighbour', out);
        await close();
    }
});
