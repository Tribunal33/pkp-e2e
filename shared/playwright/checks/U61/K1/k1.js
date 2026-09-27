// U61 claim check, chunk K1: the Administration page and System Information.
// Spec: docs/specs/U61-system-administration.md — Purpose, Actors & permissions,
// the Fields tables for Administration and System Information, Rules 1–8,
// Settings that modify behavior 7, register A1 and OMP1; footnotes a–i, u, v,
// td1, td2, f-a1, f-omp1. All three apps.
//
// Read-only on the site and on publicknowledge. It seeds one scratch context
// (tag prefix u61k1) so a second journal's public and editorial pages exist, and
// one routine-task run (`POST scenarios/task`, result error) for the report email
// and its log link. It never presses "Expire User Sessions", "Delete Data Caches",
// "Delete Template Cache" or "Delete Task Logs" to the end (chunk K2 does, alone):
// the three that ask first are pressed and their question answered Cancel.
// It never presses anything on the Jobs and Failed Jobs pages (chunk K3 does):
// the Failed Job Details trail is read from an existing row's "Details" link, or
// from a failed job of its own (`POST scenarios/job`) when the list is empty.
//
// Phases (PHASES=a,b to narrow; state in k1-state-<app>.json):
//   seed      the scratch context and one task run (its email found in Mailpit)
//   admin     as admin: the user menu on the site's and two journals' public pages,
//             the side menu on a journal's editorial screens, Administration and its
//             panels, every panel's destination (trail, side menu, notice), the three
//             asking buttons answered Cancel, the version check in the server log
//   sysinfo   System Information: parts, version, server rows, the configuration
//             table against the config file (td2), "Check for updates" (td1),
//             "Extended PHP Information" (new tab)
//   journal   Rule 3: as admin, every Administration address under a journal's path
//   roles     every other permission level: the menus, then every Administration
//             address (and the log link) typed in
//   out       signed out: the same addresses
//   log       the report's log link as admin (download), from the email
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U61/K1/k1.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'admin', 'sysinfo', 'journal', 'roles', 'out', 'log'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const REPO = path.resolve(__dirname, '../../../../..');
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const PK = 'publicknowledge';

const ROSTER = {
    ojs: [['manager', 'manager.maya'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'copyeditor.carla'], ['reviewer', 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
    omp: [['manager', 'manager.maya'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'copyeditor.carla'], ['reviewer', 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
    ops: [['manager', 'manager.maya'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'assistant.rita'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
};
// Every Administration address of this spec (the ops of AdminHandler this spec owns).
const OPS = ['', '/systemInfo', '/systemInfo?versionCheck=1', '/phpinfo', '/jobs', '/failedJobs', '/failedJobDetails/1',
    '/contexts', '/settings', '/expireSessions', '/clearDataCache', '/clearTemplateCache', '/clearScheduledTaskLogFiles'];

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
const FACTS = {};
const fact = (k, v) => { FACTS[k] = v; };
function watch(page) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { DIALOGS.push({phase: CUR, url: rel(page.url()), type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    return page;
}
async function snap(page, name, extra = {}, png = true) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    record(name, {...s, extra});
    if (png) await shot(page, name).catch(() => {});
    return s;
}
async function go(page, url) {
    try {
        const resp = await page.goto(url, {timeout: 45_000});
        await idle(page).catch(() => {});
        return resp;
    } catch (e) { return {error: String(e.message || e).slice(0, 200)}; }
}
// What an address shows: status, where it landed, heading, the notice line, trail, side menu.
async function pageFacts(page, resp) {
    const d = await page.evaluate(() => {
        const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        const crumbs = document.querySelector('nav.app__breadcrumbs');
        const note = document.querySelector('.pkpNotification, [class*="notification"], .pkp_notification');
        return {
            title: document.title,
            h1: tc(main.querySelector('h1')),
            crumbs: crumbs ? {aria: crumbs.getAttribute('aria-label'), items: [...crumbs.querySelectorAll('li')].map((li) => ({text: tc(li), href: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null}))} : null,
            sideMenu: !!(document.querySelector('nav#app-nav') || document.querySelector('nav[aria-label="Site Navigation"]')),
            sideMenuText: tc(document.querySelector('nav#app-nav') || document.querySelector('nav[aria-label="Site Navigation"]')),
            notice: note ? tc(note) : null,
            upgrade: /There is a new version|new version of/i.test(document.body.innerText),
            bodyStart: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        };
    }).catch((e) => ({error: String(e).slice(0, 200)}));
    const status = resp && typeof resp.status === 'function' ? resp.status() : null;
    const body = d.bodyStart || '';
    return {status, url: rel(page.url()), ...d,
        denied: /Access denied|not have access|n'a pas accès/i.test(body),
        login: /\/login(\b|$|\?)/.test(page.url()) || /\/login\?/.test(page.url())};
}
// The public header's user menu as data.
async function publicUser(page) {
    return page.evaluate(() => {
        const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const ul = document.getElementById('navigationUser');
        if (!ul) return null;
        return [...ul.children].map((li) => {
            const a = li.querySelector(':scope > a');
            const sub = li.querySelector(':scope > ul');
            return {text: tc(a), href: a ? a.getAttribute('href') : null, children: sub ? [...sub.querySelectorAll(':scope > li > a')].map((c) => ({text: tc(c), href: c.getAttribute('href')})) : null};
        });
    }).catch(() => null);
}
// The editorial side menu's top entries (label, href).
async function sideTop(page) {
    return page.evaluate(() => {
        const nav = document.querySelector('nav#app-nav') || document.querySelector('nav[aria-label="Site Navigation"]');
        if (!nav) return null;
        return [...nav.querySelectorAll('[data-pc-section="header"]')].map((h) => ({label: h.getAttribute('aria-label') || h.textContent.replace(/\s+/g, ' ').trim(), href: h.querySelector('a') ? h.querySelector('a').getAttribute('href') : null}));
    }).catch(() => null);
}
// Count of the version-check failure lines the probe server's log holds.
function versionCheckLines(app) {
    const port = new URL(app.baseURL).port;
    const f = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${port}-probe.log`);
    try { return (fs.readFileSync(f, 'utf8').match(/Failed to retrieve the latest version info[^\n]*/g) || []); } catch (e) { return null; }
}
// Which of our marked requests (…k1vc=<mark>) the server log shows a version check for:
// the php -S log prints error_log() lines just before the request's own line.
function logSize(app) {
    const port = new URL(app.baseURL).port;
    const f = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${port}-probe.log`);
    try { return {f, size: fs.statSync(f).size}; } catch (e) { return {f, size: 0}; }
}
function checkedRequests(app, from) {
    const {f} = logSize(app);
    const buf = fs.readFileSync(f);
    const lines = buf.slice(from.size).toString('utf8').split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/\[\d{3}\]: (GET|POST) (\S*k1vc=\S*)/);
        if (!m) continue;
        out.push({request: m[2], checked: /Failed to retrieve the latest version info/.test(lines[i - 1] || '')});
    }
    return out;
}
let MARK = 0;
const marked = (u) => `${u}${u.includes('?') ? '&' : '?'}k1vc=${++MARK}`;
// The config file as written: [{section, key, raw}] in file order (sections with no keys kept).
function configAsWritten(app) {
    const f = path.resolve(REPO, app.root || `checkouts/${app.name}`, 'config.test.inc.php');
    const out = [];
    let sec = null;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith(';')) continue;
        const m = t.match(/^\[(.+)\]/);
        if (m) { sec = m[1]; out.push({section: sec, key: null}); continue; }
        const i = t.indexOf('=');
        if (i > 0) out.push({section: sec, key: t.slice(0, i).trim(), raw: t.slice(i + 1).trim()});
    }
    return {file: path.relative(REPO, f), rows: out};
}
// What the spec's Rule 7 says a cell reads.
const SENSITIVE = {general: ['app_key', 'sentry_dsn'], database: ['password'], email: ['smtp_password', 'smtp_username'], security: ['api_key_secret', 'salt'], captcha: ['recaptcha_private_key', 'altcha_hmackey'], search: ['opensearch_password'], proxy: ['http_proxy', 'https_proxy']};
function specExpect(section, key, raw) {
    if ((SENSITIVE[section] || []).includes(key) || /password|api_key|private_key|secret/.test(key)) return '**************';
    let v = raw;
    const q = v.match(/^["'](.*)["']$/);
    if (q) return q[1];
    if (/^(on|true)$/i.test(v)) return '1';
    if (/^(off|false)$/i.test(v)) return '';
    return v;
}

forEachApp(async (app) => {
    for (const k of Object.keys(CRASH)) delete CRASH[k];
    DIALOGS.length = 0;
    for (const k of Object.keys(FACTS)) delete FACTS[k];
    const st = fs.existsSync(stateFile(app)) && !on('seed') ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : {};
    if (st.mail && !st.mail.link && st.mail.text) st.mail.link = (st.mail.text.match(/(https?:\/\/\S*downloadScheduledTaskLogFile\S*)/) || [])[1] || null;
    const site = (p) => app.url(`/index.php/index/en${p}`);
    const ctxUrl = (c, p) => app.url(`/index.php/${c}/en${p}`);
    const {page, close} = await launch(app);
    watch(page);
    try {
        // ── seed ────────────────────────────────────────────────────────────────
        if (on('seed')) {
            CUR = 'seed';
            st.scratch = tag('u61k1');
            const c = await app.api.createContext({tag: st.scratch});
            st.context = {path: st.scratch, response: c};
            const t = await app.api.runTask({result: 'error'});
            st.task = t;
            try {
                const m = await app.mail.find({to: 'admin@mail.test', subject: t.processId, timeoutMs: 20_000});
                const full = await app.mail.fullMessage(m.ID);
                const link = (String(full.HTML || '').match(/href="([^"]*downloadScheduledTaskLogFile[^"]*)"/) || String(full.Text || '').match(/(https?:\/\/\S*downloadScheduledTaskLogFile\S*)/) || [])[1] || null;
                st.mail = {id: m.ID, subject: m.Subject, from: m.From, to: m.To, text: flat(full.Text, 600), link: link ? link.replace(/&amp;/g, '&') : null};
            } catch (e) { st.mail = {error: String(e.message).slice(0, 300)}; }
            fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
            fact('seed', st);
            log(app.name, 'seeded', st.scratch, st.task && st.task.logFile);
        }

        // ── admin ───────────────────────────────────────────────────────────────
        if (on('admin')) {
            CUR = 'admin';
            await signIn(page, 'admin');
            await idle(page).catch(() => {});
            // the user menu on the site's and the journals' public pages, and where "Administration" lands
            const menus = {};
            for (const [k, u] of [['site', app.url('/index.php/index/en')], ['pk', ctxUrl(PK, '')], ['scratch', ctxUrl(st.scratch, '')]]) {
                await go(page, u);
                const m = await publicUser(page);
                await snap(page, `admin-public-${k}`, {menu: m}, k === 'site');
                let dest = null;
                const top = page.locator('#navigationUser > li').filter({has: page.locator('ul')}).first();
                const entry = page.locator('#navigationUser a').filter({hasText: /^\s*Administration\s*$/}).first();
                if (await entry.count()) {
                    await top.hover().catch(() => {}); await sleep(300);
                    await entry.click().catch(async () => { await entry.click({force: true}); });
                    await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                    dest = {url: rel(page.url()), title: await page.title()};
                }
                menus[k] = {menu: m, dest};
            }
            fact('admin-user-menus', menus);
            await loc(page, 'public user menu entry Administration', page.locator('#navigationUser a').filter({hasText: /^\s*Administration\s*$/}));
            // the side menu on a journal's editorial screens
            const sides = {};
            for (const [k, c] of [['pk', PK], ['scratch', st.scratch]]) {
                await go(page, ctxUrl(c, '/dashboard/editorial'));
                const tops = await sideTop(page);
                await snap(page, `admin-editorial-${k}`, {tops}, k === 'pk');
                let dest = null;
                const a = page.locator('nav#app-nav a, nav[aria-label="Site Navigation"] a').filter({hasText: /^\s*Administration\s*$/}).first();
                if (await a.count()) {
                    await a.click(); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                    dest = {url: rel(page.url()), title: await page.title()};
                }
                sides[k] = {tops, dest};
            }
            fact('admin-side-menus', sides);
            // Administration itself, at the two site addresses; the version check per load
            const vc0 = (versionCheckLines(app) || []).length;
            const adm = {};
            for (const [k, u] of [['index-admin', app.url('/index.php/index/admin')], ['index-en-admin', site('/admin')]]) {
                const r = await go(page, u);
                adm[k] = await pageFacts(page, r);
            }
            const vc1 = (versionCheckLines(app) || []).length;
            const s = await snap(page, 'admin-administration');
            const panels = await page.evaluate(() => {
                const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
                const main = document.querySelector('main') || document.body;
                return [...main.querySelectorAll('h2')].map((h) => {
                    let box = h.parentElement;
                    while (box && box !== main && !box.querySelector('a, button')) box = box.parentElement;
                    return {
                        heading: tc(h), text: tc(h.nextElementSibling),
                        controls: box ? [...box.querySelectorAll('a, button')].map((c) => ({tag: c.tagName.toLowerCase(), text: tc(c), href: c.getAttribute('href'), form: c.form ? c.form.getAttribute('action') : null, method: c.form ? c.form.getAttribute('method') : null, confirm: /confirm\(/.test(c.getAttribute('onclick') || '')})) : [],
                    };
                });
            });
            const allControls = await page.locator('main a:visible, main button:visible').evaluateAll((els) => els.map((e) => ({tag: e.tagName.toLowerCase(), text: e.textContent.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')})));
            fact('administration', {pages: adm, panels, allControls, versionCheckLinesAdded: vc1 - vc0, h1: s.text && s.text.main ? s.text.main.slice(0, 80) : null});
            await loc(page, 'Administration heading', page.locator('main h1'));
            await loc(page, 'Administration panels (h2)', page.locator('main h2'));
            await loc(page, 'Expire User Sessions button', page.getByRole('button', {name: 'Expire User Sessions'}));
            await loc(page, 'Delete Data Caches button', page.getByRole('button', {name: 'Delete Data Caches'}));
            await loc(page, 'Delete Template Cache button', page.getByRole('button', {name: 'Delete Template Cache'}));
            await loc(page, 'Delete Task Logs button', page.getByRole('button', {name: 'Delete Task Logs'}));
            await loc(page, 'View System Information link', page.getByRole('link', {name: 'View System Information'}));
            // the three buttons that ask first: press, answer Cancel, read the page after
            const asks = {};
            for (const name of ['Expire User Sessions', 'Delete Template Cache', 'Delete Task Logs']) {
                CUR = `admin-ask-${name}`;
                await go(page, app.url('/index.php/index/admin'));
                const before = DIALOGS.length;
                let nav = false;
                const onNav = () => { nav = true; };
                page.on('framenavigated', onNav);
                await page.getByRole('button', {name, exact: true}).click();
                await sleep(1500);
                page.off('framenavigated', onNav);
                asks[name] = {dialogs: DIALOGS.slice(before), navigated: nav, url: rel(page.url()), stillSignedIn: /admin/.test(await page.locator('header').innerText().catch(() => ''))};
            }
            CUR = 'admin';
            fact('administration-asks-cancelled', asks);
            // every panel's destination
            const dests = {};
            for (const [k, name] of [['hosted', /^Hosted (Journals|Presses|Servers)$/], ['settings', /^Site Settings$/], ['sysinfo', /^View System Information$/], ['jobs', /^View Jobs$/], ['failed', /^View Failed Jobs$/]]) {
                await go(page, app.url('/index.php/index/admin'));
                const v0 = (versionCheckLines(app) || []).length;
                await page.getByRole('link', {name}).first().click();
                await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(300);
                const f = await pageFacts(page, null);
                f.versionCheckLinesAdded = (versionCheckLines(app) || []).length - v0;
                await snap(page, `admin-dest-${k}`, {facts: f}, k !== 'settings');
                dests[k] = f;
            }
            // Failed Job Details: an existing row's Details link (read only), else a failed job of our own
            await go(page, site('/admin/failedJobs'));
            let href = await page.locator('main a[href*="failedJobDetails"]').first().getAttribute('href').catch(() => null);
            let own = null;
            if (!href) {
                own = await app.api.createJob({state: 'failed'}).catch((e) => ({error: String(e.message)}));
                st.ownFailedJob = own;
                fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
                if (own && own.id) href = site(`/admin/failedJobDetails/${own.id}`);
            }
            if (href) {
                await go(page, href.startsWith('http') ? href : app.url(href));
                const f = await pageFacts(page, null);
                await snap(page, 'admin-dest-details', {facts: f, own});
                dests.details = {...f, own: own && own.id};
            }
            // a Details address with no such failed job
            const rn = await go(page, site('/admin/failedJobDetails/999999'));
            dests.detailsMissing = await pageFacts(page, rn);
            await snap(page, 'admin-details-missing', {}, false);
            fact('admin-destinations', dests);
            await loc(page, 'trail (nav.app__breadcrumbs)', page.locator('nav.app__breadcrumbs'));
            await signOut(page);
        }

        // ── sysinfo ─────────────────────────────────────────────────────────────
        if (on('sysinfo')) {
            CUR = 'sysinfo';
            await signIn(page, 'admin'); await idle(page).catch(() => {});
            await go(page, app.url('/index.php/index/admin'));
            await page.getByRole('link', {name: 'View System Information'}).click();
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            await snap(page, 'sysinfo');
            const si = await page.evaluate(() => {
                const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
                const main = document.querySelector('main') || document.body;
                const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({tag: h.tagName, text: tc(h), id: h.id}));
                const tables = [...main.querySelectorAll('table')].map((t) => ({
                    labelledBy: t.getAttribute('aria-labelledby'),
                    head: [...t.querySelectorAll('thead th, thead td')].map(tc),
                    rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((c) => ({text: c.textContent, cls: c.className, colspan: c.getAttribute('colspan'), bold: parseInt(getComputedStyle(c).fontWeight, 10) >= 600}))),
                }));
                const links = [...main.querySelectorAll('a')].map((a) => ({text: tc(a), href: a.getAttribute('href'), target: a.getAttribute('target')}));
                const inputs = [...main.querySelectorAll('input, select, textarea, button')].map((e) => ({tag: e.tagName, type: e.type, name: e.name, text: tc(e)}));
                const order = [...main.querySelectorAll('h1, h2, p, table, a')].filter((e) => !e.closest('table')).map((e) => `${e.tagName}:${tc(e).slice(0, 60)}`);
                return {heads, tables, links, inputs, order, title: document.title};
            });
            fact('sysinfo', {heads: si.heads, links: si.links, inputs: si.inputs, order: si.order, title: si.title, tablesHead: si.tables.map((t) => ({labelledBy: t.labelledBy, head: t.head, rowCount: t.rows.length}))});
            const versionTable = si.tables.find((t) => /version/i.test(t.labelledBy || ''));
            const serverTable = si.tables.find((t) => /server/i.test(t.labelledBy || ''));
            const confTable = si.tables.find((t) => /systemConfiguration/i.test(t.labelledBy || ''));
            fact('sysinfo-version-history', versionTable && versionTable.rows.map((r) => r.map((c) => c.text.trim())));
            fact('sysinfo-server', serverTable && serverTable.rows.map((r) => r.map((c) => c.text.trim())));
            // the configuration table against the file
            const shown = [];
            let group = null;
            for (const r of (confTable ? confTable.rows : [])) {
                if (r.length === 1 && r[0].colspan === '2') { group = r[0].text.trim(); shown.push({section: group, key: null, bold: r[0].bold}); continue; }
                shown.push({section: group, key: r[0] && r[0].text.trim(), value: r[1] ? r[1].text : null});
            }
            const cfg = configAsWritten(app);
            const byKey = (s, k) => shown.find((x) => x.section === s && x.key === k);
            const mism = [];
            for (const w of cfg.rows) {
                if (w.key === null) { if (!shown.find((x) => x.section === w.section && x.key === null)) mism.push({section: w.section, missingGroup: true}); continue; }
                const row = byKey(w.section, w.key);
                const exp = specExpect(w.section, w.key, w.raw);
                if (!row) mism.push({section: w.section, key: w.key, raw: w.raw, missing: true});
                else if (row.value.trim() !== exp || row.value !== row.value.trim()) mism.push({section: w.section, key: w.key, raw: w.raw, expected: exp, shown: row.value});
            }
            const extra = shown.filter((x) => x.key && !cfg.rows.find((w) => w.section === x.section && w.key === x.key));
            const pick = (s, k) => { const r = byKey(s, k); return r ? JSON.stringify(r.value) : '(no row)'; };
            fact('sysinfo-config', {
                file: cfg.file, groups: shown.filter((x) => x.key === null).map((x) => `${x.section}${x.bold ? '(bold)' : ''}`), rowCount: shown.filter((x) => x.key).length,
                fileKeyCount: cfg.rows.filter((w) => w.key).length, mismatches: mism, extraRows: extra,
                td2: {'oai.oai': pick('oai', 'oai'), 'queues.job_runner': pick('queues', 'job_runner'), 'schedule.task_runner': pick('schedule', 'task_runner'), 'database.password': pick('database', 'password'), 'general.app_key': pick('general', 'app_key'), 'database.username': pick('database', 'username'), 'files.umask': pick('files', 'umask'), 'captcha.recaptcha': pick('captcha', 'recaptcha'), 'security.allow_plugin_install': pick('security', 'allow_plugin_install'), 'cli.xslt_command': pick('cli', 'xslt_command')},
            });
            record('sysinfo-config-rows', {shown, file: cfg});
            await loc(page, 'System Information heading', page.locator('main h1'));
            await loc(page, 'Check for updates link', page.getByRole('link', {name: 'Check for updates'}));
            await loc(page, 'Extended PHP Information link', page.getByRole('link', {name: 'Extended PHP Information'}));
            await loc(page, 'configuration group rows', page.locator('.app--admin__systemInfoGroup'));
            await loc(page, 'Version history table', page.getByRole('table', {name: 'Version history'}));
            await loc(page, 'Server Information table', page.getByRole('table', {name: 'Server Information'}));
            // "Extended PHP Information": a new tab
            const [popup] = await Promise.all([
                page.context().waitForEvent('page', {timeout: 15_000}).catch(() => null),
                page.getByRole('link', {name: 'Extended PHP Information'}).click(),
            ]);
            if (popup) {
                await popup.waitForLoadState('load').catch(() => {});
                const ph = await popup.evaluate(() => ({title: document.title, h1: (document.querySelector('h1') || {}).textContent || null, firstTable: (document.querySelector('table') || {}).innerText ? document.querySelector('table').innerText.slice(0, 200) : null})).catch((e) => ({error: String(e)}));
                await shot(popup, 'sysinfo-phpinfo').catch(() => {});
                fact('sysinfo-phpinfo', {newTab: true, url: rel(popup.url()), ...ph, openerUrl: rel(page.url())});
                await popup.close();
            } else {
                fact('sysinfo-phpinfo', {newTab: false, url: rel(page.url())});
            }
            // "Check for updates" (td1): the version check against the dead proxy
            CUR = 'sysinfo-check';
            await go(page, site('/admin/systemInfo'));
            const v0 = (versionCheckLines(app) || []).length;
            const respP = page.waitForResponse((r) => /versionCheck=1/.test(r.url()), {timeout: 30_000}).catch(() => null);
            await page.getByRole('link', {name: 'Check for updates'}).click();
            const resp = await respP;
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            const cf = await pageFacts(page, resp);
            cf.bodyText = flat(await page.locator('body').innerText().catch(() => ''), 1500);
            cf.versionCheckLinesAdded = (versionCheckLines(app) || []).length - v0;
            await snap(page, 'sysinfo-check-for-updates', {facts: cf});
            fact('sysinfo-check-for-updates', cf);
            CUR = 'sysinfo';
            // the version check on every Administration page load (Rule 4), paired in the server log
            const loads = {};
            const from = logSize(app);
            for (const [k, p] of [['admin', '/admin'], ['contexts', '/admin/contexts'], ['settings', '/admin/settings'], ['sysinfo', '/admin/systemInfo'], ['jobs', '/admin/jobs'], ['failed', '/admin/failedJobs'], ['admin-again', '/admin'], ['pk-dashboard', null], ['pk-journal-settings', 'ctx:/management/settings/context']]) {
                const u = !p ? ctxUrl(PK, '/dashboard/editorial') : p.startsWith('ctx:') ? ctxUrl(PK, p.slice(4)) : site(p);
                const r = await go(page, marked(u));
                const f = await pageFacts(page, r);
                loads[k] = {mark: MARK, upgradeNotice: f.upgrade, notice: f.notice, status: f.status, h1: f.h1};
            }
            await sleep(1500);
            const pairs = checkedRequests(app, from);
            for (const k of Object.keys(loads)) { const hit = pairs.filter((x) => new RegExp(`k1vc=${loads[k].mark}(\\D|$)`).test(x.request)); loads[k].logged = hit; }
            fact('version-check-per-load', {loads, sample: (versionCheckLines(app) || []).slice(-1)[0]});
            await signOut(page);
        }

        // ── journal: Rule 3, admin under a journal's path ──────────────────────────
        if (on('journal')) {
            CUR = 'journal';
            await signIn(page, 'admin'); await idle(page).catch(() => {});
            const res = {};
            for (const c of [PK, st.scratch]) {
                for (const op of [...OPS, `/downloadScheduledTaskLogFile?file=${st.task && st.task.logFile}`]) {
                    const r = await go(page, ctxUrl(c, `/admin${op}`));
                    const f = await pageFacts(page, r);
                    res[`${c === PK ? 'pk' : 'scratch'}${op || '/'}`] = {status: f.status, url: f.url, h1: f.h1, denied: f.denied, login: f.login, bodyStart: f.bodyStart.slice(0, 160)};
                    if (op === '' && c === PK) await snap(page, 'journal-admin-pk');
                }
            }
            // and without the locale segment
            const r2 = await go(page, app.url(`/index.php/${PK}/admin`));
            res['pk-nolocale/admin'] = (await pageFacts(page, r2));
            // the site's Administration still works afterwards (nothing was run)
            const r3 = await go(page, app.url('/index.php/index/admin'));
            res['after-site-admin'] = {status: r3 && r3.status ? r3.status() : null, h1: (await pageFacts(page, r3)).h1};
            fact('journal-path', res);
            await signOut(page);
        }

        // ── roles: every other permission level ────────────────────────────────────
        if (on('roles')) {
            const res = {};
            for (const [lvl, u] of ROSTER[app.name]) {
                CUR = `roles-${lvl}`;
                await signIn(page, u, {contextPath: PK}); await idle(page).catch(() => {});
                const r = {user: u};
                await go(page, app.url('/index.php/index/en'));
                r.siteMenu = await publicUser(page);
                await go(page, ctxUrl(PK, ''));
                r.pkMenu = await publicUser(page);
                await go(page, ctxUrl(PK, '/dashboard/editorial'));
                r.sideTop = await sideTop(page);
                r.addresses = {};
                for (const op of [...OPS, `/downloadScheduledTaskLogFile?file=${st.task && st.task.logFile}`]) {
                    const resp = await go(page, site(`/admin${op}`));
                    const f = await pageFacts(page, resp);
                    r.addresses[op || '/'] = {status: f.status, url: f.url, h1: f.h1, denied: f.denied, login: f.login, bodyStart: f.bodyStart.slice(0, 120)};
                    if (op === '' ) await snap(page, `roles-${lvl}-admin`, {}, lvl === 'manager' || lvl === 'reader');
                }
                // the report email's own link, as it reads
                if (st.mail && st.mail.link) {
                    const resp = await go(page, st.mail.link.replace(/^https?:\/\/[^/]+/, app.baseURL));
                    const f = await pageFacts(page, resp);
                    r.mailLink = {status: f.status, url: f.url, denied: f.denied, login: f.login, bodyStart: f.bodyStart.slice(0, 120)};
                }
                res[lvl] = r;
                await signOut(page);
            }
            fact('roles', res);
        }

        // ── out: signed out ─────────────────────────────────────────────────────────
        if (on('out')) {
            CUR = 'out';
            await signOut(page).catch(() => {});
            const res = {};
            for (const op of [...OPS, `/downloadScheduledTaskLogFile?file=${st.task && st.task.logFile}`]) {
                const resp = await go(page, site(`/admin${op}`));
                const f = await pageFacts(page, resp);
                res[op || '/'] = {status: f.status, url: f.url, h1: f.h1, denied: f.denied, login: f.login};
                if (op === '') await snap(page, 'out-admin');
            }
            fact('signed-out', res);
        }

        // ── log: the report's link as admin ─────────────────────────────────────────
        if (on('log')) {
            CUR = 'log';
            fact('log-mail', st.mail);
            if (st.mail && st.mail.link) {
                const {page: p2, context: c2, close: close2} = await launch(app);
                watch(p2);
                try {
                    await signIn(p2, 'admin'); await idle(p2).catch(() => {});
                    const url = st.mail.link.replace(/^https?:\/\/[^/]+/, app.baseURL);
                    const dl = p2.waitForEvent('download', {timeout: 15_000}).catch(() => null);
                    const respP = p2.waitForResponse((r) => /downloadScheduledTaskLogFile/.test(r.url()), {timeout: 15_000}).catch(() => null);
                    await p2.goto(url).catch(() => {});
                    const [d, resp] = await Promise.all([dl, respP]);
                    let content = null;
                    if (d) { const fp = path.join(outDir(), `k1-log-${app.name}.log`); await d.saveAs(fp).catch(() => {}); try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { /* none */ } }
                    fact('log-admin', {download: !!d, suggested: d ? d.suggestedFilename() : null, status: resp ? resp.status() : null, disposition: resp ? resp.headers()['content-disposition'] : null, content});
                    // a log file that does not exist
                    const dl2 = p2.waitForEvent('download', {timeout: 5_000}).catch(() => null);
                    const r2 = await p2.goto(site('/admin/downloadScheduledTaskLogFile?file=nosuchfile.log')).catch((e) => ({err: String(e.message).slice(0, 120)}));
                    const d2 = await dl2;
                    fact('log-admin-missing', {download: !!d2, status: r2 && r2.status ? r2.status() : r2, body: flat(await p2.locator('body').innerText().catch(() => ''), 200)});
                } finally { await close2(); }
            }
        }
    } finally {
        record('facts', {...FACTS, crashes: CRASH, dialogs: DIALOGS}, {merge: true});
        await close();
        const n = Object.values(CRASH).reduce((a, b) => a + b.length, 0);
        log(app.name, 'done; crashes seen', n);
    }
});
