/**
 * @file lib/pkp/playwright/pages/BasePage.js
 *
 * POM base class. POMs hold the Playwright page reference and locators as
 * instance properties. Shared (all-apps) POMs live here; app-only POMs live in
 * each app's playwright/pages/.
 */

exports.BasePage = class BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Wait until the open document's stylesheets are in (its `load` event),
     * for a reader of computed styles or positions on a reader-facing page.
     * The theme's stylesheet (`$$$call$$$/page/page/css?name=stylesheet`) is
     * a PHP request the browser fetches again on every page (no
     * Cache-Control, a Last-Modified seconds old on a scratch context), and
     * the page's scripts sit in its footer, so the heading and the sidebar
     * are in the DOM, visible, while that request is still out; until it
     * lands `getComputedStyle` answers without the theme. `page.goto()` and
     * `reload()` already wait for `load`; a link's `click()`, a heading or
     * URL assertion do not (OMP U16 S8, 2026-09-27/28). Call it after the
     * new page's own landmark, so the document it waits on is the new one.
     */
    async stylesApplied() {
        await this.page.waitForLoadState('load', {timeout: 30_000});
    }

    /**
     * Site-scoped URL (the `index` context), e.g. siteUrl('/login').
     *
     * @param {string} pathname
     * @returns {string}
     */
    siteUrl(pathname) {
        return `/index.php/index${pathname}`;
    }

    /**
     * Context-scoped URL, e.g. contextUrl('publicknowledge', '/dashboard').
     *
     * @param {string} contextPath
     * @param {string} pathname
     * @returns {string}
     */
    contextUrl(contextPath, pathname) {
        return `/index.php/${contextPath}${pathname}`;
    }
};
