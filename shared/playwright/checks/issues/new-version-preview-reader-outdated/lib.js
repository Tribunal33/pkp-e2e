// Helpers for walk.js (U13 A13: a new version's reader opened from its
// preview is called outdated). Requiring this file runs nothing.
const path = require('path');
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const HTML_FILE = path.join(__dirname, 'u13a13-article.html');

/**
 * "Create New Version" on the open workflow, keeping what the window offers.
 * main: a Publication menu entry opening a window, "Confirm"; 3.5: a button
 * above the publication pages answered "Yes". Returns the version request's
 * status and the new publication's id, status and date.
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
    const s = await screen(page);
    const resp = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
    await w.getByRole('button', {name: /^(Confirm|Yes|OK)$/}).last().click();
    const r = await resp;
    let pub = null;
    if (r) {
        try {
            const j = await r.json();
            pub = {id: j.id, status: j.status, datePublished: j.datePublished, version: j.versionStage ? `${j.versionStage} ${j.versionMajor}.${j.versionMinor}` : j.version};
        } catch { /* none */ }
    }
    await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await frame.expectVersionLoaded().catch(() => {});
    return {status: r ? r.status() : null, pub, window: flat(s.text.dialog, 500)};
}

/** The newest version's page under the Publication menu (on 3.5 the one version listed). */
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

/** "Title & Abstract" of the newest version, then "Preview": returns the preview's address and notices. */
async function openPreview(page, frame, stable35) {
    await openNewestPage(page, frame, 'Title & Abstract', stable35);
    const btn = stable35
        ? frame.dialog().getByRole('button', {name: 'Preview', exact: true}).first()
        : frame.publishingControl('Preview');
    await expect(btn).toBeVisible({timeout: T});
    await Promise.all([page.waitForURL((u) => !/dashboard/.test(u.pathname), {timeout: T}), btn.click()]);
    await idle(page);
    return readPage(page);
}

/** The item page's notices and its galley / format links. */
async function readPage(page) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        url: rel(page.url()),
        title: await page.title(),
        notices: (await page.locator('.cmp_notification').allInnerTexts().catch(() => [])).map((t) => flat(t)),
        files: await page.locator('a.obj_galley_link, .pub_format_single a, .publication_format a, .files a').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))).then((xs) => xs.map((x) => ({...x, href: rel(x.href)}))),
        notFound: /404 Not Found/.test(body),
    };
}

/**
 * Press the file link named `label` on the open item page and read the
 * reader page it opens: the notice above the reader (verbatim), its "most
 * recent version" link, the HTTP status of the page.
 */
async function pressFile(page, label) {
    const link = page.locator('a.obj_galley_link, .pub_format_single a, .publication_format a, .files a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first();
    if (!(await link.count())) return {pressed: false, label};
    const href = rel(await link.getAttribute('href'));
    const nav = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().frame() === page.mainFrame(), {timeout: T}).catch(() => null);
    await link.click();
    const r = await nav;
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(1500);
    const banner = page.locator('.galley_view_notice_message, .viewable_file_frame_notice_message');
    const out = {
        pressed: true,
        label,
        href,
        status: r ? r.status() : null,
        url: rel(page.url()),
        title: await page.title(),
        notice: (await banner.allInnerTexts().catch(() => [])).map((t) => flat(t)),
        noticeLinks: await banner.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))).then((xs) => xs.map(rel)).catch(() => []),
        frameSrc: rel(await page.locator('#pdfCanvasContainer iframe, #htmlContainer iframe').first().getAttribute('src').catch(() => null)),
        notFound: /404 Not Found/.test((await page.locator('body').innerText().catch(() => '')) || ''),
    };
    return out;
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

module.exports = {T, sleep, flat, rel, HTML_FILE, createNewVersion, openNewestPage, openPreview, readPage, pressFile, snap};
