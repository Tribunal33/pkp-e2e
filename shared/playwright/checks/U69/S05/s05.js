// U69 claim check S05 (upstream sync 2026-10-05): OMP book file downloads after omp 8c807c919
// (pkp/pkp-lib#13444: CatalogBookHandler::download() builds its UsageEvent with the local
// $publication). What a visitor, a Reader and the Press manager get, pressing each kind of book
// file from the book's page, and what the day's usage log takes for each.
//
// Spec: docs/specs/U69-monograph-landing-page.md, Purpose; Actors "Open a free file"; Fields "The PDF
// view page", "The HTML view page"; Rule 13 (13b); Side effects (usage); Settings 1-2; Cross-feature
// U47/U20/U64 rows; Canonical "PDF"; register A9, A23, A25; notes f, j, q, r, td13, td22.
//
// OMP only (the kept K4 script's usage and control phases hold the OJS/OPS galley controls).
// Phases (PHASES=a,b picks; default all):
//   seed   scratch press A (USD, "Manual Fee Payment" with instructions; plugins as a new press has
//          them): book a1 published with formats PDF (article.pdf, Book Manuscript), HTML (article.html
//          + figure.png), Other (notes.md, Book Manuscript), Supp (notes.md, "Appendix", supplementary),
//          SuppPdf (replacement.pdf, "Appendix"), EPUB (no file; an .epub uploaded on screen by the
//          Press manager and set "Open Access"), Sale (article.pdf, Direct Sales 25); book a2 with
//          URL Path "s05shore<run>" and a PDF. Press B: book b1 with PDF and HTML; the Press manager
//          unticks "PDF.js PDF Viewer" and "HTML Monograph File" on screen.
//   files  per role (visitor, Reader, Press manager): every a1 file pressed from the book's page; on
//          the PDF view page the viewer's state, the bar's "Download" and the viewer's own download
//   off    per role: B's PDF and HTML pressed (plugins off)
//   paid   a1's "Sale" file: the Reader's purchase completed (a completed_payments row, as PayPal's
//          return writes it; no screen on a test install completes one), then pressed by the Reader;
//          the Press manager (not paid) as the control
//   ver    the Press manager makes a second version on screen and publishes it; per role the older
//          version's PDF, HTML and Other pressed from its page
//   meta   the book page's search-engine tags that name a file address, each opened as a visitor
//   urlp   a2 (URL Path): the link's address and the file opened from it
//   usage  the day's usage log kept to this run's presses: per file address, its event type and count
//          (the log is the fleet's; other agents write to it at once, so a slice by line count is not the run's)
//   a25    A25: book a3 with an HTML format whose file (uploaded on screen by the Press manager) holds
//          an "omp://monograph/{a2}" link and an "omp://press" link; per role the file opened, then
//          each link pressed inside the frame
// Run (twice; OMP outlasts 600 s, so detached):
//   PROBE_RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccS05 node bin/probe.js omp shared/playwright/checks/U69/S05/s05.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, serverLog, sql} = require('../../../probe');

const PHASES = (process.env.PHASES || 'seed,files,off,paid,ver,meta,urlp,a25,usage').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const fx = (f) => path.join(REPO, `apps/omp/playwright/fixtures/files/${f}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');
const vis = '[role="dialog"]:visible';

function fact(key, value) {
    record('s05-facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 2500)}`);
}

// ---------------------------------------------------------------- the usage log (as U69 K4 / U64 K1)
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
const slimLog = (l) => ({assocType: l.assocType, contextId: l.contextId, submissionId: l.submissionId, representationId: l.representationId,
    submissionFileId: l.submissionFileId, fileType: l.fileType, url: rel(l.canonicalUrl)});

// A minimal EPUB (a zip whose first entry is the uncompressed "mimetype"), written with python3's zipfile.
function makeEpub(file) {
    const py = `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1], 'w')
z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>', compress_type=zipfile.ZIP_DEFLATED)
z.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">s05</dc:identifier><dc:title>S05</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c" href="c.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>', compress_type=zipfile.ZIP_DEFLATED)
z.writestr('OEBPS/c.xhtml', '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>S05</title></head><body><p>S05 epub.</p></body></html>', compress_type=zipfile.ZIP_DEFLATED)
z.close()
`;
    execFileSync('python3', ['-c', py, file]);
    return fs.statSync(file).size;
}

forEachApp(async (app) => {
    if (app.name !== 'omp') { console.log(`[s05] ${app.name}: OMP only (K4 usage/control hold the galley controls)`); return; }
    const statePath = outFile('s05-state.json');
    const S = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const cUrl = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const slog = serverLog(app);
    const ours = (l) => ['a', 'b'].some((k) => S[k] && String(l.canonicalUrl || '').includes(`/index.php/${S[k].path}/`));

    // ------------------------------------------------------------ seed (API part)
    if (on('seed') && !S.seeded) {
        const t = tag('u69s05');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${p}rd`, roles: ['reader'], givenName: 'Rae', familyName: 'Reader'},
        ];
        const f = (name, file, extra = {}) => ({name, file, genre: 'Book Manuscript', ...extra});
        const mk = async (k, spec = {}) => {
            const p = `${t}${k}`;
            const c = await app.api.createContext({tag: p, context: {name: {en: `S05 ${k} ${t}`}, contactName: 'Pat Contact', contactEmail: `${p}ct@mail.test`}, users: people(p), ...spec});
            S[k] = {path: c.path || p, mg: `${p}mg`, au: `${p}au`, rd: `${p}rd`, subs: {}};
        };
        const book = async (k, s, extra) => {
            const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `S05 ${k}${s} book`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: (r.publicationFormats || []).map((x) => ({name: x.name, id: x.id, submissionFileId: x.submissionFileId}))};
        };
        await mk('a', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay S05 by cheque.'}});
        await book('a', '1', {published: true, mediaFiles: [{file: 'figure.png'}], publicationFormats: [
            f('PDF', 'article.pdf'), f('HTML', 'article.html'), f('Other', 'notes.md'),
            {name: 'Supp', file: 'notes.md'}, {name: 'SuppPdf', file: 'replacement.pdf'}, {name: 'EPUB'},
            f('Sale', 'article.pdf', {price: '25'})]});
        await book('a', '2', {published: true, urlPath: `s05shore${RUN.replace(/[^a-z0-9]/gi, '')}`, publicationFormats: [f('PDF', 'article.pdf')]});
        await mk('b');
        await book('b', '1', {published: true, mediaFiles: [{file: 'figure.png'}], publicationFormats: [f('PDF', 'article.pdf'), f('HTML', 'article.html')]});
        S.seeded = true;
        save();
        note(`ccS05 [omp] ${RUN}: presses a ${S.a.path} (books ${JSON.stringify(S.a.subs)}), b ${S.b.path} (${JSON.stringify(S.b.subs)})`);
    }
    if (!S.seeded) { console.log('[s05] no state: run the seed phase'); return; }

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    const jsDialogs = [];
    page.on('dialog', async (d) => { jsDialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    // every catalog/view|download response with its headers (status, type, disposition, length)
    const resps = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/catalog\/(view|download|book)|pdf\.js\/web\/viewer|\/login/.test(u)) return;
        const h = r.headers();
        resps.push({at: Date.now(), status: r.status(), url: rel(u).slice(0, 220), frame: r.frame() === page.mainFrame() ? 'main' : 'sub',
            type: h['content-type'] || null, disposition: h['content-disposition'] || null, length: h['content-length'] || null});
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), msg: `pageerror: ${flat(e.message, 200)}`}));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push({at: Date.now(), msg: `console: ${flat(m.text(), 200)}`}); });
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => x);

    async function snap(name, extra) {
        const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 200)}));
        if (extra) Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    const safe = async (label, fn) => {
        try { return await fn(); } catch (e) {
            const err = flat(String(e.message || e).split('\n')[0], 300);
            console.log(`[s05 ${label}] ERROR ${err}`);
            await snap(`err-${label.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
            return {error: err};
        }
    };
    let who = null;
    const as = async (user, ctx) => {
        if (user === null) { if (who !== null) await signOut(page).catch(() => {}); who = null; return; }
        if (who === `${user}@${ctx}`) return;
        await signIn(page, user, {contextPath: ctx});
        await idle(page);
        who = `${user}@${ctx}`;
    };
    const ROLES = (k) => [['visitor', null], ['reader', S[k].rd], ['manager', S[k].mg]];
    const settle = async () => { await idle(page).catch(() => {}); await page.waitForFunction(() => document.readyState === 'complete', null, {timeout: 10000}).catch(() => {}); await sleep(500); };

    async function bookPage(k, s, name, suffix = '') {
        const t0 = Date.now();
        const resp = await page.goto(cUrl(S[k].path, `/catalog/book/${S[k].subs[s].id}${suffix}`)).catch((e) => ({err: flat(e.message, 160)}));
        await settle();
        await snap(name);
        const links = await page.locator('.obj_monograph_full a[href*="/catalog/view/"]').evaluateAll((as) => as.map((a) => ({t: a.textContent.replace(/\s+/g, ' ').trim(), h: a.getAttribute('href')}))).catch(() => []);
        return {status: resp && resp.status ? resp.status() : resp, links: links.map((l) => ({t: l.t, h: rel(l.h)})), responses: since(resps, t0)};
    }
    const fmtOf = (k, s, name) => (S[k].subs[s].formats || []).find((x) => x.name === name) || {};
    const linkByFmt = (fmtId, fileId) => page.locator(`.obj_monograph_full a[href*="/${fmtId}/${fileId}"]`).first();
    const linkByText = (text) => page.locator('.obj_monograph_full .item.files a, .obj_monograph_full .entry_details a').filter({hasText: new RegExp(`^\\s*${text}\\s*$`)}).first();

    // The view page as data: the bar, the notice, the frame and what it shows.
    async function viewPage() {
        const d = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const h = document.querySelector('header.header_viewable_file');
            return {title: document.title, bar: h ? [...h.querySelectorAll('a, span.title, .title')].map((e) => ({tag: e.tagName, cls: e.className, text: f(e.innerText), sr: f(e.querySelector('.pkp_screen_reader')?.textContent), href: e.getAttribute('href')})) : null,
                notice: f(document.querySelector('.viewable_file_frame_notice')?.innerText) || null,
                frames: [...document.querySelectorAll('iframe')].map((i) => ({src: (i.getAttribute('src') || '').replace(/^.*index\.php\/[^/]+/, ''), h: Math.round(i.getBoundingClientRect().height)})),
                body: f(document.body.innerText).slice(0, 300)};
        }).catch((e) => ({error: flat(e.message, 200)}));
        d.frameContent = [];
        for (const fr of page.frames()) {
            if (fr === page.mainFrame()) continue;
            if (/viewer\.html/.test(fr.url())) {
                await fr.waitForFunction(() => window.PDFViewerApplication && (window.PDFViewerApplication.pdfDocument || !document.querySelector('#errorWrapper')?.hidden), null, {timeout: 12000}).catch(() => {});
                await sleep(800);
            }
            const c = await fr.evaluate(() => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const a = window.PDFViewerApplication;
                const err = document.querySelector('#errorWrapper');
                return {url: location.href.replace(/^.*index\.php\/[^/]+/, '').slice(0, 220), text: f(document.body && document.body.innerText).slice(0, 400),
                    pdfPages: a && a.pdfDocument ? a.pdfDocument.numPages : null, numPagesLabel: f(document.querySelector('#numPages')?.textContent) || null,
                    errorShown: err ? !err.hidden && getComputedStyle(err).display !== 'none' : null, errorText: err && !err.hidden ? f(err.innerText) : null,
                    renderedPages: document.querySelectorAll('#viewer .page canvas').length,
                    links: [...document.querySelectorAll('a')].map((x) => ({t: f(x.textContent).slice(0, 60), h: (x.getAttribute('href') || '').slice(0, 160)})).slice(0, 10),
                    imgs: [...document.querySelectorAll('img')].map((i) => ({src: (i.getAttribute('src') || '').replace(/^.*index\.php\/[^/]+/, '').slice(0, 160), w: i.naturalWidth}))};
            }).catch((e) => ({url: rel(fr.url()).slice(-160), error: flat(e.message, 160)}));
            d.frameContent.push(c);
        }
        return d;
    }
    // Wait for a download and save it; the size proves a file arrived.
    const catchDownload = (ms, name) => page.waitForEvent('download', {timeout: ms}).then(async (d) => {
        const failure = await d.failure().catch((e) => String(e));
        let size = null;
        if (!failure) {
            const to = outFile(`dl-${name}-${d.suggestedFilename().replace(/[^A-Za-z0-9_.-]/g, '_')}`);
            await d.saveAs(to).catch(() => {});
            size = fs.existsSync(to) ? fs.statSync(to).size : null;
        }
        return {file: d.suggestedFilename(), url: rel(d.url()), failure, size};
    }).catch(() => null);
    // Press a link and record where it leads: a view page (with its frame), a download, or a page.
    async function press(locator, name, {waitMs = 3000} = {}) {
        const t0 = Date.now();
        const lines0 = readLog(app).lines.length;
        const m0 = slog.mark();
        const n = await locator.count();
        if (!n) return {present: false};
        const r = {present: true, text: flat(await locator.innerText().catch(() => null), 120), href: rel(await locator.getAttribute('href').catch(() => null))};
        const dl = catchDownload(waitMs + 8000, name);
        await locator.click({noWaitAfter: true}).catch((e) => { r.clickErr = flat(e.message, 160); });
        await page.waitForLoadState('domcontentloaded', {timeout: 15000}).catch(() => {});
        await sleep(waitMs);
        await settle();
        r.download = await dl;
        r.landed = rel(page.url());
        r.docTitle = await page.title().catch(() => null);
        r.isView = await page.locator('header.header_viewable_file').count() > 0;
        if (r.isView) r.view = await viewPage();
        r.body = flat(await page.locator('body').innerText().catch(() => ''), 300);
        await sleep(800);
        r.responses = since(resps, t0);
        r.errors = since(pageErrors, t0);
        r.serverLog = slog.since(m0).map((l) => flat(l, 400)).slice(0, 8);
        r.usage = readLog(app).lines.slice(lines0).filter(ours).map(slimLog);
        await snap(name, {press: r});
        r._snap = name;
        return r;
    }
    // On a PDF view page: the bar's "Download", then the viewer's own download.
    async function pdfDownloads(name) {
        const o = {};
        const t0 = Date.now();
        const lines0 = readLog(app).lines.length;
        const bar = page.locator('header.header_viewable_file a.download');
        o.barPresent = await bar.count();
        await loc(page, 'PDF view page: "Download"', bar);
        if (o.barPresent) {
            o.barName = await bar.evaluate((a) => a.innerText.replace(/\s+/g, ' ').trim() + ' | ' + (a.textContent || '').replace(/\s+/g, ' ').trim()).catch(() => null);
            const dl = catchDownload(12000, `${name}-bar`);
            await bar.click({noWaitAfter: true}).catch((e) => { o.barErr = flat(e.message, 160); });
            o.bar = await dl;
            await sleep(1500);
            o.afterBarUrl = rel(page.url());
        }
        const fr = page.frames().find((f) => /viewer\.html/.test(f.url()));
        if (fr) {
            const dl = catchDownload(12000, `${name}-viewer`);
            await fr.locator('#download, #secondaryDownload').first().click({timeout: 5000}).catch((e) => { o.viewerErr = flat(e.message, 160); });
            o.viewer = await dl;
            await sleep(1500);
        }
        o.responses = since(resps, t0);
        o.errors = since(pageErrors, t0);
        o.usage = readLog(app).lines.slice(lines0).filter(ours).map(slimLog);
        await snap(name, {downloads: o});
        return o;
    }
    // The viewer's own controls once the PDF shows (the sweep).
    async function viewerSweep(name) {
        const fr = page.frames().find((f) => /viewer\.html/.test(f.url()));
        if (!fr) return {noFrame: true};
        const read = () => fr.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const a = window.PDFViewerApplication;
            return {page: document.querySelector('#pageNumber')?.value, of: f(document.querySelector('#numPages')?.textContent), scale: f(document.querySelector('#scaleSelect')?.selectedOptions?.[0]?.textContent),
                currentScale: a && a.pdfViewer ? a.pdfViewer.currentScale : null, findbarOpen: !document.querySelector('#findbar')?.classList.contains('hidden'),
                buttons: [...document.querySelectorAll('#toolbarContainer button')].filter((b) => b.offsetParent !== null).map((b) => ({id: b.id, title: b.title, disabled: b.disabled}))};
        }).catch((e) => ({error: flat(e.message, 160)}));
        const o = {start: await read()};
        await fr.locator('#zoomIn').click({timeout: 4000}).catch((e) => { o.zoomErr = flat(e.message, 120); });
        await sleep(600);
        o.afterZoomIn = await read();
        await fr.locator('#viewFind').click({timeout: 4000}).catch((e) => { o.findErr = flat(e.message, 120); });
        await sleep(400);
        await fr.locator('#findInput').fill('the').catch(() => {});
        await fr.locator('#findInput').press('Enter').catch(() => {});
        await sleep(1000);
        o.afterFind = await read();
        o.findMsg = flat(await fr.locator('#findResultsCount, #findMsg').allInnerTexts().catch(() => []), 120);
        await snap(name, {sweep: o});
        return o;
    }

    // ------------------------------------------------------------ the on-screen part of the seed
    async function openWf(ctx, id, key) {
        await page.goto(cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`));
        await idle(page);
        await page.locator(vis).first().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(600);
    }
    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    const cat = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${label}(?=Digital|Physical|\\s|$)`)})}).first();
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
    }
    async function setOpenAccess(label, fileName) {
        const a = fileRowByName(label, fileName).locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
        await a.waitFor({timeout: 15000});
        await a.click();
        const form = page.locator('form#approvedProofForm:visible').last();
        await form.waitFor({timeout: 20000});
        await form.locator('input[type=radio][value="openAccess"]').click();
        await sleep(300);
        await top().getByRole('button', {name: 'Save', exact: true}).last().click();
        await sleep(1500); await idle(page);
        return flat(await fileRowByName(label, fileName).innerText().catch(() => null), 200);
    }
    const pluginRow = (id) => page.locator(`#pluginGridContainer tr.gridRow[id$="-row-${id}"]`);
    async function gotoPlugins(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/website'));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page); await sleep(400);
    }
    async function setPlugin(id, want) {
        const box = pluginRow(id).getByRole('checkbox').first();
        const out = {before: await box.isChecked(), want};
        if (out.before === want) return out;
        const w = page.waitForResponse((r) => /settings-plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click({noWaitAfter: true});
        await sleep(700);
        const dlg = page.locator(vis);
        if (await dlg.count()) {
            out.confirm = flat(await dlg.last().innerText().catch(() => null), 200);
            const ok = dlg.last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) await ok.click();
        }
        const resp = await w;
        out.status = resp ? resp.status() : null;
        await sleep(1200); await idle(page);
        out.after = await pluginRow(id).getByRole('checkbox').first().isChecked().catch(() => null);
        return out;
    }

    try {
        if (on('seed') && !S.screenSeeded) {
            const o = {};
            o.epub = await safe('seed-epub', async () => {
                const file = outFile('s05-book.epub');
                const size = makeEpub(file);
                await as(S.a.mg, S.a.path);
                await formatsPage('a', '1');
                await changeFile('EPUB', file);
                await formatsPage('a', '1');
                const fileName = path.basename(file);
                const row = await setOpenAccess('EPUB', fileName);
                await formatsPage('a', '1');
                const rows = await cat('EPUB').locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 160))).catch(() => []);
                await snap('s-00-epub-grid', {rows});
                const id = sql(app, `select submission_file_id from submission_files where assoc_type=521 and assoc_id=${fmtOf('a', '1', 'EPUB').id} order by submission_file_id desc limit 1`);
                const fm = (S.a.subs['1'].formats || []).find((x) => x.name === 'EPUB');
                if (fm) fm.submissionFileId = Number(id) || null;
                return {size, fileName, row, rows, fileId: id};
            });
            o.off = await safe('seed-off', async () => {
                await as(S.b.mg, S.b.path);
                await gotoPlugins(S.b.path);
                const r = {pdf: await setPlugin('pdfjsviewerplugin', false), html: await setPlugin('htmlmonographfileplugin', false)};
                await gotoPlugins(S.b.path);
                r.reloaded = {pdf: await pluginRow('pdfjsviewerplugin').getByRole('checkbox').first().isChecked(), html: await pluginRow('htmlmonographfileplugin').getByRole('checkbox').first().isChecked()};
                await snap('s-01-b-plugins-off', {plugins: r});
                return r;
            });
            await as(null);
            S.screenSeeded = true; save();
            fact('seed', {S, o});
        }

        // ------------------------------------------------------------ files: every kind of file, per role
        if (on('files')) {
            const o = {};
            for (const [role, u] of ROLES('a')) {
                await as(u, S.a.path);
                o[role] = {};
                o[role].book = await safe(`files-${role}-book`, () => bookPage('a', '1', `f-${role}-00-book`));
                for (const name of ['PDF', 'HTML', 'Other', 'Supp', 'SuppPdf', 'EPUB']) {
                    o[role][name] = await safe(`files-${role}-${name}`, async () => {
                        await bookPage('a', '1', `f-${role}-${name}-book`);
                        const x = fmtOf('a', '1', name);
                        const link = x.submissionFileId ? linkByFmt(x.id, x.submissionFileId) : linkByText(name);
                        const r = await press(link, `f-${role}-${name}-pressed`, {waitMs: name === 'PDF' || name === 'SuppPdf' ? 4000 : 2500});
                        if (r.isView && /PDF/.test(name)) {
                            r.downloads = await pdfDownloads(`f-${role}-${name}-downloads`);
                            if (role === 'visitor' && name === 'PDF') {
                                await bookPage('a', '1', `f-${role}-${name}-book-again`);
                                await press(link, `f-${role}-${name}-pressed-again`, {waitMs: 4000});
                                r.sweep = await viewerSweep(`f-${role}-${name}-viewer-sweep`);
                                await loc(page, 'PDF view page: the viewer frame', page.locator('iframe[src*="viewer.html"]'));
                            }
                        }
                        if (r.isView && name === 'HTML') await loc(page, 'HTML view page: the frame', page.locator('iframe[name="htmlFrame"]'));
                        return r;
                    });
                }
            }
            await as(null);
            fact('files', o);
        }

        // ------------------------------------------------------------ off: B's PDF and HTML with both plugins off
        if (on('off')) {
            const o = {};
            for (const [role, u] of ROLES('b')) {
                await as(u, S.b.path);
                o[role] = {};
                for (const name of ['PDF', 'HTML']) {
                    o[role][name] = await safe(`off-${role}-${name}`, async () => {
                        await bookPage('b', '1', `o-${role}-${name}-book`);
                        const x = fmtOf('b', '1', name);
                        return press(linkByFmt(x.id, x.submissionFileId), `o-${role}-${name}-pressed`, {waitMs: 2500});
                    });
                }
            }
            await as(null);
            fact('off', o);
        }

        // ------------------------------------------------------------ paid: a bought file
        if (on('paid')) {
            const o = {};
            const x = fmtOf('a', '1', 'Sale');
            o.before = await safe('paid-before', async () => {
                await as(S.a.rd, S.a.path);
                const b = await bookPage('a', '1', 'p-01-reader-book');
                const r = await press(linkByFmt(x.id, x.submissionFileId), 'p-02-reader-pressed-unpaid', {waitMs: 1500});
                return {links: b.links, landed: r.landed, docTitle: r.docTitle, body: r.body};
            });
            if (!S.paid) {
                const ctxId = sql(app, `select press_id from presses where path='${S.a.path}'`);
                const uid = sql(app, `select user_id from users where username='${S.a.rd}'`);
                sql(app, `insert into completed_payments (timestamp, payment_type, context_id, user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name) values (now(), 1, ${ctxId}, ${uid}, '${x.submissionFileId}', 25, 'USD', 'ManualPayment')`);
                S.paid = {ctxId, uid}; save();
            }
            o.after = await safe('paid-after', async () => {
                await as(S.a.rd, S.a.path);
                const b = await bookPage('a', '1', 'p-03-reader-book-paid');
                const r = await press(linkByFmt(x.id, x.submissionFileId), 'p-04-reader-pressed-paid', {waitMs: 4000});
                if (r.isView) r.downloads = await pdfDownloads('p-05-reader-paid-downloads');
                return {links: b.links, ...r};
            });
            o.manager = await safe('paid-manager', async () => {
                await as(S.a.mg, S.a.path);
                await bookPage('a', '1', 'p-06-manager-book');
                const r = await press(linkByFmt(x.id, x.submissionFileId), 'p-07-manager-pressed-unpaid', {waitMs: 1500});
                return {landed: r.landed, docTitle: r.docTitle, body: r.body, responses: r.responses};
            });
            await as(null);
            fact('paid', o);
        }

        // ------------------------------------------------------------ ver: an older version's files, per role
        if (on('ver')) {
            const o = {};
            if (!S.v2) {
                o.make = await safe('ver-make', async () => {
                    await as(S.a.mg, S.a.path);
                    await openWf(S.a.path, S.a.subs['1'].id);
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
                    await openWf(S.a.path, S.a.subs['1'].id, `publication_${id}_titleAbstract`);
                    const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
                    await btn.waitFor({state: 'visible', timeout: T});
                    await sleep(600);
                    await btn.click();
                    const vs = page.locator('select[name="versionStage"]');
                    const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
                    const which = await Promise.race([vs.waitFor({state: 'visible', timeout: 20000}).then(() => 'stage'), confirm.waitFor({state: 'visible', timeout: 20000}).then(() => 'confirm')]).catch(() => null);
                    if (which === 'stage') {
                        const opts = await vs.locator('option').evaluateAll((os) => os.map((q) => ({v: q.value, t: q.textContent.trim()})));
                        const pick = opts.find((q) => /Version of Record/.test(q.t));
                        if (pick) await vs.selectOption(pick.v);
                        await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
                        await confirm.waitFor({state: 'visible', timeout: T});
                    }
                    await idle(page);
                    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
                    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
                    const pr = await done;
                    S.v2 = id; save();
                    await snap('v-00-published-v2');
                    return {versionStatus: resp.status(), id, publish: pr ? pr.status() : null};
                });
            }
            const olderLink = (name) => page.locator('.obj_monograph_full a[href*="catalog/view"]').filter({hasText: new RegExp(`^\\s*${name}\\s*$`)}).first();
            for (const [role, u] of ROLES('a')) {
                await as(u, S.a.path);
                o[role] = {};
                for (const name of ['PDF', 'HTML', 'Other']) {
                    o[role][name] = await safe(`ver-${role}-${name}`, async () => {
                        const b = await bookPage('a', '1', `v-${role}-${name}-older-book`, `/version/${S.a.subs['1'].pub}`);
                        const r = await press(olderLink(name), `v-${role}-${name}-older-pressed`, {waitMs: name === 'PDF' ? 4000 : 2500});
                        r.bookLinks = b.links;
                        if (r.isView && name === 'PDF') r.downloads = await pdfDownloads(`v-${role}-${name}-older-downloads`);
                        return r;
                    });
                }
            }
            await as(null);
            fact('ver', o);
        }

        // ------------------------------------------------------------ meta: the search-engine tags' file addresses
        if (on('meta')) {
            const o = {};
            await as(null);
            await bookPage('a', '1', 'm-01-book-visitor');
            o.tags = await page.locator('meta').evaluateAll((ms) => ms.map((m) => ({n: m.getAttribute('name') || m.getAttribute('property'), c: m.getAttribute('content')}))
                .filter((m) => m.c && /catalog\/(download|view)/.test(m.c))).catch(() => []);
            o.opened = [];
            for (const [i, t] of o.tags.entries()) {
                o.opened.push(await safe(`meta-${i}`, async () => {
                    const t0 = Date.now();
                    const lines0 = readLog(app).lines.length;
                    const dl = catchDownload(9000, `m-${i}`);
                    const resp = await page.goto(t.c).catch((e) => ({err: flat(e.message, 160)}));
                    await settle();
                    const r = {tag: t.n, url: rel(t.c), status: resp && resp.status ? resp.status() : resp, download: await dl, landed: rel(page.url()),
                        docTitle: await page.title().catch(() => null), body: flat(await page.locator('body').innerText().catch(() => ''), 200), responses: since(resps, t0)};
                    r.usage = readLog(app).lines.slice(lines0).filter(ours).map(slimLog);
                    await snap(`m-02-tag-${i}`, {opened: r});
                    await page.goto(cUrl(S.a.path, `/catalog/book/${S.a.subs['1'].id}`)).catch(() => {});
                    await settle();
                    return r;
                }));
            }
            fact('meta', o);
        }

        // ------------------------------------------------------------ urlp: a book with a URL Path
        if (on('urlp')) {
            const o = {};
            await as(null);
            o.book = await safe('urlp-book', async () => {
                const t0 = Date.now();
                const resp = await page.goto(cUrl(S.a.path, `/catalog/book/${S.a.subs['2'].id}`));
                await settle();
                await snap('u-01-urlpath-book');
                const links = await page.locator('.obj_monograph_full a[href*="/catalog/view/"]').evaluateAll((as) => as.map((a) => ({t: a.textContent.trim(), h: a.getAttribute('href')})));
                return {status: resp.status(), landed: rel(page.url()), links: links.map((l) => ({t: l.t, h: rel(l.h)})), responses: since(resps, t0)};
            });
            o.pdf = await safe('urlp-pdf', async () => {
                const r = await press(page.locator('.obj_monograph_full a[href*="/catalog/view/"]').first(), 'u-02-urlpath-pdf-pressed', {waitMs: 4000});
                if (r.isView) r.downloads = await pdfDownloads('u-03-urlpath-downloads');
                return r;
            });
            fact('urlp', o);
        }

        // ------------------------------------------------------------ a25: an HTML file that links another book
        if (on('a25')) {
            const o = {};
            if (!S.a3) {
                o.make = await safe('a25-make', async () => {
                    const r = await app.api.createSubmission({tag: `${S.a.path}3`, context: S.a.path, submitter: S.a.au, title: 'S05 a3 linking book', published: true, publicationFormats: [{name: 'HTML'}]});
                    const fm = (r.publicationFormats || [])[0];
                    S.a3 = {id: r.submissionId, pub: r.publicationId, fmt: fm && fm.id};
                    S.a.subs['3'] = {id: r.submissionId, pub: r.publicationId, formats: [{name: 'HTML', id: fm && fm.id, submissionFileId: null}]};
                    const file = outFile('s05-monograph-link.html');
                    fs.writeFileSync(file, `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>Linking</title></head>\n<body><h1>Linking chapter</h1>\n<p>See also <a id="mono" href="omp://monograph/${S.a.subs['2'].id}">the other book</a> and <a id="press" href="omp://press">the press</a>.</p>\n</body></html>\n`);
                    await as(S.a.mg, S.a.path);
                    await formatsPage('a', '3');
                    await changeFile('HTML', file);
                    await formatsPage('a', '3');
                    const row = await setOpenAccess('HTML', path.basename(file));
                    const id = sql(app, `select submission_file_id from submission_files where assoc_type=521 and assoc_id=${S.a3.fmt} order by submission_file_id desc limit 1`);
                    S.a.subs['3'].formats[0].submissionFileId = Number(id) || null;
                    save();
                    await snap('h-00-a3-formats', {row});
                    return {a3: S.a3, row, fileId: id};
                });
            }
            for (const [role, u] of ROLES('a')) {
                await as(u, S.a.path);
                o[role] = await safe(`a25-${role}`, async () => {
                    await bookPage('a', '3', `h-${role}-book`);
                    const x = fmtOf('a', '3', 'HTML');
                    const r = await press(linkByFmt(x.id, x.submissionFileId), `h-${role}-pressed`, {waitMs: 2500});
                    const fr = page.frames().find((f) => f !== page.mainFrame() && /catalog\/download/.test(f.url()));
                    r.inFrame = {};
                    if (fr) {
                        for (const id of ['mono', 'press']) {
                            const frNow = page.frames().find((f) => f !== page.mainFrame() && /catalog\/download/.test(f.url())) || fr;
                            const a = frNow.locator(`a#${id}`);
                            const href = await a.getAttribute('href').catch(() => null);
                            const t0 = Date.now();
                            const pop = page.context().waitForEvent('page', {timeout: 3000}).catch(() => null);
                            await a.click({timeout: 4000, noWaitAfter: true}).catch((e) => { r.inFrame[`${id}Err`] = flat(e.message, 120); });
                            await sleep(1500);
                            const p2 = await pop;
                            const fr2 = page.frames().find((f) => f !== page.mainFrame());
                            r.inFrame[id] = {href, pageUrl: rel(page.url()), frameUrl: fr2 ? rel(fr2.url()) : null, newTab: p2 ? rel(p2.url()) : null,
                                frameText: fr2 ? flat(await fr2.locator('body').innerText().catch(() => null), 200) : null, errors: since(pageErrors, t0)};
                            if (p2) await p2.close().catch(() => {});
                            await snap(`h-${role}-link-${id}-pressed`, {inFrame: r.inFrame[id]});
                            // back to the view page for the next link
                            await bookPage('a', '3', `h-${role}-book-again-${id}`);
                            await press(linkByFmt(x.id, x.submissionFileId), `h-${role}-pressed-again-${id}`, {waitMs: 2000});
                        }
                    }
                    return r;
                });
            }
            await as(null);
            fact('a25', o);
        }

        // ------------------------------------------------------------ usage: the run's presses in the day's usage log
        if (on('usage')) {
            const counts = {};
            for (const l of readLog(app).lines.filter(ours)) {
                if ([1048585, 512, 532].includes(l.assocType)) continue; // book, press and chapter pages
                const k = `${l.assocType} ${rel(l.canonicalUrl).replace(/^\/[^/]+/, '')}`;
                counts[k] = (counts[k] || 0) + 1;
            }
            fact('usage', counts);
        }
    } finally {
        fact('dialogs', jsDialogs);
        await close();
    }
});
