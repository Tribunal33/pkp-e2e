// Helpers of walk.js (U65 OMP1: a book declined at Internal Review is not counted under
// "Submissions Declined"; docs/issues/U65-OMP1-internal-review-decline-not-counted-declined.md).
// Requiring this file runs nothing. The workflow opener and the decision wizard are
// ../internal-revisions-request-gives-author-no-task/lib.js's.
const {idle} = require('../../../probe');
const D = require('../internal-revisions-request-gives-author-no-task/lib.js');

const T = 60_000;

/**
 * Statistics › "Editorial Activity" opened from its address; the "Trends" table as read:
 * `{columns, rows: [[name, range, total]…]}`, each name without its icon label or indent.
 */
async function readTrends(page, app) {
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}${locale}/stats/editorial/editorial`));
    await idle(page);
    const table = page.getByRole('table', {name: 'Trends'}).first();
    try {
        await table.waitFor({state: 'visible', timeout: T});
    } catch (e) {
        return {columns: [], rows: [], error: String(e.message).slice(0, 200)};
    }
    await idle(page);
    const columns = (await table.getByRole('columnheader').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const rows = await table.locator('tbody tr').evaluateAll((trs) =>
        trs.map((tr) => {
            const cells = [...tr.querySelectorAll('td, th')];
            const copy = cells[0].cloneNode(true);
            copy.querySelectorAll('.tooltipButton, .-screenReader, .sr-only, [class*="tooltip"]').forEach((e) => e.remove());
            const name = copy.textContent.replace(/ /g, ' ').replace(/Description for .*$/s, '').replace(/\s+/g, ' ').trim();
            return [name, ...cells.slice(1).map((c) => c.textContent.replace(/\s+/g, ' ').trim())];
        })
    );
    return {columns, rows};
}

/** `{row: [range, total]}` for the named rows (null for a row the table lacks). */
function pick(rows, names) {
    return Object.fromEntries(names.map((n) => {
        const r = rows.find((x) => x[0] === n);
        return [n, r ? r.slice(1) : null];
    }));
}

/**
 * As the signed-in editor: open submission `id`'s workflow, press `label` and take the decision
 * wizard to "Record Decision". Returns the stage header, the buttons offered, the wizard's steps and
 * the decision request's status; an error is recorded, never thrown.
 */
async function decide(page, app, id, label) {
    const out = {id, label};
    try {
        out.opened = await D.openEditorial(page, app, id, label);
        Object.assign(out, await D.recordDecision(page, label));
    } catch (e) {
        out.error = String(e.message).slice(0, 300);
    }
    out.stored = D.decisions(app, id);
    return out;
}

module.exports = {readTrends, pick, decide};
