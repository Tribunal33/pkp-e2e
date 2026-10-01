// Helpers for walk.js (U13 A2). Requiring this file runs nothing.
const path = require('path');
const {expect} = require('@playwright/test');
const {screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * The editor publishes a submission's newest (unpublished) version from
 * its workflow: main presses the publish button, keeps what the "Review
 * Publishing Details" window preselects, "Confirm", then "Publish"; 3.5
 * presses "Publish" and the window's own "Publish". Returns the windows'
 * words and the publish request's status.
 */
async function publishLatestVersion(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const stable35 = app.line === 'stable-3_5_0';
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const out = {submissionId, versionNodes: await frame.versionNodeLabels().catch((e) => `error ${e.message}`)};
    // The newest version's "Title & Abstract" (3.5 lists one version's pages).
    const pages = frame.menuLink('Title & Abstract');
    if (!stable35) {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(pages.last()).toBeVisible({timeout: T});
    await pages.last().click();
    await idle(page);
    record('step1-workflow', await screen(page));
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
    const confirmDialog = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    if (stable35) {
        const button = page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await expect(button).toBeVisible({timeout: T});
        out.button = flat(await button.innerText());
        await button.click();
        const panelPublish = page.getByRole('dialog').getByRole('button', {name: 'Publish', exact: true}).last();
        await panelPublish.waitFor({state: 'visible', timeout: T});
        await sleep(800);
        out.window = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 800);
        record('step2-publish-window', await screen(page));
        await panelPublish.click();
    } else {
        const pub = new PublicationScreen(page, app.contextPath);
        out.button = flat(await pub.publishButton().innerText().catch(() => null));
        const panel = await pub.pressPublish({or: confirmDialog});
        if (panel) {
            await sleep(500);
            out.window = flat(await panel.innerText().catch(() => null), 800);
            out.versionStage = await panel.locator('select[name="versionStage"]').inputValue().catch(() => null);
            out.assignment = await panel.locator('input[name="assignment"]:checked').getAttribute('value').catch(() => null);
            record('step2-publish-window', await screen(page));
            await shot(page, 'step2-publish-window').catch(() => {});
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        }
        await expect(confirmDialog).toBeVisible({timeout: T});
        out.confirm = flat(await confirmDialog.innerText(), 300);
        await confirmDialog.getByRole('button', {name: 'Publish', exact: true}).click();
    }
    const r = await published;
    out.publish = r ? r.status() : null;
    await idle(page);
    await sleep(1500);
    record('step2-published', await screen(page));
    return out;
}

/** The article/preprint page as a reader sees it: notice, versions, galley links. */
async function readLanding(page) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    const versions = await page.locator('a[href*="/version/"]').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    const galleys = await page.locator('a.obj_galley_link').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    return {
        url: rel(page.url()),
        title: await page.title(),
        outdated: (body.match(/This is an outdated version[^\n]*/) || [null])[0],
        versions: versions.map((v) => ({...v, href: rel(v.href)})),
        galleys: galleys.map((g) => ({...g, href: rel(g.href)})),
    };
}

/**
 * The PDF reader page: its notice, its bar's "Download" address, the viewer's
 * page counter and the answers to the viewer's file requests (watched from
 * before the reader was opened, `watch` below).
 */
async function readReader(page, watched) {
    await idle(page).catch(() => {});
    await sleep(4000);
    const viewer = page.frameLocator('#pdfCanvasContainer iframe');
    const pageNumber = await viewer.locator('#pageNumber').inputValue({timeout: 10_000}).catch(() => null);
    const numPages = await viewer.locator('#numPages').innerText({timeout: 10_000}).catch(() => null);
    const canvases = await viewer.locator('.page canvas, .canvasWrapper canvas').count().catch(() => null);
    const viewerText = flat(await viewer.locator('#viewerContainer').innerText({timeout: 5_000}).catch(() => null), 300);
    return {
        url: rel(page.url()),
        title: await page.title(),
        notice: flat(await page.locator('.galley_view_notice_message').innerText().catch(() => null)),
        barTitle: flat(await page.locator('header a.title').innerText().catch(() => null)),
        downloadHref: rel(await page.locator('header a.download').getAttribute('href').catch(() => null)),
        iframeSrc: rel(await page.locator('#pdfCanvasContainer iframe').getAttribute('src').catch(() => null)),
        counter: `${pageNumber} ${flat(numPages)}`,
        pageNumber,
        numPages: flat(numPages),
        renderedPages: canvases,
        viewerText,
        fileRequests: watched.splice(0),
    };
}

/** Collects every answer to a `/download/` address (page and viewer frame), redirects included. */
function watch(page) {
    const seen = [];
    page.on('response', (r) => {
        if (!/\/download\//.test(r.url()) && !/\/(article|preprint)\/download\/?$/.test(new URL(r.url()).pathname)) return;
        seen.push({url: rel(r.url()), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null});
    });
    return seen;
}

/** Press the reader bar's "Download": the download the browser starts, if any, and where the page stays. */
async function pressDownload(page, watched) {
    const before = rel(page.url());
    const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
    await page.locator('header a.download').click();
    const d = await dl;
    const out = {before};
    if (d) {
        out.download = {suggestedFilename: d.suggestedFilename(), url: rel(d.url()), failure: await d.failure().catch((e) => `error ${e.message}`)};
        if (!out.download.failure) {
            const p = await d.path().catch(() => null);
            if (p) out.download.bytes = require('fs').statSync(p).size;
        }
    } else {
        out.download = null;
    }
    await sleep(1500);
    out.after = rel(page.url());
    out.fileRequests = watched.splice(0);
    return out;
}

module.exports = {T, sleep, flat, rel, publishLatestVersion, readLanding, readReader, watch, pressDownload};
