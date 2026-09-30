// Issue report walk: docs/issues/U09-A18-picture-over-upload-limit-server-error.md
// (spec U09 register A18). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Custom Block Manager" on Settings › Website ›
// "Plugins", opens "Manage Custom Blocks" › "Add Block", and in "Content"
// uses the toolbar's "Insert/edit image" › "Upload" with three pictures over
// the install's upload limits (PHP defaults: 2 MB a file, 8 MB a request):
// a 2.5 MB PNG, a WebP over 2 MB and a 9 MB PNG. Step numbers are the
// report's. The 9 MB PNG (over post_max_size) is not in the report's Steps:
// it shows the other half of register A18, whose cause is
// docs/issues/U36-A21-upload-over-request-limit-server-error.md; the fix
// here leaves it failing. The kit builds nothing on the install; the picture files are
// made on this machine (random pixels, so their size is what is asked).
// Records every screen with screen(), each upload request's status and
// answer, the small window TinyMCE shows over the picture window, and the
// fleet's server log lines of the upload.
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead: in the same window a 20 KB PNG must still upload and go into
// "Content", and a text file named ".png" must still be refused with "The
// image you uploaded is not valid.".
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a18 node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a18 node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, screen, record, idle, loc, outDir} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

// --- the picture files (made here, not on the install)
function crc32(buf) {
    let c;
    const table = crc32.t || (crc32.t = Array.from({length: 256}, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, random) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = random ? (Math.random() * 256) | 0 : (x * 5 + y * 3) & 0xff;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: random ? 0 : 9})), chunk('IEND', Buffer.alloc(0))]);
}
const filesDir = () => { const d = path.join(outDir(), 'files'); fs.mkdirSync(d, {recursive: true}); return d; };
const kb = (f) => Math.ceil(fs.statSync(f).size / 1024);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /_uploadPublicFile|PHP |Fatal|Uncaught|Error|Warning/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    // Every installed site has `<public_files_dir>/site`: the installer makes it
    // (PKPInstall::getCreateDirectories()). The dataset's `public/` holds only
    // index.html (git keeps no empty directory), so a fleet loaded from it has
    // no `site/` and every picture upload answers "The public files directory
    // was not found…" before the code under test runs. Make it as the
    // installer does; nothing else.
    const publicSite = path.resolve(__dirname, '../../../../..', app.root, `public-ds${app.dataset}`, 'site');
    facts.publicSiteMade = !fs.existsSync(publicSite);
    fs.mkdirSync(publicSite, {recursive: true});

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${NEIGHBOUR ? '-nb' : ''}`, {...s, ...extra}); return s; };

    // the files
    const dir = filesDir();
    const f = (name) => path.join(dir, name);
    if (!fs.existsSync(f('photo-u09a18.png'))) fs.writeFileSync(f('photo-u09a18.png'), png(1100, 800, true));      // about 2.5 MB
    if (!fs.existsSync(f('poster-u09a18.png'))) fs.writeFileSync(f('poster-u09a18.png'), png(2000, 1550, true));   // about 9.1 MB
    if (!fs.existsSync(f('small-u09a18.png'))) fs.writeFileSync(f('small-u09a18.png'), png(120, 80, false));
    if (!fs.existsSync(f('not-a-picture-u09a18.png'))) fs.writeFileSync(f('not-a-picture-u09a18.png'), 'This is a text file, not a picture.\n');
    if (!fs.existsSync(f('photo-u09a18.webp'))) {
        // a WebP over 2 MB: random pixels through the browser's own encoder
        let side = 1100;
        for (let i = 0; i < 6; i++) {
            const b64 = await page.evaluate((s) => {
                const c = document.createElement('canvas'); c.width = s; c.height = s;
                const x = c.getContext('2d'); const d = x.createImageData(s, s);
                for (let k = 0; k < d.data.length; k++) d.data[k] = (k % 4 === 3) ? 255 : (Math.random() * 256) | 0;
                x.putImageData(d, 0, 0);
                return c.toDataURL('image/webp', 1).split(',')[1];
            }, side);
            const buf = Buffer.from(b64, 'base64');
            if (buf.length > 2.3 * 1024 * 1024 && buf.length < 7 * 1024 * 1024) { fs.writeFileSync(f('photo-u09a18.webp'), buf); break; }
            side = Math.round(side * Math.sqrt((3 * 1024 * 1024) / buf.length));
        }
    }
    const files = NEIGHBOUR
        ? ['small-u09a18.png', 'not-a-picture-u09a18.png']
        : ['photo-u09a18.png', 'photo-u09a18.webp', 'poster-u09a18.png'];
    fact('files', files.map((x) => ({name: x, kb: fs.existsSync(f(x)) ? kb(f(x)) : null})));

    // 1. Sign in as rvaca
    await signIn(page, 'rvaca');

    // 2. Settings › Website › "Plugins"; tick "Custom Block Manager"
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await idle(page);
    const pluginRow = page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
    await pluginRow.waitFor({timeout: T});
    await pause(500);
    const box = pluginRow.getByRole('checkbox').first();
    await loc(page, 'Plugins: the "Custom Block Manager" row\'s checkbox', box);
    const tick = {was: await box.isChecked()};
    if (!tick.was) {
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        await pause(800); await idle(page);
        tick.status = r ? r.status() : null;
        tick.now = await box.isChecked();
    }
    const s2 = await snap('plugins-ticked', {tick});
    fact('step2', {...tick, notices: s2.notices});

    // 3. the row's arrow, "Manage Custom Blocks", "Add Block"
    const rid = await pluginRow.getAttribute('id');
    const opener = pluginRow.locator('a.show_extras');
    if (await opener.count()) { await opener.first().click(); await pause(400); }
    const manage = page.locator(`[id="${rid}-control-row"]`).getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first();
    await loc(page, 'Plugins: "Manage Custom Blocks"', manage);
    await manage.click();
    const managerDialog = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();
    await managerDialog.waitFor({timeout: T});
    await idle(page);
    await managerDialog.getByRole('link', {name: 'Add Block', exact: true}).first().click();
    const blockForm = page.locator('form#customBlockForm:visible').first();
    await blockForm.waitFor({timeout: T});
    await idle(page);
    const taId = await blockForm.locator('textarea[name="blockContent[en]"]').first().getAttribute('id');
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T});
    await pause(500);
    await snap('add-block-window');

    const bar = page.locator(`[id="${taId}"] ~ .tox-tinymce`).first();
    const imgBtn = bar.getByRole('button', {name: /Insert\/edit image/i}).first();
    await loc(page, '"Content" toolbar: Insert/edit image', imgBtn);
    const imgDlg = page.locator('.tox-dialog:visible').first();

    const results = [];
    for (const name of files) {
        const o = {file: name, kb: kb(f(name))};
        // 4. "Insert/edit image", then "Upload"
        await imgBtn.click();
        await imgDlg.waitFor({timeout: T});
        await pause(400);
        const tab = imgDlg.getByRole('tab', {name: 'Upload'}).or(imgDlg.locator('.tox-dialog__body-nav-item').filter({hasText: 'Upload'})).first();
        await loc(page, 'Insert/Edit Image window: "Upload" tab', tab);
        await tab.click();
        await pause(400);
        // 5. choose the file ("Browse for an image")
        const resps = [];
        const onResp = async (r) => {
            if (/_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST') {
                const body = await r.text().catch(() => '');
                resps.push({method: 'POST', path: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(body, 400)});
            }
        };
        page.on('response', onResp);
        const from = logSize();
        const input = imgDlg.locator('input[type="file"]').first();
        await loc(page, 'Upload tab: the file input behind "Browse for an image"', input);
        await input.setInputFiles(f(name));
        const end = Date.now() + 15_000;
        while (Date.now() < end && !resps.length) await pause(250);
        await pause(1800);
        page.off('response', onResp);
        o.requests = resps;
        o.windows = await page.locator('.tox-dialog:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
        o.source = await imgDlg.locator('input[type="url"]').first().inputValue().catch(() => null);
        o.log = logSince(from);
        const s = await snap(`upload-${name.replace(/\./g, '-')}`, {upload: o});
        o.notices = s.notices;
        // 6. "OK" on the small window; the picture window then "Save" (a picture came back) or "Cancel"
        if (o.source) {
            await imgDlg.getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
            await pause(700);
        }
        for (let i = 0; i < 3 && (await page.locator('.tox-dialog:visible').count()); i++) {
            const d = page.locator('.tox-dialog:visible').last();
            const ok = d.getByRole('button', {name: /^(OK|Ok|Cancel|Close)$/}).first();
            if (await ok.count()) await ok.click().catch(() => {}); else await page.keyboard.press('Escape');
            await pause(400);
        }
        o.content = flat(await page.evaluate((x) => window.tinymce.get(x).getContent(), taId).catch(() => null), 400);
        results.push(o);
        fact(`upload ${name}`, o);
    }
    fact('results', results);
    record(`facts${NEIGHBOUR ? '-nb' : ''}`, facts);
    await close();
});
