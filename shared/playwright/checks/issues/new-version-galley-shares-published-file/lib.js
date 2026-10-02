// Helpers of walk.js here (issue report docs/issues/U46-A4-OJS1-new-version-galley-shares-published-file.md).
// Requiring this file runs nothing. The version helpers are the U44 A5 and U48 walks'
// (../new-version-galley-publisher-id-refused/lib.js, ../jats-body-html-markup-as-text/lib.js), the reader
// helpers the U13 A2 walk's (../older-version-pdf-reader-empty/lib.js); `stored()` reads the database for
// Evidence only.
const crypto = require('crypto');
const fs = require('fs');
const {expect} = require('@playwright/test');
const {sql, idle, launch} = require('../../../probe');
const {workflow, newVersion} = require('../new-version-galley-publisher-id-refused/lib');
const {openVersionPage} = require('../jats-body-html-markup-as-text/lib');
const {readLanding, watch, pressDownload} = require('../older-version-pdf-reader-empty/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);

/** Open one version's "Galleys" page ('first' = the published 1.0, 'latest' = the new one); returns the manager. */
async function openGalleys(page, app, sid, which) {
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const frame = workflow(page, app);
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const at = await openVersionPage(page, app, frame, which, 'Galleys');
    const gm = new GalleyManager(page, frame);
    await gm.expectLoaded();
    return {gm, frame, version: at.version};
}

/** A galley row as the page shows it: label, whether the label is a link, the row menu's items. */
async function readRow(page, gm, label) {
    const row = gm.row(label);
    if (!(await row.count())) return {present: false};
    const link = gm.nameLink(label);
    const out = {present: true, text: flat(await row.innerText()), link: (await link.count()) > 0};
    out.menu = await gm.menuOffers(label).catch((e) => `error ${flat(e.message, 120)}`);
    return out;
}

/**
 * Press a row's label link (a download in a new tab): the file the browser gets, or the answer of
 * `…/download-file` when no download comes.
 */
async function pressLabel(page, gm, label) {
    const link = gm.nameLink(label);
    if (!(await link.count())) return {link: false};
    const answers = [];
    const onResponse = (r) => {
        if (/download-file|downloadFile/.test(r.url())) answers.push({status: r.status(), type: r.headers()['content-type'] || null});
    };
    const ctx = page.context();
    const pages = [];
    const got = [];
    const onDl = (d) => got.push(d);
    const onPage = (p) => { pages.push(p); p.on('response', onResponse); p.on('download', onDl); };
    ctx.on('page', onPage);
    page.on('response', onResponse);
    page.on('download', onDl);
    await link.click();
    for (let i = 0; i < 30 && !got.length && !answers.length; i++) await sleep(500);
    await sleep(1500);
    ctx.off('page', onPage);
    page.off('response', onResponse);
    page.off('download', onDl);
    const out = {link: true, answers};
    if (got.length) {
        const d = got[0];
        const p = await d.path().catch(() => null);
        out.download = {name: d.suggestedFilename(), sha: p ? sha(p) : null, bytes: p ? fs.statSync(p).size : null};
    } else {
        out.download = null;
        const tab = pages[0];
        if (tab) out.tabText = flat(await tab.locator('body').innerText().catch(() => null), 300);
    }
    for (const p of pages) await p.close().catch(() => {});
    return out;
}

/** "More Actions" › "Change File" on a row, the file chosen, "Continue", "Continue", "Complete". */
async function changeFile(page, gm, label, file, name) {
    await gm.openChangeFile(label);
    await gm.uploadInWizard({file, name});
    await idle(page);
}

/**
 * "More Actions" › "Delete" › "OK" on a row: the delete request's answer, the "Error" window (title and
 * words) when one opens, and the rows left.
 */
async function deleteRow(page, gm, frame, label) {
    await gm.openDelete(label);
    const out = {};
    const answered = page.waitForResponse((r) => r.url().includes('delete-galley') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await gm.deleteDialog().getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answered;
    out.status = r ? r.status() : null;
    await sleep(2500);
    const err = frame.errorDialog();
    out.errorWindow = (await err.count()) ? flat(await err.innerText()) : null;
    if (out.errorWindow) await frame.dismissErrorDialog().catch(() => {});
    await idle(page);
    out.rowsAfter = await gm.labels().catch(() => null);
    return out;
}

/**
 * A reader (a fresh browser, not signed in) opens the work's page, presses the galley's link and the
 * reader page's "Download". Returns the galley links and the file the browser got.
 */
async function readerDownload(app, sid) {
    const {page, close} = await launch(app);
    try {
        const kind = app.name === 'ops' ? 'preprint' : 'article';
        await page.goto(app.url(`/index.php/${app.contextPath}/${kind}/view/${sid}`));
        await idle(page);
        const landing = await readLanding(page);
        const out = {landing: {url: landing.url, galleys: landing.galleys}};
        const link = page.locator('a.obj_galley_link').filter({hasText: /^\s*PDF\s*$/}).first();
        if (!(await link.count())) return {...out, pdfLink: false};
        const watched = watch(page);
        await link.click();
        await idle(page).catch(() => {});
        await sleep(2000);
        const d = await pressDownload(page, watched).catch((e) => ({error: flat(e.message, 200)}));
        out.download = d.download || d;
        out.fileRequests = d.fileRequests;
        return out;
    } finally {
        await close();
    }
}

/** Evidence only: the submission's galleys with their file rows and stored files. */
function stored(app, sid) {
    const version = app.line === 'stable-3_5_0' ? `p.version::text` : `p.version_stage || ' ' || p.version_major || '.' || p.version_minor`;
    return sql(
        app,
        `select p.publication_id, ${version}, p.status, g.galley_id, g.label, coalesce(g.submission_file_id::text, 'null'),
                coalesce(sf.assoc_id::text, '-'), coalesce(sf.file_id::text, '-')
         from publications p left join publication_galleys g on g.publication_id = p.publication_id
         left join submission_files sf on sf.submission_file_id = g.submission_file_id
         where p.submission_id = ${Number(sid)} order by p.publication_id, g.galley_id`
    )
        .split('\n')
        .filter(Boolean)
        .map((l) => {
            const [pub, ver, status, galley, label, sfid, assoc, file] = l.split('|');
            return {pub: Number(pub), version: ver, status: Number(status), galley: galley ? Number(galley) : null, label, submissionFileId: sfid, fileAssocId: assoc, fileId: file};
        });
}

module.exports = {T, sleep, flat, sha, newVersion, openGalleys, readRow, pressLabel, changeFile, deleteRow, readerDownload, stored, expect};
