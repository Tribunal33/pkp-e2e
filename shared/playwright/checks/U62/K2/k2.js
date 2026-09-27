const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U62 claim check, chunk K2: a plugin's links, upload, upgrade and delete.
// Spec docs/specs/U62-plugins-management.md: Fields 66–79, Rules 13–21 (172–250), Side effects 294–296,
// register A2, A3, A4, A5, A7; footnotes j, k, l, m, n, td8–td17, f-a2..f-a7.
//
//   PROBE_FEATURE=U62 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U62/K2/k2.js
//   PHASES=seed,links,site,windows,install,refuse,upgrade,fail,delete,final (default all, in order; state in
//   k2-state-<app>.json in the output folder, delete it for a fresh seed).
//
// Fleet-global state: an uploaded plugin lands in checkouts/<app>/plugins/generic/<product> and shows on every
// list of that app, so nothing else may drive the fleet while this runs. Only the scratch plugins built by
// pkg.js (u62k2test, u62k2on) are ever installed, upgraded, failed or deleted; the shipped Web Feed package is
// only uploaded where the code refuses it before any file is copied (fn-l, fn-m). `final` deletes whatever of
// ours is still installed and reads `git status -- plugins` of the app and of lib/pkp: both must be empty.
// Scratch contexts per app: A (every manager level plus the Site Administrator), B (a second journal with its
// own Journal Manager). Site-list ticks are put back before the phase ends. No assertions: the script records,
// the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir} = require('../../../probe');
const G = require('../K1/grid');
const {T, sleep, flat, rel, DENIED, snap, readGrid, brief, findRow, rowLoc, openWebsitePlugins, rowLinks, tabStrips} = G;
const PKG = require('./pkg');

const ALL = ['seed', 'links', 'site', 'windows', 'install', 'refuse', 'upgrade', 'fail', 'delete', 'final'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const OURS = ['u62k2testplugin', 'u62k2onplugin'];

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const P = PKG.build(outDir(), app.name, path.resolve(app.root));
    const {page, close} = await launch(app);
    // Our own dialog listener decides alone (kit: beforeunload accepted, others per `dialogAnswer`).
    let dialogAnswer = 'dismiss';
    const browserDialogs = [];
    page.on('dialog', (d) => {
        browserDialogs.push({type: d.type(), message: flat(d.message(), 300), answer: d.type() === 'beforeunload' ? 'accept' : dialogAnswer});
        (d.type() === 'beforeunload' || dialogAnswer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    const sect = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); } save(); };
    const go = async (u) => { let st = null; try { const r = await page.goto(app.url(u)); st = r && r.status(); } catch (e) { st = flat(e.message, 100); } await idle(page).catch(() => {}); return st; };
    const grid = () => page.locator(G.GRID).first();
    const rowIds = (g) => (g && g.found ? g.cats.flatMap((c) => c.rows.map((r) => r.id)) : []);
    const catCount = (g, id) => { const c = g && g.found && g.cats.find((x) => x.id === id); return c ? c.heading : null; };
    const pluginsDir = (sub = '') => path.join(path.resolve(app.root), sub, 'plugins');
    const ourFolders = () => ['generic/u62k2test', 'generic/u62k2on'].filter((f) => fs.existsSync(path.join(pluginsDir(), f)));
    const versions = () => {
        try {
            return execFileSync('psql', ['-h', '127.0.0.1', '-U', 'jarda', '-d', `${dbName(app.name)}`, '-Atc', "select product, major||'.'||minor||'.'||revision||'.'||build, current from versions where product like 'u62k2%' order by 1,2"], {env: {...process.env, PGPASSWORD: 'jarda'}}).toString().trim().split('\n').filter(Boolean);
        } catch (e) { return `psql failed: ${flat(e.message, 120)}`; }
    };

    /** The site's list: Administration › Site Settings › Plugins › Installed Plugins. */
    const openSiteList = async () => {
        const o = {status: await go('/index.php/index/admin/settings')};
        o.url = rel(page.url());
        const pt = page.locator('#plugins-button').first();
        o.pluginsTab = await pt.count() > 0;
        if (o.pluginsTab) {
            await pt.click(); await idle(page).catch(() => {});
            await page.locator('#installedPlugins-button').first().click().catch(() => {}); await idle(page).catch(() => {});
            await grid().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await sleep(400);
        }
        return o;
    };
    const openList = async (where) => (where === 'site' ? openSiteList() : openWebsitePlugins(page, app, where));

    /** Toasts that were not on screen before `before` (a list of texts), within ms. */
    const toastTexts = async () => page.locator('.app__notifications .pkpNotification, .pkpNotification').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    const newToasts = async (before, ms = 10000) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            const now = await toastTexts();
            const left = [...before];
            const fresh = now.filter((t) => { const i = left.indexOf(t); if (i >= 0) { left.splice(i, 1); return false; } return true; });
            if (fresh.length) {
                const where = await page.locator('.pkpNotification').last().evaluate((e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), right: Math.round(window.innerWidth - r.right), cls: String(e.className).slice(0, 80)}; }).catch(() => null);
                return {texts: fresh, where};
            }
            await sleep(150);
        }
        return {texts: [], where: null};
    };

    /** The window as data: heading, lines, field label, uploader, buttons and links. */
    const readWindow = async (dlg) => dlg.evaluate((d) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (el) => !!(el && el.offsetParent !== null);
        const form = d.querySelector('form');
        return {
            heading: txt(d.querySelector('h1, h2')),
            formParagraphs: form ? [...form.querySelectorAll('p')].map(txt).filter((x) => x !== null) : null,
            lines: form ? [...form.querySelectorAll('p')].map(txt).filter(Boolean) : null,
            label: txt(form && form.querySelector('.label, legend, label')),
            required: !!(form && form.querySelector('.req, .required, span.req')),
            labelHtml: form && form.querySelector('.label, legend') ? form.querySelector('.label, legend').innerHTML.replace(/\s+/g, ' ').trim().slice(0, 200) : null,
            dropText: txt(d.querySelector('.pkp_uploader_drop_zone_label, .pkpUploaderDropZone')),
            uploaderButtons: [...d.querySelectorAll('.pkp_uploader_button, #plupload button, .pkp_controller_fileUpload button')].filter(vis).map(txt),
            uploaderText: txt(d.querySelector('.pkp_controller_fileUpload, #plupload')),
            uploaderError: txt(d.querySelector('.pkpUploaderError')),
            fileInputs: d.querySelectorAll('input[type=file]').length,
            temporaryFileId: (d.querySelector('input[name=temporaryFileId]') || {}).value || '',
            buttons: [...d.querySelectorAll('button')].filter(vis).map(txt).filter(Boolean),
            links: [...d.querySelectorAll('a')].filter(vis).map(txt).filter(Boolean),
            afterForm: [...d.querySelectorAll('p')].filter((p) => !form || !form.contains(p)).map(txt).filter(Boolean),
            errors: [...d.querySelectorAll('.error, label.error, .pkp_form_error, .pkpFormError, .pkpNotification, .pkp_notification')].filter(vis).map(txt).filter(Boolean),
        };
    });

    const winName = (via) => (via === 'upload' ? 'Upload A New Plugin' : 'Upgrade Plugin');
    const winLoc = (via) => page.getByRole('dialog', {name: winName(via)});

    /** Open "Upload A New Plugin" (header link) or a row's "Upgrade"; returns the dialog locator. */
    const openWindow = async (via, rowId) => {
        if (via === 'upload') {
            await grid().locator('.header .actions a').filter({hasText: 'Upload A New Plugin'}).first().click();
        } else {
            const row = rowLoc(page, rowId);
            await row.waitFor({timeout: T});
            if (await row.locator('a.show_extras').count()) { await row.locator('a.show_extras').first().click(); await sleep(400); }
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Upgrade', exact: true}).click();
        }
        const dlg = winLoc(via);
        await dlg.waitFor({timeout: T});
        await dlg.locator('input[type=file]').first().waitFor({state: 'attached', timeout: T});
        await idle(page).catch(() => {});
        return dlg;
    };

    /** Put a file in the window: through the file field, or dropped on the drop area. */
    const putFile = async (dlg, file, {drop = false} = {}) => {
        const o = {file: path.basename(file), drop};
        const resps = [];
        const onResp = (r) => { if (/upload-?plugin-?file/i.test(r.url())) resps.push(r.text().then((t) => `${r.status()} ${flat(t, 300)}`).catch(() => `${r.status()}`)); };
        page.on('response', onResp);
        if (drop) {
            const b64 = fs.readFileSync(file).toString('base64');
            const name = path.basename(file);
            o.dropped = await dlg.locator('.pkp_uploader_drop_zone').first().evaluate((zone, [b, n]) => {
                const bytes = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
                const dt = new DataTransfer();
                dt.items.add(new File([bytes], n, {type: n.endsWith('.txt') ? 'text/plain' : 'application/gzip'}));
                for (const type of ['dragenter', 'dragover', 'drop']) zone.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: dt}));
                return {zone: zone.className};
            }, [b64, name]).catch((e) => `drop failed: ${flat(e.message, 150)}`);
        } else {
            await dlg.locator('input[type=file]').first().setInputFiles(file);
        }
        const tf = dlg.locator('input[name=temporaryFileId]');
        const end = Date.now() + 20000;
        while (Date.now() < end && !(await tf.inputValue().catch(() => '')) && !resps.length) await sleep(200);
        await sleep(800);
        page.off('response', onResp);
        o.uploadResponses = await Promise.all(resps);
        o.temporaryFileId = await tf.inputValue().catch(() => null);
        o.window = await readWindow(dlg);
        return o;
    };

    /** Press the window's "Save"; what was sent, what came back, the notice, and whether the window stayed. */
    const pressSave = async (dlg, via) => {
        const o = {};
        const before = await toastTexts();
        const sent = [];
        const bodies = [];
        const onReq = (r) => { if (/save-?upload-?plugin/i.test(r.url())) sent.push(`${r.method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrfToken=…')}`); };
        const onResp = (r) => { if (/save-?upload-?plugin/i.test(r.url())) bodies.push(r.text().then((t) => `${r.status()} ${flat(t, 500)}`).catch(() => `${r.status()}`)); };
        page.on('request', onReq); page.on('response', onResp);
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        const t = await newToasts(before, 12000);
        await sleep(600);
        await idle(page).catch(() => {});
        page.off('request', onReq); page.off('response', onResp);
        o.sent = sent;
        o.responses = await Promise.all(bodies);
        o.toast = t.texts; o.toastWhere = t.where;
        o.windowOpen = await winLoc(via).isVisible().catch(() => false);
        if (o.windowOpen) o.windowAfter = await readWindow(winLoc(via)).catch(() => null);
        return o;
    };

    /** Close the window with its "Close" control (answering any browser question with `answer`). */
    const closeWindow = async (via, answer = 'accept') => {
        dialogAnswer = answer;
        const n0 = browserDialogs.length;
        const d = winLoc(via);
        if (await d.isVisible().catch(() => false)) await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(900);
        dialogAnswer = 'dismiss';
        return {asked: browserDialogs.slice(n0), stillOpen: await d.isVisible().catch(() => false)};
    };

    /** One whole upload: open, put the file, save; snapshots before and after. */
    const upload = async (name, file, {via = 'upload', rowId = null, drop = false} = {}) => {
        const o = {via, rowId};
        const g0 = await readGrid(page);
        o.rowsBefore = rowIds(g0).length;
        o.rowBefore = rowId ? findRow(g0, rowId) : null;
        const dlg = await openWindow(via, rowId);
        o.put = await putFile(dlg, file, {drop});
        await snap(page, `${name}-chosen`, {put: o.put});
        o.save = await pressSave(dlg, via);
        await snap(page, `${name}-after`, {save: o.save});
        if (o.save.windowOpen) o.closed = await closeWindow(via);
        await idle(page).catch(() => {});
        await sleep(500);
        const g1 = await readGrid(page);
        o.rowsAfter = rowIds(g1).length;
        o.addedRows = rowIds(g1).filter((x) => !rowIds(g0).includes(x));
        o.removedRows = rowIds(g0).filter((x) => !rowIds(g1).includes(x));
        o.ours = Object.fromEntries(OURS.map((id) => [id, findRow(g1, id)]));
        if (rowId) o.rowAfter = findRow(g1, rowId);
        o.generic = catCount(g1, 'generic');
        o.folders = ourFolders();
        return o;
    };

    /** Reload the list and read our rows (the read after a reload). */
    const reread = async (where, name) => {
        const o = await openList(where);
        const g = await readGrid(page);
        await snap(page, name, {open: o});
        return {url: rel(page.url()), rows: rowIds(g).length, generic: catCount(g, 'generic'), ours: Object.fromEntries(OURS.map((id) => [id, findRow(g, id)])), headerLinks: g.headerLinks};
    };

    /** Every list of the app at its next load: A as the Site Administrator and as A's manager, B as B's manager, the site. */
    const everyList = async (label, extra = []) => {
        const o = {};
        await as('admin', S.A.path); o.A_admin = await reread(S.A.path, `${label}-A-admin`);
        for (const id of extra) o.A_admin[`links-${id}`] = await rowLinks(page, id);
        await as(S.A.u.mgr, S.A.path); o.A_mgr = await reread(S.A.path, `${label}-A-mgr`);
        for (const id of extra) o.A_mgr[`links-${id}`] = await rowLinks(page, id);
        await as(S.B.mgr, S.B.path); o.B_mgr = await reread(S.B.path, `${label}-B-mgr`);
        await as('admin', S.A.path); o.site = await reread('site', `${label}-site`);
        for (const id of extra) o.site[`links-${id}`] = await rowLinks(page, id);
        o.folders = ourFolders();
        o.versions = versions();
        return o;
    };

    /** A row's "Delete": the confirmation window, "Cancel" first, then "OK". */
    const deleteRow = async (name, id, {cancelFirst = true} = {}) => {
        const o = {};
        const openConfirm = async () => {
            const row = rowLoc(page, id);
            await row.waitFor({timeout: T});
            if (await row.locator('a.show_extras').count()) { await row.locator('a.show_extras').first().click(); await sleep(400); }
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Delete', exact: true}).click();
            const dlg = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure'}).last();
            await dlg.waitFor({timeout: T}).catch(() => {});
            return dlg;
        };
        let dlg = await openConfirm();
        await snap(page, `${name}-confirm`);
        o.window = await dlg.evaluate((d) => ({heading: (d.querySelector('h1, h2, [id^="reka-dialog-title"]') || {}).innerText || null, text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 400), buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)})).catch((e) => `read failed ${flat(e.message, 100)}`);
        await loc(page, 'Delete confirmation: the "OK" button', dlg.getByRole('button', {name: 'OK', exact: true}));
        if (cancelFirst) {
            const sent = [];
            const onReq = (r) => { if (/delete-?plugin/i.test(r.url())) sent.push(r.method()); };
            page.on('request', onReq);
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
            await sleep(1200);
            page.off('request', onReq);
            o.cancel = {sent, rowStill: await rowLoc(page, id).count() > 0, windowOpen: await dlg.isVisible().catch(() => false), folders: ourFolders()};
            await page.waitForTimeout(600);
            // the arrow may still be open: close it before reopening
            const hide = rowLoc(page, id).locator('a.hide_extras');
            if (await hide.count()) { await hide.first().click().catch(() => {}); await sleep(300); }
            dlg = await openConfirm();
        }
        const before = await toastTexts();
        const bodies = [];
        const onResp = (r) => { if (/delete-?plugin/i.test(r.url())) bodies.push(r.text().then((t) => `${r.request().method()} ${r.status()} ${flat(t, 300)}`).catch(() => `${r.status()}`)); };
        page.on('response', onResp);
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const t = await newToasts(before, 12000);
        await idle(page).catch(() => {});
        await sleep(800);
        page.off('response', onResp);
        o.responses = await Promise.all(bodies);
        o.toast = t.texts; o.toastWhere = t.where;
        const g = await readGrid(page);
        o.rowAfterSamePage = findRow(g, id);
        o.folders = ourFolders();
        await snap(page, `${name}-after`, {o});
        return o;
    };

    /** Press a row's box (K1's pressBox) with the window answered OK. */
    const tick = async (id) => G.pressBox(page, id, {answer: 'OK'});

    try {
        // ------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.A) return;
            const t = tag('u62k2');
            const U = (k, roles) => ({username: `${t}${k}`, roles, givenName: `K2${k}`, familyName: `${k.toUpperCase()}${t.slice(-4)}`});
            const aUsers = [U('mgr', ['manager'])];
            if (!isOPS) aUsers.push(U('ed', ['editor']), U('pe', ['productionEditor']));
            const mk = async (k, users) => {
                const p = `${t}${k}`.slice(0, 32);
                const r = await app.api.createContext({tag: p, context: {name: `U62 K2 ${k.toUpperCase()} ${t}`, acronym: `K2${k.toUpperCase()}`}, users});
                log('seed', k, JSON.stringify(r).slice(0, 300));
                return {path: p, name: `U62 K2 ${k.toUpperCase()} ${t}`};
            };
            S.t = t;
            S.A = {...(await mk('a', aUsers)), u: Object.fromEntries(aUsers.map((u) => [u.username.slice(t.length), u.username]))};
            S.B = {...(await mk('b', [U('bmgr', ['manager'])])), mgr: `${t}bmgr`};
            save();
            note(`ccK2 [${app.name}]: scratch contexts A ${S.A.path} (manager levels), B ${S.B.path} (tag ${t})`);
        });
        const A = S.A;

        // ------------------------------------------------------------ links: Rule 13 (td8), every manager level + the Site Administrator
        await sect('links', async () => {
            const o = {};
            const levels = [['mgr', A.u.mgr], ...(A.u.ed ? [['ed', A.u.ed], ['pe', A.u.pe]] : []), ['admin', 'admin']];
            for (const [k, u] of levels) {
                await as(u, A.path);
                const p = await openWebsitePlugins(page, app, A.path);
                const g = await readGrid(page);
                await snap(page, `l-01-${k}-list`, {open: p});
                const r = {headerLinks: g.headerLinks};
                r.withArrow = g.cats.flatMap((c) => c.rows.filter((x) => x.arrow).map((x) => x.id));
                r.noArrow = g.cats.flatMap((c) => c.rows.filter((x) => !x.arrow).map((x) => x.id));
                r.webfeed = await rowLinks(page, 'webfeedplugin');
                r.googlescholar = await rowLinks(page, 'googlescholarplugin');
                const ie = g.cats.find((c) => c.id === 'importexport');
                const rep = g.cats.find((c) => c.id === 'reports');
                r.importexportRows = ie ? ie.rows.map((x) => `${x.id}${x.checked ? '[x]' : '[ ]'}${x.arrow ? '>' : ''}`) : null;
                r.reportRows = rep ? rep.rows.map((x) => `${x.id}${x.checked ? '[x]' : '[ ]'}${x.arrow ? '>' : ''}`) : null;
                if (ie && ie.rows[0]) r.importexport = await rowLinks(page, ie.rows[0].id);
                if (rep && rep.rows[0]) r.report = await rowLinks(page, rep.rows[0].id);
                if (k === 'admin') {
                    for (const id of ['tinymceplugin', 'defaultthemeplugin', 'usageeventplugin', 'customblockmanagerplugin']) r[id] = {row: findRow(g, id), links: await rowLinks(page, id)};
                    const meta = g.cats.filter((c) => ['metadata', 'oaiMetadataFormats'].includes(c.id)).flatMap((c) => c.rows);
                    r.locked = [];
                    for (const m of meta) r.locked.push({id: m.id, checked: m.checked, disabled: m.disabled, links: (await rowLinks(page, m.id)).links});
                    r.lockedAll = g.cats.flatMap((c) => c.rows.filter((x) => x.disabled).map((x) => x.id));
                    await loc(page, 'Installed Plugins: the header link "Upload A New Plugin"', grid().locator('.header .actions a').filter({hasText: 'Upload A New Plugin'}));
                }
                await snap(page, `l-02-${k}-links`);
                o[k] = r;
            }
            // "many show only while the plugin is on": as A's manager, untick Web Feed (and a report plugin), read the links, tick back
            await as(A.u.mgr, A.path);
            await openWebsitePlugins(page, app, A.path);
            const g = await readGrid(page);
            const rep = g.cats.find((c) => c.id === 'reports');
            const ids = ['webfeedplugin', ...(rep && rep.rows[0] ? [rep.rows[0].id] : [])];
            o.onOff = {};
            for (const id of ids) {
                const r = {start: findRow(g, id)};
                r.firstPress = await tick(id);
                r.linksAfterFirst = await rowLinks(page, id);
                await snap(page, `l-03-mgr-${id}-pressed`);
                r.secondPress = await tick(id);
                r.linksAfterSecond = await rowLinks(page, id);
                r.end = findRow(await readGrid(page), id);
                o.onOff[id] = r;
            }
            await snap(page, `l-04-mgr-restored`);
            // where "Import/Export Data" and "Reports" lead
            const follow = async (id, label) => {
                await openWebsitePlugins(page, app, A.path);
                const row = rowLoc(page, id);
                if (!(await row.count())) return {row: false};
                await row.locator('a.show_extras').first().click(); await sleep(400);
                const link = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: label, exact: true});
                if (!(await link.count())) return {link: false};
                const from = page.url();
                const dl = page.waitForEvent('download', {timeout: 15000}).then((d) => d.suggestedFilename()).catch(() => null);
                await link.click();
                const file = await Promise.race([dl, page.waitForURL((u) => u.toString() !== from, {timeout: 15000}).then(() => null).catch(() => null)]);
                const download = file || (page.url() === from ? await dl : null);
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {});
                await sleep(500);
                if (download) { const s2 = await snap(page, `l-05-follow-${id}`); return {download, url: rel(page.url()), title: s2.title}; }
                const s = await snap(page, `l-05-follow-${id}`);
                return {url: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 100), title: s.title};
            };
            const g2 = await readGrid(page).catch(() => null);
            const ie = g.cats.find((c) => c.id === 'importexport');
            if (ie) for (const r of ie.rows.filter((x) => /^(NativeImportExportPlugin|CrossrefExportPlugin)$/.test(x.id))) o[`follow-${r.id}`] = await follow(r.id, 'Import/Export Data');
            if (rep) for (const r of rep.rows) o[`follow-${r.id}`] = await follow(r.id, 'Reports');
            void g2;
            fact('links', o);
            await out();
        });

        // ------------------------------------------------------------ site: Rule 14 (td9)
        await sect('site', async () => {
            const o = {};
            await as('admin', A.path);
            o.open = await openSiteList();
            const g = await readGrid(page);
            await snap(page, 's-01-site-list', {open: o.open});
            o.headerLinks = g.headerLinks;
            o.rows = rowIds(g).length;
            o.withOwnLinks = [];
            o.rowLinks = {};
            for (const c of g.cats) {
                for (const r of c.rows) {
                    const L = await rowLinks(page, r.id);
                    const own = (L.links || []).filter((x) => !['Delete', 'Upgrade'].includes(x));
                    o.rowLinks[r.id] = `${r.checked ? '[x]' : '[ ]'}${r.disabled ? 'L' : ''} ${(L.links || []).join('|')}`;
                    if (own.length) o.withOwnLinks.push({id: r.id, own});
                }
            }
            o.usageEvent = findRow(g, 'usageeventplugin');
            await snap(page, 's-02-site-links');
            // tick "Custom Block Manager", read its links, untick it back
            const cbm = findRow(g, 'customblockmanagerplugin');
            o.cbm = {start: cbm};
            if (cbm && !cbm.checked) {
                o.cbm.tick = await tick('customblockmanagerplugin');
                o.cbm.links = await rowLinks(page, 'customblockmanagerplugin');
                await snap(page, 's-03-site-cbm-ticked');
                o.cbm.untick = await tick('customblockmanagerplugin');
                o.cbm.linksAfter = await rowLinks(page, 'customblockmanagerplugin');
            }
            // tick journal-only plugins on the site's list: the notice, the links; then untick back
            o.journalOnly = {};
            const siteLook = async () => ({text: flat(await page.locator('body').innerText().catch(() => ''), 600), alternate: await page.locator('head link[rel=alternate]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href'))).catch(() => []), blocks: await page.locator('.pkp_block').evaluateAll((bs) => bs.map((b) => b.className)).catch(() => []), nav: await page.locator('nav').allInnerTexts().then((a) => a.map((x) => flat(x, 150))).catch(() => [])});
            await go('/index.php/index');
            o.siteIndexBaseline = await siteLook();
            await snap(page, 's-04a-site-index-baseline');
            await openSiteList();
            for (const id of ['webfeedplugin', 'staticpagesplugin']) {
                const r0 = findRow(await readGrid(page), id);
                if (!r0) { o.journalOnly[id] = 'not listed'; continue; }
                const r = {start: r0};
                if (!r0.checked) {
                    r.tick = await tick(id);
                    r.links = await rowLinks(page, id);
                    await snap(page, `s-04-site-${id}-ticked`);
                    // the site's front page with it ticked
                    const st = await go('/index.php/index');
                    r.siteIndex = {status: st, url: rel(page.url()), ...(await siteLook())};
                    r.siteIndexSame = JSON.stringify({...r.siteIndex, status: undefined, url: undefined}) === JSON.stringify(o.siteIndexBaseline);
                    await snap(page, `s-05-site-index-${id}-ticked`);
                    await openSiteList();
                    r.untick = await tick(id);
                    r.end = findRow(await readGrid(page), id);
                }
                o.journalOnly[id] = r;
            }
            await snap(page, 's-06-site-restored');
            fact('site', o);
            await out();
        });

        // ------------------------------------------------------------ windows: Rule 15 (td10), td11, leaving with a file chosen
        await sect('windows', async () => {
            const o = {};
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            const g0 = await readGrid(page);
            let dlg = await openWindow('upload');
            await snap(page, 'w-01-upload-window');
            o.upload = await readWindow(dlg);
            await loc(page, 'Upload A New Plugin window', dlg);
            await loc(page, 'Upload window: the file input (setInputFiles)', dlg.locator('input[type=file]'));
            await loc(page, 'Upload window: "Save"', dlg.getByRole('button', {name: 'Save', exact: true}));
            await loc(page, 'Upload window: the "Close" control', dlg.getByRole('button', {name: 'Close', exact: true}));
            await loc(page, 'Upload window: the "Cancel" link', dlg.getByRole('link', {name: 'Cancel', exact: true}));
            // td11: Save with no file
            const sent = [];
            const onReq = (r) => { if (/save-?upload-?plugin|upload-?plugin-?file/i.test(r.url())) sent.push(`${r.method()} ${rel(r.url()).replace(/\?.*$/, '')}`); };
            page.on('request', onReq);
            const before = await toastTexts();
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            const t = await newToasts(before, 4000);
            await sleep(500);
            page.off('request', onReq);
            o.saveEmpty = {sent, toast: t.texts, windowOpen: await dlg.isVisible().catch(() => false), window: await readWindow(dlg).catch(() => null)};
            await snap(page, 'w-02-upload-save-empty');
            o.saveEmpty.close = await closeWindow('upload');
            await pastWindow();
            o.saveEmpty.rowsSame = rowIds(await readGrid(page)).join() === rowIds(g0).join();
            // the "Cancel" link
            dlg = await openWindow('upload');
            await dlg.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {});
            await sleep(900);
            o.cancelLink = {windowOpen: await dlg.isVisible().catch(() => false)};
            await pastWindow();
            // a file dropped on the drop area, then the window's "Cancel" link
            dlg = await openWindow('upload');
            o.dropped = await putFile(dlg, P.plain, {drop: true});
            await snap(page, 'w-03-upload-file-dropped', {dropped: o.dropped});
            {
                const n0 = browserDialogs.length;
                dialogAnswer = 'dismiss';
                await dlg.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {});
                await sleep(900);
                o.droppedCancel = {asked: browserDialogs.slice(n0), windowOpen: await dlg.isVisible().catch(() => false)};
                if (o.droppedCancel.windowOpen) o.droppedCancel.close = await closeWindow('upload', 'accept');
            }
            await pastWindow();
            // leave the window with a file chosen through the field and unsaved: "Close", first answered Cancel, then OK
            dlg = await openWindow('upload');
            o.chosen = await putFile(dlg, P.plain);
            o.leaveDismiss = await closeWindow('upload', 'dismiss');
            await snap(page, 'w-04-upload-close-dismissed');
            if (o.leaveDismiss.stillOpen) o.leaveAccept = await closeWindow('upload', 'accept');
            await pastWindow();
            o.afterLeaveRowsSame = rowIds(await readGrid(page)).join() === rowIds(g0).join();
            // the page itself left with a chosen file in an open window
            dlg = await openWindow('upload');
            o.chosenForLeave = await putFile(dlg, P.plain);
            const n0 = browserDialogs.length;
            dialogAnswer = 'accept';
            o.pageLeave = {status: await go(`/index.php/${A.path}/management/settings/context`)};
            dialogAnswer = 'dismiss';
            o.pageLeave.asked = browserDialogs.slice(n0);
            o.pageLeave.url = rel(page.url());
            // Upgrade window, on the Web Feed row
            await openWebsitePlugins(page, app, A.path);
            dlg = await openWindow('upgrade', 'webfeedplugin');
            await snap(page, 'w-05-upgrade-window');
            o.upgrade = await readWindow(dlg);
            await loc(page, 'Installed Plugins: a row\'s "Upgrade" link (next tr after the row)', rowLoc(page, 'webfeedplugin').locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Upgrade', exact: true}));
            o.upgradeClose = await closeWindow('upgrade');
            await pastWindow();
            // the same windows on the site's list and in the Settings Wizard
            await openSiteList();
            dlg = await openWindow('upload');
            await snap(page, 'w-06-site-upload-window');
            o.siteUpload = await readWindow(dlg);
            await closeWindow('upload'); await pastWindow();
            dlg = await openWindow('upgrade', 'webfeedplugin');
            o.siteUpgrade = await readWindow(dlg);
            await snap(page, 'w-07-site-upgrade-window');
            await closeWindow('upgrade'); await pastWindow();
            o.wizard = await openWizard(A.name, 'w-08');
            fact('windows', o);
            await out();
        });

        async function pastWindow() { await sleep(700); }

        /** Administration › Hosted Journals › the row's "Settings wizard" › "Plugins". */
        async function openWizard(name, prefix) {
            const r = {};
            await go('/index.php/index/admin/contexts');
            const row = page.locator('tr.gridRow').filter({hasText: name}).first();
            await row.waitFor({timeout: T}).catch(() => {});
            if (!(await row.count())) return {rowFound: 0};
            await row.locator('a.show_extras').click(); await sleep(400);
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Settings wizard', exact: true}).click();
            await page.waitForURL(/admin\/wizard\//, {timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            await page.locator('#plugins-button').first().click().catch(() => {}); await idle(page).catch(() => {});
            await grid().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await sleep(400);
            const g = await readGrid(page);
            r.url = rel(page.url());
            r.headerLinks = g.headerLinks;
            r.webfeed = await rowLinks(page, 'webfeedplugin');
            r.ours = Object.fromEntries(OURS.map((id) => [id, findRow(g, id)]));
            for (const id of OURS) if (r.ours[id]) r[`links-${id}`] = await rowLinks(page, id);
            if (g.headerLinks && g.headerLinks.includes('Upload A New Plugin')) {
                const dlg = await openWindow('upload');
                r.upload = await readWindow(dlg);
                await closeWindow('upload'); await pastWindow();
            }
            await snap(page, `${prefix}-wizard-plugins`, {r});
            return r;
        }

        // ------------------------------------------------------------ install: Rule 16 (td16), side effects
        await sect('install', async () => {
            const o = {};
            o.before = {folders: ourFolders(), versions: versions()};
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            o.genericBefore = catCount(await readGrid(page), 'generic');
            o.test100 = await upload('i-01-install-test100', P.test100);
            o.samePageRow = o.test100.ours.u62k2testplugin;
            o.reloadA = await reread(A.path, 'i-02-A-admin-reload');
            o.every = await everyList('i-03', ['u62k2testplugin']);
            o.wizard = await openWizard(A.name, 'i-04');
            // the other end: a plugin that reports itself enabled, packed with no folder, uploaded from the site's list
            await as('admin', A.path);
            await openSiteList();
            o.onroot = await upload('i-05-install-onroot-site', P.onroot);
            o.onrootEvery = await everyList('i-06', []);
            fact('install', o);
            await out();
        });

        // ------------------------------------------------------------ refuse: Rule 17 (td12, td13, td14)
        await sect('refuse', async () => {
            const o = {};
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            o.webfeedSame = await upload('r-01-upload-webfeed-same', P.webfeed);
            o.test101AsNew = await upload('r-02-upload-test101-older-installed', P.test101);
            o.nover = await upload('r-03-upload-nover', P.nover);
            o.badtype = await upload('r-04-upload-badtype', P.badtype);
            o.plain = await upload('r-05-upload-plain-txt', P.plain);
            o.fake = await upload('r-06-upload-fake-targz', P.fake);
            o.reload = await reread(A.path, 'r-07-A-admin-reload');
            o.folders = ourFolders();
            o.versions = versions();
            fact('refuse', o);
            await out();
        });

        // ------------------------------------------------------------ upgrade: Rule 18 (td16), Rule 19 (td15), A3
        await sect('upgrade', async () => {
            const o = {};
            // A's manager ticks the test plugin in A; B's stays unticked
            await as(A.u.mgr, A.path);
            await openWebsitePlugins(page, app, A.path);
            o.tickA = await tick('u62k2testplugin');
            o.linksA_mgr_ticked = await rowLinks(page, 'u62k2testplugin');
            await snap(page, 'u-01-A-mgr-ticked');
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            o.test101 = await upload('u-02-upgrade-test101', P.test101, {via: 'upgrade', rowId: 'u62k2testplugin'});
            o.reloadA = await reread(A.path, 'u-03-A-admin-reload');
            o.every = await everyList('u-04', []);
            // refusals (all before any file change, fn-m)
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            o.test100AsNew = await upload('u-05-upload-test100-newer-installed', P.test100);
            o.test100AsUpgrade = await upload('u-06-upgrade-test100-older', P.test100, {via: 'upgrade', rowId: 'u62k2testplugin'});
            o.test101AsUpgrade = await upload('u-07-upgrade-test101-same', P.test101, {via: 'upgrade', rowId: 'u62k2testplugin'});
            o.webfeedSame = await upload('u-08-upgrade-webfeed-same', P.webfeed, {via: 'upgrade', rowId: 'webfeedplugin'});
            o.webfeedOnScholar = await upload('u-09-upgrade-webfeed-on-scholar', P.webfeed, {via: 'upgrade', rowId: 'googlescholarplugin'});
            const g = await readGrid(page);
            const block = g.cats.find((c) => c.id === 'blocks');
            o.blockRow = block && block.rows[0] ? block.rows[0].id : null;
            if (o.blockRow) o.webfeedOnBlock = await upload('u-10-upgrade-webfeed-on-block', P.webfeed, {via: 'upgrade', rowId: o.blockRow});
            o.reload = await reread(A.path, 'u-11-A-admin-reload');
            o.folders = ourFolders();
            o.versions = versions();
            fact('upgrade', o);
            await out();
        });

        // ------------------------------------------------------------ fail: Rule 20, A5
        await sect('fail', async () => {
            const o = {};
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            o.before = {folders: ourFolders(), versions: versions()};
            if (findRow(await readGrid(page), 'u62k2testplugin')) {
                o.failing = await upload('f-01-upgrade-test102-failing', P.test102fail, {via: 'upgrade', rowId: 'u62k2testplugin'});
                o.every = await everyList('f-02', []);
                await as('admin', A.path);
                await openWebsitePlugins(page, app, A.path);
            }
            // bring it back through "Upload A New Plugin": the old version's package, then the version the installation records
            if (!findRow(await readGrid(page), 'u62k2testplugin')) o.reinstall = await upload('f-03-reinstall-test100', P.test100);
            o.afterReinstall100 = {folders: ourFolders(), versions: versions()};
            if (!findRow(await readGrid(page), 'u62k2testplugin')) o.reinstall101 = await upload('f-03b-reinstall-test101', P.test101);
            o.afterReinstall101 = {folders: ourFolders(), versions: versions()};
            // the same version under "Upgrade" (A3's same-version end)
            if (findRow(await readGrid(page), 'u62k2testplugin')) o.test101AsUpgrade = await upload('f-03c-upgrade-test101-same', P.test101, {via: 'upgrade', rowId: 'u62k2testplugin'});
            o.reload = await reread(A.path, 'f-04-A-admin-reload');
            o.after = {folders: ourFolders(), versions: versions()};
            fact('fail', o);
            await out();
        });

        // ------------------------------------------------------------ delete: Rule 21 (td16, td17), A4, A7
        await sect('delete', async () => {
            const o = {};
            await as('admin', A.path);
            await openWebsitePlugins(page, app, A.path);
            if (findRow(await readGrid(page), 'u62k2testplugin')) {
                o.test = await deleteRow('d-01-delete-test', 'u62k2testplugin');
                o.reloadA = await reread(A.path, 'd-02-A-admin-reload');
            } else o.test = 'u62k2test not listed';
            // u62k2on from the site's list
            await openSiteList();
            if (findRow(await readGrid(page), 'u62k2onplugin')) o.on = await deleteRow('d-03-delete-on-site', 'u62k2onplugin', {cancelFirst: false});
            else o.on = 'u62k2on not listed';
            o.every = await everyList('d-04', []);
            fact('delete', o);
            await out();
        });

        // ------------------------------------------------------------ final: nothing of ours left behind
        await sect('final', async () => {
            const o = {};
            o.folders = ourFolders();
            if (o.folders.length) {
                await as('admin', A.path);
                await openSiteList();
                const g = await readGrid(page);
                for (const id of OURS) if (findRow(g, id)) o[`cleanup-${id}`] = await deleteRow(`z-cleanup-${id}`, id, {cancelFirst: false});
            }
            o.foldersAfter = ourFolders();
            o.versions = versions();
            const gs = (dir) => { try { return execFileSync('git', ['-C', dir, 'status', '--porcelain', '--', 'plugins']).toString().trim(); } catch (e) { return `git failed ${flat(e.message, 80)}`; } };
            o.gitApp = gs(path.resolve(app.root));
            o.gitLib = gs(path.join(path.resolve(app.root), 'lib', 'pkp'));
            o.browserDialogs = browserDialogs;
            fact('final', o);
            await out();
        });
    } finally {
        await close();
    }
});
