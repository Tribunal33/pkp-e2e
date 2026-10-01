// Helpers for walk.js (U21 A10). Requiring this file runs nothing.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Init script: every change of the step rail's collapsed state and step count, with its time and widths. */
function watchRail() {
    window.__rail = [];
    let last = null;
    const read = () => {
        const el = document.querySelector('.pkpSteps');
        const w = el && el.querySelector('.pkpSteps__buttonWrapper');
        const s = el ? `${el.classList.contains('pkpSteps--collapsed')}|${el.querySelectorAll('.pkpSteps__buttons > li').length}|${w ? w.offsetWidth : null}` : null;
        if (s !== last) {
            last = s;
            window.__rail.push({at: Math.round(performance.now()), state: s});
        }
    };
    const start = () => new MutationObserver(read).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
    if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
}

/**
 * The step rail as the screen shows it: collapsed or not, the "{n}/{total} steps" text, whether the page
 * scrolls sideways, the rail's own widths (what maybeToggleCollapsedView() compares), and the width chain
 * from the rail up to <body> with the CSS that sizes each box.
 */
function readRail(page) {
    return page.evaluate(() => {
        const steps = document.querySelector('.pkpSteps');
        if (!steps) return {found: false};
        const wrap = steps.querySelector('.pkpSteps__buttonWrapper');
        const spans = [...wrap.querySelectorAll('li>span')];
        const chain = [];
        for (let e = wrap; e && e !== document.documentElement; e = e.parentElement) {
            const cs = getComputedStyle(e);
            chain.push({
                el: e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''),
                offsetWidth: e.offsetWidth, scrollWidth: e.scrollWidth, display: cs.display, minWidth: cs.minWidth,
                flex: cs.flex, overflowX: cs.overflowX, parentDisplay: e.parentElement ? getComputedStyle(e.parentElement).display : null,
            });
        }
        const controls = steps.querySelector('.pkpSteps__controls');
        return {
            found: true,
            viewport: window.innerWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            scrollsSideways: document.documentElement.scrollWidth > window.innerWidth,
            collapsed: steps.classList.contains('pkpSteps--collapsed'),
            controls: controls ? controls.innerText.replace(/\s+/g, ' ').trim() : null,
            showAllSteps: !!steps.querySelector('.pkpSteps__controls button'),
            stepLabels: [...wrap.querySelectorAll('.pkpSteps__step__label')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
            rail: {wrapperWidth: wrap.offsetWidth, stepsWidthSum: spans.reduce((t, s) => t + s.offsetWidth, 0), lastStepRight: Math.round(spans.length ? spans[spans.length - 1].getBoundingClientRect().right : 0)},
            chain,
        };
    });
}

/** Wait until the rail has stayed in one state for `quietMs` (the rail's own resize check is debounced 100 ms). */
async function railSettled(page, quietMs = 600, maxMs = 8000) {
    const t0 = Date.now();
    let prev = null;
    let since = Date.now();
    while (Date.now() - t0 < maxMs) {
        const cur = JSON.stringify(await page.evaluate(() => (window.__rail || []).slice(-1)[0] || null).catch(() => null));
        if (cur !== prev) { prev = cur; since = Date.now(); }
        if (Date.now() - since >= quietMs) return true;
        await sleep(100);
    }
    return false;
}

module.exports = {sleep, watchRail, readRail, railSettled};
