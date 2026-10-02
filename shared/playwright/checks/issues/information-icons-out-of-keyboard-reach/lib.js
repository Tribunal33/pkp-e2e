// Helpers of walk.js (issue report docs/issues/U64-A7-information-icons-out-of-keyboard-reach.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Open a page of the context by its path after `/index.php/<context>/en/`; returns the status. */
async function open(page, app, path, waitFor) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/${path}`));
    await idle(page).catch(() => {});
    if (waitFor) await page.locator(waitFor).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await sleep(800);
    return r ? r.status() : null;
}

/** The visible information icons (ui-library's Tooltip) as the page has them. */
function icons(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        return [...document.querySelectorAll('.tooltipButton')].filter(vis).map((e) => {
            const host = e.closest('h1, h2, h3, td, th, .pkpFormField__heading') || e.parentElement;
            return {
                tag: e.tagName.toLowerCase(),
                type: e.getAttribute('type'),
                tabindexAttr: e.getAttribute('tabindex'),
                tabIndex: e.tabIndex,
                role: e.getAttribute('role'),
                ariaHidden: e.getAttribute('aria-hidden'),
                label: txt(e.querySelector('.-screenReader')),
                beside: txt(host).slice(0, 80),
            };
        });
    });
}

/** The tooltip text showing now (floating-vue's popper), or null. */
function shownText(page) {
    return page.evaluate(() => {
        const p = [...document.querySelectorAll('.v-popper__popper.v-popper--theme-pkp-tooltip')]
            .filter((e) => e.classList.contains('v-popper__popper--shown') && (e.offsetWidth || e.offsetHeight));
        const e = p.pop();
        return e ? (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    });
}

/** Rest the pointer on the n-th visible icon, read the text it shows, move the pointer away. */
async function hoverIcon(page, n = 0) {
    const icon = page.locator('.tooltipButton:visible').nth(n);
    await icon.scrollIntoViewIfNeeded().catch(() => {});
    await icon.hover();
    await sleep(500);
    const text = await shownText(page);
    await page.mouse.move(2, 2);
    await sleep(400);
    return {text, afterLeaving: await shownText(page)};
}

/**
 * Click `start` (so the keyboard starts there), then press Tab up to `max` times while the focus
 * stays inside `scope`. Returns each stop: what it is, whether it is an information icon, and the
 * tooltip text showing while it holds the focus.
 */
async function tabThrough(page, start, {scope = 'main', max = 120} = {}) {
    await start.scrollIntoViewIfNeeded().catch(() => {});
    await start.click();
    await sleep(300);
    const stops = [];
    for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        await sleep(120);
        const f = await page.evaluate((scope) => {
            const e = document.activeElement;
            if (!e || e === document.body) return {tag: 'body', inScope: false};
            const text = (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('name') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
            return {tag: e.tagName.toLowerCase(), text, icon: !!e.closest('.tooltipButton'), inScope: !!e.closest(scope)};
        }, scope);
        if (!f.inScope) break;
        f.shown = await shownText(page);
        stops.push(f);
    }
    await page.mouse.move(2, 2);
    return {
        count: stops.length,
        order: stops.map((s) => (s.icon ? `[icon${s.text ? ' ' + s.text : ''}]` : `${s.tag}${s.text ? ` "${s.text}"` : ''}`)),
        iconStops: stops.filter((s) => s.icon).map((s) => ({label: s.text, shown: s.shown})),
        textsShown: [...new Set(stops.map((s) => s.shown).filter(Boolean))],
    };
}

/** Put the focus on the n-th visible element of `selector` as script would; says whether it took it and what shows. */
async function focusIt(page, selector, n = 0) {
    const took = await page.evaluate(([selector, n]) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const e = [...document.querySelectorAll(selector)].filter(vis)[n];
        if (!e) return null;
        e.focus();
        return document.activeElement === e;
    }, [selector, n]);
    await sleep(500);
    return {took, shown: await shownText(page)};
}

/** Collect every request that is not a GET from now on: `{list(), stop()}`. */
function writes(page) {
    const seen = [];
    const on = (r) => { if (r.method() !== 'GET') seen.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); };
    page.on('request', on);
    return {list: () => seen.slice(), stop: () => page.off('request', on)};
}

module.exports = {T, sleep, flat, open, icons, shownText, hoverIcon, tabThrough, focusIt, writes};
