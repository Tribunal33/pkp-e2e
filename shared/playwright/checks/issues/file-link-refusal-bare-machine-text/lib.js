// Helpers for walk.js (U28 A6). Requiring this file runs nothing.
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const path = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');

/**
 * The submission the steps use, per app. On a journal and a press: a review request `jjanssen`
 * holds and `amccrae` does not. A preprint server has no review: the file is preprint 1's galley
 * file, its link read from the workflow's "Galleys" list by `dbarnes`, and `ckwantes` is an
 * author with no part in preprint 1.
 */
const CASES = {
    ojs: {submissionId: 12, reviewer: 'jjanssen', other: 'amccrae', allowed: 'jjanssen'},
    omp: {submissionId: 17, reviewer: 'jjanssen', other: 'amccrae', allowed: 'jjanssen'},
    ops: {submissionId: 1, reviewer: null, other: 'ckwantes', allowed: 'dbarnes', menu: 'Galleys'},
};

/**
 * Type an address into the address bar and return what the browser got: the answer's status and
 * content type, the file name when it was a download, and otherwise the page it shows (address,
 * title, heading, text). A download aborts the navigation, so the answer is read from the response.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} address
 */
async function openAddress(page, address) {
    const out = {typed: path(address)};
    const download = page.waitForEvent('download', {timeout: 8_000}).then((d) => d.suggestedFilename()).catch(() => null);
    const first = page.waitForResponse((r) => r.url() === address, {timeout: 30_000}).catch(() => null);
    const nav = await page.goto(address).catch((e) => ({aborted: flat(e.message, 120)}));
    const r = await first;
    if (r) {
        out.http = r.status();
        out.contentType = (await r.headerValue('content-type')) || null;
        out.disposition = (await r.headerValue('content-disposition')) || null;
        out.redirectsTo = (await r.headerValue('location')) || null;
    }
    out.downloaded = /attachment/i.test(out.disposition || '') ? await download : null;
    if (!out.downloaded && nav && !nav.aborted) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        out.landed = path(page.url());
        out.landedHttp = nav.status();
        out.landedContentType = (await nav.headerValue('content-type')) || null;
        out.title = await page.title().catch(() => null);
        out.heading = flat(await page.locator('h1').first().innerText({timeout: 2_000}).catch(() => null), 120);
        out.hasSiteLayout = (await page.locator('header, nav, .pkp_structure_page').count()) > 0;
        out.text = flat(await page.locator('body').innerText().catch(() => null), 500);
    }
    return out;
}

/**
 * Collect the answers to the component requests (`$$$call$$$`) the page's own scripts send
 * (XHR or fetch), with each answer's content type and the start of its body.
 *
 * @param {import('@playwright/test').Page} page
 */
function watchScriptAnswers(page) {
    const list = [];
    page.on('response', async (r) => {
        if (!r.url().includes('$$$call$$$')) return;
        const kind = r.request().resourceType();
        if (kind !== 'xhr' && kind !== 'fetch') return;
        const entry = {op: path(r.url()).replace(/\?.*$/, '').replace(/^.*\$\$\$call\$\$\$\//, ''), kind, http: r.status(), contentType: (await r.headerValue('content-type')) || null};
        entry.body = flat(await r.text().catch(() => null), 200);
        list.push(entry);
    });
    return list;
}

/**
 * Collect, per kind of request (document, xhr, fetch), the `Accept` headers the browser sent to
 * component addresses (`$$$call$$$`), with how many requests carried each.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
function watchAccepts(context) {
    const seen = {};
    context.on('request', async (r) => {
        if (!r.url().includes('$$$call$$$')) return;
        // allHeaders() includes the ones the browser adds itself (a page load's and a fetch's Accept)
        const headers = await r.allHeaders().catch(() => r.headers());
        const key = `${r.resourceType()} ${r.method()} | ${headers['accept'] || '(none)'}`;
        seen[key] = (seen[key] || 0) + 1;
    });
    return seen;
}

module.exports = {CASES, flat, path, openAddress, watchScriptAnswers, watchAccepts};
