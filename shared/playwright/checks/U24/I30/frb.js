// U24 claim check, chunk I30 FRb (housekeeping 2026-09-30): the editorial dashboard, the OJS "Author Response"
// panel and the OMP Production notices in the French interface (/fr_CA/), each paired with the same read in English.
// Chunk: .reports/hk30/chunks/FRb.md (incidentals rows R6 and R7-U30, R7-U33).
//
//   R6      U23 the editorial dashboard: every view of the side menu's editorial group, as the Journal Manager and a
//           Section Editor (assigned to two submissions); the table's rows and their buttons, the "…" above the list
//           ("Delete Incomplete Submissions" selection mode, cancelled), "Filters" (a change left unapplied, panel
//           closed and reopened), the in-page search (a phrase typed, the chip read, cleared), a sortable column
//           header pressed; sweep: the Author's "My Submissions" list read.
//   R7-U30  (OJS) the review stage's "Author Response" table: "Awaiting reviews" (W, an accepted reviewer) and
//           "Ready to invite author" (R, a completed review); "Request Response" → the "Request Author Response"
//           page, submitted in French; the Author's card and its response window (typed, cancelled, reopened; then
//           submitted), the card after the submit and after a reload; the editor's row "…" menu, its "View" window
//           (cancelled) and "Delete" dialog (cancelled); V (Request Revisions recorded) the card without a request.
//           Control: a press's review stage (OMP) read in French for the absent table.
//   R7-U33  (OMP) the Production entry's notice box: "Awaiting approval." (P, never published), "Catalog Management"
//           (D, published) and on U after "Unpublish" pressed in French. Role axis: the manager, the assigned Series
//           Editor and the Author. Control: a journal's Production entry (OJS, the assigned Section Editor's galley
//           notice) and a preprint server's (OPS, no notice box).
//
// One scratch context per app and run (tag fri30b<run>…), UI languages en + fr_CA, users mgr (manager), se
// (sectionEditor, a participant on R and P), au (author, the submitter), rv (externalReviewer; OJS, OMP).
// Phases (PHASES=seed,dash,ar,prod; default all; seedq then prodq (OMP: a monograph published from Production, unpublished); ind (the review indicator's popover, OJS/OMP) on request; seed must run first in a run; ar2 alone re-runs the editor's reads after
// the Author's response, OJS, plus the Author's English read and the DB row):
//   PROBE_RUN=r1 PROBE_FEATURE=U24 PROBE_AGENT=ccI30frb node bin/probe.js all shared/playwright/checks/U24/I30/frb.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outFile, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,dash,ar,prod').split(',');
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
// Every "##key##" on the page, text and every attribute, with where it sits: the workflow dialog's frame parts
// (wf-header, wf-menu, wf-heading, wf-controls-*), its page body (wf-primary / wf-secondary / wf-actions), an inner
// window (window), a popup menu, the dashboard's own parts (dash-heading, dash-table, dash-main), the backend side
// menu (side-nav), the top header, an aria-live region (live), or elsewhere (page).
const rawKeys = (page) => page.evaluate(() => {
    const re = /##[^#\s]+##/g;
    const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
    const wf = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    const where = (e) => {
        if (e.closest('[aria-live]')) return 'live';
        const d = e.closest('[role=dialog], [role=alertdialog], .pkp_modal_panel');
        if (d && wf && d !== wf && !d.contains(wf)) return 'window';
        if (d && !wf) return 'window';
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
        if (e.closest('header')) return 'top-header';
        if (e.closest('nav')) return 'side-nav';
        const main = e.closest('#app-main, main');
        if (main) {
            if (e.closest('table')) return 'dash-table';
            if (e.closest('h1')) return 'dash-heading';
            return 'dash-main';
        }
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
        for (const a of el.attributes) if (!a.name.startsWith('data-v-') && a.name !== 'data-fri30b') add(a.value, el, a.name);
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value) add(el.value, el, 'value');
    }
    for (const k of document.title.match(re) || []) found.add(`${k} @ <title>`);
    return [...found];
}).catch(() => null);

const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    const windows = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !(root && d.contains(root)) && vis(d));
    if (!root) return {panel: false, windows: windows.map((d) => txt(d).slice(0, 1200))};
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
    const sec = root.querySelector('[data-cy="workflow-secondary-items"]');
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => {
        const lb = t.getAttribute('aria-labelledby');
        return {
            name: t.getAttribute('aria-label') || (lb && document.getElementById(lb) ? txt(document.getElementById(lb)) : null),
            columns: [...t.querySelectorAll('thead th')].map((th) => txt(th) + (th.getAttribute('aria-label') ? ` [aria:${th.getAttribute('aria-label')}]` : '')),
            rows: [...t.querySelectorAll('tbody tr')].map((tr) => txt(tr).slice(0, 240)),
            rowButtons: [...t.querySelectorAll('tbody tr button')].filter(vis).map((b) => `${txt(b)}${b.getAttribute('aria-label') ? ` [aria:${b.getAttribute('aria-label')}]` : ''}`).slice(0, 20),
        };
    });
    return {
        panel: true,
        headerText: txt(header),
        heading: txt(root.querySelector('.pkp-modal-scroll-container h2')),
        primary: prim ? txt(prim).slice(0, 2500) : null,
        secondary: sec ? txt(sec).slice(0, 800) : null,
        headings: [...root.querySelectorAll('h2, h3, h4')].filter(vis).map(txt).filter(Boolean).slice(0, 40),
        tables,
        menu,
        windows: windows.map((d) => txt(d).slice(0, 1500)),
    };
}).catch((e) => ({error: String(e.message)}));

const dashInfo = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const main = document.querySelector('#app-main') || document.body;
    const table = [...main.querySelectorAll('table')].find(vis);
    const btn = (b) => `${txt(b) || ''}${b.getAttribute('aria-label') ? ` [aria:${b.getAttribute('aria-label')}]` : ''}${b.getAttribute('aria-haspopup') ? ' [menu]' : ''}${b.disabled ? ' [disabled]' : ''}`;
    return {
        heading: txt(main.querySelector('h1')),
        columns: table ? [...table.querySelectorAll('thead th')].map((th) => `${txt(th)}${th.getAttribute('aria-label') ? ` [aria:${th.getAttribute('aria-label')}]` : ''}${th.getAttribute('aria-sort') ? ` [sort:${th.getAttribute('aria-sort')}]` : ''}`) : null,
        tableName: table ? (table.getAttribute('aria-label') || (table.getAttribute('aria-labelledby') && document.getElementById(table.getAttribute('aria-labelledby')) ? txt(document.getElementById(table.getAttribute('aria-labelledby'))) : null)) : null,
        rows: table ? [...table.querySelectorAll('tbody tr')].slice(0, 20).map((tr) => ({text: txt(tr).slice(0, 260), buttons: [...tr.querySelectorAll('button, a')].filter(vis).map(btn)})) : null,
        controls: [...main.querySelectorAll('button, input, a[role=button]')].filter((e) => vis(e) && !(table && table.contains(e))).map((e) => (e.tagName === 'INPUT' ? `input[${e.type}] placeholder=${e.placeholder || ''} aria=${e.getAttribute('aria-label') || ''}` : btn(e))).slice(0, 40),
        below: table && table.parentElement ? txt(table.parentElement.parentElement).slice(-200) : null,
        views: [...document.querySelectorAll('nav a[href*="currentViewId"]')].map((a) => ({t: txt(a), href: a.getAttribute('href'), visible: vis(a)})),
        live: [...document.querySelectorAll('[aria-live]')].map((e) => `${e.getAttribute('aria-live')}: ${(e.textContent || '').trim().replace(/\s+/g, ' ')}`),
        windows: [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].filter(vis).map((d) => txt(d).slice(0, 1500)),
    };
}).catch((e) => ({error: String(e.message)}));

const windowCount = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    return [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !(root && d.contains(root)) && vis(d)).length;
}).catch(() => 0);

// Mark the first visible control whose text or aria-label matches `src` inside a scope, return its text.
// scope: 'wf' (the workflow dialog's page body), 'win' (the topmost inner window), 'main' (#app-main), 'doc'.
const markLabel = (page, src, scope, sel) => page.evaluate(([src, scope, sel]) => {
    document.querySelectorAll('[data-fri30b]').forEach((e) => e.removeAttribute('data-fri30b'));
    const re = new RegExp(src, 'i');
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const root = [...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[data-cy="workflow-primary-items"], [data-cy="workflow-controls-left"]'));
    let within = document;
    if (scope === 'wf') within = root ? (root.querySelector('.pkp-modal-scroll-container') || root) : document;
    if (scope === 'main') within = document.querySelector('#app-main') || document;
    if (scope === 'win') {
        const ws = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d !== root && !(root && d.contains(root)) && vis(d));
        within = ws[ws.length - 1];
        if (!within) return null;
    }
    const cands = [...within.querySelectorAll(sel || 'button, a, [role=menuitem], [role=button], label')].filter(vis);
    for (const e of cands) {
        const t = (e.innerText || '').trim().replace(/\s+/g, ' ');
        const a = (e.getAttribute('aria-label') || '').trim();
        if (re.test(t) || re.test(a)) { e.setAttribute('data-fri30b', '1'); return t || a; }
    }
    return null;
}, [src, scope, sel || null]).catch(() => null);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const LOC = locales(app);
    const byEn = {};
    for (const [k, v] of Object.entries(LOC.en)) { const n = v.replace(/\s+/g, ' ').trim(); (byEn[n] = byEn[n] || []).push(k); }
    // A label as a regex from its English text: the English, the French of every key carrying that English, or the raw key.
    const T = (...texts) => {
        const alts = [];
        for (const tx of texts) {
            alts.push(esc(tx));
            for (const k of byEn[tx] || []) { if (LOC.fr_CA[k]) alts.push(esc(LOC.fr_CA[k].replace(/\s+/g, ' ').trim())); alts.push(esc(`##${k}##`)); }
        }
        return `^\\s*(${[...new Set(alts)].join('|')})\\s*$`;
    };
    const seedFile = outFile('seed.json');
    let seed;

    if (on('seed')) {
        const t = tag(`fri30b${RUN}`);
        const u = (k) => `${t}${k}`;
        const users = [{username: u('mgr'), roles: ['manager']}, {username: u('se'), roles: ['sectionEditor']}, {username: u('au'), roles: ['author']}];
        if (!isOPS) users.push({username: u('rv'), roles: ['externalReviewer']});
        await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`, supportedLocales: ['en', 'fr_CA']}, users});
        const subs = {};
        const mk = async (k, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `${k} fri30b ${t}`, ...spec});
                subs[k] = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, rounds: (r.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round}))};
            } catch (e) { subs[k] = {error: String(e.message).slice(0, 600)}; }
            log(app.name, 'seed', k, JSON.stringify(subs[k]));
        };
        const se = [{username: u('se'), role: 'sectionEditor'}];
        if (isOPS) {
            await mk('S', {participants: se});
            await mk('X', {decisions: ['decline']});
            await mk('D', {published: true});
            await mk('I', {submitted: false});
        } else {
            await mk('S', {});
            await mk('W', {decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: u('rv'), status: 'accepted'}]}]});
            await mk('R', {decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: u('rv'), status: 'completed'}]}], participants: se});
            await mk('V', {decisions: ['sendExternalReview', 'requestRevisions'], reviewRounds: [{reviewers: [{username: u('rv'), status: 'completed'}]}]});
            await mk('P', {decisions: ['skipExternalReview', 'sendToProduction'], participants: se});
            await mk('D', {published: true});
            if (isOMP) await mk('U', {published: true});
            await mk('X', {decisions: ['initialDecline']});
            await mk('I', {submitted: false});
        }
        seed = {context: t, mgr: u('mgr'), se: u('se'), au: u('au'), rv: isOPS ? null : u('rv'), subs};
        fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2));
        note(`I30 FRb [${app.name}] ${RUN}: scratch context ${t} (UI en + fr_CA), users ${u('mgr')} (manager), ${u('se')} (sectionEditor on R and P; OPS on S), ${u('au')} (author)${isOPS ? '' : `, ${u('rv')} (externalReviewer)`}; subs ${Object.entries(subs).map(([k, v]) => `${k}=${v.id}`).join(' ')}`);
    }
    // seedq (OMP): Q, a monograph sent to Production and then published, so that "Unpublish" leaves it at Production
    // (U, published by the seed alone, falls back to Submission when unpublished).
    if (on('seedq') && isOMP) {
        const sd = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        const r = await app.api.createSubmission({tag: `${sd.context}Q`, context: sd.context, submitter: sd.au, title: `Q fri30b ${sd.context}`, decisions: ['skipExternalReview', 'sendToProduction'], published: true});
        sd.subs.Q = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, rounds: []};
        log(app.name, 'seedq', JSON.stringify(sd.subs.Q));
        fs.writeFileSync(seedFile, JSON.stringify(sd, null, 2));
    }
    if (!PHASES.some((p) => p !== 'seed' && p !== 'seedq')) return;
    seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const t = seed.context;
    const S = seed.subs;
    const dashURL = (lang, who, q) => app.url(`/index.php/${t}/${lang}/dashboard/${who === 'au' ? 'mySubmissions' : 'editorial'}${q || ''}`);
    const wfURL = (lang, who, k, key) => dashURL(lang, who, `?workflowSubmissionId=${S[k].id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const reviewKey = (k) => (S[k].rounds && S[k].rounds.length ? `workflow_${S[k].rounds[S[k].rounds.length - 1].stageId}_${S[k].rounds[S[k].rounds.length - 1].id}` : null);

    const {page, close} = await launch(app);
    const errs = []; const bad = []; const browserDialogs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), console: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), pageerror: String(e.message).slice(0, 300)}));
    page.on('response', (r) => { if (r.status() >= 400) bad.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220)}); });
    page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message().slice(0, 200), at: page.url().replace(/^https?:\/\/[^/]+/, '')}); await d.accept().catch(() => {}); });

    const facts = {};
    const fact = (k, v) => { facts[k] = v; log(app.name, k, JSON.stringify(v).slice(0, 900)); };
    async function sect(name, fn) {
        try { await fn(); } catch (e) { log(`[${app.name} ${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); fact(`${name}:FAILED`, String(e.stack || e).slice(0, 1200)); }
    }
    async function stable(timeout = 8000) {
        const end = Date.now() + timeout;
        let last = null;
        while (Date.now() < end) {
            const now = await page.evaluate(() => {
                const main = document.querySelector('#app-main');
                const ws = [...document.querySelectorAll('[role=dialog], [role=alertdialog], .pkp_modal_panel')].filter((d) => d.getClientRects().length);
                return `${main ? main.innerText.length : -1}|${ws.map((w) => w.innerText.length).join(',')}|${/Loading|Chargement|Refreshing|##common.loading##/.test((main || document.body).innerText.slice(0, 400)) && ![...document.querySelectorAll('[aria-live]')].some((e) => /Loaded|##common.loaded##/.test(e.textContent)) || [...document.querySelectorAll('.pkpSpinner')].some((e) => e.getClientRects().length > 0) ? 'L' : ''}`;
            }).catch(() => null);
            if (now && now === last && !now.endsWith('L')) return true;
            last = now;
            await page.waitForTimeout(700);
        }
        return false;
    }
    async function settleWf() {
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 25000}).catch(() => {});
        await idle(page); await stable(); await idle(page);
    }
    async function settleDash() {
        await page.locator('#app-main table, #app-main h1').first().waitFor({timeout: 25000}).catch(() => {});
        await idle(page); await stable(); await idle(page);
    }
    const split = (raw) => {
        const vis = (raw || []).filter((r) => !/hidden\)$/.test(r));
        const pick = (re) => vis.filter((r) => re.test(r));
        return {
            frame: pick(/@ (wf-header|wf-menu|wf-heading|wf-controls-left|wf-controls-right|<title>|top-header|side-nav)/),
            body: pick(/@ (wf-primary|wf-secondary|wf-actions|wf-other)/),
            dash: pick(/@ (dash-heading|dash-table|dash-main)/),
            window: pick(/@ (window|menu-popup)/),
            live: (raw || []).filter((r) => /@ live/.test(r)),
            other: pick(/@ page/),
            hidden: (raw || []).filter((r) => /hidden\)$/.test(r) && !/@ live/.test(r)),
        };
    };
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        const info = await wfInfo(page);
        const dash = info.panel ? null : await dashInfo(page);
        const raw = await rawKeys(page);
        record(label, {...s, info, dash, rawKeys: raw, ...(extra || {})});
        await shot(page, label).catch(() => {});
        return {info, dash, raw, keys: split(raw)};
    }
    const mark = () => ({e0: errs.length, b0: bad.length, d0: browserDialogs.length});
    const since = (m) => ({errors: errs.slice(m.e0).length ? errs.slice(m.e0) : undefined, bad: bad.slice(m.b0).length ? bad.slice(m.b0) : undefined, browserDialogs: browserDialogs.slice(m.d0).length ? browserDialogs.slice(m.d0) : undefined});
    async function press(src, scope, sel) {
        const pressed = await markLabel(page, src, scope, sel);
        if (pressed) {
            const el = page.locator('[data-fri30b]').first();
            await el.click({timeout: 6000}).catch(async (e) => {
                log('press retried (dispatch)', src.slice(0, 60), e.message.split('\n')[0].slice(0, 80));
                await el.dispatchEvent('click').catch((e2) => log('press failed', src.slice(0, 60), e2.message.slice(0, 80)));
            });
        }
        return pressed;
    }
    async function waitWindow(before, timeout = 15000) {
        const end = Date.now() + timeout;
        while (Date.now() < end && (await windowCount(page)) <= before) await page.waitForTimeout(300);
        await idle(page); await stable(); await idle(page);
    }
    async function leaveWindow(src) {
        const want = src || T('Cancel', 'Close');
        let t_ = await markLabel(page, want, 'win', 'button, a');
        if (!t_) t_ = await markLabel(page, T('Close', 'Cancel'), 'win', 'button[aria-label], a.pkpModalCloseButton, button');
        if (t_) await page.locator('[data-fri30b]').first().click({timeout: 8000}).catch(() => {});
        await page.waitForTimeout(1500); await idle(page);
        return t_;
    }
    const menuItems = () => page.locator('[role="menuitem"]:visible').evaluateAll((els) => els.map((e) => `${e.textContent.trim().replace(/\s+/g, ' ')}${e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true' ? ' [disabled]' : ''}`)).catch(() => []);
    async function asUser(who) { await signIn(page, seed[who], {contextPath: t}); await idle(page); }

    try {
        // ------------------------------------------------------------ dash: the editorial dashboard (R6), mgr and se, fr_CA then en
        if (on('dash')) await sect('dash', async () => {
            for (const who of ['mgr', 'se']) {
                await asUser(who);
                for (const lang of ['fr_CA', 'en']) {
                    const pre = `dash-${who}-${lang}`;
                    const m0 = mark();
                    await page.goto(dashURL(lang, who)); await settleDash();
                    const land = await snap(`${pre}-landing`);
                    const views = (land.dash.views || []).filter((v) => /dashboard\/editorial/.test(v.href));
                    const out = {landing: {heading: land.dash.heading, columns: land.dash.columns, tableName: land.dash.tableName, controls: land.dash.controls, rows: land.dash.rows, live: land.dash.live, keys: land.keys, ...since(m0)}, views: {}};
                    for (const v of views) {
                        const id = (v.href.match(/currentViewId=([^&]+)/) || [])[1];
                        const m = mark();
                        await page.goto(new URL(v.href, app.url('/')).toString()); await settleDash();
                        const s = await snap(`${pre}-v-${id}`);
                        out.views[id] = {entry: v.t, heading: s.dash.heading, columns: s.dash.columns, rows: (s.dash.rows || []).map((r) => `${r.text} || ${r.buttons.join(' ; ')}`), controls: s.dash.controls, below: s.dash.below, keys: s.keys, ...since(m)};
                    }
                    // the "Active submissions" view: the controls above the list and one row's buttons
                    const activeHref = (views.find((v) => /currentViewId=active\b/.test(v.href)) || views[0] || {}).href;
                    const X = {};
                    if (activeHref) {
                        const goActive = async () => { await page.goto(new URL(activeHref, app.url('/')).toString()); await settleDash(); };
                        // the "…" above the list (bulk actions)
                        await goActive();
                        let m = mark();
                        const more = await press(T('More Actions'), 'main', 'button');
                        if (more) {
                            await page.waitForTimeout(800); await idle(page);
                            const items = await menuItems();
                            const s1 = await snap(`${pre}-bulk-menu`);
                            X.bulk = {button: more, items, keys: s1.keys};
                            const pick = await press(T('Delete Incomplete Submissions'), 'doc', '[role=menuitem]');
                            if (pick) {
                                await page.waitForTimeout(1200); await idle(page); await stable();
                                const s2 = await snap(`${pre}-bulk-select`);
                                X.bulk.select = {item: pick, controls: s2.dash.controls, rows: (s2.dash.rows || []).map((r) => `${r.text} || ${r.buttons.join(' ; ')}`), columns: s2.dash.columns, keys: s2.keys};
                                // tick the first box, press the delete button, read the dialog, cancel it; then cancel selection
                                const box = page.locator('#app-main table tbody input[type=checkbox]').first();
                                if (await box.count()) {
                                    await box.check().catch(() => {});
                                    const before = await windowCount(page);
                                    const del = await press(T('Delete Incomplete Submissions'), 'main', 'button');
                                    if (del) {
                                        await waitWindow(before, 8000);
                                        const s3 = await snap(`${pre}-bulk-confirm`);
                                        X.bulk.confirm = {button: del, windows: s3.dash.windows, keys: s3.keys};
                                        X.bulk.confirm.left = await leaveWindow(T('Cancel'));
                                    }
                                }
                                X.bulk.cancel = await press(T('Cancel'), 'main', 'button');
                                await page.waitForTimeout(800); await idle(page);
                                const s4 = await snap(`${pre}-bulk-cancelled`);
                                X.bulk.after = {controls: s4.dash.controls, keys: s4.keys};
                            } else { await page.keyboard.press('Escape').catch(() => {}); }
                        } else X.bulk = {absent: true};
                        Object.assign(X.bulk, since(m));
                        // a review indicator's "View more details" pressed (the popover it opens)
                        await goActive();
                        m = mark();
                        const ind = await press(T('View more details'), 'main', 'table tbody button');
                        if (ind) {
                            await page.waitForTimeout(1000); await idle(page);
                            const s = await snap(`${pre}-indicator`);
                            const pop = await page.evaluate(() => [...document.querySelectorAll('[role=dialog], [role=tooltip], [data-headlessui-state], .popover, [id^="headlessui-popover-panel"]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 400)).filter(Boolean)).catch(() => null);
                            X.indicator = {button: ind, popover: pop, keys: s.keys};
                            await page.keyboard.press('Escape').catch(() => {});
                        } else X.indicator = {absent: true};
                        Object.assign(X.indicator, since(m));
                        // a row's buttons: the first row with a menu button opens its menu
                        await goActive();
                        m = mark();
                        const rowMenu = page.locator('#app-main table tbody tr button[aria-haspopup]').first();
                        if (await rowMenu.count()) {
                            const name = (await rowMenu.getAttribute('aria-label')) || (await rowMenu.innerText());
                            await rowMenu.click(); await page.waitForTimeout(800);
                            X.rowMenu = {button: name, items: await menuItems()};
                            const s = await snap(`${pre}-row-menu`);
                            X.rowMenu.keys = s.keys;
                            await page.keyboard.press('Escape').catch(() => {});
                        } else X.rowMenu = {absent: true};
                        Object.assign(X.rowMenu, since(m));
                        // "Filters": opened, a field changed, closed without applying, reopened
                        await goActive();
                        m = mark();
                        let before = await windowCount(page);
                        const f = await press(T('Filters'), 'main', 'button');
                        if (f) {
                            await waitWindow(before, 10000);
                            const s = await snap(`${pre}-filters`);
                            X.filters = {button: f, window: s.dash.windows, keys: s.keys};
                            // the panel holds a list and a "days since last activity" slider (no checkbox): move the slider
                            const sl = page.locator('[role=dialog]:visible [role=slider]').first();
                            if (await sl.count()) { await sl.focus().catch(() => {}); await page.keyboard.press('ArrowRight').catch(() => {}); X.filters.sliderMoved = await sl.getAttribute('aria-valuenow').catch(() => null); }
                            X.filters.left = await leaveWindow(T('Close'));
                            const sc = await snap(`${pre}-filters-closed`);
                            X.filters.afterClose = {heading: sc.dash.heading, windows: sc.dash.windows, keys: sc.keys};
                            before = await windowCount(page);
                            await press(T('Filters'), 'main', 'button');
                            await waitWindow(before, 10000);
                            const sl2 = page.locator('[role=dialog]:visible [role=slider]').first();
                            X.filters.reopenedSlider = (await sl2.count()) ? await sl2.getAttribute('aria-valuenow').catch(() => null) : null;
                            await snap(`${pre}-filters-reopened`);
                            await leaveWindow(T('Close'));
                        } else X.filters = {absent: true};
                        Object.assign(X.filters, since(m));
                        // the in-page search: a phrase, the chip, cleared
                        await goActive();
                        m = mark();
                        const box = page.locator('#app-main input[type=search], #app-main input[type=text]').first();
                        if (await box.count()) {
                            await loc(page, `dashboard (${lang}): the in-page search box`, box);
                            await box.fill(`${S.D.id}`); await box.press('Enter').catch(() => {});
                            await page.waitForTimeout(1500); await idle(page); await stable();
                            const s = await snap(`${pre}-search`);
                            X.search = {placeholder: await box.getAttribute('placeholder'), heading: s.dash.heading, rows: (s.dash.rows || []).map((r) => r.text), controls: s.dash.controls, keys: s.keys};
                        } else X.search = {absent: true};
                        Object.assign(X.search, since(m));
                        // a sortable header pressed
                        await goActive();
                        m = mark();
                        const sortBtn = page.locator('#app-main table thead th button').first();
                        if (await sortBtn.count()) {
                            const nm = (await sortBtn.getAttribute('aria-label')) || (await sortBtn.innerText());
                            await sortBtn.click(); await page.waitForTimeout(1200); await idle(page); await stable();
                            const s = await snap(`${pre}-sorted`);
                            X.sort = {button: nm, columns: s.dash.columns, url: page.url().replace(/^https?:\/\/[^/]+/, ''), keys: s.keys};
                        } else X.sort = {absent: true};
                        Object.assign(X.sort, since(m));
                    }
                    out.active = X;
                    fact(`dash:${who}:${lang}`, out);
                }
            }
            // sweep: the Author's "My Submissions" list, fr_CA then en
            await asUser('au');
            for (const lang of ['fr_CA', 'en']) {
                const m = mark();
                await page.goto(dashURL(lang, 'au')); await settleDash();
                const s = await snap(`dash-au-${lang}-landing`);
                const out = {heading: s.dash.heading, columns: s.dash.columns, rows: (s.dash.rows || []).map((r) => `${r.text} || ${r.buttons.join(' ; ')}`), controls: s.dash.controls, keys: s.keys, views: {}};
                for (const v of (s.dash.views || []).filter((x) => /dashboard\/mySubmissions/.test(x.href))) {
                    const id = (v.href.match(/currentViewId=([^&]+)/) || [])[1];
                    await page.goto(new URL(v.href, app.url('/')).toString()); await settleDash();
                    const sv = await snap(`dash-au-${lang}-v-${id}`);
                    out.views[id] = {entry: v.t, heading: sv.dash.heading, rows: (sv.dash.rows || []).map((r) => `${r.text} || ${r.buttons.join(' ; ')}`), controls: sv.dash.controls, keys: sv.keys};
                }
                fact(`dash:au:${lang}`, {...out, ...since(m)});
            }
        });

        // ------------------------------------------------------------ ind: a review indicator's popover on the dashboard (mgr), fr_CA then en
        if (on('ind') && !isOPS) await sect('ind', async () => {
            await asUser('mgr');
            for (const lang of ['fr_CA', 'en']) {
                const out = {};
                for (const k of ['W', 'R']) {
                    const m = mark();
                    await page.goto(dashURL(lang, 'mgr', '?currentViewId=active')); await settleDash();
                    const row = page.locator('#app-main table tbody tr').filter({hasText: `${k} fri30b`}).first();
                    const b = row.locator('button').filter({hasText: /details|détails/i}).first();
                    if (!(await b.count())) { out[k] = {absent: true}; continue; }
                    const name = flat(await b.innerText(), 200);
                    await b.click({timeout: 8000}).catch(() => b.dispatchEvent('click'));
                    await page.waitForTimeout(1200); await idle(page);
                    const s = await snap(`ind-mgr-${lang}-${k}`);
                    const pop = await page.evaluate(() => [...document.querySelectorAll('[role=dialog], [role=tooltip], [id^="headlessui-popover-panel"], [data-headlessui-state="open"]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 600)).filter(Boolean)).catch(() => null);
                    out[k] = {button: name, popover: pop, windows: s.dash && s.dash.windows, keys: s.keys, ...since(m)};
                    await page.keyboard.press('Escape').catch(() => {});
                }
                fact(`ind:mgr:${lang}`, out);
            }
        });
        // ------------------------------------------------------------ ar: the "Author Response" panel (R7-U30), OJS; OMP control
        if (on('ar') && !isOPS) await sect('ar', async () => {
            const readStage = async (label, lang, who, k) => {
                const m = mark();
                await page.goto(wfURL(lang, who, k, reviewKey(k))); await settleWf();
                const s = await snap(label);
                return {heading: s.info.heading, headings: s.info.headings, tables: s.info.tables, primary: flat(s.info.primary, 1500), keys: s.keys, ...since(m)};
            };
            await asUser('mgr');
            for (const lang of ['fr_CA', 'en']) for (const k of ['W', 'R', 'V']) fact(`ar:mgr:${lang}:${k}`, await readStage(`ar-mgr-${lang}-${k}`, lang, 'mgr', k));
            if (!isOJS) return; // a press: the control reads above only
            // "Request Response" on R, French: the request page read, submitted
            {
                const m = mark();
                await page.goto(wfURL('fr_CA', 'mgr', 'R', reviewKey('R'))); await settleWf();
                const pressed = await press(T('Request Response'), 'wf', 'button');
                await page.waitForURL(/requestAuthorResponse/, {timeout: 20000}).catch(() => {});
                await idle(page);
                await page.locator('iframe[id^="composer-body"]').first().waitFor({timeout: 20000}).catch(() => {});
                await page.waitForTimeout(1500); await idle(page); await stable();
                const s = await snap('ar-mgr-fr_CA-R-request');
                const url = page.url().replace(/^https?:\/\/[^/]+/, '');
                const main = await page.evaluate(() => (document.querySelector('#app-main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 1500)).catch(() => null);
                const subject = await page.locator('#app-main input[type=text]').first().inputValue().catch(() => null);
                const sub = await press(T('Submit Request'), 'main', 'button');
                await page.waitForTimeout(2500); await idle(page);
                const s2 = await snap('ar-mgr-fr_CA-R-request-sent');
                fact('ar:mgr:fr_CA:R:request', {pressed, url, main, subject, keys: s.keys, submit: sub, sentWindows: s2.dash && s2.dash.windows, sentKeys: s2.keys, ...since(m)});
                // the same page in English, read only (the round now holds a sent request: the page is typed in)
                const m2 = mark();
                const enURL = app.url(`/index.php/${t}/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=${S.R.rounds[0].id}&submissionId=${S.R.id}`);
                await page.goto(enURL); await idle(page); await page.waitForTimeout(2000); await idle(page);
                const s3 = await snap('ar-mgr-en-R-request');
                fact('ar:mgr:en:R:request', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), main: flat(s3.dash && s3.dash.heading, 200), keys: s3.keys, ...since(m2)});
                const m3 = mark();
                await page.goto(app.url(`/index.php/${t}/fr_CA/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=${S.R.rounds[0].id}&submissionId=${S.R.id}`)); await idle(page); await page.waitForTimeout(2000); await idle(page);
                const s4 = await snap('ar-mgr-fr_CA-R-request-typed');
                fact('ar:mgr:fr_CA:R:request-typed', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), keys: s4.keys, ...since(m3)});
            }
            fact('ar:mgr:fr_CA:R:after-request', await readStage('ar-mgr-fr_CA-R-after-request', 'fr_CA', 'mgr', 'R'));
            // the Author: card on R (requested) and V (revisions requested); the response window
            await asUser('au');
            const cardWindow = async (label, lang, k, which) => {
                await page.goto(wfURL(lang, 'au', k, reviewKey(k))); await settleWf();
                const before = await windowCount(page);
                const pressed = await press(which === 'view' ? T('View Submitted Response') : T('Submit Response'), 'wf', 'button');
                if (!pressed) return {pressed: null};
                await waitWindow(before, 15000);
                const s = await snap(label);
                return {pressed, windows: s.info.windows, keys: s.keys};
            };
            for (const lang of ['fr_CA', 'en']) for (const k of ['R', 'V']) fact(`ar:au:${lang}:${k}`, await readStage(`ar-au-${lang}-${k}`, lang, 'au', k));
            {
                const m = mark();
                const out = {};
                out.enWindow = await cardWindow('ar-au-en-R-window', 'en', 'R', 'submit');
                if (out.enWindow.pressed) out.enWindow.left = await leaveWindow(T('Cancel'));
                out.window = await cardWindow('ar-au-fr_CA-R-window', 'fr_CA', 'R', 'submit');
                if (out.window.pressed) {
                    // typed, then Cancel: what the window asks, and what the reopened window holds
                    const body = page.locator('[role=dialog]:visible iframe').last().contentFrame().locator('body');
                    await body.click().catch(() => {}); await body.pressSequentially(`fri30b unsaved ${RUN}`).catch(() => {});
                    await page.waitForTimeout(500);
                    out.cancelled = await leaveWindow(T('Cancel'));
                    const sc = await snap('ar-au-fr_CA-R-window-cancelled');
                    out.afterCancel = {windows: sc.info.windows, keys: sc.keys};
                    const before = await windowCount(page);
                    await press(T('Submit Response'), 'wf', 'button');
                    await waitWindow(before, 15000);
                    const b2 = page.locator('[role=dialog]:visible iframe').last().contentFrame().locator('body');
                    out.reopenedBody = flat(await b2.innerText().catch(() => null), 200);
                    await snap('ar-au-fr_CA-R-window-reopened');
                    // typed and submitted
                    await b2.click().catch(() => {}); await b2.pressSequentially(`Réponse fri30b ${RUN}`).catch(() => {});
                    const cb = page.locator('[role=dialog]:visible input[type=checkbox]').first();
                    if (await cb.count()) await cb.check().catch(() => {});
                    const s5 = await snap('ar-au-fr_CA-R-window-filled');
                    out.filled = {windows: s5.info.windows, keys: s5.keys};
                    out.submit = await press(T('Submit Response'), 'win', 'button');
                    await page.waitForTimeout(2500); await idle(page); await stable();
                    const s6 = await snap('ar-au-fr_CA-R-submitted');
                    out.afterSubmit = {primary: flat(s6.info.primary, 1500), windows: s6.info.windows, keys: s6.keys};
                    await page.reload(); await settleWf();
                    const s7 = await snap('ar-au-fr_CA-R-submitted-reload');
                    out.afterReload = {primary: flat(s7.info.primary, 1500), keys: s7.keys};
                    out.view = await cardWindow('ar-au-fr_CA-R-view', 'fr_CA', 'R', 'view');
                    if (out.view.pressed) out.view.left = await leaveWindow(T('Cancel', 'Close'));
                }
                try { out.db = sql(app, `select response_id, review_round_id, user_id, created_at from review_round_author_responses where review_round_id=${S.R.rounds[0].id}`); } catch (e) { out.db = String(e.message).slice(0, 200); }
                fact('ar:au:fr_CA:R:respond', {...out, ...since(m)});
                fact('ar:au:en:R:after', await readStage('ar-au-en-R-after', 'en', 'au', 'R'));
            }
        });
        // ------------------------------------------------------------ ar2: the editor after the Author's response (OJS)
        if ((on('ar') || on('ar2')) && isOJS) await sect('ar2', async () => {
            const readStage = async (label, lang, who, k) => {
                const m = mark();
                await page.goto(wfURL(lang, who, k, reviewKey(k))); await settleWf();
                const s = await snap(label);
                return {heading: s.info.heading, headings: s.info.headings, tables: s.info.tables, primary: flat(s.info.primary, 1500), keys: s.keys, ...since(m)};
            };
            if (on('ar2')) {
                await asUser('au');
                fact('ar:au:en:R:after', await readStage('ar-au-en-R-after', 'en', 'au', 'R'));
                try { fact('ar:db', sql(app, `select response_id, review_round_id, user_id, created_at from review_round_author_responses where review_round_id=${S.R.rounds[0].id}`)); } catch (e) { fact('ar:db', String(e.message).slice(0, 200)); }
            }
            // the editor: table after the response, the row's "…" menu, "View" (cancelled), "Delete" (cancelled)
            await asUser('mgr');
            for (const lang of ['fr_CA', 'en']) {
                const m = mark();
                const r = await readStage(`ar-mgr-${lang}-R-responded`, lang, 'mgr', 'R');
                const X = {read: r};
                // the "Author Response" table (named by its heading), not the Reviewers table above it
                const arTable = page.getByRole('table', {name: new RegExp(T('Author Response'))}).first();
                await loc(page, `review stage (${lang}): the Author Response table`, arTable);
                const btn = arTable.locator('tbody tr button[aria-haspopup]').first();
                if (await btn.count()) {
                    X.rowButton = (await btn.getAttribute('aria-label')) || (await btn.innerText());
                    await btn.click(); await page.waitForTimeout(800);
                    X.items = await menuItems();
                    const s = await snap(`ar-mgr-${lang}-R-rowmenu`);
                    X.menuKeys = s.keys;
                    let before = await windowCount(page);
                    await press(T('View'), 'doc', '[role=menuitem]');
                    await waitWindow(before, 15000);
                    const sv = await snap(`ar-mgr-${lang}-R-view`);
                    X.view = {windows: sv.info.windows, keys: sv.keys};
                    X.view.left = await leaveWindow(T('Cancel'));
                    await btn.click().catch(() => {}); await page.waitForTimeout(800);
                    before = await windowCount(page);
                    await press(T('Delete'), 'doc', '[role=menuitem]');
                    await waitWindow(before, 10000);
                    const sd = await snap(`ar-mgr-${lang}-R-delete`);
                    X.del = {windows: sv && sd.info.windows, keys: sd.keys};
                    X.del.left = await leaveWindow(T('Cancel'));
                    const sa = await snap(`ar-mgr-${lang}-R-delete-cancelled`);
                    X.del.after = {tables: sa.info.tables};
                } else X.rowButton = null;
                fact(`ar:mgr:${lang}:R:responded`, {...X, ...since(m)});
            }
        });

        // ------------------------------------------------------------ prod: the Production entry's notice box (R7-U33); OJS/OPS controls
        if (on('prod')) await sect('prod', async () => {
            const readProd = async (label, lang, who, k) => {
                const m = mark();
                await page.goto(wfURL(lang, who, k, isOPS ? null : 'workflow_5')); await settleWf();
                const s = await snap(label);
                return {heading: s.info.heading, headings: s.info.headings, primary: flat(s.info.primary, 1200), secondary: flat(s.info.secondary, 400), keys: s.keys, ...since(m)};
            };
            const prodSubs = isOPS ? ['S', 'D'] : ['P', 'D', ...(isOMP ? ['U'] : [])];
            for (const who of ['mgr', 'se', 'au']) {
                await asUser(who);
                for (const lang of ['fr_CA', 'en']) for (const k of prodSubs) fact(`prod:${who}:${lang}:${k}`, await readProd(`prod-${who}-${lang}-${k}`, lang, who, k));
            }
            if (!isOMP) return;
            await unpublishAndRead('U');
        });
        // ------------------------------------------------------------ prodq (OMP): the same on Q, published from Production
        if (on('prodq') && isOMP) await sect('prodq', async () => {
            const readProd = async (label, lang, who, k) => {
                const m = mark();
                await page.goto(wfURL(lang, who, k, 'workflow_5')); await settleWf();
                const s = await snap(label);
                return {heading: s.info.heading, headings: s.info.headings, primary: flat(s.info.primary, 1200), secondary: flat(s.info.secondary, 400), keys: s.keys, ...since(m)};
            };
            for (const who of ['mgr', 'au']) {
                await asUser(who);
                for (const lang of ['fr_CA', 'en']) fact(`prod:${who}:${lang}:Q`, await readProd(`prod-${who}-${lang}-Q`, lang, who, 'Q'));
            }
            await unpublishAndRead('Q', readProd);
        });
        async function unpublishAndRead(K, readProdQ) {
            const readProd = readProdQ || (async (label, lang, who, k) => {
                const m = mark();
                await page.goto(wfURL(lang, who, k, 'workflow_5')); await settleWf();
                const s = await snap(label);
                return {heading: s.info.heading, headings: s.info.headings, primary: flat(s.info.primary, 1200), secondary: flat(s.info.secondary, 400), keys: s.keys, ...since(m)};
            });
            const U = K;
            // "Unpublish" pressed in French from the publication's Title & Abstract page, then the notice re-read
            await asUser('mgr');
            const m = mark();
            await page.goto(wfURL('fr_CA', 'mgr', U, `publication_${S[U].pub}_titleAbstract`)); await settleWf();
            const before = await windowCount(page);
            const un = await press(T('Unpublish'), 'doc', 'button');
            await waitWindow(before, 15000);
            const s1 = await snap(`prod-mgr-fr_CA-${U}-unpublish-dialog`);
            const c = await press(T('Unpublish', 'Confirm', 'OK'), 'win', 'button');
            await page.waitForTimeout(2500); await idle(page); await stable();
            const s2 = await snap(`prod-mgr-fr_CA-${U}-unpublished`);
            const same = await readProd(`prod-mgr-fr_CA-${U}-after-unpublish`, 'fr_CA', 'mgr', U);
            await page.reload(); await settleWf();
            const s3 = await snap(`prod-mgr-fr_CA-${U}-after-unpublish-reload`);
            fact(`prod:mgr:fr_CA:${U}:unpublish`, {button: un, dialog: s1.info.windows, dialogKeys: s1.keys, confirm: c, controlsAfter: flat(s2.info.headerText, 300), after: same, afterReload: {primary: flat(s3.info.primary, 1200), keys: s3.keys},
                status: sql(app, `select publication_id, status from publications where submission_id=${S[U].id}`), ...since(m)});
            for (const who of ['au', 'mgr']) {
                await asUser(who);
                for (const lang of ['fr_CA', 'en']) fact(`prod:${who}:${lang}:${U}-unpublished`, await readProd(`prod-${who}-${lang}-${U}-unpublished`, lang, who, U));
            }
            fact(`prod:${U}:stage`, sql(app, `select stage_id, status from submissions where submission_id=${S[U].id}`));
        }
    } finally {
        record(`facts-${PHASES.join('+')}`, {facts, errors: errs, bad, browserDialogs}, {merge: true});
        await close();
    }
});
