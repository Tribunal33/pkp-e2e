// U69 claim check K1: framing and who may see what (spec Purpose incl. the
// OJS/OPS absence paragraph, Actors & permissions, the Fields intro,
// Cross-feature interactions, the Canonical preamble, Coverage; footnotes a,
// b, c, d, j, k, m, q, r, s, td1, td5, td13, td14, td18).
//
// OMP: every phase seeds its own scratch press (scenarios.md) and signs in
// from that press's throwaway accounts (password = username twice). OJS and
// OPS: read-only controls on publicknowledge (td1, the article's page, the
// Hosted Journals window), plus an OJS scratch journal that sells articles
// (the absence paragraph's "nothing for sale on the page itself").
//
// Phases (PHASES=a,b picks; default all):
//   ctl     td1 on all apps: catalog/book|view|download addresses, signed out and as manager.maya;
//           the article's (preprint's) page; OMP control on publicknowledge
//   sub     OJS only: a subscription journal with "Purchase Article": the article page's galley link
//   roles   OMP: Actors rows 1, 2, 6 (td5, td18): every role key of a press on a published book,
//           an unpublished one in Production and a draft; the workflow's View/Preview per role;
//           the Roles grid's "Assistant" level
//   admin   Actors row 7 (fn-r): the settings pages per level, "Enable this press to appear publicly",
//           Hosted Presses/Journals window (OJS/OPS read-only), a tabbed page left unsaved
//   set     Actors paragraph: restrictSiteAccess and a press not enabled, every address of the spec
//   files   Actors row 3 (td13): free PDF, HTML, other file; PDF.js off; restrictMonographAccess
//   buy     Actors rows 4, 5 (td14, td25/q): Direct Sales, the payment page, the notification mail;
//           a press with no currency and one with no instructions
//   chrome  Fields intro (fn-d): header, footer, sidebar, trail on the book, chapter, view and
//           payment pages; Purpose "reached from"; side column links; a sidebar block both ends
//   canon   Canonical preamble (fn-s): what publicknowledge's catalog holds
//
// Run: RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U69/K1/k1.js
// (ONLY=omp narrows; RUN names the facts file and the snapshots). OMP outlasts 600 s: run detached.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, drainJobs} = require('../../../probe');

const PHASES = (process.env.PHASES || 'ctl,sub,roles,admin,set,files,buy,chrome,canon').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const RUN = process.env.RUN || 'r1';
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const OUT = path.join(REPO, '.reports', process.env.PROBE_FEATURE || 'U69', process.env.PROBE_AGENT || 'ccK1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const PROD = ['skipExternalReview', 'sendToProduction'];
const VIS = '[role="dialog"]:visible';
const log = (...a) => console.log(...a);

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOJS = app.name === 'ojs';
    const users = require(path.join(REPO, 'shared/playwright/data/users.js'));
    const statePath = path.join(OUT, `k1-state-${RUN}-${app.name}.json`);
    fs.mkdirSync(OUT, {recursive: true});
    const S = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k1-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const cUrl = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');
    const sql = (q) => {
        try {
            return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
        } catch (e) { return `SQL ERROR ${flat(e.stderr, 200)}`; }
    };

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    // ------------------------------------------------------------ the page's own traffic, dialogs and errors
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    const resps = [];
    page.on('response', (r) => {
        const u = r.url();
        if (r.status() < 300 && !/catalog\/(view|download)|payment|citationstylelanguage|login|article\/(view|download)/.test(u)) return;
        resps.push({at: Date.now(), method: r.request().method(), status: r.status(), url: rel(u).slice(0, 180), frame: r.frame() === page.mainFrame() ? 'main' : 'sub'});
    });
    const respsSince = (t0) => resps.filter((p) => p.at >= t0).map(({at, ...p}) => p);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), msg: flat(e.message, 200)}));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push({at: Date.now(), msg: `console: ${flat(m.text(), 200)}`}); });
    const errorsSince = (t0) => pageErrors.filter((p) => p.at >= t0).map((p) => p.msg);

    const N = (name) => `${RUN}-${name}`;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) Object.assign(s, extra);
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    const safe = async (label, fn) => {
        try { return await fn(); } catch (e) {
            const err = flat(String((e && e.message) || e).split('\n')[0], 300);
            log(`[${app.name} ${label}] ERROR`, err);
            await snap(`err-${label.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
            return {error: err};
        }
    };
    let who = null;
    const settle = async () => {
        await idle(page).catch(() => {});
        await page.waitForFunction(() => document.readyState === 'complete', null, {timeout: 10000}).catch(() => {});
        await sleep(400);
    };
    const as = async (user, ctxPath) => {
        if (who === `${user}@${ctxPath}`) return;
        await signIn(page, user, {contextPath: ctxPath});
        await settle();
        who = `${user}@${ctxPath}`;
    };
    const visitor = async () => { if (who !== null) await signOut(page).catch(() => {}); who = null; };
    async function loginHere(user) {
        const t0 = Date.now();
        await page.locator('input#username').fill(user);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(users.getPassword(user));
        await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForURL((u) => !/\/login(\/signIn)?$/.test(u.pathname), {timeout: 20000}).catch(() => {});
        await settle();
        who = `${user}@?`;
        return {landed: rel(page.url()), responses: respsSince(t0), errors: errorsSince(t0)};
    }

    // ------------------------------------------------------------ a public page as data
    const PAGE = () => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const q = (s) => document.querySelector(s);
        const full = q('.obj_monograph_full');
        const main = full && full.querySelector('.main_entry');
        const side = full && full.querySelector('.entry_details');
        const item = (el) => `${String(el.className || el.tagName).replace(/\bitem\b\s*/, '').trim()} | ${f(el.innerText).slice(0, 140)}`;
        const sb = q('.pkp_structure_sidebar');
        return {
            url: location.href.replace(/^https?:\/\/[^/]+\/index\.php/, ''),
            docTitle: document.title,
            h1: f(q('h1') && q('h1').innerText),
            header: !!q('.pkp_structure_head'), headerText: f(q('.pkp_structure_head') && q('.pkp_structure_head').innerText).slice(0, 200),
            footer: !!q('.pkp_structure_footer_wrapper, .pkp_structure_footer'),
            sidebar: sb ? {blocks: [...sb.querySelectorAll('.pkp_block')].map((b) => f(b.innerText).slice(0, 80)), text: f(sb.innerText).slice(0, 120)} : null,
            trail: q('.cmp_breadcrumbs') ? f(q('.cmp_breadcrumbs').innerText) : null,
            viewerHeader: q('header.header_viewable_file') ? f(q('header.header_viewable_file').innerText) : null,
            notices: [...document.querySelectorAll('.cmp_notification')].map((n) => f(n.innerText)),
            mainItems: main ? [...main.children].map(item) : null,
            sideItems: side ? [...side.children].map(item) : null,
            toc: full ? [...full.querySelectorAll('.item.chapters > ul > li')].map((li) => ({text: f(li.innerText).slice(0, 160), links: [...li.querySelectorAll('a')].map((a) => ({t: f(a.textContent), h: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+\/index\.php/, '')}))})) : [],
            fileLinks: [...document.querySelectorAll('a[href*="/catalog/view/"], a[href*="/catalog/download/"]')].map((a) => ({t: f(a.textContent), h: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+\/index\.php/, ''), target: a.getAttribute('target')})),
            galleyLinks: [...document.querySelectorAll('a.obj_galley_link, a.obj_galley_link_supplementary')].map((a) => ({t: f(a.textContent), cls: a.className, h: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+\/index\.php/, '')})),
            cite: q('#citationOutput') ? f(q('#citationOutput').innerText).slice(0, 400) : null,
            sig: full ? f(full.innerText) : null,
            loginForm: !!q('form#login'),
            body: f((q('.pkp_structure_main') || document.body).innerText).slice(0, 500),
        };
    };
    async function land(url, name, {status = true} = {}) {
        const t0 = Date.now();
        let r = null;
        let err = null;
        try { r = await page.goto(url); } catch (e) { err = flat(e.message, 160); }
        await settle();
        const chain = [];
        if (r) {
            let qq = r.request();
            while (qq) {
                const resp = await qq.response().catch(() => null);
                chain.unshift(`${resp ? resp.status() : '?'} ${rel(qq.url()).slice(0, 140)}`);
                qq = qq.redirectedFrom();
            }
        }
        await snap(name);
        const d = await page.evaluate(PAGE).catch((e) => ({error: flat(e.message, 200)}));
        record(N(name), {page: d}, {merge: true});
        return {status: r ? r.status() : err, chain, errors: errorsSince(t0), ...d, _snap: N(name)};
    }
    const brief = (d) => ({status: d.status, chain: d.chain, url: d.url, docTitle: d.docTitle, h1: d.h1, notices: d.notices, login: d.loginForm,
        body: (d.status === 200 && !d.loginForm && d.sig) ? undefined : flat(d.body, 200), errors: d.errors && d.errors.length ? d.errors : undefined});
    async function press(locator, name, {waitMs = 2000} = {}) {
        const t0 = Date.now();
        const before = page.url();
        const dl = page.waitForEvent('download', {timeout: waitMs + 6000}).then(async (d) => ({file: d.suggestedFilename(), url: rel(d.url()), failure: await d.failure().catch((e) => String(e))})).catch(() => null);
        const pop = page.context().waitForEvent('page', {timeout: waitMs + 2000}).catch(() => null);
        const n = await locator.count();
        if (!n) return {present: false};
        const r = {present: true, count: n, text: flat(await locator.first().innerText().catch(() => null), 200), href: rel(await locator.first().getAttribute('href').catch(() => null))};
        await locator.first().click({noWaitAfter: true}).catch((e) => { r.clickErr = flat(e.message, 160); });
        await page.waitForLoadState('domcontentloaded', {timeout: 15000}).catch(() => {});
        await sleep(waitMs);
        await settle();
        r.download = await dl;
        const p2 = await pop;
        if (p2) { await p2.waitForLoadState('domcontentloaded', {timeout: 8000}).catch(() => {}); r.newTab = rel(p2.url()); await p2.close().catch(() => {}); }
        r.urlBefore = rel(before);
        r.landed = rel(page.url());
        r.docTitle = await page.title().catch(() => null);
        r.page = await page.evaluate(PAGE).catch(() => null);
        r.responses = respsSince(t0);
        r.errors = errorsSince(t0);
        r.dialogs = dialogsSince(t0);
        await snap(name, {press: r});
        r._snap = N(name);
        return r;
    }
    const pressBrief = (r) => r && ({present: r.present, text: r.text, href: r.href, landed: r.landed, newTab: r.newTab, download: r.download, docTitle: r.docTitle,
        viewer: r.page && r.page.viewerHeader, login: r.page && r.page.loginForm, h1: r.page && r.page.h1, body: r.page && flat(r.page.body, 180),
        bad: (r.responses || []).filter((x) => x.status === 'failed' || x.status >= 400), errors: r.errors, dialogs: r.dialogs, error: r.error});

    // ------------------------------------------------------------ the workflow head (as U69 K2)
    async function workflowHead(ctx, sid, {author} = {}) {
        await page.goto(cUrl(ctx, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${sid}`));
        await settle();
        await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: 15000}).catch(() => {});
        await settle();
        await sleep(1500);
        return page.evaluate(() => {
            const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
            const d = document.querySelector('[role="dialog"]');
            const nav = d && d.querySelector('nav');
            return {
                url: location.pathname + location.search,
                dialog: !!d,
                title: d ? txt(d.querySelector('h1, h2')) : null,
                headButtons: d ? [...d.querySelectorAll('button, a')].filter((e) => !nav || (e.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)).map((e) => txt(e) || e.getAttribute('aria-label')).filter(Boolean).slice(0, 20) : null,
                body: txt(document.querySelector('main') || document.body).slice(0, 300),
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }

    // ------------------------------------------------------------ "How to Cite" (as U69 K5)
    async function chooseStyle(label) {
        const btn = page.locator('[aria-controls="cslCitationFormats"]').first();
        if (!(await btn.count())) return {offered: false, block: !!(await page.locator('#citationOutput').count())};
        if ((await btn.getAttribute('aria-expanded')) !== 'true') { await btn.click(); await sleep(400); }
        const before = flat(await page.locator('#citationOutput').innerText().catch(() => null), 600);
        const link = page.locator('#cslCitationFormats ul').first().locator('a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first();
        if (!(await link.count())) return {offered: false};
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /citationstylelanguage\/get/.test(r.url()), {timeout: 15_000}).catch(() => null);
        await link.click();
        const resp = await w;
        await sleep(900);
        const after = flat(await page.locator('#citationOutput').innerText().catch(() => null), 600);
        return {before, after, changed: before !== after, getStatus: resp ? resp.status() : null, errors: errorsSince(t0)};
    }
    async function downloadStyle(label) {
        const btn = page.locator('[aria-controls="cslCitationFormats"]').first();
        if (!(await btn.count())) return {offered: false};
        if ((await btn.getAttribute('aria-expanded')) !== 'true') { await btn.click(); await sleep(400); }
        const link = page.locator('#cslCitationFormats ul').nth(1).locator('a').filter({hasText: label}).first();
        if (!(await link.count())) return {offered: false};
        const out = {href: rel(await link.getAttribute('href'))};
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
        await link.click();
        const d = await dl;
        if (d) {
            out.filename = d.suggestedFilename();
            const p = await d.path().catch(() => null);
            if (p) out.text = flat(fs.readFileSync(p, 'utf8'), 200);
        } else {
            await settle();
            out.noDownload = true;
            out.landed = rel(page.url());
            out.h1 = flat(await page.locator('h1').first().innerText().catch(() => null), 80);
        }
        out.responses = respsSince(t0).filter((x) => /citationstylelanguage/.test(x.url));
        return out;
    }

    // ------------------------------------------------------------ Plugins grid (as U69 K4)
    const pluginRow = (id) => page.locator(`#pluginGridContainer tr.gridRow[id$="-row-${id}"]`);
    async function gotoPlugins(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/website'));
        await settle();
        await page.locator('#plugins-button').first().click();
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        await settle();
    }
    async function pluginRead(ids) {
        const o = {};
        for (const id of ids) {
            const row = pluginRow(id);
            o[id] = (await row.count()) ? {text: flat(await row.innerText(), 120), checked: await row.getByRole('checkbox').first().isChecked().catch(() => null)} : null;
        }
        return o;
    }
    async function setPlugin(id, want) {
        const box = pluginRow(id).getByRole('checkbox').first();
        const out = {before: await box.isChecked(), want};
        if (out.before === want) return out;
        const w = page.waitForResponse((r) => /settings-plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click({noWaitAfter: true});
        await sleep(700);
        const dlg = page.locator(VIS);
        if (await dlg.count()) {
            out.confirm = flat(await dlg.last().innerText().catch(() => null), 200);
            const ok = dlg.last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) await ok.click();
        }
        const resp = await w;
        out.status = resp ? resp.status() : null;
        await sleep(1000); await settle();
        out.after = await pluginRow(id).getByRole('checkbox').first().isChecked().catch(() => null);
        return out;
    }

    // ------------------------------------------------------------ seeding helpers
    async function press_(key, spec = {}, people = []) {
        const p = `${S.t}${key}`;
        const U = (k, roles, g, f) => ({username: `${p}${k}`, roles, givenName: g, familyName: f});
        const base = [U('mg', ['manager'], 'Kim', 'Manager'), U('au', ['author'], 'Ada', 'Author'), U('rd', ['reader'], 'Rae', 'Reader')];
        const body = {tag: p, context: {name: {en: `K1 ${key} ${S.t}`}, contactName: 'Pat Contact', contactEmail: `${p}ct@mail.test`, ...(spec.context || {})},
            users: [...base, ...people.map(([k, r, g, f]) => U(k, r, g, f))], ...Object.fromEntries(Object.entries(spec).filter(([k]) => k !== 'context'))};
        await app.api.createContext(body);
        return p;
    }
    async function book(ctx, key, title, extra = {}) {
        const r = await app.api.createSubmission({tag: `${ctx}${key}`, context: ctx, submitter: `${ctx}au`, title, ...extra});
        return {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status, formats: r.publicationFormats || null, chapters: r.chapters || null};
    }
    const fmt = (b, name) => (b.formats || []).find((x) => x.name === name) || {};
    const fileLink = (b, name) => { const x = fmt(b, name); return page.locator(`.obj_monograph_full a[href*="/${x.id}/${x.submissionFileId}"]`); };
    if (!S.t) { S.t = tag('u69k1'); save(); }

    try {
        // ============================================================ ctl: td1 (all apps)
        if (on('ctl') && !S.ctl) {
            const o = {};
            const P = app.contextPath;
            await visitor();
            // a real published item's number, for the other end of "a number"
            if (isOMP) {
                const cat = await land(cUrl(P, '/catalog'), `c-00-${app.name}-catalog`);
                o.catalogBook = (await page.locator('.obj_monograph_summary a[href*="/catalog/book/"]').first().getAttribute('href').catch(() => null));
                o.catalogCount = await page.locator('.obj_monograph_summary').count();
                o.catalogTitles = (await page.locator('.obj_monograph_summary .title').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).slice(0, 40);
                o.catalogStatus = cat.status;
            } else {
                const listing = isOJS ? '/issue/archive' : '';
                await land(cUrl(P, listing), `c-00-${app.name}-listing`);
                if (isOJS) {
                    const iss = await page.locator('a[href*="/issue/view/"]').first().getAttribute('href').catch(() => null);
                    if (iss) await land(iss, `c-00-${app.name}-issue`);
                }
                const art = await page.locator(`a[href*="/${isOJS ? 'article' : 'preprint'}/view/"]`).first().getAttribute('href').catch(() => null);
                o.itemHref = rel(art);
                o.itemId = art ? (art.match(/\/view\/(\d+)/) || [])[1] : null;
                if (art) {
                    const a = await land(art, `c-01-${app.name}-item-page`);
                    o.itemPage = {status: a.status, h1: a.h1, galleys: a.galleyLinks, toc: a.toc.length, chapterLinks: (a.fileLinks || []).length,
                        hasChaptersHeading: /Chapters|Table of Contents/i.test(a.body || ''), headerText: a.headerText};
                    o.itemPageForSale = await page.evaluate(() => [...document.querySelectorAll('.purchase_cost, .restricted, [class*=purchase]')].map((e) => (e.className + ': ' + e.textContent).replace(/\s+/g, ' ').trim()));
                }
            }
            const addrs = ['/catalog/book/1', '/catalog/book/1/chapter/1', '/catalog/view/1/1/1', '/catalog/download/1/1/1'];
            if (o.itemId) addrs.push(`/catalog/book/${o.itemId}`);
            if (isOMP) addrs.push('/catalog/book/999999');
            o.visitor = {};
            for (const [i, a] of addrs.entries()) o.visitor[a] = brief(await land(cUrl(P, a), `c-02-${app.name}-visitor-${i}`));
            await as('manager.maya', P);
            o.manager = {};
            for (const [i, a] of addrs.slice(0, 2).entries()) o.manager[a] = brief(await land(cUrl(P, a), `c-03-${app.name}-manager-${i}`));
            if (o.itemId) o.manager[`/catalog/book/${o.itemId}`] = brief(await land(cUrl(P, `/catalog/book/${o.itemId}`), `c-03-${app.name}-manager-item`));
            await visitor();
            await loc(page, `${app.name} catalog/book/1: page heading`, page.locator('h1'));
            fact('ctl', o);
            S.ctl = true; save();
        }

        // ============================================================ sub (OPS): a scratch server's preprint page with a galley
        if (app.name === 'ops' && on('sub') && !S.sub) {
            const p = `${S.t}v`;
            await app.api.createContext({tag: p, context: {name: {en: `K1 server ${S.t}`}, contactName: 'Pat Contact', contactEmail: `${p}ct@mail.test`},
                sections: [{abbrev: 'PRE', title: 'Preprints'}], users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}]});
            const s = await app.api.createSubmission({tag: `${p}a`, context: p, submitter: `${p}au`, title: `K1 Preprint ${S.t}`, published: true, section: 'PRE',
                galleys: [{label: 'PDF', locale: 'en', file: 'preprint.pdf'}]});
            await visitor();
            const a = await land(cUrl(p, `/preprint/view/${s.submissionId}`), 's-01-visitor-preprint');
            fact('sub', {status: a.status, h1: a.h1, galleys: a.galleyLinks, toc: a.toc.length, sideItems: flat(a.body, 400),
                forSale: await page.evaluate(() => [...document.querySelectorAll('.purchase_cost, a.restricted')].map((e) => e.textContent.trim()))});
            S.sub = true; save();
        }

        // ============================================================ sub: OJS "nothing for sale on the page itself"
        if (isOJS && on('sub') && !S.sub) {
            const o = {};
            const p = `${S.t}j`;
            await app.api.createContext({tag: p, context: {name: {en: `K1 sale ${S.t}`}, acronym: 'K1S', contactName: 'Pat Contact', contactEmail: `${p}ct@mail.test`},
                publishingMode: 'subscription',
                users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}, {username: `${p}rd`, roles: ['reader']}],
                payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 by cheque.', purchaseArticleFee: 5},
                issues: [{volume: 1, number: 1, year: 2026, published: true}]});
            const s = await app.api.createSubmission({tag: `${p}a`, context: p, submitter: `${p}au`, title: `K1 Sale Article ${S.t}`, published: true,
                issue: {volume: 1, number: 1, year: 2026}, galleys: [{label: 'PDF', file: 'article.pdf'}]});
            S.J = {p, id: s.submissionId}; save();
            note(`ccK1 [ojs] ${RUN} sub: journal ${p} (subscription, Purchase Article 5 USD), article ${s.submissionId}`);
            await visitor();
            const a = await land(cUrl(p, `/article/view/${s.submissionId}`), 's-01-visitor-article');
            o.visitor = {status: a.status, h1: a.h1, galleys: a.galleyLinks, forSale: await page.evaluate(() => [...document.querySelectorAll('.purchase_cost, a.restricted')].map((e) => (e.className + ': ' + e.textContent).replace(/\s+/g, ' ').trim()))};
            await loc(page, 'OJS article page: galley link with its purchase price (a.obj_galley_link .purchase_cost)', page.locator('a.obj_galley_link .purchase_cost'));
            o.visitorPress = pressBrief(await safe('sub-visitor-press', () => press(page.locator('a.obj_galley_link').first(), 's-02-visitor-galley-pressed')));
            await as(`${p}rd`, p);
            await land(cUrl(p, `/article/view/${s.submissionId}`), 's-03-reader-article');
            o.readerPress = pressBrief(await safe('sub-reader-press', () => press(page.locator('a.obj_galley_link').first(), 's-04-reader-galley-pressed')));
            await visitor();
            fact('sub', o);
            S.sub = true; save();
        }

        if (!isOMP) {
            // ============================================================ admin (OJS/OPS read-only): Hosted Journals/Servers window
            if (on('admin') && !S.admin) {
                const o = {};
                await as('admin', 'index');
                await page.goto(app.url('/index.php/index/admin/contexts'));
                await settle();
                await snap('a-01-hosted-contexts');
                const row = page.locator('tr.gridRow').filter({hasText: /Public Knowledge/}).first();
                await row.locator('a.show_extras').click(); await settle();
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
                await cb.waitFor({timeout: T}).catch(() => {});
                await sleep(600);
                o.box = {count: await cb.count(), label: await cb.first().evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await cb.first().isChecked().catch(() => null)};
                await snap('a-02-hosted-edit-publicknowledge');
                await page.locator(VIS).last().getByRole('button', {name: /^(Close|Cancel)/}).first().click().catch(() => {});
                await sleep(600);
                // the manager's settings pages: is the box anywhere there?
                await as('manager.maya', app.contextPath);
                o.managerPages = {};
                for (const p of ['/management/settings/context', '/management/settings/website', '/management/settings/workflow', '/management/settings/distribution', '/management/settings/access']) {
                    const t0 = Date.now();
                    const r = await page.goto(cUrl(app.contextPath, p)).catch(() => null);
                    await settle();
                    o.managerPages[p] = {status: r ? r.status() : null, hasBox: await page.evaluate(() => /appear publicly/i.test(document.body.textContent)), errors: errorsSince(t0).length};
                }
                o.managerAdmin = brief(await land(app.url('/index.php/index/admin/contexts'), 'a-03-manager-admin-contexts'));
                await visitor();
                fact('admin', o);
                S.admin = true; save();
            }
            return;
        }

        // ============================================================ OMP from here
        // ---------------------------------------------------------------- roles: Actors rows 1, 2, 6 (td5, td18)
        const ROLE_PEOPLE = [
            ['ed', ['editor'], 'Eve', 'Presseditor'], ['pe', ['productionEditor'], 'Pia', 'Production'],
            ['se', ['sectionEditor'], 'Sol', 'Unassigned'], ['sa', ['sectionEditor'], 'Sam', 'Assigned'],
            ['ce', ['copyeditor'], 'Cai', 'Unassigned'], ['ca', ['copyeditor'], 'Cal', 'Assigned'],
            ['de', ['designer'], 'Dee', 'Designer'], ['fu', ['funding'], 'Fay', 'Funding'], ['ix', ['indexer'], 'Ivy', 'Indexer'],
            ['le', ['layoutEditor'], 'Lee', 'Layout'], ['mk', ['marketing'], 'Max', 'Marketing'], ['pr', ['proofreader'], 'Pru', 'Proof'],
            ['eb', ['editorialBoardMember'], 'Ebb', 'Board'], ['ao', ['author'], 'Otto', 'Otherauthor'], ['ve', ['volumeEditor'], 'Vic', 'Volume'],
            ['ch', ['chapterAuthor'], 'Cho', 'Chapter'], ['tr', ['translator'], 'Tia', 'Translator'], ['rv', ['externalReviewer'], 'Rex', 'External'],
            ['ri', ['internalReviewer'], 'Ria', 'Internal'],
        ];
        if (on('roles') && !S.roles) {
            const o = {};
            if (!S.R) {
                const p = await press_('r', {series: [{path: 'mono', title: 'Monographs'}], plugins: {citationstylelanguageplugin: {enabled: true}}}, ROLE_PEOPLE);
                const P = await book(p, 'p', 'K1 Published Book', {published: true, datePublished: '2024-03-05', series: 'mono', seriesPosition: '3',
                    chapters: [{title: 'Harbours', page: true, authors: [`${p}au`]}, {title: 'Plain', page: false, authors: [`${p}au`]}], publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
                const U = await book(p, 'u', 'K1 Unpublished Book', {decisions: PROD, datePublished: '2024-03-05',
                    chapters: [{title: 'Draft Chapter', page: true, authors: [`${p}au`]}],
                    participants: [{username: `${p}sa`, role: 'sectionEditor'}, {username: `${p}ca`, role: 'copyeditor'}]});
                const D = await book(p, 'd', 'K1 Draft Book', {submitted: false});
                S.R = {p, P, U, D}; save();
                note(`ccK1 [omp] ${RUN} roles: press ${p}, books ${JSON.stringify({P: [P.id, P.pub], U: [U.id, U.pub], D: [D.id, D.pub]})}`);
            }
            const {p, P, U, D} = S.R;
            // the visitor's reads first: the published book, its chapter, the unpublished and the draft
            await visitor();
            const vb = await land(cUrl(p, `/catalog/book/${P.id}`), 'r-00-visitor-published');
            const chHref = ((vb.toc.find((c) => c.links.some((l) => /\/chapter\//.test(l.h))) || {links: []}).links.find((l) => /\/chapter\//.test(l.h)) || {}).h;
            o.visitorPublished = {status: vb.status, h1: vb.h1, toc: vb.toc, chapterHref: chHref, cite: vb.cite};
            o.visitorPublishedMla = await safe('vis-mla', () => chooseStyle('MLA'));
            o.visitorPublishedBib = await safe('vis-bib', () => downloadStyle('BibTeX'));
            const vc = chHref ? await land(app.url(`/index.php${chHref}`), 'r-00-visitor-chapter') : null;
            const sigs = {visitor: {book: vb.sig, chapter: vc && vc.sig}};
            // the unpublished book's chapter address, read by the manager
            await as(`${p}mg`, p);
            const mu = await land(cUrl(p, `/catalog/book/${U.id}`), 'r-00-manager-unpublished');
            const uch = ((mu.toc.find((c) => c.links.some((l) => /\/chapter\//.test(l.h))) || {links: []}).links.find((l) => /\/chapter\//.test(l.h)) || {}).h;
            o.unpublishedChapterHref = uch;
            const addrs = {published: `/catalog/book/${P.id}`, publishedChapter: chHref ? chHref.replace(/^\/[^/]+/, '') : null,
                unpublished: `/catalog/book/${U.id}`, unpublishedChapter: uch ? uch.replace(/^\/[^/]+/, '') : null, draft: `/catalog/book/${D.id}`};
            o.addrs = addrs;
            // the other end of "a chapter whose Chapter Page box is ticked": a chapter without its page, its address typed
            const plain = sql(`select c.source_chapter_id from submission_chapters c where c.publication_id=${P.pub} order by c.seq`).split('\n');
            o.plainChapterIds = plain;
            await visitor();
            o.plainChapter = {};
            for (const id of plain) if (/^\d+$/.test(id)) o.plainChapter[id] = brief(await land(cUrl(p, `/catalog/book/${P.id}/chapter/${id}`), `r-00-visitor-chapter-${id}`));
            const who_ = [[null, 'visitor'], [`${p}rd`, 'Reader'], [`${p}mg`, 'Press manager'], [`${p}ed`, 'Press editor'], [`${p}pe`, 'Production editor'],
                [`${p}se`, 'Series editor (unassigned)'], [`${p}sa`, 'Series editor (assigned)'], [`${p}ce`, 'Copyeditor (unassigned)'], [`${p}ca`, 'Copyeditor (assigned)'],
                [`${p}de`, 'Designer'], [`${p}fu`, 'Funding coordinator'], [`${p}ix`, 'Indexer'], [`${p}le`, 'Layout Editor'], [`${p}mk`, 'Marketing and sales coordinator'],
                [`${p}pr`, 'Proofreader'], [`${p}eb`, 'Editorial Board Member'], [`${p}au`, 'the book\'s Author'], [`${p}ao`, 'another Author'], [`${p}ve`, 'Volume editor'],
                [`${p}ch`, 'Chapter Author'], [`${p}tr`, 'Translator'], [`${p}rv`, 'External Reviewer'], [`${p}ri`, 'Internal Reviewer'], ['admin', 'Site Administrator']];
            const CITE = new Set(['Press manager', 'Press editor', 'Production editor', 'Series editor (unassigned)', 'Series editor (assigned)', 'Copyeditor (unassigned)',
                'Copyeditor (assigned)', 'the book\'s Author', 'Site Administrator']);
            o.per = {};
            for (const [u, label] of who_) {
                const r = {};
                const k = label.replace(/[^a-z]/gi, '').slice(0, 18).toLowerCase();
                await safe(`roles-${k}`, async () => {
                    if (u) await as(u, p); else await visitor();
                    const b = await land(cUrl(p, addrs.published), `r-${k}-01-published`);
                    r.published = {status: b.status, same: b.sig === sigs.visitor.book, notices: b.notices};
                    if (b.sig !== sigs.visitor.book) r.published.diff = {mine: flat(b.sig, 600), visitor: flat(sigs.visitor.book, 600)};
                    if (addrs.publishedChapter) {
                        const c = await land(cUrl(p, addrs.publishedChapter), `r-${k}-02-published-chapter`);
                        r.publishedChapter = {status: c.status, same: c.sig === sigs.visitor.chapter};
                        if (c.sig !== sigs.visitor.chapter) r.publishedChapter.diff = flat(c.sig, 400);
                    }
                    const un = await land(cUrl(p, addrs.unpublished), `r-${k}-03-unpublished`);
                    r.unpublished = brief(un);
                    if (CITE.has(label) && un.cite) {
                        r.citeMla = await chooseStyle('MLA');
                        r.citeBib = await downloadStyle('BibTeX');
                    }
                    if (addrs.unpublishedChapter) r.unpublishedChapter = brief(await land(cUrl(p, addrs.unpublishedChapter), `r-${k}-04-unpublished-chapter`));
                    r.draft = brief(await land(cUrl(p, addrs.draft), `r-${k}-05-draft`));
                });
                o.per[label] = r;
            }
            await loc(page, 'Book page: preview notice (.obj_monograph_full .cmp_notification)', page.locator('.obj_monograph_full .cmp_notification'));
            // the workflow's "View" / "Preview" per level (the Author by her own list)
            o.wf = {};
            for (const [u, label, author] of [[`${p}mg`, 'Press manager'], [`${p}sa`, 'Series editor (assigned)'], [`${p}ca`, 'Copyeditor (assigned)'], [`${p}au`, 'the book\'s Author', true]]) {
                o.wf[label] = await safe(`wf-${label}`, async () => {
                    await as(u, p);
                    const h = await workflowHead(p, U.id, {author});
                    await snap(`r-wf-${label.replace(/[^a-z]/gi, '').slice(0, 16).toLowerCase()}`);
                    const pub = await workflowHead(p, P.id, {author});
                    return {unpublished: h, published: pub};
                });
            }
            // the Roles grid, "Assistant" level (who "the assistant roles" are)
            o.rolesGrid = await safe('roles-grid', async () => {
                await as(`${p}mg`, p);
                await page.goto(cUrl(p, '/management/settings/access'));
                await settle();
                await page.locator('#roles-button').first().click();
                await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
                await settle();
                const read = () => page.locator('#roleGridContainer').evaluate((g) => [...g.querySelectorAll('tbody tr.gridRow')].filter((e) => e.offsetParent)
                    .map((tr) => `${(tr.querySelector('[id$="-name"] .label') || {}).innerText?.trim()} = ${(tr.querySelector('[id$="-roleId"] .label') || {}).innerText?.trim()}`));
                const all = await read();
                const paging = flat(await page.locator('#roleGridContainer .gridPaging').innerText().catch(() => null), 120);
                await snap('r-roles-grid');
                const form = page.locator('#roleGridContainer #userGroupSearchForm');
                if (!(await form.isVisible())) await page.locator('#roleGridContainer .header a').filter({hasText: /^\s*Search\s*$/}).first().click();
                await form.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
                const w = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
                await form.locator('select[name="selectedRoleId"]').selectOption({label: 'Assistant'});
                await w; await settle();
                const assistants = await read();
                await snap('r-roles-grid-assistant');
                await loc(page, 'Roles grid: "With permission level set to" select[name=selectedRoleId]', form.locator('select[name="selectedRoleId"]'));
                return {all, paging, assistants};
            });
            fact('roles', o);
            S.roles = true; save();
        }

        // ---------------------------------------------------------------- admin: Actors row 7 (fn-r)
        if (on('admin') && !S.adminOmp) {
            const o = {};
            if (!S.A) {
                const p = await press_('a', {}, [['se', ['sectionEditor'], 'Sol', 'Series'], ['ed', ['editor'], 'Eve', 'Presseditor']]);
                S.A = {p}; save();
            }
            const {p} = S.A;
            for (const [u, label] of [[`${p}mg`, 'manager'], [`${p}ed`, 'presseditor']]) {
                o[label] = await safe(`admin-${label}`, async () => {
                    await as(u, p);
                    const r = {};
                    await gotoPlugins(p);
                    r.plugins = await pluginRead(['pdfjsviewerplugin', 'htmlmonographfileplugin', 'citationstylelanguageplugin']);
                    await snap(`a-${label}-01-plugins`);
                    r.pages = {};
                    for (const x of ['/management/settings/context', '/management/settings/website', '/management/settings/workflow', '/management/settings/distribution', '/management/settings/access']) {
                        const t0 = Date.now();
                        const resp = await page.goto(cUrl(p, x)).catch(() => null);
                        await settle();
                        r.pages[x] = {status: resp ? resp.status() : null, url: rel(page.url()), hasBox: await page.evaluate(() => /appear publicly/i.test(document.body.textContent)),
                            tabs: (await page.locator('[role="tab"]').allInnerTexts().catch(() => [])).map((t) => flat(t, 30)).slice(0, 14), errors: errorsSince(t0).length};
                        if (/distribution/.test(x)) {
                            await page.locator('#payments-button').first().click().catch(() => {});
                            await settle();
                            r.paymentsTab = flat(await page.locator('#payments').first().innerText().catch(() => null), 300);
                            await snap(`a-${label}-02-payments`);
                        }
                        if (/website/.test(x)) {
                            await page.locator('#appearance-button').first().click().catch(() => {});
                            await settle();
                            r.appearance = flat(await page.locator('#appearance').first().innerText().catch(() => null), 300);
                        }
                    }
                    r.adminContexts = brief(await land(app.url('/index.php/index/admin/contexts'), `a-${label}-03-admin-contexts`));
                    return r;
                });
            }
            o.series = await safe('admin-series', async () => {
                await as(`${p}se`, p);
                const r = {};
                for (const x of ['/management/settings/website', '/management/settings/distribution']) r[x] = brief(await land(cUrl(p, x), `a-se-${x.split('/').pop()}`));
                return r;
            });
            // leave a tabbed page once with a change unsaved: Users & Roles › "Site Access Options"
            o.unsaved = await safe('admin-unsaved', async () => {
                await as(`${p}mg`, p);
                await page.goto(cUrl(p, '/management/settings/access'));
                await settle();
                const tabBtn = page.getByRole('tab', {name: /Site Access Options/}).first();
                await tabBtn.click();
                await settle();
                const box = page.getByRole('checkbox', {name: /Users must be registered and log in to view the press site/}).first();
                const r = {before: await box.isChecked()};
                await box.check();
                await snap('a-u-01-ticked');
                await page.getByRole('tab', {name: /^Users$/}).first().click().catch(() => {});
                await settle();
                await tabBtn.click(); await settle();
                r.afterTabSwitch = await box.isChecked();
                const t0 = Date.now();
                await page.goto(cUrl(p, '/management/settings/website')).catch((e) => { r.navErr = flat(e.message, 120); });
                await settle();
                r.leaveDialogs = dialogsSince(t0);
                r.leftTo = rel(page.url());
                await page.goto(cUrl(p, '/management/settings/access'));
                await settle();
                await page.getByRole('tab', {name: /Site Access Options/}).first().click();
                await settle();
                r.afterReturn = await page.getByRole('checkbox', {name: /Users must be registered and log in to view the press site/}).first().isChecked();
                await snap('a-u-02-after-return');
                r.stored = sql(`select setting_value from press_settings where setting_name='restrictSiteAccess' and press_id=(select press_id from presses where path='${p}')`);
                return r;
            });
            // the Site Administrator's window (read, then unticked and closed unsaved)
            o.adminWindow = await safe('admin-window', async () => {
                await as('admin', 'index');
                const openEdit = async () => {
                    await page.goto(app.url('/index.php/index/admin/contexts')); await settle();
                    const row = page.locator('tr.gridRow').filter({hasText: `K1 a ${S.t}`}).first();
                    await row.locator('a.show_extras').click(); await settle();
                    await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                    const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
                    await cb.waitFor({timeout: T});
                    await sleep(600);
                    return cb;
                };
                let cb = await openEdit();
                const r = {label: await cb.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await cb.isChecked()};
                await snap('a-w-01-hosted-edit');
                await loc(page, 'Hosted Presses › Edit: "Enable this press to appear publicly on the site"', cb);
                await cb.uncheck();
                const t0 = Date.now();
                await page.locator(VIS).last().getByRole('button', {name: /^Close/}).first().click().catch(() => {});
                await sleep(1000);
                r.closeDialogs = dialogsSince(t0);
                r.windowStillOpen = await page.getByRole('checkbox', {name: /appear publicly on the site/}).count();
                await snap('a-w-02-closed-unsaved');
                cb = await openEdit();
                r.reopened = await cb.isChecked();
                await page.locator(VIS).last().getByRole('button', {name: /^Close/}).first().click().catch(() => {});
                return r;
            });
            await visitor();
            fact('admin', o);
            S.adminOmp = true; save();
        }

        // ---------------------------------------------------------------- set: the Actors paragraph (restrictSiteAccess, not enabled)
        if (on('set') && !S.set) {
            const o = {};
            if (!S.X) {
                const pay = {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 by cheque.'}};
                const x0 = await press_('x0', pay);
                const x1 = await press_('x1', {restrictSiteAccess: true, ...pay});
                const x2 = await press_('x2', {context: {enabled: false}, ...pay});
                const spec = (p) => ({published: true, datePublished: '2024-03-05', chapters: [{title: 'Chapter One', page: true, authors: [`${p}au`]}],
                    publicationFormats: [{name: 'PDF', file: 'article.pdf'}, {name: 'Sale', file: 'article.pdf', price: '25'}]});
                S.X = {};
                for (const [k, p] of [['x0', x0], ['x1', x1], ['x2', x2]]) S.X[k] = {p, b: await book(p, 'b', `K1 Access Book ${k}`, spec(p))};
                save();
                note(`ccK1 [omp] ${RUN} set: presses ${x0} (open) ${x1} (restrictSiteAccess) ${x2} (not enabled)`);
            }
            for (const k of ['x0', 'x1', 'x2']) {
                const {p, b} = S.X[k];
                const a = {book: `/catalog/book/${b.id}`, version: `/catalog/book/${b.id}/version/${b.pub}`,
                    chapter: null, view: `/catalog/view/${b.id}/${fmt(b, 'PDF').id}/${fmt(b, 'PDF').submissionFileId}`,
                    download: `/catalog/download/${b.id}/${fmt(b, 'PDF').id}/${fmt(b, 'PDF').submissionFileId}`,
                    sale: `/catalog/view/${b.id}/${fmt(b, 'Sale').id}/${fmt(b, 'Sale').submissionFileId}`};
                // the chapter's address is read from the open press's own page (x0); x1 and x2 are read signed out only
                const rb = await land(cUrl(S.X.x0.p, `/catalog/book/${S.X.x0.b.id}`), `x-${k}-01-open-book`);
                const ch = rb.toc.flatMap((c) => c.links).find((l) => /\/chapter\//.test(l.h));
                const chNo = ch ? ch.h.split('/chapter/')[1] : null;
                a.chapter = chNo ? `/catalog/book/${b.id}/chapter/${sql(`select source_chapter_id from submission_chapters where publication_id=${b.pub} order by seq limit 1`) || chNo}` : null;
                o[k] = {addrs: a, reader: {}, visitor: {}};
                if (k !== 'x2') {
                    await as(`${p}rd`, p);
                    for (const [n, u] of Object.entries(a)) if (u && n !== 'download') o[k].reader[n] = brief(await land(cUrl(p, u), `x-${k}-02-reader-${n}`));
                }
                await visitor();
                for (const [n, u] of Object.entries(a)) if (u) o[k].visitor[n] = brief(await land(cUrl(p, u), `x-${k}-04-visitor-${n}`));
                o[k].visitor.home = brief(await land(cUrl(p, ''), `x-${k}-04-visitor-home`));
            }
            fact('set', o);
            S.set = true; save();
        }

        // ---------------------------------------------------------------- files: Actors row 3 (td13)
        if (on('files') && !S.files) {
            const o = {};
            if (!S.F) {
                const f = (name, file, extra = {}) => ({name, file, genre: 'Book Manuscript', ...extra});
                const p = await press_('f');
                const b = await book(p, 'b', 'K1 Files Book', {published: true, mediaFiles: [{file: 'figure.png'}],
                    publicationFormats: [f('PDF', 'article.pdf'), f('HTML', 'article.html'), f('EPUB', 'notes.md')]});
                const q = await press_('fr', {restrictMonographAccess: true});
                const c = await book(q, 'b', 'K1 Restricted Book', {published: true, publicationFormats: [f('PDF', 'article.pdf')]});
                S.F = {p, b, q, c}; save();
                note(`ccK1 [omp] ${RUN} files: press ${p} book ${b.id} formats ${JSON.stringify(b.formats)}; restricted press ${q} book ${c.id}`);
            }
            const {p, b, q, c} = S.F;
            await visitor();
            for (const n of ['PDF', 'HTML', 'EPUB']) {
                await land(cUrl(p, `/catalog/book/${b.id}`), `f-01-book-${n}`);
                o[n] = pressBrief(await safe(`files-${n}`, () => press(fileLink(b, n), `f-02-pressed-${n}`, {waitMs: 3000})));
            }
            o.pdfOff = await safe('files-off', async () => {
                await as(`${p}mg`, p);
                await gotoPlugins(p);
                const r = {before: await pluginRead(['pdfjsviewerplugin', 'htmlmonographfileplugin'])};
                r.set = await setPlugin('pdfjsviewerplugin', false);
                await gotoPlugins(p);
                r.reloaded = await pluginRead(['pdfjsviewerplugin']);
                await snap('f-03-plugins-pdfjs-off');
                await visitor();
                await land(cUrl(p, `/catalog/book/${b.id}`), 'f-04-book-after-off');
                r.pressed = pressBrief(await press(fileLink(b, 'PDF'), 'f-05-pdf-pressed-off', {waitMs: 3000}));
                return r;
            });
            await visitor();
            o.restricted = await safe('files-restricted', async () => {
                const r = {};
                r.book = brief(await land(cUrl(q, `/catalog/book/${c.id}`), 'f-06-restricted-book-visitor'));
                r.pressed = pressBrief(await press(fileLink(c, 'PDF'), 'f-07-restricted-pdf-visitor'));
                r.signIn = await loginHere(`${q}rd`);
                r.signIn.page = await page.evaluate(PAGE).then((d) => ({h1: d.h1, viewer: d.viewerHeader, url: d.url})).catch(() => null);
                await snap('f-08-restricted-after-signin');
                return r;
            });
            await visitor();
            fact('files', o);
            S.files = true; save();
        }

        // ---------------------------------------------------------------- buy: Actors rows 4, 5 (td14, td25, q)
        if (on('buy') && !S.buy) {
            const o = {};
            if (!S.B) {
                const pay = {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 by cheque.'};
                const sale = {published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript', price: '25'}]};
                const p = await press_('b', {payments: {enabled: true, ...pay}});
                const b = await book(p, 'b', 'K1 Sale Book', sale);
                const n = await press_('bn');
                const nb = await book(n, 'b', 'K1 No Currency Book', sale);
                const m = await press_('bm', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment'}});
                const mb = await book(m, 'b', 'K1 No Instructions Book', sale);
                S.B = {p, b, n, nb, m, mb}; save();
                note(`ccK1 [omp] ${RUN} buy: presses ${p} (USD, manual with instructions) ${n} (no payments) ${m} (no instructions)`);
            }
            const {p, b, n, nb, m, mb} = S.B;
            await visitor();
            const vb = await land(cUrl(p, `/catalog/book/${b.id}`), 'b-01-visitor-book');
            o.link = vb.fileLinks;
            o.visitorPress = pressBrief(await safe('buy-visitor', () => press(fileLink(b, 'PDF'), 'b-02-visitor-pressed')));
            o.signIn = await safe('buy-signin', async () => {
                const r = await loginHere(`${p}rd`);
                r.page = await page.evaluate(PAGE).then((d) => ({h1: d.h1, url: d.url, body: flat(d.body, 400)})).catch(() => null);
                await snap('b-03-after-signin-reader');
                return r;
            });
            const mailsBefore = (await app.mail._search({to: `${p}ct@mail.test`}).catch(() => ({messages: []}))).messages.length;
            o.reader = await safe('buy-reader', async () => {
                await as(`${p}rd`, p);
                await land(cUrl(p, `/catalog/book/${b.id}`), 'b-04-reader-book');
                const r = {pay: pressBrief(await press(fileLink(b, 'PDF'), 'b-05-payment-page'))};
                r.payText = flat(await page.locator('.pkp_structure_main, body').first().innerText().catch(() => null), 500);
                await loc(page, 'Payment page: "Send notification of payment"', page.getByRole('link', {name: /Send notification of payment/}));
                r.send = pressBrief(await press(page.getByRole('link', {name: /Send notification of payment/}).first(), 'b-06-after-send'));
                r.sendText = flat(await page.locator('.pkp_structure_main, body').first().innerText().catch(() => null), 300);
                r.cont = pressBrief(await press(page.getByRole('link', {name: 'Continue', exact: true}).first(), 'b-07-after-continue'));
                return r;
            });
            await sleep(3000);
            o.mail = await safe('buy-mail', async () => {
                const list = (await app.mail._search({to: `${p}ct@mail.test`})).messages || [];
                const r = {before: mailsBefore, after: list.length, subjects: list.map((x) => x.Subject)};
                if (list[0]) {
                    const full = await app.mail.fullMessage(list[0].ID || list[0].id);
                    r.first = full ? {from: full.From, to: full.To, subject: full.Subject, text: flat(full.Text, 900)} : null;
                }
                return r;
            });
            o.manager = await safe('buy-manager', async () => {
                await as(`${p}mg`, p);
                await land(cUrl(p, `/catalog/book/${b.id}`), 'b-08-manager-book');
                return pressBrief(await press(fileLink(b, 'PDF'), 'b-09-manager-pressed'));
            });
            for (const [k, ctx, bk] of [['noCurrency', n, nb], ['noInstructions', m, mb]]) {
                o[k] = await safe(`buy-${k}`, async () => {
                    await as(`${ctx}rd`, ctx);
                    const d = await land(cUrl(ctx, `/catalog/book/${bk.id}`), `b-10-${k}-book`);
                    return {link: d.fileLinks, pressed: pressBrief(await press(fileLink(bk, 'PDF'), `b-11-${k}-pressed`))};
                });
            }
            await visitor();
            fact('buy', o);
            S.buy = true; save();
        }

        // ---------------------------------------------------------------- chrome: the Fields intro (fn-d), Purpose "reached from"
        if (on('chrome') && !S.chrome) {
            const o = {};
            if (!S.C) {
                const f = (name, file, extra = {}) => ({name, file, genre: 'Book Manuscript', ...extra});
                const spec = {series: [{path: 'mono', title: 'Monographs'}], categories: [{path: 'sci', title: 'Science'}], displayNewReleases: true, displayFeaturedBooks: true,
                    plugins: {citationstylelanguageplugin: {enabled: true}},
                    payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 by cheque.'}};
                const p = await press_('c', {...spec, sidebar: ['browseblockplugin']});
                const q = await press_('cn', spec);
                const bs = (ctx) => ({published: true, datePublished: '2024-03-05', series: 'mono', categories: ['sci'], mediaFiles: [{file: 'figure.png'}],
                    keywords: ['harbour', 'tide'], citationsRaw: ['Reference One. 2020.'], featured: [{in: 'catalog'}], newRelease: [{in: 'catalog'}],
                    chapters: [{title: 'Harbours', page: true, authors: [`${ctx}au`]}, {title: 'Plain Chapter', page: false, authors: [`${ctx}au`]}],
                    publicationFormats: [f('PDF', 'article.pdf'), f('HTML', 'article.html'), f('Sale', 'article.pdf', {price: '25'}), {name: 'Remote', urlRemote: 'https://example.org/k1-remote'}]});
                const b = await book(p, 'b', 'K1 Harbour Chrome Book', bs(p));
                const c = await book(q, 'b', 'K1 Harbour Chrome Book', bs(q));
                S.C = {p, b, q, c}; save();
                note(`ccK1 [omp] ${RUN} chrome: presses ${p} (sidebar browse) ${q} (no sidebar), books ${b.id} ${c.id}`);
            }
            const {p, b, q, c} = S.C;
            try { await drainJobs(app); } catch (e) { o.drain = flat(e.message, 100); }
            for (const [k, ctx, bk] of [['sidebar', p, b], ['none', q, c]]) {
                const r = {};
                await visitor();
                const d = await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-01-book`);
                r.book = {h1: d.h1, header: d.header, footer: d.footer, sidebar: d.sidebar, trail: d.trail, mainItems: d.mainItems, sideItems: d.sideItems, toc: d.toc, fileLinks: d.fileLinks, cite: d.cite};
                const chH = d.toc.flatMap((x) => x.links).find((l) => /\/chapter\//.test(l.h));
                if (chH) {
                    const cd = await land(app.url(`/index.php${chH.h}`), `h-${k}-02-chapter`);
                    r.chapter = {h1: cd.h1, header: cd.header, footer: cd.footer, sidebar: cd.sidebar, trail: cd.trail};
                }
                if (k === 'sidebar') {
                    // the side column's series and category links, the cover link
                    await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-03-book-again`);
                    r.seriesLink = pressBrief(await press(page.locator('.entry_details .item.series a').first(), `h-${k}-04-series-pressed`, {waitMs: 800}));
                    await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-05-book-again`);
                    r.categoryLink = pressBrief(await press(page.locator('.entry_details .item.categories a').first(), `h-${k}-06-category-pressed`, {waitMs: 800}));
                    await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-07-book-again`);
                    r.remote = pressBrief(await press(page.locator('.entry_details a.remote_resource, .entry_details .pub_format_remote a').first(), `h-${k}-08-remote-pressed`, {waitMs: 800}));
                    // the view pages and the payment page
                    for (const n of ['PDF', 'HTML']) {
                        await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-09-book-${n}`);
                        const v = await press(fileLink(bk, n), `h-${k}-10-view-${n}`, {waitMs: 2500});
                        r[`view${n}`] = {landed: v.landed, header: v.page && v.page.header, footer: v.page && v.page.footer, sidebar: v.page && v.page.sidebar, trail: v.page && v.page.trail, viewer: v.page && v.page.viewerHeader, errors: v.errors};
                    }
                    await as(`${ctx}rd`, ctx);
                    await land(cUrl(ctx, `/catalog/book/${bk.id}`), `h-${k}-11-reader-book`);
                    const pay = await press(fileLink(bk, 'Sale'), `h-${k}-12-payment-page`);
                    r.payment = {landed: pay.landed, h1: pay.page && pay.page.h1, header: pay.page && pay.page.header, footer: pay.page && pay.page.footer, sidebar: pay.page && pay.page.sidebar, trail: pay.page && pay.page.trail};
                    await visitor();
                    // what leads to the page (Purpose): catalog, series, category, search, home lists
                    r.leads = {};
                    for (const [n, x] of [['home', ''], ['catalog', '/catalog'], ['series', '/catalog/series/mono'], ['category', '/catalog/category/sci'], ['newReleases', '/catalog/newReleases'], ['search', '/search/search?query=Harbour']]) {
                        const l = await land(cUrl(ctx, x), `h-${k}-13-lead-${n}`);
                        const links = await page.locator(`a[href*="/catalog/book/${bk.id}"]`).evaluateAll((as) => as.map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) || '(image)')).catch(() => []);
                        r.leads[n] = {status: l.status, trail: l.trail, links};
                    }
                    // controls: pages with a trail
                    r.trailControls = {};
                    for (const x of ['/about', '/catalog', '/catalog/series/mono']) { const l = await land(cUrl(ctx, x), `h-${k}-14-trail${x.replace(/\W/g, '-')}`); r.trailControls[x] = l.trail; }
                    await loc(page, 'Public page: trail .cmp_breadcrumbs', page.locator('.cmp_breadcrumbs'));
                }
                o[k] = r;
            }
            fact('chrome', o);
            S.chrome = true; save();
        }

        // ---------------------------------------------------------------- canon: the seeded press's catalog (fn-s)
        if (on('canon') && !S.canon) {
            await visitor();
            const d = await land(cUrl(app.contextPath, '/catalog'), 'k-01-publicknowledge-catalog');
            const o = {status: d.status, count: await page.locator('.obj_monograph_summary').count(),
                titles: (await page.locator('.obj_monograph_summary .title').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
                paging: flat(await page.locator('.cmp_pagination').innerText().catch(() => null), 120)};
            o.published = sql(`select count(*) from submissions s join presses p on p.press_id=s.context_id where p.path='publicknowledge' and s.status=3`);
            fact('canon', o);
            S.canon = true; save();
        }
    } finally {
        await close();
    }
});
