const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U60 claim check, chunk K2: the Site Settings shell (Rules 1–3, Actors),
// "Site Setup" › "Information" (Rules 4–5, 13–15) and "Bulk Emails" (Rule 16),
// French (Rule 23, register A2); all three apps.
// Spec: docs/specs/U60-site-settings.md — body 10–46, 65–79, 95–141, 214–256,
// 300–306, 349–359, register A2 (506–513); footnotes a, b, c, h, i, l, td1,
// td2, td9, td10, td11, td17, f-a2.
//
// The site is one record every checker shares: this script saves only the
// "Information" and "Bulk Emails" tabs, writes their values down at seed
// (k2-state-<app>.json `orig`) and puts them back on screen in a finally.
// "Bulk Emails" posts the whole list as the page loaded it, so the tab is
// reloaded right before each save.
// Seeds per app (tag prefix u60k2): "K2 A <t>" (en + fr_CA) with a manager
// (mg) and two readers (rs: password reset; the registrant is made on the
// validation variant), "K2 D <t>" not enabled publicly.
// Phases (PHASES=a,b; default all): seed, shell, access, info, content,
// contact, bulk, french, leave, restore
// Run: PROBE_FEATURE=U60 PROBE_AGENT=ccK2 node bin/probe.js <app|all> shared/playwright/checks/U60/K2/k2.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'shell', 'access', 'info', 'content', 'contact', 'bulk', 'french', 'leave', 'restore'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const flat = (s, n = 4000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const sql = (app, q) => execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const INFO_KEYS = ['about', 'contactName', 'contactEmail', 'privacyStatement'];
const siteRows = (app, names) => {
    const out = {};
    for (const line of sql(app, `select setting_name, coalesce(locale,''), setting_value from site_settings where setting_name in (${names.map((n) => `'${n}'`).join(',')}) order by 1, 2`).split('\n').filter(Boolean)) {
        const [k, l, ...v] = line.split('|');
        (out[k] = out[k] || {})[l || '-'] = v.join('|');
    }
    return out;
};
const bulkList = (app) => {
    const r = siteRows(app, ['enableBulkEmails']);
    return r.enableBulkEmails ? JSON.parse(r.enableBulkEmails['-'] || '[]') : null;
};

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
const WRITES = [];
function watch(page) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    page.on('request', (r) => { if (/\/api\/v1\/site/.test(r.url()) && r.method() !== 'GET') WRITES.push({phase: CUR, method: r.method(), override: r.headers()['x-http-method-override'] || '', url: rel(r.url()), body: (r.postData() || '').slice(0, 1500)}); });
    return page;
}
async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}
async function land(page, url) {
    const resp = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
    await idle(page).catch(() => {});
    const h1 = await page.locator('h1').allInnerTexts().catch(() => []);
    return {
        status: resp && resp.status ? resp.status() : (resp && resp.err) || null,
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        h1: h1.map((x) => flat(x, 120)).filter(Boolean),
        text: flat(await page.locator('main, .pkp_structure_main, body').first().innerText().catch(() => ''), 400),
    };
}

// ── Site Settings ───────────────────────────────────────────────────────────
const SETTINGS = '/index.php/index/en/admin/settings';
async function openSite(page, app, sub, {locale = 'en'} = {}) {
    await page.goto(app.url(`/index.php/index/${locale}/admin/settings`));
    await idle(page);
    await page.locator('#setup-button').first().click().catch(() => {});
    await page.locator(`#${sub}-button`).first().click();
    const panel = page.locator(`[role="tabpanel"]#${sub}`).first();
    await panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().waitFor({timeout: T});
    await idle(page); await sleep(300);
    return panel;
}
async function formFacts(panel) {
    return panel.evaluate((p) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e.offsetParent !== null;
        return {
            fields: [...p.querySelectorAll('.pkpFormField')].filter(vis).map((f) => ({
                label: txt(f.querySelector('.pkpFormFieldLabel, legend, label')),
                required: !!f.querySelector('.pkpFormFieldLabel__required, [aria-required="true"], [required]'),
                description: txt(f.querySelector('.pkpFormField__description')),
                controls: [...f.querySelectorAll('input, select, textarea')].filter((c) => vis(c) || c.tagName === 'TEXTAREA').map((c) => ({
                    tag: c.tagName.toLowerCase(), type: c.type, name: c.name, id: c.id, value: c.type === 'checkbox' ? c.checked : (c.value || '').slice(0, 200),
                    label: c.labels && c.labels[0] ? txt(c.labels[0]) : null,
                })),
                links: [...f.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href')})),
                errors: [...f.querySelectorAll('.pkpFieldError')].map(txt),
            })),
            buttons: [...p.querySelectorAll('button')].filter(vis).map(txt).filter(Boolean),
            text: txt(p).slice(0, 4000),
        };
    }).catch((e) => ({error: String(e.message)}));
}
async function saveTab(page, panel) {
    const before = WRITES.length;
    const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().click();
    const r = await resp;
    let body = null;
    if (r) body = await r.text().catch(() => null);
    await panel.locator('.pkpFormPage__status').filter({hasText: 'Saved'}).first().waitFor({timeout: r && r.status() < 300 ? T : 1500}).catch(() => {});
    await sleep(400);
    return {
        status: r ? r.status() : null,
        response: body ? body.slice(0, 800) : null,
        sent: WRITES.slice(before).map((w) => w.body),
        savedInPanel: await panel.locator('.pkpFormPage__status').filter({hasText: 'Saved'}).count(),
        statusText: (await panel.locator('.pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)),
        errors: (await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean),
        footer: flat(await panel.locator('.pkpFormPage__footer').first().innerText().catch(() => ''), 400),
        notices: (await page.locator('.app__notifications, [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean),
    };
}
// TinyMCE box of the Information form
const edId = (field, locale) => `siteInfo-${field}-control-${locale}`;
async function edReady(page, id, timeout = T) {
    return page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, id, {timeout}).then(() => true).catch(() => false);
}
async function edType(page, id, text) {
    await edReady(page, id);
    await page.locator(`[id="${id}_ifr"]`).contentFrame().locator('body').click();
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text);
    await sleep(300);
    return edValue(page, id);
}
async function edValue(page, id) {
    await edReady(page, id, 8000);
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
}
async function frenchToggle(panel) {
    const b = panel.getByRole('button', {name: 'French', exact: true}).first();
    if (await b.count()) { await b.click(); await sleep(600); return true; }
    return false;
}
// the site's home page: what stands in the content area, in order
async function homeFacts(page, app, locale = 'en') {
    const r = await land(page, app.url(`/index.php/index/${locale}/index`));
    r.about = await page.locator('.about_site').allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => []);
    r.order = await page.evaluate(() => {
        const main = document.querySelector('.page_index_site') || document.querySelector('.pkp_structure_main') || document.body;
        return [...main.children].map((c) => `${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''}.${[...c.classList].join('.')}`);
    }).catch((e) => String(e.message));
    return r;
}
async function resetMail(page, app, email) {
    await page.goto(app.url('/index.php/index/en/login/lostPassword')); await idle(page);
    const since = Date.now();
    await page.locator('input#email').fill(email);
    await page.locator('form#lostPasswordForm button[type="submit"]').click();
    await page.waitForLoadState('load').catch(() => {}); await idle(page);
    const shown = flat(await page.locator('main, .pkp_structure_main').first().innerText().catch(() => ''), 400);
    return {shown, mail: await mailTo(app, email, since)};
}
async function mailTo(app, email, since) {
    let msg = null;
    for (let i = 0; i < 40 && !msg; i++) {
        const res = await app.mail._search({to: email}).catch(() => ({messages: []}));
        msg = (res.messages || []).find((m) => new Date(m.Created).getTime() >= since - 2000) || null;
        if (!msg) await sleep(500);
    }
    if (!msg) return null;
    const full = await app.mail.fullMessage(msg.ID);
    return {subject: full.Subject, from: full.From, replyTo: full.ReplyTo, text: flat(full.Text, 800)};
}
async function oaiAdmin(page, app) {
    const r = await page.request.get(app.url('/index.php/index/oai?verb=Identify')).catch(() => null);
    const xml = r ? await r.text() : '';
    return {status: r ? r.status() : null, adminEmail: (xml.match(/<adminEmail>([\s\S]*?)<\/adminEmail>/g) || []).map((x) => x.replace(/<\/?adminEmail>/g, '')), repositoryName: (xml.match(/<repositoryName>([\s\S]*?)<\/repositoryName>/) || [null, null])[1]};
}
// tabs: the top row and each top tab's side tabs, as they read
async function tabFacts(page) {
    const top = await page.evaluate(() => {
        const list = document.querySelector('[role="tablist"]');
        return list ? [...list.querySelectorAll(':scope > [role="tab"], :scope [role="tab"]')].filter((t) => t.closest('[role="tablist"]') === list).map((t) => ({id: t.id, text: t.innerText.trim(), selected: t.getAttribute('aria-selected'), controls: t.getAttribute('aria-controls')})) : [];
    });
    const out = [];
    for (const t of top) {
        await page.locator(`[id="${t.id}"]`).first().click().catch(() => {});
        await sleep(400);
        const panelId = t.controls || t.id.replace(/-button$/, '');
        const side = await page.evaluate((pid) => {
            const p = document.getElementById(pid);
            if (!p) return null;
            return [...p.querySelectorAll('[role="tab"]')].filter((x) => x.offsetParent !== null).map((x) => ({id: x.id, text: x.innerText.trim(), selected: x.getAttribute('aria-selected')}));
        }, panelId);
        out.push({...t, side});
    }
    return out;
}
async function selectedTabs(page) {
    return page.evaluate(() => [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].filter((x) => x.offsetParent !== null).map((x) => `${x.id}:${x.innerText.trim()}`));
}

forEachApp(async (app) => {
    const st = fs.existsSync(stateFile(app)) && !process.env.RESEED ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : {};
    const saveState = () => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
    const F = {app: app.name};
    const RESTORED = [];
    const factsName = 'k2-facts';
    const step = async (name, fn) => {
        CUR = name;
        const R = {};
        log(app.name, 'phase', name);
        try { await fn(R); } catch (e) { R.error = String(e.stack || e.message).slice(0, 1500); log(app.name, name, 'ERROR', R.error.slice(0, 400)); }
        R.crashes = CRASH[name] || [];
        R.dialogs = DIALOGS.filter((d) => d.phase === name);
        R.writes = WRITES.filter((w) => w.phase === name);
        F[name] = R;
        record(factsName, {[name]: R, restored: RESTORED}, {merge: true});
    };
    const {page, close} = await launch(app);
    watch(page);
    const OPEN = [];
    const fresh = async () => { const x = await launch(app); watch(x.page); OPEN.push(x); return x.page; };
    const APPNAME = {ojs: 'Open Journal Systems', omp: 'Open Monograph Press', ops: 'Open Preprint Systems'}[app.name];

    // Put the Information tab back to `orig` on screen, where the table differs.
    const restoreInfo = async (why) => {
        const now = siteRows(app, INFO_KEYS);
        if (JSON.stringify(now) === JSON.stringify(st.orig.info)) return;
        await signIn(page, 'admin');
        const panel = await openSite(page, app, 'info');
        await frenchToggle(panel);
        const o = st.orig.info;
        for (const loc2 of ['en', 'fr_CA']) {
            const nm = panel.locator(`[id="siteInfo-contactName-control-${loc2}"]`);
            if (await nm.count()) await nm.fill((o.contactName || {})[loc2] || '');
            const em = panel.locator(`[id="siteInfo-contactEmail-control-${loc2}"]`);
            if (await em.count()) await em.fill((o.contactEmail || {})[loc2] || '');
            for (const f of ['about', 'privacyStatement']) {
                const want = (o[f] || {})[loc2] || '';
                const have = await edValue(page, edId(f, loc2));
                if (have !== null && have !== want) {
                    if (want) await page.evaluate(([i, v]) => { const e = window.tinymce.get(i); e.setContent(v); e.fire('change'); e.fire('keyup'); }, [edId(f, loc2), want]);
                    else await edType(page, edId(f, loc2), '');
                }
            }
        }
        const s = await saveTab(page, panel);
        RESTORED.push({what: 'Information tab', why, before: now, save: {status: s.status, errors: s.errors}, after: siteRows(app, INFO_KEYS)});
    };
    const restoreBulk = async (why) => {
        const now = bulkList(app);
        if (JSON.stringify(now || []) === JSON.stringify(st.orig.bulk || []) || !st.A) return;
        if (!(now || []).includes(st.A.id)) { RESTORED.push({what: 'Bulk Emails', why, note: 'differs, but not by K2 A', now, orig: st.orig.bulk}); return; }
        await signIn(page, 'admin');
        const panel = await openSite(page, app, 'bulkEmails');
        await panel.getByRole('checkbox', {name: st.A.name, exact: true}).uncheck();
        const s = await saveTab(page, panel);
        RESTORED.push({what: 'Bulk Emails: K2 A unticked', why, before: now, save: {status: s.status}, after: bulkList(app)});
    };

    try {
        // ── seed ────────────────────────────────────────────────────────────
        if (on('seed') && (!st.t || process.env.RESEED)) await step('seed', async (R) => {
            const t = tag('u60k2');
            st.t = t;
            const u = (s) => `${t}${s}`;
            const A = await app.api.createContext({
                tag: `${t}a`,
                context: {name: `K2 A ${t}`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [{username: u('mg'), roles: ['manager']}, {username: u('rs'), roles: ['reader'], givenName: 'K2', familyName: 'Resetter'}],
            });
            const D = await app.api.createContext({tag: `${t}d`, context: {name: `K2 D ${t}`, enabled: false}});
            st.A = {path: `${t}a`, id: A.contextId, name: `K2 A ${t}`};
            st.D = {path: `${t}d`, id: D.contextId, name: `K2 D ${t}`};
            if (!st.orig) st.orig = {info: siteRows(app, INFO_KEYS), bulk: bulkList(app)};
            saveState();
            R.state = st;
        });
        if (!st.orig) { st.orig = {info: siteRows(app, INFO_KEYS), bulk: bulkList(app)}; saveState(); }
        const t = st.t;
        const u = (s) => `${t}${s}`;

        // ── shell: Rule 1 (td1), the reload per tab ─────────────────────────
        if (on('shell')) await step('shell', async (R) => {
            await signIn(page, 'admin');
            R.adminIndex = await land(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'a01-admin-index');
            R.confirmAccessShown = /Please enter your password to continue/i.test(R.adminIndex.text);
            const btn = page.getByRole('link', {name: 'Site Settings', exact: true}).or(page.getByRole('button', {name: 'Site Settings', exact: true})).first();
            await loc(page, 'Administration: "Site Settings"', btn);
            await btn.click();
            await page.waitForLoadState('load'); await idle(page);
            await snap(page, 'a02-site-settings');
            R.opened = {url: rel(page.url()), title: await page.title(), h1: await page.locator('h1').allInnerTexts()};
            R.tabs = await tabFacts(page);
            // reload on each tab and side tab
            R.reload = [];
            for (const top of R.tabs) {
                for (const side of [null, ...(top.side || [])]) {
                    await page.goto(app.url(SETTINGS)); await idle(page);
                    await page.locator(`[id="${top.id}"]`).first().click();
                    await sleep(300);
                    if (side) {
                        await page.locator(`[id="${top.controls || top.id.replace(/-button$/, '')}"]`).first().locator(`[id="${side.id}"]`).first().click();
                        await sleep(500);
                    }
                    const url = rel(page.url());
                    const before = await selectedTabs(page);
                    await page.reload(); await idle(page); await sleep(1500);
                    const afterReload = await selectedTabs(page);
                    // typed: another page first, then the address
                    await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
                    await page.goto(app.url(url)); await idle(page); await sleep(1500);
                    const afterTyped = await selectedTabs(page);
                    R.reload.push({top: top.text, side: side && side.text, url, before, afterReload, afterTyped});
                }
            }
            await page.goto(app.url(SETTINGS)); await idle(page);
            await page.locator('#setup-button').first().click();
            await page.locator('#info-button').first().click(); await sleep(400);
            await snap(page, 'a03-info-tab');
            await page.reload(); await idle(page); await sleep(500);
            await snap(page, 'a04-after-reload-on-info');
        });

        // ── access: Actors rows 1–3, Rule 3 (td2), line 27 ──────────────────
        if (on('access')) await step('access', async (R) => {
            await signIn(page, 'admin');
            R.admin = {};
            for (const [k, p] of [['site', SETTINGS], ['publicknowledge', `/index.php/${app.contextPath}/en/admin/settings`], ['scratch', `/index.php/${st.A.path}/en/admin/settings`], ['scratchAdmin', `/index.php/${st.A.path}/en/admin`], ['noLocale', '/index.php/index/admin/settings']]) {
                R.admin[k] = await land(page, app.url(p));
                await snap(page, `c01-admin-${k}`);
            }
            R.admin.adminLinkOnDashboard = await (async () => { await land(page, app.url(`/index.php/${app.contextPath}/en/submissions`)); return page.getByRole('link', {name: 'Administration', exact: true}).count(); })();
            const accounts = ['manager.maya', 'sectioneditor.ana', 'assistant.rita', ...(app.name === 'ops' ? [] : ['reviewer.julia']), 'author.alex', 'reader.rosa', u('mg')];
            R.others = {};
            for (const acc of accounts) {
                const p2 = await fresh();
                const r = {};
                try {
                    await signIn(p2, acc);
                    r.landing = rel(p2.url());
                    r.adminLinkOnLanding = await p2.getByRole('link', {name: 'Administration', exact: true}).count();
                    r.settings = await land(p2, app.url(SETTINGS));
                    await snap(p2, `c02-${acc.replace(/\./g, '_')}-settings`);
                    r.admin = await land(p2, app.url('/index.php/index/en/admin'));
                } catch (e) { r.error = String(e.message).slice(0, 300); }
                R.others[acc] = r;
            }
            const p3 = await fresh();
            R.signedOut = {settings: await land(p3, app.url(SETTINGS))};
            await snap(p3, 'c03-signedout-settings');
            R.signedOut.ctxSettings = await land(p3, app.url(`/index.php/${app.contextPath}/en/admin/settings`));
        });

        // ── info: fields, refusals, Rule 4, Rule 5 ─────────────────────────
        if (on('info')) await step('info', async (R) => {
            R.dbBefore = siteRows(app, INFO_KEYS);
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'info');
                await snap(page, 'i01-info');
                R.fields = await formFacts(panel);
                R.editorIds = await page.evaluate(() => (window.tinymce ? window.tinymce.get().map((e) => e.id) : []));
                await loc(page, 'Site Setup › Information: "Name of principal contact" (en)', panel.locator('[id="siteInfo-contactName-control-en"]'));
                await loc(page, 'Site Setup › Information: "Email of principal contact" (en)', panel.locator('[id="siteInfo-contactEmail-control-en"]'));
                await loc(page, 'Site Setup › Information: "About the Site" editor (en)', page.locator(`[id="${edId('about', 'en')}_ifr"]`));
                await loc(page, 'Site Setup › Information: "Privacy Statement" editor (en)', page.locator(`[id="${edId('privacyStatement', 'en')}_ifr"]`));
                await loc(page, 'Site Setup › Information: language toggle "French"', panel.getByRole('button', {name: 'French', exact: true}));
                R.toolbar = await panel.locator('.tox-toolbar__primary').first().evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.getAttribute('title'))).catch((e) => String(e.message));
                // bad email
                await panel.locator('[id="siteInfo-contactEmail-control-en"]').fill('not-an-address');
                R.badEmail = await saveTab(page, panel);
                await snap(page, 'i02-bad-email');
                R.badEmailDb = siteRows(app, INFO_KEYS);
                // empty name, empty email
                for (const f of ['contactName', 'contactEmail']) {
                    panel = await openSite(page, app, 'info');
                    await panel.locator(`[id="siteInfo-${f}-control-en"]`).fill('');
                    R[`empty_${f}`] = await saveTab(page, panel);
                    await snap(page, `i03-empty-${f}`);
                    R[`empty_${f}_db`] = siteRows(app, INFO_KEYS);
                }
                // Rule 4: a refused save stores nothing of the tab (About typed + bad email)
                panel = await openSite(page, app, 'info');
                await edType(page, edId('about', 'en'), `U60 K2 refused about ${app.name}`);
                await panel.locator('[id="siteInfo-contactEmail-control-en"]').fill('still-not-an-address');
                R.mixed = await saveTab(page, panel);
                await snap(page, 'i04-mixed-refused');
                R.mixedDb = siteRows(app, INFO_KEYS);
                panel = await openSite(page, app, 'info');
                R.mixedAfterReload = {about: await edValue(page, edId('about', 'en')), email: await panel.locator('[id="siteInfo-contactEmail-control-en"]').inputValue()};
                // Rule 5: French boxes; the French name emptied alone
                R.frenchToggled = await frenchToggle(panel);
                await snap(page, 'i05-french-open');
                R.frenchFields = await formFacts(panel);
                const frName = panel.locator('[id="siteInfo-contactName-control-fr_CA"]');
                R.frNameBefore = await frName.inputValue().catch(() => null);
                await frName.fill('');
                R.frNameEmpty = await saveTab(page, panel);
                await snap(page, 'i06-fr-name-empty-saved');
                R.frNameEmptyDb = siteRows(app, ['contactName']);
                panel = await openSite(page, app, 'info');
                await frenchToggle(panel);
                R.frNameAfterReload = await panel.locator('[id="siteInfo-contactName-control-fr_CA"]').inputValue().catch(() => null);
                // the French-interface Administration header still reads the name? read a French page's site contact is not shown; restore
                await panel.locator('[id="siteInfo-contactName-control-fr_CA"]').fill(R.frNameBefore || '');
                R.frNameRestore = await saveTab(page, panel);
                R.dbAfter = siteRows(app, INFO_KEYS);
            } finally {
                await restoreInfo('info phase');
            }
        });

        // ── content: About (td9), Privacy (td10 second half), Rule 5 fallback ──
        if (on('content')) await step('content', async (R) => {
            R.dbBefore = siteRows(app, INFO_KEYS);
            try {
                const pOut = await fresh();
                R.homeBefore = await homeFacts(pOut, app);
                await snap(pOut, 'h01-home-before');
                R.aboutOut = await land(pOut, app.url('/index.php/index/en/about'));
                await snap(pOut, 'h02-about-signedout');
                R.privacyBefore = await land(pOut, app.url('/index.php/index/en/about/privacy'));
                await snap(pOut, 'h03-privacy-before');
                R.registerBefore = await land(pOut, app.url('/index.php/index/en/user/register'));
                R.registerBefore.siteConsent = await pOut.locator('input[name="privacyConsent[0]"]').count();
                R.registerBefore.consentText = flat(await pOut.locator('form#register').innerText().catch(() => ''), 1500);
                await snap(pOut, 'h04-register-before');

                await signIn(page, 'admin');
                R.aboutAdmin = await land(page, app.url('/index.php/index/en/about'));
                await snap(page, 'h05-about-admin');
                // About (en) and Privacy (en)
                let panel = await openSite(page, app, 'info');
                const ABOUT = `U60 K2 about the site ${app.name}`;
                const PRIV = `U60 K2 privacy statement ${app.name}`;
                R.aboutTyped = await edType(page, edId('about', 'en'), ABOUT);
                R.privTyped = await edType(page, edId('privacyStatement', 'en'), PRIV);
                R.save1 = await saveTab(page, panel);
                await snap(page, 'h06-info-saved');
                R.save1SameRead = {about: await edValue(page, edId('about', 'en')), priv: await edValue(page, edId('privacyStatement', 'en'))};
                R.save1Db = siteRows(app, INFO_KEYS);
                panel = await openSite(page, app, 'info');
                R.save1ReloadRead = {about: await edValue(page, edId('about', 'en')), priv: await edValue(page, edId('privacyStatement', 'en'))};
                // signed in: the Site Administrator and a reader on the site's own pages
                R.homeEnAdmin = await homeFacts(page, app, 'en');
                R.privacyAdmin = await land(page, app.url('/index.php/index/en/about/privacy'));
                const pr = await fresh();
                await signIn(pr, 'reader.rosa');
                R.homeEnReader = await homeFacts(pr, app, 'en');
                await snap(pr, 'h07b-home-about-reader');
                R.privacyReader = await land(pr, app.url('/index.php/index/en/about/privacy'));

                R.homeEn = await homeFacts(pOut, app, 'en');
                await snap(pOut, 'h07-home-about-en');
                R.homeFr = await homeFacts(pOut, app, 'fr_CA');
                await snap(pOut, 'h08-home-about-fr-fallback');
                R.privacySet = await land(pOut, app.url('/index.php/index/en/about/privacy'));
                await snap(pOut, 'h09-privacy-set');
                R.privacySetFr = await land(pOut, app.url('/index.php/index/fr_CA/about/privacy'));
                R.registerSet = await land(pOut, app.url('/index.php/index/en/user/register'));
                R.registerSet.siteConsent = await pOut.locator('input[name="privacyConsent[0]"]').count();
                R.registerSet.consentLabel = flat(await pOut.locator('input[name="privacyConsent[0]"]').locator('xpath=ancestor::label[1]').innerText().catch(() => ''), 400);
                R.registerSet.consentLinks = await pOut.locator('form#register a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}))).catch(() => []);
                await snap(pOut, 'h10-register-consent');
                // French About: the French visitor's own value
                panel = await openSite(page, app, 'info');
                await frenchToggle(panel);
                R.aboutFrTyped = await edType(page, edId('about', 'fr_CA'), `U60 K2 a propos du site ${app.name}`);
                R.save2 = await saveTab(page, panel);
                R.save2Db = siteRows(app, ['about']);
                R.homeFr2 = await homeFacts(pOut, app, 'fr_CA');
                await snap(pOut, 'h11-home-about-fr-own');
                R.homeEn2 = await homeFacts(pOut, app, 'en');
                // empty all, Save
                panel = await openSite(page, app, 'info');
                await frenchToggle(panel);
                for (const [f, l] of [['about', 'en'], ['about', 'fr_CA'], ['privacyStatement', 'en']]) await edType(page, edId(f, l), '');
                R.save3 = await saveTab(page, panel);
                R.save3Db = siteRows(app, INFO_KEYS);
                R.homeAfter = await homeFacts(pOut, app, 'en');
                await snap(pOut, 'h12-home-after-empty');
                R.privacyAfter = await land(pOut, app.url('/index.php/index/en/about/privacy'));
                R.registerAfter = {siteConsent: await (async () => { await land(pOut, app.url('/index.php/index/en/user/register')); return pOut.locator('input[name="privacyConsent[0]"]').count(); })()};
            } finally {
                await restoreInfo('content phase');
            }
        });

        // ── contact: Rule 14 (td10 first half) ─────────────────────────────
        if (on('contact')) await step('contact', async (R) => {
            R.dbBefore = siteRows(app, INFO_KEYS);
            R.freshInstallExpect = APPNAME;
            try {
                const pOut = await fresh();
                R.oaiBefore = await oaiAdmin(pOut, app);
                R.resetBefore = await resetMail(pOut, app, `${u('rs')}@mail.test`);
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'info');
                const NAME = `U60 K2 Contact ${app.name.toUpperCase()}`;
                const MAIL = `u60k2contact${app.name}@mail.test`;
                await panel.locator('[id="siteInfo-contactName-control-en"]').fill(NAME);
                await panel.locator('[id="siteInfo-contactEmail-control-en"]').fill(MAIL);
                R.save = await saveTab(page, panel);
                await snap(page, 'k01-contact-saved');
                R.saveDb = siteRows(app, INFO_KEYS);
                R.oaiAfter = await oaiAdmin(pOut, app);
                R.resetAfter = await resetMail(pOut, app, `${u('rs')}@mail.test`);
                await snap(pOut, 'k02-reset-requested');
                // Registration on the validation variant, at the site's address
                const base = app.variant('validation');
                const reg = `${u('rg')}${Date.now() % 10000}`;
                const since = Date.now();
                await pOut.goto(`${base}/index.php/index/en/user/register`); await idle(pOut);
                const f = pOut.locator('form#register');
                await f.locator('input[name="givenName"]').fill('K2');
                await f.locator('input[name="familyName"]').fill('Registrant');
                await f.locator('input[name="affiliation"]').fill('PKP').catch(() => {});
                await f.locator('select[name="country"]').selectOption({label: 'Canada'}).catch(() => {});
                await f.locator('input[name="email"]').fill(`${reg}@mail.test`);
                await f.locator('input[name="username"]').fill(reg);
                await f.locator('input[name="password"]').fill(`${reg}${reg}`);
                await f.locator('input[name="password2"]').fill(`${reg}${reg}`);
                const pc = f.locator('input[name="privacyConsent"], input[name="privacyConsent[0]"]');
                if (await pc.count()) await pc.first().check().catch(() => {});
                await snap(pOut, 'k03-register-filled');
                await pOut.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {timeout: 30_000}).catch(() => {});
                await f.locator('button.submit').click();
                await pOut.waitForLoadState('load').catch(() => {}); await idle(pOut); await sleep(1500);
                await snap(pOut, 'k04-register-done');
                R.register = {user: reg, url: rel(pOut.url()), text: flat(await pOut.locator('main, .pkp_structure_main, body').first().innerText().catch(() => ''), 400), mail: await mailTo(app, `${reg}@mail.test`, since)};
            } finally {
                await restoreInfo('contact phase');
                R.dbAfter = siteRows(app, INFO_KEYS);
            }
        });

        // ── bulk: Rule 16 (td11) ───────────────────────────────────────────
        if (on('bulk')) await step('bulk', async (R) => {
            R.dbBefore = bulkList(app);
            try {
                const pm = await fresh();
                await signIn(pm, u('mg'));
                const notify = async (name) => {
                    await pm.goto(app.url(`/index.php/${st.A.path}/en/management/settings/access`)); await idle(pm);
                    await snap(pm, name);
                    return {tabs: (await pm.getByRole('tab').allInnerTexts()).map((x) => flat(x, 60)), notify: await pm.getByRole('tab', {name: 'Notify', exact: true}).count()};
                };
                R.managerBefore = await notify('b01-access-before');
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'bulkEmails');
                await snap(page, 'b02-bulk');
                R.fields = await formFacts(panel);
                R.boxes = await panel.locator('input[name="enableBulkEmails"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null})));
                R.listsA = R.boxes.some((b) => b.label === st.A.name);
                R.listsD = R.boxes.some((b) => b.label === st.D.name);
                R.pk = R.boxes.filter((b) => /Public Knowledge/.test(b.label || ''));
                R.contextCount = sql(app, `select count(*) from ${{ojs: 'journals', omp: 'presses', ops: 'servers'}[app.name]}`);
                await loc(page, 'Site Setup › Bulk Emails: a context\'s box by name', panel.getByRole('checkbox', {name: st.A.name, exact: true}));
                const link = panel.locator('a').filter({hasText: /Hosted/}).first();
                await loc(page, 'Site Setup › Bulk Emails: the description\'s "Hosted …" link', link);
                R.link = {text: await link.innerText().catch(() => null), href: await link.getAttribute('href').catch(() => null), target: await link.getAttribute('target').catch(() => null)};
                const [pop] = await Promise.all([page.waitForEvent('popup', {timeout: 3000}).catch(() => null), link.click().catch(() => {})]);
                const lp = pop || page;
                await lp.waitForLoadState('load').catch(() => {}); await idle(lp);
                R.linkLands = {popup: !!pop, url: rel(lp.url()), title: await lp.title(), h1: await lp.locator('h1').allInnerTexts().catch(() => [])};
                await snap(lp, 'b03-hosted-link');
                if (pop) await pop.close();
                // tick A (tab reloaded right before)
                panel = await openSite(page, app, 'bulkEmails');
                await panel.getByRole('checkbox', {name: st.A.name, exact: true}).check();
                R.tick = await saveTab(page, panel);
                R.tickSameRead = await panel.getByRole('checkbox', {name: st.A.name, exact: true}).isChecked();
                await snap(page, 'b04-ticked-saved');
                R.tickDb = bulkList(app);
                panel = await openSite(page, app, 'bulkEmails');
                R.tickReloadRead = await panel.getByRole('checkbox', {name: st.A.name, exact: true}).isChecked();
                R.managerTicked = await notify('b05-access-ticked');
                if (R.managerTicked.notify) {
                    await pm.getByRole('tab', {name: 'Notify', exact: true}).click(); await idle(pm); await sleep(500);
                    await snap(pm, 'b06-notify-open');
                }
                // untick
                panel = await openSite(page, app, 'bulkEmails');
                await panel.getByRole('checkbox', {name: st.A.name, exact: true}).uncheck();
                R.untick = await saveTab(page, panel);
                R.untickDb = bulkList(app);
                panel = await openSite(page, app, 'bulkEmails');
                R.untickReloadRead = await panel.getByRole('checkbox', {name: st.A.name, exact: true}).isChecked();
                R.managerUnticked = await notify('b07-access-unticked');
            } finally {
                await restoreBulk('bulk phase');
                R.dbAfter = bulkList(app);
            }
        });

        // ── french: Rule 23, A2 (td17) ─────────────────────────────────────
        if (on('french')) await step('french', async (R) => {
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/fr_CA/admin/settings')); await idle(page);
            await snap(page, 'f01-fr-settings');
            R.h1 = await page.locator('h1').allInnerTexts();
            R.tabs = await tabFacts(page);
            R.panels = {};
            await page.locator('#setup-button').first().click();
            const setup = R.tabs.find((x) => x.id === 'setup-button');
            for (const s of (setup && setup.side) || []) {
                await page.locator('[role="tabpanel"]#setup').first().locator(`[id="${s.id}"]`).first().click().catch(() => {});
                await sleep(700); await idle(page);
                const pid = s.id.replace(/-button$/, '');
                const txt = await page.locator(`[role="tabpanel"]#${pid}`).first().innerText().catch(() => '');
                const attrs = await page.locator(`[role="tabpanel"]#${pid}`).first().evaluate((p) => [...p.querySelectorAll('[placeholder],[aria-label],[title]')].map((e) => e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.getAttribute('title')).filter((x) => /##/.test(x))).catch(() => []);
                R.panels[s.text] = {codes: [...new Set((txt.match(/##[^#\s]+##/g) || []))], attrCodes: [...new Set(attrs)], labels: await page.locator(`[role="tabpanel"]#${pid}`).first().locator('.pkpFormFieldLabel, legend, .pkpFormGroup__heading').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => [])};
                if (['security-button', 'info-button', 'bulkEmails-button', 'settings-button'].includes(s.id)) await snap(page, `f02-fr-${pid}`);
            }
            R.pageCodes = [...new Set(((await page.locator('body').innerText().catch(() => '')).match(/##[^#\s]+##/g) || []))];
            // the language switch a user would use
            R.langMenu = await page.getByRole('button', {name: /English|Français|Language|Langue/}).allInnerTexts().catch(() => []);
        });

        // ── leave: Information and Bulk Emails with something unsaved ──────
        if (on('leave')) await step('leave', async (R) => {
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'info');
                const orig = await panel.locator('[id="siteInfo-contactName-control-en"]').inputValue();
                await panel.locator('[id="siteInfo-contactName-control-en"]').fill('K2 unsaved name');
                await edType(page, edId('about', 'en'), 'K2 unsaved about');
                await page.locator('#bulkEmails-button').first().click(); await sleep(600);
                R.bulkShownAfterSwitch = await page.locator('[role="tabpanel"]#bulkEmails').first().isVisible();
                await page.locator('#info-button').first().click(); await sleep(600);
                R.backOnInfo = {name: await panel.locator('[id="siteInfo-contactName-control-en"]').inputValue(), about: await edValue(page, edId('about', 'en'))};
                await page.locator('#appearance-button').first().click(); await sleep(600);
                await page.locator('#setup-button').first().click(); await sleep(300);
                await page.locator('#info-button').first().click(); await sleep(600);
                R.backAfterTopTab = {name: await panel.locator('[id="siteInfo-contactName-control-en"]').inputValue(), about: await edValue(page, edId('about', 'en'))};
                await snap(page, 'l01-info-unsaved-back');
                const d0 = DIALOGS.length;
                await page.goto(app.url('/index.php/index/en/admin')).catch((e) => { R.leaveErr = String(e.message).slice(0, 200); });
                await idle(page);
                R.leaveDialogs = DIALOGS.slice(d0);
                R.leftTo = rel(page.url());
                panel = await openSite(page, app, 'info');
                R.afterReturn = {name: await panel.locator('[id="siteInfo-contactName-control-en"]').inputValue(), about: await edValue(page, edId('about', 'en')), orig};
                R.db = siteRows(app, INFO_KEYS);
                // Bulk Emails
                panel = await openSite(page, app, 'bulkEmails');
                await panel.getByRole('checkbox', {name: st.A.name, exact: true}).check();
                await page.locator('#info-button').first().click(); await sleep(500);
                await page.locator('#bulkEmails-button').first().click(); await sleep(500);
                R.bulkBack = await panel.getByRole('checkbox', {name: st.A.name, exact: true}).isChecked();
                const d1 = DIALOGS.length;
                await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
                R.bulkLeaveDialogs = DIALOGS.slice(d1);
                panel = await openSite(page, app, 'bulkEmails');
                R.bulkAfterReturn = await panel.getByRole('checkbox', {name: st.A.name, exact: true}).isChecked();
                R.bulkDb = bulkList(app);
            } finally {
                await restoreInfo('leave phase');
                await restoreBulk('leave phase');
            }
        });

        if (on('restore')) await step('restore', async (R) => {
            await restoreInfo('final check');
            await restoreBulk('final check');
            R.info = {now: siteRows(app, INFO_KEYS), orig: st.orig.info, same: JSON.stringify(siteRows(app, INFO_KEYS)) === JSON.stringify(st.orig.info)};
            R.bulk = {now: bulkList(app), orig: st.orig.bulk};
        });
    } finally {
        record(factsName, {crashIndex: CRASH, restored: RESTORED}, {merge: true});
        for (const x of OPEN) await x.close().catch(() => {});
        await close();
    }
});
