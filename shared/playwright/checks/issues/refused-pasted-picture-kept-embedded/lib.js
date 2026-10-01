// Helpers for walk.js (U09 A17: a dropped or pasted picture the site refuses stays in the text,
// embedded). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const {png} = require('../picture-over-upload-limit-server-error/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** A picture address shortened for the record: a data address to its head and length. */
const shortSrc = (s) => (s == null ? s : /^data:/.test(s) ? `${s.slice(0, 30)}… (${s.length} chars)` : s.replace(/^https?:\/\/[^/]+/, ''));

/** A real 24-bit BMP of w×h pixels (`red` sets its colour). */
function bmp(w, h, red = 0xc0) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const b = Buffer.alloc(size);
    b.write('BM', 0);
    b.writeUInt32LE(size, 2);
    b.writeUInt32LE(54, 10);
    b.writeUInt32LE(40, 14);
    b.writeInt32LE(w, 18);
    b.writeInt32LE(h, 22);
    b.writeUInt16LE(1, 26);
    b.writeUInt16LE(24, 28);
    b.writeUInt32LE(row * h, 34);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = 54 + y * row + x * 3;
            b[o] = (x * 2) & 0xff; b[o + 1] = (y * 2) & 0xff; b[o + 2] = red;
        }
    }
    return b;
}

/** The walk's files, written once into <dir>/files: photo.bmp, drawing.bmp, notes.png (text), photo.png. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const w = (name, type, make) => {
        const p = path.join(d, name);
        if (!fs.existsSync(p)) fs.writeFileSync(p, make());
        return {path: p, name, type, kb: Math.round(fs.statSync(p).size / 1024)};
    };
    return {
        bmp: w('photo.bmp', 'image/bmp', () => bmp(160, 120)),
        bmp2: w('drawing.bmp', 'image/bmp', () => bmp(140, 100, 0x30)),
        fake: w('notes.png', 'image/png', () => Buffer.from('These are notes, a text file, not a picture.\n')),
        png: w('photo.png', 'image/png', () => png(120, 80, false)),
    };
}

/**
 * Drop a file from the computer into a TinyMCE box (the editor's id), as a drag from the file
 * manager does: dragenter, dragover and drop on the writing area's last paragraph, the file in
 * the event's DataTransfer. `waitIdle: false` skips the jQuery-idle wait (an upload whose error
 * callback throws never ends jQuery's request count). Returns every upload the drop set off: request and answer.
 */
async function dropFile(page, editorId, file, {waitIdle = true} = {}) {
    const frame = await (await page.locator(`[id="${editorId}_ifr"]`).elementHandle()).contentFrame();
    // A drop sends the dropped file and again every picture of the box refused before.
    const uploads = [];
    const onResponse = (r) => {
        if (/_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST') uploads.push(r);
    };
    page.on('response', onResponse);
    const answered = page.waitForResponse((r) => /_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await frame.evaluate(({b64, name, type}) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], name, {type}));
        const target = document.body.lastElementChild || document.body;
        const r = target.getBoundingClientRect();
        const opts = {bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + Math.min(20, r.width / 2), clientY: r.top + r.height / 2};
        for (const t of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(t, opts));
    }, {b64: fs.readFileSync(file.path).toString('base64'), name: file.name, type: file.type});
    await answered;
    await sleep(1500);
    if (waitIdle) await idle(page);
    page.off('response', onResponse);
    const out = [];
    for (const r of uploads) {
        let body = null;
        try { body = await r.json(); } catch (e) { body = flat(await r.text().catch(() => null), 200); }
        out.push({
            request: `POST ${r.url().replace(/^https?:\/\/[^/]+/, '')}`,
            status: r.status(),
            body: body && body.url ? {url: shortSrc(body.url)} : body,
        });
    }
    return out;
}

/**
 * Paste a file into a TinyMCE box: the browser's `paste` event on the writing area, the file in
 * its clipboardData, the caret at the end of the text (what pasting a copied file sends; TinyMCE
 * takes it through the same pasteImageData() as a drop). Returns every upload it set off.
 */
async function pasteFile(page, editorId, file) {
    const frame = await (await page.locator(`[id="${editorId}_ifr"]`).elementHandle()).contentFrame();
    const uploads = [];
    const onResponse = (r) => {
        if (/_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST') uploads.push(r);
    };
    page.on('response', onResponse);
    await page.evaluate((i) => {
        const ed = window.tinymce.get(i);
        ed.focus();
        ed.selection.select(ed.getBody(), true);
        ed.selection.collapse(false);
    }, editorId);
    const answered = page.waitForResponse((r) => /_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await frame.evaluate(({b64, name, type}) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], name, {type}));
        document.body.dispatchEvent(new ClipboardEvent('paste', {bubbles: true, cancelable: true, clipboardData: dt}));
    }, {b64: fs.readFileSync(file.path).toString('base64'), name: file.name, type: file.type});
    await answered;
    await sleep(1500);
    await idle(page);
    page.off('response', onResponse);
    const out = [];
    for (const r of uploads) {
        let body = null;
        try { body = await r.json(); } catch (e) { body = flat(await r.text().catch(() => null), 200); }
        out.push({request: `POST ${r.url().replace(/^https?:\/\/[^/]+/, '')}`, status: r.status(), body: body && body.url ? {url: shortSrc(body.url)} : body});
    }
    return out;
}

/** TinyMCE's notices on the page (".tox-notification"), their text; `dismiss` closes them after reading. */
async function editorNotices(page, {dismiss = false} = {}) {
    const n = page.locator('.tox-notification:visible');
    const texts = (await n.allInnerTexts()).map((t) => flat(t));
    if (dismiss) {
        for (const b of await page.locator('.tox-notification:visible .tox-notification__dismiss').all()) await b.click().catch(() => {});
        await sleep(300);
    }
    return texts;
}

/** The pictures in a box: as the writing area shows them, and as the editor's text (what "Save" posts) holds them. */
async function editorPictures(page, editorId) {
    const p = await page.evaluate((i) => {
        const ed = window.tinymce.get(i);
        const shown = [...ed.getBody().querySelectorAll('img')].map((img) => img.getAttribute('src'));
        const html = ed.getContent();
        const saved = [...html.matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => m[1]);
        return {shown, saved};
    }, editorId);
    return {shown: p.shown.map(shortSrc), saved: p.saved.map(shortSrc)};
}

/** Steps 2–4: Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page". Returns the item window. */
async function openCustomPageWindow(app, page) {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const {CustomPageWindow} = require('../../../pages/CustomContentPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website#setup/navigationMenus`));
    const nav = new NavigationTab(page, app.contextPath);
    await nav.itemsTable.waitFor({timeout: T});
    await idle(page);
    await nav.addItem();
    const win = new CustomPageWindow(page);
    await win.chooseType('Custom Page');
    await idle(page);
    return win;
}

/** The pictures of a public page's text: address, and whether the browser could draw it. */
async function publicPictures(page) {
    const imgs = await page.locator('.pkp_structure_main .page img').evaluateAll((els) => els.map((img) => ({
        src: img.getAttribute('src'), drawn: img.complete && img.naturalWidth > 0, width: img.naturalWidth,
    })));
    return imgs.map((i) => ({...i, src: shortSrc(i.src)}));
}

module.exports = {T, sleep, flat, shortSrc, bmp, makeFiles, dropFile, pasteFile, editorNotices, editorPictures, openCustomPageWindow, publicPictures};
