// Helpers for the U48 A8 and A9 walks (the article page's "JATS XML"
// download). Requiring this file runs nothing.
'use strict';
const path = require('path');
const {expect} = require('@playwright/test');
const {screen, record, shot, idle, serverLog} = require('../../../probe');
const {T, sleep, flat, rel, workflowFrame} = require('../older-version-tab-current-title/lib');

const REPO = path.resolve(__dirname, '../../../../..');

/** The JATS page object for the open workflow. */
function jatsPage(page, app) {
    const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
    return new JatsPage(page, workflowFrame(page, app));
}

/**
 * The given version's "JATS XML" page (the workflow address with its menu
 * key, as the side menu's entry opens it).
 */
async function openJats(page, app, submissionId, publicationId) {
    const jp = jatsPage(page, app);
    await jp.open(submissionId, publicationId);
    await idle(page);
    return jp;
}

/** The facts a JATS file carries for these walks. */
function xmlFacts(text) {
    const title = (text.match(/<article-title[^>]*>([\s\S]*?)<\/article-title>/) || [null, null])[1];
    const pubDates = (text.match(/<pub-date[\s\S]*?<\/pub-date>/g) || []).map((s) => flat(s, 200));
    return {title: flat(title, 200), pubDates, bytes: Buffer.byteLength(text, 'utf8')};
}

/**
 * Tick "Make available with publication" and "Confirm" on the open "JATS
 * XML" page; returns the save's status (null when it already read ticked).
 */
async function tickMakeAvailable(jp) {
    const r = await jp.setMakePublic(true);
    return r ? r.status() : null;
}

/**
 * Press the "JATS XML" link on the page that shows it (the article page or
 * the preview): the file the browser saves, the answer the link's request
 * got (status, ETag, Content-Disposition, as the browser reports them: a
 * 304 shows as the cached 200), the server's own status line for it (the
 * fleet's log, when `app` is given) and the XML's facts.
 */
async function pressJats(page, app = null) {
    const log = app ? serverLog(app, {match: /jats\/download/}) : null;
    const from = log ? log.mark() : 0;
    const {captureDownload} = require('../../../pages/SubmissionFilesPages.js');
    const answers = [];
    const onResponse = async (r) => {
        if (!/\/jats\/download/.test(r.url())) return;
        const h = r.headers();
        answers.push({status: r.status(), url: rel(r.url()), etag: h.etag || null, disposition: h['content-disposition'] || null, cacheControl: h['cache-control'] || null});
    };
    page.on('response', onResponse);
    const link = page.locator('a.obj_galley_link.xml');
    await expect(link).toBeVisible({timeout: T});
    const href = rel(await link.getAttribute('href'));
    let name = null;
    let text = '';
    let error = null;
    try {
        const {download} = await captureDownload(page, () => link.click());
        name = download.suggestedFilename();
        const file = await download.path();
        text = file ? require('fs').readFileSync(file, 'utf8') : '';
    } catch (e) {
        error = flat(e.message, 300);
    }
    await sleep(500);
    page.off('response', onResponse);
    const server = log ? log.since(from).map((l) => l.replace(/^.*?\[(\d{3})\]: (\w+) (\S+).*$/, '$1 $2 $3')) : null;
    return {href, name, answers, server, ...xmlFacts(text), text, error};
}

/** Open the article page (`/article/view/{id}`) as the reader sees it. */
async function openArticle(page, app, id) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${id}`));
    await expect(page.locator('h1.page_title')).toBeVisible({timeout: T});
    return {status: res ? res.status() : null, url: rel(page.url()), heading: flat(await page.locator('h1.page_title').innerText())};
}

/**
 * The given version's "Title & Abstract": the "Title" editor set to
 * `title`, then "Save", bounded by the publication's write.
 */
async function retitle(page, app, submissionId, publicationId, title) {
    const frame = workflowFrame(page, app);
    await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_titleAbstract`});
    const editorId = 'titleAbstract-title-control-en';
    await page.waitForFunction((id) => !!window.tinymce?.get(id)?.initialized, editorId, {timeout: T});
    const before = await page.evaluate((id) => window.tinymce.get(id).getContent({format: 'text'}), editorId);
    await page.evaluate(([id, value]) => {
        const editor = window.tinymce.get(id);
        editor.setContent(value);
        editor.fire('change');
    }, [editorId, title]);
    const saved = page.waitForResponse(
        (r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
        {timeout: T}
    );
    await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await expect(page.locator('.pkpFormPage__status', {hasText: 'Saved'})).toBeVisible({timeout: T}).catch(() => {});
    return {before, after: title, save: r.status()};
}

/**
 * The given version's "Issue" page (OJS): "URL Path" set to `urlPath`, then
 * "Save", bounded by the publication's write.
 */
async function saveUrlPath(page, app, submissionId, publicationId, urlPath) {
    const frame = workflowFrame(page, app);
    await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_issue`});
    const box = page.locator('input[name="urlPath"]');
    await expect(box).toBeVisible({timeout: T});
    await idle(page);
    await sleep(600);
    const heading = flat(await page.locator('[role="dialog"] h1, [role="dialog"] h2').first().innerText().catch(() => null), 120);
    const before = await box.inputValue();
    await box.fill(urlPath);
    const saved = page.waitForResponse(
        (r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
        {timeout: T}
    );
    await page.locator('form').filter({has: box}).first().getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const body = await r.json().catch(() => ({}));
    await idle(page);
    return {heading, before, typed: urlPath, save: r.status(), stored: body.urlPath ?? null};
}

/**
 * The workflow header's "Preview" (the version shown): the page it opens
 * (a new tab or the same one), loaded. Returns that page.
 */
async function openPreview(page) {
    const control = page.locator('[data-cy="workflow-controls-right"]').getByText('Preview', {exact: true}).first();
    await expect(control).toBeVisible({timeout: T});
    const popup = page.context().waitForEvent('page', {timeout: 10_000}).catch(() => null);
    await control.click();
    const tab = (await popup) || page;
    await tab.waitForLoadState('domcontentloaded');
    await expect(tab.locator('h1.page_title')).toBeVisible({timeout: T});
    return tab;
}

/** One record and screenshot under a per-script key. */
async function snap(page, key, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(key, {...s, ...extra});
    await shot(page, key).catch(() => {});
    return s;
}

module.exports = {REPO, T, sleep, flat, rel, workflowFrame, jatsPage, openJats, xmlFacts, tickMakeAvailable, pressJats, openArticle, retitle, saveUrlPath, openPreview, snap};
