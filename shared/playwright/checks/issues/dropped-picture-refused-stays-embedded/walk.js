// Issue report walk: docs/issues/U09-A17-dropped-picture-refused-stays-embedded.md
// (spec U09 register A17). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Custom Block Manager", adds the block "Pictures
// u09a17" and drops two files the site refuses into its "Content" (a real BMP
// picture, and a text file named ".png"), saves it, places it under "Sidebar"
// on Settings › Website › "Appearance" › "Setup", drops a 2.5 MB PNG photo
// (over the server's 2 MB file limit) into "Page Footer" there and saves,
// then opens the home page. Step numbers are the report's. A drop is the browser's own drop event on the editor's text, with
// the file in its DataTransfer, as a file dragged from the computer arrives.
// The kit builds nothing on the install; the files are made on this machine.
// Records every screen with screen(), each upload request's status and
// answer, the editor's notice, what each box holds after the refusal, and (for
// Evidence only) the stored block content and footer read with sql().
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead: a small real PNG dropped into "Content" and into "Page Footer" must
// still upload and keep its stored address, and the text file chosen through
// "Insert/edit image" › "Upload" must still be refused with nothing inserted.
//
// `nourl` as the argument drops the small PNG into a Vue box whose form has no
// upload address (Settings › Distribution › "License" › "License Terms"),
// saves, and records what the box and the stored setting hold.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a17 node bin/probe.js all shared/playwright/checks/issues/dropped-picture-refused-stays-embedded/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a17 node bin/probe.js all shared/playwright/checks/issues/dropped-picture-refused-stays-embedded/walk.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const NOURL = process.argv.includes('nourl');
const PART = NEIGHBOUR ? '-nb' : NOURL ? '-nourl' : '';

// --- the files (made here, not on the install)
function bmp(w, h) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const b = Buffer.alloc(size);
    b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
    b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22);
    b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const o = 54 + y * row + x * 3;
        b[o] = (x * 2) & 0xff; b[o + 1] = (y * 3) & 0xff; b[o + 2] = x < w / 2 ? 200 : 40;
    }
    return b;
}
function crc32(buf) {
    let c;
    const table = crc32.t || (crc32.t = Array.from({length: 256}, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let crc = 0xffffffff;
    for (const x of buf) crc = table[(crc ^ x) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, random = false) {
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
const FILES = {
    'diagram-u09a17.bmp': {type: 'image/bmp', data: () => bmp(120, 80)},
    'notes-u09a17.png': {type: 'image/png', data: () => Buffer.from('These are notes, not a picture.\n')},
    'small-u09a17.png': {type: 'image/png', data: () => png(120, 80)},
    'photo-u09a17.png': {type: 'image/png', data: (() => { let b; return () => (b = b || png(1100, 800, true)); })()},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : NOURL ? 'nourl' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const ct = app.contextTables;
    const ctxId = Number(sql(app, `SELECT ${ct.id} FROM ${ct.table} WHERE path = '${app.contextPath}'`));
    const website = `/index.php/${app.contextPath}/en/management/settings/website`;
    const appRoot = path.resolve(__dirname, '../../../../..', app.root);

    // Every installed site has `<public_files_dir>/site` (PKPInstall::getCreateDirectories());
    // the dataset's `public/` holds only index.html, so a fleet loaded from it lacks it.
    const publicSite = path.join(appRoot, `public-ds${app.dataset}`, 'site');
    facts.publicSiteMade = !fs.existsSync(publicSite);
    fs.mkdirSync(publicSite, {recursive: true});
    const storedPictures = () => { try { return fs.readdirSync(path.join(publicSite, 'images', 'rvaca')); } catch { return []; } };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${PART}`, {...s, ...extra}); return s; };

    // what an editor holds: each <img>'s address, shortened
    const imgs = (html) => [...String(html || '').matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => (m[1].startsWith('data:') ? `${m[1].slice(0, 30)}… (${m[1].length} chars)` : m[1].replace(/^https?:\/\/[^/]+/, '')));
    const editorHtml = (id) => page.evaluate((x) => (window.tinymce && window.tinymce.get(x) ? window.tinymce.get(x).getContent() : null), id);

    // a file dropped from the computer onto the editor's text
    const drop = async (editorId, name) => {
        const resps = [];
        const onResp = async (r) => {
            if (/_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST') {
                resps.push({path: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(await r.text().catch(() => ''), 300)});
            }
        };
        page.on('response', onResp);
        const frame = page.frameLocator(`[id="${editorId}_ifr"]`);
        const body = frame.locator('body');
        await body.click();
        await page.keyboard.press('End');
        const {type} = FILES[name];
        const b64 = FILES[name].data().toString('base64');
        await body.evaluate((el, [b, nm, tp]) => {
            const bin = atob(b); const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const dt = new DataTransfer();
            dt.items.add(new File([bytes], nm, {type: tp}));
            const r = el.getBoundingClientRect();
            const at = {bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.top + 10};
            el.dispatchEvent(new DragEvent('dragenter', at));
            el.dispatchEvent(new DragEvent('dragover', at));
            el.dispatchEvent(new DragEvent('drop', at));
        }, [b64, name, type]);
        const end = Date.now() + 15_000;
        while (Date.now() < end && !resps.length) await pause(250);
        await pause(1500);
        page.off('response', onResp);
        const notices = await page.locator('.tox-notification:visible').allInnerTexts().catch(() => []);
        const held = imgs(await editorHtml(editorId));
        return {file: name, requests: resps, editorNotice: notices.map((x) => flat(x, 200)), boxHolds: held};
    };
    const closeNotices = async () => {
        for (const b of await page.locator('.tox-notification:visible button[aria-label="Close"], .tox-notification:visible .tox-notification__dismiss').all()) await b.click().catch(() => {});
        await pause(300);
    };

    // ---- Settings › Website › "Plugins"
    const openPlugins = async () => {
        await page.goto(app.url(website));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        await page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first().waitFor({timeout: T});
        await pause(500);
    };
    const tickPlugin = async () => {
        const box = page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first().getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Custom Block Manager" row\'s checkbox', box);
        if (await box.isChecked()) return {already: true};
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        await pause(800); await idle(page);
        return {status: r ? r.status() : null, checked: await box.isChecked(), notices: (await screen(page)).notices};
    };
    const managerDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();
    const openAddBlock = async () => {
        const row = page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        if (await opener.count()) { await opener.first().click(); await pause(400); }
        await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first().click();
        await managerDialog().waitFor({timeout: T});
        await idle(page);
        await managerDialog().getByRole('link', {name: 'Add Block', exact: true}).first().click();
        const form = page.locator('form#customBlockForm:visible').first();
        await form.waitFor({timeout: T});
        await idle(page);
        const taId = await form.locator('textarea[name="blockContent[en]"]').first().getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T});
        await pause(500);
        return {form, taId};
    };
    const saveBlock = async (form) => {
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await form.locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w;
        await pause(1200); await idle(page);
        return {status: r ? r.status() : null};
    };

    // ---- Settings › Website › "Appearance" › "Setup"
    const setupForm = () => page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
    const openSetup = async () => {
        await page.goto(app.url(website));
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(page);
        await setupForm().waitFor({timeout: T});
        await pause(800);
    };
    const footerId = async () => {
        const id = await setupForm().locator('textarea[id*="pageFooter"][id$="-en"]').first().getAttribute('id', {timeout: T});
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
        return id;
    };
    const saveSetup = async () => {
        const form = setupForm();
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await loc(page, 'Appearance › Setup: Save', form.getByRole('button', {name: 'Save', exact: true}));
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await pause(1200); await idle(page);
        return {status: r ? r.status() : null};
    };

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                                   // 1
        await openPlugins();                                                                          // 2
        fact('step2-tick', await tickPlugin());
        if (NOURL) {
            // a Vue box whose form passes no upload address
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
            await idle(page);
            await page.getByRole('tab', {name: 'License', exact: true}).first().click().catch(() => {});
            await idle(page); await pause(800);
            const lf = page.locator('form').filter({has: page.locator('textarea[id*="licenseTerms"]')}).first();
            const lid = await lf.locator('textarea[id*="licenseTerms"][id$="-en"]').first().getAttribute('id', {timeout: T});
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), lid, {timeout: T});
            const d = await drop(lid, 'small-u09a17.png');
            await snap('license-terms-dropped', {d});
            fact('nourl-drop', d);
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await lf.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            await pause(1200); await idle(page);
            await snap('license-terms-saved');
            fact('nourl-save', {status: r ? r.status() : null});
            fact('nourl-stored', sql(app, `SELECT locale, length(setting_value), substr(setting_value, 1, 120) FROM ${ct.settings} WHERE ${ct.id} = ${ctxId} AND setting_name = 'licenseTerms'`));
            fact('stored-pictures', storedPictures());
            return;
        }
        const {form, taId} = await openAddBlock();                                                    // 3
        if (!NEIGHBOUR) {
            await form.locator('input[name="blockTitle[en]"]').first().fill('Pictures u09a17');       // 4
            const d5 = await drop(taId, 'diagram-u09a17.bmp');                                        // 5
            await snap('step5-bmp-dropped', {d5});
            fact('step5', d5);
            await closeNotices();
            const d6 = await drop(taId, 'notes-u09a17.png');                                          // 6
            await snap('step6-text-file-dropped', {d6});
            fact('step6', d6);
            await closeNotices();
            fact('step7-save', await saveBlock(form));                                                // 7
            await snap('step7-block-saved');
            fact('stored-block-content', sql(app, `SELECT plugin_name, length(setting_value), substr(setting_value, 1, 160) FROM plugin_settings WHERE context_id = ${ctxId} AND setting_name = 'blockContent'`));
            fact('stored-pictures', storedPictures());

            await openSetup();                                                                        // 8
            const list = await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
            const block = list.find((o) => /u09a17/i.test(o.value + o.label));
            fact('step8-sidebar-item', block || list);
            if (block) await page.locator(`input[name="sidebar"][value="${block.value}"]`).first().check();
            fact('step8-save', await saveSetup());
            await openSetup();
            const fid = await footerId();                                                             // 9
            const d9 = await drop(fid, 'photo-u09a17.png');
            await snap('step9-footer-photo-dropped', {d9});
            fact('step9', d9);
            await closeNotices();
            fact('step9-save', await saveSetup());
            fact('stored-footer', sql(app, `SELECT locale, length(setting_value), substr(setting_value, 1, 120) FROM ${ct.settings} WHERE ${ct.id} = ${ctxId} AND setting_name = 'pageFooter'`));
            fact('stored-pictures-after-footer', storedPictures());

            await page.goto(app.url(`/index.php/${app.contextPath}/en`));                             // 10
            await idle(page);
            await pause(1000);
            const pub = await page.evaluate(() => {
                const pic = (el) => ({src: el.getAttribute('src').startsWith('data:') ? el.getAttribute('src').slice(0, 30) + '…' : el.getAttribute('src'), shown: el.complete && el.naturalWidth > 0, w: el.naturalWidth, h: el.naturalHeight});
                const side = document.querySelector('.pkp_structure_sidebar');
                const foot = document.querySelector('.pkp_structure_footer, .pkp_footer_content');
                return {
                    sidebarBlock: side ? [...side.querySelectorAll('.pkp_block')].filter((b) => b.querySelector('img[src^="data:"]') || /u09a17/i.test(b.className + b.innerText)).map((b) => ({cls: b.className, text: b.innerText.trim().slice(0, 80), pictures: [...b.querySelectorAll('img')].map(pic)})) : '(no sidebar)',
                    footerPictures: foot ? [...foot.querySelectorAll('img')].map(pic) : '(no footer)',
                    pageKB: Math.round(document.documentElement.outerHTML.length / 1024),
                };
            });
            await snap('step10-home-page', {pub});
            fact('step10-public', pub);
        } else {
            const n1 = await drop(taId, 'small-u09a17.png');
            await snap('nb-block-small-png', {n1});
            fact('nb-block-small-png', n1);
            await closeNotices();
            // "Insert/edit image" › "Upload" with the text file
            const bar = page.locator(`[id="${taId}"] ~ .tox-tinymce`).first();
            const imgBtn = bar.getByRole('button', {name: /Insert\/edit image/i}).first();
            await loc(page, '"Content" toolbar: Insert/edit image', imgBtn);
            await imgBtn.click();
            const dlg = page.locator('.tox-dialog:visible').first();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('tab', {name: 'Upload'}).or(dlg.locator('.tox-dialog__body-nav-item').filter({hasText: 'Upload'})).first().click();
            await pause(400);
            const resps = [];
            const onResp = async (r) => { if (/_uploadPublicFile/.test(r.url())) resps.push({status: r.status(), body: flat(await r.text().catch(() => ''), 300)}); };
            page.on('response', onResp);
            const dir = path.join(require('os').tmpdir(), 'u09a17'); fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(path.join(dir, 'notes-u09a17.png'), FILES['notes-u09a17.png'].data());
            await dlg.locator('input[type="file"]').first().setInputFiles(path.join(dir, 'notes-u09a17.png'));
            const end = Date.now() + 15_000;
            while (Date.now() < end && !resps.length) await pause(250);
            await pause(1500);
            page.off('response', onResp);
            const windows = await page.locator('.tox-dialog:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)));
            await snap('nb-upload-tab-text-file', {resps, windows});
            for (let i = 0; i < 3 && (await page.locator('.tox-dialog:visible').count()); i++) {
                const d = page.locator('.tox-dialog:visible').last();
                const b = d.getByRole('button', {name: /^(OK|Ok|Cancel|Close)$/}).first();
                if (await b.count()) await b.click().catch(() => {}); else await page.keyboard.press('Escape');
                await pause(400);
            }
            fact('nb-upload-tab-text-file', {requests: resps, windows, boxHolds: imgs(await editorHtml(taId))});
            await openSetup();
            const fid = await footerId();
            const n2 = await drop(fid, 'small-u09a17.png');
            await snap('nb-footer-small-png', {n2});
            fact('nb-footer-small-png', n2);
            fact('stored-pictures', storedPictures());
        }
    } finally {
        record(`facts${PART}`, facts);
        await close();
    }
});
