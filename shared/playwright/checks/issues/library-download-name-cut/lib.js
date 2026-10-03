// Helpers of the U39 A4 walk (a library file's download name): library-download-name-cut/walk.js.
// Requiring this file runs nothing. Each helper records what it saw rather than throwing, so a fix
// trial reads the state the fix brings.
const fs = require('fs');
const path = require('path');
const {outFile} = require('../../../probe');

/** A small PDF fixture (243 bytes; OJS's, which OPS's fixtures lack), the same for every app. */
const FIXTURE = () => path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');

/**
 * Copies of the app's small PDF fixture under the exact names the steps upload, in a folder of
 * the run's own (`outFile()` would add the app and run to the file name, which is what is tested).
 * Returns {name: path}.
 */
function makeUploads(app, names) {
    const dir = outFile('uploads.d').replace(/\.d$/, '');
    fs.mkdirSync(dir, {recursive: true});
    const src = FIXTURE(app);
    const out = {};
    for (const n of names) {
        out[n] = path.join(dir, n);
        fs.copyFileSync(src, out[n]);
    }
    return {files: out, bytes: fs.statSync(src).size};
}

/**
 * "Add a file" with "Name", "Type" and the file, "OK"; returns whether the row is listed.
 * `list` is a `LibraryList` (shared/playwright/pages/LibraryPages.js).
 */
async function addFile(list, {name, type, file}) {
    try {
        const win = await list.openAdd();
        await win.add({name, type, file});
        return {added: await list.nameLink(name).count() > 0};
    } catch (e) {
        return {added: false, error: String(e.message).split('\n')[0].slice(0, 300)};
    }
}

/**
 * Press the file's name and read what the browser downloads: the suggested name, its length, the
 * size, and the response's Content-Disposition. The page objects' `download()` waits until the list
 * has been drawn again after the press (pitfall 10).
 */
async function downloadRead(page, list, name) {
    const headers = [];
    const onResp = (r) => {
        if (/download-library-file|downloadLibraryFile/i.test(r.url())) headers.push({status: r.status(), disposition: r.headers()['content-disposition'] || null});
    };
    page.on('response', onResp);
    try {
        const {download, before, after} = await list.download(name);
        if (!download) return {error: 'no download', headers};
        const file = await download.path().catch(() => null);
        const suggested = download.suggestedFilename();
        return {
            name: suggested,
            length: suggested.length,
            bytes: file ? fs.statSync(file).size : null,
            pageStayed: before === after,
            headers,
        };
    } catch (e) {
        return {error: String(e.message).split('\n')[0].slice(0, 300), headers};
    } finally {
        page.off('response', onResp);
    }
}

module.exports = {makeUploads, addFile, downloadRead};
