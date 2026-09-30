/**
 * @file lib/pkp/playwright/support/tabs.js
 *
 * Closing a tab or popup a test opened, safely.
 *
 * `page.close()` sent while the page's renderer has not yet taken in the
 * document the browser just committed (right after `LoginPage.signIn()`,
 * a `waitForURL(…, {waitUntil: 'commit'})` or a popup's first commit) can be
 * lost by Chromium: the tab stays open, running its page, and the close
 * never completes. Chromium would force the close after its unload timeout,
 * but it skips that timeout while a debugger is attached, and Playwright is
 * one, so `page.close()` waits until the test times out, naming no step
 * (U05 S6 on OJS: `.reports/flake-0930/u05s6/diagnosis.md`, red in 16 of 31
 * closes with the tab's CPU throttled 20x, 0 of 40 once the close waited for
 * the document's DOMContentLoaded). A whole context's `close()` is not
 * affected (0 of 20 in the same state).
 *
 * `closeTab(page)` waits for the current document's DOMContentLoaded (the
 * renderer has it) and then closes; a close that still does not complete is
 * reported by name instead of as a bare test timeout.
 */

const LOAD_WAIT_MS = 30_000;
const CLOSE_WAIT_MS = 30_000;

/**
 * @param {import('@playwright/test').Page} page
 */
async function closeTab(page) {
    if (page.isClosed()) {
        return;
    }
    // Bounded: a page that never reaches DOMContentLoaded (a third-party
    // address) is still closed, only later than its commit.
    await page.waitForLoadState('domcontentloaded', {timeout: LOAD_WAIT_MS}).catch(() => {});
    let timer;
    const stuck = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`closeTab: page.close() did not complete in ${CLOSE_WAIT_MS / 1000} s (${page.url()})`)),
            CLOSE_WAIT_MS
        );
    });
    try {
        await Promise.race([page.close(), stuck]);
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {closeTab};
