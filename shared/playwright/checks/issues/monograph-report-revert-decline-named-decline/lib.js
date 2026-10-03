// Helpers of walk.js (U65 OMP4: "Monograph Report" names a reverted Internal
// Review decline "Decline Submission";
// docs/issues/U65-OMP4-monograph-report-revert-decline-named-decline.md).
// Requiring this file runs nothing. The report download is the U65 OJS1
// walk's, the workflow and decision helpers the U71 OMP10 walk's.
const {downloadReport} = require('../articles-report-supporting-agencies-empty/lib.js');
const {openWorkflow, offered, decide} = require('../copyediting-no-assign-copyeditor-notice/lib.js');

/**
 * A report line's editor blocks: for each "(Editor k)", the editor's name and
 * the filled "Editor Decision n" / "Date decided n (Editor k)" pairs.
 */
function editorBlocks(header, line) {
    const blocks = {};
    header.forEach((h, i) => {
        const m = h.match(/^(.*?)\s*\(Editor (\d+)\)$/);
        if (!m) return;
        const b = (blocks[m[2]] = blocks[m[2]] || {editor: {}, decisions: {}});
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

/** Every editor block of submission `id`'s line ({k, editor, decisions}), or null without a line. */
function blocksOf(rows, id) {
    const line = rows.find((r) => r[0] === String(id));
    return line ? editorBlocks(rows[0], line) : null;
}

/** Every decision name in the file with how many cells hold it (the neighbour's comparison). */
function namesCount(rows) {
    const out = {};
    for (const line of rows.slice(1)) {
        if (!line[0]) continue;
        for (const b of editorBlocks(rows[0], line)) for (const d of b.decisions) if (d.decision) out[d.decision] = (out[d.decision] || 0) + 1;
    }
    return out;
}

module.exports = {downloadReport, openWorkflow, offered, decide, editorBlocks, blocksOf, namesCount};
