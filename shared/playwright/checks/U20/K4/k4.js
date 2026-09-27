const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U20 claim check, chunk K4: "Google Analytics Plugin", the three plugin rows, cross-feature, coverage.
// Spec: docs/specs/U20-search-engine-metadata-and-analytics.md — Fields: the three plugin rows and the Google
// Analytics window (74–98), Rules 18–23 (308–337), Settings 5–6 (376–382), register A2, A3, Cross-feature
// interactions (431–463); footnotes a, d, k, s, q1, q20–q24, f-a2, f-a3.
//
//   PROBE_FEATURE=U20 PROBE_AGENT=ccK4 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U20/K4/k4.js
//   PHASES=seed,roles,... (default: all, in the order below). State in k4-state-<app>.json under the output folder,
//   so a phase re-runs alone; RESEED=1 (or deleting the file) seeds afresh. Phases:
//     seed    one scratch context K per app with a throwaway user per roster level, one item published
//     roles   every roster account at publicknowledge's Settings › Website › "Plugins" (read only)
//     ga      K as its manager: the three rows on a new context, the pages before, Google Analytics ticked with no
//             number, its "Settings" window (texts, "OK" empty, "Cancel", "OK" with a number, reopen, reload), the
//             window left with an unsaved change, the script on public, editorial, site and other contexts' pages
//     roles2  K with Google Analytics on: each scratch role at K's Plugins tab, the manager-level ones in the window
//     values  more "Account number" values: a UA number, a 252-character one, one that holds no number
//     off     untick: the row's actions, the pages, the number kept; tick again: the window, the script back
//     wizard  the Site Administrator's Settings Wizard "Plugins" tab for K (and "Search Indexing" present)
//     site    Administration › "Site Settings" › "Plugins": Google Analytics ticked, its actions, the site's
//             pages; the site's list restored to what it was
//     cross   the cross-feature surfaces on their own screens (read only)
//     seedkey a second scratch context Z seeded with `plugins: {googleanalyticsplugin: {enabled, settings}}` and the
//             two indexing plugins off: what its manager and a visitor see (the Coverage rows' seed)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'roles', 'ga', 'roles2', 'values', 'off', 'wizard', 'site', 'cross', 'seedkey'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k4 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const DENIED = /The current role does not have access to this operation|not have access|You are not authorized|Access denied/i;
const GA = 'Google Analytics Plugin';
const NAMES = ['Dublin Core Indexing Plugin', 'Google Scholar Indexing Plugin', GA];
const NUM = 'G-TEST12345';

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const S = process.env.RESEED !== '1' && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k4-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const strip = (u) => (u || '').replace(app.baseURL, '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const db = (sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-AtF', '|', '-c', sql], {encoding: 'utf8'}).trim(); } catch (e) { return `db error: ${String(e.message).slice(0, 200)}`; } };
    const gaDb = (ctxId) => db(`select context_id, setting_name, setting_value from plugin_settings where plugin_name='googleanalyticsplugin'${ctxId != null ? ` and context_id=${ctxId}` : ''} order by context_id, setting_name`);
    const itemPage = (ctx, id) => cu(ctx, isOJS ? `/article/view/${id}` : isOMP ? `/catalog/book/${id}` : `/preprint/view/${id}`);
    const listPage = (ctx) => cu(ctx, isOJS ? '/issue/archive' : isOMP ? '/catalog' : '/preprints');

    await app.api.bootstrapProbe(app.contextPath);
    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', (d) => { jsDialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 300), url: strip(page.url())}); d.accept().catch(() => {}); });
    const traffic = [];
    page.context().on('response', (r) => { if (r.status() >= 400 || /\/api\/v1\/|\$\$\$call\$\$\$/.test(r.url())) traffic.push({at: Date.now(), url: strip(r.url()).replace(/csrfToken=[^&]+/, ''), method: r.request().method(), status: r.status()}); });
    const gtmReq = [];
    page.context().on('request', (r) => { if (/googletagmanager|google-analytics/.test(r.url())) gtmReq.push({at: Date.now(), url: r.url(), from: strip(page.url())}); });
    page.context().on('requestfailed', (r) => { if (/googletagmanager|google-analytics/.test(r.url())) gtmReq.push({at: Date.now(), url: r.url(), failed: (r.failure() || {}).errorText || true}); });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: String(e.message || e).slice(0, 300), url: strip(page.url())}));
    const since = (arr, t0) => arr.filter((x) => x.at >= t0);

    async function snap(name, extra = {}, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(name, s);
        if (png) await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(`zz-failed-${name}`, {}, {png: true}).catch(() => {});
            return null;
        }
    }
    let who = 'visitor';
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : {}); await idle(page); who = user; };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)})); await idle(page).catch(() => {}); return r; };

    async function classify(resp) {
        const url = page.url();
        const text = await page.locator('body').innerText().catch(() => '');
        return {who, httpStatus: resp && typeof resp.status === 'function' ? resp.status() : (resp && resp.err) || null, url: strip(url),
            title: await page.title().catch(() => null),
            loginForm: /\/login/.test(url) && (await page.locator('input[name="username"], #username').count()) > 0,
            denied: DENIED.test(text), deniedText: (text.match(DENIED) || [null])[0],
            tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).slice(0, 20),
            snippet: flat(text, 300)};
    }

    // ------------------------------------------------------------------ page source: the script or not
    async function src(url, name, {png = false} = {}) {
        const t0 = Date.now();
        let resp = null, err = null;
        try { resp = await page.goto(url); } catch (e) { err = String(e.message).slice(0, 200); }
        await idle(page).catch(() => {});
        await sleep(600);
        const body = resp ? await resp.text().catch(() => null) : null;
        const i = body ? body.indexOf('googletagmanager') : -1;
        const out = {who, asked: strip(url), final: strip(page.url()), status: resp ? resp.status() : null, err, title: await page.title().catch(() => null),
            contentType: resp ? (resp.headers()['content-type'] || null) : null,
            gtm: body ? (body.match(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/g) || []).length : null,
            idHits: body ? (body.match(new RegExp(NUM, 'g')) || []).length : null,
            loader: i >= 0 ? body.slice(Math.max(0, body.lastIndexOf('<script', i)), body.indexOf('</script>', i) + 9).slice(0, 700) : null,
            loaderInHead: i >= 0 ? i < body.search(/<\/head>/i) : null,
            dataLayer: await page.evaluate(() => (window.dataLayer ? window.dataLayer.length : null)).catch(() => null),
            gtmRequests: since(gtmReq, t0).map((x) => ({url: x.url.slice(0, 120), failed: x.failed || null})),
            pageErrors: since(pageErrors, t0),
            crashes: since(traffic, t0).filter((x) => x.status >= 500),
            visible: flat(await page.locator('body').innerText().catch(() => ''), 5000)};
        await snap(name, {src: out}, {png});
        return out;
    }
    const brief = (h) => h && {final: h.final, status: h.status, gtm: h.gtm, idHits: h.idHits, inHead: h.loaderInHead, dataLayer: h.dataLayer, gtmRequests: h.gtmRequests, pageErrors: h.pageErrors.map((e) => e.text), crashes: h.crashes};

    // ------------------------------------------------------------------ Plugins grid
    const pRow = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
    async function readRow(name, {actions = true} = {}) {
        const row = pRow(name);
        if (!(await row.count())) return {present: false};
        const r = await row.evaluate((el) => {
            const box = el.querySelector('input[type=checkbox]');
            const tb = el.closest('tbody');
            const catRow = tb ? tb.querySelector('tr.category, tr[id*="category"], tr:first-child') : null;
            const cells = [...el.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
            return {present: true, text: el.innerText.replace(/\s+/g, ' ').trim(), cells, enabled: box ? box.checked : null, boxDisabled: box ? box.disabled : null,
                categoryTbody: tb ? tb.id : null, category: catRow && catRow !== el ? catRow.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
                expander: !!el.querySelector('a.show_extras, a.hide_extras')};
        }).catch((e) => ({error: String(e.message)}));
        if (actions && r.expander) {
            const exp = row.locator('a.show_extras').first();
            if (await exp.count()) {
                await exp.click().catch(() => {}); await sleep(500);
                r.actions = (await row.locator('xpath=following-sibling::tr[1]').getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
                const hide = row.locator('a.hide_extras').first();
                if (await hide.count()) { await hide.click().catch(() => {}); await sleep(300); }
            }
        } else if (actions) r.actions = [];
        return r;
    }
    async function notices() {
        return page.locator('.ui-pnotify-text, .pkpNotification, [role="alert"]:visible, .app__notifications, .pkp_notification').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []);
    }
    async function setRow(name, want) {
        const box = pRow(name).getByRole('checkbox').first();
        const was = await box.isChecked();
        if (was === want) return {changed: false, checked: was};
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/i.test(r.url()), {timeout: T}).catch(() => null);
        await box.click({noWaitAfter: true}).catch(() => box.dispatchEvent('click'));
        await sleep(900);
        let dialogText = null;
        const dlg = page.locator('[role="dialog"]:visible');
        if (await dlg.count()) {
            dialogText = flat(await dlg.last().innerText(), 400);
            const ok = dlg.last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) await ok.click();
        }
        const resp = await w;
        await sleep(600);
        const n = await notices();
        await idle(page);
        return {changed: true, status: resp ? resp.status() : null, request: resp ? strip(resp.url()).replace(/csrfToken=[^&]+/, '').slice(0, 200) : null, dialogText, notices: n,
            checked: await pRow(name).getByRole('checkbox').first().isChecked().catch(() => null), crashes: since(traffic, t0).filter((x) => x.status >= 500)};
    }
    async function openPlugins(ctx) {
        const r = await go(cu(ctx, '/management/settings/website'));
        const tab = page.locator('#plugins-button');
        if (await tab.count()) await tab.first().click().catch(() => {});
        else await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {});
        await idle(page); await sleep(800);
        await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        return r;
    }
    async function gridSweep() {
        // what the Plugins tab offers beyond the rows: its inner tabs, the grid's own actions, the category headings
        return page.evaluate(() => {
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            const grid = document.querySelector('[id^="component-grid-settings-plugins-settingsplugingrid"], [id^="component-grid-admin-plugins"], .pkp_controllers_grid');
            return {
                tabs: [...document.querySelectorAll('[role=tab]')].filter(vis).map((t) => t.innerText.trim()).filter(Boolean),
                gridId: grid ? grid.id : null,
                gridActions: grid ? [...grid.querySelectorAll('.pkp_linkActions a, .actions a, .pkp_controllers_grid .header a, button')].filter(vis).map((a) => a.innerText.trim()).filter(Boolean).slice(0, 20) : [],
                headings: grid ? [...grid.querySelectorAll('.header h4, .header h3, caption')].map((h) => h.innerText.trim()) : [],
                categories: [...document.querySelectorAll('tbody.category_grid_body')].map((tb) => ({id: tb.id, head: (tb.querySelector('tr') || {}).innerText?.replace(/\s+/g, ' ').trim().slice(0, 60), rows: tb.querySelectorAll('tr.gridRow').length})),
                search: [...document.querySelectorAll('input[type=search], input[name*=search], input[placeholder*=earch]')].filter(vis).map((i) => i.name || i.placeholder),
            };
        }).catch((e) => ({error: String(e.message)}));
    }

    // ------------------------------------------------------------------ the Google Analytics window
    const gaForm = () => page.locator('#gaSettingsForm');
    const gaBox = () => gaForm().locator('input[name="googleAnalyticsSiteId"]');
    async function openWin(label) {
        const row = pRow(GA);
        const exp = row.locator('a.show_extras').first();
        if (await exp.count()) { await exp.click().catch(() => {}); await sleep(500); }
        const actions = row.locator('xpath=following-sibling::tr[1]');
        const acts = (await actions.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        const settings = actions.getByRole('link', {name: 'Settings', exact: true}).first();
        if (!(await settings.count())) return {opened: false, from: label, actions: acts};
        const t0 = Date.now();
        await settings.click();
        await gaBox().waitFor({timeout: 15_000}).catch(() => {});
        await idle(page); await sleep(500);
        return {opened: (await gaForm().count()) > 0, from: label, actions: acts, window: await readWin(), crashes: since(traffic, t0).filter((x) => x.status >= 500), pageErrors: since(pageErrors, t0).map((e) => e.text)};
    }
    async function readWin() {
        if (!(await gaForm().count())) return null;
        return gaForm().evaluate((form) => {
            const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            let dlg = form.closest('[role=dialog]');
            const modal = form.closest('.pkp_modal_panel') || dlg;
            const box = form.querySelector('input[name="googleAnalyticsSiteId"]');
            const lab = box ? form.querySelector(`label[for="${box.id}"]`) : null;
            const errs = [...form.querySelectorAll('label.error, .error, .pkp_form_error, [id$="-error"]')].map(t).filter(Boolean);
            return {
                dialogRole: !!dlg, dialogLabel: dlg ? (dlg.getAttribute('aria-label') || (dlg.getAttribute('aria-labelledby') && (document.getElementById(dlg.getAttribute('aria-labelledby')) || {}).innerText) || null) : null,
                title: modal ? t(modal.querySelector('.header h1, h1, h2, .pkp_modal_panel_header, [id*=title]')) : null,
                closeControls: modal ? [...modal.querySelectorAll('.header button, .header a, button.close, [aria-label=Close]')].map((b) => b.innerText.trim() || b.getAttribute('aria-label')) : [],
                paragraphs: [...form.querySelectorAll('#description p')].map(t),
                description: t(form.querySelector('#description')),
                box: box ? {value: box.value, id: box.id, cls: box.className, required: box.required, ariaRequired: box.getAttribute('aria-required'), maxlength: box.getAttribute('maxlength'), type: box.type} : null,
                label: lab ? t(lab) : null, labelHtml: lab ? lab.innerHTML.trim().slice(0, 200) : null,
                asterisk: lab ? /\*/.test(lab.innerText) || !!lab.querySelector('.req, .required') : null,
                buttons: [...form.querySelectorAll('button, a.cancelButton, a.pkp_button, input[type=submit]')].map((b) => ({tag: b.tagName.toLowerCase(), text: t(b) || b.value, cls: b.className})).filter((b) => b.text),
                errors: errs,
                inPlace: t(form.querySelector('#gaSettingsFormNotification')),
                footer: t(form.querySelector('.formRequired')),
                formText: t(form).slice(0, 2000),
            };
        });
    }
    const winOpen = async () => (await gaForm().count()) > 0 && (await gaForm().isVisible().catch(() => false));
    async function pressOK(label) {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: 8000}).catch(() => null);
        await gaForm().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        const resp = await w;
        let body = null;
        if (resp) body = await resp.text().catch(() => null);
        await sleep(1200);
        const n = await notices();
        await idle(page);
        const open = await winOpen();
        return {label, post: resp ? resp.status() : null, bodyStatus: body ? (body.match(/"status":\s*(true|false)/) || [null, null])[1] : null, bodyHasForm: body ? /gaSettingsForm/.test(body) : null,
            bodyMessage: body ? ((body.match(/Please enter an account number\.|This field is required\./) || [null])[0]) : null,
            stillOpen: open, window: open ? await readWin() : null, notices: n, crashes: since(traffic, t0).filter((x) => x.status >= 500), pageErrors: since(pageErrors, t0).map((e) => e.text)};
    }
    async function pressCancel() {
        const t0 = Date.now();
        const c = gaForm().getByRole('link', {name: 'Cancel', exact: true}).first();
        if (await c.count()) await c.click().catch(() => {}); else await gaForm().getByRole('button', {name: 'Cancel'}).first().click().catch(() => {});
        await sleep(1000);
        // a legacy form may ask "unsaved changes" in a pkp confirm window
        const conf = page.locator('[role="dialog"]:visible').filter({hasNotText: 'Account number'});
        const confText = (await conf.count()) ? flat(await conf.last().innerText(), 300) : null;
        return {confirm: confText, jsDialogs: since(jsDialogs, t0), stillOpen: await winOpen()};
    }
    async function closeX() {
        const t0 = Date.now();
        const modal = page.locator('.pkp_modal_panel:visible, [role="dialog"]:visible').filter({has: page.locator('#gaSettingsForm')}).last();
        const x = modal.getByRole('button', {name: /Close/}).first();
        const had = await x.count();
        if (had) await x.click().catch(() => {});
        await sleep(1000);
        const conf = page.locator('[role="dialog"]:visible').filter({hasNotText: 'Account number'});
        const confText = (await conf.count()) ? flat(await conf.last().innerText(), 300) : null;
        return {closeButton: had > 0, confirm: confText, jsDialogs: since(jsDialogs, t0), stillOpen: await winOpen()};
    }
    async function ensureClosed() {
        if (await winOpen()) { await pressCancel(); }
        if (await winOpen()) { await closeX(); }
        const conf = page.locator('[role="dialog"]:visible');
        if (await conf.count()) { const ok = conf.last().getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click().catch(() => {}); }
        await page.locator('#gaSettingsForm').waitFor({state: 'detached', timeout: 5000}).catch(() => {});
        await sleep(600);
    }

    // ------------------------------------------------------------------ Administration
    async function hostedRow(name) {
        await go(app.url('/index.php/index/admin/contexts'));
        await sleep(400);
        const row = page.locator('tr.gridRow').filter({hasText: name}).first();
        await row.waitFor({timeout: T});
        await row.locator('a.show_extras').click(); await idle(page); await sleep(400);
        return row.locator('xpath=following-sibling::tr[1]');
    }
    async function openSitePlugins() {
        await go(app.url('/index.php/index/en/admin/settings'));
        const pt = page.getByRole('tab', {name: 'Plugins', exact: true}).first();
        if (!(await pt.count())) return false;
        await pt.click(); await idle(page); await sleep(1000);
        await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        return true;
    }
    async function allBoxes() {
        return page.locator('tr.gridRow').evaluateAll((rows) => rows.map((r) => {
            const b = r.querySelector('input[type=checkbox]');
            const name = (r.querySelector('td:nth-child(1)') || r).innerText.replace(/^Settings\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 50);
            return b && !/\$\(function/.test(name) ? `${name}=${b.checked ? 1 : 0}` : null;
        }).filter(Boolean)).catch(() => []);
    }

    try {
        // ============================================================ seed
        if (on('seed')) await sect('seed', async () => {
            if (!S.t) { S.t = tag('u20k4'); save(); }
            const t = S.t;
            if (!S.K) {
                const p = `${t}k`.slice(0, 32);
                const users = [
                    {username: `${p}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                    ...(isOPS ? [] : [{username: `${p}ed`, roles: ['editor'], givenName: 'Eddie', familyName: 'Editor'}]),
                    {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sid', familyName: 'Section'},
                    {username: `${p}as`, roles: [isOPS ? 'editorialBoardMember' : 'copyeditor'], givenName: 'Asa', familyName: 'Assistant'},
                    ...(isOPS ? [] : [{username: `${p}rv`, roles: ['externalReviewer'], givenName: 'Rev', familyName: 'Reviewer'}]),
                    {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
                    {username: `${p}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
                ];
                const r = await app.api.createContext({tag: p, users, context: {name: `U20 K4 ${t}`, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`},
                    ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2024, published: true}]} : {})});
                S.K = {path: r.path, id: r.contextId, name: `U20 K4 ${t}`, users: users.map((u) => ({username: u.username, role: u.roles[0]}))};
                save();
            }
            if (!S.pub) {
                const r = await app.api.createSubmission({tag: `${S.K.path}p`.slice(0, 32), context: S.K.path, submitter: `${S.K.path}au`,
                    title: `U20 K4 published ${t}`, published: true, datePublished: '2024-03-05', ...(isOJS ? {issue: {volume: 1, number: 1, year: 2024}} : {})});
                S.pub = {sid: r.submissionId, pid: r.publicationId};
                save();
            }
            fact('seed', {t, K: S.K, pub: S.pub, gaDbAtSeed: gaDb(S.K.id)});
            note(`ccK4 [${app.name}]: K4 scratch context ${S.K.path} (id ${S.K.id}; users mg, ${isOPS ? '' : 'ed, '}se, as, ${isOPS ? '' : 'rv, '}au, rd; item ${S.pub.sid} published). A rerun finds Google Analytics as the last run left it (ticked, ${NUM}).`);
        });
        const K = S.K;
        const sid = S.pub && S.pub.sid;

        // ============================================================ roles: every roster level at publicknowledge's Plugins tab (read only)
        if (on('roles')) await sect('roles', async () => {
            const roster = isOPS
                ? ['admin', 'manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa']
                : ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'assistant.rita', 'reviewer.julia', 'author.alex', 'reader.rosa'];
            const o = {};
            for (const u of roster) {
                await as(u, app.contextPath);
                const resp = await go(cu(app.contextPath, '/en/management/settings/website'));
                const c = await classify(resp);
                const tab = page.locator('#plugins-button');
                c.pluginsTab = await tab.count();
                if (c.pluginsTab) {
                    await tab.first().click().catch(() => {}); await idle(page); await sleep(800);
                    await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                    c.rows = {};
                    for (const n of NAMES) c.rows[n] = await readRow(n);
                    c.sweep = await gridSweep();
                                    }
                const safe = u.replace(/\./g, '');
                await snap(`r-${safe}-plugins`, {classified: c}, {png: u === 'manager.maya' || u === 'sectioneditor.ana'});
                o[u] = c;
            }
            await visitor();
            const c = await classify(await go(cu(app.contextPath, '/en/management/settings/website')));
            await snap('r-visitor-plugins', {classified: c});
            o.visitor = c;
            o.pkGaDb = gaDb(db(`select ${isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id'} from ${isOJS ? 'journals' : isOMP ? 'presses' : 'servers'} where path='publicknowledge'`));
            fact('roles', o);
        });

        // ============================================================ ga: the plugin on K, its window, the pages
        if (on('ga') && K) await sect('ga', async () => {
            const o = {};
            o.dbBefore = gaDb(K.id);
            // the pages before anything is ticked (Rule 18)
            await visitor();
            o.before = {home: await src(cu(K.path), 'g-00-home-before'), item: brief(await src(itemPage(K.path, sid), 'g-00-item-before')), login: brief(await src(cu(K.path, '/login'), 'g-00-login-before'))};
            const visibleBefore = o.before.home.visible; o.before.home = brief(o.before.home);
            await as(`${K.path}mg`, K.path);
            o.dashBefore = brief(await src(cu(K.path, '/dashboard/editorial'), 'g-00-dashboard-before'));
            await openPlugins(K.path);
            o.rows = {};
            for (const n of NAMES) o.rows[n] = await readRow(n);
            o.sweep = await gridSweep();
            await snap('g-01-plugins-new-context', {rows: o.rows, sweep: o.sweep}, {png: true});
            await loc(page, 'Website › Plugins: the "Google Analytics Plugin" row', pRow(GA));
            await loc(page, 'Website › Plugins: the "Google Analytics Plugin" row\'s box', pRow(GA).getByRole('checkbox'));
            await loc(page, 'Website › Plugins: the "Generic Plugins" category body', page.locator('tbody.category_grid_body[id$="-category-generic"]'));
            // a rerun: untick first so the new-context reads stay honest about what they are
            if (o.rows[GA].enabled) { o.rerunUntick = await setRow(GA, false); await openPlugins(K.path); }
            o.unticked = await openWin('unticked');
            // tick
            o.tick = await setRow(GA, true);
            await snap('g-02-ga-ticked', {tick: o.tick}, {png: true});
            o.rowTicked = await readRow(GA);
            await openPlugins(K.path);
            o.rowTickedReloaded = await readRow(GA);
            await loc(page, 'Website › Plugins: the Google Analytics row\'s arrow (a.show_extras, named "Settings")', pRow(GA).locator('a.show_extras'));
            o.dbTicked = gaDb(K.id);
            // enabled, no number: the pages (q21 first half)
            await visitor();
            o.noNumber = {home: brief(await src(cu(K.path), 'g-03-home-ticked-no-number')), item: brief(await src(itemPage(K.path, sid), 'g-03-item-ticked-no-number'))};
            // the window
            await as(`${K.path}mg`, K.path);
            await openPlugins(K.path);
            o.win = await openWin('ticked');
            await snap('g-04-ga-window', {w: o.win}, {png: true});
            await loc(page, 'GA window: the form', gaForm());
            await loc(page, 'GA window: "Account number" box', gaBox());
            await loc(page, 'GA window: "OK"', gaForm().getByRole('button', {name: 'OK', exact: true}));
            await loc(page, 'GA window: "Cancel" (a link)', gaForm().getByRole('link', {name: 'Cancel', exact: true}));
            // "OK" on the empty box
            await gaBox().fill('');
            o.okEmpty = await pressOK('empty');
            await snap('g-05-ga-ok-empty', {o: o.okEmpty}, {png: true});
            await loc(page, 'GA window: the refusal beside the box', gaForm().locator('label.error, .error').first());
            o.dbAfterEmpty = gaDb(K.id);
            // whitespace only
            await gaBox().fill('   ');
            o.okSpaces = await pressOK('spaces-only');
            await snap('g-05b-ga-ok-spaces', {o: o.okSpaces});
            o.dbAfterSpaces = gaDb(K.id);
            // a value typed, then "Cancel"
            await ensureClosed();
            await openPlugins(K.path);
            o.win2 = await openWin('before-cancel');
            await gaBox().fill('G-CANCELLED1');
            await gaBox().blur().catch(() => {});
            o.cancel = await pressCancel();
            await snap('g-06-ga-cancel', {o: o.cancel});
            await ensureClosed();
            o.dbAfterCancel = gaDb(K.id);
            o.afterCancel = await openWin('reopen-after-cancel');
            // the number, as Google's snippet writes it
            await gaBox().fill(`'${NUM}';`);
            o.okSet = await pressOK('set');
            await snap('g-07-ga-ok-set', {o: o.okSet}, {png: true});
            o.dbAfterSet = gaDb(K.id);
            await ensureClosed();
            o.reopenSame = await openWin('reopen-same-page');
            await snap('g-08-ga-reopen-same-page', {o: o.reopenSame});
            await ensureClosed();
            await page.reload(); await idle(page);
            await openPlugins(K.path);
            o.reopenReload = await openWin('reopen-after-reload');
            await snap('g-09-ga-reopen-after-reload', {o: o.reopenReload});
            // the window left with an unsaved change: the X, then the page left
            await gaBox().fill('G-UNSAVED9');
            await gaBox().blur().catch(() => {});
            o.leaveX = await closeX();
            await snap('g-10-ga-left-by-close', {o: o.leaveX}, {png: true});
            await ensureClosed();
            o.win3 = await openWin('before-leave');
            await gaBox().fill('G-UNSAVED8');
            await gaBox().blur().catch(() => {});
            const tl = Date.now();
            await go(cu(K.path, '/dashboard/editorial'));
            o.leavePage = {landed: strip(page.url()), jsDialogs: since(jsDialogs, tl)};
            o.dbAfterLeave = gaDb(K.id);
            // the pages with the number (Rule 19)
            await visitor();
            gtmReq.length = 0;
            const home = await src(cu(K.path), 'g-20-home-ga', {png: true});
            o.pages = {home: brief(home), sameVisibleText: home.visible === visibleBefore};
            o.pages.homeLoader = home.loader;
            o.pages.item = brief(await src(itemPage(K.path, sid), 'g-20-item-ga'));
            o.pages.login = brief(await src(cu(K.path, '/login'), 'g-20-login-ga'));
            o.pages.about = brief(await src(cu(K.path, '/about'), 'g-20-about-ga'));
            o.pages.list = brief(await src(listPage(K.path), 'g-20-list-ga'));
            o.pages.search = brief(await src(cu(K.path, isOMP ? '/search' : '/search/search'), 'g-20-search-ga'));
            o.pages.register = brief(await src(cu(K.path, '/user/register'), 'g-20-register-ga'));
            o.pages.notFound = brief(await src(cu(K.path, isOJS ? '/article/view/99999999' : isOMP ? '/catalog/book/99999999' : '/preprint/view/99999999'), 'g-20-notfound-ga'));
            o.pages.sitemap = brief(await src(cu(K.path, '/sitemap'), 'g-20-sitemap-ga'));
            o.pages.site = brief(await src(app.url('/index.php/index/en'), 'g-21-site-home-ga'));
            o.pages.siteLogin = brief(await src(app.url('/index.php/index/en/login'), 'g-21-site-login-ga'));
            o.pages.otherContext = brief(await src(cu(app.contextPath, '/en'), 'g-21-publicknowledge-home'));
            // signed in as the reader: the public page, and the reader's own back-office page
            await as(`${K.path}rd`, K.path);
            o.pages.homeReader = brief(await src(cu(K.path), 'g-22-home-reader'));
            o.pages.profileReader = brief(await src(cu(K.path, '/user/profile'), 'g-22-profile-reader'));
            // editorial pages as the manager
            await as(`${K.path}mg`, K.path);
            o.pages.homeManager = brief(await src(cu(K.path), 'g-23-home-manager'));
            o.pages.dashboard = brief(await src(cu(K.path, '/dashboard/editorial'), 'g-23-dashboard-ga'));
            o.pages.settings = brief(await src(cu(K.path, '/management/settings/website'), 'g-23-settings-ga'));
            o.pages.workflow = brief(await src(cu(K.path, `/dashboard/editorial?workflowSubmissionId=${sid}`), 'g-23-workflow-ga'));
            o.pages.profile = brief(await src(cu(K.path, '/user/profile'), 'g-23-profile-ga'));
            o.pages.stats = brief(await src(cu(K.path, '/stats/publications'), 'g-23-stats-ga'));
            await as('admin');
            o.pages.admin = brief(await src(app.url('/index.php/index/en/admin'), 'g-23-admin-ga'));
            fact('ga', o);
        });

        // ============================================================ roles2: K's own roles with Google Analytics on
        if (on('roles2') && K) await sect('roles2', async () => {
            const o = {};
            const list = [['admin', 'site admin'], ...K.users.filter((u) => !/mg$/.test(u.username)).map((u) => [u.username, u.role])];
            for (const [u, role] of list) {
                await as(u, K.path);
                const resp = await go(cu(K.path, '/management/settings/website'));
                const c = await classify(resp);
                c.role = role;
                c.pluginsTab = await page.locator('#plugins-button').count();
                if (c.pluginsTab) {
                    await page.locator('#plugins-button').first().click().catch(() => {}); await idle(page); await sleep(800);
                    await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                    c.gaRow = await readRow(GA, {actions: false});
                    c.win = await openWin(`as ${role}`);
                    if (c.win.opened) { c.win = {opened: true, actions: c.win.actions, value: c.win.window && c.win.window.box && c.win.window.box.value, crashes: c.win.crashes}; await ensureClosed(); }
                }
                await snap(`r2-${role}-plugins`, {classified: c});
                o[role] = c;
            }
            fact('roles2', o);
        });

        // ============================================================ values: more "Account number" values
        if (on('values') && K) await sect('values', async () => {
            const o = {};
            const values = [
                ['ua', 'UA-12345-1'],
                ['long', `G-${'X'.repeat(250)}`],
                ['blank', "'';"],
            ];
            await as(`${K.path}mg`, K.path);
            for (const [k, v] of values) {
                await openPlugins(K.path);
                const w = await openWin(`values ${k}`);
                if (!w.opened) { o[k] = {opened: false, actions: w.actions}; continue; }
                await gaBox().fill(v);
                const ok = await pressOK(k);
                const stored = gaDb(K.id);
                await ensureClosed();
                await openPlugins(K.path);
                const re = await openWin(`values ${k} reopen`);
                const shown = re.window && re.window.box ? re.window.box.value : null;
                await ensureClosed();
                await visitor();
                const h = await src(cu(K.path), `v-${k}-home`);
                o[k] = {typed: v, ok: {post: ok.post, stillOpen: ok.stillOpen, errors: ok.window && ok.window.errors, notices: ok.notices, crashes: ok.crashes}, stored, shown,
                    home: {gtm: h.gtm, pageErrors: h.pageErrors.map((e) => e.text), gtmRequests: h.gtmRequests}};
                await as(`${K.path}mg`, K.path);
            }
            // back to the number
            await openPlugins(K.path);
            await openWin('restore');
            await gaBox().fill(NUM);
            o.restore = await pressOK('restore');
            await ensureClosed();
            o.dbEnd = gaDb(K.id);
            fact('values', o);
        });

        // ============================================================ off: untick, the number kept, tick again (Rule 21)
        if (on('off') && K) await sect('off', async () => {
            const o = {};
            await as(`${K.path}mg`, K.path);
            await openPlugins(K.path);
            o.rowBefore = await readRow(GA);
            o.untick = await setRow(GA, false);
            await snap('o-01-ga-unticked', {untick: o.untick}, {png: true});
            o.rowOff = await readRow(GA);
            o.winOff = await openWin('unticked-again');
            await openPlugins(K.path);
            o.rowOffReloaded = await readRow(GA);
            o.dbOff = gaDb(K.id);
            await visitor();
            o.pagesOff = {home: brief(await src(cu(K.path), 'o-02-home-off')), item: brief(await src(itemPage(K.path, sid), 'o-02-item-off'))};
            await as(`${K.path}mg`, K.path);
            await openPlugins(K.path);
            o.retick = await setRow(GA, true);
            o.winBack = await openWin('ticked-again');
            await snap('o-03-ga-window-again', {w: o.winBack}, {png: true});
            await ensureClosed();
            await visitor();
            o.pagesBack = {home: brief(await src(cu(K.path), 'o-04-home-back'))};
            fact('off', o);
        });

        // ============================================================ wizard: the Settings Wizard's "Plugins" tab for K
        if (on('wizard') && K) await sect('wizard', async () => {
            const o = {};
            await as('admin');
            const actions = await hostedRow(K.name);
            o.rowActions = (await actions.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
            await actions.getByRole('link', {name: 'Settings wizard', exact: true}).click();
            await page.waitForURL(/admin\/wizard\//, {timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            o.url = strip(page.url());
            o.tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            await snap('w-01-wizard', {o});
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {});
            await idle(page); await sleep(1000);
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.rows = {};
            for (const n of NAMES) o.rows[n] = await readRow(n);
            o.sweep = await gridSweep();
            await snap('w-02-wizard-plugins', {rows: o.rows, sweep: o.sweep}, {png: true});
            o.win = await openWin('wizard');
            if (o.win.opened) { await snap('w-03-wizard-ga-window', {w: o.win}, {png: true}); await ensureClosed(); }
            fact('wizard', o);
        });

        // ============================================================ site: Administration › Site Settings › Plugins (restored)
        if (on('site')) await sect('site', async () => {
            const o = {};
            await as('admin');
            o.dbBefore = gaDb(0);
            if (!(await openSitePlugins())) { o.noTab = true; fact('site', o); return; }
            o.tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            o.boxesBefore = await allBoxes();
            o.rows = {};
            for (const n of NAMES) o.rows[n] = await readRow(n);
            o.sweep = await gridSweep();
            await snap('s-01-site-plugins', {rows: o.rows, sweep: o.sweep}, {png: true});
            await loc(page, 'Site Settings › Plugins: the "Google Analytics Plugin" row', pRow(GA));
            o.tick = await setRow(GA, true);
            o.rowTicked = await readRow(GA);
            o.winTicked = await openWin('site ticked');
            await snap('s-02-site-ga-ticked', {row: o.rowTicked, win: o.winTicked}, {png: true});
            if (o.winTicked.opened) await ensureClosed();
            await openSitePlugins();
            o.rowTickedReloaded = await readRow(GA);
            o.winReloaded = await openWin('site ticked reloaded');
            if (o.winReloaded.opened) await ensureClosed();
            o.dbTicked = gaDb(0);
            o.siteHome = brief(await src(app.url('/index.php/index/en'), 's-03-site-home-site-ga'));
            await visitor();
            o.siteHomeVisitor = brief(await src(app.url('/index.php/index/en'), 's-03-site-home-site-ga-visitor'));
            // restore
            await as('admin');
            await openSitePlugins();
            o.untick = await setRow(GA, false);
            await openSitePlugins();
            o.boxesAfter = await allBoxes();
            o.restored = JSON.stringify(o.boxesBefore) === JSON.stringify(o.boxesAfter);
            o.dbAfter = gaDb(0);
            await snap('s-04-site-plugins-restored', {boxesAfter: o.boxesAfter, restored: o.restored});
            fact('site', o);
        });

        // ============================================================ cross: the cross-feature surfaces, read only
        if (on('cross') && K) await sect('cross', async () => {
            const o = {};
            await visitor();
            // Journal identity & about pages: the About pages the sitemap lists
            o.about = await classify(await go(cu(K.path, '/about'))); await snap('c-01-about', {c: o.about});
            o.submissions = await classify(await go(cu(K.path, '/about/submissions')));
            o.contact = await classify(await go(cu(K.path, '/about/contact')));
            // Search: the journal's own search page
            o.search = await classify(await go(cu(K.path, isOMP ? '/search' : '/search/search'))); await snap('c-02-search', {c: o.search});
            // OAI-PMH: the other channel, and whether the sitemap names it
            const oai = await page.goto(cu(K.path, '/oai?verb=Identify')).catch(() => null);
            o.oai = {status: oai ? oai.status() : null, type: oai ? oai.headers()['content-type'] : null, head: oai ? flat(await oai.text().catch(() => ''), 300) : null};
            const sm = await page.goto(cu(K.path, '/sitemap')).catch(() => null);
            const smText = sm ? await sm.text().catch(() => '') : '';
            o.sitemap = {status: sm ? sm.status() : null, locs: (smText.match(/<loc>[^<]+<\/loc>/g) || []).map((x) => strip(x.replace(/<\/?loc>/g, ''))), oai: /oai/.test(smText)};
            // Hosted journals: the appear-publicly box and the wizard's tabs (read, then Cancel)
            await as('admin');
            const actions = await hostedRow(K.name);
            await actions.getByRole('link', {name: 'Edit', exact: true}).click().catch(() => {});
            const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
            await cb.waitFor({timeout: T}).catch(() => {});
            o.hostedEdit = {box: await cb.count() ? {label: flat(await cb.evaluate((e) => (e.closest('label') || e.parentElement).innerText)), checked: await cb.isChecked()} : null};
            await snap('c-03-hosted-edit', {o: o.hostedEdit});
            await page.keyboard.press('Escape').catch(() => {});
            // Identifiers: the URN plugin row on K's list
            await as(`${K.path}mg`, K.path);
            await openPlugins(K.path);
            o.pubIdRows = await page.locator('tbody.category_grid_body[id$="-category-pubIds"] tr.gridRow').evaluateAll((rows) => rows.map((r) => {
                const b = r.querySelector('input[type=checkbox]');
                return `${(r.querySelector('td') || r).innerText.replace(/^Settings\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 40)}=${b && b.checked ? 1 : 0}`;
            })).catch(() => []);
            fact('cross', o);
        });

        // ============================================================ seedkey: the scenario key the Coverage rows 508–512 lean on
        if (on('seedkey')) await sect('seedkey', async () => {
            const o = {};
            if (!S.Z) {
                const p = `${S.t}z`.slice(0, 32);
                try {
                    const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Zed', familyName: 'Manager'}],
                        context: {name: `U20 K4 Z ${S.t}`, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`},
                        plugins: {googleanalyticsplugin: {enabled: true, settings: {googleAnalyticsSiteId: 'G-SEEDED1'}}, googlescholarplugin: {enabled: false}, ...(isOPS ? {} : {dublincoremetaplugin: {enabled: false}})}});
                    S.Z = {path: r.path, id: r.contextId}; save();
                } catch (e) { o.err = String(e.message).slice(0, 600); }
            }
            if (S.Z) {
                o.db = gaDb(S.Z.id);
                await visitor();
                o.home = brief(await src(cu(S.Z.path), 'z-01-home-seeded'));
                await as(`${S.Z.path}mg`, S.Z.path);
                await openPlugins(S.Z.path);
                o.rows = {};
                for (const n of NAMES) o.rows[n] = await readRow(n, {actions: false});
                o.win = await openWin('seeded');
                o.win = {opened: o.win.opened, value: o.win.window && o.win.window.box && o.win.window.box.value};
                await snap('z-02-plugins-seeded', {rows: o.rows, win: o.win});
            }
            fact('seedkey', o);
        });
    } finally {
        save();
        await close();
        if (pageErrors.length) log(`[${app.name}] page errors`, JSON.stringify(pageErrors.slice(0, 10)));
    }
});
