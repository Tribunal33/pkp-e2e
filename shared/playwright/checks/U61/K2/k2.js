const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U61 claim check, chunk K2: sessions, stored copies and routine tasks.
// Rules 9–12 (163–199), Rules 21–23 (263–289), Settings bullets 5, 6, 8, 9
// (332–352), register A2 and A5. Footnotes a, j, k, l, m, t, u, v, td3–td5,
// f-a2, f-a5. Spec: docs/specs/U61-system-administration.md. All three apps.
//
// Phases, per app (PHASES=seed,cancel,data,template,tasklogs,report,expire):
//  - seed:      a scratch journal/press/server with one throwaway account per
//               permission level, and a published item with an HTML galley
//               (OJS, OPS) or HTML publication format (OMP).
//  - cancel:    "Expire User Sessions", "Delete Template Cache", "Delete Task
//               Logs" answered Cancel: the box's text, the page, what stayed.
//  - data:      the pages that build the stored copies (journal home, masthead,
//               the HTML galley read signed out, the Plugin Gallery as the
//               manager), then "Delete Data Caches", then the pages again; the
//               Laravel store under cache/opcache read by key (sha1 path).
//  - template:  "Delete Template Cache" › OK: compiled templates and theme CSS
//               before, after, and after the journal's home loads again.
//  - tasklogs:  a task run's report link as admin, "Delete Task Logs" › OK, the
//               same link again (fresh browser).
//  - report:    the report email (subject, body, sender); a run that ends well
//               under the install default and with report-on-every-run (a copy
//               of the config in the output dir, CLI only); the principal
//               contact changed on Site Settings and put back; the task-log
//               folder listed against the runs made.
//  - expire:    admin presses "Expire User Sessions" › OK; the admin's landing;
//               the Journal Manager signs in again with the old password; the
//               log link as the manager and signed out.
// Fleet-global: "Expire User Sessions" signs out every session of the install,
// "Delete Task Logs" removes every task log, "Delete Data Caches"/"Delete
// Template Cache" empty the install's stores, and the report phase changes the
// site's principal contact for a moment (put back in a finally): run alone.
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK2 node bin/probe.js <app|all> shared/playwright/checks/U61/K2/k2.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'cancel', 'data', 'template', 'tasklogs', 'report', 'expire'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const REPO = path.resolve(__dirname, '../../../../..');
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';
const flat = (s, n = 4000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const sql = (db, q) => execFileSync('psql', ['-d', db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const bounded = (p, ms = 8000) => Promise.race([p, sleep(ms)]);
const stateFile = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const loadState = (app) => { try { return JSON.parse(fs.readFileSync(stateFile(app), 'utf8')); } catch (e) { return {}; } };
const saveState = (app, s) => fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));
const APPNAME = {ojs: 'Open Journal Systems', omp: 'Open Monograph Press', ops: 'Open Preprint Systems'};

function envFor(app, extra = {}) {
    const env = {...process.env};
    for (const line of fs.readFileSync(path.resolve(REPO, app.root, '.env.playwright'), 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2];
    }
    return {...env, ...extra};
}
function cli(app, args, extraEnv = {}) {
    try {
        return flat(execFileSync('php', args, {cwd: path.resolve(REPO, app.root), env: envFor(app, extraEnv), encoding: 'utf8', timeout: 300_000}), 800);
    } catch (e) {
        return `EXIT ${e.status}: ${flat(String(e.stdout || '') + String(e.stderr || ''), 800)}`;
    }
}
const configFile = (app) => path.resolve(REPO, app.root, 'config.test.inc.php');
const filesDir = (app) => (fs.readFileSync(configFile(app), 'utf8').match(/^files_dir\s*=\s*(.+)$/m) || [])[1].trim();
const cacheDir = (app) => path.resolve(REPO, app.root, 'cache');
const storeDir = (app) => path.join(cacheDir(app), 'opcache');
function walk(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
    }
    return out;
}
// The Laravel file store: every entry at opcache/<2>/<2>/<sha1(key)>.
const keyPath = (app, key) => { const h = sha1(key); return path.join(storeDir(app), h.slice(0, 2), h.slice(2, 4), h); };
function storeState(app, keys, marker) {
    const files = walk(storeDir(app));
    let translations = 0; let withMarker = 0;
    for (const f of files) {
        const head = fs.readFileSync(f).subarray(0, 400).toString('utf8');
        if (/plural-forms|i18n\\translation\\Translator/.test(head)) translations++;
        if (marker && fs.readFileSync(f).includes(marker)) withMarker++;
    }
    const present = {};
    for (const [label, key] of keys) {
        const p = keyPath(app, key);
        present[label] = fs.existsSync(p) ? {present: true, mtime: fs.statSync(p).mtime.toISOString(), head: fs.readFileSync(p).subarray(10, 90).toString('utf8')} : {present: false};
    }
    return {total: files.length, translations, withMarker, present};
}
// Compiled templates and theme style sheets.
function templateState(app) {
    const dir = cacheDir(app);
    const tc = walk(path.join(dir, 't_compile')).map((f) => ({f: path.relative(dir, f), m: fs.statSync(f).mtimeMs}));
    const css = fs.readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => ({f, sha1: sha1(fs.readFileSync(path.join(dir, f)))}));
    const sub = Object.fromEntries(['t_cache', 't_config', 'HTML', 'URI', '_db'].map((d) => [d, walk(path.join(dir, d)).length]));
    const wc = fs.readdirSync(dir).filter((f) => /^wc-.*\.html$/.test(f)).length;
    return {tCompile: tc, css, sub, wc};
}
const taskLogDir = (app) => path.join(filesDir(app), 'scheduledTaskLogs');
const taskLogs = (app) => (fs.existsSync(taskLogDir(app)) ? fs.readdirSync(taskLogDir(app)).sort() : null);
async function mailSince(iso) {
    const r = await fetch(`${MAILPIT}/api/v1/messages?limit=100`).then((x) => x.json());
    return r.messages.filter((m) => new Date(m.Created) >= new Date(iso)).map((m) => ({id: m.ID, created: m.Created, to: m.To.map((t) => t.Address).join(','), from: `${m.From.Name} <${m.From.Address}>`, subject: m.Subject}));
}
const LEVELS = {
    ojs: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'copyeditor'], ['reviewer', 'externalReviewer'], ['author', 'author'], ['reader', 'reader']],
    omp: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'copyeditor'], ['reviewer', 'externalReviewer'], ['author', 'author'], ['reader', 'reader']],
    ops: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'editorialBoardMember'], ['author', 'author'], ['reader', 'reader']],
};

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
let ACCEPT = false;
function watch(page, label) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)} [${label}]`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)} [${label}]`); });
    page.on('dialog', (d) => {
        DIALOGS.push({phase: CUR, tab: label, type: d.type(), message: d.message(), accepted: ACCEPT || d.type() === 'beforeunload'});
        (ACCEPT || d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
    });
    return page;
}
async function snap(page, name, extra = {}) {
    let s;
    try { s = await bounded(screen(page), 25_000) || {url: page.url(), error: 'screen() timed out'}; } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    record(name, {...s, extra});
    await shot(page, name).catch(() => {});
    return s;
}
async function go(page, url) {
    try {
        const resp = await page.goto(url, {timeout: 45_000});
        await bounded(idle(page).catch(() => {}));
        return resp ? resp.status() : null;
    } catch (e) { return `error ${String(e.message || e).slice(0, 160)}`; }
}
async function where(page) {
    return page.evaluate(() => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const h1 = [...document.querySelectorAll('h1')].map(t).filter(Boolean);
        const header = document.querySelector('header');
        const loginLinks = [...document.querySelectorAll('header a, nav a')].filter((a) => /\/login(\?|$|\/)/.test(a.getAttribute('href') || '') && !/signOut/.test(a.getAttribute('href') || '')).map(t);
        return {url: location.pathname + location.search, title: document.title, h1, header: t(header) ? t(header).slice(0, 300) : null,
            loginForm: !!document.querySelector('form#login'), loginLinks, logoutLink: !!document.querySelector('a[href*="signOut"]'),
            body: t(document.body).slice(0, 300)};
    }).then((w) => ({...w, url: rel(w.url)})).catch((e) => ({url: rel(page.url()), error: String(e.message).slice(0, 120)}));
}
async function mainText(page) { return flat(await page.locator('main').first().innerText().catch(() => ''), 3000); }
const notices = (page) => page.locator('.pkpNotification, .app__notifications [role="alert"], [role="alert"]').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []);
// Press one Administration button; ACCEPT answers the browser's box.
async function pressAdmin(page, app, name, accept) {
    await go(page, app.url('/index.php/index/en/admin'));
    const before = DIALOGS.length;
    const t0 = Date.now();
    ACCEPT = accept;
    let navigated = false;
    const reqs = [];
    const onReq = (r) => { if (r.isNavigationRequest()) reqs.push(`${r.method()} ${rel(r.url())}`); };
    page.on('request', onReq);
    try {
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: accept ? 30_000 : 4000}).then(() => { navigated = true; }).catch(() => {});
        await page.getByRole('button', {name, exact: true}).click();
        await nav;
        await page.waitForLoadState('load').catch(() => {});
        await bounded(idle(page).catch(() => {}));
    } finally { ACCEPT = false; page.off('request', onReq); }
    return {navigated, ms: Date.now() - t0, requests: reqs, dialogs: DIALOGS.slice(before).map((d) => ({type: d.type, message: d.message, accepted: d.accepted})), ...(await where(page)), notices: await notices(page)};
}
// The kit's sign-in, then the page settled.
async function signInAt(page, app, username, contextPath = 'index') {
    await signIn(page, username, {contextPath});
    await page.waitForLoadState('load').catch(() => {});
    await bounded(idle(page).catch(() => {}));
}
const sessions = (app) => Number(sql(`${dbName(app.name)}`, 'select count(*) from sessions'));
async function reportMail(app, processId, to = 'admin@mail.test') {
    const m = await app.mail.find({to, subject: processId, timeoutMs: 20_000});
    const full = await app.mail.fullMessage(m.ID);
    const text = String(full.Text || '');
    const link = (text.match(/(https?:\/\/\S*downloadScheduledTaskLogFile\S*)/) || [])[1] || null;
    return {id: m.ID, subject: m.Subject, from: full.From, to: full.To, cc: full.Cc, text: flat(text, 800), html: flat(String(full.HTML || '').replace(/<[^>]+>/g, ' '), 800),
        htmlHref: (String(full.HTML || '').match(/href="([^"]*downloadScheduledTaskLogFile[^"]*)"/) || [])[1] || null, link};
}
// Open a log link in a page: download (Content-Disposition) or what shows.
async function openLog(page, url) {
    const dl = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
    const respP = page.waitForResponse((r) => /downloadScheduledTaskLogFile/.test(r.url()), {timeout: 10_000}).catch(() => null);
    await page.goto(url).catch(() => {});
    const [d, resp] = await Promise.all([dl, respP]);
    let content = null;
    if (d) { const fp = path.join(outDir(), `k2-log-${Date.now()}.log`); await d.saveAs(fp).catch(() => {}); try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { /* none */ } }
    await page.waitForLoadState('load').catch(() => {});
    const h = resp ? resp.headers() : {};
    return {download: d ? d.suggestedFilename() : null, status: resp ? resp.status() : null, contentType: h['content-type'] || null, disposition: h['content-disposition'] || null,
        contentLength: h['content-length'] || null, content: content ? flat(content, 600) : null, ...(await where(page))};
}
// Site Settings › Site Setup › Information (U60 K2's openSite).
async function openInfo(page, app) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await bounded(idle(page).catch(() => {}));
    await page.locator('#setup-button').first().click().catch(() => {});
    await page.locator('#info-button').first().click();
    const panel = page.locator('[role="tabpanel"]#info').first();
    await panel.getByRole('button', {name: /^Save$/}).first().waitFor({timeout: T});
    await bounded(idle(page).catch(() => {})); await sleep(300);
    return panel;
}
async function saveInfo(page, panel) {
    const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await panel.getByRole('button', {name: /^Save$/}).first().click();
    const r = await resp;
    await panel.locator('.pkpFormPage__status').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
    await sleep(400);
    return {status: r ? r.status() : null, errors: (await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean)};
}

forEachApp(async (app) => {
    const R = {app: app.name, started: new Date().toISOString()};
    const st = loadState(app);
    const {browser, page, close} = await launch(app);
    watch(page, 'admin');
    const fresh = async (label) => {
        const ctx = await browser.newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}, acceptDownloads: true});
        const p = watch(await ctx.newPage(), label);
        return {ctx, p};
    };
    const phase = async (name, fn) => {
        if (!on(name)) return;
        CUR = `${app.name}:${name}`;
        log(app.name, name);
        try { R[name] = await fn(); } catch (e) {
            R[name] = {error: String(e.stack || e).slice(0, 1500)};
            log(app.name, name, 'ERROR', R[name].error.slice(0, 400));
            await shot(page, `error-${name}`).catch(() => {});
        }
        R[name] = {...(R[name] || {}), crashes: CRASH[CUR] || [], dialogs: DIALOGS.filter((d) => d.phase === CUR)};
        record('k2', R, {merge: true});
    };
    const J = () => st.J;
    const jurl = (p) => app.url(`/index.php/${st.J}/en${p}`);
    try {
        await phase('seed', async () => {
            st.J = tag('u61k2');
            const us = LEVELS[app.name].map(([lvl, key]) => ({username: `${st.J}${lvl.slice(0, 3).toLowerCase()}`, roles: [key]}));
            const c = await app.api.createContext({tag: st.J, context: {name: `U61 K2 ${st.J}`, acronym: 'K2J'}, users: us,
                ...(app.name === 'ojs' ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {})});
            st.ctxId = c.contextId;
            st.users = LEVELS[app.name].map(([lvl], i) => ({lvl, username: us[i].username}));
            const author = st.users.find((u) => u.lvl === 'author').username;
            const base = {tag: `${st.J}h`, context: st.J, submitter: author, title: `K2 html ${st.J}`};
            let spec;
            if (app.name === 'ojs') spec = {...base, files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'HTML', file: 'article.html'}], published: true, issue: {volume: 1, number: 1, year: 2026}};
            if (app.name === 'omp') spec = {...base, files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: [{name: 'HTML', file: 'article.html'}], published: true};
            if (app.name === 'ops') spec = {...base, galleys: [{label: 'HTML', file: 'preprint.html'}], published: true};
            const s = await app.api.createSubmission(spec);
            st.sub = {id: s.submissionId, pub: s.publicationId, galleys: s.galleys, formats: s.publicationFormats};
            saveState(app, st);
            return {J: st.J, ctxId: st.ctxId, users: st.users, sub: st.sub};
        });

        // ── 165–168, 186–192, 193–198: the three asking buttons answered Cancel ──
        await phase('cancel', async () => {
            const out = {};
            await signInAt(page, app, 'admin');
            await go(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'admin-before-cancel');
            out.adminText = await mainText(page);
            await loc(page, 'Administration: "Expire User Sessions" button', page.getByRole('button', {name: 'Expire User Sessions', exact: true}));
            await loc(page, 'Administration: "Delete Data Caches" button', page.getByRole('button', {name: 'Delete Data Caches', exact: true}));
            await loc(page, 'Administration: "Delete Template Cache" button', page.getByRole('button', {name: 'Delete Template Cache', exact: true}));
            await loc(page, 'Administration: "Delete Task Logs" button', page.getByRole('button', {name: 'Delete Task Logs', exact: true}));
            const t0 = await app.api.runTask({result: 'error'});
            const tpl0 = templateState(app); const logs0 = taskLogs(app); const s0 = sessions(app);
            out.expire = await pressAdmin(page, app, 'Expire User Sessions', false);
            out.expire.sessionsBefore = s0; out.expire.sessionsAfter = sessions(app);
            out.expire.stillAdmin = (await go(page, app.url('/index.php/index/en/admin/systemInfo'))) && (await where(page));
            await snap(page, 'after-expire-cancel');
            out.template = await pressAdmin(page, app, 'Delete Template Cache', false);
            const tpl1 = templateState(app);
            const oldSet = new Set(tpl0.tCompile.map((x) => `${x.f}@${x.m}`));
            out.template.compiledKept = tpl1.tCompile.filter((x) => oldSet.has(`${x.f}@${x.m}`)).length;
            out.template.compiledBefore = tpl0.tCompile.length; out.template.compiledAfter = tpl1.tCompile.length;
            out.template.cssSame = JSON.stringify(tpl0.css) === JSON.stringify(tpl1.css);
            out.template.adminTextSame = (await mainText(page)) === out.adminText;
            await snap(page, 'after-template-cancel');
            out.tasklogs = await pressAdmin(page, app, 'Delete Task Logs', false);
            out.tasklogs.before = logs0; out.tasklogs.after = taskLogs(app);
            out.tasklogs.kept = (out.tasklogs.after || []).includes(t0.logFile);
            await snap(page, 'after-tasklogs-cancel');
            return out;
        });

        // ── 178–184, 343–346 (store part), A2, A5: "Delete Data Caches" ─────────
        await phase('data', async () => {
            const out = {};
            const pluginNames = sql(`${dbName(app.name)}`, `select distinct lower(plugin_name) from plugin_settings where context_id = ${st.ctxId} order by 1`).split('\n').filter(Boolean);
            const cfgGallery = (fs.readFileSync(configFile(app), 'utf8').match(/^plugin_gallery_urls\s*=\s*'(.*)'/m) || [])[1];
            const galleryUrls = cfgGallery ? JSON.parse(cfgGallery) : ['https://pkp.sfu.ca/ojs/xml/plugins.xml'];
            const galleyId = app.name === 'ojs' && st.sub.galleys && st.sub.galleys[0] ? (st.sub.galleys[0].id || st.sub.galleys[0].galleyId) : null;
            const keys = [
                ['navMenus primary', `navMenusByArea-${st.ctxId}-primary`],
                ['navMenus user', `navMenusByArea-${st.ctxId}-user`],
                ['masthead role lists', `PKP\\userGroup\\Repository::getMastheadUserIdsByRoleIdsEditorialMasthead${st.ctxId}1 year`],
                ...pluginNames.map((n) => [`pluginSettings ${n}`, `pluginSettings-${st.ctxId}-${n}`]),
                ...galleryUrls.map((u) => ['plugin gallery list', `pluginGallery-${md5(u)}`]),
            ];
            if (galleyId) keys.push(['HTML galley copy', `htmlArticleGalley-${galleyId}`]);
            out.keys = keys.map(([l, k]) => `${l}: ${k}`);
            const marker = 'A small HTML file';
            // The pages that build them.
            const build = async (label) => {
                const b = {};
                const anon = await fresh('anon');
                try {
                    b.home = await go(anon.p, jurl(''));
                    await snap(anon.p, `${label}-home-anon`);
                    b.homeText = flat(await anon.p.locator('body').innerText().catch(() => ''), 1500);
                    b.masthead = await go(anon.p, jurl('/about/editorialMasthead'));
                    await snap(anon.p, `${label}-masthead-anon`);
                    if (app.name === 'ojs' && galleyId) {
                        b.galley = await go(anon.p, jurl(`/article/view/${st.sub.id}/${galleyId}`));
                        await anon.p.frameLocator('iframe').first().locator('body').waitFor({timeout: 10_000}).catch(() => {});
                        b.galleyFrame = flat(await anon.p.frameLocator('iframe').first().locator('body').innerText().catch(() => null), 200);
                    }
                    if (app.name === 'omp') {
                        b.book = await go(anon.p, jurl(`/catalog/book/${st.sub.id}`));
                        const a = anon.p.locator('a[href*="/catalog/view/"]').first();
                        b.formatHref = rel(await a.getAttribute('href').catch(() => null));
                        if (b.formatHref) { b.galley = await go(anon.p, app.url(b.formatHref)); await sleep(1500); }
                        b.galleyFrame = flat(await anon.p.frameLocator('iframe').first().locator('body').innerText().catch(() => null), 200);
                    }
                    if (app.name === 'ops') {
                        b.preprint = await go(anon.p, jurl(`/preprint/view/${st.sub.id}`));
                        const a = anon.p.locator('a.obj_galley_link').first();
                        b.galleyHref = rel(await a.getAttribute('href').catch(() => null));
                        if (b.galleyHref) { b.galley = await go(anon.p, app.url(b.galleyHref)); await sleep(1500); }
                        b.galleyFrame = flat(await anon.p.frameLocator('iframe').first().locator('body').innerText().catch(() => null), 200);
                    }
                    await snap(anon.p, `${label}-galley-anon`);
                } finally { await anon.ctx.close().catch(() => {}); }
                // Plugin Gallery as the journal's manager.
                const m = await fresh('manager');
                try {
                    await signInAt(m.p, app, st.users.find((u) => u.lvl === 'manager').username, st.J);
                    await go(m.p, jurl('/management/settings/website'));
                    await m.p.locator('#plugins-button').first().click().catch(() => {});
                    await m.p.locator('#pluginGallery-button').first().click().catch(() => {});
                    await sleep(1500); await bounded(idle(m.p).catch(() => {}));
                    await snap(m.p, `${label}-plugin-gallery-manager`);
                    b.galleryTab = flat(await m.p.locator('[role="tabpanel"]#pluginGallery, #pluginGallery').first().innerText().catch(() => null), 400);
                } finally { await m.ctx.close().catch(() => {}); }
                return b;
            };
            out.build1 = await build('data-build1');
            out.storeBefore = storeState(app, keys, marker);
            await signInAt(page, app, 'admin');
            await go(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'admin-before-data');
            const adminBefore = await mainText(page);
            const t0 = new Date();
            out.press = await pressAdmin(page, app, 'Delete Data Caches', true);
            out.storeRightAfter = storeState(app, keys, marker);
            await snap(page, 'admin-after-data');
            out.press.adminTextSame = (await mainText(page)) === adminBefore;
            await page.reload(); await bounded(idle(page).catch(() => {}));
            out.press.afterReload = {...(await where(page)), notices: await notices(page), textSame: (await mainText(page)) === adminBefore};
            // entries older than the press still there?
            out.olderThanPress = walk(storeDir(app)).filter((f) => fs.statSync(f).mtime < t0).length;
            out.build2 = await build('data-build2');
            out.homeSame = out.build1.homeText === out.build2.homeText;
            out.storeRebuilt = storeState(app, keys, marker);
            return out;
        });

        // ── 186–192, A2: "Delete Template Cache" › OK ──────────────────────────
        await phase('template', async () => {
            const out = {};
            const anon = await fresh('anon');
            try {
                await go(anon.p, jurl(''));
                out.homeBefore = flat(await anon.p.locator('body').innerText().catch(() => ''), 2000);
                out.homeCssBefore = await anon.p.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')));
                const cs = await anon.p.evaluate(() => { const s = getComputedStyle(document.body); const h = document.querySelector('.pkp_structure_head, header'); return {bodyFont: s.fontFamily, bodyColor: s.color, headBg: h ? getComputedStyle(h).backgroundColor : null}; });
                out.styleBefore = cs;
                await snap(anon.p, 'template-home-before');
                const before = templateState(app);
                out.before = {compiled: before.tCompile.length, css: before.css, sub: before.sub, wc: before.wc};
                await signInAt(page, app, 'admin');
                await go(page, app.url('/index.php/index/en/admin'));
                const adminBefore = await mainText(page);
                const t0 = Date.now();
                out.press = await pressAdmin(page, app, 'Delete Template Cache', true);
                const after = templateState(app);
                out.afterPress = {compiled: after.tCompile.length, compiledOlderThanPress: after.tCompile.filter((x) => x.m < t0).length, css: after.css, sub: after.sub};
                await snap(page, 'admin-after-template');
                out.press.adminTextSame = (await mainText(page)) === adminBefore;
                await go(anon.p, jurl(''));
                await snap(anon.p, 'template-home-after');
                out.homeAfter = flat(await anon.p.locator('body').innerText().catch(() => ''), 2000);
                out.homeSame = out.homeAfter === out.homeBefore;
                out.styleAfter = await anon.p.evaluate(() => { const s = getComputedStyle(document.body); const h = document.querySelector('.pkp_structure_head, header'); return {bodyFont: s.fontFamily, bodyColor: s.color, headBg: h ? getComputedStyle(h).backgroundColor : null}; });
                out.styleSame = JSON.stringify(out.styleAfter) === JSON.stringify(out.styleBefore);
                const rebuilt = templateState(app);
                const bmap = Object.fromEntries(before.css.map((c) => [c.f, c.sha1]));
                out.rebuilt = {compiled: rebuilt.tCompile.length, css: rebuilt.css.map((c) => ({f: c.f, sameAsBefore: bmap[c.f] === undefined ? 'new' : bmap[c.f] === c.sha1}))};
            } finally { await anon.ctx.close().catch(() => {}); }
            return out;
        });

        // ── 193–198, 285–288, td5: "Delete Task Logs" and the log link ─────────
        await phase('tasklogs', async () => {
            const out = {};
            const t = await app.api.runTask({result: 'error'});
            out.task = t;
            out.mail = await reportMail(app, t.processId);
            const url = out.mail.link.replace(/^https?:\/\/[^/]+/, app.baseURL);
            out.linkHost = (out.mail.link.match(/^https?:\/\/[^/]+/) || [])[0];
            const a1 = await fresh('admin-log1');
            try {
                await signInAt(a1.p, app, 'admin');
                out.before = await openLog(a1.p, url);
            } finally { await a1.ctx.close().catch(() => {}); }
            out.logsBefore = taskLogs(app);
            await signInAt(page, app, 'admin');
            await go(page, app.url('/index.php/index/en/admin'));
            const adminBefore = await mainText(page);
            out.press = await pressAdmin(page, app, 'Delete Task Logs', true);
            out.press.adminTextSame = (await mainText(page)) === adminBefore;
            await snap(page, 'admin-after-tasklogs');
            out.logsAfter = taskLogs(app);
            out.dirExistsAfter = fs.existsSync(taskLogDir(app));
            const a2 = await fresh('admin-log2');
            try {
                await signInAt(a2.p, app, 'admin');
                out.after = await openLog(a2.p, url);
                await snap(a2.p, 'log-link-after-delete');
                out.afterHtml = flat(await a2.p.content().catch(() => ''), 300);
            } finally { await a2.ctx.close().catch(() => {}); }
            out.deletedAt = new Date().toISOString();
            st.logsDeletedAt = out.deletedAt; st.oldLink = url; saveState(app, st);
            return out;
        });

        // ── 263–284, 332–339: routine tasks, the report email, the settings ────
        await phase('report', async () => {
            const out = {};
            out.logsAtStart = taskLogs(app);
            // A run that ends in error: the report.
            const t1 = await app.api.runTask({result: 'error'});
            out.error = {task: t1, mail: await reportMail(app, t1.processId)};
            // A run that ends well, install default (errors only): nothing sent.
            const since = new Date(Date.now() - 1000).toISOString();
            out.okDefault = {cli: cli(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\RemoveFailedJobs'])};
            const t2 = await app.api.runTask({result: 'error'});
            await reportMail(app, t2.processId).catch(() => null);
            out.okDefault.control = t2.processId;
            out.okDefault.mailSince = await mailSince(since);
            out.okDefault.completedSent = out.okDefault.mailSince.filter((m) => /Remove much older/.test(m.subject));
            // The other end: a copy of the config with report-on-every-run.
            const copy = path.join(outDir(), `config.k2.report-every-run.${app.name}.inc.php`);
            fs.writeFileSync(copy, fs.readFileSync(configFile(app), 'utf8').replace(/^scheduled_tasks_report_error_only\s*=\s*On\s*$/m, 'scheduled_tasks_report_error_only = Off'));
            out.okEvery = {configLine: (fs.readFileSync(copy, 'utf8').match(/^scheduled_tasks_report_error_only.*$/m) || [])[0]};
            const since2 = new Date(Date.now() - 1000).toISOString();
            out.okEvery.cli = cli(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\RemoveFailedJobs'], {PKP_CONFIG_FILE: copy});
            await sleep(2000);
            const sent = (await mailSince(since2)).filter((m) => /Remove much older/.test(m.subject));
            out.okEvery.sent = sent;
            if (sent[0]) {
                const full = await app.mail.fullMessage(sent[0].id);
                out.okEvery.text = flat(full.Text, 600); out.okEvery.from = full.From; out.okEvery.to = full.To;
            }
            // The principal contact changed on Site Settings, then put back.
            await signInAt(page, app, 'admin');
            let panel = await openInfo(page, app);
            const nameBox = () => panel.locator('[id="siteInfo-contactName-control-en"]');
            const mailBox = () => panel.locator('[id="siteInfo-contactEmail-control-en"]');
            await loc(page, 'Site Settings › Information: "Name of principal contact" (en)', nameBox());
            const orig = {name: await nameBox().inputValue(), email: await mailBox().inputValue()};
            out.contact = {orig};
            const tmp = {name: `K2 Contact ${st.J}`, email: `${st.J}@mail.test`};
            try {
                await nameBox().fill(tmp.name); await mailBox().fill(tmp.email);
                out.contact.save = await saveInfo(page, panel);
                const t3 = await app.api.runTask({result: 'error'});
                out.contact.mail = await reportMail(app, t3.processId, tmp.email);
                out.contact.task = t3;
            } finally {
                panel = await openInfo(page, app);
                await nameBox().fill(orig.name); await mailBox().fill(orig.email);
                out.contact.restore = await saveInfo(page, panel);
                panel = await openInfo(page, app);
                out.contact.restored = {name: await nameBox().inputValue(), email: await mailBox().inputValue()};
            }
            // Every run wrote a log; nothing else ran.
            out.logsAtEnd = taskLogs(app);
            out.runs = [t1.logFile, t2.logFile, out.contact.task && out.contact.task.logFile].filter(Boolean);
            out.windowSinceDelete = st.logsDeletedAt;
            return out;
        });

        // ── 165–177, td3, td4, 285–288: "Expire User Sessions" › OK ──────────
        await phase('expire', async () => {
            const out = {};
            await signInAt(page, app, 'admin');
            await go(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'admin-before-expire');
            out.sessionsBefore = sessions(app);
            out.press = await pressAdmin(page, app, 'Expire User Sessions', true);
            out.sessionsAfter = sessions(app);
            await snap(page, 'admin-after-expire');
            out.loginPageText = await mainText(page);
            // The manager signs in again with the old password; then the log link as the manager, and signed out.
            const mgr = await fresh('manager');
            const anon = await fresh('anon');
            try {
                await signInAt(mgr.p, app, st.users.find((u) => u.lvl === 'manager').username, st.J).catch((e) => { out.resignError = String(e.message).slice(0, 200); });
                out.managerResign = await where(mgr.p);
                await snap(mgr.p, 'manager-resignin');
                const t = await app.api.runTask({result: 'error'});
                const m = await reportMail(app, t.processId);
                const url = m.link.replace(/^https?:\/\/[^/]+/, app.baseURL);
                out.logAsManager = await openLog(mgr.p, url);
                await snap(mgr.p, 'log-link-manager');
                out.logSignedOut = await openLog(anon.p, url);
                await snap(anon.p, 'log-link-signed-out');
            } finally {
                await mgr.ctx.close().catch(() => {});
                await anon.ctx.close().catch(() => {});
            }
            return out;
        });
    } finally {
        R.ended = new Date().toISOString();
        R.crashes = CRASH;
        record('k2', R, {merge: true});
        saveState(app, st);
        await close();
    }
});
