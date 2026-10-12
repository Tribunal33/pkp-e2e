/**
 * @file lib/pkp/playwright/support/motion.js
 *
 * Disable UI animations and transitions in every page of a BrowserContext so
 * tests never wait on cosmetic motion — the side modal's 450ms reka-ui
 * slide-in/out is the big one (reka-ui keeps the closing DialogContent
 * mounted until animationend).
 *
 * Durations are forced to 0.01ms, NOT 0: Vue <Transition> and the
 * reka-ui/headlessui presence helpers wait on transitionend/animationend (or
 * read the computed duration), and a true 0 can mean "no event ever fires",
 * which would leave leaving elements mounted forever. 0.01ms still fires the
 * events, one frame later.
 *
 * Registered via context.addInitScript so it reaches every page and popup the
 * context opens; pairs with `reducedMotion: 'reduce'` in config-factory.js
 * for anything honoring prefers-reduced-motion.
 *
 * Shortened is not gone. An animation still starts at its first keyframe
 * and stays there until the browser has produced the frames that start it
 * and move its clock past 0.01ms: two or three frames, 12 to 31 ms on an
 * idle machine, longer on a loaded runner. A Vue side window's first
 * keyframe is `translateX(100%)` (ui-library `SideModalBody.vue`), so for
 * that long the whole window stands right of the viewport while
 * `toBeVisible()` already passes on it. Playwright's ordinary actions wait
 * that out (the "stable" check, and a retry on a target outside the
 * viewport); a forced action and a geometry read do not: `check({force:
 * true})` throws "Element is outside of the viewport" at once (U34 S3 on
 * CI, `.reports/flake-1012/u34s3-review-files-box/diagnosis.md`). Before
 * either, wait with `motionEnded(locator)` below.
 */

const DISABLE_MOTION_CSS = `
    *, *::before, *::after {
        transition-duration: 0.01ms !important;
        transition-delay: 0ms !important;
        animation-duration: 0.01ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
    }
    html {
        scroll-behavior: auto !important;
    }
`;

/**
 * Register the animation-disabling stylesheet on a BrowserContext.
 * Call once per context, before its pages navigate.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
async function disableMotion(context) {
    await context.addInitScript((css) => {
        const inject = () => {
            // An XML document (an OAI or feed address, XSLT-rendered or
            // raw) has no <head>: nothing to style, and no page error.
            if (!document.head) {
                return;
            }
            const style = document.createElement('style');
            style.setAttribute('data-pkp-test', 'disable-motion');
            style.textContent = css;
            document.head.appendChild(style);
        };
        // Init scripts run at document-start, before <head> exists.
        if (document.head) {
            inject();
        } else {
            document.addEventListener('DOMContentLoaded', inject);
        }
    }, DISABLE_MOTION_CSS);
}

/**
 * Wait until nothing moves the locator's element any more: every animation
 * and transition running on it or on an element around it (a side window's
 * slide-in above a row's box) has finished, so the element stands where a
 * person sees it. Call it before a forced action (`{force: true}` skips
 * Playwright's own wait and does not retry) or a geometry read
 * (`boundingBox()`, a computed position) on anything in a window or panel
 * that has just opened. It waits on the animations themselves, never on
 * time; one that never ends (an endless spinner) is left out, and one
 * cancelled under the wait counts as over.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {{timeout?: number}} [options]
 */
async function motionEnded(locator, {timeout = 30_000} = {}) {
    await locator.evaluate(
        (el, ms) => {
            // getAnimations() flushes pending style first, so an animation
            // of an element mounted in this same task is already listed.
            const moving = document.getAnimations().filter((a) => {
                const target = a.effect && /** @type {any} */ (a.effect).target;
                return target && target.contains(el) && Number.isFinite(Number(a.effect.getComputedTiming().endTime));
            });
            return new Promise((resolve, reject) => {
                const late = setTimeout(() => {
                    const names = moving
                        .filter((a) => a.playState !== 'finished')
                        .map((a) => /** @type {any} */ (a).animationName || /** @type {any} */ (a).transitionProperty || 'animation');
                    reject(new Error(`motionEnded: still moving after ${ms} ms (${names.join(', ')})`));
                }, ms);
                Promise.all(moving.map((a) => a.finished.catch(() => {}))).then(() => {
                    clearTimeout(late);
                    resolve();
                });
            });
        },
        timeout,
        {timeout}
    );
}

module.exports = {disableMotion, motionEnded};
