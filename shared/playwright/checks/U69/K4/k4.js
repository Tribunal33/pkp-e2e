// U69 claim check, chunk K4: opening and buying files {OMP}, with read-only controls on OJS and OPS
// (a galley's PDF view and download, the usage log, the "Payments" page by its address).
// Spec: docs/specs/U69-monograph-landing-page.md — Fields "The PDF view page", "The HTML view page", "The payment
// page" (157–190); Rules 13–14 (339–385); Side effects (456–476); Settings 1–2 (479–484), 9–10 (514–523); A7–A12
// (737–786); footnotes f, j, k, q, r, td13, td14, td15, td21, td22, td25, f-a7 … f-a12.
//
//   RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccK4 node bin/probe.js <all|omp|ojs|ops> shared/playwright/checks/U69/K4/k4.js
//   PHASES (OMP): seed, plugins, free, ver, off, restrict, buy, levels, stop, paypal, enable, quiet, usage
//   (OJS, OPS): control. Default: all. RUN names the run (r1, r2): each run seeds its own scratch contexts (state
//   k4-state-<RUN>-<app>.json), writes facts to k4-<RUN>-facts-<app>.json and snapshots as <RUN>-<name>-<app>.json/png.
//   A full OMP run outlasts the Bash cap: launch it detached (nohup … &).
//
// Scratch presses (OMP); users <p>mg manager, <p>se Series editor, <p>ce copyeditor, <p>rv reviewer, <p>au author,
// <p>rd reader; principal contact "Pat Contact" <p>ct@mail.test:
//   A  a new press + "Citation Style Language" on: a1 published with PDF (article.pdf), HTML (article.html +
//      figure.png), Other (notes.md), chapter Tides (page); later a second version published on screen (" Revised").
//   B  a new press: b1 like a1; the manager unticks "PDF.js PDF Viewer" and "HTML Monograph File" on screen.
//   R  restrictMonographAccess: r1 with PDF.
//   Q  USD + "Manual Fee Payment" with instructions: q1 with PDF at Direct Sales 25, Two (article.pdf at 25 plus
//      replacement.pdf uploaded on screen, Open Access), Free (Open Access).
//   N  a new press (no currency): n1 PDF at 25.   M  USD + manual, no instructions: m1 PDF at 25.
//   P  USD + "Paypal Fee Payment", no Account Name: p1 PDF at 25; Account Name typed on screen in phase paypal.
//   E  as Q; the manager unticks "Enable" on screen in phase enable (td15).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,plugins,free,viewer,ver,off,restrict,buy,levels,stop,paypal,enable,quiet,emails,usage,control').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k4]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k4-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';

// ---------------------------------------------------------------- the usage log (as U64 K1)
function logDir(app) {
    const root = path.isAbsolute(app.root) ? app.root : path.resolve(REPO, app.root);
    const cfg = fs.readFileSync(path.join(root, 'config.test.inc.php'), 'utf8');
    return path.join(cfg.match(/^files_dir\s*=\s*(.+)$/m)[1].trim(), 'usageStats', 'usageEventLogs');
}
function readLog(app) {
    try {
        const dir = logDir(app);
        const files = fs.readdirSync(dir).filter((f) => /^usage_events_\d{8}\.log$/.test(f)).sort();
        const f = files[files.length - 1];
        const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        return {file: f, lines};
    } catch (e) { return {file: null, lines: [], err: String(e.message).slice(0, 200)}; }
}
const slimLog = (l) => ({assocType: l.assocType, contextId: l.contextId, submissionId: l.submissionId, chapterId: l.chapterId, representationId: l.representationId,
    submissionFileId: l.submissionFileId, url: String(l.canonicalUrl || '').replace(/^.*index\.php\/[^/]+/, '')});

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k4-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u69k4');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sol', familyName: 'Series'},
            {username: `${p}ce`, roles: ['copyeditor'], givenName: 'Cai', familyName: 'Copy'},
            {username: `${p}rv`, roles: ['externalReviewer'], givenName: 'Rex', familyName: 'Reviewer'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${p}rd`, roles: ['reader'], givenName: 'Rae', familyName: 'Reader'},
        ].filter((u) => isOMP || ['mg', 'au', 'rd'].some((x) => u.username.endsWith(x)));
        const ctx = async (k, spec = {}) => {
            const p = `${t}${k.toLowerCase()}`;
            const c = await app.api.createContext({tag: p, context: {name: {en: `K4 ${k} ${t}`}, contactName: 'Pat Contact', contactEmail: `${p}ct@mail.test`},
                users: people(p), ...spec});
            S[k] = {path: c.path || p, p, ct: `${p}ct@mail.test`, subs: {}};
            for (const u of ['mg', 'se', 'ce', 'rv', 'au', 'rd']) S[k][u] = `${p}${u}`;
        };
        const sub = async (k, s, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `K4 ${k}${s} book`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null, chapters: r.chapters || null, galleys: r.galleys || null};
        };
        if (isOMP) {
            const f = (name, file, extra = {}) => ({name, file, genre: 'Book Manuscript', ...extra});
            const three = {published: true, mediaFiles: [{file: 'figure.png'}],
                publicationFormats: [f('PDF', 'article.pdf'), f('HTML', 'article.html'), f('Other', 'notes.md')]};
            await ctx('A', {plugins: {citationstylelanguageplugin: {enabled: true}}});
            await sub('A', '1', {...three, chapters: [{title: 'Tides', authors: [S.A.au], page: true, files: ['publicationFormats.0']}]});
            await ctx('B');
            await sub('B', '1', three);
            await ctx('R', {restrictMonographAccess: true});
            await sub('R', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf')]});
            const pay = {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K4 by cheque.'};
            await ctx('Q', {payments: {enabled: true, ...pay}});
            await sub('Q', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf', {price: '25'}), f('Two', 'article.pdf', {price: '25'}), f('Free', 'article.pdf')]});
            await ctx('N');
            await sub('N', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf', {price: '25'})]});
            await ctx('M', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment'}});
            await sub('M', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf', {price: '25'})]});
            await ctx('P', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'PaypalPayment'}});
            await sub('P', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf', {price: '25'})]});
            await ctx('E', {payments: {enabled: true, ...pay}});
            await sub('E', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf', {price: '25'})]});
        } else {
            const isOJS = app.name === 'ojs';
            const sec = isOJS ? {abbrev: 'ART', title: 'Articles'} : {abbrev: 'PRE', title: 'Preprints'};
            const body = {sections: [sec]};
            if (isOJS) body.issues = [{volume: 1, number: '1', year: 2025, published: true}];
            await ctx('C', body);
            const place = {section: sec.abbrev, ...(isOJS ? {issue: {volume: 1, number: '1', year: 2025}} : {})};
            const gal = isOJS ? [{label: 'PDF', locale: 'en', file: 'article.pdf'}, {label: 'HTML', locale: 'en', file: 'article.html'}]
                : [{label: 'PDF', locale: 'en', file: 'preprint.pdf'}];
            await sub('C', '1', {published: true, galleys: gal, ...place});
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 3000));
        note(`ccK4 [${app.name}] ${RUN}: scratch contexts ${Object.keys(S).filter((k) => S[k] && S[k].path).map((k) => `${k} ${S[k].path} (books ${JSON.stringify(Object.fromEntries(Object.entries(S[k].subs).map(([s, v]) => [s, {id: v.id, pub: v.pub, formats: (v.formats || []).map((x) => `${x.name}:${x.id}/${x.submissionFileId}`)}])))})`).join('; ')}`);
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+\/index\.php\/[^/]+/, '');
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
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
    const resps = [];
    page.on('response', (r) => {
        const u = r.url();
        if (!/catalog\/(view|download|book)|payment|login|article\/(view|download)|preprint\/(view|download)|pdfJsViewer|pdf\.js|\$\$\$call\$\$\$|\/api\/v1\//.test(u)) return;
        resps.push({at: Date.now(), method: r.request().method(), status: r.status(), url: rel(u).slice(0, 200), frame: r.frame() === page.mainFrame() ? 'main' : 'sub'});
    });
    page.on('requestfailed', (r) => resps.push({at: Date.now(), method: r.method(), status: 'failed', url: rel(r.url()).slice(0, 200), failure: r.failure() && r.failure().errorText}));
    const respsSince = (t0) => resps.filter((p) => p.at >= t0).map(({at, ...p}) => p);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), msg: flat(e.message, 200)}));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push({at: Date.now(), msg: `console: ${flat(m.text(), 200)}`}); });
    const errorsSince = (t0) => pageErrors.filter((p) => p.at >= t0).map((p) => p.msg);

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
    const visitor = async () => { if (who !== null) { await signOut(page).catch(() => {}); } who = null; };
    const settle = async () => { await idle(page).catch(() => {}); await page.waitForFunction(() => document.readyState === 'complete', null, {timeout: 10000}).catch(() => {}); await sleep(500); };

    // =============================================================== the reader's pages as data
    const FILES = () => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const root = document.querySelector('.obj_monograph_full') || document.body;
        const box = root.querySelector('.entry_details .item.files') || root.querySelector('.item.files');
        const formats = box ? [...box.querySelectorAll(':scope > div')].map((d) => ({
            cls: d.className, names: [...d.querySelectorAll('.name')].map((n) => f(n.textContent)),
            links: [...d.querySelectorAll('a')].map((a) => ({text: f(a.textContent), href: a.getAttribute('href'), cls: a.className, target: a.getAttribute('target')})), text: f(d.innerText)})) : null;
        const toc = [...root.querySelectorAll('.item.chapters > ul > li')].map((li) => ({text: f(li.innerText), links: [...li.querySelectorAll('a')].map((a) => ({text: f(a.textContent), href: a.getAttribute('href')}))}));
        const cite = [...document.querySelectorAll('.citation_formats a, .item.citation a')].map((a) => ({text: f(a.textContent), href: a.getAttribute('href')}));
        return {url: location.href, title: document.title, h1: f(root.querySelector('h1')?.textContent), filesHeading: box ? f(box.querySelector('h2')?.textContent) : null,
            formats, toc, cite, notices: [...root.querySelectorAll('.cmp_notification')].map((n) => f(n.innerText)), loginForm: !!document.querySelector('form#login'), body: f(document.body.innerText).slice(0, 600)};
    };
    async function bookPage(ctx, id, name, suffix = '') {
        const t0 = Date.now();
        const resp = await page.goto(cUrl(ctx, `/catalog/book/${id}${suffix}`)).catch((e) => ({err: flat(e.message, 160)}));
        await settle();
        const s = await snap(name);
        const d = await page.evaluate(FILES).catch((e) => ({error: flat(e.message, 200)}));
        record(N(name), {book: d}, {merge: true});
        return {status: resp && resp.status ? resp.status() : resp, responses: respsSince(t0), errors: errorsSince(t0), ...d, _snap: N(name)};
    }
    const linkIn = (fmtCls, text) => page.locator(`.entry_details .item.files > div${fmtCls ? `.${fmtCls}` : ''} a`).filter({hasText: text});
    const fmtOf = (k, s, name) => (S[k].subs[s].formats || []).find((x) => x.name === name) || {};
    const fileLink = (k, s, name) => { const x = fmtOf(k, s, name); return page.locator(`.obj_monograph_full a[href*="/${x.id}/${x.submissionFileId}"]`); };

    // The PDF / HTML view page as data (the bar, the notice, the frame).
    async function viewPage() {
        const d = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const h = document.querySelector('header.header_viewable_file');
            const parts = h ? [...h.children].map((e) => ({tag: e.tagName, cls: e.className, text: f(e.innerText), sr: f(e.querySelector('.pkp_screen_reader')?.textContent),
                href: e.getAttribute('href'), download: e.hasAttribute('download'), x: Math.round(e.getBoundingClientRect().left)})) : null;
            const n = document.querySelector('.viewable_file_frame_notice');
            const fr = [...document.querySelectorAll('iframe')].map((i) => ({src: i.getAttribute('src'), name: i.getAttribute('name'), title: i.getAttribute('title'),
                box: [Math.round(i.getBoundingClientRect().top), Math.round(i.getBoundingClientRect().height)]}));
            return {url: location.href, title: document.title, parts, notice: n ? {text: f(n.innerText), top: Math.round(n.getBoundingClientRect().top), links: [...n.querySelectorAll('a')].map((a) => ({t: f(a.textContent), h: a.getAttribute('href')}))} : null,
                frames: fr, body: f(document.body.innerText).slice(0, 600), bodyHtmlLen: document.body.innerHTML.length};
        }).catch((e) => ({error: flat(e.message, 200)}));
        d.headerAria = await page.locator('header.header_viewable_file').ariaSnapshot().catch(() => null);
        d.linkNames = await page.locator('header.header_viewable_file a').evaluateAll((as) => as.map((a) => a.getAttribute('aria-label') || a.textContent.replace(/\s+/g, ' ').trim())).catch(() => null);
        // the frame's own content
        d.frameContent = [];
        for (const fr of page.frames()) {
            if (fr === page.mainFrame()) continue;
            const c = await fr.evaluate(() => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const app = window.PDFViewerApplication;
                const err = document.querySelector('#errorWrapper');
                return {url: location.href.replace(/^.*index\.php\/[^/]+/, '').slice(0, 200), text: f(document.body && document.body.innerText).slice(0, 500),
                    pdfPages: app && app.pdfDocument ? app.pdfDocument.numPages : null, pdfLoaded: app ? !!app.pdfDocument : null,
                    errorShown: err ? !err.hasAttribute('hidden') && getComputedStyle(err).display !== 'none' : null, errorText: err ? f(err.innerText) : null,
                    renderedPages: document.querySelectorAll('#viewer .page canvas').length,
                    imgs: [...document.querySelectorAll('img')].map((i) => ({src: (i.getAttribute('src') || '').replace(/^.*index\.php\/[^/]+/, '').slice(0, 160), w: i.naturalWidth}))};
            }).catch((e) => ({url: fr.url().slice(-120), error: flat(e.message, 160)}));
            d.frameContent.push(c);
        }
        return d;
    }
    // Press a link on the page and record where it lands (a new page, a download or nothing).
    async function press(locator, name, {waitMs = 2500} = {}) {
        const t0 = Date.now();
        const before = page.url();
        const dl = page.waitForEvent('download', {timeout: waitMs + 6000}).then(async (d) => ({file: d.suggestedFilename(), url: rel(d.url()), failure: await d.failure().catch((e) => String(e))})).catch(() => null);
        const pop = page.context().waitForEvent('page', {timeout: waitMs + 2000}).catch(() => null);
        const n = await locator.count();
        if (!n) return {present: false};
        const r = {present: true, count: n, text: flat(await locator.first().innerText().catch(() => null), 200), href: await locator.first().getAttribute('href').catch(() => null)};
        await locator.first().click({noWaitAfter: true}).catch((e) => { r.clickErr = flat(e.message, 160); });
        await page.waitForLoadState('domcontentloaded', {timeout: 15000}).catch(() => {});
        await sleep(waitMs);
        await settle();
        r.download = await dl;
        const p2 = await pop;
        if (p2) { await p2.waitForLoadState('domcontentloaded', {timeout: 8000}).catch(() => {}); r.newTab = p2.url(); await p2.close().catch(() => {}); }
        r.urlBefore = rel(before);
        r.landed = rel(page.url());
        r.docTitle = await page.title().catch(() => null);
        r.body = flat(await page.locator('body').innerText().catch(() => ''), 400);
        r.bodyHtmlLen = await page.evaluate(() => document.body ? document.body.innerHTML.length : -1).catch(() => null);
        r.responses = respsSince(t0);
        r.errors = errorsSince(t0);
        r.dialogs = dialogsSince(t0);
        await snap(name, {press: r});
        r._snap = N(name);
        return r;
    }
    async function direct(url, name) {
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 6000}).then((d) => ({file: d.suggestedFilename()})).catch(() => null);
        const resp = await page.goto(url).catch((e) => ({err: flat(e.message, 160)}));
        await settle();
        const r = {url: rel(url), status: resp && resp.status ? resp.status() : resp, landed: rel(page.url()), download: await dl, docTitle: await page.title().catch(() => null),
            body: flat(await page.locator('body').innerText().catch(() => ''), 300), responses: respsSince(t0), errors: errorsSince(t0)};
        await snap(name, {direct: r});
        return r;
    }
    // Fill the login form the redirect landed on (keeps its "source").
    async function loginHere(user) {
        const t0 = Date.now();
        await page.locator('input#username').fill(user);
        // the box's maxlength cuts a long scratch password (as LoginPage.fillPassword)
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(users.getPassword(user));
        await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForURL((u) => !/\/login(\/signIn)?(\?|$)/.test(u.pathname + u.search), {timeout: 20000}).catch(() => {});
        await settle();
        who = `${user}@?`;
        return {landed: rel(page.url()), responses: respsSince(t0), errors: errorsSince(t0)};
    }
    // The manual payment page as data.
    const PAY = () => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const main = document.querySelector('.page, main, .pkp_structure_main') || document.body;
        return {title: document.title, h1: f(main.querySelector('h1')?.textContent), text: f(main.innerText).slice(0, 1200),
            rows: [...main.querySelectorAll('tr, .row, dt, .label')].map((r) => f(r.innerText)).filter(Boolean).slice(0, 12),
            buttons: [...main.querySelectorAll('button, input[type=submit], a.pkp_button, .cmp_button, a')].map((b) => ({t: f(b.innerText || b.value), h: b.getAttribute('href'), tag: b.tagName})).filter((b) => b.t).slice(0, 20),
            forms: [...main.querySelectorAll('form')].map((fm) => ({action: (fm.getAttribute('action') || '').replace(/^.*index\.php\/[^/]+/, ''), method: fm.method}))};
    };

    // =============================================================== the workflow (as U69 K2 / K3)
    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    async function openWf(ctx, id, key) {
        await page.goto(wfUrl(ctx, id, key));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(600);
    }
    async function createVersion() {
        const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
        const w = new WorkflowPage(page, null);
        const item = await w.revealPublicationEntry('Create New Version');
        await w.expectVersionLoaded();
        await item.click();
        const dlg = page.getByRole('dialog', {name: 'Create New Version'});
        await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
        const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await created;
        const id = (await resp.json().catch(() => ({}))).id;
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return {status: resp.status(), id};
    }
    async function appendTitle(suffix) {
        const ifr = page.locator('iframe[id^="titleAbstract-title-control"]').first();
        await ifr.waitFor({timeout: T});
        const eid = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), eid, {timeout: T});
        await page.frameLocator(`#${eid}_ifr`).locator('body').click();
        await page.keyboard.press('End');
        await page.keyboard.type(suffix);
        await sleep(300);
        const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await page.locator('form').filter({has: ifr}).getByRole('button', {name: 'Save', exact: true}).first().click();
        const st = (await saved).status();
        await idle(page); await sleep(800);
        return st;
    }
    async function publishOnScreen() {
        const s = {};
        const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await btn.waitFor({state: 'visible', timeout: T});
        await sleep(600);
        await btn.click();
        const vs = page.locator('select[name="versionStage"]');
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
        const which = await Promise.race([
            vs.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
            confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
        ]).catch(() => null);
        if (which === 'stage') {
            const opts = await vs.locator('option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
            const pick = opts.find((o) => /Version of Record/.test(o.t));
            if (pick) await vs.selectOption(pick.v);
            await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        await idle(page);
        const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await done;
        s.status = r ? r.status() : null;
        await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return s;
    }
    // Publication Formats grid (as U69 K3)
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    const cat = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${label}`)})}).first();
    const formatRow = (label) => cat(label).locator('tr.gridRow').first();
    const fileRowByName = (label, fileName) => cat(label).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: fileName}).first();
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function formatsPage(k, s) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, `publication_${sub.pub}_publicationFormats`);
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
    }
    async function changeFile(label, file) {
        const t0 = Date.now();
        await formatRow(label).getByRole('link', {name: 'Change File', exact: true}).first().click();
        await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page);
        const g = wizard().locator('select[id^="genreId"]');
        if (await g.count() && await g.isVisible().catch(() => false)) {
            const opts = await g.locator('option').evaluateAll((els) => els.map((o) => ({v: o.value, t: o.textContent.trim()})).filter((o) => o.v));
            const bm = opts.find((o) => /Book Manuscript/.test(o.t)) || opts[0];
            await g.selectOption(bm.v);
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
    const termsForm = () => page.locator('form#approvedProofForm:visible').last();
    async function setOpenAccess(label, fileName) {
        const row = fileRowByName(label, fileName);
        const a = row.locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
        await a.waitFor({timeout: 15000});
        await a.click();
        await termsForm().waitFor({timeout: 20000});
        await termsForm().locator('input[type=radio][value="openAccess"]').click();
        await sleep(300);
        await top().getByRole('button', {name: 'Save', exact: true}).last().click();
        await sleep(1500); await idle(page);
        return {row: flat(await fileRowByName(label, fileName).innerText().catch(() => null), 200)};
    }
    // Settings › Website › Plugins (as U13 K5)
    const pluginRow = (id) => page.locator(`#pluginGridContainer tr.gridRow[id$="-row-${id}"]`);
    async function gotoPlugins(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/website'));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page); await sleep(400);
    }
    async function pluginRead(ids) {
        const o = {};
        for (const id of ids) {
            const row = pluginRow(id);
            o[id] = (await row.count()) ? {text: flat(await row.innerText(), 160), checked: await row.getByRole('checkbox').first().isChecked().catch(() => null)} : null;
        }
        return o;
    }
    async function setPlugin(id, want) {
        const box = pluginRow(id).getByRole('checkbox').first();
        const out = {before: await box.isChecked(), want};
        if (out.before === want) return out;
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /settings-plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click({noWaitAfter: true});
        await sleep(700);
        const dlg = page.locator(vis);
        if (await dlg.count()) {
            out.confirm = flat(await dlg.last().innerText().catch(() => null), 300);
            const ok = dlg.last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) await ok.click();
        }
        const resp = await w;
        out.status = resp ? resp.status() : null;
        await sleep(1200); await idle(page);
        out.after = await pluginRow(id).getByRole('checkbox').first().isChecked().catch(() => null);
        out.notices = noticesSince(t0);
        return out;
    }
    // Settings › Distribution › Payments (as U52 K1)
    const pane = () => page.locator('#payments').first();
    const readTab = () => pane().evaluate((root) => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const v = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const fields = [...root.querySelectorAll('input, select, textarea')].map((i) => {
            const lab = (i.id && root.querySelector(`label[for="${i.id}"]`)) || i.closest('label');
            const fs2 = i.closest('.pkpFormField, fieldset');
            const fl = fs2 && fs2.querySelector('.pkpFormFieldLabel, legend');
            return {name: i.name || null, type: i.type || null, visible: v(i), label: t(lab && lab.innerText).slice(0, 160), fieldLabel: t(fl && fl.innerText).slice(0, 120),
                value: i.type === 'checkbox' || i.type === 'radio' ? i.checked : (i.tagName === 'SELECT' ? (i.selectedOptions[0] ? `${t(i.selectedOptions[0].innerText)} [${i.value}]` : '') : i.value)};
        });
        return {fields: fields.filter((f) => f.visible || f.name === 'paymentsEnabled'), text: t(root.innerText).slice(0, 1500)};
    }).catch((e) => ({err: flat(e.message, 200)}));
    async function openPayTab(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page); await sleep(500);
        await page.locator('#payments-button').click(); await idle(page); await sleep(600);
    }
    async function savePayTab() {
        const rs = page.waitForResponse((r) => /\/_payments/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pane().getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await rs;
        const saved = await pane().locator('[role=status]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        return {status: resp ? resp.status() : null, savedShown: saved};
    }
    const mailFor = async (to, subject) => {
        const r = await app.mail._search({to, subject}).catch(() => ({messages: []}));
        return (r.messages || []).map((m) => ({id: m.ID, from: m.From && `${m.From.Name} <${m.From.Address}>`, to: (m.To || []).map((x) => x.Address), subject: m.Subject, snippet: flat(m.Snippet, 300)}));
    };

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- plugins: Settings 1–2 on a new press; Setting 9 on a new press's Payments tab
        if (isOMP && on('plugins')) {
            const o = {};
            await as(S.N.mg, S.N.path);
            o.plugins = await safe('plugins', async () => {
                await gotoPlugins(S.N.path);
                const r = await pluginRead(['pdfjsviewerplugin', 'htmlmonographfileplugin', 'citationstylelanguageplugin']);
                await snap('p-01-plugins-new-press', {plugins: r});
                await loc(page, 'Plugins: "PDF.js PDF Viewer" row', pluginRow('pdfjsviewerplugin'));
                await loc(page, 'Plugins: "HTML Monograph File" row', pluginRow('htmlmonographfileplugin'));
                return r;
            });
            o.payTab = await safe('paytab', async () => {
                await openPayTab(S.N.path);
                const r = {arrived: await readTab()};
                await snap('p-02-payments-tab-new-press', {tab: r.arrived});
                await loc(page, 'Payments tab: "Enable" box', pane().locator('input[name="paymentsEnabled"]'));
                // tick Enable (unsaved) to see what the tab holds behind it
                await pane().locator('input[name="paymentsEnabled"]').first().check();
                await sleep(500);
                r.enabledUnsaved = await readTab();
                await snap('p-03-payments-tab-enable-ticked-unsaved', {tab: r.enabledUnsaved});
                await loc(page, 'Payments tab: "Currency" list', pane().locator('select[name="currency"]'));
                await loc(page, 'Payments tab: "Payment Plugins" list', pane().locator('select[name="paymentPluginName"]'));
                // leave with the change unsaved: another tab of the page, then another page
                const t0 = Date.now();
                const tabs = await page.locator('[role="tablist"]').first().locator('[role="tab"]').allInnerTexts().catch(() => []);
                r.tabs = tabs.map((x) => x.trim());
                const other = page.locator('[role="tablist"]').first().locator('[role="tab"]').first();
                await other.click().catch(() => {}); await idle(page); await sleep(600);
                r.leaveTab = {dialogs: dialogsSince(t0), notices: noticesSince(t0), windows: await page.locator(vis).count()};
                await snap('p-04-payments-left-to-other-tab', {leave: r.leaveTab});
                await page.locator('#payments-button').click().catch(() => {}); await idle(page); await sleep(500);
                r.backOnTab = await readTab();
                const t1 = Date.now();
                answer = 'dismiss';
                const g = await page.goto(cUrl(S.N.path, '/management/settings/website')).then(() => 'navigated').catch((e) => flat(e.message, 120));
                await idle(page);
                r.leavePage = {goto: g, dialogs: dialogsSince(t1), landed: rel(page.url())};
                await openPayTab(S.N.path);
                r.reopened = await readTab();
                await snap('p-05-payments-reopened', {tab: r.reopened});
                return r;
            });
            fact('plugins', o);
        }

        // ---------------------------------------------------------------- free: td13, td21, td22 (a visitor on A's current version)
        if (isOMP && on('free')) {
            const A = S.A;
            const o = {};
            await visitor();
            o.book = await safe('free-book', () => bookPage(A.path, A.subs['1'].id, 'f-01-a1-visitor'));
            await loc(page, 'Book page: a file link ("PDF")', fileLink('A', '1', 'PDF'));
            // PDF (td22)
            o.pdf = await safe('free-pdf', async () => {
                const r = await press(fileLink('A', '1', 'PDF'), 'f-02-pdf-view', {waitMs: 5000});
                r.view = await viewPage();
                record(N('f-02-pdf-view'), {view: r.view}, {merge: true});
                await loc(page, 'PDF view page: the bar', page.locator('header.header_viewable_file'));
                await loc(page, 'PDF view page: return arrow', page.locator('header.header_viewable_file a.return'));
                await loc(page, 'PDF view page: "Download"', page.locator('header.header_viewable_file a.download'));
                await loc(page, 'PDF view page: file name', page.locator('header.header_viewable_file .title'));
                return r;
            });
            o.pdfDownload = await safe('free-pdf-download', () => press(page.locator('header.header_viewable_file a.download'), 'f-03-pdf-download-pressed', {waitMs: 3000}));
            o.pdfDownloadAddress = await safe('free-pdf-download-addr', async () => {
                const href = o.pdf && o.pdf.view && o.pdf.view.parts && (o.pdf.view.parts.find((p) => /download/.test(p.cls)) || {}).href;
                return href ? direct(href.startsWith('http') ? href : app.url(href), 'f-04-pdf-download-address') : {noHref: true};
            });
            o.pdfReturn = await safe('free-pdf-return', async () => {
                await bookPage(A.path, A.subs['1'].id, 'f-05-a1-again');
                await press(fileLink('A', '1', 'PDF'), 'f-06-pdf-view-again', {waitMs: 3000});
                return press(page.locator('header.header_viewable_file a.return'), 'f-07-pdf-return-pressed');
            });
            // HTML (td21)
            o.html = await safe('free-html', async () => {
                await bookPage(A.path, A.subs['1'].id, 'f-08-a1-again');
                const r = await press(fileLink('A', '1', 'HTML'), 'f-09-html-view', {waitMs: 4000});
                r.view = await viewPage();
                record(N('f-09-html-view'), {view: r.view}, {merge: true});
                await loc(page, 'HTML view page: return arrow', page.locator('header.header_viewable_file a.return'));
                await loc(page, 'HTML view page: title link', page.locator('header.header_viewable_file a.title'));
                await loc(page, 'HTML view page: the frame', page.locator('iframe[name="htmlFrame"]'));
                return r;
            });
            o.htmlTitle = await safe('free-html-title', () => press(page.locator('header.header_viewable_file a.title'), 'f-10-html-title-pressed'));
            o.htmlReturn = await safe('free-html-return', async () => {
                await bookPage(A.path, A.subs['1'].id, 'f-11-a1-again');
                await press(fileLink('A', '1', 'HTML'), 'f-12-html-view-again', {waitMs: 3000});
                return press(page.locator('header.header_viewable_file a.return'), 'f-13-html-return-pressed');
            });
            // any other file (notes.md)
            o.other = await safe('free-other', async () => {
                await bookPage(A.path, A.subs['1'].id, 'f-14-a1-again');
                return press(fileLink('A', '1', 'Other'), 'f-15-other-pressed', {waitMs: 3000});
            });
            // the chapter page's file link (the chapter holds the PDF)
            o.chapter = await safe('free-chapter', async () => {
                const ch = (A.subs['1'].chapters || [])[0];
                const r = await direct(cUrl(A.path, `/catalog/book/${A.subs['1'].id}/chapter/${ch ? ch.id : 1}`), 'f-16-chapter-page');
                const links = await page.locator('.item.files a, .files a').evaluateAll((as) => as.map((a) => ({t: a.textContent.replace(/\s+/g, ' ').trim(), h: a.getAttribute('href')}))).catch(() => []);
                r.links = links;
                if (links.length) r.pressed = await press(page.locator('.item.files a, .files a').first(), 'f-17-chapter-file-pressed', {waitMs: 4000});
                return r;
            });
            // a signed-in reader on the PDF view page (control: signing in changes nothing)
            o.readerPdf = await safe('free-reader-pdf', async () => {
                await as(A.rd, A.path);
                await bookPage(A.path, A.subs['1'].id, 'f-18-a1-reader');
                const r = await press(fileLink('A', '1', 'PDF'), 'f-19-pdf-view-reader', {waitMs: 5000});
                r.view = await viewPage();
                return r;
            });
            await visitor();
            fact('free', o);
        }

        // ---------------------------------------------------------------- viewer: the sweep of the PDF viewer's own controls (A's PDF)
        if (isOMP && on('viewer')) {
            const A = S.A;
            const o = {};
            await visitor();
            o.sweep = await safe('viewer', async () => {
                await bookPage(A.path, A.subs['1'].id, 'w-01-a1-visitor');
                await press(fileLink('A', '1', 'PDF'), 'w-02-pdf-view', {waitMs: 5000});
                const fr = page.frames().find((f) => /viewer\.html/.test(f.url()));
                if (!fr) return {noFrame: true};
                const r = {};
                await fr.locator('#errorShowMore').click().catch((e) => { r.moreErr = flat(e.message, 120); });
                await sleep(600);
                r.moreInfo = flat(await fr.locator('#errorMoreInfo').inputValue().catch(() => null), 600);
                r.errorBar = flat(await fr.locator('#errorWrapper').innerText().catch(() => null), 300);
                await snap('w-03-more-information', {sweep: r});
                const t0 = Date.now();
                const dl = page.waitForEvent('download', {timeout: 8000}).then(async (d) => ({file: d.suggestedFilename(), url: rel(d.url()), failure: await d.failure().catch((e) => String(e))})).catch(() => null);
                await fr.locator('#download').click({timeout: 5000}).catch((e) => { r.dlErr = flat(e.message, 120); });
                r.viewerDownload = await dl;
                await sleep(1500);
                r.afterViewerDownload = {url: rel(page.url()), errors: errorsSince(t0), responses: respsSince(t0)};
                await fr.locator('#errorClose').click().catch(() => {});
                await sleep(400);
                r.afterClose = {errorShown: await fr.locator('#errorWrapper').isVisible().catch(() => null), text: flat(await fr.locator('body').innerText().catch(() => null), 300)};
                await snap('w-04-after-viewer-download-close', {sweep: r});
                return r;
            });
            fact('viewer', o);
        }

        // ---------------------------------------------------------------- ver: an older version's view pages (Rule 13 notice, td21's date, return arrows)
        if (isOMP && on('ver')) {
            const A = S.A;
            const o = {};
            if (!A.v2) {
                o.make = await safe('ver-make', async () => {
                    await as(A.mg, A.path);
                    await openWf(A.path, A.subs['1'].id);
                    const v = await createVersion();
                    await openWf(A.path, A.subs['1'].id, `publication_${v.id}_titleAbstract`);
                    const t = await appendTitle(' Revised');
                    const p = await publishOnScreen();
                    A.v2 = v.id; save();
                    return {version: v, title: t, publish: p};
                });
            }
            await visitor();
            o.current = await safe('ver-current', () => bookPage(A.path, A.subs['1'].id, 'v-01-a1-current'));
            o.older = await safe('ver-older', () => bookPage(A.path, A.subs['1'].id, 'v-02-a1-older', `/version/${A.subs['1'].pub}`));
            const olderLink = (name) => page.locator('.obj_monograph_full a[href*="catalog/view"]').filter({hasText: new RegExp(`^\\s*${name}\\s*$`)});
            o.olderPdf = await safe('ver-older-pdf', async () => {
                const r = await press(olderLink('PDF'), 'v-03-older-pdf-view', {waitMs: 4000});
                r.view = await viewPage();
                record(N('v-03-older-pdf-view'), {view: r.view}, {merge: true});
                await loc(page, 'PDF view page: outdated-version notice', page.locator('.viewable_file_frame_notice'));
                return r;
            });
            o.olderPdfNoticeLink = await safe('ver-older-pdf-notice', () => press(page.locator('.viewable_file_frame_notice a'), 'v-04-older-pdf-notice-link'));
            o.olderPdfReturn = await safe('ver-older-pdf-return', async () => {
                await bookPage(A.path, A.subs['1'].id, 'v-05-a1-older-again', `/version/${A.subs['1'].pub}`);
                await press(olderLink('PDF'), 'v-06-older-pdf-view-again', {waitMs: 3000});
                return press(page.locator('header.header_viewable_file a.return'), 'v-07-older-pdf-return');
            });
            o.olderHtml = await safe('ver-older-html', async () => {
                await bookPage(A.path, A.subs['1'].id, 'v-08-a1-older-again', `/version/${A.subs['1'].pub}`);
                const r = await press(olderLink('HTML'), 'v-09-older-html-view', {waitMs: 4000});
                r.view = await viewPage();
                record(N('v-09-older-html-view'), {view: r.view}, {merge: true});
                return r;
            });
            o.olderHtmlTitle = await safe('ver-older-html-title', () => press(page.locator('header.header_viewable_file a.title'), 'v-10-older-html-title'));
            o.olderHtmlNotice = await safe('ver-older-html-notice', async () => {
                await bookPage(A.path, A.subs['1'].id, 'v-11-a1-older-again', `/version/${A.subs['1'].pub}`);
                await press(olderLink('HTML'), 'v-12-older-html-view-again', {waitMs: 3000});
                return press(page.locator('.viewable_file_frame_notice a'), 'v-13-older-html-notice-link');
            });
            o.olderOther = await safe('ver-older-other', async () => {
                await bookPage(A.path, A.subs['1'].id, 'v-14-a1-older-again', `/version/${A.subs['1'].pub}`);
                return press(olderLink('Other'), 'v-15-older-other', {waitMs: 3000});
            });
            fact('ver', o);
        }

        // ---------------------------------------------------------------- off: Settings 1–2 other end (B), switched off on screen by the Press manager
        if (isOMP && on('off')) {
            const B = S.B;
            const o = {};
            o.switch = await safe('off-switch', async () => {
                await as(B.mg, B.path);
                await gotoPlugins(B.path);
                const r = {before: await pluginRead(['pdfjsviewerplugin', 'htmlmonographfileplugin'])};
                r.pdf = await setPlugin('pdfjsviewerplugin', false);
                r.html = await setPlugin('htmlmonographfileplugin', false);
                await gotoPlugins(B.path);
                r.reloaded = await pluginRead(['pdfjsviewerplugin', 'htmlmonographfileplugin']);
                await snap('o-01-plugins-off', {plugins: r});
                return r;
            });
            await visitor();
            o.book = await safe('off-book', () => bookPage(B.path, B.subs['1'].id, 'o-02-b1-visitor'));
            o.pdf = await safe('off-pdf', () => press(fileLink('B', '1', 'PDF'), 'o-03-pdf-pressed', {waitMs: 3000}));
            o.html = await safe('off-html', async () => { await bookPage(B.path, B.subs['1'].id, 'o-04-b1-again'); return press(fileLink('B', '1', 'HTML'), 'o-05-html-pressed', {waitMs: 3000}); });
            fact('off', o);
        }

        // ---------------------------------------------------------------- restrict: td13's last part (Setting 6)
        if (isOMP && on('restrict')) {
            const R = S.R;
            const o = {};
            await visitor();
            o.book = await safe('r-book', () => bookPage(R.path, R.subs['1'].id, 'r-01-r1-visitor'));
            o.pdf = await safe('r-pdf', () => press(fileLink('R', '1', 'PDF'), 'r-02-pdf-pressed-visitor', {waitMs: 2000}));
            o.login = await safe('r-login', async () => { const r = await loginHere(R.rd); await snap('r-03-after-signin-reader', {login: r}); r.view = await viewPage(); return r; });
            await visitor();
            fact('restrict', o);
        }

        // ---------------------------------------------------------------- buy: td14, td25, A7, A8 (Q)
        if (isOMP && on('buy')) {
            const Q = S.Q;
            const o = {};
            if (!Q.two) {
                o.two = await safe('buy-two', async () => {
                    await as(Q.mg, Q.path);
                    await formatsPage('Q', '1');
                    const u = await changeFile('Two', fx('omp', 'replacement.pdf'));
                    await formatsPage('Q', '1');
                    const t = await setOpenAccess('Two', 'replacement.pdf');
                    await formatsPage('Q', '1');
                    const rows = await cat('Two').locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 160))).catch(() => []);
                    await snap('b-00-two-grid', {rows});
                    Q.two = true; save();
                    return {upload: u, terms: t, rows};
                });
            }
            await visitor();
            o.book = await safe('buy-book', () => bookPage(Q.path, Q.subs['1'].id, 'b-01-q1-visitor'));
            await loc(page, 'Book page: a priced file link ("25.00 Purchase PDF (25.00 USD)")', fileLink('Q', '1', 'PDF'));
            o.linkAria = await page.locator('.entry_details .item.files').ariaSnapshot().catch(() => null);
            // visitor presses the priced PDF: Login, then sign in as the Reader there
            o.visitorPress = await safe('buy-visitor', () => press(fileLink('Q', '1', 'PDF'), 'b-02-priced-pressed-visitor', {waitMs: 1500}));
            o.readerSignIn = await safe('buy-signin', async () => {
                const r = await loginHere(Q.rd);
                r.page = await page.evaluate(PAY).catch(() => null);
                await snap('b-03-after-signin-reader', {login: r});
                return r;
            });
            // the payment page read afresh (the reader presses the link from the book page)
            o.payPage = await safe('buy-paypage', async () => {
                await as(Q.rd, Q.path);
                await bookPage(Q.path, Q.subs['1'].id, 'b-04-q1-reader');
                const r = await press(fileLink('Q', '1', 'PDF'), 'b-05-payment-page', {waitMs: 1500});
                r.page = await page.evaluate(PAY).catch(() => null);
                record(N('b-05-payment-page'), {pay: r.page}, {merge: true});
                await loc(page, 'Payment page: "Send notification of payment"', page.getByRole('button', {name: /Send notification of payment/}).or(page.getByRole('link', {name: /Send notification of payment/})));
                return r;
            });
            const sendBtn = () => page.getByRole('button', {name: /Send notification of payment/}).or(page.getByRole('link', {name: /Send notification of payment/})).first();
            o.mailBefore = await mailFor(Q.ct, 'Manual Payment Notification');
            o.send1 = await safe('buy-send1', async () => {
                const r = await press(sendBtn(), 'b-06-after-send', {waitMs: 1500});
                r.page = await page.evaluate(PAY).catch(() => null);
                await loc(page, 'Payment Notification page: "Continue"', page.getByRole('link', {name: 'Continue', exact: true}).or(page.getByRole('button', {name: 'Continue', exact: true})));
                return r;
            });
            await sleep(2500);
            o.mailAfter1 = await mailFor(Q.ct, 'Manual Payment Notification');
            if (o.mailAfter1[0]) {
                const full = await app.mail.fullMessage(o.mailAfter1[0].id).catch(() => null);
                o.mailFull = full ? {from: full.From, to: full.To, cc: full.Cc, replyTo: full.ReplyTo, subject: full.Subject, text: flat(full.Text, 1200), html: flat(String(full.HTML || '').replace(/<[^>]+>/g, ' '), 1200)} : null;
            }
            o.continue = await safe('buy-continue', async () => {
                const r = await press(page.getByRole('link', {name: 'Continue', exact: true}).or(page.getByRole('button', {name: 'Continue', exact: true})).first(), 'b-07-after-continue', {waitMs: 1500});
                r.page = await page.evaluate(PAY).catch(() => null);
                return r;
            });
            o.send2 = await safe('buy-send2', async () => press(sendBtn(), 'b-08-after-send-again', {waitMs: 1500}));
            await sleep(2500);
            o.mailAfter2 = await mailFor(Q.ct, 'Manual Payment Notification');
            // A8: the format "Two" with two files
            o.twoLinks = await safe('buy-two-links', async () => {
                const b = await bookPage(Q.path, Q.subs['1'].id, 'b-09-q1-reader-again');
                const two = (b.formats || []).find((f) => /Two|pub_format_/.test(f.text) && f.links.length > 1);
                const priced = page.locator(`.entry_details .item.files a[href*="/${fmtOf('Q', '1', 'Two').id}/${fmtOf('Q', '1', 'Two').submissionFileId}"]`);
                const r = {formats: b.formats, two};
                r.pressedPriced = await press(priced, 'b-10-two-priced-pressed-reader', {waitMs: 1500});
                r.pressedPriced.page = await page.evaluate(PAY).catch(() => null);
                return r;
            });
            o.twoVisitor = await safe('buy-two-visitor', async () => {
                await visitor();
                await bookPage(Q.path, Q.subs['1'].id, 'b-11-q1-visitor-again');
                const priced = page.locator(`.entry_details .item.files a[href*="/${fmtOf('Q', '1', 'Two').id}/${fmtOf('Q', '1', 'Two').submissionFileId}"]`);
                return press(priced, 'b-12-two-priced-pressed-visitor', {waitMs: 1500});
            });
            // the Free format on the payments press opens as any free file (control)
            o.free = await safe('buy-free', async () => {
                await bookPage(Q.path, Q.subs['1'].id, 'b-13-q1-visitor-free');
                return press(fileLink('Q', '1', 'Free'), 'b-14-free-pressed', {waitMs: 3000});
            });
            // A11 on screen: the manager's side menu and the "Payments" page by its address
            o.mgr = await safe('buy-mgr', async () => {
                await as(Q.mg, Q.path);
                await page.goto(cUrl(Q.path, '/submissions')); await settle();
                const nav = await page.locator('nav').first().innerText().then((x) => flat(x, 800)).catch(() => null);
                await snap('b-15-manager-dashboard', {nav});
                const r = {nav, payments: await direct(cUrl(Q.path, '/payments'), 'b-16-manager-payments-address')};
                r.mgmtPayments = await direct(cUrl(Q.path, '/management/settings/payments'), 'b-17-manager-management-payments');
                await openPayTab(Q.path);
                r.tab = await readTab();
                await snap('b-18-manager-payments-tab', {tab: r.tab});
                return r;
            });
            await visitor();
            fact('buy', o);
        }

        // ---------------------------------------------------------------- levels: Rule 14 "a signed-in user", one account per permission level
        if (isOMP && on('levels')) {
            const Q = S.Q;
            const o = {};
            for (const [lvl, u] of [['manager', Q.mg], ['seriesEditor', Q.se], ['copyeditor', Q.ce], ['reviewer', Q.rv], ['author', Q.au], ['admin', 'admin']]) {
                o[lvl] = await safe(`lvl-${lvl}`, async () => {
                    await as(u, Q.path);
                    await bookPage(Q.path, Q.subs['1'].id, `l-${lvl}-book`);
                    const linkText = flat(await fileLink('Q', '1', 'PDF').first().innerText().catch(() => null), 120);
                    const r = await press(fileLink('Q', '1', 'PDF'), `l-${lvl}-pressed`, {waitMs: 1500});
                    return {linkText, landed: r.landed, h1: (await page.evaluate(PAY).catch(() => ({}))).h1, text: flat(r.body, 250), responses: r.responses, errors: r.errors};
                });
            }
            await visitor();
            fact('levels', o);
        }

        // ---------------------------------------------------------------- stop: Rule 14a (N no currency, M no instructions, P PayPal without Account Name); Setting 9
        if (isOMP && on('stop')) {
            const o = {};
            for (const k of ['N', 'M', 'P']) {
                o[k] = await safe(`stop-${k}`, async () => {
                    const K = S[k];
                    await visitor();
                    const v = await bookPage(K.path, K.subs['1'].id, `s-${k}-visitor`);
                    const r = {visitorLinks: (v.formats || []).map((f) => f.links.map((l) => l.text))};
                    await as(K.rd, K.path);
                    await bookPage(K.path, K.subs['1'].id, `s-${k}-reader`);
                    r.pressed = await press(fileLink(k, '1', 'PDF'), `s-${k}-reader-pressed`, {waitMs: 1500});
                    r.noticesOnLanding = r.pressed.body && /payment|not|error|configured/i.test(r.pressed.body) ? 'see body' : 'none matched';
                    return r;
                });
            }
            await visitor();
            fact('stop', o);
        }

        // ---------------------------------------------------------------- paypal: Rule 14 PayPal branch, Account Name typed on screen
        if (isOMP && on('paypal')) {
            const P = S.P;
            const o = {};
            o.set = await safe('pp-set', async () => {
                await as(P.mg, P.path);
                await openPayTab(P.path);
                const r = {before: await readTab()};
                const acct = pane().locator('input[name="accountName"]').first();
                await acct.fill('k4-seller@example.org');
                r.save = await savePayTab();
                await openPayTab(P.path);
                r.reloaded = await readTab();
                await snap('pp-01-payments-tab-paypal', {tab: r.reloaded});
                return r;
            });
            o.buy = await safe('pp-buy', async () => {
                await as(P.rd, P.path);
                await bookPage(P.path, P.subs['1'].id, 'pp-02-p1-reader');
                const external = [];
                await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => { external.push(route.request().url().slice(0, 160)); return route.abort(); });
                const r = await press(fileLink('P', '1', 'PDF'), 'pp-03-paypal-pressed', {waitMs: 8000});
                await page.unroute(/^https?:\/\/(?!127\.0\.0\.1|localhost)/).catch(() => {});
                r.external = external;
                return r;
            });
            await visitor();
            fact('paypal', o);
        }

        // ---------------------------------------------------------------- enable: td15 (Rule 14b, Setting 10, A12) on E
        if (isOMP && on('enable')) {
            const E = S.E;
            const o = {};
            o.readerBefore = await safe('en-before', async () => {
                await as(E.rd, E.path);
                const b = await bookPage(E.path, E.subs['1'].id, 'e-01-e1-reader-before');
                return {links: (b.formats || []).map((f) => f.links.map((l) => l.text))};
            });
            o.untick = await safe('en-untick', async () => {
                await as(E.mg, E.path);
                await openPayTab(E.path);
                const r = {before: await readTab()};
                await pane().locator('input[name="paymentsEnabled"]').first().uncheck();
                await sleep(500);
                r.afterUntick = await readTab();
                await snap('e-02-enable-unticked-unsaved', {tab: r.afterUntick});
                r.save = await savePayTab();
                r.atOnce = await readTab();
                await openPayTab(E.path);
                r.reloaded = await readTab();
                await snap('e-03-payments-tab-reloaded', {tab: r.reloaded});
                const nav = await page.locator('nav').first().innerText().then((x) => flat(x, 600)).catch(() => null);
                r.nav = nav;
                return r;
            });
            o.readerAfter = await safe('en-after', async () => {
                await as(E.rd, E.path);
                const b = await bookPage(E.path, E.subs['1'].id, 'e-04-e1-reader-after');
                const r = {links: (b.formats || []).map((f) => f.links.map((l) => l.text))};
                r.pressed = await press(fileLink('E', '1', 'PDF'), 'e-05-priced-pressed-after', {waitMs: 1500});
                r.page = await page.evaluate(PAY).catch(() => null);
                return r;
            });
            o.visitorAfter = await safe('en-visitor', async () => {
                await visitor();
                const b = await bookPage(E.path, E.subs['1'].id, 'e-06-e1-visitor-after');
                return {links: (b.formats || []).map((f) => f.links.map((l) => l.text))};
            });
            fact('enable', o);
        }

        // ---------------------------------------------------------------- quiet: "No other email, no notice" (473–475), bounded by the buy phase's notification
        if (isOMP && on('quiet')) {
            const A = S.A;
            const Q = S.Q;
            const o = {};
            const addrs = (K) => [K.ct, `${K.rd}@mail.test`, `${K.mg}@mail.test`, `${K.au}@mail.test`, 'admin@mail.test'];
            const counts = async (K) => Object.fromEntries(await Promise.all(addrs(K).map(async (a) => [a, (await mailFor(a)).length])));
            o.before = {A: await counts(A), Q: await counts(Q)};
            o.drive = await safe('quiet-drive', async () => {
                await as(A.rd, A.path);
                const b = await bookPage(A.path, A.subs['1'].id, 'q-01-a1-reader');
                const r = {cite: b.cite};
                await press(fileLink('A', '1', 'PDF'), 'q-02-pdf', {waitMs: 2500});
                await bookPage(A.path, A.subs['1'].id, 'q-03-a1-reader');
                await press(fileLink('A', '1', 'HTML'), 'q-04-html', {waitMs: 2500});
                await bookPage(A.path, A.subs['1'].id, 'q-05-a1-reader');
                // the download links sit in the collapsed "More Citation Formats" list
                await page.getByRole('button', {name: /More Citation Formats/}).first().click().catch(() => {});
                await sleep(500);
                const dl = page.locator('a[href*="citationstylelanguage/download/ris"]').first();
                r.citeDownload = await press(dl, 'q-06-cite-download', {waitMs: 2000});
                await as(Q.rd, Q.path);
                await bookPage(Q.path, Q.subs['1'].id, 'q-07-q1-reader');
                await press(fileLink('Q', '1', 'PDF'), 'q-08-payment-page', {waitMs: 1500});
                r.headerNotify = await page.locator('header').innerText().then((x) => flat(x, 400)).catch(() => null);
                return r;
            });
            // the positive control: a notification sent now bounds the silence
            o.control = await safe('quiet-control', async () => {
                const btn = page.getByRole('button', {name: /Send notification of payment/}).or(page.getByRole('link', {name: /Send notification of payment/})).first();
                return press(btn, 'q-09-control-send', {waitMs: 1500});
            });
            await sleep(3000);
            o.after = {A: await counts(A), Q: await counts(Q)};
            o.newQct = await mailFor(Q.ct);
            await visitor();
            fact('quiet', o);
        }

        // ---------------------------------------------------------------- emails: the notification's row in "Manage Emails" (471–472), as Q's manager
        if (isOMP && on('emails')) {
            const Q = S.Q;
            const o = {};
            o.list = await safe('emails', async () => {
                await as(Q.mg, Q.path);
                await page.goto(cUrl(Q.path, '/management/settings/manageEmails')); await settle();
                await page.locator('main').getByRole('button').first().waitFor({timeout: 20000}).catch(() => {});
                await settle();
                const text = flat(await page.locator('main').innerText().catch(() => ''), 6000);
                const r = {manual: /Manual Payment/i.test(text), payment: (text.match(/[^.]{0,40}Payment[^.]{0,40}/g) || []).slice(0, 10), rows: (text.match(/Edit [^\n]{0,60}/g) || []).length};
                const box = page.locator('main input[type="search"], main input[placeholder*="Search"], main input[aria-label*="Search"]').first();
                r.all = flat(text, 4000);
                if (await box.count()) { await box.fill('Payment'); await box.press('Enter'); await settle(); await sleep(800); r.searched = flat(await page.locator('main').innerText().catch(() => ''), 1500); }
                await snap('m-01-manage-emails-payment', {emails: r});
                return r;
            });
            await visitor();
            fact('emails', o);
        }

        // ---------------------------------------------------------------- usage: Side effects' usage statistics (458–462), read from the day's usage log
        if (on('usage')) {
            const o = {};
            await visitor();
            if (isOMP) {
                const A = S.A;
                const step = async (label, fn) => {
                    const before = readLog(app).lines.length;
                    const r = await safe(`usage-${label}`, fn);
                    await sleep(1000);
                    const after = readLog(app);
                    return {file: after.file, err: after.err, lines: after.lines.slice(before).map(slimLog), result: r && r.error ? r.error : undefined};
                };
                o.book = await step('book', () => bookPage(A.path, A.subs['1'].id, 'u-01-book'));
                const ch = (A.subs['1'].chapters || [])[0];
                o.chapter = await step('chapter', () => direct(cUrl(A.path, `/catalog/book/${A.subs['1'].id}/chapter/${ch ? ch.id : 1}`), 'u-02-chapter'));
                o.pdfView = await step('pdf', async () => { await bookPage(A.path, A.subs['1'].id, 'u-03-book'); return press(fileLink('A', '1', 'PDF'), 'u-04-pdf-view', {waitMs: 4000}); });
                o.html = await step('html', async () => { await bookPage(A.path, A.subs['1'].id, 'u-05-book'); return press(fileLink('A', '1', 'HTML'), 'u-06-html-view', {waitMs: 3000}); });
                o.other = await step('other', async () => { await bookPage(A.path, A.subs['1'].id, 'u-07-book'); return press(fileLink('A', '1', 'Other'), 'u-08-other', {waitMs: 3000}); });
            } else {
                const C = S.C;
                const step = async (label, fn) => {
                    const before = readLog(app).lines.length;
                    const r = await safe(`usage-${label}`, fn);
                    await sleep(1000);
                    const after = readLog(app);
                    return {file: after.file, err: after.err, lines: after.lines.slice(before).map(slimLog), result: r && r.error ? r.error : r};
                };
                const seg = app.name === 'ojs' ? 'article' : 'preprint';
                o.item = await step('item', () => direct(cUrl(C.path, `/${seg}/view/${C.subs['1'].id}`), 'u-01-item'));
                o.galley = await step('galley', async () => {
                    const a = page.locator('a.obj_galley_link.pdf, a.obj_galley_link').first();
                    const r = await press(a, 'u-02-galley-view', {waitMs: 5000});
                    r.view = await viewPage();
                    return r;
                });
                o.download = await step('download', async () => press(page.locator('header a.download'), 'u-03-galley-download-pressed', {waitMs: 3000}));
                if (app.name === 'ojs') {
                    o.html = await step('html', async () => {
                        await direct(cUrl(C.path, `/${seg}/view/${C.subs['1'].id}`), 'u-04-item');
                        const r = await press(page.locator('a.obj_galley_link.file, a.obj_galley_link').filter({hasText: 'HTML'}).first(), 'u-05-html-galley', {waitMs: 4000});
                        r.view = await viewPage();
                        return r;
                    });
                }
            }
            fact('usage', o);
        }

        // ---------------------------------------------------------------- control (OJS, OPS): A11's "Payments" page by address; OMP's own read is in buy
        if (!isOMP && on('control')) {
            const C = S.C;
            const o = {};
            o.payments = await safe('ctl-pay', async () => {
                await as(C.mg, C.path);
                return direct(cUrl(C.path, '/payments'), 'c-01-manager-payments-address');
            });
            o.distribution = await safe('ctl-dist', async () => {
                await page.goto(cUrl(C.path, '/management/settings/distribution')); await settle();
                const tabs = await page.locator('[role="tablist"]').first().locator('[role="tab"]').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
                await snap('c-02-distribution-tabs', {tabs});
                return tabs;
            });
            await visitor();
            fact('control', o);
        }
    } finally {
        await close();
    }
});
