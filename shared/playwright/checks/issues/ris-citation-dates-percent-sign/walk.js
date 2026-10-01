// Issue report walk: docs/issues/U19-A15-oai-marc-008-percent-signs.md, the
// RIS steps 10-14 (spec U13 register A8, joined to U19 A15). Takes them on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  rvaca ticks "Citation Style Language" on Settings › Website ›
//        "Plugins" (off in the dataset; once on, both downloads are offered).
//   3    signs out.
//   4-5  on the published item's page (OJS article 1, OPS preprint 2, OMP book
//        14), "How to Cite" › "More Citation Formats" ›
//        "Endnote/Zotero/Mendeley (RIS)".
//   6    reads the downloaded file's PY and Y2 lines.
// The kit builds nothing; step 2 changes the dataset, so reset the fleet
// before each walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13a8 node bin/probe.js all shared/playwright/checks/issues/ris-citation-dates-percent-sign/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13a8 node bin/probe.js all <this file>
// An optional first argument tags the record: `fix` (the same walk with
// fix.diff applied), or `neighbour` (steps 1-4, then "BibTeX" and the RIS
// file again, whole, so a run with the fix in and one with it out show that
// the fix changes the RIS file's date lines and nothing else).
// Facts: .reports/<feature>/u13a8/walk[-<tag>][-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const mode = process.argv[2] || '';
const tagArg = mode ? `-${mode}` : '';

const ITEM = {
    ojs: {id: 1, path: 'article/view/1'},
    ops: {id: 2, path: 'preprint/view/2'},
    omp: {id: 14, path: 'catalog/book/14'},
};

async function enableCsl(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await idle(page);
    const row = page.locator('tr.gridRow[id$="-row-citationstylelanguageplugin"]').first();
    await row.waitFor({timeout: T});
    await pause(500);
    const box = row.getByRole('checkbox').first();
    await loc(page, 'Plugins: the "Citation Style Language" row\'s checkbox', box);
    if (await box.isChecked()) return {already: true};
    const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
    await box.click();
    const r = await w;
    await pause(800);
    await idle(page);
    return {status: r ? r.status() : null, checked: await box.isChecked(), row: flat(await row.innerText(), 200)};
}

async function openFormats(page) {
    // Its accessible name carries a trailing space, so by its target.
    const button = page.locator('button[aria-controls="cslCitationFormats"]');
    await button.waitFor({state: 'visible', timeout: T});
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await page.locator('#cslCitationFormats[aria-hidden="false"]').waitFor({timeout: T});
}

// "More Citation Formats" › a download link; the file's name and text.
async function download(app, page, label, name) {
    await openFormats(page);
    const link = page.locator('#cslCitationFormats').getByRole('link', {name});
    await loc(page, `"${label}" under "Download Citation"`, link);
    const href = await link.getAttribute('href');
    const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
    const got = page.waitForResponse((r) => /\/citationstylelanguage\/download\//.test(r.url()), {timeout: T}).catch(() => null);
    await link.click();
    const [d, r] = await Promise.all([dl, got]);
    const out = {href: href ? href.replace(app.baseURL, '') : null, status: r ? r.status() : null};
    if (r) out.disposition = (await r.allHeaders().catch(() => ({})))['content-disposition'] || null;
    if (!d) {
        out.pageText = flat(await page.locator('body').innerText().catch(() => ''), 300);
        return out;
    }
    out.file = d.suggestedFilename();
    const p = await d.path();
    out.text = p ? fs.readFileSync(p, 'utf8') : null;
    out.dateLines = out.text ? out.text.split(/\r?\n/).filter((l) => /^(PY|Y2|DA)\s+-/.test(l)) : null;
    return out;
}

forEachApp(async (app) => {
    const facts = {line: app.line, dataset: app.dataset, item: ITEM[app.name], today: new Date().toISOString().slice(0, 10)};
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        facts.enable = await enableCsl(app, page);
        facts.pluginsScreen = await screen(page);
        // 3
        await signOut(page);
        // 4
        const resp = await page.goto(app.url(`/index.php/${app.contextPath}/en/${ITEM[app.name].path}`));
        await idle(page);
        facts.pageStatus = resp ? resp.status() : null;
        facts.title = await page.title();
        facts.citation = flat(await page.locator('#citationOutput').innerText().catch(() => null), 600);
        await openFormats(page);
        facts.formatsScreen = await screen(page);
        facts.downloadsOffered = (await page.locator('#cslCitationFormats').innerText()).split('\n').map((s) => s.trim()).filter(Boolean);
        // Neighbour: BibTeX first, from the same page.
        if (mode === 'neighbour') facts.bibtex = await download(app, page, 'BibTeX', /BibTeX/);
        // 5-6
        facts.ris = await download(app, page, 'Endnote/Zotero/Mendeley (RIS)', /RIS/);
    } finally {
        record(`walk${tagArg}`, facts);
        await close();
    }
});
