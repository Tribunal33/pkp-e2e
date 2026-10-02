// Helpers of walk.js (U36 A12: the "Download All Files" zip is named with two hyphens;
// docs/issues/U36-A12-download-all-files-zip-name-two-hyphens.md). Requiring this file runs nothing.
// The workflow by address and the list's rows are the sibling walk's (change-file-keeps-first-upload).
const {execFileSync} = require('child_process');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: a submission of the dataset in the Submission stage (the workflow opens on "Submission Files"). */
const CASES = {
    ojs: {submissionId: 4},
    omp: {submissionId: 3},
};

/** The block of the list `title`: its heading, its table and what sits under it. */
function listBlock(page, title) {
    return page.locator('div')
        .filter({has: page.getByRole('heading', {name: title, exact: true, level: 3})})
        .filter({has: page.getByRole('table', {name: title, exact: true})})
        .last();
}

/** "Download All Files" under the list `title`. */
const downloadAll = (page, title) => listBlock(page, title).getByRole('button', {name: 'Download All Files', exact: true})
    .or(listBlock(page, title).getByRole('link', {name: 'Download All Files', exact: true})).first();

/** The first file's name link in the list `title`. */
const firstFileLink = (page, title) => page.getByRole('table', {name: title, exact: true}).first().locator('tbody tr a').first();

/**
 * Press something that saves a file, in this tab or in the new tab it opens: the name the browser
 * is given, the address asked, and for a zip the names of the files inside.
 */
async function pressForDownload(page, locator) {
    const out = {control: flat(await locator.innerText().catch(() => null), 120), download: null};
    const here = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
    const there = page.context().waitForEvent('page', {timeout: 30_000})
        .then((p) => p.waitForEvent('download', {timeout: 30_000}).finally(() => p.close().catch(() => {})))
        .catch(() => null);
    const clicked = await locator.click({timeout: 15_000}).then(() => null, (e) => flat(e.message, 200));
    if (clicked) { out.clickError = clicked; return out; }
    const d = await Promise.race([here.then((x) => x || there), there.then((x) => x || here)]);
    if (!d) return out;
    const url = new URL(d.url());
    out.download = {
        name: d.suggestedFilename(),
        op: url.pathname.split('/').pop(),
        query: flat(url.search, 300),
        failure: await d.failure().catch((e) => flat(e.message, 120)),
    };
    const p = await d.path().catch(() => null);
    if (p && /\.zip$/.test(out.download.name)) {
        try { out.download.holds = execFileSync('unzip', ['-Z1', p], {encoding: 'utf8'}).split('\n').filter(Boolean); } catch (e) { out.download.holds = `unzip: ${flat(e.message, 120)}`; }
    }
    return out;
}

module.exports = {CASES, flat, listBlock, downloadAll, firstFileLink, pressForDownload};
