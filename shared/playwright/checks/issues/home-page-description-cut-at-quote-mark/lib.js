// Helpers for walk.js (U20 A1: the home page's "description" tag and the
// "Description" box on Settings › Distribution › "Search Indexing").
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');

/** The "Search Indexing" tab's form, its English "Description" box. */
const form = (page) => page.locator('[id="indexing"] form').first();
const descriptionBox = (page) => form(page).locator('input[name="searchDescription-en"]');

/** Settings › Distribution, then the "Search Indexing" tab. Returns the box's value as the page shows it. */
async function openSearchIndexing(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'Search Indexing'}).first().click();
    await descriptionBox(page).waitFor({state: 'visible'});
    return descriptionBox(page).inputValue();
}

/**
 * On "Search Indexing" (already open): type the text into "Description"
 * and press "Save". Returns the request and its answer, whether "Saved"
 * showed, and the box's value after the page is opened again.
 */
async function saveDescription(app, page, text) {
    const out = {typed: text};
    await descriptionBox(page).fill(text);
    const [r] = await Promise.all([
        page.waitForResponse((x) => /\/api\/v1\/contexts\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: 15000}).catch(() => null),
        form(page).getByRole('button', {name: 'Save', exact: true}).click(),
    ]);
    if (r) {
        out.request = `${r.request().headers()['x-http-method-override'] || r.request().method()} ${rel(r.url())}`;
        out.status = r.status();
        if (r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    }
    out.saved = await form(page).getByText('Saved', {exact: true}).first().waitFor({state: 'visible', timeout: 5000}).then(() => true, () => false);
    out.reloaded = await openSearchIndexing(app, page);
    out.reloadedAsTyped = out.reloaded === text;
    return out;
}

/**
 * Open the home page and read its description tag three ways: the line
 * as the server sent it (the page's own response), the text a browser
 * reads from it, and the stray attributes the browser found on it; then
 * any text the browser placed straight in the page's body above the
 * header, and whether the theme's style sheets ended up in the body.
 */
async function readHome(app, page) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/en`));
    await page.waitForLoadState('load');
    await idle(page).catch(() => {});
    const html = (await res.text().catch(() => '')) || '';
    const line = (html.match(/<meta name="description"[^\n]*/) || [null])[0];
    const dom = await page.evaluate(() => {
        const m = document.querySelector('meta[name="description"]');
        const spilled = [...document.body.childNodes]
            .filter((n) => n.nodeType === 3 && n.textContent.trim())
            .map((n) => n.textContent.trim());
        const header = document.querySelector('.pkp_structure_head, header');
        const before = header ? !!(spilled.length && document.body.firstChild && document.body.firstChild.compareDocumentPosition(header) & 4) : null;
        return {
            inHead: m ? m.parentElement.tagName : null,
            content: m ? m.getAttribute('content') : null,
            attributes: m ? [...m.attributes].map((a) => a.name) : [],
            spilledText: spilled,
            spilledAboveHeader: before,
            stylesheetsInBody: document.querySelectorAll('body link[rel="stylesheet"]').length,
            stylesheetsInHead: document.querySelectorAll('head link[rel="stylesheet"]').length,
        };
    });
    const firstLines = flat(await page.locator('body').innerText().catch(() => ''), 200);
    return {status: res.status(), sent: line, ...dom, pageStartsWith: firstLines};
}

module.exports = {flat, rel, form, descriptionBox, openSearchIndexing, saveDescription, readHome};
