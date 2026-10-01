// Helpers of the two walks on a picture over PHP's upload limits (issue reports
// docs/issues/U09-A18-picture-over-upload-limit-server-error.md and
// docs/issues/U09-A18-picture-over-request-limit-server-error.md). Requiring this file runs
// nothing.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * The install on PHP's own upload limits (`upload_max_filesize = 2M`, `post_max_size = 8M`, the
 * values php.ini-production and php.ini-development ship). The fleet's server runs on the host's
 * php.ini, which may raise them; this starts a second `php -S` for the same checkout and database
 * (base port + 74) with those two limits set, through a copy of the fleet's config that differs
 * only in the port of base_url and allowed_hosts. `ini` adds PHP settings (`display_errors=Off`).
 * Returns the server's origin, its log and a stop().
 */
async function startDefaultLimitsServer(app, outDir, {ini = []} = {}) {
    const {spawn} = require('child_process');
    const port = app.basePort + 74;
    const origin = `http://127.0.0.1:${port}`;
    const source = fs.readFileSync(app.configFile, 'utf8');
    const config = source
        .split(app.baseURL).join(origin)
        .replace(/^allowed_hosts = .*$/m, `allowed_hosts = "[\\"127.0.0.1\\",\\"127.0.0.1:${port}\\"]"`);
    const configFile = path.join(outDir, `config.defaultlimits-${app.line}-${app.name}.inc.php`);
    fs.writeFileSync(configFile, config);
    const logFile = path.join(outDir, `server-defaultlimits-${app.line}-${app.name}.log`);
    const child = spawn('php', ['-d', 'max_execution_time=120', '-d', 'upload_max_filesize=2M', '-d', 'post_max_size=8M',
        ...ini.flatMap((v) => ['-d', v]), '-S', `127.0.0.1:${port}`, '-t', app.root], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: configFile},
        stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
        detached: true,
    });
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
        try {
            up = (await fetch(`${origin}/README.md`)).ok;
        } catch (e) {
            /* not up yet */
        }
        if (!up) await sleep(200);
    }
    const stop = () => {
        try {
            process.kill(-child.pid);
        } catch (e) {
            child.kill();
        }
    };
    if (!up) {
        stop();
        throw new Error(`no answer on ${origin}`);
    }
    const logSize = () => (fs.existsSync(logFile) ? fs.statSync(logFile).size : 0);
    /** The log's lines since `from` (a byte offset) that match `re`. */
    const logSince = (from, re) => fs.readFileSync(logFile).subarray(from).toString('utf8')
        .split('\n').filter((l) => re.test(l)).map((l) => flat(l, 400));
    return {origin, port, configFile: path.relative(process.cwd(), configFile), logFile, logSize, logSince, stop};
}

function crc32(buf) {
    let c;
    const table = crc32.t || (crc32.t = Array.from({length: 256}, (_, n) => {
        c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    }));
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

/** A real PNG of w×h pixels; `random` pixels stored uncompressed make it about w·h·3 bytes. */
function png(w, h, random) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        const o = y * (w * 3 + 1);
        for (let x = 0; x < w * 3; x++) raw[o + 1 + x] = random ? (Math.random() * 256) | 0 : (x * 7 + y * 3) & 0xff;
    }
    const idat = zlib.deflateSync(raw, {level: random ? 0 : 9});
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * The walk's pictures, written once into <dir>/files: a PNG of about 3 MB, a WEBP of about 3 MB
 * (the browser's own encoder, from a canvas of random pixels), a PNG of about 9 MB, a small PNG,
 * and a text file named ".png". `page` is any open page (the WEBP is made in it).
 */
async function makePictures(page, dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = (n) => path.join(d, n);
    const w = (n, make) => { if (!fs.existsSync(f(n))) fs.writeFileSync(f(n), make()); return f(n); };
    const files = {
        png3: w('photo-3mb.png', () => png(1100, 950, true)),
        png9: w('photo-9mb.png', () => png(1800, 1700, true)),
        small: w('photo-small.png', () => png(120, 80, false)),
        fake: w('not-a-picture.png', () => Buffer.from('This is a text file, not a picture.\n')),
    };
    if (!fs.existsSync(f('photo-3mb.webp'))) {
        const b64 = await page.evaluate(() => {
            for (const [cw, ch] of [[1400, 1000], [1600, 1200], [1900, 1400], [2200, 1600]]) {
                const c = document.createElement('canvas');
                c.width = cw; c.height = ch;
                const x = c.getContext('2d');
                const img = x.createImageData(cw, ch);
                for (let i = 0; i < img.data.length; i++) img.data[i] = (i % 4 === 3) ? 255 : (Math.random() * 256) | 0;
                x.putImageData(img, 0, 0);
                const out = c.toDataURL('image/webp', 1).split(',')[1];
                if (out.length * 0.75 > 2.6 * 1024 * 1024) return out;
            }
            return null;
        });
        if (!b64) throw new Error('could not make a WEBP over 2.6 MB');
        fs.writeFileSync(f('photo-3mb.webp'), Buffer.from(b64, 'base64'));
    }
    files.webp3 = f('photo-3mb.webp');
    for (const k of Object.keys(files)) files[k] = {path: files[k], kb: Math.round(fs.statSync(files[k]).size / 1024)};
    return files;
}

/**
 * Steps 2 to 5: Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page", the
 * "Content" box's "Insert/edit image". Returns the picture window (CustomContentPages ImageWindow).
 */
async function openPictureWindow(page, origin, contextPath) {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const {CustomPageWindow} = require('../../../pages/CustomContentPages.js');
    await page.goto(`${origin}/index.php/${contextPath}/en/management/settings/website#setup/navigationMenus`);
    const nav = new NavigationTab(page, contextPath);
    await nav.itemsTable.waitFor({timeout: T});
    await idle(page);
    const item = await nav.addItem();
    await item.chooseType('Custom Page');
    await idle(page);
    const win = new CustomPageWindow(page);
    return win.content('en').openImageWindow();
}

/**
 * On the picture window's "Upload" tab, "Browse for an image" with `file`: the upload's request
 * and answer, then the small window over the picture window (its text), which is closed with "OK".
 */
async function uploadAndRead(page, win, file) {
    await win.openTab('Upload');
    const answered = page.waitForResponse((r) => /_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.fileInput.setInputFiles(file);
    const r = await answered;
    const body = await r.text().catch(() => null);
    let json = null;
    try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
    const shown = await win.alertOk.waitFor({timeout: 8000}).then(() => true).catch(() => false);
    const alert = shown ? flat(await win.alert.innerText()) : null;
    const source = shown ? null : await win.source.inputValue().catch(() => null);
    return {
        status: r.status(),
        error: json && json.error !== undefined ? json.error : null,
        url: json && json.url ? json.url.replace(/^https?:\/\/[^/]+/, '') : null,
        bodyHead: json ? null : flat(body, 200),
        alert,
        source: source ? source.replace(/^https?:\/\/[^/]+/, '') : source,
        settle: async () => { if (shown) await win.dismissAlert(); },
    };
}

module.exports = {T, sleep, flat, startDefaultLimitsServer, png, makePictures, openPictureWindow, uploadAndRead};
