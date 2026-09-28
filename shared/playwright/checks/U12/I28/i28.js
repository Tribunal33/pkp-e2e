// U12 claim check, housekeeping chunk I28 (2026-09-28): incidentals row L94.
// The "Short Description" and "Announcement" boxes of the journal's "Add
// Announcement" panel carry "Insert/edit image"; the row says the upload's
// rules are U09 Rule 29's (29a–29c) and U12 does not point there. Drives the
// picture window in both boxes on all three apps, as the scratch journal's
// manager and as the site administrator working in the journal.
// Spec: docs/specs/U12-announcements.md, Fields "Short Description" and
// "Announcement" (footnote h); docs/specs/U09-*.md Rule 29 (the rules checked).
//
// Seeds its own scratch context per run (announcements on, a manager), signs in
// from the roster and records every screen with screen(). Phases:
//   short    manager: Add Announcement › "Short Description": the bar, the image
//            window ("General", "Upload"), a .png inserted, a .bmp refused
//   long     manager, same panel › "Announcement": .webp, an upper-case .PNG,
//            .jpeg, a text file named .png, a PNG named .jpg, a paste; then a
//            title and "Save": the list at once and after a reload, "Edit"
//            (both boxes' content), the public list and the announcement's page
//            (the pictures load?), the stored files
//   leave    manager: the panel left with an unsaved title and an inserted
//            picture by "Close", reopened; then left by address
//   admin    admin in the scratch journal: "Short Description" › .png and .bmp
// Run twice, each under its own facts name:
//   RUN=r1 PROBE_FEATURE=U12 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U12/I28/i28.js
//   RUN=r2 … (a fresh scratch context per RUN; PHASES=short,long,leave,admin narrows)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['short', 'long', 'leave', 'admin'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log(`[i28 ${RUN}]`, ...a);
const REPO = path.resolve(__dirname, '../../../../..');
const stateFile = (app) => path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
const N = (name) => `${RUN}-${name}`;

// ---- files ------------------------------------------------------------------
function crc32(buf) {
    let c;
    const table = crc32.t || (crc32.t = Array.from({length: 256}, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, seed = 0) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = (x * 7 + y * 3 + seed) & 0xff;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function bmp(w, h) {
    const row = Math.ceil((w * 3) / 4) * 4;
    const size = 54 + row * h;
    const b = Buffer.alloc(size);
    b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14);
    b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
    for (let i = 54; i < size; i++) b[i] = (i * 13) & 0xff;
    return b;
}
async function makeFiles(page) {
    const dir = path.join(outDir(), 'files');
    fs.mkdirSync(dir, {recursive: true});
    const f = (n) => path.join(dir, n);
    const w = (n, buf) => { if (!fs.existsSync(f(n))) fs.writeFileSync(f(n), buf); return f(n); };
    if (!fs.existsSync(f('u12-photo.webp')) || !fs.existsSync(f('u12-photo.jpeg'))) {
        await page.goto('about:blank');
        const out = await page.evaluate(() => {
            const c = document.createElement('canvas'); c.width = 90; c.height = 60;
            const x = c.getContext('2d'); x.fillStyle = '#3a6'; x.fillRect(0, 0, 90, 60); x.fillStyle = '#c33'; x.fillRect(10, 10, 40, 30);
            return {jpeg: c.toDataURL('image/jpeg', 0.9).split(',')[1], webp: c.toDataURL('image/webp', 0.9).split(',')[1]};
        });
        w('u12-photo.webp', Buffer.from(out.webp, 'base64'));
        w('u12-photo.jpeg', Buffer.from(out.jpeg, 'base64'));
    }
    const text = Buffer.from('This is a text file, not a picture.\n');
    return {
        png: w('U12 Short_1.png', png(80, 50, 1)),
        bmp: w('u12-photo.bmp', bmp(40, 30)),
        webp: f('u12-photo.webp'),
        upper: w('U12-UPPER.PNG', png(70, 40, 2)),
        jpeg: f('u12-photo.jpeg'),
        fakePng: w('u12-fake.png', text),
        renamedJpg: w('u12-renamed.jpg', png(60, 40, 3)),
        paste: w('u12-pasted.png', png(50, 30, 4)),
        adminPng: w('u12-admin.png', png(66, 44, 5)),
        leavePng: w('u12-leave.png', png(55, 35, 6)),
    };
}

// ---- page helpers --------------------------------------------------------------
const ctxUrl = (app, ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
const panel = (page) => page.locator('[role="dialog"]:visible').filter({has: page.locator('.pkpFormPage__footer')}).last();
const field = (page, label) => panel(page).locator('.pkpFormField').filter({hasText: new RegExp(`(^|\\s)${label}`)}).first();
// "Announcement" alone would also match "Announcement Type": the rich box is the field with an iframe
const richField = (page, label) => panel(page).locator('.pkpFormField').filter({has: page.locator('iframe')}).filter({hasText: new RegExp(`(^|\\s)${label}(\\s|$)`)}).first();

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    record(N(name), {...s, ...extra});
    await shot(page, N(name)).catch(() => {});
    return s;
}
async function openAnnouncements(page, app, ctx) {
    await page.goto(ctxUrl(app, ctx, '/management/settings/announcements'));
    await idle(page);
    await page.locator('main .listPanel').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}
async function rows(page) {
    return page.locator('main .listPanel .listPanel__item').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200))).catch(() => []);
}
async function openAdd(page) {
    await page.locator('main .listPanel').first().getByRole('button', {name: 'Add Announcement', exact: true}).click();
    await panel(page).waitFor({timeout: T});
    await idle(page);
    await sleep(400);
}
async function editorId(page, label) {
    const fr = richField(page, label).locator('iframe').first();
    await fr.waitFor({timeout: T});
    const id = (await fr.getAttribute('id')).replace(/_ifr$/, '');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
    return id;
}
const mceGet = (page, id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
const caretToEnd = (page, id) => page.evaluate((i) => { const ed = window.tinymce.get(i); ed.focus(); ed.selection.select(ed.getBody(), true); ed.selection.collapse(false); }, id).catch(() => {});
const barButtons = (page, label) => richField(page, label).locator('.tox-editor-header button, .tox-editor-header [role="button"]').evaluateAll((els) => els.map((b) => b.getAttribute('aria-label') || b.title || b.innerText.trim()).filter(Boolean)).catch(() => []);

const imgDlg = (page) => page.locator('.tox-dialog:visible').first();
async function imgDlgState(page) {
    const d = imgDlg(page);
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
            text: txt(root).slice(0, 600),
        };
    });
}
const tinyNotices = async (page) => (await page.locator('.tox-notification:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);

/** "Insert/edit image" › "Upload" › file; inserts when the window filled a source; answers every window left. */
async function uploadInBox(page, label, file, snapName) {
    const id = await editorId(page, label);
    await caretToEnd(page, id);
    await richField(page, label).getByRole('button', {name: /Insert\/edit image/i}).first().click();
    await imgDlg(page).waitFor({timeout: T});
    await sleep(400);
    const opened = await imgDlgState(page);
    if (snapName) await snap(page, `${snapName}-general`, {imageWindow: opened});
    const tab = imgDlg(page).getByRole('tab', {name: 'Upload'}).first();
    await tab.click(); await sleep(400);
    const uploadTab = await imgDlgState(page);
    if (snapName) await snap(page, `${snapName}-upload-tab`, {imageWindow: uploadTab});
    const resps = [];
    const onResp = async (r) => { if (/_uploadPublicFile/.test(r.url())) { const body = await r.text().catch(() => ''); resps.push({status: r.status(), method: r.request().method(), body: body.slice(0, 400)}); } };
    page.on('response', onResp);
    await imgDlg(page).locator('input[type="file"]').first().setInputFiles(file);
    const end = Date.now() + 12_000;
    while (Date.now() < end && !resps.length) await sleep(250);
    await sleep(1800);
    page.off('response', onResp);
    const after = await imgDlgState(page);
    const alerts = await page.locator('.tox-dialog:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
    const snapAfter = snapName ? await snap(page, `${snapName}-after`, {imageWindow: after, alerts}) : null;
    void snapAfter;
    const source = (after.inputs || []).find((i) => /Source/i.test(i.label || '') || i.type === 'url');
    let inserted = null;
    const alertOpen = alerts.length > 1;
    if (!alertOpen && source && source.value && after.open) {
        await imgDlg(page).getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
        await sleep(700);
        inserted = await mceGet(page, id);
    }
    const closedWith = [];
    for (let i = 0; i < 3 && (await page.locator('.tox-dialog:visible').count()); i++) {
        const d = page.locator('.tox-dialog:visible').last();
        const b = d.getByRole('button', {name: /^(OK|Ok|Cancel|Close)$/}).first();
        closedWith.push(await b.innerText().catch(() => '?'));
        await b.click().catch(() => {});
        await sleep(400);
    }
    return {file: path.basename(file), requests: resps, afterTabs: after.tabs, source: source ? source.value : null, alerts, notices: await tinyNotices(page), inserted: inserted ? flat(inserted, 800) : null, closedWith,
        content: flat(await mceGet(page, id), 1200), editorId: id};
}
async function pasteInto(page, label, file) {
    const id = await editorId(page, label);
    await caretToEnd(page, id);
    const resps = [];
    const onResp = async (r) => { if (/_uploadPublicFile/.test(r.url())) { const body = await r.text().catch(() => ''); resps.push({status: r.status(), body: body.slice(0, 400)}); } };
    page.on('response', onResp);
    const fr = await (await page.locator(`[id="${id}_ifr"]`).elementHandle()).contentFrame();
    await fr.evaluate(({b64, name}) => {
        const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const dt = new DataTransfer(); dt.items.add(new File([arr], name, {type: 'image/png'}));
        document.body.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
    }, {b64: fs.readFileSync(file).toString('base64'), name: path.basename(file)});
    const end = Date.now() + 10_000;
    while (Date.now() < end && !resps.length) await sleep(250);
    await sleep(1500);
    page.off('response', onResp);
    return {file: path.basename(file), requests: resps, notices: await tinyNotices(page), content: flat(await mceGet(page, id), 1500)};
}
const listDir = (app, user) => { const d = path.resolve(REPO, app.root, 'public', 'site', 'images', user); try { return fs.readdirSync(d).sort(); } catch { return []; } };
async function imagesIn(page, scope) {
    return page.locator(scope).locator('img').evaluateAll((els) => els.map((e) => ({src: (e.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 160), alt: e.getAttribute('alt'), complete: e.complete, naturalWidth: e.naturalWidth}))).catch(() => []);
}

// ---------------------------------------------------------------------------
forEachApp(async (app) => {
    let st = fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    if (!st) {
        const t = tag(`u12i28${RUN}`);
        const ctx = await app.api.createContext({tag: t, context: {name: `U12 I28 ${t}`, acronym: 'U12I28'}, users: [{username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'}], enableAnnouncements: true});
        st = {tag: t, path: ctx.path || t, id: ctx.contextId, mgr: `${t}mgr`};
        fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
        record(N('00-seed'), {st, ctx});
        note(`ccI28 ${app.name}: scratch ${st.path} (id ${st.id}) seeded with enableAnnouncements: true and a manager ${st.mgr}`);
    }
    const {page, close} = await launch(app);
    const asked = [];
    page.on('dialog', async (d) => { asked.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record(N('facts'), {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 300)); };
    try {
        const files = await makeFiles(page);
        const title = `I28 pictures ${st.tag}`;
        if (on('short') || on('long')) {
            await signIn(page, st.mgr, {contextPath: st.path});
            await openAnnouncements(page, app, st.path);
            await snap(page, '10-page', {rows: await rows(page)});
            await openAdd(page);
            await snap(page, '11-add-panel');
            await loc(page, 'Add Announcement: "Short Description" › "Insert/edit image"', richField(page, 'Short Description').getByRole('button', {name: /Insert\/edit image/i}));
            await loc(page, 'Add Announcement: "Announcement" › "Insert/edit image"', richField(page, 'Announcement').getByRole('button', {name: /Insert\/edit image/i}));
            fact('bars', {short: await barButtons(page, 'Short Description'), long: await barButtons(page, 'Announcement')});
            const before = listDir(app, st.mgr);
            if (on('short')) {
                fact('short-png', await uploadInBox(page, 'Short Description', files.png, '12-short-png'));
                await loc(page, 'image window: "Upload" tab file input', page.locator('.tox-dialog input[type="file"]'));
                fact('short-bmp', await uploadInBox(page, 'Short Description', files.bmp, '13-short-bmp'));
            }
            if (on('long')) {
                for (const [k, f] of [['webp', files.webp], ['upper', files.upper], ['jpeg', files.jpeg], ['fakePng', files.fakePng], ['renamedJpg', files.renamedJpg]]) {
                    fact(`long-${k}`, await uploadInBox(page, 'Announcement', f, `14-long-${k}`));
                }
                fact('long-paste', await pasteInto(page, 'Announcement', files.paste));
                await snap(page, '15-panel-before-save');
                fact('stored-files', {before, after: listDir(app, st.mgr)});
                // title, save
                await panel(page).locator('.pkpFormField').filter({hasText: /^\s*Title/}).first().locator('input').first().fill(title);
                const shortHtml = await mceGet(page, await editorId(page, 'Short Description'));
                const longHtml = await mceGet(page, await editorId(page, 'Announcement'));
                const apiCalls = [];
                const onReq = (r) => { if (/api\/v1\/announcements/.test(r.url()) && r.request().method() !== 'GET') apiCalls.push({method: r.request().method(), status: r.status()}); };
                page.on('response', onReq);
                await panel(page).getByRole('button', {name: 'Save', exact: true}).click();
                await page.locator('[role="dialog"]:visible').filter({has: page.locator('.pkpFormPage__footer')}).waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                page.off('response', onReq);
                const s1 = await snap(page, '16-list-after-save', {rows: await rows(page)});
                fact('save', {apiCalls, panelOpen: (await panel(page).count()) > 0, rowsAtOnce: await rows(page), notices: s1.notices, shortImgs: (shortHtml.match(/<img[^>]*>/g) || []).length, longImgs: (longHtml.match(/<img[^>]*>/g) || []).length});
                await page.reload(); await idle(page);
                await page.locator('main .listPanel').first().waitFor({timeout: T}).catch(() => {});
                await snap(page, '17-list-after-reload', {rows: await rows(page)});
                // Edit: the boxes read back
                const row = page.locator('main .listPanel .listPanel__item').filter({hasText: title}).first();
                const viewHref = await row.getByRole('link', {name: /View/}).first().getAttribute('href').catch(() => null);
                await row.getByRole('button', {name: 'Edit'}).first().click();
                await panel(page).waitFor({timeout: T}); await idle(page); await sleep(600);
                const eShort = await mceGet(page, await editorId(page, 'Short Description'));
                const eLong = await mceGet(page, await editorId(page, 'Announcement'));
                const editorImgs = await page.evaluate(() => window.tinymce.get().filter((e) => document.getElementById(e.id)).map((e) => ({id: e.id, imgs: [...e.getBody().querySelectorAll('img')].map((i) => ({src: (i.getAttribute('src') || '').slice(0, 120), naturalWidth: i.naturalWidth}))})));
                await snap(page, '18-edit-panel', {editorImgs});
                fact('edit-readback', {short: flat(eShort, 1200), long: flat(eLong, 1500), editorImgs});
                await panel(page).getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
                await sleep(600);
                // public pages
                await page.goto(ctxUrl(app, st.path, '/announcement')); await idle(page); await page.waitForLoadState('load').catch(() => {}); await sleep(800);
                await snap(page, '19-public-list');
                const pubList = await imagesIn(page, 'body');
                let pubView = null;
                const id = viewHref && (viewHref.match(/view\/(\d+)/) || [])[1];
                if (id) {
                    await page.goto(ctxUrl(app, st.path, `/announcement/view/${id}`)); await idle(page); await page.waitForLoadState('load').catch(() => {}); await sleep(800);
                    await snap(page, '20-public-view');
                    pubView = await imagesIn(page, 'body');
                }
                fact('public', {viewHref, list: pubList.filter((i) => /images|data:/.test(i.src)), view: pubView && pubView.filter((i) => /images|data:/.test(i.src)), listAll: pubList.length});
            }
        }
        if (on('leave')) {
            await signIn(page, st.mgr, {contextPath: st.path});
            await openAnnouncements(page, app, st.path);
            await openAdd(page);
            const leaveBefore = listDir(app, st.mgr);
            const n0 = asked.length;
            await panel(page).locator('.pkpFormField').filter({hasText: /^\s*Title/}).first().locator('input').first().fill('I28 unsaved');
            const ins = await uploadInBox(page, 'Short Description', files.leavePng, null);
            await snap(page, '30-leave-unsaved');
            await panel(page).getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
            await sleep(900);
            const afterClose = {panelOpen: (await panel(page).count()) > 0, dialogs: asked.slice(n0), rows: await rows(page)};
            await snap(page, '31-after-close', afterClose);
            await sleep(600);
            await openAdd(page);
            const reopened = {title: await panel(page).locator('.pkpFormField').filter({hasText: /^\s*Title/}).first().locator('input').first().inputValue().catch(() => null), short: flat(await mceGet(page, await editorId(page, 'Short Description')), 600)};
            await snap(page, '32-reopened', reopened);
            // by address with a change in the panel
            await panel(page).locator('.pkpFormField').filter({hasText: /^\s*Title/}).first().locator('input').first().fill('I28 unsaved 2');
            const n1 = asked.length;
            await page.goto(ctxUrl(app, st.path, '/management/settings/website')).catch((e) => log('goto', e.message));
            await idle(page);
            const byAddress = {url: page.url(), dialogs: asked.slice(n1)};
            await signIn(page, st.mgr, {contextPath: st.path});
            await openAnnouncements(page, app, st.path);
            await snap(page, '33-list-after-leaving', {rows: await rows(page)});
            fact('leave', {inserted: ins.inserted, afterClose, reopened, byAddress, rowsAfter: await rows(page), filesKept: listDir(app, st.mgr).filter((x) => !leaveBefore.includes(x))});
        }
        if (on('admin')) {
            await signIn(page, 'admin', {contextPath: st.path});
            await openAnnouncements(page, app, st.path);
            await openAdd(page);
            await snap(page, '40-admin-add-panel');
            const before = listDir(app, 'admin');
            const p = await uploadInBox(page, 'Short Description', files.adminPng, '41-admin-png');
            const b = await uploadInBox(page, 'Short Description', files.bmp, null);
            fact('admin', {bars: await barButtons(page, 'Short Description'), png: p, bmp: b, newFiles: listDir(app, 'admin').filter((x) => !before.includes(x))});
            await panel(page).getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
        }
        fact('browserDialogs', asked);
    } finally {
        await close();
    }
});
