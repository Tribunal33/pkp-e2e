// Regression check — pkp/pkp-lib#13512, commit 266505ecd8 on `main` (2196fa2775 on stable-3_5_0),
// "Check settings file types before uploading". PKPContextService::moveTemporaryFile() now takes an
// image setting's extension from getImageExtension() alone and refuses (`return false`) a file of a
// type neither of its lists knows; _saveFileParam() hands that `false` to edit(), which stores it
// over the setting, and the save answers 200. The check takes the report's Steps
// (docs/reports/2026-10-14-pkp-lib-13512.md) on PKP's default test dataset as the journal or press
// manager `rvaca` and records what each screen shows; it asserts nothing, so it runs unchanged on
// the commit's parent (OMP's lib/pkp at 1836046394 while its pointer lags) and with a fix applied.
//
//   npm run reset:ojs -- --dataset 1                     # uploads change the dataset: reload first
//   PROBE_FEATURE=r13512 PROBE_AGENT=<id> node bin/probe.js <ojs|omp|ops> \
//     shared/playwright/checks/sync/pkp-lib-13512/refused-uploads.js
//   PKP_E2E_LINE=stable-3_5_0 … the same on the 3.5 line's dataset fleet.
//
// Steps (Settings › Website › "Appearance"):
//   logo-png   "Setup", "Logo" › "Upload File" logo.png, "Save" (the control: a PNG logo shows).
//   logo-bmp   "Remove" under the logo, "Upload File" logo.bmp, "Save"; reload; the home page.
//   home-bmp   "Homepage Image" (empty in the dataset) › "Upload File" logo.bmp, "Save"; reload;
//              the home page.
//   css-ok     "Advanced", the style sheet's "Upload File" ok.css, "Save"; the home page (green).
//   css-asm    "Remove", "Upload File" asm.css (lib/pkp's symfony exception.css plus one red
//              background rule; PHP's finfo reads it as text/x-asm), "Save"; the home page.
// Neighbour reads, not in the Steps (for the fix trial):
//   css-empty  "Remove", "Upload File" empty.css (0 bytes, finfo application/x-empty), "Save".
//   api-bmp    the PNG logo saved again through the screen, then the settings route the form uses
//              (temporaryFiles, then PUT contexts/{id} as the form sends it) with logo.bmp: the
//              server's own answer when the upload box does not stand in the way.
//   api-thumb  the same route with the app's thumbnail (journalThumbnail, pressThumbnail,
//              serverThumbnail): a PNG, then a BMP over it.
// Every file is made here, in the agent folder's files-<app>/.
//
// Reads fixed when: logo-bmp and home-bmp either store and show the picture or are refused with a
// message on the form (the box's "You can't upload files of this type." or a field error) while
// the PNG logo stays on the journal's pages; css-asm stores asm.css and the home page turns red;
// css-empty, api-bmp and api-thumb's BMP are refused with a message (400) and the earlier value
// stays (fix-ojs.diff, tried 2026-10-14, reads so on OJS).
// Before 266505ecd8 (OMP at 1836046394): logo-bmp, home-bmp and css-asm store and show the file.
// At 266505ecd8: each save answers 200 with no message and the setting becomes [] (the PNG logo
// and the green style sheet are gone from the public pages).
//
// Facts: refused-uploads-<pkp-lib sha>[-fix]-<app>.json. Screenshots: <sha>[-fix]-<step>-form,
// -reload, -home, each with the app's suffix.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, idle, shot, record, sql, serverLog, outDir} = require('../../../probe');

const T = 30_000;
const THUMB = {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'};
const CONTEXT_DIR = {ojs: 'journals', omp: 'presses', ops: 'contexts'};
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

// ---- the files ----

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

function makeFiles(app) {
    const dir = path.join(outDir(), `files-${app.name}`);
    fs.mkdirSync(dir, {recursive: true});
    const exceptionCss = fs.readFileSync(path.join(app.root, 'lib/pkp/lib/vendor/symfony/error-handler/Resources/assets/css/exception.css'), 'utf8');
    const files = {
        'logo.png': png(120, 40, [0, 102, 204]),
        'logo.bmp': bmp(120, 40, [204, 0, 0]),
        'ok.css': 'body { background: rgb(0, 128, 0) !important; }\n',
        'asm.css': `${exceptionCss}\nbody { background: rgb(255, 0, 0) !important; }\n`,
        'empty.css': '',
    };
    const types = {'logo.png': 'image/png', 'logo.bmp': 'image/bmp', 'ok.css': 'text/css', 'asm.css': 'text/css', 'empty.css': 'text/css'};
    const out = {};
    for (const [name, content] of Object.entries(files)) {
        const p = path.join(dir, name);
        fs.writeFileSync(p, content);
        out[name] = {name, mimeType: types[name], buffer: fs.readFileSync(p), path: p};
    }
    // What the server's type detection (finfo) reads for each file, as PKPString::mime_content_type() starts.
    const finfo = execFileSync('php', ['-r', 'foreach (array_slice($argv, 1) as $f) echo basename($f), "=", (new finfo(FILEINFO_MIME_TYPE))->file($f), "\\n";', ...Object.values(out).map((f) => f.path)], {encoding: 'utf8'});
    return {files: out, finfo: Object.fromEntries(finfo.trim().split('\n').map((l) => l.split('=')))};
}

// ---- the check ----

forEachApp(async (app) => {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const sha = execFileSync('git', ['-C', path.join(path.resolve(app.root), 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim();
    const fixed = fs.existsSync(path.join(app.root, '.pkp-e2e-fix.json'));
    const label = `${sha}${fixed ? '-fix' : ''}`;
    const {files, finfo} = makeFiles(app);
    const facts = {app: app.name, line: app.line || 'main', libPkp: sha, fixApplied: fixed ? JSON.parse(fs.readFileSync(path.join(app.root, '.pkp-e2e-fix.json'), 'utf8')).diff || true : false, finfo, steps: {}};

    const {table, id, settings} = app.contextTables;
    const cid = Number(sql(app, `select ${id} from ${table} where path = 'publicknowledge'`).trim());
    const setting = (name) =>
        sql(app, `select locale || '=' || setting_value from ${settings} where ${id} = ${cid} and setting_name = '${name}' order by locale`)
            .split('\n')
            .filter(Boolean);
    const publicDir = path.join(app.root, app.dataset ? `public-ds${app.dataset}` : 'public', CONTEXT_DIR[app.name], String(cid));
    const disk = () => (fs.existsSync(publicDir) ? fs.readdirSync(publicDir).filter((f) => !/category/.test(f)).sort() : []);
    const stored = () => ({pageHeaderLogoImage: setting('pageHeaderLogoImage'), homepageImage: setting('homepageImage'), styleSheet: setting('styleSheet')});
    facts.context = {path: 'publicknowledge', id: cid, publicDir: path.relative(process.cwd(), publicDir)};
    facts.datasetBefore = {settings: stored(), disk: disk()};
    const log = serverLog(app);
    const logFrom = log.mark();

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca', {contextPath: 'publicknowledge'});
        const ws = new WebsiteSettings(page, 'publicknowledge', {thumbnailField: THUMB[app.name]});

        /** "Upload File" and a file: the upload's answer, or the box's own refusal. */
        const choose = async (box, file) => {
            const handledBefore = await box.handledUploads.count();
            const answered = page
                .waitForResponse((r) => /\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000})
                .then((r) => ({status: r.status()}))
                .catch(() => null);
            const chooser = page.waitForEvent('filechooser', {timeout: T});
            await box.uploadButton.click();
            await (await chooser).setFiles({name: file.name, mimeType: file.mimeType, buffer: file.buffer});
            const refused = box.refusal.waitFor({state: 'visible', timeout: 15_000}).then(() => 'refused').catch(() => null);
            const first = await Promise.race([answered, refused]);
            if (first === 'refused') return {refusedByBox: flat(await box.refusal.innerText())};
            const a = await answered;
            // Neither an upload nor the known refusal: the box's own words, read as a refusal.
            if (!a) return {upload: null, refusedByBox: flat(await box.field.innerText()) || 'no upload sent'};
            await box.handledUploads.nth(handledBefore).waitFor({state: 'attached', timeout: T}).catch(() => {});
            return {upload: a.status, refusedByBox: (await box.refusal.isVisible()) ? flat(await box.refusal.innerText()) : null};
        };

        /** Remove what the box holds (as a manager replaces a file), choose the file, "Save" unless the box refused it. */
        const step = async (key, form, box, file) => {
            const out = (facts.steps[key] = {file: file.name, finfo: finfo[file.name]});
            if (await box.preview.isVisible()) {
                await box.removeButton.click();
                out.removedFirst = true;
            }
            Object.assign(out, await choose(box, file));
            if (out.refusedByBox) {
                out.saved = 'not pressed: the box refused the file';
                await shot(page, `${label}-${key}-form`);
                return out;
            }
            const resp = await form.pressSave();
            out.saveStatus = resp.status();
            let body = null;
            try {
                body = await resp.json();
            } catch (e) {
                body = null;
            }
            out.saveAnswer = body ? {pageHeaderLogoImage: body.pageHeaderLogoImage, homepageImage: body.homepageImage, styleSheet: body.styleSheet, errors: body.errors || (resp.status() >= 400 ? body : undefined)} : null;
            // "Saved" shows beside the button for a moment after a 200; a refusal shows red text under the box.
            out.savedShown = await form.savedStatus.waitFor({state: 'visible', timeout: 6_000}).then(() => true).catch(() => false);
            out.formStatus = (await form.form.locator('.pkpFormPage__status').allInnerTexts()).map(flat).filter(Boolean);
            out.fieldErrors = (await form.form.locator('.pkpFieldError').allInnerTexts()).map(flat).filter(Boolean);
            out.errorSummary = (await form.errorSummary.count()) ? flat(await form.errorSummary.first().innerText()) : null;
            out.boxShowsPicture = (await box.thumbnail.count()) ? await box.thumbnail.first().evaluate((i) => ({src: (i.getAttribute('src') || '').slice(0, 80), naturalWidth: i.naturalWidth})) : null;
            out.boxFileName = (await box.fileName.count()) ? flat(await box.fileName.first().innerText()) : null;
            await shot(page, `${label}-${key}-form`);
            return out;
        };

        /** The box after a reload of the settings page. */
        const reloadRead = async (key, tab, boxOf) => {
            await ws.goto();
            const form = await ws.open(tab);
            const box = boxOf(form);
            facts.steps[key].afterReload = {
                previewShown: await box.preview.isVisible(),
                picture: (await box.thumbnail.count()) ? await box.thumbnail.first().evaluate((i) => ({src: (i.getAttribute('src') || '').slice(0, 80), naturalWidth: i.naturalWidth})) : null,
                fileName: (await box.fileName.count()) ? flat(await box.fileName.first().innerText()) : null,
                uploadOffered: await box.uploadButton.isVisible(),
            };
            await shot(page, `${label}-${key}-reload`);
        };

        /** The journal's home page: the header's logo or name, the homepage image, the linked style sheet, the background. */
        const homeRead = async (key) => {
            await page.goto('/index.php/publicknowledge');
            await idle(page);
            const pub = await page.evaluate(() => {
                const logo = document.querySelector('.pkp_site_name img');
                const home = document.querySelector('img[src*="homepageImage_"]');
                return {
                    headerLogo: logo ? {src: logo.getAttribute('src'), naturalWidth: logo.naturalWidth} : null,
                    headerText: (document.querySelector('.pkp_site_name') || {}).innerText || null,
                    homepageImage: home ? {src: home.getAttribute('src'), naturalWidth: home.naturalWidth} : null,
                    styleSheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')).filter((h) => /styleSheet/.test(h)),
                    bodyBackground: getComputedStyle(document.body).backgroundColor,
                };
            });
            pub.headerText = flat(pub.headerText);
            facts.steps[key].home = pub;
            await shot(page, `${label}-${key}-home`);
        };

        const setupBox = {logo: (f) => f.logo(), homepage: (f) => f.homepageImage()};

        // logo-png: the control.
        await ws.goto();
        let setup = await ws.open('appearance-setup');
        await step('logo-png', setup, setup.logo(), files['logo.png']);
        facts.steps['logo-png'].stored = setting('pageHeaderLogoImage');
        await homeRead('logo-png');

        // logo-bmp: a BMP over the PNG.
        await ws.goto();
        setup = await ws.open('appearance-setup');
        await step('logo-bmp', setup, setup.logo(), files['logo.bmp']);
        facts.steps['logo-bmp'].stored = setting('pageHeaderLogoImage');
        facts.steps['logo-bmp'].disk = disk();
        await reloadRead('logo-bmp', 'appearance-setup', setupBox.logo);
        await homeRead('logo-bmp');

        // home-bmp: a BMP homepage image, nothing stored before.
        await ws.goto();
        setup = await ws.open('appearance-setup');
        await step('home-bmp', setup, setup.homepageImage(), files['logo.bmp']);
        facts.steps['home-bmp'].stored = setting('homepageImage');
        facts.steps['home-bmp'].disk = disk();
        await reloadRead('home-bmp', 'appearance-setup', setupBox.homepage);
        await homeRead('home-bmp');

        // The style sheet: ok.css (control), asm.css over it, then empty.css (neighbour).
        for (const [key, name] of [['css-ok', 'ok.css'], ['css-asm', 'asm.css'], ['css-empty', 'empty.css']]) {
            await ws.goto();
            const adv = await ws.open('advanced');
            await step(key, adv, adv.styleSheet, files[name]);
            facts.steps[key].stored = setting('styleSheet');
            facts.steps[key].disk = disk();
            if (key !== 'css-ok') await reloadRead(key, 'advanced', (f) => f.styleSheet);
            await homeRead(key);
        }

        // api-bmp: the PNG logo again through the screen, then the BMP through the form's own route.
        await ws.goto();
        setup = await ws.open('appearance-setup');
        await step('api-png', setup, setup.logo(), files['logo.png']);
        facts.steps['api-png'].stored = setting('pageHeaderLogoImage');
        /** The settings route the form uses: temporaryFiles, then PUT contexts/{id} with that file for one setting in English. */
        const apiSave = (prop, file) =>
            page.evaluate(
                async ({prop, name, type, b64, contextId}) => {
                    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                    const api = window.pkp.context.apiBaseUrl;
                    const token = window.pkp.currentUser.csrfToken;
                    const fd = new FormData();
                    fd.append('file', new File([bytes], name, {type}));
                    const up = await fetch(`${api}temporaryFiles`, {method: 'POST', body: fd, headers: {'X-Csrf-Token': token}});
                    const upBody = await up.json();
                    const put = await fetch(`${api}contexts/${contextId}`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'X-Http-Method-Override': 'PUT', 'X-Csrf-Token': token},
                        body: JSON.stringify({[prop]: {en: {temporaryFileId: upBody.id, altText: ''}}}),
                    });
                    const text = await put.text();
                    let json = null;
                    try {
                        json = JSON.parse(text);
                    } catch (e) {
                        json = null;
                    }
                    return {upload: up.status, put: put.status, answer: json ? (json.errors || json[prop] || json) : text.slice(0, 300)};
                },
                {prop, name: file.name, type: file.mimeType, b64: file.buffer.toString('base64'), contextId: cid}
            );
        facts.steps['api-bmp'] = await apiSave('pageHeaderLogoImage', files['logo.bmp']);
        facts.steps['api-bmp'].stored = setting('pageHeaderLogoImage');
        facts.steps['api-bmp'].disk = disk();
        await homeRead('api-bmp');

        // api-thumb: the app's thumbnail (saved by the app's own Context::edit hook, outside
        // PKPContextService::validate()): a PNG, then a BMP over it, through the same route.
        const thumb = THUMB[app.name];
        await ws.goto(); // a back-office page: the route needs its context and token
        facts.steps['api-thumb-png'] = await apiSave(thumb, files['logo.png']);
        facts.steps['api-thumb-png'].stored = setting(thumb);
        facts.steps['api-thumb-bmp'] = await apiSave(thumb, files['logo.bmp']);
        facts.steps['api-thumb-bmp'].stored = setting(thumb);
        facts.steps['api-thumb-bmp'].disk = disk();
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 2000);
        await shot(page, `${label}-error`).catch(() => {});
    } finally {
        facts.serverLog = log.since(logFrom);
        record(`refused-uploads-${label}`, facts);
        await close();
    }
});
