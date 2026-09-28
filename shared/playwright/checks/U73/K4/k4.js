// U73 claim check, chunk K4: approving a format, making it available, published versions, what follows {OMP},
// with read-only controls on OJS and OPS (Publisher ID boxes, the galley grid has no approval or availability).
// Spec: docs/specs/U73-publication-formats-proof-terms.md — Rule 12 (254–264), Rule 14 (275–284), Rule 16 (304–309);
// Side effects "Activity Log" to "Files deleted" (367–393); Settings 1–4 (394–415); A11 (653–660);
// footnotes k, l, n, o, p, q, f-a11, td4, td20, td21, td23, td24, td28, td29.
//
//   RUN=r1 PHASES=seed,settings PROBE_FEATURE=U73 PROBE_AGENT=ccK4 node bin/probe.js omp shared/playwright/checks/U73/K4/k4.js
//   OMP phases: seed, settings, approve, log, ids, urn, dois, published, sales, follow (in that order; approve before
//   log, published before follow). "delta" repairs r1 only (its Direct Sales price was typed with fill()).
//   OJS / OPS phase: control (seeds its own scratch journal / server). RUN names the run (r1, r2): each run seeds
//   its own scratch presses (state k4-state-<RUN>-<app>.json), writes facts to k4-<RUN>-facts-<app>.json and
//   snapshots as <RUN>-<name>-<app>.json/png. A full OMP run outlasts the Bash cap: launch it detached.
//
// Scratch presses (OMP), users <p>mg (manager), <p>se (sectionEditor = Series editor), <p>le (layoutEditor), <p>au:
//   P  a new press, untouched settings. b1 Production, se and le assigned: approvals by three levels (td4), Rule 14
//      (td21), the file's History (td20), the Activity Log, deleting a format (Files deleted). b2 published with six
//      seeded formats (each with an Open Access file), se and le assigned: Rule 16 (td23), the reader's page (td28),
//      OAI. Settings read as they arrive (Publisher ID, URN plugin, DOIs).
//   I  "Publisher ID" "Enable for Publication Formats" and "Enable for Files" ticked (Settings 1, 2).
//   U  URN plugin on with "Publication Formats" and "Files" (Setting 3, td29); F  URN plugin on with "Files" alone.
//   D  DOIs unticked (Setting 4 other end). X  DOIs for "Publication Formats" (the DOIs pointer, line 390).
//   S  "Currency" USD with a manual payment method: a "Direct Sales" file's link on the reader's page.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,settings,approve,log,ids,urn,dois,published,sales,follow,pubdelete,leave,control').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k4]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k4-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k4-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const PDF = fx('omp', 'article.pdf');

    // ------------------------------------------------------------------ seed
    if (on('seed') && isOMP && !S.seeded) {
        const t = tag('u73k4');
        S.t = t;
        const staff = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kai', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'},
            {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Series'},
            {username: `${p}le`, roles: ['layoutEditor'], givenName: 'Lea', familyName: 'Layout'},
        ];
        const ctx = async (k, spec) => {
            const p = `${t}${k.toLowerCase()}`;
            const c = await app.api.createContext({tag: p, users: staff(p), ...spec});
            S[k] = {path: c.path, mg: `${p}mg`, au: `${p}au`, se: `${p}se`, le: `${p}le`, subs: {}};
        };
        const sub = async (k, s, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `K4 ${k}${s} ${t}`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null};
        };
        const prod = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
        const assigned = (k) => ({participants: [{username: S[k].se, role: 'sectionEditor'}, {username: S[k].le, role: 'layoutEditor'}]});
        const fmt = (n) => ({name: n, file: 'article.pdf'});
        await ctx('P', {});
        await sub('P', '1', {...prod, ...assigned('P')});
        await sub('P', '2', {...prod, ...assigned('P'), published: true,
            publicationFormats: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Golf'].map(fmt)});
        await sub('P', '3', {...prod, ...assigned('P'), published: true, publicationFormats: [fmt('Kilo')]});
        await ctx('I', {enablePublisherId: ['representation', 'file']});
        await sub('I', '1', prod);
        const urn = (extra) => ({plugins: {urnpubidplugin: {enabled: true, settings: {urnPrefix: 'urn:nbn:de:0000-', urnResolver: 'https://nbn-resolving.de/',
            urnNamespace: 'urn:nbn:de', urnCheckNo: false, urnSuffix: 'default', ...extra}}}});
        await ctx('U', urn({enableRepresentationURN: true, enableSubmissionFileURN: true}));
        await sub('U', '1', prod);
        await ctx('F', urn({enableSubmissionFileURN: true}));
        await sub('F', '1', prod);
        await ctx('D', {enableDois: false});
        await sub('D', '1', {...prod, publicationFormats: [{name: 'Dpdf'}]});
        await ctx('X', {enableDois: true, doiPrefix: '10.9999', enabledDoiTypes: ['publication', 'representation']});
        await sub('X', '1', {...prod, published: true, publicationFormats: [fmt('Xray')]});
        await ctx('S', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.'}});
        await sub('S', '1', {...prod, published: true, publicationFormats: [fmt('Sierra'), fmt('Tango')]});
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 2500));
        note(`ccK4 (${RUN}) [omp]: scratch presses P ${S.P.path} (new), I ${S.I.path} (Publisher ID formats+files), U ${S.U.path} (URN formats+files), F ${S.F.path} (URN files only), D ${S.D.path} (DOIs off), X ${S.X.path} (DOIs formats), S ${S.S.path} (USD); P books b1 ${S.P.subs['1'].id} (Production), b2 ${S.P.subs['2'].id} (published, six formats); managers <path>mg`);
    }
    if (isOMP && !S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key, author) => cUrl(ctx, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    const jsDialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    const notices = [];
    await page.exposeFunction('__k4Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k4Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\//.test(u)) return;
        if (m === 'GET' && !/fetch-row|fetch-category|fetch-grid|set-approved|set-available|set-proof|edit-approved|identifiers/.test(u)) return;
        let body = '';
        try { body = (await r.text()).slice(0, 600); } catch { /* */ }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 180), body: flat(body, 240)});
    });
    const postsSince = (t0) => posts.filter((p) => p.at >= t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 110)} ${p.body.slice(0, 140)}`);

    const N = (name) => `${RUN}-${name}`;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    const safe = async (label, fn) => {
        try { return await fn(); } catch (e) {
            const err = String(e.message || e).split('\n')[0].slice(0, 300);
            log(`[${app.name} ${label}] ERROR`, err);
            await snap(`err-${label.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
            return {error: err};
        }
    };
    let who = null;
    const as = async (user, ctxPath) => {
        if (who === `${user}@${ctxPath}`) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = `${user}@${ctxPath}`;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = null; };

    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    const winCount = () => page.locator(vis).count();

    async function openWf(ctx, id, key, {author = false, name} = {}) {
        await page.goto(wfUrl(ctx, id, key, author));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
        if (name) return snap(name);
        return null;
    }
    async function formatsPage(k, s, {name, author} = {}) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, `publication_${sub.pub}_publicationFormats`, {author});
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        if (name) await snap(name, {grid: info});
        return info;
    }
    async function gridInfo() {
        return wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script, style').forEach((x) => x.remove()); return c.textContent; };
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const g = d.querySelector('[id^="component-grid-catalogentry-publicationformatgrid"]');
            const above = [...d.querySelectorAll('.pkpNotification, [class*="notification"], [role="alert"], .pkp_notification')].filter(v).map((e) => f(e.textContent)).filter(Boolean);
            if (!g) return {present: false, above, text: f(d.innerText).slice(0, 800)};
            const actions = [...g.querySelectorAll('.header .actions a')].filter(v).map((a) => f(a.textContent));
            const cols = [...g.querySelectorAll('thead th')].filter(v).map((t) => f(t.textContent));
            const rows = [...g.querySelectorAll('tbody tr.gridRow')].filter(v).map((tr) => {
                const onix = tr.querySelector('.onix_code');
                const label = tr.querySelector('.label');
                return {
                    id: tr.id, kind: onix ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other',
                    tbody: tr.closest('tbody')?.id || null,
                    cells: [...tr.children].map((c) => f(tc(c))),
                    name: label ? f([...label.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('onix_code'))).map((n) => n.textContent).join('')) : null,
                    links: [...tr.querySelectorAll('a')].filter(v).map((a) => f(tc(a)) || `[${a.className.slice(0, 40)}]`),
                    href: tr.querySelector('a.pkp_linkaction_downloadFile')?.getAttribute('href') || null,
                };
            });
            // text between the page heading and the grid (the published warning)
            const pre = f(d.innerText.split('Publication Formats')[0]).slice(-400);
            return {present: true, above, pre, actions, cols, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}`);
    // A format's category body (its row, then its files' rows): matched by its name at the start of span.label.
    const cat = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${label}`)})}).first();
    const formatRow = (label) => cat(label).locator('tr.gridRow').first();
    const fileRow = (label, i = 0) => cat(label).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).nth(i);
    const rowCells = async (row) => row.evaluate((tr) => [...tr.children].map((c) => { const k = c.cloneNode(true); k.querySelectorAll('script').forEach((x) => x.remove()); return k.textContent.replace(/\s+/g, ' ').trim(); })).catch((e) => `ERR ${flat(e.message, 100)}`);
    async function rowArrow(row, press) {
        await row.waitFor({timeout: 20000});
        const id = await row.getAttribute('id');
        if (await row.locator('a.show_extras').count()) await row.locator('a.show_extras').first().click();
        await sleep(400);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const entries = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        if (press) {
            const a = ctl.getByRole('link', {name: press, exact: true}).first();
            if (!(await a.count())) return {entries, missing: press};
            await a.click();
            await idle(page);
        }
        return {entries};
    }
    async function winInfo(w = top()) {
        return w.evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const lab = d.getAttribute('aria-labelledby');
            const title = d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.textContent.trim()) || null;
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const fields = [...d.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].filter(v).map((e) => {
                const lbl = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
                return {name: e.name, type: e.type, disabled: e.disabled, value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value, label: lbl ? f(lbl.textContent) : f(e.closest('label')?.textContent)};
            });
            const buttons = [...d.querySelectorAll('button, a.pkp_button, input[type=submit], form a')].filter(v).map((b) => f(b.textContent || b.value || b.getAttribute('aria-label'))).filter(Boolean);
            const errors = [...d.querySelectorAll('label.error, .pkp_form_error, .pkpFormError')].filter(v).map((e) => f(e.textContent)).filter(Boolean);
            return {title, tabs, fields, buttons, errors, text: f(d.innerText).slice(0, 2500)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const fieldsBrief = (w) => (w.fields || []).map((x) => `${x.label || x.name}=${JSON.stringify(x.value)}${x.disabled ? '(dis)' : ''}`);
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        return w;
    }
    const nameBox = () => top().locator('input[name^="name"]:visible').first();
    async function waitForm() {
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name^="name"]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
        await idle(page); await sleep(400);
    }
    async function pressOK(label = 'OK') {
        const t0 = Date.now();
        const before = await winCount();
        await top().getByRole('button', {name: label, exact: true}).last().click();
        await sleep(1500); await idle(page); await sleep(300);
        return {windowsBefore: before, windowsAfter: await winCount(), posts: postsSince(t0), notices: noticesSince(t0), dialogs: dialogsSince(t0)};
    }
    async function closeArrow(ans = 'accept') {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        await top().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
        await sleep(1200); await idle(page);
        answer = 'dismiss';
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0)};
    }
    const reload = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(300); };
    async function addFormat(name, {remote, isbn, urlPath} = {}) {
        await grid().getByRole('link', {name: 'Add publication format'}).first().click();
        await waitForm();
        if (remote) {
            const b = top().locator('input[name="remotelyHostedContent"]').first();
            if (!(await b.isChecked())) await b.click();
            await sleep(300);
        }
        await nameBox().fill(name);
        if (remote) await top().locator('[name="remoteURL"]').first().fill(remote);
        if (isbn) await top().locator('[name="isbn13"]').first().fill(isbn);
        if (urlPath) await top().locator('[name="urlPath"]').first().fill(urlPath);
        return pressOK();
    }
    async function editFormat(label) {
        await rowArrow(formatRow(label), 'Edit');
        await waitForm();
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] [role=tab]')].some((e) => e.getClientRects().length), null, {timeout: 10000}).catch(() => {});
        return winInfo();
    }
    // the upload wizard ("Change File")
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function changeFile(label, file = PDF) {
        const t0 = Date.now();
        await formatRow(label).getByRole('link', {name: 'Change File', exact: true}).first().click();
        await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page);
        const g = wizard().locator('select[id^="genreId"]');
        if (await g.count() && await g.isVisible().catch(() => false)) {
            const genres = await g.locator('option').evaluateAll((els) => els.map((o) => o.value).filter(Boolean));
            await g.selectOption(genres[0]);
        }
        await wizard().locator('input[type="file"]').setInputFiles(file);
        const until = Date.now() + 30000;
        while (Date.now() < until) { if (await contBtn().isEnabled().catch(() => false)) break; await sleep(200); }
        for (const n of [2, 3]) {
            await contBtn().click();
            await wizard().getByRole('tab', {name: new RegExp(`^${n}\\.`)}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
        }
        await wizard().getByRole('button', {name: 'Complete', exact: true}).click();
        await wizard().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
        return {notices: noticesSince(t0)};
    }
    // A status link in a row › its window (recorded) › a button ('OK', 'Cancel', 'Save' or null to leave it open).
    async function statusWindow(row, linkText, name, {press = 'OK', before} = {}) {
        const t0 = Date.now();
        const a = row.getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
        const w = await winSnap(name);
        if (before) await before();
        let out = {win: {title: w.title, text: flat(w.text, 900), buttons: w.buttons, fields: fieldsBrief(w)}};
        if (press) {
            const t1 = Date.now();
            const b = top().getByRole('button', {name: press, exact: true}).or(top().getByRole('link', {name: press, exact: true})).last();
            await b.click().catch((e) => { out.pressErr = flat(e.message, 200); });
            await sleep(1500); await idle(page); await sleep(400);
            out = {...out, windowsAfter: await winCount(), notices: noticesSince(t1), posts: postsSince(t1), dialogs: dialogsSince(t0)};
            if (out.windowsAfter > n0) out.leftOpen = await winInfo();
        }
        return out;
    }
    // A round trip: the link's window, the button, the row at once and after a reload.
    async function statusStep(k, s, fmt, fileIdx, linkText, name, opts = {}) {
        const row = () => (fileIdx == null ? formatRow(fmt) : fileRow(fmt, fileIdx));
        const r = await statusWindow(row(), linkText, name, opts);
        r.rowAtOnce = await rowCells(row());
        await formatsPage(k, s);
        r.rowAfterReload = await rowCells(row());
        return r;
    }
    // A file's "Edit" (its "Edit a file" window): title and tabs.
    async function fileEditTabs(fmt, name) {
        await rowArrow(fileRow(fmt), 'Edit');
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] [role=tab]')].filter((e) => e.getClientRects().length).length > 0 && [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > 1, null, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(700);
        const w = await winSnap(name);
        await closeArrow('accept');
        return {title: w.title, tabs: w.tabs};
    }
    // The workflow header's "Activity Log": the History rows.
    async function activityLog(k, s, name) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, null);
        const hdr = page.locator('[data-cy="sidemodal-header"]').first();
        await hdr.getByRole('button', {name: /^Activity Log$/}).click();
        const w = page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
        await w.waitFor({timeout: T});
        await w.locator('table tbody tr, .pkp_notes_list').first().waitFor({timeout: 45000}).catch(() => {});
        await idle(page); await sleep(400);
        const tabs = await w.locator('.pkp_controllers_informationCenter > ul > li').allInnerTexts().catch(() => []);
        const hist = w.locator('.pkp_controllers_informationCenter > ul > li > a').filter({hasText: /^\s*History\s*$/}).first();
        if (await hist.count()) { await hist.click(); await idle(page); await sleep(800); }
        const rows = await historyRows(w);
        await snap(name, {logRows: rows, tabs});
        await closeArrow('accept');
        return {tabs: tabs.map((x) => x.trim()), rows};
    }
    async function historyRows(w) {
        const table = w.locator('.ui-tabs-panel:visible table').first();
        await table.locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
        return table.evaluate((tb) => {
            const clean = (s) => (s || '').split('$(function')[0].trim().replace(/\s+/g, ' ');
            return [...tb.querySelectorAll('tbody tr.gridRow')].map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => clean(td.innerText)).join(' | '));
        }).catch(() => null);
    }
    // A format file's arrow › "More Information" › "History".
    async function fileHistory(fmt, name) {
        await rowArrow(fileRow(fmt), 'More Information');
        const w = page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
        await w.waitFor({timeout: T});
        await idle(page); await sleep(600);
        const title = await winInfo(w).then((x) => x.title).catch(() => null);
        const tabs = await w.locator('.pkp_controllers_informationCenter > ul > li').allInnerTexts().catch(() => []);
        const hist = w.locator('.pkp_controllers_informationCenter > ul > li > a').filter({hasText: /^\s*History\s*$/}).first();
        if (await hist.count()) { await hist.click(); await idle(page); await sleep(800); }
        const rows = await historyRows(w);
        await snap(name, {historyRows: rows, tabs, title});
        await closeArrow('accept');
        return {title, tabs: tabs.map((x) => x.trim()), rows};
    }
    // The reader's book page (signed out): formats, links, catalog blocks.
    async function bookPage(ctx, id, name) {
        await visitor();
        const resp = await page.goto(cUrl(ctx, `/catalog/book/${id}`));
        await idle(page);
        const data = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const root = document.querySelector('.obj_monograph_full') || document.body;
            const files = root.querySelector('.entry_details .item.files');
            const links = files ? [...files.querySelectorAll('a')].map((a) => ({text: f(a.textContent), href: a.getAttribute('href'), cls: a.className})) : [];
            const filesText = files ? f(files.innerText) : null;
            const blocks = [...root.querySelectorAll('.item.publication_format')].map((b) => f(b.innerText));
            return {filesText, links, blocks, allText: f(root.innerText).slice(0, 4000)};
        });
        await snap(name, {book: data, status: resp ? resp.status() : null});
        return {status: resp ? resp.status() : null, ...data, allText: undefined};
    }

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- settings (Settings 1–4 as a new press has them; the seeded ends)
        if (isOMP && on('settings')) {
            const out = {};
            const pidGroup = async (k, name) => safe(`pid-${k}`, async () => {
                await as(S[k].mg, S[k].path);
                await page.goto(cUrl(S[k].path, '/management/settings/workflow')); await idle(page);
                await page.locator('#metadata-button').click(); await idle(page);
                const form = page.locator('form').filter({has: page.getByRole('checkbox', {name: 'Enable keyword metadata'})});
                const group = form.getByRole('group', {name: 'Publisher ID'});
                await group.waitFor({timeout: T});
                const boxes = await group.getByRole('checkbox').evaluateAll((els) => els.map((b) => `${(b.closest('label')?.innerText || '').trim()}=${b.value}:${b.checked}`));
                await snap(name, {boxes, groupText: flat(await group.innerText(), 600)});
                return {boxes};
            });
            out.pidP = await pidGroup('P', 's-01-P-publisher-id');
            out.pidI = await pidGroup('I', 's-02-I-publisher-id');
            const urnPlugin = async (k, name) => safe(`urn-${k}`, async () => {
                await as(S[k].mg, S[k].path);
                await page.goto(cUrl(S[k].path, '/management/settings/website')); await idle(page);
                await page.locator('#plugins-button').click();
                await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
                await idle(page); await sleep(300);
                const row = page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');
                const r = {row: flat(await row.innerText().catch(() => null), 200), enabled: await row.locator('input[type=checkbox]').first().isChecked().catch(() => null)};
                await snap(`${name}-grid`, r);
                if (r.enabled) {
                    await row.locator('a.show_extras').first().click().catch(() => {});
                    await sleep(400);
                    await page.locator('#pluginGridContainer tr[id$="-row-urnpubidplugin"] + tr').getByRole('link', {name: 'Settings', exact: true}).first().click();
                    await page.locator('[role=dialog]:visible form').first().waitFor({timeout: T});
                    await idle(page); await sleep(600);
                    const w = await winSnap(`${name}-window`);
                    r.window = {title: w.title, boxes: w.fields.filter((x) => x.type === 'checkbox').map((x) => `${x.label}=${x.value}`)};
                    if (k === 'F') {
                        // "Files" alone ticked (as seeded): what "Save" does
                        const t0 = Date.now();
                        await top().getByRole('button', {name: /^(Save|OK)$/}).last().click().catch(() => {});
                        await sleep(1800); await idle(page);
                        const w2 = await winInfo();
                        r.saveFilesOnly = {windows: await winCount(), errors: w2.errors, text: flat(w2.text, 600), notices: noticesSince(t0), posts: postsSince(t0)};
                        await snap(`${name}-after-save`, {saveFilesOnly: r.saveFilesOnly});
                        // "Chapters" and "Files" ticked: the same "Save" (nothing is stored on a refusal)
                        if (await winCount()) {
                            const ch = top().locator('input[name="enableChapterURN"]').first();
                            if (await ch.count() && !(await ch.isChecked())) await ch.click();
                            const t1 = Date.now();
                            await top().getByRole('button', {name: /^(Save|OK)$/}).last().click().catch(() => {});
                            await sleep(1800); await idle(page);
                            const w3 = await winInfo();
                            r.saveChaptersFiles = {windows: await winCount(), errors: w3.errors, boxes: w3.fields.filter((x) => x.type === 'checkbox').map((x) => `${x.label}=${x.value}`), posts: postsSince(t1)};
                            await snap(`${name}-after-save-chapters`, {saveChaptersFiles: r.saveChaptersFiles});
                        }
                    }
                    if (k === 'U') {
                        // positive control: "Publication Formats" and "Files" (as seeded) › "Save"
                        const t0 = Date.now();
                        await top().getByRole('button', {name: /^(Save|OK)$/}).last().click().catch(() => {});
                        await sleep(1800); await idle(page);
                        r.saveFormatsFiles = {windows: await winCount(), errors: (await winInfo()).errors, notices: noticesSince(t0), posts: postsSince(t0).map((x) => x.slice(0, 160))};
                        await snap(`${name}-after-save`, {saveFormatsFiles: r.saveFormatsFiles});
                    }
                    if (await winCount()) await closeArrow('accept');
                }
                return r;
            });
            out.urnP = await urnPlugin('P', 's-03-P-urn');
            out.urnU = await urnPlugin('U', 's-04-U-urn');
            out.urnF = await urnPlugin('F', 's-05-F-urn');
            const doisTab = async (k, name) => safe(`dois-${k}`, async () => {
                await as(S[k].mg, S[k].path);
                await page.goto(cUrl(S[k].path, '/management/settings/distribution#dois')); await idle(page);
                await page.locator('input[name="enableDois"]').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                const r = await page.evaluate(() => {
                    const e = document.querySelector('input[name="enableDois"]');
                    const lab = e ? (e.closest('label')?.innerText || '') : null;
                    return {checked: e ? e.checked : null, label: (lab || '').replace(/\s+/g, ' ').trim(),
                        types: [...document.querySelectorAll('input[name="enabledDoiTypes"]')].filter((x) => x.getClientRects().length).map((x) => `${(x.closest('label')?.innerText || x.value).trim()}:${x.checked}`)};
                });
                await snap(name, r);
                return r;
            });
            out.doisP = await doisTab('P', 's-06-P-dois');
            out.doisD = await doisTab('D', 's-07-D-dois');
            fact('settings', out);
        }

        // ---------------------------------------------------------------- approve (Rule 12 td4, Rule 13 by level, Rule 14 td21, A11)
        if (isOMP && on('approve')) {
            const P = S.P;
            const out = {};
            for (const [key, user] of [['mg', P.mg], ['se', P.se], ['le', P.le]]) {
                out[key] = await safe(`approve-${key}`, async () => {
                    const r = {};
                    const F = `F${key}`;
                    await as(user, P.path);
                    await formatsPage('P', '1');
                    r.add = (await addFormat(F)).windowsAfter;
                    await formatsPage('P', '1');
                    r.upload = await changeFile(F);
                    await formatsPage('P', '1');
                    r.rowNew = await rowCells(formatRow(F));
                    r.fileNew = await rowCells(fileRow(F));
                    // Format Approval: Cancel first (sweep), then OK
                    r.fmtCancel = await statusStep('P', '1', F, null, 'Awaiting Approval', `a-${key}-01-format-approval-cancel`, {press: 'Cancel'});
                    r.fmtApprove = await statusStep('P', '1', F, null, 'Awaiting Approval', `a-${key}-02-format-approval`);
                    r.fmtRevoke = await statusStep('P', '1', F, null, 'Approved', `a-${key}-03-format-approved`);
                    // the file's approval (Rule 13; td4's last sentence)
                    r.fileApprove = await statusStep('P', '1', F, 0, 'Awaiting Approval', `a-${key}-04-approve-proof`);
                    r.fileRevoke = await statusStep('P', '1', F, 0, 'Approved', `a-${key}-05-revoke-proof`);
                    // Rule 14: Not Available while "Awaiting Approval" (td21), then Available
                    r.availCancel = await statusStep('P', '1', F, null, 'Not Available', `a-${key}-06-availability-cancel`, {press: 'Cancel'});
                    r.makeAvail = await statusStep('P', '1', F, null, 'Not Available', `a-${key}-07-availability`);
                    const avail = /Available/.test(JSON.stringify(r.makeAvail.rowAfterReload)) && !/Not Available/.test(JSON.stringify(r.makeAvail.rowAfterReload));
                    if (avail) {
                        // "and the reverse": approve while available, then unavailable while approved
                        r.approveWhileAvail = await statusStep('P', '1', F, null, 'Awaiting Approval', `a-${key}-08-approve-while-available`);
                        r.makeUnavail = await statusStep('P', '1', F, null, 'Available', `a-${key}-09-available-window`);
                    } else {
                        r.approveWhileNotAvail = await statusStep('P', '1', F, null, 'Awaiting Approval', `a-${key}-08-approve-while-not-available`);
                    }
                    await formatsPage('P', '1', {name: `a-${key}-10-end`});
                    // leave the format "Approved" and "Not Available" for the manager, "Awaiting Approval" otherwise
                    return r;
                });
                fact(`approve-${key}`, out[key]);
            }
            // the reverse end of Rule 14 on a fresh format, by the manager: approved first, then made available
            out.reverse = await safe('reverse', async () => {
                await as(P.mg, P.path);
                await formatsPage('P', '1');
                await addFormat('Frev');
                await formatsPage('P', '1');
                const r = {};
                r.approve = await statusStep('P', '1', 'Frev', null, 'Awaiting Approval', 'a-rev-01-approve');
                r.avail = await statusStep('P', '1', 'Frev', null, 'Not Available', 'a-rev-02-available');
                r.unavailWin = await statusStep('P', '1', 'Frev', null, 'Available', 'a-rev-03-available-window');
                return r;
            });
            fact('approve-reverse', out.reverse);
        }

        // ---------------------------------------------------------------- log (td20, Activity Log, Files deleted)
        if (isOMP && on('log')) {
            const P = S.P;
            const out = {};
            await as(P.mg, P.path);
            out.fileHistory = await safe('file-history', async () => {
                await formatsPage('P', '1');
                return fileHistory('Fmg', 'l-01-fmg-file-history');
            });
            out.activityBefore = await safe('log-before', () => activityLog('P', '1', 'l-02-activity-log'));
            // Files deleted: Fle's file, its download link before and after the delete
            out.del = await safe('delete', async () => {
                const r = {};
                await formatsPage('P', '1');
                r.fileBefore = await rowCells(fileRow('Fle'));
                const href = await fileRow('Fle').locator('a.pkp_linkaction_downloadFile').first().getAttribute('href').catch(() => null);
                const abs = href ? new URL(href.replace(/&amp;/g, '&'), page.url()).href : null;
                r.href = abs && abs.replace(/^.*index\.php\/[^/]+/, '');
                if (abs) { const x = await page.request.get(abs); r.downloadBefore = {status: x.status(), disposition: x.headers()['content-disposition'] || null, type: x.headers()['content-type'] || null}; }
                await rowArrow(formatRow('Fle'), 'Delete');
                await page.locator('[role="dialog"]:visible').filter({hasText: /Are you sure|delete/i}).last().waitFor({timeout: 10000}).catch(() => {});
                await idle(page); await sleep(500);
                const wD = await winSnap('l-03-delete-dialog');
                r.dialog = {text: flat(wD.text, 300), buttons: wD.buttons};
                r.ok = await pressOK();
                await formatsPage('P', '1', {name: 'l-04-after-delete'});
                r.grid = rowsBrief(await gridInfo());
                if (abs) { const x = await page.request.get(abs); r.downloadAfter = {status: x.status(), disposition: x.headers()['content-disposition'] || null, type: x.headers()['content-type'] || null, body: flat(await x.text().catch(() => ''), 200)}; }
                return r;
            });
            out.activityAfter = await safe('log-after', () => activityLog('P', '1', 'l-05-activity-log-after-delete'));
            fact('log', out);
        }

        // ---------------------------------------------------------------- ids (Settings 1, 2: the tabs at both ends)
        if (isOMP && on('ids')) {
            const out = {};
            for (const k of ['I', 'P']) {
                out[k] = await safe(`ids-${k}`, async () => {
                    const X = S[k];
                    const s = '1';
                    const r = {};
                    await as(X.mg, X.path);
                    await formatsPage(k, s);
                    const L = k === 'P' ? 'Fmg' : 'Local';
                    if (k === 'I') {
                        await addFormat('Local'); await formatsPage(k, s);
                        await changeFile('Local'); await formatsPage(k, s);
                        await addFormat('Remote', {remote: 'https://example.org/k4'}); await formatsPage(k, s);
                    }
                    r.localTabs = (await editFormat(L)).tabs;
                    await snap(`i-${k}-01-local-edit`);
                    await closeArrow('accept'); await formatsPage(k, s);
                    if (k === 'I') {
                        r.remoteTabs = (await editFormat('Remote')).tabs;
                        await snap(`i-${k}-02-remote-edit`);
                        await closeArrow('accept'); await formatsPage(k, s);
                    }
                    r.fileEdit = await fileEditTabs(L, `i-${k}-03-file-edit`);
                    return r;
                });
            }
            fact('ids', out);
        }

        // ---------------------------------------------------------------- urn (Setting 3, td29; Rule 12's URN step; remote has none)
        if (isOMP && on('urn')) {
            const out = {};
            for (const k of ['U', 'F']) {
                out[k] = await safe(`urn-${k}`, async () => {
                    const X = S[k];
                    const r = {};
                    await as(X.mg, X.path);
                    await formatsPage(k, '1');
                    await addFormat('Local'); await formatsPage(k, '1');
                    r.upload = await changeFile('Local'); await formatsPage(k, '1');
                    await addFormat('Remote', {remote: 'https://example.org/k4'}); await formatsPage(k, '1');
                    r.localTabs = (await editFormat('Local')).tabs;
                    await snap(`u-${k}-01-local-edit`);
                    await closeArrow('accept'); await formatsPage(k, '1');
                    r.remoteTabs = (await editFormat('Remote')).tabs;
                    await closeArrow('accept'); await formatsPage(k, '1');
                    r.fileEdit = await fileEditTabs('Local', `u-${k}-02-file-edit`);
                    await formatsPage(k, '1');
                    r.proofWin = await statusStep(k, '1', 'Local', 0, 'Awaiting Approval', `u-${k}-03-approve-proof`);
                    r.remoteApproval = await statusStep(k, '1', 'Remote', null, 'Awaiting Approval', `u-${k}-04-remote-format-approval`, {press: 'Cancel'});
                    r.localApproval = await statusStep(k, '1', 'Local', null, 'Awaiting Approval', `u-${k}-05-local-format-approval`);
                    if (k === 'U') {
                        // the URN the approval assigned: the format's Identifiers tab
                        const w = await editFormat('Local');
                        const tab = top().getByRole('tab', {name: 'Identifiers', exact: true});
                        if (await tab.count()) { await tab.click(); await idle(page); await sleep(1200); r.localIdsAfter = flat((await winInfo()).text, 700); await snap('u-U-06-local-identifiers-after'); }
                        r.localTabsAfter = w.tabs;
                        await closeArrow('accept');
                    }
                    return r;
                });
            }
            fact('urn', out);
        }

        // ---------------------------------------------------------------- dois (Setting 4 at both ends; the DOIs pointer)
        if (isOMP && on('dois')) {
            const out = {};
            const addCodeList = async (k, s, fmt, name) => safe(`code-${k}`, async () => {
                await as(S[k].mg, S[k].path);
                await formatsPage(k, s);
                await editFormat(fmt);
                await top().getByRole('tab', {name: 'Metadata', exact: true}).click();
                await top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first().waitFor({timeout: 20000});
                await idle(page); await sleep(500);
                await top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first().getByRole('link', {name: /Add Code/}).first().click();
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form select[name="code"]')].some((e) => e.getClientRects().length), null, {timeout: 20000});
                await idle(page); await sleep(400);
                const opts = await top().locator('select[name="code"] option').evaluateAll((els) => els.map((o) => o.text.trim()));
                await snap(name, {options: opts});
                await top().locator('form#addIdentificationCodeForm').getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {});
                await sleep(600);
                await closeArrow('accept');
                return {count: opts.length, doi: opts.filter((o) => /DOI/.test(o)), isbn: opts.filter((o) => /ISBN/.test(o))};
            });
            out.P = await addCodeList('P', '1', 'Fmg', 'd-01-P-add-code');
            out.D = await addCodeList('D', '1', 'Dpdf', 'd-02-D-add-code');
            out.X = await safe('dois-page', async () => {
                await as(S.X.mg, S.X.path);
                await page.goto(cUrl(S.X.path, '/dois')); await idle(page); await sleep(800);
                const b = page.getByRole('button', {name: /^Show more details about/});
                for (let i = 0; i < 10 && (await b.count()); i++) { await b.first().click().catch(() => {}); await sleep(300); }
                const s = await snap('d-03-X-dois-page');
                const txt = flat(s.text && s.text.main, 3000);
                const inputs = await page.locator('main').evaluate((m) => [...m.querySelectorAll('input[type="text"], input:not([type])')].map((i) => `${i.getAttribute('aria-label') || (i.labels && i.labels[0] && i.labels[0].innerText) || ''}=${i.value}`)).catch(() => []);
                return {text: txt, inputs};
            });
            fact('dois', out);
        }

        // ---------------------------------------------------------------- published (Rule 16 td23; td28 the reader's page; OAI)
        if (isOMP && on('published')) {
            const P = S.P;
            const b2 = P.subs['2'];
            const out = {};
            out.seededBook = await safe('book-0', () => bookPage(P.path, b2.id, 'p-01-book-seeded'));
            // editorial view, the manager
            await as(P.mg, P.path);
            const g0 = await formatsPage('P', '2', {name: 'p-02-mg-page'});
            out.mgPage = {pre: g0.pre, above: g0.above, actions: g0.actions, cols: g0.cols, rows: rowsBrief(g0)};
            out.changes = {};
            const C = out.changes;
            // Alpha: approval revoked, ISBN; the file stays "Awaiting Approval" with "Open Access"
            C.alphaRevoke = await safe('alpha', async () => statusStep('P', '2', 'Alpha', null, 'Approved', 'p-03-alpha-revoke'));
            C.alphaIsbn = await safe('alpha-isbn', async () => { await editFormat('Alpha'); await top().locator('[name="isbn13"]').first().fill('9780000000019'); const r = await pressOK(); await formatsPage('P', '2'); return r.windowsAfter; });
            // Bravo: ISBN 9780000000002, stays Approved and Available
            C.bravoIsbn = await safe('bravo-isbn', async () => { await editFormat('Bravo'); await top().locator('[name="isbn13"]').first().fill('9780000000002'); const r = await pressOK(); await formatsPage('P', '2'); return r.windowsAfter; });
            // Charlie: Not Available
            C.charlieUnavail = await safe('charlie', async () => statusStep('P', '2', 'Charlie', null, 'Available', 'p-04-charlie-unavailable'));
            // Delta: its file "Direct Sales" at 25.00 (no currency on this press)
            C.deltaSales = await safe('delta', async () => statusStep('P', '2', 'Delta', 0, 'Open Access', 'p-05-delta-terms', {press: 'Save', before: async () => {
                await top().locator('input[name="salesType"][value="directSales"]').first().check();
                // the window's own check listens to keyup/change, so type the price (fill() alone leaves "Save" greyed out)
                await top().locator('input[name="price"]').first().pressSequentially('25.00', {delay: 30});
            }}));
            // Echo: URL Path "pdf"
            C.echoPath = await safe('echo', async () => { await editFormat('Echo'); await top().locator('[name="urlPath"]').first().fill('pdf'); const r = await pressOK(); await formatsPage('P', '2'); return {closed: r.windowsAfter < r.windowsBefore, row: await rowCells(formatRow('Echo'))}; });
            // Golf: its file "Not Available"
            C.golfTerms = await safe('golf', async () => statusStep('P', '2', 'Golf', 0, 'Open Access', 'p-06-golf-terms', {press: 'Save', before: async () => {
                await top().locator('input[name="salesType"][value="notAvailable"]').first().check();
            }}));
            // Hotel: a new format on the published version (td23), a file with no terms, approved and made available
            C.hotelAdd = await safe('hotel', async () => {
                const r = {add: await addFormat('Hotel')};
                await formatsPage('P', '2');
                r.rowAtOnce = await rowCells(formatRow('Hotel'));
                r.upload = await changeFile('Hotel');
                await formatsPage('P', '2');
                r.file = await rowCells(fileRow('Hotel'));
                r.avail = await statusStep('P', '2', 'Hotel', null, 'Not Available', 'p-07-hotel-available');
                return r;
            });
            // Foxtrot: a remote format, approved and made available
            C.foxtrot = await safe('foxtrot', async () => {
                const r = {add: (await addFormat('Foxtrot', {remote: 'https://example.org/foxtrot'})).windowsAfter};
                await formatsPage('P', '2');
                r.approve = await statusStep('P', '2', 'Foxtrot', null, 'Awaiting Approval', 'p-08-foxtrot-approve');
                r.avail = await statusStep('P', '2', 'Foxtrot', null, 'Not Available', 'p-09-foxtrot-available');
                return r;
            });
            const gM = await formatsPage('P', '2', {name: 'p-10-mg-page-after'});
            out.mgAfter = rowsBrief(gM);
            // Layout Editor on the published version: the page, and an approval (Hotel)
            out.le = await safe('le', async () => {
                await as(P.le, P.path);
                const g = await formatsPage('P', '2', {name: 'p-11-le-page'});
                const r = {pre: g.pre, above: g.above, actions: g.actions, cols: g.cols, rows: rowsBrief(g)};
                r.hotelApprove = await statusStep('P', '2', 'Hotel', null, 'Awaiting Approval', 'p-12-le-hotel-approve');
                return r;
            });
            // Series editor: the page
            out.se = await safe('se', async () => {
                await as(P.se, P.path);
                const g = await formatsPage('P', '2', {name: 'p-13-se-page'});
                return {pre: g.pre, above: g.above, actions: g.actions, cols: g.cols};
            });
            // the Author's view
            out.author = await safe('author', async () => {
                await as(P.au, P.path);
                const g = await formatsPage('P', '2', {name: 'p-14-author-page', author: true});
                const s = await screen(page);
                return {pre: g.pre, above: g.above, actions: g.actions, cols: g.cols, rows: rowsBrief(g), dialogText: flat(s.text && s.text.dialog, 800)};
            });
            // the manager's view text, read from the dialog text too
            out.mgText = await safe('mg-text', async () => {
                await as(P.mg, P.path);
                await formatsPage('P', '2');
                const s = await screen(page);
                return flat(s.text && s.text.dialog, 800);
            });
            out.book = await safe('book-1', () => bookPage(P.path, b2.id, 'p-15-book-after'));
            // the reader follows the Echo link (URL Path "pdf") and the Bravo link: the view page each opens
            out.follow = await safe('follow', async () => {
                const r = [];
                for (const l of (out.book.links || []).filter((x) => /\/catalog\/view\//.test(x.href || '')).slice(0, 8)) {
                    const resp = await page.goto(l.href).catch((e) => ({err: String(e.message).slice(0, 160)}));
                    await idle(page);
                    r.push({text: l.text, href: l.href.replace(/^.*index\.php\/[^/]+/, ''), status: resp && resp.status ? resp.status() : resp, landed: page.url().replace(/^.*index\.php\/[^/]+/, ''), title: await page.title().catch(() => null)});
                }
                await snap('p-16-followed', {follow: r});
                return r;
            });
            // OAI: which formats are records
            out.oai = await safe('oai', async () => {
                const r = {};
                for (const verb of ['ListIdentifiers', 'ListRecords']) {
                    const x = await page.request.get(cUrl(P.path, `/oai?verb=${verb}&metadataPrefix=oai_dc`));
                    const body = await x.text();
                    const heads = [...body.matchAll(/<header( status="deleted")?>\s*<identifier>([^<]+)<\/identifier>/g)].map((m) => `${m[2]}${m[1] ? ' (deleted)' : ''}`);
                    const titles = verb === 'ListRecords' ? [...body.matchAll(/<dc:title[^>]*>([^<]+)<\/dc:title>/g)].map((m) => m[1]) : undefined;
                    const fmts = verb === 'ListRecords' ? [...body.matchAll(/<dc:format[^>]*>([^<]+)<\/dc:format>/g)].map((m) => m[1]) : undefined;
                    r[verb] = {status: x.status(), heads, titles, fmts, error: (body.match(/<error[^>]*>[^<]*<\/error>/) || [null])[0]};
                    fs.writeFileSync(path.join(outDir(), `${RUN}-p-17-oai-${verb}-${app.name}.xml`), body);
                }
                r.gridIds = gM.rows ? gM.rows.filter((x) => x.kind === 'format').map((x) => `${x.name}=${x.id.replace(/^.*-row-/, '')}`) : null;
                return r;
            });
            fact('published', out);
        }

        // ---------------------------------------------------------------- delta (r1 repair: Delta's "Direct Sales" 25.00, then the reader's page again)
        if (isOMP && on('delta')) {
            const P = S.P;
            const out = {};
            await as(P.mg, P.path);
            await formatsPage('P', '2');
            out.terms = await safe('delta2', () => statusStep('P', '2', 'Delta', 0, 'Open Access', 'p-05b-delta-terms', {press: 'Save', before: async () => {
                await top().locator('input[name="salesType"][value="directSales"]').first().check();
                await top().locator('input[name="price"]').first().pressSequentially('25.00', {delay: 30});
            }}));
            out.book = await safe('book-2', () => bookPage(P.path, P.subs['2'].id, 'p-15b-book-after-delta'));
            fact('delta', out);
        }

        // ---------------------------------------------------------------- sales (the "Direct Sales" link with a currency)
        if (isOMP && on('sales')) {
            const X = S.S;
            const out = {};
            out.seeded = await safe('sales-book-0', () => bookPage(X.path, X.subs['1'].id, 'q-01-book-seeded'));
            await as(X.mg, X.path);
            await formatsPage('S', '1');
            out.terms = await safe('sales-terms', () => statusStep('S', '1', 'Sierra', 0, 'Open Access', 'q-02-sierra-terms', {press: 'Save', before: async () => {
                await top().locator('input[name="salesType"][value="directSales"]').first().check();
                // the window's own check listens to keyup/change, so type the price (fill() alone leaves "Save" greyed out)
                await top().locator('input[name="price"]').first().pressSequentially('25.00', {delay: 30});
            }}));
            out.book = await safe('sales-book-1', () => bookPage(X.path, X.subs['1'].id, 'q-03-book-after'));
            fact('sales', out);
        }

        // ---------------------------------------------------------------- follow (the reader presses each priced or free link of b2 and S1)
        if (isOMP && on('follow')) {
            const out = {};
            // Hotel's file (uploaded on screen, no terms) set "Open Access" on screen: is the download's failure a seed artefact?
            out.hotelTerms = await safe('hotel-terms', async () => {
                await as(S.P.mg, S.P.path);
                await formatsPage('P', '2');
                return statusStep('P', '2', 'Hotel', 0, 'Set Terms', 'f-00-hotel-terms', {press: 'Save', before: async () => {
                    await top().locator('input[name="salesType"][value="openAccess"]').first().check();
                }});
            });
            for (const [k, id, name] of [['P', S.P.subs['2'].id, 'f-01-p'], ['S', S.S.subs['1'].id, 'f-02-s']]) {
                out[k] = await safe(`follow-${k}`, async () => {
                    const b = await bookPage(S[k].path, id, `${name}-book`);
                    const r = [];
                    for (const l of (b.links || []).filter((x) => /\/catalog\/view\//.test(x.href || ''))) {
                        const dl = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
                        const resp = await page.goto(l.href).catch((e) => ({err: String(e.message).slice(0, 120)}));
                        const d = await dl;
                        await idle(page).catch(() => {});
                        const txt = flat(await page.locator('body').innerText().catch(() => ''), 300);
                        r.push({text: l.text, href: l.href.replace(/^.*index\.php\/[^/]+/, ''), status: resp && resp.status ? resp.status() : resp, landed: page.url().replace(/^.*index\.php\/[^/]+/, ''), title: await page.title().catch(() => null), download: d ? d.suggestedFilename() : null, text300: txt});
                    }
                    await snap(`${name}-followed`, {follow: r});
                    return r;
                });
            }
            fact('follow', out);
        }

        // ---------------------------------------------------------------- pubdelete (Rule 16: "Delete" on a published version, P3's Kilo)
        if (isOMP && on('pubdelete')) {
            const P = S.P;
            const out = {};
            out.bookBefore = await safe('pd-book-0', () => bookPage(P.path, P.subs['3'].id, 'x-01-book-before'));
            await as(P.mg, P.path);
            out.del = await safe('pd-delete', async () => {
                await formatsPage('P', '3', {name: 'x-02-page'});
                const r = {arrow: await rowArrow(formatRow('Kilo'), 'Delete')};
                await page.locator('[role="dialog"]:visible').filter({hasText: /Are you sure|delete/i}).last().waitFor({timeout: 10000}).catch(() => {});
                await idle(page); await sleep(500);
                r.dialog = flat((await winSnap('x-03-delete-dialog')).text, 300);
                r.ok = await pressOK();
                const g = await formatsPage('P', '3', {name: 'x-04-after-delete'});
                r.grid = rowsBrief(g);
                return r;
            });
            out.bookAfter = await safe('pd-book-1', () => bookPage(P.path, P.subs['3'].id, 'x-05-book-after'));
            fact('pubdelete', out);
        }

        // ---------------------------------------------------------------- leave ("Format Approval" with its URN box changed, left by the header arrow)
        if (isOMP && on('leave')) {
            const U = S.U;
            const out = {};
            out.leave = await safe('leave', async () => {
                await as(U.mg, U.path);
                await formatsPage('U', '1');
                await addFormat('Leave');
                await formatsPage('U', '1');
                const r = {};
                const w = await statusWindow(formatRow('Leave'), 'Awaiting Approval', 'y-01-approval-open', {press: null});
                r.open = w.win.fields;
                const box = top().locator('input[type=checkbox]').first();
                r.hasBox = await box.count();
                if (r.hasBox) { await box.uncheck().catch(() => {}); await box.blur().catch(() => {}); }
                r.close = await closeArrow('dismiss');
                r.afterDismiss = await winInfo().then((x) => ({title: x.title, fields: fieldsBrief(x)}));
                if (r.close.windowsAfter > 1) r.close2 = await closeArrow('accept');
                await snap('y-02-after-close');
                r.row = await rowCells(formatRow('Leave'));
                await formatsPage('U', '1');
                r.rowReload = await rowCells(formatRow('Leave'));
                const w2 = await statusWindow(formatRow('Leave'), 'Awaiting Approval', 'y-03-approval-reopened', {press: 'Cancel'});
                r.reopened = w2.win.fields;
                return r;
            });
            fact('leave', out);
        }

        // ---------------------------------------------------------------- control (OJS, OPS: read-only)
        if (!isOMP && on('control')) {
            const out = {};
            const t = tag('u73k4');
            const p = `${t}j`;
            const c = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Kai', familyName: 'Manager'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'}]});
            const file = app.name === 'ops' ? 'preprint.pdf' : 'article.pdf';
            const r = await app.api.createSubmission({tag: `${p}1`, context: c.path, submitter: `${p}au`, title: `K4 J1 ${t}`,
                galleys: [{label: 'PDF', file}], published: true});
            await as(`${p}mg`, c.path);
            out.pid = await safe('pid', async () => {
                await page.goto(cUrl(c.path, '/management/settings/workflow')); await idle(page);
                await page.locator('#metadata-button').click(); await idle(page);
                const group = page.getByRole('group', {name: 'Publisher ID'});
                await group.waitFor({timeout: T});
                const boxes = await group.getByRole('checkbox').evaluateAll((els) => els.map((b) => `${(b.closest('label')?.innerText || '').trim()}=${b.value}:${b.checked}`));
                await snap('c-01-publisher-id', {boxes});
                return boxes;
            });
            out.galleys = await safe('galleys', async () => {
                await openWf(c.path, r.submissionId, `publication_${r.publicationId}_galleys`);
                await page.locator('[data-cy="galley-manager"]').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(1200);
                const s = await snap('c-02-galleys');
                const txt = flat(s.text && s.text.dialog, 1500);
                return {text: txt, approval: /Awaiting Approval|Format Approval|Approved/.test(txt), availability: /Not Available|Format Availability/.test(txt),
                    nav: await wf().evaluate((d) => [...d.querySelectorAll('nav a, nav button')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => [])};
            });
            fact('control', out);
        }
    } finally {
        await close();
    }
});
