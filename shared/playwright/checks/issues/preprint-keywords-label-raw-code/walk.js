// Issue report walk: docs/issues/U13-OPS7-preprint-keywords-label-raw-code.md
// (spec U13 register OPS7). Takes the report's steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// signed out. The steps create nothing; the kit builds nothing.
//   1  OPS: preprint 2 "The Facets Of Job Satisfaction" in English
//      (/en/preprint/view/2): the keywords line.
//   2  OPS: the same preprint in French (/fr_CA/preprint/view/2).
//   c  control, OJS: article 1 "Signalling Theory Dividends" in English and
//      in French (/fr_CA/article/view/1).
//   n  neighbour (what a fix must leave alone): the English lines of steps 1
//      and c, and OMP's book 14 in French and English (its own keywords label).
// Every page records screen(), the keywords heading's raw text and rawKeys().
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-keywords-label-raw-code/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, a stable-3_5_0 dataset fleet's feature.
// Facts: .reports/<feature>/<id>/ (record 'facts').
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PAGE = {ops: 'preprint/view/2', ojs: 'article/view/1', omp: 'catalog/book/14'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const pk = app.contextPath;
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); });
    try {
        for (const loc of ['en', 'fr_CA']) {
            const resp = await page.goto(app.url(`/index.php/${pk}/${loc}/${PAGE[app.name]}`));
            await idle(page);
            try { record(`${String(++n).padStart(2, '0')}-${loc}`, await screen(page)); } catch (e) { /* screen is a record only */ }
            const kw = page.locator('.item.keywords').first();
            fact(`${loc} page`, {
                url: page.url().replace(app.baseURL, ''),
                status: resp && resp.status(),
                title: flat(await page.locator('h1').first().textContent({timeout: 2000}).catch(() => null), 200),
                // textContent, not innerText: the theme upper-cases nothing here, but raw text is the rule.
                keywordsLabel: flat(await kw.locator('.label').first().textContent({timeout: 2000}).catch(() => null), 200),
                keywordsValue: flat(await kw.locator('.value').first().textContent({timeout: 2000}).catch(() => null), 300),
                rawKeys: (await rawKeys(page)) || [],
            });
        }
        fact('crashes', errors);
    } finally {
        record('facts', facts);
        await close();
    }
});
