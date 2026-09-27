// U57 claim check, chunk K3: reading in a language.
// The sidebar "Language" block (Fields, Rule 19, Settings 1-3, A3), "Change Language" in the
// initials menu (Fields, Rule 20), addresses with a language (Rule 17), which language a page
// opens in (Rule 18, Settings 5: the browser's preferred language, the remembered choice),
// what follows the reading language (Rule 21, 21a, A4), the cross-feature pointers that carry
// a screen ("Working Languages", the fallback to the primary language).
//
// Run: PROBE_FEATURE=U57 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U57/K3/k3.js
// Phases (PHASES=a,b,...; default all): seed block addr remember pref change hash follow plugin site profile
// Scratch journals (tag prefix u57k3):
//   A  English + French under "UI" and "Forms", Language Toggle Block placed, description in
//      English only, throwaway users at every roster level, one submitted submission
//   B  English alone, the block placed (one-language end)
//   C  English + French under "UI", nothing placed (the default "Sidebar")
//   D  English + French, the block placed: its plugin disabled and enabled again (Settings 2)
//   E  French (Canada) primary, English + French under "UI" (Rule 18's last step)
// The site's own "Sidebar" is ticked and unticked again in phase `site` (put back in finally).
// Nothing here changes the site's languages.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : null;
const on = (p) => !PHASES || PHASES.includes(p);

const stateFile = (app) => path.join(outDir(), `state-${app.name}.json`);
const loadState = (app) => (fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : {});
const saveState = (app, st) => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));

// ---- readers -------------------------------------------------------------------------------
/** The public page as data: language, direction, the Language block, the sidebar, raw keys. */
async function publicRead(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const b = document.querySelector('.block_language');
        const side = document.querySelector('.pkp_structure_sidebar');
        const body = document.body ? document.body.innerText : '';
        return {
            url: location.href.replace(/^https?:\/\/[^/]+/, ''),
            lang: document.documentElement.lang,
            dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
            title: document.title,
            h1: txt(document.querySelector('h1')),
            nav: [...document.querySelectorAll('#navigationPrimary > li > a')].map(txt),
            userNav: [...document.querySelectorAll('#navigationUser a')].map(txt),
            block: b ? {
                heading: txt(b.querySelector('h2, .title')),
                items: [...b.querySelectorAll('li')].map((li) => {
                    const a = li.querySelector('a');
                    const cs = a ? getComputedStyle(a) : null;
                    return {text: txt(a), href: a ? a.getAttribute('href') : null, cls: li.className, lang: li.getAttribute('lang'),
                        ariaCurrent: a ? a.getAttribute('aria-current') : null, fontWeight: cs ? cs.fontWeight : null, decoration: cs ? cs.textDecorationLine : null, color: cs ? cs.color : null};
                }),
            } : null,
            sidebarBlocks: side ? [...side.querySelectorAll('.pkp_block')].map((x) => x.className) : null,
            sidebarLeft: side ? Math.round(side.getBoundingClientRect().left) : null,
            rawKeys: [...new Set(body.match(/##[^#\s]+##/g) || [])],
            alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => `${l.getAttribute('hreflang')} ${l.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}`),
            langLinks: [...document.querySelectorAll('a')].filter((a) => /setLocale/.test(a.getAttribute('href') || '')).length,
            sampleLinks: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '').filter((h) => /index\.php/.test(h)).slice(0, 12).map((h) => h.replace(/^https?:\/\/[^/]+/, '')),
        };
    }).catch((e) => ({error: String(e).slice(0, 200)}));
}

/** The editorial screen as data: language, the side menu's first entries, headings, raw keys. */
async function edRead(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const nav = document.querySelector('nav#app-nav') || document.querySelector('nav[aria-label="Site Navigation"]') || document.querySelector('nav[aria-label="Navigation du site"]');
        const body = document.body ? document.body.innerText : '';
        const links = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '').filter((h) => /index\.php\//.test(h));
        return {
            url: location.href.replace(/^https?:\/\/[^/]+/, ''),
            lang: document.documentElement.lang,
            dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map(txt).filter(Boolean).slice(0, 3),
            navFirst: nav ? [...nav.querySelectorAll('[data-pc-section="header"], [role="treeitem"]')].map((e) => e.getAttribute('aria-label') || txt(e)).filter(Boolean).slice(0, 6) : null,
            rawKeys: [...new Set(body.match(/##[^#\s]+##/g) || [])],
            linksWithLocale: links.filter((h) => /index\.php\/[^/]+\/(en|fr_CA)(\/|$|\?)/.test(h)).length,
            linksWithoutLocale: links.filter((h) => !/index\.php\/[^/]+\/(en|fr_CA)(\/|$|\?)/.test(h)).slice(0, 8).map((h) => h.replace(/^https?:\/\/[^/]+/, '')),
        };
    }).catch((e) => ({error: String(e).slice(0, 200)}));
}

/** Open the initials menu; return its entries. Leaves it open. */
async function openInitials(page, root = null) {
    root = root || page;
    const btn = root.locator('[data-cy="app-user-nav"] button').first();
    if (!(await btn.count())) return {present: false};
    const name = await btn.evaluate((b) => b.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
    await btn.click().catch(() => {});
    await sleep(600);
    const menu = root.locator('[data-cy="app-user-nav"] nav').first();
    const info = await menu.evaluate((n) => ({
        label: n.getAttribute('aria-label'),
        text: n.innerText.replace(/\n+/g, ' | '),
        firstLine: n.innerText.split('\n').map((s) => s.trim()).filter(Boolean)[0] || null,
        links: [...n.querySelectorAll('a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), ticked: !!a.querySelector('svg'), lang: a.getAttribute('lang')})),
    })).catch((e) => ({error: String(e).slice(0, 200)}));
    return {present: true, name, ...info};
}

forEachApp(async (app) => {
    const st = loadState(app);
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    const url = (ctx, p = '', locale = 'en') => app.url(`/index.php/${ctx}${locale ? '/' + locale : ''}${p}`);
    const bare = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const PK = app.contextPath;
    const hasReviewer = app.name !== 'ops';
    const asstRole = app.name === 'ops' ? 'editorialBoardMember' : 'copyeditor';

    // ---- seed ------------------------------------------------------------------------------
    if (on('seed') && !st.A) {
        const A = tag('u57k3a');
        const users = (t) => [
            {username: `${t}mgr`, roles: ['manager']},
            {username: `${t}sub`, roles: ['sectionEditor']},
            {username: `${t}ast`, roles: [asstRole]},
            ...(hasReviewer ? [{username: `${t}rev`, roles: ['externalReviewer']}] : []),
            {username: `${t}au`, roles: ['author']},
            {username: `${t}rd`, roles: ['reader']},
        ];
        const rA = await app.api.createContext({tag: A, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], description: 'K3 English-only description.'},
            sidebar: ['languagetoggleblockplugin'], users: users(A)});
        fact('seed-A', {tag: A, ok: !!rA});
        let sub = null;
        const subSpec = {tag: A, context: A, submitter: `${A}au`, title: `K3 submission ${A}`, participants: [{username: `${A}sub`, role: 'sectionEditor'}]};
        if (hasReviewer) {
            try {
                sub = await app.api.createSubmission({...subSpec, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${A}rev`, status: 'accepted'}]}]});
            } catch (e) { fact('seed-sub-review-error', String(e).slice(0, 300)); }
        }
        if (!sub) sub = await app.api.createSubmission(subSpec);
        const sid = sub && (sub.id || sub.submissionId || (sub.submission && sub.submission.id));
        fact('seed-sub', {sid, keys: sub ? Object.keys(sub) : null});
        const B = tag('u57k3b');
        await app.api.createContext({tag: B, context: {supportedLocales: ['en']}, sidebar: ['languagetoggleblockplugin'], users: [{username: `${B}mgr`, roles: ['manager']}, {username: `${B}rd`, roles: ['reader']}]});
        const C = tag('u57k3c');
        await app.api.createContext({tag: C, context: {supportedLocales: ['en', 'fr_CA']}, users: [{username: `${C}mgr`, roles: ['manager']}]});
        const D = tag('u57k3d');
        await app.api.createContext({tag: D, context: {supportedLocales: ['en', 'fr_CA']}, sidebar: ['languagetoggleblockplugin'], users: [{username: `${D}mgr`, roles: ['manager']}]});
        const E = tag('u57k3e');
        let eOk = true;
        try {
            await app.api.createContext({tag: E, context: {primaryLocale: 'fr_CA', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, sidebar: ['languagetoggleblockplugin'], users: [{username: `${E}mgr`, roles: ['manager']}]});
        } catch (e) { eOk = false; fact('seed-E-error', String(e).slice(0, 400)); }
        Object.assign(st, {A, B, C, D, E: eOk ? E : null, sid});
        saveState(app, st);
        fact('state', st);
    }

    const snapN = async (page, name, extra = {}, png = true) => {
        const s = await screen(page).catch((e) => ({error: String(e)}));
        record(name, {...s, extra});
        if (png) await shot(page, name).catch(() => {});
        return s;
    };
    const go = async (page, u) => {
        let status = null;
        try { const r = await page.goto(u); status = r ? r.status() : null; } catch (e) { status = String(e.message || e).slice(0, 120); }
        await idle(page).catch(() => {});
        return status;
    };

    // ---- block: the sidebar Language block (Fields 105-108, Rule 19, Settings 1, A3) --------
    if (on('block')) {
        const {page, close} = await launch(app);
        try {
            const A = st.A;
            const pages = [['home', ''], ['about', '/about'], ['search', '/search'], ['login', '/login'], ['register', '/user/register'], ['announcements', '/announcement']];
            if (app.name === 'ojs') pages.push(['archive', '/issue/archive']);
            if (app.name === 'omp') pages.push(['catalog', '/catalog']);
            const seen = {};
            for (const [k, p] of pages) {
                const status = await go(page, url(A, p));
                seen[k] = {status, ...(await publicRead(page))};
                if (k === 'about' || k === 'home') await snapN(page, `b-01-A-${k}-en`, {read: seen[k]});
            }
            fact('block-A-pages-en', Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, {status: v.status, url: v.url, lang: v.lang, block: v.block, sidebar: v.sidebarBlocks}])));
            await go(page, url(A, '/about'));
            await loc(page, 'public sidebar: the Language block', page.locator('.block_language'));
            await loc(page, 'Language block: the "français" link', page.locator('.block_language').getByRole('link', {name: 'français', exact: true}));
            await loc(page, 'Language block: the current language item (li.current)', page.locator('.block_language li.current'));
            // how the current language is marked: the block as a picture, and every computed style that differs
            await page.locator('.block_language').screenshot({path: path.join(outDir(), `b-10-block-crop-${app.name}.png`)}).catch(() => {});
            fact('block-current-style-diff', await page.evaluate(() => {
                const lis = [...document.querySelectorAll('.block_language li')];
                const cur = lis.find((l) => l.classList.contains('current'));
                const oth = lis.find((l) => !l.classList.contains('current'));
                if (!cur || !oth) return null;
                const diff = (a, b) => { const x = getComputedStyle(a); const y = getComputedStyle(b); const o = {}; for (const k of x) { if (x.getPropertyValue(k) !== y.getPropertyValue(k)) o[k] = [x.getPropertyValue(k), y.getPropertyValue(k)]; } return o; };
                const before = (e) => getComputedStyle(e, '::before').content + ' / ' + getComputedStyle(e, '::after').content;
                return {li: diff(cur, oth), a: diff(cur.querySelector('a'), oth.querySelector('a')), pseudo: [before(cur), before(oth), before(cur.querySelector('a')), before(oth.querySelector('a'))]};
            }));
            // choose français from About
            const fr = page.locator('.block_language').getByRole('link', {name: /fran|French/i}).first();
            const href = await fr.getAttribute('href').catch(() => null);
            await fr.click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            const landed = await publicRead(page);
            await snapN(page, 'b-02-A-about-chose-fr', {href, landed});
            fact('block-choose-fr-from-about', {href: rel(href), landed: {url: landed.url, lang: landed.lang, h1: landed.h1, title: landed.title, block: landed.block}});
            // then the journal's home, bare
            await go(page, bare(A));
            const homeAfter = await publicRead(page);
            await snapN(page, 'b-03-A-home-after-fr', {homeAfter});
            fact('block-home-after-fr', {url: homeAfter.url, lang: homeAfter.lang, block: homeAfter.block, nav: homeAfter.nav});
            // in French: the block marks français; choose English from the French About
            await go(page, url(A, '/about', 'fr_CA'));
            const aboutFr = await publicRead(page);
            const en = page.locator('.block_language').getByRole('link', {name: /English/}).first();
            const enHref = await en.getAttribute('href').catch(() => null);
            await en.click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            const landedEn = await publicRead(page);
            fact('block-choose-en-from-fr-about', {before: {url: aboutFr.url, lang: aboutFr.lang, block: aboutFr.block}, href: rel(enHref), landed: {url: landedEn.url, lang: landedEn.lang}});
            await snapN(page, 'b-04-A-fr-about-chose-en', {aboutFr, landedEn}, false);
            // from the login page and from a search with a query
            await go(page, url(A, '/search/search?query=test'));
            const sq = page.locator('.block_language').getByRole('link', {name: /fran|French/i}).first();
            const sqHref = await sq.getAttribute('href').catch(() => null);
            await sq.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page);
            fact('block-choose-fr-from-search', {href: rel(sqHref), landed: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang)});
            await go(page, url(A, '/about', 'en'));
            // signed in as the reader: the same block
            await signIn(page, `${A}rd`, {contextPath: A}); await idle(page);
            await go(page, url(A, '/about'));
            const rdRead = await publicRead(page);
            await snapN(page, 'b-05-A-about-reader', {rdRead});
            fact('block-signed-in-reader', {url: rdRead.url, block: rdRead.block, userNav: rdRead.userNav});
            await signOut(page).catch(() => {});
            // B: one interface language, block placed
            await go(page, bare(B()));
            const bHome = await publicRead(page);
            await snapN(page, 'b-06-B-home-one-language', {bHome});
            await go(page, bare(B(), '/about'));
            const bAbout = await publicRead(page);
            fact('block-B-one-language', {home: {url: bHome.url, block: bHome.block, sidebar: bHome.sidebarBlocks}, about: {url: bAbout.url, block: bAbout.block, sidebar: bAbout.sidebarBlocks}});
            // C: two interface languages, nothing placed
            await go(page, url(st.C, '/about'));
            const cAbout = await publicRead(page);
            await snapN(page, 'b-07-C-about-not-placed', {cAbout});
            fact('block-C-not-placed', {url: cAbout.url, block: cAbout.block, sidebar: cAbout.sidebarBlocks});
            // publicknowledge as it stands (the canonical preamble's visitor scenarios)
            await go(page, bare(PK));
            const pkHome = await publicRead(page);
            await snapN(page, 'b-08-publicknowledge-home', {pkHome});
            fact('block-publicknowledge', {url: pkHome.url, block: pkHome.block, sidebar: pkHome.sidebarBlocks});
            // public header: any other language control
            fact('public-header-language-controls', {A: seen.home.userNav, langLinksOnHome: seen.home.langLinks});
            // Settings 1: C's manager, Appearance › Setup "Sidebar" as it arrives
            await signIn(page, `${st.C}mgr`, {contextPath: st.C}); await idle(page);
            await go(page, url(st.C, '/management/settings/website'));
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(800);
            const sidebarC = await page.locator('#appearance-setup input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim()})));
            await snapN(page, 'b-09-C-appearance-setup-sidebar', {sidebarC});
            await loc(page, 'Appearance › Setup: the "Language Toggle Block" sidebar box', page.locator('#appearance-setup input[name="sidebar"][value="languagetoggleblockplugin"]'));
            fact('settings1-C-sidebar-arrival', sidebarC);
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }
    function B() { return st.B; }

    // ---- addr: addresses carry the language (Rule 17), the remembered choice (Rule 18) -----
    if (on('addr')) {
        const {page, context, close} = await launch(app);
        try {
            const r = {};
            const hop = async (k, u) => { const status = await go(page, u); const pr = await publicRead(page); r[k] = {asked: rel(u), status, url: pr.url, lang: pr.lang, h1: pr.h1}; return pr; };
            await hop('pk-bare-home-fresh', bare(PK));
            await snapN(page, 'a-01-pk-bare-fresh', {}, true);
            const pkHomeLinks = await publicRead(page);
            r['pk-home-links'] = pkHomeLinks.sampleLinks; r['pk-alternates'] = pkHomeLinks.alternates;
            await hop('pk-fr-about', url(PK, '/about', 'fr_CA'));
            await snapN(page, 'a-02-pk-fr-about', {}, true);
            await hop('pk-bare-home-after-fr', bare(PK));
            await hop('pk-bare-about-after-fr', bare(PK, '/about'));
            await hop('pk-en-about-address-over-remembered', url(PK, '/about', 'en'));
            await hop('pk-bare-after-en', bare(PK, '/about'));
            await hop('pk-de-about', url(PK, '/about', 'de'));
            await hop('pk-es-home', url(PK, '', 'es'));
            await snapN(page, 'a-03-pk-de-about', {}, true);
            await hop('pk-fr_FR-about', url(PK, '/about', 'fr_FR'));
            await hop('pk-xx-about', url(PK, '/about', 'xx'));
            // one-language B
            await hop('B-bare-about', bare(st.B, '/about'));
            const bl = await publicRead(page); r['B-links'] = bl.sampleLinks;
            await hop('B-en-about', url(st.B, '/about', 'en'));
            await snapN(page, 'a-04-B-en-about', {}, true);
            await hop('B-fr-about', url(st.B, '/about', 'fr_CA'));
            await hop('B-de-about', url(st.B, '/about', 'de'));
            // the site's own pages
            await hop('site-bare', bare('index'));
            const sl = await publicRead(page); r['site-links'] = sl.sampleLinks;
            await snapN(page, 'a-05-site-bare', {}, true);
            await hop('site-fr', url('index', '', 'fr_CA'));
            await hop('site-bare-after-fr', bare('index'));
            // 17c with a remembered French: a language code the journal lacks
            await hop('A-fr-about-2', url(st.A, '/about', 'fr_CA'));
            await hop('A-de-about-after-fr', url(st.A, '/about', 'de'));
            await hop('A-ja-home-after-fr', url(st.A, '', 'ja'));
            await page.close();
            const p2 = await context.newPage();
            // editorial addresses carry the language (A's manager)
            await signIn(p2, `${st.A}mgr`, {contextPath: st.A}); await idle(p2);
            await p2.goto(url(st.A, '/dashboard/editorial', 'en')).catch(() => {}); await idle(p2); await sleep(800);
            r['A-editorial-dashboard'] = await edRead(p2);
            await p2.goto(bare(st.A, '/management/settings/website')).catch(() => {}); await idle(p2);
            r['A-editorial-bare-settings'] = {url: rel(p2.url()), lang: await p2.evaluate(() => document.documentElement.lang)};
            await p2.goto(bare(st.B, '/dashboard/editorial')).catch(() => {});
            await signOut(p2).catch(() => {});
            // B's editorial addresses (its manager)
            await signIn(p2, `${st.B}mgr`, {contextPath: st.B}); await idle(p2);
            await p2.goto(bare(st.B, '/dashboard/editorial')).catch(() => {}); await idle(p2); await sleep(800);
            r['B-editorial-dashboard'] = await edRead(p2);
            await p2.goto(url(st.B, '/dashboard/editorial', 'en')).catch(() => {}); await idle(p2);
            r['B-editorial-en-address'] = {url: rel(p2.url())};
            await snapN(p2, 'a-07-B-editorial', {}, false);
            await signOut(p2).catch(() => {});
            // the site's Administration addresses (admin)
            await signIn(p2, 'admin'); await idle(p2);
            await p2.goto(bare('index', '/admin')).catch(() => {}); await idle(p2); await sleep(500);
            r['site-admin-bare'] = await edRead(p2);
            await snapN(p2, 'a-08-site-admin', {}, true);
            await signOut(p2).catch(() => {});
            fact('addresses', r);
        } finally { await close(); }
    }

    // ---- remember: the remembered choice across signing in and out and a later visit (Rule 18)
    // Signs in through the page's own "Login" link and form: the kit's signIn() opens the /en/ login
    // address, which is itself a language choice.
    if (on('remember')) {
        const {LoginPage} = require('../../../pages/LoginPage.js');
        const {page, context, close} = await launch(app);
        const r = {};
        const where = async (k) => { await idle(page).catch(() => {}); r[k] = {url: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang).catch(() => null)}; };
        const cookies = async () => (await context.cookies()).map((c) => `${c.name}=${/Locale/.test(c.name) ? c.value : '…'} ${c.expires > 0 ? 'expires ' + Math.round((c.expires * 1000 - Date.now()) / 86400000) + 'd' : 'session'}`);
        try {
            const A = st.A;
            await go(page, bare(A)); await where('first-visit');
            // choose français in the Language block from the home page
            await page.locator('.block_language').getByRole('link', {name: /fran|French/i}).first().click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await where('after-block-fr');
            await go(page, bare(A)); await where('A-bare-after-choice');
            r.cookiesAfterChoice = await cookies();
            // sign in through the page's own Login link
            const loginLink = page.locator('#navigationUser a, .pkp_navigation_user a').filter({hasText: /Connexion|Login|Se connecter/i}).first();
            r.loginHref = rel(await loginLink.getAttribute('href').catch(() => null));
            await loginLink.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await where('login-page');
            await snapN(page, 'r-01-A-login-fr', {}, true);
            await new LoginPage(page).signIn(`${A}rd`, users.getPassword(`${A}rd`));
            await page.waitForLoadState('load').catch(() => {}); await sleep(800); await where('after-sign-in');
            await snapN(page, 'r-02-A-after-sign-in', {}, true);
            await go(page, bare(A, '/about')); await where('A-bare-about-signed-in');
            r.cookiesSignedIn = await cookies();
            // sign out through the page's own Logout link
            const out = page.locator('a[href*="signOut"]').first();
            r.logoutHref = rel(await out.getAttribute('href').catch(() => null));
            if (r.logoutHref) await go(page, app.url(r.logoutHref)); else await go(page, bare(A, '/login/signOut'));
            await where('after-sign-out');
            await go(page, bare(A)); await where('A-bare-after-sign-out');
            r.cookiesAfterSignOut = await cookies();
            // a later visit: a new tab in the same browser
            await page.close();
            const p2 = await context.newPage();
            await p2.goto(bare(A)).catch(() => {}); await idle(p2).catch(() => {});
            r['later-visit-new-tab'] = {url: rel(p2.url()), lang: await p2.evaluate(() => document.documentElement.lang)};
            // a remembered language the journal does not offer: B has English alone
            await p2.goto(bare(st.B, '/about')).catch(() => {}); await idle(p2).catch(() => {});
            r['B-with-fr-remembered'] = {url: rel(p2.url()), lang: await p2.evaluate(() => document.documentElement.lang)};
            await p2.goto(bare(st.C, '/about')).catch(() => {}); await idle(p2).catch(() => {});
            r['C-after-B'] = {url: rel(p2.url()), lang: await p2.evaluate(() => document.documentElement.lang)};
            // a later visit after the browser is closed: only the cookies with an expiry survive
            const kept = (await context.cookies()).filter((c) => c.expires > 0);
            r.cookiesSurvivingClose = kept.map((c) => c.name);
            const {page: p3, context: c3, close: close3} = await launch(app);
            try {
                if (kept.length) await c3.addCookies(kept);
                await p3.goto(bare(A)).catch(() => {}); await idle(p3).catch(() => {});
                r['later-visit-after-browser-closed'] = {url: rel(p3.url()), lang: await p3.evaluate(() => document.documentElement.lang)};
            } finally { await close3(); }
            // signed in in French, then signing in again in a fresh browser: does the account carry the choice?
            const {page: p4, close: close4} = await launch(app);
            try {
                await p4.goto(bare(A, '/login')).catch(() => {}); await idle(p4).catch(() => {});
                r['fresh-browser-login-page'] = {url: rel(p4.url()), lang: await p4.evaluate(() => document.documentElement.lang)};
                await new LoginPage(p4).signIn(`${A}rd`, users.getPassword(`${A}rd`));
                await p4.waitForLoadState('load').catch(() => {}); await sleep(800); await idle(p4).catch(() => {});
                r['fresh-browser-after-sign-in'] = {url: rel(p4.url()), lang: await p4.evaluate(() => document.documentElement.lang)};
            } finally { await close4(); }
        } finally { await close(); fact('remembered', r); }
    }

    // ---- pref: the browser's preferred language (Rule 18, Settings 5) ----------------------
    if (on('pref')) {
        const out = {};
        const langs = [['en', 'en-US,en;q=0.9'], ['fr-CA', 'fr-CA,fr;q=0.9'], ['fr', 'fr-FR,fr;q=0.9'], ['ja', 'ja-JP,ja;q=0.9'], ['ja-then-fr', 'ja,fr-CA;q=0.8,en;q=0.5'], ['de-then-en', 'de-DE,de;q=0.9,en;q=0.5']];
        for (const [k, header] of langs) {
            const res = {};
            for (const [ck, ctx] of [['pk', PK], ['E', st.E], ['site', 'index'], ['B', st.B]]) {
                if (!ctx) continue;
                const {page: p, context: c2, close: cl} = await launch(app);
                try {
                    await c2.setExtraHTTPHeaders({'Accept-Language': header});
                    let s = null; try { const rr = await p.goto(bare(ctx)); s = rr ? rr.status() : null; } catch (e) { s = String(e).slice(0, 100); }
                    await idle(p).catch(() => {});
                    const pr = await publicRead(p);
                    res[ck] = {status: s, url: pr.url, lang: pr.lang, h1: pr.h1};
                    if (ck === 'pk' && (k === 'fr-CA' || k === 'ja')) await snapN(p, `p-01-${ck}-pref-${k}`, {pr}, true);
                } finally { await cl(); }
            }
            out[k] = res;
        }
        // the remembered choice beats the browser's language: French browser, English chosen
        {
            const {page, context, close} = await launch(app);
            try {
                await context.setExtraHTTPHeaders({'Accept-Language': 'fr-CA,fr;q=0.9'});
                await go(page, bare(PK));
                const first = await publicRead(page);
                await go(page, url(PK, '/about', 'en'));
                await go(page, bare(PK, '/about'));
                const after = await publicRead(page);
                out['fr-browser-en-chosen'] = {first: {url: first.url, lang: first.lang}, afterBare: {url: after.url, lang: after.lang}};
                await snapN(page, 'p-02-pk-fr-browser-en-chosen', {first, after}, false);
            } finally { await close(); }
        }
        fact('preferred-language', out);
    }

    // ---- change: "Change Language" (Fields 110-113, Rule 20, A3's last sentence) -----------
    if (on('change')) {
        const {page, close} = await launch(app);
        try {
            const A = st.A;
            const roles = [['mgr', `${A}mgr`], ['sub', `${A}sub`], ['ast', `${A}ast`], ...(hasReviewer ? [['rev', `${A}rev`]] : []), ['au', `${A}au`], ['rd', `${A}rd`]];
            const perRole = {};
            for (const [k, u] of roles) {
                await signIn(page, u, {contextPath: A}); await idle(page); await sleep(600);
                const landed = rel(page.url());
                const im = await openInitials(page);
                await snapN(page, `c-01-initials-${k}`, {im, landed}, k === 'mgr' || k === 'rd');
                perRole[k] = {landed, lang: await page.evaluate(() => document.documentElement.lang), initials: im};
                if (im.present) {
                    // choose français on the landing screen
                    const fr = page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /fran|French/i}).first();
                    if (await fr.count()) {
                        const href = await fr.getAttribute('href');
                        await fr.click().catch(() => {});
                        await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(600);
                        const ed = await edRead(page);
                        const im2 = await openInitials(page);
                        perRole[k].choseFr = {href: rel(href), url: ed.url, lang: ed.lang, h1: ed.h1, rawKeys: ed.rawKeys, initialsFr: im2};
                        if (k === 'mgr' || k === 'rd') await snapN(page, `c-02-${k}-chose-fr`, {ed, im2});
                        const en = page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /English|nglais/}).first();
                        await en.click().catch(() => {});
                        await page.waitForLoadState('load').catch(() => {}); await idle(page);
                        perRole[k].backEn = {url: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang)};
                    }
                }
                if (!im.present) {
                    for (const [pk2, pp] of [['profile', '/user/profile'], ['dashboard', '/dashboard/mySubmissions']]) {
                        await go(page, url(A, pp));
                        perRole[k][pk2] = {url: rel(page.url()), initials: await openInitials(page)};
                        await snapN(page, `c-01b-${k}-${pk2}`, {}, true);
                    }
                }
                await signOut(page).catch(() => {});
            }
            fact('change-per-role', perRole);
            await loc(page, 'editorial header: the initials menu button', page.locator('[data-cy="app-user-nav"] button').first());
            // manager: a workflow with a menu key, the Languages side tab (hash), a settings page
            const mgr = {};
            await signIn(page, `${A}mgr`, {contextPath: A}); await idle(page);
            if (st.sid) {
                await go(page, url(A, `/dashboard/editorial?workflowSubmissionId=${st.sid}&workflowMenuKey=publication_titleAbstract`));
                await sleep(1500);
                const before = rel(page.url());
                const dlgBefore = await page.locator('[role="dialog"]').first().innerText().then((t) => flat(t, 160)).catch(() => null);
                const wdlg = page.getByRole('dialog').last();
                const im = await openInitials(page, wdlg);
                await snapN(page, 'c-03-mgr-workflow-initials', {im}, true);
                const fr = wdlg.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /fran|French/i}).first();
                await loc(page, 'workflow window: the initials menu button inside the dialog', wdlg.locator('[data-cy="app-user-nav"] button').first());
                const href = await fr.getAttribute('href').catch(() => null);
                await fr.click().catch(() => {});
                await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(1500);
                const dlgAfter = await page.getByRole('dialog').last().innerText().then((t) => flat(t, 160)).catch(() => null);
                await snapN(page, 'c-04-mgr-workflow-after-fr', {}, true);
                mgr.workflow = {before, dlgBefore, initials: im, href: rel(href), after: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang), dlgAfter};
                // back to English from the workflow
                const wdlg2 = page.getByRole('dialog').last();
                await openInitials(page, (await wdlg2.count()) ? wdlg2 : null);
                await ((await wdlg2.count()) ? wdlg2 : page).locator('[data-cy="app-user-nav"] nav a').filter({hasText: /English|nglais/}).first().click().catch(() => {});
                await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(1200);
                mgr.workflowBackEn = {url: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang), dlg: await page.getByRole('dialog').last().innerText().then((t) => flat(t, 120)).catch(() => null)};
            }
            await go(page, url(A, '/management/settings/website#setup/languages'));
            await sleep(1000);
            const tabBefore = await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => []);
            await openInitials(page);
            const fr2 = page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /fran|French/i}).first();
            const href2 = await fr2.getAttribute('href').catch(() => null);
            await fr2.click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(1200);
            const tabAfter = await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => []);
            await snapN(page, 'c-05-mgr-languages-tab-after-fr', {tabBefore, tabAfter}, true);
            mgr.languagesTab = {href: rel(href2), after: rel(page.url()), tabBefore: tabBefore.map((t) => flat(t, 40)), tabAfter: tabAfter.map((t) => flat(t, 40)), lang: await page.evaluate(() => document.documentElement.lang)};
            await openInitials(page);
            await page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /English|nglais/}).first().click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            // A3's last sentence: from a public page signed in? "Change Language" is editorial only; from the About page there is no initials menu
            await go(page, url(A, '/about'));
            mgr.publicAboutHasInitialsMenu = await page.locator('[data-cy="app-user-nav"]').count();
            await signOut(page).catch(() => {});
            fact('change-manager-screens', mgr);
            // one interface language: B's manager
            await signIn(page, `${st.B}mgr`, {contextPath: st.B}); await idle(page);
            await go(page, bare(st.B, '/dashboard/editorial'));
            const imB = await openInitials(page);
            await snapN(page, 'c-06-B-initials-one-language', {imB}, true);
            fact('change-B-one-language', imB);
            await signOut(page).catch(() => {});
            // publicknowledge's manager (read-only: switched back to English at the end)
            await signIn(page, 'manager.maya'); await idle(page);
            await go(page, url(PK, '/dashboard/editorial'));
            const imPk = await openInitials(page);
            const frPk = page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /fran|French/i}).first();
            await frPk.click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(1000);
            const edPk = await edRead(page);
            await snapN(page, 'c-07-pk-mgr-dashboard-fr', {edPk}, true);
            fact('change-pk-manager-fr', {initials: imPk, fr: edPk});
            await openInitials(page);
            await page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /English|nglais/}).first().click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            fact('change-pk-manager-back-en', {url: rel(page.url()), lang: await page.evaluate(() => document.documentElement.lang)});
            await signOut(page).catch(() => {});
            // Administration (admin): the site's languages
            await signIn(page, 'admin'); await idle(page);
            await go(page, url('index', '/admin/settings'));
            const imAd = await openInitials(page);
            await snapN(page, 'c-08-admin-settings-initials', {imAd}, true);
            const frAd = page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /fran|French/i}).first();
            const hrefAd = await frAd.getAttribute('href').catch(() => null);
            await frAd.click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(800);
            const edAd = await edRead(page);
            await snapN(page, 'c-09-admin-settings-fr', {edAd}, true);
            const imAdFr = await openInitials(page);
            fact('change-admin', {initials: imAd, href: rel(hrefAd), fr: {url: edAd.url, lang: edAd.lang, h1: edAd.h1, rawKeys: edAd.rawKeys}, initialsFr: imAdFr});
            await page.locator('[data-cy="app-user-nav"] nav a').filter({hasText: /English|nglais/}).first().click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {}); await idle(page);
            // admin on a journal's dashboard (A): the journal's languages
            await go(page, url(A, '/dashboard/editorial'));
            fact('change-admin-on-A', await openInitials(page));
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }

    // ---- hash: does the Website Settings page itself reopen a side tab from its address? (Rule 20 control)
    if (on('hash')) {
        const {page, close} = await launch(app);
        try {
            await signIn(page, `${st.A}mgr`, {contextPath: st.A}); await idle(page);
            const o = {};
            for (const h of ['#languages', '#setup/languages', '#setup']) {
                await go(page, url(st.A, '/about'));
                await go(page, url(st.A, `/management/settings/website${h}`)); await sleep(1000);
                o[h] = {url: rel(page.url()), selected: (await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => [])).map((t) => flat(t, 30))};
            }
            await snapN(page, 'h-01-website-hash-setup', {}, false);
            fact('website-hash-reload', o);
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }

    // ---- follow: what follows the reading language (Rule 21, 21a, A4; U07 Rule 11 pointer) --
    if (on('follow')) {
        const {page, close} = await launch(app);
        try {
            const A = st.A;
            const r = {};
            for (const lc of ['en', 'fr_CA']) {
                await go(page, url(A, '', lc));
                r[`home-${lc}`] = await publicRead(page);
                await go(page, url(A, '/about', lc));
                r[`about-${lc}`] = await publicRead(page);
                r[`about-${lc}`].description = await page.locator('.page_about, .page').first().innerText().then((t) => flat(t, 300)).catch(() => null);
                await snapN(page, `f-01-A-about-${lc}`, {}, true);
                await go(page, url(A, '/about/privacy', lc));
                r[`privacy-${lc}`] = {url: rel(page.url()), text: await page.locator('.page, main').first().innerText().then((t) => flat(t, 200)).catch(() => null)};
            }
            fact('follow-public', Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {url: v.url, lang: v.lang, dir: v.dir, title: v.title, h1: v.h1, nav: v.nav, rawKeys: v.rawKeys, description: v.description, text: v.text}])));
            // editorial in French: dashboard, Users list, workflow; raw keys and their English
            await signIn(page, `${A}mgr`, {contextPath: A}); await idle(page);
            const ed = {};
            const screens = [['dashboard', '/dashboard/editorial'], ['users', '/management/settings/access'], ['website', '/management/settings/website'], ['context', '/management/settings/context']];
            if (st.sid) screens.push(['workflow', `/dashboard/editorial?workflowSubmissionId=${st.sid}`]);
            for (const lc of ['fr_CA', 'en']) {
                for (const [k, p] of screens) {
                    await go(page, url(A, p, lc)); await sleep(1500); await idle(page);
                    const e = await edRead(page);
                    const dlgKeys = await page.locator('[role="dialog"]').evaluateAll((ds) => [...new Set(ds.map((d) => d.innerText).join('\n').match(/##[^#\s]+##/g) || [])]).catch(() => []);
                    ed[`${k}-${lc}`] = {url: e.url, lang: e.lang, dir: e.dir, h1: e.h1, navFirst: e.navFirst, rawKeys: [...new Set([...e.rawKeys, ...dlgKeys])]};
                    if (k === 'users' || k === 'workflow') await snapN(page, `f-02-A-${k}-${lc}`, {e, dlgKeys}, true);
                }
            }
            // where the raw key stands, its English twin: the Users list's search box placeholder
            await go(page, url(A, '/management/settings/access', 'fr_CA')); await sleep(1000);
            const phFr = await page.locator('input[type="search"], input[placeholder]').evaluateAll((els) => els.map((e) => e.getAttribute('placeholder')).filter(Boolean)).catch(() => []);
            await go(page, url(A, '/management/settings/access', 'en')); await sleep(1000);
            const phEn = await page.locator('input[type="search"], input[placeholder]').evaluateAll((els) => els.map((e) => e.getAttribute('placeholder')).filter(Boolean)).catch(() => []);
            ed.usersSearchPlaceholder = {fr: phFr, en: phEn};
            await signOut(page).catch(() => {});
            fact('follow-editorial', ed);
            // the reader's public French pages: raw keys anywhere on the public side
            const pubKeys = {};
            for (const [k, p] of [['login', '/login'], ['register', '/user/register'], ['search', '/search'], ['lostPassword', '/login/lostPassword']]) {
                await go(page, url(A, p, 'fr_CA'));
                const pr = await publicRead(page);
                pubKeys[k] = {url: pr.url, lang: pr.lang, h1: pr.h1, rawKeys: pr.rawKeys};
            }
            fact('follow-public-rawkeys', pubKeys);
        } finally { await close(); }
    }

    // ---- plugin: the Language Toggle Block plugin off and on (Settings 2) ------------------
    if (on('plugin')) {
        const {page, close} = await launch(app);
        const D = st.D;
        const r = {};
        const openPlugins = async () => {
            await go(page, url(D, '/management/settings/website'));
            await page.locator('#plugins-button').first().click().catch(() => {}); await idle(page); await sleep(1200);
        };
        const row = () => page.locator('tr.gridRow[id$="-row-languagetoggleblockplugin"]').first();
        const sidebarD = async () => {
            await go(page, url(D, '/management/settings/website'));
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(800);
            return page.locator('#appearance-setup input[name="sidebar"]').evaluateAll((els) => els.map((e) => `${e.value}:${e.checked}`));
        };
        const visitor = async () => {
            const {page: v, close: vc} = await launch(app);
            try {
                const o = {};
                for (const [k, p] of [['home', ''], ['about', '/about']]) { await v.goto(url(D, p)).catch(() => {}); await idle(v).catch(() => {}); const pr = await publicRead(v); o[k] = {block: pr.block ? pr.block.items.map((i) => i.text) : null, sidebar: pr.sidebarBlocks}; }
                return o;
            } finally { await vc(); }
        };
        try {
            await signIn(page, `${D}mgr`, {contextPath: D}); await idle(page);
            r.visitorBefore = await visitor();
            await openPlugins();
            await row().waitFor({timeout: T}).catch(() => {});
            r.rowText = await row().innerText().then((t) => flat(t, 200)).catch(() => null);
            const box = row().getByRole('checkbox').first();
            r.enabledOnArrival = await box.isChecked().catch(() => null);
            await snapN(page, 'g-01-D-plugins-arrival', {}, true);
            await loc(page, 'Plugins grid: the "Language Toggle Block" row', row());
            r.sidebarBefore = await sidebarD();
            // disable
            await openPlugins();
            await row().waitFor({timeout: T}).catch(() => {});
            const w = page.waitForResponse((x) => /plugin-grid\/(enable|disable)/.test(x.url()), {timeout: T}).catch(() => null);
            await row().getByRole('checkbox').first().click({noWaitAfter: true}).catch(() => {});
            await sleep(900);
            const dlg = page.locator('[role="dialog"]:visible').last();
            if (await dlg.count()) { r.disableAsk = flat(await dlg.innerText().catch(() => ''), 300); await snapN(page, 'g-02-D-disable-question', {}, true); const ok = dlg.getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click(); }
            const resp = await w; r.disableStatus = resp ? resp.status() : null;
            await sleep(1000); await idle(page);
            r.disableNotice = (await page.locator('.pkp_notification, .pkpNotification, [class*="notify"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
            r.boxAfterDisable = await row().getByRole('checkbox').first().isChecked().catch(() => null);
            r.sidebarAfterDisable = await sidebarD();
            r.visitorAfterDisable = await visitor();
            await snapN(page, 'g-03-D-setup-after-disable', {}, true);
            // enable again
            await openPlugins();
            await row().waitFor({timeout: T}).catch(() => {});
            const w2 = page.waitForResponse((x) => /plugin-grid\/(enable|disable)/.test(x.url()), {timeout: T}).catch(() => null);
            await row().getByRole('checkbox').first().click({noWaitAfter: true}).catch(() => {});
            await sleep(900);
            const dlg2 = page.locator('[role="dialog"]:visible').last();
            if (await dlg2.count()) { r.enableAsk = flat(await dlg2.innerText().catch(() => ''), 300); const ok = dlg2.getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click(); }
            const resp2 = await w2; r.enableStatus = resp2 ? resp2.status() : null;
            await sleep(1000); await idle(page);
            r.sidebarAfterEnable = await sidebarD();
            r.visitorAfterEnable = await visitor();
            await snapN(page, 'g-04-D-setup-after-enable', {}, true);
            await signOut(page).catch(() => {});
        } finally { await close(); fact('settings2-plugin', r); }
    }

    // ---- site: the block in the site's sidebar (Rule 19's last sentence, Settings 3) -------
    if (on('site')) {
        const {page, close} = await launch(app);
        const r = {};
        const openSetup = async () => {
            await go(page, url('index', '/admin/settings'));
            await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(800);
        };
        const form = () => page.locator('form').filter({has: page.locator('[id^="siteAppearance-"]')}).first();
        const list = () => page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => `${e.value}:${e.checked}`));
        const save = async () => {
            const w = page.waitForResponse((x) => /\/api\/v1\/site/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await form().getByRole('button', {name: 'Save', exact: true}).last().click().catch(() => {});
            const resp = await w;
            const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            return {status: resp ? resp.status() : null, saved};
        };
        let ticked = false;
        try {
            await signIn(page, 'admin'); await idle(page);
            await openSetup();
            r.before = await list();
            const was = r.before.find((x) => /languagetoggle/i.test(x));
            if (was && /:false$/.test(was)) {
                await page.locator('input[name="sidebar"][value="languagetoggleblockplugin"]').setChecked(true).catch(() => {});
                r.save = await save(); ticked = true;
                await openSetup(); r.afterReload = await list();
            } else { r.note = 'already ticked on arrival; left as found'; }
            const {page: v, close: vc} = await launch(app);
            try {
                const o = {};
                for (const [k, u] of [['home', bare('index')], ['login', url('index', '/login')], ['homeFr', url('index', '', 'fr_CA')], ['journalA', url(st.A, '/about')]]) {
                    await v.goto(u).catch(() => {}); await idle(v).catch(() => {});
                    const pr = await publicRead(v);
                    o[k] = {url: pr.url, lang: pr.lang, block: pr.block, sidebar: pr.sidebarBlocks};
                    if (k === 'home') await snapN(v, 's-01-site-home-block', {pr}, true);
                }
                // choose français on the site's login page
                await v.goto(url('index', '/login')).catch(() => {}); await idle(v).catch(() => {});
                const fr = v.locator('.block_language').getByRole('link', {name: /fran|French/i}).first();
                const href = await fr.getAttribute('href').catch(() => null);
                await fr.click().catch(() => {}); await v.waitForLoadState('load').catch(() => {}); await idle(v).catch(() => {});
                o.chooseFrFromLogin = {href: rel(href), landed: rel(v.url()), lang: await v.evaluate(() => document.documentElement.lang)};
                r.visitor = o;
            } finally { await vc(); }
        } finally {
            if (ticked) {
                await openSetup().catch(() => {});
                await page.locator('input[name="sidebar"][value="languagetoggleblockplugin"]').setChecked(false).catch(() => {});
                r.restore = await save().catch((e) => String(e));
                await openSetup().catch(() => {});
                r.restored = await list().catch(() => null);
            }
            await signOut(page).catch(() => {});
            await close();
            fact('site-sidebar-block', r);
        }
    }

    // ---- profile: "Working Languages" lists the site's languages (cross-feature pointer) ----
    if (on('profile')) {
        const {page, close} = await launch(app);
        try {
            await signIn(page, `${st.B}rd`, {contextPath: st.B}); await idle(page);
            await go(page, bare(st.B, '/user/profile'));
            const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
            const contact = page.getByRole('tab', {name: /Contact/}).first();
            if (await contact.count()) { await contact.click().catch(() => {}); await idle(page); await sleep(800); }
            const wl = await page.evaluate(() => {
                const all = [...document.querySelectorAll('fieldset, .pkp_form .section, .pkpFormField')];
                const f = all.find((e) => /Working Languages/.test(e.innerText || ''));
                if (!f) return null;
                return {text: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 300), boxes: [...f.querySelectorAll('input[type=checkbox]')].map((i) => `${i.value}:${i.checked}`)};
            });
            await snapN(page, 'w-01-B-reader-profile-contact', {wl, tabs}, true);
            fact('profile-working-languages-one-language-journal', {tabs: tabs.map((t) => flat(t, 30)), wl});
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }
});
