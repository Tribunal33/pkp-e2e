// U62 claim check, chunk K3: the Plugin Gallery and what cuts across the screens.
// Spec docs/specs/U62-plugins-management.md: gallery Fields 80-93, Rules 22-26
// (251-288), Side effects 289-300, Settings preamble and bullets 1-2 (301-318),
// Cross-feature interactions 327-351, Canonical preamble and Coverage 352-400,
// register A1 (422-431); footnotes k, n, o, p, q, r, sc, f-a1, td18.
//
// Run (all three apps, one process; or one app):
//   PROBE_FEATURE=U62 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U62/K3/k3.js
//   PH=gallery,site,wizard,leave,side,sysinfo,preamble  runs only those phases.
//
// Seeds one scratch context per app (tag prefix u62k3) with a throwaway
// manager, an editor and a production editor (journal and press only) and a
// section editor. Mutates only that context ("Google Analytics Plugin" ticked
// and unticked again). Reads Site Settings, the Settings Wizard and System
// Information as `admin` without saving anything.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const ALL = ['gallery', 'site', 'wizard', 'leave', 'side', 'sysinfo', 'preamble'];
const PHASES = process.env.PH ? process.env.PH.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const SUMMARY = process.env.PH ? `k3-summary-${PHASES.join('-')}` : 'k3-summary';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log('[k3]', new Date().toISOString().slice(11, 19), ...a);
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';
const GALLERY = /plugin-gallery-grid\//;

function psql(app, q) {
    try {
        return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `ERR ${flat(e.message, 200)}`;
    }
}

async function mailCount(address) {
    try {
        const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=1`);
        const j = await r.json();
        return j.messages_count ?? j.total ?? null;
    } catch (e) {
        return `ERR ${flat(e.message, 100)}`;
    }
}

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
let GAL = [];
function watch(page) {
    page.on('response', async (r) => {
        const url = r.url();
        if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${url.replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}`);
        if (GALLERY.test(url)) {
            let body = null;
            try { body = flat(await r.text(), 400); } catch { /* gone */ }
            GAL.push({phase: CUR, method: r.request().method(), status: r.status(), url: url.replace(/^https?:\/\/[^/]+/, '').slice(0, 200), body});
        }
    });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => {
        DIALOGS.push({phase: CUR, type: d.type(), message: d.message()});
        (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
    });
    return page;
}

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: String(e.message).slice(0, 300)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

async function go(page, url) {
    const resp = await page.goto(url).catch(() => null);
    await idle(page).catch(() => {});
    return resp;
}

async function tabStrips(page) {
    return page.evaluate(() => [...document.querySelectorAll('[role="tablist"]')].map((l) => [...l.querySelectorAll('[role="tab"]')]
        .filter((t) => t.closest('[role="tablist"]') === l)
        .filter((t) => t.getAttribute('aria-selected') === 'true' && t.offsetParent !== null)
        .map((t) => `${t.innerText.trim()} #${t.id}`)).filter((l) => l.length).map((l) => l.join(',')).join(' | ')).catch(() => '');
}

async function toasts(page) {
    return page.locator('.pkpNotification:visible, .pkp_notification:visible, [role="alert"]:visible, .ui-pnotify:visible')
        .evaluateAll((els) => els.map((e) => {
            const b = e.getBoundingClientRect();
            return {text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), cls: e.className.slice(0, 80), left: Math.round(b.left), top: Math.round(b.top), right: Math.round(window.innerWidth - b.right), vw: window.innerWidth};
        })).catch(() => []);
}

/** What a legacy grid container holds: its text, rows, spinner, filter controls. */
async function container(page, id) {
    return page.evaluate((cid) => {
        const c = document.getElementById(cid);
        if (!c) return {present: false};
        const vis = (e) => !!(e && e.offsetParent !== null);
        return {
            present: true,
            visible: vis(c),
            htmlLength: c.innerHTML.length,
            text: c.innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
            rows: c.querySelectorAll('tr.gridRow').length,
            categories: [...c.querySelectorAll('tr.category')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()).slice(0, 20),
            spinner: [...c.querySelectorAll('.pkp_spinner, .pkp_loading, [class*=spinner], [class*=loading]')].filter(vis).map((e) => e.className).slice(0, 5),
            inputs: [...c.querySelectorAll('input, select, button, a')].filter(vis).map((e) => `${e.tagName.toLowerCase()}${e.name ? `[name=${e.name}]` : ''} ${(e.innerText || e.value || e.getAttribute('title') || '').trim().slice(0, 40)}`).slice(0, 30),
            htmlHead: c.innerHTML.replace(/\s+/g, ' ').slice(0, 300),
        };
    }, id).catch((e) => ({error: String(e.message).slice(0, 200)}));
}

async function pluginRows(page) {
    return page.evaluate(() => {
        const c = document.getElementById('pluginGridContainer');
        if (!c) return null;
        const out = [];
        let cat = null;
        for (const tr of c.querySelectorAll('tr')) {
            if (/category/.test(tr.className)) cat = tr.innerText.replace(/\s+/g, ' ').trim();
            else if (tr.classList.contains('gridRow')) {
                const box = tr.querySelector('input[type=checkbox]');
                out.push({category: cat, id: tr.id.replace(/^.*-row-/, ''), name: (tr.querySelector('td') || tr).innerText.replace(/\s+/g, ' ').trim().slice(0, 70),
                    checked: box ? box.checked : null, disabled: box ? box.disabled : null});
            }
        }
        return out;
    }).catch(() => null);
}

/** Open the "Plugins" top tab and each of its inner tabs; record both, with the gallery traffic. */
async function drivePluginsTab(page, prefix, {installedId, galleryId, galleryName = 'Plugin Gallery'}) {
    const o = {};
    await page.locator('#plugins-button').first().click();
    await idle(page); await sleep(500);
    o.tabsAfterPlugins = await tabStrips(page);
    o.urlAfterPlugins = page.url();
    o.installed = await container(page, 'pluginGridContainer');
    o.uploadLink = await page.getByRole('link', {name: 'Upload A New Plugin'}).count().catch(() => null)
        || await page.getByText('Upload A New Plugin', {exact: true}).count().catch(() => null);
    await snap(page, `${prefix}-installed`, {o});
    await loc(page, `${prefix}: the "${galleryName}" inner tab`, page.getByRole('tab', {name: galleryName, exact: true}));
    const galTab = page.locator(`#${galleryId}-button`).first();
    if (await galTab.count()) await galTab.click(); else await page.getByRole('tab', {name: galleryName, exact: true}).first().click();
    await idle(page); await sleep(800);
    o.urlAfterGallery = page.url();
    o.tabsAfterGallery = await tabStrips(page);
    o.gallery = await container(page, 'pluginGalleryGridContainer');
    o.toastsOnGallery = await toasts(page);
    await snap(page, `${prefix}-gallery`, {o});
    // still the same ten seconds later? (the spinner is not a transient)
    await sleep(10_000);
    o.galleryAfter10s = await container(page, 'pluginGalleryGridContainer');
    await snap(page, `${prefix}-gallery-10s`, {galleryAfter10s: o.galleryAfter10s});
    await loc(page, `${prefix}: the gallery grid container`, page.locator('#pluginGalleryGridContainer'));
    // back to the installed list: does it still work?
    const insTab = page.locator(`#${installedId}-button`).first();
    if (await insTab.count()) await insTab.click(); else await page.getByRole('tab', {name: 'Installed Plugins', exact: true}).first().click();
    await idle(page); await sleep(400);
    o.installedAgain = await container(page, 'pluginGridContainer');
    return o;
}

/** Sweep: text typed and not searched in the installed filter, switch inner tabs, leave the tab, leave the page. */
async function leaveUnsaved(page, prefix, {installedId, galleryId, leaveUrl, otherTop}) {
    const o = {};
    await page.locator('#plugins-button').first().click(); await idle(page);
    await page.locator(`#${installedId}-button`).first().click(); await idle(page); await sleep(300);
    const box = page.locator('#pluginGridContainer input[name="pluginName"]').first();
    o.filterVisibleAtFirst = await box.isVisible().catch(() => null);
    if (!o.filterVisibleAtFirst) {
        await page.locator('#pluginGridContainer .pkp_linkaction_search').first().click().catch(() => {});
        await sleep(500);
    }
    o.filterVisible = await box.isVisible().catch(() => null);
    o.filterControls = await page.locator('#pluginSearchForm').first().evaluate((f) => [...f.querySelectorAll('input, select, button, a')].filter((e) => e.offsetParent !== null)
        .map((e) => `${e.tagName.toLowerCase()}${e.name ? `[name=${e.name}]` : ''} ${(e.innerText || e.value || '').trim().slice(0, 40)}`)).catch(() => null);
    if (o.filterVisible) await box.fill('google');
    await snap(page, `${prefix}-filter-typed`, {o});
    await page.locator(`#${galleryId}-button`).first().click(); await idle(page); await sleep(300);
    await page.locator(`#${installedId}-button`).first().click(); await idle(page); await sleep(300);
    o.filterAfterSwitch = await box.inputValue().catch(() => null);
    o.rowsVisibleAfterSwitch = await page.locator('#pluginGridContainer tr.gridRow:visible').count();
    await page.locator(`#${otherTop}-button`).first().click(); await idle(page); await sleep(300);
    const d0 = DIALOGS.length;
    await go(page, leaveUrl);
    o.leaveDialogs = DIALOGS.slice(d0);
    o.leftTo = page.url();
    return o;
}

// -------------------------------------------------------------- seed
async function seed(app) {
    const t = tag('u62k3');
    const U = (k, roles, g) => ({username: `${t}${k}`, roles, givenName: g, familyName: 'K3'});
    const users = [U('m', ['manager'], 'Mia'), U('s', ['sectionEditor'], 'Sol')];
    if (app.name !== 'ops') users.push(U('e', ['editor'], 'Eli'), U('p', ['productionEditor'], 'Pia'));
    const r = await app.api.createContext({tag: t, context: {name: `K3 plugins ${t}`, acronym: 'KTHREE', country: 'CA'}, users});
    return {t, id: r.contextId, users: users.map((u) => u.username)};
}

forEachApp(async (app) => {
    for (const k of Object.keys(CRASH)) delete CRASH[k];
    DIALOGS.length = 0;
    const R = {app: app.name};
    CUR = 'seed';
    const S = await seed(app);
    R.seed = S;
    log(app.name, 'seeded', S.t, S.id);
    const {page: p0, close} = await launch(app);
    const page = watch(p0);
    const website = (ctx) => app.url(`/index.php/${ctx}/en/management/settings/website`);
    const step = async (name, fn) => {
        CUR = name; GAL = [];
        const o = {};
        try { await fn(o); } catch (e) { o.error = flat(e.stack || e.message, 600); log(app.name, name, 'ERROR', o.error); }
        o.galleryTraffic = GAL; o.crashes = CRASH[name] || [];
        R[name] = o;
        record(SUMMARY, R);
    };
    try {
        // ---- Rule 23 / A1 / td18 on a journal's Settings > Website, per manager-level account
        if (on('gallery')) {
            const actors = [['m', `${S.t}m`], ['admin', 'admin']];
            if (app.name !== 'ops') actors.push(['e', `${S.t}e`], ['p', `${S.t}p`]);
            for (const [k, user] of actors) {
                await step(`gallery-${k}`, async (o) => {
                    await signIn(page, user, {contextPath: S.t});
                    GAL = [];
                    await go(page, website(S.t)); await sleep(500);
                    o.landingTabs = await tabStrips(page);
                    o.landingGallery = GAL.map((g) => `${g.method} ${g.status}`);
                    await snap(page, `g-${k}-website-landing`, {o});
                    Object.assign(o, await drivePluginsTab(page, `g-${k}-website`, {installedId: 'installedPlugins', galleryId: 'pluginGallery'}));
                    // a reload while on the Plugins tab
                    GAL = [];
                    await page.reload().catch(() => {}); await idle(page); await sleep(500);
                    o.reloadUrl = page.url(); o.reloadTabs = await tabStrips(page);
                    o.reloadGallery = GAL.map((g) => `${g.method} ${g.status}`);
                    await snap(page, `g-${k}-website-reload`, {o});
                    // typed addresses naming the gallery tab
                    for (const h of ['#plugins', '#pluginGallery', '#plugins/pluginGallery']) {
                        GAL = [];
                        await page.goto('about:blank');
                        await go(page, website(S.t) + h); await sleep(400);
                        (o.typed = o.typed || []).push({hash: h, url: page.url(), tabs: await tabStrips(page), gallery: GAL.map((g) => `${g.method} ${g.status}`)});
                    }
                });
            }
            // control: a section editor at the Settings pages (U07 owns the refusal)
            await step('gallery-s', async (o) => {
                await signIn(page, `${S.t}s`, {contextPath: S.t});
                GAL = [];
                const resp = await go(page, website(S.t));
                o.status = resp ? resp.status() : null;
                o.gallery = GAL.map((g) => `${g.method} ${g.status}`);
                const s = await snap(page, 'g-s-website-denied', {status: o.status});
                o.text = flat(s.text && s.text.main, 400);
            });
        }

        // ---- Site Settings > Plugins, as admin
        if (on('site')) {
            await step('site', async (o) => {
                await signIn(page, 'admin');
                GAL = [];
                await go(page, app.url('/index.php/index/en/admin/settings')); await sleep(500);
                o.landingTabs = await tabStrips(page);
                o.landingGallery = GAL.map((g) => `${g.method} ${g.status}`);
                await snap(page, 's-site-landing', {o});
                Object.assign(o, await drivePluginsTab(page, 's-site', {installedId: 'installedPlugins', galleryId: 'pluginGallery'}));
                o.siteRows = await pluginRows(page);
                GAL = [];
                await page.reload().catch(() => {}); await idle(page); await sleep(500);
                o.reloadUrl = page.url(); o.reloadTabs = await tabStrips(page);
                o.reloadGallery = GAL.map((g) => `${g.method} ${g.status}`);
                await snap(page, 's-site-reload', {o});

            });
        }

        // ---- the Settings Wizard > Plugins, as admin
        if (on('wizard')) {
            await step('wizard', async (o) => {
                await signIn(page, 'admin');
                GAL = [];
                await go(page, app.url(`/index.php/index/en/admin/wizard/${S.id}`)); await sleep(500);
                o.landingTabs = await tabStrips(page);
                o.landingGallery = GAL.map((g) => `${g.method} ${g.status}`);
                await snap(page, 'w-wizard-landing', {o});
                Object.assign(o, await drivePluginsTab(page, 'w-wizard', {installedId: 'installed', galleryId: 'gallery'}));
                o.wizardRows = await pluginRows(page);
                GAL = [];
                await page.reload().catch(() => {}); await idle(page); await sleep(500);
                o.reloadUrl = page.url(); o.reloadTabs = await tabStrips(page);
                o.reloadGallery = GAL.map((g) => `${g.method} ${g.status}`);
                await snap(page, 'w-wizard-reload', {o});

            });
        }

        // ---- Sweep: each Plugins tab left with filter text typed and not searched
        if (on('leave')) {
            await step('leave', async (o) => {
                await signIn(page, `${S.t}m`, {contextPath: S.t});
                await go(page, website(S.t));
                o.website = await leaveUnsaved(page, 'l-website', {installedId: 'installedPlugins', galleryId: 'pluginGallery', otherTop: 'setup', leaveUrl: app.url(`/index.php/${S.t}/en/dashboard/editorial`)});
                await signIn(page, 'admin');
                await go(page, app.url('/index.php/index/en/admin/settings'));
                o.site = await leaveUnsaved(page, 'l-site', {installedId: 'installedPlugins', galleryId: 'pluginGallery', otherTop: 'setup', leaveUrl: app.url('/index.php/index/en/admin')});
                await go(page, app.url(`/index.php/index/en/admin/wizard/${S.id}`));
                o.wizard = await leaveUnsaved(page, 'l-wizard', {installedId: 'installed', galleryId: 'gallery', otherTop: 'setup', leaveUrl: app.url('/index.php/index/en/admin/contexts')});
            });
        }

        // ---- Side effects: tick and untick "Google Analytics Plugin" on the scratch journal
        if (on('side')) {
            await step('side', async (o) => {
                const mgr = `${S.t}m`;
                const counts = () => ({
                    mailMgr: null,
                    eventLog: psql(app, 'select count(*) from event_log'),
                    tasks: psql(app, `select count(*) from notifications where level <> 1 and context_id = ${S.id}`),
                    allNotif: psql(app, `select count(*) from notifications where context_id = ${S.id}`),
                });
                const before = counts();
                before.mailMgr = await mailCount(`${mgr}@mail.test`);
                before.mailAdmin = await mailCount('admin@mail.test');
                o.before = before;
                await signIn(page, mgr, {contextPath: S.t});
                await go(page, website(S.t));
                await page.locator('#plugins-button').first().click(); await idle(page); await sleep(400);
                const row = page.locator('#pluginGridContainer tr.gridRow[id$="-row-googleanalyticsplugin"]').first();
                const box = row.locator('input[type=checkbox]');
                o.rowPresent = await row.count();
                o.boxBefore = await box.isChecked().catch(() => null);
                o.headerBefore = flat(await page.locator('header').first().innerText().catch(() => ''), 300);
                await loc(page, 'Installed Plugins: the "Google Analytics Plugin" row\'s Enabled box', box);
                await box.click();
                await sleep(1200);
                o.tickToasts = await toasts(page);
                await snap(page, 'se-tick', {o});
                await idle(page); await sleep(800);
                o.boxAfterTick = await box.isChecked().catch(() => null);
                // untick: a confirmation window
                await box.click();
                await sleep(700);
                const dlg = page.locator('[role="dialog"]:visible, .pkp_modal_panel:visible').last();
                o.untickWindow = flat(await dlg.innerText().catch(() => ''), 300);
                await snap(page, 'se-untick-window', {o});
                const ok = dlg.getByRole('button', {name: /^(OK|Yes|Disable)$/}).first();
                o.untickOk = await ok.count();
                if (o.untickOk) await ok.click();
                await sleep(1200);
                o.untickToasts = await toasts(page);
                await snap(page, 'se-untick', {o});
                await idle(page); await sleep(800);
                o.boxAfterUntick = await box.isChecked().catch(() => null);
                await page.reload(); await idle(page);
                await page.locator('#plugins-button').first().click(); await idle(page); await sleep(400);
                o.boxAfterReload = await page.locator('#pluginGridContainer tr.gridRow[id$="-row-googleanalyticsplugin"] input[type=checkbox]').first().isChecked().catch(() => null);
                o.headerAfter = flat(await page.locator('header').first().innerText().catch(() => ''), 300);
                await sleep(1500);
                const after = counts();
                after.mailMgr = await mailCount(`${mgr}@mail.test`);
                after.mailAdmin = await mailCount('admin@mail.test');
                o.after = after;
                o.lastEvents = psql(app, `select date_logged, assoc_type, message from event_log order by log_id desc limit 3`);
                o.notifRows = psql(app, `select level, type, user_id from notifications where context_id = ${S.id} order by notification_id desc limit 5`);
            });
        }

        // ---- System Information: the install policy's line, and the gallery source
        if (on('sysinfo')) {
            await step('sysinfo', async (o) => {
                await signIn(page, 'admin');
                await go(page, app.url('/index.php/index/en/admin/systemInfo'));
                const s = await snap(page, 'si-systeminfo');
                const txt = (s.text && s.text.main) || '';
                const grab = (k) => { const i = txt.indexOf(k); return i < 0 ? null : flat(txt.slice(Math.max(0, i - 60), i + 120), 200); };
                o.allowPluginInstall = grab('allow_plugin_install');
                o.pluginGalleryUrls = grab('plugin_gallery_urls');
                o.securityHeading = grab('security');
                o.rowCells = await page.locator('tr', {hasText: 'allow_plugin_install'}).first().evaluate((tr) => [...tr.children].map((c) => c.innerText.trim())).catch(() => null);
                await loc(page, 'System Information: the allow_plugin_install row', page.locator('tr', {hasText: 'allow_plugin_install'}));
            });
        }

        // ---- Canonical preamble: admin enrolled as a manager, the GA plugin off on a fresh context; named plugins per app
        if (on('preamble')) {
            await step('preamble', async (o) => {
                await signIn(page, `${S.t}m`, {contextPath: S.t});
                await go(page, app.url(`/index.php/${S.t}/en/management/settings/access`)); await sleep(800);
                const s = await snap(page, 'p-users');
                const txt = (s.text && s.text.main) || '';
                const i = txt.indexOf('admin admin');
                o.adminRow = i < 0 ? null : flat(txt.slice(i, i + 200), 200);
                o.adminRoleDb = psql(app, `select ug.user_group_id, ugs.setting_value from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id left join user_group_settings ugs on ugs.user_group_id = ug.user_group_id and ugs.setting_name = 'name' and ugs.locale = 'en' where uug.user_id = 1 and ug.context_id = ${S.id}`);
                await go(page, website(S.t));
                await page.locator('#plugins-button').first().click(); await idle(page); await sleep(500);
                o.rows = await pluginRows(page);
                await snap(page, 'p-plugins-rows', {count: o.rows ? o.rows.length : null});
                const want = ['Static Pages Plugin', 'Custom Block Manager', 'Announcement Feed Plugin', 'Citation Style Language', 'DRIVER', 'Google Analytics Plugin', 'URN',
                    'Crossref', 'DataCite', 'JATS Template Plugin', 'Usage event', 'Web Feed Plugin', 'Google Scholar', 'Dublin Core', 'PDF.js', 'HTML'];
                o.named = Object.fromEntries(want.map((w) => [w, (o.rows || []).filter((r) => r.name.includes(w)).map((r) => `${r.name} [${r.category}] ${r.checked ? 'on' : 'off'}`)]));
                o.ga = (o.rows || []).find((r) => r.id === 'googleanalyticsplugin') || null;
            });
        }
    } finally {
        R.dialogs = DIALOGS;
        record(SUMMARY, R);
        await close();
    }
});
