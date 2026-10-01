// Neighbour check for docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md:
// what the fix must leave alone on a preprint server. Signed out, on PKP's
// default test dataset, it reads the whole text of
//   - preprint 2's page and its PDF reader's tab, in English and in French,
//   - preprint 3's page (two versions) in English and in French,
//   - the French and English "Archives" lists (keywords shown without a label),
// and prints one line per page. Run it with the fix out and in and compare
// the two records: only the French keywords label and the French tab may
// change.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<fixout|fixin> ONLY=ops node bin/probe.js ops shared/playwright/checks/issues/ops-french-preprint-raw-keys/neighbour.js
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (PKP default test dataset)');
    const out = {};
    const {page, close} = await launch(app);
    try {
        for (const lang of ['en', 'fr_CA']) {
            for (const [name, path] of [['preprint-2', 'preprint/view/2'], ['preprint-3', 'preprint/view/3'], ['archives', 'preprints']]) {
                await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/${path}`));
                await idle(page);
                const s = await screen(page);
                out[`${lang} ${name}`] = {tab: await page.title(), text: flat(s.text.main), rawKeys: await rawKeys(page)};
            }
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/preprint/view/2/2`));
            await idle(page);
            out[`${lang} pdf-reader`] = {tab: await page.title(), rawKeys: await rawKeys(page)};
        }
        for (const [k, v] of Object.entries(out)) {
            console.log(`[fact] ${k}: tab ${JSON.stringify(flat(v.tab, 120))}; raw ${JSON.stringify(v.rawKeys)}; text ${v.text ? v.text.length : '-'} chars`);
        }
    } finally {
        record('neighbour', out);
        await close();
    }
});
