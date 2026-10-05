// U20 claim check, chunk S05 (upstream sync 2026-10-05): OMP book file downloads after omp 8c807c919
// (pkp/pkp-lib#13444, CatalogBookHandler::download() builds its UsageEvent with the local $publication).
// Spec: docs/specs/U20-search-engine-metadata-and-analytics.md — Rule 12's press sentence (OMP6), Rule 16
// (a chapter page's files), Rule 17 (a file's view page: DC.Identifier, DC.Type), Rule 13's press file page,
// Cross-feature (Monograph landing page owns the downloads), scenario 6 "The book's file page", Coverage
// "Register carries it" OMP6, register OMP1/OMP3/OMP6; footnotes h, i, q14, q15, q18, q19, f-omp3, f-omp5, f-omp6.
//
//   PROBE_FEATURE=U20 PROBE_AGENT=ccS05 node bin/probe.js all shared/playwright/checks/U20/S05/s05.js
//   PHASES=seed,version once (mutating, guarded in s05-state-<app>.json; RESEED=1 starts afresh), then
//   PROBE_RUN=r1 PHASES=read,reader,viewersoff and PROBE_RUN=r2 the same (each run reads everything again).
//   OMP1's control on OJS/OPS: PHASES=seed2 once, then PROBE_RUN=r1|r2 PHASES=read,control2 (ojs,ops).
//   Run detached through the Bash tool's run_in_background, not a nohup chain (a nohup chain lost its browser).
//
// Scratch press (tag prefix u20s05) with a manager <p>mg, a reader <p>rd and an author <p>au. One book,
// published by the seed: formats "PDF" (article.pdf, Book Manuscript), "HTML" (article.html + figure.png,
// Book Manuscript), "Notes" (notes.md, the default component), "Chapter PDF" (article.pdf, Chapter Manuscript)
// given to chapter 1 "Chapter One Tides" (its own page, pages 5-9, the author). Phase version: the manager
// presses "Create New Version" on screen, changes the title and publishes it, so version 1 is the earlier one.
// OJS / OPS (control, phase read): a scratch journal / server with one published item and a "PDF" galley.
// Phases: seed · version · read (signed out: book, chapter, earlier version; every file address the tags and
//   the links name, followed by a crawler client and by the visitor's browser, with and without ?inline=1;
//   each view page's Dublin Core tags and viewer; the bar's and the viewer's "Download") · reader (signed in as
//   the press's reader: the "PDF" link) · viewersoff (manager unticks "PDF.js PDF Viewer" and "HTML Monograph
//   File" on the scratch press, the visitor presses each link, both ticked again).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {request: pwRequest} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, outDir, serverLog} = require('../../../probe');

const T = 30_000;
const PHASES = (process.env.PHASES || 'seed,version,read,reader,viewersoff').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const GS_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** Every tag in the page source's head the two plugins (and the version rules) could write, in source order. */
function headTags(html) {
    const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
    const out = [];
    for (const m of head.matchAll(/<(meta|link)\b[^>]*>/gi)) {
        const raw = m[0];
        const attr = (n) => { const x = raw.match(new RegExp(`\\s${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return x ? (x[2] ?? x[3]) : null; };
        const name = attr('name'), rel = attr('rel');
        if (m[1].toLowerCase() === 'meta' && name && /^(citation_|gs_|DC\.|robots$)/i.test(name)) out.push({name, content: attr('content'), scheme: attr('scheme')});
        if (m[1].toLowerCase() === 'link' && rel && /^(schema\.DC|canonical)$/i.test(rel)) out.push({name: `link:${rel}`, content: attr('href')});
    }
    return out;
}
const tagList = (tags) => tags.map((x) => `${x.name}${x.scheme ? `{${x.scheme}}` : ''}=${x.content}`);
/** The file addresses a page's tags name (Google Scholar's two, any DC value under catalog/). */
const tagAddresses = (tags) => tags.filter((x) => /^(citation_pdf_url|citation_fulltext_html_url)$/.test(x.name) || (/^DC\./.test(x.name) && /\/catalog\//.test(x.content || ''))).map((x) => ({tag: x.name, url: x.content}));

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const log = (...a) => console.log(`[s05 ${app.name} ${RUN}]`, ...a);
    const sf = path.join(outDir(), `s05-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('s05-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 2500)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const slog = serverLog(app);

    await app.api.bootstrapProbe(app.contextPath);

    // ================================================================== seed (API)
    if (on('seed') && !S.seeded) {
        const t = tag('u20s05');
        const p = `${t}p`;
        S = {t, p};
        const ctx = await app.api.createContext({
            tag: p,
            context: {name: `U20 S05 ${app.name} ${t}`, acronym: 'S05'},
            users: [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${p}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ],
            ...(app.name === 'ojs' ? {issues: [{volume: 1, number: 1, year: 2025, published: true}]} : {}),
        });
        S.path = ctx.path; S.contextId = ctx.contextId;
        const base = {tag: `${t}b`, context: ctx.path, submitter: `${p}au`, title: 'Tidal Patterns', abstract: '<p>Tides follow the moon.</p>', published: true};
        let spec;
        if (isOMP) {
            spec = {...base,
                mediaFiles: [{file: 'figure.png'}],
                publicationFormats: [
                    {name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'},
                    {name: 'HTML', file: 'article.html', genre: 'Book Manuscript'},
                    {name: 'Notes', file: 'notes.md'},
                    {name: 'Chapter PDF', file: 'article.pdf', genre: 'Chapter Manuscript'},
                ],
                chapters: [{title: 'Chapter One Tides', page: true, pages: '5-9', authors: [`${p}au`], files: ['publicationFormats.3']}]};
        } else if (app.name === 'ojs') {
            spec = {...base, issue: {volume: 1, number: 1, year: 2025}, galleys: [{label: 'PDF', file: 'article.pdf'}]};
        } else {
            spec = {...base, galleys: [{label: 'PDF', file: 'preprint.pdf'}]};
        }
        const r = await app.api.createSubmission(spec);
        S.sid = r.submissionId; S.pub1 = r.publicationId; S.formats = r.publicationFormats || null; S.chapters = r.chapters || null; S.galleys = r.galleys || null;
        S.seeded = true;
        save();
        fact('seed', S);
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }
    // seed2 (OJS, OPS): the OMP1 control, an item whose galley is neither a PDF nor HTML
    if (on('seed2') && S.seeded && !isOMP && !S.sid2) {
        const r = await app.api.createSubmission({tag: `${S.t}n`, context: S.path, submitter: `${S.p}au`, title: 'Sea Notes', abstract: '<p>Notes on the sea.</p>', published: true,
            ...(app.name === 'ojs' ? {issue: {volume: 1, number: 1, year: 2025}, galleys: [{label: 'Notes', file: 'notes.md'}, {label: 'PDF', file: 'article.pdf'}]} : {galleys: [{label: 'Text', file: 'not-an-image.txt'}, {label: 'PDF', file: 'preprint.pdf'}]})});
        S.sid2 = r.submissionId; S.galleys2 = r.galleys || null; save();
        fact('seed2', {sid2: S.sid2, galleys2: S.galleys2});
    }

    const P = S.path;

    const {page, close} = await launch(app);
    const bad = [], pageErrors = [], consoleErrors = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 200)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200), url: strip(page.url())}));
    page.on('crash', () => log('PAGE CRASHED at', strip(page.url())));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({at: Date.now(), text: flat(m.text(), 200), url: strip(page.url())}); });
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = 0;
    async function snap(name, extra, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `s05-${String(++snapN).padStart(2, '0')}-${name}`;
        record(n, s);
        if (png) await shot(page, n).catch(() => {});
        return n;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now(), from = slog.mark();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`, null, {png: true}).catch(() => {});
        }
        fact(`${name}.crashes`, {server5xx: since(bad, t0).filter((r) => r.status >= 500), status4xx: since(bad, t0).filter((r) => r.status < 500), script: since(pageErrors, t0), consoleErrors: since(consoleErrors, t0), serverLog: slog.since(from).map((l) => flat(l, 300)).slice(0, 30)});
    }
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r; };
    /** Open an address in the browser; its own HTML is the page source. */
    async function source(name, url, {png = false} = {}) {
        const resp = await page.goto(url).catch((e) => ({err: flat(e.message, 200)}));
        await idle(page).catch(() => {});
        const html = resp && resp.text ? await resp.text().catch(() => '') : '';
        const tags = headTags(html);
        const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), href: a.getAttribute('href'), cls: a.className})).filter((a) => /\/catalog\/(view|download|book)\/|\/chapter\/|\/(article|preprint)\/(view|download)\//.test(a.href))).catch(() => []);
        const out = {asked: strip(url), landed: strip(page.url()), status: resp && resp.status ? resp.status() : resp, title: await page.title().catch(() => null), tags: tagList(tags), addresses: tagAddresses(tags), links: links.map((l) => ({...l, href: strip(l.href)}))};
        out.snap = await snap(name, {source: out}, {png});
        return out;
    }

    // ------------------------------------------------------------------ the crawler: a signed-out client following an address
    const usage = isOMP ? require('../../issues/book-file-open-download-fails/lib').usageLog(app) : null;
    async function crawl(url, ua) {
        const rc = await pwRequest.newContext({userAgent: ua || GS_UA, ignoreHTTPSErrors: true});
        const chain = [];
        let u = url, last = null;
        try {
            for (let i = 0; i < 6; i++) {
                const r = await rc.get(u, {maxRedirects: 0, failOnStatusCode: false, timeout: T});
                const h = r.headers();
                const body = await r.body().catch(() => Buffer.alloc(0));
                last = {url: strip(u), status: r.status(), type: h['content-type'] || null, disposition: h['content-disposition'] || null, bytes: body.length, head: body.subarray(0, 8).toString('latin1').replace(/[^\x20-\x7e]/g, '.'), text: /text|json/.test(h['content-type'] || '') ? flat(body.toString('utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '), 160) : null};
                chain.push(last);
                if (r.status() >= 300 && r.status() < 400 && h.location) { u = new URL(h.location, u).toString(); continue; }
                break;
            }
        } finally { await rc.dispose(); }
        return {asked: strip(url), final: last, hops: chain.length, chain: chain.length > 1 ? chain.map((c) => `${c.status} ${c.url}`) : undefined};
    }
    const withInline = (u) => (/[?&]inline=/.test(u) ? u.replace(/[?&]inline=[^&]*/, '').replace(/\?$/, '') : `${u}${u.includes('?') ? '&' : '?'}inline=1`);
    const abs = (h) => (/^https?:/.test(h) ? h : app.url(h));

    // ------------------------------------------------------------------ the visitor's browser at an address (typed)
    async function typed(name, url) {
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 8_000}).catch(() => null);
        const r = await page.goto(url).catch((e) => ({err: flat(e.message, 160)}));
        const d = await dl;
        const out = {asked: strip(url), status: r && r.status ? r.status() : r, type: r && r.headers ? (r.headers()['content-type'] || null) : null, disposition: r && r.headers ? (r.headers()['content-disposition'] || null) : null};
        if (d) {
            const fp = await d.path().catch(() => null);
            out.download = {suggestedFilename: d.suggestedFilename(), failure: await d.failure().catch(() => 'n/a'), bytes: fp ? fs.statSync(fp).size : null};
        } else {
            await idle(page).catch(() => {});
            out.landed = strip(page.url());
            out.title = await page.title().catch(() => null);
            out.body = flat(await page.locator('body').innerText().catch(() => ''), 160);
            out.embed = await page.locator('embed, iframe').count().catch(() => null);
            out.snap = await snap(name, {typed: out});
        }
        out.crashes = {server: since(bad, t0).filter((x) => x.status >= 500), script: since(pageErrors, t0)};
        return out;
    }

    // ------------------------------------------------------------------ the PDF view page as a reader sees it
    async function readView() {
        await idle(page).catch(() => {});
        await sleep(3500);
        const frame = page.locator('#pdfCanvasContainer > iframe, #htmlContainer iframe, iframe').first();
        const has = await frame.count();
        const fl = page.frameLocator('#pdfCanvasContainer > iframe');
        const visible = (l) => l.isVisible({timeout: 2000}).catch(() => false);
        const errorShown = await visible(fl.locator('#errorWrapper'));
        return {
            url: strip(page.url()), title: await page.title(),
            bar: flat(await page.locator('header.header_viewable_file').innerText({timeout: 2000}).catch(() => null), 200),
            returnHref: strip(await page.locator('header.header_viewable_file a.return').getAttribute('href', {timeout: 2000}).catch(() => null)),
            returnName: flat(await page.locator('header.header_viewable_file a.return').innerText({timeout: 2000}).catch(() => null), 200),
            downloadHref: strip(await page.locator('header.header_viewable_file a.download').getAttribute('href', {timeout: 2000}).catch(() => null)),
            frameSrc: has ? flat(strip(await frame.getAttribute('src').catch(() => null)), 300) : null,
            numPages: flat(await fl.locator('#numPages').innerText({timeout: 2000}).catch(() => null), 60),
            renderedPages: await fl.locator('#viewer .page canvas').count().catch(() => null),
            errorBar: errorShown ? flat(await fl.locator('#errorMessage').innerText().catch(() => null), 200) : null,
        };
    }
    async function pressForDownload(locator) {
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
        const click = await locator.click({timeout: 10_000}).then(() => null).catch((e) => flat(e.message, 160));
        const d = await dl;
        const out = {clickError: click, download: null};
        if (d) {
            const fp = await d.path().catch(() => null);
            out.download = {suggestedFilename: d.suggestedFilename(), url: strip(d.url()), failure: await d.failure().catch(() => 'n/a'), bytes: fp ? fs.statSync(fp).size : null};
        }
        await sleep(1200);
        out.pageAfter = {url: strip(page.url()), title: await page.title().catch(() => null)};
        out.crashes = {server: since(bad, t0).filter((x) => x.status >= 500), script: since(pageErrors, t0)};
        return out;
    }
    /** Press a file link on a book/chapter page: what opens (view page or download), read it. */
    async function pressLink(name, pageUrl, linkHref, {readDownloads = true} = {}) {
        await go(pageUrl);
        const t0 = Date.now();
        const link = page.locator(`a[href="${linkHref}"], a[href$="${strip(linkHref)}"]`).first();
        const out = {page: strip(pageUrl), link: strip(linkHref), linkText: flat(await link.innerText().catch(() => null), 80)};
        const dl = page.waitForEvent('download', {timeout: 8_000}).catch(() => null);
        const nav = page.waitForResponse((r) => r.request().isNavigationRequest() && r.frame() === page.mainFrame() && /\/catalog\/(view|download)\//.test(r.url()), {timeout: 10_000}).catch(() => null);
        await link.click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 160); });
        const [d, r] = await Promise.all([dl, nav]);
        out.navigation = r ? {url: strip(r.url()), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null} : null;
        if (d) {
            const fp = await d.path().catch(() => null);
            out.download = {suggestedFilename: d.suggestedFilename(), url: strip(d.url()), failure: await d.failure().catch(() => 'n/a'), bytes: fp ? fs.statSync(fp).size : null};
        }
        await idle(page).catch(() => {});
        out.landed = strip(page.url());
        if (/\/catalog\/view\//.test(page.url())) {
            out.view = await readView();
            const html = r ? await r.text().catch(() => '') : '';
            out.viewTags = tagList(headTags(html));
            out.frameRequests = since(fileReq, t0);
            out.snap = await snap(`${name}-view`, {press: out}, {png: true});
            if (readDownloads && out.view.downloadHref) {
                out.barDownload = await pressForDownload(page.locator('header.header_viewable_file a.download'));
                if (out.view.renderedPages) out.viewerDownload = await pressForDownload(page.frameLocator('#pdfCanvasContainer > iframe').locator('#download'));
            }
        } else {
            out.title = await page.title().catch(() => null);
            out.body = flat(await page.locator('body').innerText().catch(() => ''), 200);
            out.snap = await snap(`${name}-after`, {press: out});
        }
        out.crashes = {server: since(bad, t0).filter((x) => x.status >= 500), status4xx: since(bad, t0).filter((x) => x.status < 500), script: since(pageErrors, t0)};
        if (usage) { await sleep(800); out.usageLines = usage.since(); }
        return out;
    }
    const fileReq = [];
    page.on('response', (r) => { if (/\/catalog\/download\//.test(r.url())) fileReq.push({at: Date.now(), url: strip(r.url()), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null}); });

    const as = async (u) => { await signIn(page, u, {contextPath: P}); await idle(page).catch(() => {}); };
    const visitor = async () => { await signOut(page).catch(() => {}); };

    try {
        // ============================================================== version (OMP): Create New Version on screen, publish
        await sect('version', async () => {
            if (!isOMP || S.v2) return;
            await as(`${S.p}mg`);
            const wf = () => page.locator('[role="dialog"]:visible').first();
            await go(cu(P, `/dashboard/editorial?workflowSubmissionId=${S.sid}&workflowMenuKey=publication_${S.pub1}_titleAbstract`));
            await wf().waitFor({timeout: T}).catch(() => {});
            await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
            await sleep(1200);
            await snap('version-01-workflow-v1', null, {png: true});
            const cnv = page.getByRole('button', {name: 'Create New Version', exact: true}).or(page.getByRole('link', {name: 'Create New Version', exact: true})).first();
            await cnv.waitFor({state: 'visible', timeout: T});
            await sleep(800);
            await cnv.click();
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
            await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(600);
            for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                const el = w.locator(sel);
                if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
            }
            await snap('version-02-new-version-window');
            const rv = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await w.getByRole('button', {name: 'Confirm', exact: true}).click();
            const resp = await rv;
            const v2 = resp ? (await resp.json().catch(() => ({}))).id : null;
            await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            S.v2 = v2; save();
            // the new version's title, then publish
            await go(cu(P, `/dashboard/editorial?workflowSubmissionId=${S.sid}&workflowMenuKey=publication_${v2}_titleAbstract`));
            await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
            const id = 'titleAbstract-title-control-en';
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
            await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
            await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete');
            await page.keyboard.type('Tidal Patterns Revised');
            await sleep(300);
            const rs = page.waitForResponse((x) => /\/api\/v1\//.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
            const sres = await rs;
            await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
            S.v2Save = sres ? sres.status() : null;
            await snap('version-03-v2-saved');
            const controls = page.locator('[data-cy="workflow-controls-right"]');
            const pub = controls.getByRole('button', {name: /^Publish$/}).first();
            await pub.waitFor({state: 'visible', timeout: T});
            await sleep(800);
            await pub.click();
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public/}).last();
            const which = () => Promise.race([
                panel.locator('select[name="versionStage"]').first().waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
                panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
                confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
            ]).catch(() => null);
            let opened = await which();
            if (!opened) { await pub.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
            await idle(page); await sleep(600);
            if (opened === 'panel') {
                await snap('version-04-publish-panel');
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                await confirm.waitFor({state: 'visible', timeout: T});
            }
            await idle(page); await sleep(600);
            await snap('version-05-publish-confirm');
            const rp = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
            const pr = await rp;
            S.v2Publish = pr ? pr.status() : null;
            await controls.getByRole('button', {name: /^Unpublish$/}).first().waitFor({timeout: T}).catch(() => {});
            await snap('version-06-v2-published', null, {png: true});
            save();
            fact('version', {v2: S.v2, save: S.v2Save, publish: S.v2Publish});
            await visitor();
        });

        // ============================================================== read (signed out)
        await sect('read', async () => {
            await visitor();
            const R = {};
            if (!isOMP && on('control2')) {
                // OMP1's control: an item with a galley that is neither a PDF nor HTML
                const src = await source('control2-item', cu(P, app.name === 'ojs' ? `/article/view/${S.sid2}` : `/preprint/view/${S.sid2}`), {png: true});
                const follow = [];
                for (const a of src.addresses) follow.push({tag: a.tag, ...(await crawl(a.url))});
                fact('read.control2', {status: src.status, tags: src.tags.filter((x) => /^citation_(pdf|fulltext)|^DC\.Format/.test(x)), links: src.links, follow, snap: src.snap});
                return;
            }
            if (!isOMP) {
                // control: the item page's PDF tag, followed by the crawler
                const itemUrl = cu(P, app.name === 'ojs' ? `/article/view/${S.sid}` : `/preprint/view/${S.sid}`);
                const src = await source('control-item', itemUrl);
                R.item = {status: src.status, addresses: src.addresses, snap: src.snap};
                R.follow = [];
                for (const a of src.addresses) R.follow.push({tag: a.tag, ...(await crawl(a.url))});
                fact('read.control', R);
                return;
            }
            const book = cu(P, `/catalog/book/${S.sid}`);
            const v1 = cu(P, `/catalog/book/${S.sid}/version/${S.pub1}`);
            R.book = await source('book', book, {png: true});
            const chapterLinks = [...new Set(R.book.links.filter((l) => /\/chapter\//.test(l.href)).map((l) => l.href))];
            R.chapters = [];
            for (const h of chapterLinks) R.chapters.push(await source(`chapter-${R.chapters.length + 1}`, abs(h), {png: true}));
            R.v1 = S.v2 ? await source('v1-book', v1, {png: true}) : null;
            R.v1Chapters = [];
            if (R.v1) for (const h of [...new Set(R.v1.links.filter((l) => /\/chapter\//.test(l.href)).map((l) => l.href))]) R.v1Chapters.push(await source(`v1-chapter-${R.v1Chapters.length + 1}`, abs(h)));
            fact('read.pages', {book: {status: R.book.status, tags: R.book.tags, links: R.book.links, snap: R.book.snap},
                chapters: R.chapters.map((c) => ({asked: c.asked, status: c.status, tags: c.tags, links: c.links, snap: c.snap})),
                v1: R.v1 && {status: R.v1.status, tags: R.v1.tags, links: R.v1.links, snap: R.v1.snap},
                v1Chapters: R.v1Chapters.map((c) => ({asked: c.asked, status: c.status, tags: c.tags, links: c.links, snap: c.snap}))});
            usage.since();

            // 1. the crawler follows each address the book's and chapter's tags name, as given and with ?inline=1 flipped
            const tagged = [...R.book.addresses.map((a) => ({from: 'book', ...a})), ...R.chapters.flatMap((c) => c.addresses.map((a) => ({from: c.asked, ...a})))];
            const crawled = [];
            for (const a of tagged) {
                const t0 = Date.now();
                crawled.push({from: a.from, tag: a.tag, asGiven: await crawl(a.url), inlineFlipped: await crawl(withInline(a.url)), plainUA: await crawl(a.url, 'Mozilla/5.0 (X11; Linux x86_64) pkp-e2e-probe')});
                void t0;
            }
            await sleep(800);
            fact('read.crawl-tags', {crawled, usageLines: usage.since()});

            // 2. each file link on the pages (current and earlier version): the download address, by the crawler, with and without inline
            const fileLinks = (o) => [...new Set(o.links.filter((l) => /\/catalog\/(view|download)\//.test(l.href)).map((l) => l.href))];
            const pagesLinks = [['book', R.book], ...R.chapters.map((c, i) => [`chapter-${i + 1}`, c]), ...(R.v1 ? [['v1', R.v1]] : []), ...R.v1Chapters.map((c, i) => [`v1-chapter-${i + 1}`, c])];
            const linkDl = [];
            for (const [from, o] of pagesLinks) {
                for (const h of fileLinks(o)) {
                    const dlAddr = abs(h).replace('/catalog/view/', '/catalog/download/');
                    linkDl.push({from, link: strip(h), view: await crawl(abs(h)), download: await crawl(dlAddr), downloadInline: await crawl(withInline(dlAddr))});
                }
            }
            await sleep(800);
            fact('read.crawl-links', {linkDl, usageLines: usage.since()});

            // 3. the visitor's browser: each tag address typed, as given and with ?inline=1 flipped
            const typedOut = [];
            let k = 0;
            for (const a of tagged) {
                typedOut.push({from: a.from, tag: a.tag, asGiven: await typed(`typed-${++k}`, a.url), inlineFlipped: await typed(`typed-${++k}`, withInline(a.url))});
            }
            // the earlier version's download addresses, typed
            if (R.v1) for (const h of fileLinks(R.v1)) { const d = abs(h).replace('/catalog/view/', '/catalog/download/'); typedOut.push({from: 'v1', link: strip(h), asGiven: await typed(`typed-${++k}`, d), inlineFlipped: await typed(`typed-${++k}`, withInline(d))}); }
            await sleep(800);
            fact('read.typed', {typedOut, usageLines: usage.since()});

            // 4. the visitor presses each file link on each page: the view page (its Dublin Core tags, the viewer, both "Download"s)
            const pressed = [];
            let j = 0;
            for (const [from, o] of pagesLinks) {
                for (const h of fileLinks(o)) {
                    const pr = await pressLink(`press-${++j}-${from}`, abs(o.asked), h);
                    pressed.push({from, ...pr});
                }
            }
            fact('read.pressed', pressed);

            // 5. the view page's "DC.Identifier.URI" and its return link, followed
            const firstView = pressed.find((x) => x.view && x.viewTags && x.viewTags.length);
            if (firstView) {
                const uri = (firstView.viewTags.find((x) => x.startsWith('DC.Identifier.URI=')) || '').replace(/^DC\.Identifier\.URI=/, '');
                if (uri) { const o = await source('dc-identifier-uri', uri); fact('read.dc-uri', {uri: strip(uri), status: o.status, landed: o.landed, title: o.title, dc: o.tags.filter((x) => /^DC\.(Title|Type|Identifier)/.test(x)), snap: o.snap}); }
                // sweep: the bar's return link
                await go(abs(firstView.landed));
                await sleep(1500);
                const back = page.locator('header.header_viewable_file a.return');
                await loc(page, 'view page: the bar\'s return link', back);
                await loc(page, 'view page: the bar\'s Download link', page.locator('header.header_viewable_file a.download'));
                const t0 = Date.now();
                await back.click({timeout: 10_000}).catch(() => {});
                await idle(page).catch(() => {});
                fact('read.sweep-return', {from: firstView.landed, landed: strip(page.url()), title: await page.title(), crashes: since(bad, t0), snap: await snap('return-link-pressed')});
            }
            const v1View = pressed.find((x) => x.from === 'v1' && x.view);
            if (v1View) {
                await go(abs(v1View.landed)); await sleep(1500);
                const back = page.locator('header.header_viewable_file a.return');
                const href = strip(await back.getAttribute('href').catch(() => null));
                await back.click({timeout: 10_000}).catch(() => {});
                await idle(page).catch(() => {});
                fact('read.sweep-v1-return', {from: v1View.landed, href, landed: strip(page.url()), title: await page.title(), snap: await snap('v1-return-link-pressed')});
            }
        });

        // ============================================================== reader (signed in as the press's reader)
        await sect('reader', async () => {
            if (!isOMP) return;
            await as(`${S.p}rd`);
            const book = cu(P, `/catalog/book/${S.sid}`);
            const src = await source('reader-book', book);
            const pdf = src.links.find((l) => /\/catalog\/view\//.test(l.href) && /^PDF$/.test(l.text));
            const out = {bookStatus: src.status, links: src.links, pdf: pdf ? await pressLink('reader-pdf', book, pdf.href) : 'no PDF link'};
            fact('reader', out);
            await visitor();
        });

        // ============================================================== viewersoff: the two viewer plugins unticked on the scratch press
        await sect('viewersoff', async () => {
            if (!isOMP) return;
            const plugins = require('../../issues/doaj-tool-stays-on-plugins-list-when-off/lib');
            const capp = {...app, contextPath: P};
            const book = cu(P, `/catalog/book/${S.sid}`);
            const out = {};
            await as(`${S.p}mg`);
            await plugins.openPlugins(capp, page);
            out.before = {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin')};
            out.untickPdf = await plugins.setEnabled(capp, page, 'pdfjsviewerplugin', false);
            out.untickHtml = await plugins.setEnabled(capp, page, 'htmlmonographfileplugin', false);
            await plugins.openPlugins(capp, page);
            out.after = {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin')};
            await snap('off-01-plugins-unticked');
            await visitor();
            try {
                const src = await source('off-02-book', book);
                out.bookTags = src.tags;
                out.pressed = [];
                let j = 0;
                for (const h of [...new Set(src.links.filter((l) => /\/catalog\/(view|download)\//.test(l.href)).map((l) => l.href))]) out.pressed.push(await pressLink(`off-${++j}`, book, h, {readDownloads: false}));
                const tagged = src.addresses;
                out.crawled = [];
                for (const a of tagged) out.crawled.push({tag: a.tag, asGiven: await crawl(a.url)});
            } finally {
                await as(`${S.p}mg`);
                await plugins.openPlugins(capp, page);
                out.tickPdf = await plugins.setEnabled(capp, page, 'pdfjsviewerplugin', true);
                out.tickHtml = await plugins.setEnabled(capp, page, 'htmlmonographfileplugin', true);
                await plugins.openPlugins(capp, page);
                out.restored = {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin')};
                await visitor();
            }
            fact('viewersoff', out);
        });
    } finally {
        await close();
    }
});
