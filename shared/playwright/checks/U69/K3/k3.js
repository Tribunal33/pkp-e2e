// U69 claim check, chunk K3: the book page's contents {OMP}, with read-only "Downloads" chart controls on OJS and OPS.
// Spec: docs/specs/U69-monograph-landing-page.md — Rules 10–12 (279–338), Rule 20 (438–445), Setting 5 (495–500),
// Setting 14 (543–555), A6 (729–736); footnotes i, td10, td11, p, td12, n, td19, f-a6.
//
//   RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccK3 node bin/probe.js <all|omp|ojs|ops> shared/playwright/checks/U69/K3/k3.js
//   PHASES (OMP): seed, read, screens, after, versions, lists, reorder, license, pubid, theme · (OJS, OPS): control.
//   Default: seed,read,screens,after,versions,lists,theme,control; add reorder,license,pubid by name (each is re-runnable:
//   the on-screen steps of versions, lists, license and pubid are done once per RUN and remembered in the state file).
//   RUN names the run (r1, r2): each run seeds its own scratch contexts (state k3-state-<RUN>-<app>.json), writes its
//   facts to k3-<RUN>-facts-<app>.json and its snapshots as <RUN>-<name>-<app>.json/png. A full OMP run outlasts the
//   Bash cap: launch it detached (nohup … &).
//
// Scratch presses (OMP), users <p>mg (manager), <p>au (author "Ada Author"), <p>rd (reader):
//   A  a new press (no currency, chart off). a1 single-author book: formats PDF, EPUB (both held by chapter "Tides"),
//      Print, Sale (Direct Sales 25), Empty (no file); chapters Tides (page, subtitle, two files, seeded EPUB first),
//      Harbours (unticked), Coda (no authors). a2 two contributors: Tides (Ada, page, holds PDF), Harbours (Lee,
//      holds EPUB), Both (Ada, Lee). a3 td12: Paperback (physical, ISBN-13, date 01, 130 x 200) + PDF; then Paperback
//      and PDF set "Awaiting Approval" on screen. a4 one format Hardback (physical, three sizes, YYYYMMDD date).
//   Q  USD + Manual Fee Payment. q1: Online (remote), PDF, Sale (25.00), Two (a second file uploaded on screen at
//      Direct Sales 25, td11), Hidden (file "Not Available" on screen), Blank (no file; one uploaded on screen with
//      no terms), Off (format "Not Available" on screen), ChapSale (10, held by chapter Priced). Then Online and PDF
//      set "Awaiting Approval". q2: URL Path, Edited Volume, Lee; format URL Path "pdf" on screen, a new version with
//      Lee unticked from lists, "Volume Editor" ticked, a cover, published (11c older version; Setting 14).
//   D  DOIs for monographs, chapters, formats: d1 with Tides (page) and Harbours (unticked).
//   U  URN plugin for formats: u1, a format "Local" built, approved (URN) and made available on screen.
//   S  displayStats bar: s1 no downloads (td19), chapter page; s2 published 2025-06-01 with visits 2025-07-10 and 20 days ago.
//   L  displayStats line: l1 visits to a "Book Manuscript" file and an "Appendix" file.
//   N  a new press: Settings › Website › Appearance › Theme driven on screen (left unsaved once, then "bar" saved).
//   q3 (Q, made by the lists phase): a monograph whose second contributor is unticked from lists on a new version.
//   A5 (license phase): published after the press license is saved on screen. I (pubid phase): Publisher ID for formats.
//   reorder: a1's PDF approval revoked and given back (formats all carry seq 0: the order can move).
// OJS / OPS: C displayStats bar with a published item without downloads and one with downloads (read only).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,read,screens,after,versions,lists,theme,control').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k3-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const PDF2 = fx('omp', 'replacement.pdf');

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u69k3');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${p}rd`, roles: ['reader'], givenName: 'Rae', familyName: 'Reader'},
        ];
        const ctx = async (k, spec) => {
            const p = `${t}${k.toLowerCase()}`;
            const c = await app.api.createContext({tag: p, context: {name: {en: `K3 ${k} ${t}`}}, users: people(p), ...spec});
            S[k] = {path: c.path || p, mg: `${p}mg`, au: `${p}au`, rd: `${p}rd`, lee: `${p}lee@mail.test`, subs: {}};
        };
        const sub = async (k, s, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${S[k].path}${s}`, context: S[k].path, submitter: S[k].au, title: `K3 ${k}${s} book`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null, chapters: r.chapters || null, galleys: r.galleys || null};
        };
        if (isOMP) {
            const f = (name, file, extra = {}) => (file ? {name, file, genre: 'Book Manuscript', ...extra} : {name, ...extra});
            const paperback = {name: 'Paperback', physical: true, identificationCodes: [{type: 'ISBN-13 (15)', value: '9780000000002'}],
                publicationDates: [{role: 'Publication date (01)', date: '20240305'}],
                metadata: {productComposition: 'Single-component retail product (00)', width: '130', height: '200'}};
            await ctx('A', {});
            const A = S.A;
            await sub('A', '1', {published: true,
                publicationFormats: [f('PDF', 'article.pdf'), f('EPUB', 'replacement.pdf'), f('Print', 'article.pdf'), f('Sale', 'article.pdf', {price: '25'}), f('Empty')],
                chapters: [
                    {title: 'Tides', subtitle: 'Low and high', authors: [A.au], page: true, files: ['publicationFormats.1', 'publicationFormats.0']},
                    {title: 'Harbours', authors: [A.au]},
                    {title: 'Coda'},
                ]});
            await sub('A', '2', {published: true, contributors: [{givenName: 'Lee', familyName: 'Second', email: A.lee}],
                publicationFormats: [f('PDF', 'article.pdf'), f('EPUB', 'replacement.pdf')],
                chapters: [
                    {title: 'Tides', authors: [A.au], page: true, files: ['publicationFormats.0']},
                    {title: 'Harbours', authors: [A.lee], files: ['publicationFormats.1']},
                    {title: 'Both', authors: [A.au, A.lee]},
                ]});
            await sub('A', '3', {published: true, publicationFormats: [paperback, f('PDF', 'article.pdf')]});
            await sub('A', '4', {published: true, publicationFormats: [{name: 'Hardback', physical: true,
                identificationCodes: [{type: 'ISBN-13 (15)', value: '9780000000019'}],
                publicationDates: [{role: 'Publication date (01)', date: '20240305', dateFormat: 'YYYYMMDD'}],
                metadata: {productComposition: 'Single-component retail product (00)', width: '150', height: '230', thickness: '20'}}]});

            await ctx('Q', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.'}});
            const Q = S.Q;
            await sub('Q', '1', {published: true,
                publicationFormats: [{name: 'Online', urlRemote: 'https://example.org/u69k3-online'}, f('PDF', 'article.pdf'), f('Sale', 'article.pdf', {price: '25.00'}),
                    f('Two', 'article.pdf'), f('Hidden', 'article.pdf'), f('Blank'), f('Off', 'article.pdf'), f('ChapSale', 'replacement.pdf', {price: '10'})],
                chapters: [{title: 'Priced', authors: [Q.au], files: ['publicationFormats.7']}]});
            await sub('Q', '2', {published: true, workType: 'editedVolume', urlPath: `${t}book`, contributors: [{givenName: 'Lee', familyName: 'Second', email: Q.lee}],
                publicationFormats: [f('PDF', 'article.pdf'), f('ChapPDF', 'replacement.pdf')],
                chapters: [{title: 'Tides', authors: [Q.au], page: true, files: ['publicationFormats.1']}]});

            await ctx('D', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter', 'representation']});
            await sub('D', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf')],
                chapters: [{title: 'Tides', authors: [S.D.au], page: true}, {title: 'Harbours', authors: [S.D.au]}]});

            await ctx('U', {plugins: {urnpubidplugin: {enabled: true, settings: {urnPrefix: 'urn:nbn:de:0000-', urnResolver: 'https://nbn-resolving.de/',
                urnNamespace: 'urn:nbn:de', urnCheckNo: false, urnSuffix: 'default', enableRepresentationURN: true}}}});
            await sub('U', '1', {published: true});

            await ctx('S', {themeOptions: {displayStats: 'bar'}});
            await sub('S', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf')],
                chapters: [{title: 'Tides', authors: [S.S.au], page: true, files: []}]});
            await sub('S', '2', {published: true, datePublished: '2025-06-01', publicationFormats: [f('PDF', 'article.pdf')],
                usage: [{date: '2025-07-10', fileViews: [3]}, {daysAgo: 20, fileViews: [2]}]});
            await ctx('L', {themeOptions: {displayStats: 'line'}});
            await sub('L', '1', {published: true, datePublished: '2026-07-01', publicationFormats: [f('PDF', 'article.pdf'), {name: 'App', file: 'notes.md'}],
                usage: [{daysAgo: 30, fileViews: [2, 5]}, {daysAgo: 5, fileViews: [1, 0]}]});
            await ctx('N', {});
            await sub('N', '1', {published: true, publicationFormats: [f('PDF', 'article.pdf')]});
        } else {
            const isOJS = app.name === 'ojs';
            const sec = isOJS ? {abbrev: 'ART', title: 'Articles'} : {abbrev: 'PRE', title: 'Preprints'};
            const body = {sections: [sec], themeOptions: {displayStats: 'bar'}};
            if (isOJS) body.issues = [{volume: 1, number: '1', year: 2025, published: true}];
            await ctx('C', body);
            const place = {section: sec.abbrev, ...(isOJS ? {issue: {volume: 1, number: '1', year: 2025}} : {})};
            const gal = [{label: 'PDF', locale: 'en', file: isOJS ? 'article.pdf' : 'preprint.pdf'}];
            await sub('C', '1', {published: true, galleys: gal, ...place});
            await sub('C', '2', {published: true, datePublished: '2026-07-01', galleys: gal, ...place, usage: [{daysAgo: 30, fileViews: [2]}, {daysAgo: 5, fileViews: [1]}]});
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 3000));
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    const jsDialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
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
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|catalog\/(view|download)/.test(u)) return;
        if (m === 'GET' && !/fetch-row|fetch-category|set-approved|set-available|catalog\//.test(u)) return;
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
    const visitor = async () => { if (who !== null) { await signOut(page).catch(() => {}); } who = null; };

    // =============================================================== the reader's page as data
    async function pageData() {
        return page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const A = (a) => ({text: f(a.textContent), href: a.getAttribute('href'), target: a.getAttribute('target'), cls: a.className || null});
            const root = document.querySelector('.obj_monograph_full') || document.querySelector('.page_chapter, .obj_chapter') || document.body;
            const toc = [...root.querySelectorAll('.item.chapters > ul > li')].map((li) => {
                const title = li.querySelector('.title');
                const titleLink = title ? title.closest('a') : null;
                const authors = li.querySelector('.authors');
                const doi = li.querySelector('.doi');
                return {
                    title: title ? f([...title.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')) : null,
                    subtitle: title && title.querySelector('.subtitle') ? f(title.querySelector('.subtitle').textContent) : null,
                    titleLink: titleLink ? titleLink.getAttribute('href') : null,
                    authors: authors ? {text: f(authors.textContent), visible: vis(authors)} : null,
                    doi: doi ? {text: f(doi.textContent), links: [...doi.querySelectorAll('a')].map(A)} : null,
                    files: [...li.querySelectorAll('.files a')].map(A),
                    text: f(li.innerText),
                };
            });
            const filesBox = root.querySelector('.entry_details .item.files') || root.querySelector('.item.files');
            const side = filesBox ? {
                srHeading: f(filesBox.querySelector('h2')?.textContent),
                text: f(filesBox.innerText),
                formats: [...filesBox.querySelectorAll(':scope > div[class^="pub_format_"], :scope > div[class*=" pub_format_"]')].map((d) => ({
                    cls: d.className, label: f(d.querySelector(':scope > .label')?.textContent) || null,
                    names: [...d.querySelectorAll('.name')].map((n) => f(n.textContent)), links: [...d.querySelectorAll('a')].map(A), text: f(d.innerText)})),
            } : null;
            const details = [...root.querySelectorAll('.item.publication_format')].map((b) => ({
                srHeading: f(b.querySelector('h2.pkp_screen_reader')?.textContent),
                srHeadingVisible: vis(b.querySelector('h2.pkp_screen_reader')),
                visibleHeading: b.querySelector('.item_heading') ? f(b.querySelector('.item_heading').innerText) : null,
                subItems: [...b.querySelectorAll(':scope > .sub_item:not(.item_heading)')].map((s) => ({label: f(s.querySelector('.label')?.innerText), value: f(s.querySelector('.value')?.innerText), links: [...s.querySelectorAll('a')].map(A), text: f(s.innerText)})),
                text: f(b.innerText),
            }));
            const chart = root.querySelector('.item.downloads_chart') || document.querySelector('.item.downloads_chart, .downloads_chart');
            let chartData = null;
            try {
                if (typeof pkpUsageStats !== 'undefined') {
                    const charts = pkpUsageStats.charts || {};
                    chartData = {config: pkpUsageStats.config || null, data: pkpUsageStats.data || null,
                        charts: Object.fromEntries(Object.entries(charts).map(([k, c]) => [k, {type: c.config.type, labels: c.data.labels, data: c.data.datasets.map((d) => d.data)}]))};
                }
            } catch (e) { chartData = {error: String(e.message)}; }
            const ch = chart ? {
                heading: f(chart.querySelector('h2')?.textContent), canvas: chart.querySelectorAll('canvas').length,
                canvasVisible: vis(chart.querySelector('canvas')), canvasSize: chart.querySelector('canvas') ? [chart.querySelector('canvas').width, chart.querySelector('canvas').height] : null,
                notice: chart.querySelector('.usageStatsUnavailable') ? {text: f(chart.querySelector('.usageStatsUnavailable').textContent), visible: vis(chart.querySelector('.usageStatsUnavailable'))} : null,
                buttons: [...chart.querySelectorAll('button, a')].map((b) => f(b.textContent)), text: f(chart.innerText),
            } : null;
            const cover = root.querySelector('.item.cover img');
            const authorsItem = root.querySelector('.item.authors, .item.editors');
            return {
                url: location.href, title: document.title, h1: f(root.querySelector('h1')?.textContent),
                authorsBlock: authorsItem ? f(authorsItem.innerText) : null,
                toc, side, details, chart: ch, chartData,
                cover: cover ? {src: cover.getAttribute('src'), naturalWidth: cover.naturalWidth, naturalHeight: cover.naturalHeight, alt: cover.getAttribute('alt')} : null,
                entryDetails: f((root.querySelector('.entry_details') || {}).innerText).slice(0, 2500),
                main: f((root.querySelector('.main_entry') || root).innerText).slice(0, 2500),
            };
        });
    }
    async function bookPage(ctx, idOrPath, name, {suffix = ''} = {}) {
        const t0 = Date.now();
        const resp = await page.goto(cUrl(ctx, `/catalog/book/${idOrPath}${suffix}`));
        await idle(page);
        await page.waitForFunction(() => document.readyState === 'complete', null, {timeout: 10000}).catch(() => {});
        await sleep(600);
        const data = await pageData().catch((e) => ({error: String(e.message)}));
        await snap(name, {book: data, status: resp ? resp.status() : null});
        log(`[${name}]`, JSON.stringify({status: resp && resp.status(), toc: data.toc, side: data.side && data.side.formats, details: data.details && data.details.map((d) => d.text), chart: data.chart}).slice(0, 2500));
        return {status: resp ? resp.status() : null, responses: postsSince(t0), ...data};
    }
    // Follow each file link of the page as a reader would (the link's own address), record where it lands.
    async function follow(links, name) {
        const out = [];
        for (const l of links) {
            if (!l.href || /^https?:\/\/(doi\.org|example\.org|nbn)/.test(l.href) || l.target === '_blank') continue;
            const t0 = Date.now();
            let dl = null;
            const dlp = page.waitForEvent('download', {timeout: 8000}).then((d) => ({file: d.suggestedFilename()})).catch(() => null);
            const resp = await page.goto(l.href).catch((e) => ({err: flat(e.message, 160)}));
            dl = await dlp;
            await idle(page).catch(() => {});
            await sleep(500);
            out.push({text: l.text, href: l.href, status: resp && resp.status ? resp.status() : resp, landed: page.url(), title: await page.title().catch(() => null),
                download: dl, body: flat(await page.locator('body').innerText().catch(() => ''), 300), responses: postsSince(t0)});
        }
        if (out.length) await snap(name, {followed: out});
        return out;
    }
    // A remote link: pressed, the new tab's address recorded.
    async function pressRemote(text, name) {
        const a = page.locator('.item.files a.remote_resource').filter({hasText: text}).first();
        if (!(await a.count())) return {present: false};
        const pop = page.context().waitForEvent('page', {timeout: 10000}).catch(() => null);
        await a.click().catch(() => {});
        const p2 = await pop;
        let url = null;
        if (p2) { await p2.waitForLoadState('domcontentloaded', {timeout: 8000}).catch(() => {}); url = p2.url(); await p2.close().catch(() => {}); }
        const r = {present: true, newTab: !!p2, newTabUrl: url, pageStayed: page.url()};
        await snap(name, {remote: r});
        return r;
    }

    // =============================================================== the workflow (from U73 K4's helpers)
    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    const winCount = () => page.locator(vis).count();
    async function openWf(ctx, id, key) {
        await page.goto(wfUrl(ctx, id, key));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
    }
    async function formatsPage(k, s, {name, pub} = {}) {
        const sub = S[k].subs[s];
        await openWf(S[k].path, sub.id, `publication_${pub || sub.pub}_publicationFormats`);
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
            if (!g) return {present: false, text: f(d.innerText).slice(0, 800)};
            const rows = [...g.querySelectorAll('tbody tr.gridRow')].filter(v).map((tr) => ({
                kind: tr.querySelector('.onix_code') ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other',
                cells: [...tr.children].map((c) => f(tc(c)))}));
            return {present: true, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}`);
    const cat = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${label}`)})}).first();
    const formatRow = (label) => cat(label).locator('tr.gridRow').first();
    const fileRowByName = (label, fileName) => cat(label).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: fileName}).first();
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
            const fields = [...d.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].filter(v).map((e) => {
                const lbl = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
                return {name: e.name, type: e.type, value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value, label: lbl ? f(lbl.textContent) : f(e.closest('label')?.textContent)};
            });
            const buttons = [...d.querySelectorAll('button, a.pkp_button, input[type=submit], form a')].filter(v).map((b) => f(b.textContent || b.value || b.getAttribute('aria-label'))).filter(Boolean);
            return {title, fields, buttons, text: f(d.innerText).slice(0, 2000)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
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
        answer = ans;
        await top().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
        await sleep(1200); await idle(page);
        answer = 'dismiss';
    }
    async function addFormat(name) {
        await grid().getByRole('link', {name: 'Add publication format'}).first().click();
        await waitForm();
        await top().locator('input[name^="name"]:visible').first().fill(name);
        return pressOK();
    }
    async function editFormat(label) {
        await rowArrow(formatRow(label), 'Edit');
        await waitForm();
        return winInfo();
    }
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function changeFile(label, file) {
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
    // A status link in a row › its window › a button, then the row at once and after a reload.
    async function statusStep(k, s, row, linkText, name, {press = 'OK', before} = {}) {
        const t0 = Date.now();
        const a = row().getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
        const w = await winInfo();
        await snap(name, {win: w});
        if (before) await before();
        const out = {win: {title: w.title, text: flat(w.text, 600), fields: w.fields}};
        const b = top().getByRole('button', {name: press, exact: true}).or(top().getByRole('link', {name: press, exact: true})).last();
        await b.click().catch((e) => { out.pressErr = flat(e.message, 200); });
        await sleep(1500); await idle(page); await sleep(400);
        out.windowsAfter = await winCount();
        out.notices = noticesSince(t0);
        out.posts = postsSince(t0);
        out.rowAtOnce = await rowCells(row());
        await formatsPage(k, s);
        out.rowAfterReload = await rowCells(row());
        return out;
    }
    const termsForm = () => page.locator('form#approvedProofForm:visible').last();
    async function setTerms(k, s, fmt, fileName, name, salesType, price) {
        const row = () => fileRowByName(fmt, fileName);
        const link = /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/;
        const linkEl = row().locator('a').filter({hasText: link}).first();
        const linkText = flat(await linkEl.textContent().catch(() => null), 40);
        return statusStep(k, s, row, linkText, name, {press: 'Save', before: async () => {
            await termsForm().waitFor({timeout: 20000}).catch(() => {});
            await termsForm().locator(`input[type=radio][value="${salesType}"]`).click();
            await sleep(300);
            if (price) {
                const p = termsForm().locator('input[id^="price"]').first();
                await p.fill('');
                await p.pressSequentially(price, {delay: 30});
                await p.blur().catch(() => {});
                await sleep(300);
            }
        }}).then((r) => ({linkBefore: linkText, ...r}));
    }
    async function publishVersion(ctx, id, pub, name) {
        await openWf(ctx, id, `publication_${pub}_titleAbstract`);
        await page.getByRole('button', {name: 'Publish', exact: true}).click();
        const modal = page.getByRole('dialog', {name: /Schedule For Publication|Publish/}).last();
        await modal.waitFor({timeout: T});
        const text = flat(await modal.innerText(), 400);
        const done = page.waitForResponse((r) => /\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await modal.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await done;
        await idle(page); await sleep(800);
        await snap(name);
        return {text, status: r ? r.status() : null};
    }
    const allLinks = (b) => [...(b.side ? b.side.formats.flatMap((x) => x.links) : []), ...(b.toc || []).flatMap((c) => c.files)];

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- read: the seeded pages as a visitor (Rules 10–12, 20; A6)
        if (isOMP && on('read')) {
            await visitor();
            const R = {};
            R.a1 = await safe('a1', () => bookPage(S.A.path, S.A.subs['1'].id, 'r-a1-visitor'));
            R.a1follow = await safe('a1f', () => follow(allLinks(R.a1), 'r-a1-followed'));
            R.a1chapter = await safe('a1c', async () => { const l = (R.a1.toc || []).find((c) => c.titleLink); if (!l) return null; const r = await page.goto(l.titleLink); await idle(page); const d = await pageData(); await snap('r-a1-chapter-tides', {book: d}); return {status: r && r.status(), url: page.url(), chart: d.chart, side: d.side}; });
            R.a2 = await safe('a2', () => bookPage(S.A.path, S.A.subs['2'].id, 'r-a2-visitor'));
            R.a3 = await safe('a3', () => bookPage(S.A.path, S.A.subs['3'].id, 'r-a3-visitor'));
            R.a4 = await safe('a4', () => bookPage(S.A.path, S.A.subs['4'].id, 'r-a4-visitor'));
            R.q1 = await safe('q1', () => bookPage(S.Q.path, S.Q.subs['1'].id, 'r-q1-visitor-seeded'));
            R.q1remote = await safe('q1r', () => pressRemote('Online', 'r-q1-remote-pressed'));
            R.q1follow = await safe('q1f', () => follow(allLinks(R.q1), 'r-q1-followed'));
            R.q2 = await safe('q2', () => bookPage(S.Q.path, `${S.t}book`, 'r-q2-visitor-urlpath'));
            R.q2num = await safe('q2n', () => bookPage(S.Q.path, S.Q.subs['2'].id, 'r-q2-visitor-number'));
            R.d1 = await safe('d1', () => bookPage(S.D.path, S.D.subs['1'].id, 'r-d1-visitor'));
            R.s1 = await safe('s1', () => bookPage(S.S.path, S.S.subs['1'].id, 'r-s1-visitor-bar-nodownloads'));
            R.s1chapter = await safe('s1c', async () => { const l = (R.s1.toc || []).find((c) => c.titleLink); if (!l) return {noLink: true}; const r = await page.goto(l.titleLink); await idle(page); await sleep(600); const d = await pageData(); await snap('r-s1-chapter-page', {book: d}); return {status: r && r.status(), url: page.url(), chart: d.chart, hasCanvas: await page.locator('canvas').count(), downloadsText: await page.getByText('Downloads', {exact: true}).count()}; });
            R.s2 = await safe('s2', () => bookPage(S.S.path, S.S.subs['2'].id, 'r-s2-visitor-bar-history'));
            R.s2toggle = await safe('s2t', async () => {
                const b = page.locator('.item.downloads_chart button, .item.downloads_chart a').first();
                if (!(await b.count())) return {toggle: false};
                const before = flat(await b.textContent());
                await b.click(); await sleep(800);
                const d = await pageData();
                await snap('r-s2-toggle-pressed', {book: d});
                const after = flat(await b.textContent().catch(() => null));
                await b.click().catch(() => {}); await sleep(800);
                const d2 = await pageData();
                return {before, after, afterAgain: flat(await b.textContent().catch(() => null)), charts: d.chartData && d.chartData.charts, chartsAgain: d2.chartData && d2.chartData.charts};
            });
            R.l1 = await safe('l1', () => bookPage(S.L.path, S.L.subs['1'].id, 'r-l1-visitor-line'));
            R.n1 = await safe('n1', () => bookPage(S.N.path, S.N.subs['1'].id, 'r-n1-visitor-default'));
            // signed in: a reader and the manager on the same pages (the sweep's second and third levels)
            await as(S.Q.rd, S.Q.path);
            R.q1reader = await safe('q1rd', () => bookPage(S.Q.path, S.Q.subs['1'].id, 'r-q1-reader-seeded'));
            await as(S.Q.mg, S.Q.path);
            R.q1manager = await safe('q1mg', () => bookPage(S.Q.path, S.Q.subs['1'].id, 'r-q1-manager-seeded'));
            await as(S.S.mg, S.S.path);
            R.s1manager = await safe('s1mg', () => bookPage(S.S.path, S.S.subs['1'].id, 'r-s1-manager'));
            await visitor();
            const strip = (b) => (b && !b.error ? {status: b.status, toc: b.toc, side: b.side, details: b.details, chart: b.chart, chartData: b.chartData, authorsBlock: b.authorsBlock, cover: b.cover, responses: b.responses} : b);
            for (const [k, v] of Object.entries(R)) fact(`read-${k}`, /^(a|q|d|s|l|n)\d(reader|manager|num)?$/.test(k) ? strip(v) : v);
        }

        // ---------------------------------------------------------------- screens: the changes a manager makes on screen
        if (isOMP && on('screens')) {
            const Q = S.Q;
            const o = {};
            await as(Q.mg, Q.path);
            o.q1before = rowsBrief(await formatsPage('Q', '1', {name: 's-q1-formats-before'}));
            // td11: "Two" gets a second file, set "Direct Sales" 25
            o.twoUpload = await safe('two-up', async () => { await formatsPage('Q', '1'); return changeFile('Two', PDF2); });
            await formatsPage('Q', '1');
            o.twoTerms = await safe('two-terms', () => setTerms('Q', '1', 'Two', 'replacement.pdf', 's-q1-two-terms', 'directSales', '25'));
            // Hidden: its file "Not Available"
            o.hiddenTerms = await safe('hidden', () => setTerms('Q', '1', 'Hidden', 'article.pdf', 's-q1-hidden-terms', 'notAvailable'));
            // Blank: a file with no terms
            o.blankUpload = await safe('blank', async () => { await formatsPage('Q', '1'); return changeFile('Blank', PDF2); });
            // Off: the format "Not Available"
            o.off = await safe('off', async () => { await formatsPage('Q', '1'); return statusStep('Q', '1', () => formatRow('Off'), 'Available', 's-q1-off-unavailable'); });
            o.q1after = rowsBrief(await formatsPage('Q', '1', {name: 's-q1-formats-after'}));
            fact('screens-q1', o);

            // td12 part 2: a3's Paperback, then its PDF, "Awaiting Approval"
            const A = S.A;
            const a = {};
            await as(A.mg, A.path);
            a.before = rowsBrief(await formatsPage('A', '3', {name: 's-a3-formats-before'}));
            a.paperback = await safe('pb', () => statusStep('A', '3', () => formatRow('Paperback'), 'Approved', 's-a3-paperback-revoke'));
            await visitor();
            a.bookPbRevoked = await safe('a3r', () => bookPage(A.path, A.subs['3'].id, 's-a3-visitor-paperback-awaiting'));
            await as(A.mg, A.path);
            await formatsPage('A', '3');
            a.pdf = await safe('pdf', () => statusStep('A', '3', () => formatRow('PDF'), 'Approved', 's-a3-pdf-revoke'));
            a.after = rowsBrief(await formatsPage('A', '3', {name: 's-a3-formats-after'}));
            await visitor();
            a.bookBothRevoked = await safe('a3r2', () => bookPage(A.path, A.subs['3'].id, 's-a3-visitor-both-awaiting'));
            fact('screens-a3', {...a, bookPbRevoked: a.bookPbRevoked && {side: a.bookPbRevoked.side, details: a.bookPbRevoked.details}, bookBothRevoked: a.bookBothRevoked && {side: a.bookBothRevoked.side, details: a.bookBothRevoked.details}});

            // URN: a format built, approved (with the URN box) and made available on the published version
            const U = S.U;
            const u = {};
            await as(U.mg, U.path);
            await formatsPage('U', '1', {name: 's-u1-formats-empty'});
            if (!(await cat('Local').count())) u.add = await safe('u-add', () => addFormat('Local'));
            await formatsPage('U', '1');
            if (!(await cat('Local').locator('a.pkp_linkaction_downloadFile').count())) u.upload = await safe('u-up', () => changeFile('Local', fx('omp', 'article.pdf')));
            await formatsPage('U', '1');
            u.terms = await safe('u-terms', () => setTerms('U', '1', 'Local', 'article.pdf', 's-u1-terms', 'openAccess'));
            u.approve = await safe('u-appr', () => statusStep('U', '1', () => formatRow('Local'), 'Awaiting Approval', 's-u1-approve'));
            u.avail = await safe('u-avail', () => statusStep('U', '1', () => formatRow('Local'), 'Not Available', 's-u1-available'));
            u.rows = rowsBrief(await formatsPage('U', '1', {name: 's-u1-formats-after'}));
            await visitor();
            u.book = await safe('u1', () => bookPage(U.path, U.subs['1'].id, 's-u1-visitor'));
            fact('screens-u1', {...u, book: u.book && {details: u.book.details, side: u.book.side}});
        }

        // ---------------------------------------------------------------- after: q1 as a visitor after the changes; then Online and PDF awaiting approval
        if (isOMP && on('after')) {
            const Q = S.Q;
            const o = {};
            await visitor();
            o.q1 = await safe('q1a', () => bookPage(Q.path, Q.subs['1'].id, 'a-q1-visitor-after'));
            o.q1follow = await safe('q1af', () => follow(allLinks(o.q1), 'a-q1-followed'));
            await as(Q.rd, Q.path);
            o.q1reader = await safe('q1ard', () => bookPage(Q.path, Q.subs['1'].id, 'a-q1-reader-after'));
            o.q1readerFollow = await safe('q1ardf', () => follow(allLinks(o.q1reader), 'a-q1-reader-followed'));
            await as(Q.mg, Q.path);
            await formatsPage('Q', '1');
            o.onlineRevoke = await safe('onl', () => statusStep('Q', '1', () => formatRow('Online'), 'Approved', 'a-q1-online-revoke'));
            o.pdfRevoke = await safe('pdfr', () => statusStep('Q', '1', () => formatRow('PDF'), 'Approved', 'a-q1-pdf-revoke'));
            o.rows = rowsBrief(await formatsPage('Q', '1', {name: 'a-q1-formats-revoked'}));
            await visitor();
            o.q1revoked = await safe('q1rv', () => bookPage(Q.path, Q.subs['1'].id, 'a-q1-visitor-revoked'));
            const strip = (b) => (b && !b.error ? {status: b.status, toc: b.toc, side: b.side, details: b.details, responses: b.responses} : b);
            fact('after', {...o, q1: strip(o.q1), q1reader: strip(o.q1reader), q1revoked: strip(o.q1revoked)});
        }

        // ---------------------------------------------------------------- versions: 11c on an older version; Setting 14 (Volume Editor, cover)
        if (isOMP && on('versions')) {
            const Q = S.Q;
            const q2 = Q.subs['2'];
            const o = {};
            const {createNewVersion} = require(path.join(REPO, 'apps/omp/playwright/pages/PublicationPages.js'));
            const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
            await as(Q.mg, Q.path);
            if (!q2.v2) {
                o.v2 = await safe('newver', async () => { await openWf(Q.path, q2.id, `publication_${q2.pub}_titleAbstract`); return createNewVersion(page); });
                if (o.v2 && !o.v2.error) {
                    q2.v2 = o.v2; save();
                    o.contrib = await safe('contrib', async () => {
                        await openWf(Q.path, q2.id, `publication_${o.v2}_contributors`);
                        const c = new ContributorsScreen(page);
                        await page.locator('.contributorsListPanel').first().waitFor({timeout: T});
                        await idle(page);
                        const dlg = await c.openRowEdit('Lee Second');
                        await idle(page); await sleep(500);
                        const boxes = await dlg.getByRole('checkbox').evaluateAll((els) => els.map((b) => `${(b.closest('label')?.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()}=${b.checked}`));
                        const ve = dlg.getByRole('checkbox', {name: /Volume Editor/i}).first();
                        const hasVe = await ve.count();
                        if (hasVe) await ve.check();
                        await snap('v-q2-lee-edit', {boxes});
                        await c.savePanel(dlg);
                        await snap('v-q2-contributors-saved');
                        return {boxes, volumeEditorBox: hasVe};
                    });
                    o.cover = await safe('cover', async () => {
                        await openWf(Q.path, q2.id, `publication_${o.v2}_catalogEntry`);
                        const form = page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
                        await form.waitFor({timeout: T});
                        await form.locator('input[type="file"]').first().setInputFiles(fx('omp', 'profile-image-400.png'));
                        await sleep(2500); await idle(page);
                        const resp = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                        await form.getByRole('button', {name: 'Save', exact: true}).click();
                        const r = await resp;
                        await idle(page); await sleep(800);
                        await snap('v-q2-cover-saved');
                        return {status: r ? r.status() : null};
                    });
                    o.publish = await safe('publish', () => publishVersion(Q.path, q2.id, o.v2, 'v-q2-published'));
                }
            }
            // the format's URL Path on the current version (the older one keeps its number)
            const cur = q2.v2 || q2.pub;
            if (!q2.fpath) {
                o.urlPath = await safe('pdf-path', async () => {
                    await formatsPage('Q', '2', {pub: cur});
                    const w = await editFormat('PDF');
                    await top().locator('[name="urlPath"]').first().fill('pdf');
                    const r = await pressOK();
                    const g = await formatsPage('Q', '2', {pub: cur, name: 'v-q2-format-urlpath-saved'});
                    return {fields: (w.fields || []).map((x) => `${x.label || x.name}=${JSON.stringify(x.value)}`), windowsAfter: r.windowsAfter, notices: r.notices, rows: rowsBrief(g)};
                });
                if (o.urlPath && !o.urlPath.error) { q2.fpath = true; save(); }
            }
            await visitor();
            o.current = await safe('cur', () => bookPage(Q.path, `${S.t}book`, 'v-q2-visitor-current'));
            o.currentFollow = await safe('curf', () => follow(allLinks(o.current), 'v-q2-current-followed'));
            if (q2.v2) {
                o.older = await safe('old', () => bookPage(Q.path, `${S.t}book`, 'v-q2-visitor-v1', {suffix: `/version/${q2.pub}`}));
                o.olderFollow = await safe('oldf', () => follow(allLinks(o.older), 'v-q2-v1-followed'));
                const chap = async (u, name) => { const r = await page.goto(u); await idle(page); const d = await pageData(); await snap(name, {book: d}); return {status: r && r.status(), url: page.url(), h1: d.h1}; };
                o.olderChapter = await safe('oldc', async () => { const l = (o.older.toc || []).find((c) => c.titleLink); return l ? chap(l.titleLink, 'v-q2-v1-chapter') : null; });
                const chId = ((o.older.toc || []).find((c) => c.titleLink) || {titleLink: ''}).titleLink.split('/').pop();
                o.olderChapterByNumber = await safe('oldcn', () => chap(cUrl(Q.path, `/catalog/book/${q2.id}/version/${q2.pub}/chapter/${chId}`), 'v-q2-v1-chapter-by-number'));
                o.currentChapter = await safe('curc', async () => { const l = (o.current.toc || []).find((c) => c.titleLink); return l ? chap(l.titleLink, 'v-q2-current-chapter') : null; });
            }
            o.catalog = await safe('catalog', async () => {
                await page.goto(cUrl(Q.path, '/catalog')); await idle(page);
                const items = await page.locator('.obj_monograph_summary').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
                await snap('v-q2-catalog', {items});
                return items;
            });
            const strip = (b) => (b && !b.error ? {status: b.status, url: b.url, authorsBlock: b.authorsBlock, cover: b.cover, toc: b.toc, side: b.side, responses: b.responses} : b);
            fact('versions', {...o, current: strip(o.current), older: strip(o.older)});
        }

        // ---------------------------------------------------------------- lists: Setting 14's "Include this contributor…" tick on a monograph (q3)
        if (isOMP && on('lists')) {
            const Q = S.Q;
            const o = {};
            const {createNewVersion} = require(path.join(REPO, 'apps/omp/playwright/pages/PublicationPages.js'));
            const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
            if (!Q.subs['3']) {
                const r = await app.api.createSubmission({tag: `${Q.path}3`, context: Q.path, submitter: Q.au, title: `K3 Q3 book`, published: true,
                    contributors: [{givenName: 'Max', familyName: 'Third', email: `${Q.path}max@mail.test`}]});
                Q.subs['3'] = {id: r.submissionId, pub: r.publicationId};
                save();
            }
            const q3 = Q.subs['3'];
            await visitor();
            o.before = await safe('q3b', () => bookPage(Q.path, q3.id, 'l-q3-visitor-before'));
            if (!q3.v2) {
                await as(Q.mg, Q.path);
                o.v2 = await safe('q3v', async () => { await openWf(Q.path, q3.id, `publication_${q3.pub}_titleAbstract`); return createNewVersion(page); });
                if (o.v2 && !o.v2.error) {
                    q3.v2 = o.v2; save();
                    o.untick = await safe('q3u', async () => {
                        await openWf(Q.path, q3.id, `publication_${o.v2}_contributors`);
                        const c = new ContributorsScreen(page);
                        await page.locator('.contributorsListPanel').first().waitFor({timeout: T});
                        await idle(page);
                        const dlg = await c.openRowEdit('Max Third');
                        await idle(page); await sleep(500);
                        await c.publicationListsBox(dlg).uncheck();
                        await snap('l-q3-max-unticked');
                        await c.savePanel(dlg);
                        return true;
                    });
                    o.publish = await safe('q3p', () => publishVersion(Q.path, q3.id, o.v2, 'l-q3-published'));
                }
            }
            await visitor();
            o.after = await safe('q3a', () => bookPage(Q.path, q3.id, 'l-q3-visitor-after'));
            o.catalog = await safe('q3c', async () => {
                await page.goto(cUrl(Q.path, '/catalog')); await idle(page);
                const items = await page.locator('.obj_monograph_summary').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
                await snap('l-q3-catalog', {items});
                return items;
            });
            const strip = (b) => (b && !b.error ? {status: b.status, h1: b.h1, authorsBlock: b.authorsBlock, main: b.main && b.main.slice(0, 400)} : b);
            fact('lists', {...o, before: strip(o.before), after: strip(o.after)});
        }

        // ---------------------------------------------------------------- license: Setting 14's press license (A): a1 published before it, a5 after
        if (isOMP && on('license')) {
            const A = S.A;
            const o = {};
            if (!A.licSet) {
                await as(A.mg, A.path);
                o.save = await safe('lic', async () => {
                    await page.goto(cUrl(A.path, '/management/settings/distribution')); await idle(page);
                    const tab = page.getByRole('tab', {name: 'License', exact: true}).first();
                    if (await tab.count()) { await tab.click(); await idle(page); await sleep(900); }
                    const anchor = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
                    await anchor.waitFor({state: 'visible', timeout: T});
                    const holder = await page.locator('input[name="copyrightHolderType"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked})));
                    if (!holder.some((h) => h.checked)) await page.getByRole('radio', {name: 'Author', exact: true}).check().catch(() => {});
                    await anchor.check();
                    const form = page.locator('form').filter({has: anchor}).first();
                    const r = page.waitForResponse((x) => /\/api\/v1\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await form.getByRole('button', {name: 'Save', exact: true}).click();
                    const resp = await r;
                    await idle(page); await sleep(600);
                    await snap('lic-a-press-license-saved');
                    return {status: resp ? resp.status() : null};
                });
                A.licSet = true; save();
            }
            if (!A.subs['5']) {
                const r = await app.api.createSubmission({tag: `${A.path}5`, context: A.path, submitter: A.au, title: 'K3 A5 book', published: true,
                    chapters: [{title: 'Tides', authors: [A.au], page: true}]});
                A.subs['5'] = {id: r.submissionId, pub: r.publicationId};
                save();
            }
            await visitor();
            const lic = async (s, name) => {
                await bookPage(A.path, A.subs[s].id, name);
                return page.evaluate(() => [...document.querySelectorAll('.item.copyright, .item.license')].map((e) => `${e.className}: ${e.innerText.replace(/\s+/g, ' ').trim()}`));
            };
            o.a1 = await safe('lic-a1', () => lic('1', 'lic-a1-visitor'));
            o.a5 = await safe('lic-a5', () => lic('5', 'lic-a5-visitor'));
            fact('license', o);
        }

        // ---------------------------------------------------------------- reorder: a1's "PDF" approval revoked and given back; the grid's order and the table of contents
        if (isOMP && on('reorder')) {
            const A = S.A;
            const o = {};
            await as(A.mg, A.path);
            o.before = rowsBrief(await formatsPage('A', '1', {name: 'o-a1-formats-before'})).filter((r) => r.startsWith('format'));
            o.revoke = await safe('o-rev', () => statusStep('A', '1', () => formatRow('PDF'), 'Approved', 'o-a1-pdf-revoke'));
            o.approve = await safe('o-app', () => statusStep('A', '1', () => formatRow('PDF'), 'Awaiting Approval', 'o-a1-pdf-approve'));
            o.after = rowsBrief(await formatsPage('A', '1', {name: 'o-a1-formats-after'})).filter((r) => r.startsWith('format'));
            await visitor();
            const b = await safe('o-book', () => bookPage(A.path, A.subs['1'].id, 'o-a1-visitor-after'));
            o.toc = b && b.toc ? b.toc.map((c) => [c.title, c.files.map((x) => x.text)]) : b;
            o.side = b && b.side ? b.side.formats.map((x) => x.text) : null;
            fact('reorder', {...o, revoke: o.revoke && o.revoke.rowAfterReload, approve: o.approve && o.approve.rowAfterReload});
        }

        // ---------------------------------------------------------------- pubid: Setting 14's "Publisher ID" for formats (I), typed on the format's Identifiers tab
        if (isOMP && on('pubid')) {
            const o = {};
            if (!S.I) {
                const p = `${S.t}i`;
                const c = await app.api.createContext({tag: p, context: {name: {en: `K3 I ${S.t}`}}, enablePublisherId: ['representation'],
                    users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'}, {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'}]});
                S.I = {path: c.path || p, mg: `${p}mg`, au: `${p}au`, subs: {}};
                const r = await app.api.createSubmission({tag: `${S.I.path}1`, context: S.I.path, submitter: S.I.au, title: 'K3 I1 book', published: true,
                    publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]});
                S.I.subs['1'] = {id: r.submissionId, pub: r.publicationId};
                save();
            }
            const I = S.I;
            await as(I.mg, I.path);
            o.type = await safe('pid', async () => {
                await formatsPage('I', '1');
                const w = await editFormat('PDF');
                const tab = top().getByRole('tab', {name: 'Identifiers', exact: true});
                const tabs = await top().getByRole('tab').allInnerTexts().catch(() => []);
                if (!(await tab.count())) return {tabs, noTab: true};
                await tab.click(); await idle(page); await sleep(1200);
                const box = top().locator('#publicIdentifiersForm input[name="publisherId"]');
                await box.waitFor({timeout: T});
                await box.fill('pid-k3');
                await snap('p-i1-publisher-id-typed');
                const r = await pressOK('Save');
                await formatsPage('I', '1');
                await editFormat('PDF');
                await top().getByRole('tab', {name: 'Identifiers', exact: true}).click(); await idle(page); await sleep(1200);
                const back = await top().locator('#publicIdentifiersForm input[name="publisherId"]').inputValue().catch(() => null);
                await snap('p-i1-publisher-id-reopened');
                await closeArrow('accept');
                return {tabs, title: w.title, save: {windowsAfter: r.windowsAfter, notices: r.notices, posts: r.posts}, reopened: back};
            });
            await visitor();
            const b = await safe('pid-book', () => bookPage(I.path, I.subs['1'].id, 'p-i1-visitor'));
            o.book = b && {details: b.details, side: b.side && b.side.formats.map((x) => x.text)};
            o.pageHasId = await page.evaluate(() => document.body.innerText.includes('pid-k3') || document.documentElement.innerHTML.includes('pid-k3')).catch(() => null);
            fact('pubid', o);
        }

        // ---------------------------------------------------------------- theme: Setting 5 on screen (N), left unsaved once, then "bar"
        if (isOMP && on('theme')) {
            const Np = S.N;
            const o = {};
            const themePanel = () => page.locator('[role="tabpanel"]#theme').first();
            const openTheme = async () => {
                await page.goto(cUrl(Np.path, '/en/management/settings/website'));
                await idle(page);
                for (const id of ['appearance', 'theme']) {
                    const b = page.locator(`#${id}-button`).first();
                    await b.waitFor({timeout: T});
                    if ((await b.getAttribute('aria-selected')) !== 'true') { await b.click(); await idle(page); }
                }
                await themePanel().getByRole('radio').first().waitFor({timeout: T});
                await sleep(300);
            };
            const statsField = async () => themePanel().locator('.pkpFormField').filter({hasText: /Usage statistics display options/}).first().evaluate((f) => {
                const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                return {label: t(f.querySelector('legend, .pkpFormFieldLabel, label')), description: t(f.querySelector('.pkpFormField__description')),
                    options: [...f.querySelectorAll('input[type=radio]')].map((i) => ({value: i.value, checked: i.checked, label: t(i.closest('label'))}))};
            }).catch((e) => ({error: flat(e.message, 200)}));
            await as(Np.mg, Np.path);
            await openTheme();
            o.field0 = await statsField();
            await snap('t-n-theme-default', {field: o.field0});
            await loc(page, 'Appearance › Theme: "Usage statistics display options" field', themePanel().locator('.pkpFormField').filter({hasText: /Usage statistics display options/}).first());
            // left unsaved: "line" chosen, then another tab, then another page
            o.leave = await safe('leave', async () => {
                const t0 = Date.now();
                await themePanel().getByRole('radio', {name: /^Use line type/}).check();
                await page.locator('#setup-button').first().click().catch(() => {});
                await idle(page); await sleep(600);
                const tabSwitch = {dialogs: dialogsSince(t0), selectedTab: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => null)};
                await snap('t-n-theme-left-for-setup');
                await page.locator('#appearance-button').first().click().catch(() => {});
                await page.locator('#theme-button').first().click().catch(() => {});
                await idle(page); await sleep(400);
                const backField = await statsField();
                const t1 = Date.now();
                await page.goto(cUrl(Np.path, '/en/management/settings/press')).catch(() => {});
                await idle(page);
                const leavePage = {dialogs: dialogsSince(t1), url: page.url()};
                await openTheme();
                return {tabSwitch, backField, leavePage, reopened: await statsField()};
            });
            o.save = await safe('save-bar', async () => {
                await openTheme();
                await themePanel().getByRole('radio', {name: /^Use bar type/}).check();
                const t0 = Date.now();
                const w = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\//.test(r.url()), {timeout: T}).catch(() => null);
                await themePanel().getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await w;
                const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await idle(page);
                const same = await statsField();
                await snap('t-n-theme-bar-saved', {field: same});
                await openTheme();
                return {status: r ? r.status() : null, saved, samePage: same, afterReload: await statsField(), notices: noticesSince(t0)};
            });
            await visitor();
            o.book = await safe('n1', () => bookPage(Np.path, Np.subs['1'].id, 't-n1-visitor-bar'));
            fact('theme', {...o, book: o.book && {chart: o.book.chart, chartData: o.book.chartData}});
        }

        // ---------------------------------------------------------------- control (OJS, OPS): the item page's "Downloads" chart
        if (!isOMP && on('control')) {
            const C = S.C;
            const o = {};
            await visitor();
            const itemPath = (id) => (app.name === 'ojs' ? `/article/view/${id}` : `/preprint/view/${id}`);
            for (const s of ['1', '2']) {
                o[s] = await safe(`c${s}`, async () => {
                    await page.goto(cUrl(C.path, itemPath(C.subs[s].id)));
                    await idle(page); await sleep(800);
                    const d = await pageData();
                    await snap(`c-${s}-visitor`, {item: {chart: d.chart, chartData: d.chartData}});
                    return {chart: d.chart, chartData: d.chartData && {config: d.chartData.config, charts: d.chartData.charts, data: d.chartData.data}};
                });
            }
            fact('control', o);
        }
    } finally {
        await close();
    }
});
