// Helpers of walk.js (issue report docs/issues/U64-A8-statistics-download-quotes-break-parameter-lines.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {createIssue} = require('../export-issues-list-no-order/lib');
const {publishIssue} = require('../unpublish-back-issue-clears-current/lib');
const {flat, statsRequests} = require('../download-issues-stops-at-30/lib');

/** Per-app words of Statistics › "Articles": the first report's button and a phrase one published title holds. */
const WORDS = {
    ojs: {first: 'Download Articles', phrase: 'Signalling Theory', plain: 'Signalling'},
    omp: {first: 'Download Monographs', phrase: 'Bomb Canada', plain: 'Bomb'},
    ops: {first: 'Download Preprints', phrase: 'Signalling Theory', plain: 'Signalling'},
};

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

/**
 * Issues › "Future Issues" › "Create Issue" (volume, number, year, title), then the new row's
 * "Publish Issue" with the email box unticked. Returns the name the list gave the issue.
 */
async function createAndPublishIssue(page, contextPath, spec, mark) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, contextPath);
    const save = await createIssue(issues, spec);
    await issues.goto('Future Issues');
    const name = (await issues.names('Future Issues').allInnerTexts()).map((s) => flat(s, 160)).find((n) => n.includes(mark));
    await publishIssue(page, contextPath, name);
    return {save, name};
}

/** The table as it stands: the count line and each row's text. */
async function readTable(stats) {
    await stats.page.waitForTimeout(600);
    return {
        range: flat(await stats.range.innerText().catch(() => null), 80),
        countLine: flat(await stats.itemsOfTotal.innerText().catch(() => null), 80),
        rows: (await stats.itemRows.allInnerTexts().catch(() => [])).map((s) => flat(s, 140)),
    };
}

/**
 * A downloaded statistics file as it was written: its first lines verbatim (the parameter lines,
 * the empty line, the column names and the first rows) and its line count.
 */
function readLines(file) {
    const lines = file.text.split(/\r?\n/);
    return {name: file.name.replace(/_\d{4}-\d\d-\d\dT[\d-]+:?\d*/, '_<time>'), bom: file.text.charCodeAt(0) === 0xfeff, lineCount: lines.length, head: lines.slice(0, 9)};
}

/**
 * "Download Report": the window's parameter rows; then, per button, the file and the request
 * behind it. The window closes itself after a download, so it is reopened for each button.
 */
async function downloads(stats, requests, buttons) {
    const out = {files: {}};
    for (const button of buttons) {
        out.files[button] = await attempt(async () => {
            const win = await stats.openDownload();
            if (!out.window) out.window = {params: await win.params(), headings: await win.headings()};
            if (!(await win.dialog.getByRole('button', {name: button, exact: true}).count())) {
                await win.close();
                return {offered: false};
            }
            requests.clear();
            const file = await win.download(button);
            return {request: requests.list().filter((r) => /csv/.test(r.accept || '')), ...readLines(file)};
        });
    }
    return out;
}

module.exports = {WORDS, flat, attempt, statsRequests, createAndPublishIssue, readTable, readLines, downloads};
