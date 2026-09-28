// U72 claim check, chunk K2: the chapter list and the chapter window.
// Spec: docs/specs/U72-chapters-work-type.md — Fields 57–91 (the chapter list, the chapter window and its field
// table), Rules 2 and 4–10 (125–130, 134–174), Side effects (232–246); footnotes f, g, j, k, l, m, n, r and the
// open questions td6–td11, td14, td17.
//
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK2 node bin/probe.js omp shared/playwright/checks/U72/K2/k2.js
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK2 node bin/probe.js ojs shared/playwright/checks/U72/K2/k2.js   (control)
//   PHASES=a,b (default: all, in the order of ALL). State in k2-state-<app>.json under the output folder, so a
//   phase re-runs alone; RESEED=1 seeds afresh (a new tag). One app per process keeps a run under the Bash cap.
//
// OMP. Scratch press "P" (tag prefix u72k2): series "monographs"; users <t>mg manager, <t>se Series editor,
// <t>sn Series editor assigned without the metadata permission, <t>le Layout Editor, <t>au Author. Books:
//   A   Edited Volume in Production, contributors Ada, Ben; chapters "Tides" (subtitle "A Study", authors the
//       submitter and Ada, the Chapter Manuscript file) and "Harbours" (bare); se, sn, le assigned. The list as
//       each role sees it, the "Edit Chapter" window, the Role column after Ada is made a Volume editor on screen.
//   E   Monograph, submitter only, no chapters: "No Items", "Add Chapter" window, Title rules (td6), Cancel, Pages.
//   C   Edited Volume, contributors Ada, Ben, Cy (td7), then Ben deleted on the Contributors page (td10).
//   N   a book whose Contributors list is emptied on screen (the "Add Contributor" absence).
//   F   Edited Volume in Production with a Submission File, a review round file, a discussion attachment and a
//       Production Ready file (both uploaded on screen) and a format's proof file (td8).
//   D   two chapters and one Submission File (td9, Rule 9 "Delete").
//   O   chapters Tides (two authors) then Harbours (td11 "Order").
//   S   a Monograph for the side-effects run (td17): add, edit, order, delete, work type, "Publication Dates".
//   V   published, then "Create New Version" on screen, a chapter added to the new version (Rule 2).
//   L   Edited Volume in Production, chapters "Own" (own license) and "Empty"; published on screen (Side effects 4).
//   W1  a draft Edited Volume, W2 a draft Monograph, by the Author: the wizard's "Chapters" section, Rule 5's autosave,
//       Rule 6's wizard order, td11's Review panel.
// Press "Q": DOIs for chapters, "Upon publication"; book QP published with "Tides" ("Chapter Page" ticked) and
//   "Harbours" (td14, Rule 10; the "Identifiers" tab with DOIs only).
// Press "R": "Publisher ID" for chapters (the "Identifiers" tab's other end).
// Press "L1": forms and submission languages English and French; books in English and in French (Title per language).
// Press "L2": forms English only, submission languages English and French (the box count's other axis).
// OJS / OPS: the read-only controls (no "Chapters" page, no wizard "Chapters" section) on a scratch context.
// Also O2 (three chapter authors), O3plain / O3afterDone (two authors) for the author-order legs, seeded by their phases.
// Phases: seed · roles · window · leave · title · fields · authors · files · deletes · order · order2 · order3 · order4 ·
//   cancelorder · wizard · versions · doi · ids · lang2 · license · side · extra · control (OJS/OPS only); `explore`
//   (a grid HTML dump) runs only when named. No assertions: the script records, the reader judges.
// Findings this script reproduces: K2-8 (a chapter cannot be moved with "Order": phases order, order2, order4) and
// K2-9 (an author order lost after an earlier "Done": order3.afterDone).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'roles', 'window', 'leave', 'title', 'fields', 'authors', 'files', 'deletes', 'order', 'order2', 'order3', 'order4', 'cancelorder', 'wizard', 'versions', 'doi', 'ids', 'lang2', 'license', 'side', 'extra', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const T0 = Date.now();

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const log = (...a) => console.log(`[k2 ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `k2-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 3000)); };
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    function db(sql) {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const sec = cfg.split(/^\[database\]/m)[1] || '';
        const get = (k) => ((sec.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm')) || [])[1] || '').trim().replace(/^"|"$/g, '');
        try {
            return execFileSync('psql', ['-h', get('host') || '127.0.0.1', '-U', get('username'), get('name'), '-At', '-F', '|', '-c', sql],
                {env: {...process.env, PGPASSWORD: get('password')}, encoding: 'utf8', timeout: 20_000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`ERROR ${flat(e.message, 300)}`]; }
    }

    await app.api.bootstrapProbe(app.contextPath);

    // ================================================================== seed
    if (on('seed') && !S.seeded) {
        const t = tag('u72k2');
        S = {t, errs: {}};
        if (isOMP) {
            const P = `${t}`;
            const users = [
                {username: `${P}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${P}se`, roles: ['sectionEditor'], series: ['monographs'], givenName: 'Sam', familyName: 'Series'},
                {username: `${P}sn`, roles: ['sectionEditor'], givenName: 'Nina', familyName: 'Nometa'},
                {username: `${P}le`, roles: ['layoutEditor'], givenName: 'Leo', familyName: 'Layout'},
                {username: `${P}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'},
            ];
            const ctx = await app.api.createContext({tag: P, context: {name: `U72 K2 press ${P}`, contactName: 'Paula Principal', contactEmail: `principal${P}@mail.test`}, series: [{path: 'monographs', title: 'Monographs'}], users});
            S.P = {path: ctx.path, id: ctx.contextId, mg: `${P}mg`, se: `${P}se`, sn: `${P}sn`, le: `${P}le`, au: `${P}au`};
            save();
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `${P}ada@mail.test`};
            const ben = {givenName: 'Ben', familyName: 'Barrow', email: `${P}ben@mail.test`};
            const cy = {givenName: 'Cy', familyName: 'Coast', email: `${P}cy@mail.test`};
            const prod = ['accept', 'sendToProduction'];
            const part = [{username: `${P}se`, role: 'sectionEditor'}, {username: `${P}sn`, role: 'sectionEditor', canChangeMetadata: false}, {username: `${P}le`, role: 'layoutEditor'}];
            const books = {
                A: {title: 'K2 List Book', workType: 'editedVolume', series: 'monographs', decisions: prod, participants: part, contributors: [ada, ben],
                    files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}],
                    chapters: [{title: 'Tides', subtitle: 'A Study', authors: [`${P}au`, ada.email], files: ['files.0']}, {title: 'Harbours'}]},
                E: {title: 'K2 Empty Book'},
                C: {title: 'K2 Contributors Book', workType: 'editedVolume', contributors: [ada, ben, cy]},
                N: {title: 'K2 No Contributors Book'},
                F: {title: 'K2 Files Book', workType: 'editedVolume', decisions: ['sendExternalReview', 'accept', 'sendToProduction'],
                    reviewRounds: [{files: [{file: 'notes.md'}]}], files: [{file: 'article.pdf'}], publicationFormats: [{name: 'PDF', file: 'replacement.pdf'}],
                    chapters: [{title: 'Files Chapter'}]},
                D: {title: 'K2 Delete Book', workType: 'editedVolume', contributors: [ada], files: [{file: 'article.pdf'}], chapters: [{title: 'One', authors: [ada.email]}, {title: 'Two'}]},
                O: {title: 'K2 Order Book', workType: 'editedVolume', contributors: [ada], chapters: [{title: 'Tides', authors: [`${P}au`, ada.email]}, {title: 'Harbours'}]},
                S: {title: 'K2 Side Book', contributors: [ada]},
                V: {title: 'K2 Version Book', decisions: prod, published: true, chapters: [{title: 'First Edition Chapter'}]},
                L: {title: 'K2 License Book', workType: 'editedVolume', decisions: prod, chapters: [{title: 'Own', licenseUrl: 'https://example.org/own-license'}, {title: 'Empty'}]},
                W1: {title: 'K2 Wizard Volume', workType: 'editedVolume', submitted: false},
                W2: {title: 'K2 Wizard Monograph', submitted: false},
            };
            S.B = {};
            for (const [k, b] of Object.entries(books)) {
                try {
                    const r = await app.api.createSubmission({tag: `${t}${k.toLowerCase()}`, context: P, submitter: `${P}au`, ...b});
                    S.B[k] = {id: r.submissionId, pub: r.publicationId || r.currentPublicationId || null, chapters: r.chapters || null, contributors: r.contributors || null, raw: Object.keys(r)};
                } catch (e) { S.errs[k] = flat(e.message, 600); }
                save();
            }
            // Press Q: DOIs for chapters, upon publication.
            try {
                const Q = `${t}q`;
                const q = await app.api.createContext({tag: Q, context: {name: `U72 K2 DOI press ${Q}`, contactName: 'Paula Principal', contactEmail: `principal${Q}@mail.test`},
                    enableDois: true, doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter'], doiCreationTime: 'publication',
                    users: [{username: `${Q}mg`, roles: ['manager']}, {username: `${Q}au`, roles: ['author']}]});
                S.Q = {path: q.path, mg: `${Q}mg`, au: `${Q}au`};
                const qp = await app.api.createSubmission({tag: `${Q}b`, context: Q, submitter: `${Q}au`, title: 'K2 DOI Book', decisions: prod, published: true,
                    chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}]});
                S.Q.book = {id: qp.submissionId, chapters: qp.chapters};
            } catch (e) { S.errs.Q = flat(e.message, 600); }
            save();
            // Press R: Publisher ID for chapters.
            try {
                const R = `${t}r`;
                const r = await app.api.createContext({tag: R, context: {name: `U72 K2 PubId press ${R}`, contactName: 'Paula Principal', contactEmail: `principal${R}@mail.test`},
                    enablePublisherId: ['chapter'], users: [{username: `${R}mg`, roles: ['manager']}, {username: `${R}au`, roles: ['author']}]});
                S.R = {path: r.path, mg: `${R}mg`, au: `${R}au`};
                const rb = await app.api.createSubmission({tag: `${R}b`, context: R, submitter: `${R}au`, title: 'K2 PubId Book', chapters: [{title: 'Tides'}]});
                S.R.book = {id: rb.submissionId};
            } catch (e) { S.errs.R = flat(e.message, 600); }
            save();
            // Presses L1 (forms en+fr, submission en+fr) and L2 (forms en, submission en+fr).
            for (const [k, forms] of [['L1', ['en', 'fr_CA']], ['L2', ['en']]]) {
                try {
                    const X = `${t}${k.toLowerCase()}`;
                    const c = await app.api.createContext({tag: X, context: {name: `U72 K2 lang press ${X}`, contactName: 'Paula Principal', contactEmail: `principal${X}@mail.test`,
                        primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: forms, supportedSubmissionLocales: ['en', 'fr_CA']},
                    users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]});
                    S[k] = {path: c.path, mg: `${X}mg`, au: `${X}au`, books: {}};
                    for (const loc of ['en', 'fr_CA']) {
                        const b = await app.api.createSubmission({tag: `${X}${loc.slice(0, 2)}`, context: X, submitter: `${X}au`, locale: loc,
                            title: loc === 'en' ? 'K2 English Book' : {fr_CA: 'Livre K2 français'}, chapters: [{title: loc === 'en' ? 'English Chapter' : {fr_CA: 'Chapitre français'}}]});
                        S[k].books[loc] = {id: b.submissionId};
                    }
                } catch (e) { S.errs[k] = flat(e.message, 600); }
                save();
            }
        } else {
            const X = t;
            const c = await app.api.createContext({tag: X, context: {name: `U72 K2 control ${X}`, contactName: 'Paula Principal', contactEmail: `principal${X}@mail.test`},
                users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]});
            S.X = {path: c.path, mg: `${X}mg`, au: `${X}au`};
            const s = await app.api.createSubmission({tag: `${X}s`, context: X, submitter: `${X}au`, title: 'K2 Control Submission'});
            const d = await app.api.createSubmission({tag: `${X}d`, context: X, submitter: `${X}au`, title: 'K2 Control Draft', submitted: false});
            S.X.sub = s.submissionId; S.X.draft = d.submissionId;
        }
        S.seeded = true;
        save();
        fact('seed', S);
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    // ------------------------------------------------------------------ browser, recorders
    const {page, close} = await launch(app);
    const bad = [], pageErrors = [], dialogs = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 200)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 300), url: strip(page.url())}));
    let dialogMode = 'accept';
    page.on('dialog', async (d) => { dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200), answered: d.type() === 'beforeunload' ? 'accept' : dialogMode}); if (dialogMode === 'dismiss' && d.type() !== 'beforeunload') await d.dismiss().catch(() => {}); else await d.accept().catch(() => {}); });
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = S.snapN || 0;
    async function snap(name, extra, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k2-${String(++snapN).padStart(3, '0')}-${name}`;
        S.snapN = snapN;
        record(n, s);
        if (png) await shot(page, n).catch(() => {});
        return n;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`, null, {png: true}).catch(() => {});
        }
        const b = since(bad, t0), pe = since(pageErrors, t0);
        if (b.length) fact(`${name}.http4xx5xx`, b);
        if (pe.length) fact(`${name}.pageErrors`, pe);
        const d = since(dialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
        save();
    }
    const vis = '[role="dialog"]:visible';
    const wf = () => page.locator(vis).first();
    const as = async (u, ctx) => { await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const wfUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const auUrl = (ctx, sid, key) => cu(ctx, `/dashboard/mySubmissions?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r; };

    /** The workflow of a book, at its current version's Chapters page (or `key`), editorial or author view. */
    async function openChapters(ctx, sid, {author = false, pubId = null, key = null} = {}) {
        const base = author ? auUrl : wfUrl;
        await go(base(ctx, sid, null));
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await sleep(600);
        const link = wf().getByRole('link', {name: key || 'Chapters', exact: true});
        const n = await link.count();
        if (!n) return {links: await menuLinks(), found: false};
        await link.last().click();
        await idle(page); await sleep(800);
        await grid().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
        return {found: true};
    }
    async function menuLinks() { return (await wf().locator('nav a, [role="navigation"] a').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean); }
    const grid = () => page.locator('[id^="component-grid-users-chapter-chaptergrid"]').first();
    /** The chapter grid as data: heading, top actions, category rows (chapters) with their author rows. */
    async function readGrid() {
        const g = grid();
        if (!(await g.count())) return {grid: false};
        return g.evaluate((root) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const out = {heading: t(root.querySelector('.header h4, h4, .pkp_controllers_grid .header')), actions: [...root.querySelectorAll('.header a, .header button, .actions a')].map((a) => t(a)).filter(Boolean),
                columns: [...root.querySelectorAll('thead th')].map(t), bodies: []};
            for (const tb of root.querySelectorAll('tbody')) {
                const rows = [...tb.querySelectorAll(':scope > tr')].filter((r) => r.offsetParent !== null);
                if (!rows.length) continue;
                out.bodies.push({cls: tb.className, rows: rows.map((r) => ({cls: r.className, id: r.id, text: t(r), links: [...r.querySelectorAll('a')].filter((a) => a.offsetParent !== null).map((a) => t(a) || a.title || a.className)}))});
            }
            out.text = t(root);
            return out;
        });
    }
    const chapterForm = () => page.locator('form#editChapterForm:visible').first();
    /** The chapter window's form as data. */
    async function readForm() {
        const f = chapterForm();
        await f.locator('input[name^="title["]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(700);
        const win = page.locator('.pkp_modal_panel:visible, [role="dialog"]:visible').filter({has: page.locator('form#editChapterForm')}).last();
        return {
            windowHeading: flat(await win.locator('h1, h2, .header').first().innerText().catch(() => null), 120),
            tabs: (await page.locator('#editChapterMetadataTabs [role="tab"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
            text: flat(await f.innerText().catch(() => ''), 2500),
            inputs: await f.evaluate((root) => [...root.querySelectorAll('input, textarea, select')].filter((e) => e.type !== 'hidden' || /datePublished/.test(e.name)).map((e) => ({name: e.name, type: e.type, value: e.type === 'checkbox' ? e.value : (e.value || '').slice(0, 300), checked: e.type === 'checkbox' ? e.checked : undefined, maxlength: e.getAttribute('maxlength'), visible: e.offsetParent !== null,
                label: e.type === 'checkbox' ? (e.closest('label') || e.parentElement).innerText.trim().slice(0, 200) : undefined}))).catch(() => []),
            labels: (await f.locator('label, legend, .label').allInnerTexts().catch(() => [])).map((x) => flat(x, 150)).filter(Boolean),
            buttons: (await f.locator('button:visible, a:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean),
        };
    }
    async function addChapterOpen() {
        await grid().getByRole('link', {name: 'Add Chapter'}).first().click();
        await chapterForm().locator('input[name^="title["]').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
    }
    async function editChapterOpen(title) {
        await grid().getByRole('link', {name: title, exact: true}).first().click();
        await chapterForm().locator('input[name^="title["]').first().waitFor({timeout: T});
        await idle(page); await sleep(700);
    }
    /** Press the form's Save; returns the update-chapter status and what the page shows after. */
    async function saveForm() {
        const r = page.waitForResponse((x) => x.request().method() === 'POST' && /update-chapter/i.test(x.url()), {timeout: T}).catch(() => null);
        await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        let body = null;
        try { body = resp ? flat(await resp.text(), 400) : null; } catch { /* */ }
        await idle(page); await sleep(900);
        const notices = (await page.locator('.pkp_notification, [role="status"], .pnotify, .ui-pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
        return {status: resp ? resp.status() : null, body, formStillOpen: await chapterForm().count() > 0, notices};
    }
    async function cancelForm() {
        await chapterForm().locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).first().click();
        await sleep(600);
        const leave = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: /changed|unsaved|Are you sure/i});
        const leaveText = (await leave.count()) ? flat(await leave.last().innerText(), 300) : null;
        return {leaveText, formStillOpen: await chapterForm().count() > 0};
    }
    const bookPub = (sid) => (db(`select current_publication_id from submissions where submission_id=${sid}`)[0] || '').trim();
    const chRows = (pub) => db(`select c.chapter_id, c.seq, (select string_agg(setting_name || ':' || coalesce(locale, '') || '=' || left(setting_value, 60), '; ' order by setting_name) from submission_chapter_settings where chapter_id=c.chapter_id), (select string_agg(a.author_id || '@' || a.seq, ',' order by a.seq) from submission_chapter_authors a where a.chapter_id=c.chapter_id) from submission_chapters c where c.publication_id=${pub} order by c.seq`);

    // ================================================================== explore (a first look; kept for re-runs)
    await sect('explore', async () => {
        const P = S.P, A = S.B.A;
        await as(P.mg, P.path);
        const o = await openChapters(P.path, A.id);
        const g = await readGrid();
        const html = await grid().evaluate((e) => e.outerHTML.slice(0, 12000)).catch(() => null);
        await snap('explore-grid-mg', {o, g, html}, {png: true});
    });

    /** Open a row's hidden controls (the "Settings" arrow) and return the visible link texts of its control row. */
    async function rowControls(title) {
        const row = grid().locator('tr.gridRow').filter({has: page.getByRole('link', {name: title, exact: true})}).first();
        const plainRow = grid().locator('tr.gridRow').filter({hasText: title}).first();
        const r = (await row.count()) ? row : plainRow;
        const arrow = r.locator('a.show_extras');
        const out = {arrow: await arrow.count()};
        if (out.arrow) {
            await arrow.first().click(); await sleep(500);
            const ctl = page.locator(`#${await r.getAttribute('id')}-control-row`);
            out.controls = (await ctl.locator('a:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        }
        return out;
    }
    const titleIsLink = async (title) => grid().getByRole('link', {name: title, exact: true}).count();

    // ================================================================== roles: the list as each permission level sees it
    await sect('roles', async () => {
        if (!isOMP) return;
        const P = S.P, A = S.B.A;
        const who = [['mg', P.mg, false], ['se', P.se, false], ['sn', P.sn, false], ['le', P.le, false], ['admin', 'admin', false], ['au', P.au, true]];
        const res = {};
        for (const [k, u, author] of who) {
            await as(u, P.path);
            const o = await openChapters(P.path, A.id, {author});
            const g = await readGrid();
            const r = {o, heading: g.heading, actions: g.actions, columns: g.columns, text: g.text, tidesLink: await titleIsLink('Tides'), harboursLink: await titleIsLink('Harbours')};
            if (g.grid !== false) r.tidesControls = await rowControls('Tides');
            r.pageHeading = flat(await wf().locator('h1, h2').allInnerTexts().catch(() => []), 300);
            r.snap = await snap(`roles-${k}-list`, r, {png: k === 'au' || k === 'le' || k === 'sn'});
            await loc(page, `Chapters page grid (${k})`, grid());
            res[k] = r;
        }
        fact('roles', res);
        // The Role column: Ada made a Volume editor too, on the Contributors page.
        await as(P.mg, P.path);
        const {ContributorsScreen} = require(path.resolve(__dirname, '../../../../../apps/omp/playwright/pages/ContributorPages.js'));
        await openChapters(P.path, A.id, {key: 'Contributors'});
        await sleep(800);
        const cs = new ContributorsScreen(page);
        const dlg = await cs.openRowEdit('Ada Lovel');
        await idle(page); await sleep(800);
        await cs.setRole(dlg, 'Volume editor', true);
        await snap('roles-ada-edit-volume-editor', null);
        await cs.savePanel(dlg);
        await sleep(600);
        await snap('roles-contributors-after', {rows: (await cs.rows().allInnerTexts()).map((x) => flat(x, 200))});
        await openChapters(P.path, A.id);
        const g2 = await readGrid();
        await snap('roles-mg-list-after-volume-editor', {g2}, {png: true});
        fact('roles.roleColumn', g2.text);
        // "No Items" under a list whose every chapter has authors: tick Ada on Harbours.
        await editChapterOpen('Harbours');
        const f = await readForm();
        await snap('roles-harbours-window', {f});
        const box = chapterForm().locator('input[name="authors[]"]').filter({has: page.locator('xpath=.')}).nth(1);
        const boxes = chapterForm().locator('input[name="authors[]"]');
        for (let i = 0; i < await boxes.count(); i++) {
            const lab = await boxes.nth(i).evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim());
            if (/Ada/.test(lab)) await boxes.nth(i).check();
        }
        void box;
        const sv = await saveForm();
        const g3 = await readGrid();
        await snap('roles-mg-list-all-chapters-have-authors', {sv, g3}, {png: true});
        fact('roles.noItemsWhenAllHaveAuthors', {sv, text: g3.text});
    });

    // ================================================================== window: "Add Chapter" / "Edit Chapter", Save, Cancel, adding at the end
    await sect('window', async () => {
        if (!isOMP) return;
        const P = S.P, A = S.B.A, E = S.B.E;
        await as(P.mg, P.path);
        // Book E: empty list.
        await openChapters(P.path, E.id);
        const g0 = await readGrid();
        await snap('window-e-empty-list', {g0}, {png: true});
        await addChapterOpen();
        const fAdd = await readForm();
        await snap('window-e-add-window', {fAdd}, {png: true});
        await loc(page, 'Add Chapter window form', chapterForm());
        // Cancel with a typed title: dialog on the way out? then reopen.
        await chapterForm().locator('input[name="title[en]"]').fill('Typed then cancelled');
        await chapterForm().locator('input[name="pages"]').fill('9-9');
        await chapterForm().locator('input[name="pages"]').blur();
        const c1 = await cancelForm();
        await snap('window-e-after-cancel', {c1});
        if (c1.formStillOpen) {
            // a confirmation asked: record and accept it
            const yes = page.locator('[role="dialog"]:visible').getByRole('button', {name: /^(Yes|OK)$/}).last();
            if (await yes.count()) { await yes.click(); await sleep(600); }
        }
        const gC = await readGrid();
        await addChapterOpen();
        const fReopen = await readForm();
        await snap('window-e-reopen-after-cancel', {gC, titleValue: fReopen.inputs.find((i) => i.name === 'title[en]')});
        // The window's own close control ("Close Panel") with changes.
        await chapterForm().locator('input[name="title[en]"]').fill('Typed then closed');
        await chapterForm().locator('input[name="title[en]"]').blur();
        const closeBtn = page.locator('.pkp_modal_panel:visible, [role="dialog"]:visible').filter({has: page.locator('form#editChapterForm')}).last().locator('button, a').filter({hasText: /Close/}).first();
        const closeLabel = flat(await closeBtn.innerText().catch(() => null) || await closeBtn.getAttribute('aria-label').catch(() => null), 60);
        await closeBtn.click().catch(() => {});
        await sleep(700);
        const leaveDlg = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: /changed|unsaved|leave/i});
        const leave = (await leaveDlg.count()) ? flat(await leaveDlg.last().innerText(), 300) : null;
        await snap('window-e-close-with-changes', {closeLabel, leave, formStillOpen: await chapterForm().count()});
        if (leave) { const y = leaveDlg.last().getByRole('button', {name: /^(Yes|OK)$/}).first(); if (await y.count()) await y.click(); await sleep(600); }
        if (await chapterForm().count()) { await cancelForm().catch(() => {}); }
        // Add "Alpha", then "Beta": order at the end.
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Alpha');
        const s1 = await saveForm();
        const g1 = await readGrid();
        await snap('window-e-after-alpha', {s1, g1}, {png: true});
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Beta');
        await chapterForm().locator('input[name="subtitle[en]"]').fill('Beta Subtitle');
        const s2 = await saveForm();
        const g2 = await readGrid();
        await snap('window-e-after-beta', {s2, g2}, {png: true});
        await openChapters(P.path, E.id);
        const g2r = await readGrid();
        await snap('window-e-after-beta-reload', {g2r});
        // Edit Alpha's title: the list shows it at once, without the subtitle.
        await editChapterOpen('Alpha');
        const fEdit = await readForm();
        await snap('window-e-edit-alpha', {fEdit}, {png: true});
        await chapterForm().locator('input[name="title[en]"]').fill('Alpha Edited');
        const s3 = await saveForm();
        const g3 = await readGrid();
        await snap('window-e-after-edit', {s3, g3});
        fact('window.e', {g0: g0.text, fAdd: {heading: fAdd.windowHeading, tabs: fAdd.tabs, text: fAdd.text, labels: fAdd.labels, buttons: fAdd.buttons, inputs: fAdd.inputs}, c1, closeLabel, leave, reopenTitle: fReopen.inputs.find((i) => i.name === 'title[en]'), s1, g1: g1.text, s2, g2: g2.text, g2r: g2r.text, fEdit: {heading: fEdit.windowHeading, tabs: fEdit.tabs}, s3, g3: g3.text});
        // Book A: "Edit Chapter" on an Edited Volume with authors and a file.
        await openChapters(P.path, A.id);
        await editChapterOpen('Tides');
        const fA = await readForm();
        await snap('window-a-edit-tides', {fA}, {png: true});
        await loc(page, 'Edit Chapter tabs', page.locator('#editChapterMetadataTabs [role="tab"]'));
        fact('window.a', {heading: fA.windowHeading, tabs: fA.tabs, text: fA.text, inputs: fA.inputs});
        await cancelForm();
    });

    // ================================================================== leave: Cancel and Close with something typed, each answered both ways
    await sect('leave', async () => {
        if (!isOMP) return;
        const P = S.P, E = S.B.E;
        await as(P.mg, P.path);
        const r = {};
        const closeCtl = () => page.locator('.pkp_modal_panel:visible, [role="dialog"]:visible').filter({has: page.locator('form#editChapterForm')}).last().locator('button, a').filter({hasText: /^\s*Close\s*$/}).first();
        for (const how of ['cancel', 'close', 'cancel-untouched']) {
            for (const mode of how === 'cancel-untouched' ? ['accept'] : ['dismiss', 'accept']) {
                await openChapters(P.path, E.id);
                await addChapterOpen();
                if (how !== 'cancel-untouched') { await chapterForm().locator('input[name="title[en]"]').fill(`Leave ${how} ${mode}`); await chapterForm().locator('input[name="title[en]"]').blur(); }
                dialogMode = mode;
                const t0 = Date.now();
                if (how === 'close') await closeCtl().click(); else await chapterForm().locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).first().click();
                await sleep(900);
                dialogMode = 'accept';
                const k = `${how}-${mode}`;
                r[k] = {dialogs: since(dialogs, t0), formStillOpen: await chapterForm().count(), titleKept: (await chapterForm().count()) ? await chapterForm().locator('input[name="title[en]"]').inputValue() : null};
                await snap(`leave-${k}`, r[k]);
                if (await chapterForm().count()) { await chapterForm().locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).first().click(); await sleep(800); }
                r[k].gridAfter = (await readGrid()).text;
            }
        }
        fact('leave', r);
    });

    // ================================================================== title (td6), subtitle, pages, abstract
    await sect('title', async () => {
        if (!isOMP) return;
        const P = S.P, E = S.B.E;
        await as(P.mg, P.path);
        await openChapters(P.path, E.id);
        const before = await readGrid();
        await addChapterOpen();
        const s0 = await saveForm();
        const errs = (await page.locator('form#editChapterForm label.error:visible, form#editChapterForm .error:visible, .pkp_form_error:visible, #chapterFormNotification:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        const n0 = await snap('title-empty-save', {s0, errs}, {png: true});
        const after = await readGrid();
        fact('title.empty', {s0, errs, listBefore: before.text, listAfter: after.text, snap: n0});
        // 300 characters.
        const long = 'L'.repeat(300);
        const tb = chapterForm().locator('input[name="title[en]"]');
        await tb.click(); await page.keyboard.type(long, {delay: 0});
        const typedLen = (await tb.inputValue()).length;
        const sb = chapterForm().locator('input[name="subtitle[en]"]');
        await sb.click(); await page.keyboard.type('S'.repeat(300), {delay: 0});
        const subLen = (await sb.inputValue()).length;
        await chapterForm().locator('input[name="pages"]').fill('not pages !! ?? xii–iv');
        const abs = await chapterForm().locator('textarea[name^="abstract"]').evaluateAll((els) => els.map((e) => ({name: e.name, id: e.id, rich: !!(window.tinymce && window.tinymce.get(e.id))})));
        const toolbar = await chapterForm().locator('.tox-toolbar__primary button, .tox-tbtn').count();
        await snap('title-300', {typedLen, subLen, abs, toolbar}, {png: true});
        const s1 = await saveForm();
        const g1 = await readGrid();
        await snap('title-300-saved', {s1, g1});
        const longTitle = g1.text.match(/L{10,}/);
        fact('title.300', {typedLen, subLen, abs, toolbar, s1, savedLen: longTitle ? longTitle[0].length : null});
        // Pages reopened.
        if (longTitle) {
            await editChapterOpen(longTitle[0]);
            const f = await readForm();
            fact('title.pagesReopened', f.inputs.filter((i) => /pages|title|subtitle/.test(i.name)).map((i) => ({name: i.name, len: (i.value || '').length, value: i.name === 'pages' ? i.value : undefined})));
            await snap('title-300-reopened', {f});
            await cancelForm();
        }
        // Languages: L1 (forms en+fr), L2 (forms en only), English and French books.
        for (const k of ['L1', 'L2']) {
            const X = S[k];
            if (!X) continue;
            await as(X.mg, X.path);
            for (const [lc, b] of Object.entries(X.books || {})) {
                await openChapters(X.path, b.id);
                const g = await readGrid();
                await addChapterOpen();
                const f = await readForm();
                const titleBoxes = f.inputs.filter((i) => /^title\[/.test(i.name)).map((i) => ({name: i.name, visible: i.visible}));
                // focus the first title box to open the other language's twin
                await chapterForm().locator('input[name^="title["]').first().click();
                await sleep(400);
                const shownAfterFocus = await chapterForm().locator('input[name^="title["]:visible').evaluateAll((els) => els.map((e) => e.name));
                const langLabels = await chapterForm().locator('.localization_popover label, .pkp_form_localization label, .multilingual_popover label').allInnerTexts().catch(() => []);
                await snap(`title-${k}-${lc}-add-window`, {g: g.text, titleBoxes, shownAfterFocus, langLabels}, {png: true});
                const r = {titleBoxes, shownAfterFocus};
                const other = lc === 'en' ? 'fr_CA' : 'en';
                const otherBox = chapterForm().locator(`input[name="title[${other}]"]`);
                if (await otherBox.count()) {
                    await chapterForm().locator('input[name^="title["]').first().click();
                    await otherBox.fill(other === 'fr_CA' ? 'Épilogue' : 'Epilogue', {force: true}).catch(async () => { await otherBox.evaluate((e, v) => { e.value = v; }, other === 'fr_CA' ? 'Épilogue' : 'Epilogue'); });
                    r.onlyOther = await saveForm();
                    r.onlyOtherErrs = (await page.locator('form#editChapterForm label.error:visible, form#editChapterForm .error:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
                    await snap(`title-${k}-${lc}-only-${other}`, r, {png: true});
                    // then the book's own language too
                    if (await chapterForm().count()) {
                        await chapterForm().locator(`input[name="title[${lc}]"]`).fill(lc === 'en' ? 'Epilogue EN' : 'Épilogue FR', {force: true});
                        r.both = await saveForm();
                    }
                } else {
                    await chapterForm().locator(`input[name="title[${lc}]"]`).fill(lc === 'en' ? 'Epilogue EN' : 'Épilogue FR');
                    r.own = await saveForm();
                }
                const g2 = await readGrid();
                r.listAfter = g2.text;
                await snap(`title-${k}-${lc}-after`, r);
                fact(`title.lang.${k}.${lc}`, r);
                if (await chapterForm().count()) await cancelForm().catch(() => {});
            }
        }
    });

    // ================================================================== fields: Date Published (line 86), License URL (87), Chapter Page (88)
    await sect('fields', async () => {
        if (!isOMP) return;
        const P = S.P, A = S.B.A, E = S.B.E;
        await as(P.mg, P.path);
        const readDateBox = async () => {
            const f = await readForm();
            return {date: f.inputs.filter((i) => /datePublished/.test(i.name)), dateLabel: f.labels.filter((l) => /Date Published/i.test(l)), license: f.inputs.filter((i) => i.name === 'licenseUrl'), text: f.text};
        };
        const pubDates = async (choice) => {
            await openChapters(P.path, E.id, {key: 'Publication Dates'});
            await page.getByRole('radio', {name: 'Each chapter may have its own publication date.'}).waitFor({timeout: T});
            await idle(page); await sleep(500);
            const checked = await page.locator('input[type=radio]:checked').evaluateAll((els) => els.map((e) => e.value));
            let st = null;
            if (choice) {
                await page.getByRole('radio', {name: choice}).check();
                const pd = page.waitForResponse((r) => /submissions\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await pd; st = r ? r.status() : null;
                await idle(page); await sleep(500);
            }
            return {checked, st};
        };
        const r = {};
        r.none = await pubDates(null);
        await openChapters(P.path, E.id);
        await editChapterOpen((await grid().locator('a.pkp_linkaction_editChapter').first().innerText()).trim());
        r.noneWin = await readDateBox();
        await snap('fields-date-none', r.noneWin);
        await cancelForm();
        r.each = await pubDates('Each chapter may have its own publication date.');
        await openChapters(P.path, E.id);
        const firstTitle = (await grid().locator('a.pkp_linkaction_editChapter').first().innerText()).trim();
        await editChapterOpen(firstTitle);
        r.eachWin = await readDateBox();
        // the date picker
        const dp = chapterForm().locator('input[id^="datePublished"]:visible').first();
        if (await dp.count()) {
            await dp.click(); await sleep(500);
            r.picker = await page.locator('#ui-datepicker-div').isVisible().catch(() => false);
            await snap('fields-date-picker-open', {picker: r.picker}, {png: true});
            await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete'); await page.keyboard.type('2024-05-01'); await page.keyboard.press('Tab');
            r.dateSave = await saveForm();
        } else {
            await cancelForm();
        }
        await snap('fields-date-each', r.eachWin);
        r.all = await pubDates('All chapters will use the publication date of the monograph.');
        await openChapters(P.path, E.id);
        await editChapterOpen(firstTitle);
        r.allWin = await readDateBox();
        await snap('fields-date-all', r.allWin, {png: true});
        await cancelForm();
        // License URL: Edited Volume (A) vs Monograph (E)
        await openChapters(P.path, A.id);
        await editChapterOpen('Harbours');
        r.evWin = await readDateBox();
        r.evLicenseText = flat(await chapterForm().locator('.pkpFormField__description').allInnerTexts().catch(() => []), 400);
        r.evLicenseHref = await chapterForm().locator('.pkpFormField__description a').evaluateAll((els) => els.map((a) => a.href)).catch(() => []);
        await snap('fields-license-ev', {evWin: r.evWin, evLicenseText: r.evLicenseText, evLicenseHref: r.evLicenseHref}, {png: true});
        await cancelForm();
        fact('fields', r);
    });

    const boxList = async (name) => (await readForm()).inputs.filter((i) => i.name === name).map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.label}`);
    async function tickBoxes(name, labels, {only = false} = {}) {
        const boxes = chapterForm().locator(`input[name="${name}"]`);
        for (let i = 0; i < await boxes.count(); i++) {
            const lab = await boxes.nth(i).evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim());
            const want = labels.some((l) => lab.includes(l));
            if (want) await boxes.nth(i).check();
            else if (only) await boxes.nth(i).uncheck();
        }
    }
    async function contributorsPage(ctx, sid) {
        const {ContributorsScreen} = require(path.resolve(__dirname, '../../../../../apps/omp/playwright/pages/ContributorPages.js'));
        await openChapters(ctx, sid, {key: 'Contributors'});
        await page.locator('.contributorsListPanel').waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(600);
        return new ContributorsScreen(page);
    }

    // ================================================================== authors (td7, td10, Rule 6)
    await sect('authors', async () => {
        if (!isOMP) return;
        const P = S.P, C = S.B.C, N = S.B.N;
        await as(P.mg, P.path);
        const r = {};
        await openChapters(P.path, C.id);
        await addChapterOpen();
        r.addOffered = await boxList('authors[]');
        await chapterForm().locator('input[name="title[en]"]').fill('Tides');
        await tickBoxes('authors[]', ['Ben']);
        r.saveBenOnly = await saveForm();
        r.gridBen = (await readGrid()).text;
        await editChapterOpen('Tides');
        r.reopenBen = await boxList('authors[]');
        await snap('authors-c-reopen-ben', {reopenBen: r.reopenBen}, {png: true});
        await tickBoxes('authors[]', ['Ada']);
        r.saveAda = await saveForm();
        r.gridBenAda = await readGrid();
        await snap('authors-c-ben-then-ada', {g: r.gridBenAda}, {png: true});
        await editChapterOpen('Tides');
        r.reopenBenAda = await boxList('authors[]');
        await cancelForm();
        // a chapter with no authors
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Harbours');
        await tickBoxes('authors[]', [], {only: true});
        r.saveNoAuthors = await saveForm();
        r.gridNoAuthors = (await readGrid()).text;
        await snap('authors-c-no-authors', {g: r.gridNoAuthors});
        // td10: delete Ben on the Contributors page
        const cs = await contributorsPage(P.path, C.id);
        r.contribBefore = (await cs.rows().allInnerTexts()).map((x) => flat(x, 150));
        await cs.deleteContributor('Ben Barrow');
        r.contribAfter = (await cs.rows().allInnerTexts()).map((x) => flat(x, 150));
        await snap('authors-c-ben-deleted', {contribAfter: r.contribAfter});
        await openChapters(P.path, C.id);
        r.gridAfterBenDeleted = await readGrid();
        await snap('authors-c-list-after-ben-deleted', {g: r.gridAfterBenDeleted}, {png: true});
        await editChapterOpen('Tides');
        r.reopenAfterBenDeleted = await boxList('authors[]');
        await snap('authors-c-window-after-ben-deleted', {boxes: r.reopenAfterBenDeleted});
        await cancelForm();
        // Book N: the Contributors list emptied, then "Add Chapter"
        const cn = await contributorsPage(P.path, N.id);
        r.nBefore = (await cn.rows().allInnerTexts()).map((x) => flat(x, 150));
        try {
            const dlg = await cn.openRowDelete('Alma Author');
            r.nDeleteDialog = flat(await dlg.innerText(), 300);
            await cn.confirmDelete(dlg, 'Alma Author');
        } catch (e) { r.nDeleteErr = flat(e.message, 300); }
        r.nAfter = (await cn.rows().allInnerTexts().catch(() => [])).map((x) => flat(x, 150));
        await snap('authors-n-contributors-emptied', {nAfter: r.nAfter}, {png: true});
        await openChapters(P.path, N.id);
        await addChapterOpen();
        const fN = await readForm();
        r.nWindow = {labels: fN.labels, authorBoxes: fN.inputs.filter((i) => i.name === 'authors[]').length, text: fN.text};
        await snap('authors-n-add-window', {fN}, {png: true});
        await chapterForm().locator('input[name="title[en]"]').fill('Lonely');
        r.nSave = await saveForm();
        r.nGrid = (await readGrid()).text;
        fact('authors', r);
    });

    // ================================================================== files (td8, Rule 7)
    await sect('files', async () => {
        if (!isOMP) return;
        const P = S.P, F = S.B.F, A = S.B.A;
        await as(P.mg, P.path);
        const r = {};
        const fx = (n) => path.resolve(__dirname, `../../../../../apps/omp/playwright/fixtures/files/${n}`);
        // A discussion with an attachment on the Submission ("Desk Review") stage.
        if (!S.fDisc) {
            await go(wfUrl(P.path, F.id, null));
            await wf().waitFor({timeout: T});
            await sleep(800);
            const subLink = wf().getByRole('link', {name: 'Submission', exact: true}).first();
            await subLink.click(); await idle(page); await sleep(1000);
            r.stageHeadings = flat(await wf().locator('h2, h3').allInnerTexts().catch(() => []), 400);
            const add = wf().getByRole('button', {name: 'Add', exact: true}).last();
            r.addCount = await wf().getByRole('button', {name: 'Add', exact: true}).count();
            await add.click(); await idle(page); await sleep(1200);
            const w = page.locator(vis).last();
            await w.locator('input[name="title"]').fill('K2 discussion with file');
            // tick the author among participants
            const boxes = w.locator('input[name="participants"]');
            for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check().catch(() => {});
            const ed = await w.locator('textarea').first().getAttribute('id').catch(() => null);
            if (ed) await page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, ed, {timeout: 20000}).catch(() => {});
            await w.frameLocator('iframe').first().locator('body').click().catch(() => {});
            await page.keyboard.type('A message with a file.');
            await w.getByRole('button', {name: 'Attach Files'}).click(); await idle(page); await sleep(800);
            const up = page.getByRole('dialog').last();
            const upBtn = up.getByRole('button', {name: /Upload File/}).or(up.getByRole('tab', {name: /Upload File/})).first();
            if (await upBtn.count()) { await upBtn.click().catch(() => {}); await idle(page); }
            await page.locator('input[type="file"]').last().setInputFiles(fx('figure.png'));
            await sleep(1500); await idle(page);
            await snap('files-f-attach-uploaded', null, {png: true});
            const attachBtn = page.getByRole('dialog').last().getByRole('button', {name: /^Attach/});
            if (await attachBtn.count()) { await attachBtn.last().click().catch(() => {}); await idle(page); }
            await sleep(600);
            await snap('files-f-discussion-window', null, {png: true});
            const saved = page.waitForResponse((x) => /tasks|queries|edit-tasks|editTasks/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await w.getByRole('button', {name: /^(Save|Create)$/}).last().click();
            const sr = await saved; r.discSave = sr ? sr.status() : null;
            await idle(page); await sleep(1200);
            await snap('files-f-discussion-saved', {discSave: r.discSave}, {png: true});
            S.fDisc = true; save();
        }
        // A Production Ready file, on the Production stage.
        if (!S.fProd) {
            await go(wfUrl(P.path, F.id, null));
            await wf().waitFor({timeout: T}); await sleep(800);
            await wf().getByRole('link', {name: 'Production', exact: true}).first().click(); await idle(page); await sleep(1200);
            const dlg = wf();
            const sec = dlg.locator('div, section').filter({has: page.getByRole('table', {name: 'Production Ready Files', exact: true})}).filter({has: page.getByRole('button', {name: 'Upload', exact: true})}).last();
            let upb = sec.getByRole('button', {name: 'Upload', exact: true}).first();
            if (!(await upb.count())) upb = dlg.getByRole('button', {name: 'Upload', exact: true}).last();
            await upb.click(); await idle(page);
            const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
            await wiz.waitFor({timeout: T});
            await wiz.locator('select').first().waitFor({timeout: T});
            await idle(page); await sleep(800);
            const genre = wiz.locator('select').first();
            const opts = await genre.locator('option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value})));
            r.prodComponents = opts.map((o) => o.text);
            const pick = opts.find((o) => o.text === 'Chapter Manuscript') || opts.find((o) => o.value);
            await genre.selectOption(pick.value);
            await sleep(500);
            await wiz.locator('input[type="file"]').first().setInputFiles(fx('notes.md'));
            await sleep(1500);
            await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Continue' && x.getClientRects().length); return b && !b.disabled; }, null, {timeout: 30000}).catch(() => {});
            await wiz.getByRole('button', {name: 'Continue', exact: true}).click(); await idle(page); await sleep(500);
            await wiz.getByRole('button', {name: 'Continue', exact: true}).click(); await idle(page); await sleep(500);
            await wiz.getByRole('button', {name: 'Complete', exact: true}).click(); await idle(page);
            await wiz.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(800);
            await snap('files-f-production-ready', null, {png: true});
            S.fProd = true; save();
        }
        // The chapter window's "Files".
        await openChapters(P.path, F.id);
        await editChapterOpen('Files Chapter');
        r.offered = await boxList('files[]');
        await snap('files-f-window', {offered: r.offered}, {png: true});
        await loc(page, 'Chapter window Files boxes', chapterForm().locator('input[name="files[]"]'));
        await cancelForm();
        r.fileRows = db(`select sf.submission_file_id, sf.file_stage, sf.assoc_type, sf.genre_id, sf.source_submission_file_id, (select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and setting_name='name' limit 1), (select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and setting_name='chapterId' limit 1) from submission_files sf where sf.submission_id=${F.id} order by sf.submission_file_id`);
        // Book A: Harbours is not offered Tides' file.
        await openChapters(P.path, A.id);
        await editChapterOpen('Harbours');
        r.aHarbours = await boxList('files[]');
        await cancelForm();
        await editChapterOpen('Tides');
        r.aTides = await boxList('files[]');
        await cancelForm();
        // Book E: no file at all.
        await openChapters(P.path, S.B.E.id);
        const first = (await grid().locator('a.pkp_linkaction_editChapter').first().innerText().catch(() => '')).trim();
        if (first) { await editChapterOpen(first); const f = await readForm(); r.eLabels = f.labels; r.eFiles = f.inputs.filter((i) => i.name === 'files[]').length; await cancelForm(); }
        fact('files', r);
    });

    // ================================================================== deletes (td9, Rule 9)
    await sect('deletes', async () => {
        if (!isOMP) return;
        const P = S.P, D = S.B.D;
        await as(P.mg, P.path);
        const r = {};
        await openChapters(P.path, D.id);
        await editChapterOpen('One');
        r.oneBefore = await boxList('files[]');
        await tickBoxes('files[]', ['article.pdf']);
        r.oneSave = await saveForm();
        await editChapterOpen('Two');
        r.twoWhileOneHolds = await boxList('files[]');
        await snap('deletes-two-while-one-holds', {two: r.twoWhileOneHolds});
        await cancelForm();
        // Delete › Cancel
        r.ctl = await rowControls('One');
        await grid().locator('a.pkp_linkaction_deleteChapter:visible').first().click();
        await sleep(700);
        const cd = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: 'Are you sure'}).last();
        await cd.waitFor({timeout: T});
        r.dialog = {text: flat(await cd.innerText(), 400), buttons: (await cd.locator('button:visible, a:visible').allInnerTexts()).map((x) => flat(x, 40)), heading: flat(await cd.locator('h1, h2, .header, [id$="title"]').first().innerText().catch(() => null), 80)};
        await snap('deletes-dialog', r.dialog, {png: true});
        await loc(page, 'Delete confirmation', cd);
        await cd.locator('button, a').filter({hasText: /^\s*Cancel\s*$/}).first().click();
        await sleep(700);
        r.afterCancel = (await readGrid()).text;
        // Delete › OK
        await rowControls('One');
        await grid().locator('a.pkp_linkaction_deleteChapter:visible').first().click();
        await sleep(700);
        const cd2 = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: 'Are you sure'}).last();
        const del = page.waitForResponse((x) => /delete-chapter/i.test(x.url()), {timeout: T}).catch(() => null);
        await cd2.getByRole('button', {name: 'OK', exact: true}).click();
        const dr = await del; r.deleteStatus = dr ? dr.status() : null;
        await idle(page); await sleep(900);
        r.afterOkSamePage = await readGrid();
        r.noticesAfterOk = (await page.locator('.pkp_notification, [role="status"], .pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 150)).filter(Boolean);
        await snap('deletes-after-ok', {g: r.afterOkSamePage, notices: r.noticesAfterOk}, {png: true});
        await openChapters(P.path, D.id);
        r.afterOkReload = (await readGrid()).text;
        await editChapterOpen('Two');
        r.twoAfterDelete = await boxList('files[]');
        r.twoAuthorsAfterDelete = await boxList('authors[]');
        await snap('deletes-two-after-delete', {files: r.twoAfterDelete, authors: r.twoAuthorsAfterDelete});
        await cancelForm();
        const cs = await contributorsPage(P.path, D.id);
        r.contributors = (await cs.rows().allInnerTexts()).map((x) => flat(x, 150));
        await snap('deletes-contributors-after', {c: r.contributors});
        fact('deletes', r);
    });

    // ================================================================== order (td11, Rule 8)
    async function dragTo(from, to, {below = false} = {}) {
        await from.scrollIntoViewIfNeeded().catch(() => {});
        const a = await from.boundingBox(); const b = await to.boundingBox();
        if (!a || !b) return {noBox: true, a: !!a, b: !!b};
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 6, {steps: 5});
        const ty = below ? b.y + b.height + 4 : b.y + 2;
        await page.mouse.move(b.x + b.width / 2, ty, {steps: 25});
        await sleep(300);
        await page.mouse.up();
        await sleep(600);
        return {a, b};
    }
    /** Drag a chapter (its row handle) above another chapter, trying a few drop points until the order changes. */
    async function dragChapterAbove(title, aboveTitle) {
        const tries = [];
        for (const dy of [-12, -30, 4, -2]) {
            const before = await chapterOrder();
            const h = grid().locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: title})}).first().locator('td').first();
            const target = grid().locator('tbody').filter({has: page.locator('tr.gridRow', {hasText: aboveTitle})}).first();
            await h.scrollIntoViewIfNeeded().catch(() => {});
            const a = await h.boundingBox(); const b = await target.boundingBox();
            if (!a || !b) { tries.push({dy, noBox: true}); continue; }
            const sx = a.x + a.width - 30;
            await page.mouse.move(sx, a.y + a.height / 2);
            await page.mouse.down();
            await page.mouse.move(sx, a.y + a.height / 2 - 5, {steps: 5});
            await page.mouse.move(sx, b.y + dy, {steps: 30});
            await sleep(400);
            await page.mouse.up();
            await sleep(700);
            const after = await chapterOrder();
            tries.push({dy, before, after});
            if (JSON.stringify(before) !== JSON.stringify(after)) break;
        }
        return tries;
    }
    const chapterOrder = async () => grid().locator('a.pkp_linkaction_editChapter').allInnerTexts().then((x) => x.map((s) => s.trim())).catch(() => []);
    const orderMode = async () => grid().evaluate((root) => ({
        handles: [...root.querySelectorAll('.pkp_linkaction_moveItem, .ui-sortable-handle, [class*="orderable"] .handle')].filter((e) => e.offsetParent !== null).length,
        buttons: [...root.querySelectorAll('a, button')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()).filter(Boolean),
        text: root.innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
    }));
    const seqPosts = [];
    page.on('request', (q) => { if (/save-sequence/i.test(q.url())) seqPosts.push({at: Date.now(), url: strip(q.url()).slice(0, 200), body: (q.postData() || '').slice(0, 800)}); });
    page.on('response', async (q) => { if (/save-sequence/i.test(q.url())) { const t = await q.text().catch(() => ''); seqPosts.push({at: Date.now(), status: q.status(), resp: flat(t, 300)}); } });
    await sect('order', async () => {
        if (!isOMP) return;
        const P = S.P, O = S.B.O;
        await as(P.mg, P.path);
        const r = {};
        const t0 = Date.now();
        r.dbBefore = chRows(bookPub(O.id));
        await openChapters(P.path, O.id);
        r.before = await chapterOrder();
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click();
        await sleep(800);
        r.mode = await orderMode();
        await snap('order-mode', r.mode, {png: true});
        const html = await grid().evaluate((e) => e.outerHTML.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\s+/g, ' ').slice(0, 6000));
        record('k2-order-mode-html', {html});
        const handle = (title) => grid().locator('tr.gridRow').filter({hasText: title}).first().locator('a.pkp_linkaction_moveItem').first();
        r.drag1 = await dragChapterAbove('Harbours', 'Tides');
        r.afterDrag = await chapterOrder();
        await snap('order-after-drag', {afterDrag: r.afterDrag}, {png: true});
        const saveSeq = page.waitForResponse((x) => /save-sequence/i.test(x.url()), {timeout: 15000}).catch(() => null);
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        const ss = await saveSeq; r.doneStatus = ss ? ss.status() : null;
        await idle(page); await sleep(900);
        r.afterDone = await chapterOrder();
        await openChapters(P.path, O.id);
        r.afterDoneReload = await chapterOrder();
        await snap('order-after-done-reload', {r: r.afterDoneReload});
        // Order again, drag back, Cancel ordering.
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        r.drag2 = await dragChapterAbove('Tides', 'Harbours');
        r.afterDrag2 = await chapterOrder();
        await grid().getByRole('link', {name: 'Cancel ordering', exact: true}).or(grid().getByRole('button', {name: 'Cancel ordering', exact: true})).first().click();
        await sleep(900);
        r.afterCancelSamePage = await chapterOrder();
        await openChapters(P.path, O.id);
        r.afterCancelReload = await chapterOrder();
        await snap('order-after-cancel-reload', {r: r.afterCancelReload});
        // Authors under Tides: second above first.
        const tidesAuthors = async () => (await readGrid()).text;
        r.authorsBefore = await tidesAuthors();
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const authorRow = (name) => grid().locator('tr.gridRow').filter({hasText: name}).first();
        r.drag3 = await dragTo(authorRow('Ada Lovel').locator('a.pkp_linkaction_moveItem, td').first(), authorRow('Alma Author'));
        r.authorsAfterDrag = await tidesAuthors();
        await snap('order-authors-after-drag', {t: r.authorsAfterDrag}, {png: true});
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(900);
        await openChapters(P.path, O.id);
        r.authorsAfterReload = await tidesAuthors();
        await editChapterOpen('Tides');
        r.windowAfterAuthorOrder = await boxList('authors[]');
        await cancelForm();
        await snap('order-authors-after-reload', {t: r.authorsAfterReload, w: r.windowAfterAuthorOrder}, {png: true});
        r.db = chRows(bookPub(O.id));
        r.seqPosts = since(seqPosts, t0);
        fact('order', r);
    });

    // ================================================================== order2: a fresh book, three chapter authors, the chapter drag from the row's cell
    await sect('order2', async () => {
        if (!isOMP) return;
        const P = S.P;
        const r = {};
        if (!S.B.O2) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `${P.path}ada@mail.test`};
            const ben = {givenName: 'Ben', familyName: 'Barrow', email: `${P.path}ben@mail.test`};
            const b = await app.api.createSubmission({tag: `${S.t}o2`, context: P.path, submitter: P.au, title: 'K2 Order Two Book', workType: 'editedVolume', contributors: [ada, ben],
                chapters: [{title: 'Tides', authors: [P.au, ada.email, ben.email]}, {title: 'Harbours', authors: [ada.email]}, {title: 'Reefs'}]});
            S.B.O2 = {id: b.submissionId}; save();
        }
        const O = S.B.O2;
        const t0 = Date.now();
        await as(P.mg, P.path);
        r.dbBefore = chRows(bookPub(O.id));
        r.authorIds = db(`select a.author_id, a.seq, s.setting_value from authors a join author_settings s on s.author_id=a.author_id and s.setting_name='givenName' where a.publication_id=${bookPub(O.id)} order by a.seq`);
        await openChapters(P.path, O.id);
        r.gridBefore = (await readGrid()).text;
        // chapters: Reefs above Tides
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        r.chDrag = await dragChapterAbove('Reefs', 'Tides');
        r.chAfterDrag = await chapterOrder();
        await snap('order2-chapters-after-drag', {o: r.chAfterDrag}, {png: true});
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(900);
        r.chAfterDone = await chapterOrder();
        r.gridAfterDone = (await readGrid()).text;
        await openChapters(P.path, O.id);
        r.chAfterReload = await chapterOrder();
        r.gridAfterChapterReload = (await readGrid()).text;
        await snap('order2-chapters-after-reload', {o: r.chAfterReload, g: r.gridAfterChapterReload}, {png: true});
        r.dbAfterChapters = chRows(bookPub(O.id));
        // authors under Tides: Ben (third) above Alma (first)
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const tidesBody = grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first();
        const authorRow = (name) => tidesBody.locator('tr.gridRow').filter({hasText: name}).first();
        r.auDrag = await dragTo(authorRow('Ben Barrow').locator('td').first(), authorRow('Alma Author'));
        r.auAfterDrag = flat(await tidesBody.innerText(), 400);
        await snap('order2-authors-after-drag', {t: r.auAfterDrag}, {png: true});
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(900);
        r.auAfterDoneSamePage = flat(await tidesBody.innerText().catch(() => ''), 400);
        await openChapters(P.path, O.id);
        r.auAfterReload = flat(await grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first().innerText().catch(() => ''), 400);
        await editChapterOpen('Tides');
        r.auWindowAfterReload = await boxList('authors[]');
        await cancelForm();
        await snap('order2-authors-after-reload', {t: r.auAfterReload, w: r.auWindowAfterReload}, {png: true});
        r.dbAfterAuthors = chRows(bookPub(O.id));
        r.seqPosts = since(seqPosts, t0);
        fact('order2', r);
    });

    // ================================================================== order3: two chapter authors, reordered with and without an earlier "Done"
    await sect('order3', async () => {
        if (!isOMP) return;
        const P = S.P;
        const r = {};
        const ada = {givenName: 'Ada', familyName: 'Lovel', email: `${P.path}ada@mail.test`};
        for (const variant of ['plain', 'afterDone']) {
            const key = `O3${variant}`;
            if (!S.B[key]) {
                const b = await app.api.createSubmission({tag: `${S.t}o3${variant.slice(0, 1)}`, context: P.path, submitter: P.au, title: `K2 Order Three ${variant}`, workType: 'editedVolume', contributors: [ada],
                    chapters: [{title: 'Tides', authors: [P.au, ada.email]}, {title: 'Harbours'}]});
                S.B[key] = {id: b.submissionId}; save();
            }
            const O = S.B[key];
            const t0 = Date.now();
            const v = {};
            await as(P.mg, P.path);
            v.dbBefore = chRows(bookPub(O.id));
            await openChapters(P.path, O.id);
            if (variant === 'afterDone') {
                await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
                await grid().getByRole('link', {name: 'Done', exact: true}).first().click(); await idle(page); await sleep(900);
                v.dbAfterEmptyDone = chRows(bookPub(O.id));
            }
            await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
            const tidesBody = grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first();
            const authorRow = (name) => tidesBody.locator('tr.gridRow').filter({hasText: name}).first();
            v.drag = await dragTo(authorRow('Ada Lovel').locator('td').first(), authorRow('Alma Author'));
            v.afterDrag = flat(await tidesBody.innerText(), 300);
            await grid().getByRole('link', {name: 'Done', exact: true}).first().click(); await idle(page); await sleep(900);
            v.afterDoneSamePage = flat(await tidesBody.innerText().catch(() => ''), 300);
            await openChapters(P.path, O.id);
            v.afterReload = flat(await grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first().innerText().catch(() => ''), 300);
            await snap(`order3-${variant}-after-reload`, v, {png: true});
            v.dbAfter = chRows(bookPub(O.id));
            v.seqPosts = since(seqPosts, t0).map((x) => x.body ? decodeURIComponent(x.body.split('&csrf')[0]) : x);
            r[variant] = v;
        }
        fact('order3', r);
    });

    // ================================================================== order4: which sortable a chapter-row drag starts; a chapter title row dropped below its own author
    await sect('order4', async () => {
        if (!isOMP || !S.B.O2) return;
        const P = S.P, O = S.B.O2;
        const r = {};
        const t0 = Date.now();
        await as(P.mg, P.path);
        await openChapters(P.path, O.id);
        r.before = (await readGrid()).text;
        r.dbBefore = chRows(bookPub(O.id));
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const row = (t) => grid().locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: t})}).first();
        r.categoryRowClass = await row('Tides').getAttribute('class');
        // press on the Reefs row, move up over Tides, read which sortable is dragging, then release
        const a = await row('Reefs').locator('td').first().boundingBox(); const b = await row('Tides').boundingBox();
        await page.mouse.move(a.x + a.width - 30, a.y + a.height / 2); await page.mouse.down();
        for (let y = a.y + a.height / 2; y >= b.y + 8; y -= 3) { await page.mouse.move(a.x + a.width - 30, y); await sleep(15); }
        r.whoDrags = await grid().evaluate((g) => [g, ...g.querySelectorAll('tbody')].map((el) => { const i = window.jQuery(el).data('ui-sortable'); return i && i.dragging ? {container: el.className.split(' ')[0] || 'grid', items: i.options.items, helper: i.helper ? i.helper[0].className.slice(0, 80) : null} : null; }).filter(Boolean));
        await snap('order4-mid-drag-reefs', {whoDrags: r.whoDrags}, {png: true});
        await page.mouse.up(); await sleep(600);
        r.afterRelease = await chapterOrder();
        await grid().getByRole('link', {name: 'Cancel ordering', exact: true}).first().click(); await sleep(800);
        // the Tides title row dragged below its first author, then "Done"
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const tidesBody = grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first();
        const authorRows = tidesBody.locator('tr.gridRow').filter({hasNot: page.locator('a.pkp_linkaction_editChapter')});
        r.drag = await dragTo(row('Tides').locator('td').first(), authorRows.nth(0), {below: true});
        r.afterDrag = flat(await tidesBody.innerText(), 400);
        await snap('order4-tides-row-below-author', {t: r.afterDrag}, {png: true});
        await grid().getByRole('link', {name: 'Done', exact: true}).first().click(); await idle(page); await sleep(900);
        r.afterDone = (await readGrid()).text;
        await openChapters(P.path, O.id);
        r.afterReload = (await readGrid()).text;
        await snap('order4-after-reload', {g: r.afterReload}, {png: true});
        r.dbAfter = chRows(bookPub(O.id));
        r.seqPosts = since(seqPosts, t0).map((x) => x.body ? decodeURIComponent(x.body.split('&csrf')[0]) : x);
        fact('order4', r);
    });

    // ================================================================== cancelorder: an author moved, then "Cancel ordering"
    await sect('cancelorder', async () => {
        if (!isOMP || !S.B.O2) return;
        const P = S.P, O = S.B.O2;
        const r = {};
        const t0 = Date.now();
        await as(P.mg, P.path);
        await openChapters(P.path, O.id);
        const tidesBody = () => grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first();
        r.before = flat(await tidesBody().innerText(), 300);
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const authorRow = (name) => tidesBody().locator('tr.gridRow').filter({hasText: name}).first();
        r.drag = await dragTo(authorRow('Ada Lovel').locator('td').first(), authorRow('Ben Barrow'));
        r.afterDrag = flat(await tidesBody().innerText(), 300);
        await grid().getByRole('link', {name: 'Cancel ordering', exact: true}).first().click(); await sleep(900);
        r.afterCancel = flat(await tidesBody().innerText(), 300);
        r.linksAfterCancel = await grid().locator('a.pkp_linkaction_editChapter:visible').count();
        await snap('cancelorder-after-cancel', r, {png: true});
        await openChapters(P.path, O.id);
        r.afterReload = flat(await tidesBody().innerText(), 300);
        r.posts = since(seqPosts, t0).length;
        fact('cancelorder', r);
    });

    // ================================================================== wizard (Rules 2, 5, 6 in the wizard; td7, td11's wizard legs)
    const current = () => page.locator('.pkpSteps__step__label--current');
    async function wizardTo(name) {
        for (let i = 0; i < 6; i++) {
            const c = flat(await current().innerText().catch(() => ''), 60);
            if (new RegExp(`${name}$`).test(c)) return c;
            if (i > 0 || !(await page.locator('button.pkpSteps__step__label').filter({hasText: new RegExp(`${name}$`)}).count())) {
                await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
            } else {
                if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
                await page.locator('button.pkpSteps__step__label').filter({hasText: new RegExp(`${name}$`)}).first().click();
            }
            await sleep(1200); await idle(page);
        }
        return flat(await current().innerText().catch(() => ''), 60);
    }
    const detailsSections = async () => page.evaluate(() => {
        const main = document.querySelector('.submissionWizard__step, main') || document.body;
        return [...main.querySelectorAll('h2, h3, legend, .pkpFormGroup__heading, .submissionWizard__reviewPanel__header')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    });
    await sect('wizard', async () => {
        if (!isOMP) return;
        const P = S.P, W1 = S.B.W1, W2 = S.B.W2;
        const r = {};
        await as(P.au, P.path);
        const wurl = (id) => cu(P.path, `/submission?id=${id}`);
        await go(wurl(W1.id)); await sleep(800);
        r.rail = await page.locator('.pkpSteps__step__label').allInnerTexts();
        r.w1Current = await wizardTo('Details');
        r.w1Sections = await detailsSections();
        const chSec = page.locator('.submissionWizard__step, main').first();
        r.w1Text = flat(await chSec.innerText().catch(() => ''), 4000);
        await snap('wizard-w1-details', {sections: r.w1Sections}, {png: true});
        await loc(page, 'Wizard Details: chapter grid', grid());
        r.w1Grid = await readGrid();
        // Add a chapter: only the submitter offered.
        await addChapterOpen();
        r.w1Offered = await boxList('authors[]');
        const fW = await readForm();
        r.w1Window = {heading: fW.windowHeading, labels: fW.labels, text: fW.text};
        await snap('wizard-w1-add-window', {fW}, {png: true});
        await chapterForm().locator('input[name="title[en]"]').fill('Wizard One');
        await chapterForm().locator('input[name="subtitle[en]"]').fill('Sub One');
        await tickBoxes('authors[]', ['Alma']);
        r.w1Save = await saveForm();
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Wizard Two');
        r.w1Save2 = await saveForm();
        r.w1GridAfter = (await readGrid()).text;
        // Rule 5: leave without "Save for Later", come back.
        await go(cu(P.path, '/dashboard/mySubmissions')); await sleep(500);
        await go(wurl(W1.id)); await sleep(800);
        r.w1CurrentBack = await wizardTo('Details');
        r.w1GridBack = (await readGrid()).text;
        await snap('wizard-w1-back-after-leaving', {g: r.w1GridBack});
        // td11 wizard leg: reorder with Order › Done, then Review, then reload.
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const handle = (title) => grid().locator('tr.gridRow').filter({hasText: title}).first().locator('a.pkp_linkaction_moveItem').first();
        r.wDrag = await dragChapterAbove('Wizard Two', 'Wizard One');
        const ss = page.waitForResponse((x) => /save-sequence/i.test(x.url()), {timeout: 15000}).catch(() => null);
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        const ssr = await ss; r.wDone = ssr ? ssr.status() : null;
        await idle(page); await sleep(800);
        r.wOrderAfterDone = await chapterOrder();
        r.wReview = await wizardTo('Review');
        const reviewChapters = async () => {
            const panel = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h2, h3, .submissionWizard__reviewPanel__header').filter({hasText: /^\s*Chapters\s*$/})}).first();
            return (await panel.count()) ? flat(await panel.innerText(), 600) : null;
        };
        r.wReviewPanel = await reviewChapters();
        await snap('wizard-w1-review-after-order', {panel: r.wReviewPanel}, {png: true});
        await page.reload(); await idle(page); await sleep(1200);
        r.wReviewAfterReload = await reviewChapters();
        if (!r.wReviewAfterReload) { await wizardTo('Review'); r.wReviewAfterReload = await reviewChapters(); }
        await snap('wizard-w1-review-after-reload', {panel: r.wReviewAfterReload});
        // Rule 6 in the wizard: a contributor added on the Contributors step appears the next time the window opens.
        await wizardTo('Contributors');
        const {ContributorsScreen} = require(path.resolve(__dirname, '../../../../../apps/omp/playwright/pages/ContributorPages.js'));
        const cs = new ContributorsScreen(page);
        await cs.addContributor({given: 'Zed', family: 'Zephyr', email: `${S.t}zed@mail.test`}).catch((e) => { r.zedErr = flat(e.message, 300); });
        await wizardTo('Details');
        await editChapterOpen('Wizard One');
        r.w1OfferedAfterZed = await boxList('authors[]');
        await snap('wizard-w1-window-after-zed', {boxes: r.w1OfferedAfterZed}, {png: true});
        await cancelForm();
        // W2: a Monograph's Details step.
        await go(wurl(W2.id)); await sleep(800);
        r.w2Current = await wizardTo('Details');
        r.w2Sections = await detailsSections();
        r.w2Grid = await readGrid();
        await snap('wizard-w2-details', {sections: r.w2Sections, g: r.w2Grid.text}, {png: true});
        r.db = chRows(bookPub(W1.id));
        fact('wizard', r);
    });

    // ================================================================== versions (Rule 2 in the workflow)
    await sect('versions', async () => {
        if (!isOMP) return;
        const P = S.P, V = S.B.V;
        const r = {};
        await as(P.mg, P.path);
        const pub1 = bookPub(V.id);
        if (!S.vPub2) {
            await go(wfUrl(P.path, V.id, `publication_${pub1}_titleAbstract`)); await sleep(1200);
            const item = wf().getByRole('link', {name: 'Create New Version', exact: true}).first();
            await item.click();
            const dlg = page.getByRole('dialog', {name: 'Create New Version'});
            await dlg.waitFor({timeout: T}).catch(() => {});
            r.createDialog = flat(await dlg.innerText().catch(() => ''), 600);
            await snap('versions-create-dialog', {t: r.createDialog}, {png: true});
            const created = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
            const cr = await created;
            S.vPub2 = cr ? (await cr.json()).id : null; save();
            await idle(page); await sleep(1000);
        }
        r.pub1 = pub1; r.pub2 = S.vPub2;
        await go(wfUrl(P.path, V.id, `publication_${S.vPub2}_chapters`)); await sleep(1200);
        await grid().waitFor({timeout: T}).catch(() => {});
        r.menu = await menuLinks();
        r.v2Before = (await readGrid()).text;
        if (!S.vAdded) {
            await addChapterOpen();
            await chapterForm().locator('input[name="title[en]"]').fill('Second Edition Only');
            r.v2Add = await saveForm();
            S.vAdded = true; save();
        }
        r.v2After = (await readGrid()).text;
        await snap('versions-v2-chapters', {r}, {png: true});
        // choose the first version under "Publication" in the menu
        const groups = wf().getByRole('link', {name: /version|Version of Record/i});
        r.versionLinks = (await groups.allInnerTexts()).map((x) => flat(x, 80));
        const first = groups.filter({hasText: /1\.0|Version of Record/}).first();
        if (await first.count()) { await first.click(); await sleep(800); }
        const chLinks = wf().getByRole('link', {name: 'Chapters', exact: true});
        r.chaptersLinks = await chLinks.count();
        let clicked = false;
        for (let i = 0; i < r.chaptersLinks; i++) {
            if (await chLinks.nth(i).isVisible()) {
                const href = await chLinks.nth(i).getAttribute('href').catch(() => null);
                await chLinks.nth(i).click(); await idle(page); await sleep(1000);
                if (page.url().includes(`publication_${pub1}_chapters`)) { clicked = true; break; }
                r.clickedHref = href;
            }
        }
        if (!clicked) { await go(wfUrl(P.path, V.id, `publication_${pub1}_chapters`)); await sleep(1200); r.v1ByUrl = true; }
        await grid().waitFor({timeout: T}).catch(() => {});
        r.v1Url = strip(page.url());
        r.v1 = (await readGrid()).text;
        r.v1Warning = flat(await wf().locator('.pkpNotification, [class*="notification"], [role="alert"]').allInnerTexts().catch(() => []), 300);
        await snap('versions-v1-chapters', {r}, {png: true});
        r.db1 = chRows(pub1); r.db2 = S.vPub2 ? chRows(S.vPub2) : null;
        fact('versions', r);
    });

    // ================================================================== doi (td14, Rule 10); chapter page credits; TOC order
    await sect('doi', async () => {
        if (!isOMP || !S.Q) return;
        const Q = S.Q, b = Q.book;
        const r = {};
        await as(Q.mg, Q.path);
        await openChapters(Q.path, b.id);
        r.grid = (await readGrid()).text;
        r.warning = flat(await wf().innerText().catch(() => ''), 4000).match(/Warning[^.]*\./g);
        await editChapterOpen('Tides');
        const fT = await readForm();
        r.tides = {tabs: fT.tabs, page: fT.inputs.filter((i) => i.name === 'isPageEnabled'), text: fT.text};
        await snap('doi-tides-window', {fT}, {png: true});
        await chapterForm().locator('input[name="isPageEnabled"]').uncheck();
        r.untickedBeforeSave = await chapterForm().locator('input[name="isPageEnabled"]').isChecked();
        await tickBoxes('authors[]', [''], {only: false});
        r.save = await saveForm();
        await editChapterOpen('Tides');
        const fT2 = await readForm();
        r.tidesAfter = {page: fT2.inputs.filter((i) => i.name === 'isPageEnabled'), note: /always be shown/.test(fT2.text)};
        await snap('doi-tides-after-untick', {fT2}, {png: true});
        await cancelForm();
        await editChapterOpen('Harbours');
        const fH = await readForm();
        r.harbours = {page: fH.inputs.filter((i) => i.name === 'isPageEnabled'), note: /always be shown/.test(fH.text), text: fH.text};
        await snap('doi-harbours-window', {fH});
        await cancelForm();
        r.dois = db(`select c.chapter_id, c.seq, c.doi_id, d.doi, (select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and setting_name='isPageEnabled') from submission_chapters c left join dois d on d.doi_id=c.doi_id where c.publication_id=${bookPub(b.id)} order by c.seq`);
        // the reader's chapter page credits the chapter authors (Tides now has the submitter ticked)
        const chapters = db(`select chapter_id from submission_chapters where publication_id=${bookPub(b.id)} order by seq`).map((x) => x.trim());
        const {page: v, close: vclose} = await launch(app);
        try {
            await v.goto(cu(Q.path, `/catalog/book/${b.id}`)); await idle(v);
            r.bookToc = flat(await v.locator('.chapters, .item.chapters, ul.chapters').first().innerText().catch(() => ''), 800);
            const s1 = await screen(v); record('k2-doi-book-page', s1);
            if (chapters[0]) {
                const resp = await v.goto(cu(Q.path, `/catalog/book/${b.id}/chapter/${chapters[0]}`)); await idle(v);
                r.chapterPage = {status: resp && resp.status(), text: flat(await v.locator('body').innerText(), 1200)};
                const s2 = await screen(v); record('k2-doi-chapter-page', s2);
            }
        } finally { await vclose(); }
        // TOC order after "Order" on the published book: Harbours above Tides
        await openChapters(Q.path, b.id);
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const handle = (title) => grid().locator('tr.gridRow').filter({hasText: title}).first().locator('a.pkp_linkaction_moveItem').first();
        r.tocDrag = await dragChapterAbove('Harbours', 'Tides');
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(900);
        r.orderAfter = await chapterOrder();
        const {page: v2, close: v2close} = await launch(app);
        try {
            await v2.goto(cu(Q.path, `/catalog/book/${b.id}`)); await idle(v2);
            r.bookTocAfter = flat(await v2.locator('.chapters, .item.chapters, ul.chapters').first().innerText().catch(() => ''), 800);
            record('k2-doi-book-page-after-order', await screen(v2));
        } finally { await v2close(); }
        fact('doi', r);
    });

    // ================================================================== ids: the "Identifiers" tab with Publisher ID for chapters
    await sect('ids', async () => {
        if (!isOMP) return;
        const r = {};
        if (S.R) {
            await as(S.R.mg, S.R.path);
            await openChapters(S.R.path, S.R.book.id);
            await editChapterOpen('Tides');
            const f = await readForm();
            r.pubIdPress = {tabs: f.tabs};
            await snap('ids-r-tides-window', {tabs: f.tabs}, {png: true});
            await cancelForm();
        }
        fact('ids', r);
    });

    // ================================================================== lang2: a French book on a press whose forms are English only
    await sect('lang2', async () => {
        if (!isOMP || !S.L2) return;
        const X = S.L2;
        const r = {};
        if (!X.books.fr_CA) {
            const b = await app.api.createSubmission({tag: `${X.path}fr2`, context: X.path, submitter: X.au, locale: 'fr_CA', title: {fr_CA: 'Livre K2 français'}});
            X.books.fr_CA = {id: b.submissionId}; save();
        }
        await as(X.mg, X.path);
        await openChapters(X.path, X.books.fr_CA.id);
        r.grid = (await readGrid()).text;
        await addChapterOpen();
        const f = await readForm();
        r.titleBoxes = f.inputs.filter((i) => /^title\[/.test(i.name)).map((i) => i.name);
        await chapterForm().locator('input[name^="title["]').first().fill('English Only Title');
        r.save = await saveForm();
        r.errs = (await page.locator('form#editChapterForm label.error:visible, form#editChapterForm .error:visible, #chapterFormNotification:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        await snap('lang2-fr-book-english-title-save', r, {png: true});
        if (await chapterForm().count()) await cancelForm().catch(() => {});
        r.gridAfter = (await readGrid()).text;
        await openChapters(X.path, X.books.fr_CA.id);
        r.gridAfterReload = (await readGrid()).text;
        r.db = chRows(bookPub(X.books.fr_CA.id));
        fact('lang2', r);
    });

    // ================================================================== license: publish an Edited Volume on screen (Side effects 4)
    await sect('license', async () => {
        if (!isOMP) return;
        const P = S.P, L = S.B.L;
        const r = {};
        await as(P.mg, P.path);
        await openChapters(P.path, L.id);
        for (const t of ['Own', 'Empty']) {
            await editChapterOpen(t);
            const f = await readForm();
            r[`before${t}`] = {license: f.inputs.filter((i) => i.name === 'licenseUrl'), sentence: flat(await chapterForm().locator('.pkpFormField__description').allInnerTexts().catch(() => []), 300)};
            await cancelForm();
        }
        // The version's own "License URL" on "Permissions & Disclosure" (the press has none), then the sentence again.
        if (!S.lLicense) {
            await openChapters(P.path, L.id, {key: 'Permissions & Disclosure'}); await sleep(800);
            const box = wf().locator('input[name="licenseUrl"]').first();
            await box.waitFor({timeout: T}).catch(() => {});
            r.permFields = (await wf().locator('form label, form legend').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
            await box.fill('https://creativecommons.org/licenses/by-nc/4.0/');
            const sv = page.waitForResponse((x) => /publications\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
            const svr = await sv; r.permSave = svr ? svr.status() : null;
            await idle(page); await sleep(800);
            await snap('license-permissions-saved', {permFields: r.permFields, permSave: r.permSave}, {png: true});
            S.lLicense = true; save();
        }
        await openChapters(P.path, L.id);
        for (const t of ['Own', 'Empty']) {
            await editChapterOpen(t);
            const f = await readForm();
            r[`withVersionLicense${t}`] = {license: f.inputs.filter((i) => i.name === 'licenseUrl'), sentence: flat(await chapterForm().locator('.pkpFormField__description').allInnerTexts().catch(() => []), 300), links: await chapterForm().locator('.pkpFormField__description a').evaluateAll((els) => els.map((a) => a.href)).catch(() => [])};
            await snap(`license-with-version-license-${t.toLowerCase()}`, r[`withVersionLicense${t}`], {png: t === 'Empty'});
            await cancelForm();
        }
        if (!S.lPublished) {
            await go(wfUrl(P.path, L.id, `publication_${bookPub(L.id)}_titleAbstract`)); await sleep(1500);
            const controls = () => page.locator('[data-cy="workflow-controls-right"]');
            const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            await button.waitFor({state: 'visible', timeout: T});
            await button.click();
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|publish/i}).last();
            await sleep(1500); await idle(page);
            await snap('license-publish-step', null, {png: true});
            if (await panel.isVisible().catch(() => false)) {
                r.panel = flat(await panel.innerText(), 800);
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
                await sleep(1000);
            }
            r.confirm = flat(await confirm.innerText().catch(() => ''), 600);
            const w = page.waitForResponse((x) => /\/publications\/\d+\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click().catch((e) => { r.pubErr = flat(e.message, 200); });
            const pr = await w; r.publishStatus = pr ? pr.status() : null;
            await idle(page); await sleep(1000);
            await snap('license-after-publish', {r}, {png: true});
            S.lPublished = r.publishStatus === 200; save();
        }
        await openChapters(P.path, L.id);
        for (const t of ['Own', 'Empty']) {
            await editChapterOpen(t);
            const f = await readForm();
            r[`after${t}`] = {license: f.inputs.filter((i) => i.name === 'licenseUrl'), sentence: flat(await chapterForm().locator('.pkpFormField__description').allInnerTexts().catch(() => []), 300)};
            await snap(`license-after-${t.toLowerCase()}`, r[`after${t}`]);
            await cancelForm();
        }
        r.db = chRows(bookPub(L.id));
        r.pubLicense = db(`select setting_name, setting_value from publication_settings where publication_id=${bookPub(L.id)} and setting_name in ('licenseUrl','chapterLicenseUrl')`);
        fact('license', r);
    });

    // ================================================================== side effects (td17)
    async function activityLog() {
        await wf().getByRole('button', {name: 'Activity Log', exact: true}).first().click();
        const d = page.getByRole('dialog').filter({hasText: 'Activity Log'}).last();
        await d.getByText('Event', {exact: true}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        const rows = [];
        for (const row of await d.getByRole('row').all()) rows.push(flat(await row.innerText(), 300));
        await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(800);
        return rows;
    }
    async function tasksPanel() {
        const tb = page.getByRole('button', {name: /^Tasks/}).first();
        const label = flat(await tb.innerText().catch(() => ''), 40);
        await tb.click().catch(() => {}); await sleep(1200); await idle(page);
        const panel = page.locator(vis).last();
        const text = flat(await panel.innerText().catch(() => ''), 2500);
        await panel.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(600);
        return {label, text};
    }
    const mailCount = async (to) => app.mail.count({to}).catch((e) => `ERR ${flat(e.message, 100)}`);
    await sect('side', async () => {
        if (!isOMP) return;
        const P = S.P, B = S.B.S;
        const r = {};
        const people = {mg: `${P.mg}@mail.test`, au: `${P.au}@mail.test`, ada: `${P.path}ada@mail.test`};
        r.mailBefore = {}; for (const [k, e] of Object.entries(people)) r.mailBefore[k] = await mailCount(e);
        await as(P.au, P.path);
        await go(cu(P.path, '/dashboard/mySubmissions')); await sleep(600);
        r.auTasksBefore = await tasksPanel();
        await as(P.mg, P.path);
        await go(cu(P.path, '/dashboard/editorial')); await sleep(600);
        r.mgTasksBefore = await tasksPanel();
        await openChapters(P.path, B.id);
        r.logBefore = await activityLog();
        await snap('side-log-before', {rows: r.logBefore});
        // add two, edit one, reorder, delete one
        await openChapters(P.path, B.id);
        await addChapterOpen(); await chapterForm().locator('input[name="title[en]"]').fill('Side One'); r.add1 = await saveForm();
        await addChapterOpen(); await chapterForm().locator('input[name="title[en]"]').fill('Side Two'); r.add2 = await saveForm();
        await editChapterOpen('Side One'); await chapterForm().locator('input[name="pages"]').fill('1-2'); r.edit = await saveForm();
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
        const handle = (title) => grid().locator('tr.gridRow').filter({hasText: title}).first().locator('a.pkp_linkaction_moveItem').first();
        r.drag = await dragChapterAbove('Side Two', 'Side One');
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(800);
        r.order = await chapterOrder();
        await rowControls('Side One');
        await grid().locator('a.pkp_linkaction_deleteChapter:visible').first().click(); await sleep(700);
        const cd = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: 'Are you sure'}).last();
        await cd.getByRole('button', {name: 'OK', exact: true}).click(); await idle(page); await sleep(900);
        r.afterDelete = await chapterOrder();
        // work type: Monograph -> Edited Volume
        const wt = wf().getByRole('button', {name: /^(Monograph|Edited Volume)$/}).first();
        r.wtBefore = flat(await wt.innerText().catch(() => ''), 40);
        await wt.click(); await sleep(600);
        const item = page.getByRole('menuitem', {name: 'Edited Volume', exact: true}).or(page.getByRole('option', {name: 'Edited Volume', exact: true})).first();
        const wtr = page.waitForResponse((x) => /submissions\/\d+$/.test(x.url().split('?')[0]) && x.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await item.click().catch((e) => { r.wtErr = flat(e.message, 200); });
        const wtResp = await wtr; r.wtStatus = wtResp ? wtResp.status() : null;
        await idle(page); await sleep(900);
        r.wtAfter = flat(await wf().getByRole('button', {name: /^(Monograph|Edited Volume)$/}).first().innerText().catch(() => ''), 40);
        // Publication Dates
        await openChapters(P.path, B.id, {key: 'Publication Dates'});
        await page.getByRole('radio', {name: 'Each chapter may have its own publication date.'}).check();
        const pd = page.waitForResponse((x) => /submissions\/\d+$/.test(x.url().split('?')[0]) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await page.getByRole('button', {name: 'Save', exact: true}).click();
        const pdr = await pd; r.pdStatus = pdr ? pdr.status() : null;
        await idle(page); await sleep(800);
        await openChapters(P.path, B.id);
        r.logAfter = await activityLog();
        await snap('side-log-after', {rows: r.logAfter}, {png: true});
        await go(cu(P.path, '/dashboard/editorial')); await sleep(600);
        r.mgTasksAfter = await tasksPanel();
        await as(P.au, P.path);
        await go(cu(P.path, '/dashboard/mySubmissions')); await sleep(600);
        r.auTasksAfter = await tasksPanel();
        await snap('side-au-tasks-after', {t: r.auTasksAfter});
        await sleep(3000);
        r.mailAfter = {}; for (const [k, e] of Object.entries(people)) r.mailAfter[k] = await mailCount(e);
        r.dbLog = db(`select event_type, message from event_log where assoc_type=1048585 and assoc_id=${B.id} order by log_id`);
        r.dbNotif = db(`select user_id, type, date_created from notifications where assoc_type=1048585 and assoc_id=${B.id} order by notification_id`);
        fact('side', r);
    });

    // ================================================================== extra: the wizard's notice after a chapter "Save"; unticking a file; a contributor deleted on one version
    await sect('extra', async () => {
        if (!isOMP) return;
        const P = S.P;
        const r = {};
        // (a) the wizard: what shows right after a chapter "Save"
        await as(P.au, P.path);
        await go(cu(P.path, `/submission?id=${S.B.W2.id}`)); await sleep(800);
        await wizardTo('Details');
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill(`Wizard Notice ${Date.now() % 1000}`);
        const saved = page.waitForResponse((x) => /update-chapter/i.test(x.url()), {timeout: T}).catch(() => null);
        await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
        const sr = await saved; r.wizSave = sr ? sr.status() : null;
        await sleep(400);
        r.wizNoticeNow = (await page.locator('.pkp_notification, .pnotify, .ui-pnotify, [role="status"], [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 150)).filter(Boolean);
        r.wizBodyHasSaved = await page.getByText('Your changes have been saved.').count();
        await snap('extra-wizard-after-chapter-save', {r}, {png: true});
        await sleep(1500);
        r.wizGrid = (await readGrid()).text;
        // (b) Book D: tick the file in Two, add Three (not offered), untick in Two, open Three (offered)
        await as(P.mg, P.path);
        const D = S.B.D;
        await openChapters(P.path, D.id);
        await editChapterOpen('Two');
        await tickBoxes('files[]', ['article.pdf']);
        r.twoTick = await saveForm();
        if (!(await grid().getByRole('link', {name: 'Three', exact: true}).count())) {
            await addChapterOpen();
            r.threeOfferedWhileTwoHolds = await boxList('files[]');
            await chapterForm().locator('input[name="title[en]"]').fill('Three');
            await saveForm();
        }
        await editChapterOpen('Two');
        await tickBoxes('files[]', [], {only: true});
        r.twoUntick = await saveForm();
        await editChapterOpen('Three');
        r.threeAfterUntick = await boxList('files[]');
        await snap('extra-three-after-untick', {r}, {png: true});
        await cancelForm();
        // (c) Book C: Ada on both chapters, then Ada deleted from the Contributors list
        const C = S.B.C;
        await openChapters(P.path, C.id);
        await editChapterOpen('Harbours');
        await tickBoxes('authors[]', ['Ada']);
        r.cHarboursAda = await saveForm();
        r.cBefore = (await readGrid()).text;
        const cs = await contributorsPage(P.path, C.id);
        await cs.deleteContributor('Ada Lovel').catch((e) => { r.cDelErr = flat(e.message, 200); });
        await openChapters(P.path, C.id);
        r.cAfter = (await readGrid()).text;
        await snap('extra-c-after-ada-deleted', {g: r.cAfter}, {png: true});
        // (d) Book V: the submitter ticked on "First Edition Chapter" in both versions, then deleted from version 2's list
        const V = S.B.V, pub1 = bookPub(V.id) === String(S.vPub2) ? null : null; void pub1;
        const pubs = db(`select publication_id from publications where submission_id=${V.id} order by publication_id`).map((x) => x.trim());
        r.vPubs = pubs;
        for (const pub of pubs) {
            await go(wfUrl(P.path, V.id, `publication_${pub}_chapters`)); await sleep(1200);
            await grid().waitFor({timeout: T}).catch(() => {});
            await editChapterOpen('First Edition Chapter');
            r[`vOffered${pub}`] = await boxList('authors[]');
            await tickBoxes('authors[]', ['Alma']);
            r[`vSave${pub}`] = await saveForm();
            r[`vGrid${pub}`] = (await readGrid()).text;
        }
        const last = pubs[pubs.length - 1];
        await go(wfUrl(P.path, V.id, `publication_${last}_contributors`)); await sleep(1500);
        const {ContributorsScreen} = require(path.resolve(__dirname, '../../../../../apps/omp/playwright/pages/ContributorPages.js'));
        const cv = new ContributorsScreen(page);
        await page.locator('.contributorsListPanel').waitFor({timeout: T}).catch(() => {});
        r.vContribUrl = strip(page.url());
        r.vContribRows = (await cv.rows().allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
        await cv.deleteContributor('Alma Author').catch((e) => { r.vDelErr = flat(e.message, 300); });
        for (const pub of pubs) {
            await go(wfUrl(P.path, V.id, `publication_${pub}_chapters`)); await sleep(1200);
            await grid().waitFor({timeout: T}).catch(() => {});
            r[`vGridAfter${pub}`] = (await readGrid()).text;
        }
        await snap('extra-v-after-delete-on-last-version', {r}, {png: true});
        fact('extra', r);
    });

    // ================================================================== control: OJS and OPS have no Chapters page and no wizard "Chapters" section
    await sect('control', async () => {
        if (isOMP) return;
        const X = S.X;
        const r = {};
        await as(X.mg, X.path);
        await go(wfUrl(X.path, X.sub, null)); await sleep(1500);
        await wf().waitFor({timeout: T}).catch(() => {});
        r.menu = await menuLinks();
        r.chaptersLinks = await wf().getByRole('link', {name: 'Chapters', exact: true}).count();
        r.workTypeButton = await wf().getByRole('button', {name: /^(Monograph|Edited Volume)$/}).count();
        await snap('control-workflow-menu', {r}, {png: true});
        await as(X.au, X.path);
        await go(cu(X.path, `/submission?id=${X.draft}`)); await sleep(800);
        r.wizardCurrent = await wizardTo('Details');
        r.wizardSections = await detailsSections();
        r.wizardChapters = await page.getByText('Chapters', {exact: true}).count();
        r.wizardGrid = await grid().count();
        await snap('control-wizard-details', {r}, {png: true});
        fact('control', r);
    });

    await close();
});
