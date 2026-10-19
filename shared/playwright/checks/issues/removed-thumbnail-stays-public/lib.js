// Helpers of walk.js (U10 A20: a removed journal, press or server thumbnail stays public at its old address).
// Requiring this file runs nothing. The Appearance tab helpers are copied from refused-upload-locks-box/lib.js (U10 A7)
// and removed-style-sheet-stays-public/lib.js (U10 A5), so this folder stands alone.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tidy = (t) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim());
const FIXTURES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');

/** The thumbnail setting's name in each app. */
const THUMB = {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'};

/** The walk's pictures under <dir>/files: the thumbnail, the logo (the control), a French and a second English thumbnail (the neighbour), a small harmless PNG (the way round). */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const src = path.join(FIXTURES, 'profile-image-400.png');
    const out = {};
    for (const [k, n] of [['thumb', 'h19p-thumbnail.png'], ['logo', 'h19p-logo.png'], ['thumbFr', 'h19p-thumbnail-fr.png'], ['thumb2', 'h19p-thumbnail-2.png']]) {
        out[k] = path.join(d, n);
        fs.copyFileSync(src, out[k]);
    }
    out.blank = path.join(d, 'h19p-blank.png');
    fs.copyFileSync(path.join(FIXTURES, 'figure.png'), out.blank);
    return out;
}

/** A real JPEG `<name>` under <dir>/files, drawn by the browser's own encoder in `page` (copied from refused-upload-locks-box/lib.js). */
async function makeJpeg(page, dir, name) {
    const f = path.join(dir, 'files', name);
    if (!fs.existsSync(f)) {
        const b64 = await page.evaluate(() => {
            const c = document.createElement('canvas');
            c.width = 64; c.height = 64;
            const g = c.getContext('2d');
            g.fillStyle = '#1e6292'; g.fillRect(0, 0, 64, 64);
            return c.toDataURL('image/jpeg', 0.9).split(',')[1];
        });
        fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    }
    return f;
}

/** Settings › Website, the "Appearance" tab, then its `sub` tab ("setup" or "advanced"). */
async function openAppearance(page, app, sub) {
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${lang}/management/settings/website`));
    await idle(page);
    await page.locator('[id="appearance-button"]').first().click();
    const side = page.locator(`[id="${sub === 'setup' ? 'appearance-setup' : sub}-button"]`).first();
    await side.waitFor({timeout: T});
    await side.click();
    await idle(page);
}

/** One upload box of a form: its ids, from the form id, the field name and the locale (null when not multilingual). */
function box(page, formId, field, locale) {
    const id = (part) => `${formId}-${field}-${part}${locale ? '-' + locale : ''}`;
    const control = page.locator(`[id="${id('control')}"]`);
    const fieldEl = control.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]');
    const form = control.locator('xpath=ancestor::form[1]');
    return {
        id,
        control,
        field: fieldEl,
        form,
        button: page.locator(`[id="${id('clickable')}"]`),
        dropzone: page.locator(`[id="${id('dropzone')}"]`),
        save: form.getByRole('button', {name: 'Save', exact: true}).first(),
    };
}

/** What the box shows: its text, "Upload File", "Remove", the picture's address. */
async function boxState(page, b) {
    await sleep(400);
    const removeBtn = b.field.getByRole('button', {name: 'Remove', exact: true});
    const img = b.field.locator('img').first();
    return {
        fieldText: tidy(await b.field.innerText().catch(() => null)),
        uploadFile: (await b.button.count()) ? {disabled: await b.button.isDisabled(), visible: await b.button.isVisible()} : null,
        remove: (await removeBtn.count()) ? await removeBtn.first().isVisible() : false,
        picture: (await img.count()) ? await img.getAttribute('src') : null,
    };
}

/** The address of the picture the box shows (null when it shows none). */
async function pictureSrc(b) {
    const img = b.field.locator('img').first();
    return (await img.count()) ? img.getAttribute('src') : null;
}

/** Press the box's "Upload File" and, when a file chooser opens, choose `file`. */
async function pressUploadFile(page, b, file) {
    const disabled = await b.button.isDisabled();
    const chooser = page.waitForEvent('filechooser', {timeout: 4000}).catch(() => null);
    await b.button.click({force: disabled, timeout: 5000}).catch(() => null);
    const c = await chooser;
    if (c && file) await c.setFiles(file);
    await sleep(1500);
    await idle(page);
    return {disabledBefore: disabled, chooserOpened: !!c, chose: c && file ? path.basename(file) : null};
}

/** Press the box's "Remove". */
async function pressRemove(b) {
    const btn = b.field.getByRole('button', {name: 'Remove', exact: true}).first();
    if (!(await btn.count())) return {pressed: false};
    await btn.click();
    await sleep(500);
    return {pressed: true};
}

/** Press the form's "Save" and wait for the context's save; its status and the form's foot text. */
async function save(page, b) {
    const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await b.save.click();
    const r = await saved;
    await sleep(1000);
    const foot = await b.form.locator('.pkpFormPage__status, .pkpFormPage__footer').allInnerTexts().catch(() => []);
    return {saveStatus: r ? r.status() : null, foot: tidy(foot.join(' | '))};
}

/** Press the form's language button reading `label` ("French"), which shows that language's boxes. */
async function showLanguage(b, label) {
    const btn = b.form.locator('.pkpFormLocales__locale').filter({hasText: label}).first();
    if (!(await btn.count())) return {pressed: false};
    await btn.click();
    await sleep(500);
    return {pressed: true};
}

/** Open `url` in the page as a visitor would; its status, content type and size or first characters. */
async function openAddress(page, url) {
    if (!url) return null;
    const res = await page.goto(url).catch((e) => ({error: String(e.message).split('\n')[0]}));
    if (!res || res.error) return {url, error: res && res.error};
    const type = res.headers()['content-type'] || null;
    const body = /text|css|html/.test(type || '') ? tidy((await res.text()).slice(0, 200)) : `(${(await res.body()).length} bytes)`;
    return {url: url.replace(/^https?:\/\/[^/]+/, ''), status: res.status(), type, body};
}

module.exports = {T, sleep, THUMB, makeFiles, makeJpeg, openAppearance, box, boxState, pictureSrc, pressUploadFile, pressRemove, save, showLanguage, openAddress};
