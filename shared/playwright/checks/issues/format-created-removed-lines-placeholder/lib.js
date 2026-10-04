// Helpers of the U38 OMP1 walk (issue report
// docs/issues/U38-OMP1-format-created-removed-lines-placeholder.md). Requiring this file runs
// nothing. The book, its "Publication Formats" page and "Add publication format" are the U73
// walk's helpers; "Activity Log" and "History" the U36 A10 / U38 A2 walk's.
const {idle, screen, record, sql} = require('../../../probe');
const L = require('../format-controls-offered-then-refused/lib.js');
const N = require('../add-note-empty-box-posts-empty-note/lib.js');

exports.L = L;
exports.N = N;
exports.flat = L.flat;
exports.sleep = L.sleep;

/** A format's "Not Available" › "OK" in "Format Availability". Returns the row afterwards. */
exports.makeAvailable = async function makeAvailable(page, formats, name) {
    const win = await formats.openStatus(formats.formatRow(name), 'Not Available', 'Format Availability');
    await win.ok();
    await formats.rowLink(formats.formatRow(name), 'Available').waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    return L.rowState(formats, name);
};

/** A format's arrow › "Delete" › "OK". Returns the question asked and whether the row is gone. */
exports.deleteFormat = async function deleteFormat(page, formats, name) {
    const dialog = await formats.openDelete(name);
    const question = L.flat(await dialog.dialog().innerText().catch(() => ''));
    await dialog.ok();
    await formats.formatRow(name).waitFor({state: 'detached', timeout: 30_000}).catch(() => {});
    await idle(page);
    return {question, rowLeft: await formats.formatRow(name).count()};
};

/**
 * The workflow header's "Activity Log", then "History": its lines (date, user, event), newest
 * first, the format lines picked out. Records the screen under `label`. Leaves the window open.
 */
exports.readHistory = async function readHistory(page, label) {
    await N.openActivityLog(page);
    const lines = await N.openHistory(page, label);
    return {lines: lines.length, formatLines: lines.filter((l) => /publication format|format de publication/i.test(l.event || ''))};
};

/** The format lines as stored for a submission: log id|event type|message|setting|locale|value. */
exports.storedFormatLines = function storedFormatLines(app, submissionId) {
    return sql(
        app,
        `select e.log_id, e.event_type, e.message, s.setting_name, s.locale, s.setting_value from event_log e left join event_log_settings s on s.log_id = e.log_id where e.assoc_type = 1048585 and e.assoc_id = ${Number(submissionId)} and e.message like 'submission.event.publicationFormat%' order by e.log_id, s.setting_name, s.locale`
    ).split('\n').filter(Boolean);
};
