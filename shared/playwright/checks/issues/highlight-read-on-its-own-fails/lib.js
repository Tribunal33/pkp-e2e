// Helpers of walk.js beside this file (issue report on spec U11 A10). Requiring this file runs
// nothing. Every helper never throws: a failure comes back in `error`, so a step records the state
// the code under test brings.
const {idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/**
 * Type an address of the programming interface into the browser (absolute, or a path the app
 * serves) and read the answer: status, the parsed JSON when it is JSON, else the first 300
 * characters of the body.
 */
async function openApi(page, app, address) {
    const url = /^https?:/.test(address) ? address : app.url(address);
    const out = {address: rel(url)};
    try {
        const r = await page.goto(url);
        out.status = r ? r.status() : null;
        const text = r ? await r.text().catch(() => '') : '';
        try { out.json = JSON.parse(text); } catch (e) { out.body = flat(text, 300); }
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/** The `id`, title and `_href` of each item of a list answer (`{items: [...]}` or an array). */
function hrefs(answer) {
    const j = answer && answer.json;
    const items = Array.isArray(j) ? j : (j && Array.isArray(j.items) ? j.items : null);
    if (!items) return null;
    return items.map((i) => ({id: i.id, title: flat(i.title && (i.title.en || i.title.en_US) || i.name && (i.name.en || i.name.en_US) || '', 60), url: i.url, _href: rel(i._href)}));
}

/** "Edit" on the highlights row titled `title`, change "URL" to `url`, "Save". */
async function editHighlightUrl(page, title, url) {
    const out = {};
    try {
        const panel = page.locator('.highlightsListPanel').first();
        const row = panel.getByRole('listitem').filter({hasText: title});
        await row.getByRole('button', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Edit Highlight'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page);
        await pause(500);
        await d.locator('#highlight-url-control').fill(url);
        const resp = page.waitForResponse((r) => /\/api\/v1\/highlights\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        out.status = r ? r.status() : null;
        await d.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
        out.panelOpen = await d.isVisible().catch(() => false);
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

module.exports = {T, pause, flat, rel, openApi, hrefs, editHighlightUrl};
