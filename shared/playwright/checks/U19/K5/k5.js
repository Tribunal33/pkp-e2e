const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk K5: JATS, versions and DRIVER {OJS}.
// Spec: docs/specs/U19-oai-pmh.md — Fields "The JATS record", "Enable OAI" and the "JATS Metadata Format" "Settings"
// window (196–230); Rules 20–23 (395–429); Settings bullets 2–6 (455–476); register A10–A11 (740–757);
// footnotes h, i, o, p, r, q3, q5, q6, q20, q21, f-a10, f-a11.
//
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK5 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U19/K5/k5.js
//   PHASES=seed,oai,... (default: all, in the order below). State in k5-state-<app>.json under the output folder, so a
//   phase re-runs alone; RESEED=1 for a fresh seed. A phase that mutates marks itself done; REDO=1 runs it again.
//   Phases: seed · oai ("Enable OAI" on a new context, OJS and OPS; OMP control) · win (OJS: the "JATS Metadata Format"
//   row and window, per level) · dois (OJS: a new journal's DOIs tab) · jats (OJS: Rules 21, 21b, 22, the JATS record,
//   q5 steps 1–4) · sub (OJS: 21a, A10, q5 step 5; signed out, as a reader, as the manager) · driver (OJS: Rule 23,
//   q21) · a11 (OJS: "Unpublish" of an article in no issue with DRIVER on) · versions (OJS: Rule 20, q20; turns
//   "DOI Versioning" on for journal V and OFF again before it ends) · restore (OJS: every K5 journal back to
//   "No"; always run last).
//
// While any journal on the install has DOIs and "DOI Versioning" on, every OJS OAI list answers 500 (ccK1/ccK2), so the
// versions phase keeps the on-window short and the restore phase checks the database afterwards.
// Scratch journals (OJS, tag prefix u19k5): W (new, untouched: defaults and windows), J (open; en + fr_CA; issue 2024),
// S (subscription; JATS and DRIVER on), D (open; DRIVER ticked on screen), V (DOIs, versioning on screen), C (DOIs,
// no versioning: control). OPS P and OMP M: new contexts for "Enable OAI". publicknowledge and seeded users untouched.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'oai', 'win', 'dois', 'jats', 'sub', 'driver', 'a11', 'versions', 'restore'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k5 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k5-state-${app.name}.json`);
const REPO = 'oai:ojs-test.localhost:article/';
const YES = 'Yes, assign a unique DOI to every version of an article.';
const NO = 'No, all versions of an article should have the same DOI.';
const psql = (app, sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim(); } catch (e) { return `psql error: ${flat(e.message, 200)}`; } };
const g1 = (re, s) => { const r = String(s).match(re); return r ? r[1] : null; };

// the OAI answer, parsed (regex; the answers are regular)
function parseOai(xml) {
    const x = String(xml || '');
    const out = {};
    out.errors = [...x.matchAll(/<error code="([^"]*)">([^<]*)<\/error>/g)].map((e) => `${e[1]}: ${e[2]}`);
    out.records = [...x.matchAll(/<header( status="deleted")?>([\s\S]*?)<\/header>([\s\S]*?)(?=<record>|<header|<\/ListRecords>|<\/ListIdentifiers>|<\/GetRecord>|<resumptionToken|$)/g)].map((h) => ({
        id: g1(/<identifier>([^<]*)</, h[2]), sets: [...h[2].matchAll(/<setSpec>([^<]*)</g)].map((m) => m[1]), deleted: !!h[1],
        md: h[3],
    }));
    out.sets = [...x.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((m) => ({spec: m[1], name: m[2]}));
    out.formats = [...x.matchAll(/<metadataPrefix>([^<]*)</g)].map((m) => m[1]);
    out.token = /<resumptionToken[^>]*>[^<]+</.test(x);
    return out;
}
// what a jats record carries
function jatsFacts(md) {
    const m = String(md || '');
    const art = m.match(/<article\b[^>]*>/);
    return {
        article: art ? art[0] : null,
        lang: g1(/<article\b[^>]*xml:lang="([^"]*)"/, m),
        collection: g1(/<pub-date[^>]*date-type="collection"[^>]*>\s*<year>([^<]*)</, m),
        pubDates: [...m.matchAll(/<pub-date\b([^>]*)>([\s\S]*?)<\/pub-date>/g)].map((d) => `${d[1].trim()} ${flat(d[2].replace(/<[^>]+>/g, ' '), 60)}`),
        title: g1(/<article-title[^>]*>([\s\S]*?)<\/article-title>/, m),
        emails: [...m.matchAll(/<email[^>]*>([^<]*)</g)].map((e) => e[1]),
        body: flat(g1(/<body[^>]*>([\s\S]*?)<\/body>/, m), 300),
        hasBody: /<body[\s>]/.test(m),
        back: flat(g1(/<back[^>]*>([\s\S]*?)<\/back>/, m), 300),
        len: m.length,
    };
}
const dcOf = (md, el) => [...String(md || '').matchAll(new RegExp(`<dc:${el}[^>]*>([^<]*)<`, 'g'))].map((m) => m[1]);
const marcField = (md, tag) => [...String(md || '').matchAll(new RegExp(`<(?:datafield|varfield)[^>]*(?:tag|id)="${tag}"[^>]*>([\\s\\S]*?)</(?:datafield|varfield)>`, 'g'))].map((m) => flat(m[1].replace(/<[^>]+>/g, ' '), 200));

forEachApp(async (app) => {
    const A = app.name;
    const isOJS = A === 'ojs', isOMP = A === 'omp', isOPS = A === 'ops';
    const S = !process.env.RESEED && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k5-facts', {[k]: v}, {merge: true}); log(`[${A} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const q = (sql) => psql(app, sql);
    const done = (k) => !process.env.REDO && S.done && S.done[k];
    const mark = (k) => { S.done = {...(S.done || {}), [k]: new Date().toISOString()}; save(); };
    const cu = (ctx, qs) => app.url(`/index.php/${ctx || 'index'}/oai${qs ? `?${qs}` : ''}`);
    const J = (ctx, p) => app.url(`/index.php/${ctx}${p}`);

    // ------------------------------------------------------------------ seed (no browser)
    if (on('seed') && !S.t) {
        const t = tag('u19k5');
        S.t = t; save();
        const mk = async (key, extra = {}, users = ['mg', 'au', 'rd']) => {
            const k = `${t}${key.toLowerCase()}`;
            const role = {mg: 'manager', ed: 'editor', se: 'sectionEditor', au: 'author', rd: 'reader'};
            const spec = {tag: k, users: users.filter((u) => !(isOPS && u === 'ed')).map((u) => ({username: `${k}${u}`, roles: [role[u]]})), ...extra,
                context: {name: `K5 ${key} ${t}`, ...(extra.context || {})}};
            const r = await app.api.createContext(spec);
            S[key] = {key, path: r.path || k, id: r.contextId, k, items: {}, u: Object.fromEntries(users.map((u) => [u, `${k}${u}`]))};
            save();
            return S[key];
        };
        const item = async (C, key, extra = {}) => {
            const spec = {context: C.path, submitter: C.u.au, tag: `${C.k}${key.toLowerCase()}`, title: `K5 ${C.key} ${key} ${t}`, published: true, ...extra};
            try {
                const r = await app.api.createSubmission(spec);
                C.items[key] = {id: r.submissionId, pub: r.publicationId, title: spec.title};
            } catch (e) { C.items[key] = {error: flat(e.message, 500)}; }
            save();
        };
        const pdf = [{label: 'PDF', file: 'article.pdf'}];
        if (isOJS) {
            await mk('W', {}, ['mg', 'ed', 'se', 'au', 'rd']);
            const Jj = await mk('J', {context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                issues: [{volume: 1, number: 1, year: 2024, published: true}]});
            await item(Jj, 'PA', {galleys: pdf, issue: {volume: 1, number: 1, year: 2024}});
            await item(Jj, 'PN', {galleys: pdf});
            await item(Jj, 'PF', {galleys: pdf, locale: 'fr_CA', title: `K5 J PF français ${t}`});
            await item(Jj, 'PX', {galleys: [{label: 'XML', file: 'article.xml'}]});
            await item(Jj, 'PJ', {galleys: pdf, jats: {file: 'article.xml'}});
            const Sj = await mk('S', {publishingMode: 'subscription',
                issues: [{volume: 1, number: 1, year: 2026, published: true}, {volume: 2, number: 1, year: 2026, published: true, accessStatus: 'open'},
                    {volume: 3, number: 1, year: 2026, published: true, openAccessDate: '2025-01-01'}],
                plugins: {oaimetadataformatplugin_jats: {enabled: true}, driverplugin: {enabled: true}}}, ['mg', 'se', 'au', 'rd']);
            await item(Sj, 'SB', {galleys: pdf, issue: {volume: 2, number: 1, year: 2026}});
            await item(Sj, 'SA', {galleys: pdf, issue: {volume: 1, number: 1, year: 2026}});
            await item(Sj, 'SO', {galleys: pdf, issue: {volume: 1, number: 1, year: 2026}, accessStatus: 'open'});
            await item(Sj, 'SE', {galleys: pdf, issue: {volume: 3, number: 1, year: 2026}});
            await item(Sj, 'SN', {galleys: pdf});
            const D = await mk('D', {issues: [{volume: 1, number: 1, year: 2026, published: true}]}, ['mg', 'se', 'au', 'rd']);
            await item(D, 'DA', {galleys: pdf, issue: {volume: 1, number: 1, year: 2026}});
            await item(D, 'DB', {issue: {volume: 1, number: 1, year: 2026}});
            await item(D, 'DU', {galleys: pdf, issue: {volume: 1, number: 1, year: 2026}});
            await item(D, 'DN', {galleys: pdf});
            const V = await mk('V', {enableDois: true, doiPrefix: '10.5555'});
            await item(V, 'VA', {galleys: pdf});
            const Cc = await mk('C', {enableDois: true, doiPrefix: '10.5556'});
            await item(Cc, 'CA', {galleys: pdf});
        } else {
            await mk(isOPS ? 'P' : 'M', {}, ['mg', 'se', 'au', 'rd']);
        }
        fact('seed', Object.fromEntries(Object.entries(S).filter(([k]) => k.length === 1 || k === 't')));
    }
    if (!S.t) { log('no state; run the seed phase'); return; }

    // ------------------------------------------------------------------ browsers: a signed-out harvester (V) and staff (page)
    const vis = await launch(app);
    const Vp = vis.page;
    const staff = await launch(app);
    const page = staff.page;
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url().replace(app.baseURL, '')});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const myCrashes = [];
    let who = null;
    const as = async (user, ctx) => {
        if (user === who) return;
        if (!user) { await signOut(page).catch(() => {}); who = null; return; }
        await signIn(page, user, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); who = user;
    };
    const snap = async (name, extra = {}, png = false) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        record(name, {...s, ...extra});
        if (png) await shot(page, name).catch(() => {});
        return s;
    };
    // a raw OAI answer: rc a request context (Vp.request signed out, page.request with the staff cookies)
    const raw = async (rc, url, label) => {
        let r = await rc.get(url, {maxRedirects: 0, failOnStatusCode: false}).catch((e) => ({err: flat(e.message, 200)}));
        if (r.err) return {status: null, err: r.err, records: [], sets: [], errors: [], formats: []};
        let hop = null;
        if (r.status() === 302 && /\/oai(\?|$)/.test(r.headers().location || '')) { hop = r.headers().location.replace(app.baseURL, ''); r = await rc.get(r.headers().location, {maxRedirects: 0, failOnStatusCode: false}); }
        const body = await r.text();
        const p = parseOai(body);
        p.status = r.status(); p.hop = hop;
        if (p.status >= 500) { myCrashes.push({label, url: url.replace(app.baseURL, ''), status: p.status, at: new Date().toISOString()}); p.body = flat(body, 300); }
        if (label) fs.writeFileSync(path.join(outDir(), `raw-${label}-${A}.xml`), body);
        return p;
    };
    const anon = (url, label) => raw(Vp.request, url, label);
    const brief = (p) => ({status: p.status, errors: p.errors, n: p.records.length, ids: p.records.map((r) => `${r.deleted ? 'DELETED ' : ''}${r.id} [${r.sets.join(',')}]`), sets: p.sets.length ? p.sets.map((s) => `${s.spec}=${s.name}`) : undefined, formats: p.formats.length ? p.formats : undefined, token: p.token || undefined, body: p.body});
    // the browser view of an address, signed out, recorded
    const view = async (url, name, pg = Vp) => {
        const resp = await pg.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(pg).catch(() => {});
        let s; try { s = await screen(pg); } catch (e) { s = {url: pg.url(), screenError: flat(e.message, 200)}; }
        const st = resp && typeof resp.status === 'function' ? resp.status() : resp && resp.err;
        record(name, {...s, status: st});
        return {status: st, text: s.text ? flat(s.text.main, 500) : null};
    };
    const sect = async (name, fn) => {
        log(`--- ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}-error`, flat(e.stack || e.message, 1500));
            try { await snap(`err-${name}`, {}, true); } catch (x) { /* none */ }
        }
    };
    const toasts = async () => (await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text, [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
    const statusText = async () => (await page.locator('[role="status"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 100)).filter(Boolean);
    const lmf = async (C) => (await anon(cu(C.path, 'verb=ListMetadataFormats'), null)).formats;
    const getRec = (C, id, pfx, label, rc) => raw(rc || Vp.request, cu(C.path, `verb=GetRecord&metadataPrefix=${pfx}&identifier=${encodeURIComponent(typeof id === 'number' ? REPO + id : id)}`), label);

    // ------------------------------------------------------------------ plugin grid helpers (Settings › Website › Plugins)
    const openPlugins = async (C) => {
        await page.goto(J(C.path, '/management/settings/website')); await idle(page).catch(() => {});
        await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T}); await sleep(500);
    };
    const row = (name) => page.locator('#pluginGridContainer tr.gridRow').filter({hasText: name}).first();
    const setPlugin = async (C, name, want, snapName) => {
        await openPlugins(C);
        const box = row(name).getByRole('checkbox').first();
        const was = await box.isChecked();
        if (was === want) return {was, unchanged: true};
        const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click({noWaitAfter: true}); await sleep(900);
        let ask = null;
        const dlg = page.locator('[role="dialog"]:visible').last();
        if (await dlg.count()) { ask = flat(await dlg.innerText().catch(() => ''), 300); const ok = dlg.getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click(); }
        const r = await w; await sleep(900); await idle(page).catch(() => {});
        const toast = await toasts();
        await snap(snapName, {}, true);
        return {was, ask, status: r && r.status(), now: await box.isChecked().catch(() => null), toast};
    };
    const rowActions = async (name) => {
        const exp = row(name).locator('a.show_extras').first();
        if (await exp.count()) { await exp.click(); await sleep(500); }
        return page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
    };
    const win = () => page.locator('[role="dialog"]:visible').last();
    const winState = async () => win().evaluate((root) => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {title: t(root.querySelector('h1, h2, .pkp_modal_title, [id$="-title"]')), all: t(root),
            headings: [...root.querySelectorAll('h1,h2,h3,h4,legend,.label')].map(t).filter(Boolean),
            boxes: [...root.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, checked: i.checked, required: i.required || i.getAttribute('aria-required'), label: t(root.querySelector(`label[for="${i.id}"]`) || i.closest('label'))})),
            buttons: [...root.querySelectorAll('button, a.cancelButton, a[role=button], input[type=submit]')].map((b) => t(b) || b.value || b.getAttribute('aria-label')).filter(Boolean),
            asterisks: [...root.querySelectorAll('.req, .required, abbr')].map(t)};
    }).catch((e) => ({err: flat(e.message, 200)}));
    const openJatsWindow = async (C, name) => {
        await openPlugins(C);
        const acts = await rowActions('JATS Metadata Format');
        const st = page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link', {name: 'Settings', exact: true}).first();
        if (!(await st.count())) return {acts, opened: false};
        await st.click();
        await win().locator('input[name="forceJatsTemplate"]').waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(400);
        const s = await snap(name, {}, true);
        return {acts, opened: true, ...(await winState()), dialogText: flat(s.text.dialog, 800)};
    };
    const jatsStored = (C) => q(`select setting_name||'='||setting_value from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${C.id} order by 1`);

    // ------------------------------------------------------------------ the workflow (from U19 K3's helpers)
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const wfUrl = (C, sid, key) => app.url(`/index.php/${C.path}/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    async function openEntry(C, it, pub) {
        await page.goto(wfUrl(C, it.id, `publication_${pub || it.pub}_titleAbstract`)); await idle(page); await sleep(800);
        const t0 = Date.now();
        while (Date.now() - t0 < 20_000 && !(await wf().getByRole('button', {name: /^(Save|Add Contributor)$/}).count())) await sleep(250);
        await idle(page); await sleep(300);
    }
    const fillVersion = async (scope, stage = 'VoR', minor = 'false') => {
        for (const [sel, val] of [['select[name="versionStage"]', stage], ['select[name="versionIsMinor"]', minor]]) {
            const el = scope.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
    };
    async function publishNow(C, it, pub, name) {
        const o = {};
        await openEntry(C, it, pub);
        const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
        await button.waitFor({state: 'visible', timeout: T});
        await sleep(800);
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
        const which = () => Promise.race([panel.locator('select[name="versionStage"], input[name="assignment"]').first().waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm')]).catch(() => null);
        let opened = await which();
        if (!opened) { await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
        o.opened = opened;
        if (opened === 'panel') {
            await fillVersion(panel);
            const dontAssign = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
            if (await dontAssign.waitFor({state: 'visible', timeout: 5_000}).then(() => true).catch(() => false)) await dontAssign.check();
            o.panel = flat(await panel.innerText().catch(() => ''), 1200);
            await snap(`${name}-panel`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        o.confirm = flat(await confirm.innerText().catch(() => ''), 400);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await w;
        o.status = r ? r.status() : null;
        await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page);
        await snap(name, {publish: o});
        return o;
    }
    async function newVersion(C, it, pub, name) {
        await openEntry(C, it, pub);
        const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T});
        await sleep(1500);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(800);
        await w.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
        await w.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
        await snap(`${name}-window`);
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let id = null; try { id = (await resp.json()).id; } catch (e) { /* none */ }
        await idle(page); await sleep(1000);
        await snap(name);
        return {status: resp ? resp.status() : null, pub: id};
    }
    async function unpublish(C, it, pub, name) {
        await openEntry(C, it, pub);
        const b = page.getByRole('button', {name: 'Unpublish', exact: true}).first();
        await b.waitFor({state: 'visible', timeout: T});
        await b.click();
        const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
        await d.waitFor({state: 'visible', timeout: T});
        const txt = flat(await d.innerText().catch(() => ''), 400);
        const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        const r = await w;
        let body = null; if (r && r.status() >= 400) body = flat(await r.text().catch(() => ''), 400);
        await idle(page); await sleep(1500);
        const s = await snap(name, {}, true);
        return {dialog: txt, status: r ? r.status() : null, body, toasts: await toasts(),
            after: flat(s.text.dialog, 600), buttons: await wf().getByRole('button').allInnerTexts().then((a) => a.map((x) => flat(x, 40)).filter(Boolean)).catch(() => [])};
    }
    const pubState = (sid) => q(`select publication_id||':'||status||':'||coalesce(version_stage,'')||':'||coalesce(version_major::text,'')||'.'||coalesce(version_minor::text,'')||':'||coalesce(issue_id::text,'-') from publications where submission_id=${sid} order by publication_id`);
    const tombs = (sid) => q(`select tombstone_id||':'||oai_identifier||':'||set_spec from data_object_tombstones where data_object_id=${sid} order by 1`);
    const versioningJournals = () => q("select j.path from journal_settings s join journals j on j.journal_id=s.journal_id where s.setting_name='doiVersioning' and s.setting_value='1' and exists (select 1 from journal_settings e where e.journal_id=s.journal_id and e.setting_name='enableDois' and e.setting_value='1') order by 1");

    // the DOIs › Setup tab
    const openDoiSetup = async (C) => {
        await page.goto(J(C.path, '/management/settings/distribution')); await idle(page);
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click(); await idle(page);
        let panel = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        const setupTab = panel.getByRole('tab', {name: 'Setup', exact: true});
        if (await setupTab.count()) { await setupTab.click(); await idle(page); panel = panel.getByRole('tabpanel', {name: 'Setup', exact: true}); }
        await sleep(500);
        return panel;
    };
    const doiState = async (panel) => ({
        enable: await panel.getByRole('checkbox', {name: /Allow Digital Object Identifiers/}).isChecked().catch(() => null),
        enableLabel: await panel.getByRole('checkbox', {name: /Allow Digital Object Identifiers/}).evaluate((e) => (e.closest('label') || {}).innerText).catch(() => null),
        yes: await panel.getByRole('radio', {name: YES}).isChecked().catch(() => null),
        no: await panel.getByRole('radio', {name: NO}).isChecked().catch(() => null),
        versioningVisible: await panel.getByRole('radio', {name: NO}).isVisible().catch(() => null),
        prefix: await panel.getByRole('textbox', {name: 'DOI Prefix'}).inputValue().catch(() => null),
        radios: await panel.locator('input[type="radio"]').evaluateAll((rs) => rs.filter((x) => x.offsetParent !== null).map((x) => `${x.name}=${x.value}${x.checked ? '*' : ''} ${((x.closest('label') || {}).innerText || '').trim().slice(0, 70)}`)).catch(() => []),
    });
    const setVersioning = async (C, yes, name) => {
        const panel = await openDoiSetup(C);
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        const before = await doiState(panel);
        await snap(`${name}-before`);
        await panel.getByRole('radio', {name: yes ? YES : NO}).check();
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        const o = {before, status: r ? r.status() : null, saved: await statusText(), at: new Date().toISOString()};
        await snap(`${name}-after`, {save: o});
        return o;
    };

    try {
        // ============================================================ oai: "Enable OAI" on a new context (q6)
        if (on('oai') && !done('oai')) await sect('oai', async () => {
            const o = {};
            const C = isOJS ? S.W : isOPS ? S.P : S.M;
            await as(C.u.mg, C.path);
            await page.goto(J(C.path, '/management/settings/distribution')); await idle(page);
            o.tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
            const acc = page.locator('#access-button').first();
            await snap('oai-01-distribution', {tabs: o.tabs}, true);
            if (!(await acc.count())) {
                // OMP: no "Access" tab; sweep every Settings page for "Enable OAI"
                o.access = false;
                o.hits = {};
                for (const p of ['context', 'website', 'workflow', 'distribution', 'access']) {
                    await page.goto(J(C.path, `/management/settings/${p}`)); await idle(page);
                    const tabs = await page.locator('[role="tab"]').allTextContents().then((a) => a.map((x) => flat(x, 40))).catch(() => []);
                    const text = await page.evaluate(() => document.body.textContent).catch(() => '');
                    o.hits[p] = {tabs, enableOai: /Enable OAI|Open Archives/i.test(text), inputs: await page.locator('input[name="enableOai"]').count()};
                    await snap(`oai-02-${p}`);
                }
                fact('oai', o); mark('oai'); return;
            }
            await acc.click(); await idle(page);
            await page.locator('input[name="enableOai"]').first().waitFor({timeout: T});
            await sleep(400);
            const tab = page.getByRole('tabpanel', {name: 'Access'}).first();
            const readTab = async () => ({
                radios: await page.locator('input[type="radio"]').evaluateAll((rs) => rs.filter((x) => x.offsetParent !== null).map((x) => `${x.name}=${x.value}${x.checked ? '*' : ''} ${((x.closest('label') || {}).innerText || '').trim().slice(0, 90)}`)),
                selects: await page.locator('select').evaluateAll((ss) => ss.filter((x) => x.offsetParent !== null).map((x) => `${x.name}=${x.value}`)),
                text: flat(await tab.innerText().catch(() => ''), 1500),
                oaiLink: await page.locator('a[href*="openarchives"]').evaluateAll((as_) => as_.map((a) => `${a.innerText.trim()} -> ${a.href}`)),
            });
            o.before = await readTab();
            await snap('oai-03-access-tab', {tab: o.before}, true);
            await loc(page, 'Distribution › Access: the "Disable" radio of "Enable OAI"', page.locator('input[name="enableOai"][value="false"]'));
            await page.locator('input[name="enableOai"][value="false"]').check();
            let post = null;
            const lis = (r) => { if (/\/api\/v1\/contexts\/\d+/.test(r.url()) && r.method() !== 'GET') post = r.postData(); };
            page.on('request', lis);
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await tab.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
            page.off('request', lis);
            o.save = {status: r ? r.status() : null, post: flat(post, 300), status_: await statusText(), bar: await toasts()};
            await snap('oai-04-saved', {save: o.save}, true);
            await page.reload(); await idle(page);
            await page.locator('#access-button').first().click(); await idle(page);
            await page.locator('input[name="enableOai"]').first().waitFor({timeout: T}); await sleep(300);
            o.reopened = await readTab();
            await snap('oai-05-reopened', {tab: o.reopened});
            const tbl = isOJS ? 'journal_settings' : 'server_settings', col = isOJS ? 'journal_id' : 'server_id';
            o.stored = q(`select setting_name||'='||setting_value from ${tbl} where ${col}=${C.id} and setting_name in ('enableOai','publishingMode','delayedOpenAccessDuration') order by 1`);
            // the context's own ListRecords with "Disable", then "Enable" again (restores)
            o.withDisable = brief(await anon(cu(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null));
            // leave the tab with a change unsaved: choose "Enable", go to another tab, come back
            await page.locator('input[name="enableOai"][value="true"]').check();
            await page.getByRole('tab').filter({hasText: /^(Archiving|DOIs|Payments|Statistics|Permissions)/}).first().click().catch(() => {});
            await sleep(500); await page.locator('#access-button').first().click(); await sleep(500);
            o.leftUnsavedTabSwitch = (await readTab()).radios.filter((x) => x.startsWith('enableOai'));
            await page.goto(J(C.path, '/management/settings/website')); await idle(page);
            await page.goto(J(C.path, '/management/settings/distribution')); await idle(page);
            await page.locator('#access-button').first().click(); await idle(page); await sleep(400);
            o.leftUnsavedPage = (await readTab()).radios.filter((x) => x.startsWith('enableOai'));
            o.dialogs = dialogs.slice();
            // restore "Enable" on screen
            await page.locator('input[name="enableOai"][value="true"]').check();
            const w2 = page.waitForResponse((r2) => /\/api\/v1\/contexts\/\d+/.test(r2.url()) && r2.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await tab.getByRole('button', {name: 'Save', exact: true}).click();
            o.restore = (await w2 || {status: () => null}).status();
            o.storedAfter = q(`select setting_name||'='||setting_value from ${tbl} where ${col}=${C.id} and setting_name='enableOai'`);
            // the section editor (moderator) at the same address
            await as(C.u.se, C.path);
            const st = await page.goto(J(C.path, '/management/settings/distribution')).then((x) => x && x.status()).catch(() => null);
            await idle(page).catch(() => {});
            const s = await snap('oai-06-se-distribution', {status: st});
            o.se = {status: st, url: page.url().replace(app.baseURL, ''), text: flat(s.text && s.text.main, 200), access: await page.locator('#access-button').count()};
            fact('oai', o); mark('oai');
        });

        // ============================================================ win: the JATS row and window on a new journal (q3)
        if (on('win') && isOJS && !done('win')) await sect('win', async () => {
            const o = {};
            const C = S.W;
            await as(C.u.mg, C.path);
            await openPlugins(C);
            o.rowText = flat(await row('JATS Metadata Format').innerText().catch(() => ''), 300);
            o.boxOff = {checked: await row('JATS Metadata Format').getByRole('checkbox').first().isChecked(), disabled: await row('JATS Metadata Format').getByRole('checkbox').first().isDisabled()};
            o.actionsOff = await rowActions('JATS Metadata Format');
            await snap('w-01-row-off', {}, true);
            o.lmfOff = await lmf(C);
            o.tick = await setPlugin(C, 'JATS Metadata Format', true, 'w-02-ticked');
            o.lmfOn = await lmf(C);
            await openPlugins(C);
            o.actionsOn = await rowActions('JATS Metadata Format');
            await snap('w-03-row-actions-on', {}, true);
            o.win1 = await openJatsWindow(C, 'w-04-window');
            // tick, OK
            await win().locator('input[name="forceJatsTemplate"]').check();
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
            await win().getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            const seen = await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text, [role="alert"], [role="status"]').filter({hasText: /saved/i}).first().innerText({timeout: 8000}).catch(() => null);
            o.ok = {status: r && r.status(), seen: flat(seen, 200), toasts: await toasts(), openAfter: await page.locator('[role="dialog"]:visible').count()};
            await snap('w-05-after-ok', {ok: o.ok}, true);
            o.storedAfterOk = jatsStored(C);
            o.win2 = await openJatsWindow(C, 'w-06-reopened');
            // untick and Cancel
            await win().locator('input[name="forceJatsTemplate"]').uncheck();
            const cancel = win().getByRole('link', {name: 'Cancel', exact: true}).or(win().getByRole('button', {name: 'Cancel', exact: true})).first();
            await loc(page, 'the "JATS Metadata Format" window: "Cancel"', cancel);
            await cancel.click(); await sleep(800);
            o.cancel = {openAfter: await page.locator('[role="dialog"]:visible').count(), dialogs: dialogs.slice(-2), toasts: await toasts()};
            await snap('w-07-after-cancel', {cancel: o.cancel});
            o.storedAfterCancel = jatsStored(C);
            o.win3 = await openJatsWindow(C, 'w-08-reopened-after-cancel');
            // the window's own close control with a change unsaved
            await win().locator('input[name="forceJatsTemplate"]').uncheck();
            const closeBtn = win().getByRole('button', {name: /Close/}).first();
            o.closeControl = await closeBtn.count();
            const nd = dialogs.length;
            if (o.closeControl) { await closeBtn.click(); await sleep(800); }
            o.close = {openAfter: await page.locator('[role="dialog"]:visible').count(), dialogs: dialogs.slice(nd), stored: jatsStored(C)};
            await snap('w-09-after-close', {close: o.close});
            // untick the plugin: is "Settings" still offered?
            o.untick = await setPlugin(C, 'JATS Metadata Format', false, 'w-10-unticked');
            await openPlugins(C);
            o.actionsAfterUntick = await rowActions('JATS Metadata Format');
            o.lmfAfterUntick = await lmf(C);
            o.storedAfterUntick = jatsStored(C);
            await snap('w-11-row-after-untick', {}, true);
            // the other levels: the editor (manager-level) and the section editor at the Plugins tab
            o.levels = {};
            for (const lv of ['ed', 'se']) {
                await as(C.u[lv], C.path);
                const st = await page.goto(J(C.path, '/management/settings/website')).then((x) => x && x.status()).catch(() => null);
                await idle(page).catch(() => {});
                const hasTab = await page.locator('#plugins-button').count();
                let acts = null;
                if (hasTab) { await page.locator('#plugins-button').first().click(); await idle(page); await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T}).catch(() => {}); acts = {box: await row('JATS Metadata Format').getByRole('checkbox').first().isDisabled().catch(() => null)}; }
                const s = await snap(`w-12-${lv}-website`, {status: st});
                o.levels[lv] = {status: st, url: page.url().replace(app.baseURL, ''), pluginsTab: hasTab, acts, text: flat(s.text && s.text.main, 160)};
            }
            fact('win', o); mark('win');
        });

        // ============================================================ dois: a new journal's DOIs tab (Settings bullet 6)
        if (on('dois') && isOJS && !done('dois')) await sect('dois', async () => {
            const o = {};
            const C = S.W;
            await as(C.u.mg, C.path);
            const panel = await openDoiSetup(C);
            o.tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
            o.state = await doiState(panel);
            o.text = flat(await panel.innerText().catch(() => ''), 1500);
            await snap('d-01-dois-setup-new-journal', {state: o.state}, true);
            o.stored = q(`select setting_name||'='||setting_value from journal_settings where journal_id=${C.id} and setting_name in ('enableDois','doiVersioning','doiPrefix','enabledDoiTypes') order by 1`);
            o.pkStored = q("select setting_name||'='||setting_value from journal_settings s join journals j using (journal_id) where j.path='publicknowledge' and setting_name in ('enableDois','doiVersioning','doiPrefix') order by 1");
            // a published article of a journal with DOIs on and no prefix (J): does the record carry a DOI?
            const Jj = S.J;
            o.jStored = q(`select setting_name||'='||setting_value from journal_settings where journal_id=${Jj.id} and setting_name in ('enableDois','doiPrefix') order by 1`);
            const g = await getRec(Jj, Jj.items.PN.id, 'oai_dc', 'd-J-PN-dc');
            o.jDc = {status: g.status, identifier: dcOf(g.records[0] && g.records[0].md, 'identifier')};
            // C: DOIs on with a prefix, versioning "No"
            const gc = await getRec(S.C, S.C.items.CA.id, 'oai_dc', 'd-C-CA-dc');
            o.cDc = {status: gc.status, identifier: dcOf(gc.records[0] && gc.records[0].md, 'identifier'), relation: dcOf(gc.records[0] && gc.records[0].md, 'relation')};
            const gm = await getRec(S.C, S.C.items.CA.id, 'marcxml', 'd-C-CA-marcxml');
            o.cMarc024 = marcField(gm.records[0] && gm.records[0].md, '024');
            const go = await getRec(S.C, S.C.items.CA.id, 'oai_marc', 'd-C-CA-oai_marc');
            o.cOaiMarc024 = marcField(go.records[0] && go.records[0].md, '024');
            o.cDoi = q(`select d.doi from dois d join publications p on p.doi_id=d.doi_id where p.submission_id=${S.C.items.CA.id}`);
            fact('dois', o); mark('dois');
        });

        // ============================================================ jats: Rules 21, 21b, 22 and the record (q5 steps 1–4)
        if (on('jats') && isOJS && !done('jats')) await sect('jats', async () => {
            const o = {};
            const C = S.J, it = C.items;
            await as(C.u.mg, C.path);
            // (1) unticked
            o.off = {lmf: await lmf(C), get: brief(await getRec(C, it.PN.id, 'jats', 'j-off-get')), recs: brief(await anon(cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), null))};
            o.offView = await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.PN.id)}`), 'j-01-off-get-view');
            o.tick = await setPlugin(C, 'JATS Metadata Format', true, 'j-02-ticked');
            o.on = {lmf: await lmf(C), lmfId: (await anon(cu(C.path, `verb=ListMetadataFormats&identifier=${encodeURIComponent(REPO + it.PN.id)}`), null)).formats};
            // (2) PDF galley: in an issue of 2024, no issue, French
            o.rec = {};
            for (const k of ['PA', 'PN', 'PF', 'PX', 'PJ']) {
                const g = await getRec(C, it[k].id, 'jats', `j-${k}`);
                o.rec[k] = {status: g.status, errors: g.errors, hop: g.hop, ...jatsFacts(g.records[0] && g.records[0].md)};
            }
            o.recView = await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.PA.id)}`), 'j-03-PA-view');
            await shot(Vp, 'j-03-PA-view').catch(() => {});
            // the same record read in the manager's browser (signed in)
            const gm = await getRec(C, it.PA.id, 'jats', 'j-PA-manager', page.request);
            o.recManager = {status: gm.status, errors: gm.errors, ...jatsFacts(gm.records[0] && gm.records[0].md)};
            await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.PA.id)}`), 'j-04-PA-manager-view', page);
            o.pub = q(`select submission_id||':'||p.date_published||':'||coalesce(i.year::text,'-')||':'||coalesce(i.show_year::text,'-')||':'||s.locale from publications p join submissions s using (submission_id) left join issues i on i.issue_id=p.issue_id where s.context_id=${C.id} order by 1`);
            o.emails = q(`select a.email from authors a join publications p using (publication_id) where p.submission_id=${it.PA.id}`);
            o.recs = brief(await anon(cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), 'j-list'));
            // (3) "Ignore uploaded JATS XML documents" ticked on screen
            const w1 = await openJatsWindow(C, 'j-05-window');
            await win().locator('input[name="forceJatsTemplate"]').check();
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
            await win().getByRole('button', {name: 'OK', exact: true}).click();
            o.forceSave = {status: ((await w) || {status: () => null}).status(), stored: jatsStored(C), boxBefore: w1.boxes};
            o.forced = {};
            for (const k of ['PX', 'PJ', 'PN']) {
                const g = await getRec(C, it[k].id, 'jats', `j-${k}-forced`);
                o.forced[k] = {status: g.status, errors: g.errors, ...jatsFacts(g.records[0] && g.records[0].md)};
            }
            // unticked again
            await openJatsWindow(C, 'j-06-window-2');
            await win().locator('input[name="forceJatsTemplate"]').uncheck();
            const w2 = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
            await win().getByRole('button', {name: 'OK', exact: true}).click(); await w2;
            o.unforcedStored = jatsStored(C);
            const gx = await getRec(C, it.PX.id, 'jats', 'j-PX-unforced');
            o.unforcedPX = jatsFacts(gx.records[0] && gx.records[0].md);
            // (4) "JATS Template Plugin" disabled on screen
            o.tplOff = await setPlugin(C, 'JATS Template Plugin', false, 'j-07-template-off');
            o.tpl = {lmf: await lmf(C)};
            for (const k of ['PN', 'PX']) o.tpl[k] = brief(await getRec(C, it[k].id, 'jats', `j-${k}-tploff`));
            o.tpl.recs = brief(await anon(cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), null));
            o.tpl.dc = brief(await getRec(C, it.PN.id, 'oai_dc', null));
            o.tplView = await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.PX.id)}`), 'j-08-tploff-view');
            o.tplOn = await setPlugin(C, 'JATS Template Plugin', true, 'j-09-template-on');
            o.afterTplOn = brief(await getRec(C, it.PN.id, 'jats', null));
            // (1b) unticked again: jats gone
            o.untick = await setPlugin(C, 'JATS Metadata Format', false, 'j-10-unticked');
            o.afterUntick = {lmf: await lmf(C), get: brief(await getRec(C, it.PN.id, 'jats', null))};
            fact('jats', o); mark('jats');
        });

        // ============================================================ sub: 21a and A10 (q5 step 5)
        if (on('sub') && isOJS && !done('sub')) await sect('sub', async () => {
            const o = {};
            const C = S.S, it = C.items;
            o.db = {issues: q(`select issue_id||':v'||volume||':'||access_status||':'||coalesce(open_access_date::text,'-')||':'||published from issues where journal_id=${C.id} order by 1`),
                pubs: q(`select p.submission_id||':'||coalesce(p.issue_id::text,'-')||':'||coalesce(p.access_status::text,'-') from publications p join submissions s using (submission_id) where s.context_id=${C.id} order by 1`),
                mode: q(`select setting_value from journal_settings where journal_id=${C.id} and setting_name='publishingMode'`)};
            o.anon = {};
            for (const k of ['SB', 'SA', 'SO', 'SE', 'SN']) {
                const g = await getRec(C, it[k].id, 'jats', `s-${k}`);
                o.anon[k] = {status: g.status, errors: g.errors, rec: g.records.length, emails: jatsFacts(g.records[0] && g.records[0].md).emails};
            }
            o.anonList = brief(await anon(cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), 's-list'));
            o.anonIds = brief(await anon(cu(C.path, 'verb=ListIdentifiers&metadataPrefix=jats'), null));
            o.anonDcList = brief(await anon(cu(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'), null));
            o.listView = await view(cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), 's-01-list-view');
            await shot(Vp, 's-01-list-view').catch(() => {});
            o.getView = await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.SA.id)}`), 's-02-SA-view');
            // one axis end each: the journal's reader, the section editor and the manager signed in
            o.signedIn = {};
            for (const lv of ['rd', 'se', 'mg']) {
                await as(C.u[lv], C.path);
                const g = await getRec(C, it.SA.id, 'jats', `s-SA-${lv}`, page.request);
                const l = await raw(page.request, cu(C.path, 'verb=ListRecords&metadataPrefix=jats'), `s-list-${lv}`);
                o.signedIn[lv] = {get: {status: g.status, errors: g.errors, rec: g.records.length, emails: jatsFacts(g.records[0] && g.records[0].md).emails}, list: brief(l)};
                await view(cu(C.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + it.SA.id)}`), `s-03-SA-${lv}-view`, page);
            }
            fact('sub', o); mark('sub');
        });

        // ============================================================ driver: Rule 23 (q21)
        if (on('driver') && isOJS && !done('driver')) await sect('driver', async () => {
            const o = {};
            const D = S.D, it = D.items;
            const dset = async (C, rc = Vp.request, label = null) => brief(await raw(rc, cu(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'), label));
            o.before = {sets: brief(await anon(cu(D.path, 'verb=ListSets'), null)).sets, driver: await dset(D)};
            await as(D.u.mg, D.path);
            await openPlugins(D);
            o.rowText = flat(await row('DRIVER').innerText().catch(() => ''), 300);
            o.tick = await setPlugin(D, 'DRIVER', true, 'dr-01-driver-ticked');
            await openPlugins(D);
            o.actions = await rowActions('DRIVER');
            o.sets = brief(await anon(cu(D.path, 'verb=ListSets'), 'dr-sets')).sets;
            o.setsView = await view(cu(D.path, 'verb=ListSets'), 'dr-02-sets-view');
            o.recs = brief(await anon(cu(D.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'dr-recs'));
            o.driver = await dset(D, Vp.request, 'dr-set');
            o.driverRecs = brief(await anon(cu(D.path, 'verb=ListRecords&metadataPrefix=oai_dc&set=driver'), null));
            o.driverView = await view(cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'), 'dr-03-set-view');
            o.galleys = q(`select p.submission_id||':'||count(g.galley_id) from publications p join submissions s using (submission_id) left join publication_galleys g on g.publication_id=p.publication_id where s.context_id=${D.id} group by p.submission_id order by 1`);
            // Unpublish DU (in an issue, a member) on screen: its deleted record in set=driver
            o.unpubDU = await unpublish(D, it.DU, null, 'dr-04-DU-unpublished');
            o.afterDU = {driver: await dset(D), all: brief(await anon(cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null)), tomb: tombs(it.DU.id),
                tombSets: q(`select t.tombstone_id||':'||ts.setting_name||'='||ts.setting_value from data_object_tombstones t join data_object_tombstone_settings ts using (tombstone_id) where t.data_object_id=${it.DU.id}`)};
            // "View Article Content": "Users must be registered and log in to view open access content." ticked on screen
            const siteBox = async (name, want, label) => {
                await page.goto(J(D.path, '/management/settings/access')); await idle(page);
                await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click().catch(() => {}); await idle(page); await sleep(400);
                const box = page.locator(`input[type="checkbox"][name="${name}"]`).first();
                const lbl = await box.evaluate((x) => ((x.closest('label') || x.parentElement || {}).innerText || '').trim()).catch(() => null);
                if (want) await box.check(); else await box.uncheck();
                const form = page.locator('form').filter({has: box}).first();
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
                await snap(label, {}, true);
                return {label: lbl, status: r ? r.status() : null};
            };
            o.tickArticle = await siteBox('restrictArticleAccess', true, 'dr-05-article-ticked');
            o.afterArticle = {driver: await dset(D), recs: brief(await anon(cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null))};
            o.untickArticle = await siteBox('restrictArticleAccess', false, 'dr-06-article-unticked');
            o.afterUntick = await dset(D);
            // S (subscription, DRIVER seeded on): which records are members
            const Sj = S.S;
            o.S = {driver: await dset(Sj), all: brief(await anon(cu(Sj.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null)), items: Object.fromEntries(Object.entries(Sj.items).map(([k, v]) => [k, v.id]))};
            // exclusivity control: OMP / OPS answer for set=driver is read in the oai phase's apps (not here)
            fact('driver', o); mark('driver');
        });

        // ============================================================ a11: Unpublish an article in no issue with DRIVER on (q21 last step)
        if (on('a11') && isOJS && !done('a11')) await sect('a11', async () => {
            const o = {};
            const D = S.D, it = D.items;
            await as(D.u.mg, D.path);
            o.driverOn = q(`select setting_value from plugin_settings where plugin_name='driverplugin' and context_id=${D.id} and setting_name='enabled'`);
            o.before = {pub: pubState(it.DN.id), rec: brief(await getRec(D, it.DN.id, 'oai_dc', null))};
            await openEntry(D, it.DN);
            o.issueLine = flat((await wf().innerText().catch(() => '')).split('\n').filter((l) => /issue|Issue|Published|Status/.test(l)).join(' | '), 400);
            await snap('a11-01-DN-before', {}, true);
            o.unpub = await unpublish(D, it.DN, null, 'a11-02-DN-after-unpublish');
            o.after = {pub: pubState(it.DN.id), tomb: tombs(it.DN.id), rec: brief(await getRec(D, it.DN.id, 'oai_dc', null))};
            await openEntry(D, it.DN);
            const s = await snap('a11-03-DN-reloaded', {}, true);
            o.reloaded = {buttons: await wf().getByRole('button').allInnerTexts().then((a) => a.map((x) => flat(x, 40)).filter(Boolean)).catch(() => []), text: flat(s.text.dialog, 400)};
            // the article page, signed out
            o.articlePage = await view(J(D.path, `/article/view/${it.DN.id}`), 'a11-04-article-page');
            // the other end: DRIVER off, the same unpublish (DN2 would be needed; DN re-read after untick)
            o.untick = await setPlugin(D, 'DRIVER', false, 'a11-05-driver-off');
            o.unpubOff = await unpublish(D, it.DN, null, 'a11-06-DN-unpublish-driver-off');
            o.afterOff = {pub: pubState(it.DN.id), tomb: tombs(it.DN.id)};
            o.retick = await setPlugin(D, 'DRIVER', true, 'a11-07-driver-on-again');
            fact('a11', o); mark('a11');
        });

        // ============================================================ versions: Rule 20 (q20)
        if (on('versions') && isOJS && !done('versions')) await sect('versions', async () => {
            const o = S.ver || {};
            const V = S.V, Cc = S.C;
            const read = async (label) => {
                const r = {versioning: versioningJournals()};
                r.vIds = brief(await anon(cu(V.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), `v-${label}-V-ids`));
                r.vGet = brief(await getRec(V, V.items.VA.id, 'oai_dc', `v-${label}-V-get`));
                r.vGetVer = brief(await getRec(V, `${REPO}${V.items.VA.id}/version/VoR/1`, 'oai_dc', `v-${label}-V-getver`));
                r.vSets = brief(await anon(cu(V.path, 'verb=ListSets'), null)).status;
                r.cIds = brief(await anon(cu(Cc.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null));
                r.view = await view(cu(V.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), `v-${label}-view`);
                return r;
            };
            await as(Cc.u.mg, Cc.path);
            // the control journal C (no versioning): a second major version published on screen
            if (!o.c2) { o.c2 = await newVersion(Cc, Cc.items.CA, null, 'v-01-C-new-version'); S.ver = o; save(); }
            if (o.c2.pub && !o.c2pub) { o.c2pub = await publishNow(Cc, Cc.items.CA, o.c2.pub, 'v-02-C-publish-v2'); S.ver = o; save(); }
            o.cPubs = pubState(Cc.items.CA.id);
            o.cDois = q(`select p.publication_id||':'||coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${Cc.items.CA.id} order by 1`);
            const cr = await getRec(Cc, Cc.items.CA.id, 'oai_dc', 'v-C-dc');
            o.cList = brief(await anon(cu(Cc.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null));
            o.cRec = {status: cr.status, relation: dcOf(cr.records[0] && cr.records[0].md, 'relation'), identifier: dcOf(cr.records[0] && cr.records[0].md, 'identifier')};
            const cm = await getRec(Cc, Cc.items.CA.id, 'marcxml', 'v-C-marcxml');
            o.cMarc = {'024': marcField(cm.records[0] && cm.records[0].md, '024'), 780: marcField(cm.records[0] && cm.records[0].md, '780')};
            o.cGetVer = brief(await getRec(Cc, `${REPO}${Cc.items.CA.id}/version/VoR/1`, 'oai_dc', null));
            // V: versioning "Yes" on screen, a second version published, read, the new version unpublished, read, "No"
            o.r0 = await read('0-before');
            await as(V.u.mg, V.path);
            o.on = await setVersioning(V, true, 'v-03-V-yes');
            try {
                o.r1 = await read('1-on');
                if (!o.v2) { o.v2 = await newVersion(V, V.items.VA, null, 'v-04-V-new-version'); S.ver = o; save(); }
                if (o.v2.pub) o.v2pub = await publishNow(V, V.items.VA, o.v2.pub, 'v-05-V-publish-v2');
                o.vPubsOn = pubState(V.items.VA.id);
                o.vDois = q(`select p.publication_id||':'||coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${V.items.VA.id} order by 1`);
                o.r2 = await read('2-two-versions');
                if (o.v2.pub) o.unpubV2 = await unpublish(V, V.items.VA, o.v2.pub, 'v-06-V-unpublish-v2');
                o.vPubsUnpub = pubState(V.items.VA.id);
                o.tombsOn = tombs(V.items.VA.id);
                o.r3 = await read('3-v2-unpublished');
                // publish v2 again, unpublish v1 is not offered once v2 is current; keep v2 published for the off read
                if (o.v2.pub) o.v2repub = await publishNow(V, V.items.VA, o.v2.pub, 'v-07-V-republish-v2');
                o.tombsRepub = tombs(V.items.VA.id);
            } finally {
                await as(V.u.mg, V.path);
                o.off = await setVersioning(V, false, 'v-08-V-no');
                o.afterOffVersioning = versioningJournals();
            }
            o.r4 = await read('4-off');
            o.vRecOff = (() => null)();
            const vr = await getRec(V, V.items.VA.id, 'oai_dc', 'v-V-dc-off');
            o.vRecOff = {status: vr.status, relation: dcOf(vr.records[0] && vr.records[0].md, 'relation'), identifier: dcOf(vr.records[0] && vr.records[0].md, 'identifier')};
            const vm = await getRec(V, V.items.VA.id, 'marcxml', 'v-V-marcxml-off');
            o.vMarcOff = {'024': marcField(vm.records[0] && vm.records[0].md, '024'), 780: marcField(vm.records[0] && vm.records[0].md, '780')};
            o.tombsOff = tombs(V.items.VA.id);
            o.crashes = myCrashes.slice();
            S.ver = o; save();
            fact('versions', o); mark('versions');
        });

        // ============================================================ restore: versioning "No" on every K5 journal
        if (on('restore') && isOJS) await sect('restore', async () => {
            const mine = versioningJournals().split('\n').filter((p) => p && p.startsWith(S.t));
            const o = {found: mine};
            for (const p of mine) {
                const C = Object.values(S).find((c) => c && c.path === p);
                await as(C.u.mg, C.path);
                o[p] = await setVersioning(C, false, `r-${C.key}-no`);
            }
            o.after = versioningJournals();
            o.siteIds = brief(await anon(cu(null, 'verb=Identify'), null)).status;
            fact('restore', o);
        });
    } finally {
        record('k5-crashes', {mine: myCrashes, dialogs}, {merge: true});
        await vis.close(); await staff.close();
    }
});
