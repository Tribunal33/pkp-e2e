// Helpers of walk.js (issue report docs/issues/U69-A9-book-file-open-download-fails.md).
// Requiring this file runs nothing. Every helper reads a screen a reader sees, or a file
// the install writes (the usage log).
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const {sleep, flat, rel} = require('../older-version-pdf-reader-empty/lib');

/** The fleet's files directory, from its config (`files_dir`). */
function filesDir(app) {
    const repo = path.join(__dirname, '../../../../..');
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.join(repo, app.configFile);
    const m = fs.readFileSync(config, 'utf8').match(/^files_dir\s*=\s*"?([^"\n]+)"?\s*$/m);
    return m ? m[1].trim() : null;
}

/**
 * The usage log (`usageStats/usageEventLogs/usage_events_{date}.log`): `since()` gives
 * the lines written after this call, as {assocType, submissionId, representationId,
 * submissionFileId, url}.
 */
function usageLog(app) {
    const dir = path.join(filesDir(app), 'usageStats', 'usageEventLogs');
    const read = () =>
        fs.existsSync(dir)
            ? fs.readdirSync(dir).filter((f) => f.endsWith('.log')).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean))
            : [];
    let seen = read().length;
    return {
        since() {
            const lines = read();
            const fresh = lines.slice(seen);
            seen = lines.length;
            return fresh.map((l) => {
                try {
                    const e = JSON.parse(l);
                    return {assocType: e.assocType, submissionId: e.submissionId, representationId: e.representationId, submissionFileId: e.submissionFileId, url: rel(e.canonicalUrl || e.url || '')};
                } catch {
                    return {raw: flat(l, 200)};
                }
            });
        },
    };
}

/**
 * The PDF view page as a reader sees it: tab title, the bar, and the viewer's page count,
 * rendered pages and error bar (pdf.js's `#errorWrapper`, with "More Information" pressed).
 */
async function readViewPage(page) {
    await idle(page).catch(() => {});
    await sleep(4000);
    const viewer = page.frameLocator('#pdfCanvasContainer > iframe');
    const visible = (l) => l.isVisible({timeout: 3000}).catch(() => false);
    const text = (l) => l.innerText({timeout: 3000}).then((t) => flat(t, 300)).catch(() => null);
    const errorShown = await visible(viewer.locator('#errorWrapper'));
    let more = null;
    if (errorShown) {
        await viewer.locator('#errorShowMore').click({timeout: 3000}).catch(() => {});
        more = await viewer.locator('#errorMoreInfo').inputValue({timeout: 3000}).then((t) => flat(t, 300)).catch(() => null);
    }
    return {
        url: rel(page.url()),
        title: await page.title(),
        bar: flat(await page.locator('header.header_viewable_file').innerText().catch(() => null), 200),
        downloadHref: rel(await page.locator('header.header_viewable_file a.download').getAttribute('href').catch(() => null)),
        frameSrc: flat(await page.locator('#pdfCanvasContainer > iframe').getAttribute('src').catch(() => null), 300),
        numPages: await text(viewer.locator('#numPages')),
        renderedPages: await viewer.locator('#viewer .page canvas').count().catch(() => null),
        errorBar: errorShown ? await text(viewer.locator('#errorMessage')) : null,
        errorMore: more,
    };
}

/** Press a link or button that should save a file: the download the browser starts and whether it completes. */
async function pressForDownload(page, locator, watched) {
    const dl = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
    await locator.click({timeout: 10_000}).catch((e) => ({error: flat(e.message, 160)}));
    const d = await dl;
    const out = {download: null};
    if (d) {
        out.download = {suggestedFilename: d.suggestedFilename(), url: rel(d.url()).slice(0, 160), failure: await d.failure().catch((e) => `error ${flat(e.message, 120)}`)};
        if (!out.download.failure) {
            const p = await d.path().catch(() => null);
            if (p) out.download.bytes = fs.statSync(p).size;
        }
    }
    await sleep(1500);
    out.pageAfter = {url: rel(page.url()), title: await page.title().catch(() => null), body: flat(await page.locator('body').innerText().catch(() => ''), 200)};
    out.fileRequests = watched.splice(0);
    return out;
}

module.exports = {filesDir, usageLog, readViewPage, pressForDownload};
