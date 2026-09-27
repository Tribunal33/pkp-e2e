// U57 claim check, chunk K2: a journal's languages.
// Spec: docs/specs/U57-languages-and-locales.md — Fields (78–104: the journal's "Languages" tab and the
// "Add/Remove Languages" window), Rules 7–16 (179–280), Side effects of the journal-level changes
// (352–364), Settings bullet 4 (380–383), register draft A2 (dropped), A2, A5, A6; footnotes f, g, h, i, j, k, l, r,
// f-a2, f-a3, f-a6, f-a7.
//
//   PROBE_FEATURE=U57 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U57/K2/k2.js
//   PHASES=seed,read,perm,wizard,create,forms,ui,primary,reload,sublang,a2,leave,race,a2again,race2,extra,dist   (default: all)
//   race runs both browsers on the probe server (one PHP process: never overlaps); race2 puts the second browser on
//   the +90 server, a second process on the same install, which is how A6 reproduces. a2again seeds a fresh journal.
//   A full run outlasts the Bash cap: run it detached per app (nohup … &) and poll the pid.
//   Later phases read k2-state-<app>.json (written by seed).
//
// Nothing here changes the site's own languages (the site keeps English and French (Canada), English
// primary). `publicknowledge` and the seeded users are only read.
//
// Scratch contexts per app (tag prefix u57k2):
//   A  en+fr_CA UI, en Forms. Users mg, pe (OJS/OMP productionEditor), au.   forms, reload, perm (roles window)
//   B  en UI only, sidebar Language Toggle Block. Users mg.                    ui (Rule 9), Forms without UI
//   C  defaults (en). Users mg, au.                                            sublang (Rules 14–16)
//   D  en+fr_CA UI and Forms. Users mg.                                        a2 (draft A2 (dropped))
//   E  OJS/OMP: editor + productionEditor with permitSettings false. Users mg, ed, pe.   perm (Settings 4)
//   F  en+fr_CA UI, en Forms. Users mg.                                        primary (Rules 11, 12)
//   G  en+fr_CA UI, en Forms. Users mg.                                        wizard (a change in the wizard)
//   H  created on Administration › Hosted Journals by admin                    create (Rule 8)
//   R1..R6  en+fr_CA UI, en Forms, one manager each                            race (A6), pairs
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'read', 'perm', 'wizard', 'create', 'forms', 'ui', 'primary', 'reload', 'sublang', 'a2', 'leave', 'race', 'a2again', 'race2', 'extra', 'dist'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

// ---------------------------------------------------------------------------------------------
// page instrumentation: notices, browser dialogs, console errors, failed responses, POSTs
async function instrument(page) {
    const ev = {dialogs: [], errs: [], bad: [], posts: []};
    ev.dialogAnswer = 'accept';
    page.on('dialog', (d) => {
        ev.dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 400)});
        log('[browser dialog]', d.type(), flat(d.message(), 200));
        if (d.type() === 'beforeunload' || d.type() === 'alert' || ev.dialogAnswer === 'accept') d.accept().catch(() => {}); else d.dismiss().catch(() => {});
    });
    page.on('console', (m) => { if (m.type() === 'error') ev.errs.push({at: Date.now(), t: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => ev.errs.push({at: Date.now(), t: `pageerror: ${String(e.message).slice(0, 300)}`}));
    page.on('response', (r) => { if (r.status() >= 400) ev.bad.push({at: Date.now(), s: r.status(), m: r.request().method(), u: r.url().replace(/^.*\/index\.php/, '').slice(0, 200)}); });
    page.on('request', (r) => { if (r.method() === 'POST') ev.posts.push({at: Date.now(), u: r.url().replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, '').slice(0, 220)}); });
    await page.context().addInitScript(() => {
        window.__notices = [];
        const seen = new WeakSet();
        const sweep = () => {
            document.querySelectorAll('[role="alert"], [role="status"], .pkpNotification, .pkp_notification, .ui-pnotify, [class*="toast"], [class*="Toast"], .app__notifications *').forEach((e) => {
                const t = (e.innerText || '').trim();
                if (t && !seen.has(e)) { seen.add(e); window.__notices.push({t: t.slice(0, 300), at: Date.now()}); }
            });
        };
        new MutationObserver(sweep).observe(document, {subtree: true, childList: true, characterData: true});
    });
    ev.since = async (t0) => ({
        notices: [...new Set(await page.evaluate((s) => (window.__notices || []).filter((n) => n.at >= s).map((n) => n.t), t0).catch(() => []))].filter((t) => !/^(Saving|Loading)/.test(t)),
        dialogs: ev.dialogs.filter((d) => d.at >= t0).map((d) => `${d.type}: ${d.message}`),
        errs: ev.errs.filter((d) => d.at >= t0).map((d) => d.t),
        bad: ev.bad.filter((d) => d.at >= t0).map((d) => `${d.s} ${d.m} ${d.u}`),
        posts: ev.posts.filter((d) => d.at >= t0).map((d) => d.u),
    });
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

// The journal's Languages tab (Settings › Website › Setup › Languages), or the wizard's.
async function landLanguages(page, url) {
    const resp = await page.goto(url).catch((e) => ({error: String(e.message)}));
    await idle(page).catch(() => {});
    const setup = page.locator('#setup-button').first();
    if (await setup.count()) {
        if ((await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click().catch(() => {});
    }
    const tab = page.locator('#languages-button').filter({visible: true}).first();
    if (await tab.count()) { await tab.click().catch(() => {}); }
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

async function openInitials(page) {
    const btn = page.locator('[data-cy="app-user-nav"] button').first();
    if (!(await btn.count())) return {present: false};
    await btn.click().catch(() => {});
    await sleep(600);
    const menu = page.locator('[data-cy="app-user-nav"] nav, nav[aria-label="User Navigation"]').first();
    const info = await menu.evaluate((n) => ({text: n.innerText.replace(/\n+/g, ' | '),
        links: [...n.querySelectorAll('a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))})).catch((e) => ({error: String(e).slice(0, 200)}));
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
        loginForm: await page.locator('input[name="username"], #username').count(),
        denied: /does not have access|not authori[sz]ed|access denied|You don't have access|permission/i.test(body || '')};
}

// A public page: its address after redirects, the lang attribute, the language block and alternate links.
async function publicRead(page, url) {
    const l = await landing(page, url);
    const extra = await page.evaluate(() => ({
        lang: document.documentElement.getAttribute('lang'),
        alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((a) => `${a.getAttribute('hreflang')} ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}`),
        block: (() => { const b = document.querySelector('.block_language, .pkp_block.block_language'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; })(),
        blockLinks: [...document.querySelectorAll('.block_language a')].map((a) => `${a.innerText.trim()} → ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}`),
        headerLangLinks: [...document.querySelectorAll('.pkp_navigation_user a, .languages a, [class*="language"] a')].map((a) => a.innerText.trim()).filter(Boolean).slice(0, 10),
        main: (document.querySelector('.pkp_structure_main, main') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
    })).catch((e) => ({error: String(e.message)}));
    return {...l, ...extra};
}

// Every TinyMCE editor on the page: id → text (first 200 chars).
const editors = (page) => page.evaluate(() => {
    const m = window.tinymce; if (!m) return {};
    const out = {}; m.get().forEach((e) => { out[e.id] = (e.getContent() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200); });
    return out;
}).catch(() => ({}));

// A Vue settings side tab: the form's language buttons and its editors.
async function openSideTab(page, ctxUrl, top, side) {
    await page.goto(ctxUrl).catch(() => {});
    await idle(page).catch(() => {});
    const topBtn = page.locator(`#${top}-button`).first();
    if (await topBtn.count()) await topBtn.click().catch(() => {});
    const sideBtn = page.locator(`#${side}-button`).filter({visible: true}).first();
    if (await sideBtn.count()) await sideBtn.click().catch(() => {});
    await idle(page).catch(() => {});
    await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized), null, {timeout: 15000}).catch(() => {});
    await sleep(700);
    const panel = page.locator(`#${side}`).first();
    const info = await panel.evaluate((p) => ({
        localeButtons: [...p.querySelectorAll('.pkpFormLocales button, [class*="FormLocales"] button')].map((b) => b.innerText.trim()),
        buttons: [...p.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean).slice(0, 20),
        labels: [...p.querySelectorAll('.pkpFormFieldLabel, legend, label')].filter((b) => b.getClientRects().length).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30),
    })).catch((e) => ({error: String(e.message).slice(0, 200)}));
    info.editors = await editors(page);
    return info;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const J = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';
    const cu = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const PK = app.contextPath;

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u57k2');
        S.t = t;
        const mk = async (k, spec, tries = 3) => {
            const p = `${t}${k}`;
            for (let i = 0; i < tries; i++) {
                try {
                    const r = await app.api.createContext({tag: `${p}${i ? `r${i}` : ''}`, ...spec(p)});
                    log('seed', k, JSON.stringify(r).slice(0, 300));
                    return {path: r.path || `${p}${i ? `r${i}` : ''}`, id: r.contextId || r.id || null};
                } catch (e) { log('seed FAILED', k, i, String(e.message).slice(0, 400)); S.seedErrors = [...(S.seedErrors || []), `${k}#${i}: ${String(e.message).slice(0, 300)}`]; await sleep(1500); }
            }
            return {error: true};
        };
        const base = (p, name) => ({name: `U57 K2 ${name} ${p}`, acronym: 'KTWO', contactName: 'K2 Contact', contactEmail: `${p}c@mail.test`});
        const U = (p, extra = []) => [{username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'}, ...extra];
        const bi = {supportedLocales: ['en', 'fr_CA']};
        S.A = await mk('a', (p) => ({context: {...base(p, 'A'), ...bi}, users: U(p, [
            ...(isOPS ? [] : [{username: `${p}pe`, roles: ['productionEditor'], givenName: 'Pat', familyName: 'Production'}]),
            {username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'}])}));
        S.A.u = {mg: `${S.A.path}mg`, pe: isOPS ? null : `${S.A.path}pe`, au: `${S.A.path}au`};
        S.B = await mk('b', (p) => ({context: {...base(p, 'B'), supportedLocales: ['en']}, sidebar: ['languagetoggleblockplugin'], users: U(p)}));
        S.C = await mk('c', (p) => ({context: base(p, 'C'), users: U(p, [{username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'}])}));
        S.D = await mk('d', (p) => ({context: {...base(p, 'D'), ...bi, supportedFormLocales: ['en', 'fr_CA']}, users: U(p)}));
        if (!isOPS) S.E = await mk('e', (p) => ({context: base(p, 'E'), roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}},
            users: U(p, [{username: `${p}ed`, roles: ['editor']}, {username: `${p}pe`, roles: ['productionEditor']}])}));
        S.F = await mk('f', (p) => ({context: {...base(p, 'F'), ...bi}, users: U(p)}));
        S.F2 = await mk('f2', (p) => ({context: {...base(p, 'F2'), supportedLocales: ['en']}, users: U(p)}));
        S.G = await mk('g', (p) => ({context: {...base(p, 'G'), ...bi}, users: U(p)}));
        S.R = [];
        for (let i = 1; i <= 6; i++) S.R.push(await mk(`r${i}`, (p) => ({context: {...base(p, `R${i}`), ...bi}, users: U(p)})));
        // user names follow the path actually used
        for (const k of ['B', 'C', 'D', 'E', 'F', 'F2', 'G']) if (S[k] && S[k].path) S[k].u = {mg: `${S[k].path}mg`, au: `${S[k].path}au`, ed: `${S[k].path}ed`, pe: `${S[k].path}pe`};
        for (const r of S.R) if (r.path) r.u = {mg: `${r.path}mg`};
        S.seeded = true;
        save();
        record('seed', S);
    }
    if (!S.seeded) { log('no state; run seed first'); return; }
    if (PHASES.length === 1 && PHASES[0] === 'seed') return;

    const {page, close} = await launch(app);
    const ev = await instrument(page);
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : undefined); await idle(page).catch(() => {}); };
    async function sect(name, fn) {
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(page, `zz-failed-${name.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
            return null;
        }
    }
    const langUrl = (ctx) => cu(ctx, '/management/settings/website');
    async function grids(ctx, name, url) {
        await landLanguages(page, url || langUrl(ctx));
        const g = await readGrids(page);
        await snap(page, name, {grids: g});
        log(`[${app.name} ${name}]`, gridLine(g));
        return g;
    }
    // Click a cell and read the same page, then again after a reload.
    async function press(ctx, grid, code, col, name, {url, reload = true} = {}) {
        const sel = cellSel(grid, code, col);
        const box = page.locator(sel).first();
        const out = {found: await box.count()};
        if (!out.found) { out.grids = await readGrids(page); return out; }
        out.before = await box.isChecked().catch(() => null);
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 15000}).catch(() => null);
        await box.click();
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(page).catch(() => {}); await sleep(1500);
        Object.assign(out, await ev.since(t0));
        out.after = await page.locator(sel).first().isChecked().catch(() => null);
        out.gridsSame = await readGrids(page);
        await snap(page, `${name}-same`, {press: {sel, ...out, gridsSame: undefined}, grids: out.gridsSame});
        if (reload) {
            await landLanguages(page, url || langUrl(ctx));
            out.gridsReload = await readGrids(page);
            await snap(page, `${name}-reload`, {grids: out.gridsReload});
        }
        log(`[${app.name} ${name}]`, JSON.stringify({status: out.status, before: out.before, after: out.after, notices: out.notices, dialogs: out.dialogs, errs: out.errs.length, bad: out.bad}), '\n   same:', gridLine(out.gridsSame), '\n   reload:', out.gridsReload ? gridLine(out.gridsReload) : '-');
        return out;
    }
    const brief = (o) => o && ({status: o.status, before: o.before, after: o.after, notices: o.notices, dialogs: o.dialogs, errs: o.errs, bad: o.bad,
        same: o.gridsSame && gridLine(o.gridsSame), reload: o.gridsReload && gridLine(o.gridsReload)});
    // A row's arrow: what it offers.
    async function arrow(code, name) {
        const row = page.locator(`#languageGridContainer tr.gridRow[id$="-row-${code}"]`).first();
        const a = row.locator('a.show_extras').first();
        const out = {arrow: await a.count()};
        if (out.arrow) {
            await a.click().catch(() => {}); await sleep(500);
            out.links = await page.locator(`#languageGridContainer tr[id$="-row-${code}-control-row"] a`).evaluateAll((as) => as.filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
            await snap(page, name, {arrow: out});
        }
        return out;
    }
    // Hosted Journals › a row's arrow › "Settings wizard"; returns the wizard address.
    async function openWizard(ctxPath, name) {
        await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
        await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        const row = page.locator('tr.gridRow').filter({hasText: ctxPath}).first();
        let rowFound = await row.count();
        if (!rowFound) {
            // the list may be paged or show names only: find by the journal's name
            const byName = page.locator('tr.gridRow').filter({hasText: new RegExp(ctxPath.slice(-6))}).first();
            rowFound = await byName.count();
        }
        const r = rowFound ? row : page.locator('tr.gridRow').last();
        await r.locator('a.show_extras').first().click().catch(() => {});
        await sleep(400);
        const rid = await r.getAttribute('id');
        const ctl = page.locator(`[id="${rid}-control-row"]`);
        const actions = await ctl.locator('a').evaluateAll((as) => as.filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
        await snap(page, `${name}-hosted-row`, {rowActions: actions, rowFound});
        await ctl.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await page.waitForURL(/admin\/wizard/, {timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        return {url: page.url(), rowActions: actions, rowFound};
    }

    try {
        // ============================================================ read: publicknowledge, read only
        if (on('read')) await sect('read', async () => {
            const out = {};
            const levels = [['admin', 'admin'], ['manager', 'manager.maya'], ['editor', isOPS ? null : 'editor.diana'], ['sectionEditor', 'sectioneditor.ana'],
                ['assistant', isOPS ? 'assistant.rita' : 'copyeditor.carla'], ['reviewer', isOPS ? null : 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa']];
            for (const [lvl, u] of levels) {
                if (!u) continue;
                await as(u);
                const l = await landing(page, langUrl(PK));
                const o = {landing: {finalUrl: l.finalUrl, status: l.status, h1: l.h1, denied: l.denied, loginForm: l.loginForm, body: l.body.slice(0, 200)}};
                if (/settings\/website/.test(l.finalUrl) && !l.denied) {
                    await landLanguages(page, langUrl(PK));
                    o.grids = await readGrids(page);
                    o.gridLine = gridLine(o.grids);
                    if (lvl === 'admin' || lvl === 'manager' || lvl === 'editor') {
                        o.enArrow = await arrow('en', `r-${lvl}-en-arrow`);
                        o.frArrow = await arrow('fr_CA', `r-${lvl}-fr-arrow`);
                    }
                    if (lvl === 'manager') {
                        for (const [d, s] of [['Website Languages heading', page.locator('#languageGridContainer h4').first()], ['Submission Languages heading', page.locator('#submissionLanguageGridContainer h4').first()],
                            ['French row "UI" box', page.locator(cellSel('site', 'fr_CA', 'uiLocale')).first()], ['French row "Forms" box', page.locator(cellSel('site', 'fr_CA', 'formLocale')).first()],
                            ['English row "Primary locale" radio', page.locator(cellSel('site', 'en', 'contextPrimary')).first()],
                            ['"Add/Remove Languages"', page.locator('#submissionLanguageGridContainer .header a[id*="addLanguageModal"]').first()],
                            ['English "Submissions" box', page.locator(cellSel('sub', 'en', 'submissionLocale')).first()]]) {
                            await loc(page, `Settings › Website › Setup › Languages: ${d}`, s);
                        }
                    }
                }
                await snap(page, `r-${lvl}-publicknowledge-languages`, o);
                out[lvl] = o;
            }
            // the site's own list, read only (Administration › Site Settings › Site Setup › Languages), for the "as on the site's list" comparison
            await as('admin');
            await page.goto(app.url('/index.php/index/admin/settings')); await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {}); await idle(page);
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {}); await idle(page);
            await page.locator('#languageGridContainer tr.gridRow, [id*="admin-languages"] tr.gridRow, tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
            await sleep(600);
            out.siteList = await page.locator('tr.gridRow').filter({visible: true}).evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            await snap(page, 'r-site-languages-list-readonly', {rows: out.siteList});
            fact('read', out);
        });

        // ============================================================ perm: Settings 4, the roles window defaults, a production editor
        if (on('perm')) await sect('perm', async () => {
            const out = {};
            // the roles window, read only, on A as its manager
            await as(S.A.u.mg, S.A.path);
            await page.goto(cu(S.A.path, '/management/settings/access')); await idle(page);
            await page.getByRole('tab', {name: 'Roles'}).click().catch(() => {}); await idle(page); await sleep(600);
            out.rolesGrid = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
            await snap(page, 'p-01-roles-grid');
            const names = isOPS ? ['Preprint Server manager', 'Moderator'] : isOMP ? ['Press manager', 'Press editor', 'Production editor', 'Series editor'] : ['Journal manager', 'Journal editor', 'Production editor', 'Section editor'];
            out.forms = {};
            for (const rn of names) {
                const row = page.getByRole('row', {name: new RegExp(`^Settings ${rn}\\b`, 'i')}).first();
                if (!(await row.count())) { out.forms[rn] = {row: 0}; continue; }
                await row.getByRole('link', {name: 'Settings'}).click().catch(() => {}); await sleep(300);
                await page.locator(`[id="${await row.getAttribute('id')}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).click().catch(() => {});
                await idle(page);
                const form = page.locator('#userGroupForm');
                await form.waitFor({timeout: T}).catch(() => {}); await sleep(500);
                const box = form.getByRole('checkbox', {name: 'Permit changes to Settings'});
                out.forms[rn] = {present: await box.count(), checked: await box.isChecked().catch(() => null), disabled: await box.isDisabled().catch(() => null),
                    level: await form.locator('select[name="roleId"]').evaluate((s) => s.options[s.selectedIndex]?.text).catch(() => null)};
                await snap(page, `p-02-role-${rn.replace(/\W+/g, '')}`, out.forms[rn]);
                if (rn === names[0]) await loc(page, 'Roles › Edit: "Permit changes to Settings" box', box);
                await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /Close|Cancel/}).first().click().catch(() => {});
                await sleep(900);
                await page.goto(cu(S.A.path, '/management/settings/access')); await idle(page);
                await page.getByRole('tab', {name: 'Roles'}).click().catch(() => {}); await idle(page); await sleep(500);
            }
            // a production editor at default (A), OJS/OMP
            if (S.A.u.pe) {
                await as(S.A.u.pe, S.A.path);
                const l = await landing(page, langUrl(S.A.path));
                out.peDefault = {finalUrl: l.finalUrl, h1: l.h1, denied: l.denied};
                if (!l.denied && /settings\/website/.test(l.finalUrl)) {
                    await landLanguages(page, langUrl(S.A.path));
                    out.peDefault.grids = gridLine(await readGrids(page));
                    out.peDefault.enArrow = await arrow('en', 'p-03-pe-en-arrow');
                }
                await snap(page, 'p-03-pe-default-languages', out.peDefault);
            }
            // E: editor and production editor with "Permit changes to Settings" off
            if (S.E && S.E.path) {
                for (const k of ['ed', 'pe', 'mg']) {
                    await as(S.E.u[k], S.E.path);
                    const l = await landing(page, langUrl(S.E.path));
                    const menu = await page.locator('nav, [data-cy="app-nav"], #app-nav').first().innerText().catch(() => '');
                    out[`E_${k}`] = {finalUrl: l.finalUrl, h1: l.h1, denied: l.denied, body: l.body.slice(0, 200), settingsInMenu: /Settings/.test(menu)};
                    await snap(page, `p-04-E-${k}-typed-website`, out[`E_${k}`]);
                    if (k !== 'mg') {
                        const l2 = await landing(page, cu(S.E.path, '/dashboard/editorial'));
                        const nav = await page.locator('#app-nav, nav').first().innerText().catch(() => '');
                        out[`E_${k}`].dashNav = flat(nav, 400);
                        await snap(page, `p-05-E-${k}-dashboard`, {nav: out[`E_${k}`].dashNav, url: l2.finalUrl});
                    }
                }
            }
            fact('perm', out);
        });

        // ============================================================ wizard: the Site Administrator's Settings Wizard
        if (on('wizard')) await sect('wizard', async () => {
            const out = {};
            await as('admin');
            const w = await openWizard(S.A.path, 'w-01-A');
            out.A = {url: w.url.replace(/^https?:\/\/[^/]+/, ''), rowActions: w.rowActions, rowFound: w.rowFound};
            out.A.heading = flat(await page.locator('h1').first().innerText().catch(() => null), 100);
            out.A.tabs = await page.locator('[role=tablist]').first().locator('[role=tab]').evaluateAll((ts) => ts.map((t) => t.innerText.trim()));
            out.A.sideTabs = await page.locator('[role=tablist]').evaluateAll((ls) => ls.map((l) => [...l.querySelectorAll('[role=tab]')].filter((t) => t.getClientRects().length).map((t) => t.innerText.trim())));
            await snap(page, 'w-02-A-wizard-arrival', out.A);
            S.A.wizard = w.url; save();
            // the wizard's "Languages" side tab
            const lt = page.locator('#languages-button').filter({visible: true}).first();
            out.A.languagesTab = await lt.count();
            if (out.A.languagesTab) {
                await lt.click(); await idle(page);
                await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
                await page.locator('#submissionLanguageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
                await sleep(500);
                out.A.grids = gridLine(await readGrids(page));
                out.A.enArrow = await arrow('en', 'w-03-A-wizard-en-arrow');
                await snap(page, 'w-03-A-wizard-languages', {grids: out.A.grids});
                await loc(page, 'Settings Wizard: side tab "Languages"', lt);
            }
            // G: a change in the wizard (French "Forms"), the notice; Add/Remove Languages opened and closed
            const wg = await openWizard(S.G.path, 'w-04-G');
            S.G.wizard = wg.url; save();
            const wizLang = async () => {
                await page.goto(S.G.wizard); await idle(page);
                await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
                await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
                await page.locator('#submissionLanguageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page); await sleep(500);
            };
            await wizLang();
            out.G = {before: gridLine(await readGrids(page))};
            await snap(page, 'w-05-G-wizard-languages-before');
            const t0 = Date.now();
            const box = page.locator(cellSel('site', 'fr_CA', 'formLocale')).first();
            const wr = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 15000}).catch(() => null);
            await box.click().catch(() => {});
            const r = await wr; await idle(page); await sleep(1500);
            out.G.formsTick = {status: r && r.status(), ...(await ev.since(t0)), same: gridLine(await readGrids(page))};
            await snap(page, 'w-06-G-wizard-forms-ticked', {press: out.G.formsTick});
            await wizLang();
            out.G.formsTick.reload = gridLine(await readGrids(page));
            await snap(page, 'w-07-G-wizard-forms-reload');
            // the journal's own tab shows the wizard's change
            await as('admin');
            await landLanguages(page, langUrl(S.G.path));
            out.G.ownTab = gridLine(await readGrids(page));
            await snap(page, 'w-08-G-own-tab-after-wizard');
            // a manager typing the wizard address
            await as(S.A.u.mg, S.A.path);
            const lm = await landing(page, S.A.wizard);
            out.managerTypedWizard = {finalUrl: lm.finalUrl, h1: lm.h1, denied: lm.denied, body: lm.body.slice(0, 250)};
            await snap(page, 'w-09-manager-typed-wizard', out.managerTypedWizard);
            fact('wizard', out);
        });

        // ============================================================ create: Rule 8 on a journal created on screen
        if (on('create')) await sect('create', async () => {
            const out = {};
            for (const [hk, langs] of [['H', ['en', 'fr_CA']], ['H2', ['en']]]) {
                if (S[hk]) continue;
                const hPath = `${S.t}${hk.toLowerCase()}`;
                await as('admin');
                await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
                const create = page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first();
                out.createLabel = flat(await create.innerText().catch(() => ''), 80);
                await create.click();
                await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(500);
                const cf = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first();
                out.formLanguages = await cf.evaluate((f) => {
                    const groups = [...f.querySelectorAll('fieldset, .pkpFormField')].filter((g) => /Languages|Primary locale/.test(g.innerText.slice(0, 60)));
                    return groups.map((g) => ({text: g.innerText.replace(/\s+/g, ' ').trim().slice(0, 300), inputs: [...g.querySelectorAll('input')].map((i) => `${i.type}:${i.value}:${i.checked ? 'X' : '-'}`)}));
                }).catch((e) => ({error: String(e.message)}));
                await snap(page, `c-01-create-form-${hk}`, {formLanguages: out.formLanguages});
                await cf.locator('[id^="context-name-control"]').first().fill(`U57 K2 H ${S.t}`);
                const acr = cf.locator('[id^="context-acronym-control"]').first(); if (await acr.count()) await acr.fill('K2H');
                const cn = cf.locator('[id^="context-contactName-control"]').first(); if (await cn.count()) await cn.fill('Hal Principal');
                const ce = cf.locator('[id^="context-contactEmail-control"]').first(); if (await ce.count()) await ce.fill(`${S.t}hal@mail.test`);
                await cf.locator('[id^="context-urlPath-control"]').first().fill(hPath);
                for (const v of langs) { const b = cf.locator(`input[type="checkbox"][value="${v}"]`).first(); if (await b.count() && !(await b.isChecked())) await b.check().catch(() => {}); }
                await cf.locator('input[type="radio"][value="en"]').first().check().catch(() => {});
                // first "Save" with no country chosen (the form marks it optional), then with one
                let wr = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await cf.getByRole('button', {name: 'Save', exact: true}).click();
                let resp = await wr;
                out.noCountryStatus = resp ? resp.status() : null;
                await sleep(1500); await idle(page).catch(() => {});
                out.noCountryErrors = await cf.locator('.pkpFieldError, .pkpFormErrors, [class*="Error"]').evaluateAll((es) => es.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
                await snap(page, `c-02a-create-no-country-${hk}`, {status: out.noCountryStatus, errors: out.noCountryErrors});
                if (out.noCountryStatus !== 200) {
                    await cf.locator('select[id^="context-country-control"]').first().selectOption({label: 'Iceland'}).catch(() => {});
                    wr = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                    await cf.getByRole('button', {name: 'Save', exact: true}).click();
                    resp = await wr;
                }
                out.createStatus = resp ? resp.status() : null;
                await sleep(2000); await idle(page).catch(() => {});
                await snap(page, `c-02-created-${hk}`, {status: out.createStatus});
                if (out.createStatus && out.createStatus < 400) { S[hk] = {path: hPath}; save(); }
            }
            await as('admin');
            if (S.H) out.H = gridLine(await grids(S.H.path, 'c-03-H-languages'));
            if (S.H2) out.H2 = gridLine(await grids(S.H2.path, 'c-03b-H2-languages'));
            if (S.H) {
                const V = await launch(app);
                try {
                    const x = await publicRead(V.page, cu(S.H.path, '/fr_CA/about/privacy'));
                    out.HfrPrivacy = {url: x.finalUrl, lang: x.lang, main: x.main.slice(0, 300)};
                    await snap(V.page, 'c-03c-H-visitor-fr-privacy', {pub: out.HfrPrivacy});
                } finally { await V.close(); }
                await landLanguages(page, langUrl(S.H.path));
                out.HprivForm = await openSideTab(page, langUrl(S.H.path), 'setup', 'privacy');
                await snap(page, 'c-03d-H-privacy-form', {info: out.HprivForm});
            }
            // the seeded journal's ticks, for the "seeded journal" sentence (read only)
            await as('manager.maya');
            out.PK = gridLine(await grids(PK, 'c-04-publicknowledge-languages'));
            // a scratch journal seeded without language keys (C) as its manager: the default a new context gets from the service
            await as(S.C.u.mg, S.C.path);
            out.C = gridLine(await grids(S.C.path, 'c-05-C-languages-seeded-default'));
            fact('create', out);
        });

        // ============================================================ forms: Rule 10, 10a, 10b, A5, Side effects 352–358
        if (on('forms')) await sect('forms', async () => {
            const out = {};
            const A = S.A;
            await as(A.u.mg, A.path);
            // before: the Privacy Statement form, public pages in French (fallback), recommendations (OJS), a section window
            out.privBefore = await openSideTab(page, langUrl(A.path), 'setup', 'privacy');
            await snap(page, 'f-01-A-privacy-before', {info: out.privBefore});
            const pub = async (label) => {
                const r = {};
                const V = await launch(app);   // a signed-out visitor in a browser of its own
                try {
                    for (const [k, p] of [['privacy', '/fr_CA/about/privacy'], ['submissions', '/fr_CA/about/submissions'], ['readers', '/fr_CA/information/readers'], ['authors', '/fr_CA/information/authors'], ['librarians', '/fr_CA/information/librarians'], ['about', '/fr_CA/about']]) {
                        const x = await publicRead(V.page, cu(A.path, p));
                        r[k] = {url: x.finalUrl, lang: x.lang, main: x.main.slice(0, 500)};
                    }
                    await snap(V.page, `f-${label}-public-fr-about`, {pub: r});
                } finally { await V.close(); }
                return r;
            };
            out.pubBefore = await pub('02-before');
            const recs = async (label) => {
                if (!isOJS) {
                    await page.goto(cu(A.path, '/fr_CA/management/settings/workflow')); await idle(page);
                    await page.locator('#review-button').first().click().catch(() => {}); await idle(page);
                    const tabs = await page.locator('[role=tablist]').evaluateAll((ls) => ls.map((l) => [...l.querySelectorAll('[role=tab]')].filter((t) => t.getClientRects().length).map((t) => t.innerText.trim())));
                    await snap(page, `f-${label}-review-tabs-fr`, {tabs});
                    await page.goto(cu(A.path, '/en/management/settings/website')); await idle(page);
                    return {tabs};
                }
                await page.goto(cu(A.path, '/fr_CA/management/settings/workflow')); await idle(page);
                await page.locator('#review-button').first().click().catch(() => {}); await idle(page);
                const rt = page.locator('[role=tab]').filter({visible: true}).filter({hasText: /Recommandations|Recommendations/}).first();
                await rt.click().catch(() => {}); await idle(page);
                const root = page.locator('[data-cy="reviewer-recommendation-manager"]');
                await root.locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
                const rows = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td') || {}).innerText?.trim())).catch(() => []);
                await snap(page, `f-${label}-recommendations-fr`, {rows});
                await page.goto(cu(A.path, '/en/management/settings/website')); await idle(page);   // back to English for the reads that follow
                return {rows};
            };
            out.recsBefore = await recs('03-before');
            // Manage Emails: one template's language buttons (en only yet)
            const emailTpl = async (label) => {
                await page.goto(cu(A.path, '/management/settings/manageEmails')); await idle(page);
                const LP = '.manageEmails__listPanel';
                await page.locator(`${LP} .listPanel__item`).first().waitFor({timeout: 30000}).catch(() => {});
                const name = isOPS ? 'Submission Acknowledgement (Pending Moderation)' : 'Submission Confirmation';
                const item = page.locator(`${LP} .listPanel__item`).filter({hasText: name}).first();
                await item.locator('button').filter({hasText: /Edit|Modifier/}).first().click().catch(() => {});
                await page.locator('[role=dialog]:visible').last().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(800);
                // the mailable window lists templates; open the first "Edit"
                const d = page.locator('[role=dialog]:visible').last();
                const tplEdit = d.locator('.listPanel__item').first().getByRole('button', {name: 'Edit', exact: true});
                if (await tplEdit.count()) { await tplEdit.click().catch(() => {}); await idle(page); await sleep(800); }
                await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && /body/i.test(e.id)), null, {timeout: 20000}).catch(() => {});
                await sleep(500);
                const top = page.locator('[role=dialog]:visible').last();
                const info = await top.evaluate((w) => ({
                    title: (w.querySelector('h2, h1') || {}).innerText,
                    localeButtons: [...w.querySelectorAll('.pkpFormLocales button, [class*="FormLocales"] button')].map((b) => b.innerText.trim()),
                    subjects: [...w.querySelectorAll('input[name^="subject"]')].map((i) => `${i.name}=${i.value.slice(0, 80)}`),
                })).catch((e) => ({error: String(e.message)}));
                info.editors = Object.fromEntries(Object.entries(await editors(page)).filter(([k]) => /body/i.test(k)));
                // French button: press it and read the subject box again
                const frBtn = top.locator('.pkpFormLocales button, [class*="FormLocales"] button').filter({hasText: /French|Fran/}).first();
                if (await frBtn.count()) { await frBtn.click().catch(() => {}); await sleep(600); info.subjectsAfterFr = await top.locator('input[name^="subject"]').evaluateAll((is) => is.map((i) => `${i.name}=${i.value.slice(0, 80)}`)).catch(() => []); }
                await snap(page, `f-${label}-email-template`, {info});
                for (let i = 0; i < 3; i++) { const c = page.locator('[role=dialog]:visible').last().getByRole('button', {name: /^(Close|Cancel)\b/}).last(); if (await c.count()) { await c.click().catch(() => {}); await sleep(700); } }
                return info;
            };
            out.emailBefore = await emailTpl('04-before');
            // the section window (OJS/OPS) or a series window (OMP): its per-language boxes
            const sectionWin = async (label) => {
                await page.goto(cu(A.path, '/management/settings/context')); await idle(page);
                const tabId = isOMP ? '#series-button' : '#sections-button';
                await page.locator(tabId).first().click().catch(() => {}); await idle(page);
                await page.locator('tr.gridRow').filter({visible: true}).first().waitFor({timeout: 15000}).catch(() => {});
                const row = page.locator('tr.gridRow').filter({visible: true}).first();
                const out2 = {rows: await row.count()};
                if (out2.rows) {
                    await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(400);
                    const rid = await row.getAttribute('id');
                    await page.locator(`[id="${rid}-control-row"] a`).first().click().catch(() => {});
                    const f = page.locator('form#sectionForm, form#seriesForm').first();
                    await f.waitFor({timeout: T}).catch(() => {}); await idle(page);
                    await f.locator('input[name^="title"]').first().waitFor({timeout: 20000}).catch(() => {}); await sleep(800);
                    out2.titleInputs = await f.locator('input[name^="title"]').evaluateAll((is) => is.map((i) => `${i.name}=${i.value}`)).catch(() => []);
                    out2.localeToggles = await f.locator('.localization_popover_container, .pkpFormLocales, [class*="multilingual"]').count().catch(() => 0);
                    await snap(page, `f-${label}-section-window`, out2);
                    const c = page.locator('[role=dialog]:visible').last();
                    await c.getByRole('link', {name: 'Cancel', exact: true}).or(c.getByRole('button', {name: /^(Cancel|Close)/})).first().click().catch(() => {});
                    await sleep(800);
                } else await snap(page, `f-${label}-section-window-none`);
                return out2;
            };
            out.sectionBefore = await sectionWin('05-before');
            const distEditors = async (label) => {
                await page.goto(cu(A.path, '/management/settings/distribution')); await idle(page);
                const tabs = await page.locator('[role=tab]').filter({visible: true}).evaluateAll((ts) => ts.map((t) => t.id));
                const all = {};
                for (const id of tabs) {
                    await page.locator(`[id="${id}"]`).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(700);
                    Object.assign(all, await editors(page));
                }
                const pick = Object.fromEntries(Object.entries(all).filter(([k]) => /openAccess|lockss|clockss/i.test(k)));
                await snap(page, `f-${label}-distribution-editors`, {tabs, editors: pick});
                return {tabs, editors: pick};
            };
            out.distBefore = await distEditors('05b-before');
            // the tick: French "Forms" (A5: console errors), then without reload Privacy Statement and Date & Time
            await landLanguages(page, langUrl(A.path));
            await snap(page, 'f-06-A-languages-before', {grids: await readGrids(page)});
            const sel = cellSel('site', 'fr_CA', 'formLocale');
            const t0 = Date.now();
            const wr = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 15000}).catch(() => null);
            await page.locator(sel).first().click();
            const r = await wr;
            await idle(page).catch(() => {}); await sleep(1500);
            out.tick = {status: r && r.status(), checkedSame: await page.locator(sel).first().isChecked().catch(() => null), ...(await ev.since(t0)), same: gridLine(await readGrids(page))};
            await snap(page, 'f-07-A-forms-ticked-same', {press: out.tick});
            // without a reload: Privacy Statement
            await page.locator('#privacy-button').filter({visible: true}).first().click().catch(() => {});
            await idle(page); await sleep(1200);
            out.privNoReload = await page.locator('#privacy').first().evaluate((p) => ({localeButtons: [...p.querySelectorAll('.pkpFormLocales button, [class*="FormLocales"] button')].map((b) => b.innerText.trim())})).catch((e) => ({error: String(e.message)}));
            const frB = page.locator('#privacy .pkpFormLocales button, #privacy [class*="FormLocales"] button').filter({hasText: /French|Fran/}).first();
            if (await frB.count()) { await frB.click().catch(() => {}); await sleep(900); }
            out.privNoReload.editors = await editors(page);
            await snap(page, 'f-08-A-privacy-no-reload', {info: out.privNoReload});
            // Date & Time: open it, pick another radio in the first group, read which is selected
            const t1 = Date.now();
            await page.locator('#dateTime-button').filter({visible: true}).first().click().catch(() => {});
            await idle(page); await sleep(900);
            const dt = page.locator('#dateTime').first();
            const radios = dt.locator('input[type=radio]');
            out.dateTime = {radios: await radios.count()};
            if (out.dateTime.radios > 1) {
                const r2 = radios.nth(1);
                await r2.click({force: true}).catch((e) => { out.dateTime.clickError = String(e.message).slice(0, 200); });
                await sleep(500);
                out.dateTime.secondChecked = await r2.isChecked().catch(() => null);
            }
            Object.assign(out.dateTime, await ev.since(t1));
            await snap(page, 'f-09-A-datetime-no-reload', {dateTime: out.dateTime});
            // leave the Website Settings page with the unsaved Date & Time change
            const t2 = Date.now();
            await page.goto(cu(A.path, '/management/settings/context')).catch(() => {}); await idle(page).catch(() => {});
            out.leaveUnsaved = await ev.since(t2);
            // reload: Privacy Statement
            out.privReload = await openSideTab(page, langUrl(A.path), 'setup', 'privacy');
            const frB2 = page.locator('#privacy .pkpFormLocales button, #privacy [class*="FormLocales"] button').filter({hasText: /French|Fran/}).first();
            if (await frB2.count()) { await frB2.click().catch(() => {}); await sleep(900); }
            out.privReload.editors = await editors(page);
            await snap(page, 'f-10-A-privacy-reload', {info: out.privReload});
            // Information (OJS/OMP) and the other default texts, read from the forms after the reload
            if (!isOPS) {
                out.infoReload = await openSideTab(page, langUrl(A.path), 'setup', 'information');
                await snap(page, 'f-11-A-information-reload', {info: out.infoReload});
            }
            out.guidelines = await openSideTab(page, cu(A.path, '/management/settings/workflow'), 'submission', 'authorGuidelines');
            await snap(page, 'f-12-A-author-guidelines', {info: out.guidelines});
            // public pages in French after
            out.pubAfter = await pub('13-after');
            out.recsAfter = await recs('14-after');
            out.emailAfter = await emailTpl('15-after');
            out.sectionAfter = await sectionWin('16-after');
            out.distAfter = await distEditors('16b-after');
            // then French "UI" unticked with "Forms" ticked; back on
            await landLanguages(page, langUrl(A.path));
            out.uiOffFormsOn = brief(await press(A.path, 'site', 'fr_CA', 'uiLocale', 'f-17-A-ui-off-forms-on'));
            out.uiBackOn = brief(await press(A.path, 'site', 'fr_CA', 'uiLocale', 'f-18-A-ui-back-on'));
            fact('forms', out);
        });

        // ============================================================ ui: Rule 9 on B (English alone under "UI")
        if (on('ui')) await sect('ui', async () => {
            const out = {};
            const B = S.B;
            const recsFr = async (label) => {
                if (!isOJS) return null;
                await page.goto(cu(B.path, '/fr_CA/management/settings/workflow')); await idle(page);
                await page.locator('#review-button').first().click().catch(() => {}); await idle(page);
                await page.locator('[role=tab]').filter({visible: true}).filter({hasText: /Recommandations|Recommendations/}).first().click().catch(() => {}); await idle(page);
                const root = page.locator('[data-cy="reviewer-recommendation-manager"]');
                await root.locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
                const rows = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td') || {}).innerText?.trim())).catch(() => []);
                await snap(page, `u-${label}-recommendations-fr`, {rows, url: page.url()});
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), rows};
            };
            const V = await launch(app); // a visitor, signed out, in a browser of its own
            const vp = V.page;
            try {
                const vis = async (label, p = '/index') => { const x = await publicRead(vp, cu(B.path, p)); await snap(vp, `u-${label}`, {pub: x}); return {url: x.finalUrl, lang: x.lang, alternates: x.alternates, block: x.block, blockLinks: x.blockLinks, main: x.main.slice(0, 300)}; };
                out.v0 = await vis('01-visitor-home-one-ui');
                out.v0fr = await vis('02-visitor-fr-about-one-ui', '/fr_CA/about');
                await as(B.u.mg, B.path);
                await page.goto(cu(B.path, '/dashboard/editorial')); await idle(page);
                out.mgUrl0 = page.url().replace(/^https?:\/\/[^/]+/, '');
                out.initials0 = await openInitials(page);
                await snap(page, 'u-03-mg-initials-one-ui', {initials: out.initials0});
                await landLanguages(page, langUrl(B.path));
                out.grids0 = gridLine(await readGrids(page));
                out.tickUi = brief(await press(B.path, 'site', 'fr_CA', 'uiLocale', 'u-04-B-ui-fr-ticked'));
                out.v1 = await vis('05-visitor-home-two-ui');
                out.v1b = await vis('06-visitor-about-two-ui', '/about');
                out.v1priv = await vis('06b-visitor-fr-privacy-forms-en-only', '/fr_CA/about/privacy');   // French box never filled: fallback?
                out.v1fr = await vis('07-visitor-fr-about-two-ui', '/fr_CA/about');   // the visitor now reads in French
                out.v1bare = await vis('08-visitor-bare-after-fr', '/index');
                await page.goto(cu(B.path, '/dashboard/editorial')); await idle(page);
                out.mgUrl1 = page.url().replace(/^https?:\/\/[^/]+/, '');
                out.initials1 = await openInitials(page);
                await snap(page, 'u-09-mg-initials-two-ui', {initials: out.initials1, url: out.mgUrl1});
                out.recs1 = await recsFr('09b-ui-only');
                // untick French: the visitor who was reading in it
                await landLanguages(page, langUrl(B.path));
                out.untickUi = brief(await press(B.path, 'site', 'fr_CA', 'uiLocale', 'u-10-B-ui-fr-unticked'));
                out.v2 = await vis('11-visitor-bare-after-untick', '/index');
                out.v2fr = await vis('12-visitor-fr-about-after-untick', '/fr_CA/about');
                out.v2en = await vis('13-visitor-en-about-after-untick', '/en/about');
                await page.goto(cu(B.path, '/dashboard/editorial')); await idle(page);
                out.mgUrl2 = page.url().replace(/^https?:\/\/[^/]+/, '');
                out.initials2 = await openInitials(page);
                await snap(page, 'u-13b-mg-initials-after-untick', {initials: out.initials2, url: out.mgUrl2});
                // "Forms" without "UI": French under Forms with English alone under UI
                out.privBeforeForms = await openSideTab(page, langUrl(B.path), 'setup', 'privacy');
                await landLanguages(page, langUrl(B.path));
                out.formsNoUi = brief(await press(B.path, 'site', 'fr_CA', 'formLocale', 'u-14-B-forms-fr-without-ui'));
                out.privFormsNoUi = await openSideTab(page, langUrl(B.path), 'setup', 'privacy');
                await snap(page, 'u-15-B-privacy-forms-without-ui', {info: out.privFormsNoUi});
                // French back under UI: the French pages now carry the default texts; the recommendations' names
                await landLanguages(page, langUrl(B.path));
                out.tickUi2 = brief(await press(B.path, 'site', 'fr_CA', 'uiLocale', 'u-16-B-ui-fr-ticked-again'));
                out.v3priv = await vis('17-visitor-fr-privacy-after-forms', '/fr_CA/about/privacy');
                out.recs2 = await recsFr('18-after-forms');
            } finally { await V.close(); }
            fact('ui', out);
        });

        // ============================================================ primary: Rules 11, 12 on F
        if (on('primary')) await sect('primary', async () => {
            const out = {};
            const F = S.F;
            await as(F.u.mg, F.path);
            await landLanguages(page, langUrl(F.path));
            out.before = gridLine(await readGrids(page));
            out.primaryFr = brief(await press(F.path, 'site', 'fr_CA', 'contextPrimary', 'pr-01-F-primary-fr'));
            // the French privacy box after the switch (no "Forms" tick was pressed)
            out.priv = await openSideTab(page, langUrl(F.path), 'setup', 'privacy');
            await snap(page, 'pr-02-F-privacy-after-primary', {info: out.priv});
            if (isOJS) {
                await page.goto(cu(F.path, '/fr_CA/management/settings/workflow')); await idle(page);
                await page.locator('#review-button').first().click().catch(() => {}); await idle(page);
                await page.locator('[role=tab]').filter({visible: true}).filter({hasText: /Recommandations|Recommendations/}).first().click().catch(() => {}); await idle(page);
                const root = page.locator('[data-cy="reviewer-recommendation-manager"]');
                await root.locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
                out.recsFr = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td') || {}).innerText?.trim())).catch(() => []);
                await snap(page, 'pr-03-F-recommendations-fr', {rows: out.recsFr});
                await page.goto(cu(F.path, '/en/management/settings/website')); await idle(page);
            }
            // Masthead: which language's title is required, and "Save" with the French title empty
            await page.goto(cu(F.path, '/management/settings/context')); await idle(page);
            await page.locator('#masthead-button').first().click().catch(() => {}); await idle(page); await sleep(800);
            const mf = page.locator('#masthead form, form').filter({has: page.locator('[id^="masthead-name-control"]')}).first();
            out.masthead = await mf.evaluate((f) => ({
                localeButtons: [...f.querySelectorAll('.pkpFormLocales button, [class*="FormLocales"] button')].map((b) => b.innerText.trim()),
                nameInputs: [...f.querySelectorAll('[id^="masthead-name-control"]')].map((i) => `${i.id}=${i.value}`),
                required: [...f.querySelectorAll('.pkpFormFieldLabel')].filter((l) => /\*/.test(l.innerText) || l.querySelector('.pkpFormFieldLabel__required, [class*="required"]')).map((l) => l.innerText.replace(/\s+/g, ' ').trim()).slice(0, 10),
            })).catch((e) => ({error: String(e.message)}));
            await snap(page, 'pr-04-F-masthead', {masthead: out.masthead});
            const t0 = Date.now();
            await mf.getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
            await sleep(2500); await idle(page).catch(() => {});
            out.mastheadSave = {...(await ev.since(t0)), errors: await mf.locator('.pkpFieldError, .pkpFormField__error, [class*="Error"]').evaluateAll((es) => es.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
                page: flat(await page.locator('.pkpFormPage__status, [role="status"], .pkpNotification').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300)};
            await snap(page, 'pr-05-F-masthead-save', {save: out.mastheadSave});
            // a first visit, browser preferring German (offered by no journal): which language
            const V = await launch(app);
            try {
                await V.page.setExtraHTTPHeaders({'Accept-Language': 'de-DE,de;q=0.9'});
                const x = await publicRead(V.page, cu(F.path, '/index'));
                out.visitorDe = {url: x.finalUrl, lang: x.lang};
                await snap(V.page, 'pr-06-F-visitor-de', {pub: out.visitorDe});
                const V2 = await launch(app);
                try {
                    const y = await publicRead(V2.page, cu(F.path, '/index'));   // default browser language (en-US)
                    out.visitorDefault = {url: y.finalUrl, lang: y.lang};
                    await snap(V2.page, 'pr-06b-F-visitor-default-browser', {pub: out.visitorDefault});
                } finally { await V2.close(); }
                const V3 = await launch(app);
                try {
                    await V3.page.setExtraHTTPHeaders({'Accept-Language': 'en'});
                    const z = await publicRead(V3.page, cu(F.path, '/index'));
                    out.visitorEn = {url: z.finalUrl, lang: z.lang};
                    await snap(V3.page, 'pr-06c-F-visitor-en', {pub: out.visitorEn});
                } finally { await V3.close(); }
            } finally { await V.close(); }
            // Rule 12: untick "UI" and then "Forms" on the French (primary) row
            await landLanguages(page, langUrl(F.path));
            out.untickUi = brief(await press(F.path, 'site', 'fr_CA', 'uiLocale', 'pr-07-F-untick-ui-primary'));
            out.untickForms = brief(await press(F.path, 'site', 'fr_CA', 'formLocale', 'pr-08-F-untick-forms-primary'));
            // English back as primary
            out.primaryEn = brief(await press(F.path, 'site', 'en', 'contextPrimary', 'pr-09-F-primary-en'));
            // F2: a journal created with English alone; French ticked under "UI" only, then made primary
            if (S.F2 && S.F2.path) {
                const F2 = S.F2;
                await as(F2.u.mg, F2.path);
                await landLanguages(page, langUrl(F2.path));
                out.f2Ui = brief(await press(F2.path, 'site', 'fr_CA', 'uiLocale', 'pr-10-F2-ui-fr'));
                const recs = async (label) => {
                    if (!isOJS) return null;
                    await page.goto(cu(F2.path, '/fr_CA/management/settings/workflow')); await idle(page);
                    await page.locator('#review-button').first().click().catch(() => {}); await idle(page);
                    await page.locator('[role=tab]').filter({visible: true}).filter({hasText: /Recommandations|Recommendations/}).first().click().catch(() => {}); await idle(page);
                    const root = page.locator('[data-cy="reviewer-recommendation-manager"]');
                    await root.locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
                    const rows = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td') || {}).innerText?.trim())).catch(() => []);
                    await snap(page, `pr-${label}-F2-recommendations-fr`, {rows});
                    await page.goto(cu(F2.path, '/en/management/settings/website')); await idle(page);
                    return rows;
                };
                out.f2RecsUiOnly = await recs('11');
                const privBefore = await openSideTab(page, langUrl(F2.path), 'setup', 'privacy');
                out.f2PrivBefore = Object.fromEntries(Object.entries(privBefore.editors).filter(([k]) => /privacyStatement/.test(k)));
                await landLanguages(page, langUrl(F2.path));
                out.f2PrimaryFr = brief(await press(F2.path, 'site', 'fr_CA', 'contextPrimary', 'pr-12-F2-primary-fr'));
                out.f2RecsPrimary = await recs('13');
                const privAfter = await openSideTab(page, langUrl(F2.path), 'setup', 'privacy');
                out.f2PrivAfter = {buttons: privAfter.localeButtons, editors: Object.fromEntries(Object.entries(privAfter.editors).filter(([k]) => /privacyStatement/.test(k)))};
                await snap(page, 'pr-14-F2-privacy-after-primary', {priv: out.f2PrivAfter});
                await landLanguages(page, langUrl(F2.path));
                out.f2PrimaryEn = brief(await press(F2.path, 'site', 'en', 'contextPrimary', 'pr-15-F2-primary-en'));
            }
            fact('primary', out);
        });

        // ============================================================ reload: Rule 13, A2
        if (on('reload')) await sect('reload', async () => {
            const out = {};
            const A = S.A;
            await as('admin');
            await landLanguages(page, langUrl(A.path));
            out.adminEnArrow = await arrow('en', 'rl-01-admin-en-arrow');
            out.adminFrArrow = await arrow('fr_CA', 'rl-01b-admin-fr-arrow');
            // type "Our own policy." into the English Privacy Statement and save
            await openSideTab(page, langUrl(A.path), 'setup', 'privacy');
            const enFrame = page.frameLocator('#privacy iframe[id*="privacyStatement-control-en"]').first().locator('body');
            await enFrame.click().catch(() => {});
            await page.keyboard.press(SELECT_ALL); await page.keyboard.press('Delete');
            await enFrame.pressSequentially('Our own policy.').catch(() => {});
            const t0 = Date.now();
            const wr = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await page.locator('#privacy').getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
            const r = await wr; await sleep(1200);
            out.typed = {status: r && r.status(), ...(await ev.since(t0)), editors: await editors(page)};
            await snap(page, 'rl-02-privacy-typed-saved', {typed: out.typed});
            // Reload defaults on English: the question, its buttons; Cancel first, then confirm
            await landLanguages(page, langUrl(A.path));
            const openReload = async () => {
                const row = page.locator('#languageGridContainer tr.gridRow[id$="-row-en"]').first();
                await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(400);
                await page.locator('#languageGridContainer tr[id$="-row-en-control-row"] a').filter({hasText: 'Reload defaults'}).first().click();
                await sleep(1000);
                const d = page.locator('[role=dialog]:visible, [data-cy="dialog"]:visible').last();
                await d.waitFor({timeout: 10000}).catch(() => {});
                return d;
            };
            let d = await openReload();
            out.question = await d.evaluate((x) => ({text: x.innerText.replace(/\s+/g, ' ').trim().slice(0, 400), buttons: [...x.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean)})).catch((e) => ({error: String(e.message)}));
            await snap(page, 'rl-03-reload-question', {question: out.question});
            await loc(page, 'Languages: "Reload defaults" question dialog', d);
            const t1 = Date.now();
            await d.getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(1200);
            out.cancel = await ev.since(t1);
            await sleep(600);
            d = await openReload();
            const t2 = Date.now();
            const okBtn = d.getByRole('button', {name: /^(Reload defaults|OK|Yes)$/}).first();
            out.okLabel = await okBtn.innerText().catch(() => null);
            await okBtn.click().catch(() => {});
            await sleep(2500); await idle(page).catch(() => {});
            out.confirm = await ev.since(t2);
            await snap(page, 'rl-04-reload-confirmed', {confirm: out.confirm});
            out.privAfterSame = await openSideTab(page, langUrl(A.path), 'setup', 'privacy');
            await snap(page, 'rl-05-privacy-after-reload', {info: out.privAfterSame});
            // the journal's manager (not an administrator): the rows' arrows
            await as(A.u.mg, A.path);
            await landLanguages(page, langUrl(A.path));
            out.mgRows = (await readGrids(page)).site.rows.map((x) => ({code: x.code, arrow: x.arrow, rowActions: x.rowActions}));
            await snap(page, 'rl-06-manager-rows', {rows: out.mgRows});
            fact('reload', out);
        });

        // ============================================================ sublang: Rules 14–16 on C
        if (on('sublang')) await sect('sublang', async () => {
            const out = {};
            const C = S.C;
            await as(C.u.mg, C.path);
            const openAdd = async (name) => {
                await landLanguages(page, langUrl(C.path));
                await page.locator('#submissionLanguageGridContainer .header a[id*="addLanguageModal"]').first().click();
                const f = page.locator('form#addLanguageForm').first();
                await f.waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(600);
                const info = await f.evaluate((x) => {
                    const boxes = [...x.querySelectorAll('input[type=checkbox]')];
                    const lab = (b) => (b.closest('li, label, div')?.innerText || '').replace(/\s+/g, ' ').trim();
                    return {
                        heading: [...x.querySelectorAll('h1,h2,h3,h4,legend,.pkp_help, p, label.description, .description')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6),
                        count: boxes.length, checked: boxes.filter((b) => b.checked).map((b) => `${b.value}=${lab(b)}`),
                        sample: boxes.filter((b) => ['fr_CA', 'de', 'en', 'fr', 'de_CH', 'pt_BR'].includes(b.value)).map((b) => `${b.value}=${lab(b)}`),
                        buttons: [...x.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean),
                    };
                }).catch((e) => ({error: String(e.message)}));
                const dlg = page.locator('[role=dialog]:visible').last();
                info.dialogTitle = flat(await dlg.locator('h1, h2').first().innerText().catch(() => null), 80);
                await snap(page, name, {win: info});
                log(`[${app.name} ${name}]`, JSON.stringify(info).slice(0, 1200));
                return {f, info};
            };
            const setBoxes = async (f, want) => {
                for (const [v, on2] of Object.entries(want)) {
                    const b = f.locator(`input[type=checkbox][value="${v}"]`).first();
                    if (await b.count() && (await b.isChecked()) !== on2) await b.click();
                }
            };
            const saveAdd = async (f, name) => {
                const t0 = Date.now();
                await f.getByRole('button', {name: 'Save', exact: true}).first().click();
                await sleep(2000); await idle(page).catch(() => {});
                const o = {...(await ev.since(t0)), stillOpen: await f.isVisible().catch(() => false),
                    formErrors: await page.locator('form#addLanguageForm .error, form#addLanguageForm [class*="error"], form#addLanguageForm label.error, #formErrors').allInnerTexts().catch(() => [])};
                o.gridsSame = gridLine(await readGrids(page));
                await snap(page, name, {save: o});
                log(`[${app.name} ${name}]`, JSON.stringify(o).slice(0, 1500));
                return o;
            };
            // 1. the window as it opens
            let {f, info} = await openAdd('sl-01-C-add-remove-window');
            out.window = info;
            await loc(page, 'Add/Remove Languages window: form', f);
            await loc(page, 'Add/Remove Languages window: German box', f.locator('input[type=checkbox][value="de"]').first());
            // 2. tick German and French (Canada), Save
            await setBoxes(f, {de: true, fr_CA: true});
            out.addDeFr = await saveAdd(f, 'sl-02-C-add-de-fr-saved');
            await landLanguages(page, langUrl(C.path));
            out.afterAddReload = gridLine(await readGrids(page));
            await snap(page, 'sl-03-C-after-add-reload');
            // 3. German "Submissions" → Metadata?
            out.deSubTick = brief(await press(C.path, 'sub', 'de', 'submissionLocale', 'sl-04-C-de-submissions-tick'));
            // 4. untick German "Metadata" → Submissions?
            out.deMetaUntick = brief(await press(C.path, 'sub', 'de', 'submissionMetadataLocale', 'sl-05-C-de-metadata-untick'));
            // 5. German "Submissions" again, then untick it → Metadata?
            out.deSubTick2 = brief(await press(C.path, 'sub', 'de', 'submissionLocale', 'sl-06-C-de-submissions-tick2'));
            out.deSubUntick = brief(await press(C.path, 'sub', 'de', 'submissionLocale', 'sl-07-C-de-submissions-untick'));
            // 5b. German "Metadata" alone ticked (Submissions off) — the other direction's start
            // 6. untick "Submissions" and then "Metadata" on the English (Default) row
            out.enSubUntick = brief(await press(C.path, 'sub', 'en', 'submissionLocale', 'sl-08-C-en-default-submissions-untick'));
            out.enMetaUntick = brief(await press(C.path, 'sub', 'en', 'submissionMetadataLocale', 'sl-09-C-en-default-metadata-untick'));
            // 7. German's "Default"
            out.deDefault = brief(await press(C.path, 'sub', 'de', 'defaultSubmissionLocale', 'sl-10-C-de-default'));
            // the author's wizard with English and German under "Submissions"
            const wizardRead = async (name) => {
                await as(C.u.au, C.path);
                await page.goto(cu(C.path, '/submission')); await idle(page); await sleep(800);
                const o = await page.evaluate(() => ({
                    url: location.pathname + location.search,
                    labels: [...document.querySelectorAll('legend, label, .pkpFormFieldLabel, h2, h3')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40),
                    langRadios: [...document.querySelectorAll('input[type=radio]')].filter((r) => /locale|language/i.test(r.name)).map((r) => `${r.name}:${r.value}:${r.checked ? 'X' : '-'}:${(r.closest('label')?.innerText || '').trim()}`),
                    selects: [...document.querySelectorAll('select')].map((s) => `${s.name}:${[...s.options].map((o) => o.value).join('/')}`),
                }));
                await snap(page, name, {wizard: o});
                log(`[${app.name} ${name}]`, JSON.stringify(o).slice(0, 1500));
                return o;
            };
            // Begin a submission from the wizard's first page (choosing `locale` when asked), then read the Details step
            async function startSub(locale, name) {
                const o = {};
                await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized), null, {timeout: 15000}).catch(() => {});
                if (locale) await page.locator(`input[type=radio][name="locale"][value="${locale}"]`).first().check().catch((e) => { o.radioError = String(e.message).slice(0, 150); });
                const boxes = page.locator('input[type=checkbox]:visible');
                for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check().catch(() => {});
                const tinyTitle = page.frameLocator('iframe[id^="startSubmission-title-control"]').first().locator('body');
                await tinyTitle.click().catch(() => {});
                await tinyTitle.pressSequentially(`K2 ${name.slice(0, 20)} ${S.t}`).catch(() => {});
                const t0 = Date.now();
                await page.getByRole('button', {name: 'Begin Submission', exact: true}).first().click().catch((e) => { o.beginError = String(e.message).slice(0, 150); });
                await page.waitForURL(/submission\?id=\d+|submission\/wizard/, {timeout: 20000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(1500);
                Object.assign(o, {url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...(await ev.since(t0))});
                const det = page.getByRole('button', {name: /^Details/}).first();
                if (await det.count()) { await det.click().catch(() => {}); await idle(page).catch(() => {}); await sleep(900); }
                o.details = await page.evaluate(() => ({
                    langLines: (document.body.innerText.match(/[^\n]*(German|Deutsch|English|Submission Language|language)[^\n]*/gi) || []).slice(0, 12),
                    editors: window.tinymce ? window.tinymce.get().map((e) => e.id) : [],
                    localeButtons: [...document.querySelectorAll('.pkpFormLocales button, [class*="FormLocales"] button')].map((b) => b.innerText.trim()),
                    inputs: [...document.querySelectorAll('input[id*="title"], input[id*="keywords"]')].map((i) => i.id).slice(0, 10),
                }));
                await snap(page, name, {start: o});
                log(`[${app.name} ${name}]`, JSON.stringify(o).slice(0, 1200));
                return o;
            }
            out.wizardTwo = await wizardRead('sl-11-C-author-wizard-en-de');
            out.startTwo = await startSub('en', 'sl-11b-C-start-en-with-de-metadata');
            await as(C.u.mg, C.path);
            // 3-language order: English, French (Canada) (Default now), German — make French the default first
            await landLanguages(page, langUrl(C.path));
            out.frSubTick = brief(await press(C.path, 'sub', 'fr_CA', 'submissionLocale', 'sl-12-C-fr-submissions-tick'));
            out.frDefault = brief(await press(C.path, 'sub', 'fr_CA', 'defaultSubmissionLocale', 'sl-13-C-fr-default'));
            // 8. untick every box, Save
            ({f} = await openAdd('sl-14-C-window-before-empty'));
            await setBoxes(f, {en: false, de: false, fr_CA: false});
            out.emptySave = await saveAdd(f, 'sl-15-C-empty-save');
            // close whatever is open, reload
            const c = page.locator('[role=dialog]:visible').last();
            if (await c.count()) { await c.getByRole('button', {name: /Close|Cancel/}).first().click().catch(() => {}); await sleep(800); }
            // 9. untick French (the Default) alone: which becomes the Default (en or de)?
            ({f} = await openAdd('sl-16-C-window-before-drop-default'));
            await setBoxes(f, {fr_CA: false});
            out.dropDefault = await saveAdd(f, 'sl-17-C-drop-default-saved');
            await landLanguages(page, langUrl(C.path));
            out.dropDefaultReload = gridLine(await readGrids(page));
            await snap(page, 'sl-18-C-drop-default-reload');
            // 10. keep German alone: a single submission language that is not the journal's primary
            ({f} = await openAdd('sl-19-C-window-before-german-alone'));
            await setBoxes(f, {en: false, de: true});
            out.germanAlone = await saveAdd(f, 'sl-20-C-german-alone-saved');
            await landLanguages(page, langUrl(C.path));
            out.germanAloneReload = gridLine(await readGrids(page));
            out.wizardOne = await wizardRead('sl-21-C-author-wizard-de-alone');
            out.startOne = await startSub(null, 'sl-22-C-start-german-alone');
            fact('sublang', out);
        });

        // ============================================================ a2: register draft A2 (dropped) on D (French under UI and Forms)
        const runA2 = async (D, pfx) => {
            const out = {};
            await as(D.u.mg, D.path);
            const typeFrPrivacy = async (text, name) => {
                const info = await openSideTab(page, langUrl(D.path), 'setup', 'privacy');
                const frB = page.locator('#privacy .pkpFormLocales button, #privacy [class*="FormLocales"] button').filter({hasText: /French|Fran/}).first();
                if (await frB.count()) { await frB.click().catch(() => {}); await sleep(900); }
                const fr = page.frameLocator('#privacy iframe[id*="privacyStatement-control-fr_CA"]').first().locator('body');
                await fr.click().catch(() => {});
                await page.keyboard.press(SELECT_ALL); await page.keyboard.press('Delete');
                await fr.pressSequentially(text).catch(() => {});
                const t0 = Date.now();
                const wr = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('#privacy').getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                const r = await wr; await sleep(1200);
                const o = {buttons: info.localeButtons, status: r && r.status(), ...(await ev.since(t0)), editors: await editors(page)};
                await snap(page, name, {typed: o});
                return o;
            };
            const readPriv = async (name) => {
                const info = await openSideTab(page, langUrl(D.path), 'setup', 'privacy');
                const x = {localeButtons: info.localeButtons, editors: info.editors};
                const V = await launch(app);
                try { const pubx = await publicRead(V.page, cu(D.path, '/fr_CA/about/privacy')); x.publicFr = pubx.main.slice(0, 300); } finally { await V.close(); }
                await snap(page, name, {priv: x});
                return x;
            };
            out.typed1 = await typeFrPrivacy('Notre politique.', `${pfx}-01-D-fr-privacy-typed`);
            out.read1 = await readPriv(`${pfx}-02-D-fr-privacy-read`);
            await landLanguages(page, langUrl(D.path));
            out.untickForms = brief(await press(D.path, 'site', 'fr_CA', 'formLocale', `${pfx}-03-D-forms-fr-untick`));
            out.readUnticked = await readPriv(`${pfx}-04-D-privacy-while-unticked`);
            await landLanguages(page, langUrl(D.path));
            out.retickForms = brief(await press(D.path, 'site', 'fr_CA', 'formLocale', `${pfx}-05-D-forms-fr-retick`));
            out.read2 = await readPriv(`${pfx}-06-D-fr-privacy-after-retick`);
            // second path: French (Canada) added to Submission Languages and its "Submissions" ticked
            out.typed2 = await typeFrPrivacy('Notre politique.', `${pfx}-07-D-fr-privacy-typed-again`);
            await landLanguages(page, langUrl(D.path));
            await page.locator('#submissionLanguageGridContainer .header a[id*="addLanguageModal"]').first().click();
            const f = page.locator('form#addLanguageForm').first();
            await f.waitFor({timeout: T}).catch(() => {}); await idle(page); await sleep(500);
            const fr = f.locator('input[type=checkbox][value="fr_CA"]').first();
            if (await fr.count() && !(await fr.isChecked())) await fr.click();
            const t0 = Date.now();
            await f.getByRole('button', {name: 'Save', exact: true}).first().click(); await sleep(2000); await idle(page).catch(() => {});
            out.addFr = await ev.since(t0);
            await landLanguages(page, langUrl(D.path));
            out.addFrGrid = gridLine(await readGrids(page));
            out.read3 = await readPriv(`${pfx}-08-D-fr-privacy-after-add-to-list`);
            await landLanguages(page, langUrl(D.path));
            out.frSubTick = brief(await press(D.path, 'sub', 'fr_CA', 'submissionLocale', `${pfx}-09-D-fr-submissions-tick`));
            out.read4 = await readPriv(`${pfx}-10-D-fr-privacy-after-submissions-tick`);
            // and once more: "Submissions" unticked, "Metadata" unticked, "Submissions" ticked again
            await landLanguages(page, langUrl(D.path));
            out.frMetaUntick = brief(await press(D.path, 'sub', 'fr_CA', 'submissionMetadataLocale', `${pfx}-11-D-fr-metadata-untick`));
            out.typed3 = await typeFrPrivacy('Notre politique.', `${pfx}-12-D-fr-privacy-typed-third`);
            await landLanguages(page, langUrl(D.path));
            out.frSubTick2 = brief(await press(D.path, 'sub', 'fr_CA', 'submissionLocale', `${pfx}-13-D-fr-submissions-tick-again`));
            out.read5 = await readPriv(`${pfx}-14-D-fr-privacy-after-second-submissions-tick`);
            return out;
        };
        if (on('a2')) await sect('a2', async () => fact('a2', await runA2(S.D, 'a2')));
        // a second run on a journal seeded now (a fact seen in one run only is not a correction)
        if (on('a2again')) await sect('a2again', async () => {
            const p = `${S.t}d2x${Date.now().toString(36).slice(-3)}`;
            const r = await app.api.createContext({tag: p, context: {name: `U57 K2 D2 ${p}`, acronym: 'KTWO', contactName: 'K2 Contact', contactEmail: `${p}c@mail.test`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'}]});
            const D2 = {path: r.path || p, u: {mg: `${r.path || p}mg`}};
            S.D2 = D2; save();
            fact('a2again', await runA2(D2, 'a2b'));
        });

        // ============================================================ leave: the Add/Remove window left with a change
        if (on('leave')) await sect('leave', async () => {
            const out = {};
            const C = S.C;
            await as(C.u.mg, C.path);
            await landLanguages(page, langUrl(C.path));
            out.before = gridLine(await readGrids(page));
            await page.locator('#submissionLanguageGridContainer .header a[id*="addLanguageModal"]').first().click();
            const f = page.locator('form#addLanguageForm').first();
            await f.waitFor({timeout: T}).catch(() => {}); await idle(page); await sleep(500);
            await f.locator('input[type=checkbox][value="es"]').first().click().catch(() => {});
            await f.locator('input[type=checkbox][value="es"]').first().blur().catch(() => {});
            ev.dialogAnswer = 'dismiss';
            const t0 = Date.now();
            const dlg = page.locator('[role=dialog]:visible').last();
            await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
            await sleep(1200);
            out.closeDismiss = {...(await ev.since(t0)), stillOpen: await f.isVisible().catch(() => false)};
            await snap(page, 'lv-01-C-add-window-close-with-change-dismissed', {leave: out.closeDismiss});
            ev.dialogAnswer = 'accept';
            const t1 = Date.now();
            if (await f.isVisible().catch(() => false)) { await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {}); await sleep(1200); }
            out.closeAccept = {...(await ev.since(t1)), stillOpen: await f.isVisible().catch(() => false)};
            await landLanguages(page, langUrl(C.path));
            out.after = gridLine(await readGrids(page));
            await snap(page, 'lv-02-C-after-close', {leave: out});
            // the Setup tab left for another top tab and page with the Privacy Statement typed and unsaved
            await openSideTab(page, langUrl(C.path), 'setup', 'privacy');
            const enFrame = page.frameLocator('#privacy iframe[id*="privacyStatement-control-en"]').first().locator('body');
            await enFrame.click().catch(() => {}); await enFrame.pressSequentially(' Unsaved.').catch(() => {});
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
            await sleep(800);
            const t2 = Date.now();
            await page.goto(cu(C.path, '/management/settings/context')).catch(() => {}); await idle(page).catch(() => {});
            out.leavePage = await ev.since(t2);
            await snap(page, 'lv-03-C-left-with-unsaved-privacy', {leave: out.leavePage});
            const back = await openSideTab(page, langUrl(C.path), 'setup', 'privacy');
            out.privacyAfterLeave = Object.fromEntries(Object.entries(back.editors).filter(([k]) => /privacyStatement-control-en/.test(k)));
            await snap(page, 'lv-04-C-privacy-after-leave', {editors: out.privacyAfterLeave});
            fact('leave', out);
        });

        // ============================================================ race: A6, two managers tick the same "Forms" language at once
        if (on('race')) await sect('race', async () => {
            const out = {attempts: []};
            const pairs = [[S.R[0], S.R[1]], [S.R[2], S.R[3]], [S.R[4], S.R[5]]].filter(([a, b]) => a && b && a.path && b.path);
            const P2 = await launch(app);
            const ev2 = await instrument(P2.page);
            try {
                for (const [a, b] of pairs) {
                    await as(a.u.mg, a.path);
                    await signIn(P2.page, b.u.mg, {contextPath: b.path}); await idle(P2.page).catch(() => {});
                    await landLanguages(page, langUrl(a.path));
                    await landLanguages(P2.page, langUrl(b.path));
                    const w1 = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                    const w2 = P2.page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                    const t0 = Date.now();
                    await Promise.all([page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click(), P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click()]);
                    const [r1, r2] = await Promise.all([w1, w2]);
                    await sleep(1500);
                    const one = {a: a.path, b: b.path, s1: r1 && r1.status(), s2: r2 && r2.status(), e1: await ev.since(t0), e2: await ev2.since(t0),
                        checked1: await page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null),
                        checked2: await P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null)};
                    await snap(page, `rc-${pairs.indexOf(pairs.find((p) => p[0] === a))}-a-same`, {race: one});
                    await snap(P2.page, `rc-${pairs.indexOf(pairs.find((p) => p[0] === a))}-b-same`, {race: one});
                    await landLanguages(page, langUrl(a.path));
                    await landLanguages(P2.page, langUrl(b.path));
                    one.reload1 = gridLine(await readGrids(page));
                    one.reload2 = gridLine(await readGrids(P2.page));
                    out.attempts.push(one);
                    log(`[${app.name} race]`, JSON.stringify(one).slice(0, 600));
                    // three more rounds on the same pair: both untick French "Forms", then both tick it at once
                    for (let k = 0; k < 3; k++) {
                        for (const pg of [page, P2.page]) {
                            const w = pg.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                            await pg.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click(); await w; await sleep(800);
                        }
                        const x1 = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                        const x2 = P2.page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                        const tk = Date.now();
                        await Promise.all([page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click(), P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click()]);
                        const [y1, y2] = await Promise.all([x1, x2]);
                        await sleep(1200);
                        const round = {a: a.path, round: k + 2, s1: y1 && y1.status(), s2: y2 && y2.status(), bad1: (await ev.since(tk)).bad, bad2: (await ev2.since(tk)).bad, dialogs1: (await ev.since(tk)).dialogs, dialogs2: (await ev2.since(tk)).dialogs,
                            checked1: await page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null), checked2: await P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null)};
                        out.attempts.push(round);
                        log(`[${app.name} race]`, JSON.stringify(round).slice(0, 600));
                        await landLanguages(page, langUrl(a.path)); await landLanguages(P2.page, langUrl(b.path));
                    }
                }
            } finally { await P2.close(); }
            fact('race', out);
        });

        // ============================================================ race2: A6 again, the second manager on the app's second server process
        // (the probe server is one PHP process that answers one request at a time; the validation server is a second process on the same install)
        if (on('race2')) await sect('race2', async () => {
            const out = {attempts: []};
            const pairs = [[S.R[0], S.R[1]], [S.R[2], S.R[3]], [S.R[4], S.R[5]]].filter(([a, b]) => a && b && a.path && b.path);
            const v2 = app.variant('validation');
            const app2 = {...app, baseURL: v2, url: (pp) => `${v2}${pp}`};
            const P2 = await launch(app2);
            const ev2 = await instrument(P2.page);
            const lang2 = (ctx) => app2.url(`/index.php/${ctx}/management/settings/website`);
            try {
                for (const [a, b] of pairs) {
                    await as(a.u.mg, a.path);
                    await signIn(P2.page, b.u.mg, {contextPath: b.path}); await idle(P2.page).catch(() => {});
                    await landLanguages(page, langUrl(a.path));
                    await landLanguages(P2.page, lang2(b.path));
                    for (let k = 0; k < 4; k++) {
                        for (const pg of [page, P2.page]) {
                            const box = pg.locator(cellSel('site', 'fr_CA', 'formLocale')).first();
                            if (await box.isChecked().catch(() => false)) {
                                const w = pg.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 20000}).catch(() => null);
                                await box.click(); await w; await sleep(800);
                            }
                        }
                        const x1 = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 30000}).catch(() => null);
                        const x2 = P2.page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 30000}).catch(() => null);
                        const tk = Date.now();
                        await Promise.all([page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click(), P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().click()]);
                        const [y1, y2] = await Promise.all([x1, x2]);
                        await sleep(1500);
                        const e1 = await ev.since(tk); const e2 = await ev2.since(tk);
                        const round = {a: a.path, b: b.path, round: k + 1, s1: y1 && y1.status(), s2: y2 && y2.status(), bad1: e1.bad, bad2: e2.bad, dialogs1: e1.dialogs, dialogs2: e2.dialogs, notices1: e1.notices.slice(0, 1), notices2: e2.notices.slice(0, 1),
                            checked1: await page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null), checked2: await P2.page.locator(cellSel('site', 'fr_CA', 'formLocale')).first().isChecked().catch(() => null)};
                        await landLanguages(page, langUrl(a.path)); await landLanguages(P2.page, lang2(b.path));
                        round.reload1 = gridLine(await readGrids(page)).slice(40, 80); round.reload2 = gridLine(await readGrids(P2.page)).slice(40, 80);
                        if ((round.s1 || 0) >= 500 || (round.s2 || 0) >= 500 || round.dialogs1.length || round.dialogs2.length) {
                            await snap(page, `rc2-${a.path.slice(-3)}-${k + 1}-a`, {race: round}); await snap(P2.page, `rc2-${a.path.slice(-3)}-${k + 1}-b`, {race: round});
                        }
                        out.attempts.push(round);
                        log(`[${app.name} race2]`, JSON.stringify(round).slice(0, 700));
                    }
                }
            } finally { await P2.close(); }
            await snap(page, 'rc2-last', {attempts: out.attempts.length});
            fact('race2', out);
        });

        // ============================================================ extra: an older window's boxes on every app; H's French texts; the seeded journal's French submissions page
        if (on('extra')) await sect('extra', async () => {
            const out = {};
            const navItemWindow = async (ctx, label) => {
                await page.goto(cu(ctx, '/en/management/settings/website')); await idle(page);
                await page.locator('#setup-button').first().click().catch(() => {});
                await page.locator('#navigationMenus-button').filter({visible: true}).first().click().catch(() => {}); await idle(page);
                const add = page.getByRole('link', {name: 'Add item', exact: true}).first();
                await add.waitFor({timeout: 20000}).catch(() => {});
                await add.click().catch(() => {});
                const f = page.locator('form#navigationMenuItemsForm').first();
                await f.waitFor({timeout: T}).catch(() => {});
                await f.locator('input[name^="title"]').first().waitFor({timeout: 20000}).catch(() => {}); await sleep(600);
                const o = {titleInputs: await f.locator('input[name^="title"]').evaluateAll((is) => is.map((i) => i.name)).catch(() => [])};
                await snap(page, `x-${label}-nav-item-window`, o);
                const dlg = page.locator('[role=dialog]:visible').last();
                await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {}); await sleep(800);
                return o;
            };
            await as(S.C.u.mg, S.C.path);
            out.navC = await navItemWindow(S.C.path, '01-C-en-forms-only');
            await as(S.A.u.mg, S.A.path);
            out.navA = await navItemWindow(S.A.path, '02-A-en-fr-forms');
            // H (created on Hosted Journals with English and French, not enabled): its French pages as the Site Administrator
            if (S.H) {
                await as('admin');
                const x = await publicRead(page, cu(S.H.path, '/fr_CA/about/privacy'));
                out.HfrPrivacy = {url: x.finalUrl, lang: x.lang, main: x.main.slice(0, 300)};
                const y = await publicRead(page, cu(S.H.path, '/fr_CA/about/submissions'));
                out.HfrSubmissions = {url: y.finalUrl, main: y.main.slice(0, 500)};
                await snap(page, 'x-03-H-fr-pages-as-admin', {priv: out.HfrPrivacy, subm: out.HfrSubmissions});
                await page.goto(cu(S.H.path, '/en/index')); await idle(page);
            }
            // the seeded journal's French "Submissions" page, read only, signed out
            const V = await launch(app);
            try {
                const z = await publicRead(V.page, cu(PK, '/fr_CA/about/submissions'));
                out.pkFrSubmissions = {url: z.finalUrl, main: z.main.slice(0, 500)};
                const z2 = await publicRead(V.page, cu(PK, '/fr_CA/about/privacy'));
                out.pkFrPrivacy = {url: z2.finalUrl, main: z2.main.slice(0, 300)};
                await snap(V.page, 'x-04-publicknowledge-fr-pages', out);
            } finally { await V.close(); }
            fact('extra', out);
        });

        // ============================================================ dist: the Distribution texts of Rule 10a (Open Access Policy, LOCKSS, CLOCKSS) on A (French under Forms) and C (not)
        if (on('dist')) await sect('dist', async () => {
            const out = {};
            const deep = async (ctx, label) => {
                await page.goto(cu(ctx, '/en/management/settings/distribution')); await idle(page);
                const tops = await page.locator('[role=tablist]').first().locator('[role=tab]').evaluateAll((ts) => ts.map((t) => t.id));
                const all = {}; const seen = [];
                for (const id of tops) {
                    await page.locator(`[id="${id}"]`).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(600);
                    const sides = await page.locator('[role=tab]').filter({visible: true}).evaluateAll((ts) => ts.map((t) => t.id)).catch(() => []);
                    for (const sid of sides.filter((x) => !tops.includes(x))) {
                        await page.locator(`[id="${sid}"]`).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(700);
                        seen.push(sid);
                        Object.assign(all, await editors(page));
                    }
                    Object.assign(all, await editors(page));
                }
                const pick = Object.fromEntries(Object.entries(all).filter(([k]) => /openAccess|lockss|clockss/i.test(k)).map(([k, v]) => [k, v.slice(0, 90)]));
                await snap(page, `d-${label}-distribution`, {tops, sides: seen, editors: pick});
                log(`[${app.name} dist ${label}]`, JSON.stringify({tops, seen, pick}).slice(0, 1500));
                return {tops, sides: seen, editors: pick};
            };
            await as(S.C.u.mg, S.C.path);
            out.C = await deep(S.C.path, '01-C-en-forms');
            await as(S.A.u.mg, S.A.path);
            out.A = await deep(S.A.path, '02-A-fr-forms');
            if (isOJS) {
                // the texts show on the LOCKSS manifest page: LOCKSS enabled on A, the page read in both languages
                await page.goto(cu(S.A.path, '/en/management/settings/distribution')); await idle(page);
                await page.locator('#archive-button').click().catch(() => {}); await idle(page);
                await page.locator('#lockss-button').click().catch(() => {}); await idle(page); await sleep(800);
                const panel = page.locator('#lockss');
                const box = panel.locator('input[type=checkbox]').first();
                if (!(await box.isChecked().catch(() => true))) await box.check().catch(() => {});
                await panel.getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
                await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10000}).catch(() => {});
                const V = await launch(app);
                try {
                    for (const l of ['en', 'fr_CA']) {
                        const x = await publicRead(V.page, cu(S.A.path, `/${l}/gateway/lockss`));
                        const body = flat(await V.page.locator('body').innerText().catch(() => ''), 4000);
                        out[`lockss_${l}`] = {url: x.finalUrl, oa: (body.match(/(Open Access Policy|Politique de libre accès)[^]{0,160}/i) || [null])[0], license: (body.match(/(LOCKSS system has permission|Le système LOCKSS)[^]{0,120}/i) || [null])[0], head: body.slice(0, 200)};
                        await snap(V.page, `d-03-A-lockss-${l}`, out[`lockss_${l}`]);
                    }
                } finally { await V.close(); }
            }
            fact('dist', out);
        });
    } finally {
        await close();
    }
});
