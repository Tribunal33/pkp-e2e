// U67 claim check, chunk K2: the journal's LOCKSS and CLOCKSS pages
// ({journal}/gateway/lockss, …/clockss), the site's lists ({site}/gateway/lockss,
// …/clockss), and the settings that feed them (Masthead, Search Indexing,
// License, Author Guidance, Contact, Languages, Site Access Options, Hosted
// Journals' "Enable"). Spec: docs/specs/U67-archiving-preservation.md — the
// manifest page table (82–105), Rules 5–14 and 8a (139–196), Settings bullets
// 3–8 (216–246), Canonical scenarios preamble and Coverage (273–308), register
// A1, A2, A4; footnotes g, h, i, j, k, l, s, t4–t7, t9–t12, f-a1, f-a2, f-a4.
//
// Scratch journals per run (OJS; tag prefix u67k2):
//   A  one published issue (2020); Manager, Section editor, Reviewer, Author,
//      Reader. "LOCKSS"/"CLOCKSS" ticked, saved and unticked ON SCREEN; the
//      metadata table's settings set and cleared on screen.
//   Y  published issues of 2011, 2014 (published 2019-06-01), 2015, 2016 ×2;
//      both boxes seeded ticked. Year links, ?year=, an issue title set on screen.
//   E  no issue; both boxes seeded ticked (Rule 8a).
//   L  English + French (Canada) interface languages; LOCKSS seeded ticked.
//   S  "Publishing Mode" subscription; LOCKSS seeded ticked (A2).
//   N  LOCKSS only, seeded; made not public on screen by the Site Administrator.
//   C  CLOCKSS only, seeded (the site's CLOCKSS list).
//   R  "Users must be registered…" seeded ticked; both boxes ticked; Reader, Manager.
//   Q  "Users must be registered…" ticked; boxes unticked.
//   D  not enabled publicly (seeded); both boxes ticked; Reader, Manager.
//   Z  not enabled publicly; boxes unticked.
// OMP and OPS: read-only controls on publicknowledge and the site (404s,
// no link to a gateway address). `publicknowledge` and the roster are only read.
//
// Each run seeds its own journals; run it twice under different RUN names:
//   RUN=r1 PROBE_FEATURE=U67 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U67/K2/k2.js
//   RUN=r2 PROBE_FEATURE=U67 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U67/K2/k2.js
// PHASES=a,b narrows (seed must run in the same process: state is per process).
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL_PHASES = ['control', 'seed', 'unticked', 'tick', 'pages', 'roles', 'years', 'names', 'empty', 'table', 'rights', 'langs', 'site', 'closed', 'sweep', 'untick'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log(`[k2 ${RUN}]`, new Date().toISOString().slice(11, 19), ...a);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const {page, close} = await launch(app);
    const short = (u) => (u || '').replace(app.baseURL, '').replace(/^https?:\/\/[^/]+/, '');
    const cu = (ctx, p = '') => `/index.php/${ctx}${p}`;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record(`${RUN}-facts`, {[k]: v}, {merge: true}); };

    // ---- dialogs: the script decides (accept a page-leave, dismiss the rest unless told)
    const dialogs = [];
    let acceptConfirm = false;
    page.on('dialog', (d) => {
        dialogs.push({type: d.type(), message: d.message().slice(0, 200), url: short(page.url())});
        (d.type() === 'beforeunload' || acceptConfirm ? d.accept() : d.dismiss()).catch(() => {});
    });
    // ---- navigation chain of the main frame
    const navs = [];
    page.on('response', (r) => {
        try {
            if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) navs.push({url: short(r.url()), status: r.status()});
        } catch (e) { /* none */ }
    });

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
        Object.assign(s, extra);
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    }

    /** Open an address and read where it lands (chain, heading, login form, notices). */
    async function land(p, name, extra = {}) {
        const n0 = navs.length;
        const resp = await page.goto(p.startsWith('http') ? p : app.url(p)).catch((e) => ({err: String(e.message).slice(0, 160)}));
        await idle(page).catch(() => {});
        const info = await page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            return {
                title: document.title,
                h1: [...document.querySelectorAll('h1')].map((h) => t(h.innerText)).filter(Boolean).slice(0, 4),
                loginForm: !!document.querySelector('input[name="username"], #username'),
                notices: [...document.querySelectorAll('.pkp_notification, .cmp_notification, [role="alert"]')].map((e) => t(e.innerText)).filter(Boolean),
                manifest: !!document.querySelector('.page.lockss, .page.clockss'),
                bodyStart: t(document.body ? document.body.innerText : '').slice(0, 200),
            };
        }).catch((e) => ({error: String(e.message).slice(0, 160)}));
        const out = {asked: p, status: resp && resp.status ? resp.status() : (resp && resp.err) || null, chain: navs.slice(n0), url: short(page.url()), ...info, ...extra};
        if (name) await snap(name, {land: out});
        return out;
    }

    /** The manifest page as data (the journal's page or the site's list). */
    const readManifest = () => page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const root = document.querySelector('.page.lockss, .page.clockss');
        if (!root) return {manifest: false};
        const kids = [...root.children];
        const h3s = [...root.querySelectorAll('h3')];
        const afterH = (re) => {
            const h = h3s.find((x) => re.test(t(x.innerText)));
            if (!h) return null;
            let n = h.nextElementSibling;
            while (n && n.tagName !== 'UL' && n.tagName !== 'H3') n = n.nextElementSibling;
            return n && n.tagName === 'UL' ? n : null;
        };
        const links = (el) => (el ? [...el.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href'), target: a.getAttribute('target')})) : null);
        const yearP = [...root.querySelectorAll('p')].find((p) => /Previous/.test(p.innerText));
        const yearParts = yearP ? [...yearP.children].map((c) => ({tag: c.tagName.toLowerCase(), text: t(c.innerText), href: c.getAttribute('href'), cls: c.className, color: getComputedStyle(c).color})) : null;
        const issueUl = afterH(/^Archive of Published Issues/);
        const rows = [...root.querySelectorAll('table.data tr, table tr')].map((tr) => {
            const td = tr.querySelectorAll('td');
            return {label: t(td[0] && td[0].innerText), value: td[1] ? td[1].innerText.replace(/\n+$/, '') : null, lines: td[1] ? td[1].innerText.split('\n').map(t).filter(Boolean) : [], brs: td[1] ? td[1].querySelectorAll('br').length : 0, links: links(td[1])};
        });
        const imgs = [...root.querySelectorAll('img')].map((i) => ({src: i.getAttribute('src'), alt: i.getAttribute('alt'), complete: i.complete, naturalWidth: i.naturalWidth, parentHref: i.closest('a') ? i.closest('a').getAttribute('href') : null}));
        const ps = [...root.querySelectorAll('p')].map((p) => t(p.innerText)).filter(Boolean);
        return {
            manifest: true, rootClass: root.className,
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map((h) => t(h.innerText)).filter(Boolean),
            firstHeading: t((document.querySelector('.pkp_structure_main h1, .pkp_structure_main h2, .pkp_structure_main h3, main h1, main h2, main h3') || {}).innerText),
            order: kids.map((k) => k.tagName.toLowerCase() + (k.className ? `.${k.className}` : '')).join(' '),
            yearText: yearP ? t(yearP.innerText) : null, yearParts,
            colors: {yearP: yearP ? getComputedStyle(yearP).color : null, link: (root.querySelector('a') ? getComputedStyle(root.querySelector('a')).color : null), fontWeights: yearParts ? yearParts.map((y, i) => getComputedStyle(yearP.children[i]).fontWeight) : null},
            h3: h3s.map((h) => t(h.innerText)),
            issues: links(issueUl),
            frontMatter: links(afterH(/^Front Matter$/)),
            rows, imgs, ps,
            allLinks: links(root),
            rootText: root.innerText,
            header: t((document.querySelector('.pkp_structure_head, header') || {}).innerText).slice(0, 600),
            footer: t((document.querySelector('.pkp_structure_footer_wrapper, footer') || {}).innerText).slice(0, 400),
            sidebar: t((document.querySelector('.pkp_structure_sidebar') || {}).innerText).slice(0, 300),
            htmlLang: document.documentElement.lang,
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));

    const rowOf = (m, label) => (m && m.rows ? m.rows.find((r) => r.label === label) || null : null);
    const brief = (m) => m && ({manifest: m.manifest, url: m.url, title: m.title, yearText: m.yearText, yearParts: m.yearParts && m.yearParts.map((y) => `${y.tag}:${y.text}${y.href ? `→${y.href.replace(/^https?:\/\/[^/]+/, '')}` : ''}`), h3: m.h3, issues: m.issues && m.issues.map((i) => `${i.text}→${(i.href || '').replace(/^https?:\/\/[^/]+/, '')}`), rows: m.rows && m.rows.map((r) => `${r.label}=${flat(r.value, 120)}`)});

    async function manifestAt(ctx, which, name, query = '', {loc: doLoc = false} = {}) {
        const l = await land(cu(ctx, `/gateway/${which}${query}`), null);
        const m = await readManifest();
        Object.assign(m, {url: l.url, status: l.status, chain: l.chain, loginForm: l.loginForm, landH1: l.h1, notices: l.notices});
        await snap(name, {manifestRead: m});
        if (doLoc) {
            await loc(page, `${which} page: the "Archive of Published Issues" heading`, page.locator(`.page.${which} h3`).filter({hasText: /^Archive of Published Issues/}));
            await loc(page, `${which} page: the year links' paragraph`, page.locator(`.page.${which} p`).filter({hasText: 'Previous'}));
            await loc(page, `${which} page: an issue link`, page.locator(`.page.${which} h3`).filter({hasText: /^Archive of Published Issues/}).locator('xpath=following-sibling::ul[1]').getByRole('link'));
            await loc(page, `${which} page: the metadata table`, page.locator(`.page.${which} table.data`));
            await loc(page, `${which} page: "Next >>" as a link`, page.locator(`.page.${which}`).getByRole('link', {name: 'Next >>'}));
            await loc(page, `${which} page: "About the Journal"`, page.locator(`.page.${which}`).getByRole('link', {name: 'About the Journal', exact: true}));
        }
        return m;
    }

    async function as(user, ctx) {
        if (!user) { await signOut(page).catch(() => {}); return; }
        await signIn(page, user, ctx ? {contextPath: ctx} : {});
        await idle(page).catch(() => {});
    }

    // ---- settings helpers
    async function openSettings(ctx, slug, top, side) {
        await page.goto(app.url(cu(ctx, `/management/settings/${slug}`))); await idle(page);
        if (top) { await page.getByRole('tab', {name: top, exact: true}).first().click({timeout: 15_000}).catch(() => {}); await idle(page); await sleep(500); }
        if (side) { await page.getByRole('tab', {name: side, exact: true}).first().click({timeout: 15_000}).catch(() => {}); await idle(page); await sleep(700); }
    }
    async function saveVue(field, name) {
        const form = page.locator('form').filter({has: field}).first();
        const save = form.getByRole('button', {name: 'Save', exact: true});
        const out = {statuses: []};
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await save.click({timeout: 10_000}).catch((e) => { out.clickError = e.message.slice(0, 120); });
        const t0 = Date.now();
        while (Date.now() - t0 < 7_000) {
            for (const x of (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((y) => y.trim()).filter(Boolean)) if (!out.statuses.includes(x)) out.statuses.push(x);
            if (out.statuses.includes('Saved')) break;
            await sleep(150);
        }
        const r = await w;
        out.response = r ? {status: r.status(), method: r.request().method(), url: short(r.url())} : null;
        out.fieldErrors = (await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
        out.notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        await snap(name, {save: out});
        return out;
    }
    const tiny = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
    async function mceSet(id, text) {
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        const body = page.frameLocator(`[id="${id}_ifr"]`).locator('body');
        await body.click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('Delete');
        if (text) await page.keyboard.type(text);
        await sleep(300);
        await page.locator('h1').first().click().catch(() => {});
        await sleep(300);
        return tiny(id);
    }
    const labelOf = (id) => page.locator(`label[for="${id}"]`).first().innerText().then((x) => flat(x, 200)).catch(() => null);
    const valOf = (sel) => page.locator(sel).first().inputValue().catch(() => null);

    async function openArchiving(ctx) { await openSettings(ctx, 'distribution', 'Archiving', 'LOCKSS and CLOCKSS'); }
    const boxes = () => page.locator('input[name="enableLockss"], input[name="enableClockss"]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim(), links: [...(e.closest('label') || e.parentElement).querySelectorAll('a')].map((a) => a.getAttribute('href'))}))).catch(() => []);
    async function setBoxes(ctx, want, name) {
        await openArchiving(ctx);
        const before = await boxes();
        if (want.lockss !== undefined) await page.locator('input[name="enableLockss"]').first().setChecked(want.lockss);
        if (want.clockss !== undefined) await page.locator('input[name="enableClockss"]').first().setChecked(want.clockss);
        const save = await saveVue(page.locator('input[name="enableLockss"]').first(), `${name}-saved`);
        const same = await boxes();
        await openArchiving(ctx);
        const reload = await boxes();
        const panelText = flat(await page.getByRole('tabpanel', {name: 'LOCKSS and CLOCKSS'}).innerText().catch(() => ''), 900);
        await snap(`${name}-reload`, {boxes: reload, panelText});
        return {before, save, same, reload, panelText};
    }

    // ---- the site's Hosted Journals "Edit" window (Administration)
    const hostedRow = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
    const formDlg = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form[action*="/api/v1/contexts"]')}).last();
    async function openHostedEdit(name) {
        await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page);
        const r = hostedRow(name);
        await r.waitFor({timeout: T});
        const ex = r.locator('a.show_extras');
        if (await ex.count()) { await ex.click(); await sleep(400); }
        await r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
        await formDlg().locator('[id^="context-name-control"]').first().waitFor({timeout: T});
        await idle(page); await sleep(600);
        return formDlg();
    }
    async function closeDlg() {
        const d = page.locator('[role="dialog"]:visible').last();
        const b = d.getByRole('button', {name: 'Close', exact: true}).first();
        if (await b.count()) await b.click().catch(() => {});
        await sleep(800);
    }
    const enableBox = (dlg) => dlg.getByRole('checkbox', {name: /appear publicly on the site/});

    // ---- the site's list as data
    async function siteList(which, name, mine) {
        const m = await manifestAt('index', which, name);
        const entries = m.manifest ? (m.issues || []) : [];
        return {status: m.status, url: m.url, chain: m.chain, title: m.title, h3: m.h3, count: entries.length, mine: entries.filter((e) => mine.some((x) => e.text.includes(x))).map((e) => ({text: e.text, href: short(e.href)})), yearText: m.yearText, rowsCount: (m.rows || []).length, ps: m.ps, imgs: m.imgs, order: m.order, loginForm: m.loginForm, entriesSample: entries.slice(0, 3)};
    }

    // ---- the Settings pages' own text: where "immediate open access" lives
    async function searchSettings(ctx, needle) {
        const found = [];
        for (const slug of ['context', 'website', 'workflow', 'distribution', 'access']) {
            await page.goto(app.url(cu(ctx, `/management/settings/${slug}`))); await idle(page);
            const tops = await page.locator('[role="tab"]').evaluateAll((els) => els.filter((e) => !e.parentElement.closest('[role="tabpanel"]')).map((e) => e.innerText.trim())).catch(() => []);
            const pageHit = (await page.content()).includes(needle);
            const walk = [];
            for (const top of tops) {
                await page.getByRole('tab', {name: top, exact: true}).first().click().catch(() => {});
                await idle(page); await sleep(400);
                const sides = await page.locator('[role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els.map((e) => e.innerText.trim())).catch(() => []);
                const hitTop = await page.evaluate((n) => {
                    const vals = [...document.querySelectorAll('input, textarea')].map((i) => i.value || '');
                    const mce = window.tinymce ? window.tinymce.get().map((e) => e.getContent()) : [];
                    return document.body.innerText.includes(n) || vals.some((v) => v.includes(n)) || mce.some((v) => v.includes(n));
                }, needle).catch(() => false);
                const sideHits = [];
                for (const side of sides) {
                    await page.getByRole('tab', {name: side, exact: true}).first().click().catch(() => {});
                    await idle(page); await sleep(300);
                    const h = await page.evaluate((n) => document.body.innerText.includes(n), needle).catch(() => false);
                    if (h) sideHits.push(side);
                }
                walk.push({top, sides, hitTop, sideHits});
            }
            found.push({slug, tops, pageHit, walk});
        }
        return found;
    }

    try {
        // ================================================================ control (OMP, OPS; OJS publicknowledge)
        if (on('control')) {
            const out = {};
            const pk = app.contextPath;
            for (const who of [null, 'manager.maya']) {
                const k = who || 'out';
                await as(who, who ? pk : null);
                out[k] = {};
                for (const w of ['lockss', 'clockss']) {
                    out[k][w] = await land(cu(pk, `/gateway/${w}`), `c-${app.name}-pk-${w}-${k}`);
                    out[k][`site-${w}`] = await land(cu('index', `/gateway/${w}`), `c-${app.name}-site-${w}-${k}`);
                }
                const home = await land(cu(pk, ''), null);
                out[k].homeGatewayLinks = await page.locator('a[href*="gateway/lockss"], a[href*="gateway/clockss"]').count();
                out[k].homeUrl = home.url;
            }
            if (isOJS) {
                // the seeded journal's Archiving tab, read only
                await as('manager.maya', pk);
                await openArchiving(pk);
                out.pkBoxes = await boxes();
                await snap('c-ojs-pk-archiving', {boxes: out.pkBoxes});
            }
            await as(null);
            fact('control', out);
            log('control', JSON.stringify(Object.fromEntries(Object.entries(out).filter(([k]) => k !== 'pkBoxes').map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([w, x]) => [w, x && x.status !== undefined ? `${x.status} ${x.url} ${x.h1 && x.h1[0]}` : x]))]))), out.pkBoxes ? JSON.stringify(out.pkBoxes.map((b) => [b.name, b.checked])) : '');
        }
        if (!isOJS) return;

        // ================================================================ seed
        const S = {};
        const u = (p, k, roles, g, f) => ({username: `${p}${k}`, roles, givenName: g, familyName: f});
        const mk = async (key, extra = {}, userSpec = [['mgr', ['manager'], 'Mia', 'Manager']]) => {
            const t = tag(`u67k2${key}`);
            const spec = {tag: t, context: {name: `U67 K2 ${key.toUpperCase()} ${t}`, ...(extra.context || {})}, users: userSpec.map(([k, r, g, f]) => u(t, k, r, g, f)), ...extra, context: {name: `U67 K2 ${key.toUpperCase()} ${t}`, ...(extra.context || {})}};
            const r = await app.api.createContext(spec);
            S[key] = {path: r.path || t, id: r.contextId, name: spec.context.name, issues: r.issues || [], u: Object.fromEntries(userSpec.map(([k]) => [k, `${t}${k}`]))};
            return S[key];
        };
        if (on('seed')) {
            const levels = [['mgr', ['manager'], 'Mia', 'Manager'], ['se', ['sectionEditor'], 'Sid', 'Subeditor'], ['rv', ['externalReviewer'], 'Rae', 'Reviewer'], ['au', ['author'], 'Ada', 'Author'], ['rd', ['reader'], 'Rob', 'Reader']];
            // "Journal initials" and "Country" given so the Masthead's "Save" is not refused (seed-facts)
            await mk('a', {context: {acronym: 'K2A', country: 'CA'}, issues: [{volume: 1, number: 1, year: 2020, published: true}]}, levels);
            await mk('y', {enableLockss: true, enableClockss: true, issues: [
                {volume: 1, number: 1, year: 2011, published: true},
                {volume: 2, number: 1, year: 2014, published: true, datePublished: '2019-06-01'},
                {volume: 3, number: 1, year: 2015, published: true},
                {volume: 4, number: 1, year: 2016, published: true, datePublished: '2016-03-01'},
                {volume: 4, number: 2, year: 2016, published: true, datePublished: '2016-09-01'},
            ]});
            await mk('e', {enableLockss: true, enableClockss: true});
            await mk('l', {enableLockss: true, context: {supportedLocales: ['en', 'fr_CA']}, issues: [{volume: 1, number: 1, year: 2021, published: true}]});
            await mk('s', {enableLockss: true, publishingMode: 'subscription', issues: [{volume: 1, number: 1, year: 2022, published: true}]});
            await mk('n', {enableLockss: true, context: {acronym: 'K2N', country: 'CA'}, issues: [{volume: 1, number: 1, year: 2023, published: true}]}, [['mgr', ['manager'], 'Mia', 'Manager'], ['rd', ['reader'], 'Rob', 'Reader']]);
            await mk('c', {enableClockss: true, issues: [{volume: 1, number: 1, year: 2023, published: true}]});
            await mk('r', {enableLockss: true, enableClockss: true, restrictSiteAccess: true, issues: [{volume: 1, number: 1, year: 2024, published: true}]}, [['mgr', ['manager'], 'Mia', 'Manager'], ['rd', ['reader'], 'Rob', 'Reader']]);
            await mk('q', {restrictSiteAccess: true, issues: [{volume: 1, number: 1, year: 2024, published: true}]}, [['mgr', ['manager'], 'Mia', 'Manager'], ['rd', ['reader'], 'Rob', 'Reader']]);
            await mk('d', {enableLockss: true, enableClockss: true, context: {enabled: false}, issues: [{volume: 1, number: 1, year: 2025, published: true}]}, [['mgr', ['manager'], 'Mia', 'Manager'], ['rd', ['reader'], 'Rob', 'Reader']]);
            await mk('z', {context: {enabled: false}, issues: [{volume: 1, number: 1, year: 2025, published: true}]}, [['mgr', ['manager'], 'Mia', 'Manager'], ['rd', ['reader'], 'Rob', 'Reader']]);
            fact('seed', S);
            log('seed', Object.entries(S).map(([k, v]) => `${k}=${v.path}`).join(' '));
        }
        const A = S.a;
        const levelsA = () => [[null, 'out'], [A.u.rd, 'reader'], [A.u.au, 'author'], [A.u.rv, 'reviewer'], [A.u.se, 'sectioneditor'], [A.u.mgr, 'manager'], ['admin', 'admin'], ['reader.rosa', 'norole']];

        // ================================================================ unticked (Rule 5, Settings bullets 1–2's "unticked": every level)
        if (on('unticked')) {
            const out = {};
            for (const [user, k] of levelsA()) {
                await as(user, user && user !== 'admin' && user !== 'reader.rosa' ? A.path : null);
                out[k] = {};
                for (const w of ['lockss', 'clockss']) {
                    const l = await land(cu(A.path, `/gateway/${w}`), `u-01-${w}-unticked-${k}`);
                    out[k][w] = {status: l.status, chain: l.chain.map((c) => `${c.status} ${c.url}`), url: l.url, h1: l.h1, notices: l.notices, manifest: l.manifest};
                }
            }
            await as(null);
            fact('unticked', out);
            log('unticked', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.lockss.chain.join(' > ')} | ${v.clockss.url} notices=${v.lockss.notices.length}`]))));
        }

        // ================================================================ tick (on screen, as the journal's manager)
        if (on('tick')) {
            await as(A.u.mgr, A.path);
            const out = await setBoxes(A.path, {lockss: true, clockss: true}, 't-01-a-tick-both');
            await loc(page, 'Archiving › LOCKSS and CLOCKSS: the "LOCKSS" box', page.locator('input[name="enableLockss"]'));
            await loc(page, 'Archiving › LOCKSS and CLOCKSS: the tab\'s Save', page.getByRole('tabpanel', {name: 'LOCKSS and CLOCKSS'}).getByRole('button', {name: 'Save', exact: true}));
            // the page at once, same session (the manager)
            out.lockssAtOnce = brief(await manifestAt(A.path, 'lockss', 't-02-a-lockss-at-once-manager'));
            await as(null);
            fact('tick', out);
            log('tick', JSON.stringify({save: out.save.statuses, resp: out.save.response, reload: out.reload.map((b) => [b.name, b.checked, b.links]), atOnce: out.lockssAtOnce.title}));
        }

        // ================================================================ pages (Fields' page table, Rule 12, t8, t12: signed out)
        if (on('pages')) {
            await as(null);
            const out = {};
            out.lockss = await manifestAt(A.path, 'lockss', 'p-01-a-lockss-out', '', {loc: true});
            out.clockss = await manifestAt(A.path, 'clockss', 'p-02-a-clockss-out', '', {loc: true});
            // Rule 12: line-by-line difference of the two pages' own text
            const la = (out.lockss.rootText || '').split('\n').map((x) => x.trim()).filter(Boolean);
            const ca = (out.clockss.rootText || '').split('\n').map((x) => x.trim()).filter(Boolean);
            out.diff = {onlyLockss: la.filter((x) => !ca.includes(x)), onlyClockss: ca.filter((x) => !la.includes(x)), titles: [out.lockss.title, out.clockss.title], imgsL: out.lockss.imgs, imgsC: out.clockss.imgs,
                yearHrefs: [out.lockss.yearParts, out.clockss.yearParts], rowsSame: JSON.stringify(out.lockss.rows) === JSON.stringify(out.clockss.rows), headerSame: out.lockss.header === out.clockss.header};
            // press each control of the LOCKSS page
            const press = async (locator, name) => {
                const o = {count: await locator.count()};
                if (!o.count) return o;
                o.href = await locator.first().getAttribute('href').catch(() => null);
                o.target = await locator.first().getAttribute('target').catch(() => null);
                const n0 = navs.length;
                await locator.first().click({timeout: 10_000}).catch((e) => { o.err = e.message.slice(0, 100); });
                await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
                o.chain = navs.slice(n0).map((c) => `${c.status} ${c.url}`);
                o.url = short(page.url());
                o.h1 = (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
                o.title = await page.title().catch(() => null);
                await snap(name, {press: o});
                return o;
            };
            const M = (w) => page.locator(`.page.${w}`);
            out.pressed = {};
            for (const [k, lab] of [['about', 'About the Journal'], ['submissions', 'Submission Guidelines'], ['contact', 'Contact Information']]) {
                await land(cu(A.path, '/gateway/lockss'));
                out.pressed[k] = await press(M('lockss').getByRole('link', {name: lab, exact: true}), `p-03-press-${k}`);
            }
            await land(cu(A.path, '/gateway/lockss'));
            out.pressed.journalUrl = await press(M('lockss').locator('table tr').filter({hasText: 'Journal URL'}).getByRole('link'), 'p-04-press-journal-url');
            await land(cu(A.path, '/gateway/lockss'));
            out.pressed.issue = await press(M('lockss').locator('h3').filter({hasText: /^Archive of Published Issues/}).locator('xpath=following-sibling::ul[1]').getByRole('link').first(), 'p-05-press-issue');
            await land(cu(A.path, '/gateway/lockss'));
            // Publisher Email (t12): the link as shown, its address; pressing a mailto link leaves the page where it is
            const mail = M('lockss').locator('table tr').filter({hasText: 'Publisher Email'}).getByRole('link');
            out.mail = {count: await mail.count(), href: await mail.first().getAttribute('href').catch(() => null), text: await mail.first().innerText().catch(() => null)};
            const n0 = navs.length;
            await mail.first().click({timeout: 5000}).catch((e) => { out.mail.err = e.message.slice(0, 100); });
            await sleep(800);
            out.mail.after = {url: short(page.url()), navs: navs.slice(n0)};
            // the closing images: loaded?  the external links are recorded, not followed
            out.closing = {lockssImgs: out.lockss.imgs, clockssImgs: out.clockss.imgs, extLinks: (out.lockss.allLinks || []).filter((a) => /lockss\.org|pkp\.sfu\.ca/.test(a.href || ''))};
            for (const [k, v] of Object.entries(out)) if (v && v.rootText) v.rootText = v.rootText.slice(0, 3000);
            fact('pages', out);
            log('pages', JSON.stringify({l: brief(out.lockss), c: brief(out.clockss)}));
            log('pages diff', JSON.stringify(out.diff));
            log('pages pressed', JSON.stringify(Object.fromEntries(Object.entries(out.pressed).map(([k, v]) => [k, `${v.href} → ${v.url} [${v.title}] ${v.chain}`]))), 'mail', JSON.stringify(out.mail));
        }

        // ================================================================ roles (Rule 6, Actors row 4: every level reads both pages)
        if (on('roles')) {
            const out = {};
            for (const [user, k] of levelsA()) {
                await as(user, user && user !== 'admin' && user !== 'reader.rosa' ? A.path : null);
                out[k] = {};
                for (const w of ['lockss', 'clockss']) {
                    const m = await manifestAt(A.path, w, `r-01-${w}-${k}`);
                    out[k][w] = {url: m.url, manifest: m.manifest, title: m.title, rows: (m.rows || []).map((r) => r.label).join(','), issues: (m.issues || []).length, h3: (m.h3 || []).join('|')};
                }
            }
            await as(null);
            fact('roles', out);
            log('roles', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.lockss.manifest}/${v.clockss.manifest} ${v.lockss.url} rows=${v.lockss.rows}`]))));
        }

        // ================================================================ years (Rules 7, 8, 12's year rules; t4)
        if (on('years')) {
            await as(null);
            const Y = S.y;
            const out = {walk: {}, query: {}};
            for (const w of ['lockss', 'clockss']) {
                const steps = [];
                let m = await manifestAt(Y.path, w, `y-01-${w}-default`, '', {loc: w === 'lockss'});
                steps.push({via: 'default', year: m.yearText, h3: m.h3[0], parts: brief(m).yearParts, issues: brief(m).issues});
                for (const dir of ['Next >>', '<< Previous']) {
                    for (let i = 0; i < 6; i++) {
                        const a = page.locator(`.page.${w}`).getByRole('link', {name: dir, exact: true});
                        if (!(await a.count())) break;
                        const n0 = navs.length;
                        await a.first().click(); await page.waitForLoadState('load').catch(() => {}); await idle(page);
                        m = await readManifest();
                        m.url = short(page.url());
                        await snap(`y-02-${w}-${dir.startsWith('Next') ? 'next' : 'prev'}-${i}`, {manifestRead: m});
                        steps.push({via: dir, url: m.url, chain: navs.slice(n0).map((c) => c.status), year: m.h3[0], parts: brief(m).yearParts, issues: brief(m).issues});
                    }
                }
                out.walk[w] = steps;
            }
            for (const q of ['2015', '2011', '2016', '2013', '2019', '2026', '2017', 'abc', '', '2015abc', '2015.9', '%202015', '-2015', '0']) {
                const m = await manifestAt(Y.path, 'lockss', `y-03-q-${q.replace(/[^a-z0-9]/gi, '_') || 'empty'}`, `?year=${q}`);
                out.query[q] = {url: m.url, h3: m.h3 && m.h3[0], parts: brief(m).yearParts, issues: brief(m).issues};
            }
            for (const q of ['2015', 'abc']) {
                const m = await manifestAt(Y.path, 'clockss', `y-04-clockss-q-${q}`, `?year=${q}`);
                out.query[`clockss:${q}`] = {h3: m.h3 && m.h3[0], parts: brief(m).yearParts, issues: brief(m).issues};
            }
            // A has one year: both links grey at the other end of the axis
            const one = await manifestAt(A.path, 'lockss', 'y-05-a-one-year');
            out.oneYear = {h3: one.h3 && one.h3[0], parts: brief(one).yearParts};
            fact('years', out);
            for (const w of ['lockss', 'clockss']) log(`years ${w}`, out.walk[w].map((s) => `${s.via}:${s.year} [${(s.parts || []).join(' ')}] {${(s.issues || []).map((x) => x.split('→')[0]).join('; ')}}`).join('\n   '));
            log('years q', Object.entries(out.query).map(([q, v]) => `${q}=>${v.h3} [${(v.parts || []).map((p) => p.split('→')[0]).join(' ')}] ${(v.issues || []).length}`).join(' | '));
            log('years one', JSON.stringify(out.oneYear));
        }

        // ================================================================ names (Rule 9: an issue's name after its title is set on screen)
        if (on('names')) {
            const Y = S.y;
            const out = {};
            await as(Y.u.mgr, Y.path);
            await page.goto(app.url(cu(Y.path, '/manageIssues'))); await idle(page);
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('table').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(300);
            out.backIssues = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []);
            await panel.getByRole('link', {name: 'Vol. 3 No. 1 (2015)', exact: true}).first().click();
            const W = () => page.locator('[role="dialog"]:visible').last();
            await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && d.querySelector('[role=tab]'); }, null, {timeout: T}).catch(() => {});
            await idle(page); await sleep(300);
            await W().getByRole('tab', {name: 'Issue Data', exact: true}).click(); await idle(page); await sleep(500);
            const f = W().getByRole('tabpanel', {name: 'Issue Data'}).locator('form#issueForm');
            await f.locator('input[name=volume]').waitFor({timeout: T});
            for (const [nm, want] of Object.entries({Number: false, Title: true})) {
                const b = f.getByRole('checkbox', {name: nm, exact: true});
                if ((await b.isChecked().catch(() => want)) !== want) await b.click().catch(() => {});
            }
            await f.locator('input[name^="title"]').first().fill('K2 Special Issue');
            const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /update/i.test(r.url()), {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            await idle(page); await sleep(800);
            out.save = {status: r ? r.status() : null, windowOpen: await f.isVisible().catch(() => false)};
            await snap('n-01-issue-title-saved', {save: out.save});
            if (out.save.windowOpen) await W().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await as(null);
            const m = await manifestAt(Y.path, 'lockss', 'n-02-lockss-2015-titled', '?year=2015');
            out.manifest = brief(m).issues;
            const href = m.issues && m.issues[0] && m.issues[0].href;
            if (href) {
                const l = await land(href, 'n-03-issue-page-titled');
                out.issuePage = {url: l.url, title: l.title, h1: l.h1};
            }
            const ar = await land(cu(Y.path, '/issue/archive'), 'n-04-archive');
            out.archive = await page.locator('.obj_issue_summary .title, .issues_archive .title, .obj_issue_summary h2').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []);
            out.archiveUrl = ar.url;
            fact('names', out);
            log('names', JSON.stringify(out));
        }

        // ================================================================ empty (Rule 8a; t5)
        if (on('empty')) {
            await as(null);
            const E = S.e;
            const out = {};
            for (const w of ['lockss', 'clockss']) {
                const m = await manifestAt(E.path, w, `e-01-${w}-no-issue`);
                out[w] = {h3: m.h3, h3raw: (m.rootText || '').split('\n').find((x) => /^Archive of Published Issues/.test(x)), parts: m.yearParts, issues: m.issues, rows: (m.rows || []).map((r) => r.label)};
            }
            const q = await manifestAt(E.path, 'lockss', 'e-02-lockss-no-issue-year', '?year=2020');
            out.q = {h3: q.h3, parts: brief(q).yearParts};
            fact('empty', out);
            log('empty', JSON.stringify(out));
        }

        // ================================================================ table (Rule 10; Settings bullets 5–7; A1; t10, t12)
        if (on('table')) {
            const out = {};
            const readBoth = async (k) => {
                await as(null);
                const l = await manifestAt(A.path, 'lockss', `m-${k}-lockss`);
                const c = await manifestAt(A.path, 'clockss', `m-${k}-clockss`);
                const pick = (m) => Object.fromEntries((m.rows || []).map((r) => [r.label, flat(r.value, 300)]));
                return {lockss: pick(l), clockss: pick(c), same: JSON.stringify(pick(l)) === JSON.stringify(pick(c))};
            };
            out.m0 = await readBoth('00-new');
            // Masthead: Publisher and Print ISSN
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'context', 'Masthead');
            out.mastheadLabels = {pub: await labelOf('masthead-publisherInstitution-control'), online: await labelOf('masthead-onlineIssn-control'), print: await labelOf('masthead-printIssn-control'),
                arrival: {pub: await valOf('#masthead-publisherInstitution-control'), online: await valOf('#masthead-onlineIssn-control'), print: await valOf('#masthead-printIssn-control')}};
            await snap('m-01-masthead-arrival', {labels: out.mastheadLabels});
            await loc(page, 'Masthead: the "Publisher" box', page.locator('#masthead-publisherInstitution-control'));
            await page.locator('#masthead-publisherInstitution-control').fill('K2 Publisher House');
            await page.locator('#masthead-printIssn-control').fill('2049-3630');
            out.saveM1 = await saveVue(page.locator('#masthead-printIssn-control'), 'm-02-masthead-pub-print-saved');
            out.m1 = await readBoth('01-pub-print');
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'context', 'Masthead');
            await page.locator('#masthead-onlineIssn-control').fill('0378-5955');
            out.saveM2 = await saveVue(page.locator('#masthead-onlineIssn-control'), 'm-03-masthead-online-saved');
            out.m2 = await readBoth('02-both-issn');
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'context', 'Masthead');
            out.afterReloadM2 = {pub: await valOf('#masthead-publisherInstitution-control'), online: await valOf('#masthead-onlineIssn-control'), print: await valOf('#masthead-printIssn-control')};
            await page.locator('#masthead-publisherInstitution-control').fill('');
            await page.locator('#masthead-onlineIssn-control').fill('');
            await page.locator('#masthead-printIssn-control').fill('');
            out.saveM3 = await saveVue(page.locator('#masthead-onlineIssn-control'), 'm-04-masthead-cleared-saved');
            out.m3 = await readBoth('03-masthead-cleared');
            // Search Indexing "Description"; first left once with a change unsaved
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'distribution', 'Search Indexing');
            const desc = page.locator('[id^="searchIndexing-searchDescription-control-en"], [id^="searchIndexing-searchDescription-control"]').first();
            out.descLabel = await page.locator('form').filter({has: desc}).locator('label').first().innerText().then((x) => flat(x, 100)).catch(() => null);
            await desc.fill('K2 unsaved description');
            await desc.blur().catch(() => {});
            const d0 = dialogs.length;
            await page.getByRole('tab', {name: 'License', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(500);
            out.leave = {afterTab: dialogs.slice(d0)};
            await snap('m-05-unsaved-desc-other-tab', {dialogs: out.leave.afterTab});
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(400);
            out.leave.backOnTab = await desc.inputValue().catch(() => null);
            await page.goto(app.url(cu(A.path, '/gateway/lockss'))).catch((e) => { out.leave.gotoErr = e.message.slice(0, 100); });
            await idle(page);
            out.leave.afterPage = dialogs.slice(d0);
            out.leave.rowsWhileUnsaved = ((await readManifest()).rows || []).map((r) => r.label);
            await snap('m-06-unsaved-desc-left', {leave: out.leave});
            await openSettings(A.path, 'distribution', 'Search Indexing');
            out.leave.afterReturn = await desc.inputValue().catch(() => null);
            await desc.fill('K2 journal description for search engines');
            out.saveM4 = await saveVue(desc, 'm-07-desc-saved');
            out.m4 = await readBoth('04-description');
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'distribution', 'Search Indexing');
            await desc.fill('');
            out.saveM5 = await saveVue(desc, 'm-08-desc-cleared');
            out.m5 = await readBoth('05-description-cleared');
            // A1 (t10): License Terms alone, then the Copyright Notice too, then License Terms emptied
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'distribution', 'License');
            out.licenseArrival = await tiny('license-licenseTerms-control-en');
            out.licTyped = await mceSet('license-licenseTerms-control-en', 'K2 license terms text');
            out.saveM6 = await saveVue(page.locator('[id="license-licenseTerms-control-en"]'), 'm-09-license-terms-saved');
            out.m6 = await readBoth('06-license-terms-only');
            await as(A.u.mgr, A.path);
            await page.goto(app.url(cu(A.path, '/management/settings/workflow'))); await idle(page);
            await page.locator('[id="submission-button"]').first().click().catch(() => {}); await idle(page); await sleep(500);
            out.workflowSideTabs = await page.locator('[role="tabpanel"]:visible [role="tab"]').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
            await page.locator('[id="instructions-button"]').first().click().catch(() => {}); await idle(page); await sleep(1200);
            const crId = (await page.evaluate(() => (window.tinymce ? window.tinymce.get().map((e) => e.id) : [])).catch(() => [])).find((i) => /copyrightNotice.*-en$/.test(i));
            out.copyrightNoticeId = crId;
            out.copyrightLabel = crId ? await page.locator(`label[for="${crId}"], #${crId.replace(/-control-en$/, '-label')}`).first().innerText().then((x) => flat(x, 100)).catch(() => null) : null;
            if (crId) {
                await mceSet(crId, 'K2 copyright notice text');
                out.saveM7 = await saveVue(page.locator(`[id="${crId}"]`), 'm-10-copyright-notice-saved');
            }
            out.m7 = await readBoth('07-license-and-notice');
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'distribution', 'License');
            await mceSet('license-licenseTerms-control-en', '');
            out.saveM8 = await saveVue(page.locator('[id="license-licenseTerms-control-en"]'), 'm-11-license-terms-cleared');
            out.m8 = await readBoth('08-notice-only');
            // Publisher Email (t12): the Contact tab's "Email" emptied, then changed
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'context', 'Contact');
            out.contactArrival = {email: await valOf('#contact-contactEmail-control'), label: await labelOf('contact-contactEmail-control'), supportName: await valOf('#contact-supportName-control'), supportEmail: await valOf('#contact-supportEmail-control')};
            // a scratch journal has no technical support contact, which the tab requires
            await page.locator('#contact-supportName-control').fill('Kay Support');
            await page.locator('#contact-supportEmail-control').fill(`${A.path}sup@mail.test`);
            out.saveM9a = await saveVue(page.locator('#contact-contactEmail-control'), 'm-12a-contact-support-filled');
            await page.locator('#contact-contactEmail-control').fill('');
            out.saveM9 = await saveVue(page.locator('#contact-contactEmail-control'), 'm-12-contact-email-emptied');
            out.m9 = await readBoth('09-contact-email-emptied');
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'context', 'Contact');
            out.contactAfterEmpty = await valOf('#contact-contactEmail-control');
            await page.locator('#contact-contactEmail-control').fill(`${A.path}pc@mail.test`);
            out.saveM10 = await saveVue(page.locator('#contact-contactEmail-control'), 'm-13-contact-email-changed');
            out.m10 = await readBoth('10-contact-email-changed');
            await as(null);
            fact('table', out);
            for (const k of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10']) log(`table ${k}`, JSON.stringify(out[k].lockss), out[k].same ? 'L=C' : `CLOCKSS DIFFERS ${JSON.stringify(out[k].clockss)}`);
            log('table saves', JSON.stringify(Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith('save')).map(([k, v]) => [k, `${v.statuses.join('/')} ${v.response && v.response.status} ${v.fieldErrors.join(';')} ${v.notices.join(';')}`]))));
            log('table misc', JSON.stringify({labels: out.mastheadLabels, afterReloadM2: out.afterReloadM2, descLabel: out.descLabel, leave: out.leave, licenseArrival: out.licenseArrival, wf: out.workflowSideTabs, cr: out.copyrightNoticeId, crLabel: out.copyrightLabel, contact: out.contactArrival, contactAfterEmpty: out.contactAfterEmpty}));
        }

        // ================================================================ rights (A2; t11)
        if (on('rights')) {
            const out = {};
            await as(null);
            const needle = 'This journal provides immediate open access to its content';
            const ma = await manifestAt(A.path, 'lockss', 'g-01-a-rights');
            out.aRights = rowOf(ma, 'Rights');
            const ms = await manifestAt(S.s.path, 'lockss', 'g-02-subscription-rights');
            out.sRights = rowOf(ms, 'Rights');
            const about = await land(cu(A.path, '/about'), 'g-03-a-about');
            out.aboutHas = (await page.locator('body').innerText().catch(() => '')).includes(needle);
            out.aboutH1 = about.h1;
            await land(cu(S.s.path, '/about'), 'g-04-s-about');
            out.sAboutHas = (await page.locator('body').innerText().catch(() => '')).includes(needle);
            await as(A.u.mgr, A.path);
            out.search = await searchSettings(A.path, needle);
            await snap('g-05-settings-searched', {search: out.search});
            // the Access tab of the subscription journal, as its manager
            await as(S.s.u.mgr, S.s.path);
            await openSettings(S.s.path, 'distribution', 'Access');
            out.sAccess = flat(await page.getByRole('tabpanel', {name: 'Access'}).innerText().catch(() => ''), 600);
            await snap('g-06-s-access-tab', {text: out.sAccess});
            await as(null);
            fact('rights', out);
            log('rights', JSON.stringify({a: out.aRights && out.aRights.value, s: out.sRights && out.sRights.value, aboutHas: out.aboutHas, sAboutHas: out.sAboutHas, sAccess: out.sAccess.slice(0, 200)}));
            log('rights search', JSON.stringify(out.search.map((s) => ({slug: s.slug, pageHit: s.pageHit, hits: s.walk.filter((w) => w.hitTop || w.sideHits.length).map((w) => `${w.top}:${w.sideHits.join('/')}`), tabs: s.walk.map((w) => `${w.top}(${w.sides.length})`).join(',')}))));
        }

        // ================================================================ langs (Settings bullet 8; Rule 11; t6)
        if (on('langs')) {
            const L = S.l;
            const out = {};
            await as(null);
            const en = await manifestAt(L.path, 'lockss', 'l-01-en');
            const fr = await manifestAt(L.path, 'lockss', 'l-02-fr', '');
            // the same page in French
            const lfr = await land(cu(L.path, '/fr_CA/gateway/lockss'));
            const mfr = await readManifest();
            Object.assign(mfr, {url: lfr.url, chain: lfr.chain});
            await snap('l-03-fr_CA', {manifestRead: mfr});
            const lines = (m) => (m.rootText || '').split('\n').map((x) => x.trim()).filter(Boolean);
            out.en = {title: en.title, lang: rowOf(en, 'Language(s)'), header: en.header, footer: en.footer, htmlLang: en.htmlLang};
            out.fr = {url: mfr.url, chain: mfr.chain, title: mfr.title, lang: rowOf(mfr, 'Language(s)'), header: mfr.header, footer: mfr.footer, htmlLang: mfr.htmlLang,
                changedLines: lines(mfr).filter((x) => !lines(en).includes(x)), goneLines: lines(en).filter((x) => !lines(mfr).includes(x)), headerSame: mfr.header === en.header, footerSame: mfr.footer === en.footer};
            out.fr.cl = {title: (await manifestAt(L.path, 'clockss', 'l-04-clockss-en')).title};
            // A has English alone
            const a = await manifestAt(A.path, 'lockss', 'l-05-a-one-language');
            out.aLang = rowOf(a, 'Language(s)');
            void fr;
            // untick French "UI" on screen, then read the row
            await as(L.u.mgr, L.path);
            await page.goto(app.url(cu(L.path, '/management/settings/website'))); await idle(page);
            const setup = page.locator('#setup-button').first();
            if ((await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click().catch(() => {});
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
            await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page); await sleep(500);
            const ui = page.locator('#languageGridContainer input[id^="select-cell-fr_CA-uiLocale"]').first();
            out.uiHead = await page.locator('#languageGridContainer thead th').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
            out.uiBefore = await ui.isChecked().catch(() => null);
            await loc(page, 'Website › Setup › Languages: French "UI" box', ui);
            await snap('l-06-languages-grid');
            acceptConfirm = true;
            const d0 = dialogs.length;
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /language/i.test(r.url()), {timeout: 15000}).catch(() => null);
            await ui.click().catch(() => {});
            const r = await w;
            await idle(page); await sleep(1500);
            acceptConfirm = false;
            out.uiPress = {status: r ? r.status() : null, dialogs: dialogs.slice(d0), after: await ui.isChecked().catch(() => null)};
            await snap('l-07-fr-ui-unticked');
            await as(null);
            const after = await manifestAt(L.path, 'lockss', 'l-08-after-fr-ui-off');
            out.afterUiOff = rowOf(after, 'Language(s)');
            const frAfter = await land(cu(L.path, '/fr_CA/gateway/lockss'), 'l-09-fr_CA-after-ui-off');
            out.frAfterUiOff = {url: frAfter.url, chain: frAfter.chain, status: frAfter.status, manifest: frAfter.manifest};
            fact('langs', out);
            log('langs', JSON.stringify({en: out.en.lang, frLang: out.fr.lang, frTitle: out.fr.title, enTitle: out.en.title, changed: out.fr.changedLines, gone: out.fr.goneLines, headerSame: out.fr.headerSame, footerSame: out.fr.footerSame, frHeader: out.fr.header.slice(0, 200), a: out.aLang, uiHead: out.uiHead, uiPress: out.uiPress, afterOff: out.afterUiOff, frAfterOff: out.frAfterUiOff}));
        }

        // ================================================================ site (Rule 13; Settings bullet 4; t7)
        if (on('site')) {
            const out = {};
            const mine = Object.values(S).map((x) => x.path);
            await as(null);
            out.lockssOut = await siteList('lockss', 's-01-site-lockss-out', mine);
            out.clockssOut = await siteList('clockss', 's-02-site-clockss-out', mine);
            await loc(page, 'the site\'s CLOCKSS list: a journal link', page.locator('.page.clockss ul').first().getByRole('link'));
            // press the N journal's entry on the LOCKSS list
            await land(cu('index', '/gateway/lockss'));
            const nLink = page.locator('.page.lockss ul').first().getByRole('link', {name: S.n.name, exact: true});
            out.pressN = {count: await nLink.count(), href: short(await nLink.first().getAttribute('href').catch(() => null))};
            if (out.pressN.count) {
                await nLink.first().click(); await page.waitForLoadState('load').catch(() => {}); await idle(page);
                const m = await readManifest();
                out.pressN.url = short(page.url()); out.pressN.title = m.title; out.pressN.h3 = m.h3;
                await snap('s-03-site-press-n', {press: out.pressN});
            }
            // the other addresses of the site's list
            out.siteEn = await land(cu('index', '/en/gateway/lockss'), 's-04-site-en-lockss');
            // signed in
            for (const [user, k] of [['reader.rosa', 'norole'], ['admin', 'admin']]) {
                await as(user);
                out[`lockss-${k}`] = await siteList('lockss', `s-05-site-lockss-${k}`, mine);
            }
            // Hosted Journals: N's "Edit", the Enable box unticked and saved
            await as('admin');
            let dlg = await openHostedEdit(S.n.name);
            out.enableLabel = flat(await enableBox(dlg).evaluate((b) => (b.closest('label') || b.parentElement).innerText).catch(() => null), 200);
            out.enableBefore = await enableBox(dlg).isChecked().catch(() => null);
            await snap('s-06-hosted-edit-n', {enable: out.enableBefore, label: out.enableLabel});
            await loc(page, 'Hosted Journals › Edit: "Enable this journal to appear publicly on the site"', enableBox(dlg));
            await enableBox(dlg).uncheck();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            await sleep(1500);
            out.disableSave = {status: r ? r.status() : null};
            await snap('s-07-hosted-n-disabled', {save: out.disableSave});
            // A's Edit window, read only: the box on a journal seeded public
            dlg = await openHostedEdit(A.name);
            out.aEnable = await enableBox(dlg).isChecked().catch(() => null);
            await snap('s-08-hosted-edit-a');
            await closeDlg();
            await as(null);
            out.lockssAfter = await siteList('lockss', 's-09-site-lockss-n-disabled', mine);
            out.nOut = {lockss: await land(cu(S.n.path, '/gateway/lockss'), 's-10-n-lockss-out-disabled')};
            for (const [user, k] of [[S.n.u.rd, 'reader'], [S.n.u.mgr, 'manager'], ['admin', 'admin']]) {
                await as(user, user.startsWith('u67') ? S.n.path : null);
                const m = await manifestAt(S.n.path, 'lockss', `s-11-n-lockss-disabled-${k}`);
                out.nOut[k] = {url: m.url, manifest: m.manifest, loginForm: m.loginForm, h1: m.landH1, chain: m.chain};
            }
            await as(null);
            fact('site', out);
            const b = (x) => x && `${x.status} ${x.url} "${x.title}" h3=${JSON.stringify(x.h3)} n=${x.count} mine=${JSON.stringify(x.mine.map((y) => y.text.replace(/ u67k2.*/, '')))} rows=${x.rowsCount} ps=${JSON.stringify(x.ps)} imgs=${JSON.stringify((x.imgs || []).map((i) => `${i.alt}:${i.naturalWidth}`))}`;
            log('site lockss', b(out.lockssOut));
            log('site clockss', b(out.clockssOut));
            log('site norole/admin', b(out['lockss-norole']), '||', b(out['lockss-admin']));
            log('site press/en', JSON.stringify(out.pressN), JSON.stringify({url: out.siteEn.url, chain: out.siteEn.chain, manifest: out.siteEn.manifest}));
            log('site disable', JSON.stringify({label: out.enableLabel, before: out.enableBefore, save: out.disableSave, aEnable: out.aEnable}), '\n   after:', b(out.lockssAfter), '\n   nOut:', JSON.stringify(Object.fromEntries(Object.entries(out.nOut).map(([k, v]) => [k, `${v.url} ${v.manifest} login=${v.loginForm} ${JSON.stringify(v.chain || [])}`]))));
        }

        // ================================================================ closed (Rule 14; Settings bullets 3–4; A4; t9)
        if (on('closed')) {
            const out = {};
            const read = async (J, w, k) => {
                const m = await manifestAt(J.path, w, `x-${J.path.slice(4, 6)}-${w}-${k}`);
                return `${m.manifest ? 'PAGE' : m.loginForm ? 'LOGIN' : 'OTHER'} ${m.url} ${JSON.stringify((m.chain || []).map((c) => c.status))} ${m.status}`;
            };
            for (const [key, users] of [['r', ['out', 'rd', 'mgr', 'admin']], ['q', ['out', 'rd', 'mgr']], ['d', ['out', 'rd', 'mgr', 'admin']], ['z', ['out', 'rd', 'mgr']]]) {
                const J = S[key];
                out[key] = {};
                for (const k of users) {
                    const user = k === 'out' ? null : J.u[k] || k;
                    await as(user, user && J.u[k] ? J.path : null);
                    out[key][k] = {lockss: await read(J, 'lockss', k.replace(/\W/g, '')), clockss: await read(J, 'clockss', k.replace(/\W/g, ''))};
                }
            }
            // an issue page of R, signed out (the manifest's links lead there)
            await as(null);
            const R = S.r;
            const iss = R.issues && R.issues[0];
            if (iss) out.rIssueOut = await land(cu(R.path, `/issue/view/${iss.id}`), 'x-01-r-issue-out');
            // R's settings as its manager: Site Access Options, and the Archiving tab (A4: any warning?)
            await as(R.u.mgr, R.path);
            await openSettings(R.path, 'access', 'Site Access Options');
            out.rAccess = await page.locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => ({name: e.name, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()}))).catch(() => []);
            await snap('x-02-r-site-access');
            await openArchiving(R.path);
            out.rArchiving = {boxes: await boxes(), text: flat(await page.getByRole('tabpanel', {name: 'LOCKSS and CLOCKSS'}).innerText().catch(() => ''), 900)};
            await snap('x-03-r-archiving', out.rArchiving);
            // A (default) Site Access Options, as its manager
            await as(A.u.mgr, A.path);
            await openSettings(A.path, 'access', 'Site Access Options');
            out.aAccess = await page.locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => ({name: e.name, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()}))).catch(() => []);
            await snap('x-04-a-site-access');
            await as(null);
            fact('closed', out);
            for (const k of ['r', 'q', 'd', 'z']) log(`closed ${k}`, JSON.stringify(out[k]));
            log('closed misc', JSON.stringify({rIssueOut: out.rIssueOut && [out.rIssueOut.url, out.rIssueOut.loginForm], rAccess: out.rAccess, aAccess: out.aAccess, rArchText: out.rArchiving.text}));
        }

        // ================================================================ sweep (Rule 6: no page of the journal links to either address)
        if (on('sweep')) {
            const out = {};
            const iss = A.issues && A.issues[0];
            const pages = ['', '/about', '/about/submissions', '/about/contact', '/about/editorialMasthead', '/about/privacy', '/issue/archive', '/issue/current', iss ? `/issue/view/${iss.id}` : null, '/search', '/information/readers', '/information/librarians', '/login', '/user/register'].filter((x) => x !== null);
            const count = () => page.evaluate(() => [...document.querySelectorAll('a[href]')].filter((a) => /gateway\/(c?lockss)/.test(a.getAttribute('href'))).map((a) => `${a.innerText.trim()}→${a.getAttribute('href')}`)).catch(() => ['ERR']);
            for (const [user, k] of [[null, 'out'], [A.u.mgr, 'manager']]) {
                await as(user, user ? A.path : null);
                out[k] = {};
                for (const p of pages) {
                    const l = await land(cu(A.path, p));
                    out[k][p || '/'] = {url: l.url, links: await count()};
                }
                if (user) {
                    for (const p of ['/dashboard/editorial', '/management/settings/context', '/management/settings/website', '/management/settings/workflow', '/management/settings/distribution', '/management/settings/access', '/manageIssues', '/stats/publications/publications']) {
                        const l = await land(cu(A.path, p));
                        out[k][p] = {url: l.url, links: await count()};
                    }
                }
            }
            await as(null);
            await land(cu('index', '/index'), 's-12-site-home');
            out.siteHome = {url: short(page.url()), links: await count()};
            await snap('w-01-a-home-swept', {sweep: out});
            fact('sweep', out);
            log('sweep', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.links ? v.links : Object.entries(v).filter(([, x]) => x.links.length).map(([p, x]) => `${p}:${x.links.join(',')}`)]))));
        }

        // ================================================================ untick (Rule 5's "Unticking a saved box brings this back")
        if (on('untick')) {
            const out = {};
            await as(A.u.mgr, A.path);
            out.set = await setBoxes(A.path, {lockss: false}, 'k-01-a-untick-lockss');
            out.managerLockss = await land(cu(A.path, '/gateway/lockss'), 'k-02-a-lockss-unticked-manager');
            await as(null);
            out.lockss = await land(cu(A.path, '/gateway/lockss'), 'k-03-a-lockss-unticked-out');
            out.clockss = {manifest: (await manifestAt(A.path, 'clockss', 'k-04-a-clockss-still')).manifest};
            out.site = await siteList('lockss', 'k-05-site-lockss-a-unticked', [A.path]);
            fact('untick', out);
            log('untick', JSON.stringify({save: out.set.save.statuses, reload: out.set.reload.map((b) => [b.name, b.checked]), mgr: out.managerLockss.chain, out: out.lockss.chain, notices: out.lockss.notices, clockss: out.clockss, siteMine: out.site.mine}));
        }
    } finally {
        record(`${RUN}-dialogs`, dialogs);
        await close();
    }
});
