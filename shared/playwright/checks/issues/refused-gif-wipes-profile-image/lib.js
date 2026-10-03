// Helpers for the U03 A2 walk (refused-gif-wipes-profile-image). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');

/**
 * A valid GIF89a of w × h pixels in one colour, written without a library: LZW with a
 * minimum code size of 2, a clear code before every two pixels, so every code stays 3 bits.
 */
function gif(w, h, rgb = [0xd0, 0x40, 0x20]) {
    const head = Buffer.alloc(13);
    head.write('GIF89a', 0, 'ascii');
    head.writeUInt16LE(w, 6);
    head.writeUInt16LE(h, 8);
    head[10] = 0xf1; // global colour table, 4 entries
    const table = Buffer.from([...rgb, 0, 0, 0, 255, 255, 255, 0, 0, 0]);
    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(w, 5);
    desc.writeUInt16LE(h, 7);
    const codes = [];
    for (let left = w * h; left > 0; left -= 2) {
        codes.push(4, 0);
        if (left > 1) codes.push(0);
    }
    codes.push(5);
    const bytes = [];
    let acc = 0, bits = 0;
    for (const c of codes) {
        acc |= c << bits;
        bits += 3;
        while (bits >= 8) { bytes.push(acc & 0xff); acc >>= 8; bits -= 8; }
    }
    if (bits) bytes.push(acc & 0xff);
    const blocks = [];
    for (let i = 0; i < bytes.length; i += 255) {
        const chunk = bytes.slice(i, i + 255);
        blocks.push(chunk.length, ...chunk);
    }
    return Buffer.concat([head, table, desc, Buffer.from([2, ...blocks, 0, 0x3b])]);
}

/** A picture drawn by the browser's own encoder ('image/jpeg' or 'image/png'). */
async function canvasImage(page, type, w, h) {
    const b64 = await page.evaluate(({type, w, h}) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#1e6292'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f0c040'; g.fillRect(w / 4, h / 4, w / 2, h / 2);
        return c.toDataURL(type, 0.9).split(',')[1];
    }, {type, w, h});
    return Buffer.from(b64, 'base64');
}

/** The walk's files under <dir>/files (the page must be on any page of the app). */
async function makeFiles(page, dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const w = (name, buf) => { const f = path.join(d, name); fs.writeFileSync(f, buf); return f; };
    return {
        jpg: w('u03rh-photo.jpg', await canvasImage(page, 'image/jpeg', 100, 100)),
        gif: w('u03rh-banner.gif', gif(300, 300)),
        notes: w('u03rh-notes.png', Buffer.from('u03rh notes: a text file with a picture\'s name\n')),
        smallGif: w('u03rh-small.gif', gif(100, 100, [0x20, 0x90, 0x40])),
        bigPng: w('u03rh-big.png', await canvasImage(page, 'image/png', 400, 400)),
    };
}

/** Open the profile's "Public" tab and wait for its form. */
async function openPublicTab(page, app) {
    const prefix = app.line && app.line !== 'main' && app.line !== 'stable-3_5_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${prefix}/user/profile/publicProfile`));
    await idle(page);
    await page.locator('form#publicProfileForm').waitFor({timeout: 20000});
    await page.locator('#plupload input[type=file]').waitFor({state: 'attached', timeout: 20000});
    await idle(page);
}

/** What "Profile Image" shows: the picture (its address and whether it rendered) and "Delete". */
async function readImage(page) {
    const img = page.locator('form#publicProfileForm img');
    const n = await img.count();
    const src = n ? await img.first().getAttribute('src') : null;
    const rendered = n ? await img.first().evaluate((el) => ({w: el.naturalWidth, h: el.naturalHeight, complete: el.complete})) : null;
    const del = await page.getByRole('button', {name: 'Delete', exact: true}).count();
    return {picture: n > 0, src, rendered, deleteButton: del > 0};
}

/**
 * Choose a file in "Profile Image": wait for the page's reload (accepted) or the sentence in
 * the upload area (refused); the browser alerts the script's listener collected are returned.
 */
async function upload(page, file, dialogs) {
    const start = dialogs.length;
    const before = page.url();
    await page.locator('#plupload input[type=file]').setInputFiles(file);
    const deadline = Date.now() + 30000;
    let outcome = 'timeout', error = '';
    while (Date.now() < deadline) {
        await page.waitForTimeout(250);
        if (page.url() !== before && /uniq=/.test(page.url())) { outcome = 'reloaded'; break; }
        error = (await page.locator('#plupload .pkpUploaderError').innerText().catch(() => '')).trim();
        if (error) { outcome = 'refused'; break; }
        error = (await page.locator('#plupload').innerText().catch(() => '')).match(/File extension error\.?/) ? 'File extension error.' : '';
        if (error) { outcome = 'refused-in-browser'; break; }
    }
    if (outcome === 'reloaded') {
        await page.waitForLoadState('load').catch(() => {});
        await page.locator('form#publicProfileForm').waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
    } else {
        await page.waitForTimeout(500);
    }
    return {file: path.basename(file), outcome, uploadArea: error, url: page.url(), alerts: dialogs.slice(start)};
}

/** Open an address in the browser as a person types it; status, type and the picture's size. */
async function openAddress(page, url) {
    const res = await page.goto(url).catch((e) => ({error: String(e.message).split('\n')[0]}));
    if (!res || res.error) return {url, error: res && res.error};
    const out = {url, status: res.status(), contentType: res.headers()['content-type'] || null};
    if (/^image\//.test(out.contentType || '')) {
        out.size = await page.evaluate(() => {
            const i = document.images[0];
            return i ? {w: i.naturalWidth, h: i.naturalHeight} : null;
        });
    } else {
        out.text = (await page.locator('body').innerText().catch(() => '')).slice(0, 200);
    }
    return out;
}

/** The site's public files the fleet holds for the user (read on disk, for Evidence). */
function siteFiles(app, userId) {
    const dir = path.resolve(REPO, app.root, `public-ds${app.dataset}`, 'site');
    if (!fs.existsSync(dir)) return {dir, missing: true};
    return fs.readdirSync(dir).filter((f) => f.startsWith(`profileImage-${userId}.`)).map((f) => ({file: f, bytes: fs.statSync(path.join(dir, f)).size}));
}

module.exports = {gif, canvasImage, makeFiles, openPublicTab, readImage, upload, openAddress, siteFiles};
