// U59 claim check K2 — Hosted Journals: a row's "Edit" window, one set of values (Edit / Settings wizard
// "Journal" tab / the journal's own Settings), changing "Path", "Enable ... publicly", "Order", "Remove"
// and what it leaves, the Side effects (email / notification), Settings bullet 1.
// Spec: docs/specs/U59-hosted-journals.md — Rules 8–15 (134–207), Side effects (271–294), Settings 1
// (301–304), Cross-feature lines naming edit, path, enable, order or remove, A2, A5 (and A4's wizard half,
// which Rule 10 names).
//
// Run (phases in order; state in .reports/U59/ccK2/k2-state-<app>.json, facts in k2-facts-<app>.json):
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U59/K2/k2.js
//   PHASES=seed,create,edit,values,path,wizard,enable,order,remove,mail  (default: all; RESEED=1 for a fresh seed)
// Every journal this script creates is named and pathed with its tag (prefix u59k2); no seeded journal is
// edited (publicknowledge's "Edit" is opened and closed unchanged). "Order" moves only this script's two
// journals and puts them back in the order it found.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['seed', 'create', 'edit', 'values', 'path', 'wizard', 'enable', 'order', 'remove', 'mail'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const T = 30_000;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const noun = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';
    const stateFile = path.join(outDir(), `k2-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(stateFile)) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 2));
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('k2-facts', {[k]: v}, {merge: true}); };
    const cu = (p, rest = '') => app.url(`/index.php/${p}${rest}`);

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.t) {
        const t = tag('u59k2');
        S.t = t;
        const issue = {volume: 1, number: 1, year: 2026};
        const base = (k, extra = {}) => ({name: `${t} ${k}`, acronym: `K2${k}`.slice(0, 8), country: 'CA', contactName: `K2 Contact ${k}`, contactEmail: `${t}${k.toLowerCase()}c@mail.test`, ...extra});
        const mk = async (k, {context = {}, users = [], extra = {}} = {}) => {
            const p = `${t}${k.toLowerCase()}`;
            const spec = {tag: p, context: {...base(k), ...context}, users, ...extra};
            if (isOJS && extra.withIssue) { delete spec.withIssue; spec.issues = [{...issue, published: true}]; }
            delete spec.withIssue;
            const r = await app.api.createContext(spec);
            S[k] = {key: k, path: p, id: r.contextId || r.id, name: spec.context.name, users: users.map((u) => u.username)};
            save();
            return S[k];
        };
        const item = async (C, submitter) => {
            const spec = {tag: `${C.path}s`, context: C.path, submitter, title: `${t} ${C.key} article`, published: true};
            if (isOJS) spec.issue = issue;
            if (isOMP) spec.publicationFormats = [{name: 'PDF'}];
            const r = await app.api.createSubmission(spec);
            C.item = {id: r.submissionId, pub: r.publicationId, formats: (r.publicationFormats || []).map((f) => f.id), title: spec.title};
            save();
        };
        await mk('E', {users: [{username: `${t}emgr`, roles: ['manager']}, {username: `${t}both`, roles: ['author']}]});
        await mk('F', {context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}});
        await mk('N', {context: {country: undefined}});
        const P = await mk('P', {users: [{username: `${t}pau`, roles: ['author']}], extra: {withIssue: true}}); await item(P, `${t}pau`);
        await mk('W');
        const D = await mk('D', {users: [{username: `${t}dau`, roles: ['author']}, {username: `${t}dmgr`, roles: ['manager']}], extra: {withIssue: true}}); await item(D, `${t}dau`);
        await mk('OA');
        await mk('OB');
        const R = await mk('R', {users: [{username: `${t}rau`, roles: ['author']}, {username: `${t}both`, roles: ['author']}], extra: {withIssue: true}}); await item(R, `${t}rau`);
        fact('seed', S);
        console.log(`[k2] ${app.name} seeded ${t}`);
    }
    if (!S.t) { console.log('[k2] no state; run the seed phase'); return; }
    const t = S.t;

    const {page, close} = await launch(app);
    // API traffic of the context form (useFetch tunnels PUT through POST + X-Http-Method-Override)
    const ctxCalls = [];
    page.on('request', (rq) => { if (/\/api\/v1\/contexts/.test(rq.url())) ctxCalls.push({at: Date.now(), method: rq.method(), override: rq.headers()['x-http-method-override'] || null, url: rq.url()}); });
    page.on('response', (rs) => { if (/\/api\/v1\/contexts/.test(rs.url())) { const c = [...ctxCalls].reverse().find((x) => x.url === rs.url() && x.status === undefined); if (c) c.status = rs.status(); } });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: new Date().toISOString(), url: page.url(), msg: flat(e.message, 200)}));
    const snap = async (name, extra = {}) => { const s = await screen(page); record(name, {...s, ...extra}); await shot(page, name).catch(() => {}); return s; };
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({error: String(e.message)})); await idle(page).catch(() => {}); return r && r.status ? r.status() : r; };

    // a signed-out visitor, in a browser of its own
    const visit = async (url, name) => {
        const V = await launch(app);
        try {
            const r = await V.page.goto(url).catch(() => null);
            await idle(V.page).catch(() => {});
            const s = await screen(V.page);
            record(name, s); await shot(V.page, name).catch(() => {});
            return {status: r ? r.status() : null, url: V.page.url(), title: await V.page.title(), h1: flat(await V.page.locator('h1').first().innerText().catch(() => ''), 120), body: flat(s.text.main, 600)};
        } finally { await V.close(); }
    };
    const siteHome = async (name, names) => {
        const v = await visit(app.url('/index.php/index'), name);
        const V = await launch(app);
        try {
            await V.page.goto(app.url('/index.php/index')); await idle(V.page);
            const text = await V.page.locator('body').innerText();
            return {status: v.status, url: v.url, pos: Object.fromEntries(names.map((n) => [n, text.indexOf(n)]))};
        } finally { await V.close(); }
    };

    const as = async (u) => { await signIn(page, u); await idle(page).catch(() => {}); };
    const hosted = async () => { await go(app.url('/index.php/index/en/admin/contexts')); await page.locator('tr.gridRow').first().waitFor({timeout: T}); };
    const readRows = () => page.evaluate(() => [...document.querySelectorAll('tr.gridRow')].map((r) => {
        const tds = r.querySelectorAll('td');
        return {id: r.id.replace(/.*-row-/, ''), name: (tds[0] ? tds[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings /, '').trim(), path: (tds[1] ? tds[1].innerText : '').trim(), cls: r.className, visible: r.offsetParent !== null};
    }));
    const row = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
    const rowAction = async (name, action) => {
        const r = row(name);
        await r.waitFor({timeout: T});
        const ex = r.locator('a.show_extras');
        if (await ex.count()) { await ex.click(); await sleep(400); }
        const link = r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: action, exact: true});
        await link.click();
    };
    const formDlg = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form[action*="/api/v1/contexts"]')}).last();
    const openEdit = async (name) => {
        await rowAction(name, 'Edit');
        await formDlg().locator('[id^="context-name-control"]').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        return formDlg();
    };
    const readForm = (dlg) => dlg.locator('form').first().evaluate((f) => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const out = {action: f.getAttribute('action'), method: f.getAttribute('method'), fields: []};
        f.querySelectorAll('.pkpFormField, fieldset.pkpFormField').forEach((ff) => {
            if (ff.parentElement && ff.parentElement.closest('.pkpFormField')) return;
            const label = ff.querySelector('.pkpFormFieldLabel, legend');
            const vals = [...ff.querySelectorAll('input:not([type=submit]), select, textarea')].map((i) => {
                if (i.type === 'checkbox' || i.type === 'radio') return {name: i.name, type: i.type, value: i.value, checked: i.checked, label: clean(i.closest('label') && i.closest('label').innerText)};
                if (i.tagName === 'SELECT') return {name: i.name, value: i.value, text: i.selectedOptions[0] ? clean(i.selectedOptions[0].text) : null, options: i.options.length, firstOption: i.options[0] ? clean(i.options[0].text) : null};
                const mce = window.tinymce && i.id && window.tinymce.get(i.id);
                return {name: i.name || i.id, id: i.id, value: mce ? mce.getContent() : i.value, hidden: i.offsetParent === null, required: i.required};
            });
            out.fields.push({label: clean(label && label.innerText), desc: clean((ff.querySelector('.pkpFormField__description') || {}).innerText), err: clean([...ff.querySelectorAll('.pkpFieldError, .pkpFormFieldError, [class*="FieldError"]')].map((e) => e.innerText).join(' | ')), prefix: clean((ff.querySelector('[class*="prefix"]') || {}).innerText), vals});
        });
        out.localeButtons = [...f.querySelectorAll('.pkpFormLocales button, [class*="ocales"] button')].map((b) => clean(b.innerText));
        const foot = f.querySelector('.pkpFormPage__footer, .pkpFormPages__footer, [class*="footer"]');
        out.footer = clean(foot && foot.innerText);
        out.errorsLine = clean((f.querySelector('.pkpFormErrors, [class*="FormErrors"]') || {}).innerText);
        return out;
    });
    const statusTimeline = async (dlgStart, ms = 5000) => {
        const tl = [];
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
            const open = await page.locator('[role="dialog"]:visible').filter({has: page.locator('form[action*="/api/v1/contexts"]')}).count();
            const saved = open ? await page.locator('[role="dialog"]:visible [role="status"]').evaluateAll((es) => es.map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []) : [];
            const entry = {ms: Date.now() - t0, open, status: saved.join(' / ')};
            const last = tl[tl.length - 1];
            if (!last || last.open !== entry.open || last.status !== entry.status) tl.push(entry);
            await sleep(100);
        }
        return tl;
    };
    const clickSave = async (dlg) => {
        const n0 = ctxCalls.length;
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        const tl = await statusTimeline(dlg, 4500);
        return {timeline: tl, calls: ctxCalls.slice(n0).map((c) => ({method: c.method, override: c.override, status: c.status, url: c.url.replace(app.baseURL, '')}))};
    };
    const closeDlg = async () => {
        const d = page.locator('[role="dialog"]:visible').last();
        const b = d.getByRole('button', {name: 'Close', exact: true}).first();
        if (await b.count()) await b.click().catch(() => {});
        await sleep(800);
    };
    const pageAt = async (p, sub) => {
        const url = sub === 'home' ? cu(p) : sub === 'readers' ? cu(p, '/information/readers') : sub === 'authors' ? cu(p, '/information/authors') : cu(p, sub);
        return url;
    };
    const articleUrl = (p, C) => isOJS ? cu(p, `/article/view/${C.item.id}`) : isOMP ? cu(p, `/catalog/book/${C.item.id}`) : cu(p, `/preprint/view/${C.item.id}`);
    const oaiId = (C, repo) => isOJS ? `oai:${repo}:article/${C.item.id}` : isOMP ? `oai:${repo}:publicationFormat/${(C.item.formats || [])[0]}` : `oai:${repo}:preprint/${C.item.id}`;
    const oai = async (query) => {
        const r = await page.request.get(app.url(`/index.php/index/oai?${query}`)).catch((e) => ({error: String(e.message)}));
        if (r.error) return r;
        const body = await r.text();
        return {status: r.status(), deleted: /status="deleted"/.test(body), error: (body.match(/<error code="([^"]+)">([^<]*)</) || []).slice(1).join(': ') || null, header: flat((body.match(/<header[^>]*>[\s\S]*?<\/header>/) || [''])[0], 400)};
    };
    const repoId = async () => {
        if (S.repo) return S.repo;
        const r = await page.request.get(app.url('/index.php/index/oai?verb=Identify'));
        const b = await r.text();
        S.repo = (b.match(/<repositoryIdentifier>([^<]+)</) || [])[1]; save();
        return S.repo;
    };
    const switcher = async () => {
        const sw = page.locator('header .app__contexts').first();
        if (!(await sw.count())) return {present: false};
        const btn = sw.locator('button').first();
        await btn.click().catch(() => {}); await sleep(600);
        const entries = await sw.locator('a').evaluateAll((as) => as.filter((a) => a.offsetParent !== null).map((a) => a.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
        await btn.click().catch(() => {}); await sleep(300);
        return {present: true, entries};
    };
    const tasks = async (name) => {
        const b = page.locator('header').getByRole('button', {name: /Tasks/}).first();
        const label = flat(await b.innerText().catch(() => ''), 80);
        await b.click().catch(() => {}); await sleep(1200); await idle(page).catch(() => {});
        const s = await snap(name);
        const text = s.text.dialog || '';
        await closeDlg();
        return {label, text: flat(text, 800)};
    };
    const mailSince = async (sinceIso) => {
        const res = await app.mail._get('/api/v1/messages', {limit: '100'});
        return (res.messages || []).filter((m) => new Date(m.Created) >= new Date(sinceIso)).map((m) => ({created: m.Created, subject: m.Subject, to: (m.To || []).map((x) => x.Address)}));
    };

    try {
        // ------------------------------------------------------------------ create (td14 start; Side effects "Creating a journal"; Settings 1 "unticked when Create opens")
        if (on('create') && !S.C) {
            const out = {};
            await as('admin');
            await hosted();
            out.t0 = new Date().toISOString(); S.t0 = out.t0; save();
            out.mailTotal0 = await app.mail.messageCount().catch(() => null);
            out.tasks0 = await tasks('m-00-tasks-before');
            await hosted();
            const create = page.getByRole('link', {name: new RegExp(`^Create ${noun}$`)}).first();
            await create.click();
            const cf = page.locator('[role="dialog"]:visible form').filter({has: page.locator('[id^="context-name-control"]')}).first();
            await cf.locator('[id^="context-name-control"]').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            out.createForm = await readForm(page.locator('[role="dialog"]:visible').last());
            await snap('c-01-create-window');
            const name = `${t} C`;
            const cPath = `${t}c`;
            await cf.locator('[id^="context-name-control"]').first().fill(name);
            await cf.locator('[id^="context-acronym-control"]').first().fill('K2C');
            await cf.locator('[id^="context-contactName-control"]').first().fill('K2 Contact C');
            await cf.locator('[id^="context-contactEmail-control"]').first().fill(`${t}cc@mail.test`);
            await cf.locator('select[id^="context-country-control"]').first().selectOption({label: 'Canada'});
            await cf.locator('[id^="context-urlPath-control"]').first().fill(cPath);
            const en = cf.locator('input[type="checkbox"][value="en"]').first(); if (await en.count() && !(await en.isChecked())) await en.check();
            await cf.locator('input[type="radio"][value="en"]').first().check().catch(() => {});
            const n0 = ctxCalls.length;
            await cf.getByRole('button', {name: 'Save', exact: true}).click();
            await page.waitForURL(/admin\/wizard/, {timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            out.createCalls = ctxCalls.slice(n0).map((c) => ({method: c.method, status: c.status}));
            out.landed = page.url();
            await snap('c-02-created-landing');
            const id = (page.url().match(/wizard\/(\d+)/) || [])[1];
            S.C = {key: 'C', path: cPath, id, name}; save();
            // Side effects: the switcher, Site Settings › Bulk Emails, the site's home page (not enabled)
            await hosted();
            out.rowsAfterCreate = (await readRows()).map((r) => r.name).filter((n) => n.startsWith('u59k2'));
            out.switcher = await switcher();
            await go(app.url('/index.php/index/en/admin/settings'));
            await page.locator('#setup-button').first().click().catch(() => {}); await sleep(500);
            await page.getByRole('tab', {name: 'Bulk Emails'}).first().click().catch(() => {}); await sleep(800); await idle(page);
            const bulk = await snap('c-03-site-settings-bulk-emails');
            out.bulkListsC = (bulk.text.main || '').includes(name);
            out.homeBefore = await siteHome('c-04-site-home-C-unticked', [name]);
            // Edit: tick "Enable ..." and Save, then the site's home page
            await hosted();
            const dlg = await openEdit(name);
            out.editOfC = await readForm(dlg);
            await dlg.getByRole('checkbox', {name: /appear publicly on the site/}).check();
            out.enableSave = await clickSave(dlg);
            await sleep(1500);
            out.homeAfter = await siteHome('c-05-site-home-C-ticked', [name]);
            fact('create', out);
        }

        // ------------------------------------------------------------------ edit (Rule 8, td5, A1, A2, Rule 4 via Edit, Settings 1)
        if (on('edit')) {
            const out = {};
            await as('admin');
            await hosted();
            out.rows = await readRows();
            await snap('e-00-hosted');
            // the seeded journal's "Edit", opened and closed unchanged (read only)
            let dlg = await openEdit('publicknowledge');
            out.pkForm = await readForm(dlg);
            await snap('e-01-edit-publicknowledge');
            await loc(page, 'Edit window (legacy AjaxModal in a reka dialog), its form', formDlg().locator('form').first());
            await loc(page, 'Edit window heading', formDlg().getByRole('heading', {name: 'Edit', exact: true}));
            await loc(page, 'Edit window Enable box', formDlg().getByRole('checkbox', {name: /appear publicly on the site/}));
            await closeDlg();
            // E: a scratch journal seeded with a country, one form language
            await hosted();
            dlg = await openEdit(S.E.name);
            out.eForm = await readForm(dlg);
            out.eHeading = flat(await dlg.locator('h1').first().innerText().catch(() => ''), 60);
            await snap('e-02-edit-E');
            // F: two form languages
            await closeDlg();
            await hosted();
            dlg = await openEdit(S.F.name);
            out.fForm = await readForm(dlg);
            await snap('e-03-edit-F-two-form-languages');
            await closeDlg();
            // leave with a change unsaved: type into the title and press Close
            await hosted();
            dlg = await openEdit(S.E.name);
            await dlg.locator('[id^="context-name-control"]').first().fill(`${S.E.name} UNSAVED`);
            const dialogs = [];
            const onDialog = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.dismiss().catch(() => {}); };
            page.on('dialog', onDialog);
            const pe0 = pageErrors.length;
            await closeDlg();
            await sleep(800);
            out.unsavedClose = {dialogs: [...dialogs], stillOpen: await formDlg().count(), pageErrors: pageErrors.slice(pe0)};
            await snap('e-04-edit-E-closed-unsaved');
            if (await formDlg().count()) { page.off('dialog', onDialog); page.on('dialog', (d) => d.accept().catch(() => {})); await closeDlg(); }
            page.off('dialog', onDialog);
            await hosted();
            dlg = await openEdit(S.E.name);
            out.afterUnsavedReopen = (await readForm(dlg)).fields.find((f) => /title|Name/.test(f.label));
            await closeDlg();
            // accepted save: change the title (A2 / td5)
            await hosted();
            const nameBefore = (await readRows()).find((r) => r.id === String(S.E.id));
            dlg = await openEdit(S.E.name);
            const newName = `${t} E renamed`;
            await dlg.locator('[id^="context-name-control"]').first().fill(newName);
            out.renameSave = await clickSave(dlg);
            await snap('e-05-after-rename-save');
            out.rowSamePage = (await readRows()).find((r) => r.id === String(S.E.id));
            out.rowBefore = nameBefore;
            await hosted();
            out.rowAfterReload = (await readRows()).find((r) => r.id === String(S.E.id));
            await snap('e-06-after-rename-reload');
            S.E.name = newName; save();
            // refused saves on E: empty title (client), bad email (server), bad path, taken path, path "0"
            const refusals = {};
            const tryRefusal = async (key, fn) => {
                await hosted();
                const d = await openEdit(S.E.name);
                await fn(d);
                const res = await clickSave(d);
                await sleep(500);
                const form = await readForm(d).catch(() => null);
                refusals[key] = {...res, errors: form ? form.fields.filter((f) => f.err).map((f) => `${f.label}: ${f.err}`) : null, errorsLine: form && form.errorsLine, footer: form && form.footer, stillOpen: await formDlg().count()};
                await snap(`e-07-refused-${key}`);
                if (await formDlg().count()) await closeDlg();
            };
            await tryRefusal('emptyTitle', (d) => d.locator('[id^="context-name-control"]').first().fill(''));
            await tryRefusal('badEmail', (d) => d.locator('[id^="context-contactEmail-control"]').first().fill('not-an-email'));
            await tryRefusal('badPath', (d) => d.locator('[id^="context-urlPath-control"]').first().fill('bad path!'));
            await tryRefusal('takenPath', (d) => d.locator('[id^="context-urlPath-control"]').first().fill('publicknowledge'));
            await tryRefusal('zeroPath', (d) => d.locator('[id^="context-urlPath-control"]').first().fill('0'));
            out.refusals = refusals;
            await hosted();
            out.eAfterRefusals = (await readRows()).find((r) => r.id === String(S.E.id));
            // N: never had a country; Save without changes (A1)
            await hosted();
            dlg = await openEdit(S.N.name);
            out.nForm = await readForm(dlg);
            out.nSave = await clickSave(dlg);
            await sleep(500);
            const nf = await readForm(dlg).catch(() => null);
            out.nErrors = nf ? nf.fields.filter((f) => f.err).map((f) => `${f.label}: ${f.err}`) : null;
            out.nErrorsLine = nf && nf.errorsLine;
            out.nFooter = nf && nf.footer;
            await snap('e-08-N-save-no-country');
            // then pick a country: the same Save goes through
            await dlg.locator('select[id^="context-country-control"]').first().selectOption({label: 'Iceland'});
            out.nSaveWithCountry = await clickSave(dlg);
            await snap('e-09-N-save-with-country');
            fact('edit', out);
        }

        // ------------------------------------------------------------------ values (Rule 9, td6)
        if (on('values')) {
            const out = {};
            await as('admin');
            await hosted();
            let dlg = await openEdit(S.E.name);
            const title2 = `${t} E values`;
            await dlg.locator('[id^="context-name-control"]').first().fill(title2);
            await dlg.locator('[id^="context-contactName-control"]').first().fill('K2 Principal Changed');
            await dlg.locator('[id^="context-abbreviation-control"]').first().fill('K2abbr').catch(() => {});
            // description (TinyMCE)
            const descId = await dlg.locator('textarea[id^="context-description-control"]').first().getAttribute('id').catch(() => null);
            if (descId) {
                await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, descId, {timeout: T}).catch(() => {});
                await page.evaluate(([id, v]) => { const e = window.tinymce.get(id); e.setContent(v); e.fire('change'); e.fire('input'); e.fire('keyup'); }, [descId, `<p>${t} description from Edit</p>`]);
            }
            out.editSave = await clickSave(dlg);
            S.E.name = title2; save();
            await sleep(1500);
            await hosted();
            dlg = await openEdit(S.E.name);
            out.editReopened = await readForm(dlg);
            await closeDlg();
            // the wizard's Journal tab
            await go(app.url(`/index.php/index/en/admin/wizard/${S.E.id}`));
            await page.locator('#context-button').first().click().catch(() => {});
            await sleep(800); await idle(page);
            out.wizardJournal = await page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).first().evaluate((f) => [...f.querySelectorAll('input[name], select[name], textarea')].map((i) => ({name: i.name || i.id, value: (window.tinymce && i.id && window.tinymce.get(i.id)) ? window.tinymce.get(i.id).getContent() : i.value}))).catch((e) => ({error: String(e.message)}));
            await snap('v-01-wizard-journal-after-edit');
            // the journal's own Settings as its Journal Manager
            await as(`${t}emgr`);
            await go(cu(S.E.path, '/en/management/settings/context'));
            await snap('v-02-manager-settings-journal');
            const tabRead = async (tabName, snapName) => {
                await page.getByRole('tab', {name: tabName, exact: true}).first().click().catch(() => {});
                await sleep(800); await idle(page);
                const f = page.locator('[role="tabpanel"]:visible form').first();
                const v = await f.evaluate((ff) => {
                    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    return [...ff.querySelectorAll('.pkpFormField')].map((x) => ({label: clean((x.querySelector('.pkpFormFieldLabel, legend') || {}).innerText), vals: [...x.querySelectorAll('input[name], select[name], textarea')].map((i) => (i.tagName === 'SELECT' ? (i.selectedOptions[0] ? i.selectedOptions[0].text : '') : (window.tinymce && i.id && window.tinymce.get(i.id)) ? window.tinymce.get(i.id).getContent() : (i.type === 'checkbox' ? `${i.value}:${i.checked}` : i.value)))}));
                }).catch((e) => ({error: String(e.message)}));
                await snap(snapName);
                return v;
            };
            out.masthead = await tabRead('Masthead', 'v-03-manager-masthead');
            out.contact = await tabRead('Contact', 'v-04-manager-contact');
            out.mastheadTabs = await page.getByRole('tab').evaluateAll((ts) => ts.map((x) => x.innerText.trim())).catch(() => null);
            // change "Journal Summary" on Masthead and save
            await page.getByRole('tab', {name: 'Masthead', exact: true}).first().click(); await sleep(800); await idle(page);
            const mf = page.locator('[role="tabpanel"]:visible form').first();
            const sumId = await mf.locator('textarea[id*="description"]').first().getAttribute('id').catch(() => null);
            if (sumId) {
                await page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, sumId, {timeout: T}).catch(() => {});
                await page.evaluate(([id, v]) => { const e = window.tinymce.get(id); e.setContent(v); e.fire('change'); e.fire('input'); e.fire('keyup'); }, [sumId, `<p>${t} summary from Masthead</p>`]);
            }
            await mf.getByRole('button', {name: 'Save', exact: true}).click();
            await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 10_000}).then(() => (out.mastheadSaved = true)).catch(() => (out.mastheadSaved = false));
            await snap('v-05-manager-masthead-saved');
            out.mastheadErrors = await mf.locator('.pkpFieldError, .pkpFormField__error').evaluateAll((es) => es.map((e) => e.innerText.trim())).catch(() => null);
            // as the Site Administrator: the wizard's Journal tab and the Edit window
            await as('admin');
            await go(app.url(`/index.php/index/en/admin/wizard/${S.E.id}`));
            await page.locator('#context-button').first().click().catch(() => {}); await sleep(800); await idle(page);
            out.wizardDescAfterMasthead = await page.evaluate(() => { const ed = (window.tinymce ? window.tinymce.get() : []).find((e) => /description/.test(e.id)); return ed ? ed.getContent() : null; });
            await snap('v-06-wizard-after-masthead');
            await hosted();
            dlg = await openEdit(S.E.name);
            out.editAfterMasthead = (await readForm(dlg)).fields.filter((f) => /description/i.test(f.label));
            await snap('v-07-edit-after-masthead');
            await closeDlg();
            fact('values', out);
        }

        // ------------------------------------------------------------------ path (Rule 10, td7, A5)
        if (on('path') && S.P && !S.P.newPath) {
            const out = {};
            const P = S.P;
            const oldP = P.path, newP = `${t}p2`;
            out.before = {home: await visit(cu(oldP), 'p-01-old-home-before'), article: await visit(articleUrl(oldP, P), 'p-02-old-article-before')};
            await as('admin');
            await hosted();
            const dlg = await openEdit(P.name);
            out.pathField = (await readForm(dlg)).fields.find((f) => /^Path/.test(f.label));
            await dlg.locator('[id^="context-urlPath-control"]').first().fill(newP);
            out.save = await clickSave(dlg);
            await snap('p-03-after-path-save');
            out.rowSamePage = (await readRows()).find((r) => r.id === String(P.id));
            await hosted();
            out.rowAfterReload = (await readRows()).find((r) => r.id === String(P.id));
            P.newPath = newP; P.oldPath = oldP; save();
            await signOut(page);
            out.after = {
                oldHome: await visit(cu(oldP), 'p-04-old-home-after'),
                oldArticle: await visit(articleUrl(oldP, P), 'p-05-old-article-after'),
                newHome: await visit(cu(newP), 'p-06-new-home'),
                newArticle: await visit(articleUrl(newP, P), 'p-07-new-article'),
            };
            // A5: "For Readers" and "For Authors" at the new path, and where their links lead
            for (const [k, sub] of [['readers', '/information/readers'], ['authors', '/information/authors']]) {
                await go(cu(newP, sub));
                await snap(`p-08-${k}-new-path`);
                const links = await page.locator('.page, main, .pkp_structure_main').first().locator('a').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')}))).catch(() => []);
                out[k] = {links};
            }
            const reg = out.readers.links.find((l) => /Register/i.test(l.text));
            if (reg) {
                await go(cu(newP, '/information/readers'));
                const r = page.waitForResponse((x) => x.request().isNavigationRequest(), {timeout: T}).catch(() => null);
                await page.locator('.page, main, .pkp_structure_main').first().getByRole('link', {name: 'Register'}).first().click();
                const resp = await r;
                await idle(page).catch(() => {});
                out.registerClick = {status: resp ? resp.status() : null, url: page.url(), title: await page.title()};
                await snap('p-09-readers-register-clicked');
            }
            fact('path', out);
        }

        // ------------------------------------------------------------------ wizard (Rule 10's A4 half)
        if (on('wizard') && S.W && !S.W.done) {
            const out = {};
            if (S.W.newPath) {
                // an earlier attempt already changed this journal's path: take a fresh scratch journal
                const n = (S.wn || 1) + 1; S.wn = n;
                const p = `${t}w${n}x`;
                const r = await app.api.createContext({tag: p, context: {name: `${t} W${n}`, acronym: 'K2W', country: 'CA', contactName: 'K2 Contact W', contactEmail: `${t}wc@mail.test`}});
                S.W = {key: 'W', path: p, id: r.contextId || r.id, name: `${t} W${n}`}; save();
            }
            const W = S.W;
            await as('admin');
            await go(app.url(`/index.php/index/en/admin/wizard/${W.id}`));
            await page.locator('#context-button').first().click().catch(() => {}); await sleep(800); await idle(page);
            await snap('w-01-wizard-journal');
            const jForm = () => page.locator('form').filter({has: page.locator('[id^="context-urlPath-control"]')}).first();
            const saveForm = async (form) => {
                const n0 = ctxCalls.length;
                const allResp = [];
                const onR = (r) => { if (r.request().method() !== 'GET' && /\/api\/v1\//.test(r.url())) allResp.push({status: r.status(), url: r.url().replace(app.baseURL, ''), method: r.request().method()}); };
                page.on('response', onR);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const status = [];
                for (let i = 0; i < 30; i++) {
                    const st = (await form.locator('[role="status"]').evaluateAll((es) => es.map((e) => e.innerText.trim()).filter(Boolean)).catch(() => [])).join(' / ');
                    if (st && status[status.length - 1] !== st) status.push(st);
                    await sleep(100);
                }
                page.off('response', onR);
                const errs = await page.locator('.pkpFormErrors, .pkpFieldError, .pkpNotification, [role="alert"]').evaluateAll((es) => es.filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
                return {status, errs, calls: allResp};
            };
            await jForm().locator('[id^="context-urlPath-control"]').first().fill(`${W.path}z`);
            out.pathSave = await saveForm(jForm());
            W.newPath = `${W.path}z`; save();
            await snap('w-02-after-path-save');
            await jForm().locator('[id^="context-name-control"]').first().fill(`${W.name} retitled`);
            out.titleSave = await saveForm(jForm());
            await snap('w-03-after-title-save');
            // Search Indexing
            await page.locator('#indexing-button').first().click().catch(() => {}); await sleep(800); await idle(page);
            const iForm = () => page.locator('[id="indexing"] form').first();
            const iBox = iForm().locator('textarea, input[type="text"]').first();
            await iBox.fill(`${t} indexing description`).catch(() => {});
            out.indexingSave = await saveForm(iForm());
            await snap('w-04-after-indexing-save');
            // reload and repeat the last two
            await go(app.url(`/index.php/index/en/admin/wizard/${W.id}`));
            await page.locator('#context-button').first().click().catch(() => {}); await sleep(800); await idle(page);
            out.titleAfterReload = await jForm().locator('[id^="context-name-control"]').first().inputValue().catch(() => null);
            await jForm().locator('[id^="context-name-control"]').first().fill(`${W.name} retitled2`);
            out.titleSave2 = await saveForm(jForm());
            await page.locator('#indexing-button').first().click().catch(() => {}); await sleep(800); await idle(page);
            await iForm().locator('textarea, input[type="text"]').first().fill(`${t} indexing description 2`).catch(() => {});
            out.indexingSave2 = await saveForm(iForm());
            await snap('w-05-after-reload-saves');
            W.name = `${W.name} retitled2`; save();
            // leave the wizard with a change unsaved: another tab, then another page
            await page.locator('#context-button').first().click().catch(() => {}); await sleep(600);
            await jForm().locator('[id^="context-acronym-control"]').first().fill('K2UNS');
            const dialogs = [];
            const onDialog = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            page.on('dialog', onDialog);
            await page.locator('#appearance-button').first().click().catch(() => {}); await sleep(800);
            out.leaveTab = {dialogs: [...dialogs]};
            await snap('w-06-unsaved-other-tab');
            await page.goto(app.url('/index.php/index/en/admin/contexts')).catch((e) => (out.leaveGotoErr = String(e.message)));
            await sleep(800);
            out.leavePage = {dialogs: [...dialogs], url: page.url()};
            page.off('dialog', onDialog);
            W.done = true; save();
            fact('wizard', out);
        }

        // ------------------------------------------------------------------ enable (Rule 11, td8, Side effects "Enabling or disabling")
        if (on('enable') && S.D) {
            const out = {};
            const D = S.D;
            const repo = await repoId();
            const id = oaiId(D, repo);
            out.oaiId = id;
            out.oaiBefore = await oai(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
            out.homeListBefore = await siteHome('n-01-site-home-D-enabled', [D.name]);
            await as('admin');
            await hosted();
            let dlg = await openEdit(D.name);
            await dlg.getByRole('checkbox', {name: /appear publicly on the site/}).uncheck();
            out.disableSave = await clickSave(dlg);
            await sleep(1500);
            await hosted();
            out.rowWhileDisabled = (await readRows()).find((r) => r.id === String(D.id));
            await snap('n-02-hosted-D-disabled');
            dlg = await openEdit(D.name);
            out.editWhileDisabled = (await readForm(dlg)).fields.find((f) => /Enable/.test(f.label));
            await snap('n-03-edit-D-disabled');
            await closeDlg();
            await go(app.url(`/index.php/index/en/admin/wizard/${D.id}`));
            out.wizardWhileDisabled = {url: page.url(), h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 120)};
            await snap('n-04-wizard-D-disabled');
            // admin at the journal's home page
            out.adminAtHome = {status: await go(cu(D.path)), url: page.url()};
            await snap('n-05-admin-at-D-home');
            // signed-out visitor
            out.homeListDisabled = await siteHome('n-06-site-home-D-disabled', [D.name]);
            out.visitorHome = await visit(cu(D.path), 'n-07-visitor-D-home');
            out.visitorArticle = await visit(articleUrl(D.path, D), 'n-08-visitor-D-article');
            out.visitorAbout = await visit(cu(D.path, '/about'), 'n-09-visitor-D-about');
            out.oaiDisabled = await oai(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
            // control: the journal's own manager
            await as(`${t}dmgr`);
            out.managerHome = {status: await go(cu(D.path)), url: page.url(), h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 120)};
            await snap('n-11-manager-at-D-home');
            // tick again
            await as('admin');
            await hosted();
            dlg = await openEdit(D.name);
            await dlg.getByRole('checkbox', {name: /appear publicly on the site/}).check();
            out.enableSave = await clickSave(dlg);
            await sleep(1500);
            out.homeListReenabled = await siteHome('n-12-site-home-D-reenabled', [D.name]);
            out.visitorHomeReenabled = await visit(cu(D.path), 'n-13-visitor-D-home-reenabled');
            out.oaiReenabled = await oai(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
            fact('enable', out);
        }

        // ------------------------------------------------------------------ order (Rules 12–13, td9)
        if (on('order') && S.OA && S.OB) {
            const out = {};
            const A = S.OA, B = S.OB;
            const pos = async () => { const rs = await readRows(); return {A: rs.findIndex((r) => r.id === String(A.id)), B: rs.findIndex((r) => r.id === String(B.id)), n: rs.length}; };
            const drag = async (srcName, dstName) => {
                const src = row(srcName), dst = row(dstName);
                await src.scrollIntoViewIfNeeded();
                const sb = await src.boundingBox(), db = await dst.boundingBox();
                await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
                await page.mouse.down();
                await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 - 4, {steps: 3});
                await page.mouse.move(db.x + db.width / 2, db.y + 3, {steps: 20});
                await sleep(300);
                await page.mouse.up();
                await sleep(600);
            };
            const orderBtn = () => page.getByRole('link', {name: 'Order', exact: true}).first();
            await as('admin');
            await hosted();
            out.start = await pos();
            out.orderVisible = await orderBtn().isVisible();
            await snap('o-00-hosted-before-order');
            await orderBtn().click(); await sleep(600);
            out.orderMode = await page.evaluate(() => ({
                finish: [...document.querySelectorAll('.order_finish_controls, [id*="orderFinish"], .pkp_linkaction_saveOrder, .cancelFormButton')].filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
                buttons: [...document.querySelectorAll('#contextGridContainer a, #contextGridContainer button, [id^="component-grid-admin-context"] a, [id^="component-grid-admin-context"] button')].filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                rowClasses: [...document.querySelectorAll('tr.gridRow')].slice(-3).map((r) => r.className),
                moveIcons: [...document.querySelectorAll('tr.gridRow .pkp_linkaction_moveItem')].filter((e) => e.offsetParent).length,
                arrows: [...document.querySelectorAll('tr.gridRow a.show_extras')].filter((e) => e.offsetParent).length,
                cursor: (() => { const r = document.querySelector('tr.gridRow'); return r ? getComputedStyle(r).cursor : null; })(),
            }));
            await snap('o-01-order-mode');
            await loc(page, 'Order link', orderBtn());
            await loc(page, '"Done" under the table (ordering)', page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first());
            await loc(page, '"Cancel ordering" under the table', page.getByRole('link', {name: 'Cancel ordering'}).or(page.getByRole('button', {name: 'Cancel ordering'})).first());
            // drag B above A, "Done"
            await drag(B.name, A.name);
            out.afterDrag1 = await pos();
            const doneBtn = page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first();
            const seqResp = page.waitForResponse((r) => /saveSequence|save-sequence/.test(r.url()), {timeout: T}).catch(() => null);
            await doneBtn.click();
            const sr = await seqResp;
            out.doneResponse = sr ? {status: sr.status(), url: sr.url().replace(app.baseURL, '')} : null;
            await sleep(1000); await idle(page);
            out.afterDoneSamePage = await pos();
            await snap('o-02-after-done');
            await hosted();
            out.afterDoneReload = await pos();
            // the site's home page, the site-level Register page, the switcher
            out.siteHome = await siteHome('o-03-site-home-after-done', [A.name, B.name]);
            const reg = await visit(app.url('/index.php/index/user/register'), 'o-04-site-register-after-done');
            out.register = {status: reg.status, A: reg.body.indexOf(A.name), B: reg.body.indexOf(B.name)};
            const V = await launch(app);
            try { await V.page.goto(app.url('/index.php/index/user/register')); await idle(V.page); const txt = await V.page.locator('body').innerText(); out.register = {...out.register, A: txt.indexOf(A.name), B: txt.indexOf(B.name)}; } finally { await V.close(); }
            await go(cu(S.E.path, '/en/management/settings/context'));
            const sw = await switcher();
            out.switcher = {present: sw.present, A: (sw.entries || []).indexOf(A.name), B: (sw.entries || []).indexOf(B.name), mine: (sw.entries || []).filter((e) => e.startsWith(t))};
            await snap('o-05-switcher');
            // drag again, "Cancel ordering"
            await hosted();
            await orderBtn().click(); await sleep(600);
            await drag(A.name, B.name);
            out.afterDrag2 = await pos();
            await page.getByRole('link', {name: 'Cancel ordering'}).or(page.getByRole('button', {name: 'Cancel ordering'})).first().click();
            await sleep(800); await idle(page);
            out.afterCancel = await pos();
            out.afterCancelMode = await page.evaluate(() => ({arrows: [...document.querySelectorAll('tr.gridRow a.show_extras')].filter((e) => e.offsetParent).length, moveIcons: [...document.querySelectorAll('tr.gridRow .pkp_linkaction_moveItem')].filter((e) => e.offsetParent).length}));
            await snap('o-06-after-cancel-ordering');
            await hosted();
            out.afterCancelReload = await pos();
            // drag once more, reload without "Done"
            await orderBtn().click(); await sleep(600);
            await drag(A.name, B.name);
            out.afterDrag3 = await pos();
            await hosted();
            out.afterReloadNoDone = await pos();
            await snap('o-07-reload-without-done');
            // put them back: A above B, "Done"
            await orderBtn().click(); await sleep(600);
            await drag(A.name, B.name);
            await page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first().click();
            await sleep(1200); await idle(page);
            await hosted();
            out.restored = await pos();
            await snap('o-08-restored');
            fact('order', out);
        }

        // ------------------------------------------------------------------ remove (Rules 14–15, td10, Side effects "Removing a journal", switcher)
        if (on('remove') && S.R && !S.R.removed) {
            const out = {};
            const R = S.R;
            const repo = await repoId();
            const id = oaiId(R, repo);
            out.oaiId = id;
            out.oaiBefore = await oai(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
            out.before = {home: await visit(cu(R.path), 'r-01-R-home-before'), article: await visit(articleUrl(R.path, R), 'r-02-R-article-before')};
            // the "both" account before: its journals
            await as(`${t}both`);
            out.bothBefore = {url: page.url()};
            await snap('r-03-both-landing-before');
            await as('admin');
            await hosted();
            out.switcherBefore = (await switcher()).entries.filter((e) => e.startsWith(t));
            await hosted();
            await rowAction(R.name, 'Remove');
            const conf = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await conf.waitFor({timeout: T}); await sleep(400);
            const c = await snap('r-04-remove-confirm');
            out.confirm = {text: c.text.dialog, aria: c.aria.dialogs[c.aria.dialogs.length - 1]};
            await loc(page, 'Remove confirmation window', conf);
            await conf.getByRole('button', {name: 'Cancel', exact: true}).click();
            await sleep(800);
            out.afterCancel = {row: (await readRows()).find((r) => r.id === String(R.id)) || null};
            await hosted();
            out.afterCancelReload = {row: (await readRows()).find((r) => r.id === String(R.id)) || null};
            await rowAction(R.name, 'Remove');
            await conf.waitFor({timeout: T}); await sleep(400);
            const delResp = page.waitForResponse((r) => /delete-context|deleteContext/.test(r.url()), {timeout: 60_000}).catch(() => null);
            await page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last().getByRole('button', {name: 'OK', exact: true}).click();
            const dr = await delResp;
            out.deleteResponse = dr ? {status: dr.status(), url: dr.url().replace(app.baseURL, '')} : null;
            await sleep(1500); await idle(page);
            out.rowSamePage = (await readRows()).find((r) => r.id === String(R.id)) || null;
            await snap('r-05-after-ok');
            R.removed = true; save();
            await hosted();
            out.rowAfterReload = (await readRows()).find((r) => r.id === String(R.id)) || null;
            out.switcherAfter = (await switcher()).entries.filter((e) => e.startsWith(t));
            out.siteHome = await siteHome('r-06-site-home-after-remove', [R.name]);
            out.after = {home: await visit(cu(R.path), 'r-07-R-home-after'), article: await visit(articleUrl(R.path, R), 'r-08-R-article-after'), about: await visit(cu(R.path, '/about'), 'r-09-R-about-after')};
            out.oaiAfter = await oai(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
            // the accounts
            await signOut(page);
            let err = null;
            try { await as(`${t}rau`); } catch (e) { err = flat(e.message, 200); }
            out.rauSignIn = {err, url: page.url(), title: await page.title()};
            await snap('r-10-rau-signed-in');
            err = null;
            try { await as(`${t}both`); } catch (e) { err = flat(e.message, 200); }
            out.bothSignIn = {err, url: page.url()};
            await snap('r-11-both-signed-in');
            out.bothE = {status: await go(cu(S.E.path, '/en/submissions')), url: page.url()};
            await snap('r-12-both-at-E');
            fact('remove', out);
        }

        // ------------------------------------------------------------------ mail (td14 end): remove C, then read the mail catcher and the Tasks panel
        if (on('mail') && S.t0) {
            const out = {};
            await as('admin');
            if (S.C && !S.C.removed) {
                await hosted();
                await rowAction(S.C.name, 'Remove');
                const conf = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
                await conf.waitFor({timeout: T}); await sleep(400);
                await conf.getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(2000); await idle(page);
                S.C.removed = true; save();
                await hosted();
                out.cRowAfter = (await readRows()).find((r) => r.id === String(S.C.id)) || null;
                out.switcherAfterC = (await switcher()).entries.filter((e) => e.startsWith(t));
            }
            await sleep(3000);
            out.mail = await mailSince(S.t0);
            out.mailTotal = await app.mail.messageCount().catch(() => null);
            await hosted();
            out.tasksEnd = await tasks('m-01-tasks-after');
            fact('mail', out);
        }
    } finally {
        record(`k2-errors-${PHASES.join('-')}`, {pageErrors, ctxCalls: ctxCalls.map((c) => ({...c, url: c.url.replace(app.baseURL, '')}))}, {merge: false});
        await close();
    }
});

