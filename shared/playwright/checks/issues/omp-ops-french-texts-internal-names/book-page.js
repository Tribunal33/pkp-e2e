// Issue report walk: docs/issues/U57-A8-omp-ops-french-texts-internal-names.md,
// the book and chapter pages (spec U69 register A15; U13 A1 read alongside).
// Takes the report's book-page steps through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), signed out:
// its `publicknowledge`, which offers English and French (Canada) to
// readers. The steps create nothing; the kit builds nothing.
//   b1  OMP: the book page of submission 14 "From Bricks to Brains" in
//       French (/fr_CA/catalog/book/14): "Published" heading, "Versions",
//       the format details' screen-reader heading.
//   b2  OMP: its "Chapter 1: Mind Control—Internal or External?" page in
//       French.
//   b3  OJS article 1 and OPS preprint 3 in French: the "Versions" list
//       (OPS also the label line), the version names U13 A1 is about.
//   n   neighbour (what a fix must leave alone): the same pages in English.
// Every page records screen() and rawKeys() (the ##key## names on it).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/book-page.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, a stable-3_5_0 dataset fleet's feature.
// Facts: .reports/<feature>/<id>/ (record 'facts').
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PAGES = {
    ojs: [{label: 'article', rel: 'article/view/1'}],
    ops: [{label: 'preprint', rel: 'preprint/view/3'}],
    omp: [{label: 'book', rel: 'catalog/book/14'}, {label: 'chapter', chapter: 'Chapter 1: Mind Control'}],
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('book-page.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const pk = app.contextPath;
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); });
    const read = async (label) => {
        await idle(page);
        let s;
        try { s = await screen(page); record(`${String(++n).padStart(2, '0')}-${label}`, s); } catch (e) { s = null; }
        const keys = (await rawKeys(page)) || [];
        return {
            url: page.url().replace(app.baseURL, ''),
            title: await page.title(),
            rawKeys: keys,
            published: flat(await page.locator('.item.date_published .label, .item.published .label').first().innerText({timeout: 2000}).catch(() => null)),
            versions: flat(await page.locator('.versions').first().innerText({timeout: 2000}).catch(() => null)),
            labelLine: flat(await page.locator('.pkp_page_preprint .label_publication, .obj_preprint_details .preprint_label, .page_article .label_line').first().innerText({timeout: 1000}).catch(() => null)),
            formatHeadings: (await page.locator('.item.publication_format h2, .publication_format .pkp_screen_reader').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)).slice(0, 6),
        };
    };
    try {
        for (const loc of ['fr_CA', 'en']) {
            const tagL = loc === 'en' ? 'n-en' : 'fr';
            for (const p of PAGES[app.name]) {
                if (p.rel) {
                    const resp = await page.goto(app.url(`/index.php/${pk}/${loc}/${p.rel}`));
                    const out = await read(`${tagL}-${p.label}`);
                    out.status = resp && resp.status();
                    fact(`${tagL} ${p.label}`, out);
                } else {
                    // The chapter's own link on the book page just read.
                    const link = page.getByRole('link', {name: new RegExp(p.chapter)}).first();
                    await link.click();
                    await page.waitForLoadState('load');
                    fact(`${tagL} ${p.label}`, await read(`${tagL}-${p.label}`));
                }
            }
        }
        fact('crashes', errors);
    } finally {
        record('facts', facts);
        await close();
    }
});
