// Helpers of walk.js here (issue report docs/issues/U47-A1-media-actions-offered-then-refused.md).
// Requiring this file runs nothing. Each helper presses what a person presses and records what the
// screen shows; a control the page does not offer is recorded as such, never forced.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A media API change (add, save, link, delete): a non-GET request to …/mediaFiles… */
const isMediaChange = (r) => /\/mediaFiles(\/|\?|$)/.test(r.url()) && r.request().method() !== 'GET';

/** Wait for the media change a press sends; returns {status, error} or null when none was sent. */
async function pressAndAnswer(page, press, timeout = 20_000) {
    const answered = page.waitForResponse(isMediaChange, {timeout}).catch(() => null);
    await press();
    const r = await answered;
    if (!r) return null;
    let error = null;
    try {
        const body = await r.json();
        error = body && (body.error || body.errorMessage) ? body.error || body.errorMessage : null;
    } catch (e) {
        // not JSON
    }
    return {status: r.status(), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, error};
}

/** The "Error" window, if one opens within `ms`: its text, then "OK" pressed. */
async function errorWindow(page, ms = 6_000) {
    const dialog = page.getByRole('dialog', {name: 'Error', exact: true});
    try {
        await dialog.waitFor({state: 'visible', timeout: ms});
    } catch (e) {
        return null;
    }
    const text = flat(await dialog.innerText());
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await dialog.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600);
    return text;
}

/** What the page offers: the two buttons above the table and the row's "More Actions" menu. */
async function offer(media, name) {
    const out = {
        addMediaFile: (await media.addButton().count()) > 0,
        batchLinkMedia: (await media.batchButton().count()) > 0,
        rowMenu: null,
    };
    if (name && (await media.menuButton(name).count())) {
        out.rowMenu = await media.menuOffers(name);
    }
    return out;
}

/** The names the list shows. */
async function names(media) {
    return (await media.nameCells().allInnerTexts()).map((s) => flat(s));
}

/** Close a side window by its "Close"; answer "Yes" when the "Warning" asks. */
async function closeWindow(page, win) {
    if (!(await win.dialog().count())) return;
    await win.closeButton().click().catch(() => {});
    const warning = page.getByRole('dialog', {name: 'Warning', exact: true});
    try {
        await warning.waitFor({state: 'visible', timeout: 2_500});
        await warning.getByRole('button', {name: 'Yes', exact: true}).click();
    } catch (e) {
        // no question
    }
    await win.dialog().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(700);
}

/** "Add Media File" › choose files › "Image" › "Upload Files". */
async function addFile(page, media, {file, name, mediaType = 'Image'}) {
    if (!(await media.addButton().count())) return {offered: false};
    const win = await media.openUpload();
    await win.chooseFiles([file]);
    await win.expectUploaded(name);
    await win.chooseMediaType(name, mediaType);
    const answer = await pressAndAnswer(page, () => win.uploadFilesButton().click());
    const error = await errorWindow(page);
    await sleep(800);
    const windowOpen = await win.heading().isVisible().catch(() => false);
    if (windowOpen) await closeWindow(page, win);
    await idle(page).catch(() => {});
    return {offered: true, answer, errorWindow: error, windowOpenAfter: windowOpen, list: await names(media)};
}

/** Row › "Edit Metadata" › "Name of the file" › "Save". Leaves the window as the press left it. */
async function editName(page, media, {name, newName}) {
    if (!(await media.menuButton(name).count())) return {offered: false, why: 'no row menu'};
    const items = await media.openMenu(name);
    await media.closeMenu(name);
    if (!items.includes('Edit Metadata')) return {offered: false, items};
    const win = await media.openMetadata(name);
    await win.nameBox().fill(newName);
    const answer = await pressAndAnswer(page, () => win.submitButton().click());
    const error = await errorWindow(page, 4_000);
    await sleep(1_500);
    const windowOpen = await win.heading().isVisible().catch(() => false);
    const out = {offered: true, answer, errorWindow: error, windowOpenAfter: windowOpen};
    if (windowOpen) {
        out.boxAfter = await win.nameBox().inputValue().catch(() => null);
        out.formText = flat(await win.form().innerText().catch(() => null), 600);
    }
    await idle(page).catch(() => {});
    out.list = await names(media);
    return out;
}

/** "Batch Link Media" › "Link Media". */
async function batchLink(page, media) {
    if (!(await media.batchButton().count())) return {offered: false};
    const win = await media.openBatch();
    const rows = (await win.webNames().allInnerTexts()).map((s) => flat(s));
    const enabled = await win.linkButton().isEnabled();
    if (!enabled) {
        await closeWindow(page, win);
        return {offered: true, rows, linkMediaEnabled: false};
    }
    const answer = await pressAndAnswer(page, () => win.linkButton().click());
    const error = await errorWindow(page);
    await sleep(800);
    const windowOpen = await win.heading().isVisible().catch(() => false);
    if (windowOpen) await closeWindow(page, win);
    await idle(page).catch(() => {});
    return {offered: true, rows, linkMediaEnabled: true, answer, errorWindow: error, windowOpenAfter: windowOpen, list: await names(media)};
}

/** Row › "Delete File" › "OK". */
async function deleteFile(page, media, {name}) {
    if (!(await media.menuButton(name).count())) return {offered: false, why: 'no row menu'};
    const items = await media.openMenu(name);
    await media.closeMenu(name);
    if (!items.includes('Delete File')) return {offered: false, items};
    const dialog = await media.openDelete(name);
    const question = flat(await dialog.innerText());
    const answer = await pressAndAnswer(page, () => dialog.getByRole('button', {name: 'OK', exact: true}).click());
    const error = await errorWindow(page);
    await idle(page).catch(() => {});
    await sleep(800);
    return {offered: true, question, answer, errorWindow: error, list: await names(media)};
}

module.exports = {sleep, flat, isMediaChange, pressAndAnswer, errorWindow, offer, names, closeWindow, addFile, editName, batchLink, deleteFile};
