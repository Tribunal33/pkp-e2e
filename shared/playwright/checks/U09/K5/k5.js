const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U09 claim check, chunk K5: formatted text and pictures, leaving the windows
// unsaved, side effects. All three apps (the static page window on OJS and OMP).
// Spec: docs/specs/U09-custom-pages-and-blocks.md lines 258–318 (Rules 28–30,
// Side effects), 349–351 (Settings 7), register A5; footnotes f, g, i, j, k,
// td17, td28–td31, f-a5.
//
// Seeds per app (scratch, tag prefix u09k5; state file k5-state-<app>.json in
// the output folder; RESEED=1 makes new ones):
//   A  en only; "Custom Block Manager" on (harness key), "Static Pages Plugin"
//      on (OJS, OMP). Users m1 (manager: tags, uploads, leaving), m2 (manager:
//      the allowance), m3 (manager: side effects).
//   B  en only; m2 again (the allowance across journals).
//   D  en only, both plugins on; user dm (manager). Deleted on Hosted
//      Journals by the `cascade` phase.
// Phases (PHASES=a,b; default all, in this order), one app per process:
//   tags      Rule 28 (td28): "Insert Tag" in the three windows; a block and a
//             static page carrying "{$contactName}" typed as text, on the public side
//   upload    Rule 29, 29b, A5 (td29, td30): the image window's tabs, "Upload",
//             accepted and refused files, the stored names, the saved block on
//             the public side, paste and drop, the item and static page windows,
//             a Vue box (Appearance › Setup "Page Footer"), the site's own box
//   allowance Rule 29a, Settings 7 (td31): three 1.9 MB pictures, one taken out
//             of its text, the same account in journal B
//   leave     Rule 30 (td17): the three windows left with a change unsaved
//             (close control, "Cancel", Escape, another address), each answer
//   side      Side effects: add, edit, delete a static page and a custom block;
//             mail, notifications, tasks, event log before and after
//   cascade   Side effects: journal D deleted on Hosted Journals (admin)
// Run: PROBE_FEATURE=U09 PROBE_AGENT=ccK5 node bin/probe.js <app|all> shared/playwright/checks/U09/K5/k5.js
//      PHASES=upload,allowance … to run some phases on the existing seeds.
//      K5_TAG=<prefix> changes the scratch tag prefix (the K5b re-drive,
//      checks/U09/K5b/k5b.js, uses u09k5b and phases upload,allowance,cascade).
// Since 2026-09-24 (K5b) the upload phase also drives a text file named
// ".gif"/".jpg", a ".bmp", a second "Test Image_1.png" with other content, a
// refused paste, an upload left by "Cancel", a saved Vue footer; the
// allowance phase a custom page deleted in B.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {execSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');
const H = require('../K1/lib');

const TAG = process.env.K5_TAG || 'u09k5';
const ALL = ['tags', 'upload', 'allowance', 'leave', 'side', 'cascade'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const REPO = path.resolve(__dirname, '../../../../..');
const psql = (app, sql) => { try { return execSync(`PGPASSWORD=e2e psql -h 127.0.0.1 -U e2e ${dbName(app.name)} -At -c "${sql.replace(/"/g, '\\"')}"`, {encoding: 'utf8'}).trim(); } catch (e) { return `psql failed: ${String(e.message).split('\n')[0]}`; } };
const imagesDir = (app, user) => path.join(REPO, 'checkouts', app.name, 'public', 'site', 'images', user);
const md5 = (file) => require('crypto').createHash('md5').update(fs.readFileSync(file)).digest('hex');
const listDir = (dir) => { try { return fs.readdirSync(dir).map((f) => ({name: f, kb: Math.ceil(fs.statSync(path.join(dir, f)).size / 1024), bytes: fs.statSync(path.join(dir, f)).size, md5: md5(path.join(dir, f))})); } catch { return []; } };
/** a 24-bit BMP of w×h */
function bmp(w, h) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const b = Buffer.alloc(size);
    b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14);
    b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = 54 + y * row + x * 3; b[o] = 200; b[o + 1] = (x * 5) & 0xff; b[o + 2] = (y * 7) & 0xff; }
    return b;
}

// ---- files ---------------------------------------------------------------
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
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        const o = y * (w * 3 + 1);
        raw[o] = 0;
        for (let x = 0; x < w * 3; x++) raw[o + 1 + x] = random ? (Math.random() * 256) | 0 : (x * 7 + y * 3) & 0xff;
    }
    const idat = zlib.deflateSync(raw, {level: random ? 0 : 9});
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/** Writes the test files into <out>/files once; JPEG and WEBP come from the browser's canvas. */
async function makeFiles(page) {
    const dir = path.join(outDir(), 'files');
    fs.mkdirSync(dir, {recursive: true});
    const f = (name) => path.join(dir, name);
    const small = png(120, 80, false);
    const w = (name, buf) => { if (!fs.existsSync(f(name))) fs.writeFileSync(f(name), buf); return f(name); };
    let jpeg = fs.existsSync(f('photo.jpg')) ? fs.readFileSync(f('photo.jpg')) : null;
    let webp = fs.existsSync(f('photo.webp')) ? fs.readFileSync(f('photo.webp')) : null;
    if (!jpeg || !webp) {
        await page.goto('about:blank');
        const out = await page.evaluate(() => {
            const c = document.createElement('canvas'); c.width = 120; c.height = 80;
            const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 120, 80); x.fillStyle = '#33c'; x.fillRect(20, 20, 60, 30);
            return {jpeg: c.toDataURL('image/jpeg', 0.9).split(',')[1], webp: c.toDataURL('image/webp', 0.9).split(',')[1]};
        });
        jpeg = Buffer.from(out.jpeg, 'base64'); webp = Buffer.from(out.webp, 'base64');
    }
    const text = Buffer.from('This is a text file, not a picture.\n');
    const files = {
        testImage: w('Test Image_1.png', small),
        pdf: fs.existsSync(f('doc.pdf')) ? f('doc.pdf') : (fs.copyFileSync(path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'), f('doc.pdf')), f('doc.pdf')),
        jpeg: w('photo.jpeg', jpeg),
        jpg: w('photo.jpg', jpeg),
        gif: w('photo.gif', GIF),
        webp: w('photo.webp', webp),
        fakePng: w('fake.png', text),
        renamedJpg: w('renamed.jpg', small),
        svg: w('drawing.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')),
        oddName: w('Photo (1)_ä:x.PNG', small),
        onlyDropped: w('ü.png', small),
        pastePng: w('pasted.png', small),
        fakeGif: w('fake.gif', text),
        fakeJpg: w('fake.jpg', text),
        bmp: w('photo.bmp', bmp(60, 40)),
        cancelled: w('cancelled.png', png(70, 50, false)),
    };
    // the same name as "Test Image_1.png", other content
    fs.mkdirSync(path.join(dir, 'v2'), {recursive: true});
    files.testImageV2 = w('v2/Test Image_1.png', png(90, 60, false));
    // 1000×650 random pixels, stored: about 1905 KB, under the probe servers' 2 MB upload_max_filesize
    for (const n of ['big1.png', 'big2.png', 'big3.png', 'big4.png']) if (!fs.existsSync(f(n))) fs.writeFileSync(f(n), png(1000, 650, true));
    files.big = ['big1.png', 'big2.png', 'big3.png', 'big4.png'].map(f);
    files.over2m = fs.existsSync(f('over-2mb.png')) ? f('over-2mb.png') : (fs.writeFileSync(f('over-2mb.png'), png(1000, 850, true)), f('over-2mb.png'));
    files.overPost = fs.existsSync(f('over-8mb.png')) ? f('over-8mb.png') : (fs.writeFileSync(f('over-8mb.png'), png(1800, 1700, true)), f('over-8mb.png'));
    return files;
}

forEachApp(async (app) => {
    const hasStatic = app.name !== 'ops';
    const ctxUrl = (ctx, p = '', locale = 'en') => app.url(`/index.php/${ctx}${locale ? '/' + locale : ''}${p}`);
    const log = (...a) => console.log(`[k5 ${app.name}]`, ...a);
    const stateFile = path.join(outDir(), `k5-state-${app.name}.json`);
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 900)); };

    // ---- seed -------------------------------------------------------------
    let st = fs.existsSync(stateFile) && !process.env.RESEED ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
    if (!st) {
        const t = tag(TAG);
        const plugins = {customblockmanagerplugin: {enabled: true}, ...(hasStatic ? {staticpagesplugin: {enabled: true}} : {})};
        const A = `${t}a`;
        const B = `${t}b`;
        const D = `${t}d`;
        const ra = await app.api.createContext({tag: A, context: {name: `U09 K5 A ${A}`, acronym: 'K5A'}, plugins,
            users: [{username: `${A}m1`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'}, {username: `${A}m2`, roles: ['manager']}, {username: `${A}m3`, roles: ['manager']}]});
        const rb = await app.api.createContext({tag: B, context: {name: `U09 K5 B ${B}`, acronym: 'K5B'}, users: [{username: `${A}m2`, roles: ['manager']}]});
        const rd = await app.api.createContext({tag: D, context: {name: `U09 K5 D ${D}`, acronym: 'K5D'}, plugins, users: [{username: `${D}dm`, roles: ['manager']}]});
        const id = (r) => (r && (r.id || r.contextId || (r.context && r.context.id))) || null;
        st = {t, A, B, D, ids: {A: id(ra), B: id(rb), D: id(rd)}, m1: `${A}m1`, m2: `${A}m2`, m3: `${A}m3`, dm: `${D}dm`};
        fs.writeFileSync(stateFile, JSON.stringify(st, null, 2));
        fact('seed', {st, responses: {A: ra, B: rb, D: rd}});
    }
    const {A, B} = st;

    const M = await launch(app);
    const V = await launch(app);
    const page = M.page;
    const vis = V.page;
    // every browser question is recorded and answered from a queue (default: accept)
    const asked = [];
    const answers = [];
    let stepName = '';
    page.on('dialog', async (d) => {
        const ans = d.type() === 'beforeunload' ? (answers.length ? answers.shift() : 'accept') : (answers.length ? answers.shift() : 'accept');
        asked.push({step: stepName, type: d.type(), message: d.message(), answer: ans});
        await (ans === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    vis.on('dialog', async (d) => { asked.push({step: `visitor ${stepName}`, type: d.type(), message: d.message(), answer: 'accept'}); await d.accept().catch(() => {}); });
    const askedSince = (n) => asked.slice(n);
    const answerNext = (a) => { answers.length = 0; answers.push(a); };

    const snap = async (p, name, extra = {}) => {
        const s = await screen(p).catch((e) => ({error: String(e.message || e)}));
        record(name, {...s, ...extra});
        await shot(p, name).catch(() => {});
        return s;
    };
    const STEPS = process.env.STEPS ? process.env.STEPS.split(',') : null;
    const step = async (name, fn) => {
        if (STEPS && !STEPS.includes(name)) return null;
        stepName = name;
        answers.length = 0;
        log(`-- ${name}`);
        try { return await fn(); } catch (e) {
            fact(`ERROR-${name}`, String(e.stack || e).slice(0, 900));
            await shot(page, `error-${name}`).catch(() => {});
            if (process.env.STOP === '1') throw e;
            return null;
        }
    };
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page); };
    const toasts = async (p = page) => (await p.locator('.pkpNotification, .pkp_notification, [role="alert"], .pkpToast, [class*="toast"], [class*="Notification"], .ui-pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);

    const files = await makeFiles(page);

    // ---- Settings › Website ------------------------------------------------
    const openWebsite = async (ctx, top) => {
        await page.goto('about:blank');
        await page.goto(ctx === 'index' ? app.url('/index.php/index/en/admin/settings') : ctxUrl(ctx, '/management/settings/website'));
        await idle(page);
        if (top) { await page.locator(`#${top}-button`).first().click(); await idle(page); await sleep(700); }
    };
    const rowControls = async (row) => {
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        if (await opener.count()) { await opener.first().click(); await sleep(400); }
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
        return {id, links, ctl};
    };

    // ---- TinyMCE -------------------------------------------------------------
    const mceBar = (taId) => page.locator(`[id="${taId}"] ~ .tox-tinymce`).first();
    const mceReady = async (taId) => page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), taId, {timeout: T}).catch(() => {});
    const mceGet = async (taId) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), taId).catch(() => null);
    const mceBody = (taId) => page.frameLocator(`[id="${taId}_ifr"]`).locator('body');
    const mceType = async (taId, text, {clear = false} = {}) => {
        await mceReady(taId);
        await mceBody(taId).click();
        if (clear) { await page.keyboard.press('Control+a'); await page.keyboard.press('Delete'); }
        await page.keyboard.press('Control+End');
        if (text) await page.keyboard.type(text);
        await sleep(200);
        return mceGet(taId);
    };
    const barButtons = async (taId) => mceBar(taId).locator('.tox-editor-header button, .tox-editor-header [role="button"]').evaluateAll((els) => els.map((b) => b.getAttribute('aria-label') || b.title || b.innerText.trim()).filter(Boolean)).catch(() => []);
    const tagMenu = async (taId) => {
        const btn = mceBar(taId).getByRole('button', {name: 'Insert Tag'});
        const present = await btn.count();
        if (!present) return {present: 0, items: null};
        await btn.click();
        await sleep(700);
        const items = (await page.locator('.tox-menu:visible .tox-collection__item, .tox-menu:visible [role="menuitem"]').allInnerTexts().catch(() => [])).map((s) => flat(s));
        const menuText = flat(await page.locator('.tox-menu:visible, .tox-collection:visible').first().innerText().catch(() => ''), 600);
        return {present, items, menuText};
    };
    const closeMenu = async (taId) => { await mceBody(taId).click({position: {x: 5, y: 5}}).catch(() => {}); await sleep(300); };

    // the image window
    const imgDlg = () => page.locator('.tox-dialog:visible').first();
    const imgDlgState = async () => {
        const d = imgDlg();
        if (!(await d.count())) return {open: false};
        return d.evaluate((root) => {
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return {
                open: true,
                title: txt(root.querySelector('.tox-dialog__title')),
                tabs: [...root.querySelectorAll('[role="tab"], .tox-dialog__body-nav-item')].map((t) => `${txt(t)}${t.getAttribute('aria-selected') === 'true' || t.classList.contains('tox-dialog__body-nav-item--active') ? ' [selected]' : ''}`),
                labels: [...root.querySelectorAll('label')].filter(vis).map(txt).filter(Boolean),
                inputs: [...root.querySelectorAll('input, textarea')].map((i) => ({type: i.type, value: i.type === 'file' ? null : (i.value || '').slice(0, 200), label: i.getAttribute('aria-label') || (i.labels && i.labels[0] ? txt(i.labels[0]) : null), visible: vis(i), accept: i.getAttribute('accept')})),
                buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label') || b.title).filter(Boolean),
                text: txt(root).slice(0, 800),
            };
        });
    };
    const notices = async () => (await page.locator('.tox-notification:visible, .tox-notifications-container:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 400)).filter(Boolean);
    const openImageDialog = async (taId) => {
        await mceBar(taId).getByRole('button', {name: /Insert\/edit image/i}).first().click();
        await imgDlg().waitFor({timeout: T});
        await sleep(400);
        return imgDlgState();
    };
    const closeImageDialog = async () => {
        const d = imgDlg();
        if (await d.count()) { await d.getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => d.getByRole('button', {name: 'Close'}).first().click().catch(() => {})); await sleep(400); }
    };
    /** "Insert/edit image" › "Upload" › the file; returns what the app answered and showed. Inserts the picture when the window filled a source. */
    const uploadInDialog = async (taId, file, name, {insert = true} = {}) => {
        const n0 = asked.length;
        const opened = await openImageDialog(taId);
        const tab = imgDlg().getByRole('tab', {name: 'Upload'}).or(imgDlg().locator('.tox-dialog__body-nav-item').filter({hasText: 'Upload'})).first();
        let uploadTab = null;
        if (await tab.count()) { await tab.click(); await sleep(400); uploadTab = await imgDlgState(); }
        const resps = [];
        const onResp = async (r) => { if (/_uploadPublicFile/.test(r.url())) { const body = await r.text().catch(() => ''); resps.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), body: body.slice(0, 400)}); } };
        page.on('response', onResp);
        const input = imgDlg().locator('input[type="file"]').first();
        const hasInput = await input.count();
        if (hasInput) await input.setInputFiles(file);
        const end = Date.now() + 12_000;
        while (Date.now() < end && !resps.length) await sleep(250);
        await sleep(1800);
        page.off('response', onResp);
        const after = await imgDlgState();
        const nts = await notices();
        const alertDlgs = await page.locator('.tox-dialog:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
        let s = null;
        if (name) s = await snap(page, name);
        const source = (after.inputs || []).find((i) => /Source/i.test(i.label || '') || i.type === 'url');
        let inserted = null;
        if (insert && source && source.value && after.open) {
            await imgDlg().getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
            await sleep(700);
            inserted = await mceGet(taId);
        }
        // a second window (TinyMCE's alert) or the image window may still be open
        for (let i = 0; i < 3 && (await page.locator('.tox-dialog:visible').count()); i++) {
            const d = page.locator('.tox-dialog:visible').last();
            const ok = d.getByRole('button', {name: /^(OK|Ok|Close|Cancel)$/}).first();
            if (await ok.count()) await ok.click().catch(() => {}); else await page.keyboard.press('Escape');
            await sleep(400);
        }
        return {file: path.basename(file), kb: Math.ceil(fs.statSync(file).size / 1024), dialog: {title: opened.title, tabs: opened.tabs}, uploadTab: uploadTab ? {tabs: uploadTab.tabs, labels: uploadTab.labels, buttons: uploadTab.buttons, text: uploadTab.text, fileInputs: (uploadTab.inputs || []).filter((i) => i.type === 'file')} : null,
            hasInput, requests: resps, after: {tabs: after.tabs, source: source ? source.value : null, text: after.text}, notices: nts, tinyAlerts: alertDlgs, browserDialogs: askedSince(n0), inserted: inserted ? flat(inserted, 600) : null};
    };
    /** paste or drop a picture into the box through the browser's own events */
    const pasteOrDrop = async (taId, file, how) => {
        await mceReady(taId);
        await mceBody(taId).click();
        await page.keyboard.press('Control+End');
        const b64 = fs.readFileSync(file).toString('base64');
        const resps = [];
        const onResp = async (r) => { if (/_uploadPublicFile/.test(r.url())) { const body = await r.text().catch(() => ''); resps.push({status: r.status(), body: body.slice(0, 400)}); } };
        page.on('response', onResp);
        const frame = page.frame({url: /about:blank|^$/}) || null;
        const fh = await page.locator(`[id="${taId}_ifr"]`).elementHandle();
        const fr = await fh.contentFrame();
        await fr.evaluate(({b64, name, how}) => {
            const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const f = new File([arr], name, {type: 'image/png'});
            const dt = new DataTransfer(); dt.items.add(f);
            const body = document.body;
            if (how === 'paste') body.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
            else {
                const r = body.getBoundingClientRect();
                const opts = {dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 20};
                body.dispatchEvent(new DragEvent('dragenter', opts)); body.dispatchEvent(new DragEvent('dragover', opts)); body.dispatchEvent(new DragEvent('drop', opts));
            }
        }, {b64, name: path.basename(file), how});
        const end = Date.now() + 10_000;
        while (Date.now() < end && !resps.length) await sleep(250);
        await sleep(1500);
        page.off('response', onResp);
        void frame;
        return {how, requests: resps, content: flat(await mceGet(taId), 600), notices: await notices()};
    };

    // ---- the custom page item window (K1 lib) --------------------------------
    const itemContentId = async () => H.itemWindow(page).locator('textarea[name="content[en]"]').getAttribute('id');

    // ---- the static page window (K2) ------------------------------------------
    const spWin = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
    const openStaticTab = async (ctx) => {
        await openWebsite(ctx, 'staticPages');
        await page.locator('#staticPageGridContainer .pkp_controllers_grid').first().waitFor({timeout: T});
        await idle(page); await sleep(400);
    };
    const staticRows = async () => page.locator('#staticPageGridContainer tr.gridRow').evaluateAll((els) => els.map((tr) => ({id: tr.id, text: tr.innerText.replace(/\s+/g, ' ').trim()})));
    const waitSpWin = async () => {
        await page.locator('form#staticPageForm textarea[name^="content"]').first().waitFor({state: 'attached', timeout: T});
        await idle(page);
        await page.waitForFunction(() => { const eds = window.tinymce ? window.tinymce.get().filter((e) => /^content/.test(e.id) && document.getElementById(e.id)) : []; return eds.length > 0 && eds.every((e) => e.initialized); }, undefined, {timeout: T}).catch(() => {});
        await sleep(700);
    };
    const openAddStatic = async () => { await page.locator('#staticPageGridContainer').getByRole('link', {name: 'Add Static Page', exact: true}).first().click(); await waitSpWin(); };
    const openEditStatic = async (rowText) => {
        const row = page.locator('#staticPageGridContainer tr.gridRow').filter({hasText: rowText}).first();
        const {ctl} = await rowControls(row);
        await ctl.getByRole('link', {name: 'Edit', exact: true}).first().click();
        await waitSpWin();
    };
    const spContentId = async () => spWin().locator('textarea[name="content[en]"]').getAttribute('id');
    const spSave = async () => {
        const w = page.waitForResponse((r) => /update-?static-?page/i.test(r.url()), {timeout: T}).catch(() => null);
        await spWin().locator('input[name="path"]').click().catch(() => {});
        await spWin().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w; await sleep(1000); await idle(page);
        return {status: r ? r.status() : null, windowOpen: await spWin().isVisible().catch(() => false)};
    };
    const addStatic = async ({p, title, text}) => {
        await openAddStatic();
        await spWin().locator('input[name="path"]').fill(p);
        await spWin().locator('input[name="title[en]"]').fill(title);
        if (text) await mceType(await spContentId(), text);
        return spSave();
    };
    const spCloseControl = () => spWin().getByRole('button', {name: /^Close/}).first();

    // ---- the custom block windows (K3) ------------------------------------------
    const pluginRow = (id) => page.locator(`tr.gridRow[id$="-row-${id}"]`).first();
    const managerDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();
    const managerRows = async () => managerDialog().locator('tr.gridRow').evaluateAll((els) => els.map((tr) => ({id: tr.id, text: tr.innerText.replace(/\s+/g, ' ').trim()}))).catch(() => []);
    const openManager = async (ctx) => {
        await openWebsite(ctx, 'plugins');
        const {ctl} = await rowControls(pluginRow('customblockmanagerplugin'));
        await ctl.getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first().click();
        await managerDialog().waitFor({timeout: T});
        await managerDialog().locator('.pkp_controllers_grid').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
    };
    const blockForm = () => page.locator('form#customBlockForm:visible').first();
    const blockDlg = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last();
    const waitBlockForm = async () => {
        await blockForm().waitFor({timeout: T});
        await idle(page);
        const id = await blockForm().locator('textarea[name^="blockContent"]').first().getAttribute('id').catch(() => null);
        if (id) await mceReady(id);
        await sleep(500);
        return id;
    };
    const openAddBlock = async () => { await managerDialog().getByRole('link', {name: 'Add Block', exact: true}).first().click(); return waitBlockForm(); };
    const openEditBlock = async (rowText) => {
        const row = managerDialog().locator('tr.gridRow').filter({hasText: rowText}).first();
        const {ctl} = await rowControls(row);
        await ctl.getByRole('link', {name: 'Edit', exact: true}).first().click();
        return waitBlockForm();
    };
    const blockSave = async () => {
        await blockDlg().locator('h1, h2').first().click().catch(() => {});
        await sleep(300);
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await blockForm().locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w; await sleep(1200); await idle(page);
        return {status: r ? r.status() : null, windowOpen: (await blockForm().count()) > 0, rows: await managerRows()};
    };
    const addBlock = async (title, text) => {
        const id = await openAddBlock();
        await blockForm().locator('input[name="blockTitle[en]"]').fill(title);
        if (text) await mceType(id, text);
        return blockSave();
    };
    const closeTopDialogs = async () => {
        for (let i = 0; i < 4 && (await page.locator('[role="dialog"]:visible').count()); i++) {
            const d = page.locator('[role="dialog"]:visible').last();
            const c = d.getByRole('button', {name: /^Close/}).first();
            if (await c.count()) await c.click().catch(() => {}); else await page.keyboard.press('Escape');
            await sleep(700);
        }
    };

    // ---- Appearance › Setup › Sidebar -----------------------------------------
    const openAppearanceSetup = async (ctx) => {
        await openWebsite(ctx, 'appearance');
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(page); await sleep(700);
    };
    const saveAppearance = async () => {
        const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
        const w = page.waitForResponse((r) => /\/api\/v1\/(contexts|site)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        return {status: r ? r.status() : null, saved, errors: (await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 300))};
    };
    const placeBlock = async (ctx, value) => {
        await openAppearanceSetup(ctx);
        const box = page.locator(`input[name="sidebar"][value="${value}"]`).first();
        if (!(await box.count())) return {placed: false, values: await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => e.value))};
        await box.setChecked(true);
        return {placed: true, save: await saveAppearance()};
    };

    // ---- the public side --------------------------------------------------------
    const pub = async (url, name) => {
        let status = null;
        try { const r = await vis.goto(url); status = r ? r.status() : null; } catch (e) { status = String(e.message || e).slice(0, 200); }
        await idle(vis).catch(() => {});
        await sleep(800);
        const data = await vis.evaluate(() => ({
            title: document.title,
            imgs: [...document.querySelectorAll('img')].map((i) => ({src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, w: i.naturalWidth})).filter((i) => /images|public|blob|data:/.test(i.src || '')),
            blocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((b) => ({id: b.id, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)})),
            main: (document.querySelector('.pkp_structure_main') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
        })).catch((e) => ({error: String(e.message || e)}));
        const s = await screen(vis).catch(() => null);
        record(name, {status, url: vis.url(), data, screen: s});
        await shot(vis, name).catch(() => {});
        return {status, url: vis.url().replace(/^https?:\/\/[^/]+/, ''), ...data};
    };
    const fetchStatus = async (url) => { try { const r = await vis.goto(url); return r ? r.status() : null; } catch (e) { return String(e.message || e).slice(0, 160); } };

    try {
        // ======================================================================
        if (on('tags')) {
            await as(st.m1, A);
            await step('t-item', async () => {
                await H.openNav(page, app, A);
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 tags');
                await H.setType(page, 'Custom Page');
                await sleep(500);
                const id = await itemContentId();
                await mceReady(id);
                const bar = await barButtons(id);
                const menu = await tagMenu(id);
                await snap(page, 't01-item-insert-tag', {bar, menu});
                await loc(page, 'item window: the "Content" bar\'s "Insert Tag"', mceBar(id).getByRole('button', {name: 'Insert Tag'}));
                await closeMenu(id);
                fact('t-item', {bar, menu});
                // the item saved with the literal text and a chosen tag, then its page
                await H.itemWindow(page).locator('input[name="path"]').fill('k5-tags');
                await mceType(id, 'LIT={$contactName} TAG=');
                const m2 = await tagMenu(id);
                const item = page.locator('.tox-menu:visible .tox-collection__item').filter({hasText: /Principal Contact Name/}).first();
                if (await item.count()) await item.click(); else await closeMenu(id);
                await sleep(300);
                await page.keyboard.press('End'); await page.keyboard.type(' end.');
                const content = await mceGet(id);
                const saved = await H.itemSave(page);
                fact('t-item-saved', {content: flat(content, 400), saved: {notice: saved.notice, windowOpen: saved.windowOpen}, menuAgain: m2.items});
                const p = await pub(ctxUrl(A, '/k5-tags'), 't02-item-page-public');
                fact('t-item-page', {status: p.status, main: p.main});
            });
            if (hasStatic) await step('t-static', async () => {
                await openStaticTab(A);
                await openAddStatic();
                const id = await spContentId();
                const bar = await barButtons(id);
                const menu = await tagMenu(id);
                await snap(page, 't03-static-insert-tag', {bar, menu});
                await loc(page, 'static page window: the "Content" bar\'s "Insert Tag"', mceBar(id).getByRole('button', {name: 'Insert Tag'}));
                await closeMenu(id);
                await spWin().locator('input[name="path"]').fill('k5-tags-static');
                await spWin().locator('input[name="title[en]"]').fill('K5 static tags');
                await mceType(id, 'LIT={$contactName} end.');
                const r = await spSave();
                fact('t-static', {bar, menu, save: r});
                const p = await pub(ctxUrl(A, '/k5-tags-static'), 't04-static-page-public');
                fact('t-static-page', {status: p.status, main: p.main});
            });
            await step('t-block', async () => {
                await openManager(A);
                const id = await openAddBlock();
                const bar = await barButtons(id);
                const menu = await tagMenu(id);
                await snap(page, 't05-block-insert-tag', {bar, menu});
                await loc(page, 'block window: the "Content" bar\'s "Insert Tag"', mceBar(id).getByRole('button', {name: 'Insert Tag'}));
                await closeMenu(id);
                await blockForm().locator('input[name="blockTitle[en]"]').fill('K5 Tags');
                await mceType(id, 'BLOCKLIT={$contactName} end.');
                const r = await blockSave();
                fact('t-block', {bar, menu, save: {status: r.status, windowOpen: r.windowOpen, rows: r.rows}});
                await closeTopDialogs();
                const placed = await placeBlock(A, 'k5-tags');
                fact('t-block-placed', placed);
                const p = await pub(ctxUrl(A, '/about'), 't06-block-public');
                fact('t-block-public', {status: p.status, blocks: p.blocks});
            });
        }

        // ======================================================================
        if (on('upload')) {
            await as(st.m1, A);
            const up = {};
            await step('u-block', async () => {
                await openManager(A);
                const id = await openAddBlock();
                await blockForm().locator('input[name="blockTitle[en]"]').fill('K5 Pictures');
                await mceType(id, 'Pictures: ');
                const seq = [
                    ['testImage', files.testImage], ['testImageAgain', files.testImage], ['pdf', files.pdf], ['jpeg', files.jpeg], ['jpg', files.jpg], ['gif', files.gif], ['webp', files.webp],
                    ['fakePng', files.fakePng], ['renamedJpg', files.renamedJpg], ['svg', files.svg], ['oddName', files.oddName], ['onlyDropped', files.onlyDropped],
                    ['testImageV2', files.testImageV2], ['fakeGif', files.fakeGif], ['fakeJpg', files.fakeJpg], ['bmp', files.bmp],
                ];
                let i = 0;
                for (const [k, f] of seq) {
                    i++;
                    // the caret to the end: with the last picture still selected, "Insert/edit image" edits that picture instead of adding one
                    await page.evaluate((x) => { const ed = window.tinymce.get(x); ed.selection.select(ed.getBody(), true); ed.selection.collapse(false); }, id).catch(() => {});
                    up[k] = await uploadInDialog(id, f, `u${String(i).padStart(2, '0')}-block-${k}`);
                    fact(`u-${k}`, up[k]);
                    if (i === 1) await loc(page, 'image window: the "Upload" tab\'s file input', page.locator('.tox-dialog input[type="file"]'));
                }
                // an upload that filled the window, then "Cancel": nothing in the text, the file on disk?
                up.cancelled = await uploadInDialog(id, files.cancelled, 'u18-block-cancelled', {insert: false});
                fact('u-cancelled', {...up.cancelled, contentHasIt: /cancelled/.test(await mceGet(id) || '')});
                up.paste = await pasteOrDrop(id, files.pastePng, 'paste');
                fact('u-paste', up.paste);
                up.drop = await pasteOrDrop(id, files.pastePng, 'drop');
                fact('u-drop', up.drop);
                up.pasteFake = await pasteOrDrop(id, files.fakePng, 'paste');
                fact('u-paste-refused', up.pasteFake);
                await snap(page, 'u19-block-after-refused-paste', {notices: up.pasteFake.notices});
                // the stored files: names, the first "Test Image_1.png" unchanged by the second of another content
                const dir1 = listDir(imagesDir(app, st.m1));
                const expectBase = `${app.baseURL.replace(/\/$/, '')}/public/site/images/${st.m1}/`;
                fact('u-stored', {
                    expectBase,
                    sources: Object.fromEntries(Object.entries(up).filter(([, v]) => v && v.after).map(([k, v]) => [k, {status: (v.requests[0] || {}).status, source: v.after.source, underBase: v.after.source ? v.after.source.startsWith(expectBase) : null}])),
                    dir: dir1,
                    v1: {md5: md5(files.testImage), onDisk: (dir1.find((x) => x.name === 'test-image-1.png') || {}).md5},
                    v2: {md5: md5(files.testImageV2), onDisk: dir1.filter((x) => /^test-image-1-[0-9a-f]{32}\.png$/.test(x.name)).map((x) => ({name: x.name, md5: x.md5}))},
                });
                await snap(page, 'u20-block-box-with-pictures', {content: await mceGet(id)});
                const r = await blockSave();
                fact('u-block-saved', {status: r.status, windowOpen: r.windowOpen, rows: r.rows});
                await closeTopDialogs();
                const placed = await placeBlock(A, 'k5-pictures');
                fact('u-block-placed', placed);
                const p = await pub(ctxUrl(A, '/about'), 'u21-block-public');
                fact('u-block-public', {status: p.status, imgs: p.imgs, blocks: p.blocks.filter((b) => /pictures/i.test(b.id))});
                fact('u-dir-m1', listDir(imagesDir(app, st.m1)));
                // the stored file at the site's address + public/site/images/{username}/{name}
                const stored = listDir(imagesDir(app, st.m1)).map((x) => x.name);
                const direct = {};
                for (const n of stored) direct[n] = await fetchStatus(app.url(`/public/site/images/${st.m1}/${n}`));
                fact('u-direct-address', direct);
            });
            await step('u-size', async () => {
                await openManager(A);
                const id = await openAddBlock();
                up.over2m = await uploadInDialog(id, files.over2m, 'u30-block-over-2mb', {insert: false});
                fact('u-over2m', up.over2m);
                up.overPost = await uploadInDialog(id, files.overPost, 'u31-block-over-8mb', {insert: false});
                fact('u-overPost', up.overPost);
                fact('u-size-dir', listDir(imagesDir(app, st.m1)).map((x) => `${x.name} ${x.kb}`));
                await closeTopDialogs();
                fact('u-size-dialogs', asked.filter((a) => /u-size/.test(a.step)));
            });
            await step('u-item', async () => {
                await H.openNav(page, app, A);
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 picture page');
                await H.setType(page, 'Custom Page');
                await H.itemWindow(page).locator('input[name="path"]').fill('k5-picture');
                const id = await itemContentId();
                await mceReady(id);
                await mceType(id, 'Item picture: ');
                const r = await uploadInDialog(id, files.jpg, 'u40-item-upload');
                fact('u-item-upload', r);
                const saved = await H.itemSave(page);
                fact('u-item-saved', {notice: saved.notice, windowOpen: saved.windowOpen});
                const p = await pub(ctxUrl(A, '/k5-picture'), 'u41-item-page-public');
                fact('u-item-public', {status: p.status, imgs: p.imgs});
            });
            if (hasStatic) await step('u-static', async () => {
                await openStaticTab(A);
                await openAddStatic();
                await spWin().locator('input[name="path"]').fill('k5-picture-static');
                await spWin().locator('input[name="title[en]"]').fill('K5 static picture');
                const id = await spContentId();
                await mceType(id, 'Static picture: ');
                const r = await uploadInDialog(id, files.gif, 'u42-static-upload');
                fact('u-static-upload', r);
                const s = await spSave();
                fact('u-static-saved', s);
                const p = await pub(ctxUrl(A, '/k5-picture-static'), 'u43-static-page-public');
                fact('u-static-public', {status: p.status, imgs: p.imgs});
            });
            await step('u-vue', async () => {
                await openAppearanceSetup(A);
                const fid = await page.locator('textarea[id*="pageFooter"]').first().getAttribute('id').catch(() => null);
                if (!fid) { fact('u-vue', {footer: null}); return; }
                await mceReady(fid);
                const bar = await barButtons(fid);
                const good = await uploadInDialog(fid, files.testImage, 'u50-vue-footer-upload');
                // saved, then the public footer
                const form = page.locator('form').filter({has: page.locator('textarea[id*="pageFooter"]')}).first();
                const w = page.waitForResponse((r) => /\/api\/v1\/(contexts|site)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const sr = await w; await sleep(1200);
                const footerSaved = {status: sr ? sr.status() : null, errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
                const fp = await pub(ctxUrl(A, ''), 'u53-vue-footer-public');
                const footerImgs = await vis.locator('.pkp_structure_footer img, footer img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), loaded: e.complete && e.naturalWidth > 0}))).catch(() => []);
                fact('u-vue-saved', {footerSaved, status: fp.status, footerImgs});
                await openAppearanceSetup(A);
                const fid2 = await page.locator('textarea[id*="pageFooter"]').first().getAttribute('id');
                await mceReady(fid2);
                const bad = await uploadInDialog(fid2, files.fakePng, 'u51-vue-footer-fake', {insert: false});
                const ext = await uploadInDialog(fid2, files.jpeg, 'u52-vue-footer-jpeg', {insert: false});
                fact('u-vue', {bar, good, bad, ext});
                // left unsaved: another address
                const n0 = asked.length;
                await page.goto(ctxUrl(A, '/management/settings/context')).catch((e) => fact('u-vue-leave-error', String(e.message).slice(0, 200)));
                await idle(page);
                fact('u-vue-leave', {asked: askedSince(n0), url: page.url()});
            });
            await step('u-site', async () => {
                // the site's own box: Administration › Site Settings › Site Setup › Navigation › "Add item", "Custom Page"; not saved
                await as('admin');
                await H.openNav(page, app, 'index');
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 site picture');
                await H.setType(page, 'Custom Page');
                const id = await itemContentId();
                await mceReady(id);
                const r = await uploadInDialog(id, files.testImage, 'u60-site-item-upload');
                fact('u-site-upload', r);
                await H.closeItemWindow(page);
                fact('u-dir-admin', listDir(imagesDir(app, 'admin')).filter((x) => /test-image/.test(x.name)));
            });
        }

        // ======================================================================
        if (on('allowance')) {
            await as(st.m2, A);
            await step('a-three', async () => {
                await openManager(A);
                const id = await openAddBlock();
                await blockForm().locator('input[name="blockTitle[en]"]').fill('K5 Allowance');
                const r1 = await uploadInDialog(id, files.big[0], 'a01-big1');
                const r2 = await uploadInDialog(id, files.big[1], 'a02-big2');
                const r3 = await uploadInDialog(id, files.big[2], 'a03-big3');
                fact('a-three', {r1: {req: r1.requests, source: r1.after.source}, r2: {req: r2.requests, source: r2.after.source}, r3: {req: r3.requests, notices: r3.notices, tinyAlerts: r3.tinyAlerts, text: r3.after.text, dialogs: r3.browserDialogs}, dir: listDir(imagesDir(app, st.m2))});
                const s = await blockSave();
                fact('a-saved', {status: s.status, windowOpen: s.windowOpen});
                await closeTopDialogs();
            });
            await step('a-remove', async () => {
                // take the first picture out of the text, save, upload the third again
                await openManager(A);
                const id = await openEditBlock('k5-allowance');
                const before = await mceGet(id);
                await page.evaluate((i) => { const ed = window.tinymce.get(i); const img = ed.dom.select('img')[0]; if (img) { ed.selection.select(img); ed.execCommand('Delete'); } }, id);
                await mceBody(id).click({position: {x: 3, y: 3}});
                const after = await mceGet(id);
                const s = await blockSave();
                await closeTopDialogs();
                await openManager(A);
                const id2 = await openEditBlock('k5-allowance');
                const r = await uploadInDialog(id2, files.big[2], 'a04-big3-after-removal', {insert: false});
                fact('a-remove', {imgsBefore: (before.match(/<img/g) || []).length, imgsAfter: (after.match(/<img/g) || []).length, save: {status: s.status}, again: {req: r.requests, notices: r.notices, tinyAlerts: r.tinyAlerts, text: r.after.text}, dir: listDir(imagesDir(app, st.m2))});
                await closeTopDialogs();
            });
            await step('a-other-journal', async () => {
                // journal B: the same account; a small picture, then a big one
                await as(st.m2, B);
                await H.openNav(page, app, B);
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 B page');
                await H.setType(page, 'Custom Page');
                await H.itemWindow(page).locator('input[name="path"]').fill('k5-b-page');
                const id = await itemContentId();
                await mceReady(id);
                await mceType(id, 'B picture: ');
                const small = await uploadInDialog(id, files.jpg, 'a05-journal-b-small');
                const big = await uploadInDialog(id, files.big[3], 'a06-journal-b-big', {insert: false});
                // K5b: the custom page saved with the small picture (deleted by a-page-deleted)
                const saved = await H.itemSave(page);
                if (saved.windowOpen) await H.closeItemWindow(page);
                const p = await pub(ctxUrl(B, '/k5-b-page'), 'a07-journal-b-page-public');
                fact('a-other-journal', {small: {req: small.requests, source: small.after.source}, big: {req: big.requests, notices: big.notices, tinyAlerts: big.tinyAlerts, text: big.after.text}, saved: {notice: saved.notice, windowOpen: saved.windowOpen}, pagePublic: {status: p.status, imgs: p.imgs}, dir: listDir(imagesDir(app, st.m2))});
            });
            await step('a-page-deleted', async () => {
                // K5b: the custom page holding the picture deleted; the file stays and the allowance is unchanged
                await H.openNav(page, app, B);
                await snap(page, 'a08-journal-b-navigation');
                const dirBefore = listDir(imagesDir(app, st.m2));
                await H.rowAction(page, 'items', 'K5 B page', 'Remove');
                await sleep(600);
                const cd = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, [data-cy="dialog"]:visible').filter({hasText: /Are you sure/}).last();
                const confirm = flat(await cd.innerText().catch(() => ''));
                await cd.getByRole('button', {name: 'OK', exact: true}).or(cd.getByRole('link', {name: 'OK', exact: true})).first().click();
                await sleep(1500); await idle(page);
                const items = (await H.grids(page)).items.rows;
                const pageAfter = await fetchStatus(ctxUrl(B, '/k5-b-page'));
                const dirAfter = listDir(imagesDir(app, st.m2));
                const fileStatus = {};
                for (const x of dirAfter) fileStatus[x.name] = await fetchStatus(app.url(`/public/site/images/${st.m2}/${x.name}`));
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 B again');
                await H.setType(page, 'Custom Page');
                const id = await itemContentId();
                await mceReady(id);
                const again = await uploadInDialog(id, files.big[3], 'a09-journal-b-big-after-page-deleted', {insert: false});
                await H.closeItemWindow(page);
                fact('a-page-deleted', {confirm, items, pageAfter, dirBefore: dirBefore.map((x) => `${x.name} ${x.bytes}`), dirAfter: dirAfter.map((x) => `${x.name} ${x.bytes}`), fileStatus, again: {req: again.requests, tinyAlerts: again.tinyAlerts}});
            });
        }

        // ======================================================================
        if (on('leave')) {
            await as(st.m1, A);
            if (hasStatic) await step('l-static', async () => {
                const out = {};
                await openStaticTab(A);
                const rows0 = await staticRows();
                // untouched Add, close
                await openAddStatic();
                let n0 = asked.length;
                await spCloseControl().click(); await sleep(900);
                out.untouchedAdd = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false)};
                if (out.untouchedAdd.open) { answerNext('accept'); await spCloseControl().click(); await sleep(800); }
                // "x" in Title, close control: Cancel, then OK
                await openAddStatic();
                await loc(page, 'static page window: the close control', spCloseControl());
                await spWin().locator('input[name="title[en]"]').fill('x');
                await spWin().locator('input[name="path"]').click(); await sleep(400);
                await snap(page, 'l01-static-changed');
                n0 = asked.length;
                answerNext('dismiss');
                await spCloseControl().click(); await sleep(900);
                out.titleCancel = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false), title: await spWin().locator('input[name="title[en]"]').inputValue().catch(() => null)};
                await snap(page, 'l02-static-after-cancel', out.titleCancel);
                n0 = asked.length;
                answerNext('accept');
                await spCloseControl().click(); await sleep(900);
                out.titleOk = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false), rows: await staticRows()};
                await snap(page, 'l03-static-after-ok', out.titleOk);
                // Content only
                await openAddStatic();
                await mceType(await spContentId(), 'y');
                await spWin().locator('input[name="path"]').click(); await sleep(400);
                n0 = asked.length;
                answerNext('accept');
                await spCloseControl().click(); await sleep(900);
                out.contentOnly = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false)};
                if (out.contentOnly.open) { answerNext('accept'); await spCloseControl().click(); await sleep(800); }
                // Escape with a change
                await openAddStatic();
                await spWin().locator('input[name="title[en]"]').fill('x');
                await spWin().locator('input[name="path"]').click(); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await page.keyboard.press('Escape'); await sleep(900);
                out.escape = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false)};
                if (out.escape.open) { answerNext('accept'); await spCloseControl().click(); await sleep(800); }
                // another address with a change
                await openAddStatic();
                await spWin().locator('input[name="title[en]"]').fill('x');
                await spWin().locator('input[name="path"]').click(); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await page.goto(ctxUrl(A, '/management/settings/context')).catch((e) => { out.gotoError = String(e.message).slice(0, 160); });
                await idle(page);
                out.leavePage = {asked: askedSince(n0), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                // untouched Edit of a saved page
                await openStaticTab(A);
                if (!(await staticRows()).some((r) => /k5-leave/.test(r.text))) await addStatic({p: 'k5-leave', title: 'K5 leave', text: 'Saved text'});
                await openEditStatic('k5-leave');
                n0 = asked.length;
                answerNext('accept');
                await spCloseControl().click(); await sleep(900);
                out.untouchedEdit = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false)};
                if (out.untouchedEdit.open) { answerNext('accept'); await spCloseControl().click(); await sleep(800); }
                // Edit, changed Title, OK: nothing stored
                await openEditStatic('k5-leave');
                await spWin().locator('input[name="title[en]"]').fill('K5 leave CHANGED');
                await spWin().locator('input[name="path"]').click(); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await spCloseControl().click(); await sleep(900);
                out.editOk = {asked: askedSince(n0), open: await spWin().isVisible().catch(() => false)};
                await openStaticTab(A);
                out.rowsBefore = rows0; out.rowsAfter = await staticRows();
                await snap(page, 'l04-static-list-after', {rows: out.rowsAfter});
                fact('l-static', out);
            });
            await step('l-block', async () => {
                const out = {};
                await openManager(A);
                const rows0 = await managerRows();
                const cancel = () => blockForm().getByRole('link', {name: 'Cancel', exact: true}).or(blockForm().getByRole('button', {name: 'Cancel', exact: true})).first();
                // untouched Add › Cancel
                await openAddBlock();
                let n0 = asked.length;
                await cancel().click(); await sleep(900);
                out.untouchedCancel = {asked: askedSince(n0), open: (await blockForm().count()) > 0};
                if (out.untouchedCancel.open) { answerNext('accept'); await cancel().click(); await sleep(800); }
                // "x" in Block Name › Cancel: dismiss, then accept
                await openAddBlock();
                await loc(page, 'block window: "Cancel"', cancel());
                await blockForm().locator('input[name="blockTitle[en]"]').fill('x');
                await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                await snap(page, 'l10-block-changed');
                n0 = asked.length;
                answerNext('dismiss');
                await cancel().click(); await sleep(900);
                out.nameCancelDismiss = {asked: askedSince(n0), open: (await blockForm().count()) > 0, value: await blockForm().locator('input[name="blockTitle[en]"]').inputValue().catch(() => null)};
                await snap(page, 'l11-block-after-dismiss', out.nameCancelDismiss);
                if (out.nameCancelDismiss.open) {
                    n0 = asked.length;
                    answerNext('accept');
                    await cancel().click(); await sleep(900);
                    out.nameCancelAccept = {asked: askedSince(n0), open: (await blockForm().count()) > 0};
                }
                out.rowsAfterCancel = await managerRows();
                await snap(page, 'l12-block-list-after-cancel', {rows: out.rowsAfterCancel});
                // Content only › Cancel
                const id = await openAddBlock();
                await mceType(id, 'y');
                await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await cancel().click(); await sleep(900);
                out.contentOnlyCancel = {asked: askedSince(n0), open: (await blockForm().count()) > 0};
                if (out.contentOnlyCancel.open) { answerNext('accept'); await cancel().click(); await sleep(800); }
                // the window's close control with a change
                await openAddBlock();
                await blockForm().locator('input[name="blockTitle[en]"]').fill('x');
                await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await blockDlg().getByRole('button', {name: /^Close/}).first().click(); await sleep(900);
                out.closeControl = {asked: askedSince(n0), open: (await blockForm().count()) > 0, managerOpen: (await managerDialog().count()) > 0};
                // Escape with a change
                if (!(await managerDialog().count())) await openManager(A);
                await openAddBlock();
                await blockForm().locator('input[name="blockTitle[en]"]').fill('x');
                await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await page.keyboard.press('Escape'); await sleep(900);
                out.escape = {asked: askedSince(n0), open: (await blockForm().count()) > 0, managerOpen: (await managerDialog().count()) > 0};
                // another address with a change
                if (!(await managerDialog().count())) await openManager(A);
                await openAddBlock();
                await blockForm().locator('input[name="blockTitle[en]"]').fill('x');
                await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                n0 = asked.length;
                answerNext('accept');
                await page.goto(ctxUrl(A, '/management/settings/context')).catch((e) => { out.gotoError = String(e.message).slice(0, 160); });
                await idle(page);
                out.leavePage = {asked: askedSince(n0), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                // an existing block: Edit, changed name, Cancel
                await openManager(A);
                const rows = await managerRows();
                if (rows.length) {
                    const target = rows[0].text;
                    await openEditBlock(target);
                    await blockForm().locator('input[name="blockTitle[en]"]').fill('CHANGED');
                    await blockDlg().locator('h1, h2').first().click().catch(() => {}); await sleep(300);
                    n0 = asked.length;
                    answerNext('accept');
                    await cancel().click(); await sleep(900);
                    out.editCancel = {target, asked: askedSince(n0), open: (await blockForm().count()) > 0};
                    await openEditBlock(target);
                    out.editReopened = await blockForm().locator('input[name="blockTitle[en]"]').inputValue().catch(() => null);
                    answerNext('accept');
                    await cancel().click(); await sleep(800);
                }
                out.rowsBefore = rows0; out.rowsAfter = await managerRows();
                fact('l-block', out);
                await closeTopDialogs();
            });
            await step('l-item', async () => {
                const out = {};
                await H.openNav(page, app, A);
                const closeBtn = () => H.itemWindow(page).getByRole('button', {name: 'Close', exact: true});
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'x');
                await H.itemWindow(page).locator('input[name="path"]').click().catch(() => {}); await sleep(300);
                let n0 = asked.length;
                answerNext('dismiss');
                await closeBtn().click(); await sleep(900);
                out.dismiss = {asked: askedSince(n0), open: await H.itemWindow(page).isVisible().catch(() => false)};
                n0 = asked.length;
                answerNext('accept');
                await closeBtn().click(); await sleep(900);
                out.accept = {asked: askedSince(n0), open: await H.itemWindow(page).isVisible().catch(() => false)};
                await H.openNav(page, app, A);
                out.items = (await H.grids(page)).items.rows;
                fact('l-item', out);
            });
        }

        // ======================================================================
        if (on('side')) {
            const uid = psql(app, `select user_id from users where username='${st.m3}'`);
            const cid = String(st.ids.A);
            const counts = async () => ({
                mailTotal: await app.mail.messageCount().catch((e) => String(e.message)),
                mailToM3: await app.mail.count({to: `${st.m3}@mail.test`}).catch((e) => String(e.message)),
                mailToAdmin: await app.mail.count({to: 'admin@mail.test'}).catch((e) => String(e.message)),
                notifications: psql(app, `select count(*) from notifications where context_id=${cid || 0} or user_id=${uid || 0}`),
                eventLog: psql(app, `select count(*) from event_log where user_id=${uid || 0}`),
                emailLog: psql(app, `select count(*) from email_log where sender_id=${uid || 0}`),
                tasks: psql(app, `select count(*) from edit_tasks where created_by=${uid || 0}`),
                jobs: psql(app, 'select count(*) from jobs'),
            });
            await as(st.m3, A);
            const before = await counts();
            const out = {uid, cid, before};
            if (hasStatic) await step('s-static', async () => {
                await openStaticTab(A);
                out.staticAdd = await addStatic({p: 'k5-side', title: 'K5 side', text: 'Side'});
                await openEditStatic('k5-side');
                await spWin().locator('input[name="title[en]"]').fill('K5 side edited');
                out.staticEdit = await spSave();
                const row = page.locator('#staticPageGridContainer tr.gridRow').filter({hasText: 'k5-side'}).first();
                const {ctl} = await rowControls(row);
                await ctl.getByRole('link', {name: 'Delete', exact: true}).first().click();
                await sleep(700);
                const conf = page.locator('[role="dialog"]:visible').last();
                const w = page.waitForResponse((r) => /delete-?static-?page/i.test(r.url()), {timeout: T}).catch(() => null);
                await conf.getByRole('button', {name: /^(OK|Yes)$/}).first().click();
                const r = await w; await sleep(1200); await idle(page);
                out.staticDelete = {status: r ? r.status() : null, rows: await staticRows()};
                await snap(page, 's01-static-after-delete', out.staticDelete);
            });
            await step('s-block', async () => {
                await openManager(A);
                out.blockAdd = await addBlock('K5 Side Block', 'Side');
                const id = await openEditBlock('k5-side-block');
                await mceType(id, ' edited');
                out.blockEdit = await blockSave();
                const row = managerDialog().locator('tr.gridRow').filter({hasText: 'k5-side-block'}).first();
                const {ctl} = await rowControls(row);
                await ctl.getByRole('link', {name: 'Delete', exact: true}).first().click();
                await sleep(700);
                const conf = page.locator('[role="dialog"]:visible').last();
                const confText = flat(await conf.innerText().catch(() => ''));
                const w = page.waitForResponse((r) => /delete-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
                await conf.getByRole('button', {name: /^(OK|Yes)$/}).first().click();
                const r = await w; await sleep(2500); await idle(page).catch(() => {});
                out.blockDelete = {confText, status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => ''), 300) : null, rows: await managerRows(), dialogs: await page.locator('[role="dialog"]:visible').count()};
                await snap(page, 's02-block-after-delete', out.blockDelete);
                await closeTopDialogs();
            });
            await sleep(3000);
            out.after = await counts();
            await page.goto(ctxUrl(A, '/submissions')); await idle(page);
            await snap(page, 's03-dashboard-after');
            fact('side', out);
        }

        // ======================================================================
        if (on('cascade')) {
            // a journal of its own each run (the deletion consumes it); the seeded D is used on the first run
            let D = st.D;
            let cid = String(st.ids.D);
            let dm = st.dm;
            if (st.cascadeDone) {
                const t2 = tag(`${TAG}d`);
                const r = await app.api.createContext({tag: t2, context: {name: `U09 K5 D ${t2}`, acronym: 'K5D'}, plugins: {customblockmanagerplugin: {enabled: true}, ...(hasStatic ? {staticpagesplugin: {enabled: true}} : {})}, users: [{username: `${t2}dm`, roles: ['manager']}]});
                D = t2; cid = String(r.contextId); dm = `${t2}dm`;
            }
            st.cascadeDone = true;
            fs.writeFileSync(stateFile, JSON.stringify(st, null, 2));
            const out = {D, cid};
            await step('c-fill', async () => {
                await as(dm, D);
                await H.openNav(page, app, D);
                await H.openItemWindow(page, 'add');
                await H.fillTitle(page, 'K5 D page');
                await H.setType(page, 'Custom Page');
                await H.itemWindow(page).locator('input[name="path"]').fill('k5-d-page');
                const id = await itemContentId();
                await mceType(id, 'D page ');
                out.itemUpload = (await uploadInDialog(id, files.testImage, null)).after.source;
                out.itemSave = (await H.itemSave(page)).windowOpen;
                if (hasStatic) { await openStaticTab(D); out.staticSave = await addStatic({p: 'k5-d-static', title: 'K5 D static', text: 'D static'}); }
                await openManager(D);
                out.blockSave = (await addBlock('K5 D Block', 'D block')).status;
                await closeTopDialogs();
                out.placed = await placeBlock(D, 'k5-d-block');
            });
            const dbRead = () => ({
                items: psql(app, `select count(*) from navigation_menu_items where context_id=${cid || 0} and type='NMI_TYPE_CUSTOM'`),
                staticPages: hasStatic ? psql(app, `select count(*) from static_pages where context_id=${cid || 0}`) : null,
                blockSettings: psql(app, `select count(*) from plugin_settings where context_id=${cid || 0} and (plugin_name='customblockmanagerplugin' or plugin_name like 'k5-%')`),
                files: listDir(imagesDir(app, dm)),
            });
            out.dbBefore = dbRead();
            out.pubBefore = {page: await fetchStatus(ctxUrl(D, '/k5-d-page')), static: hasStatic ? await fetchStatus(ctxUrl(D, '/k5-d-static')) : null, file: out.dbBefore.files[0] ? await fetchStatus(app.url(`/public/site/images/${dm}/${out.dbBefore.files[0].name}`)) : null};
            await step('c-delete', async () => {
                await as('admin');
                await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page); await sleep(500);
                const hrow = page.locator('tr.gridRow').filter({hasText: `U09 K5 D ${D}`}).first();
                await hrow.locator('a.show_extras').click(); await sleep(400);
                const controls = hrow.locator('xpath=following-sibling::tr[1]');
                out.rowLinks = await controls.getByRole('link').allInnerTexts().catch(() => []);
                await controls.getByRole('link', {name: /Remove|Delete/}).first().click();
                const confirm = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
                await confirm.waitFor({state: 'visible', timeout: T});
                out.confirm = flat(await confirm.innerText().catch(() => ''), 400);
                await snap(page, 'c01-hosted-delete-confirm', {confirm: out.confirm});
                await confirm.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click();
                await sleep(3500); await idle(page);
                await snap(page, 'c02-hosted-after-delete');
            });
            out.dbAfter = dbRead();
            out.pubAfter = {page: await fetchStatus(ctxUrl(D, '/k5-d-page')), static: hasStatic ? await fetchStatus(ctxUrl(D, '/k5-d-static')) : null, file: out.dbAfter.files[0] ? await fetchStatus(app.url(`/public/site/images/${dm}/${out.dbAfter.files[0].name}`)) : null};
            fact('cascade', out);
        }
    } finally {
        fact('asked', asked);
        await M.close();
        await V.close();
    }
});
