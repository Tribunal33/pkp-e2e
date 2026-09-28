/**
 * @file lib/pkp/playwright/support/throttle.js
 *
 * Opt-in race amplifier for flake hunting: `PLAYWRIGHT_CPU_THROTTLE=<rate>`
 * slows every page's main thread by that factor through the DevTools
 * protocol (Chromium only), so the timing windows a slow CI runner or the
 * 4-core VM opens reproduce on a fast machine. Off unless the variable is
 * set to a number above 1; never set in CI or a final.
 *
 * `PLAYWRIGHT_RAF_HOLD_MS=<ms>` is the second lever: every
 * `requestAnimationFrame` callback of every page is deferred by that many
 * milliseconds, which holds open the windows that end "a frame or two after
 * the click" (headlessui hands the focus to an opened menu two frames
 * later: the U30 S4 race, `.reports/flake-s26/u30/diagnosis.md`). CPU
 * throttling does not open those windows, since it slows the test's own
 * in-page reads as much as the frames. Off unless set; never in CI.
 *
 * `PLAYWRIGHT_HOLD_URL=<regex>` with `PLAYWRIGHT_HOLD_MS=<ms>` is the third:
 * every request whose URL matches the regex is held that long before it
 * goes out, in every context, which is the "hold one request the
 * hypothesis names" lever without editing a test (TinyMCE's content
 * stylesheets for the legacy-editor race of U14 S5,
 * `.reports/flake-s28/u14s5-email/diagnosis.md`). Off unless both are set;
 * never in CI.
 */

const rate = Number(process.env.PLAYWRIGHT_CPU_THROTTLE || 0);
const rafHoldMs = Number(process.env.PLAYWRIGHT_RAF_HOLD_MS || 0);
const holdUrl = process.env.PLAYWRIGHT_HOLD_URL ? new RegExp(process.env.PLAYWRIGHT_HOLD_URL) : null;
const holdMs = Number(process.env.PLAYWRIGHT_HOLD_MS || 0);

/**
 * Throttle the CPU of every page (and popup) a BrowserContext opens.
 * Call once per context, right after creating it.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
async function throttleCpu(context) {
    if (holdUrl && holdMs > 0) {
        await context.route(holdUrl, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, holdMs));
            await route.continue().catch(() => {});
        });
    }
    if (rafHoldMs > 0) {
        await context.addInitScript((ms) => {
            const raf = window.requestAnimationFrame.bind(window);
            window.requestAnimationFrame = (cb) => raf(() => setTimeout(() => cb(performance.now()), ms));
        }, rafHoldMs);
    }
    if (!(rate > 1)) {
        return;
    }
    context.on('page', async (page) => {
        try {
            const cdp = await context.newCDPSession(page);
            await cdp.send('Emulation.setCPUThrottlingRate', {rate});
        } catch {
            // A page closed before the session attached, or a non-Chromium
            // browser: throttling is best-effort.
        }
    });
}

module.exports = {throttleCpu, cpuThrottleRate: rate, rafHoldMs};
