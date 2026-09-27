const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U20 claim check, chunk K1: the "Search Indexing" tab and what it writes into every page's head.
// Spec: docs/specs/U20-search-engine-metadata-and-analytics.md — Purpose (10–36), Actors (37–55), Fields: the
// "Search Indexing" tab (56–73), Rules 7–11 (232–261), Rule 24 (338–343), Side effects (344–359), Settings 1–2,
// 8, 14, register A1; footnotes a, b, c, d, e, g, k, q1, q8–q13, q22, q24, q25, f-a1.
//
//   PROBE_FEATURE=U20 PROBE_AGENT=ccK1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U20/K1/k1.js
//   PHASES=seed,access,... (default: all, in the order below). State in k1-state-<app>.json under the output folder,
//   so a phase re-runs alone; RESEED=1 (or deleting the file) seeds afresh. One app per process keeps a run under the
//   Bash tool's 600 s cap; phases: seed · access (every roster level at the tab's, the Plugins' and the wizard's
//   address on publicknowledge, read only) · tab (the tab on a new journal, both fields empty, set in English, the
//   page head read everywhere, French, lengths, A1, emptied, the tab left unsaved) · wizard (the Site Administrator's
//   Settings Wizard, its "Search Indexing" and "Plugins" tabs, the round trip) · effects (mail, notifications, log,
//   the web feed / announcement feed / LOCKSS description) · noindex (Hosted Journals "Edit", Rule 11, Settings 8) ·
//   restricted (the sitemap on a journal closed to visitors, Actors row 1) · plugins (the three rows, Google
//   Analytics on a journal, the preprint page's Dublin Core tags) · sitega (the site's own Plugins tab, restored) ·
//   noadmin (the Site Administrator without a manager role).
//
// Scratch contexts per app (tag prefix u20k1), each with its own manager (mg), section editor (se), reader (rd), author (au):
//   M  main: en + fr_CA (UI and forms), web feed plugin on, OJS: issue 1/1 (2024) published, announcements + the
//      announcement feed on; one item published ("pub").
//   S  single language (en), one item published.
//   N  not enabled publicly, unticked on screen by the admin; one item published.
//   R  closed to visitors, ticked on screen by its manager.
//   G  Google Analytics ticked and its number saved on screen; one item published.
//   X  admin holds Reader beside the manager role, then ends the manager role on screen.
// publicknowledge is read only.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'access', 'tab', 'a1b', 'wizard', 'effects', 'lockss', 'noindex', 'restricted', 'plugins', 'sitega', 'noadmin'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k1 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const DENIED = /The current role does not have access to this operation|not have access|You are not authorized|Access denied/i;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const S = process.env.RESEED !== '1' && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const strip = (u) => (u || '').replace(app.baseURL, '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const TABLE = isOJS ? 'journals' : isOMP ? 'presses' : 'servers';
    const IDCOL = isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id';
    const db = (sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-AtF', '|', '-c', sql], {encoding: 'utf8'}).trim(); } catch (e) { return `db error: ${String(e.message).slice(0, 200)}`; } };
    const itemPage = (ctx, id) => cu(ctx, isOJS ? `/article/view/${id}` : isOMP ? `/catalog/book/${id}` : `/preprint/view/${id}`);
    const listPage = (ctx) => cu(ctx, isOJS ? '/issue/archive' : isOMP ? '/catalog' : '/preprints');

    await app.api.bootstrapProbe(app.contextPath);
    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', (d) => { jsDialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 300), url: strip(page.url())}); d.accept().catch(() => {}); });
    const traffic = [];
    page.context().on('response', (r) => { if (r.status() >= 400 || /\/api\/v1\//.test(r.url())) traffic.push({at: Date.now(), url: strip(r.url()).replace(/csrfToken=[^&]+/, ''), method: r.request().method(), status: r.status()}); });
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
    const dialog = () => page.locator('[role="dialog"]:visible').last();

    async function classify(resp, name) {
        const url = page.url();
        const text = await page.locator('body').innerText().catch(() => '');
        const out = {who, httpStatus: resp && typeof resp.status === 'function' ? resp.status() : (resp && resp.err) || null, url: strip(url),
            title: await page.title().catch(() => null),
            loginForm: /\/login/.test(url) && (await page.locator('input[name="username"], #username').count()) > 0,
            denied: DENIED.test(text), deniedText: (text.match(DENIED) || [null])[0],
            tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).slice(0, 20),
            snippet: flat(text, 300)};
        if (name) await snap(name, {classified: out});
        return out;
    }

    // ------------------------------------------------------------------ the page's source, as a browser's "view source" shows it
    /** Navigate as the current user; read the raw document the server sent and the head as the browser parsed it. */
    async function src(url, name, {png = false} = {}) {
        const t0 = Date.now();
        let resp = null, err = null;
        try { resp = await page.goto(url); } catch (e) { err = String(e.message).slice(0, 200); }
        await idle(page).catch(() => {});
        const body = resp ? await resp.text().catch(() => null) : null;
        const headEnd = body ? body.search(/<\/head>/i) : -1;
        const head = body && headEnd > 0 ? body.slice(0, headEnd) : '';
        const tags = [...head.matchAll(/<(meta|link)\b[^>]*>/gi)].map((m) => m[0]);
        const pick = (re) => tags.filter((t) => re.test(t));
        const raw = (needle, n = 260) => { if (!body) return null; const i = body.indexOf(needle); return i < 0 ? null : {at: i, inHead: headEnd > 0 && i < headEnd, text: body.slice(i, i + n)}; };
        const out = {who, asked: strip(url), final: strip(page.url()), status: resp ? resp.status() : null, err, title: await page.title().catch(() => null),
            generator: pick(/name=["']generator["']/i),
            description: pick(/name=["']description["']/i),
            descriptionRaw: raw('<meta name="description"', 300),
            robots: pick(/name=["']robots["']/i),
            alternates: pick(/rel=['"]alternate['"][^>]*hreflang/i).map((t) => ({hreflang: (t.match(/hreflang=['"]([^'"]+)/) || [])[1], href: strip((t.match(/href=['"]([^'"]+)/) || [])[1])})),
            customTag: raw('u20-check', 120), plainWords: raw('Plain words', 80), customFr: raw('u20-fr', 120),
            gtm: body ? (body.match(/googletagmanager[^"'\s]*/g) || []) : null, gaId: body ? (body.match(/G-TEST12345[^\n]{0,40}/g) || []) : null, gtag: body ? /gtag\(/.test(body) : null,
            dcTags: body ? (body.match(/<meta name="DC\.[^"]+"/g) || []).length : null,
            citationTags: body ? (body.match(/<meta name="citation_[^"]+"/g) || []).length : null,
            crashes: since(traffic, t0).filter((x) => x.status >= 500)};
        // the head as the browser built it: what a crawler that runs the page sees
        out.dom = await page.evaluate(() => {
            const h = document.head;
            const d = document.querySelector('meta[name="description"]');
            const c = document.querySelector('meta[name="u20-check"]');
            const firstText = (document.body.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3);
            const pw = [...document.body.childNodes].find((n) => n.nodeType === 3 && /Plain words/.test(n.textContent));
            let pwBox = null;
            if (pw) { const r = document.createRange(); r.selectNodeContents(pw); const b = r.getBoundingClientRect(); pwBox = {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}; }
            return {descriptionContent: d ? d.getAttribute('content') : null, descriptionInHead: d ? h.contains(d) : null,
                descriptionAttrs: d ? [...d.attributes].map((a) => `${a.name}=${a.value}`) : null,
                customInHead: c ? h.contains(c) : null, alternatesInHead: h.querySelectorAll('link[rel=alternate][hreflang]').length,
                alternatesInBody: document.body.querySelectorAll('link[rel=alternate][hreflang]').length,
                robotsInHead: !!h.querySelector('meta[name=robots]'), robotsInBody: !!document.body.querySelector('meta[name=robots]'),
                stylesheetsInBody: document.body.querySelectorAll('link[rel=stylesheet]').length,
                bodyFirstLines: firstText, plainWordsBodyTextNode: !!pw, plainWordsBox: pwBox};
        }).catch((e) => ({error: String(e.message).slice(0, 200)}));
        await snap(name, {head: out}, {png});
        return out;
    }
    const brief = (h) => h && ({final: h.final, status: h.status, generator: h.generator, description: h.description, dom: h.dom && {desc: h.dom.descriptionContent, customInHead: h.dom.customInHead, altHead: h.dom.alternatesInHead, altBody: h.dom.alternatesInBody, first: h.dom.bodyFirstLines, pw: h.dom.plainWordsBox}, robots: h.robots, alternates: h.alternates, customTag: h.customTag && {inHead: h.customTag.inHead, text: h.customTag.text.slice(0, 60)}, customFr: h.customFr && h.customFr.inHead, plainWords: h.plainWords && h.plainWords.inHead, gtm: h.gtm, gaId: h.gaId, dc: h.dcTags, citation: h.citationTags, crashes: h.crashes});

    // ------------------------------------------------------------------ the tab
    async function openTab(ctx, {sideName = 'Search Indexing', slug = 'distribution'} = {}) {
        const r = await go(cu(ctx, `/management/settings/${slug}`));
        const tab = page.getByRole('tab', {name: sideName, exact: true}).first();
        await tab.click({timeout: 15_000}).catch(() => {});
        await idle(page); await sleep(700);
        return r;
    }
    const descBox = (loc_ = 'en') => page.locator(`[id^="searchIndexing-searchDescription-control-${loc_}"]`).first();
    const tagsBox = (loc_ = 'en') => page.locator(`[id^="searchIndexing-customHeaders-control-${loc_}"]`).first();
    const siForm = () => page.locator('form').filter({has: page.locator('[id^="searchIndexing-searchDescription-control"]')}).first();
    async function showFrench() {
        const b = siForm().getByRole('button', {name: 'French', exact: true}).first();
        if (await b.count()) { await b.click().catch(() => {}); await sleep(500); return true; }
        return false;
    }
    async function formRead() {
        const f = siForm();
        if (!(await f.count())) return {form: false};
        return f.evaluate((root) => {
            const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            return {form: true, id: root.id || null,
                heading: t(root.querySelector('legend, h2, h3, .pkpFormGroup__heading')),
                groupDescription: t(root.querySelector('.pkpFormGroup__description')),
                links: [...root.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                fields: [...root.querySelectorAll('.pkpFormField')].map((f) => ({label: t(f.querySelector('label, legend')), tooltip: (f.querySelector('.tooltipButton, [class*=tooltip], [id*=tooltip]') || {}).textContent?.replace(/\s+/g, ' ').trim() ?? null,
                    help: t(f.querySelector('.pkpFormField__description')),
                    controls: [...f.querySelectorAll('input, textarea')].map((c) => ({tag: c.tagName.toLowerCase(), type: c.type, id: c.id, visible: !!(c.offsetWidth || c.offsetHeight), value: c.value, maxlength: c.getAttribute('maxlength'), rows: c.getAttribute('rows')}))})),
                buttons: [...root.querySelectorAll('button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled})).filter((b) => b.text),
                localeButtons: [...root.querySelectorAll('.pkpFormLocales button, [class*=Locales] button')].map((b) => b.innerText.trim()),
                all: t(root).slice(0, 1500)};
        });
    }
    /** Hover each help icon and read the tooltip that shows. */
    async function tooltips() {
        const out = [];
        const btns = siForm().locator('.tooltipButton, button[aria-describedby], button:has(.fa-question-circle), [class*="tooltip"] button');
        const n = await btns.count().catch(() => 0);
        for (let i = 0; i < n; i++) {
            const b = btns.nth(i);
            const aria = await b.getAttribute('aria-label').catch(() => null);
            await b.hover().catch(() => {}); await sleep(500);
            const shown = await page.locator('[role="tooltip"]:visible, .tooltip:visible, .v-popper__popper:visible').allInnerTexts().catch(() => []);
            await b.click().catch(() => {}); await sleep(400);
            const clicked = await page.locator('[role="tooltip"]:visible, .tooltip:visible, .v-popper__popper:visible, [role="dialog"]:visible').allInnerTexts().catch(() => []);
            out.push({i, aria, shown: shown.map((x) => flat(x, 400)), clicked: clicked.map((x) => flat(x, 400))});
            await page.keyboard.press('Escape').catch(() => {}); await sleep(200);
        }
        return out;
    }
    /** Press the form's "Save": the request, the words beside the button, errors; then the tab after a reload. */
    async function saveTab(name, ctx, {reread = true} = {}) {
        const f = siForm();
        const t0 = Date.now();
        const r = page.waitForResponse((x) => /\/api\/v1\/contexts\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        const seen = new Set(); const start = Date.now();
        while (Date.now() - start < 6_000) { for (const s of await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])) if (s.trim()) seen.add(s.trim()); if (seen.has('Saved')) break; await sleep(200); }
        let body = null; if (resp && resp.status() >= 400) body = flat(await resp.text().catch(() => ''), 600);
        const out = {status: resp ? resp.status() : null, method: resp ? resp.request().method() : null, override: resp ? resp.request().headers()['x-http-method-override'] || null : null,
            statuses: [...seen], body, fieldErrors: await f.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []),
            formErrors: await page.locator('.pkpFormErrors, .pkpFormPage__errors, .app__notifications, [role="alert"]').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []),
            onPage: {en: await descBox('en').inputValue().catch(() => null), tagsEn: await tagsBox('en').inputValue().catch(() => null)},
            crashes: since(traffic, t0).filter((x) => x.status >= 500)};
        await snap(`${name}-saved`, {save: out}, {png: true});
        if (reread) {
            await page.reload(); await idle(page);
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
            const fr = await showFrench();
            out.afterReload = {desc: {en: await descBox('en').inputValue().catch(() => null), fr: fr ? await descBox('fr_CA').inputValue().catch(() => null) : 'no French'},
                tags: {en: await tagsBox('en').inputValue().catch(() => null), fr: fr ? await tagsBox('fr_CA').inputValue().catch(() => null) : 'no French'}};
            await snap(`${name}-reloaded`, {afterReload: out.afterReload});
        }
        const dbRows = db(`select locale, setting_name, setting_value from ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_settings where ${IDCOL}=${S[ctx] ? S[ctx].id : 0} and setting_name in ('searchDescription','customHeaders') order by 2,1`);
        out.db = dbRows;
        return out;
    }
    async function fillTab({descEn, tagsEn, descFr, tagsFr} = {}) {
        if (descEn !== undefined) await descBox('en').fill(descEn);
        if (tagsEn !== undefined) await tagsBox('en').fill(tagsEn);
        if (descFr !== undefined || tagsFr !== undefined) {
            await showFrench();
            if (descFr !== undefined) await descBox('fr_CA').fill(descFr);
            if (tagsFr !== undefined) await tagsBox('fr_CA').fill(tagsFr);
        }
    }

    // ------------------------------------------------------------------ plugin rows (Settings › Website › Plugins)
    const pRow = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
    async function readRow(name) {
        const row = pRow(name);
        if (!(await row.count())) return {present: false};
        const r = await row.evaluate((el) => {
            const box = el.querySelector('input[type=checkbox]');
            let cat = el.closest('tbody') && el.closest('tbody').previousElementSibling;
            while (cat && /empty/.test(cat.className)) cat = cat.previousElementSibling;
            return {present: true, text: el.innerText.replace(/\s+/g, ' ').trim(), enabled: box ? box.checked : null, category: cat ? cat.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null};
        }).catch((e) => ({error: String(e.message)}));
        const exp = row.locator('a.show_extras').first();
        if (await exp.count()) {
            await exp.click().catch(() => {}); await sleep(500);
            r.actions = (await row.locator('xpath=following-sibling::tr[1]').getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
            const hide = row.locator('a.hide_extras').first();
            if (await hide.count()) { await hide.click().catch(() => {}); await sleep(300); }
        }
        return r;
    }
    async function setRow(name, want) {
        const box = pRow(name).getByRole('checkbox').first();
        const was = await box.isChecked();
        if (was === want) return {changed: false, checked: was};
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
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
        await sleep(900); await idle(page);
        return {changed: true, status: resp ? resp.status() : null, dialogText, checked: await pRow(name).getByRole('checkbox').first().isChecked().catch(() => null), crashes: since(traffic, t0).filter((x) => x.status >= 500)};
    }
    async function openPlugins(ctx) {
        await go(cu(ctx, '/management/settings/website'));
        await page.locator('#plugins-button').click().catch(() => page.getByRole('tab', {name: 'Plugins', exact: true}).first().click());
        await idle(page); await sleep(800);
        await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
    }
    async function gaWindow(openFrom) {
        const row = pRow('Google Analytics Plugin');
        await row.locator('a.show_extras').first().click().catch(() => {}); await sleep(500);
        const actions = row.locator('xpath=following-sibling::tr[1]');
        const settings = actions.getByRole('link', {name: 'Settings', exact: true}).first();
        if (!(await settings.count())) return {opened: false, actions: (await actions.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim())};
        const t0 = Date.now();
        await settings.click();
        await sleep(1500); await idle(page);
        await dialog().locator('input[name="googleAnalyticsSiteId"]').waitFor({timeout: 10_000}).catch(() => {});
        const d = dialog();
        const st = (await d.count()) ? await d.evaluate((root) => ({title: (root.querySelector('h1, h2, .pkp_modal_panel > .header') || {}).innerText || null, text: root.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
            box: (() => { const i = root.querySelector('input[name="googleAnalyticsSiteId"]'); if (!i) return null; const l = root.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return {value: i.value, label: l ? l.innerText.trim() : null, required: i.required || i.getAttribute('aria-required')}; })()})) : null;
        return {opened: !!st, from: openFrom, window: st, crashes: since(traffic, t0).filter((x) => x.status >= 500)};
    }
    async function closeWin() {
        const d = dialog();
        if (!(await d.count())) return;
        const c = d.getByRole('link', {name: 'Cancel', exact: true}).first();
        if (await c.count()) await c.click(); else await d.getByRole('button', {name: /Close|Cancel/}).first().click().catch(() => page.keyboard.press('Escape'));
        await page.locator('[role="dialog"]:visible').waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(700);
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
    async function hostedEdit(name) {
        const actions = await hostedRow(name);
        await actions.getByRole('link', {name: 'Edit', exact: true}).click();
        const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
        await cb.waitFor({timeout: T});
        await idle(page); await sleep(500);
        return cb;
    }
    async function hostedSave() {
        const dlg = page.locator('[role="dialog"]:visible').last();
        const t0 = Date.now();
        const out0 = {};
        // a scratch journal has no initials, which this form requires (seed-facts): type them, as an admin would
        const acr = dlg.locator('input[id^="context-acronym-control"]').first();
        if ((await acr.count()) && !(await acr.inputValue())) { await acr.fill('K1'); out0.initialsTyped = true; }
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        let resp = await w;
        const out = {...out0, status: resp ? resp.status() : null};
        await sleep(1500); await idle(page);
        if (out.status >= 400) {
            out.errors = await dlg.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await dlg.locator('select[id^="context-country-control"]').first().selectOption('CA').catch(() => {});
            const w2 = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            resp = await w2; out.status2 = resp ? resp.status() : null; out.countryPicked = 'CA';
            await sleep(1500); await idle(page);
        }
        out.dialogOpen = (await page.locator('[role="dialog"]:visible').count()) > 0;
        out.crashes = since(traffic, t0).filter((x) => x.status >= 500);
        return out;
    }
    async function openWizardTab(name, tabName) {
        const actions = await hostedRow(name);
        await actions.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await page.waitForURL(/admin\/wizard\//, {timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        const top = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
        if (tabName) { await page.getByRole('tab', {name: tabName, exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700); }
        return {url: strip(page.url()), tabs: top};
    }

    try {
        // ============================================================ seed
        if (on('seed')) await sect('seed', async () => {
            if (!S.t) { S.t = tag('u20k1'); save(); }
            const t = S.t;
            const users = (p) => [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sid', familyName: 'Section'},
                {username: `${p}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ];
            const mk = async (key, extra = {}, extraUsers = []) => {
                if (S[key]) return;
                const p = `${t}${key.toLowerCase()}`.slice(0, 32);
                try {
                    const r = await app.api.createContext({tag: p, users: [...users(p), ...extraUsers], ...extra, context: {name: `U20 K1 ${key} ${t}`, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`, ...(extra.context || {})}});
                    S[key] = {path: r.path, id: r.contextId, name: `U20 K1 ${key} ${t}`}; log('ctx', key, r.path, r.contextId);
                } catch (e) { S[`${key}Err`] = String(e.message).slice(0, 800); log('ctx FAILED', key, S[`${key}Err`]); }
                save();
            };
            const issue = isOJS ? {issues: [{volume: 1, number: 1, year: 2024, published: true}]} : {};
            await mk('M', {
                context: {primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
                ...issue,
                plugins: {webfeedplugin: {enabled: true}, ...(isOJS ? {announcementfeedplugin: {enabled: true}} : {})},
                ...(isOJS ? {enableAnnouncements: true} : {}),
            });
            await mk('S', {...issue});
            await mk('N', {...issue});
            await mk('R');
            await mk('G', {...issue});
            await mk('X', {}, [{username: 'admin', roles: ['reader'], givenName: 'Site', familyName: 'Admin'}]);
            S.pubs = S.pubs || {};
            for (const key of ['M', 'S', 'N', 'G']) {
                if (!S[key] || S.pubs[key]) continue;
                try {
                    const r = await app.api.createSubmission({tag: `${S[key].path}p`.slice(0, 32), context: S[key].path, submitter: `${S[key].path}au`,
                        title: `U20 K1 published ${key} ${t}`, published: true, datePublished: '2024-03-05', ...(isOJS ? {issue: {volume: 1, number: 1, year: 2024}} : {})});
                    S.pubs[key] = {sid: r.submissionId, pid: r.publicationId}; log('sub', key, r.submissionId);
                } catch (e) { S[`pub${key}Err`] = String(e.message).slice(0, 600); log('sub FAILED', key, S[`pub${key}Err`]); }
                save();
            }
            fact('seed', {t, M: S.M, S: S.S, N: S.N, R: S.R, G: S.G, X: S.X, pubs: S.pubs, errs: Object.fromEntries(Object.entries(S).filter(([k]) => /Err$/.test(k)))});
            note(`ccK1 [${app.name}]: K1 scratch contexts ${['M', 'S', 'N', 'R', 'G', 'X'].map((k) => `${k} ${S[k] && S[k].path}`).join(', ')} (M en+fr_CA; N unticked on screen; R closed on screen; G Google Analytics; X admin without manager role)`);
        });
        const {M, N, R, G, X} = S;
        const SS = S.S;

        // ============================================================ access: every roster level at the addresses, on publicknowledge (read only)
        if (on('access')) await sect('access', async () => {
            const roster = isOPS
                ? ['admin', 'manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa']
                : ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'assistant.rita', 'reviewer.julia', 'author.alex', 'reader.rosa'];
            const pkId = db(`select ${IDCOL} from ${TABLE} where path='${app.contextPath}'`);
            const out = {};
            const addr = {tab: cu(app.contextPath, '/en/management/settings/distribution'), plugins: cu(app.contextPath, '/en/management/settings/website'), wizard: app.url(`/index.php/index/en/admin/wizard/${pkId}`)};
            for (const u of [...roster, null]) {
                if (u) await as(u, app.contextPath); else await visitor();
                const k = u || 'signedout';
                out[k] = {};
                for (const [a, url] of Object.entries(addr)) {
                    if (a === 'wizard' && !['admin', 'manager.maya', 'sectioneditor.ana', null].includes(u)) continue;
                    const resp = await go(url);
                    if (a === 'tab' && (await page.getByRole('tab', {name: 'Search Indexing', exact: true}).count().catch(() => 0)) > 0) {
                        await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page);
                    }
                    const c = await classify(resp, `a-${k.replace(/\./g, '')}-${a}`);
                    c.searchIndexingTab = await page.getByRole('tab', {name: 'Search Indexing', exact: true}).count().catch(() => 0);
                    c.descBox = await descBox('en').count().catch(() => 0);
                    out[k][a] = c;
                }
            }
            fact('access', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([a, c]) => [a, {st: c.httpStatus, url: c.url, login: c.loginForm, denied: c.deniedText, siTab: c.searchIndexingTab, box: c.descBox, tabs: c.tabs.slice(0, 8)}]))])));
        });

        // ============================================================ tab: the tab on M, the page head everywhere
        if (on('tab') && M) await sect('tab', async () => {
            const o = {};
            const mg = `${M.path}mg`;
            const P = S.pubs.M;
            // --- the new journal, both fields empty: the heads first (signed out)
            await visitor();
            o.h0home = brief(await src(cu(M.path, '/en'), 't-00-home-empty-signedout'));
            o.h0item = brief(await src(itemPage(M.path + '/en', P.sid), 't-00-item-empty-signedout'));
            // --- the tab as the manager
            await as(mg, M.path);
            await openTab(M.path);
            await snap('t-01-tab-new-journal', {}, {png: true});
            o.distributionTabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            o.form = await formRead();
            await loc(page, 'Distribution › "Search Indexing" tab', page.getByRole('tab', {name: 'Search Indexing', exact: true}));
            await loc(page, 'Search Indexing: "Description" box (en)', descBox('en'));
            await loc(page, 'Search Indexing: "Custom Tags" box (en)', tagsBox('en'));
            await loc(page, 'Search Indexing: the form\'s "French" button', siForm().getByRole('button', {name: 'French', exact: true}));
            await loc(page, 'Search Indexing: "Save"', siForm().getByRole('button', {name: 'Save', exact: true}));
            await loc(page, 'Search Indexing: the "sitemap" link', siForm().getByRole('link', {name: 'sitemap', exact: true}));
            o.tooltips = await tooltips();
            await snap('t-02-tooltips', {tooltips: o.tooltips});
            o.french = await showFrench();
            o.formFr = await formRead();
            await snap('t-03-french-shown', {form: o.formFr}, {png: true});
            // the "sitemap" link, followed
            const link = siForm().getByRole('link', {name: 'sitemap', exact: true}).first();
            if (await link.count()) {
                const pop = page.context().waitForEvent('page', {timeout: 10_000}).catch(() => null);
                await link.click().catch(() => {});
                const np = await pop;
                if (np) {
                    await np.waitForLoadState().catch(() => {});
                    o.sitemapLink = {newTab: true, url: strip(np.url()), title: await np.title().catch(() => null), head: flat(await np.content().catch(() => ''), 400)};
                    await np.close().catch(() => {});
                } else o.sitemapLink = {newTab: false, url: strip(page.url())};
            }
            // an empty "Save" on the new journal
            await openTab(M.path);
            o.saveEmpty = await saveTab('t-04-empty', 'M');
            // --- English values
            await openTab(M.path);
            await fillTab({descEn: 'Letters about still water.', tagsEn: '<meta name="u20-check" content="custom">\nPlain words'});
            o.saveEn = await saveTab('t-05-english', 'M');
            fact('tab-form', {tabs: o.distributionTabs, form: o.form, french: o.french, formFr: o.formFr && o.formFr.fields, tooltips: o.tooltips, sitemapLink: o.sitemapLink, saveEmpty: o.saveEmpty, saveEn: o.saveEn});
            // --- the heads after the English save
            await visitor();
            const reads = {
                home: cu(M.path, '/en'), homeIndex: cu(M.path, '/en/index'), homeFr: cu(M.path, '/fr_CA'), about: cu(M.path, '/en/about'), item: itemPage(M.path + '/en', P.sid),
                list: listPage(M.path + '/en'), login: cu(M.path, '/en/login'), search: cu(M.path, '/en/search'),
            };
            o.heads = {};
            for (const [k, u] of Object.entries(reads)) o.heads[k] = brief(await src(u, `t-10-${k}-signedout`, {png: ['home', 'item', 'login'].includes(k)}));
            await go(cu(M.path, '/en'));
            // the site's own pages
            o.heads.siteHome = brief(await src(app.url('/index.php/index/en'), 't-10-sitehome-signedout', {png: true}));
            o.heads.siteLogin = brief(await src(app.url('/index.php/index/en/login'), 't-10-sitelogin-signedout'));
            // signed in: a reader on the public home, the manager on editorial pages, the admin on Administration
            await as(`${M.path}rd`, M.path);
            o.heads.homeReader = brief(await src(cu(M.path, '/en'), 't-11-home-reader'));
            await as(mg, M.path);
            o.heads.homeManager = brief(await src(cu(M.path, '/en'), 't-12-home-manager'));
            o.heads.dashboard = brief(await src(cu(M.path, '/en/dashboard/editorial'), 't-12-dashboard-manager', {png: true}));
            o.heads.settings = brief(await src(cu(M.path, '/en/management/settings/distribution'), 't-12-settings-manager'));
            o.heads.workflow = brief(await src(cu(M.path, `/en/dashboard/editorial?workflowSubmissionId=${P.sid}`), 't-12-workflow-manager'));
            await as('admin');
            o.heads.adminPage = brief(await src(app.url('/index.php/index/en/admin'), 't-13-admin-index'));
            o.heads.adminContexts = brief(await src(app.url('/index.php/index/en/admin/contexts'), 't-13-admin-contexts'));
            fact('tab-heads-en', o.heads);
            // --- French: the English text with the French box empty, then a French text
            await visitor();
            o.fr = {};
            o.fr.homeFrFallback = brief(await src(cu(M.path, '/fr_CA'), 't-20-home-fr-fallback'));
            o.fr.itemFrFallback = brief(await src(itemPage(M.path + '/fr_CA', P.sid), 't-20-item-fr-fallback'));
            await go(cu(M.path, '/en'));
            await as(mg, M.path);
            await openTab(M.path);
            await fillTab({descFr: 'Lettres sur l\'eau calme.', tagsFr: '<meta name="u20-fr" content="francais">'});
            o.fr.save = await saveTab('t-21-french', 'M');
            await visitor();
            o.fr.homeFr = brief(await src(cu(M.path, '/fr_CA'), 't-22-home-fr'));
            o.fr.itemFr = brief(await src(itemPage(M.path + '/fr_CA', P.sid), 't-22-item-fr'));
            o.fr.homeEn = brief(await src(cu(M.path, '/en'), 't-22-home-en'));
            fact('tab-french', o.fr);
            // --- lengths: 20 and 400 characters
            await as(mg, M.path);
            o.len = {};
            for (const [k, v] of [['short20', 'Twenty chars exactly'], ['long400', ('Long description text. ').repeat(18).slice(0, 400)]]) {
                await openTab(M.path);
                await fillTab({descEn: v});
                const s = await saveTab(`t-30-${k}`, 'M', {reread: false});
                o.len[k] = {typed: v.length, status: s.status, statuses: s.statuses, fieldErrors: s.fieldErrors, formErrors: s.formErrors};
            }
            await visitor();
            o.len.home400 = brief(await src(cu(M.path, '/en'), 't-31-home-400'));
            // --- A1: a double quote mark and markup
            await as(mg, M.path);
            await openTab(M.path);
            const A1 = 'The "Sea" <b>journal</b> & more';
            await fillTab({descEn: A1});
            o.a1save = await saveTab('t-40-a1', 'M');
            await visitor();
            const hA1 = await src(cu(M.path, '/en'), 't-41-home-a1', {png: true});
            o.a1 = {typed: A1, save: {status: o.a1save.status, statuses: o.a1save.statuses, afterReload: o.a1save.afterReload, db: o.a1save.db}, raw: hA1.descriptionRaw, dom: hA1.dom, visibleFirstLines: hA1.dom && hA1.dom.bodyFirstLines};
            fact('tab-lengths-a1', {len: o.len, a1: o.a1});
            // --- emptied in every language: no description tag, no custom tags
            await as(mg, M.path);
            await openTab(M.path);
            await fillTab({descEn: '', tagsEn: '', descFr: '', tagsFr: ''});
            o.emptied = await saveTab('t-50-emptied', 'M');
            await visitor();
            o.emptiedHome = brief(await src(cu(M.path, '/en'), 't-51-home-emptied'));
            o.emptiedHomeFr = brief(await src(cu(M.path, '/fr_CA'), 't-51-home-fr-emptied'));
            await go(cu(M.path, '/en'));
            fact('tab-emptied', {save: {status: o.emptied.status, statuses: o.emptied.statuses, afterReload: o.emptied.afterReload, db: o.emptied.db}, home: o.emptiedHome, homeFr: o.emptiedHomeFr});
            // --- single-language journal S: the alternates' other end, and the seeded two-language journal
            o.alt = {};
            o.alt.sHome = brief(await src(cu(SS.path), 't-60-s-home'));
            o.alt.sItem = brief(await src(itemPage(SS.path, S.pubs.S.sid), 't-60-s-item'));
            o.alt.pkHomeEn = brief(await src(cu(app.contextPath, '/en'), 't-61-pk-home-en'));
            o.alt.pkAboutEn = brief(await src(cu(app.contextPath, '/en/about'), 't-61-pk-about-en'));
            o.alt.pkHomeFr = brief(await src(cu(app.contextPath, '/fr_CA'), 't-61-pk-home-fr'));
            o.alt.pkAboutFr = brief(await src(cu(app.contextPath, '/fr_CA/about'), 't-61-pk-about-fr'));
            await go(cu(app.contextPath, '/en'));
            o.alt.mItemEnQuery = brief(await src(cu(M.path, '/en/search/search?query=water'), 't-62-m-search-query'));
            fact('alternates', o.alt);
            // --- the tab left with an unsaved change: another tab, back; then another page, back; then a reload
            await as(mg, M.path);
            const t0 = Date.now();
            await openTab(M.path);
            await descBox('en').fill('K1 unsaved description');
            await descBox('en').blur().catch(() => {});
            const other = o.distributionTabs.find((x) => x && x !== 'Search Indexing') || 'License';
            await page.getByRole('tab', {name: other, exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700);
            await snap('t-70-left-to-other-tab', {other}, {png: true});
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click(); await idle(page); await sleep(500);
            const lv = {other, afterTabSwitch: await descBox('en').inputValue().catch(() => null)};
            await go(cu(M.path, '/en/dashboard/editorial'));
            lv.leftTo = strip(page.url());
            await openTab(M.path);
            lv.afterLeave = await descBox('en').inputValue().catch(() => null);
            await descBox('en').fill('K1 unsaved again');
            await descBox('en').blur().catch(() => {});
            await page.reload().catch((e) => { lv.reloadErr = String(e.message).slice(0, 120); }); await idle(page);
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(500);
            lv.afterReload = await descBox('en').inputValue().catch(() => null);
            lv.dialogs = jsDialogs.filter((d) => d.at >= t0);
            await snap('t-71-after-leave', {leave: lv});
            fact('leave', lv);
            // leave M with the English values saved again (the wizard phase reads them)
            await openTab(M.path);
            await fillTab({descEn: 'Letters about still water.', tagsEn: '<meta name="u20-check" content="custom">\nPlain words'});
            o.resave = await saveTab('t-72-resave', 'M', {reread: false});
            fact('resave', {status: o.resave.status, statuses: o.resave.statuses});
        });

        // ============================================================ a1b: register A1's own example, a double quote mark with no markup
        if (on('a1b') && M) await sect('a1b', async () => {
            const o = {};
            await as(`${M.path}mg`, M.path);
            await openTab(M.path);
            o.typed = 'The "Sea" journal';
            await fillTab({descEn: o.typed});
            const sv = await saveTab('t-42-a1-quote-only', 'M');
            o.save = {status: sv.status, statuses: sv.statuses, afterReload: sv.afterReload && sv.afterReload.desc, db: sv.db};
            await visitor();
            const h = await src(cu(M.path, '/en'), 't-43-home-a1-quote-only', {png: true});
            o.raw = h.descriptionRaw && h.descriptionRaw.text.split('\n')[0];
            o.dom = h.dom && {content: h.dom.descriptionContent, attrs: h.dom.descriptionAttrs, first: h.dom.bodyFirstLines};
            await as(`${M.path}mg`, M.path);
            await openTab(M.path);
            await fillTab({descEn: 'Letters about still water.'});
            await saveTab('t-44-a1-restore', 'M', {reread: false});
            fact('a1b', o);
        });

        // ============================================================ wizard: the Site Administrator's Settings Wizard
        if (on('wizard') && M) await sect('wizard', async () => {
            const o = {};
            // the manager types the wizard's address
            await as(`${M.path}mg`, M.path);
            o.managerWizard = await classify(await go(app.url(`/index.php/index/en/admin/wizard/${M.id}`)), 'w-00-manager-wizard-typed');
            o.managerContexts = await classify(await go(app.url('/index.php/index/en/admin/contexts')), 'w-00-manager-contexts-typed');
            await as('admin');
            const firstTab = isOJS ? 'Journal Settings' : isOMP ? 'Setup' : 'Server Settings';
            o.landing = await openWizardTab(M.name, null);
            await snap('w-01-wizard-landing', {landing: o.landing}, {png: true});
            await page.getByRole('tab', {name: firstTab, exact: true}).first().click().catch((e) => { o.firstTabErr = String(e.message).slice(0, 120); });
            await idle(page); await sleep(500);
            o.sideTabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch((e) => { o.sideErr = String(e.message).slice(0, 120); });
            await idle(page); await sleep(700);
            await loc(page, 'Settings Wizard: side tab "Search Indexing"', page.getByRole('tab', {name: 'Search Indexing', exact: true}));
            o.form = await formRead();
            o.french = await showFrench();
            o.values = {en: await descBox('en').inputValue().catch(() => null), fr: await descBox('fr_CA').inputValue().catch(() => null), tagsEn: await tagsBox('en').inputValue().catch(() => null)};
            await snap('w-02-wizard-search-indexing', {form: o.form, values: o.values}, {png: true});
            await descBox('en').fill('Wizard description K1');
            o.save = await saveTab('w-03-wizard-save', 'M', {reread: false});
            o.save.contextIdInUrl = o.save && traffic.filter((x) => /\/api\/v1\/contexts\//.test(x.url) && x.method !== 'GET').slice(-1).map((x) => x.url)[0];
            await page.reload(); await idle(page);
            await page.getByRole('tab', {name: firstTab, exact: true}).first().click().catch(() => {}); await idle(page);
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(500);
            o.wizardAfterReload = await descBox('en').inputValue().catch(() => null);
            // the wizard's "Plugins" tab (Actors: enable or disable the three plugins)
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch((e) => { o.pluginsErr = String(e.message).slice(0, 120); });
            await idle(page); await sleep(1000);
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.wizardPlugins = {};
            for (const n of ['Dublin Core Indexing Plugin', 'Google Scholar Indexing Plugin', 'Google Analytics Plugin']) o.wizardPlugins[n] = await readRow(n);
            await snap('w-04-wizard-plugins', {rows: o.wizardPlugins}, {png: true});
            // the journal's own tab reads the wizard's save
            await as(`${M.path}mg`, M.path);
            await openTab(M.path);
            o.ownTab = await descBox('en').inputValue().catch(() => null);
            await snap('w-05-own-tab-after-wizard', {value: o.ownTab});
            await visitor();
            o.home = brief(await src(cu(M.path, '/en'), 'w-06-home-after-wizard'));
            fact('wizard', {managerWizard: o.managerWizard, managerContexts: o.managerContexts, landing: o.landing, sideTabs: o.sideTabs, form: o.form, values: o.values,
                save: o.save && {status: o.save.status, statuses: o.save.statuses, db: o.save.db, url: o.save.contextIdInUrl, crashes: o.save.crashes}, wizardAfterReload: o.wizardAfterReload,
                plugins: o.wizardPlugins, ownTab: o.ownTab, home: o.home, errs: [o.firstTabErr, o.sideErr, o.pluginsErr].filter(Boolean)});
            // restore the English text (the effects phase reads it)
            await as(`${M.path}mg`, M.path);
            await openTab(M.path);
            await fillTab({descEn: 'Letters about still water.'});
            await saveTab('w-07-restore', 'M', {reread: false});
        });

        // ============================================================ effects: mail, notifications, log; the description elsewhere
        if (on('effects') && M) await sect('effects', async () => {
            const o = {};
            const P = S.pubs.M;
            const people = ['mg', 'se', 'rd', 'au'].map((s) => `${M.path}${s}@mail.test`).concat([`principal${M.path}@mail.test`, 'admin@mail.test']);
            const mailCount = async () => { const r = {}; for (const e of people) r[e] = await app.mail.count({to: e}).catch((x) => `err ${String(x.message).slice(0, 60)}`); return r; };
            const counts = () => ({notifications: db(`select count(*) from notifications where context_id=${M.id}`), eventLog: db(`select count(*) from event_log where assoc_type=1048585 and assoc_id=${P.sid}`), eventLogAll: db('select count(*) from event_log')});
            // the feeds before (English text saved by the wizard phase's restore)
            await visitor();
            const feed = async (u, name) => {
                const r = await page.goto(u).catch(() => null);
                const body = r ? await r.text().catch(() => '') : '';
                const d = (body.match(/<channel[\s\S]*?<description>([\s\S]*?)<\/description>/) || body.match(/<subtitle[^>]*>([\s\S]*?)<\/subtitle>/) || [])[1] || null;
                record(name, {url: strip(u), final: strip(page.url()), status: r ? r.status() : null, ct: r ? r.headers()['content-type'] : null, channelDescription: d, head: body.slice(0, 900)});
                return {status: r ? r.status() : null, final: strip(page.url()), channelDescription: d};
            };
            o.webFeedRss2 = await feed(cu(M.path, '/en/gateway/plugin/WebFeedGatewayPlugin/rss2'), 'e-01-webfeed-rss2');
            o.webFeedAtom = await feed(cu(M.path, '/en/gateway/plugin/WebFeedGatewayPlugin/atom'), 'e-01-webfeed-atom');
            o.webFeedRss2Fr = await feed(cu(M.path, '/fr_CA/gateway/plugin/WebFeedGatewayPlugin/rss2'), 'e-01-webfeed-rss2-fr');
            await go(cu(M.path, '/en'));
            if (isOJS) {
                o.annFeedRss2 = await feed(cu(M.path, '/en/gateway/plugin/AnnouncementFeedGatewayPlugin/rss2'), 'e-02-annfeed-rss2');
                o.annFeedAtom = await feed(cu(M.path, '/en/gateway/plugin/AnnouncementFeedGatewayPlugin/atom'), 'e-02-annfeed-atom');
            }
            // a save on the tab, with the mail catcher, notifications and logs counted before and after
            await as(`${M.path}mg`, M.path);
            o.before = {mail: await mailCount(), ...counts()};
            await openTab(M.path);
            await fillTab({descEn: 'Letters about still water.', tagsEn: '<meta name="u20-check" content="custom">'});
            o.save = await saveTab('e-03-save', 'M', {reread: false});
            await sleep(3000);
            o.after = {mail: await mailCount(), ...counts()};
            // the side menu's notification bell / tasks after the save
            await go(cu(M.path, '/en/dashboard/editorial'));
            o.dashboardAfter = await snap('e-04-dashboard-after-save');
            // the workflow's activity log of the published item (the submission log)
            await go(cu(M.path, `/en/dashboard/editorial?workflowSubmissionId=${P.sid}`));
            const hist = page.getByRole('button', {name: /Activity Log|History/}).first();
            if (await hist.count()) { await hist.click().catch(() => {}); await idle(page); await sleep(800); }
            o.activityLog = await snap('e-05-activity-log');
            await closeWin();
            fact('effects', o);
        });

        // ============================================================ lockss {OJS}: the LOCKSS and CLOCKSS pages' "Description"
        if (on('lockss') && M && isOJS) await sect('lockss', async () => {
            const o = {};
            await as(`${M.path}mg`, M.path);
            // LOCKSS / CLOCKSS {OJS}: Distribution's archiving tab, ticked on screen, the pages read
            if (isOJS) {
                await go(cu(M.path, '/en/management/settings/distribution'));
                o.distTabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
                const arch = page.getByRole('tab', {name: /Archiving/}).first();
                if (await arch.count()) {
                    await arch.click(); await idle(page); await sleep(700);
                    await page.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700);
                    const lk = page.getByRole('checkbox', {name: /LOCKSS/}).first();
                    const ck = page.getByRole('checkbox', {name: /CLOCKSS/}).first();
                    o.archivingTab = await snap('e-06-archiving-tab', {}, {png: true});
                    if (await lk.count()) await lk.check().catch(() => {});
                    if (await ck.count()) await ck.check().catch(() => {});
                    const f = page.locator('form').filter({has: lk}).first();
                    const w = page.waitForResponse((x) => /\/api\/v1\/contexts\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await f.getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
                    const r = await w; o.archivingSave = r ? r.status() : null;
                    await sleep(1500);
                } else o.archivingTab = 'no Archiving tab';
                await visitor();
                for (const g of ['lockss', 'clockss']) {
                    const r = await go(cu(M.path, `/en/gateway/${g}`));
                    const rows = await page.locator('table.data tr').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
                    o[g] = {status: r && r.status ? r.status() : null, final: strip(page.url()), descriptionRow: rows.filter((x) => /^Description/.test(x))};
                    await snap(`e-07-${g}`, {rows});
                }
            }
            fact('lockss', o);
        });

        // ============================================================ noindex: Rule 11, Settings 8
        if (on('noindex') && N) await sect('noindex', async () => {
            const o = {};
            // before: enabled (a new journal)
            await visitor();
            o.before = {home: brief(await src(cu(N.path), 'n-00-home-enabled-signedout')), siteIndex: await src(app.url('/index.php/index/en/sitemap'), 'n-00-site-sitemap').then((h) => ({status: h.status, final: h.final}))};
            o.before.siteIndexLists = (await page.content()).includes(`/${N.path}/sitemap`);
            await as('admin');
            let cb = await hostedEdit(N.name);
            o.defaultTicked = await cb.isChecked();
            o.boxLabel = await cb.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            await snap('n-01-hosted-edit', {ticked: o.defaultTicked, label: o.boxLabel}, {png: true});
            await cb.uncheck();
            o.untickSave = await hostedSave();
            await snap('n-02-hosted-saved', {save: o.untickSave});
            // the manager: home and editorial pages
            await as(`${N.path}mg`, N.path);
            o.mgrHome = brief(await src(cu(N.path), 'n-03-home-manager', {png: true}));
            o.mgrItem = brief(await src(itemPage(N.path, S.pubs.N.sid), 'n-03-item-manager'));
            o.mgrDashboard = brief(await src(cu(N.path, '/dashboard/editorial'), 'n-03-dashboard-manager'));
            o.mgrSettings = brief(await src(cu(N.path, '/management/settings/distribution'), 'n-03-settings-manager'));
            o.mgrSitemap = await src(cu(N.path, '/sitemap'), 'n-03-sitemap-manager').then((h) => ({status: h.status, final: h.final, title: h.title}));
            o.mgrSitemap.isXml = /urlset/.test(await page.content().catch(() => ''));
            // signed out
            await visitor();
            o.outHome = brief(await src(cu(N.path), 'n-04-home-signedout', {png: true}));
            o.outSitemap = await src(cu(N.path, '/sitemap'), 'n-04-sitemap-signedout').then((h) => ({status: h.status, final: h.final, title: h.title}));
            await go(app.url('/index.php/index/en/sitemap'));
            o.siteIndexListsWhileOff = (await page.content()).includes(`/${N.path}/sitemap`);
            await snap('n-05-site-sitemap-off');
            // the admin ticks it again; the manager reloads
            await as('admin');
            cb = await hostedEdit(N.name);
            o.shownUnticked = !(await cb.isChecked());
            await cb.check();
            o.retickSave = await hostedSave();
            await as(`${N.path}mg`, N.path);
            o.mgrHomeAfter = brief(await src(cu(N.path), 'n-06-home-manager-reticked'));
            o.mgrDashboardAfter = brief(await src(cu(N.path, '/dashboard/editorial'), 'n-06-dashboard-manager-reticked'));
            await visitor();
            o.outHomeAfter = brief(await src(cu(N.path), 'n-07-home-signedout-reticked'));
            // control: M, enabled all along
            o.mControl = brief(await src(cu(M.path, '/en'), 'n-08-m-control'));
            fact('noindex', o);
        });

        // ============================================================ restricted: Actors row 1 (the sitemap on a journal closed to visitors)
        if (on('restricted') && R) await sect('restricted', async () => {
            const o = {};
            await as(`${R.path}mg`, R.path);
            await go(cu(R.path, '/management/settings/access'));
            await page.getByRole('tab', {name: 'Site Access Options', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
            const box = page.getByRole('checkbox', {name: /Users must be registered and log in to view the (journal|press|server) site\./});
            o.label = await box.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            await box.check();
            const f = page.locator('form').filter({has: box}).first();
            const w = page.waitForResponse((x) => /\/api\/v1\/contexts\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w; o.save = r ? r.status() : null;
            await sleep(1200);
            await snap('r-01-restricted-saved', {o});
            await visitor();
            o.outSitemap = await src(cu(R.path, '/sitemap'), 'r-02-sitemap-signedout', {png: true}).then((h) => ({status: h.status, final: h.final, title: h.title}));
            o.outHome = await src(cu(R.path), 'r-02-home-signedout').then((h) => ({status: h.status, final: h.final, generator: h.generator}));
            await as(`${R.path}rd`, R.path);
            o.readerSitemap = await src(cu(R.path, '/sitemap'), 'r-03-sitemap-reader').then((h) => ({status: h.status, final: h.final, title: h.title}));
            o.readerSitemap.isXml = /urlset/.test(await page.content().catch(() => ''));
            fact('restricted', o);
        });

        // ============================================================ plugins: the three rows, Google Analytics on G, the preprint's Dublin Core tags
        if (on('plugins') && G) await sect('plugins', async () => {
            const o = {};
            const NAMES = ['Dublin Core Indexing Plugin', 'Google Scholar Indexing Plugin', 'Google Analytics Plugin'];
            await as(`${G.path}mg`, G.path);
            await openPlugins(G.path);
            o.rows = {};
            for (const n of NAMES) o.rows[n] = await readRow(n);
            await snap('p-01-plugins-new-journal', {rows: o.rows}, {png: true});
            await loc(page, 'Website › Plugins: the "Google Analytics Plugin" row', pRow('Google Analytics Plugin'));
            // a rerun finds the plugin as the last run left it: untick it first
            if (o.rows['Google Analytics Plugin'] && o.rows['Google Analytics Plugin'].enabled) { o.rerunUntick = await setRow('Google Analytics Plugin', false); await openPlugins(G.path); }
            // the Google Analytics row while unticked: its actions
            o.gaOffWindow = await gaWindow('unticked');
            await snap('p-02-ga-unticked-actions', {w: o.gaOffWindow});
            // tick it, open "Settings"
            o.gaOn = await setRow('Google Analytics Plugin', true);
            o.gaOnActions = await readRow('Google Analytics Plugin');
            o.gaWin = await gaWindow('ticked');
            await snap('p-03-ga-window', {w: o.gaWin}, {png: true});
            const d = dialog();
            const t0 = Date.now();
            // "OK" on the empty box, then a number
            o.gaWinArrivalValue = await d.locator('input[name="googleAnalyticsSiteId"]').inputValue().catch(() => null);
            await d.locator('input[name="googleAnalyticsSiteId"]').fill('').catch(() => {});
            await d.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(1200); await idle(page);
            o.okEmpty = {stillOpen: (await page.locator('[role="dialog"]:visible').count()) > 0, text: flat(await dialog().innerText().catch(() => ''), 800), errors: await dialog().locator('.error, label.error, .pkp_form_error').allInnerTexts().catch(() => [])};
            await snap('p-04-ga-ok-empty', {o: o.okEmpty});
            await dialog().locator('input[name="googleAnalyticsSiteId"]').fill('G-TEST12345');
            const wr = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
            await dialog().getByRole('button', {name: 'OK', exact: true}).click();
            const rr = await wr;
            await sleep(1500); await idle(page);
            o.okSet = {post: rr ? rr.status() : null, stillOpen: (await page.locator('[role="dialog"]:visible').count()) > 0, notices: await page.locator('.ui-pnotify-text, .pkpNotification, [role="alert"], .app__notifications').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []), crashes: since(traffic, t0).filter((x) => x.status >= 500)};
            await snap('p-05-ga-ok-set', {o: o.okSet});
            await closeWin();
            await page.reload(); await idle(page);
            await page.locator('#plugins-button').click().catch(() => {}); await idle(page); await sleep(600);
            o.reopen = await gaWindow('reopen');
            await closeWin();
            // the pages: public and editorial
            await visitor();
            o.heads = {home: brief(await src(cu(G.path), 'p-10-home-ga')), item: brief(await src(itemPage(G.path, S.pubs.G.sid), 'p-10-item-ga')), login: brief(await src(cu(G.path, '/login'), 'p-10-login-ga')), about: brief(await src(cu(G.path, '/about'), 'p-10-about-ga'))};
            await as(`${G.path}mg`, G.path);
            o.heads.dashboard = brief(await src(cu(G.path, '/dashboard/editorial'), 'p-11-dashboard-ga'));
            o.heads.site = brief(await src(app.url('/index.php/index/en'), 'p-11-site-ga'));
            // untick it: the actions
            await openPlugins(G.path);
            o.gaOff = await setRow('Google Analytics Plugin', false);
            o.gaOffActions = await readRow('Google Analytics Plugin');
            await snap('p-12-ga-unticked-again', {row: o.gaOffActions});
            await visitor();
            o.heads.homeOff = brief(await src(cu(G.path), 'p-13-home-ga-off'));
            // Dublin Core tags on the published item's page (OPS: none; OJS/OMP: the control)
            o.dcItem = {dc: o.heads.item && o.heads.item.dc, citation: o.heads.item && o.heads.item.citation};
            fact('plugins', o);
        });

        // ============================================================ sitega: the site's own Plugins tab (restored)
        if (on('sitega')) await sect('sitega', async () => {
            const o = {};
            await as('admin');
            await go(app.url('/index.php/index/en/admin/settings'));
            o.tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            o.contexts = db(`select count(*) from ${TABLE}`);
            const pt = page.getByRole('tab', {name: 'Plugins', exact: true}).first();
            if (!(await pt.count())) { fact('sitega', o); return; }
            await pt.click(); await idle(page); await sleep(1000);
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.row = await readRow('Google Analytics Plugin');
            await snap('s-01-site-plugins', {row: o.row}, {png: true});
            o.on = await setRow('Google Analytics Plugin', true);
            o.rowTicked = await readRow('Google Analytics Plugin');
            // the grid read again after a reload, with the plugin ticked
            await page.reload(); await idle(page);
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page); await sleep(1000);
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.rowTickedReloaded = await readRow('Google Analytics Plugin');
            await snap('s-01b-site-plugins-ticked-reloaded', {row: o.rowTickedReloaded}, {png: true});
            o.win = await gaWindow('site');
            await snap('s-02-site-ga-settings', {w: o.win}, {png: true});
            o.dialogs = jsDialogs.slice(-3);
            await closeWin();
            o.siteHome = brief(await src(app.url('/index.php/index/en'), 's-03-site-home-ga'));
            // restore
            await go(app.url('/index.php/index/en/admin/settings'));
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page); await sleep(1000);
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.off = await setRow('Google Analytics Plugin', false);
            o.rowAfter = await readRow('Google Analytics Plugin');
            await snap('s-04-site-plugins-restored', {row: o.rowAfter});
            fact('sitega', o);
        });

        // ============================================================ noadmin: the Site Administrator without a manager role in X
        if (on('noadmin') && X) await sect('noadmin', async () => {
            const o = {};
            await as('admin', X.path);
            await go(cu(X.path, '/management/settings/access'));
            const table = page.locator('table').filter({hasText: /\badmin\b/}).first();
            await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
            const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
            await adminRow.locator('button').last().click().catch(() => {}); await idle(page);
            await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
            await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
            await idle(page);
            await page.getByRole('button', {name: /Remove Role/i}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            o.rolesBefore = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            const roleRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
            if (await roleRow.count()) {
                await roleRow.getByRole('button', {name: /Remove Role/i}).click(); await idle(page);
                const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
                await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\//.test(r.url()), {timeout: 15_000}).catch(() => null);
                await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                const rr = await w; o.removeRole = rr ? rr.status() : 'no request';
                await idle(page); await sleep(1200);
            }
            o.rolesAfter = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            await snap('x-01-admin-roles-after', o);
            await as('admin');
            o.tab = await classify(await go(cu(X.path, '/management/settings/distribution')), 'x-02-admin-tab-no-manager-role');
            o.tab.siTab = await page.getByRole('tab', {name: 'Search Indexing', exact: true}).count().catch(() => 0);
            // the wizard's tab still opens for the admin
            await openWizardTab(X.name, null);
            const firstTab = isOJS ? 'Journal Settings' : isOMP ? 'Setup' : 'Server Settings';
            await page.getByRole('tab', {name: firstTab, exact: true}).first().click().catch(() => {}); await idle(page);
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(500);
            o.wizardBox = await descBox('en').count().catch(() => 0);
            if (o.wizardBox) {
                await descBox('en').fill('Admin without manager role');
                const s = await saveTab('x-03-wizard-save-no-manager-role', 'X', {reread: false});
                o.wizardSave = {status: s.status, statuses: s.statuses, db: s.db, crashes: s.crashes};
            }
            fact('noadmin', o);
        });
    } finally {
        save();
        await close();
    }
});
