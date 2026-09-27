// U68 claim check K1: framing and access (spec Purpose and the OJS/OPS absence paragraph, Actors, the Fields
// preamble, Rules 1–2 "Reaching the pages" and 2a, Side effects, Settings 8–9, register A9; footnotes a, b, c, m,
// p, td1, td6, td11, td13, f-a9).
//
//   PROBE_FEATURE=U68 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U68/K1/k1.js
//   OMP may outlast 600 s: run it detached (patterns.md "Probe kit"). PHASES=a,b picks phases (default all, in
//   order); the seeded presses are kept in k1-state-<app>.json under the output folder (delete it for a fresh seed).
//
// Phases:
//   controls  OJS, OPS: publicknowledge as a visitor and as manager.maya: the catalog, "New Releases", series and old
//             search addresses; the header; Navigation › "Add item" types (read-only, closed unsaved); scratch contexts
//             closed by "Users must be registered…" and not enabled publicly: the catalog address signed out
//   pk        OMP: publicknowledge, the same reads (the control end of td1, td11)
//   seed      OMP: presses P (series Alpha, Beta; three books, one draft; "Show Series", the block placed, both home
//             lists; a user per permission level), R (to be closed on screen), D (to be un-enabled), N (bare), Q (IPP 1,
//             three new releases)
//   purpose   P as a visitor: home, catalog, series, "New Releases", a book's page; the summaries; header, trail, sidebar
//   roles     P as each level (admin, manager, series editor, copyeditor, reviewer, author, reader, a non-member):
//             the same four pages, the books and anything offered to change
//   reach     N: the header's "Catalog", every link to "New Releases", the Navigation tab, the sidebar and block rows;
//             P: "Series" and "New Releases" menu items added and pressed, the "Series:" links, the block, a book's
//             series link
//   unknown   P: unknown series paths, no path, another press's path; Beta's path changed and its old address
//   td6       Q: "New Releases" at IPP 1 with three; all three unticked on the Catalog page; read and reloaded
//   stats     P: the usage log lines and the mail each page leaves
//   access    R: the Site Access Options box as it opens, ticked and left unsaved, then saved; every page signed out,
//             as the reader, as the manager
//   enable    D: Hosted Presses "Edit" as the admin (publicknowledge's box read and closed); D's box unticked, left by
//             Cancel, then saved; every page signed out, as the reader, as the manager
//   settings  P: Actors row 3: the Browse Block row's "Settings" as the manager; the settings pages typed by the
//             series editor; Administration typed by the manager
//
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = 'controls,pk,seed,purpose,roles,reach,unknown,td6,stats,access,enable,settings';
const PHASES = (process.env.PHASES || ALL).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k1 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const NEW_ON = 'This monograph is a new release. Make this monograph not a new release.';

// ---- a public page as data -------------------------------------------------------------------
const PAGE = () => {
    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const q = (s) => document.querySelector(s);
    const rel = (h) => (h || '').replace(/^https?:\/\/[^/]+/, '');
    const main = q('.pkp_structure_main') || document.body;
    const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const b = q('.block_browse');
    return {
        url: rel(location.href), docTitle: document.title,
        header: !!q('.pkp_structure_head'), siteName: q('.pkp_site_name') ? t(q('.pkp_site_name').innerText) : null,
        primary: [...document.querySelectorAll('#navigationPrimary > li')].map((li) => { const a = li.querySelector(':scope > a'); return {t: a ? t(a.innerText) : t(li.innerText), href: a ? rel(a.getAttribute('href')) : null}; }),
        user: [...document.querySelectorAll('#navigationUser > li > a')].map((a) => t(a.innerText)),
        h1: [...main.querySelectorAll('h1')].map((h) => t(h.innerText)),
        h2: [...main.querySelectorAll('h2')].map((h) => t(h.innerText)),
        crumbs: q('.cmp_breadcrumbs') ? [...document.querySelectorAll('.cmp_breadcrumbs li')].map((li) => t(li.innerText)) : null,
        count: q('.monograph_count') ? t(q('.monograph_count').innerText) : null,
        lists: [...main.querySelectorAll('.cmp_monographs_list')].map((m) => ({
            heading: m.querySelector(':scope > .title') ? t(m.querySelector(':scope > .title').innerText) : null,
            items: [...m.querySelectorAll('.obj_monograph_summary')].map((s) => ({
                title: t((s.querySelector('.title') || {}).innerText), featured: s.classList.contains('is_featured'),
                author: s.querySelector('.author') ? t(s.querySelector('.author').innerText) : null,
                date: s.querySelector('.date') ? t(s.querySelector('.date').innerText) : null,
                cover: !!s.querySelector('.cover img'),
                coverHref: rel((s.querySelector('a.cover') || {getAttribute: () => null}).getAttribute('href')),
                titleHref: rel((s.querySelector('.title a') || {getAttribute: () => null}).getAttribute('href')),
            })),
        })),
        seriesNav: q('.pkp_series_nav_menu') ? [...q('.pkp_series_nav_menu').querySelectorAll('a')].map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href'))})) : null,
        pagination: q('.cmp_pagination') ? t(q('.cmp_pagination').innerText) : null,
        block: b ? [...b.querySelectorAll('a')].map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href')), current: !!a.closest('.current')})) : null,
        sidebar: q('.pkp_structure_sidebar') ? {visible: vis(q('.pkp_structure_sidebar')), blocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((x) => x.className)} : null,
        loginForm: !!q('form#login, form.cmp_form.login'),
        notices: [...document.querySelectorAll('.pkp_notification, .cmp_notification, [role="alert"]')].filter(vis).map((e) => t(e.innerText)).filter(Boolean),
        // what the page offers to change: form controls and buttons in the main area, links to back-office pages
        mainControls: [...main.querySelectorAll('input:not([type=hidden]), select, textarea, button')].filter(vis).map((e) => `${e.tagName.toLowerCase()}${e.type ? ':' + e.type : ''} ${t(e.innerText || e.value || e.name || e.getAttribute('aria-label') || '')}`.slice(0, 80)),
        backOfficeLinks: [...document.querySelectorAll('a')].filter(vis).map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href'))})).filter((a) => /workflow|management|manageCatalog|\/admin|submission\/|dashboard|submissions/.test(a.href || '')),
        newReleaseLinks: [...document.querySelectorAll('a')].filter((a) => /newReleases/.test(a.getAttribute('href') || '')).map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href')), where: a.closest('.pkp_structure_head') ? 'header' : a.closest('.pkp_structure_sidebar') ? 'sidebar' : a.closest('.pkp_structure_footer') ? 'footer' : 'main'})),
        seriesLinks: [...main.querySelectorAll('a')].filter((a) => /catalog\/series\//.test(a.getAttribute('href') || '')).map((a) => ({t: t(a.innerText), href: rel(a.getAttribute('href'))})),
        paras: [...main.querySelectorAll('p')].map((p) => t(p.innerText)).filter(Boolean).slice(0, 8),
        bodyText: t(document.body.innerText).slice(0, 600),
    };
};

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    async function post(route, body) {
        const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey}, body: JSON.stringify(body)});
        const json = await r.json().catch(() => null);
        if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(json).slice(0, 400)}`);
        return json;
    }
    const cu = (P, p = '') => app.url(`/index.php/${P}${p}`);
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));

    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page, vis = vs.page;
    const jsDialogs = [];
    for (const p of [page, vis]) p.on('dialog', (d) => { jsDialogs.push({type: d.type(), message: flat(d.message(), 300), url: strip(p.url()), t: Math.round((Date.now() - T0) / 1000)}); d.accept().catch(() => {}); });
    const fails = [];
    for (const p of [page, vis]) {
        p.on('response', (r) => { if (r.status() >= 500) fails.push({status: r.status(), url: strip(r.url()).slice(0, 200)}); });
        p.on('pageerror', (e) => fails.push({pageerror: flat(e.message, 200), url: strip(p.url())}));
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
            await snap(page, `zz-failed-${name}-p`).catch(() => {});
            await snap(vis, `zz-failed-${name}-v`).catch(() => {});
            return null;
        }
    }
    /** A public page read by `p` (the visitor by default): the status, where it landed, the page as data. */
    async function read(name, url, p = vis) {
        const f0 = fails.length;
        const r = await p.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(p).catch(() => {});
        await snap(p, name);
        const d = await p.evaluate(PAGE).catch((e) => ({evalError: flat(e.message, 200)}));
        return {status: r && r.status ? r.status() : r, ...d, fails: fails.slice(f0)};
    }
    const brief = (o) => o && {status: o.status, url: o.url, docTitle: o.docTitle, header: o.header, h1: o.h1, crumbs: o.crumbs && o.crumbs.join(' / '), count: o.count, login: o.loginForm,
        lists: o.lists && o.lists.map((l) => `${l.heading || '(none)'}: ${l.items.map((i) => `${i.title}${i.featured ? ' [F]' : ''}`).join('; ')}`),
        seriesNav: o.seriesNav && o.seriesNav.map((x) => x.t).join(' | '), block: o.block && o.block.map((x) => `${x.t}${x.current ? '*' : ''}`).join(' | '),
        sidebar: o.sidebar, notices: o.notices, mainControls: o.mainControls, backOffice: o.backOfficeLinks, primary: o.primary && o.primary.map((x) => x.t).join(' | '),
        paras: o.paras && o.paras.slice(0, 3), text: o.header ? undefined : o.bodyText, fails: o.fails, err: o.err};
    const as = async (u, P) => { if (!u) { await signOut(page).catch(() => {}); return; } await signIn(page, u, {contextPath: P}); await idle(page).catch(() => {}); };

    // Navigation › "Add item": the type list, closed unsaved
    async function itemTypes(P) {
        const L = require('../../U08/K2/lib');
        await L.openNav(page, app, P);
        const g = await L.grids(page);
        await L.openItemWindow(page, 'add');
        const st = await L.itemState(page);
        await snap(page, `nav-add-item-${P.slice(-6)}`);
        await loc(page, 'Navigation "Add item" window: the type list select[name="menuItemType"]', L.itemWindow(page).locator('select[name="menuItemType"]'));
        await L.closeItemWindow(page);
        return {menus: g.menus.rows, items: g.items.rows, types: st.typeOptions};
    }

    try {
        // ============================================================ controls: OJS, OPS
        if (!isOMP) {
            if (!on('controls')) return;
            await sect('controls', async () => {
                const out = {};
                const PK = app.contextPath;
                out.home = brief(await read('c-00-pk-home', cu(PK)));
                for (const [k, p] of [['catalog', '/catalog'], ['newReleases', '/catalog/newReleases'], ['series', '/catalog/series/monographs'], ['results', '/catalog/results'], ['resultsQ', '/catalog/results?query=book'], ['seriesBare', '/catalog/series/nope']]) {
                    out[k] = brief(await read(`c-01-pk-${k}`, cu(PK, p)));
                }
                // signed in: the same addresses as the manager
                await as('manager.maya', PK);
                out.mgrCatalog = brief(await read('c-02-pk-catalog-manager', cu(PK, '/catalog'), page));
                out.nav = await itemTypes(PK);
                await as(null);
                // closed contexts: restricted, not enabled
                const t = tag('u68k1');
                const X = `${t}r`, Y = `${t}d`;
                await post('scenarios/context', {tag: X, context: {name: {en: `K1 restricted ${X}`}}, restrictSiteAccess: true, users: [{username: `${X}rd`, roles: ['reader']}]});
                await post('scenarios/context', {tag: Y, context: {name: {en: `K1 not enabled ${Y}`}, enabled: false}, users: [{username: `${Y}rd`, roles: ['reader']}]});
                note(`ccK1 [${app.name}] controls: contexts ${X} (restrictSiteAccess), ${Y} (enabled false)`);
                for (const [C, k] of [[X, 'restricted'], [Y, 'disabled']]) {
                    out[`${k}Home`] = brief(await read(`c-03-${k}-home`, cu(C)));
                    out[`${k}Catalog`] = brief(await read(`c-03-${k}-catalog`, cu(C, '/catalog')));
                    out[`${k}NewReleases`] = brief(await read(`c-03-${k}-newreleases`, cu(C, '/catalog/newReleases')));
                    await as(`${C}rd`, C);
                    out[`${k}CatalogReader`] = brief(await read(`c-04-${k}-catalog-reader`, cu(C, '/catalog'), page));
                    await as(null);
                }
                fact('controls', out);
            });
            return;
        }

        // ============================================================ pk: OMP publicknowledge (read-only)
        if (on('pk')) await sect('pk', async () => {
            const out = {};
            const PK = app.contextPath;
            out.home = brief(await read('k-00-pk-home', cu(PK)));
            for (const [k, p] of [['catalog', '/catalog'], ['newReleases', '/catalog/newReleases'], ['series', '/catalog/series/monographs'], ['results', '/catalog/results'], ['resultsQ', '/catalog/results?query=book'], ['search', '/search/search?query=book']]) {
                out[k] = brief(await read(`k-01-pk-${k}`, cu(PK, p)));
            }
            await as('manager.maya', PK);
            out.nav = await itemTypes(PK);
            await as(null);
            fact('pk', out);
        });

        // ============================================================ seed (OMP)
        if (on('seed') && !S.seeded) {
            const t = tag('u68k1');
            const lv = (P) => [['mg', 'manager'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['rv', 'externalReviewer'], ['au', 'author'], ['rd', 'reader']].map(([s, r]) => ({username: `${P}${s}`, roles: [r]}));
            const two = (P) => [{username: `${P}mg`, roles: ['manager']}, {username: `${P}rd`, roles: ['reader']}, {username: `${P}au`, roles: ['author']}];
            for (const X of ['P', 'R', 'D', 'N', 'Q']) S[X] = {P: `${t}${X.toLowerCase()}`};
            const alpha = {path: 'alpha', title: 'Alpha'};
            await post('scenarios/context', {tag: S.P.P, context: {name: {en: `K1 Press P ${t}`}, acronym: 'K1P', country: 'CA'}, series: [alpha, {path: 'beta', title: 'Beta'}],
                users: lv(S.P.P), themeOptions: {showCatalogSeriesListing: true}, sidebar: ['browseblockplugin'], displayFeaturedBooks: true, displayNewReleases: true});
            for (const X of ['R', 'D']) {
                await post('scenarios/context', {tag: S[X].P, context: {name: {en: `K1 Press ${X} ${t}`}, acronym: `K1${X}`, country: 'CA'}, series: [alpha], users: two(S[X].P),
                    sidebar: ['browseblockplugin'], displayFeaturedBooks: true, displayNewReleases: true});
            }
            await post('scenarios/context', {tag: S.N.P, context: {name: {en: `K1 Press N ${t}`}}, users: two(S.N.P)});
            await post('scenarios/context', {tag: S.Q.P, context: {name: {en: `K1 Press Q ${t}`}}, users: two(S.Q.P), itemsPerPage: 1});
            const book = async (P, i, title, date, extra) => (await post('scenarios/submission', {tag: `${P}b${i}`, context: P, submitter: `${P}au`, title, published: true, datePublished: date, ...extra})).submissionId;
            const P = S.P.P;
            S.P.ids = {};
            S.P.ids.one = await book(P, 1, 'K1P Alpha One', '2024-01-10', {series: 'alpha', featured: [{in: 'catalog', position: 1}], newRelease: [{in: 'catalog'}]});
            S.P.ids.two = await book(P, 2, 'K1P Beta Two', '2024-02-10', {series: 'beta', newRelease: [{in: 'catalog'}]});
            S.P.ids.three = await book(P, 3, 'K1P Plain Three', '2024-03-10', {});
            S.P.ids.draft = (await post('scenarios/submission', {tag: `${P}b4`, context: P, submitter: `${P}au`, title: 'K1P Draft Four', series: 'alpha', submitted: true})).submissionId;
            for (const X of ['R', 'D']) S[X].ids = {one: await book(S[X].P, 1, `K1${X} Alpha One`, '2024-01-10', {series: 'alpha', featured: [{in: 'catalog', position: 1}], newRelease: [{in: 'catalog'}]})};
            S.Q.ids = {};
            for (const [i, n, d] of [[1, 'Oak', '2024-01-10'], [2, 'Pine', '2024-02-10'], [3, 'Elm', '2024-03-10']]) S.Q.ids[n] = await book(S.Q.P, i, `K1Q ${n}`, d, {newRelease: [{in: 'catalog'}]});
            S.seeded = true;
            save();
            note(`ccK1 [omp] seed: presses ${['P', 'R', 'D', 'N', 'Q'].map((X) => `${X} ${S[X].P}`).join(', ')}; ids ${JSON.stringify({P: S.P.ids, R: S.R.ids, D: S.D.ids, Q: S.Q.ids})}`);
            log('seeded', JSON.stringify(S));
        }
        const P = S.P && S.P.P;

        // ============================================================ purpose: P as a visitor
        if (on('purpose')) await sect('purpose', async () => {
            const out = {};
            out.home = brief(await read('p-01-home', cu(P)));
            const cat = await read('p-02-catalog', cu(P, '/catalog'));
            out.catalog = {...brief(cat), summaries: cat.lists};
            out.alpha = brief(await read('p-03-series-alpha', cu(P, '/catalog/series/alpha')));
            out.nr = brief(await read('p-04-newreleases', cu(P, '/catalog/newReleases')));
            // the summary's title and cover lead to the book's page
            await vis.goto(cu(P, '/catalog')); await idle(vis);
            const a = vis.locator('.obj_monograph_summary .title a', {hasText: 'K1P Alpha One'}).first();
            await loc(vis, 'catalog: a summary\'s title link', a);
            await a.click(); await idle(vis);
            const bk = await vis.evaluate(PAGE);
            out.bookFromTitle = {url: bk.url, h1: bk.h1, seriesLinks: bk.seriesLinks};
            await snap(vis, 'p-05-book-page');
            // a category's page is not in this press (the Purpose's pointer); the categories list of the press
            fact('purpose', out);
        });

        // ============================================================ roles: P as each permission level
        if (on('roles')) await sect('roles', async () => {
            const out = {};
            const who = [[null, 'visitor'], ['admin', 'admin'], [`${P}mg`, 'manager'], [`${P}se`, 'seriesEditor'], [`${P}ce`, 'copyeditor'], [`${P}rv`, 'reviewer'], [`${P}au`, 'author'], [`${P}rd`, 'reader'], ['reader.rosa', 'nonMember']];
            for (const [u, label] of who) {
                await as(u, P);
                const r = {};
                for (const [k, p] of [['home', ''], ['catalog', '/catalog'], ['alpha', '/catalog/series/alpha'], ['nr', '/catalog/newReleases']]) {
                    const o = await read(`r-${label}-${k}`, cu(P, p), page);
                    r[k] = {status: o.status, url: o.url, lists: brief(o).lists, count: o.count, controls: o.mainControls, backOffice: o.backOfficeLinks, user: o.user, fails: o.fails};
                }
                out[label] = r;
            }
            await as(null);
            fact('roles', out);
        });

        // ============================================================ reach: N as it arrives; P's menu items, links
        if (on('reach')) await sect('reach', async () => {
            const out = {};
            const N = S.N.P;
            for (const [k, p] of [['home', ''], ['catalog', '/catalog'], ['about', '/about'], ['search', '/search'], ['nr', '/catalog/newReleases']]) {
                const o = await read(`h-01-new-${k}`, cu(N, p));
                out[`new_${k}`] = {status: o.status, url: o.url, primary: o.primary, newReleaseLinks: o.newReleaseLinks, sidebar: o.sidebar, block: o.block, count: o.count, crumbs: o.crumbs, header: o.header};
            }
            await vis.goto(cu(N)); await idle(vis);
            const catItem = vis.locator('#navigationPrimary > li > a', {hasText: 'Catalog'}).first();
            await loc(vis, 'header: the "Catalog" item', catItem);
            await catItem.click(); await idle(vis);
            out.new_catalogPressed = {url: strip(vis.url()), title: await vis.title()};
            await snap(vis, 'h-02-new-catalog-pressed');
            // N's manager: the menus, the sidebar, the block's row
            await as(`${N}mg`, N);
            out.new_nav = await itemTypes(N);
            await page.goto(cu(N, '/management/settings/website')); await idle(page);
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page); await sleep(500);
            await page.locator('#appearance-setup-button').first().click().catch(() => {}); await idle(page); await sleep(700);
            out.new_sidebar = await page.locator('[role="tabpanel"]#appearance-setup').first().evaluate((r) => {
                const g = [...r.querySelectorAll('fieldset')].find((f) => /Sidebar/.test(f.innerText));
                return g ? g.innerText.replace(/\s+/g, ' ').trim().slice(0, 600) : r.innerText.replace(/\s+/g, ' ').trim().slice(0, 600);
            }).catch((e) => String(e.message));
            await snap(page, 'h-03-new-appearance-setup');
            await page.goto(cu(N, '/management/settings/website')); await idle(page);
            await page.locator('#plugins-button').first().click().catch(() => {}); await idle(page); await sleep(700);
            const row = page.locator('tr.gridRow[id$="-row-browseblockplugin"]').first();
            await row.waitFor({timeout: T}).catch(() => {});
            out.new_blockRow = (await row.count()) ? await row.evaluate((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').trim(), enabled: (tr.querySelector('input[type=checkbox]') || {}).checked})) : 'absent';
            await snap(page, 'h-04-new-plugins');
            await as(null);

            // P: the catalog's "Series:" links, the block's lines, the book page's series link
            const cat = await read('h-05-p-catalog', cu(P, '/catalog'));
            out.p_seriesNav = cat.seriesNav; out.p_block = cat.block;
            const bk = await read('h-06-p-book-one', cu(P, `/catalog/book/${S.P.ids.one}`));
            out.p_bookSeriesLinks = bk.seriesLinks;
            if (bk.seriesLinks && bk.seriesLinks.length) {
                await vis.locator('.pkp_structure_main a[href*="catalog/series/"]').first().click(); await idle(vis);
                out.p_bookSeriesPressed = {url: strip(vis.url()), title: await vis.title()};
            }
            // the block's "New Releases" and a series line pressed
            for (const [k, sel] of [['blockNR', '.block_browse a[href*="catalog/newReleases"]'], ['blockSeries', '.block_browse a[href*="catalog/series/alpha"]']]) {
                await vis.goto(cu(P, '/catalog')); await idle(vis);
                const l = vis.locator(sel).first();
                if (!(await l.count())) { out[k] = 'absent'; continue; }
                await l.click(); await idle(vis);
                out[k] = {url: strip(vis.url()), title: await vis.title()};
            }
            // P's manager adds a "Series" (Alpha) and a "New Releases" item to the primary menu
            const L = require('../../U08/K2/lib');
            await as(`${P}mg`, P);
            await L.openNav(page, app, P);
            await L.openItemWindow(page, 'add');
            await L.fillTitle(page, 'K1 Series Alpha');
            await L.setType(page, 'Series');
            await L.itemWindow(page).locator('select[name="relatedSeriesId"]').selectOption({label: 'Alpha'});
            out.addSeries = await L.itemSave(page);
            if (out.addSeries.windowOpen) await L.closeItemWindow(page);
            await sleep(700);
            out.addNR = await L.addItem(page, 'K1 New Releases', 'New Releases'); await sleep(700);
            await L.openNav(page, app, P);
            await L.openMenu(page, 'Primary Navigation Menu');
            for (const ti of ['K1 New Releases', 'K1 Series Alpha']) out[`assign_${ti}`] = await L.assignTop(page, ti);
            out.menuSave = await L.saveMenu(page);
            await as(null);
            out.pressed = {};
            for (const ti of ['K1 Series Alpha', 'K1 New Releases', 'Catalog']) {
                await vis.goto(cu(P)); await idle(vis);
                const a = vis.locator('#navigationPrimary > li > a').filter({hasText: new RegExp(`^\\s*${ti}\\s*$`)}).first();
                if (!(await a.count())) { out.pressed[ti] = 'absent'; continue; }
                await a.click(); await idle(vis);
                out.pressed[ti] = {url: strip(vis.url()), title: await vis.title()};
                await snap(vis, `h-07-pressed-${ti.replace(/\W+/g, '-')}`);
            }
            fact('reach', out);
        });

        // ============================================================ unknown: series addresses (P)
        if (on('unknown')) await sect('unknown', async () => {
            const out = {};
            for (const [k, p] of [['nope', '/catalog/series/nope'], ['none', '/catalog/series'], ['slash', '/catalog/series/'], ['otherPress', '/catalog/series/monographs'], ['upper', '/catalog/series/ALPHA'], ['nopePage2', '/catalog/series/nope/2']]) {
                const o = await read(`u-01-${k}`, cu(P, p));
                out[k] = {status: o.status, url: o.url, docTitle: o.docTitle, h1: o.h1, count: o.count, notices: o.notices, lists: brief(o).lists, paras: o.paras.slice(0, 2)};
            }
            // Beta's path changed on Settings › Press › Series, then its old address
            const {SectionsTab} = require(path.resolve(__dirname, '../../../pages/SectionsPages.js'));
            await as(`${P}mg`, P);
            const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
            await tab.goto();
            const win = await tab.openEdit('Beta');
            await win.box('path').fill('beta2');
            out.pathSave = (await win.save()).status();
            await sleep(1000);
            await as(null);
            for (const [k, p] of [['oldBeta', '/catalog/series/beta'], ['newBeta', '/catalog/series/beta2']]) {
                const o = await read(`u-02-${k}`, cu(P, p));
                out[k] = {status: o.status, url: o.url, docTitle: o.docTitle, count: o.count, notices: o.notices, lists: brief(o).lists};
            }
            fact('unknown', out);
        });

        // ============================================================ td6: Q at IPP 1 with three new releases
        if (on('td6')) await sect('td6', async () => {
            const out = {};
            const Q = S.Q.P;
            const o = await read('q-01-newreleases', cu(Q, '/catalog/newReleases'));
            out.before = brief(o); out.beforePag = o.pagination;
            const o2 = await read('q-01b-newreleases-page2', cu(Q, '/catalog/newReleases/2'));
            out.page2 = {status: o2.status, url: o2.url, count: o2.count, lists: brief(o2).lists};
            await as(`${Q}mg`, Q);
            await page.goto(cu(Q, '/manageCatalog')); await idle(page);
            await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await snap(page, 'q-02-manage-catalog');
            out.untick = [];
            for (const n of ['Oak', 'Pine', 'Elm']) {
                const it = page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: `K1Q ${n}`})});
                const btn = it.getByRole('button', {name: NEW_ON, exact: true});
                if (!(await btn.count())) { out.untick.push({n, box: 'absent'}); continue; }
                const w = page.waitForResponse((x) => /saveDisplayFlags/.test(x.url()), {timeout: T}).catch(() => null);
                await btn.click();
                const x = await w; await idle(page);
                out.untick.push({n, status: x ? x.status() : null});
            }
            await as(null);
            const a = await read('q-03-newreleases-after', cu(Q, '/catalog/newReleases'));
            out.after = brief(a);
            await vis.reload(); await idle(vis);
            await snap(vis, 'q-04-newreleases-after-reload');
            const b = await vis.evaluate(PAGE);
            out.afterReload = {count: b.count, paras: b.paras, lists: brief(b).lists};
            fact('td6', out);
        });

        // ============================================================ stats: the usage log and the mail (P)
        if (on('stats')) await sect('stats', async () => {
            const cfg = fs.readFileSync(app.configFile || path.join(app.root, 'config.test.inc.php'), 'utf8');
            const dir = path.join(cfg.match(/^files_dir\s*=\s*(.+)$/m)[1].trim(), 'usageStats', 'usageEventLogs');
            const lines = () => {
                try {
                    return fs.readdirSync(dir).filter((f) => /^usage_events_\d{8}\.log$/.test(f)).sort().flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean));
                } catch (e) { return []; }
            };
            const out = {dir, logFiles: (() => { try { return fs.readdirSync(dir); } catch (e) { return String(e.message); } })()};
            const mail0 = await app.mail.count({to: P}).catch((e) => `err ${e.message}`);
            for (const [k, p] of [['home', ''], ['catalog', '/catalog'], ['alpha', '/catalog/series/alpha'], ['nr', '/catalog/newReleases'], ['unknownSeries', '/catalog/series/nope']]) {
                const n0 = lines().length;
                await read(`s-01-${k}`, cu(P, p));
                await sleep(800);
                out[k] = lines().slice(n0).map((l) => { try { const j = JSON.parse(l); return {assocType: j.assocType, contextId: j.contextId, submissionId: j.submissionId, seriesId: j.seriesId, url: strip(j.canonicalUrl)}; } catch (e) { return flat(l, 200); } });
            }
            await sleep(1500);
            out.mail = {before: mail0, after: await app.mail.count({to: P}).catch((e) => `err ${e.message}`)};
            fact('stats', out);
        });

        // ============================================================ access: R closed on screen
        if (on('access')) await sect('access', async () => {
            const out = {};
            const R = S.R.P;
            const pages = [['home', ''], ['catalog', '/catalog'], ['alpha', '/catalog/series/alpha'], ['nr', '/catalog/newReleases'], ['catalog2', '/catalog/page/2'], ['book', `/catalog/book/${S.R.ids.one}`]];
            const sweep = async (label, p) => {
                const r = {};
                for (const [k, x] of pages) { const o = await read(`a-${label}-${k}`, cu(R, x), p); r[k] = {status: o.status, url: o.url, login: o.loginForm, h1: o.h1, lists: brief(o).lists, fails: o.fails}; }
                return r;
            };
            out.openBefore = await sweep('before', vis);
            await as(`${R}mg`, R);
            const openTab = async () => {
                await page.goto(cu(R, '/management/settings/access')); await idle(page);
                await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click(); await idle(page); await sleep(600);
            };
            await openTab();
            const box = page.getByRole('checkbox', {name: /Users must be registered and log in to view the press site\./});
            await loc(page, 'Users & Roles › Site Access Options: the "…to view the press site." box', box);
            out.tabs = (await page.getByRole('tab').allInnerTexts()).map((x) => flat(x, 60));
            out.label = await box.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            out.checkedAsOpens = await box.isChecked();
            out.formText = flat(await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 800);
            await snap(page, 'a-01-site-access-as-opens');
            // ticked and left unsaved: another tab, then another page
            await box.check();
            const d0 = jsDialogs.length;
            await page.getByRole('tab', {name: 'Roles', exact: true}).click().catch(() => {}); await idle(page); await sleep(500);
            out.leaveTab = {dialogs: jsDialogs.slice(d0), shownTab: flat(await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 60)};
            await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click(); await idle(page); await sleep(400);
            out.backOnTabChecked = await box.isChecked().catch(() => null);
            const d1 = jsDialogs.length;
            await page.goto(cu(R, '/management/settings/website')).catch((e) => { out.leavePageErr = flat(e.message, 200); });
            await idle(page);
            out.leavePage = {dialogs: jsDialogs.slice(d1), url: strip(page.url())};
            await openTab();
            out.afterLeaveChecked = await box.isChecked();
            await snap(page, 'a-02-site-access-after-unsaved-leave');
            // saved
            const L = require('../../U08/K2/lib');
            await box.check();
            out.save = await L.saveForm(page, 'input[name="restrictSiteAccess"]');
            out.savedSamePage = await box.isChecked();
            await snap(page, 'a-03-site-access-saved');
            await openTab();
            out.savedAfterReload = await box.isChecked();
            await as(null);
            out.closedVisitor = await sweep('closed-visitor', vis);
            await as(`${R}rd`, R);
            out.closedReader = await sweep('closed-reader', page);
            await as(`${R}mg`, R);
            out.closedManager = await sweep('closed-manager', page);
            await as('reader.rosa', R);
            out.closedNonMember = await sweep('closed-nonmember', page);
            await as(null);
            // the login page's source: sign in there as the reader and see where it lands
            await vis.goto(cu(R, '/catalog/series/alpha')); await idle(vis);
            out.loginUrl = strip(vis.url());
            fact('access', out);
        });

        // ============================================================ enable: D un-enabled by the admin
        if (on('enable')) await sect('enable', async () => {
            const out = {};
            const D = S.D.P;
            const pages = [['home', ''], ['catalog', '/catalog'], ['alpha', '/catalog/series/alpha'], ['nr', '/catalog/newReleases']];
            const sweep = async (label, p) => {
                const r = {};
                for (const [k, x] of pages) { const o = await read(`e-${label}-${k}`, cu(D, x), p); r[k] = {status: o.status, url: o.url, login: o.loginForm, h1: o.h1, lists: brief(o).lists, notices: o.notices, fails: o.fails}; }
                return r;
            };
            await as('admin', 'index');
            const openEdit = async (name) => {
                await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page); await sleep(400);
                const row = page.locator('tr.gridRow').filter({hasText: name}).first();
                await row.locator('a.show_extras').click(); await idle(page); await sleep(300);
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
                await cb.waitFor({timeout: T});
                await sleep(500);
                return cb;
            };
            const pk = await openEdit('Public Knowledge Press');
            out.pk = {label: await pk.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await pk.isChecked()};
            await snap(page, 'e-01-pk-hosted-edit');
            await loc(page, 'Hosted Presses › Edit: "Enable this press to appear publicly on the site"', pk);
            await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Cancel)$/}).first().click().catch(() => {});
            await sleep(800);
            let box = await openEdit(`K1 Press D`);
            out.dBefore = await box.isChecked();
            // unticked, then the window closed unsaved
            await box.uncheck();
            const d0 = jsDialogs.length;
            const dlg = () => page.locator('[role="dialog"]:visible').filter({has: page.getByRole('checkbox', {name: /appear publicly/})}).last();
            out.closeButtons = await dlg().getByRole('button').allInnerTexts().then((a) => a.map((x) => flat(x, 40)).filter(Boolean)).catch(() => []);
            await dlg().getByRole('button', {name: /^Close/}).first().click().catch(async () => { await page.keyboard.press('Escape'); });
            await sleep(1000);
            out.closeUnsaved = {dialogs: jsDialogs.slice(d0), windowStillOpen: await dlg().count(), confirm: flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 300)};
            await snap(page, 'e-02-d-closed-unsaved');
            box = await openEdit('K1 Press D');
            out.dAfterUnsaved = await box.isChecked();
            await box.uncheck();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg().getByRole('button', {name: 'Save', exact: true}).click();
            const resp = await w;
            out.save = {status: resp ? resp.status() : null};
            await sleep(1500); await idle(page);
            out.save.errors = await page.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await snap(page, 'e-03-d-saved');
            box = await openEdit('K1 Press D');
            out.dAfterReload = await box.isChecked();
            await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Cancel)$/}).first().click().catch(() => {});
            await as(null);
            out.visitor = await sweep('closed-visitor', vis);
            await as(`${D}rd`, D);
            out.reader = await sweep('closed-reader', page);
            await as(`${D}mg`, D);
            out.manager = await sweep('closed-manager', page);
            await as(null);
            fact('enable', out);
        });

        // ============================================================ settings: Actors row 3 (P)
        if (on('settings')) await sect('settings', async () => {
            const out = {};
            await as(`${P}mg`, P);
            await page.goto(cu(P, '/management/settings/website')); await idle(page);
            await page.locator('#plugins-button').first().click(); await idle(page); await sleep(800);
            const row = page.locator('tr.gridRow[id$="-row-browseblockplugin"]').first();
            await row.waitFor({timeout: T});
            out.row = flat(await row.innerText(), 200);
            await row.locator('a.show_extras').first().click(); await sleep(600);
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            out.rowControls = (await ctl.locator('a').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
            await ctl.getByRole('link', {name: 'Settings', exact: true}).click();
            await page.locator('[role="dialog"]:visible input[type=checkbox]').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(600);
            out.window = flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 500);
            await snap(page, 'g-01-browse-settings-window');
            await page.locator('[role="dialog"]:visible').last().getByRole('link', {name: 'Cancel'}).first().click().catch(async () => {
                await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /Close|Cancel/}).first().click().catch(() => {});
            });
            await sleep(600);
            const r1 = await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
            out.managerTypesAdmin = {status: r1 && r1.status(), url: strip(page.url()), text: flat(await page.locator('body').innerText(), 300)};
            await snap(page, 'g-02-manager-types-admin');
            await as(`${P}se`, P);
            for (const [k, x] of [['website', '/management/settings/website'], ['access', '/management/settings/access'], ['manageCatalog', '/manageCatalog']]) {
                const r = await page.goto(cu(P, x)); await idle(page);
                out[`seriesEditor_${k}`] = {status: r && r.status(), url: strip(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 100), text: flat(await page.locator('body').innerText(), 250)};
                await snap(page, `g-03-series-editor-${k}`);
            }
            await as(null);
            fact('settings', out);
        });
    } finally {
        fact('dialogs', jsDialogs);
        fact('fails', fails);
        await mg.close().catch(() => {});
        await vs.close().catch(() => {});
    }
});
