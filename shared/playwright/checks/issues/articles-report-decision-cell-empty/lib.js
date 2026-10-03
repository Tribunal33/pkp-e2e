// Helpers of walk.js (U65 OJS3: "Articles Report" leaves the "Editor Decision"
// cell empty for several decisions; docs/issues/U65-OJS3-articles-report-decision-cell-empty.md).
// Requiring this file runs nothing. The report download and CSV reading are
// the U65 OJS1 walk's own, the decision helpers the U71 OMP10 walk's.
const {downloadReport, rowById, flat} = require('../articles-report-supporting-agencies-empty/lib.js');
const {openWorkflow, offered, decide} = require('../copyediting-no-assign-copyeditor-notice/lib.js');

/**
 * The editor blocks of a report's row: for each "(Editor k)", the editor's
 * name and the "Editor Decision n" / "Date decided n" pairs that hold
 * anything. Works on both the "Articles Report" ("Editor Decision 1  (Editor 1)")
 * and the "Monograph Report" ("Editor Decision 1 (Editor 1)").
 */
function editorBlocks(header, line) {
    const blocks = {};
    header.forEach((h, i) => {
        const m = h.match(/^(.*?)\s*\(Editor (\d+)\)$/);
        if (!m) return;
        const k = m[2];
        const b = (blocks[k] = blocks[k] || {editor: {}, decisions: {}});
        const d = m[1].match(/^(Editor Decision|Date decided) (\d+)$/);
        if (d) {
            const slot = (b.decisions[d[2]] = b.decisions[d[2]] || {});
            slot[d[1] === 'Editor Decision' ? 'decision' : 'date'] = line[i];
        } else {
            b.editor[m[1]] = line[i];
        }
    });
    return Object.entries(blocks).map(([k, b]) => ({
        k: Number(k),
        editor: [b.editor['Given Name'], b.editor['Family Name']].filter(Boolean).join(' '),
        decisions: Object.entries(b.decisions)
            .filter(([, x]) => x.decision || x.date)
            .map(([n, x]) => ({n: Number(n), decision: x.decision, date: x.date})),
    })).filter((b) => b.editor || b.decisions.length);
}

/** The decisions a row lists under `editorName` (Daniel Barnes), oldest first. */
function decisionsOf(rows, id, editorName) {
    const line = rows.find((r) => r[0] === String(id));
    if (!line) return null;
    const b = editorBlocks(rows[0], line).find((x) => x.editor === editorName);
    return b ? b.decisions : [];
}

/** Every cell pair in the file whose "Date decided" is filled and "Editor Decision" empty: [id, editor, n, date]. */
function unnamed(rows) {
    const out = [];
    for (const line of rows.slice(1)) {
        if (!line[0]) continue;
        for (const b of editorBlocks(rows[0], line)) {
            for (const d of b.decisions) if (!d.decision && d.date) out.push([line[0], b.editor, d.n, d.date]);
        }
    }
    return out;
}

/** Every decision name the file holds, with how many cells hold it (the neighbour's comparison). */
function namesCount(rows) {
    const out = {};
    for (const line of rows.slice(1)) {
        if (!line[0]) continue;
        for (const b of editorBlocks(rows[0], line)) for (const d of b.decisions) if (d.decision) out[d.decision] = (out[d.decision] || 0) + 1;
    }
    return out;
}

module.exports = {downloadReport, rowById, flat, openWorkflow, offered, decide, editorBlocks, decisionsOf, unnamed, namesCount};
