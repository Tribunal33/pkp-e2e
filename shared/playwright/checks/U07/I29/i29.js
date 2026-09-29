// U07 claim check, chunk I29 (housekeeping 2026-09-29): incidentals row 21 (U07, the French Settings ›
// Journal/Press/Server page) and row 20 (U61, the French Administration page).
// Spec: docs/specs/U07-journal-identity-and-about-pages.md fn-g (Masthead groups), register OPS3/OPS4;
// docs/specs/U61-system-administration.md Fields table row "Site Management", fn-b.
//
//   RUN=r1 PROBE_FEATURE=U07 PROBE_AGENT=ccI29 node bin/probe.js ojs shared/playwright/checks/U07/I29/i29.js
//   (then omp, ops; then RUN=r2 for each app). PHASES=context,admin narrows; default both.
//
// Each run seeds its own scratch context (tag prefix u07i29): UI and Forms en + fr_CA, a Journal Manager
// ("mg") and an Editor ("ed", manager-level on OJS/OMP; OPS has no editor key, so a second manager).
// Phases (facts i29-<RUN>-facts-<app>.json; snapshots i29-<RUN>-<name>-<app>.json|png):
//   context  Settings › Journal/Press/Server (`{ctx}/{lc}/management/settings/context`) as scratch mg (fr_CA,
//            en), scratch ed (fr_CA), manager.maya on publicknowledge (fr_CA, en; read-only) and admin on
//            publicknowledge (fr_CA): every top tab pressed, every `##key##` on it (text, attributes, the
//            <option>s), the Masthead groups (legend, field labels, descriptions). Scratch mg in French also
//            types an unsaved title and leaves by the "Contact" tab, then by the side menu's "Website".
//   admin    `admin`: `index/fr_CA/admin` and `index/en/admin`, every panel (heading, description, buttons),
//            every `##key##`; the navigating buttons pressed in French ("Hosted …", "Site Settings",
//            "System Information") and their landing pages read for `##key##`. Nothing destructive pressed.
// No assertions: the script records, the reader judges.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'context,admin').split(',').map((s) => s.trim());
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

forEachApp(async (app) => {
    const log = (...a) => console.log(`[i29 ${RUN} ${app.name}]`, ...a);
    const fact = (k, v) => { record(`i29-${RUN}-facts`, {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1500)); };
    const cu = (ctx, p = '', lang = 'en') => app.url(`/index.php/${ctx}/${lang}${p}`);

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({t: Date.now(), type: d.type(), msg: d.message(), url: rel(page.url())}); await d.accept().catch(() => {}); });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({t: Date.now(), msg: flat(e.message, 300), url: rel(page.url())}));
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({t: Date.now(), status: r.status(), method: r.request().method(), url: rel(r.url()).slice(0, 200)}); });
    const since = (arr, t0) => arr.filter((x) => x.t >= t0).map(({t, ...x}) => x);

    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        record(`i29-${RUN}-${name}`, {...s, extra});
        await shot(page, `i29-${RUN}-${name}`).catch(() => {});
        return s;
    };
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({error: flat(e.message, 200)})); await idle(page).catch(() => {}); await sleep(500); return r && r.status ? r.status() : r; };
    const as = async (u, ctx) => { await signIn(page, u, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); };

    /** Every ##key## on the page: visible text, attributes, <option>s; `scope` narrows to a selector. */
    const codes = (scope) => page.evaluate((sel) => {
        const root = sel ? document.querySelector(sel) : document.body;
        if (!root) return {missing: true};
        const re = /##[^#\s]+##/g;
        const uniq = (a) => [...new Set(a)];
        const text = uniq((root.innerText || '').match(re) || []);
        const attrs = [];
        for (const el of root.querySelectorAll('*')) {
            for (const a of el.attributes) {
                if (a.name.startsWith('data-v-')) continue;
                const m = (a.value || '').match(re);
                if (m) attrs.push(`${el.tagName.toLowerCase()}[${a.name}] ${m.join(' ')}`);
            }
        }
        const options = [];
        for (const o of root.querySelectorAll('option')) { const m = o.textContent.match(re); if (m) options.push(o.textContent.trim()); }
        const hidden = uniq((root.textContent || '').match(re) || []).filter((c) => !text.includes(c));
        return {text, attrs: uniq(attrs), options: uniq(options), hiddenOnly: hidden};
    }, scope || null).catch((e) => ({error: String(e)}));

    /** The groups of the visible tab panel: legend/heading, field labels, descriptions. */
    const groups = () => page.evaluate(() => {
        const panel = [...document.querySelectorAll('[role="tabpanel"]')].find((p) => p.offsetParent !== null);
        if (!panel) return null;
        const tc = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        return [...panel.querySelectorAll('.pkpFormGroup')].map((g) => ({
            heading: tc(g.querySelector(':scope > .pkpFormGroup__heading [id$="_label"]')),
            description: tc(g.querySelector(':scope > .pkpFormGroup__heading [id$="_description"]')),
            labels: [...new Set([...g.querySelectorAll('.pkpFormFieldLabel')].map(tc))],
            fieldDescriptions: [...new Set([...g.querySelectorAll('.pkpFormField__description')].map(tc).filter(Boolean))],
        }));
    }).catch((e) => ({error: String(e)}));

    const topTabs = () => page.locator('[role="tablist"]').first().locator('[role="tab"]').evaluateAll((els) => els.map((e) => ({id: e.id, text: e.innerText.trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
    const pressTabById = async (id) => { await page.locator(`[id="${id}"]`).first().click(); await idle(page).catch(() => {}); await sleep(700); };

    /** Read the Settings › context page for one role/locale: every top tab, codes per tab. */
    const readContextPage = async (key, ctx, lc, {unsaved = false} = {}) => {
        const t0 = Date.now();
        const o = {ctx, lc};
        o.status = await go(cu(ctx, '/management/settings/context', lc));
        o.url = rel(page.url());
        o.h1 = flat(await page.locator('h1').first().innerText().catch(() => ''), 120);
        o.title = await page.title();
        await snap(`${key}-landed`);
        o.tabs = await topTabs();
        o.perTab = {};
        for (const tb of o.tabs) {
            if (!tb.id) continue;
            await pressTabById(tb.id);
            const s = await snap(`${key}-tab-${tb.id.replace(/-button$/, '')}`);
            const panelCodes = await codes('main') ;
            o.perTab[tb.text] = {codes: panelCodes, groups: await groups(), sideTabs: await page.locator('[role="tabpanel"]:visible [role="tab"]').allInnerTexts().catch(() => [])};
            // side tabs inside a top tab (none expected on this page), each pressed
            for (const st of o.perTab[tb.text].sideTabs) {
                await page.locator('[role="tabpanel"]:visible [role="tab"]').filter({hasText: st}).first().click().catch(() => {});
                await idle(page).catch(() => {}); await sleep(500);
                o.perTab[`${tb.text} › ${flat(st, 40)}`] = {codes: await codes('main'), groups: await groups()};
            }
            void s;
        }
        // back on the first tab: the Masthead, with the language switch pressed where there is one
        if (o.tabs[0]) await pressTabById(o.tabs[0].id);
        const langBtns = await page.locator('[role="tabpanel"]:visible button').filter({hasText: /^(French|Français|English|Anglais)/}).allInnerTexts().catch(() => []);
        o.masthead_langButtons = langBtns.map((x) => flat(x, 60));
        o.masthead_countryOptions = await page.locator('[role="tabpanel"]:visible select[name="country"] option').count().catch(() => null);
        o.masthead_firstCountries = (await page.locator('[role="tabpanel"]:visible select[name="country"] option').allInnerTexts().catch(() => [])).slice(0, 4);
        if (app.name === 'omp') {
            const opts = await page.locator('[role="tabpanel"]:visible select[name="codeType"] option').allInnerTexts().catch(() => []);
            o.omp_codeType = {count: opts.length, first: opts.slice(0, 3), withCode: opts.filter((x) => /##/.test(x)), withDiscontinued: opts.filter((x) => /Discontinu|abandonn|Deprecated/i.test(x))};
        }
        o.whole = await codes(null);
        if (unsaved) {
            const tU = Date.now();
            const title = page.locator(`[role="tabpanel"]:visible input[id^="masthead-name-control-"]`).first();
            o.unsaved = {titleId: await title.getAttribute('id').catch(() => null)};
            await title.fill(`Changed ${Date.now()}`).catch((e) => { o.unsaved.fillError = flat(e.message, 120); });
            await title.blur().catch(() => {});
            const contact = o.tabs.find((x) => /contact/i.test(x.id));
            if (contact) await pressTabById(contact.id);
            await sleep(2000);
            o.unsaved.afterContactTab = {selected: await topTabs(), vueDialogs: await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => []), dialogs: since(dialogs, tU)};
            await snap(`${key}-unsaved-contact`);
            if (o.tabs[0]) await pressTabById(o.tabs[0].id);
            o.unsaved.backOnMasthead = await title.inputValue().catch(() => null);
            // leave by the side menu's "Website"
            const tL = Date.now();
            const web = page.locator('nav a[href*="management/settings/website"]').first();
            o.unsaved.websiteLink = await web.count();
            if (o.unsaved.websiteLink) {
                const vis = await web.isVisible().catch(() => false);
                if (!vis) {
                    const ctl = await web.evaluate((a) => { let r = a.parentElement; while (r && !r.id) r = r.parentElement; return r ? r.id : null; }).catch(() => null);
                    if (ctl) await page.locator(`[aria-controls="${ctl}"]`).first().click().catch(() => {});
                    await sleep(400);
                }
                o.unsaved.websiteVisible = await web.isVisible().catch(() => false);
                await Promise.all([page.waitForLoadState('load').catch(() => {}), web.click().catch((e) => { o.unsaved.webClickError = flat(e.message, 120); })]);
                await idle(page).catch(() => {}); await sleep(1500);
            }
            o.unsaved.afterWebsite = {url: rel(page.url()), dialogs: since(dialogs, tL)};
            await snap(`${key}-unsaved-website`);
            // and back: what the Masthead holds after the page change (nothing was saved)
            await go(cu(ctx, '/management/settings/context', lc));
            o.unsaved.titleAfterReturn = await page.locator(`[role="tabpanel"]:visible input[id^="masthead-name-control-"]`).first().inputValue().catch(() => null);
        }
        o.errors = {pageErrors: since(pageErrors, t0), bad: since(bad, t0)};
        return o;
    };

    try {
        // ================================================================ context (row 21)
        if (PHASES.includes('context')) {
            const t = tag('u07i29');
            const users = (p) => [{username: `${p}mg`, roles: ['manager']}, {username: `${p}ed`, roles: [app.name === 'ops' ? 'manager' : 'editor']}];
            const S = await app.api.createContext({tag: `${t}s`, context: {name: `U07 I29 S ${t}`, acronym: 'I29S', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: users(`${t}s`)});
            const sp = `${t}s`;
            fact('seed', {ctx: sp, id: S && S.contextId});

            await as(`${sp}mg`, sp);
            fact('scratch-mg-fr', await readContextPage('c01-mg-fr', sp, 'fr_CA', {unsaved: true}));
            fact('scratch-mg-en', await readContextPage('c02-mg-en', sp, 'en'));
            await as(`${sp}ed`, sp);
            fact('scratch-ed-fr', await readContextPage('c03-ed-fr', sp, 'fr_CA'));
            await as('manager.maya', app.contextPath);
            fact('pk-maya-fr', await readContextPage('c04-maya-fr', app.contextPath, 'fr_CA'));
            fact('pk-maya-en', await readContextPage('c05-maya-en', app.contextPath, 'en'));
            await as('admin', app.contextPath);
            fact('pk-admin-fr', await readContextPage('c06-admin-fr', app.contextPath, 'fr_CA'));
            await go(cu(app.contextPath, '/management/settings/context', 'en'));
            await loc(page, 'Settings › context: the top tabs', page.locator('[role="tablist"]').first().locator('[role="tab"]'));
            await loc(page, 'Settings › context › Masthead: the title box', page.locator('[role="tabpanel"]:visible input[id^="masthead-name-control-"]').first());
            await loc(page, 'Settings › context › Masthead: the Country list', page.locator('[role="tabpanel"]:visible select[name="country"]'));
            await signOut(page).catch(() => {});
        }

        // ================================================================ admin (row 20, U61)
        if (PHASES.includes('admin')) {
            await as('admin');
            const readAdmin = async (key, lc) => {
                const t0 = Date.now();
                const o = {lc};
                o.status = await go(app.url(`/index.php/index/${lc}/admin`));
                o.url = rel(page.url());
                await snap(key);
                o.panels = await page.evaluate(() => [...document.querySelectorAll('main h2')].map((h) => { let p = h.parentElement; while (p && p.tagName !== 'MAIN' && !p.querySelector('a[href], button')) p = p.parentElement; return p; }).map((p) => ({
                    heading: p.querySelector('h2').innerText.trim(),  // the panel: the h2's nearest ancestor holding its buttons
                    description: (p.querySelector('p') ? p.querySelector('p').innerText.replace(/\s+/g, ' ').trim() : null),
                    buttons: [...p.querySelectorAll('a, button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                }))).catch((e) => ({error: String(e)}));
                o.h1 = flat(await page.locator('h1').first().innerText().catch(() => ''), 80);
                o.codes = await codes(null);
                o.errors = {pageErrors: since(pageErrors, t0), bad: since(bad, t0)};
                return o;
            };
            fact('admin-fr', await readAdmin('a01-admin-fr', 'fr_CA'));
            // the navigating buttons, in French
            const press = {};
            for (const [k, sel] of [['hosted', 'a[href$="/admin/contexts"]'], ['siteSettings', 'a[href$="/admin/settings"]'], ['systemInfo', 'a[href$="/admin/systemInfo"]']]) {
                await go(app.url('/index.php/index/fr_CA/admin'));
                const t0 = Date.now();
                const btn = page.locator(`main ${sel}`).first();
                const o = {present: await btn.count(), text: flat(await btn.innerText().catch(() => ''), 60)};
                if (o.present) {
                    await Promise.all([page.waitForLoadState('load').catch(() => {}), btn.click()]);
                    await page.waitForURL((u) => !/\/admin\/?$/.test(u.pathname), {timeout: 10_000}).catch(() => {});
                    await idle(page).catch(() => {}); await sleep(800);
                    o.landed = rel(page.url());
                    o.h1 = flat(await page.locator('h1').first().innerText().catch(() => ''), 80);
                    await snap(`a02-fr-${k}`);
                    o.codes = await codes(null);
                }
                o.errors = {pageErrors: since(pageErrors, t0), bad: since(bad, t0)};
                press[k] = o;
            }
            fact('admin-fr-pressed', press);
            fact('admin-en', await readAdmin('a03-admin-en', 'en'));
            await loc(page, 'Administration: the "Site Management" panel description', page.locator('main p').first());
            await signOut(page).catch(() => {});
        }
    } finally {
        fact('errors-all', {pageErrors: pageErrors.map(({t, ...x}) => x), bad: bad.map(({t, ...x}) => x), dialogs: dialogs.map(({t, ...x}) => x)});
        await close();
    }
});
