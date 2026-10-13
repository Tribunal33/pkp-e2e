// Helpers of walk.js (U69 A24: on a book's preview every file link opens
// "404 Not Found"). Requiring this file runs nothing. Every helper presses
// what a person presses or reads what the browser received.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const FILE_LINKS = '.obj_monograph_full a.cmp_download_link';

/** The PDF the steps upload, `u69h13p-book.pdf` (a copy of the OMP suite's fixture). */
function bookPdf(app) {
    const dir = path.join(os.tmpdir(), 'u69h13p-files');
    fs.mkdirSync(dir, {recursive: true});
    const out = path.join(dir, 'u69h13p-book.pdf');
    fs.copyFileSync(path.join(app.suiteDir, 'fixtures', 'files', 'article.pdf'), out);
    return out;
}

/** The workflow frame of a book (the shared WorkflowPage, "Publication" group). */
function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
}

/**
 * "Create New Version", keeping what the window offers. main: a Publication
 * menu entry opening a window, "Confirm"; 3.5: a button answered "Yes".
 * Returns the version request's status and the new publication's id.
 */
async function createNewVersion(page, frame, stable35) {
    if (!stable35) await frame.revealPublicationEntry('Create New Version');
    const opener = stable35
        ? page.getByRole('button', {name: 'Create New Version', exact: true}).first()
        : page.getByRole('link', {name: 'Create New Version', exact: true}).first();
    await frame.expectVersionLoaded().catch(() => {});
    await opener.click();
    const w = stable35
        ? page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^(Yes|OK)$/})}).last()
        : page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
    await w.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(800);
    const resp = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
    await w.getByRole('button', {name: /^(Confirm|Yes|OK)$/}).last().click();
    const r = await resp;
    let pub = null;
    if (r) {
        try {
            const j = await r.json();
            pub = {id: j.id, status: j.status};
        } catch { /* none */ }
    }
    await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await frame.expectVersionLoaded().catch(() => {});
    return {status: r ? r.status() : null, pub};
}

/** The newest version's page `label` under the Publication menu (on 3.5 the one version listed). */
async function openNewestPage(page, frame, label, stable35) {
    const link = frame.menuLink(label);
    if (!stable35) {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await link.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(link.last()).toBeVisible({timeout: T});
    await link.last().click();
    await idle(page);
}

/** "Title & Abstract", then "Preview": the preview page as read. */
async function openPreview(page, frame, stable35) {
    await openNewestPage(page, frame, 'Title & Abstract', stable35);
    const btn = stable35
        ? frame.dialog().getByRole('button', {name: 'Preview', exact: true}).first()
        : frame.publishingControl('Preview');
    await expect(btn).toBeVisible({timeout: T});
    await Promise.all([page.waitForURL((u) => !/dashboard/.test(u.pathname), {timeout: T}), btn.click()]);
    await idle(page);
    return readBookPage(page);
}

/** The book page's notices and its file links. */
async function readBookPage(page) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        url: rel(page.url()),
        title: await page.title(),
        notices: (await page.locator('.cmp_notification').allInnerTexts().catch(() => [])).map((t) => flat(t)),
        files: await page.locator(FILE_LINKS).evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))).then((xs) => xs.map((x) => ({...x, href: rel(x.href)}))),
        notFound: /404 Not Found/.test(body),
    };
}

/** What a file's address opened: status, title, 404 or the viewer, its notice, the file request's answer. */
async function readFilePage(page, nav, fileReqs) {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(2500);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        status: nav ? nav.status() : null,
        url: rel(page.url()),
        title: await page.title(),
        notFound: /404 Not Found/.test(body),
        heading: flat(await page.locator('h1, header .title').first().innerText().catch(() => null), 200),
        viewer: (await page.locator('#pdfCanvasContainer iframe, #htmlContainer iframe').count()) > 0,
        notice: (await page.locator('.viewable_file_frame_notice_message').allInnerTexts().catch(() => [])).map((t) => flat(t)),
        fileRequests: fileReqs.map((r) => ({url: rel(r.url()), status: r.status()})),
    };
}

/** Press the file link whose text is `text` (the `nth` such link) on the open book page. */
async function pressFile(page, text, nth = 0) {
    const link = page.locator(FILE_LINKS).filter({hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)}).nth(nth);
    if (!(await link.count())) return {pressed: false, text};
    const href = rel(await link.getAttribute('href'));
    const fileReqs = [];
    const onResp = (r) => { if (/\/catalog\/download\//.test(r.url())) fileReqs.push(r); };
    page.on('response', onResp);
    const nav = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().frame() === page.mainFrame(), {timeout: T}).catch(() => null);
    await link.click();
    const out = {pressed: true, text, href, ...(await readFilePage(page, await nav, fileReqs))};
    page.off('response', onResp);
    return out;
}

/** Type a file's address (as a person pastes it) and read what opens. */
async function openAddress(page, app, href) {
    const fileReqs = [];
    const onResp = (r) => { if (/\/catalog\/download\//.test(r.url())) fileReqs.push(r); };
    page.on('response', onResp);
    const nav = await page.goto(app.url(href.replace(/^https?:\/\/[^/]+/, ''))).catch(() => null);
    const out = {href, ...(await readFilePage(page, nav, fileReqs))};
    page.off('response', onResp);
    return out;
}

/** "Publication" › "Publication Formats" of the newest version: the page object. */
async function openFormats(page, app, frame, stable35) {
    const {PublicationFormatsPage} = require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
    await openNewestPage(page, frame, 'Publication Formats', stable35);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    await formats.grid().locator('tr.gridRow').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return formats;
}

/**
 * Group B steps 2-5: "Add publication format" (`name`, "OK"); its "Change
 * File" (Book Manuscript, the file, Continue, Continue, Complete); the file's
 * "Set Terms" › "Open Access" › "Save"; the format's "Not Available" › "OK".
 * Returns what the list shows after.
 */
async function addFormatWithFile(page, app, formats, name, filePath) {
    const {SALES} = require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
    const fileName = path.basename(filePath);
    const add = await formats.openAdd();
    await add.typeName(name);
    await add.ok();
    await formats.formatRow(name).waitFor({state: 'visible', timeout: T});
    await formats.uploadWithChangeFile(name, filePath);
    const terms = await formats.openTerms(name, fileName);
    await terms.choose(SALES.openAccess);
    await terms.save();
    await idle(page);
    await formats.rowLink(formats.fileRow(name, fileName), 'Open Access').waitFor({state: 'visible', timeout: T});
    await (await formats.openStatus(formats.formatRow(name), 'Not Available', 'Format Availability')).ok();
    await formats.rowLink(formats.formatRow(name), 'Available').waitFor({state: 'visible', timeout: T});
    await sleep(500);
    return {
        formatState: (await formats.formatRow(name).locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
        file: (await formats.fileRow(name, fileName).locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
    };
}

/** Record the screen without failing the walk. */
async function snap(page, name) {
    try {
        const s = await screen(page);
        record(name, s);
        return s;
    } catch (e) {
        record(name, {url: page.url(), error: flat(e.message, 200)});
        return null;
    }
}

module.exports = {T, sleep, flat, rel, bookPdf, workflow, createNewVersion, openNewestPage, openPreview, readBookPage, pressFile, openAddress, openFormats, addFormatWithFile, snap};
