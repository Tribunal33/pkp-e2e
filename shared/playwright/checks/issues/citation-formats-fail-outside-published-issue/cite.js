// Shared steps for walk.js and neighbour.js: tick "Citation Style Language"
// on Settings › Website › "Plugins", and use "More Citation Formats" ›
// "MLA" and › "BibTeX" on an item's public page, recording what the screen
// and the browser's own requests showed.
const {screen, idle, loc} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const itemPath = (app, id) => {
    const kind = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'}[app.name];
    return `/index.php/${app.contextPath}/en/${kind}/${id}`;
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

// "More Citation Formats" › <name>, inside the citation block.
async function openFormats(page) {
    // Its accessible name carries a trailing space ("More Citation Formats "), so by its target.
    const button = page.locator('button[aria-controls="cslCitationFormats"]');
    await button.waitFor({state: 'visible', timeout: T});
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await page.locator('#cslCitationFormats[aria-hidden="false"]').waitFor({timeout: T});
}

async function tryFormats(app, page, id, label) {
    const out = {page: itemPath(app, id)};
    const resp = await page.goto(app.url(out.page));
    await idle(page);
    out.pageStatus = resp ? resp.status() : null;
    out.title = await page.title();
    const output = page.locator('#citationOutput');
    out.blockShown = (await output.count()) > 0;
    if (!out.blockShown) {
        out.screen = await screen(page);
        return out;
    }
    const before = flat(await output.innerText(), 600);
    out.citationBefore = before;

    // "MLA": the page fetches the format as JSON and swaps the text in.
    await openFormats(page);
    const mla = page.locator('#cslCitationFormats').getByRole('link', {name: /^\s*MLA\s*$/});
    await loc(page, `${label}: "MLA" under "More Citation Formats"`, mla);
    const got = page.waitForResponse((r) => /\/citationstylelanguage\/get\/modern-language-association/.test(r.url()), {timeout: T}).catch(() => null);
    await mla.click();
    const r = await got;
    await pause(1500);
    const after = flat(await output.innerText(), 600);
    let body = null;
    if (r) body = flat(await r.text().catch(() => null), 300);
    out.format = {status: r ? r.status() : null, url: r ? r.url().replace(app.baseURL, '') : null, body, citationAfter: after, changed: after !== before};
    out.formatScreen = await screen(page);

    // "BibTeX": a plain link; a download, or a page.
    await openFormats(page);
    const bib = page.locator('#cslCitationFormats').getByRole('link', {name: /BibTeX/});
    await loc(page, `${label}: "BibTeX" under "Download Citation"`, bib);
    const href = await bib.getAttribute('href');
    const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
    const got2 = page.waitForResponse((x) => /\/citationstylelanguage\/download\/bibtex/.test(x.url()), {timeout: 15_000}).catch(() => null);
    await bib.click();
    const [download, r2] = await Promise.all([dl, got2]);
    out.download = {href: href ? href.replace(app.baseURL, '') : null, status: r2 ? r2.status() : null};
    if (r2) out.download.disposition = (await r2.allHeaders().catch(() => ({})))['content-disposition'] || null;
    if (download) {
        out.download.file = download.suggestedFilename();
    } else {
        await page.waitForLoadState('load', {timeout: T}).catch(() => {});
        out.download.url = page.url().replace(app.baseURL, '');
        out.download.pageTitle = await page.title().catch(() => null);
        out.download.pageText = flat(await page.locator('body').innerText().catch(() => ''), 300) || '(blank page)';
        out.download.screen = await screen(page).catch(() => null);
    }
    return out;
}

module.exports = {enableCsl, tryFormats, itemPath};
