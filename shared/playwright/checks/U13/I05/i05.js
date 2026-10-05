// U13 claim check, housekeeping chunk I05 (2026-10-05): three incidentals rows.
// Spec: docs/specs/U13-article-landing-page-and-reading.md — Rule 1 (201–208), Rule 8 (282–288), Rule 11's XML
// bullet (322–325), Rule 13 (350–355), Rule 21 (461–465), Settings 3 (530–532); register A1, OJS9, OPS2, OPS3;
// footnotes f, q2, q5, q10, o.
//
//   R029  OJS (OPS the other app): an older version's galley opened by its number under the version part
//         (`…/view/{id}/version/{pubId}/{galleyId}`) once the galley has a URL Path. Article A: "PDF" (URL Path
//         "pdf") and "Print" (no URL Path); a second version made on screen, published, both galleys copied.
//         Article B: "PDF" (URL Path "pdf"), the copy's URL Path changed to "pdfnew" before the second version
//         is published.
//   R033  OJS: an issue's XML issue galley ("Full Issue") with "eLife Lens Article Viewer" on (journal J) and
//         off (journal L); an article's XML galley beside it (Settings bullet 3's control), a PDF issue galley.
//   R035  OJS, OPS, OMP (book page, control): the "Versions" list (and the preprint label line) in a language
//         whose lib/pkp `submission.po` lacks `submission.versionIdentity` (es_MX) or holds it empty (ja), beside
//         French (Canada) and English. The site installs es_MX and ja on screen as `admin` (phase `install`);
//         phase `cleanup` removes them again.
//
//   Article C (Rule 1's other end): the article's own URL Path "i05c", "PDF" (URL Path "pdf") and "Print".
//
//   PROBE_FEATURE=U13 PROBE_AGENT=ccI05 PROBE_RUN=r1 PHASES=install,seed,build,settings,plugins,read \
//       node bin/probe.js ojs shared/playwright/checks/U13/I05/i05.js
//   (one app per process, ojs, ops and omp; r1 and r2 may run at once once `install` has run; `cleanup` alone at
//   the very end). Later phases read the run's state file (`i05-state-<run>-<app>`). Driven 2026-10-05, ~4 min a run.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, sql, rawKeys} = require('../../../probe');

const T = 30_000;
const PHASES = (process.env.PHASES || 'install,seed,build,settings,read').split(',');
const on = (p) => PHASES.includes(p);
const LOCALES = ['es_MX', 'ja'];
const READ_LOCALES = ['en', 'fr_CA', 'es_MX', 'ja'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

// The landing (or book) page as data: notices, h1, galley links, Versions entries, label line, date line.
const LANDING = () => {
    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const root = document.querySelector('.obj_article_details, .obj_preprint_details, .obj_monograph_full');
    return {
        title: document.title,
        lang: document.documentElement.lang,
        h1: [...document.querySelectorAll('h1')].map((h) => f(h.innerText)),
        notices: [...document.querySelectorAll('.cmp_notification')].map((n) => f(n.innerText)),
        root: !!root,
        galleys: root ? [...root.querySelectorAll('.item.galleys a, .item.files a, .pub_format a')].map((a) => ({t: f(a.innerText), h: a.getAttribute('href')})) : [],
        versions: root ? [...root.querySelectorAll('.item.published .versions li, .item.versions li, .versions li')].filter((li) => !li.closest('.authors')).map((li) => ({t: f(li.innerText), a: li.querySelector('a')?.getAttribute('href') || null})) : [],
        versionsHeading: root ? f([...root.querySelectorAll('h2, h3')].find((h) => /versions|version/i.test(h.closest('.item, .sub_item')?.className || ''))?.innerText) || null : null,
        label: f(document.querySelector('span.preprint_label')?.innerText) || null,
        labelVersion: f(document.querySelector('span.preprint_version')?.innerText) || null,
        published: f(document.querySelector('.item.published')?.innerText).slice(0, 400) || null,
        bodyStart: f(document.body.innerText).slice(0, 300),
    };
};
// A reader page (PDF reader or the Lens page) as data.
const READER = () => {
    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const h = document.querySelector('header.header_view');
    const n = document.querySelector('.galley_view_notice_message');
    const ifr = document.querySelector('.galley_view iframe, iframe');
    return {
        title: document.title,
        header: h ? f(h.innerText) : null,
        ret: h?.querySelector('a.return')?.getAttribute('href') || null,
        titleLink: h?.querySelector('a.title') ? {t: f(h.querySelector('a.title').innerText), h: h.querySelector('a.title').getAttribute('href')} : null,
        download: h?.querySelector('a.download')?.getAttribute('href') || null,
        notice: n ? f(n.innerText) : null,
        iframe: ifr ? ifr.getAttribute('src') : null,
        lens: !!document.querySelector('.lens-article, #container .surface, .lens-article .document'),
        scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter((s) => /lens/i.test(s)),
        bodyStart: f(document.body.innerText).slice(0, 400),
    };
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const view = isOPS ? 'preprint' : 'article';
    const PDF = isOPS ? 'preprint.pdf' : 'article.pdf';
    const statePath = outFile('i05-state');
    const S = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('i05-facts', {[k]: v}, {merge: true}); console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`); };

    const {page, close} = await launch(app);
    const nav = [];
    page.on('response', (r) => {
        try {
            if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) nav.push({at: Date.now(), url: rel(r.url()), status: r.status(), location: r.headers().location ? rel(r.headers().location) : null, disposition: r.headers()['content-disposition'] || null});
        } catch (e) { /* none */ }
    });
    const navSince = (t) => nav.filter((x) => x.at >= t).map(({at, ...x}) => x);
    const consoleMsgs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push({at: Date.now(), type: m.type(), t: flat(m.text(), 300)}); });
    page.on('pageerror', (e) => consoleMsgs.push({at: Date.now(), type: 'pageerror', t: flat(e.message, 300)}));
    const consoleSince = (t) => consoleMsgs.filter((x) => x.at >= t).map(({at, ...x}) => x);

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    // Type an address as a visitor does: the navigation chain, where it ends, what it shows or downloads.
    async function typed(url, name, {lens = false} = {}) {
        const t0 = Date.now();
        const dlP = page.waitForEvent('download', {timeout: 10_000}).then((d) => d, () => null);
        let status = null;
        let gotoErr = null;
        try {
            const r = await page.goto(app.url(url), {waitUntil: lens ? 'load' : 'load', timeout: 45_000});
            status = r ? r.status() : null;
        } catch (e) { gotoErr = flat(e.message, 200); }
        let dl = null;
        if (gotoErr) dl = await dlP;
        if (!lens) await idle(page).catch(() => {});
        else await sleep(6000);
        await sleep(400);
        const out = {typed: url, status, gotoErr, finalUrl: rel(page.url()), chain: navSince(t0)};
        if (dl) out.download = {file: dl.suggestedFilename(), url: rel(dl.url()), failure: await dl.failure().catch(() => null)};
        out.landing = await page.evaluate(LANDING).catch((e) => ({err: flat(e.message, 200)}));
        out.reader = await page.evaluate(READER).catch((e) => ({err: flat(e.message, 200)}));
        out.console = consoleSince(t0);
        if (lens) {
            const s = {url: page.url(), text: {body: flat(await page.locator('body').innerText().catch(() => ''), 3000)}};
            record(name, {...s, typed: out});
            await shot(page, name).catch(() => {});
        } else {
            await snap(name, {typed: out});
        }
        console.log(`[typed] ${app.name} ${name}: ${url} -> ${out.finalUrl} ${status ?? ''} ${gotoErr ? 'ERR ' + gotoErr.slice(0, 60) : ''} notice=${out.reader.notice || '-'} dl=${out.download ? out.download.file : '-'} h1=${JSON.stringify(out.landing.h1 || [])}`);
        return out;
    }

    try {
        // ---------------------------------------------------------------- install (site, admin, on screen)
        if (on('install')) {
            const before = sql(app, 'select installed_locales, supported_locales from site');
            const need = LOCALES.filter((l) => !before.includes(`"${l}"`));
            const out = {before, need};
            if (need.length) {
                const {SiteLanguagesList} = require('../../../pages/LanguagesPages.js');
                await signIn(page, 'admin');
                const list = new SiteLanguagesList(page);
                await list.goto();
                await snap('install-01-site-languages');
                const win = await list.openInstall();
                for (const l of need) await win.box(l).check();
                await snap('install-02-window-ticked');
                const t0 = Date.now();
                const r = await win.save();
                out.saveStatus = r.status();
                out.seconds = Math.round((Date.now() - t0) / 1000);
                await list.reload();
                out.rows = await list.container.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
                await snap('install-03-site-languages-after');
                await signOut(page);
            }
            out.after = sql(app, 'select installed_locales, supported_locales from site');
            fact('install', out);
        }

        // ---------------------------------------------------------------- seed (scratch contexts through the scenario API)
        if (on('seed') && !S.seeded) {
            const t = tag('u13i05');
            S.t = t;
            const site = sql(app, 'select supported_locales from site');
            const locs = ['en', 'fr_CA', ...LOCALES.filter((l) => site.includes(`"${l}"`))];
            S.locales = locs;
            const users = (p) => [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mina', familyName: 'Manager'},
                {username: `${p}au`, roles: ['author'], givenName: 'Abe', familyName: 'Author'},
            ];
            const ctxSpec = (p, name) => ({name: `U13 I05 ${name} ${p}`, acronym: 'IFIVE', contactName: 'I05 Contact', contactEmail: `${p}c@mail.test`, supportedLocales: locs});
            const issueGalleys = [{label: 'XML', file: 'article.xml'}, {label: 'PDF', file: 'article.pdf'}];
            const mk = async (key, extra = {}) => {
                const p = `${t}${key}`;
                const r = await app.api.createContext({tag: p, context: ctxSpec(p, key), users: users(p), ...extra});
                return {path: r.path || p, issues: r.issues || null, mg: `${p}mg`, au: `${p}au`};
            };
            S.J = await mk('j', isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: issueGalleys}]} : {});
            const inIssue = isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {};
            const sub = async (C, key, spec) => {
                const r = await app.api.createSubmission({tag: `${t}${key}`, context: C.path, submitter: C.au, title: `I05 ${key} ${t}`, abstract: `Abstract ${key}.`, published: true, ...inIssue, ...spec});
                return {id: r.submissionId, pub: r.publicationId, galleys: r.galleys || []};
            };
            if (isOMP) {
                S.BOOK = await sub(S.J, 'book', {});
            } else {
                S.A = await sub(S.J, 'a', {galleys: [{label: 'PDF', file: PDF, urlPath: 'pdf'}, {label: 'Print', file: PDF}]});
                S.B = await sub(S.J, 'b', {galleys: [{label: 'PDF', file: PDF, urlPath: 'pdf'}]});
            }
            if (isOJS) {
                S.X = await sub(S.J, 'x', {galleys: [{label: 'XML', file: 'article.xml'}]});
                S.L = await mk('l', {plugins: {lensgalleyplugin: {enabled: false}}, issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: issueGalleys}]});
                S.LX = await sub(S.L, 'lx', {galleys: [{label: 'XML', file: 'article.xml'}]});
            }
            S.seeded = true;
            save();
            fact('seed', S);
        }

        // Article C (Rule 1's other end): the article itself has a URL Path ("i05c"); "PDF" (URL Path "pdf") and "Print".
        if (on('seed') && !isOMP && S.seeded && !S.C) {
            const r = await app.api.createSubmission({tag: `${S.t}c`, context: S.J.path, submitter: S.J.au, title: `I05 c ${S.t}`, abstract: 'Abstract c.', published: true, urlPath: 'i05c',
                ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {}), galleys: [{label: 'PDF', file: PDF, urlPath: 'pdf'}, {label: 'Print', file: PDF}]});
            S.C = {id: r.submissionId, pub: r.publicationId, galleys: r.galleys || []};
            save();
            fact('seedC', S.C);
        }

        // ---------------------------------------------------------------- build (second versions, on screen, as the manager)
        if (on('build') && !isOMP) {
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const {GalleyManager} = require('../../../pages/GalleysPages.js');
            const C = S.J;
            const frame = new WorkflowPage(page, C.path, {labels: {publicationGroup: isOPS ? 'Preprint' : 'Publication'}});
            await signIn(page, C.mg, {contextPath: C.path});
            for (const key of ['A', 'B', 'C']) {
                const x = S[key];
                if (!x || x.v2done) continue;
                const out = {};
                if (!x.v2) {
                    if (isOJS) {
                        const {PublishScreen} = require(path.join(app.suiteDir, 'pages', 'PublishSchedulePages.js'));
                        const pub = new PublishScreen(page, C.path);
                        await pub.gotoWorkflow(x.id);
                        const dialog = await pub.openCreateVersionDialog();
                        x.v2 = await pub.confirmVersionDialog(dialog);
                    } else {
                        const {openPublicationPage, createNewVersion} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
                        await openPublicationPage(page, C.path, x.id, x.pub);
                        await frame.expectVersionLoaded();
                        x.v2 = (await createNewVersion(page)).id;
                    }
                    save();
                    await snap(`build-${key}-01-version-created`);
                }
                if (key === 'B') {
                    const galleys = new GalleyManager(page, frame);
                    await galleys.open(x.id, x.v2);
                    await snap('build-B-02-galleys-v2');
                    const win = await galleys.openEdit('PDF');
                    out.pathBefore = await win.urlPathBox().inputValue().catch(() => null);
                    await win.type(win.urlPathBox(), 'pdfnew');
                    out.galleySave = (await win.save()).status();
                    await snap('build-B-03-galleys-v2-saved');
                }
                await frame.gotoEditorial(x.id, {menuKey: `publication_${x.v2}_titleAbstract`});
                await frame.expectVersionLoaded().catch(() => {});
                await idle(page);
                if (isOJS) {
                    const {PublishScreen} = require(path.join(app.suiteDir, 'pages', 'PublishSchedulePages.js'));
                    const pub = new PublishScreen(page, C.path);
                    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
                    const panel = await pub.pressPublish({or: confirm});
                    if (panel) {
                        await pub.fillVersionDetails(panel);
                        await snap(`build-${key}-04-publish-panel`);
                        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                    }
                    await confirm.waitFor({state: 'visible', timeout: T});
                    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()), {timeout: T});
                    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
                    out.publish = (await published).status();
                    await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
                } else {
                    const {postPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
                    await postPreprint(page);
                    out.publish = 'posted';
                }
                await idle(page);
                await snap(`build-${key}-05-published`);
                x.v2done = true;
                save();
                fact(`build.${key}`, out);
            }
            await signOut(page);
            const ids = [S.A.pub, S.A.v2, S.B.pub, S.B.v2, ...(S.C ? [S.C.pub, S.C.v2] : [])].join(',');
            S.galleyRows = sql(app, `select galley_id, publication_id, coalesce(url_path,''), submission_file_id from publication_galleys where publication_id in (${ids}) order by publication_id, galley_id`).split('\n');
            S.pubRows = sql(app, `select publication_id, submission_id, status, version_stage, version_major, version_minor, date_published from publications where publication_id in (${ids}) order by publication_id`).split('\n');
            save();
            fact('ids', {galleys: S.galleyRows, pubs: S.pubRows});
        }

        // ---------------------------------------------------------------- settings (the manager reads C's URL Path where it was set)
        if (on('settings') && !isOMP && S.C && S.C.v2) {
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const frame = new WorkflowPage(page, S.J.path, {labels: {publicationGroup: isOPS ? 'Preprint' : 'Publication'}});
            await signIn(page, S.J.mg, {contextPath: S.J.path});
            const out = {};
            for (const [k, pub] of [['v1', S.C.pub], ['v2', S.C.v2]]) {
                await frame.gotoEditorial(S.C.id, {menuKey: `publication_${pub}_titleAbstract`});
                await frame.expectVersionLoaded().catch(() => {});
                const name = isOPS ? 'Preprint entry' : 'Publication Settings';
                await page.getByRole('dialog').first().getByRole('link', {name, exact: true}).last().click();
                const box = page.locator('input[id$="-urlPath-control"]').first();
                await box.waitFor({state: 'visible', timeout: T});
                await idle(page);
                await sleep(800);
                const id = await box.getAttribute('id');
                out[k] = {page: name, value: await box.inputValue(), label: flat(await page.locator(`label[for="${id}"]`).innerText().catch(() => null), 120), disabled: await box.isDisabled().catch(() => null)};
                await snap(`settings-c-${k}-url-path`);
                await loc(page, `${name} page: the "URL Path" box (input[id$="-urlPath-control"])`, box);
            }
            fact('settingsC', out);
            await signOut(page);
        }

        // ---------------------------------------------------------------- plugins (Settings bullet 3: the Lens row, the manager of J; L's row off)
        if (on('plugins') && !isOMP) {
            const out = {};
            for (const C of [S.J, ...(S.L ? [S.L] : [])]) {
                await signIn(page, C.mg, {contextPath: C.path});
                await page.goto(app.url(`/index.php/${C.path}/en/management/settings/website`));
                await idle(page);
                await page.locator('#plugins-button').first().click();
                await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
                await idle(page);
                await sleep(500);
                const rows = await page.locator('#pluginGridContainer tr.gridRow').evaluateAll((trs) => trs.map((tr) => ({id: tr.id.replace(/^.*-row-/, ''), text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), on: tr.querySelector('input[type=checkbox]')?.checked ?? null})));
                const pick = (id) => rows.find((r) => r.id === id) || null;
                out[C.path] = {count: rows.length, lens: pick('lensgalleyplugin'), html: pick('htmlarticlegalleyplugin'), pdfjs: pick('pdfjsviewerplugin'), lensLike: rows.filter((r) => /lens|xml/i.test(r.text))};
                await snap(`plugins-${C === S.J ? 'j' : 'l'}`);
                await loc(page, 'Settings › Website › Plugins: the "eLife Lens Article Viewer" row', page.locator('#pluginGridContainer tr.gridRow[id$="-row-lensgalleyplugin"]'));
                await signOut(page);
            }
            fact('plugins', out);
        }

        // ---------------------------------------------------------------- read (signed out, a visitor)
        if (on('read')) {
            await signOut(page).catch(() => {});
            const C = S.J;
            const base = (ctx, l = null) => `/index.php/${ctx}${l ? `/${l}` : ''}`;
            const g = (pubId, urlPath, label) => {
                const row = (S.galleyRows || []).map((r) => r.split('|')).find((r) => Number(r[1]) === Number(pubId) && (urlPath == null || r[2] === urlPath));
                return row ? {id: Number(row[0]), file: Number(row[3])} : null;
            };
            const facts = {};
            if (!isOMP) {
                const A = S.A;
                const B = S.B;
                const a = (rest) => `${base(C.path)}/${view}/view/${A.id}${rest}`;
                const b = (rest) => `${base(C.path)}/${view}/view/${B.id}${rest}`;
                const aPdf1 = g(A.pub, 'pdf');
                const aPrint1 = g(A.pub, '');
                const aPdf2 = g(A.v2, 'pdf');
                const aPrint2 = g(A.v2, '');
                const bPdf1 = g(B.pub, 'pdf');
                const bPdf2 = g(B.v2, 'pdfnew');
                facts.ids = {aPdf1, aPrint1, aPdf2, aPrint2, bPdf1, bPdf2, A, B};
                // The pages themselves.
                facts.aCurrent = await typed(a(''), 'r-a-01-current');
                facts.aOlder = await typed(a(`/version/${A.pub}`), 'r-a-02-older-page');
                // R029: the older version's galleys by number under the version part.
                facts.aOlderPdfByNumber = await typed(a(`/version/${A.pub}/${aPdf1.id}`), 'r-a-03-older-pdf-by-number');
                facts.aOlderPdfByPath = await typed(a(`/version/${A.pub}/pdf`), 'r-a-04-older-pdf-by-path');
                facts.aOlderPrintByNumber = await typed(a(`/version/${A.pub}/${aPrint1.id}`), 'r-a-05-older-print-by-number');
                facts.aOlderPdfByNumberFile = await typed(a(`/version/${A.pub}/${aPdf1.id}/${aPdf1.file}`), 'r-a-06-older-pdf-by-number-file');
                facts.aOlderPdfDownloadByNumber = await typed(`${base(C.path)}/${view}/download/${A.id}/version/${A.pub}/${aPdf1.id}/${aPdf1.file}`, 'r-a-07-older-pdf-download-by-number');
                facts.aOlderPdfDownloadByPath = await typed(`${base(C.path)}/${view}/download/${A.id}/version/${A.pub}/pdf/${aPdf1.file}`, 'r-a-08-older-pdf-download-by-path');
                // Rule 13's first sentence: the current galley's number; and the older galley's number with no version part.
                facts.aCurrentPdfByNumber = await typed(a(`/${aPdf2.id}`), 'r-a-09-current-pdf-by-number');
                facts.aOlderPdfNumberNoVersion = await typed(a(`/${aPdf1.id}`), 'r-a-10-older-pdf-number-no-version');
                facts.aCurrentPdfByPath = await typed(a('/pdf'), 'r-a-11-current-pdf-by-path');
                facts.aOlderPrintNumberNoVersion = await typed(a(`/${aPrint1.id}`), 'r-a-12-older-print-number-no-version');
                // Article B: the copy's URL Path changed ("pdfnew").
                facts.bCurrent = await typed(b(''), 'r-b-01-current');
                facts.bOlder = await typed(b(`/version/${B.pub}`), 'r-b-02-older-page');
                facts.bOlderPdfByNumber = await typed(b(`/version/${B.pub}/${bPdf1.id}`), 'r-b-03-older-pdf-by-number');
                facts.bOlderPdfByPath = await typed(b(`/version/${B.pub}/pdf`), 'r-b-04-older-pdf-by-path');
                facts.bOldPathNoVersion = await typed(b('/pdf'), 'r-b-05-old-path-no-version');
                facts.bCurrentByNumber = await typed(b(`/${bPdf2.id}`), 'r-b-06-current-pdf-by-number');
                facts.bOlderPdfNumberNoVersion = await typed(b(`/${bPdf1.id}`), 'r-b-07-older-pdf-number-no-version');
                // Article C: the article's own URL Path ("i05c"); Rule 1 at its other end, and R029 under it.
                if (S.C && S.C.v2) {
                    const Cc = S.C;
                    const c = (rest) => `${base(C.path)}/${view}/view/${Cc.id}${rest}`;
                    const cp = (rest) => `${base(C.path)}/${view}/view/i05c${rest}`;
                    const cPdf1 = g(Cc.pub, 'pdf');
                    const cPrint1 = g(Cc.pub, '');
                    const cPrint2 = g(Cc.v2, '');
                    facts.ids.C = {cPdf1, cPrint1, cPrint2, Cc};
                    facts.cNumber = await typed(c(''), 'r-c-01-number');
                    facts.cNumberVersion = await typed(c(`/version/${Cc.pub}`), 'r-c-02-number-version');
                    facts.cNumberCurrentPrint = await typed(c(`/${cPrint2.id}`), 'r-c-03-number-current-print');
                    facts.cNumberVersionPdfPath = await typed(c(`/version/${Cc.pub}/pdf`), 'r-c-04-number-version-pdf-path');
                    facts.cNumberVersionPdfNumber = await typed(c(`/version/${Cc.pub}/${cPdf1.id}`), 'r-c-05-number-version-pdf-number');
                    facts.cPathVersionPdfNumber = await typed(cp(`/version/${Cc.pub}/${cPdf1.id}`), 'r-c-06-path-version-pdf-number');
                    facts.cPathVersionPrintNumber = await typed(cp(`/version/${Cc.pub}/${cPrint1.id}`), 'r-c-07-path-version-print-number');
                    facts.cNoSuchGalley = await typed(cp('/nosuchgalley'), 'r-c-08-no-such-galley');
                    facts.aNoSuchGalley = await typed(a('/nosuchgalley'), 'r-a-13-no-such-galley');
                }
                // The older page's own galley links pressed (the screen's route).
                await page.goto(app.url(a(`/version/${A.pub}`)));
                await idle(page);
                const links = await page.evaluate(LANDING);
                facts.aOlderLinks = links.galleys;
                await loc(page, 'older version page: galley links (.item.galleys a)', page.locator('.obj_article_details .item.galleys a, .obj_preprint_details .item.galleys a'));
            }
            // R035: the Versions list (and the label line) in each language.
            const item = isOMP ? S.BOOK : S.A;
            const itemPath = isOMP ? `/catalog/book/${item.id}` : `/${view}/view/${item.id}`;
            facts.lang = {};
            for (const l of READ_LOCALES) {
                if (!(S.locales || []).includes(l) && l !== 'en') { facts.lang[l] = 'locale not supported'; continue; }
                const o = await typed(`${base(C.path, l)}${itemPath}`, `r-lang-${l}-current`);
                const raw = await rawKeys(page).catch((e) => ({err: flat(e.message, 200)}));
                facts.lang[l] = {finalUrl: o.finalUrl, status: o.status, lang: o.landing.lang, versions: o.landing.versions, label: o.landing.label, labelVersion: o.landing.labelVersion, published: o.landing.published, rawKeys: raw};
                if (!isOMP) {
                    const older = await typed(`${base(C.path, l)}${itemPath}/version/${item.pub}`, `r-lang-${l}-older`);
                    facts.lang[l].older = {versions: older.landing.versions, label: older.landing.label, labelVersion: older.landing.labelVersion, notices: older.landing.notices};
                }
            }
            // R033: the issue's galleys (OJS), Lens on (J) and off (L); the article XML galley beside them.
            if (isOJS) {
                for (const [k, ctx, X] of [['on', S.J, S.X], ['off', S.L, S.LX]]) {
                    const issue = ctx.issues[0];
                    const toc = await typed(`${base(ctx.path, 'en')}/issue/view/${issue.id}`, `r-issue-${k}-01-toc`);
                    const tocLinks = await page.locator('.obj_issue_toc .galleys a, .obj_issue_toc .heading .galleys_links a, .galleys_links a').evaluateAll((as) => as.map((a) => ({t: a.innerText.replace(/\s+/g, ' ').trim(), h: a.getAttribute('href'), cls: a.className})));
                    await loc(page, 'issue page: "Full Issue" galley links (.obj_issue_toc .galleys_links a)', page.locator('.obj_issue_toc .galleys_links a'));
                    facts[`issue_${k}`] = {toc: {finalUrl: toc.finalUrl, h1: toc.landing.h1, links: tocLinks}, galleys: issue.galleys};
                    const xmlG = issue.galleys.find((x) => x.label === 'XML');
                    const pdfG = issue.galleys.find((x) => x.label === 'PDF');
                    // The XML link pressed as a reader presses it.
                    const xmlLink = page.locator('.obj_issue_toc a', {hasText: /^\s*XML\b/}).first();
                    if (await xmlLink.count()) {
                        const t0 = Date.now();
                        const dlP = page.waitForEvent('download', {timeout: 15_000}).then((d) => d, () => null);
                        const navP = page.waitForURL((u) => /\/issue\/view\/[^/]+\/[^/]+/.test(u.pathname), {timeout: 15_000}).then(() => true, () => false);
                        await xmlLink.click();
                        const [d, n] = await Promise.all([dlP, navP]);
                        await sleep(6000);
                        const body = flat(await page.locator('body').innerText().catch(() => ''), 2000);
                        facts[`issue_${k}`].xmlPressed = {navigated: n, download: d ? {file: d.suggestedFilename(), url: rel(d.url())} : null, finalUrl: rel(page.url()), chain: navSince(t0), title: await page.title().catch(() => null), body, reader: await page.evaluate(READER).catch(() => null), console: consoleSince(t0)};
                        record(`r-issue-${k}-02-xml-pressed`, {url: page.url(), text: {body}, facts: facts[`issue_${k}`].xmlPressed});
                        await shot(page, `r-issue-${k}-02-xml-pressed`).catch(() => {});
                    } else {
                        facts[`issue_${k}`].xmlPressed = 'no XML link on the issue page';
                    }
                    facts[`issue_${k}`].xmlTyped = await typed(`${base(ctx.path, 'en')}/issue/view/${issue.id}/${xmlG.id}`, `r-issue-${k}-03-xml-typed`, {lens: true});
                    facts[`issue_${k}`].pdfTyped = await typed(`${base(ctx.path, 'en')}/issue/view/${issue.id}/${pdfG.id}`, `r-issue-${k}-04-pdf-typed`);
                    // The article's XML galley, pressed from its page.
                    await page.goto(app.url(`${base(ctx.path, 'en')}/article/view/${X.id}`));
                    await idle(page);
                    await snap(`r-issue-${k}-05-article-x`);
                    const ax = page.locator('.obj_article_details .item.galleys a', {hasText: /^\s*XML\b/}).first();
                    if (await ax.count()) {
                        const t0 = Date.now();
                        const dlP = page.waitForEvent('download', {timeout: 15_000}).then((d) => d, () => null);
                        await ax.click();
                        const d = await dlP;
                        await sleep(6000);
                        const body = flat(await page.locator('body').innerText().catch(() => ''), 1500);
                        facts[`article_xml_${k}`] = {download: d ? {file: d.suggestedFilename(), url: rel(d.url())} : null, finalUrl: rel(page.url()), chain: navSince(t0), title: await page.title().catch(() => null), body, reader: await page.evaluate(READER).catch(() => null), console: consoleSince(t0)};
                        record(`r-issue-${k}-06-article-xml-pressed`, {url: page.url(), text: {body}, facts: facts[`article_xml_${k}`]});
                        await shot(page, `r-issue-${k}-06-article-xml-pressed`).catch(() => {});
                    }
                }
            }
            fact(`read`, facts);
        }

        // ---------------------------------------------------------------- cleanup (site, admin, on screen)
        if (on('cleanup')) {
            const {SiteLanguagesList} = require('../../../pages/LanguagesPages.js');
            await signIn(page, 'admin');
            const list = new SiteLanguagesList(page);
            const out = {};
            for (const l of LOCALES) out[l] = await list.removeIfInstalled(l).catch((e) => `error ${flat(e.message, 200)}`);
            out.after = sql(app, 'select installed_locales, supported_locales from site');
            await snap('cleanup-site-languages');
            fact('cleanup', out);
        }
    } finally {
        await close();
    }
});
