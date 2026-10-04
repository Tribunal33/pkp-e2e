// Helpers for walk.js (notice-close-blocked-by-open-window). Requiring this file runs nothing.
const NOTICE = '.app__notifications .pkpNotification';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Start a page-side log of the notices' comings and goings (performance.now() stamps), so a notice's
 * lifetime is measured where it happens rather than by polling from Node.
 */
async function watchNotices(page) {
    await page.evaluate((sel) => {
        if (window.__u58bNotices) return;
        const log = (window.__u58bNotices = []);
        let n = 0;
        const container = document.querySelector('.app__notifications');
        const obs = new MutationObserver((muts) => {
            for (const m of muts) {
                m.addedNodes.forEach((el) => {
                    if (el.nodeType === 1 && el.matches(sel.replace('.app__notifications ', ''))) {
                        el.dataset.u58bId = String(++n);
                        log.push({id: n, at: performance.now(), event: 'shown', text: el.innerText.replace(/\s+/g, ' ').trim()});
                    }
                });
                m.removedNodes.forEach((el) => {
                    if (el.nodeType === 1 && el.dataset && el.dataset.u58bId) {
                        log.push({id: Number(el.dataset.u58bId), at: performance.now(), event: 'removed'});
                    }
                });
            }
        });
        obs.observe(container, {childList: true, subtree: true});
    }, NOTICE);
}

/** Wait for a notice shown after `afterId` (the highest id seen so far); returns {id, text}. */
async function nextNotice(page, afterId, timeout = 10_000) {
    const handle = await page.waitForFunction(
        (after) => (window.__u58bNotices || []).find((e) => e.event === 'shown' && e.id > after) || null,
        afterId,
        {timeout, polling: 50}
    );
    return handle.jsonValue();
}

async function lastNoticeId(page) {
    return page.evaluate(() => (window.__u58bNotices || []).filter((e) => e.event === 'shown').reduce((m, e) => Math.max(m, e.id), 0));
}

/** How long notice `id` stayed (ms), once it is gone (waits up to `timeout`); null while it stands. */
async function lifetime(page, id, timeout = 15_000) {
    await page
        .waitForFunction((i) => (window.__u58bNotices || []).some((e) => e.id === i && e.event === 'removed'), id, {timeout, polling: 50})
        .catch(() => null);
    return page.evaluate((i) => {
        const log = window.__u58bNotices || [];
        const shown = log.find((e) => e.id === i && e.event === 'shown');
        const gone = log.find((e) => e.id === i && e.event === 'removed');
        return shown && gone ? Math.round(gone.at - shown.at) : null;
    }, id);
}

/** Milliseconds since notice `id` showed. */
async function ageOf(page, id) {
    return page.evaluate((i) => {
        const shown = (window.__u58bNotices || []).find((e) => e.id === i && e.event === 'shown');
        return shown ? Math.round(performance.now() - shown.at) : null;
    }, id);
}

/**
 * What the pointer meets at the centre of notice `id`'s "×", and the pointer-events the page computes
 * on the way: what a press there would reach.
 */
async function hitTest(page, id) {
    return page.evaluate((i) => {
        const note = document.querySelector(`[data-u58b-id="${i}"]`);
        if (!note) return {present: false};
        const button = note.querySelector('.pkpNotification__closeButton');
        const r = button.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        const describe = (el) =>
            el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}` : null;
        const pe = (el) => (el ? getComputedStyle(el).pointerEvents : null);
        const container = document.querySelector('.app__notifications');
        return {
            present: true,
            x: Math.round(x),
            y: Math.round(y),
            hitIsButton: !!hit && (hit === button || button.contains(hit)),
            hit: describe(hit),
            pointerEvents: {body: pe(document.body), container: pe(container), button: pe(button)},
            containerAriaHidden: container.getAttribute('aria-hidden'),
        };
    }, id);
}

/**
 * A real mouse press at the centre of notice `id`'s "×"; returns whether the notice is still there
 * `settle` ms later and its age at the press.
 */
async function pressClose(page, id, {settle = 600} = {}) {
    const hit = await hitTest(page, id);
    if (!hit.present) return {pressed: false, hit};
    const ageAtPress = await ageOf(page, id);
    await page.mouse.click(hit.x, hit.y);
    await sleep(settle);
    const stillThere = await page.locator(`[data-u58b-id="${id}"]`).count();
    return {pressed: true, ageAtPress, hit, stillThereAfterMs: settle, stillThere: stillThere > 0};
}

/** Rest the pointer on notice `id` for `ms`; returns whether it still stands at the end, and its age. */
async function restPointer(page, id, ms = 8000) {
    const hit = await hitTest(page, id);
    if (!hit.present) return {rested: false, hit};
    // On the notice's text, left of the "×".
    await page.mouse.move(hit.x - 120, hit.y);
    await sleep(ms);
    const stillThere = (await page.locator(`[data-u58b-id="${id}"]`).count()) > 0;
    const age = await ageOf(page, id);
    await page.mouse.move(5, 890);
    return {rested: true, restedMs: ms, stillThere, ageAtEnd: age, hit};
}

module.exports = {NOTICE, sleep, flat, watchNotices, nextNotice, lastNoticeId, lifetime, ageOf, hitTest, pressClose, restPointer};
