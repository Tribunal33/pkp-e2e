// U59 claim check K3 — a row's "Settings wizard" page and its "Journal" tab, the wizard's addresses,
// the site's home page list (when it shows, its order, its entries), Settings bullets 4–8, the
// Cross-feature lines naming the wizard or the site's list, register entry A4.
// Spec: docs/specs/U59-hosted-journals.md — Rules 16–20 (212–270), Settings 313–333, Cross-feature
// 334–369, Canonical preamble 370–376, Coverage, register A4 (471–478); footnotes h, l, m, n, s,
// td7, td11–td13, f-a4.
//
// Run (phases in order; state in .reports/U59/ccK3/k3-state-<app>.json, facts in k3-facts-<app>.json):
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U59/K3/k3.js
//   PHASES=one,seed,list,levels,thumb,sitename,about,ann,order,redirect,wizard,addr,bulk,a4,final
//   (default: all; RESEED=1 for a fresh seed). The `one` phase reads the one-journal end and only
//   means something on a freshly reset fleet (publicknowledge the only journal enabled publicly).
//
// Every journal this script creates is named and pathed with its tag (prefix u59k3); no seeded journal
// is edited. Site-wide changes (Site Name, "About the Site", "Journal redirect", the "Bulk Emails"
// list, the site's order) are made on this script's journals and put back in `finally` blocks.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['one', 'seed', 'list', 'levels', 'thumb', 'sitename', 'about', 'ann', 'order', 'redirect', 'wizard', 'addr', 'bulk', 'a4', 'final'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log('[k3]', new Date().toISOString().slice(11, 19), ...a);
const T = 30_000;
const sql = (app, q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `sql error: ${String(e.stderr || e.message).slice(0, 160)}`; } };

// a small solid PNG (thumbnail upload)
const zlib = require('zlib');
const png = (w, h, [r, g, b]) => {
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
    const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const THUMB = {name: 'k3-thumb.png', mimeType: 'image/png', buffer: png(120, 120, [120, 30, 160])};

// what the site's home page shows: blocks of .page_index_site in order, the list's heading and entries
const READ_SITE = () => {
    const f = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
    const root = document.querySelector('.page_index_site');
    const out = {url: location.href, title: document.title, h1: f(document.querySelector('h1')), siteName: f(document.querySelector('.pkp_site_name'))};
    if (!root) return {...out, root: false};
    out.blocks = [...root.children].map((e) => ({tag: e.tagName, cls: e.className, text: (f(e) || '').slice(0, 160), y: Math.round(e.getBoundingClientRect().top + scrollY)}));
    const list = root.querySelector(':scope > .journals, :scope > .presses, :scope > .servers');
    out.listClass = list ? list.className : null;
    out.heading = list ? f(list.querySelector('h2')) : null;
    out.listText = list ? (f(list) || '').slice(0, 200) : null;
    out.entries = list ? [...list.querySelectorAll(':scope > ul > li')].map((li) => ({
        cls: li.className,
        parts: [...li.querySelectorAll('.thumb, h3, .description, ul.links > li')].map((e) => {
            const a = e.querySelector('a'); const img = e.querySelector('img');
            return {
                kind: e.matches('.thumb') ? 'thumb' : e.tagName === 'H3' ? 'name' : e.matches('.description') ? 'description' : `link:${e.className}`,
                text: (f(e) || '').slice(0, 160), href: a ? a.getAttribute('href') : null,
                img: img ? {src: img.getAttribute('src'), alt: img.getAttribute('alt'), w: img.naturalWidth} : null,
                y: Math.round(e.getBoundingClientRect().top + scrollY),
            };
        }),
    })) : [];
    out.names = out.entries.map((e) => (e.parts.find((p) => p.kind === 'name') || {}).text);
    return out;
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp';
    const Noun = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';
    const stateFile = path.join(outDir(), `k3-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(stateFile)) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(app.name, k, JSON.stringify(v).slice(0, 700)); };
    const cu = (p, rest = '') => app.url(`/index.php/${p}${rest}`);
    const siteHomeUrl = app.url('/index.php/index');
    const RESTORED = [];
    const CRASH = [];

    const {page, close} = await launch(app);
    const DIALOGS = [];
    page.on('dialog', (d) => { DIALOGS.push({type: d.type(), message: d.message().slice(0, 200), url: page.url()}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    page.on('response', (r) => { if (r.status() >= 500) CRASH.push(`server ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)} @ ${page.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => CRASH.push(`script ${String(e.message || e).slice(0, 200)} @ ${page.url()}`));
    const snap = async (p, name, extra = {}) => { const s = await screen(p).catch((e) => ({error: String(e.message || e)})); record(name, {...extra, screen: s}); await shot(p, name).catch(() => {}); return s; };
    const go = async (p, url) => { const r = await p.goto(url).catch((e) => ({error: String(e.message)})); await idle(p).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const as = async (u) => { await signIn(page, u); await idle(page).catch(() => {}); };

    // a site home read in a browser of its own (signed out, or as `user`)
    const siteRead = async (name, {user = null, url = siteHomeUrl} = {}) => {
        const V = await launch(app);
        try {
            if (user) await signIn(V.page, user);
            const status = await go(V.page, url);
            await snap(V.page, name);
            const r = await V.page.evaluate(READ_SITE);
            return {status, ...r};
        } finally { await V.close(); }
    };
    const follow = async (href) => {
        const V = await launch(app);
        try {
            const status = await go(V.page, href.startsWith('http') ? href : app.url(href));
            return {status, url: V.page.url().replace(app.baseURL, ''), title: await V.page.title(), h1: flat(await V.page.locator('h1, h2').first().innerText().catch(() => ''), 120)};
        } finally { await V.close(); }
    };
    const hosted = async () => { await go(page, app.url('/index.php/index/en/admin/contexts')); await page.locator('tr.gridRow').first().waitFor({timeout: T}); await sleep(300); };
    const readRows = () => page.evaluate(() => [...document.querySelectorAll('tr.gridRow')].map((r) => {
        const tds = r.querySelectorAll('td');
        return {id: r.id.replace(/.*-row-/, ''), name: (tds[0] ? tds[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings /, '').trim(), path: (tds[1] ? tds[1].innerText : '').trim()};
    }));
    const tabsState = () => page.evaluate(() => {
        const vis = (e) => e && e.offsetParent !== null;
        return {hash: location.hash, url: location.href, tabs: [...document.querySelectorAll('[role="tab"]')].filter(vis).map((t) => ({id: t.id, text: t.innerText.replace(/\s+/g, ' ').trim(), selected: t.getAttribute('aria-selected')}))};
    });
    const wizardUrl = (id) => app.url(`/index.php/index/en/admin/wizard/${id}`);
    const siteSettings = () => app.url('/index.php/index/en/admin/settings');
    const openSiteTab = async (sub, top = 'setup') => {
        await go(page, siteSettings());
        await page.locator(`#${top}-button`).first().click().catch(() => {});
        await page.locator(`#${sub}-button`).first().click();
        const panel = page.locator(`[role="tabpanel"]#${sub}`).first();
        await panel.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        return panel;
    };
    // one Vue form save: the request(s) it sent, the statuses it showed, the page notices
    const saveForm = async (form, label) => {
        const calls = [];
        const onR = (r) => { if (r.request().method() !== 'GET' && /\/api\/v1\/|\$\$\$call\$\$\$/.test(r.url())) calls.push({status: r.status(), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, url: r.url().replace(app.baseURL, '')}); };
        page.on('response', onR);
        await form.getByRole('button', {name: 'Save', exact: true}).last().click();
        const status = [];
        for (let i = 0; i < 30; i++) {
            const st = (await form.locator('[role="status"]').evaluateAll((es) => es.map((e) => e.innerText.trim()).filter(Boolean)).catch(() => [])).join(' / ');
            if (st && status[status.length - 1] !== st) status.push(st);
            await sleep(100);
        }
        await idle(page).catch(() => {});
        page.off('response', onR);
        const notices = await page.locator('.pkpFormErrors, .pkpFieldError, .pkpNotification, [role="alert"], .app__notifications').evaluateAll((es) => es.filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        const out = {label, status, notices, calls, url: page.url().replace(app.baseURL, '')};
        log(app.name, 'save', label, JSON.stringify(out).slice(0, 400));
        return out;
    };

    try {
        // ------------------------------------------------------------ one: the one-journal end (Rule 19, Settings 4)
        if (on('one')) {
            const enabled = sql(app, 'select count(*) from ' + (isOJS ? 'journals' : isOMP ? 'presses' : 'servers') + ' where enabled = 1');
            const O = {enabledCount: enabled};
            if (enabled === '1') {
                O.visitor = await siteRead('o-01-visitor-site-address');
                O.visitorBare = await siteRead('o-02-visitor-base-url', {url: app.url('/')});
                O.admin = await siteRead('o-03-admin-site-address', {user: 'admin'});
                O.reader = await siteRead('o-04-reader-site-address', {user: 'reader.rosa'});
                O.visitorIndexIndex = await siteRead('o-05-visitor-index-index', {url: app.url('/index.php/index/index')});
                await as('admin');
                await hosted();
                O.rows = await readRows();
                O.orderLink = await page.locator('a[id*="orderItems"]').first().evaluate((e) => ({text: e.innerText.trim(), visible: e.offsetParent !== null})).catch(() => null);
                await snap(page, 'o-06-hosted-one-journal');
                await go(page, siteSettings());
                O.siteSettingsTabs = (await tabsState()).tabs;
            } else {
                O.skipped = 'more than one journal enabled publicly; the one-journal end needs a freshly reset fleet';
            }
            fact('one', O);
        }

        // ------------------------------------------------------------ seed
        if (on('seed') && !S.t) {
            const t = tag('u59k3');
            S.t = t;
            const base = (k, extra = {}) => ({name: `${t} ${k}`, acronym: `K3${k}`.slice(0, 8), country: 'CA', contactName: `K3 Contact ${k}`, contactEmail: `${t}${k.toLowerCase()}c@mail.test`, ...extra});
            const mk = async (key, label, {context = {}, users = [], extra = {}} = {}) => {
                const p = `${t}${key.toLowerCase()}`;
                const spec = {tag: p, context: {...base(label), ...context}, users, ...extra};
                const r = await app.api.createContext(spec);
                S[key] = {key, path: p, id: r.contextId || r.id, name: spec.context.name, users: users.map((u) => u.username)};
                save();
                return S[key];
            };
            // A and B: named so that name order (Alpha before Zulu) differs from creation order (Zulu first)
            // H first: one journal enabled publicly plus one that is not (the count is of enabled ones)
            await mk('H', 'Hidden', {context: {enabled: false}});
            const enabled = sql(app, 'select count(*) from ' + (isOJS ? 'journals' : isOMP ? 'presses' : 'servers') + ' where enabled = 1');
            if (enabled === '1') {
                const r = await siteRead('o-07-visitor-one-enabled-one-disabled');
                fact('oneplusdisabled', {status: r.status, url: r.url.replace(app.baseURL, ''), title: r.title, listed: r.root !== false});
            }
            await mk('A', 'Zulu', {context: {description: '<p>K3 summary of Zulu.</p>'}, users: [{username: `${t}amgr`, roles: ['manager']}], extra: isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {}});
            await mk('B', 'Alpha');
            await mk('W', 'Wizard', {users: [{username: `${t}wmgr`, roles: ['manager']}, {username: `${t}wau`, roles: ['author']}]});
            await mk('P', 'Pathwiz', {extra: {bulkEmails: true}});
            fact('seed', S);
        }
        if (!S.t) { log('no state; run the seed phase'); return; }
        const t = S.t;

        // ------------------------------------------------------------ list: the entries (Rule 20, td13; Rule 19 two or more; Settings 2, 4)
        if (on('list')) {
            const L = {};
            L.visitor = await siteRead('l-01-visitor-site-home');
            L.visitorBare = await siteRead('l-02-visitor-base-url', {url: app.url('/')});
            L.db = sql(app, `select path, seq, enabled from ${isOJS ? 'journals' : isOMP ? 'presses' : 'servers'} order by seq, ${isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id'}`).split('\n');
            const entry = (name) => (L.visitor.entries || []).find((e) => (e.parts.find((p) => p.kind === 'name') || {}).text === name);
            L.A = entry(S.A.name); L.B = entry(S.B.name); L.Hlisted = !!entry(S.H.name);
            // every link of A's and B's entries, followed
            L.follow = {};
            for (const k of ['A', 'B']) {
                const e = entry(S[k].name);
                if (!e) continue;
                for (const p of e.parts.filter((x) => x.href)) L.follow[`${k}:${p.kind}`] = {href: p.href.replace(app.baseURL, ''), ...(await follow(p.href))};
            }
            fact('list', L);
        }

        // ------------------------------------------------------------ levels: every visitor sees the list (Actors row 5, Rule 20)
        if (on('levels')) {
            const V = {};
            for (const u of ['reader.rosa', 'manager.maya', `${t}amgr`, 'admin']) {
                const r = await siteRead(`v-${u.replace(/\W/g, '')}-site-home`, {user: u});
                V[u] = {status: r.status, url: r.url.replace(app.baseURL, ''), heading: r.heading, names: r.names, sameAsVisitor: null};
            }
            const vis = await siteRead('v-visitor-site-home');
            for (const u of Object.keys(V)) V[u].sameAsVisitor = JSON.stringify(V[u].names) === JSON.stringify(vis.names);
            fact('levels', V);
        }

        // ------------------------------------------------------------ thumb: a journal thumbnail tops the entry (Rule 20, Settings 6)
        if (on('thumb')) {
            const Th = {};
            await as('admin');
            await go(page, cu(S.A.path, '/en/management/settings/website'));
            await page.locator('#appearance-button').first().click();
            await idle(page); await sleep(600);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
            await idle(page); await sleep(800);
            const field = `${app.name === 'ojs' ? 'journal' : app.name === 'omp' ? 'press' : 'server'}Thumbnail`;
            const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 15000}).catch(() => null);
            await page.locator(`[id="appearanceSetup-${field}-hiddenFileId-en"]`).setInputFiles(THUMB);
            const up = await w; await sleep(1500); await idle(page);
            Th.upload = up ? up.status() : null;
            const alt = page.locator(`[id="appearanceSetup-${field}-control-en"]`).locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]').locator('input[type="text"], textarea').first();
            await alt.fill('K3 thumb alt').catch((e) => (Th.altErr = String(e.message).slice(0, 120)));
            Th.save = await saveForm(page.locator('#appearance-setup form').first(), 'appearance setup thumbnail');
            await snap(page, 't-01-thumbnail-saved');
            const r = await siteRead('t-02-site-home-with-thumb');
            Th.entry = (r.entries || []).find((e) => (e.parts.find((p) => p.kind === 'name') || {}).text === S.A.name);
            Th.noThumbB = (r.entries || []).find((e) => (e.parts.find((p) => p.kind === 'name') || {}).text === S.B.name);
            const th = Th.entry && Th.entry.parts.find((p) => p.kind === 'thumb');
            if (th && th.href) Th.follow = await follow(th.href);
            fact('thumb', Th);
        }

        // ------------------------------------------------------------ sitename: the page's title and heading (267–269)
        if (on('sitename')) {
            const N = {before: sql(app, "select locale, setting_value from site_settings where setting_name = 'title'")};
            N.empty = await siteRead('s-01-site-home-no-site-name');
            await as('admin');
            try {
                const panel = await openSiteTab('settings');
                await panel.locator('#siteConfig-title-control-en').fill(`U59 K3 Site ${app.name.toUpperCase()}`);
                N.set = await saveForm(panel, 'site name set');
                N.named = await siteRead('s-02-site-home-site-name');
            } finally {
                await app.api.setSite({title: ''});
                RESTORED.push({what: 'Site Name', to: '(none)', rows: sql(app, "select count(*) from site_settings where setting_name = 'title'")});
            }
            fact('sitename', {empty: {title: N.empty.title, h1: N.empty.h1, siteName: N.empty.siteName}, set: N.set, named: N.named && {title: N.named.title, h1: N.named.h1, siteName: N.named.siteName}, before: N.before});
        }

        // ------------------------------------------------------------ about: what stands above the list (Rule 20, td13)
        if (on('about')) {
            const Ab = {};
            Ab.default = await siteRead('a-01-site-home-default-blocks');
            await as('admin');
            let set = false;
            try {
                const panel = await openSiteTab('info');
                const fid = 'siteInfo-about-control-en';
                await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, fid, {timeout: T});
                await page.locator(`[id="${fid}_ifr"]`).contentFrame().locator('body').click();
                await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
                await page.keyboard.type('K3 about the site text.');
                Ab.set = await saveForm(panel, 'about set'); set = true;
                Ab.withAbout = await siteRead('a-02-site-home-with-about');
            } finally {
                if (set) {
                    const panel = await openSiteTab('info');
                    const fid = 'siteInfo-about-control-en';
                    await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, fid, {timeout: T});
                    await page.locator(`[id="${fid}_ifr"]`).contentFrame().locator('body').click();
                    await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
                    Ab.clear = await saveForm(panel, 'about cleared');
                    RESTORED.push({what: 'About the Site', to: '(empty)', rows: sql(app, "select locale, left(setting_value, 60) from site_settings where setting_name = 'about'")});
                }
            }
            fact('about', {default: Ab.default && Ab.default.blocks, set: Ab.set, withAbout: Ab.withAbout && Ab.withAbout.blocks, clear: Ab.clear});
        }

        // ------------------------------------------------------------ ann: a site announcement and "About the Site" above the list (Rule 20)
        if (on('ann')) {
            const An = {};
            await as('admin');
            let enabled = false, added = false;
            const annTitle = `${t} site announcement`;
            try {
                await go(page, siteSettings());
                await page.locator('#announcements-button').first().click();
                await page.locator('#announcement-settings-button').first().click(); await idle(page); await sleep(600);
                const sp = page.locator('[role="tabpanel"]#announcement-settings').first();
                An.settingsFields = await sp.evaluate((x) => [...x.querySelectorAll('label, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
                await sp.locator('input[name="enableAnnouncements"]').first().check();
                await sleep(400);
                const num = sp.locator('input[name="numAnnouncementsHomepage"]').first();
                if (await num.count()) { if (await num.getAttribute('type') === 'checkbox') await num.check(); else await num.fill('1'); }
                await sleep(300);
                const num2 = sp.locator('input[name="numAnnouncementsHomepage"]:not([type="checkbox"])').first();
                if (await num2.count() && await num2.isVisible()) await num2.fill('1');
                An.enable = await saveForm(sp, 'site announcements on'); enabled = true;
                await go(page, siteSettings());
                await page.locator('#announcements-button').first().click();
                await page.locator('#announcement-items-button').first().click(); await idle(page); await sleep(800);
                const ip = page.locator('[role="tabpanel"]#announcement-items').first();
                await ip.getByRole('button', {name: 'Add Announcement', exact: true}).click();
                const d = page.locator('[role="dialog"]:visible').last();
                await d.locator('.pkpFormPage__footer').waitFor({timeout: T}); await idle(page); await sleep(500);
                await d.locator('input.pkpFormField__input, input[type=text]').first().fill(annTitle);
                await d.getByRole('button', {name: 'Save', exact: true}).click();
                await page.locator('[role="dialog"]:visible').waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page); await sleep(600); added = true;
                An.withAnn = await siteRead('n-01-site-home-with-announcement');
            } catch (e) { An.err = String(e.message).slice(0, 300); await snap(page, 'n-00-ann-error'); } finally {
                if (added) {
                    try {
                        await go(page, siteSettings());
                        await page.locator('#announcements-button').first().click();
                        await page.locator('#announcement-items-button').first().click(); await idle(page); await sleep(800);
                        const item = page.locator('[role="tabpanel"]#announcement-items .listPanel__item').filter({hasText: annTitle}).first();
                        await item.getByRole('button', {name: /^Delete$/}).click();
                        await sleep(500);
                        await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Yes|Delete|OK)$/}).first().click();
                        await sleep(1200); await idle(page);
                        An.deleted = !(await page.locator('[role="tabpanel"]#announcement-items .listPanel__item').filter({hasText: annTitle}).count());
                    } catch (e) { An.delErr = String(e.message).slice(0, 200); }
                }
                if (enabled) {
                    await go(page, siteSettings());
                    await page.locator('#announcements-button').first().click();
                    await page.locator('#announcement-settings-button').first().click(); await idle(page); await sleep(600);
                    const sp = page.locator('[role="tabpanel"]#announcement-settings').first();
                    await sp.locator('input[name="enableAnnouncements"]').first().uncheck();
                    An.disable = await saveForm(sp, 'site announcements off');
                }
                RESTORED.push({what: 'site announcements', to: 'off, the added one deleted', rows: sql(app, "select setting_name, left(setting_value, 20) from site_settings where setting_name in ('enableAnnouncements', 'numAnnouncementsHomepage')"), left: sql(app, "select count(*) from announcements")});
            }
            fact('ann', {settingsFields: An.settingsFields, enable: An.enable, blocks: An.withAnn && An.withAnn.blocks, err: An.err, deleted: An.deleted, delErr: An.delErr, disable: An.disable});
        }

        // ------------------------------------------------------------ order: the site's order drives the list (Rules 13, 20; note s)
        if (on('order')) {
            const O = {};
            O.before = (await siteRead('r-01-site-home-order-before')).names;
            await as('admin');
            await hosted();
            O.rowsBefore = (await readRows()).map((r) => r.name);
            const drag = async (fromName, toName) => {
                await page.locator('a[id*="orderItems"]').first().click();
                await sleep(800);
                const from = page.locator('tr.gridRow').filter({hasText: fromName}).first();
                const to = page.locator('tr.gridRow').filter({hasText: toName}).first();
                const fb = await from.boundingBox(); const tb = await to.boundingBox();
                await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
                await page.mouse.down();
                await page.mouse.move(tb.x + tb.width / 2, tb.y + 2, {steps: 20});
                await page.mouse.move(tb.x + tb.width / 2, tb.y + 1, {steps: 5});
                await page.mouse.up();
                await sleep(500);
                const reqs = [];
                const onReq = (rq) => { if (rq.method() === 'POST' && /saveSequence|save-sequence/i.test(rq.url())) reqs.push({url: rq.url().replace(app.baseURL, ''), body: flat(rq.postData(), 3000)}); };
                page.on('request', onReq);
                const resp = page.waitForResponse((r) => /save-sequence|saveSequence/i.test(r.url()), {timeout: 15000}).catch(() => null);
                await page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first().click();
                const r = await resp; await sleep(800); await idle(page);
                page.off('request', onReq);
                return {status: r ? r.status() : null, reqs};
            };
            O.moveB = await drag(S.B.name, S.A.name);
            O.rowsAfterMove = (await readRows()).map((r) => r.name);
            await snap(page, 'r-02-hosted-after-order-done');
            await hosted();
            O.rowsAfterReload = (await readRows()).map((r) => r.name);
            O.after = (await siteRead('r-03-site-home-order-after')).names;
            // put the two back as they were
            O.restore = await drag(S.A.name, S.B.name);
            await hosted();
            O.rowsRestored = (await readRows()).map((r) => r.name);
            O.restored = (await siteRead('r-04-site-home-order-restored')).names;
            RESTORED.push({what: 'site order', to: 'A above B again', rows: O.rowsRestored});
            fact('order', O);
        }

        // ------------------------------------------------------------ redirect: "Journal redirect" chosen (Rule 19, Settings 5)
        if (on('redirect')) {
            const R = {};
            await as('admin');
            try {
                const panel = await openSiteTab('settings');
                R.options = await panel.locator('#siteConfig-redirectContextId-control option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})).slice(0, 12));
                R.label = flat(await panel.locator('label[for="siteConfig-redirectContextId-control"]').innerText().catch(() => ''), 80);
                await panel.locator('#siteConfig-title-control-en').fill(`U59 K3 Site ${app.name.toUpperCase()}`);
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({value: String(S.B.id)});
                R.set = await saveForm(panel, 'redirect set');
                R.site = sql(app, 'select redirect_context_id from site');
                R.visitor = await siteRead('d-01-visitor-site-address-redirect');
                R.visitorIndexIndex = await siteRead('d-02-visitor-index-index-redirect', {url: app.url('/index.php/index/index')});
                R.visitorIndexEn = await siteRead('d-03-visitor-index-en-redirect', {url: app.url('/index.php/index/en')});
                R.admin = await siteRead('d-04-admin-site-address-redirect', {user: 'admin'});
            } finally {
                const panel = await openSiteTab('settings');
                await panel.locator('#siteConfig-title-control-en').fill(`U59 K3 Site ${app.name.toUpperCase()}`);
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({index: 0});
                R.blank = await saveForm(panel, 'redirect blank');
                await app.api.setSite({title: ''});
                RESTORED.push({what: 'Journal redirect and Site Name', to: '(blank, none)', site: sql(app, 'select redirect_context_id from site'), title: sql(app, "select count(*) from site_settings where setting_name = 'title'")});
            }
            R.after = (await siteRead('d-05-visitor-site-address-after-blank')).url;
            const brief = (x) => x && {status: x.status, url: x.url.replace(app.baseURL, ''), title: x.title, root: x.root !== false, names: x.names};
            fact('redirect', {options: R.options, label: R.label, set: R.set, site: R.site, visitor: brief(R.visitor), visitorIndexIndex: brief(R.visitorIndexIndex), visitorIndexEn: brief(R.visitorIndexEn), admin: brief(R.admin), blank: R.blank, after: R.after});
        }

        // ------------------------------------------------------------ wizard: the page, its tabs, the "Journal" tab (Rules 16–17, td11)
        if (on('wizard')) {
            const W = S.W; const Wz = {};
            await as('admin');
            await hosted();
            // open it from the row, as a Site Administrator does
            const r = page.locator('tr.gridRow').filter({hasText: W.name}).first();
            await r.locator('a.show_extras').click(); await sleep(400);
            const link = r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Settings wizard', exact: true});
            Wz.rowLinks = await r.locator('xpath=following-sibling::tr[1]').locator('a').evaluateAll((as) => as.map((a) => a.innerText.trim()).filter(Boolean));
            await loc(page, 'row "Settings wizard" link', link);
            await Promise.all([page.waitForURL(/admin\/wizard\//, {timeout: T}), link.click()]);
            await idle(page); await sleep(800);
            Wz.landed = page.url().replace(app.baseURL, '');
            await snap(page, 'w-01-wizard-landed');
            Wz.title = await page.title();
            Wz.h1 = flat(await page.locator('h1').first().innerText(), 120);
            Wz.trail = await page.locator('nav[aria-label], .app__breadcrumbs, ol').filter({hasText: 'Administration'}).first().evaluate((n) => [...n.querySelectorAll('a, span, li')].map((e) => ({tag: e.tagName, text: e.innerText.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')})).filter((e) => e.text)).catch(() => null);
            Wz.tabs = await tabsState();
            // the journal's name outside the form fields (innerText excludes input values)
            const allText = async () => page.evaluate(() => document.body.innerText);
            Wz.nameInTitle = Wz.title.includes(W.name);
            // side tabs of the first top tab and their panels
            const sides = ['context', 'appearance', 'languages', 'indexing', 'restrictBulkEmails'];
            Wz.panels = {};
            for (const s of sides) {
                await page.locator(`#${s}-button`).first().click().catch(() => {});
                await idle(page); await sleep(700);
                const panel = page.locator(`[role="tabpanel"]#${s}`).first();
                Wz.panels[s] = {url: page.url().replace(app.baseURL, ''), text: flat(await panel.innerText().catch(() => ''), 900), buttons: await panel.getByRole('button').allInnerTexts().catch(() => []), links: await panel.locator('a:visible').evaluateAll((as) => as.map((a) => ({t: a.innerText.trim(), h: a.getAttribute('href')})).slice(0, 12)).catch(() => [])};
                await snap(page, `w-02-side-${s}`);
            }
            for (const top of ['plugins', 'users']) {
                await page.locator(`#${top}-button`).first().click().catch(() => {});
                await idle(page); await sleep(1200);
                Wz.panels[top] = {url: page.url().replace(app.baseURL, ''), tabs: (await tabsState()).tabs, text: flat(await page.locator(`[role="tabpanel"]#${top}`).first().innerText().catch(() => ''), 1200)};
                await snap(page, `w-03-top-${top}`);
            }
            // plugins' own tabs
            for (const s of ['installed', 'gallery']) {
                const b = page.locator(`#${s}-button`).first();
                Wz.panels[`plugins:${s}`] = {present: (await b.count()) > 0};
                if (await b.count()) { await b.click().catch(() => {}); await idle(page); await sleep(1500); Wz.panels[`plugins:${s}`].url = page.url().replace(app.baseURL, ''); Wz.panels[`plugins:${s}`].text = flat(await page.locator(`[role="tabpanel"]#${s}`).first().innerText().catch(() => ''), 600); await snap(page, `w-04-plugins-${s}`); }
            }
            const txt = await allText();
            Wz.nameInText = txt.includes(W.name);
            Wz.nameAt = Wz.nameInText ? flat(txt.slice(Math.max(0, txt.indexOf(W.name) - 80), txt.indexOf(W.name) + 80), 200) : null;
            Wz.users = {hasW: /wmgr|wau/i.test(Wz.panels.users.text), hasMaya: /maya/i.test(Wz.panels.users.text)};
            // the "Journal" tab: its fields and a save of "Journal initials"
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.locator('#context-button').first().click(); await idle(page); await sleep(700);
            const jForm = page.locator('[role="tabpanel"]#context form').first();
            Wz.fields = await jForm.evaluate((f) => [...f.querySelectorAll('.pkpFormField, fieldset')].filter((e) => e.offsetParent !== null).map((e) => ((e.querySelector('label, legend') || {}).innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
            Wz.formButtons = await jForm.getByRole('button').allInnerTexts();
            await loc(page, 'wizard Journal tab form', jForm);
            const ini = jForm.locator('[id^="context-acronym-control"]').first();
            Wz.initialsBefore = await ini.inputValue();
            await ini.fill('K3WIZ');
            const urlBefore = page.url();
            Wz.initialsSave = await saveForm(jForm, 'wizard journal initials');
            Wz.stayed = page.url() === urlBefore;
            Wz.initialsSamePage = await ini.inputValue();
            await snap(page, 'w-05-journal-tab-saved');
            await go(page, wizardUrl(W.id));
            await page.locator('#context-button').first().click(); await idle(page); await sleep(600);
            Wz.initialsAfterReload = await page.locator('[role="tabpanel"]#context form [id^="context-acronym-control"]').first().inputValue();
            Wz.db = sql(app, `select setting_value from ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_settings where ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_id = ${W.id} and setting_name = 'acronym'`);
            // "Every tab acts on that journal alone": Search Indexing saved here shows on W's own Settings, not on publicknowledge's
            await page.locator('#indexing-button').first().click(); await idle(page); await sleep(700);
            const iForm = page.locator('[role="tabpanel"]#indexing form').first();
            Wz.indexingFields = await iForm.evaluate((f) => [...f.querySelectorAll('label, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
            const desc = iForm.locator('textarea, input[type="text"]').first();
            await desc.fill(`${t} indexing description`);
            Wz.indexingSave = await saveForm(iForm, 'wizard search indexing');
            await go(page, cu(W.path, '/en/management/settings/distribution'));
            await page.locator('#indexing-button').first().click().catch(() => {}); await idle(page); await sleep(700);
            Wz.onOwnSettings = await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().inputValue().catch(() => null);
            await snap(page, 'w-06-own-settings-indexing');
            await go(page, cu(app.contextPath, '/en/management/settings/distribution'));
            await page.locator('#indexing-button').first().click().catch(() => {}); await idle(page); await sleep(700);
            Wz.onPublicknowledge = await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().inputValue().catch(() => null);
            // leaving with a change unsaved on a side tab, then coming back
            await go(page, wizardUrl(W.id));
            await page.locator('#indexing-button').first().click(); await idle(page); await sleep(700);
            await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().fill(`${t} unsaved`);
            const dlgs = DIALOGS.length;
            await page.locator('#users-button').first().click(); await idle(page); await sleep(700);
            await page.locator('#setup-button').first().click(); await sleep(300);
            await page.locator('#indexing-button').first().click(); await idle(page); await sleep(500);
            Wz.unsavedBack = await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().inputValue().catch(() => null);
            await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().fill(`${t} unsaved 2`);
            await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().blur().catch(() => {});
            await go(page, app.url('/index.php/index/en/admin/contexts'));
            Wz.leaveDialogs = DIALOGS.slice(dlgs);
            Wz.leftTo = page.url().replace(app.baseURL, '');
            await go(page, wizardUrl(W.id));
            await page.locator('#indexing-button').first().click(); await idle(page); await sleep(500);
            Wz.unsavedAfterLeave = await page.locator('[role="tabpanel"]#indexing form textarea, [role="tabpanel"]#indexing form input[type="text"]').first().inputValue().catch(() => null);
            // the trail's links
            await go(page, wizardUrl(W.id));
            const trailLinks = await page.locator('nav a, ol a').filter({hasText: /Administration|Hosted (Journals|Presses|Servers)/}).evaluateAll((as) => as.filter((a) => /^(Administration|Hosted (Journals|Presses|Servers))$/.test(a.innerText.trim())).map((a) => ({t: a.innerText.trim(), h: a.getAttribute('href')})));
            Wz.trailLinks = trailLinks;
            for (const tl of trailLinks) { if (tl.h) { const s = await follow(tl.h); tl.lands = s.url; tl.status = s.status; } }
            fact('wizard', Wz);
        }

        // ------------------------------------------------------------ addr: the wizard's addresses and a reload on each tab (Rule 18, td12)
        if (on('addr')) {
            const W = S.W; const Ad = {tabs: {}};
            await as('admin');
            const order = [['setup', null], ['context', 'setup'], ['appearance', 'setup'], ['languages', 'setup'], ['indexing', 'setup'], ['restrictBulkEmails', 'setup'], ['plugins', null], ['installed', 'plugins'], ['gallery', 'plugins'], ['users', null]];
            for (const [tab, parent] of order) {
                await go(page, wizardUrl(W.id));
                if (parent) { await page.locator(`#${parent}-button`).first().click().catch(() => {}); await sleep(400); }
                const b = page.locator(`#${tab}-button`).first();
                if (!(await b.count())) { Ad.tabs[tab] = {present: false}; continue; }
                await b.click(); await idle(page); await sleep(600);
                const after = await tabsState();
                await page.reload(); await idle(page); await sleep(1200);
                const reloaded = await tabsState();
                Ad.tabs[tab] = {urlAfterClick: after.url.replace(app.baseURL, ''), selectedAfterClick: after.tabs.filter((x) => x.selected === 'true').map((x) => x.id), urlAfterReload: reloaded.url.replace(app.baseURL, ''), selectedAfterReload: reloaded.tabs.filter((x) => x.selected === 'true').map((x) => x.id)};
                await snap(page, `x-reload-${tab}`);
            }
            // typed addresses: the tab's own address opened fresh; no locale; numbers no journal has
            Ad.typed = {};
            for (const [k, u] of [['indexingHash', `/index.php/index/en/admin/wizard/${W.id}#setup/indexing`], ['usersHash', `/index.php/index/en/admin/wizard/${W.id}#users`], ['noLocale', `/index.php/index/admin/wizard/${W.id}`], ['n999999', '/index.php/index/en/admin/wizard/999999'], ['abc', '/index.php/index/en/admin/wizard/abc'], ['none', '/index.php/index/en/admin/wizard'], ['journalAddress', `/index.php/${W.path}/en/admin/wizard/${W.id}`]]) {
                await go(page, 'about:blank');
                const status = await go(page, app.url(u));
                const ts = await tabsState();
                Ad.typed[k] = {status, url: page.url().replace(app.baseURL, ''), title: await page.title(), h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 120), body: flat(await page.locator('main, body').first().innerText().catch(() => ''), 200), selected: ts.tabs.filter((x) => x.selected === 'true').map((x) => x.id)};
                await snap(page, `x-typed-${k}`);
            }
            fact('addr', Ad);
        }

        // ------------------------------------------------------------ bulk: "Restrict Bulk Emails" both ends through Site Settings (Settings 7)
        if (on('bulk')) {
            const W = S.W; const B = {};
            await as('admin');
            await go(page, wizardUrl(W.id));
            await page.locator('#restrictBulkEmails-button').first().click(); await idle(page); await sleep(600);
            const panel = page.locator('[role="tabpanel"]#restrictBulkEmails').first();
            B.off = {text: flat(await panel.innerText(), 400), links: await panel.locator('a').evaluateAll((as) => as.map((a) => ({t: a.innerText.trim(), h: a.getAttribute('href')})))};
            await snap(page, 'b-01-restrict-off');
            if (B.off.links[0] && B.off.links[0].h) {
                await go(page, B.off.links[0].h.startsWith('http') ? B.off.links[0].h : app.url(B.off.links[0].h));
                B.off.lands = {url: page.url().replace(app.baseURL, ''), tabs: (await tabsState()).tabs.filter((x) => x.selected === 'true').map((x) => x.id)};
                await snap(page, 'b-02-restrict-link-lands');
            }
            let ticked = false;
            try {
                const sp = await openSiteTab('bulkEmails');
                B.siteBoxes = await sp.locator('input[name="enableBulkEmails"]').evaluateAll((es) => es.map((e) => ({v: e.value, c: e.checked, l: (e.closest('label') || e.parentElement).innerText.trim().slice(0, 80)})));
                await sp.locator(`input[name="enableBulkEmails"][value="${W.id}"]`).check();
                B.tick = await saveForm(sp, 'bulk emails tick W'); ticked = true;
                await go(page, wizardUrl(W.id));
                await page.locator('#restrictBulkEmails-button').first().click(); await idle(page); await sleep(600);
                B.on = {text: flat(await panel.innerText(), 600), buttons: await panel.getByRole('button').allInnerTexts()};
                await snap(page, 'b-03-restrict-on');
            } finally {
                if (ticked) {
                    const sp = await openSiteTab('bulkEmails');
                    await sp.locator(`input[name="enableBulkEmails"][value="${W.id}"]`).uncheck();
                    B.untick = await saveForm(sp, 'bulk emails untick W');
                }
                RESTORED.push({what: 'Bulk Emails list', to: 'W unticked (P stays ticked, seeded so)', row: sql(app, "select setting_value from site_settings where setting_name = 'enableBulkEmails'")});
            }
            fact('bulk', B);
        }

        // ------------------------------------------------------------ a4: saves after a path change on the wizard (A4, td7, note h)
        if (on('a4')) {
            const P = S.P; const A4 = {};
            await as('admin');
            await go(page, wizardUrl(P.id));
            // one listener for the whole drive: every non-GET request and every grid fetch
            const traffic = [];
            const onR = (r) => { const u = r.url(); if (r.request().method() !== 'GET' || /\$\$\$call\$\$\$/.test(u)) traffic.push({at: new Date().toISOString().slice(11, 23), status: r.status(), method: r.request().method(), url: u.replace(app.baseURL, '').slice(0, 200)}); };
            page.on('response', onR);
            const mark = () => traffic.length;
            const since = (m) => traffic.slice(m);
            const openSide = async (id) => { await page.locator('#setup-button').first().click().catch(() => {}); await page.locator(`#${id}-button`).first().click(); await idle(page); await sleep(700); return page.locator(`[role="tabpanel"]#${id} form`).first(); };
            let f = await openSide('context');
            const newPath = `${P.path}n`;
            await f.locator('[id^="context-urlPath-control"]').first().fill(newPath);
            A4.pathSave = await saveForm(f, 'a4 path');
            await snap(page, 'p-01-path-saved');
            S.P.newPath = newPath; save();
            const tries = async (suffix) => {
                const o = {};
                f = await openSide('context');
                await f.locator('[id^="context-acronym-control"]').first().fill(`K3P${suffix}`);
                o.journal = await saveForm(f, `a4 journal ${suffix}`);
                await snap(page, `p-02-journal-save-${suffix}`);
                f = await openSide('appearance');
                o.appearanceFields = await f.evaluate((x) => [...x.querySelectorAll('label, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10)).catch(() => null);
                o.appearance = await saveForm(f, `a4 appearance ${suffix}`);
                await snap(page, `p-03-appearance-save-${suffix}`);
                f = await openSide('indexing');
                await f.locator('textarea, input[type="text"]').first().fill(`${t} P indexing ${suffix}`);
                o.indexing = await saveForm(f, `a4 indexing ${suffix}`);
                f = await openSide('restrictBulkEmails');
                o.bulkFields = await f.evaluate((x) => [...x.querySelectorAll('label, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12)).catch(() => null);
                const box = f.locator('input[type="checkbox"]').first();
                if (await box.count()) await box.setChecked(!(await box.isChecked()));
                o.bulk = await saveForm(f, `a4 restrict bulk ${suffix}`);
                await snap(page, `p-04-bulk-save-${suffix}`);
                // the legacy grids loaded with the page: Languages (a UI box), Users (the search), Installed Plugins (the list)
                await page.locator('#languages-button').first().click(); await idle(page); await sleep(900);
                let m = mark();
                const langBox = page.locator('#languageGridContainer input[type="checkbox"]').first();
                o.langBoxes = await page.locator('#languageGridContainer input[type="checkbox"]').count();
                if (o.langBoxes) {
                    await langBox.click().catch((e) => (o.langErr = String(e.message).slice(0, 120)));
                    await sleep(1500); await idle(page);
                    o.lang = {traffic: since(m), notices: await page.locator('.pkpNotification, [role="alert"], .app__notifications').evaluateAll((es) => es.filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => [])};
                    // put the box back
                    m = mark();
                    await page.locator('#languageGridContainer input[type="checkbox"]').first().click().catch(() => {});
                    await sleep(1500); await idle(page);
                    o.langBack = since(m);
                }
                await snap(page, `p-05-languages-${suffix}`);
                await page.locator('#users-button').first().click(); await idle(page); await sleep(900);
                m = mark();
                const search = page.locator('#userGridContainer').getByRole('button', {name: /^Search$/}).or(page.locator('#userGridContainer').locator('input[type="submit"], button[type="submit"]')).first();
                if (await search.count()) { await search.click().catch((e) => (o.usersErr = String(e.message).slice(0, 120))); await sleep(1500); await idle(page); }
                o.users = {traffic: since(m), rows: await page.locator('#userGridContainer tr.gridRow').count()};
                await snap(page, `p-06-users-search-${suffix}`);
                return o;
            };
            A4.afterPathChange = await tries('a');
            await go(page, wizardUrl(P.id));
            A4.afterReload = await tries('b');
            A4.db = sql(app, `select setting_name, left(setting_value, 60) from ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_settings where ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_id = ${P.id} and setting_name in ('acronym', 'searchDescription') order by 1`);
            page.off('response', onR);
            fact('a4', A4);
        }

        if (on('final')) {
            fact('final', {site: sql(app, 'select redirect_context_id from site'), siteRows: sql(app, "select setting_name, locale, left(setting_value, 80) from site_settings where setting_name in ('title', 'about', 'enableBulkEmails')"), contexts: sql(app, `select path, seq, enabled from ${isOJS ? 'journals' : isOMP ? 'presses' : 'servers'} order by seq`)});
        }
    } catch (e) {
        fact('ERROR', String(e.stack || e).slice(0, 1500));
        await snap(page, 'zz-error').catch(() => {});
    } finally {
        fact(`restored-${PHASES.join('+')}`, RESTORED);
        fact(`crashes-${PHASES.join('+')}`, CRASH);
        fact(`dialogs-${PHASES.join('+')}`, DIALOGS);
        await close();
    }
});
