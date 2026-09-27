// U68 claim check K4: the "Browse" block's catalog lines, menu items, the home page's lists, a press's category
// page and French (spec fields 108–112, Rules 12–15 219–267, Settings 5–7 294–308, register A7, A8; footnotes h, k,
// l, n, td7, td8, td9, td12, f-a7, f-a8).
//
//   PROBE_FEATURE=U68 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U68/K4/k4.js
//   OMP outlasts 600 s: run it detached (patterns.md "Probe kit"). PHASES=a,b picks phases (default all, in order);
//   the seeded contexts are kept in k4-state-<app>.json under the output folder (delete it for a fresh seed).
//
// Phases (OMP unless marked):
//   controls  OJS, OPS: a scratch journal/server with the "Browse" block placed and a category (IPP 1, two items):
//             the block's lines, the Plugins row, Appearance › Setup; the category page's paging; publicknowledge's
//             category page in French (multi-app rule 4 for Rules 12, 14, 15, Settings 6, 7)
//   seed      presses B (block: series Alpha/Gamma/Delta, a category), I (only series inactive), N (empty, French,
//             block placed, home lists ticked), M (menu items), C (category flags), P (category paging), F (French)
//   setup     B as manager: Appearance › Setup as it opens; the Sidebar box and the two home-list boxes ticked and
//             left unsaved (tab switches, another page), then saved; read after save and after a reload
//   pages     B as a visitor: the home page (the lists, the block) and every other public page's block
//   series    B: Delta made inactive, Alpha's prefix, the block after; Alpha's and Gamma's page (the marked link);
//             the Series "Order" changed and the block after
//   blockset  B as manager: the block's "Settings" window (Cancel with a change; "New releases" off; "Series" off)
//   lone      I: the only series inactive; N: no series
//   menu      M: "Catalog", "New Releases" and "Series" items added and placed; the path changed; inactive; a
//             second series' item and the series deleted
//   cat       C: the category page and the catalog and series pages beside it; the Catalog page's category flags;
//             P: paging; publicknowledge: home, "Catalog", then a category page (OMP5)
//   french    publicknowledge in French (catalog, a series, "New Releases", home); F and N in French and English
//   again     second runs of the one-run facts: a new press whose only series is made inactive in its window; N's
//             home in French; a new press's "Series" item whose series is deleted (the tab, the menu window, the item)
//   extra     OJS, OPS: a scratch journal/server in French with the block placed (the block's French control);
//             OMP: a press with "Show Series" and one series holding a book (the catalog's "Series:" threshold)
//   recheck   a second process's read of C's catalog and series pages (A7's comparison)
//   french2   F: a book added to "Empty" (two series with books, so the catalog's "Series:" shows), the catalog in French
//             and English; then "Empty" made inactive: the catalog's "Series:" and the block
//
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const ALL = 'controls,seed,setup,pages,series,blockset,lone,menu,cat,french,french2,again,recheck,extra';
const PHASES = (process.env.PHASES || ALL).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k4 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const {execFileSync} = require('child_process');
// The category pages list from the search index, which a seeded publication reaches only once the queued jobs run.
const drainJobs = (app) => {
    const out = [];
    for (const args of [['run'], ['work', '--stop-when-empty'], ['work', '--stop-when-empty']]) {
        try {
            out.push(execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 240_000})
                .split('\n').filter((l) => l.trim()).slice(-2).join(' | ').slice(0, 300));
        } catch (e) { out.push(`error: ${String(e.message).split('\n')[0].slice(0, 200)}`); }
    }
    return out;
};

// ---- a public page as data: the block, the lists, the summaries, the header ------------------
const PAGE = () => {
    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const q = (s) => document.querySelector(s);
    const rel = (h) => (h || '').replace(/^https?:\/\/[^/]+/, '');
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const sty = (e) => { if (!e) return null; const s = getComputedStyle(e); return {color: s.color, borderLeft: `${s.borderLeftWidth} ${s.borderLeftStyle} ${s.borderLeftColor}`, pad: s.paddingLeft, bg: s.backgroundColor}; };
    const b = q('.block_browse');
    const block = b ? {
        heading: t((b.querySelector('.title') || {}).innerText),
        text: t(b.innerText),
        lines: [...b.querySelectorAll('nav > ul > li')].map((li) => {
            const a = li.querySelector(':scope > a');
            const own = [...li.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(' ');
            return {
                line: a ? t(a.innerText) : own, href: a ? rel(a.getAttribute('href')) : null, liCls: li.className || null,
                sub: [...li.querySelectorAll(':scope > ul > li')].map((s) => { const sa = s.querySelector('a'); return {t: t(s.innerText), href: sa ? rel(sa.getAttribute('href')) : null, cls: s.className, li: sty(s), a: sty(sa)}; }),
            };
        }),
    } : null;
    const lists = [...document.querySelectorAll('.pkp_structure_main .cmp_monographs_list')].map((m) => ({
        heading: m.querySelector(':scope > .title') ? t(m.querySelector(':scope > .title').innerText) : null,
        headingTag: m.querySelector(':scope > .title') ? m.querySelector(':scope > .title').tagName : null,
        items: [...m.querySelectorAll('.obj_monograph_summary')].map((s) => {
            const img = s.querySelector('.cover img');
            return {
                title: t((s.querySelector('.title') || {}).innerText), titleTag: (s.querySelector('.title') || {}).tagName || null,
                featured: s.classList.contains('is_featured'), inRow: !!s.closest('.row'), box: r(s),
                seriesPosition: s.querySelector('.seriesPosition') ? t(s.querySelector('.seriesPosition').innerText) : null,
                author: s.querySelector('.author') ? t(s.querySelector('.author').innerText) : null,
                date: s.querySelector('.date') ? t(s.querySelector('.date').innerText) : null,
                coverHref: rel((s.querySelector('a.cover') || {getAttribute: () => null}).getAttribute('href')),
                titleHref: rel((s.querySelector('.title a') || {getAttribute: () => null}).getAttribute('href')),
                img: img ? {src: rel(img.getAttribute('src')).slice(0, 160), alt: img.getAttribute('alt'), w: img.naturalWidth} : null,
            };
        }),
    }));
    const main = q('.pkp_structure_main') || document.body;
    const codes = [...new Set(((document.body.innerText || '').match(/##[^#\s]+##/g) || []))];
    return {
        url: rel(location.href), docTitle: document.title, lang: document.documentElement.lang,
        h1: [...main.querySelectorAll('h1')].map((h) => t(h.innerText)),
        h2: [...main.querySelectorAll('h2')].map((h) => t(h.innerText)),
        crumbs: [...document.querySelectorAll('.cmp_breadcrumbs li')].map((li) => t(li.innerText)),
        count: q('.monograph_count') ? t(q('.monograph_count').innerText) : null,
        lists,
        pagination: q('.cmp_pagination') ? {text: t(q('.cmp_pagination').innerText), links: [...q('.cmp_pagination').querySelectorAll('a')].map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href'))}))} : null,
        catalogSeries: q('.pkp_series_nav_menu, .series_nav') ? t(q('.pkp_series_nav_menu, .series_nav').innerText) : null,
        issn: [...document.querySelectorAll('.onlineISSN, .printISSN, .issn')].map((e) => t(e.innerText)),
        otherItems: [...main.querySelectorAll('.obj_article_summary, .obj_preprint_summary')].map((e) => t((e.querySelector('.title') || e).innerText).slice(0, 80)),
        paras: [...main.querySelectorAll('p')].map((p) => t(p.innerText)).filter(Boolean).slice(0, 12),
        block,
        sidebarBlocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((x) => x.className),
        primary: [...document.querySelectorAll('#navigationPrimary > li')].map((li) => { const a = li.querySelector(':scope > a'); return {t: a ? t(a.innerText) : t(li.innerText), href: a ? rel(a.getAttribute('href')) : null}; }),
        codes,
        mainText: t(main.innerText).slice(0, 1800),
    };
};

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
    const fact = (k, v) => { record('k4-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const LOG = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
    const logSize = () => { try { return fs.statSync(LOG).size; } catch (e) { return null; } };
    const logSince = (off) => {
        if (off == null) return 'absent';
        try {
            const fd = fs.openSync(LOG, 'r'); const n = fs.statSync(LOG).size - off; const bf = Buffer.alloc(Math.max(0, n));
            fs.readSync(fd, bf, 0, bf.length, off); fs.closeSync(fd);
            return [...new Set(bf.toString('utf8').split('\n').filter((l) => /Warning|Error|Fatal|Notice|Deprecated|Segmentation|signal/i.test(l)).map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ''), 220)))].slice(0, 8);
        } catch (e) { return String(e.message); }
    };
    async function post(route, body) {
        const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey}, body: JSON.stringify(body)});
        const json = await r.json().catch(() => null);
        if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(json).slice(0, 400)}`);
        return json;
    }
    const cu = (P, p = '', locale = '') => app.url(`/index.php/${P}${locale ? '/' + locale : ''}${p}`);

    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));

    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page, vis = vs.page;
    const jsDialogs = [];
    for (const p of [page, vis]) p.on('dialog', (d) => { jsDialogs.push({type: d.type(), message: flat(d.message(), 300), url: strip(p.url())}); d.accept().catch(() => {}); });
    const fails = [];
    for (const p of [page, vis]) {
        p.on('response', (r) => { if (r.status() >= 500) fails.push({status: r.status(), url: strip(r.url()).slice(0, 200), t: Math.round((Date.now() - T0) / 1000)}); });
        p.on('pageerror', (e) => fails.push({pageerror: flat(e.message, 200), url: strip(p.url()), t: Math.round((Date.now() - T0) / 1000)}));
        p.on('requestfailed', (rq) => { if (rq.resourceType() === 'document') fails.push({requestfailed: rq.failure() && rq.failure().errorText, url: strip(rq.url()).slice(0, 200), t: Math.round((Date.now() - T0) / 1000)}); });
    }

    async function snap(p, name, extra = {}, png = true) {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), error: String(e.message).slice(0, 200)}; }
        record(name, {...s, ...extra});
        if (png) await shot(p, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(page, `zz-failed-${name}-mgr`).catch(() => {});
            await snap(vis, `zz-failed-${name}-vis`).catch(() => {});
            return null;
        }
    }
    /** A public page read by `p` (the visitor by default): status, the page as data, the server log since. */
    async function read(name, url, p = vis) {
        const off = logSize(); const f0 = fails.length;
        const r = await p.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(p).catch(() => {});
        await snap(p, name);
        const d = await p.evaluate(PAGE).catch((e) => ({evalError: flat(e.message, 200)}));
        return {status: r && r.status ? r.status() : r, ...d, fails: fails.slice(f0), serverLog: logSince(off)};
    }
    const bl = (o) => o && o.block ? o.block.lines.map((l) => `${l.line}${l.href ? ' →' + l.href.replace(/^.*index\.php\/[^/]+/, '') : ''}${l.sub.length ? ' [' + l.sub.map((s) => `${s.t}${/current/.test(s.cls) ? ' (current)' : ''}`).join(' | ') + ']' : ''}`) : null;
    const brief = (o) => o && {status: o.status, url: o.url, docTitle: o.docTitle, h1: o.h1, h2: o.h2, crumbs: o.crumbs && o.crumbs.join(' / '), count: o.count,
        lists: o.lists && o.lists.map((l) => `${l.heading || '(none)'}: ${l.items.map((i) => `${i.title}${i.featured ? ' [featured]' : ''}${i.inRow ? '' : ' [own row]'} w${i.box[2]}`).join('; ')}`),
        pagination: o.pagination, block: bl(o), primary: o.primary && o.primary.map((x) => x.t).join(' | '), codes: o.codes, fails: o.fails, serverLog: o.serverLog, evalError: o.evalError, err: o.err};

    const asMgr = async (P) => { await signIn(page, `${P}mg`, {contextPath: P}); await idle(page).catch(() => {}); };
    const openTab = async (P, top, side) => {
        await page.goto('about:blank');
        await page.goto(cu(P, '/management/settings/website'));
        await idle(page);
        const tb = page.locator(`#${top}-button`).first();
        await tb.waitFor({timeout: T});
        if ((await tb.getAttribute('aria-selected')) !== 'true') { await tb.click(); await idle(page); }
        if (side) {
            const s = page.locator(`#${side}-button`).first();
            await s.waitFor({timeout: T});
            if ((await s.getAttribute('aria-selected')) !== 'true') { await s.click(); await idle(page); }
        }
        await sleep(700);
        return page.locator(`[role="tabpanel"]#${side || top}`).first();
    };
    const pluginRow = () => page.locator('tr.gridRow[id$="-row-browseblockplugin"]').first();
    const readRow = async () => {
        const row = pluginRow();
        await row.waitFor({timeout: T}).catch(() => {});
        if (!(await row.count())) return {present: false};
        const o = await row.evaluate((tr) => { const box = tr.querySelector('input[type=checkbox]'); return {present: true, text: tr.innerText.replace(/\s+/g, ' ').trim(), checked: box ? box.checked : null, arrow: !!tr.querySelector('a.show_extras')}; });
        if (o.arrow) {
            await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(600);
            o.controls = (await row.locator('xpath=following-sibling::tr[1]').locator('a').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        }
        return o;
    };
    const setupBoxes = async (panel) => panel.evaluate((root) => {
        const lab = (e) => { const l = e.closest('label') || (e.id && root.querySelector(`label[for="${e.id}"]`)); return l ? l.innerText.replace(/\s+/g, ' ').trim() : null; };
        const legendOf = (e) => { const fs = e.closest('fieldset'); const lg = fs && fs.querySelector('legend'); return lg ? lg.innerText.replace(/\s+/g, ' ').trim() : null; };
        return [...root.querySelectorAll('input[type=checkbox], input[type=radio]')].map((e) => ({name: e.name, value: e.value, checked: e.checked, label: lab(e), group: legendOf(e)}));
    }).catch((e) => ({error: String(e.message || e)}));
    const saveIn = async (scope) => {
        const resp = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\//.test(r.url()) && !/temporaryFiles/.test(r.url()), {timeout: T}).catch(() => null);
        await scope.getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await resp;
        const saved = await scope.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page);
        const errors = await scope.locator('.pkpFieldError').allInnerTexts().catch(() => []);
        return {status: r ? r.status() : null, url: r ? strip(r.url()).replace(/^.*\/index\.php/, '') : null, saved, errors};
    };

    try {
        // ============================================================ controls: OJS, OPS
        if (!isOMP && on('extra')) await sect('extra', async () => {
            const Y = `${tag('u68k4')}y`;
            await post('scenarios/context', {tag: Y, context: {name: {en: `K4 French control ${Y}`}, supportedLocales: ['en', 'fr_CA']}, categories: [{path: 'arts', title: 'Arts'}],
                plugins: {browseblockplugin: {enabled: true}}, sidebar: ['browseblockplugin'], users: [{username: `${Y}mg`, roles: ['manager']}]});
            const o = {};
            for (const lc of ['fr_CA', 'en']) { const r = await read(`x-01-${lc}-home-block`, cu(Y, '', lc)); o[lc] = {block: r.block && r.block.text, codes: r.codes}; }
            fact('extra', o);
        });
        if (!isOMP) {
            if (!on('controls')) return;
            await sect('controls', async () => {
                const out = {};
                const t = tag('u68k4');
                const X = `${t}x`;
                const isOJS = app.name === 'ojs';
                await post('scenarios/context', {tag: X, context: {name: {en: `K4 control ${X}`}}, categories: [{path: 'arts', title: 'Arts'}], itemsPerPage: 1,
                    plugins: {browseblockplugin: {enabled: true}}, sidebar: ['browseblockplugin'],
                    users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}],
                    ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {})});
                for (const [i, ti] of [[1, 'K4X Item One'], [2, 'K4X Item Two']]) {
                    await post('scenarios/submission', {tag: `${X}s${i}`, context: X, submitter: `${X}au`, title: ti, submitted: true, published: true, categories: ['arts'], ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
                    await sleep(1100);
                }
                note(`ccK4 [${app.name}] control: context ${X} (IPP 1, category arts with two items, Browse block placed)`);
                const CAT = isOJS ? 'catalog' : 'preprints';
                out.home = brief(await read('ctl-01-home', cu(X)));
                const c0 = await read('ctl-02-category-arts-before-jobs', cu(X, `/${CAT}/category/arts`));
                out.catBeforeJobs = {h2: c0.h2, items: c0.otherItems, text: flat(c0.mainText, 300)};
                out.jobs = drainJobs(app);
                const c1 = await read('ctl-02b-category-arts', cu(X, `/${CAT}/category/arts`));
                out.cat = {...brief(c1), items: c1.otherItems, text: flat(c1.mainText, 400)};
                const c2 = await read('ctl-02c-category-arts-page2', cu(X, `/${CAT}/category/arts/2`));
                out.cat2 = {...brief(c2), items: c2.otherItems, text: flat(c2.mainText, 400)};
                await asMgr(X);
                await openTab(X, 'plugins');
                out.row = await readRow();
                await snap(page, 'ctl-03-plugins-browse-row', {row: out.row});
                const panel = await openTab(X, 'appearance', 'appearance-setup');
                await panel.locator('input[name="sidebar"]').first().waitFor({timeout: T}).catch(() => {});
                out.setup = await setupBoxes(panel);
                await snap(page, 'ctl-04-appearance-setup');
                await signOut(page).catch(() => {});
                // publicknowledge's category page in French (A8's raw codes: control)
                out.pkCatFr = brief(await read('ctl-05-pk-category-fr', cu(app.contextPath, `/${CAT}/category/applied-science`, 'fr_CA')));
                out.pkCatEn = brief(await read('ctl-06-pk-category-en', cu(app.contextPath, `/${CAT}/category/applied-science`, 'en')));
                fact('controls', out);
            });
            return;
        }

        // ============================================================ seed (OMP)
        if (on('seed') && !S.seeded) {
            const t = tag('u68k4');
            const U = (P, extra = []) => [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}, ...extra];
            const book = async (P, key, title, extra) => { const r = await post('scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, submitted: true, published: true, ...extra}); await sleep(1100); return r.submissionId; };
            S.B = {P: `${t}b`}; S.I = {P: `${t}i`}; S.N = {P: `${t}n`}; S.M = {P: `${t}m`}; S.C = {P: `${t}c`}; S.PG = {P: `${t}p`}; S.F = {P: `${t}f`};
            // B: the block (placed on screen in "setup")
            await post('scenarios/context', {tag: S.B.P, context: {name: {en: `K4 Press B ${S.B.P}`}}, series: [{path: 'alpha', title: 'Alpha'}, {path: 'gamma', title: 'Gamma'}, {path: 'delta', title: 'Delta'}],
                categories: [{path: 'cat1', title: 'Cat One'}], users: U(S.B.P, [{username: `${S.B.P}rd`, roles: ['reader']}])});
            S.B.ids = {
                alpha: await book(S.B.P, 'b1', 'K4B Alpha Book', {series: 'alpha', datePublished: '2024-01-10', featured: [{in: 'catalog'}]}),
                bravo: await book(S.B.P, 'b2', 'K4B Bravo Book', {categories: ['cat1'], datePublished: '2024-02-10', newRelease: [{in: 'catalog'}]}),
            };
            save();
            // I: the only series inactive (ticked on screen in "lone")
            await post('scenarios/context', {tag: S.I.P, context: {name: {en: `K4 Press I ${S.I.P}`}}, series: [{path: 'solo', title: 'Solo'}], sidebar: ['browseblockplugin'], users: U(S.I.P)});
            // N: empty, French, block placed, home lists ticked
            await post('scenarios/context', {tag: S.N.P, context: {name: {en: `K4 Press N ${S.N.P}`}, supportedLocales: ['en', 'fr_CA']}, sidebar: ['browseblockplugin'],
                displayFeaturedBooks: true, displayNewReleases: true, users: U(S.N.P)});
            // M: menu items
            await post('scenarios/context', {tag: S.M.P, context: {name: {en: `K4 Press M ${S.M.P}`}}, series: [{path: 'alpha', title: 'Alpha'}, {path: 'beta', title: 'Beta'}], users: U(S.M.P)});
            S.M.ids = {m1: await book(S.M.P, 'b1', 'K4M Alpha Book', {series: 'alpha', datePublished: '2024-01-10', newRelease: [{in: 'catalog'}]})};
            save();
            // C: a category's flags beside the catalog's and a series'
            await post('scenarios/context', {tag: S.C.P, context: {name: {en: `K4 Press C ${S.C.P}`}}, categories: [{path: 'arts', title: 'Arts'}], series: [{path: 'hist', title: 'History'}],
                sidebar: ['browseblockplugin'], users: U(S.C.P)});
            S.C.ids = {
                alpha: await book(S.C.P, 'b1', 'K4C Alpha', {categories: ['arts'], datePublished: '2024-01-10', featured: [{in: 'category', path: 'arts'}]}),
                bravo: await book(S.C.P, 'b2', 'K4C Bravo', {categories: ['arts'], datePublished: '2024-02-10', newRelease: [{in: 'category', path: 'arts'}]}),
                charlie: await book(S.C.P, 'b3', 'K4C Charlie', {categories: ['arts'], datePublished: '2024-03-10'}),
                echo: await book(S.C.P, 'b4', 'K4C Echo', {categories: ['arts'], series: 'hist', datePublished: '2024-04-10', featured: [{in: 'series', path: 'hist'}]}),
                fox: await book(S.C.P, 'b5', 'K4C Foxtrot', {series: 'hist', datePublished: '2024-05-10', featured: [{in: 'catalog'}], newRelease: [{in: 'catalog'}, {in: 'series', path: 'hist'}]}),
                golf: await book(S.C.P, 'b6', 'K4C Golf', {categories: ['arts'], datePublished: '2024-06-10', featured: [{in: 'catalog'}]}),
            };
            save();
            // P: a category's paging (Items per page 2, three books)
            await post('scenarios/context', {tag: S.PG.P, context: {name: {en: `K4 Press P ${S.PG.P}`}}, categories: [{path: 'arts', title: 'Arts'}], itemsPerPage: 2, users: U(S.PG.P)});
            S.PG.ids = {};
            for (const [i, d] of [[1, '2024-01-10'], [2, '2024-02-10'], [3, '2024-03-10']]) S.PG.ids[`p${i}`] = await book(S.PG.P, `b${i}`, `K4P Paged ${i}`, {categories: ['arts'], datePublished: d});
            save();
            // F: French
            await post('scenarios/context', {tag: S.F.P, context: {name: {en: `K4 Press F ${S.F.P}`}, supportedLocales: ['en', 'fr_CA']}, series: [{path: 'hist', title: 'History'}, {path: 'empty', title: 'Empty'}],
                categories: [{path: 'arts', title: 'Arts'}], sidebar: ['browseblockplugin'], displayFeaturedBooks: true, displayNewReleases: true, itemsPerPage: 1,
                themeOptions: {showCatalogSeriesListing: true}, users: U(S.F.P)});
            S.F.ids = {
                alpha: await book(S.F.P, 'b1', 'K4F Alpha', {series: 'hist', categories: ['arts'], datePublished: '2024-01-10', featured: [{in: 'catalog'}]}),
                bravo: await book(S.F.P, 'b2', 'K4F Bravo', {series: 'hist', datePublished: '2024-02-10', featured: [{in: 'series', path: 'hist'}], newRelease: [{in: 'catalog'}, {in: 'series', path: 'hist'}]}),
            };
            const c0 = await read('seed-arts-before-jobs', cu(S.C.P, '/catalog/category/arts'));
            const k0 = await read('seed-catalog-before-jobs', cu(S.C.P, '/catalog'));
            S.beforeJobs = {arts: {count: c0.count, lists: c0.lists.map((l) => l.items.length)}, catalog: {count: k0.count, lists: k0.lists.map((l) => l.items.length)}};
            S.jobs = drainJobs(app);
            S.seeded = true; save();
            note(`ccK4 [omp] seed: presses ${['B', 'I', 'N', 'M', 'C', 'PG', 'F'].map((k) => `${k} ${S[k].P}`).join(', ')}; ids ${JSON.stringify({B: S.B.ids, M: S.M.ids, C: S.C.ids, PG: S.PG.ids, F: S.F.ids})}`);
            fact('seed', S);
        }
        if (!S.seeded) { log('no state: run PHASES=seed first'); return; }
        const {SectionsTab, ConfirmWindow} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
        const B = S.B.P;

        // ============================================================ setup: Settings 5 and 6 through the screen (B)
        if (on('setup')) await sect('setup', async () => {
            const out = {};
            out.homeBefore = brief(await read('s-01-home-before', cu(B)));
            await asMgr(B);
            let panel = await openTab(B, 'appearance', 'appearance-setup');
            await panel.locator('input[name="sidebar"]').first().waitFor({timeout: T}).catch(() => {});
            out.boxes0 = await setupBoxes(panel);
            out.panelText0 = flat(await panel.innerText().catch(() => ''), 2500);
            await snap(page, 's-02-setup-as-opened');
            await loc(page, 'Appearance › Setup: "Sidebar" "Browse Block" box', panel.locator('input[name="sidebar"][value="browseblockplugin"]'));
            await loc(page, 'Appearance › Setup: "Featured Books" box', panel.locator('input[name="displayFeaturedBooks"]'));
            await loc(page, 'Appearance › Setup: "New Releases" box', panel.locator('input[name="displayNewReleases"]'));
            // ticked and left unsaved: side tab, top tab, another page
            const tick = async () => { for (const s of ['input[name="sidebar"][value="browseblockplugin"]', 'input[name="displayFeaturedBooks"]', 'input[name="displayNewReleases"]']) await panel.locator(s).first().setChecked(true); await sleep(300); };
            await tick();
            const d0 = jsDialogs.length;
            await page.locator('#appearance-advanced-button').first().click().catch(() => {}); await idle(page); await sleep(400);
            await page.locator('#appearance-setup-button').first().click().catch(() => {}); await idle(page); await sleep(400);
            out.unsavedAfterSideTab = await setupBoxes(panel);
            await page.locator('#setup-button').first().click().catch(() => {}); await idle(page); await sleep(400);
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page); await sleep(400);
            out.unsavedAfterTopTab = (await setupBoxes(panel)).filter((b) => /sidebar|display/.test(b.name));
            await snap(page, 's-03-setup-unsaved-back');
            await page.goto(cu(B, '/dashboard/editorial')).catch(() => {}); await idle(page);
            out.leaveDialogs = jsDialogs.slice(d0);
            panel = await openTab(B, 'appearance', 'appearance-setup');
            await panel.locator('input[name="sidebar"]').first().waitFor({timeout: T}).catch(() => {});
            out.afterLeave = (await setupBoxes(panel)).filter((b) => /sidebar|display/.test(b.name));
            await snap(page, 's-04-setup-after-leave', {afterLeave: out.afterLeave, dialogs: out.leaveDialogs});
            // ticked and saved; read on the page, then after a reload
            await tick();
            out.save = await saveIn(panel);
            out.afterSave = (await setupBoxes(panel)).filter((b) => /sidebar|display/.test(b.name));
            await snap(page, 's-05-setup-saved', {save: out.save});
            await page.reload(); await idle(page);
            panel = await openTab(B, 'appearance', 'appearance-setup');
            await panel.locator('input[name="sidebar"]').first().waitFor({timeout: T}).catch(() => {});
            out.afterReload = (await setupBoxes(panel)).filter((b) => /sidebar|display/.test(b.name));
            await snap(page, 's-06-setup-after-reload');
            // the plugin row and the block's settings location
            await openTab(B, 'plugins');
            out.row = await readRow();
            await snap(page, 's-07-plugins-browse-row', {row: out.row});
            await signOut(page).catch(() => {});
            fact('setup', out);
        });

        // ============================================================ pages: B as a visitor, the reader and the manager
        if (on('pages')) await sect('pages', async () => {
            const out = {};
            const home = await read('p-01-home-visitor', cu(B));
            out.home = brief(home);
            out.homeLists = home.lists;
            await loc(vis, 'Home: "Featured" list heading', vis.locator('.cmp_monographs_list > .title', {hasText: 'Featured'}));
            await loc(vis, 'Home: "New Releases" list heading', vis.locator('.cmp_monographs_list > .title', {hasText: 'New Releases'}));
            await loc(vis, 'Sidebar: the "Browse" block', vis.locator('.block_browse'));
            await loc(vis, 'Browse block: "New Releases" link', vis.locator('.block_browse').getByRole('link', {name: 'New Releases', exact: true}));
            await loc(vis, 'Browse block: series links', vis.locator('.block_browse li[class^="series_"] a'));
            // every public page carries the block
            const pages = [['catalog', '/catalog'], ['newReleases', '/catalog/newReleases'], ['seriesGamma', '/catalog/series/gamma'], ['category', '/catalog/category/cat1'],
                ['book', `/catalog/book/${S.B.ids.alpha}`], ['about', '/about'], ['search', '/search'], ['announcements', '/announcement'], ['login', '/login'], ['notfound', '/catalog/series/nosuch']];
            out.pages = {};
            for (const [k, p] of pages) { const o = await read(`p-02-${k}`, cu(B, p)); out.pages[k] = {status: o.status, h1: o.h1, block: bl(o), blocks: o.sidebarBlocks, fails: o.fails}; }
            // pressing the block's links
            await vis.goto(cu(B)); await idle(vis);
            await vis.locator('.block_browse').getByRole('link', {name: 'New Releases', exact: true}).click(); await idle(vis);
            out.pressNewReleases = {url: strip(vis.url()), h1: flat(await vis.locator('.pkp_structure_main h1').first().innerText().catch(() => null), 100)};
            await snap(vis, 'p-03-pressed-new-releases');
            await vis.goto(cu(B)); await idle(vis);
            await vis.locator('.block_browse li[class^="series_"] a').first().click(); await idle(vis);
            out.pressFirstSeries = {url: strip(vis.url()), h1: flat(await vis.locator('.pkp_structure_main h1').first().innerText().catch(() => null), 100)};
            await snap(vis, 'p-04-pressed-first-series');
            // signed in: the press's reader and manager see the same block and lists
            for (const who of ['rd', 'mg']) {
                await signIn(vis, `${B}${who}`, {contextPath: B}); await idle(vis).catch(() => {});
                const h = await read(`p-05-home-${who}`, cu(B));
                out[`home_${who}`] = brief(h);
                await signOut(vis).catch(() => {});
            }
            fact('pages', out);
        });

        // ============================================================ series: inactive, prefix, marked link, order (B)
        if (on('series')) await sect('series', async () => {
            const out = {};
            out.before = bl(await read('r-01-catalog-before', cu(B, '/catalog')));
            await asMgr(B);
            const tab = new SectionsTab(page, B, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            out.grid0 = (await tab.titleCells().allInnerTexts()).map((x) => flat(x, 40));
            await snap(page, 'r-02-series-tab');
            // Delta inactive (the row's box), Alpha's prefix (the window)
            const cw = await tab.pressInactive('Delta');
            out.inactiveQuestion = flat(await cw.question().innerText().catch(() => null), 300);
            out.inactiveAnswer = (await tab.confirm(cw)).status();
            await tab.goto();
            const win = await tab.openEdit('Alpha');
            out.prefixBox = await win.box('prefix[en]').count();
            await win.type('prefix[en]', 'The');
            out.prefixSave = (await win.save()).status();
            await sleep(1200);
            await tab.goto();
            out.grid1 = (await tab.titleCells().allInnerTexts()).map((x) => flat(x, 40));
            out.inactiveBoxes = await tab.rows().evaluateAll((trs) => trs.map((tr) => ({t: (tr.querySelector('[id$="-title"]') || {}).innerText, inactive: (tr.querySelector('input[type=checkbox]') || {}).checked})));
            await snap(page, 'r-03-series-tab-after');
            const cat = await read('r-04-catalog-after', cu(B, '/catalog'));
            out.after = bl(cat);
            out.afterSeriesLine = cat.catalogSeries;
            // Delta's page and the catalog's "Series:" still offer it?
            const dp = await read('r-05-delta-page', cu(B, '/catalog/series/delta'));
            out.deltaPage = {status: dp.status, h1: dp.h1, count: dp.count, block: bl(dp)};
            // the marked link on a series' page
            const ap = await read('r-06-alpha-page', cu(B, '/catalog/series/alpha'));
            out.alphaPage = {status: ap.status, h1: ap.h1, block: bl(ap), sub: ap.block && ap.block.lines.flatMap((l) => l.sub)};
            await loc(vis, 'Browse block: the marked series link (li.current)', vis.locator('.block_browse li.current > a'));
            const gp = await read('r-07-gamma-page', cu(B, '/catalog/series/gamma'));
            out.gammaPage = {status: gp.status, count: gp.count, block: bl(gp)};
            await vis.locator('.block_browse li.current').first().screenshot({path: path.join(outDir(), `r-08-marked-link-crop-${app.name}.png`)}).catch(() => {});
            // the other end of the order: Gamma moved above Alpha
            await tab.goto();
            await tab.startOrdering();
            const first = (await tab.titleCells().allInnerTexts()).map((x) => flat(x, 40));
            const top = first[0];
            const last = first.filter((x) => x !== 'Delta').slice(-1)[0];
            await tab.drag(last, top);
            out.orderDone = (await tab.done()).status();
            await tab.goto();
            out.grid2 = (await tab.titleCells().allInnerTexts()).map((x) => flat(x, 40));
            await snap(page, 'r-09-series-tab-ordered');
            out.ordered = bl(await read('r-10-catalog-ordered', cu(B, '/catalog')));
            await signOut(page).catch(() => {});
            fact('series', out);
        });

        // ============================================================ blockset: the block's "Settings" (B)
        if (on('blockset')) await sect('blockset', async () => {
            const out = {};
            await asMgr(B);
            const openSettings = async () => {
                await openTab(B, 'plugins');
                const row = pluginRow();
                await row.locator('a.show_extras').click(); await sleep(700);
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Settings', exact: true}).click();
                await sleep(1200); await idle(page);
                const w = page.locator('[role=dialog]:visible').last();
                await w.locator('input[type=checkbox]').first().waitFor({timeout: T});
                await sleep(500);
                return w;
            };
            const boxes = (w) => w.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null})));
            const cancel = async (w) => { await w.getByRole('link', {name: 'Cancel'}).or(w.getByRole('button', {name: 'Cancel'})).first().click().catch(() => {}); await sleep(900); };
            const submit = async (w) => {
                const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await resp;
                await sleep(1200); await idle(page);
                const toast = (await page.locator('.pkp_notification, .pkpNotification, [class*="toast"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
                return {status: r ? r.status() : null, windowOpen: await w.isVisible().catch(() => false), toast};
            };
            let w = await openSettings();
            out.window = {heading: flat(await w.locator('h1, h2, .pkp_modal_title').first().innerText().catch(() => null), 100), text: flat(await w.innerText().catch(() => ''), 800), boxes: await boxes(w)};
            await snap(page, 'b-01-settings-window', {window: out.window});
            await loc(page, 'Browse Block settings: "New releases" box', w.getByRole('checkbox', {name: 'New releases', exact: true}));
            await loc(page, 'Browse Block settings: "Series" box', w.getByRole('checkbox', {name: 'Series', exact: true}));
            // sweep: a change left by "Cancel"
            await w.getByRole('checkbox', {name: 'Series', exact: true}).setChecked(false);
            const d0 = jsDialogs.length;
            await cancel(w);
            out.cancelDialogs = jsDialogs.slice(d0);
            out.cancelWindowOpen = await w.isVisible().catch(() => false);
            w = await openSettings();
            out.afterCancel = await boxes(w);
            // "New releases" off
            await w.getByRole('checkbox', {name: 'New releases', exact: true}).setChecked(false);
            out.saveNrOff = await submit(w);
            await snap(page, 'b-02-saved-newreleases-off', {save: out.saveNrOff});
            w = await openSettings(); out.reopenNrOff = await boxes(w); await cancel(w);
            out.homeNrOff = bl(await read('b-03-home-newreleases-off', cu(B)));
            await vis.reload(); await idle(vis);
            out.homeNrOffReload = bl({block: await vis.evaluate(PAGE).then((d) => d.block)});
            // "New releases" on, "Series" off
            w = await openSettings();
            await w.getByRole('checkbox', {name: 'New releases', exact: true}).setChecked(true);
            await w.getByRole('checkbox', {name: 'Series', exact: true}).setChecked(false);
            out.saveSeriesOff = await submit(w);
            w = await openSettings(); out.reopenSeriesOff = await boxes(w); await cancel(w);
            out.homeSeriesOff = bl(await read('b-04-home-series-off', cu(B)));
            out.alphaSeriesOff = bl(await read('b-05-alpha-page-series-off', cu(B, '/catalog/series/alpha')));
            // back to all ticked
            w = await openSettings();
            for (const n of ['New releases', 'Categories', 'Series']) await w.getByRole('checkbox', {name: n, exact: true}).setChecked(true);
            out.saveAll = await submit(w);
            out.homeAll = bl(await read('b-06-home-all-on', cu(B)));
            await signOut(page).catch(() => {});
            fact('blockset', out);
        });

        // ============================================================ lone: I (only series inactive), N (no series)
        if (on('lone')) await sect('lone', async () => {
            const out = {};
            const I = S.I.P;
            out.iBefore = bl(await read('l-01-I-home-before', cu(I)));
            await asMgr(I);
            const tab = new SectionsTab(page, I, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            const cw = await tab.pressInactive('Solo');
            out.iInactive = (await tab.confirm(cw)).status();
            await signOut(page).catch(() => {});
            const ih = await read('l-02-I-home-after', cu(I));
            out.iAfter = {block: bl(ih), text: ih.block && ih.block.text};
            await loc(vis, 'Browse block: the "Series" line (li.has_submenu)', vis.locator('.block_browse li.has_submenu'));
            const nh = await read('l-03-N-home', cu(S.N.P, '', 'en'));
            out.n = {block: bl(nh), text: nh.block && nh.block.text, lists: nh.lists.map((l) => ({heading: l.heading, n: l.items.length})), paras: nh.paras};
            fact('lone', out);
        });

        // ============================================================ menu: items for "Catalog", "New Releases", "Series" (M)
        if (on('menu')) await sect('menu', async () => {
            const L = require('../../U08/K2/lib');
            const out = {};
            const M = S.M.P;
            await asMgr(M);
            await L.openNav(page, app, M);
            out.grids0 = await L.grids(page);
            await snap(page, 'm-01-navigation-tab');
            // the item window's types
            await L.openItemWindow(page, 'add');
            out.addWindow = await L.itemState(page);
            await L.setType(page, 'Series');
            out.seriesType = await L.itemState(page);
            await snap(page, 'm-02-item-window-series');
            await loc(page, 'Item window: the series list select[name="relatedSeriesId"]', L.itemWindow(page).locator('select[name="relatedSeriesId"]'));
            await L.closeItemWindow(page);
            await sleep(700);
            // add the three items
            const addSeriesItem = async (title, seriesLabel) => {
                await L.openItemWindow(page, 'add');
                await L.fillTitle(page, title);
                await L.setType(page, 'Series');
                await L.itemWindow(page).locator('select[name="relatedSeriesId"]').selectOption({label: seriesLabel});
                const r = await L.itemSave(page);
                if (r.windowOpen) await L.closeItemWindow(page);
                await sleep(700);
                return r;
            };
            out.addSeries = await addSeriesItem('K4 Series Alpha', 'Alpha');
            out.addNew = await L.addItem(page, 'K4 New Releases', 'New Releases'); await sleep(700);
            out.addCat = await L.addItem(page, 'K4 Catalog', 'Catalog'); await sleep(700);
            await L.openNav(page, app, M);
            out.grids1 = await L.grids(page);
            // place them in the Primary Navigation Menu
            await L.openMenu(page, 'Primary Navigation Menu');
            out.panels0 = L.brief(await L.panels(page));
            for (const ti of ['K4 Catalog', 'K4 New Releases', 'K4 Series Alpha']) out[`assign_${ti}`] = await L.assignTop(page, ti);
            out.panels1 = L.brief(await L.panels(page));
            await snap(page, 'm-03-menu-window-assigned');
            out.saveMenu = await L.saveMenu(page);
            // the visitor: the header and each item pressed
            const hdr = async (name) => { const o = await read(name, cu(M)); return o.primary; };
            out.header1 = await hdr('m-04-home-header');
            out.pressed = {};
            for (const ti of ['K4 Catalog', 'K4 New Releases', 'K4 Series Alpha', 'Catalog']) {
                await vis.goto(cu(M)); await idle(vis);
                const a = vis.locator('#navigationPrimary > li > a').filter({hasText: new RegExp(`^\\s*${ti}\\s*$`)}).first();
                if (!(await a.count())) { out.pressed[ti] = 'absent'; continue; }
                await a.click(); await idle(vis);
                out.pressed[ti] = {url: strip(vis.url()), h1: flat(await vis.locator('.pkp_structure_main h1').first().innerText().catch(() => null), 100), title: await vis.title()};
                await snap(vis, `m-05-pressed-${ti.replace(/\W+/g, '-')}`);
            }
            await loc(vis, 'Header: the "K4 Series Alpha" item', vis.locator('#navigationPrimary > li > a', {hasText: 'K4 Series Alpha'}));
            // Alpha's path changed
            const tab = new SectionsTab(page, M, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            let win = await tab.openEdit('Alpha');
            await win.box('path').fill('alpha2');
            out.pathSave = (await win.save()).status();
            await sleep(1200);
            out.headerPath = await hdr('m-06-home-after-path');
            out.alphaOld = brief(await read('m-07-old-path', cu(M, '/catalog/series/alpha')));
            // Alpha inactive
            await tab.goto();
            const cw = await tab.pressInactive('Alpha');
            out.inactive = (await tab.confirm(cw)).status();
            out.headerInactive = await hdr('m-08-home-after-inactive');
            // Beta's item, then Beta deleted
            await L.openNav(page, app, M);
            out.addBeta = await addSeriesItem('K4 Series Beta', 'Beta');
            await L.openNav(page, app, M);
            await L.openMenu(page, 'Primary Navigation Menu');
            out.assignBeta = await L.assignTop(page, 'K4 Series Beta');
            out.saveMenu2 = await L.saveMenu(page);
            out.headerBeta = await hdr('m-09-home-with-beta');
            await tab.goto();
            const dw = await tab.openDelete('Beta');
            out.deleteQuestion = flat(await dw.question().innerText().catch(() => null), 300);
            out.deleteBeta = (await tab.confirm(dw)).status();
            await tab.goto();
            out.gridAfterDelete = (await tab.titleCells().allInnerTexts()).map((x) => flat(x, 40));
            out.headerAfterDelete = await hdr('m-10-home-after-delete');
            // the Navigation tab after the delete (sweep): the item's row, its window, the menu window
            await L.openNav(page, app, M);
            out.grids2 = await L.grids(page);
            await snap(page, 'm-11-navigation-after-delete');
            await L.openItemWindow(page, 'edit', 'K4 Series Beta').catch((e) => { out.betaEditError = flat(e.message, 200); });
            out.betaItemWindow = await L.itemState(page).catch(() => null);
            await snap(page, 'm-12-beta-item-window');
            await L.closeItemWindow(page).catch(() => {});
            await L.openNav(page, app, M);
            await L.openMenu(page, 'Primary Navigation Menu');
            out.panels2 = L.brief(await L.panels(page));
            await snap(page, 'm-13-menu-window-after-delete');
            await signOut(page).catch(() => {});
            fact('menu', out);
        });

        // ============================================================ cat: the category page (C, P) and OMP5 (publicknowledge)
        if (on('cat')) await sect('cat', async () => {
            const out = {};
            const C = S.C.P;
            // OMP5 first: publicknowledge, signed out: home, "Catalog", then a category page from the address, and again
            const pk = app.contextPath;
            const f0 = fails.length;
            out.omp5 = {};
            await read('c-00-pk-home', cu(pk));
            await vis.getByRole('link', {name: 'Catalog', exact: true}).first().click().catch(() => {}); await idle(vis).catch(() => {});
            out.omp5.catalog = {url: strip(vis.url())};
            for (const n of [1, 2]) {
                const o = await read(`c-01-pk-category-${n}`, cu(pk, '/catalog/category/applied-science'));
                out.omp5[`open${n}`] = {status: o.status, h1: o.h1, count: o.count, err: o.err, evalError: o.evalError, fails: o.fails, serverLog: o.serverLog};
            }
            out.omp5.fails = fails.slice(f0);
            // C as a visitor: the category, the catalog, the series
            const cat = await read('c-02-arts', cu(C, '/catalog/category/arts'));
            out.arts = brief(cat);
            out.artsDetail = cat.lists;
            await loc(vis, 'Category page: book summaries', vis.locator('.obj_monograph_summary'));
            await loc(vis, 'Category page: a "New Releases" heading', vis.locator('.cmp_monographs_list > .title', {hasText: 'New Releases'}));
            out.catalog = brief(await read('c-03-catalog', cu(C, '/catalog')));
            out.hist = brief(await read('c-04-series-hist', cu(C, '/catalog/series/hist')));
            out.artsAgain = brief(await read('c-05-arts-again', cu(C, '/catalog/category/arts')));
            // the Catalog page (staff): the category filter's flag boxes
            await asMgr(C);
            await page.goto(cu(C, '/manageCatalog')); await idle(page);
            await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
            await page.getByRole('button', {name: 'Filters', exact: true}).click().catch(() => {});
            await sleep(600);
            const f = page.locator('button.pkpFilter__label').filter({hasText: /^\s*Arts\s*$/}).first();
            const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
            await f.click().catch(() => {});
            await got; await idle(page); await sleep(800);
            out.manage = await page.locator('.listPanel__item--catalog').evaluateAll((els) => els.map((e) => ({
                title: ((e.querySelector('.listPanel__itemSubtitle') || {}).innerText || '').trim(),
                buttons: [...e.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.title || b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
                text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
            })));
            out.manageHead = flat(await page.locator('.listPanel__header, .pkpHeader').first().innerText().catch(() => null), 300);
            await snap(page, 'c-06-manage-catalog-arts');
            await signOut(page).catch(() => {});
            // P: paging (Items per page 2, three books), and the typed second page
            const PG = S.PG.P;
            out.paged1 = brief(await read('c-07-paged-arts', cu(PG, '/catalog/category/arts')));
            out.paged2 = brief(await read('c-08-paged-arts-2', cu(PG, '/catalog/category/arts/2')));
            out.pagedQ = brief(await read('c-09-paged-arts-q', cu(PG, '/catalog/category/arts?submissionsPage=2')));
            out.pagedCatalog = brief(await read('c-10-paged-catalog', cu(PG, '/catalog')));
            fact('cat', out);
        });

        // ============================================================ french: publicknowledge, F and N in French and English
        if (on('french')) await sect('french', async () => {
            const out = {};
            const F = S.F.P, N = S.N.P;
            // F's series ISSNs through the series window
            await asMgr(F);
            const tab = new SectionsTab(page, F, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            const win = await tab.openEdit('History');
            await win.box('onlineIssn').fill('0378-5955');
            await win.box('printIssn').fill('2049-3630');
            out.issnSave = (await win.save()).status();
            await sleep(1200);
            await signOut(page).catch(() => {});
            const pk = app.contextPath;
            const rows = [
                ['pk-catalog', pk, '/catalog'], ['pk-series', pk, '/catalog/series/monographs'], ['pk-newreleases', pk, '/catalog/newReleases'], ['pk-home', pk, ''],
                ['F-home', F, ''], ['F-catalog', F, '/catalog'], ['F-catalog-2', F, '/catalog/page/2'], ['F-series-hist', F, '/catalog/series/hist'], ['F-series-empty', F, '/catalog/series/empty'],
                ['F-newreleases', F, '/catalog/newReleases'], ['F-category', F, '/catalog/category/arts'],
                ['N-home', N, ''], ['N-catalog', N, '/catalog'], ['N-newreleases', N, '/catalog/newReleases'],
            ];
            for (const lc of ['fr_CA', 'en']) {
                for (const [k, P, p] of rows) {
                    const o = await read(`f-${lc}-${k}`, cu(P, p, lc));
                    out[`${lc}:${k}`] = {status: o.status, lang: o.lang, docTitle: o.docTitle, h1: o.h1, h2: o.h2, crumbs: o.crumbs && o.crumbs.join(' / '), count: o.count, lists: o.lists && o.lists.map((l) => `${l.heading || '(none)'}: ${l.items.length}`),
                        paras: o.paras, pagination: o.pagination && o.pagination.text, catalogSeries: o.catalogSeries, issn: o.issn, block: o.block && o.block.text, codes: o.codes, fails: o.fails};
                }
            }
            fact('french', out);
        });

        // ============================================================ french2: the catalog's "Series:" in French; an inactive series there (F)
        if (on('french2')) await sect('french2', async () => {
            const out = {};
            const F = S.F.P;
            if (!S.F.ids.charlie) { S.F.ids.charlie = (await post('scenarios/submission', {tag: `${F}b3`, context: F, submitter: `${F}au`, title: 'K4F Charlie', submitted: true, published: true, series: 'empty', datePublished: '2024-03-10'})).submissionId; save(); }
            const nav = async () => vis.evaluate(() => { const n = document.querySelector('.pkp_series_nav_menu'); return n ? {aria: n.getAttribute('aria-label'), h2: (n.querySelector('h2') || {}).innerText, links: [...n.querySelectorAll('a')].map((a) => a.innerText.trim())} : null; });
            for (const lc of ['fr_CA', 'en']) {
                const o = await read(`g-01-${lc}-F-catalog-two-series`, cu(F, '/catalog', lc));
                out[lc] = {count: o.count, nav: await nav(), block: o.block && o.block.text, codes: o.codes};
            }
            await loc(vis, 'Catalog page: the "Series:" list (nav.pkp_series_nav_menu)', vis.locator('nav.pkp_series_nav_menu'));
            await asMgr(F);
            const tab = new SectionsTab(page, F, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            const cw = await tab.pressInactive('Empty');
            out.inactive = (await tab.confirm(cw)).status();
            await signOut(page).catch(() => {});
            const o2 = await read('g-02-en-F-catalog-empty-inactive', cu(F, '/catalog', 'en'));
            out.afterInactive = {nav: await nav(), block: bl(o2)};
            const o3 = await read('g-03-en-F-series-empty-inactive', cu(F, '/catalog/series/empty', 'en'));
            out.emptyPage = {status: o3.status, count: o3.count, block: bl(o3)};
            fact('french2', out);
        });

        // ============================================================ again: second runs on fresh presses
        if (on('again')) await sect('again', async () => {
            const L = require('../../U08/K2/lib');
            const out = {};
            if (!S.A2) {
                const t = tag('u68k4');
                S.A2 = {P: `${t}j`}; S.A3 = {P: `${t}k`};
                await post('scenarios/context', {tag: S.A2.P, context: {name: {en: `K4 Press J ${S.A2.P}`}}, series: [{path: 'only', title: 'Only'}], categories: [{path: 'c1', title: 'Cat J'}], sidebar: ['browseblockplugin'],
                    users: [{username: `${S.A2.P}mg`, roles: ['manager']}]});
                await post('scenarios/context', {tag: S.A3.P, context: {name: {en: `K4 Press K ${S.A3.P}`}}, series: [{path: 'keep', title: 'Keep'}, {path: 'gone', title: 'Gone'}],
                    users: [{username: `${S.A3.P}mg`, roles: ['manager']}]});
                save();
            }
            // J: the only series made inactive through its window's box
            const J = S.A2.P;
            out.jBefore = bl(await read('a-01-J-home-before', cu(J)));
            await asMgr(J);
            const tab = new SectionsTab(page, J, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            const win = await tab.openEdit('Only');
            await win.form().getByRole('checkbox', {name: /Mark this series as inactive/}).check();
            out.jSave = (await win.save()).status();
            await sleep(1200);
            await signOut(page).catch(() => {});
            const jh = await read('a-02-J-home-after', cu(J));
            out.jAfter = {block: bl(jh), text: jh.block && jh.block.text};
            // N in French again
            const nh = await read('a-03-N-home-fr', cu(S.N.P, '', 'fr_CA'));
            out.nFr = nh.block && nh.block.text;
            // K: a "Series" item for "Gone", then "Gone" deleted
            const K = S.A3.P;
            await asMgr(K);
            await L.openNav(page, app, K);
            await L.openItemWindow(page, 'add');
            await L.fillTitle(page, 'K4 Gone Item');
            await L.setType(page, 'Series');
            await L.itemWindow(page).locator('select[name="relatedSeriesId"]').selectOption({label: 'Gone'});
            out.kAdd = await L.itemSave(page);
            await L.openNav(page, app, K);
            await L.openMenu(page, 'Primary Navigation Menu');
            out.kAssign = await L.assignTop(page, 'K4 Gone Item');
            out.kSaveMenu = await L.saveMenu(page);
            out.kHeader1 = (await read('a-04-K-home', cu(K))).primary;
            const kt = new SectionsTab(page, K, {tab: 'Series', addLabel: 'Add Series'});
            await kt.goto();
            const dw = await kt.openDelete('Gone');
            out.kDelete = (await kt.confirm(dw)).status();
            out.kHeader2 = (await read('a-05-K-home-after-delete', cu(K))).primary;
            await L.openNav(page, app, K);
            out.kGrids = await L.grids(page);
            await L.openItemWindow(page, 'edit', 'K4 Gone Item');
            out.kItem = await L.itemWindow(page).evaluate((w) => {
                const sel = w.querySelector('select[name="relatedSeriesId"]');
                return {type: (w.querySelector('select[name="menuItemType"]') || {}).value, series: sel ? {selected: sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text, options: [...sel.options].map((o) => o.text)} : null,
                    text: w.innerText.replace(/\s+/g, ' ').trim().replace(/^.*?Close /, '').slice(0, 600)};
            });
            await snap(page, 'a-06-K-orphan-item-window');
            await L.closeItemWindow(page).catch(() => {});
            await L.openNav(page, app, K);
            await L.openMenu(page, 'Primary Navigation Menu');
            out.kPanels = L.brief(await L.panels(page));
            await snap(page, 'a-07-K-menu-window-after-delete');
            await signOut(page).catch(() => {});
            fact('again', out);
        });

        if (on('extra')) await sect('extra', async () => {
            if (!S.Q) {
                S.Q = {P: `${tag('u68k4')}q`};
                await post('scenarios/context', {tag: S.Q.P, context: {name: {en: `K4 Press Q ${S.Q.P}`}}, series: [{path: 'one', title: 'One'}, {path: 'two', title: 'Two'}],
                    themeOptions: {showCatalogSeriesListing: true}, users: [{username: `${S.Q.P}au`, roles: ['author']}]});
                S.Q.id = (await post('scenarios/submission', {tag: `${S.Q.P}b1`, context: S.Q.P, submitter: `${S.Q.P}au`, title: 'K4Q One Book', submitted: true, published: true, series: 'one', datePublished: '2024-01-10'})).submissionId;
                save();
            }
            const q1 = await read('x-02-Q-catalog-one-series-with-book', cu(S.Q.P, '/catalog'));
            const nav1 = await vis.evaluate(() => { const n = document.querySelector('.pkp_series_nav_menu'); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; });
            if (!S.Q.id2) { S.Q.id2 = (await post('scenarios/submission', {tag: `${S.Q.P}b2`, context: S.Q.P, submitter: `${S.Q.P}au`, title: 'K4Q Two Book', submitted: true, published: true, series: 'two', datePublished: '2024-02-10'})).submissionId; save(); }
            await read('x-03-Q-catalog-two-series-with-books', cu(S.Q.P, '/catalog'));
            const nav2 = await vis.evaluate(() => { const n = document.querySelector('.pkp_series_nav_menu'); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; });
            fact('extra', {oneSeriesWithBook: {count: q1.count, nav: nav1}, twoSeriesWithBooks: nav2});
        });
        if (on('recheck')) await sect('recheck', async () => {
            const cat = await read('h-01-C-catalog-recheck', cu(S.C.P, '/catalog'));
            const his = await read('h-02-C-series-recheck', cu(S.C.P, '/catalog/series/hist'));
            fact('recheck', {catalog: brief(cat), hist: brief(his)});
        });
    } finally {
        fact('fails', fails);
        fact('jsDialogs', jsDialogs);
        await mg.close().catch(() => {});
        await vs.close().catch(() => {});
    }
});
