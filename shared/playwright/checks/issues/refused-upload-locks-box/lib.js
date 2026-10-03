// Helpers of walk.js (U10 A7: a file refused by an upload box of the settings forms locks the box's
// "Upload File" and the form's "Save"). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tidy = (t) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim());
const FIXTURES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');

/** The walk's files under <dir>/files: a PDF, a PNG and a style sheet, named as the Steps name them. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const pdf = path.join(d, 'u10e-logo.pdf');
    const png = path.join(d, 'u10e-logo.png');
    const css = path.join(d, 'u10e-style.css');
    fs.copyFileSync(path.join(FIXTURES, 'article.pdf'), pdf);
    fs.copyFileSync(path.join(FIXTURES, 'profile-image-400.png'), png);
    fs.writeFileSync(css, '/* u10e */\nbody { }\n');
    return {pdf, png, css};
}

/** Settings › Website, the "Appearance" tab, then its `sub` tab ("setup" or "advanced"). */
async function openAppearance(page, app, sub) {
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${lang}/management/settings/website`));
    await idle(page);
    await page.locator('[id="appearance-button"]').first().click();
    const side = page.locator(`[id="${sub === "setup" ? "appearance-setup" : sub}-button"]`).first();
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

/** What the box and its form show: the field's text, its buttons, the drop area and its previews, "Save", the form's foot. */
async function boxState(page, b) {
    await sleep(400);
    const removeBtn = b.field.getByRole('button', {name: 'Remove', exact: true});
    const previews = await b.dropzone.locator('.dz-preview').evaluateAll((els) => els.map((e) => ({
        cls: e.className,
        text: e.innerText.replace(/\s+/g, ' ').trim(),
        visible: !!(e.offsetWidth || e.offsetHeight),
    }))).catch(() => null);
    const foot = await b.form.locator('.pkpFormPage__footer, .pkpFormPage__buttons, .pkpFormPage__status, .pkpFormErrors').allInnerTexts().catch(() => []);
    return {
        fieldText: tidy(await b.field.innerText().catch(() => null)),
        uploadFile: (await b.button.count()) ? {disabled: await b.button.isDisabled(), visible: await b.button.isVisible()} : null,
        remove: (await removeBtn.count()) ? await removeBtn.first().isVisible() : false,
        thumbnail: await b.field.locator('img.pkpFormField--uploadImage__thumbnail').getAttribute('src').then((s) => (s ? s.slice(0, 40) : s)).catch(() => null),
        altText: (await b.field.locator('.pkpFormField--uploadImage__altTextInput').count()) > 0,
        dropzone: {
            cls: await b.dropzone.getAttribute('class').catch(() => null),
            text: tidy(await b.dropzone.innerText().catch(() => null)),
            visible: await b.dropzone.isVisible().catch(() => null),
            previews,
        },
        save: (await b.save.count()) ? {disabled: await b.save.isDisabled()} : null,
        foot: tidy(foot.join(' | ')),
    };
}

/** Press the box's "Upload File" and, when a file chooser opens, choose `file`. A disabled button is pressed as a person would (nothing happens). */
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

/** Click the middle of the box's drop area; says what element the click landed on and whether a file chooser opened (nothing is chosen). */
async function clickFrame(page, b) {
    const bb = await b.dropzone.boundingBox().catch(() => null);
    if (!bb || !bb.width || !bb.height) return {visible: false, box: bb};
    const x = bb.x + bb.width / 2;
    const y = bb.y + bb.height / 2;
    const hit = await page.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        return el ? `${el.tagName.toLowerCase()}.${String(el.className).trim().replace(/\s+/g, '.')}` : null;
    }, [x, y]);
    const chooser = page.waitForEvent('filechooser', {timeout: 4000}).catch(() => null);
    await page.mouse.click(x, y);
    const c = await chooser;
    await sleep(500);
    return {visible: true, size: `${Math.round(bb.width)}x${Math.round(bb.height)}`, clickedOn: hit, chooserOpened: !!c};
}

/** Drag a file from the computer onto the box's drop area (the browser's own drag events with the file). */
async function dropFile(page, b, file, mimeType) {
    const buf = fs.readFileSync(file);
    await b.dropzone.evaluate((el, f) => {
        const bytes = Uint8Array.from(atob(f.b64), (ch) => ch.charCodeAt(0));
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], f.name, {type: f.mimeType}));
        for (const type of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: dt}));
    }, {b64: buf.toString('base64'), name: path.basename(file), mimeType});
    await sleep(2000);
    await idle(page);
}

/** The refused file's "Remove file" link in the box's drop area: its text, drawn box, colours, whether it is the element on top at its middle. */
async function removeLink(page, b) {
    const link = b.dropzone.locator('a.dz-remove').first();
    if (!(await link.count())) return {present: false};
    const bb = await link.boundingBox();
    const style = await link.evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        const pv = el.closest('.dz-preview');
        const pcs = pv ? getComputedStyle(pv) : null;
        return {
            text: el.innerText, color: cs.color, background: cs.backgroundColor, opacity: cs.opacity, visibility: cs.visibility,
            display: cs.display, fontSize: cs.fontSize, onTop: top === el || el.contains(top),
            topIs: top ? `${top.tagName.toLowerCase()}.${String(top.className).trim().replace(/\s+/g, '.')}` : null,
            previewBackground: pcs ? pcs.backgroundColor : null,
        };
    });
    return {present: true, visible: await link.isVisible(), box: bb, ...style};
}

/** A real JPEG `u10e-icon.jpg` under <dir>/files, drawn by the browser's own encoder in `page`. */
async function makeJpeg(page, dir) {
    const f = path.join(dir, 'files', 'u10e-icon.jpg');
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

module.exports = {T, removeLink, makeJpeg, sleep, tidy, makeFiles, openAppearance, box, boxState, pressUploadFile, clickFrame, dropFile};
