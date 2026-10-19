// Regression check — pkp/pkp-lib#13512's follow-up commits on `main`, 07bc43fe67 "Port image upload
// checking fixes to main" and 042726ebf6 "Fix category image use of moveTemporaryFile" (092ec34b0f on
// stable-3_5_0). The report is docs/reports/2026-10-19-pkp-lib-13512.md; this check takes its Steps on
// PKP's default test dataset as the journal (press, server) manager `rvaca` and records what each
// screen and request shows. It asserts nothing, so it runs unchanged before the change (the lib/pkp
// diff 6ff76591a9..042726ebf6 reversed through bin/try-fix.js), at the tips and with a fix applied.
//
//   npm run fleet-prep -- --feature r13512 --dataset 1 --reset      # every walk changes the dataset
//   PROBE_FEATURE=r13512 PROBE_AGENT=<id> [PROBE_RUN=<run>] [FOLLOWUP=highlight,category,version,question,announcement] \
//     node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/sync/pkp-lib-13512/followup.js
//   PKP_E2E_LINE=stable-3_5_0 … the same on the 3.5 line's dataset fleet (it has no category API:
//   "category" records "skipped" there).
//
// Parts (FOLLOWUP picks some; the default is all, in this order):
//   highlight     Finding 1. Settings › Website › Setup › Highlights › "Add Highlight" with photo.png
//                 (control), then "Edit", "Remove", photo.jpg (the same PNG, renamed), "Save"; the
//                 answer, the panel, the image setting, the files on disk, the reopened panel, the
//                 home page's carousel. Neighbour: "Edit" again, photo2.png, "Save" (must store).
//   category      Finding 2. Settings › Journal › "Categories" › "Add Category" "Maps" with photo.png;
//                 the stored names, the files on disk, the "Edit Category" preview, the category page's
//                 thumbnail, catalog/fullSize's headers. Neighbour: "Maps JPG" with photo.jpg.
//   version       Finding 3. In rvaca's session, the report's console snippet as printed there
//                 (snippet() below: this app's submission, OJS 4, OMP 3, OPS 1, its section key and
//                 version stage, the 3.5 body on the line): temporaryFiles notes.txt, POST
//                 submissions/<id>/publications with that coverImage, the version count before and
//                 after; then the workflow screen. Neighbours: the same POST with a PNG cover named
//                 cover.png, and with no cover.
//   question      The question. PUT the current publication's coverImage from cover.png, then
//                 cover.jpg (the same PNG).
//   announcement  Reach of finding 1's cause (Announcement::save()): an announcement with photo.png,
//                 then edited with photo.jpg; the answer, the stored image, the files on disk.
//
// Reads fixed when (fix-followup.diff, tried 2026-10-19): highlight's photo.jpg save answers 400 with
// the image setting and the earlier picture's file unchanged and the carousel showing it; category's
// image is stored as <id>-category.png; version's snippet answers 400 (the message under
// coverImage.en) and the versions stay at 1; the neighbours
// store photo2.png, the PNG cover, the "Maps JPG" image (as <id>-category.png), and add a publication
// each. At the tips: photo.jpg answers 400 and the old file is gone, the setting is
// {"temporaryFileId":N}, the carousel's <img> ends "highlights/?"; the category file has no extension;
// the refused POST adds a publication. Before the change: photo.jpg stored, the category file
// <id>-category.png, the text cover POST answers 200 with no cover, cover.jpg is stored.
//
// Facts: followup-<pkp-lib sha>[-<applied diff>][-<PROBE_RUN>]-<app>.json (PROBE_RUN is put in by
// the kit). Screenshots: <label>-<part>-<step>-<app>.png.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, idle, screen, shot, record, sql, serverLog} = require('../../../probe');

const T = 30_000;
const CONTEXT_DIR = {ojs: 'journals', omp: 'presses', ops: 'contexts'};
const CATALOG_WORD = {ojs: 'catalog', omp: 'catalog', ops: 'preprints'};
const SUBMISSION = {ojs: 4, omp: 3, ops: 1};
const STAGE = {ojs: 'VoR', omp: 'VoR', ops: 'AO'}; // OPS's publications take 'AO' (a check constraint refuses 'VoR')

/** Finding 3's Steps: the console snippet the report prints (OJS main), for this app and line. */
function snippet(app, line) {
    const sectionKey = app.name === 'omp' ? 'seriesId' : 'sectionId';
    // main: the schema still lists "version" as required but no longer returns it, so any value serves;
    // 3.5: "version" is the version number and the stage fields do not exist.
    const versionFields = line === 'main'
        ? `version: 2,\n        versionStage: '${STAGE[app.name]}',\n        versionMajor: 2,\n        versionMinor: 0,`
        : 'version: current.version + 1,';
    return `const id = ${SUBMISSION[app.name]};
const api = pkp.context.apiBaseUrl;
const headers = {'X-Csrf-Token': pkp.currentUser.csrfToken};
const get = async (route) => (await fetch(api + route, {headers})).json();
const versions = async () => (await get(\`submissions/\${id}\`)).publications.length;
const before = await versions();
const current = await get(\`submissions/\${id}/publications/\${(await get(\`submissions/\${id}\`)).currentPublicationId}\`);
const form = new FormData();
form.append('file', new File(['plain text, not an image\\n'], 'notes.txt', {type: 'text/plain'}));
const temporaryFile = await (await fetch(api + 'temporaryFiles', {method: 'POST', headers, body: form})).json();
const response = await fetch(\`\${api}submissions/\${id}/publications\`, {
    method: 'POST',
    headers: {...headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({
        ${versionFields}
        ${sectionKey}: current.${sectionKey},
        title: current.title,
        abstract: current.abstract,
        coverImage: {en: {temporaryFileId: temporaryFile.id, altText: ''}},
    }),
});
console.log(response.status, await response.json());
console.log('versions before:', before, 'after:', await versions());`;
}
const PARTS = (process.env.FOLLOWUP || 'highlight,category,version,question,announcement').split(',');
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

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

const FILES = {
    'photo.png': {mimeType: 'image/png', buffer: png(400, 200, [0, 102, 204])},
    'photo.jpg': {mimeType: 'image/jpeg', buffer: png(400, 200, [204, 102, 0])}, // a PNG, named .jpg
    'photo2.png': {mimeType: 'image/png', buffer: png(400, 200, [0, 153, 0])},
    'cover.png': {mimeType: 'image/png', buffer: png(300, 400, [0, 102, 204])},
    'cover.jpg': {mimeType: 'image/jpeg', buffer: png(300, 400, [204, 102, 0])}, // a PNG, named .jpg
    'notes.txt': {mimeType: 'text/plain', buffer: Buffer.from('plain text, not an image\n')},
};
const file = (name) => ({name, ...FILES[name]});

/** In the signed-in session: the context's REST API, the session's CSRF token, JSON both ways. */
async function api(page, method, route, {body, upload} = {}) {
    return page.evaluate(
        async ({method, route, body, upload}) => {
            const headers = {'X-Csrf-Token': pkp.currentUser.csrfToken};
            const init = {method: method === 'GET' ? 'GET' : 'POST', headers};
            if (method === 'PUT' || method === 'DELETE') headers['X-Http-Method-Override'] = method;
            if (upload) {
                const fd = new FormData();
                fd.append('file', new File([Uint8Array.from(atob(upload.b64), (c) => c.charCodeAt(0))], upload.name, {type: upload.type}));
                init.body = fd;
            } else if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
                init.body = JSON.stringify(body);
            }
            const r = await fetch(pkp.context.apiBaseUrl + route, init);
            const text = await r.text();
            let json = null;
            try {
                json = JSON.parse(text);
            } catch (e) {
                json = null;
            }
            return {status: r.status, json, text: json ? null : text.slice(0, 400)};
        },
        {method, route, body, upload: upload ? {name: upload.name, type: upload.mimeType, b64: upload.buffer.toString('base64')} : null}
    );
}
const uploadTemp = async (page, f) => (await api(page, 'POST', 'temporaryFiles', {upload: f})).json?.id;

forEachApp(async (app) => {
    const sha = execFileSync('git', ['-C', path.join(path.resolve(app.root), 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim();
    const markerPath = path.join(app.root, '.pkp-e2e-fix.json');
    const marker = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, 'utf8')) : null;
    const diffName = marker ? path.basename(String(marker.diff || 'fix'), '.diff') : null;
    const label = `${sha}${diffName ? `-${diffName}` : ''}`;
    const facts = {app: app.name, line: app.line || 'main', libPkp: sha, fixApplied: marker ? marker.diff || true : false, parts: {}};

    const {table, id, settings} = app.contextTables;
    const cid = Number(sql(app, `select ${id} from ${table} where path = 'publicknowledge'`).trim());
    const publicDir = path.join(app.root, app.dataset ? `public-ds${app.dataset}` : 'public', CONTEXT_DIR[app.name], String(cid));
    const ls = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : 'no folder');
    facts.context = {id: cid, publicDir: path.relative(process.cwd(), publicDir)};
    const log = serverLog(app);

    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const settingsPage = async () => {
        await page.goto(`/index.php/publicknowledge/en/management/settings/website`);
        await idle(page);
    };
    try {
        await signIn(page, 'rvaca', {contextPath: 'publicknowledge'});

        // ---------------------------------------------------------------- Finding 1
        if (PARTS.includes('highlight')) {
            const out = (facts.parts.highlight = {});
            const from = log.mark();
            const openTab = async () => {
                await settingsPage();
                const setupTab = page.locator('#setup-button').first();
                if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
                await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
                await page.locator('.highlightsListPanel').waitFor({timeout: T});
                await idle(page);
            };
            const panel = (title) => page.getByRole('dialog', {name: title});
            const imageField = (d) => d.locator('.pkpFormField--uploadImage');
            const rich = async (d, id, text) => {
                const body = d.locator(`#${id}_ifr`).contentFrame().locator('body');
                await body.waitFor({timeout: T});
                await page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, id, {timeout: T});
                await body.click();
                await body.pressSequentially(text);
            };
            const putImage = async (d, f) => {
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await page.locator('input[type=file]').last().setInputFiles({name: f.name, mimeType: f.mimeType, buffer: f.buffer});
                const r = await up;
                await imageField(d).locator('.pkpFormField--upload__preview img').first().waitFor({timeout: T}).catch(() => {});
                return r.status();
            };
            const save = async (d) => {
                const answered = page.waitForResponse((r) => /\/api\/v1\/highlights(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await d.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answered;
                let body = null;
                try {
                    body = await r.json();
                } catch (e) {
                    body = null;
                }
                await idle(page);
                await pause(800);
                return {status: r.status(), body: r.status() >= 400 ? body : {image: body && body.image}};
            };
            const hlId = () => Number(sql(app, `select h.highlight_id from highlights h join highlight_settings s on s.highlight_id = h.highlight_id where h.context_id = ${cid} and s.setting_name = 'title' and s.setting_value like 'Spring issue%' order by 1 desc limit 1`).trim()) || null;
            const stored = (hid) => sql(app, `select setting_value from highlight_settings where highlight_id = ${hid} and setting_name = 'image'`).trim();
            const hlDir = path.join(publicDir, 'highlights');
            const editOpen = async () => {
                await openTab();
                const row = page.locator('.highlightsListPanel .listPanel__item').filter({hasText: 'Spring issue'});
                await row.getByRole('button', {name: 'Edit', exact: true}).click();
                const d = panel('Edit Highlight');
                await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
                await idle(page);
                await pause(800);
                return d;
            };
            const readPanel = async (d) => ({
                pictures: await imageField(d).locator('img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), naturalWidth: e.naturalWidth}))),
                uploadOffered: await imageField(d).getByRole('button', {name: 'Upload File'}).isVisible().catch(() => false),
                fieldText: flat(await imageField(d).innerText()),
            });
            const home = async (key) => {
                await page.goto('/index.php/publicknowledge');
                await idle(page);
                await pause(500);
                out[key] = await page.locator('.highlights img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), naturalWidth: e.naturalWidth})));
                await shot(page, `${label}-highlight-${key}`);
            };

            // Steps 1-3: the control.
            await openTab();
            await page.locator('.highlightsListPanel').getByRole('button', {name: 'Add Highlight', exact: true}).click();
            let d = panel('Add Highlight');
            await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
            await rich(d, 'highlight-title-control-en', 'Spring issue');
            await rich(d, 'highlight-description-control-en', 'Read the spring issue.');
            await d.locator('#highlight-url-control').fill('https://example.org/');
            await d.locator('#highlight-urlText-control-en').fill('Read');
            out.addUpload = await putImage(d, file('photo.png'));
            out.addSave = await save(d);
            out.highlightId = hlId();
            out.addStored = out.highlightId && stored(out.highlightId);
            out.filesAfterAdd = ls(hlDir);
            await home('homeAfterAdd');

            // Step 4: replace the picture with photo.jpg.
            d = await editOpen();
            out.editOpened = await readPanel(d);
            const remove = imageField(d).getByRole('button', {name: 'Remove', exact: true});
            if (await remove.isVisible().catch(() => false)) await remove.click();
            await pause(400);
            out.jpgUpload = await putImage(d, file('photo.jpg'));
            out.jpgSave = await save(d);
            out.panelOpenAfterSave = await d.isVisible().catch(() => false);
            out.panelAfterSave = await readPanel(d).catch((e) => String(e).slice(0, 200));
            out.errorUnderImage = flat(await imageField(d).locator('.pkpFieldError').allInnerTexts().catch(() => []));
            await shot(page, `${label}-highlight-after-save`);
            out.jpgStored = stored(out.highlightId);
            out.filesAfterJpg = ls(hlDir);

            // Step 5: close, reload, reopen.
            d = await editOpen();
            out.reopened = await readPanel(d);
            await shot(page, `${label}-highlight-reopened`);

            // Step 6: the home page.
            await home('homeAfterJpg');

            // Neighbour: a correctly named PNG replaces the picture.
            d = await editOpen();
            const remove2 = imageField(d).getByRole('button', {name: 'Remove', exact: true});
            if (await remove2.isVisible().catch(() => false)) await remove2.click();
            await pause(400);
            out.nbUpload = await putImage(d, file('photo2.png'));
            out.nbSave = await save(d);
            out.nbStored = stored(out.highlightId);
            out.filesAfterNb = ls(hlDir);
            await home('homeAfterNb');
            out.serverLog = log.since(from);
        }

        // ---------------------------------------------------------------- Finding 2
        if (PARTS.includes('category')) {
            const out = (facts.parts.category = {});
            if (facts.line !== 'main') {
                out.skipped = 'stable lines have no category API (legacy CategoryForm)';
            } else {
                const from = log.mark();
                const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
                const tab = new CategoriesTab(page, 'publicknowledge', {locale: 'en'});
                const make = async (key, name, catPath, f) => {
                    const o = (out[key] = {});
                    await tab.goto();
                    const w = await tab.openAdd();
                    await w.nameBox('en').fill(name);
                    await w.pathBox().fill(catPath);
                    o.upload = (await w.uploadCover({name: f.name, mimeType: f.mimeType, buffer: f.buffer})).status();
                    const r = await w.save();
                    o.save = r.status();
                    await idle(page);
                    const catId = Number(sql(app, `select category_id from categories where path = '${catPath}' and context_id = ${cid}`).trim()) || null;
                    o.categoryId = catId;
                    o.stored = catId && JSON.parse(sql(app, `select image from categories where category_id = ${catId}`).trim() || 'null');
                    o.files = ls(publicDir).filter((n) => /category/.test(n) && catId && n.startsWith(`${catId}-`));
                    // The "Edit Category" window's preview.
                    await tab.goto();
                    await tab.rowAction(name, 'Edit');
                    const ew = page.getByRole('dialog', {name: 'Edit Category'}).last();
                    await ew.locator('#editCategory-path-control').waitFor({timeout: T});
                    await idle(page);
                    await pause(1000);
                    o.editPreview = await ew.locator('.pkpFormField--uploadImage img, .pkpFormField--upload__preview img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), naturalWidth: e.naturalWidth})));
                    await shot(page, `${label}-category-${key}-edit`);
                    // The category's public page and its two image addresses.
                    await page.goto(`/index.php/publicknowledge/${CATALOG_WORD[app.name]}/category/${catPath}`);
                    await idle(page);
                    o.pageThumbnail = await page.locator('.about_section .cover img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), naturalWidth: e.naturalWidth})));
                    const full = await page.request.get(`/index.php/publicknowledge/${CATALOG_WORD[app.name]}/fullSize?type=category&id=${catId}`);
                    o.fullSize = {status: full.status(), type: full.headers()['content-type'], disposition: full.headers()['content-disposition']};
                    if (o.stored && o.stored.uploadName) {
                        const pub = await page.request.get(`/${path.relative(app.root, publicDir)}/${o.stored.uploadName}`);
                        o.publicFile = {status: pub.status(), type: pub.headers()['content-type']};
                    }
                    await shot(page, `${label}-category-${key}-page`);
                };
                await make('png', 'Maps', 'maps', file('photo.png'));
                await make('nbJpgName', 'Maps JPG', 'mapsjpg', file('photo.jpg'));
                out.serverLog = log.since(from);
            }
        }

        // ---------------------------------------------------------------- Finding 3 and the question
        if (PARTS.includes('version') || PARTS.includes('question')) {
            await settingsPage();
        }
        if (PARTS.includes('version')) {
            const out = (facts.parts.version = {submissionId: SUBMISSION[app.name]});
            const from = log.mark();
            const sid = SUBMISSION[app.name];
            const rows = () => sql(app, `select publication_id || ':' || status from publications where submission_id = ${sid} order by 1`).split('\n').filter(Boolean);
            out.before = rows();
            // The report's Steps: the console snippet, as written there (this app's id, stage and section key).
            out.snippet = snippet(app, facts.line);
            out.snippetLog = await page.evaluate(async (code) => {
                const logs = [];
                const log = {log: (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))};
                await new Function('console', `return (async () => {\n${code}\n})();`)(log);
                return logs;
            }, out.snippet);
            out.afterSnippet = rows();
            const newest = Number(out.afterSnippet[out.afterSnippet.length - 1].split(':')[0]);
            out.strayCoverSetting = sql(app, `select setting_value from publication_settings where publication_id = ${newest} and setting_name = 'coverImage'`).trim();
            // The workflow screen the editor sees next.
            await page.goto(`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=${sid}`);
            await idle(page);
            await pause(1500);
            const s = await screen(page);
            out.workflowText = flat(s.text.dialog, 1500);
            await shot(page, `${label}-version-workflow`);
            // Neighbours: the same body with a PNG cover under its own name, and with no cover.
            await settingsPage();
            const cur = (await api(page, 'GET', `submissions/${sid}/publications/${(await api(page, 'GET', `submissions/${sid}`)).json.currentPublicationId}`)).json;
            const sectionKey = app.name === 'omp' ? 'seriesId' : 'sectionId';
            const body = {version: (cur.version || 1) + 1, ...(facts.line === 'main' ? {versionStage: STAGE[app.name], versionMajor: 2, versionMinor: 0} : {}), [sectionKey]: cur[sectionKey], title: cur.title, abstract: cur.abstract};
            const post = async (key, f) => {
                const tmp = f ? await uploadTemp(page, f) : null;
                const r = await api(page, 'POST', `submissions/${sid}/publications`, {body: {...body, ...(tmp ? {coverImage: {en: {temporaryFileId: tmp, altText: ''}}} : {})}});
                out[key] = {status: r.status, answer: r.status >= 400 ? r.json || r.text : {id: r.json.id, coverImage: r.json.coverImage}, after: rows()};
            };
            await post('nbPngCover', file('cover.png'));
            await post('nbNoCover', null);
            out.serverLog = log.since(from);
        }
        if (PARTS.includes('question')) {
            const out = (facts.parts.question = {});
            const sid = SUBMISSION[app.name];
            const pubId = (await api(page, 'GET', `submissions/${sid}`)).json.currentPublicationId;
            const coverSetting = () => sql(app, `select setting_value from publication_settings where publication_id = ${pubId} and setting_name = 'coverImage'`).trim();
            for (const [key, name] of [['pngNamedPng', 'cover.png'], ['pngNamedJpg', 'cover.jpg']]) {
                const tmp = await uploadTemp(page, file(name));
                const r = await api(page, 'PUT', `submissions/${sid}/publications/${pubId}`, {body: {coverImage: {en: {temporaryFileId: tmp, altText: ''}}}});
                out[key] = {status: r.status, answer: r.status >= 400 ? r.json || r.text : r.json.coverImage, stored: coverSetting()};
            }
        }

        // ---------------------------------------------------------------- reach: announcements
        if (PARTS.includes('announcement')) {
            const out = (facts.parts.announcement = {});
            await settingsPage();
            out.enable = (await api(page, 'PUT', `contexts/${cid}`, {body: {enableAnnouncements: true}})).status;
            const add = await api(page, 'POST', 'announcements', {body: {title: {en: 'Call for papers'}, descriptionShort: {en: 'Short.'}, image: {temporaryFileId: await uploadTemp(page, file('photo.png')), altText: ''}}});
            out.add = {status: add.status, image: add.json && add.json.image};
            const aid = add.json && add.json.id;
            const annDir = path.join(publicDir, 'announcements');
            out.filesAfterAdd = ls(annDir);
            const edit = await api(page, 'PUT', `announcements/${aid}`, {body: {title: {en: 'Call for papers'}, image: {temporaryFileId: await uploadTemp(page, file('photo.jpg')), altText: ''}}});
            out.editJpg = {status: edit.status, answer: edit.json || edit.text};
            out.storedAfter = sql(app, `select setting_value from announcement_settings where announcement_id = ${aid} and setting_name = 'image'`).trim();
            out.exists = sql(app, `select count(*) from announcements where announcement_id = ${aid}`).trim();
            out.filesAfterJpg = ls(annDir);
        }
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 2000);
        await shot(page, `${label}-error`).catch(() => {});
    } finally {
        record(`followup-${label}`, facts);
        await close();
    }
});
