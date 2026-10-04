// Helpers of walk.js (U26 A10: the "Revisions Uploaded" list's description on a round where no
// revisions were requested; docs/issues/U26-A10-revisions-panel-says-revisions-requested.md).
// Requiring this file runs nothing.
const {sql} = require('../../../probe');

/**
 * A workflow file list read by its table name ("Revisions Uploaded", "Files for Review"): the
 * heading, the description the table is described by, and the rows' text.
 */
async function fileList(page, name) {
    const table = page.getByRole('table', {name, exact: true}).first();
    if (!(await table.isVisible().catch(() => false))) return {shown: false};
    const describedBy = await table.getAttribute('aria-describedby').catch(() => null);
    const description = describedBy
        ? (await page.locator(`[id="${describedBy}"]`).first().innerText().catch(() => null))
        : null;
    const rows = await table.locator('tbody tr').allInnerTexts().catch(() => []);
    return {shown: true, description: description && description.trim(), rows: rows.map((r) => r.replace(/\s+/g, ' ').trim())};
}

/** The decisions stored on a submission: decision, stage, round. */
function storedDecisions(app, submissionId) {
    const rows = sql(app, `select decision, stage_id, review_round_id from edit_decisions where submission_id = ${Number(submissionId)} order by edit_decision_id`);
    return rows ? rows.split('\n').map((l) => l.split('|').map((x) => (x === '' ? null : Number(x)))) : [];
}

module.exports = {fileList, storedDecisions};
