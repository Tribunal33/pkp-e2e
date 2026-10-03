// Helpers of walk.js (U65 A1: submissions received on the date range's last day are left out of
// "Submissions Received"; docs/issues/U65-A1-range-last-day-left-out-of-received.md).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 60_000;

/**
 * The "Trends" table as it stands on the open "Editorial Activity" page:
 * `{columns, range, rows: {name: [dateRange, total]}}`, each name without its icon label or indent;
 * `range` the page's current date-range text. An error is recorded, never thrown.
 */
async function readTrends(page) {
    const table = page.getByRole('table', {name: 'Trends'}).first();
    try {
        await table.waitFor({state: 'visible', timeout: T});
    } catch (e) {
        return {columns: [], rows: {}, error: String(e.message).slice(0, 200)};
    }
    await idle(page);
    const columns = (await table.getByRole('columnheader').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const list = await table.locator('tbody tr').evaluateAll((trs) =>
        trs.map((tr) => {
            const cells = [...tr.querySelectorAll('td, th')];
            const copy = cells[0].cloneNode(true);
            copy.querySelectorAll('.tooltipButton, .-screenReader, .sr-only, [class*="tooltip"]').forEach((e) => e.remove());
            const name = copy.textContent.replace(/ /g, ' ').replace(/Description for .*$/s, '').replace(/\s+/g, ' ').trim();
            return [name, ...cells.slice(1).map((c) => c.textContent.replace(/\s+/g, ' ').trim())];
        })
    );
    const range = (await page.locator('.pkpDateRange__current').first().innerText().catch(() => '')).trim();
    return {columns, range, rows: Object.fromEntries(list.map((r) => [r[0], r.slice(1)]))};
}

/**
 * On the open "Editorial Activity" page: the calendar button ("Change date range"), the two
 * "Custom Range" boxes typed, "Apply". Returns the error line the form shows, if any.
 */
async function customRange(page, from, to) {
    await page.getByRole('button', {name: 'Change date range'}).click();
    const form = page.locator('.pkpDateRange__form');
    await form.waitFor({state: 'visible', timeout: T});
    await page.locator('.pkpDateRange__input--start').fill(from);
    await page.locator('.pkpDateRange__input--end').fill(to);
    // The range text changes before the table does: wait for the page's own figures request for
    // the new range (and its averages) to answer, or a read can catch the previous range's rows.
    const answered = page
        .waitForResponse((r) => /\/stats\/editorial\?/.test(r.url()) && r.url().includes(`dateEnd=${to}`), {timeout: T})
        .catch(() => null);
    await form.getByRole('button', {name: 'Apply'}).click();
    await answered;
    await page.waitForTimeout(800);
    await idle(page);
    const err = page.locator('.pkpDateRange__form .text-base-normal');
    return (await err.count()) && (await err.isVisible()) ? (await err.innerText()).trim() : null;
}

module.exports = {readTrends, customRange};
