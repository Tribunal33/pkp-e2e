// U20 claim check, chunk H13D (housekeeping 2026-10-13): incidentals row 17, a book file's view page
// (catalog/view/…) and its Dublin Core identifier tags. Spec: docs/specs/U20-search-engine-metadata-and-analytics.md,
// Rule 17 (and the "DC.Identifier.DOI" / "DC.Identifier.URN" rows of the Dublin Core table as they apply to a file's
// view page), register OMP3, OMP5; footnotes i, q19, f-omp3, f-omp5.
// The row: OMP DublinCoreMetaPlugin::monographFileView() reads
// `$submissionFile->getStoredPubId(…) ?? $chapter ? $chapter->getDoi() : $publication->getStoredPubId(…)` for every
// pub-ID plugin, which PHP groups as `(… ?? $chapter) ? … : …`. This walk stores file URNs and DOIs on screen and reads
// every file's view page.
//
// One run = a fresh dataset fleet + every phase (each run seeds its own scratch press):
//   npm run reset:omp -- --dataset 4
//   PKP_E2E_DATASET=4 PROBE_RUN=r1 PROBE_FEATURE=U20 PROBE_AGENT=ccH13D node bin/probe.js omp shared/playwright/checks/U20/H13D/h13d.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 in front of both; on main through bin/app-lock.sh shared omp -- …)
//   PHASES narrows (seed,base,viewersoff,doi,urn,urlpath); state in h13d-state-<run>-omp.json.
// Extra (on a finished run's state, no reset): STATE_RUN=r2 PROBE_RUN=r3 PHASES=extra: every tag of the chapter and view
//   pages, and the series' ISSN as "Print ISSN" alone, then put back. 3.5: BOOK=14 (the dataset's book; the kit's
//   submission seed answers 500 there), runs s1, s2, then STATE_RUN=s2 PHASES=extra s3, s4.
// Control (read-only): PHASES=control on ojs,ops: a typed catalog/view/… address on the dataset's journal / server.
//
// Scratch press (tag prefix u20h13d) with a manager <p>mg and an author <p>au, a series "Sea Series" (no ISSN). One
// book "Tidal Patterns" in it, published by the seed, formats: "PDF" (article.pdf, Book Manuscript, ISBN-13
// 9780306406157), "HTML" (article.html), "Notes" (notes.md), "Chapter PDF" (article.pdf, Chapter Manuscript) given to
// chapter 1 "Chapter One Tides" (own page, pages 5-9), "Chapter Two PDF" (article.pdf) given to chapter 2
// "Chapter Two Waves" (own page, no pages).
// Phases: seed (API) · base (signed out: every page and view page; each file link pressed on the book page and chapter
//   1's page; DC.Identifier.URI followed; as the manager, the viewer plugins' rows) · viewersoff (both viewer plugins
//   unticked, each link pressed, ticked again) · doi (Settings › Distribution › DOIs: prefix, the first kind; "Assign
//   DOIs"; read; "Chapters" ticked, assign, read; "Files" ticked, assign, read) · urn (URN plugin: "Publication
//   Formats", "Chapters", "Files"; chapter 1's URN; the "PDF" and "Chapter PDF" files' URNs (the second first left with
//   the box ticked and unsaved); read) · urlpath (series' Online ISSN; Catalog Entry URL Path "sea-study" (unpublish /
//   publish around it when the form is locked), the "PDF" format's URL Path "pdf"; read).
// No assertions: the script records, the report judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, serverLog, sql} = require('../../../probe');

const T = 30_000;
const PHASES = (process.env.PHASES || 'seed,base,viewersoff,doi,urn,urlpath').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const OMP_PAGES = '../../../../../apps/omp/playwright/pages/';

/** The tags in a page source's head the two indexing plugins write, in source order. */
function headTags(html) {
    const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
    const out = [];
    for (const m of head.matchAll(/<(meta|link)\b[^>]*>/gi)) {
        const raw = m[0];
        const attr = (n) => { const x = raw.match(new RegExp(`\\s${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return x ? (x[2] ?? x[3]) : null; };
        const name = attr('name'), rel = attr('rel');
        if (m[1].toLowerCase() === 'meta' && name && /^(citation_|gs_|DC\.)/i.test(name)) out.push(`${name}${attr('scheme') ? `{${attr('scheme')}}` : ''}=${attr('content')}`);
        if (m[1].toLowerCase() === 'link' && rel && /^schema\.DC$/i.test(rel)) out.push(`link:${rel}=${attr('href')}`);
    }
    return out;
}
const pick = (tags, re) => tags.filter((t) => re.test(t));
const idTags = (tags) => pick(tags, /^(DC\.Identifier|DC\.Type|DC\.Source\.ISSN|citation_doi|citation_isbn|citation_urn)/);

forEachApp(async (app) => {
    const log = (...a) => console.log(`[h13d ${app.name} ${app.line || 'main'} ${RUN}]`, ...a);
    const fact = (k, v) => { record('h13d-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 3000)); };
    const slog = serverLog(app);

    // ================================================================== control (OJS, OPS): no file view page
    if (app.name !== 'omp') {
        if (!on('control')) { log('skipped: Rule 17 is a press surface (PHASES=control for the read-only control)'); return; }
        const {page, close} = await launch(app);
        try {
            await signOut(page).catch(() => {});
            const out = {};
            for (const p of ['/catalog/view/1/1/1', '/catalog/book/1']) {
                const r = await page.goto(app.url(`/index.php/${app.contextPath}${p}`)).catch((e) => ({err: flat(e.message, 200)}));
                await idle(page).catch(() => {});
                const s = await screen(page);
                record(`control${p.replace(/\//g, '-')}`, s);
                out[p] = {status: r && r.status ? r.status() : r, landed: strip(page.url()), title: await page.title(), body: flat(s.text && (s.text.main || s.text.body), 200)};
            }
            fact('control', out);
        } finally { await close(); }
        return;
    }

    if (!app.dataset) throw new Error('h13d.js runs on a dataset fleet (PKP_E2E_DATASET=n), after npm run reset:omp -- --dataset n');
    const sf = path.join(outDir(), `h13d-state-${process.env.STATE_RUN || RUN}-${app.name}.json`);
    let S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const cu = (p = '') => app.url(`/index.php/${S.path}${p}`);

    // ================================================================== seed (API)
    if (on('seed') && !S.seeded && !process.env.BOOK) {
        const t = tag('u20h13d');
        const p = `${t}p`;
        S = {t, p};
        const ctx = await app.api.createContext({
            tag: p,
            context: {name: `U20 H13D ${t}`, acronym: 'H13D'},
            series: [{path: 'sea', title: 'Sea Series'}],
            users: [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ],
        });
        S.path = ctx.path; S.contextId = ctx.contextId;
        const r = await app.api.createSubmission({
            tag: `${t}b`, context: ctx.path, submitter: `${p}au`, title: 'Tidal Patterns', abstract: '<p>Tides follow the moon.</p>',
            published: true, series: 'sea',
            ...(app.line === 'stable-3_5_0' ? {} : {mediaFiles: [{file: 'figure.png'}]}), // 3.5's builder lacks the media key's class
            publicationFormats: [
                {name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript', identificationCodes: [{type: 'ISBN-13 (15)', value: '9780306406157'}]},
                {name: 'HTML', file: 'article.html', genre: 'Book Manuscript'},
                {name: 'Notes', file: 'notes.md'},
                {name: 'Chapter PDF', file: 'article.pdf', genre: 'Chapter Manuscript'},
                {name: 'Chapter Two PDF', file: 'article.pdf', genre: 'Chapter Manuscript'},
            ],
            chapters: [
                {title: 'Chapter One Tides', page: true, pages: '5-9', authors: [`${p}au`], files: ['publicationFormats.3']},
                {title: 'Chapter Two Waves', page: true, files: ['publicationFormats.4']},
            ],
        });
        S.sid = r.submissionId; S.pub = r.publicationId; S.formats = r.publicationFormats || null; S.chapters = r.chapters || null;
        S.seeded = true;
        save();
        fact('seed', S);
    }
    // BOOK=14: no seed; PKP's default test dataset's book 14 on publicknowledge, as its Press Manager rvaca (the 3.5 run:
    // the _test submission seed answers 500 there, "Unknown resource type 'plugins-2-plugins-pubIds-urn-pubIds-urn'").
    if (process.env.BOOK && !S.seeded) {
        S = {dataset: true, path: app.contextPath, sid: Number(process.env.BOOK), seeded: true, mgr: 'rvaca'};
        S.pub = Number(sql(app, `select current_publication_id from submissions where submission_id = ${S.sid}`));
        S.series = sql(app, `select setting_value from series_settings where setting_name = 'title' and locale = 'en' and series_id = (select series_id from publications where publication_id = ${S.pub})`);
        const ch = sql(app, `select c.chapter_id, s.setting_value from submission_chapters c join submission_chapter_settings s on s.chapter_id = c.chapter_id and s.setting_name = 'title' and s.locale = 'en' where c.publication_id = ${S.pub} order by c.seq limit 1`).split('|');
        const name = (id) => sql(app, `select setting_value from submission_file_settings where submission_file_id = ${id} and setting_name = 'name' and locale = 'en'`);
        const fmt = (id) => sql(app, `select s.setting_value from submission_files f join publication_format_settings s on s.publication_format_id = f.assoc_id and s.setting_name = 'name' and s.locale = 'en' where f.submission_file_id = ${id}`);
        const chapterFile = sql(app, `select f.submission_file_id from submission_files f join submission_file_settings s on s.submission_file_id = f.submission_file_id and s.setting_name = 'chapterId' where f.submission_id = ${S.sid} and f.assoc_type = 521 and s.setting_value = '${ch[0]}' limit 1`);
        const bookFile = sql(app, `select f.submission_file_id from submission_files f where f.submission_id = ${S.sid} and f.assoc_type = 521 and not exists (select 1 from submission_file_settings s where s.submission_file_id = f.submission_file_id and s.setting_name = 'chapterId') order by 1 limit 1`);
        S.urnItems = {chapter: ch[1], chapterFile: [fmt(chapterFile), name(chapterFile)], bookFile: [fmt(bookFile), name(bookFile)]};
        S.urlFormat = fmt(bookFile);
        save();
        fact('dataset-book', S);
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }
    S.mgr = S.mgr || `${S.p}mg`;
    S.series = S.series || 'Sea Series';
    S.urnItems = S.urnItems || {chapter: 'Chapter One Tides', chapterFile: ['Chapter PDF', 'article.pdf'], bookFile: ['PDF', 'article.pdf']};
    S.urlFormat = S.urlFormat || 'PDF';
    // Evidence only, not steps: the ids the reads name.
    S.ids = {
        formats: sql(app, `select pf.publication_format_id, (select setting_value from publication_format_settings s where s.publication_format_id = pf.publication_format_id and setting_name = 'name' and locale = 'en') from publication_formats pf where pf.publication_id = ${S.pub} order by 1`).split('\n'),
        files: sql(app, `select sf.submission_file_id, sf.assoc_id, (select setting_value from submission_file_settings x where x.submission_file_id = sf.submission_file_id and setting_name = 'chapterId') from submission_files sf where sf.submission_id = ${S.sid} and sf.assoc_type = 521 order by 1`).split('\n'),
        chapters: sql(app, `select chapter_id from submission_chapters where publication_id = ${S.pub} order by seq, chapter_id`).split('\n'),
    };
    save();

    const capp = {...app, contextPath: S.path};
    const {page, close} = await launch(app);
    const bad = [], pageErrors = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 200)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200), url: strip(page.url())}));
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = 0;
    async function snap(name, extra, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `h13d-${String(++snapN).padStart(2, '0')}-${name}`;
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
        fact(`${name}.crashes`, {server5xx: since(bad, t0).filter((r) => r.status >= 500), status4xx: since(bad, t0).filter((r) => r.status < 500 && !/article\.css|favicon/.test(r.url)), script: since(pageErrors, t0), serverLog: slog.since(from).map((l) => flat(l, 300)).slice(0, 30)});
    }
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r; };
    const as = async (u) => { await signIn(page, u, {contextPath: S.path}); await idle(page).catch(() => {}); };
    const visitor = async () => { await signOut(page).catch(() => {}); };

    /** Open an address; a page's own HTML is its source, a file is a download. */
    async function source(name, url, {png = false} = {}) {
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 6_000}).catch(() => null);
        const resp = await page.goto(url).catch((e) => ({err: flat(e.message, 160)}));
        const out = {asked: strip(url)};
        if (resp && resp.err) {
            const d = await dl;
            out.download = d ? {suggestedFilename: d.suggestedFilename(), url: strip(d.url())} : null;
            out.gotoError = resp.err;
        } else {
            let html = resp && resp.text ? await resp.text().catch(() => '') : '';
            await idle(page).catch(() => {});
            if (!html) { html = await page.content().catch(() => ''); out.sourceFromDom = true; }
            out.status = resp && resp.status ? resp.status() : null;
            out.landed = strip(page.url());
            out.title = await page.title().catch(() => null);
            out.tags = headTags(html);
            out.links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), href: a.getAttribute('href')})).filter((a) => /\/catalog\/(view|download|book)\//.test(a.href))).catch(() => []);
            out.links = out.links.map((l) => ({...l, href: strip(l.href)}));
            out.snap = await snap(name, {source: {...out, links: undefined}}, {png});
        }
        out.crashes = {server: since(bad, t0).filter((x) => x.status >= 500), script: since(pageErrors, t0)};
        return out;
    }
    const fileLinks = (o) => [...new Set((o.links || []).filter((l) => /\/catalog\/view\//.test(l.href)).map((l) => l.href))];

    /** Signed out: the book page, both chapter pages, every file link's view page; identifier tags of each. */
    async function readAll(label) {
        await visitor();
        const R = {label};
        const book = await source(`${label}-book`, cu(`/catalog/book/${S.urlPath || S.sid}`), {png: label === 'base'});
        R.book = {status: book.status, landed: book.landed, ids: idTags(book.tags || []), links: book.links, snap: book.snap};
        const chapterLinks = [...new Set((book.links || []).filter((l) => /\/chapter\//.test(l.href)).map((l) => l.href))];
        R.chapters = [];
        const views = new Map();
        for (const l of fileLinks(book)) views.set(l, 'book');
        for (const h of chapterLinks) {
            const c = await source(`${label}-chapter-${R.chapters.length + 1}`, app.url(h));
            R.chapters.push({asked: c.asked, status: c.status, title: c.title, ids: idTags(c.tags || []), links: fileLinks(c), snap: c.snap});
            for (const l of fileLinks(c)) if (!views.has(l)) views.set(l, c.asked);
        }
        R.views = [];
        let k = 0;
        for (const [h, from] of views) {
            const v = await source(`${label}-view-${++k}`, app.url(h), {png: label === 'base' && k === 1});
            R.views.push({link: h, from, linkText: ((book.links || []).find((l) => l.href === h) || {}).text, status: v.status, landed: v.landed, download: v.download, dcOnly: v.tags ? v.tags.every((x) => /^(DC\.|link:schema\.DC)/.test(x)) : null, tagCount: v.tags ? v.tags.length : null, ids: v.tags ? idTags(v.tags) : null, allTags: label === 'base' ? v.tags : undefined, crashes: v.crashes, snap: v.snap});
        }
        fact(`read.${label}`, R);
        return R;
    }

    // the view page's viewer, as S05 reads it
    async function readView() {
        await idle(page).catch(() => {});
        await sleep(2500);
        const fl = page.frameLocator('#pdfCanvasContainer > iframe');
        return {
            url: strip(page.url()), title: await page.title(),
            bar: flat(await page.locator('header.header_viewable_file').innerText({timeout: 2000}).catch(() => null), 200),
            returnHref: strip(await page.locator('header.header_viewable_file a.return').getAttribute('href', {timeout: 2000}).catch(() => null)),
            downloadHref: strip(await page.locator('header.header_viewable_file a.download').getAttribute('href', {timeout: 2000}).catch(() => null)),
            pdfFrame: await page.locator('#pdfCanvasContainer > iframe').count().catch(() => null),
            htmlFrame: await page.locator('#htmlContainer iframe, iframe').count().catch(() => null),
            renderedPages: await fl.locator('#viewer .page canvas').count().catch(() => null),
        };
    }
    /** Press a file link on a page: what opens (a view page or a download). */
    async function pressLink(name, pageUrl, linkHref) {
        await go(pageUrl);
        const t0 = Date.now();
        const link = page.locator(`a[href$="${strip(linkHref)}"]`).first();
        const out = {page: strip(pageUrl), link: strip(linkHref), linkText: flat(await link.innerText().catch(() => null), 80)};
        const dl = page.waitForEvent('download', {timeout: 8_000}).catch(() => null);
        const nav = page.waitForResponse((r) => r.request().isNavigationRequest() && r.frame() === page.mainFrame() && /\/catalog\/(view|download)\//.test(r.url()), {timeout: 10_000}).catch(() => null);
        await link.click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 160); });
        const [d, r] = await Promise.all([dl, nav]);
        out.navigation = r ? {url: strip(r.url()), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null} : null;
        if (d) out.download = {suggestedFilename: d.suggestedFilename(), url: strip(d.url())};
        await idle(page).catch(() => {});
        out.landed = strip(page.url());
        if (/\/catalog\/view\//.test(page.url())) {
            out.view = await readView();
            const html = r ? await r.text().catch(() => '') : '';
            out.viewIds = idTags(headTags(html));
            out.snap = await snap(`${name}-view`, {press: out});
        } else {
            out.title = await page.title().catch(() => null);
            out.snap = await snap(`${name}-after`, {press: out});
        }
        out.crashes = {server: since(bad, t0).filter((x) => x.status >= 500), script: since(pageErrors, t0)};
        return out;
    }

    // ------------------------------------------------------------------ manager steps
    async function doiSetup(kinds) {
        const {DoiSettings} = require('../../../pages/DoisPages.js');
        const settings = new DoiSettings(page, S.path);
        await settings.goto('Setup');
        const before = {enabled: await settings.enableBox().isChecked().catch(() => null), kinds: await settings.kinds(), prefix: await settings.prefixBox().inputValue().catch(() => null)};
        if (before.enabled === false) await settings.enableBox().check();
        await settings.prefixBox().fill('10.1234');
        for (const k of kinds) await settings.kindBox(k).check();
        const resp = await settings.pressSave(settings.setup);
        await settings.savedStatus(settings.setup).waitFor({timeout: 15_000}).catch(() => {});
        const n = await snap(`doi-setup-${kinds.join('+') || 'first'}`);
        return {before, ticked: kinds, status: resp.status(), body: resp.status() === 200 ? undefined : flat(await resp.text().catch(() => ''), 400), after: await settings.kinds(), snap: n};
    }
    async function assignDois(label) {
        const {DoisPage} = require('../../../pages/DoisPages.js');
        const dois = new DoisPage(page, S.path);
        await dois.goto();
        await dois.expectListSettled();
        const response = await dois.runBulk('Assign DOIs', [S.sid]);
        await dois.goto();
        await dois.expectListSettled();
        const row = dois.row(S.sid);
        await dois.expand(row, S.sid);
        const rows = [];
        for (const type of await dois.doiTypes(row)) rows.push({type, doi: await dois.doiBox(row, type).inputValue().catch(() => null)});
        const n = await snap(`dois-${label}`, null, {png: true});
        return {status: response.status(), rows, snap: n};
    }

    try {
        // ============================================================== base
        await sect('base', async () => {
            await as(S.mgr);
            const plugins = require('../../issues/doaj-tool-stays-on-plugins-list-when-off/lib');
            await plugins.openPlugins(capp, page);
            fact('base.viewer-plugins-new-press', {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin'), dc: await plugins.rowState(capp, page, 'dublincoremetaplugin'), urn: await plugins.rowState(capp, page, 'urnpubidplugin')});
            await snap('base-plugins');
            const R = await readAll('base');
            // each file link pressed on the book page and on chapter 1's page
            await visitor();
            const pressed = [];
            let j = 0;
            const bookUrl = cu(`/catalog/book/${S.sid}`);
            for (const h of fileLinks(R.book)) pressed.push({from: 'book', ...(await pressLink(`base-press-${++j}`, bookUrl, h))});
            if (R.chapters[0]) for (const h of R.chapters[0].links) pressed.push({from: 'chapter-1', ...(await pressLink(`base-press-${++j}`, app.url(R.chapters[0].asked), h))});
            fact('base.pressed', pressed);
            // DC.Identifier.URI followed (OMP5)
            const v = R.views.find((x) => x.ids && x.ids.some((t) => t.startsWith('DC.Identifier.URI=')));
            if (v) {
                const uri = v.ids.find((t) => t.startsWith('DC.Identifier.URI=')).replace(/^DC\.Identifier\.URI=/, '');
                const o = await source('base-dc-uri-followed', uri);
                fact('base.dc-uri-followed', {from: v.link, uri: strip(uri), status: o.status, landed: o.landed, title: o.title, ids: idTags(o.tags || []), snap: o.snap});
            }
            await loc(page, 'view page: the bar\'s return link', page.locator('header.header_viewable_file a.return'));
        });

        // ============================================================== viewersoff
        await sect('viewersoff', async () => {
            const plugins = require('../../issues/doaj-tool-stays-on-plugins-list-when-off/lib');
            const out = {};
            await as(S.mgr);
            await plugins.openPlugins(capp, page);
            out.untickPdf = await plugins.setEnabled(capp, page, 'pdfjsviewerplugin', false);
            out.untickHtml = await plugins.setEnabled(capp, page, 'htmlmonographfileplugin', false);
            await plugins.openPlugins(capp, page);
            out.after = {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin')};
            await snap('off-plugins-unticked');
            await visitor();
            try {
                const bookUrl = cu(`/catalog/book/${S.sid}`);
                const src = await source('off-book', bookUrl);
                out.pressed = [];
                let j = 0;
                for (const h of [...new Set((src.links || []).filter((l) => /\/catalog\/(view|download)\//.test(l.href)).map((l) => l.href))]) out.pressed.push(await pressLink(`off-${++j}`, bookUrl, h));
            } finally {
                await as(S.mgr);
                await plugins.openPlugins(capp, page);
                out.tickPdf = await plugins.setEnabled(capp, page, 'pdfjsviewerplugin', true);
                out.tickHtml = await plugins.setEnabled(capp, page, 'htmlmonographfileplugin', true);
                await plugins.openPlugins(capp, page);
                out.restored = {pdf: await plugins.rowState(capp, page, 'pdfjsviewerplugin'), html: await plugins.rowState(capp, page, 'htmlmonographfileplugin')};
                await visitor();
            }
            fact('viewersoff', out);
        });

        // ============================================================== doi
        await sect('doi', async () => {
            await as(S.mgr);
            fact('doi.0-setup', await doiSetup([]));
            fact('doi.0-assign', await assignDois('0'));
            await readAll('doi0');
            await as(S.mgr);
            fact('doi.1-setup', await doiSetup(['Chapters']));
            fact('doi.1-assign', await assignDois('1'));
            await readAll('doi1');
            await as(S.mgr);
            fact('doi.2-setup', await doiSetup(['Chapters', 'Files']));
            fact('doi.2-assign', await assignDois('2'));
            fact('doi.stored (evidence)', sql(app, `select 'file', sf.submission_file_id, d.doi from submission_files sf join dois d on d.doi_id = sf.doi_id where sf.submission_id = ${S.sid} union all select 'chapter', c.chapter_id, d.doi from submission_chapters c join dois d on d.doi_id = c.doi_id where c.publication_id = ${S.pub} union all select 'publication', p.publication_id, d.doi from publications p join dois d on d.doi_id = p.doi_id where p.publication_id = ${S.pub}`).split('\n'));
            await readAll('doi2');
        });

        // ============================================================== urn
        await sect('urn', async () => {
            const {setUpUrn, openTab} = require('../../issues/publisher-id-on-tab-never-removed/lib');
            const {openFormats, openFileTab, closeWindow} = require('../../issues/issue-and-press-file-publisher-id-never-kept/lib');
            await as(S.mgr);
            const out = {};
            out.setup = await setUpUrn(page, capp, ['Publication Formats', 'Chapters', 'Files']);
            await snap('urn-settings-saved');
            // chapter 1's URN (the positive control: a chapter page carries its own URN tag)
            const cw = await openTab(page, capp, {kind: 'chapter', sid: S.sid, pubId: S.pub, item: S.urnItems.chapter});
            out.chapterArea = flat(await cw.urnArea().innerText().catch(() => ''), 300);
            await cw.assignBox().check();
            await snap('urn-chapter-tab-ticked');
            await cw.save();
            // "Chapter PDF"'s file tab: the box ticked, then "Close" unsaved (what asks on the way out)
            const dialogs = [];
            const onDialog = (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 200)}); d.accept().catch(() => {}); };
            let formats = await openFormats(page, capp, S.sid, S.pub);
            let {win, title} = await openFileTab(page, formats, ...S.urnItems.chapterFile);
            out.chapterFileTab = {title, area: flat(await win.urnArea().innerText().catch(() => ''), 300), assignBox: await win.assignBox().count()};
            await win.assignBox().check();
            page.on('dialog', onDialog);
            try { await win.close(); } catch (e) { out.closeError = flat(e.message, 200); } finally { page.off('dialog', onDialog); }
            await sleep(1500);
            out.closeUnsaved = {dialogs, windowGone: (await win.dialog.count()) === 0, notices: (await screen(page)).notices};
            formats = await openFormats(page, capp, S.sid, S.pub);
            ({win} = await openFileTab(page, formats, ...S.urnItems.chapterFile));
            out.chapterFileReopened = flat(await win.urnArea().innerText().catch(() => ''), 300);
            await snap('urn-chapter-file-tab-reopened');
            await win.assignBox().check();
            await win.save();
            // the whole-book "PDF" file's URN
            formats = await openFormats(page, capp, S.sid, S.pub);
            ({win} = await openFileTab(page, formats, ...S.urnItems.bookFile));
            out.bookFileArea = flat(await win.urnArea().innerText().catch(() => ''), 300);
            await win.assignBox().check();
            await snap('urn-book-file-tab-ticked');
            await win.save();
            await closeWindow(page, win).catch(() => {});
            out.stored = sql(app, `select 'file', submission_file_id, setting_value from submission_file_settings where setting_name = 'pub-id::other::urn' and submission_file_id in (select submission_file_id from submission_files where submission_id = ${S.sid}) union all select 'chapter', chapter_id, setting_value from submission_chapter_settings where setting_name = 'pub-id::other::urn' and chapter_id in (select chapter_id from submission_chapters where publication_id = ${S.pub})`).split('\n');
            fact('urn.steps', out);
            await readAll('urn');
        });

        // ============================================================== urlpath (and the series' ISSN)
        await sect('urlpath', async () => {
            const out = {};
            await as(S.mgr);
            // the series' "Online ISSN"
            const {SectionsTab} = require('../../../pages/SectionsPages.js');
            const series = new SectionsTab(page, S.path, {tab: 'Series', addLabel: 'Add Series'});
            await series.goto();
            const sw = await series.openEdit(S.series);
            await sw.box('onlineIssn').fill('1234-5679');
            await snap('urlpath-series-issn-typed');
            await sw.saveAndClose();
            out.issnStored = sql(app, `select setting_value from series_settings where setting_name = 'onlineIssn' and series_id = (select series_id from publications where publication_id = ${S.pub})`);
            // the "PDF" format's URL Path
            const {openFormats} = require('../../issues/issue-and-press-file-publisher-id-never-kept/lib');
            const formats = await openFormats(page, capp, S.sid, S.pub);
            const fw = await formats.openEdit(S.urlFormat);
            const box = fw.urlPathBox();
            out.formatUrlPathBox = {count: await box.count(), editable: await box.isEditable().catch(() => null)};
            if (out.formatUrlPathBox.count) {
                await fw.type(box, 'pdf');
                await snap('urlpath-format-typed');
                await fw.ok().catch((e) => { out.formatOkError = flat(e.message, 200); });
            }
            out.formatStored = sql(app, `select publication_format_id, url_path from publication_formats where publication_id = ${S.pub} order by 1`).split('\n');
            // the book's URL Path on "Catalog Entry"
            const main = app.line !== 'stable-3_5_0';
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const frame = new WorkflowPage(page, S.path, {labels: {publicationGroup: 'Publication'}});
            const openEntry = async () => {
                if (main) await frame.gotoEditorial(S.sid, {menuKey: `publication_${S.pub}_catalogEntry`});
                else { await frame.gotoEditorial(S.sid); await frame.expectVersionLoaded().catch(() => {}); await frame.menuLink('Catalog Entry').first().click(); }
                await page.locator('input[name="urlPath"]').first().waitFor({timeout: T});
                await idle(page);
            };
            await openEntry();
            const urlBox = page.locator('input[name="urlPath"]').first();
            out.entryBoxEditable = await urlBox.isEditable().catch(() => null);
            await snap('urlpath-entry-before', null, {png: true});
            if (!out.entryBoxEditable) {
                const {unpublishFromWorkflow} = require(`${OMP_PAGES}PublicationPages.js`);
                await unpublishFromWorkflow(page).catch((e) => { out.unpublishError = flat(e.message, 300); });
                await idle(page);
                await openEntry();
                out.entryBoxEditableAfterUnpublish = await urlBox.isEditable().catch(() => null);
            }
            await urlBox.fill('sea-study');
            const saved = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await page.locator('form').filter({has: urlBox}).first().getByRole('button', {name: 'Save', exact: true}).click();
            const sr = await saved;
            out.entrySave = sr ? sr.status() : null;
            await sleep(1000);
            await snap('urlpath-entry-saved');
            if (!out.entryBoxEditable) {
                // publish again, as S05 does on main (a review panel, then the confirmation)
                const controls = page.locator('[data-cy="workflow-controls-right"]');
                const pub = controls.getByRole('button', {name: /^Publish$/}).first();
                await pub.waitFor({state: 'visible', timeout: T});
                await sleep(800);
                await pub.click();
                const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|Schedule For Publication/}).last();
                const which = () => Promise.race([
                    panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
                    confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
                ]).catch(() => null);
                let opened = await which();
                if (!opened) { await pub.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
                await idle(page); await sleep(600);
                if (opened === 'panel') {
                    await snap('urlpath-publish-panel');
                    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                    await confirm.waitFor({state: 'visible', timeout: T});
                }
                await idle(page); await sleep(600);
                await snap('urlpath-publish-confirm');
                const rp = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
                const pr = await rp;
                out.republish = pr ? pr.status() : null;
                await controls.getByRole('button', {name: /^Unpublish$/}).first().waitFor({timeout: T}).catch(() => {});
                await snap('urlpath-republished');
            }
            out.stored = sql(app, `select status, url_path from publications where publication_id = ${S.pub}`);
            S.urlPath = 'sea-study'; save();
            fact('urlpath.steps', out);
            await readAll('urlpath');
            // the number address still opens the view page
            const num = await source('urlpath-number-address', cu(`/catalog/book/${S.sid}`));
            fact('urlpath.number-address', {status: num.status, landed: num.landed, ids: idTags(num.tags || [])});
        });

        // ============================================================== extra (on a finished run's state: STATE_RUN=<run>, PHASES=extra)
        // OMP3's "its tags describe the book / the chapter": every tag of chapter 1's page and of each view page; then
        // the series' ISSN the other way round (no "Online ISSN", a "Print ISSN"), read, and put back.
        await sect('extra', async () => {
            const full = async (label) => {
                await visitor();
                const book = await source(`${label}-book`, cu(`/catalog/book/${S.urlPath || S.sid}`));
                const out = {book: book.tags, chapters: [], views: []};
                for (const h of [...new Set((book.links || []).filter((l) => /\/chapter\//.test(l.href)).map((l) => l.href))]) {
                    const c = await source(`${label}-chapter`, app.url(h));
                    out.chapters.push({asked: c.asked, tags: c.tags, snap: c.snap});
                }
                for (const h of fileLinks(book)) {
                    const v = await source(`${label}-view`, app.url(h));
                    out.views.push({link: h, status: v.status, download: v.download, tags: v.tags, snap: v.snap});
                }
                return out;
            };
            fact('extra.full-tags', await full('x-full'));
            await as(S.mgr);
            const {SectionsTab} = require('../../../pages/SectionsPages.js');
            const series = new SectionsTab(page, S.path, {tab: 'Series', addLabel: 'Add Series'});
            const setIssn = async (online, print) => {
                await series.goto();
                const sw = await series.openEdit(S.series);
                await sw.box('onlineIssn').fill(online);
                await sw.box('printIssn').fill(print);
                await sw.saveAndClose();
                return sql(app, `select setting_name, setting_value from series_settings where setting_name in ('onlineIssn', 'printIssn') and series_id = (select series_id from publications where publication_id = ${S.pub}) order by 1`).split('\n');
            };
            const before = sql(app, `select setting_name, setting_value from series_settings where setting_name in ('onlineIssn', 'printIssn') and series_id = (select series_id from publications where publication_id = ${S.pub}) order by 1`).split('\n');
            const printOnly = await setIssn('', '0317-8471');
            await snap('x-series-print-only-saved');
            await visitor();
            const book = await source('x-print-book', cu(`/catalog/book/${S.urlPath || S.sid}`));
            const views = [];
            for (const h of fileLinks(book)) { const v = await source('x-print-view', app.url(h)); views.push({link: h, issn: v.tags ? pick(v.tags, /ISSN/) : null}); }
            await as(S.mgr);
            const restored = await setIssn('1234-5679', '');
            fact('extra.issn-print-only', {before, printOnly, bookIssnTags: pick(book.tags || [], /ISSN/), views, restored});
        });
    } finally {
        await close();
    }
    if (RUN === "r1") note(`ccH13D: Rule 17 (OMP ${app.line || 'main'}): a file's "Edit" window (Publication Formats › file row arrow › "Edit") › "Identifiers" tab carries the URN area with input[name="assignURN"]; the catalog/view/… page source is the navigation response text (headTags), as S05 noted.`);
});
