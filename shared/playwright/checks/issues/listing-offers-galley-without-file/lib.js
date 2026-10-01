// Helpers for walk.js (U13 A4). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** A one-page PDF and a small CSV, the "any file at hand" of the Steps. */
const PDF = {
    name: 'article-u13ir19.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
            '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    ),
};
const CSV = {name: 'data-u13ir19.csv', mimeType: 'text/csv', buffer: Buffer.from('year,value\n2014,1\n2015,2\n')};

/**
 * Open the "Galleys" page of the submission's newest version in the
 * editorial workflow: Publication ("Preprint") › "Galleys".
 */
async function openGalleys(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const link = frame.menuLink('Galleys');
    if (!(await link.last().isVisible().catch(() => false))) {
        if (app.line !== 'stable-3_5_0' && (await frame.latestVersionNode().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        else await frame.publicationGroup().click();
    }
    await expect(link.last()).toBeVisible({timeout: T});
    await link.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    return galleys;
}

/** "Add galley", the label, "Save", then the upload window: component, file, "Continue" twice, "Complete". */
async function addGalleyWithFile(galleys, {label, component, file}) {
    await galleys.addGalley({label, component, file, name: file.name});
}

/** "Add galley", the label, "Save", then "Cancel" in the upload window before any file is chosen. */
async function addGalleyWithoutFile(page, galleys, label) {
    const win = await galleys.openCreate();
    await win.type(win.labelBox(), label);
    await win.save();
    record('upload-window-before-cancel', await screen(page));
    await galleys.cancelWizard();
}

/** "Add galley", the label, the remote box ticked with an address, "Save"; the upload window opens all the same and is cancelled. */
async function addRemoteGalley(page, galleys, label, address) {
    const win = await galleys.openCreate();
    await win.type(win.labelBox(), label);
    await win.setRemote(true);
    await win.type(win.remoteUrlBox(), address);
    await win.save();
    await galleys.cancelWizard();
    await idle(page);
}

/** The workflow's "Post" on a preprint server, confirmed with the window's "Post". */
async function post(page) {
    const control = page.getByRole('button', {name: 'Post', exact: true}).first();
    await expect(control).toBeVisible({timeout: T});
    await control.click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to post this?'});
    await expect(confirm).toBeVisible({timeout: T});
    const text = flat(await confirm.last().innerText(), 300);
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await confirm.getByRole('button', {name: 'Post', exact: true}).last().click();
    const r = await answered;
    await page.getByRole('button', {name: 'Unpost', exact: true}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {confirm: text, status: r.status()};
}

/**
 * Settings › Website › Appearance › Theme › "Journal Content
 * Organization": tick or untick boxes by label, "Save".
 */
async function setContentOrganization(page, app, want) {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const site = new WebsiteSettings(page, app.contextPath);
    await site.goto();
    const form = await site.open('theme');
    const before = await form.chosen('journalContentOrganization');
    for (const [label, on] of Object.entries(want)) {
        const box = form.box(label);
        await expect(box).toBeVisible({timeout: T});
        if (on) await box.check();
        else await box.uncheck();
    }
    const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+\/theme/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.saveButton.click();
    const r = await answered;
    await expect(form.savedStatus).toBeVisible({timeout: T}).catch(() => {});
    return {before, after: await form.chosen('journalContentOrganization'), status: r ? r.status() : null};
}

/**
 * One item's entry on a list page (a journal's `.obj_article_summary`, a
 * server's `.obj_preprint_summary`): its galley links in order.
 */
async function readEntry(page, kind, id, within = '') {
    const box = page.locator(`${within} .obj_${kind}_summary`).filter({has: page.locator(`[id="${kind}-${id}"]`)});
    if ((await box.count()) === 0) return {listed: false};
    const links = box.first().locator('.galleys_links a');
    const out = [];
    for (let i = 0; i < (await links.count()); i++) {
        out.push({label: flat(await links.nth(i).innerText()), href: rel(await links.nth(i).getAttribute('href'))});
    }
    return {listed: true, title: flat(await box.first().locator('.title').innerText(), 120), galleys: out};
}

/** The item's own page: its main galley links and its additional files. */
async function readLanding(page) {
    const main = await page.locator('.item.galleys .obj_galley_link, .galleys_links .obj_galley_link').allInnerTexts();
    const extra = await page.locator('.obj_galley_link_supplementary').allInnerTexts();
    return {title: await page.title(), main: [...new Set(main.map((s) => flat(s)))], additional: [...new Set(extra.map((s) => flat(s)))]};
}

/** Press a galley link of an entry and say what came back. */
async function pressGalley(page, kind, id, label, within = '') {
    const box = page.locator(`${within} .obj_${kind}_summary`).filter({has: page.locator(`[id="${kind}-${id}"]`)}).first();
    const link = box.locator('.galleys_links a').filter({hasText: label}).first();
    if ((await link.count()) === 0) return {offered: false};
    const answers = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) answers.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    await link.click();
    await page.waitForLoadState('load').catch(() => {});
    await sleep(1000);
    page.off('response', onResponse);
    return {offered: true, answers, url: rel(page.url()), title: await page.title().catch(() => null), text: flat(await page.locator('body').innerText().catch(() => ''), 200)};
}

module.exports = {T, sleep, flat, rel, PDF, CSV, openGalleys, addGalleyWithFile, addGalleyWithoutFile, addRemoteGalley, post, setContentOrganization, readEntry, readLanding, pressGalley};
