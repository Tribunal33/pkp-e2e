// Helpers for walk.js (U59 A2). Requiring this file runs nothing.
const {expect} = require('@playwright/test');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', wizard: 'Journal Settings'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', wizard: 'Setup'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', wizard: 'Server Settings'},
};

/**
 * Count the list's own refetches (the grid's `fetch-grid` / `fetch-row`
 * calls) from now on: `{list(), stop()}`.
 *
 * @param {import('@playwright/test').Page} page
 */
function gridFetches(page) {
    const seen = [];
    const on = (r) => {
        if (/context-grid\/fetch-(grid|row)/.test(r.url())) seen.push(r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''));
    };
    page.on('request', on);
    return {list: () => [...seen], stop: () => page.off('request', on)};
}

/**
 * The row of the context with `id`, read as on screen: its "Name" (the
 * arrow's hidden "Settings" dropped) and "Path".
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} id
 */
async function readRow(page, id) {
    const row = page.locator(`#contextGridContainer tbody tr.gridRow[id$="-row-${id}"]`);
    await expect(row).toHaveCount(1, {timeout: T});
    return row.evaluate((tr) => {
        const cells = tr.querySelectorAll('td');
        const copy = /** @type {HTMLElement} */ (cells[0].cloneNode(true));
        copy.querySelectorAll('a, script').forEach((e) => e.remove());
        return {
            name: copy.textContent.replace(/\s+/g, ' ').trim(),
            path: ((cells[1] || {}).textContent || '').replace(/\s+/g, ' ').trim(),
        };
    });
}

/**
 * Wait for the window to go, then for any refetch it set off to land:
 * a bounded wait for the grid's answer (none comes when nothing asks).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} root the window
 */
async function windowGone(page, root) {
    await expect(root).toHaveCount(0, {timeout: T});
    await page
        .waitForResponse((r) => /context-grid\/fetch-(grid|row)/.test(r.url()), {timeout: 3_000})
        .then(() => page.waitForLoadState('networkidle', {timeout: 5_000}).catch(() => {}))
        .catch(() => {});
}

module.exports = {T, flat, WORDS, gridFetches, readRow, windowGone};
