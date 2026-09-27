const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk K4: the site and the switches.
// Spec: docs/specs/U19-oai-pmh.md — Rules 16–18 (362–387), Rule 24 (430–436, declared: the configuration file),
// Side effects (437–448), Settings bullets 1 and 7–10 (449–454, 477–499), Cross-feature interactions (523–555),
// Canonical preamble and Coverage (556–620), Findings register heading and summary (621–648), A9 (728–739),
// OMP2 (777–785), Reference tables (1024–end); footnotes b, e, f, h, i, n, o, s, t, q1, q17, q18, f-a9, f-omp2.
//
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK4 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U19/K4/k4.js
//   PHASES=seed,defaults,... (default: all, in the order below). State in k4-state-<app>.json under the output folder,
//   so a phase re-runs alone; RESEED=1 (or delete the file) for a fresh seed. A phase that mutates marks itself done
//   in the state; REDO=1 runs it again.
//   Phases: seed · defaults (a new context's Access tab, Site Access Options, Hosted Journals Create/Edit boxes; OMP2's
//   sweep for "Enable OAI" per level) · site (Identify against Administration › Site Settings, the contact email
//   changed and restored on screen; 16a) · harvest (no mail, notification or log from harvesting) · unpub (M's P2
//   unpublished on screen) · withhold (Rule 17 with "Disable"/"Enable" saved on screen; site-wide reads) · enabled
//   (Rule 16: W unticked and ticked again under Hosted Journals; site-wide walk) · access (Rule 18 / q1: R restricted
//   on screen, N created not enabled; every level signed in) · issues (OJS: Unpublish Issue, Delete Issue) · remove
//   (X removed under Hosted Journals) · driver (OJS: DRIVER on an open journal, "View Article Content" and the site
//   access box ticked on screen; a subscription journal) · jatswin (OJS: the "JATS Metadata Format" window saved) ·
//   a9 (OJS: a journal that does not publish online) · cross (the article page's own Dublin Core tags) · sweep (tabs
//   and the Hosted Journals window left with a change unsaved).
//
// Scratch contexts per app (tag prefix u19k4): M main (users mg, ed [OJS/OMP], se, au, rd; P1 with a galley or a
// format, P2 unpublished on screen, OJS P3 in issue 1 and P4 in issue 2), W (unticked publicly and ticked again),
// R (visitors must log in, ticked on screen), N (created not enabled), X (removed), Q (untouched: defaults),
// OJS Z (publishing mode "none", an article with a galley), O (DRIVER on, open by default: OA with a galley, OB without),
// S (subscription, DRIVER and JATS on, SA in a published subscription issue with a galley).
// publicknowledge and the seeded users are not touched. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'defaults', 'site', 'harvest', 'unpub', 'withhold', 'enabled', 'access', 'issues', 'remove', 'driver', 'jatswin', 'a9', 'cross', 'sweep'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k4 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const REPO_ID = {ojs: 'ojs-test.localhost', omp: 'omp-test.localhost', ops: 'ops-test.localhost'};
const KIND = {ojs: 'article', omp: 'publicationFormat', ops: 'preprint'};
const psql = (app, sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim(); } catch (e) { return `psql error: ${flat(e.message, 200)}`; } };

// ---------------------------------------------------------------- the OAI answer, parsed (regex; the answers are regular)
const g1 = (re, s) => { const r = String(s).match(re); return r ? r[1] : null; };
function parseOai(xml) {
    const x = String(xml || '');
    const out = {};
    out.responseDate = g1(/<responseDate>([^<]*)<\/responseDate>/, x);
    out.errors = [...x.matchAll(/<error code="([^"]*)">([^<]*)<\/error>/g)].map((e) => `${e[1]}: ${e[2]}`);
    out.verb = g1(/<(Identify|ListRecords|ListIdentifiers|ListSets|ListMetadataFormats|GetRecord)>/, x);
    out.records = [...x.matchAll(/<header( status="deleted")?>([\s\S]*?)<\/header>([\s\S]*?)(?=<header|<\/ListRecords>|<\/ListIdentifiers>|<\/GetRecord>|<resumptionToken|$)/g)].map((h) => ({
        id: g1(/<identifier>([^<]*)</, h[2]), datestamp: g1(/<datestamp>([^<]*)</, h[2]),
        sets: [...h[2].matchAll(/<setSpec>([^<]*)</g)].map((m) => m[1]), deleted: !!h[1], metadata: /<metadata>/.test(h[3]),
        dcIdentifier: [...h[3].matchAll(/<dc:identifier[^>]*>([^<]*)</g)].map((m) => m[1]),
        dcRelation: [...h[3].matchAll(/<dc:relation[^>]*>([^<]*)</g)].map((m) => m[1]),
    }));
    out.sets = [...x.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((m) => ({spec: m[1], name: m[2]}));
    out.formats = [...x.matchAll(/<metadataPrefix>([^<]*)</g)].map((m) => m[1]);
    out.identify = /<Identify>/.test(x) ? {repositoryName: g1(/<repositoryName>([^<]*)</, x), baseURL: g1(/<baseURL>([^<]*)</, x), adminEmail: [...x.matchAll(/<adminEmail>([^<]*)</g)].map((m) => m[1]), earliestDatestamp: g1(/<earliestDatestamp>([^<]*)</, x)} : undefined;
    const tok = x.match(/<resumptionToken([^>]*?)(?:\/>|>([^<]*)<\/resumptionToken>)/);
    out.token = tok ? (tok[2] || '') : null;
    return out;
}
const short = (p) => ({status: p.status, location: p.location, verb: p.verb, errors: p.errors, identify: p.identify, count: p.records ? p.records.length : 0,
    records: (p.records || []).slice(0, 12).map((r) => `${r.deleted ? 'DELETED ' : ''}${r.id} ${r.datestamp} [${r.sets.join(',')}]${r.metadata ? ' md' : ''}`),
    sets: p.sets && p.sets.length > 12 ? {count: p.sets.length} : p.sets, formats: p.formats, token: p.token ? 'yes' : null});

forEachApp(async (app) => {
    const A = app.name;
    const isOJS = A === 'ojs', isOMP = A === 'omp', isOPS = A === 'ops';
    const S = !process.env.RESEED && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k4-facts', {[k]: v}, {merge: true}); log(`[${A} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const q = (sql) => psql(app, sql);
    const CTX = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';
    const CT = isOJS ? 'journal' : isOMP ? 'press' : 'server';
    const ctxTable = isOJS ? 'journal_settings' : isOMP ? 'press_settings' : 'server_settings';
    const ctxCol = isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id';
    const oid = (n) => `oai:${REPO_ID[A]}:${KIND[A]}/${n}`;
    const itemOid = (it) => oid(isOMP ? (it.formats || [])[0] : it.id);
    const cu = (ctx, qs) => app.url(`/index.php/${ctx || 'index'}/oai${qs ? `?${qs}` : ''}`);
    const done = (k) => !process.env.REDO && S.done && S.done[k];
    const mark = (k) => { S.done = {...(S.done || {}), [k]: new Date().toISOString()}; save(); };

    // ------------------------------------------------------------------ seed (no browser)
    if (on('seed') && !S.t) {
        const t = tag('u19k4');
        S.t = t; save();
        const levels = (k, all) => {
            const u = [{username: `${k}mg`, roles: ['manager']}, {username: `${k}rd`, roles: ['reader']}];
            if (all) { u.push({username: `${k}se`, roles: ['sectionEditor']}, {username: `${k}au`, roles: ['author']}); if (!isOPS) u.push({username: `${k}ed`, roles: ['editor']}); }
            else u.push({username: `${k}au`, roles: ['author']});
            return u;
        };
        const mk = async (key, extra = {}, all = false) => {
            const k = `${t}${key.toLowerCase()}`;
            const spec = {tag: k, users: levels(k, all), ...extra, context: {name: `K4 ${CTX} ${key} ${t}`, ...(extra.context || {})}};
            const r = await app.api.createContext(spec);
            const o = {key, path: r.path || k, id: r.contextId, name: spec.context.name, k, items: {},
                u: {mg: `${k}mg`, rd: `${k}rd`, au: `${k}au`, se: all ? `${k}se` : null, ed: all && !isOPS ? `${k}ed` : null}};
            S[key] = o; save();
            return o;
        };
        const item = async (C, key, extra = {}) => {
            const spec = {context: C.path, submitter: C.u.au, tag: `${C.k}${key.toLowerCase()}`, title: `K4 ${C.key} ${key} ${t}`, published: true, ...extra};
            if (isOMP && spec.published && !spec.publicationFormats) spec.publicationFormats = [{name: 'PDF'}];
            if (isOMP) delete spec.galleys;
            if (isOPS) delete spec.issue;
            try {
                const r = await app.api.createSubmission(spec);
                C.items[key] = {id: r.submissionId, pub: r.publicationId, title: spec.title, formats: (r.publicationFormats || []).map((f) => f.id)};
            } catch (e) { C.items[key] = {error: flat(e.message, 500)}; }
            save();
        };
        const gal = [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}];
        const M = await mk('M', isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}, {volume: 2, number: 1, year: 2026, published: true}]} : {}, true);
        await item(M, 'P1', {galleys: gal});
        await item(M, 'P2');
        if (isOJS) { await item(M, 'P3', {issue: {volume: 1, number: 1, year: 2026}}); await item(M, 'P4', {issue: {volume: 2, number: 1, year: 2026}}); }
        const W = await mk('W'); await item(W, 'P1');
        const R = await mk('R', {}, true); await item(R, 'P1');
        const N = await mk('N', {context: {enabled: false}}); await item(N, 'P1');
        const X = await mk('X'); await item(X, 'P1');
        await mk('Q', {}, true);
        if (isOJS) {
            const Z = await mk('Z', {publishingMode: 'none'}); await item(Z, 'P1', {galleys: gal});
            const O = await mk('O', {plugins: {driverplugin: {enabled: true}}}); await item(O, 'OA', {galleys: gal}); await item(O, 'OB');
            const Sj = await mk('S', {publishingMode: 'subscription', issues: [{volume: 1, number: 1, year: 2026, published: true}],
                plugins: {driverplugin: {enabled: true}, oaimetadataformatplugin_jats: {enabled: true}}});
            await item(Sj, 'SA', {galleys: gal, issue: {volume: 1, number: 1, year: 2026}});
        }
        fact('seed', Object.fromEntries(Object.entries(S).filter(([k]) => k.length === 1 || k === 't')));
    }
    if (!S.t) { log('no state; run the seed phase'); return; }
    // an item whose seed failed is seeded again (OPS galleys use the "preprint.pdf" fixture)
    if (on('seed')) for (const C of Object.values(S).filter((c) => c && c.items)) {
        for (const [key, it] of Object.entries(C.items)) {
            if (!it.error) continue;
            const spec = {context: C.path, submitter: C.u.au, tag: `${C.k}${key.toLowerCase()}r`, title: `K4 ${C.key} ${key} ${S.t}`, published: true,
                galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]};
            if (isOMP) { delete spec.galleys; spec.publicationFormats = [{name: 'PDF'}]; }
            try { const r = await app.api.createSubmission(spec); C.items[key] = {id: r.submissionId, pub: r.publicationId, title: spec.title, formats: (r.publicationFormats || []).map((f) => f.id)}; } catch (e) { C.items[key] = {error: flat(e.message, 500)}; }
            save(); log('reseeded', C.key, key, JSON.stringify(C.items[key]));
        }
    }

    // ------------------------------------------------------------------ browsers: a signed-out harvester (V) and staff (page)
    const vis = await launch(app);
    const V = vis.page;
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
    // a raw OAI answer: rc is a request context (V.request signed out, page.request with the staff cookies)
    const raw = async (rc, url, label) => {
        let r = await rc.get(url, {maxRedirects: 0, failOnStatusCode: false}).catch((e) => ({err: flat(e.message, 200)}));
        if (r.err) return {status: null, err: r.err, records: [], sets: [], errors: []};
        let hop = null;
        if (r.status() === 302 && /\/oai(\?|$)/.test(r.headers().location || '')) { hop = r.headers().location.replace(app.baseURL, ''); r = await rc.get(r.headers().location, {maxRedirects: 0, failOnStatusCode: false}); }
        const body = await r.text();
        const p = parseOai(body);
        p.status = r.status(); p.hop = hop; p.location = r.headers().location ? r.headers().location.replace(app.baseURL, '') : null;
        if (p.status >= 500) { myCrashes.push({label, url: url.replace(app.baseURL, ''), status: p.status, at: new Date().toISOString()}); p.body = flat(body, 400); }
        if (label) fs.writeFileSync(path.join(outDir(), `raw-${label}-${A}.xml`), body);
        return p;
    };
    const anon = (url, label) => raw(V.request, url, label);
    // the browser view of an address, signed out, recorded
    const view = async (url, name) => {
        const resp = await V.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(V).catch(() => {});
        let s; try { s = await screen(V); } catch (e) { s = {url: V.url(), screenError: flat(e.message, 200)}; }
        const st = resp && typeof resp.status === 'function' ? resp.status() : resp && resp.err;
        record(name, {...s, status: st});
        return {status: st, url: V.url().replace(app.baseURL, ''), text: s.text ? flat(s.text.main, 600) : null};
    };
    // the staff browser at an address: where it lands and what it shows
    const land = async (url, name) => {
        const resp = await page.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(page).catch(() => {});
        const s = await snap(name, {status: resp && resp.status ? resp.status() : null});
        const r = await raw(page.request, url, null);
        return {landed: page.url().replace(app.baseURL, ''), status: resp && resp.status ? resp.status() : resp && resp.err, head: s.text ? flat(s.text.main, 200) : null, raw: short(r), ids: r.records.map((x) => `${x.deleted ? 'D:' : ''}${x.id}`)};
    };
    // every part of a site-wide list, kept to this chunk's contexts
    const mine = (id, sets) => sets.some((s) => s.startsWith(S.t)) || Object.values(S).some((C) => C && C.items && Object.values(C.items).some((it) => it && it.id && (id === oid(it.id) || (isOMP && (it.formats || []).map((f) => oid(f)).includes(id)))));
    const walk = async (verb, ctx = null, extra = '') => {
        let url = cu(ctx, `verb=${verb}${verb === 'ListSets' ? '' : '&metadataPrefix=oai_dc'}${extra}`);
        const out = {parts: 0, total: 0, own: [], sets: [], errors: []};
        for (let i = 0; i < 40 && url; i++) {
            const p = await anon(url, null);
            out.parts++;
            if (p.status !== 200) { out.errors.push(`${p.status} ${p.body || ''}`); break; }
            out.errors.push(...p.errors);
            out.total += verb === 'ListSets' ? p.sets.length : p.records.length;
            if (verb === 'ListSets') out.sets.push(...p.sets.filter((s) => s.spec.startsWith(S.t)).map((s) => `${s.spec} = ${s.name}`));
            else out.own.push(...p.records.filter((r) => mine(r.id, r.sets)).map((r) => `${r.deleted ? 'DELETED ' : ''}${r.id} [${r.sets.join(',')}]`));
            url = p.token ? cu(ctx, `verb=${verb}&resumptionToken=${encodeURIComponent(p.token)}`) : null;
        }
        return out;
    };
    const getRec = async (ctx, it, label) => { const p = await anon(cu(ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(it))}`), label); return {status: p.status, errors: p.errors, rec: p.records[0] ? `${p.records[0].deleted ? 'DELETED ' : ''}${p.records[0].id} [${p.records[0].sets}]` : null, location: p.location}; };
    const sect = async (name, fn) => {
        log(`--- ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}-error`, flat(e.stack || e.message, 1500));
            try { await snap(`err-${name}`, {}, true); } catch (x) { /* none */ }
        }
    };
    const statusText = async () => (await page.locator('[role="status"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 100)).filter(Boolean);
    const toasts = async () => (await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text, [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
    // a Vue settings form saved: the PUT, the inline status, the page bar
    const saveVue = async (inner) => {
        const form = page.locator('form').filter({has: page.locator(inner)}).first();
        const w = page.waitForResponse((r) => /\/api\/v1\/(contexts|site)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        return {status: r ? r.status() : null, saved, statusText: await statusText(), bar: await toasts()};
    };
    const J = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const openAccessTab = async (C) => {
        await page.goto(J(C.path, '/management/settings/distribution')); await idle(page).catch(() => {});
        const tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
        const t = page.locator('#access-button').first();
        if (!(await t.count())) return {tabs, access: false};
        await t.click(); await idle(page).catch(() => {});
        await page.locator('input[name="enableOai"]').first().waitFor({timeout: 10_000}).catch(() => {});
        const radios = await page.locator('input[type="radio"]').evaluateAll((rs) => rs.filter((x) => x.offsetParent !== null).map((x) => ({name: x.name, value: x.value, checked: x.checked, label: ((x.closest('label') || {}).innerText || '').trim()})));
        return {tabs, access: true, radios};
    };
    const openSiteAccess = async (C) => {
        await page.goto(J(C.path, '/management/settings/access')); await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click().catch(() => {}); await idle(page).catch(() => {}); await sleep(400);
        const boxes = await page.locator('input[type="checkbox"]').evaluateAll((bs) => bs.filter((x) => x.offsetParent !== null).map((x) => ({name: x.name, checked: x.checked, label: ((x.closest('label') || x.parentElement || {}).innerText || '').trim()})));
        const legends = await page.locator('legend, .pkpFormFieldLabel, .pkpFormField__heading').allInnerTexts().then((a) => a.map((x) => flat(x, 80)).filter(Boolean)).catch(() => []);
        return {boxes, legends};
    };
    const setSiteBox = async (C, name, want, label) => {
        await openSiteAccess(C);
        const box = page.locator(`input[type="checkbox"][name="${name}"]`).first();
        await box.setChecked(want);
        const r = await saveVue(`input[name="${name}"]`);
        await snap(label);
        return {...r, stored: q(`select setting_name||'='||setting_value from ${ctxTable} where ${ctxCol}=${C.id} and setting_name in ('restrictSiteAccess','restrictArticleAccess') order by 1`)};
    };
    const hosted = async () => { await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page).catch(() => {}); await sleep(400); };
    const openEdit = async (name) => {
        await hosted();
        const row = page.locator('tr.gridRow').filter({hasText: name}).first();
        await row.locator('a.show_extras').click(); await idle(page).catch(() => {}); await sleep(300);
        await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
        const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
        await cb.waitFor({timeout: T});
        return cb;
    };
    const saveEdit = async (C) => {
        const dlg = page.locator('[role="dialog"]:visible').last();
        const acr = dlg.locator('input[id^="context-acronym-control"]').first();
        if ((await acr.count()) && !(await acr.inputValue())) await acr.fill('K4');
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w; await sleep(1200); await idle(page).catch(() => {});
        const o = {status: r ? r.status() : null, errors: await dlg.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().catch(() => [])};
        if (o.status >= 400) {
            const country = dlg.locator('select[id^="context-country-control"]').first();
            if (await country.count()) {
                await country.selectOption('CA'); o.countryPicked = 'CA';
                const w2 = page.waitForResponse((x) => /\/api\/v1\/contexts\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'Save', exact: true}).click();
                const r2 = await w2; o.status2 = r2 ? r2.status() : null; await sleep(1200); await idle(page).catch(() => {});
            }
        }
        o.enabled = q(`select enabled from ${CT === 'journal' ? 'journals' : CT === 'press' ? 'presses' : 'servers'} where ${ctxCol}=${C.id}`);
        return o;
    };
    const wfUrl = (ctx, sid, pub, key = 'titleAbstract') => J(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=publication_${pub}_${key}`);

    try {
        // ============================================================ defaults (Settings bullets 1, 7–10; OMP2; q6)
        if (on('defaults')) await sect('defaults', async () => {
            const o = {};
            const Q = S.Q;
            const levels = [['mg', Q.u.mg], ['ed', Q.u.ed], ['se', Q.u.se], ['admin', 'admin']].filter(([, u]) => u);
            o.levels = {};
            for (const [lv, u] of levels) {
                await as(u, u === 'admin' ? undefined : Q.path);
                const a = await openAccessTab(Q);
                a.landed = page.url().replace(app.baseURL, '');
                a.help = a.access ? flat(await page.locator('.pkpFormField, fieldset').filter({has: page.locator('input[name="enableOai"]')}).last().innerText().catch(() => null), 500) : null;
                a.oaiLink = a.access ? await page.locator('a[href*="openarchives"]').evaluateAll((as) => as.map((x) => `${x.innerText.trim()} → ${x.getAttribute('href')}`)).catch(() => []) : null;
                await snap(`d-access-${lv}`, {access: a}, lv === 'mg');
                // "Enable OAI" anywhere on the settings pages (the page state carries every tab's form)
                a.enableOaiOn = {};
                for (const p of ['context', 'website', 'workflow', 'distribution', 'access']) {
                    const r = await page.goto(J(Q.path, `/management/settings/${p}`)).catch(() => null);
                    await idle(page).catch(() => {});
                    const html = await page.content().catch(() => '');
                    a.enableOaiOn[p] = {status: r && r.status(), landed: page.url().replace(app.baseURL, '').slice(0, 80), enableOai: (html.match(/enableOai/g) || []).length, enableOAIText: (html.match(/Enable OAI/g) || []).length};
                }
                o.levels[lv] = a;
            }
            await as(Q.u.mg, Q.path);
            o.siteAccess = await openSiteAccess(Q);
            await snap('d-site-access-options', {siteAccess: o.siteAccess}, true);
            await loc(page, 'Users & Roles › Site Access Options: "Users must be registered and log in to view the … site." box', page.getByRole('checkbox', {name: /Users must be registered and log in to view the (journal|press|server) site\./}));
            o.stored = q(`select setting_name||'='||setting_value from ${ctxTable} where ${ctxCol}=${Q.id} and setting_name in ('enableOai','publishingMode','restrictSiteAccess','restrictArticleAccess') order by 1`);
            // Hosted Journals: the Create form's box, then Q's Edit box (nothing saved)
            await as('admin');
            await hosted();
            const create = page.getByRole('link', {name: /^Create (Journal|Press|Server)$/});
            o.createLabel = flat(await create.first().innerText().catch(() => null), 40);
            await create.first().click();
            const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
            await cb.waitFor({timeout: T}).catch(() => {});
            o.createBox = {label: await cb.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await cb.isChecked().catch(() => null)};
            await snap('d-hosted-create', o.createBox, true);
            await loc(page, 'Hosted Journals › Create: "Enable this … to appear publicly on the site" box', cb);
            await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Cancel)/}).first().click().catch(() => {});
            await sleep(700);
            const eb = await openEdit(Q.name);
            o.editBox = {label: await eb.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await eb.isChecked().catch(() => null)};
            await snap('d-hosted-edit-q', o.editBox);
            fact('defaults', o);
        });

        // ============================================================ site (Rule 16's Identify; 16a)
        if (on('site')) await sect('site', async () => {
            const o = {};
            await as('admin');
            await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page).catch(() => {});
            const sideTab = async (name) => { await page.getByRole('tab', {name, exact: true}).filter({visible: true}).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(500); };
            await sideTab('Settings');
            o.siteName = await page.locator('input[name^="title"]').evaluateAll((es) => es.map((e) => `${e.name}=${e.value}`)).catch(() => null);
            await snap('s-01-site-settings', {siteName: o.siteName}, true);
            await sideTab('Information');
            const email = page.getByRole('textbox', {name: /Email of principal contact/}).first();
            o.contactEmail = await email.inputValue().catch(() => null);
            await snap('s-02-site-information', {contactEmail: o.contactEmail}, true);
            await loc(page, 'Administration › Site Settings › Information: the contact email box', email);
            o.identify = short(await anon(cu(null, 'verb=Identify'), 'site-identify'));
            o.identifyView = await view(cu(null, 'verb=Identify'), 's-03-site-identify-view');
            // the other end: the contact email changed on screen, then restored on screen
            if (o.contactEmail) {
                const alt = `k4site${S.t}@mail.test`;
                await email.fill(alt);
                o.change = await saveVue('input[name^="contactEmail"]');
                o.identifyChanged = short(await anon(cu(null, 'verb=Identify'), 'site-identify-changed'));
                await page.reload(); await idle(page).catch(() => {}); await sideTab('Information');
                await page.getByRole('textbox', {name: /Email of principal contact/}).first().fill(o.contactEmail);
                o.restore = await saveVue('input[name^="contactEmail"]');
                o.identifyRestored = short(await anon(cu(null, 'verb=Identify'), null));
                o.dbAfter = q(`select setting_name||'|'||locale||'|'||setting_value from site_settings where setting_name in ('contactEmail','title') order by 1`);
            }
            // 16a: an address naming no context, each app
            o.unknown = {};
            for (const p of ['nosuchjournal', `${S.t}none`]) {
                const r = await anon(cu(p, 'verb=Identify'), null);
                o.unknown[p] = {status: r.status, location: r.location, verb: r.verb, repositoryName: r.identify && r.identify.repositoryName, body: r.body || null};
            }
            o.unknownView = await view(cu('nosuchjournal', 'verb=Identify'), 's-04-nosuchjournal-view');
            await shot(V, 's-04-nosuchjournal-view').catch(() => {});
            fact('site', o);
        });

        // ============================================================ harvest (Side effects: nothing a user sees)
        if (on('harvest') && !done('harvest')) await sect('harvest', async () => {
            const M = S.M;
            const ids = Object.values(M.items).filter((x) => x.id).map((x) => x.id).join(',') || '0';
            const counts = async () => ({
                mail: await Promise.all(Object.values(M.u).filter(Boolean).concat(['admin']).map((u) => app.mail.count({to: `${u}@mail.test`}).catch(() => -1))),
                mailAll: await app.mail.messageCount().catch(() => null),
                notifications: q(`select count(*) from notifications where context_id=${M.id}`),
                eventLog: q(`select count(*) from event_log where (assoc_type=1048585 and assoc_id in (${ids}))`),
                emailLog: q(`select count(*) from email_log where assoc_id in (${ids})`),
                modified: q(`select string_agg(submission_id||':'||last_modified, ',') from submissions where submission_id in (${ids})`),
            });
            const o = {before: await counts()};
            const reqs = ['verb=Identify', 'verb=ListSets', 'verb=ListMetadataFormats', 'verb=ListIdentifiers&metadataPrefix=oai_dc', 'verb=ListRecords&metadataPrefix=oai_dc',
                `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(M.items.P1))}`, 'verb=ListRecords&metadataPrefix=nosuch', 'verb=Foo'];
            o.answers = [];
            for (let i = 0; i < 3; i++) for (const r of reqs) { const p = await anon(cu(M.path, r), null); o.answers.push(p.status); }
            await view(cu(M.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'h-01-view');
            await sleep(3000);
            o.after = await counts();
            // the manager's own view: the notifications in the page header
            await as(M.u.mg, M.path);
            await page.goto(J(M.path, '/dashboard/editorial')); await idle(page).catch(() => {});
            await snap('h-02-manager-dashboard');
            mark('harvest');
            fact('harvest', o);
        });

        // ============================================================ unpub (M's P2 unpublished on screen: a deleted record for q18)
        const unpublishOnScreen = async (C, it, name) => {
            const o = {};
            await as(C.u.mg, C.path);
            await page.goto(wfUrl(C.path, it.id, it.pub)); await idle(page).catch(() => {});
            const btn = page.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).first();
            await btn.waitFor({state: 'visible', timeout: T});
            await snap(`${name}-before`);
            await btn.click();
            const dlg = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be (published|posted)\?/}).last();
            await dlg.waitFor({state: 'visible', timeout: T});
            o.confirm = flat(await dlg.innerText().catch(() => null), 300);
            const w = page.waitForResponse((r) => r.url().includes('/unpublish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).last().click();
            const r = await w; o.status = r ? r.status() : null; o.at = new Date().toISOString();
            await idle(page).catch(() => {}); await sleep(800);
            await snap(`${name}-after`);
            return o;
        };
        if (on('unpub') && !done('unpub')) await sect('unpub', async () => {
            const o = {};
            o.before = await getRec(S.M.path, S.M.items.P2, null);
            o.unpublish = await unpublishOnScreen(S.M, S.M.items.P2, 'u-01-unpublish-p2');
            await sleep(1200);
            o.after = await getRec(S.M.path, S.M.items.P2, 'u-p2-after');
            o.afterSite = await getRec(null, S.M.items.P2, null);
            o.tomb = q(`select tombstone_id, oai_identifier, set_spec from data_object_tombstones where oai_identifier='${itemOid(S.M.items.P2)}'`);
            mark('unpub');
            fact('unpub', o);
        });

        // ============================================================ withhold (Rule 17; Settings bullet 1; Side effects "Saved")
        const readM = async (label, extra = true) => {
            const M = S.M;
            const r = {};
            for (const [k, qs] of [['identify', 'verb=Identify'], ['sets', 'verb=ListSets'], ['formats', 'verb=ListMetadataFormats'],
                ['formatsId', `verb=ListMetadataFormats&identifier=${encodeURIComponent(itemOid(M.items.P1))}`],
                ['ids', 'verb=ListIdentifiers&metadataPrefix=oai_dc'], ['recs', 'verb=ListRecords&metadataPrefix=oai_dc'],
                ['getP1', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(M.items.P1))}`],
                ['getP2', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(M.items.P2))}`],
                ['idsSet', `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${M.path}`]]) {
                r[k] = short(await anon(cu(M.path, qs), `${label}-${k}`));
            }
            if (extra) {
                r.siteGetP1 = await getRec(null, M.items.P1, null);
                r.siteGetP2 = await getRec(null, M.items.P2, null);
                r.siteIdsSet = short(await anon(cu(null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${M.path}`), null));
                r.siteWalk = await walk('ListIdentifiers');
                r.siteWalk.own = r.siteWalk.own.filter((x) => x.includes(`[${M.path}`) || x.includes(itemOid(M.items.P1)) || x.includes(itemOid(M.items.P2)));
                r.siteSets = (await walk('ListSets')).sets.filter((x) => x.startsWith(M.path));
            }
            await view(cu(M.path, 'verb=ListRecords&metadataPrefix=oai_dc'), `${label}-view-recs`);
            return r;
        };
        if (on('withhold') && !done('withhold')) await sect('withhold', async () => {
            const o = {};
            o.before = await readM('w-00-before');
            if (isOMP) {
                await as(S.M.u.mg, S.M.path);
                o.omp = await openAccessTab(S.M);
                await snap('w-omp-distribution', {tabs: o.omp});
                mark('withhold'); fact('withhold', o); return;
            }
            await as(S.M.u.mg, S.M.path);
            for (const val of ['false', 'true']) {
                const tab = await openAccessTab(S.M);
                const radio = page.locator(`input[name="enableOai"][value="${val}"]`);
                await radio.check();
                if (val === 'false') await loc(page, 'Distribution › Access: "Enable OAI" › "Disable"', radio);
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                const form = radio.locator('xpath=ancestor::form[1]');
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                const statusSeen = await page.locator('[role="status"]').filter({hasText: /Sav/}).first().innerText().catch(() => null);
                await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
                const s = {status: r && r.status(), post: r ? flat(r.request().postData(), 300) : null, statusSeen, statusAfter: await statusText(), bar: await toasts()};
                await snap(`w-saved-${val}`, s, true);
                s.sameRead = (await page.locator(`input[name="enableOai"]:checked`).getAttribute('value').catch(() => null));
                await page.reload(); await idle(page).catch(() => {});
                const re = await openAccessTab(S.M);
                s.afterReload = (re.radios || []).filter((x) => x.name === 'enableOai');
                s.stored = q(`select setting_value from ${ctxTable} where ${ctxCol}=${S.M.id} and setting_name='enableOai'`);
                s.tabBefore = (tab.radios || []).filter((x) => x.name === 'enableOai');
                o[`save-${val}`] = s;
                o[`read-${val}`] = await readM(`w-${val === 'false' ? '01-disabled' : '02-enabled'}`);
            }
            mark('withhold');
            fact('withhold', o);
        });

        // ============================================================ enabled (Rule 16; Settings bullet 10)
        if (on('enabled') && !done('enabled')) await sect('enabled', async () => {
            const o = {};
            const W = S.W;
            const readW = async (label) => ({
                siteGet: await getRec(null, W.items.P1, `${label}-siteget`),
                siteIdsSet: short(await anon(cu(null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${W.path}`), null)),
                siteRecs: await walk('ListIdentifiers'),
                siteSets: (await walk('ListSets')).sets,
                own: short(await anon(cu(W.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null)),
                tomb: q(`select count(*) from data_object_tombstones where oai_identifier='${itemOid(W.items.P1)}'`),
            });
            o.before = await readW('e-00');
            await view(cu(null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(W.items.P1))}`), 'e-00-site-get-view');
            await as('admin');
            for (const want of [false, true]) {
                const cb = await openEdit(W.name);
                const was = await cb.isChecked();
                await cb.setChecked(want);
                const sv = await saveEdit(W);
                await snap(`e-saved-${want}`, sv);
                o[`save-${want}`] = {was, ...sv};
                await sleep(800);
                o[`read-${want}`] = await readW(`e-${want ? '02-on' : '01-off'}`);
                await view(cu(null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(W.items.P1))}`), `e-${want ? '02-on' : '01-off'}-site-get-view`);
                await view(cu(W.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), `e-${want ? '02-on' : '01-off'}-own-view`);
            }
            // N (created not enabled): absent from the site-wide list, its sets not named
            o.N = {siteGet: await getRec(null, S.N.items.P1, null), siteIdsSet: short(await anon(cu(null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${S.N.path}`), null))};
            mark('enabled');
            fact('enabled', o);
        });

        // ============================================================ access (Rule 18; q1; Settings bullet 8)
        if (on('access') && !done('access')) await sect('access', async () => {
            const o = {};
            const R = S.R, N = S.N;
            const url = (C) => cu(C.path, 'verb=ListRecords&metadataPrefix=oai_dc');
            // (1) an open journal: the manager signed in, the same browser
            await as(R.u.mg, R.path);
            o.openMg = await land(url(R), 'a-01-open-mg');
            o.openAnon = short(await anon(url(R), null));
            // (2) the box ticked on screen by the manager
            o.tick = await setSiteBox(R, 'restrictSiteAccess', true, 'a-02-restrict-saved');
            await as(null);
            o.R = {anon: await land(url(R), 'a-03-R-anon')};
            o.R.anonRaw = short(await anon(url(R), null));
            o.R.anonSets = short(await anon(cu(R.path, 'verb=ListSets'), null));
            for (const lv of ['mg', 'ed', 'se', 'au', 'rd']) {
                if (!R.u[lv]) continue;
                await as(R.u[lv], R.path);
                o.R[lv] = await land(url(R), `a-04-R-${lv}`);
            }
            await as('admin'); o.R.admin = await land(url(R), 'a-04-R-admin');
            await as(S.M.u.rd); o.R.outsider = await land(url(R), 'a-04-R-outsider');
            // N: created not enabled
            await as(null);
            o.N = {anon: await land(url(N), 'a-05-N-anon'), anonSets: short(await anon(cu(N.path, 'verb=ListSets'), null))};
            for (const lv of ['mg', 'rd']) { await as(N.u[lv]); o.N[lv] = await land(url(N), `a-06-N-${lv}`); o.N[`${lv}Sets`] = short(await raw(page.request, cu(N.path, 'verb=ListSets'), null)); }
            await as('admin'); o.N.admin = await land(url(N), 'a-06-N-admin');
            await as(S.M.u.rd); o.N.outsider = await land(url(N), 'a-06-N-outsider');
            o.N.outsiderIdentify = short(await raw(page.request, cu(N.path, 'verb=Identify'), null));
            // untick again (R back to open)
            await as(R.u.mg, R.path);
            o.untick = await setSiteBox(R, 'restrictSiteAccess', false, 'a-07-restrict-unticked');
            await as(null);
            o.R.anonAfter = short(await anon(url(R), null));
            mark('access');
            fact('access', o);
        });

        // ============================================================ issues (OJS: Unpublish Issue, Delete Issue; side effects)
        if (on('issues') && isOJS && !done('issues')) await sect('issues', async () => {
            const o = {};
            const M = S.M;
            const read = async () => ({P3: await getRec(M.path, M.items.P3, null), P3site: await getRec(null, M.items.P3, null), P4: await getRec(M.path, M.items.P4, null), P4site: await getRec(null, M.items.P4, null)});
            o.before = await read();
            await as(M.u.mg, M.path);
            const backIssue = async (label, action, name) => {
                await page.goto(J(M.path, '/manageIssues')); await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page).catch(() => {});
                const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
                await panel.locator('table').first().waitFor({timeout: T}); await sleep(400);
                const row = panel.locator('tr.gridRow').filter({hasText: label}).first();
                await row.waitFor({timeout: T});
                await row.locator('a.show_extras').click();
                const ctl = row.locator('xpath=following-sibling::tr[1]');
                await snap(`${name}-row`);
                await ctl.getByRole('link', {name: action, exact: true}).click();
                const d = page.locator('[role="dialog"]:visible').last();
                await d.waitFor({timeout: T}); await idle(page).catch(() => {});
                const r = {confirm: flat(await d.innerText().catch(() => null), 300)};
                const w = page.waitForResponse((x) => x.request().method() === 'POST' && /issue/i.test(x.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'OK', exact: true}).click();
                const resp = await w; r.status = resp ? resp.status() : null; r.url = resp ? resp.url().replace(app.baseURL, '').slice(0, 160) : null;
                await idle(page).catch(() => {}); await sleep(1500);
                await snap(`${name}-after`);
                return r;
            };
            o.unpublishIssue = await backIssue('Vol. 1 No. 1 (2026)', 'Unpublish Issue', 'i-01-unpublish-issue');
            o.afterUnpublish = await read();
            o.deleteIssue = await backIssue('Vol. 2 No. 1 (2026)', 'Delete', 'i-02-delete-issue');
            o.afterDelete = await read();
            o.tomb = q(`select oai_identifier, set_spec, date_deleted from data_object_tombstones where oai_identifier in ('${itemOid(M.items.P3)}','${itemOid(M.items.P4)}')`);
            o.db = q(`select s.submission_id, s.status, p.status, p.issue_id from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id in (${M.items.P3.id},${M.items.P4.id})`);
            mark('issues');
            fact('issues', o);
        });

        // ============================================================ remove (X removed under Hosted Journals)
        if (on('remove') && !done('remove')) await sect('remove', async () => {
            const o = {};
            const X = S.X;
            o.before = await getRec(null, X.items.P1, null);
            await as('admin');
            await hosted();
            const row = page.locator('tr.gridRow').filter({hasText: X.name}).first();
            await row.locator('a.show_extras').click(); await sleep(300);
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Remove', exact: true}).click();
            const d = page.locator('[role="dialog"]:visible').last();
            await d.waitFor({timeout: T});
            o.confirm = flat(await d.innerText().catch(() => null), 300);
            const w = page.waitForResponse((x) => x.request().method() !== 'GET' && /context/i.test(x.url()), {timeout: 60_000}).catch(() => null);
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w; o.status = r ? r.status() : null;
            await idle(page).catch(() => {}); await sleep(1500);
            await snap('x-01-after-remove');
            o.after = await getRec(null, X.items.P1, 'x-siteget-after');
            o.afterView = await view(cu(null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(itemOid(X.items.P1))}`), 'x-02-site-get-view');
            o.own = short(await anon(cu(X.path, 'verb=Identify'), null));
            o.tomb = q(`select oai_identifier, set_spec, set_name from data_object_tombstones where oai_identifier='${itemOid(X.items.P1)}'`);
            mark('remove');
            fact('remove', o);
        });

        // ============================================================ driver (OJS: Settings bullets 7–9, DRIVER's set)
        if (on('driver') && isOJS && !done('driver')) await sect('driver', async () => {
            const o = {};
            const O = S.O, Sj = S.S;
            const dset = async (C, rc = V.request) => { const p = await raw(rc, cu(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'), null); return {status: p.status, location: p.location, errors: p.errors, ids: p.records.map((x) => x.id)}; };
            o.O = {items: {OA: itemOid(O.items.OA), OB: itemOid(O.items.OB)}, open: await dset(O), sets: short(await anon(cu(O.path, 'verb=ListSets'), null)).sets};
            await as(O.u.mg, O.path);
            o.O.accessTab = await openAccessTab(O);
            await snap('dr-01-O-access-tab', {tab: o.O.accessTab});
            // "View Article Content" ticked on screen
            o.O.tickArticle = await setSiteBox(O, 'restrictArticleAccess', true, 'dr-02-O-article-ticked');
            o.O.afterArticle = await dset(O);
            o.O.untickArticle = await setSiteBox(O, 'restrictArticleAccess', false, 'dr-03-O-article-unticked');
            o.O.afterUntickArticle = await dset(O);
            // the site box ticked: read signed in (the manager) and signed out
            o.O.tickSite = await setSiteBox(O, 'restrictSiteAccess', true, 'dr-04-O-site-ticked');
            o.O.afterSiteMg = await dset(O, page.request);
            o.O.afterSiteAnon = await dset(O);
            o.O.untickSite = await setSiteBox(O, 'restrictSiteAccess', false, 'dr-05-O-site-unticked');
            o.O.afterUntickSite = await dset(O);
            // S: subscription journal (issue born "Subscription")
            o.S = {item: itemOid(Sj.items.SA), driver: await dset(Sj), all: short(await anon(cu(Sj.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), null)),
                jats: short(await anon(cu(Sj.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(itemOid(Sj.items.SA))}`), 's-jats-get')),
                jatsList: short(await anon(cu(Sj.path, 'verb=ListRecords&metadataPrefix=jats'), null)),
                issue: q(`select issue_id, access_status, published, open_access_date from issues where journal_id=${Sj.id}`)};
            await as(Sj.u.mg, Sj.path);
            o.S.accessTab = await openAccessTab(Sj);
            await snap('dr-06-S-access-tab', {tab: o.S.accessTab});
            await view(cu(Sj.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(itemOid(Sj.items.SA))}`), 'dr-07-S-jats-view');
            mark('driver');
            fact('driver', o);
        });

        // ============================================================ jatswin (OJS: "Your changes have been saved.")
        if (on('jatswin') && isOJS && !done('jatswin')) await sect('jatswin', async () => {
            const o = {};
            const Sj = S.S;
            await as(Sj.u.mg, Sj.path);
            await page.goto(J(Sj.path, '/management/settings/website')); await idle(page).catch(() => {});
            await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
            await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T}); await sleep(500);
            const row = page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'JATS Metadata Format'}).first();
            o.box = await row.getByRole('checkbox').first().isChecked().catch(() => null);
            await row.locator('a.show_extras').first().click(); await sleep(500);
            await page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link', {name: 'Settings', exact: true}).first().click();
            const win = page.locator('[role="dialog"]:visible').last();
            await win.locator('input[name="forceJatsTemplate"]').waitFor({timeout: T});
            await idle(page).catch(() => {}); await sleep(300);
            await snap('j-01-window');
            await win.locator('input[name="forceJatsTemplate"]').check();
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
            await win.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            const seen = await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text, [role="alert"], [role="status"]').filter({hasText: /saved/i}).first().innerText({timeout: 8000}).catch(() => null);
            o.ok = {status: r && r.status(), seen: flat(seen, 200), toasts: await toasts(), open: await page.locator('[role="dialog"]:visible').count()};
            await snap('j-02-after-ok', o.ok, true);
            o.stored = q(`select setting_name||'='||setting_value from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${Sj.id} order by 1`);
            mark('jatswin');
            fact('jatswin', o);
        });

        // ============================================================ a9 (OJS: publishing mode "none")
        if (on('a9') && isOJS) await sect('a9', async () => {
            const o = {};
            const Z = S.Z, it = Z.items.P1;
            const idf = encodeURIComponent(itemOid(it));
            const recs = await anon(cu(Z.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'a9-recs');
            o.recs = {status: recs.status, errors: recs.errors, records: recs.records.map((x) => ({id: x.id, dcIdentifier: x.dcIdentifier, dcRelation: x.dcRelation}))};
            o.viewRecs = await view(cu(Z.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'a9-01-recs-view');
            for (const pfx of ['oai_marc', 'marcxml']) {
                const p = await anon(cu(Z.path, `verb=GetRecord&metadataPrefix=${pfx}&identifier=${idf}`), `a9-${pfx}`);
                const body = fs.readFileSync(path.join(outDir(), `raw-a9-${pfx}-${A}.xml`), 'utf8');
                const f856 = body.match(/<(?:varfield|datafield)[^>]*(?:id|tag)="856"[^>]*>[\s\S]*?<\/(?:varfield|datafield)>/);
                o[pfx] = {status: p.status, errors: p.errors, f856: f856 ? flat(f856[0], 600) : null, urls: [...body.matchAll(/https?:\/\/[^<"\s]+/g)].map((m) => m[0]).filter((u) => u.includes(Z.path))};
                o[`${pfx}View`] = await view(cu(Z.path, `verb=GetRecord&metadataPrefix=${pfx}&identifier=${idf}`), `a9-02-${pfx}-view`);
            }
            // the article page, signed out, and the address the MARC record carries
            o.articlePage = await view(J(Z.path, `/article/view/${it.id}`), 'a9-03-article-page');
            await shot(V, 'a9-03-article-page').catch(() => {});
            const u856 = (o.marcxml.urls || []).find((u) => /article\/view/.test(u)) || (o.oai_marc.urls || []).find((u) => /article\/view/.test(u));
            if (u856) { o.u856 = u856.replace(app.baseURL, ''); o.u856Page = await view(u856.replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, app.baseURL), 'a9-04-856-address'); }
            // the article page signed in (the journal's reader)
            await as(Z.u.rd, Z.path);
            o.articlePageReader = await land(J(Z.path, `/article/view/${it.id}`), 'a9-06-article-page-reader');
            delete o.articlePageReader.raw; delete o.articlePageReader.ids;
            await as(Z.u.mg, Z.path);
            o.accessTab = await openAccessTab(Z);
            await snap('a9-05-access-tab', {tab: o.accessTab});
            fact('a9', o);
        });

        // ============================================================ cross (the article page's own Dublin Core tags)
        if (on('cross')) await sect('cross', async () => {
            const o = {};
            const it = S.M.items.P1;
            const p = isOMP ? `/catalog/book/${it.id}` : isOPS ? `/preprint/view/${it.id}` : `/article/view/${it.id}`;
            await V.goto(J(S.M.path, p)); await idle(V).catch(() => {});
            o.page = p;
            o.dcMeta = await V.locator('meta[name^="DC."]').evaluateAll((ms) => ms.map((m) => `${m.getAttribute('name')}=${(m.getAttribute('content') || '').slice(0, 60)}`)).catch(() => []);
            const s = await screen(V).catch(() => null); record('c-01-item-page', {...s, dcMeta: o.dcMeta});
            fact('cross', o);
        });

        // ============================================================ sweep (a tab and a window left with a change unsaved)
        if (on('sweep') && !done('sweep')) await sect('sweep', async () => {
            const o = {};
            const Q = S.Q;
            await as(Q.u.mg, Q.path);
            await openSiteAccess(Q);
            const box = page.getByRole('checkbox', {name: /Users must be registered and log in to view the (journal|press|server) site\./});
            await box.check();
            await box.blur().catch(() => {});
            const d0 = dialogs.length;
            const other = page.getByRole('tab').filter({hasNotText: /Site Access Options/}).filter({visible: true}).first();
            o.otherTab = flat(await other.innerText().catch(() => null), 60);
            await other.click().catch(() => {}); await sleep(600);
            o.afterTab = {dialogs: dialogs.slice(d0)};
            await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click().catch(() => {}); await sleep(400);
            o.boxAfterTab = await box.isChecked().catch(() => null);
            await page.goto(J(Q.path, '/management/settings/distribution')).catch((e) => { o.gotoErr = flat(e.message, 100); });
            await idle(page).catch(() => {});
            o.afterLeave = {dialogs: dialogs.slice(d0), url: page.url().replace(app.baseURL, '')};
            o.stored = q(`select coalesce(max(setting_value),'<no row>') from ${ctxTable} where ${ctxCol}=${Q.id} and setting_name='restrictSiteAccess'`);
            o.reopened = (await openSiteAccess(Q)).boxes;
            await snap('sw-01-site-access-reopened', o);
            // Hosted Journals › Edit: untick, then Close
            await as('admin');
            const cb = await openEdit(Q.name);
            await cb.uncheck();
            const d1 = dialogs.length;
            const dlg = page.locator('[role="dialog"]:visible').last();
            const closeBtn = dlg.getByRole('button', {name: /^Close/}).first();
            o.hostedClose = {closeButtons: await dlg.getByRole('button').allInnerTexts().then((a) => a.map((x) => flat(x, 30))).catch(() => [])};
            await closeBtn.click().catch(() => {}); await sleep(900);
            const conf = page.locator('[role="dialog"]:visible').filter({hasText: /unsaved|sure|discard|leave/i}).last();
            o.hostedClose.confirm = (await conf.count()) ? flat(await conf.innerText(), 300) : null;
            o.hostedClose.native = dialogs.slice(d1);
            o.hostedClose.stillOpen = await page.locator('[role="dialog"]:visible').count();
            await snap('sw-02-hosted-after-close', o.hostedClose);
            o.hostedStored = q(`select enabled from ${CT === 'journal' ? 'journals' : CT === 'press' ? 'presses' : 'servers'} where ${ctxCol}=${Q.id}`);
            const cb2 = await openEdit(Q.name);
            o.hostedReopened = await cb2.isChecked().catch(() => null);
            await snap('sw-03-hosted-reopened', {checked: o.hostedReopened});
            mark('sweep');
            fact('sweep', o);
        });
    } finally {
        fact('myCrashes', myCrashes);
        fact('dialogs', dialogs);
        await vis.close().catch(() => {});
        await staff.close().catch(() => {});
    }
});
