// U62 claim check, chunk K1: the installed-plugin lists and switching.
// Spec docs/specs/U62-plugins-management.md: Purpose, Actors 10–48, Fields 49–65, Rules 1–12 (94–171),
// Settings 3–4 (319–326), register A6, A8, OMP1, OMP2; footnotes a–i, p, q, td1–td8, td19–td21.
//
//   PROBE_FEATURE=U62 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U62/K1/k1.js
//   PHASES=single,seed,roles,search,switch,separate,theme,wizard,noadmin,permit,omp1 (default all, in order; later
//   phases read the state earlier ones leave; state in k1-state-<app>.json in the output folder, delete it for a
//   fresh seed).
//   `single` reads the one-context state (Site Settings with publicknowledge alone; OMP1's one press): it means
//   something only on a freshly reset fleet before any scratch context exists, and records the count it saw.
//
// Scratch contexts (per app): X every permission level; Y a second journal (Rule 11); TH the theme (Rule 12, A8);
// Z the Site Administrator left without a manager role (A6, td19); W the Editor with "Permit changes to Settings"
// unticked (Settings 4; OJS, OMP). Ticks on the site's list are put back before the phase ends.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir} = require('../../../probe');
const G = require('./grid');
const {T, sleep, flat, rel, DENIED, snap, readGrid, brief, findRow, rowLoc, openWebsitePlugins, readToast, pressBox, rowLinks, tabStrips} = G;

const ALL = ['single', 'seed', 'roles', 'search', 'switch', 'separate', 'theme', 'wizard', 'noadmin', 'permit', 'omp1', 'others'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const {page, close} = await launch(app);
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    const sect = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); } save(); };
    const go = async (u) => { let st = null; try { const r = await page.goto(app.url(u)); st = r && r.status(); } catch (e) { st = flat(e.message, 100); } await idle(page).catch(() => {}); return st; };
    const cu = (ctx, p) => `/index.php/${ctx}${p}`;
    const wp = async (ctx, name, extra = {}) => { const o = await openWebsitePlugins(page, app, ctx); o.grid = o.pluginsTab ? await readGrid(page) : null; await snap(page, name, {open: o, ...extra}); return o; };

    /** The Hosted Journals row's "Settings wizard" for the context named `name`, then its "Plugins" tab. */
    const openWizardPlugins = async (name, prefix) => {
        const r = {};
        await go('/index.php/index/admin/contexts');
        const row = page.locator('tr.gridRow').filter({hasText: name}).first();
        await row.waitFor({timeout: T}).catch(() => {});
        r.rowFound = await row.count();
        if (!r.rowFound) return r;
        await row.locator('a.show_extras').click(); await sleep(400);
        const actions = row.locator('xpath=following-sibling::tr[1]');
        r.rowLinks = (await actions.locator('a:visible').allInnerTexts().catch(() => [])).map((a) => flat(a, 40)).filter(Boolean);
        await actions.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await page.waitForURL(/admin\/wizard\//, {timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        r.url = rel(page.url());
        r.tabsLanding = await tabStrips(page);
        const pt = page.locator('#plugins-button').first();
        r.pluginsTab = await pt.count() > 0;
        if (r.pluginsTab) {
            await pt.click(); await idle(page).catch(() => {});
            await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await sleep(400);
            r.tabs = await tabStrips(page);
            r.grid = await readGrid(page);
        }
        await snap(page, `${prefix}-wizard-plugins`, {r});
        return r;
    };

    /** The context's home page: is the theme's styling there? */
    const homeLook = async (ctx, name) => {
        const st = await go(cu(ctx, ''));
        const o = await page.evaluate(() => {
            const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
            return {
                sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')),
                bodyFont: cs('body', 'fontFamily'),
                headBg: cs('.pkp_structure_head', 'backgroundColor'),
                navLinkColor: cs('.pkp_navigation_primary a', 'color'),
                structure: !!document.querySelector('.pkp_structure_page'),
            };
        }).catch((e) => ({error: String(e.message).slice(0, 200)}));
        o.status = st;
        await snap(page, name, o);
        return o;
    };

    /** Settings › Website › Appearance › Theme: what the theme list offers. */
    const themeTab = async (ctx, name) => {
        await go(cu(ctx, '/management/settings/website'));
        await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page).catch(() => {});
        await page.locator('#theme-button').first().click().catch(() => {}); await idle(page).catch(() => {});
        await sleep(600);
        const panel = page.locator('#theme:visible, [id="theme"]').first();
        const o = {};
        o.selects = await panel.locator('select').evaluateAll((ss) => ss.map((s) => ({name: s.name, value: s.value, options: [...s.options].map((x) => `${x.text.trim()}=${x.value}`)}))).catch(() => []);
        o.radios = await panel.locator('input[type=radio]').evaluateAll((rs) => rs.map((r) => `${r.name}:${r.value}${r.checked ? '*' : ''}`)).catch(() => []);
        o.text = flat(await panel.innerText().catch(() => ''), 600);
        await snap(page, name, o);
        return o;
    };

    try {
        // ------------------------------------------------------------ single: one context on the install
        await sect('single', async () => {
            const o = {};
            await as('admin', 'publicknowledge');
            await go('/index.php/index/admin/contexts');
            o.contexts = await page.locator('tr.gridRow').count();
            await go('/index.php/index/admin/settings');
            o.siteTabs = await tabStrips(page);
            await snap(page, 'a-01-site-settings-one-context', o);
            const p = await wp('publicknowledge', 'a-03-pk-plugins-admin-one-context');
            o.usageEvent = findRow(p.grid, 'usageeventplugin');
            o.grid = brief(p.grid);
            fact('single', o);
            await out();
        });

        // ------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.X) return;
            const t = tag('u62k1');
            const U = (p, k, roles) => ({username: `${p}${k}`, roles, givenName: `K1${k}`, familyName: `${k.toUpperCase()}${p.slice(-4)}`});
            const asst = isOPS ? 'editorialBoardMember' : 'copyeditor';
            const xUsers = [U(t, 'mgr', ['manager']), U(t, 'se', ['sectionEditor']), U(t, 'asst', [asst]), U(t, 'au', ['author']), U(t, 'rd', ['reader'])];
            if (!isOPS) xUsers.push(U(t, 'ed', ['editor']), U(t, 'pe', ['productionEditor']), U(t, 'rv', ['externalReviewer']));
            const mk = async (k, extra = {}) => {
                const p = `${t}${k}`.slice(0, 32);
                const r = await app.api.createContext({tag: p, context: {name: `U62 K1 ${k.toUpperCase()} ${t}`, acronym: `K1${k.toUpperCase()}`.slice(0, 8)}, ...extra});
                log('seed', k, JSON.stringify(r).slice(0, 400));
                return {path: p, id: r.id || r.contextId || (r.context && r.context.id), name: `U62 K1 ${k.toUpperCase()} ${t}`};
            };
            S.t = t;
            S.X = {...(await mk('x', {users: xUsers})), u: Object.fromEntries(xUsers.map((u) => [u.username.slice(t.length), u.username]))};
            S.Y = {...(await mk('y', {users: [U(t, 'ymgr', ['manager'])]})), mgr: `${t}ymgr`};
            S.TH = {...(await mk('th', {users: [U(t, 'thm', ['manager'])]})), mgr: `${t}thm`};
            S.Z = {...(await mk('z', {users: [U(t, 'zm', ['manager']), {username: 'admin', roles: [asst], givenName: 'admin', familyName: 'admin'}]})), mgr: `${t}zm`};
            if (!isOPS) S.W = {...(await mk('w', {users: [U(t, 'wm', ['manager']), U(t, 'wed', ['editor']), U(t, 'wpe', ['productionEditor'])], roles: {editor: {permitSettings: false}}})), mgr: `${t}wm`, ed: `${t}wed`, pe: `${t}wpe`};
            save();
            note(`ccK1 [${app.name}]: scratch contexts X ${S.X.path}, Y ${S.Y.path}, TH ${S.TH.path}, Z ${S.Z.path}${S.W ? `, W ${S.W.path}` : ''} (tag ${t})`);
        });
        const X = S.X;

        // ------------------------------------------------------------ roles: every level on X's Website › Plugins
        await sect('roles', async () => {
            const o = {};
            const users = [['admin', 'admin'], ...Object.entries(X.u)];
            for (const [k, u] of users) {
                await as(u, X.path);
                const p = await wp(X.path, `r-${k}-website-plugins`);
                const r = {status: p.status, url: p.url, denied: p.denied, h1: p.h1, errorWindow: p.errorWindow, pluginsTab: p.pluginsTab, innerTabs: p.innerTabs, gridRequestsBeforeTab: p.gridRequestsBeforeTab};
                if (p.grid && p.grid.found) {
                    r.title = p.grid.title; r.headerLinks = p.grid.headerLinks; r.cols = p.grid.cols; r.filterVisible = p.grid.filterVisible;
                    r.usageEvent = findRow(p.grid, 'usageeventplugin');
                    r.rows = p.grid.cats.reduce((n, c) => n + c.rows.length, 0);
                    r.withArrow = p.grid.cats.flatMap((c) => c.rows.filter((x) => x.arrow).map((x) => x.id)).length;
                    r.noArrow = p.grid.cats.flatMap((c) => c.rows.filter((x) => !x.arrow).map((x) => x.name));
                    r.locked = p.grid.cats.flatMap((c) => c.rows.filter((x) => x.disabled).map((x) => `${x.name}${x.checked ? '[x]' : '[ ]'}`));
                    r.lockedUnticked = p.grid.cats.flatMap((c) => c.rows.filter((x) => x.disabled && !x.checked).map((x) => x.name));
                    r.grid = brief(p.grid);
                    r.links = {};
                    for (const id of ['webfeedplugin', 'googlescholarplugin', 'tinymceplugin', 'usageeventplugin', 'customblockmanagerplugin', 'defaultthemeplugin']) r.links[id] = await rowLinks(page, id);
                    await snap(page, `r-${k}-website-plugins-links`);
                    // the gallery tab, for "whoever opens a Plugins tab"
                    const gt = page.locator('#pluginGallery-button').first();
                    if (await gt.count()) { await gt.click(); await idle(page).catch(() => {}); await sleep(600); r.gallery = flat(await page.locator('#pluginGallery').innerText().catch(() => ''), 300); await snap(page, `r-${k}-gallery-tab`); }
                    if (k === 'mgr' || k === 'admin') {
                        await loc(page, 'Installed Plugins: a row by plugin id', rowLoc(page, 'webfeedplugin'));
                        await loc(page, 'Installed Plugins: the row\'s box', rowLoc(page, 'webfeedplugin').locator('input[type=checkbox]'));
                        await loc(page, 'Installed Plugins: the row\'s arrow', rowLoc(page, 'webfeedplugin').locator('a.show_extras'));
                    }
                }
                o[k] = r;
                log(app.name, 'roles', k, JSON.stringify(r).slice(0, 1500));
            }
            fact('roles', o);
            await out();
        });

        // ------------------------------------------------------------ search (td4)
        await sect('search', async () => {
            const o = {};
            await as(X.u.mgr, X.path);
            await openWebsitePlugins(page, app, X.path);
            const grid = page.locator(G.GRID).first();
            const form = grid.locator('form').first();
            o.formVisibleAtLanding = await form.isVisible().catch(() => null);
            const sLink = grid.locator('.header .actions a').filter({hasText: 'Search'}).first();
            await sLink.click(); await sleep(500);
            o.formVisibleAfterLink = await form.isVisible().catch(() => null);
            await snap(page, 's-01-filter-open', {g: (await readGrid(page)).filter});
            await loc(page, 'Installed Plugins: the header "Search" link that opens the filter', sLink);
            const box = form.locator('input[name="pluginName"]').first();
            const sel = form.locator('select[name="category"]').first();
            const btn = form.locator('button').filter({hasText: 'Search'}).first();
            await loc(page, 'Installed Plugins filter: the text box', box);
            await loc(page, 'Installed Plugins filter: the category drop-down', sel);
            await loc(page, 'Installed Plugins filter: the "Search" button', btn);
            const run = async (name, text, cat, how = 'button') => {
                // the filter folds away again after every search: open it with the header's "Search" first
                if (!(await form.isVisible().catch(() => false))) { await sLink.click(); await sleep(500); }
                await sel.selectOption({label: cat}).catch(() => {});
                await box.fill(text);
                const w = page.waitForResponse((r) => /fetch-grid/.test(r.url()), {timeout: 15000}).catch(() => null);
                if (how === 'enter') await box.press('Enter'); else await btn.click();
                const resp = await w;
                await idle(page).catch(() => {}); await sleep(600);
                const g = await readGrid(page);
                const r = {text, cat, how, request: resp ? `${resp.status()} ${rel(resp.url()).replace(/^.*\/grid\//, '').slice(0, 200)}` : null, grid: brief(g), headings: g.cats && g.cats.filter((c) => c.headingVisible).map((c) => c.heading), filterAfter: g.filter, filterVisible: g.filterVisible};
                await snap(page, name, r);
                return r;
            };
            o.feed = await run('s-02-feed', 'feed', 'All Categories');
            o.FEED = await run('s-03-FEED-upper', 'FEED', 'All Categories');
            o.none = await run('s-04-nomatch', 'zzqqk1', 'All Categories');
            o.enter = await run('s-05-feed-enter', 'feed', 'All Categories', 'enter');
            o.block = await run('s-06-block-cat', '', 'Block Plugins');
            o.blockFeed = await run('s-07-block-cat-feed', 'feed', 'Block Plugins');
            o.all = await run('s-08-all', '', 'All Categories');
            // leave the page with the filter typed and a tab switched, unsaved
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.accept().catch(() => {}); });
            if (!(await form.isVisible().catch(() => false))) { await sLink.click(); await sleep(500); }
            await box.fill('feed');
            await page.locator('#pluginGallery-button').first().click().catch(() => {}); await sleep(500);
            await page.locator('#installedPlugins-button').first().click().catch(() => {}); await sleep(300);
            o.boxAfterTabSwitch = await box.inputValue().catch(() => null);
            await page.locator('#appearance-button').first().click().catch(() => {}); await sleep(400);
            await go(cu(X.path, '/management/settings/journal'));
            o.leave = {dialogs, url: rel(page.url())};
            await go(cu(X.path, '/management/settings/website'));
            await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
            o.afterReturn = {formVisible: await page.locator(G.GRID).first().locator('form').first().isVisible().catch(() => null), box: await page.locator(G.GRID).first().locator('input[name="pluginName"]').first().inputValue().catch(() => null)};
            page.removeAllListeners('dialog');
            fact('search', o);
            await out();
        });

        // ------------------------------------------------------------ switch (Rules 8, 9; td6 first half, td21)
        await sect('switch', async () => {
            const o = {};
            await as(X.u.mgr, X.path);
            await openWebsitePlugins(page, app, X.path);
            o.tickGA = await pressBox(page, 'googleanalyticsplugin');
            await snap(page, 'w-01-ga-ticked', o.tickGA);
            await openWebsitePlugins(page, app, X.path);
            o.gaAfterReload = findRow(await readGrid(page), 'googleanalyticsplugin');
            o.cancelWF = await pressBox(page, 'webfeedplugin', {answer: 'Cancel'});
            await snap(page, 'w-02-webfeed-cancel', o.cancelWF);
            await openWebsitePlugins(page, app, X.path);
            o.wfAfterCancelReload = findRow(await readGrid(page), 'webfeedplugin');
            o.okWF = await pressBox(page, 'webfeedplugin', {answer: 'OK'});
            await snap(page, 'w-03-webfeed-ok', o.okWF);
            await openWebsitePlugins(page, app, X.path);
            o.wfAfterOkReload = findRow(await readGrid(page), 'webfeedplugin');
            await snap(page, 'w-04-webfeed-off-reload');
            o.retickWF = await pressBox(page, 'webfeedplugin');
            // a locked box, pressed
            const lb = rowLoc(page, 'tinymceplugin').locator('input[type=checkbox]').first();
            try { await lb.click({timeout: 3000}); o.lockedClick = 'clicked'; } catch (e) { o.lockedClick = flat(e.message, 120); }
            o.lockedAfter = await lb.isChecked().catch(() => null);
            // the editor (manager-level) ticks and unticks too
            if (X.u.ed) {
                await as(X.u.ed, X.path);
                await openWebsitePlugins(page, app, X.path);
                o.edTick = await pressBox(page, 'citationstylelanguageplugin');
                o.edUntick = await pressBox(page, 'citationstylelanguageplugin');
            }
            fact('switch', o);
            await out();
        });

        // ------------------------------------------------------------ separate (Rule 5, 11; td6 second half; site's tab)
        await sect('separate', async () => {
            const o = {};
            await as(S.Y.mgr, S.Y.path);
            await openWebsitePlugins(page, app, S.Y.path);
            const gy = await readGrid(page);
            o.Y = {ga: findRow(gy, 'googleanalyticsplugin'), rows: gy.cats.reduce((n, c) => n + c.rows.length, 0)};
            await snap(page, 'p-01-Y-list');
            await as('admin', X.path);
            await go('/index.php/index/admin/settings');
            o.siteTabs = await tabStrips(page);
            const pt = page.locator('#plugins-button').first();
            o.sitePluginsTab = await pt.count() > 0;
            if (o.sitePluginsTab) {
                await pt.click(); await idle(page).catch(() => {});
                await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                await sleep(400);
                o.siteInnerTabs = await tabStrips(page);
                const gs = await readGrid(page);
                o.site = {title: gs.title, headerLinks: gs.headerLinks, cols: gs.cols, grid: brief(gs), ga: findRow(gs, 'googleanalyticsplugin'), usage: findRow(gs, 'usageeventplugin'), cbm: findRow(gs, 'customblockmanagerplugin'), rows: gs.cats.reduce((n, c) => n + c.rows.length, 0), gridId: gs.gridId};
                o.site.links = {};
                for (const id of ['customblockmanagerplugin', 'webfeedplugin', 'googleanalyticsplugin', 'usageeventplugin']) o.site.links[id] = await rowLinks(page, id);
                await snap(page, 'p-02-site-list', o.site);
                await loc(page, 'Site Settings › Plugins: the site\'s installed grid', page.locator(G.GRID).first());
                // reload on the Plugins tab, and on the gallery tab
                await page.reload(); await idle(page).catch(() => {});
                o.afterReload = {url: rel(page.url()), tabs: await tabStrips(page)};
                await snap(page, 'p-03-site-reload', o.afterReload);
                await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
                await page.locator('#pluginGallery-button').first().click().catch(() => {}); await sleep(500);
                await page.reload(); await idle(page).catch(() => {});
                o.afterReloadGallery = {url: rel(page.url()), tabs: await tabStrips(page)};
                o.afterReloadGallery.inner = await page.locator('#plugins [role="tab"], [role="tab"][id$="Plugins-button"], #pluginGallery-button').evaluateAll((ts) => ts.map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
                await snap(page, 'p-03b-site-reload-gallery', o.afterReloadGallery);
                // tick GA on the site's list
                await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
                await page.locator('#installedPlugins-button').first().click().catch(() => {}); await idle(page).catch(() => {});
                await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                o.siteTick = await pressBox(page, 'googleanalyticsplugin');
                await snap(page, 'p-04-site-ga-ticked', o.siteTick);
                // X and Y after the site's tick (admin is a manager in both)
                await openWebsitePlugins(page, app, X.path);
                o.XafterSite = findRow(await readGrid(page), 'googleanalyticsplugin');
                await snap(page, 'p-05-X-after-site');
                await openWebsitePlugins(page, app, S.Y.path);
                o.YafterSite = findRow(await readGrid(page), 'googleanalyticsplugin');
                await snap(page, 'p-06-Y-after-site');
                // put the site back
                await go('/index.php/index/admin/settings');
                await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
                await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                o.siteRestore = await pressBox(page, 'googleanalyticsplugin', {answer: 'OK'});
                await page.reload(); await idle(page).catch(() => {});
                await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
                await page.locator('#installedPlugins-button').first().click().catch(() => {}); await idle(page).catch(() => {});
                await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                o.siteGaFinal = findRow(await readGrid(page), 'googleanalyticsplugin');
                await snap(page, 'p-07-site-restored', o.siteGaFinal);
            }
            fact('separate', o);
            await out();
        });

        // ------------------------------------------------------------ theme (Rule 12, A8, td7)
        await sect('theme', async () => {
            const o = {};
            const TH = S.TH;
            o.homeBefore = await homeLook(TH.path, 't-01-home-before');
            await as(TH.mgr, TH.path);
            o.themeTabBefore = await themeTab(TH.path, 't-02-theme-tab-before');
            await openWebsitePlugins(page, app, TH.path);
            o.untick = await pressBox(page, 'defaultthemeplugin', {answer: 'OK'});
            await snap(page, 't-03-theme-unticked', o.untick);
            await openWebsitePlugins(page, app, TH.path);
            o.rowAfterReload = findRow(await readGrid(page), 'defaultthemeplugin');
            o.themeTabAfter = await themeTab(TH.path, 't-04-theme-tab-after');
            await out();
            o.homeAfter = await homeLook(TH.path, 't-05-home-after');
            o.homeAfter.text = flat(await page.locator('body').innerText().catch(() => ''), 300);
            o.aboutAfter = await homeLook(`${TH.path}/about`, 't-05b-about-after');
            o.aboutAfter.text = flat(await page.locator('body').innerText().catch(() => ''), 300);
            o.loginAfter = await homeLook(`${TH.path}/login`, 't-05c-login-after');
            await as(TH.mgr, TH.path);
            await openWebsitePlugins(page, app, TH.path);
            o.retick = await pressBox(page, 'defaultthemeplugin');
            await out();
            o.homeRestored = await homeLook(TH.path, 't-06-home-restored');
            fact('theme', o);
        });

        // ------------------------------------------------------------ wizard (Rule 3, td20)
        await sect('wizard', async () => {
            const o = {};
            await as('admin', X.path);
            const Y = S.Y;
            const w = await openWizardPlugins(Y.name, 'z-01');
            o.wizard = {rowLinks: w.rowLinks, url: w.url, tabs: w.tabs, title: w.grid && w.grid.title, headerLinks: w.grid && w.grid.headerLinks, gridId: w.grid && w.grid.gridId, ga: findRow(w.grid, 'googleanalyticsplugin'), usage: findRow(w.grid, 'usageeventplugin'), rows: w.grid && w.grid.cats && w.grid.cats.reduce((n, c) => n + c.rows.length, 0)};
            o.wizard.links = {webfeedplugin: await rowLinks(page, 'webfeedplugin')};
            o.wizardTick = await pressBox(page, 'googleanalyticsplugin');
            await snap(page, 'z-02-wizard-ga-ticked', o.wizardTick);
            await openWebsitePlugins(page, app, Y.path);
            o.websiteAfterWizard = findRow(await readGrid(page), 'googleanalyticsplugin');
            await snap(page, 'z-03-website-after-wizard');
            o.websiteUntick = await pressBox(page, 'googleanalyticsplugin', {answer: 'OK'});
            const w2 = await openWizardPlugins(Y.name, 'z-04');
            o.wizardAfterWebsite = findRow(w2.grid, 'googleanalyticsplugin');
            // leave the wizard with the filter typed
            const f = page.locator(G.GRID).first();
            await f.locator('.header .actions a').filter({hasText: 'Search'}).first().click().catch(() => {});
            await f.locator('input[name="pluginName"]').first().fill('feed').catch(() => {});
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.accept().catch(() => {}); });
            await go('/index.php/index/admin/contexts');
            o.wizardLeave = {dialogs, url: rel(page.url())};
            page.removeAllListeners('dialog');
            fact('wizard', o);
            await out();
        });

        // ------------------------------------------------------------ noadmin (A6, td19)
        await sect('noadmin', async () => {
            const o = {};
            const Z = S.Z;
            await as('admin', Z.path);
            await go(cu(Z.path, '/management/settings/access'));
            const table = page.locator('table').filter({hasText: /\badmin\b/}).first();
            await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
            const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
            await adminRow.locator('button').last().click(); await idle(page).catch(() => {});
            await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
            await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            await page.getByRole('button', {name: /Remove Role/i}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            o.rolesBefore = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            const roleRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
            if (await roleRow.count()) {
                await roleRow.getByRole('button', {name: /Remove Role/i}).click(); await idle(page).catch(() => {});
                const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
                await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\//.test(r.url()), {timeout: 15_000}).catch(() => null);
                await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                const rr = await w;
                o.removeRole = rr ? rr.status() : 'no request';
                await idle(page).catch(() => {}); await sleep(1200);
            }
            o.rolesAfter = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            await snap(page, 'n-01-admin-roles-after', o);
            await out();
            await as('admin', 'index');
            // Website › Plugins by its address
            const p = await wp(Z.path, 'n-02-website-typed');
            o.website = {status: p.status, url: p.url, denied: p.denied, errorWindow: p.errorWindow, pluginsTab: p.pluginsTab, grid: p.grid && brief(p.grid)};
            if (p.grid && p.grid.found) {
                o.website.tick = await pressBox(page, 'googleanalyticsplugin');
                await snap(page, 'n-02b-website-tick', o.website.tick);
            }
            const w = await openWizardPlugins(Z.name, 'n-03');
            o.wizard = {tabs: w.tabs, headerLinks: w.grid && w.grid.headerLinks, grid: w.grid && brief(w.grid), usage: findRow(w.grid, 'usageeventplugin'), wf: findRow(w.grid, 'webfeedplugin'), ga: findRow(w.grid, 'googleanalyticsplugin')};
            if (w.grid && w.grid.found) {
                o.wizard.links = {webfeedplugin: await rowLinks(page, 'webfeedplugin'), googlescholarplugin: await rowLinks(page, 'googlescholarplugin'), usageeventplugin: await rowLinks(page, 'usageeventplugin')};
                o.wizard.tickGA = await pressBox(page, 'googleanalyticsplugin');
                await snap(page, 'n-04-wizard-tick', o.wizard.tickGA);
                if (o.wizard.tickGA.errorWindow) { const b = page.locator('[role="dialog"]:visible').last().getByRole('button').first(); await b.click().catch(() => {}); await sleep(400); }
                o.wizard.untickWF = await pressBox(page, 'webfeedplugin', {answer: 'OK'});
                await snap(page, 'n-05-wizard-untick', o.wizard.untickWF);
                if (o.wizard.untickWF.errorWindow) { const b = page.locator('[role="dialog"]:visible').last().getByRole('button').first(); await b.click().catch(() => {}); await sleep(400); }
                const w2 = await openWizardPlugins(Z.name, 'n-06');
                o.wizard.afterReload = {ga: findRow(w2.grid, 'googleanalyticsplugin'), wf: findRow(w2.grid, 'webfeedplugin')};
            }
            fact('noadmin', o);
            await out();
        });

        // ------------------------------------------------------------ permit (Settings bullet 4)
        await sect('permit', async () => {
            if (!S.W) { fact('permit', {skipped: 'no manager-level role but manager on OPS'}); return; }
            const o = {};
            for (const [k, u] of [['ed', S.W.ed], ['pe', S.W.pe]]) {
                await as(u, S.W.path);
                const p = await wp(S.W.path, `q-01-${k}-website`);
                o[k] = {status: p.status, url: p.url, denied: p.denied, errorWindow: p.errorWindow, pluginsTab: p.pluginsTab};
            }
            // the box's label in the role's window (read only, then Cancel)
            await as(S.W.mgr, S.W.path);
            await go(cu(S.W.path, '/management/settings/access'));
            await page.locator('#roles-button').first().click().catch(() => {}); await idle(page).catch(() => {});
            await sleep(600);
            const rows = page.locator('tr.gridRow:visible');
            const texts = await rows.allInnerTexts().catch(() => []);
            const idx = texts.findIndex((t) => /Journal editor|Press editor/i.test(t));
            o.roleRow = idx >= 0 ? flat(texts[idx], 80) : null;
            if (idx >= 0) {
                const row = rows.nth(idx);
                await row.locator('a.show_extras').click().catch(() => {}); await sleep(400);
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click().catch(() => {});
                await idle(page).catch(() => {}); await sleep(1500);
                const dlg = page.locator('[role="dialog"]:visible').last();
                o.permitBox = await dlg.locator('label').filter({hasText: 'Permit changes to Settings'}).evaluateAll((ls) => ls.map((l) => { const i = l.querySelector('input') || document.getElementById(l.htmlFor); return `${l.innerText.trim()} checked=${i ? i.checked : '?'} disabled=${i ? i.disabled : '?'}`; })).catch(() => []);
                await snap(page, 'q-02-role-window', o);
                await dlg.getByRole('link', {name: 'Cancel'}).first().click().catch(async () => { await dlg.getByRole('button', {name: 'Cancel'}).first().click().catch(() => {}); });
            }
            fact('permit', o);
            await out();
        });

        // ------------------------------------------------------------ omp1: the Site Administrator's list with several contexts
        await sect('omp1', async () => {
            const o = {};
            await as('admin', 'publicknowledge');
            await go('/index.php/index/admin/contexts');
            o.contexts = await page.locator('tr.gridRow').count();
            const p1 = await wp('publicknowledge', 'o-01-pk-admin-many');
            o.pk = findRow(p1.grid, 'usageeventplugin');
            const p2 = await wp(X.path, 'o-02-X-admin-many');
            o.X = findRow(p2.grid, 'usageeventplugin');
            fact('omp1', o);
            await out();
        });
        // ------------------------------------------------------------ others: the site's tab typed by non-admins; the Roles rows (Settings 4)
        await sect('others', async () => {
            const o = {};
            for (const k of ['mgr', 'ed']) {
                if (!X.u[k]) continue;
                await as(X.u[k], X.path);
                const st = await go('/index.php/index/admin/settings');
                o[`site-${k}`] = {status: st, url: rel(page.url()), denied: DENIED.test(await page.locator('body').innerText().catch(() => '')), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 80), pluginsTab: await page.locator('#plugins-button').count()};
                await snap(page, `x-01-site-settings-typed-${k}`, o[`site-${k}`]);
            }
            await as(X.u.mgr, X.path);
            await go(cu(X.path, '/management/settings/access'));
            await page.locator('#roles-button').first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(800);
            o.roleRows = await page.locator('tr.gridRow:visible').evaluateAll((trs) => trs.map((tr) => `${tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 50)}${tr.querySelector('a.show_extras') ? ' >' : ''}`)).catch(() => []);
            await snap(page, 'x-02-roles-grid-manager', o);
            // the site's list and a journal's list, name by name (admin)
            await as('admin', X.path);
            await openWebsitePlugins(page, app, X.path);
            const gj = await readGrid(page);
            await go('/index.php/index/admin/settings');
            await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
            await page.locator(G.GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            const gs = await readGrid(page);
            const names = (g) => g.cats.flatMap((c) => c.rows.map((r) => r.id)).sort();
            const a = names(gj); const b = names(gs);
            o.journalNotSite = a.filter((x) => !b.includes(x)); o.siteNotJournal = b.filter((x) => !a.includes(x)); o.counts = [a.length, b.length];
            o.siteHeadings = gs.cats.map((c) => `${c.heading}${c.empty ? ' {' + c.empty + '}' : ''}`);
            fact('others', o);
            await out();
        });
    } finally {
        save();
        await close();
    }
});
