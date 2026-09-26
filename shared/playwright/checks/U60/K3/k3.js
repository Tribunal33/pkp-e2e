// U60 claim check, chunk K3: Administration › Site Settings › "Appearance"
// › "Theme" and "Setup" ("Logo", "Page Footer", "Sidebar", "Site style
// sheet"), and what each does on the site's own pages, a journal's pages and
// the editorial screens. All three apps.
// Spec: docs/specs/U60-site-settings.md lines 80–94, 257–291, 360–371,
// register A5, A6, OMP1 (532–558); footnotes j, k, td12–td16, f-a5, f-a6,
// f-omp1.
//
// The site is one record every agent shares: this script saves only the
// "Theme" and "Setup" tabs of "Appearance" (and, for Rule 20's order and a
// disabled block, the "Developed By" Block plugin on the site's "Plugins"),
// writes each value down before changing it and puts it back in a finally.
// Seeds per app (scratch, tag prefix u60k3): one journal with a manager,
// whose own "Page Footer" is set on its own screen (the journal end of
// Rule 19).
// Phases (PHASES=a,b; default all): seed, read, roles, theme, logo, footer,
// sidebar, css, leave, restoreorig, named (sets the Site Name: only while K1's tab is idle), final
// Run: PROBE_FEATURE=U60 PROBE_AGENT=ccK3 node bin/probe.js <app|all> shared/playwright/checks/U60/K3/k3.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'read', 'roles', 'theme', 'logo', 'footer', 'sidebar', 'css', 'leave', 'restoreorig', 'named', 'final'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log('[k3]', ...a);
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const loadState = (app) => { try { return JSON.parse(fs.readFileSync(stateFile(app), 'utf8')); } catch { return {}; } };
const saveState = (app, st) => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));

// ---- files -----------------------------------------------------------------
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
};
const png = (w, h, [r, g, b]) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0;
        for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; }
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const CSS = 'h1, h2, h3, h4 { color: rgb(255, 0, 0) !important; }\nhtml { --u60k3-site-sheet: 1; }\n';
const FILES = {
    logo: {name: 'u60k3-site-logo.png', mimeType: 'image/png', buffer: png(240, 60, [20, 120, 40])},
    css: {name: 'u60k3-red.css', mimeType: 'text/css', buffer: Buffer.from(CSS)},
    notCss: {name: 'u60k3-not-a-sheet.png', mimeType: 'image/png', buffer: png(10, 10, [0, 0, 255])},
};
const ALT = 'U60 K3 site logo';
const FOOTER = 'U60 K3 site footer sentence.';
const JFOOTER = 'U60 K3 journal own footer.';

// ---- the public side ---------------------------------------------------------
async function pub(page) {
    return page.evaluate(() => {
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const head = document.querySelector('.pkp_structure_head');
        const sn = document.querySelector('.pkp_site_name');
        const a = sn && sn.querySelector('a');
        const img = sn && sn.querySelector('img');
        const main = document.querySelector('.pkp_structure_main');
        const hs = [...document.querySelectorAll('.pkp_structure_main h1, .pkp_structure_main h2, .pkp_structure_main h3')].slice(0, 4);
        const side = document.querySelector('.pkp_structure_sidebar');
        const links = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => (l.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''));
        return {
            url: location.href.replace(/^https?:\/\/[^/]+/, ''),
            title: document.title,
            lang: document.documentElement.lang,
            header: head ? {bg: cs(head).backgroundColor, color: cs(head).color} : null,
            siteName: sn ? {
                html: sn.outerHTML.replace(/\s+/g, ' ').slice(0, 600),
                linkHref: a ? (a.getAttribute('href') || '').trim().replace(/^https?:\/\/[^/]+/, '') : null,
                linkText: txt(a),
                font: a ? cs(a).fontFamily : null,
                img: img ? {src: (img.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''), alt: img.getAttribute('alt'), natural: [img.naturalWidth, img.naturalHeight]} : null,
            } : null,
            fonts: {body: cs(document.body).fontFamily, heading: hs[0] ? cs(hs[0]).fontFamily : null},
            headings: hs.map((h) => ({tag: h.tagName, text: txt(h).slice(0, 60), color: cs(h).color})),
            pageH1: (() => { const h = document.querySelector('h1'); return h ? {text: txt(h), color: cs(h).color, cls: h.className} : null; })(),
            stylesheets: links,
            siteSheet: links.filter((l) => /public\/site\//.test(l)),
            siteSheetVar: getComputedStyle(document.documentElement).getPropertyValue('--u60k3-site-sheet').trim() || null,
            footer: txt(document.querySelector('.pkp_footer_content')),
            footerHtml: (document.querySelector('.pkp_footer_content') || {}).innerHTML ? document.querySelector('.pkp_footer_content').innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
            sidebar: side ? [...side.querySelectorAll('.pkp_block')].map((b) => ({cls: b.className, heading: txt(b.querySelector('h2, h3, .title')), content: txt(b).slice(0, 100)})) : null,
            mainText: txt(main) ? txt(main).slice(0, 1500) : null,
            mainHtmlLen: main ? main.innerHTML.length : null,
            about: txt(document.querySelector('.homepage_about, .about_site')),
        };
    });
}

forEachApp(async (app) => {
    const ctxUrl = (ctx, p = '', locale = 'en') => app.url(`/index.php/${ctx}${locale ? '/' + locale : ''}${p}`);
    const siteSettings = () => app.url('/index.php/index/en/admin/settings');
    const st = loadState(app);
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); };
    record('facts', {ERROR: null}, {merge: true});

    // ---- seed ------------------------------------------------------------------
    if (on('seed') && !st.J) {
        const J = tag('u60k3');
        await app.api.createContext({tag: J, context: {name: `U60 K3 journal ${J}`, acronym: 'K3J'}, users: [{username: `${J}mgr`, roles: ['manager']}]});
        st.J = J; st.mgr = `${J}mgr`;
        saveState(app, st);
        log('seeded', J);
    }
    const J = st.J;

    const {page, close} = await launch(app);
    const vis = await page.context().browser().newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}}).then((c) => c.newPage());
    const asked = [];
    page.on('dialog', (d) => { asked.push({type: d.type(), message: d.message().slice(0, 200), url: page.url()}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });

    const snap = async (p, name, extra = {}) => { const s = await screen(p).catch((e) => ({error: String(e.message || e)})); record(name, {...extra, screen: s}); await shot(p, name).catch(() => {}); return s; };
    const visit = async (url, name) => {
        let status = null;
        try { const r = await vis.goto(url); status = r ? r.status() : null; } catch (e) { status = String(e.message || e); }
        await idle(vis).catch(() => {});
        await vis.waitForFunction(() => [...document.images].every((i) => i.complete), null, {timeout: 5000}).catch(() => {});
        await vis.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
        const p = await pub(vis).catch((e) => ({error: String(e.message || e)}));
        await snap(vis, name, {status, pub: p});
        return {status, ...p};
    };
    const adminVisit = async (url, name) => {   // an editorial screen, read as the signed-in admin
        await page.goto(url); await idle(page);
        const d = await page.evaluate(() => {
            const cs = (el) => (el ? getComputedStyle(el) : null);
            const links = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => (l.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''));
            const h = document.querySelector('h1');
            return {url: location.href.replace(/^https?:\/\/[^/]+/, ''), siteSheet: links.filter((l) => /public\/site\//.test(l)), siteSheetVar: getComputedStyle(document.documentElement).getPropertyValue('--u60k3-site-sheet').trim() || null, h1: h ? {text: h.innerText.trim().slice(0, 80), color: cs(h).color} : null, bodyFont: cs(document.body).fontFamily, headerBg: (() => { const x = document.querySelector('header'); return x ? cs(x).backgroundColor : null; })()};
        });
        await snap(page, name, {editorial: d});
        return d;
    };
    const as = async (user, contextPath) => { await signIn(page, user, contextPath ? {contextPath} : {}); await idle(page); };

    // ---- the site's "Appearance" tabs -------------------------------------------------
    const openAppearance = async (side) => {
        await page.goto(siteSettings()); await idle(page);
        await page.locator('#appearance-button').first().click(); await idle(page);
        const tab = page.locator('#appearance').getByRole('tab', {name: side === 'theme' ? 'Theme' : 'Setup', exact: true}).first();
        await tab.click(); await idle(page); await sleep(500);
        return page.locator('#appearance').locator('[role="tabpanel"]').filter({has: page.locator(side === 'theme' ? 'select, [id^="theme-"]' : '[id^="siteAppearance-"]')}).first();
    };
    const themePanel = () => page.locator('#appearance').locator('[role="tabpanel"]').filter({has: page.locator('[id^="theme-"]')}).first();
    const setupForm = () => page.locator('form').filter({has: page.locator('[id^="siteAppearance-"]')}).first();
    const fieldByLabel = (root, re) => root.locator('.pkpFormField').filter({hasText: re}).first();
    const formFields = async (root) => root.evaluate((r) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e && e.offsetParent !== null;
        return {
            locales: [...r.querySelectorAll('.pkpFormLocales button')].map((b) => ({text: txt(b), pressed: b.getAttribute('aria-pressed')})),
            fields: [...r.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField')).map((f) => ({
                cls: f.className.replace(/\s+/g, ' ').trim().slice(0, 120),
                label: txt(f.querySelector('.pkpFormFieldLabel, legend, label')),
                description: txt(f.querySelector('.pkpFormField__description')),
                visible: vis(f),
                options: [...f.querySelectorAll('input[type=radio], input[type=checkbox]')].map((i) => ({type: i.type, name: i.name, value: i.value, checked: i.checked, label: txt(i.closest('label'))})),
                selects: [...f.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => o.label)})),
                texts: [...f.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=file]), textarea')].map((i) => ({id: i.id, name: i.name, value: i.value, visible: vis(i)})),
                buttons: [...f.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label') || b.getAttribute('title')).filter(Boolean),
                links: [...f.querySelectorAll('a')].filter(vis).map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})),
                imgs: [...f.querySelectorAll('img')].map((i) => ({src: (i.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''), alt: i.getAttribute('alt')})),
                errors: [...f.querySelectorAll('.pkpFieldError, .dz-error-message')].filter(vis).map(txt).filter(Boolean),
            })),
            buttons: [...r.querySelectorAll('button')].filter(vis).map((b) => ({text: txt(b) || b.getAttribute('aria-label'), disabled: b.disabled})).slice(0, 60),
            text: txt(r).slice(0, 3000),
        };
    }).catch((e) => ({error: String(e.message || e)}));
    const saveForm = async (root) => {
        const resp = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\//.test(r.url()) && !/temporaryFiles/.test(r.url()), {timeout: T}).catch(() => null);
        await root.getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await resp;
        let body = null;
        try { body = r ? await r.json() : null; } catch { body = null; }
        const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page);
        const errors = (await root.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);
        const bar = (await page.locator('.pkpFormPage__status, .pkpFormErrors, [role=alert], .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);
        return {status: r ? r.status() : null, url: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null, method: r ? r.request().method() : null, override: r ? r.request().headers()['x-http-method-override'] || null : null,
            posted: r ? flat(r.request().postData(), 1200) : null, saved, errors, bar, bodyErr: body && typeof body === 'object' && (body.errors || body.error) ? JSON.stringify(body).slice(0, 600) : null, bodyKeys: body && typeof body === 'object' ? Object.keys(body).slice(0, 40) : null};
    };
    // upload boxes: siteAppearance-<field>-control[-<locale>]
    const box = (field, locale) => page.locator(`[id="siteAppearance-${field}-control${locale ? '-' + locale : ''}"]`).locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
    const boxState = async (field, locale) => {
        const b = box(field, locale);
        if (!(await b.count())) return {present: false};
        return b.evaluate((root) => {
            const vis = (e) => e && e.offsetParent !== null;
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const img = root.querySelector('img');
            return {present: true, visible: vis(root), text: txt(root),
                buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label')).filter(Boolean),
                inputs: [...root.querySelectorAll('input:not([type=file]), textarea')].map((i) => ({id: i.id, type: i.type, value: i.value, visible: vis(i), label: i.id && root.querySelector(`label[for="${i.id}"]`) ? txt(root.querySelector(`label[for="${i.id}"]`)) : null})),
                img: img ? {src: (img.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''), alt: img.getAttribute('alt')} : null,
                links: [...root.querySelectorAll('a')].filter(vis).map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})),
                errors: [...root.querySelectorAll('.pkpFieldError, .dz-error-message')].filter(vis).map(txt).filter(Boolean),
                accept: [...root.querySelectorAll('input[type=file]')].map((i) => i.getAttribute('accept'))};
        });
    };
    const upload = async (field, locale, file) => {
        const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 8000}).catch(() => null);
        await page.locator(`[id="siteAppearance-${field}-hiddenFileId${locale ? '-' + locale : ''}"]`).setInputFiles(file);
        const r = await w;
        await sleep(1200); await idle(page);
        return {tempStatus: r ? r.status() : null, box: await boxState(field, locale)};
    };
    const pressInBox = async (field, locale, name) => { await box(field, locale).getByRole('button', {name, exact: true}).first().click(); await sleep(600); return boxState(field, locale); };
    const footerId = (locale = 'en') => `siteAppearance-pageFooter-control-${locale}`;
    const typeFooter = async (text, locale = 'en') => {
        const fid = footerId(locale);
        await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, fid, {timeout: T});
        await page.locator(`[id="${fid}_ifr"]`).contentFrame().locator('body').click();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete');
        if (text) await page.keyboard.type(text);
        await sleep(300);
        return page.evaluate((id) => window.tinymce.get(id).getContent(), fid);
    };
    const footerValue = async (locale = 'en') => {
        await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, footerId(locale), {timeout: 8000}).catch(() => {});
        return page.evaluate((id) => (window.tinymce && window.tinymce.get(id) ? window.tinymce.get(id).getContent() : null), footerId(locale)).catch(() => null);
    };
    const toolbar = async (locale = 'en') => box('pageFooter', locale).evaluate((root) => [...root.querySelectorAll('.tox-toolbar button, .tox-tbtn, [role="toolbar"] button')].map((b) => b.getAttribute('aria-label') || b.getAttribute('title') || b.innerText.trim()).filter(Boolean)).catch((e) => String(e.message));
    const sidebarList = async () => page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => {
        const row = e.closest('.pkpFormField--options__option, label, li') || e.parentElement;
        return {value: e.value, checked: e.checked, label: row.innerText.replace(/\s+/g, ' ').trim(),
            rowButtons: [...(e.closest('.pkpFormField--options__option') || row).querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.innerText.trim())};
    }));
    const setupValues = async () => ({
        logoEn: await boxState('pageHeaderTitleImage', 'en'), logoFr: await boxState('pageHeaderTitleImage', 'fr_CA'),
        footerEn: await footerValue('en'), footerFr: await footerValue('fr_CA'),
        sidebar: await sidebarList(), styleSheet: await boxState('styleSheet', null),
    });
    const themeValues = async () => formFields(themePanel());
    const typeColour = async (value) => {
        const f = fieldByLabel(themePanel(), /^Colour/);
        const hex = f.locator('input').first();
        await hex.click(); await hex.fill(value); await hex.press('Enter').catch(() => {}); await hex.blur().catch(() => {});
        await sleep(400);
        return f.locator('input').evaluateAll((els) => els.map((e) => e.value));
    };

    // ---- the site's and a journal's pages ----------------------------------------------
    const pages = async (prefix, which = ['home', 'login', 'journal', 'scratch']) => {
        const o = {};
        if (which.includes('home')) o.home = await visit(ctxUrl('index', ''), `${prefix}-site-home`);
        if (which.includes('login')) o.login = await visit(ctxUrl('index', '/login'), `${prefix}-site-login`);
        if (which.includes('homeFr')) o.homeFr = await visit(ctxUrl('index', '', 'fr_CA'), `${prefix}-site-home-fr`);
        if (which.includes('journal')) o.journal = await visit(ctxUrl(app.contextPath, ''), `${prefix}-journal-home`);
        if (which.includes('journalAbout')) o.journalAbout = await visit(ctxUrl(app.contextPath, '/about'), `${prefix}-journal-about`);
        if (which.includes('scratch') && J) o.scratch = await visit(ctxUrl(J, ''), `${prefix}-scratch-home`);
        return o;
    };
    const brief = (p) => p && ({status: p.status, url: p.url, header: p.header, logo: p.siteName && p.siteName.img, linkHref: p.siteName && p.siteName.linkHref, linkText: p.siteName && p.siteName.linkText, font: p.fonts, footer: p.footer, sidebar: p.sidebar && p.sidebar.map((b) => b.cls), siteSheet: p.siteSheet, sheetVar: p.siteSheetVar, headings: p.headings && p.headings.map((h) => `${h.tag}:${h.color}`), mainLen: p.mainHtmlLen});

    try {
        // ======================= read (nothing saved) ============================================
        if (on('read')) {
            await as('admin');
            let panel = await openAppearance('theme');
            await snap(page, '01-site-theme');
            const theme = await themeValues();
            await loc(page, 'Site Settings › Appearance › Theme: the "Theme" select', themePanel().locator('select').first());
            await loc(page, 'Site Settings › Appearance › Theme: the "Colour" hex box', fieldByLabel(themePanel(), /^Colour/).locator('input').first());
            await loc(page, 'Site Settings › Appearance › Theme: the "Journal Summary"-type box', themePanel().locator('input[name="showDescriptionInJournalIndex"]'));
            await loc(page, 'Site Settings › Appearance › Theme: Save', themePanel().getByRole('button', {name: 'Save', exact: true}));
            fact('themeTab', theme);
            panel = await openAppearance('setup');
            await snap(page, '02-site-setup');
            const setup = await formFields(setupForm());
            fact('setupTab', setup);
            fact('setupValues', await setupValues());
            fact('footerToolbar', {en: await toolbar('en'), fr: await toolbar('fr_CA')});
            await loc(page, 'Site Settings › Appearance › Setup: the "Logo" file input (en)', page.locator('#siteAppearance-pageHeaderTitleImage-hiddenFileId-en'));
            await loc(page, 'Site Settings › Appearance › Setup: the "Page Footer" editor (en)', page.locator(`[id="${footerId('en')}_ifr"]`));
            await loc(page, 'Site Settings › Appearance › Setup: the "Sidebar" boxes', page.locator('input[name="sidebar"]'));
            await loc(page, 'Site Settings › Appearance › Setup: the "Site style sheet" file input', page.locator('#siteAppearance-styleSheet-hiddenFileId'));
            await loc(page, 'Site Settings › Appearance › Setup: Save', setupForm().getByRole('button', {name: 'Save', exact: true}));
            // the scratch journal's own Theme tab, for the comparison (its manager)
            await as(st.mgr, J);
            await page.goto(ctxUrl(J, '/management/settings/website')); await idle(page);
            await page.locator('#appearance-button').first().click(); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Theme', exact: true}).first().click(); await idle(page); await sleep(500);
            await snap(page, '03-journal-theme');
            fact('journalThemeTab', await formFields(page.locator('#appearance').locator('[role="tabpanel"]').filter({has: page.locator('[id^="theme-"]')}).first()));
            // baseline pages
            fact('baseline', Object.fromEntries(Object.entries(await pages('04-base', ['home', 'login', 'homeFr', 'journal', 'scratch'])).map(([k, v]) => [k, brief(v)])));
            // what the site's own theme defaults compile to: the site's style sheet links
            await signOut(page);
        }

        // ======================= roles (read-only control) =======================================
        if (on('roles')) {
            const o = {};
            for (const u of ['manager.maya', st.mgr]) {
                await as(u, u === st.mgr ? J : app.contextPath);
                let status = null;
                try { const r = await page.goto(siteSettings()); status = r ? r.status() : null; } catch (e) { status = String(e.message); }
                await idle(page);
                const s = await snap(page, `05-role-${u === st.mgr ? 'scratchmgr' : u}-site-settings`);
                o[u] = {status, url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: s.title, head: flat(s.text && s.text.main, 300), hasAppearance: await page.locator('#appearance-button').count()};
            }
            fact('roles', o);
            await signOut(page);
        }

        // ======================= theme (Rule 17, td12, A5) ========================================
        if (on('theme')) {
            await as('admin');
            await openAppearance('theme');
            const before = await themeValues();
            fact('themeBefore', before);
            const colourBefore = (before.fields.find((f) => /^Colour/.test(f.label || '')) || {texts: [{}]}).texts.map((t) => t.value);
            const typoBefore = ((before.fields.find((f) => /^Typography/.test(f.label || '')) || {}).options || []).find((o) => o.checked);
            const boolBefore = {};
            for (const f of before.fields) for (const o of f.options || []) if (o.type === 'checkbox') boolBefore[`${o.name}|${o.value}`] = o.checked;
            const radiosBefore = {};
            for (const f of before.fields) for (const o of f.options || []) if (o.type === 'radio' && o.checked) radiosBefore[o.name] = o.value;
            fact('themeBeforeCompact', {colourBefore, typoBefore, boolBefore, radiosBefore});
            const res = {};
            try {
                // (1) Colour #8B0000 and another typography
                res.colourTyped = await typeColour('#8B0000');
                const lato = themePanel().getByRole('radio', {name: /^Lato/}).first();
                if (await lato.count()) await lato.check();
                res.saveLook = await saveForm(themePanel());
                res.afterSaveSamePage = (await themeValues()).fields.filter((f) => /Colour|Typography/.test(f.label || '')).map((f) => ({label: f.label, texts: f.texts.map((t) => t.value), checked: f.options.filter((o) => o.checked).map((o) => o.label)}));
                await snap(page, '10-theme-saved-look');
                await page.reload(); await idle(page);
                await openAppearance('theme');
                res.afterReload = (await themeValues()).fields.filter((f) => /Colour|Typography/.test(f.label || '')).map((f) => ({label: f.label, texts: f.texts.map((t) => t.value), checked: f.options.filter((o) => o.checked).map((o) => o.label)}));
                await snap(page, '11-theme-reloaded-look');
                res.pagesLook = Object.fromEntries(Object.entries(await pages('12-look', ['home', 'login', 'journal', 'scratch'])).map(([k, v]) => [k, brief(v)]));
                res.adminLook = await adminVisit(siteSettings(), '13-look-admin');
                // (2) the journal-home fields: tick every box, a chart, OJS content organization changed
                const homeBefore = await visit(ctxUrl('index', ''), '14-a5-site-home-before');
                await openAppearance('theme');
                const changed = [];
                for (const f of (await themeValues()).fields) {
                    if (/Typography|Colour|^Theme/.test(f.label || '')) continue;
                    for (const o of f.options || []) {
                        if (o.type === 'checkbox') {
                            const bx = themePanel().locator(`input[type=checkbox][name="${o.name}"][value="${o.value}"]`).first();
                            await bx.setChecked(!o.checked); changed.push({field: f.label, option: o.label, to: !o.checked});
                        }
                    }
                    const radios = (f.options || []).filter((o) => o.type === 'radio');
                    if (radios.length) {
                        const target = radios.find((o) => !o.checked && /bar/i.test(o.label || o.value)) || radios.find((o) => !o.checked);
                        if (target) { await themePanel().locator(`input[type=radio][name="${target.name}"][value="${target.value}"]`).first().check(); changed.push({field: f.label, option: target.label, to: true}); }
                    }
                }
                res.a5Changed = changed;
                res.saveA5 = await saveForm(themePanel());
                await snap(page, '15-theme-saved-a5');
                await page.reload(); await idle(page); await openAppearance('theme');
                res.a5AfterReload = (await themeValues()).fields.map((f) => ({label: f.label, checked: (f.options || []).filter((o) => o.checked).map((o) => o.label)}));
                const homeAfter = await visit(ctxUrl('index', ''), '16-a5-site-home-after');
                res.a5Home = {before: brief(homeBefore), after: brief(homeAfter), sameMainText: homeBefore.mainText === homeAfter.mainText, sameMainLen: homeBefore.mainHtmlLen === homeAfter.mainHtmlLen, aboutBefore: homeBefore.about, aboutAfter: homeAfter.about};
                res.a5Login = brief(await visit(ctxUrl('index', '/login'), '17-a5-site-login-after'));
                res.a5Journal = brief(await visit(ctxUrl(J, ''), '18-a5-scratch-home-after'));
            } finally {
                // put the defaults back: the values the tab showed before
                await openAppearance('theme');
                if (colourBefore[0]) await typeColour(colourBefore[0]);
                if (typoBefore) await themePanel().locator(`input[type=radio][name="${typoBefore.name}"][value="${typoBefore.value}"]`).first().check();
                for (const [k, v] of Object.entries(boolBefore)) { const [n, val] = k.split('|'); await themePanel().locator(`input[type=checkbox][name="${n}"][value="${val}"]`).first().setChecked(v); }
                for (const [n, v] of Object.entries(radiosBefore)) await themePanel().locator(`input[type=radio][name="${n}"][value="${v}"]`).first().check();
                res.restore = await saveForm(themePanel());
                await page.reload(); await idle(page); await openAppearance('theme');
                res.restoredValues = await themeValues();
                res.restoredHome = brief(await visit(ctxUrl('index', ''), '19-theme-restored-site-home'));
                fact('theme', res);
            }
            await signOut(page);
        }

        // ======================= logo (Rule 18, td13) ============================================
        if (on('logo')) {
            await as('admin');
            await openAppearance('setup');
            const before = await boxState('pageHeaderTitleImage', 'en');
            const res = {before, beforeFr: await boxState('pageHeaderTitleImage', 'fr_CA')};
            try {
                res.up = await upload('pageHeaderTitleImage', 'en', FILES.logo);
                const alt = box('pageHeaderTitleImage', 'en').locator('input[type="text"], textarea').first();
                await loc(page, 'Site Settings › Appearance › Setup: the "Logo" box\'s "Alternate text" (en)', alt);
                await alt.fill(ALT);
                await snap(page, '20-logo-uploaded-unsaved');
                res.save = await saveForm(setupForm());
                res.afterSaveSamePage = await boxState('pageHeaderTitleImage', 'en');
                await snap(page, '21-logo-saved');
                await openAppearance('setup');
                res.afterReload = await boxState('pageHeaderTitleImage', 'en');
                await snap(page, '22-logo-reloaded');
                const p = await pages('23-logo', ['home', 'login', 'homeFr', 'journal', 'scratch']);
                res.pages = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, brief(v)]));
                res.logoUrl = p.home.siteName && p.home.siteName.img ? p.home.siteName.img.src : null;
                res.adminHeader = await adminVisit(siteSettings(), '24-logo-admin');
                // the link's destination
                if (p.home.siteName && p.home.siteName.linkHref) { const r = await vis.goto(app.url(p.home.siteName.linkHref)); res.linkLands = {status: r && r.status(), url: vis.url().replace(/^https?:\/\/[^/]+/, '')}; }
            } finally {
                await openAppearance('setup');
                const now = await boxState('pageHeaderTitleImage', 'en');
                if (now.img || (now.buttons || []).includes('Remove')) {
                    res.removed = await pressInBox('pageHeaderTitleImage', 'en', 'Remove');
                    res.saveRemoved = await saveForm(setupForm());
                    res.removedSamePage = await boxState('pageHeaderTitleImage', 'en');
                    await openAppearance('setup');
                    res.removedReload = await boxState('pageHeaderTitleImage', 'en');
                    await snap(page, '25-logo-removed-reloaded');
                }
                const p = await pages('26-logo-removed', ['home', 'login']);
                res.pagesRemoved = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, brief(v)]));
                if (res.logoUrl) { const r = await vis.request.get(app.url(res.logoUrl)).catch(() => null); res.oldLogoUrl = {url: res.logoUrl, status: r ? r.status() : null, type: r ? r.headers()['content-type'] : null}; }
                fact('logo', res);
            }
            await signOut(page);
        }

        // ======================= footer (Rule 19, td14) ==========================================
        if (on('footer')) {
            const res = {};
            // the scratch journal's own footer, set by its manager on its own screen
            if (!st.jFooter) {
                await as(st.mgr, J);
                await page.goto(ctxUrl(J, '/management/settings/website')); await idle(page);
                await page.locator('#appearance-button').first().click(); await idle(page);
                await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click(); await idle(page); await sleep(500);
                const fid = 'appearanceSetup-pageFooter-control-en';
                await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, fid, {timeout: T});
                await page.locator(`[id="${fid}_ifr"]`).contentFrame().locator('body').click();
                await page.keyboard.type(JFOOTER);
                const f = page.locator('form').filter({has: page.locator('[id^="appearanceSetup-"]')}).first();
                res.journalFooterSave = await saveForm(f);
                st.jFooter = true; saveState(app, st);
            }
            await as('admin');
            await openAppearance('setup');
            res.before = {en: await footerValue('en'), fr: await footerValue('fr_CA')};
            res.toolbar = {en: await toolbar('en'), fr: await toolbar('fr_CA')};
            res.description = await box('pageFooter', 'en').locator('.pkpFormField__description').first().innerText().catch(() => null);
            try {
                res.typed = await typeFooter(FOOTER, 'en');
                res.save = await saveForm(setupForm());
                res.samePage = await footerValue('en');
                await snap(page, '30-footer-saved');
                await openAppearance('setup');
                res.afterReload = await footerValue('en');
                await snap(page, '31-footer-reloaded');
                const p = await pages('32-footer', ['home', 'login', 'homeFr', 'journal', 'scratch']);
                res.pages = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, brief(v)]));
                res.adminFooter = await adminVisit(siteSettings(), '33-footer-admin');
            } finally {
                await openAppearance('setup');
                res.emptied = await typeFooter('', 'en');
                res.saveEmpty = await saveForm(setupForm());
                await openAppearance('setup');
                res.emptyReload = await footerValue('en');
                res.pagesEmpty = brief((await pages('34-footer-emptied', ['home'])).home);
                fact('footer', res);
            }
            await signOut(page);
        }

        // ======================= sidebar (Rule 20, td15) =========================================
        if (on('sidebar')) {
            const res = {};
            await as('admin');
            await openAppearance('setup');
            res.before = await sidebarList();
            const was = Object.fromEntries(res.before.map((o) => [o.value, o.checked]));
            const lt = res.before.find((o) => /Language Toggle/i.test(o.label));
            const openPlugins = async () => {
                await page.goto(siteSettings()); await idle(page);
                await page.locator('#plugins-button').first().click(); await idle(page); await sleep(800);
            };
            const pluginRow = (id) => page.locator(`tr.gridRow[id$="-row-${id}"]`).first();
            const setPlugin = async (id, want) => {
                await openPlugins();
                const row = pluginRow(id);
                await row.waitFor({timeout: T});
                const bx = row.getByRole('checkbox').first();
                const w0 = await bx.isChecked();
                if (w0 === want) return {was: w0, changed: false};
                const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
                await bx.click({noWaitAfter: true});
                await sleep(800);
                let ask = null;
                const dlg = page.locator('[role="dialog"]:visible').last();
                if (await dlg.count()) { ask = flat(await dlg.innerText().catch(() => ''), 300); const ok = dlg.getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click(); }
                const r = await w;
                await sleep(800); await idle(page);
                return {was: w0, changed: true, ask, status: r ? r.status() : null, now: await bx.isChecked().catch(() => null)};
            };
            let dbWas = null;
            try {
                // (1) Language Toggle Block ticked
                if (lt) await page.locator(`input[name="sidebar"][value="${lt.value}"]`).setChecked(true);
                res.save1 = await saveForm(setupForm());
                res.samePage1 = await sidebarList();
                await openAppearance('setup');
                res.reload1 = await sidebarList();
                await snap(page, '40-sidebar-lt-saved');
                const p1 = await pages('41-sidebar-lt', ['home', 'login', 'homeFr', 'journal', 'scratch']);
                res.pages1 = Object.fromEntries(Object.entries(p1).map(([k, v]) => [k, brief(v)]));
                // (2) a second block: "Developed By" Block enabled on the site's Plugins
                dbWas = await setPlugin('developedbyblockplugin', true);
                res.dbEnable = dbWas;
                await openAppearance('setup');
                res.listWithDb = await sidebarList();
                await snap(page, '42-sidebar-with-developedby');
                const db = res.listWithDb.find((o) => /developedby/i.test(o.value) || /Developed By/i.test(o.label));
                if (db) {
                    await page.locator(`input[name="sidebar"][value="${db.value}"]`).setChecked(true);
                    res.saveBoth = await saveForm(setupForm());
                    await openAppearance('setup');
                    res.listBoth = await sidebarList();
                    res.homeBoth = brief(await visit(ctxUrl('index', ''), '43-sidebar-both-home'));
                    // move the first row down (the order)
                    const firstVal = res.listBoth[0].value;
                    const down = page.locator(`input[name="sidebar"][value="${firstVal}"]`).locator('xpath=ancestor::*[contains(@class,"pkpFormField--options__option")][1]').getByRole('button', {name: /^Decrease position/}).first();
                    res.downCount = await down.count();
                    await loc(page, 'Site Settings › Appearance › Setup: a "Sidebar" row\'s "Decrease position of …" arrow', down);
                    if (res.downCount) { await down.click(); await sleep(300); }
                    res.listMoved = await sidebarList();
                    res.saveMoved = await saveForm(setupForm());
                    await openAppearance('setup');
                    res.listMovedReload = await sidebarList();
                    res.homeMoved = brief(await visit(ctxUrl('index', ''), '44-sidebar-moved-home'));
                    // (3) the Developed By plugin disabled while placed
                    res.dbDisable = await setPlugin('developedbyblockplugin', false);
                    res.homeDisabled = brief(await visit(ctxUrl('index', ''), '45-sidebar-db-disabled-home'));
                    await openAppearance('setup');
                    res.listDisabled = await sidebarList();
                    await snap(page, '46-sidebar-db-disabled-setup');
                    res.saveUntouched = await saveForm(setupForm());
                    await snap(page, '47-sidebar-db-disabled-save-untouched');
                    // enabled again: back in its place?
                    res.dbReenable = await setPlugin('developedbyblockplugin', true);
                    await openAppearance('setup');
                    res.listReenabled = await sidebarList();
                    res.homeReenabled = brief(await visit(ctxUrl('index', ''), '48-sidebar-db-reenabled-home'));
                }
            } finally {
                await openAppearance('setup');
                for (const o of await sidebarList()) await page.locator(`input[name="sidebar"][value="${o.value}"]`).setChecked(!!was[o.value]);
                res.saveRestore = await saveForm(setupForm());
                await openAppearance('setup');
                res.restored = await sidebarList();
                if (dbWas && dbWas.changed) res.dbRestore = await setPlugin('developedbyblockplugin', dbWas.was);
                await openAppearance('setup');
                res.restoredFinal = await sidebarList();
                res.homeRestored = brief(await visit(ctxUrl('index', ''), '49-sidebar-restored-home'));
                fact('sidebar', res);
            }
            await signOut(page);
        }

        // ======================= style sheet (Rule 21, td16, A6, OMP1) ============================
        if (on('css')) {
            const res = {};
            await as('admin');
            await openAppearance('setup');
            res.before = await boxState('styleSheet', null);
            try {
                // the other end first: a file that does not end in .css
                res.notCss = await upload('styleSheet', null, FILES.notCss);
                await snap(page, '50-css-not-css');
                await openAppearance('setup');
                res.up = await upload('styleSheet', null, FILES.css);
                await snap(page, '51-css-uploaded-unsaved');
                res.save = await saveForm(setupForm());
                res.samePage = await boxState('styleSheet', null);
                await snap(page, '52-css-saved');
                await openAppearance('setup');
                res.afterReload = await boxState('styleSheet', null);
                await snap(page, '53-css-reloaded');
                const p = await pages('54-css', ['home', 'login', 'journal', 'journalAbout', 'scratch']);
                res.pages = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, brief(v)]));
                res.order = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.stylesheets]));
                res.admin = await adminVisit(siteSettings(), '55-css-admin-site-settings');
                res.dashboard = await adminVisit(ctxUrl(app.contextPath, '/dashboard/editorial'), '56-css-journal-dashboard');
                const href = Object.values(p).map((v) => v.siteSheet && v.siteSheet[0]).find(Boolean) || (res.afterReload.links[0] || {}).href || null;
                res.sheetUrl = href;
                const guess = href || '/public/site/sitestylesheet.css';
                const r = await vis.request.get(app.url(guess.split('?')[0])).catch(() => null);
                res.sheetOpens = {url: guess, status: r ? r.status() : null, body: r ? flat(await r.text(), 120) : null};
                res.onDisk = fs.readdirSync(path.join(app.root, 'public', 'site')).filter((f) => /css|sheet/i.test(f));
            } finally {
                await openAppearance('setup');
                const now = await boxState('styleSheet', null);
                if ((now.buttons || []).includes('Remove')) {
                    res.removed = await pressInBox('styleSheet', null, 'Remove');
                    res.saveRemoved = await saveForm(setupForm());
                    res.removedSamePage = await boxState('styleSheet', null);
                    await openAppearance('setup');
                    res.removedReload = await boxState('styleSheet', null);
                    await snap(page, '57-css-removed-reloaded');
                }
                const p = await pages('58-css-removed', ['home', 'journal']);
                res.pagesRemoved = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, brief(v)]));
                const u = (res.sheetUrl || '/public/site/sitestylesheet.css').split('?')[0];
                const r = await vis.request.get(app.url(u)).catch(() => null);
                res.oldAddress = {url: u, status: r ? r.status() : null, body: r ? flat(await r.text(), 120) : null};
                res.onDiskAfter = fs.readdirSync(path.join(app.root, 'public', 'site')).filter((f) => /css|sheet/i.test(f));
                fact('css', res);
            }
            await signOut(page);
        }

        // ======================= leave with an unsaved change ======================================
        if (on('leave')) {
            const res = {};
            await as('admin');
            await openAppearance('setup');
            const n0 = asked.length;
            await typeFooter('Unsaved U60 K3 footer', 'en');
            await page.locator('#appearance').getByRole('tab', {name: 'Theme', exact: true}).first().click(); await idle(page); await sleep(400);
            res.sideTabSwitch = asked.slice(n0);
            await snap(page, '60-leave-switch-to-theme');
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click(); await idle(page); await sleep(400);
            res.footerAfterSwitchBack = await footerValue('en');
            await page.locator('#setup-button').first().click(); await idle(page); await sleep(300);
            res.topTabSwitch = asked.slice(n0);
            await page.goto(ctxUrl('index', '/admin/contexts')).catch((e) => { res.gotoErr = String(e.message); });
            await idle(page);
            res.leaveDialogs = asked.slice(n0);
            await openAppearance('setup');
            res.footerAfterLeave = await footerValue('en');
            // the Theme tab: colour changed, leave
            const n1 = asked.length;
            await openAppearance('theme');
            const colour0 = (await fieldByLabel(themePanel(), /^Colour/).locator('input').first().inputValue().catch(() => null));
            await typeColour('#004400');
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click(); await idle(page);
            await page.goto(ctxUrl('index', '/admin/contexts')).catch((e) => { res.gotoErr2 = String(e.message); });
            await idle(page);
            res.themeLeaveDialogs = asked.slice(n1);
            await openAppearance('theme');
            res.colourAfterLeave = {before: colour0, now: await fieldByLabel(themePanel(), /^Colour/).locator('input').first().inputValue().catch(() => null)};
            fact('leave', res);
            await signOut(page);
        }

        // ======================= sweep: "Remove" then "Restore Original" on a saved logo and sheet ======
        if (on('restoreorig')) {
            const res = {};
            await as('admin');
            await openAppearance('setup');
            try {
                await upload('pageHeaderTitleImage', 'en', FILES.logo);
                await box('pageHeaderTitleImage', 'en').locator('input[type="text"], textarea').first().fill(ALT);
                await upload('styleSheet', null, FILES.css);
                res.save = await saveForm(setupForm());
                await openAppearance('setup');
                res.saved = {logo: await boxState('pageHeaderTitleImage', 'en'), css: await boxState('styleSheet', null)};
                res.logoRemoved = await pressInBox('pageHeaderTitleImage', 'en', 'Remove');
                res.logoRestored = await pressInBox('pageHeaderTitleImage', 'en', 'Restore Original');
                res.cssRemoved = await pressInBox('styleSheet', null, 'Remove');
                res.cssRestored = await pressInBox('styleSheet', null, 'Restore Original');
                await snap(page, '65-restore-original');
                res.saveRestored = await saveForm(setupForm());
                await openAppearance('setup');
                res.afterReload = {logo: await boxState('pageHeaderTitleImage', 'en'), css: await boxState('styleSheet', null)};
                res.home = brief(await visit(ctxUrl('index', ''), '66-restore-original-home'));
            } finally {
                await openAppearance('setup');
                for (const [f, l] of [['pageHeaderTitleImage', 'en'], ['styleSheet', null]]) {
                    const now = await boxState(f, l);
                    if ((now.buttons || []).includes('Remove')) await pressInBox(f, l, 'Remove');
                }
                res.cleanup = await saveForm(setupForm());
                await openAppearance('setup');
                res.final = {logo: await boxState('pageHeaderTitleImage', 'en'), css: await boxState('styleSheet', null)};
                fact('restoreorig', res);
            }
            await signOut(page);
        }

        // ======================= named: "Logo" over a Site Name (Rule 18's other end) ================
        // Sets the Site Name ("Site Setup" › "Settings", K1's tab) through the harness key, so run it
        // only while no other agent drives that tab; it puts back the name the tab showed. NAMED_SET=0
        // leaves the Site Name alone and reads the header over whatever name the site has.
        if (on('named')) {
            const res = {};
            await as('admin');
            await page.goto(siteSettings()); await idle(page);
            await page.getByRole('tab', {name: 'Settings', exact: true}).first().click(); await idle(page); await sleep(400);
            res.nameBefore = {en: await page.locator('[id$="-title-control-en"]').first().inputValue().catch(() => null), fr_CA: await page.locator('[id$="-title-control-fr_CA"]').first().inputValue().catch(() => null)};
            try {
                if (process.env.NAMED_SET !== '0') res.setName = await app.api.setSite({title: {en: 'U60 K3 Named Site', fr_CA: ''}});
                res.nameOnly = brief(await visit(ctxUrl('index', ''), '70-named-no-logo-home'));
                await openAppearance('setup');
                res.up = await upload('pageHeaderTitleImage', 'en', FILES.logo);
                await box('pageHeaderTitleImage', 'en').locator('input[type="text"], textarea').first().fill(ALT);
                res.save = await saveForm(setupForm());
                const p = await pages('71-named-logo', ['home', 'login']);
                res.withLogo = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, {...brief(v), title: v.title, html: v.siteName && v.siteName.html}]));
            } finally {
                await openAppearance('setup');
                const now = await boxState('pageHeaderTitleImage', 'en');
                if ((now.buttons || []).includes('Remove')) { await pressInBox('pageHeaderTitleImage', 'en', 'Remove'); res.saveRemoved = await saveForm(setupForm()); }
                const h = await visit(ctxUrl('index', ''), '72-named-logo-removed-home');
                res.removed = {...brief(h), title: h.title, html: h.siteName && h.siteName.html};
                const back = res.nameBefore && res.nameBefore.en ? {en: res.nameBefore.en, fr_CA: res.nameBefore.fr_CA || ''} : '';
                if (process.env.NAMED_SET !== '0') res.nameRestore = await app.api.setSite({title: back}).catch((e) => String(e.message));
                fact('named', res);
            }
            await signOut(page);
        }

        // ======================= final (the tabs as the script found them) ========================
        if (on('final')) {
            await as('admin');
            await openAppearance('theme');
            const th = await themeValues();
            await openAppearance('setup');
            fact('final', {theme: th.fields.map((f) => ({label: f.label, texts: (f.texts || []).map((t) => t.value), checked: (f.options || []).filter((o) => o.checked).map((o) => o.label), selects: f.selects})), setup: await setupValues()});
            await snap(page, '99-final-setup');
            await signOut(page);
        }
    } catch (e) {
        fact('ERROR', String(e.stack || e).slice(0, 1500));
        await shot(page, 'error').catch(() => {});
        throw e;
    } finally {
        fact('dialogs', asked);
        await vis.context().close().catch(() => {});
        await close();
    }
});
