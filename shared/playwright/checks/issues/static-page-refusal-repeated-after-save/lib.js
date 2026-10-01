// Helpers for the U09 A11 walk (static-page-refusal-repeated-after-save).
// Plugin switching and the window helpers come from the sibling libs.
// Requiring this file runs nothing.
const {screen} = require('../../../probe');
const L = require('../static-page-content-change-lost-on-close/lib');

const {T, sleep, flat} = L;

/**
 * Watch the page's notification fetches (the legacy `fetchNotification`
 * call behind the notices at the top right) and keep each answer's
 * notices, so a walk can tell which request delivered a notice.
 */
function watchFetches(page) {
    const fetches = [];
    page.on('response', async (r) => {
        if (!/notification\/fetchNotification|notification\/fetch-notification/i.test(r.url())) return;
        let general = null;
        try {
            const j = await r.json();
            const g = j && j.content && j.content.general;
            general = g ? Object.values(g).flatMap((lv) => Object.values(lv)).map((n) => flat(`${n.title || ''}: ${n.text || ''}`, 300)) : [];
        } catch { general = 'unreadable'; }
        fetches.push({status: r.status(), page: flat(page.url().replace(/^https?:\/\/[^/]+/, ''), 120), general});
    });
    return fetches;
}

/**
 * Run `action`, wait out the requests it started and two seconds more for
 * a notice to show, and return the page notices shown meanwhile and the
 * notification fetches answered meanwhile.
 */
async function noticesAfter(page, fetches, action) {
    await screen(page); // drops the notices shown before
    const from = fetches.length;
    const result = await action();
    await sleep(2000);
    const s = await screen(page);
    return {result, notices: s.notices, fetches: fetches.slice(from)};
}

/** The messages under the static page window's boxes. */
async function windowErrors(win) {
    return win.form.locator('label.error, .error, .pkp_form_error').evaluateAll((els) =>
        [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]).catch(() => null);
}

module.exports = {...L, watchFetches, noticesAfter, windowErrors, T, sleep, flat};
