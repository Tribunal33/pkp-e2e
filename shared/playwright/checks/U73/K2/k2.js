// U73 claim check, chunk K2: the Publication Formats page and the format window's "Edit" tab {OMP},
// with read-only galley-window controls on OJS and OPS (A4, A5 compare the format window with a galley's).
// Spec: docs/specs/U73-publication-formats-proof-terms.md — Fields 64–109; Rules 1–2 (164–176), 4–8 (181–218),
// 20–21 (345–357); Side effects "Notices", "No email" (358–366); A4, A5 (580–601);
// footnotes a, d, e, h, m, n, o, f-a4, f-a5, td2, td7–td11, td16, td17, td25–td27.
//
//   RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccK2 node bin/probe.js <all|omp|ojs|ops> shared/playwright/checks/U73/K2/k2.js
//   PHASES=seed,roles,review,window,remote,files,version,lang,reader (OMP) · seed,galley (OJS, OPS)
//   Default: those phases. Extra OMP phases run after them on the same state: filearrows (needs roles),
//   isbn2 (Rule 7 with a second code), choose (the side menu's version choice alone, needs version). RUN names the run (r1, r2): each run seeds its own scratch presses
//   (state k2-state-<RUN>-<app>.json) and writes its facts to k2-<RUN>-facts-<app>.json, its snapshots
//   as <RUN>-<name>-<app>.json/png. A full OMP run outlasts the Bash cap: launch it detached (nohup … &).
//
// Scratch contexts (OMP):
//   P  plain press. Users mg (manager), se (sectionEditor = Series editor), le (layoutEditor), au (author).
//      p1 Production, se and le assigned: each managing level adds a format (td2), the Author's view (control).
//      p2 External Review: the page and "Add publication format" before Production (Rule 2, td7).
//      p3 Production: the format window (td9, td11 mechanics, td16, td17, Rule 8), "No Items".
//      p4 Production, a production-ready file "replacement.pdf", chapter "K2 Chapter One": a format with a PDF and
//         an HTML file (td8), every action's notice (td27), mail and Tasks, deleting (td25).
//      p5 published with "PDF" (file, Open Access): a new version's copies (td26).
//      p6 published, no format: a new version, three formats on it, the first version's list (td7).
//      p7 published with "PDF" and "EPUB" (files): URL Paths shared and numeric, the reader's links (A5).
//   I  "Enable for Publication Formats" (Publisher ID) and URN for formats: i1 Production (td11, Rule 5's tabs and
//      "Format Approval").
//   L  metadata languages en + fr_CA: l1 an English book, l2 a French book (td10).
// OJS / OPS: J with one submission: the galley window's URL Path refusals and remote box (A4, A5 controls).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, drainJobs} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'roles', 'review', 'window', 'remote', 'files', 'version', 'lang', 'reader', 'galley'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k2-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const PDF = fx(isOPS ? 'ops' : 'omp', isOPS ? 'preprint.pdf' : 'article.pdf');
    const HTMLF = fx(isOPS ? 'ops' : 'omp', isOPS ? 'preprint.html' : 'article.html');

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u73k2');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kai', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ari', familyName: 'Author'},
        ];
        if (isOMP) {
            const staff = (p) => [
                ...people(p),
                {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Series'},
                {username: `${p}le`, roles: ['layoutEditor'], givenName: 'Lea', familyName: 'Layout'},
            ];
            const ctx = async (k, spec) => {
                const p = `${t}${k.toLowerCase()}`;
                const c = await app.api.createContext({tag: p, users: staff(p), ...spec});
                S[k] = {path: c.path, mg: `${p}mg`, au: `${p}au`, se: `${p}se`, le: `${p}le`, subs: {}};
            };
            const sub = async (k, s, extra = {}) => {
                const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `K2 ${k}${s} ${t}`, ...extra});
                S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null, files: r.files || null};
            };
            const prod = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
            const assigned = (k) => ({participants: [{username: S[k].se, role: 'sectionEditor'}, {username: S[k].le, role: 'layoutEditor'}]});
            await ctx('P', {});
            await sub('P', '1', {...prod, ...assigned('P')});
            await sub('P', '2', {files: [{file: 'article.pdf'}], decisions: ['sendExternalReview']});
            await sub('P', '3', prod);
            await sub('P', '4', {files: [{file: 'article.pdf'}, {file: 'replacement.pdf', list: 'productionReady'}], decisions: ['skipExternalReview', 'sendToProduction'],
                chapters: [{title: 'K2 Chapter One'}]});
            await sub('P', '5', {...prod, published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
            await sub('P', '6', {...prod, published: true});
            await sub('P', '7', {...prod, published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf'}, {name: 'EPUB', file: 'article.pdf'}]});
            await ctx('I', {enablePublisherId: ['representation'], plugins: {urnpubidplugin: {enabled: true, settings: {
                urnPrefix: 'urn:nbn:de:0000-', urnResolver: 'https://nbn-resolving.de/', urnNamespace: 'urn:nbn:de', urnCheckNo: false,
                enableRepresentationURN: true, urnSuffix: 'default'}}}});
            await sub('I', '1', prod);
            await ctx('L', {context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']}});
            await sub('L', '1', prod);
            await sub('L', '2', {...prod, locale: 'fr_CA', title: {fr_CA: `K2 L2 ${t}`}});
        } else {
            const p = `${t}j`;
            const c = await app.api.createContext({tag: p, users: people(p)});
            S.J = {path: c.path, mg: `${p}mg`, au: `${p}au`, subs: {}};
            const r = await app.api.createSubmission({tag: `${p}1`, context: c.path, submitter: S.J.au, title: `K2 J1 ${t}`});
            S.J.subs['1'] = {id: r.submissionId, pub: r.publicationId};
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 2000));
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key, author) => cUrl(ctx, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    // ---- browser dialogs (confirm/alert): answered by `answer`, recorded with a time
    const jsDialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // ---- page notices with a time (the kit's screen() returns them too, once)
    const notices = [];
    await page.exposeFunction('__k2Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k2Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // ---- the grid's own posts (op, status, JSON status/content head)
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\//.test(u)) return;
        if (m === 'GET' && !/fetch-row|fetch-category|fetch-grid/.test(u)) return;
        let body = '';
        try { body = (await r.text()).slice(0, 600); } catch { /* */ }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 180), body: flat(body, 240)});
    });
    const postsSince = (t0) => posts.filter((p) => p.at >= t0).map(({at, ...p}) => p);

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

    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();

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
    const pubKey = (sub, key, pub) => `publication_${pub || sub.cur || sub.pub}_${key}`;
    async function formatsPage(k, s, {name, pub, author} = {}) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, pubKey(sub, 'publicationFormats', pub), {author});
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        if (name) await snap(name, {grid: info});
        return info;
    }
    // The page as data: heading, the grid's heading and add link, columns, each row's cells and links.
    async function gridInfo() {
        return wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script, style').forEach((x) => x.remove()); return c.textContent; };
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const heading = [...d.querySelectorAll('h1, h2')].filter(v).map((h) => f(h.textContent)).filter(Boolean).slice(0, 4);
            const g = d.querySelector('[id^="component-grid-catalogentry-publicationformatgrid"]');
            if (!g) return {present: false, heading, text: f(d.innerText).slice(0, 800)};
            const gridHeading = f(g.querySelector('.header h4')?.textContent);
            const actions = [...g.querySelectorAll('.header .actions a')].filter(v).map((a) => f(a.textContent));
            const cols = [...g.querySelectorAll('thead th')].filter(v).map((t) => f(t.textContent));
            const rows = [...g.querySelectorAll('tbody tr')].filter(v).map((tr) => {
                if (tr.classList.contains('row_controls')) return null;
                const cells = [...tr.children].map((c) => f(tc(c)));
                const onix = tr.querySelector('.onix_code');
                const label = tr.querySelector('.label');
                const nameLink = label ? label.querySelector('a') : null;
                const cs = (e) => (e ? (({fontSize, color, fontWeight}) => ({fontSize, color, fontWeight}))(getComputedStyle(e)) : null);
                return {
                    id: tr.id || null, cls: tr.className, kind: onix ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other',
                    cells,
                    name: label ? f([...label.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('onix_code'))).map((n) => n.textContent).join('')) : null,
                    onix: onix ? f(onix.textContent) : null,
                    style: onix ? {name: cs(label), onix: cs(onix)} : null,
                    nameLink: nameLink ? {text: f(nameLink.textContent), href: nameLink.getAttribute('href'), target: nameLink.getAttribute('target')} : null,
                    number: tr.querySelector('.file_extension') ? {text: f(tr.querySelector('.file_extension').textContent), cls: tr.querySelector('.file_extension').className} : null,
                    links: [...tr.querySelectorAll('a')].filter(v).map((a) => ({text: f(tc(a)) || `[${f(a.querySelector('.pkp_screen_reader')?.textContent) || a.className}]`, cls: a.className.replace(/pkp_controllers_linkAction /, '').slice(0, 80)})),
                };
            }).filter(Boolean);
            return {present: true, heading, gridHeading, actions, cols, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}${r.nameLink ? ` [link ${r.nameLink.href} ${r.nameLink.target}]` : ''}`);
    const formatRow = (label) => grid().locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: label}).first();
    const fileRow = (text) => grid().locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).first();
    // A row's arrow: the entries it offers (in order); optionally press one.
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
    // The top legacy window as data.
    async function winInfo(w = top()) {
        return w.evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const lab = d.getAttribute('aria-labelledby');
            const title = d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.textContent.trim()) || null;
            const headings = [...d.querySelectorAll('h1,h2,h3,legend')].filter(v).map((h) => f(h.textContent)).filter(Boolean);
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const forms = [...d.querySelectorAll('form')].filter(v);
            const form = forms[0] || null;
            const fields = [...d.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].map((e) => {
                const id = e.id;
                const lbl = id ? d.querySelector(`label[for="${id}"]`) : null;
                return {name: e.name, type: e.type, visible: v(e), disabled: e.disabled, required: e.required || e.getAttribute('aria-required') === 'true', value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value,
                    label: lbl ? f(lbl.textContent) : null,
                    options: e.tagName === 'SELECT' ? [...e.options].map((o) => `${f(o.text)}${o.selected ? '*' : ''}`) : undefined};
            });
            const errors = [...d.querySelectorAll('label.error, .error, .pkp_form_error, [class*="formError"], .pkpFormError')].filter(v).map((e) => f(e.textContent)).filter(Boolean);
            const buttons = [...d.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit], form a')].filter(v).map((b) => f(b.textContent || b.value || b.getAttribute('aria-label'))).filter(Boolean);
            return {title, headings, tabs, fields, errors, buttons, formIds: forms.map((x) => x.id), text: f(d.innerText).slice(0, 3000)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const fieldsBrief = (w) => (w.fields || []).map((x) => `${x.name}=${JSON.stringify(x.value)}${x.visible ? '' : '(hidden)'}${x.disabled ? '(dis)' : ''}${x.required ? '(req)' : ''}${x.options ? ` [${x.options.join('|')}]` : ''}`);
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        log(`[${name}]`, JSON.stringify({title: w.title, headings: w.headings, tabs: w.tabs, errors: w.errors, fields: fieldsBrief(w)}).slice(0, 1800));
        return w;
    }
    const winCount = () => page.locator(vis).count();
    const formWin = () => page.getByRole('dialog').filter({has: page.locator('form[id^="addPublicationFormatForm"], form#addPublicationFormatForm, form[id*="ublicationFormat"]')}).last();
    const fmtForm = () => page.locator('form[id^="addPublicationFormatForm"]:visible, form[id*="ublicationFormatForm"]:visible').last();
    async function waitForm() {
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name^="name"]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
        await idle(page);
        await sleep(400);
    }
    const nameBox = () => top().locator('input[name^="name"]:visible').first();
    async function openAdd() {
        await grid().getByRole('link', {name: 'Add publication format'}).first().click();
        await waitForm();
    }
    async function pressOK() {
        const t0 = Date.now();
        const before = await winCount();
        await top().getByRole('button', {name: 'OK', exact: true}).last().click();
        await sleep(1500);
        await idle(page);
        await sleep(300);
        return {t0, windowsBefore: before, windowsAfter: await winCount(), posts: postsSince(t0), notices: noticesSince(t0), dialogs: dialogsSince(t0)};
    }
    async function bottomCancel() {
        const t0 = Date.now();
        const w = top();
        const c = w.locator('form').getByRole('link', {name: 'Cancel', exact: true}).or(w.locator('form').getByRole('button', {name: 'Cancel', exact: true})).first();
        const before = await winCount();
        await c.click().catch(() => {});
        await sleep(1000);
        await idle(page);
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0), posts: postsSince(t0)};
    }
    async function closeArrow(ans = 'dismiss') {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(1200);
        await idle(page);
        answer = 'dismiss';
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0)};
    }
    async function setField(name, value) {
        const el = top().locator(`[name="${name}"]`).first();
        await el.fill(value);
        await el.blur().catch(() => {});
    }
    async function setBox(name, want) {
        const b = top().locator(`input[name="${name}"]`).first();
        if ((await b.isChecked()) !== want) await b.click();
        await sleep(400);
    }
    async function addFormat(name, {fill} = {}) {
        await openAdd();
        await nameBox().fill(name);
        if (fill) await fill();
        return pressOK();
    }
    async function editFormat(label) {
        const r = await rowArrow(formatRow(label), 'Edit');
        await waitForm();
        return r;
    }
    async function clickTab(label, ans = 'dismiss') {
        const t0 = Date.now();
        answer = ans;
        await top().getByRole('tab', {name: label, exact: true}).first().click();
        await sleep(1500);
        await idle(page);
        answer = 'dismiss';
        return {dialogs: dialogsSince(t0), tabs: (await winInfo()).tabs};
    }
    const reload = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); };

    // ---- the upload wizard ("Change File")
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function wizUpload(file) {
        await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page);
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
        return {genres};
    }
    async function changeFile(label, file) {
        const t0 = Date.now();
        await formatRow(label).getByRole('link', {name: 'Change File', exact: true}).first().click();
        const wiz = await wizUpload(file);
        await sleep(600);
        return {...wiz, notices: noticesSince(t0), posts: postsSince(t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 90)}`)};
    }
    // A status link in a row ("Awaiting Approval", "Not Available", "Set Terms"…) › its window › a button.
    async function statusWindow(row, linkText, name, {press = 'OK', before} = {}) {
        const t0 = Date.now();
        const a = row.getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await page.waitForFunction((n) => document.querySelectorAll('[role="dialog"]').length > 0 && [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
        const w = await winSnap(name);
        if (before) await before();
        let out = {win: {title: w.title, headings: w.headings, text: flat(w.text, 800), buttons: w.buttons, fields: fieldsBrief(w)}};
        if (press) {
            const t1 = Date.now();
            const b = top().getByRole('button', {name: press, exact: true}).last();
            await b.click().catch((e) => { out.pressErr = flat(e.message, 200); });
            await sleep(1500); await idle(page); await sleep(400);
            out = {...out, windowsAfter: await winCount(), notices: noticesSince(t1), posts: postsSince(t1).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 90)} ${p.body.slice(0, 120)}`), dialogs: dialogsSince(t0)};
        }
        return out;
    }
    async function tasksCount() {
        const b = page.getByRole('button', {name: /^Tasks/}).first();
        return flat(await b.innerText().catch(() => null), 80) || flat(await b.getAttribute('aria-label').catch(() => null), 80);
    }

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- roles (td2; line 69; Rule 4; arrows per level)
        if (isOMP && on('roles')) {
            const P = S.P;
            const out = {};
            for (const [key, user] of [['mgr', P.mg], ['admin', 'admin'], ['se', P.se], ['le', P.le]]) {
                await as(user, P.path);
                const g0 = await formatsPage('P', '1', {name: `roles-${key}-page`});
                const r = {page: {heading: g0.heading, gridHeading: g0.gridHeading, actions: g0.actions, cols: g0.cols, rows: rowsBrief(g0)}};
                if (g0.actions && g0.actions.includes('Add publication format')) {
                    await openAdd();
                    const w = await winSnap(`roles-${key}-add-window`);
                    r.addWindow = {title: w.title, headings: w.headings, tabs: w.tabs};
                    await nameBox().fill(`PDF ${key}`);
                    r.ok = await pressOK();
                    const g1 = await gridInfo();
                    await snap(`roles-${key}-after-ok`, {grid: g1, ok: r.ok});
                    r.afterOk = rowsBrief(g1);
                    await reload();
                    r.afterReload = rowsBrief(await gridInfo());
                    r.arrow = await rowArrow(formatRow(`PDF ${key}`));
                    await snap(`roles-${key}-arrow`);
                }
                out[key] = r;
                fact(`roles-${key}`, r);
            }
            // the Author on their own book: the author's view (control)
            await as(P.au, P.path);
            const ga = await formatsPage('P', '1', {name: 'roles-author-page', author: true});
            fact('roles-author', {heading: ga.heading, gridHeading: ga.gridHeading, actions: ga.actions, cols: ga.cols, rows: rowsBrief(ga)});
        }

        // ---------------------------------------------------------------- review (Rule 2: the stage end; td7's second half)
        if (isOMP && on('review')) {
            const P = S.P;
            await as(P.mg, P.path);
            const sub = P.subs['2'];
            await openWf(P.path, sub.id, null, {name: 'review-workflow'});
            const nav = await wf().evaluate((d) => [...d.querySelectorAll('nav a, nav button, [role=navigation] a, [role=navigation] button')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
            const stage = await wf().evaluate((d) => (d.innerText.match(/External Review|Internal Review|Production|Copyediting|Submission/g) || []).slice(0, 8)).catch(() => []);
            const offered = nav.includes('Publication Formats');
            let r = {nav, stage, offered};
            if (offered) {
                await wf().getByRole('link', {name: 'Publication Formats', exact: true}).or(wf().getByRole('button', {name: 'Publication Formats', exact: true})).first().click().catch(() => {});
                await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page);
                const g0 = await gridInfo();
                await snap('review-page', {grid: g0});
                r.page = {heading: g0.heading, actions: g0.actions, rows: rowsBrief(g0)};
                if (g0.actions && g0.actions.includes('Add publication format')) {
                    r.ok = await addFormat('PDF');
                    await reload();
                    const g1 = await gridInfo();
                    await snap('review-after-add', {grid: g1});
                    r.after = rowsBrief(g1);
                }
            }
            fact('review', r);
        }

        // ---------------------------------------------------------------- window (td9, Fields, Rule 4, 4a, 6, 7, 8)
        if (isOMP && on('window')) {
            const P = S.P;
            await as(P.mg, P.path);
            const out = {};
            const g0 = await formatsPage('P', '3', {name: 'w-01-empty'});
            out.empty = {heading: g0.heading, gridHeading: g0.gridHeading, actions: g0.actions, cols: g0.cols, rows: rowsBrief(g0)};
            await loc(page, 'Publication Formats: the grid', grid());
            await loc(page, 'Publication Formats: "Add publication format"', grid().getByRole('link', {name: 'Add publication format'}));
            // the Add window as it opens
            await openAdd();
            const wAdd = await winSnap('w-02-add-window');
            out.addWindow = {title: wAdd.title, headings: wAdd.headings, tabs: wAdd.tabs, fields: fieldsBrief(wAdd), buttons: wAdd.buttons, text: wAdd.text};
            for (const [d, l] of [['Name box', top().locator('input[name^="name"]')], ['"Publication Format" list', top().locator('select[name="entryKey"]')],
                ['"Physical format" box', top().locator('input[name="isPhysicalFormat"]')], ['remote box', top().locator('input[name="remotelyHostedContent"]')],
                ['"URL of remotely-hosted content"', top().locator('input[name="remoteURL"]')], ['"URL Path"', top().locator('input[name="urlPath"]')],
                ['ISBN-13 box', top().locator('input[name="isbn13"]')], ['ISBN-10 box', top().locator('input[name="isbn10"]')],
                ['OK', top().getByRole('button', {name: 'OK', exact: true})], ['header Close', top().getByRole('button', {name: 'Close', exact: true})]]) {
                await loc(page, `Add publication format: ${d}`, l);
            }
            // remote box mechanics (Fields 105–107): URL Path typed, tick, untick; an address typed, untick
            await setField('urlPath', 'abc');
            await setBox('remotelyHostedContent', true);
            const wT = await winInfo();
            await setBox('remotelyHostedContent', false);
            const wU = await winInfo();
            await setBox('remotelyHostedContent', true);
            await setField('remoteURL', 'https://example.org/typed');
            await setBox('remotelyHostedContent', false);
            const wU2 = await winInfo();
            await snap('w-03-remote-toggle', {ticked: fieldsBrief(wT), unticked: fieldsBrief(wU), untickedWithAddress: fieldsBrief(wU2)});
            out.toggle = {ticked: fieldsBrief(wT), unticked: fieldsBrief(wU), untickedWithAddress: fieldsBrief(wU2)};
            // Rule 4a: a name typed, the close arrow: Cancel keeps, OK closes
            await nameBox().fill('PDF');
            await nameBox().blur();
            out.closeCancel = await closeArrow('dismiss');
            out.closeCancel.nameAfter = await nameBox().inputValue().catch(() => null);
            await snap('w-04-close-arrow-cancel', {r: out.closeCancel});
            out.closeOk = await closeArrow('accept');
            await reload();
            out.afterCloseOk = rowsBrief(await gridInfo());
            // bottom "Cancel" with a name typed
            await openAdd();
            await nameBox().fill('PDF');
            await nameBox().blur();
            out.bottomCancel = await bottomCancel();
            await reload();
            out.afterBottomCancel = rowsBrief(await gridInfo());
            await snap('w-05-after-bottom-cancel', {r: out.bottomCancel});
            // close arrow with nothing changed
            await openAdd();
            out.closeUnchanged = await closeArrow('dismiss');
            // "OK" with the name empty
            await openAdd();
            out.emptyOk = await pressOK();
            const wE = await winSnap('w-06-empty-name-ok');
            out.emptyOk.errors = wE.errors; out.emptyOk.text = flat(wE.text, 600);
            await closeArrow('accept');
            await reload();
            out.afterEmpty = rowsBrief(await gridInfo());
            // add "PDF" (Rule 4)
            out.addPdf = await addFormat('PDF');
            const gA = await gridInfo();
            await snap('w-07-after-add-pdf', {grid: gA, r: out.addPdf});
            out.afterAdd = rowsBrief(gA);
            await reload();
            out.afterAddReload = rowsBrief(await gridInfo());
            // the "Edit" window (Fields, td9)
            out.editArrow = await editFormat('PDF');
            const wEd = await winSnap('w-08-edit-window');
            out.editWindow = {title: wEd.title, headings: wEd.headings, tabs: wEd.tabs, fields: fieldsBrief(wEd)};
            // Rule 8: a changed name, then the "Metadata" tab: the question; Cancel keeps, then OK
            await nameBox().fill('PDF changed');
            await nameBox().blur();
            out.tabSwitchCancel = await clickTab('Metadata', 'dismiss');
            out.tabSwitchCancel.nameAfter = await top().locator('input[name^="name"]').first().inputValue().catch(() => null);
            await snap('w-09-tab-switch-cancel', {r: out.tabSwitchCancel});
            out.tabSwitchOk = await clickTab('Metadata', 'accept');
            await snap('w-10-tab-switch-ok', {r: out.tabSwitchOk});
            out.backToEdit = await clickTab('Edit', 'accept');
            await waitForm();
            out.backToEditName = await nameBox().inputValue().catch(() => null);
            await closeArrow('accept');
            await reload();
            out.afterTabSwitch = rowsBrief(await gridInfo());
            // Rule 8: the name and kind changed, "Physical format" ticked, "OK"
            await editFormat('PDF');
            await nameBox().fill('PDF edited');
            await top().locator('select[name="entryKey"]').selectOption({label: 'Hardback (BB)'}).catch(async () => top().locator('select[name="entryKey"]').selectOption('BB'));
            await setBox('isPhysicalFormat', true);
            out.editOk = await pressOK();
            const gE = await gridInfo();
            await snap('w-11-after-edit-ok', {grid: gE, r: out.editOk});
            out.afterEdit = rowsBrief(gE);
            await reload();
            out.afterEditReload = rowsBrief(await gridInfo());
            await editFormat('PDF edited');
            out.editReopen = fieldsBrief(await winSnap('w-12-edit-reopened'));
            await closeArrow('accept');
            fact('window', out);

            // Rule 6 (td16): URL Path refusals, on "PDF edited"; then a second format with the same path
            const up = {};
            await reload();
            for (const v of ['my pdf', '-pdf', 'a/b', 'a..b', 'pdf.', '123', 'pdf']) {
                await editFormat('PDF edited');
                await setField('urlPath', v);
                const r = await pressOK();
                const w = r.windowsAfter >= r.windowsBefore ? await winInfo() : null;
                up[v] = {closed: r.windowsAfter < r.windowsBefore, errors: w ? w.errors : [], posts: r.posts.map((p) => `${p.status} ${p.body.slice(0, 160)}`), notices: r.notices};
                if (w) { await snap(`w-13-urlpath-${v.replace(/[^a-z0-9]/gi, '_')}`, {r: up[v]}); await closeArrow('accept'); }
                await reload();
                await editFormat('PDF edited');
                up[v].reopened = await top().locator('input[name="urlPath"]').inputValue().catch(() => null);
                await closeArrow('accept');
            }
            await reload();
            up.second = await addFormat('EPUB', {fill: async () => setField('urlPath', 'pdf')});
            const w2 = up.second.windowsAfter >= up.second.windowsBefore ? await winSnap('w-14-second-pdf-path') : null;
            if (w2) { up.second.errors = w2.errors; await closeArrow('accept'); }
            await reload();
            up.afterSecond = rowsBrief(await gridInfo());
            if (up.afterSecond.some((l) => l.includes('EPUB'))) {
                await editFormat('EPUB');
                up.secondReopened = await top().locator('input[name="urlPath"]').inputValue().catch(() => null);
                await closeArrow('accept');
            }
            await snap('w-15-urlpath-done', {up});
            fact('urlPath', up);

            // Rule 7 (td17): the ISBN boxes
            const isbn = {};
            await reload();
            isbn.add = await addFormat('Print', {fill: async () => { await setField('isbn13', '978-951-98548-9-2'); await setField('isbn10', '951-98548-9-4'); }});
            await editFormat('Print');
            isbn.reopenBoxes = {i13: await top().locator('input[name="isbn13"]').inputValue(), i10: await top().locator('input[name="isbn10"]').inputValue()};
            await clickTab('Metadata', 'accept');
            isbn.codes1 = await codeRows('w-16-isbn-codes');
            // the "ISBN-13 (15)" row's value edited in the code window
            isbn.codeEdit = await editCode('ISBN-13', '9780000000002', 'w-17-code-window');
            isbn.codes2 = await codeRows('w-18-codes-after-edit');
            await clickTab('Edit', 'accept');
            await waitForm();
            isbn.boxesAfterCodeEdit = {i13: await top().locator('input[name="isbn13"]').inputValue(), i10: await top().locator('input[name="isbn10"]').inputValue()};
            isbn.okUnchanged = await pressOK();
            await reload();
            await editFormat('Print');
            isbn.boxesAfterOk = {i13: await top().locator('input[name="isbn13"]').inputValue(), i10: await top().locator('input[name="isbn10"]').inputValue()};
            await clickTab('Metadata', 'accept');
            isbn.codes3 = await codeRows('w-19-codes-after-unchanged-ok');
            await clickTab('Edit', 'accept');
            await waitForm();
            await setField('isbn10', '');
            isbn.emptyOk = await pressOK();
            await reload();
            await editFormat('Print');
            await clickTab('Metadata', 'accept');
            isbn.codes4 = await codeRows('w-20-codes-after-empty-10');
            await clickTab('Edit', 'accept');
            await waitForm();
            // nothing checks what is typed
            await setField('isbn13', 'not an isbn');
            isbn.junkOk = await pressOK();
            const wJ = isbn.junkOk.windowsAfter >= isbn.junkOk.windowsBefore ? await winInfo() : null;
            isbn.junkOk.errors = wJ ? wJ.errors : [];
            if (wJ) await closeArrow('accept');
            await reload();
            await editFormat('Print');
            isbn.junkReopen = await top().locator('input[name="isbn13"]').inputValue();
            await clickTab('Metadata', 'accept');
            isbn.codes5 = await codeRows('w-21-codes-after-junk');
            // "replacing any such codes": a second "ISBN-13 (15)" row added in the list, then the Edit tab's box changed
            isbn.addSecond = await addCode('15', '9781111111111', 'w-22-add-code-window');
            isbn.codes6 = await codeRows('w-23-codes-two-isbn13');
            await clickTab('Edit', 'accept');
            await waitForm();
            isbn.boxWithTwo = await top().locator('input[name="isbn13"]').inputValue();
            await setField('isbn13', '9782222222222');
            isbn.okTwo = await pressOK();
            await reload();
            await editFormat('Print');
            await clickTab('Metadata', 'accept');
            isbn.codes7 = await codeRows('w-24-codes-after-box-change');
            await closeArrow('accept');
            fact('isbn', isbn);
        }

        // ---------------------------------------------------------------- remote (td11; Rule 5; A4; the Identifiers tab's two ends)
        if (isOMP && on('remote')) {
            const I = S.I;
            await as(I.mg, I.path);
            const out = {};
            await formatsPage('I', '1', {name: 'r-01-empty'});
            out.addPdf = (await addFormat('PDF')).windowsAfter;
            await editFormat('PDF');
            const wL = await winSnap('r-02-local-edit-window');
            out.localTabs = wL.tabs;
            await closeArrow('accept');
            await reload();
            await openAdd();
            await setBox('remotelyHostedContent', true);
            await nameBox().fill('Web');
            await setField('remoteURL', 'https://example.org/book');
            out.addRemote = await pressOK();
            const g1 = await gridInfo();
            await snap('r-03-remote-row', {grid: g1});
            out.row = g1.rows;
            await reload();
            out.rowReload = rowsBrief(await gridInfo());
            await loc(page, 'Publication Formats: a remote format\'s name link', formatRow('Web').locator('.label a'));
            await editFormat('Web');
            const wR = await winSnap('r-04-remote-edit-window');
            out.remoteEdit = {tabs: wR.tabs, fields: fieldsBrief(wR)};
            await closeArrow('accept');
            // "Format Approval" on the local and on the remote format (the identifier question)
            await reload();
            out.approvalLocal = await statusWindow(formatRow('PDF'), 'Awaiting Approval', 'r-05-approval-local', {press: null});
            await closeArrow('accept');
            await reload();
            out.approvalRemote = await statusWindow(formatRow('Web'), 'Awaiting Approval', 'r-06-approval-remote', {press: null});
            await closeArrow('accept');
            // A4: untick the box, "OK", reopen
            await reload();
            await editFormat('Web');
            await setBox('remotelyHostedContent', false);
            out.untickedBeforeOk = fieldsBrief(await winInfo());
            out.untickOk = await pressOK();
            const g2 = await gridInfo();
            await snap('r-07-after-untick-ok', {grid: g2});
            out.afterUntick = g2.rows;
            await reload();
            out.afterUntickReload = rowsBrief(await gridInfo());
            await editFormat('Web');
            const wR2 = await winSnap('r-08-reopened-after-untick');
            out.reopened = {tabs: wR2.tabs, fields: fieldsBrief(wR2)};
            await closeArrow('accept');
            fact('remote', out);
        }

        // ---------------------------------------------------------------- files (td8, Rule 1, lines 80–89, td27 notices, mail, td25)
        if (isOMP && on('files')) {
            const P = S.P;
            const sub = P.subs['4'];
            const out = {};
            const recips = {au: `${P.au}@mail.test`, mg: `${P.mg}@mail.test`, se: `${P.se}@mail.test`, le: `${P.le}@mail.test`};
            const mailCounts = async () => { const r = {}; for (const [k, v] of Object.entries(recips)) r[k] = await app.mail.count({to: v}).catch((e) => `ERR ${e.message}`); r.mailpitTotal = await app.mail.messageCount().catch(() => null); return r; };
            out.mailBefore = await mailCounts();
            await as(P.mg, P.path);
            await formatsPage('P', '4', {name: 'f-01-empty'});
            out.tasksBefore = await tasksCount();
            const N = {};
            N.add = (await addFormat('PDF')).notices;
            N.uploadPdf = await changeFile('PDF', PDF);
            N.uploadHtml = await changeFile('PDF', HTMLF);
            const g1 = await gridInfo();
            await snap('f-02-pdf-two-files', {grid: g1});
            out.grid = g1.rows;
            await loc(page, 'Publication Formats: a format row (by name)', formatRow('PDF'));
            await loc(page, 'Publication Formats: the kind under a format name', formatRow('PDF').locator('.onix_code'));
            await loc(page, 'Publication Formats: a format file row', fileRow('article.pdf'));
            out.arrowFormat = await rowArrow(formatRow('PDF'));
            await snap('f-03-arrow-format');
            await reload();
            out.arrowPdf = await rowArrow(fileRow('article.pdf'));
            await snap('f-04-arrow-pdf');
            await reload();
            out.arrowHtml = await rowArrow(fileRow('article.html'));
            await snap('f-05-arrow-html');
            await reload();
            // "Select Files" › tick the production-ready file › "OK"
            {
                const t0 = Date.now();
                await formatRow('PDF').getByRole('link', {name: 'Select Files', exact: true}).first().click();
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] input[type=checkbox]')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
                await idle(page); await sleep(800);
                const w = await winSnap('f-06-select-files');
                const box = top().locator('tr').filter({hasText: 'replacement.pdf'}).locator('input[type=checkbox]').first();
                out.selectList = flat(w.text, 800);
                if (await box.count()) await box.check().catch(() => {});
                const t1 = Date.now();
                await top().getByRole('button', {name: 'OK', exact: true}).last().click().catch(() => {});
                await sleep(1800); await idle(page);
                N.selectFiles = {notices: noticesSince(t1), windows: await winCount(), dialogs: dialogsSince(t0)};
            }
            await reload();
            out.gridAfterSelect = rowsBrief(await gridInfo());
            N.formatApproval = await statusWindow(formatRow('PDF'), 'Awaiting Approval', 'f-07-format-approval');
            await reload();
            N.proofApproval = await statusWindow(fileRow('article.pdf'), 'Awaiting Approval', 'f-08-approve-proof');
            await reload();
            N.availability = await statusWindow(formatRow('PDF'), 'Not Available', 'f-09-format-availability');
            await reload();
            N.terms = await statusWindow(fileRow('article.pdf'), 'Set Terms', 'f-10-set-terms', {press: 'Save', before: async () => {
                const r = top().locator('input[value="openAccess"]').first();
                if (await r.count()) await r.check().catch(() => {});
            }});
            await reload();
            const g2 = await gridInfo();
            await snap('f-11-after-approvals', {grid: g2});
            out.gridAfterApprovals = rowsBrief(g2);
            // the links' other windows (lines 80, 81, 88): opened and left with Cancel
            out.approvedFormatWin = (await statusWindow(formatRow('PDF'), 'Approved', 'f-12-format-approved-window', {press: null})).win;
            await closeArrow('accept'); await reload();
            out.availableFormatWin = (await statusWindow(formatRow('PDF'), 'Available', 'f-13-format-available-window', {press: null})).win;
            await closeArrow('accept'); await reload();
            out.approvedFileWin = (await statusWindow(fileRow('article.pdf'), 'Approved', 'f-14-file-approved-window', {press: null})).win;
            await closeArrow('accept'); await reload();
            out.openAccessWin = (await statusWindow(fileRow('article.pdf'), 'Open Access', 'f-15-file-terms-window', {press: null})).win;
            await closeArrow('accept'); await reload();
            // "Metadata" › "Save"; a code added; the "Edit" tab's "OK"
            await editFormat('PDF');
            await clickTab('Metadata', 'accept');
            {
                const t0 = Date.now();
                const form = top().locator('select[name="productCompositionCode"]').first();
                const opts = await form.locator('option').evaluateAll((els) => els.map((o) => o.value).filter(Boolean)).catch(() => []);
                if (opts.length) await form.selectOption(opts[0]).catch(() => {});
                await top().getByRole('button', {name: 'Save', exact: true}).last().click().catch((e) => { N.metadataSaveErr = flat(e.message, 200); });
                await sleep(1800); await idle(page);
                N.metadataSave = {notices: noticesSince(t0), windows: await winCount(), dialogs: dialogsSince(t0), posts: postsSince(t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 90)} ${p.body.slice(0, 100)}`)};
                void form;
            }
            await snap('f-16-after-metadata-save');
            if (await winCount() < 2) { await reload(); await editFormat('PDF'); await clickTab('Metadata', 'accept'); }
            N.codeAdded = await addCode('15', '9783333333333', 'f-17-add-code');
            await clickTab('Edit', 'accept');
            await waitForm();
            N.editOk = (await pressOK()).notices;
            // mail and Tasks afterwards
            await sleep(2000);
            await drainJobs(app).catch((e) => log('drain', e.message));
            out.mailAfter = await mailCounts();
            await reload();
            out.tasksAfter = await tasksCount();
            out.notices = N;
            fact('files', out);

            // td25 / Rule 20: a second format "EPUB" with a file; the chapter's "Files" and "Production Ready Files" before and after
            const del = {};
            await formatsPage('P', '4');
            await addFormat('EPUB');
            del.upload = await changeFile('EPUB', PDF);
            await reload();
            del.before = rowsBrief(await gridInfo());
            del.chapterBefore = await chapterFiles('d-01-chapter-files-before');
            del.prodReadyBefore = await productionReady('d-02-production-ready-before');
            await formatsPage('P', '4');
            del.arrow = await rowArrow(formatRow('EPUB'), 'Delete');
            await page.locator('[role="dialog"]:visible, [data-cy="dialog"]').filter({hasText: /Are you sure|delete/i}).last().waitFor({timeout: 10000}).catch(() => {});
            await idle(page); await sleep(500);
            const wD = await winSnap('d-03-delete-dialog');
            del.dialog = {title: wD.title, text: flat(wD.text, 400), buttons: wD.buttons};
            {
                const c = top().getByRole('button', {name: 'Cancel', exact: true}).or(top().getByRole('link', {name: 'Cancel', exact: true})).last();
                await c.click().catch(() => {});
                await sleep(1200); await idle(page);
            }
            del.afterCancel = rowsBrief(await gridInfo());
            await reload();
            del.afterCancelReload = rowsBrief(await gridInfo());
            await rowArrow(formatRow('EPUB'), 'Delete');
            await page.locator('[role="dialog"]:visible').filter({hasText: /Are you sure|delete/i}).last().waitFor({timeout: 10000}).catch(() => {});
            await idle(page); await sleep(500);
            {
                const t0 = Date.now();
                await top().getByRole('button', {name: 'OK', exact: true}).last().click().catch((e) => { del.okErr = flat(e.message, 200); });
                await sleep(1800); await idle(page);
                del.okNotices = noticesSince(t0);
                del.okPosts = postsSince(t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 90)} ${p.body.slice(0, 100)}`);
            }
            const gD = await gridInfo();
            await snap('d-04-after-delete', {grid: gD});
            del.after = rowsBrief(gD);
            await reload();
            del.afterReload = rowsBrief(await gridInfo());
            del.chapterAfter = await chapterFiles('d-05-chapter-files-after');
            del.prodReadyAfter = await productionReady('d-06-production-ready-after');
            fact('delete', del);
            // the Author's Tasks and mail
            await as(P.au, P.path);
            await page.goto(cUrl(P.path, '/dashboard/mySubmissions')); await idle(page);
            fact('author-after', {tasks: await tasksCount(), mail: await mailCounts()});
        }

        // ---------------------------------------------------------------- version (td26 Rule 21; td7 Rule 2)
        if (isOMP && on('version')) {
            const P = S.P;
            await as(P.mg, P.path);
            // p5: the first version dressed, then a new version
            const v = {};
            const s5 = P.subs['5'];
            v.v1Seeded = rowsBrief(await formatsPage('P', '5', {name: 'v-01-v1-seeded'}));
            v.proof = await statusWindow(fileRow('article.pdf'), 'Awaiting Approval', 'v-02-v1-approve-proof');
            await reload();
            await editFormat('PDF');
            await top().locator('select[name="entryKey"]').selectOption('BC');
            await setBox('isPhysicalFormat', true);
            await setField('urlPath', 'pdfv1');
            await setField('isbn13', '978-951-98548-9-2');
            v.editV1 = (await pressOK()).windowsAfter;
            await reload();
            await openAdd();
            await setBox('remotelyHostedContent', true);
            await nameBox().fill('Web');
            await setField('remoteURL', 'https://example.org/web');
            v.addWeb = (await pressOK()).windowsAfter;
            await reload();
            const g1 = await gridInfo();
            await snap('v-03-v1-dressed', {grid: g1});
            v.v1 = rowsBrief(g1);
            s5.v2 = await newVersion('P', '5', 'v-04-new-version');
            save();
            const g2 = await formatsPage('P', '5', {name: 'v-05-v2-list', pub: s5.v2});
            v.v2 = rowsBrief(g2);
            v.v2Grid = g2.rows;
            await editFormat('PDF');
            v.v2PdfEdit = fieldsBrief(await winSnap('v-06-v2-pdf-edit'));
            await clickTab('Metadata', 'accept');
            v.v2Codes = await codeRows('v-07-v2-pdf-codes');
            await closeArrow('accept');
            await reload();
            await editFormat('Web');
            v.v2WebEdit = fieldsBrief(await winSnap('v-08-v2-web-edit'));
            await closeArrow('accept');
            // the copy changed on the new version; the first version read again
            await reload();
            await editFormat('PDF');
            await nameBox().fill('PDF v2');
            await setField('urlPath', 'pdfv2');
            v.renameV2 = (await pressOK()).windowsAfter;
            v.v2AfterRename = rowsBrief(await formatsPage('P', '5', {name: 'v-09-v2-renamed', pub: s5.v2}));
            v.v1AfterRename = rowsBrief(await formatsPage('P', '5', {name: 'v-10-v1-after-v2-rename', pub: s5.pub}));
            await editFormat('PDF');
            v.v1PdfAfter = fieldsBrief(await winInfo());
            await closeArrow('accept');
            fact('version-copy', v);

            // p6: a book with no format; a new version; three formats on it; the first version's list
            const o = {};
            const s6 = P.subs['6'];
            o.v1Empty = rowsBrief(await formatsPage('P', '6', {name: 'v-11-p6-v1-empty'}));
            s6.v2 = await newVersion('P', '6', 'v-12-p6-new-version');
            save();
            await formatsPage('P', '6', {pub: s6.v2});
            for (const nm of ['PDF', 'EPUB', 'Print']) await addFormat(nm);
            const gA = await gridInfo();
            await snap('v-13-p6-v2-three', {grid: gA});
            o.v2Order = gA.rows.filter((r) => r.kind === 'format').map((r) => r.name);
            await reload();
            o.v2OrderReload = (await gridInfo()).rows.filter((r) => r.kind === 'format').map((r) => r.name);
            // the order after the first format is edited ("OK" with a new name)
            await editFormat('PDF');
            await nameBox().fill('PDF renamed');
            await pressOK();
            o.v2OrderAfterEdit = (await gridInfo()).rows.filter((r) => r.kind === 'format').map((r) => r.name);
            await reload();
            o.v2OrderAfterEditReload = (await gridInfo()).rows.filter((r) => r.kind === 'format').map((r) => r.name);
            await snap('v-13b-p6-v2-after-edit', {order: o.v2OrderAfterEditReload});
            // the side menu: its version entries, then the first version chosen there
            o.nav = await sideNav();
            await snap('v-14-p6-side-menu', {nav: o.nav});
            o.chooseV1 = await chooseVersion(0, 'v-15-p6-v1-chosen');
            o.chooseV2 = await chooseVersion(1, 'v-16-p6-v2-chosen');
            fact('version-list', o);
        }

        // ---------------------------------------------------------------- filearrows (line 87 at every managing level; after roles)
        if (isOMP && on('filearrows')) {
            const P = S.P;
            const o = {};
            await as(P.mg, P.path);
            await formatsPage('P', '1');
            o.upPdf = (await changeFile('PDF mgr', PDF)).notices;
            await reload();
            o.upHtml = (await changeFile('PDF mgr', HTMLF)).notices;
            for (const [key, user] of [['mgr', P.mg], ['admin', 'admin'], ['se', P.se], ['le', P.le]]) {
                await as(user, P.path);
                const g = await formatsPage('P', '1', {name: `fa-${key}-page`});
                const r = {rows: rowsBrief(g).filter((x) => x.startsWith('file'))};
                r.pdf = (await rowArrow(fileRow('article.pdf'))).entries;
                await reload();
                r.html = (await rowArrow(fileRow('article.html'))).entries;
                await snap(`fa-${key}-html-arrow`);
                o[key] = r;
            }
            // a format file's name: what pressing it gives (the Series editor and the Press manager)
            for (const [key, user] of [['se', P.se], ['mgr', P.mg]]) {
                await as(user, P.path);
                await formatsPage('P', '1');
                const dl = page.waitForEvent('download', {timeout: 20000}).catch(() => null);
                await fileRow('article.pdf').locator('a.pkp_linkaction_downloadFile').first().click();
                const d = await dl;
                o[`download-${key}`] = d ? {file: d.suggestedFilename(), url: d.url().replace(/^.*\$\$\$call\$\$\$/, '')} : {download: null, url: page.url()};
            }
            fact('filearrows', o);
        }

        // ---------------------------------------------------------------- isbn2 (Rule 7 "replacing any such codes": two ISBN-13 rows, then the box)
        if (isOMP && on('isbn2')) {
            const P = S.P;
            await as(P.mg, P.path);
            const o = {};
            await formatsPage('P', '3');
            await addFormat('Twin', {fill: async () => setField('isbn13', '9780000000019')});
            await editFormat('Twin');
            await clickTab('Metadata', 'accept');
            o.codes0 = (await codeRows()).rows;
            o.add = await addCode('ISBN-13 (15)', '9780000000026', 'i2-01-add-code');
            o.codes1 = (await codeRows('i2-02-two-isbn13')).rows;
            await clickTab('Edit', 'accept');
            await waitForm();
            o.boxWithTwo = await top().locator('input[name="isbn13"]').inputValue();
            await setField('isbn13', '9780000000033');
            o.ok = (await pressOK()).windowsAfter;
            await reload();
            await editFormat('Twin');
            await clickTab('Metadata', 'accept');
            o.codes2 = (await codeRows('i2-03-after-box-change')).rows;
            await closeArrow('accept');
            fact('isbn2', o);
        }

        // (dev aid) the side menu's version choice alone, on p6 once it has two versions
        if (isOMP && on('choose') && S.P.subs['6'].v2) {
            await as(S.P.mg, S.P.path);
            await formatsPage('P', '6', {pub: S.P.subs['6'].v2});
            fact('choose', {v1: await chooseVersion(0, 'c-01-v1'), v2: await chooseVersion(1, 'c-02-v2')});
        }

        // ---------------------------------------------------------------- lang (td10)
        if (isOMP && on('lang')) {
            const L = S.L;
            await as(L.mg, L.path);
            const out = {};
            for (const s of ['1', '2']) {
                const r = {};
                await formatsPage('L', s, {name: `l-${s}-empty`});
                await openAdd();
                const w0 = await winSnap(`l-${s}-add-window`);
                r.fields = fieldsBrief(w0);
                r.nameInputs = await top().locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: e.getClientRects().length > 0, required: e.required || e.getAttribute('aria-required') === 'true'})));
                r.label = flat(await top().locator('label').filter({hasText: /^\s*Name/}).first().innerText().catch(() => null), 100);
                // the other language boxes: shown once the visible box has focus
                await nameBox().focus();
                await sleep(600);
                r.nameInputsFocused = await top().locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: e.getClientRects().length > 0, placeholder: e.placeholder || null, title: e.title || null})));
                await shot(page, N(`l-${s}-name-focused`));
                // "OK" with every box empty
                r.emptyOk = await pressOK();
                const wE = await winInfo();
                r.emptyErrors = wE.errors;
                await snap(`l-${s}-empty-ok`, {errors: wE.errors});
                // only the other language filled
                const other = s === '1' ? 'fr_CA' : 'en';
                await nameBox().focus();
                await sleep(400);
                const ob = top().locator(`input[name="name[${other}]"]`).first();
                const visible = await ob.isVisible().catch(() => false);
                if (visible) await ob.fill(`Other ${other}`); else await ob.evaluate((e, val) => { e.value = val; }, `Other ${other}`);
                r.otherFilledVisibly = visible;
                r.otherOk = await pressOK();
                const wO = r.otherOk.windowsAfter >= r.otherOk.windowsBefore ? await winInfo() : null;
                r.otherErrors = wO ? wO.errors : null;
                r.otherOk.posts = r.otherOk.posts.map((p) => `${p.status} ${p.body.slice(0, 200)}`);
                await snap(`l-${s}-other-only-ok`, {errors: r.otherErrors});
                if (wO) {
                    // the other end: only the book's own language filled
                    const own = s === '1' ? 'en' : 'fr_CA';
                    await nameBox().focus();
                    await sleep(400);
                    await ob.fill('');
                    await top().locator(`input[name="name[${own}]"]`).first().fill(`Own ${own}`);
                    r.ownOk = await pressOK();
                    r.ownOk.posts = r.ownOk.posts.map((p) => `${p.status} ${p.body.slice(0, 200)}`);
                    const wOwn = r.ownOk.windowsAfter >= r.ownOk.windowsBefore ? await winInfo() : null;
                    r.ownErrors = wOwn ? wOwn.errors : null;
                    await snap(`l-${s}-own-only-ok`, {errors: r.ownErrors});
                    if (wOwn) await closeArrow('accept');
                }
                await reload();
                r.after = rowsBrief(await gridInfo());
                if (r.after.some((x) => x.includes('Own'))) {
                    await editFormat('Own');
                    r.ownReopened = fieldsBrief(await winInfo());
                    await closeArrow('accept');
                }
                out[s] = r;
            }
            fact('lang', out);
        }

        // ---------------------------------------------------------------- reader (A5: a shared and a numeric URL Path, the reader's links)
        if (isOMP && on('reader')) {
            const P = S.P;
            const s7 = P.subs['7'];
            const out = {formats: s7.formats};
            const [pdf, epub] = s7.formats;
            await as(P.mg, P.path);
            const setPath = async (label, val) => {
                await formatsPage('P', '7');
                await editFormat(label);
                await setField('urlPath', val);
                const r = await pressOK();
                return {closed: r.windowsAfter < r.windowsBefore, errors: r.windowsAfter >= r.windowsBefore ? (await winInfo()).errors : []};
            };
            const readBook = async (name) => {
                await signOut(page).catch(() => {});
                who = null;
                await page.goto(cUrl(P.path, `/catalog/book/${s7.id}`));
                await idle(page);
                const links = await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /catalog\/view|catalog\/download/.test(a.getAttribute('href') || '')).map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
                await snap(`${name}-book`, {links});
                const follow = [];
                for (const l of links) {
                    const resp = await page.goto(l.href).catch((e) => ({err: String(e.message).slice(0, 200)}));
                    await idle(page);
                    const embeds = await page.evaluate(() => [...document.querySelectorAll('iframe, embed, object, a.download, a[href*="download"]')].map((e) => e.getAttribute('src') || e.getAttribute('data') || e.getAttribute('href')).slice(0, 5)).catch(() => []);
                    follow.push({href: l.href, status: resp && resp.status ? resp.status() : resp, url: page.url(), title: await page.title().catch(() => null), embeds, text: flat(await page.locator('body').innerText().catch(() => ''), 300)});
                }
                await snap(`${name}-followed`, {follow});
                return {links, follow};
            };
            out.baseline = await readBook('rd-01-no-paths');
            await as(P.mg, P.path);
            out.pdfPath = await setPath('PDF', 'pdf');
            out.epubSame = await setPath('EPUB', 'pdf');
            out.samePath = await readBook('rd-02-both-pdf');
            await as(P.mg, P.path);
            out.epubNumber = await setPath('EPUB', String(pdf.id));
            out.pdfPathCleared = await setPath('PDF', '');
            out.numberPath = await readBook('rd-03-epub-number');
            fact('reader', out);
        }

        // ---------------------------------------------------------------- galley (OJS, OPS: A4, A5 controls)
        if (!isOMP && on('galley')) {
            const J = S.J;
            const sub = J.subs['1'];
            await as(J.mg, J.path);
            const out = {};
            const gm = () => page.locator('[data-cy="galley-manager"]').first();
            const galleyForm = () => page.locator('form[id$="GalleyForm"]:visible').last();
            const openGalleys = async (name) => {
                await openWf(J.path, sub.id, `publication_${sub.pub}_galleys`);
                await gm().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                if (name) await snap(name);
            };
            const addGalley = async () => {
                await page.getByRole('button', {name: 'Add galley', exact: true}).first().click();
                await galleyForm().locator('input[name="label"]').waitFor({state: 'attached', timeout: T});
                await idle(page); await sleep(400);
            };
            const gSave = async () => {
                const t0 = Date.now();
                await galleyForm().getByRole('button', {name: 'Save', exact: true}).last().click();
                await sleep(1500); await idle(page);
                const open = await galleyForm().isVisible().catch(() => false);
                const errors = open ? (await winInfo()).errors : [];
                return {open, errors, notices: noticesSince(t0)};
            };
            const closeWizard = async () => {
                const wz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                if (await wz.isVisible().catch(() => false)) {
                    await wz.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                    await sleep(1200); await idle(page);
                }
            };
            await openGalleys('g-01-galleys');
            // remote box: an address typed, then unticked
            await addGalley();
            await galleyForm().locator('input[name="label"]').fill('Remote');
            await galleyForm().locator('input[name="remotelyHostedContent"]').check();
            await sleep(300);
            await galleyForm().locator('input[name="urlRemote"]').fill('https://example.org/galley');
            await galleyForm().locator('input[name="remotelyHostedContent"]').uncheck();
            await sleep(400);
            out.untick = await galleyForm().evaluate((f) => ({urlRemote: f.querySelector('[name="urlRemote"]')?.value, urlPath: f.querySelector('[name="urlPath"]')?.value}));
            await snap('g-02-remote-unticked', {untick: out.untick});
            await galleyForm().locator('input[name="remotelyHostedContent"]').check();
            await sleep(300);
            out.retick = await galleyForm().evaluate((f) => ({urlRemote: f.querySelector('[name="urlRemote"]')?.value}));
            await closeArrow('accept');
            // URL Path: a number, then "pdf" twice
            await openGalleys();
            await addGalley();
            await galleyForm().locator('input[name="label"]').fill('PDF');
            await galleyForm().locator('input[name="urlPath"]').fill('123');
            out.number = await gSave();
            await snap('g-03-number', {r: out.number});
            if (out.number.open) {
                await galleyForm().locator('input[name="urlPath"]').fill('pdf');
                out.pdf = await gSave();
            }
            await closeWizard();
            await openGalleys();
            await addGalley();
            await galleyForm().locator('input[name="label"]').fill('HTML');
            await galleyForm().locator('input[name="urlPath"]').fill('pdf');
            out.duplicate = await gSave();
            await snap('g-04-duplicate', {r: out.duplicate});
            if (out.duplicate.open) await closeArrow('accept');
            await closeWizard();
            fact('galley', out);
        }
    } catch (e) {
        log('ERROR', e.stack);
        await snap('error', {error: String(e.stack).slice(0, 2000)}).catch(() => {});
        fact('error', String(e.stack).slice(0, 1500));
    } finally {
        await close();
    }

    // The "Metadata" tab's "Product Identification" rows.
    async function codeRows(name) {
        await top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first().waitFor({timeout: 20000}).catch(() => {});
        await idle(page); await sleep(500);
        const rows = await top().locator('[id^="component-grid-catalogentry-identificationcodegrid"] tbody tr.gridRow').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
        const gridText = flat(await top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first().innerText().catch(() => null), 600);
        if (name) await snap(name, {codes: rows, gridText});
        return {rows, gridText};
    }
    async function addCode(code, value, name) {
        const g = top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first();
        await g.getByRole('link', {name: /Add Code/}).first().click();
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name="value"]')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(400);
        await top().locator('select[name="code"] option').nth(1).waitFor({state: 'attached', timeout: 10000}).catch(() => {});
        const w = await winSnap(name);
        const sel = top().locator('select[name="code"]').first();
        const picked = await sel.selectOption(/^\d+$/.test(code) ? code : {label: code}).catch((e) => `ERR ${flat(e.message, 120)}`);
        await top().locator('input[name="value"]').fill(value);
        const t0 = Date.now();
        await top().getByRole('button', {name: /^(Save|OK)$/}).last().click();
        await sleep(1500); await idle(page);
        return {win: {title: w.title, buttons: w.buttons}, picked, notices: noticesSince(t0), windows: await winCount()};
    }
    async function newVersion(k, s, name) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, pubKey(sub, 'titleAbstract', sub.pub));
        await wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first().click();
        const dlg = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await dlg.locator('select[name="versionStage"]').waitFor({timeout: T});
        await idle(page); await sleep(1200);
        const st = dlg.locator('select[name="versionStage"]');
        if (!(await st.inputValue())) await st.selectOption('VoR');
        const minor = dlg.locator('select[name="versionIsMinor"]');
        if (await minor.isVisible().catch(() => false)) { if (!(await minor.inputValue())) await minor.selectOption('false'); }
        await snap(`${name}-window`);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const r = await w;
        let id = null;
        try { id = (await r.json()).id; } catch { /* */ }
        await idle(page); await sleep(800);
        await snap(name, {newVersion: id, status: r ? r.status() : null});
        return id;
    }
    async function sideNav() {
        return wf().evaluate((d) => [...d.querySelectorAll('nav a, nav button, [role=navigation] a, [role=navigation] button')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    }
    // The side menu's i-th version entry (in the menu's order), then its "Publication Formats".
    async function chooseVersion(i, name) {
        const entries = wf().locator('nav a, nav button, [role=navigation] a, [role=navigation] button').filter({hasText: /version|Version of Record|\(\d{4}-\d{2}-\d{2}\)/});
        const texts = await entries.allTextContents().catch(() => []);
        const e = entries.nth(i);
        if (!(await e.count())) return {texts, missing: true};
        // the chosen version's own "Publication Formats": the visible one right after its entry in the menu
        // (before the next version's entry); the entry is pressed until its group is open (it toggles)
        const mark = () => e.evaluate((el, idx) => {
            const all = [...el.closest('nav').querySelectorAll('a, button')];
            const start = all.indexOf(el);
            document.querySelectorAll('[data-k2pf]').forEach((x) => x.removeAttribute('data-k2pf'));
            const rest = all.slice(start + 1);
            const stop = rest.findIndex((x) => /Version of Record|version|Create New Version/.test(x.textContent));
            const t = rest.slice(0, stop < 0 ? undefined : stop).find((x) => x.textContent.trim() === 'Publication Formats' && x.getClientRects().length);
            if (t) t.setAttribute('data-k2pf', String(idx));
            return t ? 1 : 0;
        }, i).catch(() => 0);
        let n = await mark();
        for (let k = 0; !n && k < 2; k++) {
            await e.click().catch(() => {});
            await idle(page); await sleep(700);
            n = await mark();
        }
        const navAfter = await sideNav();
        await wf().locator(`[data-k2pf="${i}"]`).first().click().catch(() => {});
        await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page);
        const g = await gridInfo();
        await snap(name, {grid: g, texts, navAfter});
        return {texts: texts.map((t) => t.replace(/\s+/g, ' ').trim()), clicked: i, pfEntries: n, url: page.url(), rows: rowsBrief(g)};
    }
    async function chapterFiles(name) {
        const P = S.P;
        const sub = P.subs['4'];
        await openWf(P.path, sub.id, pubKey(sub, 'chapters'));
        const a = wf().locator('a.pkp_linkaction_editChapter').filter({hasText: 'K2 Chapter One'}).first();
        await a.waitFor({timeout: 20000}).catch(() => {});
        await a.click().catch(() => {});
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form')].some((e) => e.getClientRects().length && /Files/.test(e.innerText)), null, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(800);
        const w = await winSnap(name);
        const files = await top().locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => /file/i.test(e.name || e.id)).map((e) => ({name: e.name, checked: e.checked, row: (e.closest('tr, li, label, div')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)})));
        await closeArrow('accept');
        return {files, text: flat(w.text, 1200)};
    }
    async function productionReady(name) {
        const P = S.P;
        const sub = P.subs['4'];
        await openWf(P.path, sub.id, null);
        const prod = wf().locator('nav a, nav button').filter({hasText: /^\s*Production\s*$/}).first();
        if (await prod.count()) { await prod.click().catch(() => {}); await idle(page); await sleep(800); await idle(page); }
        const text = await wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const h = [...d.querySelectorAll('h2, h3, h4, [class*=heading]')].find((e) => /Production Ready Files/.test(e.textContent));
            let box = h;
            for (let i = 0; box && i < 6 && !/article|replacement|No Items|No files/i.test(box.innerText || ''); i++) box = box.parentElement;
            return box ? f(box.innerText).slice(0, 800) : null;
        }).catch(() => null);
        await snap(name, {productionReady: text});
        return text;
    }
    async function editCode(match, value, name) {
        const g = top().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first();
        const row = g.locator('tr.gridRow').filter({hasText: match}).first();
        const r = await rowArrow(row, 'Edit');
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name="value"]')].some((e) => e.getClientRects().length), null, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(400);
        const w = await winSnap(name);
        await top().locator('input[name="value"]').fill(value);
        const t0 = Date.now();
        const b = top().getByRole('button', {name: /^(Save|OK)$/}).last();
        await b.click();
        await sleep(1500); await idle(page);
        return {arrow: r, win: {title: w.title, fields: fieldsBrief(w), buttons: w.buttons}, notices: noticesSince(t0), windows: await winCount()};
    }
});
