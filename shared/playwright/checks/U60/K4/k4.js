// U60 claim check, chunk K4: across the Site Settings screens. Side effects
// (the audit log, the theme's caches, the site's public files, the server-log
// warning of A3, no mail / notification / journal log), Settings that modify
// behavior 16–17 (the number of hosted journals, the configuration file),
// Cross-feature interactions, the Canonical preamble, the Reference entry
// points (each side tab's address). All three apps.
// Spec: docs/specs/U60-site-settings.md lines 307–331, 372–491, 514–522,
// 997–1043; footnotes m, s, f-a3.
//
// The site is one record every checker shares. This script saves "Security"
// (K1's), "Settings" (K1's), "Theme" and "Setup" (K3's) only; "Information" and
// "Bulk Emails" (K2's) are saved unchanged, and the "Journal redirect" end is
// driven, only in the phases `k2tabs` and `redirect`, run once K2 has finished.
// Each value is written down before it changes and put back in a finally (the
// Site Name through `pkpApi.setSite({title: ''})`, the install state).
// The server log read is the probe server's own
// (apps/<app>/playwright/.server-logs/server-<probe port>-probe.log): php -S
// serves one request at a time, so a warning belongs to the next request line.
//
// Seeds per app (tag prefix u60k4): one journal with a manager, state in
// k4-state-<app>.json.
// Phases (PHASES=a,b; default the first five):
//   seed      the scratch journal
//   admin     Administration, the user menu, Site Settings' tabs and each side
//             tab's address, the site's home page, a journal's Privacy page
//   saves     Security 6→7→6, Settings (a name, then the install state back),
//             Theme unchanged and a colour changed and back (caches), Setup: a
//             logo and a style sheet uploaded, saved, removed, saved (files);
//             server-log warnings, audit log, mail, notifications, journal logs
//   leave     an unsaved Security change left for "Appearance", then the page
//   final     every touched site value read back
//   k2tabs    "Information" and "Bulk Emails" saved unchanged (only once K2 is done)
//   redirect  a "Journal redirect" set: the warnings with it; blank again (only once K2 is done)
// Run: PROBE_FEATURE=U60 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U60/K4/k4.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'admin', 'saves', 'leave', 'final'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log('[k4]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const loadState = (app) => { try { return JSON.parse(fs.readFileSync(stateFile(app), 'utf8')); } catch { return {}; } };
const saveState = (app, st) => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
const REPO = path.resolve(__dirname, '../../../../..');
const sql = (app, q) => execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const SITE_KEYS = ['title', 'minPasswordLength', 'baseColour', 'pageHeaderTitleImage', 'styleSheet', 'pageFooter', 'sidebar', 'themePluginPath', 'enableBulkEmails', 'contactName', 'contactEmail', 'about', 'privacyStatement'];
const siteRows = (app) => sql(app, `select setting_name, locale, left(setting_value, 160) from site_settings where setting_name in (${SITE_KEYS.map((n) => `'${n}'`).join(',')}) order by 1, 2`).split('\n').filter(Boolean);
const siteRow = (app) => sql(app, 'select redirect_context_id, min_password_length from site');
const themeRows = (app) => sql(app, "select setting_name, left(setting_value, 80) from plugin_settings where plugin_name = 'defaultthemeplugin' and context_id is null order by 1").split('\n').filter(Boolean);

// ---- the server's own logs --------------------------------------------------------
const serverLog = (app) => path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
const appLogDir = (app) => path.join(REPO, 'checkouts', 'files', `${app.name}-test`, 'logs');
const size = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };
const readFrom = (f, off) => { const fd = fs.openSync(f, 'r'); const n = size(f) - off; const b = Buffer.alloc(Math.max(0, n)); if (n > 0) fs.readSync(fd, b, 0, n, off); fs.closeSync(fd); return b.toString('utf8'); };
const appLogs = (app) => { try { return fs.readdirSync(appLogDir(app)).map((n) => path.join(appLogDir(app), n)); } catch { return []; } };
function mark(app) {
    return {t: Date.now(), iso: new Date().toISOString(), srv: size(serverLog(app)), app: Object.fromEntries(appLogs(app).map((f) => [f, size(f)]))};
}
// What the server's log and the application's log gained since `m`: each PHP
// warning paired with the request line that follows it (one request at a time).
function since(app, m) {
    const lines = readFrom(serverLog(app), m.srv).split('\n');
    const req = /\[(\d{3})\]: (GET|POST|PUT|DELETE|PATCH|HEAD) (\S+)/;
    const warnings = [];
    const siteWrites = [];
    for (let i = 0; i < lines.length; i++) {
        const r = lines[i].match(req);
        if (r && /\/api\/v1\/site/.test(r[3]) && r[2] !== 'GET') siteWrites.push(`${r[2]} ${r[3]} ${r[1]}`);
        if (/PHP (Warning|Notice|Deprecated|Fatal|Parse)/.test(lines[i])) {
            let next = null;
            for (let j = i + 1; j < lines.length; j++) { const q = lines[j].match(req); if (q) { next = `${q[2]} ${q[3].slice(0, 120)} ${q[1]}`; break; } }
            warnings.push({warning: flat(lines[i].replace(/^\[[^\]]+\]\s*/, '').replace(REPO + '/', ''), 260), request: next});
        }
    }
    const appLog = [];
    for (const f of appLogs(app)) {
        const off = m.app[f] || 0;
        const t = readFrom(f, off);
        for (const l of t.split('\n')) if (/^\[\d{4}-/.test(l)) appLog.push(flat(l, 240));
    }
    return {warnings, siteWrites, appLog};
}
// Mail since `m` (Mailpit is shared by the three apps: read subjects and recipients)
async function mails(app, m) {
    const res = await app.mail._get('/api/v1/messages', {limit: '100'}).catch(() => ({messages: []}));
    return (res.messages || []).filter((x) => new Date(x.Created).getTime() >= m.t - 1000).map((x) => ({created: x.Created, subject: x.Subject, to: (x.To || []).map((t) => t.Address).join(','), from: x.From && x.From.Address}));
}
const ids = (app) => ({
    notifications: sql(app, 'select coalesce(max(notification_id), 0) from notifications'),
    eventLog: sql(app, 'select coalesce(max(log_id), 0) from event_log'),
    emailLog: sql(app, 'select coalesce(max(log_id), 0) from email_log'),
});
const newRows = (app, before) => ({
    notifications: sql(app, `select notification_id, context_id, type, date_created from notifications where notification_id > ${before.notifications} order by 1`).split('\n').filter(Boolean),
    eventLog: sql(app, `select log_id, assoc_type, assoc_id, event_type, date_logged from event_log where log_id > ${before.eventLog} order by 1`).split('\n').filter(Boolean),
    emailLog: sql(app, `select log_id, assoc_type, assoc_id, event_type, date_sent from email_log where log_id > ${before.emailLog} order by 1`).split('\n').filter(Boolean),
});
const cacheFiles = (app) => {
    const dir = path.join(REPO, 'checkouts', app.name, 'cache');
    let css = []; let tc = 0;
    try { css = fs.readdirSync(dir).filter((n) => n.endsWith('.css')); } catch {}
    try { tc = fs.readdirSync(path.join(dir, 't_compile')).length; } catch {}
    return {css, tCompile: tc};
};
const siteFiles = (app) => {
    const dir = path.join(REPO, 'checkouts', app.name, 'public', 'site');
    try {
        return fs.readdirSync(dir).filter((n) => !/^profileImage-/.test(n) && n !== 'images').map((n) => {
            const s = fs.statSync(path.join(dir, n));
            return {name: n, size: s.size, mtime: s.mtime.toISOString(), head: s.size < 400 ? fs.readFileSync(path.join(dir, n), 'utf8').slice(0, 120) : null};
        });
    } catch (e) { return String(e.message); }
};

// ---- files ---------------------------------------------------------------------------
const zlib = require('zlib');
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const png = (w, h, [r, g, b]) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
// A sheet that changes no look: a custom property only, so other checkers' reads stay as they are.
const CSS = 'html { --u60k4-site-sheet: 1; }\n';
const FILES = {
    logo: {name: 'u60k4-site-logo.png', mimeType: 'image/png', buffer: png(200, 50, [120, 40, 20])},
    css: {name: 'u60k4-sheet.css', mimeType: 'text/css', buffer: Buffer.from(CSS)},
};

forEachApp(async (app) => {
    const st = loadState(app);
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); };
    const RESTORED = [];
    const CRASH = [];
    const siteSettings = () => app.url('/index.php/index/en/admin/settings');

    // ---- seed ---------------------------------------------------------------------------
    if (on('seed') && !st.J) {
        const J = tag('u60k4');
        await app.api.createContext({tag: J, context: {name: `U60 K4 journal ${J}`, acronym: 'K4J'}, users: [{username: `${J}mgr`, roles: ['manager']}]});
        st.J = J; st.mgr = `${J}mgr`;
        st.Jid = sql(app, `select ${app.name === 'omp' ? 'press_id from presses' : app.name === 'ops' ? 'server_id from servers' : 'journal_id from journals'} where path = '${J}'`);
        saveState(app, st);
        log(app.name, 'seeded', J, st.Jid);
    }
    const J = st.J;

    const {page, close} = await launch(app);
    const DIALOGS = [];
    page.on('dialog', (d) => { DIALOGS.push({type: d.type(), message: d.message().slice(0, 200), url: page.url()}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    page.on('response', (r) => { if (r.status() >= 500) CRASH.push(`server ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`); });
    page.on('pageerror', (e) => CRASH.push(`script ${String(e.message || e).slice(0, 200)}`));
    const snap = async (p, name, extra = {}) => { const s = await screen(p).catch((e) => ({error: String(e.message || e)})); record(name, {...extra, screen: s}); await shot(p, name).catch(() => {}); return s; };
    const tabsState = async () => page.evaluate(() => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e && e.offsetParent !== null;
        return {
            hash: location.hash,
            tabs: [...document.querySelectorAll('[role="tab"]')].filter(vis).map((t) => ({id: t.id, text: txt(t), selected: t.getAttribute('aria-selected')})),
        };
    });
    const openTab = async (sub, top = 'setup') => {
        await page.goto(siteSettings()); await idle(page);
        await page.locator(`#${top}-button`).first().click().catch(() => {});
        if (top === 'appearance') {
            await page.locator('#appearance').getByRole('tab', {name: sub === 'theme' ? 'Theme' : 'Setup', exact: true}).first().click();
            await idle(page); await sleep(500);
            return sub === 'theme'
                ? page.locator('#appearance').locator('[role="tabpanel"]').filter({has: page.locator('[id^="theme-"]')}).first()
                : page.locator('form').filter({has: page.locator('[id^="siteAppearance-"]')}).first();
        }
        await page.locator(`#${sub}-button`).first().click();
        const panel = page.locator(`[role="tabpanel"]#${sub}`).first();
        await panel.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        return panel;
    };
    // One "Save" of a panel, with everything it left behind
    const saveMeasured = async (label, root) => {
        const m = mark(app);
        const before = ids(app);
        const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await root.getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await resp;
        const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page); await sleep(1500);
        const s = since(app, m);
        const out = {
            label,
            status: r ? r.status() : null,
            request: r ? `${r.request().method()} ${r.request().headers()['x-http-method-override'] || ''} ${r.url().replace(/^https?:\/\/[^/]+/, '')}` : null,
            posted: r ? flat(r.request().postData(), 600) : null,
            saved,
            serverLog: s,
            mails: await mails(app, m),
            rows: newRows(app, before),
            site: siteRow(app),
        };
        log(app.name, label, out.status, 'warnings', s.warnings.length, 'siteWrites', s.siteWrites.length);
        return out;
    };

    try {
        // ---- admin: the Administration page, the tabs, the addresses -----------------
        if (on('admin')) {
            const A = {};
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
            const s1 = await snap(page, 'a01-administration');
            A.admin = {url: s1.url, title: await page.title(), confirmAccess: await page.getByText('Confirm Access').count(),
                links: await page.locator('main a, main button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)),
                notices: await page.locator('.pkpNotification, [role="alert"], .pkp_notification, .app__notifications *').allInnerTexts().catch(() => [])};
            await loc(page, 'Administration: "Site Settings" link', page.getByRole('link', {name: 'Site Settings', exact: true}));
            // the public user menu (U08's) on the site's home page, as the Site Administrator
            await page.goto(app.url('/index.php/index/en')); await idle(page);
            await snap(page, 'a02-public-user-menu');
            A.userMenu = await page.locator('#navigationUser a, .pkp_navigation_user a').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), href: (e.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}))).catch((e) => String(e.message));
            await loc(page, 'public user menu: "Administration" link', page.locator('#navigationUser a, .pkp_navigation_user a').filter({hasText: 'Administration'}));
            await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
            // Site Settings: the top tabs and the side tabs, and the address each click writes
            await page.getByRole('link', {name: 'Site Settings', exact: true}).first().click().catch(async () => page.goto(siteSettings()));
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            const s3 = await snap(page, 'a03-site-settings');
            A.siteSettings = {url: s3.url, title: await page.title(), notices: await page.locator('.pkpNotification, [role="alert"]').allInnerTexts().catch(() => [])};
            A.tabsAtLanding = await tabsState();
            const clicks = [];
            for (const [top, subs] of [['setup', ['settings', 'security', 'info', 'languages', 'navigationMenus', 'highlights', 'bulkEmails', 'statistics', 'orcidSiteSettings']], ['appearance', ['Theme', 'Setup']], ['announcements', []], ['plugins', []]]) {
                await page.locator(`#${top}-button`).first().click().catch(() => {}); await sleep(500);
                clicks.push({top, hash: await page.evaluate(() => location.hash)});
                for (const sub of subs) {
                    const t = top === 'appearance' ? page.locator('#appearance').getByRole('tab', {name: sub, exact: true}).first() : page.locator(`#${sub}-button`).first();
                    if (!(await t.count())) { clicks.push({top, sub, present: false}); continue; }
                    await t.click().catch(() => {}); await sleep(500);
                    clicks.push({top, sub, text: flat(await t.innerText().catch(() => '')), hash: await page.evaluate(() => location.hash)});
                }
            }
            A.clicks = clicks;
            A.sideTabs = (await tabsState()).tabs;
            // The Reference table's addresses, each opened afresh, plus the address a click writes
            const addr = ['#setup/settings', '#setup/security', '#setup/info', '#setup/bulkEmails', '#appearance/theme', '#appearance/setup', '#setup', '#appearance', '#info', '#bulkEmails', '#security', '#settings'];
            A.addresses = [];
            for (const h of addr) {
                await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
                await page.goto(siteSettings() + h); await idle(page); await sleep(800);
                const t = await tabsState();
                const selected = t.tabs.filter((x) => x.selected === 'true').map((x) => x.text);
                A.addresses.push({address: h, hashAfter: t.hash, selected});
                if (['#setup/settings', '#setup/info', '#appearance/theme'].includes(h)) await snap(page, `a04-address-${h.replace(/[#/]/g, '_')}`);
            }
            // a reload keeps the tab? (Rule 1's line is K2's; this is the Reference's address)
            await page.goto(siteSettings()); await idle(page);
            await page.locator('#setup-button').first().click(); await page.locator('#info-button').first().click().catch(() => {}); await sleep(500);
            const hInfo = await page.evaluate(() => location.hash);
            await page.reload(); await idle(page); await sleep(800);
            A.reloadOnInfo = {hashBefore: hInfo, after: (await tabsState()).tabs.filter((x) => x.selected === 'true').map((x) => x.text), hashAfter: await page.evaluate(() => location.hash)};
            await page.goto(siteSettings()); await idle(page);
            await page.locator('#appearance-button').first().click(); await sleep(400);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click(); await sleep(600);
            const hApp = await page.evaluate(() => location.hash);
            await snap(page, 'a07-appearance-setup-before-reload');
            await page.reload(); await idle(page); await sleep(800);
            A.reloadOnAppearanceSetup = {hashBefore: hApp, after: (await tabsState()).tabs.filter((x) => x.selected === 'true').map((x) => x.text), hashAfter: await page.evaluate(() => location.hash)};
            await snap(page, 'a08-appearance-setup-after-reload');
            await page.locator('#appearance-button').first().click(); await sleep(400);
            await page.locator('#appearance').getByRole('tab', {name: 'Theme', exact: true}).first().click(); await sleep(600);
            const hTheme = await page.evaluate(() => location.hash);
            await page.reload(); await idle(page); await sleep(800);
            A.reloadOnAppearanceTheme = {hashBefore: hTheme, after: (await tabsState()).tabs.filter((x) => x.selected === 'true').map((x) => x.text), hashAfter: await page.evaluate(() => location.hash)};
            // The site's home page (the list of journals) and a journal's privacy page, as a visitor
            await signOut(page);
            await page.goto(app.url('/index.php/index')); await idle(page);
            const s5 = await snap(page, 'a05-site-home');
            A.siteHome = {url: s5.url, contexts: await page.locator('.journals li, .presses li, .servers li, .pkp_structure_main li h3, .pkp_structure_main h2').allInnerTexts().then((x) => x.length).catch(() => null), about: flat(await page.locator('.about_site').first().innerText().catch(() => '(no .about_site)'), 200), aboutSiteCount: await page.locator('.about_site').count()};
            await page.goto(app.url(`/index.php/${app.contextPath}/en/about/privacy`)); await idle(page);
            const s6 = await snap(page, 'a06-journal-privacy');
            A.journalPrivacy = {url: s6.url, main: flat(s6.text && s6.text.main, 300)};
            A.contexts = {count: sql(app, `select count(*) from ${app.name === 'omp' ? 'presses' : app.name === 'ops' ? 'servers' : 'journals'}`)};
            fact('admin', A);
        }

        // ---- saves: what each save leaves behind ----------------------------------------
        if (on('saves')) {
            const S = {before: {site: siteRow(app), rows: siteRows(app), theme: themeRows(app), cache: cacheFiles(app), files: siteFiles(app)}};
            const mAll = mark(app); const idsAll = ids(app);
            await signIn(page, 'admin');
            // Security: 6 → 7 → 6 (audit log path)
            let panel = await openTab('security');
            await snap(page, 's01-security');
            const min = panel.locator('#siteSecurity-minPasswordLength-control');
            S.minBefore = await min.inputValue();
            try {
                await min.fill('7');
                S.security7 = await saveMeasured('security 7', panel);
                await page.reload(); await idle(page);
                panel = await openTab('security');
                S.security7reload = await panel.locator('#siteSecurity-minPasswordLength-control').inputValue();
                await snap(page, 's02-security-7-reloaded');
            } finally {
                panel = await openTab('security');
                await panel.locator('#siteSecurity-minPasswordLength-control').fill(S.minBefore || '6');
                S.security6 = await saveMeasured('security back', panel);
                RESTORED.push({what: 'Minimum password length', to: S.minBefore, site: siteRow(app)});
            }
            // Security saved unchanged (no security key changed)
            panel = await openTab('security');
            S.securityUnchanged = await saveMeasured('security unchanged', panel);

            // Settings: a Site Name is required to save; the install state (none) back through the key
            panel = await openTab('settings');
            await snap(page, 's03-settings');
            S.settingsRedirectBefore = await panel.locator('#siteConfig-redirectContextId-control').inputValue();
            try {
                await panel.locator('#siteConfig-title-control-en').fill(`U60 K4 Site ${app.name.toUpperCase()}`);
                S.settings = await saveMeasured('settings named', panel);
                await snap(page, 's04-settings-saved');
            } finally {
                await app.api.setSite({title: ''});
                RESTORED.push({what: 'Site Name', to: '(none)', rows: sql(app, "select count(*) from site_settings where setting_name = 'title'")});
            }

            // Theme: saved unchanged; then a colour changed (caches), and back
            // warm the caches first: the site's and a journal's public pages in a visitor browser
            const visCtx = await page.context().browser().newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}});
            const vis = await visCtx.newPage();
            const look = async (p, url) => { await p.goto(url); await idle(p); return p.evaluate(() => { const h = document.querySelector('.pkp_structure_head'); return {url: location.pathname, headerBg: h ? getComputedStyle(h).backgroundColor : null, sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => (l.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')).filter((x) => /css\?name=stylesheet|public\/site/.test(x))}; }); };
            S.lookBefore = {site: await look(vis, app.url('/index.php/index/en')), journal: await look(vis, app.url(`/index.php/${J}/en`))};
            S.cacheWarm = cacheFiles(app);
            panel = await openTab('theme', 'appearance');
            await snap(page, 's05-theme');
            S.themeUnchanged = await saveMeasured('theme unchanged', panel);
            S.cacheAfterUnchanged = cacheFiles(app);
            // warm again, then change the colour
            S.lookWarm2 = {site: await look(vis, app.url('/index.php/index/en')), journal: await look(vis, app.url(`/index.php/${J}/en`))};
            S.cacheWarm2 = cacheFiles(app);
            panel = await openTab('theme', 'appearance');
            const colour = panel.locator('.pkpFormField').filter({hasText: /^Colour/}).first().locator('input').first();
            S.colourBefore = await colour.inputValue();
            try {
                await colour.click(); await colour.fill('#123456'); await colour.press('Enter').catch(() => {}); await colour.blur().catch(() => {}); await sleep(400);
                S.themeColour = await saveMeasured('theme colour', panel);
                S.cacheAfterColour = cacheFiles(app);
                // the next page load: in the browser that had the pages, and in a fresh one
                S.lookSameBrowser = {site: await look(vis, app.url('/index.php/index/en')), journal: await look(vis, app.url(`/index.php/${J}/en`))};
                await snap(vis, 's06-theme-colour-same-browser');
                const fresh = await (await page.context().browser().newContext({baseURL: app.baseURL})).newPage();
                S.lookFresh = {site: await look(fresh, app.url('/index.php/index/en')), journal: await look(fresh, app.url(`/index.php/${J}/en`))};
                await snap(fresh, 's07-theme-colour-fresh-browser');
                await fresh.context().close();
            } finally {
                panel = await openTab('theme', 'appearance');
                const c2 = panel.locator('.pkpFormField').filter({hasText: /^Colour/}).first().locator('input').first();
                await c2.click(); await c2.fill(S.colourBefore); await c2.press('Enter').catch(() => {}); await c2.blur().catch(() => {}); await sleep(400);
                S.themeBack = await saveMeasured('theme colour back', panel);
                RESTORED.push({what: 'Theme colour', to: S.colourBefore, theme: themeRows(app)});
            }
            await visCtx.close();

            // Setup: a logo, then a style sheet; each saved, removed, saved
            let form = await openTab('setup', 'appearance');
            await snap(page, 's08-appearance-setup');
            try {
                const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 8000}).catch(() => null);
                await page.locator('[id="siteAppearance-pageHeaderTitleImage-hiddenFileId-en"]').setInputFiles(FILES.logo);
                S.logoTemp = (await w)?.status() ?? null; await sleep(1200); await idle(page);
                S.logoSave = await saveMeasured('setup logo', form);
                S.logoFiles = siteFiles(app);
                S.logoRow = siteRows(app).filter((x) => /pageHeaderTitleImage/.test(x));
                const img = page.locator('[id="siteAppearance-pageHeaderTitleImage-control-en"]').locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]').locator('img').first();
                S.logoSrc = await img.getAttribute('src').catch(() => null);
                const logoPath = '/public/site/' + (S.logoFiles.find?.((f) => /^pageHeaderTitleImage/.test(f.name)) || {}).name;
                S.logoAddress = logoPath;
                S.logoGet = (await page.request.get(app.url(logoPath))).status();
                await snap(page, 's09-setup-logo-saved');
                // remove and save
                form = await openTab('setup', 'appearance');
                const logoBox = page.locator('[id="siteAppearance-pageHeaderTitleImage-control-en"]').locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
                await logoBox.getByRole('button', {name: 'Remove', exact: true}).first().click(); await sleep(600);
                S.logoRemove = await saveMeasured('setup logo removed', form);
                S.logoFilesAfter = siteFiles(app);
                S.logoGetAfter = (await page.request.get(app.url(logoPath))).status();
            } finally {
                if (siteRows(app).some((x) => /pageHeaderTitleImage/.test(x))) {
                    form = await openTab('setup', 'appearance');
                    const b = page.locator('[id="siteAppearance-pageHeaderTitleImage-control-en"]').locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
                    await b.getByRole('button', {name: 'Remove', exact: true}).first().click().catch(() => {}); await sleep(600);
                    S.logoFinally = await saveMeasured('setup logo finally', form);
                }
                RESTORED.push({what: 'Logo', to: '(none)', rows: siteRows(app).filter((x) => /pageHeaderTitleImage/.test(x))});
            }
            try {
                form = await openTab('setup', 'appearance');
                S.cssFilesBefore = siteFiles(app);
                const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 8000}).catch(() => null);
                await page.locator('#siteAppearance-styleSheet-hiddenFileId').setInputFiles(FILES.css);
                S.cssTemp = (await w)?.status() ?? null; await sleep(1200); await idle(page);
                S.cssSave = await saveMeasured('setup style sheet', form);
                S.cssFiles = siteFiles(app);
                S.cssRow = siteRows(app).filter((x) => /styleSheet/.test(x));
                const r1 = await page.request.get(app.url('/public/site/styleSheet.css'));
                S.cssGet = {status: r1.status(), body: flat(await r1.text(), 120)};
                await snap(page, 's10-setup-css-saved');
                form = await openTab('setup', 'appearance');
                const cssBox = page.locator('#siteAppearance-styleSheet-control').locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
                const cssBox2 = (await cssBox.count()) ? cssBox : page.locator('.pkpFormField').filter({has: page.locator('#siteAppearance-styleSheet-hiddenFileId')}).first();
                await cssBox2.getByRole('button', {name: 'Remove', exact: true}).first().click(); await sleep(600);
                S.cssRemove = await saveMeasured('setup style sheet removed', form);
                S.cssFilesAfter = siteFiles(app);
                const r2 = await page.request.get(app.url('/public/site/styleSheet.css'));
                S.cssGetAfter = {status: r2.status(), body: flat(await r2.text(), 120)};
            } finally {
                if (siteRows(app).some((x) => /styleSheet/.test(x))) {
                    form = await openTab('setup', 'appearance');
                    await page.locator('.pkpFormField').filter({has: page.locator('#siteAppearance-styleSheet-hiddenFileId')}).first().getByRole('button', {name: 'Remove', exact: true}).first().click().catch(() => {}); await sleep(600);
                    S.cssFinally = await saveMeasured('setup style sheet finally', form);
                }
                RESTORED.push({what: 'Site style sheet', to: '(none)', rows: siteRows(app).filter((x) => /styleSheet/.test(x))});
            }
            // The whole window: mail, notifications, journals' logs, audit, the app log
            const sAll = since(app, mAll);
            S.window = {mails: await mails(app, mAll), rows: newRows(app, idsAll), appLog: sAll.appLog, warnings: sAll.warnings.length, siteWrites: sAll.siteWrites};
            S.after = {site: siteRow(app), rows: siteRows(app), theme: themeRows(app), files: siteFiles(app)};
            fact('saves', S);
        }

        // ---- leave: an unsaved Security change left for "Appearance", then the page --------
        if (on('leave')) {
            const L = {};
            await signIn(page, 'admin');
            const panel = await openTab('security');
            const before = await panel.locator('#siteSecurity-minPasswordLength-control').inputValue();
            await panel.locator('#siteSecurity-minPasswordLength-control').fill('9');
            await page.locator('#appearance-button').first().click(); await sleep(600);
            await snap(page, 'l01-left-for-appearance');
            await page.locator('#setup-button').first().click(); await sleep(400);
            await page.locator('#security-button').first().click(); await sleep(400);
            L.backOnSecurity = await page.locator('#siteSecurity-minPasswordLength-control').inputValue();
            await snap(page, 'l02-back-on-security');
            await page.goto(app.url('/index.php/index/en/admin')).catch((e) => { L.gotoError = String(e.message).slice(0, 200); });
            await idle(page);
            L.leftTo = page.url();
            L.dialogs = DIALOGS.slice();
            L.stored = siteRow(app);
            L.before = before;
            fact('leave', L);
        }

        // ---- k2tabs: "Information" and "Bulk Emails" saved unchanged (K2 done) -------------
        if (on('k2tabs')) {
            const K = {};
            await signIn(page, 'admin');
            let panel = await openTab('info');
            await snap(page, 'k01-information');
            K.rowsBefore = siteRows(app);
            K.info = await saveMeasured('information unchanged', panel);
            panel = await openTab('bulkEmails');
            await snap(page, 'k02-bulk-emails');
            K.bulk = await saveMeasured('bulk emails unchanged', panel);
            K.rowsAfter = siteRows(app);
            fact('k2tabs', K);
        }

        // ---- redirect: the warning with a "Journal redirect" set (K2 done) ------------------
        if (on('redirect')) {
            const R = {before: siteRow(app)};
            await signIn(page, 'admin');
            try {
                let panel = await openTab('settings');
                await panel.locator('#siteConfig-title-control-en').fill(`U60 K4 Site ${app.name.toUpperCase()}`);
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({value: String(st.Jid)});
                R.set = await saveMeasured('settings redirect set', panel);
                panel = await openTab('security');
                R.securityUnchanged = await saveMeasured('security unchanged, redirect set', panel);
                panel = await openTab('setup', 'appearance');
                R.setupUnchanged = await saveMeasured('setup unchanged, redirect set', panel);
                panel = await openTab('theme', 'appearance');
                R.themeUnchanged = await saveMeasured('theme unchanged, redirect set', panel);
                await snap(page, 'r01-redirect-set');
            } finally {
                const panel = await openTab('settings');
                await panel.locator('#siteConfig-title-control-en').fill(`U60 K4 Site ${app.name.toUpperCase()}`);
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({index: 0});
                R.blank = await saveMeasured('settings redirect blank', panel);
                await app.api.setSite({title: ''});
                RESTORED.push({what: 'Journal redirect and Site Name', to: '(blank, none)', site: siteRow(app), title: sql(app, "select count(*) from site_settings where setting_name = 'title'")});
            }
            fact('redirect', R);
        }

        if (on('final')) fact('final', {site: siteRow(app), rows: siteRows(app), theme: themeRows(app), files: siteFiles(app), cache: cacheFiles(app)});
    } catch (e) {
        fact('ERROR', String(e.stack || e).slice(0, 1500));
        log(app.name, 'ERROR', e.message);
        await snap(page, 'zz-error').catch(() => {});
    } finally {
        fact(`restored-${PHASES.join('+')}`, RESTORED);
        fact(`crashes-${PHASES.join('+')}`, CRASH);
        fact(`dialogs-${PHASES.join('+')}`, DIALOGS);
        await close();
    }
});
