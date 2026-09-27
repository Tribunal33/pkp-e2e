// U68 claim check K3: a series' page and the "New Releases" page (spec fields 68–94, Rules 7–10,
// Settings 2 and 12, register A3, A4, A5; footnotes e, f, h, td5, td6, f-a3, f-a4, f-a5).
//
//   PROBE_FEATURE=U68 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U68/K3/k3.js
//   OMP outlasts 600 s: run it detached (patterns.md "Probe kit"). PHASES=a,b picks phases (default all, in order);
//   the seeded presses are kept in k3-state-omp.json under the output folder (delete it for a fresh seed).
//
// Phases:
//   controls  OJS, OPS: a visitor types publicknowledge's series and "New Releases" addresses (multi-app rule 4)
//   seed      OMP: presses A (Items per page 25, "Show Series", "Browse" block placed), B (Items per page 1), C (bare)
//   read      A as a visitor: series "hist" (featured Zulu, new releases Alpha + Mike, a draft), "empty", "closed";
//             the catalog's "Series:" line and the "Browse" block; the same pages as the press's reader and manager
//   window    A as manager: the "Add Series" window as it opens (order, inactive box) left by "Cancel" with a change;
//             hist's Online/Print ISSN and a cover saved, reopened after a reload; the visitor's page; the full size typed;
//             hist's order set to "Publication date (oldest first)"; "closed" ticked inactive; the visitor's pages again
//   catpic    A as manager: a category's "Cover Image"; the visitor's category page picture (A4's "a category's picture")
//   paging    B as a visitor: series hist pages 1, 2, 3 and 99 through "Next"; the empty series; the "New Releases" page
//   unpub     B as manager: Mike (new release, new release in series) unpublished; the visitor's pages
//   untick    B as manager: "New release" unticked on the Catalog page for the remaining books; the visitor's page, reloaded
//   newpress  C: a new press's home, catalog and header: any link to "New Releases"; its "New Releases" page
//   featord   D (seeded in the phase): two books featured in series hist at positions 1 (Alpha, oldest) and 2 (Mike,
//             newest), Zulu not featured, Yank scheduled (2099); the visitor's series page
//   featord2  E (seeded in the phase): the same books with Mike moved to position 1 after Alpha (Mike, then Alpha)
//
// Books (A and B, series hist): Alpha 2024-01-10, Mike 2024-03-10, Zulu 2024-02-10; "Featured in series" Zulu,
// "New release in series" Alpha and Mike. B also: "New release" (catalog) on all three, "Featured" (catalog) Alpha at 1.
// A also: "K3 Draft" submitted not published in hist; Echo 2024-05-10 in series "closed"; category "pic".
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const ALL = 'controls,seed,read,window,catpic,paging,unpub,untick,newpress,featord,featord2';
const PHASES = (process.env.PHASES || ALL).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k3 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${app.name}.json`);

// ---- a generated PNG (300x200 red) for the covers --------------------------------------------
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
    for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const BIG = {name: 'k3-red-300x200.png', mimeType: 'image/png', buffer: png(300, 200, [220, 0, 0])};

const NEW_ON = 'This monograph is a new release. Make this monograph not a new release.';

// ---- the public pages as data ---------------------------------------------------------------
const PUBPAGE = () => {
    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const q = (s) => document.querySelector(s);
    const pg = q('.page');
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const cover = q('.about_section .cover');
    const img = q('.about_section img');
    return {
        docTitle: document.title,
        pageClass: pg ? pg.className : null,
        h1: q('.page h1') ? {text: t(q('.page h1').innerText), html: q('.page h1').innerHTML.slice(0, 120)} : null,
        crumbs: [...document.querySelectorAll('.cmp_breadcrumbs li')].map((li) => ({text: t(li.innerText), href: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null, current: !!li.querySelector('[aria-current], .current') || li.classList.contains('current')})),
        count: q('.monograph_count') ? t(q('.monograph_count').innerText) : null,
        about: q('.about_section') ? {cls: q('.about_section').className, text: t(q('.about_section').innerText)} : null,
        cover: cover ? {tag: cover.tagName, href: cover.getAttribute('href'), role: cover.getAttribute('role'), tabindex: cover.getAttribute('tabindex'), linkInside: !!cover.querySelector('a'), closestLink: !!cover.closest('a')} : null,
        img: img ? {src: (img.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''), alt: img.getAttribute('alt'), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, box: r(img)} : null,
        description: q('.about_section .description') ? t(q('.about_section .description').innerText) : null,
        onlineISSN: q('.onlineISSN') ? t(q('.onlineISSN').innerText) : null,
        printISSN: q('.printISSN') ? t(q('.printISSN').innerText) : null,
        headings: [...document.querySelectorAll('.page h2')].map((h) => t(h.innerText)),
        lists: [...document.querySelectorAll('.page .cmp_monographs_list')].map((m) => ({
            heading: m.querySelector(':scope > .title') ? t(m.querySelector(':scope > .title').innerText) : null,
            items: [...m.querySelectorAll('.obj_monograph_summary')].map((s) => ({title: t((s.querySelector('.title') || {}).innerText), inRow: !!s.closest('.row'), cls: s.className, box: r(s)})),
        })),
        paras: [...document.querySelectorAll('.page p')].map((p) => t(p.innerText)).filter(Boolean),
        pagination: q('.cmp_pagination') ? {text: t(q('.cmp_pagination').innerText), links: [...q('.cmp_pagination').querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href')}))} : null,
        block: q('.block_browse') ? {text: t(q('.block_browse').innerText), links: [...q('.block_browse').querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), li: a.closest('li').className}))} : null,
        catalogSeries: [...document.querySelectorAll('.pkp_series_nav_menu a')].map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})),
        mainText: t((q('.pkp_structure_main') || document.body).innerText).slice(0, 1500),
        newReleaseLinks: [...document.querySelectorAll('a')].filter((a) => /newReleases/.test(a.getAttribute('href') || '')).map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), where: a.closest('header, .pkp_structure_head') ? 'header' : a.closest('.pkp_structure_sidebar') ? 'sidebar' : a.closest('footer, .pkp_structure_footer') ? 'footer' : 'main'})),
        editControls: [...document.querySelectorAll('.pkp_structure_main a, .pkp_structure_main button')].filter((a) => /edit|manage|settings|workflow/i.test((a.getAttribute('href') || '') + a.innerText)).map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})).slice(0, 10),
    };
};

// ---- the series settings window (legacy) as data --------------------------------------------
const FORM = (sel) => {
    const f = document.querySelector(sel);
    if (!f) return null;
    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const labelOf = (e) => { let l = e.id ? f.querySelector(`label[for="${CSS.escape(e.id)}"]`) : null; if (!l) l = e.closest('label'); return l ? t(l.innerText) : null; };
    return {
        images: [...f.querySelectorAll('img')].map((i) => ({alt: i.alt, src: (i.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, '')})),
        fields: [...f.querySelectorAll('input, select, textarea')].filter((e) => e.type !== 'hidden' && e.type !== 'file').filter((e) => /sortOption|isInactive|inactive|Issn|path|title\[/.test(e.name)).map((e) => {
            const o = {name: e.name, visible: vis(e), label: labelOf(e)};
            if (e.type === 'checkbox') o.checked = e.checked;
            else if (e.tagName === 'SELECT') { o.selected = e.options[e.selectedIndex] ? t(e.options[e.selectedIndex].text) : null; o.options = [...e.options].map((x) => t(x.text)); }
            else o.value = (e.value || '').slice(0, 120);
            return o;
        }),
        messages: [...f.querySelectorAll('label.error, .pkp_form_error')].filter(vis).map((e) => t(e.innerText).slice(0, 300)).filter(Boolean),
    };
};

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const LOG = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
    const logSize = () => { try { return fs.statSync(LOG).size; } catch (e) { return null; } };
    const logSince = (off) => {
        if (off == null) return 'absent';
        try {
            const fd = fs.openSync(LOG, 'r'); const n = fs.statSync(LOG).size - off; const b = Buffer.alloc(Math.max(0, n));
            fs.readSync(fd, b, 0, b.length, off); fs.closeSync(fd);
            return [...new Set(b.toString('utf8').split('\n').filter((l) => /Warning|Error|Fatal|Notice|Deprecated/i.test(l)).map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ''), 220)))].slice(0, 8);
        } catch (e) { return String(e.message); }
    };

    // ------------------------------------------------------------ controls (OJS, OPS)
    if (!isOMP) {
        if (!on('controls')) return;
        const {page, close} = await launch(app);
        try {
            const out = {};
            for (const [k, p] of [['series', '/catalog/series/monographs'], ['seriesPlain', '/catalog/series'], ['newReleases', '/catalog/newReleases']]) {
                const r = await page.goto(app.url(`/index.php/${app.contextPath}${p}`)).catch((e) => ({err: flat(e.message, 200)}));
                await idle(page).catch(() => {});
                const s = await screen(page);
                record(`ctl-${k}`, s);
                out[k] = {status: r && r.status ? r.status() : r, url: strip(page.url()), title: s.title, h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), body: flat(s.text && (s.text.main || s.text.body), 300)};
            }
            fact('controls', out);
        } finally { await close(); }
        return;
    }

    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    async function post(route, body) {
        const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey}, body: JSON.stringify(body)});
        const json = await r.json().catch(() => null);
        if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(json).slice(0, 400)}`);
        return json;
    }

    // ------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u68k3');
        const users = (P) => [{username: `${P}mg`, roles: ['manager']}, {username: `${P}rd`, roles: ['reader']}, {username: `${P}au`, roles: ['author']}];
        const hist = {path: 'hist', title: 'History', description: 'K3 history series description.'};
        S.A = {P: `${t}a`}; S.B = {P: `${t}b`}; S.C = {P: `${t}c`};
        await post('scenarios/context', {tag: S.A.P, context: {name: {en: `K3 Press A ${t}`}}, series: [hist, {path: 'empty', title: 'Empty'}, {path: 'closed', title: 'Closed'}],
            categories: [{path: 'pic', title: 'Pictured'}], users: users(S.A.P), themeOptions: {showCatalogSeriesListing: true}, sidebar: ['browseblockplugin']});
        await post('scenarios/context', {tag: S.B.P, context: {name: {en: `K3 Press B ${t}`}}, series: [hist, {path: 'empty', title: 'Empty'}], users: users(S.B.P), itemsPerPage: 1});
        await post('scenarios/context', {tag: S.C.P, context: {name: {en: `K3 Press C ${t}`}}, users: users(S.C.P)});
        const book = async (P, i, title, date, extra) => (await post('scenarios/submission', {tag: `${P}b${i}`, context: P, submitter: `${P}au`, title, published: true, datePublished: date, ...extra})).submissionId;
        for (const X of ['A', 'B']) {
            const P = S[X].P;
            const cat = X === 'B' ? (e) => e : () => [];
            S[X].ids = {};
            S[X].ids.Alpha = await book(P, 1, `K3${X} Alpha`, '2024-01-10', {series: 'hist', newRelease: [{in: 'series', path: 'hist'}, ...cat([{in: 'catalog'}])], ...(X === 'B' ? {featured: [{in: 'catalog', position: 1}]} : {})});
            S[X].ids.Mike = await book(P, 2, `K3${X} Mike`, '2024-03-10', {series: 'hist', newRelease: [{in: 'series', path: 'hist'}, ...cat([{in: 'catalog'}])]});
            S[X].ids.Zulu = await book(P, 3, `K3${X} Zulu`, '2024-02-10', {series: 'hist', featured: [{in: 'series', path: 'hist'}], newRelease: cat([{in: 'catalog'}])});
        }
        S.A.ids.Echo = await book(S.A.P, 4, 'K3A Echo', '2024-05-10', {series: 'closed'});
        S.A.ids.Draft = (await post('scenarios/submission', {tag: `${S.A.P}b5`, context: S.A.P, submitter: `${S.A.P}au`, title: 'K3A Draft', series: 'hist', submitted: true})).submissionId;
        S.seeded = true; save();
        note(`ccK3 seed: presses A ${S.A.P} (IPP 25, Show Series, Browse block), B ${S.B.P} (IPP 1), C ${S.C.P} (bare); ids ${JSON.stringify({A: S.A.ids, B: S.B.ids})}`);
        fact('seed', S);
    }
    if (!S.seeded) { log('no state: run PHASES=seed first'); return; }
    const A = S.A.P, B = S.B.P, C = S.C.P;
    const cu = (P, p) => app.url(`/index.php/${P}${p}`);

    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page, vis = vs.page;
    const jsDialogs = [];
    page.on('dialog', (d) => { jsDialogs.push({type: d.type(), message: flat(d.message(), 300), url: strip(page.url())}); d.accept().catch(() => {}); });
    const imgs = [];
    vis.on('response', (r) => { if (/catalog\/(thumbnail|fullSize)/.test(r.url())) imgs.push({status: r.status(), url: strip(r.url()), type: r.headers()['content-type'] || null}); });

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
            await snap(page, `zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    /** A public page read by `p` (the visitor by default): status, the page as data, the server log since. */
    async function read(name, P, sub, p = vis) {
        const off = logSize(); const i0 = imgs.length;
        const r = await p.goto(cu(P, sub)).catch((e) => ({err: flat(e.message, 200)}));
        await idle(p).catch(() => {});
        await snap(p, name);
        const d = await p.evaluate(PUBPAGE);
        const o = {status: r && r.status ? r.status() : r, url: strip(p.url()), ...d, imgs: imgs.slice(i0), serverLog: logSince(off)};
        return o;
    }
    const brief = (o) => o && {status: o.status, url: o.url, docTitle: o.docTitle, h1: o.h1 && o.h1.text, crumbs: o.crumbs && o.crumbs.map((c) => c.text).join(' / '), count: o.count, headings: o.headings,
        lists: o.lists && o.lists.map((l) => `${l.heading || '(none)'}: ${l.items.map((i) => `${i.title}${i.inRow ? '' : ' [own row]'} w${i.box[2]}`).join('; ')}`), paras: o.paras, pagination: o.pagination,
        about: o.about, cover: o.cover, img: o.img, description: o.description, onlineISSN: o.onlineISSN, printISSN: o.printISSN, block: o.block && o.block.links.map((l) => `${l.text}${/current/.test(l.li) ? ' [current]' : ''}`).join(' | '), serverLog: o.serverLog};

    // ---- series window helpers (Settings › Press › "Series")
    const GRID = '#seriesGridContainer';
    const FORMSEL = 'form#seriesForm';
    const form = () => page.locator(FORMSEL).first();
    const readForm = () => page.evaluate(FORM, FORMSEL);
    async function openTab(P) {
        await page.goto(cu(P, '/management/settings/context')); await idle(page);
        await page.getByRole('tab', {name: 'Series', exact: true}).first().click(); await idle(page);
        await page.locator(GRID).first().locator('tr.gridRow, tbody.empty').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
        await sleep(400);
    }
    async function openEdit(title) {
        const row = page.locator(GRID).first().locator('tr.gridRow').filter({hasText: title}).first();
        const tog = row.locator('a.show_extras');
        if (await tog.count()) { await tog.first().click(); await sleep(400); }
        const id = await row.getAttribute('id');
        await page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
        await form().locator('input[name="path"]').first().waitFor({timeout: T});
        await idle(page); await sleep(900);
    }
    async function pressSave(label) {
        const off = logSize(); const d0 = jsDialogs.length;
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /update-?series/i.test(r.url()), {timeout: T}).catch(() => null);
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await sleep(1500); await idle(page).catch(() => {});
        const open = await form().isVisible().catch(() => false);
        const out = {post: r ? r.status() : null, windowOpen: open, messages: open ? (await readForm()).messages : null, dialogs: jsDialogs.slice(d0), serverLog: logSince(off)};
        await snap(page, label, {save: out});
        return out;
    }
    const asMgr = async (P) => { await signIn(page, `${P}mg`, {contextPath: P}); await idle(page).catch(() => {}); };

    // ---- the Catalog page (manageCatalog) helpers, from U70's K3
    const item = (title) => page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: title})});
    async function openCatalog(P) {
        await page.goto(cu(P, '/manageCatalog')); await idle(page);
        await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }

    try {
        // ======================================================== read: A as a visitor, then the reader and the manager
        if (on('read')) await sect('read', async () => {
            const o = {};
            o.hist = await read('r-01-hist-visitor', A, '/catalog/series/hist');
            await loc(vis, 'series page: heading', vis.locator('.page_catalog_series h1'));
            await loc(vis, 'series page: count', vis.locator('.page_catalog_series .monograph_count'));
            await loc(vis, 'series page: "New Releases" list heading', vis.locator('.page_catalog_series .cmp_monographs_list > h2.title', {hasText: 'New Releases'}));
            await loc(vis, 'series page: "All Books" list heading', vis.locator('.page_catalog_series .cmp_monographs_list > h2.title', {hasText: 'All Books'}));
            await loc(vis, 'series page: book summaries', vis.locator('.page_catalog_series .obj_monograph_summary'));
            o.empty = await read('r-02-empty-visitor', A, '/catalog/series/empty');
            o.closed = await read('r-03-closed-visitor', A, '/catalog/series/closed');
            o.catalog = await read('r-04-catalog-visitor', A, '/catalog');
            o.newReleases = await read('r-05-newreleases-visitor-A', A, '/catalog/newReleases');
            fact('read-visitor', Object.fromEntries(Object.entries(o).map(([k, v]) => [k, brief(v)])));
            fact('read-catalog-series-line', {catalogSeries: o.catalog.catalogSeries, main: o.catalog.mainText.slice(0, 400)});
            // the press's reader and manager on the same pages (sweep)
            for (const who of ['rd', 'mg']) {
                await signIn(vis, `${A}${who}`, {contextPath: A}); await idle(vis).catch(() => {});
                const h = await read(`r-06-hist-${who}`, A, '/catalog/series/hist');
                const n = await read(`r-07-newreleases-${who}`, A, '/catalog/newReleases');
                fact(`read-${who}`, {hist: brief(h), histEdit: h.editControls, header: flat(await vis.locator('.pkp_structure_head').innerText().catch(() => ''), 300), newReleases: brief(n), nrEdit: n.editControls});
                await signOut(vis).catch(() => {});
            }
        });

        // ======================================================== window: the series settings on A, then the visitor's pages
        if (on('window')) await sect('window', async () => {
            const o = {};
            await asMgr(A);
            await openTab(A);
            // "Add Series" as it opens: the order list and the inactive box; a change left by "Cancel"
            await page.locator(GRID).first().getByRole('link', {name: /Add Series/}).first().click();
            await form().locator('input[name="path"]').first().waitFor({timeout: T}); await idle(page); await sleep(900);
            o.addOpen = await readForm();
            await snap(page, 'w-01-add-window');
            await loc(page, 'Series window: Order of monographs select[name="sortOption"]', form().locator('select[name="sortOption"]'));
            await loc(page, 'Series window: inactive box', form().getByRole('checkbox', {name: /Mark this series as inactive/}));
            o.inactiveLabel = flat(await form().getByRole('checkbox', {name: /Mark this series as inactive/}).first().evaluate((e) => (document.querySelector(`label[for="${e.id}"]`) || e.closest('label') || {}).innerText).catch(() => null), 200);
            await form().locator('input[name="title[en]"]').fill('K3 Unsaved');
            await form().locator('input[name="title[en]"]').blur();
            const d0 = jsDialogs.length;
            const cancel = form().getByRole('link', {name: 'Cancel', exact: true}).first();
            await cancel.click().catch(() => {}); await sleep(1200);
            o.cancel = {dialogs: jsDialogs.slice(d0), windowOpen: await form().isVisible().catch(() => false)};
            await snap(page, 'w-02-add-cancelled');
            await openTab(A);
            o.gridAfterCancel = flat(await page.locator(GRID).first().innerText(), 400);
            // hist: ISSNs and a cover, saved
            await openEdit('History');
            o.histOpen = await readForm();
            await snap(page, 'w-03-hist-window');
            await form().locator('input[name="onlineIssn"]').fill('0378-5955');
            await form().locator('input[name="printIssn"]').fill('2049-3630');
            await form().locator('input[type=file]').first().setInputFiles(BIG);
            await sleep(3000); await idle(page);
            o.histSave = await pressSave('w-04-hist-saved');
            await page.reload(); await idle(page); await openTab(A); await openEdit('History');
            o.histReopened = await readForm();
            await snap(page, 'w-05-hist-reopened-after-reload');
            await form().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {}); await sleep(900);
            // the visitor's page: picture, description, ISSNs; pressing the picture; the full size typed
            o.hist1 = await read('w-06-hist-visitor-details', A, '/catalog/series/hist');
            await loc(vis, 'series page: picture wrapper .about_section .cover', vis.locator('.page_catalog_series .about_section .cover'));
            await loc(vis, 'series page: picture img', vis.locator('.page_catalog_series .about_section img'));
            o.linksInAbout = await vis.locator('.about_section').getByRole('link').count().catch(() => null);
            o.ariaAbout = await vis.locator('.about_section').ariaSnapshot().catch(() => null);
            const before = vis.url();
            const pop = vis.context().waitForEvent('page', {timeout: 2500}).catch(() => null);
            await vis.locator('.about_section img').first().click({timeout: 5000}).catch((e) => { o.clickError = flat(e.message, 200); });
            const np = await pop; await sleep(800);
            o.afterClick = {urlChanged: vis.url() !== before, url: strip(vis.url()), newTab: np ? strip(np.url()) : null};
            if (np) await np.close();
            o.anyFullSizeLink = await vis.locator('a[href*="fullSize"]').count();
            if (o.hist1.cover && o.hist1.cover.href) {
                const fr = await vis.goto(o.hist1.cover.href).catch((e) => ({err: flat(e.message, 200)}));
                o.fullSizeTyped = fr && fr.status ? {status: fr.status(), type: fr.headers()['content-type'], length: fr.headers()['content-length']} : fr;
                await snap(vis, 'w-07-fullsize-typed', {}, false);
            }
            if (o.hist1.img && o.hist1.img.src) {
                const tr = await vis.goto(app.url(o.hist1.img.src)).catch((e) => ({err: flat(e.message, 200)}));
                o.thumbTyped = tr && tr.status ? {status: tr.status(), type: tr.headers()['content-type']} : tr;
            }
            // the series' own order: "Publication date (oldest first)"
            await openTab(A); await openEdit('History');
            await form().locator('select[name="sortOption"]').selectOption({label: 'Publication date (oldest first)'});
            o.orderSave = await pressSave('w-08-hist-order-oldest-saved');
            await openTab(A); await openEdit('History');
            o.orderReopened = (await readForm()).fields.find((f) => f.name === 'sortOption');
            await form().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {}); await sleep(900);
            o.hist2 = await read('w-09-hist-visitor-oldest', A, '/catalog/series/hist');
            // "Closed" made inactive
            await openTab(A); await openEdit('Closed');
            await form().getByRole('checkbox', {name: /Mark this series as inactive/}).first().check();
            o.inactiveSave = await pressSave('w-10-closed-inactive-saved');
            await page.reload(); await idle(page); await openTab(A);
            o.gridAfterInactive = flat(await page.locator(GRID).first().innerText(), 400);
            await openEdit('Closed');
            o.closedReopened = (await readForm()).fields.filter((f) => /nactive/.test(f.name) || /inactive/i.test(f.label || ''));
            await snap(page, 'w-11-closed-reopened');
            await form().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {}); await sleep(900);
            o.closed1 = await read('w-12-closed-visitor-inactive', A, '/catalog/series/closed');
            o.catalog1 = await read('w-13-catalog-visitor-inactive', A, '/catalog');
            o.hist3 = await read('w-14-hist-visitor-inactive', A, '/catalog/series/hist');
            o.empty1 = await read('w-15-empty-visitor-inactive', A, '/catalog/series/empty');
            await signOut(page).catch(() => {});
            const keep = ['addOpen', 'inactiveLabel', 'cancel', 'gridAfterCancel', 'histOpen', 'histSave', 'histReopened', 'linksInAbout', 'ariaAbout', 'clickError', 'afterClick', 'anyFullSizeLink', 'fullSizeTyped', 'thumbTyped', 'orderSave', 'orderReopened', 'inactiveSave', 'gridAfterInactive', 'closedReopened'];
            fact('window', Object.fromEntries(keep.map((k) => [k, o[k]])));
            fact('window-pages', {hist1: brief(o.hist1), hist2: brief(o.hist2), closed1: brief(o.closed1), catalog1: {...brief(o.catalog1), catalogSeries: o.catalog1.catalogSeries}, hist3: brief(o.hist3), empty1: brief(o.empty1)});
        });

        // ======================================================== catpic: a category's picture on A
        if (on('catpic')) await sect('catpic', async () => {
            const o = {};
            await asMgr(A);
            await page.goto(cu(A, '/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: 'Categories', exact: true}).first().click(); await idle(page); await sleep(600);
            const row = page.getByRole('row').filter({hasText: 'Pictured'}).first();
            await row.getByRole('button', {name: /More Actions/}).first().click(); await sleep(400);
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).first().click(); await idle(page); await sleep(1200);
            const dlg = page.getByRole('dialog', {name: /Edit Category/}).first();
            await dlg.locator('input[name="path"]').first().waitFor({timeout: T});
            for (let i = 0; i < 20 && !(await dlg.locator('input[name="path"]').first().inputValue()); i++) await sleep(250);
            await dlg.locator('input[type="file"]').first().setInputFiles(BIG); await sleep(1500);
            const w = page.waitForResponse((r) => r.request().method() !== 'GET' && /categor/i.test(r.url()), {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).last().click();
            const r = await w; await idle(page); await sleep(1200);
            o.save = r ? r.status() : null;
            const c = await read('c-01-category-visitor-picture', A, '/catalog/category/pic');
            o.cover = c.cover; o.img = c.img; o.linksInAbout = await vis.locator('.about_section').getByRole('link').count().catch(() => null);
            o.anyFullSizeLink = await vis.locator('a[href*="fullSize"]').count();
            await signOut(page).catch(() => {});
            fact('catpic', o);
        });

        // ======================================================== paging: B as a visitor (Items per page 1)
        if (on('paging')) await sect('paging', async () => {
            const o = {};
            o.p1 = await read('p-01-hist-page1', B, '/catalog/series/hist');
            const next = vis.locator('.cmp_pagination a', {hasText: /Next/});
            await loc(vis, 'series page: page links "Next"', next);
            for (const n of [2, 3]) {
                const nx = vis.locator('.cmp_pagination a', {hasText: /Next/}).first();
                if (!(await nx.count())) break;
                await nx.click(); await idle(vis).catch(() => {});
                await snap(vis, `p-0${n}-hist-page${n}-via-next`);
                o[`p${n}`] = {status: 200, url: strip(vis.url()), ...(await vis.evaluate(PUBPAGE))};
            }
            const prev = vis.locator('.cmp_pagination a', {hasText: /Prev/}).first();
            if (await prev.count()) { await prev.click(); await idle(vis).catch(() => {}); o.backFrom3 = strip(vis.url()); }
            const prev2 = vis.locator('.cmp_pagination a', {hasText: /Prev/}).first();
            if (await prev2.count()) { await prev2.click(); await idle(vis).catch(() => {}); o.backFrom2 = strip(vis.url()); }
            o.p99 = await read('p-04-hist-page99-typed', B, '/catalog/series/hist/99');
            o.p1typed = await read('p-05-hist-page1-typed', B, '/catalog/series/hist/1');
            o.empty = await read('p-06-empty-series', B, '/catalog/series/empty');
            o.nr = await read('p-07-newreleases-ipp1', B, '/catalog/newReleases');
            await loc(vis, 'New Releases page: heading', vis.locator('.page_catalog_new_releases h1'));
            await loc(vis, 'New Releases page: count', vis.locator('.page_catalog_new_releases .monograph_count'));
            await loc(vis, 'New Releases page: book summaries', vis.locator('.page_catalog_new_releases .obj_monograph_summary'));
            o.catalog = await read('p-08-catalog-ipp1', B, '/catalog');
            fact('paging', Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : brief(v)])));
        });

        // ======================================================== unpub: B, Mike unpublished by the manager
        if (on('unpub')) await sect('unpub', async () => {
            const o = {};
            await asMgr(B);
            await page.goto(cu(B, `/dashboard/editorial?workflowSubmissionId=${S.B.ids.Mike}`)); await idle(page);
            await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await page.getByRole('link', {name: 'Title & Abstract', exact: true}).last().click(); await idle(page); await sleep(500);
            await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).click();
            const dlg = page.getByRole('dialog', {name: 'Unpublish', exact: true});
            await dlg.waitFor({timeout: T});
            const done = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Unpublish', exact: true}).click();
            const r = await done;
            await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            o.unpublish = r ? r.status() : null;
            await snap(page, 'u-01-mike-unpublished');
            await signOut(page).catch(() => {});
            o.nr = brief(await read('u-02-newreleases-after-unpublish', B, '/catalog/newReleases'));
            o.hist = brief(await read('u-03-hist-after-unpublish', B, '/catalog/series/hist'));
            fact('unpub', o);
        });

        // ======================================================== untick: B, "New release" unticked on the Catalog page
        if (on('untick')) await sect('untick', async () => {
            const o = {presses: []};
            await asMgr(B);
            await openCatalog(B);
            await snap(page, 'n-01-catalog-page-before');
            for (const t of ['K3B Alpha', 'K3B Zulu', 'K3B Mike']) {
                const btn = item(t).getByRole('button', {name: NEW_ON, exact: true});
                if (!(await btn.count())) { o.presses.push({t, box: 'no ticked box shown'}); continue; }
                const w = page.waitForResponse((x) => /saveDisplayFlags/.test(x.url()), {timeout: T}).catch(() => null);
                await btn.click();
                const x = await w; await idle(page);
                o.presses.push({t, status: x ? x.status() : null});
            }
            await snap(page, 'n-02-catalog-page-after');
            o.nrAfter = brief(await read('n-03-newreleases-after-untick', B, '/catalog/newReleases'));
            await vis.reload(); await idle(vis).catch(() => {});
            await snap(vis, 'n-04-newreleases-after-untick-reloaded');
            o.nrReloaded = brief({status: 200, url: strip(vis.url()), ...(await vis.evaluate(PUBPAGE))});
            o.histAfter = brief(await read('n-05-hist-after-untick', B, '/catalog/series/hist'));
            await signOut(page).catch(() => {});
            fact('untick', o);
        });

        // ======================================================== newpress: C
        if (on('newpress')) await sect('newpress', async () => {
            const o = {};
            for (const [k, sub] of [['home', '/index'], ['catalog', '/catalog'], ['about', '/about']]) {
                const d = await read(`x-0-${k}-new-press`, C, sub);
                o[k] = {count: d.count, paras: d.paras, newReleaseLinks: d.newReleaseLinks, block: d.block, header: flat(await vis.locator('.pkp_structure_head').innerText().catch(() => ''), 300)};
            }
            o.nr = brief(await read('x-4-newreleases-new-press', C, '/catalog/newReleases'));
            fact('newpress', o);
        });

        // ======================================================== featord: D, two featured in series in their saved order
        if (on('featord')) await sect('featord', async () => {
            if (!S.D) {
                const P = `${tag('u68k3')}d`;
                await post('scenarios/context', {tag: P, context: {name: {en: `K3 Press D ${P}`}}, series: [{path: 'hist', title: 'History'}], users: [{username: `${P}au`, roles: ['author']}]});
                const book = async (i, title, date, extra) => (await post('scenarios/submission', {tag: `${P}b${i}`, context: P, submitter: `${P}au`, title, published: true, datePublished: date, series: 'hist', ...extra})).submissionId;
                const ids = {};
                ids.Alpha = await book(1, 'K3D Alpha', '2024-01-10', {featured: [{in: 'series', path: 'hist', position: 1}]});
                ids.Mike = await book(2, 'K3D Mike', '2024-03-10', {featured: [{in: 'series', path: 'hist', position: 2}]});
                ids.Zulu = await book(3, 'K3D Zulu', '2024-02-10', {});
                ids.Yank = await book(4, 'K3D Yank', '2099-01-10', {});
                S.D = {P, ids}; save();
                note(`ccK3 featord: press D ${P}, ids ${JSON.stringify(ids)}`);
            }
            fact('featord', {D: S.D, hist: brief(await read('f-01-hist-two-featured', S.D.P, '/catalog/series/hist')), catalog: brief(await read('f-02-catalog-D', S.D.P, '/catalog'))});
        });
        if (on('featord2')) await sect('featord2', async () => {
            if (!S.E) {
                const P = `${tag('u68k3')}e`;
                await post('scenarios/context', {tag: P, context: {name: {en: `K3 Press E ${P}`}}, series: [{path: 'hist', title: 'History'}], users: [{username: `${P}au`, roles: ['author']}]});
                const book = async (i, title, date, extra) => (await post('scenarios/submission', {tag: `${P}b${i}`, context: P, submitter: `${P}au`, title, published: true, datePublished: date, series: 'hist', ...extra})).submissionId;
                const ids = {};
                ids.Alpha = await book(1, 'K3E Alpha', '2024-01-10', {featured: [{in: 'series', path: 'hist', position: 1}]});
                ids.Zulu = await book(3, 'K3E Zulu', '2024-02-10', {});
                ids.Mike = await book(2, 'K3E Mike', '2024-03-10', {featured: [{in: 'series', path: 'hist', position: 1}]});
                S.E = {P, ids}; save();
            }
            fact('featord2', {E: S.E, hist: brief(await read('f-03-hist-two-featured-reordered', S.E.P, '/catalog/series/hist'))});
        });
    } finally {
        fact('jsDialogs', jsDialogs);
        await mg.close(); await vs.close();
    }
});
