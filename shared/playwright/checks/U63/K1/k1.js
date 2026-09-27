// U63 claim check, chunk K1: the Tools page, its "Import/Export" list, who opens it, a tool's page and its trail,
// the always-on tools and DOAJ's exception, an absent tool's address, the tools the spec does not describe,
// "Permit changes to Settings", and the "Journal Registration" email of a users import (Actors row 4).
// Spec docs/specs/U63-import-export.md: 10–57, 115–150, 376–381, 408–524, 570–581; footnotes a–d, l, o, v, w, sc,
// td1–td4, td22, td23, f-a1, f-omp1.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U63/K1/k1.js
//   PHASES=seed,list,tools,roles,plugins,doaj,absent,permit,perms,import (default all, in order; state in
//   k1-state-<app>.json in the output folder, delete it for a fresh seed).
//
// Scratch contexts per app: A (one account per permission level), W {OJS OMP} (Editor and Production Editor with
// "Permit changes to Settings" unticked), D {OJS} (DOAJ Plugin and the DOI manager plugins switched on screen),
// U {OJS OMP} (users import target; imported usernames carry the tag). `publicknowledge` and the seeded users are
// only read. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir, screen} = require('../../../probe');
const G = require('../../U62/K1/grid');
const {T, sleep, flat, rel, DENIED, snap, readGrid, brief, findRow, openWebsitePlugins, pressBox, rowLinks, tabStrips} = G;

const ALL = ['seed', 'list', 'tools', 'roles', 'plugins', 'doaj', 'order', 'doajrow', 'absent', 'permit', 'admin', 'perms', 'import', 'key', 'nodate'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);

/** The side menu: group headers with their items, and the top-level items. */
async function readNav(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false, items: []};
    return nav.evaluate((n) => {
        const t = (e) => (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim();
        const groups = [...n.querySelectorAll('[role="button"][aria-controls]')].map((b) => {
            const region = document.getElementById(b.getAttribute('aria-controls') || '');
            return `${t(b)}${region ? ' › ' + [...region.querySelectorAll('[role="treeitem"]')].map(t).join(', ') : ''}`;
        });
        const items = [...n.querySelectorAll('[role="treeitem"]')].map(t);
        const links = [...n.querySelectorAll('a')].map((a) => `${t(a)} → ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`);
        return {present: true, groups, items, links};
    }).catch((e) => ({present: 'error', error: String(e).slice(0, 120)}));
}

/** The Tools page's "Import/Export" list, as data. */
async function readList(page) {
    return page.locator('.pkp_page_importexport_plugins li').evaluateAll((lis) => lis.map((li) => {
        const a = li.querySelector('a');
        return {
            text: li.innerText.replace(/\s+/g, ' ').trim(),
            name: a ? a.innerText.trim() : null,
            href: a ? (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '') : null,
            rest: a ? li.innerText.slice(a.innerText.length).replace(/ /g, ' ') : li.innerText,
        };
    })).catch(() => []);
}

/** innerText of the first match, or null at once when there is none (no 30 s wait). */
async function quick(locator, fn = 'innerText') {
    if (!(await locator.count().catch(() => 0))) return null;
    return locator.first()[fn]({timeout: 3000}).catch(() => null);
}

/** What an address shows: status, content type, heading, trail, whether denied, the body text, the side menu. */
async function classify(page, resp) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        status: resp && typeof resp.status === 'function' ? resp.status() : resp,
        contentType: resp && typeof resp.headers === 'function' ? (resp.headers()['content-type'] || null) : null,
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
        trail: flat(await quick(page.locator('.app__breadcrumbs, nav[aria-label="Breadcrumb"], [class*="breadcrumb"]')), 200),
        denied: DENIED.test(body),
        login: /\/login(\?|$|\/)/.test(page.url()) || /Username or Email|Password/.test(body) && /Login|Log In|Sign in/i.test(body),
        body: flat(body, 700),
        dialogs: (await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)),
        nav: await readNav(page),
    };
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(15_000);
    let dialogAnswer = 'dismiss';
    const browserDialogs = [];
    page.on('dialog', (d) => {
        browserDialogs.push({type: d.type(), message: flat(d.message(), 300), answer: d.type() === 'beforeunload' ? 'accept' : dialogAnswer});
        (d.type() === 'beforeunload' || dialogAnswer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    const sect = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); } save(); };
    const go = async (u) => { let r = null; try { r = await page.goto(app.url(u)); } catch (e) { r = flat(e.message, 100); } await idle(page).catch(() => {}); return r; };
    const cu = (ctx, p) => `/index.php/${ctx}${p}`;

    /** Open the Tools page of ctx, wait for the Import/Export list; returns the page read. */
    const openTools = async (ctx, name) => {
        const r = await go(cu(ctx, '/management/tools'));
        if (await page.locator('#managementTabs').count()) await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15_000}).catch(() => {});
        const o = await classify(page, r);
        o.tabs = await tabStrips(page);
        o.list = await readList(page);
        if (name) await snap(page, name, o);
        return o;
    };

    try {
        // ------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.A) return;
            const t = tag('u63k1');
            const U = (p, k, roles) => ({username: `${p}${k}`, roles, givenName: `K1${k}`, familyName: `${k.toUpperCase()}${p.slice(-4)}`});
            const asst = isOPS ? 'editorialBoardMember' : 'copyeditor';
            const aUsers = [U(t, 'mgr', ['manager']), U(t, 'se', ['sectionEditor']), U(t, 'asst', [asst]), U(t, 'au', ['author']), U(t, 'rd', ['reader'])];
            if (!isOPS) aUsers.push(U(t, 'ed', ['editor']), U(t, 'pe', ['productionEditor']), U(t, 'rv', ['externalReviewer']));
            const mk = async (k, extra = {}) => {
                const p = `${t}${k}`.slice(0, 32);
                const r = await app.api.createContext({tag: p, context: {name: `U63 K1 ${k.toUpperCase()} ${t}`, acronym: `K1${k.toUpperCase()}`.slice(0, 8)}, ...extra});
                log('seed', k, JSON.stringify(r).slice(0, 300));
                return {path: p, name: `U63 K1 ${k.toUpperCase()} ${t}`};
            };
            S.t = t;
            S.A = {...(await mk('a', {users: aUsers})), u: Object.fromEntries(aUsers.map((u) => [u.username.slice(t.length), u.username]))};
            if (!isOPS) S.W = {...(await mk('w', {users: [U(t, 'wm', ['manager']), U(t, 'wed', ['editor']), U(t, 'wpe', ['productionEditor'])], roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}}})), mgr: `${t}wm`, ed: `${t}wed`, pe: `${t}wpe`};
            if (isOJS) S.D = {...(await mk('d', {users: [U(t, 'dm', ['manager'])]})), mgr: `${t}dm`};
            if (!isOPS) S.U = {...(await mk('u', {users: [U(t, 'um', ['manager']), U(t, 'uex', ['reader'])]})), mgr: `${t}um`, existing: `${t}uex`};
            save();
            note(`ccK1 [${app.name}]: scratch contexts A ${S.A.path}${S.W ? `, W ${S.W.path}` : ''}${S.D ? `, D ${S.D.path}` : ''}${S.U ? `, U ${S.U.path}` : ''} (tag ${t})`);
        });
        const A = S.A;

        // ------------------------------------------------------------ list: Rule 1, Rule 2, Fields table, td1
        await sect('list', async () => {
            const o = {};
            await as('manager.maya', 'publicknowledge');
            await go(cu('publicknowledge', '/submissions'));
            o.navPk = await readNav(page);
            // press the side menu's "Tools"
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            const toolsLink = nav.getByRole('link', {name: 'Tools', exact: true});
            o.toolsLinkCount = await toolsLink.count();
            if (o.toolsLinkCount) {
                await loc(page, 'Side menu: the "Tools" entry', toolsLink);
                await toolsLink.first().click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {});
                await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15_000}).catch(() => {});
                o.afterClickUrl = rel(page.url());
            }
            const pk = await classify(page, null);
            pk.tabs = await tabStrips(page);
            pk.list = await readList(page);
            pk.toolsTabIds = await page.locator('#managementTabs [role="tab"]').evaluateAll((ts) => ts.map((t) => ({text: t.innerText.trim(), selected: t.getAttribute('aria-selected'), a: (t.querySelector('a') || {}).getAttribute ? t.querySelector('a').getAttribute('name') : null}))).catch(() => []);
            await snap(page, 'l-01-tools-pk-manager', pk);
            await loc(page, 'Tools page: the tab "Import/Export"', page.getByRole('tab', {name: 'Import/Export'}));
            await loc(page, 'Tools page: the tab "Permissions"', page.getByRole('tab', {name: 'Permissions'}));
            await loc(page, 'Tools › Import/Export: the list lines', page.locator('.pkp_page_importexport_plugins li'));
            await loc(page, 'Tools › Import/Export: a tool by its link name', page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: 'Native XML Plugin'}));
            // the raw HTML of the list, for the colon and nbsp
            pk.listHtml = flat(await page.locator('.pkp_page_importexport_plugins').innerHTML().catch(() => null), 3000);
            o.pk = {url: pk.url, h1: pk.h1, tabs: pk.tabs, toolsTabIds: pk.toolsTabIds, list: pk.list, listHtml: pk.listHtml};
            // Permissions tab
            const pt = page.getByRole('tab', {name: 'Permissions'});
            if (await pt.count()) {
                await pt.first().click(); await idle(page).catch(() => {});
                await page.locator('#resetPermissionsForm').waitFor({timeout: 10_000}).catch(() => {});
                const s = await snap(page, 'l-02-tools-pk-permissions');
                o.permissionsTab = {tabs: await tabStrips(page), text: flat(await page.locator('#resetPermissionsForm').innerText().catch(() => null), 500), button: await page.locator('#resetPermissionsForm button, #resetPermissionsForm input[type=submit]').allInnerTexts().catch(() => [])};
                await loc(page, 'Tools › Permissions: the reset button', page.locator('#resetPermissionsForm').getByRole('button'));
                // back to Import/Export: does the list come back
                await page.getByRole('tab', {name: 'Import/Export'}).first().click(); await idle(page).catch(() => {});
                o.backToImportExport = (await readList(page)).length;
            }
            await out();
            // the scratch context A: same order?
            await as(A.u.mgr, A.path);
            const sa = await openTools(A.path, 'l-03-tools-scratch-manager');
            o.scratch = {url: sa.url, h1: sa.h1, tabs: sa.tabs, list: sa.list};
            o.sameOrder = JSON.stringify(sa.list.map((x) => x.name)) === JSON.stringify(pk.list.map((x) => x.name));
            o.sameText = JSON.stringify(sa.list.map((x) => x.text)) === JSON.stringify(pk.list.map((x) => x.text));
            // the address management/importexport alone (what the tab loads)
            const r = await go(cu(A.path, '/management/importexport'));
            o.importexportBare = await classify(page, r);
            await snap(page, 'l-04-importexport-bare', o.importexportBare);
            await out();
            fact('list', o);
        });

        // ------------------------------------------------------------ tools: Rule 4, Rule 6 (each tool's page, trail, "Tools" back; the pages' content)
        await sect('tools', async () => {
            const o = {};
            await as(A.u.mgr, A.path);
            const first = await openTools(A.path);
            for (const [i, item] of first.list.entries()) {
                const r = {};
                await openTools(A.path);
                const link = page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: item.name, exact: true});
                r.linkCount = await link.count();
                if (!r.linkCount) { o[item.name] = r; continue; }
                const respP = page.waitForResponse((x) => x.url().includes('/management/importexport/plugin/') && x.request().resourceType() === 'document', {timeout: 30_000}).catch(() => null);
                await link.first().click();
                const resp = await respP;
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {});
                await sleep(800);
                const c = await classify(page, resp);
                c.tabs = await tabStrips(page);
                c.headingTag = await quick(page.locator('h1'), 'innerHTML');
                c.trailLinks = await page.locator('.app__breadcrumbs a, nav[aria-label="Breadcrumb"] a').evaluateAll((as_) => as_.map((a) => `${a.innerText.trim()} → ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => []);
                c.trailHtml = flat(await quick(page.locator('.app__breadcrumbs, nav[aria-label="Breadcrumb"]'), 'innerHTML'), 800);
                c.mainText = flat(await quick(page.locator('main')), 1200);
                const nm = `t-${String(i + 1).padStart(2, '0')}-${item.name.replace(/[^A-Za-z0-9]+/g, '').slice(0, 30)}`;
                await snap(page, nm, c);
                r.page = {status: c.status, url: c.url, h1: c.h1, trail: c.trail, trailLinks: c.trailLinks, tabs: c.tabs, main: c.mainText, denied: c.denied, contentType: c.contentType};
                if (i === 0) {
                    await loc(page, 'A tool page: the heading', page.locator('h1.app__pageHeading'));
                    await loc(page, 'A tool page: the trail "Tools" link', page.locator('.app__breadcrumbs').getByRole('link', {name: 'Tools'}));
                }
                // "Tools" in the trail returns
                const back = page.locator('.app__breadcrumbs, nav[aria-label="Breadcrumb"]').first().getByRole('link', {name: 'Tools', exact: true});
                if (await back.count()) {
                    await back.first().click();
                    await page.waitForLoadState('load').catch(() => {});
                    await idle(page).catch(() => {});
                    await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15_000}).catch(() => {});
                    r.back = {url: rel(page.url()), h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)), tabs: await tabStrips(page), listLen: (await readList(page)).length};
                } else r.back = 'no Tools link in trail';
                o[item.name] = r;
            }
            await out();
            fact('tools', o);
        });

        // ------------------------------------------------------------ roles: Actors rows 1–2, td22, td23, the side menu
        await sect('roles', async () => {
            const o = {};
            const probeAs = async (label, user, ctx) => {
                const r = {};
                if (user) await as(user, ctx); else await out();
                await go(cu(ctx, '/submissions'));
                r.nav = await readNav(page);
                r.navHasTools = !!(r.nav.items || []).find((x) => /^Tools$/.test(x)) || !!(r.nav.links || []).find((x) => /^Tools →/.test(x));
                r.navHasSettings = !!(r.nav.groups || []).find((x) => /^Settings/.test(x)) || !!(r.nav.items || []).find((x) => /^Settings$/.test(x));
                const tools = await openTools(ctx, `r-${label}-tools`);
                r.tools = {status: tools.status, url: tools.url, h1: tools.h1, denied: tools.denied, login: tools.login, listLen: tools.list.length, tabs: tools.tabs, body: tools.denied || tools.login ? tools.body.slice(0, 200) : undefined};
                for (const [k, pl] of [['native', 'NativeImportExportPlugin'], ['users', 'UserImportExportPlugin']]) {
                    if (k === 'users' && isOPS) continue;
                    const rr = await go(cu(ctx, `/management/importexport/plugin/${pl}`));
                    const c = await classify(page, rr);
                    await snap(page, `r-${label}-${k}`, c);
                    r[k] = {status: c.status, url: c.url, h1: c.h1, denied: c.denied, login: c.login, body: c.denied || c.login ? c.body.slice(0, 200) : undefined, tabs: await tabStrips(page)};
                }
                const sr = await go(cu(ctx, '/management/settings/context'));
                r.settings = {status: sr && sr.status ? sr.status() : sr, url: rel(page.url()), denied: DENIED.test(await page.locator('body').innerText().catch(() => ''))};
                return r;
            };
            // one account per permission level on A
            o.A = {};
            for (const [k, u] of [['admin', 'admin'], ...Object.entries(A.u)]) o.A[k] = await probeAs(`a-${k}`, u, A.path);
            // the seeded Section Editor on publicknowledge (td23 names it)
            o.pk = {};
            for (const u of ['sectioneditor.ana', 'manager.maya', 'admin']) o.pk[u] = await probeAs(`pk-${u.replace(/\W/g, '')}`, u, 'publicknowledge');
            if (!isOPS) o.pk['editor.diana'] = await probeAs('pk-editordiana', 'editor.diana', 'publicknowledge');
            // W: Permit changes to Settings unticked (td22)
            if (S.W) {
                o.W = {};
                for (const [k, u] of [['wed', S.W.ed], ['wpe', S.W.pe], ['wm', S.W.mgr]]) o.W[k] = await probeAs(`w-${k}`, u, S.W.path);
            }
            // signed out (td23)
            await out();
            o.signedOut = {};
            for (const [k, p] of [['tools', '/management/tools'], ['native', '/management/importexport/plugin/NativeImportExportPlugin']]) {
                const rr = await go(cu('publicknowledge', p));
                const c = await classify(page, rr);
                await snap(page, `r-signedout-${k}`, c);
                o.signedOut[k] = {status: c.status, url: c.url, h1: c.h1, login: c.login, denied: c.denied};
            }
            fact('roles', o);
        });

        // ------------------------------------------------------------ plugins: Rule 3, Rule 4 second half, Rule 6 / OMP1 (Plugins list rows)
        await sect('plugins', async () => {
            const o = {};
            await as(A.u.mgr, A.path);
            const p = await openWebsitePlugins(page, app, A.path);
            const g = await readGrid(page);
            o.grid = brief(g);
            const ie = g.found && g.cats.find((c) => c.id === 'importexport');
            o.importexport = ie ? ie.rows.map((r) => ({id: r.id, name: r.name, checked: r.checked, disabled: r.disabled, arrow: r.arrow})) : null;
            const gen = g.found && g.cats.find((c) => c.id === 'generic');
            o.genericDoiDoaj = gen ? gen.rows.filter((r) => /DOAJ|Crossref|DataCite|PubMed/i.test(r.name)).map((r) => ({id: r.id, name: r.name, checked: r.checked, disabled: r.disabled, arrow: r.arrow})) : null;
            await snap(page, 'p-01-plugins-list', {grid: o.grid});
            o.links = {};
            for (const r of (ie ? ie.rows : [])) o.links[r.id] = await rowLinks(page, r.id);
            for (const r of (o.genericDoiDoaj || [])) o.links[r.id] = await rowLinks(page, r.id);
            // press a locked box (Rule 3: cannot be pressed)
            if (ie && ie.rows[0]) o.pressLocked = await pressBox(page, ie.rows[0].id);
            // "Import/Export Data" on each row that has it: what opens
            o.viaPlugins = {};
            for (const r of (ie ? ie.rows : [])) {
                await openWebsitePlugins(page, app, A.path);
                const lk = await rowLinks(page, r.id, {close: false});
                if (!(lk.links || []).includes('Import/Export Data')) { o.viaPlugins[r.id] = {links: lk.links}; continue; }
                const a = page.locator(G.GRID).first().locator(`tr.gridRow[id$="-row-${r.id}"]`).first().locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Import/Export Data'});
                const respP = page.waitForResponse((x) => x.url().includes('/management/importexport/plugin/') && x.request().resourceType() === 'document', {timeout: 20_000}).catch(() => null);
                const popupP = page.context().waitForEvent('page', {timeout: 3000}).catch(() => null);
                await a.first().click();
                const [resp, popup] = await Promise.all([respP, popupP]);
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {});
                const c = await classify(page, resp);
                o.viaPlugins[r.id] = {popup: !!popup, status: c.status, url: c.url, h1: c.h1, trail: c.trail};
                if (r.id === 'nativeimportexportplugin') { await snap(page, 'p-02-native-via-plugins', c); }
                if (popup) await popup.close().catch(() => {});
            }
            await out();
            fact('plugins', o);
        });

        // ------------------------------------------------------------ doaj: td2 (OJS), Rule 3's exception; the DOI tools' generic plugins
        await sect('doaj', async () => {
            if (!S.D) return;
            const o = {};
            const D = S.D;
            await as(D.mgr, D.path);
            const t0 = await openTools(D.path, 'd-01-tools-default');
            o.default = t0.list.map((x) => x.name);
            let p = await openWebsitePlugins(page, app, D.path);
            let g = await readGrid(page);
            o.defaultRows = {doaj: findRow(g, 'doajplugin'), crossref: findRow(g, 'crossrefplugin'), datacite: findRow(g, 'dataciteplugin'), pubmed: findRow(g, 'pubmedexportplugin')};
            dialogAnswer = 'accept';
            o.untickDoaj = await pressBox(page, 'doajplugin', {answer: 'OK'});
            await snap(page, 'd-02-doaj-unticked-same-page', {res: o.untickDoaj});
            await openWebsitePlugins(page, app, D.path);
            g = await readGrid(page);
            o.doajAfterReload = findRow(g, 'doajplugin');
            o.doajExportRowWhileOff = findRow(g, 'DOAJExportPlugin');
            o.importexportWhileOff = brief(g).filter((x) => /^Import\/Export/.test(x));
            const t1 = await openTools(D.path, 'd-03-tools-doaj-off');
            o.doajOff = t1.list.map((x) => x.name);
            let r = await go(cu(D.path, '/management/importexport/plugin/DOAJExportPlugin'));
            o.doajAddressOff = await classify(page, r);
            await snap(page, 'd-04-doaj-address-off', o.doajAddressOff);
            // Crossref manager and DataCite: switch each one's state and read the list
            await openWebsitePlugins(page, app, D.path);
            g = await readGrid(page);
            for (const id of ['crossrefplugin', 'dataciteplugin']) {
                const row = findRow(g, id);
                o[`${id}Before`] = row;
                if (row && !row.disabled) {
                    o[`${id}Press`] = await pressBox(page, id, {answer: 'OK'});
                    const tl = await openTools(D.path, `d-05-tools-${id}-pressed`);
                    o[`${id}PressedList`] = tl.list.map((x) => x.name);
                    await openWebsitePlugins(page, app, D.path);
                    g = await readGrid(page);
                    o[`${id}After`] = findRow(g, id);
                }
            }
            // put DOAJ back on and read again
            await openWebsitePlugins(page, app, D.path);
            o.retickDoaj = await pressBox(page, 'doajplugin', {answer: 'OK'});
            const t2 = await openTools(D.path, 'd-06-tools-doaj-on-again');
            o.doajOnAgain = t2.list.map((x) => x.name);
            dialogAnswer = 'dismiss';
            await out();
            fact('doaj', o);
        });

        // ------------------------------------------------------------ order: td1's order after DOAJ Plugin off and on again (OJS, a fresh journal O)
        await sect('order', async () => {
            if (!isOJS) return;
            const o = {};
            if (!S.O) {
                const p = `${S.t}o`;
                await app.api.createContext({tag: p, context: {name: `U63 K1 O ${S.t}`, acronym: 'K1O'}, users: [{username: `${p}m`, roles: ['manager'], givenName: 'K1om', familyName: 'OM'}]});
                S.O = {path: p, mgr: `${p}m`}; save();
            }
            await as(S.O.mgr, S.O.path);
            o.fresh = (await openTools(S.O.path, 'o-01-tools-fresh')).list.map((x) => x.name);
            dialogAnswer = 'accept';
            await openWebsitePlugins(page, app, S.O.path);
            o.off = await pressBox(page, 'doajplugin', {answer: 'OK'});
            o.offList = (await openTools(S.O.path, 'o-02-tools-doaj-off')).list.map((x) => x.name);
            await openWebsitePlugins(page, app, S.O.path);
            o.on = await pressBox(page, 'doajplugin', {answer: 'OK'});
            dialogAnswer = 'dismiss';
            o.onList = (await openTools(S.O.path, 'o-03-tools-doaj-on-again')).list.map((x) => x.name);
            o.pkList = (await openTools('publicknowledge')).list.map((x) => x.name);
            await out();
            fact('order', o);
        });

        // ------------------------------------------------------------ doajrow: with "DOAJ Plugin" off, the Plugins list's "DOAJ Export Plugin" row and its "Import/Export Data" (OJS, journal O)
        await sect('doajrow', async () => {
            if (!isOJS || !S.O) return;
            const o = {};
            await as(S.O.mgr, S.O.path);
            dialogAnswer = 'accept';
            await openWebsitePlugins(page, app, S.O.path);
            o.off = (await pressBox(page, 'doajplugin', {answer: 'OK'})).after;
            await openWebsitePlugins(page, app, S.O.path);
            const g = await readGrid(page);
            o.row = findRow(g, 'DOAJExportPlugin');
            o.links = await rowLinks(page, 'DOAJExportPlugin', {close: false});
            if ((o.links.links || []).includes('Import/Export Data')) {
                const a = page.locator(G.GRID).first().locator('tr.gridRow[id$="-row-DOAJExportPlugin"]').first().locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Import/Export Data'});
                const respP = page.waitForResponse((x) => x.url().includes('/management/importexport/plugin/') && x.request().resourceType() === 'document', {timeout: 20_000}).catch(() => null);
                await a.first().click();
                const resp = await respP;
                await page.waitForLoadState('load').catch(() => {});
                const c = await classify(page, resp);
                await snap(page, 'o-04-doaj-export-data-while-off', c);
                o.opened = {status: c.status, contentType: c.contentType, url: c.url, h1: c.h1, nav: c.nav.present, body: c.body.slice(0, 200)};
            }
            await openWebsitePlugins(page, app, S.O.path);
            o.on = (await pressBox(page, 'doajplugin', {answer: 'OK'})).after;
            dialogAnswer = 'dismiss';
            await out();
            fact('doajrow', o);
        });

        // ------------------------------------------------------------ absent: Rule 5, A1, td3; an absent tool per app
        await sect('absent', async () => {
            const o = {};
            await as('manager.maya', 'publicknowledge');
            const names = ['NoSuchPlugin'];
            if (isOMP) names.push('CrossrefExportPlugin', 'DOAJExportPlugin', 'PubMedExportPlugin');
            if (isOPS) names.push('UserImportExportPlugin', 'DOAJExportPlugin', 'DataciteExportPlugin');
            if (isOJS) names.push('CSVImportExportPlugin', 'Onix30ExportPlugin');
            for (const n of names) {
                const r = await go(cu('publicknowledge', `/management/importexport/plugin/${n}`));
                const c = await classify(page, r);
                c.rawHead = flat(await page.content().catch(() => null), 500);
                c.linksOnPage = await page.locator('a').count().catch(() => null);
                await snap(page, `x-${n}`, c);
                o[n] = {status: c.status, contentType: c.contentType, url: c.url, h1: c.h1, navPresent: c.nav.present, links: c.linksOnPage, body: c.body.slice(0, 400), rawHead: c.rawHead};
            }
            // the lowercase spelling of a real tool
            const r2 = await go(cu('publicknowledge', '/management/importexport/plugin/nativeimportexportplugin'));
            const c2 = await classify(page, r2);
            o.lowercaseNative = {status: c2.status, contentType: c2.contentType, h1: c2.h1, body: c2.body.slice(0, 200)};
            await out();
            fact('absent', o);
        });

        // ------------------------------------------------------------ permit: Settings bullet 1 (the box's default on each manager-level role)
        await sect('permit', async () => {
            const o = {};
            await as(A.u.mgr, A.path);
            await go(cu(A.path, '/management/settings/access'));
            await page.getByRole('tab', {name: 'Roles'}).click();
            await idle(page).catch(() => {});
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.grid = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            await snap(page, 'm-01-roles-grid');
            const roleNames = isOPS ? ['Preprint Server manager'] : isOJS ? ['Journal manager', 'Journal editor', 'Production editor'] : ['Press Manager', 'Press editor', 'Production editor'];
            o.forms = {};
            for (const rn of roleNames) {
                await go(cu(A.path, '/management/settings/access'));
                await page.getByRole('tab', {name: 'Roles'}).click();
                await idle(page).catch(() => {});
                const row = page.getByRole('row', {name: new RegExp(`${rn}\\b`, 'i')}).first();
                try {
                    await row.waitFor({timeout: 15_000});
                    await row.getByRole('link', {name: 'Settings'}).click();
                    await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
                    await idle(page).catch(() => {});
                    const form = page.locator('#userGroupForm');
                    await form.waitFor({timeout: T});
                    await sleep(600);
                    o.forms[rn] = {boxes: await form.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({checked: e.checked, disabled: e.disabled, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim().slice(0, 60) : e.name})))};
                    await snap(page, `m-02-form-${rn.replace(/\W+/g, '')}`);
                    const cancel = form.getByRole('link', {name: 'Cancel'}).or(form.getByRole('button', {name: 'Cancel'}));
                    await cancel.first().click().catch(() => {});
                } catch (e) { o.forms[rn] = {error: flat(e.message, 200)}; }
            }
            await out();
            fact('permit', o);
        });

        // ------------------------------------------------------------ admin: Actors (the Site Administrator's role in each journal); Settings bullet 1 (the manager role's box, read as the Site Administrator)
        await sect('admin', async () => {
            const o = {};
            await as('admin', A.path);
            for (const ctx of ['publicknowledge', A.path]) {
                await go(cu(ctx, '/management/settings/access'));
                await page.locator('table').first().waitFor({timeout: T}).catch(() => {});
                await sleep(800);
                const row = await page.locator('tr').filter({hasText: 'admin@mail.test'}).allInnerTexts().catch(() => []);
                o[`${ctx === A.path ? 'A' : 'pk'}AdminRow`] = row.map((x) => flat(x, 200));
                await snap(page, `n-01-users-admin-${ctx === A.path ? 'A' : 'pk'}`);
            }
            await go(cu(A.path, '/management/settings/access'));
            await page.getByRole('tab', {name: 'Roles'}).click();
            await idle(page).catch(() => {});
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.rolesGridAsAdmin = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((x) => /manager/i.test(x)));
            const rn = isOPS ? 'Preprint Server manager' : isOJS ? 'Journal manager' : 'Press manager';
            const row = page.getByRole('row', {name: new RegExp(`${rn}\\b`, 'i')}).first();
            o.managerRowHasSettings = await row.getByRole('link', {name: 'Settings'}).count().catch(() => null);
            if (o.managerRowHasSettings) {
                await row.getByRole('link', {name: 'Settings'}).click();
                await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
                await idle(page).catch(() => {});
                const form = page.locator('#userGroupForm');
                await form.waitFor({timeout: T}).catch(() => {});
                await sleep(600);
                o.managerForm = await form.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({checked: e.checked, disabled: e.disabled, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim().slice(0, 40) : e.name}))).catch(() => null);
                await snap(page, 'n-02-manager-role-form-as-admin');
                await form.getByRole('link', {name: 'Cancel'}).or(form.getByRole('button', {name: 'Cancel'})).first().click().catch(() => {});
            }
            await out();
            fact('admin', o);
        });

        // ------------------------------------------------------------ perms: the Permissions tab's button (sweep), on A
        await sect('perms', async () => {
            const o = {};
            await as(A.u.mgr, A.path);
            await openTools(A.path);
            await page.getByRole('tab', {name: 'Permissions'}).first().click();
            await idle(page).catch(() => {});
            const form = page.locator('#resetPermissionsForm');
            await form.waitFor({timeout: 10_000}).catch(() => {});
            const btn = form.getByRole('button').first();
            o.button = flat(await btn.innerText().catch(() => null), 60);
            const n0 = browserDialogs.length;
            dialogAnswer = 'dismiss';
            await btn.click();
            await sleep(1000);
            o.confirmCancelled = browserDialogs.slice(n0);
            o.buttonAfterCancel = {disabled: await btn.isDisabled().catch(() => null)};
            await snap(page, 'q-01-reset-cancelled', o);
            // OK on the scratch journal, after a reload
            await openTools(A.path);
            await page.getByRole('tab', {name: 'Permissions'}).first().click();
            await idle(page).catch(() => {});
            await form.waitFor({timeout: 10_000}).catch(() => {});
            const n1 = browserDialogs.length;
            dialogAnswer = 'accept';
            const respP = page.waitForResponse((x) => x.url().includes('resetPermissions'), {timeout: 15_000}).catch(() => null);
            await form.getByRole('button').first().click();
            const resp = await respP;
            dialogAnswer = 'dismiss';
            o.confirmAccepted = browserDialogs.slice(n1);
            o.reset = {status: resp ? resp.status() : null, body: resp ? flat(await resp.text().catch(() => null), 300) : null, toast: await G.readToast(page, 5000)};
            await idle(page).catch(() => {});
            await sleep(800);
            o.afterReset = {url: rel(page.url()), tabs: await tabStrips(page), text: flat(await page.locator('main').innerText().catch(() => null), 400)};
            await snap(page, 'q-02-reset-done', o);
            await out();
            fact('perms', o);
        });

        // ------------------------------------------------------------ import: Actors row 4 (the "Journal Registration" email), {OJS OMP}
        await sect('import', async () => {
            if (!S.U) return;
            const o = {};
            const Uc = S.U;
            const t = S.t;
            const php = (pw) => execFileSync('php', ['-r', `echo password_hash(${JSON.stringify(pw)}, PASSWORD_BCRYPT);`]).toString().trim();
            const hash10 = execFileSync('php', ['-r', 'echo password_hash("oldpassword1", PASSWORD_BCRYPT, ["cost" => 10]);']).toString().trim();
            const hash12 = php('newpassword1');
            const md5 = 'e10adc3949ba59abbe56e057f20f883e';
            const roleName = isOJS ? 'Reader' : 'Reader';
            const user = (k, pw) => `\t\t<user>\n\t\t\t<givenname locale="en">K1${k}</givenname>\n\t\t\t<familyname locale="en">Imp${k}</familyname>\n\t\t\t<email>${t}${k}@mail.test</email>\n\t\t\t<username>${t}${k}</username>\n${pw}\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${roleName}</user_group_ref>\n\t\t\t\t<masthead>false</masthead>\n\t\t\t</user_user_group>\n\t\t</user>\n`;
            const pwEl = (attrs, val) => `\t\t\t<password${attrs}>\n\t\t\t\t<value>${val}</value>\n\t\t\t</password>\n`;
            const cases = {
                irehash: pwEl(' is_disabled="false" must_change="false" encryption="sha1"', hash10),
                imd5: pwEl(' is_disabled="false" must_change="false" encryption="md5"', md5),
                ikeep: pwEl(' is_disabled="false" must_change="false" encryption="sha1"', hash12),
                iplain: pwEl(' is_disabled="false" must_change="false"', 'plainpassword1'),
                ishort: pwEl(' is_disabled="false" must_change="false"', 'abc'),
            };
            const existingXml = `\t\t<user>\n\t\t\t<givenname locale="en">K1uex</givenname>\n\t\t\t<familyname locale="en">UEX${t.slice(-4)}</familyname>\n\t\t\t<email>${Uc.existing}@mail.test</email>\n\t\t\t<username>${Uc.existing}</username>\n${pwEl(' is_disabled="false" must_change="false" encryption="sha1"', hash10)}\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>Author</user_group_ref>\n\t\t\t\t<masthead>false</masthead>\n\t\t\t</user_user_group>\n\t\t</user>\n`;
            const grp = (role, name, abbrev, stages, selfReg) => `\t\t<user_group>\n\t\t\t<role_id>${role}</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>${selfReg}</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">${name}</name>\n\t\t\t<abbrev locale="en">${abbrev}</abbrev>\n\t\t\t<stage_assignments>${stages}</stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n`;
            const groups = `\t<user_groups>\n${grp(65536, 'Author', 'AU', '1:3:4:5', 'true')}${grp(1048576, 'Reader', 'Read', '', 'true')}\t</user_groups>\n`;
            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n${groups}\t<users>\n${Object.entries(cases).map(([k, pw]) => user(k, pw)).join('')}${existingXml}\t</users>\n</PKPUsers>\n`;
            const file = path.join(outDir(), `k1-users-${app.name}.xml`);
            fs.writeFileSync(file, xml);
            o.file = path.basename(file);
            await as(Uc.mgr, Uc.path);
            await go(cu(Uc.path, '/management/importexport/plugin/UserImportExportPlugin'));
            await page.locator('#importXmlForm').waitFor({timeout: T});
            const input = page.locator('#importXmlForm input[type=file]').first();
            await input.setInputFiles(file);
            await page.locator('#importXmlForm').getByText(path.basename(file)).first().waitFor({timeout: 20_000}).catch(() => {});
            await sleep(500);
            const btn = page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'});
            await btn.click();
            await page.getByRole('tab', {name: 'Results'}).first().waitFor({timeout: 60_000}).catch(() => {});
            await idle(page).catch(() => {});
            await sleep(1500);
            o.tabs = await tabStrips(page);
            o.results = flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText().catch(() => null), 2000);
            await snap(page, 'i-01-users-import-results', o);
            // the mail each account got (and the manager, and the existing user)
            o.mail = {};
            const ctl = `${t}irehash@mail.test`;
            try { const m = await app.mail.find({to: ctl, timeoutMs: 20_000}); o.mail.control = {subject: m.Subject, from: (m.From || {}).Address, to: (m.To || []).map((x) => x.Address)}; } catch (e) { o.mail.control = flat(e.message, 200); }
            for (const k of [...Object.keys(cases), 'uex', 'um']) {
                const addr = `${t}${k}@mail.test`;
                const r = await app.mail._search({to: addr}).catch((e) => ({err: flat(e.message, 100)}));
                o.mail[k] = (r.messages || []).map((m) => ({subject: m.Subject, from: (m.From || {}).Address, replyTo: (m.ReplyTo || []).map((x) => x.Address)}));
            }
            // users list: were the accounts created
            await go(cu(Uc.path, `/management/settings/access`));
            await idle(page).catch(() => {});
            await sleep(1000);
            o.usersListText = flat(await page.locator('main').innerText().catch(() => null), 2500);
            await snap(page, 'i-02-users-list-after-import');
            await out();
            fact('import', o);
        });
        // ------------------------------------------------------------ key: fn-sc's `plugins: {doajplugin: {enabled: false}}` seeds Settings bullet 2 (OJS)
        await sect('key', async () => {
            if (!isOJS) return;
            const k = `${S.t}k`;
            const r = await app.api.createContext({tag: k, context: {name: `U63 K1 K ${S.t}`, acronym: 'K1K'}, plugins: {doajplugin: {enabled: false}}, users: [{username: `${k}m`, roles: ['manager'], givenName: 'K1k', familyName: 'KM'}]}).catch((e) => ({error: flat(e.message, 300)}));
            await as(`${k}m`, k);
            const tl = await openTools(k, 'k-01-tools-doaj-key-off');
            await out();
            fact('key', {create: r.error || 'ok', list: tl.list.map((x) => x.name)});
        });
        // ------------------------------------------------------------ nodate: a schema-valid users file whose <user> has no <date_registered> (the XSD makes it optional) {OJS OMP}
        await sect('nodate', async () => {
            if (!S.U) return;
            const o = {};
            const u = `${S.t}nd${Math.random().toString(36).slice(2, 5)}`;
            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n\t<user_groups>\n\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>true</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n\t</user_groups>\n\t<users>\n\t\t<user>\n\t\t\t<givenname locale="en">K1nd</givenname>\n\t\t\t<familyname locale="en">ND</familyname>\n\t\t\t<email>${u}@mail.test</email>\n\t\t\t<username>${u}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>plainpassword1</value>\n\t\t\t</password>\n\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>Reader</user_group_ref>\n\t\t\t\t<masthead>false</masthead>\n\t\t\t</user_user_group>\n\t\t</user>\n\t</users>\n</PKPUsers>\n`;
            const file = path.join(outDir(), `k1-users-nodate-${app.name}.xml`);
            fs.writeFileSync(file, xml);
            await as(S.U.mgr, S.U.path);
            await go(cu(S.U.path, '/management/importexport/plugin/UserImportExportPlugin'));
            await page.locator('#importXmlForm').waitFor({timeout: T});
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            await page.locator('#importXmlForm').getByText(path.basename(file)).first().waitFor({timeout: 20_000}).catch(() => {});
            const respP = page.waitForResponse((x) => /UserImportExportPlugin\/import\?/.test(x.url()), {timeout: 60_000}).catch(() => null);
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
            const resp = await respP;
            o.importStatus = resp ? resp.status() : null;
            await idle(page).catch(() => {});
            await sleep(1000);
            o.tabs = await tabStrips(page);
            o.results = flat(await quick(page.locator('#importExportTabs .ui-tabs-panel:visible')), 600);
            await snap(page, 'u-01-users-import-no-date', o);
            await go(cu(S.U.path, '/management/settings/access'));
            await sleep(1000);
            o.listed = await page.locator('tr').filter({hasText: `${u}@mail.test`}).count();
            await out();
            fact('nodate', o);
        });
    } finally {
        record('k1-dialogs', {browserDialogs});
        await close();
    }
});
