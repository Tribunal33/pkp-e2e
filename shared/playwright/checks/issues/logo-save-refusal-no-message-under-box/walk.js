// Issue report docs/issues/U10-A16-logo-save-refusal-no-message-under-box.md (spec U10 A16): a
// picture of a type the server does not take (a BMP) is refused when the Setup form is saved, and
// the refusal's message shows nowhere under the box. Walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`, as the
// manager rvaca. The kit builds nothing; the pictures are made in memory (lib.js).
//
//   1. sign in as rvaca
//   2. Settings › Website › "Appearance" › "Setup"
//   3. "Logo" › "Upload File": logo.bmp
//   4. "Save"
//   5. the box and the form's foot
//   6. reload; "Homepage Image" › "Upload File": logo.bmp, "Save", the box and the foot
//
// MODE=nb runs the neighbour alone (with the fix in and out): a PNG "Logo" saved the same way
// (must still read "Saved"), and a BMP in the French "Logo" box (the message, with the fix, under
// the French box only). MODE=nbfr runs the French box alone.
// MODE=types: an SVG and a WebP "Logo" saved the same way (steps 1–5 with logo.svg, logo.webp).
// MODE=mixed: one save holding an accepted picture and a refused one: "Homepage Image" › home.png
// and "Logo" › logo.bmp, "Save"; then, on the same page, "Logo" › "Remove", logo.png, "Save"
// again; the public folder and the stored settings read after each save.
//
// Reset first:  npm run fleet-prep -- --feature issues-h20a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-h20a PROBE_AGENT=h20a node bin/probe.js all shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h20a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h20a-3_5 PROBE_AGENT=h20a node bin/probe.js all shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/walk.js
// Facts: .reports/<feature>/h20a/save-refusal-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const fs = require('fs');
const path = require('path');
const THUMB = {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'};
const CONTEXT_DIR = {ojs: 'journals', omp: 'presses', ops: 'contexts'};

forEachApp(async (app) => {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const fact = (k, v) => { record('save-refusal-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1200)); };
    const f = L.files();
    const {table, id, settings} = app.contextTables;
    const cid = Number(sql(app, `select ${id} from ${table} where path = 'publicknowledge'`).trim());
    const setting = (name) => sql(app, `select locale || '=' || setting_value from ${settings} where ${id} = ${cid} and setting_name = '${name}' order by locale`).split('\n').filter(Boolean);
    fact(`${MODE}-before`, {contextId: cid, pageHeaderLogoImage: setting('pageHeaderLogoImage'), homepageImage: setting('homepageImage')});
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
    try {
        await signIn(page, 'rvaca', {contextPath: 'publicknowledge'});                       // 1
        const ws = new WebsiteSettings(page, 'publicknowledge', {thumbnailField: THUMB[app.name]});

        /** Steps 2–5 for one box: open Setup, choose the file, "Save", read the form. */
        const step = async (key, boxOf, file, {french = false, alsoRead = null} = {}) => {
            const out = {file: file.name};
            try {
                await ws.goto();                                                                 // 2
                const setup = await ws.open('appearance-setup');
                if (french) {
                    const btn = setup.form.locator('.pkpFormLocales button').filter({hasText: /French|Fran/});
                    out.languageButton = L.flat(await btn.first().innerText());
                    await btn.first().click();
                }
                const box = boxOf(setup);
                if (await box.preview.isVisible()) { await box.removeButton.click(); out.removedFirst = true; }
                out.upload = await box.choose(file);                                             // 3
                const from = log.mark();
                const resp = await setup.pressSave();                                            // 4
                out.saveStatus = resp.status();
                out.saveUrl = resp.url().replace(/^https?:\/\/[^/]+/, '');
                const text = await resp.text().catch(() => '');
                out.saveAnswer = resp.status() >= 400 ? text.slice(0, 400) : '(200: the context)';
                Object.assign(out, await L.readForm(setup, box));                                // 5
                if (alsoRead) out.alsoRead = {box: alsoRead.label, ...(await L.readForm(setup, alsoRead.of(setup)))};
                out.serverLog = log.since(from).slice(0, 6);
                record(`${MODE}-${key}`, await screen(page));
                await shot(page, `${MODE}-${key}`);
            } catch (e) {
                out.FAILED = String(e.stack || e).split('\n').slice(0, 5).join(' | ');
                await shot(page, `${MODE}-${key}-failed`).catch(() => {});
            }
            out.pageErrors = pageErrors.splice(0);
            out.stored = {pageHeaderLogoImage: setting('pageHeaderLogoImage'), homepageImage: setting('homepageImage')};
            fact(`${MODE}-${key}`, out);
        };

        const publicDir = path.join(app.root, app.dataset ? `public-ds${app.dataset}` : 'public', CONTEXT_DIR[app.name], String(cid));
        const disk = () => (fs.existsSync(publicDir) ? fs.readdirSync(publicDir).filter((n) => !/category|index/.test(n)).sort() : []);
        const tmpFiles = () => sql(app, `select count(*) from temporary_files`).trim();
        if (MODE === 'mixed') {
            const out = {};
            try {
                await ws.goto();
                const setup = await ws.open('appearance-setup');
                const home = setup.homepageImage();
                const logo = setup.logo();
                out.homeUpload = await home.choose(f.home);
                out.logoUpload = await logo.choose(f.bmp);
                out.tmpFilesBefore = tmpFiles();
                let resp = await setup.pressSave();
                out.save1 = {status: resp.status(), answer: (await resp.text().catch(() => '')).slice(0, 400), logo: await L.readForm(setup, logo), home: await L.readForm(setup, home)};
                out.save1.disk = disk();
                out.save1.tmpFiles = tmpFiles();
                out.save1.stored = {pageHeaderLogoImage: setting('pageHeaderLogoImage'), homepageImage: setting('homepageImage')};
                record('mixed-save1', await screen(page));
                await shot(page, 'mixed-save1');
                await logo.removeButton.click();
                out.logoUpload2 = await logo.choose(f.png);
                resp = await setup.pressSave();
                out.save2 = {status: resp.status(), answer: (await resp.text().catch(() => '')).slice(0, 400), logo: await L.readForm(setup, logo), home: await L.readForm(setup, home)};
                out.save2.disk = disk();
                out.save2.stored = {pageHeaderLogoImage: setting('pageHeaderLogoImage'), homepageImage: setting('homepageImage')};
                record('mixed-save2', await screen(page));
                await shot(page, 'mixed-save2');
            } catch (e) {
                out.FAILED = String(e.stack || e).split('\n').slice(0, 5).join(' | ');
                await shot(page, 'mixed-failed').catch(() => {});
            }
            out.pageErrors = pageErrors.splice(0);
            fact('mixed', out);
        } else if (MODE === 'types') {
            await step('logo-svg', (s) => s.logo(), f.svg);
            await step('logo-webp', (s) => s.logo(), f.webp);
        } else if (MODE === 'nb' || MODE === 'nbfr') {
            if (MODE === 'nb') await step('logo-png', (s) => s.logo(), f.png);
            await step('logo-bmp-fr', (s) => s.logo('fr_CA'), f.bmp, {french: true, alsoRead: {label: 'Logo (English)', of: (s) => s.logo('en')}});
        } else {
            await step('logo-bmp', (s) => s.logo(), f.bmp);
            await step('home-bmp', (s) => s.homepageImage(), f.bmp);                           // 6
        }
    } finally {
        await close();
    }
});
