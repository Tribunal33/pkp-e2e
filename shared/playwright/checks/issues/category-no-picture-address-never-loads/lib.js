// Helpers for the U16 A22 walk (a category's picture addresses typed for a category with no picture).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;

/**
 * Settings › Journal (Press, Server) › "Categories": give a category a "Cover Image" and save it.
 * main: the row's "More Actions" › "Edit", the Vue window's upload box, "Save".
 * stable-3_5_0: the category's name in the list opens the older form (plupload "Upload" box, "OK").
 */
async function setCategoryPicture(page, app, catName, file) {
    const legacy = (app.line || 'main') !== 'main';
    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
    const categories = new CategoriesTab(page, app.contextPath);
    if (!legacy) {
        await categories.goto();
        const win = await categories.openEdit(catName);
        const up = await win.uploadCover(file);
        const saved = await win.save();
        await idle(page);
        const body = await saved.json().catch(() => null);
        await page.waitForTimeout(500);
        return {
            upload: up.status(),
            save: saved.status(),
            storedImage: body && body.image ? body.image : null,
            windowOpen: await win.root().isVisible().catch(() => false),
        };
    }
    await page.goto(categories.url());
    await page.locator('#categories-button').click();
    await page.locator('#categoriesContainer table').first().waitFor({timeout: T});
    await idle(page);
    await page.locator('#categoriesContainer a.pkp_linkaction_editCategory')
        .filter({hasText: new RegExp(`^\\s*${catName}\\s*$`)}).first().click();
    await page.locator('form#categoryForm [name="name[en]"]').waitFor({timeout: T});
    await idle(page);
    const uploaded = page.waitForResponse((r) => /upload-?[Ii]mage/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await page.locator('form#categoryForm #plupload input[type=file]').setInputFiles(file);
    const up = await uploaded;
    await idle(page);
    const saved = page.waitForResponse((r) => /update-?[Cc]ategory/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await page.locator('form#categoryForm').getByRole('button', {name: 'OK', exact: true}).click();
    const s = await saved;
    await idle(page);
    return {upload: up.status(), save: s.status(), windowOpen: await page.locator('form#categoryForm').isVisible().catch(() => false)};
}

/**
 * Type an address into the browser and wait up to `wait` ms for the page to finish loading.
 * Returns the response's status and headers as the browser received them, the body's size when it arrived,
 * whether loading finished, and the page's text when it did.
 */
async function typeAddress(page, address, {wait = 20_000} = {}) {
    let head = null;
    const onResponse = (r) => {
        if (r.url() === address && !head) head = {status: r.status(), headers: r.headers()};
    };
    let failed = null;
    const onFailed = (req) => {
        if (req.url() === address) failed = req.failure() && req.failure().errorText;
    };
    page.on('response', onResponse);
    page.on('requestfailed', onFailed);
    const started = Date.now();
    let res = null;
    let loadError = null;
    try {
        res = await page.goto(address, {timeout: wait, waitUntil: 'load'});
    } catch (e) {
        loadError = String(e.message).split('\n')[0];
    }
    const ms = Date.now() - started;
    let bytes = null;
    if (res) bytes = await res.body().then((b) => b.length).catch((e) => `body unreadable: ${String(e.message).split('\n')[0]}`);
    const text = res ? await page.locator('body').innerText({timeout: 3_000}).catch(() => null) : null;
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
    // Leave the hanging load behind before the next step.
    if (!res) await page.goto('about:blank').catch(() => null);
    const h = (res && res.headers()) || (head && head.headers) || {};
    return {
        address,
        finishedLoading: !!res,
        ms,
        loadError,
        requestFailed: failed,
        status: res ? res.status() : head && head.status,
        contentType: h['content-type'] || null,
        contentLength: h['content-length'] || null,
        contentDisposition: h['content-disposition'] || null,
        bytes,
        text: text && text.replace(/\s+/g, ' ').trim().slice(0, 200),
    };
}

module.exports = {setCategoryPicture, typeAddress};
