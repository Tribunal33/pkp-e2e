// Helpers for walk.js (U46 A7, U73 A14). Requiring this file runs nothing.
const path = require('path');
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The "any PDF" and "any CSV" of the Steps. */
const PDF = {
    name: 'appendix-u46w5.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
            '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    ),
};
const CSV = {name: 'data-u46w5.csv', mimeType: 'text/csv', buffer: Buffer.from('year,value\n2014,1\n2015,2\n')};

/** The galley list's labels once it has settled (two equal reads after idle). */
async function galleyList(page, galleys) {
    await idle(page);
    let last = null;
    for (let i = 0; i < 10; i++) {
        const now = await galleys.labels();
        if (last && JSON.stringify(now) === JSON.stringify(last)) return now;
        last = now;
        await sleep(500);
    }
    return last;
}

/** The galley buttons of the item's public page, as a visitor reads them, in page order. */
async function publicGalleys(browser, app, kind, id) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
        const res = await page.goto(app.url(`/index.php/${app.contextPath}/${kind}/view/${id}`));
        await page.waitForLoadState('networkidle').catch(() => {});
        return {status: res.status(), buttons: (await page.locator('a.obj_galley_link').allInnerTexts()).map((s) => flat(s))};
    } finally {
        await ctx.close();
    }
}

/** The OMP page objects (required inside forEachApp, after withApp set the suite). */
function formatPages(app) {
    return require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
}

/**
 * The workflow of `submissionId` › Publication › "Publication Formats" (on
 * 3.5 the menu has no version nodes: its own menu key, else the side menu's link).
 */
async function openFormats(page, app, submissionId, publicationId) {
    const {PublicationFormatsPage} = formatPages(app);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    const key = app.line === 'stable-3_5_0' ? 'publication_publicationFormats' : `publication_${publicationId}_publicationFormats`;
    await formats.frame.gotoEditorial(submissionId, {menuKey: key});
    try {
        await formats.expectLoaded();
    } catch (e) {
        await formats.frame.dialog().getByRole('link', {name: 'Publication Formats', exact: true}).first().click();
        await formats.expectLoaded();
    }
    await idle(page);
    return formats;
}

/** The format names of the "Publication Formats" list, top to bottom (the kind cut off). */
async function formatList(page, formats) {
    await idle(page);
    return formats.formatLabels().evaluateAll((els) =>
        els.map((el) => {
            const copy = el.cloneNode(true);
            copy.querySelectorAll('.onix_code').forEach((n) => n.remove());
            return (copy.textContent || '').replace(/\s+/g, ' ').trim();
        })
    );
}

/** The book page's format links, as a visitor reads them. */
async function bookFormats(browser, app, id) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
        const res = await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/${id}`));
        await page.waitForLoadState('networkidle').catch(() => {});
        return {status: res.status(), links: (await page.locator('.item.files a').allInnerTexts()).map((s) => flat(s))};
    } finally {
        await ctx.close();
    }
}

module.exports = {sleep, flat, PDF, CSV, galleyList, publicGalleys, formatPages, openFormats, formatList, bookFormats};
