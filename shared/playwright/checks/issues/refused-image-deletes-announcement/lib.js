// Helpers for the U12 A2 and A12 walks (announcement images): this folder's
// walk.js and ../announcement-image-files-left-behind/walk.js. Requiring this
// file runs nothing. Turning announcements on and opening the page come from
// the U20 A5 walk's lib.js.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const {enableAnnouncements, openAnnouncementsFromMenu, flat, rel} = require('../sitemap-lists-expired-announcements/lib.js');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The three pictures the steps upload. */
const PICTURES = {
    png: path.join(__dirname, 'photo.png'),
    gif: path.join(__dirname, 'photo.gif'),
    jpeg: path.join(__dirname, 'photo.jpeg'),
};

const CONTEXT_DIR = {ojs: 'journals', omp: 'presses', ops: 'contexts'};

/**
 * The context's public announcements folder of the fleet (public_files_dir
 * of the fleet's config, relative to the app root as the dataset config has
 * it, or absolute), and the context id from the database.
 */
function announcementsFolder(app, contextId) {
    if (contextId === 'site') return path.join(publicDir(app), 'site', 'announcements');
    return path.join(publicDir(app), CONTEXT_DIR[app.name], String(contextId), 'announcements');
}

/** The fleet's public files directory. */
function publicDir(app) {
    const cfg = fs.readFileSync(app.configFile, 'utf8');
    const m = cfg.match(/^\s*public_files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m);
    const pub = m ? m[1] : 'public';
    return path.isAbsolute(pub) ? pub : path.join(app.root, pub);
}

/** The files in the folder whose name starts with `{id}.` (all files when id is null). */
function listFolder(folder, id = null) {
    let names = [];
    try { names = fs.readdirSync(folder); } catch (e) { return {folder, exists: false, files: []}; }
    names = names.filter((n) => id == null || n.startsWith(`${id}.`)).sort();
    return {folder, exists: true, files: names};
}

// The list panel the helpers work in: the context's Announcements page by
// default; useSiteScope() switches to Administration › Site Settings ›
// "Announcements" › "Announcements" (shown on a site with two or more contexts).
let siteScope = false;
const useSiteScope = (on = true) => { siteScope = on; };
const panel = (page) => (siteScope
    ? page.locator('#announcements [role="tabpanel"]:visible .listPanel').first()
    : page.locator('main .listPanel').first());

/** Administration › Site Settings › "Announcements" › the "Announcements" side tab. */
async function openSiteAnnouncements(app, page) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page).catch(() => {});
    const top = page.locator('#announcements-button');
    await top.waitFor({state: 'visible', timeout: T});
    await top.click();
    const side = page.locator('#announcements #announcement-items-button');
    await side.waitFor({state: 'visible', timeout: T});
    await side.click();
    await panel(page).waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    return rowTitles(page);
}
const rowTitles = (page) => panel(page).locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((s) => flat(s)));
const row = (page, title) => panel(page).locator('.listPanel__item')
    .filter({has: page.locator('.listPanel__itemTitle', {hasText: new RegExp(`^\\s*${esc(title)}\\s*$`)})});

/** Reload the Announcements page (the address the side menu opened). */
async function reloadAnnouncements(app, page) {
    if (siteScope) return openSiteAnnouncements(app, page);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/announcements`));
    await idle(page).catch(() => {});
    await panel(page).waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    return rowTitles(page);
}

/** The image field of an open announcement dialog. */
const imageField = (dialog) => dialog.locator('.pkpFormField--uploadImage').first();

/** "Upload File" a picture into the dialog's "Image": waits for the temporary file's answer and the preview. */
async function uploadImage(page, dialog, file) {
    const field = imageField(dialog);
    await field.waitFor({state: 'visible', timeout: T});
    const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await field.locator('input[type=file]').first().setInputFiles(file);
    const r = await up;
    await idle(page).catch(() => {});
    await pause(800);
    return {file: path.basename(file), upload: r ? r.status() : null, field: flat(await field.innerText().catch(() => ''), 200)};
}

/** "Remove" in the dialog's "Image" (the saved picture's preview). */
async function removeImage(page, dialog) {
    const field = imageField(dialog);
    const btn = field.getByRole('button', {name: 'Remove', exact: true});
    const had = await btn.isVisible().catch(() => false);
    if (had) await btn.click();
    await pause(500);
    return {removePressed: had, field: flat(await field.innerText().catch(() => ''), 200)};
}

/**
 * "Save" in an announcement dialog: the API answer (status and, on a refusal,
 * the body), whether the dialog stayed open, and the field errors it shows.
 */
async function pressSave(page, dialog) {
    const resp = page.waitForResponse((x) => /\/api\/v1\/announcements(\/\d+)?$/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const out = {status: r ? r.status() : null, method: r ? (r.request().headers()['x-http-method-override'] || r.request().method()) : null};
    if (r && r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    await dialog.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(800);
    out.dialogOpen = await dialog.isVisible().catch(() => false);
    if (out.dialogOpen) {
        out.errors = [...new Set((await dialog.locator('.pkpFormFieldError, .pkpFormField__error, [id$="-error"]').allInnerTexts().catch(() => []))
            .map((s) => flat(s)).filter(Boolean))];
        out.formError = flat(await dialog.locator('.pkpFormPage__status, .pkpFormErrors').first().innerText({timeout: 1000}).catch(() => null));
    }
    return out;
}

/** "Add Announcement" with a title and, optionally, a picture; "Save". Returns the save and the new id. */
async function addAnnouncement(page, {title, picture}) {
    await panel(page).getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name="title-en"]').fill(title);
    const upload = picture ? await uploadImage(page, dialog, picture) : null;
    const save = await pressSave(page, dialog);
    if (save.dialogOpen) {
        // The refusal keeps the panel open: close it as a person would.
        await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await dialog.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        await pause(600);
    }
    const href = await row(page, title).getByRole('link', {name: 'View', exact: true}).getAttribute('href', {timeout: 5000}).catch(() => null);
    const m = (href || '').match(/\/announcement\/view\/(\d+)/);
    return {title, upload, save, id: m ? Number(m[1]) : null, view: href ? rel(href) : null, rows: await rowTitles(page)};
}

/** "Edit" on the row: the open "Edit Announcement" dialog. */
async function openEdit(page, title) {
    await row(page, title).getByRole('button', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Edit Announcement'});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    await pause(500);
    return dialog;
}

/** Close an open dialog with its close control. */
async function closeDialog(page, dialog) {
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await dialog.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    await pause(600);
    return !(await dialog.isVisible().catch(() => false));
}

/** "Delete" on the row, then "Yes" in "Delete Announcement". */
async function deleteAnnouncement(page, title) {
    await row(page, title).getByRole('button', {name: 'Delete', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to permanently delete'}).first();
    await confirm.waitFor({state: 'visible', timeout: T});
    const question = flat(await confirm.innerText());
    const resp = page.waitForResponse((x) => /\/api\/v1\/announcements\/\d+$/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: 'Yes', exact: true}).click();
    const r = await resp;
    await idle(page).catch(() => {});
    await pause(600);
    return {question, status: r ? r.status() : null, rows: await rowTitles(page)};
}

/** Open an address as a visitor would: status, where it lands, the heading. */
async function visit(app, page, address) {
    const res = await page.goto(app.url(address));
    await idle(page).catch(() => {});
    const heading = await page.locator('main h1, .pkp_structure_main h1').first().innerText({timeout: 5000}).catch(() => null);
    return {address, status: res && res.status(), landed: rel(page.url()), heading: flat(heading)};
}

/** The announcement's stored image setting, read from the fleet's database. */
function storedImage(app, sql, id) {
    if (!id) return null;
    const rows = sql(app, `SELECT setting_value FROM announcement_settings WHERE announcement_id = ${Number(id)} AND setting_name = 'image'`);
    const exists = sql(app, `SELECT count(*) FROM announcements WHERE announcement_id = ${Number(id)}`);
    return {announcementRow: exists, image: rows || null};
}

module.exports = {
    PICTURES, enableAnnouncements, openAnnouncementsFromMenu, reloadAnnouncements, useSiteScope, openSiteAnnouncements, announcementsFolder, listFolder,
    rowTitles, row, uploadImage, removeImage, pressSave, addAnnouncement, openEdit, closeDialog, deleteAnnouncement,
    visit, storedImage, flat, rel, pause,
};
