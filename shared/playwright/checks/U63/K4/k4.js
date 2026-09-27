// U63 claim check, chunk K4: the PubMed XML Export Plugin and the DOAJ Export Plugin {OJS}.
// Spec: docs/specs/U63-import-export.md lines 86–114 (the PubMed and DOAJ fields), 288–358 (Rules 29–45),
// 372–375 (Side effects "DOAJ statuses"), 382–396 (Settings bullets 2–6), 551–569 (A5, OJS1).
//
// OJS scratch journals (tag prefix u63k4), all through POST scenarios/context:
//   A  issues Vol. 1 No. 1 (2025, published) and Vol. 1 No. 2 (2026, not published); no ISSN. Works by the author
//      "Ada Lovelace": p1, p2 published in Vol. 1 No. 1, p3 published with no issue, u1 submitted (not published),
//      s1 scheduled into Vol. 1 No. 2. The PubMed tool, the DOAJ tool (settings, list, filter, buttons, statuses,
//      Register with a dummy API key, Needs Sync), the roles.
//   I  like A with an online ISSN: td19's other end (a valid DOAJ file).
//   P  26 published works (one more than the install's 25 rows a page): the DOAJ list's page links.
//   V  "DOI Versioning" "Yes": the Publications tab (Rules 34, 45); set back to "No" on screen at the end (an OJS
//      journal left on "Yes" makes every OJS OAI request answer 500, seed-facts).
//   D  "DOAJ Plugin" unticked on screen (Rule 33, td2).
//   X  a second DOAJ journal with an API key and the automatic-deposit box ticked (Rule 43, A5).
// OMP and OPS: read-only controls on publicknowledge (the Tools list, the Plugins list, the two tools' addresses).
//
// Outbound HTTP is dead on the test installs ([proxy] 127.0.0.1:9), so "Register" and the daily deposit cannot reach
// DOAJ: their jobs fail at connection. The a5 phase runs the install's own daily task once
// (php lib/pkp/tools/scheduler.php test --name='APP\plugins\generic\doaj\DOAJInfoSender'); the jobs phase drains the
// fleet's default queue with the app's own worker (php lib/pkp/tools/jobs.php work --stop-when-empty --tries=1), which
// also runs other features' queued jobs. Database reads (psql SELECT) are evidence only; nothing is written there.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U63/K4/k4.js
//   PHASES=seed,ctl,pubmed,doaj,paging,issn,mark,settings,register,sync,roles,versions,plugin,a5,jobs (default all;
//   state in k4-state-<app>.json; a mutating phase runs once per seed: delete the state file for a fresh run).
// No assertions: the script records.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir} = require('../../../probe');
const G = require('../../U62/K1/grid');
const {T, sleep, flat, rel, DENIED, snap: snapRaw, readGrid, findRow, readToast, pressBox, tabStrips} = G;

const ALL = ['seed', 'ctl', 'pubmed', 'formsweep', 'doaj', 'paging', 'issn', 'mark', 'settings', 'register', 'sync', 'sync2', 'roles', 'versions', 'versions2', 'plugin', 'a5', 'jobs', 'final'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const REPO = path.resolve(__dirname, '../../../../..');
const T0 = Date.now();

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const log = (...a) => console.log(`[k4 ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `k4-state-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const done = (p) => (S.done || []).includes(p);
    const markDone = (p) => { S.done = [...new Set([...(S.done || []), p])]; save(); };
    const fact = (k, v) => { record('k4-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 3000)); };
    // Saved snapshots keep no text typed into the DOAJ Settings tab's key box (test values stay out of the record).
    const snap = async (pg, name, extra = {}) => {
        const r = await snapRaw(pg, name, extra);
        const f = path.join(outDir(), `${name}-${app.name}.json`);
        try { if (fs.existsSync(f)) fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(textbox \\"DOAJ API Key\\"):[^\\]*/g, '$1')); } catch { /* keep going */ }
        return r;
    };
    const appRoot = path.resolve(REPO, app.root);
    const env = {...process.env, PKP_CONFIG_FILE: path.join(appRoot, 'config.test.inc.php')};
    const psql = (sql) => {
        try {
            return execFileSync('psql', ['-h', '127.0.0.1', `${app.name}_test`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8', timeout: 20000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`psql error: ${flat(e.message, 200)}`]; }
    };
    const cli = (args, timeout = 300000) => {
        try { return flat(execFileSync('php', args, {cwd: appRoot, env, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024}), 4000); } catch (e) { return `ERR ${flat((e.stdout || '') + ' ' + (e.stderr || '') + ' ' + e.message, 2500)}`; }
    };

    // ------------------------------------------------------------------ seed (OJS)
    async function mkCtx(key, extra = {}) {
        if (S[key]) return S[key];
        const t = tag(`u63k4${key.toLowerCase()}`);
        const roles = [['mg', ['manager'], 'Mona', 'Manager'], ['ed', ['editor'], 'Edda', 'Editor'], ['pe', ['productionEditor'], 'Pia', 'Production'],
            ['se', ['sectionEditor'], 'Sami', 'Section'], ['au', ['author'], 'Ada', 'Lovelace']];
        const {context: cx = {}, ...rest} = extra;
        try {
            const res = await app.api.createContext({tag: t, context: {name: `U63 K4 ${key} ${t}`, acronym: 'K4J', contactName: 'K4 Contact',
                contactEmail: `${t}c@mail.test`, country: 'CA', ...cx}, users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
            S[key] = {path: res.path || t, id: res.contextId, name: `U63 K4 ${key} ${t}`, issues: res.issues || null, u: Object.fromEntries(roles.map(([u]) => [u, `${t}${u}`])), subs: {}};
        } catch (e) {
            S[key] = {error: flat(e.message, 800)};
            log(`[seed ctx ${key}]`, S[key].error);
        }
        save();
        return S[key];
    }
    async function mkSub(C, key, spec) {
        if (!C || C.error) return null;
        if (C.subs[key]) return C.subs[key];
        const title = spec.title || `K4 ${key} work`;
        try {
            const res = await app.api.createSubmission({tag: `${C.path}${key}`.slice(0, 32), context: C.path, submitter: C.u.au, title, ...spec});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 600), title};
            log(`[seed ${key}]`, C.subs[key].error);
        }
        save();
        return C.subs[key];
    }
    const issues = [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}];
    const inIssue1 = {published: true, issue: {volume: 1, number: 1, year: 2025}};
    if (isOJS && on('seed') && !done('seed')) {
        const A = await mkCtx('A', {issues});
        await mkSub(A, 'p1', {title: 'Axolotl limb memory', ...inIssue1});
        await mkSub(A, 'p2', {title: 'Okapi forest census', ...inIssue1});
        await mkSub(A, 'p3', {title: 'Tapir seed dispersal', published: true});
        await mkSub(A, 'u1', {title: 'Narwhal tusk acoustics'});
        await mkSub(A, 's1', {title: 'Wombat burrow geometry', published: true, issue: {volume: 1, number: 2, year: 2026}});
        const I = await mkCtx('I', {issues, onlineIssn: '0378-5955'});
        await mkSub(I, 'p1', {title: 'Puffin burrow sharing', ...inIssue1});
        const P = await mkCtx('P', {});
        for (let i = 1; i <= 26; i++) await mkSub(P, `p${i}`, {title: `Paging work ${String(i).padStart(2, '0')}`, published: true});
        const D = await mkCtx('D', {});
        const X = await mkCtx('X', {});
        await mkSub(X, 'p1', {title: 'Heron wading depth', published: true});
        markDone('seed');
        fact('seed', Object.fromEntries(Object.entries(S).filter(([k]) => /^[A-Z]$/.test(k)).map(([k, v]) => [k, {path: v.path, id: v.id, issues: v.issues, subs: v.subs && Object.fromEntries(Object.entries(v.subs).slice(0, 6))}])));
        note(`ccK4 [ojs]: scratch journals A ${A.path}, I ${I.path}, P ${P.path}, D ${D.path}, X ${X.path}; users {path}mg/ed/pe/se/au (manager, editor, productionEditor, sectionEditor, author "Ada Lovelace").`);
    }

    const {page, close} = await launch(app);
    const dialogs = [];
    let confirmAnswer = 'accept';
    page.on('dialog', (d) => {
        const accept = d.type() === 'beforeunload' || (d.type() === 'confirm' && confirmAnswer === 'accept');
        dialogs.push({type: d.type(), message: flat(d.message(), 300), url: rel(page.url()), answer: accept ? 'accept' : 'dismiss'});
        (accept ? d.accept() : d.dismiss()).catch(() => {});
    });
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); };
    const sect = async (name, fn) => {
        if (!on(name)) return;
        log('== phase', name);
        try { await fn(); } catch (e) { log('phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); }
        save();
    };
    const go = async (u) => { let st = null; try { const r = await page.goto(app.url(u)); st = r && r.status(); } catch (e) { st = flat(e.message, 100); } await idle(page).catch(() => {}); return st; };
    const cu = (ctx, p) => `/index.php/${ctx}${p}`;
    const plug = (ctx, name) => cu(ctx, `/management/importexport/plugin/${name}`);
    const bodyText = async (n = 1500) => flat(await page.locator('body').innerText().catch(() => ''), n);
    const pageLook = async (st) => ({status: st, url: rel(page.url()), title: await page.title().catch(() => null), h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 100)),
        trail: flat(await page.locator('nav[aria-label="Breadcrumb"], .pkp_structure_head .app__breadcrumbs, ol.breadcrumbs').first().innerText().catch(() => null), 200),
        tabs: await tabStrips(page), denied: DENIED.test(await page.locator('body').innerText().catch(() => '')), body: await bodyText(700)});

    // ------------------------------------------------------------------ downloads and form posts
    /** Press a control that posts to the tool; returns the post's answer, the download (saved) or the page it lands on, and the notice. */
    async function pressPost(locator, name, {toastMs = 8000} = {}) {
        const o = {};
        const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /\/management\/importexport\/plugin\//.test(r.url()), {timeout: T}).catch(() => null);
        const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
        const t0 = Date.now();
        await locator.click({timeout: 10000}).catch((e) => { o.clickError = flat(e.message, 200); });
        const r = await resp;
        if (r) {
            const h = r.headers();
            o.post = {status: r.status(), url: rel(r.url()), contentDisposition: h['content-disposition'] || null, contentType: h['content-type'] || null, location: h.location ? rel(h.location) : null,
                form: flat(r.request().postData(), 400)};
        } else o.post = null;
        if (o.post && /attachment/i.test(o.post.contentDisposition || '')) {
            const d = await dl;
            if (d) {
                const f = path.join(outDir(), `${name}-${app.name}-${d.suggestedFilename()}`);
                await d.saveAs(f).catch(() => {});
                const txt = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
                o.download = {file: path.basename(f), suggested: d.suggestedFilename(), bytes: txt.length, head: flat(txt, 1200),
                    journalTitle: [...txt.matchAll(/<JournalTitle>([\s\S]*?)<\/JournalTitle>/g)].map((m) => m[1]),
                    articleTitles: [...txt.matchAll(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/g)].map((m) => flat(m[1], 80)),
                    doajTitles: [...txt.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => flat(m[1], 80)),
                    records: (txt.match(/<record>/g) || []).length, articles: (txt.match(/<Article>/g) || []).length};
            } else o.download = 'no download event';
        } else {
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            // a page without the app's scripts (the "Validation errors:" page) never reports jQuery idle: bound the wait
            await Promise.race([idle(page).catch(() => {}), sleep(o.post && o.post.status >= 400 ? 1500 : 15000)]);
        }
        o.ms = Date.now() - t0;
        o.toast = o.post && o.post.status >= 400 ? [] : await readToast(page, toastMs);
        o.url = rel(page.url());
        o.snap = name;
        await snap(page, name, {facts: o});
        return o;
    }

    // ------------------------------------------------------------------ DOAJ page readers
    const listSel = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';
    async function readList() {
        const g = page.locator(listSel).first();
        await g.waitFor({state: 'attached', timeout: T}).catch(() => {});
        await g.locator('tbody').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
        if (!(await g.count())) return {found: false};
        return g.evaluate((grid) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (el) => !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none');
            const form = grid.querySelector('form.filter, form[id^="submissionsListFilter"], form[id^="publicationsListFilter"]');
            const empty = [...grid.querySelectorAll('tbody.empty')].filter(vis).map(txt);
            return {
                found: true,
                gridId: grid.id.replace(/-[0-9a-f]+$/, ''),
                title: txt(grid.querySelector('.header h4')),
                headerLinks: [...grid.querySelectorAll('.header .actions a')].filter(vis).map(txt),
                cols: [...grid.querySelectorAll('thead th')].map(txt),
                rows: [...grid.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
                    cells: [...tr.querySelectorAll('td')].map(txt),
                    links: [...tr.querySelectorAll('td a')].filter(vis).map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), cls: String(a.className).slice(0, 60)})),
                    box: ((b) => (b ? {name: b.name, value: b.value, checked: b.checked} : null))(tr.querySelector('input[type=checkbox]')),
                })),
                empty,
                paging: txt(grid.querySelector('.gridPaging')),
                pagingLinks: [...grid.querySelectorAll('.gridPaging a')].filter(vis).map(txt),
                filterVisible: form ? vis(form) : null,
                filter: form ? {
                    selects: [...form.querySelectorAll('select')].map((s) => ({name: s.name, selected: s.options[s.selectedIndex] && s.options[s.selectedIndex].text.trim(), options: [...s.options].map((o) => `${o.value}=${o.text.trim()}`)})),
                    inputs: [...form.querySelectorAll('input:not([type=hidden])')].map((i) => ({name: i.name, type: i.type, value: i.value, placeholder: i.placeholder})),
                    buttons: [...form.querySelectorAll('button')].map((b) => txt(b)),
                } : null,
            };
        });
    }
    const rowsBrief = (l) => (l && l.rows ? l.rows.map((r) => r.cells.slice(1).join(' | ')) : l);
    async function readControls() {
        const f = page.locator('form#exportSubmissionXmlForm, form#exportPublicationXmlForm').first();
        if (!(await f.count())) return {form: false};
        return f.evaluate((form) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const v = form.querySelector('input[name=validation]');
            const lab = v ? (form.querySelector(`label[for="${v.id}"]`) || v.closest('label') || v.parentElement) : null;
            return {
                formId: form.id,
                validation: v ? {checked: v.checked, label: txt(lab)} : null,
                buttons: [...form.querySelectorAll('ul.export_actions button, ul.export_actions input[type=submit]')].map((b) => ({name: b.name, text: (b.innerText || b.value || '').trim(), type: b.type})),
                textAfterList: txt(form).slice(-300),
            };
        });
    }
    async function openDoaj(C, tabName, name) {
        const st = await go(plug(C.path, 'DOAJExportPlugin'));
        const o = await pageLook(st);
        if (tabName) {
            const t = page.locator('#importExportTabs [role=tab]').filter({hasText: new RegExp(`^\\s*${tabName}\\s*$`)}).first();
            if (await t.count()) { await t.click(); await idle(page).catch(() => {}); } else o.noTab = tabName;
            await page.locator(listSel).first().locator('tbody').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
            await sleep(500);
            o.tabs = await tabStrips(page);
            o.list = await readList();
            o.controls = await readControls();
        } else {
            await page.locator('#doajSettingsForm').waitFor({timeout: T}).catch(() => {});
            o.settings = await readDoajSettings();
        }
        if (name) await snap(page, name, {facts: o});
        return o;
    }
    async function readDoajSettings() {
        const tab = page.locator('#settings-tab');
        return tab.evaluate((t) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const key = t.querySelector('input[name=apiKey]');
            const auto = t.querySelector('input[name=automaticRegistration]');
            const lab = (i) => (i ? txt(t.querySelector(`label[for="${i.id}"]`)) : null);
            return {
                text: txt(t).slice(0, 1500),
                links: [...t.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                apiKey: key ? {type: key.type, maxlength: key.getAttribute('maxlength'), required: key.required, label: lab(key)} : null,
                auto: auto ? {checked: auto.checked, label: lab(auto)} : null,
                buttons: [...t.querySelectorAll('button, a.cancelButton, .formButtons a')].map((b) => txt(b) || b.value).filter(Boolean),
                required: [...t.querySelectorAll('.req, .formRequired, [required]')].map((e) => txt(e) || e.name),
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
    }
    async function tickRows(ids) {
        for (const id of ids) {
            const b = page.locator(`${listSel.split(',').map((s) => `${s} input[type=checkbox][value="${id}"]`).join(', ')}`).first();
            await b.check({timeout: 10000}).catch((e) => log('tick', id, flat(e.message, 120)));
        }
    }
    const doajBtn = (n) => page.locator(`form#exportSubmissionXmlForm button[name="${n}"], form#exportPublicationXmlForm button[name="${n}"], form#exportSubmissionXmlForm input[name="${n}"], form#exportPublicationXmlForm input[name="${n}"]`).first();
    async function useFilter({column, search, issue, status}, name) {
        const g = page.locator(listSel).first();
        const form = g.locator('form').first();
        if (!(await form.isVisible().catch(() => false))) {
            await g.locator('.header .actions a').filter({hasText: /Search/}).first().click().catch(() => {});
            await form.waitFor({state: 'visible', timeout: 10000}).catch(() => {});
        }
        if (column) await form.locator('select[name=column]').selectOption({label: column}).catch((e) => log('col', flat(e.message, 100)));
        if (search !== undefined) await form.locator('input[name=search]').fill(search).catch(() => {});
        if (issue) await form.locator('select[name=issueId]').selectOption({label: issue}).catch((e) => log('issue', flat(e.message, 100)));
        if (status) await form.locator('select[name=statusId]').selectOption({label: status}).catch((e) => log('status', flat(e.message, 100)));
        const w = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Search', exact: true}).click().catch((e) => log('search btn', flat(e.message, 100)));
        const r = await w;
        await idle(page).catch(() => {}); await sleep(600);
        const l = await readList();
        const o = {asked: {column, search, issue, status}, answer: r ? r.status() : null, rows: rowsBrief(l), empty: l.empty, filter: l.filter};
        if (name) await snap(page, name, {facts: o});
        return o;
    }
    const statusOf = (l, title) => { const r = (l.rows || []).find((x) => x.cells.some((c) => c && c.includes(title))); return r ? r.cells[r.cells.length - 1] : 'absent'; };
    const statuses = async (C, tabName = 'Articles') => { const o = await openDoaj(C, tabName); return Object.fromEntries(Object.entries(C.subs).map(([k, s]) => [k, statusOf(o.list, s.title)])); };
    async function saveDoajSettings({key, auto}, name) {
        const o = {};
        const f = page.locator('#doajSettingsForm');
        if (key !== undefined) await f.locator('input[name=apiKey]').fill(key);
        if (auto !== undefined) await f.locator('input[name=automaticRegistration]').setChecked(auto);
        const w = page.waitForResponse((r) => /verb=save|verb%3Dsave/.test(r.url()) || (r.request().method() === 'POST' && /manage/.test(r.url())), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        o.post = r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 300)} : null;
        o.toast = await readToast(page, 8000);
        await idle(page).catch(() => {}); await sleep(500);
        o.sameRead = await readDoajSettings();
        if (name) await snap(page, name, {facts: o});
        return o;
    }

    // ------------------------------------------------------------------ workflow helpers (Rule 44, 45)
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function openWf(ctx, sid, pub) {
        await page.goto(app.url(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${pub ? `&workflowMenuKey=publication_${pub}_titleAbstract` : ''}`)));
        await idle(page).catch(() => {});
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await sleep(1200);
    }
    async function fillVersion(scope, {minor = false} = {}) {
        const stage = scope.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) { if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {}); }
        const m = scope.locator('select[name="versionIsMinor"]');
        if (await m.isVisible().catch(() => false)) { if (!(await m.inputValue().catch(() => ''))) await m.selectOption(minor ? 'true' : 'false').catch(() => {}); }
    }
    async function newVersion(ctx, sid, pub, name, {major = false} = {}) {
        await openWf(ctx, sid, pub);
        const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) return {offered: false};
        await sleep(1200);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page).catch(() => {}); await sleep(1000);
        const o = {offered: true, dialog: flat(await w.innerText().catch(() => ''), 400)};
        if (major) {
            const m = w.locator('select[name="versionIsMinor"]');
            o.minorOptions = await m.evaluate((sel) => [...sel.options].map((x) => `${x.value}=${x.text.trim()}`)).catch(() => null);
            const want = await m.evaluate((sel) => { const x = [...sel.options].find((y) => /major/i.test(y.text)); return x ? x.value : null; }).catch(() => null);
            if (want !== null) await m.selectOption(want).catch(() => {}); else await m.selectOption('false').catch(() => {});
        }
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        if (resp) { o.status = resp.status(); try { o.newPub = (await resp.json()).id; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        await snap(page, name, {facts: o});
        return o;
    }
    async function publish(ctx, sid, pub, name, {noIssue = false} = {}) {
        await openWf(ctx, sid, pub);
        const out = {};
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
        await sleep(800);
        await button.click();
        const pnl = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
        const which = () => Promise.race([
            pnl.locator('select[name="versionStage"], input[name="assignment"], button').first().waitFor({state: 'visible', timeout: 15000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { await button.click({timeout: 5000}).catch(() => {}); opened = await which(); }
        out.opened = opened;
        await idle(page).catch(() => {}); await sleep(2500);
        if (opened === 'panel') {
            await fillVersion(pnl);
            await pnl.locator('input[name="assignment"]:checked').first().waitFor({timeout: 10000}).catch(() => {});
            out.assignment = await pnl.locator('input[name="assignment"]:checked').first().evaluate((i) => i.closest('label') ? i.closest('label').innerText.trim() : i.value).catch(() => null);
            if (noIssue) { await pnl.getByRole('radio', {name: /Don't Assign/i}).check().catch((e) => { out.noIssueError = flat(e.message, 120); }); out.assignmentChosen = "Don't Assign To An Issue"; }
            await pnl.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
            await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
        }
        await idle(page).catch(() => {}); await sleep(800);
        await fillVersion(confirm);
        out.confirm = flat(await confirm.innerText().catch(() => ''), 300);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
        await controls().getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        await snap(page, name, {facts: out});
        return out;
    }

    try {
        // ================================================================== ctl: OMP and OPS read-only controls
        if (!isOJS) await sect('ctl', async () => {
            const o = {};
            await as('manager.maya', 'publicknowledge');
            let st = await go(cu('publicknowledge', '/management/tools'));
            await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15000}).catch(() => {});
            o.tools = {status: st, list: (await page.locator('.pkp_page_importexport_plugins li').allInnerTexts().catch(() => [])).map((x) => flat(x, 150))};
            await snap(page, 'c-01-tools', {facts: o.tools});
            const pl = await G.openWebsitePlugins(page, app, 'publicknowledge');
            const g = await readGrid(page);
            o.plugins = {open: pl.status, doajplugin: findRow(g, 'doajplugin'), generic: (g.cats || []).filter((c) => c.id === 'generic').map((c) => c.rows.map((r) => r.name)), importexport: (g.cats || []).filter((c) => c.id === 'importexport').map((c) => c.rows.map((r) => r.name))};
            await snap(page, 'c-02-plugins', {facts: o.plugins});
            for (const n of ['DOAJExportPlugin', 'PubMedExportPlugin']) {
                st = await go(plug('publicknowledge', n));
                o[n] = await pageLook(st);
                await snap(page, `c-03-${n}`, {facts: o[n]});
            }
            fact('ctl', o);
        });
        if (!isOJS) return;
        const A = S.A; const I = S.I; const P = S.P; const D = S.D; const X = S.X;

        // ================================================================== pubmed (A): Rules 29–32, Setting 6, td16, td17
        if (!done('pubmed')) await sect('pubmed', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            const openPubmed = async (tab, name) => {
                const st = await go(plug(A.path, 'PubMedExportPlugin'));
                const r = await pageLook(st);
                await page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]').waitFor({timeout: T}).catch(() => {});
                if (tab) { await page.locator('#exportTabs [role=tab]').filter({hasText: new RegExp(`^\\s*${tab}\\s*$`)}).first().click().catch(() => {}); await idle(page).catch(() => {}); await sleep(800); }
                r.tabs = await tabStrips(page);
                if (name) await snap(page, name, {facts: r});
                return r;
            };
            o.open = await openPubmed(null, 'pm-01-settings');
            o.settingsForm = await page.locator('#pubmedSettingsGridContainer').evaluate((c) => {
                const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
                const i = c.querySelector('input[name=nlmTitle]');
                return {text: txt(c), links: [...c.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                    input: i ? {type: i.type, maxlength: i.getAttribute('maxlength'), value: i.value, label: txt(c.querySelector(`label[for="${i.id}"]`))} : null,
                    buttons: [...c.querySelectorAll('button, .formButtons a')].map(txt).filter(Boolean)};
            }).catch((e) => ({error: flat(e.message, 200)}));
            await loc(page, 'PubMed Settings tab: NLM Title Abbreviation box', page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]'));
            // the Export Articles tab: the Vue list, compared with the Native tool's
            const readVueList = async () => {
                await page.locator('.listPanel__item, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(500);
                return page.locator('#exportSubmissions-tab').evaluate((t) => {
                    const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
                    return {heading: txt(t.querySelector('.listPanel__header, h2, .pkpHeader')), items: [...t.querySelectorAll('.listPanel__item')].map((i) => txt(i)),
                        buttons: [...t.querySelectorAll('button')].map((b) => `${txt(b)}${b.disabled ? '(disabled)' : ''}`).filter((x) => x && x !== '(disabled)')};
                }).catch((e) => ({error: flat(e.message, 200)}));
            };
            await openPubmed('Export Articles');
            o.articles = await readVueList();
            await snap(page, 'pm-02-export-articles', {facts: o.articles});
            await loc(page, 'PubMed Export Articles: the Export Articles button', page.locator('#exportSubmissions-tab').getByRole('button', {name: 'Export Articles', exact: true}));
            // the Native tool's list, for Rule 31's "the list is the one of Rules 14 and 15"
            await go(plug(A.path, 'NativeImportExportPlugin'));
            await page.locator('#importExportTabs [role=tab], [role=tab]').filter({hasText: /^\s*Export Articles\s*$/}).first().click().catch(() => {});
            await idle(page).catch(() => {});
            o.nativeArticles = await readVueList();
            await snap(page, 'pm-03-native-export-articles', {facts: o.nativeArticles});
            // td17: Export Articles with nothing ticked
            await openPubmed('Export Articles');
            await readVueList();
            o.td17articles = await pressPost(page.locator('#exportSubmissions-tab').getByRole('button', {name: 'Export Articles', exact: true}), 'pm-04-export-articles-none');
            // the Export Issues tab
            await openPubmed('Export Issues');
            await page.locator('#issuesListGridContainer tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            o.issues = await page.locator('#exportIssues-tab').evaluate((t) => {
                const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
                return {cols: [...t.querySelectorAll('thead th')].map(txt), rows: [...t.querySelectorAll('tr.gridRow')].map((r) => ({text: txt(r), box: (r.querySelector('input[type=checkbox]') || {}).value})),
                    buttons: [...t.querySelectorAll('button')].map(txt).filter(Boolean), title: txt(t.querySelector('.header h4'))};
            }).catch((e) => ({error: flat(e.message, 200)}));
            await snap(page, 'pm-05-export-issues', {facts: o.issues});
            o.td17issues = await pressPost(page.locator('#exportIssues-tab').getByRole('button', {name: 'Export Issues', exact: true}), 'pm-06-export-issues-none');
            // Rule 32: tick Vol. 1 No. 1 (published: p1, p2), then Vol. 1 No. 2 (not published: the scheduled s1)
            const issueBox = (label) => page.locator('#exportIssues-tab tr.gridRow').filter({hasText: label}).locator('input[type=checkbox]').first();
            for (const [k, label] of [['issue1', 'Vol. 1 No. 1'], ['issue2', 'Vol. 1 No. 2']]) {
                await openPubmed('Export Issues');
                await page.locator('#issuesListGridContainer tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                await issueBox(label).check().catch((e) => log('issue box', flat(e.message, 100)));
                o[`export-${k}`] = await pressPost(page.locator('#exportIssues-tab').getByRole('button', {name: 'Export Issues', exact: true}), `pm-07-export-${k}`);
            }
            // td16 end 1: never saved
            const exportP1 = async (name) => {
                await openPubmed('Export Articles');
                await readVueList();
                const box = page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: A.subs.p1.title}).locator('input[type=checkbox]').first();
                await box.check().catch((e) => log('p1 box', flat(e.message, 100)));
                return pressPost(page.locator('#exportSubmissions-tab').getByRole('button', {name: 'Export Articles', exact: true}), name);
            };
            o.td16never = await exportP1('pm-08-export-p1-never-saved');
            o.dbBefore = psql(`select setting_name, coalesce(setting_value,'<null>') from plugin_settings where context_id=${A.id} and plugin_name='pubmedexportplugin'`);
            // Rule 30: Save "J Pub Knowl"
            const saveNlm = async (value, name) => {
                await openPubmed(null);
                const box = page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]');
                await box.fill(value);
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
                await page.locator('#pubmedSettingsGridContainer').getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                const s = {post: r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 200)} : null, toast: await readToast(page, 8000)};
                await idle(page).catch(() => {}); await sleep(400);
                s.sameRead = await box.inputValue().catch(() => null);
                await snap(page, name, {facts: s});
                await openPubmed(null);
                s.afterReload = await page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]').inputValue().catch(() => null);
                s.db = psql(`select setting_name, coalesce(setting_value,'<null>') from plugin_settings where context_id=${A.id} and plugin_name='pubmedexportplugin'`);
                return s;
            };
            o.saveAbbrev = await saveNlm('J Pub Knowl', 'pm-09-save-abbrev');
            o.td16saved = await exportP1('pm-10-export-p1-saved');
            o.saveEmpty = await saveNlm('', 'pm-11-save-empty');
            o.td16cleared = await exportP1('pm-12-export-p1-cleared');
            // the box's length limit: 105 characters typed
            await openPubmed(null);
            const box = page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]');
            await box.click(); await box.pressSequentially('N'.repeat(105), {delay: 0});
            o.typed105 = (await box.inputValue().catch(() => '')).length;
            // leave with something changed and unsaved: switch tabs, come back, then leave the page
            await box.fill('K4 unsaved');
            const nt = dialogs.length;
            await page.locator('#exportTabs [role=tab]').filter({hasText: /^\s*Export Issues\s*$/}).first().click().catch(() => {});
            await sleep(800);
            await page.locator('#exportTabs [role=tab]').filter({hasText: /^\s*Settings\s*$/}).first().click().catch(() => {});
            await sleep(800);
            o.unsavedAfterTabSwitch = await box.inputValue().catch(() => null);
            o.tabSwitchDialogs = dialogs.slice(nt);
            await box.blur().catch(() => {});
            const nd = dialogs.length;
            await go(cu(A.path, '/management/tools'));
            o.leaveDialogs = dialogs.slice(nd);
            await openPubmed(null, 'pm-13-after-leaving-unsaved');
            o.afterLeave = await page.locator('#pubmedSettingsGridContainer input[name=nlmTitle]').inputValue().catch(() => null);
            fact('pubmed', o);
            markDone('pubmed');
        });

        // ================================================================== formsweep (A): the two Settings tabs' "Cancel" and the tab-switch question
        if (!done('formsweep')) await sect('formsweep', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            for (const [tool, tabsId, boxSel, other] of [['PubMedExportPlugin', '#exportTabs', '#pubmedSettingsGridContainer input[name=nlmTitle]', 'Export Articles'], ['DOAJExportPlugin', '#importExportTabs', '#doajSettingsForm input[name=apiKey]', 'Articles']]) {
                const r = {};
                const open = async () => { await go(plug(A.path, tool)); await page.locator(boxSel).waitFor({timeout: T}).catch(() => {}); await sleep(400); };
                const tabTo = async (name) => { await page.locator(`${tabsId} [role=tab]`).filter({hasText: new RegExp(`^\\s*${name}\\s*$`)}).first().click().catch(() => {}); await sleep(900); };
                // the tab switch with a change: answered Cancel, then OK
                for (const ans of ['dismiss', 'accept']) {
                    await open();
                    await page.locator(boxSel).fill(`k4 ${ans}`);
                    confirmAnswer = ans;
                    const nd = dialogs.length;
                    await tabTo(other);
                    r[`switch-${ans}`] = {dialogs: dialogs.slice(nd), tabs: await tabStrips(page)};
                    await tabTo('Settings');
                    r[`switch-${ans}`].boxAfterBack = await page.locator(boxSel).inputValue().catch(() => null);
                    confirmAnswer = 'accept';
                    await snap(page, `fs-${tool}-switch-${ans}`, {facts: r[`switch-${ans}`]});
                }
                // "Cancel" under the form with a change typed
                await open();
                await page.locator(boxSel).fill('k4 cancel');
                const nd = dialogs.length;
                const cancel = page.locator(`${tool === 'PubMedExportPlugin' ? '#pubmedSettingsGridContainer' : '#doajSettingsForm'} a`).filter({hasText: /^\s*Cancel\s*$/}).first();
                await loc(page, `${tool} Settings tab: the form's Cancel link`, cancel);
                await cancel.click().catch((e) => { r.cancelError = flat(e.message, 120); });
                await sleep(1500);
                r.cancel = {dialogs: dialogs.slice(nd), url: rel(page.url()), tabs: await tabStrips(page), box: await page.locator(boxSel).inputValue().catch(() => 'box gone'), boxVisible: await page.locator(boxSel).isVisible().catch(() => false)};
                await snap(page, `fs-${tool}-cancel`, {facts: r.cancel});
                await open();
                r.cancel.afterReload = await page.locator(boxSel).inputValue().catch(() => null);
                o[tool] = r;
            }
            fact('formsweep', o);
            markDone('formsweep');
        });

        // ================================================================== doaj (A, no API key): Fields, Rules 34–40, td19 (no ISSN), td20
        if (!done('doaj')) await sect('doaj', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            o.settings = await openDoaj(A, null, 'dj-01-settings');
            await loc(page, 'DOAJ Settings tab: DOAJ API Key box', page.locator('#doajSettingsForm input[name=apiKey]'));
            await loc(page, 'DOAJ Settings tab: automatic-deposit box', page.locator('#doajSettingsForm input[name=automaticRegistration]'));
            await loc(page, 'DOAJ Settings tab: Contact DOAJ for inclusion link', page.getByRole('link', {name: 'Contact DOAJ for inclusion'}));
            o.articles = await openDoaj(A, 'Articles', 'dj-02-articles');
            await loc(page, 'DOAJ Articles list grid', page.locator(listSel).first());
            await loc(page, 'DOAJ Articles: Export button', doajBtn('export'));
            await loc(page, 'DOAJ Articles: Mark registered button', doajBtn('markRegistered'));
            await loc(page, 'DOAJ Articles: validation box', page.locator('form#exportSubmissionXmlForm input[name=validation]'));
            // the filter: open, then each narrowing
            const g = page.locator(listSel).first();
            await g.locator('.header .actions a').filter({hasText: /Search/}).first().click().catch(() => {});
            await sleep(700);
            o.filterOpen = await readList();
            await snap(page, 'dj-03-filter-open', {facts: {filter: o.filterOpen.filter, visible: o.filterOpen.filterVisible}});
            o.fAuthor = await useFilter({column: 'Authors', search: 'Lovelace', issue: 'Any Issue', status: 'Any Status'}, 'dj-04-filter-author');
            o.fTitle = await useFilter({column: 'Article Title', search: 'Okapi'}, 'dj-05-filter-title');
            o.fTitleLower = await useFilter({column: 'Article Title', search: 'okapi'}, 'dj-06-filter-title-lowercase');
            o.fAuthorLower = await useFilter({column: 'Authors', search: 'lovelace'}, 'dj-06b-filter-author-lowercase');
            o.fIssue = await useFilter({column: 'Article Title', search: '', issue: 'Vol. 1 No. 1 (2025)'}, 'dj-07-filter-issue');
            o.fStatusNot = await useFilter({search: '', issue: 'Any Issue', status: 'Not Deposited'}, 'dj-08-filter-not-deposited');
            o.fStatusMarked = await useFilter({status: 'Marked registered'}, 'dj-09-filter-marked');
            // td20: the Issue link and the Author; Title link
            await openDoaj(A, 'Articles');
            const row = page.locator(listSel).first().locator('tr.gridRow').filter({hasText: A.subs.p1.title}).first();
            const issueLink = row.locator('td a').filter({hasText: /Vol\. 1 No\. 1/}).first();
            await loc(page, 'DOAJ Articles: a row\'s Issue link', issueLink);
            await issueLink.click().catch((e) => { o.issueClickError = flat(e.message, 150); });
            const dlg = page.locator('[role="dialog"]:visible').last();
            await dlg.waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(1500);
            o.issueWindow = {heading: flat(await dlg.locator('h1, h2, .pkp_modal_panel > .header, .pkpModalHeader').first().innerText().catch(() => null), 120), name: await dlg.getAttribute('aria-label').catch(() => null),
                text: flat(await dlg.innerText().catch(() => ''), 900), tabs: await dlg.locator('[role=tab]').allInnerTexts().catch(() => []), buttons: (await dlg.locator('button').allInnerTexts().catch(() => [])).map((b) => flat(b, 30)).filter(Boolean)};
            await snap(page, 'dj-10-issue-window', {facts: o.issueWindow});
            await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
            await sleep(900);
            const titleLink = page.locator(listSel).first().locator('tr.gridRow').filter({hasText: A.subs.p1.title}).first().locator('td a').filter({hasText: A.subs.p1.title}).first();
            o.titleLink = {text: flat(await titleLink.innerText().catch(() => null), 120), href: rel(await titleLink.getAttribute('href').catch(() => null))};
            await titleLink.click().catch((e) => { o.titleLink.clickError = flat(e.message, 150); });
            await page.waitForURL((u) => !/importexport/.test(u.toString()), {timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(1500);
            o.titleLink.landed = rel(page.url());
            o.titleLink.dialogHeading = flat(await wf().locator('h1, h2').first().innerText().catch(() => null), 150);
            await snap(page, 'dj-11-title-link-landing', {facts: o.titleLink});
            // Rule 39: nothing ticked
            for (const b of ['export', 'markRegistered']) {
                await openDoaj(A, 'Articles');
                o[`none-${b}`] = await pressPost(doajBtn(b), `dj-12-none-${b}`);
                o[`none-${b}`].tabs = await tabStrips(page);
            }
            // td19 on A (no ISSN): Export p3 with validation ticked, then unticked
            await openDoaj(A, 'Articles');
            await tickRows([A.subs.p3.id]);
            o.td19valid = await pressPost(doajBtn('export'), 'dj-13-export-validate-no-issn');
            o.td19valid.bodyText = await bodyText(1500);
            o.td19valid.h1 = await page.locator('h1, h2, h3').allInnerTexts().catch(() => []);
            await openDoaj(A, 'Articles');
            await tickRows([A.subs.p3.id]);
            await page.locator('form#exportSubmissionXmlForm input[name=validation]').uncheck().catch(() => {});
            o.td19novalid = await pressPost(doajBtn('export'), 'dj-14-export-novalidate-no-issn');
            // the box after the export: same page, then the tab opened afresh
            o.validationAfterExport = await page.locator('form#exportSubmissionXmlForm input[name=validation]').isChecked().catch(() => null);
            const again = await openDoaj(A, 'Articles', 'dj-15-articles-reopened');
            o.validationReopened = again.controls && again.controls.validation;
            // two rows ticked, one file
            await tickRows([A.subs.p1.id, A.subs.p2.id]);
            await page.locator('form#exportSubmissionXmlForm input[name=validation]').uncheck().catch(() => {});
            o.exportTwo = await pressPost(doajBtn('export'), 'dj-16-export-two');
            o.statusesAfterExport = await statuses(A);
            // leave the Articles tab with a row ticked: to Settings and back, then leave the page
            await openDoaj(A, 'Articles');
            await tickRows([A.subs.p1.id]);
            await page.locator('#importExportTabs [role=tab]').filter({hasText: /^\s*Settings\s*$/}).first().click().catch(() => {});
            await sleep(700);
            await page.locator('#importExportTabs [role=tab]').filter({hasText: /^\s*Articles\s*$/}).first().click().catch(() => {});
            await sleep(700);
            o.tickAfterTabSwitch = await page.locator(`${listSel.split(',')[0]} input[type=checkbox][value="${A.subs.p1.id}"]`).isChecked().catch(() => null);
            const nd = dialogs.length;
            await go(cu(A.path, '/management/tools'));
            o.leaveDialogs = dialogs.slice(nd);
            o.dbStatus = psql(`select submission_id, setting_value from submission_settings where setting_name like 'doaj::%' and submission_id in (${Object.values(A.subs).map((s) => s.id).join(',')})`);
            fact('doaj', o);
            markDone('doaj');
        });

        // ================================================================== paging (P): more than a page
        if (!done('paging')) await sect('paging', async () => {
            await as(P.u.mg, P.path);
            const o = await openDoaj(P, 'Articles', 'pg-01-articles-page1');
            const r = {rows: o.list.rows.length, paging: o.list.paging, links: o.list.pagingLinks, first: rowsBrief(o.list).slice(0, 2)};
            const next = page.locator(listSel).first().locator('.gridPaging a').filter({hasText: /^\s*(2|>|Next)\s*$/}).first();
            if (await next.count()) {
                await next.click(); await idle(page).catch(() => {}); await sleep(800);
                const l2 = await readList();
                r.page2 = {rows: l2.rows.length, paging: l2.paging, list: rowsBrief(l2)};
                await snap(page, 'pg-02-articles-page2', {facts: r.page2});
            }
            // the other end: a journal under a page (A) has no page links
            await as(A.u.mg, A.path);
            const a = await openDoaj(A, 'Articles');
            r.underAPage = {rows: a.list.rows.length, paging: a.list.paging, links: a.list.pagingLinks};
            fact('paging', r);
            markDone('paging');
        });

        // ================================================================== issn (I): td19's other end
        if (!done('issn')) await sect('issn', async () => {
            const o = {};
            await as(I.u.mg, I.path);
            await openDoaj(I, 'Articles', 'is-01-articles');
            await tickRows([I.subs.p1.id]);
            o.valid = await pressPost(doajBtn('export'), 'is-02-export-validate-issn');
            o.valid.bodyText = o.valid.download ? null : await bodyText(1500);
            fact('issn', o);
            markDone('issn');
        });

        // ================================================================== mark (A): Rule 41, the status filter
        if (!done('mark')) await sect('mark', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            await openDoaj(A, 'Articles');
            await tickRows([A.subs.p2.id]);
            o.mark = await pressPost(doajBtn('markRegistered'), 'mk-01-mark-registered');
            o.mark.tabs = await tabStrips(page);
            o.mark.sameRead = rowsBrief(await readList());
            o.afterReload = await statuses(A);
            await snap(page, 'mk-02-after-reload', {facts: o.afterReload});
            o.fMarked = await useFilter({status: 'Marked registered'}, 'mk-03-filter-marked');
            o.fNot = await useFilter({status: 'Not Deposited'}, 'mk-04-filter-not-deposited');
            o.db = psql(`select submission_id, setting_name, setting_value from submission_settings where setting_name like 'doaj::%' and submission_id in (${Object.values(A.subs).map((s) => s.id).join(',')})`);
            fact('mark', o);
            markDone('mark');
        });

        // ================================================================== settings (A): Rule 35, Settings 3, 4; Rule 38 with a key
        if (!done('settings')) await sect('settings', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            await openDoaj(A, null);
            o.saveEmpty = await saveDoajSettings({key: '', auto: false}, 'st-01-save-empty');
            await openDoaj(A, null);
            const key = page.locator('#doajSettingsForm input[name=apiKey]');
            await key.click(); await key.pressSequentially('K'.repeat(105), {delay: 0});
            o.typed105 = (await key.inputValue().catch(() => '')).length;
            // leave the Settings tab with a change unsaved: to Articles and back, then leave the page
            await key.fill('u63k4-unsaved');
            const nt = dialogs.length;
            await page.locator('#importExportTabs [role=tab]').filter({hasText: /^\s*Articles\s*$/}).first().click().catch(() => {});
            await sleep(700);
            await page.locator('#importExportTabs [role=tab]').filter({hasText: /^\s*Settings\s*$/}).first().click().catch(() => {});
            await sleep(700);
            o.unsavedAfterTabSwitch = await key.inputValue().catch(() => null);
            o.tabSwitchDialogs = dialogs.slice(nt);
            await key.blur().catch(() => {});
            let nd = dialogs.length;
            await go(cu(A.path, '/management/tools'));
            o.leaveDialogs = dialogs.slice(nd);
            await openDoaj(A, null, 'st-02-after-leaving-unsaved');
            o.afterLeaveDb = psql(`select setting_name from plugin_settings where context_id=${A.id} and plugin_name='doajexportplugin' and setting_name='apiKey' and coalesce(setting_value,'')<>''`);
            // save a dummy key and the automatic box
            o.saveKey = await saveDoajSettings({key: 'u63k4-dummy-api-key', auto: true}, 'st-03-save-key-auto');
            const re = await openDoaj(A, null, 'st-04-settings-reloaded');
            o.afterReload = {apiKey: re.settings.apiKey, auto: re.settings.auto};
            o.db = psql(`select setting_name, case when setting_name='apiKey' then length(setting_value)::text || ' chars' else setting_value end from plugin_settings where context_id=${A.id} and plugin_name='doajexportplugin'`);
            // untick the automatic box again (A must not take part in the daily deposit of the a5 phase)
            o.saveAutoOff = await saveDoajSettings({auto: false}, 'st-05-save-auto-off');
            o.dbAfter = psql(`select setting_name, case when setting_name='apiKey' then length(setting_value)::text || ' chars' else setting_value end from plugin_settings where context_id=${A.id} and plugin_name='doajexportplugin'`);
            // Rule 38 with a key; Rule 39 with Register
            o.articles = await openDoaj(A, 'Articles', 'st-06-articles-with-key');
            nd = dialogs.length;
            o.noneRegister = await pressPost(doajBtn('deposit'), 'st-07-none-register');
            o.noneRegister.dialogs = dialogs.slice(nd);
            fact('settings', o);
            markDone('settings');
        });

        // ================================================================== register (A): Rule 42's screen part, with the dummy key
        if (!done('register')) await sect('register', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            o.jobsBefore = psql(`select count(*) from jobs where payload like '%DOAJRegister%'`);
            await openDoaj(A, 'Articles');
            await tickRows([A.subs.p1.id]);
            o.register = await pressPost(doajBtn('deposit'), 'rg-01-register');
            o.register.sameRead = rowsBrief(await readList());
            o.afterReload = await statuses(A);
            await snap(page, 'rg-02-after-reload', {facts: o.afterReload});
            o.jobsAfter = psql(`select id, queue, attempts from jobs where payload like '%DOAJRegister%' order by id`);
            o.db = psql(`select submission_id, setting_name, setting_value from submission_settings where setting_name like 'doaj::%' and submission_id in (${Object.values(A.subs).map((s) => s.id).join(',')})`);
            fact('register', o);
            markDone('register');
        });

        // ================================================================== sync (A): Rule 44 (td21) — Marked registered p2, Not Deposited p3
        if (!done('sync')) await sect('sync', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            o.before = await statuses(A);
            for (const k of ['p2', 'p3']) {
                const s = A.subs[k];
                o[`${k}-version`] = await newVersion(A.path, s.id, s.pub, `sy-01-${k}-new-version`);
                if (o[`${k}-version`].newPub) o[`${k}-publish`] = await publish(A.path, s.id, o[`${k}-version`].newPub, `sy-02-${k}-publish`);
            }
            o.after = await statuses(A);
            await snap(page, 'sy-03-articles-after', {facts: o.after});
            o.db = psql(`select submission_id, setting_name, setting_value from submission_settings where setting_name like 'doaj::%' and submission_id in (${Object.values(A.subs).map((s) => s.id).join(',')})`);
            o.pubs = psql(`select submission_id, publication_id, version_major, version_minor, status from publications where submission_id in (${A.subs.p2.id},${A.subs.p3.id}) order by 1,2`);
            fact('sync', o);
            markDone('sync');
        });

        // ================================================================== sync2 (A): Rule 44's other end — a Not Deposited article (p3, no issue) gets a new published version
        if (!done('sync2')) await sect('sync2', async () => {
            const o = {};
            await as(A.u.mg, A.path);
            o.before = await statuses(A);
            const s = A.subs.p3;
            const draft = psql(`select publication_id from publications where submission_id=${s.id} and status=1 order by publication_id desc limit 1`)[0];
            o.draft = draft;
            if (draft && /^\d+$/.test(draft)) o.publish = await publish(A.path, s.id, Number(draft), 'sy-04-p3-publish-no-issue', {noIssue: true});
            else {
                o.version = await newVersion(A.path, s.id, s.pub, 'sy-04-p3-new-version');
                if (o.version.newPub) o.publish = await publish(A.path, s.id, o.version.newPub, 'sy-04-p3-publish-no-issue', {noIssue: true});
            }
            o.after = await statuses(A);
            await snap(page, 'sy-05-articles-after-p3', {facts: o.after});
            o.pubs = psql(`select submission_id, publication_id, version_major, version_minor, status from publications where submission_id=${s.id} order by 2`);
            fact('sync2', o);
            markDone('sync2');
        });

        // ================================================================== roles (A): manager-level roles, the admin; sub-editor control
        if (!done('roles')) await sect('roles', async () => {
            const o = {};
            for (const [k, user] of [['ed', A.u.ed], ['pe', A.u.pe], ['admin', 'admin'], ['se', A.u.se]]) {
                await as(user, k === 'admin' ? null : A.path);
                const r = {};
                for (const n of ['DOAJExportPlugin', 'PubMedExportPlugin']) {
                    const st = await go(plug(A.path, n));
                    r[n] = await pageLook(st);
                    if (n === 'DOAJExportPlugin' && !r[n].denied) {
                        const a = await openDoaj(A, 'Articles');
                        r[n].list = rowsBrief(a.list); r[n].buttons = a.controls && a.controls.buttons;
                    }
                    await snap(page, `ro-${k}-${n}`, {facts: r[n]});
                }
                o[k] = r;
            }
            await signOut(page).catch(() => {});
            const st = await go(plug(A.path, 'DOAJExportPlugin'));
            o.signedOut = await pageLook(st);
            await snap(page, 'ro-signed-out-doaj', {facts: o.signedOut});
            fact('roles', o);
            markDone('roles');
        });

        // ================================================================== versions (V): Rules 34, 45, Setting 5 (both ends)
        if (!done('versions')) await sect('versions', async () => {
            const o = {};
            const V = await mkCtx('V', {doiPrefix: '10.1234', doiVersioning: true, issues});
            await mkSub(V, 'v1', {title: 'Egret plume moult', ...inIssue1});
            await mkSub(V, 'v2', {title: 'Walrus haul-out timing', ...inIssue1});
            try {
                await as(V.u.mg, V.path);
                o.open = await openDoaj(V, 'Publications', 'vr-01-publications');
                // a new version of v1, published
                o.v1version = await newVersion(V.path, V.subs.v1.id, V.subs.v1.pub, 'vr-02-v1-new-version');
                if (o.v1version.newPub) o.v1publish = await publish(V.path, V.subs.v1.id, o.v1version.newPub, 'vr-03-v1-publish');
                o.after = await openDoaj(V, 'Publications', 'vr-04-publications-after-version');
                o.filter = await useFilter({column: 'Article Title', search: 'Egret'}, 'vr-05-filter');
                await openDoaj(V, 'Publications');
                o.none = await pressPost(doajBtn('markRegistered'), 'vr-06-none-mark');
                await openDoaj(V, 'Publications');
                const firstBox = page.locator(listSel).first().locator('tr.gridRow input[type=checkbox]').first();
                o.markValue = await firstBox.getAttribute('value').catch(() => null);
                await firstBox.check().catch(() => {});
                o.mark = await pressPost(doajBtn('markRegistered'), 'vr-07-mark-one');
                o.mark.list = rowsBrief(await readList());
                await openDoaj(V, 'Publications');
                await page.locator(listSel).first().locator('tr.gridRow input[type=checkbox]').first().check().catch(() => {});
                await page.locator('form#exportPublicationXmlForm input[name=validation]').uncheck().catch(() => {});
                o.export = await pressPost(doajBtn('export'), 'vr-08-export-one');
                o.db = psql(`select p.submission_id, p.publication_id, p.version_major, p.version_minor, p.status, coalesce(ps.setting_value,'-') from publications p left join publication_settings ps on ps.publication_id=p.publication_id and ps.setting_name='doaj::status' where p.submission_id in (${V.subs.v1.id},${V.subs.v2.id}) order by 1,2`);
            } finally {
                // "DOI Versioning" back to "No" on screen, then the tab again (Setting 5's other end on one journal)
                await as(V.u.mg, V.path);
                await page.goto(app.url(cu(V.path, '/management/settings/distribution')));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
                await idle(page).catch(() => {});
                const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
                await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
                const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
                await setup.getByRole('radio', {name: 'No, all versions of an article should have the same DOI.'}).check();
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await setup.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                o.restored = r ? r.status() : null;
                o.restoredDb = psql(`select setting_value from journal_settings where journal_id=${V.id} and setting_name='doiVersioning'`);
                const b = await openDoaj(V, 'Articles', 'vr-09-articles-after-no');
                o.backToNo = {tabs: b.tabs, title: b.list.title, cols: b.list.cols, rows: rowsBrief(b.list)};
            }
            fact('versions', o);
            markDone('versions');
        });

        // ================================================================== versions2 (W): Rule 45's axis — a new major version published beside the first
        if (!done('versions2')) await sect('versions2', async () => {
            const o = {};
            const W = await mkCtx('W', {doiPrefix: '10.1234', doiVersioning: true, issues});
            await mkSub(W, 'w1', {title: 'Ibex cliff balance', ...inIssue1});
            try {
                await as(W.u.mg, W.path);
                o.open = rowsBrief((await openDoaj(W, 'Publications', 'v2-01-publications')).list);
                o.major = await newVersion(W.path, W.subs.w1.id, W.subs.w1.pub, 'v2-02-w1-major-version', {major: true});
                if (o.major.newPub) o.majorPublish = await publish(W.path, W.subs.w1.id, o.major.newPub, 'v2-03-w1-major-publish');
                const a = await openDoaj(W, 'Publications', 'v2-04-publications-after-major');
                o.after = rowsBrief(a.list);
                o.links = a.list.rows.map((r) => r.links.map((l) => `${l.text} -> ${l.href}`));
                // an unpublished minor draft of the new major version: does the list keep the published one?
                o.draft = await newVersion(W.path, W.subs.w1.id, o.major.newPub, 'v2-05-w1-minor-draft');
                o.afterDraft = rowsBrief((await openDoaj(W, 'Publications', 'v2-06-publications-after-draft')).list);
                o.db = psql(`select publication_id, version_stage, version_major, version_minor, status from publications where submission_id=${W.subs.w1.id} order by 1`);
            } finally {
                await as(W.u.mg, W.path);
                await page.goto(app.url(cu(W.path, '/management/settings/distribution')));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
                await idle(page).catch(() => {});
                const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
                await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
                const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
                await setup.getByRole('radio', {name: 'No, all versions of an article should have the same DOI.'}).check();
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await setup.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                o.restored = r ? r.status() : null;
                o.restoredDb = psql(`select setting_value from journal_settings where journal_id=${W.id} and setting_name='doiVersioning'`);
            }
            fact('versions2', o);
            markDone('versions2');
        });

        // ================================================================== plugin (D): Rule 33, Setting 2 (td2)
        if (!done('plugin')) await sect('plugin', async () => {
            const o = {};
            await as(D.u.mg, D.path);
            const tools = async (name) => {
                const st = await go(cu(D.path, '/management/tools'));
                await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15000}).catch(() => {});
                const r = {status: st, list: (await page.locator('.pkp_page_importexport_plugins li a').allInnerTexts().catch(() => [])).map((x) => flat(x, 80))};
                await snap(page, name, {facts: r});
                return r;
            };
            o.plugins1 = await G.openWebsitePlugins(page, app, D.path);
            const g1 = await readGrid(page);
            o.doajRow = findRow(g1, 'doajplugin');
            await snap(page, 'pl-01-plugins', {facts: {doajRow: o.doajRow}});
            o.tools1 = await tools('pl-02-tools-ticked');
            await G.openWebsitePlugins(page, app, D.path);
            o.untick = await pressBox(page, 'doajplugin', {answer: 'OK'});
            await snap(page, 'pl-03-unticked', {facts: o.untick});
            o.tools2 = await tools('pl-04-tools-unticked');
            const st = await go(plug(D.path, 'DOAJExportPlugin'));
            o.address = await pageLook(st);
            await snap(page, 'pl-05-address-unticked', {facts: o.address});
            await G.openWebsitePlugins(page, app, D.path);
            o.rowAfter = findRow(await readGrid(page), 'doajplugin');
            fact('plugin', o);
            markDone('plugin');
        });

        // ================================================================== a5 (X, A): Rule 43, A5 — the daily task run once, outbound dead
        if (!done('a5')) await sect('a5', async () => {
            const o = {};
            await as(X.u.mg, X.path);
            await openDoaj(X, null);
            o.xSave = await saveDoajSettings({key: 'u63k4-dummy-api-key-x', auto: true}, 'a5-01-x-settings');
            o.staleFleetWide = psql(`select s.context_id, ss.submission_id, ss.setting_value from submission_settings ss join submissions s on s.submission_id=ss.submission_id where ss.setting_name='doaj::status' and ss.setting_value='stale'`);
            o.journalsWithKeyAndAuto = psql(`select context_id, setting_name, case when setting_name='apiKey' then '(set)' else setting_value end from plugin_settings where plugin_name='doajexportplugin' and setting_name in ('apiKey','automaticRegistration') and coalesce(setting_value,'') not in ('','0') order by 1,2`);
            o.before = {X: await statuses(X), A: await statuses(A)};
            o.jobsBefore = psql(`select count(*) from jobs where payload like '%DOAJRegister%'`);
            o.task = cli(['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\plugins\\generic\\doaj\\DOAJInfoSender'], 180000);
            o.jobsAfter = psql(`select id, attempts from jobs where payload like '%DOAJRegister%' order by id`);
            o.after = {X: await statuses(X), A: await statuses(A)};
            await openDoaj(A, 'Articles', 'a5-02-a-after-task');
            await openDoaj(X, 'Articles', 'a5-03-x-after-task');
            o.db = psql(`select s.context_id, ss.submission_id, ss.setting_value from submission_settings ss join submissions s on s.submission_id=ss.submission_id where ss.setting_name='doaj::status' and s.context_id in (${A.id},${X.id}) order by 1,2`);
            fact('a5', o);
            markDone('a5');
        });

        // ================================================================== jobs: the queued deposits run by the app's own worker
        if (!done('jobs')) await sect('jobs', async () => {
            const o = {};
            o.queued = psql(`select id, substring(payload from '"displayName":"([^"]+)'), attempts from jobs where queue='queue' order by id`);
            // a failed attempt comes back after a short delay and --stop-when-empty exits while it waits: run the worker three times
            o.worker = [];
            for (let i = 0; i < 3; i++) { o.worker.push(cli(['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty', '--tries=1'], 420000).replace(/api_key=[^ "&]+/g, 'api_key=…').slice(-1500)); await sleep(8000); }
            o.failed = psql(`select id, substring(payload from '"displayName":"([^"]+)'), regexp_replace(substring(exception from 1 for 200), 'api_key=[^" ]+', 'api_key=…') from failed_jobs where payload like '%DOAJRegister%' order by id desc limit 5`);
            await as(A.u.mg, A.path);
            o.after = {A: await statuses(A)};
            await snap(page, 'jb-01-a-after-worker', {facts: o.after});
            await as(X.u.mg, X.path);
            o.after.X = await statuses(X);
            await snap(page, 'jb-02-x-after-worker', {facts: o.after.X});
            o.db = psql(`select s.context_id, ss.submission_id, ss.setting_name, substring(ss.setting_value from 1 for 200) from submission_settings ss join submissions s on s.submission_id=ss.submission_id where ss.setting_name like 'doaj::%' and s.context_id in (${A.id},${X.id}) order by 1,2`);
            fact('jobs', o);
            markDone('jobs');
        });
        // ================================================================== final: the lists once the deposits' jobs have failed
        if (!done('final')) await sect('final', async () => {
            const o = {};
            o.failedJobs = psql(`select count(*) from failed_jobs where payload like '%DOAJRegister%'`);
            o.queuedJobs = psql(`select count(*) from jobs where payload like '%DOAJRegister%'`);
            await as(A.u.mg, A.path);
            o.A = await statuses(A);
            await openDoaj(A, 'Articles', 'fn-01-a-after-failed-jobs');
            o.fError = await useFilter({status: 'Error'}, 'fn-02-a-filter-error');
            await as(X.u.mg, X.path);
            o.X = await statuses(X);
            await openDoaj(X, 'Articles', 'fn-03-x-after-failed-jobs');
            fact('final', o);
            markDone('final');
        });
        fact('dialogs', dialogs);
    } finally {
        await close();
    }
});
