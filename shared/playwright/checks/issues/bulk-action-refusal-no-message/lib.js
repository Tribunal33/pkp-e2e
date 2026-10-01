// Helpers for the U45 A3 and A13 issue walks (the DOIs page's refusals).
// Requiring this file runs nothing.

/**
 * Keep a record of every window (`[role="dialog"]`) that shows on the page,
 * however briefly: its heading and text, in `window.__seenDialogs`. Call once
 * on a fresh page, before its first navigation.
 *
 * @param {import('@playwright/test').Page} page
 */
async function watchDialogs(page) {
    await page.addInitScript(() => {
        const w = /** @type {any} */ (window);
        w.__seenDialogs = [];
        const seen = new WeakSet();
        const scan = () => {
            document.querySelectorAll('[role="dialog"]').forEach((d) => {
                const text = (/** @type {HTMLElement} */ (d).innerText || d.textContent || '').replace(/\s+/g, ' ').trim();
                if (!text || seen.has(d)) return;
                // the workflow and side windows are not on this page; a dialog is recorded once it has text
                seen.add(d);
                w.__seenDialogs.push(text.slice(0, 600));
            });
        };
        new MutationObserver(scan).observe(document, {childList: true, subtree: true, characterData: true});
    });
}

/** Take the windows seen since the last call (and forget them). */
async function takeDialogs(page) {
    return page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const seen = w.__seenDialogs || [];
        w.__seenDialogs = [];
        return seen;
    });
}

/** Take the top-right notices seen since the last call (DoisPages `recordNotices` keeps them). */
async function takeNotices(page) {
    return page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const seen = w.__doiNotices || [];
        w.__doiNotices = [];
        return seen;
    });
}

/**
 * Record the answer of every non-GET DOI request the page sends
 * (`api/v1/dois…`, `api/v1/_dois/…`): method (the override when tunnelled),
 * path, status and the start of the body. Returns `take()`, which hands
 * over the answers since its last call.
 *
 * @param {import('@playwright/test').Page} page
 */
function watchDoiAnswers(page) {
    /** @type {{method: string, url: string, status: number, body: string}[]} */
    let answers = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/_?dois/.test(r.url()) || r.request().method() === 'GET') return;
        const h = r.request().headers();
        let body = '';
        try {
            body = (await r.text()).slice(0, 400);
        } catch {
            body = '(unread)';
        }
        answers.push({method: h['x-http-method-override'] || r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body});
    });
    return {
        take() {
            const out = answers;
            answers = [];
            return out;
        },
    };
}

module.exports = {watchDialogs, takeDialogs, takeNotices, watchDoiAnswers};
