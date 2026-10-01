// Issue report walk: docs/issues/U09-A16-picture-window-other-file-ignored-silently.md
// (spec U09 register A16). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Custom Block Manager" on Settings › Website ›
// "Plugins", opens "Manage Custom Blocks" › "Add Block", and in "Content"
// uses the toolbar's "Insert/edit image" › "Upload" › "Browse for an image"
// with a ".pdf", an ".svg" and a ".heic" file, then drops the ".pdf" on
// "Drop an image here"; the control is a real ".bmp", which the editor passes
// to the site and the site refuses with its types message. Step numbers are
// the report's. The kit builds nothing on the install; the files are made on
// this machine (the ".heic" carries only a HEIC file header: the editor reads
// the file's name alone, and nothing reaches the server).
// Records every screen with screen(), each upload request's status and
// answer, the windows TinyMCE shows (the picture window and any message over
// it), the tab the picture window is on and what "Content" holds afterwards.
//
// `settings` as the script's argument takes the Steps' second group instead:
// Settings › Website › "Appearance" › "Setup", the "Page Footer" box (the
// other editor, built in ui-library), the ".pdf" through "Browse for an
// image", then a 20 KB PNG, which must go in with or without the fix.
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead: a 20 KB PNG must still upload and go into "Content", the ".bmp"
// must still reach the site and get its message, and a ".pdf" chosen
// together with the PNG (both at once, by dropping) must still upload the PNG
// with no message, since the editor takes the first picture of a drop.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a16 node bin/probe.js all shared/playwright/checks/issues/picture-window-other-file-ignored-silently/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a16 node bin/probe.js all shared/playwright/checks/issues/picture-window-other-file-ignored-silently/walk.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, screen, record, idle, loc, outDir} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const SETTINGS = process.argv.includes('settings');
const PART = NEIGHBOUR ? '-nb' : SETTINGS ? '-settings' : '';

// --- the files (made here, not on the install)
function crc32(buf) {
    let c;
    const table = crc32.t || (crc32.t = Array.from({length: 256}, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = (x * 5 + y * 3) & 0xff;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function bmp(w, h) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const b = Buffer.alloc(size);
    b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
    b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28);
    b.writeUInt32LE(row * h, 34);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = 54 + y * row + x * 3; b[o] = (x * 7) & 0xff; b[o + 1] = (y * 5) & 0xff; b[o + 2] = 128; }
    return b;
}
const PDF = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#3a7"/><circle cx="60" cy="40" r="25" fill="#fff"/></svg>\n';
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.from([0, 0, 0, 0]), Buffer.from('mif1heic'), Buffer.alloc(64)]);
const filesDir = () => { const d = path.join(outDir(), 'files'); fs.mkdirSync(d, {recursive: true}); return d; };

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : SETTINGS ? 'settings' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };

    // Every installed site has `<public_files_dir>/site` (PKPInstall::getCreateDirectories());
    // a fleet loaded from the dataset lacks it. Only the uploads that reach the
    // server (the control, the neighbour) need it. Make it as the installer does.
    const publicSite = path.resolve(__dirname, '../../../../..', app.root, `public-ds${app.dataset}`, 'site');
    facts.publicSiteMade = !fs.existsSync(publicSite);
    fs.mkdirSync(publicSite, {recursive: true});

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${PART}`, {...s, ...extra}); return s; };

    const dir = filesDir();
    const f = (name) => path.join(dir, name);
    const make = {
        'doc-u09a16.pdf': () => PDF, 'drawing-u09a16.svg': () => SVG, 'photo-u09a16.heic': () => HEIC,
        'photo-u09a16.bmp': () => bmp(160, 100), 'small-u09a16.png': () => png(120, 80),
    };
    for (const [name, mk] of Object.entries(make)) if (!fs.existsSync(f(name))) fs.writeFileSync(f(name), mk());

    // [how, files]: 'browse' sets the hidden input behind "Browse for an image";
    // 'drop' drops the files on "Drop an image here".
    const tries = SETTINGS
        ? [['browse', ['doc-u09a16.pdf']], ['browse', ['small-u09a16.png']]]
        : NEIGHBOUR
        ? [['browse', ['small-u09a16.png']], ['browse', ['photo-u09a16.bmp']], ['drop', ['doc-u09a16.pdf', 'small-u09a16.png']]]
        : [['browse', ['doc-u09a16.pdf']], ['browse', ['drawing-u09a16.svg']], ['browse', ['photo-u09a16.heic']], ['drop', ['doc-u09a16.pdf']], ['browse', ['photo-u09a16.bmp']]];

    // 1. Sign in as rvaca
    await signIn(page, 'rvaca');

    let taId;
    if (SETTINGS) {
        // Settings group, 2. Settings › Website › "Appearance" › "Setup"; the "Page Footer" box
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        const setupTab = page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first();
        await loc(page, 'Website › Appearance: the "Setup" side tab', setupTab);
        await setupTab.click();
        await idle(page);
        await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => /pageFooter/.test(e.id) && e.initialized), null, {timeout: T});
        taId = await page.evaluate(() => window.tinymce.get().filter((e) => /pageFooter/.test(e.id))[0].id);
        await page.frameLocator(`[id="${taId}_ifr"]`).locator('body').click();
        await pause(500);
        await snap('page-footer-box');
    } else {
    // 2. Settings › Website › "Plugins"; 3. tick "Custom Block Manager"
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
    const s3 = await snap('plugins-ticked', {tick});
    fact('step3', {...tick, notices: s3.notices});

    // 4. the row's arrow, "Manage Custom Blocks", "Add Block"
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
    taId = await blockForm.locator('textarea[name^="blockContent"]').first().getAttribute('id');
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T});
    await pause(500);
    }
    fact('tinymce', await page.evaluate((x) => ({version: `${window.tinymce.majorVersion}.${window.tinymce.minorVersion}`, imagesFileTypes: window.tinymce.get(x).options.get('images_file_types')}), taId));
    if (!SETTINGS) await snap('add-block-window');

    const bar = page.locator(`[id="${taId}"] ~ .tox-tinymce`).first();
    const imgBtn = bar.getByRole('button', {name: /Insert\/edit image/i}).first();
    await loc(page, '"Content" toolbar: Insert/edit image', imgBtn);
    const imgDlg = page.locator('.tox-dialog:visible').first();

    const results = [];
    for (const [how, names] of tries) {
        const o = {how, files: names, kb: names.map((x) => Math.ceil(fs.statSync(f(x)).size / 1024))};
        // 5. "Insert/edit image", then "Upload"
        await imgBtn.click();
        await imgDlg.waitFor({timeout: T});
        await pause(400);
        const tab = imgDlg.getByRole('tab', {name: 'Upload'}).or(imgDlg.locator('.tox-dialog__body-nav-item').filter({hasText: 'Upload'})).first();
        await loc(page, 'Insert/Edit Image window: "Upload" tab', tab);
        await tab.click();
        await pause(400);
        const resps = [];
        const onResp = async (r) => {
            if (/_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST') {
                const body = await r.text().catch(() => '');
                resps.push({path: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(body, 400)});
            }
        };
        page.on('response', onResp);
        if (how === 'browse') {
            // 6. "Browse for an image", choose the file
            const input = imgDlg.locator('.tox-dropzone input[type="file"]').first();
            await loc(page, 'Upload tab: the file input behind "Browse for an image"', input);
            o.accept = await input.getAttribute('accept');
            await input.setInputFiles(names.map(f));
        } else {
            // 9. drop the file(s) on "Drop an image here"
            const zone = imgDlg.locator('.tox-dropzone').first();
            await loc(page, 'Upload tab: "Drop an image here"', zone);
            const payload = names.map((x) => ({name: x, b64: fs.readFileSync(f(x)).toString('base64'),
                type: {pdf: 'application/pdf', svg: 'image/svg+xml', heic: 'image/heic', bmp: 'image/bmp', png: 'image/png'}[x.split('.').pop()]}));
            const dt = await page.evaluateHandle((items) => {
                const d = new DataTransfer();
                for (const it of items) {
                    const bin = atob(it.b64); const u = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
                    d.items.add(new File([u], it.name, {type: it.type}));
                }
                return d;
            }, payload);
            await zone.dispatchEvent('dragenter', {dataTransfer: dt});
            await zone.dispatchEvent('dragover', {dataTransfer: dt});
            await zone.dispatchEvent('drop', {dataTransfer: dt});
        }
        const end = Date.now() + 6000;
        while (Date.now() < end && !resps.length) await pause(250);
        await pause(1800);
        page.off('response', onResp);
        o.requests = resps;
        o.windows = await page.locator('.tox-dialog:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
        o.activeTab = flat(await imgDlg.locator('.tox-dialog__body-nav-item--active').first().innerText().catch(() => null));
        o.source = await imgDlg.locator('input[type="url"]').first().inputValue().catch(() => null);
        const s = await snap(`${how}-${names.join('+').replace(/\./g, '-')}`, {attempt: o});
        o.notices = s.notices;
        // 7. close what is open: "OK" on a message, then "Save" when a picture
        // came back, else "Cancel"
        for (let i = 0; i < 4 && (await page.locator('.tox-dialog:visible').count()); i++) {
            const d = page.locator('.tox-dialog:visible').last();
            const isImg = (await d.locator('.tox-dropzone, input[type="url"]').count()) > 0;
            let btn;
            if (!isImg) btn = d.getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
            else if (o.source) btn = d.getByRole('button', {name: 'Save', exact: true}).first();
            else btn = d.getByRole('button', {name: 'Cancel', exact: true}).first();
            if (await btn.count()) await btn.click().catch(() => {}); else await page.keyboard.press('Escape');
            await pause(500);
        }
        o.content = flat(await page.evaluate((x) => window.tinymce.get(x).getContent(), taId).catch(() => null), 400);
        results.push(o);
        fact(`${how} ${names.join('+')}`, o);
    }
    fact('results', results);
    record(`facts${PART}`, facts);
    await close();
});
