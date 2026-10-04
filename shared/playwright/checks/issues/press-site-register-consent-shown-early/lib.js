// Helpers of walk.js (issue report docs/issues/U02-OMP2-press-site-register-consent-shown-early.md).
// Requiring this file runs nothing.

/**
 * Where a box sits on screen: present, its classes, its computed position and left, and
 * whether any of it lies inside the window (an element parked at `left: -9999px` is
 * "visible" to Playwright, so the rectangle is read instead).
 */
async function onScreen(locator) {
    if (!(await locator.count())) return {present: false};
    return locator.first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
            present: true,
            classes: el.className,
            position: cs.position,
            left: cs.left,
            rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
            inWindow: r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth,
            text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        };
    });
}

/** A context's own consent line on the site-level Register page. */
function contextConsentLine(block) {
    return block.locator('.context_privacy');
}

module.exports = {onScreen, contextConsentLine};
