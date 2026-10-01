// Helpers for walk.js (U09 A16: a ".pdf" or ".svg" chosen in the picture window is ignored with no
// message). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {bmp} = require('../refused-pasted-picture-kept-embedded/lib');
const {png} = require('../picture-over-upload-limit-server-error/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const isUpload = (r) => /_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST';

/** A one-page PDF with a line of text (a real PDF, readable by any viewer). */
function pdf() {
    const objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        null,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const stream = 'BT /F1 18 Tf 20 70 Td (A PDF, not a picture) Tj ET';
    objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    let out = '%PDF-1.4\n';
    const offsets = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
}

/** The walk's files, written once into <dir>/files: drawing.svg, doc.pdf, photo.bmp, photo.png. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const w = (name, type, make) => {
        const p = path.join(d, name);
        if (!fs.existsSync(p)) fs.writeFileSync(p, make());
        return {path: p, name, type, kb: Math.max(1, Math.round(fs.statSync(p).size / 1024))};
    };
    return {
        svg: w('drawing.svg', 'image/svg+xml', () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" fill="#2a6"/><circle cx="60" cy="40" r="25" fill="#fff"/></svg>\n')),
        pdf: w('doc.pdf', 'application/pdf', pdf),
        bmp: w('photo.bmp', 'image/bmp', () => bmp(160, 120)),
        png: w('photo.png', 'image/png', () => png(120, 80, false)),
    };
}

/** Collects the uploads (POST _uploadPublicFile) the page sends from now until stop(). */
function watchUploads(page) {
    const seen = [];
    const on = (r) => { if (isUpload(r)) seen.push(r); };
    page.on('response', on);
    return async () => {
        page.off('response', on);
        const out = [];
        for (const r of seen) {
            let body = null;
            try { body = await r.json(); } catch (e) { body = flat(await r.text().catch(() => null), 200); }
            if (body && body.url) body = {url: body.url.replace(/^https?:\/\/[^/]+/, '')};
            out.push({request: `POST ${r.url().replace(/^https?:\/\/[^/]+/, '')}`, status: r.status(), body});
        }
        return out;
    };
}

/** What the picture window shows now: its selected tab, "Source", the small window's text. */
async function windowState(win) {
    const alertShown = await win.alertOk.isVisible().catch(() => false);
    const selected = await win.root.locator('[role="tab"][aria-selected="true"]').innerText().catch(() => null);
    let source = null;
    if (flat(selected) === 'General') source = await win.source.inputValue().catch(() => null);
    return {
        tab: flat(selected),
        source: source ? source.replace(/^https?:\/\/[^/]+/, '') : source,
        alert: alertShown ? flat(await win.alert.innerText()) : null,
        blocked: await win.root.locator('.tox-dialog__busy-spinner').isVisible().catch(() => false),
    };
}

/**
 * "Browse for an image" on the "Upload" tab with `file` (the hidden file input under the button;
 * patterns.md pitfall 13), then waits for an upload or the small window for up to `waitMs`.
 * Returns the uploads sent and the window's state; settle() closes the small window if it shows.
 */
async function browse(page, win, file, {waitMs = 5000} = {}) {
    await win.openTab('Upload');
    const stop = watchUploads(page);
    await win.fileInput.setInputFiles(file.path);
    await Promise.race([
        page.waitForResponse(isUpload, {timeout: waitMs}).then(() => win.alertOk.or(win.source).first().waitFor({timeout: 8000})).catch(() => {}),
        sleep(waitMs),
    ]);
    await sleep(500);
    const uploads = await stop();
    const state = await windowState(win);
    return {uploads, ...state, settle: async () => { if (state.alert) await win.dismissAlert(); }};
}

/**
 * Drag `file` from the computer onto "Drop an image here" (the window's drop zone): the browser's
 * dragenter, dragover and drop on the zone, the file in the event's DataTransfer. Same answer as
 * browse().
 */
async function dropOnZone(page, win, file, {waitMs = 5000} = {}) {
    await win.openTab('Upload');
    const stop = watchUploads(page);
    await win.dropZone.evaluate((zone, {b64, name, type}) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], name, {type}));
        const r = zone.getBoundingClientRect();
        const opts = {bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2};
        for (const t of ['dragenter', 'dragover', 'drop']) zone.dispatchEvent(new DragEvent(t, opts));
    }, {b64: fs.readFileSync(file.path).toString('base64'), name: file.name, type: file.type});
    await Promise.race([
        page.waitForResponse(isUpload, {timeout: waitMs}).then(() => win.alertOk.or(win.source).first().waitFor({timeout: 8000})).catch(() => {}),
        sleep(waitMs),
    ]);
    await sleep(500);
    const uploads = await stop();
    const state = await windowState(win);
    return {uploads, ...state, settle: async () => { if (state.alert) await win.dismissAlert(); }};
}

/**
 * Drop `file` into a TinyMCE box itself (the editor's id), as a drag from the file manager does;
 * waits `waitMs` and returns the uploads it set off and the editor's notices.
 */
async function dropIntoBox(page, editorId, file, {waitMs = 4000} = {}) {
    const frame = await (await page.locator(`[id="${editorId}_ifr"]`).elementHandle()).contentFrame();
    const stop = watchUploads(page);
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
    await sleep(waitMs);
    const uploads = await stop();
    const notices = (await page.locator('.tox-notification:visible').allInnerTexts()).map((t) => flat(t));
    for (const b of await page.locator('.tox-notification:visible .tox-notification__dismiss').all()) await b.click().catch(() => {});
    const pictures = await page.evaluate((i) => [...window.tinymce.get(i).getBody().querySelectorAll('img')].map((img) => {
        const s = img.getAttribute('src') || '';
        return /^(data|blob):/.test(s) ? `${s.slice(0, 30)}…` : s.replace(/^https?:\/\/[^/]+/, '');
    }), editorId);
    return {uploads, notices, pictures};
}

module.exports = {T, sleep, flat, makeFiles, watchUploads, windowState, browse, dropOnZone, dropIntoBox};
