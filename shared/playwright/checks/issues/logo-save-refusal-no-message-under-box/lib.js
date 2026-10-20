// Helpers of walk.js (U10 A16, the save refusal of a picture the server does not take: no message
// under the box). Requiring this file runs nothing.
const zlib = require('zlib');
const {execFileSync} = require('child_process');

const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

/** A 24-bit BMP, w×h, one colour. */
function bmp(w, h, [r, g, b]) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const buf = Buffer.alloc(size);
    buf.write('BM', 0, 'ascii');
    buf.writeUInt32LE(size, 2);
    buf.writeUInt32LE(54, 10);
    buf.writeUInt32LE(40, 14);
    buf.writeInt32LE(w, 18);
    buf.writeInt32LE(h, 22);
    buf.writeUInt16LE(1, 26);
    buf.writeUInt16LE(24, 28);
    buf.writeUInt32LE(row * h, 34);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.set([b, g, r], 54 + y * row + x * 3);
    return buf;
}

/** An RGB PNG, w×h, one colour. */
function png(w, h, [r, g, b]) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(zlib.crc32(td) >>> 0);
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([r, g, b], y * (w * 3 + 1) + 1 + x * 3);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** A WebP picture, w×h, one colour, made by PHP's GD (imagewebp). */
function webp(w, h, [r, g, b]) {
    const code = `$i = imagecreatetruecolor(${w}, ${h}); imagefill($i, 0, 0, imagecolorallocate($i, ${r}, ${g}, ${b})); ob_start(); imagewebp($i); echo base64_encode(ob_get_clean());`;
    return Buffer.from(execFileSync('php', ['-r', code], {encoding: 'utf8'}), 'base64');
}

/** A small SVG logo: a coloured rectangle with a word. */
function svg(w, h, colour) {
    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${colour}"/><text x="10" y="26" font-size="18" fill="#fff">Logo</text></svg>\n`);
}

/** The walk's pictures, as Playwright file payloads. */
function files() {
    return {
        bmp: {name: 'logo.bmp', mimeType: 'image/bmp', buffer: bmp(120, 40, [204, 0, 0])},
        png: {name: 'logo.png', mimeType: 'image/png', buffer: png(120, 40, [0, 102, 204])},
        home: {name: 'home.png', mimeType: 'image/png', buffer: png(200, 80, [0, 153, 0])},
        svg: {name: 'logo.svg', mimeType: 'image/svg+xml', buffer: svg(120, 40, '#663399')},
        webp: {name: 'logo.webp', mimeType: 'image/webp', buffer: webp(120, 40, [255, 153, 0])},
    };
}

/**
 * What the form shows after "Save": "Saved", the text under the box (its own error line), every
 * error line of the form, the foot's visible text and its screen-reader list.
 */
async function readForm(form, box) {
    const savedShown = await form.savedStatus.waitFor({state: 'visible', timeout: 6_000}).then(() => true).catch(() => false);
    const underBox = (await box.field.locator('.pkpFieldError').allInnerTexts()).map(flat).filter((t) => t !== '');
    const underBoxCount = await box.field.locator('.pkpFieldError').count();
    const formErrors = (await form.form.locator('.pkpFieldError').allInnerTexts()).map(flat);
    const foot = (await form.errorSummary.count()) ? flat(await form.errorSummary.first().innerText()) : null;
    const footA11y = (await form.errorSummary.count()) ? flat(await form.errorSummary.first().textContent()) : null;
    return {savedShown, underBox, underBoxCount, formErrors, foot, footA11y, previewShown: await box.preview.isVisible()};
}

module.exports = {flat, bmp, png, webp, svg, files, readForm};
