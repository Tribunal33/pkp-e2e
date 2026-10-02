// Helpers for the U46 A1 and A3 walks (galley-edit-window-upload-heading/walk.js,
// remote-galley-asked-for-file/walk.js). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const G = require('../listing-offers-galley-without-file/lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A one-page PDF, the "any small PDF at hand" of the Steps. */
const PDF = {
    name: 'paper-u46w2.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
            '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    ),
};

/** The component the Steps choose for a PDF galley. */
const component = (app) => (app.name === 'ops' ? 'Preprint Text' : 'Article Text');

/**
 * The windows open over the workflow, outermost first: each one's heading
 * (its level-1 heading, else its accessible name), its tabs and a short
 * text. The workflow itself is the first.
 */
async function openWindows(page) {
    await idle(page);
    // includeHidden: the workflow behind an open window is aria-hidden, and a role query
    // without it sees only the top window.
    const dialogs = page.getByRole('dialog', {includeHidden: true});
    const out = [];
    for (let i = 0; i < (await dialogs.count()); i++) {
        const d = dialogs.nth(i);
        if (!(await d.isVisible().catch(() => false))) continue;
        const h1 = d.getByRole('heading', {level: 1, includeHidden: true});
        const heading = (await h1.count()) ? G.flat(await h1.last().innerText().catch(() => '')) : null;
        const tabs = (await d.getByRole('tab', {includeHidden: true}).allInnerTexts().catch(() => [])).map((t) => G.flat(t));
        out.push({heading, name: await d.getAttribute('aria-label').catch(() => null), tabs, text: G.flat(await d.innerText().catch(() => ''), 600)});
    }
    return out;
}

/** The innermost window's heading, or null when only the workflow is open. */
async function topHeading(page) {
    const w = await openWindows(page);
    return w.length > 1 ? w[w.length - 1].heading : null;
}

/**
 * After "Save" in "Create New Galley": wait up to `ms` for another window
 * to open over the workflow, and say which (null when none did).
 */
async function windowAfterSave(page, ms = 6000) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
        const w = await openWindows(page);
        if (w.length > 1) {
            await sleep(500);
            const settled = await openWindows(page);
            return settled[settled.length - 1];
        }
        await sleep(300);
    }
    return null;
}

/** A row's label: whether it is a link, and where to. */
async function rowLabel(galleys, label) {
    const link = galleys.nameLink(label);
    const n = await link.count();
    return {text: G.flat(await galleys.row(label).locator('td').first().innerText().catch(() => null)), link: n ? G.rel(await link.first().getAttribute('href')) : null};
}

/**
 * On the item's public page, press the galley link with this label and
 * collect the main-frame navigation answers (status, address, redirect
 * target) until the browser settles.
 */
async function pressReaderGalley(page, label) {
    const link = page.locator('a.obj_galley_link').filter({hasText: label}).first();
    if ((await link.count()) === 0) return {offered: false};
    const href = G.rel(await link.getAttribute('href'));
    const answers = [];
    const onResponse = async (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) {
            answers.push({status: r.status(), url: r.url(), location: (await r.headerValue('location').catch(() => null)) || null});
        }
    };
    const failed = [];
    const onFailed = (r) => {
        if (r.isNavigationRequest()) failed.push({url: r.url(), error: r.failure() && r.failure().errorText});
    };
    page.on('response', onResponse);
    page.on('requestfailed', onFailed);
    await link.click().catch(() => {});
    await page.waitForLoadState('load', {timeout: 15_000}).catch(() => {});
    await sleep(1500);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
    return {offered: true, href, answers, failed, url: page.url()};
}

/**
 * A row's "Edit": the window's heading, whether the remote box is ticked
 * and the address it holds; then the form's "Cancel".
 */
async function readEditRemote(page, galleys, label) {
    const {GalleyWindow} = require('../../../pages/GalleysPages.js');
    await galleys.openMenu(label);
    await galleys.choose('Edit');
    const form = page.locator('form[id$="GalleyForm"] input[name="label"]');
    await form.last().waitFor({timeout: 30_000});
    const heading = await topHeading(page);
    const win = new GalleyWindow(page, heading);
    await win.expectLoaded();
    const out = {heading, ticked: await win.remoteBox().isChecked(), address: await win.remoteUrlBox().inputValue()};
    await win.cancel();
    return out;
}

module.exports = {readEditRemote, sleep, PDF, component, openWindows, topHeading, windowAfterSave, rowLabel, pressReaderGalley, openGalleys: G.openGalleys, post: G.post, flat: G.flat, rel: G.rel};
