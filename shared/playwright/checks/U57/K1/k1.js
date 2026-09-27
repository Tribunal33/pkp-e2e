// U57 claim check, chunk K1: the site's languages.
// Spec: docs/specs/U57-languages-and-locales.md — Purpose, Actors & permissions, Fields (the site's
// "Languages" list and the "Install Locale" window) (10–77), Rules 1–6 (115–178), Rule 8's
// one-language site (192–193), Rule 21b (329–330), Side effects of the site-level changes (332–351),
// Setting 3 (376–379), register A1 (519–532), OMP1 (603–615); footnotes a, b, c, d, e, f, g, k, m, n,
// o, q, r, t, f-a1, f-omp1.
//
//   PROBE_FEATURE=U57 PROBE_AGENT=ccK1 node bin/probe.js <app|all> shared/playwright/checks/U57/K1/k1.js
//   PHASES=seed,read,a1,a1b,a1c,install,emails1,enable,primary,remove,emails2,onelang,onelang2,readfr,a1enable,script,rtl,sidebar,allinstall,allremove,final
//   (default: every phase in that order; allinstall and allremove are resumable: rerun each until the window reads
//   "No additional locales…" and only en and fr_CA are left, BATCH=6 languages per Save). Each app is its own installation, so the three apps may run as
//   three processes side by side; a phase stays under the Bash tool's 600 s cap when run alone per app.
//   Later phases read k1-state-<app>.json (written by seed).
//
// This chunk CHANGES THE SITE'S OWN LANGUAGES (installs German, Spanish, Arabic, both Chinese scripts and, in allinstall, every
// language the installation ships; enables/disables; changes the site's primary language; removes), which
// every journal on the fleet sees: run it with no other agent on the fleets. Every phase puts back what
// it changed; `final` reads the site's list (English and French (Canada) installed and enabled, English
// primary) and the seeded journal's "Languages" tab after a reload as proof. The onelang phase disables
// French for a moment, which strips French from every journal (Rule 3a); it ticks French "UI" back on
// `publicknowledge` as manager.maya (the seed state: English and French under "UI", English alone
// under "Forms" and "Submissions").
//
// Scratch contexts per app (tag prefix u57k1):
//   J1 en+fr_CA. Users mg, au, nm (reader, English names only), ed/pe (OJS/OMP).  install, enable, remove, Actors rows 4–5
//   J2 defaults (en). Users mg, au.                                               a1 (A1, Rule 3c)
//   J3 defaults (en). Users mg, au.                                               a1 (the "Default" variant)
//   J4 en, sidebar Language Toggle Block. Users mg.                               rtl (Rule 21b)
//   J5 en+fr_CA. Users mg.                                                        emails1/emails2 (note r)
//   J6 en. Users mg.                                                              enable (Rule 3a: a journal whose primary was German)
//   J7 (OJS/OMP) editor + productionEditor with permitSettings false. Users ed, pe.   read (Actors row 4)
//   JH created on Hosted Journals by admin while the site has one language            onelang (Rule 8)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'read', 'a1', 'a1b', 'a1c', 'install', 'emails1', 'enable', 'primary', 'remove', 'emails2', 'onelang', 'onelang2', 'readfr', 'a1enable', 'script', 'rtl', 'sidebar', 'allinstall', 'allremove', 'final'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
const KEEP = ['en', 'fr_CA'];

// ---------------------------------------------------------------------------------------------
// page instrumentation: notices (text and box), browser dialogs, console errors, failed responses
async function instrument(page, log) {
    const ev = {dialogs: [], errs: [], bad: []};
    page.on('dialog', (d) => {
        ev.dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 400)});
        log('[browser dialog]', d.type(), flat(d.message(), 200));
        d.accept().catch(() => {});
    });
    page.on('console', (m) => { if (m.type() === 'error') ev.errs.push({at: Date.now(), t: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => ev.errs.push({at: Date.now(), t: `pageerror: ${String(e.message).slice(0, 300)}`}));
    page.on('response', (r) => { if (r.status() >= 400) ev.bad.push({at: Date.now(), s: r.status(), m: r.request().method(), u: r.url().replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, '').slice(0, 200)}); });
    await page.context().addInitScript(() => {
        window.__notices = [];
        const seen = new WeakSet();
        const sweep = () => {
            document.querySelectorAll('.ui-pnotify, [class*="pnotify"], .pkpNotification, .pkp_notification, [role="alert"], [class*="toast"], [class*="Toast"]').forEach((e) => {
                const t = (e.innerText || '').trim();
                if (t && !seen.has(e)) {
                    seen.add(e);
                    const r = e.getBoundingClientRect();
                    window.__notices.push({t: t.slice(0, 300), at: Date.now(), cls: String(e.className).slice(0, 80),
                        box: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth}});
                }
            });
        };
        new MutationObserver(sweep).observe(document, {subtree: true, childList: true, characterData: true});
    });
    ev.since = async (t0) => {
        const raw = await page.evaluate((s) => (window.__notices || []).filter((n) => n.at >= s), t0).catch(() => []);
        const notices = [...new Set(raw.map((n) => n.t))].filter((t) => !/^(Saving|Loading)/.test(t));
        return {
            notices,
            noticeBoxes: raw.filter((n) => !/^(Saving|Loading)/.test(n.t)).slice(0, 4).map((n) => ({t: n.t.slice(0, 80), cls: n.cls, box: n.box})),
            dialogs: ev.dialogs.filter((d) => d.at >= t0).map((d) => `${d.type}: ${d.message}`),
            errs: ev.errs.filter((d) => d.at >= t0).map((d) => d.t),
            bad: ev.bad.filter((d) => d.at >= t0 && !/plugin-gallery-grid/.test(d.u)).map((d) => `${d.s} ${d.m} ${d.u}`),
        };
    };
    return ev;
}

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// ------------------------------------------------------------------ the journal's "Languages" tab (K2's helpers)
async function landLanguages(page, url) {
    const resp = await page.goto(url).catch((e) => ({error: String(e.message)}));
    await idle(page).catch(() => {});
    const setup = page.locator('#setup-button').first();
    if (await setup.count()) {
        if ((await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click().catch(() => {});
    }
    const tab = page.locator('#languages-button').filter({visible: true}).first();
    if (await tab.count()) await tab.click().catch(() => {});
    await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
    await page.locator('#submissionLanguageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(400);
    return resp && resp.status ? resp.status() : null;
}
async function readGrids(page) {
    const readGrid = (c) => {
        if (!c) return null;
        return {
            title: ((c.querySelector('h4') || {}).innerText || '').trim() || null,
            head: [...c.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
            actions: [...c.querySelectorAll('.header a')].filter((a) => a.getClientRects().length).map((a) => a.innerText.trim()).filter(Boolean),
            rows: [...c.querySelectorAll('tbody tr.gridRow')].map((r) => {
                const code = r.id.replace(/^.*-row-/, '');
                const ctl = document.getElementById(`${r.id}-control-row`);
                const cells = {};
                r.querySelectorAll('input[type=checkbox], input[type=radio]').forEach((b) => {
                    const k = (b.id.match(/-(contextPrimary|uiLocale|formLocale|defaultSubmissionLocale|submissionLocale|submissionMetadataLocale)/) || [])[1] || b.id;
                    cells[k] = (b.checked ? 'X' : '-') + (b.disabled ? '(dis)' : '');
                });
                return {code, text: [...r.querySelectorAll('td')].map((td) => td.innerText.trim()).filter(Boolean).join(' | '),
                    cells, arrow: !!r.querySelector('a.show_extras'), rowActions: ctl ? [...ctl.querySelectorAll('a')].map((a) => a.innerText.trim()).filter(Boolean) : []};
            }),
        };
    };
    return page.evaluate((fnSrc) => {
        const f = eval(`(${fnSrc})`);
        return {site: f(document.querySelector('#languageGridContainer')), sub: f(document.querySelector('#submissionLanguageGridContainer'))};
    }, readGrid.toString()).catch((e) => ({error: String(e.message).slice(0, 200)}));
}
const gridLine = (g) => {
    if (!g || g.error) return JSON.stringify(g);
    const one = (x) => (x ? `${x.title} [${x.head.join(',')}]${x.actions.length ? ` actions=${x.actions.join('/')}` : ''} ` + x.rows.map((r) => `${r.code}:${Object.values(r.cells).join('')}${r.arrow ? '>' : ''}`).join(' ') : 'none');
    return `${one(g.site)} || ${one(g.sub)}`;
};
const cellSel = (grid, code, col) => `#${grid === 'sub' ? 'submissionLanguageGridContainer' : 'languageGridContainer'} input[id^="select-cell-${code}-${col}"]`;

// ------------------------------------------------------------------ the site's "Languages" list
async function readSite(page) {
    return page.evaluate(() => {
        const c = document.querySelector('#languageGridContainer');
        if (!c) return null;
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const rows = [...c.querySelectorAll('tbody tr.gridRow')].map((r) => {
            const code = r.id.replace(/^.*-row-/, '');
            const ctl = document.getElementById(`${r.id}-control-row`);
            const en = r.querySelector('input[id*="-enable"]');
            const pr = r.querySelector('input[id*="-sitePrimary"]');
            const tds = [...r.querySelectorAll('td')];
            const arrow = r.querySelector('a.show_extras, a.hide_extras');
            return {code, locale: txt(tds[1]), codeCell: txt(tds[2]),
                enable: en ? (en.checked ? 'X' : '-') + (en.disabled ? '(dis)' : '') : null,
                primary: pr ? (pr.checked ? 'X' : '-') + (pr.disabled ? '(dis)' : '') : null,
                arrow: arrow ? {label: txt(arrow), inFirstCell: !!(tds[0] && tds[0].contains(arrow))} : null,
                rowActions: ctl ? [...ctl.querySelectorAll('a')].map((a) => txt(a)).filter(Boolean) : [],
                asterisk: !!(tds[1] && tds[1].querySelector('.pkp_form_error'))};
        });
        const all = c.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
        return {
            title: txt(c.querySelector('h4')),
            head: [...c.querySelectorAll('thead th')].map((th) => txt(th)),
            actions: [...c.querySelectorAll('.header a')].filter((a) => a.getClientRects().length).map((a) => txt(a)),
            rows,
            foot: all.filter((s) => /incomplete|Marked/i.test(s)),
            buttons: [...(document.querySelector('#languages') || c).querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => txt(b)).filter(Boolean),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}
const siteLine = (s) => (!s || s.error ? JSON.stringify(s) : `${s.title} [${(s.head || []).join(',')}] ` + s.rows.map((r) => `${r.code}(${r.locale}):E${r.enable}P${r.primary}${r.arrow ? '>' : ''}${r.rowActions.length ? `{${r.rowActions.join('/')}}` : ''}`).join(' ') + ` foot=${JSON.stringify(s.foot)}`);

async function openInitials(page) {
    const btn = page.locator('[data-cy="app-user-nav"] button').first();
    if (!(await btn.count())) return {present: false};
    await btn.click().catch(() => {});
    await sleep(600);
    const menu = page.locator('[data-cy="app-user-nav"] nav').first();
    const info = await menu.evaluate((n) => ({text: n.innerText.replace(/\n+/g, ' | '),
        links: [...n.querySelectorAll('a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim())})).catch((e) => ({error: String(e).slice(0, 200)}));
    await btn.click().catch(() => {});
    await sleep(300);
    return {present: true, ...info};
}

async function landing(page, url) {
    const resp = await page.goto(url).catch((e) => ({error: String(e.message)}));
    await idle(page).catch(() => {});
    const h1 = await page.locator('h1').first().innerText().catch(() => null);
    const body = flat(await page.locator('body').innerText().catch(() => ''), 400);
    return {finalUrl: page.url().replace(/^https?:\/\/[^/]+/, ''), status: resp && resp.status ? resp.status() : resp, h1: flat(h1, 120), body,
        lang: await page.evaluate(() => document.documentElement.getAttribute('lang')).catch(() => null),
        loginForm: await page.locator('input[name="username"], #username').count(),
        denied: /does not have access|not authori[sz]ed|access denied|You don't have access|permission/i.test(body || '')};
}

const editors = (page) => page.evaluate(() => {
    const m = window.tinymce; if (!m) return {};
    const out = {}; m.get().forEach((e) => { out[e.id] = (e.getContent() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200); });
    return out;
}).catch(() => ({}));

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[k1 ${app.name}]`, ...a);
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const cu = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const PK = app.contextPath;
    const siteUrl = app.url('/index.php/index/admin/settings');

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u57k1');
        S.t = t;
        const mk = async (k, spec) => {
            const p = `${t}${k}`;
            for (let i = 0; i < 3; i++) {
                const pp = `${p}${i ? `r${i}` : ''}`;
                try {
                    const r = await app.api.createContext({tag: pp, ...spec(pp)});
                    log('seed', k, JSON.stringify(r).slice(0, 300));
                    return {path: r.path || pp, id: r.contextId || r.id || (r.context && r.context.id) || null};
                } catch (e) { log('seed FAILED', k, i, String(e.message).slice(0, 400)); await sleep(1500); }
            }
            return {error: true};
        };
        const base = (p, name) => ({name: `U57 K1 ${name} ${p}`, acronym: 'KONE', contactName: 'K1 Contact', contactEmail: `${p}c@mail.test`});
        const MG = (p) => ({username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'});
        const AU = (p) => ({username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'});
        const bi = {supportedLocales: ['en', 'fr_CA']};
        S.J1 = await mk('a', (p) => ({context: {...base(p, 'J1'), ...bi}, users: [MG(p), AU(p),
            {username: `${p}nm`, roles: ['reader'], givenName: 'Nora', familyName: 'Namecopy'},
            ...(isOPS ? [] : [{username: `${p}ed`, roles: ['editor']}, {username: `${p}pe`, roles: ['productionEditor']}])]}));
        S.J2 = await mk('b', (p) => ({context: base(p, 'J2'), users: [MG(p), AU(p)]}));
        S.J3 = await mk('c', (p) => ({context: base(p, 'J3'), users: [MG(p), AU(p)]}));
        S.J4 = await mk('d', (p) => ({context: {...base(p, 'J4'), supportedLocales: ['en']}, sidebar: ['languagetoggleblockplugin'], users: [MG(p)]}));
        S.J5 = await mk('e', (p) => ({context: {...base(p, 'J5'), ...bi}, users: [MG(p)]}));
        S.J6 = await mk('f', (p) => ({context: {...base(p, 'J6'), supportedLocales: ['en']}, users: [MG(p)]}));
        if (!isOPS) S.J7 = await mk('g', (p) => ({context: base(p, 'J7'), roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}},
            users: [MG(p), {username: `${p}ed`, roles: ['editor']}, {username: `${p}pe`, roles: ['productionEditor']}]}));
        for (const k of ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7']) if (S[k] && S[k].path) S[k].u = Object.fromEntries(['mg', 'au', 'nm', 'ed', 'pe'].map((x) => [x, `${S[k].path}${x}`]));
        S.seeded = true;
        save();
        record('seed', S);
    }
    if (!S.seeded) { log('no state; run seed first'); return; }
    if (PHASES.length === 1 && PHASES[0] === 'seed') return;

    // two browsers: `page` for the Site Administrator, `up` for everyone else
    const A = await launch(app);
    const U = await launch(app);
    const page = A.page; const up = U.page;
    const ev = await instrument(page, log);
    const evu = await instrument(up, log);
    const asU = async (user, ctx) => { await signIn(up, user, ctx ? {contextPath: ctx} : undefined); await idle(up).catch(() => {}); };
    await signIn(page, 'admin'); await idle(page).catch(() => {});

    async function sect(name, fn) {
        const t0 = Date.now();
        try { const r = await fn(); log(`[${name} done in ${Math.round((Date.now() - t0) / 1000)} s]`); return r; } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(page, `zz-failed-${name}`).catch(() => {});
            await snap(up, `zz-failed-${name}-user`).catch(() => {});
            return null;
        }
    }

    // ---------------------------------------------------------------- site list helpers (admin page)
    async function landSite(p = page) {
        const resp = await p.goto(siteUrl).catch((e) => ({error: String(e.message)}));
        await idle(p).catch(() => {});
        await p.locator('#setup-button').first().click().catch(() => {}); await idle(p).catch(() => {});
        await p.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
        await p.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(p).catch(() => {}); await sleep(500);
        return resp && resp.status ? resp.status() : null;
    }
    const siteCell = (code, col) => page.locator(`#languageGridContainer input[id^="select-cell-${code}-${col}"]`).first();
    const siteRow = (code) => page.locator(`#languageGridContainer tr.gridRow[id$="-row-${code}"]`).first();
    // a legacy confirmation: read it, then answer
    async function question(p, answer) {
        const d = p.locator('[role=dialog]:visible, [data-cy="dialog"]:visible').last();
        const present = await d.waitFor({timeout: 8000}).then(() => true).catch(() => false);
        if (!present) return {present: false};
        await sleep(400);
        const q = await d.evaluate((x) => ({
            title: ((x.querySelector('h1, h2, h3, .pkp_modal_title, [class*="title"]') || {}).innerText || '').trim() || null,
            text: x.innerText.replace(/\s+/g, ' ').trim().slice(0, 700),
            buttons: [...x.querySelectorAll('button, a.pkp_button, a.cancelButton, a')].filter((b) => b.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean),
        })).catch((e) => ({error: String(e.message)}));
        if (answer === 'cancel') {
            await d.getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(async () => { await d.getByRole('link', {name: /^Cancel$/}).first().click().catch(() => {}); });
        } else {
            const btns = d.getByRole('button');
            const n = await btns.count();
            for (let i = 0; i < n; i++) {
                const b = btns.nth(i);
                const t = ((await b.innerText().catch(() => '')) || '').trim();
                if (t && !/^(Cancel|Close|No|×)$/i.test(t) && await b.isVisible().catch(() => false)) { q.pressed = t; await b.click().catch(() => {}); break; }
            }
        }
        await sleep(900);   // the modal store's 450 ms slot
        return {present: true, answer, ...q};
    }
    // a site-list action: click, answer the question if one comes, read the list on the same page and after a reload
    async function siteAct(name, doClick, {answer = 'ok', expectQuestion = true, reload = true, timeout = 240000} = {}) {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /admin-language-grid/.test(r.url()), {timeout}).catch(() => null);
        await doClick();
        const q = expectQuestion ? await question(page, answer) : null;
        let r = null;
        if (q && q.present && answer === 'cancel') await sleep(1500); else r = await w;
        await idle(page).catch(() => {}); await sleep(1500);
        const e = await ev.since(t0);
        const same = await readSite(page);
        await snap(page, `${name}-same`, {question: q, status: r && r.status(), ms: Date.now() - t0, ...e, site: same});
        let rel = null;
        if (reload) { await landSite(); rel = await readSite(page); await snap(page, `${name}-reload`, {site: rel}); }
        const out = {question: q, status: r ? r.status() : null, url: r ? r.url().replace(/^.*\$\$\$call\$\$\$/, '').replace(/csrfToken=[^&]+/, '').slice(0, 160) : null,
            ms: Date.now() - t0, ...e, same: siteLine(same), reload: rel && siteLine(rel)};
        log(`[${name}]`, JSON.stringify({...out, same: undefined, reload: undefined}).slice(0, 1500), '\n   same:', out.same, '\n   reload:', out.reload);
        return out;
    }
    const pressEnable = (code, name, opt) => siteAct(name, () => siteCell(code, 'enable').click(), opt);
    const pressPrimary = (code, name, opt) => siteAct(name, () => siteCell(code, 'sitePrimary').click(), opt);
    async function rowArrow(code, name) {
        const row = siteRow(code);
        const a = row.locator('a.show_extras').first();
        const out = {arrow: await a.count()};
        if (out.arrow) {
            out.label = flat(await a.innerText().catch(() => ''), 40);
            await a.click().catch(() => {}); await sleep(500);
            out.links = await page.locator(`#languageGridContainer tr[id$="-row-${code}-control-row"] a`).evaluateAll((as) => as.filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
        }
        await snap(page, name, {arrow: out});
        return out;
    }
    async function removeRow(code, name, {answer = 'ok', reload = true} = {}) {
        await landSite();
        const row = siteRow(code);
        if (!(await row.count())) return {absent: true};
        await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(400);
        return siteAct(name, () => page.locator(`#languageGridContainer tr[id$="-row-${code}-control-row"] a`).filter({hasText: /^\s*Remove\s*$/}).first().click(), {answer, reload});
    }
    async function openInstall(name) {
        await landSite();
        await page.locator('#languageGridContainer .header a').filter({hasText: 'Install Locale'}).first().click();
        const f = page.locator('form#installLanguageForm').first();
        await f.waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(600);
        const info = await f.evaluate((x) => {
            const boxes = [...x.querySelectorAll('input[type=checkbox]')];
            const lab = (b) => ((x.querySelector(`label[for="${b.id}"]`) || b.closest('label, li') || {}).innerText || '').replace(/\s+/g, ' ').trim();
            return {
                texts: [...x.querySelectorAll('legend, h2, h3, h4, .label, p, .description, .pkp_helpers_description, span.sub_label')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8),
                all: x.innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
                count: boxes.length,
                values: boxes.map((b) => b.value),
                sample: boxes.filter((b) => ['de', 'es', 'ar', 'en', 'fr_CA', 'fr', 'pt_BR', 'und'].includes(b.value)).map((b) => `${b.value}=${lab(b)}`),
                labels: boxes.map((b) => lab(b)),
                buttons: [...x.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean),
            };
        }).catch((e) => ({error: String(e.message)}));
        info.dialogTitle = flat(await page.locator('[role=dialog]:visible').last().locator('h1, h2').first().innerText().catch(() => null), 80);
        await snap(page, name, {win: {...info, labels: undefined}, labels: info.labels});
        log(`[${name}]`, JSON.stringify({...info, labels: undefined, values: undefined}).slice(0, 1500));
        return {f, info};
    }
    async function installSave(f, name, codes, {timeout = 560000} = {}) {
        for (const c of codes) {
            const b = f.locator(`input[type=checkbox][value="${c}"]`).first();
            if (await b.count()) await b.check().catch(() => {});
        }
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /save-install-locale|saveInstallLocale/.test(r.url()), {timeout}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await w;
        await idle(page).catch(() => {}); await sleep(2000);
        const e = await ev.since(t0);
        const open = await f.isVisible().catch(() => false);
        const same = await readSite(page);
        await snap(page, `${name}-same`, {status: r && r.status(), ms: Date.now() - t0, windowOpen: open, ...e, site: same});
        await landSite();
        const rel = await readSite(page);
        await snap(page, `${name}-reload`, {site: rel});
        const out = {status: r ? r.status() : null, ms: Date.now() - t0, windowOpen: open, ...e, same: siteLine(same), reload: siteLine(rel)};
        log(`[${name}]`, JSON.stringify({...out, same: undefined, reload: undefined}).slice(0, 1200), '\n   same:', out.same, '\n   reload:', out.reload);
        return out;
    }
    async function install(codes, name) {
        const {f, info} = await openInstall(`${name}-window`);
        const missing = codes.filter((c) => !info.values || !info.values.includes(c));
        if (missing.length === codes.length) return {skipped: 'not offered', missing};
        return installSave(f, name, codes);
    }
    // ---------------------------------------------------------------- journal side (user page)
    const langUrl = (ctx) => cu(ctx, '/management/settings/website');
    async function jgrid(user, ctx, name) {
        if (user) await asU(user, ctx);
        await landLanguages(up, langUrl(ctx));
        const g = await readGrids(up);
        await snap(up, name, {grids: g});
        log(`[${name}]`, gridLine(g));
        return gridLine(g);
    }
    async function jpress(ctx, grid, code, col, name) {
        const sel = cellSel(grid, code, col);
        const box = up.locator(sel).first();
        const out = {found: await box.count()};
        if (!out.found) { out.grids = gridLine(await readGrids(up)); log(`[${name}] no box`, sel, out.grids); return out; }
        out.before = await box.isChecked().catch(() => null);
        const t0 = Date.now();
        const w = up.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 60000}).catch(() => null);
        await box.click();
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(up).catch(() => {}); await sleep(1500);
        Object.assign(out, await evu.since(t0));
        out.same = gridLine(await readGrids(up));
        await snap(up, name, {press: out});
        log(`[${name}]`, JSON.stringify({status: out.status, before: out.before, notices: out.notices, dialogs: out.dialogs, bad: out.bad}), out.same);
        return out;
    }
    async function openAdd() {
        await up.locator('#submissionLanguageGridContainer .header a[id*="addLanguageModal"]').first().click();
        const f = up.locator('form#addLanguageForm').first();
        await f.waitFor({timeout: T}).catch(() => {});
        await idle(up).catch(() => {}); await sleep(600);
        return f;
    }
    async function addSubLangs(ctx, codes, name) {
        await landLanguages(up, langUrl(ctx));
        const f = await openAdd();
        for (const c of codes) { const b = f.locator(`input[type=checkbox][value="${c}"]`).first(); if (await b.count() && !(await b.isChecked())) await b.click(); }
        const t0 = Date.now();
        await f.getByRole('button', {name: 'Save', exact: true}).first().click();
        await sleep(2500); await idle(up).catch(() => {});
        const o = {...(await evu.since(t0)), grids: gridLine(await readGrids(up))};
        await snap(up, name, {add: o});
        log(`[${name}]`, JSON.stringify(o).slice(0, 800));
        return o;
    }
    async function wizardLangs(user, ctx, name) {
        await asU(user, ctx);
        await up.goto(cu(ctx, '/submission')); await idle(up).catch(() => {}); await sleep(800);
        const o = await up.evaluate(() => ({
            url: location.pathname + location.search,
            langRadios: [...document.querySelectorAll('input[type=radio]')].filter((r) => /locale|language/i.test(r.name)).map((r) => `${r.value}:${r.checked ? 'X' : '-'}:${(r.closest('label')?.innerText || '').trim()}`),
            langLegend: [...document.querySelectorAll('legend, .pkpFormFieldLabel')].map((e) => e.innerText.trim()).filter((t) => /language/i.test(t)),
        })).catch((e) => ({error: String(e.message)}));
        await snap(up, name, {wizard: o});
        log(`[${name}]`, JSON.stringify(o));
        return o;
    }
    // a signed-out visitor in a fresh browser (optionally with a preferred language)
    async function visitor(url, name, {acceptLanguage, extra} = {}) {
        const V = await launch(app);
        try {
            if (acceptLanguage) await V.context.setExtraHTTPHeaders({'Accept-Language': acceptLanguage});
            const l = await landing(V.page, url);
            const more = extra ? await V.page.evaluate(extra).catch((e) => ({error: String(e.message)})) : {};
            await snap(V.page, name, {landing: l, more});
            const o = {finalUrl: l.finalUrl, status: l.status, lang: l.lang, h1: l.h1, body: flat(l.body, 200), ...more};
            log(`[${name}]`, JSON.stringify(o).slice(0, 1200));
            return o;
        } finally { await V.close(); }
    }
    // the profile: Identity name boxes, Contact "Working Languages"
    async function profile(user, ctx, name) {
        await asU(user, ctx);
        await up.goto(app.url('/index.php/index/user/profile')); await idle(up).catch(() => {});
        await up.locator('#profileTabs input[name^="givenName"]').first().waitFor({timeout: 20000}).catch(() => {});
        await sleep(600);
        const o = {url: up.url().replace(/^https?:\/\/[^/]+/, '')};
        o.identity = await up.evaluate(() => [...document.querySelectorAll('#profileTabs input[name^="givenName"], #profileTabs input[name^="familyName"], #profileTabs input[name^="preferredPublicName"]')].map((i) => `${i.name}=${i.value}`)).catch(() => []);
        await snap(up, `${name}-identity`, {identity: o.identity});
        await up.locator('#profileTabs a[name="contact"]').first().click().catch(() => {});
        await up.locator('#profileTabs input[name="email"]').first().waitFor({timeout: 20000}).catch(() => {});
        await idle(up).catch(() => {}); await sleep(600);
        o.working = await up.evaluate(() => {
            const boxes = [...document.querySelectorAll('#profileTabs input[name="locales[]"]')];
            const sec = boxes.length ? boxes[0].closest('.section, fieldset, div') : null;
            return {boxes: boxes.map((b) => `${b.value}=${((document.querySelector(`label[for="${b.id}"]`) || b.closest('label') || {}).innerText || '').trim()}`),
                heading: /Working Languages/.test(document.querySelector('#profileTabs')?.innerText || '') ? 'Working Languages' : null, sec: sec ? sec.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : null};
        }).catch((e) => ({error: String(e.message)}));
        await snap(up, `${name}-contact`, {working: o.working});
        log(`[${name}]`, JSON.stringify(o));
        return o;
    }
    // the site's own per-language fields: Site Setup › Settings form's language buttons (admin page)
    async function siteFormLocales(name) {
        await page.goto(siteUrl); await idle(page).catch(() => {});
        await page.locator('#setup-button').first().click().catch(() => {});
        await page.locator('#settings-button').filter({visible: true}).first().click().catch(() => {});
        await idle(page).catch(() => {}); await sleep(600);
        const o = await page.locator('#settings').first().evaluate((p) => ({
            localeButtons: [...p.querySelectorAll('.pkpFormLocales button')].map((b) => b.innerText.trim()),
            multilingualInputs: [...p.querySelectorAll('input[id*="-control-"]')].map((i) => i.id.replace(/^.*-control-/, '')).filter((v, i, a) => a.indexOf(v) === i),
        })).catch((e) => ({error: String(e.message)}));
        await snap(page, name, {siteForm: o});
        log(`[${name}]`, JSON.stringify(o));
        return o;
    }
    // Rule 1: what an installed language reaches, enabled or not
    async function rule1(label) {
        const o = {};
        o.J1 = await jgrid(S.J1.u.mg, S.J1.path, `${label}-J1-languages`);
        o.siteDe = await visitor(app.url('/index.php/index/de'), `${label}-visitor-site-de`);
        o.siteForm = await siteFormLocales(`${label}-site-settings-form`);
        o.profile = await profile(S.J1.u.nm, S.J1.path, `${label}-nm-profile`);
        return o;
    }

    try {
        // ============================================================ read: the list as it arrives; every level
        if (on('read')) await sect('read', async () => {
            const out = {};
            await landSite();
            out.site = await readSite(page);
            await snap(page, 'r-01-site-languages', {site: out.site});
            log('[site]', siteLine(out.site));
            out.enArrow = await rowArrow('en', 'r-02-en-arrow');
            await landSite();
            out.frArrow = await rowArrow('fr_CA', 'r-03-fr-arrow');
            await loc(page, 'Site Settings › Site Setup › Languages: the list', page.locator('#languageGridContainer').first());
            await loc(page, 'Site Languages: "Install Locale"', page.locator('#languageGridContainer .header a').filter({hasText: 'Install Locale'}).first());
            await loc(page, 'Site Languages: English "Enable" box', siteCell('en', 'enable'));
            await loc(page, 'Site Languages: French "Primary locale" radio', siteCell('fr_CA', 'sitePrimary'));
            await loc(page, 'Site Languages: French row arrow', siteRow('fr_CA').locator('a.show_extras, a.hide_extras').first());
            // the admin at a journal's address
            out.adminAtJournal = await landing(page, cu(PK, '/admin/settings'));
            await snap(page, 'r-04-admin-at-journal-address', {landing: out.adminAtJournal});
            // every other level types the site's address; the journal's Settings; a French address
            const levels = [['manager', 'manager.maya'], ['editor', isOPS ? null : 'editor.diana'], ['sectionEditor', 'sectioneditor.ana'],
                ['assistant', isOPS ? 'assistant.rita' : 'copyeditor.carla'], ['reviewer', isOPS ? null : 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa'],
                ['J1 productionEditor', isOPS ? null : S.J1.u.pe, S.J1.path], ['J1 editor', isOPS ? null : S.J1.u.ed, S.J1.path],
                ['J7 editor permit off', isOPS ? null : S.J7 && S.J7.u.ed, S.J7 && S.J7.path], ['J7 productionEditor permit off', isOPS ? null : S.J7 && S.J7.u.pe, S.J7 && S.J7.path]];
            out.levels = {};
            let i = 5;
            for (const [lvl, u, ctx] of levels) {
                if (!u) continue;
                await asU(u, ctx);
                const o = {};
                const tagName = lvl.replace(/\W+/g, '-');
                const l1 = await landing(up, siteUrl);
                o.siteSettings = {finalUrl: l1.finalUrl, status: l1.status, h1: l1.h1, body: flat(l1.body, 160), loginForm: l1.loginForm};
                await snap(up, `r-${String(i).padStart(2, '0')}-${tagName}-site-settings`, {landing: l1});
                const l2 = await landing(up, langUrl(ctx || PK));
                o.journalSettings = {finalUrl: l2.finalUrl, status: l2.status, h1: l2.h1, body: flat(l2.body, 160)};
                if (/settings\/website/.test(l2.finalUrl) && !/access|denied/i.test(l2.body || '')) {
                    await landLanguages(up, langUrl(ctx || PK));
                    const g = await readGrids(up);
                    o.grid = gridLine(g);
                }
                await snap(up, `r-${String(i).padStart(2, '0')}-${tagName}-journal-languages`, {landing: l2, grid: o.grid});
                const l3 = await landing(up, cu(ctx || PK, '/fr_CA/about'));
                o.frAbout = {finalUrl: l3.finalUrl, lang: l3.lang, h1: l3.h1};
                await snap(up, `r-${String(i).padStart(2, '0')}-${tagName}-fr-about`, {landing: l3});
                await landing(up, cu(ctx || PK, '/en/about'));
                out.levels[lvl] = o;
                log(`[level ${lvl}]`, JSON.stringify(o).slice(0, 700));
                i++;
            }
            // Actors row 5: the Site Administrator's and the managers' arrows on J1's list
            await landLanguages(page, langUrl(S.J1.path));
            const row = page.locator('#languageGridContainer tr.gridRow[id$="-row-en"]').first();
            out.adminJ1Arrow = {arrow: await row.locator('a.show_extras').count()};
            if (out.adminJ1Arrow.arrow) {
                await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(500);
                out.adminJ1Arrow.links = await page.locator('#languageGridContainer tr[id$="-row-en-control-row"] a').evaluateAll((as) => as.filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
            }
            await snap(page, 'r-30-admin-J1-en-arrow', {arrow: out.adminJ1Arrow});
            out.mgJ1 = await jgrid(S.J1.u.mg, S.J1.path, 'r-31-mg-J1-languages');
            // Setting 3: the site's Sidebar as it arrives (read only)
            await page.goto(siteUrl); await idle(page);
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
            out.siteSidebar = await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => `${e.value}:${e.checked ? 'X' : '-'}:${(e.closest('label') || e.parentElement).innerText.trim()}`)).catch(() => []);
            await snap(page, 'r-32-site-appearance-setup', {sidebar: out.siteSidebar});
            // the site's home, signed out, as it arrives
            out.siteHome = await visitor(app.url('/index.php/index'), 'r-33-visitor-site-home', {extra: () => ({block: (document.querySelector('.block_language') || {}).innerText || null, dir: document.documentElement.getAttribute('dir')})});
            fact('read', out);
        });

        // ============================================================ a1: A1 and Rule 3c through an install and a removal of Spanish
        if (on('a1')) await sect('a1', async () => {
            const out = {};
            // the Install window as it opens; leave it with a box ticked and not saved
            let {f, info} = await openInstall('a-01-install-window');
            out.window = {...info, labels: undefined, values: undefined};
            await loc(page, 'Install Locale window: form', f);
            await loc(page, 'Install Locale window: German box', f.locator('input[type=checkbox][value="de"]').first());
            const de = f.locator('input[type=checkbox][value="de"]').first();
            await de.check().catch(() => {});
            await de.blur().catch(() => {});
            const t0 = Date.now();
            const dlg = page.locator('[role=dialog]:visible').last();
            const closeBtn = dlg.getByRole('button', {name: /^(Close|Cancel)$/}).first();
            out.leaveCloseLabel = await closeBtn.innerText().catch(() => null);
            if (await closeBtn.count()) await closeBtn.click().catch(() => {}); else await dlg.getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(1500);
            out.leave = {...(await ev.since(t0)), windowOpen: await f.isVisible().catch(() => false)};
            await snap(page, 'a-02-install-window-left-unsaved', {leave: out.leave});
            if (out.leave.windowOpen) { await page.goto(app.url('/index.php/index/admin')).catch(() => {}); await idle(page).catch(() => {}); }
            out.afterLeave = siteLine(await (async () => { await landSite(); return readSite(page); })());
            // an empty "Save"
            ({f} = await openInstall('a-03-install-window-before-empty'));
            out.emptySave = await installSave(f, 'a-04-install-empty-save', []);
            // J2: German added to "Submission Languages" and ticked under "Submissions" (German is not installed on the site)
            await asU(S.J2.u.mg, S.J2.path);
            out.J2add = await addSubLangs(S.J2.path, ['de'], 'a-05-J2-add-de');
            await landLanguages(up, langUrl(S.J2.path));
            out.J2deSub = await jpress(S.J2.path, 'sub', 'de', 'submissionLocale', 'a-06-J2-de-submissions');
            out.J2before = await jgrid(null, S.J2.path, 'a-07-J2-before-install');
            out.J2wizBefore = await wizardLangs(S.J2.u.au, S.J2.path, 'a-08-J2-author-wizard-before');
            // J3: German added, ticked, made the Default
            await asU(S.J3.u.mg, S.J3.path);
            out.J3add = await addSubLangs(S.J3.path, ['de'], 'a-09-J3-add-de');
            await landLanguages(up, langUrl(S.J3.path));
            out.J3deSub = await jpress(S.J3.path, 'sub', 'de', 'submissionLocale', 'a-10-J3-de-submissions');
            out.J3deDefault = await jpress(S.J3.path, 'sub', 'de', 'defaultSubmissionLocale', 'a-11-J3-de-default');
            out.J3before = await jgrid(null, S.J3.path, 'a-12-J3-before-install');
            // the site: install Spanish
            out.installEs = await install(['es'], 'a-13-install-es');
            out.J2afterInstall = await jgrid(S.J2.u.mg, S.J2.path, 'a-14-J2-after-install-es');
            out.J3afterInstall = await jgrid(S.J3.u.mg, S.J3.path, 'a-15-J3-after-install-es');
            out.J2wizAfterInstall = await wizardLangs(S.J2.u.au, S.J2.path, 'a-16-J2-author-wizard-after-install');
            out.J3wizAfterInstall = await wizardLangs(S.J3.u.au, S.J3.path, 'a-17-J3-author-wizard-after-install');
            // put J2's German back, then remove Spanish (the second kind of change)
            await asU(S.J2.u.mg, S.J2.path);
            await landLanguages(up, langUrl(S.J2.path));
            out.J2deSub2 = await jpress(S.J2.path, 'sub', 'de', 'submissionLocale', 'a-18-J2-de-submissions-again');
            out.removeEs = await removeRow('es', 'a-19-remove-es');
            out.J2afterRemove = await jgrid(S.J2.u.mg, S.J2.path, 'a-20-J2-after-remove-es');
            out.J3afterRemove = await jgrid(S.J3.u.mg, S.J3.path, 'a-21-J3-after-remove-es');
            out.J3wizAfterRemove = await wizardLangs(S.J3.u.au, S.J3.path, 'a-22-J3-author-wizard-after-remove');
            fact('a1', out);
        });

        // ============================================================ a1b: J3 after A1 (German "Default", neither box): the language a new submission gets
        if (on('a1b')) await sect('a1b', async () => {
            const out = {};
            out.J3 = await jgrid(S.J3.u.mg, S.J3.path, 'a-23-J3-grid-now');
            await asU(S.J3.u.au, S.J3.path);
            await up.goto(cu(S.J3.path, '/submission')); await idle(up).catch(() => {}); await sleep(800);
            await up.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized), null, {timeout: 15000}).catch(() => {});
            const boxes = up.locator('input[type=checkbox]:visible');
            for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check().catch(() => {});
            const tinyTitle = up.frameLocator('iframe[id^="startSubmission-title-control"]').first().locator('body');
            await tinyTitle.click().catch(() => {});
            await tinyTitle.pressSequentially(`K1 A1 ${S.t}`).catch(() => {});
            const t0 = Date.now();
            await up.getByRole('button', {name: 'Begin Submission', exact: true}).first().click().catch((e) => { out.beginError = String(e.message).slice(0, 150); });
            await up.waitForURL(/submission\?id=\d+|submission\/wizard/, {timeout: 20000}).catch(() => {});
            await idle(up).catch(() => {}); await sleep(1500);
            Object.assign(out, {url: up.url().replace(/^https?:\/\/[^/]+/, ''), ...(await evu.since(t0))});
            const det = up.getByRole('button', {name: /^Details/}).first();
            if (await det.count()) { await det.click().catch(() => {}); await idle(up).catch(() => {}); await sleep(900); }
            out.details = await up.evaluate(() => ({
                langLines: (document.body.innerText.match(/[^\n]*(Submitting in|German|Deutsch|English)[^\n]*/g) || []).slice(0, 8),
                localeButtons: [...document.querySelectorAll('.pkpFormLocales button')].map((b) => b.innerText.trim()),
                titleEditors: window.tinymce ? window.tinymce.get().map((e) => e.id).filter((i) => /title/.test(i)) : [],
            })).catch((e) => ({error: String(e.message)}));
            await snap(up, 'a-24-J3-author-details-after-a1', {start: out});
            fact('a1b', out);
        });

        // ============================================================ a1c: that submission's Details step (the language it was started in)
        if (on('a1c')) await sect('a1c', async () => {
            const out = {};
            const f = JSON.parse(fs.readFileSync(path.join(outDir(), `k1-facts-${app.name}.json`), 'utf8'));
            const u = f.a1b && f.a1b.url;
            await asU(S.J3.u.au, S.J3.path);
            await up.goto(app.url(u.replace(/#.*$/, ''))); await idle(up).catch(() => {}); await sleep(1000);
            const cont = up.getByRole('button', {name: 'Continue', exact: true}).first();
            await cont.click().catch((e) => { out.contError = String(e.message).slice(0, 100); });
            await idle(up).catch(() => {}); await sleep(1500);
            out.details = await up.evaluate(() => ({
                heading: (document.querySelector('h1, h2') || {}).innerText,
                lines: (document.body.innerText.match(/[^\n]*(Submitting in|German|Deutsch)[^\n]*/g) || []).slice(0, 8),
                localeButtons: [...document.querySelectorAll('.pkpFormLocales button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()),
            })).catch((e) => ({error: String(e.message)}));
            await snap(up, 'a-25-J3-author-details-step', {details: out.details});
            fact('a1c', out);
        });

        // ============================================================ install: German (Rule 2, Rule 1 enabled end, Rule 6)
        if (on('install')) await sect('install', async () => {
            const out = {};
            const {f, info} = await openInstall('i-01-install-window');
            out.window = {...info, labels: undefined, values: undefined, hasEn: info.values.includes('en'), hasFr: info.values.includes('fr_CA'), hasDe: info.values.includes('de')};
            out.installDe = await installSave(f, 'i-02-install-de', ['de']);
            ({info: out.windowAfter} = await openInstall('i-03-install-window-after-de'));
            out.windowAfter = {count: out.windowAfter.count, hasDe: out.windowAfter.values.includes('de')};
            await landSite();
            out.site = await readSite(page);
            out.rule1 = await rule1('i-04-enabled');
            out.J1mgRead = out.rule1.J1;
            fact('install', out);
        });

        // ============================================================ emails1: note r, before the removal
        const emailName = isOPS ? 'Submission Acknowledgement (Pending Moderation)' : 'Submission Confirmation';
        async function typeRich(p, id, text) {
            const ifr = p.locator(`#${id}_ifr`);
            const body = (await ifr.count()) ? p.frameLocator(`#${id}_ifr`).locator('body') : p.locator(`#${id}`);
            await body.click();
            await p.keyboard.press(SELECT_ALL);
            await p.keyboard.press('Delete');
            if (text) await body.pressSequentially(text, {delay: 5});
            await sleep(300);
        }
        async function openTemplate(ctx) {
            await up.goto(cu(ctx, '/en/management/settings/manageEmails')); await idle(up).catch(() => {});
            await up.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: 30000}).catch(() => {});
            const btn = up.locator('main').getByRole('button', {name: `Edit ${emailName}`, exact: true});
            const respP = up.waitForResponse((r) => /api\/v1\/(mailables|emailTemplates)\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20000}).catch(() => null);
            await btn.click();
            const r = await respP;
            const multi = r && /mailables/.test(r.url());
            if (multi) {
                const d = up.getByRole('dialog', {name: emailName, exact: true}).last();
                await d.waitFor({timeout: 20000}).catch(() => {}); await idle(up).catch(() => {});
                await d.getByRole('button', {name: 'Edit', exact: true}).first().click();
            }
            const d = up.getByRole('dialog', {name: 'Edit Template'}).last();
            await d.waitFor({timeout: 20000}).catch(() => {});
            await up.waitForFunction(() => window.tinymce && window.tinymce.get('editEmailTemplate-body-control-en') && window.tinymce.get('editEmailTemplate-body-control-en').initialized, null, {timeout: 20000}).catch(() => {});
            await idle(up).catch(() => {}); await sleep(600);
            return {d, multi};
        }
        async function readTemplate(d) {
            return d.evaluate((el) => ({
                localeButtons: [...el.querySelectorAll('.pkpFormLocales button')].map((b) => b.innerText.trim()),
                subjects: [...el.querySelectorAll('input[name^="subject"]')].map((i) => `${i.name}=${i.value.slice(0, 100)}`),
                bodies: (window.tinymce ? window.tinymce.get() : []).filter((e) => /editEmailTemplate-body/.test(e.id)).map((e) => `${e.id.replace(/^.*-control-/, '')}=${e.getContent().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)}`),
            })).catch((e) => ({error: String(e.message)}));
        }
        async function templateRead(ctx, name, {editDe} = {}) {
            const {d, multi} = await openTemplate(ctx);
            const o = {multi};
            const deBtn = d.locator('.pkpFormLocales button').filter({hasText: /German|Deutsch/}).first();
            o.deButton = await deBtn.count();
            if (o.deButton) {
                await deBtn.click().catch(() => {});
                await up.waitForFunction(() => window.tinymce && window.tinymce.get('editEmailTemplate-body-control-de') && window.tinymce.get('editEmailTemplate-body-control-de').initialized, null, {timeout: 15000}).catch(() => {});
                await sleep(500);
            }
            Object.assign(o, await readTemplate(d));
            await snap(up, name, {template: o});
            if (editDe && o.deButton) {
                await typeRich(up, 'editEmailTemplate-body-control-de', editDe);
                const t0 = Date.now();
                const respP = up.waitForResponse((r) => /api\/v1\/emailTemplates/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
                await d.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await respP;
                await sleep(1500); await idle(up).catch(() => {});
                o.saved = {status: r && r.status(), ...(await evu.since(t0))};
                await snap(up, `${name}-saved`, {saved: o.saved});
            }
            log(`[${name}]`, JSON.stringify(o).slice(0, 1500));
            return o;
        }
        async function taskTemplatesDe(ctx, name) {
            await up.goto(cu(ctx, '/de/management/settings/workflow')); await idle(up).catch(() => {});
            await up.locator('#taskTemplates-button').first().click().catch(() => {});
            await idle(up).catch(() => {}); await sleep(1200);
            const o = {url: up.url().replace(/^https?:\/\/[^/]+/, ''), lang: await up.evaluate(() => document.documentElement.getAttribute('lang')).catch(() => null),
                text: flat(await up.locator('#taskTemplates').first().innerText().catch(() => null), 1200)};
            await snap(up, name, {tasks: o});
            await up.goto(cu(ctx, '/en/management/settings/workflow')); await idle(up).catch(() => {});
            log(`[${name}]`, JSON.stringify(o).slice(0, 1400));
            return o;
        }
        if (on('emails1')) await sect('emails1', async () => {
            const out = {};
            const J = S.J5;
            await asU(J.u.mg, J.path);
            out.before = await templateRead(J.path, 'e-01-J5-template-before-forms');
            await landLanguages(up, langUrl(J.path));
            out.deUi = await jpress(J.path, 'site', 'de', 'uiLocale', 'e-02-J5-de-ui');
            out.deForms = await jpress(J.path, 'site', 'de', 'formLocale', 'e-03-J5-de-forms');
            out.afterForms = await templateRead(J.path, 'e-04-J5-template-after-forms', {editDe: 'Unser Text.'});
            out.afterEdit = await templateRead(J.path, 'e-05-J5-template-after-edit-reload');
            // control: untick and tick "Forms" again, without any site change
            await landLanguages(up, langUrl(J.path));
            out.deFormsOff = await jpress(J.path, 'site', 'de', 'formLocale', 'e-06-J5-de-forms-off');
            out.deFormsOn = await jpress(J.path, 'site', 'de', 'formLocale', 'e-07-J5-de-forms-on');
            out.afterRetick = await templateRead(J.path, 'e-08-J5-template-after-retick');
            out.tasks = await taskTemplatesDe(J.path, 'e-09-J5-task-templates-de');
            fact('emails1', out);
        });

        // ============================================================ enable: Rule 3, 3a, 3b, 3c; Rule 1 disabled end
        if (on('enable')) await sect('enable', async () => {
            const out = {};
            // journals holding German: J1 UI + Forms + Submissions; J6 German primary; J2 Italian under Submissions
            await asU(S.J1.u.mg, S.J1.path);
            await landLanguages(up, langUrl(S.J1.path));
            out.J1ui = await jpress(S.J1.path, 'site', 'de', 'uiLocale', 'n-01-J1-de-ui');
            out.J1forms = await jpress(S.J1.path, 'site', 'de', 'formLocale', 'n-02-J1-de-forms');
            await addSubLangs(S.J1.path, ['de'], 'n-03-J1-add-de');
            await landLanguages(up, langUrl(S.J1.path));
            out.J1sub = await jpress(S.J1.path, 'sub', 'de', 'submissionLocale', 'n-04-J1-de-submissions');
            out.J1before = await jgrid(null, S.J1.path, 'n-05-J1-before-disable');
            await asU(S.J6.u.mg, S.J6.path);
            await landLanguages(up, langUrl(S.J6.path));
            out.J6ui = await jpress(S.J6.path, 'site', 'de', 'uiLocale', 'n-06-J6-de-ui');
            out.J6primary = await jpress(S.J6.path, 'site', 'de', 'contextPrimary', 'n-07-J6-de-primary');
            out.J6before = await jgrid(null, S.J6.path, 'n-08-J6-before-disable');
            await asU(S.J2.u.mg, S.J2.path);
            await addSubLangs(S.J2.path, ['it'], 'n-09-J2-add-it');
            await landLanguages(up, langUrl(S.J2.path));
            out.J2it = await jpress(S.J2.path, 'sub', 'it', 'submissionLocale', 'n-10-J2-it-submissions');
            out.J2before = await jgrid(null, S.J2.path, 'n-11-J2-before-disable');
            // the site: German's "Enable" — Cancel first, then Disable
            await landSite();
            out.disableCancel = await pressEnable('de', 'n-12-de-disable-cancel', {answer: 'cancel'});
            await landSite();
            out.disable = await pressEnable('de', 'n-13-de-disable');
            await landSite();
            // German's "Primary locale" while German is disabled
            const rp = siteCell('de', 'sitePrimary');
            out.primaryWhileDisabled = {disabled: await rp.isDisabled().catch(() => null), checked: await rp.isChecked().catch(() => null)};
            const tp = Date.now();
            await rp.click({timeout: 3000}).catch((e) => { out.primaryWhileDisabled.clickError = String(e.message).split('\n')[0].slice(0, 160); });
            out.primaryWhileDisabled.question = await question(page, 'cancel');
            out.primaryWhileDisabled.after = await ev.since(tp);
            await snap(page, 'n-14-de-primary-while-disabled', {pw: out.primaryWhileDisabled});
            ({info: out.windowWhileDisabled} = await openInstall('n-15-install-window-de-disabled'));
            out.windowWhileDisabled = {count: out.windowWhileDisabled.count, hasDe: out.windowWhileDisabled.values.includes('de')};
            // journals after the disable
            out.J1after = await jgrid(S.J1.u.mg, S.J1.path, 'n-16-J1-after-disable');
            out.J6after = await jgrid(S.J6.u.mg, S.J6.path, 'n-17-J6-after-disable');
            out.J2after = await jgrid(S.J2.u.mg, S.J2.path, 'n-18-J2-after-disable');
            out.rule1disabled = await rule1('n-19-disabled');
            // enabled again
            await landSite();
            out.enable = await pressEnable('de', 'n-20-de-enable', {expectQuestion: false});
            out.J1reenabled = await jgrid(S.J1.u.mg, S.J1.path, 'n-21-J1-after-enable');
            out.J6reenabled = await jgrid(S.J6.u.mg, S.J6.path, 'n-22-J6-after-enable');
            // the site's primary language: English's "Enable"
            await landSite();
            out.disableEn = await pressEnable('en', 'n-23-en-disable');
            fact('enable', out);
        });

        // ============================================================ primary: Rule 4 and its side effect
        if (on('primary')) await sect('primary', async () => {
            const out = {};
            out.nmBefore = await profile(S.J1.u.nm, S.J1.path, 'p-01-nm-before');
            await landSite();
            out.cancel = await pressPrimary('de', 'p-02-de-primary-cancel', {answer: 'cancel'});
            await landSite();
            out.toDe = await pressPrimary('de', 'p-03-de-primary');
            await landSite();
            out.enArrowWhileDe = await rowArrow('en', 'p-04-en-arrow-while-de-primary');
            await landSite();
            out.deArrowWhileDe = await rowArrow('de', 'p-05-de-arrow-while-de-primary');
            out.siteJa = await visitor(app.url('/index.php/index'), 'p-06-visitor-ja-site-home', {acceptLanguage: 'ja'});
            out.siteEn = await visitor(app.url('/index.php/index'), 'p-07-visitor-en-site-home', {acceptLanguage: 'en'});
            out.pkJa = await visitor(cu(PK, ''), 'p-08-visitor-ja-publicknowledge', {acceptLanguage: 'ja'});
            out.nmAfter = await profile(S.J1.u.nm, S.J1.path, 'p-09-nm-after');
            await landSite();
            out.toEn = await pressPrimary('en', 'p-10-en-primary');
            out.nmBack = await profile(S.J1.u.nm, S.J1.path, 'p-11-nm-back');
            fact('primary', out);
        });

        // ============================================================ remove: Rule 5
        if (on('remove')) await sect('remove', async () => {
            const out = {};
            await landSite();
            out.enArrow = await rowArrow('en', 'm-01-en-arrow');
            await landSite();
            out.deArrow = await rowArrow('de', 'm-02-de-arrow');
            out.cancel = await removeRow('de', 'm-03-de-remove-cancel', {answer: 'cancel'});
            out.remove = await removeRow('de', 'm-04-de-remove');
            out.J1after = await jgrid(S.J1.u.mg, S.J1.path, 'm-05-J1-after-remove');
            out.J5after = await jgrid(S.J5.u.mg, S.J5.path, 'm-06-J5-after-remove');
            ({info: out.window} = await openInstall('m-07-install-window-after-remove'));
            out.window = {count: out.window.count, hasDe: out.window.values.includes('de'), deLabel: out.window.sample.filter((s) => /^de=/.test(s))};
            fact('remove', out);
        });

        // ============================================================ emails2: German installed again; the edited template
        if (on('emails2')) await sect('emails2', async () => {
            const out = {};
            out.reinstall = await install(['de'], 'e2-01-reinstall-de');
            const J = S.J5;
            out.J5grid = await jgrid(J.u.mg, J.path, 'e2-02-J5-after-reinstall');
            out.afterReinstallNoForms = await templateRead(J.path, 'e2-03-J5-template-after-reinstall-before-forms');
            await landLanguages(up, langUrl(J.path));
            out.deUi = await jpress(J.path, 'site', 'de', 'uiLocale', 'e2-04-J5-de-ui');
            out.deForms = await jpress(J.path, 'site', 'de', 'formLocale', 'e2-05-J5-de-forms');
            out.afterForms = await templateRead(J.path, 'e2-06-J5-template-after-forms');
            out.tasks = await taskTemplatesDe(J.path, 'e2-07-J5-task-templates-de');
            // put German back out
            out.remove = await removeRow('de', 'e2-08-remove-de-again');
            fact('emails2', out);
        });

        // ============================================================ onelang: Rule 8 on a one-language site
        if (on('onelang')) await sect('onelang', async () => {
            const out = {};
            await landSite();
            out.disableFr = await pressEnable('fr_CA', 'o-01-fr-disable');
            out.pkAfterDisable = await jgrid('manager.maya', PK, 'o-02-publicknowledge-after-fr-disable');
            out.nmProfile = await profile(S.J1.u.nm, S.J1.path, 'o-03-nm-one-language');
            // Hosted Journals › Create
            const hPath = `${S.t}h`;
            if (!S.JH) {
                await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
                const create = page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first();
                await create.click();
                await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(600);
                const cf = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first();
                out.form = await cf.evaluate((f) => ({
                    labels: [...f.querySelectorAll('.pkpFormFieldLabel, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                    localeInputs: [...f.querySelectorAll('input[type=checkbox], input[type=radio]')].filter((i) => /Locale|locale/.test(i.name)).map((i) => `${i.name}:${i.value}`),
                })).catch((e) => ({error: String(e.message)}));
                await snap(page, 'o-04-create-form-one-language', {form: out.form});
                await cf.locator('[id^="context-name-control"]').first().fill(`U57 K1 H ${S.t}`);
                const acr = cf.locator('[id^="context-acronym-control"]').first(); if (await acr.count()) await acr.fill('K1H');
                const cn = cf.locator('[id^="context-contactName-control"]').first(); if (await cn.count()) await cn.fill('Hal Principal');
                const ce = cf.locator('[id^="context-contactEmail-control"]').first(); if (await ce.count()) await ce.fill(`${S.t}hal@mail.test`);
                await cf.locator('[id^="context-urlPath-control"]').first().fill(hPath);
                await cf.locator('select[id^="context-country-control"]').first().selectOption({label: 'Iceland'}).catch(() => {});
                const wr = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                const t0 = Date.now();
                await cf.getByRole('button', {name: 'Save', exact: true}).click();
                const resp = await wr;
                await sleep(2000); await idle(page).catch(() => {});
                out.create = {status: resp ? resp.status() : null, ...(await ev.since(t0)),
                    errors: await cf.locator('.pkpFieldError, .pkpFormErrors').allInnerTexts().catch(() => [])};
                await snap(page, 'o-05-created', {create: out.create});
                if (out.create.status && out.create.status < 400) { S.JH = {path: hPath}; save(); }
            }
            if (S.JH) {
                await landLanguages(page, langUrl(S.JH.path));
                out.JH = gridLine(await readGrids(page));
                await snap(page, 'o-06-JH-languages-one-language', {grid: out.JH});
            }
            // French back
            await landSite();
            out.enableFr = await pressEnable('fr_CA', 'o-07-fr-enable', {expectQuestion: false});
            if (S.JH) { await landLanguages(page, langUrl(S.JH.path)); out.JHafter = gridLine(await readGrids(page)); await snap(page, 'o-08-JH-languages-after-fr-enable', {grid: out.JHafter}); }
            // the seeded journal: French back under "UI" (the seed state)
            out.pkBeforeRestore = await jgrid('manager.maya', PK, 'o-09-publicknowledge-before-restore');
            if (!/fr_CA:-X/.test(out.pkBeforeRestore.split('||')[0]) && /fr_CA:/.test(out.pkBeforeRestore)) {
                const g = await readGrids(up);
                const fr = g.site.rows.find((r) => r.code === 'fr_CA');
                if (fr && fr.cells.uiLocale && fr.cells.uiLocale.startsWith('-')) out.pkRestore = await jpress(PK, 'site', 'fr_CA', 'uiLocale', 'o-10-publicknowledge-fr-ui-restored');
            }
            out.pkAfterRestore = await jgrid('manager.maya', PK, 'o-11-publicknowledge-after-restore');
            fact('onelang', out);
        });

        // ============================================================ onelang2: the create form's script on a one-language site, step by step (a second run)
        if (on('onelang2')) await sect('onelang2', async () => {
            const out = {steps: []};
            await landSite();
            out.disableFr = await pressEnable('fr_CA', 'o2-01-fr-disable');
            const step = async (label, fn) => { const t = Date.now(); await fn().catch((e) => ({error: String(e.message).slice(0, 120)})); await sleep(800); const e = await ev.since(t); out.steps.push({label, scriptErrors: e.errs.filter((x) => !/status of 500/.test(x)).map((x) => x.slice(0, 90))}); };
            await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
            const create = page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first();
            await step('open the create form', async () => { await create.click(); await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T}); await idle(page); });
            const cf = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first();
            const hPath = `${S.t}h2`;
            await step('type the name', () => cf.locator('[id^="context-name-control"]').first().fill(`U57 K1 H2 ${S.t}`));
            await step('type the initials', () => cf.locator('[id^="context-acronym-control"]').first().fill('K1HB'));
            await step('type the contact', async () => { await cf.locator('[id^="context-contactName-control"]').first().fill('Hal Principal'); await cf.locator('[id^="context-contactEmail-control"]').first().fill(`${S.t}hal2@mail.test`); });
            await step('type the path', () => cf.locator('[id^="context-urlPath-control"]').first().fill(hPath));
            await step('pick a country', () => cf.locator('select[id^="context-country-control"]').first().selectOption({label: 'Iceland'}));
            const wr = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            let status = null;
            await step('press Save', async () => { await cf.getByRole('button', {name: 'Save', exact: true}).click(); const r = await wr; status = r && r.status(); await sleep(1500); });
            out.createStatus = status;
            await snap(page, 'o2-02-created', {out});
            if (status && status < 400) { S.JH2 = {path: hPath}; save(); }
            await landSite();
            out.enableFr = await pressEnable('fr_CA', 'o2-03-fr-enable', {expectQuestion: false});
            out.pkBeforeRestore = await jgrid('manager.maya', PK, 'o2-04-publicknowledge-before-restore');
            const g = await readGrids(up);
            const fr = g.site && g.site.rows.find((r) => r.code === 'fr_CA');
            if (fr && fr.cells.uiLocale && fr.cells.uiLocale.startsWith('-')) out.pkRestore = await jpress(PK, 'site', 'fr_CA', 'uiLocale', 'o2-05-publicknowledge-fr-ui-restored');
            out.pkAfterRestore = await jgrid('manager.maya', PK, 'o2-06-publicknowledge-after-restore');
            // the same form on the two-language site, as a control (opened, filled, not saved)
            await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
            const ctl = [];
            const t1 = Date.now();
            await page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first().click();
            await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T}); await idle(page);
            const cf2 = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first();
            await cf2.locator('[id^="context-name-control"]').first().fill('K1 control');
            await cf2.locator('[id^="context-acronym-control"]').first().fill('K1C');
            await cf2.locator('select[id^="context-country-control"]').first().selectOption({label: 'Iceland'}).catch(() => {});
            await sleep(800);
            out.controlTwoLanguages = (await ev.since(t1)).errs.filter((x) => !/status of 500/.test(x)).map((x) => x.slice(0, 90));
            await snap(page, 'o2-07-create-form-two-languages-control', {errs: out.controlTwoLanguages});
            fact('onelang2', out);
        });

        // ============================================================ readfr: the site's list read in French (the "Locale" names follow the interface language)
        if (on('readfr')) await sect('readfr', async () => {
            const out = {};
            await page.goto(app.url('/index.php/index/fr_CA/admin/settings')); await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {}); await idle(page).catch(() => {});
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
            await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 30000}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(500);
            out.site = await readSite(page);
            await snap(page, 'f-01-site-languages-french-ui', {site: out.site});
            await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page);
            fact('readfr', {line: siteLine(out.site), head: out.site && out.site.head, actions: out.site && out.site.actions});
        });

        // ============================================================ a1enable: Rule 3c / A1 through an "Enable" alone
        if (on('a1enable')) await sect('a1enable', async () => {
            const out = {};
            out.installDe = await install(['de'], 'q-01-install-de');
            await landSite();
            out.disableDe = await pressEnable('de', 'q-02-de-disable');
            await asU(S.J2.u.mg, S.J2.path);
            await landLanguages(up, langUrl(S.J2.path));
            const g0 = await readGrids(up);
            const it = g0.sub && g0.sub.rows.find((r) => r.code === 'it');
            if (it && it.cells.submissionLocale && it.cells.submissionLocale.startsWith('-')) out.J2it = await jpress(S.J2.path, 'sub', 'it', 'submissionLocale', 'q-03-J2-it-submissions');
            out.J2before = await jgrid(null, S.J2.path, 'q-04-J2-before-enable');
            await landSite();
            out.enableDe = await pressEnable('de', 'q-05-de-enable', {expectQuestion: false});
            out.J2after = await jgrid(S.J2.u.mg, S.J2.path, 'q-06-J2-after-enable');
            out.removeDe = await removeRow('de', 'q-07-remove-de');
            fact('a1enable', {J2before: out.J2before, J2after: out.J2after, enable: out.enableDe && out.enableDe.notices, remove: out.removeDe && out.removeDe.reload});
        });

        // ============================================================ script: two scripts of one language (zh_Hans, zh_Hant) on the lists and the reader's block
        if (on('script')) await sect('script', async () => {
            const out = {};
            out.install = await install(['zh_Hans', 'zh_Hant'], 'w-01-install-zh');
            await landSite();
            out.site = siteLine(await readSite(page));
            await asU(S.J4.u.mg, S.J4.path);
            await landLanguages(up, langUrl(S.J4.path));
            out.uiHans = await jpress(S.J4.path, 'site', 'zh_Hans', 'uiLocale', 'w-02-J4-zh_Hans-ui');
            out.uiHant = await jpress(S.J4.path, 'site', 'zh_Hant', 'uiLocale', 'w-03-J4-zh_Hant-ui');
            out.J4 = await readGrids(up);
            out.J4names = out.J4.site && out.J4.site.rows.map((r) => r.text);
            await snap(up, 'w-04-J4-languages', {names: out.J4names});
            out.visitor = await visitor(cu(S.J4.path, '/en'), 'w-05-visitor-J4-block', {extra: () => ({links: [...document.querySelectorAll('.block_language a')].map((a) => `${a.innerText.trim()} → ${a.getAttribute('href').replace(/^.*setLocale\//, '').replace(/\?.*$/, '')}`)})});
            // the initials menu on the editorial side
            await up.goto(cu(S.J4.path, '/en/management/settings/website')); await idle(up).catch(() => {});
            out.menu = await openInitials(up);
            await snap(up, 'w-06-J4-initials-menu', {menu: out.menu});
            await landing(up, cu(S.J4.path, '/en/management/settings/website'));
            out.removeHans = await removeRow('zh_Hans', 'w-07-remove-zh_Hans');
            out.removeHant = await removeRow('zh_Hant', 'w-08-remove-zh_Hant');
            fact('script', {site: out.site, J4names: out.J4names, visitor: out.visitor, menu: out.menu, left: out.removeHant && out.removeHant.reload});
        });

        // ============================================================ rtl: Rule 21b with Arabic
        if (on('rtl')) await sect('rtl', async () => {
            const out = {};
            out.installAr = await install(['ar'], 'x-01-install-ar');
            const J = S.J4;
            await asU(J.u.mg, J.path);
            await landLanguages(up, langUrl(J.path));
            out.arUi = await jpress(J.path, 'site', 'ar', 'uiLocale', 'x-02-J4-ar-ui');
            const read = () => {
                const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return {x: Math.round(b.x), w: Math.round(b.width)}; };
                const main = document.querySelector('.pkp_structure_main');
                const side = document.querySelector('.pkp_structure_sidebar');
                const p = document.querySelector('.pkp_structure_main p, .pkp_structure_main h2, .pkp_structure_main h1');
                return {dir: document.documentElement.getAttribute('dir'), lang: document.documentElement.getAttribute('lang'),
                    bodyDirection: getComputedStyle(document.body).direction, textAlign: p ? getComputedStyle(p).textAlign : null, pDirection: p ? getComputedStyle(p).direction : null,
                    main: r(main), sidebar: r(side), vw: innerWidth, block: (document.querySelector('.block_language') || {}).innerText || null};
            };
            out.en = await visitor(cu(J.path, '/en'), 'x-03-visitor-J4-en', {extra: read});
            out.ar = await visitor(cu(J.path, '/ar'), 'x-04-visitor-J4-ar', {extra: read});
            // the editorial side in Arabic, as the manager
            const l = await landing(up, cu(J.path, '/ar/management/settings/website'));
            out.arEditorial = {finalUrl: l.finalUrl, lang: l.lang, dir: await up.evaluate(() => document.documentElement.getAttribute('dir')).catch(() => null),
                bodyDirection: await up.evaluate(() => getComputedStyle(document.body).direction).catch(() => null)};
            await snap(up, 'x-05-J4-editorial-ar', {ed: out.arEditorial});
            await landing(up, cu(J.path, '/en/management/settings/website'));
            out.removeAr = await removeRow('ar', 'x-06-remove-ar');
            fact('rtl', out);
        });

        // ============================================================ sidebar: Setting 3
        if (on('sidebar')) await sect('sidebar', async () => {
            const out = {};
            const openSetup = async () => {
                await page.goto(siteUrl); await idle(page);
                await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
                await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700);
            };
            const list = () => page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => `${e.value}:${e.checked ? 'X' : '-'}:${(e.closest('label') || e.parentElement).innerText.trim()}`)).catch(() => []);
            const form = () => page.locator('form').filter({has: page.locator('[id^="siteAppearance-"]')}).first();
            const saveF = async () => {
                const w = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\//.test(r.url()), {timeout: T}).catch(() => null);
                await form().getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await w;
                const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await idle(page).catch(() => {});
                return {status: r && r.status(), saved};
            };
            await openSetup();
            out.before = await list();
            await snap(page, 's-01-site-sidebar-before', {sidebar: out.before});
            const lt = page.locator('input[name="sidebar"][value*="anguage"]').first();
            out.ltPresent = await lt.count();
            if (out.ltPresent) {
                await lt.setChecked(true);
                out.save1 = await saveF();
                await openSetup(); out.placed = await list();
                const blk = () => ({block: (document.querySelector('.block_language') || {}).innerText || null,
                    links: [...document.querySelectorAll('.block_language a')].map((a) => a.innerText.trim()), current: (document.querySelector('.block_language li.current') || {}).innerText || null});
                out.home = await visitor(app.url('/index.php/index'), 's-02-visitor-site-home-block', {extra: blk});
                out.homeFr = await visitor(app.url('/index.php/index/fr_CA'), 's-03-visitor-site-home-fr-block', {extra: blk});
                await openSetup();
                await page.locator('input[name="sidebar"][value*="anguage"]').first().setChecked(false);
                out.save2 = await saveF();
                await openSetup(); out.after = await list();
                await snap(page, 's-04-site-sidebar-restored', {sidebar: out.after});
            }
            fact('sidebar', out);
        });

        // ============================================================ allinstall: every language installed ("No additional locales"), in batches (resumable)
        // The probe server runs with max_execution_time=120, so one "Save" carries BATCH languages; rerun the phase until `done`.
        if (on('allinstall')) await sect('allinstall', async () => {
            const out = {batches: []};
            const BATCH = Number(process.env.BATCH || 6);
            const t0 = Date.now();
            let n = 0;
            for (;;) {
                if (Date.now() - t0 > 420000) { out.stoppedForTime = true; break; }
                const {f, info} = await openInstall(`z-01-install-window-all-${String(++n).padStart(2, '0')}`);
                if (!info.count) {
                    out.done = true;
                    out.windowNoneLeft = {...info, labels: undefined};
                    await snap(page, 'z-03-install-window-none-left', {win: out.windowNoneLeft});
                    await loc(page, 'Install Locale window with nothing left to install', page.locator('form#installLanguageForm').first());
                    const dlg = page.locator('[role=dialog]:visible').last();
                    await dlg.getByRole('button', {name: /^(Close|Cancel)$/}).first().click().catch(() => {});
                    await sleep(900);
                    break;
                }
                const codes = info.values.slice(0, BATCH);
                const r = await installSave(f, `z-02-install-batch-${String(n).padStart(2, '0')}`, codes);
                out.batches.push({codes, status: r.status, ms: r.ms, notices: r.notices, bad: r.bad, errs: r.errs.length});
                if (!r.status || r.status >= 400 || r.bad.length) { out.batchError = {codes, r: {...r, same: undefined, reload: undefined}}; break; }
            }
            if (out.done) {
                await landSite();
                const s = await readSite(page);
                out.rows = s.rows.length;
                out.asterisks = s.rows.filter((r) => r.asterisk).map((r) => r.code);
                out.noAsterisk = s.rows.filter((r) => !r.asterisk).map((r) => r.code);
                out.primaryDisabled = s.rows.filter((r) => /dis/.test(r.primary || '')).map((r) => r.code);
                out.enableUnticked = s.rows.filter((r) => /^-/.test(r.enable || '')).map((r) => r.code);
                out.names = s.rows.map((r) => `${r.code}=${r.locale}`);
                await snap(page, 'z-04-site-list-all', {site: s});
                out.J1 = await jgrid(S.J1.u.mg, S.J1.path, 'z-05-J1-all-installed');
            }
            fact(`allinstall-${Date.now()}`, out);
        });

        // ============================================================ allremove: every language but English and French removed (resumable)
        if (on('allremove')) await sect('allremove', async () => {
            const out = {removed: [], errors: []};
            const t0 = Date.now();
            await landSite();
            for (;;) {
                if (Date.now() - t0 > 500000) { out.stoppedForTime = true; break; }
                const s = await readSite(page);
                const next = s && s.rows.find((r) => !KEEP.includes(r.code));
                if (!next) break;
                const row = siteRow(next.code);
                await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(300);
                const t1 = Date.now();
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /uninstall-locale/.test(r.url()), {timeout: 60000}).catch(() => null);
                await page.locator(`#languageGridContainer tr[id$="-row-${next.code}-control-row"] a`).filter({hasText: /^\s*Remove\s*$/}).first().click({timeout: 5000}).catch(() => {});
                const q = await question(page, 'ok');
                const r = await w;
                const e = await ev.since(t1);
                if (!r || r.status() >= 400 || e.bad.length) out.errors.push({code: next.code, status: r && r.status(), bad: e.bad, q: q.present});
                out.removed.push(`${next.code}:${r ? r.status() : 'none'}:${Date.now() - t1}ms:${e.notices.join('/').slice(0, 60)}`);
                const gone = await siteRow(next.code).waitFor({state: 'detached', timeout: 20000}).then(() => true).catch(() => false);
                await idle(page).catch(() => {}); await sleep(300);
                if (!r || !gone) await landSite();
            }
            await landSite();
            out.left = siteLine(await readSite(page));
            await snap(page, 'z-06-site-list-after-remove-all', {left: out.left});
            fact(`allremove-${Date.now()}`, out);
        });

        // ============================================================ final: the site and the seeded journal as the fleet expects them
        if (on('final')) await sect('final', async () => {
            const out = {};
            await landSite();
            out.site = siteLine(await readSite(page));
            await snap(page, 'y-01-final-site-list');
            out.pk = await jgrid('manager.maya', PK, 'y-02-final-publicknowledge-languages');
            out.siteHome = await visitor(app.url('/index.php/index'), 'y-03-final-visitor-site-home');
            fact('final', out);
        });
    } finally {
        await A.close().catch(() => {});
        await U.close().catch(() => {});
    }
});
