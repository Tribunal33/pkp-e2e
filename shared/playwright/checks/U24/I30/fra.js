// U24 claim check, chunk I30 FRa (housekeeping 2026-09-30): the workflow's publication pages and the
// "Create New Version" window in the French interface (/fr_CA/), with the same reads in English as control.
// Chunk: .reports/hk30/chunks/FRa.md (incidentals rows R5 and R7: U42, U43, U47, U48, U40, U73).
//
//   R5      U49 "Create New Version" window: on a published (staged) version and on a never-published
//           (stage-less) one, en and fr_CA; confirmed once each in fr_CA, then re-opened with two versions.
//   R7-U42  "References" page: empty and populated; "Add" (fr), a row's "…" › "Edit" window, "Delete all
//           references" dialog (cancelled).
//   R7-U43  "Funding" page: empty; "Add Funder" window, a typed funder saved (fr; the ROR registry query is
//           answered empty in the browser, as the suites do), list read after save and after reload; a row's
//           "…" menu, "Edit" window and "Delete" dialog (cancelled).
//   R7-U47  "Media" page: empty and populated; "Add Media File", "Batch Link Media", a row's "…" menu, its
//           "Edit Metadata", "Manually Link Media" and "More Information" windows (all cancelled/closed).
//   R7-U48  (OJS) "JATS XML" (auto-created and uploaded; "More Information", "Delete" and "Make available with
//           publication" dialogs cancelled) and "Body Text" (read; left with a change unsaved).
//   R7-U40  Permissions & Disclosure (left with a change unsaved), OJS Publication Settings, OMP Catalog Entry,
//           OPS Preprint Entry; the published-version banner (all apps; OPS "posted").
//   R7-U73  (OMP) "Publication Formats": empty and populated; "Add publication format" window (cancelled).
//
// One scratch context per app and run (tag fri30a<run>…), UI languages en + fr_CA, users mgr (manager) and au
// (author, the submitter). Submissions: P production, nothing on its lists; F production with references, a
// media file, OJS an uploaded JATS file, OMP a publication format; D the same, published.
//   ver2    (A11's axis) on F, never published: "Create New Version" with the first stage chosen, fr_CA; the menu in fr_CA and en.
//   extra   the other ends: media "Delete File" dialog; funding "Order" mode; OJS JATS box ticked, then the disable dialog.
// Phases (PHASES=seed,mgr,fund,au,leave,ver,ver2,extra; default all; seed must run first in a run):
//   PROBE_RUN=r1 PROBE_FEATURE=U24 PROBE_AGENT=ccI30fra node bin/probe.js all shared/playwright/checks/U24/I30/fra.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outFile, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,mgr,fund,au,leave,ver,ver2,extra').split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- locale labels (locators only, never claims)
const unq = (x) => x.replace(/\\(.)/g, (m, c) => ({n: '\n', t: '\t', '"': '"', '\\': '\\'}[c] !== undefined ? {n: '\n', t: '\t', '"': '"', '\\': '\\'}[c] : c));
function parsePo(file, into) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let id = null; let str = null; let mode = null;
    const flush = () => { if (id && str) into[id] = str; id = null; str = null; };
    for (const ln of lines) {
        let m;
        if ((m = ln.match(/^msgid "(.*)"$/))) { flush(); id = unq(m[1]); mode = 'id'; str = null; } else if ((m = ln.match(/^msgstr "(.*)"$/))) { str = unq(m[1]); mode = 'str'; } else if ((m = ln.match(/^"(.*)"$/))) {
            const v = unq(m[1]);
            if (mode === 'id') id += v; else if (mode === 'str') str += v;
        }
    }
    flush();
}
const LOCALES = {};
function locales(app) {
    if (LOCALES[app.name]) return LOCALES[app.name];
    const out = {en: {}, fr_CA: {}};
    for (const lc of ['en', 'fr_CA']) {
        for (const dir of [path.join(app.root, 'lib/pkp/locale', lc), path.join(app.root, 'locale', lc)]) {
            if (!fs.existsSync(dir)) continue;
            for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.po'))) parsePo(path.join(dir, f), out[lc]);
        }
    }
    return (LOCALES[app.name] = out);
}

// ---------------------------------------------------------------- in-page helpers
// Every "##key##" on the page, text and every attribute, with where it sits: frame parts of the workflow
// dialog (wf-header, wf-menu, wf-heading, wf-controls-*), the page body (wf-primary / wf-secondary /
// wf-actions), an inner window over it (window), or outside the workflow dialog.
const rawKeys = (page) => page.evaluate(() => {
    const re = /##[^#\s]+##/g;
    const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
    const wf = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    const where = (e) => {
        const d = e.closest('[role=dialog], [role=alertdialog], .pkp_modal_panel');
        if (d && wf && d !== wf && !d.contains(wf)) return 'window';
        if (e.closest('[role=menu]') && !(wf && wf.contains(e.closest('[role=menu]')))) return 'menu-popup';
        if (wf && wf.contains(e)) {
            if (e.closest('[data-cy="sidemodal-header"]')) return 'wf-header';
            if (e.closest('nav')) return 'wf-menu';
            if (e.closest('[data-cy="workflow-controls-left"]')) return 'wf-controls-left';
            if (e.closest('[data-cy="workflow-controls-right"]')) return 'wf-controls-right';
            const h2 = e.closest('.pkp-modal-scroll-container h2');
            if (h2 && h2 === wf.querySelector('.pkp-modal-scroll-container h2')) return 'wf-heading';
            if (e.closest('[data-cy="workflow-primary-items"]')) return 'wf-primary';
            if (e.closest('[data-cy="workflow-secondary-items"]')) return 'wf-secondary';
            if (e.closest('[data-cy="workflow-action-items"]')) return 'wf-actions';
            return 'wf-other';
        }
        if (d) return 'dialog-other';
        if (e.closest('header')) return 'top-header';
        if (e.closest('nav')) return 'side-nav';
        return 'page';
    };
    const found = new Set();
    const add = (text, el, how) => { for (const k of String(text).match(re) || []) found.add(`${k} @ ${where(el)} (${how}${vis(el) ? '' : ', hidden'})`); };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const p = n.parentElement;
        if (p && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) add(n.nodeValue, p, 'text');
    }
    for (const el of document.body.querySelectorAll('*')) {
        for (const a of el.attributes) if (!a.name.startsWith('data-v-') && a.name !== 'data-fri30a') add(a.value, el, a.name);
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value) add(el.value, el, 'value');
    }
    for (const k of document.title.match(re) || []) found.add(`${k} @ <title>`);
    return [...found];
}).catch(() => null);

const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    if (!root) return {panel: false};
    const header = root.querySelector('[data-cy="sidemodal-header"]');
    const nav = root.querySelector('nav');
    const menu = (nav ? [...nav.querySelectorAll('a')] : []).map((a) => {
        const cls = a.className || '';
        let level = 1;
        if (/!px-(7|9)\b/.test(cls)) level = 2;
        if (/!px-(10|12)\b/.test(cls)) level = 3;
        if (/!px-(14|16)\b/.test(cls)) level = 4;
        return {t: (a.textContent || '').trim().replace(/\s+/g, ' '), level, visible: vis(a), selected: /bg-selection-dark/.test(cls)};
    });
    const prim = root.querySelector('[data-cy="workflow-primary-items"]');
    const windows = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !d.contains(root) && vis(d));
    return {
        panel: true,
        headerText: txt(header),
        heading: txt(root.querySelector('.pkp-modal-scroll-container h2')),
        controlsLeft: txt(root.querySelector('[data-cy="workflow-controls-left"]')),
        controlsRight: txt(root.querySelector('[data-cy="workflow-controls-right"]')),
        primary: prim ? txt(prim).slice(0, 1500) : null,
        menu,
        windows: windows.map((d) => txt(d).slice(0, 1200)),
    };
}).catch((e) => ({error: String(e.message)}));

const menuShape = (info) => (info.menu || []).map((m) => `${'  '.repeat(m.level - 1)}${m.t}${m.visible ? '' : ' (hidden)'}${m.selected ? ' [sel]' : ''}`);
const windowCount = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    return [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !(root && d.contains(root)) && vis(d)).length;
}).catch(() => 0);

// Mark the first visible control whose text or aria-label matches `src` inside a scope, return its text.
// scope: 'wf' (the workflow dialog's page body), 'win' (the topmost inner window), 'doc' (the document).
const markLabel = (page, src, scope, sel) => page.evaluate(([src, scope, sel]) => {
    document.querySelectorAll('[data-fri30a]').forEach((e) => e.removeAttribute('data-fri30a'));
    const re = new RegExp(src);
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    let within = document;
    if (scope === 'wf') within = root ? (root.querySelector('.pkp-modal-scroll-container') || root) : document;
    if (scope === 'win') {
        const ws = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !(root && d.contains(root)) && vis(d));
        within = ws[ws.length - 1];
        if (!within) return null;
    }
    const cands = [...within.querySelectorAll(sel || 'button, a, [role=menuitem], [role=button], label')].filter(vis);
    for (const e of cands) {
        const t = (e.innerText || '').trim().replace(/\s+/g, ' ');
        const a = (e.getAttribute('aria-label') || '').trim();
        if (re.test(t) || re.test(a)) { e.setAttribute('data-fri30a', '1'); return t || a; }
    }
    return null;
}, [src, scope, sel || null]).catch(() => null);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const LOC = locales(app);
    // A label as a regex: the English text, the French text, or the raw key.
    const L = (...keys) => {
        const alts = [];
        for (const k of keys) { for (const v of [LOC.en[k], LOC.fr_CA[k], `##${k}##`]) if (v) alts.push(esc(v.replace(/\s+/g, ' ').trim())); }
        return `^\\s*(${[...new Set(alts)].join('|')})\\s*$`;
    };
    const seedFile = outFile('seed.json');
    let seed;

    if (on('seed')) {
        const t = tag(`fri30a${RUN}`);
        const u = (k) => `${t}${k}`;
        await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`, supportedLocales: ['en', 'fr_CA']},
            users: [{username: u('mgr'), roles: ['manager']}, {username: u('au'), roles: ['author']}]});
        const subs = {};
        const prod = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
        const content = {
            citationsRaw: ['Doe, J. (2020). A first seeded reference. Journal of Tests, 1(2), 3-4.', 'Roe, R. (2021). A second seeded reference. Press of Probes.'],
            mediaFiles: [{file: 'figure.png'}],
            ...(isOJS ? {jats: {file: 'article.xml'}} : {}),
            ...(isOMP ? {publicationFormats: [{name: 'PDF fri30a'}]} : {}),
        };
        const mk = async (k, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `${k} fri30a ${t}`, ...spec});
                subs[k] = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId};
            } catch (e) { subs[k] = {error: String(e.message).slice(0, 600)}; }
            log(app.name, 'seed', k, JSON.stringify(subs[k]));
        };
        await mk('P', {...prod});
        await mk('F', {...prod, ...content});
        await mk('D', {...content, published: true});
        seed = {context: t, mgr: u('mgr'), au: u('au'), subs};
        fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2));
        note(`I30 FRa [${app.name}] ${RUN}: scratch context ${t} (UI en + fr_CA), users ${u('mgr')} (manager), ${u('au')} (author); subs ${Object.entries(subs).map(([k, v]) => `${k}=${v.id}/pub ${v.pub}`).join(' ')}`);
    }
    if (!PHASES.some((p) => p !== 'seed')) return;
    seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const t = seed.context;
    const S = seed.subs;
    const base = (lang, who) => app.url(`/index.php/${t}/${lang}/dashboard/${who === 'au' ? 'mySubmissions' : 'editorial'}`);
    const wfURL = (lang, who, k, pageName, pub) => `${base(lang, who)}?workflowSubmissionId=${S[k].id}${pageName ? `&workflowMenuKey=publication_${pub || S[k].pub}_${pageName}` : ''}`;

    const {page, close} = await launch(app);
    const errs = []; const bad = []; const browserDialogs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), console: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), pageerror: String(e.message).slice(0, 300)}));
    page.on('response', (r) => { if (r.status() >= 400) bad.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220)}); });
    page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message().slice(0, 200), at: page.url().replace(/^https?:\/\/[^/]+/, '')}); await d.accept().catch(() => {}); });
    // The Funder field's browser-side registry query, answered empty (FundingPages.stubRegistrySearch).
    await page.route('https://api.ror.org/**', (route) => route.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({items: []})}));

    const facts = {};
    const fact = (k, v) => { facts[k] = v; log(app.name, k, JSON.stringify(v).slice(0, 900)); };
    async function sect(name, fn) {
        try { await fn(); } catch (e) { log(`[${app.name} ${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); fact(`${name}:FAILED`, String(e.stack || e).slice(0, 1200)); }
    }
    async function stable(timeout = 15000) {
        const end = Date.now() + timeout;
        let last = null;
        while (Date.now() < end) {
            const now = await page.evaluate(() => {
                const r = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"]'));
                const ws = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d.getClientRects().length);
                return `${r ? r.innerText.length : -1}|${ws.map((w) => w.innerText.length).join(',')}|${/Loading|Chargement|Refreshing|pkpSpinner/.test(document.body.innerText) ? 'L' : ''}`;
            }).catch(() => null);
            if (now && now === last && !now.endsWith('L')) return true;
            last = now;
            await page.waitForTimeout(700);
        }
        return false;
    }
    async function settle() {
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 25000}).catch(() => {});
        await idle(page); await stable(); await idle(page);
    }
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        const info = await wfInfo(page);
        const raw = await rawKeys(page);
        record(`${label}`, {...s, info, rawKeys: raw, ...(extra || {})});
        await shot(page, `${label}`).catch(() => {});
        return {info, raw};
    }
    const split = (raw) => {
        const vis = (raw || []).filter((r) => !/hidden\)$/.test(r));
        return {
            frame: vis.filter((r) => /@ (wf-header|wf-menu|wf-heading|<title>|top-header|side-nav)/.test(r)),
            controls: vis.filter((r) => /@ wf-controls/.test(r)),
            body: vis.filter((r) => /@ (wf-primary|wf-secondary|wf-actions|wf-other)/.test(r)),
            window: vis.filter((r) => /@ (window|menu-popup|dialog-other)/.test(r)),
            other: vis.filter((r) => /@ page/.test(r)),
            hidden: (raw || []).filter((r) => /hidden\)$/.test(r)),
        };
    };
    const mark = () => ({e0: errs.length, b0: bad.length, d0: browserDialogs.length});
    const since = (m) => ({errors: errs.slice(m.e0).length ? errs.slice(m.e0) : undefined, bad: bad.slice(m.b0).length ? bad.slice(m.b0) : undefined, browserDialogs: browserDialogs.slice(m.d0).length ? browserDialogs.slice(m.d0) : undefined});

    async function readPage(label, u_) {
        const m = mark();
        await page.goto(u_); await settle();
        const {info, raw} = await snap(label);
        return {heading: info.heading, left: flat(info.controlsLeft, 200), right: flat(info.controlsRight, 200), body: flat(info.primary, 700), keys: split(raw), ...since(m)};
    }
    // Press a control (label regex, scope) and read the window it opens, then leave it by Cancel/Close.
    async function openWindow(label, src, scope = 'wf', {sel, keep = false, leave} = {}) {
        const m = mark();
        const before = await windowCount(page);
        const pressedText = await markLabel(page, src, scope, sel);
        if (!pressedText) return {absent: true, src};
        await page.locator('[data-fri30a]').first().click({timeout: 10000});
        const end = Date.now() + 15000;
        while (Date.now() < end && (await windowCount(page)) <= before) await page.waitForTimeout(300);
        await idle(page); await stable(); await idle(page);
        const {info, raw} = await snap(label);
        const out = {pressed: pressedText, window: info.windows && info.windows.length ? flat(info.windows[info.windows.length - 1], 1000) : null, keys: split(raw)};
        if (!keep) out.left = await leaveWindow(leave);
        Object.assign(out, since(m));
        return out;
    }
    async function leaveWindow(src) {
        const want = src || L('common.cancel', 'common.close');
        let t_ = await markLabel(page, want, 'win');
        if (!t_) t_ = await markLabel(page, L('common.close', 'common.cancel'), 'win', 'button[aria-label], a.pkpModalCloseButton, button');
        if (t_) await page.locator('[data-fri30a]').first().click({timeout: 8000}).catch(() => {});
        await page.waitForTimeout(1500); await idle(page);
        return t_;
    }
    async function rowMenu(label, rowSel) {
        // Open the first row's "More Actions" menu, read it, close it by pressing its button again.
        const m = mark();
        const btn = page.locator(`${rowSel} button`).filter({has: page.locator('svg')}).first();
        const t_ = await markLabel(page, L('common.moreActions'), 'wf', 'button');
        if (!t_) return {absent: true};
        await page.locator('[data-fri30a]').first().click({timeout: 8000});
        await page.waitForTimeout(600);
        const items = await page.getByRole('menuitem').evaluateAll((es) => es.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()));
        const {raw} = await snap(label);
        return {button: t_, items, keys: split(raw), ...since(m), _btn: btn};
    }
    async function menuItem(src) {
        const t_ = await markLabel(page, src, 'doc', '[role=menuitem]');
        if (t_) await page.locator('[data-fri30a]').first().click({timeout: 8000});
        return t_;
    }
    // A row's "More Actions" menu read, then one of its items pressed and the window it opens read and left.
    async function rowItemWindow(label, itemKeys) {
        const r = await rowMenu(`${label}-rowmenu`, 'table tbody tr');
        if (r.absent) return r;
        delete r._btn;
        const m = mark();
        const before = await windowCount(page);
        const it = await menuItem(L(...itemKeys));
        if (!it) return {menuItems: r.items, menuKeys: r.keys, item: 'absent'};
        const end = Date.now() + 15000;
        while (Date.now() < end && (await windowCount(page)) <= before) await page.waitForTimeout(300);
        await idle(page); await stable(); await idle(page);
        const {info, raw} = await snap(`${label}-window`);
        const out = {menuItems: r.items, menuKeys: r.keys, item: it, window: info.windows && info.windows.length ? flat(info.windows[info.windows.length - 1], 1000) : null, keys: split(raw)};
        out.left = await leaveWindow();
        return Object.assign(out, since(m));
    }
    async function asUser(who) { await signIn(page, seed[who], {contextPath: t}); await idle(page); }

    const mgrPages = isOJS ? ['citations', 'funding', 'media', 'jats', 'bodyText', 'license', 'issue']
        : isOMP ? ['citations', 'funding', 'media', 'publicationFormats', 'catalogEntry', 'license']
            : ['citations', 'funding', 'media', 'license', 'preprintEntry'];
    const listPages = ['citations', 'funding', 'media', ...(isOJS ? ['jats', 'bodyText'] : []), ...(isOMP ? ['publicationFormats'] : [])];

    try {
        // ------------------------------------------------------------ mgr: every surface, fr_CA then en
        if (on('mgr')) await sect('mgr', async () => {
            await asUser('mgr');
            for (const lang of ['fr_CA', 'en']) {
                for (const k of ['P', 'F', 'D']) {
                    const pages = k === 'P' ? listPages : mgrPages;
                    for (const pg of pages) fact(`mgr:${lang}:${k}:${pg}`, await readPage(`mgr-${lang}-${k}-${pg}`, wfURL(lang, 'mgr', k, pg)));
                }
                // windows on F
                const W = {};
                await page.goto(wfURL(lang, 'mgr', 'F', 'citations')); await settle();
                W.citEdit = await rowItemWindow(`mgr-${lang}-F-citations`, ['common.edit']);
                await page.goto(wfURL(lang, 'mgr', 'F', 'citations')); await settle();
                W.citDeleteAll = await openWindow(`mgr-${lang}-F-citations-deleteall`, L('submission.citations.structured.deleteAllLink'), 'wf');
                await page.goto(wfURL(lang, 'mgr', 'F', 'funding')); await settle();
                W.addFunder = await openWindow(`mgr-${lang}-F-funding-add`, L('submission.funders.action.addFunder'), 'wf');
                await page.goto(wfURL(lang, 'mgr', 'F', 'media')); await settle();
                W.addMedia = await openWindow(`mgr-${lang}-F-media-add`, L('publication.mediaFiles.add'), 'wf');
                await page.goto(wfURL(lang, 'mgr', 'F', 'media')); await settle();
                W.batchLink = await openWindow(`mgr-${lang}-F-media-batch`, L('publication.mediaFiles.batchLinkMedia'), 'wf');
                for (const [nm, keys] of [['editmeta', ['grid.action.editMetadata', 'submission.editMetadata']], ['manuallink', ['publication.mediaFiles.manuallyLinkMedia', 'publication.mediaFiles.manualLinkMedia', 'publication.mediaFiles.manuallyLink']], ['moreinfo', ['grid.action.moreInformation']]]) {
                    await page.goto(wfURL(lang, 'mgr', 'F', 'media')); await settle();
                    W[`media-${nm}`] = await rowItemWindow(`mgr-${lang}-F-media-${nm}`, keys);
                }
                if (isOJS) {
                    await page.goto(wfURL(lang, 'mgr', 'F', 'jats')); await settle();
                    W.jatsInfo = await openWindow(`mgr-${lang}-F-jats-moreinfo`, L('grid.action.moreInformation'), 'wf');
                    await page.goto(wfURL(lang, 'mgr', 'F', 'jats')); await settle();
                    W.jatsDelete = await openWindow(`mgr-${lang}-F-jats-delete`, L('common.delete'), 'wf', {sel: 'button'});
                    await page.goto(wfURL(lang, 'mgr', 'F', 'jats')); await settle();
                    W.jatsPublic = await openWindow(`mgr-${lang}-F-jats-makepublic`, L('publication.jats.makePublic'), 'wf', {sel: 'label, input[type=checkbox], button'});
                }
                if (isOMP) {
                    await page.goto(wfURL(lang, 'mgr', 'F', 'publicationFormats')); await settle();
                    W.addFormat = await openWindow(`mgr-${lang}-F-formats-add`, L('grid.action.addFormat'), 'wf', {sel: 'a, button'});
                }
                fact(`mgr:${lang}:F:windows`, W);
            }
        });

        // ------------------------------------------------------------ fund: a funder added in French (F), read back
        if (on('fund')) await sect('fund', async () => {
            await asUser('mgr');
            const lang = 'fr_CA';
            await page.goto(wfURL(lang, 'mgr', 'F', 'funding')); await settle();
            const m = mark();
            const w = await openWindow(`fund-${lang}-add-open`, L('submission.funders.action.addFunder'), 'wf', {keep: true});
            const panel = page.locator('[role=dialog]').filter({has: page.locator('.pkpFormField--funder')}).last();
            await loc(page, 'Add Funder window (fr_CA): the funder search box', panel.locator('input.pkpAutosuggest__input'));
            const name = `Fondation fri30a ${RUN}`;
            const search = panel.locator('input.pkpAutosuggest__input');
            await search.click(); await search.pressSequentially(name, {delay: 15});
            await page.waitForTimeout(1200);
            const sugg = await snap(`fund-${lang}-suggestions`);
            await panel.locator('li.autosuggest__results-item').filter({hasText: name}).first().click({timeout: 8000}).catch((e) => log('pick failed', e.message.slice(0, 100)));
            await page.waitForTimeout(800); await idle(page);
            const boxes = panel.locator('input[name="name"]');
            const nBoxes = await boxes.count();
            const picked = await snap(`fund-${lang}-picked`);
            const saveRe = L('common.save');
            const st = await markLabel(page, saveRe, 'win', 'button');
            const saved = page.waitForResponse((r) => r.url().includes('/funders') && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
            if (st) await page.locator('[data-fri30a]').first().click();
            const resp = await saved;
            await page.waitForTimeout(1500); await idle(page); await stable();
            const after = await snap(`fund-${lang}-after-save`);
            await page.reload(); await settle();
            const reload = await snap(`fund-${lang}-after-reload`);
            // the row's menu, its Edit window and Delete dialog (cancelled), both languages
            const rows = {};
            for (const l2 of ['fr_CA', 'en']) {
                await page.goto(wfURL(l2, 'mgr', 'F', 'funding')); await settle();
                const r = await rowMenu(`fund-${l2}-rowmenu`, 'table tbody tr'); delete r._btn;
                if (!r.absent) {
                    const before = await windowCount(page);
                    await menuItem(L('common.edit'));
                    const end = Date.now() + 15000; while (Date.now() < end && (await windowCount(page)) <= before) await page.waitForTimeout(300);
                    await idle(page); await stable();
                    const e = await snap(`fund-${l2}-edit`);
                    r.edit = {window: e.info.windows && flat(e.info.windows.slice(-1)[0], 1000), keys: split(e.raw)};
                    r.edit.left = await leaveWindow();
                    await page.goto(wfURL(l2, 'mgr', 'F', 'funding')); await settle();
                    await rowMenu(`fund-${l2}-rowmenu2`, 'table tbody tr');
                    const b2 = await windowCount(page);
                    await menuItem(L('common.delete'));
                    const end2 = Date.now() + 10000; while (Date.now() < end2 && (await windowCount(page)) <= b2) await page.waitForTimeout(300);
                    const d = await snap(`fund-${l2}-delete`);
                    r.del = {window: d.info.windows && flat(d.info.windows.slice(-1)[0], 600), keys: split(d.raw)};
                    r.del.left = await leaveWindow();
                }
                rows[l2] = r;
            }
            fact('fund:fr_CA', {window: w, suggestionsKeys: split(sugg.raw), nameBoxes: nBoxes, pickedWindow: picked.info.windows && flat(picked.info.windows.slice(-1)[0], 1200), pickedKeys: split(picked.raw),
                saveButton: st, saveStatus: resp && resp.status(), afterSave: {body: flat(after.info.primary, 600), windows: after.info.windows, keys: split(after.raw)},
                afterReload: {body: flat(reload.info.primary, 600), keys: split(reload.raw)}, rows, ...since(m)});
        });

        // ------------------------------------------------------------ au: the Author, fr_CA then en
        if (on('au')) await sect('au', async () => {
            await asUser('au');
            const auPages = ['citations', 'funding', 'media', ...(isOMP ? ['publicationFormats'] : [])];
            for (const lang of ['fr_CA', 'en']) {
                for (const k of ['F', 'D']) {
                    fact(`au:${lang}:${k}:landing`, await readPage(`au-${lang}-${k}-landing`, wfURL(lang, 'au', k)));
                    const info = await wfInfo(page);
                    facts[`au:${lang}:${k}:landing`].menu = menuShape(info);
                    for (const pg of auPages) fact(`au:${lang}:${k}:${pg}`, await readPage(`au-${lang}-${k}-${pg}`, wfURL(lang, 'au', k, pg)));
                }
            }
        });

        // ------------------------------------------------------------ leave: a page left with a change unsaved (fr_CA, F)
        if (on('leave')) await sect('leave', async () => {
            await asUser('mgr');
            const lang = 'fr_CA';
            for (const pg of ['license', 'citations', ...(isOJS ? ['bodyText'] : [])]) await sect(`leave-${pg}`, async () => {
                await page.goto(wfURL(lang, 'mgr', 'F', pg)); await settle();
                const m = mark();
                let box; let kind;
                if (pg === 'bodyText') { box = page.locator('[data-cy="workflow-primary-items"] [contenteditable="true"]').first(); kind = 'editor'; } else { box = page.locator('[data-cy="workflow-primary-items"] input[type="text"]:visible:enabled, [data-cy="workflow-primary-items"] textarea:visible:enabled').first(); kind = 'box'; }
                const had = await box.count();
                const val = async () => (kind === 'editor' ? box.innerText().catch(() => null) : box.inputValue().catch(() => null));
                const before = had ? await val() : null;
                if (had) {
                    if (kind === 'editor') { await box.click(); await page.keyboard.type(' fri30a unsaved'); } else { await box.fill(`fri30a unsaved ${RUN}`); }
                    await box.blur().catch(() => {});
                }
                const typed = had ? await val() : null;
                // press the "Title & Abstract" entry of the same version (the first visible level-3 entry)
                const info = await wfInfo(page);
                const target = info.menu.find((x) => x.level === 3 && x.visible && !x.selected);
                const nav = page.locator('[role=dialog] nav').first();
                if (target) await nav.getByRole('link', {name: target.t, exact: true}).first().click({timeout: 8000}).catch((e) => log('leave click', e.message.slice(0, 80)));
                await page.waitForTimeout(2000); await idle(page);
                const left = await snap(`leave-${lang}-${pg}-left`);
                await page.goto(wfURL(lang, 'mgr', 'F', pg)); await settle();
                const back = had ? await val() : null;
                await page.reload(); await settle();
                const reload = had ? await val() : null;
                fact(`leave:${lang}:${pg}`, {kind, had: !!had, before: flat(before, 200), typed: flat(typed, 200), pressed: target && target.t, headingAfter: left.info.heading, windowsAfter: left.info.windows, keysAfter: split(left.raw).window, onReturn: flat(back, 200), afterReload: flat(reload, 200), ...since(m)});
            });
            // references: one added through "Add" in French, read on the page and after a reload
            await page.goto(wfURL(lang, 'mgr', 'F', 'citations')); await settle();
            const m = mark();
            const ta = page.locator('[data-cy="workflow-primary-items"] textarea').first();
            await loc(page, 'References page (fr_CA): the Add box', ta);
            const ref = `Zed, Z. (2022). A reference added in French ${RUN}.`;
            await ta.fill(ref).catch(() => {});
            const add = await markLabel(page, L('common.add'), 'wf', 'button');
            if (add) await page.locator('[data-fri30a]').first().click();
            await page.waitForTimeout(2500); await idle(page); await stable();
            const a1 = await snap(`leave-${lang}-citations-added`);
            await page.reload(); await settle();
            const a2 = await snap(`leave-${lang}-citations-added-reload`);
            fact(`cit:${lang}:add`, {addButton: add, afterAdd: {body: flat(a1.info.primary, 900), keys: split(a1.raw)}, afterReload: {body: flat(a2.info.primary, 900), keys: split(a2.raw)}, ...since(m)});
        });

        // ------------------------------------------------------------ ver: "Create New Version", staged (D) and stage-less (P)
        if (on('ver')) await sect('ver', async () => {
            await asUser('mgr');
            const dlgRead = async (lbl) => {
                const dlg = page.locator('[role=dialog]').filter({has: page.locator('select[name="versionStage"]')}).last();
                await dlg.locator('select[name="versionStage"]').waitFor({timeout: 25000}).catch(() => {});
                await idle(page); await stable();
                const d = await dlg.evaluate((el) => ({
                    text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
                    selects: [...el.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => `${o.value}=${o.textContent.trim()}${o.disabled ? ' (disabled)' : ''}`)})),
                    radios: [...el.querySelectorAll('input[type=radio]')].map((r) => `${r.name}=${r.value}${r.checked ? ' (checked)' : ''}: ${(r.closest('label') || r.parentElement).innerText.trim().slice(0, 120)}`),
                    buttons: [...el.querySelectorAll('button')].map((b) => b.innerText.trim() || b.getAttribute('aria-label')).filter(Boolean),
                })).catch((e) => ({error: String(e.message)}));
                const s = await snap(lbl, {dialogRead: d});
                return {dialog: d, keys: split(s.raw), menu: menuShape(s.info)};
            };
            const openCNV = async (lang, k) => {
                await page.goto(wfURL(lang, 'mgr', k)); await settle();
                const info = await wfInfo(page);
                const l1 = info.menu.filter((x) => x.level === 1);
                const iPub = info.menu.indexOf(l1[1] || l1[0]);
                const last = info.menu.map((x, i) => ({...x, i})).filter((x) => x.i > iPub && x.level === 2).pop();
                const nav = page.locator('[role=dialog] nav').first();
                const link = nav.getByRole('link', {name: last.t, exact: true}).last();
                await loc(page, `side menu (${lang}): "Create New Version" (the publication group's last entry)`, link);
                await link.click();
                return {entry: last.t, menuBefore: menuShape(info)};
            };
            for (const k of ['D', 'P']) {
                const out = {};
                for (const lang of ['en', 'fr_CA']) {
                    const m = mark();
                    const o = await openCNV(lang, k);
                    const r = await dlgRead(`ver-${lang}-${k}-dialog1`);
                    let pressed = null;
                    if (lang === 'en') { pressed = await leaveWindow(L('common.cancel')); } else {
                        const c = await markLabel(page, L('common.confirm'), 'win', 'button');
                        if (c) { await page.locator('[data-fri30a]').first().click(); pressed = c; }
                        await page.waitForTimeout(2000); await idle(page); await settle();
                    }
                    const after = await snap(`ver-${lang}-${k}-after1`);
                    out[lang] = {...o, ...r, pressed, after: {menu: menuShape(after.info), heading: after.info.heading, windows: after.info.windows, keys: split(after.raw)}, ...since(m)};
                }
                // second opening, now with two versions, both languages, cancelled
                for (const lang of ['en', 'fr_CA']) {
                    const m = mark();
                    const o = await openCNV(lang, k);
                    const r = await dlgRead(`ver-${lang}-${k}-dialog2`);
                    const pressed = await leaveWindow(L('common.cancel'));
                    out[`${lang}-2`] = {...o, ...r, pressed, ...since(m)};
                }
                out.versions = sql(app, `select publication_id, version_stage, version_major, version_minor, status, source_publication_id from publications where submission_id=${S[k].id} order by publication_id`);
                fact(`ver:${k}`, out);
            }
        });
        // ------------------------------------------------------------ ver2: a stage chosen for a copy of a never-published version (F), fr_CA
        // A11's axis: is a version named "##publication.versionStage.unassignedVersion##" until first published, or until given a stage?
        if (on('ver2')) await sect('ver2', async () => {
            await asUser('mgr');
            const m = mark();
            await page.goto(wfURL('fr_CA', 'mgr', 'F')); await settle();
            const info = await wfInfo(page);
            const l1 = info.menu.filter((x) => x.level === 1);
            const iPub = info.menu.indexOf(l1[1] || l1[0]);
            const last = info.menu.map((x, i) => ({...x, i})).filter((x) => x.i > iPub && x.level === 2).pop();
            await page.locator('[role=dialog] nav').first().getByRole('link', {name: last.t, exact: true}).last().click();
            const dlg = page.locator('[role=dialog]').filter({has: page.locator('select[name="versionStage"]')}).last();
            await dlg.locator('select[name="versionStage"]').waitFor({timeout: 25000});
            await idle(page); await stable();
            const firstStage = await dlg.locator('select[name="versionStage"] option').first().getAttribute('value');
            await dlg.locator('select[name="versionStage"]').selectOption(firstStage);
            await page.waitForTimeout(500);
            const minorOpts = await dlg.locator('select[name="versionIsMinor"] option').evaluateAll((os) => os.map((o) => o.value));
            if (minorOpts.includes('false')) await dlg.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
            const d0 = await snap('ver2-fr_CA-F-dialog');
            const c = await markLabel(page, L('common.confirm'), 'win', 'button');
            if (c) await page.locator('[data-fri30a]').first().click();
            await page.waitForTimeout(2000); await idle(page); await settle();
            const a = await snap('ver2-fr_CA-F-after');
            await page.goto(wfURL('en', 'mgr', 'F')); await settle();
            const e = await snap('ver2-en-F-after');
            fact('ver2:F', {stage: firstStage, dialogWindow: d0.info.windows && flat(d0.info.windows.slice(-1)[0], 600), frMenu: menuShape(a.info), enMenu: menuShape(e.info),
                versions: sql(app, `select publication_id, version_stage, version_major, version_minor, status, source_publication_id from publications where submission_id=${S.F.id} order by publication_id`), ...since(m)});
        });
        // ------------------------------------------------------------ extra: the other ends of three windows, fr_CA then en (F)
        //   media row "Delete File" dialog (cancelled); funding "Order" mode (read, left by "Save Order");
        //   OJS JATS "Make available with publication" confirmed, then pressed again: the disable dialog (cancelled).
        if (on('extra')) await sect('extra', async () => {
            await asUser('mgr');
            for (const lang of ['fr_CA', 'en']) {
                const X = {};
                await page.goto(wfURL(lang, 'mgr', 'F', 'media')); await settle();
                X.mediaDelete = await rowItemWindow(`extra-${lang}-F-media-delete`, ['grid.action.deleteFile']);
                await page.goto(wfURL(lang, 'mgr', 'F', 'funding')); await settle();
                const m = mark();
                const o = await markLabel(page, L('grid.action.order', 'common.order'), 'wf', 'button');
                if (o) {
                    await page.locator('[data-fri30a]').first().click(); await page.waitForTimeout(800); await idle(page);
                    const s1 = await snap(`extra-${lang}-F-funding-order`);
                    const so = await markLabel(page, L('grid.action.saveOrdering'), 'wf', 'button');
                    if (so) { await page.locator('[data-fri30a]').first().click(); await page.waitForTimeout(1200); await idle(page); }
                    const s2 = await snap(`extra-${lang}-F-funding-order-saved`);
                    X.fundOrder = {pressed: o, body: flat(s1.info.primary, 500), keys: split(s1.raw), saveButton: so, after: flat(s2.info.primary, 300), ...since(m)};
                } else X.fundOrder = {absent: true};
                if (isOJS) {
                    await page.goto(wfURL(lang, 'mgr', 'F', 'jats')); await settle();
                    const box = page.locator('[data-cy="workflow-primary-items"] input[type=checkbox]').first();
                    const was = await box.isChecked().catch(() => null);
                    if (!was) {
                        const en = await openWindow(`extra-${lang}-F-jats-enable`, L('publication.jats.makePublic'), 'wf', {sel: 'label, input[type=checkbox]', keep: true});
                        const c = await markLabel(page, L('common.confirm'), 'win', 'button');
                        if (c) { await page.locator('[data-fri30a]').first().click(); await page.waitForTimeout(1500); await idle(page); }
                        X.jatsEnable = {...en, confirmed: c, checkedAfter: await box.isChecked().catch(() => null)};
                        await page.reload(); await settle();
                        X.jatsEnable.checkedAfterReload = await box.isChecked().catch(() => null);
                    }
                    X.jatsDisable = await openWindow(`extra-${lang}-F-jats-disable`, L('publication.jats.makePublic'), 'wf', {sel: 'label, input[type=checkbox]'});
                    X.jatsDisable.checkedAfterCancel = await box.isChecked().catch(() => null);
                }
                fact(`extra:${lang}:F`, X);
            }
        });
    } finally {
        record(`facts-${PHASES.join('+')}`, {facts, errors: errs, bad, browserDialogs}, {merge: true});
        await close();
    }
});
