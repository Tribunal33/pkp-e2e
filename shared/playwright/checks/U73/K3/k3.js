// U73 claim check, chunk K3: format files and their terms {OMP}, with read-only galley controls on OJS and OPS.
// Spec: docs/specs/U73-publication-formats-proof-terms.md — the terms window 141–161; Rules 9–11 (219–253);
// Rule 13 (265–274); Rule 15 (285–303); Setting 5 "Currency" (416–421); A3 (572–579); A8–A10 (623–652);
// A12 (661–671); footnotes h, i, j, k, l, m, o, p, q, f-a3, f-a8, f-a9, f-a10, f-a12, td8, td15, td18–td20,
// td22, td28, td30, td31.
//
//   RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccK3 node bin/probe.js <all|omp|ojs|ops> shared/playwright/checks/U73/K3/k3.js
//   PHASES=seed,files,windows,terms,pay,ident,reader,settings (OMP) · seed,galley (OJS, OPS). Default: all of them.
//   RUN names the run (r1, r2): each run seeds its own scratch contexts (state k3-state-<RUN>-<app>.json), writes
//   its facts to k3-<RUN>-facts-<app>.json and its snapshots as <RUN>-<name>-<app>.json/png. A full OMP run
//   outlasts the Bash cap: launch it detached (nohup … &).
//
// Scratch contexts (OMP), each with users mg (manager), au (author), rd (reader):
//   P  a new press (no currency, payments not set up).
//      p1 Production, a submission file article.pdf and a production-ready file replacement.pdf:
//         "Change File" ×3, "Select Files" (td18, td19), arrows and a file's actions (td8, Rule 11), "Approve
//         Proof" / "Revoke Proof Approval" and the file's History (td20, A12), the approval/availability windows
//         (155), the delete dialog (158); then a format "K3 Terms" for the terms window (td22, td15, td30, td31).
//      p3 published with "PDF" (file, Open Access, file awaiting approval): the book page (A10, td28 part),
//         then "Direct Sales" 25.00 and 0 on it (A9 reader side).
//   Q  payments set up (Enable, USD, "Manual Fee Payment" with instructions): q1 Production (the terms window's
//      "Price (USD)", td30; any payment notice, td31); q3 published with "PDF" at "Direct Sales" 25.00 (A9's other end).
//   F  "Enable for Files" (Publisher ID): f1 Production with "PDF" and a file: the file's "Edit" tabs (Rule 11).
// OJS / OPS: J with one galley: the galley row's menu (A3's galley comparison), read only.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'files', 'windows', 'terms', 'pay', 'ident', 'reader', 'settings', 'galley'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k3-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const PDF = fx('omp', 'article.pdf');
    const PDF2 = fx('omp', 'replacement.pdf');
    const HTMLF = fx('omp', 'article.html');

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u73k3');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${p}rd`, roles: ['reader'], givenName: 'Rae', familyName: 'Reader'},
        ];
        const ctx = async (k, spec) => {
            const p = `${t}${k.toLowerCase()}`;
            const c = await app.api.createContext({tag: p, users: people(p), ...spec});
            S[k] = {path: c.path, mg: `${p}mg`, au: `${p}au`, rd: `${p}rd`, subs: {}};
        };
        const sub = async (k, s, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `K3 ${k}${s} ${t}`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null, files: r.files || null, galleys: r.galleys || null};
        };
        if (isOMP) {
            const prod = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
            await ctx('P', {});
            await sub('P', '1', {files: [{file: 'article.pdf'}, {file: 'replacement.pdf', list: 'productionReady'}], decisions: ['skipExternalReview', 'sendToProduction']});
            await sub('P', '3', {...prod, published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
            await ctx('Q', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by bank transfer to K3.'}});
            await sub('Q', '1', prod);
            await sub('Q', '3', {...prod, published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
            await ctx('F', {enablePublisherId: ['file']});
            await sub('F', '1', {...prod, publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
        } else {
            await ctx('J', {});
            await sub('J', '1', {galleys: [{label: 'PDF', locale: 'en', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]});
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 2000));
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    // ---- browser dialogs (confirm/alert): answered by `answer`, recorded with a time
    const jsDialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // ---- page notices with a time
    const notices = [];
    await page.exposeFunction('__k3Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k3Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // ---- the grid's own posts (op, status, JSON head)
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|catalog\/(view|download)/.test(u)) return;
        if (m === 'GET' && !/fetch-row|fetch-category|fetch-grid|catalog\//.test(u)) return;
        let body = '';
        try { body = (await r.text()).slice(0, 600); } catch { /* */ }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 180), body: flat(body, 240)});
    });
    const postsSince = (t0) => posts.filter((p) => p.at >= t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 100)} ${p.body.slice(0, 140)}`);

    const N = (name) => `${RUN}-${name}`;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    let who = null;
    const as = async (user, ctxPath) => {
        if (who === `${user}@${ctxPath}`) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = `${user}@${ctxPath}`;
    };
    const out = async () => { await signOut(page).catch(() => {}); who = null; };

    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const winCount = () => page.locator(vis).count();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();

    async function openWf(ctx, id, key, name) {
        await page.goto(wfUrl(ctx, id, key));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
        if (name) return snap(name);
        return null;
    }
    async function formatsPage(k, s, name) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, `publication_${sub.pub}_publicationFormats`);
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        if (name) await snap(name, {grid: info});
        return info;
    }
    const reload = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(300); };
    // The page as data: each row's cells and links.
    async function gridInfo() {
        return wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script, style').forEach((x) => x.remove()); return c.textContent; };
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const g = d.querySelector('[id^="component-grid-catalogentry-publicationformatgrid"]');
            if (!g) return {present: false, text: f(d.innerText).slice(0, 800)};
            const rows = [...g.querySelectorAll('tbody tr')].filter(v).map((tr) => {
                if (tr.classList.contains('row_controls')) return null;
                const onix = tr.querySelector('.onix_code');
                return {
                    id: tr.id || null,
                    kind: onix ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other',
                    cells: [...tr.children].map((c) => f(tc(c))),
                    number: tr.querySelector('.file_extension') ? {text: f(tr.querySelector('.file_extension').textContent), cls: tr.querySelector('.file_extension').className} : null,
                    links: [...tr.querySelectorAll('a')].filter(v).map((a) => f(tc(a)) || `[${f(a.querySelector('.pkp_screen_reader')?.textContent) || a.className.slice(0, 40)}]`),
                };
            }).filter(Boolean);
            return {present: true, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}`);
    const fmtBody = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: label})}).first();
    const formatRow = (label) => fmtBody(label).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).first();
    const fileRow = (fmt, text, nth = 0) => fmtBody(fmt).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).nth(nth);
    async function rowArrow(row, press) {
        await row.waitFor({timeout: 20000});
        const id = await row.getAttribute('id');
        const arrow = row.locator('a.show_extras, a.hide_extras').first();
        if (!(await arrow.count())) return {arrow: false, entries: []};
        if (await row.locator('a.show_extras').count()) await row.locator('a.show_extras').first().click();
        await sleep(400);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const entries = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        if (press) {
            const a = ctl.getByRole('link', {name: press, exact: true}).first();
            if (!(await a.count())) return {arrow: true, entries, missing: press};
            await a.click();
            await idle(page);
        }
        return {arrow: true, entries};
    }
    // The top window as data.
    async function winInfo(w = top()) {
        return w.evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const lab = d.getAttribute('aria-labelledby');
            const title = d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.textContent.trim()) || null;
            const headings = [...d.querySelectorAll('h1,h2,h3,h4,legend')].filter(v).map((h) => f(h.textContent)).filter(Boolean);
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const fields = [...d.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].map((e) => {
                const id = e.id;
                const lbl = id ? d.querySelector(`label[for="${id}"]`) : null;
                return {name: e.name, id, type: e.type, visible: v(e), disabled: e.disabled, value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value, label: lbl ? f(lbl.textContent) : null};
            });
            const errors = [...d.querySelectorAll('label.error, .error, .pkp_form_error, [class*="formError"], .pkpFormError')].filter(v).map((e) => f(e.textContent)).filter(Boolean);
            const buttons = [...d.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit], form a')].filter(v).map((b) => `${f(b.textContent || b.value || b.getAttribute('aria-label'))}${b.disabled || b.getAttribute('disabled') !== null ? '(disabled)' : ''}`).filter((s) => s && s !== '(disabled)');
            return {title, headings, tabs, fields, errors, buttons, text: f(d.innerText).slice(0, 3000)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const fieldsBrief = (w) => (w.fields || []).filter((x) => x.visible || x.type === 'radio').map((x) => `${x.name || x.id}${x.label ? `〔${x.label}〕` : ''}=${JSON.stringify(x.value)}${x.disabled ? '(dis)' : ''}`);
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        log(`[${name}]`, JSON.stringify({title: w.title, headings: w.headings, tabs: w.tabs, errors: w.errors, buttons: w.buttons, fields: fieldsBrief(w), text: flat(w.text, 400)}).slice(0, 2000));
        return w;
    }
    const brief = (w) => ({title: w.title, headings: w.headings, tabs: w.tabs, text: flat(w.text, 900), buttons: w.buttons, fields: fieldsBrief(w), errors: w.errors});
    async function closeArrow(ans = 'accept') {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(1200);
        await idle(page);
        answer = 'dismiss';
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0)};
    }
    async function pressIn(label) {
        const t0 = Date.now();
        const before = await winCount();
        const b = top().getByRole('button', {name: label, exact: true}).or(top().getByRole('link', {name: label, exact: true})).last();
        let err = null;
        await b.click({timeout: 5000}).catch((e) => { err = flat(e.message, 160); });
        await sleep(1500); await idle(page); await sleep(300);
        return {pressed: label, err, windowsBefore: before, windowsAfter: await winCount(), notices: noticesSince(t0), posts: postsSince(t0), dialogs: dialogsSince(t0)};
    }
    async function waitNewWindow(n0) {
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
    }
    async function openLink(row, linkText) {
        const a = row.getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await waitNewWindow(n0);
    }

    // ---- the upload wizard ("Change File")
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function wizUpload(file, step1Name) {
        await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page); await sleep(500);
        let step1 = null;
        if (step1Name) step1 = brief(await winSnap(step1Name));
        const g = wizard().locator('select[id^="genreId"]');
        let genres = null;
        if (await g.count() && await g.isVisible().catch(() => false)) {
            genres = await g.locator('option').evaluateAll((els) => els.map((o) => ({v: o.value, t: o.text.trim()})).filter((o) => o.v));
            await g.selectOption(genres[0].v);
        }
        await wizard().locator('input[type="file"]').setInputFiles(file);
        const until = Date.now() + 30000;
        while (Date.now() < until) { if (await contBtn().isEnabled().catch(() => false)) break; await sleep(200); }
        for (const n of [2, 3]) {
            await contBtn().click();
            await wizard().getByRole('tab', {name: new RegExp(`^${n}\\.`)}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
        }
        await wizard().getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: 20000}).catch(() => {});
        await wizard().getByRole('button', {name: 'Complete', exact: true}).click();
        await wizard().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
        return {step1, genres: genres && genres.map((x) => x.t)};
    }
    async function changeFile(fmt, file, step1Name) {
        const t0 = Date.now();
        await formatRow(fmt).getByRole('link', {name: 'Change File', exact: true}).first().click();
        const wiz = await wizUpload(file, step1Name);
        await sleep(600);
        return {...wiz, notices: noticesSince(t0)};
    }
    async function addFormat(name) {
        await grid().getByRole('link', {name: 'Add publication format'}).first().click();
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name^="name"]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
        await idle(page); await sleep(400);
        await top().locator('input[name^="name"]:visible').first().fill(name);
        return pressIn('OK');
    }
    // The terms window ("Set Terms for Downloading") as data.
    const termsForm = () => page.locator('form#approvedProofForm:visible').last();
    async function termsInfo() {
        return termsForm().evaluate((f0) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const radios = [...f0.querySelectorAll('input[type=radio]')].map((r) => ({value: r.value, checked: r.checked, label: f(f0.querySelector(`label[for="${r.id}"]`)?.textContent)}));
            const price = f0.querySelector('input[id^="price"]');
            const priceLabel = price ? f(f0.querySelector(`label[for="${price.id}"]`)?.textContent) : null;
            const save = [...f0.querySelectorAll('button')].find((b) => f(b.textContent) === 'Save');
            const inPlace = f0.querySelector('[id^="approvedProofFormNotification"]');
            return {radios: radios.map((r) => `${r.value}${r.checked ? '*' : ''}`), checked: (radios.find((r) => r.checked) || {}).value || null,
                price: price ? price.value : null, priceDisabled: price ? price.disabled : null, priceLabel,
                saveDisabled: save ? (save.disabled || save.getAttribute('disabled') !== null) : 'no Save',
                inPlaceNotice: inPlace ? f(inPlace.innerText) : null, text: f(f0.innerText).slice(0, 900)};
        }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    }
    // Open a file's terms link (whatever it reads), return the window as data.
    async function openTerms(fmt, file, name, nth = 0) {
        const row = fileRow(fmt, file, nth);
        await row.waitFor({timeout: 20000});
        const link = row.locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
        const linkText = flat(await link.textContent().catch(() => null), 40);
        const n0 = await winCount();
        await link.click();
        await waitNewWindow(n0);
        await termsForm().waitFor({timeout: 20000}).catch(() => {});
        await idle(page); await sleep(500);
        const w = name ? await winSnap(name) : await winInfo();
        const info = await termsInfo();
        return {linkBefore: linkText, title: w.title, info};
    }
    async function choose(value) {
        await termsForm().locator(`input[type=radio][value="${value}"]`).click();
        await sleep(300);
    }
    async function typePrice(value) {
        const p = termsForm().locator('input[id^="price"]').first();
        await p.fill('');
        if (value) await p.pressSequentially(value, {delay: 30});
        await p.blur().catch(() => {});
        await sleep(300);
    }
    async function fileLink(fmt, file, nth = 0) {
        const row = fileRow(fmt, file, nth);
        return row.evaluate((tr) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { const c = e.cloneNode(true); c.querySelectorAll('script').forEach((x) => x.remove()); return f(c.textContent); };
            return [...tr.children].map(tc);
        }).catch((e) => `ERR ${flat(e.message, 100)}`);
    }
    // One terms case: open, choose, type, read "Save", press it, read the window and (after a reload) the link, reopen.
    async function termsCase(k, s, fmt, file, key, {salesType, price}) {
        const r = {salesType, price};
        await formatsPage(k, s);
        const o = await openTerms(fmt, file, null);
        r.linkBefore = o.linkBefore;
        r.opened = {checked: o.info.checked, price: o.info.price, priceDisabled: o.info.priceDisabled};
        await choose(salesType);
        if (price !== undefined) await typePrice(price);
        const before = await termsInfo();
        r.beforeSave = {checked: before.checked, price: before.price, priceDisabled: before.priceDisabled, saveDisabled: before.saveDisabled};
        await winSnap(`t-${key}-typed`);
        const p = await pressIn('Save');
        r.save = {err: p.err ? 'click refused (disabled)' : null, windowsBefore: p.windowsBefore, windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts, dialogs: p.dialogs};
        if (p.windowsAfter >= p.windowsBefore) {
            const w = await winSnap(`t-${key}-after-save`);
            r.windowAfterSave = {errors: w.errors, info: await termsInfo()};
            await closeArrow('accept');
        }
        r.rowSamePage = await fileLink(fmt, file);
        await reload();
        r.rowAfterReload = await fileLink(fmt, file);
        const re = await openTerms(fmt, file, `t-${key}-reopened`);
        r.reopened = {checked: re.info.checked, price: re.info.price, priceDisabled: re.info.priceDisabled, saveDisabled: re.info.saveDisabled};
        await closeArrow('accept');
        log(`[terms ${key}]`, JSON.stringify(r));
        return r;
    }
    // The file's "More Information" window: tabs, History rows.
    async function historyOf(fmt, file, name) {
        await rowArrow(fileRow(fmt, file), 'More Information');
        const win = page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
        await win.waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await sleep(600);
        const tabs = await win.locator('.pkp_controllers_informationCenter > ul > li').evaluateAll((lis) => lis.map((li) => `${li.innerText.trim()}${li.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
        const h = win.locator('.pkp_controllers_informationCenter > ul > li > a').filter({hasText: /^History$/}).first();
        if (await h.count()) { await h.click().catch(() => {}); await idle(page); }
        await win.locator('.ui-tabs-panel:visible table tbody tr').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await sleep(500);
        const rows = await win.locator('.ui-tabs-panel:visible table').first().evaluate((tb) => {
            const clean = (s) => (s || '').split('$(function')[0].trim().replace(/\s+/g, ' ');
            return [...tb.querySelectorAll('tbody tr.gridRow')].map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => clean(td.innerText)).join(' | '));
        }).catch(() => null);
        const title = await win.evaluate((d) => { const l = d.getAttribute('aria-labelledby'); return d.getAttribute('aria-label') || (l && document.getElementById(l)?.textContent.trim()) || null; }).catch(() => null);
        await snap(name, {history: rows, tabs, title});
        await win.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(800); await idle(page);
        return {title, tabs, rows};
    }
    // The book page as a visitor or a signed-in user: its format blocks and download links; each link followed.
    async function readBook(k, s, name, {follow = true} = {}) {
        const sub = S[k].subs[s];
        await page.goto(cUrl(S[k].path, `/catalog/book/${sub.id}`));
        await idle(page);
        const links = await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /catalog\/view|catalog\/download/.test(a.getAttribute('href') || '')).map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), cls: a.className})));
        const formats = await page.evaluate(() => [...document.querySelectorAll('.files, .item.files, .pub_format, [class*=format]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8)).catch(() => []);
        await snap(`${name}-book`, {links, formats});
        const followed = [];
        if (follow) {
            for (const l of links) {
                const t0 = Date.now();
                const resp = await page.goto(l.href).catch((e) => ({err: String(e.message).slice(0, 200)}));
                await idle(page).catch(() => {});
                await sleep(800);
                followed.push({href: l.href, status: resp && resp.status ? resp.status() : resp, url: page.url(), title: await page.title().catch(() => null),
                    text: flat(await page.locator('body').innerText().catch(() => ''), 500), responses: postsSince(t0)});
            }
            if (followed.length) await snap(`${name}-followed`, {followed});
        }
        return {links, formats, followed};
    }

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- files (Rules 9–11, 13; td8, td18–td20; 155, 158; A3, A12)
        if (isOMP && on('files')) {
            const P = S.P;
            const o = {};
            await as(P.mg, P.path);
            await formatsPage('P', '1', 'f-01-empty');
            o.addFormat = (await addFormat('K3 PDF')).notices;
            // td18: "Change File" ×3
            o.upload1 = await changeFile('K3 PDF', PDF, 'f-02-wizard-step1');
            o.rows1 = rowsBrief(await gridInfo());
            await snap('f-03-after-first-upload');
            o.upload2 = await changeFile('K3 PDF', PDF2);
            o.rows2 = rowsBrief(await gridInfo());
            await snap('f-04-after-second-upload');
            o.upload3 = await changeFile('K3 PDF', HTMLF);
            await reload();
            const g3 = await gridInfo();
            o.rows3 = rowsBrief(g3);
            o.fileNumbers = (g3.rows || []).filter((r) => r.kind === 'file').map((r) => r.number);
            await snap('f-05-after-third-upload-reloaded', {grid: g3});
            await loc(page, 'Publication Formats: "Change File" on a format row', formatRow('K3 PDF').getByRole('link', {name: 'Change File', exact: true}));
            // td19: "Select Files"
            {
                const t0 = Date.now();
                await formatRow('K3 PDF').getByRole('link', {name: 'Select Files', exact: true}).first().click();
                await page.locator('form#manageProofFilesForm:visible').waitFor({timeout: 20000}).catch(() => {});
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] #manageProofFilesForm tbody tr')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
                await idle(page); await sleep(800);
                const w = await winSnap('f-06-select-files');
                const boxes = async () => top().locator('#manageProofFilesForm tbody tr').evaluateAll((trs) => trs.filter((t) => t.getClientRects().length).map((t) => {
                    const cb = t.querySelector('input[type=checkbox]');
                    const c = t.cloneNode(true); c.querySelectorAll('script').forEach((x) => x.remove());
                    return `${cb ? (cb.checked ? '[x] ' : '[ ] ') : ''}${c.textContent.replace(/\s+/g, ' ').trim()}`;
                }));
                o.select = {title: w.title, text: flat(w.text, 1200), buttons: w.buttons, rows: await boxes()};
                await loc(page, 'Select Files: the window form', page.locator('form#manageProofFilesForm:visible'));
                // the box "Show files from all accessible workflow stages." — both ends
                const all = top().locator('input[id^="allStages"]').first();
                o.select.allStagesBox = {count: await all.count(), checked: await all.isChecked().catch(() => null), label: flat(await top().locator('label[for^="allStages"]').first().textContent().catch(() => null), 120)};
                if (await all.count()) {
                    await all.check().catch(() => {});
                    await sleep(1500); await idle(page); await sleep(500);
                    o.select.rowsAllStages = await boxes();
                    await winSnap('f-07-select-files-all-stages');
                    await all.uncheck().catch(() => {});
                    await sleep(1500); await idle(page); await sleep(500);
                    o.select.rowsUnticked = await boxes();
                }
                await loc(page, 'Select Files: "Show files from all accessible workflow stages." box', top().locator('input[id^="allStages"]'));
                const box = top().locator('#manageProofFilesForm tbody tr').filter({hasText: 'replacement.pdf'}).locator('input[type=checkbox]').first();
                if (await box.count()) await box.check().catch(() => {});
                const p = await pressIn('OK');
                o.select.ok = {windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts, dialogs: dialogsSince(t0)};
                o.select.rowsSamePage = rowsBrief(await gridInfo());
                await reload();
                const g = await gridInfo();
                o.select.rowsReloaded = rowsBrief(g);
                await snap('f-08-after-select', {grid: g});
            }
            // td19: production-ready list keeps the source file
            {
                const sub = P.subs['1'];
                await openWf(P.path, sub.id, null);
                const prod = wf().locator('nav a, nav button').filter({hasText: /^\s*Production\s*$/}).first();
                if (await prod.count()) { await prod.click().catch(() => {}); await idle(page); await sleep(800); await idle(page); }
                o.productionReady = await wf().evaluate((d) => {
                    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const h = [...d.querySelectorAll('h2, h3, h4, [class*=heading]')].find((e) => /Production Ready Files/.test(e.textContent));
                    let box = h;
                    for (let i = 0; box && i < 6 && !/replacement|No Items|No files/i.test(box.innerText || ''); i++) box = box.parentElement;
                    return box ? f(box.innerText).slice(0, 800) : null;
                }).catch(() => null);
                await snap('f-09-production-ready-after-select', {productionReady: o.productionReady});
            }
            // td19: repeat once — a second copy?
            await formatsPage('P', '1');
            {
                await formatRow('K3 PDF').getByRole('link', {name: 'Select Files', exact: true}).first().click();
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] #manageProofFilesForm tbody tr')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
                await idle(page); await sleep(800);
                const w = await winSnap('f-10-select-files-again');
                o.selectAgainList = flat(w.text, 900);
                const box = top().locator('#manageProofFilesForm tbody tr').filter({hasText: 'replacement.pdf'}).locator('input[type=checkbox]').first();
                o.selectAgainTickedAlready = await box.isChecked().catch(() => null);
                if (await box.count()) await box.check().catch(() => {});
                o.selectAgainOk = (await pressIn('OK')).notices;
                await reload();
                o.rowsAfterSecondSelect = rowsBrief(await gridInfo());
                await snap('f-11-after-second-select');
            }
            // sweep: "Select Files" left with a tick and "Cancel" (a window with a change, left unsaved)
            {
                await formatRow('K3 PDF').getByRole('link', {name: 'Select Files', exact: true}).first().click();
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] #manageProofFilesForm tbody tr')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
                await idle(page); await sleep(600);
                const box = top().locator('#manageProofFilesForm tbody tr').filter({hasText: 'replacement.pdf'}).locator('input[type=checkbox]').first();
                if (await box.count()) await box.check().catch(() => {});
                const t0 = Date.now();
                answer = 'dismiss';
                await top().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await sleep(1200); await idle(page);
                o.selectCloseWithTick = {dialogsDismissed: dialogsSince(t0), windows: await winCount()};
                if (await page.locator('form#manageProofFilesForm:visible').count()) {
                    const t1 = Date.now();
                    await top().locator('form#manageProofFilesForm').getByRole('link', {name: 'Cancel', exact: true}).or(top().locator('form#manageProofFilesForm').getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                    await sleep(1200); await idle(page);
                    o.selectCancelWithTick = {dialogs: dialogsSince(t1), windows: await winCount()};
                }
                if (await page.locator('form#manageProofFilesForm:visible').count()) await closeArrow('accept');
                await reload();
                o.rowsAfterSelectCancel = rowsBrief(await gridInfo());
            }
            // td8: arrows (format, PDF file, HTML file)
            o.arrowFormat = await rowArrow(formatRow('K3 PDF'));
            await snap('f-12-arrow-format');
            await reload();
            o.arrowPdf = await rowArrow(fileRow('K3 PDF', 'article.pdf'));
            await snap('f-13-arrow-pdf');
            await reload();
            o.arrowHtml = await rowArrow(fileRow('K3 PDF', 'article.html'));
            await snap('f-14-arrow-html');
            await loc(page, 'Format file row: the arrow before the name', fileRow('K3 PDF', 'article.html').locator('a.show_extras, a.hide_extras'));
            await reload();
            // Rule 11: "Edit" (tabs), "Dependent Files", "Delete"
            {
                const n0 = await winCount();
                await rowArrow(fileRow('K3 PDF', 'article.pdf'), 'Edit');
                await waitNewWindow(n0);
                const w = await winSnap('f-15-file-edit');
                o.fileEdit = brief(w);
                // leave with something changed: the name box
                const nameBox = top().locator('input[name^="name"]:visible').first();
                if (await nameBox.count()) {
                    await nameBox.fill('k3-renamed.pdf'); await nameBox.blur().catch(() => {});
                    o.fileEditCloseChanged = await closeArrow('dismiss');
                    if (await winCount() > 1) o.fileEditCloseChangedAccept = await closeArrow('accept');
                } else await closeArrow('accept');
                await reload();
                o.rowsAfterEditLeave = rowsBrief(await gridInfo());
            }
            {
                const n0 = await winCount();
                o.depArrow = await rowArrow(fileRow('K3 PDF', 'article.html'), 'Dependent Files');
                await waitNewWindow(n0);
                const w = await winSnap('f-16-dependent-files');
                o.dependent = brief(w);
                await closeArrow('accept');
                await reload();
            }
            o.historyBefore = await historyOf('K3 PDF', 'article.pdf', 'f-17-history-before');
            // td20: approve, then revoke
            {
                await openLink(fileRow('K3 PDF', 'article.pdf'), 'Awaiting Approval');
                const w1 = await winSnap('f-18-approve-proof');
                o.approveWin = brief(w1);
                const p1 = await pressIn('OK');
                o.approveOk = {windowsAfter: p1.windowsAfter, notices: p1.notices, posts: p1.posts};
                o.rowAfterApproveSamePage = await fileLink('K3 PDF', 'article.pdf');
                await reload();
                o.rowAfterApprove = await fileLink('K3 PDF', 'article.pdf');
                o.historyAfterApprove = await historyOf('K3 PDF', 'article.pdf', 'f-19-history-after-approve');
                await reload();
                await openLink(fileRow('K3 PDF', 'article.pdf'), 'Approved');
                const w2 = await winSnap('f-20-revoke-proof');
                o.revokeWin = brief(w2);
                const p2 = await pressIn('OK');
                o.revokeOk = {windowsAfter: p2.windowsAfter, notices: p2.notices, posts: p2.posts};
                await reload();
                o.rowAfterRevoke = await fileLink('K3 PDF', 'article.pdf');
                o.historyAfterRevoke = await historyOf('K3 PDF', 'article.pdf', 'f-21-history-after-revoke');
                await reload();
            }
            // Rule 11: "Delete" on a file copy (the second "replacement.pdf")
            {
                o.rowsBeforeFileDelete = rowsBrief(await gridInfo());
                const nCopies = await fmtBody('K3 PDF').locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: 'replacement.pdf'}).count();
                o.replacementCopies = nCopies;
                const n0 = await winCount();
                await rowArrow(fileRow('K3 PDF', 'replacement.pdf', 0), 'Delete');
                await waitNewWindow(n0);
                const w = await winSnap('f-22-file-delete-dialog');
                o.fileDeleteDialog = brief(w);
                const p = await pressIn('OK');
                o.fileDeleteOk = {windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts};
                o.rowsAfterFileDeleteSamePage = rowsBrief(await gridInfo());
                await reload();
                o.rowsAfterFileDelete = rowsBrief(await gridInfo());
                await snap('f-23-after-file-delete');
            }
            fact('files', o);
        }

        // ---------------------------------------------------------------- windows (155–156 the approval/availability windows; 158–160 the delete dialog)
        if (isOMP && on('windows')) {
            const P = S.P;
            const o = {};
            await as(P.mg, P.path);
            await formatsPage('P', '1');
            const w = async (row, text, name) => {
                await openLink(row, text);
                const x = brief(await winSnap(name));
                const c = await pressIn('Cancel');
                return {...x, cancel: {windowsAfter: c.windowsAfter, posts: c.posts, err: c.err}};
            };
            o.formatApproval = await w(formatRow('K3 PDF'), 'Awaiting Approval', 'w-01-format-approval');
            await reload();
            o.formatAvailability = await w(formatRow('K3 PDF'), 'Not Available', 'w-02-format-availability');
            await reload();
            o.approveProof = await w(fileRow('K3 PDF', 'article.pdf'), 'Awaiting Approval', 'w-03-approve-proof');
            await reload();
            o.rowsAfterCancels = rowsBrief(await gridInfo());
            // approve the format and make it available, then the reverse windows
            await openLink(formatRow('K3 PDF'), 'Awaiting Approval'); await pressIn('OK'); await reload();
            await openLink(formatRow('K3 PDF'), 'Not Available'); await pressIn('OK'); await reload();
            await openLink(fileRow('K3 PDF', 'article.pdf'), 'Awaiting Approval'); await pressIn('OK'); await reload();
            o.formatApproved = await w(formatRow('K3 PDF'), 'Approved', 'w-04-format-approved');
            await reload();
            o.formatAvailable = await w(formatRow('K3 PDF'), 'Available', 'w-05-format-available');
            await reload();
            o.revokeProof = await w(fileRow('K3 PDF', 'article.pdf'), 'Approved', 'w-06-revoke-proof');
            await reload();
            // the delete dialog on a spare format
            await addFormat('K3 Spare');
            await reload();
            {
                const n0 = await winCount();
                await rowArrow(formatRow('K3 Spare'), 'Delete');
                await waitNewWindow(n0);
                o.deleteDialog = brief(await winSnap('w-07-delete-dialog'));
                const c = await pressIn('Cancel');
                o.deleteCancel = {windowsAfter: c.windowsAfter, posts: c.posts, err: c.err};
                await reload();
                o.rowsAfterDeleteCancel = rowsBrief(await gridInfo());
                const n1 = await winCount();
                await rowArrow(formatRow('K3 Spare'), 'Delete');
                await waitNewWindow(n1);
                const p = await pressIn('OK');
                o.deleteOk = {windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts};
                await reload();
                o.rowsAfterDelete = rowsBrief(await gridInfo());
            }
            fact('windows', o);
        }

        // ---------------------------------------------------------------- terms (Rule 15, the terms window; td22, td15, td30 end 1, td31 end 1)
        if (isOMP && on('terms')) {
            const P = S.P;
            const o = {};
            await as(P.mg, P.path);
            await formatsPage('P', '1');
            await addFormat('K3 Terms');
            await changeFile('K3 Terms', PDF);
            await reload();
            o.rowNew = await fileLink('K3 Terms', 'article.pdf');
            // td22: a new file's window
            const w0 = await openTerms('K3 Terms', 'article.pdf', 't-01-new-file-window');
            o.newFile = {title: w0.title, link: w0.linkBefore, ...w0.info};
            await loc(page, 'Set Terms for Downloading: the form', termsForm());
            await loc(page, 'Set Terms for Downloading: the price box', termsForm().locator('input[id^="price"]'));
            await loc(page, 'Set Terms for Downloading: "Save"', termsForm().getByRole('button', {name: 'Save', exact: true}));
            // sweep: choose Direct Sales, type, then "Cancel" (a change left unsaved)
            await choose('directSales');
            o.newFileDirectSalesChosen = await termsInfo();
            await typePrice('30.00');
            {
                const c = await pressIn('Cancel');
                o.cancelWithChange = {err: c.err, windowsAfter: c.windowsAfter, dialogs: c.dialogs, posts: c.posts};
                if (await termsForm().count()) { o.cancelLeftOpen = true; await closeArrow('accept'); }
            }
            await reload();
            o.rowAfterCancel = await fileLink('K3 Terms', 'article.pdf');
            // sweep: header "Close" with a change
            await openTerms('K3 Terms', 'article.pdf', null);
            await choose('directSales'); await typePrice('31.00');
            o.closeWithChangeDismiss = await closeArrow('dismiss');
            if (await termsForm().count()) o.closeWithChangeAccept = await closeArrow('accept');
            await reload();
            o.rowAfterClose = await fileLink('K3 Terms', 'article.pdf');
            // td22: "Save" unchanged on a new file
            {
                await formatsPage('P', '1');
                const w = await openTerms('K3 Terms', 'article.pdf', null);
                const p = await pressIn('Save');
                o.saveUnchanged = {opened: w.info.checked, err: p.err, windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts, rowSamePage: await fileLink('K3 Terms', 'article.pdf')};
                await reload();
                o.saveUnchanged.rowReloaded = await fileLink('K3 Terms', 'article.pdf');
                const re = await openTerms('K3 Terms', 'article.pdf', 't-02-after-save-unchanged-reopened');
                o.saveUnchanged.reopened = {checked: re.info.checked, price: re.info.price, priceDisabled: re.info.priceDisabled};
                await closeArrow('accept');
            }
            // td22: Direct Sales 25.00, then Open Access, then Not Available (15c: the price dropped)
            o.ds25 = await termsCase('P', '1', 'K3 Terms', 'article.pdf', 'ds25', {salesType: 'directSales', price: '25.00'});
            o.oa = await termsCase('P', '1', 'K3 Terms', 'article.pdf', 'oa', {salesType: 'openAccess'});
            o.ds25b = await termsCase('P', '1', 'K3 Terms', 'article.pdf', 'ds25b', {salesType: 'directSales', price: '25.00'});
            o.na = await termsCase('P', '1', 'K3 Terms', 'article.pdf', 'na', {salesType: 'notAvailable'});
            // 15c: choosing Open Access / Not Available greys the price box (read in the window, not saved)
            {
                await formatsPage('P', '1');
                await openTerms('K3 Terms', 'article.pdf', null);
                await choose('directSales'); await typePrice('12.00');
                const a = await termsInfo();
                await choose('openAccess');
                const b = await termsInfo();
                await choose('notAvailable');
                const c = await termsInfo();
                await choose('directSales');
                const d = await termsInfo();
                o.greying = {ds: [a.price, a.priceDisabled, a.saveDisabled], oa: [b.price, b.priceDisabled, b.saveDisabled], na: [c.price, c.priceDisabled, c.saveDisabled], dsAgain: [d.price, d.priceDisabled, d.saveDisabled]};
                await winSnap('t-03-greying');
                await closeArrow('accept');
            }
            // td15 (A8): the price values; sweep ".99", "-5", " 10", empty
            o.values = {};
            for (const [key, v] of [['v105', '10.5'], ['v1050', '10.50'], ['v1500', '1,500.00'], ['vabc', 'abc'], ['v0', '0'], ['v99', '.99'], ['vneg', '-5'], ['vsp', ' 10'], ['vempty', '']]) {
                o.values[v === '' ? '(empty)' : v] = await termsCase('P', '1', 'K3 Terms', 'article.pdf', key, {salesType: 'directSales', price: v});
            }
            // td31 end 1 (no payment method): the "Metadata" tab of the format — any payment notice?
            {
                await formatsPage('P', '1');
                const n0 = await winCount();
                await rowArrow(formatRow('K3 Terms'), 'Edit');
                await waitNewWindow(n0);
                await top().getByRole('tab', {name: 'Metadata', exact: true}).first().click().catch(() => {});
                await top().locator('form[id^="publicationMetadataEntryForm"]').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page); await sleep(1500); await idle(page);
                const w = await winInfo();
                o.metadataTab = {tabs: w.tabs, head: flat(w.text, 400), paymentNotice: /payment method/i.test(w.text || ''), notices: await top().locator('.pkp_notification, [id*="Notification"]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => [])};
                await snap('t-04-metadata-tab', {metadataTab: o.metadataTab});
                await closeArrow('accept');
            }
            fact('terms', o);
        }

        // ---------------------------------------------------------------- pay (td30 end 2, td31 end 2: a press with payments set up)
        if (isOMP && on('pay')) {
            const Q = S.Q;
            const o = {};
            await as(Q.mg, Q.path);
            await formatsPage('Q', '1');
            await addFormat('K3 PDF');
            await changeFile('K3 PDF', PDF);
            await reload();
            const w = await openTerms('K3 PDF', 'article.pdf', 'p-01-terms-usd');
            o.window = {title: w.title, ...w.info};
            await closeArrow('accept');
            o.ds25 = await termsCase('Q', '1', 'K3 PDF', 'article.pdf', 'q-ds25', {salesType: 'directSales', price: '25.00'});
            {
                const n0 = await winCount();
                await rowArrow(formatRow('K3 PDF'), 'Edit');
                await waitNewWindow(n0);
                await top().getByRole('tab', {name: 'Metadata', exact: true}).first().click().catch(() => {});
                await top().locator('form[id^="publicationMetadataEntryForm"]').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page); await sleep(1500); await idle(page);
                const x = await winInfo();
                o.metadataTab = {tabs: x.tabs, head: flat(x.text, 400), paymentNotice: /payment method/i.test(x.text || '')};
                await snap('p-02-metadata-tab', {metadataTab: o.metadataTab});
                await closeArrow('accept');
            }
            fact('pay', o);
        }

        // ---------------------------------------------------------------- ident (Rule 11: "Edit a file" tabs with "Enable for Files")
        if (isOMP && on('ident')) {
            const F = S.F;
            const o = {};
            await as(F.mg, F.path);
            await formatsPage('F', '1', 'i-01-page');
            o.rows = rowsBrief(await gridInfo());
            o.arrow = await rowArrow(fileRow('PDF', 'article.pdf'));
            await reload();
            const n0 = await winCount();
            await rowArrow(fileRow('PDF', 'article.pdf'), 'Edit');
            await waitNewWindow(n0);
            o.edit = brief(await winSnap('i-02-file-edit'));
            const idTab = top().getByRole('tab', {name: 'Identifiers', exact: true}).first();
            if (await idTab.count()) {
                await idTab.click(); await sleep(1500); await idle(page);
                o.identifiersTab = brief(await winSnap('i-03-file-edit-identifiers'));
            }
            await closeArrow('accept');
            fact('ident', o);
        }

        // ---------------------------------------------------------------- reader (A10; A9's reader side, both ends)
        if (isOMP && on('reader')) {
            const P = S.P;
            const Q = S.Q;
            const o = {};
            // p3: seeded — format Approved + Available, file "Open Access" and "Awaiting Approval"
            await as(P.mg, P.path);
            o.p3rows = rowsBrief(await formatsPage('P', '3', 'r-01-p3-page'));
            await out();
            o.visitorAwaiting = await readBook('P', '3', 'r-02-visitor-file-awaiting');
            await as(P.mg, P.path);
            await formatsPage('P', '3');
            await openLink(fileRow('PDF', 'article.pdf'), 'Awaiting Approval'); await pressIn('OK'); await reload();
            o.p3rowsApproved = rowsBrief(await gridInfo());
            await out();
            o.visitorApproved = await readBook('P', '3', 'r-03-visitor-file-approved');
            // A10 with a file uploaded on screen (not seeded): "Open Access", never approved
            await as(P.mg, P.path);
            await formatsPage('P', '3');
            o.p3upload = await changeFile('PDF', PDF2);
            await reload();
            await openTerms('PDF', 'replacement.pdf', null);
            await choose('openAccess');
            o.p3uploadTerms = (await pressIn('Save')).windowsAfter;
            await reload();
            o.p3rowsWithUpload = rowsBrief(await gridInfo());
            await out();
            o.visitorUploaded = await readBook('P', '3', 'r-03b-visitor-uploaded-awaiting');
            // Direct Sales 25.00 on a press with no payment method
            await as(P.mg, P.path);
            o.p3ds = await termsCase('P', '3', 'PDF', 'article.pdf', 'r-p3-ds25', {salesType: 'directSales', price: '25.00'});
            await out();
            o.visitorDs = await readBook('P', '3', 'r-04-visitor-ds25-nopay');
            await as(P.rd, P.path);
            o.readerDs = await readBook('P', '3', 'r-05-reader-ds25-nopay');
            // Direct Sales 0
            await as(P.mg, P.path);
            o.p3ds0 = await termsCase('P', '3', 'PDF', 'article.pdf', 'r-p3-ds0', {salesType: 'directSales', price: '0'});
            await out();
            o.visitorDs0 = await readBook('P', '3', 'r-06-visitor-ds0');
            // Q: payments set up, Direct Sales 25.00
            await as(Q.mg, Q.path);
            o.q3ds = await termsCase('Q', '3', 'PDF', 'article.pdf', 'r-q3-ds25', {salesType: 'directSales', price: '25.00'});
            await out();
            o.visitorQ = await readBook('Q', '3', 'r-07-visitor-ds25-pay');
            await as(Q.rd, Q.path);
            o.readerQ = await readBook('Q', '3', 'r-08-reader-ds25-pay');
            await out();
            fact('reader', o);
        }

        // ---------------------------------------------------------------- settings (Setting 5: the "Payments" tab on P and Q)
        if (isOMP && on('settings')) {
            const o = {};
            for (const k of ['P', 'Q']) {
                await as(S[k].mg, S[k].path);
                await page.goto(cUrl(S[k].path, '/management/settings/distribution'));
                await idle(page);
                const tab = page.getByRole('tab', {name: 'Payments', exact: true}).first();
                await tab.click().catch(() => {});
                await idle(page); await sleep(1000);
                const s = await snap(`s-01-payments-${k}`);
                o[k] = await page.evaluate(() => {
                    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const panel = [...document.querySelectorAll('[role=tabpanel]')].find((p) => p.getClientRects().length && /Currency/.test(p.innerText));
                    if (!panel) return null;
                    const sel = [...panel.querySelectorAll('select')].map((e) => ({name: e.name, value: e.value, first: e.options[0] ? f(e.options[0].text) : null, selected: e.selectedIndex >= 0 ? f(e.options[e.selectedIndex].text) : null}));
                    const boxes = [...panel.querySelectorAll('input[type=checkbox]')].map((e) => ({name: e.name, checked: e.checked}));
                    return {sel, boxes, text: f(panel.innerText).slice(0, 600)};
                }).catch(() => null);
                o[`${k}url`] = s.url;
            }
            fact('settings', o);
        }

        // ---------------------------------------------------------------- galley (OJS, OPS: the galley row's menu — A3's comparison, read only)
        if (!isOMP && on('galley')) {
            const J = S.J;
            const o = {};
            const sub = J.subs['1'];
            await as(J.mg, J.path);
            await openWf(J.path, sub.id, `publication_${sub.pub}_galleys`, 'g-01-galleys');
            const row = wf().locator('tbody tr').filter({hasText: 'PDF'}).first();
            await row.waitFor({timeout: 20000}).catch(() => {});
            o.row = flat(await row.innerText().catch(() => null), 300);
            o.pageText = flat(await wf().innerText().catch(() => null), 900);
            const btn = row.locator('button').last();
            await btn.click().catch(() => {});
            await sleep(500);
            o.menu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((s) => s.trim());
            await snap('g-02-galley-menu', {menu: o.menu});
            await btn.click().catch(() => {});
            o.hasTermsOrSelect = /Set Terms|Select Files|Awaiting Approval|Open Access|Direct Sales/.test(o.pageText || '');
            fact('galley', o);
        }
    } catch (e) {
        log('ERROR', e && e.stack ? e.stack.slice(0, 1500) : e);
        await snap('error').catch(() => {});
        fact('error', String(e && e.message).slice(0, 500));
    } finally {
        await close();
    }
});
