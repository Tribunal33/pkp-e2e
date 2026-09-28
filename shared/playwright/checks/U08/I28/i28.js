// U08 claim check I28 (housekeeping 2026-09-28): the incidental rows for U08 in
// docs/tracking/incidentals.md (L132, L133, L153 b/c, L154, the U10-I28 French side menu).
// Chunk: .reports/hk28/chunks/U08.md. Spec: docs/specs/U08-navigation-menus-and-site-chrome.md
// Rules 15/15a, 18, 20, 29, 30 (the "Administration" row), A23.
//
// Run (twice, each run under its own facts name; the seed phase runs once and is kept in the state file):
//   RUN=1 PROBE_FEATURE=U08 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U08/I28/i28.js
//   RUN=2 PROBE_FEATURE=U08 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U08/I28/i28.js
//   PHASES=seed,admin,chrome,order,french (default: all; RESEED=1 for fresh scratch contexts)
//
// Phases:
//   seed    three scratch contexts per app (tag prefix u08i28): S (en + fr_CA under UI and Forms, the
//           Language Toggle block in the sidebar; a manager, section editor, author, reviewer, reader),
//           then Z ("… Zeta") and A ("… Alpha") created in that order, the S author enrolled in both.
//   admin   L132 / L133: `admin`'s public user menu (served and live hrefs) on S (en, fr_CA),
//           publicknowledge and the site's home; "Administration" pressed; the side menu's
//           "Administration" pressed from S's Settings (en, fr_CA).
//   chrome  L153 b/c: the header logo link's served and live href on S, publicknowledge and the site;
//           pressed from About; not-found addresses (themed or bare?) with header / sidebar / footer read.
//   order   L154: Hosted Journals order vs the journals switcher (admin on S; the S author on S), then
//           "Order" › drag Z/A › "Done", read again (run 1 puts A above Z, run 2 puts Z back above A).
//   french  U10-I28 row: every side-menu label (text and aria-label) per role in fr_CA and en on S.
// Mutations happen on the scratch contexts only; the Hosted Journals "Order" moves only Z and A.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['seed', 'admin', 'chrome', 'order', 'french'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const RUN = process.env.RUN || '1';
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u == null ? '' : u).replace(/^\s*https?:\/\/[^/]+/, '');
const T = 30_000;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const stateFile = path.join(outDir(), `i28-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(stateFile)) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 2));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); console.log(`[i28 ${app.name} run${RUN} ${k}]`, JSON.stringify(v).slice(0, 1800)); };
    const cu = (p, rest = '') => app.url(`/index.php/${p}${rest}`);
    const PK = app.contextPath;

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.t) {
        const t = tag('u08i28');
        S.t = t;
        const users = [
            {username: `${t}mg`, roles: ['manager']},
            {username: `${t}se`, roles: ['sectionEditor']},
            {username: `${t}au`, roles: ['author']},
            {username: `${t}rd`, roles: ['reader']},
        ];
        if (!isOPS) users.push({username: `${t}rv`, roles: ['externalReviewer']});
        const s = await app.api.createContext({tag: `${t}s`, context: {name: `U08 I28 Main ${t}`, acronym: 'I28S', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, sidebar: ['languagetoggleblockplugin'], users});
        S.S = {path: `${t}s`, id: s.contextId, name: `U08 I28 Main ${t}`};
        save();
        const z = await app.api.createContext({tag: `${t}z`, context: {name: `U08 I28 Zeta ${t}`, acronym: 'I28Z'}, users: [{username: `${t}au`, roles: ['author']}]});
        S.Z = {path: `${t}z`, id: z.contextId, name: `U08 I28 Zeta ${t}`};
        save();
        const a = await app.api.createContext({tag: `${t}a`, context: {name: `U08 I28 Alpha ${t}`, acronym: 'I28A'}, users: [{username: `${t}au`, roles: ['author']}]});
        S.A = {path: `${t}a`, id: a.contextId, name: `U08 I28 Alpha ${t}`};
        S.users = users.map((u) => u.username);
        save();
        fact('seed', S);
    }
    if (!S.t) { console.log('[i28] no state; run the seed phase'); return; }
    const t = S.t;
    const U = (k) => `${t}${k}`;

    const {page, context, close} = await launch(app);
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push({url: rel(page.url()), msg: flat(e.message, 200)}));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({url: rel(page.url()), msg: flat(m.text(), 200)}); });
    page.on('dialog', (d) => { (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    const snap = async (pg, name, extra = {}) => { const s = await screen(pg).catch((e) => ({error: String(e)})); record(`r${RUN}-${name}`, {...s, extra}); await shot(pg, `r${RUN}-${name}`).catch(() => {}); return s; };
    const go = async (pg, url) => { const r = await pg.goto(url).catch((e) => ({error: String(e.message)})); await idle(pg).catch(() => {}); return r && r.status ? r.status() : r; };
    const as = async (u, ctx) => { await signIn(page, u, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); };

    // the public user menu, served (page.request carries the browser's cookies) and live
    const servedUserMenu = async (pg, url) => {
        const r = await pg.request.get(url);
        const html = await r.text();
        const m = html.match(/<ul[^>]*id="navigationUser"[\s\S]*?<\/ul>\s*<\/li>\s*<\/ul>|<ul[^>]*id="navigationUser"[\s\S]*?<\/ul>/);
        const block = m ? m[0] : '';
        const links = [...block.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((x) => ({href: x[1], text: flat(x[2].replace(/<[^>]+>/g, ' '), 60)}));
        return {status: r.status(), links};
    };
    const liveUserMenu = (pg) => pg.evaluate(() => [...document.querySelectorAll('#navigationUser a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), resolved: a.href})));
    const pressUserMenuItem = async (pg, re) => {
        const top = pg.locator('#navigationUser > li').first();
        await top.hover(); await sleep(400);
        const item = pg.locator('#navigationUser > li > ul a').filter({hasText: re}).first();
        if (!(await item.count())) return {present: false};
        const [resp] = await Promise.all([pg.waitForNavigation({timeout: T}).catch(() => null), item.click()]);
        await idle(pg).catch(() => {});
        const chain = [];
        let rq = resp ? resp.request() : null;
        while (rq) { chain.unshift(rel(rq.url())); rq = rq.redirectedFrom(); }
        return {present: true, landed: rel(pg.url()), chain, status: resp ? resp.status() : null, h1: flat(await pg.locator('h1').first().innerText().catch(() => ''), 100), title: await pg.title()};
    };
    // the side menu (PrimeVue panelmenu), every label and code
    const sideNav = (pg) => pg.evaluate(() => {
        const nav = document.querySelector('nav#app-nav');
        if (!nav) return null;
        const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        return [...nav.querySelectorAll('[data-pc-section="panel"]')].map((p) => {
            const h = p.querySelector('[data-pc-section="header"]');
            const a = h && h.querySelector('a');
            return {
                label: h ? h.getAttribute('aria-label') : null, text: tc(h), href: a ? a.getAttribute('href') : null,
                items: [...p.querySelectorAll('[role="treeitem"]')].map((li) => { const la = li.querySelector('a'); const inp = li.querySelector('input'); return {label: li.getAttribute('aria-label'), text: tc(li), href: la ? la.getAttribute('href') : null, input: inp ? inp.getAttribute('placeholder') : null}; }),
            };
        });
    }).catch((e) => ({error: String(e)}));
    const codesIn = (pg, sel) => pg.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const txt = el.innerText + ' ' + el.textContent + ' ' + [...el.querySelectorAll('[aria-label],[title],[placeholder]')].map((e) => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].join(' ')).join(' ');
        return [...new Set(txt.match(/##[^#\s]+##/g) || [])];
    }, sel).catch(() => null);
    // the public chrome of a page, as data
    const chrome = (pg) => pg.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const tc = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const logo = q('.pkp_site_name a');
        return {
            url: location.pathname + location.search, docTitle: document.title, lang: document.documentElement.lang,
            header: !!q('header.pkp_structure_head, .pkp_structure_head'), footer: !!q('.pkp_structure_footer_wrapper, .pkp_structure_footer'),
            sidebar: !!q('.pkp_structure_sidebar'), sidebarBlocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((b) => b.className),
            logo: logo ? {cls: logo.className, href: logo.getAttribute('href'), resolved: logo.href, text: tc(logo), img: logo.querySelector('img') ? logo.querySelector('img').getAttribute('alt') : null} : null,
            h1: [...document.querySelectorAll('h1')].map(tc), crumbs: [...document.querySelectorAll('.cmp_breadcrumbs li')].map(tc),
            primary: [...document.querySelectorAll('#navigationPrimary > li > a')].map((a) => tc(a)), user: [...document.querySelectorAll('#navigationUser > li > a')].map((a) => tc(a)),
            body: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 300),
        };
    }).catch((e) => ({error: String(e)}));
    const servedLogo = async (pg, url) => {
        const r = await pg.request.get(url);
        const html = await r.text();
        const m = html.match(/<div class="pkp_site_name">[\s\S]*?<a href="([^"]*)"\s+class="([^"]*)"/);
        return {status: r.status(), href: m ? m[1] : null, hrefJSON: m ? JSON.stringify(m[1]) : null, whitespace: m ? /\s/.test(m[1]) : null, cls: m ? m[2] : null};
    };

    try {
        // ------------------------------------------------------------------ admin (L132, L133)
        if (on('admin')) {
            const out = {};
            await as('admin');
            out.signInLanded = rel(page.url());
            const where = [
                ['S-bare', cu(S.S.path)], ['S-en', cu(S.S.path, '/en')], ['S-fr', cu(S.S.path, '/fr_CA')],
                ['Z-bare', cu(S.Z.path)], ['Z-en', cu(S.Z.path, '/en')],
                ['pk-en', cu(PK, '/en')], ['site', cu('index')], ['site-en', cu('index', '/en')], ['site-fr', cu('index', '/fr_CA')],
            ];
            for (const [k, url] of where) {
                const o = {};
                o.status = await go(page, url);
                o.url = rel(page.url());
                o.served = await servedUserMenu(page, page.url());
                o.live = await liveUserMenu(page);
                o.chrome = await chrome(page);
                await snap(page, `adm-${k}`, o);
                o.pressAdmin = await pressUserMenuItem(page, /Administration/);
                if (o.pressAdmin.present) {
                    o.adminCodes = await codesIn(page, 'body');
                    o.adminLang = await page.evaluate(() => document.documentElement.lang).catch(() => null);
                    await snap(page, `adm-${k}-landed`, o.pressAdmin);
                }
                out[k] = o;
            }
            // the single-language journal's link carries no language: where it lands after the browser last chose fr_CA / en
            for (const [k, lc] of [['Z-after-fr', 'fr_CA'], ['Z-after-en', 'en'], ['Z-after-fr2', 'fr_CA']]) {
                const o = {};
                await go(page, cu('index', `/${lc}`));
                o.status = await go(page, cu(S.Z.path));
                o.url = rel(page.url());
                o.pageLang = await page.evaluate(() => document.documentElement.lang).catch(() => null);
                o.live = (await liveUserMenu(page)).filter((l) => /Administration/.test(l.text));
                await snap(page, `adm-${k}`, o);
                o.pressAdmin = await pressUserMenuItem(page, /Administration/);
                o.adminLang = await page.evaluate(() => document.documentElement.lang).catch(() => null);
                await snap(page, `adm-${k}-landed`, o);
                out[k] = o;
            }
            await loc(page, 'Public user menu: "Administration" (after hovering the username li)', page.locator('#navigationUser > li > ul a').filter({hasText: /Administration/}));
            // L133: the side menu's "Administration" from S's Settings, en and fr_CA
            for (const [k, lc] of [['side-en', 'en'], ['side-fr', 'fr_CA']]) {
                const o = {};
                await go(page, cu(S.S.path, `/${lc}/management/settings/context`));
                o.nav = await sideNav(page);
                const panel = (o.nav || []).find((p) => p.href && /admin/.test(p.href));
                o.adminPanel = panel || null;
                await snap(page, `adm-${k}-settings`, {nav: o.nav});
                const link = page.locator('nav#app-nav [data-pc-section="header"] a[href*="/admin"]').first();
                if (await link.count()) {
                    await loc(page, 'Side menu: "Administration" entry', link);
                    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), link.click()]);
                    await idle(page).catch(() => {});
                    o.landed = rel(page.url());
                    o.h1 = flat(await page.locator('h1').first().innerText().catch(() => ''), 100);
                    o.title = await page.title();
                    o.codes = await codesIn(page, 'body');
                    o.mainText = flat(await page.locator('main').first().innerText().catch(() => ''), 900);
                    await snap(page, `adm-${k}-landed`, o);
                }
                out[k] = o;
            }
            fact('admin', out);
        }

        // ------------------------------------------------------------------ chrome (L153 b, c)
        if (on('chrome')) {
            const out = {};
            const V = await launch(app);
            V.page.on('dialog', (d) => d.dismiss().catch(() => {}));
            try {
                const vp = V.page;
                for (const [k, url] of [['S-home', cu(S.S.path)], ['S-en-about', cu(S.S.path, '/en/about')], ['pk-home', cu(PK)], ['pk-en-about', cu(PK, '/en/about')], ['site', cu('index')], ['site-en-search', cu('index', '/en/search')]]) {
                    const o = {served: await servedLogo(vp, url)};
                    o.status = await go(vp, url);
                    o.chrome = await chrome(vp);
                    await snap(vp, `chr-${k}`, o);
                    const logo = vp.locator('.pkp_site_name a').first();
                    if (await logo.count()) {
                        await Promise.all([vp.waitForNavigation({timeout: T}).catch(() => null), logo.click()]);
                        await idle(vp).catch(() => {});
                        o.logoPressedLanded = rel(vp.url());
                    }
                    out[k] = o;
                }
                await loc(vp, 'Public header: logo/name link', vp.locator('.pkp_site_name a'));
                // not-found addresses: an item that does not exist, a route with no handler, an op with no handler
                const nf = [];
                const base = [
                    ['nopage', '/en/nosuchpageu08'], ['noop-about', '/en/about/nosuchop'], ['announcement-off', '/en/announcement/view/999999'],
                ];
                if (isOJS) base.push(['article-missing', '/en/article/view/999999'], ['issue-missing', '/en/issue/view/999999']);
                if (isOMP) base.push(['book-missing', '/en/catalog/book/999999'], ['series-missing', '/en/catalog/series/nosuchu08']);
                if (isOPS) base.push(['preprint-missing', '/en/preprint/view/999999'], ['preprints-category-missing', '/en/preprints/category/nosuchu08']);
                for (const ctx of [S.S.path, PK]) {
                    for (const [k, p] of base) {
                        const r = await vp.goto(cu(ctx, p)).catch((e) => ({error: String(e.message)}));
                        await idle(vp).catch(() => {});
                        const o = {ctx: ctx === PK ? 'pk' : 'S', key: k, path: p, status: r && r.status ? r.status() : r, chrome: await chrome(vp)};
                        await snap(vp, `chr-nf-${o.ctx}-${k}`, o);
                        nf.push(o);
                    }
                }
                out.notFound = nf.map((o) => ({ctx: o.ctx, key: o.key, status: o.status, header: o.chrome.header, sidebar: o.chrome.sidebar, blocks: o.chrome.sidebarBlocks.length, footer: o.chrome.footer, h1: o.chrome.h1, title: o.chrome.docTitle, body: flat(o.chrome.body, 80)}));
                // signed-in control: the S manager on S's missing-item addresses (the app's own, after the three shared ones)
                await signIn(vp, U('mg'), {contextPath: S.S.path}); await idle(vp).catch(() => {});
                out.notFoundSignedIn = [];
                for (const [k, p] of base.slice(3)) {
                    const r = await vp.goto(cu(S.S.path, p)).catch(() => null);
                    await idle(vp).catch(() => {});
                    const c = await chrome(vp);
                    const o = {key: k, status: r ? r.status() : null, url: c.url, header: c.header, sidebar: c.sidebar, blocks: (c.sidebarBlocks || []).length, footer: c.footer, h1: c.h1, crumbs: c.crumbs, body: flat(c.body, 80)};
                    o.message = flat(await vp.locator('.pkp_structure_main').first().innerText().catch(() => ''), 200);
                    await snap(vp, `chr-nf-S-signedin-${k}`, o);
                    out.notFoundSignedIn.push(o);
                }
            } finally { await V.close(); }
            fact('chrome', out);
        }

        // ------------------------------------------------------------------ order (L154)
        if (on('order')) {
            const out = {};
            const hosted = async () => { await go(page, app.url('/index.php/index/en/admin/contexts')); await page.locator('tr.gridRow').first().waitFor({timeout: T}); };
            const readRows = () => page.evaluate(() => [...document.querySelectorAll('tr.gridRow')].map((r) => {
                const tds = r.querySelectorAll('td');
                return {id: r.id.replace(/.*-row-/, ''), name: (tds[0] ? tds[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings /, '').trim()};
            }));
            const row = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
            const switcher = async () => {
                const sw = page.locator('header .app__contexts').first();
                if (!(await sw.count())) return {present: false, entries: []};
                const btn = sw.locator('button').first();
                await btn.click().catch(() => {}); await sleep(700);
                const entries = await sw.locator('a').evaluateAll((as) => as.map((a) => ({name: a.textContent.replace(/\s+/g, ' ').trim(), vis: a.offsetParent !== null})));
                const sr = await sw.locator('.-screenReader').first().textContent().catch(() => null);
                return {present: true, sr, entries: entries.map((e) => e.name), shown: entries.filter((e) => e.vis).length, btn};
            };
            const readAll = async (label) => {
                const o = {};
                await as('admin');
                await hosted();
                const rows = await readRows();
                o.gridNames = rows.map((r) => r.name);
                o.gridZA = {Z: o.gridNames.indexOf(S.Z.name), A: o.gridNames.indexOf(S.A.name), n: rows.length};
                await snap(page, `ord-${label}-hosted`, {grid: o.gridZA});
                // admin's switcher on S's Settings page
                await go(page, cu(S.S.path, '/en/management/settings/context'));
                const sw = await switcher();
                await snap(page, `ord-${label}-switcher-admin`, {entries: sw.entries});
                if (sw.btn) await sw.btn.click().catch(() => {});
                const expected = o.gridNames.filter((n) => n !== S.S.name);
                o.adminSwitcher = {present: sw.present, sr: sw.sr, n: sw.entries.length, shown: sw.shown, Z: sw.entries.indexOf(S.Z.name), A: sw.entries.indexOf(S.A.name),
                    equalsGrid: JSON.stringify(sw.entries) === JSON.stringify(expected), equalsAlpha: JSON.stringify(sw.entries) === JSON.stringify([...sw.entries].sort((x, y) => x.localeCompare(y))),
                    firstDiff: (() => { for (let i = 0; i < Math.max(sw.entries.length, expected.length); i++) if (sw.entries[i] !== expected[i]) return {i, sw: sw.entries[i], grid: expected[i]}; return null; })()};
                // the S author (enrolled in S, Z, A) on S's dashboard
                await as(U('au'), S.S.path);
                await go(page, cu(S.S.path, '/en/dashboard/mySubmissions'));
                const sa = await switcher();
                await snap(page, `ord-${label}-switcher-author`, {entries: sa.entries});
                if (sa.btn) await sa.btn.click().catch(() => {});
                o.authorSwitcher = {present: sa.present, entries: sa.entries};
                return o;
            };
            out.before = await readAll('before');
            // "Order": drag the lower of Z/A above the upper, "Done"
            await as('admin');
            await hosted();
            const upper = out.before.gridZA.Z < out.before.gridZA.A ? S.Z : S.A;
            const lower = upper === S.Z ? S.A : S.Z;
            const orderBtn = page.getByRole('link', {name: 'Order', exact: true}).first();
            await loc(page, 'Hosted Journals: "Order" link', orderBtn);
            await orderBtn.click(); await sleep(700);
            const src = row(lower.name), dst = row(upper.name);
            await src.scrollIntoViewIfNeeded();
            const sb = await src.boundingBox(), db = await dst.boundingBox();
            await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
            await page.mouse.down();
            await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 - 4, {steps: 3});
            await page.mouse.move(db.x + db.width / 2, db.y + 3, {steps: 20});
            await sleep(300); await page.mouse.up(); await sleep(600);
            const done = page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first();
            const seqResp = page.waitForResponse((r) => /saveSequence|save-sequence/.test(r.url()), {timeout: T}).catch(() => null);
            await done.click();
            const sr = await seqResp;
            out.done = {moved: lower.name, above: upper.name, response: sr ? {status: sr.status(), url: rel(sr.url())} : null};
            await sleep(1000); await idle(page).catch(() => {});
            out.after = await readAll('after');
            fact('order', out);
        }

        // ------------------------------------------------------------------ french (U10-I28 side menu row)
        if (on('french')) {
            const out = {};
            const who = [['mg', U('mg'), '/management/settings/context'], ['admin', 'admin', '/management/settings/context'], ['se', U('se'), '/dashboard/editorial'], ['au', U('au'), '/dashboard/mySubmissions'], ['rd', U('rd'), '/user/profile']];
            if (!isOPS) who.push(['rv', U('rv'), '/dashboard/reviewAssignments']);
            for (const [k, user, p] of who) {
                const o = {};
                if (user === 'admin') await as('admin'); else await as(user, S.S.path);
                for (const lc of ['fr_CA', 'en']) {
                    await go(page, cu(S.S.path, `/${lc}${p}`));
                    const nav = await sideNav(page);
                    const codes = await codesIn(page, 'nav#app-nav');
                    const headerCodes = await codesIn(page, 'header.app__header');
                    const lang = await page.evaluate(() => document.documentElement.lang).catch(() => null);
                    await snap(page, `fr-${k}-${lc}`, {nav, codes, headerCodes});
                    o[lc] = {url: rel(page.url()), lang, codes, headerCodes, labels: (nav || []).map((pn) => ({label: pn.label, text: pn.text, items: pn.items.map((i) => i.label || i.input)}))};
                }
                out[k] = o;
            }
            fact('french', out);
        }
    } finally {
        fact(`errors-${PHASES.join('+')}`, {pageErrors, consoleErrors: consoleErrors.slice(0, 40)});
        await close();
    }
});
