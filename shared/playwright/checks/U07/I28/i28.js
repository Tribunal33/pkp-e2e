// U07 claim check, chunk I28 (housekeeping 2026-09-28): incidentals rows L81 (b), L83, L85, L102 (b).
// Spec: docs/specs/U07-journal-identity-and-about-pages.md, Rule 5 (td7, m), Rule 3 (k, td6), Rule 14a (r),
// the "Privacy Statement" tab paragraph (j) and register OPS3 (f-ops3).
//
//   PROBE_FEATURE=U07 PROBE_AGENT=ccI28 RUN=r1 node bin/probe.js all shared/playwright/checks/U07/I28/i28.js
//   PROBE_FEATURE=U07 PROBE_AGENT=ccI28 RUN=r2 node bin/probe.js all shared/playwright/checks/U07/I28/i28.js
//   (PHASES=unsaved,inst,french,formlang narrows; default all four.)
//
// Each run seeds its own scratch contexts (tag prefix u07i28), so a later build re-runs it as is.
// Phases (facts file i28-<RUN>-facts-<app>.json, one key per leg; snapshots i28-<RUN>-<name>-<app>.json|png):
//   unsaved  (L81 b)  manager.maya on publicknowledge, READ-ONLY (nothing is saved): a Masthead title and a
//                     rich-text box typed, top tab "Contact" and back, a reload; typed again, the side menu's
//                     "Website" and back. Website › Setup › "Privacy Statement" typed, a side tab and back,
//                     top tab "Appearance" and back, the side menu's "Journal" and back. Dialogs recorded.
//   inst     (L83)    scratch context I: the side menu and Distribution › "Statistics" for admin and a scratch
//                     manager with the site's "Enable institutional statistics" off, on (by POST site), the
//                     journal's own box ticked on screen, the site's box off again (journal box still ticked),
//                     on again, the journal's box unticked on screen. publicknowledge read (manager.maya) as a
//                     control. The site box is put back to false in a finally.
//   french   (L85)    publicknowledge in the French interface (read-only): signed out, "Editorial Masthead"
//                     (fr_CA and en); manager.maya: Website › Appearance › "Entête" (the masthead order list),
//                     Users & Roles › Users (the roles column).
//   formlang (L102 b) scratch A (UI en+fr_CA, forms en only): admin ticks French under "Forms" on Setup ›
//                     "Languages", then "Privacy Statement" read (both boxes, after pressing "French", after a
//                     reload); scratch B created with supportedFormLocales en+fr_CA (the control): the same read.
//                     Signed out: /fr_CA/about/privacy and /fr_CA/about/editorialMasthead on both.
// No assertions: the script records, the reader judges.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'unsaved,inst,french,formlang').split(',').map((s) => s.trim());
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

forEachApp(async (app) => {
    const log = (...a) => console.log(`[i28 ${RUN} ${app.name}]`, ...a);
    const fact = (k, v) => { record(`i28-${RUN}-facts`, {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1200)); };
    const cu = (ctx, p = '', lang = 'en') => app.url(`/index.php/${ctx}/${lang}${p}`);
    const ctxWord = {ojs: 'Journal', omp: 'Press', ops: 'Server'}[app.name];

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({t: Date.now(), type: d.type(), msg: d.message(), url: rel(page.url())}); await d.accept().catch(() => {}); });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({t: Date.now(), msg: flat(e.message, 300)}));
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({t: Date.now(), status: r.status(), method: r.request().method(), url: rel(r.url()).slice(0, 200)}); });
    const since = (arr, t0) => arr.filter((x) => x.t >= t0).map(({t, ...x}) => x);

    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        record(`i28-${RUN}-${name}`, {...s, ...extra});
        await shot(page, `i28-${RUN}-${name}`).catch(() => {});
        return s;
    };
    const as = async (u, ctx) => {
        if (!u) { await signOut(page).catch(() => {}); return; }
        await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {});
    };
    const vueDialogs = async () => (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
    const selectedTabs = () => page.locator('[role="tab"][aria-selected="true"]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())).catch(() => []);
    const waitMce = (id) => page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
    const mceGet = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
    const mceType = async (id, text) => {
        await waitMce(id);
        const body = page.frameLocator(`[id="${id}_ifr"]`).locator('body');
        await body.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.keyboard.type(text);
        await sleep(300);
        return mceGet(id);
    };
    const nav = () => page.getByRole('navigation', {name: 'Site Navigation'});
    const readNav = async () => {
        if (!(await nav().count().catch(() => 0))) return [];
        return nav().locator('[role="button"][aria-controls]').evaluateAll((els) => els.map((e) => {
            const region = document.getElementById(e.getAttribute('aria-controls') || '');
            const items = region ? [...region.querySelectorAll('[role="treeitem"]')].map((li) => li.getAttribute('aria-label') || li.textContent.replace(/\s+/g, ' ').trim()) : [];
            return `${e.getAttribute('aria-label') || e.textContent.replace(/\s+/g, ' ').trim()}${items.length ? ' › ' + items.join(', ') : ''}`;
        })).catch(() => []);
    };
    const navHasInstitutions = (groups) => groups.some((g) => /Institutions/.test(g));
    /** Press a side-menu entry inside the (open) "Settings" group. */
    const pressSide = async (name) => {
        const link = nav().getByRole('link', {name, exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await nav().getByRole('button', {name: 'Settings', exact: true}).first().click().catch(() => {});
            await sleep(400);
        }
        await link.click();
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
        await sleep(600);
    };
    const tabBtn = (id) => page.locator(`[id="${id}-button"]`).first();
    const pressTab = async (id) => { await tabBtn(id).click(); await idle(page).catch(() => {}); await sleep(600); };
    const sideTab = async (name) => { await page.getByRole('tab', {name, exact: true}).filter({visible: true}).first().click(); await idle(page).catch(() => {}); await sleep(600); };
    const saveForm = async (field) => {
        const form = page.locator('form').filter({has: page.locator(field)}).first();
        const reqs = [];
        const onResp = (r) => { if (/\/api\/v1\/(contexts|site)/.test(r.url()) && r.request().method() !== 'GET') reqs.push({status: r.status(), url: rel(r.url())}); };
        page.on('response', onResp);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const seen = new Set();
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
            for (const x of (await page.locator('[role="status"]').allInnerTexts().catch(() => [])).map((y) => y.trim()).filter(Boolean)) seen.add(x);
            if (seen.has('Saved') && reqs.length) break;
            await sleep(250);
        }
        page.off('response', onResp);
        return {reqs, statuses: [...seen]};
    };

    try {
        // ================================================================ unsaved (L81 b)
        if (PHASES.includes('unsaved')) {
            const o = {};
            await as('manager.maya', app.contextPath);
            // --- Settings › Journal › Masthead
            await page.goto(cu(app.contextPath, '/management/settings/context'));
            await idle(page).catch(() => {});
            await tabBtn('masthead').waitFor({timeout: T});
            await snap('u01-masthead-landed');
            const title = page.locator('#masthead-name-control-en');
            const rich = 'masthead-description-control-en';
            o.stored = {title: await title.inputValue(), summary: await (async () => { await waitMce(rich).catch(() => {}); return mceGet(rich); })()};
            const MARK = `UNSAVED-I28-${RUN}`;
            await title.fill(`${o.stored.title} ${MARK}`);
            o.summaryTyped = await mceType(rich, `Summary ${MARK}`);
            let t0 = Date.now();
            await pressTab('contact');
            o.toContact = {dialogs: since(dialogs, t0), vue: await vueDialogs(), selected: await selectedTabs(), url: rel(page.url())};
            await snap('u02-contact-after-typing', o.toContact);
            await pressTab('masthead');
            o.backOnMasthead = {title: await title.inputValue(), summary: await mceGet(rich), dialogs: since(dialogs, t0)};
            await snap('u03-masthead-back', o.backOnMasthead);
            // a reload
            t0 = Date.now();
            await page.reload(); await idle(page).catch(() => {}); await sleep(600);
            await tabBtn('masthead').waitFor({timeout: T});
            if (!(await title.isVisible().catch(() => false))) await pressTab('masthead');
            await waitMce(rich).catch(() => {});
            o.afterReload = {dialogs: since(dialogs, t0), title: await title.inputValue(), summary: await mceGet(rich), url: rel(page.url())};
            await snap('u04-masthead-after-reload', o.afterReload);
            // typed again, left through the side menu
            await title.fill(`${o.stored.title} ${MARK}`);
            await mceType(rich, `Summary ${MARK}`);
            t0 = Date.now();
            await pressSide('Website');
            o.sideLeave = {dialogs: since(dialogs, t0), url: rel(page.url()), vue: await vueDialogs()};
            await snap('u05-side-menu-website', o.sideLeave);
            await pressSide(ctxWord);
            if (!(await title.isVisible().catch(() => false))) await pressTab('masthead');
            await waitMce(rich).catch(() => {});
            o.afterSideReturn = {title: await title.inputValue(), summary: await mceGet(rich), url: rel(page.url())};
            await snap('u06-masthead-after-side-menu', o.afterSideReturn);
            await loc(page, 'Settings › Journal › Masthead: the title box', title);
            await loc(page, 'Side menu: the "Website" entry of the Settings group', nav().getByRole('link', {name: 'Website', exact: true}));

            // --- Settings › Website › Setup › Privacy Statement
            const priv = 'privacy-privacyStatement-control-en';
            await page.goto(cu(app.contextPath, '/management/settings/website'));
            await idle(page).catch(() => {});
            await pressTab('setup');
            await sideTab('Privacy Statement');
            await waitMce(priv);
            o.privStored = await mceGet(priv);
            o.privTyped = await mceType(priv, `Privacy ${MARK}`);
            await snap('u07-privacy-typed');
            t0 = Date.now();
            await sideTab(app.name === 'ops' ? 'Languages' : 'Information');
            o.privSideTab = {dialogs: since(dialogs, t0), selected: await selectedTabs(), url: rel(page.url())};
            await sideTab('Privacy Statement');
            o.privBackFromSide = await mceGet(priv);
            t0 = Date.now();
            await pressTab('appearance');
            o.privTopTab = {dialogs: since(dialogs, t0), vue: await vueDialogs(), selected: await selectedTabs(), url: rel(page.url())};
            await snap('u08-appearance-after-typing', o.privTopTab);
            await pressTab('setup');
            o.setupReopensOn = await selectedTabs();
            await sideTab('Privacy Statement');
            o.privBackFromTop = await mceGet(priv);
            await snap('u09-privacy-back', {content: o.privBackFromTop});
            t0 = Date.now();
            await pressSide(ctxWord);
            o.privSideLeave = {dialogs: since(dialogs, t0), url: rel(page.url())};
            await pressSide('Website');
            await pressTab('setup');
            await sideTab('Privacy Statement');
            await waitMce(priv).catch(() => {});
            o.privAfterSideReturn = await mceGet(priv);
            await snap('u10-privacy-after-side-menu', {content: o.privAfterSideReturn});
            o.allDialogs = dialogs.map(({t, ...x}) => x);
            fact('unsaved', o);
        }

        // ================================================================ inst (L83)
        if (PHASES.includes('inst')) {
            const t = tag(`u07i28i${RUN}`);
            const I = await app.api.createContext({tag: t, context: {name: `U07 I28 I ${t}`, acronym: 'I28I'},
                users: [{username: `${t}mg`, roles: ['manager'], givenName: 'Ina', familyName: 'Manager'}]});
            const mg = `${t}mg`;
            fact('inst-seed', {path: t, contextId: I.contextId, mg});
            const legs = {};
            const statsTab = async (who, ctx, tick) => {
                await page.goto(cu(ctx, '/management/settings/distribution'));
                await idle(page).catch(() => {});
                const st = tabBtn('statistics');
                const hasTab = await st.count();
                if (hasTab) await pressTab('statistics');
                const boxes = await page.locator('[role="tabpanel"]:visible input[type="checkbox"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => ({name: e.name, checked: e.checked, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim().slice(0, 120)})));
                const box = page.locator('[role="tabpanel"]:visible input[name="enableInstitutionUsageStats"]').first();
                const r = {hasTab: !!hasTab, boxes: boxes.filter((b) => /nstitution/i.test(b.name + b.label))};
                if (tick !== undefined && await box.count()) {
                    if (tick) await box.check({force: true}); else await box.uncheck({force: true});
                    r.save = await saveForm('input[name="enableInstitutionUsageStats"]');
                    r.navSamePage = await readNav();
                }
                return r;
            };
            const leg = async (name, who, ctx, tick) => {
                await as(who, ctx);
                const r = {who, ctx};
                r.stats = await statsTab(who, ctx, tick);
                await snap(`i-${name}-${who === 'admin' ? 'admin' : who === mg ? 'mgr' : 'pk'}-stats`, r.stats);
                await page.goto(cu(ctx, '/submissions')); await idle(page).catch(() => {}); await sleep(500);
                r.nav = await readNav();
                r.institutions = navHasInstitutions(r.nav);
                await snap(`i-${name}-${who === 'admin' ? 'admin' : who === mg ? 'mgr' : 'pk'}-side-menu`, {nav: r.nav});
                await page.goto(cu(ctx, '/management/settings/institutions')); await idle(page).catch(() => {}); await sleep(500);
                r.byAddress = {url: rel(page.url()), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => ''), 120)};
                return r;
            };
            const siteBox = async (v) => { const r = await app.api.setSite({enableInstitutionUsageStats: v}); return r; };
            try {
                legs.s0 = {site: await siteBox(false)};
                legs.s0.admin = await leg('s0-off', 'admin', t);
                legs.s0.mgr = await leg('s0-off', mg, t);
                legs.s1 = {site: await siteBox(true)};
                // the site's own tab, as the admin sees it
                await as('admin');
                await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Statistics', exact: true}).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
                legs.s1.siteTab = await page.locator('input[name="enableInstitutionUsageStats"]').first().isChecked().catch(() => null);
                await snap('i-s1-site-statistics-tab', {checked: legs.s1.siteTab});
                legs.s1.admin = await leg('s1-siteon', 'admin', t);
                legs.s1.mgr = await leg('s1-siteon', mg, t);
                legs.s1.pk = await leg('s1-siteon', 'manager.maya', app.contextPath);
                legs.s2 = {};
                legs.s2.adminTick = await leg('s2-tick', 'admin', t, true);
                legs.s2.adminReload = await leg('s2-read', 'admin', t);
                legs.s2.mgr = await leg('s2-read', mg, t);
                legs.s3 = {site: await siteBox(false)};
                legs.s3.admin = await leg('s3-siteoff-journalon', 'admin', t);
                legs.s3.mgr = await leg('s3-siteoff-journalon', mg, t);
                legs.s4 = {site: await siteBox(true)};
                legs.s4.mgr = await leg('s4-siteon-again', mg, t);
                legs.s4.mgrUntick = await leg('s4-untick', mg, t, false);
                legs.s4.mgrAfter = await leg('s4-read', mg, t);
            } finally {
                legs.restored = await siteBox(false).catch((e) => ({error: String(e.message || e)}));
            }
            const brief = (r) => r && ({institutions: r.institutions, box: r.stats && r.stats.boxes, samePage: r.stats && r.stats.navSamePage ? navHasInstitutions(r.stats.navSamePage) : undefined, save: r.stats && r.stats.save, byAddress: r.byAddress});
            fact('inst', {
                s0_admin: brief(legs.s0.admin), s0_mgr: brief(legs.s0.mgr),
                s1_siteTab: legs.s1.siteTab, s1_admin: brief(legs.s1.admin), s1_mgr: brief(legs.s1.mgr), s1_pk: brief(legs.s1.pk),
                s2_adminTick: brief(legs.s2.adminTick), s2_adminReload: brief(legs.s2.adminReload), s2_mgr: brief(legs.s2.mgr),
                s3_admin: brief(legs.s3.admin), s3_mgr: brief(legs.s3.mgr),
                s4_mgr: brief(legs.s4.mgr), s4_mgrUntick: brief(legs.s4.mgrUntick), s4_mgrAfter: brief(legs.s4.mgrAfter),
                restored: legs.restored,
            });
            fact('inst-nav-full', {s1_admin: legs.s1.admin.nav, s2_mgr: legs.s2.mgr.nav, s3_mgr: legs.s3.mgr.nav});
        }

        // ================================================================ french (L85)
        if (PHASES.includes('french')) {
            const o = {};
            const mastheadRead = async (ctx, lang, name) => {
                await page.goto(cu(ctx, '/about/editorialMasthead', lang)); await idle(page).catch(() => {});
                const r = {url: rel(page.url()),
                    h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 100),
                    roles: (await page.locator('.page_masthead h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
                    rawKeys: ((await page.locator('body').innerText().catch(() => '')).match(/##[^#\s]+##/g) || [])};
                await snap(name, r);
                return r;
            };
            await as(null);
            o.outFr = await mastheadRead(app.contextPath, 'fr_CA', 'f01-pk-masthead-fr-signed-out');
            o.outEn = await mastheadRead(app.contextPath, 'en', 'f02-pk-masthead-en-signed-out');
            await page.goto(cu(app.contextPath, '/about/editorialHistory', 'fr_CA')); await idle(page).catch(() => {});
            o.historyFr = {h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 100), roles: (await page.locator('.page_masthead h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 120))};
            await snap('f03-pk-history-fr-signed-out', o.historyFr);
            await as('manager.maya', app.contextPath);
            await page.goto(cu(app.contextPath, '/management/settings/website', 'fr_CA')); await idle(page).catch(() => {});
            await pressTab('appearance');
            await pressTab('appearance-masthead');
            const form = page.locator('[id="appearance-masthead"] form').first();
            await form.waitFor({timeout: T}).catch(() => {});
            o.entete = {tabLabel: flat(await tabBtn('appearance-masthead').innerText().catch(() => ''), 60),
                formText: flat(await form.innerText().catch(() => ''), 1200),
                rawKeys: ((await form.innerText().catch(() => '')).match(/##[^#\s]+##/g) || [])};
            await snap('f04-pk-appearance-entete-fr', o.entete);
            await loc(page, 'Website › Appearance › "Editorial Masthead" (fr_CA "Entête"): the order form', form);
            // the same tab in English, for the list's roles
            await page.goto(cu(app.contextPath, '/management/settings/website', 'en')); await idle(page).catch(() => {});
            await pressTab('appearance');
            await pressTab('appearance-masthead');
            o.mastheadEn = flat(await page.locator('[id="appearance-masthead"] form').first().innerText().catch(() => ''), 1200);
            await snap('f05-pk-appearance-masthead-en', {formText: o.mastheadEn});
            // the users list's roles column in French (U53 OPS1, the cause)
            await page.goto(cu(app.contextPath, '/management/settings/access', 'fr_CA')); await idle(page).catch(() => {}); await sleep(800);
            const txt = await page.locator('main').innerText().catch(() => '');
            o.usersFr = {rawKeys: [...new Set(txt.match(/##[^#\s]+##/g) || [])]};
            await snap('f06-pk-users-fr', o.usersFr);
            fact('french', o);
        }

        // ================================================================ formlang (L102 b)
        if (PHASES.includes('formlang')) {
            const t = tag(`u07i28f${RUN}`);
            const users = (p) => [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Fay', familyName: 'Manager'},
                {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sol', familyName: 'Moderator'},
                {username: `${p}eb`, roles: ['editorialBoardMember'], givenName: 'Bo', familyName: 'Board'},
            ];
            const A = await app.api.createContext({tag: `${t}a`, context: {name: `U07 I28 A ${t}`, acronym: 'I28A', supportedLocales: ['en', 'fr_CA']}, users: users(`${t}a`)});
            const B = await app.api.createContext({tag: `${t}b`, context: {name: `U07 I28 B ${t}`, acronym: 'I28B', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: users(`${t}b`)});
            fact('formlang-seed', {A: `${t}a`, B: `${t}b`, ids: [A.contextId, B.contextId]});
            const o = {};
            const privRead = async (ctx, name) => {
                await page.goto(cu(ctx, '/management/settings/website')); await idle(page).catch(() => {});
                await pressTab('setup');
                await sideTab('Privacy Statement');
                const ids = await page.locator('textarea[id^="privacy-privacyStatement-control-"]').evaluateAll((els) => els.map((e) => e.id));
                const r = {ids, content: {}};
                for (const id of ids) { await waitMce(id).catch(() => {}); r.content[id] = flat(await mceGet(id), 300); }
                const fr = page.locator('[id="privacy"] form').first().getByRole('button', {name: 'French', exact: true});
                r.frenchButton = await fr.count();
                if (r.frenchButton) { await fr.first().click(); await sleep(600); }
                r.frVisible = await page.locator('[id="privacy-privacyStatement-control-fr_CA_ifr"]').isVisible().catch(() => false);
                r.formText = flat(await page.locator('[id="privacy"] form').first().innerText().catch(() => ''), 800);
                await snap(name, r);
                return r;
            };
            const publicRead = async (ctx, name) => {
                const out = {};
                for (const [k, p] of [['privacy', '/about/privacy'], ['masthead', '/about/editorialMasthead']]) {
                    await page.goto(cu(ctx, p, 'fr_CA')); await idle(page).catch(() => {});
                    const body = await page.locator('body').innerText().catch(() => '');
                    out[k] = {url: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 100),
                        main: flat(await page.locator('.page_privacy, .page_masthead, .pkp_structure_main').first().innerText().catch(() => ''), 500),
                        roles: k === 'masthead' ? (await page.locator('.page_masthead h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)) : undefined,
                        rawKeys: [...new Set(body.match(/##[^#\s]+##/g) || [])]};
                    await snap(`${name}-${k}`, out[k]);
                }
                return out;
            };
            // A: before the tick
            await as('admin', `${t}a`);
            o.A_before = await privRead(`${t}a`, 'l01-a-privacy-before');
            await sideTab('Languages');
            const row = page.locator('#languageGridContainer tr.gridRow').filter({hasText: /fr_CA|Fran/}).first();
            await row.waitFor({timeout: T});
            const boxes = async () => row.locator('input').evaluateAll((els) => els.map((e) => ({id: e.id, checked: e.checked, disabled: e.disabled})));
            o.A_gridBefore = await boxes();
            await snap('l02-a-languages-before', {boxes: o.A_gridBefore});
            const formBox = row.locator('input[id^="select-cell-fr_CA-formLocale"]').first();
            await loc(page, 'Setup › Languages: the French "Forms" box', formBox);
            const w = page.waitForResponse((r) => /language-grid|save-language-setting/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            let t0 = Date.now();
            await formBox.click();
            await sleep(800);
            o.A_tickDialog = await vueDialogs();
            const r = await w;
            o.A_tickResponse = r ? {status: r.status(), url: rel(r.url()).slice(0, 160)} : null;
            await sleep(1200); await idle(page).catch(() => {});
            o.A_gridAfter = await boxes();
            o.A_tickNotices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
            o.A_tickBrowserDialogs = since(dialogs, t0);
            await snap('l03-a-languages-after-tick', {boxes: o.A_gridAfter, notices: o.A_tickNotices});
            // same page, the Privacy Statement side tab right away (the form was built before the tick)
            await sideTab('Privacy Statement');
            o.A_samePageIds = await page.locator('textarea[id^="privacy-privacyStatement-control-"]').evaluateAll((els) => els.map((e) => e.id));
            await snap('l04-a-privacy-same-page', {ids: o.A_samePageIds});
            // a fresh load
            o.A_after = await privRead(`${t}a`, 'l05-a-privacy-after-tick');
            await page.reload(); await idle(page).catch(() => {});
            o.A_afterReload = await privRead(`${t}a`, 'l06-a-privacy-after-reload');
            // B: created with French forms
            await as('admin', `${t}b`);
            o.B = await privRead(`${t}b`, 'l07-b-privacy');
            await sideTab('Languages');
            o.B_grid = await page.locator('#languageGridContainer tr.gridRow').filter({hasText: /fr_CA|Fran/}).first().locator('input').evaluateAll((els) => els.map((e) => ({id: e.id, checked: e.checked})));
            // signed out, French
            await as(null);
            o.A_public = await publicRead(`${t}a`, 'l08-a-public-fr');
            o.B_public = await publicRead(`${t}b`, 'l09-b-public-fr');
            fact('formlang', o);
        }
    } finally {
        fact('run-extras', {pageErrors: pageErrors.map(({t, ...x}) => x), bad: bad.map(({t, ...x}) => x).slice(0, 80), dialogs: dialogs.map(({t, ...x}) => x)});
        await close();
    }
});
